# TWI Jobworld

**Zero employees. A full company. All AI.**

Instantiate an AI-powered business that runs itself — content, growth, revenue, research, and engineering all handled by agents you coordinate.

## What You Get

A complete company with:
- **Content Agent** — writes, schedules, publishes
- **Growth Agent** — subscriber acquisition, outreach, social
- **Revenue Agent** — monetization, tiers, tracking
- **Research Agent** — industry intelligence, competitive analysis
- **Engineering Agent** — automation, integrations, tooling
- **Web Dashboard** — see everything at `http://localhost:{port}`
- **Event-sourced state** — every action logged, auditable

You are the CEO. You coordinate. The agents execute.

## Getting Started

```bash
# 1. Enable the plugin
/plugin enable twi-jobworld

# 2. Instantiate your company
./skills/instantiate-jobworld/instantiate.sh "Your Company"

# 3. cd in and start running your company
cd your-company-jobworld
claude
```

The CEO agent guides you through initialization — creating departments, registering agents, setting up cadences.

## How It Works

```
You (CEO)
    ├── Content Lead → creates content, manages publishing
    ├── Growth Lead → builds audience, does outreach
    ├── Revenue Lead → tracks monetization, manages tiers
    ├── Research Agent → monitors industry, competitive intel
    └── Engineering Agent → builds automations, integrates tools
```

All agents expose their work via a REST API. You delegate, review, coordinate.

## Who This Is For

- **Solopreneurs** who want a full team without hiring
- **Builders** who want to run a company as a sidecar to their main work
- **AI explorers** who want to see what agent orchestration looks like at company scale

## What You Do

As CEO:
1. **Set direction** — what are we selling? Who's the audience?
2. **Delegate** — agents handle execution
3. **Review** — check the dashboard, review agent outputs
4. **Coordinate** — break ties, resolve conflicts, approve major moves

You don't write content. You don't do outreach. You don't build the automations. You make sure the right things get built and they work together.

## The Stack

Built on:
- TWI Jobworld (company simulation engine)
- Claude Code (agent coordination)

## Example Companies

- **Content business** — Content + Growth + Revenue agents run the whole show
- **Agency** — Research + Engineering agents deliver client work
- **Product company** — All five agents operate like a real startup

## Installation

```bash
/plugin install twi-jobworld@claude-code-marketplace
```

Or for development:
```bash
/plugin enable /path/to/twi-jobworld
```

## Docs

- [Understand Plugins](skills/understand-plugins/resources/overview.md) — how plugins work
- [Understand Agents](skills/understand-agents/resources/overview.md) — how agents work
- [Understand Hooks](skills/understand-hooks/resources/overview.md) — event-driven automation
- [Understand MCPs](skills/understand-mcps/resources/overview.md) — connecting external services

## Futamura Projection

This plugin is P1 in the Futamura tower:
- P0: Jobworld source code
- P1: **This plugin** interprets source → outputs new plugin instances
- P2: understand-plugins (procedure that generates procedures)
- P3: Meta-system that generates plugin-compilers
