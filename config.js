// Public settings for the page. Never put a secret here: everyone can read this file.

// CHANGE: your Worker addresses, printed by `npx wrangler deploy`. No trailing slash.
// The first enabled entry is the default. disabled: true shows the entry greyed out in the switch; the page never calls its Worker.
// Keep one entry to hide the switch. kind: "session" = Managed Agent deployment, "chat" = Messages API or OpenRouter.
window.BACKENDS = [
  { id: "openrouter", label: "OpenRouter",    kind: "chat",    url: "https://worker-openrouter.<your-subdomain>.workers.dev" },
  { id: "messages",   label: "Claude API",    kind: "chat",    url: "https://worker-claude-messages.<your-subdomain>.workers.dev" },
  { id: "console",    label: "Managed Agent", kind: "session", url: "https://worker-claude-console-deployment.<your-subdomain>.workers.dev" },
];

// CHANGE: first message in the chat. Shown as is, no model call.
window.GREETING = "Hi, I'm <Your Name>'s assistant. Ask me about their work and experience.";

// Show token counts (incl. cache reads) under each reply. Handy for a demo, off for a real portfolio.
window.SHOW_USAGE = false;

// CHANGE: your Turnstile sitekey (dash.cloudflare.com > Turnstile). Public by design.
// For practice you can use Cloudflare's test key "1x00000000000000000000AA", which always passes.
window.TURNSTILE_SITEKEY = "1x00000000000000000000AA";
