/* Shop transactions: one candidate, one durable save, then presentation events. */
(function (C) {
  'use strict';
  function fail(code, message) { return { ok: false, code: code, message: message }; }
  function gate() {
    if (!C.state.current || C.bootFailure || C.state.recovery && C.state.recovery.pending)
      return fail('recovery', 'Finish save recovery before purchasing.');
    if (!C.state.persistenceAvailable || !C.state.lastWriteSucceeded)
      return fail('storage', 'Save storage is unavailable. Check Settings → Data and retry.');
    if (C.state.current.pendingReveal || C.opening && C.opening.phase !== 'idle')
      return fail('pending', 'Finish the current pack reveal before purchasing.');
    return null;
  }
  function shopOf(save) {
    try { return C.shopState.normalize(save.shop); } catch (_) { return null; }
  }
  function addReceipt(shop, receipt) {
    if (shop.receipts.some(function (row) { return row.receiptId === receipt.receiptId; })) throw new Error('Repeated Shop receipt');
    shop.receipts.unshift(receipt);
    while (shop.receipts.length > C.data.shop.retainedReceipts) {
      var last = shop.receipts.length - 1;
      if (shop.entitlement && shop.receipts[last].entitlementId === shop.entitlement.entitlementId) last--;
      shop.receipts.splice(last, 1);
    }
  }
  function commit(candidate, before, event, expectedDay) {
    // Match normal loaded-save validation: historical inventory may contain a
    // catalog ID that is no longer published, while the new offer is checked
    // against the current catalog in buyCard.
    try { candidate = C.state.validate(candidate, false); }
    catch (error) { return fail('invalid', 'Save or item data is inconsistent: ' + error.message); }
    if (expectedDay && C.shopState.dayKey(C.clock.now()) !== expectedDay)
      return fail('expired', 'This offer expired before it could be saved. Return to today’s offers.');
    if (!C.state.commit(candidate)) return fail('write', 'Could not save the purchase. No Credits were spent and no item was added.');
    C.currency.notify(before, 'shop');
    C.events.notify('shop:purchased', event);
    return Object.assign({ ok: true, balance: candidate.currency }, event);
  }
  function buyCard(expected) {
    var blocked = gate(); if (blocked) return blocked;
    var now = C.clock.now(), key = C.shopState.dayKey(now), save = C.state.current;
    if (!expected || typeof expected.offerId !== 'string' || expected.dayKey !== key)
      return fail('expired', 'This offer expired. Return to today’s offers.');
    var shop = shopOf(save);
    if (!shop) return fail('invalid', 'Saved Shop data is inconsistent. Restore a valid save before purchasing.');
    var day = shop.days.find(function (row) { return row.dayKey === key; });
    if (!day || day.status !== 'ready') return fail('expired', 'Today’s saved offers are unavailable. Reopen the Shop.');
    var offer = day.offers.find(function (row) { return row.offerId === expected.offerId; });
    if (!offer || offer.cardId !== expected.cardId || offer.variantId !== expected.variantId ||
        offer.cardSkinId !== expected.cardSkinId || offer.price !== expected.price)
      return fail('expired', 'This offer changed. Return to today’s offers.');
    if (offer.purchased || shop.receipts.some(function (row) { return row.offerId === offer.offerId; }))
      return fail('purchased', 'This daily offer has already been purchased.');
    var card = C.card(offer.cardId), rarity = card && C.rarity(card.rarity);
    if (!C.shopState.eligible(card, rarity) || offer.cardSkinId !== null ||
        offer.variantId !== null && !C.variant(offer.variantId))
      return fail('unsupported', 'This card or finish is no longer available.');
    if (!Number.isSafeInteger(offer.price) || offer.price <= 0) return fail('invalid', 'This Shop quote is invalid.');
    if (save.currency < offer.price) return fail('funds', 'Not enough Credits for this card.');
    if (!Number.isSafeInteger(save.serialCounter + 1)) return fail('capacity', 'The card serial counter is full.');
    var candidate = JSON.parse(C.state.encode(save)), target = candidate.shop.days.find(function (row) { return row.dayKey === key; })
      .offers.find(function (row) { return row.offerId === offer.offerId; });
    var instanceId = C.randomId('card');
    if (candidate.inventory.some(function (item) { return item.instanceId === instanceId; }) ||
        candidate.pendingReveal && candidate.pendingReveal.cards.some(function (item) { return item.instanceId === instanceId; }))
      return fail('capacity', 'Could not allocate a unique card ID. Please retry.');
    var before = candidate.currency;
    try {
      C.currency.applyInto(candidate, -offer.price, 'shop', now);
      candidate.serialCounter += 1;
      var instance = { instanceId: instanceId, packId: null, source: 'shop', shopOfferId: offer.offerId,
        cardSkinId: null, cardId: offer.cardId, variantId: offer.variantId,
        serial: C.serial.format(candidate.playerCode, candidate.serialCounter), pulledAt: now, seen: false };
      candidate.inventory.push(instance);
      candidate.inventoryUi.pendingFocusStackKey = C.stacks.of(instance);
      target.purchased = true;
      addReceipt(candidate.shop, { receiptId: offer.offerId, offerId: offer.offerId, kind: 'card',
        cardId: offer.cardId, instanceId: instanceId, at: now, price: offer.price });
      if (C.journal) { var journal = C.journal.ensure(candidate); C.journal.keep(journal, instance, now, false); C.journal.compact(journal); }
      return commit(candidate, before, { kind: 'card', receiptId: offer.offerId, offerId: offer.offerId, instance: instance, price: offer.price }, key);
    } catch (error) { return fail('invalid', 'Could not prepare this purchase: ' + error.message); }
  }
  function buyTitan() {
    var blocked = gate(); if (blocked) return blocked;
    var save = C.state.current, shop = shopOf(save), pack = C.pack(C.data.shop.featuredPackId), price = C.data.shop.featuredPrice;
    if (!shop) return fail('recovery', 'Shop data needs recovery before purchasing.');
    if (shop.entitlement) return fail('entitlement', 'Your purchased Titan Pack is ready to open first.');
    if (!pack || !pack.enabled || pack.id !== 'titan' || !Number.isSafeInteger(price) || price <= 0)
      return fail('unsupported', 'The featured Titan Pack is unavailable.');
    if (save.currency < price) return fail('funds', 'Not enough Credits for the Titan Pack.');
    var candidate = JSON.parse(C.state.encode(save)), now = C.clock.now(), before = candidate.currency;
    var entitlementId = C.randomId('shop-pack');
    try {
      C.currency.applyInto(candidate, -price, 'shop', now);
      candidate.shop.entitlement = { entitlementId: entitlementId, packId: pack.id, price: price, purchasedAt: now };
      addReceipt(candidate.shop, { receiptId: entitlementId, offerId: 'featured:' + pack.id,
        kind: 'pack', packId: pack.id, entitlementId: entitlementId, at: now, price: price });
      return commit(candidate, before, { kind: 'pack', receiptId: entitlementId, entitlementId: entitlementId, packId: pack.id, price: price });
    } catch (error) { return fail('invalid', 'Could not prepare the Titan Pack purchase: ' + error.message); }
  }
  C.shopPurchase = { buyCard: buyCard, buyTitan: buyTitan,
    entitlement: function (save) { var shop = shopOf(save || C.state.current); return shop && shop.entitlement || null; } };
})(window.Cardable);
