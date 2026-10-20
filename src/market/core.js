/* Cardable Market — pure core.
 * No DOM, no storage, no network and no save access: everything here takes plain data and returns plain data,
 * so Stages 2 to 7 can swap the data source without touching these rules and tests can run under Node.
 *
 * Contract summary (the "typed" shapes are documented in docs/market-beta/stage-1.md):
 *   Listing   { id, realm, format, status, card:{cardId,variantId,cardSkinId,serial,count}, title, description,
 *               seller:{alias,isBot,persona,sales,rating,tenureDays}, ask, auction?, swap?, valuation, listedMin, endsMin?, watchers, source }
 *   Valuation { average, lastSale, confidence, samples, basis, targetBuy, targetSell, bestBid, lowestAsk, spread,
 *               volume24h, volume7d, change24h, change7d, volatility, liquidity, windowHours }
 *   Filters   see emptyFilters()
 */
(function (C) {
  'use strict';
  C.market = C.market || {};

  // ---- numbers -----------------------------------------------------------------------------------------------
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function roundHalfUp(value) { return Math.floor(value + 0.5); }
  function hash32(text) {
    var h = 2166136261;
    text = String(text);
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function prng(seed) {
    var a = (typeof seed === 'string' ? hash32(seed) : seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) { return (rng() + rng() + rng() - 1.5) / 0.5; }
  function pickFrom(rng, list) { return list[Math.floor(rng() * list.length) % list.length]; }
  function weightedPick(rng, items, weight) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += Math.max(0, weight(items[i]));
    var at = rng() * total;
    for (i = 0; i < items.length; i++) { at -= Math.max(0, weight(items[i])); if (at <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // ---- money and text ----------------------------------------------------------------------------------------
  function feeFor(price, cfg) {
    cfg = cfg || C.data.market.fee;
    if (!(price > 0)) return 0;
    var raw = price * cfg.bps / 10000;
    var rounded = cfg.rounding === 'floor' ? Math.floor(raw) : roundHalfUp(raw);
    return Math.min(price, Math.max(cfg.minFee || 0, rounded));
  }
  function netProceeds(price, cfg) { return Math.max(0, price - feeFor(price, cfg)); }
  var grouping = new Intl.NumberFormat('en-US');
  function formatCredits(value, compact) {
    if (value == null || !isFinite(value)) return '—';
    value = Math.round(value);
    if (compact && Math.abs(value) >= 10000) return (value / 1000).toFixed(Math.abs(value) >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return grouping.format(value);
  }
  function formatPercent(fraction, signed, digits) {
    if (fraction == null || !isFinite(fraction)) return '—';
    var value = fraction * 100, text = Math.abs(value).toFixed(digits == null ? (Math.abs(value) < 10 ? 1 : 0) : digits);
    if (/^0(\.0+)?$/.test(text)) return '0%';
    return (signed ? (value > 0 ? '+' : '−') : value < 0 ? '−' : '') + text + '%';
  }
  function formatDuration(minutes) {
    if (minutes == null) return '';
    if (minutes <= 0) return 'Ended';
    if (minutes < 60) return Math.max(1, Math.round(minutes)) + 'm';
    var hours = Math.floor(minutes / 60), rest = Math.round(minutes - hours * 60);
    if (hours < 24) return hours + 'h' + (rest ? ' ' + rest + 'm' : '');
    var days = Math.floor(hours / 24), left = hours - days * 24;
    return days + 'd' + (left ? ' ' + left + 'h' : '');
  }
  function formatAge(minutes) {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return Math.round(minutes) + ' min ago';
    if (minutes < 1440) return Math.round(minutes / 60) + ' h ago';
    return Math.round(minutes / 1440) + ' d ago';
  }

  // ---- valuation ---------------------------------------------------------------------------------------------
  function cardKey(card) { return card.cardId + '|' + (card.variantId || '') + '|' + (card.cardSkinId || ''); }
  function memoryGb(card) {
    var v = card.vram || {};
    if (!v.amount) return 0;
    return /MB/i.test(v.unit || '') ? v.amount / 1024 : v.amount;
  }
  function specScore(card) {
    var s = card.specs || {};
    var shaders = s.cudaCores || s.streamProcessors || s.executionUnits || s.pipelines || s.gpuCores || 0;
    var clock = s.boostMhz || s.coreClockMhz || 0, bus = s.busBits || 0, power = s.boardPowerW || 0, tflops = s.gpuTflops || 0;
    return Math.log(1 + shaders) * 1.2 + Math.log(1 + memoryGb(card)) * 1.4 + clock / 900 + bus / 160 + power / 220 + tflops * 0.35;
  }
  // Builds a per-card baseline index for the whole catalog: rarity base, then a spec-rank spread inside the tier.
  function buildCardIndex(cards, rarities, cfg) {
    cfg = cfg || C.data.market;
    var tierOf = {}, byRarity = {}, index = {};
    rarities.forEach(function (r) { tierOf[r.id] = r.tier; });
    cards.forEach(function (card) { (byRarity[card.rarity] = byRarity[card.rarity] || []).push(card); });
    Object.keys(byRarity).forEach(function (rarityId) {
      var list = byRarity[rarityId].slice().sort(function (a, b) { return specScore(a) - specScore(b) || (a.id < b.id ? -1 : 1); });
      var tier = tierOf[rarityId] == null ? 0 : tierOf[rarityId];
      var base = cfg.rarityBase[rarityId] != null ? cfg.rarityBase[rarityId] : cfg.rarityBase.basic * Math.pow(cfg.rarityBaseFallbackGrowth, tier);
      list.forEach(function (card, i) {
        var percentile = list.length > 1 ? i / (list.length - 1) : 0.5;
        var spread = cfg.cardSpread.min + (cfg.cardSpread.max - cfg.cardSpread.min) * percentile;
        index[card.id] = { cardId: card.id, rarity: rarityId, tier: tier, baseValue: Math.max(1, roundHalfUp(base * spread)), percentile: percentile };
      });
    });
    return index;
  }
  function serialCounter(serial) {
    var m = /-(\d{1,9})$/.exec(String(serial || ''));
    return m ? Number(m[1]) : null;
  }
  function serialFactor(serial, cfg) {
    cfg = (cfg || C.data.market).serial;
    var n = serialCounter(serial), f = 1;
    if (n == null) return 1;
    if (n <= cfg.lowCounter) f += cfg.lowBonus * (1 - (n - 1) / cfg.lowCounter);
    if (n > 0 && (n % 100 === 0 || n === 1)) f += cfg.roundBonus;
    return clamp(f, cfg.min, cfg.max);
  }
  function variantFactor(variantClass, cfg) {
    cfg = cfg || C.data.market;
    return variantClass && cfg.variantClassFactor[variantClass] ? cfg.variantClassFactor[variantClass] : 1;
  }
  // baseline = base x variant x skin x bounded serial. Every factor is inspectable.
  function baselineValue(cardIndexEntry, parts, cfg) {
    cfg = cfg || C.data.market;
    var v = variantFactor(parts.variantClass, cfg), k = parts.cardSkinId ? cfg.skinFactor : 1, s = parts.serial ? serialFactor(parts.serial, cfg) : 1;
    return {
      value: Math.max(1, roundHalfUp(cardIndexEntry.baseValue * v * k * s)),
      factors: { base: cardIndexEntry.baseValue, variant: v, skin: k, serial: s }
    };
  }
  function tierDerived(tier, cfg) {
    cfg = cfg || C.data.market;
    return {
      volatility: clamp(cfg.volatility.base + cfg.volatility.perTier * tier, 0, cfg.volatility.cap),
      spread: clamp(cfg.spread.base + cfg.spread.perTier * tier, 0, cfg.spread.cap),
      liquidity: clamp(cfg.liquidity.base - cfg.liquidity.perTier * tier, cfg.liquidity.floor, 1)
    };
  }
  function confidenceFor(samples, cfg) {
    cfg = (cfg || C.data.market).confidence;
    return samples >= cfg.highSamples ? 'high' : samples >= cfg.mediumSamples ? 'medium' : samples > 0 ? 'low' : 'none';
  }
  function targets(average, spread, cfg) {
    cfg = (cfg || C.data.market).targets;
    return {
      targetBuy: Math.max(1, Math.floor(average * (1 - cfg.buyBelow - spread / 2))),
      targetSell: Math.max(1, Math.ceil(average * (1 + cfg.sellAbove + spread / 2)))
    };
  }
  function verdictFor(ask, valuation, cfg) {
    cfg = (cfg || C.data.market).verdict;
    if (!valuation || !valuation.average || valuation.confidence === 'none') return 'unrated';
    var ratio = ask / valuation.average;
    if (ratio <= cfg.undervalued) return valuation.confidence === 'low' ? 'possibly-under' : 'undervalued';
    if (ratio >= cfg.overpriced) return 'overpriced';
    return 'fair';
  }
  function saleWindowHours(liquidity) { return Math.max(1, roundHalfUp(2 + (1 - liquidity) * 70)); }

  // ---- ranking -----------------------------------------------------------------------------------------------
  var CONFIDENCE_WEIGHT = { high: 1, medium: 0.8, low: 0.55, none: 0.35 };
  // Eleven factors, none of them "cheapest": value against a confidence-weighted fair price, the margin left after the
  // fee against the target sell, budget fit, collection gap, wishlist, what you keep (rarity and finish), how easily it
  // trades, how little of your balance it ties up, how recently it was listed, the seller's record and how likely the
  // purchase is to actually go through for you.
  var DEFAULT_WEIGHTS = { value: 0.24, margin: 0.10, budget: 0.14, gap: 0.10, wish: 0.08, pref: 0.06, liquidity: 0.08, opportunity: 0.06, fresh: 0.05, trust: 0.04, fill: 0.05 };
  // The Recommended order. Affordability is a bell around a comfortable share of the balance, never "cheapest first".
  function recommend(listing, ctx) {
    ctx = ctx || {};
    var w = Object.assign({}, DEFAULT_WEIGHTS, ctx.weights || {});
    var v = listing.valuation || {}, avg = v.average || listing.ask;
    var discount = avg ? (avg - listing.ask) / avg : 0;
    var conf = CONFIDENCE_WEIGHT[v.confidence || 'none'];
    var c = {};
    c.value = clamp((discount + 0.25) / 0.5, 0, 1) * conf;
    var budget = ctx.budget;
    var affordable = budget == null || listing.ask <= budget;
    if (budget == null) c.budget = 0.5;
    else if (!affordable) c.budget = 0;
    else c.budget = clamp(1 - Math.abs(listing.ask / Math.max(1, budget) - 0.35) / 0.65, 0, 1);
    var cardId = listing.card.cardId;
    c.gap = ctx.owned && !ctx.owned[cardId] ? 1 : 0;
    c.wish = ctx.wishlist && ctx.wishlist[cardId] ? 1 : 0;
    c.liquidity = clamp(v.liquidity == null ? 0.5 : v.liquidity, 0, 1);
    c.fresh = clamp(1 - (listing.listedMin || 0) / 4320, 0, 1);
    // A seller's record counts for what it is: completed sales; a rating only when one exists (never invented).
    c.trust = (listing.seller.rating == null ? 0.6 : clamp(listing.seller.rating, 0, 1)) * clamp(0.5 + Math.min(listing.seller.sales || 0, 60) / 120, 0.5, 1);
    // After-fee margin against what the card has actually been selling for, not against the asking price of others.
    var sellRef = v.targetSell || avg, netSell = sellRef ? netProceeds(sellRef) : 0;
    c.margin = listing.ask ? clamp((netSell - listing.ask) / listing.ask + 0.15, 0, 0.5) / 0.5 : 0;
    // Preference: the rarities and finishes the player keeps, from their own collection in this realm.
    var prefs = ctx.prefs, cardObj = ctx.cards && ctx.cards[cardId];
    if (!prefs || !cardObj) c.pref = 0.5;
    else c.pref = clamp(0.5 * (prefs.rarity[cardObj.rarity] || 0) + 0.5 * (prefs.variant[listing.card.variantId || 'normal'] || 0), 0, 1);
    // Opportunity cost: the share of the balance it ties up, for as long as it usually takes to resell.
    var lockHours = v.timeToSellHours || 72;
    c.opportunity = budget == null ? 0.5 : clamp(1 - (listing.ask / Math.max(1, budget)) * Math.min(1, lockHours / 168) * 1.5, 0, 1);
    // Fill likelihood: a fixed price fills when you click; an auction needs headroom over the current price; a swap
    // needs something you hold that its conditions accept.
    if (listing.format === 'auction') c.fill = budget == null ? 0.5 : clamp((budget - listing.ask) / Math.max(1, listing.ask * 0.5), 0, 1);
    else if (listing.format === 'swap') c.fill = swapFit(listing, ctx);
    else c.fill = budget == null ? 0.5 : (listing.ask <= budget ? 1 : 0);
    var score = 0, keys = Object.keys(w);
    keys.forEach(function (k) { score += (w[k] || 0) * (c[k] || 0); });
    if (listing.status !== 'active' && listing.status !== 'ending') score *= 0.2;
    if (!affordable) score *= 0.55;
    var reasons = [];
    function add(id, label, strength) { reasons.push({ id: id, label: label, strength: strength }); }
    if (budget != null && affordable && c.budget > 0.55) add('budget', 'Fits your budget', c.budget * w.budget);
    if (c.gap && ctx.owned) add('gap', 'Collection gap', c.gap * w.gap + 0.01);
    if (c.wish) add('wishlist', 'On your wishlist', c.wish * w.wish + 0.02);
    if (discount >= 0.06 && (v.confidence === 'high' || v.confidence === 'medium')) add('value', 'Priced below Average Value', c.value * w.value);
    if (v.confidence === 'high' && v.samples >= 20) add('sales', 'Recent sales support value', 0.04);
    if (listing.format === 'auction' && listing.endsMin != null && listing.endsMin <= 90) add('ending', 'Ends soon', 0.05);
    if (c.trust > 0.8) add('trust', 'Well-rated seller', c.trust * w.trust * 0.5);
    if (c.margin > 0.6 && v.confidence !== 'none') add('margin', 'Leaves room after the fee', c.margin * w.margin);
    if (ctx.prefs && c.pref > 0.7) add('pref', 'Matches what you collect', c.pref * w.pref);
    if (budget != null && c.opportunity > 0.85 && affordable) add('light', 'Light on your balance', c.opportunity * w.opportunity * 0.5);
    if (listing.format === 'auction' && budget != null && c.fill > 0.8) add('fill', 'Your balance can follow the bidding', c.fill * w.fill);
    if (listing.format === 'swap' && c.fill >= 0.8) add('swapfit', 'You hold a card it would accept', c.fill * w.fill);
    if (c.fresh > 0.9) add('fresh', 'Just listed', c.fresh * w.fresh * 0.4);
    var risk = (v.confidence === 'low' || v.confidence === 'none' || (v.volatility || 0) > 0.08) ? 'higher' : (v.volatility || 0) > 0.04 ? 'moderate' : 'low';
    if (risk === 'higher') add('risk', 'Higher risk', 0.01);
    reasons.sort(function (a, b) { return b.strength - a.strength; });
    return { score: score, reasons: reasons, risk: risk, affordable: affordable, discount: discount, components: c };
  }

  // Does the player hold something a swap listing's conditions would accept? 1 yes, 0.2 no, 0.5 unknown.
  function swapFit(listing, ctx) {
    var w = listing.swap && listing.swap.wants;
    if (!ctx.owned) return 0.5;
    if (!w) return Object.keys(ctx.owned).length ? 0.8 : 0.2;
    if (w.cardIds && w.cardIds.some(function (id) { return ctx.owned[id]; })) return 1;
    if (w.minTier != null && ctx.cards && ctx.rarities) {
      var ok = Object.keys(ctx.owned).some(function (id) { var c = ctx.cards[id], r = c && ctx.rarities[c.rarity]; return r && r.tier >= w.minTier; });
      return ok ? 0.8 : 0.2;
    }
    return Object.keys(ctx.owned).length ? 0.6 : 0.2;
  }
  // The shares of each rarity and finish in a collection, scaled so the most kept is 1. Built only from the realm's own,
  // verified holdings: never from a trade that cannot be verified.
  function preferences(instances, cardsById) {
    var r = {}, v = {}, n = 0;
    (instances || []).forEach(function (i) {
      var c = cardsById[i.cardId]; if (!c) return;
      r[c.rarity] = (r[c.rarity] || 0) + 1; var k = i.variantId || 'normal'; v[k] = (v[k] || 0) + 1; n++;
    });
    function scale(m) { var top = 0; Object.keys(m).forEach(function (k) { top = Math.max(top, m[k]); }); Object.keys(m).forEach(function (k) { m[k] = top ? m[k] / top : 0; }); return m; }
    return n ? { rarity: scale(r), variant: scale(v), count: n } : null;
  }

  // ---- search ------------------------------------------------------------------------------------------------
  function parseQuery(text) {
    var out = { terms: [], ops: [] };
    String(text || '').trim().split(/\s+/).filter(Boolean).forEach(function (token) {
      var m = /^(rarity|variant|format|brand|gen|generation|seller|price|value|serial|pack):(.+)$/i.exec(token);
      if (m) {
        var key = m[1].toLowerCase(), val = m[2];
        if (key === 'price' || key === 'value' || key === 'serial') {
          var r = /^(<=|>=|<|>)?(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/.exec(val);
          if (r) { out.ops.push({ key: key, op: r[3] ? 'range' : (r[1] || '='), a: Number(r[2]), b: r[3] ? Number(r[3]) : null }); return; }
        } else { out.ops.push({ key: key === 'generation' ? 'gen' : key, op: 'has', value: val.toLowerCase() }); return; }
      }
      out.terms.push(token.toLowerCase());
    });
    return out;
  }
  function compare(op, value, a, b) {
    if (value == null) return false;
    if (op === 'range') return value >= a && value <= b;
    if (op === '<') return value < a; if (op === '<=') return value <= a;
    if (op === '>') return value > a; if (op === '>=') return value >= a;
    return Math.abs(value - a) < 0.5;
  }

  // ---- filters -----------------------------------------------------------------------------------------------
  function emptyFilters() {
    return { q: '', formats: [], rarities: [], variants: [], generations: [], brands: [], packs: [], auctionStatus: '',
      valueRatio: { min: null, max: null }, price: { min: null, max: null }, fairValue: { min: null, max: null },
      serial: { min: null, max: null, lowOnly: false }, ownership: '', withinBudget: false, listedWithin: '',
      minConfidence: '', minSellerRating: 0, variantOnly: false, rarityTierMin: null };
  }
  function normalizeFilters(input) {
    var base = emptyFilters();
    if (!input || typeof input !== 'object') return base;
    ['formats', 'rarities', 'variants', 'generations', 'brands', 'packs'].forEach(function (k) {
      if (Array.isArray(input[k])) base[k] = input[k].filter(function (x) { return typeof x === 'string'; }).slice(0, 24);
    });
    ['q', 'auctionStatus', 'ownership', 'listedWithin', 'minConfidence'].forEach(function (k) { if (typeof input[k] === 'string') base[k] = input[k].slice(0, 120); });
    ['valueRatio', 'price', 'fairValue', 'serial'].forEach(function (k) {
      var src = input[k]; if (!src || typeof src !== 'object') return;
      ['min', 'max'].forEach(function (e) { if (typeof src[e] === 'number' && isFinite(src[e])) base[k][e] = src[e]; });
    });
    if (input.serial && input.serial.lowOnly === true) base.serial.lowOnly = true;
    base.withinBudget = input.withinBudget === true; base.variantOnly = input.variantOnly === true;
    if (typeof input.minSellerRating === 'number') base.minSellerRating = clamp(input.minSellerRating, 0, 1);
    if (typeof input.rarityTierMin === 'number') base.rarityTierMin = input.rarityTierMin;
    return base;
  }
  function rangeActive(r) { return r && (r.min != null || r.max != null); }
  function activeFilterCount(f) {
    var n = 0;
    ['formats', 'rarities', 'variants', 'generations', 'brands', 'packs'].forEach(function (k) { n += f[k].length; });
    if (f.auctionStatus) n++; if (f.ownership) n++; if (f.withinBudget) n++; if (f.listedWithin) n++; if (f.minConfidence) n++;
    if (f.minSellerRating) n++; if (f.variantOnly) n++; if (f.rarityTierMin != null) n++;
    ['valueRatio', 'price', 'fairValue'].forEach(function (k) { if (rangeActive(f[k])) n++; });
    if (rangeActive(f.serial) || f.serial.lowOnly) n++;
    return n;
  }
  var CONFIDENCE_RANK = { none: 0, low: 1, medium: 2, high: 3 };

  // ctx: { budget, owned:{cardId:true}, wishlist:{cardId:true}, cards:{cardId:card}, variants:{id:variant}, rarities:{id:rarity}, watch:{listingId:true} }
  function matches(listing, f, ctx, skip) {
    ctx = ctx || {};
    skip = skip || '';
    var card = ctx.cards && ctx.cards[listing.card.cardId], rarity = card && ctx.rarities && ctx.rarities[card.rarity];
    var variant = listing.card.variantId && ctx.variants ? ctx.variants[listing.card.variantId] : null;
    var v = listing.valuation || {};
    if (f.formats.length && skip !== 'formats' && f.formats.indexOf(listing.format) < 0) return false;
    if (f.rarities.length && skip !== 'rarities' && (!card || f.rarities.indexOf(card.rarity) < 0)) return false;
    if (f.rarityTierMin != null && (!rarity || rarity.tier < f.rarityTierMin)) return false;
    if (f.variants.length && skip !== 'variants') {
      var key = listing.card.variantId || 'normal';
      if (f.variants.indexOf(key) < 0) return false;
    }
    if (f.variantOnly && !listing.card.variantId) return false;
    if (f.generations.length && skip !== 'generations' && (!card || f.generations.indexOf(card.generation) < 0)) return false;
    if (f.brands.length && skip !== 'brands' && (!card || f.brands.indexOf(card.brand) < 0)) return false;
    if (f.packs.length && skip !== 'packs' && f.packs.indexOf(listing.card.packId) < 0) return false;
    if (f.auctionStatus) {
      if (listing.format !== 'auction') return false;
      if (f.auctionStatus === 'ending' && !(listing.endsMin != null && listing.endsMin <= 120)) return false;
      if (f.auctionStatus === 'no-bids' && listing.auction.bids > 0) return false;
      if (f.auctionStatus === 'reserve-met' && !listing.auction.reserveMet) return false;
      if (f.auctionStatus === 'open' && listing.status !== 'active' && listing.status !== 'ending') return false;
    }
    if (rangeActive(f.price)) {
      var p = listing.format === 'auction' ? listing.auction.current : listing.ask;
      if (f.price.min != null && p < f.price.min) return false;
      if (f.price.max != null && p > f.price.max) return false;
    }
    if (rangeActive(f.valueRatio)) {
      if (!v.average) return false;
      var ratio = (listing.format === 'auction' ? listing.auction.current : listing.ask) / v.average * 100;
      if (f.valueRatio.min != null && ratio < f.valueRatio.min) return false;
      if (f.valueRatio.max != null && ratio > f.valueRatio.max) return false;
    }
    if (rangeActive(f.fairValue)) {
      if (!v.average) return false;
      if (f.fairValue.min != null && v.average < f.fairValue.min) return false;
      if (f.fairValue.max != null && v.average > f.fairValue.max) return false;
    }
    if (rangeActive(f.serial) || f.serial.lowOnly) {
      var n = serialCounter(listing.card.serial);
      if (n == null) return false;
      if (f.serial.lowOnly && n > (ctx.lowSerial || C.data.market.serial.lowCounter)) return false;
      if (f.serial.min != null && n < f.serial.min) return false;
      if (f.serial.max != null && n > f.serial.max) return false;
    }
    if (f.ownership) {
      var owned = !!(ctx.owned && ctx.owned[listing.card.cardId]);
      if (f.ownership === 'owned' && !owned) return false;
      if (f.ownership === 'not-owned' && owned) return false;
      if (f.ownership === 'gap' && owned) return false;
      if (f.ownership === 'wishlist' && !(ctx.wishlist && ctx.wishlist[listing.card.cardId])) return false;
      if (f.ownership === 'watching' && !(ctx.watch && ctx.watch[listing.id])) return false;
    }
    if (f.withinBudget && ctx.budget != null) {
      var cost = listing.format === 'auction' ? listing.auction.current : listing.ask;
      if (listing.format !== 'swap' && cost > ctx.budget) return false;
    }
    if (f.listedWithin) {
      var hours = Number(f.listedWithin);
      if (hours && (listing.listedMin || 0) > hours * 60) return false;
    }
    if (f.minConfidence && CONFIDENCE_RANK[v.confidence || 'none'] < CONFIDENCE_RANK[f.minConfidence]) return false;
    if (f.minSellerRating && (listing.seller.rating || 0) < f.minSellerRating) return false;
    if (f.q && skip !== 'q') return matchQuery(listing, parseQuery(f.q), ctx, card, rarity, variant);
    return true;
  }
  function haystack(listing, card, rarity, variant, ctx) {
    var hidden = card && ctx && ctx.concealed && ctx.concealed[card.id];
    if (hidden) return ['unfound secret', listing.title, listing.seller.alias, listing.format].join(' ').toLowerCase();
    return [card && card.name, card && card.brand, rarity && rarity.name, variant && variant.name, listing.title, listing.seller.alias,
      listing.card.serial, listing.format, listing.card.variantId ? '' : 'normal'].join(' ').toLowerCase();
  }
  function matchQuery(listing, q, ctx, card, rarity, variant) {
    var text = haystack(listing, card, rarity, variant, ctx), i;
    for (i = 0; i < q.terms.length; i++) if (text.indexOf(q.terms[i]) < 0) return false;
    var v = listing.valuation || {};
    for (i = 0; i < q.ops.length; i++) {
      var o = q.ops[i];
      if (o.key === 'rarity') { if (!rarity || (rarity.name.toLowerCase().indexOf(o.value) < 0 && rarity.id.indexOf(o.value) < 0)) return false; }
      else if (o.key === 'variant') { if (!variant || variant.name.toLowerCase().indexOf(o.value) < 0) { if (!(o.value === 'normal' && !variant)) return false; } }
      else if (o.key === 'format') { if (listing.format.indexOf(o.value) < 0 && (o.value === 'trade' ? listing.format !== 'swap' : true)) return false; }
      else if (o.key === 'brand') { if (!card || String(card.brand || '').toLowerCase().indexOf(o.value) < 0) return false; }
      else if (o.key === 'gen') { var gid = card && card.generation; if (!gid || gid.indexOf(o.value) < 0 && String(o.value) !== gid.replace('gen', '')) return false; }
      else if (o.key === 'seller') { if (listing.seller.alias.toLowerCase().indexOf(o.value) < 0) return false; }
      else if (o.key === 'pack') { if (String(listing.card.packId || '').toLowerCase().indexOf(o.value) < 0) return false; }
      else if (o.key === 'price') { if (!compare(o.op, listing.format === 'auction' ? listing.auction.current : listing.ask, o.a, o.b)) return false; }
      else if (o.key === 'value') { if (!v.average || !compare(o.op, (listing.format === 'auction' ? listing.auction.current : listing.ask) / v.average * 100, o.a, o.b)) return false; }
      else if (o.key === 'serial') { if (!compare(o.op, serialCounter(listing.card.serial), o.a, o.b)) return false; }
    }
    return true;
  }
  function applyFilters(listings, f, ctx) {
    f = normalizeFilters(f);
    return listings.filter(function (l) { return matches(l, f, ctx); });
  }

  // ---- sorting -----------------------------------------------------------------------------------------------
  function currentPrice(l) { return l.format === 'auction' ? l.auction.current : l.ask; }
  var SORT_IDS = { recommended: 1, newest: 1, ending: 1, bids: 1, value: 1, 'price-asc': 1, 'price-desc': 1, liquid: 1, discount: 1, profit: 1, volume: 1, popular: 1, rarity: 1, serial: 1, variant: 1, change: 1 };
  function sortListings(listings, sortId, ctx, options) {
    options = options || {};
    ctx = ctx || {};
    var needRank = sortId === 'recommended' || sortId === 'discount' || !SORT_IDS[sortId];
    var items = listings.map(function (l) { return { l: l, r: needRank ? recommend(l, ctx) : null }; });
    var cardOf = function (l) { return ctx.cards && ctx.cards[l.card.cardId]; };
    var tierOf = function (l) { var c = cardOf(l), r = c && ctx.rarities && ctx.rarities[c.rarity]; return r ? r.tier : 0; };
    var variantOrder = function (l) { return l.card.variantId ? (ctx.variantOrder && ctx.variantOrder[l.card.variantId] != null ? ctx.variantOrder[l.card.variantId] : 50) : -1; };
    function ratio(l) { var avg = l.valuation.average; return (avg ? currentPrice(l) / avg : 9) + (l.valuation.confidence === 'none' ? 2 : 0); }
    var cmp = {
      recommended: function (a, b) { return b.r.score - a.r.score; },
      newest: function (a, b) { return a.l.listedMin - b.l.listedMin; },
      ending: function (a, b) { return (a.l.endsMin == null ? 1e9 : a.l.endsMin) - (b.l.endsMin == null ? 1e9 : b.l.endsMin); },
      bids: function (a, b) { return (b.l.auction ? b.l.auction.bids : -1) - (a.l.auction ? a.l.auction.bids : -1); },
      value: function (a, b) { return ratio(a.l) - ratio(b.l); },
      'price-asc': function (a, b) { return currentPrice(a.l) - currentPrice(b.l); },
      'price-desc': function (a, b) { return currentPrice(b.l) - currentPrice(a.l); },
      liquid: function (a, b) { return (b.l.valuation.liquidity || 0) - (a.l.valuation.liquidity || 0); },
      discount: function (a, b) { return b.r.discount - a.r.discount; },
      profit: function (a, b) { return (netProceeds(b.l.valuation.average || 0) - currentPrice(b.l)) - (netProceeds(a.l.valuation.average || 0) - currentPrice(a.l)); },
      volume: function (a, b) { return (b.l.valuation.volume7d || 0) - (a.l.valuation.volume7d || 0); },
      popular: function (a, b) { return b.l.watchers - a.l.watchers; },
      rarity: function (a, b) { return tierOf(b.l) - tierOf(a.l); },
      serial: function (a, b) { return (serialCounter(a.l.card.serial) || 1e9) - (serialCounter(b.l.card.serial) || 1e9); },
      variant: function (a, b) { return variantOrder(b.l) - variantOrder(a.l); },
      change: function (a, b) { return Math.abs(b.l.valuation.change7d || 0) - Math.abs(a.l.valuation.change7d || 0); }
    };
    var fn = cmp[sortId] || cmp.recommended;
    items.sort(function (a, b) { return fn(a, b) || (a.l.id < b.l.id ? -1 : a.l.id > b.l.id ? 1 : 0); });
    if (options.playersFirst) {
      items = items.filter(function (x) { return !x.l.seller.isBot; }).concat(items.filter(function (x) { return x.l.seller.isBot; }));
    }
    if (options.ranks) items.forEach(function (x) { if (x.r) options.ranks[x.l.id] = x.r; });
    return items.map(function (x) { return x.l; });
  }
  function paginate(items, cursor, size) {
    var start = cursor ? Math.max(0, Number(cursor) || 0) : 0, end = Math.min(items.length, start + size);
    return { items: items.slice(start, end), nextCursor: end < items.length ? String(end) : null, total: items.length };
  }

  // ---- facets and recovery -----------------------------------------------------------------------------------
  // Counts honour every other filter but ignore the facet's own selection, so a multi-select shows what it would add.
  function facetCounts(listings, f, ctx) {
    f = normalizeFilters(f);
    var out = { formats: {}, rarities: {}, variants: {}, generations: {}, brands: {}, packs: {} };
    function add(group, key) { out[group][key] = (out[group][key] || 0) + 1; }
    function pass(l, skip) { return matches(l, f, ctx, skip); }
    listings.forEach(function (l) {
      var card = ctx.cards[l.card.cardId];
      if (pass(l, 'formats')) add('formats', l.format);
      if (pass(l, 'rarities') && card) add('rarities', card.rarity);
      if (pass(l, 'variants')) add('variants', l.card.variantId || 'normal');
      if (pass(l, 'generations') && card) add('generations', card.generation);
      if (pass(l, 'brands') && card && card.brand) add('brands', card.brand);
      if (pass(l, 'packs') && l.card.packId) add('packs', l.card.packId);
    });
    return out;
  }
  // When nothing matches, report which single removal would bring the most results back.
  function relaxSuggestions(listings, f, ctx) {
    f = normalizeFilters(f);
    var tries = [], base = emptyFilters();
    function attempt(label, patch) {
      var g = normalizeFilters(JSON.parse(JSON.stringify(f)));
      patch(g);
      var n = listings.filter(function (l) { return matches(l, g, ctx); }).length;
      if (n > 0) tries.push({ label: label, count: n, filters: g });
    }
    if (f.q) attempt('Clear the search text', function (g) { g.q = ''; });
    ['formats', 'rarities', 'variants', 'generations', 'brands', 'packs'].forEach(function (k) {
      if (f[k].length) attempt('Remove ' + k.replace(/s$/, '') + ' choices', function (g) { g[k] = []; });
    });
    if (f.ownership) attempt('Show every ownership state', function (g) { g.ownership = ''; });
    if (f.withinBudget) attempt('Include listings above your budget', function (g) { g.withinBudget = false; });
    if (f.auctionStatus) attempt('Any auction status', function (g) { g.auctionStatus = ''; });
    if (f.listedWithin) attempt('Any listing age', function (g) { g.listedWithin = ''; });
    if (f.minConfidence) attempt('Any value confidence', function (g) { g.minConfidence = ''; });
    if (f.minSellerRating) attempt('Any seller rating', function (g) { g.minSellerRating = 0; });
    if (f.variantOnly) attempt('Include normal finishes', function (g) { g.variantOnly = false; });
    if (f.rarityTierMin != null) attempt('Include lower rarities', function (g) { g.rarityTierMin = null; });
    ['price', 'valueRatio', 'fairValue'].forEach(function (k) {
      if (rangeActive(f[k])) attempt('Remove the ' + ({ price: 'price', valueRatio: 'value ratio', fairValue: 'fair value' })[k] + ' range', function (g) { g[k] = base[k]; });
    });
    if (rangeActive(f.serial) || f.serial.lowOnly) attempt('Any serial', function (g) { g.serial = base.serial; });
    tries.sort(function (a, b) { return b.count - a.count; });
    return tries.slice(0, 3);
  }

  // ---- series ------------------------------------------------------------------------------------------------
  var WINDOWS = {
    '24h': { hours: 24, bucket: 1, label: '24 hours' },
    '7d': { hours: 168, bucket: 3, label: '7 days' },
    '30d': { hours: 720, bucket: 12, label: '30 days' },
    '90d': { hours: 2160, bucket: 24, label: '90 days' },
    all: { hours: 4320, bucket: 48, label: 'All time' }
  };
  var FULL_HOURS = 4320;
  // A deterministic mean-reverting walk, generated backward from the current value so the most recent hours are
  // identical whatever length is requested and the chart always ends on the Average Value.
  function hourlyPath(seed, base, volatility, hours) {
    hours = Math.max(2, Math.min(FULL_HOURS, hours || FULL_HOURS));
    var rng = prng(seed), out = new Array(hours), x = base, hourly = volatility / Math.sqrt(24);
    out[hours - 1] = base;
    for (var i = 1; i < hours; i++) {
      x = Math.max(base * 0.35, x + (base - x) * 0.012 + gauss(rng) * hourly * base);
      out[hours - 1 - i] = x;
    }
    return out;
  }
  function candles(path, windowId, seed, liquidity) {
    var w = WINDOWS[windowId] || WINDOWS['7d'], rng = prng(seed + '|v'), slice = path.slice(Math.max(0, path.length - w.hours)), out = [];
    for (var i = 0; i < slice.length; i += w.bucket) {
      var chunk = slice.slice(i, i + w.bucket), hi = -Infinity, lo = Infinity;
      chunk.forEach(function (x) { if (x > hi) hi = x; if (x < lo) lo = x; });
      out.push({ t: i, open: chunk[0], close: chunk[chunk.length - 1], high: hi, low: lo,
        volume: Math.max(0, Math.round((2 + rng() * 9) * liquidity * chunk.length * (1 + (hi - lo) / Math.max(1, chunk[0]) * 8))) });
    }
    return out;
  }
  function windowChange(path, hours) {
    var end = path[path.length - 1], start = path[Math.max(0, path.length - 1 - hours)];
    return start ? (end - start) / start : 0;
  }
  // Indices average member paths after normalising each to its first point in the window, scaled to 100.
  function indexPath(paths, hours) {
    hours = hours || FULL_HOURS;
    var out = new Array(hours), n = paths.length || 1;
    for (var i = 0; i < hours; i++) {
      var sum = 0;
      for (var p = 0; p < paths.length; p++) { var path = paths[p], at = path.length - hours + i, first = path[Math.max(0, path.length - hours)]; sum += path[Math.max(0, at)] / first; }
      out[i] = sum / n * 100;
    }
    return out;
  }
  function downsample(values, max) {
    if (values.length <= max) return values;
    var step = values.length / max, out = [];
    for (var i = 0; i < max; i++) out.push(values[Math.floor(i * step)]);
    out.push(values[values.length - 1]);
    return out;
  }

  // ---- composer ----------------------------------------------------------------------------------------------
  function suggestedAsk(valuation, urgency, cfg) {
    var avg = valuation.average || 1, spread = valuation.spread || 0.06;
    var mult = urgency === 'fast' ? 1 - spread / 2 - 0.04 : urgency === 'patient' ? 1 + spread / 2 + 0.05 : 1;
    var price = Math.max(1, roundHalfUp(avg * mult));
    return { price: price, fee: feeFor(price, cfg && cfg.fee), net: netProceeds(price, cfg && cfg.fee), urgency: urgency || 'balanced' };
  }
  function suggestedStart(valuation) { return Math.max(1, roundHalfUp((valuation.average || 1) * 0.6)); }
  function minIncrement(current, cfg) {
    cfg = (cfg || C.data.market).auction;
    return Math.max(cfg.incrementMin, roundHalfUp(current * cfg.incrementPct / 100));
  }
  function durationHours(draft, cfg) {
    cfg = (cfg || C.data.market).auction;
    if (draft.durationMode === 'custom') return Number(draft.customHours);
    var p = cfg.presets.find(function (x) { return x.id === draft.preset; });
    return p ? p.hours : cfg.presets[1].hours;
  }
  // Returns { ok, errors:{field:message}, disabledReason, fee, net, hours }. Never throws.
  function validateDraft(draft, ctx) {
    ctx = ctx || {};
    var cfg = ctx.config || C.data.market, errors = {}, out = { ok: false, errors: errors, fee: 0, net: 0, hours: null, disabledReason: '' };
    if (!draft || !draft.items || !draft.items.length) { errors.items = 'Choose the exact card you want to list.'; }
    var advanced = draft.mode === 'advanced';
    if (draft.items && draft.items.length > cfg.listing.maxBundle) errors.items = 'A listing holds at most ' + cfg.listing.maxBundle + ' cards.';
    if (draft.title && draft.title.length > cfg.listing.titleMax) errors.title = 'Titles are at most ' + cfg.listing.titleMax + ' characters.';
    if (draft.description && draft.description.length > cfg.listing.descriptionMax) errors.description = 'Descriptions are at most ' + cfg.listing.descriptionMax + ' characters.';
    var price = Number(draft.price);
    if (draft.format === 'buy-now') {
      if (!(price >= 1) || price !== Math.floor(price)) errors.price = 'Enter a whole price of at least 1 Credit.';
      else { out.fee = feeFor(price, cfg.fee); out.net = price - out.fee; }
    } else if (draft.format === 'auction') {
      var start = Number(draft.startBid);
      if (!(start >= 1) || start !== Math.floor(start)) errors.startBid = 'Enter a whole starting bid of at least 1 Credit.';
      else { out.fee = feeFor(start, cfg.fee); out.net = start - out.fee; }
      if (advanced && draft.reserve !== '' && draft.reserve != null) {
        var reserve = Number(draft.reserve);
        if (!(reserve >= start)) errors.reserve = 'The reserve cannot be below the starting bid.';
      }
      if (draft.buyout !== '' && draft.buyout != null) {
        var buyout = Number(draft.buyout), floor = Math.max(start, Number(draft.reserve) || 0);
        if (!(buyout > floor)) errors.buyout = 'The buyout must be above the starting bid and reserve.';
      }
      var hours = durationHours(draft, cfg);
      if (draft.durationMode === 'custom' && !advanced) errors.duration = 'Custom durations are part of Advanced mode.';
      else if (!(hours >= cfg.auction.customMinHours && hours <= cfg.auction.customMaxHours)) errors.duration = 'Choose between ' + cfg.auction.customMinHours + ' hour and ' + cfg.auction.customMaxHours / 24 + ' days.';
      out.hours = hours;
    } else if (draft.format === 'swap') {
      var rules = draft.wanted || [];
      var anyRule = rules.some(function (r) { return r && (r.cardId || r.rarity || r.variant || r.minValuePct); });
      if (!anyRule && !(advanced && Number(draft.minRelativePct))) errors.wanted = 'Say what you would accept: a card, a rarity, a finish or a minimum value.';
      if (Number(draft.creditTopUp) < 0) errors.creditTopUp = 'A top-up cannot be negative.';
      out.fee = Number(draft.creditTopUp) > 0 ? feeFor(Number(draft.creditTopUp), cfg.fee) : 0;
      out.net = Number(draft.creditTopUp) > 0 ? Number(draft.creditTopUp) - out.fee : 0;
    } else errors.format = 'Choose a listing type.';
    if (advanced && draft.minRelativePct != null && draft.minRelativePct !== '') {
      var pct = Number(draft.minRelativePct);
      if (!(pct >= cfg.relativeValue.min && pct <= cfg.relativeValue.max)) errors.minRelativePct = 'Choose between ' + cfg.relativeValue.min + '% and ' + cfg.relativeValue.max + '% of Average Value.';
    }
    var keys = Object.keys(errors);
    out.ok = keys.length === 0;
    out.disabledReason = keys.length ? errors[keys[0]] : '';
    return out;
  }
  // Which view the draft would be previewed against: a quick factor for an honest "below / above Average Value" line.
  function priceVerdict(draft, valuation) {
    if (!valuation || !valuation.average) return null;
    var p = draft.format === 'auction' ? Number(draft.startBid) : Number(draft.price);
    if (!(p > 0)) return null;
    return { ratio: p / valuation.average, verdict: verdictFor(p, valuation) };
  }

  // ---- change tracking ---------------------------------------------------------------------------------------
  function changeWord(fraction) {
    if (fraction == null) return 'no data';
    if (Math.abs(fraction) < 0.0005) return 'unchanged';
    return fraction > 0 ? 'up' : 'down';
  }

  C.market.core = {
    clamp: clamp, roundHalfUp: roundHalfUp, hash32: hash32, prng: prng, gauss: gauss, pickFrom: pickFrom, weightedPick: weightedPick,
    feeFor: feeFor, netProceeds: netProceeds, formatCredits: formatCredits, formatPercent: formatPercent,
    formatDuration: formatDuration, formatAge: formatAge,
    cardKey: cardKey, specScore: specScore, buildCardIndex: buildCardIndex, serialCounter: serialCounter, serialFactor: serialFactor,
    variantFactor: variantFactor, baselineValue: baselineValue, tierDerived: tierDerived, confidenceFor: confidenceFor,
    targets: targets, verdictFor: verdictFor, saleWindowHours: saleWindowHours,
    recommend: recommend, preferences: preferences, swapFit: swapFit, DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    parseQuery: parseQuery, emptyFilters: emptyFilters, normalizeFilters: normalizeFilters, activeFilterCount: activeFilterCount,
    matches: matches, applyFilters: applyFilters, sortListings: sortListings, paginate: paginate,
    facetCounts: facetCounts, relaxSuggestions: relaxSuggestions, currentPrice: currentPrice,
    WINDOWS: WINDOWS, FULL_HOURS: FULL_HOURS, hourlyPath: hourlyPath, candles: candles, windowChange: windowChange, indexPath: indexPath, downsample: downsample,
    suggestedAsk: suggestedAsk, suggestedStart: suggestedStart, minIncrement: minIncrement, durationHours: durationHours,
    validateDraft: validateDraft, priceVerdict: priceVerdict, changeWord: changeWord
  };
})(window.Cardable = window.Cardable || {});
