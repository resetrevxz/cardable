# Director Mode — Stage 4 finish and verification

Stage 4 was completed locally on `feature/director-mode-update` in `D:/CardableV2/DirectorModeUpdate`. At that checkpoint the primary checkout, other worktrees and installed app were unchanged, and this stage brief did not authorize publication or integration. The owner's subsequent request explicitly authorizes merging the reviewed work and releasing **1.7.2**; see [release notes](../changelog/1.7.2.md). The original acceptance evidence and limits below remain applicable.

## What changed

Simple retains Look → Adjust → Capture and the same scene/history as Advanced. Composition tools now have clearer stacked SVG icons and labels. With Move background selected, scrolling scales the background; dragging and arrow keys reposition it independently of the collectible and even a locked camera. The existing slider, rotation and reset alternatives remain. Hidden/locked backgrounds disable the corresponding Simple controls with an explanation.

Advanced has a quieter hierarchy: one selected row per object, more width for names, and persistent visibility/lock controls. The inspector separates backdrop transforms from appearance. Reset background transform restores position/offset/orientation/scale only, retaining the selected style and color. The header responds to actual owner width through a local container query, so interface zoom no longer crowds mode and action buttons together. Existing timeline, color stages, overlays, inspector groups, focus, saved monochrome and immersive preview remain functional.

Right-click commands now use the actual main Cardable menu, including its glass/ink surface, icons, shortcut hints, selection spring, bounded entrance/exit, keyboard navigation and quality/motion policy. Studio supplies the heading and actions. Layer context selects the clicked object; Graphics context duplicates/deletes the selected graphic; Simple context offers its three steps and Advanced. Native input menus remain available. Menu positioning measures the actual UI scale and safe area. No second animation renderer or idle clock was added.

The preset browser is narrower on desktop and adds Preview beside the existing favorite and Apply actions. A trial affects presentation only. Apply preview makes one undoable edit; Return, closing, changing application semantics and exiting cancel it. Trials never write the scene, history or recents. Preview graphics/titles use the complete sampled scene rather than the stripped render copy. All prior preset IDs, user presets, favorites, recents, named slots and Album data remain supported.

## Defects repaired in this pass

| Defect | Repair and evidence |
|---|---|
| Studio context rows inherited `opacity:0` without the main menu's open state | Reuse the shared menu owner/painter; actual rows reach their visible states, with disabled actions labelled |
| Stationary right-click began/adopted a camera edit; right drag could open commands too | Defer camera editing until movement; distinguish the pointer release from duplicate native context events; exact scene/undo checks |
| Context commands operated on the old selection or the 3D scene while editing Graphics | Select the clicked layer and route Graphics/Simple actions to their respective owners |
| Reusing a main-menu host created before Studio could leave it behind the Studio overlay | Exclude the shared menu host from Studio background hiding and give Studio-owned menus the next overlay level; coarse regression opens the main menu first and verifies the menu is the actual pointer hit surface |
| Enlarged interface scaling placed menus beyond the window | Convert event and submenu coordinates through the menu host's real scale; clamp measured surfaces to the visible safe area |
| Header mode/actions overlapped at 150% UI scale | Actual-width container wrapping; explicit button overlap assertions at 80%, 125%, 150% |
| Focused menu row and internal selected row could disagree | Synchronize selection on native focus; main submenu keyboard regression |
| Reduced-motion surface transform was overridden by the open-state selector | Correct scoped CSS specificity; runtime reduced pose is `none`, Very Low uses zero transition and no backdrop blur |
| Hiding a backdrop restored the default stage and left background dressing visible | Render hidden background as solid black, filter its tagged dressing, preserve authored transforms and independent supports |
| Background wheel gesture still dollied the camera in Simple | Route Move background wheel to the backdrop, including locked-camera and one-undo verification |
| New preset trial overlay initially lacked timed-title data | Paint from the complete sampled trial scene; final menu/preview journey has a clean console |
| Saved-preset trials can differ in printed card information | Paint one bounded temporary face when required; restore the original renderer face and release/cancel temporary work on Return/close |

Stage 1 repaired category ambiguity, invalid motion/IDs/budgets and legacy presets. Stage 2 aligned supports/cases/easels/floors/halos to the actual card and adapted peripheral dressing for portrait shots. Stage 3 repaired solid-backdrop depth, color-curve evaluation, grouped Auto Key, camera guards and key collisions. This final visual audit retained all **115 entries**: **47 scenes, 16 rigs, 16 looks, 8 prop sets, 19 camera moves and 9 animations**. No troublesome entry was excluded or renamed. The final contact sheets show distinct authored styles, visible GPU art, intact subject framing and aligned supports; sparse and intentionally dark presets retain their authored treatment.

## Actual verification

All browser runs used disposable headless Edge profiles with the worktree's real `file://index.html?dev=1`, locally bundled artwork/fonts and temporary owned-card fixtures. No player profile was used. Final evidence files contain no JavaScript/console errors or HTTP(S) requests.

| Check | Actual result |
|---|---|
| Node Stage 1–4 regression tests | **23 passed**; includes deterministic source/build/sample/serialize validation, **2,875 source cases**, IDs, category semantics, budgets, framing, undo, locks, background visibility and Auto Key |
| New Stage 4 menu/UI browser harness | **12 journey checkpoints**, **64 route/theme/width layouts**, **32 route screenshots** at 390/768/1280/1920; menu, focus, input, right-drag, preview cancellation/application, background movement, reduced motion, low quality, zoom and original main menu |
| Final preset render matrix | **115 × 5 actual card references × 5 tiers = 2,875 renders**, with alternating portrait/landscape ratios; nonflat pixel validation at every entry |
| Serious scene composition images | **47 × 5 references × 2 aspects = 470 additional High renders** in ten contact sheets; Basic Radeon HD 2400 Pro, Legendary GTX 1080 Ti, Unusual RTX 5090, Classic skin and Rainbow Holo RX 5700 XT |
| Background pixels | Stage, gradient and grid change visibly after transforms in WebGL and CPU; uniform solid color remains unchanged by translation |
| New actual photo files | Decoded PNG **1080×1350**, JPEG **2048×2560**, WebP **3840×2160**, with moved background and metadata graphics |
| Existing Simple browser workflow rerun | **94 complete scene journeys**, each applying one of 47 looks, editing, capturing, writing/getting IndexedDB blobs, returning to edit and downloading; PNG/JPEG/WebP, five shapes, real 4K PNG, caption/frame, two-card Album reopening, fallback and failure/retry checks |
| Preview versus saved output | Simple rerun measured mean absolute decoded difference **1.10488 / 255** at matching frozen dimensions; this is one measured reference, not a universal pixel-equivalence claim |
| Existing Advanced browser workflow rerun | **14 checkpoints**, **113 rendered effect comparisons** across tiers, curve/wheel undo, scopes, camera locks, overlay placement in all photo formats, timeline/Bezier/key operations, background scrubbing, decoded three-frame WebM, **32 layouts**, reentry and live kit gallery |
| WebGL failure and lifecycle harness | **4 checkpoints**: actual WebGL2 factory failure → CPU, saved quality unchanged, hidden/locked controls, close at sample 2 of a tiled capture, reentry, decodable IndexedDB photo and **exactly one** photo event |
| Coarse-pointer and final visual pass | Actual **44×44** hierarchy controls and **44 px** menu rows, saved-preset printed-face trial/return, monochrome phone, poster workspace and non-overlapping viewport/inspector at 150% scale |
| Resource cancellation | Mid-render cancel: scheduler subscribers **19 → 19**. Closing capture: renderer/output width **1**, pending scheduler work cleared, job released/cancelled, **zero** photo events. Inventory fixture and currency unchanged |
| Built-in Studio logic check | `Cardable.dev.checkStudio2()` **43 passed**, 17 ms in the preset/export run |
| Script order/assets | `verify-assets.cjs`: **185 scripts and 57 stylesheets exist**; classic/offline loading retained. Changed/new scripts checked with `node --check`; reviewed diff checked with `git diff --check` |

The source-data harness and real rendered validation are separate. Render matrix checks do not claim artistic acceptance of every camera frame; contact sheets and representative full screenshots were inspected separately. The accepted outputs are generated by the actual renderer/encoder, not CSS mockups.

## Evidence and owners

Ignored artifacts remain in `qa-output/director-stage4/`: `runtime-evidence.json`, `runtime-evidence-quality.json`, `runtime-evidence-lifecycle.json`, `advanced-context.png`, `preset-preview.png`, `simple-adjust.png`, `menu-scale-150.png`, `main-context-regression.png`, `webgl-unavailable.png`, the route/theme screenshots, ten named preset contact sheets and the three photo files. Fresh Simple/Advanced regressions also write their evidence in `qa-output/director-stage2/` and `qa-output/director-stage3/`. No generated images or test profiles are committed.

Runtime owners: `src/ui/context-menu.js`; `src/ui/kit/components/context-menu.css`; `src/ui/kit/components/studio-advanced.css`; `src/studio/ui/workspace.js`, `simple.js`, `presets.js`, `graphics.js`; `src/studio/director.js`, `studio.js`, `scene.js`. Regression owners: `tests/studio-stage4.test.cjs`; `tools/check-studio-stage4-{browser,quality-browser,lifecycle-browser,coarse-browser}.cjs`. New interaction contracts are documented in `Designs.MD` and `docs/ARCHITECTURE.md`.

## Compatibility, performance and integration limits

Scene version remains **2** and game save schema remains **5**. Existing optional backdrop transforms, graphics and grading data migrate through the existing parser. There is no change to inventory ownership, serial minting, pack reservations, currency, gameplay economy or photo blob identity. Scene replacement still explicitly replaces the composition; rigs, looks, prop sets and motion keep their established separate semantics.

The CPU fallback is an honestly labelled static preview without spatial props, gizmos or costly optics; blur and 4K remain disabled where unsupported. A solid background cannot show translation. Native Electron capture dialogs, installed Safe Mode, physical pinch gestures, live context loss/recovery, long recordings, broad hardware performance and combined Shop/Market installation acceptance were not certified. Synthetic WebGL factory failure, CPU output and browser file routes were exercised. No universal FPS or GL-memory claim is made; measurements above cover the actual bounded runs and release paths.

Preset preview uses the existing renderer, asset owner, shared scheduler and bounded thumbnail cache. Scopes still stop off-route; the Advanced regression verifies that behavior. Menu selection animation uses the existing scheduler only while the surface is open/moving; close unsubscribes. No cosmetic canvas, permanent private RAF, CDN or extra full-card grid instance was introduced.

Prior local commits: `4d0e6d9` (Stage 1), `119d8ca` (Stage 2), `0cd01fb` (Stage 3). This pass is committed as **`stage 4: finish Cardable Studio menus and visual polish`**. Delivery remains owner-controlled. Read-only branch comparison found shared edited paths with Shop in `Designs.MD`, and with Market in `Designs.MD`, `index.html`, `src/data/key-actions.js`, `src/ui/detail.js`, `src/ui/kit/gallery.js` and `src/ui/kit/index.js`. Those need deliberate integration and a combined runtime pass; no other branch was changed.
