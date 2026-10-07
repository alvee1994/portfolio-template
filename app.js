const $ = id => document.getElementById(id);
// The Worker is stateless: the page keeps the history and posts it each turn.
let session = null; // signed ticket { sid, exp, sig } from the Worker
let history = [];   // assistant, user, assistant, ...

async function api(path, body) {
  const r = await fetch(window.WORKER_URL + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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
  add('agent', window.GREETING); // prebuilt greeting, no model call
  history.push({ role: 'assistant', content: window.GREETING }); // the Worker expects the history to start with an assistant turn
}

// One stateless call: the Worker gets the whole conversation and returns the next reply.
async function ask(text) {
  showTyping();
  history.push({ role: 'user', content: text });
  try {
    const { reply, usage } = await api('/chat', { sid: session.sid, exp: session.exp, sig: session.sig, messages: history.slice(-20) }); // the Worker keeps 20 anyway; this keeps the request small
    hideTyping();
    add('agent', reply);
    history.push({ role: 'assistant', content: reply });
    if (window.SHOW_USAGE && usage) add('note', 'tokens: ' + JSON.stringify(usage));
  } catch (err) {
    history.pop(); // keep the history alternating
    throw err;
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

// The bot check (and any cost) starts only when the visitor opens the chat, once.
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
$('close').addEventListener('click', () => { $('panel').classList.remove('open'); $('launch').style.display = ''; });

// The hero button opens the same chat as the floating one.
$('ask').addEventListener('click', ev => { ev.preventDefault(); openChat(); });
