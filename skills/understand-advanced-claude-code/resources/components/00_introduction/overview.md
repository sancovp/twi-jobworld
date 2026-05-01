# Claude Code: Three Mental Models

**Official docs:** https://code.claude.com/docs

---

## Model 1: Flat Assembly

```
Agent = CLAUDE.md + Skills + Hooks + MCPs + ...
```

Configure parts. Agent uses parts. That's it.

This is how the docs present it. Here are the parts, here's what each does, configure them.

**Limitation:** Static. Each session independent. Nothing compounds.

---

## Model 2: Self-Modifying System

```
Agent observes itself working
    ↓
Captures events as typed data
    ↓
Routes data through pipelines
    ↓
Assembles new structures
    ↓
Modifies its own configuration
    ↓
Compounds over time
```

The user DRIVES a system that:
- Watches what's happening
- Extracts patterns from real work
- Turns patterns into new rules/templates
- Applies templates back to itself
- Gets better at getting better

**The agent creates typed representations OF ITS OWN patterns:**
- Workflow pattern → flight config type
- Violation pattern → rule type
- Quality pattern → scorer type

These types get instantiated, composed, applied. The agent builds versions of itself inside itself.

---

## Model 3: Progressive Autonomy

```
Human drives system
    ↓
System captures patterns
    ↓
Patterns reify into agent behavior
    ↓
Agent handles more autonomously
    ↓
Human drives less, steers more
    ↓
System increasingly self-sufficient
```

The self-modifying system is slowly transitioning into a fully autonomous version by REIFYING itself into the agent's behavior through the architecture.

**Reification = patterns become structure:**
- Observed workflow → becomes flight config → runs without prompting
- Caught violation → becomes rule → blocks automatically
- Scored quality → becomes gate → enforces without review

Each reification moves something from "human must do" to "system does."

---

## The Trajectory

| Stage | Human Role | Agent Role |
|-------|-----------|------------|
| Flat Assembly | Configure everything | Execute instructions |
| Self-Modifying | Drive + observe | Capture + adapt |
| Progressive Autonomy | Steer + approve | Handle + compound |
| Full Autonomy | Set goals | Everything else |

---

## What This Curriculum Covers

**Part 1: Injection Points** (native Claude Code)
- Where you CAN hook into the system
- What each gives you (prompts)
- What each DOESN'T give you (control)

**Part 2: Control Layer** (what we built)
- How to capture events
- How to enforce flows
- How to type and route data
- How patterns reify into behavior
- How the system trends toward autonomy

---

## The Pitch

Claude Code gives you parts to assemble.

We're building a system that assembles better versions of itself.

The end state is an agent that does what you would do, without you doing it.
