# woom-examples — agent-rts examples (sent 2026-07-13, updated same day)

Mirrored from `~/claude_code/sanctuary-revolution-alpha/base/agent-rts/examples/`.

- `shared/geo.ts` — the free OSM pipeline (Nominatim + Overpass), shared by both examples.
- `woom-map/` — standalone geo-ingest prototype (:8796, live on Isaac's machine).
- `woom-site/` — the real deliverable: WOOM landing page (:8792, live) — real→room→
  laptop→WOOM game nesting (`index.html` + `src/main.ts`), the mocked in-world funnel
  chat (`src/mockchat.ts`), and the full build log (`.claude/rules/woom_site_states.md`).
- `rts/` — the WOOM/agent-rts render engine source: `src/` (main.ts, hud.ts, minimap.ts,
  sound.ts, create.ts, the *test.ts suite) + the matching `*test.html` harness pages +
  `vite.config.ts` + `.claude/rules/worlddual_states.md` + `.onionmorph/onion/place_metadata.json`.
- `terminal-funnel/` — a template.html + reference SKILL.md/screenshots +
  `terminal-funnel-skill.zip`.

**NOT included: `rts/assets` (a symlink to itself, ~1.2GB of GLB 3D models)**, and
`woom-site/assets` (the same symlink target, same reason). Binary game assets, not
doc/code content — skipped deliberately, not lost. Real source at the path above.
