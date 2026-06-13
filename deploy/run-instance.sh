#!/bin/bash
# Launch an avi-jw instance for a given client.
#
#   deploy/run-instance.sh <client> [instance-name] [port]
#   e.g. deploy/run-instance.sh b6 b6-outreach 3847
#
# Loads the client's secret bundle (deploy/secrets.<client>.env, gitignored) and
# wires the worker-layer env (JW_CLIENT / JW_CLIENT_DIR / JWOUT_DB) into the
# container. The CEO then uses run-outreach-campaign to drive the departments.
# See .claude/rules/02-DEPLOYMENT.md and 03-STATUS.md.
set -euo pipefail

CLIENT="${1:?usage: run-instance.sh <client> [instance-name] [dashboard-port]}"
INSTANCE="${2:-${CLIENT}-outreach}"
# The JW image binds THREE ports: dashboard (JOBWORLD_PORT, default 8501),
# Python API (3847, fixed in the base entrypoint), and the jwout serve sidecar
# (8000). They must be distinct — forcing the dashboard onto 3847 collided with
# the API. Arg 3 overrides the dashboard port only.
DASH_PORT="${3:-8501}"
API_PORT="3847"
SERVE_PORT="8000"
IMAGE="${IMAGE:-avi-jw:latest}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CLIENT_DIR_IN_IMAGE="/agent/clients/${CLIENT}"
[ -d "${ROOT}/clients/${CLIENT}" ] || { echo "no client config at clients/${CLIENT}"; exit 1; }

# HOST_BASE_URL: the client's tracked-link domain if configured, else the local
# serve port (so view/click links at least resolve in a local run).
HOST_BASE_URL="$(python3 -c "import json,sys; print(json.load(open('${ROOT}/clients/${CLIENT}/client.json')).get('host_base_url') or '')" 2>/dev/null || echo '')"
[ -n "$HOST_BASE_URL" ] || HOST_BASE_URL="http://localhost:${SERVE_PORT}"

SECRETS="${ROOT}/deploy/secrets.${CLIENT}.env"
if [ -f "$SECRETS" ]; then
  ENV_FILE_ARG="--env-file $SECRETS"
else
  echo "WARNING: $SECRETS not found — running WITHOUT credentials."
  echo "         The instance will run dry (no live pull/send/video/reply)."
  echo "         Copy deploy/secrets.example.env -> $SECRETS and fill it for a live run."
  ENV_FILE_ARG=""
fi

# Persisted instance + run state on a named volume.
VOLUME="${INSTANCE}-data"

echo "dashboard http://localhost:${DASH_PORT}  ·  API ${API_PORT}  ·  serve ${SERVE_PORT}  ·  client ${CLIENT}"

exec docker run --rm -it \
  --name "$INSTANCE" \
  -p "${DASH_PORT}:${DASH_PORT}" \
  -p "${API_PORT}:${API_PORT}" \
  -p "${SERVE_PORT}:${SERVE_PORT}" \
  -v "${VOLUME}:/jobworld_data" \
  -e JOBWORLD_INSTANCE="$INSTANCE" \
  -e JOBWORLD_PORT="$DASH_PORT" \
  -e JW_CLIENT="$CLIENT" \
  -e JW_CLIENT_DIR="$CLIENT_DIR_IN_IMAGE" \
  -e JWOUT_DB="/jobworld_data/${INSTANCE}/outreach.db" \
  -e HOST_DIR="/jobworld_data/hosted" \
  -e HOST_BASE_URL="$HOST_BASE_URL" \
  -e JWOUT_SERVE_PORT="$SERVE_PORT" \
  $ENV_FILE_ARG \
  "$IMAGE"
