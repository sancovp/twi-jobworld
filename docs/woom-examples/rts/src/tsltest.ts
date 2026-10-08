/**
 * TSL SURFACE-SYSTEM TEST (throwaway harness — NOT shipped world code; mirrors
 * surfacetest.ts structure. Phase 6c step 1, metaclozeclosure.md).
 *
 * THE SPLIT THIS PROVES (Isaac 2026-07-06): kenney = the FORM system
 * (geometry/proportions/palette — TS kit builders, unchanged); TSL = the
 * SURFACE system (albedo detail + DIRECTED FEATURES via positional masks —
 * the thing canvas-wrap fbm could never do; it read as marble/vegetable).
 * A TSL node graph is a typed program-that-is-data — the spec-collapse
 * seam's native compile target (a MaterialSpec compiles to a node graph).
 *
 * What renders: four capsule-realized creatures (the SAME buildCreature +
 * CREATURE_PROPORTIONS the world uses) wearing a TSL skin whose features are
 * node-graph masks over normalized body height + facing:
 *   - BELT: a dark leather band at h≈0.42 (a directed feature at a chosen
 *     coordinate — impossible with uniform noise),
 *   - CHEST: a front-facing plate tint above the belt (mask = height band ×
 *     forward-normal bias),
 *   - MOTTLE: low-amplitude triplanar-ish mx_noise over WORLD POSITION
 *     (resolution-independent, no lathe-UV smear — §12 shaping, hue-preserving
 *     so it reads as skin variation, never marble),
 *   - TRIM: the creature's accent hue on the chest edge.
 *
 * Backend: WebGPURenderer — WebGPU when available, WebGL2 fallback otherwise
 * (the header shows which). fable5-patterns §1 (imports/async init) + §12
 * (fbm shaping) followed; §2B material-cache discipline (one material per
 * creature, cached). Deterministic (law 5): no Date.now/Math.random — masks
 * and noise are pure functions of position; orbit time is frame-accumulated.
 */

import * as THREE from 'three';
import { WebGPURenderer, MeshStandardNodeMaterial } from 'three/webgpu';
import {
  positionWorld, normalWorld, color, float, mix, smoothstep, abs as tslAbs,
  mx_noise_float, vec3,
} from 'three/tsl';
import { buildCreatureByName, CREATURE_PROPORTIONS } from '../../../render/src/three/generators/creatures.js';
import { paletteFor, accentFor, snapToPalette, matte } from '../../../render/src/three/kenney.js';
import { fnv1a } from '../../../render/src/composer/HeroComposer.js';
import type { MatFamily } from '../../../render/src/three/generators/creatures.js';

// ─────────────────────────────────────────────────────────────────────────
// THE TSL SKIN — one node material per creature (cached, §2B discipline).
// Masks read positionWorld.y normalized by the creature's approximate body
// height. HARNESS SHORTCUT (noted for the production pass): creatures stand
// at world origin per cell, so world-Y ≈ body-local Y; production wants a
// per-creature object-space transform uniform instead.
// ─────────────────────────────────────────────────────────────────────────
const SKIN_CACHE = new Map<string, MeshStandardNodeMaterial>();

function tslSkin(name: string, bodyH: number, limb: boolean): MeshStandardNodeMaterial {
  const key = `${name}|${limb ? 'limb' : 'body'}`;
  let m = SKIN_CACHE.get(key);
  if (m) return m;

  const hash = fnv1a(name) + (limb ? 5 : 0);
  const base = color(paletteFor(hash));
  const beltTone = color(snapToPalette(0x2a2622));
  const trim = color(accentFor(fnv1a(name)));

  // normalized body height 0..1 (world-Y over the creature's height).
  const h = positionWorld.y.div(float(bodyH)).clamp(0, 1);

  // MOTTLE — low-amplitude skin variation from world-position noise
  // (resolution-independent; hue-preserving: multiplies the base, never
  // replaces it — the anti-marble rule).
  const n = mx_noise_float(positionWorld.mul(float(2.1)));
  const mottled = base.mul(float(1.0).add(n.mul(float(0.10))));

  // BELT — a directed dark band at h≈0.42, width 0.045.
  const beltMask = smoothstep(float(0.045), float(0.0), tslAbs(h.sub(float(0.42))));

  // CHEST PLATE — h ∈ [0.5, 0.8], biased to the forward (+Z) facing.
  const front = normalWorld.z.mul(float(0.5)).add(float(0.5)); // 0 back → 1 front
  const chestBand = smoothstep(float(0.5), float(0.58), h).mul(
    smoothstep(float(0.85), float(0.74), h));
  const chestMask = chestBand.mul(front.pow(float(1.6))).mul(float(limb ? 0 : 1));
  const chestTone = mix(mottled, mottled.mul(float(1.18)).add(trim.mul(float(0.06))), chestMask);

  // compose: mottled base → chest plate → belt on top.
  const albedo = mix(chestTone, beltTone, beltMask.mul(float(limb ? 0 : 0.9)));

  m = new MeshStandardNodeMaterial();
  m.colorNode = albedo;
  // belt + chest read slightly tighter than skin; body stays matte.
  m.roughnessNode = float(0.78).sub(chestMask.mul(float(0.18))).sub(beltMask.mul(float(0.25)));
  m.metalness = 0;
  SKIN_CACHE.set(key, m);
  return m;
}

/** Material factory in the creature contract: body/limb = the TSL skin;
 *  accent/dark stay kenney matte (WebGPURenderer renders plain
 *  MeshStandardMaterial fine — eyes/jaws/boots need no node graph). */
function tslFactory(name: string, bodyH: number) {
  return (family: MatFamily, hash: number, glow: number): THREE.Material => {
    switch (family) {
      case 'body': return tslSkin(name, bodyH, false);
      case 'limb': return tslSkin(name, bodyH, true);
      case 'accent': return matte(accentFor(hash), glow > 0 ? { glow, rough: 0.35, flat: false } : { rough: 0.5, flat: false });
      case 'dark': return matte(snapToPalette(0x2a2622), { rough: 0.9, flat: false });
    }
  };
}

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
sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
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

function label(text: string, colorHex = '#e9d8a6', px = 40, wide = 4.6): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.font = `600 ${px}px ui-monospace, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = colorHex; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(wide, wide * 96 / 512, 1);
  return sprite;
}

// ─────────────────────────────────────────────────────────────────────────
// FOUR CREATURES × TWO FORMS — same builder + proportion DATA as the world;
// only the material factory is TSL. Front row = BOX form (full kenney chunk),
// back row = CAPSULE+PROFILE form (the Phase-1/6a realizer). The accidental
// first run of this harness proved box-FORM + TSL-surface reads STRONGLY —
// so the A/B is now explicit: which FORM carries the TSL surface better?
// ─────────────────────────────────────────────────────────────────────────
const PICKS: Array<[string, number]> = [
  ['Legacy Golem', 3.2], ['Zombie Process', 3.0], ['Deadlock Sentinel', 3.4], ['Merge Conflict', 2.9],
];
const ROWS: Array<['BOX + TSL' | 'CAPSULE + TSL', 'box' | 'capsule', number]> = [
  ['BOX + TSL', 'box', 3.2],
  ['CAPSULE + TSL', 'capsule', -3.2],
];
const plinthMat = new THREE.MeshStandardMaterial({ color: snapToPalette(0x9c9488), roughness: 0.95 });
for (const [rowLabel, realize, z] of ROWS) {
  PICKS.forEach(([name, bodyH], i) => {
    const x = (i - (PICKS.length - 1) / 2) * 5.2;
    const cell = new THREE.Group();
    cell.position.set(x, 0, z);
    scene.add(cell);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 20), plinthMat);
    plinth.position.y = 0.15;
    plinth.receiveShadow = true; plinth.castShadow = true;
    cell.add(plinth);
    const fig = buildCreatureByName(name, tslFactory(name, bodyH), { realize });
    fig.position.y = 0.3;
    cell.add(fig);
    if (z > 0) {
      const nm = label(name, '#e9d8a6', 40, 5.0);
      nm.position.set(0, 6.2, 0);
      cell.add(nm);
    }
    if (i === 0) {
      const rl = label(rowLabel, '#8fae5d', 34, 4.0);
      rl.position.set(-5.6, 3.4, 0);
      cell.add(rl);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
const center = new THREE.Vector3(0, 2.2, 0);
function fit(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
window.addEventListener('resize', fit);

let t = 0;
const control = { frozen: false, yaw: 0 };
async function main(): Promise<void> {
  await renderer.init();
  // Report which backend actually booted (WebGPU vs the WebGL2 fallback).
  const backendName = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback';
  const legend = document.getElementById('legend');
  if (legend) legend.textContent = `TSL SURFACE-SYSTEM TEST — directed features as node graphs: belt · chest · mottle (backend: ${backendName})`;
  console.log(`[tsltest] backend = ${backendName}; ${PICKS.length} creatures, TSL skins (belt/chest/mottle masks), kenney FORM unchanged.`);
  fit();
  renderer.setAnimationLoop(() => {
    if (!control.frozen) t += 0.0013;
    const yaw = control.yaw || Math.sin(t) * 0.3;
    camera.position.set(Math.sin(yaw) * 21, 8.2, Math.cos(yaw) * 21);
    camera.lookAt(center);
    renderer.render(scene, camera);
  });
}
void main();
(window as unknown as { tsltest: unknown }).tsltest = { scene, camera, renderer, control };
