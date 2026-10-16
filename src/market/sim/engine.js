/* Cardable Market — offline simulation engine, part 1: world, valuation, listings, orders and offers.
 *
 * Pure and deterministic. It touches no DOM, no storage and no network, and never reads the player's save
 * directly: everything the player owns reaches it through an injected `host`.
 *
 *   host.balance()            Credits in the player's save
 *   host.instance(id)         a copy of one owned card instance, or null
 *   host.settle(effect)       idempotently applies { receiptId, remove[], add[], delta, reason } to the save
 *
 * Time is an integer of simulated milliseconds (`world.now`). Randomness is one saved 32-bit state (`world.rng`).
 * The same seed, catalog and sequence of calls always produce the same world. See docs/market-beta/stage-2.md. */
(function (C) {
  'use strict';
  C.market = C.market || {};
  var S = C.market.sim = C.market.sim || {};
  var MIN = 60000, HOUR = 3600000, DAY = 86400000;
  var cfg = function () { return C.data.marketSim; };
  var core = function () { return C.market.core; };

  // ---- randomness ------------------------------------------------------------------------------------------------
  function rnd(w) {
    var a = (w.rng + 0x6D2B79F5) | 0;
    w.rng = a >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function between(w, a, b) { return a + (b - a) * rnd(w); }
  function chance(w, p) { return rnd(w) < p; }
  function pick(w, list) { return list[Math.floor(rnd(w) * list.length) % list.length]; }
  function weighted(w, list, fn) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += Math.max(0, fn(list[i]));
    if (!(total > 0)) return list[Math.floor(rnd(w) * list.length) % list.length];
    var at = rnd(w) * total;
    for (i = 0; i < list.length; i++) { at -= Math.max(0, fn(list[i])); if (at <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function stableUnit(text) { return core().hash32(text) / 4294967296; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function nice(n) { return n < 60 ? Math.max(1, Math.round(n)) : n < 400 ? Math.round(n / 5) * 5 : n < 3000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50; }
  function keyOf(c, v, k) { return c + '|' + (v || '') + '|' + (k || ''); }
  function itemKey(it) { return keyOf(it.c, it.v, it.k); }
  function dayIndex(t) { return Math.floor(t / DAY); }

  // ---- environment: the catalog as the simulator sees it ----------------------------------------------------------
  // Built once from the live catalog (or a test catalog). Never saved.
  function makeEnv(input) {
    var marketCfg = C.data.market, cards = input.cards, rarities = input.rarities;
    var env = { all: cards, cards: [], cardById: {}, rarityById: {}, variantById: {}, variants: [], packIds: [], tierOf: {}, brands: [], generations: [] };
    rarities.forEach(function (r) { env.rarityById[r.id] = r; });
    (input.variants || []).forEach(function (v) { env.variantById[v.id] = v; });
    env.variants = (input.variants || []).filter(function (v) { return v.kind !== 'frame'; });
    cards.forEach(function (c) { env.cardById[c.id] = c; });
    env.cards = cards.filter(function (c) { return !c.retired && c.pullable !== false; });
    env.index = core().buildCardIndex(cards, rarities, marketCfg);
    env.cards.forEach(function (c) { env.tierOf[c.id] = env.index[c.id] ? env.index[c.id].tier : 0; });
    // Per-card pull weight: the rarity's chance spread over its cards, as a pack would draw them.
    var perRarity = {};
    env.cards.forEach(function (c) { perRarity[c.rarity] = (perRarity[c.rarity] || 0) + 1; });
    env.pullWeight = {};
    env.cards.forEach(function (c) { var r = env.rarityById[c.rarity]; env.pullWeight[c.id] = r && r.chance ? r.chance / perRarity[c.rarity] : 0.01; });
    var brandSet = {}, genSet = {};
    env.cards.forEach(function (c) { if (c.brand) brandSet[c.brand] = 1; genSet[c.generation] = 1; });
    env.brands = Object.keys(brandSet).sort(); env.generations = Object.keys(genSet).sort();
    env.packIds = (input.packs || []).filter(function (p) { return p.enabled !== false; }).map(function (p) { return p.id; });
    if (!env.packIds.length) env.packIds = ['standard'];
    env.cardSkinFor = input.cardSkinFor || function () { return null; };
    env.names = input.names || { adjectives: ['Quiet'], nouns: ['Falcon'] };
    return env;
  }

  // ---- valuation from locally executed trades ---------------------------------------------------------------------
  function baselineFor(env, c, v, k) {
    var entry = env.index[c];
    if (!entry) return 1;
    var variant = v && env.variantById[v];
    return core().baselineValue(entry, { variantClass: variant ? variant.class : null, cardSkinId: k || null }, C.data.market).value;
  }
  // Weighted, outlier-clamped average of the observations, pulled toward the baseline while data is thin.
  function fairInfo(world, env, c, v, k) {
    var key = keyOf(c, v, k), now = world.now, cache = world._fair || (world._fair = {});
    var stamp = (world.obsStamp[key] || 0) + ':' + Math.floor(now / HOUR);
    var hit = cache[key];
    if (hit && hit.stamp === stamp) return hit.value;
    var base = baselineFor(env, c, v, k), cv = cfg().valuation, obs = world.obs[key] || [];
    var value = { key: key, baseline: base, average: base, samples: 0, effective: 0, confidence: 'none', basis: 'baseline', lastSale: null, lastAt: null };
    if (obs.length) {
      var half = cv.halfLifeDays * DAY, ws = [], prices = obs.map(function (o) { return o[1]; }).sort(function (a, b) { return a - b; });
      var median = prices[Math.floor(prices.length / 2)], band = cfg().economy.outlierBand, sum = 0, wsum = 0, recent = 0;
      obs.forEach(function (o) {
        var age = Math.max(0, now - o[0]), w = Math.pow(0.5, age / half);
        if (age <= 14 * DAY) recent++;
        var p = clamp(o[1], median * (1 - band), median * (1 + band));
        sum += p * w; wsum += w;
      });
      var mean = sum / wsum, prior = cv.priorWeight;
      value.average = Math.max(1, Math.round((base * prior + mean * wsum) / (prior + wsum)));
      value.samples = recent; value.effective = wsum; value.basis = 'sales';
      value.confidence = recent >= cv.minForHigh ? 'high' : recent >= cv.minForMedium ? 'medium' : recent > 0 ? 'low' : 'none';
      var last = obs[obs.length - 1];
      value.lastSale = last[1]; value.lastAt = last[0];
    }
    cache[key] = { stamp: stamp, value: value };
    return value;
  }
  function recordObservation(world, env, tr) {
    var key = keyOf(tr.c, tr.v, tr.k), cv = cfg().valuation;
    var list = world.obs[key] || (world.obs[key] = []);
    list.push([tr.t, tr.price]);
    if (list.length > cv.window) list.splice(0, list.length - cv.window);
    world.obsStamp[key] = (world.obsStamp[key] || 0) + 1;
    // Per-day open/high/low/close and units, kept for the long chart windows.
    var d = dayIndex(tr.t), days = world.daily[key] || (world.daily[key] = {}), row = days[d];
    if (!row) { days[d] = [tr.price, tr.price, tr.price, tr.price, 1, tr.price]; }
    else { row[1] = Math.max(row[1], tr.price); row[2] = Math.min(row[2], tr.price); row[3] = tr.price; row[4]++; row[5] += tr.price; }
    var keys = Object.keys(days);
    if (keys.length > 60) { keys.sort(function (a, b) { return a - b; }); delete days[keys[0]]; }
    // Index aggregate: price against baseline, weighted by Credits. Scopes: all and rarity.
    var base = baselineFor(env, tr.c, tr.v, tr.k), ratio = tr.price / Math.max(1, base);
    var card = env.cardById[tr.c], agg = world.agg[d] || (world.agg[d] = {});
    [ '*', card ? 'r:' + card.rarity : null ].forEach(function (scope) {
      if (!scope) return;
      var a = agg[scope];
      if (!a) agg[scope] = [1, tr.price, ratio * tr.price, tr.price, ratio, ratio, ratio, ratio];
      else { a[0]++; a[1] += tr.price; a[2] += ratio * tr.price; a[3] += tr.price; a[5] = ratio; a[6] = Math.min(a[6], ratio); a[7] = Math.max(a[7], ratio); }
    });
    var aggKeys = Object.keys(world.agg);
    if (aggKeys.length > cfg().keep.days) { aggKeys.sort(function (a, b) { return a - b; }); delete world.agg[aggKeys[0]]; }
  }
  function serialFactor(serial) { return core().serialFactor(serial, C.data.market); }

  // ---- identifiers, ledger and events ----------------------------------------------------------------------------
  function nextId(world, prefix) { world.nextId += 1; return prefix + world.nextId.toString(36); }
  function fee(price) { var e = cfg().economy; return core().feeFor(price, { bps: e.feeBps, rounding: 'half-up', minFee: e.feeMin }); }
  function botOf(world, id) { return world.botIndex[id] || null; }
  function addEvent(world, t, type, ref, extra) {
    var ev = { t: t, type: type, ref: ref, n: (world.evSeq = (world.evSeq || 0) + 1) };
    if (extra) Object.keys(extra).forEach(function (k) { ev[k] = extra[k]; });
    var q = world.queue, lo = 0, hi = q.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (q[mid].t < t || q[mid].t === t && q[mid].n < ev.n) lo = mid + 1; else hi = mid; }
    q.splice(lo, 0, ev);
    return ev;
  }
  function feed(world, ty, text, extra) {
    var rec = { t: world.now, ty: ty, text: text };
    if (extra) Object.keys(extra).forEach(function (k) { rec[k] = extra[k]; });
    world.feed.push(rec);
    var max = cfg().keep.feed;
    if (world.feed.length > max) world.feed.splice(0, world.feed.length - max);
  }
  function notify(world, ty, text, extra) {
    var rec = { id: nextId(world, 'n'), t: world.now, ty: ty, text: text, read: false };
    if (extra) Object.keys(extra).forEach(function (k) { rec[k] = extra[k]; });
    world.notices.push(rec);
    var max = cfg().keep.notices;
    if (world.notices.length > max) world.notices.splice(0, world.notices.length - max);
    return rec;
  }

  // ---- bot funds and holds ----------------------------------------------------------------------------------------
  function botHeld(bot) { var n = 0; for (var k in bot.held) n += bot.held[k]; return n; }
  function botAvailable(bot) { return bot.credits - botHeld(bot); }
  function playerHeld(world) {
    var n = 0, id;
    for (id in world.listings) { var l = world.listings[id]; if (l.status === 'open' && l.maxes && l.maxes.you) n += l.maxes.you.max; }
    for (id in world.orders) { var o = world.orders[id]; if (o.owner === 'you' && o.status === 'open') n += o.maxPrice; }
    for (id in world.offers) { var f = world.offers[id]; if (f.from === 'you' && f.status === 'countered' && f.cashFrom > 0) n += f.cashFrom; }
    return n;
  }
  function playerAvailable(world, host) { return host.balance() - playerHeld(world); }
  function releaseHolds(world, listing) {
    if (!listing.maxes) return;
    for (var who in listing.maxes) { var b = botOf(world, who); if (b) delete b.held['L' + listing.id]; }
  }

  // ---- bot inventory ------------------------------------------------------------------------------------------------
  function mintItem(world, env, bot, now, how) {
    var card = weighted(world, env.cards, function (c) { return env.pullWeight[c.id]; });
    var variant = null;
    if (chance(world, C.config && C.config.variants ? C.config.variants.chance : 0.1) && env.variants.length) variant = weighted(world, env.variants, function (v) { return v.weight || 1; }).id;
    bot.serial += 1;
    var tier = env.tierOf[card.id] || 0;
    var pack = tier >= 3 && env.packIds.indexOf('rare') >= 0 ? 'rare' : env.packIds.indexOf('standard') >= 0 ? 'standard' : env.packIds[0];
    var skin = env.cardSkinFor(card, pack, world);
    world.minted += 1;
    return { i: 'sm' + world.nonce.toString(36) + '-' + bot.code.toLowerCase() + '-' + bot.serial.toString(36), c: card.id, v: variant, k: skin,
      s: 'CBL-' + bot.code + '-' + String(bot.serial).padStart(6, '0'), p: pack, a: now, u: 0 };
  }
  function removeFromInv(bot, instanceId) {
    for (var i = 0; i < bot.inv.length; i++) if (bot.inv[i].i === instanceId) return bot.inv.splice(i, 1)[0];
    return null;
  }
  function listedIds(world) {
    var set = {};
    for (var id in world.listings) { var l = world.listings[id]; if (l.status === 'open' || l.status === 'settling') l.items.forEach(function (it) { set[it.i] = id; }); }
    return set;
  }

  // ---- listing lifecycle --------------------------------------------------------------------------------------------
  function incrementFor(price) { var l = cfg().listing; return Math.max(l.incrementMin, Math.round(price * l.incrementPct / 100)); }
  function auctionView(l) {
    // Highest max wins; ties go to the earliest bid. The price is one step above the runner-up, capped at the leader.
    var entries = [];
    for (var who in l.maxes) entries.push({ by: who, max: l.maxes[who].max, at: l.maxes[who].at });
    entries.sort(function (a, b) { return b.max - a.max || a.at - b.at; });
    var lead = entries[0] || null, second = entries[1] || null;
    var price = l.start;
    if (lead && second) price = Math.max(l.start, Math.min(lead.max, second.max + incrementFor(second.max)));
    // Once the leader's maximum reaches the reserve, the price shows at least the reserve: that is what it will sell for.
    if (lead && l.reserve && price < l.reserve && lead.max >= l.reserve) price = l.reserve;
    return { lead: lead, second: second, price: price, bidders: entries.length };
  }
  function currentPrice(l) { return l.kind === 'auction' ? auctionView(l).price : l.ask; }
  function makeListing(world, o) {
    var id = nextId(world, 'L'), now = world.now;
    var l = { id: id, kind: o.kind, seller: o.seller, items: o.items, ask: o.ask || 0, start: o.start || 0, reserve: o.reserve || null, buyout: o.buyout || null,
      createdAt: now, endsAt: now + o.durationMs, extensions: 0, endVer: 1, maxes: o.kind === 'auction' ? {} : null, bids: o.kind === 'auction' ? [] : null,
      status: 'open', title: o.title || '', note: o.note || '', wants: o.wants || null, reason: o.reason || '', offers: [], origin: o.origin || null };
    world.listings[id] = l;
    addEvent(world, l.endsAt, 'end', id, { ver: 1 });
    return l;
  }
  function finishListing(world, l, status) {
    l.status = status; l.closedAt = world.now;
    releaseHolds(world, l);
    l.items.forEach(function (it) { if (world.locks[it.i] === l.id) delete world.locks[it.i]; });
    // Keep closed listings for a limited time so history and receipts can show them.
    world.closed.push(l.id);
    var max = 200;
    while (world.closed.length > max) { var old = world.closed.shift(); if (world.listings[old] && world.listings[old].status !== 'open' && world.listings[old].status !== 'settling') delete world.listings[old]; }
  }
  // Items go back to their seller when a listing ends without a sale.
  function returnItems(world, l) {
    if (l.seller === 'you') return; // the card never left the player's save
    var b = botOf(world, l.seller);
    if (b) l.items.forEach(function (it) { b.inv.push(it); });
    if (b) b.open = Math.max(0, b.open - 1);
  }
  function whyBuyer(world, bot, how, price, fair) {
    var p = personaOf(bot);
    var rel = fair ? Math.round((fair - price) / fair * 100) : 0;
    if (how === 'order') return p.label + ' · its standing order filled at ' + Math.abs(rel) + '% ' + (rel >= 0 ? 'under' : 'over') + ' Average Value';
    if (how === 'auction') return p.label + ' · won with a proxy bid ' + Math.abs(rel) + '% ' + (rel >= 0 ? 'under' : 'over') + ' Average Value';
    if (how === 'buyout') return p.label + ' · bought it out at once';
    return p.label + ' · bought ' + Math.abs(rel) + '% ' + (rel >= 0 ? 'under' : 'over') + ' Average Value';
  }
  function whySeller(world, bot, price, fair) {
    var p = personaOf(bot);
    var rel = fair ? Math.round((price - fair) / fair * 100) : 0;
    return p.label + ' · sold ' + Math.abs(rel) + '% ' + (rel >= 0 ? 'over' : 'under') + ' Average Value';
  }
  function personaOf(bot) { return cfg().personas.find(function (p) { return p.id === bot.persona; }) || cfg().personas[0]; }
  function aliasOf(world, id) { if (id === 'you') return 'You'; var b = botOf(world, id); return b ? b.alias : id; }

  function recordTrade(world, env, o) {
    var tr = { id: nextId(world, 'T'), t: world.now, kind: o.kind, c: o.item.c, v: o.item.v, k: o.item.k, s: o.item.s, price: o.price, fee: o.fee,
      f: fairInfo(world, env, o.item.c, o.item.v, o.item.k).average,
      seller: o.seller, buyer: o.buyer, listing: o.listing || null, bw: o.buyerWhy || '', sw: o.sellerWhy || '' };
    world.trades.push(tr);
    var max = cfg().keep.trades;
    if (world.trades.length > max) world.trades.splice(0, world.trades.length - max);
    recordObservation(world, env, tr);
    world.stats.trades += 1; world.stats.volume += o.price; world.stats.fees += o.fee;
    return tr;
  }

  // Applies a sale: items, Credits, fee, observation and receipts. The player's side goes through host.settle.
  function completeSale(world, env, host, l, o) {
    // o: { buyer, price, kind }
    var price = o.price, f = fee(price), net = price - f;
    var sellerIsPlayer = l.seller === 'you', buyerIsPlayer = o.buyer === 'you';
    var fairNow = fairInfo(world, env, l.items[0].c, l.items[0].v, l.items[0].k).average;
    var buyerBot = botOf(world, o.buyer), sellerBot = botOf(world, l.seller);
    if (sellerIsPlayer || buyerIsPlayer) {
      var effect = { receiptId: 'R-' + world.nonce.toString(36) + '-' + l.id + '-' + (o.kind || 'sale'), kind: sellerIsPlayer ? 'sale' : 'purchase',
        listingId: l.id, at: world.now, remove: [], add: [], delta: 0, reason: sellerIsPlayer ? 'market sale' : 'market purchase',
        price: price, fee: sellerIsPlayer ? f : 0, items: l.items.map(function (it) { return { i: it.i, c: it.c, v: it.v, k: it.k, s: it.s }; }) };
      if (sellerIsPlayer) { effect.remove = l.items.map(function (it) { return it.i; }); effect.delta = net; }
      if (buyerIsPlayer) {
        effect.add = l.items.map(function (it) { return S.instanceFrom(it, world.now, world); });
        effect.delta = -price;
      }
      if (host.sign) host.sign(effect);
      l.status = 'settling'; l.settle = { receiptId: effect.receiptId, buyer: o.buyer, price: price, kind: o.kind || 'fixed', fee: f };
      world.receipts[effect.receiptId] = { state: 'pending', t: world.now, effect: effect };
      world.pending.push(effect.receiptId);
      return finalizeSettlement(world, env, host, effect.receiptId);
    }
    // bot to bot: nothing leaves the simulator
    if (!buyerBot || !sellerBot) return false;
    buyerBot.credits -= price; delete buyerBot.held['L' + l.id];
    sellerBot.credits += net; sellerBot.open = Math.max(0, sellerBot.open - 1);
    l.items.forEach(function (it) { it.a = world.now; it.u = price / l.items.length; buyerBot.inv.push(it); });
    sellerBot.stats.sold += 1; buyerBot.stats.bought += 1; sellerBot.stats.net += net - (l.items[0].u || 0);
    sellerBot.soldRecent[itemKey(l.items[0])] = world.now;
    world.stats.burnt += f;
    var tr = recordTrade(world, env, { kind: o.kind || 'fixed', item: l.items[0], price: price, fee: f, seller: l.seller, buyer: o.buyer, listing: l.id,
      buyerWhy: whyBuyer(world, buyerBot, o.kind === 'auction' ? 'auction' : o.kind, price, fairNow), sellerWhy: whySeller(world, sellerBot, price, fairNow) });
    l.soldFor = price; l.buyer = o.buyer;
    finishListing(world, l, 'sold');
    feed(world, 'sale', aliasOf(world, o.buyer) + ' bought ' + cardLabel(env, l.items[0]) + ' from ' + aliasOf(world, l.seller) + ' for ' + price + ' Credits', { trade: tr.id });
    return true;
  }
  function cardLabel(env, it) {
    var c = env.cardById[it.c], v = it.v && env.variantById[it.v];
    return (c ? c.name : it.c) + (v ? ' (' + v.name + ')' : '');
  }

  // Second phase of any sale that touches the player's save. Safe to call again after a crash or a failed write.
  function finalizeSettlement(world, env, host, receiptId) {
    var rec = world.receipts[receiptId];
    if (!rec || rec.state !== 'pending') return true;
    var effect = rec.effect, l = world.listings[effect.listingId];
    var ok = false;
    try { ok = host.settle(effect) === true; } catch (_) { ok = false; }
    if (!ok) { rec.attempts = (rec.attempts || 0) + 1; return false; }
    rec.state = 'done'; rec.doneAt = world.now;
    world.pending = world.pending.filter(function (id) { return id !== receiptId; });
    trimReceipts(world);
    if (!l) return true;
    var s = l.settle || {}, buyer = s.buyer, price = s.price != null ? s.price : effect.price, f = s.fee != null ? s.fee : effect.fee;
    var buyerBot = botOf(world, buyer), sellerBot = botOf(world, l.seller);
    var net = price - fee(price);
    if (l.seller === 'you') {
      // The player sold to a bot: the bot pays and receives the card.
      if (buyerBot) { buyerBot.credits -= price; delete buyerBot.held['L' + l.id]; l.items.forEach(function (it) { it.a = world.now; it.u = price; buyerBot.inv.push(it); buyerBot.stats.bought += 1; }); }
      world.stats.you.sold += 1; world.stats.you.earned += net;
      // Realized profit: what the sale paid after the fee against what these cards cost here. Cards from packs have no cost, so no profit is claimed.
      var cost = 0, known = l.items.length > 0;
      l.items.forEach(function (it) { var b = world.basis[it.i]; if (b == null) known = false; else cost += b; });
      var you = world.stats.you;
      if (known) {
        var gain = net - cost;
        you.realized = (you.realized || 0) + gain; you.realizedN = (you.realizedN || 0) + 1;
        you.wins = (you.wins || []).concat([{ t: world.now, c: l.items[0].c, gain: gain, price: price }]).slice(-12);
        if (gain > 0) world.coach.done.profit = true;
      }
      world.coach.done.sell = true;
      if (world.coach.plan) l.items.forEach(function (it) { delete world.coach.plan[it.i]; });
    } else if (buyer === 'you') {
      if (sellerBot) { sellerBot.credits += net; sellerBot.open = Math.max(0, sellerBot.open - 1); sellerBot.stats.sold += 1; sellerBot.soldRecent[itemKey(l.items[0])] = world.now; }
      world.stats.you.bought += 1; world.stats.you.spent += price;
      world.coach.done.buy = true;
      var fairBuy = fairInfo(world, env, l.items[0].c, l.items[0].v, l.items[0].k).average * serialFactor(l.items[0].s);
      if (price <= fairBuy * (1 - cfg().coach.dealBelowFair)) world.coach.done.deal = true;
      if (s.kind === 'auction' || s.kind === 'buyout') world.coach.done.auction = true;
      if (l.fire) world.coach.done.fire = true;
      l.items.forEach(function (it) { world.basis[it.i] = Math.round(price / l.items.length); });
      var keys = Object.keys(world.basis);
      if (keys.length > 1500) keys.slice(0, keys.length - 1500).forEach(function (k) { delete world.basis[k]; });
    }
    world.stats.burnt += fee(price);
    var fairNow = fairInfo(world, env, l.items[0].c, l.items[0].v, l.items[0].k).average;
    var tr = recordTrade(world, env, { kind: s.kind || 'fixed', item: l.items[0], price: price, fee: fee(price), seller: l.seller, buyer: buyer, listing: l.id,
      buyerWhy: buyerBot ? whyBuyer(world, buyerBot, s.kind === 'auction' ? 'auction' : s.kind, price, fairNow) : 'You bought it',
      sellerWhy: sellerBot ? whySeller(world, sellerBot, price, fairNow) : 'You sold it' });
    l.soldFor = price; l.buyer = buyer;
    finishListing(world, l, 'sold');
    if (l.seller === 'you') notify(world, 'sold', 'Sold ' + cardLabel(env, l.items[0]) + ' to ' + aliasOf(world, buyer) + ' for ' + price + ' Credits (' + net + ' after the fee).', { listing: l.id, receipt: receiptId });
    else if (buyer === 'you') notify(world, 'bought', 'Bought ' + cardLabel(env, l.items[0]) + ' for ' + price + ' Credits.', { listing: l.id, receipt: receiptId });
    feed(world, 'sale', aliasOf(world, buyer) + ' bought ' + cardLabel(env, l.items[0]) + ' from ' + aliasOf(world, l.seller) + ' for ' + price + ' Credits', { trade: tr.id, you: l.seller === 'you' || buyer === 'you' });
    return true;
  }
  function trimReceipts(world) {
    var ids = Object.keys(world.receipts), max = cfg().keep.receipts;
    if (ids.length <= max) return;
    ids.sort(function (a, b) { return world.receipts[a].t - world.receipts[b].t; });
    for (var i = 0; i < ids.length - max; i++) if (world.receipts[ids[i]].state !== 'pending') delete world.receipts[ids[i]];
  }
  // Retries every settlement that is still waiting on the save. Returns how many remain.
  function retrySettlements(world, env, host) {
    world.pending.slice().forEach(function (id) { finalizeSettlement(world, env, host, id); });
    return world.pending.length;
  }

  // ---- actions on a listing (used by bots and by the player through the wrappers below) ---------------------
  function placeBid(world, env, host, l, bidder, max) {
    var inc = incrementFor(currentPrice(l)), view = auctionView(l);
    var minNext = view.bidders ? view.price + inc : l.start;
    var mine = l.maxes[bidder];
    if (l.status !== 'open') return { ok: false, error: 'closed' };
    if (bidder === l.seller) return { ok: false, error: 'own' };
    if (world.now >= l.endsAt) return { ok: false, error: 'ended' };
    if (!Number.isSafeInteger(max) || max <= 0) return { ok: false, error: 'invalid' };
    if (mine && max <= mine.max) return { ok: false, error: 'lower', minimum: mine.max + 1 };
    if (!mine && max < minNext || mine && max < minNext && view.lead && view.lead.by !== bidder) return { ok: false, error: 'increment', minimum: minNext };
    var avail, b = botOf(world, bidder);
    if (bidder === 'you') avail = playerAvailable(world, host) + (mine ? mine.max : 0);
    else avail = botAvailable(b) + (mine ? mine.max : 0);
    if (max > avail) return { ok: false, error: 'funds', available: avail };
    var before = view.lead ? view.lead.by : null;
    l.maxes[bidder] = { max: max, at: mine ? mine.at : world.now };
    if (b) b.held['L' + l.id] = max;
    var after = auctionView(l);
    l.bids.push({ by: bidder, price: after.price, t: world.now });
    if (l.bids.length > 40) l.bids.splice(0, l.bids.length - 40);
    var lp = cfg().listing;
    if (world.now >= l.endsAt - lp.snipeWindowMin * MIN && l.extensions < lp.snipeMaxExtensions) {
      l.extensions += 1; l.endsAt = world.now + lp.snipeExtendMin * MIN; l.endVer += 1;
      addEvent(world, l.endsAt, 'end', l.id, { ver: l.endVer });
      l.snipeNote = 'Extended by ' + lp.snipeExtendMin + ' minutes after a late bid';
    }
    if (before && before !== bidder && after.lead && after.lead.by !== before) {
      if (before === 'you') notify(world, 'outbid', 'You were outbid on ' + cardLabel(env, l.items[0]) + '. The price is now ' + after.price + ' Credits.', { listing: l.id });
    }
    if (after.lead && after.lead.by === 'you' && before !== 'you') notify(world, 'leading', 'You are leading on ' + cardLabel(env, l.items[0]) + ' at ' + after.price + ' Credits.', { listing: l.id });
    if (l.seller === 'you' && bidder !== 'you') notify(world, 'bid', aliasOf(world, bidder) + ' bid on your ' + cardLabel(env, l.items[0]) + '. Price ' + after.price + ' Credits.', { listing: l.id });
    return { ok: true, price: after.price, leading: after.lead && after.lead.by === bidder, view: after };
  }
  function endAuction(world, env, host, l) {
    var view = auctionView(l);
    if (!view.lead) { unsold(world, env, l, 'No bids'); return; }
    // When the reserve is above the current price but within the leader's maximum, the price rises to the reserve.
    var price = view.price;
    if (l.reserve && price < l.reserve) {
      if (view.lead.max >= l.reserve) price = l.reserve;
      else { unsold(world, env, l, 'Reserve not met'); return; }
    }
    // The leader must still be able to pay.
    var leaderIsPlayer = view.lead.by === 'you';
    if (leaderIsPlayer && host.balance() < price) { unsold(world, env, l, 'The leading bidder could not pay'); notify(world, 'failed', 'You could not pay for ' + cardLabel(env, l.items[0]) + ', so the auction ended unsold.', { listing: l.id }); return; }
    completeSale(world, env, host, l, { buyer: view.lead.by, price: price, kind: 'auction' });
  }
  function unsold(world, env, l, why) {
    l.endNote = why;
    returnItems(world, l);
    finishListing(world, l, 'expired');
    if (l.seller === 'you') notify(world, 'expired', 'Your listing of ' + cardLabel(env, l.items[0]) + ' ended unsold. ' + why + '.', { listing: l.id });
    var view = l.kind === 'auction' ? auctionView(l) : null;
    if (view && view.lead && view.lead.by === 'you') notify(world, 'lost', 'The auction for ' + cardLabel(env, l.items[0]) + ' ended without a sale. ' + why + '.', { listing: l.id });
  }
  function cancelListing(world, env, l, who) {
    if (l.status !== 'open') return { ok: false, error: 'closed' };
    if (l.kind === 'auction' && auctionView(l).bidders > 0 && l.seller === 'you') return { ok: false, error: 'has-bids' };
    var view = l.kind === 'auction' ? auctionView(l) : null;
    returnItems(world, l);
    if (view && view.lead && view.lead.by === 'you') notify(world, 'cancelled', 'The seller withdrew ' + cardLabel(env, l.items[0]) + '. Your bid hold was released.', { listing: l.id });
    finishListing(world, l, 'cancelled');
    // Offers waiting on a withdrawn swap listing close with it.
    l.offers.forEach(function (oid) { var of = world.offers[oid]; if (of && (of.status === 'pending' || of.status === 'countered')) closeOffer(world, of, 'withdrawn', 'The listing was withdrawn'); });
    return { ok: true };
  }

  // ---- buy orders ---------------------------------------------------------------------------------------------------
  function matchOrdersFor(world, env, host, l) {
    if (l.status !== 'open' || l.kind !== 'fixed' || l.items.length !== 1) return;
    var it = l.items[0], hits = [];
    for (var id in world.orders) {
      var o = world.orders[id];
      if (o.status !== 'open' || o.owner === l.seller || o.c !== it.c) continue;
      if (!o.anyFinish && (o.v || null) !== (it.v || null)) continue;
      if (o.maxPrice < l.ask) continue;
      if (world.now >= o.expiresAt) continue;
      hits.push(o);
    }
    if (!hits.length) return;
    hits.sort(function (a, b) { return b.maxPrice - a.maxPrice || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1); });
    var o = hits[0];
    o.status = 'filled'; o.filledAt = world.now; o.paid = l.ask;
    var b = botOf(world, o.owner); if (b) delete b.held['O' + o.id];
    completeSale(world, env, host, l, { buyer: o.owner, price: l.ask, kind: 'order' });
    if (o.owner === 'you') notify(world, 'order', 'Your buy order for ' + cardLabel(env, it) + ' filled at ' + l.ask + ' Credits.', { listing: l.id, order: o.id });
  }
  function matchListingsFor(world, env, host, o) {
    // A new order may take the cheapest listing that already satisfies it.
    var best = null;
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.status !== 'open' || l.kind !== 'fixed' || l.items.length !== 1 || l.seller === o.owner) continue;
      var it = l.items[0];
      if (it.c !== o.c || (!o.anyFinish && (it.v || null) !== (o.v || null))) continue;
      if (l.ask > o.maxPrice) continue;
      if (!best || l.ask < best.ask || l.ask === best.ask && l.createdAt < best.createdAt) best = l;
    }
    if (!best) return false;
    o.status = 'filled'; o.filledAt = world.now; o.paid = best.ask;
    var b = botOf(world, o.owner); if (b) delete b.held['O' + o.id];
    completeSale(world, env, host, best, { buyer: o.owner, price: best.ask, kind: 'order' });
    if (o.owner === 'you') notify(world, 'order', 'Your buy order for ' + cardLabel(env, best.items[0]) + ' filled at ' + best.ask + ' Credits.', { listing: best.id, order: o.id });
    return true;
  }
  function openOrder(world, env, host, owner, spec) {
    var o = { id: nextId(world, 'O'), owner: owner, c: spec.c, v: spec.v || null, k: spec.k || null, anyFinish: !!spec.anyFinish, maxPrice: spec.maxPrice,
      createdAt: world.now, expiresAt: world.now + spec.durationMs, status: 'open', note: spec.note || '' };
    world.orders[o.id] = o;
    var b = botOf(world, owner); if (b) b.held['O' + o.id] = o.maxPrice;
    addEvent(world, o.expiresAt, 'orderEnd', o.id);
    matchListingsFor(world, env, host, o);
    return o;
  }

  // ---- swap offers --------------------------------------------------------------------------------------------------
  function closeOffer(world, of, status, note) {
    of.status = status; of.closedAt = world.now; of.note = note || of.note || '';
    of.give.forEach(function (it) { if (world.locks[it.i] === 'offer:' + of.id) delete world.locks[it.i]; });
    var b = botOf(world, of.from);
    if (b && of.status !== 'accepted') of.give.forEach(function (it) { if (!b.inv.some(function (x) { return x.i === it.i; })) { /* items of bot offers stay in inventory until settled */ } });
  }
  function itemWorth(world, env, it) {
    return Math.round(fairInfo(world, env, it.c, it.v, it.k).average * serialFactor(it.s));
  }
  function setsWorth(world, env, items) { return items.reduce(function (n, it) { return n + itemWorth(world, env, it); }, 0); }

  // ---- exports -------------------------------------------------------------------------------------------------------
  Object.assign(S, {
    MIN: MIN, HOUR: HOUR, DAY: DAY,
    rnd: rnd, between: between, chance: chance, pick: pick, weighted: weighted, stableUnit: stableUnit, clamp: clamp, nice: nice,
    keyOf: keyOf, itemKey: itemKey, dayIndex: dayIndex, makeEnv: makeEnv,
    baselineFor: baselineFor, fairInfo: fairInfo, recordObservation: recordObservation, serialFactor: serialFactor,
    nextId: nextId, fee: fee, botOf: botOf, addEvent: addEvent, feed: feed, notify: notify,
    botHeld: botHeld, botAvailable: botAvailable, playerHeld: playerHeld, playerAvailable: playerAvailable, releaseHolds: releaseHolds,
    mintItem: mintItem, removeFromInv: removeFromInv, listedIds: listedIds,
    incrementFor: incrementFor, auctionView: auctionView, currentPrice: currentPrice, makeListing: makeListing, finishListing: finishListing,
    returnItems: returnItems, personaOf: personaOf, aliasOf: aliasOf, cardLabel: cardLabel, recordTrade: recordTrade,
    completeSale: completeSale, finalizeSettlement: finalizeSettlement, retrySettlements: retrySettlements,
    placeBid: placeBid, endAuction: endAuction, unsold: unsold, cancelListing: cancelListing,
    matchOrdersFor: matchOrdersFor, matchListingsFor: matchListingsFor, openOrder: openOrder,
    closeOffer: closeOffer, itemWorth: itemWorth, setsWorth: setsWorth
  });
})(window.Cardable = window.Cardable || {});
