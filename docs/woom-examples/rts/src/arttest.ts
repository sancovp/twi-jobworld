/**
 * ART-DIRECTION TEST 2 (throwaway harness — NOT shipped world code).
 *
 * The SAME agent-rts building geometry (buildStructure code=FORGE), rendered
 * two ways in one frame via scissor split, same camera:
 *   A (left)  — TOON: flat fill (MeshToonMaterial) + inverted-hull outline.
 *               What Isaac saw; "not bad, just basic."
 *   B (right) — PAINTERLY-PROCEDURAL: the glacial-valley recipe distilled to
 *               standard three.js — atmospheric sky + fog, ONE warm sun with
 *               soft PCF shadows, hemisphere ambient bounce, ACES tone-map,
 *               and INSTANCED SCATTER (pebbles + grass tufts) which is the
 *               single biggest richness lever in glacial-valley. Zero assets
 *               beyond the ground tile; the building geometry is IDENTICAL.
 *
 * The point: same shapes, only the SHADING + atmosphere + scatter differ.
 */

import * as THREE from 'three';
import { buildStructure } from '../../../render/src/three/structures.js';

const W = 1280, H = 640;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const HALF = W / 2;
const camera = new THREE.PerspectiveCamera(40, HALF / H, 0.1, 400);

// ── Shared: a fresh forge per side (materials get mutated per side) ──────────
function forge(): THREE.Group {
  const g = buildStructure('code', 0xe0a53a);
  g.scale.setScalar(1.6);
  return g;
}

// ═══════════════════ A · TOON scene ═════════════════════════════════════════
const toonScene = new THREE.Scene();
toonScene.background = new THREE.Color(0x8fc4d8);
toonScene.add(new THREE.AmbientLight(0xffffff, 0.55));
const toonKey = new THREE.DirectionalLight(0xffffff, 1.6);
toonKey.position.set(-5, 10, 6);
toonScene.add(toonKey);

function toonRamp(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([70, 140, 210, 255]), 4, 1, THREE.RedFormat);
  t.needsUpdate = true;
  return t;
}
const RAMP = toonRamp();
function toonify(group: THREE.Group): void {
  const adds: Array<[THREE.Object3D, THREE.Mesh]> = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    const glow = src.emissive && (src.emissive.r + src.emissive.g + src.emissive.b) > 0.1;
    if (!glow) m.material = new THREE.MeshToonMaterial({ color: src.color.getHex(), gradientMap: RAMP });
    const outline = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x1a1208, side: THREE.BackSide }));
    outline.position.copy(m.position); outline.quaternion.copy(m.quaternion);
    outline.scale.copy(m.scale).multiplyScalar(1.12);
    adds.push([m.parent!, outline]);
  });
  for (const [p, o] of adds) p.add(o);
}
const toonGround = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshToonMaterial({ color: 0x6e8b4a }),
);
toonGround.rotation.x = -Math.PI / 2;
toonScene.add(toonGround);
const toonForge = forge();
toonify(toonForge);
toonScene.add(toonForge);

// ═══════════════════ B · PAINTERLY-PROCEDURAL scene ═════════════════════════
const artScene = new THREE.Scene();
artScene.background = new THREE.Color(0xafd0e0);
artScene.fog = new THREE.Fog(0xc4dbe6, 55, 180); // atmospheric depth haze

// ONE warm sun, soft shadows (glacial-valley: single directional + bakes).
const sun = new THREE.DirectionalLight(0xffe9c2, 2.4);
sun.position.set(-14, 22, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
sun.shadow.bias = -0.0004;
artScene.add(sun);
// sky/ground ambient bounce — cool sky, warm earth (the "amb" term in gv).
artScene.add(new THREE.HemisphereLight(0xbcd6e8, 0x5a4a34, 0.8));

const grassTex = new THREE.TextureLoader().load('/opera-pack/tile-grass.png');
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(10, 10);
grassTex.colorSpace = THREE.SRGBColorSpace;
const artGround = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
);
artGround.rotation.x = -Math.PI / 2;
artGround.receiveShadow = true;
artScene.add(artGround);

const artForge = forge();
artForge.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
artScene.add(artForge);

// ── INSTANCED SCATTER — the richness lever (gv scatters 16000 grass + rocks) ─
// Deterministic-ish placement; this is a throwaway test so a seeded LCG is fine.
let seed = 1337;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function scatterRing(mesh: THREE.InstancedMesh, n: number, rMin: number, rMax: number, yJit: number): void {
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rMin + rnd() * (rMax - rMin);
    d.position.set(Math.cos(a) * r, yJit * rnd(), Math.sin(a) * r);
    const s = 0.4 + rnd() * 0.9;
    d.scale.set(s, s * (0.5 + rnd() * 0.5), s);
    d.rotation.set(rnd(), rnd() * Math.PI * 2, rnd());
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
// pebbles — flattened rounded rocks, tight dark palette (the beach look)
const pebbleGeo = new THREE.IcosahedronGeometry(0.5, 1);
const pebbles = new THREE.InstancedMesh(
  pebbleGeo, new THREE.MeshStandardMaterial({ color: 0x6b6f74, roughness: 0.9, flatShading: true }), 600,
);
pebbles.castShadow = true; pebbles.receiveShadow = true;
scatterRing(pebbles, 600, 8, 52, 0.15);
artScene.add(pebbles);
// grass tufts — thin cones, deep meadow greens
const bladeGeo = new THREE.ConeGeometry(0.12, 1.1, 4);
bladeGeo.translate(0, 0.55, 0);
const grass = new THREE.InstancedMesh(
  bladeGeo, new THREE.MeshStandardMaterial({ color: 0x4e6d34, roughness: 1 }), 2400,
);
scatterRing(grass, 2400, 6, 54, 0);
artScene.add(grass);

// ═══════════════════ render loop: scissor split, same camera ════════════════
let t = 0;
function draw(): void {
  t += 0.004;
  const yaw = Math.sin(t) * 0.4, r = 20;
  camera.position.set(Math.sin(yaw) * r, 8, Math.cos(yaw) * r);
  camera.lookAt(0, 3.2, 0);
  renderer.clear();
  // left — toon
  renderer.setViewport(0, 0, HALF, H);
  renderer.setScissor(0, 0, HALF, H);
  renderer.setScissorTest(true);
  renderer.render(toonScene, camera);
  // right — painterly
  renderer.setViewport(HALF, 0, HALF, H);
  renderer.setScissor(HALF, 0, HALF, H);
  renderer.render(artScene, camera);
  requestAnimationFrame(draw);
}
draw();
