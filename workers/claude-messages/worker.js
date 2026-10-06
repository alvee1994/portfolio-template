// Chat Worker on the Claude Messages API. Stateless: the page sends the conversation, this returns the reply.
// The profile (rules + CV) is the system prompt, cached for 1 hour, so each turn reads it at a fraction of the price.
// Secrets: ANTHROPIC_API_KEY, TURNSTILE_SECRET, SIGNING_SECRET
// Vars: ALLOWED_ORIGIN, MODEL. Bindings: START_LIMIT, MSG_LIMIT (rate limits)
import PROFILE from "../profile.txt";

const MAX_TEXT = 1000;          // characters per visitor message
const MAX_TURNS = 20;           // messages kept from the conversation (keep it even)
const MAX_BODY_BYTES = 32768;
const TICKET_TTL_MS = 2 * 60 * 60 * 1000;
const TEST_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const originOk = origin === env.ALLOWED_ORIGIN;
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    // Stops other websites only. Turnstile, the signed ticket and the rate limits are the real gates.
    if (!originOk) return json({ error: "Not allowed" }, 403, cors);
    if (env.TURNSTILE_SECRET === TEST_TURNSTILE_SECRET && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.ALLOWED_ORIGIN))
      return json({ error: "Server misconfigured" }, 500, cors);

    const { pathname } = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    try {
      if (request.method === "POST" && pathname === "/session") {
        if (!(await allowed(env.START_LIMIT, ip))) return json({ error: "Too many requests" }, 429, cors);
        return await startSession(request, env, cors);
      }
      if (request.method === "POST" && pathname === "/chat") {
        if (!(await allowed(env.MSG_LIMIT, ip))) return json({ error: "Too many requests" }, 429, cors);
        return await chat(request, env, cors);
      }
    } catch (err) {
      console.log("error", String(err)); // no visitor text, no IP
      return json({ error: "Server error" }, 500, cors);
    }
    return json({ error: "Not found" }, 404, cors);
  },
};

// One Turnstile check per visit buys a signed ticket for 2 hours of chat.
async function startSession(request, env, cors) {
  const body = await readJson(request);
  if (!body) return json({ error: "Bad request" }, 400, cors);
  if (!(await verifyTurnstile(body.token, request, env))) return json({ error: "Bot check failed" }, 403, cors);
  const sid = crypto.randomUUID();
  const exp = Date.now() + TICKET_TTL_MS;
  return json({ sid, exp, sig: await sign(sid, exp, env) }, 200, cors);
}

async function chat(request, env, cors) {
  const body = await readJson(request);
  if (!body || !(await ticketOk(body.sid, body.exp, body.sig, env))) return json({ error: "Bad session" }, 403, cors);
  const messages = cleanMessages(body.messages);
  if (!messages) return json({ error: "Bad messages" }, 400, cors);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: env.MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      fallbacks: "default",
      // Static prefix, cached for 1 hour. Nothing that changes per request goes in here.
      system: [{ type: "text", text: PROFILE, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages,
    }),
  });
  if (!res.ok) {
    console.log("anthropic", res.status, (await res.text()).slice(0, 300));
    return json({ error: "Agent unavailable" }, 502, cors);
  }
  const msg = await res.json();
  if (msg.stop_reason === "refusal") return json({ reply: "I can't help with that one. Try asking about my work." }, 200, cors);
  const reply = (msg.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
  // Usage is returned so the demo can show cache hits. It holds token counts only.
  const u = msg.usage || {};
  return json({
    reply: reply || "No answer this time. Try again.",
    usage: { input: u.input_tokens, cache_read: u.cache_read_input_tokens, cache_write: u.cache_creation_input_tokens, output: u.output_tokens },
  }, 200, cors);
}

// Every conversation starts with a fixed visitor turn asking for the intro, so an empty list returns the greeting.
// The page sends what came after: assistant, user, assistant, ... ending with the visitor. Newest MAX_TURNS kept.
const KICKOFF = { role: "user", content: "Introduce yourself." };
function cleanMessages(list) {
  if (!Array.isArray(list) || list.length > 200) return null;
  const rest = list.map((m) => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: typeof (m && m.content) === "string" ? m.content.trim().slice(0, MAX_TEXT) : "",
  }));
  if (rest.some((m, i) => !m.content || m.role !== (i % 2 === 0 ? "assistant" : "user"))) return null;
  if (rest.length % 2 === 1) return null; // must end with the visitor (or be empty)
  // MAX_TURNS is even, so the kept tail still starts with an assistant reply and alternates after KICKOFF.
  return [KICKOFF, ...rest.slice(-MAX_TURNS)];
}

// Cloudflare rate limit binding. The key is not stored. No binding (local dev) means no limit.
async function allowed(limiter, key) {
  return !limiter || (await limiter.limit({ key })).success;
}

async function hmacKey(env, usage) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
async function sign(sid, exp, env) {
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(env, "sign"), new TextEncoder().encode(sid + "." + exp));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ticketOk(sid, exp, sig, env) {
  if (typeof sid !== "string" || sid.length > 64 || !Number.isFinite(exp) || exp < Date.now() || typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const bytes = Uint8Array.from(sig.match(/../g).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", await hmacKey(env, "verify"), bytes, new TextEncoder().encode(sid + "." + exp));
}

async function verifyTurnstile(token, request, env) {
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return res.ok && (await res.json()).success === true;
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "x-content-type-options": "nosniff", "cache-control": "no-store", ...headers } });
}
