# Shop wishlists and save status

2026-10-13 · isolated `feature/daily-shop`, following `007b5f6`.

Offers and inspection now have Wishlist disclosure: select a list, add/remove the card definition, set priority, or create a named list with that card. Buying retains membership. Wishlisted first reorders the existing four offers; Wishlist marks is a saved visibility preference. List targeting is local to the open Shop session. Opening a disclosure leaves other offer prices aligned.

The inventory model accepts an optional durable flag for creation, membership and priority. It clones only inventoryUi, normalizes it, and commits before publishing success. Failure preserves the current wishlist. The existing ordinary UI path remains the default. Shop creation keeps the currently selected inventory collection. Metadata edits do not mint cards, allocate serials, change pack stock, debit Credits or reprice quotes.

Save status is reached from Shop settings. It shows primary-write status, native backup presence, current slot, current game file, data location, card/receipt counts and the local error category. Check now reads the existing native APIs; a present backup is not advertised as the current snapshot. Data settings remains the export/recovery route; Studio photos have a separate Album export. Asynchronous replies ignore removed views.

`check-shop-wishlist.cjs` passed named creation, priorities, durable rejected membership/creation, unchanged economic data, wanted-first sorting, target/priority values surviving sorting, persisted marks, wishlist retention after purchase, reload and read-only browser status. Browser captures were reviewed at 1366×768 and 390×844 monochrome. A settings selector was narrowed to its own panel after visual review caught it clearing the new wishlist selects. The six-size Stage 4 check and comparison check passed. The extended development Electron check passed the asserted diagnostic profile, purchase/retry/recovery, wishlist persistence and actual native path/backup metadata. Native captures wait for a completed paint.

Review [desktop wishlist](../artifacts/shop-wishlist-desktop.png), [mobile mono](../artifacts/shop-wishlist-mobile-mono.png), [browser status](../artifacts/shop-save-status-browser.png), [mobile status](../artifacts/shop-save-status-mobile.png), and [native status](../artifacts/shop-save-status-native.png).

The earlier [QA profile incident and cleanup disposition](SHOP-COMPARE-NATIVE.md) remain recorded. This pass uses asserted diagnostic profiles. No player profile is used as a test fixture, and no backup cleanup was performed during this wishlist pass.

Final review caught a rejected-priority field retaining an unsaved selection. It now restores the persisted priority, and the browser check covers that rejection. The cinematic check also passed after its settings hit-target assertion was scoped to the settings panel rather than hidden wishlist fields.

`npm run dist` completed with publishing disabled. The rebuilt packaged app passed the native purchase, rejected/repaired mirror, restart, wishlist and primary-loss recovery checks in its asserted QA profile. Seven changed shipped files match the source bytes in app.asar. The unsigned review installer is `dist/Cardable-Setup-1.6.4.exe`, 189868442 bytes, SHA-256 `EDAF2C0684CF0B18AD84216BCF5F88FA30603E962AA9BBC4D3FB7479E7159225`. It was not installed.

The required `npm run deliver:desktop` attempt stopped at unresolved preview origin. It did not promote the Shop package or replace the existing Cardable (Latest Build) shortcut. No cleanup, merge, push or publication was performed. Choosing a different origin remains an owner decision with save and separate photo-export guidance. The reported saving failure remains unidentified; the passing isolated checks cover specific failure/recovery cases.
