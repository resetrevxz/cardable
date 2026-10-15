# Director Mode Reborn — Stage 1

Implemented locally on 13 October 2026 in `D:/CardableV2/DirectorModeUpdate`, branch `feature/director-mode-update`, from clean shared commit `4a0eea317e9ec89b8767760090ffdeac94b7b6f8`. The primary checkout, Shop, Market and other registered worktrees were only inspected. Their unrelated changes were preserved. No release, merge, version bump, desktop delivery or installation replacement was performed, following the owner's explicit Stage 1 boundary.

## Result

The existing Inspect/Director workspace now has a quieter header, one page strip, stage tools in their own row, a narrow image-led preset browser, readable grouped inspectors, native color/hex inputs, bounded numeric scrubbing and sliders, named reset actions, scoped tooltips, named undo feedback and an immersive preview. Panels remain resizable; collapsible groups retain their state without resizing the stage. Color and saved monochrome use the same kit states. The UI gallery opens the actual Studio field/history components as local specimens.

All 100 current catalog entries retain their identifiers. Three original scene identities — Studio, Sunset Desk and Void — are available again as distinct legacy compositions, yielding 103 audited entries. Surprise and Remix remain deterministic. No inventory ownership, economy, serial, reservation or shared cinematic source was changed.

## Defects repaired at their owners

| Failure | Cause | Repair |
|---|---|---|
| A camera move could appear static or frame the wrong location | Saved explicit camera position/rotation/focus distance and shake overrode authored orbital keys | Camera move construction clears competing coordinates and retains unrelated motion |
| Applying movement duplicated existing titles/cameras/channels | The built motion payload inherited unrelated animation data from the base scene | Authored move/animation builders isolate their payload; combine retains existing unrelated animation once |
| Legacy scene replacement could leave an edited card offstage | Original builder copied the current card transform | Reset the authored pose while preserving source identity, side and plate |
| Existing scenes changed identity when using old names | Studio, Sunset Desk and Void were aliases for different compositions | Restore distinct stable legacy scene entries and deterministic prop IDs |
| Moonlight rig could replace the whole composition | Name-only lookup found the scene before the identically named rig | Resolve light-panel choices by category; verify camera, props and color are preserved |
| Rig replacement churned object IDs | Old objects stayed in the collision set even when being replaced | Replacement excludes removed IDs; added objects receive fresh IDs |
| Adding a rig was blocked by a locked existing light | Lock checks treated addition as replacement | Adding objects respects existing locks without modifying them; replacement still requires affected objects to be unlocked |
| Preset application could silently inherit Add across categories | One session-wide preference controlled all categories | Explicit category-specific application copy and reset on category changes; budget overflow fails before normalization can truncate data |
| Glass shards sampled an empty refraction image | Only glass cases triggered the refraction snapshot | Shards participate in the same bounded snapshot pass |
| Moving/scaling a grid-floor prop left its grid stationary | Pattern used world coordinates | Pattern uses local UVs, preserving the original default density |
| Preset previews showed stale or incomplete compositions | Cache keyed only by preset ID, forced the card visible, used Low regardless of active quality, and borrowed companion art from the live stage | Scene/tier/seed invalidation, active-tier rendering, real sampled motion, and separate bounded companion-card assets |
| Preset cards collapsed into thin lines | Grid rows shrank despite their image content | Intrinsic content rows and contained scrolling |
| Changing color theme left baked faces/previews stale | Only quality changes repainted the printed face | Color/monochrome changes repaint Studio resources and invalidate previews |
| Inspector folds leaked into the next inspected object | Fold state was recorded after changing the selected kind | Record the outgoing panel's state first |
| Empty numeric drafts and keyboard/double-click resets left misleading values | Component display state did not stay synchronized with the committed value | Restore last valid drafts and synchronize numeric/slider/reset values |
| Backdrop color tools could navigate into light controls | General backdrop color used light-only swatches/temperature actions | Backdrop color remains in its own inspector; native picker, hex and HSV values stay synchronized |
| Narrow Pro workspace overflowed the window | Implicit grid minimum sizes and long header labels | Explicit bounded columns and named compact phone actions |

## Application semantics

Replacing a scene replaces the composition and preserves the collected card source/serial. Replacing a rig changes lighting and its associated channels; adding a rig retains existing lights and motion. Applying a look changes post processing and its own channels, while preserving camera, objects and backdrop. Prop replacement affects the prop arrangement. Camera moves replace camera motion; Append places a move after the current timeline within the existing 15-second bound. Animation replacement affects matching channels; Add retains tracks and clearly states that newer matching tracks take precedence during playback. Every application uses one existing history transaction and supports exact Undo/Redo.

Source and authoring limits remain separate from effective renderer budgets. Lower-quality previews omit excess objects from the render copy, leaving saved authored data intact. Addition or timeline overflow reports an error before lossy normalization. Collection props require owned companion instances. Light Sweep/Flicker require a spatial light; Prop Orbit requires a non-stage prop. These prerequisites remain explicit actionable errors.

## Background contract

Scene JSON stays version 2, with version 1 migration supported and no gameplay save-schema change. Backdrop gains optional fields:

`pattern: 'stage' | 'solid' | 'gradient' | 'grid'`, `position: [x,y,z]`, `offset: [u,v]`, `rotation: [x,y,z]` in degrees, and `scale: [x,y,z]`.

Position/offset are finite and clamped to −20…20; rotation to −180…180; scale to 0.05…6. Older scenes receive the original stage, zero position/offset/rotation and unit scale. These fields serialize, sample through Director tracks, participate in group transforms, persist in Last scene/photos and use normal undo history. They do not alter the camera or card pose. The background is selected through Layers rather than a fake foreground hit box.

WebGL transforms its stage rays into backdrop-local space. Grid and gradient patterns use that space; stage light response and depth remain spatial. The Simple renderer uses a bounded 2D projection with translated/rotated/scaled procedural decoration. Solid color is intentionally translation-invariant. Full Simple/Advanced background workflows remain later stages; Stage 1 supplies the durable contract and Pro inspector foundation.

## Verification performed

- `node --test tests/studio-stage1.test.cjs`: seven focused regression tests pass. The deterministic audit covers all 103 entries, five adaptation profiles, all five quality budgets, canonical scene/preset serialization, finite data and procedural meshes, supported object types, unique IDs, valid animation targets, framing and resource bounds: **2,575 source cases**. It labels its results `rendered: false`.
- `node tools/check-studio-stage1-browser.cjs`: offline Edge/Chromium, temporary browser profile, actual `file://index.html?dev=1`, local artwork and fonts. All 103 entries render across seven identities and five tiers. Static presets sample once; moves/animations sample the start, 35% and end. **5,565 rendered samples** pass image variation and readback checks, with additional High full-scene primary-card visibility comparisons. Collection props wait for their own real art assets.
- The existing explicit `Cardable.dev.checkStudio2()` passes **43 checks** in 11 ms. Its stale catalog/limit assertions were updated to the actual existing implementation.
- Real browser controls verify preset tile application, exact one-command Undo/Redo, category application reset, typed bounds, empty-draft restoration, grouped scrubbing, keyboard numeric/panel controls without accidental orbit, live Director Play/Pause, stable stage geometry when folding, color/hex/HSV synchronization, independent backdrop history, the original/grade divider, immersive Escape return, live theme repaint and the shared-control gallery.
- Photo capture decodes to **1920 × 1080**, saves scene JSON, reopens that scene, and preserves a seeded prior Album blob byte-for-byte. Inspect exits to the existing detail view and re-entry restores backdrop position.
- Pixel comparisons show moved stage/gradient/grid backgrounds change in both WebGL2 and Simple; translated solid remains identical. Both renderers remain export-safe.
- Rendered screenshots reviewed at 1920 × 1080, 1440 × 900, 1280 × 720, 1024 × 768 and 390 × 844, covering Pro, Simple, presets, Look, Animate, immersive preview, color and saved monochrome. Final phone root width is 390px with a 340px stage and 325px stage height.
- Browser reports **zero JavaScript/console errors and zero HTTP(S) requests**. Syntax checks and `git diff --check` pass.

Reference identities: Basic — radeon-hd-2400-pro; AMD — radeon-7000; Holo — radeon-hd-2400-pro / rainbow-holo; Matte — radeon-7000 / matte; Cosmic — geforce-gtx-1080-ti / galaxy-holo; Classic — radeon-hd-2400-pro / classic; Legendary — geforce-gtx-1080-ti.

## Evidence and rerun

The focused tests and browser harness are committed. Generated evidence is local and ignored under `qa-output/director-stage1/`: `source-audit.json`, `runtime-evidence.json`, seven scene contact sheets and the color/monochrome layout screenshots. The browser harness uses the available Playwright package and installed Edge in a disposable profile. It never opens the active desktop installation. Set `NODE_PATH` to the local Playwright package directory if it is not installed in this checkout.

## Limits

Rendered checks cover the listed identities, states and sample times, not every GPU/skin/variant combination or every animation frame. Visual review is a local development assessment; the owner's final art-direction acceptance remains separate. Very High is exercised directly by the render harness, which does not certify the interactive hardware gate, performance, physical devices or GPU drivers. Electron packaging/installer/updater, clip recording, clipboard permission behavior and broader gameplay suites were not run. Album evidence proves the tested existing blob/capture/reopen route; it is not a backup of the owner's live Album.

The saved theme/accent, current 100-command history, quality budgets, offline classic-script loading and existing photo origin were retained. Optional background fields do not require a new save schema. No desktop delivery or release is pending from this branch; integration/delivery requires the separate owner-approved step.

## Every authored entry

Each row below was checked by source validation and by the seven-identity/five-tier render matrix. IDs are preserved; the three legacy scene rows are restored identities. Render pass means no empty/flat image, readback failure or invisible full-scene primary subject in the sampled matrix, not blanket visual approval.

| Kind | ID | Name | Source | Render matrix |
|---|---|---|---|---|
| scene | `scene:museum` | Museum | Pass | Pass, 35 identity/tier cases |
| scene | `scene:showroom` | Showroom | Pass | Pass, 35 identity/tier cases |
| scene | `scene:gallery-wall` | Gallery Wall | Pass | Pass, 35 identity/tier cases |
| scene | `scene:pedestal` | Pedestal | Pass | Pass, 35 identity/tier cases |
| scene | `scene:product-white` | Product White | Pass | Pass, 35 identity/tier cases |
| scene | `scene:dark-seamless` | Dark Seamless | Pass | Pass, 35 identity/tier cases |
| scene | `scene:gradient-sweep` | Gradient Sweep | Pass | Pass, 35 identity/tier cases |
| scene | `scene:paper-sweep` | Paper Sweep | Pass | Pass, 35 identity/tier cases |
| scene | `scene:noir` | Noir | Pass | Pass, 35 identity/tier cases |
| scene | `scene:vault` | Vault | Pass | Pass, 35 identity/tier cases |
| scene | `scene:moonlight` | Moonlight | Pass | Pass, 35 identity/tier cases |
| scene | `scene:candlelit` | Candlelit | Pass | Pass, 35 identity/tier cases |
| scene | `scene:neon-alley` | Neon Alley | Pass | Pass, 35 identity/tier cases |
| scene | `scene:synthwave-grid` | Synthwave Grid | Pass | Pass, 35 identity/tier cases |
| scene | `scene:arcade` | Arcade | Pass | Pass, 35 identity/tier cases |
| scene | `scene:cyber-rain` | Cyber Rain | Pass | Pass, 35 identity/tier cases |
| scene | `scene:workbench` | Workbench | Pass | Pass, 35 identity/tier cases |
| scene | `scene:clean-room` | Clean Room | Pass | Pass, 35 identity/tier cases |
| scene | `scene:server-hall` | Server Hall | Pass | Pass, 35 identity/tier cases |
| scene | `scene:teardown` | Teardown | Pass | Pass, 35 identity/tier cases |
| scene | `scene:throne` | Throne | Pass | Pass, 35 identity/tier cases |
| scene | `scene:aurora` | Aurora | Pass | Pass, 35 identity/tier cases |
| scene | `scene:eclipse` | Eclipse | Pass | Pass, 35 identity/tier cases |
| scene | `scene:stage-spotlight` | Stage Spotlight | Pass | Pass, 35 identity/tier cases |
| rig | `rig:three-point` | Three-point | Pass | Pass, 35 identity/tier cases |
| rig | `rig:rim-and-fill` | Rim and Fill | Pass | Pass, 35 identity/tier cases |
| rig | `rig:butterfly` | Butterfly | Pass | Pass, 35 identity/tier cases |
| rig | `rig:rembrandt` | Rembrandt | Pass | Pass, 35 identity/tier cases |
| rig | `rig:top-softbox` | Top Softbox | Pass | Pass, 35 identity/tier cases |
| rig | `rig:split-light` | Split Light | Pass | Pass, 35 identity/tier cases |
| rig | `rig:backlight-halo` | Backlight Halo | Pass | Pass, 35 identity/tier cases |
| rig | `rig:colored-gel-duo` | Colored Gel Duo | Pass | Pass, 35 identity/tier cases |
| rig | `rig:practical-neon` | Practical Neon | Pass | Pass, 35 identity/tier cases |
| rig | `rig:sunset-window` | Sunset Window | Pass | Pass, 35 identity/tier cases |
| rig | `rig:moonlight` | Moonlight | Pass | Pass, 35 identity/tier cases |
| rig | `rig:candle-flicker` | Candle Flicker | Pass | Pass, 35 identity/tier cases |
| look | `look:clean` | Clean | Pass | Pass, 35 identity/tier cases |
| look | `look:cinematic-teal-orange` | Cinematic Teal-Orange | Pass | Pass, 35 identity/tier cases |
| look | `look:noir` | Noir | Pass | Pass, 35 identity/tier cases |
| look | `look:kodak-style-warm-film` | Kodak-style Warm Film | Pass | Pass, 35 identity/tier cases |
| look | `look:cool-chrome` | Cool Chrome | Pass | Pass, 35 identity/tier cases |
| look | `look:vaporwave` | Vaporwave | Pass | Pass, 35 identity/tier cases |
| look | `look:matte-dream` | Matte Dream | Pass | Pass, 35 identity/tier cases |
| look | `look:high-key-white` | High-Key White | Pass | Pass, 35 identity/tier cases |
| look | `look:neon-night` | Neon Night | Pass | Pass, 35 identity/tier cases |
| look | `look:bleach-bypass` | Bleach Bypass | Pass | Pass, 35 identity/tier cases |
| props | `props:tech-bench` | Tech Bench | Pass | Pass, 35 identity/tier cases |
| props | `props:trophy-corner` | Trophy Corner | Pass | Pass, 35 identity/tier cases |
| props | `props:fan-array` | Fan Array | Pass | Pass, 35 identity/tier cases |
| props | `props:cable-garden` | Cable Garden | Pass | Pass, 35 identity/tier cases |
| props | `props:card-wall` | Card Wall | Pass | Pass, 35 identity/tier cases |
| props | `props:stacked-fan` | Stacked Fan | Pass | Pass, 35 identity/tier cases |
| props | `props:glass-cube-display` | Glass Cube Display | Pass | Pass, 35 identity/tier cases |
| props | `props:floating-shards` | Floating Shards | Pass | Pass, 35 identity/tier cases |
| move | `move:hero` | Hero | Pass | Pass, 35 identity/tier cases |
| move | `move:close-up` | Close-up | Pass | Pass, 35 identity/tier cases |
| move | `move:reveal` | Reveal | Pass | Pass, 35 identity/tier cases |
| move | `move:turntable` | Turntable | Pass | Pass, 35 identity/tier cases |
| move | `move:crane-up` | Crane Up | Pass | Pass, 35 identity/tier cases |
| move | `move:whip-pan-settle` | Whip Pan Settle | Pass | Pass, 35 identity/tier cases |
| move | `move:dolly-zoom` | Dolly Zoom | Pass | Pass, 35 identity/tier cases |
| move | `move:orbit-left` | Orbit Left | Pass | Pass, 35 identity/tier cases |
| move | `move:orbit-right` | Orbit Right | Pass | Pass, 35 identity/tier cases |
| move | `move:handheld` | Handheld | Pass | Pass, 35 identity/tier cases |
| move | `move:slow-float` | Slow Float | Pass | Pass, 35 identity/tier cases |
| move | `move:spec-sweep` | Spec Sweep | Pass | Pass, 35 identity/tier cases |
| move | `move:beauty-pass` | Beauty Pass | Pass | Pass, 35 identity/tier cases |
| animation | `animation:float` | Float | Pass | Pass, 35 identity/tier cases |
| animation | `animation:pulse-glow` | Pulse Glow | Pass | Pass, 35 identity/tier cases |
| animation | `animation:slow-tilt-reveal` | Slow Tilt Reveal | Pass | Pass, 35 identity/tier cases |
| animation | `animation:showcase-spin` | Showcase Spin | Pass | Pass, 35 identity/tier cases |
| animation | `animation:light-sweep` | Light Sweep | Pass | Pass, 35 identity/tier cases |
| animation | `animation:flicker-safe` | Flicker (safe) | Pass | Pass, 35 identity/tier cases |
| animation | `animation:breathing-camera` | Breathing Camera | Pass | Pass, 35 identity/tier cases |
| animation | `animation:prop-orbit` | Prop Orbit | Pass | Pass, 35 identity/tier cases |
| animation | `animation:variant-glint` | Variant Glint | Pass | Pass, 35 identity/tier cases |
| scene | `scene:silicon-cathedral` | Silicon Cathedral | Pass | Pass, 35 identity/tier cases |
| scene | `scene:foundry` | Foundry | Pass | Pass, 35 identity/tier cases |
| scene | `scene:observatory` | Observatory | Pass | Pass, 35 identity/tier cases |
| scene | `scene:glass-atrium` | Glass Atrium | Pass | Pass, 35 identity/tier cases |
| scene | `scene:datacenter-aisle` | Datacenter Aisle | Pass | Pass, 35 identity/tier cases |
| scene | `scene:dark-gallery` | Dark Gallery | Pass | Pass, 35 identity/tier cases |
| scene | `scene:sandbox-mini` | Sandbox Mini | Pass | Pass, 35 identity/tier cases |
| scene | `scene:zero-g` | Zero-G | Pass | Pass, 35 identity/tier cases |
| rig | `rig:edge-light-trio` | Edge Light Trio | Pass | Pass, 35 identity/tier cases |
| rig | `rig:cathedral-shaft` | Cathedral Shaft | Pass | Pass, 35 identity/tier cases |
| rig | `rig:gel-split-warm-cool` | Gel Split Warm/Cool | Pass | Pass, 35 identity/tier cases |
| rig | `rig:under-glow` | Under-Glow | Pass | Pass, 35 identity/tier cases |
| look | `look:silver-print` | Silver Print | Pass | Pass, 35 identity/tier cases |
| look | `look:night-chrome` | Night Chrome | Pass | Pass, 35 identity/tier cases |
| look | `look:soft-pastel` | Soft Pastel | Pass | Pass, 35 identity/tier cases |
| look | `look:heat-haze` | Heat Haze | Pass | Pass, 35 identity/tier cases |
| look | `look:ink-wash` | Ink Wash | Pass | Pass, 35 identity/tier cases |
| look | `look:cobalt-film` | Cobalt Film | Pass | Pass, 35 identity/tier cases |
| move | `move:orbit-reveal` | Orbit Reveal | Pass | Pass, 35 identity/tier cases |
| move | `move:spiral-push` | Spiral Push | Pass | Pass, 35 identity/tier cases |
| move | `move:rack-focus-pair` | Rack Focus Pair | Pass | Pass, 35 identity/tier cases |
| move | `move:slow-crane-down` | Slow Crane Down | Pass | Pass, 35 identity/tier cases |
| move | `move:detail-crawl` | Detail Crawl | Pass | Pass, 35 identity/tier cases |
| move | `move:pendulum` | Pendulum | Pass | Pass, 35 identity/tier cases |
| scene | `scene:studio` | Studio | Pass | Pass, 35 identity/tier cases |
| scene | `scene:sunset-desk` | Sunset Desk | Pass | Pass, 35 identity/tier cases |
| scene | `scene:void` | Void | Pass | Pass, 35 identity/tier cases |
