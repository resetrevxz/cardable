# Cardable Market Beta 1.0.0 — Stage 6 acceptance report: stocks, analytics, portfolio and discovery

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge, no release, no live-site change, no desktop delivery. Operator runbook: [cloudflare.md](cloudflare.md). Trading rules: [stage-5.md](stage-5.md).

## 0. The honest headline

Stocks, card analytics, the portfolio books, explainable ranking, server-side search, alerts, Compare and the Explore areas are built and verified **locally** (a real Worker, a real local D1, the real interface). They are **not deployed** (Cloudflare is still unauthenticated, see Stage 4), so every number in this report is from a throw-away local database whose sales were either made through the interface or are **labeled fixtures** (`trd_fixture_*`). No benchmark here is a measurement of a real beta, and no figure should be read as one. Which statistics are real, and which are not, is stated in section 1.

## 1. What is real and what is not

| Realm | Source of every chart, total and valuation | Never counted |
|---|---|---|
| **Global** | `price_observations`: one row per **completed Credit sale of one card between two authenticated players**, written in the same transaction as the trade. Totals are exact SQL aggregates. | Quick Sell to the system, swaps, bundle sales, offers, counteroffers, cancelled or expired orders and listings, Simulation trades, Stage 1 sample data, uploads |
| **Simulation** | The local world's executed trades (unchanged from Stage 2) | the player's Quick Sell, Global anything |
| Stage 1 sample data | Only under `?dev=1` "Global sample layout", always labelled "Illustrative" | — |

The Simulation and Global never share a series, a total, a credit balance or a purchase button. Global's Discover has one separate line pointing at the Simulation and no listing from it.

## 2. Formulas

All Global formulas live in `cloudflare/src/analytics.js` as pure functions and are tested against hand-computed expectations.

**Average Value.** The price this exact card actually sold for.
- Window: the last 14 days with a **recency half-life of 3 days** for a card that trades often (12 or more sales in 30 days, "frequent"); the last 90 days with a **14 day half-life** for a scarcer one ("scarce"). At most the last 100 sales.
- Each sale is **capped** to the window median ± 55%.
- frequent → recency-weighted **mean**; scarce → recency-weighted **median**, which one odd sale cannot move.
- `Average Value` is `null` with no sales, never a guess.

**Fair value (model).** A separate, labelled estimate: `(baseline x 6 + Average Value x Σw) / (6 + Σw)` where `Σw` is the sum of the sales' recency weights. With no sales it is the baseline. The baseline is the game's own rarity base × per-GPU spec percentile × finish × skin factor.

**Also reported** (each from the same window, uncapped where it says so): VWAP (Credits / units, each sale is one card), plain median, weighted median, weighted mean, price range over 30 days (exact SQL min/max), last sold (price and age).

**Changes** (24 h, 7 d, 30 d, 90 d, all): last price against the last sale **at or before** the start of the period, as an absolute and a percentage, with both endpoints returned. Withheld (`null`) when no such sale exists or the reference is more than one period older than the start, so a stale reference is never labelled "24 h".

**Volume.** 24 h / 7 d / 30 d / all: **units sold and total Credits**, from SQL aggregates over the whole window (not from the capped series).

**Spread.** Real when there is both a best bid and a lowest ask: `(ask − bid) / fair value`, with the absolute figure. Otherwise a tier estimate (`0.03 + 0.012 × tier`, capped at 0.22) labelled "Estimate: needs an order on each side".

**Depth.** Up to five price levels with counts for open asks and open buy orders; **supply** = open listings of that card and finish; **turnover (7 d)** = units sold / (supply + units sold).

**Volatility.** Standard deviation of log returns between consecutive sales in the window; withheld with fewer than four sales.

**Liquidity (0–100).** `0.6 × min(1, units in 7 d / 8) + 0.4 × (spread tightness: 1 − spread / 0.3)`; the spread term is 0.1 when the spread is only an estimate. Null with no sales and no listings.

**Confidence.** High ≥ 12 sales in 14 days; medium ≥ 4; low > 0; none otherwise.

**Target buy and sell ranges.** Not "lowest ask minus a number". From the weighted 15th, 40th, 60th and 85th percentiles `q15…q85` of the capped executed prices, with `s` the spread, `p = (bids − asks) / (bids + asks + 2)` the demand pressure, and `hf` a horizon factor:
- target buy = `[ floor(q15 × (1 − s/2)), floor(q40 × (1 − s/2) × (1 + 0.03 p)) ]`
- target sell = `[ ceil(q60 × (1 + s/2) × (1 + 0.03 p) × hf), ceil(q85 × (1 + s/2)) ]`
- `hf = clamp(1 − 0.02 × log2(max(median hours to sell, 6) / 24), 0.94, 1.04)`; 1 when time to sell is unknown.
- With fewer than four sales the percentiles come from the fair value ± a band of twice the tier's volatility (4–30%), and the range is labelled `baseline`.

**Proposed listing ask** = the low end of the target sell range; **expected proceeds** = ask − fee (2%, half-up, at least 1); expected margin against the target buy is shown net of that fee.

**Estimated time to sell** — only when there are three or more sales in 30 days: the usual gap between consecutive sales (median, with the 25th–75th percentile as the range) × (1 + the number of open asks at or below the proposed ask). Otherwise "Not enough sales to say".

**Index points** (groups: all, rarity, brand, generation). Each sale is `price / that card's own baseline × 100`; a bucket's open/high/low/close are those points, volume is units and Credits. A group with no sales draws nothing.

## 3. Time windows, buckets and time zones

| Window | Span | Bucket |
|---|---|---|
| 24 h | 24 hours | 1 hour |
| 7 d | 7 days | 6 hours |
| 30 d, 90 d, All | 30 / 90 days / everything | 1 day |

Buckets are integer divisions of the **UTC** epoch, so a series never depends on the viewer's, the server's or the test machine's time zone (tested across a UTC midnight). A bucket exists only where a sale happened; quiet periods are gaps. Charts have a line mode and a real OHLC candle mode, volume bars, a readable data table, a crosshair readout and an accessible summary (the Stage 1 chart, now fed real data). One chart is mounted on Stocks and none per feed item.

## 4. Source rules, caches and cost

- **Read model**: `price_observations` (index `card_id, at`, `card_key, at`, `at`), `trades` (for recently sold; swaps excluded), `listings`/`orders` for depth and supply.
- **Server caches**: the Cache API (data-centre local) with an in-isolate fallback, for **account-independent** answers only, keyed by the exact card/scope/window in a time bucket the length of the lifetime: 24 h windows 30 s, 7 d 45 s, 30 d 3 min, 90 d and All 10 min (their totals scan every sale in the span, so they are computed rarely), movers 45 s. The set of keys is bounded by the catalog: a finish or skin that is not in it is refused (404) before anything is read, and the whole-market series ignores any `id`. Off in the test environment unless `ANALYTICS_CACHE=on`; always on when `ENVIRONMENT=beta`. A cache hit returns the same figures a miss would (tested).
- **Client caches** (data layer): card analytics 12 s, stocks 12 s, movers 20 s, portfolio and alerts 10 s; any write invalidates all of them; polling stops 90 s after the Market was last used.
- **Bounds**: a card's series reads at most its newest 200 sales; a group's at most 20,000 rows. Totals are exact regardless; a bounded series says so ("shows the most recent N; the totals count every trade").
- **Measured locally** (1,000 labeled fixture sales over 40 cards, a warm local runtime, uncached): a card's analytics **5 statements, 55 rows read, ~20 ms**; the whole-market series **2 statements, 2,000 rows read, 13–27 ms**; a rarity series 2 statements, 1,482 rows; movers one query. Every analytics response carries its own `cost: { queries, rowsRead }`. With the free plan's 5,000,000 rows/day the uncached whole-market view could be computed about 2,500 times a day; the cache bounds it to one computation per key per 45 s. These are local figures: Cloudflare's own latency and billing were not measured.

## 5. Portfolio

`GET /v1/portfolio` (the server keeps the books), plus CSV and JSON export of holdings, trades and the ledger.

| Number | Rule |
|---|---|
| Wallet, held by bids / orders / offers, cards in escrow | exact, from the wallet, the holds table and card states |
| Owned count | cards that are owned or in escrow; redeemed ones are gone |
| Estimated value (mark to market) | each card at its fair-value Average Value × its serial factor, with a **confidence** (the weakest tier holding at least half the value) and the share of value by confidence |
| Quick Sell value | separate, labelled "what the system would pay" |
| Cost basis | the price paid here; a bundle's price split by baseline value (remainder to the first card); `No cost basis` for cards from the import or a swap — never zero, never a loss |
| Realized profit | for sales (and Quick Sells) of a card with a **known** basis: proceeds after the fee − basis. Sales without a known basis add to volume and fees only. A Quick Sell at a loss is counted once. |
| Unrealized change | estimate − basis over held cards with a known basis |
| Volume, fees | sold and bought, units and Credits; fees as the seller |
| Swaps | counted as swaps; no profit recognised; swapped-in cards start with no basis |
| Groups | named sets of exact cards, **on this device only**, per realm |
| Export | the player's own rows; counterparties as their public alias; no account id, session or address (tested) |

A pack-opened card in the offline game has no cost, which is why imports have no basis: the convention is shown in the interface and in the export.

## 6. Recommendation engine

Explainable, eleven weighted factors that sum to 1 (`DEFAULT_WEIGHTS` in `src/market/core.js`), each also a visible bar and, when strong, a short reason on the card:

| Factor | Weight | What it is |
|---|---|---|
| value | 0.24 | gap against the Average Value, scaled by confidence |
| margin | 0.10 | after-fee margin against the **target sell**, not against other asks |
| budget | 0.14 | a bell around a comfortable share of your **available** balance (never "ask ≤ balance, cheapest first"); unaffordable is penalised, not hidden |
| gap | 0.10 | a card you do not own |
| wish | 0.08 | on your wishlist |
| pref | 0.06 | the rarities and finishes you keep, from your own collection **in that realm** |
| liquidity | 0.08 | how easily it trades |
| opportunity | 0.06 | the share of your balance it ties up, for as long as it usually takes to resell |
| fresh | 0.05 | listing age |
| trust | 0.04 | the seller's completed sales; a rating only if one exists (none is invented; reputation arrives in Stage 7) |
| fill | 0.05 | fixed: affordable; auction: headroom over the current price; swap: whether you hold something its conditions accept |

Not read, ever: any trade that cannot be verified (the offline Simulation's trades do not feed Global ranking), the player's own sales, a price sort. Explicit price sort is still a user choice. Confidence and "higher risk" are shown honestly. Global Discover ranks only real human listings; the Simulation's listings never appear there.

**Explore areas** (Discover tabs, quick views and the "Moving now" strip): For You, Newly listed, Ending soon, Trending (volume), Best relative value, Rare finds, Around your budget, Watchlist matches, Recently sold, Series and brand (the brand you hold most), Highly liquid, Greatest change (either direction, 7 d), Desired variants (finishes you keep).

## 7. Search, filters and saved state

- **Server-side, paginated, index-supported**: kind, card, rarity, brand, generation, finish (incl. normal), skin, price min/max, serial ceiling, minimum bids, reserve met/unmet/none, time left, tier range, seller, text over card name and brand; sort by newest, ending, price, bids; keyset cursors. A search response reports its cost. The plan for each shape is asserted not to scan the table (`EXPLAIN QUERY PLAN`, indexes on status + rarity/brand/generation/price/ends/created).
- **Client-side facets** that need a valuation (value % of Average Value, confidence, liquidity, ownership, wishlist, budget) apply to the page the server returned (the open listings held, up to 500 newest), with live counts. A search that is truncated says so.
- Multi-select facets, clear chips, accessible filter sheet, no-results recovery, saved views and named sort presets **per realm**, search history, side-by-side Compare of 2–4 exact cards, scroll and selection preserved on return.
- Left out because the data does not exist: card condition, "who you follow" (reputation is Stage 7).

## 8. Alerts

Price thresholds and saved searches are stored on the server and evaluated **when a real listing appears or is repriced**. Only alerts that really match are selected (in SQL) and only then is the fan-out bounded (50 per listing, the alerts that have waited longest first), so a crowd of alerts that match nothing cannot push a real one out of the window; the 20-alert cap is part of the insert, so a burst of requests cannot exceed it. A match is one in-app inbox notification per alert per listing (deduplicated by a unique key), never for your own listing. The beta has no push channel, so an alert fires only while the server handles a listing, and waits in the inbox until you open the game; this is stated in the alert dialog. Outbid, ending and fill events already arrive as notifications (Stage 5). "Average Value falls to" alerts are evaluated on this device when the page is open.

## 9. Evidence

| Check | Result |
|---|---|
| `npm run test:cloudflare` (api, analytics, economy, trading, races) | **73 / 73** |
| `tests/market-core.test.cjs` incl. the four ranking tests | 26 / 26; `npm run test:market` 74 |
| formulas vs hand-computed fixtures: zero volume, one sale, outlier, frequent vs scarce, stale reference, one-sale change, time to sell, targets independent of the ask, UTC buckets across midnight, index points | pass |
| endpoints on labeled fixtures: busy card (48 sales), rare card (one 40-day-old sale), outlier card, none; exact totals vs SQL; a Quick Sell, a swap and a bundle change nothing | pass |
| realm divergence: Global series only from player sales; the Simulation's tests unchanged | pass |
| portfolio: basis, imports without basis, profit after fee only where known, a Quick Sell loss counted once, CSV without private ids | pass |
| alerts: once, not for your own listing, deduplicated on reprice, deletable | pass |
| search: pages never repeat or skip, filters narrow and the count follows, `EXPLAIN QUERY PLAN` uses an index for 7 query shapes | pass |
| `npm run check:market-analytics` (real interface, local Worker) | **11 / 11**; 360, 390, 768, 1366, 1920 px with no horizontal overflow; saved monochrome; Very Low and High quality; one chart on Stocks and none in the feed; page drawn in about 33 ms after data |
| Regression: Stage 1–5 browser checks | pass |

Screens (`docs/market-beta/screenshots/analytics-*.jpg`): the whole-market series; a busy card; a card with one old sale; a card with no sales; the portfolio with its books; Compare; Discover's "Moving now"; the inbox after an alert; the card page at each width and in monochrome, Very Low and High.

**Benchmark datasets are explicitly labeled test fixtures.** They exist only in throw-away local databases; no fixture row is in any beta realm.

## 10. Known limits and open gates

| Item | Status |
|---|---|
| Live (staging) verification of any of this | **not done**: needs the owner's Cloudflare sign-in |
| Numbers on real beta data | none exist; every figure above is fixture or local |
| Cache API behaviour on Cloudflare (hit rate, regional separation) | designed, not measured |
| Series bounds | a card's newest 200 sales, a group's newest 20,000 rows; totals stay exact and the page says when the series is bounded |
| Index-supported search covers the facets above; value-derived facets filter the returned page | a very large realm would want server-side valuation columns |
| Time to sell is a heuristic from sale gaps and queue length, not a promise | stated in the panel |
| Reputation, "who you follow", comments, uploads | Stage 7 |
| Alerts are in-app only | no push channel in the beta |
