/**
 * LOFT-ENGINE TEST HARNESS (throwaway visual verification — NOT shipped world
 * code; mirrors surfacetest.ts / tsltest.ts structure + scene).
 *
 * docs/LOFT-ENGINE.md L1: prove the rig + the loft. Four roster creatures, each
 * in THREE columns — [ BOX | CAPSULE | LOFT ] — from the SAME buildCreature over
 * the SAME topology, switching only `realize`. The LOFT column is a THREE.
 * Skeleton with a continuous superellipse-lofted SkinnedMesh per chain (flat
 * palette matte, L1); L2 paints its skin. The A/B is the whole point: LOFT must
 * strictly dominate BOX + CAPSULE (§9 kill-criteria).
 *
 * Backend: WebGPURenderer — WebGPU when available, WebGL2 fallback otherwise
 * (the header shows which), mirroring tsltest.ts's boot/fallback/label pattern.
 * SkinnedMesh works under both backends (instancing+skinning does NOT — we use
 * neither). Deterministic (law 5): no Date.now/Math.random; orbit time is
 * frame-accumulated.
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { buildCreatureByName } from '../../../render/src/three/generators/creatures.js';
import { snapToPalette } from '../../../render/src/three/kenney.js';
import type { PaintSpec } from '../../../render/src/three/generators/loft/painter.js';

// ─────────────────────────────────────────────────────────────────────────
// HAND-AUTHORED PAINTSPECS (L2) — one per creature, matching its canonical
// docs/AI-ASSET-GENERATION-PROMPTS.md §3 description. These are the same
// validated, typed spec instances the woom-edit paint_spec lane would emit.
// ─────────────────────────────────────────────────────────────────────────
const PAINT: Record<string, PaintSpec> = {
  // moss-green woad over stone-tan, a strap w/ buckle, a plain face.
  'Legacy Golem': {
    base: { hue: 34, sat: 0.30 },                        // stone-tan
    markings: { kind: 'woad', density: 0.7 },            // moss-green woad
    straps: [{ v: 0.42, width: 0.07, buckle: true }],    // belt on the skin
    face: { eyes: 2, brow: 0.8, mouth: 0.5 },
    wear: 0.25,
  },
  // pallid base, wear HIGH, stitches (the shambling undead).
  'Zombie Process': {
    base: { hue: 96, sat: 0.18 },                        // pallid sickly green
    cloth: { foldDir: 'v', foldCount: 4, hem: 0.12 },
    straps: [{ v: 0.5, width: 0.05 }],                   // a stitched seam band
    face: { eyes: 2, brow: 0.4, mouth: 0.7 },
    markings: { kind: 'stripes', density: 0.4 },
    wear: 0.85,                                          // wear high
  },
  // twin straps, NO face (a visor band across the head region instead).
  'Deadlock Sentinel': {
    base: { hue: 210, sat: 0.16 },                       // cold stone-blue
    straps: [
      { v: 0.6, width: 0.06, buckle: true },
      { v: 0.36, width: 0.06, buckle: true },
    ],
    // no `face` — the head reads as a visored sentinel (dark band, no eyes).
    wear: 0.35,
  },
  // twinSplit two-tone halves (the two u-halves painted differently), spots.
  'Merge Conflict': {
    base: { hue: 14, sat: 0.5 },                         // brick-red half
    twinSplit: { hue2: 150, sat2: 0.4 },                 // vs teal-green half
    markings: { kind: 'spots', density: 0.5 },
    face: { eyes: 2, brow: 0.6, mouth: 0.6 },
    wear: 0.2,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE — mirrors surfacetest.ts so the comparison is apples-to-apples.
// ─────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f27);
scene.fog = new THREE.FogExp2(0x1a1f27, 0.010);
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
// LAYOUT — one ROW per creature; three columns [box | capsule | loft], each on
// its own plinth, column-labeled once at row 0, creature-named at the row head.
// ─────────────────────────────────────────────────────────────────────────
const CREATURES = ['Legacy Golem', 'Zombie Process', 'Deadlock Sentinel', 'Merge Conflict'];
const COLS: Array<['BOX' | 'CAPSULE' | 'LOFT', 'box' | 'capsule' | 'loft']> = [
  ['BOX', 'box'], ['CAPSULE', 'capsule'], ['LOFT', 'loft'],
];
const COL_SPACING = 5.0;
const ROW_SPACING = 6.4;
const plinthMat = new THREE.MeshStandardMaterial({ color: snapToPalette(0x9c9488), roughness: 0.95 });

let triTotal = 0;
CREATURES.forEach((name, row) => {
  const z = (row - (CREATURES.length - 1) / 2) * ROW_SPACING;
  COLS.forEach(([colLabel, realize], col) => {
    const x = (col - (COLS.length - 1) / 2) * COL_SPACING;
    const cell = new THREE.Group();
    cell.position.set(x, 0, z);
    scene.add(cell);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 20), plinthMat);
    plinth.position.y = 0.15;
    plinth.receiveShadow = true; plinth.castShadow = true;
    cell.add(plinth);

    // L2: the LOFT column wears its hand-authored painted skin; BOX/CAPSULE
    // stay the flat matte so the A/B shows what the atlas buys.
    // `?nopaint` forces the LOFT column to the L1 matte so the RIGID eyes+jaw
    // (only built on the `!paint` path) are visible for GAN verification.
    const noPaint = new URLSearchParams(location.search).has('nopaint');
    const paint = (realize === 'loft' && !noPaint) ? PAINT[name] : undefined;
    const fig = buildCreatureByName(name, undefined, paint ? { realize, paint } : { realize });
    fig.position.y = 0.3;
    cell.add(fig);

    // count tris of the LOFT column (§9 budget: ≤3k tris/creature).
    if (realize === 'loft') {
      let tris = 0;
      fig.traverse((o) => {
        const m = o as THREE.Mesh;
        const g = m.geometry as THREE.BufferGeometry | undefined;
        if (g && g.index) tris += g.index.count / 3;
        else if (g && g.attributes.position) tris += g.attributes.position.count / 3;
      });
      triTotal += tris;
      const tl = label(`${Math.round(tris)} tris`, '#8fae5d', 30, 2.6);
      tl.position.set(0, 0.7, 1.9);
      cell.add(tl);
    }

    if (row === 0) {
      const cl = label(colLabel, '#8fae5d', 34, 3.4);
      cl.position.set(0, 6.6, 0);
      cell.add(cl);
    }
    if (col === 0) {
      const nm = label(name, '#e9d8a6', 40, 5.2);
      nm.position.set(-3.6, 0.7, 0);
      cell.add(nm);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CAMERA — a slow 3/4 orbit framing the whole grid.
// ─────────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
const gridW = COLS.length * COL_SPACING + 6;
const gridD = CREATURES.length * ROW_SPACING;
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
// frameIdx: a monotonically-advancing frame counter the discriminator reads to
// CONFIRM the render loop is LIVE (a backgrounded WebGPU tab throttles rAF → the
// counter freezes → the screenshot is stale; see LAW 2). Also a LOFT-column
// focus helper so a close-up of one creature's shoulder/eyes/jaw can be framed.
let frameIdx = 0;
const control = {
  frozen: false, yaw: 0, dist: 0, height: 0.5,
  // when set, the camera parks looking at this world point at `focusDist`.
  focus: null as THREE.Vector3 | null, focusDist: 0,
};
/** Park the camera on the LOFT column (col=2) of creature `row` (0-based), at a
 *  head-height 3/4 close-up — for shoulder/eyes/jaw inspection. */
function focusLoft(row: number, dist = 4.2, heightY = 3.4): void {
  const z = (row - (CREATURES.length - 1) / 2) * ROW_SPACING;
  const x = (COLS.length - 1) / 2 * COL_SPACING; // loft col
  control.focus = new THREE.Vector3(x, heightY, z);
  control.focusDist = dist;
  control.frozen = true;
}
async function main(): Promise<void> {
  await renderer.init();
  const backendName = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback';
  const legend = document.getElementById('legend');
  if (legend) legend.textContent = `LOFT-ENGINE L2 — painted skin: BOX | CAPSULE | LOFT (painted atlas) — backend: ${backendName}`;
  console.log(`[lofttest] backend = ${backendName}; ${CREATURES.length} creatures × [box|capsule|loft]; loft tris total = ${Math.round(triTotal)} (~${Math.round(triTotal / CREATURES.length)}/creature, budget ≤3000).`);
  fit();
  renderer.setAnimationLoop(() => {
    frameIdx++;
    if (control.focus) {
      // close-up: orbit slowly around the focus point at focusDist.
      if (!control.frozen) t += 0.0013;
      const yaw = control.yaw || Math.sin(t) * 0.25;
      const f = control.focus;
      camera.position.set(f.x + Math.sin(yaw) * control.focusDist, f.y + 0.6, f.z + Math.cos(yaw) * control.focusDist);
      camera.lookAt(f);
      renderer.render(scene, camera);
      return;
    }
    if (!control.frozen) t += 0.0013;
    const dist = control.dist || frameDist();
    const yaw = control.yaw || Math.sin(t) * 0.22;
    camera.position.set(Math.sin(yaw) * dist, dist * control.height, Math.cos(yaw) * dist);
    camera.lookAt(center);
    renderer.render(scene, camera);
  });
}
void main();

(window as unknown as { lofttest: unknown }).lofttest = {
  scene, camera, renderer, CREATURES, control, center, focusLoft,
  get frameIdx(): number { return frameIdx; },
};
