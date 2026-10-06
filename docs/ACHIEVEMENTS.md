# Achievements — current contracts

The engine, metric projection and catalog are `src/core/achievements.js`, `src/core/achievement-metrics.js` and `src/data/achievements.js`; the view is `src/ui/achievements.js`. This promotes actual implementation contracts from the retained [original spec](../archive/update-history/2.7.0-achievements/SPEC.md), without assuming its old active totals. [registry-snapshot.json](../archive/4.2.0-cleanup/registry-snapshot.json) is a data-only source inspection dated 2026-10-06, not a game test.

## Catalog and availability

The current registry defines **57 achievements**. Evaluating actual flags/predicates with the explicitly declared `cut:complete` event gives **41 initially available** and 16 capability-gated definitions. Existing `studio:photo` and `picker:chosen` publishers can activate six more through `events:available`, making **47 available after those events**. Ten still lack a current capability or publisher. These counts are source-derived availability, not player unlock totals; runtime `list()` remains authoritative.

The complete current ID/name/group/goal/requirement table follows below. Goals derived from active cards, packs, generations or variants are snapshots and change with catalog data. Do not hard-code the totals in UI or fabricate missing producers.

## Optional save state and rewards

`save.achievements` is optional under save schema 5. Defaults are `counters:{}`, `unlocked:{}`, `seen:[]`, `settingsSeenIntro:false`. Entries in `unlocked[id]` hold `tier`, per-tier `at` and `retro`, with optional triggering `cardId`/`instanceId`. Additional optional fields include `trackedEvents`, `distinct`, `seeded`, `catalogRevision` and compact `history` arrays/counters. Validation checks integer counters, tier ladders, finite dates and field shapes. Legacy saves without the field initialize it; imports/backups/Restore/Undo pass through whole-save validation.

The loader explicitly retains/normalizes optional state. Initialization rebuilds projections from actual owned instances, committed opening totals and preserved event receipts. Backfill marks retro unlocks and publishes individual contractual events followed by one summary toast; no speculative replay of every past action is performed. Event receipts keyed by photo/event/instance prevent duplicate progress. Seen IDs describe viewed awards, not ownership.

Unlock recording and the catalog's credit reward occur before publishing each unlock. Replayed tiers cannot pay again in the current engine. Persistence uses the existing state save path; this is not a new guaranteed atomic disk transaction. Rewards currently use credits, because no typed pack-grant producer exists. Do not add shop/market functionality to activate dormant definitions.

## Engine and event APIs

`C.achievements.register(def)` indexes validated unique IDs and strictly ascending positive goal ladders. Trackers use one `track.counter`, `track.event` (+ optional `test`, `distinct`, `key`, `backfill`) or `track.derive` with its event list. A `requires` name is checked against actual config flags, catalog predicates or supported event publishers.

- `progress(id)` returns `{value,goal,tier,maxTier}` or null for absent/inactive definitions.
- `list()` returns active definitions; `totals()` returns `{unlocked,total,achievements}` (unlocked tiers, all active tiers, achievement IDs with at least one unlock).
- `init()`, `handle(name,payload)`, `isUnlocked(id)`, `available(name)` and `markSeen(id)` coordinate initialization, progress and viewing.
- `create(adapter)` supplies the same isolated engine for existing developer checks. `setCounter`, `unlock`, `lock` are existing developer controls, not ordinary gameplay shortcuts.

Publish `achievement:unlocked {id,tier,at,retro}` through `C.events`; the view/Journal subscribe independently. Other events are `achievement:backfilled {count}`, `achievement:changed` and `achievement:resetting`. Producers must not call Journal or achievement UI directly. `save:replaced` resets views and rebuilds progress; startup initializes after `app:ready` and accounts for a persisted reservation before its receipt. Visibility/pagehide preserve visit timing. No extra polling or renderer loop is needed.

## UI and dormant requirements

The inventory exposes Achievements beside cards/History. The existing view supplies grouped monochrome tiles, progress/tiers, filter/search, hidden-achievement concealment, detail/evidence and viewed state. Unlock toasts queue and avoid active opening/modal contexts; retro backfill uses a summary. It follows shared quality/reduced-motion, focus and sole-full-card rules. Normal play does not load developer tooling.

Current unavailable requirements: Legendary pack; five variant slots; combos; multiple variants; Mythic-class variants; release years; shop economy; explicit cutscene completion/skip publishers. `opening:introEnd` is not proof that a real Secret film completed or was skipped. `fatal-exception`/`skipper` remain gated until their exact producers exist; source contains `cutscene:beat`, not these completion contracts. Studio/Picker availability emerges when their real event is declared/emitted, rather than from the existence of a listener. Preserve this distinction when adding capabilities.

## Extension recipe and acceptance

Add a data definition with a unique ID, group/glyph/copy, increasing tiers and a tracker; implement any new metric in the compact projection, and add a `requires` predicate for absent capabilities. Declare a publisher only when its payload/behavior actually exists. Keep receipt keys stable and rewards compatible with the current save pipeline. UI reads the registry and shared events. Do not bump the save schema for additive optional achievement state.

Historical logic/UI evidence remains in alpha-updates and the worktree audit. The D catalog inspection did not run a new check or certify every tile, producer, reward/reload and physical UI path. Follow [BUGS](BUGS.md), [ROADMAP](ROADMAP.md) and the restricted [PROMPTING](PROMPTING.md) policy for further acceptance.

## Current registry snapshot

| ID | Name / group | Goal ladder | Requires / availability |
|---|---|---|---|
| `pack-opener` | Pack Opener / packs | 1, 10, 50, 250, 1000 | Initially available |
| `variety-pack` | Variety Pack / packs | 3, 6, 10 | Initially available |
| `rare-find` | Rare Find / packs | 1, 5, 25 | `pack:rare`; Initially available |
| `legendary-moment` | Legendary Moment / packs | 1, 3 | `pack:legendary`; Dormant |
| `patient-collector` | Patient Collector / packs | 1 | Initially available |
| `collector` | Collector / collection | 10, 25, 50, 100, 126 | Initially available |
| `generation-complete` | Generation Complete / collection | 1, 2 | Initially available |
| `full-spectrum` | Full Spectrum / collection | 4, 8, 12 | Initially available |
| `duplicates` | Duplicates / collection | 3, 10, 25 | Initially available |
| `first-variant` | First Variant / variants | 1 | Initially available |
| `variant-hunter` | Variant Hunter / variants | 5, 11 | Initially available |
| `slot-machine` | Slot Machine / variants | 5 | `variants:slots`; Dormant |
| `combo-breaker` | Combo Breaker / variants | 1 | `variants:combos`; Dormant |
| `triple-threat` | Triple Threat / variants | 1 | `variants:multiple`; Dormant |
| `mythic-touch` | Mythic Touch / variants | 1 | `variants:mythic`; Dormant |
| `time-capsule` | Time Capsule / era | 1 | `catalog:releaseYears`; Dormant |
| `classic-collector` | Classic Collector / era | 5, 14 | Initially available |
| `newcomer` | Newcomer / era | 1 | Initially available |
| `daily-ritual` | Daily Ritual / habits | 3, 7, 30 | Initially available |
| `night-owl` | Night Owl / habits | 1 | Initially available |
| `welcome-back` | Welcome Back / habits | 1 | Initially available |
| `streak` | Streak / habits | 5 | Initially available |
| `hot-streak` | Hot Streak / luck | 3 | Initially available |
| `cold-snap` | Cold Snap / luck | 10 | Initially available |
| `variant-run` | Variant Run / luck | 2 | Initially available |
| `spender` | Spender / meta | 100, 1000, 10000 | `shop`; Dormant |
| `saver` | Saver / meta | 1000, 10000, 100000 | `shop`; Dormant |
| `tidy` | Tidy / meta | 10 | Initially available |
| `archivist` | Archivist / meta | 1 | Initially available |
| `settings-tinkerer` | Settings Tinkerer / meta | 5 | Initially available |
| `cut-above` | Cut Above / meta | 1 | `cut:complete`; Initially available |
| `shutterbug` | Shutterbug / studio | 1, 10, 50 | `studio:photo`; After real publisher event |
| `director` | Director / studio | 5 | `studio:photo`; After real publisher event |
| `colorist` | Colorist / studio | 3 | `studio:photo`; After real publisher event |
| `portfolio` | Portfolio / studio | 10 | `studio:photo`; After real publisher event |
| `pickers-remorse` | Picker’s Remorse / picker | 1 | `picker:chosen`; After real publisher event |
| `good-eye` | Good Eye / picker | 10 | `picker:chosen`; After real publisher event |
| `fatal-exception` | Fatal Exception / rarity | 1 | `cutscene:finished`; Dormant |
| `skipper` | Skipper / rarity | 1 | `cutscene:skipped`; Dormant |
| `brand-loyalty-amd` | Brand Loyalty · AMD / collection | 1 | Initially available |
| `brand-loyalty-nvidia` | Brand Loyalty · NVIDIA / collection | 1 | Initially available |
| `brand-loyalty-intel` | Brand Loyalty · Intel / collection | 1 | Initially available |
| `brand-loyalty-apple` | Brand Loyalty · Apple / collection | 1 | Initially available |
| `brand-loyalty-qualcomm` | Brand Loyalty · Qualcomm / collection | 1 | Initially available |
| `first-rare` | First Rare / rarity | 1 | Initially available |
| `first-super-rare` | First Super Rare / rarity | 1 | Initially available |
| `first-legendary` | First Legendary / rarity | 1 | Initially available |
| `first-mythical` | First Mythical / rarity | 1 | Initially available |
| `first-exotic` | First Exotic / rarity | 1 | Initially available |
| `first-ascendant` | First Ascendant / rarity | 1 | Initially available |
| `secret-occurred` | A Secret Has Occurred / rarity | 1 | Initially available |
| `first-serial` | First Serial / serials | 1 | Initially available |
| `low-serial` | Low Serial / serials | 1 | Initially available |
| `round-number` | Round Number / serials | 1 | Initially available |
| `palindrome` | Palindrome / serials | 1 | Initially available |
| `lucky-seven` | Lucky Seven / serials | 1 | Initially available |
| `triplets` | Triplets / serials | 1 | Initially available |
