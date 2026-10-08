#!/usr/bin/env bash
# update.sh — manual pull-and-swap, for when the buyer wants to update NOW
# instead of waiting for watchtower's interval (or if watchtower is disabled).
# State (DB, hosted assets, Claude login) lives in volumes and is untouched.
#
#   ./update.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "pulling latest image ..."
docker compose --env-file .env pull instance
echo "recreating the instance (volumes persist) ..."
docker compose --env-file .env up -d instance
sleep 5
NAME="$(grep -E '^INSTANCE_NAME=' .env | cut -d= -f2 || echo b6-outreach)"
docker ps --filter "name=$NAME" --format 'up: {{.Names}} ({{.Status}})' | grep -q up \
  && echo "UPDATED: $NAME on the new image" \
  || { echo "FAILED — check: docker logs $NAME"; exit 1; }
