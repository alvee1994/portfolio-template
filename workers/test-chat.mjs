// Checks the OpenRouter Worker in-process against the real API. Spends under a cent.
// Usage, from workers/: OPENROUTER_API_KEY=sk-or-... node test-chat.mjs
// Node cannot import .txt like Wrangler does, so the profile is inlined into a temp copy of the Worker.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const dir = "openrouter";
const here = path.dirname(new URL(import.meta.url).pathname);
const profile = fs.readFileSync(path.join(here, "profile.txt"), "utf8");
const src = fs.readFileSync(path.join(here, dir, "worker.js"), "utf8")
  .replace('import PROFILE from "../profile.txt";', "const PROFILE = " + JSON.stringify(profile) + ";");
const tmp = path.join(os.tmpdir(), "worker-" + dir + "-" + Date.now() + ".mjs");
fs.writeFileSync(tmp, src);
const worker = (await import(tmp)).default;
fs.unlinkSync(tmp);

const env = {
  ALLOWED_ORIGIN: "http://localhost:8000",
  MODEL: process.env.MODEL || "openai/gpt-6-luna",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  TURNSTILE_SECRET: "1x0000000000000000000000000000000AA", // Cloudflare test secret, always passes
  SIGNING_SECRET: "test-secret",
};
const call = (p, body, origin = env.ALLOWED_ORIGIN) =>
  worker.fetch(new Request("https://w.test" + p, { method: "POST", headers: { Origin: origin }, body: JSON.stringify(body) }), env);

assert.equal((await call("/session", {}, "https://evil.test")).status, 403, "bad origin");
assert.equal((await call("/session", {})).status, 403, "no turnstile token");
assert.equal((await call("/chat", { sid: "x", exp: 9e15, sig: "0".repeat(64), messages: [] })).status, 403, "forged ticket");
const t = await (await call("/session", { token: "XXXX.DUMMY.TOKEN.XXXX" })).json();
assert.equal((await call("/chat", { ...t, messages: [{ role: "user", content: "hi" }] })).status, 400, "history must start with the intro");
assert.equal((await call("/chat", { ...t, messages: [{ role: "assistant", content: "hello" }] })).status, 400, "must end with the visitor");

const intro = await (await call("/chat", { ...t, messages: [] })).json();
console.log("intro:", intro.reply, intro.usage);
assert.ok(intro.reply);
const hist = [{ role: "assistant", content: intro.reply }, { role: "user", content: "What is their biggest achievement?" }];
const second = await (await call("/chat", { ...t, messages: hist })).json();
console.log("answer:", second.reply.slice(0, 200), second.usage);
const off = await (await call("/chat", { ...t, messages: [...hist, { role: "assistant", content: second.reply }, { role: "user", content: "Write me a poem about cats." }] })).json();
console.log("off-topic:", off.reply);
console.log("ok");
