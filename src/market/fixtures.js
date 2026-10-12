/* Cardable Market — deterministic sample data.
 * Everything here is invented: seeded, repeatable, and labelled as a preview wherever it is shown.
 * Nothing in this file is a transaction, a price anyone paid, or a real player. Stages 2 to 7 replace the
 * provider in api.js; the shapes below are the contract those providers must satisfy.
 */
(function (C) {
  'use strict';
  C.market = C.market || {};
  var K = function () { return C.market.core; };

  var ADJECTIVES = ['Silent', 'Amber', 'Cobalt', 'Quiet', 'Velvet', 'Iron', 'Lunar', 'Misty', 'Copper', 'Crimson', 'Gentle', 'Hollow', 'Ivory', 'Jade', 'Keen', 'Linen',
    'Mellow', 'Nimble', 'Opal', 'Pale', 'Rapid', 'Sable', 'Tidy', 'Umber', 'Vivid', 'Wild', 'Brisk', 'Calm', 'Dusky', 'Eager', 'Faint', 'Gilded',
    'Humble', 'Indigo', 'Jolly', 'Kind', 'Lively', 'Modest', 'Noble', 'Olive', 'Proud', 'Rustic', 'Sunny', 'Tawny', 'Upbeat', 'Wary', 'Zesty', 'Bold'];
  var NOUNS = ['Falcon', 'Heron', 'Otter', 'Lynx', 'Badger', 'Finch', 'Marten', 'Raven', 'Wren', 'Fox', 'Stag', 'Crane', 'Moth', 'Newt', 'Pike', 'Quail',
    'Robin', 'Swift', 'Tern', 'Vole', 'Whale', 'Yak', 'Ibex', 'Kite', 'Lark', 'Mole', 'Owl', 'Pika', 'Seal', 'Toad', 'Viper', 'Wolf',
    'Bison', 'Cobra', 'Dingo', 'Egret', 'Gecko', 'Hare', 'Jackal', 'Koala', 'Llama', 'Mink', 'Narwhal', 'Oriole', 'Panda', 'Rook', 'Sparrow', 'Tapir'];
  var PERSONAS = [
    { id: 'collector', label: 'Collector', note: 'Buys to complete sets and rarely resells.' },
    { id: 'bargain', label: 'Bargain hunter', note: 'Only buys well under Average Value.' },
    { id: 'investor', label: 'Investor', note: 'Holds scarce cards for the long run.' },
    { id: 'flipper', label: 'Quick flipper', note: 'Turns cards over fast at thin margins.' },
    { id: 'completionist', label: 'Completionist', note: 'Chases every variant of the same GPU.' },
    { id: 'cautious', label: 'Risk-averse trader', note: 'Prefers liquid, stable cards.' },
    { id: 'hype', label: 'Hype follower', note: 'Moves with whatever is trending.' },
    { id: 'specialist', label: 'Specialist', note: 'Focuses on one brand or generation.' }
  ];
  var TITLES = ['Clean pull, no rush', 'Low serial, happy to trade', 'Priced to move', 'From a lucky pack', 'Fair offer welcome', 'A favourite I can let go',
    'Duplicate from my binder', 'Looking for a good home', 'Quick sale', 'Collector grade', 'Finishing a set', 'Open to a swap'];
  var DESCRIPTIONS = ['Pulled on opening night and kept in the binder since.', 'I have two of these. This is the one with the better serial.',
    'Message me a counter if the price does not suit you.', 'Not in a hurry. Fair offers will be considered.', 'Part of a trade chain I am working through.'];
  var NICE = function (n) { return n < 60 ? Math.max(1, Math.round(n)) : n < 400 ? Math.round(n / 5) * 5 : n < 3000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50; };
  var SAMPLE_PLAYER_CODE = 'DEMO';

  function pad(n, w) { return String(n).padStart(w, '0'); }
  function demoSerial(n) { return 'CBL-' + SAMPLE_PLAYER_CODE + '-' + pad(n, 6); }

  function build(env) {
    var k = K(), cfg = C.data.market;
    var cards = env.cards.filter(function (c) { return !c.retired && c.pullable !== false; });
    var rarityById = {}, variantById = {}, cardById = {}, variantOrder = {};
    env.rarities.forEach(function (r) { rarityById[r.id] = r; });
    env.variants.forEach(function (v, i) { variantById[v.id] = v; variantOrder[v.id] = i; });
    env.cards.forEach(function (c) { cardById[c.id] = c; });
    // The index covers retired cards too, so a legacy save's cards can still be valued. They are not listed.
    var index = k.buildCardIndex(env.cards, env.rarities, cfg);
    var packIds = (env.packs || []).filter(function (p) { return p.enabled !== false; }).map(function (p) { return p.id; });
    if (!packIds.length) packIds = ['standard'];

    // ---- per-card market numbers (one walk per card, reused by every view) ----
    var statCache = {}, pathCache = {};
    // Paths are generated backward from today, so a longer request only extends the earlier hours.
    function pathFor(key, base, vol, hours) {
      hours = hours || 720;
      var have = pathCache[key];
      if (!have || have.length < hours) have = pathCache[key] = k.hourlyPath('path|' + key, base, vol, hours);
      return have;
    }
    function variantClass(variantId) { var v = variantId && variantById[variantId]; return v ? v.class : null; }
    function valuation(parts) {
      var key = parts.cardId + '|' + (parts.variantId || '') + '|' + (parts.cardSkinId || '');
      if (statCache[key]) return statCache[key];
      var entry = index[parts.cardId];
      if (!entry) return null;
      var base = k.baselineValue(entry, { variantClass: variantClass(parts.variantId), cardSkinId: parts.cardSkinId }, cfg).value;
      var d = k.tierDerived(entry.tier, cfg), rng = k.prng('stat|' + key);
      var rare = entry.tier >= 9;
      var samples = Math.round(d.liquidity * 44 * (0.35 + rng() * 0.9) * (parts.variantId ? 0.55 : 1) * (rare ? 0.12 : 1));
      if (rare && rng() < 0.45) samples = 0;
      var confidence = k.confidenceFor(samples, cfg);
      var drift = (rng() - 0.5) * 2 * d.volatility * (samples ? 1 : 0.2);
      var average = Math.max(1, k.roundHalfUp(base * (1 + drift)));
      var path = pathFor(key, average, d.volatility, 720);
      var t = k.targets(average, d.spread, cfg);
      var perDay = Math.max(0, samples / 14);
      var v = {
        key: key, cardId: parts.cardId, variantId: parts.variantId || null, cardSkinId: parts.cardSkinId || null,
        baseline: base, average: average, samples: samples, confidence: confidence, basis: samples ? 'sales' : 'baseline',
        lastSale: samples ? Math.max(1, k.roundHalfUp(average * (1 + (rng() - 0.5) * d.volatility * 2))) : null,
        targetBuy: t.targetBuy, targetSell: t.targetSell,
        bestBid: Math.max(1, Math.floor(average * (1 - d.spread / 2))), lowestAsk: Math.max(2, Math.ceil(average * (1 + d.spread / 2))),
        spread: d.spread, volatility: d.volatility, liquidity: d.liquidity,
        volume24h: Math.round(perDay), volume7d: Math.round(perDay * 7),
        credits24h: Math.round(perDay * average), credits7d: Math.round(perDay * 7 * average),
        change24h: samples ? k.windowChange(path, 24) : null, change7d: samples ? k.windowChange(path, 168) : null,
        change30d: samples ? k.windowChange(path, 720) : null, windowHours: k.saleWindowHours(d.liquidity), tier: entry.tier
      };
      statCache[key] = v;
      return v;
    }
    function seriesFor(cardId, variantId, windowId, scope) {
      var v = valuation({ cardId: cardId, variantId: variantId });
      if (!v) return null;
      var hours = (k.WINDOWS[windowId] || k.WINDOWS['7d']).hours, path = pathFor(v.key, v.average, v.volatility, hours);
      return { valuation: v, candles: k.candles(path, windowId, v.key + '|' + windowId, v.liquidity), path: path };
    }

    // ---- sellers ----
    function makeSellers(realm, count, bots) {
      var rng = k.prng('sellers|' + realm), seen = {}, out = [];
      while (out.length < count) {
        var alias = k.pickFrom(rng, ADJECTIVES) + ' ' + k.pickFrom(rng, NOUNS);
        if (seen[alias]) continue; seen[alias] = true;
        var persona = bots ? PERSONAS[out.length % PERSONAS.length] : null;
        var sales = Math.floor(rng() * rng() * 140);
        out.push({ alias: alias, isBot: bots, persona: persona ? persona.id : null, personaLabel: persona ? persona.label : null,
          sales: sales, rating: Math.round((0.62 + rng() * 0.36) * 100) / 100, tenureDays: 4 + Math.floor(rng() * 160) });
      }
      return out;
    }

    // ---- listings ----
    function ratioFor(rng, persona) {
      var roll = rng();
      var bias = persona === 'bargain' ? -0.02 : persona === 'hype' ? 0.04 : persona === 'flipper' ? 0.02 : 0;
      if (roll < 0.26) return 0.72 + rng() * 0.2 + bias;
      if (roll < 0.72) return 0.93 + rng() * 0.15 + bias;
      return 1.1 + rng() * 0.3 + bias;
    }
    function makeListings(realm, count, sellers, prefix) {
      var rng = k.prng('listings|' + realm), out = [], serialRng = k.prng('serial|' + realm);
      for (var i = 0; i < count; i++) {
        var card = k.weightedPick(rng, cards, function (c) { var e = index[c.id]; return 1 / (1 + (e ? e.tier : 0) * 0.6); });
        var variant = rng() < 0.14 ? k.weightedPick(rng, env.variants.filter(function (v) { return v.kind !== 'frame'; }), function (v) { return v.weight || 1; }) : null;
        var skin = !variant && card.generation === 'gen1' && rng() < 0.12 ? 'classic' : null;
        var seller = k.pickFrom(rng, sellers);
        var counter = 1 + Math.floor(serialRng() * serialRng() * 900);
        var parts = { cardId: card.id, variantId: variant ? variant.id : null, cardSkinId: skin };
        var val = valuation(parts), entry = index[card.id];
        var roll = rng();
        var format = roll < 0.52 ? 'buy-now' : roll < 0.85 ? 'auction' : 'swap';
        var listedMin = Math.floor(3 + Math.pow(rng(), 2.1) * 5800);
        var listing = {
          id: prefix + '-' + pad(i + 1, 4), realm: realm, format: format, status: 'active',
          card: { cardId: card.id, variantId: parts.variantId, cardSkinId: skin, serial: demoSerial(counter), count: 1, packId: k.pickFrom(rng, packIds),
            pulledMin: 5000 + Math.floor(rng() * 90000) },
          title: rng() < 0.36 ? k.pickFrom(rng, TITLES) : '', description: rng() < 0.4 ? k.pickFrom(rng, DESCRIPTIONS) : '',
          cover: rng() < 0.14 ? { kind: 'sample', hue: Math.floor(rng() * 360) } : { kind: 'card' },
          seller: seller, valuation: val, listedMin: listedMin, watchers: Math.floor(Math.pow(rng(), 1.8) * (30 - entry.tier * 1.2)),
          source: realm === 'simulation' ? 'fixture-simulation' : 'fixture-global-sample', ask: 0
        };
        var average = val.average;
        if (format === 'buy-now') {
          listing.ask = Math.max(1, NICE(average * ratioFor(rng, seller.persona)));
        } else if (format === 'auction') {
          var start = Math.max(1, NICE(average * (0.45 + rng() * 0.25)));
          var bids = rng() < 0.28 ? 0 : 1 + Math.floor(Math.pow(rng(), 1.6) * 13);
          var current = start;
          for (var b = 0; b < bids; b++) current += k.minIncrement(current, cfg) + Math.floor(rng() * average * 0.05);
          if (current > average * 1.25) current = Math.max(start, NICE(average * (0.9 + rng() * 0.2)));
          var reserve = rng() < 0.38 ? Math.max(start, NICE(average * (0.8 + rng() * 0.25))) : null;
          var endsMin = Math.max(6, Math.floor(8 + Math.pow(rng(), 1.7) * 4300));
          listing.ask = bids ? current : start;
          listing.auction = { start: start, current: bids ? current : start, bids: bids, reserve: reserve, reserveMet: reserve == null ? true : current >= reserve,
            increment: k.minIncrement(bids ? current : start, cfg), buyout: rng() < 0.2 ? NICE(average * (1.25 + rng() * 0.3)) : null,
            leaderAlias: bids ? k.pickFrom(rng, sellers).alias : null };
          listing.endsMin = endsMin;
          if (endsMin <= 60) listing.status = 'ending';
        } else {
          var wantedCard = k.weightedPick(rng, cards, function (c) { var e = index[c.id]; return 1 / (1 + Math.abs((e ? e.tier : 0) - entry.tier) * 1.4); });
          var exact = rng() < 0.55;
          var wantedVal = valuation({ cardId: wantedCard.id, variantId: null, cardSkinId: null });
          var topUp = Math.max(0, NICE(Math.abs(average - wantedVal.average) * (0.8 + rng() * 0.4)));
          var direction = average > wantedVal.average ? 'asks' : 'adds';
          if (rng() < 0.3) { topUp = 0; }
          listing.ask = average;
          listing.swap = {
            wanted: exact ? [{ cardId: wantedCard.id, label: rarityById[wantedCard.rarity] && rarityById[wantedCard.rarity].finish === 'secret' ? 'A Secret card' : wantedCard.name }]
              : [{ rarity: wantedCard.rarity, minValuePct: 90, label: rarityById[wantedCard.rarity].name + ' or better, worth 90% or more' }],
            topUp: topUp, direction: direction, openToCounter: rng() < 0.7
          };
        }
        // Rare listings keep the sample UI honest about thin markets.
        out.push(listing);
      }
      return out;
    }

    // ---- completed trades (sample) ----
    function makeTrades(realm, count, sellers, prefix) {
      var rng = k.prng('trades|' + realm), out = [];
      for (var i = 0; i < count; i++) {
        var card = k.weightedPick(rng, cards, function (c) { var e = index[c.id]; return 1 / (1 + (e ? e.tier : 0) * 0.5); });
        var variant = rng() < 0.12 ? k.pickFrom(rng, env.variants.filter(function (v) { return v.kind !== 'frame'; })) : null;
        var val = valuation({ cardId: card.id, variantId: variant ? variant.id : null, cardSkinId: null });
        var price = Math.max(1, NICE(val.average * (0.86 + rng() * 0.3)));
        out.push({ id: prefix + '-' + pad(i + 1, 4), realm: realm, cardId: card.id, variantId: variant ? variant.id : null, price: price,
          average: val.average, vs: (price - val.average) / val.average, format: rng() < 0.62 ? 'buy-now' : rng() < 0.7 ? 'auction' : 'swap',
          minutesAgo: Math.floor(2 + Math.pow(rng(), 1.9) * 2600), seller: k.pickFrom(rng, sellers).alias, buyer: k.pickFrom(rng, sellers).alias });
      }
      out.sort(function (a, b) { return a.minutesAgo - b.minutesAgo; });
      return out;
    }

    var simSellers = makeSellers('simulation', 30, true), globalSellers = makeSellers('global', 24, false);
    var simListings = makeListings('simulation', 168, simSellers, 'sim');
    var globalListings = makeListings('global', 72, globalSellers, 'smp');
    var simTrades = makeTrades('simulation', 70, simSellers, 'simt'), globalTrades = makeTrades('global', 36, globalSellers, 'smpt');

    // ---- the player's own sample activity (not their real activity) ----
    function pickListing(list, fn) { return list.find(fn) || list[0]; }
    var mine = (function () {
      var picks = simListings.filter(function (l) { return l.status === 'active' || l.status === 'ending'; });
      var buy = picks.filter(function (l) { return l.format === 'buy-now'; }).slice(0, 2);
      var auc = picks.filter(function (l) { return l.format === 'auction' && l.auction.bids > 0; }).slice(0, 2);
      var swp = picks.filter(function (l) { return l.format === 'swap'; }).slice(0, 1);
      var seller = { alias: 'You', isBot: false, persona: null, sales: 0, rating: 1, tenureDays: 0, isYou: true };
      function own(l, status, extra) { return Object.assign({}, l, { id: 'mine-' + l.id, seller: seller, status: status, isMine: true, watchers: l.watchers }, extra || {}); }
      var active = buy.concat(auc, swp).map(function (l) { return own(l, l.status); });
      var ended = [own(simListings[40], 'sold', { soldFor: simListings[40].ask, endedMin: 380 }), own(simListings[41], 'expired', { endedMin: 1450 })];
      return { listings: active.concat(ended) };
    })();
    var bidSources = simListings.filter(function (l) { return l.format === 'auction' && l.auction.bids > 1; }).slice(0, 4);
    var myBids = bidSources.map(function (l, i) {
      var state = i === 0 ? 'leading' : i === 1 ? 'outbid' : i === 2 ? 'leading' : 'won';
      var yourMax = l.auction.current + (state === 'outbid' ? -k.minIncrement(l.auction.current, cfg) : k.minIncrement(l.auction.current, cfg) * 3);
      return { listingId: l.id, state: state, yourMax: Math.max(1, yourMax), current: l.auction.current };
    });
    var notifications = [
      { id: 'n1', kind: 'outbid', minutesAgo: 12, listingId: bidSources[1] && bidSources[1].id, text: 'You were outbid.' },
      { id: 'n2', kind: 'ending', minutesAgo: 34, listingId: bidSources[0] && bidSources[0].id, text: 'An auction you are bidding on ends soon.' },
      { id: 'n3', kind: 'sold', minutesAgo: 380, listingId: 'mine-' + simListings[40].id, text: 'Your listing sold.' },
      { id: 'n4', kind: 'price', minutesAgo: 620, listingId: simListings[5].id, text: 'A watched card dropped below your target.' },
      { id: 'n5', kind: 'watch', minutesAgo: 1040, listingId: simListings[9].id, text: 'A card on your watchlist was relisted.' },
      { id: 'n6', kind: 'expired', minutesAgo: 1450, listingId: 'mine-' + simListings[41].id, text: 'Your listing expired without a sale.' },
      { id: 'n7', kind: 'won', minutesAgo: 2100, listingId: bidSources[3] && bidSources[3].id, text: 'You won an auction.' }
    ].filter(function (n) { return n.listingId; });

    // ---- sample inventory for players with no cards yet ----
    function sampleInventory() {
      var rng = k.prng('inventory'), out = [], used = {};
      var wanted = [0, 1, 2, 3, 4, 5, 6, 7];
      var byTier = cards.slice().sort(function (a, b) { return index[a.id].tier - index[b.id].tier; });
      wanted.forEach(function (w, i) {
        var card = byTier[Math.floor((i + 0.5) / wanted.length * (byTier.length - 1))];
        if (used[card.id]) card = byTier[Math.min(byTier.length - 1, byTier.indexOf(card) + 1)];
        used[card.id] = true;
        out.push({ instanceId: 'demo-' + i, cardId: card.id, variantId: i === 3 ? 'rainbow-holo' : null, cardSkinId: null,
          serial: demoSerial(10 + i * 37), packId: packIds[i % packIds.length], pulledAt: 0, seen: true, demo: true });
      });
      return out;
    }

    return {
      cfg: cfg, index: index, cards: cards, cardById: cardById, rarityById: rarityById, variantById: variantById, variantOrder: variantOrder,
      packIds: packIds, personas: PERSONAS,
      valuation: valuation, seriesFor: seriesFor, pathFor: pathFor,
      sellers: { simulation: simSellers, global: globalSellers },
      listings: { simulation: simListings, global: globalListings },
      trades: { simulation: simTrades, global: globalTrades },
      mine: mine, myBids: myBids, notifications: notifications, sampleInventory: sampleInventory,
      byId: (function () { var m = {}; simListings.concat(globalListings, mine.listings).forEach(function (l) { m[l.id] = l; }); return m; })()
    };
  }

  C.market.fixtures = { build: build, SAMPLE_PLAYER_CODE: SAMPLE_PLAYER_CODE, PERSONAS: PERSONAS, demoSerial: demoSerial, ADJECTIVES: ADJECTIVES, NOUNS: NOUNS };
})(window.Cardable = window.Cardable || {});
