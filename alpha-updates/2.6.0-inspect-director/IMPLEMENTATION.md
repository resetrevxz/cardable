# Inspect / Director studio — milestone A

Milestone A is implemented on `update/inspect-director` in the isolated `D:/CardableV2/inspect-director-work` worktree. The prerequisite commit `ba57fdc` snapshots the live game unchanged; it is not part of the studio feature diff. Integrate the subsequent milestone commit against the corresponding live-game prerequisites rather than merging that snapshot as unrelated update work.

## Offline art

The initial non-file-writing probe used the installed Chrome 154.0.8037.97 and Edge 154.0.4258.53. Loading `apple-m1-gpu.webp` through file:// raised SecurityError for 2D readback, canvas export and WebGL texture upload. Supplying those same bytes as a data URI passed each operation. No game, screenshot or recording was involved in that constraint probe.

Run from the game root whenever original card artwork changes:

```powershell
node scripts/build-art-data.js
```

This creates 123 individual classic registration scripts plus an availability manifest under `assets/art-data/`. Thumbnails are excluded. The manifest is loaded only on first Inspect entry; artwork scripts are requested per selected card and removed after registration. `Cardable.art.register(id, dataUri)` is an additive overload installed by the studio; existing DOM generator registration and image rendering remain unchanged. Missing art-data registrations fall back to the game's procedural SVG art, rasterized as embedded vector data. A bounded three-entry URI cache is cleared on exit; pending image requests are cancelled.

## Foundation

- The existing detail-actions registry provides Inspect; E opens the selected serial. Unowned mystery cards do not expose it.
- The studio paints front/back, current artwork, real fonts, spec icons, serial, tier meter, compact tags and Standard/Classic skin identity. High/Medium/Low/Very Low texture widths are 2048/1536/1024/768. Classic uses the already-authorized VT323 terminal font. Static finish painting uses declared/computed palettes and exposed pure painters; animated finish ports remain E.
- A private WebGL2 renderer draws a thin rounded slab with beveled edges and a normal/roughness texture. Its fixed key light responds to the orbit camera. Very Low and unavailable WebGL use a simple 2D preview. No DOM card screenshot supplies a texture.
- Drag/arrows orbit, scroll or plus/minus dolly, F frames, and Card controls switch front/back or the plate. Backdrop brightness is adjustable. Esc deselects, then exits; Exit returns immediately through the transition. Space remains reserved for E's turntable.
- Last scene is keyed by the exact instance. Optional `save.studio` is normalized without changing the gameplay save schema. Existing saves without this field retain their defaults. Only Studio-owned scene data is written by the feature.
- Entry suspends refill polling and menu activity timers, pauses background CSS animations, hides/inerts background surfaces and acquires the shared scheduler's Studio-only scope. Exit restores focus/detail side, releases that scope, reconciles timestamp-based refills, and destroys studio GPU resources, canvases and observers. Static views sleep; no private animation loop runs.
- `studio:enter` and `studio:exit` emit `{cardId, instanceId, at}` once per successful lifecycle. `studio:photo` begins with actual captures in D.

No cutscene engine, cutscene finish, pack registry, opening style or packs.js content changes in the studio feature diff. The small shared changes are script/style registration, optional save normalization, app version, scheduler scope and menu-timer suspension.

## Milestone roadmap

| Milestone | State | Remaining delivery |
| --- | --- | --- |
| A | Complete | Foundation described above. |
| B | Pending | Editable light catalog/colors/gobos/gizmos, shadows, multi-light materials, full camera tools/DOF/post, undo/redo and rigs. |
| C | Pending | Complete procedural prop catalog, editable outliner/inspectors, limits/warnings, ten scene slots and JSON import/export. |
| D | Pending | Photo resolution/format/frame controls, tiled high-quality exports, album/filmstrip, toolbar/context entries, clipboard and photo events. |
| E | Pending | Priority variant/finish ports, keyframes/timeline, turntable, auto-director, optional titles and supported WebM recording. |

There are no variant studio ports in A. Variant instances preserve their source identity and show “Studio preview limited.” Following the approved current-catalog choice, E targets Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam first; absent variant names do not expand gameplay rules. Horizontal Holo, Cross, Spotlight, Starlight and Shattered are outside that first port set.

## Validation policy

Only `Cardable.dev.checkStudio()` is added, inside the existing studio entry module; it never runs automatically or through an old suite. In A it checks scene JSON round-trip and light/prop count clamping within two seconds. Undo/redo (B), requested photo dimensions (D) and album blob storage/retrieval (D) are explicitly pending, as approved. Future milestones extend this one check instead of adding test files.

Testing: one Chrome file:// game session confirmed Inspect/orbit/dolly/back/Last scene/keyboard return and cleanup with zero console errors; checkStudio ran once and passed available A logic, with B/D checks pending; no old tests, screenshots, recordings or profiling.

## Explicit foundation limits

Light controls, selectable transforms and advanced camera controls are not claimed complete in A. The outliner is a fixed card/key-light overview; future toolbar actions are disabled with milestone tooltips. Live simple mode has no orbit geometry, props or photo UI. Rarity ornaments/animated materials will gain full Studio hooks later; A paints the static rarity surface. The single manual session used a real catalog image with Classic skin and a stored Rainbow Holo identity at Medium. Other presets, physical devices and visual export fidelity are not certified by this checkpoint.
