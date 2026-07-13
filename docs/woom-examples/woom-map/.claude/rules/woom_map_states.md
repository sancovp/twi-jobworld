# WOOM MAP — concern state (rule-28 distributed dir-state)

The **FREE geodata ingest prototype** — the LEGENDARY fidelity rung named in
`examples/rts/.claude/rules/worlddual_states.md` ("accurate geodata OSM/geocode/
elevation = the fidelity climb = the LEGENDARY rung"). Proves the pay-NOTHING
path: type a place → real buildings assemble → your room is plopped on the
centre building. Born 2026-07-12 (Isaac asked for "the version we don't have to
pay for"). Standalone data prototype — NOT WOOM game-asset authoring (real OSM
footprints, not procedural characters), so the asset-GAN laws don't apply here.

## Architecture (what lives here)

| piece | where | role |
|---|---|---|
| shell | `index.html` | place input · radius · "Build my block" · status |
| pipeline + render | `src/main.ts` | ExtrudeGeometry buildings + road lines → "your room" on the centre-most building. The free-OSM pipeline (geocode/fetchOSM/project/heightOf/centroid) is IMPORTED from **`../../shared/geo.ts`** (2026-07-12 refactor — the ONE canonical free-OSM impl, also used by examples/woom-site's geo fusion; don't-duplicate) |
| vite host | `vite.config.ts` | port **8796** (8788/8790/8792/8793 all taken by other live servers) |
| deps | three + OrbitControls only | no repo-root engine imports (fully standalone) |

## The free stack (no key, no billing — the whole point)

| need | free source | endpoint | notes |
|---|---|---|---|
| address → lat/lon | **Nominatim** (OSM) | `nominatim.openstreetmap.org/search` | CORS-enabled; usage policy = max ~1 req/s, be gentle; no key |
| building footprints + roads | **Overpass API** (OSM) | `overpass-api.de/api/interpreter` | `out geom;` returns inline coords (no node-ref resolve); CORS-enabled; no key |
| building height | OSM tags | `height` / `building:levels` | falls back to ~2 storeys (7 m) when untagged |

## Build state

| component | status | evidence |
|---|---|---|
| Overpass fetch (data source) | **VERIFIED** | curl smoke: Portland 300 m → 132 buildings with rich tags (`building:levels:7`, height, name, addr) |
| footprint extrude render | **VERIFIED** | boot draws Portland: 132 buildings + 484 roads as 3D masses at real heights (screenshot) |
| geocode → build (full pipeline) | **VERIFIED** | typed "Times Square, New York" → Nominatim resolved full address → Overpass 182 buildings + 451 roads rendered (screenshot) |
| "your room" placement | **VERIFIED** | glowing cyan cone marker on the gold-highlighted centre-most building; camera re-centres on it (Times Square screenshot) |
| no console errors | **VERIFIED** | onlyErrors read = none |

## Gotchas

- **CORS**: both Nominatim + Overpass send `Access-Control-Allow-Origin: *`, so browser-direct
  fetch works at prototype scale. Production must self-host / cache (Overpass is rate-limited &
  can be slow; Nominatim's policy forbids heavy browser hammering).
- **Height data is sparse**: many OSM buildings lack `height`/`levels` → the 7 m default. Fine
  for a block silhouette; real skyline needs the height tags (or a heights dataset).
- **strictPort collisions**: another session runs servers on 8790 + 8793 (a char-creator);
  8788 = examples/rts, 8792 = woom-site. This took 8796. Bump if taken.

## ASPIRATIONAL (not built — the climb from here)

- **Fuse with WORLD-DUAL**: ✅ DONE (2026-07-12) — `examples/woom-site` now imports `shared/geo.ts`
  and its "Situate my world" flow assembles the real neighborhood onto the astral sea (VERIFIED,
  Times Square 179 buildings). Remaining: a TRUER remap onto the Poincaré rings (`place.ts`) vs the
  current flat-patch-on-sea placement.
- **Let the user PICK the building** (click to select "your room"), not just centre-most.
- **Terrain/elevation** (SRTM/OpenTopoData free tiers) for non-flat ground = the fidelity climb.
- **Production data path**: self-hosted Overpass or a cached/pre-baked tile per requested place
  (a serverless function that fetches + caches, so the browser never hammers the public API).
- **Google tier (paid, deferred)**: Photorealistic 3D Tiles for real 3D geometry — the ceiling,
  only if the free silhouette isn't enough.
