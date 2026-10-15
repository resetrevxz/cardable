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

  // The interface's valuation, filled from the server's analytics: only what completed player sales say, with the
  // targets from executions, demand and spread. Anything the server withheld stays null.
  function fromAnalytics(spec, an) {
    var base = data().valuationFor(spec) || C.valuation.baselineOnly(spec) || {};
    var ch = function (k) { return an.change[k] ? an.change[k].pct : null; };
    var bidsOpen = (an.depth.bids || []).reduce(function (n, x) { return n + x.count; }, 0), asksOpen = (an.depth.asks || []).reduce(function (n, x) { return n + x.count; }, 0);
    return Object.assign({}, base, {
      average: an.averageValue != null ? an.averageValue : an.fairValue, fairValue: an.fairValue, averageValue: an.averageValue, mechanic: an.mechanic,
      samples: an.observed ? an.observed.units : 0, confidence: an.confidence, basis: an.observed ? 'sales' : 'baseline', observed: an.observed,
      lastSale: an.last ? an.last.price : null, lastAt: an.last ? an.last.at : null,
      change24h: ch('h24'), change7d: ch('d7'), change30d: ch('d30'), change90d: ch('d90'), changeAll: ch('all'),
      bestBid: an.bestBid != null ? an.bestBid : base.bestBid, bidReal: an.bestBid != null, lowestAsk: an.lowestAsk != null ? an.lowestAsk : base.lowestAsk, askReal: an.lowestAsk != null,
      spread: an.spread.pct, spreadReal: an.spread.real, spreadAbs: an.spread.abs,
      targetBuy: an.target.buy.high, targetSell: an.target.sell.low, targetBuyLow: an.target.buy.low, targetSellHigh: an.target.sell.high, targetBasis: an.basis,
      suggestedAsk: an.suggestedAsk, expectedProceeds: an.expectedProceeds, expectedFee: an.expectedFee,
      volume24h: an.volume.h24.units, volume7d: an.volume.d7.units, volume30d: an.volume.d30.units, credits24h: an.volume.h24.credits, credits7d: an.volume.d7.credits, credits30d: an.volume.d30.credits,
      range30: an.range30, volatility: an.volatility, liquidity: an.liquidity, turnover7d: an.turnover7d, supply: an.supply,
      openAsks: asksOpen, openBids: bidsOpen, depth: an.depth, timeToSell: an.timeToSell, timeToSellHours: an.timeToSell ? an.timeToSell.medianHours : null,
      inputs: an.inputs, windowHours: an.timeToSell ? an.timeToSell.medianHours : base.windowHours, source: 'players', analytics: an
    });
  }
  function leaderList(list) {
    return (list || []).map(function (x) { return { card: C.card(x.cardId), valuation: x.valuation }; }).filter(function (x) { return x.card; });
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
      var A = data().state.analytics[cardId + '|' + (variantId || '') + '|7d'];
      data().loadAnalytics(cardId, variantId || null, '7d', false);
      if (A && A.data) v = fromAnalytics({ cardId: cardId, variantId: variantId || null, cardSkinId: null }, A.data.analytics);
      if (!E || !E.data) return { card: b.card, valuation: v, listings: [], trades: [], variants: [], owned: owned, depth: { asks: [], bids: [] }, myOrders: [], loading: true, analytics: A && A.data ? A.data.analytics : null };
      return { card: b.card, valuation: v, listings: E.data.listings, trades: E.data.trades, variants: E.data.variants, owned: owned, depth: E.data.depth, myOrders: E.data.myOrders, analytics: A && A.data ? A.data.analytics : null };
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
    // Charts and totals come only from completed, authenticated player-to-player sales on the server. Nothing here is
    // drawn from a quote, a Quick Sell, a swap, a fixture or the Simulation.
    stocks: function (realm, query) {
      query = query || {};
      var q = { scope: query.scope || 'index', id: query.id || '', variantId: query.variantId || null, window: query.window || '7d' };
      var none = { realm: realm, empty: false, noData: true, scope: q.scope, id: q.id, window: q.window, title: 'Global Market', members: 0, candles: [], closes: [], unit: q.scope === 'card' ? 'Credits' : 'Index points',
        source: 'players', leaders: { active: [], gainers: [], losers: [], values: [] }, now: data().now(), tradesCounted: 0, coverage: null,
        aggregate: { volume24h: 0, volume7d: 0, credits24h: 0, change24h: null, change7d: null, volatility: null, liquidity: null, spread: null, samples: 0, cardsTraded: 0 } };
      if (!isLive()) return none;
      data().used();
      var E = data().state.stocksBy[data().stocksKey(q)];
      data().loadStocks(q, false);
      if (!E || !E.data) return Object.assign(none, { loading: true });
      var d = E.data;
      if (d.empty) return { realm: realm, empty: true, title: d.title, scope: q.scope, id: q.id, window: q.window };
      var out = { realm: realm, scope: d.scope, id: d.id, window: d.window, title: d.title, members: d.members, candles: d.candles, closes: d.candles.map(function (c) { return c.close; }), unit: d.unit,
        source: 'players', now: data().now(), tradesCounted: d.tradesCounted, coverage: d.coverage, truncated: !!d.truncated, cache: d.cache };
      if (d.scope === 'card') {
        out.valuation = fromAnalytics({ cardId: d.id, variantId: q.variantId, cardSkinId: null }, d.analytics);
        out.analytics = d.analytics;
        out.leaders = { active: [], gainers: [], losers: [], values: [] };
      } else {
        out.aggregate = d.aggregate; out.leaders = { active: leaderList(d.leaders.active), gainers: leaderList(d.leaders.gainers), losers: leaderList(d.leaders.losers), values: leaderList(d.leaders.values) };
      }
      return out;
    },
    stocksAsync: function (realm, query) {
      query = query || {};
      var q = { scope: query.scope || 'index', id: query.id || '', variantId: query.variantId || null, window: query.window || '7d' };
      return data().loadStocks(q, false).then(function () { return provider.stocks(realm, query); });
    },
    // Lists for the Explore shelves: who is moving, who is busy, what just sold. All from real sales.
    movers: function () {
      if (!isLive()) return null;
      data().used(); data().loadMovers(false);
      var M = data().state.movers.data;
      if (!M) return null;
      var wrap = function (list) { return (list || []).map(function (x) { return Object.assign({ card: C.card(x.cardId) }, x); }).filter(function (x) { return x.card; }); };
      return { rising: wrap(M.rising), falling: wrap(M.falling), trending: wrap(M.trending), active: wrap(M.active), liquid: wrap(M.liquid),
        recentlySold: (M.recentlySold || []).map(function (x) { return Object.assign({ card: C.card(x.cardId) }, x, { minutesAgo: Math.max(0, (data().now() - x.at) / 60000) }); }).filter(function (x) { return x.card; }), cardsTraded: M.cardsTraded };
    },
    preferences: function () {
      var I = data().state.inventory;
      return I.items && I.items.length ? core().preferences(I.items, C.market.api.data().cardById) : null;
    },
    alerts: function () {
      if (!isLive()) return { items: [], limit: 20, loading: false };
      data().loadAlerts(false);
      var A = data().state.alerts;
      return A.data ? A.data : { items: [], limit: 20, loading: true };
    },
    createAlert: function (spec) {
      return online().authed('POST', '/v1/alerts', spec).then(function (r) { data().state.alerts.at = 0; return data().loadAlerts(true).then(function () { return Object.assign({ ok: true }, r); }); }, friendly);
    },
    deleteAlert: function (id) {
      return online().authed('DELETE', '/v1/alerts/' + encodeURIComponent(id)).then(function (r) { return data().loadAlerts(true).then(function () { return Object.assign({ ok: true }, r); }); }, friendly);
    },
    exportUrl: function (what, format) { return online().base() + '/v1/export?what=' + what + '&format=' + format; },
    downloadExport: function (what, format) {
      // The file is fetched with the player's own token and saved from memory: the token never goes in a URL.
      var b = online().base();
      return online().ensureToken().then(function (token) {
        return root.fetch(b + '/v1/export?what=' + what + '&format=' + format, { headers: { authorization: 'Bearer ' + token }, credentials: 'omit', cache: 'no-store' });
      }).then(function (res) { if (!res.ok) throw new Error('The export could not be made.'); return res.text(); });
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
      // The server keeps the books (cost basis, realized profit, fees); the interface only lays them out.
      data().loadPortfolio(false);
      var P = data().state.portfolio.data, byInst = {};
      if (P) P.holdings.forEach(function (h) { byInst[h.instanceId] = h; });
      holdings.forEach(function (h) { var s = byInst[h.instance.instanceId]; if (s) { h.basis = s.basis == null ? null : s.basis; h.noBasis = s.basis == null; h.acquiredVia = s.acquiredVia; } });
      return { realm: realm, demo: false, quickSellValue: P ? P.quickSellValue : quick, holdings: holdings, total: total, count: holdings.length, byRarity: by, wallet: wallet,
        realized: P ? P.realized.profit : null, realizedCount: P ? P.realized.sales.withBasis + P.realized.quickSell.withBasis : 0,
        unrealized: P && P.unrealized ? P.unrealized.change : null, unrealizedCount: P && P.unrealized ? P.unrealized.cards : 0,
        feesPaid: P ? P.realized.feesPaid : 0, tradesSold: P ? P.realized.sales.count : 0, tradesBought: P ? P.realized.bought.count : 0, volumeSold: P ? P.realized.sales.volume : 0, volumeBought: P ? P.realized.bought.volume : 0,
        reserved: P ? P.reserved : null, cardsInEscrow: P ? P.cards.inEscrow : 0, noCostBasis: P ? P.cards.noCostBasis : null, confidence: P ? P.marks.confidence : null, confidenceShare: P ? P.marks.confidenceShare : null,
        convention: P ? P.convention : null, server: !!P,
        sampleMine: mine, sampleBids: bids, listings: mine, bids: bids, orders: orders, online: true, revision: data().revision };
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
      if (name === 'card') {
        var c = S.cards[params.id + '|' + (params.variant || '')], an = S.analytics[params.id + '|' + (params.variant || '') + '|7d'];
        var cw = [];
        if (!(c && c.data)) cw.push(d.loadCard(params.id, params.variant || null, false));
        if (!(an && an.data)) cw.push(d.loadAnalytics(params.id, params.variant || null, '7d', false));
        return cw.length ? Promise.all(cw) : null;
      }
      if (name === 'stocks') {
        var st = C.market.store.session.stocks || {}, q = { scope: st.scope || 'index', id: st.id || '', variantId: st.variantId || null, window: st.window || C.settings.get('marketWindow') || '7d' };
        var se = S.stocksBy[d.stocksKey(q)];
        return se && se.data ? null : d.loadStocks(q, false);
      }
      if (name === 'alerts') return S.alerts.data ? null : d.loadAlerts(false);
      if (name === 'profile') { var pe = S.profiles[String(params.alias || '').toLowerCase()]; return pe && pe.data ? null : d.loadProfile(params.alias, false); }
      if (name === 'compare') {
        var cmp = C.market.store.compareList().filter(function (x) { return x.realm === 'global'; });
        var cws = cmp.filter(function (x) { var a = S.analytics[x.cardId + '|' + (x.variantId || '') + '|7d']; return !(a && a.data); }).map(function (x) { return d.loadAnalytics(x.cardId, x.variantId || null, '7d', false); });
        return cws.length ? Promise.all(cws) : null;
      }
      if (['discover', 'auctions', 'buy-now', 'trades'].indexOf(name) >= 0) { d.loadMovers(false); return null; }
      if (name === 'compose') return S.inventory.items ? null : d.loadInventory(false);
      if (['portfolio', 'activity', 'my-listings', 'orders', 'offers'].indexOf(name) >= 0) {
        var waits = [];
        if (!S.activity.data) waits.push(d.loadActivity(false));
        if (!S.inventory.items) waits.push(d.loadInventory(false));
        if (name === 'portfolio' && !S.portfolio.data) waits.push(d.loadPortfolio(false));
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
    // The caller passes the price that was on the screen when the player confirmed; it is never read from a cache.
    purchase: function (realm, id, requestId, expectedPrice) {
      if (!(Number.isSafeInteger(expectedPrice) && expectedPrice >= 1)) return Promise.resolve({ ok: false, error: 'price-required', message: 'Review the price and try again.' });
      return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/buy', { expectedPrice: expectedPrice }, requestId, function (r) { return { listing: { id: id }, receiptId: r.receiptId }; });
    },
    placeBid: function (realm, id, max, requestId) { return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/bid', { max: Math.floor(Number(max)) }, requestId, function (r) { return { listing: { id: id }, leading: r.leading }; }); },
    buyout: function (realm, id, requestId, expectedPrice) {
      if (!(Number.isSafeInteger(expectedPrice) && expectedPrice >= 1)) return Promise.resolve({ ok: false, error: 'price-required', message: 'Review the price and try again.' });
      return write('POST', '/v1/listings/' + encodeURIComponent(id) + '/buyout', { expectedPrice: expectedPrice }, requestId, function () { return { listing: { id: id } }; });
    },
    publishListing: function (realm, spec) {
      var body = { kind: spec.kind, instanceIds: spec.instanceIds, title: spec.title || '', note: spec.note || '', durationMs: spec.durationMs };
      if (spec.kind === 'fixed') body.ask = spec.ask;
      if (spec.kind === 'auction') { body.start = spec.start; body.reserve = spec.reserve; body.buyout = spec.buyout; if (spec.step) body.step = spec.step; }
      if (spec.kind === 'swap') { body.wants = wantsOf(spec); if (spec.minTopUp) body.minTopUp = spec.minTopUp; }
      // pictures are earlier, explicit uploads: only their ids and the crop travel here
      if (spec.images && spec.images.length) { body.images = spec.images.map(function (i) { return { uploadId: i.uploadId, alt: i.alt || '' }; }); body.cover = spec.cover || { layout: 'banner', zoom: 1, x: 50, y: 50 }; }
      if (spec.treatment && spec.treatment !== 'none') body.treatment = spec.treatment;
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

  // ---- the social layer ----------------------------------------------------------------------------------------------------
  // Reads come from the data layer's last answer and ask again in the background; writes use a key and read again.
  function slotOf(map, k) { return map[k] || { data: null, loading: false }; }
  function post(method, path, body, touch) {
    if (!isLive()) return Promise.resolve(Object.assign(friendly({ code: 'signed-out' }), { message: 'Connect to Global Market to do that.' }));
    return online().authed(method, path, body || null, { idempotencyKey: key(C.market.ui.sim.newRequestId()), timeoutMs: 20000 }).then(function (res) {
      data().used();
      var out = Object.assign({ ok: true }, res);
      return Promise.resolve(touch ? touch(res) : null).then(function () { return out; }, function () { return out; });
    }, friendly);
  }
  var social = {
    comments: function (listingId) {
      if (!isLive()) return { items: [], loading: false, open: false };
      data().used(); data().loadComments(listingId, false);
      var E = slotOf(data().state.comments, listingId);
      return E.data ? Object.assign({ loading: false }, E.data) : { items: [], loading: !E.error, error: E.error || null, open: true };
    },
    moreComments: function (listingId) { return data().moreComments(listingId); },
    postComment: function (listingId, text, parentId) {
      return post('POST', '/v1/listings/' + encodeURIComponent(listingId) + '/comments', { body: text, parentId: parentId || undefined }, function () { return data().loadComments(listingId, true); });
    },
    editComment: function (listingId, id, text) { return post('PUT', '/v1/comments/' + encodeURIComponent(id), { body: text }, function () { return data().loadComments(listingId, true); }); },
    removeComment: function (listingId, id) { return post('DELETE', '/v1/comments/' + encodeURIComponent(id), null, function () { return data().loadComments(listingId, true); }); },
    hideComment: function (listingId, id, hidden) { return post('POST', '/v1/comments/' + encodeURIComponent(id) + '/hide', { hidden: hidden !== false }, function () { return data().loadComments(listingId, true); }); },
    report: function (targetType, targetId, reason, note, listingId) { return post('POST', '/v1/reports', { targetType: targetType, targetId: targetId, reason: reason, note: note || '' }, function () { return listingId ? data().loadComments(listingId, true) : null; }); },
    profile: function (alias) {
      if (!isLive()) return { loading: false, offline: true };
      data().used(); data().loadProfile(alias, false);
      var E = slotOf(data().state.profiles, String(alias).toLowerCase());
      return E.data ? Object.assign({ loading: false }, E.data) : { loading: !E.error, error: E.error || null };
    },
    profileReviews: function (alias, cursor) { return data().profileReviews(alias, cursor); },
    follows: function () {
      if (!isLive()) return { sellers: [], cards: [], max: 100, loading: false };
      data().loadFollows(false);
      var E = data().state.follows;
      return E.data ? Object.assign({ loading: false }, E.data) : { sellers: [], cards: [], max: 100, loading: true };
    },
    isFollowingSeller: function (alias) { var f = social.follows(); return f.sellers.some(function (x) { return x.alias.toLowerCase() === String(alias).toLowerCase(); }); },
    isFollowingCard: function (cardId) { return social.follows().cards.some(function (x) { return x.cardId === cardId; }); },
    follow: function (spec, on) {
      var path = '/v1/follows' + (on ? '' : '?kind=' + encodeURIComponent(spec.kind) + (spec.alias ? '&alias=' + encodeURIComponent(spec.alias) : '') + (spec.cardId ? '&cardId=' + encodeURIComponent(spec.cardId) : ''));
      return post(on ? 'POST' : 'DELETE', path, on ? spec : null, function () { var S = data().state; S.follows.at = 0; Object.keys(S.profiles).forEach(function (k) { S.profiles[k].at = 0; }); return Promise.all([data().loadFollows(true)]); });
    },
    feed: function (scope) {
      if (!isLive()) return { items: [], loading: false };
      data().used(); data().loadFeed(scope, false);
      var E = slotOf(data().state.feeds, scope || 'all');
      return E.data ? Object.assign({ loading: false }, E.data) : { items: [], loading: true };
    },
    moreFeed: function (scope) { return data().moreFeed(scope); },
    reviewsDue: function () {
      if (!isLive()) return { items: [], loading: false };
      data().loadReviewsDue(false);
      var E = data().state.reviewsDue;
      return E.data ? Object.assign({ loading: false }, E.data) : { items: [], loading: true };
    },
    postReview: function (tradeId, rating, text) { return post('POST', '/v1/reviews', { tradeId: tradeId, rating: rating, body: text || '' }, function () { data().state.reviewsDue.at = 0; return data().loadReviewsDue(true); }); },
    editReview: function (id, rating, text) { return post('PUT', '/v1/reviews/' + encodeURIComponent(id), { rating: rating, body: text || '' }, function () { Object.keys(data().state.profiles).forEach(function (k) { data().state.profiles[k].at = 0; }); }); },
    settings: function () {
      if (!isLive()) return { loading: false };
      data().loadSettings(false);
      var E = data().state.settings;
      return E.data ? Object.assign({ loading: false }, E.data) : { loading: true };
    },
    saveSettings: function (patch) {
      var cur = data().state.settings.data || {};
      return post('PUT', '/v1/settings', Object.assign({}, cur, patch), function (r) { data().state.settings.data = r.value || {}; data().state.settings.at = Date.now(); data().changed(); });
    },
    uploads: function () {
      if (!isLive()) return { items: [], usage: null, loading: false };
      data().loadUploads(false);
      var E = data().state.uploads;
      return E.data ? Object.assign({ loading: false }, E.data) : { items: [], usage: null, loading: true };
    },
    refreshUploads: function () { return data().loadUploads(true); },
    deleteUpload: function (id) { return post('DELETE', '/v1/uploads/' + encodeURIComponent(id), null, function () { return data().loadUploads(true); }); },
    updatePresentation: function (listingId, body) { return post('POST', '/v1/listings/' + encodeURIComponent(listingId) + '/presentation', body, function () { return data().invalidate(); }); }
  };
  provider.social = social;

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
