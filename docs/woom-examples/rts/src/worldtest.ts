/**
 * worldtest — WORLD-DUAL v1 PROTOTYPE (docs/WORLD-DUAL-SCALE-MODEL.md).
 *
 * Proves the WHOLE loop end-to-end, browser-verifiable:
 *   typed anchors (an OM-style info form)                                   ── §"Ingest = an OM page"
 *   → concentric anchors placed on the Poincaré disk r = tanh(k·d/2)        ── docs/PLACEMENT-MATH.md §3.1
 *   → procedural fill: room = dense/life-size at center, outer rings        ── §"Mechanism = layout/synthesis"
 *     blocked-out silhouettes (known = dense, unknown = blocked-out)
 *   → the ENTRY STRANGE LOOP: character in the virtualized ROOM → uses an   ── §"The entry loop"
 *     in-game LAPTOP item (dual of the real device) → enters the WORLD →
 *     sees the GOD screen (overseer / astral view = the full zoom-out).
 *
 * REUSES the HAVE pieces (does NOT rebuild them): the disk math (render/astral/
 * place.ts), the room + avatar (interior.ts buildInterior), procedural
 * structures (structures.ts buildStructure + kit/parts.ts), the god/overseer
 * altitude (three camera presets over ONE scene — the ThreeView god/rts/room
 * altitude idea, here in a standalone harness).
 *
 * PURE (DESIGN law 5): no Date.now / Math.random — scatter uses SeededRng keyed
 * by fnv1a(anchor); camera transitions accumulate the render clock's dt.
 * A THROWAWAY HARNESS (examples/), not shipped world code.
 */
import * as THREE from 'three';
import { SeededRng } from '../../../kernel/src/clock.js';
import {
  RING_NAMES, MAX_RING, ringRadius, rimGap, displayRadius, worldFromDisk,
  anchorAngleTurns, fnv1a,
} from '../../../render/src/astral/place.js';
import { buildInterior } from '../../../render/src/three/interior.js';
import { floorSlab, gableRoof, windowPane, column } from '../../../render/src/three/kit/parts.js';
// NB: structures.ts (buildStructure) is deliberately NOT used — it routes through
// bestMaterial → painterly MeshStandardNodeMaterial (three/webgpu/TSL), which the
// classic WebGLRenderer this harness uses (the proven glbtest path) cannot compile.
// The city ring uses kit primitives (classic MeshStandardMaterial) instead.

// ── scene scaffold (the standalone-test pattern: renderer/scene/lights/loop) ──
const canvas = document.getElementById('c') as HTMLCanvasElement;
const status = document.getElementById('status') as HTMLElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
function viewport(): { w: number; h: number } {
  return { w: window.innerWidth || 1280, h: window.innerHeight || 720 };
}
{ const { w, h } = viewport(); renderer.setSize(w, h); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e18);      // astral night
scene.fog = new THREE.FogExp2(0x0a0e18, 0.0016);
const camera = new THREE.PerspectiveCamera(46, viewport().w / viewport().h, 0.1, 4000);

scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x1a1410, 0.9));
const sun = new THREE.DirectionalLight(0xffe6c0, 1.9);
sun.position.set(80, 220, 120); sun.castShadow = true;
scene.add(sun);

// ── the astral SEA (ASTRAL-RENDERING §1.1: the disk as a plane in the scene) ──
const R_SEA = 300;                                  // world radius of the disk
function buildAstralSea(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'astral-sea';
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(R_SEA, 96),
    new THREE.MeshStandardMaterial({ color: 0x0c1526, roughness: 0.85, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.4; sea.receiveShadow = true;
  g.add(sea);
  // luminous rim ring (the astral horizon — the one permanent glow, §3.1)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R_SEA, 1.6, 8, 128),
    new THREE.MeshStandardMaterial({ color: 0x6fb0ff, emissive: 0x2b6bd6, emissiveIntensity: 2.2, roughness: 0.4 }),
  );
  rim.rotation.x = -Math.PI / 2; rim.position.y = -0.35;
  g.add(rim);
  return g;
}

// ── a text label sprite (pure canvas texture; no Date/Math.random) ───────────
function makeLabel(text: string, hue = 0.58, scale = 1): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(8,12,22,0.72)'; ctx.fillRect(0, 0, 512, 128);
  const col = new THREE.Color().setHSL(hue, 0.7, 0.72);
  ctx.strokeStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`;
  ctx.lineWidth = 4; ctx.strokeRect(2, 2, 508, 124);
  ctx.fillStyle = '#eef4ff'; ctx.font = 'bold 46px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(34 * scale, 8.5 * scale, 1);
  return spr;
}

// ── the in-game LAPTOP item (the dual of the real device — §14 nesting) ──────
function buildLaptop(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'laptop-desk';
  const desk = floorSlab(4.2, 2.2, 0.35, { color: 0x5a4632, rough: 0.85 });
  desk.position.y = 2.0; g.add(desk);
  for (const [sx, sz] of [[-1.7, -0.8], [1.7, -0.8], [-1.7, 0.8], [1.7, 0.8]] as const) {
    const leg = column(2.0, 0.14, { color: 0x3d2f22, rough: 0.9 });
    leg.position.set(sx, 1.0, sz); g.add(leg);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.5, metalness: 0.4 }));
  base.position.set(0, 2.28, 0.2); g.add(base);
  const screen = windowPane(1.9, 1.2, { color: 0x8fe6ff, rough: 0.25, glow: 2.4 });
  screen.position.set(0, 2.9, -0.35); screen.rotation.x = -0.32;
  screen.name = 'laptop-screen'; g.add(screen);
  // tag the whole item so a raycast on ANY child resolves to "use laptop"
  g.traverse((o) => { o.userData.laptop = true; });
  return g;
}

// ── ONE ring of the concentric world (d ≥ 1): a band + procedural fill ───────
// Detail COARSENS outward (§"known = dense; unknown = blocked-out"): d1-3 get
// lit kit structures, d4-6 get dark blocked-out silhouettes hard toward the rim.
function buildRing(d: number, anchorName: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `ring-${d}-${RING_NAMES[d]}`;
  const radiusWU = displayRadius(d) * R_SEA;         // legible spacing (display-only)
  const trueR = ringRadius(d);                        // the CANONICAL tanh radius (readout)
  const dense = d <= 3;
  const hue = (fnv1a(anchorName) % 360) / 360;

  // the ring band (annulus) on the sea — brighter inward, fading to silhouette
  const band = new THREE.Mesh(
    new THREE.RingGeometry(radiusWU - 3, radiusWU + 3, 128),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, dense ? 0.5 : 0.25, dense ? 0.42 : 0.2),
      roughness: 0.9, transparent: true, opacity: dense ? 0.85 : 0.6,
      emissive: new THREE.Color().setHSL(hue, 0.6, 0.25), emissiveIntensity: dense ? 0.5 : 0.2,
    }),
  );
  band.rotation.x = -Math.PI / 2; band.position.y = -0.3; g.add(band);

  // scatter structures around the ring (deterministic — SeededRng(fnv1a(anchor)))
  const rng = new SeededRng(fnv1a(anchorName + ':' + d));
  const count = dense ? 10 - d : 6;                   // fewer + coarser outward
  const structScale = 1 + d * 0.9;                    // outer scale-models read bigger
  for (let i = 0; i < count; i++) {
    const t = (i / count) + (rng.next() - 0.5) * 0.04;
    const a = t * Math.PI * 2;
    const rr = radiusWU + (rng.next() - 0.5) * 5;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    let item: THREE.Object3D;
    if (d === 1 || d === 2) {                          // house / neighborhood: kit houses
      item = buildHouse(hue, rng);
    } else if (d === 3) {                              // city: kit towers (classic materials)
      item = buildTower(hue, rng);
    } else {                                           // state/country/earth: BLOCKED-OUT silhouettes
      item = buildSilhouette(d, rng);
    }
    item.position.set(x, 0, z);
    item.rotation.y = a + Math.PI;
    item.scale.multiplyScalar(structScale * (0.7 + rng.next() * 0.5));
    g.add(item);
  }

  // ring label: the typed anchor + the HONEST tanh radius (place.ts is the truth)
  const label = makeLabel(`${RING_NAMES[d]}: ${anchorName || '—'}  ·  r=${trueR.toFixed(d < 3 ? 3 : 5)}`,
    hue, 1 + d * 0.35);
  label.position.set(0, 6 + d * 2, -radiusWU);
  g.add(label);
  return g;
}

/** a small kit house (dense/known fill) — gable roof on a walled box. */
function buildHouse(hue: number, rng: SeededRng): THREE.Group {
  const g = new THREE.Group();
  const w = 3 + rng.next() * 2, dp = 3 + rng.next() * 2, h = 2.4 + rng.next() * 1.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.35, 0.5), roughness: 0.9 }));
  body.position.y = h / 2; body.castShadow = true; g.add(body);
  const roof = gableRoof(w * 1.05, dp * 1.05, 1.6, 0.3, { color: 0x7a3b2a, rough: 0.85 });
  roof.position.y = h; g.add(roof);
  return g;
}

/** a kit city TOWER (dense/known city fill) — a tall box + lit window rows. */
function buildTower(hue: number, rng: SeededRng): THREE.Group {
  const g = new THREE.Group();
  const w = 3 + rng.next() * 2, dp = 3 + rng.next() * 2, h = 8 + rng.next() * 10;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.25, 0.4), roughness: 0.85 }));
  body.position.y = h / 2; body.castShadow = true; g.add(body);
  const rows = Math.max(2, Math.floor(h / 3));
  for (let r = 0; r < rows; r++) {
    const pane = windowPane(w * 0.7, 0.9, { color: 0xffe6a0, rough: 0.3, glow: 1.4 });
    pane.position.set(0, 2 + r * (h / rows), dp / 2 + 0.05); g.add(pane);
  }
  return g;
}

/** a BLOCKED-OUT silhouette (unknown/coarse fill): a dark featureless mass —
 *  fidelity honest by construction (the outer world we know least is drawn least). */
function buildSilhouette(d: number, rng: SeededRng): THREE.Mesh {
  const w = 4 + rng.next() * 6, h = 6 + d * 3 + rng.next() * 8, dp = 4 + rng.next() * 6;
  const dark = 0.16 - d * 0.015;                       // darker toward the rim
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.6, 0.12, Math.max(0.05, dark)), roughness: 1 }));
  m.position.y = h / 2; m.castShadow = true;
  return m;
}

// ── build the full concentric world from the typed anchors ───────────────────
interface Anchors { room: string; house: string; neighborhood: string; city: string; state: string; country: string; earth: string; }
let world: THREE.Group | null = null;
let laptop: THREE.Object3D | null = null;
const ringReadout: string[] = [];

function buildWorld(anchors: Anchors): void {
  if (world) { scene.remove(world); }
  world = new THREE.Group(); world.name = 'world-dual';
  ringReadout.length = 0;
  world.add(buildAstralSea());

  // ── RING 0 = the ROOM (life-size, full res) — reuse buildInterior (room +
  //    the avatar figure center-stage + exit door). This IS the "you-dual". ──
  const skills = (anchors.room || 'home').split(/\s+/).slice(0, 4).filter(Boolean);
  const room = buildInterior({ agent: anchors.room || 'you', loadout: { systemPrompt: '', skills, mcps: ['world-dual'] } });
  room.name = 'ring-0-room';
  world.add(room);
  // the in-game laptop, on a desk against the room's back wall
  laptop = buildLaptop();
  laptop.position.set(6.5, 0, -6.5);
  laptop.rotation.y = Math.PI * 0.75;
  room.add(laptop);
  ringReadout.push(`0 room: "${anchors.room || 'you'}"  r=0.000 (center, life-size)`);

  // ── RINGS 1..6 — concentric, placed on the disk (r = tanh(k·d/2)) ──────────
  const names: (keyof Anchors)[] = ['house', 'neighborhood', 'city', 'state', 'country', 'earth'];
  for (let d = 1; d <= MAX_RING; d++) {
    const nm = anchors[names[d - 1]!];
    world.add(buildRing(d, nm || RING_NAMES[d]!));
    ringReadout.push(`${d} ${RING_NAMES[d]}: "${nm || '—'}"  r=${ringRadius(d).toFixed(5)}  gap=${rimGap(d).toExponential(2)}`);
  }
  scene.add(world);
  setMode('character', true);
  refreshHud();
}

// ── the three altitudes (character inhabit → world overseer → god zoom-out) ──
type Mode = 'character' | 'world' | 'god';
const CAM: Record<Mode, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  character: { pos: new THREE.Vector3(-1, 4.4, 11), tgt: new THREE.Vector3(5, 2.6, -4) },   // in the room, looking at the laptop
  world:     { pos: new THREE.Vector3(0, 90, 150),  tgt: new THREE.Vector3(0, 0, 0) },       // overseer: room + inner rings
  god:       { pos: new THREE.Vector3(0, 470, 360), tgt: new THREE.Vector3(0, 0, 0) },       // GOD screen: the full disk zoom-out
};
let mode: Mode = 'character';
let from = { pos: CAM.character.pos.clone(), tgt: CAM.character.tgt.clone() };
let toCam = { pos: CAM.character.pos.clone(), tgt: CAM.character.tgt.clone() };
const curTgt = CAM.character.tgt.clone();
let tMove = 1;                                          // 0→1 transition progress (1 = settled)

function setMode(m: Mode, instant = false): void {
  mode = m;
  from = { pos: camera.position.clone(), tgt: curTgt.clone() };
  toCam = { pos: CAM[m].pos.clone(), tgt: CAM[m].tgt.clone() };
  tMove = instant ? 1 : 0;
  if (instant) { camera.position.copy(toCam.pos); curTgt.copy(toCam.tgt); camera.lookAt(curTgt); }
  refreshHud();
}

// ── HUD: the strange-loop steps + the per-ring tanh readout ──────────────────
const STEPS: { m: Mode; label: string }[] = [
  { m: 'character', label: '1 · character in the virtualized ROOM' },
  { m: 'world', label: '2 · USE LAPTOP → enter the WORLD (overseer)' },
  { m: 'god', label: '3 · GOD screen — the astral view (full zoom-out)' },
];
function refreshHud(): void {
  const steps = STEPS.map((s) => `${s.m === mode ? '▶' : '  '} ${s.label}`).join('\n');
  status.innerHTML =
    `<b>WORLD-DUAL v1</b> — inside-out concentric scale-model (r = tanh(k·d/2), k=ln16)\n` +
    `mode: <b>${mode.toUpperCase()}</b>\n\n${steps}\n\n` +
    `concentric anchors (canonical Poincaré radius — place.ts):\n` +
    ringReadout.map((r) => '  ' + r).join('\n') +
    `\n\n[keys] 1 room · 2 world · 3 god · click the glowing laptop to enter · R regenerate`;
}

// ── interaction: click the laptop to enter the world (the strange loop) ──────
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => {
  if (!world) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(world.children, true);
  const laptopHit = hits.find((h) => h.object.userData.laptop);
  if (laptopHit && mode === 'character') { setMode('world'); pulseLoop(); }
});
window.addEventListener('keydown', (e) => {
  if (e.key === '1') setMode('character');
  else if (e.key === '2') setMode('world');
  else if (e.key === '3') setMode('god');
  else if (e.key.toLowerCase() === 'r') startFromForm();
});

// the strange loop: after landing on GOD, a soft cue that the deity IS the user
let loopPulse = 0;
function pulseLoop(): void { loopPulse = 1; }

// ── the typed-anchor FORM (OM-style info page — the ingest surface) ──────────
function startFromForm(): void {
  const get = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
  buildWorld({
    room: get('a-room'), house: get('a-house'), neighborhood: get('a-neighborhood'),
    city: get('a-city'), state: get('a-state'), country: get('a-country'), earth: get('a-earth'),
  });
  (document.getElementById('anchor-form') as HTMLElement).style.display = 'none';
}
(document.getElementById('generate') as HTMLElement | null)?.addEventListener('click', startFromForm);
(document.getElementById('open-form') as HTMLElement | null)?.addEventListener('click', () => {
  (document.getElementById('anchor-form') as HTMLElement).style.display = 'block';
});
document.querySelectorAll('[data-mode]').forEach((b) => {
  b.addEventListener('click', () => setMode((b as HTMLElement).dataset.mode as Mode));
});

// ── the render loop (camera transitions accumulate dt — no Date/Math.random) ──
const clock = new THREE.Clock();
function smooth(t: number): number { return t * t * (3 - 2 * t); }
/** ONE frame: advance the camera transition by dt, then render. Exposed as
 *  __step so a headless pane (which throttles/pauses rAF — the glbtest trap) can
 *  drive the transition deterministically for verification. */
function step(dt: number): void {
  if (tMove < 1) {
    tMove = Math.min(1, tMove + dt / 1.3);            // ~1.3s eased transition
    const e = smooth(tMove);
    camera.position.lerpVectors(from.pos, toCam.pos, e);
    curTgt.lerpVectors(from.tgt, toCam.tgt, e);
    camera.lookAt(curTgt);
  }
  if (mode === 'god') { loopPulse = Math.max(0, loopPulse - dt * 0.4); }
  renderer.render(scene, camera);
}
function loop(): void { step(clock.getDelta()); requestAnimationFrame(loop); }
loop();

window.addEventListener('resize', () => {
  const { w, h } = viewport();
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
});

// ── boot: seed the form with an example so the page renders a world immediately ──
buildWorld({
  room: 'my studio', house: 'the flat', neighborhood: 'riverside', city: 'portland',
  state: 'oregon', country: 'usa', earth: 'earth',
});
setMode('character', true);

// debug handles for browser verification (headless panes throttle rAF)
Object.assign(window as unknown as Record<string, unknown>, {
  __setMode: (m: Mode) => setMode(m),
  __rings: () => ringReadout,
  __ringRadius: ringRadius,
  __rebuild: startFromForm,
  // settle the current transition (drive N frames of ~stepMs each) — for headless
  // verification where rAF is throttled; also renders each step.
  __settle: (frames = 30, stepMs = 60) => { for (let i = 0; i < frames; i++) step(stepMs / 1000); },
});
