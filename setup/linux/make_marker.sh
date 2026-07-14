#!/bin/bash
# Usage: ./make_marker.sh [appid] [title] [output_dir]
#        ./make_marker.sh --gui
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If no arguments, fallback to launching the interactive python CD Creator script
if [ $# -eq 0 ]; then
  echo "No arguments provided. Launching interactive CD Creator script..."
  exec python3 "$SCRIPT_DIR/../../tools/cd_creator.py"
fi

# Support GUI flag directly
if [ "$1" = "--gui" ]; then
  echo "Launching CD Creator GUI..."
  exec python3 "$SCRIPT_DIR/../../tools/cd_creator.py" --gui
fi

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
echo "Tip: For an interactive menu, Steam search, ISO building, or cover art creation, run: ./make_marker.sh"
echo "Tip: For the graphical cover editor and layout designer, run: ./make_marker.sh --gui"
