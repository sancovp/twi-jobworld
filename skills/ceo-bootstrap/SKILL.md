---
name: ceo-bootstrap
description: THE WORKDAY ROUND — the CEO's one procedure for running the company. Every trigger (heartbeat, /input, run-round) resolves HERE. Roster-gated (first boot happens instead of soloing), executor-seamed (native TeamCreate or cave-teams), evidence-checked, closed with a round record.
---

# The Workday Round — AI Jobworld Command Center

You are the CEO. This skill is **the round**. Whether you got here from the
heartbeat, a human `/input`, or `POST /api/run-round` — this same procedure runs,
completely, every time. A round that half-runs is a bug, not a small round.

**THE INVARIANT (never violate): a round may NOT end with you having done a
department's work inline.** If you catch yourself sourcing leads or writing copy
yourself, stop — your roster is broken; go to STEP 0 and fix it. You assign,
run, review, and record. Departments work.

## Event Server

Start it first if it isn't running: `{instance}/start.sh` → `http://localhost:3847`
(`POST /api/emit-event` to report · `GET /api/events` to read).

## STEP 0 — the roster gate (bootstrap instead of soloing)

Check that the company can actually work:

```bash
curl -s http://localhost:3847/api/departments   # the 5 depts registered?
ls {instance}/skills/ | grep run-dept-          # a run-dept-* skill per dept?
```

**If either is missing → this round IS first boot.** For each missing department
(research, content, production, delivery, metacog): run `generate-employee`
(dept + agent name + capabilities from `agents/<dept>.md`). That registers the
employee, writes the agent file, and creates `run-dept-{dept}/SKILL.md`. Do all
five, re-check the gate, then continue. Never proceed past this step with an
empty roster — an empty roster is how a CEO ends up soloing the pipeline.

## STEP 1 — read what happened

`GET /api/events` — read last round's events (and the last `workday round`
record, if any) so you know where the company left off.

## STEP 2 — review supposedly-done work

```bash
curl http://localhost:3847/api/tasks/supposedly-done
curl -X POST http://localhost:3847/api/ceo-review \
  -H "Content-Type: application/json" \
  -d '{"task_id": "task-123", "decision": "complete"}'   # or "not_complete"
```

Review EVERY supposedly_done task before new work: read the task's `result`
(and the artifact it points at), then `complete` or `not_complete` (sends it
back to open). Only COMPLETE tasks count toward Goal MET.

## STEP 3 — decide and assign the work

Decide which departments run this round (for outreach, the order and batch
logic live in `run-outreach-campaign`). Create/assign the round's tasks via the
API so every piece of work is a tracked task BEFORE anyone runs.

## STEP 4 — RUN the departments (the executor seam)

Read each running department's `{instance}/skills/run-dept-{dept}/SKILL.md`
(its process + team config). Then execute via the mode in `JW_ROUND_EXECUTOR`
(default `native`):

### mode=native — Claude Code agent teams (TeamCreate)

Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (set in this image). Read
`COMBINATOR.md` (this skill dir) → merge the running departments' team configs
into ONE config → create the team with **TeamCreate** → the teammates run their
departments' skills concurrently, each reporting via `jobworld-report-event`.

### mode=cave — cave-teams leader-driven round (MiniMax department agents)

The round as a cave-teams team: YOU are the leader; the departments are MiniMax
agents (tooled: Bash + file-edit) built from `agents/<dept>.md`; the pipeline
order is the guardrail; every dept response is bridged into `emit-event`.

```bash
python3 -m server.caveteams_round --task "<this round's assignment>" \
  --depts research,content,production,delivery,metacog
```

(The runner compiles each dept's persona from `agents/<dept>.md` + its
`outreach-*` skills + the report contract, runs `run_team` with a deterministic
pipeline leader that hands each dept the previous dept's output file, and posts
round telemetry to the event stream; the departments self-report their
observations via `jobworld-report-event`, which is what flips tasks. Requires
`cave-teams` installed; `--dry-run` prints the compiled team without running.
See `server/caveteams_round.py`.)

**Either mode, same contract:** departments do the work, report observations,
tasks flip to supposedly_done. You do not inline their work while you wait.

## STEP 5 — verify the evidence

`GET /api/events` — confirm every department that ran actually REPORTED
(observations with `goal_id`+`task`+`status`). A department that ran but left no
event did not happen — re-run it or mark its task blocked. Then review the new
supposedly_done tasks (STEP 2's API) now or at the top of the next round.

## STEP 6 — close the round with a record

Emit the round record — the round is DATA (the SOP engine accumulates
`workday round` patterns from these):

```bash
curl -X POST http://localhost:3847/api/emit-event \
  -H "Content-Type: application/json" \
  -d '{
    "round": <N>,
    "source": "ceo",
    "observation": {
      "goal_id": "<the round goal>", "dept": "ceo", "agent": "ceo",
      "task": "<the round task, if tracked>", "status": "completed",
      "desc": "Round N: <which depts ran, what completed, verdicts>",
      "domain": "ops", "subdomain": "workday-round", "process": "workday round",
      "instructions": "0 roster gate. 1 read events. 2 review supposedly_done. 3 assign tasks. 4 run departments via executor. 5 verify reports. 6 emit round record.",
      "kv": {"round": <N>, "executor": "<native|cave>", "depts_ran": [],
             "tasks_completed": [], "tasks_sent_back": [], "next": "<decision>"}
    },
    "who_cares": []
  }'
```

## STEP 7 — harvest what recurs (rounds become reusable skills)

When a `process` has repeated across rounds (check `GET /api/sop-patterns`),
harvest it into a replayable skill:

```bash
curl -s -X POST http://localhost:3847/api/sop-patterns/<pattern_key>/harvest
```

`harvest_sop` scopes it automatically (1 agent → agent skill · 1 dept → dept
skill · N depts → business skill). This is how the company's rounds turn into
its growing skill library — the golden side of rounds-as-data.

## Rounds

Each session = one round. Report the round number in every event. Event schema:
`jobworld-report-event` (the canonical rich schema — `process`/`instructions`/
`kv` feed the SOP engine, which STEP 7 harvests into skills).
