#!/bin/bash
# Jobworld CAVE Entrypoint (corrected — config COMPILES the instance).
# Seeds config.json (from a baked client config, or the example) + .secrets (from a mounted/env secret,
# NEVER baked into the image), COMPILES the instance via render.py, then starts the CEO runtime.

set -e

INSTANCE="${JOBWORLD_INSTANCE:?JOBWORLD_INSTANCE required}"
INSTANCE_DIR="/jobworld_data/$INSTANCE"
PORT="${JOBWORLD_PORT:-3847}"
TMUX_SESSION="${JOBWORLD_TMUX:-cave}"
CLIENT="${JOBWORLD_CLIENT:-}"        # which /agent/clients/<CLIENT>/config.json to seed (optional)

mkdir -p "$INSTANCE_DIR/event-stream" "$INSTANCE_DIR/sops" "$INSTANCE_DIR/skills" \
         "$INSTANCE_DIR/.claude/rules" "$INSTANCE_DIR/.claude/skills" \
         "$INSTANCE_DIR/agents" "$INSTANCE_DIR/.secrets"

[ -f "$INSTANCE_DIR/event-stream/data.json" ] || echo '{}' > "$INSTANCE_DIR/event-stream/data.json"
[ -f "$INSTANCE_DIR/event-stream/events.jsonl" ] || touch "$INSTANCE_DIR/event-stream/events.jsonl"

# Runtime/dashboard template files
[ -f "$INSTANCE_DIR/index.html" ] || cp /agent/template/twi-jobworld-template/index.html "$INSTANCE_DIR/index.html" 2>/dev/null || true
[ -f "$INSTANCE_DIR/HEARTBEAT.md" ] || cp /agent/template/twi-jobworld-template/HEARTBEAT.md "$INSTANCE_DIR/HEARTBEAT.md" 2>/dev/null || true

# ---- 1. SEED THE ONE CONFIG (client config if named, else the example) ------------------------
if [ ! -f "$INSTANCE_DIR/config.json" ]; then
  if [ -n "$CLIENT" ] && [ -f "/agent/clients/$CLIENT/config.json" ]; then
    cp "/agent/clients/$CLIENT/config.json" "$INSTANCE_DIR/config.json"
    echo "[Jobworld] seeded config from client '$CLIENT'"
  else
    cp /agent/config.example.json "$INSTANCE_DIR/config.json"
    echo "[Jobworld] seeded config from example (no JOBWORLD_CLIENT)"
  fi
fi

# ---- 2. SEED SECRETS AT RUNTIME (never baked into the image) -----------------------------------
# Priority: a mounted secret file, else INSTANTLY_API_KEY/APOLLO_API_KEY env, else empty (agent reports
# the blocker — never fabricated).
if [ ! -f "$INSTANCE_DIR/.secrets/mcp_state.json" ]; then
  if [ -n "$JW_SECRETS_FILE" ] && [ -f "$JW_SECRETS_FILE" ]; then
    cp "$JW_SECRETS_FILE" "$INSTANCE_DIR/.secrets/mcp_state.json"
    echo "[Jobworld] seeded secrets from \$JW_SECRETS_FILE"
  elif [ -n "$INSTANTLY_API_KEY" ] || [ -n "$APOLLO_API_KEY" ]; then
    python3 - "$INSTANCE_DIR/.secrets/mcp_state.json" <<PY
import json, os, sys
json.dump({
  "instantly": {"INSTANTLY_API_KEY": os.environ.get("INSTANTLY_API_KEY","")},
  "apollo": {"_auth_mode": "api_key", "APOLLO_API_KEY": os.environ.get("APOLLO_API_KEY","")},
}, open(sys.argv[1], "w"), indent=2)
PY
    echo "[Jobworld] seeded secrets from env"
  else
    cp /agent/.secrets/mcp_state.example.json "$INSTANCE_DIR/.secrets/mcp_state.json" 2>/dev/null || echo '{}' > "$INSTANCE_DIR/.secrets/mcp_state.json"
    echo "[Jobworld] WARNING: no secrets provided — MCP env will be empty (agent will report the blocker)."
  fi
fi

# ---- 3. COMPILE THE INSTANCE FROM CONFIG (replaces the old hardcoded CLAUDE.md heredoc) --------
cd /agent
python3 -m server.render --dir "$INSTANCE_DIR"

# Sync any global rules/skills mounted at /jobworld_data/.claude/ into the instance
[ -x /usr/local/bin/sync_globals.sh ] && /usr/local/bin/sync_globals.sh "$INSTANCE_DIR" || true

echo "{\"status\": \"starting\", \"instance\": \"$INSTANCE\", \"timestamp\": \"$(date -Iseconds)\"}" > "$INSTANCE_DIR/agent_state.json"

# ---- 4. START THE CEO RUNTIME (config.runtime: tmux-anthropic | sdk-minimax) --------------------
RUNTIME="$(python3 -c "import json,sys; print(json.load(open('$INSTANCE_DIR/config.json')).get('runtime','tmux-anthropic'))" 2>/dev/null || echo tmux-anthropic)"
echo "[Jobworld] runtime: $RUNTIME"

if [ "$RUNTIME" = "tmux-anthropic" ]; then
  tmux new-session -d -s "$TMUX_SESSION" -n main
  tmux send-keys -t "$TMUX_SESSION" "cd $INSTANCE_DIR" Enter
  sleep 1
  tmux send-keys -t "$TMUX_SESSION" "claude --permission-mode bypassPermissions" Enter
  sleep 5
fi

cd /agent
JOBWORLD_DIR="$INSTANCE_DIR" python3 -m server \
    --dir "$INSTANCE_DIR" \
    --port "$PORT" \
    --tmux "$TMUX_SESSION" \
    --runtime "$RUNTIME" \
    > "$INSTANCE_DIR/cave_server.log" 2>&1 &
CAVE_PID=$!

echo "{\"status\": \"running\", \"instance\": \"$INSTANCE\", \"port\": $PORT, \"runtime\": \"$RUNTIME\", \"cave_pid\": $CAVE_PID, \"timestamp\": \"$(date -Iseconds)\"}" > "$INSTANCE_DIR/agent_state.json"
echo "[Jobworld] $INSTANCE running on port $PORT (runtime: $RUNTIME, CAVE PID: $CAVE_PID)"

wait $CAVE_PID
