#!/usr/bin/env bash
# load-and-push-base.sh — publish the base image from a machine with a CLEAN
# network (the VPS), sidestepping the laptop's AVG web-shield proxy that drops
# large uploads. Run this ON THE VPS after scp'ing the tarball there.
#
#   1. (laptop)  scp deploy/artifacts/jobworld-cave.tar.gz  user@vps:~
#   2. (vps)     docker login ghcr.io -u sancovp        # paste a write:packages token
#   3. (vps)     ./load-and-push-base.sh ~/jobworld-cave.tar.gz
set -euo pipefail

TARBALL="${1:?usage: load-and-push-base.sh <path-to-jobworld-cave.tar.gz>}"
OWNER="${GHCR_OWNER:-sancovp}"
REMOTE="ghcr.io/${OWNER}/jobworld-cave:latest"

[ -f "$TARBALL" ] || { echo "FATAL: tarball not found: $TARBALL"; exit 1; }

echo "load  $TARBALL"
docker load -i "$TARBALL"                       # restores jobworld-cave:latest
docker tag jobworld-cave:latest "$REMOTE"
echo "push  $REMOTE (needs: docker login ghcr.io with write:packages)"
docker push "$REMOTE"
echo "OK — base published from the VPS. CI (.github/workflows/image.yml) can now build."
echo "Grant buyer pull access at github.com/users/${OWNER}/packages -> jobworld-cave."
