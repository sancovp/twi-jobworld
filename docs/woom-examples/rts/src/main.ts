/**
 * EXAMPLES — rts/main.ts — the wiring layer.
 *
 * This file is the ONLY place the layers meet (law 6): it builds a
 * Transport from the URL, feeds an Ingestor, and drives a CanvasView
 * from requestAnimationFrame. There is no logic here — wiring only.
 *
 * URL params (mirroring the donor, matrix runtime):
 *   ?transport=mock                          (default; add &seed=N)
 *   ?transport=sse&url=http://host/events    (CAVE-like SSE)
 *   ?transport=ws&url=ws://host/ws           (websocket)
 */

import { Ingestor } from '../../../ingress/src/Ingestor.js';
import { MockTransport, SseTransport, WsTransport, type Transport } from '../../../ingress/src/Transport.js';
import { CaveTransport } from '../../../ingress/src/CaveTransport.js';
import { CanvasView } from '../../../render/src/CanvasView.js';
import { ThreeView } from '../../../render/src/three/ThreeView.js';
import { biomeFromString } from '../../../render/src/three/biome.js';
import { LoopRunner, type Actor, type ActorFactory, type LoopSpec } from '../../../egress/src/Actor.js';
import { Hud } from './hud.js';
import { Sound } from './sound.js';
import { Minimap } from './minimap.js';
import { MockActorFactory } from '../../../egress/src/MockActor.js';
import { MockResourceProvider, type ResourceProvider } from '../../../egress/src/Resource.js';
import { CaveActorFactory } from '../../../egress/src/CaveActor.js';
import type { Loadout } from '../../../kernel/src/events.js';
import { EventLog, stateHash } from '../../../kernel/src/log.js';
import { mountCreateScreen } from './create.js';

const params = new URLSearchParams(location.search);

const caveUrl = params.get('cave') ?? 'http://localhost:8765';

function buildTransport(): Transport {
  // Real agents (?actors=cave): activity comes from CAVE's /events, adapted.
  if (params.get('actors') === 'cave') return new CaveTransport(caveUrl);
  const kind = params.get('transport') ?? 'mock';
  const url = params.get('url') ?? '';
  switch (kind) {
    case 'sse':
      return new SseTransport(url);
    case 'ws':
      return new WsTransport(url);
    case 'mock':
      return new MockTransport(Number(params.get('seed') ?? '1'));
    default:
      throw new Error(`unknown transport '${kind}'`);
  }
}

const canvas = document.getElementById('world') as HTMLCanvasElement;
const is2d = params.get('view') === '2d';
/** 2D view only: match the drawing buffer to the viewport every frame (some
 *  hosts start 0×0 and never fire 'resize'). The 3D view must NOT go through
 *  here — ThreeView sizes its own buffer at devicePixelRatio; forcing
 *  canvas.width from the host would fight it and drop it back to 1×. */
function fitCanvas(): void {
  if (!is2d) return;
  if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
}

const ingestor = new Ingestor();
// ?replay=<url> → play a recorded log instead of a live transport.
const replayUrl = params.get('replay');
const transport = replayUrl ? null : buildTransport();
// Render seam: both views implement mount(canvas) / draw(state, dtMs).
// 3D is the product view; ?view=2d is the flat debug view.
// ?fsrealm=1 → the graph feeder (?carton=<url>) is also the fsrealm feeder,
// which serves image-object face textures at <origin>/fsrealm/image?node=…;
// hand ThreeView that origin so F3 image boards can load their faces.
const cartonUrlForImages = params.get('carton') ?? '';
const imageBase = params.get('fsrealm') === '1' && cartonUrlForImages
  ? new URL(cartonUrlForImages, location.href).origin
  : '';
// ZONE IDENTITY (DESIGN.md §11d): ?biome=sky (or space/cloud/void/astral)
// reskins the whole world to the deep-space sky-realm; default/absent = meadow
// (today's look). A demo hook onto the biome seam — the real feeder will drive
// it per-root (a dir named 'sky' → biomeForRoot).
const biome = biomeFromString(params.get('biome'));
const view = is2d
  ? new CanvasView()
  : new ThreeView(Number(params.get('zoom') ?? '1'), imageBase, biome);
view.mount(canvas);

const hud = new Hud(transport ? transport.label : `replay(${replayUrl})`);
const sound = new Sound();
// Every real event feeds the HUD ticker, the view's truth channels, and sound.
ingestor.subscribe((e, s) => {
  hud.note(e, s);
  sound.on(e);
  if (view instanceof ThreeView) view.noteEvent(e);
});
if (transport) ingestor.attach(transport);
// ?carton=<url> attaches the graph-object feeder ALONGSIDE the primary
// transport (the Ingestor is multi-feeder by design, DESIGN §4): the
// primary makes territories/agents, carton drips in the objects agents
// made in the graph. Both speak the same HookEvent envelope.
const cartonUrl = params.get('carton');
if (cartonUrl) ingestor.attach(new SseTransport(cartonUrl, 'carton'));

// ─────────────────────────────────────────────────────────────────────────
// HERO WIRING — MockActorFactory by default; ?actors=cave swaps in the real
// CaveActorFactory (POST /cave_agents/{unitId}/send; activity returns via the
// CaveTransport above). unitId MUST equal the CAVE agent name (§4 identity).
// ─────────────────────────────────────────────────────────────────────────
const useCave = params.get('actors') === 'cave';
const caveFactory = useCave ? new CaveActorFactory(caveUrl) : null;
if (caveFactory) void caveFactory.refresh(); // pull the CAVE agent registry
// A process with phases reports them → the phase bar over its unit.
const reportPhase = (id: string, state: { index: number; count: number } | null): void => {
  if (view instanceof ThreeView) view.setPhase(id, state);
};
const actorFactory: ActorFactory =
  caveFactory ?? new MockActorFactory((h) => ingestor.ingestHook(h), reportPhase);

// ── RESOURCE SEAM ── ★ swap MockResourceProvider for a real one here ★
// (e.g. a CaveResourceProvider that reads true token usage — same shape).
// The mock derives context/energy bars from real WorldState counters.
const resourceProvider: ResourceProvider = new MockResourceProvider((id) => ingestor.state.units[id]);
const actors = new Map<string, Actor>();
const loops = new LoopRunner((id) => actors.get(id));

// COMBAT SWING (§1b item 18 COMBAT: TASKS ARE MOBS): shared with
// wirePartyPanel below — true while ANY mob has a live phase-bar fight
// (pullMobs, right below). Lets party members swing too while their party
// is embroiled, reusing the fight signal already polled (no second poll).
let anyMobInCombat = false;

// ── WORLD OF WORKERS (?wow=1) — the woom-SDK workforce (§1b item 10). The
// feeder (feeders/wow/server.py) runs a woom WoomWorld (OM + cave-teams
// core); we POLL its roster and summon each entry as a HERO (loadout
// verbatim — the composer renders identity from it). Polling matters: an
// artifact the player forges via OM and then 'summon's comes ONLINE
// mid-session and must appear. Chat = the normal CaveActor send path.
if (params.get('wow') === '1' && useCave) {
  interface RosterEntry { name: string; label: string; home: string; loadout: Loadout }
  const summoned = new Set<string>();
  const pullRoster = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/wow/roster`)
      .then((r) => r.json())
      .then((roster: RosterEntry[]) => {
        for (const w of roster) {
          if (summoned.has(w.name)) continue;
          summoned.add(w.name);
          rts.summon(w.name, w.label, w.home, w.loadout);
        }
      })
      .catch((err) => console.warn('[wow] roster fetch failed:', err));
  };
  pullRoster();
  setInterval(pullRoster, 8000);

  // Quest tracker (item 16 early rungs) — poll the feeder's derived
  // questline (pure fold, no stored progress) into the right-rail plate.
  const tracker = document.getElementById('quest-tracker') as HTMLElement;
  interface QuestStep { id: string; name: string; hint: string; state: 'done' | 'current' | 'ahead' | 'locked' }
  const glyph: Record<QuestStep['state'], string> = { done: '✓', current: '▸', ahead: '·', locked: '🔒' };
  const pullQuestline = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/wow/questline`)
      .then((r) => r.json())
      .then((steps: QuestStep[]) => {
        const done = steps.filter((s) => s.state === 'done').length;
        let html = `<div class="qt-title">⚑ THE PATH TO BRING ONLINE ${done}/${steps.length}</div>`;
        for (const s of steps) {
          html += `<div class="qt-step ${s.state}">${glyph[s.state]} ${s.name}</div>`;
          if (s.state === 'current') html += `<div class="qt-hint">${s.hint}</div>`;
        }
        tracker.innerHTML = html;
        tracker.hidden = false;
      })
      .catch(() => { tracker.hidden = true; });
  };
  pullQuestline();
  setInterval(pullQuestline, 10000);

  // §1b item 18 (COMBAT: TASKS ARE MOBS) — mob HP poll. HP display reuses
  // the EXISTING phase bar (zero kernel/render change): a mob's damage/
  // subtasks IS a PhaseState. Mobs already reach the browser as units over
  // the normal CAVE envelope (agent_registered -> spawn, move -> territory,
  // message on hit/kill) via the roster-independent /events stream — this
  // poll ALSO tells the view which CREATURE_TOPOLOGY entry the unit id IS
  // (setCreatureName — the kernel's unit_spawned carries only the CAVE agent
  // slug, e.g. "mob-legacy-golem-s1-3", never "Legacy Golem"; render layer
  // L3b, ThreeView.ts) + drives the HP bar + clears it (and despawns the
  // figure, after a death-crumple grace window) when a mob is no longer in
  // the feeder's living-mob list.
  interface MobEntry { id: string; name: string; territory: string; damage: number; subtasks: number; boss: boolean }
  let lastLiveMobs = new Set<string>();
  const pullMobs = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/wow/mobs`)
      .then((r) => r.json())
      .then((mobs: MobEntry[]) => {
        const liveNow = new Set(mobs.map((m) => m.id));
        for (const m of mobs) {
          if (view instanceof ThreeView) {
            view.setPhase(m.id, { index: m.damage, count: m.subtasks });
            view.setCreatureName(m.id, m.name);
            // COMBAT SWING (§1b item 18): a live mob IS an active encounter —
            // the same phase-bar signal drives the swing overlay.
            view.setCombat(m.id, true);
          }
        }
        // A mob that vanished since the last poll died (or was never seen
        // again) — mark it dying (render-layer crumple staging, zero kernel
        // change) BEFORE firing unit_dismissed, clear its bar, and let the
        // figure leave the world once the crumple plays out (the kernel
        // event itself is still the ONLY thing that removes the unit from
        // WorldState; see world.ts's `unit_dismissed` case).
        for (const id of lastLiveMobs) {
          if (!liveNow.has(id)) {
            if (view instanceof ThreeView) { view.markDying(id); view.setPhase(id, null); view.setCombat(id, false); }
            ingestor.ingestDraft({ type: 'unit_dismissed', unitId: id });
          }
        }
        lastLiveMobs = liveNow;
        anyMobInCombat = liveNow.size > 0;
      })
      .catch((err) => console.warn('[wow] mobs fetch failed:', err));
  };
  pullMobs();
  setInterval(pullMobs, 5000);

  // 9e THE LEVELING WARDROBE — worker levels drive VISIBLE body upgrades:
  // crossing the veteran threshold swaps the worker onto the DRESSED scout
  // body (setCreatureName sheds the old GLB and reloads — the same
  // presentation-map discipline as the mob names; zero kernel change).
  const VETERAN_LEVEL = 3;
  const veteranWorn = new Set<string>();
  const pullLevels = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/wow/levels`)
      .then((r) => r.json())
      .then((levels: Record<string, number>) => {
        for (const [name, level] of Object.entries(levels)) {
          if (level >= VETERAN_LEVEL && !veteranWorn.has(name)) {
            veteranWorn.add(name);
            if (view instanceof ThreeView) view.setCreatureName(name, 'Human Veteran');
          }
        }
      })
      .catch(() => { /* feeder variants without /wow/levels — no wardrobe */ });
  };
  pullLevels();
  setInterval(pullLevels, 5000);

  // §1b item 24 — THE DUNGEON LOOP (docs/DUNGEON-LOOP-SPEC.md). The LOOT
  // panel polls the feeder's standing decision offers (spec §3: loot =
  // options, the deliberate-promotion surface); clicking one OPENS a decode
  // encounter (spec §4) — a conversation panel whose phase readout mirrors
  // the encounter mob's HP bar (already rendered by the pullMobs poll, zero
  // new render). The player's sends are the ONLY thing that invokes the
  // decoder (player-fired law); CHECK/RE-DERIVED walk the remaining stages.
  const base = caveUrl.replace(/\/$/, '');
  const lootPanel = document.getElementById('loot-panel') as HTMLElement;
  const lootList = document.getElementById('loot-list') as HTMLElement;
  const encPanel = document.getElementById('enc-panel') as HTMLElement;
  const encTitle = document.getElementById('enc-title') as HTMLElement;
  const encPhases = document.getElementById('enc-phases') as HTMLElement;
  const encTranscript = document.getElementById('enc-transcript') as HTMLElement;
  const encInput = document.getElementById('enc-input') as HTMLInputElement;
  let encId: string | null = null;

  interface EncState { id: string; target: string; phase: number; phases: string[]; status: string;
    transcript: Array<{ who: string; text: string }>; bundle: Record<string, unknown> }
  const renderEncounter = (enc: EncState): void => {
    encId = enc.id;
    encTitle.textContent = `⚔ DECODE: ${enc.target} — ${enc.status}`;
    encPhases.innerHTML = enc.phases.map((p, i) =>
      `<span class="${i < enc.phase ? 'done' : ''}">${i < enc.phase ? '✓' : '·'} ${p}</span>`).join(' → ');
    encTranscript.innerHTML = enc.transcript.map((t) =>
      `<div class="t-${t.who}">${t.who === 'player' ? '➤' : t.who === 'gate' ? '⛨' : '✶'} ${t.text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('');
    encTranscript.scrollTop = encTranscript.scrollHeight;
    encPanel.hidden = false;
  };
  const refreshEncounter = (): void => {
    if (!encId) return;
    fetch(`${base}/wow/encounter/${encId}`).then((r) => r.json())
      .then((enc: EncState) => renderEncounter(enc))
      .catch((err) => console.warn('[loot] encounter fetch failed:', err));
  };
  const pullLoot = (): void => {
    fetch(`${base}/wow/loot`).then((r) => r.json())
      .then((data: { offers: Array<{ id: string; label: string }>; encounters: Array<{ id: string; target: string; phase: number; status: string }> }) => {
        const open = data.encounters.filter((e) => e.status === 'open');
        if (!data.offers.length && !open.length) { lootPanel.hidden = true; return; }
        let html = '';
        for (const e of open) html += `<div class="lp-enc" data-enc="${e.id}">⚔ ${e.target} — phase ${e.phase}/4 (resume)</div>`;
        for (const o of data.offers) html += `<div class="lp-offer" data-offer="${o.id}">◈ ${o.label}</div>`;
        lootList.innerHTML = html;
        lootPanel.hidden = false;
      })
      .catch(() => { lootPanel.hidden = true; });
  };
  lootList.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const offer = t.getAttribute('data-offer');
    const enc = t.getAttribute('data-enc');
    if (offer) {
      fetch(`${base}/wow/encounter/open`, { method: 'POST', body: JSON.stringify({ offer }) })
        .then((r) => r.json())
        .then((res: { opened?: string; error?: string }) => {
          if (res.error) { toast(`✗ ${res.error}`); return; }
          encId = res.opened!;
          toast(`⚔ encounter opened — speak to your agent`);
          refreshEncounter();
          pullLoot();
        });
    } else if (enc) { encId = enc; refreshEncounter(); }
  });
  encInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { encPanel.hidden = true; encInput.blur(); return; }
    if (e.key !== 'Enter' || !encId) return;
    const msg = encInput.value.trim();
    if (!msg) return;
    encInput.value = '';
    fetch(`${base}/wow/encounter/${encId}/say`, { method: 'POST', body: JSON.stringify({ message: msg }) })
      .then((r) => r.json()).then(() => { refreshEncounter(); pullMobs(); });
  });
  document.getElementById('enc-check')?.addEventListener('click', () => {
    if (!encId) return;
    fetch(`${base}/wow/encounter/${encId}/check`, { method: 'POST', body: '{}' })
      .then((r) => r.json())
      .then((res: { error?: string; registered?: string }) => {
        if (res.error) toast(`✗ check: ${res.error}`);
        else toast(`✓ CHECK GREEN — ${res.registered} registered (vite reloads on the JSON write)`);
        refreshEncounter(); pullMobs();
      });
  });
  document.getElementById('enc-rederive')?.addEventListener('click', () => {
    if (!encId) return;
    fetch(`${base}/wow/encounter/${encId}/rederived`, { method: 'POST', body: '{}' })
      .then((r) => r.json())
      .then((res: { error?: string; status?: string }) => {
        if (res.error) toast(`✗ ${res.error}`);
        else toast('☠ the encounter collapses to its artifact — KILL');
        refreshEncounter(); pullMobs(); pullLoot();
      });
  });
  document.getElementById('enc-bundle')?.addEventListener('click', () => {
    if (!encId) return;
    fetch(`${base}/wow/encounter/${encId}`).then((r) => r.json())
      .then((enc: EncState) => {
        console.log('[loot] BUNDLE for', enc.target, enc.bundle);
        toast('bundle → console (route it to your agent — the player-fired collapse)');
      });
  });
  document.getElementById('enc-close')?.addEventListener('click', () => { encPanel.hidden = true; });
  pullLoot();
  setInterval(pullLoot, 9000);
}

// ─────────────────────────────────────────────────────────────────────────
// item 27/29 (H1 RESOLVED) — THE PARTY PANEL + PLAYER EMBODIMENT. Placed
// AFTER the shared chat-bar/ctx-menu declarations below (needs chatBar/
// chatTo/chatInput/openChat/closeChat/ctxTarget/closeCtxMenu, all module-
// scope `const`/`function` declared further down this file) — gated the
// same way (`params.get('wow') === '1'`) rather than living inside the
// earlier wow=1 block, which runs before those declarations exist.
// ─────────────────────────────────────────────────────────────────────────
function wirePartyPanel(base: string): void {
  // Polls the wow feeder's derived party state (GET /wow/party) and: (a)
  // renders the roster (click a member to re-embody — the "select-to-
  // switch = seize a companion" verb), (b) tags every partied hero's
  // figure for the mirror-character render mode (ThreeView.setPartyMember
  // — a pure presentation tag, same discipline as setCreatureName), (c)
  // labels who you're currently embodied as.
  const partyPanel = document.getElementById('party-panel') as HTMLElement;
  const partyList = document.getElementById('party-list') as HTMLElement;
  const partyEmbodiedLabel = document.getElementById('party-embodied-label') as HTMLElement;
  interface PartyState { roster: string[]; embodied: string; player_main: string }
  let lastPartyRoster = new Set<string>();
  let currentEmbodied = 'player';
  const pullParty = (): void => {
    fetch(`${base}/wow/party`).then((r) => r.json())
      .then((p: PartyState) => {
        currentEmbodied = p.embodied;
        partyEmbodiedLabel.textContent = p.embodied === p.player_main ? 'you' : p.embodied;
        if (view instanceof ThreeView) {
          // Clear the mirror-ring off anyone who left, tag everyone still in.
          for (const id of lastPartyRoster) if (!p.roster.includes(id)) view.setPartyMember(id, false);
          for (const id of p.roster) view.setPartyMember(id, true);
          // COMBAT SWING (§1b item 18): party members swing too while their
          // party is embroiled — gated on the mob-fight signal pullMobs
          // already polls (anyMobInCombat), never a second network poll.
          for (const id of lastPartyRoster) if (!p.roster.includes(id)) view.setCombat(id, false);
          for (const id of p.roster) view.setCombat(id, anyMobInCombat);
        }
        lastPartyRoster = new Set(p.roster);
        if (p.roster.length === 0) { partyPanel.hidden = true; return; }
        partyList.innerHTML = p.roster.map((name) => {
          const label = ingestor.state.units[name]?.label ?? name;
          const embodied = name === p.embodied;
          return `<div class="pp-member${embodied ? ' pp-embodied' : ''}" data-member="${name}">${label}${embodied ? ' <span class="pp-embodied-tag">◉ embodied</span>' : ''}</div>`;
        }).join('');
        partyPanel.hidden = false;
      })
      .catch(() => { partyPanel.hidden = true; });
  };
  partyList.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const member = t.closest('[data-member]')?.getAttribute('data-member');
    if (!member) return;
    fetch(`${base}/wow/party/embody`, { method: 'POST', body: JSON.stringify({ name: member }) })
      .then((r) => r.json())
      .then((res: { ok: boolean; reason: string }) => {
        toast(res.ok ? `⇄ ${res.reason}` : `✗ ${res.reason}`);
        pullParty();
      });
  });
  pullParty();
  setInterval(pullParty, 6000);

  // The three party ctx-menu verbs (RECRUIT/EMBODY/TARGET).
  document.getElementById('ctx-recruit')?.addEventListener('click', () => {
    if (!ctxTarget) return;
    fetch(`${base}/wow/party/recruit`, { method: 'POST', body: JSON.stringify({ name: ctxTarget }) })
      .then((r) => r.json())
      .then((res: { ok: boolean; reason: string }) => {
        toast(res.ok ? `⚑ ${res.reason}` : `✗ ${res.reason}`);
        pullParty();
      });
    closeCtxMenu();
  });
  document.getElementById('ctx-embody')?.addEventListener('click', () => {
    if (!ctxTarget) return;
    fetch(`${base}/wow/party/embody`, { method: 'POST', body: JSON.stringify({ name: ctxTarget }) })
      .then((r) => r.json())
      .then((res: { ok: boolean; reason: string }) => {
        toast(res.ok ? `⇄ ${res.reason}` : `✗ ${res.reason}`);
        pullParty();
      });
    closeCtxMenu();
  });
  // TARGET → PROMPT (the embodiment mechanic's deliberate act): the ctx
  // target becomes the bundle's subject; typing happens in the SAME chat
  // bar (openChat) but the send goes to /wow/party/target, not rts.send —
  // the feeder resolves WHO actually receives it (whoever you're embodied
  // as), never the clicked unit itself (that's the whole point: you point
  // at the WORLD, the prompt goes to your MIND, not to the target).
  const WORKERS_SET = new Set(['fettle', 'brindle', 'moss']);
  let targetKind: 'mob' | 'building' | 'worker' | 'drop' | null = null;
  document.getElementById('ctx-target')?.addEventListener('click', () => {
    if (!ctxTarget) return;
    targetKind = WORKERS_SET.has(ctxTarget) ? 'worker' : 'mob';
    openChat(ctxTarget, 'chat');
    chatTo.textContent = `◎ target → ${currentEmbodied === 'player' ? '(embody an agent first)' : currentEmbodied}`;
    closeCtxMenu();
  });
  // Capture-phase listener fires BEFORE the ordinary chat-bar Enter handler
  // (registered earlier, bubble-phase) — stopImmediatePropagation prevents
  // a double-send when this WAS a target-prompt open. Any other chat open
  // (a plain ctx-chat/Enter-hotkey open) leaves targetKind null, so this
  // listener no-ops and the ordinary handler runs untouched.
  chatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !targetKind || !chatTarget) return;
    const text = chatInput.value.trim();
    if (!text) return;
    e.stopImmediatePropagation();
    const kind = targetKind;
    const name = chatTarget;
    fetch(`${base}/wow/party/target`, {
      method: 'POST',
      body: JSON.stringify({ kind, name, text }),
    }).then((r) => r.json()).then((res: { error?: string; sent_to?: string; reply?: string | null }) => {
      if (res.error) toast(`✗ ${res.error}`);
      else toast(`◎ sent to ${res.sent_to}${res.reply ? ' — reply in chat' : ''}`);
    });
    targetKind = null;
    closeChat();
  }, { capture: true });
}


// ── FS-REALM (?fsrealm=1) — a REAL directory tree as the world (REALM-
// ONTOLOGY §4). The feeder (feeders/fsrealm/server.py) walks a --root dir:
// its /events emits the buildings/items (CAVE envelope, ensureBuilding via
// custodian mkdir/move) and its /graph/events emits portals + image objects
// (C7 graph_object, ridden on 'monument' with a name prefix the ThreeView
// reads). The INHABITANTS (.heaven/agents/*) come via /fsrealm/roster —
// polled + summoned exactly like ?wow=1's /wow/roster (→ hero_summoned).
// Requires ?actors=cave&cave=<feeder>&carton=<feeder>/graph/events, same as wow.
if (params.get('fsrealm') === '1' && useCave) {
  interface RealmHero { name: string; label: string; home: string; loadout: Loadout }
  const summonedFs = new Set<string>();
  const pullRealmRoster = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/fsrealm/roster`)
      .then((r) => r.json())
      .then((roster: RealmHero[]) => {
        for (const h of roster) {
          if (summonedFs.has(h.name)) continue;
          summonedFs.add(h.name);
          rts.summon(h.name, h.label, h.home, h.loadout);
        }
      })
      .catch((err) => console.warn('[fsrealm] roster fetch failed:', err));
  };
  pullRealmRoster();
  setInterval(pullRealmRoster, 8000);
}

// ── GOD MODE (?god=1) — the astral space (§1b item 19; train §66) ─────────
// Poll the god feeder's /god/astral and:
//   1. feed each world-system's territory + its leaf members a band via
//      ThreeView.setTerritoryBand (pure presentation data — no kernel touch,
//      the SAME pattern kindOf() below already uses for minimap color).
//   2. render the right-rail "YOUR WORLD-SYSTEMS" plate (name/grouping/band),
//      with a MATERIALIZE button (POST /god/materialize) and a DESCEND
//      button (the EXISTING C9 `enter()`, once the world-system's territory
//      is visible at the astral root).
// The god feeder's units land on the SAME CaveTransport/graph_object wires
// as wow (agent_registered/move) — ?god=1 requires ?actors=cave&cave=<god
// feeder URL>, exactly like ?wow=1 requires cave for its roster.
let lastAstralListing: Array<{ id: string; name: string; grouping: string; band: 'sanctuary' | 'astral' | 'wasteland'; score: number; members: string[]; path: string }> = [];
if (params.get('god') === '1' && useCave) {
  const godPanel = document.getElementById('god-panel') as HTMLElement;
  const godList = document.getElementById('god-list') as HTMLElement;
  const pullAstral = (): void => {
    fetch(`${caveUrl.replace(/\/$/, '')}/god/astral`)
      .then((r) => r.json())
      .then((specs: typeof lastAstralListing) => {
        lastAstralListing = specs;
        if (view instanceof ThreeView) {
          for (const spec of specs) {
            view.setTerritoryBand(spec.path, spec.band);
            // Leaf members render one level under the world-system's own
            // territory — same band as their parent (a member doesn't carry
            // its own independent grade in v1; the world-system does).
            for (const member of spec.members) {
              if (specs.some((s) => s.id === member)) continue; // a compound child, not a leaf path
              view.setTerritoryBand(`${spec.path}/${member.split('/').pop()}`, spec.band);
            }
          }
        }
        godPanel.hidden = false;
        godList.innerHTML = specs
          .map((s) => {
            const canMaterialize = s.band !== 'wasteland';
            return `<div class="gp-spec ${s.band}" data-path="${s.path}">
              <div class="gp-name" data-enter="${s.path}">${s.name}</div>
              <div class="gp-meta">${s.grouping} · ${s.band} (${s.score})</div>
              <button data-materialize="${s.id}" ${canMaterialize ? '' : 'disabled'}>MATERIALIZE</button>
            </div>`;
          })
          .join('');
      })
      .catch((err) => console.warn('[god] astral fetch failed:', err));
  };
  pullAstral();
  setInterval(pullAstral, 6000);

  godList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const enterPath = target.dataset.enter;
    if (enterPath && view instanceof ThreeView) {
      view.navigateRoot(enterPath); // descend into this world-system (C9)
      view.setCameraMode('rts');
      return;
    }
    const specId = target.dataset.materialize;
    if (specId) {
      fetch(`${caveUrl.replace(/\/$/, '')}/god/materialize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec_id: specId }),
      })
        .then((r) => r.json())
        .then((res: { passed: boolean; band: string; reason: string }) => {
          toast(res.passed ? `✦ materialized — ${res.reason}` : `✗ refused — ${res.reason}`);
        })
        .catch((err) => console.warn('[god] materialize failed:', err));
    }
  });

  // G — cycle GOD (astral root) <-> the existing RTS <-> character. GOD
  // mode re-roots the view to '/' (the astral root, above every world-
  // system) and drops to the free RTS-style camera (no MapControls change,
  // per the brief — a thin addition over the built setCameraMode). `toast`
  // and `playerId` are declared further below (item 1's char-create block);
  // both are read here only inside this callback, which fires long after
  // module init, so the forward reference is safe (closures over the
  // module-scope bindings, not a value snapshot at attach-time).
  addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key.toLowerCase() !== 'g') return;
    if (!(view instanceof ThreeView)) return;
    if (view.cameraMode === 'god') {
      view.setCameraMode('rts');
      toast('OVERSEER view — G = god · C = character (with a player)');
    } else {
      view.navigateRoot('/'); // the astral root, above ALL world-systems
      view.setCameraMode('god');
      toast('GOD MODE — the astral space. Double-click a lit world to descend.');
    }
  });
}

/**
 * Operator console API — drive heroes from devtools (UI comes later):
 *
 *   rts.summon('hero-x', 'Ariadne', '/repo', {
 *     systemPrompt: 'You are Ariadne…', skills: ['flowmine'], mcps: ['carton'] })
 *   rts.send('hero-x', 'survey the repo')
 *   rts.setLoop('hero-x', { prompt: 'patrol {dir}', everyMs: 8000, args: { dir: '/repo' } })
 *   rts.setLoop('hero-x', null)   // stop the loop
 */
const rts = {
  summon(unitId: string, label: string, home: string, loadout: Loadout): void {
    ingestor.ingestDraft({ type: 'hero_summoned', unitId, home, label, loadout });
    actors.set(unitId, actorFactory.summon({ unitId, label, home, loadout }));
  },
  send(unitId: string, prompt: string): void {
    ingestor.ingestDraft({ type: 'command_issued', unitId, command: prompt, issuer: 'operator' });
    const actor = actors.get(unitId);
    if (!actor) {
      console.warn(`[rts] no actor for '${unitId}' — summon first`);
      return;
    }
    void actor.run(prompt).catch((err) => console.warn(`[rts:${unitId}]`, err));
  },
  setLoop(unitId: string, spec: LoopSpec | null): void {
    loops.setLoop(unitId, spec);
  },
  dismiss(unitId: string): void {
    loops.setLoop(unitId, null);
    actors.get(unitId)?.dispose();
    actors.delete(unitId);
    ingestor.ingestDraft({ type: 'unit_dismissed', unitId });
  },
  /** GEARSPEC (STYLE-DESIGN-SPACE §4.6–7): equip a hero with a validated
   *  paper-doll spec (null strips back to the hash-derived look). View-side
   *  only — a values-only override after the composer; refusals return the
   *  gate's reason (the same STRICT validator the woom-edit lane mirrors).
   *  e.g. rts.equip('hero-1', { head: { kind: 'crown' }, back: { cloak: 1 },
   *       held_main: { kind: 'blade', skill: 'flowmine' }, chest: { tintHue: 0 } }) */
  equip(unitId: string, gear: unknown): { ok: boolean; reason?: string } {
    if (!(view instanceof ThreeView)) return { ok: false, reason: 'gear renders in the 3D view only' };
    const verdict = view.setGear(unitId, gear as never);
    if (!verdict.ok) console.warn(`[rts] gear REFUSED for '${unitId}': ${verdict.reason}`);
    return verdict;
  },
  /** Download the current event log as JSONL (§6 save). */
  exportLog(): void {
    const blob = new Blob([ingestor.log.toJsonl()], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `overseer-session.jsonl`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  /** THE RESTART VERB (DUNGEON-LOOP-SPEC §7 — a legal in-fiction move, safe
   *  because law-4 determinism + log replay restore the world): stash the
   *  event log + its state hash, reload with ?replay=local. The boot path
   *  verifies hash equality via the KERNEL replay (the determinism audit's
   *  own mechanism) — a restart provably loses nothing. */
  restart(): void {
    localStorage.setItem('rts-restart-log', ingestor.log.toJsonl());
    localStorage.setItem('rts-restart-hash', stateHash(ingestor.state));
    const url = new URL(location.href);
    url.searchParams.set('replay', 'local');
    url.searchParams.set('create', '0');
    location.href = url.toString();
  },
  /** Play a recorded JSONL log into this world, paced by tick deltas (§6). */
  replay(jsonl: string, speed = 1): void {
    const events = jsonl.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
    let i = 0;
    let prevTick = 0;
    const step = (): void => {
      if (i >= events.length) return;
      const e = events[i++];
      if (!e) return;
      const { seq: _s, tick, ...draft } = e as { seq?: number; tick?: number };
      ingestor.ingestDraft(draft as never);
      const delay = Math.min(1200, Math.max(0, ((tick ?? prevTick) - prevTick) * 100)) / speed;
      prevTick = tick ?? prevTick;
      setTimeout(step, delay);
    };
    step();
  },
  /** THE phase-bar API: give a process (unit id, or a graph-object nodeId) its
   *  phase and update it; null clears. A bar shows ONLY for ids set here. */
  setPhase(id: string, index: number | null, count = 1): void {
    if (view instanceof ThreeView) view.setPhase(id, index === null ? null : { index, count });
  },
  ingestor,
  view,
};
declare global {
  interface Window {
    rts: typeof rts;
  }
}
window.rts = rts;

// ─────────────────────────────────────────────────────────────────────────
// SELECTION + COMMAND CARD — click a unit, give it a mission (the game part).
// Drag = camera (MapControls); a sub-5px press-release = a click/pick.
// ─────────────────────────────────────────────────────────────────────────
let selectedId: string | null = null;
let selectedIds: string[] = [];
const card = document.getElementById('command-card') as HTMLElement;
const cardName = document.getElementById('card-name') as HTMLElement;
const cardStatus = document.getElementById('card-status') as HTMLElement;
const cardLoadout = document.getElementById('card-loadout') as HTMLElement;
const cardMission = document.getElementById('card-mission') as HTMLElement;
const cardInput = document.getElementById('card-input') as HTMLInputElement;

function select(id: string | null): void {
  selectedId = id;
  selectedIds = id ? [id] : [];
  if (view instanceof ThreeView) {
    view.setSelected(id);
    // Acknowledging a distressed unit quiets its minimap sonar (the operator
    // is "on it") — but the fire keeps burning until the block actually clears.
    if (id) view.acknowledgeDistress(id);
  }
  card.hidden = id === null;
  if (id) sound.click();
  refreshCard();
  post({ selected: id }); // §1b item 5 — shell intent on (de)select
}

/** Multi-select (drag-select): rings on all, command card shows the count. */
function selectMany(ids: string[]): void {
  selectedIds = ids;
  selectedId = ids[0] ?? null;
  if (view instanceof ThreeView) view.setSelectedSet(ids);
  card.hidden = ids.length === 0;
  if (ids.length) sound.click();
  refreshCard();
}

// ── Minimap (3D view only) ────────────────────────────────────────────────
const kindOf = (path: string): string => ingestor.state.buildings[path]?.kind ?? 'code';
const minimap =
  view instanceof ThreeView
    ? new Minimap(document.getElementById('minimap') as HTMLCanvasElement, view, kindOf)
    : null;
let lastMinimap = 0;

// ── SOS alert banner (top-center) — one line while any unit is blocked ────
const alertEl = document.getElementById('hud-alert') as HTMLElement;
function updateAlert(): void {
  if (!(view instanceof ThreeView)) return;
  const rep = view.distressReport();
  if (rep.length === 0) {
    alertEl.hidden = true;
    return;
  }
  const names = rep
    .map((d) => (ingestor.state.units[d.unitId]?.label ?? d.unitId) + (d.acknowledged ? ' ✓' : ''))
    .join(', ');
  alertEl.hidden = false;
  alertEl.textContent = `⚠ ${rep.length} BLOCKED — ${names}`;
}

// ── Pause menu (Esc when nothing is selected) ─────────────────────────────
const pauseMenu = document.getElementById('pause-menu') as HTMLElement;
const muteBtn = document.getElementById('pause-mute') as HTMLButtonElement;
muteBtn.textContent = `SOUND: ${sound.isMuted ? 'OFF' : 'ON'}`;
function togglePause(show?: boolean): void {
  pauseMenu.hidden = show === undefined ? !pauseMenu.hidden : !show;
}
document.getElementById('menu-btn')?.addEventListener('click', () => togglePause(true));
document.getElementById('pause-resume')?.addEventListener('click', () => togglePause(false));
document.getElementById('pause-recenter')?.addEventListener('click', () => {
  if (view instanceof ThreeView) view.recenter();
  togglePause(false);
});
muteBtn.addEventListener('click', () => {
  const muted = sound.toggleMute();
  muteBtn.textContent = `SOUND: ${muted ? 'OFF' : 'ON'}`;
});

// ─────────────────────────────────────────────────────────────────────────
// WoW LAYER (§1b items 1–6): create → enter → walk up to an agent →
// right-click → talk. Zero kernel change — the player is an ordinary
// hero_summoned whose walkabout is presentational (ThreeView-side).
// ─────────────────────────────────────────────────────────────────────────

/** The postMessage seam (§1b item 5) — the ONLY frame↔shell bridge; state
 *  coheres via the servers, not the frames. Mirrors the C9 onionRoot post. */
function post(msg: Record<string, unknown>): void {
  try {
    window.parent?.postMessage(msg, '*');
  } catch {
    /* standalone — no host */
  }
}

const toastEl = document.getElementById('toast') as HTMLElement;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(text: string): void {
  toastEl.textContent = text;
  toastEl.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 1800);
}

let playerId: string | null = null;
/** "Walk up to them" (§1b): interact gate in character view, world units. */
const INTERACT_RANGE = 16;

function setCamera(mode: 'rts' | 'follow'): void {
  if (!(view instanceof ThreeView)) return;
  view.setCameraMode(mode);
  toast(mode === 'follow' ? 'CHARACTER view — WASD walk · C = command view' : 'COMMAND view — C = character view');
}

// Item 1 — char-create at boot. ?create=0 skips (automation), replay skips.
if (view instanceof ThreeView && params.get('create') !== '0' && !replayUrl) {
  mountCreateScreen({
    onEnter: ({ name, loadout }) => {
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';
      playerId = id;
      rts.summon(id, name, '/', loadout); // the SAME hero_summoned as any hero
      if (view instanceof ThreeView) view.setPlayerUnit(id);
      setCamera('follow');
      post({ entered: true, unitId: id });
    },
    onSkip: () => {
      /* classic RTS — the overseer altitude */
    },
  });
}

// Item 2 — WASD held-key tracking → presentational movement (fed to the view
// once per frame below). Typing in any input never leaks into world keys.
const held = new Set<string>();
const isTyping = (e: KeyboardEvent): boolean =>
  e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

// Item 6 — the chat bar. Sending goes through rts.send → Actor.run, which
// with ?actors=cave IS `POST /cave_agents/{unitId}/send {message}` (§4).
const chatBar = document.getElementById('chat-bar') as HTMLElement;
const chatTo = document.getElementById('chat-to') as HTMLElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
let chatTarget: string | null = null;
function openChat(unitId: string, mode: 'chat' | 'task'): void {
  chatTarget = unitId;
  const label = ingestor.state.units[unitId]?.label ?? unitId;
  chatTo.textContent = mode === 'task' ? `⚑ task → ${label}` : `💬 to ${label}`;
  chatInput.placeholder = mode === 'task' ? 'Assign a task… (Enter sends · Esc closes)' : 'Say something… (Enter sends · Esc closes)';
  chatBar.hidden = false;
  chatInput.focus();
}
function closeChat(): void {
  chatBar.hidden = true;
  chatTarget = null;
  chatInput.value = '';
  chatInput.blur();
}
chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation(); // typing must not trigger world hotkeys
  if (e.key === 'Escape') closeChat();
  if (e.key !== 'Enter') return;
  const text = chatInput.value.trim();
  if (!text || !chatTarget) return;
  rts.send(chatTarget, text);
  post({ interact: true, unitId: chatTarget, action: 'chat', text });
  closeChat();
});

// Item 4 — the unit context menu {CHAT · ASSIGN TASK · SHEET}.
const ctxMenu = document.getElementById('ctx-menu') as HTMLElement;
const ctxTitle = document.getElementById('ctx-title') as HTMLElement;
let ctxTarget: string | null = null;
function openCtxMenu(x: number, y: number, unitId: string): void {
  ctxTarget = unitId;
  ctxTitle.textContent = ingestor.state.units[unitId]?.label ?? unitId;
  ctxMenu.style.left = `${Math.min(x, innerWidth - 170)}px`;
  ctxMenu.style.top = `${Math.min(y, innerHeight - 150)}px`;
  ctxMenu.hidden = false;
}
function closeCtxMenu(): void {
  ctxMenu.hidden = true;
  ctxTarget = null;
}
document.getElementById('ctx-chat')?.addEventListener('click', () => {
  if (ctxTarget) openChat(ctxTarget, 'chat');
  closeCtxMenu();
});
document.getElementById('ctx-task')?.addEventListener('click', () => {
  if (ctxTarget) openChat(ctxTarget, 'task');
  closeCtxMenu();
});
document.getElementById('ctx-sheet')?.addEventListener('click', () => {
  if (ctxTarget) {
    // The sheet lives in the SHELL (§1b composition) — the seam carries it.
    post({ interact: true, unitId: ctxTarget, action: 'sheet' });
    if (window.parent === window) toast('sheet opens in the shell (OM/OPERA host) — none attached');
  }
  closeCtxMenu();
});
// item 27/29 (H1) — wire the party panel + its ctx-menu verbs now that
// chatBar/chatTo/chatInput/openChat/closeChat/ctxTarget/closeCtxMenu (all
// referenced inside wirePartyPanel, defined earlier in this file) are
// initialized. Gated identically to the roster/loot/quest wow=1 blocks above.
if (params.get('wow') === '1' && useCave) wirePartyPanel(caveUrl.replace(/\/$/, ''));
addEventListener('pointerdown', (e) => {
  if (!ctxMenu.hidden && !(e.target instanceof Node && ctxMenu.contains(e.target))) closeCtxMenu();
});

addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  const k = e.key.toLowerCase();
  if (k.length === 1 && 'wasdqe'.includes(k)) held.add(k);
  // Item 3 — C toggles command ↔ character altitude (needs a player).
  if (k === 'c' && playerId && view instanceof ThreeView) {
    setCamera(view.cameraMode === 'rts' ? 'follow' : 'rts');
  }
  // Item 6 — Enter = chat hotkey to the selected unit.
  if (e.key === 'Enter' && selectedId && chatBar.hidden && selectedId !== playerId) {
    e.preventDefault();
    openChat(selectedId, 'chat');
  }
});
addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
addEventListener('blur', () => held.clear());

const cardResources = document.getElementById('card-resources') as HTMLElement;

/** Render a unit's resources (from the ResourceProvider seam) as small bars. */
function renderResources(unitId: string | null): void {
  if (!unitId) {
    cardResources.innerHTML = '';
    return;
  }
  const res = resourceProvider.resources(unitId);
  cardResources.innerHTML = res
    .map((r) => {
      const hue = r.hue ?? 150;
      if (r.max === undefined) {
        return `<span class="res-count">${r.name} ${Math.round(r.value)}</span>`;
      }
      const pct = Math.max(0, Math.min(100, (r.value / r.max) * 100));
      const label = r.max >= 1000 ? `${(r.value / 1000).toFixed(0)}k/${(r.max / 1000).toFixed(0)}k` : `${Math.round(r.value)}/${r.max}`;
      return `<span class="res-bar"><span class="res-name">${r.name}</span><span class="res-track"><span class="res-fill" style="width:${pct}%;background:hsl(${hue},70%,55%)"></span></span><span class="res-val">${label}</span></span>`;
    })
    .join('');
}

function refreshCard(): void {
  if (!selectedId) return;
  if (selectedIds.length > 1) {
    cardName.textContent = `${selectedIds.length} units selected`;
    cardStatus.textContent = selectedIds.map((id) => ingestor.state.units[id]?.label ?? id).join(', ').slice(0, 80);
    cardLoadout.textContent = 'a mission is sent to all selected';
    cardMission.textContent = '';
    renderResources(null);
    return;
  }
  const u = ingestor.state.units[selectedId];
  if (!u) {
    select(null);
    return;
  }
  cardName.textContent = `${u.loadout ? '★ ' : ''}${u.label}`;
  cardStatus.textContent = `${u.status}${u.tool ? ` [${u.tool}]` : ''} · at ${u.at} · ✎${u.edits} ⚠${u.errors}`;
  cardLoadout.textContent = u.loadout
    ? `skills: ${u.loadout.skills.join(', ') || '—'} · mcps: ${u.loadout.mcps.join(', ') || '—'}`
    : 'plain unit (no loadout)';
  cardMission.textContent = u.mission ? `⚑ ${u.mission}` : 'no mission — type one below';
  renderResources(selectedId);
}

// C9 onion breadcrumb: the clickable ancestor path of the current view root.
const breadcrumbEl = document.getElementById('breadcrumb') as HTMLElement | null;
function renderBreadcrumb(root: string): void {
  if (!breadcrumbEl || !(view instanceof ThreeView)) return;
  breadcrumbEl.innerHTML = '';
  const segs: Array<{ label: string; path: string }> = [{ label: '⌂', path: '/' }];
  if (root !== '/') {
    let acc = '';
    for (const p of root.split('/').filter(Boolean)) { acc += '/' + p; segs.push({ label: p, path: acc }); }
  }
  segs.forEach((s, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '▸';
      breadcrumbEl.appendChild(sep);
    }
    const el = document.createElement('span');
    el.className = 'seg';
    el.textContent = s.label;
    if (i < segs.length - 1) el.addEventListener('click', () => view instanceof ThreeView && view.navigateRoot(s.path));
    else el.style.color = '#d0e8d0'; // current level — not a link
    breadcrumbEl.appendChild(el);
  });
}

// HOVER-TOOLTIP: the frame() loop calls this each render frame (set inside the
// ThreeView block below, where the DOM refs + pointer state live). Null in the
// 2D view (hover-tooltip is a 3D-scene feature).
let hoverTickFn: (() => void) | null = null;

if (view instanceof ThreeView) {
  const v = view;
  // Re-root → refresh the breadcrumb + notify any shell host (OPERA/OM iframe).
  v.onRootChanged = (root) => {
    renderBreadcrumb(root);
    try { window.parent?.postMessage({ onionRoot: root }, '*'); } catch { /* standalone, no host */ }
  };
  renderBreadcrumb(v.descentRoot);
  let downX = 0;
  let downY = 0;
  let dragged = false;
  let marquee = false;
  // WoW-mouse drag state (character/follow view only).
  let lastPX = 0, lastPY = 0;
  let rmbLookMoved = false; // a right-drag that steered = suppress the ctx menu
  // Marquee box element (Shift+left-drag), created lazily.
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;border:1px solid #ffd24d;background:rgba(255,210,77,0.12);pointer-events:none;z-index:5;display:none';
  document.body.appendChild(box);

  // ── HOVER-TOOLTIP (docs/BUILD-BACKLOG "HOVER-TOOLTIP") ────────────────────
  // Move the pointer over any object (unit / territory / graph object / file)
  // → a floating panel shows its name/kind/description, read straight off the
  // `userData.hover` tag ThreeView stamps in its reconcile passes. Presentation
  // only: a pointermove records the cursor + arms a flag; the ONE raycast per
  // frame happens in the frame() loop (hoverTick) so hover never adds a second
  // raycaster and is naturally throttled to the render rate. Panel follows the
  // cursor and hides over empty ground / while a modal (chat/ctx/pause) is up.
  const hoverTip = document.getElementById('hover-tip') as HTMLElement;
  const hoverName = hoverTip.querySelector('.ht-name') as HTMLElement;
  const hoverKind = hoverTip.querySelector('.ht-kind') as HTMLElement;
  const hoverDesc = hoverTip.querySelector('.ht-desc') as HTMLElement;
  let hoverX = 0, hoverY = 0, hoverDirty = false, hoverOnCanvas = false;
  // review #4: also suppress under the encounter panel + the command card (both
  // carry text inputs). enc-panel is declared in an earlier scope, so grab a
  // local ref here; `card` (command-card) is module-level and already in scope.
  const encPanelEl = document.getElementById('enc-panel') as HTMLElement;
  canvas.addEventListener('pointermove', (e) => {
    hoverX = e.clientX; hoverY = e.clientY; hoverDirty = true; hoverOnCanvas = true;
  });
  const hideHoverTip = (): void => { hoverTip.hidden = true; };
  canvas.addEventListener('pointerleave', () => { hoverOnCanvas = false; hideHoverTip(); });
  // Called once per render frame from frame(). Only raycasts when the pointer
  // actually moved (hoverDirty) — a still cursor over a still object costs
  // nothing beyond the flag check.
  const hoverTick = (): void => {
    if (!(view instanceof ThreeView) || !hoverOnCanvas) { hideHoverTip(); return; }
    // Suppress while a marquee drag or a modal is active — the panel would
    // just fight those surfaces (and a marquee is a select gesture, not hover).
    if (marquee || !chatBar.hidden || !ctxMenu.hidden || !pauseMenu.hidden || !encPanelEl.hidden || !card.hidden) { hideHoverTip(); return; }
    // review #1/#2: skip the raycast ONLY when the cursor is still AND the panel
    // is already hidden (idle over empty ground = zero cost — the reported perf
    // bug raycasted every frame here). When the panel is SHOWN, re-query every
    // frame even on a still cursor, so a removed/killed object's tooltip can't
    // ghost until the mouse jiggles. (A scene-revision gate would spare the
    // still-hovering-a-static-object raycast; per-frame-while-shown is the simple
    // correct floor and only runs while a tooltip is actually up.)
    if (!hoverDirty && hoverTip.hidden) return;
    hoverDirty = false;
    const info = view.hoverInfo(hoverX, hoverY);
    if (!info) { hideHoverTip(); return; }
    hoverName.textContent = info.name;
    hoverKind.textContent = info.kind;
    hoverDesc.textContent = info.description;
    hoverDesc.hidden = info.description === '';
    hoverTip.hidden = false;
    positionHoverTip();
  };
  // Keep the panel near the cursor, clamped inside the viewport.
  function positionHoverTip(): void {
    const pad = 14;
    const w = hoverTip.offsetWidth, h = hoverTip.offsetHeight;
    let x = hoverX + pad, y = hoverY + pad;
    if (x + w > innerWidth - 4) x = hoverX - w - pad;
    if (y + h > innerHeight - 4) y = hoverY - h - pad;
    hoverTip.style.left = `${Math.max(4, x)}px`;
    hoverTip.style.top = `${Math.max(4, y)}px`;
  }
  hoverTickFn = hoverTick; // hand the per-frame updater to the frame() loop

  const inChar = (): boolean => view instanceof ThreeView && view.cameraMode === 'follow';
  canvas.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    lastPX = e.clientX;
    lastPY = e.clientY;
    dragged = false;
    rmbLookMoved = false;
    // WoW autorun: both mouse buttons held in character view.
    if (inChar() && view instanceof ThreeView) view.setAutorun((e.buttons & 3) === 3);
    // Shift+left-drag = marquee select; suspend the camera during the drag.
    marquee = e.button === 0 && e.shiftKey;
    if (marquee) {
      v.setControlsEnabled(false);
      box.style.left = `${downX}px`;
      box.style.top = `${downY}px`;
      box.style.width = '0px';
      box.style.height = '0px';
      box.style.display = 'block';
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) dragged = true;
    // WoW mouselook / orbit / autorun (character view, not during a marquee).
    if (inChar() && !marquee && view instanceof ThreeView && (e.buttons & 3)) {
      const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
      view.setAutorun((e.buttons & 3) === 3);
      if (e.buttons & 2) { view.mouseLook(dx, dy); if (Math.abs(dx) + Math.abs(dy) > 2) rmbLookMoved = true; }
      else if (e.buttons & 1) view.cameraOrbit(dx, dy);
    }
    lastPX = e.clientX;
    lastPY = e.clientY;
    if (marquee) {
      box.style.left = `${Math.min(downX, e.clientX)}px`;
      box.style.top = `${Math.min(downY, e.clientY)}px`;
      box.style.width = `${Math.abs(e.clientX - downX)}px`;
      box.style.height = `${Math.abs(e.clientY - downY)}px`;
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    // Releasing either button ends autorun (character view).
    if (inChar() && view instanceof ThreeView) view.setAutorun(false);
    if (marquee) {
      box.style.display = 'none';
      v.setControlsEnabled(true);
      marquee = false;
      if (dragged) {
        selectMany(v.pickBox(downX, downY, e.clientX, e.clientY));
        return;
      }
    }
    if (dragged || e.button !== 0) return;
    select(v.pick(e.clientX, e.clientY));
  });
  // Right-click: over a UNIT → the interaction menu (§1b item 4; proximity-
  // gated in character view — walk up to them). Over GROUND → move-intent:
  // command all selected units to go to the territory under the cursor.
  // The MISSION is real; pathing is the agent's. The player never missions
  // itself — its movement is WASD (presentational).
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // In character view a right-DRAG was a mouselook, not a click — suppress
    // the interaction menu / move-intent so steering never pops a menu.
    if (inChar() && rmbLookMoved) { rmbLookMoved = false; return; }
    const hit = v.pick(e.clientX, e.clientY);
    if (hit && hit !== playerId) {
      if (v.cameraMode === 'follow') {
        const d = v.distanceToPlayer(hit);
        if (d !== null && d > INTERACT_RANGE) {
          toast('too far — walk closer');
          return;
        }
      }
      select(hit);
      openCtxMenu(e.clientX, e.clientY, hit);
      sound.click();
      return;
    }
    const targets = selectedIds.filter((id) => id !== playerId);
    if (targets.length === 0) return;
    const path = v.zoneAt(e.clientX, e.clientY);
    if (!path) return;
    for (const id of targets) rts.send(id, `go to ${path}`);
    // Ping at the cursor's ground point (nearest zone center is close enough).
    const t = v.territoryPositions().find((z) => z.path === path);
    if (t) v.pingAt(t.x, t.z);
    sound.click();
  });
  // Double-click = descend into the onion (C9). A UNIT hit is a select, not a
  // descent (ignore). §11a: a BUILDING is a subdir's avatar — double-clicking it
  // descends into THAT child path (takes precedence over the disc it sits on).
  // Otherwise, double-clicking the territory disc descends into it.
  canvas.addEventListener('dblclick', (e) => {
    if (v.pick(e.clientX, e.clientY)) return;
    const b = v.buildingHit(e.clientX, e.clientY);
    if (b) {
      v.enter(b.childPath);
      sound.click();
      return;
    }
    const path = v.zoneAt(e.clientX, e.clientY);
    if (path) {
      v.enter(path);
      sound.click();
    }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Esc only CLOSES: ctx menu → pause menu → selection → climb one level
      // out of the onion. Never OPENS anything (a stray Esc shouldn't modal).
      if (!ctxMenu.hidden) closeCtxMenu();
      else if (!pauseMenu.hidden) togglePause(false);
      else if (selectedId) {
        select(null);
        cardInput.blur();
      } else {
        v.exit();
      }
    }
    if (e.key === 'Home') view.recenter();
  });
}

function sendMission(): void {
  const prompt = cardInput.value.trim();
  if (!prompt || selectedIds.length === 0) return;
  for (const id of selectedIds) rts.send(id, prompt);
  cardInput.value = '';
}
document.getElementById('card-send')?.addEventListener('click', sendMission);
cardInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMission();
  e.stopPropagation(); // typing must not trigger world hotkeys
});
document.getElementById('card-dismiss')?.addEventListener('click', () => {
  for (const id of selectedIds) rts.dismiss(id);
  select(null);
});

// Replay mode: fetch the recorded log and play it into the world.
// ?replay=local = THE RESTART VERB's boot path (rts.restart): the stashed
// log restores the world; hash equality is verified via the KERNEL replay
// (EventLog.fromJsonl → replay → stateHash — verbatim events, law 4), then
// the drafts feed the live ingestor for the visible world.
if (replayUrl === 'local') {
  const jsonl = localStorage.getItem('rts-restart-log') ?? '';
  const want = localStorage.getItem('rts-restart-hash') ?? '';
  const got = jsonl ? stateHash(EventLog.fromJsonl(jsonl).replay()) : '(no log)';
  const match = got === want;
  console.log(`[restart] kernel-replay stateHash ${match ? 'MATCH ✓' : `MISMATCH ✗ (${got} vs ${want})`}`);
  let fed = 0;
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    const { seq: _s, tick: _t, ...draft } = JSON.parse(line) as { seq?: number; tick?: number };
    ingestor.ingestDraft(draft as never);
    fed++;
  }
  toast(match ? `↻ world restored — ${fed} events, stateHash MATCH` : `↻ restored ${fed} events — HASH MISMATCH (see console)`);
} else if (replayUrl) {
  fetch(replayUrl)
    .then((r) => r.text())
    .then((text) => rts.replay(text, Number(params.get('speed') ?? '2')))
    .catch((err) => console.warn('[replay] failed:', err));
}
document.getElementById('pause-restart')?.addEventListener('click', () => rts.restart());

// Drive the sim clock on an interval, NOT from requestAnimationFrame:
// RAF suspends in hidden tabs while transports keep delivering, and events
// ingested during a stall would all be stamped with a stale tick.
setInterval(() => ingestor.advanceClock(performance.now()), 50);

// Optional frame cap (?fps=30) — for OBS sources or battery. The sim clock
// is interval-driven, so capping render never skews simulation time.
const fpsCap = Number(params.get('fps') ?? '0');
const minFrameMs = fpsCap > 0 ? 1000 / fpsCap - 1 : 0;
if (fpsCap > 0 && view instanceof ThreeView) view.setFrameBudget(1000 / fpsCap);

let lastRaf = 0;
let lastRender = 0;
function frame(nowMs: number): void {
  if (minFrameMs > 0 && nowMs - lastRender < minFrameMs) {
    requestAnimationFrame(frame);
    return;
  }
  lastRender = nowMs;
  const dtMs = lastRaf === 0 ? 16 : nowMs - lastRaf;
  lastRaf = nowMs;
  fitCanvas();
  // WoW movement (Isaac 2026-07-06) — character-relative, only in character
  // (follow) view: W/S move along the facing, A/D TURN it, Q/E strafe. Mouse
  // steer/autorun is wired in the pointer handlers.
  if (playerId && view instanceof ThreeView && view.cameraMode === 'follow') {
    view.setPlayerMove(
      (held.has('w') ? 1 : 0) - (held.has('s') ? 1 : 0),
      (held.has('e') ? 1 : 0) - (held.has('q') ? 1 : 0),
    );
    view.setPlayerTurn((held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0));
  }
  view.draw(ingestor.state, dtMs);
  // PHASE 7 (metaclozeclosure / DUNGEON-LOOP-SPEC law 7): the BOOT HEARTBEAT
  // for the OM meta-shell BIOS. First frame => 'woom:boot' (the shell's
  // boot-smoke); every ~120 frames => 'woom:alive'. postMessage is inert
  // when there is no parent shell (standalone tabs unaffected). Payload
  // carries the sim tick, never wall-clock (law 5 hygiene).
  bootBeat(ingestor.state.tick);
  hud.update(ingestor.state, view instanceof ThreeView ? view.perf : undefined);
  refreshCard();
  // Minimap at ~4Hz (it reads world data, not the 3D scene).
  if (minimap && nowMs - lastMinimap > 250) {
    lastMinimap = nowMs;
    minimap.draw(nowMs);
  }
  updateAlert();
  hoverTickFn?.(); // HOVER-TOOLTIP: one raycast/frame, only when the cursor moved
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


// PHASE 7 — the meta-shell boot/alive heartbeat (see the comment at the call
// site). Hoisted function declaration; frame-counted, wall-clock-free.
let __beatFrames = 0;
function bootBeat(tick: number): void {
  if (window.parent === window) return; // no shell hosting us
  if (__beatFrames === 0) {
    window.parent.postMessage({ type: 'woom:boot', tick }, '*');
  } else if (__beatFrames % 120 === 0) {
    window.parent.postMessage({ type: 'woom:alive', tick }, '*');
  }
  __beatFrames++;
}
