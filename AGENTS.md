# Instructions for coding agents

You are helping a student turn this template into their own portfolio page with an AI agent that answers visitors' questions about them. Assume the student is not technical. Do the work yourself. The student should only have to log in, approve, and paste their API key into a file. Explain each step in one plain sentence. Ask before anything that costs money.

The student-facing walkthrough is GUIDE.md. README.md has the architecture, security notes and a troubleshooting table. This file is the order of work.

## Ground rules

- The repo is public. Never commit a CV, `prompt.txt`, `workers/profile.txt`, `.dev.vars`, or any key.
- Never copy `prompt.txt` or any CV file into the repo folder, not even for a moment. Read it where the student keeps it (usually Documents). The only place its content goes is `workers/profile.txt`, which is gitignored and reaches Cloudflare only inside the Worker when you deploy. Before every commit, run `git status` and stop if `prompt.txt`, a CV, `workers/profile.txt` or `.dev.vars` is listed.
- The student's OpenRouter key goes only into `workers/openrouter/.dev.vars` (gitignored), which the student fills in themselves. Never ask for the key in the chat. Never print, cat or read `.dev.vars` after the student has edited it.
- You create the other secrets yourself (`SIGNING_SECRET`, `TURNSTILE_SECRET`). Never send the student to the Cloudflare dashboard for something the Cloudflare MCP can do.
- `config.js` is public. Only the Worker URL, the Turnstile sitekey and the greeting go there.
- Every id in the repo is a placeholder. Create the student's own in their own accounts. Never reuse ids from alvee1994.github.io or invent one.
- Keep the ids `ask`, `launch` and `panel` in `index.html`, and keep the Content-Security-Policy meta tag.
- Insert text with `textContent`, never `innerHTML`.
- Do not touch `app.js` or the Worker code unless the student asks.
- The only back end is OpenRouter, in `workers/openrouter`. Every request is pinned to zero data retention providers (`provider: { zdr: true, data_collection: "deny" }` in `worker.js`). Never remove that.

## 0. Check the tools

Run `git --version`, `node --version` and `gh auth status`. If one is missing, install it and log in (`gh auth login`, web browser, authenticate Git: yes).

Check the Cloudflare MCP by fetching the student's accounts. If it is not connected, give the student the connect steps from GUIDE.md step 4 and wait. If they cannot connect it, use the manual fallback at the end of this file.

Check Wrangler with `npx wrangler whoami`. **Never run `npx wrangler login` yourself:** it waits for a click in the student's browser, and inside an agent shell it hangs or is blocked. If whoami says not logged in, stop and give the student exactly this, then wait for "done" and run whoami again:

> Wrangler needs you to log in to Cloudflare once. Please:
> 1. Open a terminal: on Mac, Cmd + Space, type Terminal, Enter. On Windows, Windows key, type PowerShell, Enter. (In the Claude desktop app you can click Terminal at the top of this session. In Antigravity, Terminal > New Terminal.)
> 2. Type `npx wrangler login` and press Enter. If it asks "Ok to proceed? (y)", type y and press Enter.
> 3. Your browser opens a Cloudflare page. Log in if asked, then click Allow.
> 4. When the terminal says you are logged in, come back here and type "done".

## 1. Repo

Get the username with `gh api user -q .login`. Do not ask for it. Below, `<username>` is that login **in lowercase** wherever it is part of an address: browsers send the page origin in lowercase, so `ALLOWED_ORIGIN`, the Turnstile domain and the page link must be lowercase. The page origin is `https://<username>.github.io`.

The student may be on Windows (PowerShell). Prefer `node -e` over `grep`, `curl` or shell redirection, and write files with your file tool, not `>` or `>>`.

The student normally creates their copy on github.com first (GUIDE.md step 7.1: **Use this template > Create a new repository**, name `portfolio`, Public). Check it:

```
gh repo view portfolio --json name,visibility,url
```

- **It exists:** clone it with `gh repo clone portfolio` and move into it. If it is private, explain that the page must be public for visitors to reach it, ask, then `gh repo edit portfolio --visibility public --accept-visibility-change-consequences`.
- **It does not exist:** create it from the template, after telling the student:
  ```
  gh repo create portfolio --template alvee1994/portfolio-template --public --clone
  ```
- **They used another name:** use that name everywhere below. The page is then at `https://<username>.github.io/<repo name>/`. `ALLOWED_ORIGIN` stays `https://<username>.github.io`.

## 2. Ask the student

1. Where their `prompt.txt` is (see GUIDE.md step 5). It has their name, their CV inside `<resume>` and notes inside `<additional details>`. If they have none, offer to interview them to write it. Never commit it.
2. Confirm they finished GUIDE.md step 6: $5 credit, all Zero Data Retention switches on and saved in their OpenRouter workspace guardrail, a key with a $5 credit limit. Do not continue until they confirm the limit is set: it is what caps their bill. They do not paste the key yet.
3. Which model. Default `openai/gpt-6-luna`. If they name another, check it has ZDR providers before using it:
   ```
   node -e "fetch('https://openrouter.ai/api/v1/endpoints/zdr').then(r=>r.json()).then(j=>console.log(j.data.some(e=>e.model_id==='<model id>')))"
   ```
   `false` means it will not work. Ask them to pick another from GUIDE.md step 6.4.

## 3. Knowledge

Copy `workers/profile.example.txt` to `workers/profile.txt`. Replace `<Your Name>` and the pronouns. Paste the `<resume>` text under `# Profile` and the `<additional details>` text under `# Experience repository`. Keep the rules block. Remove phone numbers, home address and anything else private. Confirm `git check-ignore workers/profile.txt` prints the path. Then tell the student in one or two sentences: their `prompt.txt` stays on their laptop and never goes to GitHub; its content is packed into their Worker on Cloudflare, so visitors can only learn those details by asking the agent.

## 4. Page

Fill `index.html` from the CV: `<title>`, meta description, the top bar name and initial, the tag, the headline (three short phrases), one-line summary, three results with numbers, experience, skills, education, contact. Keep the structure and classes. Plain, short sentences.

Then make the page easy to find for search engines and AI assistants (SEO and GEO). Use only facts from the CV, nothing from `<additional details>` that the student would not put on the page:

- **Head of `index.html`:** fill every placeholder in the block under the `CHANGE: search and AI visibility` comment: title (`Name | Role`), a 150 to 160 character description that names the person, role and focus, canonical and `og:url` (`https://<username>.github.io/<repo name>/`, lowercase), Open Graph text, and the JSON-LD (`jobTitle`, `description`, `sameAs` with their real LinkedIn and GitHub, `alumniOf`, `knowsAbout` from the skills). Remove a `sameAs` entry they do not have. Keep the JSON valid.
- **`llms.txt`:** a plain markdown summary of the page for AI tools: name, one-line summary, results, experience, education, skills, links. Same facts as the page, no private details.
- **`sitemap.xml`:** the page URL and today's date as `lastmod`.
- **Photo (optional):** if the student wants one in link previews, save it as `assets/photo.jpg` (square, at least 300 px) and add `<meta property="og:image" content="https://<username>.github.io/<repo name>/assets/photo.jpg">`.

The Pages workflow publishes only `index.html`, `app.js`, `config.js`, `ribbon.js`, `llms.txt`, `sitemap.xml` and `assets/`. A new file the page needs must be added to the `cp` line in `.github/workflows/pages.yml`.

## 5. Cloudflare, through the MCP

Use the Cloudflare MCP for all of this. Use the account id from step 0.

1. **workers.dev subdomain.** `GET /accounts/{account_id}/workers/subdomain`. If there is none, `PUT` it with `{"subdomain": "<username in lowercase>"}`. If that name is taken, try `<username>-portfolio`. Without a subdomain, `wrangler deploy` stops at a prompt the student cannot answer from here.
2. **Turnstile widget.** `GET /accounts/{account_id}/challenges/widgets` and reuse a widget whose `domains` include `<username>.github.io` (read its secret with `GET .../challenges/widgets/{sitekey}`). Otherwise `POST /accounts/{account_id}/challenges/widgets` with `{"name": "portfolio", "domains": ["<username>.github.io"], "mode": "managed"}`. Keep `sitekey` and `secret` from the result.

The Worker address will be `https://worker-openrouter.<subdomain>.workers.dev`.

## 6. Secrets file

Get a random signing secret:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

With your file tool (plain UTF-8, not shell redirection, which writes UTF-16 on Windows PowerShell), create `workers/openrouter/.dev.vars` with exactly three lines:

```
SIGNING_SECRET=<the random string>
TURNSTILE_SECRET=<secret from step 5>
OPENROUTER_API_KEY=
```

Then confirm `git check-ignore workers/openrouter/.dev.vars` prints the path.

Open it for the student: `code .dev.vars` if VS Code is installed, else `open -e .dev.vars` (Mac) or `notepad .dev.vars` (Windows). Tell them: "Paste your OpenRouter key right after `OPENROUTER_API_KEY=`, no spaces, then save and close." Then check without reading it:

```
node -e "console.log(/^OPENROUTER_API_KEY=sk-or-\S+\s*$/m.test(require('fs').readFileSync('.dev.vars','utf8')))"
```

It must print `true`. If not, ask them to check the line again.

## 7. Worker

In `workers/openrouter/wrangler.toml`, set `ALLOWED_ORIGIN = "https://<username>.github.io"` (no path, no trailing slash) and `MODEL` to the chosen model id. Then from `workers/openrouter/`:

```
npx wrangler deploy --secrets-file .dev.vars
```

It uploads the Worker and all three secrets at once. Check the printed address matches step 5. If it says you are not logged in, give the student the Wrangler login steps from step 0 and wait.

## 8. config.js

Set `WORKER_URL` to the Worker address. Set `TURNSTILE_SITEKEY` to the sitekey. Set `GREETING` to one line in the student's name.

## 9. Publish

From the repo root: `git status` (no private files), then commit and push to `main`. Turn on Pages and run the deploy once:

```
gh api -X POST repos/<username>/<repo name>/pages -f build_type=workflow
gh workflow run "Deploy page"
```

A 409 from the first command means Pages is already on. Check once with `gh run list --limit 1`. Do not loop. If it is still running, tell the student it takes 1 to 2 minutes.

## 10. Test

Ask the student to open `https://<username>.github.io/<repo name>/`, click "Ask my agent" and ask about one achievement. If it fails, match the error to the troubleshooting table in README.md, and run `npx wrangler tail` in `workers/openrouter/` while they retry. A new workers.dev subdomain can take a few minutes before it answers.

## Later changes

- **Page:** edit `index.html`, commit, push. Pages republishes.
- **Knowledge:** edit `workers/profile.txt`, then `npx wrangler deploy` in `workers/openrouter/`. A push does not update the Worker.
- **Model:** check the id against the ZDR list (step 2), set `MODEL` in `wrangler.toml`, `npx wrangler deploy`, commit.
- **Key:** the student edits `.dev.vars`, then `npx wrangler deploy --secrets-file .dev.vars`.

## Done when

The page is live with the student's own content, the chat answers from their profile, and `git status` shows no private files.

## Manual fallback (no Cloudflare MCP)

Only if the MCP cannot be connected. Step 5.1: run `npx wrangler deploy` in the student's own terminal once, and let them answer the subdomain prompt. Step 5.2: guide them to dash.cloudflare.com > Turnstile > Add widget, hostname `<username>.github.io`, mode Managed. They paste the secret key into `.dev.vars` after `TURNSTILE_SECRET=` and give you the sitekey, which is public.
