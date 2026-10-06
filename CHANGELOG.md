# Cardable 1.0.1 — Cinematic public website

- Rebuild the download page as nine authored scenes using actual card, pack, finish and cinematic renderers.
- Add an interactive 24-card demo collection, sample provenance, mobile framing and static/calm fallbacks.
- Gate Pages on published matching installer/whole-folder assets and dispatch it after release.
- Preserve game behavior, app identity and saves. Builds remain unsigned; installation/updater acceptance is pending.

# Cardable 1.0.0

- Start the public version series at v1.0.0 while preserving the existing game, app identity and save schema.
- Add the public Cardable download site, Windows installer and complete Electron folder ZIP.
- Configure GitHub Releases and installed-app update hosting; publish a versioned release after each completed update.
- Add repository guidance, issue/PR templates, source integrity checks and Pages/release workflows.
- The first public build is unsigned; existing 4.x installations require the new installer once. See changelog/1.0.0.md for install and acceptance limits.

# Cardable changelog

## 4.2.0 — Desktop delivery, help and recovery

- Prepare automatic installed-app update checks, background downloads and save-gated installation on normal quit once a public release source is configured.
- Add Restart and update now, Skip update on this quit, persistent update errors/retry and preview/shutdown exclusions.
- Require trusted timestamped Windows signatures for public CI releases; support certificate/store, Azure and provider-specific signing hooks without bundling credentials.

- Welcome offers Start playing and optional confirmed browser-save import.
- Bundled Settings/palette help explains gameplay, shortcuts, four graphics tiers, saving, separate Studio-photo downloads and desktop recovery.
- Unreadable saves retain their originals and pause writes/pack opening until an explicit recovery choice; startup/storage failures get plain guidance.
- The Windows x64 installer uses one-click per-user setup, normal shortcuts, manual app-close guidance and retained player data.
- Local delivery validates installer/preview/shortcut hashes and promotes transactionally before pruning exact owned superseded artifacts.
- Current docs are consolidated; historical evidence is archived with provenance and unresolved acceptance stays visible.
- Existing rendering optimizations, game rules, save schema and storage identity are preserved. Public hosting/live updates/signing remain unconfigured; local build validation is not broad runtime or hardware certification.

## 4.1.1 — Graphics and desktop performance

- Stop the layout resize feedback loop that repeated geometry, canvas and inventory work every display frame.
- Keep real window resizing and display-scale changes responsive while skipping unchanged geometry and window-position notifications.
- Skip repeated native pack/taskbar updates when stock is full, and avoid rebuilding unchanged Mini pack surfaces.
- Apply independent graphics choices in Mini mode, including reflections, particles, materials and shadows.
- Verify all four presets, Mini skins, background sleep/refill, desktop restoration and offline save behavior.
- Retain the integrated inventory, shaded Settings and cinematic renderer optimizations with the same game rules and save schema.

## 4.1.0 — Desktop polish

### Window and interface
- Scale-to-fit desktop composition, saved interface size and optional 16:9 lock.
- Taskbar countdown, pack-ready cues, Windows tasks, pinning and real-skin Mini mode.
- Battery-aware effects and visibility-aware rendering without changing saved quality.

### Tools and collections
- Search commands and collected cards with Ctrl/Cmd+K or /; view shortcuts with F1 or ?.
- Persistent focus mode, safe save dropping and native window/card image capture.
- Card History lives beside Achievements in the inventory, with its timeline and charts intact.

### Friendly desktop
- Welcome/import guidance, away summaries and this one-time version panel.
- Manual release links or public release checks, private diagnostics and bug-report scaffolding.
- Safe-mode relaunch and shortcuts to saves and logs; no save-schema or audio changes.

## 4.0.0 — Electron desktop

- Secure main/preload separation, native backups and graceful shutdown.
- Desktop window persistence, packaging and release infrastructure.
