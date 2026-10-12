/* Offline, deterministic daily offers. All mutations use C.state.commit. */
(function (C) {
  'use strict';
  var cfg = C.data.shop;
  var valuationAdapter = null;
  function dayKey(value) {
    var date = value instanceof Date ? value : new Date(value == null ? C.clock.now() : value);
    if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid Shop date');
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function validDay(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    var d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
    return dayKey(d) === key;
  }
  function hash(value) {
    var h = 2166136261;
    for (var i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function random(seed) {
    var x = hash(seed) || 0x9e3779b9;
    return function () { x += 0x6d2b79f5; var t = x; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function eligible(card, rarity) {
    return !!(card && typeof card.id === 'string' && card.id && card.type === 'gpu' && card.pullable === true &&
      card.retired !== true && card.locked !== true && card.unreleased !== true && card.shopEligible !== false &&
      rarity && rarity.pullable === true && Number.isFinite(rarity.chance) && rarity.chance > 0);
  }
  function pools(cards, rarities) {
    var tiers = [], seen = new Set();
    rarities.forEach(function (rarity) {
      if (!rarity || rarity.pullable !== true || !Number.isFinite(rarity.chance) || rarity.chance <= 0) return;
      var ids = cards.filter(function (card) { return card.rarity === rarity.id && eligible(card, rarity); })
        .filter(function (card) { if (seen.has(card.id)) return false; seen.add(card.id); return true; })
        .sort(function (a, b) { return a.id.localeCompare(b.id); });
      if (ids.length) tiers.push({ id: rarity.id, weight: rarity.chance, cards: ids });
    });
    return tiers;
  }
  function odds(cards, rarities) {
    var grouped = pools(cards, rarities), total = grouped.reduce(function (sum, t) { return sum + t.weight; }, 0);
    return grouped.map(function (t) { return { rarity: t.id, eligible: t.cards.length, percent: t.weight / total * 100 }; });
  }
  function quote(card, variantId, policy) {
    policy = policy || cfg;
    if (variantId != null && !C.variant(variantId)) throw new TypeError('Unsupported Shop variant');
    var base = policy.baseByRarity[card.rarity], weight = card.shopPriceMultiplier == null ? 1 : card.shopPriceMultiplier;
    if (valuationAdapter) {
      var local = valuationAdapter.localBaseline(card, base);
      if (local != null) base = local;
    }
    var variant = variantId == null ? 1 : policy.variantMultiplier;
    if (!Number.isSafeInteger(base) || base <= 0 || !Number.isFinite(weight) || weight <= 0 ||
        !Number.isFinite(policy.convenienceMultiplier) || policy.convenienceMultiplier < 1 ||
        !Number.isFinite(variant) || variant < 1 || !Number.isSafeInteger(policy.priceStep) || policy.priceStep <= 0)
      throw new RangeError('Invalid Shop pricing policy');
    var raw = base * weight * policy.convenienceMultiplier * variant;
    if (!Number.isFinite(raw) || raw > Number.MAX_SAFE_INTEGER) throw new RangeError('Shop quote overflow');
    var amount = Math.ceil(raw / policy.priceStep) * policy.priceStep;
    if (!Number.isSafeInteger(amount) || amount < policy.minimumPrice || amount > policy.maximumPrice) throw new RangeError('Shop quote outside policy');
    return amount;
  }
  function generate(seed, key, cards, rarities, rollVariant) {
    if (typeof seed !== 'string' || !seed || !validDay(key)) throw new TypeError('Invalid Shop seed or day');
    var tiers = pools(cards, rarities), rng = random(seed + '|' + key + '|shop-v' + cfg.version), offers = [];
    if (tiers.reduce(function (sum, tier) { return sum + tier.cards.length; }, 0) < cfg.offerCount) return { dayKey: key, offers: [], status: 'underfilled', version: cfg.version };
    for (var slot = 0; slot < cfg.offerCount; slot++) {
      var total = tiers.reduce(function (sum, tier) { return sum + (tier.cards.length ? tier.weight : 0); }, 0);
      if (!(total > 0)) throw new Error('Shop rarity pools depleted');
      var needle = rng() * total, chosen;
      for (var i = 0; i < tiers.length; i++) { if (!tiers[i].cards.length) continue; needle -= tiers[i].weight; if (needle < 0) { chosen = tiers[i]; break; } }
      chosen = chosen || tiers.filter(function (tier) { return tier.cards.length; }).pop();
      var card = chosen.cards.splice(Math.floor(rng() * chosen.cards.length), 1)[0];
      var variantId = rollVariant(rng);
      if (variantId != null && !C.variant(variantId)) throw new Error('Unsupported Shop variant');
      offers.push({ offerId: key + ':' + String(slot + 1).padStart(2, '0') + ':' + card.id,
        cardId: card.id, variantId: variantId || null, cardSkinId: null, price: quote(card, variantId), purchased: false });
    }
    return { dayKey: key, offers: offers, status: 'ready', version: cfg.version };
  }
  function check(value) {
    if (value === undefined) return null;
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== cfg.version ||
        typeof value.seed !== 'string' || !/^[a-f0-9]{32}$/.test(value.seed) || !Array.isArray(value.days) ||
        value.days.length > cfg.retainedDays || !Array.isArray(value.receipts) || value.receipts.length > cfg.retainedReceipts)
      throw new Error('Invalid Shop state');
    var entitlement = value.entitlement == null ? null : value.entitlement;
    if (entitlement && (!entitlement || typeof entitlement !== 'object' || Array.isArray(entitlement) ||
        !/^shop-pack-[a-f0-9]{32}$/.test(entitlement.entitlementId) || entitlement.packId !== cfg.featuredPackId ||
        !Number.isSafeInteger(entitlement.price) || entitlement.price <= 0 ||
        !Number.isSafeInteger(entitlement.purchasedAt) || entitlement.purchasedAt < 0))
      throw new Error('Invalid Shop pack entitlement');
    var seenDays = new Set();
    value.days.forEach(function (day) {
      if (!day || !validDay(day.dayKey) || seenDays.has(day.dayKey) || day.version !== cfg.version ||
          !['ready', 'underfilled'].includes(day.status) || !Array.isArray(day.offers) ||
          day.offers.length !== (day.status === 'ready' ? cfg.offerCount : 0)) throw new Error('Invalid Shop day');
      seenDays.add(day.dayKey);
      var ids = new Set();
      day.offers.forEach(function (offer, index) {
        if (!offer || typeof offer.cardId !== 'string' || !offer.cardId || ids.has(offer.cardId) ||
            offer.offerId !== day.dayKey + ':' + String(index + 1).padStart(2, '0') + ':' + offer.cardId ||
            offer.cardSkinId !== null || offer.variantId !== null && (typeof offer.variantId !== 'string' || !C.variant(offer.variantId)) ||
            !Number.isSafeInteger(offer.price) || offer.price < cfg.minimumPrice || offer.price > cfg.maximumPrice ||
            typeof offer.purchased !== 'boolean') throw new Error('Invalid Shop offer');
        ids.add(offer.cardId);
      });
    });
    var receiptIds = new Set();
    value.receipts.forEach(function (receipt) {
      if (!receipt || typeof receipt.receiptId !== 'string' || !receipt.receiptId || receiptIds.has(receipt.receiptId) ||
          typeof receipt.offerId !== 'string' || !receipt.offerId ||
          !Number.isSafeInteger(receipt.at) || receipt.at < 0 ||
          !Number.isSafeInteger(receipt.price) || receipt.price <= 0 ||
          !['card', 'pack'].includes(receipt.kind) ||
          receipt.kind === 'card' && (typeof receipt.cardId !== 'string' || !receipt.cardId ||
            typeof receipt.instanceId !== 'string' || !receipt.instanceId) ||
          receipt.kind === 'pack' && (receipt.packId !== cfg.featuredPackId ||
            !/^shop-pack-[a-f0-9]{32}$/.test(receipt.entitlementId))) throw new Error('Invalid Shop receipt');
      receiptIds.add(receipt.receiptId);
    });
    if (entitlement && !value.receipts.some(function (receipt) { return receipt.kind === 'pack' && receipt.entitlementId === entitlement.entitlementId; })) throw new Error('Unreceipted Shop pack entitlement');
    return { version: cfg.version, seed: value.seed, days: value.days.map(function (day) { return {
      dayKey: day.dayKey, version: day.version, status: day.status,
      offers: day.offers.map(function (offer) { return { offerId: offer.offerId, cardId: offer.cardId,
        variantId: offer.variantId, cardSkinId: null, price: offer.price, purchased: offer.purchased }; })
    }; }), receipts: value.receipts.map(function (receipt) { return {
      receiptId: receipt.receiptId, offerId: receipt.offerId, kind: receipt.kind,
      at: receipt.at, price: receipt.price,
      cardId: receipt.kind === 'card' ? receipt.cardId : undefined,
      instanceId: receipt.kind === 'card' ? receipt.instanceId : undefined,
      packId: receipt.kind === 'pack' ? receipt.packId : undefined,
      entitlementId: receipt.kind === 'pack' ? receipt.entitlementId : undefined
    }; }), entitlement: entitlement ? { entitlementId: entitlement.entitlementId, packId: entitlement.packId,
      price: entitlement.price, purchasedAt: entitlement.purchasedAt } : null };
  }
  function ensure(now) {
    var save = C.state.current, key = dayKey(now), shop;
    if (!save) return { error: 'Save is not ready.' };
    try { shop = check(save.shop); } catch (_) { return { error: 'Shop data needs recovery. Restore or import a valid save.' }; }
    var existing = shop && shop.days.find(function (day) { return day.dayKey === key; });
    if (existing) return { snapshot: existing, isNew: false };
    if (!C.state.persistenceAvailable || C.state.recovery && C.state.recovery.pending)
      return { error: 'Save storage is unavailable. Daily offers will appear when saving works again.' };
    try {
      var candidate = JSON.parse(C.state.encode(save));
      if (!shop) shop = { version: cfg.version, seed: C.randomId('shop').slice(5), days: [], receipts: [] };
      var snapshot = generate(shop.seed, key, C.data.cards, C.data.rarities, C.variants.roll);
      shop.days = [snapshot].concat(shop.days).slice(0, cfg.retainedDays);
      candidate.shop = shop;
      if (!C.state.commit(candidate)) return { error: 'Could not save today’s offers. Try again when storage is available.' };
      return { snapshot: JSON.parse(JSON.stringify(snapshot)), isNew: true };
    } catch (error) { return { error: 'Could not prepare today’s offers: ' + error.message }; }
  }
  C.shopState = { dayKey: dayKey, eligible: eligible, pools: pools, odds: odds, quote: quote,
    generate: generate, normalize: check, ensure: ensure,
    setValuationAdapter: function (adapter) {
      if (adapter !== null && (!adapter || typeof adapter.localBaseline !== 'function')) throw new TypeError('Invalid Shop valuation adapter');
      valuationAdapter = adapter;
    } };
})(window.Cardable);
