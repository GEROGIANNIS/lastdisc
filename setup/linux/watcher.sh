#!/bin/bash
# LastDisc - Linux watcher (MVP)
# Polls mounted removable media for a lastdisc.json manifest and launches
# the referenced Steam game exactly once per insertion.

set -euo pipefail

MEDIA_ROOTS=("/run/media/$USER" "/media/$USER" "/mnt")
LOCK_DIR="${XDG_RUNTIME_DIR:-/tmp}/lastdisc"
mkdir -p "$LOCK_DIR"
POLL_INTERVAL=2

log() { echo "[$(date '+%F %T')] $*"; }

find_manifest() {
  for root in "${MEDIA_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    for dev_dir in "$root"/*/; do
      [ -f "${dev_dir}lastdisc.json" ] && echo "${dev_dir}lastdisc.json" && return 0
    done
  done
  return 1
}

launch_game() {
  local manifest="$1"
  local appid
  appid=$(grep -oP '"app_id"\s*:\s*"\K[^"]+' "$manifest" || true)
  if [ -z "$appid" ]; then
    log "manifest found but app_id missing/malformed: $manifest"
    return 1
  fi
  local lockfile="$LOCK_DIR/${appid}.lock"
  if [ -f "$lockfile" ]; then
    return 0   # already launched for this insertion
  fi
  touch "$lockfile"
  log "Launching Steam AppID $appid"
  if command -v steam >/dev/null 2>&1; then
    steam "steam://rungameid/${appid}" >/dev/null 2>&1 &
  else
    xdg-open "steam://rungameid/${appid}" >/dev/null 2>&1 &
  fi
}

clear_stale_locks() {
  # If no manifest is currently present, clear locks so re-insertion relaunches
  if ! find_manifest >/dev/null; then
    rm -f "$LOCK_DIR"/*.lock 2>/dev/null || true
  fi
}

log "LastDisc watcher started (poll every ${POLL_INTERVAL}s)"
while true; do
  if manifest=$(find_manifest); then
    launch_game "$manifest"
  else
    clear_stale_locks
  fi
  sleep "$POLL_INTERVAL"
done
