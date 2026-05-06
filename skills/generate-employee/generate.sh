#!/usr/bin/env bash
# Usage:
# ./generate.sh "http://localhost:3848" "Stillpoint Media" "Software Engineering" "Engineer" "github,worktree,hooks" "general-purpose"

set -euo pipefail

JOBWORLD_URL="${1:?JOBWORLD_URL required}"
COMPANY_NAME="${2:?COMPANY_NAME required}"
DEPT="${3:?DEPT required}"
AGENT_NAME="${4:?AGENT_NAME required}"
CAPABILITIES="${5:?CAPABILITIES required}"
AGENT_TYPE="${6:-general-purpose}"

slugify() {
  echo "$1" \
    | sed 's/[^a-zA-Z0-9]/-/g' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/--*/-/g' \
    | sed 's/^-//' \
    | sed 's/-$//'
}

COMPANY_SLUG="$(slugify "$COMPANY_NAME")"
DEPT_SLUG="$(slugify "$DEPT")"
AGENT_SLUG="$(slugify "$AGENT_NAME")"
AGENT_FILE="${COMPANY_SLUG}-${DEPT_SLUG}-${AGENT_SLUG}"

AGENTS_DIR="${CLAUDE_AGENTS_DIR:-$HOME/.claude/agents}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
DEPT_SKILL_DIR="$SKILLS_DIR/$DEPT_SLUG"
AGENT_PATH="$AGENTS_DIR/${AGENT_FILE}.md"

echo "=== Generate Employee ==="
echo "Company:      $COMPANY_NAME"
echo "Department:   $DEPT"
echo "Agent:        $AGENT_NAME"
echo "Capabilities: $CAPABILITIES"
echo "Agent path:   $AGENT_PATH"
echo ""

DEPT_RESPONSE="$(curl -fsS "$JOBWORLD_URL/api/departments")"

DEPT_ID="$(DEPT="$DEPT" python3 -c '
import json, os, sys
data = json.load(sys.stdin)
target = os.environ["DEPT"].lower()
for d in data:
    if d.get("name", "").lower() == target:
        print(d["id"])
        break
else:
    print(f"ERROR: Department not found: {os.environ["DEPT"]}", file=sys.stderr)
    sys.exit(1)
' <<< "$DEPT_RESPONSE")"

mkdir -p "$AGENTS_DIR" "$DEPT_SKILL_DIR"

cat > "$AGENT_PATH" <<AGENTEOF
---
name: $AGENT_FILE
description: $CAPABILITIES for $COMPANY_NAME $DEPT
version: 1.0.0
tags: [$DEPT_SLUG, $COMPANY_SLUG]
agentType: $AGENT_TYPE
model: claude-sonnet-4-6
---

# $COMPANY_NAME $DEPT — $AGENT_NAME

## Role

$AGENT_NAME for the $DEPT department.

## Capabilities

$(echo "$CAPABILITIES" | tr ',' '\n' | sed 's/^/- /')

## Integration

- Jobworld: $JOBWORLD_URL
- Company: $COMPANY_NAME
- Department: $DEPT
- Department ID: $DEPT_ID
- Registered: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Operating Contract

- Read the department skill before doing work.
- Treat Jobworld state as authoritative.
- Write evidence for completed work.
- Use \`supposedly_done\` only when ready for verification.
- Never claim \`logically_done\` without verification evidence.
- Report blockers explicitly with file paths, commands, and missing inputs.
AGENTEOF

if [ ! -f "$DEPT_SKILL_DIR/SKILL.md" ]; then
  cat > "$DEPT_SKILL_DIR/SKILL.md" <<SKILLEOF
---
name: $DEPT_SLUG
description: $DEPT department for $COMPANY_NAME
version: 1.0.0
tags: [$COMPANY_SLUG, $DEPT_SLUG]
---

# $COMPANY_NAME $DEPT Department

## Agents

<!-- EMPLOYEE_ROSTER_START -->
<!-- EMPLOYEE_ROSTER_END -->

## Processes

{Describe how this department works}

## CEO Instructions

{How to invoke this department}
SKILLEOF
fi

python3 - "$DEPT_SKILL_DIR/SKILL.md" "$AGENT_NAME" "$CAPABILITIES" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
agent = sys.argv[2]
caps = sys.argv[3]
text = path.read_text()

entry = f"- `{agent}` — {caps}"
start = "<!-- EMPLOYEE_ROSTER_START -->"
end = "<!-- EMPLOYEE_ROSTER_END -->"

if entry not in text:
    if start in text and end in text:
        before, rest = text.split(start, 1)
        middle, after = rest.split(end, 1)
        lines = [l for l in middle.strip().splitlines() if l.strip()]
        lines.append(entry)
        new_middle = "\n" + "\n".join(lines) + "\n"
        text = before + start + new_middle + end + after
    else:
        text += f"\n\n## Agents\n\n{entry}\n"
    path.write_text(text)
PY

export DEPT_ID AGENT_NAME AGENT_PATH
PAYLOAD="$(python3 -c '
import json, os
print(json.dumps({
  "dept_id": os.environ["DEPT_ID"],
  "name": os.environ["AGENT_NAME"],
  "agent_file_path": os.environ["AGENT_PATH"]
}))
')"

REGISTER_RESPONSE="$(curl -fsS -X POST "$JOBWORLD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")"

echo ""
echo "========================================"
echo "Employee Generated"
echo "========================================"
echo "Agent file:  $AGENT_PATH"
echo "Dept skill:  $DEPT_SKILL_DIR/SKILL.md"
echo "Registered:  $REGISTER_RESPONSE"
echo "========================================"
