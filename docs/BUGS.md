# Open acceptance and known limitations

Fixed history and its reproduction/coverage tables are preserved in [the original bug ledger](../archive/4.2.0-cleanup/docs/BUGS.md). A historical fixed label applies to its recorded checkpoint, not every later build. Deferred rows are evidence gaps rather than newly reproduced defects.

## Outstanding historical gates

| # | area | what | how to reproduce | status |
|---|---|---|---|---|
| 9c-14 | Visual acceptance | Rendered clipping, container overflow, hover layout stability, toast first-frame glass, pack alignment, card material appearance and narrow/zoom screenshots cannot be certified by a simulated DOM. | Manually inspect menu, cut/reveal, toast, shelf, detail and settings at the viewport/zoom matrix below. | deferred |
| 9c-15 | Performance | Actual dev FPS ≥55 during tilt, opening and inventory, and browser paint/compositing cost remain unmeasured. Host CPU samples are recorded separately. | Use the dev counter and profile buttons on a permitted real local-file browser; record each workload for at least 5 s. | deferred |
| 9c-16 | Memory | The 50-pack audit verifies bounded retained DOM, listeners, tasks and subscriptions; actual browser heap growth and garbage collection remain unmeasured. | Record heap snapshots before/after 50 packs and after collecting expired toasts, with DevTools log retention considered separately. | deferred |
| 9c-17 | file:// / fonts / native files | Browser double-click behavior, font requests, real file picker/download and missing-font fallback remain unverified under the established file preview restriction. No browser was tested during this pass. | Double-click `index.html` in current Chrome, Edge and Firefox; check fonts/local requests, export/import and reload. | deferred |
| 9c-18 | Timer while hidden | Presentation and the light timer interval sleep while hidden; real elapsed time is reconciled on return. A hidden tab's title can therefore update on return rather than at the exact hidden deadline. | Start a short remaining timer, hide across expiry, then return. Stock catches up once, respects cap 2 and the ready moment plays once. | won't fix |
| 9c-19 | Console / data validation | Dev-only warnings about the written 100.5% chance sum and empty tiers are intentional. Normal use is checked separately for zero warnings/errors. | Open `?dev=1`; inspect validation. Chance normalization and empty-tier downgrade remain enabled. | won't fix |
| inv-12 | Browser acceptance | Glass rendering, physical gesture feel, real font/file requests, screenshot critique, zoom and measured 60 fps have no permitted browser evidence. | Run the manual matrix in [INVENTORY-REFRESH.md](../archive/4.2.0-cleanup/docs/INVENTORY-REFRESH.md) in a permitted local-file browser. | deferred |

## Current acceptance routing

The old table describes old configuration and old dev tools. Current stock is four, refill is two hours, and the shared scheduler supports hidden sleep or timer/title-only. Read source/config and numbered docs before applying historical instructions. Follow [PROMPTING.md](PROMPTING.md); this list does not authorize prohibited suites, screenshots or profiling.

1. Inspect physical keyboard/pointer/touch, focus rings, zoom, narrow/high-DPI displays and missing-font fallbacks across current screens.
2. Review actual full/short/calm cinematics, skip, reload, context loss and Safe/Full handoff; Secret C still lacks completed runtime acceptance. See [CINEMATICS.md](CINEMATICS.md).
3. Verify hardware paint/compositing, high-refresh speed, thermal/battery behavior and actual heap retention separately from host CPU or synthetic timing.
4. Verify native file picker/download, browser storage restrictions and IndexedDB photo persistence without changing origins.
5. Exercise real installer upgrade/uninstall, locked/legacy paths, Safe Mode relaunch, startup failure and native disk-error recovery in a separately authorized isolated environment.
6. The C reduced-motion emulation did not activate runtime reduced state. OS preference changes and explicit On/Off still need acceptance. C did verify import preview, two-click replacement and retained corrupt text in a private profile.
7. Public hosting, CI, live GitHub updates, signing/publisher and live Discord remain unconfigured/external. No updater success is claimed from offline packaging.

## Intentional behavior

Chances normalize the written sum; empty tiers use the approved downgrade policy. Developer warnings are expected only in developer mode. Hidden visuals sleep and refills reconcile timestamps; no gameplay reward depends on continuous rendering. No market/audio is added.
