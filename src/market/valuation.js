/* Cardable — card valuation, for the whole game.
 * One place that answers "what is this exact card worth, and how sure are we?". It is data-driven: the baseline
 * comes from the catalog, rarity and finish registries and src/data/market-config.js; once a Simulation world exists
 * its executed trades refine it. Nothing here is a price anyone is obliged to pay: Quick Sell is a separate, lower,
 * explicit bid (see sales.js).
 *
 * Terms (see the glossary in market-config.js):
 *   baseline     what the card is worth before anyone has traded it: rarity, spec, finish, skin and serial
 *   average      Average Value, a weighted, outlier-clamped mean of executed trades pulled toward the baseline
 *   lastSale     the most recent executed trade of this exact card, finish and skin
 *   bestBid / lowestAsk       open orders and listings when there are any, otherwise a labelled estimate
 *   targetBuy / targetSell    from the spread and the market's own movement, never "lowest ask minus a number"
 * Fields without data are null. */
(function (C) {
  'use strict';
  C.market = C.market || {};
  var core = function () { return C.market.core; };
  var cache = { stamp: '', map: Object.create(null), count: 0 };

  function runtime() { return C.marketSim && C.marketSim.runtime; }
  function world() { var r = runtime(); return r && r.world || null; }
  function env() { var r = runtime(); return r && r.env; }
  function stamp() {
    var w = world();
    return w ? [w.nonce, w.stats.trades, w.evSeq || 0, Math.floor(w.now / 60000)].join(':') : 'none';
  }
  function keyOf(spec) { return [spec.cardId, spec.variantId || '', spec.cardSkinId || '', spec.serial || ''].join('|'); }

  // The value of a card before any trade of it has been seen. Never null for a known card.
  function baselineOnly(spec) {
    var e = env(), S = C.market.sim;
    var entry = e && e.index[spec.cardId];
    if (!entry) return null;
    var base = S.baselineFor(e, spec.cardId, spec.variantId || null, spec.cardSkinId || null);
    var sf = core().serialFactor(spec.serial, C.data.market), avg = Math.max(1, Math.round(base * sf));
    var derived = core().tierDerived(entry.tier, C.data.market), targets = core().targets(avg, derived.spread, C.data.market);
    return {
      key: S.keyOf(spec.cardId, spec.variantId || null, spec.cardSkinId || null), baseline: base, baseAverage: base, average: avg, samples: 0, confidence: 'none', basis: 'baseline',
      lastSale: null, lastAt: null, targetBuy: targets.targetBuy, targetSell: targets.targetSell,
      bestBid: Math.max(1, Math.floor(avg * (1 - derived.spread / 2))), bidReal: false, lowestAsk: Math.max(2, Math.ceil(avg * (1 + derived.spread / 2))), askReal: false,
      spread: derived.spread, spreadReal: false, volatility: null, liquidity: null, volume24h: 0, volume7d: 0, credits24h: 0, credits7d: 0,
      change24h: null, change7d: null, change30d: null, change90d: null, changeAll: null, tier: entry.tier, openAsks: 0, openBids: 0, source: 'baseline'
    };
  }

  function read(spec) {
    if (!spec || !spec.cardId) return null;
    var s = stamp();
    if (cache.stamp !== s) { cache.stamp = s; cache.map = Object.create(null); cache.count = 0; }
    var key = keyOf(spec), hit = cache.map[key];
    if (hit) return hit;
    var value = null;
    if (world() && C.market.sim.provider) {
      try { value = C.market.sim.provider.valuation('simulation', spec); value.source = 'simulation'; } catch (_) { value = null; }
    }
    if (!value) value = baselineOnly(spec);
    if (!value) return null;
    // The baseline with this exact serial's factor, used by Quick Sell so a thin market cannot move a quote far.
    var sf = core().serialFactor(spec.serial, C.data.market);
    value.baselineExact = Math.max(1, Math.round(value.baseline * sf));
    if (cache.count > 6000) { cache.map = Object.create(null); cache.count = 0; }
    cache.map[key] = value; cache.count++;
    return value;
  }
  function ofInstance(instance) {
    return instance ? read({ cardId: instance.cardId, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, serial: instance.serial }) : null;
  }
  function average(instance) { var v = ofInstance(instance); return v ? v.average : 0; }
  // One number for an inventory stack: the most valuable of its copies (they differ only by serial), or the card's own
  // baseline when none is owned. null for a card whose identity is still hidden.
  function stackValue(entry) {
    if (!entry) return null;
    if (entry.instances && entry.instances.length) {
      var best = 0, n = Math.min(entry.instances.length, 12);
      for (var i = 0; i < n; i++) best = Math.max(best, average(entry.instances[i]));
      return best || null;
    }
    if (!entry.card) return null;
    var v = read({ cardId: entry.card.id, variantId: entry.variantId || null, cardSkinId: entry.cardSkinId || null });
    return v ? v.average : null;
  }

  // Three ways to list, the range worth buying in, and what each would leave after the fee.
  function guidance(spec) {
    var v = read(spec), m = C.data.market;
    if (!v) return null;
    var fee = function (p) { return core().feeFor(p, m.fee); };
    function mode(id, label, urgency, sellFactor, note) {
      var s = core().suggestedAsk(v, urgency, m);
      var eta = null;
      if (v.volume7d >= 2) {
        var gapHours = 168 / v.volume7d;
        eta = Math.max(1, Math.round(gapHours * sellFactor));
      }
      return { id: id, label: label, ask: s.price, fee: fee(s.price), net: s.price - fee(s.price), vsAverage: v.average ? (s.price - v.average) / v.average : null, etaHours: eta, note: note };
    }
    var modes = [
      mode('quick', 'Sell quickly', 'fast', 0.5, 'Below the usual price, so it tends to go first.'),
      mode('fair', 'Fair listing', 'balanced', 1, 'Close to Average Value. The usual wait.'),
      mode('patient', 'Wait for more', 'patient', 2.4, 'Above the usual price. It may sit for a while.')
    ];
    var low = Math.max(1, Math.round(v.targetBuy * 0.96)), high = v.targetBuy;
    var sellNet = v.targetSell - fee(v.targetSell);
    return {
      value: v, modes: modes,
      buyRange: { low: low, high: high },
      resaleMargin: { buyAt: high, sellAt: v.targetSell, net: sellNet - high, pct: high ? (sellNet - high) / high : null },
      spread: v.spread, spreadReal: v.spreadReal,
      timeNote: v.volume7d >= 2 ? 'Based on ' + v.volume7d + ' trades of this exact card in the last 7 days.' : 'Insufficient sales to estimate how long it takes to sell.',
      liquidityNote: v.liquidity == null ? 'No trades yet, so liquidity is unknown.' : v.liquidity >= 0.6 ? 'Trades often. Prices tend to hold.' : v.liquidity >= 0.25 ? 'Trades now and then.' : 'Trades rarely. Expect a wide range.',
      confidenceNote: { high: 'Well supported by recent trades.', medium: 'Supported by a few recent trades.', low: 'Leans on the baseline: very few trades.', none: 'No trades yet. This is the baseline estimate.' }[v.confidence]
    };
  }

  // The 7 day change of a stack's card, or null while there is not enough trading to say.
  function stackChange(entry) {
    var sample = entry && (entry.instances && entry.instances[0]) || (entry && entry.card ? { cardId: entry.card.id, variantId: entry.variantId || null, cardSkinId: entry.cardSkinId || null } : null);
    var v = sample ? ofInstance(sample) : null;
    return v ? v.change7d : null;
  }
  C.valuation = { stackChange: stackChange, read: read, ofInstance: ofInstance, average: average, stackValue: stackValue, guidance: guidance, baselineOnly: baselineOnly, invalidate: function () { cache.stamp = ''; } };
})(window.Cardable = window.Cardable || {});
