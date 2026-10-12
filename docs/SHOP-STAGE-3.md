# Daily Shop — Stage 3 acceptance

Date: 2026-10-13. Worktree: `D:/CardableV2/Shop`; branch: `feature/daily-shop`. This stage implements purchases and ownership. It does not start Stage 4 or integrate the separate Market worktree.

## Transactional ordering

1. The displayed daily card is a saved offer with immutable `dayKey`, offer/card/variant/skin IDs and integer Credits price. Hold lasts 1.4 seconds. The confirmation callback reads the saved offer again, checks the current local day immediately before the write, and rejects a stale quote, bought slot, pending reveal, unsupported data, insufficient wallet, unavailable storage, serial exhaustion or invalid save.
2. One candidate cloned from the live save receives the existing wallet debit, one unique serialed card instance with `source:'shop'`, one purchased flag, one typed receipt, journal acquisition and inventory focus key. `C.state.commit` writes this candidate once; only after success do UI/wallet events fire. On failure, neither Credits nor ownership changes in memory or durable storage. Repeated callbacks hit the purchased flag or receipt.
3. The featured Titan purchase uses the same one-write debit but records one pending `titan` entitlement and its receipt. Another purchase waits until it is redeemed. The entitlement is previewed before the natural queue without changing timer stock or Rare cadence. The real charge and `shroudDial` opening reserve a Titan pool outcome in `pendingReveal` while clearing the entitlement in one write. A failed reservation retains the entitlement. Once reserved, reload resumes the same card and Keep moves that one instance into inventory. The purchased branch does not award the normal 200-Credit pack-open reward; ordinary pack behavior on this branch is unchanged.

Receipts retain at most 64 typed records. The Shop never assigns a serial during preview. A direct Shop card has no fabricated pack provenance; inventory tags describe it as acquired from the local Shop. Shop cards remain local collection records. There is no quick-sell payout in this branch, so no immediate buy/resell Credits loop. The 2% player-trade fee belongs to the separate Market and is not charged here.

## Runtime evidence

All browser runs below used isolated Chromium profiles against the local `file://` entry, with no network or shared player save. The test scripts set up their own Credits and fixtures; mouse and keyboard calls exercise the rendered controls, while touch is Chromium touch emulation. Simulated errors and clock boundaries are labeled as such.

| Check | Evidence | Result |
| --- | --- | --- |
| Direct card ownership | `tools/check-shop-stage3.cjs`: exact quote/debit, serial, variant, instance, receipt, purchased slot, reload, inventory handoff, no stock/open count change | Pass |
| Hold interruptions and repeated UI purchase | Same script: early release, pointer exit/cancel, blur, simulated hidden document, switch selected offer, repeated Space, then completed Space and Enter holds on two different offers; returning from the first receipt unlocks the next offer | Pass |
| Money, save and natural pack edges | `tools/check-shop-stage3-edge.cjs`: zero Credits, exact funds, simulated write failure and recovery, repeat intent, import/restore/export, full serial counter, simulated midnight during validation, malformed Shop save, preowned duplicate copy; natural pack still consumes one stock, advances counters and pays its current 200 Credits | Pass |
| Titan purchase and opening | `tools/check-shop-stage3-titan.cjs`: zero natural stock, durable entitlement, reload before opening and during charge, simulated reservation write failure, full charge, registered three-latch `shroudDial`, reveal interruption, reload to same pending card, Keep, reload after Keep, next featured purchase | Pass |
| Titan graphics routes | Same lifecycle script at Low, Medium, High, and Very Low with reduced motion; screenshots at the actual vault cut | Pass in headless Chromium |
| Presentation and touch | `tools/check-shop-stage3-visual.cjs`: 1920×1080 mono/Very Low, 390×844 mono/Very Low, sheet close mid-hold, simulated Shop write failure, Chromium touch long press, receipt, purchased slot/copy count, no horizontal sheet overflow | Pass |

Visual captures reviewed: [1366 ready](../artifacts/shop-stage3-desktop-ready.png), [card acquired](../artifacts/shop-stage3-card-acquired.png), [1920 mono/Very Low](../artifacts/shop-stage3-1920-mono-very-low.png), [390 Shop](../artifacts/shop-stage3-390-mono-very-low.png), [390 offers](../artifacts/shop-stage3-390-offers.png), [390 acquired](../artifacts/shop-stage3-390-acquired.png), [write failure](../artifacts/shop-stage3-write-failure.png), and Titan vault [Low](../artifacts/shop-stage3-titan-vault-low.png), [Medium](../artifacts/shop-stage3-titan-vault-medium.png), [High](../artifacts/shop-stage3-titan-vault-high.png), [Very Low/reduced](../artifacts/shop-stage3-titan-vault-very-low-reduced.png). These are test captures, not physical-device measurements.

## Remaining acceptance and merge boundary

Stage 4 owns broad visual, accessibility and existing-game regression acceptance, full packaging verification, and the Market merge handoff. This stage verified the local browser route and interruption boundaries; physical touch hardware, Windows installer launch, GPU/frame profiling, and a live system clock/timezone change were not measured. The Shop intentionally leaves `C.config.currency.packOpenReward` at 200 for natural packs. The Market branch may remove that reward and change wallet adapters, so reconcile those files during owner-approved integration. No push, merge, release or deployment was performed in Stage 3.
