/* Cardable Market — the notch's feed.
 * PURE: it reads a snapshot of the player's market life (their bids, listings, orders, offers and notices, the coach's moves
 * and news, big sales, price movers, matches for what they are looking for, the wallet and the value of their cards) and the
 * player's own settings, and returns what the notch should say, most important first. It touches no DOM, no storage and no
 * clock of its own: the caller passes the snapshot and `cfg.now`, so the same input always gives the same answer.
 *
 * Every item belongs to one category. The player picks which categories are on, their order (the order is the priority) and
 * how much the notch speaks (quiet: only what needs them; calm: and what is going on; busy: everything). Pins come first and
 * a snoozed item is gone for a while. Each item may carry quick actions (raise a bid, buy a deal) as plain data; the interface
 * decides how to run them, and every one opens the same review the rest of the Market uses. */
(function (C) {
  'use strict';
  C.market = C.market || {};

  // level: 0 needs you, 1 is going on, 2 is background. loud: worth a peek. ambient: what the notch says when nothing else does.
  var CATS = [
    { id: 'outbid', label: 'Outbid', icon: 'down', level: 0, loud: true, bucket: 'mine', hint: 'An auction you bid on has a higher bid.' },
    { id: 'offer', label: 'Swap offers', icon: 'swap', level: 0, loud: true, bucket: 'mine', hint: 'Someone offered a swap for your card.' },
    { id: 'ending', label: 'Ending soon', icon: 'clock', level: 0, loud: true, bucket: 'mine', hint: 'Auctions you bid on or run that close within the hour.' },
    { id: 'sold', label: 'Sales and wins', icon: 'check', level: 0, loud: true, bucket: 'mine', hint: 'A card of yours sold, a bid won, or a buy order filled.' },
    { id: 'bids', label: 'Your bids', icon: 'gavel', level: 1, bucket: 'mine', hint: 'Auctions you are leading.' },
    { id: 'listings', label: 'Your listings', icon: 'tag', level: 1, bucket: 'mine', hint: 'Cards you have up for sale.' },
    { id: 'watch', label: 'Looking for', icon: 'eye', level: 1, bucket: 'looking', hint: 'Wishlist cards, alerts, buy orders and watched listings.' },
    { id: 'deals', label: 'Good right now', icon: 'zap', level: 1, bucket: 'good', hint: 'Cards under their usual price and buyers waiting for yours.' },
    { id: 'rare', label: 'Rare finds', icon: 'star', level: 1, bucket: 'looking', hint: 'A Legendary or better card was just listed.' },
    { id: 'sales', label: 'Big sales', icon: 'coin', level: 1, bucket: 'moving', hint: 'High-price sales between traders.' },
    { id: 'fell', label: 'Prices that fell', icon: 'down', level: 1, bucket: 'moving', hint: 'Cards you own that lost value today.' },
    { id: 'rose', label: 'Prices that rose', icon: 'up', level: 1, bucket: 'moving', hint: 'Cards you own that gained value today.' },
    { id: 'news', label: 'News', icon: 'activity', level: 2, bucket: 'moving', hint: 'A brand, rarity or card in the news that moves prices.' },
    { id: 'goals', label: 'Goals', icon: 'target', level: 2, bucket: 'good', hint: 'You are close to the next level.' },
    { id: 'worth', label: 'Value of your cards', icon: 'briefcase', ambient: true, bucket: 'mine', hint: 'What your cards are worth, and how it moved.' },
    { id: 'spend', label: 'Credits to spend', icon: 'coin', ambient: true, bucket: 'mine', hint: 'What you can spend now, after bids and orders hold some back.' },
    { id: 'clock', label: 'Clock', icon: 'clock', ambient: true, bucket: 'mine', hint: 'The day and time in Standard, or the connection in Players.' }
  ];
  var BY_ID = {}; CATS.forEach(function (c) { BY_ID[c.id] = c; });
  var DEFAULT_ORDER = CATS.map(function (c) { return c.id; });
  var BUCKETS = [{ id: 'mine', label: 'Mine' }, { id: 'looking', label: 'Looking' }, { id: 'good', label: 'Good' }, { id: 'moving', label: 'Moving' }];
  var MODES = { quiet: 0, calm: 1, busy: 2 };
  var LIMIT = { outbid: 5, offer: 3, ending: 4, sold: 3, bids: 4, listings: 4, watch: 6, deals: 3, rare: 2, sales: 3, fell: 3, rose: 3, news: 2, goals: 1, worth: 1, spend: 1, clock: 1 };
  var FRESH = { sold: 1, won: 1, bought: 1, order: 1, swapped: 1 };
  var HOUR = 60;

  function fx(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function pct(f) { return Math.round(Math.abs(f) * 100) + '%'; }
  function duration(min) {
    min = Math.max(0, min);
    if (min < 60) return Math.max(1, Math.round(min)) + 'm';
    if (min < 1440) return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
    return Math.floor(min / 1440) + 'd ' + Math.floor((min % 1440) / 60) + 'h';
  }

  // ---- the player's choices, kept as short strings in the shared settings ----------------------------------------------------------
  function normalizeOrder(text) {
    var seen = {}, out = [];
    String(text || '').split(',').forEach(function (id) { id = id.trim(); if (BY_ID[id] && !seen[id]) { seen[id] = true; out.push(id); } });
    DEFAULT_ORDER.forEach(function (id) { if (!seen[id]) out.push(id); });
    return out;
  }
  function normalizeHidden(text) {
    var out = {};
    String(text || '').split(',').forEach(function (id) { id = id.trim(); if (BY_ID[id]) out[id] = true; });
    return out;
  }
  function serialize(list) { return list.join(','); }

  // ---- quick actions: plain data, run by the interface through the usual review ---------------------------------------------------
  // The options for raising a bid: lead now, a step up, and as high as the player can afford (their own held maximum comes back).
  function raiseOptions(bid, wallet) {
    var a = bid && bid.auction;
    if (!a || a.minNext == null) return [];
    var price = a.current != null ? a.current : 0, mine = a.myMax || 0, avail = wallet && wallet.available != null ? wallet.available : (wallet && wallet.balance) || 0;
    var cap = mine + Math.max(0, avail), floor = a.youLead ? mine + 1 : a.minNext, seen = {}, out = [];
    function add(label, max) {
      max = Math.round(max);
      if (!(max >= floor) || max > cap || seen[max]) return;
      seen[max] = true; out.push({ label: label, max: max });
    }
    if (a.youLead) { add('+5%', Math.max(floor, Math.ceil(mine * 1.05))); add('+15%', Math.max(floor, Math.ceil(mine * 1.15))); }
    else { add('Lead', a.minNext); add('+10%', Math.max(a.minNext, Math.ceil(price * 1.1))); add('+25%', Math.max(a.minNext, Math.ceil(price * 1.25))); }
    var top = out.reduce(function (n, o) { return Math.max(n, o.max); }, 0);
    if (out.length && cap > top) add('Max', cap);
    return out.sort(function (x, y) { return x.max - y.max; }).slice(0, 3);
  }

  // ---- the feed ------------------------------------------------------------------------------------------------------------------
  function build(s, cfg) {
    s = s || {}; cfg = cfg || {};
    var order = Array.isArray(cfg.order) ? cfg.order : normalizeOrder(cfg.order), hidden = cfg.hidden || {}, mode = MODES[cfg.mode] != null ? MODES[cfg.mode] : 1;
    var pins = cfg.pins || {}, snooze = cfg.snooze || {}, now = cfg.now || 0;
    var name = cfg.name || function (id) { return id || 'Card'; }, rarity = cfg.rarity || function () { return null; };
    var wallet = s.wallet || { balance: 0, held: 0, available: 0 };
    var items = [];

    function push(cat, item) {
      var def = BY_ID[cat];
      if (!def || hidden[cat]) return;
      if (!def.ambient && def.level > mode) return;
      item.cat = cat; item.loud = !!def.loud; item.icon = item.icon || def.icon;
      item.pinned = !!pins[item.id];
      if (snooze[item.id] && snooze[item.id] > now) return;
      var r = item.cardId ? rarity(item.cardId) : null;
      if (r) { item.rarity = r.id; item.tier = r.tier; item.rarityName = r.name; }
      items.push(item);
    }
    function listingRef(l) { return { cardId: l.card.cardId, variantId: l.card.variantId || null, serial: l.card.serial || null }; }
    function ref(extra, l) { return Object.assign(listingRef(l), extra); }

    // your bids: outbid, ending soon, leading
    (s.bids || []).forEach(function (b) {
      if (!b || !b.card || (b.status && b.status !== 'active' && b.status !== 'ending')) return;
      var au = b.auction || {}, lead = au.youLead != null ? au.youLead : b.state === 'leading', price = au.current != null ? au.current : b.current;
      var ends = b.endsMin != null ? b.endsMin : null, id = b.listingId || b.id, soon = ends != null && ends <= HOUR;
      var opts = raiseOptions(b, wallet), title = name(b.card.cardId), go = { name: 'listing', params: { id: id } };
      var act = opts.map(function (o) { return { id: 'raise:' + id + ':' + o.max, kind: 'raise', label: o.label, detail: fx(o.max), listingId: id, max: o.max }; });
      if (!lead) push('outbid', ref({ id: 'bid:' + id, tone: 'bad', glyph: 'down', label: 'Outbid', title: title, line: 'Now ' + fx(price) + ' · your max ' + fx(au.myMax != null ? au.myMax : b.yourMax || 0), minutes: ends, go: go, actions: act, order: ends == null ? 1e9 : ends }, b));
      else if (soon) push('ending', ref({ id: 'bid:' + id, tone: 'warn', glyph: 'clock', label: 'Ends soon', title: title, line: 'You lead at ' + fx(price), minutes: ends, go: go, actions: act, order: ends }, b));
      else push('bids', ref({ id: 'bid:' + id, tone: 'good', glyph: 'up', label: 'Leading', title: title, line: 'You lead at ' + fx(price) + ' · max ' + fx(au.myMax || 0), minutes: ends, go: go, actions: act, order: ends == null ? 1e9 : ends }, b));
    });
    // swap offers made to you
    (s.offers || []).forEach(function (o) {
      if (!o.toYou || (o.status !== 'open' && o.status !== 'pending')) return;
      var first = (o.give && o.give[0]) || (o.get && o.get[0]) || null;
      push('offer', { id: 'offer:' + o.id, tone: 'info', glyph: 'swap', label: 'Swap offer', title: first ? name(first.cardId) : 'A swap', line: 'From ' + o.from + (o.cash ? ' · ' + fx(o.cash) + ' Credits' : ''),
        cardId: first ? first.cardId : null, variantId: first ? first.variantId || null : null, serial: first ? first.serial || null : null, minutes: o.minutesLeft != null ? o.minutesLeft : null, order: o.minutesLeft != null ? o.minutesLeft : 1e9,
        go: o.listingId ? { name: 'listing', params: { id: o.listingId } } : { name: 'trades', params: {} } });
    });
    // your listings, and auctions of yours about to end
    (s.mine || []).forEach(function (l) {
      if (!l || !l.card || (l.status !== 'active' && l.status !== 'ending')) return;
      var au = l.auction, ends = l.endsMin != null ? l.endsMin : null, go = { name: 'listing', params: { id: l.id } };
      var line = au ? (au.bids ? fx(au.current) + ' · ' + plural(au.bids, 'bid', 'bids') : 'No bids yet') : 'Listed at ' + fx(l.ask);
      if (au && ends != null && ends <= HOUR) push('ending', ref({ id: 'mine:' + l.id, tone: 'warn', glyph: 'clock', label: 'Your auction ends', title: name(l.card.cardId), line: line, minutes: ends, go: go, order: ends }, l));
      else push('listings', ref({ id: 'mine:' + l.id, tone: au && au.bids ? 'good' : 'info', glyph: 'tag', label: 'Listed', title: name(l.card.cardId), line: line, minutes: ends, go: go, order: ends == null ? 1e9 : ends }, l));
    });
    // fresh sales, wins and filled orders
    (s.notices || []).filter(function (n) { return FRESH[n.kind] && !n.read && n.minutesAgo < 240; }).slice(0, 3).forEach(function (n) {
      var said = n.kindLabel || 'Update', text = String(n.text || '').replace(new RegExp('^' + said.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '');
      push('sold', { id: 'note:' + n.id, noteId: n.id, tone: 'good', glyph: n.glyph || 'check', label: said, title: text || n.text, line: '', minutes: null, order: n.minutesAgo, go: n.listingId ? { name: 'listing', params: { id: n.listingId } } : { name: 'activity', params: {} } });
    });
    // looking for: buy orders, wishlist and alert matches, watched listings closing
    (s.orders || []).forEach(function (o) {
      if (o.status !== 'open') return;
      push('watch', { id: 'order:' + o.id, tone: 'info', glyph: 'target', label: 'Buy order', title: name(o.cardId), line: 'Up to ' + fx(o.maxPrice) + ' · waiting', cardId: o.cardId, variantId: o.variantId || null, minutes: o.minutesLeft != null ? o.minutesLeft : null, order: 5e8, go: { name: 'my-listings', params: {} } });
    });
    (s.matches || []).forEach(function (m) {
      if (!m || !m.listing || !m.listing.card) return;
      var l = m.listing, price = l.auction ? l.auction.current : l.ask;
      push('watch', ref({ id: 'match:' + m.kind + ':' + l.id, tone: 'good', glyph: m.kind === 'alert' ? 'bell' : m.kind === 'watch' ? 'eye' : 'star', label: m.kind === 'alert' ? 'Alert hit' : m.kind === 'watch' ? 'Watching' : 'On your wishlist', title: name(l.card.cardId),
        line: (m.note ? m.note + ' · ' : '') + fx(price) + (l.endsMin != null && l.format === 'auction' ? ' · ' + duration(l.endsMin) : ''), minutes: l.format === 'auction' ? l.endsMin : null, order: 1000 + price, go: { name: 'listing', params: { id: l.id } },
        actions: l.format === 'auction' ? [] : [{ id: 'view:' + l.id, kind: 'open', label: 'View', go: { name: 'listing', params: { id: l.id } } }] }, l));
    });
    // what is good: the coach's moves to buy or bid, and a buyer waiting
    var dealCount = 0;
    (s.moves || []).forEach(function (m) {
      if (!m.card || dealCount >= LIMIT.deals) return;
      var tag = m.tag || 'Deal';
      if (m.type === 'buy' || m.type === 'bid' || (m.type === 'sell' && m.instant)) {
        dealCount++;
        var verb = m.type === 'buy' ? 'Buy ' + fx(m.cost) : m.type === 'bid' ? 'Bid ' + fx(m.max) : 'Sell ' + fx(m.price);
        push('deals', { id: 'move:' + m.type + ':' + (m.listingId || m.itemId), tone: 'good', glyph: m.type === 'sell' ? 'coin' : m.type === 'bid' ? 'gavel' : 'zap', label: tag, title: name(m.cardId),
          line: (m.type === 'sell' ? 'A trader pays ' + fx(m.price) : fx(m.cost) + ' · about +' + fx(m.gain) + ' after the fee'), cardId: m.cardId, variantId: m.variantId || null, serial: m.serial || null,
          minutes: m.expiresMin != null && m.type !== 'sell' ? m.expiresMin : null, order: -m.gain, move: m,
          go: m.listingId ? { name: 'listing', params: { id: m.listingId } } : { name: 'portfolio', params: {} }, actions: [{ id: 'move:' + (m.listingId || m.itemId), kind: 'move', label: verb, move: m }] });
      }
    });
    // rare listings that just appeared
    (s.rare || []).slice(0, LIMIT.rare).forEach(function (l) {
      if (!l || !l.card) return;
      var price = l.auction ? l.auction.current : l.ask, r = rarity(l.card.cardId);
      push('rare', ref({ id: 'rare:' + l.id, tone: 'info', glyph: 'star', label: (r ? r.name : 'Rare') + ' listed', title: name(l.card.cardId), line: (l.fire ? 'Fire sale · ' : '') + fx(price) + (l.auction ? ' · auction' : ''), minutes: l.format === 'auction' ? l.endsMin : null, order: -(r ? r.tier : 0), go: { name: 'listing', params: { id: l.id } },
        actions: [{ id: 'view:' + l.id, kind: 'open', label: 'View', go: { name: 'listing', params: { id: l.id } } }] }, l));
    });
    // high-price sales between traders
    (s.sales || []).slice(0, LIMIT.sales).forEach(function (t) {
      var times = t.average ? (t.price / t.average) : null;
      push('sales', { id: 'sale:' + t.id, tone: 'info', glyph: 'coin', label: 'Big sale', title: name(t.cardId), line: 'Sold for ' + fx(t.price) + (times && times >= 1.15 ? ' · ' + times.toFixed(1) + '× usual' : '') + ' · ' + duration(t.minutesAgo) + ' ago',
        cardId: t.cardId, variantId: t.variantId || null, serial: t.serial || null, minutes: null, order: -t.price, go: { name: 'card', params: { id: t.cardId, variant: t.variantId || '' } } });
    });
    // price movers among the cards you own
    var floor = mode >= 2 ? 0.06 : 0.1;
    (s.movers || []).forEach(function (m) {
      if (m.change24h == null || Math.abs(m.change24h) < floor) return;
      var down = m.change24h < 0;
      push(down ? 'fell' : 'rose', { id: (down ? 'fell:' : 'rose:') + m.cardId + ':' + (m.variantId || ''), tone: down ? 'down' : 'up', glyph: down ? 'down' : 'up', label: down ? 'Price fell' : 'Price rose', title: name(m.cardId),
        line: (down ? '−' : '+') + pct(m.change24h) + ' today · you own ' + m.owned, cardId: m.cardId, variantId: m.variantId || null, minutes: null, order: -Math.abs(m.change24h), go: { name: 'card', params: { id: m.cardId, variant: m.variantId || '' } } });
    });
    // news and goals
    (s.news || []).slice(0, LIMIT.news).forEach(function (n) {
      push('news', { id: 'news:' + n.id, tone: n.up ? 'up' : 'down', glyph: n.up ? 'up' : 'down', label: 'News', title: n.headline, line: n.when || '', minutes: null, order: 0, go: { name: 'discover', params: {} } });
    });
    var p = s.progress;
    if (p && p.next && p.fraction >= 0.7) push('goals', { id: 'goal:' + p.next.name, tone: 'info', glyph: 'target', label: 'Almost there', title: 'Next level: ' + p.next.name, line: Math.max(0, p.next.at - p.xp) + ' to go', minutes: null, order: 0, go: { name: 'home', params: {} } });
    // the ambient three: the value of your cards, what you can spend, the clock
    var w = s.worth;
    if (w) {
      var diff = w.dayChange != null ? w.dayChange : (w.start != null ? w.now - w.start : 0), sign = diff > 0 ? '▲ ' : diff < 0 ? '▼ ' : '';
      push('worth', { id: 'worth', tone: diff > 0 ? 'up' : diff < 0 ? 'down' : 'idle', glyph: 'briefcase', label: fx(w.now), title: diff ? 'Net worth ' + sign + fx(Math.abs(diff)) + (w.dayChange != null ? ' today' : ' since start') : 'Net worth', line: 'Cards ' + fx(w.cards) + ' · Credits ' + fx(w.credits), minutes: null, order: 0, go: { name: 'portfolio', params: {} } });
    }
    if (s.live) push('spend', { id: 'spend', tone: 'run', glyph: 'coin', label: fx(wallet.available), title: wallet.held ? 'to spend · ' + fx(wallet.held) + ' held' : 'to spend', line: '', minutes: null, order: 0, go: { name: 'portfolio', params: {} } });
    push('clock', { id: 'clock', tone: s.clockState === 'running' ? 'run' : 'idle', glyph: s.clockState === 'running' ? 'play' : (s.realm === 'global' ? (s.live ? 'check' : 'lock') : 'pause'), label: s.clock || 'Standard', title: s.clockWord || '', line: '', minutes: null, order: 0, go: null });

    // cap each category, then sort: pins, then the player's order, then what matters inside the category
    var seen = {};
    items = items.filter(function (it) { seen[it.cat] = (seen[it.cat] || 0) + 1; return seen[it.cat] <= (LIMIT[it.cat] || 3); });
    var rank = {}; order.forEach(function (id, i) { rank[id] = i; });
    items.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      var ra = rank[a.cat], rb = rank[b.cat];
      if (BY_ID[a.cat].ambient !== BY_ID[b.cat].ambient) return BY_ID[a.cat].ambient ? 1 : -1;
      return ra - rb || (a.order != null ? a.order : 0) - (b.order != null ? b.order : 0);
    });

    // what the pill says: what is loud first (it stays on screen), else the top few things, else the ambient ones in the player's order
    var plain = items.filter(function (it) { return !BY_ID[it.cat].ambient; }), loud = plain.filter(function (it) { return it.loud || it.pinned; });
    var spotlight = loud.length ? loud.slice(0, 3) : plain.slice(0, 4);
    if (!spotlight.length || (!loud.length && mode >= 1)) {
      var ambient = items.filter(function (it) { return BY_ID[it.cat].ambient; });
      if (!spotlight.length) spotlight = ambient.length ? ambient : [];
      else if (ambient.length) spotlight = spotlight.concat([ambient[0]]);
    }
    var counts = { bids: 0, listings: 0, orders: 0, offers: 0 };
    (s.bids || []).forEach(function (b) { if (!b.status || b.status === 'active' || b.status === 'ending') counts.bids++; });
    (s.mine || []).forEach(function (l) { if (l.status === 'active' || l.status === 'ending') counts.listings++; });
    (s.orders || []).forEach(function (o) { if (o.status === 'open') counts.orders++; });
    (s.offers || []).forEach(function (o) { if (o.toYou && (o.status === 'open' || o.status === 'pending')) counts.offers++; });
    return { items: items, spotlight: spotlight, loud: loud, counts: counts, wallet: wallet };
  }

  C.market.notch = { CATS: CATS, BUCKETS: BUCKETS, DEFAULT_ORDER: DEFAULT_ORDER, MODES: MODES, byId: BY_ID, normalizeOrder: normalizeOrder, normalizeHidden: normalizeHidden, serialize: serialize, raiseOptions: raiseOptions, build: build, duration: duration, fx: fx };
})(window.Cardable = window.Cardable || {});
