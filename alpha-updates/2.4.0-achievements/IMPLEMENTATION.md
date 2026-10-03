# Achievements — milestones A and B

Branch: `update/achievements-ab`. The parent baseline is an isolated snapshot of the shared checkout, including its uncommitted updates. The original checkout and index were not changed. Integration should cherry-pick only the milestone commits after that baseline.

## Milestone A

Optional `save.achievements` survives validation, load, import/export, reset, Restore and Undo without a schema bump. The engine indexes trackers by counter/event, keeps ownership sets incrementally, queues ordered unlock events, records each tier and its credit reward together, and backfills once from available inventory/statistics. Per-instance event receipts under optional `trackedEvents` make reveal recovery and replay idempotent. The only Journal integration is `achievement:unlocked { id, tier, at, retro }`.

Eight foundation entries demonstrate the system: Pack Opener, Collector, First Rare, A Secret Has Occurred, First Variant, First Serial, Archivist and Settings Tinkerer. The complete catalog belongs to C. Retro dates use earliest relevant owned-instance evidence; unknown pack dates remain null. Historical discarded cards cannot be reconstructed. Retro rewards pay once with one summary toast; individual retro events remain available to the Journal.

Toasts merge synchronous bursts, wait until the menu is safe, dismiss after four seconds and obey the additive Controls setting. Credits reuse existing counter/shimmer feedback. Dev tools provide unlock, held lock, set counter and presentation-only toast replay. `Cardable.dev.checkAchievements()` is an isolated, manual check; it is never included in the older suite and never runs at startup.

There is no production typed pack-grant API, so pack rewards are deferred; no pack, cutscene, opening style or finish file is changed.

## Unfinished after A

Milestone B: panel, tiles, filters, sorts, search, categories, detail ladder/card link and entry points.

Milestone C: all remaining starter entries, final reward tuning, conditional feature/event capabilities, catalog completion tiers and final polish.

Testing is deferred until the end of the last milestone completed in this run, per the requested policy.
