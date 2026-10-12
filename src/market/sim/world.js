/* Cardable Market — offline simulation engine, part 2: world creation, bot behaviour, the daily rules and advance().
 * Bots are event driven: each has one next-wake time. Nothing runs per frame. */
(function (C) {
  'use strict';
  var S = C.market.sim;
  var MIN = S.MIN, HOUR = S.HOUR, DAY = S.DAY;
  var cfg = function () { return C.data.marketSim; };
  var core = function () { return C.market.core; };

  // ---- creation ------------------------------------------------------------------------------------------------------
  function blankWorld(seed, nonce, wall) {
    var s = core().hash32(String(seed) + '|' + nonce) || 1;
    return {
      v: 1, seed: String(seed), nonce: nonce, rng: s, wall0: wall || 0,
      now: 0, epoch: 0, nextId: 0, evSeq: 0, queue: [], day: -1,
      bots: [], listings: {}, closed: [], orders: {}, offers: {}, locks: {}, requests: {}, basis: {},
      trades: [], obs: {}, obsStamp: {}, daily: {}, agg: {}, feed: [], notices: [], receipts: {}, pending: [],
      minted: 0, days: [], speedNote: '',
      stats: { trades: 0, volume: 0, fees: 0, burnt: 0, allowance: 0, packs: 0, you: { sold: 0, bought: 0, earned: 0, spent: 0 } }
    };
  }
  function index(world) {
    world.botIndex = {};
    world.basis = world.basis || {};
    world.bots.forEach(function (b) { world.botIndex[b.id] = b; });
    world._fair = {};
    return world;
  }
  function uniqueAlias(world, env, used) {
    for (var tries = 0; tries < 200; tries++) {
      var a = S.pick(world, env.names.adjectives) + ' ' + S.pick(world, env.names.nouns);
      if (!used[a]) { used[a] = true; return a; }
    }
    return 'Bot ' + (Object.keys(used).length + 1);
  }
  function uniqueCode(world, used) {
    var alpha = cfg().world.codeAlphabet;
    for (var tries = 0; tries < 400; tries++) {
      var code = '';
      for (var i = 0; i < 4; i++) code += alpha.charAt(Math.floor(S.rnd(world) * alpha.length));
      if (!used[code]) { used[code] = true; return code; }
    }
    throw new Error('Could not allocate a bot serial code');
  }
  function wishFor(world, env, bot, persona) {
    var cards = env.cards, wish = [], size = persona.wish;
    function sample(list, n) {
      var pool = list.slice(), out = [];
      while (pool.length && out.length < n) out.push(pool.splice(Math.floor(S.rnd(world) * pool.length), 1)[0].id);
      return out;
    }
    if (persona.id === 'completionist') {
      var gen = S.pick(world, env.generations);
      bot.focus = { gen: gen };
      wish = sample(cards.filter(function (c) { return c.generation === gen; }), size);
    } else if (persona.id === 'specialist') {
      if (env.brands.length && S.chance(world, 0.7)) { var brand = S.pick(world, env.brands); bot.focus = { brand: brand }; wish = sample(cards.filter(function (c) { return c.brand === brand; }), size); }
      else { var g = S.pick(world, env.generations); bot.focus = { gen: g }; wish = sample(cards.filter(function (c) { return c.generation === g; }), size); }
    } else if (persona.id === 'collector') {
      wish = sample(cards.filter(function (c) { return (env.tierOf[c.id] || 0) >= 2; }), size);
    } else {
      var lo = persona.tier[0], hi = persona.tier[1];
      wish = sample(cards.filter(function (c) { var t = env.tierOf[c.id] || 0; return t >= lo && t <= hi; }), size);
    }
    return wish;
  }
  var START = { collector: [14, 26], investor: [8, 16], hunter: [6, 14], flipper: [8, 14], completionist: [16, 28], specialist: [12, 22], cautious: [8, 14], risk: [6, 12], hype: [6, 12] };

  function create(options, env) {
    var o = options || {};
    var world = blankWorld(o.seed != null ? o.seed : 'cardable', o.nonce || 1, o.wall || 0);
    var c = cfg(), personas = c.personas, usedAlias = {}, usedCode = {};
    if (o.reservedCodes) o.reservedCodes.forEach(function (x) { usedCode[x] = true; });
    for (var i = 0; i < c.world.bots; i++) {
      var persona = personas[i % personas.length];
      var bot = { id: 'b' + String(i + 1).padStart(2, '0'), alias: uniqueAlias(world, env, usedAlias), persona: persona.id, code: uniqueCode(world, usedCode), serial: 100 + Math.floor(S.rnd(world) * 2400),
        credits: 0, held: {}, inv: [], wish: [], focus: null, nextWake: 0, open: 0, soldRecent: {}, stats: { bought: 0, sold: 0, net: 0 } };
      bot.wish = wishFor(world, env, bot, persona);
      var range = START[persona.id] || [8, 14], n = Math.round(S.between(world, range[0], range[1])), value = 0;
      for (var j = 0; j < n; j++) {
        var it = S.mintItem(world, env, bot, 0, 'start');
        // Wish cards the bot already holds are the ones it keeps; give some of them to the start of the set.
        if (bot.wish.length && S.chance(world, 0.12)) { it.c = S.pick(world, bot.wish); }
        it.u = S.baselineFor(env, it.c, it.v, it.k) * S.between(world, 0.8, 1.05);
        value += it.u; bot.inv.push(it);
      }
      bot.credits = Math.round(value * S.between(world, 0.45, 1.1) + c.economy.allowance.reserveBase * S.between(world, 0.8, 1.4));
      world.bots.push(bot);
      S.addEvent(world, Math.round(S.between(world, 0, persona.wake[1]) * HOUR), 'wake', bot.id);
    }
    S.addEvent(world, DAY, 'day', '');
    index(world);
    world.minted = 0;
    return world;
  }

  // ---- decisions -----------------------------------------------------------------------------------------------------
  function privateValue(world, env, bot, it, persona) {
    var fair = S.fairInfo(world, env, it.c, it.v, it.k);
    var noise = 1 + cfg().valuation.botNoise * (S.stableUnit(bot.id + '|' + S.itemKey(it)) * 2 - 1);
    var v = fair.average * S.serialFactor(it.s) * noise;
    var wished = bot.wish.indexOf(it.c) >= 0;
    if (wished) v *= 1 + (persona.id === 'completionist' ? 0.3 : persona.id === 'collector' ? 0.18 : 0.08);
    if (persona.trend) {
      var ch = recentChange(world, it);
      if (ch != null) v *= 1 + persona.trend * S.clamp(ch, -0.3, 0.3);
    }
    var tier = env.tierOf[it.c] || 0;
    if (tier < persona.tier[0] || tier > persona.tier[1]) v *= 0.82;
    if (bot.focus && !wished) {
      var card = env.cardById[it.c];
      if (bot.focus.brand && card && card.brand !== bot.focus.brand) v *= 0.8;
      if (bot.focus.gen && card && card.generation !== bot.focus.gen) v *= 0.8;
    }
    return { value: v, fair: fair.average, wished: wished, confidence: fair.confidence };
  }
  // Change of the last trade against the average of the trades before it: only from observed trades.
  function recentChange(world, it) {
    var obs = world.obs[S.itemKey(it)];
    if (!obs || obs.length < 3) return null;
    var last = obs[obs.length - 1][1], prior = 0, n = Math.min(4, obs.length - 1);
    for (var i = 0; i < n; i++) prior += obs[obs.length - 2 - i][1];
    prior /= n;
    return prior ? (last - prior) / prior : null;
  }
  function interested(world, env, bot, it) {
    var p = S.personaOf(bot), tier = env.tierOf[it.c] || 0;
    if (bot.wish.indexOf(it.c) >= 0) return true;
    if (tier < p.tier[0] || tier > p.tier[1]) return false;
    var card = env.cardById[it.c];
    if (bot.focus && card) {
      if (bot.focus.brand && card.brand !== bot.focus.brand) return false;
      if (bot.focus.gen && card.generation !== bot.focus.gen) return false;
    }
    return true;
  }
  function openListings(world, exclude) {
    var out = [];
    for (var id in world.listings) { var l = world.listings[id]; if (l.status === 'open' && l.seller !== exclude && world.now < l.endsAt) out.push(l); }
    out.sort(function (a, b) { return a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1); });
    return out;
  }

  function buyPass(world, env, host, bot, persona) {
    var cands = openListings(world, bot.id), picked = [], shuffleCount = Math.min(cands.length, 14);
    // Sample a limited number of listings, not the whole book.
    for (var i = 0; i < shuffleCount; i++) {
      var at = Math.floor(S.rnd(world) * cands.length);
      picked.push(cands.splice(at, 1)[0]);
    }
    var best = null;
    picked.forEach(function (l) {
      if (l.kind === 'swap') return;
      if (l.items.length !== 1) return;
      var it = l.items[0];
      if (bot.soldRecent[S.itemKey(it)] && world.now - bot.soldRecent[S.itemKey(it)] < 3 * DAY) return;
      if (!interested(world, env, bot, it)) return;
      var pv = privateValue(world, env, bot, it, persona);
      var need = persona.buyMargin + (pv.wished ? -0.04 : 0) + (pv.confidence === 'none' ? 0.04 : 0);
      var price = S.currentPrice(l);
      var ceiling = Math.floor(pv.value * (1 - need));
      var avail = S.botAvailable(bot);
      if (l.kind === 'fixed') {
        if (l.ask <= ceiling && l.ask <= avail && (l.ask <= avail * persona.spend + 1 || pv.wished && l.ask <= avail * 0.85)) {
          var margin = (ceiling - l.ask) / Math.max(1, ceiling);
          if (!best || margin > best.margin) best = { l: l, margin: margin, how: 'fixed', pv: pv };
        }
      } else if (l.kind === 'auction') {
        var view = S.auctionView(l);
        if (view.lead && view.lead.by === bot.id) return;
        var minNext = view.bidders ? view.price + S.incrementFor(view.price) : l.start;
        var max = Math.min(ceiling, Math.floor(avail * (pv.wished ? 0.85 : persona.spend + 0.15)));
        if (max >= minNext) {
          var m2 = (ceiling - minNext) / Math.max(1, ceiling);
          if (!best || m2 > best.margin) best = { l: l, margin: m2, how: 'bid', max: max, pv: pv };
        }
      }
    });
    if (!best) return;
    if (best.how === 'fixed') {
      if (best.l.kind === 'fixed' && best.l.status === 'open') S.completeSale(world, env, host, best.l, { buyer: bot.id, price: best.l.ask, kind: 'fixed' });
    } else {
      var remaining = best.l.endsAt - world.now, total = best.l.endsAt - best.l.createdAt;
      if (S.chance(world, persona.snipe) && remaining > Math.max(20 * MIN, total * 0.15)) {
        var at = best.l.endsAt - Math.max(3 * MIN, Math.round(total * S.between(world, 0.01, 0.05)));
        S.addEvent(world, at, 'snipe', bot.id, { listing: best.l.id, max: best.max });
      } else {
        S.placeBid(world, env, host, best.l, bot.id, best.max);
      }
    }
  }

  function listItem(world, env, host, bot, persona, it, needCash) {
    var fair = S.fairInfo(world, env, it.c, it.v, it.k), sf = S.serialFactor(it.s);
    var value = fair.average * sf;
    var tier = env.tierOf[it.c] || 0, lp = cfg().listing;
    var wantsAuction = tier >= 1 && !needCash && S.chance(world, Math.min(0.85, persona.auction * (lp.auctionShare || 1)));
    // Asks scatter around fair value: a little below to a little above, wider for bolder personalities.
    var markup = persona.markup * (S.rnd(world) - 0.3);
    if (needCash) markup = Math.min(markup, -0.03);
    var cost = it.u || 0;
    var why = needCash ? 'Needed Credits' : fair.confidence === 'none' ? 'Priced from the baseline estimate' : 'Priced from recent sales';
    bot.inv = bot.inv.filter(function (x) { return x !== it; });
    if (wantsAuction) {
      var dur = S.pick(world, lp.auctionHours) * HOUR;
      var start = Math.max(1, S.nice(value * S.between(world, 0.5, 0.78)));
      var reserve = S.chance(world, 0.4) ? Math.max(start, S.nice(value * S.between(world, 0.82, 1.0))) : null;
      var buyout = S.chance(world, 0.15) ? S.nice(value * S.between(world, 1.2, 1.45)) : null;
      var l = S.makeListing(world, { kind: 'auction', seller: bot.id, items: [it], start: start, reserve: reserve, buyout: buyout, durationMs: dur, reason: why });
      bot.open += 1;
      S.feed(world, 'listed', bot.alias + ' put ' + S.cardLabel(env, it) + ' up for auction from ' + start + ' Credits', { listing: l.id });
      return l;
    }
    var ask = S.nice(value * (1 + markup));
    if (cost && persona.id === 'flipper') ask = Math.max(ask, S.nice(cost * 1.03));
    ask = Math.max(cfg().economy.minPrice, ask);
    var days = S.between(world, lp.fixedDurationDays[0], lp.fixedDurationDays[1]);
    var l2 = S.makeListing(world, { kind: 'fixed', seller: bot.id, items: [it], ask: ask, durationMs: Math.round(days * DAY), reason: why });
    l2.pricedAt = world.now;
    bot.open += 1;
    S.feed(world, 'listed', bot.alias + ' listed ' + S.cardLabel(env, it) + ' at ' + ask + ' Credits', { listing: l2.id });
    S.matchOrdersFor(world, env, host, l2);
    return l2;
  }
  function sellPass(world, env, host, bot, persona) {
    var lp = cfg().listing;
    if (bot.open >= lp.maxOpenPerBot) return;
    var needCash = S.botAvailable(bot) < 25;
    var candidates = bot.inv.filter(function (it) {
      if (world.locks[it.i]) return false;
      var wished = bot.wish.indexOf(it.c) >= 0;
      if (wished && S.stableUnit(it.i + 'keep') < persona.keep) return false;
      var age = world.now - (it.a || 0);
      var hold = (persona.holdDays[0] + S.stableUnit(it.i + 'hold') * (persona.holdDays[1] - persona.holdDays[0])) * DAY;
      return needCash || age >= hold || !interested(world, env, bot, it) && age >= hold * 0.4;
    });
    if (!candidates.length) return;
    var n = Math.min(candidates.length, needCash ? 2 : 1 + (S.chance(world, 0.25) ? 1 : 0), lp.maxOpenPerBot - bot.open);
    for (var i = 0; i < n; i++) {
      var it = candidates.splice(Math.floor(S.rnd(world) * candidates.length), 1)[0];
      if (it) listItem(world, env, host, bot, persona, it, needCash);
    }
  }
  function manageOwn(world, env, host, bot, persona) {
    var staleMs = S.clamp((persona.wake[0] + persona.wake[1]) / 2 * 5, 10, 96) * HOUR;
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.seller !== bot.id || l.status !== 'open' || l.kind !== 'fixed') continue;
      if (world.now - (l.pricedAt || l.createdAt) < staleMs) continue;
      var fair = S.fairInfo(world, env, l.items[0].c, l.items[0].v, l.items[0].k).average * S.serialFactor(l.items[0].s);
      var floor = Math.max(cfg().economy.minPrice, S.nice(fair * 0.8)), cost = l.items[0].u || 0;
      if (persona.id === 'flipper' && cost) floor = Math.max(floor, S.nice(cost * 0.97));
      if (l.ask > floor) {
        var step = S.between(world, 0.04, 0.1);
        l.ask = Math.max(floor, Math.min(l.ask - 1, S.nice(l.ask * (1 - step))));
        l.pricedAt = world.now;
        S.matchOrdersFor(world, env, host, l);
      } else l.pricedAt = world.now;
    }
  }
  function orderPass(world, env, host, bot, persona) {
    var mine = 0;
    for (var id in world.orders) if (world.orders[id].owner === bot.id && world.orders[id].status === 'open') mine++;
    if (mine >= cfg().listing.maxOrdersPerBot || !S.chance(world, 0.22)) return;
    var pool = env.cards.filter(function (c) { return bot.wish.indexOf(c.id) >= 0 && !bot.inv.some(function (x) { return x.c === c.id; }); });
    if (!pool.length) return;
    var card = S.pick(world, pool), fair = S.fairInfo(world, env, card.id, null, null).average;
    var price = Math.max(cfg().economy.minPrice, S.nice(fair * (1 - persona.buyMargin - S.between(world, 0.02, 0.1))));
    if (price > S.botAvailable(bot) * persona.spend + 1) return;
    var days = S.between(world, cfg().listing.buyOrderDays[0], cfg().listing.buyOrderDays[1]);
    S.openOrder(world, env, host, bot.id, { c: card.id, v: null, maxPrice: price, durationMs: Math.round(days * DAY) });
    S.feed(world, 'order', bot.alias + ' placed a buy order for ' + card.name + ' up to ' + price + ' Credits', {});
  }
  function swapPass(world, env, host, bot, persona) {
    // Answer standing swap listings from the player with an offer of equal value, when the bot wants the card.
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.seller !== 'you' || l.kind !== 'swap' || l.status !== 'open') continue;
      if (l.offers.some(function (oid) { var of = world.offers[oid]; return of && of.from === bot.id && of.status === 'pending'; })) continue;
      if (!S.chance(world, 0.3)) continue;
      var want = l.items[0], wv = S.itemWorth(world, env, want);
      if (!interested(world, env, bot, want)) continue;
      var give = bot.inv.filter(function (it) { return !world.locks[it.i] && bot.wish.indexOf(it.c) < 0; }).map(function (it) { return { it: it, w: S.itemWorth(world, env, it) }; })
        .filter(function (x) { return x.w >= wv * 0.9 && x.w <= wv * 1.25; }).sort(function (a, b) { return a.w - b.w; });
      if (!give.length) continue;
      var offer = { id: S.nextId(world, 'F'), from: bot.id, to: 'you', listingId: l.id, give: [give[0].it], get: l.items.slice(), cashFrom: 0, status: 'pending', createdAt: world.now,
        expiresAt: world.now + cfg().listing.offerExpiryDays * DAY, note: persona.label + ' offers a swap' };
      world.offers[offer.id] = offer; l.offers.push(offer.id);
      world.locks[give[0].it.i] = 'offer:' + offer.id;
      S.addEvent(world, offer.expiresAt, 'offerEnd', offer.id);
      S.notify(world, 'offer', S.aliasOf(world, bot.id) + ' offered ' + S.cardLabel(env, give[0].it) + ' for your ' + S.cardLabel(env, want) + '.', { listing: l.id, offer: offer.id });
      return;
    }
    // Put a spare duplicate up as a swap for a card on its wish list.
    if (bot.open >= cfg().listing.maxOpenPerBot || !S.chance(world, 0.08)) return;
    var spares = bot.inv.filter(function (it) { return !world.locks[it.i] && bot.inv.filter(function (x) { return x.c === it.c; }).length > 1; });
    var targets = bot.wish.filter(function (id2) { return !bot.inv.some(function (x) { return x.c === id2; }); });
    if (!spares.length || !targets.length) return;
    var it2 = spares[0], target = S.pick(world, targets);
    bot.inv = bot.inv.filter(function (x) { return x !== it2; });
    var l2 = S.makeListing(world, { kind: 'swap', seller: bot.id, items: [it2], durationMs: Math.round(S.between(world, 3, 8) * DAY), wants: { cardId: target, minFrac: cfg().listing.swapMinFrac }, reason: persona.label + ' wants a specific card' });
    bot.open += 1;
    S.feed(world, 'listed', bot.alias + ' offered ' + S.cardLabel(env, it2) + ' for a swap', { listing: l2.id });
  }

  function botWake(world, env, host, bot) {
    var persona = S.personaOf(bot);
    manageOwn(world, env, host, bot, persona);
    sellPass(world, env, host, bot, persona);
    buyPass(world, env, host, bot, persona);
    orderPass(world, env, host, bot, persona);
    swapPass(world, env, host, bot, persona);
    S.addEvent(world, world.now + Math.max(MIN * 5, Math.round(S.between(world, persona.wake[0], persona.wake[1]) * HOUR)), 'wake', bot.id);
  }

  // ---- offers answered by bots ---------------------------------------------------------------------------------------
  function botAnswersOffer(world, env, host, offer) {
    if (offer.status !== 'pending') return;
    var l = world.listings[offer.listingId], bot = S.botOf(world, offer.to);
    if (!l || l.status !== 'open' || !bot) { S.closeOffer(world, offer, 'declined', 'The listing is no longer open'); return; }
    var p = S.personaOf(bot), wantWorth = S.setsWorth(world, env, offer.get), giveWorth = S.setsWorth(world, env, offer.give) + (offer.cashFrom || 0);
    var wanted = l.wants && offer.give.some(function (it) { return it.c === l.wants.cardId; });
    var need = (l.wants ? l.wants.minFrac : cfg().listing.swapMinFrac) * (wanted ? 0.7 : 1);
    // Both sides must still hold what they agreed to trade.
    var stillThere = offer.give.every(function (it) { return !!host.instance(it.i); });
    if (!stillThere) { S.closeOffer(world, offer, 'withdrawn', 'The offered card is gone'); return; }
    if (giveWorth >= wantWorth * need) {
      acceptSwap(world, env, host, offer, l);
    } else if (giveWorth >= wantWorth * 0.6 && p.id !== 'cautious') {
      var gap = Math.ceil(wantWorth * need - giveWorth);
      offer.status = 'countered'; offer.cashFrom = (offer.cashFrom || 0) + gap; offer.counteredAt = world.now;
      offer.note = bot.alias + ' would do it with ' + gap + ' more Credits';
      S.notify(world, 'counter', bot.alias + ' countered: add ' + gap + ' Credits to swap for ' + S.cardLabel(env, offer.get[0]) + '.', { listing: l.id, offer: offer.id });
    } else {
      S.closeOffer(world, offer, 'declined', bot.alias + ' declined');
      S.notify(world, 'declined', bot.alias + ' declined your swap for ' + S.cardLabel(env, offer.get[0]) + '.', { listing: l.id, offer: offer.id });
    }
  }
  // Moves cards both ways. The player's side goes through the save in one settlement.
  function acceptSwap(world, env, host, offer, l) {
    var from = offer.from, to = offer.to, youGive = from === 'you', youGet = to === 'you';
    var cash = offer.cashFrom || 0, cashFee = cash > 0 ? S.fee(cash) : 0;
    var botSide = S.botOf(world, youGive ? to : from);
    if (!botSide) return false;
    var effect = { receiptId: 'R-' + world.nonce.toString(36) + '-' + offer.id, kind: 'swap', listingId: l.id, at: world.now, remove: [], add: [], delta: 0, reason: 'market swap', price: cash, fee: cashFee, items: [] };
    var playerItems = youGive ? offer.give : offer.get, botItems = youGive ? offer.get : offer.give;
    effect.remove = playerItems.map(function (it) { return it.i; });
    effect.add = botItems.map(function (it) { return S.instanceFrom(it, world.now, world); });
    effect.items = playerItems.concat(botItems).map(function (it) { return { i: it.i, c: it.c, v: it.v, k: it.k, s: it.s }; });
    // cash flows from the proposer to the recipient; the recipient's fee is taken from it
    var playerPays = youGive ? cash : 0, playerGets = youGive ? 0 : cash - cashFee;
    if (youGive && cash > 0 && host.balance() < cash) { S.closeOffer(world, offer, 'declined', 'Not enough Credits'); return false; }
    effect.delta = playerGets - playerPays;
    world.receipts[effect.receiptId] = { state: 'pending', t: world.now, effect: effect, swap: offer.id };
    world.pending.push(effect.receiptId);
    offer.status = 'settling'; offer.settleId = effect.receiptId;
    var ok = false;
    try { ok = host.settle(effect) === true; } catch (_) { ok = false; }
    if (!ok) { world.receipts[effect.receiptId].attempts = 1; return false; }
    S.finishSwap(world, env, offer, l, effect.receiptId);
    return true;
  }
  function finishSwap(world, env, offer, l, receiptId) {
    var rec = world.receipts[receiptId];
    if (rec) { rec.state = 'done'; rec.doneAt = world.now; }
    world.pending = world.pending.filter(function (id) { return id !== receiptId; });
    var youGive = offer.from === 'you', bot = S.botOf(world, youGive ? offer.to : offer.from);
    var cash = offer.cashFrom || 0, cashFee = cash > 0 ? S.fee(cash) : 0;
    if (bot) {
      var theirs = youGive ? offer.get : offer.give;
      theirs.forEach(function (it) { S.removeFromInv(bot, it.i); delete world.locks[it.i]; });
      var received = youGive ? offer.give : offer.get;
      received.forEach(function (it) { it.a = world.now; it.u = 0; bot.inv.push(it); });
      if (youGive && cash > 0) bot.credits += cash - cashFee;
      if (!youGive && cash > 0) bot.credits -= cash;
      bot.stats.sold += 1; bot.stats.bought += 1;
    }
    if (cash > 0) world.stats.burnt += cashFee;
    (youGive ? offer.give : offer.get).forEach(function (it) { delete world.locks[it.i]; });
    offer.status = 'accepted'; offer.closedAt = world.now;
    if (l) {
      var bundle = l.items.slice();
      if (l.seller !== 'you') { var sb = S.botOf(world, l.seller); if (sb) { sb.open = Math.max(0, sb.open - 1); } }
      l.items = l.items; l.swappedFor = offer.id;
      S.finishListing(world, l, 'sold');
      l.soldFor = 0;
    }
    // A swap is a barter. It is shown in history but is not a priced sale, so it adds no price observation.
    world.stats.swaps = (world.stats.swaps || 0) + 1;
    var give = offer.give[0], get = offer.get[0];
    S.feed(world, 'swap', S.aliasOf(world, offer.from) + ' swapped ' + S.cardLabel(env, give) + ' with ' + S.aliasOf(world, offer.to) + ' for ' + S.cardLabel(env, get), { you: offer.from === 'you' || offer.to === 'you' });
    S.notify(world, 'swapped', 'Swap complete: ' + S.cardLabel(env, youGive ? give : get) + ' for ' + S.cardLabel(env, youGive ? get : give) + '.', { listing: l && l.id, offer: offer.id });
  }

  // ---- the daily rules: the only places Credits and cards enter ------------------------------------------------------
  // Finished orders and offers are history, not state: keep a few days of them (two weeks of the player's own).
  function pruneClosed(world) {
    var short = world.now - 3 * DAY, long = world.now - 14 * DAY, id;
    for (id in world.orders) {
      var o = world.orders[id];
      if (o.status === 'open') continue;
      var at = o.closedAt || o.expiresAt || o.createdAt || 0;
      if (at < (o.owner === 'you' ? long : short)) delete world.orders[id];
    }
    for (id in world.offers) {
      var of = world.offers[id];
      if (of.status === 'pending' || of.status === 'countered' || of.status === 'settling') continue;
      var when = of.closedAt || of.expiresAt || of.createdAt || 0;
      if (when < (of.from === 'you' || of.to === 'you' ? long : short)) delete world.offers[id];
    }
  }
  function dailyTick(world, env, host) {
    var c = cfg(), a = c.economy.allowance, issued = 0, opened = 0;
    var dayNo = S.dayIndex(world.now);
    // Allowance: top a bot up toward its reserve, never past it, within a daily cap. Visible in the totals.
    world.bots.forEach(function (bot) {
      var p = S.personaOf(bot), wealth = bot.credits + bot.inv.length * 20;
      var reserve = (a.reserveBase + wealth * a.reserveScale * 0.1) * p.allowance;
      var gap = reserve - bot.credits;
      if (gap > 0) { var give = Math.min(Math.ceil(gap), a.dailyCap * p.allowance); bot.credits += give; issued += give; }
    });
    world.stats.allowance += issued;
    pruneClosed(world);
    // Packs: bounded per bot and across the world.
    var pk = c.economy.packs, budget = pk.worldPerDay;
    var order = world.bots.slice().sort(function () { return S.rnd(world) - 0.5; });
    for (var i = 0; i < order.length && budget > 0; i++) {
      var bot = order[i], p2 = S.personaOf(bot), n = 0, expected = pk.perBotPerDay * p2.packs;
      while (n < pk.maxPerBotPerDay && budget > 0 && S.chance(world, expected / (n + 1))) {
        for (var j = 0; j < pk.cardsPerPack; j++) { var it = S.mintItem(world, env, bot, world.now, 'pack'); it.u = 0; bot.inv.push(it); }
        n += 1; budget -= 1; opened += 1;
      }
    }
    world.stats.packs += opened;
    var credits = world.bots.reduce(function (s, b) { return s + b.credits; }, 0);
    var openCount = 0; for (var id in world.listings) if (world.listings[id].status === 'open') openCount++;
    world.days.push({ d: dayNo, trades: world.stats.trades, volume: world.stats.volume, burnt: world.stats.burnt, issued: world.stats.allowance, packs: world.stats.packs, credits: credits, listings: openCount, minted: world.minted });
    if (world.days.length > c.keep.days) world.days.splice(0, world.days.length - c.keep.days);
    if (issued || opened) S.feed(world, 'day', 'A new simulated day: ' + opened + ' packs opened and ' + issued + ' Credits of allowance issued across the bots', {});
    S.addEvent(world, (dayNo + 1) * DAY, 'day', '');
  }

  // ---- the event loop ------------------------------------------------------------------------------------------------
  function handle(world, env, host, ev) {
    switch (ev.type) {
      case 'wake': { var b = S.botOf(world, ev.ref); if (b) botWake(world, env, host, b); break; }
      case 'snipe': {
        var bs = S.botOf(world, ev.ref), l = world.listings[ev.listing];
        if (bs && l && l.status === 'open' && l.kind === 'auction') {
          var view = S.auctionView(l);
          if (!view.lead || view.lead.by !== bs.id) S.placeBid(world, env, host, l, bs.id, ev.max);
        }
        break;
      }
      case 'end': {
        var li = world.listings[ev.ref];
        if (!li || li.status !== 'open') break;
        if (li.kind === 'auction') { if (ev.ver !== li.endVer) break; S.endAuction(world, env, host, li); }
        else {
          S.returnItems(world, li); S.finishListing(world, li, 'expired');
          li.offers.forEach(function (oid) { var of0 = world.offers[oid]; if (of0 && (of0.status === 'pending' || of0.status === 'countered')) S.closeOffer(world, of0, 'withdrawn', 'The listing expired'); });
          if (li.seller === 'you') S.notify(world, 'expired', 'Your listing of ' + S.cardLabel(env, li.items[0]) + ' expired.', { listing: li.id });
        }
        break;
      }
      case 'orderEnd': {
        var o = world.orders[ev.ref];
        if (o && o.status === 'open') { o.status = 'expired'; var ob = S.botOf(world, o.owner); if (ob) delete ob.held['O' + o.id]; if (o.owner === 'you') S.notify(world, 'order-expired', 'Your buy order for ' + S.cardLabel(env, { c: o.c, v: o.v }) + ' expired.', { order: o.id }); }
        break;
      }
      case 'offerReply': { var of = world.offers[ev.ref]; if (of) botAnswersOffer(world, env, host, of); break; }
      case 'offerEnd': {
        var of2 = world.offers[ev.ref];
        if (of2 && (of2.status === 'pending' || of2.status === 'countered')) { S.closeOffer(world, of2, 'expired', 'Expired'); if (of2.to === 'you' || of2.from === 'you') S.notify(world, 'offer-expired', 'A swap offer expired.', { offer: of2.id }); }
        break;
      }
      case 'day': dailyTick(world, env, host); break;
      default: break;
    }
  }
  // Runs every event due up to `target`. Returns { processed, reached } so a caller can continue next slice.
  function advance(world, env, host, target, budget) {
    var q = world.queue, n = 0, cap = budget || cfg().tickBudgetEvents;
    while (q.length && q[0].t <= target && n < cap) {
      var ev = q.shift();
      world.now = Math.max(world.now, ev.t);
      handle(world, env, host, ev);
      n += 1;
    }
    var reached = !(q.length && q[0].t <= target);
    if (reached) world.now = Math.max(world.now, target);
    return { processed: n, reached: reached };
  }

  Object.assign(S, { create: create, index: index, advance: advance, botWake: botWake, privateValue: privateValue, blankWorld: blankWorld, acceptSwap: acceptSwap,
    finishSwap: finishSwap, botAnswersOffer: botAnswersOffer, dailyTick: dailyTick, openListings: openListings, interested: interested });
})(window.Cardable = window.Cardable || {});
