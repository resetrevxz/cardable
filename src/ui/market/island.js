/* Cardable Market — the notch (the island).
 * One black pill that says the most important thing about your market life, inside the Market's header and, with the Market
 * closed, at the top of the main menu. What it says comes from src/market/notch.js (pure): your bids, listings, orders and
 * offers, fresh sales, what is good right now, prices that rose or fell, big sales, rare finds, what you are looking for, the
 * value of your cards and the Credits you can spend. You choose what it covers, in what order and how much it speaks.
 * Press it and it opens into a panel with your spending money, the same things in full, and quick options (raise a bid by a
 * step, buy a deal) that each open the usual review first. A loud change (outbid, an offer, something sold) pings the pill and,
 * on the main menu, peeks as a small card for a few seconds.
 * It reads only; it owns no polling timer: it recomputes when the simulator, the store or a setting reports a change, at most
 * every couple of seconds, and the one timer it uses is the short life of a peek. Motion is a one-shot transform and opacity. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, N = C.market.notch, doc = root.document;
  var ROTATE_MS = 7000, SNAPSHOT_MS = 2400, SNOOZE_MS = 3600000, PEEK_MS = 6500;

  var pills = [], layer = null, floating = null, pop = null, panelBox = null, panelScope = null, popAnchor = null;
  var snap = null, snapAt = 0, result = null, shown = null, rot = { id: null, at: 0 }, seenLoud = null, filter = 'all';
  var hold = 0, peek = null, wired = false, headerPill = null, sigLast = '';

  function realm() { return store.session.realm; }
  function settings() { return C.settings; }
  function fx(n) { return ui.fmt.exact(Math.round(n)); }
  function worldReady() { try { return !!(C.marketSim && C.marketSim.runtime && C.marketSim.runtime.world); } catch (error) { return false; } }
  function usable(r) { return r === 'simulation' ? !!C.market.api.simulationLive && worldReady() : !!ui.sim.live('global'); }
  function cat(id) { return N.byId[id]; }
  function mineItem(it) { var c = cat(it.cat); return c && c.bucket === 'mine' && !c.ambient || it.id.indexOf('order:') === 0; }

  // ---- the snapshot: everything the feed reads, gathered once every couple of seconds ----------------------------------------------
  function gather() {
    var r = realm(), api = C.market.api, out = { realm: r, live: false, clock: '', clockState: 'idle', clockWord: '', wallet: { balance: 0, held: 0, available: 0 }, worth: null,
      bids: [], mine: [], orders: [], offers: [], notices: [], moves: [], news: [], progress: null, sales: [], movers: [], matches: [], rare: [] };
    if (!usable(r)) {
      if (r === 'global') { var g0 = api.statusSync('global'); out.clock = g0.connected ? 'Online' : (g0.label || 'Players'); out.clockWord = 'Players'; out.clockState = 'idle'; }
      return out;
    }
    out.live = true;
    var read = {}; store.prefs.notificationsRead.forEach(function (id) { read[id] = true; });
    var act; try { act = api.activitySync(r); } catch (error) { act = { bids: [], mine: [], orders: [], offers: [], notifications: [] }; }
    var allow = settings().get('marketNotifyTrades') !== false;
    out.bids = act.bids || []; out.mine = act.mine || []; out.orders = act.orders || []; out.offers = act.offers || [];
    out.notices = (allow ? (act.notifications || []) : []).map(function (n) { var meta = ui.activityMeta[n.kind] || {}; return { id: n.id, kind: n.kind, kindLabel: meta.label || 'Update', glyph: meta.icon, text: n.text, minutesAgo: n.minutesAgo, listingId: n.listingId, read: !!read[n.id] || !!n.read }; });
    var w = api.walletSync(r);
    out.wallet = { balance: w.balance || 0, held: w.held || 0, available: w.available != null ? w.available : Math.max(0, (w.balance || 0) - (w.held || 0)) };
    if (r === 'simulation') {
      var st = api.statusSync('simulation'), prov = C.market.sim.provider;
      out.clock = st.clock || 'Day 1'; out.clockState = st.exists ? (st.paused ? 'paused' : st.clockState === 'running' ? 'running' : 'frozen') : 'idle';
      out.clockWord = !st.exists ? 'Not started' : st.paused ? 'Paused' : st.clockState === 'running' ? 'Running' : 'Frozen';
      try {
        var home = prov.home(), nw = home.netWorth, world = C.marketSim.runtime.world, day = Math.floor((world.now - world.epoch) / 86400000), n = store.notchState();
        if (n.day !== day || n.open == null) store.setNotchDay(day, nw.now);
        out.worth = { now: nw.now, credits: nw.credits, cards: nw.cards, start: nw.start, history: nw.history, dayChange: nw.now - (store.notchState().open != null ? store.notchState().open : nw.now) };
        out.moves = home.moves; out.news = home.news; out.progress = home.progress;
        var extra = prov.notch(store.prefs.watch, store.prefs.alerts);
        out.sales = extra.sales; out.movers = extra.movers; out.matches = extra.matches; out.rare = extra.rare;
      } catch (error) { if (root.console) root.console.error('Notch could not read the market', error); }
    } else {
      out.clock = 'Online'; out.clockState = 'running'; out.clockWord = 'Players';
      try { var pf = api.portfolioSync('global'); if (pf && pf.total != null) out.worth = { now: pf.total + out.wallet.balance, credits: out.wallet.balance, cards: pf.total, start: null, history: [], dayChange: null }; } catch (error) { /* optional */ }
    }
    return out;
  }
  function settingsConfig() {
    var s = settings(), n = store.notchState(), data = C.market.api.data(), owned = C.market.api.playerState().owned || {};
    return { order: N.normalizeOrder(s.get('marketNotchOrder')), hidden: N.normalizeHidden(s.get('marketNotchHidden')), mode: s.get('marketNotchMode'), pins: n.pins, snooze: n.snooze, now: Date.now(),
      name: function (id) { var c = data.cardById[id]; return c ? ui.identity(c, !!owned[id]).name : 'Card'; },
      rarity: function (id) { var c = data.cardById[id], r = c && C.rarity(c.rarity); return r ? { id: r.id, tier: r.tier, name: r.name } : null; } };
  }
  function rebuild() { result = N.build(snap, settingsConfig()); return result; }
  function recompute(force) {
    var t = Date.now();
    if (force || !snap || t - snapAt >= SNAPSHOT_MS) { try { snap = gather(); } catch (error) { if (root.console) root.console.error('Notch', error); snap = snap || gather0(); } snapAt = t; }
    rebuild();
  }
  function gather0() { return { realm: realm(), live: false, wallet: { balance: 0, held: 0, available: 0 }, bids: [], mine: [], orders: [], offers: [], notices: [], moves: [], news: [], sales: [], movers: [], matches: [], rare: [] }; }

  // ---- what the pill says now --------------------------------------------------------------------------------------------------------
  function holding() { return hold > 0 || !!pop; }
  function pick() {
    var sp = result.spotlight;
    if (!sp.length) return null;
    var now = Date.now(), idx = Math.max(0, sp.findIndex(function (i) { return i.id === rot.id; }));
    if (settings().get('marketNotchCycle') && sp.length > 1 && !holding() && !ui.motion.still() && rot.id && now - rot.at >= ROTATE_MS) { idx = (idx + 1) % sp.length; rot.at = now; }
    if (rot.id !== sp[idx].id) { rot.id = sp[idx].id; rot.at = now; }
    return sp[idx];
  }
  function modelOf(it) {
    if (!it) return { key: 'none', tone: 'idle', glyph: 'play', label: 'Standard', name: '', more: 0, aria: 'Your market. Open the panel' };
    var time = it.minutes != null && (it.cat === 'ending' || it.cat === 'offer' || it.cat === 'outbid') ? ' · ' + N.duration(it.minutes) : '';
    var others = result.items.filter(function (i) { return !cat(i.cat).ambient; }).length - (cat(it.cat).ambient ? 0 : 1);
    // the key is what the pill is about, not its ticking text: a clock or a countdown changes in place, a new item animates in
    return { key: it.id + ':' + it.tone, tone: it.tone, glyph: it.glyph, label: it.label, name: it.title + time, more: Math.max(0, others), item: it,
      aria: it.label + ': ' + it.title + (others > 0 ? ', and ' + others + ' more' : '') + '. Open the panel' };
  }

  function makePill(kind) {
    var p = { kind: kind, key: null };
    p.glyph = h('span.mk-island-glyph', { 'aria-hidden': 'true' });
    p.label = h('span.mk-island-label'); p.name = h('span.mk-island-name');
    p.more = h('span.mk-island-more', { hidden: true, 'aria-hidden': 'true' });
    p.status = h('span.mk-sr', { role: 'status', 'aria-live': 'polite' });
    p.el = h('button.mk-island', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', data: { tone: 'idle', kind: kind } }, p.glyph, h('span.mk-island-text', p.label, p.name), p.more, p.status);
    p.el.addEventListener('click', function () { toggle(p.el); });
    p.el.addEventListener('pointerenter', function () { hold++; }); p.el.addEventListener('pointerleave', function () { hold = Math.max(0, hold - 1); });
    p.el.addEventListener('animationend', function (e) {
      if (e.target !== p.el) return;
      if (e.animationName === 'mk-island-breathe') p.el.classList.remove('is-changed');
      else if (e.animationName === 'mk-island-ping') p.el.classList.remove('is-ping');
    });
    pills.push(p);
    return p;
  }
  function paintPill(p, m, animate, loud) {
    p.el.dataset.tone = m.tone;
    if (p.glyphName !== m.glyph) { ui.clear(p.glyph); p.glyph.appendChild(icon(m.glyph)); p.glyphName = m.glyph; }
    p.glyph.dataset.glyph = m.glyph;
    p.label.textContent = m.label; p.name.textContent = m.name || ''; p.name.hidden = !m.name;
    p.more.hidden = !m.more; p.more.textContent = m.more ? '+' + m.more : '';
    p.el.setAttribute('aria-label', m.aria);
    var it = m.item;
    if (it && it.tier >= 5 && it.rarity) { p.el.style.setProperty('--mk-rgb', ui.rarityRgb(it.rarity)); p.el.style.setProperty('--mk-tier', String(it.tier)); p.el.dataset.tier = String(it.tier); }
    else { p.el.style.removeProperty('--mk-rgb'); p.el.style.removeProperty('--mk-tier'); delete p.el.dataset.tier; }
    if (!animate || ui.motion.still()) return;
    p.el.classList.remove('is-changed'); void p.el.offsetWidth; p.el.classList.add('is-changed');
    if (loud) { p.el.classList.remove('is-ping'); void p.el.offsetWidth; p.el.classList.add('is-ping'); }
  }
  // On the main menu, while the chrome has faded for being idle (or the page is hidden), nothing needs to be read.
  function needed() {
    if (ui.shell && ui.shell.isOpen) return true;
    if (doc.hidden) return false;
    var b = doc.body.classList;
    return !(b.contains('is-idle') || b.contains('is-afk') || b.contains('is-quiet') || b.contains('is-opening'));
  }
  function refresh(force) {
    if (!pills.length) return;
    if (!force && !needed()) return;
    recompute(!!force);
    var it = pick();
    var loudNow = result.loud.map(function (i) { return i.id; });
    if (seenLoud == null) seenLoud = {};
    var fresh = result.loud.filter(function (i) { return !seenLoud[i.id]; });
    var first = shown == null;
    var m = modelOf(it);
    pills.forEach(function (p) {
      // inside the Market the clock has its own chip beside the pill, so the pill moves on to the next thing
      var pit = p.kind === 'header' && it && it.cat === 'clock' ? (result.spotlight.filter(function (x) { return x.cat !== 'clock'; })[0] || it) : it, pm = pit === it ? m : modelOf(pit);
      if (p.key !== pm.key) { var firstPaint = p.key == null; p.key = pm.key; paintPill(p, pm, !firstPaint, !!(pit && pit.loud && fresh.length)); }
      else {
        // same item, new numbers: write only what changed, never rebuild or re-animate (this is what used to flicker every tick)
        if (p.label.textContent !== pm.label) p.label.textContent = pm.label;
        if (p.name.textContent !== (pm.name || '')) { p.name.textContent = pm.name || ''; p.name.hidden = !pm.name; }
        if (p.el.getAttribute('aria-label') !== pm.aria) p.el.setAttribute('aria-label', pm.aria);
      }
      var moreText = pm.more ? '+' + pm.more : '';
      if (p.more.textContent !== moreText) { p.more.textContent = moreText; p.more.hidden = !pm.more; }
      if (ui.notch2 && ui.notch2.decorate) ui.notch2.decorate(p, pit, result);
    });
    if (fresh.length && !first) {
      var top = fresh[0];
      pills.forEach(function (p) { p.status.textContent = top.label + ': ' + top.title; });
      if (floatingVisible() && settings().get('marketNotchPeek') && !pop) showPeek(top);
    }
    loudNow.forEach(function (id) { seenLoud[id] = true; });
    shown = m.key;
    toggleFloating();
    if (pop && panelBox) { if (panelSig() !== sigLast) repaintPanel(); else patchPanel(); }
  }
  // The open panel, when only clocks and countdowns moved: rewrite those few texts where they are.
  function patchPanel() {
    if (!panelBox || !result) return;
    result.items.forEach(function (it) {
      var main = panelBox.querySelector('[data-fk="row:' + String(it.id).replace(/"/g, '') + '"]');
      if (!main) return;
      var line = main.querySelector('.mk-island-line > span:not(.mk-island-tag)');
      if (line && it.line && line.textContent !== it.line) line.textContent = it.line;
      var t = main.querySelector('.mk-island-time > span');
      if (t && it.minutes != null) { var d = N.duration(it.minutes); if (t.textContent !== d) t.textContent = d; }
    });
    var head = panelBox.querySelector('.mk-island-clockhead .mk-num'), st = realm() === 'simulation' ? C.market.api.statusSync('simulation') : null;
    if (head && st && head.textContent !== (st.clock || 'Not started')) head.textContent = st.clock || 'Not started';
    if (ui.notch2 && ui.notch2.patchPanel) ui.notch2.patchPanel(panelBox, result, snap);
  }
  // Times inside a line ("9h 27m ago", "3d 0h") tick on their own; the panel is rebuilt only when the rest of the line changes.
  function stableLine(text) { return String(text || '').replace(/\d+(?:[.,]\d+)?\s?[dhm](?:\s\d+[hm])?(?:\sago)?/g, '#'); }

  // ---- the floating copy, on the main menu ---------------------------------------------------------------------------------------------
  function floatingVisible() { return !!layer && !layer.hidden && !(ui.shell && ui.shell.isOpen); }
  function toggleFloating() {
    if (!layer) return;
    var enabled = settings().get('marketNotch') !== false, on = enabled && usable(realm());
    layer.hidden = !on;
    doc.body.classList.toggle('has-notch', !!on);
  }
  function mountFloating() {
    if (layer) return;
    var parent = C.viewport ? C.viewport.parent(doc.body) : doc.body;
    layer = h('div.mk-notch-layer', { hidden: true });
    floating = makePill('floating');
    layer.appendChild(floating.el);
    parent.appendChild(layer);
    wire();
    refresh(true);
  }
  function showPeek(it) {
    if (!layer || !floating) return;
    dismissPeek();
    var acts = (it.actions || []).slice(0, 2);
    var el = h('div.mk-notch-peek', { role: 'group', 'aria-label': 'Notch update', data: { tone: it.tone } },
      h('span.mk-island-glyph', icon(it.glyph)),
      h('div.mk-notch-peek-copy', h('strong', { text: it.label + ' · ' + it.title }), it.line ? h('span', { text: it.line }) : null),
      h('div.mk-notch-peek-actions'));
    var box = el.querySelector('.mk-notch-peek-actions');
    acts.forEach(function (a) { box.appendChild(quickButton(a, it, floating.el, function () { dismissPeek(); })); });
    box.appendChild(h('button.mk-notch-peek-open', { type: 'button', 'aria-label': 'Open ' + it.title, onClick: function () { dismissPeek(); toggle(floating.el); } }, icon('forward')));
    var x = ui.iconButton('close', 'Dismiss', function () { dismissPeek(); }, { variant: 'ghost' }); x.classList.add('mk-notch-peek-x'); box.appendChild(x);
    layer.appendChild(el);
    peek = { el: el, timer: root.setTimeout(dismissPeek, PEEK_MS), key: function (e) { if (e.key === 'Escape' && !pop) { dismissPeek(); } } };
    doc.addEventListener('keydown', peek.key, true);
    el.addEventListener('pointerenter', function () { if (peek) { root.clearTimeout(peek.timer); peek.timer = 0; } });
    el.addEventListener('pointerleave', function () { if (peek && !peek.timer) peek.timer = root.setTimeout(dismissPeek, 2500); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); dismissPeek(); } });
  }
  function dismissPeek() {
    if (!peek) return;
    var el = peek.el; root.clearTimeout(peek.timer); doc.removeEventListener('keydown', peek.key, true); peek = null;
    if (!el.isConnected) return;
    if (ui.motion.still() || !el.animate) { el.remove(); return; }
    var a = el.animate([{ opacity: 1, transform: 'translate(-50%, 0) scale(1)' }, { opacity: 0, transform: 'translate(-50%, -6px) scale(.96)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = function () { el.remove(); };
  }

  // ---- quick actions: every one opens the usual review ------------------------------------------------------------------------------------
  function cardChip(it) {
    var data = C.market.api.data(), c = data.cardById[it.cardId], owned = !!(C.market.api.playerState().owned || {})[it.cardId], idn = c ? ui.identity(c, owned) : { name: it.title, rarityName: '' };
    return h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName }));
  }
  function runRaise(act, it, anchor) {
    var r = realm(), api = C.market.api, w = api.walletSync(r), extra = act.max - ((it && it.myMax) || 0);
    var avail = w.available != null ? w.available : (w.balance || 0) - (w.held || 0);
    var after = function (res) { var ok = res && res.leading; C.ui.toast(ok ? 'You are leading at ' + fx(res.price) + ' Credits' : 'Bid placed. Another bid is higher for now.'); refresh(true); };
    var run = function (req) { return api.placeBid(r, act.listingId, act.max, req); };
    if (settings().get('marketConfirm') === 'large' && extra < C.data.market.confirmThreshold) {
      Promise.resolve(run(ui.sim.newRequestId())).then(function (res) { if (res && res.ok !== false) after(res); else C.ui.toast((res && res.message) || 'That did not work. Nothing was changed.', null, 'error'); });
      return;
    }
    ui.sim.confirm({ title: 'Raise your bid', eyebrow: 'Notch', card: cardChip(it), anchor: anchor,
      rows: [{ label: 'Your new maximum', node: ui.credits(act.max), strong: true }, { label: 'Right now', value: it.line }, { label: 'Held until it ends', value: fx(act.max) + ' Credits' },
        { label: 'Available after', value: avail - extra >= 0 ? fx(avail - extra) : 'Short by ' + fx(extra - avail) }],
      note: 'Nothing is paid until you win. You pay the least that beats the next bidder, never more than your maximum.',
      confirmLabel: 'Bid up to ' + fx(act.max), icon: 'gavel', run: run, success: after, failure: function () { refresh(true); } });
  }
  function runAction(act, it, anchor) {
    if (!ui.shell.canOpen() && act.kind !== 'raise' && act.kind !== 'move') { C.ui.toast('Finish what you are doing first.'); return; }
    if (act.kind === 'open' && act.go) { ui.go(act.go.name, act.go.params); return; }
    if (act.kind === 'raise') { it.myMax = (snap.bids.find(function (b) { return (b.listingId || b.id) === act.listingId; }) || { auction: {} }).auction.myMax || 0; runRaise(act, it, anchor); return; }
    if (act.kind === 'move' && ui.homeAct) {
      var r = realm(), ctx = { realm: r, api: C.market.api }, env = C.market.api.context(r);
      ui.homeAct(act.move, ctx, env, anchor, function () { refresh(true); });
    }
  }
  function quickButton(act, it, anchor, after) {
    var b = h('button.mk-quick', { type: 'button', data: { kind: act.kind, fk: 'q:' + it.id + ':' + act.id } }, h('span', { text: act.label }), act.detail ? h('span.mk-num', { text: act.detail }) : null);
    b.setAttribute('aria-label', act.label + (act.detail ? ' ' + act.detail : '') + ' for ' + it.title);
    b.addEventListener('click', function (e) { e.stopPropagation(); if (after) after(); var from = anchor || b; if (pop) pop.close(false); runAction(act, it, from.isConnected ? from : doc.activeElement); });
    return b;
  }

  // ---- the panel -----------------------------------------------------------------------------------------------------------------------------
  function bucketOf(it) { var c = cat(it.cat); return c ? c.bucket : 'mine'; }
  function chartFor(history) {
    var NS = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 34'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('mk-notch-spark');
    var vals = history.map(function (x) { return x[1]; }), pts = C.market.core.downsample(vals, 40), min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), span = max - min || 1, d = '';
    pts.forEach(function (v, i) { d += (i ? 'L' : 'M') + ((i / (pts.length - 1)) * 120).toFixed(1) + ' ' + (30 - ((v - min) / span) * 26).toFixed(1); });
    var path = doc.createElementNS(NS, 'path'); path.setAttribute('d', d); path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.dataset.dir = vals[vals.length - 1] >= vals[0] ? 'up' : 'down'; svg.appendChild(path);
    return svg;
  }
  function walletCard() {
    var w = result.wallet, total = Math.max(1, w.balance), worth = snap.worth, box = h('section.mk-notch-wallet', { 'aria-label': 'Credits and value' });
    var left = h('div.mk-notch-spend', h('span.mk-notch-big.mk-num', { text: fx(w.available) }), h('span.mk-notch-sub', { text: w.held ? 'to spend · ' + fx(w.held) + ' held by bids and orders' : 'to spend' }));
    var bar = h('div.mk-notch-bar', { role: 'img', 'aria-label': fx(w.available) + ' free and ' + fx(w.held) + ' held of ' + fx(w.balance) + ' Credits' },
      h('i', { data: { part: 'free' }, style: { flexGrow: String(Math.max(0, w.available) / total) } }), h('i', { data: { part: 'held' }, style: { flexGrow: String(Math.max(0, w.held) / total) } }));
    box.append(left, bar);
    if (worth) {
      var diff = worth.dayChange, row = h('div.mk-notch-worth', h('div', h('span.mk-notch-sub', { text: 'Net worth' }), h('span.mk-num.mk-notch-nw', { text: fx(worth.now) })));
      if (diff) row.appendChild(h('span.mk-notch-delta', { data: { dir: diff > 0 ? 'up' : 'down' } }, icon(diff > 0 ? 'up' : 'down'), h('span.mk-num', { text: fx(Math.abs(diff)) }), h('span', { text: worth.dayChange != null ? 'today' : '' })));
      if (worth.history && worth.history.length >= 3) row.appendChild(chartFor(worth.history));
      box.appendChild(row);
    }
    return box;
  }
  function row(item, thumbs, env, close, i, opts) {
    opts = opts || {};
    var card = h('article.mk-island-row', { data: { tone: item.tone, cat: item.cat, tier: item.tier != null ? String(item.tier) : '' }, style: { '--mk-i': Math.min(i, 6) } });
    if (item.rarity) { card.style.setProperty('--mk-rgb', ui.rarityRgb(item.rarity)); card.style.setProperty('--mk-tier', String(item.tier)); }
    var main = h('button.mk-island-main', { type: 'button', data: { fk: 'row:' + item.id } });
    var art = h('span.mk-island-art');
    var c = item.cardId && env.cardById[item.cardId];
    if (c) art.appendChild(thumbs.mount(c, { instanceId: 'island-' + item.id, cardId: item.cardId, serial: item.serial || 'CBL-0000-000000', variantId: item.variantId, cardSkinId: null, seen: true }, { owned: !!env.owned[item.cardId] }));
    else art.appendChild(h('span.mk-island-art-glyph', icon(item.glyph || 'check')));
    art.appendChild(h('span.mk-island-badge', icon(item.glyph || cat(item.cat).icon)));
    main.appendChild(art);
    main.appendChild(h('span.mk-island-copy', h('strong', { text: item.title }), h('span.mk-island-line', h('span.mk-island-tag', { text: item.label }), item.line ? h('span', { text: item.line }) : null)));
    if (item.minutes != null) main.appendChild(h('span.mk-island-time.mk-num', icon('clock'), h('span', { text: N.duration(item.minutes) })));
    main.appendChild(icon('forward', 'mk-island-go'));
    main.addEventListener('click', function () { if (!item.go) return; close(); ui.go(item.go.name, item.go.params); });
    card.appendChild(main);
    if (item.actions && item.actions.length) {
      var q = h('div.mk-island-quick');
      if (item.actions.some(function (a) { return a.kind === 'raise'; })) q.appendChild(h('span.mk-island-quick-label', { text: 'Bid higher' }));
      item.actions.forEach(function (a) { q.appendChild(quickButton(a, item, null, null)); });
      card.appendChild(q);
    }
    if (opts.tools) {
      var tools = h('div.mk-island-tools');
      var pinned = !!store.notchState().pins[item.id];
      var pin = ui.iconButton('bookmark', pinned ? 'Unpin ' + item.title : 'Pin ' + item.title, function () { store.pinNotch(item.id); refresh(true); }, { variant: 'ghost' });
      pin.setAttribute('aria-pressed', String(pinned)); pin.classList.add('mk-island-pin'); pin.dataset.fk = 'pin:' + item.id;
      var nope = ui.iconButton('close', 'Hide ' + item.title + ' for an hour', function () { store.snoozeNotch(item.id, SNOOZE_MS); refresh(true); }, { variant: 'ghost' });
      nope.dataset.fk = 'hide:' + item.id; tools.append(pin, nope); card.appendChild(tools);
    }
    return card;
  }
  function fillList(list, items, thumbs, env, close, max, opts) {
    items.slice(0, max || items.length).forEach(function (item, i) { list.appendChild(row(item, thumbs, env, close, i, opts)); });
    if (max && items.length > max) list.appendChild(h('p.mk-island-more-note', { text: 'And ' + (items.length - max) + ' more in Activity.' }));
    return list;
  }
  function envNow() { var d = C.market.api.data(); return { cardById: d.cardById, owned: C.market.api.playerState().owned || {} }; }
  var SPEED_ICON = { calm: 'slow', standard: 'play', brisk: 'fast', fast: 'zap' };
  function clockControls(close) {
    var rt = C.marketSim && C.marketSim.runtime, st = C.market.api.statusSync('simulation'), cfg = C.data.marketSim;
    var box = h('div.mk-island-clock');
    var hr = /(\d{1,2}):/.exec(st.clock || ''), night = hr && (Number(hr[1]) < 6 || Number(hr[1]) >= 20);
    box.appendChild(h('div.mk-island-clockhead', h('span.mk-island-daypart', { data: { night: night ? 'true' : '' } }, icon(night ? 'moon' : 'sun')), h('span.mk-num', { text: st.clock || 'Not started' }), h('span.mk-island-word', { text: !st.exists ? 'Not started' : st.paused ? 'Paused' : st.clockState === 'running' ? 'Running' : 'Frozen' })));
    var line = h('div.mk-island-clockrow');
    var pause = ui.button(st.paused ? 'Resume' : 'Pause', { icon: st.paused ? 'play' : 'pause', variant: st.paused ? 'primary' : 'secondary', size: 'sm', disabled: !st.exists });
    pause.addEventListener('click', function () { if (!rt) return; if (rt.paused) rt.resume(); else rt.pause(); ui.sim.refresh(); refresh(true); });
    var speed = ui.segmented({ label: 'Speed', value: st.speed, onChange: function (v) { if (rt) rt.setSpeed(v); ui.sim.refresh(); refresh(true); }, options: cfg.speeds.map(function (s) { return { value: s.id, label: s.label, title: s.note, icon: SPEED_ICON[s.id] }; }) });
    line.append(pause, speed); box.appendChild(line);
    box.appendChild(h('p.mk-island-note', { text: 'Time stops when the game is closed, hidden or paused.' }));
    return box;
  }
  // What the open panel shows, without the clocks that tick: when this is unchanged the panel is left alone, so focus and hover stay put.
  function panelSig() {
    if (!result) return '';
    var w = result.wallet, nw = snap && snap.worth;
    return JSON.stringify([filter, realm(), Math.round(w.available), Math.round(w.held), nw ? Math.round(nw.now) : 0, nw ? Math.round(nw.dayChange || 0) : 0, result.items.filter(function (i) { return !cat(i.cat).ambient; }).map(function (i) { return [i.id, i.label, stableLine(i.line), i.pinned ? 1 : 0, (i.actions || []).map(function (a) { return a.id; })]; })]);
  }
  function repaintPanel() {
    var keep = doc.activeElement && doc.activeElement.dataset ? doc.activeElement.dataset.fk : null;
    paintPanel(panelBox, function () { if (pop) pop.close(); });
    var again = keep ? panelBox.querySelector('[data-fk="' + keep.replace(/"/g, '') + '"]') : null;
    if (again) again.focus({ preventScroll: true });
    // what had focus was removed (an item hidden): keep the focus inside the panel so Escape and Tab still work
    else if (!panelBox.contains(doc.activeElement)) { panelBox.tabIndex = -1; panelBox.focus({ preventScroll: true }); }
  }
  function paintPanel(box, close) {
    sigLast = panelSig();
    if (panelScope) panelScope.destroy();
    panelScope = ui.createScope();
    ui.clear(box);
    var r = realm(), env = envNow(), usableNow = usable(r), counts = result.counts;
    var sum = []; if (counts.bids) sum.push(counts.bids + (counts.bids === 1 ? ' bid' : ' bids')); if (counts.offers) sum.push(counts.offers + (counts.offers === 1 ? ' offer' : ' offers')); if (counts.listings) sum.push(counts.listings + (counts.listings === 1 ? ' listing' : ' listings')); if (counts.orders) sum.push(counts.orders + (counts.orders === 1 ? ' order' : ' orders'));
    var anchorEl = popAnchor, gear = ui.iconButton('sliders', 'Customize the notch', function () { close(); if (ui.notchSettings) ui.notchSettings.open(anchorEl); }, { variant: 'ghost' }); gear.dataset.fk = 'gear';
    box.appendChild(h('div.mk-island-head', h('div', h('h2', h('span.mk-island-head-icon', icon('market')), h('span', { text: 'Your market' })), h('span.mk-island-sum', { text: sum.join(' · ') || (usableNow ? 'Nothing open' : '') })), gear));
    if (!usableNow) {
      var g = C.market.api.statusSync('global');
      box.appendChild(h('p.mk-island-empty', { text: r === 'global' ? (g.label === 'Not connected' ? 'Players is not connected.' : g.label + '.') : 'Open the Market once to start Standard.' }));
      var acts = h('div.mk-island-actions');
      if (r === 'global' && g.label === 'Not connected' && ui.online) acts.appendChild(ui.button('Connect', { variant: 'primary', icon: 'user', size: 'sm', onClick: function () { close(); ui.online.connectDialog(); } }));
      else if (r === 'global' && g.label !== 'Not available') acts.appendChild(ui.button('Try again', { variant: 'secondary', icon: 'forward', size: 'sm', onClick: function () { C.market.online.refresh(true); } }));
      if (r === 'global') acts.appendChild(ui.button('Open Standard', { variant: 'ghost', size: 'sm', onClick: function () { close(); store.setRealm('simulation'); } }));
      else acts.appendChild(ui.button('Open the Market', { variant: 'primary', size: 'sm', onClick: function () { close(); C.market.open(); } }));
      box.appendChild(acts);
      return;
    }
    box.appendChild(walletCard());
    // filters: the player's four groups, with how many each holds
    var items = result.items.filter(function (it) { return !cat(it.cat).ambient; });
    var tabs = h('div.mk-notch-filters', { role: 'group', 'aria-label': 'Show' });
    [{ id: 'all', label: 'All' }].concat(N.BUCKETS).forEach(function (b) {
      var n = b.id === 'all' ? items.length : items.filter(function (it) { return bucketOf(it) === b.id; }).length;
      if (b.id !== 'all' && !n) return;
      var chip = h('button.mk-notch-chip', { type: 'button', data: { fk: 'chip:' + b.id }, 'aria-pressed': String(filter === b.id) }, h('span', { text: b.label }), h('span.mk-num', { text: String(n) }));
      chip.addEventListener('click', function () { filter = b.id; repaintPanel(); });
      tabs.appendChild(chip);
    });
    if (items.length) box.appendChild(tabs);
    var shown = filter === 'all' ? items : items.filter(function (it) { return bucketOf(it) === filter; });
    if (filter !== 'all' && !shown.length) filter = 'all';
    if (!shown.length) box.appendChild(h('div.mk-island-empty', h('span.mk-island-empty-mark', icon('swap')), h('span', { text: 'Nothing here right now' })));
    else {
      var list = h('div.mk-island-list'), thumbs = ui.thumbs(list, panelScope), last = null, i = 0;
      shown.forEach(function (it) {
        var key = it.pinned ? 'pinned' : it.cat;
        if (key !== last) { last = key; list.appendChild(h('div.mk-notch-group', icon(it.pinned ? 'bookmark' : cat(it.cat).icon), h('span', { text: it.pinned ? 'Pinned' : cat(it.cat).label }))); }
        list.appendChild(row(it, thumbs, env, close, i++, { tools: true }));
      });
      box.appendChild(list);
    }
    if (r === 'simulation') box.appendChild(clockControls(close));
    var foot = h('div.mk-island-foot');
    foot.appendChild(ui.button('Activity', { variant: 'ghost', size: 'sm', icon: 'activity', onClick: function () { close(); ui.go('activity', {}); } }));
    foot.appendChild(ui.button('My listings', { variant: 'ghost', size: 'sm', icon: 'layers', onClick: function () { close(); ui.go('my-listings', {}); } }));
    foot.appendChild(ui.button('Market', { variant: 'ghost', size: 'sm', icon: 'market', onClick: function () { close(); C.market.open(); } }));
    box.appendChild(foot);
  }
  function toggle(anchor) {
    if (pop) { var same = popAnchor === anchor; pop.close(); if (same) return; }
    dismissPeek();
    if (realm() === 'simulation' && worldReady() === false && ui.shell.isOpen && C.marketSim) { try { C.marketSim.ensure(true); } catch (error) { /* the panel still opens */ } }
    popAnchor = anchor;
    var floatingAnchor = floating && anchor === floating.el;
    // Escape closes it from wherever the focus is
    var onEsc = function (e) { if (e.key === 'Escape' && pop && !(ui.sim && C.ui.modal)) { e.preventDefault(); e.stopPropagation(); pop.close(); } };
    doc.addEventListener('keydown', onEsc, true);
    recompute(true);
    pop = ui.popover(anchor, function (close) {
      panelBox = h('div.mk-island-panel');
      paintPanel(panelBox, close);
      return panelBox;
    }, { label: 'Your market', align: 'center', className: 'mk-island-pop', host: floatingAnchor ? layer : null,
      onClose: function () { doc.removeEventListener('keydown', onEsc, true); pop = null; panelBox = null; popAnchor = null; anchor.setAttribute('aria-expanded', 'false'); if (panelScope) { panelScope.destroy(); panelScope = null; } } });
  }

  // ---- the header copy, and the pieces that keep both copies current ---------------------------------------------------------------------------
  function build() {
    var p = headerPill = makePill('header');
    wire();
    shown = null; refresh(true);
    return p.el;
  }
  function wire() {
    if (wired) return; wired = true;
    var last = 0, queued = 0;
    function soon(force) {
      var t = Date.now();
      if (force || t - last >= 1000) { last = t; refresh(!!force); return; }
      if (!queued) queued = root.setTimeout(function () { queued = 0; last = Date.now(); refresh(false); }, 1000 - (t - last));
    }
    if (C.marketSim && C.marketSim.runtime && C.marketSim.runtime.subscribe) C.marketSim.runtime.subscribe(function () { if (!doc.hidden) soon(false); });
    store.subscribe(function (what) { if (['realm', 'watch', 'alerts', 'notifications', 'online', 'notch', 'cleared'].indexOf(what) >= 0) soon(true); });
    C.events.on('market:settled', function () { soon(true); });
    C.events.on('market:open', function () { toggleFloating(); dismissPeek(); soon(true); });
    C.events.on('market:close', function () { soon(true); });
    C.events.on('currency:changed', function () { soon(false); });
    C.settings.onChange('*', function (_, key) { if (typeof key === 'string' && key.indexOf('marketNotch') === 0) soon(true); });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) soon(true); });
  }
  // The list on Home: the trades part of the feed, in the same rows.
  function collect() {
    if (!snap) recompute(true); else rebuild();
    var items = result.items.filter(mineItem);
    return { realm: realm(), items: items, counts: result.counts };
  }
  function summary(c) {
    var p = [], k = c.counts;
    if (k.bids) p.push(k.bids + (k.bids === 1 ? ' bid' : ' bids')); if (k.offers) p.push(k.offers + (k.offers === 1 ? ' offer' : ' offers'));
    if (k.listings) p.push(k.listings + (k.listings === 1 ? ' listing' : ' listings')); if (k.orders) p.push(k.orders + (k.orders === 1 ? ' order' : ' orders'));
    return p.join(' · ');
  }
  function boot() { mountFloating(); }

  ui.island = { build: build, refresh: refresh, collect: collect, summary: summary, fillList: fillList, env: envNow, toggle: toggle, mountFloating: mountFloating, boot: boot,
    get result() { return result; }, get snapshot() { return snap; }, get el() { return headerPill ? headerPill.el : null; }, get visibleEl() { return ui.shell && ui.shell.isOpen && headerPill ? headerPill.el : (floating ? floating.el : null); }, get floating() { return floating ? floating.el : null; }, get panelOpen() { return !!pop; } };
})(window.Cardable = window.Cardable || {}, window);
