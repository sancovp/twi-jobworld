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

CLIENT="${1:?usage: run-instance.sh <client> [instance-name] [port]}"
INSTANCE="${2:-${CLIENT}-outreach}"
PORT="${3:-3847}"
IMAGE="${IMAGE:-avi-jw:latest}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CLIENT_DIR_IN_IMAGE="/agent/clients/${CLIENT}"
[ -d "${ROOT}/clients/${CLIENT}" ] || { echo "no client config at clients/${CLIENT}"; exit 1; }

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

exec docker run --rm -it \
  --name "$INSTANCE" \
  -p "${PORT}:${PORT}" \
  -v "${VOLUME}:/jobworld_data" \
  -e JOBWORLD_INSTANCE="$INSTANCE" \
  -e JOBWORLD_PORT="$PORT" \
  -e JW_CLIENT="$CLIENT" \
  -e JW_CLIENT_DIR="$CLIENT_DIR_IN_IMAGE" \
  -e JWOUT_DB="/jobworld_data/${INSTANCE}/outreach.db" \
  $ENV_FILE_ARG \
  "$IMAGE"

# Note: the asset/view+click server runs alongside, fronting HOST_DIR over TLS:
#   docker exec -d $INSTANCE jwout serve --port 8000 --docroot /jobworld_data/hosted
