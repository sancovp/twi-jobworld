/**
 * EXAMPLES — rts/create.ts — the character-create screen (§1b item 1).
 *
 * WoW entry: name your character, compose a loadout (systemPrompt + skills +
 * mcps — the ONLY three things a Loadout holds, kernel-validated), watch the
 * turntable render the figure the composer derives from it, then ENTER WORLD.
 * Zero kernel change: Enter emits the same hero_summoned any hero uses.
 *
 * PREVIEW-PARITY (2026-07-07, LOFT-ENGINE §10 L3c → L3c-preview): the turntable
 * renders through the EXACT SAME hero-body path as the LIVE world — composeHero
 * → heroTopology/heroProportions/heroPaint (composer/heroLoft.ts) →
 * buildLoftCreature + equipHeroLoft (figures.ts), posed by the same pure pose()
 * idle sway. Same id, same fnv1a(id) hash, same HeroSpec as ThreeView.
 * reconcileFigures' loft branch (see render/src/three/.claude/rules/
 * render_states.md § "L3c"), so the body the player composes here is the body
 * that spawns on ENTER WORLD — not just same HUES/helm-kind/implement-kind
 * (those always came from the untouched HeroSpec), but the SAME lofted, skinned,
 * superellipse realizer. "The preview cannot lie" holds literally again. A
 * turntable needs no locomotion; base='idle' gives the breathing/stance sway.
 * The HERO_LEGACY_FIGURE (buildFigure+equipHero) revert path in figures.ts is
 * intentionally NOT mirrored here — the preview always tracks the live default.
 *
 * OVERSEE skips into the classic RTS view (the operator altitude).
 *
 * REGISTRY GEAR CYCLERS (char-builder integration, Phase 5): the "CUSTOMIZE
 * CHARACTER" panel also fetches examples/rts/assets/parts-manifest.json
 * (emitted by exoblend/scripts/emit_parts_manifest.py from the CHAR-BUILDER-
 * BACKEND registry, exoblend/builder/registry/scout/figure/<slot>/) and renders
 * one ◀ value ▶ cycler per figure slot (head/torso/pelvis/upper_arm/forearm/
 * hand/thigh/shin/foot), filtered to the current FORM (race). Cycling shows the
 * selected part's display_name + council grade — display data only, no mesh is
 * loaded or swapped (L1: the runtime never runs a generator; parts are already
 * minted). The pick folds additively into the systemPrompt string, mirroring
 * how `${type} being, ${build} build, ${aspect} aura` already works — the
 * Loadout stays exactly {systemPrompt, skills, mcps} (kernel/src/events.ts),
 * zero kernel changes, zero new event types.
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import type { Loadout } from '../../../kernel/src/events.js';
import { composeHero, fnv1a } from '../../../render/src/composer/HeroComposer.js';
import { heroTopology, heroProportions, heroPaint } from '../../../render/src/composer/heroLoft.js';
import { buildLoftCreature } from '../../../render/src/three/generators/loft/build.js';
import { equipHeroLoft } from '../../../render/src/three/figures.js';
import { buildAnimRig, initialDriverState, type AnimRig, type DriverState } from '../../../render/src/three/anim/animRig.js';
import { pose } from '../../../render/src/three/anim/poseDriver.js';
import { loadExoblendBody, EXOBLEND_FORM_GLB } from '../../../render/src/three/generators/exoblendBody.js';
import { buildEnvironmentTexture } from '../../../render/src/three/atmosphere.js';

export interface CreateResult {
  name: string;
  loadout: Loadout;
}

/** Preset graph-node names (skills/mcps are REFS the runtime resolves — §4).
 *  Free-add lets you type any node name; these are just one-click chips. */
const SKILL_PRESETS = ['flowmine', 'skilltree', 'dragonbones', 'bigdog', 'prompt-engineering', 'crystal-ball'];
const MCP_PRESETS = ['carton', 'cyberneticircus', 'playwright', 'heaven-bml'];

/** One selectable body-part option for a `figure` slot (CHAR-BUILDER-BACKEND.md §1),
 *  as summarized into examples/rts/assets/parts-manifest.json by
 *  exoblend/scripts/emit_parts_manifest.py. Display data only — this screen never
 *  loads or swaps a mesh for it (L1: the runtime never runs a generator; the
 *  factory already minted survivors — the FORM cycler's GLB is the only mesh
 *  shown here, per EXOBLEND_FORM_GLB). */
interface PartEntry {
  id: string;
  display_name: string;
  artifact_file: string | null;
  grade: string;
}
/** form (char_type: human/cyborg/robot/bug) -> slot -> its part options, sorted by id. */
type PartsManifest = Record<string, Record<string, PartEntry[]>>;

/** BUILDER.type ('Human'|'Cyborg'|'AI-Robot') -> the manifest's form/species key
 *  (the same char_type vocabulary as exoblend/builder/parts/_base.py's TYPES). */
const partsFormOf = (type: string): string => (type === 'AI-Robot' ? 'robot' : type.toLowerCase());

const CSS = `
#create-screen { position: fixed; inset: 0; z-index: 20; background: radial-gradient(ellipse at 50% 30%, #16281f 0%, #0c1210 70%);
  display: flex; align-items: center; justify-content: center; font: 13px ui-monospace, "SF Mono", Menlo, monospace; color: #d0e8d0; }
#create-screen[hidden] { display: none; }
.cr-wow { display: grid; grid-template-columns: 300px 1fr 300px; gap: 18px; width: min(1080px, 96vw); height: min(680px, 92vh); }
.cr-lpanel, .cr-rpanel { display: flex; flex-direction: column; gap: 8px; background: linear-gradient(180deg, rgba(22,17,9,0.94), rgba(10,8,5,0.94)); border: 2px solid #6b5a2e; border-radius: 6px; box-shadow: inset 0 0 26px rgba(0,0,0,0.65), 0 0 0 1px #241d0e; padding: 16px; overflow-y: auto; }
.cr-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
#cr-turntable { width: 280px; height: 340px; border-radius: 8px; background: radial-gradient(ellipse at 50% 78%, rgba(60,50,30,0.5) 0%, rgba(10,10,14,0.15) 72%); }
.cr-frame-title { color: #e8c46a; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-align: center; border-bottom: 1px solid #6b5a2e; padding-bottom: 4px; margin-top: 6px; text-shadow: 0 1px 2px #000; }
.cr-races { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.cr-race { background: rgba(0,0,0,0.4); border: 1px solid #5a4c26; border-radius: 4px; color: #cdbf98; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-align: center; padding: 13px 4px; cursor: pointer; user-select: none; }
.cr-race:hover { border-color: #e8c46a; color: #ffe8a8; }
.cr-race.on { background: rgba(232,196,106,0.22); border-color: #ffd24d; color: #ffe8a8; box-shadow: inset 0 0 8px rgba(255,210,77,0.4); }
.cr-random { background: rgba(232,196,106,0.14); border: 1px solid #6b5a2e; border-radius: 4px; color: #e8c46a; font: bold 12px ui-monospace, Menlo, monospace; padding: 8px; cursor: pointer; margin-top: 4px; }
.cr-random:hover { background: rgba(232,196,106,0.3); }
.cr-nameplate { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.cr-name-label { color: #e8c46a; font-size: 11px; letter-spacing: 3px; }
.cr-nameplate input { background: rgba(0,0,0,0.55); border: 1px solid #6b5a2e; border-radius: 3px; color: #ffe8a8; font: 15px ui-monospace, Menlo, monospace; text-align: center; padding: 7px 10px; width: 240px; }
.cr-lore-name { color: #ffd24d; font-weight: bold; font-size: 18px; letter-spacing: 2px; text-shadow: 0 1px 2px #000; }
.cr-lore-body { color: #cdbf98; font-size: 12px; line-height: 1.55; flex: 1; }
.cr-adv { margin-top: 6px; border-top: 1px solid #5a4c26; padding-top: 6px; }
.cr-adv summary { color: #9c8a5a; font-size: 11px; cursor: pointer; }
.cr-label { color: #9dbb77; margin-top: 4px; }
.cr-adv input[type=text], .cr-adv textarea { background: rgba(0,0,0,0.5); border: 1px solid rgba(157,187,119,0.35);
  border-radius: 3px; color: #e8f4e8; font: 12px ui-monospace, Menlo, monospace; padding: 6px 8px; width: 100%; box-sizing: border-box; }
.cr-adv textarea { height: 64px; resize: vertical; }
.cr-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.cr-chip { background: rgba(157,187,119,0.14); border: 1px solid rgba(157,187,119,0.4); border-radius: 10px;
  color: #b8c4b8; padding: 3px 10px; cursor: pointer; user-select: none; }
.cr-chip.on { background: rgba(255,210,77,0.22); border-color: #ffd24d; color: #ffd24d; }
.cr-add { display: flex; gap: 5px; }
.cr-add input { flex: 1; }
.cr-add button, .cr-actions button { background: rgba(157,187,119,0.18); border: 1px solid rgba(157,187,119,0.5);
  border-radius: 3px; color: #d0e8d0; font: bold 12px ui-monospace, Menlo, monospace; padding: 6px 12px; cursor: pointer; }
.cr-actions { display: flex; gap: 8px; margin-top: 10px; }
#cr-enter { flex: 1; background: rgba(255,210,77,0.22); border-color: #ffd24d; color: #ffd24d; font-size: 14px; padding: 10px; }
#cr-enter:hover { background: rgba(255,210,77,0.38); }
.cr-cyc { display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.35); border:1px solid rgba(157,187,119,0.3); border-radius:4px; padding:4px 6px; }
.cr-cyc-mid { flex:1; text-align:center; }
.cr-cyc-lbl { color:#9dbb77; font-size:10px; letter-spacing:1px; }
.cr-cyc-val { color:#ffd24d; font-weight:bold; font-size:15px; letter-spacing:1px; }
.cr-arrow { background:rgba(157,187,119,0.18); border:1px solid rgba(157,187,119,0.5); border-radius:3px; color:#d0e8d0; font-size:14px; padding:4px 11px; cursor:pointer; user-select:none; }
.cr-arrow:hover { background:rgba(255,210,77,0.3); color:#ffd24d; }
.cr-section { color:#9ec49e; font-size:10px; letter-spacing:2px; margin-top:8px; }
.cr-actions button:hover { background: rgba(157,187,119,0.35); }
.cr-model-note { color:#9ec49e; font-size:10px; letter-spacing:1px; height:13px; text-align:center; text-shadow:0 1px 2px #000; }
.cr-parts { display: flex; flex-direction: column; gap: 6px; }
.cr-cyc--part .cr-cyc-val { font-size: 12px; line-height: 1.25; }
.cr-cyc-grade { color: #7fa07f; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
`;

function chipRow(container: HTMLElement, names: Set<string>, onChange: () => void): (name: string) => void {
  const addChip = (name: string): void => {
    const el = document.createElement('span');
    el.className = 'cr-chip' + (names.has(name) ? ' on' : '');
    el.textContent = name;
    el.addEventListener('click', () => {
      if (names.has(name)) names.delete(name);
      else names.add(name);
      el.classList.toggle('on', names.has(name));
      onChange();
    });
    container.appendChild(el);
  };
  return addChip;
}

/**
 * Mount the create screen. Returns nothing; exactly one of the callbacks
 * fires, then the screen removes itself.
 */
export function mountCreateScreen(opts: {
  onEnter: (r: CreateResult) => void;
  onSkip: () => void;
}): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'create-screen';
  root.innerHTML = `
    <div class="cr-wow">
      <div class="cr-lpanel">
        <div class="cr-frame-title">CHOOSE YOUR FORM</div>
        <div class="cr-races" id="cr-races"></div>
        <div class="cr-frame-title">CUSTOMIZE CHARACTER</div>
        <div class="cr-cyc"><button class="cr-arrow" data-cyc="build" data-d="-1">◀</button><div class="cr-cyc-mid"><div class="cr-cyc-lbl">BUILD</div><div class="cr-cyc-val" id="cyc-build-val">AVERAGE</div></div><button class="cr-arrow" data-cyc="build" data-d="1">▶</button></div>
        <div class="cr-cyc"><button class="cr-arrow" data-cyc="aspect" data-d="-1">◀</button><div class="cr-cyc-mid"><div class="cr-cyc-lbl">ASPECT</div><div class="cr-cyc-val" id="cyc-aspect-val">VERDANT</div></div><button class="cr-arrow" data-cyc="aspect" data-d="1">▶</button></div>
        <div class="cr-section">GEAR</div>
        <div class="cr-parts" id="cr-parts"></div>
        <button id="cr-random" class="cr-random">⟳ RANDOMIZE</button>
        <details class="cr-adv"><summary>LOADOUT — persona · skills · mcps (the look IS the loadout)</summary>
          <div class="cr-label">PERSONA (silhouette · garb · aura)</div>
          <textarea id="cr-prompt">You are a wandering overseer of this world, curious and kind.</textarea>
          <div class="cr-label">SKILLS (orbiting glyphs)</div>
          <div class="cr-chips" id="cr-skills"></div>
          <div class="cr-add"><input id="cr-skill-add" type="text" placeholder="add skill node…" /><button id="cr-skill-btn">+</button></div>
          <div class="cr-label">MCPS (grounded pylons)</div>
          <div class="cr-chips" id="cr-mcps"></div>
          <div class="cr-add"><input id="cr-mcp-add" type="text" placeholder="add mcp node…" /><button id="cr-mcp-btn">+</button></div>
        </details>
      </div>
      <div class="cr-center">
        <canvas id="cr-turntable" width="280" height="340"></canvas>
        <div class="cr-model-note" id="cr-model-note"></div>
        <div class="cr-nameplate"><div class="cr-name-label">NAME</div><input id="cr-name" type="text" value="Wanderer" maxlength="24" /></div>
      </div>
      <div class="cr-rpanel">
        <div class="cr-lore-name" id="cr-lore-name">HUMAN</div>
        <div class="cr-lore-body" id="cr-lore-body"></div>
        <div class="cr-actions">
          <button id="cr-enter">ACCEPT ⚔</button>
          <button id="cr-skip">OVERSEE</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const nameEl = root.querySelector('#cr-name') as HTMLInputElement;
  const promptEl = root.querySelector('#cr-prompt') as HTMLTextAreaElement;
  const skills = new Set<string>(['flowmine', 'skilltree']);
  const mcps = new Set<string>(['carton']);

  // ── Registry-backed gear cyclers (char-builder Phase 5) ──
  let partsManifest: PartsManifest = {};
  let partSlots: string[] = [];               // union of slots across every form, sorted
  const partIdx: Record<string, number> = {}; // slot -> selected index into its part list
  const partLabel = (slot: string): string => slot.replace(/_/g, ' ').toUpperCase();

  // ── Turntable: a tiny standalone scene running the SAME composer + loft path ──
  const tcanvas = root.querySelector('#cr-turntable') as HTMLCanvasElement;
  // WebGPURenderer (WebGPU → WebGL2 auto-fallback) — the SAME renderer CLASS the
  // live world's ThreeView uses (Phase 6c). REQUIRED, not a nicety: the loft
  // body's painted skin is a MeshStandardNodeMaterial (three/webgpu + TSL) that a
  // classic THREE.WebGLRenderer cannot compile (it throws in resolveIncludes).
  // Same output transform (sRGB + ACES filmic, exposure 1.15) as ThreeView so the
  // previewed body's color/exposure matches what spawns in-world.
  const trenderer = new WebGPURenderer({ canvas: tcanvas, antialias: true, alpha: true });
  trenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  trenderer.setSize(280, 340, false);
  trenderer.outputColorSpace = THREE.SRGBColorSpace;
  // AgX + IBL environment, matching ThreeView.mount() (the "reads too DARK vs
  // Blender renders" create-screen defect was exactly these two gaps: ACES
  // crushing the navies + PBR metals with no environment to reflect).
  trenderer.toneMapping = THREE.AgXToneMapping;
  trenderer.toneMappingExposure = 1.15;
  // WebGPURenderer boots its backend asynchronously; the spin loop gates its
  // render() on this so nothing draws before the device is live.
  let backendReady = false;
  void trenderer.init().then(() => { backendReady = true; });
  const tscene = new THREE.Scene();
  const tcamera = new THREE.PerspectiveCamera(35, 280 / 340, 0.1, 100);
  tcamera.position.set(0, 5.2, 13.5);
  tcamera.lookAt(0, 3.6, 0);
  tscene.environment = buildEnvironmentTexture();
  tscene.environmentIntensity = 0.5;
  tscene.add(new THREE.HemisphereLight(0xc4d8ff, 0x2c3a26, 1.3));
  const key = new THREE.DirectionalLight(0xffe0b0, 2.2);
  key.position.set(4, 8, 6);
  tscene.add(key);
  // Cool rim/back light — the world rig has one (silhouette separation); the
  // turntable didn't, so the model's dark side merged into the void backdrop.
  const rim = new THREE.DirectionalLight(0x9fc0ff, 0.8);
  rim.position.set(-4, 6, -6);
  tscene.add(rim);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.7, 0.4, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a4034, roughness: 0.85 }),
  );
  disc.position.y = -0.2;
  tscene.add(disc);

  let figure: THREE.Group | null = null;
  let animRig: AnimRig | null = null;              // LOFT-fallback pose driver (null while a GLB is shown)
  let glbMixer: THREE.AnimationMixer | null = null; // exoblend-GLB clip driver (null on the LOFT path)
  let shownGlb: string | null = null;              // which minted GLB is currently displayed
  let loadToken = 0;                               // race guard: a newer refresh invalidates in-flight loads
  const driver: DriverState = initialDriverState(); // base='idle' → breathing/stance sway
  const noteEl = root.querySelector('#cr-model-note') as HTMLElement;
  // The builder's named-option cyclers (WoW-style ◀ value ▶). Each folds a
  // descriptor token into the systemPrompt, so the SAME pure composer that
  // derives the world figure reflects the picked parts — the preview cannot lie.
  // Playable agent forms ONLY. Bug/Error is a MOB (enemy), never a player form.
  const TYPES = ['Human', 'Cyborg', 'AI-Robot'];
  const CYC = {
    build: ['Lean', 'Average', 'Broad', 'Hulking'],
    aspect: ['Ashen', 'Verdant', 'Ember', 'Cobalt', 'Bone'],
  };
  const BUILDER = { type: 'Human', build: 'Average', aspect: 'Verdant' };
  const LORE: Record<string, { name: string; body: string }> = {
    Human: { name: 'HUMAN', body: 'The player, and the people of the virtualized Earth. Versatile and adaptive — masters of tool and craft, who enter through the portal into the WOOM realm.' },
    Cyborg: { name: 'CYBORG', body: 'Half-flesh, half-machine agents. A living limb clad in plate, a reactor core at the chest, a visor for an eye. They equip context and power up.' },
    'AI-Robot': { name: 'AI / ROBOT', body: 'Pure-machine agents. Segmented limbs on ball joints, a single optic, an antenna crest. Built, not grown — they touch files and walk to dirs.' },
  };
  const partsFor = (slot: string): PartEntry[] => partsManifest[partsFormOf(BUILDER.type)]?.[slot] ?? [];
  const selectedPart = (slot: string): PartEntry | undefined => {
    const list = partsFor(slot);
    if (list.length === 0) return undefined;
    const i = (((partIdx[slot] ?? 0) % list.length) + list.length) % list.length;
    return list[i];
  };
  /** Folds the current gear picks into the systemPrompt as plain text — additive,
   *  after the existing `${type} being, ...` tokens (heroFormGlb's regex is
   *  prefix-anchored, so appending here never disturbs form detection). */
  const partsDescriptor = (): string => {
    const picked = partSlots.map((s) => selectedPart(s)).filter((p): p is PartEntry => !!p);
    return picked.length ? ` Gear: ${picked.map((p) => p.display_name).join(', ')}.` : '';
  };
  const currentLoadout = (): Loadout => ({
    systemPrompt: `${BUILDER.type} being, ${BUILDER.build} build, ${BUILDER.aspect} aura. ${promptEl.value}${partsDescriptor()}`,
    skills: [...skills],
    mcps: [...mcps],
  });
  const unitIdOf = (name: string): string =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';

  const refresh = (): void => {
    const desiredGlb = EXOBLEND_FORM_GLB[BUILDER.type] ?? null;

    if (desiredGlb) {
      // ── EXOBLEND-GLB form: LOAD the real Blender-authored body (WOOM-CHARACTER-PIPELINE:
      // three.js only LOADS the GLB; it never regrows geometry). The fixed GLB is not reshaped
      // by loadout/build/aspect, so a loadout-only refresh while it's already shown is a no-op. ──
      if (shownGlb === desiredGlb && figure) return;
      const token = ++loadToken;
      animRig = null;
      noteEl.textContent = '◆ loading exoblend model…';
      void loadExoblendBody('assets', desiredGlb, 4.2)
        .then((body) => {
          if (token !== loadToken) return; // a newer form-change superseded this load
          if (figure) tscene.remove(figure);
          figure = body.group;
          glbMixer = body.mixer;
          shownGlb = desiredGlb;
          tscene.add(figure);
          noteEl.textContent = `◆ exoblend model — Blender-authored (${body.skinned} skinned · ~${body.tris} tris)`;
        })
        .catch((e) => { noteEl.textContent = '◆ exoblend model load failed: ' + (e instanceof Error ? e.message : String(e)); });
      return;
    }

    // ── LOFT fallback form (no minted GLB yet): the procedural preview, EXACTLY the live-world
    // hero build (ThreeView.reconcileFigures loft branch) — same id → same fnv1a(id) → same
    // HeroSpec → same realizer. Invalidate any in-flight GLB load first. ──
    ++loadToken;
    glbMixer = null;
    shownGlb = null;
    if (figure) tscene.remove(figure);
    const id = unitIdOf(nameEl.value);
    const spec = composeHero(id, currentLoadout());
    const topology = heroTopology(spec);
    const built = buildLoftCreature(topology, fnv1a(id), heroProportions(spec), undefined, heroPaint(spec));
    figure = built.group;
    equipHeroLoft(figure, spec, built.rig);
    animRig = buildAnimRig(built.rig, id, topology, `hero:${id}`);
    tscene.add(figure);
    noteEl.textContent = '◇ procedural preview — exoblend model pending for this form';
  };
  refresh();

  let debounce: ReturnType<typeof setTimeout> | null = null;
  const queueRefresh = (): void => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(refresh, 200);
  };
  nameEl.addEventListener('input', queueRefresh);
  promptEl.addEventListener('input', queueRefresh);

  // ── Registry gear cyclers: one ◀ value ▶ row per figure slot, options from
  // parts-manifest.json (never hardcoded), filtered to the current FORM. ──
  const partsEl = root.querySelector('#cr-parts') as HTMLElement;
  const renderPartCyclers = (): void => {
    partsEl.innerHTML = '';
    for (const slot of partSlots) {
      const list = partsFor(slot);
      if (list.length === 0) continue;
      partIdx[slot] = (((partIdx[slot] ?? 0) % list.length) + list.length) % list.length;
      const part = list[partIdx[slot]!]!;
      const row = document.createElement('div');
      row.className = 'cr-cyc cr-cyc--part';
      row.dataset.partSlot = slot;
      row.innerHTML = `
        <button class="cr-arrow" data-part-cyc="${slot}" data-d="-1">◀</button>
        <div class="cr-cyc-mid">
          <div class="cr-cyc-lbl">${partLabel(slot)}</div>
          <div class="cr-cyc-val">${part.display_name}</div>
          <div class="cr-cyc-grade">${part.grade}</div>
        </div>
        <button class="cr-arrow" data-part-cyc="${slot}" data-d="1">▶</button>`;
      partsEl.appendChild(row);
    }
  };
  // Event delegation on the container: renderPartCyclers() rebuilds the rows
  // (on manifest load + every race change), so ONE listener here outlives that.
  partsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-part-cyc]') as HTMLElement | null;
    if (!btn) return;
    const slot = btn.dataset.partCyc!;
    const list = partsFor(slot);
    if (list.length === 0) return;
    const d = Number(btn.dataset.d);
    partIdx[slot] = (((partIdx[slot] ?? 0) + d) % list.length + list.length) % list.length;
    renderPartCyclers();
    queueRefresh();
  });
  // Fetch is best-effort: a checkout without a built manifest (or offline dev)
  // just renders zero gear cyclers — the pre-Phase-5 screen shape, no crash.
  void fetch('assets/parts-manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<PartsManifest>) : Promise.reject(new Error(String(r.status)))))
    .then((m) => {
      partsManifest = m;
      const slots = new Set<string>();
      for (const bySlot of Object.values(m)) for (const slot of Object.keys(bySlot)) slots.add(slot);
      partSlots = [...slots].sort();
      renderPartCyclers();
      queueRefresh();
    })
    .catch((e) => console.warn('parts-manifest.json unavailable:', e));

  // ── The WoW builder wiring ─────────────────────────────────────────────
  const setDisp = (k: 'build' | 'aspect'): void => {
    (root.querySelector(`#cyc-${k}-val`) as HTMLElement).textContent = BUILDER[k].toUpperCase();
  };
  const updateLore = (): void => {
    const l = LORE[BUILDER.type] ?? { name: BUILDER.type.toUpperCase(), body: '' };
    (root.querySelector('#cr-lore-name') as HTMLElement).textContent = l.name;
    (root.querySelector('#cr-lore-body') as HTMLElement).textContent = l.body;
  };
  const racesEl = root.querySelector('#cr-races') as HTMLElement;
  const paintRaces = (): void => {
    racesEl.querySelectorAll('.cr-race').forEach((x) =>
      x.classList.toggle('on', (x as HTMLElement).dataset.type === BUILDER.type));
  };
  TYPES.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'cr-race' + (t === BUILDER.type ? ' on' : '');
    el.dataset.type = t;
    el.textContent = t.toUpperCase().replace('-', ' ');
    el.addEventListener('click', () => { BUILDER.type = t; paintRaces(); updateLore(); renderPartCyclers(); queueRefresh(); });
    racesEl.appendChild(el);
  });
  updateLore();
  // customization cyclers (build / aspect) — index derived from BUILDER each click
  (['build', 'aspect'] as const).forEach((k) => {
    const opts = CYC[k];
    root.querySelectorAll(`[data-cyc="${k}"]`).forEach((b) =>
      b.addEventListener('click', () => {
        const d = Number((b as HTMLElement).dataset.d);
        const cur = Math.max(0, opts.indexOf(BUILDER[k]));
        BUILDER[k] = opts[(cur + d + opts.length) % opts.length] as string;
        setDisp(k);
        queueRefresh();
      }));
  });
  // Randomize (UI-only). PURE (law 5 — no Math.random outside the kernel): an
  // advancing click counter seeds the pure fnv1a hash, so each click yields a
  // DIFFERENT pick yet the sequence is deterministic/replay-safe. A per-field
  // salt de-correlates type/build/aspect within one click.
  let randTick = 0;
  const pick = <T,>(a: readonly T[], salt: number): T => a[fnv1a(`rand:${randTick}:${salt}`) % a.length] as T;
  (root.querySelector('#cr-random') as HTMLButtonElement).addEventListener('click', () => {
    randTick++;
    BUILDER.type = pick(TYPES, 1);
    BUILDER.build = pick(CYC.build, 2);
    BUILDER.aspect = pick(CYC.aspect, 3);
    paintRaces(); setDisp('build'); setDisp('aspect'); updateLore(); renderPartCyclers(); queueRefresh();
  });

  const addSkillChip = chipRow(root.querySelector('#cr-skills') as HTMLElement, skills, queueRefresh);
  SKILL_PRESETS.forEach(addSkillChip);
  const addMcpChip = chipRow(root.querySelector('#cr-mcps') as HTMLElement, mcps, queueRefresh);
  MCP_PRESETS.forEach(addMcpChip);
  const freeAdd = (inputId: string, btnId: string, set: Set<string>, addChip: (n: string) => void): void => {
    const input = root.querySelector(inputId) as HTMLInputElement;
    const add = (): void => {
      const v = input.value.trim();
      if (!v || set.has(v)) return;
      set.add(v);
      addChip(v);
      input.value = '';
      queueRefresh();
    };
    (root.querySelector(btnId) as HTMLButtonElement).addEventListener('click', add);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') add();
      e.stopPropagation();
    });
  };
  freeAdd('#cr-skill-add', '#cr-skill-btn', skills, addSkillChip);
  freeAdd('#cr-mcp-add', '#cr-mcp-btn', mcps, addMcpChip);
  // Typing a name/persona must not leak into world hotkeys (WASD/C).
  for (const el of [nameEl, promptEl]) el.addEventListener('keydown', (e) => e.stopPropagation());

  let raf = 0;
  let last = 0;
  let animT = 0; // accumulated anim-seconds from 0 (mirrors ThreeView's host clock)
  const spin = (now: number): void => {
    const dt = last === 0 ? 16 : now - last;
    last = now;
    animT += dt / 1000;
    if (figure) figure.rotation.y += dt * 0.0007;
    if (glbMixer) glbMixer.update(dt / 1000);      // exoblend-GLB baked clip (dt in seconds)
    else if (animRig) pose(animRig, animT, driver); // LOFT idle breathing/stance — the pure driver
    if (backendReady) trenderer.render(tscene, tcamera);
    raf = requestAnimationFrame(spin);
  };
  raf = requestAnimationFrame(spin);

  const teardown = (): void => {
    cancelAnimationFrame(raf);
    trenderer.dispose();
    root.remove();
    style.remove();
  };
  (root.querySelector('#cr-enter') as HTMLButtonElement).addEventListener('click', () => {
    const name = nameEl.value.trim() || 'Wanderer';
    const result: CreateResult = { name, loadout: currentLoadout() };
    teardown();
    opts.onEnter(result);
  });
  (root.querySelector('#cr-skip') as HTMLButtonElement).addEventListener('click', () => {
    teardown();
    opts.onSkip();
  });
}
