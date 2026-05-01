# Skills

**Official docs:** https://code.claude.com/docs/en/skills

---

## What It Gives You

**Extend + Reuse.** Skills teach Claude to do new things or apply specialized knowledge.

Create a `SKILL.md` file with instructions. Claude adds it to its toolkit and uses it when relevant, or you invoke directly with `/skill-name`.

Use when you keep pasting the same playbook, checklist, or multi-step procedure into chat.

---

## Key Discovery: Skills Hot Reload

Skills are NOT compiled once at conversation start. They hot reload — edits take effect mid-conversation.

---

## Skill Structure

Each skill is a directory with `SKILL.md` as entrypoint:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Optional template for Claude to fill in
├── examples/          # Optional example outputs
└── scripts/           # Optional scripts Claude can execute
```

**`SKILL.md`** has two parts:
1. YAML frontmatter (between `---` markers)
2. Markdown content with instructions

---

## Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Display name. Defaults to directory name. Lowercase, numbers, hyphens. Max 64 chars |
| `description` | Recommended | What the skill does and when to use. Claude uses this to decide when to apply |
| `when_to_use` | No | Additional context, trigger phrases, example requests. Appended to description |
| `argument-hint` | No | Hint for autocomplete, e.g., `[issue-number]` |
| `arguments` | No | Named positional arguments for `$name` substitution. Space-separated string or YAML list |
| `disable-model-invocation` | No | `true` = only you can invoke. Use for workflows you want to control (e.g., `/deploy`) |
| `user-invocable` | No | `false` = hide from `/` menu. Use for background knowledge only Claude invokes |
| `allowed-tools` | No | Tools Claude can use without asking when skill is active |
| `model` | No | Model to use when skill is active. Same values as `/model`, or `inherit` |
| `effort` | No | Effort level: `low`, `medium`, `high`, `xhigh`, `max` |
| `context` | No | Set to `fork` to run in forked subagent context |
| `agent` | No | Which subagent type to use when `context: fork` is set |
| `hooks` | No | Hooks scoped to this skill's lifecycle |
| `paths` | No | Glob patterns limiting when skill auto-activates |
| `shell` | No | Shell for `` !`command` `` and ` ```! ` blocks: `bash` (default) or `powershell` |

---

## String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking. Appended if not present in content |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`) |
| `$name` | Named argument from `arguments` frontmatter list |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_EFFORT}` | Current effort level |
| `${CLAUDE_SKILL_DIR}` | Directory containing the skill's `SKILL.md` |

---

## Shell Injection

The `` !`<command>` `` syntax runs shell commands before the skill content is sent to Claude. Output replaces the placeholder.

```yaml
---
name: pr-summary
description: Summarize a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

Multi-line commands use fenced code blocks:
````markdown
```!
node --version
npm --version
git status --short
```
````

**Disable shell injection** by setting `"disableSkillShellExecution": true` in settings.

---

## Skill Forking (`context: fork`)

Run skills in isolated subagent context. Skill content becomes the task prompt.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files
2. Read and analyze
3. Summarize with file references
```

| Approach | System prompt | Task |
|----------|--------------|------|
| Skill with `context: fork` | From agent type | SKILL.md content |
| Subagent with `skills` field | Subagent's markdown | Claude's delegation message |

---

## Invocation Control

| Frontmatter | You can invoke | Claude can invoke | Description loaded |
|-------------|----------------|------------------|-------------------|
| (default) | Yes | Yes | Description always, full content when invoked |
| `disable-model-invocation: true` | Yes | No | Description not in context, full content when you invoke |
| `user-invocable: false` | No | Yes | Description always, full content when invoked |

---

## Pre-approve Tools

`allowed-tools` grants permission for listed tools without per-use approval:

```yaml
---
name: commit
description: Stage and commit changes
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
---

Commit the current changes...
```

---

## Skill Locations

| Location | Path | Applies to |
|----------|------|------------|
| Enterprise | Managed settings | All users in organization |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled |

When skills share the same name: enterprise > personal > project > plugin.

---

## Live Change Detection

Claude Code watches skill directories for file changes. Adding, editing, or removing a skill under `~/.claude/skills/`, project `.claude/skills/`, or `--add-dir` `.claude/skills/` takes effect within the session without restarting.

---

## Nested Directory Discovery

When working with files in subdirectories, Claude Code automatically discovers skills from nested `.claude/skills/` directories. Example: editing `packages/frontend/` also looks for `packages/frontend/.claude/skills/`.

---

## What It Doesn't Give You

- No conditional loading (skills load when invoked or when description matches)
- No cross-skill state (each skill invocation isolated)
- No enforcement (skills suggest, don't control — use hooks for that)

---

## Best Practices

**Keep SKILL.md under 500 lines.** Move detailed reference material to separate files.

**Front-load the description** with the key use case — combined `description` + `when_to_use` text is truncated at 1,536 characters in skill listings.

**Use descriptive names** that match how you'd ask for it: `/code-review` not `/cr1`.

**Write for the invocation** — what should happen when someone types `/skill-name`?
