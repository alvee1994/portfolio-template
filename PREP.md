# Portfolio agent: prep and session guide

**What we build:** a public portfolio page on GitHub with an AI agent built in. The agent answers visitors' questions about you, on your behalf.

**Example:** [alvee1994.github.io/portfolio](https://alvee1994.github.io/portfolio). Yours will look like this, with your own agent in the corner.

**Why:** we learn to build an agent together, and you leave with your own portfolio you can share anywhere on the internet.

**By the end of the session:** your page is live at `<username>.github.io/portfolio`. Visitors can chat with your agent, see your free time slots, and request a meeting.

**We have about 45 minutes to build.** Please do Part A before you come, since we will not have time to cover installs during the session.

**Tools we use:**
- **Claude Code, Codex or Antigravity IDE**: your AI assistant. It sets up your laptop and helps you build your portfolio.
- **Claude Console**: to build your own agents and deploy them for use across the internet. Not the same as Claude Code: Claude Code is the assistant on your laptop, the Console runs your agent for your visitors.
- **OpenRouter**: alternative AI models, cheaper than Claude.
- **Cloudflare**: the gateway between your page and your models. It keeps your keys secret.
- **GitHub**: hosts your page for free.

**Part A: do before Wednesday 7 October, 11:00 (about 80 minutes).** Part B is for the session.

# Part A: before the session

Each step has a short video. Watch it first if the step is new to you.

## 1. Accounts (20 min)

1. **GitHub**: sign up at [github.com/signup](https://github.com/signup), Free plan. Your username becomes your web address (`<username>.github.io`), so pick a professional one. [Video](https://www.youtube.com/watch?v=X6sohvgcUo8)
2. **Cloudflare**: go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and click **Sign up with GitHub**. No new password needed. Skip any domain or plan offer.
3. **Claude Console**: nothing to do. We use it for the Claude API key that powers your agent. Alvee creates an account for you before the session and sends you the login. It is a different product from Claude Code: the Console serves your agent to visitors, Claude Code helps you build it.

## 2. Install your AI assistant first (10 min)

Install the assistant first. It then sets up everything else for you. Pick one. Skip the install if you have it.

- **Claude Code**: needs a Claude Pro or Max subscription (or Console credit).
- **Codex**: needs a paid ChatGPT plan.
- **Antigravity IDE**: no subscription? Use this. Google's free tier is generous. Choose the model **Gemini 3.1 Pro (Low)**.

**Open a terminal.** Mac: press Cmd + Space, type `Terminal`, press Enter. Windows: press the Windows key, type `PowerShell`, press Enter (not "Run as administrator"). Paste with `Ctrl + V` (Mac: `Cmd + V`), then press Enter.

| | Claude Code | Codex | Antigravity IDE |
|---|---|---|---|
| Install (Mac) | `curl -fsSL https://claude.ai/install.sh \| bash` | `npm install -g @openai/codex` | Download [Antigravity IDE](https://antigravity.google/product/antigravity-ide/) |
| Install (Windows) | `irm https://claude.ai/install.ps1 \| iex` | `npm install -g @openai/codex` | Download [Antigravity IDE](https://antigravity.google/product/antigravity-ide/) |
| Start it | `claude` | `codex` | Open the app |
| Log in with | Claude Pro/Max or Console account | ChatGPT account | Google account |
| Video | [Windows setup](https://www.youtube.com/watch?v=15wCx927F_o) | | [Get started](https://www.youtube.com/watch?v=tZ4JviUx-x4), [Windows setup](https://www.youtube.com/watch?v=HKPIRY1fc5s) |

Close the terminal and open a new one after installing. New programs only show up in a new window. Still `not recognized`? Restart the laptop.

Codex needs Node.js first: install the LTS version from [nodejs.org](https://nodejs.org). On Windows, if you see `running scripts is disabled`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and type `Y`.

## 3. Let your assistant set up the rest (15 min)

Start your assistant and paste this:

> Help me set up this laptop for a coding workshop. I am not technical, so go one step at a time and tell me exactly what to click or type. Check what is already installed first. I need: Git, Node.js (LTS version) and the GitHub CLI. Set my Git name and email so I can save changes. Then log me in to GitHub with `gh auth login` using the web browser, and let it handle Git logins too. At the end, run `git --version`, `node --version` and `gh auth status` to show me it all works.

Approve each step it asks about. If it gets stuck, paste the error back and ask it to fix it.

<details>
<summary><b>Prefer to do it by hand?</b></summary>

- **Mac:** run `git --version` in Terminal and click Install if a pop-up appears. Install Node.js LTS from [nodejs.org](https://nodejs.org) and the GitHub CLI from [cli.github.com](https://cli.github.com).
- **Windows:** in PowerShell run `winget install -e --id Git.Git; winget install -e --id OpenJS.NodeJS.LTS; winget install -e --id GitHub.cli`, then open a new PowerShell.
- Then tell Git who you are, with the email of your GitHub account: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
- Run `gh auth login`. Choose GitHub.com, HTTPS, say **Yes** to authenticate Git, and log in with a web browser.

</details>

## 4. Your agent's system prompt (30 min, the most important step)

Your agent can only be as good as what you tell it. A CV is a short bulleted list. Your agent needs far more: a detailed document that expands on every experience. The better you prepare this, the better your agent answers visitors.

**Write the detailed document with any AI you have.** Claude Code, Codex, Antigravity IDE, ChatGPT, Claude or Gemini all work. Give it your CV and paste this:

> Here is my CV. Interview me one question at a time to build a detailed markdown document about my career, far more detailed than my CV. For every role and project, ask about the problem, what I did, the tools, the result with numbers, and what I learned. Then 3 to 5 short stories (context, challenge, choice, result), my strengths, and what I want next. Use plain language. Stop when you have covered every experience, then give me the full document.

Take your time with the answers. Real details and numbers make the difference.

**Then put it together.** Copy the template below into a plain text file (Notepad on Windows, TextEdit on Mac). Fill in your name, paste your CV text and the detailed document, and save it as `prompt.txt`. This is the one thing you bring. In the session you paste it in.

```
You represent [your name] professionally on their portfolio website, using their resume and additional details as your source of truth. Answer visitors' questions about their background, skills and experience like a sharp, laconic salesperson: confident, concise, no fluff, always putting them in the best honest light.

<resume>
[paste your CV text here]
</resume>

<additional details>
[paste your detailed document here]
</additional details>
```

> [!NOTE]
> Strangers may read what your agent says. Leave out anything private: phone number, home address, salary, health, other people's names.

## 5. Connect Cloudflare (5 min)

Your assistant does the Cloudflare work for you in the session. ([Cloudflare docs](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/))

*Claude Code:* start `claude` and type these one at a time. This installs Cloudflare's skills and its MCP server.

```
/plugin marketplace add cloudflare/skills
/plugin install cloudflare@cloudflare
```

Type `/exit` and start `claude` again. Type `/mcp`, pick **cloudflare**, choose **Authenticate**.

*Codex:* run these in the terminal (not inside Codex):

```
codex mcp add cloudflare --url https://mcp.cloudflare.com/mcp
codex mcp login cloudflare
```

*Antigravity IDE:* in the Agent panel open the `...` menu, then **MCP Servers**, **Manage MCP Servers**, **View raw config**. Paste this and save:

```
{ "mcpServers": { "cloudflare": { "serverUrl": "https://mcp.cloudflare.com/mcp" } } }
```

*All:* a browser opens. Sign in to Cloudflare and approve. Then ask your assistant:

> List my Cloudflare account name.

If it answers with your account, you are connected.

## Check

Paste this into your assistant. It tests the exact thing you do on the day: create a repo, save a change, push it.

> Create a private GitHub repo called setup-test with a README, save it and push it. Show me the link. Then list my Cloudflare account.

You are ready when the link opens your new repo on GitHub and it names your Cloudflare account.

**Bring:** your logins, the Claude Console login from Alvee, and your `prompt.txt`.

**Stuck?** Bring your laptop and questions to JB-50 30 mins earlier at 10:30 and we will help you set it up!

---

# Part B: during the session

Keep this open. We fill in the rest together.

**Start here.** Open a terminal in the folder where you keep projects and run `claude` or `codex`, or open the folder in Antigravity IDE. Paste:

> Here is a template repo: https://github.com/alvee1994/portfolio-template. Create my own public repo called portfolio from it and pull it to this laptop. Then read its README and help me edit it with my prompt.txt, one step at a time, and push my changes.

**Talk to your assistant in plain English.** Say what you want, check what it proposes, approve.

**Where your secrets go.** Your API key goes into Cloudflare only, as a secret. Ask your assistant to set it, and paste the key only when the terminal asks for it. Never into a file or the chat.

**Useful commands:**

| What | Claude Code | Codex |
|---|---|---|
| Check Cloudflare connection | `/mcp` | `/mcp` |
| Fresh conversation | `/clear` | `/new` |
| Stop mid-answer | `Esc` | `Esc` |
| Leave | `/exit` | `/quit` |

**If something breaks:** paste the full error to your assistant and ask "what went wrong and how do I fix it?". Still stuck? Raise your hand.

**After the session:** your page stays live and uses the API credit on your Claude Console account. The spend limit on that account caps the cost.
