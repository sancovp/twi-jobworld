---
name: instantiate-jobworld
description: Creates a new TWI Jobworld instance — a fully autonomous AI company with agents that run themselves. Trigger with "instantiate jobworld", "create new company", "bootstrap ai company".
---

# Instantiate Jobworld

Creates a new TWI Jobworld instance — a fully autonomous AI company with agents that run themselves.

## Usage

```bash
./instantiate.sh "Company Name" [port]
```

## What This Does

1. Copies the jobworld template to a new company directory
2. Generates a unique port (or uses specified port)
3. Creates CEO.md inside the new jobworld — the top-level agent that bootstraps everything
4. The CEO initializes departments and registers agents via the API
5. The plugin's settings.json spawns CEO on enable, so enabling = instant company

## Template Source

The template files live at:
`${CLAUDE_PLUGIN_ROOT}/template/twi-jobworld-template/`

Copy this entire tree to the new company dir.

## CEO.md Generation

CEO.md is written INSIDE the new jobworld dir. It contains:
- Company name passed as argument
- Port number for the server
- Instructions to initialize departments and spawn agents
- Access to all agent skills (Content, Growth, Revenue, Researcher, SWE)

## Ports

Default port range: 3847-3999
If port is in use, auto-increment until free port found.

## Output

After running:
- New dir at `./{company_slug}/`
- Server running at `http://localhost:{port}`
- CEO agent ready and registered
