# Local Market 2.0 (app 1.9.0)

The owner's request: simplify the local market, give it animation, make it better, apply Apple's and Vercel's design rules, stop it feeling cramped and hard for a beginner, and make it easy enough that a person actually trades, gets rich and needs good strategies, "AI wise and UI wise". This is what was built, why, and what was measured. "Local market" is the Simulation realm; the shared pages (Browse, listings, Portfolio) improved for Global too.

## 1. The design rules used, and where they show

Sources read for this work: Vercel's [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) (the `command.md` rule list) and Apple's Human Interface Guidelines (the developer site could not be read by the tool used here, so its principles come from secondary summaries of the HIG and the older iOS 7 design guide: clarity, deference, depth; generous margins and hierarchy through size and weight; one clear primary action per area; feedback for every action; undo for destructive actions; touch targets of 44 points; short, purposeful, interruptible motion that respects Reduce Motion; onboarding that reaches value quickly). Nothing here claims conformance to either document, only that these rules drove the choices.

| Rule | What was done |
|---|---|
| Clarity: a clear hierarchy, one primary action | Home has three blocks (your desk, best moves, the news). Each suggestion card has exactly one filled button; everything else is a quiet text button |
| Deference: the interface steps back for the content | the standing "Simulation is a local market…" notice bar is gone (the realm switch and the clock already say it); the header lost the guide button; five sections show and the rest sit under More |
| Generous margins and spacing | page padding 20–44 px fluid, 48 px between Home blocks, 20–24 px inside cards, tiles 236 px wide with 24 px gaps; heading and body line-heights unchanged |
| Progressive disclosure | Simple mode shows the list, the feed tabs and one sort; presets, saved views and the Feed/Terminal switch belong to Advanced |
| Touch targets | 44 px buttons on touch, the phone search is a 44 px button until used, bottom bar items are 56 px |
| Feedback for every action | a review dialog states price, fee and balance after; success toasts say the next step; the wallet pulses and a "+33" or "−38" rises from it; a price that moves while you look flashes in its direction |
| Motion: only transform and opacity, interruptible, respects reduced motion, no `transition: all` | all new motion is one-shot CSS or WAAPI on transform/opacity (the net worth number is counted in text); fills are `backwards` so no layer outlives its animation; reduced motion, Hover animations off, Very Low quality and a hidden page all skip it (checked by the Home check: no badge and zero running animations under reduced motion) |
| Visible `:focus-visible`, keyboard access | unchanged kit focus rings; the page heading takes focus without a ring |
| Tabular numerals, balanced headings, `touch-action: manipulation` | applied to every number on Home, all headings use `text-wrap: balance`, controls carry `touch-action: manipulation` |
| Don't rely on colour | each tone has a word or mark: tags say "Fire sale", news says "up/down" with an arrow and a time, gains carry "+" and "after the fee" |
| Active voice, specific button labels | "Buy for 38", "Bid up to 52", "Set the trap at 13", "List at 105", "Quick Sell for 74" |
| Honest copy | every suggestion section says in words that it is a guide, not a promise |

## 2. What changed for the player

* **Home ("Today").** The Simulation opens here. The desk shows net worth (Credits plus the Average Value of your cards) counting to its new value, a line of how it moved, and a level (Newcomer, Trader, Flipper, Dealer, Broker, Tycoon) with progress to the next. Below it: **Best moves right now**, **In the news**, **Your goals** (seven: first purchase, first sale, catch a deal, make a profit, win an auction, snap up a fire sale, grow wealth 25%) with recent profits, and a collapsed "How to make money in 3 steps" that opens by itself until your first sale.
* **A plain Coach.** Each suggestion says what you pay, what you keep after the 2% fee, and why. Types: *Buy* (a fixed price that should resell for more), *Bid* (an auction closing within eight hours, with a maximum), *Set a trap* (a buy order under the market that fills when a seller panics), *Sell* (better than Quick Sell: a trader is waiting, demand is rising, traders want the card, or you bought it to resell). After a purchase the next step is waiting as "Your plan". Every listing page has a Coach box: a verdict in words, what such cards usually sell for, what a resale would keep, and what to watch.
* **Quick Sell is always one tap away** on a sell suggestion, with the same receipt and Undo as elsewhere.
* **A calmer shell.** Home, Browse, Auctions, Portfolio, Prices and More; Watchlist and Alerts as two icons; the phone header is two rows.
* **Brisk speed** (two simulated hours per real minute, a day in twelve minutes) is the default for new profiles; Calm, Standard and Fast remain, and existing choices are kept.
* **Fire sales** are marked on Browse tiles.

## 3. What changed in the market itself (the "AI")

The old market was nearly efficient: bots priced around Average Value and a careful player could not do much better than the fee. Measured over 30 simulated days, the old "buy anything 12% under Average Value and relist at Average Value" test made 27 to 741 Credits from 5,000. Three new behaviours give a player something to read and act on, all in `src/market/sim/world.js` and tuned in `src/data/market-sim.js`:

1. **News.** Every three to six simulated hours a piece of news names a brand, a generation, a rarity band or one card, announced one to four hours before it acts and lasting nine to twenty-four. Hype lifts what bots will pay and ask by 25 to 50%, a dip lowers it by 16 to 34%; each personality reacts in its own measure (a hype follower strongly, a cautious buyer a little). Average Value only follows after trades, so a player who reads the news is early. Older saved worlds get their first news an hour after loading.
2. **Fire sales.** A seller who needs Credits lists a fixed price 18 to 40% under the going price. Capped at sixteen a day for the whole world, so a bargain is something you spot.
3. **Market makers.** A tenth persona quotes buy orders and asks on everyday cards, giving more standing buyers and sellers.

Credits and cards are conserved exactly as before: bots are only topped up by the daily allowance, a profit is taken from bots' Credits, and the audit finds no card in two places and no negative balance (checked over twenty days in `tests/market-advisor.test.cjs` and in every strategy run).

### Does it reward playing well? (`tools/sim-strategy.cjs`, seeded, headless)

Start: 320 Credits and fourteen everyday-to-uncommon cards; net worth is Credits plus Average Value of every card owned. Fourteen simulated days (a little under three hours of play at Brisk), eight seeds.

| Policy | Mean growth | Worst seed | Best seed |
|---|---|---|---|
| Does nothing | +0.3% | −0.5% | +1.2% |
| Quick Sells every card at once | −26.4% | −29.8% | −23.8% |
| Clicks at random (buys and lists with no plan) | −10.0% | −14.2% | −4.0% |
| The old rule (buy 12% under, relist at Average Value) | +31.9% | +18.0% | +52.8% |
| **Follows the coach** | **+68.3%** | **+41.1%** | **+121.4%** |

By day six the coach policy is at about +26%. These policies are mechanical; a person is not guaranteed these numbers, and no beginner has used the page yet. What the table shows is that doing nothing is safe, guessing loses (fees and unsold stock), and a strategy built on the news, fire sales, closing auctions and traps wins consistently, which is the "needs good strategies" the owner asked for. The world stays healthy: about 35 trades a day, bot Credits flat over twenty days, no bot short of Credits.

## 4. Verification

* `tests/market-advisor.test.cjs` (11 tests): news is real and bounded and fades; each personality reacts in its own measure; fire sales are under the going price and capped; every suggestion points at a real listing at its real price with a gain computed after the fee; favorites and locked cards are never suggested; a plan outranks everything; the coach is deterministic and reading advice changes nothing; goals, levels and realized profit; net worth history; the listing assessment; conservation over twenty days; older worlds gain news.
* `npm run check:market-home` (10 steps, real interface): Home is the default; the header has five sections and More and no standing notice; net worth is Credits plus cards; keys 1 to 5 and More reach everything; Home is not offered in Global; a suggested purchase runs through a review, costs exactly its price and leaves a plan; the card returns as "Your plan" and listing it works; Quick Sell pays exactly the quote; the wallet floats a badge and flashes, and reduced motion removes both; news appears with timing and "Find these cards" reaches Browse; Home fits at 360, 390, 768, 1280 and 1920 px with no button under 32 px; no console errors.
* The existing battery (`node tools/run-market-regression.cjs`): all suites pass, including the acceptance sweep, which now includes Home among its fifteen routes (six viewports, monochrome, four quality tiers, reduced motion), and 100 Worker tests.
* Two real bugs were found on the way and fixed: the featured card on Browse let a long reason chip run past the frame on a 360 px phone (it surfaced as the old "flaky" layout failure), and the hero button overflowed by 3 px once padding grew.
* Idle cost of Home (headless, frame loop uncapped): 2.3 ms/s at Very Low, 2.5 at Medium, 7.9 at High, with no held animation layers; one-shot motion only.

## 5. Not verified

No beginner has used this: "easy for a beginner" is a design intent checked against the rules above, not user testing. Real hardware, a physical phone and a screen reader were not used. The numbers in section 3 come from policies, not people. Apple's HIG text itself could not be read by the tool; its principles are second-hand.
