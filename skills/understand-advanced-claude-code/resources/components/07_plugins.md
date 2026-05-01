# Plugins

**Official docs:** https://code.claude.com/docs/en/plugins

---

## What It Gives You

**Bundling + Distribution.** A plugin packages skills, agents, hooks, MCP servers, and more into a single distributable unit.

Single-command installation. Share complete workflows across projects and teams.

---

## Plugin vs Standalone

| Approach | Skill names | Best for |
|----------|-------------|----------|
| **Standalone** (`.claude/` directory) | `/hello` | Personal workflows, project-specific, quick experiments |
| **Plugins** (`.claude-plugin/plugin.json`) | `/plugin-name:hello` | Sharing with teams, community distribution, versioned releases |

---

## Required Files

### plugin.json (Identity)

```json
{
  "name": "my-plugin",
  "description": "What it does",
  "version": "1.0.0",
  "author": {"name": "You", "email": "you@example.com"}
}
```

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier and skill namespace (`/my-plugin:hello`) |
| `description` | Shown in plugin manager when browsing |
| `version` | Optional. Users only receive updates when bumped. If omitted, commit SHA is used |
| `author` | Optional. For attribution |

### marketplace.json (Distribution)

Required for `/plugin marketplace add`:

```json
{
  "name": "my-marketplace",
  "owner": {"name": "You"},
  "plugins": [{
    "name": "my-plugin",
    "source": "./",
    "version": "1.0.0"
  }]
}
```

---

## Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Manifest only here
├── skills/                  # Skill directories with SKILL.md
│   └── hello/
│       └── SKILL.md
├── commands/                # Flat markdown commands (legacy)
├── agents/                  # Custom agent definitions
├── hooks/                   # hooks.json for event handlers
│   └── hooks.json
├── .mcp.json               # MCP server configurations
├── .lsp.json               # LSP server configurations
├── monitors/                # Background monitors
│   └── monitors.json
├── bin/                     # Executables added to PATH
├── settings.json            # Default settings when plugin enabled
└── README.md
```

> **Warning:** Don't put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes there.

---

## Installation

**Local:**
```
/plugin marketplace add /path/to/plugin
/plugin install my-plugin@my-marketplace
```

**GitHub (public):**
```
/plugin marketplace add https://github.com/user/repo
/plugin install my-plugin@my-marketplace
```

---

## Plugin Components

### Skills
Skills live in `skills/<name>/SKILL.md`. Folder name becomes skill name prefixed with plugin namespace.

```yaml
---
description: Greet the user with a friendly message
---

Greet the user warmly and ask how you can help.
```

Invoked as `/my-plugin:hello`

### Agents
Custom subagent definitions in `agents/` directory with YAML frontmatter.

```markdown
---
name: code-reviewer
description: Reviews code for quality
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer...
```

### Hooks
Event handlers in `hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix" }
        ]
      }
    ]
  }
}
```

### MCP Servers
Server configurations in `.mcp.json` at plugin root.

### LSP Servers
Language server configs in `.lsp.json`:

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": { ".go": "go" }
  }
}
```

### Background Monitors
Watch logs/files in background and notify Claude:

```json
[
  {
    "name": "error-log",
    "command": "tail -F ./logs/error.log",
    "description": "Application error log"
  }
]
```

### Default Settings
`settings.json` applies defaults when plugin is enabled. Currently only `agent` and `subagentStatusLine` keys supported.

```json
{
  "agent": "security-reviewer"
}
```

---

## The Pattern

```
Build components
    ├── Slash commands
    ├── MCP servers
    ├── Hooks
    ├── Subagents
    └── Skills
            ↓
Package as plugin (plugin.json + marketplace.json)
            ↓
Distribute via marketplace
```

---

## Converting Standalone to Plugin

```bash
# 1. Create plugin structure
mkdir -p my-plugin/.claude-plugin

# 2. Create manifest
cat > my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "description": "Migrated from standalone",
  "version": "1.0.0"
}
EOF

# 3. Copy existing files
cp -r .claude/commands my-plugin/
cp -r .claude/agents my-plugin/
cp -r .claude/skills my-plugin/

# 4. Migrate hooks
mkdir my-plugin/hooks
# Copy hooks object from settings.json to hooks/hooks.json

# 5. Test
claude --plugin-dir ./my-plugin
```

---

## Testing Plugins Locally

Use `--plugin-dir` flag during development:

```bash
claude --plugin-dir ./my-plugin
```

Local copy takes precedence over installed marketplace plugin with same name.

Run `/reload-plugins` to pick up changes without restarting.

---

## Share Plugins

1. **Add documentation** — README with installation and usage
2. **Choose versioning** — explicit `version` or git commit SHA
3. **Create marketplace** — distribute via `/plugin marketplace add`
4. **Test with others** — team members before wider distribution

### Submit to Official Marketplace
Use in-app submission forms:
- **Claude.ai**: claude.ai/settings/plugins/submit
- **Console**: platform.claude.com/plugins/submit

---

## What It Doesn't Give You

- No runtime control (components work independently)
- No state across plugin components
- No enforcement (components still function outside plugin context)

---

## Testing & CI/CD

See `resources/testing-and-cicd.md` for:
- 7 testing levels (syntax to integration testing)
- plugin-validator agent usage
- GitHub Actions CI/CD workflows
- Pre-commit hooks
- Validation scripts
- Testing checklist

## Official Plugin-Dev Toolkit

Install `plugin-dev@claude-code-marketplace` for comprehensive plugin development:

```
/plugin install plugin-dev@claude-code-marketplace
```

**Contains:**
- **plugin-validator** agent — validates entire plugins
- **agent-creator** — AI-assisted agent generation
- **skill-reviewer** — reviews skill quality
- **7 skills**: hook-development, mcp-integration, plugin-structure, plugin-settings, command-development, agent-development, skill-development
- **Utilities**: validate-hook-schema.sh, test-hook.sh, hook-linter.sh, validate-agent.sh
