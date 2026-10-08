/**
 * ANIMATION-FLOOR TEST (throwaway harness — NOT shipped world code; mirrors
 * humanoidtest.ts / surfacetest.ts structure).
 *
 * Isaac: "I gave you the visemes + animation idea last time — did that never
 * get tested? how do we get what we need?" Straight answer: the visemes never
 * got ported (reskin-lab is Math.random-based, law-5-forbidden; captured as
 * mineable IP only). BUT we OWN our joints (creatures are pivot chains we
 * built) — so we don't need reskin-lab's recognizer/GLB-bonemap at all. This
 * harness proves the ANIMATION FLOOR directly on our own rig:
 *
 *   - a capsule humanoid built IN-HIERARCHY (capsules parented to pivot Groups)
 *     so it's continuous (§7a capsule-union) AND rigged (FK: rotate a pivot →
 *     the whole chain below moves). Named joints: hip/knee, shoulder/elbow, neck,
 *     and a HINGED JAW.
 *   - a PURE pose driver pose(rig, t, {moving, talking}) — no Math.random, no
 *     performance.now (law-5): idle breathe-sway · walk leg/arm counter-swing ·
 *     jaw-flap on `talking` (the Simlish floor — §3, no phoneme sync).
 *
 * Three instances side by side — IDLE · WALKING · TALKING — so all three states
 * read at once. This is the "at least happening, legible" Desired (FIDELITY-
 * BANDS.md ANIMATION row) made visible, on geometry we generated ourselves.
 */

import * as THREE from 'three';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f27);
scene.fog = new THREE.FogExp2(0x1a1f27, 0.012);
scene.add(new THREE.AmbientLight(0x99a6bb, 0.7));
const sun = new THREE.DirectionalLight(0xdfe6f0, 1.7);
sun.position.set(-6, 14, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6b7a99, 0.5);
fill.position.set(8, 6, -7);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd9a0, 0.55);
rim.position.set(2, 5, -11);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function label(text: string, color = '#e9d8a6', px = 40, wide = 4.4): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.font = `600 ${px}px ui-monospace, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(wide, wide * 96 / 512, 1);
  return sprite;
}

// ─────────────────────────────────────────────────────────────────────────
// THE RIG — a capsule humanoid built IN the pivot hierarchy. `seg()` makes a
// pivot Group (the joint) + a capsule child (the bone, growing -Y) + a `next`
// Group at the far end (the next joint). Rotating a pivot moves the whole chain
// below it (forward kinematics). We keep a handle to every pivot in `rig` — we
// OWN the joints (no bone-map recognizer needed).
// ─────────────────────────────────────────────────────────────────────────
interface Rig {
  root: THREE.Group;
  hipL: THREE.Group; hipR: THREE.Group;     // upper-leg pivots (swing the stride)
  kneeL: THREE.Group; kneeR: THREE.Group;
  shoulderL: THREE.Group; shoulderR: THREE.Group; // upper-arm pivots (counter-swing)
  elbowL: THREE.Group; elbowR: THREE.Group;
  neck: THREE.Group;                          // head bob/nod
  jaw: THREE.Group;                           // THE hinge — flaps when talking
}

const UP = new THREE.Vector3(0, 1, 0);
function boneCapsule(len: number, r: number, mat: THREE.Material): THREE.Mesh {
  // capsule spans 0 → -len along Y (the segment direction), caps overlap the
  // neighbour so a chain reads as one continuous body (no joint gap).
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
  m.position.y = -len / 2;
  m.castShadow = true;
  return m;
}
/** A pivot joint with a capsule bone; returns [pivot, next-joint-at-far-end]. */
function seg(parent: THREE.Object3D, len: number, r: number, mat: THREE.Material): [THREE.Group, THREE.Group] {
  const pivot = new THREE.Group();
  pivot.add(boneCapsule(len, r, mat));
  const next = new THREE.Group();
  next.position.y = -len;
  pivot.add(next);
  parent.add(pivot);
  return [pivot, next];
}

function buildRiggedHumanoid(skinHex: number, clothHex: number): Rig {
  const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.6, flatShading: false });
  const cloth = new THREE.MeshStandardMaterial({ color: clothHex, roughness: 0.72, flatShading: false });

  const root = new THREE.Group();
  const H = 4.2;                          // total height
  const legH = H * 0.48, torsoH = H * 0.34;
  const upperLeg = legH * 0.52, lowerLeg = legH * 0.48;
  const upperArm = torsoH * 0.62, foreArm = torsoH * 0.56;
  const legR = 0.19, armR = 0.14;

  // torso (a capsule + a slightly wider chest capsule) — the body sits lifted
  // so feet reach the ground (legs grow down from the hip line at y=legH).
  const torso = new THREE.Group();
  torso.position.y = legH;
  root.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, torsoH * 0.55, 6, 14), cloth);
  chest.position.y = torsoH * 0.62; chest.castShadow = true; torso.add(chest);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, torsoH * 0.4, 6, 14), cloth);
  belly.position.y = torsoH * 0.2; belly.castShadow = true; torso.add(belly);

  // legs — hips on the root at the hip line, feet reach y≈0.
  const [hipL, kneeJL] = seg(root, upperLeg, legR, cloth); hipL.position.set(-0.24, legH, 0);
  const [kneeL] = seg(kneeJL, lowerLeg, legR * 0.85, cloth);
  const [hipR, kneeJR] = seg(root, upperLeg, legR, cloth); hipR.position.set(0.24, legH, 0);
  const [kneeR] = seg(kneeJR, lowerLeg, legR * 0.85, cloth);
  for (const foot of [kneeL, kneeR]) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 8), cloth);
    f.rotation.x = Math.PI / 2; f.position.set(0, -lowerLeg + 0.05, 0.12); f.castShadow = true;
    foot.add(f);
  }

  // arms — shoulders near the top of the chest; a small resting splay.
  const shoulderY = legH + torsoH * 0.9;
  const [shoulderL, elbowJL] = seg(torso, upperArm, armR, skin);
  shoulderL.position.set(-0.5, torsoH * 0.9, 0); shoulderL.rotation.z = 0.14;
  const [elbowL] = seg(elbowJL, foreArm, armR * 0.85, skin);
  const [shoulderR, elbowJR] = seg(torso, upperArm, armR, skin);
  shoulderR.position.set(0.5, torsoH * 0.9, 0); shoulderR.rotation.z = -0.14;
  const [elbowR] = seg(elbowJR, foreArm, armR * 0.85, skin);
  void shoulderY;

  // head on a neck pivot, with a HINGED JAW pivot at the mouth line.
  const neck = new THREE.Group();
  neck.position.y = torsoH + 0.05;
  torso.add(neck);
  const headR = 0.34;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 14), skin);
  head.position.y = headR * 0.9; head.castShadow = true; neck.add(head);
  for (const ex of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x14181d }));
    eye.position.set(ex * 0.13, headR * 1.0, headR * 0.86); neck.add(eye);
  }
  // jaw: a pivot at the mouth hinge; a wedge capsule hangs off it and rotates
  // OPEN about X when talking (the Simlish flap — one joint, legible "talking").
  const jaw = new THREE.Group();
  jaw.position.set(0, headR * 0.62, headR * 0.2);
  neck.add(jaw);
  const jawMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, headR * 0.7, 4, 10), skin);
  jawMesh.rotation.z = Math.PI / 2; jawMesh.position.set(0, -0.04, headR * 0.34); jawMesh.castShadow = true;
  jaw.add(jawMesh);

  return { root, hipL, hipR, kneeL, kneeR, shoulderL, shoulderR, elbowL, elbowR, neck, jaw };
}

// ─────────────────────────────────────────────────────────────────────────
// THE POSE DRIVER — pure fn of (t, state). No randomness, no wall-clock. This
// is the whole animation FLOOR: idle breathe-sway · walk stride/counter-swing ·
// jaw-flap on talking. Deepening = more of exactly this kind of pure driver.
// ─────────────────────────────────────────────────────────────────────────
interface AnimState { moving: boolean; talking: boolean; phase: number; }
function pose(rig: Rig, t: number, s: AnimState): void {
  const speed = s.moving ? 8.5 : 1.7;
  const swing = Math.sin(t * speed + s.phase);
  const amp = s.moving ? 0.7 : 0.06;

  // legs stride opposite; knees bend on the forward-swing (a cheap gait).
  rig.hipL.rotation.x = swing * amp;
  rig.hipR.rotation.x = -swing * amp;
  rig.kneeL.rotation.x = s.moving ? Math.max(0, -swing) * 0.9 : 0.02;
  rig.kneeR.rotation.x = s.moving ? Math.max(0, swing) * 0.9 : 0.02;

  // arms counter-swing the legs; a resting sway when idle.
  rig.shoulderL.rotation.x = -swing * amp * 0.8;
  rig.shoulderR.rotation.x = swing * amp * 0.8;
  rig.elbowL.rotation.x = -Math.abs(swing) * (s.moving ? 0.5 : 0.12) - 0.1;
  rig.elbowR.rotation.x = -Math.abs(swing) * (s.moving ? 0.5 : 0.12) - 0.1;

  // whole-body bob (feet stay planted-ish; the stride sells the walk).
  rig.root.position.y = 0.3 + Math.abs(Math.sin(t * speed + s.phase)) * (s.moving ? 0.14 : 0.03);
  rig.neck.rotation.x = Math.sin(t * speed * 0.5 + s.phase) * (s.moving ? 0.06 : 0.02);

  // JAW FLAP — the talking floor. Open/close fast on |sin|; shut when silent.
  rig.jaw.rotation.x = s.talking ? Math.abs(Math.sin(t * 13 + s.phase)) * 0.5 : 0;
}

// ─────────────────────────────────────────────────────────────────────────
// THREE INSTANCES — IDLE · WALKING · TALKING, so every state reads at once.
// ─────────────────────────────────────────────────────────────────────────
const rigs: { rig: Rig; state: AnimState }[] = [];
const SETUP: Array<[string, AnimState]> = [
  ['IDLE', { moving: false, talking: false, phase: 0.0 }],
  ['WALKING', { moving: true, talking: false, phase: 1.3 }],
  ['TALKING', { moving: false, talking: true, phase: 2.6 }],
];
SETUP.forEach(([name, state], i) => {
  const rig = buildRiggedHumanoid(0xb07a4a, i === 1 ? 0x4f7a5e : i === 2 ? 0x8a5a3c : 0x5b7d99);
  rig.root.position.set((i - 1) * 4.2, 0.3, 0);
  scene.add(rig.root);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.3, 20),
    new THREE.MeshStandardMaterial({ color: 0x9c9488, roughness: 0.95 }));
  plinth.position.set((i - 1) * 4.2, 0.15, 0); plinth.receiveShadow = true; scene.add(plinth);
  const lbl = label(name, '#8fae5d', 40, 3.4); lbl.position.set((i - 1) * 4.2, 5.4, 0); scene.add(lbl);
  rigs.push({ rig, state });
});

// ─────────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
const center = new THREE.Vector3(0, 2.2, 0);
function fit(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
fit(); window.addEventListener('resize', fit);

let t = 0;
const control = { frozen: false, t: 0 };
function draw(): void {
  if (!control.frozen) t += 0.016; else t = control.t;
  for (const { rig, state } of rigs) pose(rig, t, state);
  camera.position.set(Math.sin(t * 0.12) * 12, 4.2, 12);
  camera.lookAt(center);
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}
draw();

console.log('[animtest] 3 rigged capsule humanoids (idle/walk/talk) driven by a PURE pose(rig,t,state) — our own joints, no bone-map, no reskin-lab.');
(window as unknown as { animtest: unknown }).animtest = { scene, camera, renderer, rigs, control, pose, t: () => t };
