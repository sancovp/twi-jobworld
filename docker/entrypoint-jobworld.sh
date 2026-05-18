#!/bin/bash
# Jobworld CAVE Entrypoint
# tmux → claude → CAVE server → global sync → heartbeat takes over

set -e

INSTANCE="${JOBWORLD_INSTANCE:?JOBWORLD_INSTANCE required}"
INSTANCE_DIR="/jobworld_data/$INSTANCE"
PORT="${JOBWORLD_PORT:-3847}"
TMUX_SESSION="${JOBWORLD_TMUX:-cave}"

# Ensure instance directory exists
mkdir -p "$INSTANCE_DIR/event-stream" "$INSTANCE_DIR/sops" "$INSTANCE_DIR/skills"
mkdir -p "$INSTANCE_DIR/.claude/rules" "$INSTANCE_DIR/.claude/skills"

# Initialize data if fresh
[ -f "$INSTANCE_DIR/event-stream/data.json" ] || echo '{}' > "$INSTANCE_DIR/event-stream/data.json"
[ -f "$INSTANCE_DIR/event-stream/events.jsonl" ] || touch "$INSTANCE_DIR/event-stream/events.jsonl"

# Sync global rules/skills from /jobworld_data/.claude/ into instance
/usr/local/bin/sync_globals.sh "$INSTANCE_DIR"

# Write agent state
echo "{\"status\": \"starting\", \"instance\": \"$INSTANCE\", \"timestamp\": \"$(date -Iseconds)\"}" \
    > "$INSTANCE_DIR/agent_state.json"

# Start tmux session
tmux new-session -d -s "$TMUX_SESSION" -n main

# Set working directory to instance
tmux send-keys -t "$TMUX_SESSION" "cd $INSTANCE_DIR" Enter
sleep 1

# Launch Claude Code in tmux
tmux send-keys -t "$TMUX_SESSION" "claude" Enter
sleep 5

# Start Jobworld CAVE server in background
cd /agent
JOBWORLD_DIR="$INSTANCE_DIR" python -m server \
    --dir "$INSTANCE_DIR" \
    --port "$PORT" \
    --tmux "$TMUX_SESSION" \
    > "$INSTANCE_DIR/cave_server.log" 2>&1 &
CAVE_PID=$!

echo "{\"status\": \"running\", \"instance\": \"$INSTANCE\", \"port\": $PORT, \"cave_pid\": $CAVE_PID, \"timestamp\": \"$(date -Iseconds)\"}" \
    > "$INSTANCE_DIR/agent_state.json"

echo "[Jobworld] $INSTANCE running on port $PORT (tmux: $TMUX_SESSION, CAVE PID: $CAVE_PID)"

# If CLAUDE.md exists in instance, Claude Code picks it up automatically
# If HEARTBEAT.md exists, CEO heartbeat uses it

# Keep container alive — wait for CAVE server
wait $CAVE_PID
