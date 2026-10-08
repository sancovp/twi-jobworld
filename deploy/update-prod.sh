#!/usr/bin/env bash
# update-prod.sh — ship the current git state to the running production
# instance. This IS the deploy pipeline at n=1 (CI/CD = the robot version of
# this script; adopt it at second-instance or deploy-fatigue, not before).
#
#   deploy/update-prod.sh <client> [instance-name]     # run ON the prod box
#   e.g. deploy/update-prod.sh b6 b6-outreach
#
# Safe-by-construction:
#   - state lives in VOLUMES (outreach.db, hosted assets, Claude login) and a
#     gitignored secrets file -> a rebuild+restart never touches campaign state.
#   - preflight gates the restart: if the new tree isn't ready, the old
#     container keeps running.
set -euo pipefail

CLIENT="${1:?usage: update-prod.sh <client> [instance-name]}"
INSTANCE="${2:-${CLIENT}-outreach}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== 1/5 pull latest =="
git pull --ff-only

echo "== 2/5 preflight gate (old container untouched on failure) =="
./deploy/preflight.sh "deploy/secrets.${CLIENT}.env" "clients/${CLIENT}/client.json"

echo "== 3/5 build the new image =="
docker build -f Dockerfile.sdk -t avi-jw:latest .

echo "== 4/5 swap the container (volumes persist) =="
docker rm -f "$INSTANCE" 2>/dev/null || true
# DETACH=1 -> run-instance.sh uses `docker run -d --restart unless-stopped`
# (returns immediately; the instance survives reboots).
DETACH=1 ./deploy/run-instance.sh "$CLIENT" "$INSTANCE"
sleep 5

echo "== 5/5 health check =="
docker ps --filter "name=$INSTANCE" --format 'up: {{.Names}} ({{.Status}})' | grep -q up \
  && echo "DEPLOYED: $INSTANCE running on new image" \
  || { echo "FAILED: $INSTANCE not running — check docker logs $INSTANCE"; exit 1; }
