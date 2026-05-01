# TWI Jobworld Plugin

Instantiate AI-powered companies that run themselves.

## What This Is

TWI Jobworld is a company simulation engine. Each company has:
- A CEO that coordinates everything
- Department agents (Content, Growth, Revenue, Research, Engineering)
- A web dashboard at `http://localhost:{port}`
- Event-sourced state in `event-stream/data.json`

## Enabling the Plugin

```bash
/plugin enable twi-jobworld
```

When you enable this plugin:
1. CEO agent auto-spawns
2. CEO has the `instantiate-jobworld` skill available

## Creating a Company

The bootstrap CEO runs:

```bash
./skills/instantiate-jobworld/instantiate.sh "Company Name" [port]
```

Example:
```bash
./skills/instantiate-jobworld/instantiate.sh "Acme Corp" 3850
```

This:
- Copies template to `acme-corp-jobworld/`
- Starts server at http://localhost:3850
- Creates CLAUDE.md inside the company dir
- CEO initializes departments and registers agents

Then **you cd in** and CLAUDE.md auto-loads CEO prompts:

```bash
cd acme-corp-jobworld
claude
```

## Architecture

```
Plugin (twi-jobworld-plugin/)
├── agents/CEO.md            ← Bootstrap CEO, auto-spawned on enable
├── settings.json             ← "agent": "CEO" auto-spawns CEO
├── skills/
│   ├── instantiate-jobworld/ ← Creates new companies
│   └── jobworld-api/        ← API docs for agents
└── template/
    └── twi-jobworld-template/ ← Server + frontend template
```

## After Instantiation

The created company dir contains:
```
acme-corp-jobworld/
├── CLAUDE.md                 ← CEO prompts (auto-load when you cd in)
├── index.html                ← Web dashboard
├── start.sh                  ← Server startup script
├── dist/                     ← Compiled server
└── event-stream/
    ├── data.json            ← Company state
    └── events.jsonl         ← Event log
```

## Agent Flow

1. **Plugin Enable** → CEO (bootstrap) spawns
2. **CEO runs instantiate-jobworld** → Creates company, generates CLAUDE.md with CEO prompts
3. **You cd into company dir** → CLAUDE.md auto-loads CEO prompts
4. **You (as CEO)** initialize depts, register agents
5. **Agents** registered at `http://localhost:{port}/api/agents`
6. **You** coordinate agents, they execute autonomously

## Futamura Projection

This plugin is P1 in the Futamura tower:
- P0: Jobworld source code
- P1: **This plugin** interprets source → outputs new plugin instances
- P2: understand-plugins (procedure that generates procedures)
- P3: Meta-system that generates plugin-compilers

## Stillpoint Media

This plugin was built for Stillpoint Media's newsletter automation:
- Content Lead: writes and schedules via Beehiiv
- Growth Lead: subscriber acquisition
- Revenue Lead: monetization tracking
- Researcher: industry intelligence
- SWE: automation and integrations
