/* Cardable Market — offline simulation engine, part 3: what the player can do, serialization and reconciliation.
 * Every action validates against the world and the host (the player's save) and returns { ok, ... } with a
 * machine code and a plain message. Actions never throw for expected failures. */
(function (C) {
  'use strict';
  var S = C.market.sim;
  var HOUR = S.HOUR, DAY = S.DAY;
  var cfg = function () { return C.data.marketSim; };

  var MESSAGES = {
    closed: 'This listing is no longer open.', own: 'You cannot trade with your own listing.', ended: 'This auction has ended.', invalid: 'That value is not valid.',
    lower: 'Your maximum must be higher than your current one.', increment: 'Your maximum is below the minimum next bid.', funds: 'You do not have enough available Credits.',
    locked: 'That card is already in a listing or an offer.', missing: 'That card is not in your collection.', limit: 'You have reached the limit of open listings.',
    price: 'Enter a whole price of at least 1 Credit.', duration: 'Choose a length between 1 hour and 14 days.', reserve: 'The reserve cannot be below the starting bid.',
    buyout: 'The buyout must be above the starting bid and the reserve.', bundle: 'A listing holds between 1 and 6 cards.', kind: 'Choose a listing type.',
    'has-bids': 'An auction with bids cannot be withdrawn.', 'not-found': 'That listing could not be found.', 'not-fixed': 'This listing is not a fixed price.',
    'not-auction': 'This listing is not an auction.', 'no-buyout': 'This auction has no buyout, or its price has passed the buyout.', 'settle-failed': 'Your collection could not be updated, so nothing changed. Try again.',
    'not-swap': 'This listing is not open to swaps.', 'bad-offer': 'That offer cannot be answered now.', protected: 'A locked card cannot be listed. Unlock it first.'
  };
  function fail(code, extra) { return Object.assign({ ok: false, error: code, message: MESSAGES[code] || 'That did not work.' }, extra || {}); }
  function ok(extra) { return Object.assign({ ok: true }, extra || {}); }

  // The same request id always returns the first answer, so a repeated click or retry cannot act twice.
  function once(world, requestId, fn) {
    if (!requestId) return fn();
    var hit = world.requests[requestId];
    if (hit) return Object.assign({}, hit, { repeated: true });
    var result = fn();
    world.requests[requestId] = result;
    var keys = Object.keys(world.requests);
    if (keys.length > 200) delete world.requests[keys[0]];
    return result;
  }
  function itemFromInstance(world, inst) {
    return { i: inst.instanceId, c: inst.cardId, v: inst.variantId || null, k: inst.cardSkinId || null, s: inst.serial, p: inst.packId || 'standard', a: world.now, u: 0, pa: inst.pulledAt };
  }
  function instanceFrom(it, now, world) {
    return { instanceId: it.i, cardId: it.c, variantId: it.v || null, cardSkinId: it.k || null, serial: it.s, packId: it.p || 'standard',
      pulledAt: world.wall0 + Math.max(0, now - world.epoch), seen: false, origin: 'market-sim' };
  }
  function playerListings(world, status) {
    var out = [];
    for (var id in world.listings) { var l = world.listings[id]; if (l.seller === 'you' && (!status || l.status === status)) out.push(l); }
    return out;
  }

  // ---- listing ---------------------------------------------------------------------------------------------------------
  function list(world, env, host, spec) {
    return once(world, spec.requestId, function () {
      var lp = cfg().listing, ids = (spec.instanceIds || []).slice();
      if (!ids.length || ids.length > lp.maxBundle || new Set(ids).size !== ids.length) return fail('bundle');
      if (['fixed', 'auction', 'swap'].indexOf(spec.kind) < 0) return fail('kind');
      if (playerListings(world, 'open').length >= lp.maxOpenPerPlayer) return fail('limit');
      var items = [];
      for (var i = 0; i < ids.length; i++) {
        var inst = host.instance(ids[i]);
        if (!inst) return fail('missing');
        if (world.locks[ids[i]]) return fail('locked');
        if (inst.locked) return fail('protected');
        items.push(itemFromInstance(world, inst));
      }
      var dur = Number(spec.durationMs), l;
      var minDur = HOUR, maxDur = 14 * DAY;
      if (spec.kind === 'fixed') {
        var ask = Number(spec.ask);
        if (!Number.isSafeInteger(ask) || ask < cfg().economy.minPrice || ask > 100000000) return fail('price');
        if (!(dur >= minDur && dur <= 30 * DAY)) dur = 7 * DAY;
        l = S.makeListing(world, { kind: 'fixed', seller: 'you', items: items, ask: ask, durationMs: dur, title: spec.title, note: spec.note });
        l.pricedAt = world.now;
      } else if (spec.kind === 'auction') {
        var start = Number(spec.start), reserve = spec.reserve == null || spec.reserve === '' ? null : Number(spec.reserve), buyout = spec.buyout == null || spec.buyout === '' ? null : Number(spec.buyout);
        if (!Number.isSafeInteger(start) || start < cfg().economy.minPrice) return fail('price');
        if (reserve != null && (!Number.isSafeInteger(reserve) || reserve < start)) return fail('reserve');
        if (buyout != null && (!Number.isSafeInteger(buyout) || buyout <= Math.max(start, reserve || 0))) return fail('buyout');
        if (!(dur >= minDur && dur <= maxDur)) return fail('duration');
        l = S.makeListing(world, { kind: 'auction', seller: 'you', items: items, start: start, reserve: reserve, buyout: buyout, durationMs: dur, title: spec.title, note: spec.note });
      } else {
        if (!(dur >= minDur && dur <= 30 * DAY)) dur = 5 * DAY;
        var wants = spec.wants && typeof spec.wants === 'object' ? { cardId: spec.wants.cardId || null, minFrac: Number(spec.wants.minFrac) || cfg().listing.swapMinFrac, rarity: spec.wants.rarity || null } : null;
        l = S.makeListing(world, { kind: 'swap', seller: 'you', items: items, durationMs: dur, title: spec.title, note: spec.note, wants: wants });
      }
      ids.forEach(function (id) { world.locks[id] = l.id; });
      S.feed(world, 'listed', 'You listed ' + S.cardLabel(env, items[0]) + (items.length > 1 ? ' and ' + (items.length - 1) + ' more' : ''), { listing: l.id, you: true });
      if (l.kind === 'fixed') S.matchOrdersFor(world, env, host, l);
      // an underpriced listing does not sit: bargain hunters come to look within the hour
      if (l.kind === 'fixed' && l.status === 'open' && S.alertScouts) S.alertScouts(world, env, l);
      return ok({ listing: l });
    });
  }
  function cancel(world, env, host, listingId, requestId) {
    return once(world, requestId, function () {
      var l = world.listings[listingId];
      if (!l || l.seller !== 'you') return fail('not-found');
      var r = S.cancelListing(world, env, l, 'you');
      if (!r.ok) return fail(r.error);
      S.feed(world, 'cancelled', 'You withdrew ' + S.cardLabel(env, l.items[0]), { listing: l.id, you: true });
      return ok({ listing: l });
    });
  }

  // ---- buying ----------------------------------------------------------------------------------------------------------
  function buy(world, env, host, listingId, requestId) {
    return once(world, requestId, function () {
      var l = world.listings[listingId];
      if (!l) return fail('not-found');
      if (l.seller === 'you') return fail('own');
      if (l.status !== 'open' || world.now >= l.endsAt) return fail('closed');
      if (l.kind !== 'fixed') return fail('not-fixed');
      var price = l.ask;
      if (S.playerAvailable(world, host) < price) return fail('funds', { available: S.playerAvailable(world, host), price: price });
      S.completeSale(world, env, host, l, { buyer: 'you', price: price, kind: 'fixed' });
      if (l.status === 'sold') return ok({ listing: l, price: price, receiptId: l.settle && l.settle.receiptId });
      return fail('settle-failed', { pending: l.status === 'settling', listing: l });
    });
  }
  function bid(world, env, host, listingId, max, requestId) {
    return once(world, requestId, function () {
      var l = world.listings[listingId];
      if (!l) return fail('not-found');
      if (l.kind !== 'auction') return fail('not-auction');
      var r = S.placeBid(world, env, host, l, 'you', Math.floor(Number(max)));
      if (!r.ok) return fail(r.error, r);
      return ok({ listing: l, price: r.price, leading: r.leading });
    });
  }
  function buyout(world, env, host, listingId, requestId) {
    return once(world, requestId, function () {
      var l = world.listings[listingId];
      if (!l) return fail('not-found');
      if (l.kind !== 'auction' || !l.buyout) return fail('no-buyout');
      if (l.seller === 'you') return fail('own');
      if (l.status !== 'open' || world.now >= l.endsAt) return fail('closed');
      if (S.currentPrice(l) >= l.buyout) return fail('no-buyout');
      var own = l.maxes.you ? l.maxes.you.max : 0;
      if (S.playerAvailable(world, host) + own < l.buyout) return fail('funds', { available: S.playerAvailable(world, host) + own, price: l.buyout });
      // The player's own hold on this auction ends with the purchase.
      delete l.maxes.you;
      S.completeSale(world, env, host, l, { buyer: 'you', price: l.buyout, kind: 'buyout' });
      if (l.status === 'sold') return ok({ listing: l, price: l.buyout });
      return fail('settle-failed', { pending: l.status === 'settling', listing: l });
    });
  }

  // ---- buy orders ------------------------------------------------------------------------------------------------------
  function placeOrder(world, env, host, spec) {
    return once(world, spec.requestId, function () {
      var maxPrice = Number(spec.maxPrice);
      if (!env.cardById[spec.c]) return fail('invalid');
      if (!Number.isSafeInteger(maxPrice) || maxPrice < cfg().economy.minPrice) return fail('price');
      var dur = Number(spec.durationMs) || 3 * DAY;
      if (!(dur >= HOUR && dur <= 30 * DAY)) return fail('duration');
      var mine = 0; for (var id in world.orders) if (world.orders[id].owner === 'you' && world.orders[id].status === 'open') mine++;
      if (mine >= 12) return fail('limit');
      if (S.playerAvailable(world, host) < maxPrice) return fail('funds', { available: S.playerAvailable(world, host), price: maxPrice });
      var o = S.openOrder(world, env, host, 'you', { c: spec.c, v: spec.v || null, k: spec.k || null, anyFinish: !!spec.anyFinish, maxPrice: maxPrice, durationMs: dur, note: spec.note });
      return ok({ order: o });
    });
  }
  function cancelOrder(world, env, host, orderId) {
    var o = world.orders[orderId];
    if (!o || o.owner !== 'you') return fail('not-found');
    if (o.status !== 'open') return fail('closed');
    o.status = 'cancelled'; o.closedAt = world.now;
    return ok({ order: o });
  }

  // ---- swaps -----------------------------------------------------------------------------------------------------------
  function propose(world, env, host, spec) {
    return once(world, spec.requestId, function () {
      var l = world.listings[spec.listingId];
      if (!l) return fail('not-found');
      if (l.kind !== 'swap') return fail('not-swap');
      if (l.status !== 'open' || world.now >= l.endsAt) return fail('closed');
      if (l.seller === 'you') return fail('own');
      var ids = (spec.instanceIds || []).slice(), cash = Math.floor(Number(spec.cash) || 0);
      if (!ids.length || ids.length > cfg().listing.maxBundle || new Set(ids).size !== ids.length) return fail('bundle');
      if (cash < 0) return fail('invalid');
      var give = [];
      for (var i = 0; i < ids.length; i++) {
        var inst = host.instance(ids[i]);
        if (!inst) return fail('missing');
        if (world.locks[ids[i]]) return fail('locked');
        give.push(itemFromInstance(world, inst));
      }
      if (cash > 0 && S.playerAvailable(world, host) < cash) return fail('funds', { available: S.playerAvailable(world, host), price: cash });
      var offer = { id: S.nextId(world, 'F'), from: 'you', to: l.seller, listingId: l.id, give: give, get: l.items.slice(), cashFrom: cash, status: 'pending', createdAt: world.now,
        expiresAt: world.now + cfg().listing.offerExpiryDays * DAY, note: '' };
      world.offers[offer.id] = offer; l.offers.push(offer.id);
      ids.forEach(function (id) { world.locks[id] = 'offer:' + offer.id; });
      S.addEvent(world, offer.expiresAt, 'offerEnd', offer.id);
      S.addEvent(world, world.now + Math.round(S.between(world, 1, 6) * HOUR), 'offerReply', offer.id);
      return ok({ offer: offer });
    });
  }
  function respond(world, env, host, offerId, accept, requestId) {
    return once(world, requestId, function () {
      var of = world.offers[offerId];
      if (!of) return fail('bad-offer');
      var l = world.listings[of.listingId];
      if (of.to === 'you' && of.status === 'pending' || of.from === 'you' && of.status === 'countered') {
        if (!accept) { S.closeOffer(world, of, 'declined', 'You declined'); return ok({ offer: of }); }
        if (!l || l.status !== 'open') { S.closeOffer(world, of, 'withdrawn', 'The listing is no longer open'); return fail('closed'); }
        var cash = of.cashFrom || 0;
        if (of.from === 'you' && S.playerAvailable(world, host) + cash < cash) return fail('funds');
        if (of.from === 'you' && host.balance() < cash) return fail('funds', { available: host.balance(), price: cash });
        var done = S.acceptSwap(world, env, host, of, l);
        if (!done && of.status !== 'declined') return fail('settle-failed', { pending: of.status === 'settling', offer: of });
        if (!done) return fail('funds');
        return ok({ offer: of });
      }
      return fail('bad-offer');
    });
  }
  function withdraw(world, env, host, offerId) {
    var of = world.offers[offerId];
    if (!of || of.from !== 'you') return fail('bad-offer');
    if (of.status !== 'pending' && of.status !== 'countered') return fail('bad-offer');
    S.closeOffer(world, of, 'withdrawn', 'You withdrew it');
    return ok({ offer: of });
  }

  // ---- serialization ---------------------------------------------------------------------------------------------------
  function serialize(world) {
    var body = JSON.stringify(world, function (key, value) { return key === 'botIndex' || key.charAt(0) === '_' ? undefined : value; });
    return JSON.stringify({ schema: cfg().schema, sum: C.market.core.hash32(body), body: body });
  }
  function validate(world) {
    function need(c, m) { if (!c) throw new Error('Simulation state is invalid: ' + m); }
    need(world && typeof world === 'object' && world.v === 1, 'version');
    need(Number.isFinite(world.now) && Number.isFinite(world.rng) && Array.isArray(world.queue) && Array.isArray(world.bots), 'shape');
    ['listings', 'orders', 'offers', 'locks', 'obs', 'receipts', 'daily', 'agg'].forEach(function (k) { need(world[k] && typeof world[k] === 'object' && !Array.isArray(world[k]), k); });
    need(Array.isArray(world.trades) && Array.isArray(world.feed) && Array.isArray(world.notices) && Array.isArray(world.pending), 'lists');
    world.bots.forEach(function (b) {
      need(b && typeof b.id === 'string' && Number.isFinite(b.credits) && b.credits >= 0 && Array.isArray(b.inv), 'bot ' + (b && b.id));
      need(b.held && typeof b.held === 'object', 'bot holds');
    });
    var seen = {};
    world.bots.forEach(function (b) { b.inv.forEach(function (it) { need(typeof it.i === 'string' && !seen[it.i], 'duplicate card ' + it.i); seen[it.i] = 1; }); });
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.status !== 'open' && l.status !== 'settling') continue;
      // A player's own card is in the save, not in this world, so it can sit in a listing.
      if (l.seller === 'you') continue;
      l.items.forEach(function (it) { need(!seen[it.i], 'card in two places ' + it.i); seen[it.i] = 1; });
    }
    return world;
  }
  function deserialize(text, env) {
    var wrapper = JSON.parse(text);
    if (!wrapper || typeof wrapper.body !== 'string') throw new Error('Simulation state is not readable');
    if (wrapper.schema !== cfg().schema) throw new Error('Simulation state is from another version');
    if (C.market.core.hash32(wrapper.body) !== wrapper.sum) throw new Error('Simulation state failed its checksum');
    var world = JSON.parse(wrapper.body);
    validate(world);
    return S.index(world);
  }

  // ---- reconciliation with the player's save --------------------------------------------------------------------------
  // Run after load and after the save is replaced. Returns a short list of what it changed.
  function reconcile(world, env, host) {
    var changes = [];
    // 1. Finish settlements that were interrupted between the two stores. Re-applying is safe: the save
    //    ignores a receipt it has already applied.
    world.pending.slice().forEach(function (id) {
      var rec = world.receipts[id];
      if (!rec) { world.pending = world.pending.filter(function (x) { return x !== id; }); return; }
      var done = S.finalizeSettlement(world, env, host, id);
      if (!done) {
        // The save cannot take it (the card is gone or the Credits are not there): undo the sale, honestly.
        var l = world.listings[rec.effect.listingId];
        rec.state = 'void'; rec.voidAt = world.now;
        world.pending = world.pending.filter(function (x) { return x !== id; });
        if (l && l.status === 'settling') {
          l.status = 'open'; delete l.settle;
          S.releaseHolds(world, l);
          if (l.seller !== 'you') { S.returnItems(world, l); S.finishListing(world, l, 'cancelled'); }
          else S.finishListing(world, l, 'cancelled');
        }
        var off = rec.swap && world.offers[rec.swap];
        if (off) S.closeOffer(world, off, 'declined', 'Could not be completed');
        changes.push('void ' + id);
        S.notify(world, 'void', 'A trade could not be completed against your collection, so it was cancelled.', {});
      }
    });
    // 1b. A save that was restored to an earlier state is missing trades the simulator already completed.
    //     Receipts newer than the last one the save knows about are applied again, so the two always agree.
    if (host.hasReceipt) {
      var done = Object.keys(world.receipts).map(function (id) { return { id: id, rec: world.receipts[id] }; })
        .filter(function (x) { return x.rec.state === 'done'; }).sort(function (a, b) { return a.rec.t - b.rec.t || (a.id < b.id ? -1 : 1); });
      var lastKnown = -1;
      done.forEach(function (x, idx) { if (host.hasReceipt(x.id)) lastKnown = idx; });
      done.slice(lastKnown + 1).forEach(function (x) {
        if (host.hasReceipt(x.id)) return;
        var ok = false;
        try { ok = host.settle(x.rec.effect) === true; } catch (_) { ok = false; }
        changes.push((ok ? 'replayed ' : 'conflict ') + x.id);
        if (!ok) S.notify(world, 'conflict', 'A completed trade could not be matched to your collection. It was left as it is.', {});
      });
    }
    // 2. Cards that left the collection cannot stay listed.
    playerListings(world, 'open').forEach(function (l) {
      var gone = l.items.some(function (it) { return !host.instance(it.i); });
      if (gone) {
        S.finishListing(world, l, 'cancelled');
        S.notify(world, 'withdrawn', 'Your listing of ' + S.cardLabel(env, l.items[0]) + ' was removed because the card is no longer in your collection.', { listing: l.id });
        changes.push('cancelled ' + l.id);
      }
    });
    for (var oid in world.offers) {
      var of = world.offers[oid];
      if ((of.status === 'pending' || of.status === 'countered') && of.from === 'you' && of.give.some(function (it) { return !host.instance(it.i); })) { S.closeOffer(world, of, 'withdrawn', 'The card is gone'); changes.push('offer ' + oid); }
    }
    // 3. Locks that no longer belong to anything open.
    Object.keys(world.locks).forEach(function (iid) {
      var ref = world.locks[iid], alive = false;
      if (ref.indexOf('offer:') === 0) { var f = world.offers[ref.slice(6)]; alive = !!f && (f.status === 'pending' || f.status === 'countered' || f.status === 'settling'); }
      else { var ll = world.listings[ref]; alive = !!ll && (ll.status === 'open' || ll.status === 'settling'); }
      if (!alive || !host.instance(iid) && !isBotItem(world, iid)) delete world.locks[iid];
    });
    // 4. Holds may not exceed the balance (a smaller save was restored): drop orders, then bids.
    var guard = 0;
    while (S.playerHeld(world) > host.balance() && guard++ < 60) {
      var openOrders = Object.keys(world.orders).map(function (k) { return world.orders[k]; }).filter(function (o) { return o.owner === 'you' && o.status === 'open'; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
      if (openOrders.length) { openOrders[0].status = 'cancelled'; changes.push('order ' + openOrders[0].id); continue; }
      var bids = playerListings(world); var withBid = []; for (var lid in world.listings) { var lx = world.listings[lid]; if (lx.status === 'open' && lx.maxes && lx.maxes.you) withBid.push(lx); }
      if (!withBid.length) break;
      withBid.sort(function (a, b) { return b.maxes.you.at - a.maxes.you.at; });
      delete withBid[0].maxes.you; changes.push('bid ' + withBid[0].id);
      void bids;
    }
    return changes;
  }
  function isBotItem(world, iid) {
    for (var i = 0; i < world.bots.length; i++) if (world.bots[i].inv.some(function (it) { return it.i === iid; })) return true;
    for (var id in world.listings) if (world.listings[id].items.some(function (it) { return it.i === iid; })) return true;
    return false;
  }
  // The save belongs to a different player or a fresh start: nothing of theirs can remain in this world.
  function detachPlayer(world, env) {
    world.pending.slice().forEach(function (id) { var rec = world.receipts[id]; if (rec) rec.state = 'void'; });
    world.pending = [];
    playerListings(world).forEach(function (l) { if (l.status === 'open' || l.status === 'settling') { l.status = 'open'; S.finishListing(world, l, 'cancelled'); } });
    for (var id in world.listings) {
      var l2 = world.listings[id];
      if (l2.status === 'open' && l2.maxes && l2.maxes.you) delete l2.maxes.you;
    }
    for (var oid in world.orders) { var o = world.orders[oid]; if (o.owner === 'you' && o.status === 'open') o.status = 'cancelled'; }
    for (var fid in world.offers) { var of = world.offers[fid]; if ((of.from === 'you' || of.to === 'you') && (of.status === 'pending' || of.status === 'countered' || of.status === 'settling')) S.closeOffer(world, of, 'withdrawn', 'A different save was loaded'); }
    Object.keys(world.locks).forEach(function (iid) { if (!isBotItem(world, iid)) delete world.locks[iid]; });
    world.stats.you = { sold: 0, bought: 0, earned: 0, spent: 0 };
  }
  // Who currently holds this card: 'you', a bot id, or null. Used by tests and the duplicate guard.
  function holdersOf(world, iid) {
    var out = [];
    world.bots.forEach(function (b) { if (b.inv.some(function (it) { return it.i === iid; })) out.push(b.id); });
    for (var id in world.listings) { var l = world.listings[id]; if ((l.status === 'open' || l.status === 'settling') && l.items.some(function (it) { return it.i === iid; })) out.push(l.seller + ':' + id); }
    return out;
  }
  // Conservation check for tests and diagnostics: no card in two places, no negative Credits.
  function audit(world, hostInventoryIds) {
    var problems = [], seen = {}, count = 0;
    function see(iid, where) { if (seen[iid]) problems.push('card ' + iid + ' in ' + seen[iid] + ' and ' + where); else seen[iid] = where; count++; }
    world.bots.forEach(function (b) {
      if (!(b.credits >= 0)) problems.push('negative credits ' + b.id);
      if (S.botHeld(b) > b.credits + 0.0001) problems.push('hold exceeds credits ' + b.id);
      b.inv.forEach(function (it) { see(it.i, 'bot ' + b.id); });
    });
    for (var id in world.listings) { var l = world.listings[id]; if (l.status === 'open' || l.status === 'settling') l.items.forEach(function (it) { if (l.seller !== 'you') see(it.i, 'listing ' + id); }); }
    (hostInventoryIds || []).forEach(function (iid) { if (seen[iid]) problems.push('card ' + iid + ' held by you and ' + seen[iid]); });
    return { problems: problems, cards: count };
  }

  Object.assign(S, {
    MESSAGES: MESSAGES, instanceFrom: instanceFrom, itemFromInstance: itemFromInstance, playerListings: playerListings,
    player: { list: list, cancel: cancel, buy: buy, bid: bid, buyout: buyout, placeOrder: placeOrder, cancelOrder: cancelOrder, propose: propose, respond: respond, withdraw: withdraw },
    serialize: serialize, deserialize: deserialize, validate: validate, reconcile: reconcile, holdersOf: holdersOf, audit: audit, detachPlayer: detachPlayer
  });
})(window.Cardable = window.Cardable || {});
