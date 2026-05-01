# Subagents

**Official docs:** https://code.claude.com/docs/en/sub-agents

---

## What It Gives You

**Isolated execution contexts.** Delegation to specialized AI assistants.

Built-in types:
- **Explore** (Haiku) — fast, read-only, file discovery and code search
- **Plan** (Sonnet) — research agent for plan mode, read-only
- **General-purpose** (inherits) — complex multi-step tasks, all tools

Use one when a side task would flood your main conversation with search results, logs, or file contents you won't reference again.

---

## Key Concept: Agent Teams vs Subagents

| | Subagents | Agent Teams |
|--|-----------|------------|
| **Execution** | Within a single session | Across separate sessions |
| **Communication** | Via parent agent | Via message passing |
| **State** | Isolated contexts | Shared task list |
| **Use when** | Delegating a task | Parallel agents working together |

> If you need multiple agents working in parallel and communicating with each other, see **agent teams** instead.

---

## Subagent Configuration

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase letters and hyphens) |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Tools the subagent can use. Inherits all if omitted |
| `disallowedTools` | No | Tools to deny, removed from inherited/specified list |
| `model` | No | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Maximum agentic turns before subagent stops |
| `skills` | No | Skills to preload into subagent's context at startup |
| `mcpServers` | No | MCP servers available to this subagent |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | Persistent memory scope: `user`, `project`, or `local` |
| `background` | No | Set `true` to always run as background task |
| `effort` | No | Effort level when subagent is active |
| `isolation` | No | Set `worktree` for git worktree isolation |
| `color` | No | Display color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `initialPrompt` | No | Auto-submitted as first turn when agent runs as main session |

### Memory Scopes

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Subagent should remember across all projects |
| `project` | `.claude/agent-memory/<name>/` | Knowledge is project-specific and shareable via version control |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific but should NOT be checked into version control |

When memory is enabled:
- Subagent's system prompt includes instructions for reading/writing to the memory directory
- First 200 lines or 25KB of `MEMORY.md` is included in system prompt
- Read, Write, Edit tools are automatically enabled

### Worktree Isolation (`isolation: worktree`)

Gives the subagent an isolated copy of the repository via git worktree:

```yaml
---
name: safe-editor
description: Edit files without affecting main working tree
isolation: worktree
---

This subagent works in an isolated git worktree.
Changes are isolated from the main repository until merged.
```

The worktree is automatically cleaned up if the subagent makes no changes.

---

## Subagent Scope & Priority

| Location | Scope | Priority |
|----------|-------|----------|
| Managed settings | Organization-wide | 1 (highest) |
| `--agents` CLI flag | Current session | 2 |
| `.claude/agents/` | Current project | 3 |
| `~/.claude/agents/` | All projects | 4 |
| Plugin `agents/` directory | Where plugin enabled | 5 (lowest) |

---

## Preload Skills into Subagents

Use `skills` field to inject skill content at startup — full content, not just invocation:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints following the preloaded conventions.
```

The full content of each skill is injected. Subagents don't inherit skills from parent conversation.

Note: You cannot preload skills that set `disable-model-invocation: true`.

---

## Fork Mode

Subagents support `context: fork` in skill frontmatter to run skills in isolated subagent context:

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

| Approach | System prompt | Task |
|----------|--------------|------|
| Skill with `context: fork` | From agent type | SKILL.md content |
| Subagent with `skills` field | Subagent's markdown | Claude's delegation message |

---

## GAN-Like Scoring Systems

Use subagents as discriminators:

```
Main agent generates artifact
    ↓
Scorer subagent evaluates
    ↓
Score < threshold? Return feedback, iterate
    ↓
Score >= threshold? Human review
    ↓
Human approves? Publish
```

Subagents stay simple (just score). No complex state passing.

---

## Chaining GANs

```
Deliverable (scored, approved)
    ↓
Twitter writer agent generates
    ↓
Twitter scorer evaluates
    ↓
Score = max? Post automatically
```

Automated pipelines. Human-in-loop only where needed.

---

## The Control It Enables

Subagents + typed outputs = automated quality gates.

Without types: "is this good?" (subjective)
With types: "does this match schema? score >= 8?" (enforceable)

---

## Custom Subagent Files

Location: `agents/` directory in plugin or project, or `~/.claude/agents/`.

**Basic template:**

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
memory: project
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.

Update your agent memory with patterns, conventions, and recurring
issues you discover.
```

Subagents don't need everything from scratch — they inherit base environment and add their specific role.

---

## MCP Server Scoping

Use `mcpServers` field to give a subagent access to MCP servers not in main conversation:

```yaml
---
name: browser-tester
description: Tests features in a real browser using Playwright
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github  # reference by name: reuses parent session connection
---

Use the Playwright tools to navigate, screenshot, and interact with pages.
```

Inline definitions connect when subagent starts, disconnect when it finishes. String references share the parent session's connection.

---

## Hooks Scoped to Subagent

```yaml
---
name: db-reader
description: Execute read-only database queries
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

Execute database queries. Write operations are blocked by the PreToolUse hook.
```

---

## What It Doesn't Give You

- No shared state between subagents (each isolated)
- No subagent-to-subagent communication directly
- Parent agent becomes message relay if needed
- MCP access is what parent has unless explicitly scoped
