/**
 * SURFACE-REALIZER CEILING TEST (throwaway harness — NOT shipped world code;
 * mirrors examples/rts/src/creaturetest.ts's structure + scene).
 *
 * Isaac's verdict on buildCreature's box output: "it just looks really bad...
 * can we do EQ2 level." The box realizer's tell is DISCONNECTED RIGID BOXES
 * (air at every joint, hard rectangular cross-sections, flat kenney matte).
 * This harness tests the CEILING of keeping the SAME skeleton but swapping the
 * geometry REALIZER — a fidelity ladder, three columns per creature:
 *
 *   [ BOXES ]            the current buildCreature output (the bad baseline)
 *   [ CAPSULE-UNION ]    round cross-sections, overlapping so NO gaps, smooth-
 *                        shaded — the two cheap wins, exact world coords
 *   [ METABALL ]         a true continuous BLEND (three's MarchingCubes over
 *                        the same bones) — the organic premium (Spore-style)
 *
 * THE KEY MOVE: the box realizer already positions every segment mesh ON the
 * bone, so `extractBones()` reads the skeleton straight OUT of the box build —
 * all three columns realize ONE skeleton, no re-derivation. This is exactly the
 * collapse/expand spine's point: box vs capsule vs metaball are three
 * realizations of the SAME spec node at different fidelity.
 *
 * Independent of ThreeView/structures/zones/interior (in-flight elsewhere) —
 * imports ONLY the stable generator + kenney kernel + three addons.
 * Deterministic (no Math.random/Date; every creature is a name-hash pure fn).
 */

import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import {
  buildCreatureByName,
} from '../../../render/src/three/generators/creatures.js';
import { snapToPalette, matte, paletteFor } from '../../../render/src/three/kenney.js';
import { fnv1a } from '../../../render/src/composer/HeroComposer.js';

// ─────────────────────────────────────────────────────────────────────────
// SCENE (copied from creaturetest.ts so the comparison is apples-to-apples).
// ─────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
// A warm rim from behind — pops the silhouette edges (the polish read).
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
function label(text: string, color = '#e9d8a6', px = 44, wide = 4.2): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.font = `600 ${px}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(wide, wide * 96 / 512, 1);
  return sprite;
}

// ─────────────────────────────────────────────────────────────────────────
// SKELETON EXTRACTION — read the bones straight out of the box build. Every
// segment mesh (a beveled box / an icosahedron lump / a head) is already
// positioned + oriented ON its bone by buildCreature; we recover each as a
// capsule spine: two world-space endpoints `a`,`b` + a radius `r`.
// ─────────────────────────────────────────────────────────────────────────
interface Bone { a: THREE.Vector3; b: THREE.Vector3; r: number; }

function extractBones(creature: THREE.Object3D): Bone[] {
  creature.updateMatrixWorld(true); // creature root is at origin/identity → matrixWorld == creature-local
  const bones: Bone[] = [];
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const wscale = new THREE.Vector3();
  creature.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
    const geo = m.geometry as THREE.BufferGeometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    bb.getSize(size);
    bb.getCenter(center);
    // longest local axis = the bone direction; the two others = cross-section.
    const comps: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    let axis: 'x' | 'y' | 'z' = 'y';
    if (size.x >= size.y && size.x >= size.z) axis = 'x';
    else if (size.z >= size.x && size.z >= size.y) axis = 'z';
    const others = comps.filter((k) => k !== axis);
    const cross = (size[others[0]!] + size[others[1]!]) / 2; // avg cross diameter
    let r = Math.max(cross * 0.5, 0.03);
    const len = size[axis];
    const half = Math.max(0, len / 2 - r); // inset by r so caps stay within the part
    const eA = center.clone(); eA[axis] -= half;
    const eB = center.clone(); eB[axis] += half;
    // geometry-local → creature-local (== world here, root is identity).
    eA.applyMatrix4(m.matrixWorld);
    eB.applyMatrix4(m.matrixWorld);
    // r is a length → scale it by the mesh's mean world scale.
    m.getWorldScale(wscale);
    r *= (wscale.x + wscale.y + wscale.z) / 3;
    bones.push({ a: eA, b: eB, r });
  });
  return bones;
}

// ─────────────────────────────────────────────────────────────────────────
// COLUMN 2 — CAPSULE-UNION. One capsule per bone (round cross-section), all
// overlapping (no gaps), smooth-shaded, one shared organic material. The two
// cheap wins with exact world coordinates — guaranteed-correct placement.
// ─────────────────────────────────────────────────────────────────────────
const UP = new THREE.Vector3(0, 1, 0);
function buildCapsuleCreature(bones: Bone[], mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (const bone of bones) {
    dir.subVectors(bone.b, bone.a);
    const cyl = dir.length(); // capsule cylinder length; caps add r beyond each end
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(bone.r, cyl, 6, 12),
      mat,
    );
    capsule.castShadow = true;
    mid.addVectors(bone.a, bone.b).multiplyScalar(0.5);
    capsule.position.copy(mid);
    if (cyl > 1e-5) {
      dir.normalize();
      q.setFromUnitVectors(UP, dir); // capsule default axis is +Y
      capsule.quaternion.copy(q);
    }
    g.add(capsule);
  }
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
// COLUMN 3 — METABALL. Sample balls densely along every bone, feed them into
// three's MarchingCubes, polygonize ONCE (static creature). A true continuous
// blend: limbs melt into the torso, no seam anywhere. Field math derived from
// MarchingCubes.js: surface at `iso`, a ball of normalized radius R needs
// strength = R²·(iso+subtract). We normalize the creature into the field cube
// and set scale/position so it renders back at true world size.
// ─────────────────────────────────────────────────────────────────────────
const MB_RES = 64;
const MB_ISO = 80;
const MB_SUB = 12;
const MB_PAD = 0.72;              // fit the creature into [0.14,0.86] of the field
const MB_MIN_RN = 2.6 / MB_RES;   // radius floor (cells) so thin limbs stay connected

function buildMetaballCreature(bones: Bone[], mat: THREE.Material): THREE.Object3D {
  // bounding box over all balls (endpoints ± r).
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (const bone of bones) {
    box.expandByPoint(p.copy(bone.a).addScalar(bone.r));
    box.expandByPoint(p.copy(bone.a).addScalar(-bone.r));
    box.expandByPoint(p.copy(bone.b).addScalar(bone.r));
    box.expandByPoint(p.copy(bone.b).addScalar(-bone.r));
  }
  const cc = box.getCenter(new THREE.Vector3());
  const sz = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(sz.x, sz.y, sz.z);

  const mc = new MarchingCubes(MB_RES, mat, false, false, 240000);
  mc.isolation = MB_ISO;
  mc.position.copy(cc);
  const s = maxDim / (2 * MB_PAD);
  mc.scale.set(s, s, s);
  mc.castShadow = true;
  mc.reset();

  const n = new THREE.Vector3();
  const addBall = (world: THREE.Vector3, r: number) => {
    n.copy(world).sub(cc).multiplyScalar(MB_PAD / maxDim).addScalar(0.5);
    const Rn = Math.max((r / maxDim) * MB_PAD, MB_MIN_RN);
    const strength = Rn * Rn * (MB_ISO + MB_SUB);
    mc.addBall(n.x, n.y, n.z, strength, MB_SUB);
  };

  const dir = new THREE.Vector3();
  const at = new THREE.Vector3();
  for (const bone of bones) {
    dir.subVectors(bone.b, bone.a);
    const len = dir.length();
    // dense enough that consecutive balls overlap → a continuous tube, no beads.
    const steps = Math.max(1, Math.ceil(len / (bone.r * 0.85)));
    for (let i = 0; i <= steps; i++) {
      at.copy(bone.a).addScaledVector(dir, i / steps);
      addBall(at, bone.r);
    }
    if (len < 1e-5) addBall(bone.a, bone.r);
  }
  mc.update(); // polygonize once — static thereafter
  return mc;
}

// A smooth organic material (NOT flat kenney matte) so the continuous columns
// show what the surface treatment buys on top of the geometry jump.
function organicMat(name: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: paletteFor(fnv1a(name)),
    roughness: 0.62,
    metalness: 0.0,
    flatShading: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// LAYOUT — one ROW per creature; three columns [box | capsule | metaball],
// each on its own plinth, column-labeled once, creature-named at the row head.
// ─────────────────────────────────────────────────────────────────────────
const CREATURES = ['Zombie Process', 'Legacy Golem', 'Scope Creep', 'Circular Import Hydra'];
const COL_LABELS = ['BOXES (current)', 'CAPSULE-UNION', 'METABALL', 'CAPSULE+PROFILE (Phase 1)'];
const COL_SPACING = 4.6;
const ROW_SPACING = 6.4;
const plinthMat = matte(snapToPalette(0x9c9488), { rough: 0.95 });

CREATURES.forEach((name, row) => {
  const z = (row - (CREATURES.length - 1) / 2) * ROW_SPACING;
  const om = organicMat(name);

  // the shared skeleton, read out of ONE box build.
  const boxBuild = buildCreatureByName(name);
  const bones = extractBones(boxBuild);

  const columns: THREE.Object3D[] = [
    buildCreatureByName(name),           // fresh box build for display
    buildCapsuleCreature(bones, om),
    buildMetaballCreature(bones, om),
    // Column 4 — the PRODUCTIONIZED realizer (DUNGEON-LOOP-SPEC "ProportionSpec
    // v1"): in-hierarchy profiled bones (rig-preserving), radius PROFILES with
    // the de-sticked default priors — volume hierarchy, not sausage-uniform.
    buildCreatureByName(name, undefined, { realize: 'capsule' }),
  ];

  columns.forEach((fig, col) => {
    const x = (col - 1.5) * COL_SPACING;
    const cell = new THREE.Group();
    cell.position.set(x, 0, z);
    scene.add(cell);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 20), plinthMat);
    plinth.position.y = 0.15;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    cell.add(plinth);

    fig.position.y = 0.3;
    cell.add(fig);

    if (row === 0) {
      const cl = label(COL_LABELS[col]!, '#8fae5d', 34, 4.0);
      cl.position.set(0, 6.6, 0);
      cell.add(cl);
    }
    if (col === 0) {
      const nm = label(name, '#e9d8a6', 40, 5.2);
      nm.position.set(-3.4, 0.7, 0);
      cell.add(nm);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CAMERA — a slow 3/4 orbit framing the whole ladder.
// ─────────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
const gridW = 4 * COL_SPACING + 6;
const gridD = CREATURES.length * ROW_SPACING;
const center = new THREE.Vector3(0, 2.4, 0);

function fitToWindow(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
fitToWindow();
window.addEventListener('resize', fitToWindow);

function frameDist(): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFit = gridW / (2 * Math.tan(vFov / 2) * camera.aspect);
  const vFit = gridD / (2 * Math.tan(vFov / 2));
  return Math.max(hFit, vFit) * 1.02 + gridD * 0.28;
}

let t = 0;
const control = { frozen: false, yaw: 0, dist: 0, height: 0.5 };
function draw(): void {
  if (!control.frozen) {
    t += 0.0013;
    const dist = control.dist || frameDist();
    const yaw = control.yaw || Math.sin(t) * 0.22;
    camera.position.set(
      Math.sin(yaw) * dist,
      dist * control.height,
      Math.cos(yaw) * dist,
    );
    camera.lookAt(center);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}
draw();

console.log(`[surfacetest] ${CREATURES.length} creatures × 4 realizers (box | capsule | metaball | capsule+profile) — columns 1-3 share ONE extracted skeleton; column 4 is the productionized in-hierarchy realizer (realize:'capsule').`);
(window as unknown as { surfacetest: unknown }).surfacetest = { scene, camera, renderer, CREATURES, control, center };
