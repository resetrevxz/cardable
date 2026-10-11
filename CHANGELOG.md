# Cardable v1.5.0 — Smoother collections

Browse larger collections with fewer hitches, organize the cards you want, and open packs from the lightweight Mini companion. Existing cards, serials, pack odds, saved preferences and the save schema are preserved. Achievements remain paused with their progress retained.

- **Smoother browsing.** Grid preparation is bounded, thumbnail artwork loads directly, hidden material trees are omitted, and resizing the sheet reuses its layout. Retired pack canvases and observers are released.
- **Collections and wishlists.** Organize tabs with colors, pins, descriptions and sorting. Wishlists track missing cards and priorities; duplicating, clearing and Undo preserve membership. Searches reuse collection projections and switching tabs reuses their labels and icons.
- **Open here, keep here.** Ctrl+M opens an always-on-top Mini companion with stock, refill progress, credits and the three newest collected cards. Open and Keep use your existing bindings; Picker offers use 1/2/3. Expand restores the same reserved card. Failed saves and stale requests cannot grant another reward.
- **Your window.** Mini remembers Left/Right docking and a 30/60 FPS ceiling. Desktop settings offer Free/16:9/21:9 proportions, size presets and custom dimensions.
- **Less repeated work.** Locale formatting, effective quality reads and Secret's settled scene elements reuse bounded resources. Safe/Full cinematic controls and the per-frame flash limiter are preserved. Keep/Delete remain readable over retained bright fields.

Matching 20-second local measurements against 1.4.3 showed grid 1% lows rising from 55 to 146 FPS on Low and 53 to 156 FPS on High, with maximum grid gaps falling to 8.4 ms. Moving-shelf lows rose from 167 to 197 FPS on Low and 92 to 116 FPS on High. Repeated collection projections used about 69% less CPU time in a 24-collection fixture. These are machine-specific samples, not guaranteed frame rates; High shelf still has occasional longer gaps.

Verification includes all ten pack strategies, collection behavior comparisons, four-preset desktop/phone journeys, source and packaged Mini recovery/failure/Picker checks, native smoke/save recovery, and Full High/Safe Legendary and Secret handoff. A clean installer run, live updater upgrade, other hardware and the exhaustive cinematic/profile matrix remain unverified. This release is unsigned.

# Cardable v1.4.3 — Quiet start

Cardable starts with a bar instead of a panel, Achievements step aside while they are reworked, and a long list of small interface fixes lands. Saved collections, serials, odds, pack cadence and the save schema are unchanged. Your achievement progress is kept in the save and returns when the feature does.

- **Achievements are paused.** The tab, notices, shortcuts, commands and settings for Achievements are hidden for now. Nothing is deleted: the feature stays in the game and will come back reworked.
- **A quieter start.** Cardable no longer opens with a full panel. A small bar sits under the pack and fills smoothly while the game loads, then leaves. It waits a moment before it shows, so a quick start never flashes it. Until the game has loaded, Settings and Patch notes stay out of sight and the inventory says it is blocked if you try to pull it up.
- **Command palette.** A rounded search field with its own icon and a soft accent focus, keycap hints in the footer, and everyday commands first when the field is empty.
- **Keyboard shortcuts.** The sheet has a close icon, a live filter (type "flip" to find every flip shortcut) and clean keycaps.
- **Where you are.** Card detail shows "54 of 134" beside the Flip hint, including for undiscovered cards. On touch or pen, a quick sideways swipe moves to the next or previous card. (Code-checked only.)
- **Hold feedback.** Open pack fills as you hold it, and a quick tap reads "Hold to open" for a moment so the gesture teaches itself.
- **Shelf captions.** Undiscovered cards read "Unknown card" with "Common · Gen 2" under them, so nothing is cut off. Pointing at the Inventory title explains its two numbers.
- **Photo album.** The search field shows focus around the whole field, and an empty album hides its selection tools.
- **Large displays and phones.** The pack's timer and buttons grow on tall displays. On phones the wordmark shrinks so Credits and Settings never cover it, and the detail hint stays on one line.
- **Tutorial.** Skip tutorial and Help stand at the top left instead of over Credits and Settings, and the first step shows only the pack.
- **Cleaner details.** The cut hint is readable, and Patch notes no longer draws a focus ring around the whole window.
- **Fixed: Studio top bar.** In Pro mode at 1280 px wide, History and Scenes sat under the Simple/Pro switch and Help covered Layers and Inspector. The bar now keeps everything on one row and wraps cleanly on narrower windows. In narrow Studio windows the view cube moves to the bottom left.
- **Fixed: inventory on phones.** At phone width the collection tabs (All Cards, Favorites) were hidden behind New collection. They now have their own row, only the card you are on shows its tags, and the empty peek thumbnail no longer adds a row to the header.
- **Fixed: credits symbol.** Credits no longer show a dollar sign in the pack menu and save preview.

Checked in a browser session with screenshots at several window sizes, and the pack, schedule, Picker and control dev checks. Touch input, real-hardware frame rate, a clean Windows install and the packaged app's start were not exercised. This release is unsigned.

# Cardable v1.4.2 — One glass

Patch notes and Help now share the surface of Credits and Settings. Saved collections, serials, odds and the save schema are unchanged.

- **Matching glass.** Patch notes and Help are the same rounded glass as Credits and Settings, with the same edge light, shadow and blur. Patch notes shows its label larger with the version beside it.
- **Settings gear.** The gear takes the same glass so the row reads as one set.
- **Unread dot.** The dot on Patch notes uses your accent color and sits inside the corner.
- **Fixed: Help position.** Help no longer overlaps Patch notes when Patch notes is wider than first measured.

Checked in a browser session with a screenshot at 1280 x 720 and the measured spacing of all four controls. Monochrome, the lower glass tiers, touch input and a clean Windows install were not exercised. This release is unsigned.

# Cardable v1.4.1 — Quiet details

The area under the pack is redrawn to match the rest of the game. Saved collections, serials, odds, pack cadence and the save schema are unchanged.

- **Clearer status.** A short label (Next pack, Regenerating or Pack storage) sits over the time, set large with the units dimmed. The numbers keep their width as they change.
- **One clear action.** Open pack is a single accent pill that shows its hold key. Flip is a quieter pill beside it with R, and reads Front while the pack is turned over.
- **Calmer stock row.** Stored packs are bright cards, and the one refilling fills with your accent color. Queue labels are larger and easier to read.
- **Easier to hit.** Buttons are 34 px tall (44 px on touch) and show a clear focus ring on the keyboard.
- **Short windows.** When the window is 500 px tall or less, the status stands beside the pack instead of running into the inventory.
- **Fixed: Flip label.** The button now returns to Flip whenever the pack is brought back to the front.

Checked in a browser session with screenshots at 1280 x 720 and 800 x 450, in color and monochrome, plus the pack, schedule, Picker and control dev checks. Touch input, Very High, a clean Windows install and real-hardware frame rate were not exercised. This release is unsigned.

# Cardable v1.4.0 — Every pack

Every card pack is redrawn as a 3D object you can move and turn over, with its own startup, hold and opening. This release also carries the Every corner visual pass (1.3.3 and 1.3.4 were never published) and the Ascendant inspect fix. Saved collections, serials and the save schema are unchanged.

- **Packs are objects now.** Every pack is a real 3D object with a printed front and back. Drag to move it, press **R** (or the Flip control, or double-click) to turn it over, and right-click to inspect from any angle. An opening always starts from the front.
- **Standard.** Black, with the dot grid printed down the right side, the cardable mark at the top and Series 01 at the bottom. The wrapper at the top shows the dots as you cut.
- **Rare.** A chameleon that starts black and turns blue, with connected moving dots and a few bigger ones. While you hold Space the icons rematerialize into a clean white grid, and the cut brings the grid back.
- **NVIDIA, AMD, Snapdragon and Apple.** Each has its own face, back, startup, hold and cut: a shroud and fan with the green band, a red slash, a package with its pin grid, and a frosted pearl.
- **Classic.** A retro PC case. It pixelates and flies away on startup, the key turns and the lights blink while you hold, and you pull the sticker to tear it open. The card inside gets a more detailed command panel.
- **Royal.** A glass coat that appears and dissolves every two seconds with translucent gold triangles; holding dissolves it. It tears open on both sides to reveal a small red carpet, then opens to the card. Each rarity has its own gold frame, Legendary above Secret.
- **Titan.** A faceted aluminium shroud inspired by the Titan X and GTX 1080 Ti coolers. A machined knob releases it in three clicks.
- **Picker.** Opens on a clear sleeve of three card backs that shuffle like a magician's riffle. After the cut the three cards are shown, turned over, shuffled by hand (overhand drops, a riffle, a cut, a deal and two swaps) and you pick one from the backs.
- **Quieter stage.** The Flip control sits beside the timer. On shorter windows the stage rises so the timer, queue and counter clear the inventory, and each pack throws a faint pool of its own colour on the floor.

- **Inventory height.** Appearance › Interface chooses how tall the inventory opens: Compact, Standard (the default) or Tall. It re-measures live, even with the inventory open.
- **Panels rise in.** The performance panel and dialogs rise in; drawers slide in from the right.
- **Quieter appearances.** Inventory tooltips, search errors and the delete caution fade in instead of popping up.
- **Achievement and menu motion.** An achievement opened on a narrow window eases in, and menu notices fade in.
- **Filter chips ease in.** Filter chips and the empty-collection note ease in instead of appearing at once.
- **Collection tabs slide.** A single indicator glides to the collection you pick instead of the highlight jumping. It stays away on Achievements and the album.
- **Plainer journal.** Journal entries state what happened, without filler lines like “a moment earned” or “now part of your story”.
- **Settings accents.** Settings accents follow your accent color and the monochrome theme, like the rest of the game.
- **Notice position.** Gameplay › Notices chooses whether unlock and action notices appear at the bottom (the default) or the top of the screen. Top notices drop in from above.
- **Fixed: hover errors.** Hover effects no longer throw an error when the pointer passes over the page background.
- **Fixed: inventory pull from fully open.** Pulling the sheet down from its full height no longer detaches it from the bottom edge. It stays anchored and shrinks as one surface.
- **Fixed: Inspect on Ascendant cards.** The Studio quietly failed to open for Ascendant cards. It opens now, and if the Studio ever cannot prepare a card it says so instead of doing nothing.
- **Inventory popovers.** Filters, Sort, Collection options and New collection are glass cards set in from the edge. Filter choices are pills instead of small checkboxes.
- **Search and fields.** The inventory search has its icon and the same field style as Settings. The Show Unowned checkbox is drawn to match.
- **Deleting a copy.** The card leads, each caution is a clear tinted row, and the hold-to-delete button is rose while Cancel stays neutral.
- **Performance overlay.** Same glass as the rest, with its sections as small cards.
- **Studio, Simple mode.** Photo is the accent button, the mood slider and style tiles match the rest of the game, and help sits beside the mode switch.
- **Card detail.** The one-time pulse that points out the card's parts stops for good after you open your first callout.
- The centered card's tags stay on one line.
- **Cleaner inventory header.** The "0 New · variant copies · finishes" line is gone; the inventory title and count stand on their own.
- **Achievements.** The "The collection continues" line above the heading is removed.
- **Card captions setting.** Appearance › Interface has a Card captions switch that hides the name and tier under each card in the shelf and grid.
- **Shelf caption entrance.** Captions rise in as their card settles; they stay still with reduced motion. (Code-checked only.)
- **Shelf captions.** Each card's "Basic · Generation 1" line stays on one row under its name instead of wrapping its number onto a second line.

Checked in a browser session with screenshots at several window sizes: every pack's front and back, charge, cut and arrival at controlled poses, a flip mid-turn, Royal's two-sided tear and carpet, the Picker flow from cut to pick to reveal, the Titan knob, reduced motion and the Very Low and Low tiers, plus the dev checks for faces, flip and the Picker. Real-hardware frame rate, the Very High tier, touch input, the monochrome theme on the stage, a clean Windows install and the cinematic matrix were not exercised. Saved collections, serials, odds, pack cadence and the save schema are unchanged. This release is unsigned.

# Cardable v1.3.2 — A closer look

A visual pass over the weakest screens. Saved collections, serials and the save schema are unchanged.

- **Reveal.** Keep is now a large accent button with its key, Delete is a quiet pill beside it, and Flip sits with them under the card instead of at the top of the screen. New cards carry a small NEW mark.
- **Cutting a pack.** The Tear button no longer covers the Enter hint; the button sits under the pack and the hint under the button.
- **Shelf.** The selected card's tags no longer overlap its name. Tags appear for the card you are on or pointing at.
- **Menu.** The help button joins Patch notes, Credits and Settings in the top-right row, and that row hides together when the inventory or Settings opens.
- **How to play.** Rebuilt as an accordion of cards on glass, with copy updated for the new inventory, card detail and album.
- **Toasts, dialogs and the command palette** share the Settings glass, with clearer actions and a marked selection in the palette.
- The Outline wordmark specimen in Settings is drawn as an outline again.

Checked in a browser session with screenshots at a 1080p-equivalent layout: menu, shelf and grid, Achievements, Settings, How to play, the command palette, toasts, and a full pack opening through cut, reveal and Keep. The Windows app, touch input and monochrome were not exercised. This release is unsigned.

---

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
