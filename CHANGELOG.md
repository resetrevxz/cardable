## 1.2.2-beta.1 — Clouds and crimson cave (unpublished local preview)

- Replace Ascendant’s repeated cave/crystal/water story with nine seconds of accelerating spatial cloud flight and a continuous 1,600 ms white-cloud dissolve into the prismatic sigil.
- Keep the clock, title, aurora, one authored finale flash, direct flip and shared pastel card field. Normal is now 28.1 seconds including the card scene; Short remains 16.5 seconds.
- Correct the cloud render-target binding so every frame displays the current flight rather than a stale offscreen image.
- Enrich Mythical’s red-black cave with rounded fractured stone masses, denser relief, 18/30 rooted crystal groups, extra ruby offshoots, triplanar mineral/normal material and ceiling drips. Preserve its 28-second story and living card backdrop.
- Reuse the shared native engine, post stack, scheduler, safety and skip. Ascendant no longer allocates cave meshes, crystal materials, water reflection, surface simulation or tendril buffers.

Local preview only, unpublished by owner request. Procedural assets, offline classic scripts, bounded quality presets and original gameplay/save identity remain. No new audio, network dependency or flash.

# Cardable 1.2.1 — Crystal worlds polish

- Rebuild Mythical’s cave with deeper rock relief, wet highlights, depth-layered ruby clusters and ceiling-rooted sway.
- Give the hero crystal a clear tipping pause, solid falling chips, a smoother following camera and darker reflected splash/ripples.
- Begin Ascendant in a spatial cloud flight with accelerating travel, restrained camera shake and a sustained white arrival into its original crystal/ritual animations.
- Reuse the shared engine, post-processing, timelines, safety, skip and retained card backgrounds; refine the procedural Canvas fallbacks.

Existing story durations, card handoffs, rewards, pulls, serials and saves remain unchanged. No extra flash, external asset, runtime network request or audio.

# Cardable 1.2.0 — Fixes and visuals

- Credits now wakes on proximity/focus and short reward feedback, then hides when away or inactive.
- The closed inventory pull-up fades after five seconds; open browsing stays open. Header typography and quick-filter counts are cleaner.
- Repair tutorial progression for cinematic/direct flips, recovery, replay, responsive instructions and accessible Skip placement.
- Add Simple FPS-only and Advanced performance display modes, plus an explicit Unlimited game cap.
- Retire Card History UI and recording while preserving existing saved history and archived source.
- Add fluid, quality-aware hover feedback, contextual keycaps and panel help across browsing, Settings, Studio and Album.

Offline scripts, card pulls, serials, variants, pack consumption, rewards, app identity and save schema remain unchanged. Browser/display cadence still bounds Unlimited. No audio is added.

# Cardable 1.1.0 — Director Rework

- Publish the Director A–E features already integrated on main: scene authoring, preset libraries, editable animation, camera paths, grading/refinement and expanded Deliver/Album tools. Final F/export/accessibility acceptance remains pending.
- Turn the public gallery into a continuous reversible scroll journey with actual pack/card/material/rarity presentation and working catalog/Record controls.
- Add dedicated Download, Collection, Worlds and Game pages, honest installation/update/backup guidance, keyboard access and calm/static fallbacks.
- Preserve root and legacy website index.html, game/test sources, app identity and saves. Exclude the incomplete 1.0.3 branch. Current builds remain unsigned.

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
