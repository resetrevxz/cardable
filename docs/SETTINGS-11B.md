# Stage 11b — Data tools

## Done

- Stage 11a is committed separately as `a83373e` (`stage 11a: settings`).
- Enabled the five Data tools. Export shows a 600 ms progress line/check and downloads a dated local JSON envelope with settings, progress and a stable checksum.
- Import supports file selection/drop, size/app/schema/checksum/required-field validation, a dated summary preview, three-second click-again confirmation, and quiet errors. Closing the panel invalidates pending file reads.
- Level 2/3 actions write `cardable.save.backup` before the durable main save. A failed backup or replacement leaves all active progress unchanged. Restore swaps current/previous snapshots. Backup metadata includes timestamp, counts, packs and currency and survives reload.
- Reset requires a three-second monotonic hold, with fluid/specks, early-release drain, reduced-motion bar and Escape/blur/hidden cancellation. Single clicks, repeats and quick keyboard presses cannot reset. Fresh progress preserves normalized settings.
- Import/reset/restore offer 15-second Undo; Replay tutorial offers eight-second Undo that changes only tutorial state. The boot-mounted monochrome glass toast animates as one surface through transform/clip-path; storage failures remain retryable.
- Every replacement emits `save:replaced`, refreshing existing modules and pending-reveal recovery without a hard reload or another pull. Dev reset uses the same backup safety.
- Focused verification: `node tools/check-stage11b.cjs` passes 20 behavior groups, including all 40 isolated dev checks. Coverage includes round-trip game fields, tampering, storage failures, confirmation safety, backup/restore/Undo, async cancellation and module replacement. No application console errors occurred in the simulated runtime.

## Skipped or changed

- Honored the request for less testing: one focused Data suite and isolated dev checks; no repeated historical gate or performance profiling in this part.
- Updated superseded Stage 8/11a fixtures that expected disabled Data controls. The broad historical suites were not rerun for this checkpoint.
- Screenshot critique, actual browser downloads/drop behavior, first-frame glass compositing, file-open compatibility and measured FPS remain unconfirmed. The existing browser-preview restriction was respected; no alternate server or browser workaround was used.
- Preserved unrelated card/rarity/config/currency/pack edits and untracked hero/font assets. No new color system, audio, market or artwork changes belong to this commit.
- The checksum is FNV-1a for accidental corruption detection, not cryptographic authentication. External imports use strict catalog/serial validation; trusted local backup restore preserves retired owned records with the existing load rules.

## Look at

1. Double-click `index.html`, press S and scroll to Data. Export: inspect the line/check timing and the downloaded dated file. Import it by selection and drop; inspect summary, first-click countdown, timeout and second-click replacement.
2. Change a copied file's currency without recomputing its checksum. Import must reject it. Try a wrong app, newer schema, oversized file and unreadable JSON; progress must remain unchanged.
3. Try Reset by click, brief Enter/Space, 2.9-second release, Escape, blur and tab switching. Only a complete three-second hold resets. Settings stay; Undo restores all progress. Reload and verify Restore previous save remains available.
4. Simulate blocked/full localStorage: export works; level 2/3 actions stop with an error; tutorial/settings remain session-capable. An Undo write failure must remain retryable in the toast.
5. Import a pending reveal: the saved card returns at Keep without another draw or pack consumption. Replay tutorial and Undo it; imported/reset/restored currency, inventory, timer/title and settings should update without reloading.
6. Check keyboard focus, nested Escape, narrow panel layout, reduced motion and Low's solid toast surface. Inspect the toast from its first visible frame and the reset fill/drain in a permitted browser.

Source critique: the compact summary and persistent settings helper explain the destructive boundary; chrome remains neutral, with no extra card effects. Actual text wrapping, fluid restraint, toast alignment and glass timing still need rendered review. Ranked follow-ups are in POLISH-BACKLOG.md.

## Open questions

- Used section 6 confirmation levels and 8/15-second Undo windows; section 3 settings defaults remain authoritative. Backup is a single durable snapshot, while Undo is session state.
- Current schema stays 2 with settingsVersion 1. Checked schema-1 exports migrate; the older raw JSON core remains available for compatibility. The Data panel accepts the checked envelope only.
- Preserved existing defaults: #3 monochrome chrome, #7 serial format, #19 local font fallbacks and #21 desktop scope. Reset uses the current configured starting stock (two packs); gameplay config and data were not changed.
