# Achievements — 1.1.0 local rework

The achievement catalogue, board and view run offline from the main `index.html`, using classic scripts and the existing inventory extension registry. Public version remains **1.1.0**. The owner requests local delivery only; do not publish this update to GitHub.

## Three kinds

- **Weekly:** exactly three current goals. Monday 00:00 UTC resets, with a deterministic three-week rotation. Pack Enthusiast opens 8/12/16 packs; Time Investor keeps the visible game open for 2/3/2.5 hours; Pack Dedication combines 20 packs and four visible hours. Every objective is deterministic. Credits require an explicit claim. Completed unclaimed goals survive rollover in Unclaimed Rewards; incomplete progress expires. Backward clock changes cannot reroll an existing week.
- **Recurring:** exactly twenty definitions: six pack-opening, six visible-time, four card-keeping, two saved Studio-photo and two distinct opening-day goals. Each completed cycle automatically pays credits and preserves overflow. Borders evolve at 1, 3, 10, 25 and 100 cycles; all five designs can be previewed without unlocking them. Difficulty is Common, Uncommon, Rare or Legendary. These are task difficulties, independent of pulled-card rarity.
- **One-time:** retain all 57 legacy catalogue definitions and their capability gates, now with two-word names and one objective/reward each. **No milestone ladders.** The first existing goal becomes the single target; existing higher-tier unlock receipts and paid credits remain preserved. Rare Discovery accepts Rare or higher. Definitions without an actual producer stay dormant.

The owner did not supply a replacement one-time list, so the existing catalogue is retained. Recurring rewards auto-claim by default. New weekly/recurring progress begins when the board initializes; historical actions are not used to generate new repeatable credit rewards.

## State and event contracts

Save schema remains **5**. `save.achievements` retains legacy counters, unlocked/seen IDs, seeded definitions, tracked instance/photo receipts and compact history. New optional `board` holds week start, weekly/recurring counter baselines, completed weekly claim receipts, recurring cycles, pins and earned credits. Board shapes are validated by normal load/import/backup/restore. Legacy awards are never reset or paid again just for catalogue conversion.

`achievement:unlocked { id, tier, at, retro }` stays the event bus contract. A weekly completion emits it once, with tier 1, before manual payment; claiming does not emit a second unlock. Weekly IDs include their period. Recurring tier is its completed cycle count. Reward and progress mutations persist together before unlock events drain. The achievement system consumes producer events independently; archived card-history state is unused. Ownership counters refresh on delete/undo while earned rewards and receipts remain permanent.

Pack totals follow durable opening counts, never reserved offer counts. Card keeping uses instance deduplication. Studio photos use the original stable photo receipts. Time uses `performance.now()` samples from the existing one-second `timer:tick`, with no new interval or animation loop. Hidden/minimized intervals, relaunch gaps and suspended timer gaps over five seconds do not count. Progress is checkpointed every 30 seconds or immediately for awards/claims/leave; other saves include current in-memory progress. Week scheduling uses actual UTC rather than the developer virtual clock.

`C.achievements.list/progress/totals` include scheduled definitions. Progress adds objective values, completion ratio, cycles, visual rank and ready/claimed flags. `claim(id)`, `togglePin(id)`, `isPinned(id)`, `weekEndsAt` and `tickOpen(seconds,force)` extend the existing API. A weekly pin follows its slot into the next week.

## Inventory presentation

A shaded split workspace replaces the tile dashboard. The grouped list offers Pinned, Weekly, Unclaimed Rewards, Recurring and One-time sections, search, difficulty and All/Ready/Active/Complete filters. The inspector has original local SVG illustrations, per-objective bars, credit rewards, optional evidence-card navigation, disclosure controls and recurring milestone/border previews. The fixed footer summarizes current-objective completion and lifetime cycles/one-time counts; recurring cycles and weekly resets can decrease the current-objective percentage.

Below 760 px, list and inspector become separate views with an explicit back control. Native controls support keyboard focus and 44 px targets. Rarity/difficulty uses words and border patterns, not hue. Very Low disables decorative dots and inset milestone ornaments; independent background/border/shadow/animation policies and reduced motion apply. No perpetual cosmetic loop, backdrop blur, live illustration renderer or second inventory/modal system is added. Static evidence thumbnails are released on selection/close.

Design review references: [Vercel interface guidelines](https://vercel.com/design/guidelines), [Apple layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Apple progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators). Apply hierarchy, progressive disclosure, accurate progress, native controls, redundant status and reduced motion within Cardable’s shaded design rules. The owner subsequently permits colored default chrome: weekly lavender, recurring teal, pinned rose, difficulty mint/green/periwinkle/amber and warm credit rewards. The existing Color theme setting changes all achievement accents and illustrations to monochrome without altering progress or actions. This is not full cross-device accessibility certification.

Follow current PROMPTING: one existing `Cardable.dev.checkQol()` with small isolated board assertions, one game session/feature and console observation. No old suites, new test files, screenshots, recordings or profiling. Desktop packaging/hashes are delivery evidence only.
