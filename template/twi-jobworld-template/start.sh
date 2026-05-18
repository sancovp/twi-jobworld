#!/bin/bash
# Jobworld CAVE server startup
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3847}"
TMUX_SESSION="${JOBWORLD_TMUX:-cave}"
JOBWORLD_DIR="$SCRIPT_DIR" python -m server --dir "$SCRIPT_DIR" --port "$PORT" --tmux "$TMUX_SESSION"
