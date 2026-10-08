/**
 * ART-DIRECTION DECISION TEST (throwaway harness — NOT shipped world code).
 *
 * Two ways to make the 3D world look like the opera-pack images, side by side
 * on the same ground + camera, so the look decision is made from PIXELS:
 *   A (left)  — the EXISTING procedural building (buildStructure), re-shaded
 *               toon/cel + inverted-hull outline. Real 3D geometry, flat fill,
 *               dark edge = the opera-pack aesthetic WITHOUT abandoning 3D.
 *   B (right) — a BILLBOARD of the literal building-opera-lodge.png standing
 *               upright in the world (the HD-2D approach). Identical to the PNG
 *               head-on; a cardboard cutout from any other angle.
 * Ground = the opera-pack grass tile under both, so terrain matches too.
 */

import * as THREE from 'three';
import { buildStructure } from '../../../render/src/three/structures.js';

const W = 1200, H = 620;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H, false);
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc4d8); // warm sky, like the reference

const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1000);
camera.position.set(0, 9, 20);
camera.lookAt(0, 2.5, 0);

// Lighting — ONE key + soft fill (toon shading reads the key as banded steps).
const key = new THREE.DirectionalLight(0xfff2d6, 2.1);
key.position.set(-6, 12, 8);
scene.add(key);
scene.add(new THREE.AmbientLight(0x6688aa, 0.9));

// ── Ground: the opera-pack grass tile under everything ──────────────────────
const tex = new THREE.TextureLoader().load('/opera-pack/tile-grass.png');
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(6, 6);
tex.colorSpace = THREE.SRGBColorSpace;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 40),
  new THREE.MeshToonMaterial({ map: tex }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ── A 3-tone gradient ramp = the "banded flat fill" cel look ────────────────
function toonRamp(): THREE.DataTexture {
  const data = new Uint8Array([70, 140, 210, 255]); // 4 hard steps = crisp bands
  const t = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  t.needsUpdate = true;
  return t;
}
const RAMP = toonRamp();

/** Re-shade a built group toon/cel + add a black inverted-hull outline. */
function toonify(group: THREE.Group): THREE.Group {
  const outlines: THREE.Mesh[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(m.isMesh)) return;
    const src = m.material as THREE.MeshStandardMaterial;
    const emissive = (src.emissive && (src.emissive.r + src.emissive.g + src.emissive.b) > 0.1);
    // Keep emissive/glow parts as-is (gems, embers) — they're the pops.
    if (!emissive) {
      m.material = new THREE.MeshToonMaterial({ color: src.color.getHex(), gradientMap: RAMP });
    }
    // Inverted-hull outline: a slightly-fattened black backface shell.
    const outline = new THREE.Mesh(
      m.geometry,
      new THREE.MeshBasicMaterial({ color: 0x1a1208, side: THREE.BackSide }),
    );
    outline.position.copy(m.position);
    outline.quaternion.copy(m.quaternion);
    outline.scale.copy(m.scale).multiplyScalar(1.12);
    outlines.push(outline);
    m.parent!.add(outline);
  });
  return group;
}

// ── A · toon-shaded procedural building (the FORGE = code territory) ─────────
const procedural = toonify(buildStructure('code', 0xe0a53a));
procedural.position.set(-8, 0, 0);
procedural.scale.setScalar(1.6);
scene.add(procedural);

// ── B · billboard of the actual opera-pack building PNG ─────────────────────
const bbTex = new THREE.TextureLoader().load('/opera-pack/building-opera-lodge.png');
bbTex.colorSpace = THREE.SRGBColorSpace;
const billboard = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 9),
  new THREE.MeshBasicMaterial({ map: bbTex, transparent: true }),
);
billboard.position.set(8, 4.5, 0);
scene.add(billboard);

// slow orbit so the "cardboard cutout" tell on B (and A's real 3D) is visible.
// Orbit stays within ±35° of front so both A and B stay framed (a full 360°
// would swing behind the buildings); r/height pulled back to fit both.
let t = 0;
function frame(): void {
  t += 0.004;
  const yaw = Math.sin(t) * 0.4; // ±~23°
  const r = 19;
  camera.position.set(Math.sin(yaw) * r, 8, Math.cos(yaw) * r);
  camera.lookAt(0, 3.2, 0);
  billboard.quaternion.copy(camera.quaternion); // billboard always faces camera
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
