# LastDisc — Project Plan

## 1. Problem statement

Insert a physical disc, whose label/appearance matches a Steam game. While Steam
is running, a background watcher detects the disc, reads a manifest identifying
the game, and launches it through Steam (`steam://rungameid/<appid>`) with no
manual clicking beyond inserting the disc.

**Non-goals for this project:**
- Bypassing Steam DRM/ownership checks (the game must already be owned and
  installed — this only automates the *launch trigger*, not licensing).
- True zero-interaction boot-time execution before a user is logged in
  (rejected earlier for both OSes — Session 0 isolation on Windows, root/user
  session separation on Linux — not worth the privilege-escalation surface).
- Supporting arbitrary non-Steam executables. v1 targets Steam AppIDs only.

## 2. Shared design contract (defined once, used by both platforms)

**Manifest file:** `lastdisc.json` at the disc root.
```json
{
  "app_id": "12345",
  "title": "My Game",
  "version": "1.0"
}
```
- Detection is based on **file existence + contents**, never on the volume
  label — labels are cosmetic strings, trivially duplicated across discs.
- **Launch mechanism:** always `steam://rungameid/<app_id>` — this hands the
  actual DRM/ownership check to the already-running Steam client rather than
  trying to execute anything from the disc directly.
- **Debounce:** a lock file per AppID, cleared once the disc is no longer
  present, so re-inserting the same disc relaunches cleanly and a stuck disc
  doesn't relaunch the game every poll cycle.
- **Detection method:** polling every ~2s, not event-driven APIs
  (`udev`/D-Bus on Linux, `RegisterDeviceNotification` on Windows). Disc
  insertion isn't latency-sensitive, and event APIs are meaningfully more
  code for a race-condition-prone payoff at this scale.

## 3. Architecture — Linux

| Layer | Choice | Why |
|---|---|---|
| Run context | systemd **user** unit (`~/.config/systemd/user/`) | Inherits the logged-in session's `DISPLAY`/`DBUS_SESSION_BUS_ADDRESS`, so it can actually reach the running Steam client. A system-level (root) service cannot. |
| Detection | Poll `/run/media/$USER/*` and `/media/$USER/*` for `lastdisc.json` | Covers the common auto-mount locations across distros without depending on a specific DE's autorun implementation. |
| Execution | Never `exec()` anything on the disc itself | Removable media is frequently mounted `noexec`; the watcher only *reads* the manifest and calls `steam`, which lives on local disk. |
| Autostart | `systemctl --user enable --now` | Starts once the user logs in — matches when Steam itself would be available anyway. |

## 4. Architecture — Windows

| Layer | Choice | Why |
|---|---|---|
| Run context | Scheduled Task, `AtLogOn` trigger, **Limited** run level | A true Windows Service runs in Session 0 with no desktop and cannot reach the user's Steam process. A logon-triggered task at normal user privilege inherits the interactive session. |
| Detection | Poll `Win32_LogicalDisk` where `DriveType=5` (CD-ROM) for `lastdisc.json` | WMI/CIM query is stable across Windows versions; avoids writing a hidden-window message pump just to receive `WM_DEVICECHANGE`. |
| Execution | `Start-Process "steam://..."` only — never run anything from the drive letter directly | Matches the Linux principle: hand off to Steam's URI handler, don't execute disc content. |
| Autostart | `Register-ScheduledTask` with `-RunLevel Limited` | Explicitly **not** elevated — elevation is what breaks session inheritance here, the opposite of "more reliable." |

## 5. Build phases

**Phase 0 — MVP (this deliverable):**
Polling watcher, manifest read, single-AppID launch, lock-file debounce, basic
install/uninstall scripts per OS. No UI, no logging beyond stdout, no
multi-disc handling.

**Phase 1 — Hardening:**
- Structured logging to a file (not just stdout) for headless debugging.
- Handle multiple optical/USB devices present simultaneously.
- Config file for poll interval / media root overrides instead of hardcoded values.
- Graceful handling of a malformed or partially-written manifest (disc still
  spinning up).

**Phase 2 — Quality of life:**
- Optional system tray icon (Windows) / AppIndicator (Linux) showing watcher
  status and last detected disc.
- Checksum field in the manifest, verified before launch, to guard against a
  disc being relabeled/edited outside your control.
- Support a small local library of known AppIDs with cover art shown briefly
  before launch (nice-to-have, not required for function).

## 6. Risks & limitations

- **[Certain]** No genuinely automatic, zero-click disc-insert-to-launch
  exists on either modern OS without a logged-in session already active —
  both Windows AutoPlay and Linux DE autorun require either a click or a
  pre-configured trust setting, and neither survives a true "before login"
  boot state without reintroducing the Session 0 / root-session problem.
- **[Certain]** Anything resembling "background process reacts to inserted
  media and executes code" is a pattern EDR/antivirus heuristics watch for.
  Keep this unsigned-script-based approach off machines with strict endpoint
  policies, or expect it flagged.
- **[Likely]** Multiple discs with the same AppID but different physical
  media will work identically (that's a feature) — but two different discs
  present at once with no clear priority order is undefined behavior in this
  MVP; Phase 1 should decide first-found-wins vs. explicit priority.

## 7. Testing checklist

- [ ] Insert disc while Steam is running and logged in → game launches once.
- [ ] Remove and re-insert same disc → relaunches (lock cleared correctly).
- [ ] Insert disc with malformed/missing `app_id` → watcher logs, doesn't crash.
- [ ] Reboot machine, log in normally → watcher starts automatically, no
      elevation prompt.
- [ ] Confirm the scheduled task / systemd unit is running as the normal user,
      not SYSTEM/root (`Get-ScheduledTask` principal / `systemctl --user status`).
- [ ] Steam **not** running at disc insertion → confirm current behavior
      (likely: URI launch starts Steam itself, then the game — verify this
      is actually true on your Steam version before relying on it).
