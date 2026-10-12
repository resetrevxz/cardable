# Cardable Market Beta 1.0.0 — Stage 2 acceptance report: the offline simulated economy

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge to `main`, no GitHub Release, no live-site change, no desktop delivery (Stage 8 does those).

Stage 1 built the Market interface on sample data. Stage 2 makes the **Simulation realm** a real marketplace you can play offline. It has software traders with their own Credits, cards and habits; fixed-price listings, timed auctions with proxy bidding, buy orders and swaps with counteroffers; a 2% fee; prices and charts that exist only because trades happened; and exact-once settlement against your actual cards and Credits. Global Market is unchanged: not connected, no real listings.

## 1. What was built

| Area | What it does |
|---|---|
| Engine | A seeded, deterministic, event-driven world (`src/market/sim/engine.js`, `world.js`): 36 traders with nine personalities, an event queue (wake, auction end, anti-snipe, order end, offer reply, offer end, daily tick), listings, bids, orders, offers, a ledger of executed trades and per-card observations. |
| Player actions | `src/market/sim/player.js`: list (fixed, auction, swap), withdraw, buy, bid (proxy), buy out, buy order, cancel order, offer a swap, answer or withdraw an offer. Each takes a request id, returns `{ ok, error, message }` and never throws for an expected failure. |
| Runtime | `src/market/sim/runtime.js`: one driver timer, the freeze rules, persistence with rotation and recovery, export and import, reset, fast-forward for tests. A factory over injected dependencies, so the same code runs in the game and under Node. |
| Game wiring | `src/market/sim/game.js` is the only simulator file that touches `C.state`, the event bus, the document and `localStorage`. |
| Provider | `src/market/sim/provider.js` presents the world in the shapes the Stage 1 interface already uses (`status`, `wallet`, `listings`, `listing`, `cardMarket`, `trades`, `stocks`, `portfolio`, `activity`, `inventory`, `suggest`, `valuation`, and the eleven writes). Registered for realm `simulation` on `app:ready`. |
| Tuning | `src/data/market-sim.js`: every number the simulator decides with. Data only. |
| Interface | Clock chip and panel, onboarding, live updates, real purchase, bid, buyout, swap, listing, withdraw and buy-order flows, real portfolio, activity, my listings, alerts and charts. `src/ui/market/sim-controls.js` plus edits to the shell and every page. |
| Save integration | Optional `save.market = { receipts: [...] }`, listed cards cannot be deleted, open bids and orders hold Credits. See section 5. |

The Stage 1 sample provider is still in place for the Global realm's optional sample layout and as `Cardable.market.api.useSample(true)` for the Stage 1 regression check.

## 2. Time: exactly when the market moves

Simulation time is its own integer millisecond clock (`world.now`). It advances by *active real time between two ticks × the speed factor*, and only when **all** of these hold:

- the document is visible and the desktop window is not hidden or minimized;
- the player has not paused the simulation (the Pause control, persisted in the world);
- no save recovery choice is pending and the game finished starting;
- if the player's setting is *When another window is in front: Pause*, the window has focus.

Rules that follow:

- **No catch-up.** Closing the game, hiding it, minimizing it or pausing stops the clock where it is. There is no elapsed-time replay on return. Opening the game later continues from the saved simulated instant.
- **Gaps are not banked.** A gap longer than `maxGapMs` (30 s) between two ticks counts as zero. Resuming from pause, becoming visible or regaining focus restarts the interval at that moment.
- **Monotonic.** Ticks use `performance.now()`. Changing the operating-system clock has no effect on simulated time.
- **Speeds.** Calm 20×, Standard 60× (one minute of play is one simulated hour), Fast 240×. The speed is a saved Market setting (`marketSimSpeed`).
- **Fast-forward is not a feature of play.** `Cardable.marketSim.runtime.dev.fastForward(ms)` exists for tests and experiments; the `Cardable.marketSim.dev` wrapper needs `?dev=1`. It runs the same engine, so it cannot fabricate a trade. No interface offers it.
- **Cost.** One timer, rescheduled to the next due event (250 ms to 2 s). Slices handle at most 250 events. Nothing runs while frozen, and no component has its own clock: countdowns are text updated from the simulator's tick.

## 3. Determinism and the seed policy

- All randomness is one `mulberry32` stream stored in the world (`world.rng`). Given the same seed, nonce and sequence of player actions, the world is bit-for-bit the same whatever the slice size (tested: advancing in one run and in 7-hour slices serialize identically).
- A new world's seed is `playerCode:createdAt|sim`, plus a **nonce** that increases on every reset, so a reset gives a different world and a fresh copy of the same save gives the same first world.
- Bots' names are two-word aliases (reusing the Stage 1 vocabulary), unique, with their own serial codes that cannot collide with the player's.
- At creation the same engine runs **five simulated days of warm-up** before you arrive (about 55 ms), so day one has genuine history, order books and a populated market. Warm-up trades are real engine trades; the epoch is set afterwards so the displayed clock starts at Day 1 and charts show those five earlier days honestly as history.

## 4. The traders and the rules of the market

### Personalities (all values in `market-sim.js`)

| Personality | Behaviour |
|---|---|
| Careful collector | Buys for a binder (wishlist of 14), rarely sells, holds 20 to 60 days. |
| Value investor | Needs a 12% discount, tiers 3 and up, holds 12 to 40 days, bids late. |
| Deal hunter | Needs 18% under value, loves auctions, snipes with 70% probability. |
| Quick flipper | Wakes every 2 to 8 hours, 7% margin, never sells below its cost plus 3%. |
| Completionist | Pays above fair for a wanted card (−5% margin), holds 30 to 90 days. |
| Specialist | Trades only inside one brand or generation. |
| Cautious buyer | Common tiers, small positions, avoids auctions. |
| Risk seeker | Scarce tiers, accepts wide spreads, high markup. |
| Hype follower | Weights recent price direction, sells into strength, turns cards over in under a week. |

Every trade records **why** each side did it, in words (for example "Value investor · bought 9% under Average Value", "Deal hunter · won with a proxy bid 4% under Average Value", "Quick flipper · sold 3% over Average Value"). The reasons show on trade rows (hover) and in the trade lists.

### Where Credits and cards can appear

Only two places add Credits and one adds cards, all visible in Market settings and in the totals:

- **Allowance:** once per simulated day each trader is topped up toward a personal reserve, never past it, at most 60 Credits a day. Issued totals are shown.
- **Packs:** traders open a bounded number of packs (at most 4 per world per day), announced in the feed; this is the only source of new cards.
- **The fee** (2%, half-up, at least 1 Credit) is removed from the world on every completed trade and counted.

Property tested over 12 simulated days: `credits_end = credits_start + allowance − fees`, and no card is ever in two places (the `audit` function checks every bot, every open listing and the player's inventory ids).

### Listings

- **Fixed price:** one asking price, 1 hour to 30 days (the composer offers 1, 3, 7 and 14 days).
- **Auction:** start price, optional reserve and buyout, 1 hour to 14 days (6 h, 24 h, 3 d presets; custom in Advanced). Bid steps are 5% or at least 1 Credit. A bid is a *maximum*; the price is one step above the runner-up, never above the leader's maximum (proxy bidding). Equal maxima go to the earlier bidder. A bid in the last five minutes extends the close by five minutes, at most six times. A reserve is met once the leader's maximum reaches it, and the price then shows at least the reserve. Buyout ends the auction and releases every other hold.
- **Swap:** one card for acceptable cards (a specific card or a rarity or better, with a minimum value share). Traders make offers with their own cards and sometimes a Credits top-up; they may **counter** by asking for a gap to be paid. A counter can be accepted or withdrawn. Offers expire after two days.
- **Buy orders:** a highest price, any finish or one finish, 1 to 7 days. Matched against listings by cheapest ask. The price is held while open.
- **Limits:** six open listings per trader, 40 for the player, two orders per trader, 12 for the player.

## 5. Your save, exactly once

The player's cards and Credits only change through one function, `C.marketSim` `player.apply(effect)` in `game.js`:

1. It builds a **single candidate save**: instances removed or added, Credits changed through `C.currency.applyInto` (reasons `market sale`, `market purchase`, `market swap`), and the **receipt id** appended to `save.market.receipts` (last 600 kept).
2. It runs the same `C.state.validate` a loaded save passes (unique serials and instance ids, known packs and finishes).
3. It commits once with `C.state.commit`, bumps `C.collection.revision`, announces the Credits change and emits `market:settled`.

A receipt that is already in the save is a no-op that returns success. That gives exact-once behaviour in every interruption:

| Interruption | Result |
|---|---|
| Crash after the simulator wrote the intent but before the save changed | On next load the pending settlement is finalized once (`reconcile`). |
| Crash after the save changed but before the simulator wrote "done" | Reconcile sees the receipt in the save and only finishes the simulator side. |
| The save cannot take it (card gone, Credits short) | The sale is **voided**, the listing is cancelled and held cards are returned; you get a notice. |
| A save backup is restored (older save, newer simulator) | Completed receipts newer than the last one the save knows are replayed; any that conflict are reported and left alone. |
| A different player's save loads | The player's listings, bids, orders and offers are detached; bots keep their world. |
| Save write fails | The sale stays *settling*, is retried every tick and never double-pays. |

- **Locks.** A listed or offered card stays in your collection but `world.locks[instanceId]` names its listing or offer, so it cannot be listed twice, offered, or deleted. The delete dialog says why. Cards you mark Locked in the game cannot be listed.
- **Holds.** Open bids and buy orders hold Credits (`heldCredits()`): `C.currency.spend` and `canAfford` subtract them, so Shop and everything else respect them. Raising a bid only needs the difference.
- **Reset** replaces the world with a new one (new nonce). Cards you had listed simply never left your save, so they come back unlocked. Your cards and Credits are untouched, and watchlist entries that named old listings are cleared.
- **Requests are idempotent.** Each UI action carries a request id; a repeated id returns the first answer (tested with a duplicate purchase).

## 6. Valuation, charts and "no invented data"

- **Average Value** is a weighted, outlier-trimmed mean of the trades observed for that card, finish and skin (window 16, half-life six days), blended with the baseline as a prior of weight 6. With no trades it is the baseline, and the confidence reads *Not enough data* (none, then low from 1, medium from 4, high from 12 recent trades).
- **Best bid** and **Lowest ask** are the real open buy order and cheapest listing when they exist; when they do not, the interface labels the figure an estimate. **Last sale**, **24 h and 7 d change** and **volume** are computed only from executed trades; when there are fewer than two trades the change is *No sales yet*, not a number. Volatility and liquidity are `null` until there is something to measure.
- **Charts** place each point where its trades happened in time; a window with no trades draws nothing and says so. Group scopes (Market, Rarity) are indexed as trade price over each card's baseline; 30 d, 90 d and All windows use the daily aggregates, which survive longer than individual trades.
- The Stage 1 `fixtures.js` generator is no longer used by the Simulation realm for prices, listings or charts.

## 7. Persistence

| Key | Contents |
|---|---|
| `cardable.market.sim` | `{ schema: 1, sum, body }`: the whole world as JSON with a checksum (`hash32`). Written at most every 4 s while running, immediately on player actions and before a settlement. |
| `cardable.market.sim.bak` | The previous good copy, rotated immediately on player actions and settlement, otherwise at most once a minute. |
| `cardable.market.sim.corrupt[.n]` | An unreadable copy is never deleted: it is stored under this name, and the backup is tried next. |

- A world is about 235 KB when created and 600 to 850 KB after 30 to 120 simulated days (trades 700, feed 120, 200 closed listings, three days of finished orders; the player's own are kept two weeks). If a write fails the runtime trims history and retries; if that fails it says so in Market settings and keeps running for the session. Nothing about the player's save depends on it.
- **Export** writes the same wrapper as a JSON file that contains no cards; **Restore** validates schema and checksum, then reconciles with your save. A damaged or newer file is refused with a message.
- Schema changes bump `schema`; an unknown version is refused, never half-read.

## 8. Interface changes (all driven by the provider)

- **Header:** simulated clock chip (Day, time, Running, Paused or Frozen) opening a panel with Pause or Resume, Calm, Standard, Fast, the freeze statement and world counts. The wallet shows Credits held by open bids and orders. On narrow windows the chip shortens to "D4 06:12" and the guide moves to More.
- **Discover, Auctions, Buy Now, Trades:** real listings, live countdowns, prices that change in place, closed listings dimmed, and a pill for new listings. Recent trades show seller to buyer with the reasons.
- **Listing detail:** Buy now, Place bid or Raise maximum, Buy out, Offer a swap (choose cards, add Credits), Withdraw, offers on your listings (Accept, Decline) and your counters. The action area rebuilds only when something about that listing changed and keeps what you typed.
- **Card market:** real depth, buy orders (place, see, cancel), real charts and trades.
- **Composer:** real inventory with listed or locked copies disabled, Average Value from real trades, a fixed-price duration, real publish with a confirmation.
- **Portfolio:** holdings valued from real trades, cost basis for cards bought here, realized and unrealized change, fees paid, listings, bids, orders.
- **Activity, My listings, Alerts:** real notices (sold, bought, outbid, leading, offers, counters, orders), mark read, withdraw, orders and offers.
- **Settings:** a Simulation panel with state, totals, Pause, Export, Restore from file and a click-again Reset.
- **Onboarding:** one note on first visit and a guide that says what the Simulation is, what the clock does and what a listing locks.

## 9. Verification

| Check | Result |
|---|---|
| `tests/market-core.test.cjs` | 22 of 22 pass |
| `tests/market-sim.test.cjs` | 22 of 22 pass: determinism across slice sizes, history only from executed trades, conservation of Credits and cards, proxy bidding, ties, anti-snipe, reserve and buyout, buy orders, swaps and counteroffers, exact-once settlement and every interruption row of section 5, locks and holds, persistence, checksum, backup and corruption, export and import, reset, valuation shape |
| `tests/market-sim-provider.test.cjs` | 6 of 6 pass: baseline valuation with no trades, valuation from trades, charts placed by time with no empty candles, listing views, portfolio cost basis, a player sale writes one trade and one fee |
| `tools/check-market-sim-browser.cjs` | 17 of 17 steps pass in headless Chromium from `file://` (below) |
| `tools/check-market-browser.cjs --quick` | Passes (Stage 1 sample interface, via `useSample(true)`) |
| `node scripts/check-data.js`, `tools/verify-assets.cjs` | Pass (381 registry entries; 202 scripts and 55 stylesheets exist) |
| `tests/electron-services.test.cjs` | 8 of 8 pass |

### Browser journeys verified (`qa-output/market-beta/stage-2`, curated copy in `docs/market-beta/screenshots/stage-2/`)

1. The world exists with 36 traders, hundreds of trades of history and all three listing kinds.
2. The clock chip shows a running simulated day and opens its panel.
3. **Buying** a fixed-price listing through the buttons: Credits fall by exactly the price, one card arrives with its original serial and instance id, one receipt is written, the listing reads Sold, and replaying the request changes nothing.
4. **Bidding**: the maximum is held (header shows "held"), nothing is paid, the market runs past the close; a won auction costs the final price, never the maximum, and every hold is released.
5. **Listing** a card through the composer: it is locked, the deletion rules refuse it, My listings shows it.
6. A **listed card sells at most once**: after 14 simulated days Credits rose by exactly the sum of net proceeds of recorded sales, one card left per sale, no duplicate instances, audit clean.
7. **Withdrawing** returns the card unlocked.
8. A **swap offer** locks the offered card; withdrawing unlocks it.
9. A **buy order** is placed and cancelled.
10. **Pause** freezes time; resume does not jump it.
11. A **hidden document** freezes the clock and returning does not catch up.
12. A **reload** keeps the world, an open bid and its hold, and time does not move while the game was closed.
13. **Export, reset and restore**: the reset leaves cards and Credits as they were and clears locks and holds; restoring brings back the same trade count.
14. **Speed**: Fast advances more than three times as much as Calm.
15. Every target size (1920 × 1080, 1366 × 768, 768 × 1024, 390 × 844, 360 × 800): no horizontal page scroll, the clock chip never overlaps the wallet, the panel stays inside the window.
16. Saved monochrome keeps the chip and prices readable.
17. No console error, no page error and **no non-local network request**.

### Economy experiments (`tools/sim-experiment.cjs`, seeded, headless)

30 simulated days, 5 seeds, with a naive arbitrageur that buys 12% under Average Value and relists at fair:

| Measure | Result |
|---|---|
| Trades per day | 26 (about 1,560 Credits a day) |
| Fees removed per day / allowance issued per day | 45 / 58 Credits |
| Trader Credits start to end | 51,601 to 54,276 (allowance and packs in, fees out) |
| Wealth spread | Gini 0.51; no trader below the floor; median 925 |
| Price against baseline p10 / p50 / p90 | 0.89 / 0.96 / 1.04 |
| Mean trade price against Average Value at the time | 0.966 |
| Sell-through of listings | 78% |
| Largest number of trades of one card | 7 |
| Audit problems | 0 |
| Arbitrageur, 30 days from 5,000 Credits | +27, +74, +741, +757, +302 (realized cash 2 to 79); no free lunch |

At 90 days (2 seeds) price against baseline drifts to a median of 0.94 as traders open packs and supply grows, still with 0 audit problems. This slow supply-driven drift is intentional and is the first thing Stage 3 tunes.

### Observed cost (headless Chromium, one desktop CPU; not a hardware measurement)

| Measure | Value |
|---|---|
| First creation of a world including five days of warm-up | about 55 ms |
| One simulated day of events | about 9 ms |
| Serialize and checksum a 600 KB world | about 25 ms and 25 ms to read back, at most every 4 s |
| Timer | one, 250 ms to 2 s, none while frozen |
| Scheduler subscribers added | 0 |

## 10. Known limitations and what was not checked

- **Single player, single device.** Another player never appears; this is the offline Simulation only. Cloud saves stay disabled.
- **Pack Credits are unchanged.** The +200 Credits per pack reward and delete refunds still work as before; Stage 3 removes them as a future reward and adds Quick Sell, bulk sell and per-card valuation.
- **Quick Sell is not available** in this stage (`quickSell` answers *not available*). Stage 3 adds it.
- **Swaps support card and rarity rules only.** Credits top-ups are paid by the proposer; the listing's "Credits top-up", "finish rule" and "low serial" options are hidden in the Simulation composer because the engine does not honour them yet.
- **Cover images** are not used by Simulation listings (the card's own art always shows). Uploads arrive with the online Market (Stage 7).
- **Replays of a restored older save** are reconciled, but a restored save from a different *device* is a different player identity and the world is detached, not merged.
- **Price drift.** Prices settle about 4% under baseline in a month and drift down slowly as supply grows (see experiments). It is bounded and honest; it has not been tuned against real play.
- **Not checked:** behaviour on a physical low-end device, screen-reader runs of the new dialogs (accessible names, roles and keyboard paths were checked mechanically only), the installer or packaged build (no delivery by design), and any Global Market behaviour.
- The Electron smoke test and a one-off run of the Market in Electron are recorded in section 11.

## 11. Electron

One-off runs of the real Electron app from this worktree (temporary profile; a real window, run once for this milestone; the Stage 1 smoke test was not repeated):

- Launch, commit a prepared save, open the Market: the world is created with 36 traders and 24 tiles render, no console or page error.
- Buy a fixed-price listing through the provider: Credits fell by exactly the price (320 to 195 for a 125 Credit listing), one card was added and the receipt `R-1-L4r-fixed` was written.
- **Quit and relaunch with the same profile:** the world loads, the simulated instant is unchanged, Credits (195), inventory (42 cards) and the receipt are the same, and the clock resumes without a jump.
- A second launch printed clock samples every second: the simulator ticked every two seconds as designed and advanced about 8 simulated minutes in 8 seconds at Standard speed with the window in front.

Not repeated in Electron: freeze on minimize or hide (checked in Chromium with a hidden document and by unit tests of the gate), and the packaged installer.

## 12. Source-contract deviations

- `market.md` asks for the Simulation to "freeze when closed or hidden". It also freezes when paused, when a save recovery choice is pending, and (only if the player chose *Pause when unfocused*) when the window is not in front. These are the same rule: the market never moves behind the player's back.
- Bots have no persistent identity across a **reset**: a reset creates new traders. Export and Restore keep them.
- Fast-forward exists as a developer function. It is documented here rather than hidden.
