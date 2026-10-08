/**
 * glbtest — THE ROUND-TRIP WIRE (hop 5): exoblend Blender GLB → three.js GLTFLoader.
 *
 * This is the return leg that was designed (ARMATURE-EXPORT-LANE) but never built:
 * a real exoblend-minted Blender character GLB is LOADED into the three.js runtime
 * and rendered. Proves "Blender-authored model → game engine" works. Classic
 * WebGLRenderer (a GLB carries classic MeshStandardMaterial — the right renderer
 * for loaded assets; WebGPU/node-materials are for the procedural loft path).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CameraRig } from '../../../render/src/three/cameraRig.js';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const status = document.getElementById('status') as HTMLElement;

// Viewport size that never collapses to 0 (some headless preview panes report
// window.inner*/clientRect = 0 before first layout, which would make the camera
// aspect NaN and framing dist NaN). Fall back to a 16:9 default so the render is
// always valid; the resize listener re-fits once real dimensions arrive.
function viewport(): { w: number; h: number } {
  const w = window.innerWidth || canvas.clientWidth || 1280;
  const h = window.innerHeight || canvas.clientHeight || 720;
  return { w, h };
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
{ const { w, h } = viewport(); renderer.setSize(w, h); }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2820);
// The programmatic camera interface — no hand-set positions.
const rig = new CameraRig(35, viewport().w / viewport().h);
const camera = rig.camera;

scene.add(new THREE.HemisphereLight(0xc4d8ff, 0x2c3a26, 1.5));
const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
key.position.set(4, 8, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb0ff, 0.7);
fill.position.set(-5, 4, -3);
scene.add(fill);
const disc = new THREE.Mesh(
  new THREE.CylinderGeometry(3, 3.3, 0.3, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a4034, roughness: 0.9 }),
);
disc.position.y = -0.1;
scene.add(disc);

let model: THREE.Group | null = null;
let pivot: THREE.Group | null = null;
let mixer: THREE.AnimationMixer | null = null;

// ?glb=scout-walk.glb (default) loads the rigged+animated body; ?glb=exoblend-scout.glb
// loads the static composed preset. The AnimationMixer below auto-plays any clip.
const glbName = new URLSearchParams(location.search).get('glb') ?? 'scout-walk.glb';
const loader = new GLTFLoader();
loader.load(
  `assets/${glbName}`,
  (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // pivot at world origin; offset the model INSIDE it so its geometric center
    // sits on the pivot's Y axis and its feet on the ground. Rotate the PIVOT —
    // otherwise spinning orbits the model around its off-center GLB origin.
    pivot = new THREE.Group();
    model.position.set(-center.x, -box.min.y, -center.z);
    pivot.add(model);
    scene.add(pivot);

    // ONE call frames it correctly — the rig handles aspect (portrait/landscape).
    rig.frame(pivot, { azimuth: 0.6, elevation: 0.12, margin: 1.25 });

    let meshes = 0, skinned = 0, tris = 0;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((o as unknown as { isMesh?: boolean }).isMesh) {
        meshes++;
        const g = m.geometry as THREE.BufferGeometry;
        const idx = g.getIndex();
        tris += (idx ? idx.count : (g.getAttribute('position')?.count ?? 0)) / 3;
      }
      if ((o as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned++;
    });

    // play the first AnimationClip if the GLB carries one (C-A2)
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]!).play();
    }

    // Debug handles for verification (headless panes throttle rAF, so the loop
    // may not advance the mixer on its own — drive it by hand via these).
    Object.assign(window as unknown as Record<string, unknown>, {
      __rig: rig, __model: model, __mixer: mixer, __clips: gltf.animations,
      __seek: (t: number) => { if (mixer) { mixer.setTime(t); renderer.render(scene, camera); } },
    });

    const r = rig.readout();
    status.textContent =
      `✓ LOADED exoblend Blender GLB into three.js\n` +
      `meshes=${meshes}  skinnedMesh=${skinned}  ~tris=${Math.round(tris)}  animationClips=${gltf.animations.length}\n` +
      `bbox=${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}\n` +
      `cameraRig readout: dist=${r.dist} target=[${r.target.join(', ')}] az=${r.az} el=${r.el}\n` +
      `THE ROUND-TRIP WIRE IS LIVE: Blender-authored model → game engine.`;
  },
  undefined,
  (err) => {
    status.textContent = 'LOAD ERROR: ' + (err instanceof Error ? err.message : String(err));
  },
);

const clock = new THREE.Clock();
function loop(): void {
  const dt = clock.getDelta();
  rig.spin(dt * 0.45); // orbit the CAMERA around the static model (turntable)
  if (mixer) mixer.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

window.addEventListener('resize', () => {
  const { w, h } = viewport();
  renderer.setSize(w, h);
  rig.setAspect(w / h);
  if (pivot) rig.frame(pivot, { azimuth: rig.readout().az, elevation: 0.12, margin: 1.25 });
});
