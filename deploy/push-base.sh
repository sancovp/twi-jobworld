#!/usr/bin/env bash
# push-base.sh — publish the local base image `jobworld-cave:latest` to GHCR so
# CI (and buyer boxes) can pull it. THE prerequisite for the whole pipeline:
# Dockerfile.sdk builds FROM ghcr.io/<owner>/jobworld-cave, which cannot exist
# until this runs once.
#
# ONE-TIME AUTH (interactive — package scope isn't in the default gh token):
#   gh auth refresh -h github.com -s write:packages,read:packages
#   echo "$(gh auth token)" | docker login ghcr.io -u sancovp --password-stdin
# then:
#   deploy/push-base.sh
set -euo pipefail

OWNER="${GHCR_OWNER:-sancovp}"
LOCAL="${LOCAL_BASE:-jobworld-cave:latest}"
REMOTE="ghcr.io/${OWNER}/jobworld-cave:latest"

docker image inspect "$LOCAL" >/dev/null 2>&1 \
  || { echo "FATAL: local base $LOCAL not found (nothing to publish)"; exit 1; }

echo "tag  $LOCAL -> $REMOTE"
docker tag "$LOCAL" "$REMOTE"
echo "push $REMOTE (needs a ghcr.io docker login with write:packages)"
docker push "$REMOTE"
echo "OK — base published. CI can now build Dockerfile.sdk."
echo "Make it pullable by buyers: at github.com/users/${OWNER}/packages find"
echo "'jobworld-cave', and grant read to the buyer (or a deploy PAT)."
