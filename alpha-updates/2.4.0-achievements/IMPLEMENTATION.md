# Achievements — milestones A, B and C

Branch: `update/achievements-ab`. The parent baseline is an isolated snapshot of the shared checkout, including its uncommitted updates. The original checkout and index were not changed. Integration should cherry-pick only the milestone commits after that baseline.

## Milestone A

Optional `save.achievements` survives validation, load, import/export, reset, Restore and Undo without a schema bump. The engine indexes trackers by counter/event, keeps ownership sets incrementally, queues ordered unlock events, records each tier and its credit reward together, and backfills once from available inventory/statistics. Per-instance event receipts under optional `trackedEvents` make reveal recovery and replay idempotent. The only Journal integration is `achievement:unlocked { id, tier, at, retro }`.

Eight foundation entries demonstrate the system: Pack Opener, Collector, First Rare, A Secret Has Occurred, First Variant, First Serial, Archivist and Settings Tinkerer. The complete catalog belongs to C. Retro dates use earliest relevant owned-instance evidence; unknown pack dates remain null. Historical discarded cards cannot be reconstructed. Retro rewards pay once with one summary toast; individual retro events remain available to the Journal.

Toasts merge synchronous bursts, wait until the menu is safe, dismiss after four seconds and obey the additive Controls setting. Credits reuse existing counter/shimmer feedback. Dev tools provide unlock, held lock, set counter and presentation-only toast replay. `Cardable.dev.checkAchievements()` is an isolated, manual check; it is never included in the older suite and never runs at startup.

There is no production typed pack-grant API, so pack rewards are deferred; no pack, cutscene, opening style or finish file is changed.

## Milestone B

The glass panel has a total tier ring/count-up, category counts, search, All/Unlocked/In progress/Locked filters and Recent/Name/Progress/Group sorts. Tiles show monochrome glyphs, fluid progress, tier ticks, dates and an unseen dot until their detail is opened. Hidden achievements conceal their glyph, name, description, progress and rewards until unlocked. Detail presents the tier ladder, rewards and dates; a surviving triggering instance links into the existing inventory detail flow.

The toolbar now exposes the small `inventoryToolbar.registerTool()` hook. Achievements uses that registry, the existing main-menu context-menu registry and the toast. `inventory:showInstance` resets the current query/facets and routes through the existing detail handoff. The panel owns focus and shortcuts, traps Tab, suspends background interactions and restores focus. High supports pointer light along the border; Medium omits it, Low uses fades and static counts/fills, Very Low has no animation, and reduced motion uses opacity.

## Milestone C

All 57 starter definitions are present, including the five separate Brand Loyalty entries. Their credit rewards and completion thresholds live in data. Collector includes the all-active-cards tier; generation, pack-variety, variant-hunter, combo and classic ladders cap suggested thresholds to the actual catalog and deduplicate identical goals. Earned tiers remain permanent.

`achievement-metrics.js` keeps ownership, copies, rarity coverage, variant kinds/slots, completed generations and brands in cached sets/maps. Pack commits update pack-type/day history, local night/streak progress and luck sequences once per lifetime opening number. A ten-pack window counts variant-bearing cards. Reveal/Keep receipts prevent repeated instance events from paying twice. Pending kept cards restore the ownership cache, and a reserved pack with a missing event receipt can recover its tracking. Missing intermediate packs break a luck sequence instead of fabricating its contents. Favorites, settings, save exports, return visits and optional Studio events update only their affected counters.

New optional fields under `achievements` are `history`, `seeded`, `catalogRevision` and `distinct`; each is validated on import. This catalog revision is independent of the save schema. A/B saves seed the added definitions once using surviving inventory/statistics; existing earned tiers do not pay again. A future catalog revision can reevaluate added tiers without resetting earned progress. The one retro summary counts only the achievements newly unlocked in that pass.

The event bus now distinguishes listening from publishing: `events.declare(name)` lets a feature announce its event before its first action, `events.supports(name)` checks availability, and an actual emission also declares that event. Conditional definitions react to that announcement and stay absent from UI/totals until available. Known catalog capabilities have predicates. The existing opening geometry publisher is declared for optional Cut Above. No Journal API is called.

Polish adds the catalog's monochrome clock, coin, cut, camera and eye glyphs, masks hidden progress in sorting, releases an existing detail's focus trap before replacing it, and fades detail dismissal. Very Low remains immediate. Developer unlock/set-counter actions now modify and reward a single durable candidate so the existing Undo checksum succeeds. The existing check also covers an A/B catalog upgrade and optional-publisher replay receipts; no second check or test file was added. `index.html` loads the new metrics tracker before the achievements engine and retains all A/B script/style hooks.

## Unfinished and dormant dependencies

No milestone implementation remains unfinished. In this baseline 41 definitions are active, totaling 62 tiers; 16 definitions are deliberately dormant and excluded from UI/totals:

- Legendary Moment: no enabled Legendary pack.
- Slot Machine, Combo Breaker, Triple Threat and Mythic Touch: no five-slot, named-combo, multiple-variant or Mythic-variant catalog capability.
- Time Capsule: no verified `releaseYear`/`releasedAt` metadata. Classic-era labels do not prove a release before 2003.
- Spender/Saver: no `shop` feature flag or declared capability.
- Shutterbug, Director, Colorist and Portfolio: no Studio publisher.
- Picker's Remorse and Good Eye: no Picker publisher.
- Fatal Exception and Skipper: no explicit completion/skip publisher. A generic intro-end event cannot distinguish those outcomes.

Future publishers can declare their event at feature initialization. `studio:photo` accepts `{ photoId, cardId, props: [id | {id}], lights: [{color}] }`; `photoId` is the replay receipt. `picker:chosen` accepts `{ eventId, choices: [three card/rarity records], chosenIndex }` or `chosen`. `cutscene:finished` accepts `{ eventId, rarity: 'secret', completed: true, skipped: false, preview: false }`; `cutscene:skipped` accepts a rarity ID and must exclude previews. The protected cutscene, pack and finish files were not modified to add these publishers.

Pack rewards remain deferred because no production typed pack-grant API exists. All implemented rewards use credits. Historical luck, visits, photographs, settings changes and discarded pulls without saved evidence cannot be backfilled.

## Assumptions and integration notes

`2.4.0-achievements` was the next folder after `2.3.0-secret-cutscene` in the shared baseline. The supplied spec was moved unchanged into `SPEC.md` in this worktree. No schema/version config, pack registry, packs.js, cutscene engine, opening styles or cutscene finishes were changed. Unknown dates show Before tracking. Serial palindrome/triplet matching uses the unpadded numeric counter, avoiding automatic awards for every zero-padded serial. Latest generation uses catalog order; only active card definitions count toward collection completion. Cut Above accepts completed normalized geometry with at most 0.005 deviation from a straight line, including the existing assisted straight cut. Patient Collector requires a refill event reaching a stock cap of at least two. Habits use local calendar days and real wall time; away time starts at the last visible visit, hide or page exit.

The live check used one file:// browser opening with the existing dev sandbox. Two pre-existing dev/tutorial issues required session-only navigation workarounds: Escape dismissed the tutorial because its Skip button was covered by the Settings corner; the hidden palette's inner section was marked hidden for the context-menu check because the existing menu guard checks that inner section rather than its hidden ancestor. Neither unrelated source file was changed.

Testing (A/B): One file:// game opening confirmed unlock deferral/merged toast, panel filtering/search/sort/concealment, tier detail, triggering-card link and all three entries with zero game-console errors; the single logic check passed in 2 ms.

Testing (C): One file:// game opening confirmed the active/dormant catalog, a real variant-bearing Rare reveal and Keep, deferred merged toast, serial/luck progress, detail/search/hidden tiles and developer Undo with zero game-console errors; `Cardable.dev.checkAchievements()` ran once and passed in 1 ms; no old tests, test files, screenshots, recordings or profiling.
