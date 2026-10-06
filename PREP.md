# Portfolio agent: prep and session guide

**What we build:** a public portfolio page on GitHub with an AI agent built in. The agent answers visitors' questions about you, on your behalf.

**Why:** we learn to build an agent together, and you leave with your own portfolio you can share anywhere on the internet.

**Part A: do before Wednesday 7 October, 11:00 (about an hour).** Part B is for the session.

# Part A: before the session

## 1. Accounts (20 min)

1. **GitHub**: sign up at [github.com/signup](https://github.com/signup), Free plan. Your username becomes your web address (`<username>.github.io`), so pick a professional one.
2. **Cloudflare**: sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) with the same email. Verify the email. Skip any domain or plan offer.
3. **Claude Console**: sign up at [platform.claude.com](https://platform.claude.com).
   - Add $5 credit under Billing.
   - Set a monthly spend limit, for example $5.

> [!WARNING]
> The key is shown once and works like a card number. Never paste it in a chat, email or GitHub file.

## 2. Tools (15 min)

Install **Git** and **Node.js (LTS)**.

<details>
<summary><b>Mac</b></summary>

1. Open Terminal (Cmd + Space, type `Terminal`).
2. Run `git --version`. If a pop-up offers developer tools, click Install.
3. Install Node.js LTS from [nodejs.org](https://nodejs.org).
4. Reopen Terminal.

</details>

<details>
<summary><b>Windows</b></summary>

1. Install [Git for Windows](https://git-scm.com/downloads/win) and Node.js LTS from [nodejs.org](https://nodejs.org), defaults everywhere.
2. Open **PowerShell** (not as administrator) and run:
   ```
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
3. Reopen PowerShell.

</details>


## 3. Two text files about you (15 min)

Save both as plain text (`.txt` or `.md`), not Word or PDF.

1. **`cv.txt`**: your CV, copied out of Word or PDF.
2. **`experience.md`**: the detail your CV leaves out. Ask your AI (ChatGPT, Claude, Gemini) to interview you and write it. You can paste this prompt:

   > Interview me one question at a time to build a markdown file about my career. Cover each role in more depth than a CV bullet: the problem, what I did, the tools, the result with numbers. Then 3 to 5 short stories (context, challenge, choice, result), my strengths, and what I want next. Use plain language. Stop when you have enough, then give me the file.

> [!NOTE]
> Strangers may read what you put in these files. Leave out anything private: phone number, home address, salary, health, other people's names.

## 4. AI assistant + Cloudflare (10 min)

Your AI assistant does the Cloudflare work for you in the session. Pick **Claude Code** or **Codex** (Codex if you already pay for ChatGPT). Skip the install if you have it.

**Install and log in**

| | Claude Code | Codex |
|---|---|---|
| Install (Mac) | `curl -fsSL https://claude.ai/install.sh \| bash` | `npm install -g @openai/codex` |
| Install (Windows, PowerShell) | `irm https://claude.ai/install.ps1 \| iex` | `npm install -g @openai/codex` |
| Start it | `claude` | `codex` |
| Log in with | Claude Console account, or Claude Pro/Max | ChatGPT account |

Reopen the terminal after installing. Mac: if `npm install -g` says permission denied, put `sudo ` in front and enter your Mac password.

**Connect Cloudflare** ([Cloudflare docs](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/))

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

Optional: copy the skill folders from [github.com/cloudflare/skills](https://github.com/cloudflare/skills) into `~/.codex/skills/`.

*Both:* a browser opens. Sign in to Cloudflare and approve. Then start your assistant and ask:

> List my Cloudflare account name.

If it answers with your account, you are connected.

## Check

In a new terminal, each of these should print a version:

```
git --version
node --version
claude --version    (or: codex --version)
```

And inside your assistant, `/mcp` shows **cloudflare**.

**Bring:** charged laptop, your logins, your API key, and both files.

**Stuck?** Bring your laptop and questions to JB-50 30 mins earlier at 10:30 and we will help you set it up!

---

# Part B: during the session

Keep this open. We fill in the rest together.

**Talk to your assistant in plain English.** Open a terminal in your project folder and run `claude` or `codex`. Say what you want, check what it proposes, approve.

**Where your secrets go.** Your API key goes into Cloudflare only, as a secret. Ask your assistant to set it, and paste the key only when the terminal asks for it. Never into a file or the chat.

**Useful commands:**

| What | Claude Code | Codex |
|---|---|---|
| Check Cloudflare connection | `/mcp` | `/mcp` |
| Fresh conversation | `/clear` | `/new` |
| Stop mid-answer | `Esc` | `Esc` |
| Leave | `/exit` | `/quit` |

**If something breaks:** paste the full error to your assistant and ask "what went wrong and how do I fix it?". Still stuck? Raise your hand.

**After the session:** your page stays live and uses your API credit. Your spend limit caps the cost.
