/* Cardable Market — the coach for the Simulation.
 * Reads the simulator's own world (open listings, buy orders, news, executed trades, what traders are looking for) and
 * the player's collection, and answers three questions in plain words: what is worth doing right now, what is happening
 * in the market, and how am I doing. Pure: no DOM, no storage, no clocks, no randomness. Every number it shows is derived
 * from the world, and every suggestion says what it costs, what it should bring back after the 2% fee, and why.
 *
 * It is a guide, not a promise: a suggestion is an expectation from today's prices and news. Prices move, other traders
 * act, and the market can be slower or faster than the guide thinks. The Market's wording says so. */
(function (C) {
  'use strict';
  var S = C.market.sim = C.market.sim || {};
  var HOUR = 3600000, MIN = 60000;
  var cfg = function () { return C.data.marketSim; };

  function nice(n) { return S.nice ? S.nice(n) : Math.round(n); }
  function fairOf(world, env, it) {
    var c = it.c || it.cardId, v = it.v !== undefined ? it.v : it.variantId, k = it.k !== undefined ? it.k : it.cardSkinId, serial = it.s || it.serial;
    return Math.max(1, S.fairInfo(world, env, c, v || null, k || null).average * (serial ? S.serialFactor(serial) : 1));
  }
  function asItem(inst) { return { c: inst.cardId, v: inst.variantId || null, k: inst.cardSkinId || null, s: inst.serial, i: inst.instanceId }; }
  function cardName(env, id) { var c = env.cardById[id]; return c ? c.name : id; }
  function money(n) { return Math.round(n).toLocaleString('en-US'); }
  function netOf(price) { return price - S.fee(price); }

  // Where the price of one card is likely heading because of the news: a fraction of each shift not yet in the price.
  function drift(world, env, c) {
    var list = world.events || [], card = env.cardById[c], tier = env.tierOf[c] || 0, d = 0, hit = null;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!S.inScope(e.scope, card, tier)) continue;
      var phase = world.now < e.start ? 'coming' : world.now <= e.end ? 'acting' : (world.now - e.end) <= cfg().events.afterHours * HOUR ? 'fading' : null;
      if (!phase) continue;
      var part = phase === 'coming' ? 0.8 : phase === 'acting' ? 0.4 : -0.25 * Math.sign(e.mag);
      d += e.mag * part; hit = hit || { id: e.id, headline: e.headline, mag: e.mag, phase: phase, who: e.scope.card ? e.label : e.label + ' cards' };
    }
    return { d: d, news: hit };
  }
  function demandFor(world, env, c) {
    var wanting = 0, richest = 0;
    world.bots.forEach(function (b) {
      if (b.wish.indexOf(c) < 0 || b.inv.some(function (x) { return x.c === c; })) return;
      wanting++; richest = Math.max(richest, S.botAvailable(b));
    });
    var bestBid = 0, bidOrder = null;
    for (var id in world.orders) {
      var o = world.orders[id];
      if (o.status !== 'open' || o.owner === 'you' || o.c !== c) continue;
      if (o.maxPrice > bestBid) { bestBid = o.maxPrice; bidOrder = o; }
    }
    return { wanting: wanting, richest: richest, bestBid: bestBid, order: bidOrder };
  }

  // ---- what to do now ------------------------------------------------------------------------------------------------------
  // player: { inventory: [save instances], available: Credits you can spend now, quote: fn(instance) -> Quick Sell price or null,
  //           protectedIds: {instanceId: true} (favorites and cards you would rather keep), locked: {instanceId: true} }
  function moves(world, env, player) {
    var k = cfg().coach, out = [], avail = player.available, id, l;
    // Cards to buy: fixed prices and closing auctions that should be worth more than they cost, after the fee.
    for (id in world.listings) {
      l = world.listings[id];
      if (l.status !== 'open' || l.seller === 'you' || world.now >= l.endsAt || l.items.length !== 1) continue;
      var it = l.items[0], fair = fairOf(world, env, it), dr = drift(world, env, it.c);
      var expected = fair * (1 + dr.d), target = nice(expected * (1 - k.resellDiscount));
      if (l.kind === 'fixed') {
        var ask = l.ask;
        if (ask > avail) continue;
        var gain = netOf(target) - ask;
        if (gain < Math.max(k.minGain, k.minGainPct * ask)) continue;
        var below = (fair - ask) / fair, why;
        if (l.fire) why = 'Seller needs cash.';
        else if (below >= k.dealBelowFair) why = Math.round(below * 100) + '% under Average Value (' + money(fair) + ').';
        else why = 'News is lifting demand.';
        if (dr.news && dr.d > 0 && !l.fire && below < k.dealBelowFair) why = dr.news.who + ' demand is rising. This one is still at the old price.';
        out.push({ type: 'buy', tag: l.fire ? 'Fire sale' : dr.d > 0.05 && below < k.dealBelowFair ? 'In the news' : 'Deal', listingId: l.id, itemId: it.i, cardId: it.c, variantId: it.v || null, serial: it.s,
          cost: ask, resell: target, gain: gain, fair: Math.round(fair), expiresMin: Math.max(0, (l.endsAt - world.now) / MIN), why: why,
          how: 'Buy ' + money(ask) + ', list ' + money(target) + ', keep about ' + money(netOf(target)) + '.' });
      } else if (l.kind === 'auction') {
        var hoursLeft = (l.endsAt - world.now) / HOUR;
        if (hoursLeft > k.snipeHours) continue;
        var view = S.auctionView(l), cur = view.bidders ? view.price : l.start;
        var finalGuess = Math.max(cur + S.incrementFor(cur), nice(cur * (1 + k.snipeBidUp)));
        if (l.reserve && finalGuess < l.reserve) finalGuess = l.reserve;
        var cap = nice(Math.min(expected * 0.92, finalGuess * 1.15));
        if (cap < finalGuess || cap > avail || view.lead && view.lead.by === 'you') continue;
        var g2 = netOf(target) - finalGuess;
        if (g2 < Math.max(k.minGain, k.minGainPct * finalGuess)) continue;
        out.push({ type: 'bid', tag: 'Closing soon', listingId: l.id, itemId: it.i, cardId: it.c, variantId: it.v || null, serial: it.s, cost: finalGuess, max: cap, resell: target, gain: g2, fair: Math.round(fair),
          expiresMin: Math.max(0, (l.endsAt - world.now) / MIN), why: 'Ends in ' + (hoursLeft < 1 ? Math.max(1, Math.round(hoursLeft * 60)) + ' min' : Math.round(hoursLeft * 10) / 10 + ' h') + ' at ' + money(cur) + '. Similar cards sell for about ' + money(fair) + '.',
          how: 'Bid up to ' + money(cap) + '. Likely closes near ' + money(finalGuess) + '.' });
      }
    }
    // Cards to sell: where another trader beats Quick Sell by enough to be worth the wait.
    var sells = [];
    (player.inventory || []).forEach(function (inst) {
      if (player.locked && player.locked[inst.instanceId] || player.protectedIds && player.protectedIds[inst.instanceId]) return;
      var item = asItem(inst), fair2 = fairOf(world, env, item), quick = player.quote ? player.quote(inst) : null;
      if (quick == null) quick = Math.max(1, Math.floor(fair2 * 0.6));
      var dem = demandFor(world, env, inst.cardId), dr2 = drift(world, env, inst.cardId);
      var price = nice(fair2 * 0.98), reason = 'Another trader pays more than Quick Sell.', tag = 'Sell for more', instant = false;
      if (dem.bestBid >= Math.max(quick * 1.15, fair2 * 0.75)) { price = dem.bestBid; reason = 'A trader will pay ' + money(dem.bestBid) + ' right now.'; tag = 'Buyer waiting'; instant = true; }
      else if (dr2.d > 0.08) { price = nice(fair2 * (1 + dr2.d * 0.75)); reason = dr2.news.who + ' demand is rising. Ask above ' + money(fair2) + '.'; tag = 'In the news'; }
      else if (dem.wanting >= 1 && dem.richest >= fair2 * 0.8) { var prem = k.wantedPremium; price = nice(fair2 * (1 + prem[0] + (prem[1] - prem[0]) * Math.min(1, dem.wanting / 3))); reason = dem.wanting + (dem.wanting === 1 ? ' trader wants' : ' traders want') + ' this card. Ask above ' + money(fair2) + '.'; tag = 'In demand'; }
      else if (dr2.d < -0.08) { price = nice(fair2 * 0.97); reason = dr2.news.who + ' prices are slipping. Sell before it bites.'; tag = 'Sell before it slips'; }
      // A card bought from a suggestion carries the price the plan was made at, so the next step is waiting for you.
      var planned = world.coach.plan && world.coach.plan[inst.instanceId];
      if (planned) { price = planned; reason = 'Your plan: list at ' + money(planned) + ' and keep about ' + money(netOf(planned)) + '.'; tag = 'Your plan'; }
      var gain = netOf(price) - quick;
      if (!planned && gain < Math.max(k.minGain, 0.15 * quick)) return;
      sells.push({ type: 'sell', planned: !!planned, tag: tag, instance: inst, itemId: inst.instanceId, cardId: inst.cardId, variantId: inst.variantId || null, serial: inst.serial, cost: 0, quick: quick, price: price, gain: gain, fair: Math.round(fair2), instant: instant,
        why: reason, how: 'List ' + money(price) + ', keep about ' + money(netOf(price)) + '. Quick Sell pays ' + money(quick) + '.', score: gain + (tag === 'Sell for more' ? -1e6 : 0) });
    });
    // Traps: a buy order under the market. A seller in a hurry lists below the usual price and the order fills at once, before anyone else can react.
    var mineOpen = 0, orderedCards = {};
    for (id in world.orders) { var o = world.orders[id]; if (o.owner === 'you' && o.status === 'open') { mineOpen++; orderedCards[o.c] = true; } }
    if (mineOpen < k.maxOrders && !player.noOrders) {
      var recent = {}, since = world.now - 3 * 24 * HOUR;
      for (var ti = world.trades.length - 1; ti >= 0 && world.trades[ti].t >= since; ti--) { var tr = world.trades[ti]; recent[tr.c] = (recent[tr.c] || 0) + 1; }
      var traps = [];
      env.cards.forEach(function (card) {
        if (orderedCards[card.id] || !recent[card.id] || recent[card.id] < k.trapMinTrades) return;
        var fairC = fairOf(world, env, { c: card.id, v: null, k: null, s: null }), drC = drift(world, env, card.id);
        var price = nice(fairC * (1 - k.trapBelowFair));
        if (price < 2 || price > avail * k.trapMaxShare) return;
        var resell = nice(fairC * (1 + Math.max(0, drC.d)) * (1 - k.resellDiscount)), gain = netOf(resell) - price;
        if (gain < Math.max(k.minGain, k.minGainPct * price)) return;
        traps.push({ type: 'order', tag: 'Set a trap', cardId: card.id, variantId: null, serial: null, itemId: 'order:' + card.id, cost: price, resell: resell, gain: gain, fair: Math.round(fairC), busy: recent[card.id],
          why: 'Traded ' + recent[card.id] + ' times in 3 days. Catches a fire sale under ' + money(price) + '.',
          how: 'Order ' + money(price) + ' (Average Value ' + money(fairC) + '), list near ' + money(resell) + ', keep ' + money(netOf(resell)) + '.' });
      });
      traps.sort(function (a, b) { return b.busy - a.busy || b.gain - a.gain; });
      out = out.concat(traps.slice(0, 2));
    }
    // Plain "better than Quick Sell" suggestions are shown only when there is nothing sharper, and never more than two.
    var sharp = sells.filter(function (m) { return m.tag !== 'Sell for more'; }), plain = sells.filter(function (m) { return m.tag === 'Sell for more'; }).sort(function (a, b) { return b.gain - a.gain; }).slice(0, 2);
    out = out.concat(sharp, plain);
    out.forEach(function (m) { m.ratio = m.planned ? 99 : m.type === 'sell' ? m.gain / Math.max(1, m.quick) : m.gain / Math.max(1, m.cost); });
    // Best first, but a mix: at most three of one type in the list.
    out.sort(function (a, b) { return b.ratio - a.ratio || b.gain - a.gain; });
    var counts = {}, picked = [];
    out.forEach(function (m) { counts[m.type] = (counts[m.type] || 0) + 1; if (counts[m.type] <= 3 && picked.length < k.maxMoves) picked.push(m); });
    return picked;
  }

  // ---- one listing, in plain words ----------------------------------------------------------------------------------------
  // What a beginner wants to know before pressing Buy or Bid: is this a good price, what would I get back, and what should I watch for.
  function assess(world, env, l, available) {
    var k = cfg().coach, it = l.items[0];
    if (!it || l.status !== 'open') return null;
    var fair = fairOf(world, env, it), dr = drift(world, env, it.c), view = l.kind === 'auction' ? S.auctionView(l) : null;
    var price = l.kind === 'auction' ? (view.bidders ? view.price : l.start) : l.ask;
    var likely = l.kind === 'auction' ? Math.max(price + S.incrementFor(price), nice(price * (1 + k.snipeBidUp))) : price;
    if (l.kind === 'auction' && l.reserve && likely < l.reserve) likely = l.reserve;
    var diff = (fair - likely) / fair, target = nice(fair * (1 + dr.d) * (1 - k.resellDiscount)), gain = netOf(target) - likely;
    var verdict = diff >= k.dealBelowFair ? 'good' : diff >= -0.05 ? 'fair' : 'pricey', lines = [];
    var pct = Math.round(Math.abs(diff) * 100);
    lines.push('Usually sells for about ' + money(fair) + '. ' + (pct < 3 ? 'This is right at that.' : diff > 0 ? (l.kind === 'auction' ? 'Likely closes ' + pct + '% under.' : pct + '% under.') : (l.kind === 'auction' ? 'Likely closes ' + pct + '% over.' : pct + '% over.')));
    if (l.fire) lines.push('Fire sale: the seller needs cash, so others may spot it soon.');
    if (dr.news && dr.d > 0) lines.push('News is lifting ' + dr.news.who + '.');
    if (dr.news && dr.d < 0) lines.push('News is pulling ' + dr.news.who + ' down. Waiting may pay.');
    if (gain >= Math.max(k.minGain, k.minGainPct * likely)) lines.push('Resell near ' + money(target) + ' and keep about ' + money(netOf(target)) + ' after the 2% fee: about ' + money(gain) + ' over what you paid.');
    else lines.push('A resale would not clear the 2% fee. Buy to keep, not to flip.');
    if (l.kind === 'auction') lines.push('Bids come late. Set a maximum and let it run.');
    if (available != null && likely > available) lines.push('You have ' + money(available) + ' available, ' + money(likely - available) + ' short.');
    var title = verdict === 'good' ? 'Good price' : verdict === 'fair' ? 'Fair price' : 'Above usual';
    return { verdict: verdict, title: title, lines: lines, fair: Math.round(fair), likely: likely, gain: gain, resell: target, news: dr.news ? dr.news.headline : null, fire: !!l.fire };
  }

  // ---- what is happening ----------------------------------------------------------------------------------------------------
  function pulse(world, env, player) {
    var ev = cfg().events, now = world.now, owned = {};
    (player && player.inventory || []).forEach(function (i) { owned[i.cardId] = (owned[i.cardId] || 0) + 1; });
    return S.activeNews(world).filter(function (e) { return e.phase !== 'fading' || world.now - e.end < (ev.afterHours / 2) * HOUR; }).map(function (e) {
      var cards = S.scopeCards(env, e.scope), mine = cards.reduce(function (n, c) { return n + (owned[c.id] || 0); }, 0);
      var when = e.phase === 'coming' ? 'Starts in ' + hours((e.start - now) / HOUR) : e.phase === 'acting' ? 'Under way, ends in about ' + hours((e.end - now) / HOUR) : 'Fading';
      return { id: e.id, kind: e.kind, up: e.mag > 0, headline: e.headline, detail: e.detail, phase: e.phase, when: when, magnitude: Math.round(Math.abs(e.mag) * 100), label: e.label, cards: cards.length, mine: mine, strength: e.strength };
    });
  }
  function hours(h) { h = Math.max(0, h); return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : (Math.round(h * 10) / 10) + ' h'; }

  // ---- how am I doing -------------------------------------------------------------------------------------------------------
  function progress(world, netWorth) {
    var k = cfg().coach, you = world.stats.you, done = world.coach.done;
    var realized = you.realized || 0, xp = Math.max(0, Math.round(realized)) + (you.sold || 0) + (you.bought || 0);
    var level = k.levels[0], next = null;
    k.levels.forEach(function (lv) { if (xp >= lv.at) level = lv; });
    next = k.levels.find(function (lv) { return lv.at > xp; }) || null;
    var from = level.at, to = next ? next.at : level.at, frac = next ? Math.max(0, Math.min(1, (xp - from) / (to - from))) : 1;
    var nw0 = world.coach.nw0, grew = nw0 != null && netWorth != null && netWorth >= nw0 * 1.25;
    var quests = [
      { id: 'buy', label: 'Make a purchase', hint: 'Buy any card from a trader.', done: !!done.buy },
      { id: 'sell', label: 'Sell a card to a trader', hint: 'List a card from Portfolio. Usually beats Quick Sell.', done: !!done.sell },
      { id: 'deal', label: 'Catch a deal', hint: 'Buy a card ' + Math.round(k.dealBelowFair * 100) + '% or more under Average Value.', done: !!done.deal },
      { id: 'profit', label: 'Make a profit', hint: 'Sell for more than you paid, after the fee.', done: !!done.profit },
      { id: 'auction', label: 'Win an auction', hint: 'Win an auction near its close.', done: !!done.auction },
      { id: 'fire', label: 'Catch a fire sale', hint: 'Watch for sellers who need cash.', done: !!done.fire },
      { id: 'grow', label: 'Grow your wealth by 25%', hint: nw0 != null ? 'Started at ' + money(nw0) + '.' : 'Credits plus card value.', done: !!done.grow || grew }
    ];
    if (grew && !done.grow) done.grow = true;
    return { level: level, next: next, xp: xp, fraction: frac, realized: realized, trades: (you.sold || 0) + (you.bought || 0), quests: quests, questsDone: quests.filter(function (q) { return q.done; }).length, wins: (you.wins || []).slice().reverse() };
  }
  // Net worth: Credits you hold plus the Average Value of every card you own. An estimate, never a promise.
  function netWorth(world, env, player) {
    var cards = 0;
    (player.inventory || []).forEach(function (inst) { cards += fairOf(world, env, asItem(inst)); });
    return Math.round(player.balance + cards);
  }
  // One point of history at most every few simulated hours; the first call also fixes the starting point.
  function sample(world, env, player) {
    var k = cfg().coach, co = world.coach, nw = netWorth(world, env, player);
    if (co.nw0 == null) { co.nw0 = nw; co.t0 = world.now; }
    if (co.lastSample < 0 || world.now - co.lastSample >= k.historyEveryHours * HOUR) {
      co.hist.push([world.now, nw]); co.lastSample = world.now;
      if (co.hist.length > k.historyKeep) co.hist.splice(0, co.hist.length - k.historyKeep);
    }
    return nw;
  }

  // Remembers the price a purchase was meant to resell at. Bounded; forgotten when the card is sold.
  function plan(world, itemId, price) {
    var p = world.coach.plan || (world.coach.plan = {}), keys = Object.keys(p);
    p[itemId] = Math.max(1, Math.round(price));
    if (keys.length > 200) delete p[keys[0]];
  }
  function forgetPlan(world, itemId) { if (world.coach.plan) delete world.coach.plan[itemId]; }
  // Whether it is time for another point of history (so callers can skip the work of computing one).
  function due(world) { var co = world.coach; return co.nw0 == null || co.lastSample < 0 || world.now - co.lastSample >= cfg().coach.historyEveryHours * HOUR; }

  S.advisor = { assess: assess, plan: plan, forgetPlan: forgetPlan, due: due, moves: moves, pulse: pulse, progress: progress, netWorth: netWorth, sample: sample, drift: drift, demandFor: demandFor, fairOf: fairOf };
})(window.Cardable = window.Cardable || {});
