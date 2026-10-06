# Portfolio agent

A portfolio page with a chat box. Visitors ask questions and an AI agent answers from your CV. A Cloudflare Worker sits in between, so your API key never reaches the browser.

Live example: https://alvee1994.github.io/portfolio/

```
Visitor -> GitHub Pages (this page) -> Cloudflare Worker -> model (Claude API, OpenRouter, or a Claude Managed Agent)
```

Before the session, do the setup in [PREP.md](PREP.md).

**Using Claude Code or Codex?** Open this folder and say: "Read AGENTS.md and help me build my portfolio." The agent walks you through the steps below.

## What is in here

```
index.html                     your page (content + chat widget)
app.js                         chat logic, no edits needed
config.js                      Worker addresses and Turnstile sitekey (public)
workers/claude-messages/       Worker for the Claude Messages API. Start here.
workers/openrouter/            Worker for a non-Claude model through OpenRouter
workers/console-deployment/    Worker for a Claude Managed Agent deployment
workers/profile.example.txt    template for the agent's rules and knowledge
workers/test-chat.mjs          checks claude-messages or openrouter against the real API
```

You need **one** Worker. The example page runs all three so you can compare them with the switch in the chat header.

| Worker | First reply | Knowledge lives | Key | Cost per chat |
|---|---|---|---|---|
| claude-messages | about 2 s | `workers/profile.txt`, cached 1 hour | Anthropic | cents |
| openrouter | about 2 s | `workers/profile.txt` | OpenRouter | under a cent |
| console-deployment | 10 s or more (starts a session) | files on your Managed Agent | Anthropic | highest |

## Steps (Claude API Worker)

### 1. Copy and clone

On github.com/alvee1994/portfolio-template click **Use this template > Create a new repository**. Name it `portfolio` (that name becomes your address), set it Public. Then:

```
git clone git@github.com:<github-username>/portfolio.git
cd portfolio
```

### 2. Write your agent's knowledge

```
cp workers/profile.example.txt workers/profile.txt
```

Open `workers/profile.txt`. Keep the rules at the top, put your name in, and paste your CV as plain text below them. Add longer notes or project stories at the end if you like. More detail means better answers.

`profile.txt` is gitignored, so it never reaches GitHub. Still leave out your phone number and address: the agent can quote anything in it to visitors.

### 3. Deploy the Worker

Edit `workers/claude-messages/wrangler.toml`. Change the line marked `CHANGE`:

- `ALLOWED_ORIGIN = "https://<github-username>.github.io"` (no path, no trailing slash)

Then:

```
cd workers/claude-messages
npx wrangler login
npx wrangler deploy
openssl rand -hex 32 | npx wrangler secret put SIGNING_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
```

`deploy` prints your Worker address, `https://worker-claude-messages.<you>.workers.dev`. Keep it.

Windows without `openssl`: run `npx wrangler secret put SIGNING_SECRET` and type any long random string.

### 4. Turnstile (bot check)

dash.cloudflare.com > Turnstile > Add widget. Hostname: `<github-username>.github.io`. Mode: Managed.

```
npx wrangler secret put TURNSTILE_SECRET
```

Paste the **secret key**. Keep the **sitekey** for the next step.

### 5. Your page

- `config.js`: keep only the `messages` entry in `window.BACKENDS`, set its `url` to your Worker address, and set `TURNSTILE_SITEKEY` to your sitekey.
- `index.html`: change `<title>`, the description, and everything between the `CHANGE` comment and the chat widget. Keep the ids `ask`, `launch` and `panel`.

Never put your CV file in the repo. The repo is public.

### 6. Publish

```
cd ../..
git add .
git commit -m "My portfolio"
git push
```

Repo Settings > Pages > Source: **GitHub Actions**. Then Actions tab > enable workflows if asked > **Deploy page** > Run workflow. After that, every push to `main` publishes. Wait 1 to 2 minutes, then open `https://<github-username>.github.io/portfolio/` and click "Ask my agent".

## Other Workers

**OpenRouter.** Same steps in `workers/openrouter/`, with `npx wrangler secret put OPENROUTER_API_KEY` (key from openrouter.ai/keys). Add the `openrouter` entry to `config.js`.

**Managed Agent.** Build an agent on platform.claude.com, add your CV as a file, create an environment and a deployment, and copy the deployment id (`depl_...`). Put it in `workers/console-deployment/wrangler.toml` as `DEPLOYMENT_ID`, then deploy as in step 3. Add the `console` entry to `config.js`. This one ignores `profile.txt`: its instructions live on the agent.

**Change the model** without redeploying: dash.cloudflare.com > Workers & Pages > your Worker > Settings > Variables and Secrets > edit `MODEL` > Deploy. Update `wrangler.toml` too, or the next `wrangler deploy` puts the old value back.

**Order and default.** The first entry in `window.BACKENDS` is what the chat uses on open. With one entry the switch is hidden.

## What protects you

- The API key lives only in the Worker. `config.js` is public, so never put a secret in it.
- Only your page's origin can call the Worker from a browser. Other clients can fake the origin, so this is a speed bump, not a lock.
- Turnstile stops bots. The Worker refuses Cloudflare's test secret unless the page runs on localhost.
- After the bot check the Worker hands out a signed ticket that expires after 2 hours. Without it, no model call happens.
- Rate limits per visitor IP, set in each `wrangler.toml`: 5 new chats a minute, 20 messages a minute (Managed Agent: 120, because the page polls).
- The chat Workers accept only plain text, at most 1,000 characters a message and the last 20 messages. Nobody can stretch your bill with one huge request.
- The page inserts text with `textContent`, so nothing the agent or a visitor writes can run as HTML. A Content-Security-Policy in `index.html` allows only your own scripts and Turnstile.
- A chat (and its cost) starts only when a visitor opens it.
- Rate limits stop one visitor, not a crowd. The spend limit on your API key is what caps cost. Set one.

## When something breaks

| You see | Cause | Fix |
|---|---|---|
| `error: Not allowed` | `ALLOWED_ORIGIN` does not match the page | Exactly `https://<you>.github.io`, then `npx wrangler deploy` |
| `error: Bot check failed` | Turnstile secret and sitekey from different widgets, or hostname missing | Check the widget's hostname and both keys |
| `error: Server misconfigured` | Turnstile test secret on a public page | Put your real Turnstile secret |
| `error: Agent unavailable` | Wrong or missing API key, wrong `MODEL` or `DEPLOYMENT_ID`, or no credit | Check the secret and vars, then the Console or OpenRouter balance |
| `error: Too many requests` | Rate limit | Wait a minute |
| `error: Failed to fetch` | Wrong `url` in `config.js`, or Worker not deployed | Check `config.js` and the address from `deploy` |
| `deploy` fails on `profile.txt` | You skipped step 2 | `cp workers/profile.example.txt workers/profile.txt` |
| Old page after a push | Pages build or browser cache | Wait 2 minutes, hard refresh |

Browser DevTools > Console and Network show the details. `npx wrangler tail` (in the Worker folder) shows the Worker's logs live.

## Check a Worker

From `workers/`:

```
ANTHROPIC_API_KEY=sk-ant-... node test-chat.mjs claude-messages
OPENROUTER_API_KEY=sk-or-... node test-chat.mjs openrouter
```

From `workers/console-deployment/`:

```
ANTHROPIC_API_KEY=sk-ant-... DEPLOYMENT_ID=depl_... node test.mjs
```

Each runs the Worker against the real API and spends a few cents. The Claude test also checks that the second call reads the cached profile.

## Good to know

- Changing `wrangler.toml` needs `npx wrangler deploy` again. Secrets do not, and a deploy keeps them.
- `git push` updates the page only. It never touches a Worker or its secrets.
- If you put a Worker on your own domain, add it to `connect-src` in the CSP line of `index.html`.
