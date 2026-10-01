# Bug pass 9c

Audit date: 2026-10-01. Scope: current Stage 8 implementation, including F1–F6 and N1–N6.

**Status convention:** `fixed` means reproduced, changed and reverified against the actual classic scripts in the instrumented Node DOM. `deferred` identifies a remaining acceptance check or limitation; it does not assert an unseen visual defect. `won't fix` records an intentional specified behavior.

## Issues

| # | area | what | how to reproduce | status (fixed / deferred / won't fix) |
|---|---|---|---|---|
| 9c-01 | Input / inventory | I or ArrowUp moved keyboard focus out of detail into the inert shelf. Inventory requests could also operate under settings. Requests now preserve the active modal. | Open inventory detail; press I or ArrowUp. Open settings and request the inventory. Focus must remain in the current modal. | fixed |
| 9c-02 | Inventory / input | Closing during a sheet or shelf drag retained capture and could keep the sheet active indefinitely. Closing now cancels both gestures before springing shut; stale release/click events cannot reopen it. | Start dragging the grip or shelf, then press Esc or request close before releasing. Verify capture releases and the sheet closes. | fixed |
| 9c-03 | Inventory / sorting | Sorting during a shelf drag retained the previous drag coordinate anchor, so subsequent movement fought the new order and recentering. | Drag shelf; change sort before releasing; move again. New order must settle on its first card without following the obsolete gesture. | fixed |
| 9c-04 | Inventory / resize | Resizing during a gesture retained capture and geometry from the previous viewport. Resize now cancels gestures and retains the current carousel index. | Drag grip or shelf; resize; release. No capture or active gesture may remain. | fixed |
| 9c-05 | Save | After a storage failure, a later successful save/commit left the stale fallback eligible for load, potentially overwriting newer durable state. Successful writes now refresh the cache and clear its unavailable flag. | Fail a write at currency 1; restore storage; save or commit currency 2; load. Currency must remain 2. | fixed |
| 9c-06 | Save / recovery | A syntactically valid local save with an unknown pending card passed validation and crashed reveal creation. Reserved cards now require a catalog entry before rendering. | Load a save with `pendingReveal.cards[0].cardId` absent from the catalog. The original JSON must be backed up and the quiet recovery notice shown. | fixed |
| 9c-07 | Timer / lifecycle | Repeated timer stop/start calls accumulated visibility callbacks. Stop now removes the watcher and its interval. | Stop/start the timer 50 times; stop; hide/show. Listener count stays constant while running and the stopped timer receives no visibility ticks. | fixed |
| 9c-08 | Opening / durability | Commit-time reconciliation ran on live state and could write before the pull transaction. It now reconciles only the cloned candidate and adopts it after the one successful write. | Stop the periodic timer; arrange expiry exactly at the 3 s release. Success uses one write; failed storage leaves stock, timestamp, serial counter and stats unchanged. | fixed |
| 9c-09 | Dev checks / opening | Running state simulations during a reveal could emit temporary save events, disrupting its reserved presentation. Active opening/modal calls now run only isolated 9c fixtures and defer state simulations until idle. | At revealed or in a modal, call `Cardable.dev.runChecks()`. The live view, pending cards and save must remain unchanged. | fixed |
| 9c-10 | Save / serials | A valid local save whose serial counter lagged existing cards could reuse a serial. Local validation now raises it to the greatest existing counter for that player. Strict imports still reject a lagging counter. | Load an owned serial ending `000099` with counter 0; the next serial must end `000100`. | fixed |
| 9c-11 | Dev checks / disabled storage | Stage 0's persistence check emitted FAIL for supported blocked-storage operation. It now explicitly reports session fallback coverage, without claiming persistent reload proof. | Disable localStorage writes and run dev checks. Every executed check prints PASS; opening/Keep failure preserves the real pack/card. | fixed |
| 9c-12 | Tutorial / keyboard | The visible tutorial Skip control was outside the inventory/detail focus trap and unreachable by Tab. Active tutorial Skip is now an additional tab stop; settings retains its own modal scope. | Open the sheet while the tutorial is active. Tab/Shift+Tab through the sheet to Skip, activate it, and verify the sheet stays open. | fixed |
| 9c-13 | Dev checks / save | During cache hardening, persistence fixtures shared the player fallback cache and could replace its session copy with the corrupt-save fixture. Checks now use a temporary independent cache restored in `finally`. | Save currency 17; run checks; disable storage reads/writes; load. Session currency must remain 17. | fixed |
| 9c-14 | Visual acceptance | Rendered clipping, container overflow, hover layout stability, toast first-frame glass, pack alignment, card material appearance and narrow/zoom screenshots cannot be certified by a simulated DOM. | Manually inspect menu, cut/reveal, toast, shelf, detail and settings at the viewport/zoom matrix below. | deferred |
| 9c-15 | Performance | Actual dev FPS ≥55 during tilt, opening and inventory, and browser paint/compositing cost remain unmeasured. Host CPU samples are recorded separately. | Use the dev counter and profile buttons on a permitted real local-file browser; record each workload for at least 5 s. | deferred |
| 9c-16 | Memory | The 50-pack audit verifies bounded retained DOM, listeners, tasks and subscriptions; actual browser heap growth and garbage collection remain unmeasured. | Record heap snapshots before/after 50 packs and after collecting expired toasts, with DevTools log retention considered separately. | deferred |
| 9c-17 | file:// / fonts / native files | Browser double-click behavior, font requests, real file picker/download and missing-font fallback remain unverified under the established file preview restriction. No browser was tested during this pass. | Double-click `index.html` in current Chrome, Edge and Firefox; check fonts/local requests, export/import and reload. | deferred |
| 9c-18 | Timer while hidden | Presentation and the light timer interval sleep while hidden; real elapsed time is reconciled on return. A hidden tab's title can therefore update on return rather than at the exact hidden deadline. | Start a short remaining timer, hide across expiry, then return. Stock catches up once, respects cap 2 and the ready moment plays once. | won't fix |
| 9c-19 | Console / data validation | Dev-only warnings about the written 100.5% chance sum and empty tiers are intentional. Normal use is checked separately for zero warnings/errors. | Open `?dev=1`; inspect validation. Chance normalization and empty-tier downgrade remain enabled. | won't fix |

## Reverification evidence

- `tools/check-bug-pass.cjs`: 27 adversarial behavior groups; each fixed row 9c-01–13 has a focused integration check. Fixtures exercise real runtime code and restore/recreate state between cases.
- `Cardable.dev.runChecks()`: six original Stage 0 checks plus thirteen registered 9c regressions. `Cardable.dev.runBugChecks()` runs the isolated regressions alone. State simulations are deferred during an active opening, inventory or settings; this is printed as information, never as a fabricated persistence result.
- `BUG-PASS-9C-REGRESSIONS.json`: results for all 13 existing suites, covering 270 prior behavior groups.
- `BUG-PASS-9C-EVIDENCE.json`: adversarial group names and the 50-pack retained-resource counts. Intentional counters, inventory instances and dev logs are expected to grow; transient views/listeners/animation subscriptions are not.
- `BUG-PASS-9C-PROFILE.json`: seven host CPU workloads, including a moving 300-tile carousel and a full Secret detail card. This excludes browser layout, raster, filters, GPU composition and display cadence.

### Coverage of the nine requested areas

| Area | Executed coverage | Remaining manual evidence |
|---|---|---|
| Input conflicts | Inventory/modal ownership, Space rejection, R state gating, Enter/Keep repeats, Esc cancellation, Up/I, Tab traps, arrow spam and back-to-back toast/opening; existing N1–N6/Stage 5 checks cover the remaining phase gates. | Physical browser key defaults and assistive technology. |
| Opening | 2.9/3.0 s releases, repeats, hidden cancellation, outside-wrapper rejection, all four directions plus diagonals, short/long paths, endpoint continuation, normalized resize, durable recovery at every committed phase, back-to-back packs, multi-card progress and repeated instances. | Pointer capture behavior on real browser windows and rendered cut clipping. |
| Timers/save | Forward/backward jumps, hidden catch-up, cap/no banking, disabled storage, corrupt JSON and reserved cards, failed commit/Keep/import, round trip and reset. | Native file operations and storage policy differences between browsers. |
| Tutorial | Reload/skip every milestone, real pull, replay, ghost/spotlight/RM and keyboard Skip while a sheet is open. | Rendered halo, ghost and instructional placement. |
| Inventory | 0/1/2/300 cases, duplicate stack projection, silhouettes, Secret Unfound, sort while moving/dragging, close/resize mid-gesture, detail close during lift, virtualization and sole full card. | Physical spring/carousel feel and real hit testing. |
| Finishes | All 13 in color/mono, both Secret states, off-screen/hidden pause, live RM changes, lifecycle cleanup and 50 real pulls/collections. | Material appearance and actual browser heap. |
| Visual | Finite responsive calculations at 1280×720, 1920×1080 and 420×720, simulated 80/100/150% scale and DPR 1–2; existing CSS geometry/hover invariants. | Actual screenshots, overflow, text clipping and browser zoom. |
| Quality | Zero warnings/errors in the normal simulated flow; all executed dev checks PASS; RM paths, focus scopes and scheduler counters. | Visible focus/contrast and measured FPS ≥55. |
| file:// | All referenced classic scripts exist; no external script/style URLs, dynamic imports, fetch or XHR; local @font-face and fallbacks remain. | Double-click test: **none performed; no tested browser names to report**. |

## Manual acceptance checklist

1. Double-click the file in Chrome, Edge and Firefox. Repeat with `?dev=1`; check the console and Network panel. Dev validation warnings listed above are expected; no runtime errors are expected. Optional fonts must be supplied under `assets/fonts/`; temporarily remove/restore them to inspect fallback text.
2. Inspect every screen at 1280×720, 1920×1080 and a narrow 420 px window; repeat at 80%, 100%, 125% and 150% browser zoom. Hover labels/cards/buttons while watching geometry. Record screenshots of toast, pack float extremes and both card faces.
3. Force Common, Legendary and Secret. Try early release, Esc, tab hiding, outside-wrapper cuts, diagonal/reversed/long cuts, resize mid-cut, Enter fallback and reload in each phase. Keep twice quickly; begin the next pack while the previous toast is visible.
4. Preview 300 tiles. Wheel, trackpad/drag, switch sorts during movement, close during a gesture, open/close detail rapidly, flip with R/button and navigate duplicate serials. Test only one full card, with the rest lite.
5. Turn system reduced motion on/off during each phase. Tab/Shift+Tab through sheet, detail, settings and tutorial Skip. Confirm every visible control has a focus ring and background controls stay inert.
6. Profile tilt, opening and moving inventory for ≥5 s. Require dev FPS ≥55 and inspect the Performance recording for layout/paint/filter spikes. Compare heap snapshots after 50 openings and expired toasts; exclude preserved console logs from the retained-resource diagnosis.

## Defaults and scope

Preserved the game rules and defaults: eight-hour regen, normalized chances, cap two/no banking, one card with multi-card support, fixed three-second charge, downgrade empty tiers, standard pack, existing serial format, visual-only duplicate stacks, local font fallbacks and desktop scope. No data files, config values, save schema, market, audio or variants changed.

## Inventory refresh — 2026-10-01

The earlier sections record their historical pass. Current inventory is schema 2, and regression timer/cap expectations now follow configuration. The separate pack task's committed rules are preserved.

| # | area | what | how to reproduce | status (fixed / deferred / won't fix) |
|---|---|---|---|---|
| inv-01 | Shelf geometry | Long-track coordinates and inherited perspective compressed far cards and retained sort offsets. Replaced with a bounded relative window. | Preview 1000 entries; Home/End, sort during motion, resize and switch views. Check finite transforms and at most 13 Shelf wrappers. | fixed |
| inv-02 | Input | A second arrow activation during closing targeted the stale open flag. Toggle now uses the requested detent. | Click open, close before settling, then immediately click open again. | fixed |
| inv-03 | Focus | Hidden Peek controls were still reachable and could trap menu keyboard navigation. Hidden regions are inert. | At Peek, Tab through the menu; then open and check the sheet's focus scope. | fixed |
| inv-04 | Acquisition | Saved focus could be hidden by Favorites/filters or cleared before the flight completed. Focus escapes session filters and stays durable until completion. | Keep, select Favorites/filter, open inventory; interrupt the flight and reload. | fixed |
| inv-05 | Detail focus | Membership popover could mount behind an inert detail overlay. It now belongs to detail and Escape restores its focus scope. | Open detail, Add to collection, Escape twice. | fixed |
| inv-06 | Reorder input | Escape cancellation also reached the sheet dismissal handler. The reorder explicitly claims the event first. | In Custom sort, hold-drag then press Escape. Order remains unchanged and sheet stays open. | fixed |
| inv-07 | Preference projection | Stale/unowned favorites or collection references inflated counts and disclosed invalid membership. Projection now excludes them without deleting saved references. | Import valid inventory with stale/unowned preference IDs; inspect collection results/counts. | fixed |
| inv-08 | Grid selection | A filter from a distant scroll position could leave all matching tiles outside the render window. Model/resize changes reveal the preserved or replacement selection. | Scroll a 1000-entry Grid far down, filter to Secret, resize and switch views. | fixed |
| inv-09 | Tile reuse | Recycled wrappers retained acquired/hover classes or stale duplicate/New accessible labels. Transient classes clear and labels refresh. | Highlight an acquired tile, scroll it out, reuse the slot; mark a duplicate design viewed. | fixed |
| inv-10 | Detail return | Changing result membership during detail could return a view to a removed tile. Deferred model rebuild and per-card scroll restoration handle navigation/return. | Open a scrolled detail, change active collection/membership, navigate and close. | fixed |
| inv-11 | Render lifecycle | Full effects or temporary clones could multiply during view switches, reorder and repeated open/close. Lifecycle checks enforce one full card and bounded wrappers/subscriptions. | Repeat 50 sheet open/close cycles; reorder and switch views; audit retained resources after 50 openings. | fixed |
| inv-13 | Keyboard focus | Shelf navigation left focus attached to a recycled tile wrapper. Navigation now keeps focus on the stable listbox with the active descendant derived from logical position. | Focus the first tile, press End, let it settle, then press Enter. Detail must show the last selected design. | fixed |
| inv-12 | Browser acceptance | Glass rendering, physical gesture feel, real font/file requests, screenshot critique, zoom and measured 60 fps have no permitted browser evidence. | Run the manual matrix in INVENTORY-REFRESH.md in a permitted local-file browser. | deferred |

Fixed rows are reverified by `tools/check-inventory-refresh.cjs` (29 groups) and the retained detail/bug-pass checks. `src/core/inventory-checks.js` adds isolated dev console regressions for migration, query syntax, normalization/privacy, bounded windows, stale preferences, pending focus and reorder Escape. It does not mutate the player save. Final gate evidence is `INVENTORY-REFRESH-REGRESSIONS.json`.
