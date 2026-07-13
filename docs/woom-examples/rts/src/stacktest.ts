/**
 * stacktest — LOFT runtime-stacks a part-composition traced from a Kenney asset.
 * Left: the EXACT rebuild (stackComposition == the source). Right: a KNOB variation
 * (stackVaried — the same kit re-stacked), proving the arrangement is parametric.
 * ?asset=wall-window|tree|burger.
 */
import * as THREE from 'three';
import { CameraRig } from '../../../render/src/three/cameraRig.js';
import { loadComposition, stackComposition, stackMorph } from '../../../render/src/astral/partStack.js';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const status = document.getElementById('status') as HTMLElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2028);
const rig = new CameraRig(38, window.innerWidth / window.innerHeight);
const camera = rig.camera;
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x33302a, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(4, 8, 6);
scene.add(key);

const asset = new URLSearchParams(location.search).get('asset') || 'wall-window';
let group: THREE.Group | null = null;

(async () => {
  try {
    const lib = await loadComposition('assets/compositions', asset);
    // GEOMETRY KNOB: morph the actual mesh square→round. Show the transition 0→0.5→1.
    const w = new THREE.Box3().setFromObject(stackComposition(lib)).getSize(new THREE.Vector3()).x || 1;
    group = new THREE.Group();
    const steps = [0, 0.5, 1.0];
    steps.forEach((r, i) => {
      const m = stackMorph(lib, r);
      m.position.x = i * w * 1.5;
      group!.add(m);
    });
    scene.add(group);
    rig.frame(group, { azimuth: 0.15, elevation: 0.12, margin: 1.15 });
    (window as unknown as { __rig: unknown }).__rig = rig;   // verification handle

    status.textContent =
      `✓ GEOMETRY KNOB — ${asset}: round = 0.0 → 0.5 → 1.0 (left→right)\n` +
      `the mesh vertices are deformed: the square window morphs into a round PORTHOLE.\n` +
      `this is a GEOMETRY knob (reshapes the real mesh), not the arrangement.`;
  } catch (e) {
    status.textContent = 'STACK ERROR: ' + (e instanceof Error ? e.message : String(e));
  }
})();

const clock = new THREE.Clock();
function loop(): void {
  rig.spin(clock.getDelta() * 0.4);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rig.setAspect(window.innerWidth / window.innerHeight);
  if (group) rig.frame(group, { azimuth: rig.readout().az, elevation: 0.18, margin: 1.2 });
});
