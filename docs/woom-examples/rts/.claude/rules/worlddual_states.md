# WORLD-DUAL v1 prototype — concern state (rule-28 distributed dir-state)

> Structural truth = `docs/WORLD-DUAL-SCALE-MODEL.md` (+ `PLACEMENT-MATH.md`,
> `ASTRAL-RENDERING.md`); THIS table = what is happening HERE (the standalone
> harness that proves the loop). Browser-verified on the vite host `npm run dev`
> (:8788) at `worldtest.html`.

## Architecture (what lives here)

| piece | where | role |
|---|---|---|
| disk math (concentric rings) | `render/src/astral/place.ts` | PURE subset of PLACEMENT-MATH §3.1 — `ringRadius(d)=tanh(k·d/2)` (k=ln16), `rimGap`, `anchorAngleTurns`, `placeAnchor`, `worldFromDisk`, `displayRadius` (display-only remap, §10 P4). Zero three.js import; purity-audit clean. |
| prototype scene | `examples/rts/src/worldtest.ts` + `worldtest.html` | the typed-anchor form → concentric world → 3-altitude strange loop |
| reused (NOT rebuilt) | `interior.ts buildInterior` (room + avatar + exit), `kit/parts.ts` (houses/towers/laptop), classic `WebGLRenderer` | the HAVE pieces the design names |

## Build state

| step | status | evidence |
|---|---|---|
| disk math `place.ts` | **BUILT + tsc + purity clean** | `npm run check` green; HUD shows canonical r(1)=0.88235, r(2)=0.99222, r(3)=0.99951, r(4)=0.99997, r(5..6)→1 with gap>0 (rim reserved, KC7) |
| typed-anchor ingest (OM-style form) | **BUILT** | `worldtest.html` form (7 rings: room→earth); `Generate world →`; the ✎ anchors button reopens it |
| concentric placement on the disk | **BUILT** | 7 rings placed at `displayRadius(d)·R_SEA` (legible) labeled with the honest `ringRadius(d)` |
| procedural fill (dense center → silhouette rim) | **BUILT** | ring0 = life-size ROOM (buildInterior, avatar + laptop); rings1-2 kit houses; ring3 kit towers; rings4-6 blocked-out dark silhouettes — "known dense / unknown blocked-out" |
| entry strange loop (3 altitudes) | **BUILT + BROWSER-VERIFIED** | CHARACTER (in room, laptop) → **click laptop** → WORLD (overseer: room at center of rings) → GOD (full zoom-out: the whole astral disk). Screenshots for all three. Mode also via keys 1/2/3 + the bottom bar. |

## Gotchas (caught here)

- **classic WebGLRenderer only.** `structures.ts buildStructure` routes through
  `bestMaterial` → painterly **`MeshStandardNodeMaterial`** (three/webgpu/TSL) which the
  classic renderer cannot compile (`resolveIncludes … reading 'replace'`). The prototype
  uses kit primitives (classic `MeshStandardMaterial`) for the city ring instead. If this
  harness ever moves to `WebGPURenderer`, `buildStructure` can be reused directly.
- **headless-pane rAF is throttled/paused** (the glbtest trap) — the eased camera
  transition needs the render loop to tick. Verification drives it via `window.__settle
  (frames, stepMs)` (renders each step); `__setMode(m)`, `__rings()`, `__ringRadius(d)`
  are the other debug handles.

## ASPIRATIONAL (not built — see WORLD-DUAL-SCALE-MODEL.md build-state)

- the REAL ingest pipeline (real-world-knowledge → concentric anchors; the OM page as a
  live surface, not a harness form) · private you-dual vs shared world-dual separation ·
  Möbius scry navigation between anchors (PLACEMENT-MATH §5) · the materialization
  transition + three-state dress (ASTRAL-RENDERING §2-§3) · accurate geodata (OSM/geocode/
  elevation = the fidelity climb = the LEGENDARY rung) · VEC real↔virtual certificate ·
  a placement audit (`harness/audits/placement.ts` KC1-KC8) formalizing `place.ts`.
