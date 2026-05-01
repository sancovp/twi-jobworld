---
name: jobworld-api
description: Interact with TWI Jobworld server API. Trigger with "jobworld api", "jobworld endpoints", "jobworld server".
---

# Jobworld API

Skill for interacting with TWI Jobworld server API.

## Base URL

```
http://localhost:{PORT}/api
```

Where PORT is the jobworld server port (e.g., 3848).

## Endpoints

### Health
```
GET /api/health
```
Returns server status.

### Departments

```
GET /api/departments
POST /api/departments
```
- `GET`: List all departments
- `POST`: Create department
  ```json
  { "name": "content", "description": "Newsletter creation" }
  ```

### Agents

```
GET /api/agents
POST /api/agents
GET /api/agents/:id
DELETE /api/agents/:id
```
- `GET /api/agents`: List all agents
- `POST /api/agents`: Register agent
  ```json
  {
    "name": "content-lead",
    "dept_id": "dept_xxx",
    "agent_file_path": "/path/to/agent.md"
  }
  ```
- `DELETE /api/agents/:id`: Remove agent (Task #4 - DELETE endpoint exists)

### Stats

```
GET /api/stats
```
Returns company statistics.

### Events

```
GET /api/events
POST /api/events
```
- `GET /api/events`: Recent events
- `POST /api/events`: Emit event
  ```json
  { "type": "task_completed", "data": { "agent": "content-lead", "task": "newsletter_001" } }
  ```

## Usage in Claude

```bash
# List agents
curl http://localhost:3848/api/agents

# Create department
curl -X POST http://localhost:3848/api/departments \
  -H "Content-Type: application/json" \
  -d '{"name": "content", "description": "Newsletter"}'

# Register agent
curl -X POST http://localhost:3848/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "content-lead", "dept_id": "dept_xxx", "agent_file_path": "/path/to/content-lead.md"}'
```

## Example Workflow

1. Create departments: Content, Growth, Revenue, Research, Engineering
2. Register agents to each department
3. Agents check in via GET /api/agents and emit events
