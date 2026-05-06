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
| observation.desc | Notification string describing what happened |

**Note:** The server generates `timestamp` automatically. Do not include it in your payload.
