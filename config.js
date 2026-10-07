// Public settings for the page. Never put a secret here: everyone can read this file.

// CHANGE: your Worker address, printed by `npx wrangler deploy`. No trailing slash.
window.WORKER_URL = "https://worker-openrouter.<your-subdomain>.workers.dev";

// CHANGE: first message in the chat. Shown as is, no model call.
window.GREETING = "Hi, I'm <Your Name>'s assistant. Ask me about their work and experience.";

// Show token counts under each reply. Handy while testing, off for a real portfolio.
window.SHOW_USAGE = false;

// CHANGE: your Turnstile sitekey (your assistant creates the widget). Public by design.
// Cloudflare's test key "1x00000000000000000000AA" always passes, for local testing only.
window.TURNSTILE_SITEKEY = "1x00000000000000000000AA";
