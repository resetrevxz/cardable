# Card History / Journal — milestones A, B, C

Implemented in branch `update/card-history`, worktree `D:/CardableV2/card-history-work`.
The separate `721be86` baseline snapshots the existing dirty shared checkout;
only commits after it belong to this update. Do not cherry-pick the baseline.
The shared checkout was read and copied, never changed by this update.

## A — data and engine

`src/data/journal.js` owns entry kinds, glyph paths, filter groups, thresholds
and at least five seeded text alternatives for each entry kind. Templates are
chosen and saved at write time; consecutive choices of the same kind differ.
`src/core/journal.js` owns optional `save.journal`, chronological silent
backfill, immutable first flags, duplicate event guards, daily counts and best
pulls, milestones, streaks and compaction. The save schema remains 5.

The save loader has one additive line to normalize and retain Journal on
import/restore. Old saves without it remain valid. Initial backfill uses actual
instance dates, serials, variant IDs and provenance. Undated copies borrow the
nearest dated inventory neighbour; if none exists, they use Before tracking.
Historical pack totals are known, but their individual opening dates are not;
their backfilled milestones use Before tracking. No daily pack dates are invented.

The engine subscribes to `card:kept` and `pack:opened`. The already existing
`opening:prepareCommit` and `opening:prepareKeep` events put Journal updates in
the opening's cloned save candidate before its durable write. A failed write
cannot advance real history, and a recovered Keep cannot double-log a copy.
Only Journal fields are written; other save fields and game rules are unchanged.
Every timestamp uses `C.clock.now()` where a virtual clock exists.

At 5,000 stored top-level entries, oldest pulls become daily summaries. Their
counts, best pull, card counts and daily chart totals survive. When separate
days alone fill the budget, envelopes retain their individual daily summaries.
If protected/event records alone fill it, envelopes retain those exact records
too; firsts and milestones are never deleted. The UI expands envelopes only into
logical rows and still mounts a bounded viewport. Compacted per-card copy rows
are rehydrated from the unchanged inventory, retaining serial and finish data.

Optional `achievement:unlocked` and `studio:photo` subscriptions are inert when
no producer emits them. No Achievements or Studio API is called. Achievement
identity includes tier to retain repeat tier unlocks. Names come from event
copy or the optional data catalog. Per-card association comes from event IDs
or the saved trigger metadata attached to that unlock. Photo identity is
deduplicated when its producer supplies an ID. Combos are logged when kept
instances carry `comboId`; no combo rules or definitions are fabricated.

The sole new check is `Cardable.dev.checkJournal()` in the conditional developer
loader. It is opt-in, isolated and never registered with or run by older suites.

## B — Journal sheet

History registers with `C.inventoryTabs`, a small additive registry created
because the baseline had no extension registry. Right-click History uses the
existing context-menu registry. The new sheet provides the 53-by-7 canvas
calendar with day hover, keyboard selection and day filtering; four shared
rolling-number stats; the canvas cumulative growth chart with crosshair;
seven counted filter chips; search; date selection; and Highlights only.

The timeline alternates around its river on wide displays and stacks on narrow
ones. Sticky date groups, entry glyphs, static colored card thumbnails, variant
glyphs, neutral tier ticks, highlight cards and recovered-memory labels use the
existing fonts and monochrome glass family. The list uses binary viewport
lookup, a margin of recycled rows and explicit thumbnail cleanup. Entry clicks
use a narrow `inventory:showCard` hook to reach the existing detail view.
Up/Down, Home/End, Enter, slash search and focus trapping are supported.

## C — card memories and presentation

Detail History registers with `C.detailActions`, the other missing additive
hook. Its compact virtual timeline includes firsts, additional serials,
variants, combos, photos and associated achievements, plus the shared copy
summary. It mounts no additional full card. Closing detail after a Journal
entry restores the Journal session. On this day offers up to three older
same-date memories and takes the player directly to their date.

High has diagonal heatmap fades, pointer tilt, the scroll-drawn river, staggered
entry rise/unblur and FLIP sort/filter transitions using the inventory's timing
and cubic release. Medium has a static heatmap and no thumbnail tilt. Low keeps
filters and static presentation; Very Low uses a plain timeline without card
thumbnails. Reduced motion uses opacity only. Live settings use the resolved
policy; canvases use its DPR cap. Rendering and rolling values use the existing
shared scheduler and sleep when closed. `ui:journal` beats are emitted without
audio. Focus and inert state are restored on close/replacement.

## Scope and assumptions

- No cutscene engine, pack registry, opening stylesheet, `packs.js`, cutscene
  finish, configuration version or save schema was edited.
- `2.4.0-card-history` was the next available numbered folder in the captured
  checkout. `card-history/SPEC.md` was moved intact there, inside this worktree.
- Streak means consecutive local calendar days with a kept pull or committed
  pack opening. Backfill can prove pull days; it cannot invent past pack days.
- Only actual instance `comboId` and emitted optional integration events create
  combo, achievement and photo entries. Missing producers require no stub UI API.
- Journal editing/deletion, sharing and sound remain out of scope as specified.

Unfinished: none of milestones A–C.

Testing: one file:// game session confirmed Journal, search/filtering, On this day and per-card History with zero console errors; Cardable.dev.checkJournal() ran once and passed in 2 ms in an isolated runtime; no old tests, test files, screenshots, recordings or profiling.
