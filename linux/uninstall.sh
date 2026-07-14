#!/bin/bash
# Removes the LastDisc watcher service and installed files.
set -euo pipefail

systemctl --user disable --now lastdisc.service 2>/dev/null || true
rm -f ~/.config/systemd/user/lastdisc.service
rm -f ~/.local/bin/lastdisc-watcher.sh
systemctl --user daemon-reload

echo "LastDisc watcher removed."
