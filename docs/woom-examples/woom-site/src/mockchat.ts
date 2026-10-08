/**
 * WOOM SITE — mockchat.ts — the MOCKED in-world conversation (the funnel peak).
 *
 * After character-select → Enter World, the visitor lands in the frozen world and
 * starts a conversation with an in-world agent. The agent is NOT real — it replays
 * scripted lines (honest: a demo that "says whatever it's programmed to say"). After
 * the FIRST exchange it drops the community CTA: "Love this? Join here →" with an
 * inline email capture. This is where the emotional peak meets the ask.
 *
 * Self-contained DOM overlay (injects its own <style>, like create.ts). No engine
 * imports, no backend — a pure scripted funnel component. Returns a teardown fn.
 */

export interface MockChatOpts {
  character: string | null;          // the name the visitor chose at char-select (or null on OVERSEE)
  onLeave: () => void;               // "← leave" → back to the workshop
  onJoin?: (email: string) => void;  // fired once, on a valid email (persist upstream)
}

const CSS = `
#mc-panel { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 12;
  width: min(560px, 94vw); max-height: 62vh; display: flex; flex-direction: column;
  background: rgba(9,14,26,0.92); backdrop-filter: blur(10px); border: 1px solid #24406e;
  border-radius: 14px; box-shadow: 0 20px 60px #000b, 0 0 0 1px #0b1730; overflow: hidden;
  font-family: ui-sans-serif,-apple-system,"Segoe UI",Inter,system-ui,sans-serif; color: #dfe9ff;
  animation: mc-rise 0.4s cubic-bezier(0.2,0.9,0.3,1); }
@keyframes mc-rise { from { opacity:0; transform: translate(-50%, 16px); } to { opacity:1; transform: translate(-50%,0); } }
#mc-head { display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid #1b2c4d; }
#mc-dot { width:8px; height:8px; border-radius:50%; background:#6fe0a0; box-shadow:0 0 8px #6fe0a0; }
#mc-who { font-size:13px; font-weight:650; letter-spacing:0.01em; }
#mc-who b { color:#8fb4ff; }
#mc-leave { margin-left:auto; background:none; border:1px solid #2a3d63; color:#8aa0c8; border-radius:7px;
  font:inherit; font-size:11px; padding:4px 9px; cursor:pointer; }
#mc-leave:hover { border-color:#6fb0ff; color:#dfe9ff; }
#mc-log { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
.mc-msg { max-width:82%; padding:9px 12px; border-radius:12px; font-size:13.5px; line-height:1.5; }
.mc-agent { align-self:flex-start; background:#14213b; border:1px solid #24406e; color:#e6eeff; border-bottom-left-radius:4px; }
.mc-user { align-self:flex-end; background:linear-gradient(180deg,#2a63c8,#1d3a7e); color:#eef4ff; border-bottom-right-radius:4px; }
.mc-typing { align-self:flex-start; color:#6f86b0; font-size:13px; padding:4px 12px; }
.mc-typing span { display:inline-block; width:6px; height:6px; margin:0 1px; border-radius:50%; background:#6f86b0; animation:mc-blink 1s infinite; }
.mc-typing span:nth-child(2){ animation-delay:0.2s } .mc-typing span:nth-child(3){ animation-delay:0.4s }
@keyframes mc-blink { 0%,60%,100%{opacity:0.25} 30%{opacity:1} }
#mc-cta { margin:2px 14px 0; padding:12px; border:1px solid #3a5cff55; border-radius:11px;
  background:linear-gradient(180deg, rgba(58,92,255,0.14), rgba(20,33,59,0.5)); display:none; }
#mc-cta.show { display:block; animation: mc-rise 0.4s ease; }
#mc-cta .mc-cta-t { font-size:13px; font-weight:650; margin-bottom:8px; }
#mc-cta .mc-cta-t b { color:#8fb4ff; }
.mc-join-row { display:flex; gap:8px; }
#mc-email { flex:1; background:#0b1120; border:1px solid #2a3d63; color:#dfe9ff; border-radius:8px;
  padding:9px 11px; font:inherit; font-size:13px; outline:none; }
#mc-email:focus { border-color:#6fb0ff; }
#mc-join { background:linear-gradient(180deg,#2a63c8,#1d3a7e); color:#eef4ff; border:1px solid #6fb0ff;
  border-radius:8px; padding:9px 14px; font:inherit; font-size:13px; font-weight:650; cursor:pointer; white-space:nowrap; }
#mc-join:hover { filter:brightness(1.12); }
#mc-note { font-size:11.5px; color:#6f86b0; margin-top:7px; }
#mc-note.ok { color:#6fe0a0; }
#mc-inrow { display:flex; gap:8px; padding:12px 14px; border-top:1px solid #1b2c4d; }
#mc-in { flex:1; background:#0b1120; border:1px solid #2a3d63; color:#dfe9ff; border-radius:9px;
  padding:10px 12px; font:inherit; font-size:13.5px; outline:none; }
#mc-in:focus { border-color:#6fb0ff; }
#mc-send { background:rgba(111,176,255,0.16); border:1px solid #2a3d63; color:#dfe9ff; border-radius:9px;
  padding:10px 14px; font:inherit; font-size:13.5px; cursor:pointer; }
#mc-send:hover { border-color:#6fb0ff; }
`;

export function mountMockChat(opts: MockChatOpts): () => void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const who = opts.character ? opts.character : 'the Overseer';
  const root = document.createElement('div');
  root.id = 'mc-panel';
  root.innerHTML = `
    <div id="mc-head">
      <span id="mc-dot"></span>
      <span id="mc-who">WOOM · <b>${who}</b></span>
      <button id="mc-leave">← leave</button>
    </div>
    <div id="mc-log"></div>
    <div id="mc-cta">
      <div class="mc-cta-t">Love this? <b>The founding circle is forming now.</b></div>
      <div class="mc-join-row">
        <input id="mc-email" type="email" placeholder="you@domain.com" />
        <button id="mc-join">Claim my spot →</button>
      </div>
      <div id="mc-note"></div>
    </div>
    <div id="mc-inrow">
      <input id="mc-in" type="text" placeholder="say something to your world…" />
      <button id="mc-send">Send</button>
    </div>`;
  document.body.appendChild(root);

  const log = root.querySelector('#mc-log') as HTMLElement;
  const inEl = root.querySelector('#mc-in') as HTMLInputElement;
  const sendEl = root.querySelector('#mc-send') as HTMLButtonElement;
  const ctaEl = root.querySelector('#mc-cta') as HTMLElement;
  const emailEl = root.querySelector('#mc-email') as HTMLInputElement;
  const joinEl = root.querySelector('#mc-join') as HTMLButtonElement;
  const noteEl = root.querySelector('#mc-note') as HTMLElement;

  const scrollDown = (): void => { log.scrollTop = log.scrollHeight; };
  const bubble = (cls: 'mc-agent' | 'mc-user', text: string): void => {
    const el = document.createElement('div');
    el.className = 'mc-msg ' + cls;
    el.textContent = text;
    log.appendChild(el); scrollDown();
  };

  // scripted agent lines — honest mock (it says only what it's programmed to)
  const AGENT: string[] = [
    `That's the spark this world runs on. As you work in real life, your world here grows — rings light up, tools forge themselves, the map fills in around you. What you just said? In WOOM it becomes a place you can walk to.`,
    `Every craft you finish is a building. Every skill you learn is a tool on your belt. Every repo, a territory with your name on it. You don't grind for XP here — your real work IS the XP.`,
    `Keep going and the founding circle will remember you were early. This is a demo of a much bigger world.`,
  ];
  let turn = 0;
  let ctaShown = false;

  const typing = (): HTMLElement => {
    const t = document.createElement('div');
    t.className = 'mc-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(t); scrollDown();
    return t;
  };

  let timers: number[] = [];
  const after = (ms: number, fn: () => void): void => { timers.push(window.setTimeout(fn, ms)); };

  const agentReply = (): void => {
    const t = typing();
    after(900, () => {
      t.remove();
      bubble('mc-agent', AGENT[Math.min(turn, AGENT.length - 1)]!);
      turn++;
      if (!ctaShown) { ctaShown = true; ctaEl.classList.add('show'); scrollDown(); }
    });
  };

  const send = (): void => {
    const text = inEl.value.trim();
    if (!text) return;
    bubble('mc-user', text);
    inEl.value = '';
    agentReply();
  };
  sendEl.addEventListener('click', send);
  inEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); e.stopPropagation(); });

  const join = (): void => {
    const email = emailEl.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      noteEl.className = ''; noteEl.textContent = 'Enter a valid email to claim your spot.';
      return;
    }
    try { localStorage.setItem('woom_waitlist', email); } catch { /* private mode */ }
    opts.onJoin?.(email);
    noteEl.className = 'ok';
    noteEl.textContent = "◎ You're in. We'll open the astral gate for the founding circle soon.";
    emailEl.disabled = true; joinEl.disabled = true; joinEl.textContent = 'Claimed ✓';
  };
  joinEl.addEventListener('click', join);
  emailEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); e.stopPropagation(); });

  const teardown = (): void => {
    for (const id of timers) clearTimeout(id);
    timers = [];
    root.remove(); style.remove();
  };
  (root.querySelector('#mc-leave') as HTMLButtonElement).addEventListener('click', () => { teardown(); opts.onLeave(); });

  // opening greeting from the in-world agent
  after(350, () => bubble('mc-agent',
    `You're inside WOOM${opts.character ? `, ${opts.character}` : ''}. This world is built from your real work — every repo a territory, every skill a tool. Say something to me.`));

  // expose a tiny drive handle for headless verification
  (window as unknown as Record<string, unknown>).__mcSend = (t: string) => { inEl.value = t; send(); };

  return teardown;
}
