# LastDisc

Insert a disc. Launch a game. No disc drive DRM tricks, no license bypass —
just a background watcher that notices a game disc and hands the launch off
to Steam's own URI protocol.

Sony has announced it will [stop pressing physical discs for new PlayStation
games starting January 2028](https://techcrunch.com/2026/07/01/sony-to-end-physical-playstation-game-discs-in-2028/).
LastDisc doesn't reverse that — nothing running on one machine can — but it
means the *ritual* of a physical disc triggering a game doesn't have to
disappear just because the industry's moving away from pressing them.

---

## The Concept

LastDisc is built to preserve the physical ritual of console gaming on PC. By burning a simple, tiny metadata file (the manifest `lastdisc.json`) to an optical CD/DVD or loading it onto a USB flash drive, you can slot your physical media in to immediately boot up your digital Steam library. 

It gives your shelf of games tangible meaning without requiring custom drivers, cracks, or complex emulation.

For detailed, step-by-step setup instructions on Windows and Linux, check the **[LastDisc Setup & Installation Guide](guide/README.md)**.

---

## Why It's Built This Way

- **Runs as a user process, not a system service.** A root/SYSTEM-level service can detect the disc fine but can't reach your desktop session to actually launch anything (Session 0 isolation on Windows, the equivalent root/user session split on Linux). LastDisc runs via a systemd **user** unit on Linux and a **Limited**-privilege Scheduled Task on Windows — both inherit your interactive session correctly.
- **Never executes code from the disc.** Removable media is frequently mounted `noexec`, and "background service executes code from inserted media" is exactly the pattern antivirus/EDR heuristics flag. LastDisc only reads a manifest and calls the Steam URI handler, which lives on your local disk.
- **Detects by file, not by label.** Volume labels are cosmetic strings anyone can set on any disc. Detection is based on the manifest's actual existence and contents.

---

## Project Status

MVP (Phase 0). No structured logging, no multi-disc priority handling, no checksum verification yet — see the Risks & Limitations section of `PROJECT_PLAN.md` before relying on this for anything beyond personal use.

## License

MIT License. Feel free to copy, modify, and distribute this software as needed.
