# LastDisc

Insert a disc. Launch a game. No disc drive DRM tricks, no license bypass —
just a background watcher that notices a game disc and hands the launch off
to Steam's own URI protocol.

Sony has announced it will [stop pressing physical discs for new PlayStation
games starting January 2028](https://techcrunch.com/2026/07/01/sony-to-end-physical-playstation-game-discs-in-2028/).
LastDisc doesn't reverse that — nothing running on one machine can — but it
means the *ritual* of a physical disc triggering a game doesn't have to
disappear just because the industry's moving away from pressing them.

## How it works

1. A small manifest file, `lastdisc.json`, sits at the root of a disc (or any
   removable media) you've prepared:
   ```json
   {
     "app_id": "12345",
     "title": "My Game",
     "version": "1.0"
   }
   ```
2. A lightweight watcher — running as your normal logged-in user, not a
   privileged system service — polls for that file every couple of seconds.
3. When it finds one, it hands off to Steam:
   ```
   steam://rungameid/12345
   ```
   Steam handles ownership/DRM verification itself. LastDisc never executes
   anything from the disc directly — it only reads a JSON file and calls
   Steam's own protocol handler.
4. A per-AppID lock file stops the game from relaunching every poll cycle
   while the disc stays inserted, and clears once the disc is removed so
   re-inserting it relaunches cleanly.

## Why it's built this way

- **Runs as a user process, not a system service.** A root/SYSTEM-level
  service can detect the disc fine but can't reach your desktop session to
  actually launch anything (Session 0 isolation on Windows, the equivalent
  root/user session split on Linux). LastDisc runs via a systemd **user**
  unit on Linux and a **Limited**-privilege Scheduled Task on Windows —
  both inherit your interactive session correctly.
- **Never executes code from the disc.** Removable media is frequently
  mounted `noexec`, and "background service executes code from inserted
  media" is exactly the pattern antivirus/EDR heuristics flag. LastDisc only
  reads a manifest and calls the Steam URI handler, which lives on your
  local disk.
- **Detects by file, not by label.** Volume labels are cosmetic strings
  anyone can set on any disc. Detection is based on the manifest's actual
  existence and contents.

See [`PROJECT_PLAN.md`](PROJECT_PLAN.md) for the full architecture rationale,
build phases, and testing checklist.

For a detailed walkthrough, setup details, and troubleshooting, refer to the **[Installation and Running Guide](guide/README.md)**.

## Quick start

### Linux

```bash
cd setup/linux
chmod +x install.sh watcher.sh make_marker.sh
./install.sh
```

This installs the watcher to `~/.local/bin/lastdisc-watcher.sh` and enables
it as a per-user systemd service (`systemctl --user status lastdisc.service`
to check it, `journalctl --user -u lastdisc.service -f` to watch logs).

To uninstall (from `setup/linux/`): `./uninstall.sh`

### Windows

Run in an **unelevated** PowerShell prompt:

```powershell
cd setup/windows
.\install.ps1
```

This registers a logon-triggered Scheduled Task named `LastDiscWatcher` at
**Limited** run level. Do not run `install.ps1` as Administrator — elevation
breaks the session inheritance this depends on.

To uninstall (from `setup/windows/`): `.\uninstall.ps1`

### Preparing a disc

Find your game's Steam AppID (from the store URL: `store.steampowered.com/app/<APPID>/...`, or via SteamDB), then generate the manifest.

You can use the automated **CD Creator & Cover Editor** utility (requires Python 3) to search Steam, compile ISOs, and design/print cover layouts.

**Interactive CLI CD Creator:**
- **Linux:** `./setup/linux/make_marker.sh`
- **Windows:** `.\setup\windows\make_marker.ps1`

This script queries local libraries and the online Steam Store, generates the launch manifest, and automatically compiles it into a burnable `.iso` file (if standard ISO tools like `genisoimage`, `mkisofs`, `xorriso`, or `oscdimg` are installed).

**Graphical Cover Creator & Editor:**
- **Linux:** `./setup/linux/make_marker.sh --gui`
- **Windows:** `.\setup\windows\make_marker.ps1 -Gui`

This launches a local web server (defaults to `http://localhost:8000`) and opens your web browser. Features include:
- **Live Search**: Look up Steam games and automatically fetch vertical cover art.
- **Visual Design Studio**: Customize titles, alignments, fonts, text overlays, and backgrounds. Generates Front Cover (120x120mm), Back Inlay & Spines (150x118mm), and CD Disc Surface (116mm diameter).
- **Physical-Scale Print Layout**: Hit **Print Covers** to print your customized art at exact physical size.
- **ISO Export**: Instantly download the compiled `.iso` with your `lastdisc.json` manifest.

*Note: Legacy positional arguments are still supported for quick raw directory generation without Python:*
- **Linux:** `./setup/linux/make_marker.sh 12345 "My Game" ./disc_root`
- **Windows:** `.\setup\windows\make_marker.ps1 -AppId 12345 -Title "My Game" -OutDir .\disc_root`

Burn the contents of the generated `.iso` or raw `disc_root/` folder to your physical disc (hybrid ISO9660/Joliet or UDF is recommended so filenames survive on both OSes).

## Requirements

- Steam client installed and logged in
- Linux: systemd with user session support (`systemctl --user`)
- Windows: PowerShell 5.1+, Task Scheduler

## Project status

MVP (Phase 0). No structured logging, no multi-disc priority handling, no
checksum verification yet — see the Risks & Limitations section of
`PROJECT_PLAN.md` before relying on this for anything beyond personal use.

## License

Add your preferred license here (MIT is a common default for a project like
this) before publishing the repo.
