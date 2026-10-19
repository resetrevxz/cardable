/* Cardable Market — keeping track (1.13.0).
 * Three things that make the Market easier to follow:
 *  1. The auction tracker: while you are bidding on an auction or running one, a strip at the top of the Market shows
 *     each of them with its card, whether you lead, the price, and the time left as a draining ring. It is built once per
 *     auction and only its numbers change after that, so it never flickers.
 *  2. Arrivals: a card that comes to you (an auction won, a purchase, a swap, a Shop buy) gets a notification card with
 *     the card itself and a button to see it in your inventory. With the Market closed the card flies from the notch into
 *     the inventory, which counts it in.
 *  3. The notch pill gets a little more to say: a ring that drains as an auction ends, and a glyph that moves with its news.
 * Everything reads; nothing here trades. Motion is transform and opacity, one-shot, and skipped under Reduced motion. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, doc = root.document, MIN = 60000;
  var NS = 'http://www.w3.org/2000/svg';

  function fx(n) { return ui.fmt.exact(Math.round(n)); }
  function still() { return ui.motion.still(); }
  function dur(min) { return C.market.notch.duration(min); }

  // ---- a ring that drains: an SVG circle whose dash shows the share of time left ----
  function ring(cls) {
    var svg = doc.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 36 36'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add(cls || 'mk-ring');
    var track = doc.createElementNS(NS, 'circle'), arc = doc.createElementNS(NS, 'circle');
    [track, arc].forEach(function (c) { c.setAttribute('cx', '18'); c.setAttribute('cy', '18'); c.setAttribute('r', '16'); c.setAttribute('pathLength', '100'); });
    track.classList.add('mk-ring-track'); arc.classList.add('mk-ring-arc');
    svg.append(track, arc); svg._arc = arc; return svg;
  }
  function setRing(svg, frac) {
    var v = String(Math.round(100 - Math.max(0, Math.min(1, frac)) * 100));
    if (svg._v !== v) { svg._v = v; svg._arc.setAttribute('stroke-dashoffset', v); svg._arc.setAttribute('stroke-dasharray', '100'); }
  }

  // ---- 1. the auction tracker ---------------------------------------------------------------------------------------------
  var chips = new Map(), scope = null, thumbs = null, trackRow = null;
  function auctions() {
    var realm = store.session.realm, act;
    if (!ui.sim.live(realm)) return [];
    try { act = C.market.api.activitySync(realm); } catch (_) { return []; }
    var out = [];
    (act.bids || []).forEach(function (b) {
      if (!b || !b.card || !b.auction || (b.status && b.status !== 'active' && b.status !== 'ending')) return;
      out.push({ id: b.id || b.listingId, side: 'bid', l: b, lead: !!b.auction.youLead, price: b.auction.current, endsMin: b.endsMin, total: b.endsAt && b.createdSim ? (b.endsAt - b.createdSim) / MIN : null, bids: b.auction.bids, myMax: b.auction.myMax });
    });
    (act.mine || []).forEach(function (l) {
      if (!l || !l.card || !l.auction || (l.status !== 'active' && l.status !== 'ending')) return;
      out.push({ id: l.id, side: 'sell', l: l, lead: l.auction.bids > 0, price: l.auction.current, endsMin: l.endsMin, total: l.endsAt && l.createdSim ? (l.endsAt - l.createdSim) / MIN : null, bids: l.auction.bids });
    });
    return out.sort(function (a, b) { return (a.endsMin == null ? 1e9 : a.endsMin) - (b.endsMin == null ? 1e9 : b.endsMin); });
  }
  function stateOf(a) {
    if (a.side === 'sell') return a.bids ? { tone: 'good', word: a.bids === 1 ? '1 bid' : a.bids + ' bids', glyph: 'gavel' } : { tone: 'idle', word: 'No bids yet', glyph: 'clock' };
    return a.lead ? { tone: 'good', word: 'Leading', glyph: 'up' } : { tone: 'bad', word: 'Outbid', glyph: 'down' };
  }
  function buildChip(a) {
    var data = C.market.api.data(), card = data.cardById[a.l.card.cardId], owned = !!(C.market.api.playerState().owned || {})[a.l.card.cardId];
    var idn = card ? ui.identity(card, owned) : { name: 'Card', rarityName: '' };
    var el = h('button.mk-track', { type: 'button', data: { id: a.id, side: a.side }, style: card ? { '--mk-rgb': ui.rarityRgb(card.rarity), '--mk-tier': ui.rarityTier(card.rarity) } : {} });
    var art = h('span.mk-track-art'), r = ring('mk-track-ring');
    if (card && thumbs) art.appendChild(thumbs.mount(card, { instanceId: 'track-' + a.id, cardId: card.id, serial: a.l.card.serial, variantId: a.l.card.variantId, cardSkinId: a.l.card.cardSkinId, seen: true }, { owned: owned }));
    art.appendChild(r);
    var state = h('span.mk-track-state'), price = h('span.mk-track-price.mk-num'), time = h('span.mk-track-time.mk-num');
    el.append(art, h('span.mk-track-copy', h('strong.mk-track-name', { text: idn.name }), h('span.mk-track-line', state, price)), h('span.mk-track-clock', icon('clock'), time));
    el.addEventListener('click', function () { ui.go('listing', { id: a.id }); });
    var parts = { el: el, ring: r, state: state, price: price, time: time, name: idn.name, tone: null };
    paintChip(parts, a, true);
    return parts;
  }
  function paintChip(p, a, first) {
    var s = stateOf(a);
    if (p.tone !== s.tone) {
      var was = p.tone; p.tone = s.tone; p.el.dataset.tone = s.tone;
      ui.clear(p.state); p.state.append(icon(s.glyph), h('span', { text: s.word }));
      // a change of fortune (outbid, back in the lead) shakes or lifts the chip once
      if (!first && was && !still()) { p.el.classList.remove('is-bump'); void p.el.offsetWidth; p.el.classList.add('is-bump'); }
    } else if (p.state.lastChild && p.state.lastChild.textContent !== s.word) p.state.lastChild.textContent = s.word;
    var pt = fx(a.price); if (p.price.textContent !== pt) { var up = p.price.textContent && Number(p.price.textContent.replace(/,/g, '')) < a.price; p.price.textContent = pt; if (!first && up) ui.motion.flash(p.price, 'up'); }
    var tt = a.endsMin == null ? '' : dur(a.endsMin); if (p.time.textContent !== tt) p.time.textContent = tt;
    p.el.dataset.urgent = String(a.endsMin != null && a.endsMin <= 60);
    setRing(p.ring, a.total ? a.endsMin / a.total : 1);
    p.el.setAttribute('aria-label', (a.side === 'sell' ? 'Your auction: ' : 'Your bid: ') + p.name + ', ' + s.word + ', ' + fx(a.price) + ' Credits, ' + (a.endsMin == null ? '' : dur(a.endsMin) + ' left') + '. Open the auction');
  }
  function renderTracker() {
    var hostEl = ui.shell && ui.shell.trackerHost;
    if (!hostEl || !ui.shell.isOpen) return;
    var list = auctions(), cur = ui.shell.current(), onListing = cur && cur.name === 'listing';
    if (!list.length) { hostEl.hidden = true; return; }
    if (!scope) { scope = ui.createScope(); thumbs = ui.thumbs(hostEl, scope); }
    if (!trackRow) {
      trackRow = h('div.mk-track-row', { role: 'list', 'aria-label': 'Your auctions' });
      hostEl.append(h('div.mk-track-head', icon('gavel'), h('span', { text: 'Your auctions' }), h('span.mk-track-count.mk-num')), trackRow);
    }
    hostEl.hidden = false;
    hostEl.dataset.compact = String(!!onListing);
    hostEl.querySelector('.mk-track-count').textContent = String(list.length);
    var seen = {};
    list.forEach(function (a, i) {
      seen[a.id] = true;
      var p = chips.get(a.id);
      if (!p) { p = buildChip(a); chips.set(a.id, p); p.el.setAttribute('role', 'listitem'); if (!still()) p.el.classList.add('is-new'); }
      else paintChip(p, a, false);
      if (trackRow.children[i] !== p.el) trackRow.insertBefore(p.el, trackRow.children[i] || null);
    });
    chips.forEach(function (p, id) {
      if (seen[id]) return;
      chips.delete(id);
      if (still() || !p.el.animate) { p.el.remove(); return; }
      p.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { p.el.remove(); };
    });
  }
  function resetTracker() {
    chips.clear(); trackRow = null;
    if (scope) { scope.destroy(); scope = null; thumbs = null; }
    var hostEl = ui.shell && ui.shell.trackerHost;
    if (hostEl) { ui.clear(hostEl); hostEl.hidden = true; }
  }

  // ---- 2. arrivals ----------------------------------------------------------------------------------------------------------
  var stack = null;
  function stackHost() {
    var parent = ui.shell && ui.shell.isOpen ? ui.shell.el : (C.viewport ? C.viewport.parent(doc.body) : doc.body);
    if (!stack || stack.parentNode !== parent) { if (stack) stack.remove(); stack = h('div.mk-arrivals', { role: 'region', 'aria-label': 'New in your inventory', 'aria-live': 'polite' }); parent.appendChild(stack); }
    return stack;
  }
  function inventoryTarget() { var el = doc.getElementById('inventory-affordance'); if (!el) return null; var r = el.getBoundingClientRect(); return r.width ? el : null; }
  function openInventory(instance) {
    var go = function () { C.events.notify ? C.events.notify('inventory:showCard', { cardId: instance.cardId, instanceId: instance.instanceId }) : C.events.emit('inventory:showCard', { cardId: instance.cardId, instanceId: instance.instanceId }); };
    if (ui.shell && ui.shell.isOpen) { ui.shell.close(); root.setTimeout(go, 120); } else go();
  }
  // A card came to you. `from` is where it came from (a button, the notch); `verb` says how.
  function arrived(o) {
    var inst = o.instance; if (!inst || !inst.cardId) return;
    var card = C.card ? C.card(inst.cardId) : null; if (!card) return;
    var idn = ui.identity(card, true), rgb = ui.rarityRgb(card.rarity), tier = ui.rarityTier(card.rarity);
    var box = stackHost();
    var art = h('span.mk-arrival-art');
    var view = null;
    try { view = C.cardView.create(card, inst, { thumbnail: true, owned: true, presentation: 'art-only' }); art.appendChild(view.el); } catch (_) { art.appendChild(icon('cards')); }
    var note = h('article.mk-arrival', { data: { tier: String(tier) }, style: { '--mk-rgb': rgb, '--mk-tier': tier } },
      h('i.mk-arrival-shine', { 'aria-hidden': 'true' }), art,
      h('div.mk-arrival-copy', h('span.mk-arrival-kicker', icon(o.verb === 'Won' ? 'trophy' : o.verb === 'Swapped' ? 'swap' : 'check'), h('span', { text: (o.verb || 'New') + ' · in your inventory' })),
        h('strong', { text: idn.name }), h('span.mk-arrival-meta', { text: idn.rarityName + (inst.serial ? ' · ' + String(inst.serial).replace('CBL-', '') : '') })),
      h('div.mk-arrival-actions'));
    var acts = note.querySelector('.mk-arrival-actions');
    acts.appendChild(ui.button('View', { variant: 'primary', size: 'sm', icon: 'eye', onClick: function () { dismiss(); openInventory(inst); } }));
    var x = ui.iconButton('close', 'Dismiss', function () { dismiss(); }, { variant: 'ghost' }); acts.appendChild(x);
    box.appendChild(note);
    while (box.children.length > 3) box.firstChild.remove();
    var timer = root.setTimeout(dismiss, 7000);
    note.addEventListener('pointerenter', function () { root.clearTimeout(timer); });
    note.addEventListener('pointerleave', function () { timer = root.setTimeout(dismiss, 2500); });
    function dismiss() {
      root.clearTimeout(timer);
      if (!note.isConnected) return;
      var end = function () { note.remove(); if (view) { try { view.destroy(); } catch (_) { /* gone */ } } };
      if (still() || !note.animate) { end(); return; }
      note.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px) scale(.96)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = end;
    }
    // the card's flight: inside the Market settle.js flies it into Portfolio; a Shop purchase there asks it to; with the
    // Market closed it flies from the notch into the inventory, which counts it in
    if (ui.shell && ui.shell.isOpen) { if (o.fly && ui.settle) ui.settle.play({ add: [inst], remove: [], delta: 0 }); }
    else flyToInventory(card, inst, o.from);
  }
  function flyToInventory(card, inst, fromEl) {
    var target = inventoryTarget();
    if (target) countIn(target);
    if (!target || still()) return;
    var src = fromEl && fromEl.getBoundingClientRect ? fromEl : (ui.island && ui.island.floating);
    var a = src && src.getBoundingClientRect ? src.getBoundingClientRect() : { left: innerWidth / 2, top: 40, width: 0, height: 0 }, b = target.getBoundingClientRect();
    var from = { x: a.left + a.width / 2, y: a.top + a.height / 2 }, to = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    var ghost = h('div.mk-settle.is-menu', { 'aria-hidden': 'true', style: { '--mk-rgb': ui.rarityRgb(card.rarity), '--mk-lvl': (ui.rarityTier(card.rarity) / 11).toFixed(2) } }, h('i.mk-settle-glow'), h('div.mk-settle-art'));
    var view = null; try { view = C.cardView.create(card, inst, { thumbnail: true, owned: true, presentation: 'art-only' }); ghost.lastChild.appendChild(view.el); } catch (_) { /* plain */ }
    (C.viewport ? C.viewport.parent(doc.body) : doc.body).appendChild(ghost);
    var place = function (x, y, s, r) { return 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-50%) scale(' + s + ') rotate(' + r + 'deg)'; };
    var mid = { x: (from.x + to.x) / 2 + 60, y: Math.min(from.y, to.y) + (to.y - from.y) * 0.35 };
    var anim = ghost.animate([
      { transform: place(from.x, from.y, .3, -8), opacity: 0 },
      { transform: place(from.x, from.y + 70, 1.05, 0), opacity: 1, offset: .25, easing: 'cubic-bezier(.22,1,.36,1)' },
      { transform: place(from.x, from.y + 70, 1.08, 0), opacity: 1, offset: .45, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: place(mid.x, mid.y, .6, 10), opacity: 1, offset: .75 },
      { transform: place(to.x, to.y, .15, 18), opacity: .1 }
    ], { duration: 1500, fill: 'both' });
    anim.onfinish = anim.oncancel = function () { ghost.remove(); if (view) { try { view.destroy(); } catch (_) { /* gone */ } } };
  }
  function countIn(target) {
    var badge = target.querySelector('.mk-inv-badge');
    if (!badge) { badge = h('span.mk-inv-badge', { 'aria-hidden': 'true' }); target.appendChild(badge); }
    var n = (Number(badge.dataset.n) || 0) + 1; badge.dataset.n = String(n); badge.textContent = '+' + n;
    badge.classList.remove('is-in'); void badge.offsetWidth; badge.classList.add('is-in');
    target.classList.remove('mk-inv-received'); void target.offsetWidth; target.classList.add('mk-inv-received');
    root.clearTimeout(badge._t); badge._t = root.setTimeout(function () { badge.remove(); target.classList.remove('mk-inv-received'); }, 6000);
  }
  function verbOf(effect) {
    var id = String(effect.receiptId || '');
    if (effect.kind === 'swap') return 'Swapped';
    if (/-auction$/.test(id)) return 'Won';
    if (/-order$/.test(id)) return 'Order filled';
    return 'Bought';
  }

  // ---- 3. the notch pill's extra ----
  function decorate(p, it) {
    if (!p.ring) { p.ring = ring('mk-island-ring'); p.glyph.appendChild(p.ring); }
    // the icon may be rebuilt by island.js: keep the ring as its last child
    if (p.ring.parentNode !== p.glyph || p.glyph.lastChild !== p.ring) p.glyph.appendChild(p.ring);
    var timed = it && it.minutes != null && (it.cat === 'ending' || it.cat === 'outbid' || it.cat === 'bids');
    p.el.dataset.cat = it ? it.cat : '';
    p.ring.style.display = timed ? '' : 'none';
    if (timed) setRing(p.ring, Math.min(1, it.minutes / (it.cat === 'bids' ? 1440 : 60)));
  }

  // A card of yours sold: the card that left, and the Credits that came in.
  function sold(e) {
    var item = (e.items || [])[0], card = item && C.card ? C.card(item.c) : null;
    if (!card || !(e.delta > 0)) return;
    var idn = ui.identity(card, true), box = stackHost();
    var note = h('article.mk-arrival.is-sale', { style: { '--mk-rgb': '94, 214, 150', '--mk-tier': 0 } },
      h('i.mk-arrival-shine', { 'aria-hidden': 'true' }), h('span.mk-arrival-art.is-coin', icon('coin')),
      h('div.mk-arrival-copy', h('span.mk-arrival-kicker', icon('check'), h('span', { text: 'Sold' })), h('strong', { text: idn.name }),
        h('span.mk-arrival-meta', { text: '+' + fx(e.delta) + ' Credits after the fee' })),
      h('div.mk-arrival-actions'));
    var acts = note.querySelector('.mk-arrival-actions');
    acts.appendChild(ui.button('Activity', { variant: 'secondary', size: 'sm', icon: 'activity', onClick: function () { note.remove(); if (ui.shell.isOpen) ui.go('activity', {}); else C.market.open({ name: 'activity', params: {} }); } }));
    acts.appendChild(ui.iconButton('close', 'Dismiss', function () { note.remove(); }, { variant: 'ghost' }));
    box.appendChild(note);
    while (box.children.length > 3) box.firstChild.remove();
    var t = root.setTimeout(function () { if (note.isConnected) note.remove(); }, 6000);
    note.addEventListener('pointerenter', function () { root.clearTimeout(t); });
    note.addEventListener('pointerleave', function () { t = root.setTimeout(function () { if (note.isConnected) note.remove(); }, 2500); });
  }

  // ---- wiring ----
  C.events.on('market:settled', function (event) {
    var e = event && event.effect;
    if (!e) return;
    if (e.add && e.add.length) arrived({ instance: e.add[0], verb: verbOf(e), from: null, fly: false });
    else if (e.remove && e.remove.length && e.delta > 0) sold(e);
  });
  C.events.on('market:open', function () { root.setTimeout(renderTracker, 0); });
  C.events.on('market:close', function () { resetTracker(); });
  // the shell calls render() whenever it refreshes its chrome (every simulator flush and every page); a realm switch starts over
  store.subscribe(function (what) { if (what === 'realm') { resetTracker(); renderTracker(); } });
  C.events.on('market:settled', function () { root.setTimeout(renderTracker, 50); });

  ui.tracker = { render: renderTracker, reset: resetTracker, auctions: auctions };
  ui.notch2 = { decorate: decorate, patchPanel: function () {} };
  ui.flourish = Object.assign(ui.flourish || {}, { arrived: arrived });
})(window.Cardable = window.Cardable || {}, window);
