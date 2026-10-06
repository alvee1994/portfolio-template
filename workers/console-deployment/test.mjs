// Runs the Worker in-process against the real Anthropic API. Spends a few cents of the deployment budget.
// Usage: ANTHROPIC_API_KEY=sk-ant-... DEPLOYMENT_ID=depl_... node test.mjs
import worker from "./worker.js";
import assert from "node:assert/strict";

if (!process.env.ANTHROPIC_API_KEY || !process.env.DEPLOYMENT_ID) throw new Error("Set ANTHROPIC_API_KEY and DEPLOYMENT_ID first");

const env = {
  ALLOWED_ORIGIN: "http://localhost:8000",
  DEPLOYMENT_ID: process.env.DEPLOYMENT_ID, // yours, from the Console
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  TURNSTILE_SECRET: "1x0000000000000000000000000000000AA", // Cloudflare test secret, always passes
  SIGNING_SECRET: "test-secret",
};
const call = (path, { method = "GET", body, origin = env.ALLOWED_ORIGIN } = {}) =>
  worker.fetch(new Request("https://w.test" + path, {
    method, headers: { Origin: origin, "content-type": "application/json" }, body: body && JSON.stringify(body),
  }), env);

assert.equal((await call("/session", { method: "POST", body: {}, origin: "https://evil.test" })).status, 403, "bad origin");
assert.equal((await call("/session", { method: "POST", body: {} })).status, 403, "no turnstile token");
const prod = { ...env, ALLOWED_ORIGIN: "https://me.github.io" };
const r = await worker.fetch(new Request("https://w.test/session", { method: "POST", headers: { Origin: prod.ALLOWED_ORIGIN }, body: "{}" }), prod);
assert.equal(r.status, 500, "test Turnstile secret refused off localhost");
assert.equal((await call("/events?sid=sesn_x&exp=9999999999999&sig=" + "0".repeat(64))).status, 403, "forged signature");
assert.equal((await call("/other")).status, 404, "unknown route");
const deny = { limit: async () => ({ success: false }) };
const limited = await worker.fetch(new Request("https://w.test/session", { method: "POST", headers: { Origin: env.ALLOWED_ORIGIN }, body: "{}" }), { ...env, START_LIMIT: deny });
assert.equal(limited.status, 429, "rate limit");

const { sid, exp, sig } = await (await call("/session", { method: "POST", body: { token: "XXXX.DUMMY.TOKEN.XXXX" } })).json();
assert.match(sid, /^sesn_/);
assert.equal((await call(`/events?sid=${sid}&exp=${exp}&sig=${"0".repeat(64)}`)).status, 403, "wrong sig for real sid");
assert.equal((await call(`/events?sid=${sid}&exp=${exp + 1}&sig=${sig}`)).status, 403, "tampered expiry");
assert.equal((await call(`/events?sid=${sid}&exp=1&sig=${sig}`)).status, 403, "expired");

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  const { data } = await (await call(`/events?sid=${sid}&exp=${exp}&sig=${sig}`)).json();
  const types = new Set(data.map((e) => e.type));
  assert.ok([...types].every((t) => ["agent.message", "session.status_running", "session.status_idle", "session.status_terminated"].includes(t)), "only whitelisted events leak");
  if (types.has("session.status_idle")) { console.log("intro:", data.find((e) => e.type === "agent.message")?.text.slice(0, 200)); break; }
}
console.log("ok");
