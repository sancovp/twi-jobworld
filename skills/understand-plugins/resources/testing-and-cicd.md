# Plugin Testing & CICD

Comprehensive testing and continuous integration for Claude Code plugins.

---

## Testing Levels

### Level 1: Syntax & Structure Validation

```bash
# Validate YAML frontmatter
head -n 20 .claude/commands/my-command.md | grep -A 10 "^---"

# Check for closing frontmatter marker (should be 2)
head -n 20 .claude/commands/my-command.md | grep -c "^---"

# Verify file has .md extension
ls .claude/commands/*.md

# Check file is in correct location
test -f .claude/commands/my-command.md && echo "Found"
```

### Level 2: Frontmatter Field Validation

Check field types, valid ranges, required fields.

### Level 3: Manual Invocation

```bash
# Start Claude Code
claude --debug

# Check command appears in help
> /help

# Invoke command without arguments
> /my-command

# Check debug logs
tail -f ~/.claude/debug-logs/latest
```

### Level 4: Argument Testing

| Test Case | Command | Expected Result |
|-----------|---------|----------------|
| No args | `/cmd` | Graceful handling |
| One arg | `/cmd arg1` | $1 substituted correctly |
| Special chars | `/cmd "arg with spaces"` | Quotes handled |
| Empty arg | `/cmd ""` | Empty string handled |

### Level 5: File Reference Testing

- @ syntax loads file contents
- Non-existent files handled gracefully
- Large files handled appropriately
- Multiple file references work

### Level 6: Bash Execution Testing

- !` commands execute correctly
- Command output included in prompt
- Command failures handled
- Security: only allowed commands run

### Level 7: Integration Testing

- Commands work with other plugin components
- Commands interact correctly with each other
- State management works across invocations
- Workflow commands execute in sequence

---

## Plugin Validator Agent

Use the `plugin-validator` agent to validate plugins automatically:

```
Use when: "validate my plugin", "check plugin structure", "verify plugin is correct"
```

**Validation checks:**
1. Plugin structure and organization
2. plugin.json manifest correctness
3. All component files (commands, agents, skills, hooks)
4. Naming conventions
5. Security (no hardcoded credentials, HTTPS/WSS for MCP)

**Output format:**
```
## Plugin Validation Report

### Plugin: [name]
Location: [path]

### Summary
[Overall assessment]

### Critical Issues ([count])
- file/path - Issue - Fix

### Component Summary
- Commands: [count] found, [count] valid
- Agents: [count] found, [count] valid
- Skills: [count] found, [count] valid
- Hooks: [valid/invalid]
- MCP Servers: [count] configured
```

---

## Local Testing

### Test with --plugin-dir

```bash
# Test plugin locally before publishing
claude --plugin-dir ./my-plugin

# Reload without restart
/reload-plugins
```

Local copy takes precedence over installed marketplace plugin with same name.

---

## GitHub Actions CI/CD

### Basic Validation Workflow

```yaml
# .github/workflows/test-plugin.yml
name: Test Plugin

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate plugin structure
        run: |
          # Check .claude-plugin/plugin.json exists
          test -f .claude-plugin/plugin.json

      - name: Validate JSON syntax
        run: |
          cat .claude-plugin/plugin.json | jq .

      - name: Check for required files
        run: |
          # Commands have .md extension
          for f in .claude/commands/*.md; do
            test -f "$f" || exit 1
          done

      - name: Validate agent files
        run: |
          for f in agents/*.md; do
            head -n 50 "$f" | grep -q "^---" || exit 1
          done
```

### Comprehensive Plugin CI

```yaml
# .github/workflows/plugin-ci.yml
name: Plugin CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Claude CLI
        run: |
          npm install -g @anthropic-ai/claude-code

      - name: Run plugin validator
        run: |
          claude --print --plugin-dir . << 'EOF'
          /plugin-validator
          EOF

      - name: Validate all commands
        run: |
          for cmd in .claude/commands/*.md; do
            # Check frontmatter
            head -n 1 "$cmd" | grep -q "^---" || exit 1
            # Check description
            grep -q "^description:" "$cmd" || exit 1
          done

      - name: Validate all agents
        run: |
          for agent in agents/*.md; do
            # Check YAML frontmatter
            head -n 50 "$agent" | grep -q "^name:" || exit 1
            head -n 50 "$agent" | grep -q "^description:" || exit 1
          done

      - name: Check for TODOs
        run: |
          if grep -r "TODO" .claude/; then
            echo "ERROR: TODOs found in plugin"
            exit 1
          fi
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating plugin components..."

# Validate commands
COMMANDS_CHANGED=$(git diff --cached --name-only | grep "\.claude/commands/.*\.md")
for cmd in $COMMANDS_CHANGED; do
  echo "Checking: $cmd"
  head -n 1 "$cmd" | grep -q "^---" || exit 1
done

# Validate agents
AGENTS_CHANGED=$(git diff --cached --name-only | grep "agents/.*\.md")
for agent in $AGENTS_CHANGED; do
  echo "Checking: $agent"
  head -n 50 "$agent" | grep -q "^name:" || exit 1
done

echo "✓ All components valid"
```

---

## Validation Scripts

### validate-plugin.sh

```bash
#!/bin/bash
# validate-plugin.sh - Validate entire plugin

set -e

PLUGIN_DIR="${1:-.}"

echo "Validating plugin at $PLUGIN_DIR..."

# Check manifest
if [ ! -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
  echo "ERROR: Missing .claude-plugin/plugin.json"
  exit 1
fi
echo "✓ Manifest found"

# Validate JSON
jq empty "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null || {
  echo "ERROR: Invalid JSON in plugin.json"
  exit 1
}
echo "✓ JSON valid"

# Check component directories
for dir in commands agents skills hooks; do
  if [ -d "$PLUGIN_DIR/$dir" ]; then
    echo "✓ $dir/ exists"
    count=$(find "$PLUGIN_DIR/$dir" -name "*.md" | wc -l)
    echo "  - Found $count .md files"
  fi
done

echo "Plugin validation complete"
```

### validate-agent.sh (from plugin-dev)

```bash
#!/bin/bash
# validate-agent.sh - Validate agent file

AGENT_FILE="$1"

if [ ! -f "$AGENT_FILE" ]; then
  echo "ERROR: File not found: $AGENT_FILE"
  exit 1
fi

# Extract frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$AGENT_FILE" | sed '1d;$d')

# Check required fields
echo "$FRONTMATTER" | grep -q "^name:" || exit 1
echo "$FRONTMATTER" | grep -q "^description:" || exit 1
echo "$FRONTMATTER" | grep -q "^model:" || exit 1

echo "✓ Agent valid: $AGENT_FILE"
```

---

## Testing Checklist

Before releasing a plugin:

### Structure
- [ ] File in correct location
- [ ] Correct .md extension
- [ ] Valid YAML frontmatter
- [ ] Markdown syntax correct

### Functionality
- [ ] Commands appear in `/help`
- [ ] Descriptions are clear
- [ ] Command executes without errors
- [ ] Arguments work as expected
- [ ] File references work
- [ ] Bash execution works (if used)

### Integration
- [ ] Works with hooks (if applicable)
- [ ] Works with MCP (if applicable)
- [ ] State management works

### Security
- [ ] No hardcoded credentials
- [ ] MCP servers use HTTPS/WSS
- [ ] Hooks have no obvious security issues

### Distribution
- [ ] Tested by others
- [ ] README updated
- [ ] Examples provided

---

## Debugging Failed Tests

**Command not appearing in /help:**
```bash
# Check file location and permissions
ls -la .claude/commands/my-command.md
chmod 644 .claude/commands/my-command.md
```

**Arguments not substituting:**
```bash
# Verify syntax
grep '\$1' .claude/commands/my-command.md
grep '\$ARGUMENTS' .claude/commands/my-command.md
```

**Bash commands not executing:**
```bash
# Check allowed-tools
grep "allowed-tools" .claude/commands/my-command.md
```

**Agent validation failing:**
```bash
# Run validate-agent.sh
./scripts/validate-agent.sh agents/my-agent.md
```

---

## CI/CD Best Practices

1. **Test early, test often** - Validate as you develop
2. **Automate validation** - Use scripts for repeatable checks
3. **Test edge cases** - Don't just test the happy path
4. **Get feedback** - Have others test before release
5. **Monitor in production** - Watch for issues after release
6. **Version your plugin** - Explicit version in plugin.json for updates

---

## Resources

- **plugin-dev plugin** (`plugin-dev@claude-code-marketplace`):
  - `plugin-validator` agent for automated validation
  - `hook-development` skill with test-hook.sh, validate-hook-schema.sh
  - `agent-development` skill with validate-agent.sh
  - Comprehensive testing strategies reference

- **Local testing**: `claude --plugin-dir ./my-plugin`
- **Reload without restart**: `/reload-plugins`
