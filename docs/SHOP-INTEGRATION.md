# Daily Shop integration contract

October 13 follow-up: `src/data/settings-layout.js` adds three namespaced Shop preferences on the Gameplay page (`shopLayout`, `shopMotion`, `shopSort`). Preserve them when reconciling Market settings changes; no save-schema bump is required. Shop retries only the existing `C.state.save()` route after an explicit Retry save action. A rejected purchase remains rejected; no debit, mint, receipt or entitlement is replayed. Scene transitions are UI-only, feature detected, interruptible and sequenced after the durable purchase result. Current evidence is in [SHOP-CINEMA](SHOP-CINEMA.md).

The Shop is an offline NPC sale against the existing Credits balance and local collection. Stage 2 freezes four daily quotes; Stage 3 spends and delivers them. It has no Market, listing, trade-fee, top-up or network dependency.

## Saved shape and quote boundary

`src/data/shop.js` owns the local quote policy and permanent featured Titan Pack ID/price. `C.shopState.ensure()` persists a daily snapshot before it is shown. Its four card IDs, variants and safe integer prices are immutable until the next local day. `C.shopState.setValuationAdapter()` may provide a finite local baseline for **future** snapshots only; it never rewrites a saved quote and does not read `marketValueUsd`.

The optional `save.shop` field remains version 1 and requires no save-schema bump. It contains a 32-character seed, up to 32 daily snapshots, up to 64 typed receipts, and either one pending purchased-pack entitlement or `null`. A card receipt identifies its offer and minted instance. A pack receipt identifies the entitlement. Historical card IDs remain in frozen snapshots; an unavailable catalog card disables that offer rather than substituting another.

When the 64-receipt cap is reached, trimming preserves the receipt for an active unopened Titan entitlement and evicts an older non-active receipt. This keeps a long-held pack redeemable while later daily cards are bought.

History uses only that retained ledger; it is not an all-time transaction archive. Owned direct cards resolve by receipt `instanceId`, kept Titan results by saved `shopEntitlementId`, and ready/pending packs by the current entitlement or pending reveal. No outcome is inferred for an old kept Titan lacking provenance. The `inventory:showCard` bridge now forwards the requested instance into initial detail selection; missing explicit IDs do not fall back to another copy. Ordinary stack opening keeps its first-copy default. Reconcile the small `src/ui/inventory.js` and `src/ui/detail.js` changes at owner integration.

## Card purchase

`C.shopPurchase.buyCard(expected)` checks the live local day, exact saved offer identity, card/variant/skin and integer quote, purchased flag, wallet, save readiness, opening state and serial capacity. The candidate applies one `C.currency.applyInto` debit, allocates one serial and instance ID, records `source:'shop'` with `packId:null`, marks the slot purchased, and appends a receipt. The journal and inventory focus key are prepared on that same candidate. `C.state.commit` makes the complete candidate durable before any wallet or Shop event is emitted. A failed write leaves the live save untouched. Repeated calls find the purchased slot or receipt and cannot grant a second card.

## Titan purchase and redemption

`C.shopPurchase.buyTitan()` debits the permanent 7,600-Credit quote and persists one entitlement plus receipt in a single candidate. The UI offers `Open Titan Pack` while that entitlement exists; a second purchase waits until the first pack is opened. This policy is visible in the showroom.

The entitlement is ahead of the natural queue only for preview and opening selection. It is not timer stock. `src/ui/opening.js` enters the existing charge, registered `shroudDial` cut, cinematic and reveal for the real `titan` pack. At the random-outcome commit, it clears the entitlement and writes `pendingReveal.source:'shop'` with the entitlement ID and reserved card in one durable save. Keep then moves that exact reserved instance into inventory. A failed reservation write retains the entitlement; a reload after reservation resumes the same card. Purchased opening neither consumes natural stock nor increments natural pack counters, and it does not award `packOpenReward` Credits. Natural openings retain their current reward behavior on this branch; a separate Market change may later alter that global rule.

The purchased Titan card now carries `source:'shop-pack'` and `shopEntitlementId` from reservation through Keep. The ordinary `packId:'titan'` remains authentic. This provenance is local collection metadata, not online ownership. Stage 3 pending reservations that lack those fields are normalized from their durable pending entitlement during load. Already kept Stage 3 cards without the fields retain their historic pack identity; the receipt does not contain a card instance ID, so no speculative retroactive attribution is made.

## Recovery and compatibility

`C.state.validate` normalizes optional Shop state and rejects malformed entitlements, receipts or overlapping entitlement/reveal states. Imports use the existing strict save path; restore uses the normal local backup path. Older saves create `shop` when the Shop first opens. New daily snapshots save before they appear. If storage cannot write, purchase controls disable and the previous durable state remains available for recovery. Clock changes are a local convenience boundary, not anti-tamper protection.

There is no local quick-sell payout in this branch, so the Shop cannot form a buy/resell Credits loop. Shop instances are local collection records; any future transfer policy belongs to Market. See [Stage 3 evidence](SHOP-STAGE-3.md) for interruption and UI checks.

The Shop purchase candidate uses normal loaded-save validation, allowing historic inventory whose catalog IDs were later retired while still checking the newly sold offer against the live catalog. Its single durable commit and exact-offer checks are unchanged. The menu entry, command palette action, Shop Help and `Cardable.ui.present` return focus form the navigation route. See [Stage 4 acceptance](SHOP-ACCEPTANCE.md) and the [Market merge map](SHOP-MARKET-INTEGRATION.md) before integration.
