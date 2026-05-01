# understand-advanced-claude-code Reference

Table of contents for component resources. Each component is also available as its own skill.

---

## Components (Each also a standalone skill)

### `resources/components/01_claude_md/overview.md`
**When to use:** Understanding or writing system prompts (CLAUDE.md).

**Or equip:** `understand-claude-md` skill

### `resources/components/02_skills/overview.md`
**When to use:** Understanding or creating skills.
- Native Claude Code skills are folders in `~/.claude/skills/`
- SKILL.md with YAML frontmatter gets injected
- Hot reload — edits take effect mid-conversation
- Skill forking (`context: fork`), string substitutions, shell injection

**Or equip:** `understand-skills` skill

### `resources/components/03_hooks/overview.md`
**When to use:** Understanding or creating hooks.
- 29 events across 8 categories (Session, Per-Turn, Tool, Subagent, Context, Compaction, Worktree, Other)
- 5 hook handler types: command, http, mcp_tool, prompt, agent
- Skill/agent-scoped hooks, exit code 2 blocking
- Official docs: https://code.claude.com/docs/en/hooks

**Or equip:** `understand-hooks` skill

### `resources/components/04_mcps/overview.md`
**When to use:** Understanding or creating MCP servers.
- External tools with state
- Can persist across calls, enforce transitions, capture typed data
- Official docs: https://code.claude.com/docs/en/mcp

**Or equip:** `understand-mcps` skill

### `resources/components/05_slash_commands/overview.md`
**When to use:** Understanding or creating slash commands.

**Or equip:** `understand-slash-commands` skill

### `resources/components/06_subagents/overview.md`
**When to use:** Understanding or creating subagents.
- Isolated execution contexts, persistent memory (user/project/local)
- Built-in types: General-purpose, Plan, Explore
- Worktree isolation, skill preloading, fork mode
- Agent teams for multi-agent coordination (separate from subagents)

**Or equip:** `understand-subagents` skill

### `resources/components/07_plugins/overview.md`
**When to use:** Understanding or creating plugins.
- Bundle skills, agents, hooks, MCP servers, monitors
- plugin.json + marketplace.json manifests
- Official docs: https://code.claude.com/docs/en/plugins

**Or equip:** `understand-plugins` skill

### `resources/components/08_teams/overview.md`
**When to use:** Understanding or creating agent teams.
- Multiple Claude Code sessions coordinated as a team
- Lead + teammates + shared task list + mailbox messaging
- vs subagents: teams allow direct inter-agent communication

**Or equip:** `understand-teams` skill

---

## Meta-Skill

### `compile-claude-code-component`
**When to use:** Building systems that combine multiple primitives.
- Combinatorial map: what combines with what under what conditions
- Decision tree: which pattern fits a given goal
- Multi-conversation build workflow: analyze → map → build → test → package → output
- Examples: building a Metacog Shell, building a Plugin

**Or equip:** `compile-claude-code-component` skill
