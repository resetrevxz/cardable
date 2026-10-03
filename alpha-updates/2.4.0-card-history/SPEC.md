# Card History (the Journal)

An interactive, text-rich timeline of everything the player has unlocked and when: cards, variants, combos, packs, achievements and milestones. It is part memory book, part stats screen.

**Read first:** `AGENTS.md`, `Designs.MD`, the inventory sheet and detail view, tags, the event bus, the save layer and settings.

## 1. Rules

- **Additive save only.** Store the log under a new optional `save.journal`. Do not bump the schema version and do not touch other save fields. Missing data means defaults.
- **Data-driven text and entry types** in `src/data/journal.js`; engine `src/core/journal.js`; UI `src/ui/journal.js`.
- **Event-driven.** Listen to existing events (`card:kept`, `pack:opened`, `card:revealed` if useful) and to `achievement:unlocked` and `studio:photo` **if they exist** (those are emitted by other updates; never call their APIs directly, and ignore them silently if absent).
- Monochrome UI; card thumbnails keep their colors. Classic scripts, offline, file:// safe, no libraries (draw charts on a canvas). Respect quality tiers and reduced motion.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE small logic check, `Cardable.dev.checkJournal()`, run once at the end: backfill from a scripted inventory produces the expected entries in date order, the first-of-each flags are right, compaction preserves counts, and a save without `journal` loads. Under 1 second, never automatic.

## 2. Data

Entry schema (compact, stored newest-last):

```js
{ id, at, type, cardId, instanceId, packId, variantKey, comboId, tier, achievementId, n, extra }
```

Types: `pull` (every kept card), `firstPull` (first copy of a card), `variantFirst` (first time a variant id is owned), `comboFirst`, `packType` (first time a pack type is opened), `rarityFirst` (first of a tier), `achievement`, `milestone` (10/25/50/100 unique cards, packs opened 10/50/100/500, completion of a generation or brand), `photo` (when the studio exists), `streak`.

- Derive flags at write time and store them (`firstPull`, `firstVariant`, `firstTier`); never recompute from scratch on read.
- Cap at 5,000 entries. When exceeded, **compact** the oldest `pull` entries into per-day summaries (`type: 'daySummary'` with counts and the best pull) so milestones and "first" entries are never lost.
- **Backfill (silent, one time):** if `save.journal` is missing, build it from the existing inventory (using each instance's `pulledAt`, `variants`, `packId`, serial) and stats. Entries without a known date use the nearest known date or are grouped under "Before tracking". Backfilled entries are marked `retro: true`.
- Dates use the **virtual clock** if the dev menu has one; otherwise `Date.now()`.

## 3. Text system (short, premium, varied, never repeated twice in a row)

Templates live in data with slots; pick by a seeded hash of the entry id. Tone: calm, specific, a little warm. Examples (write at least 5 variants per type):

- `firstPull`: "First pull. A {card} from a {pack}." / "{card} joined the collection."
- `variantFirst`: "Variant discovered: {variant}. It caught the light on {card}."
- `comboFirst`: "Combo found: {combo}. {variantA} and {variantB} on {card}."
- `rarityFirst`: "Your first {tier}: {card}."
- `packType`: "Opened a {pack} for the first time. {tagline}"
- `milestone`: "{n} unique cards. {generationOrBrand} is {pct} % complete."
- `achievement`: "Achievement: {name}."
- `photo`: "Photographed {card} in the studio."
- `streak`: "{n} days in a row."
- Per-card detail uses the same templates plus: "You own {n} copies. The newest has serial {serial}."

## 4. UI

**Entry points:** a History tab in the inventory (register through the inventory tab/toolbar registry if it exists; otherwise add the smallest additive hook), the right-click menu, and a "History" action in the card detail view (the per-card history).

**Journal sheet (glass sheet, same family as the inventory):**
- **Top strip:** a **calendar heatmap** (canvas, 53 weeks x 7 days) of pulls per day with a soft glow on busy days; hover shows the day's summary, click filters the timeline to that day; arrow keys move between days. Beside it, four compact stat tiles with rolling numbers: packs opened, unique cards, variants found, current streak. A small smooth **growth chart** (cumulative unique cards over time, canvas line with a gradient fill) with a hover crosshair.
- **Filters:** chips (Cards, Variants, Combos, Packs, Achievements, Milestones, Photos) with counts, a search field (card names, variants, pack types), a "Jump to date" control, and a toggle "Highlights only" (firsts and milestones).
- **Timeline river:** a vertical line down the center with entries alternating left and right (stacked on narrow widths), grouped under sticky day headers ("Today", "Yesterday", "Oct 1, 2026") with a count. Each entry is a glass card with: a type glyph, the text, the time in mono, and for card entries a **lite card thumbnail** that tilts toward the pointer on hover; variant and combo entries show the variant glyph and tier ticks. Highlights get a larger card with a soft glow.
- **Interactions:** click a card entry to open its detail view; click a day header to filter; hover an entry to brighten the line segment next to it; "On this day" suggestions at the top when older entries exist for today's date; keyboard navigation (up/down, Enter, Home/End, `/` search).
- **Motion:** the river line draws itself as you scroll; entries rise 8 px and unblur in with a 40 ms stagger; numbers count up; the heatmap fades in cell by cell diagonally; transitions between filters use the same FLIP animation as the inventory sort. Virtualize the list (render only visible entries plus a margin).
- **Per-card History** (detail view): a compact vertical timeline of that card: first pulled (date, pack), each additional copy (date, serial, variants), variants discovered on it, photos taken, achievements it triggered, with the same text system.
- **Empty state:** one quiet line ("Your history starts with your first pull.").
- Quality tiers: High full motion; Medium static heatmap and no tilt on thumbnails; Low no animation but keep filters; Very Low plain list. Reduced motion: opacity only.
- Sound hooks later: emit `ui:journal` beats; no sound now.

## 5. Milestones (stop at a clean one, commit, list what is unfinished)

- **A:** data, engine, event listeners, backfill, compaction, text system, the dev check.
- **B:** the Journal sheet (heatmap, stats, growth chart, filters, timeline river, interactions).
- **C:** per-card History, "On this day", highlights, polish and quality tiers.

## 6. Manual checks

1. A fresh save logs pulls, first-of-each entries and milestones correctly with sensible text.
2. An existing save backfills silently in date order, with a "Before tracking" group when needed.
3. The heatmap, chart, filters, search and jump-to-date all work and stay smooth with 1,000+ entries.
4. Clicking entries opens the right card; the per-card History matches the inventory.
5. Compaction keeps firsts and milestones; export/import and reset behave correctly.
6. No console errors; lower quality tiers degrade gracefully.

## 7. Out of scope

Editing or deleting entries, sharing the journal, sound.
