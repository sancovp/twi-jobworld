# WOOM SITE — concern state (rule-28 distributed dir-state)

The public **community-funnel landing page** for WOOM. A thin marketing shell
that wraps the VERIFIED WORLD-DUAL astral scene — it is NOT engine work.
Born 2026-07-12 (Isaac + Fable) from the terminal-community-funnel-maker idea:
"could the real WOOM website have the astral room demo?"

## Architecture (what lives here)

| piece | where | role |
|---|---|---|
| marketing shell | `index.html` | WOOM wordmark · hero headline + email velvet-rope · descend hint. No debug HUD. |
| scene + cinematics | `src/main.ts` | reuses the astral scene, adds auto-orbit → OrbitControls handoff, the scripted GOD→WORLD→CHARACTER descend, and the email capture |
| vite host | `vite.config.ts` | serves this dir as root, port **8792** (8790/8788 were taken by other live servers); `fs.allow` = repo root so `../../../render` imports resolve (same depth as examples/rts) |
| **REUSED, not rebuilt** | `render/src/astral/place.ts` (disk math), `render/src/three/interior.ts` (room + avatar), `render/src/three/kit/parts.ts` (procedural structures), `kernel/src/clock.ts` SeededRng | the same pure pieces `examples/rts/src/worldtest.ts` uses — engine untouched |

The scene-build functions (`buildAstralSea`/`buildRing`/`buildLaptop`/`makeLabel`/
`buildHouse`/`buildTower`/`buildSilhouette`) are ADAPTED (copied + marketing-tuned)
from `worldtest.ts` — a deliberate fork, so worldtest stays the untouched verified
harness. Provenance is noted in `main.ts`'s header.

## Build state

| component | status | evidence |
|---|---|---|
| cold render, no backend | **VERIFIED** | loads the astral disk (GOD) on `npx vite serve examples/woom-site` → :8792, zero backend/feeder, no console errors |
| cinematic auto-orbit on load | **VERIFIED** | `__cinematic()===true` at boot; camera orbits the god disk (`orbitAngle += dt*0.045`) — advances between the two load screenshots |
| click-to-interact handoff | **VERIFIED** | first pointer/wheel/descend → `handOffControl()` sets `cinematic=false` + enables OrbitControls (`handedOffAfterInteraction:true`) |
| descend strange loop GOD→WORLD→CHARACTER | **VERIFIED** | `__setMode`+`__settle` drove all three altitudes; each renders (screenshots), stage captions show ("the astral sea"/"your world"/"your workshop") |
| email velvet-rope capture | **VERIFIED** | invalid→"Enter a valid email"; valid→"◎ You're on the list" + `localStorage.woom_waitlist` set + button "Requested ✓" + inputs disabled |
| **GEO FUSION — situate on your REAL street** | **VERIFIED** | typed "Times Square, New York" → `__situate()` → geocode + Overpass → **179 real buildings** built in astral style (dark masses + emissive edges), abstract scatter rings hidden, "your room" = glowing cyan marker on the gold centre-most building; mode→'world', geonote "◎ … — 179 buildings. Your world is situated. Descend to enter." (screenshot); no console errors |

## INSIDE-THE-LAPTOP = THE REAL WOOM GAME (2026-07-12, Isaac) — char-select → world → mocked chat funnel

Isaac: *"that's still not inside woom… when you load woom load the character select screen,
then they hit enter world, we can load a frozen one, then tell them to join when they start a
fake conversation — a mocked conversation that pretends to respond… after the first response
it says 'Love this? Join here…'"* The astral rings alone were NOT "inside WOOM" — the game
front-end is the char-select → world → conversation. Corrected flow through the laptop:

```
room → [open laptop] → CHARACTER-SELECT (real) → Enter World → frozen world + MOCKED CHAT → "Join here"
```

- **Char-select = the REAL game screen, reused not rebuilt**: `mountCreateScreen({onEnter,onSkip})`
  from `examples/rts/src/create.ts`, imported directly. Self-contained overlay (its own WebGPU
  turntable). `examples/woom-site/assets` is a **symlink → `../rts/assets`** so it loads the CURRENT
  **exoblend Blender GLB** models (VERIFIED: "exoblend model — Blender-authored, 41 skinned · ~12896
  tris" — the current scout body, NOT the old loft one), + the gear cyclers from parts-manifest.json.
- **Enter World (ACCEPT)** → `enterWorld(name)`: the astral concentric world (`astralScene`) becomes
  the frozen backdrop, camera to `CAM.game`, and `mountMockChat` opens. OVERSEE → same, no character.
- **Mocked chat** = `src/mockchat.ts` — a self-contained scripted funnel panel (no backend). Honest
  mock: canned agent lines only. Greeting → user msg → canned reply → reveals the CTA
  **"Love this? The founding circle is forming now" + inline email "Claim my spot →"** → persists
  `localStorage.woom_waitlist` + `onJoin`. "← leave" tears down → back to the workshop.
- Wiring: the wizard's room action + the laptop raycast both call `openWoom()` (not `goTo('game')`).

VERIFIED 2026-07-12 (full drive, screenshots): situate→neighborhood→room→open laptop→char-select
(exoblend model)→ACCEPT→frozen world + chat greeting "Wanderer"→user msg→canned reply→CTA shows→
email "founder@studio.com" claimed (note + localStorage)→"← leave"→back to room, wizard restored.
No console errors.

New pieces: `src/mockchat.ts` (funnel chat), `assets`→`../rts/assets` symlink (game GLBs).

## NESTING CORRECTION (2026-07-12) — astral is INSIDE the laptop, not above (Isaac, absolute)

Isaac: *"why is astral above the real world? … inside the room there needs to be a
laptop/computer, which literally has the literal gameworld when they descend into it — IN
THERE is the astral view."* The old `god→world→character` model had the astral as the
OUTERMOST parent of reality — **inverted**. Corrected to the true onion nesting:

```
neighbourhood (real, overhead)  →  room (real, inside)  →  [LAPTOP]  →  game (astral, INSIDE the computer)
                    outer  ───────────────────────────────────────────────────────►  inner
```

**Two scenes now, toggled by level (`setScene`):**
- `realScene` — your workshop room + the laptop (+ the OSM neighbourhood on situate). Shown at `neighbourhood`/`room`.
- `astralScene` — the astral sea + concentric rings (`your craft`→`the world`) + a central glow. The WOOM game world that lives INSIDE the laptop. Shown ONLY at `game`.

**The laptop is the portal**: in `room`, clicking the laptop (`userData.laptop` raycast on `realScene`) OR the wizard's "Open the laptop → enter WOOM" DIVES into `game`; a `#fade` flash covers the real↔astral scene swap + camera snap. "Leave the laptop ↑" returns to `room`.

**Landing is now GROUNDED**: the pre-situate cinematic orbits your WORKSHOP (radius 42, height 24), not the astral disk floating above. `Level = 'neighborhood'|'room'|'game'` replaced `Mode='god'|'world'|'character'`.

VERIFIED 2026-07-12: land→grounded room; situate Times Square→neighbourhood (174 bldgs); →room; →game shows the astral concentric world ("Inside WOOM / Leave the laptop ↑"); →room returns ("Open the laptop → enter WOOM"); no console errors (screenshots).

## UX PASS (2026-07-12) — wizard + form-collapse + framing fixes (Isaac's live-drive bugs)

Isaac drove the fused build and hit four real UX bugs; all fixed + VERIFIED:

| bug | fix | evidence |
|---|---|---|
| the form card never went away after completing | `#hero.compact` (shrinks to a slim bottom bar on situate, hides headline/para) + `#hero.done` (slides fully out on email submit, 900ms after "Requested ✓") | `heroCompact:true` post-situate; `heroDone:true` post-email (screenshots) |
| had to situate TWICE to load geo | `withRetry()` wraps `geocode`+`fetchOSM` — one retry after 800ms on transient Nominatim/Overpass rate-limit/cold-drop; button shows "Locating…" | situate succeeds first call (79 buildings, Kennesaw) |
| descend to character showed a WALL from outside | root cause = the offset "your room" building + a mis-tuned cam. Now: workshop OWNS the centre (`CENTER_CLEAR=42`, beacon at origin, no offset highlight), and `CAM.character` re-tuned to `(-9,5.5,10)→(3,2.2,-4)` INSIDE the 26.6-wide room (`__roomInfo` measured min/max ±13.3) | screenshot: avatar in the room on its ring pedestal, desk + neighborhood beyond — not a wall |
| the descend hint was too hard to find (bottom-left) | replaced with a prominent top-centre **WIZARD** (`#wizard`) that appears after situating and always shows the next move + a big button, cycling GOD→WORLD→CHARACTER→GOD; the `#hint` is now just "drag to explore" | wizard title/action update per altitude (`wizTitle`/`wizAction` reads) |
| requesting entry didn't situate (payoff gated behind a 2nd button) | `submitEmail` is now async: if `!realWorld && placeEl.value`, it `await situate()` BEFORE capturing — so filling the address + hitting "Request entry" (skipping "Situate") still assembles their world | typed "Trafalgar Square, London" + email → Request entry (no Situate click) → 198 buildings situated, `heroDone:true`, wizard shows the place (screenshot); dense-London Overpass took ~10s, "Situating your world…" note covers the wait |

New verification handles: `__situate()`, `__roomInfo()`, `__camAt(px,py,pz,tx,ty,tz)`.
STILL the OLD loft avatar in the workshop (Isaac flagged) — the exoblend-GLB swap is
deferred (a 2%-of-frame element at the hero altitude; blender-only law, separate lane).

## The GEO FUSION (2026-07-12) — neighborhood ring = your ACTUAL street

The `buildRing` `SeededRng` scatter is REPLACED, on demand, by the visitor's real
neighborhood. The hero gained a "Situate my world" address input; `situate()`:
1. `geocode(place)` + `fetchOSM(lat,lon,300)` via **`../../shared/geo.ts`** (the ONE
   free Nominatim+Overpass pipeline, shared with examples/woom-map — no duplication).
2. `buildRealNeighborhood(ways)` — projects footprints, scales to fit the sea
   (`NEIGH_FIT=240` inside the `R_SEA=300` rim), extrudes each in astral materials
   (`neighBody` dark + `neighEdge` glowing `EdgesGeometry`), keeps a `CENTER_CLEAR=28`
   zone for the workshop interior, highlights the centre-most building as "your room".
3. Swaps: hides `ring-1..6` (keeps sea + rim + `ring-0-room`), adds the real neighborhood,
   descends to the WORLD altitude to reveal it.
Verification handle: `window.__situate()` (awaitable). PURE-safe: positions come from
OSM data, no `Math.random`/`Date.now`.

## Gotchas (caught here)

- **classic WebGLRenderer only** (inherited from worldtest): the astral scene uses
  kit primitives + `MeshStandardMaterial`, NOT `structures.ts`'s painterly
  `MeshStandardNodeMaterial` (three/webgpu/TSL) which the classic renderer can't compile.
- **headless preview pane throttles/pauses rAF** — the live auto-orbit + button
  transitions don't animate reliably in screenshots. `window.__settle(frames, stepMs)`
  drives transitions deterministically for verification; `__setMode`/`__mode`/`__cinematic`
  are the other handles.
- **strictPort collisions**: 8788 (examples/rts) and 8790 (a char-creator server from
  another session) were live; this site took 8792. If 8792 is taken, bump the port.

## ASPIRATIONAL (not built)

- **Real waitlist backend** — the email capture is a v1 velvet-rope (localStorage + a
  "you're on the list" confirm, mirroring the terminal-funnel pattern). TODO: POST to
  the real WOOM waitlist endpoint when the backend exists (marked in `main.ts submitEmail`).
- **Ring-label polish** — the sprite labels (`depthTest:false`) loom huge at the CHARACTER
  altitude (sized for the god view); acceptable for v1, tune per-altitude scale later.
- **Interactive god-mode** (band-dressed world-systems via a MockGodTransport port of
  `feeders/god/server.py`) — deferred; v1 is the concentric world-dual cinematic, not the
  sanctuary/astral/wasteland grade demo.
- **Deploy** — static build (`vite build`) + hosting not yet done; site is dev-verified only.
  Target: Cloudflare Pages (static three.js needs NO server); waitlist → beehiiv API or a
  Pages Function. Hetzner box only for the future LIVE playable WOOM, never this landing.
- **GEO FUSION polish (v2)** — let the visitor CLICK to pick "your room" building (now auto =
  centre-most); road lines in the astral style; the CHARACTER descent dive toward the chosen
  building; roads/height sparsity handling. The neighborhood currently sits as a flat patch on
  the sea — a truer WORLD-DUAL mapping would remap it onto the Poincaré rings (`place.ts`).
- **Funnel link-in** from `terminal-community-funnel-maker` (the deepest easter egg → this URL).
