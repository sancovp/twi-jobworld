#!/usr/bin/env bash
# install.sh — stand up a sold JobWorld instance on the buyer's box (the VPS we
# sell them). Run once. Idempotent-ish: safe to re-run to bring the stack up.
#
#   ./install.sh
#
# Prereqs (the runbook walks these): Docker + compose installed; a GHCR pull
# token in ~/.docker/config.json (docker login ghcr.io); .env + secrets.env
# filled from the .example files in this dir.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "FATAL: Docker not installed — see RUNBOOK.md step 1"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose v2 not available"; exit 1; }

[ -f .env ]        || { echo "FATAL: .env missing — cp env.example .env and fill it"; exit 1; }
[ -f secrets.env ] || { echo "FATAL: secrets.env missing — cp secrets.env.example secrets.env and fill it"; exit 1; }

# Confirm we can actually pull the private image before starting.
IMG="ghcr.io/$(grep -E '^GHCR_OWNER=' .env | cut -d= -f2 || echo sancovp)/avi-jw:latest"
echo "pulling $IMG (needs a GHCR login with read:packages) ..."
docker compose --env-file .env pull instance watchtower

echo "starting the instance + auto-updater ..."
docker compose --env-file .env up -d

echo
echo "UP. The instance self-operates; watchtower auto-updates it from GHCR."
echo "  public (tracked links + unsubscribe): http://<this-box>:8000/health"
echo "  operator dashboards (loopback only):  ssh -L 8501:localhost:8501 -L 8787:localhost:8787 <box>"
echo "Something wrong? contact the vendor. You do not operate the agents."
