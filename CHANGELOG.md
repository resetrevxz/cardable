# Cardable v1.3.1 — The card is the menu

Card detail is rebuilt around the card itself. Saved collections, serials and the save schema are unchanged.

- **No side panel.** Opening a card lifts it larger and alone. Everything the panel held now lives on the card or beside it.
- **Point at the card.** Its parts are controls: the rarity badge, generation, serial, brand mark, name, memory and specs. Each opens a small callout joined to the part by a line, with what it means and what you can do. Specs finally have labels; the generation shows how much of it you have collected.
- **Replay from the rarity.** The rarity callout replays that card's cutscene, and replays are now free. Credits are no longer spent on them.
- **Action rail.** Round buttons beside the card: Inspect, Favorite, Flip, Copies when you own several, and More for copying the serial, exporting, adding to a collection or deleting.
- **Keyboard.** Tab moves through the card's parts, Enter pins a callout and Esc closes it. I, F and R still inspect, favorite and flip.
- **History is gone.** The History tab, card history and its shortcuts are removed from the inventory.
- **Credits.** The credits button no longer animates on hover.
- Removed the styles for the old detail panel.

Checked in a browser session with screenshots at 1280×720 and 760×820: every callout, the rail menus, favorite, flip, a free Ascendant replay returning to the card, and the narrow layout. Card skins other than the standard front, touch input and the Windows app were not exercised. This release is unsigned.

---

# Cardable v1.3.0 — Smooth and seamless

A cleanup and visuals update. Settings is rebuilt as a glass panel, the inventory moves as one piece, and the photo album lives beside your cards. Saved collections, serials and the save schema are unchanged; every existing preference carries over.

## Settings

- **A new panel.** A glass panel docked beside the game, with an icon rail: Graphics, Performance, Appearance, Motion, Gameplay, Accessibility, Profiles, Data and About, plus Controls and Studio in Advanced. Search covers every page at once.
- **Left or right.** Dock the panel on either side from Appearance, or with the swap button in its header.
- **Simple and Advanced.** Simple shows the options most players want. Advanced adds the rest without changing anything you saved.
- **Live previews.** Point at an option and the dock shows what it does: the dot grid under a moving pointer with a live dot count, reduced motion beside full motion, frames for your cap, glass against solid panels. Many previews split Off and On with a divider you can drag. Card options use your real card.
- **Graphics in one place.** Five preset tiles with all ten effects underneath. Advanced turns each into a dropdown; a customized mix returns to its preset in one tap.
- **Any frame rate.** Pick a preset, drag the slider or type an exact cap from 10 to 500 FPS.
- **New options.** Accent color, seven wordmark finishes, wordmark glyph swaps, dot spacing and color, click ripples, cursor glow size and color.
- **Quick setups.** Balanced, Performance, Cinematic, Minimal and Comfort list every change before applying, with Undo afterwards.

## Inventory

- **It moves as one piece.** Cards, tabs and tools now travel with the sheet as it opens and closes, fading with its position. Before, they vanished the moment the sheet began to close.
- **No more size jump.** Cards grow and shrink with the sheet between its heights instead of snapping when you let go.
- **A steady header.** The title and tools keep one layout whether the sheet is tucked away or open.
- **Seamless pages.** Cards, Achievements and the album ease in when you switch. Choosing a collection from another page takes you back to your cards.
- **Glass.** The sheet uses the same glass as Settings on Medium and above, and stays solid on lower tiers or with Reduce transparency.

## Photo album

- **Inside the inventory.** The album is a tab beside Achievements instead of a separate full-screen view.
- **Easier to manage.** Search, sort by newest, oldest or name, and filter by tag. Rename a photo in place, add or remove tags as chips, and star favorites.
- **Viewer.** Open any photo full size and step through with the arrow keys, or compare two side by side.
- **Selection.** Ctrl-click and Shift-click to select several, then download them together. Delete asks twice and offers Undo.
- **Keyboard.** Arrows move, Enter opens, F favorites, Delete removes, / searches.

## Credits

- The credits popover is redrawn around the balance. The day summary and the history list are gone.

## Polish and cleanup

- Buttons, tabs, tiles, popovers, tooltips and dialogs share one set of hover, press and arrival animations. All of it respects reduced motion, the Hover animations option and Very Low.
- Disabled placeholders (sound, daily notices) and duplicate visibility switches leave Settings. A hidden duplicate folds into the control that remains, so nothing is stuck off.
- Removed the styles for the old album, the old two-pane Settings and the wallet history.

Checked in a browser session at 1280×720 with screenshots: Settings on both sides, every page in both modes and all previews; the inventory opening, changing height and closing, measured frame by frame; Achievements and album page changes; album search, selection, inspector and viewer; and the credits popover. The Windows app paths (Desktop page, Unlimited frame cap, folder export, updates) were not exercised. This release is unsigned.

---

# Cardable v1.2.4 — A steadier collection

A frame consistency and bug-fix pass, preserving saved collections and the existing installation/update flow.

- Developer backups move to a separate IndexedDB store instead of duplicating the save in limited local storage. The old backup is removed only after its exact contents are stored and read back. Current and preceding session restores remain available; unavailable backups still block real edits safely.
- Developer controls restore focus before hiding. Electron no longer reports a cancelled launch navigation as missing game files when its own game document is loading.
- Very High pack settings now reach Mini and taskbar state, and Mini retains the selected pack material tier.
- Inventory stays visible and inert behind card detail, so the lifted card returns to a visible collection. The shaded backdrop avoids a full-window blur pass.
- Navigation saves no longer clone the entire collection or rebuild an unchanged inventory projection. Favorite/collection filtering uses lookup sets and sorting calculates each acquisition key once.
- Developer timer ticks copy only pack state until a refill requires a real save. Selected favorite badges refresh with cached queries.
- Static thumbnails avoid repainting when a graphics change leaves their bounded material tier unchanged.
- Mythical's ruby touches the water at the splash beat and continues sinking into the underwater shot. Splash rings and droplets follow its contact point; Canvas recovery follows the same fall clock.
- Medium's Mythical cave uses fewer wall subdivisions while retaining its bounds, major rock silhouettes and materials. High and Very High retain their full geometry; Very High now retains High's hanging cluster count.
- Cinematic splash/ribbon buffers, draw matrices, color uniforms and fixed shadow camera data are reused. Adaptive resolution uses bounded allocation steps instead of reallocating targets for every eased pixel change.
- Secret's Very High route uses the authored High OS composition. Secret/Ascendant warmups respect the starting quality and retire when the reveal takes a calm route. Retired Secret renderers release their context and backing canvas.
- The performance display distinguishes average FPS of the slowest 1%/0.1% from frame-time percentiles, excludes wake-up placeholder frames, labels initial/paused sampling and shows sample count. Its graph refresh and save-size reads do less work.

Functional checks used an isolated copied desktop profile and presentation-only samples. The owner confirmed forced Ascendant now opens in their browser. Reduced allocation/geometry is verified separately from measured FPS and physical hardware acceptance. Existing installer/upgrade, wider browser and full cinematic acceptance limits remain; this release is unsigned.

---

# Cardable v1.2.3 — Ready to collect

A reliability and installer pass for Windows, with the same collection, serials and save schema.

- Fixed the native Discord Settings row crashing refresh during startup and saving. A completed save no longer becomes a failed pack opening because a post-write observer throws.
- Preserved fail-closed preparation and atomic reservations, with clearer storage-full/recovery messages and startup error details in native logs.
- Fixed missing Mythical flames, Exotic props and frozen prop motion on Very High.
- Guided setup shows folder selection for new installations, progress and shortcut creation. Updates keep the registered location and preserve player data.
- Every launch reports real preparation work. First desktop use explains the app folder, save location and separate Studio photo backups.
- Installed updates download quietly, then offer a 15-second restart only in an idle menu. Later postpones this session; a save or native mirror failure cancels restart. Settings can disable idle restarts.

Source sessions verified native startup, pack reservation, Keep and reload with a copied player profile. Installer packaging and UI state inspection are separate from live public A→B upgrade acceptance. This release remains unsigned.

---

# Cardable v1.2.2 — One Cardable: Your collection. Your controls.

Every detail, under your control. The 1.2 series comes together with the shared Cardable interface, a complete creative workspace and a new Controls update.

## Make Cardable yours

- Remap keyboard actions across play, inventory, card details, Settings, History and Director. Assign two keys, resolve context conflicts, reset an action or choose Default, One-handed or Compact controls. Export and import your bindings.
- Advanced Settings offers interface visibility, Minimal and Zen layouts, independent animation preferences, solid surfaces, stronger contrast, larger labels and keyboard focus emphasis. Ctrl/Cmd+, always opens Settings.
- Default, Performance, Cinematic, Minimal and Accessibility profiles preview every changed setting and include Undo. Settings export/import previews changes before applying them.
- Scale the interface from 70% to 150%, choose an animation cap up to 240 FPS or Unlimited, and reduce heavy canvas resolution. Unlimited desktop rendering requires a save-flushed restart; battery saver applies a temporary lower cap.
- Choose Normal, Short or Quick pack holds, use toggle-to-hold, pick per-rarity Play/Short/Skip routes, or skip all cutscenes. Rewards and reserved cards use the same exact-once opening path.

## One collection, one creative workspace

- The shared shaded interface keeps readable Settings, consistent controls, clean wallet geometry and separate outliner actions. Purposeful color belongs to the normal theme; monochrome remains optional.
- Director retains Simple/Pro workflows, procedural props, presets, materials, animation tracks, grading, deliver tools and the photo album. Tools, timeline operations, pages and view commands can be rebound; Studio preferences cover navigation, snapping, gizmos and autosave.
- History returns with a virtual collection timeline, milestones and per-card copy memories. Existing achievement boards, deterministic weekly goals, Picker offers, wallet receipts and protected deletion remain integrated.
- Ascendant's latest worktree sequence travels through clouds; Mythical retains its richer crystal cave. Reduced motion and Safe/Full presentation remain independent preferences.
- A new release showcase pairs actual local collection artwork with feature chapters, finish specimens, comparisons and nested inspection. Preview cards never enter your save.

## Your progress stays yours

Optional settings and history fields keep the existing save schema and app identity. Keep/Delete, Picker choice and rewards preserve atomic commit behavior. Legendary and higher deletion always requires the exact card name and a protected hold, including discard during reveal. Low-tier confirmation can be disabled.

## Downloads

Windows 10/11 x64. Choose the installer or extract the entire full-folder ZIP before running Cardable.exe. The browser build remains offline and uses local assets. This release is unsigned; installer signatures, a live updater upgrade and physical-device/cinematic acceptance are not certified by this update.

The existing v1.2.0 and v1.2.1 tags and assets are preserved. This follow-up uses the next available patch version.

## Unreleased (1.2.0)

Part 4 · Visual overhaul, included in the pending 1.2.2 release.

- All ten pack identities gain layered procedural materials, refined lean lighting and complete state/tier specimens.
- Twenty-four Director additions: eight scenes, four light rigs, six camera moves and six looks; existing card-aware adaptation remains.
- Smoother card-loading fluid, preserved actual asset counts, subtle panel/collection motion and calmer serial engraving.

## Materials, light and motion

Ten sealed pack identities gain distinct procedural materials and lean lighting. Mythical and Ascendant gain a shared High-tier filmic pipeline, richer reflections, depth focus and atmosphere. The glass-prism vignette preserves Ascendant's cloud ritual timing.

Very High is an optional fifth graphics preset, offered after a bounded hardware check. Extra detail uses central numeric budgets; sustained slow frames temporarily return to High. Medium remains the default, and lower tiers retain their lighter scene paths.

Director adds 24 card-aware presets: eight scenes, four rigs, six camera moves and six looks. Subtle inventory, serial, achievement and Settings motion follows quality and reduced-motion preferences. Loader fluid retains accurate asset progress.
