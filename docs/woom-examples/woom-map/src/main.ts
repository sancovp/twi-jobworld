/**
 * WOOM MAP — the FREE geodata ingest prototype (the LEGENDARY fidelity rung,
 * worldtest_states.md: "accurate geodata OSM/geocode = the fidelity climb").
 *
 * Proves the pay-NOTHING pipeline end-to-end, browser-verifiable:
 *   a typed place  → Nominatim geocode (OSM, no key)      → lat/lon
 *                   → Overpass API (OSM, no key) buildings+roads within radius
 *                   → equirectangular projection to local metres
 *                   → extruded footprints + road lines in three.js
 *                   → "your room" plopped on the building nearest the centre.
 *
 * NO Google, NO API key, NO billing. Overpass + Nominatim both send CORS
 * headers, so this runs from the browser directly (prototype scale — for
 * production we self-host / cache tiles, see the state doc).
 *
 * This is a STANDALONE data prototype — it does NOT author game assets (the
 * buildings are REAL OSM footprints, not procedural characters), so the WOOM
 * asset-GAN laws don't apply; it's the ingest that will later feed place.ts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  FALLBACK, project, centroid, geocode, fetchOSM, heightOf,
  type OSMWay,
} from '../../shared/geo.js';

// ── scene scaffold ────────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const statusEl = document.getElementById('status') as HTMLElement;
const qEl = document.getElementById('q') as HTMLInputElement;
const radiusEl = document.getElementById('radius') as HTMLSelectElement;
const buildBtn = document.getElementById('build') as HTMLButtonElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
function vp(): { w: number; h: number } { return { w: window.innerWidth || 1280, h: window.innerHeight || 720 }; }
{ const { w, h } = vp(); renderer.setSize(w, h); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
scene.fog = new THREE.FogExp2(0x070a12, 0.0009);
const camera = new THREE.PerspectiveCamera(52, vp().w / vp().h, 0.5, 8000);
camera.position.set(220, 260, 320);

scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x151b28, 1.0));
const sun = new THREE.DirectionalLight(0xffe6c0, 2.0);
sun.position.set(180, 340, 220); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10; sun.shadow.camera.far = 2000;
(sun.shadow.camera as THREE.OrthographicCamera).left = -600;
(sun.shadow.camera as THREE.OrthographicCamera).right = 600;
(sun.shadow.camera as THREE.OrthographicCamera).top = 600;
(sun.shadow.camera as THREE.OrthographicCamera).bottom = -600;
scene.add(sun);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 0);

// ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1600, 64),
  new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; ground.receiveShadow = true;
scene.add(ground);

let cityGroup: THREE.Group | null = null;

// ── build the scene from OSM ways (project/geocode/fetchOSM/heightOf/centroid
//    all come from ../../shared/geo.ts — the one free-OSM pipeline) ────────────
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x2e3a52, roughness: 0.82, metalness: 0.05 });
const roomMat = new THREE.MeshStandardMaterial({ color: 0x8fe6ff, emissive: 0x2b6bd6, emissiveIntensity: 1.6, roughness: 0.4 });
const roadMat = new THREE.LineBasicMaterial({ color: 0x3f5788, transparent: true, opacity: 0.7 });

function buildCity(ways: OSMWay[], lat0: number, lon0: number): { buildings: number; roads: number } {
  if (cityGroup) { scene.remove(cityGroup); cityGroup.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); }); }
  cityGroup = new THREE.Group();
  let buildings = 0, roads = 0;
  let bestRoom: { mesh: THREE.Mesh; d2: number } | null = null;

  for (const w of ways) {
    const geom = w.geometry; const tags = w.tags ?? {};
    if (!geom || geom.length < 2) continue;
    const pts = geom.map((g) => project(g.lat, g.lon, lat0, lon0));

    if (tags['building'] !== undefined) {
      // closed footprint → THREE.Shape → extrude up
      const shape = new THREE.Shape();
      shape.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i]![0], pts[i]![1]);
      shape.closePath();
      const h = heightOf(tags);
      const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2); // shape XY (ground) + extrude Z → stand up along Y
      const mesh = new THREE.Mesh(g, buildingMat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      cityGroup.add(mesh);
      buildings++;
      // track the building nearest the centre for "your room"
      const [cx, cz] = centroid(pts); const d2 = cx * cx + cz * cz;
      if (!bestRoom || d2 < bestRoom.d2) bestRoom = { mesh, d2 };
    } else if (tags['highway'] !== undefined) {
      const positions: number[] = [];
      for (const p of pts) { positions.push(p[0], 0.15, p[1]); }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      cityGroup.add(new THREE.Line(lg, roadMat));
      roads++;
    }
  }

  // ── plop YOUR ROOM on the centre-most building ──────────────────────────────
  if (bestRoom) {
    (bestRoom.mesh.material as THREE.Material) = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.7, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
    bestRoom.mesh.geometry.computeBoundingBox();
    const bb = bestRoom.mesh.geometry.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, top = bb.max.y;
    const marker = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 6), roomMat);
    marker.position.set(cx, top + 12, cz); marker.rotation.x = Math.PI; marker.castShadow = true;
    const glow = new THREE.PointLight(0x8fe6ff, 2.2, 120); glow.position.set(cx, top + 20, cz);
    cityGroup.add(marker); cityGroup.add(glow);
    controls.target.set(cx, 0, cz);
  }

  scene.add(cityGroup);
  return { buildings, roads };
}

// ── the run ───────────────────────────────────────────────────────────────────
function setStatus(msg: string, cls = ''): void { statusEl.className = cls; statusEl.textContent = msg; }

async function run(): Promise<void> {
  buildBtn.disabled = true;
  const q = qEl.value.trim();
  const radius = parseInt(radiusEl.value, 10);
  try {
    let loc: { lat: number; lon: number; name: string };
    if (!q) { loc = FALLBACK; setStatus('No place typed — using fallback.\nGeocoding skipped.'); }
    else {
      setStatus('Geocoding (Nominatim)…');
      try { loc = await geocode(q); }
      catch (e) { loc = FALLBACK; setStatus(`Geocode failed (${(e as Error).message}) — using fallback.`, 'err'); }
    }
    setStatus(`◎ ${loc.name}\n(${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)})\nFetching OSM buildings within ${radius} m…`);
    const ways = await fetchOSM(loc.lat, loc.lon, radius);
    const { buildings, roads } = buildCity(ways, loc.lat, loc.lon);
    setStatus(`◎ ${loc.name}\n${buildings} buildings · ${roads} road segments · ${radius} m radius.\nYour room is the glowing marker at the centre.`, 'ok');
  } catch (e) {
    setStatus(`✗ ${(e as Error).message}`, 'err');
  } finally {
    buildBtn.disabled = false;
  }
}
buildBtn.addEventListener('click', () => void run());
qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') void run(); });

// ── render loop ────────────────────────────────────────────────────────────────
function frame(): void { controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame); }
frame();
window.addEventListener('resize', () => { const { w, h } = vp(); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });

// boot: draw the fallback block immediately so the page is never empty
void (async () => {
  setStatus('Loading a starter block (Portland)…');
  try {
    const ways = await fetchOSM(FALLBACK.lat, FALLBACK.lon, 300);
    const { buildings, roads } = buildCity(ways, FALLBACK.lat, FALLBACK.lon);
    setStatus(`◎ ${FALLBACK.name}\n${buildings} buildings · ${roads} roads.\nType your own place above →`, 'ok');
  } catch (e) { setStatus(`✗ starter block failed: ${(e as Error).message}`, 'err'); }
})();

// verification handles (headless panes throttle rAF)
Object.assign(window as unknown as Record<string, unknown>, {
  __run: run,
  __render: () => renderer.render(scene, camera),
  __counts: () => ({ children: cityGroup?.children.length ?? 0 }),
});
