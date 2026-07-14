# LastDisc Installation and Running Guide

LastDisc allows you to insert a physical game disc and automatically launch the corresponding game on Steam. This guide provides comprehensive, step-by-step instructions for setting up the background watcher on Windows and Linux, preparing physical media, running the service, and uninstalling it.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Windows Setup](#windows-setup)
   - [Installation](#windows-installation)
   - [Verification & Running](#windows-verification--running)
   - [Troubleshooting](#windows-windows-troubleshooting)
   - [Uninstallation](#windows-uninstallation)
3. [Linux Setup](#linux-setup)
   - [Installation](#linux-installation)
   - [Verification & Running](#linux-verification--running)
   - [Troubleshooting](#linux-troubleshooting)
   - [Uninstallation](#linux-uninstallation)
4. [Preparing Game Discs](#preparing-game-discs)
   - [1. Find the Steam AppID](#1-find-the-steam-appid)
   - [2. Generate the Manifest File](#2-generate-the-manifest-file)
   - [3. Burn the Manifest to Disc](#3-burn-the-manifest-to-disc)
5. [How It Works (Under the Hood)](#how-it-works-under-the-hood)

---

## Prerequisites

Before starting, make sure you have:
- **Steam Client** installed, logged in, and running.
- A **CD/DVD/Blu-ray drive** (internal or external USB drive) or a virtual drive mount emulator.
- Windows or Linux operating system satisfying the platform requirements below.

---

## Windows Setup

### Platform Requirements
- Windows 10 or 11
- PowerShell 5.1 or newer
- Windows Task Scheduler enabled

### Windows Installation

> [!IMPORTANT]
> **Do NOT run PowerShell as Administrator (elevated).**
> The LastDisc watcher runs under your normal user session to interact with your desktop and communicate with Steam. If you run the installation or the watcher elevated, session inheritance will break, and LastDisc won't be able to launch Steam games.

1. Open a regular, **unelevated** PowerShell window.
2. Navigate to the project's setup directory:
   ```powershell
   cd setup\windows
   ```
3. Run the installation script:
   ```powershell
   .\install.ps1
   ```
   This will create a folder at `~\AppData\Local\LastDisc`, copy the watcher script there, and register a Windows Scheduled Task named `LastDiscWatcher` that triggers automatically when you log on.

### Windows Verification & Running

- **Start the watcher immediately** without logging out and back in:
  ```powershell
  Start-ScheduledTask -TaskName "LastDiscWatcher"
  ```
- **Check if the task is registered and running**:
  ```powershell
  Get-ScheduledTask -TaskName "LastDiscWatcher"
  ```
- **Stop the watcher task manually**:
  ```powershell
  Stop-ScheduledTask -TaskName "LastDiscWatcher"
  ```

### Windows Troubleshooting

- **Check logs**: The watcher outputs simple log messages. To check if the process is running in the background, you can search for `powershell` processes running the `watcher.ps1` script:
  ```powershell
  Get-CimInstance Win32_Process -Filter "CommandLine like '%watcher.ps1%'"
  ```
- **Resetting the launch lock**: LastDisc uses a temporary folder to keep track of launched games and prevent launching them repeatedly in a loop. If a game doesn't launch when you insert a disc, you can clear the locks manually by running:
  ```powershell
  Remove-Item -Path "$env:TEMP\lastdisc\*.lock" -Force
  ```

### Windows Uninstallation

To completely remove the watcher and its scheduled task, run:
```powershell
cd setup\windows
.\uninstall.ps1
```

---

## Linux Setup

### Platform Requirements
- Systemd with user session support (`systemctl --user`)
- Common mount points (like `/run/media/$USER/` or `/media/$USER/`) used by your Desktop Environment (GNOME, KDE, etc.)

### Linux Installation

1. Open your terminal.
2. Navigate to the setup directory:
   ```bash
   cd setup/linux
   ```
3. Make the scripts executable:
   ```bash
   chmod +x install.sh watcher.sh make_marker.sh uninstall.sh
   ```
4. Run the installation script:
   ```bash
   ./install.sh
   ```
   This copies `watcher.sh` to `~/.local/bin/lastdisc-watcher.sh` and enables a per-user systemd service named `lastdisc.service` to start on logon.

### Linux Verification & Running

- **Check the service status**:
  ```bash
  systemctl --user status lastdisc.service
  ```
- **View real-time logs**:
  ```bash
  journalctl --user -u lastdisc.service -f
  ```
- **Restart the watcher**:
  ```bash
  systemctl --user restart lastdisc.service
  ```
- **Stop the watcher**:
  ```bash
  systemctl --user stop lastdisc.service
  ```

### Linux Troubleshooting

- **No game launches**: Make sure your desktop environment mounts the disc automatically under `/run/media/$USER/` or `/media/$USER/`. 
- **Verify mount location**: Check where the disc is mounted by running `lsblk` or `mount`. If it's mounted in a non-standard directory, you can add it to the `MEDIA_ROOTS` array in `~/.local/bin/lastdisc-watcher.sh` and run `systemctl --user restart lastdisc.service`.
- **Resetting the launch lock**: LastDisc stores launch lock files in your runtime directory. If you need to clear them:
  ```bash
  rm -f "${XDG_RUNTIME_DIR:-/tmp}/lastdisc"/*.lock
  ```

### Linux Uninstallation

To disable the service and delete all installed files, run:
```bash
cd setup/linux
./uninstall.sh
```

---

## Preparing Game Discs

To turn a standard physical disc (or USB flash drive) into a LastDisc launcher, you must place a manifest file named `lastdisc.json` at the root of the media.

### 1. Find the Steam AppID
Go to the Steam store page for your game. The URL contains the AppID:
`https://store.steampowered.com/app/<APPID>/<GAME_NAME>/`
For example, for Portal 2, the AppID is `620`.

### 2. Generate the Manifest and CD Contents

We provide helper tools to easily create the directory structure, compile burnable `.iso` files, and design cover art.

- **Interactive CLI CD Creator**:
  To launch the interactive search and creation CLI:
  - **Linux**: `./setup/linux/make_marker.sh`
  - **Windows**: `.\setup\windows\make_marker.ps1`
  
  1. Input a search query for any game.
  2. The script will scan your local installed Steam libraries and query the online Steam Store.
  3. Select the number matching your target game.
  4. Specify the output location (e.g., `./portal2.iso`). If standard ISO authoring tools (`genisoimage`, `mkisofs`, `xorriso`, or Windows `oscdimg`) are installed, it will automatically compile it into a burnable ISO. If none are found, it falls back to generating the raw directory structure.

- **Graphical CD Cover Editor & Creator (GUI)**:
  To launch the design studio:
  - **Linux**: `./setup/linux/make_marker.sh --gui`
  - **Windows**: `.\setup\windows\make_marker.ps1 -Gui`
  
  1. This spins up a web server at `http://localhost:8000` and automatically opens your default browser.
  2. Search for any Steam game to automatically pull cover art.
  3. Customize the cover background (use official Steam art, uploaded images, or solid colors), customize the fonts, alignment, background/text colors, opacity, and custom spine labels.
  4. Renders a pixel-perfect layout for:
     - **Front Cover insert** (120mm x 120mm)
     - **Back Inlay & Spines** (150mm x 118mm with 6mm left/right spines)
     - **CD Disc Surface Label** (116mm diameter with 15mm/40mm center hole guidelines)
  5. Click **Download ISO** to download a compiled `.iso` with your `lastdisc.json` manifest directly from the browser.
  6. Click **Print Covers** (or press Ctrl+P) to print the layouts.
     
     > [!IMPORTANT]
     > **Print Settings for Exact 1:1 Scale:**
     > In your browser's Print Dialog, ensure you apply the following settings so the covers print at their exact physical millimeter dimensions:
     > - **Destination**: Save to PDF or print to physical printer.
     > - **Margins**: **None** (or minimum borderless).
     > - **Scale**: **100%** (do *not* use "Fit to Page" or "Fit to printable area", as this shrinks the templates).
     > - **Background graphics**: **Enabled** (required to print the background cover art/colors).

- **Legacy/Manual Command-Line Generation**:
  Generate raw directory structures directly without Python:
  - **Linux**: `./setup/linux/make_marker.sh 620 "Portal 2" ./disc_root`
  - **Windows**: `.\setup\windows\make_marker.ps1 -AppId 620 -Title "Portal 2" -OutDir .\disc_root`

The generated manifest files look like this:
```json
{
  "app_id": "620",
  "title": "Portal 2",
  "version": "1.0"
}
```

### 3. Burn the Manifest to Disc
Burn the contents of the `disc_root/` folder directly to the root of your CD/DVD/Blu-ray disc:
- **Recommended File System**: Use a **hybrid ISO9660/Joliet** or **UDF** format. This ensures volume names and files are read correctly across both Windows and Linux systems.
- Make sure `lastdisc.json` is at the absolute top-level directory of the burned disc (e.g. `D:\lastdisc.json` on Windows or `/media/user/DISC_NAME/lastdisc.json` on Linux).

---

## How It Works (Under the Hood)

1. **Polling**: The watcher runs in the background, waking up every 2 seconds.
2. **Detection**: It checks optical drive and removable media paths for the presence of `lastdisc.json`.
3. **Launch Handoff**: It reads the `app_id` and triggers the Steam client protocol handler (`steam://rungameid/<app_id>`). LastDisc never executes binary files from the disc itself, satisfying safety requirements and working on `noexec` mounts.
4. **Lock Mechanism (Debouncing)**: Upon launch, LastDisc creates a lock file (e.g., `620.lock`) in a temporary workspace. While this file exists, it will not launch the game again. Once the disc is ejected (and `lastdisc.json` is no longer found), the watcher clears the lock files, prepping the system for the next insert.
