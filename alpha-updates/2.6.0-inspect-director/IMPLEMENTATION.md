# Inspect / Director studio — milestones A and B

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

## Milestone B — lights and camera

- Six light types: point, spot, directional/sun, rectangular area softbox, strip and ambient/sky with separate top/bottom colors. The card's normal/roughness material receives every active light's diffuse/specular contribution, including beveled edges. Spot cones support procedural blinds, grid, leaves and stars gobos. Area/strip integration uses four bounded samples.
- Light controls include name/type, position/rotation, intensity, HSV with an interactive neutral hue ring, pastel/neon/warm/cool presets, Kelvin temperature, size, falloff, cone softness, shadow toggle/softness and animation speed. Light rows support selection, visibility, locking and deletion; duplicate and delete also have the specified shortcuts. Counts are bounded by the live tier and warn near the limit.
- Viewport light gizmos move on the camera plane, move in depth, rotate and change size; Shift snaps transforms. Projected cone/rectangle/strip shapes track their spatial orientation. Arrow keys provide handle adjustments. Offstage lights retain clamped edge handles so they remain reachable.
- The studio owns analytic rounded-slab shadows on its floor/wall backdrop receivers. High uses bounded soft sampling; Medium basic shadows; Low/Very Low none. These receivers support B's card shadow; the editable floor/other shadow-casting geometry belongs to C's prop catalog.
- Camera tools include orbit, Shift/right-drag pan, dolly, FOV, roll, target controls, auto-frame, lock-to-card and aspect guides for 1:1, 4:5, 16:9, 9:16 and card-only. High adds a world-space focus picker, aperture-controlled depth gather and tilt-shift. Post includes exposure, quarter-resolution bloom, vignette, static grain, chromatic aberration and a procedural flare approximation. Medium retains bloom; lower tiers omit DOF/bloom. Simple mode offers distance, roll, framing and one static colored light.
- Fifty undo steps restore the full implemented scene; sliders/drags coalesce into gestures, keyboard actions and presets are atomic, redo clears on a new edit. Auto-frame affects the rendered scene without generating hidden history entries. Last scene preserves B data without a save schema bump.
- Eight light rigs: Studio, Rim, Noir, Neon Alley, Sunset, Moonlight, Showroom and Vault. Scene presets: Studio, Museum, Neon Alley, Sunset Desk, Void, Vault, Showroom and Surprise me. These establish B's camera/light/backdrop/post compositions; prop arrangements arrive in C.
- Pulse/flicker use continuous low-contrast ramps capped at 1.8 Hz Safe / 5 Hz Full by the current read-only cutscene profile. Sweep/orbit are slower spatial changes; ambient sky stays static. Reduced motion and Very Low pause animations. Animation uses presentation seconds from the shared scheduler, unaffected by developer timescale; hidden/unfocused pause does not advance its clock.
- Static scenes render only when dirty. Transforms reuse card textures and render targets; GPU allocation occurs only on entry, card-face changes or viewport resize. Bloom skips its passes at zero strength. No private RAF, animation timer, profiling or normal-game rendering is added. All B edits are confined to studio files and this report.

## Milestone roadmap

| Milestone | State | Remaining delivery |
| --- | --- | --- |
| A | Complete | Foundation described above. |
| B | Complete | Lights, camera, post, history and presets described above. |
| C | Pending | Complete procedural prop catalog, editable outliner/inspectors, limits/warnings, ten scene slots and JSON import/export. |
| D | Pending | Photo resolution/format/frame controls, tiled high-quality exports, album/filmstrip, toolbar/context entries, clipboard and photo events. |
| E | Pending | Priority variant/finish ports, keyframes/timeline, turntable, auto-director, optional titles and supported WebM recording. |

There are no variant studio ports in A. Variant instances preserve their source identity and show “Studio preview limited.” Following the approved current-catalog choice, E targets Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam first; absent variant names do not expand gameplay rules. Horizontal Holo, Cross, Spotlight, Starlight and Shattered are outside that first port set.

## Validation policy

Only `Cardable.dev.checkStudio()` is added, inside the existing studio entry module; it never runs automatically or through an old suite. B extends it with undo/redo restoration and the 50-step bound, alongside JSON round-trip and light/prop count clamping within two seconds. Requested photo dimensions and album blob storage/retrieval remain pending D, as approved. Future milestones extend this one check instead of adding test files.

Testing: one Chrome file:// game session confirmed Inspect/orbit/dolly/back/Last scene/keyboard return and cleanup with zero console errors; checkStudio ran once and passed available A logic, with B/D checks pending; no old tests, screenshots, recordings or profiling.

B testing: one Chrome file:// game session exercised all six light types, color edits, gobos, shadows, gizmo dragging/keyboard transforms, undo/redo, camera pan/focus/lens/crop controls, presets, reduced-motion pause, four live tiers and exit restoration with zero console/WebGL errors; checkStudio ran once and passed A/B cases under two seconds, with photo dimensions/album pending D; no old tests, test files, screenshots, recordings or profiling.

B acceptance is limited to that desktop Chrome session with a real image card, Classic skin and stored Rainbow Holo identity. The session found and repaired overlapping-handle/pointer-capture and undo focus defects in place without reopening/reloading the game. Full-profile flash measurements, physical-device performance and exported image fidelity are not claimed. There are still no variant ports; all priority ports and full finish hooks remain E. Light/scene preset prop arrangements, complete prop editing and scene slots remain C; captures and `studio:photo` remain D.

## Historical A checkpoint limits

Light controls, selectable transforms and advanced camera controls are not claimed complete in A. The outliner is a fixed card/key-light overview; future toolbar actions are disabled with milestone tooltips. Live simple mode has no orbit geometry, props or photo UI. Rarity ornaments/animated materials will gain full Studio hooks later; A paints the static rarity surface. The single manual session used a real catalog image with Classic skin and a stored Rainbow Holo identity at Medium. Other presets, physical devices and visual export fidelity are not certified by this checkpoint.
