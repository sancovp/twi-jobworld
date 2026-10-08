/**
 * FREE geodata pipeline — OpenStreetMap only (Nominatim geocode + Overpass
 * footprints). No Google, no API key, no billing. Shared by examples/woom-map
 * (the raw ingest prototype) and examples/woom-site (the astral-world fusion),
 * so the free-OSM path has ONE canonical implementation (don't-duplicate).
 *
 * CORS: both endpoints send Access-Control-Allow-Origin: *, so browser-direct
 * fetch works at prototype scale. Production self-hosts / caches (Overpass is
 * rate-limited; Nominatim's usage policy forbids heavy browser hammering).
 */

// ── endpoints (public, free, CORS-enabled) ───────────────────────────────────
export const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const OVERPASS = 'https://overpass-api.de/api/interpreter';
// a dense fallback so a demo always shows something if geocode is rate-limited:
export const FALLBACK = { lat: 45.5188, lon: -122.6793, name: 'Pioneer Courthouse Square, Portland (fallback)' };

// ── projection: lat/lon → local metres (equirectangular about a centre) ───────
const EARTH_R = 6378137;
export function project(lat: number, lon: number, lat0: number, lon0: number): [number, number] {
  const x = ((lon - lon0) * Math.PI / 180) * EARTH_R * Math.cos((lat0 * Math.PI) / 180);
  const z = -((lat - lat0) * Math.PI / 180) * EARTH_R; // north → -z (reads "up" on screen)
  return [x, z];
}

export function centroid(pts: Array<[number, number]>): [number, number] {
  let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length];
}

// ── geocode (Nominatim) ───────────────────────────────────────────────────────
export interface GeoPoint { lat: number; lon: number; name: string; }
export async function geocode(q: string): Promise<GeoPoint> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`geocode HTTP ${r.status}`);
  const j = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!j.length) throw new Error('place not found');
  return { lat: parseFloat(j[0]!.lat), lon: parseFloat(j[0]!.lon), name: j[0]!.display_name };
}

// ── Overpass: buildings + roads within radius (out geom = inline coords) ───────
export interface OSMWay { tags?: Record<string, string>; geometry?: Array<{ lat: number; lon: number }>; }
export async function fetchOSM(lat: number, lon: number, radius: number): Promise<OSMWay[]> {
  const query = `[out:json][timeout:25];
    (
      way["building"](around:${radius},${lat},${lon});
      way["highway"](around:${radius},${lat},${lon});
    );
    out geom;`;
  const r = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(query) });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  const j = (await r.json()) as { elements: OSMWay[] };
  return j.elements ?? [];
}

// ── building height from OSM tags (levels → metres; sane default) ─────────────
export function heightOf(tags: Record<string, string> = {}): number {
  if (tags['height']) { const h = parseFloat(tags['height']); if (isFinite(h)) return Math.max(3, h); }
  const lv = parseFloat(tags['building:levels'] ?? '');
  if (isFinite(lv)) return Math.max(3, lv * 3.2);
  return 7; // ~2 storeys default
}

export function isBuilding(w: OSMWay): boolean { return w.tags?.['building'] !== undefined && (w.geometry?.length ?? 0) >= 3; }
export function isRoad(w: OSMWay): boolean { return w.tags?.['highway'] !== undefined && (w.geometry?.length ?? 0) >= 2; }
