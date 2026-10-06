# Director mode 2: a pro studio that stays simple

Director mode (the card studio) becomes one of Cardable's key selling points. Goal: **one-tap beautiful results for anyone, and a real creative toolset for people who dig in.** Borrow the best ideas from Blender (viewport, gizmos, outliner, render preview), DaVinci Resolve (workspaces, color, deliver), Adobe Premiere (timeline, tracks, shots, transitions), Moon Animator 2 (easing styles, keyframe poses, simple object animation), and Figma (clean inspector, layers, snapping, components, command palette). Write original code and original UI; take inspiration, not assets.

**This is an expansion of the existing studio, not a rewrite.** Read `AGENTS.md`, `Designs.MD`, `alpha-updates/inspect-mode/SPEC.md` (the original spec) and **all of `src/studio/`** first. Audit before building.

## 1. Rules

- Classic scripts, offline, no libraries, procedural assets only. Monochrome UI chrome. Color appears only in the scene, on the card, and on tiny **gizmo axis tints** (muted red, green, blue) in the viewport.
- **Additive and migratable.** The scene JSON gets a `version: 2` with a migration from version 1; existing saved scenes, the album and photos must keep working. No save-schema bump (studio data lives in `save.studio` and IndexedDB).
- Native features (when `Cardable.native` exists, Electron): file dialogs, save to folder, clipboard images. Browser fallbacks stay.
- Light animations obey the strobing profile (`Cardable.cutscenes.profile()`); reduced motion disables auto-play and auto-orbit by default.
- Do not modify shared cutscene files. Keep the events `studio:enter`, `studio:exit`, `studio:photo` and add `studio:render`, `studio:clip`, `studio:preset { id, kind }`.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE logic check, `Cardable.dev.checkStudio2()`, run once at the end of the last milestone: v1 scenes migrate to v2 and re-serialize identically, undo/redo restores exact state across a scripted edit sequence (with grouped drags), keyframe interpolation returns exact values at keys and monotone values between for each easing, snapping math rounds correctly, and preset serialization round-trips. Under 2 seconds, never automatic. Otherwise open the studio once, confirm the changed features work with no console errors, then stop.

## 2. Milestone A: audit, fix bugs, harden the foundation

1. **Audit.** Read the studio code and run it. Write `docs/studio-audit.md`: a table of every bug, flaw or missing basic you find (what, where, how to reproduce, severity), then fix everything fixable. Check at least: lights or props not updating the card; light limits and prop limits; undo/redo desync or lost steps; selection and gizmo glitches (offsets, flips, gimbal issues); camera orbit flips and drift; DOF and post settings not applying or leaking; resize and DPI changes breaking the viewport (it must keep state and not restart); scene save/load/slot mismatches and "Last scene" restore; photo at 2K/4K failing, wrong size, or blurry; album storage, deletion and quota handling; GPU memory leaks when entering and leaving the studio repeatedly; focus traps and keyboard conflicts with the rest of the game; reduced motion and quality tiers; variants without studio ports; text overlap and layout bugs in the panels.
2. **Command-based history.** Every edit is a command with `do/undo`; a drag or slider scrub is one grouped step; 100 steps; a History list (names and timestamps) with click-to-jump.
3. **Scene model v2** with stable ids for every object, parent/child grouping, per-object `visible/locked`, and an `animation` section (section 5). Migration from v1. Deterministic serialization (sorted keys) so the logic check can compare.
4. **Robust resize:** the viewport resizes buffers in place and keeps camera, selection and playback state.
5. **Performance hygiene:** one render loop that sleeps when nothing changes; progressive refinement (section 8); dispose GPU resources on exit; cap texture sizes by the quality tier.

## 3. Milestone B: Simple mode and Pro workspace

### Simple mode (default)
The goal is a result in three taps. Minimal chrome:

```
 [ x ]                       card name                    [ Pro ]
                  ┌───────────────────────────┐
                  │         VIEWPORT          │
                  └───────────────────────────┘
   Style  ‹ ▢ ▢ ▢ ▢ ▢ ▢ ›      (live thumbnails, 24 styles)
   Mood ───●──── Light angle ◔   Shot [Hero][Close-up][Reveal][Spin]
                      [  Photo  ]   [ Record ]
```

- **Style carousel:** scene presets with **live thumbnails rendered of the actual card** (section 6). Click applies with a smooth transition (lights and camera ease over 400 ms).
- **Mood** slider (intensity of the look and light), **Light angle** dial, **Shot** buttons that apply camera moves (section 6), Photo and Record. Everything else is hidden. Tab, or the Pro button, switches to Pro; the choice is remembered.

### Pro workspace
Resolve-style **page tabs** along the bottom: **Set** (backdrop, props, layout), **Light**, **Camera**, **Animate** (timeline), **Look** (color and lens), **Deliver** (photo, render, clip). Each page re-arranges the panels but shares the same viewport. Layout (Figma-like, clean, collapsible):

- **Left:** Layers (outliner) and **Library** (props, lights, presets, looks, cameras; search, tags, favorites, drag into the viewport).
- **Center:** the viewport with a minimal toolbar (select, move, rotate, scale, camera, snap toggles, shading mode, guides, aspect crop).
- **Right:** Inspector (collapsible sections with scrubbable number fields: drag a label to scrub, double-click to reset, Shift for fine, Ctrl for coarse; color pickers with presets; linked/unlinked axes).
- **Bottom:** the page tabs and, on Animate, the timeline.
- Everything is dockable only in simple ways (collapse, resize); do not build a free-form docking system.

### Viewport and controls (Blender and Figma ideas)
- Navigation: orbit (right-drag or middle-drag), pan (Shift+drag), zoom (wheel), **view cube/gizmo** with Front, Side, Top, Perspective/Ortho toggle, Frame selected (`F`), Frame card (`Home`), smooth view transitions.
- **Gizmos:** translate, rotate, scale with axis and plane handles, local/global space, **snapping** (grid, angle, distance to the card and floor), smart guides and alignment lines to other objects (Figma style) with distance labels, numeric input fields.
- **Selection:** click, marquee, Shift add, Alt-click cycles overlapping objects, Select all, invert, group (`Ctrl+G`), ungroup, duplicate (`Ctrl+D` or Alt-drag), arrange tools (align, distribute, grid array, circle array, mirror), lock, hide, isolate (`/`).
- **Shading modes:** Material (live), Preview (fast), Wireframe/Bounds for layout; **Guides:** rule of thirds, golden ratio, center cross, safe frames; **Aspect crops** (1:1, 4:5, 16:9, 9:16, 2.39:1, card-only).
- Context menus (right-click, using the game's glass menu), a studio command palette (`Ctrl/Cmd+K`), and a scoped shortcuts overlay (`?`). Shortcuts mix familiar conventions: `V` select, `G/R/S` move/rotate/scale, `Shift+D` duplicate, `X` delete, `Tab` Simple/Pro, `Space` play/pause the timeline, `J/K/L` shuttle, `I/O` in/out, `M` marker, `K` key (when auto-key off), `Ctrl+Z/Shift+Z`, `[` `]` layer order.
- Inside the studio, Space controls playback only (the pack opening is not active there).

## 4. Milestone C: presets (make them genuinely good)

Presets are the product. Hand-tune each one; do not generate them mechanically.

### Kinds
1. **Style (scene) presets:** a full set: backdrop, lights, props, FX, look, camera, optional title. 24 launch styles in 6 families:
   - **Showcase:** Museum, Showroom, Gallery Wall, Pedestal
   - **Studio:** Product White, Dark Seamless, Gradient Sweep, Paper Sweep
   - **Moody:** Noir, Vault, Moonlight, Candlelit
   - **Neon:** Neon Alley, Synthwave Grid, Arcade, Cyber Rain
   - **Tech:** Workbench, Clean Room, Server Hall, Teardown (heatsinks, fans, cables as props)
   - **Epic:** Throne, Aurora, Eclipse, Stage Spotlight
2. **Light rigs:** Three-point, Rim and Fill, Butterfly, Rembrandt, Top Softbox, Split Light, Backlight Halo, Colored Gel Duo, Practical Neon, Sunset Window, Moonlight, Candle Flicker (flicker obeys the strobing profile).
3. **Camera moves (shots):** Hero (slow push-in with slight arc), Close-up (macro on art with shallow DOF), Reveal (pull-back from detail to full card), Turntable, Crane Up, Whip Pan Settle, Dolly Zoom, Orbit Left/Right, Handheld, Slow Float, Spec Sweep (pan across the info plate), Beauty Pass (three-shot sequence).
4. **Looks (grading):** Clean, Cinematic Teal-Orange, Noir, Kodak-style Warm Film, Cool Chrome, Vaporwave, Matte Dream, High-Key White, Neon Night, Bleach Bypass; each defines exposure, contrast, saturation, temperature/tint, lift/gamma/gain, bloom, halation, vignette, grain, chromatic aberration, lens flare.
5. **Prop sets (components):** Tech Bench, Trophy Corner, Fan Array, Cable Garden, Card Wall, Stacked Fan, Glass Cube Display, Floating Shards.
6. **Animation presets:** Float, Pulse Glow, Slow Tilt Reveal, Showcase Spin, Light Sweep, Flicker (safe), Breathing Camera, Prop Orbit, Variant Glint.

### Quality bar and smart adaptation
- **Card-aware:** presets read the card: rarity accent, variant accent colors, art darkness, finish (matte vs glossy), pack skin (for example the Classic card gets a warmer, softer rig). They choose **complementary light colors** (color harmony from the card's palette), adjust rim strength to the art brightness, and avoid blowing out glossy or foil finishes. Provide per-preset rules in data.
- **Mood** (Simple mode) scales a preset's intensity, contrast and look strength predictably.
- **Test cards:** every style must look good on at least these reference cards: a plain Basic card, Holographic, Matte, Cosmic, Gold Foil, a Classic-skin card, and a Legendary. Add a dev **preset gallery** (`?dev=1&gallery=presets`) rendering styles x reference cards for the owner to review.
- **Live thumbnails:** preset thumbnails are rendered by the real renderer (small viewport, cached, updated when the card changes), not static images.
- **Browser:** search, tags (family, mood, color), favorites, recents, "similar styles", random ("Surprise me" with a seed, and "Remix" that perturbs a style within its family).
- **User presets:** save any scene, rig, look, camera move or prop set; rename, duplicate, delete, favorite; export and import `.cardable-preset.json`; store in `save.studio`.
- Applying a preset is undoable, animates smoothly, and never destroys the user's work silently (ask once with "Replace scene / Add to scene").

## 5. Milestone D: animation (Premiere timeline, Moon Animator easing, Blender graph)

- **Timeline** on the Animate page: time ruler, playhead, play/pause/loop/ping-pong, speed (0.25x to 2x), work area (in/out), zoom and scroll, snapping to keys and markers, frame readout (24, 30, 60 fps selectable).
- **Tracks (grouped like Premiere):** Camera, Card, Lights, Props, Look, FX, Titles. Every property that makes sense can be keyed: transform, light intensity/color/size/angle, camera position/rotation/FOV/focus/aperture, card tilt/side/scale, look parameters, prop parameters, title opacity and position.
- **Keyframes:** auto-key toggle and a Key button; diamonds on tracks; drag to move, box select, copy/paste, scale in time, delete; per-key **easing styles** like Moon Animator (Linear, Constant/Step, Cubic In/Out/InOut, Back, Elastic, Bounce, Spring) plus **Bezier handles** in a **Graph editor** toggle; **Dope sheet** view for overview.
- **Motion paths:** the camera and any object show their path in the viewport and can be edited.
- **Markers** with names and colors; jump to marker; markers drive nothing else.
- **Camera tools:** multiple cameras; a **Shots** track: cut points between cameras with transition (Cut, Dissolve, Dip to black, Whip), per-shot duration; procedural **shake/handheld** (amount, frequency, seed) as a camera modifier; animate **focus distance** (rack focus) with a focus-pull helper (click an object); dolly-zoom helper.
- **Titles:** text overlays (card name, tier, serial, custom text) with 8 tasteful presets (Lower Third, Name Plate, Museum Label, Minimal Caption, Big Reveal, Serial Stamp, Variant Banner, Credits), Inter and the mono font only, animated in and out.
- **Loop-friendly:** a "Make loopable" helper that matches first and last values for selected tracks.

## 6. Camera, presets and Simple mode integration

Simple-mode Shot buttons and the preset Shots all produce real timeline data (editable in Pro), so Simple results can be refined without losing anything.

## 7. Milestone E: Look page, Very High quality, Deliver

### Look page (Resolve-inspired, simple)
Exposure, contrast, saturation, temperature and tint, **lift/gamma/gain** wheels, a tone **curve**, highlights/shadows, vibrance, **bloom, halation, vignette, grain, chromatic aberration, lens flare, sharpen**; a **scope** (histogram and waveform, cheap) toggle; before/after split (`\`); look presets (section 4). All procedural; no LUT files required (a generated LUT table is fine internally).

### Quality ladder and the new Very High mode
Quality tiers for the studio: **Very High** (new), High, Medium, Low, Very Low.
- **Very High:** render scale up to 2x, 16 lights, high-resolution soft shadows, screen-space ambient occlusion, screen-space reflections on the floor and glossy props, bokeh DOF with aperture shapes, 4096 card textures, **progressive accumulation** (section below), and optional motion blur for exports.
- Expose the tier through the existing quality system (with a studio-specific override) so the global **Very High** tier planned later can plug in without redesign.
- Respect hardware: detect limits (`MAX_TEXTURE_SIZE`, renderbuffer limits, frame time) and offer Very High only when it holds a usable frame rate; otherwise show it dimmed with the reason.

### Progressive refinement and Render
- **Viewport refinement:** while the camera or objects move, render at preview quality; when still for about 500 ms, **accumulate samples** (jittered camera/light samples) so shadows, DOF and antialiasing converge smoothly to a clean image.
- **Render still:** a Deliver button that accumulates N samples (64 to 512 by tier) to the chosen resolution with a progress ring and a cancel button, then saves. Instant **Photo** stays available.

### Deliver page
- **Photo** (PNG, JPEG, WebP; resolution presets 1080p, 2K, 4K, 8K where supported; frames: none, Polaroid, Museum label, Collector slab, Poster with title; optional watermark).
- **Render still** (above).
- **Clip:** real-time capture to WebM (MediaRecorder) up to 60 fps, with presets (YouTube 1080p60, Shorts/Reels 9:16, Square, Loop); when WebCodecs is available, offer a **frame-stepped render** for dropped-frame-free output. Duration from the work area.
- **Image sequence** to a chosen folder (Electron native dialog) as numbered PNGs.
- Album: grid and filmstrip, tags, search, "reopen scene", compare two photos, batch download (sequential saves in Electron), storage meter, export all to a folder (Electron).
- Share helpers (native clipboard copy).

## 8. Simplicity guardrails

- A first-time hint tour (3 cards, dismissible, once) in Simple mode.
- Every Pro panel has a one-line helper and a "Reset" button; defaults are always good.
- Nothing in Simple mode requires knowing a term of art.
- Keep the number of top-level controls per page small; hide advanced items under "More".
- Never block with modal dialogs; use toasts and inline confirmations. Auto-save the working scene every few seconds; the History list and the album make recovery easy.

## 9. Quality tiers (live editing) and accessibility

- Live editing follows the quality tier; on Medium and below the viewport uses preview quality always and refinement is a manual "Refine" button; Low has no SSAO/SSR/DOF; Very Low uses the simple mode from the original spec.
- Keyboard accessible: focus order, visible focus rings, `aria` labels on tools; reduced motion disables playback auto-start, view transitions and carousel motion.

## 10. Milestones (stop at a clean one, commit, list what is unfinished)

- **A:** audit, bug fixes, command history, scene v2 and migration, resize robustness, performance hygiene.
- **B:** Simple mode, Pro workspace, library, inspector, gizmos, snapping, commands, shortcuts.
- **C:** presets (all kinds), card-aware adaptation, live thumbnails, browser, user presets, preset gallery.
- **D:** timeline, tracks, keyframes, easing, graph editor, motion paths, shots and transitions, titles.
- **E:** Look page, Very High quality, progressive render, Deliver (photo, render, clip, sequence), album upgrades.
- **F:** polish, performance, accessibility, final bug pass, the logic check.

## 11. Manual checks

1. Entering the studio on any card is instant; Simple mode gives a good-looking result in three taps.
2. All 24 styles look good on the reference cards; Mood and the light dial behave predictably; applying a style is smooth and undoable.
3. Pro mode: layers, library, inspector, gizmos and snapping feel precise; undo and redo never lose steps; resize never resets anything.
4. The timeline keys any property; easing styles and the graph editor behave; motion paths edit; shots cut and dissolve; titles animate.
5. The Look page changes the image correctly; the scopes and before/after work.
6. Very High refines to a clean image when idle; Render still reaches the chosen sample count and saves at the right size.
7. Photos, renders, clips and image sequences save correctly (Electron dialogs work; browser fallbacks work).
8. Old scenes and photos still load; the album stays within quota and reports it.
9. No console errors; leaving the studio frees GPU memory and restores the normal UI exactly.
