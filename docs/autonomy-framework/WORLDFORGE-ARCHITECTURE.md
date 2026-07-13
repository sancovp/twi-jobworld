# Architecture: JobWorld × PromptWorld on cave-harness

Recon date: 2026-06-12. Sources: `mind_of_god` container (`/home/GOD/.claude/rules/canonical-source-dirs.md`),
images `jobworld-cave:latest` + `promptworld:latest`, repos `sancovp/cave`, `sancovp/promptworld`,
`sancovp/twi-jobworld`, RALPH source at `mind_of_god:/home/GOD/ralph-saas/`.

Working name: **WorldForge** (placeholder — Isaac names things). Mechanism-first description:
*an agent-automation operating console: a multi-agent runtime with a programmable calendar,
a job queue, and an organizational work graph, served as one web app.*

---

## 1. What exists (the recon)

### cave-harness — the runtime (keep unchanged, it's the foundation)

`pip install cave-harness`. Virtualizes Claude Code behind FastAPI/uvicorn. The primitives that matter:

| Primitive | File | What it is |
|---|---|---|
| `CAVEAgent` + anatomy | `core/cave_agent.py`, `core/mixins/anatomy.py` | Agent with **Organs**: Heart (pumps prompts via `Tick`s — incl. a 60s `cron_scheduler` tick), Blood (context), Ears (messages) |
| `World` | `core/world.py` | The environment organs perceive. Holds **EventSources**: deterministic (crons), probabilistic (RNG), external (Discord/webhooks), agent messages. `Clock` = timezone-aware single source of time truth |
| `Calendar(Compiler)` | `core/calendar.py` | **Compiles JSON scheduling specs into live `CronAutomation`s** in an `AutomationRegistry`. Spec = schedule (cron or `every:<sec>`) + chain_spec + `expected_deliverables` + delivery + `code_pointer`/`code_args` |
| `RalphSchedulerSource` | `core/ralph_scheduler.py` | File-queue EventSource (`pending/ running/ done/ failed/`, max 1 running) dispatching RALPH jobs: repo + code_target + requirements + n_runs, one-shot or recurring |
| Hooks/loops/channels | `core/hooks.py`, `core/loops/*` | Hook registry+dispatch, autopoiesis/guru loops, inbox, event broadcaster/router |

### JobWorld — the company sim (take its OPERATIONAL organs)

`jobworld-cave:latest`, repo `twi-jobworld`. FastAPI server (`/agent/server/jobworld_server.py`, 424 lines)
+ `jobworld_agent.py` (882 lines, a CAVEAgent with a CEO heartbeat tick).

**Best parts to take:**
- **Work graph**: Projects → Milestones → Goals → Tasks, org chart (Company → CEO → Departments → Agents → Goals), event log (every action timestamped), task states incl. `supposedly_done` (verification built into the ontology!)
- **Day simulation**: `/api/day`, `/api/close-day` — gives the company a tempo
- **Ralph loop toggle**: persistent prompt control, on/off from the dashboard
- **Calendar surfaces**: `/api/automations` (schedule via `Calendar`), `/api/automations/view/{days}`, and — the sleeper killer feature — **`/api/calendar-sources`: multi-instance calendar merge.** Worlds can federate their calendars.
- Skills: `instantiate-jobworld`, `generate-employee`, `ceo-bootstrap`, `jobworld-report-event`

**Weak part:** the UI (`ink-ceo/` — one index.html dashboard).

### PromptWorld — the builder guild (take its UI and its DISCIPLINE)

`promptworld:latest`, repo `sancovp/promptworld`. The newest thinking (pushed today).

**Best parts to take:**
- **The SPA** (React/Vite/Tailwind/Monaco): Main (chat + file workbench + embedded terminal),
  Specialist, **Group (N agents side-by-side, saveable layout templates)**, Crons, Gym pages.
  Full component library already exists (`AgentWindow`, `Thread`, `FileExplorer`, `TerminalPanel`,
  `CronsPage`, `ProfileEditor`, avatars/profiles…).
- **Engineer-CEO + seven wrights** (skill / mcp / prompt / harness / team / workflow / operating_system),
  each an AIOS dir that *codes an agent*; CEO delegates or does it itself.
- **The thin-layer doctrine** (`promptworld_automations.py` docstring is the canon):
  *Worlds do NOT grow their own engines.* PromptWorld's whole automation layer is (1) one
  code-pointer `fire_agent_turn` that POSTs to its own loopback chat API on a daemon thread
  (Heart tick never blocks), and (2) helpers over CAVE's real `AutomationRegistry`.
- **`compile-a-world` skill**: \*World = team-leader + specialists + domain + driver — a named,
  reusable architecture pattern. The meta-compiler.

---

## 2. The synthesis — what makes the merge "amazing"

PromptWorld **builds** components. JobWorld **runs** a company. Today these are separate loops.
The merge closes them into one:

```
        BUILD (PromptWorld)                      RUN (JobWorld)
  CEO → wright builds component  ──hire──▶  generate-employee wraps it as an
                                            agent with a department, a calendar
                                            seed, and KPIs in the work graph
        ▲                                            │
        │                                            ▼
  improvement tasks created  ◀──review──  day closes; event log + deliverable
  in the work graph                       checks score what actually shipped
```

**A company that hires what it builds, and rebuilds what underperforms.**
The work graph's `supposedly_done` state + Calendar's `expected_deliverables` checking are the
verification spine: nothing counts as done because an agent said so.

### The automation model (one engine, two dispatch tiers)

Everything schedulable is a Calendar spec compiled into a CronAutomation. Two tiers of what fires:

1. **Light: `fire_agent_turn`** (from PromptWorld) — POST a prompt to any agent's loopback chat
   endpoint on a schedule. *The programmable calendar:* agents scheduling turns of agents
   (including themselves). Standups, reviews, content runs, day-close — all just calendar entries.
2. **Heavy: RALPH dispatch** (from JobWorld/CAVE) — queue a multi-run autonomous job
   (repo, code_target, requirements, n_runs) through `RalphSchedulerSource`'s file queue.
   Local queue by default; `ralph-hub` MCP → RALPH SaaS (fly.dev) as the remote tier later.

Plus **calendar federation**: jobworld's `calendar_sources` merge means N world-containers can
share one composite calendar. A fleet of Worlds with a single operational view.

---

## 3. The layer cake

```
L4  SPA (PromptWorld frontend, extended)
    Main · Specialist · Group · Crons →  + Company page (org chart, metrics, day)
                                         + Calendar page (7-day merged view, spec composer,
                                           deliverable green/red per entry)
                                         + Runs page (RALPH queue: pending/running/done/failed)
L3  Automation surface (thin, per doctrine)
    fire_agent_turn loopback bridge · Calendar spec helpers · ralph submit/list ·
    calendar_sources merge (ported from jobworld)
L2  Operations spine (ported from jobworld_server/agent as a module)
    work graph (P→M→G→T) · org chart · event log · day cycle · ralph-loop toggle
L1  World module (the guild, from PromptWorld)
    Engineer-CEO + seven wrights + generate-employee ("hire" pipeline) + departments
L0  cave-harness (unchanged)
    CAVEAgent · Heart/World/Clock · Calendar(Compiler) · AutomationRegistry ·
    RalphSchedulerSource · hooks · loops · HTTP server
```

New code lives in L2-port, L3 glue, and 3 new SPA pages. **No new engines anywhere.**

---

## 4. Build plan

**Phase 1 — Chassis.** Fork PromptWorld as the base app. Mount jobworld's server module
(work graph, day, events, ralph-loop routes) beside the existing PromptWorld routes; port
`calendar_sources`. One container, one port, both route families.

**Phase 2 — Surfaces.** Three new SPA pages (Company / Calendar / Runs) using the existing
component library. The Calendar page's spec composer writes real Calendar JSON specs;
deliverable status renders from `check_deliverables`.

**Phase 3 — The hire loop.** Wire wright-build → `generate-employee`: a built component gets an
agent wrapper, a department, a seeded calendar (its routine), and KPI tasks in the work graph.
Day-close itself becomes a CronAutomation that produces the day report and the next day's plan.

**Phase 4 — Federation.** Multiple world-containers (a JobWorld instance per venture — e.g.
Stillpoint Media, B6) publishing calendars into one merged Company view. Optional RALPH SaaS
hub for remote/heavy jobs.

---

## 5. Risks / constraints found in recon

- **croniter is absent in the images** — `Calendar.schedule` validates 5-field cron with croniter;
  PromptWorld dodges via `every:<seconds>` intervals. Either bake croniter into cave-harness-base
  or standardize on intervals + a tiny cron-to-next-fire fallback.
- **Heart tick must never block** — PromptWorld's daemon-thread dispatch is the pattern; keep it
  for every new code-pointer.
- **RALPH local queue is max-1-running** — fine for one box; the SaaS hub is the scale-out path.
- **Credential rule from mind_of_god applies**: *never run claude with oauth creds in spawned
  containers* — the PromptWorld pattern (provider token as `ANTHROPIC_AUTH_TOKEN` at boot,
  `docker cp` creds, never baked into image) is the one to keep.
- **Licensing**: monorepo is PRIVATE (per canonical-source-dirs — do not re-confuse this);
  cave/promptworld are published public subdirs. The merged World should follow the same
  publish topology (private dev → CI publishes to its own public repo).

## 6. Open questions for Isaac

1. **Name** the merged World. (WorldForge is a placeholder; it's really "the company that
   hires what it builds" — OpsWorld? FoundryWorld? you'll know it when you say it.)
2. **Fork or compile?** Fork PromptWorld directly, or use its own `compile-a-world` skill to
   generate the merged World from the two patterns — eating the dogfood and stress-testing the
   meta-compiler in one move. (Recommendation: *compile*, falling back to manual fork where the
   compiler isn't push-button yet — the gaps found become the compiler's roadmap.)
3. **Model/auth tier** for the agents (MiniMax-M3 like PromptWorld, or Anthropic API keys?).
4. Where does this live in the monorepo — `application/` sibling to promptworld, presumably?
