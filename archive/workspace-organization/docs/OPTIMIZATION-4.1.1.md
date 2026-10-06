# Cardable 4.1.1 optimization

The owner selected 4.1.1 after the repository advanced to Electron 4.1.0 during this work. The patch retains the integrated graphics improvements, game rules, save schema and cinematic safety behavior, and removes unnecessary work in the current desktop/browser runtime.

## Presets and controls

Very Low uses static lightweight materials, minimal decoration, solid panels and calm Canvas cinematics. Low retains the visual identity with restrained reflection, particle and update budgets. Medium is the balanced fresh-save default. High retains full focused-card and cinematic presentation.

Finishes, reflections, props, particles, shadows, glass, background, ambient animation, canvas resolution and cinematic detail can be adjusted independently across the four tiers. FPS choices remain Display refresh, 20, 30, 45, 60, 90, 120, 144, 165 and 240. The loop respects display cadence, visible-unfocused Normal/30 FPS/pause, reduced motion and hidden visual sleep. Browser background modes control timer/title activity; desktop retains its low-frequency refill/native service for Mini and taskbar while visuals sleep. Battery saver temporarily lowers effective settings without rewriting saved choices.

## Current fixes and measurements

The viewport now listens to the browser resize event. Previously, it subscribed to the `layout:resize` notification it emitted, scheduling another complete update every frame. The corrected update caches unchanged geometry and preserves real resize/zoom/DPR changes. Visibility, battery and position notifications no longer trigger redundant geometry work.

Native runtime notifications and taskbar progress skip identical values; reload receives an explicit runtime-state handoff. The renderer skips identical native pack payloads. Mini updates only changed skin structure, labels, state and fluid, and receives all ten independent graphics settings. Wrapper detail uses the lower of material/reflection quality. Ready cues retain their focus/refill behavior without clearing an inactive cue repeatedly.

`tools/check-desktop-optimization.cjs --baseline` ran against 4.1.0 before changes; the normal command ran against the patch. Both use disposable native profiles, real BrowserWindows and actual IPC.

| Work | Before | After |
| --- | ---: | ---: |
| Layout refreshes during 12 position changes | 183 | 0 |
| Native runtime notifications during those moves | 12 | 0 |
| Pack payloads for 25 identical full-stock events | 25 | 0 |
| Taskbar updates for those events | 25 | 0 |
| Settled Very Low visual frames over 1.1 seconds | Continuous resize wakeups | 0 |

The idle check parks the pointer away from interactive chrome and waits for transitions to settle. Real resizing still refreshes layout. Acceptance also covers forty Mini skin/preset combinations, independent reflection/particle choices, invalid tier rejection, hidden visual sleep, elapsed refill, restore, reload and minimize/restore. Zero application errors and HTTP requests were observed.

The logger fixture now models stdout/stderr and verifies that a closed launcher pipe disables console transport without recursion; all eight Electron service tests pass.

## Integrated rendering evidence

The earlier inventory work reduced moving High Shelf/Grid median gaps from about 67/83 ms to 16.7 ms in scoped headless samples. Shaded Settings improved the High Mythical preview sample from about 22 to 49 FPS. Complete matrices and limits are in 06-INVENTORY.md and GRAPHICS-REFRESH.md.

Controlled before/after/after/before software-renderer cinematic samples averaged 13.24 to 18.65 FPS for Secret (41% higher) and 0.92 to 4.22 FPS for Ascendant (4.6 times). Mythical varied, so no substantial gain is claimed. These are software Chromium stress results, not desktop FPS. Integrated changes reuse texture storage, use separable bloom, respect the existing pixel ceiling, cache authored Ascendant fog and skip invisible shader work.

Pixel checks cover twenty composite configurations, twenty color/mono Ascendant frames and eight changing Secret source/mask frames with resizing and real RAF boundaries. Comparisons tolerate up to three byte-level brightness steps for fog/bloom, with no WebGL errors. Safety still samples final displayed output.

The completed browser record has 48 journeys: forty pack/preset openings, five complete High/Full/Safe films, Secret Full, Ascendant Short/skip and pending-reveal reload/Delete. Reservation, Keep, exact ownership, settled currency and reload checks passed. Safe/Full Secret stayed within the measured two-flash-per-second implementation limit; this is not medical certification.

Evidence: `D:/CardableV2/outputs/graphics-profiles/cinematic-paired.json`, `D:/CardableV2/outputs/v3-optimization/journeys-qa.json`, `outputs/graphics-refresh`, and ignored `qa-output/optimization`. Original desktop source copies are under `outputs/graphics-profiles/desktop-4.1.0-source`; Git baseline is 29df547.

## Native scene and release acceptance

The source Electron profiler samples sixty sequential scenes across four presets, covering pack skins, Settings, detail, moving Shelf/Grid, Studio and three costly cinematic paths. Hardware acceleration is enabled on this host's 240 Hz display. Browser cadence is recorded separately from game-loop counts; static screens and scoped Studio callbacks must not be described using FPS-display event counts alone.

The sixty-scene source matrix completed without application errors or HTTP requests. High menus, Studio and most sampled intros approached this host's 240 Hz cadence; moving High Shelf/Grid were approximately 238/227 FPS. These short samples cover particular scenes, not an entire-film average.

Secret was repeated in before/after/after/before order, using the complete packaged 4.1.0 baseline and 4.1.1 source with the same Electron 44.5.1. The packaged baseline viewport/QoL source matches Git 29df547. Each tier has two three-second samples per version; no other game instance ran during the after samples. Results vary between runs, so these are scoped measurements rather than device guarantees.

| Secret scene | Before mean FPS | After mean FPS | Improvement |
| --- | ---: | ---: | ---: |
| Low | 98 | 193 | 97% |
| Medium | 94 | 199 | 111% |
| High | 95 | 194 | 105% |

The first Low baseline sample overlapped the end of a separate functional check; the second isolated baseline was also 98 FPS. Medium/High baseline runs ranged from 81 to 109 FPS, and after runs from 187 to 211. Evidence is `qa-output/optimization/native-paired-{before-1,after-1,after-2,before-2}.json` alongside `desktop-4.1.0.json` and `desktop-4.1.1.json`.

Physical phones, basic laptops and midrange GPU performance remain unmeasured. Heavy scenes can fall below display cadence; this release does not promise 240+ FPS on every device or every cinematic.

## Dismissed desktop error

The owner reported a Cardable updater error whose dialog text was dismissed. The player's bounded desktop log contains no recent updater failure. This build has no configured public release repository, and its updater does not automatically check/download/install. The detached source baseline used for testing lacked `electron-updater`; resolving its dependencies reproduces `MODULE_NOT_FOUND`, consistent with a native startup dialog before logging initializes. The exact dismissed message cannot be recovered, so this remains a likely explanation rather than a confirmed attribution.

The profiler now checks source dependencies before launching Electron, preventing that incomplete test copy from showing a native startup-error dialog. Comparisons use the complete 4.1.0 package. Service checks cover update errors/retry, deduplicated checks, confirmed download/install and unconfigured/offline behavior. Tests and profiles use disposable data directories, separate from the player's save.

## Release verification

The isolated build is `dist/optimization-4.1.1/Cardable-Setup-4.1.1.exe`, with the executable under `dist/optimization-4.1.1/win-unpacked`. No installation, player-save migration or public release was performed. Older builds remain available.

Passed on the current browser source:

- Graphics regression: ten independent controls, four preset migrations, 20/45 FPS pacing, twenty cinematic backend/tier combinations, hidden/unfocused sleep, real-time refill and DPR3 touch opening/Keep/reload.
- Inventory regression: 1,512 finish stacks at every tier, bounded Shelf/Grid, actual pointer drag, focused detail promotion/flip/return, favorite refresh, phone resizing, reduced motion and cleanup.
- Eight Electron service tests, local asset verification, release version/notes validation and focused whitespace checks.

Passed on the packaged 4.1.1 executable:

- ASAR verification: 178 local HTML resources and 246 JS/CSS files, matching version, icons, CSP and IPC channels, with no development fixture metadata.
- Native smoke: startup/security, gameplay, graceful flush, native backup recovery after cleared renderer storage and optional developer workspace.
- Desktop optimization: forty Mini skin/tier combinations, independent graphics, taskbar preference changes, interface scale/real resize, idle sleep, elapsed refill, native minimize/restore and a real 45 FPS keyboard charge/tear/pointer Keep with exact reload ownership, currency, stock and settings.
- Broad regression: real 600-instance Shelf/Grid and Studio/Director interactions; all ten pack types; native save export/import; exact card/serial/settings/Studio and IndexedDB photo persistence across process restart; second-instance restore; existing pack schedule, Picker, Journal, Achievements and Studio checks. No application errors or HTTP requests.
- Five complete High/Full/Safe films: Legendary, Mythical, Exotic, Ascendant and Secret. Actual displayed content, front-facing reveal, readable decision controls and pointer Keep passed, with exactly one added instance per film and zero application errors or HTTP requests. Evidence and screenshots: `qa-output/optimization/packaged-cinematics`.

The older native harness now completes 4.1's welcome/import/version prompts before interacting with pointer controls and checks the visible software-update panel. Evidence and reviewed screenshots are under `qa-output/optimization/packaged`; Mini and desktop counters are in `qa-output/optimization`. Chromium printed two GPU command-buffer messages during smoke-test process teardown; the application exited successfully and subsequent rendering/gameplay checks passed.
