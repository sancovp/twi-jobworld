# Rule 06 — The Agent Topology: HOW departments actually execute (written 2026-07-03)

This rule exists because a session spent hours re-deriving this from code and got it
WRONG. Read this before reasoning about "does the agent system run."

## The three systems (test them separately, name which one you mean)

```
S1 CLIENT-STUFF   accounts/creds/domains/calendar/assets   → mocked until clients deliver (JWOUT_MOCK=1)
S2 AGENT SYSTEM   the topology: CEO ⊕ departments ⊕ delegation/review loop
S3 APPLICATION    JW server + task/goal/event API + dashboards + terminal surface
```

S1 being blocked NEVER blocks testing S2+S3 — that is what the mock boundary is for.

> **UPDATE 2026-08-06 — the round now has a CONTRACT + an executor SEAM (see `ceo-bootstrap` =
> the Workday round; rule 08 TODO #9, superseded).** Every trigger (heartbeat · `/input` ·
> `POST /api/run-round`, now all converging on `workday_round_prompt()`) runs the same round, which
> is roster-GATED (STEP 0: empty roster → first boot, never soloing). "Run the departments" (STEP 4)
> resolves via `JW_ROUND_EXECUTOR`: **native** = CC agent-teams `TeamCreate` — the dir-loadout model
> below, a department's loadout being its `run-dept-{dept}` skill + `agents/<dept>.md`; **cave** =
> `server/caveteams_round.py`, `run_team` over MiniMax-runtime dept AgentRefs (personas compiled from
> the same files — NO claude-in-dir process, NO adapter). So the PASS assertions below ("a process
> ran IN its dir; its transcript shows ITS skill") apply to **native**; **cave** verifies the same
> topology through the STORE (dept observations → supposedly_done → review → complete → goal met) +
> the event stream + the round record, since MiniMax workers leave no CC dir-transcript. The round
> HARNESS is proven E2E both via the deterministic `--mock-workers` runtime and the store contract.

## The execution mechanism (the part that is NOT in the Python — do not go looking for it there)

**The CEO is Claude Code. A DEPARTMENT IS A DIRECTORY. Running ANY agent process in a
dir EQUIPS that dir's loadout (CLAUDE.md + .claude/*) — that is how Claude Code works
(the understand-* skills in this repo are MANDATORY context before reasoning here).**
There is deliberately no Python that "runs a department" *(native mode; cave mode adds one
deterministic executor — `caveteams_round.py` — outside the CEO, driving MiniMax dept agents)*:

1. `server/jobworld_agent.py` = the WORLD (store, task/goal/event/review API, heartbeat)
   + the main agent (the CEO). It is "single-agent CAVE" ON PURPOSE — the CEO brings
   its own workforce.
2. **Departments = directories.** No agent "files" are needed to run them: the CEO has
   skills that CALL departments — calling = spawning an agent process in the dept dir;
   the dir makes the loadout equip. `generate-employee` registers the employee in the
   world (`POST /api/agents`) and creates `run-dept-{dept}` — the CEO-side skill that
   calls that department.
3. **FIRST BOOT is mandatory** (agents/CEO.md, "Running outreach for a client"):
   register the 5 departments + employees BEFORE any work is assigned. An
   unbootstrapped world told to "run the campaign now" makes the CEO solo the
   pipeline (observed 2026-07-03; degenerate failure mode, not the design).
4. The round loop is `ceo-bootstrap`: read events → review supposedly_done
   (`POST /api/ceo-review`) → decide which departments run → read their run-dept
   skills → **call the departments (agent processes in their dirs)** → they report via
   `jobworld-report-event` (`POST /api/emit-event`) → tasks flip supposedly_done → repeat.
5. **AUTONOMOUS IS THE PRODUCT.** The heartbeat exists so the company runs the entire
   business autonomously; B6 = one specific process set up AS an autonomous business.
   Safety = the client gates (warmup/dedupe/CAN-SPAM/cost cap), not human triggering.

## What "DOES IT RUN" means (the only acceptable definition)

**The agent TOPOLOGY runs exactly as intended**: first-boot registers 5 depts + 5
employees; the CEO assigns tasks through the API; each department executes ITS OWN
`outreach-*` skill (visible in its own transcript); reports flow through the event
stream; the CEO reviews; the funnel fills. A CEO doing department work inline = FAIL.
A subprocess existing / HTTP 200 / verbs working in isolation = NOT "it runs."

PASS assertions for a mock round (check mechanically, not by eyeball):
- `GET /api/org-chart` → 5 departments, each with a registered agent
- department DIRECTORIES exist, each with its loadout (CLAUDE.md/.claude equipping
  its `outreach-*` skill)
- ≥1 project/milestone/goal + tasks created and assigned VIA THE API
- each department was CALLED — an agent process ran IN its dir and its transcript
  shows ITS skill (not the CEO doing the work inline)
- events.jsonl: dept reports → supposedly_done → ceo-review → complete
- outreach.db: contacts/sends/events written by the departments (mocked verbs)
- SOP pattern accumulated for the round

## The shipped frontend (verified 2026-07-03 — this is which archi version shipped)

- **JW dashboard** (`index.html`, python server): CHAT for the main agent
  (textarea → `POST /input`; output ← `GET /output`; one WebSocket for the live
  event/org stream) + org-chart/department Panes + AFK controls (automations,
  ralph-loop, close-day, blockages, calendar-sources).
- **ink-ceo** (`:{JOBWORLD_PORT}` "JOBWORLD Terminal"): browser terminal — ws →
  node-pty → **bash in the instance dir** (the client's direct claude/tmux entry) +
  agent→human MODALS (`/api/modal` long-poll) + `/api/*` proxy to the python server.
- Version verdict: the interface chats with the MAIN agent AND shows departments;
  the client's "main claude code" access is the ink-ceo terminal.

## Companions

`00-WORKER-LAYER-ARCHITECTURE.md` (the one law + 3 layers) · `01-DEPARTMENTS.md`
(org chart + stage→skill→verb map) · `03-STATUS.md` (the verification LADDER — cite
the rung) · `deploy/run-mock-instance.sh` + `deploy/campaign-trigger.md` (the S2+S3
mock harness) · `connectors/.../mock.py` (the S1 mock boundary).
