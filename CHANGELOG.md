# Cardable changelog

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
