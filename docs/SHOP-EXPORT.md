# Shop save export and approved cleanup

2026-10-13 · isolated `feature/daily-shop`, following `f47d689`.

Save status now includes Export save. It uses the existing checksum-checked export envelope and download helper, with a local timestamp filename. It includes the current cards, packs, Credits, settings, Shop offers and receipts. It is available when a primary write fails because it exports the retained collection without retrying a save or replaying a rejected transaction. Pending recovery and boot failure block collection export; Data settings retains its recovery actions and original-save route. Studio photos remain separate Album exports.

Feedback says Download started, rather than claiming a completed file. An exception shows an adjacent error and leaves state unchanged. No new save writer, timer, frame loop or network path is added. The existing download helper retains its bounded object-URL release.

`check-shop-export.cjs` passed a real browser download after one held purchase and a rejected second purchase, checked filename/envelope/checksum validity, verified the acquired card/receipt/wallet and absence of the rejected purchase, confirmed no implicit save retry, checked startup-error feedback, recovery blocking, actual checksum-checked import round trip, mobile mono, 44 px export target, no horizontal overflow, no page errors and no HTTP requests. Export files stay in ignored test output. Desktop and mobile captures were visually reviewed: [desktop](../artifacts/shop-export-desktop.png), [mobile mono](../artifacts/shop-export-mobile-mono.png).

The packaged native check passed a real Electron download completed at an explicitly asserted test-profile destination, validated its envelope and acquired instance/receipt/wallet/preference, and retained the existing purchase, rejected/repaired mirror, no replay, restart and native recovery checks. It never uses the player's Downloads folder as its test destination. `npm run dist` completed with publishing disabled; all three changed shipped files match source bytes in app.asar. The unsigned review installer is `dist/Cardable-Setup-1.6.4.exe`, 189870081 bytes, SHA-256 `60260EF8A32278B6A28413F92324DAD2AF5C7DA1443985FC39653FB09D7D8B22`. It was not installed. Syntax, index asset references and whitespace checks passed.

The required `npm run deliver:desktop` attempt stopped at unresolved preview origin. No Shop promotion, Latest Build shortcut replacement, merge, push or publication occurred. Physical-device, screen-reader and installer acceptance remain separate.

## Approved test-snapshot cleanup

The owner explicitly approved removal of the three exact snapshots listed in [SHOP-COMPARE-NATIVE](SHOP-COMPARE-NATIVE.md). Their regular-file paths and SHA-256 values were rechecked against preserved copies before removal. Only those three history files were removed; all three are absent, copies remain in ignored `qa-output/native-check-archived`, and the active native backup hash was identical before/after. No player collection was used as a test fixture. The ignored audit is `qa-output/approved-snapshot-cleanup.json`. No other backup cleanup was performed.

The originally reported saving failure remains unidentified. These passing injected failure/export/recovery cases and the approved cleanup do not establish its cause.
