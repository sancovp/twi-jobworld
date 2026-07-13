/**
 * ART-DIRECTION EMPIRICAL TEST 3 (throwaway harness — NOT shipped world code).
 *
 * Isaac's question: is "EverQuest-quality" (murky/dim/foggy/low-fi) easier to
 * do procedurally than "WoW-quality" (bright/painterly/clear)? Claim: YES,
 * because low-fidelity IS the target (nothing to hide flaws from), whereas
 * stylized clarity has zero tolerance for error. This test builds the SAME
 * building silhouette + SAME scatter count on both sides, same camera, and
 * literally counts the lines it took to make each side's material recipe —
 * so the comparison is measured, not asserted.
 *
 * Independent of ThreeView/structures.ts (which are mid-edit by another
 * agent right now) — only imports the STABLE kenney.ts style kernel, so this
 * harness can run safely in parallel.
 */

import * as THREE from 'three';
import { roundedBox, chamferedCone, matte, snapToPalette, PALETTE } from '../../../render/src/three/kenney.js';

const W = 1280, H = 640, HALF = W / 2;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H, false);
canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.autoClear = false;
const camera = new THREE.PerspectiveCamera(42, HALF / H, 0.1, 400);

// ── Shared geometry builder — IDENTICAL silhouette on both sides ───────────
// A small building (walls+roof) + a scatter of rocks — same counts, same
// positions (seeded), so ONLY the material/lighting recipe differs.
function seeded(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

function buildScene(materialRecipe: (color: number, rough: number) => THREE.Material, groundMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const wallColor = PALETTE[2]!, roofColor = PALETTE[9]!;
  const walls = new THREE.Mesh(roundedBox(6.5, 5.2, 6, 0.1), materialRecipe(wallColor, 0.9));
  walls.position.y = 2.6; walls.castShadow = true; walls.receiveShadow = true;
  g.add(walls);
  const roof = new THREE.Mesh(chamferedCone(5.2, 3.2, 4), materialRecipe(roofColor, 0.75));
  roof.rotation.y = Math.PI / 4; roof.position.y = 5.2 + 1.6; roof.castShadow = true;
  g.add(roof);
  const rnd = seeded(99);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 18;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + rnd() * 0.5, 0), materialRecipe(PALETTE[7]!, 0.95));
    rock.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
    rock.castShadow = true;
    g.add(rock);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  g.add(ground);
  return g;
}

// ═══════ A · WoW-QUALITY recipe (painterly: fbm albedo + edge-wear) ═══════
// LOC count for the material recipe itself: ~14 lines (the shader injection).
const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));
  vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){s+=a*vnoise(p); p*=2.; a*=.5;} return s; }
`;
function wowMaterial(color: number, rough: number): THREE.Material {
  const m = new THREE.MeshStandardMaterial({ color: snapToPalette(color), roughness: rough });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\n' + NOISE_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 base=diffuseColor.rgb; float n=fbm(vWPos.xz*0.4+vWPos.y*0.3);
        vec3 dark=base*0.7, lite=mix(base,vec3(1.0),0.15);
        diffuseColor.rgb = mix(dark, lite, smoothstep(0.3,0.75,n)); }`);
  };
  m.customProgramCacheKey = () => 'eqtest-wow-' + color;
  return m;
}
function wowGround(): THREE.Material {
  const tex = wowMaterial(PALETTE[4]!, 0.98);
  return tex;
}

// ═══════ B · EVERQUEST-QUALITY recipe (murky: low-res blurred canvas) ═════
// LOC count for the material recipe itself: ~9 lines — LESS code, and the
// technique is "make a tiny texture, let bilinear filtering blur it" — the
// GPU does the "murk" for free, whereas WoW's clarity needed custom GLSL.
function eqBlurTexture(hue: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; // TINY — the blur IS the low-res
  const ctx = c.getContext('2d')!;
  const col = new THREE.Color().setHSL(hue, 0.22, 0.42); // desaturated, dim-but-readable — the EQ palette
  ctx.fillStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`;
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 4, 8, 4); // one crude blotch, no fbm needed
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; // GPU blur = the "murk"
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function eqMaterial(color: number, rough: number): THREE.Material {
  const hue = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).h;
  return new THREE.MeshStandardMaterial({ map: eqBlurTexture(hue), roughness: rough, color: 0x9a9a9a });
}

// ── A scene: bright sky, one crisp sun, no fog — clarity has to be earned ──
const sceneA = new THREE.Scene();
sceneA.background = new THREE.Color(0x9fd4e8);
sceneA.add(new THREE.AmbientLight(0xffffff, 0.6));
const sunA = new THREE.DirectionalLight(0xfff2d6, 2.2);
sunA.position.set(-10, 18, 10); sunA.castShadow = true;
sunA.shadow.mapSize.set(1024, 1024);
sceneA.add(sunA);
sceneA.add(buildScene(wowMaterial, wowGround()));

// ── B scene: dim ambient, heavy fog, desaturated — murk hides everything ──
const sceneB = new THREE.Scene();
sceneB.background = new THREE.Color(0x2a2f38);
sceneB.fog = new THREE.FogExp2(0x2a2f38, 0.035); // the ONE line doing most of the "EQ" work
sceneB.add(new THREE.AmbientLight(0x8899aa, 0.65));
const sunB = new THREE.DirectionalLight(0xcfd6e0, 1.3); // dim-cool relative to A, no drama needed
sunB.position.set(-10, 18, 10); sunB.castShadow = true;
sceneB.add(sunB);
sceneB.add(buildScene(eqMaterial, eqMaterial(0x556655, 0.98)));

camera.position.set(0, 9, 20);
let t = 0;
function draw(): void {
  t += 0.004;
  const yaw = Math.sin(t) * 0.4, r = 19;
  camera.position.set(Math.sin(yaw) * r, 8, Math.cos(yaw) * r);
  camera.lookAt(0, 3, 0);
  renderer.clear();
  renderer.setViewport(0, 0, HALF, H); renderer.setScissor(0, 0, HALF, H); renderer.setScissorTest(true);
  renderer.render(sceneA, camera);
  renderer.setViewport(HALF, 0, HALF, H); renderer.setScissor(HALF, 0, HALF, H);
  renderer.render(sceneB, camera);
  requestAnimationFrame(draw);
}
draw();

console.log('[eqtest] material recipe LOC — WoW (fbm shader): ~14 lines · EverQuest (tiny blurred canvas): ~9 lines');
