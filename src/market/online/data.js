/* Cardable Market — the Global Market's data layer.
 * The interface reads synchronously, so this keeps the last answer for everything it shows and refreshes it in the
 * background: nothing here is invented. Listings, prices, volume and reputation are exactly what the server returned
 * from real player events. A read that has not arrived yet is reported as loading, never as empty or as sample data.
 *
 * Server time is authoritative. Every response carries `serverNow`; countdowns use that clock (as measured when the
 * answer arrived), never the device's, so a wrong system clock cannot change when an auction ends. */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var online = function () { return C.market.online; };
  var core = function () { return C.market.core; };
  var MIN = 60000, HOUR = 3600000;
  var TTL = { listings: 12000, detail: 8000, card: 12000, activity: 10000, inventory: 15000, trades: 20000, valuation: 30000 };

  var S = { skew: 0, skewAt: 0, revision: 0, usedAt: 0, timer: 0, emitTimer: 0,
    listings: { items: null, total: 0, at: 0, loading: null, error: null },
    details: {}, cards: {}, vals: {}, tradesBy: {},
    activity: { data: null, at: 0, loading: null }, inventory: { items: null, total: 0, at: 0, loading: null }, rules: null,
    analytics: {}, stocksBy: {}, movers: { data: null, at: 0, loading: null }, portfolio: { data: null, at: 0, loading: null }, alerts: { data: null, at: 0, loading: null },
    comments: {}, profiles: {}, feeds: {}, uploads: { data: null, at: 0, loading: null }, follows: { data: null, at: 0, loading: null }, reviewsDue: { data: null, at: 0, loading: null }, settings: { data: null, at: 0, loading: null } };

  // ---- time ----------------------------------------------------------------------------------------------------------
  function learn(serverNow) { if (Number.isFinite(serverNow) && serverNow > 0) { S.skew = serverNow - Date.now(); S.skewAt = Date.now(); } }
  function now() { return Date.now() + S.skew; }
  function minutesUntil(at) { return Math.max(0, (at - now()) / MIN); }

  // ---- change notification ------------------------------------------------------------------------------------------
  function changed() {
    S.revision++;
    if (S.emitTimer) return;
    S.emitTimer = root.setTimeout(function () {
      S.emitTimer = 0;
      if (C.market.store && C.market.store.session.realm === 'global') C.market.store.emit('sim');
    }, 250);
  }

  // ---- fetch with de-duplication --------------------------------------------------------------------------------------
  function fresh(at, ttl) { return at && Date.now() - at < ttl; }
  function get(path) { return online().authed('GET', path); }
  function live() { return online().state.status === 'online'; }

  // ---- valuation: the baseline from the game's own data, replaced by what players actually paid -------------------------
  function specOf(item) { return { cardId: item.cardId, variantId: item.variantId || null, cardSkinId: item.cardSkinId || null, serial: item.serial || null }; }
  function fullValuation(spec, srv) {
    var base = C.valuation && C.valuation.baselineOnly ? C.valuation.baselineOnly(spec) : null;
    if (!base) return null;
    if (!srv) return Object.assign({}, base, { source: 'baseline' });
    var avg = srv.average, tier = base.tier, derived = core().tierDerived(tier, C.data.market);
    var ask = srv.lowestAsk, bid = srv.bestBid;
    var spreadReal = ask != null && bid != null ? Math.max(0, (ask - bid) / Math.max(1, avg)) : null;
    var spread = spreadReal != null ? spreadReal : derived.spread, targets = core().targets(avg, spread, C.data.market);
    return Object.assign({}, base, {
      baseline: srv.baseline, baseAverage: srv.baseAverage, average: avg, samples: srv.samples, confidence: srv.confidence, basis: srv.basis,
      lastSale: srv.lastSale, lastAt: srv.lastAt, targetBuy: targets.targetBuy, targetSell: targets.targetSell,
      bestBid: bid != null ? bid : Math.max(1, Math.floor(avg * (1 - spread / 2))), bidReal: bid != null,
      lowestAsk: ask != null ? ask : Math.max(2, Math.ceil(avg * (1 + spread / 2))), askReal: ask != null,
      spread: spread, spreadReal: spreadReal != null, liquidity: srv.volume7d ? Math.min(1, srv.volume7d / 8) : (srv.lastSale != null ? 0.05 : null),
      volume24h: srv.volume24h || 0, volume7d: srv.volume7d || 0, credits24h: srv.credits24h || 0, credits7d: srv.credits7d || 0,
      change24h: srv.change24h, change7d: srv.change7d, source: 'players'
    });
  }
  // The server's figures are kept for the card and finish (without any serial factor); each copy's own factor is applied on read.
  function remember(spec, srv) {
    if (!srv) return;
    var norm = Object.assign({}, srv, { average: srv.fair != null ? srv.fair : srv.average, baseline: srv.baseAverage != null ? srv.baseAverage : srv.baseline });
    S.vals[[spec.cardId, spec.variantId || '', spec.cardSkinId || ''].join('|')] = { v: norm, at: Date.now() };
  }
  function valuationFor(spec) {
    var key = [spec.cardId, spec.variantId || '', spec.cardSkinId || ''].join('|'), hit = S.vals[key];
    if (!hit || !hit.v) return fullValuation(spec, null);
    var sf = spec.serial ? core().serialFactor(spec.serial, C.data.market) : 1;
    return fullValuation(spec, Object.assign({}, hit.v, { average: Math.max(1, Math.round(hit.v.average * sf)), baseline: Math.max(1, Math.round(hit.v.baseline * sf)) }));
  }
  function wantValuation(spec) {
    var key = [spec.cardId, spec.variantId || '', spec.cardSkinId || ''].join('|'), hit = S.vals[key];
    if (hit && fresh(hit.at, TTL.valuation) || hit && hit.loading) return;
    var entry = S.vals[key] || (S.vals[key] = { v: null, at: 0 });
    if (entry.loading) return;
    entry.loading = true;
    var q = '/v1/valuation?cardId=' + encodeURIComponent(spec.cardId) + (spec.variantId ? '&variantId=' + encodeURIComponent(spec.variantId) : '') + (spec.cardSkinId ? '&skinId=' + encodeURIComponent(spec.cardSkinId) : '');
    get(q).then(function (d) { learn(d.serverNow); entry.v = Object.assign({}, d.valuation, { serialFactor: 1 }); entry.at = Date.now(); entry.loading = false; changed(); }, function () { entry.loading = false; entry.at = Date.now(); });
  }

  // ---- mapping the server's listing into the interface's listing -----------------------------------------------------------
  function wantedLabels(wants) {
    var d = C.data, out = [];
    if (!wants) return [{ label: 'Offers of similar value', cardId: null }];
    (wants.cardIds || []).forEach(function (id) { var c = d.cards.find(function (x) { return x.id === id; }); out.push({ label: c ? c.name : id, cardId: id }); });
    if (wants.minTier != null) { var r = d.rarities.find(function (x) { return x.tier === wants.minTier; }); out.push({ label: (r ? r.name : 'Tier ' + wants.minTier) + ' or better', cardId: null }); }
    (wants.variantIds || []).forEach(function (id) { var v = d.variants.find(function (x) { return x.id === id; }); out.push({ label: (v ? v.name : id) + ' finish', cardId: null }); });
    if ((wants.skinIds || []).length) out.push({ label: 'A card skin', cardId: null });
    if (wants.serialMax != null) out.push({ label: 'Serial ' + wants.serialMax + ' or lower', cardId: null });
    if (wants.minItems > 1) out.push({ label: 'At least ' + wants.minItems + ' cards', cardId: null });
    return out.length ? out : [{ label: 'Offers of similar value', cardId: null }];
  }
  function statusOf(v) {
    if (v.status !== 'active') return v.status;
    return v.kind === 'auction' && v.endsAt - now() <= HOUR ? 'ending' : 'active';
  }
  function toListing(v, history) {
    var first = v.items && v.items[0] || v.card, spec = specOf(first);
    if (v.valuation) remember(spec, v.valuation);
    var val = valuationFor(spec);
    wantValuation(spec);
    var closed = v.status !== 'active', t = now();
    var out = {
      id: v.id, realm: 'global', format: v.format, kind: v.kind, status: statusOf(v), ask: v.ask, title: v.title || '', description: v.description || '', cover: { kind: 'card' }, reason: '',
      card: { cardId: v.card.cardId, variantId: v.card.variantId || null, cardSkinId: v.card.cardSkinId || null, serial: v.card.serial, count: v.card.count, packId: v.card.packId || null },
      items: (v.items || []).map(function (i) { return { instanceId: i.instanceId || '', cardId: i.cardId, variantId: i.variantId || null, cardSkinId: i.cardSkinId || null, serial: i.serial, packId: i.packId || null }; }),
      seller: { alias: v.seller.alias, isBot: false, isYou: !!v.seller.isYou, persona: null, personaLabel: null, sales: v.seller.sales || 0, rating: null, reviews: v.seller.rating || null, tenureDays: v.seller.tenureDays || 0 },
      images: (v.images || []).map(function (i) { return { id: i.id, alt: i.alt || '', width: i.width, height: i.height }; }), photoCover: v.cover || null, treatment: v.treatment || 'none', commentCount: v.commentCount || 0,
      valuation: val, listedMin: Math.max(0, (t - v.createdAt) / MIN), watchers: 0, source: 'players', isMine: !!v.isMine,
      closedAt: v.closedAt || null, endsMin: closed ? null : minutesUntil(v.endsAt), endedMin: v.closedAt ? Math.max(0, (t - v.closedAt) / MIN) : null,
      soldFor: v.soldFor != null ? v.soldFor : null, endNote: v.endNote || '', snipeNote: v.snipeNote || '', createdSim: v.createdAt, endsAt: v.endsAt, offerIds: [], reservedCard: false, version: v.version
    };
    if (v.kind === 'auction') {
      var a = v.auction;
      out.auction = { start: a.start, current: a.current, bids: a.bids, bidders: a.bidders, reserve: a.hasReserve ? (a.reserveAmount != null ? a.reserveAmount : 1) : null, hasReserve: a.hasReserve,
        reserveMet: a.reserveMet, increment: a.increment, buyout: a.buyout, minNext: a.minNext, reserveAmount: a.reserveAmount, leaderAlias: a.leaderAlias, youLead: !!a.youLead,
        myMax: a.myMax, extensions: a.extensions, maxExtensions: a.maxExtensions, history: (history || []).map(function (e) { return { by: e.by, price: e.price, minutesAgo: Math.max(0, (t - e.at) / MIN) }; }) };
    }
    if (v.kind === 'swap') {
      var w = v.swap && v.swap.wants;
      out.ask = val ? val.average : v.ask;
      out.swap = { wanted: wantedLabels(w), topUp: v.swap ? v.swap.minTopUp : 0, direction: 'asks', openToCounter: true, minFrac: w && w.minValuePct ? w.minValuePct / 100 : null, wants: w || null };
    }
    return out;
  }
  function toOffer(o) {
    var t = now(), status = o.status;
    if (status === 'pending' && o.awaiting === 'offerer') status = 'countered';
    return { id: o.id, listingId: o.listingId, status: status, rawStatus: o.status, awaiting: o.awaiting, round: o.round, myTurn: !!o.myTurn, from: o.from, to: o.to, fromYou: !!o.fromYou, toYou: !!o.toYou,
      give: (o.give || []).map(function (g) { return { instanceId: '', cardId: g.cardId, variantId: g.variantId || null, serial: g.serial, worth: g.worth || 0 }; }),
      get: [], cash: o.cash || 0, refund: o.refund || 0, note: o.note || '', minutesAgo: Math.max(0, (t - (o.updatedAt || o.createdAt)) / MIN), minutesLeft: Math.max(0, (o.expiresAt - t) / MIN) };
  }
  function toOrder(o) {
    return { id: o.id, cardId: o.cardId, variantId: o.variantId || null, anyFinish: !!o.anyFinish, maxPrice: o.maxPrice, quantity: o.quantity, filled: o.filled, status: o.status,
      paid: o.filled ? Math.round(o.spent / o.filled) : null, spent: o.spent, reserved: o.reserved, minutesLeft: o.status === 'open' ? minutesUntil(o.expiresAt) : 0, owner: online().state.alias || 'You', mine: true };
  }
  function toTrade(t, me) {
    var t0 = now();
    return { id: t.id, realm: 'global', cardId: t.cardId, variantId: t.variantId || null, cardSkinId: t.cardSkinId || null, serial: t.serial, price: t.price, average: null, vs: null,
      format: t.kind === 'auction' || t.kind === 'buyout' ? 'auction' : t.kind === 'swap' ? 'swap' : 'buy-now', kind: t.kind, minutesAgo: Math.max(0, (t0 - t.at) / MIN), seller: t.seller, buyer: t.buyer,
      buyerWhy: t.barter ? 'A card swap, not a sale' : '', sellerWhy: '', you: !!me && (t.seller === me || t.buyer === me), fee: t.fee, barter: !!t.barter, count: t.count };
  }

  // ---- loaders ---------------------------------------------------------------------------------------------------------------
  function loadListings(force) {
    var L = S.listings;
    if (!live()) return Promise.resolve(L);
    if (L.loading) return L.loading;
    if (!force && L.items && fresh(L.at, TTL.listings)) return Promise.resolve(L);
    var items = [], pages = 0;
    function page(cursor) {
      return get('/v1/listings?limit=100&sort=newest' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')).then(function (d) {
        learn(d.serverNow);
        d.items.forEach(function (v) { items.push(v); });
        pages++;
        if (d.nextCursor && pages < 5) return page(d.nextCursor);
        return d;
      });
    }
    L.loading = page(null).then(function (d) {
      L.raw = items; L.items = items.map(function (v) { return toListing(v); }); L.total = d.total; L.at = Date.now(); L.error = null; L.loading = null; changed();
      return L;
    }, function (error) { L.loading = null; L.error = error; L.at = Date.now(); changed(); return L; });
    return L.loading;
  }
  function loadDetail(id, force) {
    var D = S.details[id] || (S.details[id] = { data: null, at: 0, loading: null });
    if (!live()) return Promise.resolve(D);
    if (D.loading) return D.loading;
    if (!force && D.data && fresh(D.at, TTL.detail)) return Promise.resolve(D);
    D.loading = get('/v1/listings/' + encodeURIComponent(id)).then(function (d) {
      learn(d.serverNow);
      var mapped = toListing(d.listing, d.history);
      D.data = { listing: mapped, rank: null, card: C.card ? C.card(mapped.card.cardId) : null, similar: (d.similar || []).map(function (s) { return toListing(s); }),
        offers: (d.offers || []).filter(function (o) { return o.toYou; }).map(toOffer), myOffers: (d.offers || []).filter(function (o) { return o.fromYou; }).map(toOffer),
        trades: (d.trades || []).map(function (t) { return toTrade(t, online().state.alias); }), reservedByYou: d.reservedByYou || 0 };
      D.at = Date.now(); D.loading = null; changed(); return D;
    }, function (error) { D.loading = null; D.at = Date.now(); D.error = error; if (error.code === 'not-found') D.data = null; changed(); return D; });
    return D.loading;
  }
  function loadCard(cardId, variantId, force) {
    var key = cardId + '|' + (variantId || ''), E = S.cards[key] || (S.cards[key] = { data: null, at: 0, loading: null });
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.card)) return Promise.resolve(E);
    E.loading = get('/v1/cards/' + encodeURIComponent(cardId) + '/market' + (variantId ? '?variant=' + encodeURIComponent(variantId) : '')).then(function (d) {
      learn(d.serverNow);
      remember({ cardId: cardId, variantId: variantId || null, cardSkinId: null }, d.valuation);
      E.data = { valuation: d.valuation, listings: (d.listings || []).map(function (v) { return toListing(v); }), trades: (d.trades || []).map(function (t) { return toTrade(t, online().state.alias); }),
        variants: d.variants || [], depth: d.depth || { asks: [], bids: [] }, myOrders: (d.myOrders || []).map(toOrder) };
      E.at = Date.now(); E.loading = null; changed(); return E;
    }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function loadActivity(force) {
    var A = S.activity;
    if (!live()) return Promise.resolve(A);
    if (A.loading) return A.loading;
    if (!force && A.data && fresh(A.at, TTL.activity)) return Promise.resolve(A);
    A.loading = get('/v1/activity').then(function (d) {
      learn(d.serverNow);
      var t = now();
      A.data = {
        notifications: d.notifications.map(function (n) { return { id: String(n.id), kind: n.kind, text: n.text, minutesAgo: Math.max(0, (t - n.at) / MIN), listingId: n.listingId || null, offerId: null, read: !!n.read }; }),
        mine: d.mine.map(function (v) { return toListing(v); }),
        bids: d.bids.map(function (v) { var l = toListing(v); l.listingId = v.id; l.reserved = v.reserved; l.outbid = v.outbid; l.state = v.auction && v.auction.youLead ? 'leading' : 'outbid'; l.yourMax = v.auction && v.auction.myMax; l.current = v.auction && v.auction.current; return l; }),
        orders: d.orders.map(toOrder), offers: d.offers.map(toOffer), unread: d.unread
      };
      A.wallet = d.wallet; A.at = Date.now(); A.loading = null;
      if (online().applyWallet) online().applyWallet(d.wallet);
      changed(); return A;
    }, function () { A.loading = null; A.at = Date.now(); return A; });
    return A.loading;
  }
  function loadInventory(force) {
    var I = S.inventory;
    if (!live()) return Promise.resolve(I);
    if (I.loading) return I.loading;
    if (!force && I.items && fresh(I.at, TTL.inventory)) return Promise.resolve(I);
    var items = [];
    function page(cursor) {
      return get('/v1/inventory?limit=500' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')).then(function (d) {
        d.items.forEach(function (i) { items.push(i); });
        return d.nextCursor && items.length < 6000 ? page(d.nextCursor) : d;
      });
    }
    I.loading = page(null).then(function (d) {
      I.items = items.map(function (i) { return { instanceId: i.id, cardId: i.cardId, variantId: i.variantId || null, cardSkinId: i.cardSkinId || null, serial: i.serial, packId: i.packId || null,
        pulledAt: i.pulledAt || null, seen: true, locked: false, origin: i.source === 'legacy-import' ? 'beta-import' : 'market', _listed: i.listedIn || null, state: i.state }; });
      I.total = d.total; I.at = Date.now(); I.loading = null;
      if (online().applyInventory) online().applyInventory(d.total);
      changed(); return I;
    }, function () { I.loading = null; I.at = Date.now(); return I; });
    return I.loading;
  }
  function loadTrades(cardId, force) {
    var key = cardId || '*', T = S.tradesBy[key] || (S.tradesBy[key] = { data: null, at: 0, loading: null });
    if (!live()) return Promise.resolve(T);
    if (T.loading) return T.loading;
    if (!force && T.data && fresh(T.at, TTL.trades)) return Promise.resolve(T);
    T.loading = get('/v1/trades?limit=50' + (cardId ? '&cardId=' + encodeURIComponent(cardId) : '')).then(function (d) {
      T.data = d; T.items = d.items.map(function (t) { return toTrade(t, online().state.alias); }); T.at = Date.now(); T.loading = null; changed(); return T;
    }, function () { T.loading = null; T.at = Date.now(); return T; });
    return T.loading;
  }
  function loadRules() {
    if (S.rules || !online().state.server) { if (online().state.server) S.rules = online().state.server.rules || null; return S.rules; }
    return S.rules;
  }

  // ---- analytics: only what completed player sales say -------------------------------------------------------------------
  function slot(map, key) { return map[key] || (map[key] = { data: null, at: 0, loading: null }); }
  function loadAnalytics(cardId, variantId, windowId, force) {
    var key = cardId + '|' + (variantId || '') + '|' + (windowId || '7d'), E = slot(S.analytics, key);
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.card)) return Promise.resolve(E);
    var q = '/v1/analytics/card?cardId=' + encodeURIComponent(cardId) + '&window=' + (windowId || '7d') + (variantId ? '&variantId=' + encodeURIComponent(variantId) : '');
    E.loading = get(q).then(function (d) { learn(d.serverNow); E.data = d; E.at = Date.now(); E.loading = null; changed(); return E; }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function stocksKey(q) { return [q.scope || 'index', q.id || '', q.variantId || '', q.window || '7d'].join('|'); }
  function loadStocks(q, force) {
    var key = stocksKey(q), E = slot(S.stocksBy, key);
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.card)) return Promise.resolve(E);
    var path = '/v1/analytics/stocks?scope=' + encodeURIComponent(q.scope || 'index') + '&id=' + encodeURIComponent(q.id || '') + '&window=' + (q.window || '7d') + (q.variantId ? '&variantId=' + encodeURIComponent(q.variantId) : '');
    E.loading = get(path).then(function (d) { learn(d.serverNow); E.data = d; E.at = Date.now(); E.loading = null; changed(); return E; }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function loadMovers(force) {
    var E = S.movers;
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.trades)) return Promise.resolve(E);
    E.loading = get('/v1/analytics/movers').then(function (d) { learn(d.serverNow); E.data = d; E.at = Date.now(); E.loading = null; changed(); return E; }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function loadPortfolio(force) {
    var E = S.portfolio;
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.activity)) return Promise.resolve(E);
    E.loading = get('/v1/portfolio').then(function (d) { learn(d.serverNow); E.data = d; E.at = Date.now(); E.loading = null; changed(); return E; }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function loadAlerts(force) {
    var E = S.alerts;
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.activity)) return Promise.resolve(E);
    E.loading = get('/v1/alerts').then(function (d) { E.data = d; E.at = Date.now(); E.loading = null; changed(); return E; }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }

  // ---- the social layer: comments, profiles, the community feed, pictures, follows and reviews -------------------------------
  function loadComments(listingId, force) {
    var E = slot(S.comments, listingId);
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.detail)) return Promise.resolve(E);
    E.loading = get('/v1/listings/' + encodeURIComponent(listingId) + '/comments?limit=30').then(function (d) { learn(d.serverNow); E.data = d; E.at = Date.now(); E.loading = null; E.error = null; changed(); return E; },
      function (error) { E.loading = null; E.error = error; E.at = Date.now(); changed(); return E; });
    return E.loading;
  }
  function moreComments(listingId) {
    var E = slot(S.comments, listingId);
    if (!E.data || !E.data.nextCursor) return Promise.resolve(E);
    return get('/v1/listings/' + encodeURIComponent(listingId) + '/comments?limit=30&cursor=' + encodeURIComponent(E.data.nextCursor)).then(function (d) {
      E.data = Object.assign({}, d, { items: E.data.items.concat(d.items) }); E.at = Date.now(); changed(); return E;
    });
  }
  function aliasKey(alias) { return String(alias || '').toLowerCase(); }
  function loadProfile(alias, force) {
    var E = slot(S.profiles, aliasKey(alias));
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, 20000)) return Promise.resolve(E);
    E.loading = get('/v1/profiles/' + encodeURIComponent(alias)).then(function (d) { learn(d.serverNow); E.data = d; E.error = null; E.at = Date.now(); E.loading = null; changed(); return E; },
      function (error) { E.loading = null; E.error = error; E.at = Date.now(); changed(); return E; });
    return E.loading;
  }
  function profileReviews(alias, cursor) {
    return get('/v1/profiles/' + encodeURIComponent(alias) + '/reviews?limit=10' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
  }
  function loadFeed(scope, force) {
    var E = slot(S.feeds, scope || 'all');
    if (!live()) return Promise.resolve(E);
    if (E.loading) return E.loading;
    if (!force && E.data && fresh(E.at, TTL.listings)) return Promise.resolve(E);
    E.loading = get('/v1/feed?limit=24&scope=' + (scope === 'following' ? 'following' : 'all')).then(function (d) {
      learn(d.serverNow);
      E.data = { items: d.items.map(function (v) { var l = toListing(v); l.event = v.event; l.eventAt = v.eventAt; l.eventMin = Math.max(0, (now() - v.eventAt) / MIN); return l; }), nextCursor: d.nextCursor, scope: d.scope };
      E.at = Date.now(); E.loading = null; changed(); return E;
    }, function () { E.loading = null; E.at = Date.now(); return E; });
    return E.loading;
  }
  function moreFeed(scope) {
    var E = slot(S.feeds, scope || 'all');
    if (!E.data || !E.data.nextCursor) return Promise.resolve(E);
    return get('/v1/feed?limit=24&scope=' + (scope === 'following' ? 'following' : 'all') + '&cursor=' + encodeURIComponent(E.data.nextCursor)).then(function (d) {
      var more = d.items.map(function (v) { var l = toListing(v); l.event = v.event; l.eventAt = v.eventAt; l.eventMin = Math.max(0, (now() - v.eventAt) / MIN); return l; });
      E.data = { items: E.data.items.concat(more), nextCursor: d.nextCursor, scope: d.scope }; changed(); return E;
    });
  }
  function simpleLoader(box, path, after) {
    return function (force) {
      if (!live()) return Promise.resolve(box);
      if (box.loading) return box.loading;
      if (!force && box.data && fresh(box.at, TTL.activity)) return Promise.resolve(box);
      box.loading = get(path).then(function (d) { box.data = after ? after(d) : d; box.at = Date.now(); box.loading = null; changed(); return box; }, function () { box.loading = null; box.at = Date.now(); return box; });
      return box.loading;
    };
  }
  var loadUploads = function (force) { return simpleLoader(S.uploads, '/v1/uploads')(force); };
  var loadFollows = function (force) { return simpleLoader(S.follows, '/v1/follows')(force); };
  var loadReviewsDue = function (force) { return simpleLoader(S.reviewsDue, '/v1/reviews/pending')(force); };
  var loadSettings = function (force) { return simpleLoader(S.settings, '/v1/settings', function (d) { return d.value || {}; })(force); };

  // ---- background refresh while the Market is in use -------------------------------------------------------------------------------
  function used() {
    S.usedAt = Date.now();
    if (!S.timer) S.timer = root.setInterval(tick, 6000);
  }
  function tick() {
    if (Date.now() - S.usedAt > 90000 || !live() || (root.document && root.document.hidden)) {
      if (Date.now() - S.usedAt > 90000) { root.clearInterval(S.timer); S.timer = 0; }
      return;
    }
    if (!fresh(S.listings.at, TTL.listings)) loadListings(true);
    if (!fresh(S.activity.at, TTL.activity)) loadActivity(true);
    Object.keys(S.details).forEach(function (id) { var D = S.details[id]; if (D.data && Date.now() - S.usedAt < 20000 && !fresh(D.at, TTL.detail)) loadDetail(id, true); });
    Object.keys(S.cards).forEach(function (k) { var E = S.cards[k]; if (E.data && Date.now() - S.usedAt < 20000 && !fresh(E.at, TTL.card)) { var p = k.split('|'); loadCard(p[0], p[1] || null, true); } });
  }
  // Anything a write changed is read again at once.
  function invalidate() {
    S.listings.at = 0; S.activity.at = 0; S.inventory.at = 0;
    Object.keys(S.details).forEach(function (k) { S.details[k].at = 0; });
    Object.keys(S.cards).forEach(function (k) { S.cards[k].at = 0; });
    Object.keys(S.tradesBy).forEach(function (k) { S.tradesBy[k].at = 0; });
    Object.keys(S.analytics).forEach(function (k) { S.analytics[k].at = 0; });
    Object.keys(S.stocksBy).forEach(function (k) { S.stocksBy[k].at = 0; });
    S.movers.at = 0; S.portfolio.at = 0; S.alerts.at = 0;
    Object.keys(S.comments).forEach(function (k) { S.comments[k].at = 0; });
    Object.keys(S.profiles).forEach(function (k) { S.profiles[k].at = 0; });
    Object.keys(S.feeds).forEach(function (k) { S.feeds[k].at = 0; });
    S.uploads.at = 0; S.follows.at = 0; S.reviewsDue.at = 0;
    return Promise.all([loadListings(true), loadActivity(true), loadInventory(true)]);
  }
  function reset() {
    S.listings = { items: null, total: 0, at: 0, loading: null, error: null }; S.details = {}; S.cards = {}; S.vals = {}; S.tradesBy = {};
    S.activity = { data: null, at: 0, loading: null }; S.inventory = { items: null, total: 0, at: 0, loading: null };
    S.analytics = {}; S.stocksBy = {}; S.movers = { data: null, at: 0, loading: null }; S.portfolio = { data: null, at: 0, loading: null }; S.alerts = { data: null, at: 0, loading: null };
    S.comments = {}; S.profiles = {}; S.feeds = {}; S.uploads = { data: null, at: 0, loading: null }; S.follows = { data: null, at: 0, loading: null };
    S.reviewsDue = { data: null, at: 0, loading: null }; S.settings = { data: null, at: 0, loading: null };
    if (C.market.media && C.market.media.forget) C.market.media.forget();
    changed();
  }

  C.market.onlineData = {
    state: S, now: now, learn: learn, minutesUntil: minutesUntil, used: used, changed: changed, invalidate: invalidate, reset: reset, rules: loadRules,
    loadAnalytics: loadAnalytics, loadStocks: loadStocks, loadMovers: loadMovers, loadPortfolio: loadPortfolio, loadAlerts: loadAlerts, stocksKey: stocksKey,
    loadComments: loadComments, moreComments: moreComments, loadProfile: loadProfile, profileReviews: profileReviews, loadFeed: loadFeed, moreFeed: moreFeed,
    loadUploads: loadUploads, loadFollows: loadFollows, loadReviewsDue: loadReviewsDue, loadSettings: loadSettings,
    loadListings: loadListings, loadDetail: loadDetail, loadCard: loadCard, loadActivity: loadActivity, loadInventory: loadInventory, loadTrades: loadTrades, wantValuation: wantValuation,
    valuationFor: valuationFor, fullValuation: fullValuation, toListing: toListing, toOrder: toOrder, toOffer: toOffer, toTrade: toTrade, wantedLabels: wantedLabels,
    get revision() { return S.revision; }
  };
})(window.Cardable = window.Cardable || {}, window);
