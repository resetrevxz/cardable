# Daily Shop integration contract

Stage 2 owns the local rotation and quote snapshot. Stage 3 will own spending and delivery. This document describes the boundary exposed by `C.shopState` without adding a Market dependency.

## Source and saved shape

`src/data/shop.js` contains the featured Titan Pack ID/quote, offer count, retention limits and local Credits pricing policy. `src/core/shop-state.js` exposes `dayKey`, `eligible`, `pools`, `odds`, `quote`, `generate`, `normalize`, `ensure` and `setValuationAdapter`. UI calls `ensure()` and reads its returned **copy** of the saved daily snapshot. It never edits an offer in place.

The optional `save.shop` field has no schema bump:

```json
{
  "version": 1,
  "seed": "32 hexadecimal digits",
  "days": [{
    "dayKey": "YYYY-MM-DD", "version": 1, "status": "ready",
    "offers": [{ "offerId": "YYYY-MM-DD:01:card-id", "cardId": "card-id",
      "variantId": null, "cardSkinId": null, "price": 1150, "purchased": false }]
  }],
  "receipts": []
}
```

`days` retains at most 32 snapshots; `receipts` reserves at most 64 minimal entries `{offerId, at, price}` for Stage 3. The exact four IDs, variants and integer quotes are frozen when the new day is committed. A purchase may only change a slot's `purchased` value and add a receipt in the **same durable candidate transaction** that debits Credits and grants the card. This stage never performs that transaction. Historical card IDs remain in snapshots even if a later catalog removes them; the UI shows an unavailable slot and does not substitute another card.

## Pricing and future valuation

`C.data.shop.baseByRarity` is the local baseline. `C.shopState.quote(card, variantId, policy)` calculates the quote from that baseline, an optional positive `card.shopPriceMultiplier`, the convenience multiplier and the actual variant premium, rounded up to the configured step. The Shop never reads `marketValueUsd`. All inputs and output must be finite safe Credits integers inside policy bounds.

A future local valuation provider may call `C.shopState.setValuationAdapter({ localBaseline(card, defaultBase) { ... } })`. It must synchronously return a finite positive **local** baseline or `null` to use the default. Registration affects only subsequently generated days. Existing saved quotes remain authoritative and cannot be recalculated by the adapter. No adapter object, market series, online field or live quote is written into `save.shop`. Pass `null` to remove the adapter. Market code may read this local policy, but Shop does not call or import Market code.

## Stage 3 transaction handoff

Before charging, compare the transaction's `offerId` and `dayKey` with a fresh local day key and the **committed** snapshot. If midnight occurred during a hold, reject the stale intent with an expired notice, then advance the rotation separately. Use a cloned save candidate; check exact `offerId`, `purchased === false`, supported `cardId`/`variantId`, safe quote and available Credits. In one `C.state.commit(candidate)` write, apply the debit through `C.currency.applyInto(candidate, -offer.price, 'shop')`, mint one instance with the saved variant and Shop provenance, mark the slot purchased, and append a bounded receipt. No serial is allocated in Stage 2. If the commit fails, leave the live save and UI unchanged. Repeated confirmation or reload must find `purchased === true` and cannot mint a second copy.

Featured Titan Pack is a separate, permanent offer. Stage 3 must use the registered `titan` pack and its opening/entitlement pipeline without consuming ordinary stock or the scheduled Rare cadence. It must not grant the ordinary pack-open Credits reward. This document does not reserve or grant a pack.

## Recovery boundaries

`C.state.validate` normalizes optional `shop` on load/import. Malformed Shop state fails closed into the existing save recovery flow; it is not silently wiped or rerolled. Older saves without `shop` create it on first Shop entry. `ensure()` commits before showing a new lineup. If storage is unavailable or the commit fails, the UI shows a retryable error and retains the previous durable state. Clock reversal finds a retained day by key; older days regenerate deterministically from the persisted seed, subject to later catalog/pricing policy updates. This is local convenience behavior, not clock tamper protection.
