#!/bin/bash
# Usage: ./make_marker.sh <appid> <title> <output_dir>
set -euo pipefail
APPID="${1:?Usage: make_marker.sh <appid> <title> <output_dir>}"
TITLE="${2:?Usage: make_marker.sh <appid> <title> <output_dir>}"
OUTDIR="${3:?Usage: make_marker.sh <appid> <title> <output_dir>}"

mkdir -p "$OUTDIR"
cat > "$OUTDIR/lastdisc.json" <<EOF
{
  "app_id": "$APPID",
  "title": "$TITLE",
  "version": "1.0"
}
EOF
echo "Wrote $OUTDIR/lastdisc.json - burn this directory to disc (hybrid ISO9660/Joliet or UDF)."
