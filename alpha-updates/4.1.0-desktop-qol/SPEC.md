# Desktop polish and quality of life

Run this **after the Electron app works** (`alpha-updates/electron-app`). Small, high-value features that make Cardable feel like a finished desktop product, plus the resize behavior that also prepares the game for phones later.

**Read first:** `AGENTS.md`, `Designs.MD`, the Electron app code and its `Cardable.native` bridge, the settings system, the dev menu command palette, the quality tiers and the strobing profile helper.

## 1. Rules

- **Additive.** New features sit behind optional hooks; the browser version keeps working. Native-only features appear only when `Cardable.native` exists.
- **Save changes are additive only** (optional fields, no schema bump). Settings additions go in the Settings schema as new entries.
- Monochrome UI; classic scripts in the game; no new libraries; offline.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE small logic check, `Cardable.dev.checkQol()`, run once at the end of the last milestone: the UI scale function returns the documented values for sample window sizes, the keybinding registry has no duplicate bindings, the command palette fuzzy matcher ranks sample queries correctly, and "while you were away" computes correctly from sample timestamps. Under 1 second, never automatic. Otherwise open the game once and confirm the changed feature works with no console errors.

## 2. Milestone A: resizing keeps everything the same

Goal: resize, maximize, fullscreen, move between monitors, change display scaling, all without anything resetting or breaking.

- **Scale-to-fit UI.** Design resolution 1920 x 1080. Compute `--ui-scale = clamp(min(width/1920, height/1080) * userScale, 0.62, 1.6)` and apply it once at the root with the most robust method for Chromium (for example CSS `zoom` on a single root wrapper, or root font-size with rem-based sizing; choose what keeps text crisp and hit-testing correct). The layout must look **proportionally identical** at any window size at or above the minimum. On ultrawide or very tall windows, keep the 16:9 composition centered with the dark background extending (no stretching; the dot grid fills the whole window).
- **Safe areas:** CSS variables for the title-bar inset (desktop) and for notch/home-indicator insets (`env(safe-area-inset-*)`, zero on desktop), used by every edge-anchored element. Layout code never reads `window.innerWidth` directly for sizing; it uses the scale/safe-area variables.
- **State survives resize.** Resizing must **not** restart or reset: an opening sequence, a cutscene, the hold, the cut path, an open inventory sheet (and its scroll position and selected card), the detail view, the studio, the settings panel, toasts, the pack timer animation, card tilt. Coalesce resize handling in one `requestAnimationFrame`, and update canvases (dot grid, WebGL cutscene and studio renderers) by resizing their buffers in place without recreating contexts or restarting animations. Keep 60 fps during live drag-resize.
- **DPR changes** (moving between monitors, changing Windows scaling) re-render canvases at the new pixel ratio without a flash.
- **User UI scale:** Settings > Desktop "Interface size" (Auto, 90 %, 100 %, 110 %, 125 %, 150 %), plus `Ctrl/Cmd +` `Ctrl/Cmd -` `Ctrl/Cmd 0` as custom shortcuts (the browser zoom stays disabled). Saved in settings.
- **Aspect lock:** optional setting "Lock window to 16:9" using Electron's aspect ratio API (native only).
- Test sizes to verify manually: 1100x680 (minimum), 1280x720, 1366x768, 1920x1080, 2560x1440, 3840x2160, 3440x1440 ultrawide, and portrait 800x1200; at 100 %, 125 % and 150 % Windows scaling.

## 3. Milestone B: window and taskbar life

- **Taskbar progress:** show the next-pack countdown as a taskbar progress bar (`setProgressBar`), full when a pack is ready (indeterminate-free), cleared while the app is closed.
- **Pack-ready cues when unfocused:** a small overlay badge on the taskbar icon (Windows) and a gentle `flashFrame` once (not repeating), cleared on focus.
- **Jump list / tasks (Windows):** "Open inventory", "Open settings", "Open saves folder" (`setUserTasks`), which deep-link into the app through a command-line argument handled by the single-instance handler.
- **Pin and Mini mode:** an "Always on top" toggle in the right-click menu and Settings. **Mini mode** (hotkey `Ctrl/Cmd+M` and a menu item): a small frameless window (about 320 x 440) showing only the next pack (its real skin), the countdown and an Open button; it remembers its position; double-click restores the full window. Opening a pack from Mini mode expands to the full window for the opening.
- **Battery saver:** use `powerMonitor` to detect battery power; setting "Battery saver" (Off, Auto): on battery, drop the effects quality one tier and cap heavy canvases, with one quiet toast; restore on AC. Also prevent display sleep (`powerSaveBlocker`) while a cutscene or the studio is active.
- **Focus rules:** pause animation loops, the dot grid and the studio render loop when the window is minimized or fully occluded (but keep the pack timer ticking by timestamp).
- **Multi-monitor:** fullscreen uses the display the window is on; if the saved display is missing, fall back to the primary display.

## 4. Milestone C: tools and shortcuts

- **Game command palette** (`Ctrl/Cmd+K`, also `/` for search): data-driven registry `Cardable.commands.register({ id, label, aliases, group, hotkey, run, when })`. Built-in commands: open pack, inventory, achievements, history, settings; go to card (fuzzy search by name, tier, variant); sort and filter changes; toggle settings (dot grid, mute, interface size); export save; open saves folder; restore backup; replay tutorial; toggle fullscreen; Mini mode; check for updates; copy diagnostics; report a bug. Recent commands on top; glass panel, keyboard only; reuse the dev palette component if it exists.
- **Shortcuts overlay** (`?` or `F1`): a glass sheet listing every key from a single keybinding registry (Space, R, I, S, F, H, Ctrl+K, F11, F2...), grouped by context, with the registry also driving tooltips.
- **Screenshots (native):** `F2` captures the app window to `Pictures/Cardable/` as a PNG using the webContents capture, with a thin shutter vignette dip (never a flash) and a toast with "Show in folder". The card detail view gets **Copy card image** and **Save card image** (capture exactly the card's rectangle, transparent corners preserved when possible). Emit `ui:screenshot` for achievements and the journal.
- **Drag and drop:** dropping an exported save file anywhere starts the existing import flow with its preview and confirm; dropping anything else shows a quiet "Can't use that file" toast.
- **Focus mode:** `H` toggles hiding all UI except the pack and counter (like the idle fade but persistent), with a faint "H to show UI" hint on first use.
- **Controller basics (optional if time allows):** Gamepad API: hold A to charge, left stick to cut, B/Y for back and Keep, bumpers cycle cards, d-pad moves focus in menus; a small on-screen glyph set appears when a controller is connected.

## 5. Milestone D: friendly app behavior

- **While you were away:** on launch (and when returning after more than 30 minutes), a small glass panel: "2 packs ready", time away, and the next pack in a mini countdown, with one Open button; dismisses on any input.
- **What's new:** after the version changes, show a glass panel once with the entries for the new version from `CHANGELOG.md` (bundle the changelog into the app at build time; render headings and bullets), plus "Open full changelog".
- **Updates:** Settings > About "Check for updates". Config `updates.mode`: `'link'` (default; opens the project's Releases page, because the repository may be private) or `'github-public'` (reads the public Releases API and compares versions). Never embed tokens.
- **Report a bug:** opens the project's GitHub new-issue page with the bug template, title prefilled and a trimmed diagnostics block (versions, platform, GPU feature status, quality tier, last log lines, no save contents) in the body; also offers "Copy diagnostics". Configure the repo URL in one place.
- **Logs folder:** a Settings entry to open it. **Safe mode** relaunch button (disables hardware acceleration and sets quality to Low for that session).
- **First-run polish:** the native import panel (from the Electron spec) comes after a one-time "Welcome to Cardable Desktop" step that explains where saves live and how backups work (3 short lines).

## 6. Quality tiers and reduced motion

New UI animations follow the existing tiers (High full motion; Medium lighter; Low fades; Very Low none) and reduced motion (opacity only).

## 7. Settings additions

Desktop group: Interface size, Lock to 16:9, Battery saver, Always on top, Taskbar progress, Focus mode default, Controller support, plus the options above.

## 8. Milestones (stop at a clean one, commit, list what is unfinished)

- **A:** resizing and scaling (section 2), the check.
- **B:** window and taskbar life (section 3).
- **C:** command palette, shortcuts overlay, screenshots, drag and drop, focus mode (section 4).
- **D:** away panel, what's new, updates link, bug report, logs, safe mode, first-run step, controller basics if time allows (section 5).

## 9. Manual checks

1. Resizing in all the listed sizes keeps the composition identical; during an opening, a cutscene, the inventory and the studio, resizing never restarts anything.
2. Moving between monitors or changing display scaling re-renders sharply without resets.
3. The taskbar shows the pack progress; the badge and flash appear when ready and unfocused; jump-list tasks open the right screens.
4. Mini mode shows the real pack and countdown, remembers its place, and expands for opening.
5. Battery saver lowers quality on battery and restores on AC.
6. The command palette finds commands and cards; shortcuts overlay matches the real keys.
7. F2 and Copy card image produce correct images with the exact card.
8. Dropping a save file imports through the confirm flow.
9. The away panel, what's new, update link and bug report open correctly.
10. No console errors; the browser version is unchanged apart from non-native features being hidden.

## 10. Out of scope

Auto-update, code signing, mobile layouts (this update only prepares for them), sound, trading and market.
