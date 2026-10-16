/* Cardable Market — the shell: overlay, header, navigation, router, entry points.
 * Pages register with ui.pages.register(name, { nav, title(params), mount(ctx) }) and never touch the header.
 * Back, Escape and the browser-style history all go through this one router so context is preserved. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, doc = root.document;
  var cfg = function () { return C.data.market; };

  // Five sections are always in view; everything else is one tap away under More. Home is the Simulation's front page.
  var TABS = [
    { id: 'home', label: 'Home', icon: 'home', key: '1', primary: true, sim: true },
    { id: 'discover', label: 'Browse', icon: 'search', key: '2', primary: true }, { id: 'auctions', label: 'Auctions', icon: 'gavel', key: '3', primary: true },
    { id: 'portfolio', label: 'Portfolio', icon: 'wallet', key: '4', primary: true }, { id: 'stocks', label: 'Prices', icon: 'trend', key: '5', primary: true },
    { id: 'buy-now', label: 'Buy Now', icon: 'tag', key: '6' }, { id: 'trades', label: 'Trades', icon: 'swap', key: '7' },
    { id: 'activity', label: 'Activity', icon: 'activity', key: '8' }
  ];
  var UTILITIES = [
    { id: 'watchlist', label: 'Watchlist', icon: 'bookmark' }, { id: 'alerts', label: 'Alerts', icon: 'bell' }
  ];
  var MORE = [['buy-now', 'Buy Now', 'tag'], ['trades', 'Trades', 'swap'], ['activity', 'Activity', 'activity'], ['compare', 'Compare', 'cards'], ['my-listings', 'My listings', 'layers'],
    ['settings', 'Market settings', 'sliders'], ['help', 'Help & feedback', 'info'], ['guide', 'Market guide', 'book']];
  var pages = {};
  ui.pages = { register: function (name, def) { pages[name] = def; }, get: function (name) { return pages[name]; } };
  ui.TABS = TABS;

  var inkReady = false, tabsEl, tabInk, el, frame, scroller, headerEl, navEl, tabButtons = {}, utilButtons = {}, liveRegion, searchInput, walletEl, realmSwitch, bottomBar, moreButton, moreButtonTop, noticeHost, simChip;
  var PRIMARY = TABS.filter(function (t) { return t.primary; }).map(function (t) { return t.id; });
  var opened = false, stack = [], current = null, pageScope = null, savedFocus = null, inertRecords = [], mounting = false, suggestPop = null;
  var returnFocusKey = null;

  function layers() { return C.viewport ? C.viewport.layers() : Array.from(doc.body.children); }
  function canOpen() {
    if (C.setup && C.setup.loading) return false;
    if (C.opening && C.opening.phase !== 'idle') return false;
    if (C.studio && C.studio.active) return false;
    if (C.tutorial && C.tutorial.active) return false;
    if (C.state && C.state.recovery && C.state.recovery.pending) return false;
    return true;
  }

  // ---- router ----
  function routeKey(entry) { return entry.name + ':' + JSON.stringify(entry.params || {}); }
  function navFor(entry) {
    var p = pages[entry.name];
    if (p && p.nav) return typeof p.nav === 'function' ? p.nav(entry.params) : p.nav;
    return entry.from || 'discover';
  }
  function go(name, params, options) {
    options = options || {};
    if (!pages[name]) { console.error('Market page missing: ' + name); return; }
    if (!opened) { open({ name: name, params: params }); return; }
    var entry = { name: name, params: params || {}, from: current && navFor(current) };
    if (current) {
      store.session.scroll[routeKey(current)] = scroller.scrollTop;
      if (options.focusKey) returnFocusKey = options.focusKey;
    }
    if (options.reset) stack = [entry]; else if (options.replace) stack[stack.length - 1] = entry; else stack.push(entry);
    mount(entry, { forward: true });
  }
  function goTab(id) { go(id, {}, { reset: true }); }
  function back() {
    if (stack.length > 1) {
      stack.pop();
      mount(stack[stack.length - 1], { forward: false });
      return true;
    }
    close();
    return false;
  }
  function frameRealm() { return store.session.realm; }

  function envFor(realm) {
    var d = C.market.api.data(), ctx = C.market.api.context(realm);
    return { data: d, cards: ctx.cards, rarities: ctx.rarities, variants: ctx.variants, variantOrder: ctx.variantOrder, owned: ctx.owned, wishlist: ctx.wishlist, budget: ctx.budget, ctx: ctx };
  }

  function mount(entry, flags) {
    flags = flags || {};
    var page = pages[entry.name];
    if (!page) return;
    if (pageScope) { pageScope.destroy(); pageScope = null; }
    current = entry;
    ui.clear(scroller);
    // A page that needs the server's answer first (Global) shows a designed loading state, then draws itself once.
    if (!flags.prefetched && C.market.api.prefetch) {
      var wait = null;
      try { wait = C.market.api.prefetch(frameRealm(), entry.name, entry.params || {}); } catch (_) { wait = null; }
      if (wait && typeof wait.then === 'function') {
        var loading = h('div.mk-page', { data: { page: entry.name, enter: 'forward' } }, ui.emptyState({ kind: 'loading', icon: 'clock', title: 'Loading from Global Market', body: 'Reading the latest from the server.' }));
        scroller.appendChild(loading);
        var again = function () { if (current === entry && opened) mount(entry, Object.assign({}, flags, { prefetched: true })); };
        wait.then(again, again);
        return;
      }
    }
    var host = h('div.mk-page', { data: { page: entry.name, enter: flags.forward === false ? 'back' : 'forward' } });
    scroller.appendChild(host);
    pageScope = ui.createScope();
    var restored = false;
    var key = routeKey(entry);
    var shellApi = {
      host: host, params: entry.params || {}, scope: pageScope, realm: frameRealm(), api: C.market.api, store: store, shell: api,
      scroller: scroller, env: function () { return envFor(frameRealm()); },
      thumbs: ui.thumbs(scroller, pageScope),
      title: function (text) { setTitle(text); },
      restoreScroll: function () {
        if (restored) return; restored = true;
        var top = store.session.scroll[key];
        scroller.scrollTop = top || 0;
        if (returnFocusKey && flags.forward === false) {
          var target = host.querySelector('[data-id="' + returnFocusKey.replace(/"/g, '') + '"] .mk-tile-open, [data-id="' + returnFocusKey.replace(/"/g, '') + '"] .mk-tile-open') ;
          if (target) target.focus({ preventScroll: true });
          returnFocusKey = null;
        }
      },
      isCurrent: function () { return current === entry && opened; }
    };
    try {
      var result = page.mount(shellApi);
      if (result && typeof result.destroy === 'function') pageScope.add(result.destroy);
    } catch (error) {
      console.error('Market page failed to render', error);
      ui.clear(host);
      host.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', role: 'alert', title: 'This page could not be shown',
        body: 'Something went wrong while building it. Your collection and Credits are untouched.',
        actions: [{ label: 'Back to Discover', variant: 'primary', run: function () { goTab('discover'); } }] }));
    }
    if (!page.async) shellApi.restoreScroll();
    setTitle(page.title ? page.title(entry.params || {}) : entry.name);
    updateChrome();
    if (flags.forward !== false) {
      var heading = host.querySelector('h1');
      if (heading) { heading.tabIndex = -1; if (opened && flags.focus !== false) heading.focus({ preventScroll: true }); }
    }
  }
  function setTitle(text) {
    if (!liveRegion) return;
    var def = ui.realmDef(frameRealm());
    liveRegion.textContent = text + ', ' + def.label;
  }

  // ---- chrome ----
  function unreadCount() {
    var api = C.market.api.activitySync(frameRealm()), prefs = store.prefs, read = {};
    prefs.notificationsRead.forEach(function (id) { read[id] = true; });
    var allowed = { bids: C.settings.get('marketNotifyBids'), trades: C.settings.get('marketNotifyTrades'), watch: C.settings.get('marketNotifyWatch') };
    return api.notifications.filter(function (n) { var m = ui.activityMeta[n.kind]; return m && allowed[m.group] && !read[n.id]; }).length;
  }
  // The underline under the current tab slides from the old tab to the new one (a transform, so it costs no layout while moving).
  function moveInk() {
    if (!tabsEl || !tabInk) return;
    var on = tabsEl.querySelector('.mk-tab[data-active="true"]:not([hidden])');
    // when no tab is current, or the bar is not laid out yet, the tab's own underline (market.css) is the fallback
    if (!on || on.offsetWidth < 30) { tabsEl.dataset.ink = 'off'; tabsEl.style.setProperty('--ink-w', '0'); return; }
    tabsEl.dataset.ink = 'on';
    tabsEl.style.setProperty('--ink-x', (on.offsetLeft + 12) + 'px'); tabsEl.style.setProperty('--ink-w', String(on.offsetWidth - 24));
  }
  function updateChrome() {
    if (!el) return;
    var active = current ? navFor(current) : (frameRealm() === 'simulation' ? 'home' : 'discover');
    if (tabButtons.home) tabButtons.home.hidden = frameRealm() !== 'simulation';
    if (bottomBar) { var bh = bottomBar.querySelector('[data-tab="home"]'); if (bh) bh.hidden = frameRealm() !== 'simulation'; bottomBar.dataset.count = String(bottomBar.querySelectorAll('button:not([hidden])').length); }
    Object.keys(tabButtons).forEach(function (id) {
      var b = tabButtons[id], on = id === active;
      b.setAttribute('aria-current', on ? 'page' : 'false');
      b.dataset.active = String(on);
    });
    Object.keys(utilButtons).forEach(function (id) {
      var b = utilButtons[id], on = current && current.name === id;
      b.setAttribute('aria-current', on ? 'page' : 'false'); b.dataset.active = String(!!on);
    });
    var counts = { watchlist: store.prefs.watch.length, alerts: store.prefs.alerts.length, compare: store.compareList().length };
    Object.keys(counts).forEach(function (id) {
      var badge = utilButtons[id] && utilButtons[id].querySelector('.mk-count');
      if (badge) { badge.textContent = counts[id] ? String(counts[id]) : ''; badge.hidden = !counts[id]; }
    });
    var unread = unreadCount(), ab = moreButtonTop && moreButtonTop.querySelector('.mk-count');
    if (ab) { ab.textContent = unread ? String(unread) : ''; ab.hidden = !unread; }
    if (bottomBar) {
      bottomBar.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.tab === active ? 'page' : 'false'); });
      var moreOn = MORE.some(function (m) { return current && current.name === m[0]; }) && ['home', 'discover', 'auctions', 'portfolio'].indexOf(active) < 0;
      moreButton.setAttribute('aria-current', moreOn ? 'page' : 'false');
    }
    if (moreButtonTop) {
      var onMore = MORE.some(function (m) { return current && current.name === m[0]; }) && PRIMARY.indexOf(active) < 0;
      moreButtonTop.setAttribute('aria-current', onMore ? 'page' : 'false'); moreButtonTop.dataset.active = String(onMore);
    }
    moveInk(); if (!inkReady) { inkReady = true; root.requestAnimationFrame(function () { root.requestAnimationFrame(moveInk); }); if (root.addEventListener) root.addEventListener('resize', function () { if (opened) moveInk(); }, { passive: true }); }
    var wallet = C.market.api.walletSync(frameRealm());
    var priorBalance = walletEl._mkBalance, priorRealm = walletEl._mkRealm;
    ui.clear(walletEl);
    walletEl.appendChild(icon('coin', 'mk-coin'));
    if (wallet.balance == null) walletEl.appendChild(h('span.mk-wallet-off', { text: 'Not connected' }));
    else { var walletNum = h('span.mk-num', { text: ui.fmt.credits(wallet.balance, true) }); walletEl.appendChild(walletNum); }
    var held = wallet.held || 0;
    walletEl.title = wallet.balance == null ? wallet.note : ui.fmt.exact(wallet.balance) + ' Credits' + (held ? ', ' + ui.fmt.exact(held) + ' held by open bids and orders' : '') + '. ' + wallet.note;
    walletEl.setAttribute('aria-label', (wallet.balance == null ? 'Global Market wallet: not connected' : 'Your balance: ' + ui.fmt.exact(wallet.balance) + ' Credits' + (held ? ', ' + ui.fmt.exact(held) + ' held' : '')) + '. Open Portfolio');
    if (held) walletEl.appendChild(h('span.mk-wallet-held', { text: '−' + ui.fmt.credits(held, true) + ' held', 'aria-hidden': 'true' }));
    // The wallet answers a change in your Credits: it pulses, flashes in the direction it moved, and a small badge rises with the amount.
    if (wallet.balance != null && priorBalance != null && priorRealm === frameRealm() && wallet.balance !== priorBalance) {
      var diff = wallet.balance - priorBalance;
      ui.motion.flash(walletEl, diff > 0 ? 'up' : 'down'); ui.motion.pulse(walletEl);
      if (Math.abs(diff) >= 1 && !ui.motion.still()) ui.motion.floatBadge(walletEl, (diff > 0 ? '+' : '\u2212') + ui.fmt.exact(Math.abs(diff)), diff > 0 ? 'up' : 'down');
    }
    walletEl._mkBalance = wallet.balance; walletEl._mkRealm = frameRealm();
    if (simChip) simChip.hidden = frameRealm() !== 'simulation';
    realmSwitch.set(frameRealm());
    // The Simulation needs no standing notice (the realm switch and the clock say where you are); Global keeps its notice about real players.
    ui.clear(noticeHost);
    if (frameRealm() !== 'simulation') noticeHost.appendChild(ui.noticeBar(frameRealm()));
    noticeHost.hidden = frameRealm() === 'simulation';
    el.dataset.realm = frameRealm();
    frame.dataset.mode = C.settings.get('marketMode');
    frame.dataset.density = C.settings.get('marketDensity');
    frame.dataset.reduced = String(!!C.settings.get('marketReducedData'));
  }

  // ---- search with suggestions ----
  function buildSearch() {
    var wrap = h('div.mk-search', { role: 'search' });
    searchInput = h('input.mk-search-input', { type: 'search', placeholder: 'Search cards and sellers', 'aria-label': 'Search the market', autocomplete: 'off', spellcheck: 'false',
      role: 'combobox', 'aria-expanded': 'false', 'aria-autocomplete': 'list', 'aria-controls': 'mk-suggest' });
    wrap.appendChild(icon('search', 'mk-search-icon'));
    wrap.appendChild(searchInput);
    wrap.appendChild(h('kbd.mk-keycap', { text: '/', 'aria-hidden': 'true' }));
    // On a narrow window the field is a search button until it is used: tapping anywhere on it opens it.
    wrap.addEventListener('click', function (e) { if (e.target !== searchInput) searchInput.focus(); });
    var list = h('div.mk-suggest', { id: 'mk-suggest', role: 'listbox', 'aria-label': 'Search suggestions', hidden: true });
    wrap.appendChild(list);
    var active = -1, items = [];
    function hide() { list.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); searchInput.removeAttribute('aria-activedescendant'); active = -1; }
    function setActive(i) {
      active = i;
      items.forEach(function (it, n) { it.el.setAttribute('aria-selected', String(n === i)); });
      if (i >= 0) { searchInput.setAttribute('aria-activedescendant', items[i].el.id); items[i].el.scrollIntoView({ block: 'nearest' }); } else searchInput.removeAttribute('aria-activedescendant');
    }
    function run(q) {
      q = String(q || '').trim();
      // a pasted listing reference opens that listing (an internal page; it is text, not a link)
      var ref = ui.social && ui.social.parseRef ? ui.social.parseRef(q) : null;
      if (ref && frameRealm() === 'global') { hide(); go('listing', { id: ref }); return; }
      store.session.filters = Object.assign(C.market.core.emptyFilters(), store.session.filters || {}, { q: q });
      store.rememberSearch(q);
      hide();
      if (current && current.name === 'discover') { store.emit('filters'); } else goTab('discover');
    }
    function render() {
      var q = searchInput.value.trim();
      ui.clear(list); items = [];
      if (!q) {
        var recents = store.prefs.recentSearches;
        if (recents.length) {
          list.appendChild(h('div.mk-suggest-group', { text: 'Recent' }));
          recents.slice(0, 5).forEach(function (r, i) { add({ label: r, icon: 'clock', run: function () { searchInput.value = r; run(r); } }, i); });
        }
        list.appendChild(h('div.mk-suggest-group', { text: 'Try' }));
        ['rarity:rare', 'price:<50', 'variant:holo', 'format:auction', 'seller:silent'].forEach(function (t) { add({ label: t, icon: 'search', run: function () { searchInput.value = t; run(t); } }, items.length); });
      } else {
        var s = C.market.api.suggestSync(frameRealm(), q);
        if (s.cards.length) list.appendChild(h('div.mk-suggest-group', { text: 'Cards' }));
        s.cards.forEach(function (c, i) { add({ label: ui.identity(c, !!C.market.api.playerState().owned[c.id]).name, sub: ui.identity(c, true).rarityName, icon: 'cards', run: function () { hide(); goTab('discover'); store.session.filters = Object.assign(C.market.core.emptyFilters(), { q: c.name }); store.emit('filters'); } }, i); });
        if (s.listings.length) list.appendChild(h('div.mk-suggest-group', { text: 'Listings' }));
        s.listings.forEach(function (l) {
          var card = C.market.api.data().cardById[l.card.cardId];
          add({ label: ui.identity(card, !!C.market.api.playerState().owned[card.id]).name, sub: ui.formatDef(l.format).short + ' · ' + ui.fmt.credits(C.market.core.currentPrice(l)) + ' Credits', icon: ui.formatDef(l.format).icon, run: function () { hide(); go('listing', { id: l.id }); } }, items.length);
        });
        if (s.sellers.length) list.appendChild(h('div.mk-suggest-group', { text: 'Sellers' }));
        s.sellers.forEach(function (sl) { add({ label: sl.alias, sub: sl.isBot ? sl.personaLabel : sl.sales + ' sales', icon: sl.isBot ? 'layers' : 'user', run: function () { searchInput.value = 'seller:' + sl.alias.split(' ')[0]; run(searchInput.value); } }, items.length); });
        add({ label: 'See all results for “' + q + '”', icon: 'forward', run: function () { run(q); } }, items.length);
      }
      list.hidden = !items.length; searchInput.setAttribute('aria-expanded', String(!!items.length));
    }
    function add(entry, i) {
      var b = h('button.mk-suggest-item', { type: 'button', role: 'option', id: 'mk-suggest-' + i, tabindex: '-1', 'aria-selected': 'false' }, icon(entry.icon), h('span.mk-suggest-label', { text: entry.label }), entry.sub ? h('span.mk-suggest-sub', { text: entry.sub }) : null);
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', entry.run);
      list.appendChild(b); items.push({ el: b, run: entry.run });
    }
    searchInput.addEventListener('input', render);
    searchInput.addEventListener('focus', render);
    searchInput.addEventListener('blur', function () { root.setTimeout(hide, 120); });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) render(); setActive(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(-1, active - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && items[active]) items[active].run(); else run(searchInput.value); }
      else if (e.key === 'Escape') { if (!list.hidden || searchInput.value) { e.preventDefault(); e.stopPropagation(); if (!list.hidden) hide(); else { searchInput.value = ''; if (current && current.name === 'discover') run(''); } } }
    });
    wrap.syncFromFilters = function () {
      var q = store.session.filters && store.session.filters.q || '';
      if (doc.activeElement !== searchInput) searchInput.value = q;
    };
    return wrap;
  }

  // ---- build ----
  function build() {
    if (el) return;
    var parent = C.viewport ? C.viewport.parent(doc.body) : doc.body;
    el = h('div.mk', { hidden: true, data: { realm: 'simulation' } });
    frame = h('section.mk-frame', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Market', tabindex: '-1', data: { mode: 'simple' } });
    el.appendChild(frame);
    liveRegion = h('p.mk-sr', { role: 'status', 'aria-live': 'polite' });
    frame.appendChild(liveRegion);

    // header
    headerEl = h('header.mk-header');
    var brand = h('div.mk-brand', h('span.mk-brand-mark', icon('market')), h('span.mk-brand-name', { text: 'Market' }), h('span.mk-brand-tag', { title: 'Cardable Market Beta ' + cfg().betaVersion + '. Real players, its own Credits, and it can be reset.' }, 'Beta', h('span.mk-brand-ver', { text: ' ' + cfg().betaVersion })));
    var search = buildSearch();
    var end = h('div.mk-header-end');
    walletEl = h('button.mk-wallet', { type: 'button' });
    walletEl.addEventListener('click', function () { goTab('portfolio'); });
    realmSwitch = ui.segmented({ label: 'Realm', value: store.session.realm, onChange: function (v) { store.setRealm(v); },
      options: cfg().realms.map(function (r) { return { value: r.id, label: r.shortLabel, title: r.label + ': ' + r.blurb }; }) });
    realmSwitch.classList.add('mk-realm-switch');
    var closeBtn = ui.iconButton('close', 'Close Market', function () { close(); }, { variant: 'ghost' });
    closeBtn.classList.add('mk-close');
    simChip = ui.sim.statusChip();
    end.append(simChip, walletEl, closeBtn);
    var realmHost = h('div.mk-realm-host', realmSwitch);
    headerEl.append(brand, search, realmHost, end);
    ui.shell.searchField = search;
    frame.appendChild(headerEl);

    // navigation
    navEl = h('nav.mk-nav', { 'aria-label': 'Market sections' });
    var tabs = h('div.mk-tabs'); tabsEl = tabs;
    tabInk = h('span.mk-tab-ink', { 'aria-hidden': 'true' }); tabs.appendChild(tabInk);
    TABS.filter(function (t) { return t.primary; }).forEach(function (t) {
      var b = h('button.mk-tab', { type: 'button', data: { tab: t.id }, 'aria-keyshortcuts': t.key }, icon(t.icon), h('span.mk-tab-label', { text: t.label }), h('span.mk-count', { hidden: true, 'aria-hidden': 'true' }));
      b.addEventListener('click', function () { goTab(t.id); });
      tabs.appendChild(b); tabButtons[t.id] = b;
    });
    var utils = h('div.mk-utils');
    UTILITIES.forEach(function (u) {
      var b = h('button.mk-util', { type: 'button', title: u.label, 'aria-label': u.label }, icon(u.icon), h('span.mk-util-label', { text: u.label }), h('span.mk-count', { hidden: true }));
      b.addEventListener('click', function () { go(u.id, {}, { reset: false, replace: false }); });
      utils.appendChild(b); utilButtons[u.id] = b;
    });
    moreButtonTop = h('button.mk-tab.mk-tab-more', { type: 'button', 'aria-haspopup': 'menu', 'aria-label': 'More Market sections' }, icon('list'), h('span.mk-tab-label', { text: 'More' }), h('span.mk-count', { hidden: true, 'aria-hidden': 'true' }));
    moreButtonTop.addEventListener('click', function () { openMore(moreButtonTop); });
    tabs.appendChild(moreButtonTop);
    navEl.append(tabs, utils);
    frame.appendChild(navEl);
    noticeHost = h('div.mk-notice-host');
    frame.appendChild(noticeHost);
    scroller = h('main.mk-main', { id: 'mk-main', tabindex: '-1' });
    frame.appendChild(scroller);
    if (ui.hover) ui.hover.attach(scroller);

    // phone bottom bar
    bottomBar = h('nav.mk-bottom', { 'aria-label': 'Market sections' });
    [['home', 'Home', 'home'], ['discover', 'Browse', 'search'], ['auctions', 'Auctions', 'gavel'], ['portfolio', 'Portfolio', 'wallet']].forEach(function (t) {
      var b = h('button.mk-bottom-item', { type: 'button', data: { tab: t[0] } }, icon(t[2]), h('span', { text: t[1] }));
      b.addEventListener('click', function () { goTab(t[0]); });
      if (t[0] === 'home') b.hidden = frameRealm() !== 'simulation';
      bottomBar.appendChild(b);
    });
    moreButton = h('button.mk-bottom-item', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, icon('list'), h('span', { text: 'More' }));
    moreButton.addEventListener('click', function () { openMore(moreButton); });
    bottomBar.appendChild(moreButton);
    frame.appendChild(bottomBar);
    parent.appendChild(el);
  }

  function openMore(anchor) {
    ui.popover(anchor, function (close) {
      var box = h('div.mk-more', { role: 'menu' });
      // On a phone the bottom bar has four sections, so Prices, the watchlist and alerts join the list; on a desktop they are already in view.
      var list = anchor === moreButton ? [['stocks', 'Prices', 'trend'], ['watchlist', 'Watchlist', 'bookmark'], ['alerts', 'Alerts', 'bell']].concat(MORE) : MORE;
      list.forEach(function (r) {
        var b = h('button.mk-more-item', { type: 'button', role: 'menuitem' }, icon(r[2]), h('span', { text: r[1] }));
        b.addEventListener('click', function () {
          close();
          if (r[0] === 'guide') { openGuide(anchor); return; }
          if (TABS.some(function (t) { return t.id === r[0]; })) goTab(r[0]); else go(r[0], {});
        });
        box.appendChild(b);
      });
      return box;
    }, { label: 'More market sections', role: 'menu', align: 'end' });
  }

  function openGuide(anchor) {
    store.markGuideSeen();
    var surface = h('section.mk-guide', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Market guide' });
    var inner = h('div.mk-guide-inner');
    inner.appendChild(h('header.mk-guide-head', h('h2', { text: 'How the Market works' }), ui.iconButton('close', 'Close guide', function () { handle.close(); }, { variant: 'ghost' })));
    var intro = h('div.mk-guide-body');
    intro.appendChild(h('p', { text: 'Cardable Market has two realms. They never share balances, histories or valuations.' }));
    var realms = h('div.mk-guide-realms');
    cfg().realms.forEach(function (r) {
      realms.appendChild(h('div.mk-guide-realm', { data: { realm: r.id } }, ui.realmBadge(r.id), h('p', { text: r.blurb })));
    });
    intro.appendChild(realms);
    intro.appendChild(h('p.mk-guide-note', { text: C.market.api.simulationLive
      ? 'The Simulation is a working market on this device. Its traders are bots, its prices come only from trades they and you complete, and its clock stops whenever Cardable is closed, hidden or paused. Global Market is not connected in this build, so it has no listings.'
      : 'In this build every listing, price and trade is invented sample data. You can browse, filter, watch and draft, but nothing is bought, sold or saved to your collection.' }));
    intro.appendChild(h('h3', { text: 'Glossary' }));
    var dl = h('dl.mk-glossary');
    cfg().glossary.forEach(function (g) { dl.appendChild(h('div', h('dt', { text: g.term }), h('dd', { text: g.body }))); });
    intro.appendChild(dl);
    inner.appendChild(intro);
    surface.appendChild(inner);
    var handle = C.ui.present(surface, { anchor: anchor });
  }

  // ---- open / close ----
  function open(route) {
    if (opened) { if (route && route.name) go(route.name, route.params); return true; }
    if (!canOpen()) return false;
    if (C.commands && C.commands.active) C.commands.close();
    if (C.preferences && C.preferences.open) C.preferences.close();
    if (C.contextMenu && C.contextMenu.open) C.contextMenu.close();
    if (store.session.realm === 'simulation' && C.marketSim) { try { C.marketSim.ensure(true); } catch (error) { console.error('Market simulation could not start', error); } }
    if (store.session.realm === 'global' && C.market.onlineData) C.market.onlineData.used();
    build();
    opened = true; savedFocus = doc.activeElement;
    el.hidden = false;
    inertRecords = layers().filter(function (n) { return n !== el && n.tagName !== 'SCRIPT' && n.tagName !== 'LINK'; }).map(function (n) { var r = [n, n.inert]; n.inert = true; return r; });
    doc.body.classList.add('market-open');
    C.accessibility.trap(frame);
    C.events.emit('market:open', {});
    C.events.emit('menu:visibilityHold', { reason: 'market', active: true });
    C.events.emit('qol:context', { active: true });
    if (!stack.length) stack = [{ name: store.session.realm === 'simulation' ? 'home' : 'discover', params: {} }];
    var entry = route && route.name ? { name: route.name, params: route.params || {}, from: route.from } : stack[stack.length - 1];
    if (route && route.name) stack = [entry];
    mount(entry, { forward: true, focus: false });
    // Focus the frame so Escape and Tab work immediately; the page heading takes focus on navigation.
    root.requestAnimationFrame(function () { if (opened) frame.focus({ preventScroll: true }); });
    return true;
  }
  function close() {
    if (!opened) return;
    if (current) store.session.scroll[routeKey(current)] = scroller.scrollTop;
    ui.closeTopPopover && ui.closeTopPopover();
    if (pageScope) { pageScope.destroy(); pageScope = null; }
    ui.clear(scroller);
    opened = false;
    el.hidden = true;
    doc.body.classList.remove('market-open');
    C.accessibility.release(frame);
    inertRecords.forEach(function (r) { r[0].inert = r[1]; }); inertRecords = [];
    C.events.emit('market:close', {});
    C.events.emit('menu:visibilityHold', { reason: 'market', active: false });
    C.events.emit('qol:context', { active: false });
    if (savedFocus && savedFocus.isConnected) savedFocus.focus({ preventScroll: true });
  }

  var api = {
    open: open, close: close, back: back, go: go, goTab: goTab, current: function () { return current; }, canOpen: canOpen,
    get isOpen() { return opened; }, get el() { return el; }, get scroller() { return scroller; }, refresh: updateChrome,
    remount: function () { if (opened && current) { store.session.scroll[routeKey(current)] = scroller.scrollTop; mount(current, { forward: false, focus: false }); } }
  };
  ui.shell = api; ui.go = go;
  C.market.open = open; C.market.close = close;
  Object.defineProperty(C.market, 'isOpen', { get: function () { return opened; } });

  // ---- keyboard ----
  function editing(target) { return !!(target && target.closest && target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')); }
  function onKey(event) {
    if (!opened || event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (C.ui && C.ui.modal) return;
      if (ui.closeTopPopover && ui.hasPopover()) { event.preventDefault(); event.stopImmediatePropagation(); ui.closeTopPopover(); return; }
      var s = doc.activeElement;
      if (s === searchInput) return;
      event.preventDefault(); event.stopImmediatePropagation(); back();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      if (event.altKey && event.key === 'ArrowLeft' && !editing(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); back(); }
      return;
    }
    if (editing(event.target) || C.ui && C.ui.modal) return;
    if (event.key === '/') { event.preventDefault(); event.stopImmediatePropagation(); searchInput.focus(); return; }
    var tab = TABS.find(function (t) { return t.key === event.key && (!t.sim || frameRealm() === 'simulation'); });
    if (tab && !event.repeat) { event.preventDefault(); event.stopImmediatePropagation(); goTab(tab.id); }
  }

  // ---- entry points ----
  function initEntries() {
    var hud = h('button.mk-hud', { type: 'button', 'aria-label': 'Open Market', title: 'Market (M)', 'aria-keyshortcuts': 'M' }, icon('market'));
    hud.addEventListener('click', function () { if (opened) close(); else if (!open()) C.ui.toast('Finish what you are doing, then open the Market.'); });
    (C.viewport ? C.viewport.parent(doc.body) : doc.body).appendChild(hud);
    ui.hud = hud;
    C.commands.register({ id: 'market', label: 'Open Market', group: 'Market', run: function () { open(); } });
    TABS.forEach(function (t) { C.commands.register({ id: 'market:' + t.id, label: 'Market · ' + t.label, group: 'Market', run: function () { open({ name: t.id, params: {} }); } }); });
    C.commands.register({ id: 'market:compose', label: 'Market · List a card', group: 'Market', run: function () { open({ name: 'compose', params: {} }); } });
    C.commands.register({ id: 'market:settings', label: 'Market · Settings', group: 'Market', run: function () { open({ name: 'settings', params: {} }); } });
    if (C.keys && C.keys.register && !C.keys.entries.has('menu.market')) {
      var action = { id: 'menu.market', label: 'Open Market', group: 'Menu', context: 'menu', defaults: ['KeyM'], bridge: false, when: function () { return canOpen(); }, run: function () { if (opened) close(); else open(); } };
      C.data.keyActions.push(action); C.keys.register(action);
    }
    if (C.keys && C.keys.register && !C.keys.entries.has('dialogs.market-search')) {
      var searchAction = { id: 'dialogs.market-search', label: 'Search the Market', group: 'Market', context: 'dialogs', defaults: ['Slash'], bridge: true, when: function () { return opened && !(C.ui && C.ui.modal); } };
      C.data.keyActions.push(searchAction); C.keys.register(searchAction);
    }
    // The card detail's More menu offers the card to the Market composer (the exact copy being inspected).
    if (C.detailActions && C.detailActions.register) {
      C.detailActions.register('market-list', function (host, context) {
        if (!context.entry.owned || context.preview) return;
        var b = h('button.mk-detail-action.cb-action', { type: 'button', text: 'List on Market…' });
        b.addEventListener('click', function () {
          var instance = C.detail && C.detail.view ? C.detail.view.instance : context.entry.instances[0];
          if (context.dismiss) context.dismiss();
          if (!open({ name: 'compose', params: { instanceId: instance && instance.instanceId, cardId: context.entry.card.id }, from: 'portfolio' })) C.ui.toast('Finish what you are doing, then open the Market.');
        });
        host.appendChild(b);
      });
    }
    C.keys.listen(doc, 'keydown', 'market.navigation', onKey, true);
    store.subscribe(function (what) {
      if (!opened) return;
      if (what === 'realm') {
        updateChrome();
        // Home belongs to the Simulation; arriving in Global from it lands on Browse, and the other way round lands on Home.
        if (frameRealm() !== 'simulation' && current && current.name === 'home') { go('discover', {}, { reset: true }); return; }
        mount(current, { forward: false, focus: false });
      }
      else if (what === 'watch' || what === 'alerts' || what === 'notifications' || what === 'cleared' || what === 'compare') updateChrome();
      else if (what === 'online') { updateChrome(); if (frameRealm() === 'global' && current && current.name !== 'settings') mount(current, { forward: false, focus: false }); }
    });
    C.settings.onChange('*', function (_, key) {
      if (!opened || typeof key !== 'string' || key.indexOf('market') !== 0) return;
      updateChrome();
      if (['marketReducedData', 'marketView', 'marketCompactNumbers', 'marketMode', 'marketWindow'].indexOf(key) >= 0 && current && current.name !== 'settings') mount(current, { forward: false, focus: false });
    });
    C.events.on('preferences:context', function (event) { if (opened && event && event.active) close(); });
    // A nested dialog or menu closing clears the shared interface context; the Market is still open, so it asserts again.
    ['ui:close', 'contextmenu:close'].forEach(function (name) {
      C.events.on(name, function () { if (opened) C.events.emit('qol:context', { active: true }); });
    });
    var sync = function () { if (opened) updateChrome(); };
    ['currency:changed', 'save:written'].forEach(function (name) { C.events.on(name, sync); });
    // The simulator's clock and trades reach the open Market through one throttled path.
    var simTimer = 0, simQueued = '';
    function flushSim(kind) {
      if (!opened) return;
      ui.sim.refresh(); updateChrome();
      if (kind === 'reset') { mount(current, { forward: false, focus: false }); return; }
      store.emit('sim');
    }
    function onSim(kind) {
      if (!opened) return;
      if (kind === 'reset') { flushSim('reset'); return; }
      if (simTimer) { simQueued = kind; return; }
      flushSim(kind);
      simTimer = root.setTimeout(function () { simTimer = 0; if (simQueued) { var k = simQueued; simQueued = ''; flushSim(k); } }, 500);
    }
    if (C.marketSim && C.marketSim.runtime) C.marketSim.runtime.subscribe(onSim);
    C.events.on('market:settled', function () { if (opened) { updateChrome(); store.emit('sim'); } });
  }
  C.market.init = function () {
    if (C.market.initialized) return; C.market.initialized = true;
    store.init(); store.session.initialized = true;
    initEntries();
  };
  C.events.on('app:ready', C.market.init);
})(window.Cardable = window.Cardable || {}, window);
