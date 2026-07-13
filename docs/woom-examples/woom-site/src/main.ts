/**
 * WOOM SITE — the public marketing shell (community-funnel landing).
 *
 * Wraps the VERIFIED WORLD-DUAL astral scene (examples/rts/src/worldtest.ts,
 * browser-verified per examples/rts/.claude/rules/worlddual_states.md) in a
 * cinematic marketing hero. It REUSES the same PURE pieces worldtest uses —
 * render/src/astral/place.ts (the Poincaré disk math), interior.ts (the room +
 * avatar), kit/parts.ts (procedural structures) — and touches ZERO engine code.
 * The scene-build functions below are adapted from worldtest.ts (its scene is
 * the proven reference impl); the DIVERGENCE is marketing-only: no debug HUD,
 * a slow auto-orbit that hands off to OrbitControls on first input, a scripted
 * GOD→WORLD→CHARACTER "descend" reveal, and an email velvet-rope.
 *
 * PURE (DESIGN law 5): no Date.now / Math.random — scatter uses SeededRng keyed
 * by fnv1a(anchor); camera transitions/orbit accumulate the render clock's dt.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SeededRng } from '../../../kernel/src/clock.js';
import {
  RING_NAMES, MAX_RING, ringRadius, displayRadius, anchorAngleTurns, fnv1a,
} from '../../../render/src/astral/place.js';
import { buildInterior } from '../../../render/src/three/interior.js';
import { floorSlab, gableRoof, windowPane, column } from '../../../render/src/three/kit/parts.js';
import { mountCreateScreen } from '../../rts/src/create.js';   // the REAL WOOM character-select
import { mountMockChat } from './mockchat.js';                 // the mocked in-world funnel chat
import {
  geocode, fetchOSM, project, centroid, heightOf, isBuilding, type OSMWay,
} from '../../shared/geo.js';

// The WOOM concentric story: you at the center, your world in rings outward
// (workshop → world). These are the typed anchors the disk places at
// r = tanh(k·d/2); the labels are evocative marketing copy over the same math.
const ANCHORS = {
  room: 'your workshop',
  house: 'your craft',
  neighborhood: 'your guild',
  city: 'the market',
  state: 'the economy',
  country: 'the sanctuary',
  earth: 'the world',
} as const;
const RING_ANCHORS: readonly string[] = [
  ANCHORS.house, ANCHORS.neighborhood, ANCHORS.city,
  ANCHORS.state, ANCHORS.country, ANCHORS.earth,
];

// ── scene scaffold (classic WebGLRenderer — the proven worldtest path) ────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
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
scene.background = new THREE.Color(0x070a12);          // astral night
scene.fog = new THREE.FogExp2(0x070a12, 0.0015);
const camera = new THREE.PerspectiveCamera(46, viewport().w / viewport().h, 0.1, 4000);

scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x1a1410, 0.9));
const sun = new THREE.DirectionalLight(0xffe6c0, 1.9);
sun.position.set(80, 220, 120); sun.castShadow = true;
scene.add(sun);
// a cool astral fill from below-front so rim silhouettes read against the dark
const fill = new THREE.DirectionalLight(0x4f78d8, 0.5);
fill.position.set(-60, 40, -120);
scene.add(fill);

// ── the astral SEA (the disk as a plane) — adapted from worldtest ─────────────
const R_SEA = 300;
function buildAstralSea(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'astral-sea';
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(R_SEA, 96),
    new THREE.MeshStandardMaterial({ color: 0x0c1526, roughness: 0.85, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.4; sea.receiveShadow = true;
  g.add(sea);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R_SEA, 1.6, 8, 128),
    new THREE.MeshStandardMaterial({ color: 0x6fb0ff, emissive: 0x2b6bd6, emissiveIntensity: 2.4, roughness: 0.4 }),
  );
  rim.rotation.x = -Math.PI / 2; rim.position.y = -0.35;
  g.add(rim);
  return g;
}

// ── a text label sprite (pure canvas texture) — adapted from worldtest ────────
function makeLabel(text: string, hue = 0.58, scale = 1): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(8,12,22,0.72)'; ctx.fillRect(0, 0, 512, 128);
  const col = new THREE.Color().setHSL(hue, 0.7, 0.72);
  ctx.strokeStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`;
  ctx.lineWidth = 4; ctx.strokeRect(2, 2, 508, 124);
  ctx.fillStyle = '#eef4ff'; ctx.font = 'bold 44px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(32 * scale, 8 * scale, 1);
  return spr;
}

// ── the in-game LAPTOP item (the dual of the real device) — from worldtest ────
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
  g.traverse((o) => { o.userData.laptop = true; });
  return g;
}

// ── ONE concentric ring — adapted from worldtest (detail coarsens outward) ────
function buildRing(d: number, anchorName: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `ring-${d}-${RING_NAMES[d]}`;
  const radiusWU = displayRadius(d) * R_SEA;
  const dense = d <= 3;
  const hue = (fnv1a(anchorName) % 360) / 360;

  const band = new THREE.Mesh(
    new THREE.RingGeometry(radiusWU - 3, radiusWU + 3, 128),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, dense ? 0.5 : 0.25, dense ? 0.42 : 0.2),
      roughness: 0.9, transparent: true, opacity: dense ? 0.85 : 0.6,
      emissive: new THREE.Color().setHSL(hue, 0.6, 0.25), emissiveIntensity: dense ? 0.5 : 0.2,
    }),
  );
  band.rotation.x = -Math.PI / 2; band.position.y = -0.3; g.add(band);

  const rng = new SeededRng(fnv1a(anchorName + ':' + d));
  const count = dense ? 10 - d : 6;
  const structScale = 1 + d * 0.9;
  const baseAngle = anchorAngleTurns(anchorName) * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const t = (i / count) + (rng.next() - 0.5) * 0.04;
    const a = baseAngle + t * Math.PI * 2;
    const rr = radiusWU + (rng.next() - 0.5) * 5;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    let item: THREE.Object3D;
    if (d === 1 || d === 2) item = buildHouse(hue, rng);
    else if (d === 3) item = buildTower(hue, rng);
    else item = buildSilhouette(d, rng);
    item.position.set(x, 0, z);
    item.rotation.y = a + Math.PI;
    item.scale.multiplyScalar(structScale * (0.7 + rng.next() * 0.5));
    g.add(item);
  }

  const label = makeLabel(anchorName, hue, 1 + d * 0.35);
  label.position.set(0, 6 + d * 2, -radiusWU);
  g.add(label);
  return g;
}

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

function buildSilhouette(d: number, rng: SeededRng): THREE.Mesh {
  const w = 4 + rng.next() * 6, h = 6 + d * 3 + rng.next() * 8, dp = 4 + rng.next() * 6;
  const dark = 0.16 - d * 0.015;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.6, 0.12, Math.max(0.05, dark)), roughness: 1 }));
  m.position.y = h / 2; m.castShadow = true;
  return m;
}

// ── THE NESTING (outer → inner), corrected 2026-07-12 ─────────────────────────
// Your REAL room sits in your REAL neighbourhood. In the room is a laptop. INSIDE
// the laptop is the WOOM astral world (the game). You DESCEND into the computer to
// reach the astral view — it is the INNERMOST layer, never floating above reality.
//   neighbourhood (real, overhead) → room (real, inside) → [laptop] → game (astral)

// (1) the REAL scene — your workshop + laptop (+ the OSM neighbourhood on situate)
const realScene = new THREE.Group(); realScene.name = 'real';
const roomSkills = ANCHORS.room.split(/\s+/).slice(0, 4).filter(Boolean);
const room = buildInterior({ agent: ANCHORS.room, loadout: { systemPrompt: '', skills: roomSkills, mcps: ['woom'] } });
room.name = 'ring-0-room';
const laptop = buildLaptop();
laptop.position.set(6.5, 0, -6.5);
laptop.rotation.y = Math.PI * 0.75;
room.add(laptop);
realScene.add(room);
scene.add(realScene);

// (2) the ASTRAL scene — the WOOM game world that lives INSIDE the laptop
const astralScene = new THREE.Group(); astralScene.name = 'astral';
astralScene.add(buildAstralSea());
for (let d = 1; d <= MAX_RING; d++) astralScene.add(buildRing(d, RING_ANCHORS[d - 1]!));
{ // a soft central glow = "you", at the heart of your work-world
  const core = new THREE.PointLight(0x8fe6ff, 2.4, 160); core.position.set(0, 12, 0); astralScene.add(core);
}
astralScene.visible = false;   // hidden until you dive into the laptop
scene.add(astralScene);

// ── the nesting LEVELS (outer → inner), not "altitudes" ───────────────────────
type Level = 'neighborhood' | 'room' | 'game';
const CAM: Record<Level, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  neighborhood: { pos: new THREE.Vector3(0, 90, 150),  tgt: new THREE.Vector3(0, 0, 0) },
  room:         { pos: new THREE.Vector3(-9, 5.5, 10), tgt: new THREE.Vector3(3, 2.2, -4) },
  game:         { pos: new THREE.Vector3(0, 320, 300), tgt: new THREE.Vector3(0, 0, 0) }, // inside the laptop = the astral sea
};
let mode: Level = 'room';
const STAGE_CAPTION: Record<Level, string> = {
  neighborhood: 'your neighborhood',
  room: 'your workshop',
  game: 'inside WOOM',
};
// real world shows for neighbourhood/room; the astral game shows only INSIDE the laptop
function setScene(level: Level): void {
  const inGame = level === 'game';
  astralScene.visible = inGame;
  realScene.visible = !inGame;
}

// ── OrbitControls (the click-to-interact free look, handed control on grab) ───
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 40;
controls.maxDistance = 900;
controls.maxPolarAngle = Math.PI * 0.49;   // stay above the floor
controls.enabled = false;                   // off during the cinematic auto-orbit

// camera transition state (scripted level transitions)
let from = { pos: CAM.room.pos.clone(), tgt: CAM.room.tgt.clone() };
let toCam = { pos: CAM.room.pos.clone(), tgt: CAM.room.tgt.clone() };
const curTgt = new THREE.Vector3(0, 3, 0);
let tMove = 1;

// ── the cinematic: a slow grounded auto-orbit around your workshop until first input
let cinematic = true;
let orbitAngle = 0;
const ORBIT_RADIUS = 42;
const ORBIT_HEIGHT = 24;
const ORBIT_TARGET = new THREE.Vector3(0, 3, 0);
setScene('room');
camera.position.set(0, ORBIT_HEIGHT, ORBIT_RADIUS); camera.lookAt(ORBIT_TARGET);

const stageEl = document.getElementById('stage') as HTMLElement;
const heroEl = document.getElementById('hero') as HTMLElement;

function showStage(): void {
  stageEl.textContent = STAGE_CAPTION[mode];
  stageEl.style.opacity = '1';
  clearTimeout((showStage as unknown as { t?: number }).t);
  (showStage as unknown as { t?: number }).t = window.setTimeout(() => { stageEl.style.opacity = '0'; }, 2200);
}

function setMode(m: Level): void {
  mode = m;
  from = { pos: camera.position.clone(), tgt: curTgt.clone() };
  toCam = { pos: CAM[m].pos.clone(), tgt: CAM[m].tgt.clone() };
  tMove = 0;
  showStage();
}

/** Stop the auto-orbit and hand control to the visitor (OrbitControls). Called
 *  on the first genuine interaction (pointer/wheel/descend). */
function handOffControl(): void {
  if (!cinematic) return;
  cinematic = false;
  controls.target.copy(curTgt);
  controls.enabled = true;
  controls.update();
}

// the portal flash — covers the real↔astral scene swap when you enter/leave the laptop
const fadeEl = document.getElementById('fade') as HTMLElement;
function flash(): void {
  fadeEl.classList.add('flash');
  window.setTimeout(() => fadeEl.classList.remove('flash'), 300);
}

// ── the WIZARD — the guided next-step control (replaces the tiny hint button) ──
// Always shows the NEXT move, walking the NESTING: neighbourhood → room → [laptop]
// → game (the astral world INSIDE the computer) → back out.
const wizardEl = document.getElementById('wizard') as HTMLElement;
const wizTitle = document.getElementById('wiz-title') as HTMLElement;
const wizPlace = document.getElementById('wiz-place') as HTMLElement;
const wizSub = document.getElementById('wiz-sub') as HTMLElement;
const wizAction = document.getElementById('wiz-action') as HTMLButtonElement;

const WIZARD: Record<Level, { title: string; sub: string; action: string; next: Level }> = {
  neighborhood: { title: 'Your neighborhood', sub: 'Your real street, made astral.',          action: 'Enter your workshop ↓', next: 'room' },
  room:         { title: 'Your workshop',     sub: 'On the desk is your laptop — open it.',    action: 'Open the laptop → enter WOOM', next: 'game' },
  game:         { title: 'Inside WOOM',        sub: 'The living world you build from your work.', action: 'Leave the laptop ↑',    next: 'room' },
};
let situatedPlace = '';

function renderWizard(): void {
  const w = WIZARD[mode];
  wizTitle.textContent = w.title;
  wizPlace.textContent = mode === 'game' ? '' : situatedPlace;
  wizPlace.style.display = wizPlace.textContent ? 'block' : 'none';
  wizSub.textContent = w.sub;
  wizAction.textContent = w.action;
}
function showWizard(): void { renderWizard(); wizardEl.classList.add('show'); }

function goTo(m: Level): void {
  handOffControl();
  controls.enabled = false;
  const crossesLaptop = (m === 'game') !== (mode === 'game');
  if (crossesLaptop) {
    // diving INTO or OUT OF the laptop → flash-cover the scene swap + snap the camera
    flash();
    setScene(m);
    mode = m;
    from = { pos: CAM[m].pos.clone(), tgt: CAM[m].tgt.clone() };
    toCam = { pos: CAM[m].pos.clone(), tgt: CAM[m].tgt.clone() };
    curTgt.copy(CAM[m].tgt);
    camera.position.copy(CAM[m].pos); camera.lookAt(curTgt);
    tMove = 1;
    controls.target.copy(curTgt); controls.enabled = true; controls.update();
    showStage();
  } else {
    setScene(m);
    setMode(m);   // smooth lerp for same-scene moves (neighbourhood ↔ room)
  }
  renderWizard();
}
// from the workshop, "enter WOOM" opens the REAL game front-end (char-select),
// not the astral world directly. Everywhere else the wizard just walks the levels.
wizAction.addEventListener('click', () => {
  if (mode === 'room') openWoom();
  else goTo(WIZARD[mode].next);
});

// ── INSIDE THE LAPTOP = the real WOOM game: char-select → Enter World → mocked chat ──
let teardownChat: (() => void) | null = null;

/** Open the laptop → the WOOM character-select screen (the actual game front-end). */
function openWoom(): void {
  handOffControl();
  controls.enabled = false;
  wizardEl.classList.remove('show');   // the game UI takes over from the guide
  flash();
  mountCreateScreen({
    onEnter: (r) => enterWorld(r.name),
    onSkip: () => enterWorld(null),
  });
}

/** Enter World → the frozen astral world as backdrop + the mocked in-world conversation. */
function enterWorld(character: string | null): void {
  flash();
  setScene('game');
  mode = 'game';
  from = { pos: CAM.game.pos.clone(), tgt: CAM.game.tgt.clone() };
  toCam = { pos: CAM.game.pos.clone(), tgt: CAM.game.tgt.clone() };
  curTgt.copy(CAM.game.tgt);
  camera.position.copy(CAM.game.pos); camera.lookAt(curTgt);
  tMove = 1;
  controls.target.copy(curTgt); controls.enabled = true; controls.update();
  showStage();
  teardownChat = mountMockChat({ character, onLeave: leaveWoom });
}

/** "← leave" from the chat → tear it down + return to the workshop. */
function leaveWoom(): void {
  if (teardownChat) { teardownChat(); teardownChat = null; }
  goTo('room');
  showWizard();
}

// clicking the glowing laptop while in the workshop OPENS WOOM (same as the wizard)
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => {
  handOffControl();
  if (mode !== 'room') return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(realScene.children, true);
  if (hits.find((h) => h.object.userData.laptop)) openWoom();
});
// any drag / wheel grabs the cinematic and hands off to free look
canvas.addEventListener('wheel', handOffControl, { passive: true });

// ── email velvet-rope (the community funnel capture) ──────────────────────────
const emailEl = document.getElementById('email') as HTMLInputElement;
const enterBtn = document.getElementById('enter') as HTMLButtonElement;
const noteEl = document.getElementById('note') as HTMLElement;
async function submitEmail(): Promise<void> {
  const email = emailEl.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    noteEl.className = ''; noteEl.textContent = 'Enter a valid email to request entry.';
    return;
  }
  enterBtn.disabled = true;
  // AUTO-SITUATE on entry: if they typed an address but never hit "Situate",
  // requesting entry situates their world for them (the payoff shouldn't be gated
  // behind a second button). No address typed → we just capture + hand to the wizard.
  if (!realWorld && placeEl.value.trim()) {
    noteEl.className = ''; noteEl.textContent = 'Situating your world…';
    await situate();
  }
  // v1 velvet-rope: persist locally + confirm. TODO: POST to the real waitlist
  // endpoint when the WOOM backend exists (mirror the terminal-funnel capture).
  try { localStorage.setItem('woom_waitlist', email); } catch { /* private mode */ }
  noteEl.className = 'ok';
  noteEl.textContent = '◎ You\'re on the list. The astral gate opens for the founding circle soon.';
  emailEl.disabled = true; enterBtn.textContent = 'Requested ✓';
  // the funnel is done → get the form OUT of the way, hand off to the wizard
  window.setTimeout(() => { heroEl.classList.add('done'); showWizard(); }, 1000);
}
enterBtn.addEventListener('click', () => void submitEmail());
emailEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submitEmail(); });

// ── FUSION: situate the world on a REAL street (free OSM geodata) ─────────────
// The neighbourhood ring stops being a SeededRng scatter and becomes the
// visitor's ACTUAL neighbourhood — OSM building footprints (shared/geo.ts, the
// free Nominatim+Overpass pipeline) projected + scaled onto the astral sea, in
// the astral aesthetic (dark masses, glowing rim edges). "Your room" = the
// building nearest the (cleared) centre, where your workshop interior sits.
const NEIGH_FIT = 240;    // scaled neighbourhood radius (inside the R_SEA=300 rim)
const CENTER_CLEAR = 42;  // your workshop OWNS this central radius (buildings ring around it)
let realWorld: THREE.Group | null = null;

const neighBody = new THREE.MeshStandardMaterial({ color: 0x18233c, roughness: 0.9, metalness: 0.05 });
const neighEdge = new THREE.LineBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: 0.5 });

function buildRealNeighborhood(ways: OSMWay[], lat0: number, lon0: number): { group: THREE.Group; buildings: number } {
  const g = new THREE.Group(); g.name = 'real-neighborhood';
  const foot: Array<{ pts: Array<[number, number]>; tags: Record<string, string> }> = [];
  for (const w of ways) {
    if (!isBuilding(w)) continue;
    foot.push({ pts: w.geometry!.map((p) => project(p.lat, p.lon, lat0, lon0)), tags: w.tags ?? {} });
  }
  if (!foot.length) return { group: g, buildings: 0 };
  let maxE = 1;
  for (const f of foot) for (const [x, z] of f.pts) maxE = Math.max(maxE, Math.hypot(x, z));
  const scale = NEIGH_FIT / maxE;

  let n = 0;
  for (const f of foot) {
    const spts = f.pts.map(([x, z]) => [x * scale, z * scale] as [number, number]);
    const [cx, cz] = centroid(spts);
    if (Math.hypot(cx, cz) < CENTER_CLEAR) continue; // your workshop owns the centre
    const shape = new THREE.Shape();
    shape.moveTo(spts[0]![0], spts[0]![1]);
    for (let i = 1; i < spts.length; i++) shape.lineTo(spts[i]![0], spts[i]![1]);
    shape.closePath();
    const h = Math.max(3, heightOf(f.tags) * scale * 1.4);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // shape XZ ground + extrude Z → stand up along Y
    const mesh = new THREE.Mesh(geo, neighBody);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), neighEdge));
    g.add(mesh);
    n++;
  }
  // "your room" = YOUR WORKSHOP at the CENTRE (origin) — a beacon above it, so the
  // real neighbourhood rings AROUND you (the concentric world-dual, made real).
  const beacon = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 6),
    new THREE.MeshStandardMaterial({ color: 0x8fe6ff, emissive: 0x2b6bd6, emissiveIntensity: 1.8, roughness: 0.4 }));
  beacon.position.set(0, 34, 0); beacon.rotation.x = Math.PI; g.add(beacon);
  const glow = new THREE.PointLight(0x8fe6ff, 2.2, 130); glow.position.set(0, 22, 0); g.add(glow);
  return { group: g, buildings: n };
}

const placeEl = document.getElementById('place') as HTMLInputElement;
const situateBtn = document.getElementById('situate-btn') as HTMLButtonElement;
const geonoteEl = document.getElementById('geonote') as HTMLElement;
function setGeo(msg: string, cls = ''): void { geonoteEl.className = cls; geonoteEl.textContent = msg; }
function shortPlace(name: string): string { return name.split(',').slice(0, 3).join(',').trim(); }

// one retry on transient failure — Nominatim/Overpass can rate-limit or drop the
// first cold call (this was the "had to situate twice" bug).
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch { await new Promise((r) => window.setTimeout(r, 800)); return await fn(); }
}

async function situate(): Promise<void> {
  const q = placeEl.value.trim();
  if (!q) { setGeo('Type your address or city first.', 'err'); return; }
  const prevLabel = situateBtn.textContent || 'Situate my world ◎';
  situateBtn.disabled = true; situateBtn.textContent = 'Locating…';
  try {
    setGeo('Locating your place (free OpenStreetMap)…');
    const loc = await withRetry(() => geocode(q));
    setGeo(`◎ ${shortPlace(loc.name)}\nAssembling your neighborhood…`);
    const ways = await withRetry(() => fetchOSM(loc.lat, loc.lon, 300));
    const { group, buildings } = buildRealNeighborhood(ways, loc.lat, loc.lon);
    if (!buildings) { setGeo('No buildings mapped there — try a denser address/city.', 'err'); situateBtn.textContent = prevLabel; return; }
    // the real neighbourhood rings AROUND your workshop (both in the REAL scene)
    if (realWorld) realScene.remove(realWorld);
    realWorld = group; realScene.add(group);
    situatedPlace = `${shortPlace(loc.name)} · ${buildings} buildings`;
    setGeo(`◎ ${shortPlace(loc.name)} — ${buildings} buildings situated.`, 'ok');
    situateBtn.textContent = 'Re-situate ◎';
    heroEl.classList.add('compact');   // shrink the form out of the centre
    goTo('neighborhood');              // pull up to see your real neighbourhood
    showWizard();                      // the guided next-step takes over
  } catch (e) {
    setGeo(`✗ ${(e as Error).message} — try again.`, 'err');
    situateBtn.textContent = prevLabel;
  } finally {
    situateBtn.disabled = false;
  }
}
situateBtn.addEventListener('click', () => void situate());
placeEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') void situate(); });

// verification handle: situate synchronously-awaitable from the console
(window as unknown as Record<string, unknown>).__situate = situate;

// ── the render loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function frame(): void {
  const dt = clock.getDelta();
  if (cinematic) {
    // slow grounded orbit around your workshop
    orbitAngle += dt * 0.05;
    camera.position.set(Math.sin(orbitAngle) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.cos(orbitAngle) * ORBIT_RADIUS);
    curTgt.copy(ORBIT_TARGET);
    camera.lookAt(curTgt);
  } else if (tMove < 1) {
    // scripted mode transition (descend/ascend)
    tMove = Math.min(1, tMove + dt / 1.3);
    const e = smooth(tMove);
    camera.position.lerpVectors(from.pos, toCam.pos, e);
    curTgt.lerpVectors(from.tgt, toCam.tgt, e);
    camera.lookAt(curTgt);
    if (tMove >= 1) {
      // settle → give free look back to the visitor at this altitude
      controls.target.copy(curTgt);
      controls.enabled = true;
      controls.update();
    }
  } else if (controls.enabled) {
    controls.update();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => {
  const { w, h } = viewport();
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
});

// debug/verification handles (headless panes throttle rAF — drive N steps)
Object.assign(window as unknown as Record<string, unknown>, {
  __mode: () => mode,
  __cinematic: () => cinematic,
  __goTo: (m: Level) => goTo(m),
  __setMode: (m: Level) => { handOffControl(); controls.enabled = false; setScene(m); setMode(m); },
  __settle: (frames = 40, stepMs = 60) => {
    for (let i = 0; i < frames; i++) {
      if (tMove < 1) {
        tMove = Math.min(1, tMove + (stepMs / 1000) / 1.3);
        const e = smooth(tMove);
        camera.position.lerpVectors(from.pos, toCam.pos, e);
        curTgt.lerpVectors(from.tgt, toCam.tgt, e);
        camera.lookAt(curTgt);
      }
      renderer.render(scene, camera);
    }
  },
  __roomInfo: () => {
    const found = realScene.getObjectByName('ring-0-room');
    const room = found;
    if (!room) return { found: false };
    const box = new THREE.Box3().setFromObject(room);
    return { found: true, min: box.min.toArray().map((n) => +n.toFixed(1)), max: box.max.toArray().map((n) => +n.toFixed(1)) };
  },
  __camAt: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
    handOffControl(); controls.enabled = false;
    from = { pos: camera.position.clone(), tgt: curTgt.clone() };
    toCam = { pos: new THREE.Vector3(px, py, pz), tgt: new THREE.Vector3(tx, ty, tz) };
    tMove = 0;
    for (let i = 0; i < 40; i++) { tMove = Math.min(1, tMove + 0.06); const e = smooth(tMove); camera.position.lerpVectors(from.pos, toCam.pos, e); curTgt.lerpVectors(from.tgt, toCam.tgt, e); camera.lookAt(curTgt); renderer.render(scene, camera); }
    return 'ok';
  },
});
