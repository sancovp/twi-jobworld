# `agents/` — the CEO and department agents

**Why this dir exists.** These are the JW instance's agent persona files.
`CEO.md` is loaded directly by `server/jobworld_agent.py` as the SDK CEO's
`append_system_prompt`. The department agents (`research`, `content`,
`production`, `delivery`, `metacog`) are registered by the CEO at bootstrap
(via `/api/agents`, see the `generate-employee` skill) and each loads the
`outreach-*` skill(s) for its pipeline stage.

See `../.claude/rules/01-DEPARTMENTS.md` for the org, the flow diagram, and the
stage→skill→connector mapping.

| file | role | skills |
|---|---|---|
| `CEO.md` | bootstraps the company, assigns work, talks to the client | instantiate-jobworld, understand-* |
| `research.md` | source leads | outreach-source |
| `content.md` | write copy | outreach-write |
| `production.md` | make + host teaser | outreach-teaser |
| `delivery.md` | send + replies | outreach-deliver, outreach-replies |
| `metacog.md` | measure + judge | outreach-report |

To add a department: write `<dept>.md` (frontmatter `skills:` lists its
`outreach-*` skill), add the row to `01-DEPARTMENTS.md`, and refresh the
diagrams.
