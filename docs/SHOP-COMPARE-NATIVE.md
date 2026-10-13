# Offer comparison and native save feedback

2026-10-13 · isolated Shop worktree, following `3c79be9`.

Compare offers shows today's frozen Credits quotes, real card artwork, rarity, finish, dedicated/shared memory and catalog specs in one semantic table. Different processor counts keep their original labels and units; missing values use a dash. Differences only is saved in `settings.shopCompareDifferences` and is also on Settings → Gameplay → Shop. Inspection returns to comparison. Current ownership and affordability update after saves, and rollover replaces the comparison with the new saved day. Four static thumbnails are released on exit; no extra timer or renderer is added.

Shop now distinguishes a failed desktop mirror from a failed primary save. Retry backup waits for the native result, leaves an unsuccessful warning visible, and never repeats a purchase. The completed receipt releases its purchase lock so retry is available there. Primary storage failure and unresolved recovery retain their existing protections.

`check-shop-compare.cjs` passed real shared/dedicated memory, exact registered spec formatting, frozen quotes, read-only preview, persisted differences, owned/purchased/funds updates, rollover, returning inspection, keyboard horizontal scrolling, mobile mono, 44 px rendered actions, stable views, no page errors and no HTTP requests. `check-shop-native.cjs` passed a held Electron purchase, a real temporary-profile filesystem rejection of its mirror, repeated failed retry, recovery after repair, no repeated debit/receipt, restart and mirror restoration after primary storage was removed. The existing Electron smoke check passed launch, UI interactions, temporary-profile isolation, graceful close and native recovery. These are development Electron checks; installer and packaged acceptance are separate.

## QA profile incident and recovery

The first Shop-specific native check incorrectly used `--test-user-data` without the flag that enables it. Electron used the normal profile, and the fixture changed its Credits and added a Shop copy. The check was stopped. The pre-check startup snapshot was recovered from native history: 42 cards, 67 Credits, the same inventory records, serial counter and settings, and no Shop tree. Local storage and the active native backup were restored and verified. This restoration is a state comparison against that snapshot, not a claim that the older raw file remained byte-identical. The rolling backup history changed during those writes; preservation of every earlier history version cannot be established. The test now uses `--diagnostic-user-data` and asserts Electron's resolved userData path before any fixture mutation. Subsequent runs used separate profiles.

Three snapshots matching the test's changed-save hash remain in the normal native backup history. Separate copies are preserved under ignored `qa-output/native-check-archived`; backup deletion was rejected by automatic approval review because it would remove backup history. **Do not use these test snapshots as player restore points:**

- `cardable-backup-2026-10-13T01-55-09-438Z.json`
- `cardable-backup-2026-10-13T01-55-09-456Z.json`
- `cardable-backup-2026-10-13T01-58-46-153Z.json`

No raw player save or diagnostic profile is committed. The ongoing report of a saving failure still needs its failing runtime identified; the QA incident and injected mirror rejection do not establish that cause.

Reviewed [comparison](../artifacts/shop-compare-desktop.png), [mobile monochrome](../artifacts/shop-compare-mobile-mono.png) and [native backup warning](../artifacts/shop-native-backup-error.png).

## Local build and packaged checks

The worktree's ignored dependencies now link to the existing matching primary cache. `npm run dist` completed with its single `--publish never` setting. A first invocation supplied that flag twice and failed in publisher cleanup before a publisher could be created; it was rerun without the duplicate. No credentials were supplied or artifact uploaded. The local unsigned review installer is `dist/Cardable-Setup-1.6.4.exe` (189,865,121 bytes), SHA256 `CBB771B6417B829895A02531DFE9178D8FA7C9DB6F7CEF6AE3502ADD3A71CB24`.

The packaged `dist/win-unpacked/Cardable.exe` passed the same native Shop check with `--qa-test --test-user-data`, and the resolved temporary profile was asserted before state changes. A held purchase, rejected/repaired native mirror, no repeated payment, restart and recovery from the mirror all passed. The installer was not executed. Eight Electron service tests, the six-size Stage 4 check, existing cinema checks, source syntax, asset references and whitespace checks also passed. Hardware/installer/installed-updater acceptance remains separate.

The required one-time `npm run deliver:desktop` check still stopped at the worktree's unresolved preview-origin guard. No different preview origin was chosen and the existing Latest Build shortcut remains unchanged. The installer and unpacked app are review outputs in this worktree, with no merge, deployment or publication.
