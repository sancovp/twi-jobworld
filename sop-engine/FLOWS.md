# `sop-engine/` — SOP lifecycle flows (rule 22)

Standalone Node library (cli.js + sop-engine.js + sops.db). **Referenced by no
Python/shell in this repo today** — it is the search/run layer over the SOPs the
server extrudes; skill integration is future work (per its own header).

## Flow — SOP lifecycle (record → extrude → index → run)

```mermaid
sequenceDiagram
  participant CEO as CEO
  participant API as /api/emit-event (server)
  participant JA as jobworld_agent SOP engine
  participant FS as sops/{domain}/{sub}/{slug}.json
  participant SE as sop-engine (Node: init/index/search/get/list/run)
  CEO->>API: sop_start {domain, subdomain, process, tags, kv}
  Note over JA: kv keys become the input_signature (the SOP's parameters)
  loop agents work
    API->>JA: events accumulate into the active flow
  end
  CEO->>API: sop_end {process}
  JA->>FS: EXTRUDE the JSON config (steps = the recorded events)
  SE->>FS: index() — scan sops/ → SQLite FTS5 (BM25)
  CEO->>SE: search()/list()/get() — find a proven procedure
  CEO->>SE: run(slug, kv) — emits a NEW sop_start with filled params
  Note over SE,API: run() replays the procedure as a fresh flow — the company<br/>re-executes its own crystallized process. Harvest = goldenization (rule 06).
```

Two SOP paths coexist in the server (see `server/FLOWS.md` Flow 4/6): the
legacy `sop_start`/`sop_end` extrusion (this engine's input) and pattern
accumulation → `harvest_sop` → SKILL.md. Convergence is a rule-08 topic.
