# *World Spine — Low-Level Design (LLD)

> **Status: DRAFT v0.1 — Fable, 2026-07-03.** The design-dense artifact the
> non-Fable weeks execute from. Lives here until the spine's canonical dir is
> named (Isaac's call); then this file MOVES there and this copy becomes a pointer.
> Companions: `~/avi-jw/.claude/rules/07-ARCHITECTURE.md` (current JW),
> `05-AUTONOMY-BRIDGE.md` (the theory), cave-teams `THE-ONLY-SOURCE-OF-TRUTH.md`.

## 0. What this is

ONE spine for a family of *World architectures (JobWorld first, PromptWorld/WoS
later): **OM app (the permanent face) + cave-teams (rounds as data) + CAVE
(runtime host) + a world-pack (per-world data)**. It replaces the hand-rolled JW
world/CEO (~1,600 lines: `jobworld_agent.py`, `jobworld_server.py`,
`p_main_agent.py`) with published, tested engines. The avi-jw **worker layer
survives unchanged** (jwout + clients/ + outreach skills + mock harness).

## 1. Deployment view (the corrected picture — Isaac 2026-07-03)

```
CLIENT HAS an OM APP                    (the product face they own & keep forever)
CLIENT HAS a Claude Max subscription    (their account; OAuth into claude code)
OM APP LAUNCHES a team                  (cave_team() → ephemeral CAVEHTTPServer per run)
TEAM USES the client's claude code tmux (their Max account backs the agents)
MiniMax = OPTIONAL capacity add-on      (never assumed; Profile B only)
```

```mermaid
flowchart TB
  subgraph CLIENTBOX["client machine / hosted box"]
    OM["OM app — chat face, calendar/automations,<br/>LAUNCH TEAM button"]
    subgraph RUN["per-run (ephemeral)"]
      CT["cave-teams: leader loop + guardrails +<br/>session inbox (messages are FILES)"]
      CAVE["ephemeral CAVEHTTPServer"]
    end
    subgraph AGENTS["the client's claude code (Max OAuth)"]
      L["leader turn"]
      W1["dept worker tmux 1"]
      W2["dept worker tmux N"]
    end
    WP["world-pack: clients/ · dept dirs ·<br/>skills · dashboards config"]
    DB["world state: outreach.db · events · store"]
  end
  OM -->|launch(team_spec, task)| CT
  CT --> CAVE
  CT -->|dispatch msg files| L & W1 & W2
  W1 & W2 -->|jwout verbs| DB
  WP -->|loadouts + gates| CT
  classDef om fill:#1b4,color:#fff
  class OM om
```

## 2. Auth/provider profiles

**A Max account backs claude code in BOTH forms — interactive tmux AND the
claude-code SDK** (the SDK spawns the claude CLI, which uses the stored OAuth
creds; this is the intended use — Isaac develops everything this way, and
Anthropic rolled back the announcement that would have changed it). The
**one-time onboarding step**: attach into the box's tmux, run the `claude`
auth flow once → creds persist in `~/.claude` on the volume → every subsequent
agent (tmux panes AND SDK turns) rides the account like a human using it.
Only raw-API runtimes (heaven OMRuntime, MiniMaxRuntime) need actual keys.

| | Profile A — client install (B6 v1) | Profile B — scale |
|---|---|---|
| leader | client's claude code (tmux or SDK — both on their Max) | same |
| workers | client's claude code tmux (serialized / low concurrency) | + MiniMax heaven runtimes (parallel, cheap) |
| OM chat runtime | claude-code SDK on their OAuth (intended, proven daily) | heaven path |
| client buys | nothing beyond Max (+Instantly+hosting, already budgeted) | MiniMax key |

Providers are **per-agent config behind ONE seam** (§3.1) — a profile is data,
not architecture. Dev harness = MiniMax (our key) — a third profile, same seam.

## 3. The seams (interface contracts — implement EXACTLY these)

### 3.1 Runtime seam (exists — cave-teams' contract)
```python
class Runtime(Protocol):
    def run(self, prompt: str) -> str: ...        # sync or async both accepted
```

### 3.2 TmuxClaudeRuntime (NEW — the one adapter to write)
```python
class TmuxClaudeRuntime:
    """The client's interactive claude code as a team agent."""
    def __init__(self, code_agent: cave.core.agent.ClaudeCodeAgent): ...
    def run(self, prompt: str) -> str:
        return self.code_agent.send_and_wait(prompt)   # cave/core/agent.py:966
```
- `ClaudeCodeAgentConfig(tmux_session=..., working_directory=<dept dir>,
  agent_command="claude --permission-mode bypassPermissions")` — **working_directory
  = the dept dir ⇒ the dir loadout equips** (the flat-vs-tree law carries over).
- RISK (exercise first): `send_and_wait` reply-detection = pane-scrape heuristic
  (3 stable polls + `◇` marker). Mitigation: teammates respond by WRITING FILES
  (the session-inbox protocol) — the pane text is only a liveness signal, the
  message file is the payload. Leader side: `file_leader` already works this way.

### 3.3 Leader seam (exists)
```python
llm_leader(rt)   # any Runtime as leader (proposals parsed from its reply)
file_leader(rt)  # leader WRITES message files with its own tools (claude code native)
```
Client profile: leader = `file_leader(TmuxClaudeRuntime(...))` or OM itself (§6.3).

### 3.4 Launch seam (OM → team)
```python
result = cave_team(team, agent_runtimes=..., leader_runtime=...,
                   task=<task text or file path>, open_rules=...)
# OM exposes this as a tool/skill: launch_team(world_pack, team_name, task)
```

## 4. The world-pack (per-world data — the schema)

```
worldpack/
├── world.json          # {name, teams: {round: <cave() spec or golden ref>},
│                       #  profiles: {A:{...}, B:{...}}, heartbeat: {...}}
├── clients/<c>/        # UNCHANGED from avi-jw (client.json gates, dedupe/, md)
├── departments/<d>/    # the dept DIR loadouts (CLAUDE.md + .claude/skills)
├── skills/             # world-level skills (outreach-*, report-event, ...)
└── dashboards/         # world-specific views (org/funnel) — v1: jwout dashboard + gallery.html
```

- **The JW round as a topology** (the first golden config):
  `seq(research, content, production, delivery) >> metacog` with closed-world
  edges compiled from it + `open_rules` from the client gates. Gate check =
  a condition BEFORE delivery-dept dispatch (clients/FLOWS.md logic, enforced).
- **SOP harvest → goldenize**: a proven round saves under `.cave/golden/` and is
  `register()`-ed — the sop-engine `run()` path collapses into `cave(spec)`.
- **Heartbeat**: CAVE `automation.py` (`tmux:` delivery exists) schedules the
  autonomous decision cycle → grade ladder per client stays in `clients/` data
  (rule 05: grade-1 entry per new client, non-transferable).

## 5. What is deleted / kept / new

| deleted (after parity) | kept unchanged | new |
|---|---|---|
| `server/jobworld_agent.py` | `connectors/outreach` (jwout + mock) | TmuxClaudeRuntime (§3.2) |
| `server/jobworld_server.py` | `clients/b6`, `clients/b6mock` | OM `launch_team` tool (§3.4) |
| `p_main_agent.py`, `convo_registry.py` | `skills/outreach-*`, dept personas | world-pack format (§4) |
| ink-ceo dependence (OM is the face) | mock harness + diagrams/rules | JW-round golden config |
|  | rule-05 theory (carried by cave-teams natively) | org-store port (DEFERRED — v1: funnel dashboard + events suffice) |

## 6. Open LLD items (resolve before the non-Fable weeks)

1. **Worker concurrency on one Max account** — how many tmux claudes can run
   without tripping account limits; v1 answer: serialize the round (it's mostly
   sequential anyway), measure, then decide if Profile B is needed.
2. **Finish-detection hardening** — message-file-existence as the completion
   signal (watcher), pane-scrape only as liveness. Spike this while Fable is here.
3. **OM-on-claude-code runtime** (Profile A's OM chat) — back OMChatAgent's
   runtime with the claude-code SDK + OAuth instead of heaven. OAuth-under-SDK
   is the intended, proven path (§2) — this is just the adapter to write, not
   a feasibility question. (`p_main_agent._provider_env()` returning `{}` →
   os.environ/OAuth was already this pattern.)
4. **Events/org visibility v1** — what the client actually watches: jwout
   dashboard (funnel) + team session log. The JW org-chart UI is NOT v1.
5. **B6 fallback** — current-JW ships if the spine isn't ready when warmup
   completes (~2026-07-14). The b6mock round verdict = the fallback's evidence.

## 7. The B6 instance (the paying deployment, stated as data)

`world.json`: teams.outreach_round = the §4 topology · profile A · heartbeat
per client grade (grade-1: heartbeat reviews/reports, delivery gated on human
QA — rule 05 §3 shield). `clients/b6` as-is. OM app on the client box; Isaac
operates via the same OM face remotely (Contacts/switchboard seam, heaven 0.1.26).
