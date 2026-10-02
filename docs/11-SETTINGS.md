# 11 — Stage 11: settings

Stage 13 graphics and performance controls supersede the three-preset graphics section below. See [GRAPHICS-UPDATE.md](GRAPHICS-UPDATE.md) for the current matrix and behavior.

A quiet glass panel with a small set of useful settings, safe data tools, and a few well-made interaction details. Quality over quantity: no theme colors, no per-effect sliders, no market, no language picker.

Split into two runs, one session each:

- **11a — Engine, panel and settings** (sections 1-5, 7-9)
- **11b — Data tools** (section 6): export, import, reset, restore, with the confirmation interactions

Supersedes the older "settings corner" notes in `docs/05-MAIN-MENU.md` and `docs/04-PACK-OPENING.md` where they differ.

---

## 1. Principles

1. **Instant apply.** No Save button. Every change takes effect immediately and is visible behind the panel.
2. **Safe by design.** The more destructive an action, the harder it is to trigger by accident (three confirmation levels, section 6).
3. **Everything has a default** and a "Restore defaults" for the settings themselves.
4. **Settings never block the game.** If storage fails, settings still work for the session.
5. Same design system as the rest of the game: glass recipe, springs, mono for values, Inter for labels, black/white/gray only.

## 2. Entry and panel

- **Gear icon** (inline SVG, same stroke as the arrow) at the top-right next to the currency. It fades with the rest of the UI after the idle delay and returns on movement. Hover: rotates 30 degrees with `--ease-out`. Click or `S` opens the panel; `Esc` or the gear closes it.
- **Panel:** glass sheet, 420 px wide (full width minus 24 px margin below 520 px), slides in from the right with the sheet spring (stiffness 220, damping 26). The menu behind scales to 0.98, blurs about 4 px and dims about 25 %. The dot grid stays faintly visible through the glass.
- **Layout:** header ("Settings", close button), a **live preview card** (section 5.6), then the groups in order: Motion and effects, Cards, Controls, Sound, Data, About. Group titles are mono, small, dim, and stick to the top while scrolling. Each setting is one row: label (Inter), helper text (dim, one line), control on the right.
- **While open:** pack opening input (Space hold) is blocked, and the idle fade is paused. If an opening sequence is running, the gear is disabled with a tooltip "Finish opening first". If the panel is open when a pack becomes ready, nothing interrupts it.
- **Focus:** trap focus inside the panel, restore it to the gear on close. All controls reachable by Tab with visible focus rings.
- **Saved indicator:** a tiny mono "Saved" with a check at the footer that fades in 200 ms after any change and out after 1.2 s.

## 3. Settings

Defaults in **bold**. Stored in `save.settings` (section 7).

### Motion and effects
| Key | Options | Behavior |
|---|---|---|
| `motion` | **Auto** / On / Off | "Reduced motion". Auto follows the system `prefers-reduced-motion`. On uses the reduced-motion behavior everywhere. Off ignores the system preference. |
| `quality` | **High** / Medium / Low | See the matrix in section 4. A quiet performance nudge may offer Medium (section 5.7). |
| `dots` | **On** / Subtle / Off | Subtle: max alpha x0.5, influence radius x0.8, no lean, no trail, ripples at 50 %. Off: the canvas is removed and its loop stops. Pack-hold pulses always remain visible in On and Subtle; with Off they use a simple ring glow instead. |
| `cursorGlow` | **On** / Off | Hides the cursor glow layer entirely when Off (the native cursor is shown). |
| `idleFade` | **2.5 s** / 5 s / Never | Delay before the UI fades. Never keeps all UI visible. |

### Cards
| Key | Options | Behavior |
|---|---|---|
| `rarityColor` | **Color** / Mono | Same as `config.rarityColorMode`; applies live to every card, including the preview. |
| `tilt` | Low / **Normal** / High | Tilt cap 8 / 14 / 18 degrees; spring stiffness scales 0.8 / 1 / 1.15. |
| `revealSpeed` | **Normal** / Fast | Fast multiplies `riseMs` x0.7, `preFlipPauseMs` x0.5, `flipMs` x0.7. Never skips the hold or the cut. Tiers 10 and 11 never go below 60 % of their normal timings, so top pulls still feel special. |
| `serialOnFront` | **On** / Off | Hides the small serial in the front footer. The back always shows it. |

### Controls
| Key | Options | Behavior |
|---|---|---|
| `openKey` | **Space** / Enter | Key for the 3-second hold. The *other* key becomes the action key (Keep, tear fallback, activating buttons). A fresh Space press always Keeps a revealed card regardless of this setting. The key held from charging and repeat events never accept a card. |
| `cutAssist` | **Normal** / Easy | Normal auto-finishes at 80 % span. Easy at 60 %, with stronger path smoothing and a wider tolerance. |
| `keyHints` | **On** / Off | Shows or hides the `Space` and `R` keycap hints. The tutorial always shows the hints it needs. |

### Sound
| Key | Options | Behavior |
|---|---|---|
| `volume` | 0-100 (**70**) | Stored, but the control is disabled with the label "Coming soon" while `config.flags.audio` is false. |
| `muted` | **Off** / On | Same. |

### Data (section 6)
Export save, Import save, Reset save, Restore previous save, Replay tutorial.

### About
Version (`config.version`, mono) and "Credits and licenses" (opens a small glass sheet listing the fonts and their licenses). The owner scrapped the release document; this private-game panel omits its release disclaimer.

### Footer of the panel
"Restore defaults" (settings only, never game data). Uses the click-again confirm (section 5.4) and offers Undo for 8 s.

## 4. Effects quality matrix

| Area | High | Medium | Low |
|---|---|---|---|
| Foil/beam/glare on non-focused cards | lite render | lite render | lite render, no idle shimmer |
| Focused card layers | all 10 | all 10, glare specular at half rate | 10 structural nodes, 7 painted layers: shadow/foil/beam disabled, one body shadow, no brushing |
| Rarity finish animation | 60 fps | 30 fps cap | 15 fps cap, particles removed |
| Backdrop blur | full | 60 % radius | 30 % radius |
| Layered shadows | 3 | 2 | 1 |
| Dot grid influence/ripples | full | max 2 ripples | 1 ripple, no trail |
| Particles (dust, flecks) | full | 50 % | 15 % |
| Sheet and toast glass | blur | blur | solid tinted fill |

Switching quality applies instantly and preserves the current screen.

## 5. Controls and interaction details

### 5.1 Segmented control
Pill track with a sliding highlight (spring, 250 ms). Arrow keys move, Enter or Space selects (inside the panel only). `role="radiogroup"`.

### 5.2 Switch
Glass capsule with a knob that stretches slightly while pressed and lands with a tiny overshoot; a soft light sweep passes across when it turns on. `role="switch"`, `aria-checked`.

### 5.3 Keycap selector (`openKey`)
Two small keycaps (`Space`, `Enter`). The active one is raised and brighter; pressing a key on the keyboard while the control is focused selects it and the keycap depresses 2 px. Show a conflict note if relevant ("Enter will also keep cards").

### 5.4 Click-again confirm (medium risk)
First click: the button label changes to "Click again to confirm" and a thin ring around the button counts down over 3 s. Second click within 3 s confirms. Otherwise it returns to normal. Used by Restore defaults, Import apply, Restore previous save.

### 5.5 Hold-to-confirm (high risk)
Used by Reset save. Press and hold the button (or `Space`/`Enter` while it is focused) for **3 s**. A fluid fills the button from the bottom (same liquid look as the pack charge: soft surface wobble, specks), the label counts "Hold to reset". Releasing early drains it with a small slosh and nothing happens. At 100 % a soft white pulse plays and the action runs. Reduced motion: a plain left-to-right fill bar. Ignore `event.repeat`; abort on blur or `Esc`.

### 5.6 Live preview card
A lite/full card at the top of the panel that reacts to `rarityColor`, `tilt`, `quality` and `serialOnFront` as they change, and tilts to the cursor. It uses the player's most recently kept card, or a fixed demo card if the collection is empty. A tiny tier selector (`<` `>`) cycles its tier so the finishes can be checked.

### 5.7 Performance nudge
If the average FPS stays under 45 for 5 s while `quality = High`, show one quiet glass toast: "Smoother with Medium effects. Switch?" with Switch and Dismiss. Never show it again if dismissed (`save.settings.nudgeDismissed = true`).

### 5.8 Count-up and rolling values
Numbers shown in the panel (volume, version) use rolling digits; toggles never cause layout shift.

---

## 6. Data tools (11b)

All data actions live under **Data**. There are three confirmation levels:

| Level | Meaning | Interaction | Examples |
|---|---|---|---|
| 1 | Harmless, easy to undo | Instant, with an Undo toast for 8 s | Replay tutorial, Restore defaults |
| 2 | Changes data but a backup exists | Click-again confirm, plus an Undo toast for 15 s | Import save, Restore previous save |
| 3 | Destroys progress | Hold-to-confirm (3 s) plus an automatic backup plus Undo for 15 s | Reset save |

### 6.1 Automatic backup
Before any level 2 or 3 action, copy the current save to `cardable.save.backup` with `backedUpAt` and a summary (card count, packs, currency). Only one backup is kept (a new destructive action replaces it). The backup survives page reloads until replaced.

### 6.2 Export save
Button "Export save". It morphs: the label becomes a thin progress line (about 600 ms), then a check mark, and the file downloads as `cardable-save-YYYY-MM-DD.json`. Contents:

```json
{ "app": "cardable", "schemaVersion": 2, "exportedAt": "...", "save": { }, "checksum": "fnv1a-..." }
```
The checksum (a simple hash of the `save` JSON) detects corrupted or hand-edited files. Settings are included in the export.

Stage 11b uses FNV-1a over recursively sorted object keys (array order is preserved). This is an offline integrity check, not cryptographic authentication. Schema-1 exports with a valid envelope/checksum migrate through the existing validator. The older raw save-file API remains for compatibility; the Data panel requires the checked envelope.

### 6.3 Import save
- A glass **drop zone** inside the panel ("Drop a save file here or choose a file"), with a dashed border that brightens on drag-over.
- After a file is chosen: validate (`app`, `schemaVersion` not newer than the game's, checksum, required fields). If invalid, show a plain message inside the zone and change nothing.
- If valid, show a **preview card** with: file date, cards owned (and unique count), packs ready, currency, tutorial done. A level-2 confirm button "Replace my save" (click again to confirm).
- On confirm: automatic backup, apply, re-initialize the game state without a hard reload, close the panel, show the Undo toast "Save imported. Undo".
- Serial counters and player code come from the imported save. Never mix them with the current save.

### 6.4 Reset save
- Button "Reset save" with helper text "Deletes your cards, packs and progress. Your settings are kept." Level 3: hold-to-confirm.
- On completion: automatic backup, create a fresh save (new `playerCode`, 2 starting packs, tutorial not done, settings preserved), return to the main menu with a calm fade, then show the Undo toast "Save reset. Undo".
- The collection, timers, pending reveal and tutorial state are all cleared. Settings remain.

### 6.5 Restore previous save
Visible only when a backup exists: "Restore previous save (from <date>, <n> cards)". Level 2 (click again). It swaps the current save and the backup, so the action itself can be undone once more.

### 6.6 Replay tutorial
Sets `save.tutorial` back to the first step and closes the panel; the tutorial starts. Level 1 with Undo (restores the previous tutorial state).

### 6.7 Failure cases
- Storage unavailable: show an inline note "Your browser is blocking saving. Settings last for this session only." Export still works.
- Backup fails (storage full): block level 2 and 3 actions and say why. Never delete data without a backup.
- Undo after the toast expired: use "Restore previous save" in Data instead.

Import, reset, restore and their Undo adopt state only after the durable main-save write succeeds. A failed main write leaves the previous state active and the backup available. Backup restore follows local-load compatibility for retired owned catalog records; external imports use strict catalog and serial validation. Replay Undo changes only tutorial progress. A stale asynchronous file read cannot reopen a preview after the panel closes.

---

## 7. Settings engine

`src/core/settings.js` (classic script, `Cardable.settings`):

```js
Cardable.settings.get('quality')                // current value
Cardable.settings.set('quality', 'medium')      // validates, saves, applies, emits
Cardable.settings.onChange('quality', fn)       // subscribe
Cardable.settings.resetToDefaults()
```

- Schema with defaults, allowed values and an `apply(value)` function per key, in `src/data/settings-schema.js` (data only, so adding a setting means one entry plus its apply function).
- Stored in `save.settings`: `{ settingsVersion: 1, motion, quality, dots, cursorGlow, idleFade, rarityColor, tilt, revealSpeed, serialOnFront, openKey, cutAssist, keyHints, volume, muted, nudgeDismissed }`. Unknown keys are dropped, invalid values fall back to defaults, missing keys get defaults (this makes future updates safe).
- Apply by setting data attributes on `<html>` (`data-motion`, `data-quality`, `data-dots`, `data-rarity-color`, `data-tilt`) that CSS reads, and by emitting `settings:changed` events that JS modules (dot grid, cursor, card, opening, input) subscribe to.
- `motion = auto` listens to the `prefers-reduced-motion` media query and updates live.
- Events: `settings:open`, `settings:close`, `settings:changed` (`key`, `value`), `save:replaced` (after import, reset or restore) so every module re-reads state.

## 8. Edge cases and accessibility

- Opening the panel during `charging` is impossible (gear disabled). If it opens while a toast is visible, the toast stays.
- `Esc` priority: close the topmost layer (confirm state, then credits sheet, then panel).
- Keyboard: `S` opens settings (ignored while typing or while the opening sequence runs). Do not use Space on the gear.
- Screen readers: `aria-live="polite"` region announces "Saved", import results, hold progress milestones (25 %, 50 %, 75 %, done) and Undo availability. Toggle/segmented controls have proper roles.
- Reduced motion: no springs, plain fades, simple fill bars, no light sweeps.
- Small windows: the panel becomes full width; the preview card shrinks.
- Never reset settings by accident when a save is reset or imported, except when the imported file's settings are explicitly part of the import (they are).

## 9. Out of scope

Accent/theme colors, language, per-effect tuning, account or cloud sync, market settings, audio implementation.

## 10. Acceptance

- Every setting in section 3 changes the game live, persists across reloads, and falls back to its default when the stored value is invalid.
- Quality High/Medium/Low visibly and measurably differ per the matrix, and Low reaches 60 fps on a weak machine in the dev FPS counter.
- Reset save cannot be triggered by a single click, a quick press, a release before 3 s, or the Enter key tapped once; a backup exists after it and Undo restores everything.
- Export then Import round-trips: cards, serials, packs, currency, tutorial and settings all identical. A tampered or wrong file is rejected without changing anything.
- Open key set to Enter works for the whole opening and Keep still works by click; setting it back works.
- The panel is fully keyboard-operable, focus is trapped and restored, and there are no console errors.
- All new regression checks print PASS in the dev console (defaults/validation, import checksum rejection, backup before reset, settings survive a reset).
