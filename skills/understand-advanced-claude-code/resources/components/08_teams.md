# Agent Teams

**Official docs:** https://code.claude.com/docs/en/agent-teams

---

## Two Coordination Patterns

Agent teams support two fundamentally different coordination architectures:

| Pattern | Communication | Example |
|---------|---------------|---------|
| **Direct messaging** | Agents message each other directly | Metacog Shell |
| **Indirect via shared state** | Agents coordinate through files/JSON | World of Skillcraft |

Choose based on whether agents need to **negotiate** (direct messaging) or **coordinate** (indirect via state).

---

## Pattern 1: Metacog Shell (Direct Messaging)

A 4-agent meta-observer stack where agents message each other peer-to-peer. Lead coordinates but does NOT relay.

### The Topology

```
EXECUTOR ──────────────────────────────────────────────────────┐
  │ Does the actual work                                      │
  │ Writes trace to cache file                               │
  │ Sends pointer to OBSERVER (not to lead)                   │
│                                                             │
OBSERVER ◄──────────────────────────────────────────────────┘
  │ Reads executor's trace from FILE                          │
  │ Extracts domain skills                                    │
  │ Appends skills to executor-skills.md                      │
  │ Sends pointer to META-OBSERVER (direct)                    │
│                                                             │
META-OBSERVER [STATIC] ◄────────────────────────────────────┘
  │ Reads observer's trace from FILE                          │
  │ Evaluates observation methodology (not domain content)     │
  │ Appends meta-skills to observer-skills.md                │
  │ Is STATIC — the fixed point that grounds the recursion    │
│                                                             │
SKILL-EDITOR (runs after cycles complete)                    │
  │ Reads accumulated skills from files                        │
  │ Persists improvements to actual skill files               │
  │ Runs AFTER agents 1-3 shut down                         │
```

### State Directory Structure

```
~/.claude/teams/{team}/state/
├── pipeline.json              # Current cycle state (lead writes)
├── cycle-N-executor.md       # Executor output (cache)
├── cycle-N-observer.md       # Observer's analysis (cache)
├── cycle-N-meta.md           # Meta-observer's assessment (cache)
├── executor-skills.md         # Accumulated skills (observer → executor)
└── observer-skills.md        # Accumulated meta-skills (meta → observer)
```

### Write-Then-Send Protocol (CRITICAL)

```
WRONG:
  executor → SendMessage(lead, full_trace)
  lead → SendMessage(observer, full_trace)  # Lead becomes relay

RIGHT:
  executor → Write(cycle-N-executor.md, trace)
           → SendMessage(observer, "Read cycle-N-executor.md")
```

Messages are POINTERS, not payloads. Files are the source of truth.

### Why a Static Meta-Observer?

Without a fixed point, the system drifts — Agent 2 "improves" in ways that aren't actually better, Agent 1 accumulates contradictory skills. The static meta-observer grounds the recursion.

---

## Pattern 2: World of Skillcraft (Indirect via Shared State)

Multiple separate Claude Code instances that NEVER message each other. They coordinate through a shared JSON file.

### The Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Claude Code  │     │ Claude Code  │     │ Claude Code  │
│  Instance 1  │     │  Instance 2  │     │  Instance 3  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                      │                      │
       │ action.json         │ action.json         │ action.json
       │    (poll)          │    (poll)          │    (poll)
       ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      game.json                               │
│  (shared world state: gold, trade board, quest log, etc)  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   execute.sh (bash)    │
              │   ALL game logic here   │
              │   Validates, mutates    │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    WebSocket Server     │
              │   (ServerAgent.js)      │
              │   Just polls, stays dumb │
              └────────────────────────┘
```

### Key Principle: Server Stays Dumb

The WebSocket server does ONE thing: polls `action.json` from each agent and forwards to frontend. Zero game logic. All economy logic in `execute.sh` (300 lines of bash).

### Security: Identity from Directory Name

Agent ID comes from directory name, NOT from any agent-writable file:

```bash
AGENT_ID=$(basename "$AGENT_DIR")  # agent_001, agent_002, etc.
```

This prevents agents from spoofing identity.

### Atomic State Mutations

```bash
TEMP=$(mktemp)
jq '... mutation ...' "$GAME_FILE" > "$TEMP" && mv "$TEMP" "$GAME_FILE"
```

`mktemp + mv` is atomic — either full new state or nothing. Prevents partial writes.

---

## Lead = Coordinator, NOT Relay

The #1 failure mode in team architecture is the lead acting as message relay:

```
WRONG (lead as relay):
  executor → SendMessage(lead) → lead reads → SendMessage(observer)
  # Problem: Lead's context fills. Lead compacts. Chain breaks.

RIGHT (peer-to-peer):
  executor → SendMessage(observer)       # direct
  observer → SendMessage(meta-observer)   # direct
  # Lead: monitors task list, updates pipeline.json, intervenes ONLY on problems
```

---

## Compounding: Making Teams Smarter Over Time

Teams are one-shot by default. To compound:

### Within a Team (Metacog Shell)

```
CYCLE 1: executor → observer → meta-observer
  Skill-editor persists learnings to skill files

CYCLE 2: executor (with improved skills) → observer → meta-observer
  Skill-editor is now better at editing (accumulated rules)
  → compound improvement
```

### Across Teams (Skill Persistence)

```
~/.claude/skills/metacog-shell/skill-editor-rules/
├── 00-input-contract.md       # What skill-editor reads
├── 01-pruning-heuristics.md  # Signal vs inflation detection
├── 02-edit-operations.md      # Edit types and formats
└── 03-verification.md         # How to check edits work
```

This directory persists ACROSS teams. Each run starts with accumulated editing rules.

---

## When to Use Which Pattern

| Scenario | Pattern | Why |
|----------|---------|-----|
| Observation + skill extraction | Metacog Shell | Peer messaging needed for real-time evaluation |
| Parallel independent work | Either | Both work |
| Research with competing hypotheses | Metacog Shell | Agents need to challenge each other |
| Economy / market simulation | World of Skillcraft | Shared state IS the coordination mechanism |
| Agents with persistent identities | World of Skillcraft | Each agent is a full Claude Code session |
| Quality gates on work output | Metacog Shell | Observer evaluates, meta-observer validates |

---

## File Layout Conventions

### Team State Directory
```
~/.claude/teams/{team-name}/
├── config.json           # Team config (auto-generated)
└── state/               # Your state files
    ├── pipeline.json     # Current cycle/pass state
    ├── cycle-N-*.md    # Cache files per agent
    └── *-skills.md     # Accumulated skills
```

### Agent Directory (World of Skillcraft)
```
agent_mmorpg/gptrpg/agents/
├── agent_001/
│   ├── action.json      # Pending action for server pickup
│   ├── game_state.json  # Local view of world state
│   ├── crafted/         # Skills made by this agent
│   ├── memory/          # Zettelkasten (persists across seasons)
│   └── .claude/skills/  # Agent's skill set
└── agent_002/
    └── ...
```

---

## Spawning Agents with Context

### With full prompt (inline)
```
Spawn executor with:
- name: "executor"
- prompt: "You are the executor. Your job is to {WORK}.
  Read your skills from: ~/.claude/teams/{team}/state/executor-skills.md
  Write traces to: ~/.claude/teams/{team}/state/cycle-N-executor.md
  Message observer directly when done."
```

### With subagent definition reference
```
Spawn a teammate using the security-reviewer agent type
```

Subagent definition's `tools` and `model` are honored. Body is appended to system prompt.

---

## Rehydration: Recovering from Context Loss

When any agent (including lead) loses context:

```
1. Read pipeline.json → know where we are
2. Read your role's skill file:
   - Lead: pipeline.json + both skill files
   - Executor: executor-skills.md
   - Observer: observer-skills.md + latest cycle-N-executor.md
3. Check TaskList → confirm task states match pipeline.json
4. Resume from current phase
```

Files are the rehydration mechanism. Messages are pointers to files.

---

## Task Dependencies Enforce Ordering

```javascript
TaskCreate: "Observe first execution"
  owner: observer
  blockedBy: ["first work cycle"]  // Can't start until executor done

TaskCreate: "Meta-observe first observation"
  owner: meta-observer
  blockedBy: ["first observation"]  // Can't start until observer done
```

Blocked tasks cannot be claimed until dependencies complete. Enforces cycle ordering without lead involvement.

---

## Hooks for Quality Gates

| Event | Exit Code 2 | Purpose |
|-------|-------------|---------|
| **TeammateIdle** | Blocks idle | Send feedback, keep teammate working |
| **TaskCreated** | Blocks creation | Validate before task enters system |
| **TaskCompleted** | Blocks completion | Verify quality before accepting |

---

## Known Limitations

- **No session resumption with in-process teammates**: `/resume` doesn't restore them
- **Task status can lag**: agents may not mark tasks complete
- **Shutdown is slow**: agents finish current request first
- **One team per session**: clean up before starting new one
- **No nested teams**: teammates cannot spawn teams
- **Lead is fixed**: cannot promote teammate to lead
- **Split panes require tmux or iTerm2**: not VS Code terminal, Windows Terminal, or Ghostty
