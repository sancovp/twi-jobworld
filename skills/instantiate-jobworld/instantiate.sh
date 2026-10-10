#!/bin/bash
# Instantiate a corrected TWI Jobworld instance — THE PATTERN way.
# The instance is COMPILED from its config.json by server/render.py (no hardcoded departments).
# Usage: ./instantiate.sh /full/path/to/instance "Company Name" [port]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/template/twi-jobworld-template"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"   # skills/instantiate-jobworld -> repo root

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 /full/path/to/instance \"Company Name\" [port]"
    exit 1
fi

TARGET_DIR="$1"
COMPANY_NAME="$2"
PORT="${3:-}"

if [ -d "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR already exists"
    exit 1
fi

if [ -z "$PORT" ]; then
    PORT=3847
    while nc -z localhost $PORT 2>/dev/null || nc -z 127.0.0.1 $PORT 2>/dev/null; do
        PORT=$((PORT + 1))
        if [ $PORT -gt 3999 ]; then
            echo "Error: No available ports in range 3847-3999"
            exit 1
        fi
    done
fi

echo "Creating $COMPANY_NAME at $TARGET_DIR (port $PORT)..."

mkdir -p "$TARGET_DIR"
cp -r "$TEMPLATE_DIR/"* "$TARGET_DIR/" 2>/dev/null || true

# Seed the ONE config from the example, stamping in the company name. The frontend config panel
# edits this file (and .secrets) later; on save the server re-renders. Departments/agents/CEO
# prompt/MCPs are all COMPILED from here — never hardcoded in this script.
python3 - "$REPO_ROOT/config.example.json" "$TARGET_DIR/config.json" "$COMPANY_NAME" <<'PY'
import json, sys
src, dst, name = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(src))
cfg.setdefault("company", {})["name"] = name
json.dump(cfg, open(dst, "w"), indent=2)
PY

# Seed secrets (empty) — the frontend fills the keys; agents never see this dir.
mkdir -p "$TARGET_DIR/.secrets"
cp "$REPO_ROOT/.secrets/mcp_state.example.json" "$TARGET_DIR/.secrets/mcp_state.json"

# COMPILE the instance from its config (CLAUDE.md, agents/CEO.md, .claude/agents/*, .claude/rules/*,
# skills/run-dept-*/SKILL.md, .mcp.json). THIS replaces the old hardcoded 5-department heredoc.
echo "Rendering instance from config..."
python3 "$REPO_ROOT/server/render.py" "$TARGET_DIR"

mkdir -p "$TARGET_DIR/event-stream"
[ -f "$TARGET_DIR/event-stream/data.json" ] || echo '{}' > "$TARGET_DIR/event-stream/data.json"
[ -f "$TARGET_DIR/event-stream/events.jsonl" ] || echo '' > "$TARGET_DIR/event-stream/events.jsonl"

# Start the server (tmux/Anthropic runtime by default; config.runtime selects the CEO launcher).
cd "$TARGET_DIR"
export PORT
if [ -f start.sh ]; then
    chmod +x start.sh
    nohup ./start.sh > server.log 2>&1 &
    SERVER_PID=$!
    echo "Started server with PID $SERVER_PID"
    sleep 2
    if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
        echo ""
        echo "✓ $COMPANY_NAME is live at http://localhost:$PORT"
        echo "✓ Working dir: $TARGET_DIR"
        echo "✓ Edit config via the dashboard config panel, or config.json + re-render."
    else
        echo "Warning: Server may not be fully ready yet. Check $TARGET_DIR/server.log"
    fi
else
    echo "✓ Instance compiled at $TARGET_DIR (no start.sh in template — run the server manually)."
fi
