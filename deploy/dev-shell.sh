#!/usr/bin/env bash
# dev-shell.sh — open the avi-jw dev container: Claude Code logged into the
# CLIENT's account (persistent volume), your real repo bind-mounted, zero
# contact with your host login or your GitHub credentials.
#
#   deploy/dev-shell.sh            # build image if missing, drop into bash
#   FRESH=1 deploy/dev-shell.sh    # force-rebuild the dev image first
#
# First run only: inside the container, run `claude login` and complete the
# OAuth **in an incognito browser window signed into the CLIENT's account**
# (a normal window would bind whatever account your browser is logged into).
# The token lands in the named volume and persists across container runs.
#
# Isolation guarantees (deliberate):
#   - your host ~/.claude is NOT mounted -> desktop app stays on YOUR account,
#     container stays on the client's, simultaneously.
#   - no GitHub creds inside -> commit in the container, `git push` from the host.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="avi-jw-dev:latest"
CREDS_VOLUME="avi-jw-client-claude"   # the client-account login lives here

if [ "${FRESH:-}" = "1" ] || ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "building $IMAGE ..."
  docker build -f "$ROOT/deploy/Dockerfile.dev" -t "$IMAGE" "$ROOT/deploy"
fi

echo "dev shell: repo -> /workspace · client login volume -> $CREDS_VOLUME"
echo "first run: \`claude login\` (incognito window, CLIENT account). Then just \`claude\`."

exec docker run --rm -it \
  --name avi-jw-dev \
  -v "$CREDS_VOLUME:/home/dev/.claude" \
  -v "$ROOT:/workspace" \
  -w /workspace \
  -e GIT_AUTHOR_NAME="Isaac" \
  -e GIT_COMMITTER_NAME="Isaac" \
  -e GIT_AUTHOR_EMAIL="dev@avi-jw.local" \
  -e GIT_COMMITTER_EMAIL="dev@avi-jw.local" \
  "$IMAGE" \
  bash -c 'pip3 install -q --user --break-system-packages -e connectors/outreach || true; exec bash'
