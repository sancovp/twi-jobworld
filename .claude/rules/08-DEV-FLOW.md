# Rule 08 — The dev flow (how changes are made here)

**The loop, in order, every time:**

```
1. FOLLOW the flows   — read rule 07 + the touched dir's FLOWS.md BEFORE changing code.
2. MAKE the change    — smallest change that satisfies the flow; modularize when a
                        dir's rules can't cleanly describe its contents anymore.
3. UPDATE the diagrams — the SAME commit updates FLOWS.md / rule 07 / rule 06.
                        A change whose diagram is stale is NOT done (rule 26).
4. COMMIT + PUSH      — branch worker-layer, origin sancovp/twi-jobworld.
```

A session that cannot find a flow diagram for the boundary it is changing must
WRITE one first — that is not overhead, it is the missing map that cost us this
whole excavation (2026-07-03).

## The dev context is BAKED INTO THE IMAGE

`Dockerfile.sdk` copies `.claude/rules/` + every dir's `FLOWS.md` into
`/agent/`. Any agent working inside the image has the same map developers have.
If you add a rule or flow, it ships on the next build — that is intentional.

## Modularization TODOs (talk before doing — each follows the loop above)

| # | item | why |
|---|---|---|
| 1 | `p_main_agent.py` + `convo_registry.py` → `server/` | root-level strays; they are server components |
| 2 | SDK turn LOCK in `ClaudePMainAgent` | heartbeat turn can overlap a running turn → session fork (observed: two main transcripts) |
| 3 | CEO provider/model switch (`CEO_PROVIDER`, `DEFAULT_CLAUDE_CODE_MODEL=claude-sonnet-5`) | run without MiniMax keys on Sonnet 5; `_provider_env()` already supports the fallback |
| 4 | Interface relaunch button (dashboard/ink-ceo → restart CEO session with chosen provider env) | the switch Isaac called necessary |
| 5 | tmux CEO mode restored as `CEO_MODE=tmux` | the PRODUCTION surface: client attaches, his account, his main claude code |
| 6 | `generate-employee` must create the DEPT DIR + loadout (departments are directories) | rule 06; observed gap: employees registered via API with no dirs |
| 7 | entrypoint vs `instantiate.sh` divergence | container worlds born different from template worlds |
| 8 | `BASE-IMAGE-CONTENTS.md` or vendor the base source | half the running system is invisible to sessions in this repo |
| 9 | cave-teams as the round executor (CC controls cave-teams via SDK; teammates = claude-in-dept-dir) | rounds become DATA; SOP harvest emits golden team configs; the adapter (claude-in-dir agent type) is the first piece |

## Testing gate (before any commit that touches S2/S3)

Run the mock harness (`deploy/run-mock-instance.sh`) or state explicitly why
not. The PASS assertions live in rule 06. "It builds" is not "it runs."
