# Achievements

A quiet, premium progress system. It rewards play without adding clutter: nothing appears on the main menu except a toast when something unlocks.

**Read first:** `AGENTS.md`, `Designs.MD`, the settings system, the event bus (`Cardable.events`), the inventory UI, the save layer (`state.js`), and the Settings quality tiers.

## 1. Rules

- **Additive save only.** Store everything under a new optional `save.achievements` object. Do **not** bump the save schema version and do not touch other save fields (other updates are changing the schema at the same time). Missing data means defaults.
- **Data-driven.** Achievements are entries in `src/data/achievements.js`; the engine in `src/core/achievements.js`; the UI in `src/ui/achievements.js`. Adding an achievement later is one data entry.
- **Event-driven and cheap.** Listen to existing events; keep counters incrementally in `save.achievements.counters`; never rescan the whole inventory on every event.
- **Monochrome UI.** Tier is shown with tick marks and glyphs, not colors. Card thumbnails keep their own colors.
- **Contract with the Journal update:** emit `Cardable.events.emit('achievement:unlocked', { id, tier, at, retro })`. Never call the Journal's API directly.
- Classic scripts, offline, file:// safe, no libraries. Respect quality tiers and reduced motion.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE small logic check to the existing dev tools, `Cardable.dev.checkAchievements()`, run once at the end: counters increment correctly for a scripted event sequence, a multi-tier achievement unlocks tiers in order and only once, retroactive backfill produces the same unlocks as replaying the events, and a save without `achievements` loads. Under 1 second, never automatic.

## 2. Data model

```js
{
  id: 'pack-opener',
  group: 'packs',
  name: 'Pack Opener',
  description: 'Open packs.',
  glyph: 'pack',                 // small inline SVG id
  hidden: false,                 // hidden ones show "???" until unlocked
  requires: null,                // optional event name or feature flag; skipped if absent
  tiers: [                       // one entry can be a ladder
    { goal: 1,    reward: { credits: 25 } },
    { goal: 10,   reward: { credits: 50 } },
    { goal: 50,   reward: { credits: 100 } },
    { goal: 250,  reward: { credits: 250 } },
    { goal: 1000, reward: { credits: 1000 } }
  ],
  track: { counter: 'packsOpened' }          // or { event: 'card:kept', test(payload, state) -> bool/amount }
                                            // or { derive(state) -> number } for state-derived values
}
```

- Rewards: `{ credits }`, `{ pack: 'standard', count }` (use the existing pack-granting function if it exists; otherwise skip pack rewards and list it in the report), or none. Rewards apply when the tier unlocks. Credit changes animate through the existing counter.
- Save shape: `save.achievements = { counters: {...}, unlocked: { [id]: { tier, at: { 1: ms, 2: ms }, retro: bool } }, seen: [ids], settingsSeenIntro: bool }`.

## 3. Engine

- `Cardable.achievements.register(def)`, `.progress(id)` returns `{ value, goal, tier, maxTier }`, `.isUnlocked(id)`, `.list()`, `.totals()`.
- Event handlers update counters and evaluate only the achievements that track that counter/event. Unlocks are queued, de-duplicated and emitted one at a time.
- **Retroactive backfill (silent):** on first load with no `save.achievements`, derive from the existing inventory and stats (cards owned, rarities, variants, serials, packs opened if tracked). Mark those unlocks `retro: true`; use the earliest relevant `pulledAt` as the date when known, otherwise `at: null` (shown as "Before tracking"). Do not show toasts or pay duplicate rewards for backfilled unlocks; show **one** summary toast ("12 achievements unlocked from your collection") and pay the rewards once.
- Resets: Reset save clears achievements; export/import carry them (they are part of the save).
- Sandbox/dev: the dev menu gets tools to unlock, lock, set counters and replay a toast.

## 4. Starter catalog (about 55; counts are suggestions, tune in data)

**Packs:** Pack Opener (1/10/50/250/1000); Variety Pack (open each pack type: 1 per type, tiers 3/6/all); Rare Find (open a Rare Pack 1/5/25); Legendary Moment (open a Legendary Pack 1/3); Patient Collector (let 2 packs stack at the cap once).
**Collection:** Collector (own 10/25/50/100/all unique cards); Generation Complete (finish a generation 1/5/all); Brand Loyalty (own every card of a brand: AMD, NVIDIA, Intel, Apple, Qualcomm; separate achievements); Full Spectrum (own one card of each rarity tier, 4/8/12); Duplicates (own 3/10/25 copies of one card).
**Rarity firsts:** First Rare, First Super Rare, First Legendary, First Mythical, First Exotic, First Ascendant; **hidden:** A Secret Has Occurred (pull a Secret); Fatal Exception (watch the Secret cutscene to its end); Skipper (skip a rarity cutscene).
**Variants:** First Variant; Variant Hunter (own 5/15/30 different variants); Slot Machine (own a variant in each slot: finish, art FX, frame, stamp, mutation); Combo Breaker (pull a named combo 1/5/all); Triple Threat (a 3-variant card); Mythic Touch (a Mythic-tier variant).
**Serials:** First Serial (serial ending 000001); Low Serial (counter 100 or below); Round Number (a serial ending in 000); Palindrome (palindromic counter); Lucky Seven (counter 777); Triplets (three same digits in a row).
**Era:** Time Capsule (a card released before 2003); Classic Collector (own 5/20/all classic cards); Newcomer (a card from the newest generation).
**Habits:** Daily Ritual (open a pack on 3/7/30 different days); Night Owl (open a pack between 00:00 and 04:00); Welcome Back (return after 7 days away); Streak (open on 5 consecutive days).
**Luck:** Hot Streak (3 Rare+ in a row); Cold Snap (open 10 packs without Rare+; consolation reward); Variant Run (2 variants in 10 packs).
**Economy and meta:** Spender/Saver tiers when the shop exists (`requires: 'shop'`); Tidy (favorite 10 cards); Archivist (export your save); Settings Tinkerer (change 5 settings); Cut Above (finish a cut perfectly straight; optional).
**Studio (enabled only when `studio:photo` exists):** Shutterbug (take 1/10/50 photos); Director (use 5 different props); Colorist (use 3 colored lights); Portfolio (photograph 10 different cards).
**Picker (enabled only when `picker:chosen` exists):** Picker's Remorse (choose the lowest tier of three); Good Eye (choose the best of three 10 times).

Mark achievements whose `requires` event or flag does not exist as inactive (not shown, not counted in totals).

## 5. UI

- **Entry points:** an Achievements button in the inventory toolbar (register through the inventory tab/toolbar registry if it exists; if not, add the smallest additive hook), an entry in the main-menu right-click menu, and the unlock toast.
- **Panel:** a glass sheet like the inventory sheet. Header: a total progress ring (`34 / 80`), a search field, filters (All, Unlocked, In progress, Locked), sort (Recent, Name, Progress, Group). Left rail of categories with counts. Grid of tiles: glyph, name, a fluid-style progress bar, tier ticks, date in mono ("Oct 1, 2026" or "Before tracking"); hidden ones show a blurred glyph and "???"; a dot on newly unlocked tiles until viewed.
- **Tile motion:** staggered entrance (30 ms), light-following border on hover, a gentle lift, the progress fills and counts up on open.
- **Detail popover:** description, the tier ladder with goals and rewards, unlock dates, and a link to the card that triggered it when known (opens the card detail).
- **Unlock toast:** slim glass toast at the top center: glyph, "Achievement unlocked", the name and tier, a soft light sweep; one at a time (queue, merge bursts into "3 achievements unlocked"); auto-dismiss in 4 s; clicking opens the panel on that tile. **Never interrupt an opening sequence or cutscene:** hold the toast until the player is back on the menu. Setting `achievementToasts` On/Off in Settings (Controls or Cards group, additive).
- Credit rewards play the counter count-up and a tiny shimmer.
- Quality tiers: High full motion; Medium no light-following border; Low simple fades; Very Low no animation. Reduced motion: opacity only.
- Hook for sound later: emit `ui:achievement` beats; do not add sound.

## 6. Milestones (stop at a clean one, commit, list what is unfinished)

- **A:** data model, engine, counters, retroactive backfill, toast, settings entry, dev tools, the dev check.
- **B:** the panel, tiles, filters, detail popover, entry points.
- **C:** the full starter catalog with rewards, the conditional (`requires`) achievements, polish.

## 7. Manual checks

1. A fresh save unlocks First Pull-style achievements with toasts, at the right moments, never during an opening.
2. A save with existing cards backfills silently and shows one summary toast.
3. Multi-tier ladders unlock tiers in order; credits pay once.
4. The panel filters, sorts and searches smoothly; hidden achievements stay hidden until unlocked.
5. Export, import and reset behave correctly.
6. No console errors; Medium, Low, Very Low and reduced motion degrade gracefully.

## 8. Out of scope

The pack shop, leaderboards, cloud sync, sound.
