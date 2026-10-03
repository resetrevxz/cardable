# Achievements — milestones A and B

Branch: `update/achievements-ab`. The parent baseline is an isolated snapshot of the shared checkout, including its uncommitted updates. The original checkout and index were not changed. Integration should cherry-pick only the milestone commits after that baseline.

## Milestone A

Optional `save.achievements` survives validation, load, import/export, reset, Restore and Undo without a schema bump. The engine indexes trackers by counter/event, keeps ownership sets incrementally, queues ordered unlock events, records each tier and its credit reward together, and backfills once from available inventory/statistics. Per-instance event receipts under optional `trackedEvents` make reveal recovery and replay idempotent. The only Journal integration is `achievement:unlocked { id, tier, at, retro }`.

Eight foundation entries demonstrate the system: Pack Opener, Collector, First Rare, A Secret Has Occurred, First Variant, First Serial, Archivist and Settings Tinkerer. The complete catalog belongs to C. Retro dates use earliest relevant owned-instance evidence; unknown pack dates remain null. Historical discarded cards cannot be reconstructed. Retro rewards pay once with one summary toast; individual retro events remain available to the Journal.

Toasts merge synchronous bursts, wait until the menu is safe, dismiss after four seconds and obey the additive Controls setting. Credits reuse existing counter/shimmer feedback. Dev tools provide unlock, held lock, set counter and presentation-only toast replay. `Cardable.dev.checkAchievements()` is an isolated, manual check; it is never included in the older suite and never runs at startup.

There is no production typed pack-grant API, so pack rewards are deferred; no pack, cutscene, opening style or finish file is changed.

## Milestone B

The glass panel has a total tier ring/count-up, category counts, search, All/Unlocked/In progress/Locked filters and Recent/Name/Progress/Group sorts. Tiles show monochrome glyphs, fluid progress, tier ticks, dates and an unseen dot until their detail is opened. Hidden achievements conceal their glyph, name, description, progress and rewards until unlocked. Detail presents the tier ladder, rewards and dates; a surviving triggering instance links into the existing inventory detail flow.

The toolbar now exposes the small `inventoryToolbar.registerTool()` hook. Achievements uses that registry, the existing main-menu context-menu registry and the toast. `inventory:showInstance` resets the current query/facets and routes through the existing detail handoff. The panel owns focus and shortcuts, traps Tab, suspends background interactions and restores focus. High supports pointer light along the border; Medium omits it, Low uses fades and static counts/fills, Very Low has no animation, and reduced motion uses opacity.

## Exactly what remains — milestone C

- Packs: Variety Pack, Rare Find, Legendary Moment and Patient Collector.
- Collection: Collector's final all-cards tier, Generation Complete, five Brand Loyalty entries, Full Spectrum and Duplicates.
- Rarity: First Super Rare, First Legendary, First Mythical, First Exotic, First Ascendant, Fatal Exception and Skipper.
- Variants: Variant Hunter, Slot Machine, Combo Breaker, Triple Threat and Mythic Touch; only the current single-variant architecture is available in this baseline.
- Serials: Low Serial, Round Number, Palindrome, Lucky Seven and Triplets.
- Era: Time Capsule, Classic Collector and Newcomer.
- Habits: Daily Ritual, Night Owl, Welcome Back and Streak.
- Luck: Hot Streak, Cold Snap and Variant Run.
- Economy/meta: conditional Spender/Saver, Tidy and optional Cut Above.
- Studio: conditional Shutterbug, Director, Colorist and Portfolio.
- Picker: conditional Picker's Remorse and Good Eye.
- Finish the conditional event-capability discovery and integrations. A/B supports feature-flag requirements and excludes unmet requirements from list/totals; event-based capability enabling is C.
- Tune the full catalog's rewards, add its completion thresholds, and complete C's final polish. Typed pack rewards remain unavailable until an existing production grant API is supplied.

## Assumptions and integration notes

`2.4.0-achievements` was the next folder after `2.3.0-secret-cutscene` in the shared baseline. The supplied spec was moved unchanged into `SPEC.md` in this worktree. No schema/version config, pack registry, packs.js, cutscene engine, opening styles or cutscene finishes were changed. The eight foundation definitions are deliberately a subset; historical events without surviving inventory/statistics cannot be inferred. Unknown dates show Before tracking.

The live check used one file:// browser opening with the existing dev sandbox. Two pre-existing dev/tutorial issues required session-only navigation workarounds: Escape dismissed the tutorial because its Skip button was covered by the Settings corner; the hidden palette's inner section was marked hidden for the context-menu check because the existing menu guard checks that inner section rather than its hidden ancestor. Neither unrelated source file was changed.

Testing: One file:// game opening confirmed unlock deferral/merged toast, panel filtering/search/sort/concealment, tier detail, triggering-card link and all three entries with zero game-console errors; `Cardable.dev.checkAchievements()` ran once and passed in 2 ms; no old tests, test files, screenshots, recordings or profiling.
