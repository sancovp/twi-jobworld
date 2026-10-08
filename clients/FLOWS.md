# `clients/` — the gate flow (rule 22)

A client dir is S1: the contract. `client.json` gates are DATA the CEO cannot
wish away — this is what makes the autonomy safe to sell.

## Flow — gate check (every round, before any delivery)

```mermaid
sequenceDiagram
  participant CEO as CEO
  participant CJ as clients/$JW_CLIENT/client.json
  participant API as JW API
  CEO->>CJ: read gates: dedupe/ · compliance.{postal,unsub} ·<br/>sending.domains[warmup_status] · reply_to · calendar_url ·<br/>host_base_url · success.{target,max_cost}
  alt any gate open (clients/b6 today)
    CEO->>API: POST /api/emit-event outreach_gate_blocker (one per gate)
    CEO->>CEO: write GATES.md (gate · source · blocker · owner)
    Note over CEO: dry stages (source/qualify/write) may proceed — DELIVERY HELD.<br/>Verified live 2026-07-03: 8 gates found, held, re-verified per heartbeat.
  else all gates resolved (clients/b6mock — filled with FAKE values)
    CEO->>CEO: full round runs, including delivery (mock verbs)
  end
```

## The mock client (b6mock)

`b6mock` = b6's shape with every gate LOUDLY faked (`*.example` domains,
mock postal, localhost host_base_url). `trashed.csv` deliberately contains
`drsquatch.com` so a correct source run VISIBLY excludes the Dr. Squatch mock
contact — dedupe is asserted, not assumed. Never point live creds at it
(`env_profile=mock`).
