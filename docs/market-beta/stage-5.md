# Cardable Market Beta 1.0.0 — Stage 5 acceptance report: real player trading

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge to `main`, no GitHub Release, no live-site change, no desktop delivery. Operator runbook: [cloudflare.md](cloudflare.md). The Credit economy model: [stage-5-economy.txt](stage-5-economy.txt).

## 0. The honest headline

Fixed sales, timed auctions with proxy bids and anti-sniping, buy orders, swaps with counteroffers, multi-card bundles, and the system redemption (Quick Sell) are **built, and verified end to end on a local Worker with a real local database**, from the interface and from the API, with 120 seeded race scenarios that reconcile. They are **not deployed**: Cloudflare is still not authenticated on this machine (the owner's interactive sign-in, see Stage 4), so the "actual full transaction from one test account to another on staging" is **not done** and nothing in this report claims it. What was demonstrated instead is the same transaction between three independent browser profiles against the same Worker code running on the Workers runtime locally (section 9).

## 1. What was built

| Area | What exists |
|---|---|
| Transaction engine | Every mutation is one D1 batch with an idempotency record, guards that abort the whole batch and name the broken rule, and ordered statements. Retries re-plan against the new state (section 3). |
| Fixed price | Single card or a bundle of up to 6; suggested or custom integer price; title and description with contact/link filtering; withdraw, reprice (a buyer's stale price is refused), relist; expiry; no self-purchase. |
| Auctions | Start price, bid step (5% or 1 Credit; Advanced may set an exact step), reserve, buyout, duration presets (Advanced: 1 hour to 14 days), proxy bidding with deterministic ties, escrowed maximum for the leader only, anti-sniping, closing on the server clock by a per-listing Durable Object alarm with a cron backstop. |
| Buy orders | Exact card; a finish and skin or "any"; maximum price; quantity 1–10; expiry; the whole reservation held; deterministic matching; edit and cancel; fill receipts. |
| Swaps and offers | Seller conditions (cards, tier, finish, skin, serial ceiling, minimum cards, minimum value % of Average Value, minimum top-up); offers escrow the offerer's cards and Credits; a bounded counteroffer negotiation over Credits; atomic two-sided settlement. |
| Quick Sell | `GET /v1/sell/quote`, `POST /v1/sell`: a disclosed system redemption, retired serials, daily limits, durable receipt, never a trade or a price. |
| Money | Separate wallet, append-only ledger, holds table, receipts with operation ids, server timestamps, no private ids. |
| Operator | `reconcile` (21 invariant checks plus the Credit supply), `repair`, `sweep`, `import/revoke`, behind a secret admin token. |
| Interface | The Stage 1 interface drives all of it: Buy now, bid and raise maximum, buyout, composer (publish), counter dialog, reprice and relist, buy order dialog, Sell to the system, status chips, activity and notifications, loading, offline and retry-safely states. |

## 2. Rules that were decided (and where they are enforced)

| Question | Decision |
|---|---|
| Who sets price, time, increment, reserve | The server only. The browser sends intent (`max`, `expectedPrice`); nothing the client says about its balance, ownership, fee, deadline or the other side is read. |
| Fee | 2%, half-up, **at least 1 Credit** (the same rule as the offline game), taken once from the seller's proceeds on a successful Credit sale. A 1 Credit sale pays a 1 Credit fee and the seller keeps 0. |
| Fee on a swap | A **card-for-card swap has no fee**: no Credits move, nothing is recorded as a sale. If Credits move (a top-up or a refund) the fee applies to those Credits and is taken from whoever receives them. |
| Price attribution | A price observation is written only for a Credit sale of **one** card between players. A bundle never sets a single card's price. A swap, a Quick Sell and a withdrawn listing never do. Swaps are stored as barters (`trades.kind = 'swap'`, `attributed = 0`) and are excluded from sale volume. |
| Auction price | The highest maximum leads; the earlier bidder wins a tie; the price is one step above the runner-up (never above the leader's maximum, never below the start). Once the leader's maximum reaches the reserve the price shows the reserve. |
| Holds | Only the **leader's** maximum is held (a bidder who is not leading holds nothing, and cannot spend what they do not hold). A displaced leader is released in the same transaction. |
| Anti-sniping | A bid that changes the leader or the price within the last 5 minutes moves the end to 5 minutes after that bid, at most 6 times (so at most 30 minutes in all). A bid that changes nothing never extends. |
| Buyout | Offered while the price is below it, whether or not there are bids. It releases every hold and ends the auction in the same transaction. |
| Cancelling an auction | Allowed until the first valid bid; refused after. |
| Deadline | A bid at or after `ends_at` is refused. Who wins is whoever led when the last accepted bid landed. A late settlement, a repeated one or a concurrent one cannot change it. |
| Order matching | A new order takes the cheapest eligible single-card listing (older first, then id); a new or cheaper listing goes to the order with the highest maximum (older first, then id). The trade is at the listing's price; the unused reservation is released. Reputation plays no part. |
| Never the wrong card | An order buys the card, finish and skin it names, or "any" if it says so. |
| Fixed purchase while "reserved" | A purchase is a single transaction, so there is no reserved-but-unpaid state to repair. "Reserved" on the interface means Credits held for your open bid, order or offer. |
| Quick Sell is not a market participant | It never appears in `trades`, `price_observations`, volume, Average Value or reputation. Its receipts are `redemptions`. |
| Offers on swaps | One pending offer per player per listing, 20 per listing, 20 per player; offers expire 2 days after the last move (never after the listing ends); six replies at most. |

## 3. Transaction model and invariants

```
 request ──► read state ──► validate (ApiError for the client's mistakes) ──► build statements ──┐
                                                                                                 ▼
   D1 batch (one SQLite transaction):  idempotency INSERT  →  guards  →  changes (wallet, holds, cards, listing, trade, ledger, notifications)
        │ a guard fails ("stale", "funds", "closed", "not_owned", "price_changed" ...) ─► whole batch rolled back
        │                 stale/conflict ─► re-read and re-plan (up to 5 attempts)
        └ success ─► response stored under (account, Idempotency-Key); a replay returns it unchanged
```

A guard is `INSERT INTO _guard (<rule>) SELECT NULL WHERE NOT (<condition>)`: it inserts nothing when the condition holds and violates the named column's NOT NULL when it does not, which names the rule in the error and rolls the batch back. It needs no triggers.

**What each concurrency path relies on**

- Listings, orders and offers carry a `version`; every mutation guards `version = <the one planned against>` and increments it. Two writers cannot both succeed against the same version.
- Wallets are updated with relative statements and protected by `CHECK (balance >= 0)` and `CHECK (held >= 0 AND held <= balance)`, plus a `funds` guard before each reservation.
- A card is in exactly one place: `instances.state` is `owned`, `escrow` (under one listing or offer, `escrow_ref`) or `redeemed`; `listing_items` and `offer_items` carry `UNIQUE(instance_id)` over live attachments only.
- Settlement of an auction guards the listing as *active and due*, moves the cards, releases the winner's hold into the payment, credits the seller net of the fee, writes the trade and the observation, and closes the listing, all in one batch. A second settlement finds the listing closed and does nothing.
- If the cards are no longer in escrow when a sale is due, or the winner cannot pay (neither can happen through the rules), the listing is closed with **nothing charged**, every hold is released and both sides are told, rather than retried forever (tested).

**Invariants checked by `GET /v1/admin/reconcile`** (all must hold; the tests run it after every group of scenarios):

1. `wallets.held` equals the sum of that account's open holds.
2. `wallets.balance` equals the sum of that account's ledger deltas.
3. No wallet is negative or holds more than its balance.
4. Every `escrow` card is attached to an active listing of its owner or a pending offer of its owner.
5. A card that is not in escrow has no escrow reference.
6. Every `listing_items` and `offer_items` row matches an escrowed card and a live listing or offer.
7. An active listing's attached card count equals its `item_count`; a closed listing has no attached cards.
8. Every active bid has an open hold of exactly its maximum; no inactive bid has one; at most one bid per listing is active; the leader is the highest proxy.
9. Every open hold belongs to an active listing, an open order or a pending offer.
10. An open order holds exactly `max_price x remaining`; a closed order holds nothing.
11. A pending offer has its cards escrowed.
12. A sold listing has a trade; an attributed trade has exactly one price observation; no observation comes from a swap.
13. A redeemed card appears in exactly one redemption.
14. **Supply**: the sum of all wallet balances equals the Credits issued by redemptions minus the fees burned by trades.

**Admin reconciliation strategy.** `reconcile` is read-only and cheap (one batch of 21 queries). `repair` is conservative: it returns escrowed cards that no live entity owns, clears stray references, deletes attachments of closed entities, releases holds nothing owns, and recomputes `held` from open holds, then reports `reconcile` again. It never creates Credits or cards. `sweep` runs the same closing and matching code the alarms use. `import/revoke` removes the unspent cards of a disputed import and frees its claim, and reports what it could not undo (cards already traded). A fixture realm: tests run against throw-away local databases, never against any persistent beta history.

## 4. API

All writes require `Idempotency-Key` (8–80 of `A-Za-z0-9_-`). Responses are `{ ok, data | error, trace }`. Numbers must be real JSON numbers (a string `"10"` is refused). Pagination is by cursor.

| Method · path | Notes |
|---|---|
| GET `/v1/status` | adds `features` and the `rules` the client shows (fee, durations, limits) |
| GET `/v1/listings?sort&kind&cardId&rarity&mine&cursor&limit` | public listings with valuation, seller alias and tenure; own maximum only for yourself |
| GET `/v1/listings/:id` | detail with bid history (aliases and prices), your offers, similar, recent trades; settles a due listing first |
| POST `/v1/listings` | `kind` `fixed` · `auction` · `swap`, `instanceIds` (1–6), `ask` · `start`/`reserve`/`buyout`/`step`, `durationMs`, `title`, `note`, `wants`, `minTopUp` |
| PUT `/v1/listings/:id` | reprice a fixed listing |
| POST `/v1/listings/:id/cancel · buy · bid · buyout · relist` | `buy` takes `expectedPrice`; `bid` takes `max` |
| POST `/v1/orders` · PUT `/v1/orders/:id` · POST `/v1/orders/:id/cancel` | `cardId`, `variantId`/`anyFinish`, `maxPrice`, `quantity`, `durationMs` |
| POST `/v1/offers` · POST `/v1/offers/:id/accept · decline · counter · withdraw` | `counter` takes `cash` or `refund` and a message |
| GET `/v1/sell/quote?ids=` · POST `/v1/sell` | `expectTotal` makes a changed quote an explicit `quote-changed` |
| GET `/v1/activity · /v1/history · /v1/trades · /v1/cards/:id/market · /v1/valuation` | the player's own state, receipts, public trades, one card's market |
| operator | GET `/v1/admin/reconcile`, POST `/v1/admin/repair · sweep · import/revoke` (`x-admin-token`; any other caller gets 404) |

Receipts carry an operation id (`trd_…`, `qs_…`), server timestamps and aliases. No response contains an account id, a session, another bidder's maximum, or an address.

## 5. Schema (migration `0003_trading.sql`, schema 3)

`_guard` (the rule names) · `listings` (rebuilt: `kind`, `status`, `ask`/`start_price`/`reserve`/`buyout`/`step`, `price`, `leader_id`, `bid_count`, `ends_at`, `first_ends_at`, `extensions`, `version`, the sold facts, an item snapshot) · `listing_items` · `bids` (`UNIQUE(listing_id, seq)`) · `bid_events` · `holds` (open holds unique per kind, ref and account) · `orders` · `order_fills` · `offers` · `offer_items` · `trades` · `redemptions`; `instances.escrow_ref`, `notifications.ref` and `price_observations.trade_id` are added. Indexes cover the feed (status and end, price, created), a seller's listings, a card's listings, a leader's auctions, open orders by card and price, offers by party, and trades by time, card and party.

## 6. Timing defaults

| Thing | Default | Limit |
|---|---|---|
| Auction | 24 h; presets 12 / 24 / 48 / 72 h | 1 h to 14 d (Advanced) |
| Fixed listing | 7 d | 1 h to 30 d |
| Swap listing | 5 d | 1 h to 30 d |
| Buy order | 3 d | 1 h to 30 d |
| Offer | 2 d after the last move | not after the listing ends |
| Anti-snipe | 5 min window, 5 min extension | 6 extensions |
| Quick Sell quote | stands 45 s; checked again at the sale | — |
| Idempotency record | 7 d | — |
| Poll while the Market is open | 6 s tick; listings and activity re-read when 8–12 s old | stops 90 s after last use |

## 7. Fee rounding (checked by tests for 1 to 5000 and the edge values)

| Price | Fee | Seller keeps |
|---|---|---|
| 1 | 1 | 0 |
| 24 / 49 | 1 | 23 / 48 |
| 74 | 1 | 73 |
| 75 | 2 | 73 |
| 124 | 2 | 122 |
| 125 | 3 | 122 |
| 1,000 | 20 | 980 |
| 99,999 | 2,000 | 97,999 |
| 100,000,000 (the price ceiling) | 2,000,000 | 98,000,000 |

## 8. The Quick Sell economy

Quote = `max(1, floor(clamp(Average Value, 0.4 x baseline, 1.5 x baseline) x 0.55))`, the offline game's rule. Limits per account per UTC day: 40 cards and 4,000 Credits; 250,000 Credits a day for the whole realm; 50 cards per request. They are tuning variables (`QS_CARDS_PER_DAY`, `QS_CREDITS_PER_DAY`, `QS_REALM_CREDITS_PER_DAY`), not code. [stage-5-economy.txt](stage-5-economy.txt) is the deterministic model. In short: Credits are created **only** by retiring a card at 55% of its value, so total issuance is bounded by the collections players convert; the 2% fee only removes Credits; the daily limits bound the rate. A median card quotes 8 Credits, a 100 card collection converts to about 1,900, and the 40 card limit (not the Credit limit) is what paces a newcomer: about 160–200 Credits on day one. That is enough for several listings at 10–25 Credits. The fee's one-Credit minimum makes very cheap sales dear (20% at 5 Credits); that is the offline rule, kept so both realms behave the same. An account with no online cards is told so and pointed to the one-time conversion; nothing is gifted.

**The abuse bound is stated, not hidden**: an edited save can claim up to 3,000 cards. The per-account limits, the per-origin-code claim, the per-address registration limit and the realm's daily total bound what that is worth, and `import/revoke` exists for a dispute. It is a beta risk, not a solved problem.

## 9. Evidence

| Check | Result |
|---|---|
| `npm run test:cloudflare` (api, economy, trading, races on the Workers runtime with local D1 and Durable Objects) | **54 / 54** |
| the proxy-bidding rules against 3,000 generated auctions (invariants: price never falls, never above the leader's maximum, ties to the earlier bid) | pass |
| **120 seeded race scenarios** (30 fixed, 40 auctions, 15 orders, 15 swaps, 20 same-card races), then `reconcile` after every 20 and at the end | pass; no problem, supply balanced, no hold left |
| `npm run check:market-trading` (three browser profiles, the real interface, a local Worker) | **10 / 10**: first Credits from Quick Sell, a fixed sale, an auction outbid then closed by the alarm, a swap with a counter, a buy order that fills, a listing made in the composer, reconciliation, phone width and saved monochrome |
| Regression: `test:market` 70/70, Stage 1–4 browser checks | pass |

The scenarios and tests cover: both buying the last listing at once; duplicate POST and retry (six at once); an auction ending exactly at the server deadline and a bid at the deadline refused; two bids at the same instant; equal maximums; a bid against a buyout, both orders; a queued or repeated settlement (alarm, two sweeps, two looks and a late bid at once); an expired reserve; cancel with and without bids; a refused transfer (damaged escrow) closing with nothing charged; a swap whose card is already locked elsewhere; bundle atomicity; forbidden operations by non-owners; negative, fractional, string and overflowing numbers; fee rounding; orphaned escrow repair; the stock-listing lock (a listed card cannot be listed, offered or sold twice); no self-trade; and a full ledger and escrow reconciliation.

Screenshots (`docs/market-beta/screenshots/trading-*.jpg`): the Quick Sell dialog and review, a fixed sale, the outbid auction, the swap offer and counter, the buy order dialog, the portfolio, phone width in monochrome.

**Deployment proof: not done.** `wrangler whoami` is unauthenticated; no staging resource exists; there is no live URL. The cross-account transaction above ran on the same Worker code locally. Marked as an open gate below.

## 10. Known limits and open gates

| Item | Status |
|---|---|
| Live staging transaction between two accounts | **not done**: needs the owner's Cloudflare sign-in, then `deploy.cjs --apply --verify` |
| D1 free-plan query budget (50 per invocation) | designed within it (a settle is about 25 queries); not measured on Cloudflare. `SWEEP_LIMIT` bounds the cron |
| Durable Object alarm timing in production | exact in the local runtime; Cloudflare's alarm precision and retry behavior not measured |
| Workers request limits on the free plan | not re-fetched in this stage |
| Server-side search and filters | the interface filters the open listings it holds (up to 500 newest); deep search is Stage 6 |
| Stock analytics, reputation, comments, uploads | Stages 6 and 7 |
| Turnstile on `file://` | still not built (Stage 4) |
| Forged imports | bounded, not prevented (section 8) |
| Counter negotiation changes Credits only | a different set of cards is a new offer |
