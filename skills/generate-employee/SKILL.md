---
name: generate-employee
description: Create a new AI employee for TWI Jobworld — builds agent file, registers in jobworld, creates department skill
version: 1.0.0
tags: [jobworld, twi, agent-creation, employee]
author: TWI
created: 2026-05-01
---

# Generate Employee

Creates a new AI employee for a TWI Jobworld instance.

## How It Works

1. **Build agent file** — uses `compile-claude-code-component` to create the agent with required primitives (skills, hooks, MCPs, etc.)
2. **Register in jobworld** — `POST /api/agents` with `dept_id` + `name` + `agent_file_path`
3. **Create department skill** — creates `{instance}/skills/run-dept-{dept}/SKILL.md` if it doesn't exist
4. **Return invocation** — tells CEO how to run this employee

## Usage

```
/generate-employee
```

### Inputs

| Field | Example | Notes |
|-------|---------|-------|
| **Jobworld URL** | `http://localhost:3848` | Port for this company |
| **Company name** | `Stillpoint Media` | For paths/naming |
| **Department** | `Software Engineering` | Must match a dept in jobworld |
| **Agent name** | `Engineer` | Human-readable name |
| **Agent type** | `general-purpose` | Or `Explore`, `code-reviewer`, etc. |
| **Capabilities** | `github, worktree, hooks` | Comma-separated |

### What Gets Created

```
{instance}/skills/run-dept-{dept}/
└── SKILL.md           # Department skill (updated or created)

{instance}/agents/
└── {company}-{dept}-{name}.md   # Agent definition
```

## Agent File Template

The agent definition created:

```markdown
---
name: {company}-{dept}-{name}
description: {capabilities} for {company} {dept}
version: 1.0.0
tags: [{dept}, {company}]
agentType: {agentType}
skills: [{capability-skills}]
model: claude-sonnet-4-6
---

# {Company} {Dept} — {Name}

## Role
{agent name} for the {dept} department.

## Capabilities
- {capability 1}
- {capability 2}

## Integration
- Jobworld: {jobworld_url}
- Company: {company_name}
- Department: {dept}
- Registered: {timestamp}
```

## API Registration

```bash
curl -X POST {jobworld_url}/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "dept_id": "{dept_id}",
    "name": "{agent_name}",
    "agent_file_path": "{instance}/agents/{company}-{dept}-{name}.md"
  }'
```

## CEO Integration

After generation, CEO can find this employee by reading:
```
{instance}/skills/run-dept-{dept}/SKILL.md
{instance}/agents/{company}-{dept}-{name}.md
```

## Department Skill Structure

Each department skill tells CEO how to run the department:

```markdown
# {Company} {Dept} Department

## Agents
- `{agent_name}` — {description}

## Processes
{How this department works}

## CEO Instructions
{How to invoke this department}
```

## Example: SWE Engineer for Stillpoint Media

Input:
- Jobworld: `http://localhost:3848`
- Company: `Stillpoint Media`
- Department: `Software Engineering`
- Agent: `Engineer`
- Capabilities: `github, worktree-automation, hooks, code-review`

Output:
- Agent file: `{instance}/agents/{company}-{dept}-{agent}.md`
- Dept skill: `~/.claude/skills/software-engineering/SKILL.md`
- Registered in jobworld at port 3848
