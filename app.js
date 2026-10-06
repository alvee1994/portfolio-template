const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Back ends from config.js. "session" = Managed Agent deployment (start a run, poll events).
// "chat" = stateless Worker (Messages API or OpenRouter): the page keeps the history and posts it each turn.
const BACKENDS = window.BACKENDS.filter(b => !b.disabled);
let backend = BACKENDS[0];
let session = null; // signed ticket { sid, exp, sig } from the Worker
let history = [];   // chat back ends only: assistant, user, assistant, ...
const seen = new Set();

async function api(path, body) {
  const r = await fetch(backend.url + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
  return j;
}

function add(cls, text) {
  const d = document.createElement('div');
  d.className = cls === 'note' ? 'note' : 'msg ' + cls;
  d.textContent = text; // untrusted text, never innerHTML
  $('log').append(d);
  d.scrollIntoView({ block: 'end' });
}

// Three dots while the agent works. Removed when its text arrives or the turn ends.
let dots = null;
function showTyping() {
  if (dots) return;
  dots = document.createElement('div');
  dots.className = 'msg agent typing';
  dots.setAttribute('aria-label', 'The agent is typing');
  for (let i = 0; i < 3; i++) dots.append(document.createElement('i'));
  $('log').append(dots);
  dots.scrollIntoView({ block: 'end' });
}
function hideTyping() { dots?.remove(); dots = null; }

// Read events until the agent is idle again. An idle from before this turn is ignored.
async function drain() {
  let started = false;
  for (;;) {
    await sleep(1000);
    const { data = [] } = await api(`/events?sid=${session.sid}&exp=${session.exp}&sig=${session.sig}`);
    for (const e of data) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (e.type === 'session.status_running' || e.type === 'agent.message') started = true;
      if (e.type === 'session.status_idle' && !started) continue;
      if (e.type === 'agent.message') { hideTyping(); add('agent', e.text); showTyping(); }
      else if (e.type === 'session.status_terminated') return;
      else if (e.type === 'session.status_idle') {
        if (e.requires_action) add('note', 'The agent is waiting on something it cannot get here.');
        return;
      }
    }
  }
}

// Turnstile token is single use: each start gets a fresh one.
function turnstileToken() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function wait() {
      if (window.turnstile) {
        return window.turnstile.render('#ts', {
          sitekey: window.TURNSTILE_SITEKEY,
          callback: tok => { $('ts').replaceChildren(); resolve(tok); },
          'error-callback': () => reject(new Error('bot check failed')),
        });
      }
      if (Date.now() - t0 > 8000) return reject(new Error('bot check did not load'));
      setTimeout(wait, 200);
    })();
  });
}

async function start() {
  if (!session) session = await api('/session', { token: await turnstileToken() }); // reopen after an error reuses it
  if (backend.kind === 'chat') return add('agent', window.GREETING); // prebuilt, not in history: the model call starts with the visitor's message
  showTyping();
  try {
    if (backend.kind === 'chat') await chatTurn();
    else await drain();
  } finally { hideTyping(); }
}

// One stateless call: the Worker gets the whole conversation and returns the next reply.
async function chatTurn() {
  const { reply, usage } = await api('/chat', { sid: session.sid, exp: session.exp, sig: session.sig, messages: history.slice(-20) }); // the Worker keeps 20 anyway; this keeps the request small
  hideTyping();
  add('agent', reply);
  history.push({ role: 'assistant', content: reply });
  if (window.SHOW_USAGE && usage) add('note', 'tokens: ' + JSON.stringify(usage));
}

async function ask(text) {
  showTyping(); // right after the visitor's message, before the Worker answers
  try {
    if (backend.kind === 'chat') {
      history.push({ role: 'user', content: text });
      try { await chatTurn(); } catch (err) { history.pop(); throw err; } // keep the history alternating
    } else {
      await api('/send', { sid: session.sid, exp: session.exp, sig: session.sig, text });
      await drain();
    }
  } finally { hideTyping(); }
}

$('form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const text = $('msg').value.trim();
  if (!text) return;
  $('msg').value = '';
  $('go').disabled = true;
  add('user', text);
  try { await ask(text); }
  catch (err) { add('note', 'error: ' + err.message); }
  $('go').disabled = false;
  $('msg').focus();
});

// The run (and its cost) starts only when the visitor opens the chat, once.
let opened = false;
function openChat() {
  $('panel').classList.add('open');
  $('launch').style.display = 'none';
  if (opened) return;
  opened = true;
  $('go').disabled = true;
  start().catch(err => { opened = false; add('note', 'error: ' + err.message); })
         .finally(() => { $('go').disabled = !session; });
}
$('launch').addEventListener('click', openChat);

// Switching back end starts a fresh conversation (and a fresh bot check).
if (BACKENDS.length > 1) {
  const pick = $('backend');
  for (const b of BACKENDS) pick.append(new Option(b.label, b.id));
  pick.hidden = false;
  pick.addEventListener('change', () => {
    backend = BACKENDS.find(b => b.id === pick.value);
    session = null; history = []; seen.clear(); opened = false;
    $('log').replaceChildren();
    openChat();
  });
}
$('close').addEventListener('click', () => { $('panel').classList.remove('open'); $('launch').style.display = ''; });

// The hero button opens the same chat as the floating one.
document.getElementById('ask').addEventListener('click', ev => { ev.preventDefault(); openChat(); });
