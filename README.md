# Portfolio agent

A portfolio page with a chat box. Visitors ask questions and an AI agent answers from your CV. A Cloudflare Worker sits in between, so your OpenRouter key never reaches the browser.

Live example: https://alvee1994.github.io/portfolio/

```
Visitor -> GitHub Pages (this page) -> Cloudflare Worker -> OpenRouter -> model (zero data retention providers only)
```

**New here? Follow [GUIDE.md](GUIDE.md)** (printable: [GUIDE.pdf](GUIDE.pdf)). It covers accounts, OpenRouter credit, privacy settings, the API key, choosing a model, and lets your AI assistant do the build. This README is the technical reference.

**Using Claude Code, Codex or Antigravity?** Open this folder and say: "Read AGENTS.md and help me build my portfolio."

## What is in here

```
index.html                     your page (content + chat widget)
app.js                         chat logic, no edits needed
config.js                      Worker address, Turnstile sitekey, greeting (public)
workers/openrouter/            the Worker: worker.js and wrangler.toml
workers/profile.example.txt    template for the agent's rules and knowledge
workers/test-chat.mjs          checks the Worker against the real OpenRouter API
```

**Every id in this repo is a placeholder.** You create your own: Worker address (`<your-subdomain>`), Turnstile sitekey and secret, page origin (`<github-username>`). Ids from the example site belong to another account and do not work for you.

## Manual steps

Your assistant does these for you (see AGENTS.md). By hand:

1. **Copy.** `gh repo create portfolio --template alvee1994/portfolio-template --public --clone`, then `cd portfolio`.
2. **Knowledge.** `cp workers/profile.example.txt workers/profile.txt`, keep the rules, add your name, CV and notes. It is gitignored.
3. **Turnstile.** dash.cloudflare.com > Turnstile > Add widget. Hostname `<github-username>.github.io`, mode Managed. Keep the sitekey and the secret.
4. **Secrets.** In `workers/openrouter/`, create `.dev.vars` (gitignored):
   ```
   OPENROUTER_API_KEY=sk-or-...
   TURNSTILE_SECRET=...
   SIGNING_SECRET=<any long random string, for example from: openssl rand -hex 32>
   ```
5. **Worker.** In `workers/openrouter/wrangler.toml` set `ALLOWED_ORIGIN = "https://<github-username>.github.io"` and `MODEL`. Then:
   ```
   cd workers/openrouter
   npx wrangler login
   npx wrangler deploy --secrets-file .dev.vars
   ```
   A new Cloudflare account asks you to pick a workers.dev subdomain on the first deploy. Keep the printed Worker address.
6. **Page.** In `config.js` set `WORKER_URL`, `TURNSTILE_SITEKEY` and `GREETING`. In `index.html` change everything between the `CHANGE` comment and the chat widget. Keep the ids `ask`, `launch` and `panel`.
7. **Publish.** Commit and push to `main`. Repo Settings > Pages > Source: **GitHub Actions**, then Actions > **Deploy page** > Run workflow. After that, every push to `main` publishes.

## Privacy

- `worker.js` sends `provider: { zdr: true, data_collection: "deny" }` with every request. OpenRouter then routes only to zero data retention providers that do not train on prompts. A model without such a provider fails instead of falling back.
- Also turn on all Zero Data Retention switches, and leave both Data Training switches off, at [Guardrails > Workspace Guardrail > Model & Provider Access](https://openrouter.ai/workspaces/default/guardrails/default/models), then Save. Leave prompt logging off. Account and request settings combine: if either asks for ZDR, ZDR applies.
- OpenRouter keeps request metadata (time, model, token counts), not the text, unless you opt in to prompt logging.
- The Worker logs no visitor text and no IP address.
- `workers/profile.txt` goes to the provider with every question. Keep private details out of it.
- Models with ZDR providers: the **Zero data retention: Supported** filter on [openrouter.ai/models](https://openrouter.ai/models), or `https://openrouter.ai/api/v1/endpoints/zdr`.

## What protects you

- The API key lives only in the Worker (and in your local `.dev.vars`). `config.js` is public, so never put a secret in it.
- Only your page's origin can call the Worker from a browser. Other clients can fake the origin, so this is a speed bump, not a lock.
- Turnstile stops bots. The Worker refuses Cloudflare's test secret unless the page runs on localhost.
- After the bot check the Worker hands out a signed ticket that expires after 2 hours. Without it, no model call happens.
- Rate limits per visitor IP, set in `wrangler.toml`: 5 new chats a minute, 20 messages a minute.
- The Worker accepts only plain text, at most 1,000 characters a message and the last 20 messages.
- The page inserts text with `textContent`, so nothing the agent or a visitor writes can run as HTML. A Content-Security-Policy in `index.html` allows only your own scripts and Turnstile.
- A chat (and its cost) starts only when a visitor opens it.
- Rate limits stop one visitor, not a crowd. The credit limit on your OpenRouter key is what caps cost. Set one.

## When something breaks

| You see | Cause | Fix |
|---|---|---|
| `error: Not allowed` | `ALLOWED_ORIGIN` does not match the page | Exactly `https://<you>.github.io`, then `npx wrangler deploy` |
| `error: Bot check failed` | Turnstile secret and sitekey from different widgets, or hostname missing | Check the widget's hostname and both keys |
| `error: Server misconfigured` | Turnstile test secret on a public page | Put your real Turnstile secret |
| `error: Agent unavailable` | No credit, key limit reached, wrong key, or a `MODEL` with no ZDR provider | `npx wrangler tail` shows OpenRouter's reason. Check balance, key limit and model |
| `error: Too many requests` | Rate limit | Wait a minute |
| `error: Failed to fetch` | Wrong `WORKER_URL` in `config.js`, Worker not deployed, or a brand new workers.dev subdomain | Check `config.js` and the address from `deploy`. A new subdomain can take a few minutes |
| `deploy` fails on `profile.txt` | Step 2 skipped | `cp workers/profile.example.txt workers/profile.txt` |
| Old page after a push | Pages build or browser cache | Wait 2 minutes, hard refresh |

Browser DevTools > Console and Network show the details. `npx wrangler tail` (in `workers/openrouter/`) shows the Worker's logs live.

## Check the Worker

From `workers/`:

```
OPENROUTER_API_KEY=sk-or-... node test-chat.mjs
```

Add `MODEL=<model id>` in front to try another model. It runs the Worker against the real API and spends under a cent.

## Good to know

- Changing `wrangler.toml` or `workers/profile.txt` needs `npx wrangler deploy` again. A deploy keeps the secrets.
- `git push` updates the page only. It never touches the Worker or its secrets.
- To change the model without deploying: dash.cloudflare.com > Workers & Pages > `worker-openrouter` > Settings > Variables and Secrets > edit `MODEL`. Update `wrangler.toml` too, or the next deploy puts the old value back.
- `GUIDE.pdf` is printed from `docs/guide.html`: `google-chrome --headless=new --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf=GUIDE.pdf docs/guide.html`. Update both when GUIDE.md changes.
- If you put the Worker on your own domain, add it to `connect-src` in the CSP line of `index.html`.
