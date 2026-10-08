/**
 * CREATURE-ROSTER TEST HARNESS (throwaway visual verification — NOT shipped
 * world code; mirrors examples/rts/src/humanoidtest.ts's structure).
 *
 * Renders the FULL in-game mob roster — the 12 MOB_NAMES + 2 BOSS_NAMES from
 * feeders/wow/server.py — each built by ONE generalized call:
 *
 *     buildCreatureByName(name) → buildCreature(CREATURE_TOPOLOGY[name], fnv1a(name))
 *
 * laid out in a labeled grid so you can look at it and go "yes, that's a hydra
 * / that's a many-armed blob / that's the monolith." This is the §2 claim
 * (docs/EVERQUEST-ENGINE-DIRECTION.md) made visible: one function, arbitrary
 * topology, no per-creature code.
 *
 * Independent of ThreeView/structures.ts/zones.ts/interior.ts (in-flight by
 * another agent) — imports ONLY the stable generator + kenney style kernel.
 * Deterministic: no Math.random/Date anywhere (law 5); every creature is a
 * pure fn of its name hash, and the labels use a static seeded layout.
 */

import * as THREE from 'three';
import {
  buildCreatureByName, CREATURE_TOPOLOGY,
} from '../../../render/src/three/generators/creatures.js';
import { snapToPalette, matte } from '../../../render/src/three/kenney.js';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
// Fill whatever viewport the host gives us (a fixed size only shows a slice in
// a narrow preview pane). CSS owns the display size; the renderer owns the
// buffer (same discipline as examples/rts/index.html).
function fitToWindow(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f27);
scene.fog = new THREE.FogExp2(0x1a1f27, 0.012);
scene.add(new THREE.AmbientLight(0x99a6bb, 0.75));
const sun = new THREE.DirectionalLight(0xdfe6f0, 1.5);
sun.position.set(-8, 16, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6b7a99, 0.5);
fill.position.set(9, 6, -8);
scene.add(fill);

// Ground plane — a matte stone floor (kenney tone) so shadows land and the
// creatures aren't floating.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: snapToPalette(0x3a4030), roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── A text label as a canvas-texture sprite (self-contained, no asset). ─────
function label(text: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '600 44px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e9d8a6';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.2, 0.8, 1);
  return sprite;
}

// ── Lay the roster out in a grid, each on a small plinth. ───────────────────
// Realizer: capsule+profile is the Phase-1 standard (DUNGEON-LOOP-SPEC
// "ProportionSpec v1"); `?realize=box` shows the legacy box build for
// before/after comparison. Deterministic either way.
const REALIZE = new URLSearchParams(location.search).get('realize') === 'box' ? 'box' : 'capsule';
const names = Object.keys(CREATURE_TOPOLOGY);
const COLS = 5;
const SPACING = 5.2;
const plinthMat = matte(snapToPalette(0x9c9488), { rough: 0.95 });

const rows = Math.ceil(names.length / COLS);
names.forEach((name, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = (col - (COLS - 1) / 2) * SPACING;
  const z = (row - (rows - 1) / 2) * SPACING;

  const cell = new THREE.Group();
  cell.position.set(x, 0, z);
  scene.add(cell);

  // A low plinth so every creature reads as "on display."
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 20), plinthMat);
  plinth.position.y = 0.15;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  cell.add(plinth);

  const creature = buildCreatureByName(name, undefined, { realize: REALIZE });
  creature.position.y = 0.3;
  cell.add(creature);

  const lbl = label(name);
  lbl.position.set(0, 0.6, 2.1);
  cell.add(lbl);
});

// ── Camera — a 3/4 overview that slowly orbits the whole grid. ──────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 300);
const gridW = COLS * SPACING;
const gridD = rows * SPACING;
const center = new THREE.Vector3(0, 1.2, gridD * 0.05);

fitToWindow();
window.addEventListener('resize', fitToWindow);

/** How far back to sit so the FULL grid fits the CURRENT aspect (portrait panes
 *  need more distance — recomputed each frame so a resize keeps everything in
 *  frame). */
function frameDist(): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFit = gridW / (2 * Math.tan(vFov / 2) * camera.aspect);
  const vFit = gridD / (2 * Math.tan(vFov / 2));
  return Math.max(hFit, vFit) * 1.05 + gridD * 0.35;
}

let t = 0;
const control = { frozen: false }; // harness debug: freeze the orbit for close-ups
function draw(): void {
  if (!control.frozen) {
    t += 0.0015;
    const dist = frameDist();
    const yaw = Math.sin(t) * 0.18;
    camera.position.set(
      Math.sin(yaw) * dist,
      dist * 0.66,
      Math.cos(yaw) * dist,
    );
    camera.lookAt(center);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}
draw();

console.log(`[creaturetest] rendered ${names.length} creatures from ONE buildCreature() over ${names.length} topologies (0 per-creature code paths) — realizer: ${REALIZE} (?realize=box for the legacy build).`);

// Debug affordance (harness only): expose the render objects so a reviewer can
// drive a close-up on any cell from the console. Not shipped world code.
(window as unknown as { creaturetest: unknown }).creaturetest = { scene, camera, renderer, names, COLS, SPACING, rows, control };
