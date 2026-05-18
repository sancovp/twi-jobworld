#!/bin/bash
# Sync global Jobworld rules/skills into an instance via symlinks
# Usage: sync_globals.sh /jobworld_data/acme-corp
#
# Reads from: /jobworld_data/.claude/rules/ and /jobworld_data/.claude/skills/
# Symlinks into: $INSTANCE_DIR/.claude/rules/ and $INSTANCE_DIR/.claude/skills/
# Does NOT overwrite instance-specific files (symlinks only added for missing names)

INSTANCE_DIR="${1:?Usage: sync_globals.sh /path/to/instance}"
GLOBAL_DIR="/jobworld_data/.claude"

if [ ! -d "$GLOBAL_DIR" ]; then
    echo "[sync_globals] No global config at $GLOBAL_DIR — skipping"
    exit 0
fi

# Sync rules
if [ -d "$GLOBAL_DIR/rules" ]; then
    mkdir -p "$INSTANCE_DIR/.claude/rules"
    for f in "$GLOBAL_DIR/rules"/*; do
        [ -f "$f" ] || continue
        name=$(basename "$f")
        target="$INSTANCE_DIR/.claude/rules/$name"
        if [ ! -e "$target" ]; then
            ln -sf "$f" "$target"
            echo "[sync_globals] Linked rule: $name"
        fi
    done
fi

# Sync skills (directories)
if [ -d "$GLOBAL_DIR/skills" ]; then
    mkdir -p "$INSTANCE_DIR/.claude/skills"
    for d in "$GLOBAL_DIR/skills"/*/; do
        [ -d "$d" ] || continue
        name=$(basename "$d")
        target="$INSTANCE_DIR/.claude/skills/$name"
        if [ ! -e "$target" ]; then
            ln -sf "$d" "$target"
            echo "[sync_globals] Linked skill: $name"
        fi
    done
fi

echo "[sync_globals] Done for $(basename "$INSTANCE_DIR")"
