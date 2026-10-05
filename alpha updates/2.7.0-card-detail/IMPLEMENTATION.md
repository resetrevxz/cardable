# 2.7.0 — Card detail delivery

## Done

- A 360 px panel centered beside the card, stacked below it under 900 px. Small screens scroll the entire detail view rather than the information panel.
- Dim generation/rarity overline and large name; no separate tier badge, tier meter, serial strip, generic rarity description or repeated plate specs.
- At most three chips **including** the `+N` control. Variant, pack and freshness are ordered by priority; when all three apply, freshness moves into the popover to preserve the cap. Normal appears only in expanded metadata/copy selection. Rare Pack retains its already authorized sapphire provenance accent; other chrome stays monochrome.
- The existing shared segmented-control spring drives Overview/History. Both panes have tab semantics and keyboard focus management. The per-card journal renderer mounts directly into History and suppresses inline serial sentences while the full journal remains unchanged.
- Additional catalog specs only, a collapsed All specs disclosure, ownership/date, optional actual catalog lore and selected-copy controls. No release dates or flavor text were invented.
- The registered studio Inspect action remains primary. Icon actions have shortcut tooltips; More includes export, copy, collection membership and deletion of the selected copy. Delete reuses the existing three-second confirmation component and commits removal before closing; a failed write preserves ownership. It grants no reward or currency and does not change pack/serial counters.
- Navigation chevrons beside the card; external R hint; clickable front/back serials with Clipboard API/textarea fallback and a temporary copied check.
- Neighboring inventory sheet completely hidden, approximately 90% black detail backdrop, no horizontal scrollbars, bounded default panel and hover-only thin vertical scrollbars when disclosures/history need them.
- Panel entry uses 40 ms stagger, 8 px rise and High-only unblur, with chips last. Medium omits item blur; Low/Very Low and reduced motion use opacity only. Existing card rendering and motion remain shared.

## Skipped or changed

- Testing followed the user's restricted single-session instruction. No old suites, new tests, screenshots or profiling were used. This is a focused UI check, not a broad gameplay regression claim.
- The initial check found hidden History content contributing overflow and serials inside journal sentences. Those were corrected, with the edited CSS and journal renderer refreshed in the same running game before the variant check. The game was opened once.
- Shared tracked/untracked files already contained unrelated edits. `INTEGRATION.patch` records **only this task's already-applied changes** against the captured pre-task contents. It is not a patch to apply again in this checkout. The checkpoint stages the new panel/style/delivery files and this focused integration artifact, leaving shared files unstaged.

## Look at

- Open any owned card; try Overview/History, `+N`, the selected-copy disclosure, I/H/F/R, arrow keys and Escape. Primary card specs remain on the card.
- On narrow screens, scroll the whole detail page to the actions. The panel itself stays compact and has no horizontal scroll.
- The one permitted browser session checked the requested normal/variant UI, not destructive deletion, export, clipboard permission branches or a full Inspect studio session.

## Open questions

- None blocking. The three-chip cap includes `+N`; lower-priority freshness is available inside it when variant and pack occupy the other two slots.

Testing: One offline browser session checked normal/variant cards at 1280×720 and a 390 px viewport, tabs, metadata popovers and bounds; no game console errors, screenshots, test files, suites or profiling.
