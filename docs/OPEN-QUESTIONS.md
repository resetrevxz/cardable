# OPEN-QUESTIONS

## Owner-approved 2.5.0 Titan default

The owner selected a separate 5% chance on ordinary slots; existing brand/Classic intervals and Rare/Royal cadence stay unchanged. Titan yields one card from the exact 17-name halo list, mapped to catalog IDs. The requested tier modifiers apply; Secret is excluded, and the existing variant gate/card frame remain unchanged. No new persistent fields are needed.

Things the spec left undecided or contradictory. Codex must use the **default** and mention it in its stage report. The owner can change any of these by editing one place (the "Change it" column).

| # | Question | Default used | Change it |
|---|---|---|---|
| 1 | Pack regeneration cadence. | Owner changed it to 2 hours per pack; up to 12 per day while below the stock cap | `config.packs.regenMs` |
| 2 | The tier chances add up to **100.5 %**, and the printed running totals imply Legendary is **0.5 %**, not 1 %. | Chances kept as written and normalized by their sum; dev-mode warning | `chance` of `legendary` in `rarities.js` |
| 3 | Default color versus monochrome presentation. | Owner now permits purposeful default UI accents; the existing Color theme setting selects color or monochrome for cards, cinematics and Achievements. | `settings.rarityColor` / Designs.MD |
| 4 | How many cards does one pack give? Some text says "the card", other text says "cards". | 1 card per pack; the sequence supports more | `cardsPerPack` in `packs.js` |
| 5 | Rarity should slow the charge, but the charge is a fixed 3 s hold. | Hold is always 3 s. Rarity scales rise, pre-flip pause, flip, bloom and grid dim. | `reveal` in `rarities.js` |
| 6 | 12 tiers do not fit the earlier "1-5 pips" idea. | Small mono tier badge (`SR`) plus a 12-segment tier meter | `docs/02-RARITIES.md` section 5 |
| 7 | Serial format was not specified. | `CBL-<4-char player code>-<6-digit counter>` | `src/core/serial.js` |
| 8 | Many tiers will have no cards while the card set is small. | `downgrade`: an empty tier falls to the next lower tier that has cards | `config.pull.emptyTierPolicy` |
| 9 | What do silhouettes show? | Card outline plus generation label, name hidden (`???`). Unowned Secret shows its Unfound design. | `docs/06-INVENTORY.md` section 3 |
| 10 | Market values for Basic/Common read ">1$" (probably "<$1"). Card counts add up to 286, not the stated 289. | Values stored but reserved, never read. Counts are reference only. | `rarities.js` |
| 11 | Currency name, symbol, earning and spending are not defined. | Owner approved $200 per pack opening; retain name Credits and use `$`. No new spending UI. | `config.currency` |
| 12 | Can duplicates be sold or converted? | No. They stack visually only. | future |
| 13 | Limited tier: pull chance and dates are undefined. | `pullable: false`, `availableUntil: null`, date text shown as `<date>` until set | `rarities.js` |
| 14 | What happens to the timer when 4 packs are stored? | Timer pauses at the cap; time is not banked | `docs/01-GAME-RULES.md` section 1 |
| 15 | Cutting: hover-slide or press-and-drag? | Press and drag | `config.cut.requirePress` |
| 16 | The tier text mentions "rare card packs". How many pack types now? | Owner approved Standard plus Rare on every fourth lifetime opening in 2.0.0. | `src/data/packs.js` |
| 17 | The Limited design text is identical to Unusual. Intended? | Treated as intended: Unusual-style base plus crimson border prop | `docs/02-RARITIES.md` tier 12 |
| 18 | Which specs appear on a card? | Remade tiers 0–11: memory capacity/type plus up to 4 available specs, using icons. Unfound Secret conceals them. Limited retains up to 3. | `src/ui/card-specs.js` |
| 19 | Font files must be supplied. | Inter and JetBrains Mono woff2 in `assets/fonts/`; fallbacks work without them | `assets/fonts/` |
| 20 | "Squircle" corners are not fully supported in all browsers. | `corner-shape: squircle` where available, else SVG path clip | `card.css` |
| 21 | Mobile and touch. | Stage 13 adds full touch opening, cutting, flipping, Keep/Delete and inventory/settings. Very Low targets basic devices. | `docs/GRAPHICS-UPDATE.md` |
| 22 | The brief puts the serial on the card back; the settle sequence stamps it on the front. | Both: engraved on the back, small stamp on the front footer | `docs/03-CARD.md` |
| 23 | Only `a` to `@` and `l` to `/` were specified for the logo morph. | Other letters use suggested glyphs | `config.logoMorph` |

## Owner-approved Stage 12 defaults

Variants are now in scope: one cosmetic variant per new instance with a flat 10% chance across Basic through Secret. Existing owned and reserved cards stay normal. Matte is Common and affects the front, preserving rarity borders/props. Finish stacks own their favorites, custom collections and reorder positions. Detailed metadata uses actual timestamps and serials; tags are neutral. The default transition is 1200 ms (180 ms reduced motion, 840 ms Fast). No manual rerolling. Pack additions follow the owner-approved 2.0.0 schedule below. Conditional weights live in src/data/variants.js.


## Owner-approved 2.0.0 pack defaults

2.1.0 adds four separate roster-restricted brand packs with a combined 5% chance in non-cadence slots (1.25% each). First two openings stay Standard; Rare remains every fourth. No new tier guarantee or variant adjustment. App 2.1.0 retains schema 4 because existing immutable save identity supplies deterministic scheduling. Brand color is authorized on pack surfaces, markers and provenance only.

Rare appears every fourth committed opening. Shared stock and timer behavior stay unchanged. Dev grants add shared stock and select a preview/odds pack; one-shot forcing is a separate session control. Medium Rare gloss gets one sheen sweep per appearance. Pool downgrade stays inside the pack filters. Legacy provenance defaults to Standard, except pending cards inherit their reservation.

## Owner-approved 2.4.0 Royal default

The owner chose a 5% chance **on Rare packs**. Royal therefore replaces 5% of scheduled every-fourth Rare slots, without changing ordinary slots or the first tutorial openings. It yields one Legendary-or-better card, with no additional tier/variant modifiers. Royal wrappers/holder/counter/provenance may use the requested gold and velvet red. The existing schedule check verifies Rare slots including their upgrades. Schema remains 5.
