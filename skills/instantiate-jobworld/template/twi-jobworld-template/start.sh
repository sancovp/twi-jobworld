#!/bin/bash
# Generic startup script - path derived from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3847}"
cd "$SCRIPT_DIR/dist"
JOBWORLD_DIR="$SCRIPT_DIR" node server.js
