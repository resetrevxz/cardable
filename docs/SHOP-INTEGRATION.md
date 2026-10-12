# Daily Shop integration contract

The Shop is an offline NPC sale against the existing Credits balance and local collection. Stage 2 freezes four daily quotes; Stage 3 spends and delivers them. It has no Market, listing, trade-fee, top-up or network dependency.

## Saved shape and quote boundary

`src/data/shop.js` owns the local quote policy and permanent featured Titan Pack ID/price. `C.shopState.ensure()` persists a daily snapshot before it is shown. Its four card IDs, variants and safe integer prices are immutable until the next local day. `C.shopState.setValuationAdapter()` may provide a finite local baseline for **future** snapshots only; it never rewrites a saved quote and does not read `marketValueUsd`.

The optional `save.shop` field remains version 1 and requires no save-schema bump. It contains a 32-character seed, up to 32 daily snapshots, up to 64 typed receipts, and either one pending purchased-pack entitlement or `null`. A card receipt identifies its offer and minted instance. A pack receipt identifies the entitlement. Historical card IDs remain in frozen snapshots; an unavailable catalog card disables that offer rather than substituting another.

## Card purchase

`C.shopPurchase.buyCard(expected)` checks the live local day, exact saved offer identity, card/variant/skin and integer quote, purchased flag, wallet, save readiness, opening state and serial capacity. The candidate applies one `C.currency.applyInto` debit, allocates one serial and instance ID, records `source:'shop'` with `packId:null`, marks the slot purchased, and appends a receipt. The journal and inventory focus key are prepared on that same candidate. `C.state.commit` makes the complete candidate durable before any wallet or Shop event is emitted. A failed write leaves the live save untouched. Repeated calls find the purchased slot or receipt and cannot grant a second card.

## Titan purchase and redemption

`C.shopPurchase.buyTitan()` debits the permanent 7,600-Credit quote and persists one entitlement plus receipt in a single candidate. The UI offers `Open Titan Pack` while that entitlement exists; a second purchase waits until the first pack is opened. This policy is visible in the showroom.

The entitlement is ahead of the natural queue only for preview and opening selection. It is not timer stock. `src/ui/opening.js` enters the existing charge, registered `shroudDial` cut, cinematic and reveal for the real `titan` pack. At the random-outcome commit, it clears the entitlement and writes `pendingReveal.source:'shop'` with the entitlement ID and reserved card in one durable save. Keep then moves that exact reserved instance into inventory. A failed reservation write retains the entitlement; a reload after reservation resumes the same card. Purchased opening neither consumes natural stock nor increments natural pack counters, and it does not award `packOpenReward` Credits. Natural openings retain their current reward behavior on this branch; a separate Market change may later alter that global rule.

## Recovery and compatibility

`C.state.validate` normalizes optional Shop state and rejects malformed entitlements, receipts or overlapping entitlement/reveal states. Imports use the existing strict save path; restore uses the normal local backup path. Older saves create `shop` when the Shop first opens. New daily snapshots save before they appear. If storage cannot write, purchase controls disable and the previous durable state remains available for recovery. Clock changes are a local convenience boundary, not anti-tamper protection.

There is no local quick-sell payout in this branch, so the Shop cannot form a buy/resell Credits loop. Shop instances are local collection records; any future transfer policy belongs to Market. See [Stage 3 evidence](SHOP-STAGE-3.md) for interruption and UI checks.
