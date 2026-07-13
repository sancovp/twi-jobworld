/**
 * GARB-GRAMMAR G1 TEST HARNESS (throwaway visual verification — NOT shipped
 * world code; mirrors lofttest.ts's structure/scene exactly).
 *
 * docs/GARB-GRAMMAR.md §8 G1 row: "a lofttest garb column — the 8 archetype
 * dresses (§4 per-domain) rendered on ONE topology, so the review seat can
 * eyeball them." ONE row of 8 columns, each the SAME Legacy-Golem-topology
 * loft body (buildLoftCreature — G1 does NOT touch creatures.ts/build.ts,
 * which is G2/G3's "world integration" scope, §8), wearing a different
 * archetype's PaintSpecV2 (§4 table, transcribed verbatim). The V2 atlas
 * (garb.ts's `paintAtlasV2`) replaces each skin's material with
 * `paintedMaterial(atlas)` — the SAME compose build.ts uses internally for
 * v1 `paint`, just assembled here since G1 doesn't touch build.ts's own
 * `paint?:PaintSpec` (v1-only) param.
 *
 * Backend: WebGPURenderer — WebGPU when available, WebGL2 fallback otherwise
 * (mirrors lofttest.ts/tsltest.ts). Deterministic (law 5): no Date.now/
 * Math.random; orbit time is frame-accumulated.
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { buildLoftCreature } from '../../../render/src/three/generators/loft/build.js';
import { CREATURE_TOPOLOGY } from '../../../render/src/three/generators/creatures.js';
import { snapToPalette } from '../../../render/src/three/kenney.js';
import { paintAtlasV2, validatePaintSpecV2, type PaintSpecV2 } from '../../../render/src/three/generators/loft/garb.js';
import { paintedMaterial } from '../../../render/src/three/generators/loft/paintedMaterial.js';

// ─────────────────────────────────────────────────────────────────────────
// THE 8 ARCHETYPE DRESSES (GARB-GRAMMAR §4 table, transcribed verbatim —
// `hue:ID` in the spec means "the agent's identity hue"; each archetype here
// gets its own ID hue so the row is 8 individuals, same discipline as
// lofttest's PAINT roster). Each validated through validatePaintSpecV2 before
// paint (K6 — the strict gate is load-bearing here too, not just fuzz-tested
// in isolation).
//
// GARB-GRAMMAR §1 law: garment HUE is identity, garment KIND is role. The
// spec's own K1 wording is "coverage×contrast profiles… readable at distance
// by dress alone" — kind/coverage carries the primary distinguishing signal,
// hue is secondary identity within it. NOTE (G1 build-time finding, see the
// final report's ambiguity note): `paintGarment`'s tone is
// `paletteHex(hue, sat, 0.5)` — a FIXED light=0.5 — and at that lightness
// kenney.ts's 12-entry PALETTE + THREE.Color's sRGB-encoded getHex() only
// reaches ~5 distinct snapped tones (sand #d9b382, gold #caa15a, limestone
// #c4b299, meadow #8fae5d, blue-grey #7f8fa6) regardless of which hue/sat is
// requested — verified empirically by sweeping hue 0..360 in-browser through
// the real `paletteHex`, not assumed from raw HSL math (raw HSL math alone
// UNDER-predicts collisions because THREE's getHex() gamma-encodes before
// the snap). The hues below are chosen from THAT verified reachable set so
// every archetype's garment tone is a real, confirmed palette entry (never
// an accidental base-tone no-op) — kind+coverage diversity (robe / plate+hood
// / tunic+apron / tunic+sash / apron-only) plus trim/state carries the rest of
// the K1 distinguishability, exactly as the spec's own distinguishability
// paragraph describes.
const ARCHETYPES: Record<string, PaintSpecV2> = {
  // "the ref-2 'red robe' read" — full-coverage robe, long hem + v-folds, collar + sigil.
  SCHOLAR: {
    base: { hue: 34, sat: 0.32 },
    garments: [{ kind: 'robe', hue: 120, sat: 0.5, folds: 5, hem: 0.08 }], // → meadow-green #8fae5d
    trim: [{ kind: 'collar' }, { kind: 'sigil', accent: true, glyph: 2 }],
    face: { eyes: 2, brow: 0.6, mouth: 0.5 },
  },
  // 3-step value-banded plate + hood + twin straps — highest-contrast, occluded face.
  WARDEN: {
    base: { hue: 210, sat: 0.16 },
    garments: [{ kind: 'plate', hue: 200, sat: 0.5 }, { kind: 'hood', hue: 200, sat: 0.5 }], // → blue-grey #7f8fa6
    straps: [{ v: 0.60, width: 0.06, buckle: true }, { v: 0.36, width: 0.06, buckle: true }],
    trim: [{ kind: 'sigil', accent: true, glyph: 5 }],
    state: [{ kind: 'frost', amount: 0.25 }],
  },
  // half-body front panel (apron) + belt — hard mid-torso edge, the worker read.
  GATEKEEPER: {
    base: { hue: 30, sat: 0.28 },
    garments: [{ kind: 'tunic', hue: 280, sat: 0.5 }, { kind: 'apron', hue: 0, sat: 0.85 }], // → limestone #c4b299 tunic / gold #caa15a apron
    straps: [{ v: 0.42, width: 0.07, buckle: true }],
    trim: [{ kind: 'bracers' }],
    state: [{ kind: 'grime', amount: 0.25 }],
    face: { eyes: 2, brow: 0.5, mouth: 0.5 },
  },
  SMITH: {
    base: { hue: 20, sat: 0.3 },
    garments: [{ kind: 'tunic', hue: 0, sat: 0.5 }, { kind: 'apron', hue: 0, sat: 0.85 }], // → sand #d9b382 tunic / gold #caa15a apron
    trim: [{ kind: 'bracers' }, { kind: 'sigil', accent: true, glyph: 9 }],
    state: [{ kind: 'scorch', amount: 0.25 }],
    face: { eyes: 2, brow: 0.7, mouth: 0.4 },
  },
  ARTISAN: {
    base: { hue: 280, sat: 0.2 },
    garments: [{ kind: 'tunic', hue: 200, sat: 0.5 }, { kind: 'sash', hue: 120, sat: 0.5 }], // → blue-grey #7f8fa6 tunic, meadow sash
    trim: [{ kind: 'sigil', accent: true, glyph: 12 }],
    face: { eyes: 2, brow: 0.5, mouth: 0.6 },
  },
  MINTER: {
    base: { hue: 45, sat: 0.25 },
    garments: [{ kind: 'apron', hue: 120, sat: 0.5 }], // → meadow-green #8fae5d apron (apron-only cut, distinct from GATEKEEPER/SMITH's gold apron)
    trim: [{ kind: 'girdle', accent: true }, { kind: 'sigil', accent: true, glyph: 15 }],
    face: { eyes: 2, brow: 0.4, mouth: 0.5 },
  },
  PROVER: {
    base: { hue: 150, sat: 0.2 },
    garments: [{ kind: 'tunic', hue: 280, sat: 0.5 }], // → limestone #c4b299 (tunic-only, no apron — vs GATEKEEPER's tunic+apron)
    trim: [{ kind: 'bracers' }],
    straps: [{ v: 0.55, width: 0.05 }, { v: 0.38, width: 0.05 }],
    state: [{ kind: 'grime', amount: 0.25 }],
    face: { eyes: 2, brow: 0.5, mouth: 0.5 },
  },
  // full-coverage robe + hood, softer contrast — SEEKER should still read
  // distinct from SCHOLAR at a glance (kind SAME [robe], but robe+HOOD vs
  // robe-alone, + hue/trim differ) — and K8: the face must still read
  // THROUGH the hood's window law.
  SEEKER: {
    base: { hue: 260, sat: 0.18 },
    garments: [{ kind: 'robe', hue: 200, sat: 0.5, folds: 3, hem: 0.05 }, { kind: 'hood', hue: 200, sat: 0.5 }], // → blue-grey #7f8fa6 robe+hood (vs SCHOLAR's meadow robe-alone, vs WARDEN's blue-grey PLATE+hood)
    trim: [{ kind: 'sigil', accent: true, glyph: 7 }],
    face: { eyes: 2, brow: 0.5, mouth: 0.4 },
  },
};

// K6 gate check (also exercised standalone in the build report) — fail loud
// in the harness console if a hand-authored archetype spec is malformed.
for (const [name, spec] of Object.entries(ARCHETYPES)) {
  const r = validatePaintSpecV2(spec);
  if (!r.ok) throw new Error(`[garbtest] ${name} spec FAILED validatePaintSpecV2: ${r.reason}`);
}

// ─────────────────────────────────────────────────────────────────────────
// SCENE — mirrors lofttest.ts so the comparison is apples-to-apples.
// ─────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f27);
scene.fog = new THREE.FogExp2(0x1a1f27, 0.008);
scene.add(new THREE.AmbientLight(0x99a6bb, 0.7));
const sun = new THREE.DirectionalLight(0xdfe6f0, 1.7);
sun.position.set(-8, 16, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6b7a99, 0.5);
fill.position.set(9, 6, -8);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd9a0, 0.6);
rim.position.set(2, 5, -12);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: snapToPalette(0x3a4030), roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── A text label as a canvas-texture sprite (self-contained, no asset). ─────
function label(text: string, colorHex = '#e9d8a6', px = 44, wide = 4.2): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.font = `600 ${px}px ui-monospace, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = colorHex; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(wide, wide * 96 / 512, 1);
  return sprite;
}

// ─────────────────────────────────────────────────────────────────────────
// LAYOUT — ONE ROW, 8 COLUMNS (one per archetype), all on the SAME topology
// (Legacy Golem's biped rig — a solid humanoid reference body, §8 "ONE
// topology"). Each column's hash is DIFFERENT (so the base/limb hash-jitter
// differs per column too, proving the paint — not the topology — carries
// role identity) but the TOPOLOGY (CREATURE_TOPOLOGY['Legacy Golem']) and
// PROPORTIONS are shared, unlike lofttest's per-creature topology roster.
// ─────────────────────────────────────────────────────────────────────────
const NAMES = Object.keys(ARCHETYPES);
const TOPOLOGY = CREATURE_TOPOLOGY['Legacy Golem']!;
const COL_SPACING = 4.4;
const plinthMat = new THREE.MeshStandardMaterial({ color: snapToPalette(0x9c9488), roughness: 0.95 });

let triTotal = 0;
NAMES.forEach((name, col) => {
  const x = (col - (NAMES.length - 1) / 2) * COL_SPACING;
  const cell = new THREE.Group();
  cell.position.set(x, 0, 0);
  scene.add(cell);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 20), plinthMat);
  plinth.position.y = 0.15;
  plinth.receiveShadow = true; plinth.castShadow = true;
  cell.add(plinth);

  // ONE topology, ONE hash-per-column (so figures differ only in hash-driven
  // jitter + paint, never body shape) — a fresh unpainted loft build, then
  // the V2 atlas is composed + assigned to every skin (mirrors build.ts's
  // own bodyMat=limbMat=painted(atlas) discipline for v1 paint).
  const hash = 40000 + col * 137; // arbitrary distinct per-column seeds
  const { group: fig, skins } = buildLoftCreature(TOPOLOGY, hash, undefined, undefined, undefined);
  const atlas = paintAtlasV2(ARCHETYPES[name]!, hash);
  const mat = paintedMaterial(atlas, { rough: 0.82 });
  for (const skin of skins) skin.material = mat;
  fig.position.y = 0.3;
  cell.add(fig);

  let tris = 0;
  fig.traverse((o) => {
    const m = o as THREE.Mesh;
    const g = m.geometry as THREE.BufferGeometry | undefined;
    if (g && g.index) tris += g.index.count / 3;
    else if (g && g.attributes.position) tris += g.attributes.position.count / 3;
  });
  triTotal += tris;

  const nm = label(name, '#e9d8a6', 34, 3.6);
  nm.position.set(0, 5.4, 0);
  cell.add(nm);
});

// ─────────────────────────────────────────────────────────────────────────
// CAMERA — a slow 3/4 orbit framing the whole row.
// ─────────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
const gridW = NAMES.length * COL_SPACING + 6;
const gridD = 6.4;
const center = new THREE.Vector3(0, 2.4, 0);

function fit(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', fit);

function frameDist(): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFit = gridW / (2 * Math.tan(vFov / 2) * camera.aspect);
  const vFit = gridD / (2 * Math.tan(vFov / 2));
  return Math.max(hFit, vFit) * 1.02 + gridD * 0.28;
}

let t = 0;
const control = { frozen: false, yaw: 0, dist: 0, height: 0.5 };
async function main(): Promise<void> {
  await renderer.init();
  const backendName = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback';
  const legend = document.getElementById('legend');
  if (legend) legend.textContent = `GARB-GRAMMAR G1 — 8 archetype dresses, ONE topology — backend: ${backendName}`;
  console.log(`[garbtest] backend = ${backendName}; ${NAMES.length} archetypes on 'Legacy Golem' topology; tri total = ${Math.round(triTotal)} (~${Math.round(triTotal / NAMES.length)}/figure).`);
  fit();
  renderer.setAnimationLoop(() => {
    if (!control.frozen) t += 0.0013;
    const dist = control.dist || frameDist();
    const yaw = control.yaw || Math.sin(t) * 0.18;
    camera.position.set(Math.sin(yaw) * dist, dist * control.height, Math.cos(yaw) * dist);
    camera.lookAt(center);
    renderer.render(scene, camera);
  });
}
void main();

(window as unknown as { garbtest: unknown }).garbtest = { scene, camera, renderer, ARCHETYPES, NAMES, control, center };
