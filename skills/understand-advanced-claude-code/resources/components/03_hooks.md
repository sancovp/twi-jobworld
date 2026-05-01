# Hooks

**Official docs:** https://code.claude.com/docs/en/hooks

---

## What It Gives You

**Events + Control.** Hooks are the first real control point — not just triggers, but enforcement.

**29 hook events** across 8 categories:

### Session Cadence
| Event | When it fires |
|-------|---------------|
| **SessionStart** | When a session begins or resumes |
| **Setup** | When you start Claude Code with `--init-only`, `--init` or `--maintenance` in `-p` mode |
| **SessionEnd** | When a session terminates |

### Per-Turn Events
| Event | When it fires |
|-------|---------------|
| **UserPromptSubmit** | When you submit a prompt, before Claude processes it |
| **UserPromptExpansion** | When a user-typed command expands into a prompt |
| **Stop** | When Claude finishes responding |
| **StopFailure** | When the turn ends due to an API error |

### Agentic Loop Events (Tool Calls)
| Event | When it fires |
|-------|---------------|
| **PreToolUse** | Before a tool call executes |
| **PermissionRequest** | When a permission dialog appears |
| **PermissionDenied** | When a tool call is denied by auto mode classifier |
| **PostToolUse** | After a tool call succeeds |
| **PostToolUseFailure** | After a tool call fails |
| **PostToolBatch** | After a full batch of parallel tool calls resolves |
| **Elicitation** | When an MCP server requests user input during a tool call |
| **ElicitationResult** | After a user responds to an MCP elicitation |

### Subagent/Task Events
| Event | When it fires |
|-------|---------------|
| **SubagentStart** | When a subagent is spawned |
| **SubagentStop** | When a subagent finishes |
| **TaskCreated** | When a task is being created via TaskCreate |
| **TaskCompleted** | When a task is being marked as completed |
| **TeammateIdle** | When an agent team teammate is about to go idle |

### Context/File Events
| Event | When it fires |
|-------|---------------|
| **InstructionsLoaded** | When a CLAUDE.md or .claude/rules/*.md file is loaded |
| **CwdChanged** | When the working directory changes |
| **FileChanged** | When a watched file changes on disk |
| **ConfigChange** | When a configuration file changes during a session |

### Compaction Events
| Event | When it fires |
|-------|---------------|
| **PreCompact** | Before context compaction |
| **PostCompact** | After context compaction completes |

### Worktree Events
| Event | When it fires |
|-------|---------------|
| **WorktreeCreate** | When a worktree is being created |
| **WorktreeRemove** | When a worktree is being removed |

### Other
| Event | When it fires |
|-------|---------------|
| **Notification** | When Claude Code sends a notification |

---

## 5 Hook Handler Types

### 1. Command (`type: "command"`)
Runs a shell command. Receives JSON input on stdin.

| Field | Required | Description |
|-------|----------|-------------|
| `command` | yes | Shell command to execute |
| `async` | no | If `true`, runs in background without blocking |
| `asyncRewake` | no | Runs in background and wakes Claude on exit code 2 |
| `shell` | no | `"bash"` (default) or `"powershell"` |

### 2. HTTP (`type: "http"`)
Sends JSON as HTTP POST request.

| Field | Required | Description |
|-------|----------|-------------|
| `url` | yes | URL to send the POST request to |
| `headers` | no | Additional HTTP headers as key-value pairs |
| `allowedEnvVars` | no | List of env var names allowed for `$VAR_NAME` interpolation |

### 3. MCP Tool (`type: "mcp_tool"`)
Calls a tool on an already-connected MCP server.

| Field | Required | Description |
|-------|----------|-------------|
| `server` | yes | Name of a configured MCP server |
| `tool` | yes | Name of the tool to call on that server |
| `input` | no | Arguments passed to the tool; supports `${path}` substitution |

### 4. Prompt (`type: "prompt"`)
Sends a prompt to a Claude model for single-turn evaluation.

| Field | Required | Description |
|-------|----------|-------------|
| `prompt` | yes | Prompt text; use `$ARGUMENTS` as placeholder for hook input JSON |
| `model` | no | Model to use; defaults to a fast model |

### 5. Agent (`type: "agent"`)
Spawns a subagent to verify conditions before returning a decision. **Experimental.**

| Field | Required | Description |
|-------|----------|-------------|
| `prompt` | yes | Prompt text; use `$ARGUMENTS` as placeholder for hook input JSON |
| `model` | no | Model to use; defaults to a fast model |

---

## Common Fields (All Handler Types)

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"command"`, `"http"`, `"mcp_tool"`, `"prompt"`, or `"agent"` |
| `if` | no | Permission rule syntax to filter when hook runs (e.g., `"Bash(git *)"`, `"Edit(*.ts)"`). Only for PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied |
| `timeout` | no | Seconds before canceling. Defaults: 600 for command, 30 for prompt, 60 for agent |
| `statusMessage` | no | Custom spinner message displayed while the hook runs |
| `once` | no | If `true`, runs once per session then removed. Only honored for hooks in skill frontmatter |

---

## Configuration Locations & Scope

| Location | Scope | Shareable |
|----------|-------|-----------|
| `~/.claude/settings.json` | All projects | No |
| `.claude/settings.json` | Single project | Yes |
| `.claude/settings.local.json` | Single project | No (gitignored) |
| Managed policy settings | Organization-wide | Yes |
| Plugin `hooks/hooks.json` | When plugin enabled | Yes |
| Skill/agent frontmatter | While component active | Yes |

---

## What It Doesn't Give You

- No cross-hook state (each invocation isolated) — but see The Metahook Pattern below
- No sequence awareness inherently — but achievable via exit code 2 blocking
- No built-in data flow between hooks

---

## The Metahook Pattern

One hook that tracks state across all others using exit codes and shared files:

```bash
#!/bin/bash
# metahook tracks state across hook invocations
STATE_FILE="$HOME/.claude/hook-state.json"

# Read last state
LAST=$(cat "$STATE_FILE" 2>/dev/null || echo '{}')

# Update based on this invocation
echo "$LAST" | jq ".last_tool = \"$TOOL\""
```

With exit code 2 blocking:
- Sequence enforcement
- State machine via JSON state file
- Cross-tool awareness

---

## Architecture Enforcement in Real-Time

```
PreToolUse on Edit
    ↓
Run architecture checker
    ↓
Returns: {score: 7/10, violations: ["logic in handler"]}
    ↓
Score < 8? Block with exit code 2
    ↓
Claude sees violation WHILE working
    ↓
Pattern emerges from repeated violations
```

Hooks are where prompts become control.

---

## Matcher Patterns

| Matcher value | Evaluated as |
|---------------|--------------|
| `"*"`, `""`, omitted | Match all |
| Only letters, digits, `_`, `\|` | Exact string or `\|`-separated list |
| Contains other characters | JavaScript regex |

### Matcher by Event Type

| Event | What matcher filters | Example |
|-------|---------------------|---------|
| PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied | tool name | `Bash`, `Edit\|Write`, `mcp__.*` |
| SessionStart | how session started | `startup`, `resume`, `clear`, `compact` |
| Setup | CLI flag triggered | `init`, `maintenance` |
| SessionEnd | why session ended | `clear`, `resume`, `logout` |
| Notification | notification type | `permission_prompt`, `idle_prompt` |
| SubagentStart/Stop | agent type | `general-purpose`, `Explore`, `Plan` |
| PreCompact/PostCompact | what triggered compaction | `manual`, `auto` |
| ConfigChange | configuration source | `user_settings`, `project_settings` |
| FileChanged | literal filenames | `.envrc\|.env` |
| StopFailure | error type | `rate_limit`, `authentication_failed` |
| InstructionsLoaded | load reason | `session_start`, `nested_traversal` |
| UserPromptExpansion | command name | skill/command names |
| Elicitation/ElicitationResult | MCP server name | server names |
| UserPromptSubmit, PostToolBatch, Stop, TeammateIdle, TaskCreated, TaskCompleted, WorktreeCreate, WorktreeRemove, CwdChanged | no matcher support | always fires |

---

## Exit Code Behavior

| Exit Code | Meaning |
|-----------|---------|
| **0** | Success; Claude parses stdout for JSON output |
| **2** | Blocking error; stderr fedback as error. Effect varies by event |
| **Other non-zero** | Non-blocking error; execution continues |

### Exit Code 2 by Event (Can Block)

| Event | What happens |
|-------|--------------|
| PreToolUse | Blocks tool call |
| PermissionRequest | Denies permission |
| UserPromptSubmit | Blocks prompt processing |
| UserPromptExpansion | Blocks expansion |
| Stop | Prevents Claude from stopping |
| SubagentStop | Prevents subagent from stopping |
| TeammateIdle | Prevents teammate from going idle |
| TaskCreated/TaskCompleted | Rolls back/prevents task |
| ConfigChange | Blocks config change |
| PostToolBatch | Stops agentic loop |
| PreCompact | Blocks compaction |
| Elicitation | Denies elicitation |
| ElicitationResult | Blocks response |
| WorktreeCreate | Any non-zero fails creation |

---

## Environment Variables for Hook Paths

| Variable | Description |
|----------|-------------|
| `$CLAUDE_PROJECT_DIR` | Project root |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin's installation directory |
| `${CLAUDE_PLUGIN_DATA}` | Plugin's persistent data directory |
| `$CLAUDE_CODE_REMOTE` | `"true"` in remote web environments |
| `CLAUDE_ENV_FILE` | File path for persisting environment variables (SessionStart, Setup, CwdChanged, FileChanged) |

---

## Skill/Agent Scoped Hooks

Hooks defined in skill or agent frontmatter run only while that component is active:

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

---

## Key Code Examples

### Block destructive Bash commands (PreToolUse)

**Settings:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

**Script:**
```bash
#!/bin/bash
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0
fi
```

### HTTP hook with auth header

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:8080/hooks/pre-tool-use",
            "timeout": 30,
            "headers": {
              "Authorization": "Bearer $MY_TOKEN"
            },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

### MCP tool hook

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "mcp_tool",
            "server": "my_server",
            "tool": "security_scan",
            "input": { "file_path": "${tool_input.file_path}" }
          }
        ]
      }
    ]
  }
}
```

### Block user prompt (UserPromptSubmit)

```json
{
  "decision": "block",
  "reason": "Test suite must pass before proceeding",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Run tests first"
  }
}
```

---

## Special Features

### Defer Tool Call (`"defer"`)

Available for PreToolUse only. Pauses Claude at a tool call for external collection. Requires `-p` mode.

1. Session exits with `stop_reason: "tool_deferred"`
2. Calling process reads `deferred_tool_use` from SDK result
3. Process resumes with `claude -p --resume <session-id>`
4. Hook returns `"allow"` with answer in `updatedInput`

**Requires Claude Code v2.1.89+**

### Run Hooks in Background

- `async: true` — Runs without blocking
- `asyncRewake: true` — Runs in background, wakes Claude on exit code 2

### The `/hooks` Menu

Type `/hooks` in Claude Code to open a read-only browser showing:
- All hook events with counts
- Matcher details
- Full handler configurations
- Source file for each hook
