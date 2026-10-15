# Cardable 1.7.6 — Lighter inventory

Stage 125 responds to reported frame drops after 1.7.5 and adds requested inventory background controls. Save schema 5, collected instances, serials, packs, rewards, purchases and photo storage are unchanged.

## Rendering changes

Shelf and Grid retain the exact same complete static front through hover and keyboard focus. Browsing no longer constructs a full front/back material tree after a hover delay or rebuilds its static predecessor on demotion. Opening inspection still constructs one complete interactive card; flip, first-click cursor tracking and return retain their existing behavior.

The sheet uses cached transparent gradients, a stronger beveled rim, a top glint and separated header. Live full-sheet backdrop capture and the three SVG-refraction strips are removed at every tier. High/Very High retain richer static lighting, Medium simpler lighting, and lower tiers a flat user tint. Shelf no longer changes a blur filter on each card during spring movement; scale, opacity, translation and the existing depth remain. Independent graphics controls, reduced motion, monochrome and bounded mounting remain. No new clock, canvas, GL context or material owner is added for browsing.

Normal-height Grid aligns an oversized focused row near its beginning instead of centering it outside the available viewport and clipping its card header.

## Appearance controls

Appearance → Inventory offers Graphite, Slate, Midnight, Moss, Plum and Warm, plus a native custom color picker. The default is Graphite at 78% opacity. Opacity ranges from 0 to 100%; zero remains valid through normalization. Invalid/missing values receive defaults, numeric bounds clamp, and optional preferences need no schema bump. Existing graphics presets do not overwrite these appearance choices.

The small inventory previews follow the Wordmark tile pattern. Each shows a tiny toolbar and card fronts over its tinted surface; the tint follows the opacity slider preview and transparency policy. The existing Settings dock previews the selected surface over a checkerboard. All preview subscriptions release with Settings. Custom light colors choose light/dark chrome through measured contrast against the expected dark scene; card typography keeps its own styling. Reduce transparency and High contrast force the chosen background opaque, regardless of setting order.

## Representative measurements

Same-host Edge 155.0.4283.45 headless, Windows 10.0.26200, Ryzen 7 7800X3D / 16 logical processors, Node 24.20.0, 1366×900 and 60 FPS cap. The fixture contains 1,512 finish stacks. Each view has two repetitions; values below are average renderer main-thread TaskDuration milliseconds per complete workload, **not milliseconds per frame**. Baseline is 1.7.5. No other runtime QA was run concurrently with profiling.

| High workload / view | Hover before → after, ms | Pan/scroll before → after, ms | Full/static hover replacements before → after |
|---|---:|---:|---|
| 8 × 280 ms dwell / Shelf | 830 → 444 | 151 → 154 | 8/8 each run → 0/0 |
| 8 × 280 ms dwell / Grid | 682 → 384 | 273 → 323 | 4–8 of each → 0/0 |
| 24 × 35 ms sweep / Shelf | 265 → 341 | 161 → 169 | 0/0 → 0/0 |
| 24 × 35 ms sweep / Grid | 479 → 425 | 277 → 311 | 0/0 → 0/0 |

Settled-hover CPU work falls about 46% on Shelf and 44% on Grid, and all browsing material replacement is eliminated. Rapid Shelf CPU work is higher in these runs and Grid pan is also higher; this is not a blanket speedup claim. The rapid workload already avoided promotion in 1.7.5. Shelf p95 frame gaps remain about 17 ms, and Grid ranges about 17–29 ms; the capped headless fixture does not establish a universal frame-rate improvement or GPU/memory behavior. Removing moving filters targets compositor work but that GPU benefit is unmeasured. The richer user-configurable static fill is a deliberate visual tradeoff.

Raw local measurements: `qa-output/inventory-regression/light-before.json`, `light-dwell-before.json`, `light-final-rapid.json`, `light-final-dwell.json`. The profiler records dwell/sweep parameters, constructor counts and frame gaps explicitly.

## Verification

- `check-inventory-glass.cjs` passes in Edge headless over localhost and native Electron, both using disposable profiles: all four tiers, independent glass, search/reset, palette/custom color, opacity preview/commit/normalization (including zero), save export/import/reload, both Reduce transparency orders, opaque accessibility policies, light chrome/card text separation, Home/End in oversized rows, gallery and cleanup. Browser widths: 390, 760 and 1280 at 820 px tall. Native content widths: 1280 and 1440 at 820 px tall; the compact-row boundary also uses a short native window. Native keeps its existing 1920-wide scaled composition. No renderer network or console/page errors were recorded.
- Browser and native `check-inventory-interaction.cjs` pass first-click cursor tracking in Shelf/Grid, both cursor directions, flip/return, stable hover/keyboard preview identity, hidden/inert boundaries, reduced motion and unchanged gameplay state.
- Four-tier `check-inventory-performance-browser.cjs` passes with 1,512 stacks: bounded mounts, unchanged caption/tag content during movement, favorites, pointer drag, detail/flip/return, far Grid scroll, End, phone resize and close cleanup.
- `check-ui-polish-contracts.cjs` passes every rarity in color/mono with exact static/live front values and concealed Secret rules, existing preference persistence, combined controls and three complete surface close cycles returning view/frame-subscriber counts to baseline.
- Native `check-ui-polish.cjs` passes fresh empty-state navigation, combined controls, stable previews, nested exits, Settings, Shop wallet and Studio/Director return. `check-desktop-optimization.cjs` reaches successful duplicate-stock, movement, idle Very Low and Mini-visibility measurements, then times out at Mini skin/tier synchronization (line 108). The unchanged 1.7.5 main checkout reproduces the same timeout in a separate disposable profile; the full suite is not claimed as passed. Eight desktop service tests, local asset/data integrity, JavaScript parsing, release metadata validation and diff whitespace checks pass.

Rendered Graphite, white/custom and monochrome inventory, and the Wordmark-style palette/dock previews were inspected. Runtime review found and corrected faint tag icons on light backgrounds; their ink now follows the inventory chrome. Delivery and publication follow the reviewed commit through the repository workflow; local manifests and release verification retain the exact build/hash/asset results.

Installer execution, a real updater upgrade, physical touch, opt-in hardware-gated Very High and broad GPU/thermal/high-refresh acceptance remain separate. No normal player profile is opened by QA.
