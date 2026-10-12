/* Cardable Market — integration interface.
 * The UI talks only to C.market.api. In Stage 1 each realm is served by the sample-data provider defined here.
 * Stage 2 registers the offline simulator for 'simulation'; Stage 4 registers the online client for 'global'.
 * Reads resolve with plain data. Writes are declared but unavailable: they reject with a typed error and the UI
 * must present them as a preview, never as a completed trade.
 */
(function (C) {
  'use strict';
  C.market = C.market || {};
  var K = function () { return C.market.core; };

  var CONTRACT = {
    version: 1,
    reads: ['status', 'wallet', 'listings', 'listing', 'cardMarket', 'trades', 'stocks', 'portfolio', 'activity', 'inventory', 'suggest'],
    writes: ['purchase', 'placeBid', 'publishListing', 'cancelListing', 'makeOffer', 'respondToOffer', 'quickSell'],
    errors: { 'not-connected': 'This realm is not connected in this build.', 'preview-only': 'This is a preview. Nothing was changed.' }
  };

  var providers = {}, dataset = null, datasetKey = '';

  function catalogKey() { return C.data.cards.length + ':' + C.data.rarities.length + ':' + C.data.variants.length; }
  function data() {
    var key = catalogKey();
    if (!dataset || datasetKey !== key) {
      dataset = C.market.fixtures.build({ cards: C.data.cards, rarities: C.data.rarities, variants: C.data.variants, packs: C.data.packs });
      datasetKey = key; ctxCache = null;
    }
    return dataset;
  }

  // ---- player facts, read-only ----
  function playerState() {
    var s = C.state && C.state.current;
    var inventory = s && Array.isArray(s.inventory) ? s.inventory : [];
    var owned = {};
    inventory.forEach(function (i) { if (i && i.cardId) owned[i.cardId] = (owned[i.cardId] || 0) + 1; });
    var wishlist = {};
    try {
      var cols = s && s.inventoryUi && s.inventoryUi.collections || [];
      cols.forEach(function (c) { if (c.kind === 'wishlist' && Array.isArray(c.cardIds)) c.cardIds.forEach(function (id) { wishlist[id] = true; }); });
    } catch (_) { /* a damaged optional record never blocks the market */ }
    return { currency: s && typeof s.currency === 'number' ? s.currency : 0, inventory: inventory, owned: owned, wishlist: wishlist };
  }
  var ctxCache = null;
  function baseContext() {
    var d = data();
    if (!ctxCache) {
      ctxCache = { cards: d.cardById, rarities: d.rarityById, variants: d.variantById, variantOrder: d.variantOrder };
    }
    return ctxCache;
  }
  function context(realm) {
    var p = playerState(), watch = C.market.store ? C.market.store.watching() : {};
    // A Secret card that is not yet found stays concealed: it is searched and shown under its concealed name.
    var concealed = {}, base = baseContext();
    Object.keys(base.cards).forEach(function (id) {
      var r = base.rarities[base.cards[id].rarity];
      if (r && r.finish === 'secret' && !p.owned[id]) concealed[id] = true;
    });
    return Object.assign({}, base, {
      budget: realm === 'simulation' ? p.currency : null,
      owned: p.owned, wishlist: p.wishlist, watch: watch, concealed: concealed
    });
  }

  // ---- sample provider ----
  function realmListings(realm) {
    var d = data(), session = C.market.store.session;
    if (realm === 'global' && !session.showGlobalSample) return [];
    return d.listings[realm] || [];
  }
  function inFeed(l) { return l.status === 'active' || l.status === 'ending'; }
  function tabFilter(tab, items, ctx) {
    var list = items;
    if (tab === 'new') return { items: list, sort: 'newest' };
    if (tab === 'ending') return { items: list.filter(function (l) { return l.format === 'auction'; }), sort: 'ending' };
    if (tab === 'trending') return { items: list, sort: 'popular' };
    return { items: list, sort: 'recommended' };
  }
  var sampleProvider = {
    status: function (realm) {
      var def = C.data.market.realms.find(function (r) { return r.id === realm; });
      var sample = realm === 'global' && C.market.store.session.showGlobalSample;
      return { realm: realm, state: def.state, label: sample ? 'Sample layout' : def.stateLabel, connected: false, message: C.data.market.notices[sample ? 'globalSample' : realm] };
    },
    wallet: function (realm) {
      if (realm === 'global') return { realm: realm, balance: null, label: 'Not connected', note: 'Global Market has its own wallet. It appears when you connect.' };
      return { realm: realm, balance: playerState().currency, label: 'Credits', note: 'Your offline Credits. Simulation trades will keep a separate ledger.' };
    },
    listings: function (realm, query) {
      query = query || {};
      var d = data(), ctx = context(realm), k = K();
      var all = realmListings(realm).filter(inFeed);
      var tab = tabFilter(query.tab || 'for-you', all, ctx);
      // A page locked to one listing type counts only that type as its whole.
      var locked = query.lockFormats && query.lockFormats.length ? tab.items.filter(function (l) { return query.lockFormats.indexOf(l.format) >= 0; }) : tab.items;
      var sortId = query.sort || tab.sort;
      var filtered = k.applyFilters(tab.items, query.filters, ctx);
      var ranks = {};
      var sorted = k.sortListings(filtered, sortId, ctx, { ranks: ranks });
      var limit = query.limit || 24;
      var page = k.paginate(sorted, query.cursor, limit);
      var items = page.items.map(function (l) { return { listing: l, rank: ranks[l.id] || k.recommend(l, ctx) }; });
      return {
        realm: realm, items: items, nextCursor: page.nextCursor, total: page.total, universe: locked.length,
        facets: query.facets === false ? null : k.facetCounts(tab.items, query.filters, ctx), asOf: 'Sample snapshot',
        source: realm === 'simulation' ? 'fixture-simulation' : 'fixture-global-sample',
        emptyReason: !all.length ? (realm === 'global' ? 'not-connected' : 'no-listings') : page.total ? null : 'no-match'
      };
    },
    listing: function (realm, id) {
      var d = data(), l = d.byId[id];
      if (!l) return null;
      var ctx = context(l.realm || realm);
      return { listing: l, rank: K().recommend(l, ctx), card: d.cardById[l.card.cardId], similar: d.listings[l.realm || realm].filter(function (x) { return x.id !== l.id && x.card.cardId === l.card.cardId && inFeed(x); }).slice(0, 6) };
    },
    cardMarket: function (realm, cardId, variantId) {
      var d = data(), card = d.cardById[cardId];
      if (!card) return null;
      var v = d.valuation({ cardId: cardId, variantId: variantId || null, cardSkinId: null });
      if (!v) return null;
      var listings = realmListings(realm).filter(function (l) { return l.card.cardId === cardId && inFeed(l); });
      var trades = (realm === 'global' && !C.market.store.session.showGlobalSample ? [] : d.trades[realm]).filter(function (t) { return t.cardId === cardId; }).slice(0, 8);
      var variants = {};
      realmListings(realm).forEach(function (l) { if (l.card.cardId === cardId && l.card.variantId) variants[l.card.variantId] = true; });
      return { card: card, valuation: v, listings: listings, trades: trades, variants: Object.keys(variants), owned: (playerState().owned[cardId] || 0) };
    },
    trades: function (realm, query) {
      query = query || {};
      var d = data(), source = realm === 'global' && !C.market.store.session.showGlobalSample ? [] : d.trades[realm];
      var items = source.filter(function (t) { return !query.cardId || t.cardId === query.cardId; });
      var page = K().paginate(items, query.cursor, query.limit || 20);
      return { realm: realm, items: page.items, nextCursor: page.nextCursor, total: page.total, volume: items.reduce(function (n, t) { return n + t.price; }, 0) };
    },
    stocks: function (realm, query) {
      query = query || {};
      var d = data(), k = K(), windowId = query.window || '7d', hours = k.WINDOWS[windowId].hours;
      var scope = query.scope || 'index', id = query.id || '';
      var members = d.cards;
      var title = 'Cardable Index';
      if (scope === 'rarity') { members = d.cards.filter(function (c) { return c.rarity === id; }); title = (d.rarityById[id] || {}).name || id; }
      else if (scope === 'brand') { members = d.cards.filter(function (c) { return c.brand === id; }); title = id; }
      else if (scope === 'generation') { members = d.cards.filter(function (c) { return c.generation === id; }); title = (C.data.generations.find(function (g) { return g.id === id; }) || {}).name || id; }
      else if (scope === 'card') { members = d.cardById[id] ? [d.cardById[id]] : []; title = members[0] ? members[0].name : id; }
      if (!members.length) return { realm: realm, empty: true, title: title, scope: scope, id: id, window: windowId };
      var out = { realm: realm, scope: scope, id: id, window: windowId, title: title, members: members.length };
      if (scope === 'card') {
        var s = d.seriesFor(id, query.variantId || null, windowId);
        out.valuation = s.valuation; out.candles = s.candles; out.closes = s.candles.map(function (c) { return c.close; });
        out.unit = 'Credits';
      } else {
        var paths = members.map(function (c) { var v = d.valuation({ cardId: c.id }); return d.pathFor(v.key, v.average, v.volatility, hours); });
        var path = k.indexPath(paths, hours);
        var bucket = k.WINDOWS[windowId].bucket, candles = [];
        for (var i = 0; i < path.length; i += bucket) {
          var chunk = path.slice(i, i + bucket), hi = Math.max.apply(null, chunk), lo = Math.min.apply(null, chunk);
          candles.push({ t: i, open: chunk[0], close: chunk[chunk.length - 1], high: hi, low: lo, volume: Math.round(members.length * 0.9 * chunk.length * (0.6 + (hi - lo) / 6)) });
        }
        out.candles = candles; out.closes = candles.map(function (c) { return c.close; }); out.unit = 'Index points';
        var vals = members.map(function (c) { return d.valuation({ cardId: c.id }); });
        out.aggregate = {
          volume24h: vals.reduce(function (n, v) { return n + v.volume24h; }, 0), volume7d: vals.reduce(function (n, v) { return n + v.volume7d; }, 0),
          credits24h: vals.reduce(function (n, v) { return n + v.credits24h; }, 0),
          change24h: k.windowChange(path, 24), change7d: k.windowChange(path, Math.min(168, path.length - 1)),
          volatility: vals.reduce(function (n, v) { return n + v.volatility; }, 0) / vals.length,
          liquidity: vals.reduce(function (n, v) { return n + v.liquidity; }, 0) / vals.length,
          spread: vals.reduce(function (n, v) { return n + v.spread; }, 0) / vals.length,
          samples: vals.reduce(function (n, v) { return n + v.samples; }, 0)
        };
      }
      // Leading cards: the most liquid and the biggest movers inside the scope.
      var scored = members.map(function (c) { var v = d.valuation({ cardId: c.id }); return { card: c, valuation: v }; }).filter(function (x) { return x.valuation.samples > 0; });
      out.leaders = {
        active: scored.slice().sort(function (a, b) { return b.valuation.volume7d - a.valuation.volume7d; }).slice(0, 6),
        gainers: scored.slice().sort(function (a, b) { return (b.valuation.change7d || 0) - (a.valuation.change7d || 0); }).slice(0, 5),
        losers: scored.slice().sort(function (a, b) { return (a.valuation.change7d || 0) - (b.valuation.change7d || 0); }).slice(0, 5),
        values: scored.slice().sort(function (a, b) { return (a.valuation.average ? (a.valuation.lowestAsk / a.valuation.average) : 9) - (b.valuation.average ? (b.valuation.lowestAsk / b.valuation.average) : 9); }).slice(0, 5)
      };
      return out;
    },
    portfolio: function (realm) {
      var d = data(), p = playerState(), items = p.inventory;
      var demo = false;
      if (!items.length) { items = d.sampleInventory(); demo = true; }
      var holdings = items.map(function (i) {
        var v = d.valuation({ cardId: i.cardId, variantId: i.variantId || null, cardSkinId: i.cardSkinId || null });
        return { instance: i, card: d.cardById[i.cardId], valuation: v, estimate: v ? v.average : 0 };
      }).filter(function (h) { return h.card && h.valuation; });
      var total = holdings.reduce(function (n, h) { return n + h.estimate; }, 0);
      var byTier = {};
      holdings.forEach(function (h) { var r = d.rarityById[h.card.rarity]; var key = r ? r.name : h.card.rarity; byTier[key] = (byTier[key] || 0) + h.estimate; });
      return { realm: realm, demo: demo, holdings: holdings, total: total, count: holdings.length, byRarity: byTier,
        wallet: sampleProvider.wallet(realm), realized: null, unrealized: null,
        sampleMine: d.mine.listings, sampleBids: d.myBids };
    },
    activity: function (realm) {
      var d = data();
      return { realm: realm, notifications: d.notifications, mine: d.mine.listings, bids: d.myBids, sample: true };
    },
    inventory: function () {
      var p = playerState();
      if (p.inventory.length) return { items: p.inventory, demo: false };
      return { items: data().sampleInventory(), demo: true };
    },
    suggest: function (realm, text) {
      var d = data(), k = K(), q = String(text || '').trim().toLowerCase();
      if (!q) return { cards: [], listings: [], sellers: [] };
      var cards = d.cards.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || String(c.brand || '').toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
      var listings = k.applyFilters(realmListings(realm).filter(inFeed), { q: text }, context(realm)).slice(0, 4);
      var seen = {}, sellers = [];
      realmListings(realm).forEach(function (l) { if (l.seller.alias.toLowerCase().indexOf(q) >= 0 && !seen[l.seller.alias]) { seen[l.seller.alias] = true; sellers.push(l.seller); } });
      return { cards: cards, listings: listings, sellers: sellers.slice(0, 3) };
    }
  };
  function unavailable(name) {
    return function () {
      return Promise.reject(Object.assign(new Error(CONTRACT.errors['preview-only']), { code: 'preview-only', method: name }));
    };
  }
  CONTRACT.writes.forEach(function (name) { sampleProvider[name] = unavailable(name); });
  providers.simulation = sampleProvider;
  providers.global = sampleProvider;

  function resolve(realm) { return providers[realm] || sampleProvider; }
  var api = {
    contract: CONTRACT,
    data: data,
    context: context,
    playerState: playerState,
    registerProvider: function (realm, provider) {
      CONTRACT.reads.concat(CONTRACT.writes).forEach(function (m) { if (typeof provider[m] !== 'function') throw new Error('Market provider is missing ' + m); });
      providers[realm] = provider;
    },
    providerFor: resolve
  };
  CONTRACT.reads.forEach(function (name) {
    api[name] = function () {
      var args = Array.prototype.slice.call(arguments), realm = args[0] || C.market.store.session.realm;
      try { return Promise.resolve(resolve(realm)[name].apply(null, args)); } catch (error) { return Promise.reject(error); }
    };
    // A synchronous twin for rendering paths that already hold the provider's sample data in memory.
    api[name + 'Sync'] = function () { var args = Array.prototype.slice.call(arguments); return resolve(args[0] || C.market.store.session.realm)[name].apply(null, args); };
  });
  CONTRACT.writes.forEach(function (name) { api[name] = function () { var args = Array.prototype.slice.call(arguments); return resolve(args[0] || C.market.store.session.realm)[name].apply(null, args); }; });
  C.market.api = api;
})(window.Cardable = window.Cardable || {});
