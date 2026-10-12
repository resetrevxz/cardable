# Cardable Market Beta 1.0.0 — Stage 3 acceptance report: card values and Credits

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge to `main`, no GitHub Release, no live-site change, no Cloudflare, no desktop delivery.

Stage 3 changes where Credits come from and gives every card an honest value. Opening a pack no longer pays. Credits come from **selling cards**: to the system at a visible, lower Quick Sell price, in bulk through a review workspace, or to other traders on the Market. Every card has an Average Value with its basis stated; every sale is one durable write with a receipt and a ledger entry; the wallet separates what you hold from what your cards are estimated to be worth.

## 1. What changed

| Area | Change |
|---|---|
| Pack reward | `config.currency.packOpenReward` is `0`. The opening commit issues no Credits and shows no reward. Saved Credits and their ledger history are untouched; there is no clawback and no backfill. |
| Reveal | **Keep** or **Sell**. The button states its price (`Sell · 23`). Selling resolves the reserved card and issues its Quick Sell Credits in the same durable write as the decision. |
| Sell this copy | The old "Delete a copy" dialog is now the Sell dialog: exact copy chooser with each price, the quote first, why it is what it is, a stale quote is refused and re-shown, hold or typed-name confirmation as before, **List on the Market instead**, and a receipt with a 10 second Undo while it is still reversible. |
| Bulk Sell | A review workspace (command palette, inventory More menu, wallet): presets, keep N of each, rarity ceiling, finishes and skins off by default, collections and wishlists kept by default, value range, order, "only what my inventory is showing", every exact copy with a checkbox, a virtualized list, one hold, one commit, result with Undo and receipt. |
| Receipts and ledger | `save.market.sales` (newest 40, up to 25 items each) and richer `save.wallet.log` entries (receipt reference, balance after, realm). `C.currency.audit` verifies the chain. |
| Values | `C.valuation`: baseline, Average Value, last sale, bid, ask, Target Buy and Sell, volume, liquidity, volatility, confidence, 24 h, 7 d, 30 d, 90 d and all-time change, and listing guidance. One answer for the whole game. |
| Surfaces | Inventory tile caption (`≈ 23`), detail callouts (Average Value, basis, 7 day change, Quick Sell pays), sort by Average Value or 7 day change, search `value:>=40`, filter by estimated value, wallet popover with three numbers, Portfolio "If sold to the system", composer price analysis. |
| Text | Help, player help, the key-action name and the confirm setting say Sell; docs and Designs are updated. |

## 2. The money rules

### 2.1 Quick Sell

`quote = max(minPrice, floor(clamp(AverageValue, 0.4 × baseline, 1.5 × baseline) × factor))` with `factor = 0.55`, all in `src/data/market-config.js` (`quickSell`): `factor`, `tierFactor` (per rarity id, empty), `ceilingOverBaseline`, `floorUnderBaseline`, `minPrice`, `quoteTtlMs`, `undoMs`, `receiptsKept`, `receiptItemsKept`.

- **Why a band:** a thin market, or one aggressive ask or bid, cannot move a quote outside it. The Average Value is already a weighted, outlier-clamped, baseline-anchored mean (Stage 2); the band is a second guard that makes the quote independent of any single self-trade.
- **Rounding:** down, so the system never rounds in the player's favour; never below 1 Credit.
- **It is not a trade.** A Quick Sell never enters the Simulation's trade list, volume, observations or Average Value (unit test compares the world before and after). It is not a seller's listing either: there is no "system seller" in the Market.
- **Quote expiry:** a quote shown is good for 45 s. The sale call carries the total that was shown and its expiry; a changed total or an expired quote is refused before anything changes, and the dialog shows the new price.

### 2.2 Market fee

2% half-up, at least 1 Credit, taken from the **seller's proceeds exactly once** on a completed Credit sale (`core.feeFor`). Cancelled bids, withdrawn listings and Quick Sell pay no fee. Table verified: 1→1, 24→1, 49→1, 75→2, 124→2, 125→3, 1000→20, 99999→2000; `price − fee` is always an integer. A completed simulated sale writes one trade with one fee and the player gets the net (test).

### 2.3 The ledger

Each `save.wallet.log` entry is `{ at, delta, reason, ref?, balance?, realm? }`. New reasons: `quick sell`, `bulk sell`, `sale undo`. `ref` is the receipt id, `balance` the balance after the entry, `realm` is `local` (the offline wallet; a global realm will have its own server ledger). `audit(save, realm)`: each entry's `balance − delta` must equal the next older entry's `balance`; entries from before balances existed are skipped, never guessed; a negative balance or a latest balance that differs from the wallet is a problem. The log still keeps 200 entries and daily earned and spent totals are unchanged.

### 2.4 Exactly once

| Event | Guarantee |
|---|---|
| Single or bulk sale | One candidate save: remove the exact instances, `applyInto(+total)`, append the receipt. `C.state.validate` then `C.state.commit`. If either fails nothing changed (unit tests: failed commit, out-of-range balance). |
| Sale at the reveal | The same candidate also advances `keptCount` and `discardedInstanceIds`. Reload with the decision pending pays nothing; reload after pays once. |
| Repeat | The copy is gone, so a repeated call finds nothing to sell (test). |
| Two copies of one card | Only the chosen instance leaves; the other copy and its serial stay. |
| Protected copies | Favorite (stack-level), locked and Market-listed copies are refused with the reason; in a bulk set they are skipped and reported, deterministically, in the order given. |
| Undo | Restores the exact instances to their positions and takes the same Credits back, only inside 10 s, only for the same save, only while the Credits are not spent or held (test). |

## 3. Valuation

### 3.1 Terms (also in the Market glossary)

| Term | Meaning | Source |
|---|---|---|
| Baseline | The value before anyone has traded the card | `core.buildCardIndex` (rarity base × per-GPU spec percentile) × finish class factor × skin factor × bounded serial factor |
| Average Value | Weighted, trimmed mean of executed trades, pulled toward the baseline by a prior of weight 6 | Simulation world; baseline when no world or no trades |
| Last sale, volume, 24 h and 7 d change | Executed trades only | world trades |
| 30 d, 90 d, all-time change | Daily closes, which outlive trimmed trades | `world.daily` |
| Best bid, lowest ask | The open buy order and cheapest listing; otherwise an estimate and labelled so | world orders, listings |
| Target Buy, Target Sell | From the spread (open order and listing when both exist, else the rarity's modelled spread) | `core.targets` |
| Confidence | none, low (1 or more recent trades), medium (4), high (12) | `valuation.minForMedium`, `minForHigh` |
| Quick Sell | See 2.1 | `C.sales.quote` |

Finish and skin multipliers, per-rarity bases and the serial bonus (low serials up to +30%, round numbers +6%, bounded 0.92 to 1.35) live in `market-config.js`, not in markup. Tests cover every card in the catalog, every finish class, a skin, a low serial against a plain one, and a legacy instance with no finish or skin property.

### 3.2 No invented history

- A card nobody traded is valued at its baseline, confidence *Not enough data*, change *No sales yet*. Charts draw nothing for a window without trades.
- Changes are `null` when there is no reference trade near the start of the window (a reference far older than the window is not a 24 h change). 90 d needs a day that old.
- Sample listings and fixtures from Stage 1 exist only for the Global realm's developer preview (`?dev=1`); in play an unconnected Global Market is empty and says so.

### 3.3 Price guidance

For the chosen card, three listing modes with the ask, what you receive after the fee, the difference from Average Value and a typical time to sell, plus a realistic range to buy in, the resale margin after the fee, the spread and its source, liquidity and confidence in words:

- *Sell quickly*, *Fair listing*, *Wait for more* use `suggestedAsk` (below fair by half the spread plus 4%, at fair, above by half the spread plus 5%).
- **Time to sell** exists only with 2 or more trades of the exact card in 7 days: the mean gap between trades (`168 / volume7d` hours) times 0.5, 1 and 2.4. Otherwise it says *insufficient sales*.
- **Worth buying at** is 96% to 100% of Target Buy; **Resale after the fee** is Target Sell less its fee less that buy price.

## 4. Balance

`tools/economy-experiment.cjs` (seeded, shipped catalog and rarity odds). Provisional; Stage 5 revisits it with real online play.

| Question | Result |
|---|---|
| What does a pack pay when every card is Quick Sold? | Mean **32.5**, median **8**, p10 4, p90 48, p99 512, max 4,098; mean Average Value 59.9, so Quick Sell paid 54.3% of it. Rare finds carry the income (mythical 17%, legendary 12%). |
| New player, selling only what they open, 4 packs a day (2 to start): when can they afford each cinematic unlock (10 to 1,000 Credits)? | Basic day 0, Rare day 1, Legendary day 1 (p90 day 3), Mythical day 2, Exotic day 3, Ascendant day 4, Secret day 8 (p90 day 16). |
| Is there a loop that turns Credits into more Credits (buy a listing, Quick Sell it)? | **None.** 1,614 listing observations over 30 simulated days: 0 where Quick Sell paid more than the ask (best −3). 864 executed trades: Quick Selling the card for the price it traded would lose at least 1 Credit every time. |
| Quick Sell against selling on the market | About 55% to 56% of what the market leaves after the 2% fee, at every rarity. |
| Market inflation | New Credits enter by Quick Sell only (bounded by the pack timer: at most 12 packs a day, about 390 Credits a day at the mean) and by bots' bounded allowance (Stage 2). Credits leave through market fees and cinematic purchases. |
| Bot bankruptcies | 0 poor bots in the 30 and 90 day seeded runs of Stage 2; selling to the system does not touch bots. |

Choice of 0.55: the cinematic prices (10 to 1,000) were set for $200 a pack, but they are the same scale as card values (basic 10, secret 9,000), so a small number of cards buys any of them; 55% leaves every market route clearly better (a fair listing nets 98%) without making Quick Sell useless to a new player (the median pack pays 8, the first unlock is within the first pack). Raising it toward 70% would make a day-one player's progress faster; lowering toward 40% would make the Market the only sensible route. Both are one number.

## 5. Old saves

- No save schema bump (`schemaVersion` unchanged). `save.market` is optional and normalized: `receipts` (Stage 2), `secret` (Stage 2 signing) and the new `sales`.
- Wallet log entries from before this stage have no `ref`, `balance` or `realm`; they are kept as they are and the audit skips them. Existing `pack opening` entries stay valid reasons.
- A save that was mid-reveal when updated keeps its pending reveal: Keep and Sell are offered, and nothing is paid on resolving.
- Credits already earned are the player's. Nothing is recalculated.
- Mini mode keeps its Keep-all flow; it never sold or deleted.
- The picker pack's `unpickedRefund` is `0`, so no reward exists there.

## 6. Verification

| Check | Result |
|---|---|
| `tests/market-sales.test.cjs` (new) | 18 of 18 pass: baseline for every card, finish classes, serial bounds, legacy instance, quote formula and band, one commit with receipt and ledger entry, interrupted save, repeated request, out-of-range balance, protected copies, stale and expired quotes, undo and spent Credits, ledger audit, Bulk Sell planning and presets, 1,200 copies in one commit, Quick Sell never a trade, fee table, pack reward zero with history kept |
| `tests/market-sim-provider.test.cjs` | 8 of 8 (two new: 24 h and 7 d change and volume counting, 30 d, 90 d and all-time from daily rows) |
| `tests/market-core.test.cjs`, `tests/market-sim.test.cjs` | 22 and 22 pass |
| `tools/check-market-economy-browser.cjs` (new) | 13 of 13 steps in headless Chromium from `file://` (below) |
| `tools/check-market-sim-browser.cjs` | 18 of 18 (Stage 2, unchanged behaviour) |
| `tools/check-market-browser.cjs --quick` | Passes (Stage 1 sample interface) |
| `node scripts/check-data.js`, `tools/verify-assets.cjs` | Pass (381 entries; 205 scripts and 56 stylesheets exist) |
| Existing dev checks (`?dev=1`) and `tools/test-electron.cjs` | See section 8 |

### Browser journeys (`qa-output/market-beta/stage-3`, curated copy in `docs/market-beta/screenshots/stage-3/`)

1. **Opening a pack pays nothing** and writes no ledger entry; the pack is consumed once.
2. The reveal shows **Keep** and **Sell · N**; a reload with the decision pending issues nothing.
3. **Sell at the reveal:** Credits rose by exactly the quote, the card never joined the collection, one receipt and one ledger entry, correct after reload, audit consistent.
4. **Keep** still adds the card and pays nothing.
5. **Wallet** shows balance, collection estimate and Quick Sell value with their meanings.
6. **Sell this copy:** price first, exact copy, sold for the quoted price, Undo restores the same instances and Credits.
7. **Bulk Sell:** previews exact copies; favorites and finishes are protected; one copy removed from the offer; one 2.4 s hold; one receipt and one ledger entry; Undo; audit consistent.
8. **Receipts** list what was sold and the ledger reads consistent.
9. **Inventory:** tiles show `≈ value`; sort by Average Value (both ways) and by 7 day change; `value:>=40`; value range filter; a malformed `value:` token is explained.
10. **Market:** Portfolio shows collection value and "If sold to the system" apart; the composer's price analysis lists the three modes, the buy range and the resale margin.
11. **Existing spending:** a cinematic unlock charges its price once, refuses when short, and the second call charges nothing.
12. **Phone width (390), saved monochrome, Very Low and High quality:** Bulk Sell and Sell stay inside the window with their controls reachable.
13. No console error, no page error and no non-local network request.

### Performance (Node, one desktop CPU; not a hardware measurement)

| Measure | Value |
|---|---|
| Plan Bulk Sell over 3,000 copies | about 27 ms |
| Value 3,000 copies (cached per stamp) | about 13 ms |
| Sell 500 copies in one commit | about 10 ms of logic plus one save write |
| Largest receipt kept | 25 item lines and a count; 40 receipts about 2.4 KB each at most |
| Bulk Sell list | virtualized: about 20 rows exist whatever the offer size |

## 7. Known limitations

- **No checkboxes on the main inventory shelf or grid.** Selling in volume is a separate review workspace (Bulk Sell) that can be limited to what the inventory is showing. A multi-select mode inside the shelf and its gestures is a larger inventory change that was not made.
- **Quick Sell is local.** The Global Market does not have it yet; its provider write answers *preview only*. See section 9 for the contract.
- **The Simulation's Average Value is the only market signal.** With no Simulation world (the Market never opened) values are baselines, and say so. The first time the Market opens, values may shift as trades appear.
- **Slow drift.** Prices settle about 4% under baseline and drift down slowly as supply grows (Stage 2 experiments); Quick Sell follows. It is bounded by the 0.4× floor.
- **Mini mode** cannot sell. **Patch notes** are not edited for this unreleased stage; the release stage writes them. Historical notes that say "Delete" or "+$200" stay as history.
- **Not checked:** low-end hardware, assistive-technology runs of the new dialogs (names, roles and keyboard paths were checked mechanically), the installer and the packaged build.

## 8. Electron and the existing checks

One-off run of the real Electron app from this worktree (temporary profile, a real window, once for this milestone; `tools/test-electron.cjs` was not repeated):

- Opening a pack: Credits 50 before and 50 at the reveal, no ledger entry; the button read `Sell · 17`.
- Pressing Sell: Credits 67 (+17, the quote), the card never joined the collection (42 cards), one receipt, one ledger entry naming it with balance 67, audit consistent, no page or console error.
- Quit and relaunch with the same profile: Credits 67, 42 cards, no pending reveal, the receipt still listed (`reveal`, 17, 1 card), and Bulk Sell opens.

The existing `?dev=1` checks give the same results as the committed `main` (same pre-existing failures: controls "Existing defaults remain familiar", and the stability, QoL and visual checks that need prepared state).

## 9. Server ownership contract for Stage 4 and 5

Online Quick Sell must be server authoritative. Nothing here is built; this is the contract the client already respects.

- **The client never states a price.** A request carries only instance ids and a request id. The server computes the quote from its own valuation of authenticated player trades (never from the client, never from simulation data).
- **Idempotency:** the request id is the receipt id. The same id returns the first answer.
- **One transaction** retires the exact instances (state `redeemed`, never listed or reserved), appends one immutable ledger entry per receipt (`delta`, `reason: quick-sell`, `ref`, balance after), and stores the receipt. A listed, reserved or already redeemed instance is refused whole.
- **Not a trade:** it is excluded from sale volume, last sale, Average Value, seller reputation and every public feed. It has no counterparty and shows no alias.
- **Quota:** per-account and per-time limits with the remaining allowance returned with each quote; the quote has an expiry and a total the client echoes, exactly as here.
- **Ledger:** realm `global` is a separate server ledger; the client's `local` ledger is never merged with it.
- **Receipt shape:** the client's `{ id, at, kind, realm, count, total, fair, items: [{ i, c, v, k, s, p, f }] }` is the shape the server returns, so the same receipts view renders either.

## 10. Source-contract deviations

- "Retain a genuine discard path only if necessary": none is retained. Every removal is a sale at a stated price or an explicit protected-card refusal; the old `card:deleted` event is still emitted for listeners that rebuild from the collection, with `source: 'sale'`.
- "Seed demo fixtures only within developer mode": the Stage 1 sample listings now require `?dev=1`.
- The multi-select the brief asks for is Bulk Sell's own list rather than the shelf (section 7).
