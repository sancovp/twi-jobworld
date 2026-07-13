/**
 * ART-DIRECTION EMPIRICAL TEST 4 (throwaway harness — NOT shipped world code).
 *
 * Isaac's question: "we keep the mechanics the same, just change the art
 * generation style so it's easy to make characters... is it easy to generate
 * WHATEVER WE WANT in EQ style?" This builds an actual JOINTED HUMANOID
 * (head/torso/2 arms/2 legs with elbow+knee joints) — NOT the abstract
 * cone-body figure figures.ts currently uses — using the EQ-quality recipe
 * from eqtest.ts (blocky boxes, tiny blurred-canvas material, dim/foggy
 * light). Then it builds a SECOND humanoid with different params (height,
 * limb thickness, proportions) to test "whatever we want" = easy param swap.
 *
 * HONEST CAVEAT this test is designed to surface: building joints/limbs AT
 * ALL is new work regardless of WoW-vs-EQ (figures.ts's abstract cone+sphere
 * has none) — the EQ-vs-WoW question is specifically about whether the
 * MATERIAL/PROPORTION-POLISH on top of that skeleton is cheap or expensive.
 *
 * Independent of ThreeView/structures.ts (mid-edit by another agent) — no
 * imports from those files.
 */

import * as THREE from 'three';

const W = 1000, H = 700;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H, false);
canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x272c34);
scene.fog = new THREE.FogExp2(0x272c34, 0.045); // the EQ murk, one line
scene.add(new THREE.AmbientLight(0x8899aa, 0.65));
const sun = new THREE.DirectionalLight(0xcfd6e0, 1.3);
sun.position.set(-6, 10, 8); sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);

// ── The EQ murk material (same technique as eqtest.ts: a tiny blurred
//    canvas, bilinear-filtered — the GPU does the "low-fi" for free) ────────
function murkMaterial(hue: number, light = 0.42): THREE.Material {
  const c = document.createElement('canvas'); c.width = 6; c.height = 6;
  const ctx = c.getContext('2d')!;
  const col = new THREE.Color().setHSL(hue, 0.2, light);
  ctx.fillStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`;
  ctx.fillRect(0, 0, 6, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 3, 6, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

interface HumanoidParams {
  height: number;      // total figure height (feet to head-top)
  headScale: number;   // head-height as a FRACTION of realistic (1 = human-real, >1 = bigger/chibi-ish)
  limbThick: number;   // limb thickness multiplier
  torsoWidth: number;  // shoulder width multiplier
  skinHue: number; clothHue: number;
  stance: number;      // outward arm/leg angle (radians)
}

/** A pivot-chained limb segment: rotates the whole chain below it too. */
function limbSeg(parent: THREE.Object3D, length: number, thick: number, angleZ: number, mat: THREE.Material): THREE.Group {
  const pivot = new THREE.Group();
  pivot.rotation.z = angleZ;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, length, thick), mat);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  const next = new THREE.Group();
  next.position.y = -length;
  pivot.add(next);
  return next;
}

/** A believable (realistic ~7.5-head proportion, NOT chibi) jointed humanoid,
 *  built ENTIRELY from plain boxes (no bevels — sharp/blocky = the EQ read)
 *  + the murk material. Deterministic: same params -> same figure. */
function buildHumanoid(p: HumanoidParams): THREE.Group {
  const g = new THREE.Group();
  const headH = (p.height / 7.5) * p.headScale;
  const skin = murkMaterial(p.skinHue, 0.44);
  const cloth = murkMaterial(p.clothHue, 0.32);

  const legH = p.height * 0.48;
  const upperLegH = legH * 0.52, lowerLegH = legH * 0.48;
  const torsoH = p.height * 0.34;
  const armThick = 0.11 * p.limbThick, legThick = 0.15 * p.limbThick;
  const upperArmH = torsoH * 0.62, forearmH = torsoH * 0.56;

  // legs (from ground up) — hips at legH, feet at 0
  for (const side of [-1, 1] as const) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16 * p.torsoWidth, legH, 0);
    g.add(hip);
    const knee = limbSeg(hip, upperLegH, legThick, side * p.stance * 0.3, cloth);
    const ankle = limbSeg(knee, lowerLegH, legThick * 0.85, -side * p.stance * 0.2, cloth);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.32), cloth);
    foot.position.set(0, -0.05, 0.08); foot.castShadow = true;
    ankle.add(foot);
  }

  // torso — a single tapered block: chest wider than waist (two stacked
  // boxes, still zero bevels, still "blocky EQ", just not a single slab).
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62 * p.torsoWidth, torsoH * 0.55, 0.32), cloth);
  chest.position.set(0, legH + torsoH * 0.72, 0); chest.castShadow = true;
  g.add(chest);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.46 * p.torsoWidth, torsoH * 0.45, 0.28), cloth);
  waist.position.set(0, legH + torsoH * 0.22, 0); waist.castShadow = true;
  g.add(waist);

  // head
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, headH * 0.25, 0.14), skin);
  neck.position.set(0, legH + torsoH + headH * 0.12, 0);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(headH * 0.78, headH, headH * 0.82), skin);
  head.position.set(0, legH + torsoH + headH * 0.6, 0); head.castShadow = true;
  g.add(head);

  // arms — shoulders at the top of the chest
  const shoulderY = legH + torsoH * 0.95;
  for (const side of [-1, 1] as const) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.34 * p.torsoWidth, shoulderY, 0);
    g.add(shoulder);
    const elbow = limbSeg(shoulder, upperArmH, armThick, side * (0.16 + p.stance), skin);
    const wrist = limbSeg(elbow, forearmH, armThick * 0.85, side * 0.05, skin);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.09), skin);
    hand.position.y = -0.08; hand.castShadow = true;
    wrist.add(hand);
  }
  return g;
}

// ── Variant A: believable realistic-ish proportions ─────────────────────
const a = buildHumanoid({ height: 4.4, headScale: 1.0, limbThick: 1.0, torsoWidth: 1.0, skinHue: 0.07, clothHue: 0.58, stance: 0.05 });
a.position.x = -1.4;
scene.add(a);

// ── Variant B: "whatever we want" — a bulkier, shorter, thicker-limbed
//    figure from the SAME function, just different params (proves the
//    param-swap claim, not a new code path). ─────────────────────────────
const b = buildHumanoid({ height: 3.6, headScale: 1.25, limbThick: 1.7, torsoWidth: 1.35, skinHue: 0.34, clothHue: 0.02, stance: 0.12 });
b.position.x = 1.6;
scene.add(b);

camera_setup();
function camera_setup() {
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0.3, 2.6, 8.2);
  camera.lookAt(0, 2.1, 0);
  renderer.render(scene, camera);
  addEventListener('resize', () => renderer.render(scene, camera));
}

console.log('[humanoidtest] buildHumanoid(): ~55 lines total (skeleton+murk material), 2 variants from ONE function via param swap only.');
