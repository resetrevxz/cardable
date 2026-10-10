# 1.2.0: Controls

Part 3 of 4 of the 1.2.0 release. The default controls stay the same. What changes: **every action becomes remappable**, Director mode gets full keybinds, and Settings grows a large set of new options with an **Advanced mode** (hide or disable almost any GUI except the card). No tutorial remake.

Run as **one task** with one checkpoint. **Version rule:** do not change any version; append to `## Unreleased (1.2.0)` (see `alpha-updates/1.2.0-PLAN.md`).

**Read first:** `AGENTS.md`, the rewritten `Designs.MD` and the UI kit from the One Cardable update, `alpha-updates/1.2.0-PLAN.md`, the settings system and its schema-driven screen, every place that currently handles keyboard input (grep for `keydown`, `keyup`, `addEventListener('key`), the studio shortcuts, the command palette and context menu, the Electron main process (frame rate, window options), and the cutscene and opening state machines.

## 0. Rules

- Build on the schema-driven Settings shell; add data, not new one-off UI. If the One Cardable update is not merged yet, stop and say so.
- Defaults must equal today's behavior exactly (current keys, current options). Nothing changes for a player who touches no setting.
- Settings save additively under `save.settings` (new optional keys); existing saves keep working; no schema bump.
- Quality tiers, reduced motion, strobing profile and the minimal testing policy apply.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE logic check, `Cardable.dev.checkControls()`, run once at the end: the keybinding registry detects conflicts per context, rebinding and reset round-trip, every default binding matches the original key, the visibility rules never leave the player without a way to reopen Settings, and settings presets apply and revert exactly. Under 1 second, never automatic. Otherwise open the app once, exercise each new feature, confirm no console errors, stop.

## 1. Keybinding registry (all inputs)

- **One registry:** `Cardable.keys.register({ id, label, group, context, defaults: ['Space'], when, run })` and a single dispatcher that owns keyboard handling. Convert every existing key handler (menu, opening, inventory, detail view, settings, achievements, studio, command palette, mini mode, overlays) to register through it. Behavior stays identical.
- **Contexts:** global, menu, opening, inventory, detail, settings, studio (with sub-contexts: viewport, timeline, library), cutscene, dialogs. Bindings are unique **per context**; conflicts between contexts that can be active together are flagged.
- **Features:** primary and secondary binding per action, modifiers (Ctrl/Cmd, Shift, Alt), `KeyboardEvent.code` based so layouts work, `Escape` and a few system keys reserved, "press a key" capture UI with conflict detection and a swap/clear choice, hold-vs-tap actions (such as the pack hold) remain hold actions, per-binding reset, **Reset all**, search, **export/import bindings** as JSON.
- **Keybinding presets:** Default, One-handed (common actions near the mouse hand), Compact (fewer keys). Presets apply on top of the registry and can be reverted.
- **Everything reads from the registry:** tooltips, the shortcuts overlay (`?` or `F1`), the command palette, help text, the tutorial's key labels, hint keycaps (such as `Space` near the pack) and menus show the **current** bindings.
- **Emergency access:** `Ctrl+,` always opens Settings and cannot be unbound; `Esc` always closes the topmost layer; a launch flag `--reset-controls` restores default bindings.

### Actions to register (minimum; match the current keys as defaults)
- **Global:** open settings, command palette, shortcuts overlay, help mode, performance overlay cycle, fullscreen, focus mode, mini mode, UI scale up/down/reset, screenshot, open inventory, open achievements, open patch notes.
- **Menu and opening:** hold to open pack, claim/keep card, tear (fallback), skip cutscene, flip card, inspect, cycle packs, open pack (auto-charge) if present.
- **Inventory and detail:** previous/next card, favorite, delete, search, sort cycle, filter toggles, flip card, inspect, replay cutscene, copy serial, open tags.
- **Director mode (all of it):** select, move, rotate, scale, camera tools, frame selected, frame card, orbit view presets (front, side, top, perspective/ortho), toggle Simple/Pro, toggle guides, shading modes, add light, add prop, duplicate, group/ungroup, delete, hide, lock, isolate, undo, redo, copy, paste, play/pause, step frame, shuttle, set in/out, add marker, insert keyframe, auto-key, next/previous keyframe, photo, render, record, switch page tabs (Set, Light, Camera, Animate, Look, Deliver), preset browser, library search, exit.
- Studio actions are registered in the `studio` context with their own conflict rules.

## 2. Settings: new structure and Advanced mode

Using the schema-driven shell, add (all rows have a one-line helper, a reset, and help text):

- **Mode switch:** Simple (default) and **Advanced**. Advanced reveals rows flagged `advanced: true` and the new groups below. Switching never loses values.
- **Controls group:** the keybinding editor (section 1), presets, export/import.
- **Settings profiles (one click):** Default, Performance, Cinematic, Minimal, Accessibility; each applies a defined bundle of settings, can be undone, and shows what changed before applying.
- **Interface visibility group (Advanced):** a list of switches to **hide** almost any GUI element except the card: wordmark, credits chip, pack counter and stock vials, timer text, inventory arrow, achievements button, help buttons, tooltips, tags, toasts (by type), performance overlay, version label, context-menu hint, dot grid, cursor glow, idle-fade behavior, tab/title decorations, mini-mode button, Electron desktop controls. Presets: **Minimal** and **Zen** (only the pack and the card). **Safety:** hiding must never remove the last way to reach Settings: `Ctrl+,` and the context menu remain, with a one-time warning; a "Reset interface" button and `--reset-controls` restore visibility.
- **Animation and effects group (Advanced):** individual switches or levels for hover animations, card tilt strength, idle fade delay, pack swap animations, variant evolve animation (Full, Short, Off), tag animations, UI animation speed multiplier (0.5x to 1.5x, UI only, never cutscenes), reduce transparency (solid surfaces instead of blur), high contrast UI, larger text.
- **Cutscene skip group:** for **each rarity cutscene** (Mythical, Ascendant, Secret and any others): `Play` / `Short` / `Skip`. A **Skip all cutscenes** switch (cards are still revealed normally). Optional "Play every cutscene once, then use my setting". Skipped cutscenes jump straight to the card reveal without the animation; the pull and rewards are identical. The strobing setting (Safe/Full) stays separate.
- **Display and performance group:**
  - **UI scale:** a slider from 70 % to 150 % in 5 % steps (including **small** sizes) plus quick presets (Small 85 %, Normal 100 %, Large 115 %); applies live; the layout must hold at 70 %.
  - **Frame rate cap:** 30, 60, 90, 120, 144, 165, 240, **Unlimited**. A shared frame scheduler enforces the cap for the game's loops; in Electron, **Unlimited** also needs the launch switches that remove the browser frame limit and vsync, applied after a restart with a "Restart now" button and a plain warning about heat and battery. Battery saver (existing) overrides the cap when on battery. Show the current effective cap.
  - Quality tier, resolution scale for heavy canvases, hardware acceleration (existing), performance overlay mode.
- **Gameplay behavior group:** hold time (Normal 3 s, Short 2 s, Quick 1 s; this changes the hold duration for all packs and is stored with the pull commit logic untouched), **toggle-to-hold** (press once to start charging, press again to cancel, for players who cannot hold a key), confirm-before-delete on/off for **low tiers only** (the Legendary+ typed confirmation can never be disabled), default inventory sort and view, startup behavior (menu or last screen), default tag mode (compact, semi-open), reveal speed (existing), cut assist (existing).
- **Formats group:** 12 or 24 hour time, date format, number format (full or abbreviated).
- **Notifications group (Electron):** pack ready, daily items (placeholder for later), sound-ready placeholders disabled until audio exists.
- **Accessibility group:** reduce motion (existing), reduce transparency, high contrast, larger text, focus ring emphasis, toggle-to-hold (above), screen-reader announcements for key events.
- Every setting is searchable (name and aliases), deep-linkable, and has a per-row reset; changed rows are marked; **Restore defaults** works per section.

## 3. Director mode keybinds and settings

- Every studio shortcut is in the registry (section 1) with conflict handling inside the studio contexts.
- Studio settings (Advanced): default mode (Simple or Pro), viewport navigation scheme (the game's default, Blender-like, or Figma-like), gizmo size, snapping defaults, auto-key default, autosave interval, default render quality, remember last page, help hints on or off.

## 4. Implementation notes

- Keep one place that decides whether a key event is handled (focus in text inputs, composition events, held keys, repeat) so behavior is consistent everywhere.
- Frame scheduler: a single `Cardable.frame` module that drives requestAnimationFrame consumers with the cap; heavy loops (dot grid, studio, cutscenes) subscribe to it. Do not break existing loops; migrate them carefully.
- Visibility settings are applied through data attributes on the root (`data-hide-credits`, etc.) so CSS handles them without JavaScript per element.
- Settings presets and profiles are data.

## 5. Checkpoints

- **Checkpoint 1:** the keybinding registry, conversion of every handler, the keybinding editor, presets, overlay/palette/tooltips reading bindings, Director binds, the logic check for keys. Commit.
- **Checkpoint 2:** Advanced mode, interface visibility, animation and cutscene skip options, display and performance settings (UI scale, frame cap, unlimited), gameplay behavior, formats, accessibility, settings profiles, import/export, the logic check for settings. Commit.

## 6. Manual checks

1. Every default key behaves exactly as before; rebinding works in each context; conflicts are flagged; reset works; the shortcuts overlay, tooltips and tutorial show current bindings.
2. All Director mode actions can be rebound; navigation schemes work.
3. Advanced mode reveals the extra rows; hiding UI elements works; Zen shows only the pack and card; the player can always reach Settings.
4. Cutscene options (Play, Short, Skip, Skip all) behave; the card and rewards are identical.
5. UI scale 70 % to 150 % keeps layouts intact; the frame cap works; Unlimited requires a restart and works in Electron.
6. Hold-time options and toggle-to-hold work with all opening styles; the Legendary+ delete confirmation cannot be disabled.
7. Profiles apply and revert; settings export/import works.
8. No console errors; the browser build still works.

## 7. Out of scope

The tutorial remake (the tutorial only reads key labels from the registry), gamepad support, sound, Discord, the visual overhaul, the shop, trading, the market, mobile.
