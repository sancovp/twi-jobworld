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
| 2 | ~~SDK turn LOCK in `ClaudePMainAgent`~~ **✅ BUILT** (`p_main_agent.py` `_turn_lock_for` + `turn_in_progress()`) | heartbeat turn can overlap a running turn → session fork (observed: two main transcripts) |
| 3 | CEO provider/model switch (`CEO_PROVIDER`, `DEFAULT_CLAUDE_CODE_MODEL=claude-sonnet-5`) | run without MiniMax keys on Sonnet 5; `_provider_env()` already supports the fallback |
| 4 | Interface relaunch button (dashboard/ink-ceo → restart CEO session with chosen provider env) | the switch Isaac called necessary |
| 5 | tmux CEO mode restored as `CEO_MODE=tmux` | the PRODUCTION surface: client attaches, his account, his main claude code |
| 6 | ~~`generate-employee` must create the DEPT DIR + loadout~~ **✅ `run-dept-{dept}` skill dir per dept** (`generate.sh`, fixed 2026-08-06) — the roster gate reads these; a bare `{dept}` dir was invisible to it | rule 06; the loadout for a NATIVE teammate is its `run-dept-{dept}` skill + `agents/<dept>.md`, not a full CLAUDE.md dir |
| 7 | entrypoint vs `instantiate.sh` divergence | container worlds born different from template worlds |
| 8 | `BASE-IMAGE-CONTENTS.md` or vendor the base source | half the running system is invisible to sessions in this repo |
| 9 | ~~cave-teams as the round executor (teammates = claude-in-dept-dir; the adapter is the first piece)~~ **✅ SUPERSEDED by the WORKDAY ROUND CONTRACT** (`ceo-bootstrap` = the round; STEP 4 executor SEAM `JW_ROUND_EXECUTOR=native\|cave`). **native** = CC agent-teams `TeamCreate` (dept teammates); **cave** = `server/caveteams_round.py`, `run_team` over MiniMax-runtime dept AgentRefs (NO claude-in-dir adapter — Isaac's call). Proven E2E with REAL MiniMax workers (research sources + content writes copy → both self-report → goal `met`) AND via the deterministic `--mock-workers` harness; SOP harvest → skills proven live. Open: a live native `TeamCreate` round (needs a real CEO turn). | rounds become DATA (the round-record + SOP patterns); `harvest_sop` emits golden skills |

## Testing gate (before any commit that touches S2/S3)

Run the mock harness (`deploy/run-mock-instance.sh`) or state explicitly why
not. The PASS assertions live in rule 06. "It builds" is not "it runs."
