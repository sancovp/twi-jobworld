---
name: jobworld-report-event
description: ALL agents use this skill to report task observations to the central HTTP server.
---

# Jobworld Report Event Skill

You MUST use this skill to report your work progress to the AI Jobworld system.

## Event Server

- **URL:** `http://localhost:3847`
- **POST:** `/api/emit-event`

## Task Flow

1. You pull OPEN tasks from the ledger
2. You work on the task
3. You emit an observation when done or blocked
4. When you report `completed`, the task becomes "Supposedly Done" and goes to CEO for review
5. CEO reviews and marks it "Complete" (final) or sends it back to "Open"

## How to Get Your Tasks

GET `/api/tasks/open?agent_id=your-agent-id` returns your open tasks (top 3).

<<<<<<< HEAD
## Event Types

Events are OBSERVATIONS. The `status` field is either `completed` or `blocked`.

### When you complete a task

```bash
curl -X POST http://localhost:3847/api/emit-event \
  -H "Content-Type: application/json" \
  -d '{
    "round": 1,
    "source": "researcher-1",
    "observation": {
      "goal_id": "goal-research-icp-fit",
      "dept": "research",
      "agent": "researcher-1",
      "task": "task-research-modal",
      "status": "completed",
      "desc": "Modal Labs scored 13/10 for TWI ICP. Operators hitting AI wall confirmed."
    },
    "who_cares": []
  }'
```

After you report completed, the CEO will review and either confirm or send it back.

### When you are blocked on a task

```bash
curl -X POST http://localhost:3847/api/emit-event \
  -H "Content-Type: application/json" \
  -d '{
    "round": 1,
    "source": "researcher-1",
    "observation": {
      "goal_id": "goal-research-icp-fit",
      "dept": "research",
      "agent": "researcher-1",
      "task": "task-research-modal",
      "status": "blocked",
      "desc": "Cannot access Modal docs - need API key from admin"
    },
    "who_cares": []
  }'
```
=======
## Event Format

Events are OBSERVATIONS. Every event MUST include:

```json
{
    "round": 1,
    "source": "researcher-1",
    "observation": {
        "goal_id": "goal-research-icp-fit",
        "dept": "research",
        "agent": "researcher-1",
        "task": "task-research-modal",
        "status": "completed",
        "desc": "Modal Labs scored 13/10 for TWI ICP.",
        "domain": "research",
        "subdomain": "lead-qualification",
        "process": "prospect ICP scoring",
        "instructions": "1. Pull company info from website. 2. Score against ICP criteria (team size, AI adoption, budget signals). 3. Rate 1-10 with justification.",
        "kv": {
            "company": "Modal Labs",
            "score": 13,
            "criteria_met": ["ai_adoption", "team_size", "budget_signals"]
        }
    }
}
```

**Note:** The server auto-fills `business` and `timestamp`. Do not include them.
>>>>>>> 83bee2f (feat: Docker setup + skills + server package for cave-teams deployment)

## Required Fields

| Field | Description |
|-------|-------------|
| round | Current round number |
| source | Your agent name |
| observation.goal_id | ID of the goal this task belongs to |
| observation.dept | Department reporting |
| observation.agent | Agent reporting |
| observation.task | Task ID being observed |
| observation.status | `completed` OR `blocked` |
<<<<<<< HEAD
| observation.desc | Notification string describing what happened |

**Note:** The server generates `timestamp` automatically. Do not include it in your payload.
=======
| observation.desc | What happened — the result |
| observation.domain | Business function bucket (enum: ops, sales, marketing, engineering, finance, hr, legal, admin, research, content, growth, support, bi, product) |
| observation.subdomain | Specific area within the domain (free text) |
| observation.process | Name of the process you are doing (free text — be consistent, reuse names for the same type of work) |
| observation.instructions | How to reproduce this result. Write this as if teaching someone who has never done this before. |
| observation.kv | Key-value data — structured output of your work (parameters, scores, results, artifacts) |

## Why Instructions Matter

Every event you report becomes part of an SOP pattern. The `instructions` field is HOW the system learns to replay your work. Write it as universal steps, not specific to this one instance.

**Good:** "1. Pull company info from website. 2. Score against ICP criteria. 3. Rate 1-10."
**Bad:** "I looked at Modal Labs and they scored high."

## SOP Pattern Accumulation

Events with the same `process` name automatically group into SOP patterns. The CEO can harvest patterns into replayable skills. The better your `instructions` and `kv`, the better the harvested skill.

## Blocked Events

When blocked, same format but `status: "blocked"` and `desc` explains why:

```json
{
    "round": 1,
    "source": "researcher-1",
    "observation": {
        "goal_id": "goal-research-icp-fit",
        "dept": "research",
        "agent": "researcher-1",
        "task": "task-research-modal",
        "status": "blocked",
        "desc": "Cannot access Modal docs — need API key",
        "domain": "research",
        "subdomain": "lead-qualification",
        "process": "prospect ICP scoring",
        "instructions": "",
        "kv": {"blocked_reason": "missing_api_key", "needed_from": "admin"}
    }
}
```
>>>>>>> 83bee2f (feat: Docker setup + skills + server package for cave-teams deployment)
