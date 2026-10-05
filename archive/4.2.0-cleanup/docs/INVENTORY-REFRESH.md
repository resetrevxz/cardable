# Stage 7 — Major inventory refresh

## Done

- Replaced the catalog-length 3D rail with a floating card-unit position and a recycled ±6 Shelf window. Transforms stay relative to the viewport center. Shelf wheel/trackpad, momentum drag and keyboard navigation share one position; only the centered owned card runs full effects.
- Added a virtual Grid with responsive columns, visible rows plus two overscan rows, static hover highlights and entirely lite cards. Selection follows card IDs across view, query, grouping and viewport changes.
- Built the mounted Peek / Normal / Expanded / Full glass sheet, handle dragging, spring settling, rubber-band resistance, background depth, modal focus scopes and restrained SVG toolbar. Peek controls are inert; keyboard navigation remains with the menu until the sheet opens.
- Added registry-driven search, autocomplete, tags, removable chips, Clear Filters, ownership/duplicate/New/quantity filters, VRAM normalization, stable sorts and grouping. Invalid queries keep the last valid result set and display an inline error. Missing values sort last.
- Added Favorites and custom collection CRUD, counts, membership checklists, independent custom ordering, drag insertion/edge scroll and keyboard reorder actions. Collection references never duplicate inventory instances; stale and unowned references are ignored in results/counts.
- Added static unknown GPU faces with lock, technical dots, concealed names/specifications and registered finish details. Secret retains its registered Unfound design.
- Extended detail with quantity, newest acquisition date, Favorite, collection membership, previous/next results and per-design scroll restoration. Existing tilt, shine, R/button flip and explicit serial browsing remain. New clears when detail is viewed.
- Added measured visible-tile FLIP overlays and an acquisition handoff using lite clones. Final Keep saves the pending focus in its existing strict transaction. An interrupted flight retains that focus; reload selects/highlights directly, and successful handoff clears it.
- Migrated schema 1 to schema 2 with normalized `inventoryUi` preferences. Owned instances, serials, tutorial, packs and pending reveals retain their existing meanings. Added explicit brand/type metadata to all active catalog records without changing their specifications, art or rarity.
- Added `tools/check-inventory-refresh.cjs`, isolated dev console checks and a complete regression runner. Updated retired-catalog fixtures and old timer/cap expectations to read configuration. Recorded the refreshed bug log and host CPU samples.

### Verification

All 14 regression suites passed: 296 behavior groups, plus the six Stage 0 console checks. Every executed dev check printed PASS. The release gate runs the real classic scripts in a Node VM with an instrumented DOM and simulated clock. The inventory suite includes 29 groups, and Stage 7 also retains nine detail groups. It covers schema migration/corrupt preferences, all query tags and sorts, MB/GB/shared memory, grouping, collection mutations, filtered ordering, unknown-card privacy, pending focus, seen behavior, focus ownership, pointer reorder/drop/cancel, hidden/reduced-motion paths and resource cleanup.

Stress sizes: 0, 1, 2, 5, 20, 60, 200, 500 and 1,000 logical entries. Shelf mounts at most 13 tile wrappers; Grid mounts a bounded row window. Geometry checks include first/last positions, resize, group boundaries and the requested 1280×720, 1920×1080, 2560×1440, 3840×2160, ultrawide 3440×1440 and narrow 420×720 sizes. These are simulated calculations, not rendered screenshot evidence. The bug pass also exercises 50 real opening/collection cycles and retained-resource bounds.

Final results are in `INVENTORY-REFRESH-REGRESSIONS.json`, `BUG-PASS-9C-EVIDENCE.json` and `INVENTORY-REFRESH-PROFILE.json`. The isolated QA snapshot is `D:\CardableV2\outputs\inventory-refresh-qa-20261001-054710`, based on commit `b1ab86a`, with this inventory patch applied. Uncommitted changes from the concurrent task were excluded. The snapshot includes the separately committed pack rules; fixture expectations follow config rather than reverting those rules.


Selected host CPU samples (300 steps per workload; not browser FPS):

| Workload | p95 step | Max step | Mounted tiles | Full cards at sample end |
|---|---:|---:|---:|---:|
| Moving 300-entry Shelf | 0.491 ms | 4.124 ms | 13 | 0 |
| Moving 1000-entry Grid | 1.130 ms | 9.624 ms | 30 | 0 |
| Full Secret detail with virtual Shelf | 0.024 ms | 0.048 ms | 13 | 1 |
| Acquisition handoff | 0.043 ms | 4.328 ms | 7 | 1 |

The motion sample ends on an unowned Shelf tile, hence zero full cards; the separate Secret/detail sample exercises the full-card workload. The acquisition workload includes opening/closing preparation inside some sampled steps. Exact figures and all workloads are in the JSON; these figures cannot establish rendered 60 fps.

## Skipped or changed

- The approved refresh supersedes the old Shelf-only inventory and absence of saved inventory preferences. The architecture, Stage 7 checklist and inventory documentation now describe both views and schema 2.
- No permitted browser surface was available for this task. The preview tool explicitly blocked `file://` and prohibited workarounds through another browser, a local server or indirect execution. Screenshots, real file-open behavior, glass/material appearance, browser zoom/hit testing and measured 60 fps remain unconfirmed. The other task's browser evidence does not verify this inventory patch.
- CPU samples measure JavaScript plus simulated DOM bookkeeping only. They exclude browser layout, raster, filters, GPU composition and display cadence. The simulated 60 Hz clock is not a measured FPS result.
- The implementation review below is based on source and behavior checks, not a screenshot signoff. Collection dialogs are deliberately compact popovers; unknown cards disclose generation/rarity without exposing names/specifications.
- Deferred as approved: multi-select, bulk actions, saved filters, drag-to-tab, collapsible groups, alphabetical index and onboarding hints. No market, prices, selling, trading, variants or audio were added.
- Unrelated font files, hero image and concurrent pack/currency edits are preserved outside this commit.

### Design critique and ranked follow-up

1. **Card legibility and spacing:** the bounded coordinate system removes the structural cause of the compressed rail; shallow local turning and flat ancestors keep neighboring faces within predictable slots. Human acceptance should first judge centered text, edge masks and card spacing at 4K and narrow widths.
2. **Hierarchy:** toolbar chrome is monochrome, icons share one stroke family and secondary tools live in popovers. Inspect narrow-window density and the relationship between title/count and collection tabs before adding more tools.
3. **Glass and motion:** the sheet uses one continuous pixel-space spring and the menu depth follows its height. The heaviest unmeasured cost remains glass blur with a full finish behind it. Record paint/compositing before calling this a performance success.
4. **Discovery:** unknown faces use the game's dots and an etched GPU form, while Secret preserves its authored mystery finish. Compare all tiers in color and mono for intentional restraint and readable labels.
5. **Handoff:** source and target are measured before clone animation, and pending focus survives interruption. Review the thumbnail's landing against the moving sheet and surrounding tile introduction; tune presentation only after rendered evidence.

The deferred product ideas and remaining visual acceptance gate are recorded in `POLISH-BACKLOG.md`.

## Look at

1. Double-click `index.html?dev=1` using a permitted local-file browser. In ordinary use, inspect the console for errors. Dev validation's existing chance-normalization warnings remain intentional. Test local fonts with the supplied files and with system fallbacks.
2. Open via arrow click, focused Enter, I and ArrowUp; Space remains reserved for packs. Drag the handle through all four detents, flick in both directions, reverse an opening/closing spring and spam-click collapse. Escape should close detail, popover/search or reorder before moving to Peek.
3. Use the 300/500/1000 tile fixture buttons. Wheel, trackpad and drag Shelf; test Home/End, PageUp/PageDown and arrows. Switch to Grid and scroll to the end. Filter or sort while moving, resize and switch views. No transforms should compress with collection size, and hover should not change layout.
4. Try `brand:nvidia owned:true`, `rarity:rare`, `vram:>=16`, `vram:16-64mb`, `memoryType:"GDDR6"`, and an invalid tag. Check autocomplete, chips, Clear Filters, duplicate counts, grouping and empty results. Unknown names/specifications must stay concealed.
5. Create, rename, reorder and delete collections. Add owned cards and favorites from detail/context. Set Custom sort, hold-drag a tile, cancel with Escape, then drop it and reload. Also try Move Earlier/Move Later and collection-specific orders.
6. Open detail, navigate results, browse duplicate serials explicitly, flip with R/button, change Favorite/membership and close quickly. Revisit a scrolled detail and verify restoration. Unowned Secret should show Unfound and no concealed specification.
7. Keep a card, open inventory, and watch the lite clone arrive. Reload before opening inventory and verify selection/highlight without a DOM replay. Interrupt a flight; the pending focus must remain. New should persist until detail is viewed.
8. Repeat with system reduced motion changed live and while a tab is hidden. Tab/Shift+Tab through controls and confirm visible focus rings and inert background controls.
9. Capture Shelf, Grid, mystery card, filter, custom collection, detail and handoff screenshots at the requested viewport sizes and 80–150% zoom. Profile moving Shelf, Grid scrolling, filtering, detail and handoff for at least five seconds each. Target 60 fps with at most one full card; inspect actual layout/paint/GPU costs and heap after 50 openings.

No browser names can be listed as tested for this inventory patch.

## Open questions

- Applied defaults: monochrome chrome/direct card accents (#3), 12-segment meter (#6), hidden unknown names and Secret Unfound (#9), display-only duplicate stacks (#12), VRAM plus three front specifications (#18), local Inter/JetBrains Mono fallbacks (#19), desktop scope (#21), and serials on both faces (#22). The approved mystery face replaces the older plain outline/`???` presentation in #9.
- New approved preference defaults are Shelf, Catalog, None grouping, Show Unowned enabled, All Cards active, no favorites/custom collections, and no selected/pending card. Detents are 104 px / 62 vh / 82 vh / 16 px top margin. No additional gameplay rules were invented.
- Browser rendering and measured performance still require the manual acceptance above; no source-only check can resolve those questions.
