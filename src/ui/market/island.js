/* Cardable Market — the island.
 * One pill at the top of the Market that always says the most important thing about your trades: you were outbid, a swap offer
 * is waiting, an auction you are in ends soon, something just sold. When nothing is open it shows the clock (Local) or the
 * connection (Global), so the header is the same width and in the same place in both realms. Press it (or Enter) and it
 * opens into the list of everything you have in motion, with the clock controls underneath in Local.
 * It reads only activitySync() and the clock; it changes nothing by itself, and it owns no timer: it repaints when the
 * shell tells it something changed. The pop-in is a one-shot transform and opacity; reduced motion removes it. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store;
  var HOUR = 60;
  // what matters most, first
  var ORDER = { outbid: 0, offer: 1, ending: 2, event: 3, leading: 4, listing: 5, order: 6 };
  var FRESH = { sold: 1, won: 1, bought: 1, order: 1, swapped: 1 };

  var pill = null, glyph, label, name, more, status, pop = null, panelBox = null, panelScope = null, lastKey = null, lastLoud = '';

  function realm() { return store.session.realm; }
  function fx(n) { return ui.fmt.exact(Math.round(n)); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---- what is in motion ------------------------------------------------------------------------------------------
  function collect() {
    var r = realm(), out = { realm: r, items: [], counts: { bids: 0, listings: 0, orders: 0, offers: 0 } };
    if (!ui.sim.live(r)) return out;
    var act;
    try { act = C.market.api.activitySync(r); } catch (error) { return out; }
    var data = C.market.api.data(), owned = C.market.api.playerState().owned || {}, read = {};
    store.prefs.notificationsRead.forEach(function (id) { read[id] = true; });
    function nameOf(cardId) { var c = data.cardById[cardId]; return c ? ui.identity(c, !!owned[cardId]).name : 'Card'; }
    function add(item) { item.order = ORDER[item.kind]; out.items.push(item); }

    (act.bids || []).forEach(function (b) {
      if (b.status && b.status !== 'active' && b.status !== 'ending') return;
      var au = b.auction || {}, lead = au.youLead != null ? au.youLead : b.state === 'leading';
      var price = au.current != null ? au.current : b.current, ends = b.endsMin != null ? b.endsMin : null, id = b.listingId || b.id;
      out.counts.bids++;
      var soon = ends != null && ends <= HOUR;
      add({ id: 'bid:' + id, kind: lead ? (soon ? 'ending' : 'leading') : 'outbid', tone: lead ? (soon ? 'warn' : 'good') : 'bad', cardId: b.card.cardId, variantId: b.card.variantId || null, serial: b.card.serial,
        label: lead ? (soon ? 'Ends soon' : 'Leading') : 'Outbid', title: nameOf(b.card.cardId), line: lead ? 'You lead at ' + fx(price) : 'Now ' + fx(price) + ' · max ' + fx(au.myMax != null ? au.myMax : b.yourMax || 0),
        minutes: ends, go: { name: 'listing', params: { id: id } } });
    });
    (act.offers || []).forEach(function (o) {
      if (!o.toYou || (o.status !== 'open' && o.status !== 'pending')) return;
      out.counts.offers++;
      var first = (o.give && o.give[0]) || (o.get && o.get[0]) || null;
      add({ id: 'offer:' + o.id, kind: 'offer', tone: 'info', cardId: first && first.cardId, variantId: first && first.variantId || null, serial: first && first.serial, label: 'Swap offer', title: first ? nameOf(first.cardId) : 'A swap',
        line: 'From ' + o.from + (o.cash ? ' · ' + fx(o.cash) + ' Credits' : ''), minutes: o.minutesLeft != null ? o.minutesLeft : null,
        go: o.listingId ? { name: 'listing', params: { id: o.listingId } } : { name: 'trades', params: {} } });
    });
    (act.mine || []).forEach(function (l) {
      if (l.status !== 'active' && l.status !== 'ending') return;
      out.counts.listings++;
      var au = l.auction, line = au ? (au.bids ? fx(au.current) + ' · ' + plural(au.bids, 'bid', 'bids') : 'No bids yet') : 'Listed at ' + fx(l.ask);
      add({ id: 'mine:' + l.id, kind: 'listing', tone: 'info', cardId: l.card.cardId, variantId: l.card.variantId || null, serial: l.card.serial, label: 'Listed', title: nameOf(l.card.cardId), line: line,
        minutes: l.endsMin != null ? l.endsMin : null, go: { name: 'listing', params: { id: l.id } } });
    });
    (act.orders || []).forEach(function (o) {
      if (o.status !== 'open') return;
      out.counts.orders++;
      add({ id: 'order:' + o.id, kind: 'order', tone: 'info', cardId: o.cardId, variantId: o.variantId || null, serial: null, label: 'Buy order', title: nameOf(o.cardId), line: 'Up to ' + fx(o.maxPrice),
        minutes: o.minutesLeft != null ? o.minutesLeft : null, go: { name: 'my-listings', params: {} } });
    });
    (act.notifications || []).filter(function (n) { return FRESH[n.kind] && !read[n.id] && n.minutesAgo < 240; }).slice(0, 3).forEach(function (n) {
      var meta = ui.activityMeta[n.kind];
      var said = meta ? meta.label : 'Update', text = String(n.text || '').replace(new RegExp('^' + said.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '');
      add({ id: 'note:' + n.id, kind: 'event', tone: 'good', cardId: null, label: said, title: text || n.text, line: '', minutes: null, go: n.listingId ? { name: 'listing', params: { id: n.listingId } } : { name: 'activity', params: {} }, icon: meta && meta.icon });
    });
    out.items.sort(function (a, b) { return a.order - b.order || (a.minutes == null ? 1e9 : a.minutes) - (b.minutes == null ? 1e9 : b.minutes); });
    return out;
  }

  // ---- the pill ---------------------------------------------------------------------------------------------------
  function idleModel(c) {
    if (c.realm === 'simulation') {
      var st = C.market.api.statusSync('simulation'), running = st.exists && !st.paused && st.clockState === 'running';
      var word = !st.exists ? 'Not started' : st.paused ? 'Paused' : running ? 'Running' : 'Frozen';
      return { key: 'idle:sim:' + word, tone: running ? 'run' : 'idle', glyph: running ? 'play' : 'pause', label: st.clock || 'Day 1', name: word, aria: 'Clock ' + (st.clock || 'not started') + ', ' + word + '. Open your trades' };
    }
    var g = C.market.api.statusSync('global'), on = !!g.connected, text = on ? (/read-only/i.test(g.label) ? 'Read-only' : 'Online') : (g.label || 'Global');
    return { key: 'idle:global:' + text, tone: on ? 'run' : 'idle', glyph: on ? 'check' : 'lock', label: text, name: on ? (g.alias || 'Global') : 'Global', aria: 'Global Market: ' + text + '. Open your trades' };
  }
  function model(c) {
    var top = c.items[0];
    if (!top) return idleModel(c);
    var glyphName = top.icon || (top.kind === 'outbid' ? 'down' : top.kind === 'leading' ? 'up' : top.kind === 'ending' ? 'clock' : top.kind === 'offer' ? 'swap' : top.kind === 'listing' ? 'tag' : top.kind === 'order' ? 'target' : 'check');
    var time = top.minutes != null && (top.kind === 'ending' || top.kind === 'offer') ? ' · ' + ui.fmt.duration(top.minutes) : '';
    return { key: top.id + ':' + top.kind + ':' + top.line, tone: top.tone, glyph: glyphName, label: top.label, name: top.title + time, more: c.items.length - 1, loud: top.kind === 'outbid' || top.kind === 'offer' || top.kind === 'event' ? top.id : '',
      aria: top.label + ': ' + top.title + (c.items.length > 1 ? ', and ' + (c.items.length - 1) + ' more' : '') + '. Open your trades' };
  }
  function paint(m, animate) {
    pill.dataset.tone = m.tone;
    ui.clear(glyph); glyph.appendChild(icon(m.glyph));
    label.textContent = m.label; name.textContent = m.name || '';
    name.hidden = !m.name;
    more.hidden = !m.more; more.textContent = m.more ? '+' + m.more : '';
    pill.setAttribute('aria-label', m.aria);
    if (!animate || ui.motion.still()) return;
    // The text slides up into place and the pill breathes once; a trade that needs you also sends one ring.
    pill.classList.remove('is-changed'); void pill.offsetWidth; pill.classList.add('is-changed');
    if (m.loud) { pill.classList.remove('is-ping'); void pill.offsetWidth; pill.classList.add('is-ping'); }
  }
  function refresh() {
    if (!pill) return;
    var c = collect(), m = model(c);
    if (m.key !== lastKey) {
      var first = lastKey == null;
      lastKey = m.key;
      paint(m, !first);
      if (m.loud && m.loud !== lastLoud) { status.textContent = m.aria.replace(/\. Open your trades$/, ''); }
      lastLoud = m.loud || '';
    } else if (label.textContent !== m.label || name.textContent !== (m.name || '')) {
      // the same state with new words (the clock moved): repaint the text without the morph
      label.textContent = m.label; name.textContent = m.name || ''; name.hidden = !m.name;
    }
    if (pop && panelBox) paintPanel(panelBox, function () { if (pop) pop.close(); }, c);
  }

  // ---- the panel --------------------------------------------------------------------------------------------------
  function summary(c) {
    var p = [];
    if (c.counts.bids) p.push(plural(c.counts.bids, 'bid', 'bids'));
    if (c.counts.offers) p.push(plural(c.counts.offers, 'offer', 'offers'));
    if (c.counts.listings) p.push(plural(c.counts.listings, 'listing', 'listings'));
    if (c.counts.orders) p.push(plural(c.counts.orders, 'order', 'orders'));
    return p.join(' · ');
  }
  function row(item, thumbs, env, close, i) {
    var b = h('button.mk-island-row', { type: 'button', data: { tone: item.tone, kind: item.kind }, style: { '--mk-i': Math.min(i, 6) } });
    var art = h('span.mk-island-art');
    var card = item.cardId && env.cardById[item.cardId];
    if (card) art.appendChild(thumbs.mount(card, { instanceId: 'island-' + item.id, cardId: item.cardId, serial: item.serial || 'CBL-0000-000000', variantId: item.variantId, cardSkinId: null, seen: true }, { owned: !!env.owned[item.cardId] }));
    else art.appendChild(h('span.mk-island-art-glyph', icon(item.icon || 'check')));
    b.appendChild(art);
    var copy = h('span.mk-island-copy', h('strong', { text: item.title }), h('span.mk-island-line', h('span.mk-island-tag', { text: item.label }), item.line ? h('span', { text: item.line }) : null));
    b.appendChild(copy);
    if (item.minutes != null) b.appendChild(h('span.mk-island-time.mk-num', icon('clock'), h('span', { text: ui.fmt.duration(item.minutes) })));
    b.appendChild(icon('forward', 'mk-island-go'));
    b.addEventListener('click', function () { close(); ui.go(item.go.name, item.go.params); });
    return b;
  }
  // The same rows are used by the panel and by Home.
  function fillList(list, items, thumbs, env, close, max) {
    items.slice(0, max || items.length).forEach(function (item, i) { list.appendChild(row(item, thumbs, env, close, i)); });
    if (max && items.length > max) list.appendChild(h('p.mk-island-more-note', { text: 'And ' + (items.length - max) + ' more in Activity.' }));
    return list;
  }
  function envNow() { var d = C.market.api.data(); return { cardById: d.cardById, owned: C.market.api.playerState().owned || {} }; }
  function clockControls(close) {
    var rt = C.marketSim && C.marketSim.runtime, st = C.market.api.statusSync('simulation'), cfg = C.data.marketSim;
    var box = h('div.mk-island-clock');
    var head = h('div.mk-island-clockhead', h('span.mk-num', { text: st.clock || 'Not started' }), h('span.mk-island-word', { text: !st.exists ? 'Not started' : st.paused ? 'Paused' : st.clockState === 'running' ? 'Running' : 'Frozen' }));
    box.appendChild(head);
    var line = h('div.mk-island-clockrow');
    var pause = ui.button(st.paused ? 'Resume' : 'Pause', { icon: st.paused ? 'play' : 'pause', variant: st.paused ? 'primary' : 'secondary', size: 'sm', disabled: !st.exists });
    pause.addEventListener('click', function () { if (!rt) return; if (rt.paused) rt.resume(); else rt.pause(); ui.sim.refresh(); refresh(); });
    var speed = ui.segmented({ label: 'Speed', value: st.speed, onChange: function (v) { if (rt) rt.setSpeed(v); ui.sim.refresh(); refresh(); }, options: cfg.speeds.map(function (s) { return { value: s.id, label: s.label, title: s.note }; }) });
    line.append(pause, speed);
    box.appendChild(line);
    box.appendChild(h('p.mk-island-note', { text: 'Time stops when the game is closed, hidden or paused.' }));
    return box;
  }
  function paintPanel(box, close, c) {
    c = c || collect();
    if (panelScope) panelScope.destroy();
    panelScope = ui.createScope();
    ui.clear(box);
    var env = C.market.api.data(); env = { cardById: env.cardById, owned: C.market.api.playerState().owned || {} };
    var live = ui.sim.live(c.realm);
    var head = h('div.mk-island-head', h('h2', { text: c.realm === 'simulation' || live ? 'Your trades' : 'Global' }), h('span.mk-island-sum', { text: summary(c) }));
    box.appendChild(head);
    if (c.realm === 'global' && !live) {
      var g = C.market.api.statusSync('global');
      box.appendChild(h('p.mk-island-empty', { text: g.label === 'Not connected' ? 'Not connected.' : g.label + '.' }));
      var acts = h('div.mk-island-actions');
      if (g.label === 'Not connected' && ui.online) acts.appendChild(ui.button('Connect', { variant: 'primary', icon: 'user', size: 'sm', onClick: function () { close(); ui.online.connectDialog(); } }));
      else if (g.label !== 'Not available') acts.appendChild(ui.button('Try again', { variant: 'secondary', icon: 'forward', size: 'sm', onClick: function () { C.market.online.refresh(true); } }));
      acts.appendChild(ui.button('Open Local', { variant: 'ghost', size: 'sm', onClick: function () { close(); store.setRealm('simulation'); } }));
      box.appendChild(acts);
      return;
    }
    if (!c.items.length) {
      box.appendChild(h('div.mk-island-empty', h('span.mk-island-empty-mark', icon('swap')), h('span', { text: 'Nothing open' })));
    } else {
      var list = h('div.mk-island-list');
      fillList(list, c.items, ui.thumbs(list, panelScope), env, close, 8);
      box.appendChild(list);
    }
    if (c.realm === 'simulation') box.appendChild(clockControls(close));
    var foot = h('div.mk-island-foot');
    foot.appendChild(ui.button('Activity', { variant: 'ghost', size: 'sm', icon: 'activity', onClick: function () { close(); ui.go('activity', {}); } }));
    foot.appendChild(ui.button('My listings', { variant: 'ghost', size: 'sm', icon: 'layers', onClick: function () { close(); ui.go('my-listings', {}); } }));
    box.appendChild(foot);
  }
  function toggle() {
    if (pop) { pop.close(); return; }
    if (realm() === 'simulation' && C.marketSim) { try { C.marketSim.ensure(true); } catch (error) { /* the chip still opens */ } }
    pop = ui.popover(pill, function (close) {
      panelBox = h('div.mk-island-panel');
      paintPanel(panelBox, close);
      return panelBox;
    }, { label: 'Your trades', align: 'center', className: 'mk-island-pop', onClose: function () { pop = null; panelBox = null; if (panelScope) { panelScope.destroy(); panelScope = null; } } });
  }

  function build() {
    glyph = h('span.mk-island-glyph', { 'aria-hidden': 'true' });
    label = h('span.mk-island-label'); name = h('span.mk-island-name');
    more = h('span.mk-island-more', { hidden: true, 'aria-hidden': 'true' });
    status = h('span.mk-sr', { role: 'status', 'aria-live': 'polite' });
    pill = h('button.mk-island', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', data: { tone: 'idle' } }, glyph, h('span.mk-island-text', label, name), more, status);
    pill.addEventListener('click', toggle);
    pill.addEventListener('animationend', function (e) {
      if (e.target !== pill) return;
      if (e.animationName === 'mk-island-breathe') pill.classList.remove('is-changed');
      else if (e.animationName === 'mk-island-ping') pill.classList.remove('is-ping');
    });
    lastKey = null; lastLoud = '';
    refresh();
    return pill;
  }

  ui.island = { build: build, refresh: refresh, collect: collect, summary: summary, fillList: fillList, env: envNow, get el() { return pill; } };
})(window.Cardable = window.Cardable || {}, window);
