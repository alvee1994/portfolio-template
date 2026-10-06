# Instructions for coding agents

You are helping a student turn this template into their own portfolio page with an AI agent that answers visitors' questions about them. The student may not be technical. Explain each step in one or two plain sentences, do the work yourself, and ask before anything that costs money or touches secrets.

Read README.md for the full architecture, security notes and troubleshooting table. This file is the order of work.

## Ground rules

- The repo is public. Never commit a CV, `workers/profile.txt`, `.dev.vars`, or any key.
- API keys go into Cloudflare only, with `npx wrangler secret put <NAME>`. The student pastes the key into the terminal prompt themselves. Never ask them to paste a key into the chat, and never write it to a file.
- `config.js` is public. Only Worker URLs, the Turnstile sitekey and the greeting go there.
- Keep the ids `ask`, `launch` and `panel` in `index.html`, and keep the Content-Security-Policy meta tag.
- Insert text with `textContent`, never `innerHTML`.
- Do not touch `app.js` or the Worker code unless the student asks.
- Use one Worker. Default to `workers/openrouter` (cheapest). Use `workers/claude-messages` if the student only has an Anthropic key.
- If the Cloudflare MCP server is connected, you may use it to check the account, Workers and Turnstile. Deploy with `npx wrangler deploy`.

## Repo

The student's repo should be their own copy of alvee1994/portfolio-template, made with **Use this template** and named `portfolio`. If they cloned the template itself, help them create their copy first.

## Ask the student first

1. Their GitHub username. Everything below uses `https://<username>.github.io` as the page origin.
2. Where their `prompt.txt` is (prepared before the session, see PREP.md). It has their name, their CV inside `<resume>` and detailed notes inside `<additional details>`. Never commit it.
3. Which key they have: OpenRouter or Anthropic.

## Steps

1. **Knowledge.** Copy `workers/profile.example.txt` to `workers/profile.txt`. Replace `<Your Name>` and the pronouns. From `prompt.txt`, paste the `<resume>` text under `# Profile` and the `<additional details>` text under `# Experience repository`. Keep the rules block as is. Remove phone numbers, home address and anything else private. Confirm `git check-ignore workers/profile.txt` prints the path.
2. **Page.** Fill `index.html` from the CV: `<title>`, meta description, the top bar name and initial, the tag, the headline (three short phrases), one-line summary, three results with numbers, experience, skills, education, contact. Keep the structure and classes. Plain, short sentences.
3. **Worker.** In the chosen `workers/<name>/wrangler.toml`, set `ALLOWED_ORIGIN = "https://<username>.github.io"`. Then from that folder:
   ```
   npx wrangler login
   npx wrangler deploy
   ```
   Keep the printed `https://worker-<name>.<subdomain>.workers.dev` address.
4. **Secrets.** From the same folder, let the student run each and paste when prompted:
   ```
   npx wrangler secret put OPENROUTER_API_KEY     (or ANTHROPIC_API_KEY)
   npx wrangler secret put SIGNING_SECRET          (any long random string)
   ```
5. **Turnstile.** Guide the student: dash.cloudflare.com > Turnstile > Add widget, hostname `<username>.github.io`, mode Managed. Then `npx wrangler secret put TURNSTILE_SECRET` with the secret key.
6. **config.js.** Keep only the chosen entry in `window.BACKENDS`, set its `url` to the Worker address, set `TURNSTILE_SITEKEY` to the widget's sitekey, and set `GREETING` to one line in the student's name.
7. **Publish.** Commit and push to `main`. Then the student sets repo Settings > Pages > Source: GitHub Actions, and runs the **Deploy page** workflow once from the Actions tab.
8. **Test.** Open `https://<username>.github.io/portfolio/`, click "Ask my agent", ask about one achievement. If anything fails, use the troubleshooting table in README.md and `npx wrangler tail` in the Worker folder.

## Done when

The page is live with the student's own content, the chat answers from their profile, and `git status` shows no private files staged.
