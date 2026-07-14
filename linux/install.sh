#!/bin/bash
# Installs the watcher as a per-user systemd service (NOT a system service).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p ~/.local/bin ~/.config/systemd/user
cp "$SCRIPT_DIR/watcher.sh" ~/.local/bin/lastdisc-watcher.sh
chmod +x ~/.local/bin/lastdisc-watcher.sh
cp "$SCRIPT_DIR/lastdisc.service" ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now lastdisc.service

echo "Installed. Check status with:"
echo "  systemctl --user status lastdisc.service"
echo "View logs with:"
echo "  journalctl --user -u lastdisc.service -f"
