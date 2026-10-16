# Rarity odds and Market values, 1.10.0

The owner asked for rare cards to be actually rare, common cards to be more common, every pack balanced, Market values changed to match, and better animation and hover effects. This page records what changed, what a player meets before and after, and what was traded away. Reproduce every number below with `npm run odds:report` (add `--packs` for the per-pack table, `--json` for data); `tests/rarity-odds.test.cjs` pins the intent and `tools/check-value-relations.cjs` pins the Shop against the Market.

## Why rare cards did not feel rare

The base chances in `rarities.js` were only part of it. Over a long run of openings, the schedule did most of the damage:

- A Rare Pack opened every fourth pack, and multiplied every high tier by 1.5 to 2.
- 5% of Rare Pack slots became a Royal Pack (always Legendary or better), and 5% of other slots became a Titan Pack.
- The Classic Pack multiplied Secret by 4.

So across everything a player opened, **1 card in 10 was Legendary or better** (1 in 21 was Legendary itself), against 1 in 50 in a plain Standard pack. The table below shows the whole opening schedule, not just a Standard pack.

## What a player meets now (one card, every pack, by how often each pack opens)

| Tier | Before: share (1 in) | After: share (1 in) | Base chance before → after |
|---|---|---|---|
| Basic | 31.2% (3) | 43.2% (2) | 46.5% → 54.945% |
| Common | 15.9% (6) | 20.2% (5) | 23.5% → 25.5% |
| Uncommon | 9.9% (10) | 9.7% (10) | 15% → 12.5% |
| Rare | 15.4% (7) | 16.7% (6) | 7.5% → 4.1% |
| Super Rare | 6.6% (15) | 4.2% (24) | 2.5% → 1.1% |
| Unusual | 6.0% (17) | 3.0% (34) | 2% → 0.8% |
| Double Super Rare | 4.8% (21) | 1.5% (65) | 1.5% → 0.5% |
| Legendary | 4.9% (21) | 0.82% (122) | 1% → 0.3% |
| Mythical | 3.6% (28) | 0.48% (210) | 0.75% → 0.18% |
| Exotic | 1.35% (74) | 0.18% (560) | 0.2% → 0.06% |
| Ascendant | 0.35% (289) | 0.043% (2,331) | 0.045% → 0.0135% |
| Secret | 0.020% (4,986) | 0.0036% (27,699) | 0.005% → 0.0015% |

Rare is allowed to stay at one card in six overall because Rare Packs guarantee it; those packs are what the tier is *for*. Every tier from Super Rare up is five to seven times rarer, and Legendary or better moves from one card in ten to about one in sixty-six.

The base chances now add up to exactly 100% (they added up to 100.5%, OPEN-QUESTIONS #2, and Legendary was written as 1% where the running totals implied 0.5%).

## Every pack

| Pack | Change | Rare or better | Legendary or better |
|---|---|---|---|
| Standard, brand packs, Classic | base chances above; Classic Secret boost ×4 → ×2 | 15.4% → 7.1% (1 in 14) | 2.0% → 0.56% (1 in 180) |
| Rare | every 4th opening → every 6th; high-tier modifiers ×1.5–2 → ×0.9 down to ×0.22 | always | 19.5% → 2.4% (1 in 42) |
| Royal | replaces 5% → 0.8% of Rare slots (1.25% → 0.13% of openings); still always Legendary or better | always | always |
| Titan | 5% → 0.3% of ordinary slots (3.75% → 0.25% of openings); one halo card | always | 65% → 59% |
| Picker | shares the base chances; still offers three cards with one Rare or better guaranteed | always | 16.3% → 8.9% |

The Snapdragon pack has no Legendary or better cards in its roster, as before. Pack faces say "Every sixth pack" for the Rare Pack, and the schedule check in `src/dev/pack-checks.js` expects 16 Rare slots in 100 openings.

## Market values

Value follows how seldom a card is pulled. `rarityBase` in `market-config.js` (before → after):

| Basic | Common | Uncommon | Rare | Super Rare | Unusual | Double SR | Legendary | Mythical | Exotic | Ascendant | Secret |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 → 9 | 18 → 17 | 32 → 34 | 70 → 140 | 130 → 330 | 200 → 540 | 320 → 960 | 600 → 1500 | 1200 → 3000 | 2400 → 5000 | 4800 → 9000 | 9000 → 16000 |

A card's market price still multiplies this by the card's own spread, its finish class, skin and serial.

### The Shop stays dearer than the Market

The Shop sells with a static price table. If a card's Market value rose above its Shop price, a player could buy it there and sell it on the Market for nothing but profit. `shop.js` Mythical, Exotic, Ascendant and Secret prices were raised (7,800 → 9,000, 10,500 → 15,500, 16,000 → 30,000, 24,000 → 54,000) and `tools/check-value-relations.cjs` now checks every card and every finish at the Market's most generous reading; the tightest ratio is 1.37× (Mythical with a finish) against a required 1.25×. The check also fails if values stop rising with rarity.

## What was traded away

- **The average pull is worth about a third less in Credits** (mean rarity base 179 → 119) even though prices went up, because the expensive tiers are now far rarer. Rare and Super Rare cards are worth two to three times what they were, so a lucky pull is a bigger event, and a run of Basic and Common is a smaller one. If this is too stingy, raise `rarityBase` for Rare to Double Super Rare first (the Shop check will say if a Shop price must follow).
- A Rare Pack opens less often (every sixth opening, not fourth), so the guaranteed Rare is rarer too.
- Saves are untouched: cards already owned keep their tier, serial, finish and value history. The Simulation world re-prices its listings from the new values; the economy and strategy experiments (`npm run sim:experiment`, `tools/sim-strategy.cjs`) were re-run and stay healthy.

## Animation and hover (Market)

Taken as the Market interface, which the previous work was about. Tiles now lean toward the mouse and a band of light crosses the art once, the rim and glow take the card's rarity colour (stronger for scarcer cards, none for Basic and Common), suggestion cards and news answer the pointer, buttons sink when pressed, and the tab underline slides from one tab to the next. Only transform and opacity animate. Nothing runs for touch, under reduced motion, with Hover animations off, or at Very Low and Low quality. `tools/check-market-hover-browser.cjs` drives a real mouse and checks all of it, including the off cases.
