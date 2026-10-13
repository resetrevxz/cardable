/* Cardable Market — the Global Market provider (online beta).
 * Presents the online realm in the shapes the Market interface already uses, from the data layer's last known state,
 * and sends the player's actions to the server. The server decides everything: ownership, balance, the 2% fee, bid
 * increments, the close time, who won. This file only asks, and only shows what came back.
 *
 * Nothing is invented. There are no bots here: a realm nobody trades in is empty and says so, and no price, volume
 * or reputation ever comes from the offline Simulation or from a fixture. Quick Sell is the system's disclosed
 * redemption, never a trader. */
(function (C, root) {
  'use strict';
  var online = function () { return C.market.online; };
  var data = function () { return C.market.onlineData; };
  var core = function () { return C.market.core; };
  var MIN = 60000;

  var STATES = {
    unconfigured: { label: 'Not available', tone: 'offline', message: 'Global Market is not available in this build. The Simulation works fully offline.' },
    'signed-out': { label: 'Not connected', tone: 'offline', message: 'Global Market has real players only, under anonymous names. Connect a private account to look around. Your offline game is never touched.' },
    offline: { label: 'Offline', tone: 'offline', message: 'Global Market could not be reached. Keep playing: the Simulation and your collection are unaffected.' },
    error: { label: 'Unavailable', tone: 'offline', message: 'Global Market answered with an error. Nothing was changed. Try again shortly.' },
    online: { label: 'Beta · online', tone: 'online', message: 'Global Market beta: real players only, anonymous names, its own Credits. It may be empty, and prices appear only after players trade.' }
  };
  function stateNow() { var s = online().state; return STATES[s.status] || STATES.error; }
  function isLive() { return online().state.status === 'online'; }
  function notLiveReason() {
    var s = online().state.status;
    return s === 'signed-out' ? 'signed-out' : s === 'unconfigured' ? 'not-connected' : 'offline';
  }
  var ALERT = { count: 0 };
  void ALERT;

  // ---- helpers ---------------------------------------------------------------------------------------------------------
  function open(l) { return (l.status === 'active' || l.status === 'ending') && (!l.endsAt || l.endsAt > data().now()); }
  function emptyListings(realm, reason, loading) {
    return { realm: realm, items: [], nextCursor: null, total: 0, universe: 0, facets: null, asOf: loading ? 'Loading' : 'Players only', source: 'players', emptyReason: reason, loading: !!loading, revision: data().revision };
  }
  function baselineCard(cardId, variantId) {
    var card = C.market.api.data().cardById[cardId];
    if (!card) return null;
    var v = C.valuation.baselineOnly({ cardId: cardId, variantId: variantId || null, cardSkinId: null });
    return { card: card, valuation: v };
  }
  function friendly(error) {
    var code = error && error.code, detail = error && error.detail && error.detail.detail || {};
    var out = { ok: false, error: code || 'failed', message: error && error.message || 'That did not work. Nothing was changed.', detail: detail };
    if (code === 'offline') { out.retrySafe = true; out.message = 'Could not reach Global Market. If you try again with this same button it will not act twice.'; }
    if (code === 'signed-out' || code === 'session-ended' || code === 'bad-token') out.message = 'Connect to Global Market to do that.';
    if (code === 'rate-limited') out.message = 'That is too fast. Wait a moment and try again.';
    if (code === 'conflict' || code === 'busy') out.retrySafe = true;
    if (code === 'funds' && detail.available != null) out.message = 'You have ' + detail.available + ' available Credits.';
    return out;
  }
  function key(requestId) {
    var raw = String(requestId || C.market.ui.sim.newRequestId()).replace(/[^A-Za-z0-9_-]/g, '-');
    return raw.length >= 8 ? raw.slice(0, 80) : ('rq-' + raw + '-00000000').slice(0, 12);
  }
  // One write: ask the server with this request's key, then read everything it touched again.
  function write(method, path, body, requestId, extra) {
    if (!isLive()) return Promise.resolve(Object.assign(friendly({ code: 'signed-out' }), { message: 'Connect to Global Market to do that.' }));
    return online().authed(method, path, body, { idempotencyKey: key(requestId), timeoutMs: 20000 }).then(function (res) {
      data().used();
      var result = Object.assign({ ok: true }, res, extra ? extra(res) : {});
      return data().invalidate().then(function () { return result; }, function () { return result; });
    }, function (error) {
      var out = friendly(error);
      if (['closed', 'conflict', 'price-changed', 'ended', 'not-owned', 'locked'].indexOf(out.error) >= 0) data().invalidate();
      return out;
    });
  }
  function ownedMap() {
    var I = data().state.inventory, owned = {};
    (I.items || []).forEach(function (i) { owned[i.cardId] = (owned[i.cardId] || 0) + 1; });
    return owned;
  }

  // The system's redemption quote, computed from the same fair value the server uses (the server decides at sale).
  function quoteLocal(instance) {
    var spec = { cardId: instance.cardId, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, serial: instance.serial };
    var v = data().valuationFor(spec);
    if (!v) return null;
    var q = C.data.market.quickSell, sf = core().serialFactor(instance.serial, C.data.market), base = Math.max(1, Math.round(v.baseAverage * sf));
    var start = Math.min(Math.max(v.average, Math.ceil(base * q.floorUnderBaseline)), Math.floor(base * q.ceilingOverBaseline));
    return { instanceId: instance.instanceId, quote: Math.max(q.minPrice, Math.floor(start * q.factor)), fair: v.average, basis: v.basis, confidence: v.confidence };
  }

  var provider = {
    capabilities: { counter: true, reprice: true, relist: true, editOrder: true, quickSell: true, serverTime: true },
    owned: function () { return ownedMap(); },
    budget: function () { var s = online().state; return s.status === 'online' ? s.available : null; },
    status: function (realm) {
      var s = online().state, st = stateNow();
      return { realm: realm, state: st.tone, label: st.label, connected: s.status === 'online', live: s.status === 'online', message: st.message, alias: s.alias, imported: s.imported,
        status: s.status, error: s.error, revision: data().revision };
    },
    wallet: function (realm) {
      var s = online().state;
      if (s.status !== 'online') return { realm: realm, balance: null, label: 'Not connected', note: stateNow().message };
      data().used();
      return { realm: realm, balance: s.balance, held: s.held, available: s.available, label: 'Credits',
        note: 'Your Global Market Credits. They are separate from your offline Credits. Open bids, buy orders and offers hold some until they end.' };
    },

    // ---- browsing ----
    listings: function (realm, query) {
      query = query || {};
      if (!isLive()) return emptyListings(realm, notLiveReason(), false);
      data().used();
      var L = data().state.listings;
      if (!L.items) { data().loadListings(false); return emptyListings(realm, L.error ? 'offline' : 'loading', !L.error); }
      data().loadListings(false);
      var k = core(), ctx = C.market.api.context(realm), all = L.items.filter(open), tab = query.tab || 'for-you', sortId = query.sort, base = all;
      if (tab === 'ending') { base = all.filter(function (l) { return l.format === 'auction'; }); sortId = sortId || 'ending'; }
      else if (tab === 'new') sortId = sortId || 'newest';
      else if (tab === 'trending') sortId = sortId || 'popular';
      else sortId = sortId || 'recommended';
      var locked = query.lockFormats && query.lockFormats.length ? base.filter(function (l) { return query.lockFormats.indexOf(l.format) >= 0; }) : base;
      var filtered = k.applyFilters(base, query.filters, ctx), ranks = {};
      var sorted = k.sortListings(filtered, sortId, ctx, { ranks: ranks });
      var page = k.paginate(sorted, query.cursor, query.limit || 24);
      return { realm: realm, items: page.items.map(function (l) { return { listing: l, rank: ranks[l.id] || k.recommend(l, ctx) }; }), nextCursor: page.nextCursor, total: page.total, universe: locked.length,
        facets: query.facets === false ? null : k.facetCounts(base, query.filters, ctx), asOf: 'Live', source: 'players', revision: data().revision, emptyReason: !all.length ? 'no-listings' : page.total ? null : 'no-match' };
    },
    // A page the player just opened or re-filtered asks again when what it holds is a few seconds old.
    listingsAsync: function (realm, query) { var L = data().state.listings; return data().loadListings(!!L.at && Date.now() - L.at > 3000).then(function () { return provider.listings(realm, query); }); },
    tradesAsync: function (realm, query) { var T = data().state.tradesBy[(query || {}).cardId || '*']; return data().loadTrades((query || {}).cardId || null, !!(T && T.at && Date.now() - T.at > 3000)).then(function () { return provider.trades(realm, query); }); },
    listing: function (realm, id) {
      if (!isLive()) return null;
      data().used();
      var ctx = C.market.api.context(realm), e = data().state.details[id], res = null;
      if (e && e.data) {
        data().loadDetail(id, false);
        res = Object.assign({}, e.data);
      } else {
        var cached = (data().state.listings.items || []).find(function (l) { return l.id === id; });
        data().loadDetail(id, false);
        if (!cached) return null;
        res = { listing: cached, card: C.card(cached.card.cardId), similar: [], offers: [], myOffers: [], trades: [] };
      }
      res.rank = core().recommend(res.listing, ctx);
      res.card = res.card || C.card(res.listing.card.cardId);
      return res;
    },
    cardMarket: function (realm, cardId, variantId) {
      var b = baselineCard(cardId, variantId);
      if (!b) return null;
      var owned = ownedMap()[cardId] || 0;
      if (!isLive()) return { card: b.card, valuation: Object.assign({}, b.valuation, { source: 'baseline' }), listings: [], trades: [], variants: [], owned: owned, depth: { asks: [], bids: [] }, myOrders: [] };
      data().used();
      var E = data().state.cards[cardId + '|' + (variantId || '')];
      data().loadCard(cardId, variantId || null, false);
      var v = data().valuationFor({ cardId: cardId, variantId: variantId || null, cardSkinId: null }) || b.valuation;
      if (!E || !E.data) return { card: b.card, valuation: v, listings: [], trades: [], variants: [], owned: owned, depth: { asks: [], bids: [] }, myOrders: [], loading: true };
      return { card: b.card, valuation: v, listings: E.data.listings, trades: E.data.trades, variants: E.data.variants, owned: owned, depth: E.data.depth, myOrders: E.data.myOrders };
    },
    trades: function (realm, query) {
      query = query || {};
      if (!isLive()) return { realm: realm, items: [], nextCursor: null, total: 0, volume: 0 };
      data().used();
      var T = data().state.tradesBy[query.cardId || '*'];
      data().loadTrades(query.cardId || null, false);
      if (!T || !T.items) return { realm: realm, items: [], nextCursor: null, total: 0, volume: 0, loading: true };
      var page = core().paginate(T.items, query.cursor, query.limit || 20);
      return { realm: realm, items: page.items, nextCursor: page.nextCursor, total: T.data.total, volume: T.data.volume };
    },
    // Stage 6 builds trade analytics; until then Global shows exactly what exists: nothing derived, nothing invented.
    stocks: function (realm, query) {
      query = query || {};
      return { realm: realm, empty: false, noData: true, scope: query.scope || 'index', id: query.id || '', window: query.window || '7d', title: 'Global Market', members: 0, candles: [], closes: [], unit: 'Credits',
        source: 'players', leaders: { active: [], gainers: [], losers: [], values: [] }, now: data().now() };
    },
    portfolio: function (realm) {
      var inv = provider.inventory(realm), A = data().state.activity.data, wallet = provider.wallet(realm), by = {}, quick = 0;
      var rar = C.market.api.data().rarityById;
      var holdings = inv.items.map(function (i) {
        var card = C.card(i.cardId), v = data().valuationFor({ cardId: i.cardId, variantId: i.variantId, cardSkinId: i.cardSkinId, serial: i.serial });
        var q = quoteLocal(i);
        if (q) quick += q.quote;
        return { instance: i, card: card, valuation: v, estimate: v ? v.average : 0, basis: null, listing: i._listed || null };
      }).filter(function (h) { return h.card && h.valuation; });
      var total = holdings.reduce(function (n, h) { return n + h.estimate; }, 0);
      holdings.forEach(function (h) { var r = rar[h.card.rarity], k = r ? r.name : h.card.rarity; by[k] = (by[k] || 0) + h.estimate; });
      var mine = A ? A.mine.filter(open) : [], bids = A ? A.bids : [], orders = A ? A.orders.filter(function (o) { return o.status === 'open'; }) : [];
      return { realm: realm, demo: false, quickSellValue: quick, holdings: holdings, total: total, count: holdings.length, byRarity: by, wallet: wallet, realized: null, realizedCount: 0, unrealized: null, unrealizedCount: 0,
        feesPaid: 0, sampleMine: mine, sampleBids: bids, listings: mine, bids: bids, orders: orders, online: true, revision: data().revision };
    },
    activity: function (realm) {
      if (!isLive()) return { realm: realm, notifications: [], mine: [], bids: [], orders: [], offers: [], feed: [], sample: false, revision: data().revision };
      data().used();
      var A = data().state.activity, tr = data().state.tradesBy['*'];
      data().loadActivity(false); data().loadTrades(null, false);
      var d = A.data || { notifications: [], mine: [], bids: [], orders: [], offers: [] };
      var feed = tr && tr.items ? tr.items.map(function (t) {
        var c = C.card(t.cardId);
        return { t: 0, type: t.barter ? 'swap' : 'sale', text: (c ? c.name : t.cardId) + (t.barter ? ' swapped' : ' sold for ' + t.price + ' Credits') + ' · ' + t.seller + ' to ' + t.buyer, minutesAgo: t.minutesAgo, you: t.you, listingId: null };
      }) : [];
      return { realm: realm, notifications: d.notifications, mine: d.mine, bids: d.bids, orders: d.orders, offers: d.offers, feed: feed, sample: false, revision: data().revision, loading: !A.data };
    },
    inventory: function () {
      if (!isLive()) return { items: [], demo: false, online: true };
      data().used();
      var I = data().state.inventory;
      data().loadInventory(false);
      return { items: I.items || [], demo: false, online: true, loading: !I.items };
    },
    valuation: function (realm, spec) {
      if (isLive()) data().wantValuation({ cardId: spec.cardId, variantId: spec.variantId || null, cardSkinId: spec.cardSkinId || null });
      return data().valuationFor({ cardId: spec.cardId, variantId: spec.variantId || null, cardSkinId: spec.cardSkinId || null, serial: spec.serial || null });
    },
    suggest: function (realm, text) {
      var q = String(text || '').trim().toLowerCase();
      if (!q) return { cards: [], listings: [], sellers: [] };
      var cards = C.data.cards.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
      var all = (data().state.listings.items || []).filter(open), listings = core().applyFilters(all, { q: text }, C.market.api.context(realm)).slice(0, 4), seen = {}, sellers = [];
      all.forEach(function (l) { if (l.seller.alias.toLowerCase().indexOf(q) >= 0 && !seen[l.seller.alias]) { seen[l.seller.alias] = true; sellers.push(l.seller); } });
      return { cards: cards, listings: listings, sellers: sellers.slice(0, 3) };
    },
    // The interface asks before it mounts a page: a page that needs the server's answer waits for it, with a loading state.
    prefetch: function (name, params) {
      if (!isLive()) return null;
      var d = data(), S = d.state, fresh = function (at, ttl) { return at && Date.now() - at < ttl; };
      params = params || {};
      if (name === 'listing') { var e = S.details[params.id]; if (e && e.data) return null; return d.loadDetail(params.id, false); }
      if (name === 'card') { var c = S.cards[params.id + '|' + (params.variant || '')]; if (c && c.data) return null; return d.loadCard(params.id, params.variant || null, false); }
      if (name === 'compose') return S.inventory.items ? null : d.loadInventory(false);
      if (['portfolio', 'activity', 'my-listings', 'orders', 'offers'].indexOf(name) >= 0) {
        var waits = [];
        if (!S.activity.data) waits.push(d.loadActivity(false));
        if (!S.inventory.items) waits.push(d.loadInventory(false));
        return waits.length ? Promise.all(waits) : null;
      }
      void fresh;
      return null;
    }
  };

  // ---- actions ---------------------------------------------------------------------------------------------------------------
  function listingResult(res) { return { listing: { id: res.listingId } }; }
  function wantsOf(spec) {
    // the composer's rule (card or rarity or any, worth at least a share) as the server's conditions
    var w = spec.wants || {}, out = {};
    if (w.cardId) out.cardIds = [w.cardId];
    if (w.rarity) { var r = C.data.rarities.find(function (x) { return x.id === w.rarity; }); if (r) out.minTier = r.tier; }
    if (w.minFrac) out.minValuePct = Math.max(1, Math.round(w.minFrac * 100));
    return out;
  }
  var actions = {
    purchase: function (realm, id, requestId) {
      var l = data().state.details[id] && data().state.details[id].data && data().state.details[id].data.listing || (data().state.listings.items || []).find(function (x) { return x.id === id; });
      return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/buy', { expectedPrice: l ? l.ask : undefined }, requestId, function (r) { return { listing: { id: id }, receiptId: r.receiptId }; });
    },
    placeBid: function (realm, id, max, requestId) { return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/bid', { max: Math.floor(Number(max)) }, requestId, function (r) { return { listing: { id: id }, leading: r.leading }; }); },
    buyout: function (realm, id, requestId) { return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/buyout', {}, requestId, function () { return { listing: { id: id } }; }); },
    publishListing: function (realm, spec) {
      var body = { kind: spec.kind, instanceIds: spec.instanceIds, title: spec.title || '', note: spec.note || '', durationMs: spec.durationMs };
      if (spec.kind === 'fixed') body.ask = spec.ask;
      if (spec.kind === 'auction') { body.start = spec.start; body.reserve = spec.reserve; body.buyout = spec.buyout; if (spec.step) body.step = spec.step; }
      if (spec.kind === 'swap') { body.wants = wantsOf(spec); if (spec.minTopUp) body.minTopUp = spec.minTopUp; }
      return write('POST', '/v1/listings', body, spec.requestId, listingResult);
    },
    cancelListing: function (realm, id) { return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/cancel', {}, C.market.ui.sim.newRequestId(), function () { return { listing: { id: id } }; }); },
    repriceListing: function (realm, id, ask, requestId) { return write('PUT', '/v1/listings/' + encodeURIComponent(id), { ask: Math.floor(Number(ask)) }, requestId, function () { return { listing: { id: id } }; }); },
    relistListing: function (realm, id, requestId) { return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/relist', {}, requestId, listingResult); },
    placeOrder: function (realm, spec) {
      return write('POST', '/v1/orders', { cardId: spec.c, variantId: spec.v || null, anyFinish: !!spec.anyFinish, skinId: spec.k || null, anySkin: !spec.k, maxPrice: spec.maxPrice, quantity: spec.quantity || 1, durationMs: spec.durationMs }, spec.requestId);
    },
    editOrder: function (realm, id, spec, requestId) { return write('PUT', '/v1/orders/' + encodeURIComponent(id), spec, requestId); },
    cancelOrder: function (realm, id) { return write('POST', '/v1/orders/' + encodeURIComponent(id) + '/cancel', {}, C.market.ui.sim.newRequestId()); },
    makeOffer: function (realm, spec) { return write('POST', '/v1/offers', { listingId: spec.listingId, instanceIds: spec.instanceIds, cash: spec.cash || 0, message: spec.message || '' }, spec.requestId); },
    respondToOffer: function (realm, id, accept, requestId) { return write('POST', '/v1/offers/' + encodeURIComponent(id) + '/' + (accept ? 'accept' : 'decline'), {}, requestId); },
    counterOffer: function (realm, id, terms, requestId) { return write('POST', '/v1/offers/' + encodeURIComponent(id) + '/counter', terms, requestId); },
    withdrawOffer: function (realm, id) { return write('POST', '/v1/offers/' + encodeURIComponent(id) + '/withdraw', {}, C.market.ui.sim.newRequestId()); },
    quickSell: function (realm, spec) {
      return write('POST', '/v1/sell', { instanceIds: spec.instanceIds, expectTotal: spec.expectTotal }, spec.requestId);
    }
  };
  Object.keys(actions).forEach(function (k) { provider[k] = actions[k]; });

  // The disclosed price list for Quick Sell: always asked of the server at the moment of sale.
  provider.quoteQuickSell = function (instanceIds) {
    return online().authed('GET', '/v1/sell/quote?ids=' + instanceIds.map(encodeURIComponent).join(',')).then(function (d) { data().learn(d.serverNow); return Object.assign({ ok: true }, d); }, friendly);
  };
  provider.quoteLocal = quoteLocal;
  provider.mapWants = wantsOf;

  C.market.onlineProvider = provider;
  C.events.on('app:ready', function () {
    if (C.market.api) C.market.api.registerProvider('global', provider);
    // The interface redraws its header and an open Global page when the connection state changes.
    var last = '';
    online().subscribe(function (s) {
      var k = s.status + ':' + s.alias + ':' + s.imported;
      if (k !== last) {
        last = k;
        if (s.status !== 'online') data().reset();
        if (C.market.store) C.market.store.emit('online');
      } else data().changed();
    });
  });
})(window.Cardable = window.Cardable || {}, window);
