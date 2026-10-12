/* Cardable Market — the Simulation provider.
 * Presents the simulator's world in the shapes the Market interface already uses (see src/market/api.js), and
 * routes the player's actions into the runtime. Nothing here is invented: every number is read from the
 * world's own listings, orders and executed trades. */
(function (C) {
  'use strict';
  var S = C.market.sim;
  var MIN = S.MIN, HOUR = S.HOUR, DAY = S.DAY;
  var cfg = function () { return C.data.marketSim; };
  var core = function () { return C.market.core; };
  var FORMAT = { fixed: 'buy-now', auction: 'auction', swap: 'swap' };

  function rt() { return C.marketSim.ensure(true); }
  function ctxNow() { var r = rt(); return { r: r, world: r.world, env: r.env }; }
  function playerState() {
    var s = C.state.current;
    var owned = {};
    (s.inventory || []).forEach(function (i) { owned[i.cardId] = (owned[i.cardId] || 0) + 1; });
    var wishlist = {};
    try { (s.inventoryUi.collections || []).forEach(function (c) { if (c.kind === 'wishlist' && c.cardIds) c.cardIds.forEach(function (id) { wishlist[id] = true; }); }); } catch (_) { /* optional */ }
    return { inventory: s.inventory || [], currency: s.currency, owned: owned, wishlist: wishlist };
  }

  // ---- per-call indexes -------------------------------------------------------------------------------------------
  function index(world, env) {
    var cache = world._idx;
    var stamp = world.trades.length + ':' + (world.evSeq || 0) + ':' + Math.floor(world.now / MIN);
    if (cache && cache.stamp === stamp) return cache;
    var idx = { stamp: stamp, trades: {}, ask: {}, bid: {}, asks: {}, bids: {}, byCard: {} };
    world.trades.forEach(function (tr) {
      var k = S.keyOf(tr.c, tr.v, tr.k);
      (idx.trades[k] = idx.trades[k] || []).push(tr);
      (idx.byCard[tr.c] = idx.byCard[tr.c] || []).push(tr);
    });
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.status !== 'open' || l.kind !== 'fixed' || l.items.length !== 1) continue;
      var k2 = S.itemKey(l.items[0]);
      (idx.asks[k2] = idx.asks[k2] || []).push(l.ask);
      if (idx.ask[k2] == null || l.ask < idx.ask[k2]) idx.ask[k2] = l.ask;
    }
    for (var oid in world.orders) {
      var o = world.orders[oid];
      if (o.status !== 'open') continue;
      var k3 = S.keyOf(o.c, o.v, o.k);
      (idx.bids[k3] = idx.bids[k3] || []).push(o.maxPrice);
      if (idx.bid[k3] == null || o.maxPrice > idx.bid[k3]) idx.bid[k3] = o.maxPrice;
    }
    world._idx = idx;
    return idx;
  }
  function stdev(values) {
    if (values.length < 2) return null;
    var m = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    return Math.sqrt(values.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (values.length - 1));
  }
  function changeOver(world, trades, windowMs) {
    if (!trades || trades.length < 2) return null;
    var last = trades[trades.length - 1], start = world.now - windowMs, ref = null;
    for (var i = trades.length - 2; i >= 0; i--) { if (trades[i].t <= start) { ref = trades[i]; break; } }
    if (!ref || start - ref.t > windowMs * 2 || last.t <= start) return null;
    return (last.price - ref.price) / ref.price;
  }

  // The Valuation shape of Stage 1, filled from the world. Fields without data are null, never invented.
  function valuationFor(world, env, c, v, k, sf) {
    var idx = index(world, env), key = S.keyOf(c, v, k), f = S.fairInfo(world, env, c, v, k), trades = idx.trades[key] || [];
    var factor = sf || 1, avg = Math.max(1, Math.round(f.average * factor));
    var entry = env.index[c] || { tier: 0 }, derived = core().tierDerived(entry.tier, C.data.market);
    var ask = idx.ask[key] != null ? idx.ask[key] : null, bid = idx.bid[key] != null ? idx.bid[key] : null;
    var spreadReal = ask != null && bid != null ? Math.max(0, (ask - bid) / avg) : null;
    var spread = spreadReal != null ? spreadReal : derived.spread;
    var t24 = trades.filter(function (t) { return t.t > world.now - DAY; }), t7 = trades.filter(function (t) { return t.t > world.now - 7 * DAY; });
    var obs = world.obs[key] || [], rets = [];
    for (var i = 1; i < obs.length; i++) if (obs[i - 1][1] > 0) rets.push(Math.log(obs[i][1] / obs[i - 1][1]));
    var vol = rets.length >= 3 ? stdev(rets) : null;
    var targets = core().targets(avg, spread, C.data.market);
    var liquidity = t7.length ? Math.min(1, t7.length / 8) : (trades.length ? 0.05 : null);
    return {
      key: key, baseline: f.baseline, baseAverage: f.average, average: avg, samples: f.samples, confidence: f.confidence, basis: f.basis,
      lastSale: f.lastSale, lastAt: f.lastAt, targetBuy: targets.targetBuy, targetSell: targets.targetSell,
      bestBid: bid != null ? bid : Math.max(1, Math.floor(avg * (1 - spread / 2))), bidReal: bid != null,
      lowestAsk: ask != null ? ask : Math.max(2, Math.ceil(avg * (1 + spread / 2))), askReal: ask != null,
      spread: spread, spreadReal: spreadReal != null, volatility: vol, liquidity: liquidity,
      volume24h: t24.length, volume7d: t7.length,
      credits24h: t24.reduce(function (n, t) { return n + t.price; }, 0), credits7d: t7.reduce(function (n, t) { return n + t.price; }, 0),
      change24h: changeOver(world, trades, DAY), change7d: changeOver(world, trades, 7 * DAY),
      change30d: changeFromDaily(world, key, 30), change90d: changeFromDaily(world, key, 90), changeAll: changeFromDaily(world, key, Infinity),
      windowHours: null, tier: entry.tier, openAsks: (idx.asks[key] || []).length, openBids: (idx.bids[key] || []).length
    };
  }
  // Change of the daily close over a span of days, or null when the card has no day that old or only one day of trades.
  function changeFromDaily(world, key, spanDays) {
    var days = world.daily[key];
    if (!days) return null;
    var list = Object.keys(days).map(Number).sort(function (a, b) { return a - b; });
    if (list.length < 2) return null;
    var today = S.dayIndex(world.now), last = days[list[list.length - 1]][3], target = today - spanDays, ref = null;
    if (spanDays === Infinity) ref = days[list[0]][0];
    else for (var i = list.length - 2; i >= 0; i--) { if (list[i] <= target) { ref = days[list[i]][3]; break; } }
    if (ref == null || !ref) return null;
    return (last - ref) / ref;
  }
  function sellerView(world, id) {
    if (id === 'you') return { alias: 'You', isBot: false, isYou: true, persona: null, personaLabel: null, sales: world.stats.you.sold, rating: null, tenureDays: 0 };
    var b = S.botOf(world, id);
    if (!b) return { alias: id, isBot: true, persona: null, personaLabel: 'Simulation bot', sales: 0, rating: null, tenureDays: 0 };
    var p = S.personaOf(b);
    return { alias: b.alias, isBot: true, persona: p.id, personaLabel: p.label, personaNote: p.blurb, sales: b.stats.sold, rating: null, tenureDays: Math.max(0, Math.floor(world.now / DAY)) };
  }
  function wantLabel(env, l) {
    var w = l.wants;
    if (w && w.cardId && env.cardById[w.cardId]) return env.cardById[w.cardId].name;
    if (w && w.rarity && env.rarityById[w.rarity]) return env.rarityById[w.rarity].name + ' or better';
    return 'Offers of similar value';
  }
  function listingView(world, env, l) {
    var it = l.items[0], sf = core().serialFactor(it.s, C.data.market);
    var view = l.kind === 'auction' ? S.auctionView(l) : null;
    var price = l.kind === 'auction' ? view.price : l.ask;
    var val = valuationFor(world, env, it.c, it.v, it.k, sf);
    var recent = (index(world, env).byCard[it.c] || []).filter(function (t) { return t.t > world.now - 3 * DAY; }).length;
    var out = {
      id: l.id, realm: 'simulation', format: FORMAT[l.kind], kind: l.kind, status: l.status === 'open' ? ((l.kind === 'auction' && l.endsAt - world.now <= HOUR) ? 'ending' : 'active') : l.status,
      ask: price, title: l.title || '', description: l.note || '', cover: { kind: 'card' }, reason: l.reason || '',
      card: { cardId: it.c, variantId: it.v || null, cardSkinId: it.k || null, serial: it.s, count: l.items.length, packId: it.p },
      items: l.items.map(function (x) { return { instanceId: x.i, cardId: x.c, variantId: x.v || null, cardSkinId: x.k || null, serial: x.s, packId: x.p }; }),
      seller: sellerView(world, l.seller), valuation: val, listedMin: Math.max(0, (world.now - l.createdAt) / MIN), watchers: recent * 2 + (l.bids ? l.bids.length : 0),
      source: 'simulation', isMine: l.seller === 'you', closedAt: l.closedAt || null, endsMin: l.status === 'open' ? Math.max(0, (l.endsAt - world.now) / MIN) : null,
      endedMin: l.closedAt != null ? Math.max(0, (world.now - l.closedAt) / MIN) : null, soldFor: l.soldFor != null ? l.soldFor : null, endNote: l.endNote || '', snipeNote: l.snipeNote || '',
      createdSim: l.createdAt, endsAt: l.endsAt, offerIds: l.offers.slice(), reservedCard: !!l.reserve
    };
    if (l.kind === 'auction') {
      var lead = view.lead;
      out.auction = { start: l.start, current: view.price, bids: l.bids.length, bidders: view.bidders, reserve: l.reserve, hasReserve: l.reserve != null,
        reserveMet: !l.reserve || view.price >= l.reserve, increment: S.incrementFor(view.price), buyout: l.buyout, bidders: view.bidders,
        minNext: view.bidders ? view.price + S.incrementFor(view.price) : l.start, reserveAmount: l.seller === 'you' ? l.reserve : null,
        leaderAlias: lead ? S.aliasOf(world, lead.by) : null, youLead: !!lead && lead.by === 'you', myMax: l.maxes.you ? l.maxes.you.max : null,
        extensions: l.extensions, history: l.bids.slice(-8).map(function (b) { return { by: S.aliasOf(world, b.by), price: b.price, minutesAgo: (world.now - b.t) / MIN }; }) };
    }
    if (l.kind === 'swap') {
      out.ask = val.average;
      out.swap = { wanted: [{ label: wantLabel(env, l), cardId: l.wants && l.wants.cardId || null }], topUp: 0, direction: 'asks', openToCounter: true, minFrac: l.wants ? l.wants.minFrac : null };
    }
    return out;
  }
  function openViews(world, env, includeMine) {
    var out = [];
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.status !== 'open' || world.now >= l.endsAt) continue;
      if (l.seller === 'you' && !includeMine) continue;
      out.push(listingView(world, env, l));
    }
    out.sort(function (a, b) { return a.listedMin - b.listedMin || (a.id < b.id ? -1 : 1); });
    return out;
  }
  function tradeView(world, env, tr) {
    var avg = tr.f || null;
    return { id: tr.id, realm: 'simulation', cardId: tr.c, variantId: tr.v || null, cardSkinId: tr.k || null, serial: tr.s, price: tr.price, average: avg,
      vs: avg ? (tr.price - avg) / avg : null, format: FORMAT[tr.kind === 'auction' || tr.kind === 'buyout' ? 'auction' : 'fixed'], kind: tr.kind,
      minutesAgo: Math.max(0, (world.now - tr.t) / MIN), seller: S.aliasOf(world, tr.seller), buyer: S.aliasOf(world, tr.buyer), buyerWhy: tr.bw, sellerWhy: tr.sw, you: tr.seller === 'you' || tr.buyer === 'you', fee: tr.fee };
  }
  function clockLabel(world) {
    var rel = world.now - world.epoch, day = Math.floor(rel / DAY);
    var inDay = ((rel % DAY) + DAY) % DAY, hh = Math.floor(inDay / HOUR), mm = Math.floor((inDay % HOUR) / MIN);
    return 'Day ' + (day + 1) + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  // ---- reads -------------------------------------------------------------------------------------------------------
  var provider = {
    status: function (realm) {
      var r = C.marketSim.ensure(false), w = r.world, peek = r.peek();
      var def = C.data.market.realms.find(function (x) { return x.id === realm; });
      var speed = cfg().speeds.find(function (s) { return s.id === r.speedId; });
      return { realm: realm, state: 'local', label: 'Offline · local', connected: true, live: true, message: cfg().help.intro,
        exists: !!w, running: peek.state === 'running', clockState: w ? peek.state : 'idle', reason: peek.reason, paused: r.paused, clock: w ? clockLabel(w) : null,
        speed: speed ? speed.id : r.speedId, factor: r.factor(), error: r.error, def: def, bots: w ? w.bots.length : 0, revision: r.revision };
    },
    wallet: function () {
      var p = playerState(), r = C.marketSim.runtime, held = r.world ? r.heldCredits() : 0;
      return { realm: 'simulation', balance: p.currency, held: held, available: Math.max(0, p.currency - held), label: 'Credits',
        note: 'Your Credits. Open bids and buy orders hold some of them until they end.' };
    },
    listings: function (realm, query) {
      query = query || {};
      var x = ctxNow(), world = x.world, env = x.env, k = core();
      var ctx = C.market.api.context(realm);
      var all = openViews(world, env, false);
      var tab = query.tab || 'for-you', sortId = query.sort;
      var base = all;
      if (tab === 'ending') { base = all.filter(function (l) { return l.format === 'auction'; }); sortId = sortId || 'ending'; }
      else if (tab === 'new') sortId = sortId || 'newest';
      else if (tab === 'trending') sortId = sortId || 'popular';
      else sortId = sortId || 'recommended';
      var locked = query.lockFormats && query.lockFormats.length ? base.filter(function (l) { return query.lockFormats.indexOf(l.format) >= 0; }) : base;
      var filtered = k.applyFilters(base, query.filters, ctx), ranks = {};
      var sorted = k.sortListings(filtered, sortId, ctx, { ranks: ranks });
      var page = k.paginate(sorted, query.cursor, query.limit || 24);
      return {
        realm: realm, items: page.items.map(function (l) { return { listing: l, rank: ranks[l.id] || k.recommend(l, ctx) }; }), nextCursor: page.nextCursor,
        total: page.total, universe: locked.length, facets: query.facets === false ? null : k.facetCounts(base, query.filters, ctx),
        asOf: clockLabel(world), source: 'simulation', revision: x.r.revision, emptyReason: !all.length ? 'no-listings' : page.total ? null : 'no-match'
      };
    },
    listing: function (realm, id) {
      var x = ctxNow(), world = x.world, env = x.env, l = world.listings[id];
      if (!l) return null;
      var view = listingView(world, env, l), ctx = C.market.api.context(realm);
      var similar = openViews(world, env, false).filter(function (v) { return v.id !== id && v.card.cardId === view.card.cardId; }).slice(0, 6);
      var offers = l.offers.map(function (oid) { return world.offers[oid]; }).filter(Boolean).map(function (of) { return offerView(world, env, of); });
      var mine = Object.keys(world.offers).map(function (oid) { return world.offers[oid]; }).filter(function (of) { return of.listingId === id && of.from === 'you'; }).map(function (of) { return offerView(world, env, of); });
      return { listing: view, rank: core().recommend(view, ctx), card: env.cardById[view.card.cardId], similar: similar, offers: offers, myOffers: mine,
        trades: (index(world, env).byCard[view.card.cardId] || []).slice(-6).reverse().map(function (t) { return tradeView(world, env, t); }) };
    },
    cardMarket: function (realm, cardId, variantId) {
      var x = ctxNow(), world = x.world, env = x.env, card = env.cardById[cardId];
      if (!card) return null;
      var v = valuationFor(world, env, cardId, variantId || null, null, 1), idx = index(world, env);
      var listings = openViews(world, env, true).filter(function (l) { return l.card.cardId === cardId; });
      var trades = (idx.byCard[cardId] || []).slice(-10).reverse().map(function (t) { return tradeView(world, env, t); });
      var finishes = {};
      listings.forEach(function (l) { if (l.card.variantId) finishes[l.card.variantId] = true; });
      var key = S.keyOf(cardId, variantId || null, null);
      var orders = Object.keys(world.orders).map(function (id) { return world.orders[id]; }).filter(function (o) { return o.status === 'open' && S.keyOf(o.c, o.v, o.k) === key; });
      return { card: card, valuation: v, listings: listings, trades: trades, variants: Object.keys(finishes), owned: playerState().owned[cardId] || 0,
        depth: { asks: (idx.asks[key] || []).slice().sort(function (a, b) { return a - b; }).slice(0, 5), bids: (idx.bids[key] || []).slice().sort(function (a, b) { return b - a; }).slice(0, 5) },
        myOrders: orders.filter(function (o) { return o.owner === 'you'; }).map(orderView.bind(null, world, env)) };
    },
    trades: function (realm, query) {
      query = query || {};
      var x = ctxNow(), world = x.world, env = x.env;
      var list = world.trades.filter(function (t) { return !query.cardId || t.c === query.cardId; }).slice().reverse();
      var page = core().paginate(list, query.cursor, query.limit || 20);
      return { realm: realm, items: page.items.map(function (t) { return tradeView(world, env, t); }), nextCursor: page.nextCursor, total: page.total,
        volume: list.reduce(function (n, t) { return n + t.price; }, 0) };
    },
    stocks: function (realm, query) { return stocksFor(realm, query || {}); },
    portfolio: function (realm) {
      var x = ctxNow(), world = x.world, env = x.env, p = playerState(), r = x.r;
      var holdings = p.inventory.map(function (i) {
        var sf = core().serialFactor(i.serial, C.data.market);
        var v = valuationFor(world, env, i.cardId, i.variantId || null, i.cardSkinId || null, sf);
        var basis = world.basis[i.instanceId];
        return { instance: i, card: env.cardById[i.cardId], valuation: v, estimate: v.average, basis: basis != null ? basis : null, listing: world.locks[i.instanceId] || null };
      }).filter(function (h) { return h.card; });
      var total = holdings.reduce(function (n, h) { return n + h.estimate; }, 0), by = {};
      holdings.forEach(function (h) { var rr = env.rarityById[h.card.rarity]; var key = rr ? rr.name : h.card.rarity; by[key] = (by[key] || 0) + h.estimate; });
      var known = holdings.filter(function (h) { return h.basis != null; });
      var mineOpen = [], bids = [], orders = [];
      for (var id in world.listings) {
        var l = world.listings[id];
        if (l.status === 'open' && l.seller === 'you') mineOpen.push(listingView(world, env, l));
        if (l.status === 'open' && l.maxes && l.maxes.you) bids.push(listingView(world, env, l));
      }
      for (var oid in world.orders) { var o = world.orders[oid]; if (o.owner === 'you' && o.status === 'open') orders.push(orderView(world, env, o)); }
      var st = world.stats.you, quickSell = 0;
      if (C.sales) p.inventory.forEach(function (i) { var qt = C.sales.quote(i); if (qt) quickSell += qt.quote; });
      return { realm: realm, demo: false, quickSellValue: quickSell, holdings: holdings, total: total, count: holdings.length, byRarity: by, wallet: provider.wallet(realm),
        realized: st.realizedN ? st.realized : null, realizedCount: st.realizedN || 0,
        unrealized: known.length ? known.reduce(function (n, h) { return n + (h.estimate - h.basis); }, 0) : null, unrealizedCount: known.length,
        feesPaid: st.fees || 0, tradesSold: st.sold, tradesBought: st.bought, earned: st.earned, spent: st.spent,
        sampleMine: mineOpen, sampleBids: bids, listings: mineOpen, bids: bids, orders: orders, revision: r.revision };
    },
    activity: function (realm) {
      var x = ctxNow(), world = x.world, env = x.env;
      var notices = world.notices.slice().reverse().map(function (n) { return { id: n.id, kind: n.ty, text: n.text, minutesAgo: Math.max(0, (world.now - n.t) / MIN), listingId: n.listing || null, offerId: n.offer || null, read: !!n.read }; });
      var mine = [], bids = [], orders = [], offers = [];
      for (var id in world.listings) {
        var l = world.listings[id];
        if (l.seller === 'you') mine.push(listingView(world, env, l));
        if (l.maxes && l.maxes.you && l.status === 'open') bids.push(listingView(world, env, l));
      }
      mine.sort(function (a, b) { return b.createdSim - a.createdSim; });
      for (var oid in world.orders) { var o = world.orders[oid]; if (o.owner === 'you') orders.push(orderView(world, env, o)); }
      for (var fid in world.offers) { var of = world.offers[fid]; if (of.from === 'you' || of.to === 'you') offers.push(offerView(world, env, of)); }
      offers.sort(function (a, b) { return a.minutesAgo - b.minutesAgo; });
      var feed = world.feed.slice().reverse().map(function (f) { return { t: f.t, type: f.ty, text: f.text, minutesAgo: Math.max(0, (world.now - f.t) / MIN), you: !!f.you, listingId: f.listing || null }; });
      return { realm: realm, notifications: notices, mine: mine, bids: bids, orders: orders, offers: offers, feed: feed, sample: false, revision: x.r.revision };
    },
    valuation: function (realm, spec) {
      var x = ctxNow(), sf = spec.serial ? core().serialFactor(spec.serial, C.data.market) : 1;
      return valuationFor(x.world, x.env, spec.cardId, spec.variantId || null, spec.cardSkinId || null, sf);
    },
    inventory: function () {
      var p = playerState(), r = C.marketSim.runtime, w = r.world;
      return { items: p.inventory.map(function (i) { return Object.assign({}, i, { _listed: w ? w.locks[i.instanceId] || null : null }); }), demo: false };
    },
    suggest: function (realm, text) {
      var x = ctxNow(), world = x.world, env = x.env, q = String(text || '').trim().toLowerCase();
      if (!q) return { cards: [], listings: [], sellers: [] };
      var cards = env.cards.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || String(c.brand || '').toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
      var ctx = C.market.api.context(realm);
      var listings = core().applyFilters(openViews(world, env, false), { q: text }, ctx).slice(0, 4);
      var seen = {}, sellers = [];
      openViews(world, env, false).forEach(function (l) { if (l.seller.alias.toLowerCase().indexOf(q) >= 0 && !seen[l.seller.alias]) { seen[l.seller.alias] = true; sellers.push(l.seller); } });
      return { cards: cards, listings: listings, sellers: sellers.slice(0, 3) };
    }
  };
  function orderView(world, env, o) {
    return { id: o.id, cardId: o.c, variantId: o.v || null, anyFinish: o.anyFinish, maxPrice: o.maxPrice, status: o.status, paid: o.paid || null,
      minutesLeft: o.status === 'open' ? Math.max(0, (o.expiresAt - world.now) / MIN) : 0, owner: S.aliasOf(world, o.owner), mine: o.owner === 'you' };
  }
  function offerView(world, env, of) {
    return { id: of.id, listingId: of.listingId, status: of.status, from: S.aliasOf(world, of.from), to: S.aliasOf(world, of.to), fromYou: of.from === 'you', toYou: of.to === 'you',
      give: of.give.map(function (it) { return { instanceId: it.i, cardId: it.c, variantId: it.v || null, serial: it.s, worth: S.itemWorth(world, env, it) }; }),
      get: of.get.map(function (it) { return { instanceId: it.i, cardId: it.c, variantId: it.v || null, serial: it.s, worth: S.itemWorth(world, env, it) }; }),
      cash: of.cashFrom || 0, note: of.note || '', minutesAgo: Math.max(0, (world.now - of.createdAt) / MIN), minutesLeft: Math.max(0, (of.expiresAt - world.now) / MIN) };
  }

  // ---- charts and groups --------------------------------------------------------------------------------------------
  var WINDOW = { '24h': { span: DAY, bucket: HOUR }, '7d': { span: 7 * DAY, bucket: 6 * HOUR }, '30d': { span: 30 * DAY, bucket: DAY }, '90d': { span: 90 * DAY, bucket: DAY }, all: { span: Infinity, bucket: DAY } };
  function bucketTrades(world, trades, win, valueOf) {
    var w = WINDOW[win] || WINDOW['7d'], start = isFinite(w.span) ? world.now - w.span : -Infinity, rows = {};
    trades.forEach(function (t) {
      if (t.t < start) return;
      var b = Math.floor(t.t / w.bucket), v = valueOf(t), row = rows[b];
      if (!row) rows[b] = { at: b * w.bucket + w.bucket / 2, open: v, high: v, low: v, close: v, volume: 1, credits: t.price };
      else { row.high = Math.max(row.high, v); row.low = Math.min(row.low, v); row.close = v; row.volume++; row.credits += t.price; }
    });
    return Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).map(function (b) { return rows[b]; });
  }
  function dailyFromWorld(world, win, source) {
    var w = WINDOW[win], now = S.dayIndex(world.now), minDay = isFinite(w.span) ? now - Math.ceil(w.span / DAY) : -Infinity, out = [];
    Object.keys(source).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) {
      if (d < minDay) return;
      var row = source[d];
      out.push({ day: d, row: row });
    });
    return out;
  }
  function stocksFor(realm, q) {
    var x = ctxNow(), world = x.world, env = x.env, win = WINDOW[q.window] ? q.window : '7d';
    var scope = q.scope || 'index', id = q.id || '';
    var members = env.cards, title = 'Cardable Index';
    if (scope === 'rarity') { members = env.cards.filter(function (c) { return c.rarity === id; }); title = (env.rarityById[id] || {}).name || id; }
    else if (scope === 'brand') { members = env.cards.filter(function (c) { return c.brand === id; }); title = id; }
    else if (scope === 'generation') { members = env.cards.filter(function (c) { return c.generation === id; }); title = ((C.data.generations || []).find(function (g) { return g.id === id; }) || {}).name || id; }
    else if (scope === 'card') { var cc = env.cardById[id]; members = cc ? [cc] : []; title = cc ? cc.name : id; }
    if (!members.length) return { realm: realm, empty: true, title: title, scope: scope, id: id, window: win };
    var set = {}; members.forEach(function (c) { set[c.id] = true; });
    var base = function (t) { return S.baselineFor(env, t.c, t.v, t.k); };
    var out = { realm: realm, scope: scope, id: id, window: win, title: title, members: members.length, candles: [], closes: [], unit: scope === 'card' ? 'Credits' : 'Index points', source: 'trades', now: world.now };
    var all = world.trades.filter(function (t) { return set[t.c]; });
    var candles;
    if (scope === 'card') {
      var key = S.keyOf(id, q.variantId || null, null);
      var days = world.daily[key];
      if ((win === '30d' || win === '90d' || win === 'all') && days) {
        candles = dailyFromWorld(world, win, days).map(function (d) { return { at: d.day * DAY + DAY / 2, open: d.row[0], high: d.row[1], low: d.row[2], close: d.row[3], volume: d.row[4], credits: d.row[5] }; });
        out.source = 'daily';
      } else candles = bucketTrades(world, all.filter(function (t) { return S.keyOf(t.c, t.v, t.k) === key; }), win, function (t) { return t.price; });
      out.valuation = valuationFor(world, env, id, q.variantId || null, null, 1);
    } else {
      var aggKey = scope === 'index' ? '*' : scope === 'rarity' ? 'r:' + id : null;
      if ((win === '30d' || win === '90d' || win === 'all') && aggKey) {
        candles = dailyFromWorld(world, win, world.agg).filter(function (d) { return d.row[aggKey]; }).map(function (d) {
          var a = d.row[aggKey];
          return { at: d.day * DAY + DAY / 2, open: a[4] * 100, high: a[7] * 100, low: a[6] * 100, close: a[5] * 100, volume: a[0], credits: a[1] };
        });
        out.source = 'daily';
      } else candles = bucketTrades(world, all, win, function (t) { return t.price / Math.max(1, base(t)) * 100; });
    }
    out.candles = candles; out.closes = candles.map(function (c) { return c.close; });
    out.tradesCounted = all.length;
    out.coverage = world.trades.length ? { from: world.trades[0].t, to: world.now, retained: world.trades.length } : null;
    // group aggregates, only from executed trades
    var t24 = all.filter(function (t) { return t.t > world.now - DAY; }), t7 = all.filter(function (t) { return t.t > world.now - 7 * DAY; });
    var ratios = all.slice(-60).map(function (t) { return t.price / Math.max(1, base(t)); });
    if (scope !== 'card') {
      var vals = members.map(function (c) { return valuationFor(world, env, c.id, null, null, 1); }).filter(function (v) { return v.samples > 0; });
      var spreadVals = members.map(function (c) { return valuationFor(world, env, c.id, null, null, 1); });
      out.aggregate = {
        volume24h: t24.length, volume7d: t7.length, credits24h: t24.reduce(function (n, t) { return n + t.price; }, 0),
        change24h: candles.length >= 2 ? changeOfCandles(world, candles, DAY) : null, change7d: candles.length >= 2 ? changeOfCandles(world, candles, 7 * DAY) : null,
        volatility: ratios.length >= 4 ? stdev(ratios) / (ratios.reduce(function (a, b) { return a + b; }, 0) / ratios.length) : null,
        liquidity: Math.min(1, t7.length / Math.max(8, members.length * 0.3)), spread: spreadVals.reduce(function (n, v) { return n + v.spread; }, 0) / spreadVals.length,
        samples: vals.reduce(function (n, v) { return n + v.samples; }, 0), cardsTraded: vals.length
      };
    }
    // leaders among the cards that actually traded
    var traded = members.map(function (c) { return { card: c, valuation: valuationFor(world, env, c.id, null, null, 1) }; }).filter(function (e) { return e.valuation.volume7d > 0 || e.valuation.samples > 0; });
    out.leaders = {
      active: traded.slice().sort(function (a, b) { return b.valuation.volume7d - a.valuation.volume7d || b.valuation.credits7d - a.valuation.credits7d; }).slice(0, 6),
      gainers: traded.filter(function (e) { return e.valuation.change7d != null && e.valuation.change7d > 0; }).sort(function (a, b) { return b.valuation.change7d - a.valuation.change7d; }).slice(0, 5),
      losers: traded.filter(function (e) { return e.valuation.change7d != null && e.valuation.change7d < 0; }).sort(function (a, b) { return a.valuation.change7d - b.valuation.change7d; }).slice(0, 5),
      values: traded.filter(function (e) { return e.valuation.askReal; }).sort(function (a, b) { return a.valuation.lowestAsk / a.valuation.average - b.valuation.lowestAsk / b.valuation.average; }).slice(0, 5)
    };
    return out;
  }
  function changeOfCandles(world, candles, span) {
    var last = candles[candles.length - 1], start = world.now - span, ref = null;
    for (var i = candles.length - 2; i >= 0; i--) if (candles[i].at <= start) { ref = candles[i]; break; }
    if (!ref || last.at <= start || !ref.close) return null;
    return (last.close - ref.close) / ref.close;
  }

  // ---- actions -------------------------------------------------------------------------------------------------------
  function viewOfResult(res) {
    var x = ctxNow();
    if (res && res.listing && res.listing.items) res.listingView = listingView(x.world, x.env, res.listing);
    return res;
  }
  var actions = {
    purchase: function (realm, id, requestId) { return viewOfResult(rt().act.buy(id, requestId)); },
    placeBid: function (realm, id, max, requestId) { return viewOfResult(rt().act.bid(id, max, requestId)); },
    buyout: function (realm, id, requestId) { return viewOfResult(rt().act.buyout(id, requestId)); },
    publishListing: function (realm, spec) { return viewOfResult(rt().act.list(spec)); },
    cancelListing: function (realm, id) { return viewOfResult(rt().act.cancel(id)); },
    placeOrder: function (realm, spec) { return rt().act.placeOrder(spec); },
    cancelOrder: function (realm, id) { return rt().act.cancelOrder(id); },
    makeOffer: function (realm, spec) { return rt().act.propose(spec); },
    respondToOffer: function (realm, id, accept, requestId) { return rt().act.respond(id, accept, requestId); },
    withdrawOffer: function (realm, id) { return rt().act.withdraw(id); },
    // Quick Sell is the system's bid, not a trade: it goes through the shared sales core and never touches the world.
    quickSell: function (realm, spec) {
      if (!C.sales) return { ok: false, error: 'not-available', message: 'Quick Sell is not available.' };
      var ids = spec && spec.instanceIds || [];
      return C.sales.sell(ids, { kind: ids.length > 1 ? 'bulk' : 'quick', strict: false, expectTotal: spec && spec.expectTotal });
    }
  };
  Object.keys(actions).forEach(function (k) { provider[k] = actions[k]; });

  S.provider = provider;
  C.events.on('app:ready', function () { if (C.market.api) C.market.api.registerProvider('simulation', provider); });
  S.provider.helpers = { listingView: listingView, valuationFor: valuationFor, clockLabel: clockLabel };
})(window.Cardable = window.Cardable || {});
