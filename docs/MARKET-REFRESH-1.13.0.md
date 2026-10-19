# Open doors (1.13.0): the Market refresh

The owner asked for a Market that is easier to read and to start with, the Shop folded into it, auctions that are easy to follow, smarter traders with real-looking names, more motion with meaning, fewer words and more icons, and two bugs fixed: the notch that kept refreshing and the special-pack marker on the timer bar. The rules that came out of it are in Designs section 12, "Open doors (1.13.0)".

## Research that shaped it

- **Vercel Web Interface Guidelines** (vercel.com/design/guidelines, read 2026-10-19). Applied: animate only to clarify cause and effect or for deliberate delight, only `transform` and `opacity`, interruptible, honouring reduced motion, never `transition: all`; announce async updates politely (the arrival stack and tips are `aria-live="polite"`); name icon-only buttons; never colour alone (Leading/Outbid always carry a word and an arrow); design empty and sparse states with a next step; tabular numbers; minimise re-renders and batch DOM writes (the root cause of the notch flicker); hover and active states stronger than rest; layered shadows with semi-transparent borders; concentric radii.
- **Apple Human Interface Guidelines.** The Motion page did not render in the fetch tool (a script-built page), so its text was not read this time. The guidance used is the HIG's long-standing advice: motion explains a change of state or a relationship, stays brief and responsive, never blocks content, and has a reduced-motion equivalent; onboarding is short, optional, interactive and replayable rather than a wall of text.

## What changed, where

| Area | Files |
|---|---|
| Notch flicker: the pill keyed on its item (not its ticking text) and updates text in place; the open panel rebuilds only when its items change and patches clocks and countdowns otherwise; the header wallet and clock chip are built once | `src/ui/market/island.js`, `shell.js`, `sim-controls.js` |
| Timer bar: the next special pack beyond the visible slots is a chip inside the pill; a special pack inside the slots has a corner tag inside the pill | `src/ui/pack-queue.js`, `src/ui/kit/components/ui-polish.css` |
| Realms renamed Standard and Players (user-facing strings only) | 22 files under `src/ui/market`, `src/market`, `src/data/market-*` |
| Shop as a Market tab; the menu bag opens it; purchases through `ui.sim.confirm` and `C.shopPurchase` | `src/ui/market/page-shop.js`, `shell.js`, `src/ui/shop.js` |
| Auction tracker, arrival and sale notices, inventory fly-in and count, notch ring | `src/ui/market/tracker.js` |
| Tab and title icon motion, pointer light and glint, tips, fresh listings | `src/ui/market/flourish.js`, `page-listings.js`, `parts.js` |
| First-visit tour | `src/ui/market/tour.js` |
| Price choice cards, Sell buttons, page icons, plainer copy | `page-composer.js`, `page-account.js`, `page-home.js` and the other pages |
| Storefront door and swinging bag on the main menu | `shell.js` (`storefront()`), `market-refresh.css` |
| Trader strategies and usernames | `src/market/sim/world.js`, `player.js`, `src/data/market-sim.js` (`names`, `strategy`) |
| Styles | `src/ui/kit/components/market-refresh.css` |

## Traders

New strategies, all data in `C.data.marketSim.strategy`: a shortlist of each trader's best leads (cheapest against its private value, auctions closing within two hours, wished-for cards) before a random handful; a shaded maximum in crowded auctions (three or more bidders) unless the card is wished for; undercutting the cheapest competing copy when listing and repricing (flippers, hunters, market makers, hype followers, cautious and risk-seeking traders), while patient personalities do not chase a cheap copy down; auctions with a firmer start for cards three or more traders want; bargain scouts sent within 8 to 50 minutes when a fixed-price listing appears 15% or more under its Average Value (the player's included); market makers quoting on the most traded cards. Conservation is unchanged: every trade still goes through `completeSale`/`placeBid` and the settlement path.

Usernames come from a stable hash of the world seed and the trader id (never the world's random sequence, so a world plays out the same): 35% from thirty presets, the rest from two word lists in four styles, with no two sharing a base. Existing worlds are renamed once (`world.namesV = 2`) and their feed, notices and offer notes rewritten to match.

Measured with seeded headless runs (`tools/sim-strategy.cjs --days 4 --seeds 6`, and a time-to-sell probe of four player listings per seed over eight seeds), old code against new:

| | Before | After |
|---|---|---|
| "Naive" policy (buy 12% under, relist at Average Value), mean growth | +6.6% | +2.3% |
| Coach policy, mean growth | +5.8% | +5.4% |
| Idle / Quick Sell / random | −0.1% / −31.4% / −2.1% | 0.0% / −31.4% / −2.6% |
| Conservation audit failures | 0 | 0 |
| Player listing at 70% of value, median time to sell | 6.0 h | 0.5 h |
| at 85% | 6.8 h | 1.8 h |
| at 100% | 25.3 h (5 of 8 sold) | 10.3 h (6 of 8) |
| at 120% | 36.5 h (2 of 8) | 25.3 h (2 of 8) |

Bargains no longer sit; easy money from a mechanical rule is mostly gone, while following the coach still pays.

## Evidence

- `npm run test:market`: 107 of 107.
- `tools/check-market-refresh-browser.cjs` (new, headless): 8 of 8. It proves zero element rebuilds in the header over 4 s at Fast speed, zero rebuilds and zero animations in the menu notch over 5 s with cycling off, at most four in the open panel, the timer chip and tags inside the pill, the realm names, the tour (spotlight on Browse within 4 px, Escape ends it and keeps the Market open, it does not return by itself, More replays it), a Shop purchase that costs exactly its price only after the review and lands in the inventory with an arrival card, the tracker, the tab motion and unique handles.
- Before the fix, the same measurement counted 10 header nodes added every 3 s and the open notch panel rebuilding (7 nodes, 3 animations in 5 s).
- Existing headless checks: notch 10/10, polish 8/8, home 10/10, hover 7/7, base Market check passed, simulation 18/18, economy 13/13. The polish and home checks now expect six sections (Shop joined) and the online and acceptance checks the new realm wording.
- Screenshots at 1440×900, 1280×800 in saved monochrome, 390×844 and 360 px: no horizontal overflow; at phone width the realm switch was tightened so it does not overlap the notch.

## Not verified

The installed Windows app, real-hardware motion and frame cost of the new effects, a screen reader, a physical phone, the Players realm against the live service (its checks need a local Worker and were not run), and how the tour and tips feel to a new player.
