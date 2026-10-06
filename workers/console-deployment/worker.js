// Proxy between the GitHub Pages widget and one deployed Managed Agent.
// Secrets: ANTHROPIC_API_KEY, TURNSTILE_SECRET, SIGNING_SECRET
// Vars: ALLOWED_ORIGIN, DEPLOYMENT_ID. Bindings: START_LIMIT, MSG_LIMIT (rate limits)
// The browser can only: start a run of that deployment, send a message to a session this
// Worker started, and read agent text back. Tool calls and results never leave the Worker.

const API = "https://api.anthropic.com/v1";
const MAX_TEXT = 1000;
const MAX_BODY_BYTES = 4096;
const SID_RE = /^sesn_[A-Za-z0-9]+$/;

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const TEST_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const originOk = origin === env.ALLOWED_ORIGIN;
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    // Browsers always send Origin on cross-site calls. Other clients can fake it, so this only
    // stops other websites. The real gates are Turnstile, the signed session id and the rate limits.
    if (!originOk) return json({ error: "Not allowed" }, 403, cors);
    // The Turnstile test secret always passes. Refuse it unless the page is on localhost.
    if (env.TURNSTILE_SECRET === TEST_TURNSTILE_SECRET && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.ALLOWED_ORIGIN))
      return json({ error: "Server misconfigured" }, 500, cors);

    const { pathname } = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    try {
      if (request.method === "POST" && pathname === "/session") {
        if (!(await allowed(env.START_LIMIT, ip))) return json({ error: "Too many requests" }, 429, cors);
        return await startSession(request, env, cors);
      }
      if (request.method === "POST" && pathname === "/send") {
        if (!(await allowed(env.MSG_LIMIT, ip))) return json({ error: "Too many requests" }, 429, cors);
        return await send(request, env, cors);
      }
      if (request.method === "GET" && pathname === "/events") {
        if (!(await allowed(env.MSG_LIMIT, ip))) return json({ error: "Too many requests" }, 429, cors);
        return await events(request, env, cors);
      }
    } catch (err) {
      console.log("error", String(err)); // no visitor text, no IP
      return json({ error: "Server error" }, 500, cors);
    }
    return json({ error: "Not found" }, 404, cors);
  },
};

// Cloudflare rate limit binding. The key is not stored. No binding (local dev) means no limit.
async function allowed(limiter, key) {
  return !limiter || (await limiter.limit({ key })).success;
}

async function startSession(request, env, cors) {
  const body = await readJson(request);
  if (!body) return json({ error: "Bad request" }, 400, cors);
  if (!(await verifyTurnstile(body.token, request, env))) return json({ error: "Bot check failed" }, 403, cors);

  // The deployment fixes agent, environment, files, vault and budget.
  const run = await anthropic(env, "/deployments/" + env.DEPLOYMENT_ID + "/run", { method: "POST", body: "{}" });
  const sid = run.ok && (await run.json()).session_id;
  if (!sid || !SID_RE.test(sid)) return json({ error: "Agent unavailable" }, 502, cors);
  const exp = Date.now() + SESSION_TTL_MS;
  return json({ sid, exp, sig: await sign(sid, exp, env) }, 200, cors);
}

async function send(request, env, cors) {
  const body = await readJson(request);
  if (!body || !(await sessionOk(body.sid, body.exp, body.sig, env))) return json({ error: "Bad session" }, 403, cors);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  if (!text) return json({ error: "No message" }, 400, cors);

  const res = await anthropic(env, "/sessions/" + body.sid + "/events", {
    method: "POST",
    body: JSON.stringify({ events: [{ type: "user.message", content: [{ type: "text", text }] }] }),
  });
  return json({ ok: res.ok }, res.ok ? 200 : 502, cors);
}

async function events(request, env, cors) {
  const q = new URL(request.url).searchParams;
  const sid = q.get("sid");
  if (!(await sessionOk(sid, Number(q.get("exp")), q.get("sig"), env))) return json({ error: "Bad session" }, 403, cors);

  const res = await anthropic(env, "/sessions/" + sid + "/events");
  if (!res.ok) return json({ error: "Agent unavailable" }, 502, cors);
  const { data = [] } = await res.json();

  // Whitelist what goes back: agent text and run state. Drop tool calls, tool results, usage, errors.
  const out = [];
  for (const e of data) {
    if (e.type === "agent.message") {
      const text = (e.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      out.push({ id: e.id, type: e.type, text });
    } else if (e.type === "session.status_running" || e.type === "session.status_terminated") {
      out.push({ id: e.id, type: e.type });
    } else if (e.type === "session.status_idle") {
      out.push({ id: e.id, type: e.type, requires_action: e.stop_reason?.type === "requires_action" });
    }
  }
  return json({ data: out }, 200, cors);
}

function anthropic(env, path, init = {}) {
  return fetch(API + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "managed-agents-2026-04-01",
    },
  });
}

// Session ids are only usable with a signature this Worker made, so visitors cannot touch other sessions.
async function hmacKey(env, usage) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
async function sign(sid, exp, env) {
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(env, "sign"), new TextEncoder().encode(sid + "." + exp));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sessionOk(sid, exp, sig, env) {
  if (typeof sid !== "string" || !SID_RE.test(sid) || !Number.isFinite(exp) || exp < Date.now() || typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
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
