# Director Stage 3 — Advanced creative workspace

Implemented only in `D:/CardableV2/DirectorModeUpdate`, on `feature/director-mode-update`, following Stage 2 commit `119d8ca`. The primary checkout, Shop, Market and other worktrees were inspected and not edited. No merge, release, version/schema bump, desktop delivery or installed-app replacement belongs to this stage.

## What changed

The Advanced workstation now has Scene, Light, Camera, Director, Color & Light, Graphics and Export pages. Card identity, real working-scene save feedback, named scene saving and quality stay in the header. The hierarchy has search and collapsible nested groups; the object/preset library folds away so it cannot cover the layer list. The viewport has quiet contextual tools, orientation views, labelled axis colors with monochrome equivalents, a transform-space readout, configurable snap increments, an editor grid and composition guides. Panels and the timeline resize by pointer or keyboard and retain bounded preferences. Small-window widths preserve a usable viewport; phone Director switches between Timeline and Properties instead of overlapping them. Immersive Preview removes manipulation and comparison chrome while keeping the finished image.

Color correction is organized into five independent stages. Each can be bypassed without changing its authored settings, or reset independently. Exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, saturation and vibrance affect real image data. Shadows/Midtones/Highlights wheels drive lift/gamma/gain with numeric RGB feedback. Master RGB and individual channel curves have draggable, keyboard-adjustable points and constrained smooth Hermite interpolation. WebGL and the fallback use the same correction equations; the fallback prepares bounded lookup tables rather than allocating arrays per pixel. Optical blur/bloom remain quality-aware; texture and vignette finish the corrected image. Existing histogram and waveform are now inspector surfaces sampling actual preview pixels, throttled to 4 Hz and stopped when hidden. Grade-preset replacement semantics remain explicit and undoable. Simple adjustments resume a bypassed Advanced stage in their own history action; merely switching modes never changes the scene.

Graphics introduces up to 32 persisted screen-space layers: text, actual GPU/rarity/serial/finish metadata, Cardable wordmark text, badges, lines and shapes/borders. Bundled Inter and JetBrains Mono remain the only typography choices. Layers move, resize, rotate, reorder, duplicate, lock and hide. Typed typography, color, opacity and transform controls accompany pointer and keyboard tools. Center/margin snapping has visible guides; Shift enables proportional resizing, and text corner resizing scales the type. Four additive layout templates provide collector posters, desktop showcases, phone wallpapers and square editions. They frame the existing collectible and preserve its pose, identity and existing layers. The same canvas painter composites graphics in preview, photo export and recorded/stepped clip paths; these are not HTML-only decorations.

Director retains legacy pose keys, typed property tracks, cameras, lights, titles, markers, work areas, Auto Key, repeat modes and easing. Its dock is resizable, phone layouts switch Timeline/Properties without overlap, labels include purposeful icons, empty track groups stay quiet, numeric poses use meaningful property bounds, and selected keys can be duplicated. Dragging onto an occupied frame cancels atomically; retiming also rejects collisions before mutation. Grouped placement and Auto Key avoid double transforms. Alignment and distribution treat a selected group as one unit and keep its internal spacing. Existing scene tools and timeline helpers were refined rather than duplicated.

The command and shortcut surfaces use Cardable's existing registries. The reference is searchable by category and reads actual user bindings, contexts and conflicts. G/R/S remain editing tools; R outside Studio keeps the existing card flip route. Space and shuttle/range/marker shortcuts belong to Director. Typing, native controls and locked objects remain protected. Live color and graphics specimens were added to the shared UI-kit gallery.

## Defects repaired during runtime inspection

| Defect | Repair and evidence |
|---|---|
| Channel curves changed data but did not alter WebGL output when nested uniform-array function calls were compiled | Evaluate the master and channels in separate shader expressions. All three channels participate in known-color output checks and the effect matrix. |
| Solid backgrounds rendered the framebuffer clear color instead of their saved color | The background pass uses LEQUAL at the far plane, then restores LESS for scene geometry. Known RGB swatches now match the saved color in every tier. |
| Saturation used luminance from before tonal correction; balance occurred after contrast | Recompute luminance after tonal correction and balance before contrast, consistently in WebGL and fallback. Known-color and pixel-effect checks cover the resulting order. |
| Comparison handles appeared before comparison was enabled | Initialize both controls hidden; immersive preview also suppresses the comparison render without losing its state. |
| The library overlapped the hierarchy when Director shortened the workspace | Give the hierarchy its own contained scroll and the collapsed library a non-shrinking footer. |
| Group bounds included a fictitious mesh and grouped Auto Key could apply movement twice | Exclude virtual group boxes; place physical members once. Focused tests verify sampled movement, inherited locks and retained spacing. |
| Key drags silently discarded keys at duplicate times | Cancel collisions and preserve both authored keys. Actual pointer dragging onto an occupied frame is verified. |
| Timeline resizing lost border pixels on each keyboard increment | Use the saved desired height consistently and expose bounded separator values. |
| Narrow-window resize controls changed preferences without changing fixed CSS widths | Use responsive bounds and actual panel geometry; hide horizontal separators for stacked panels. Coarse-pointer layouts were reviewed at 960, 820 and 390 pixels. |
| A bypassed Advanced grade made Simple adjustments appear ineffective | Resume the relevant stage in the same undoable adjustment; explain paused, hidden or locked correction. |
| Metadata/custom text switching left the textarea in the wrong state | Synchronize displayed metadata, custom text and enabled state immediately. |
| Projection/crop actions could bypass a locked camera | Guard viewport controls and command routes. Actual interactions leave the locked camera unchanged. |
| Working-scene save feedback could claim success after a caught storage failure | Return save availability and report in-memory retention. Named scene feedback also distinguishes failed persistence. |
| Refreshing hierarchy rows briefly faded their text on each selection | Keep refreshed hierarchy rows and inspector headings readable immediately; retain restrained hover/state response. |

## Scene and rendering contracts

Scene JSON remains version 2 and gameplay schema remains 5. Optional `post.whites`, `post.blacks`, `post.channels`, `post.stages`, `graphics` and workspace preferences normalize explicitly. Older scenes get identity channel curves, enabled stages and no graphics. Existing authored IDs and all 115 catalog entries remain intact. No inventory ownership, economy, serial, variant-roll, pack reservation or shared cutscene implementation was changed.

Graphics geometry uses normalized picture coordinates, independent of the 3D camera/card/background. Static graphics coexist with existing timed Director titles. Background transforms and background animation remain on the established scene contract. Quality changes retain expensive authored settings while disabling unavailable controls. Renderer resources, title/graphic surfaces, tooltip owners and registered commands release on exit; no new private RAF or idle scope clock was introduced. Capture and export use the existing scheduler, separate Album blobs and file services.

## Acceptance evidence

The checks below use a disposable headless Edge profile and the worktree's actual `file://` entry. Reference inventory fixtures live only in that profile. They are not owner saves or newly minted game cards. Generated media and JSON evidence are ignored under `qa-output/director-stage3/`.

| Requirement | Authoritative evidence |
|---|---|
| Older scenes, identity, history and retained presets | 21 focused Node tests pass, including the earlier Stage 1/2 regressions. The deterministic source audit covers 115 entries × five profiles × five tiers = 2,875 cases. Source-data validation is labelled separately from rendering. |
| Actual correction and finishing effects | 113 bounded pixel comparisons across Very Low, Low, Medium, High and Very High. Every offered correction and supported finishing effect changes pixels; stage bypass retains authored values. |
| Color correctness | 25 known-color cases across all five renderers agree with the shared correction equations within two 8-bit levels. Identity, endpoints, smoothness, curve bounds and fallback-table accuracy also have focused tests. |
| Every retained preset renders | 1,150 real cases: all 115 entries × current holographic / Basic classic references × all five tiers. Each has non-flat image data. Prop animation is exercised with a prerequisite prop, rather than falsely treating its explicit empty-scene refusal as a successful render. |
| Scene, color, graphics and timeline interaction | 14 full browser journey checkpoints plus seven focused acceptance checkpoints and five polish checkpoints. These exercise actual pointer/keyboard gestures, exact undo/redo, inherited locks, camera views, curve/wheel effects, hidden scopes, graphic operations, keys/graphs/markers, playback, paused-stage recovery and scene reentry. |
| Output contains graphics | Real 640 × 800 PNG/JPEG/WebP exports contain metadata and shape pixels at their normalized positions. A stepped three-frame 320 × 400 WebM encodes, decodes and contains 6,231 measured colored-overlay pixels in the sampled region. |
| Finished reference artifacts | A 1080 × 1350 collector poster and a two-second, 24 FPS collector orbit (48 stepped frames at 480 × 600) were rendered and the clip was decoded to verify visible movement from the actual scene and layout template. |
| Responsive color/mono and touch targets | 32 final layout screenshots/checks across 390, 768, 1280 and 1920 pixels in color and monochrome; an earlier exploratory pass covered all seven pages. Additional coarse-pointer Graphics checks at 390, 820 and 960 pixels have no root overflow. Screenshots were inspected and the layouts iterated. |
| Motion and cleanup | Saved reduced motion refuses animated playback. Safe/Full light-ramp bounds and reduced-motion freezing pass focused tests. Exit shrinks render/title canvases to 1 px, removes registered Studio commands and releases the Studio scheduler subscriber. |
| Compatibility | The existing 43 `checkStudio2` checks pass. All 185 root scripts and 57 stylesheets exist. Runtime checks report zero JavaScript errors and zero network requests. Syntax and focused diff checks pass before commit. |

Repeat with `node --test tests/studio-stage1.test.cjs tests/studio-stage2.test.cjs tests/studio-stage3.test.cjs`, then the three `tools/check-studio-stage3*-browser.cjs` harnesses with local Playwright available. The full, extra and polish evidence files are separate so a focused run cannot overwrite broader acceptance.

## Defaults and limits

The five stages have a fixed processing order and are enabled by default. Curves retain five fixed input positions with movable output values; they are not arbitrary-point editors. Graphics are static screen-space layers, while the existing Director title system remains the route for timed title animation. No decorative node graph or speculative vectorscope was added. The histogram/waveform remain sampled display-image scopes, not calibrated HDR/broadcast instruments. Grade presets replace the color/lens domain explicitly; the prior grade remains recoverable through Undo.

Group containers retain the existing world-space organization model; this stage does not introduce a different parent-local transform schema. Lower tiers preserve but omit costly spatial/lens effects. The two-second clip is a rendered reference, not a hardware FPS benchmark. Clipboard/native file dialogs, long recordings, installer/updater behavior, unusual nested animated-group combinations and broad physical-device/photosensitivity acceptance were not certified. Owner art-direction review and later integration/delivery remain separate. No release or desktop installation was modified.
