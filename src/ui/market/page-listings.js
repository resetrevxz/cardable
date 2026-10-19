/* Cardable Market — Discover, Auctions, Buy Now and Trades.
 * One listings engine serves all four so filters, sorting, saved views and recovery behave identically.
 * Rendering is cursor-paginated; thumbnails are created near the viewport and released when far away. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };

  var PAGES = {
    discover: { title: 'Browse', icon: 'explore', blurb: '', tabs: true, hero: true, formats: null },
    auctions: { title: 'Auctions', icon: 'gavel', blurb: '', formats: ['auction'], sort: 'ending', auctionControls: true },
    'buy-now': { title: 'Buy Now', icon: 'tag', blurb: '', formats: ['buy-now'], sort: 'recommended' },
    trades: { title: 'Trades', icon: 'swap', blurb: '', formats: ['swap'], sort: 'recommended' }
  };

  function pageState(id) {
    var s = store.session;
    s.pages = s.pages || {};
    if (!s.pages[id]) s.pages[id] = { tab: 'for-you', sort: PAGES[id].sort || 'recommended', filters: K().emptyFilters(), pages: 1, saved: null };
    return s.pages[id];
  }
  // Invented sample listings exist only as a developer aid (?dev=1); in play an unconnected Global Market is simply empty.
  function devMode() { try { return new root.URLSearchParams(root.location.search).get('dev') === '1'; } catch (_) { return false; } }
  function rarityList(env) { return C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).filter(function (r) { return env.data.cards.some(function (c) { return c.rarity === r.id; }); }); }
  function packName(id) { var p = (C.data.packs || []).find(function (x) { return x.id === id; }); return p ? p.name.replace(/ Pack$/, '') : id; }
  function genName(id) { var g = C.data.generations.find(function (x) { return x.id === id; }); return g ? g.name : id; }

  // ---- filter description (chips) ----
  function describe(f, env, remove) {
    var out = [];
    function push(id, label, fn) { out.push({ id: id, label: label, remove: fn }); }
    f.formats.forEach(function (v) { push('format:' + v, ui.formatDef(v).label, function () { remove(function (g) { g.formats = g.formats.filter(function (x) { return x !== v; }); }); }); });
    f.rarities.forEach(function (v) { push('rarity:' + v, (env.rarities[v] || {}).name || v, function () { remove(function (g) { g.rarities = g.rarities.filter(function (x) { return x !== v; }); }); }); });
    f.variants.forEach(function (v) { push('variant:' + v, v === 'normal' ? 'Normal finish' : (env.variants[v] || {}).name || v, function () { remove(function (g) { g.variants = g.variants.filter(function (x) { return x !== v; }); }); }); });
    f.generations.forEach(function (v) { push('gen:' + v, genName(v), function () { remove(function (g) { g.generations = g.generations.filter(function (x) { return x !== v; }); }); }); });
    f.brands.forEach(function (v) { push('brand:' + v, v, function () { remove(function (g) { g.brands = g.brands.filter(function (x) { return x !== v; }); }); }); });
    f.packs.forEach(function (v) { push('pack:' + v, packName(v) + ' pack', function () { remove(function (g) { g.packs = g.packs.filter(function (x) { return x !== v; }); }); }); });
    if (f.auctionStatus) push('auction', { open: 'Open auctions', ending: 'Ending within 2 h', 'reserve-met': 'Reserve met', 'no-bids': 'No bids yet' }[f.auctionStatus], function () { remove(function (g) { g.auctionStatus = ''; }); });
    if (f.withinBudget) push('budget', 'Within my budget', function () { remove(function (g) { g.withinBudget = false; }); });
    if (f.ownership) push('own', { owned: 'Owned', 'not-owned': 'Not owned', wishlist: 'On my wishlist', gap: 'Collection gaps', watching: 'Watching' }[f.ownership], function () { remove(function (g) { g.ownership = ''; }); });
    if (f.price.min != null || f.price.max != null) push('price', 'Price ' + rangeText(f.price, ''), function () { remove(function (g) { g.price = { min: null, max: null }; }); });
    if (f.valueRatio.min != null || f.valueRatio.max != null) push('ratio', 'Value ' + rangeText(f.valueRatio, '%') + ' of Average', function () { remove(function (g) { g.valueRatio = { min: null, max: null }; }); });
    if (f.fairValue.min != null || f.fairValue.max != null) push('fair', 'Average Value ' + rangeText(f.fairValue, ''), function () { remove(function (g) { g.fairValue = { min: null, max: null }; }); });
    if (f.serial.lowOnly) push('lowserial', 'Low serials', function () { remove(function (g) { g.serial.lowOnly = false; }); });
    if (f.serial.min != null || f.serial.max != null) push('serial', 'Serial ' + rangeText(f.serial, ''), function () { remove(function (g) { g.serial.min = g.serial.max = null; }); });
    if (f.listedWithin) push('age', 'Listed within ' + (f.listedWithin === '24' ? '24 h' : f.listedWithin === '72' ? '3 days' : f.listedWithin + ' h'), function () { remove(function (g) { g.listedWithin = ''; }); });
    if (f.minConfidence) push('conf', 'Confidence ' + f.minConfidence + ' or higher', function () { remove(function (g) { g.minConfidence = ''; }); });
    if (f.minSellerRating) push('rating', 'Seller rated ' + Math.round(f.minSellerRating * 100) + '%+', function () { remove(function (g) { g.minSellerRating = 0; }); });
    if (f.variantOnly) push('varonly', 'Special finishes', function () { remove(function (g) { g.variantOnly = false; }); });
    if (f.rarityTierMin != null) push('tier', 'Scarcer rarities', function () { remove(function (g) { g.rarityTierMin = null; }); });
    return out;
  }
  function rangeText(r, unit) {
    if (r.min != null && r.max != null) return r.min + '–' + r.max + unit;
    if (r.min != null) return '≥ ' + r.min + unit;
    return '≤ ' + r.max + unit;
  }

  // ---- small form builders ----
  function section(title, body, options) {
    options = options || {};
    var d = h('details.mk-fsec', { data: { key: options.key || '' } });
    if (options.open !== false) d.open = true;
    d.appendChild(h('summary', h('span', { text: title }), icon('chevron')));
    d.appendChild(h('div.mk-fsec-body', body));
    return d;
  }
  function chipGroup(options, selected, onToggle, label) {
    var wrap = h('div.mk-chipset', { role: 'group', 'aria-label': label });
    var els = {};
    options.forEach(function (o) {
      var b = h('button.mk-pill', { type: 'button', 'aria-pressed': String(selected.indexOf(o.value) >= 0), data: { value: o.value } },
        h('span', { text: o.label }), h('span.mk-pill-count', { text: o.count == null ? '' : String(o.count) }));
      if (o.title) b.title = o.title;
      b.addEventListener('click', function () { onToggle(o.value, b); });
      els[o.value] = b; wrap.appendChild(b);
    });
    wrap.els = els;
    return wrap;
  }
  function rangeFields(label, value, unit, onChange, placeholders) {
    placeholders = placeholders || ['Min', 'Max'];
    var wrap = h('div.mk-range', { role: 'group', 'aria-label': label });
    var min = h('input.mk-input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: placeholders[0], 'aria-label': label + ' minimum', value: value.min == null ? '' : String(value.min) });
    var max = h('input.mk-input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: placeholders[1], 'aria-label': label + ' maximum', value: value.max == null ? '' : String(value.max) });
    var timer;
    function commit() { root.clearTimeout(timer); timer = root.setTimeout(function () { onChange({ min: min.value === '' ? null : Math.max(0, Number(min.value)), max: max.value === '' ? null : Math.max(0, Number(max.value)) }); }, 260); }
    min.addEventListener('input', commit); max.addEventListener('input', commit);
    wrap.append(min, h('span.mk-range-dash', { text: unit ? unit : '–', 'aria-hidden': 'true' }), max);
    wrap.set = function (v) { min.value = v.min == null ? '' : String(v.min); max.value = v.max == null ? '' : String(v.max); };
    return wrap;
  }
  function toggle(label, checked, onChange, hint) {
    var input = h('input', { type: 'checkbox', props: { checked: !!checked } });
    var row = h('label.mk-toggle', input, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: label }), hint ? h('small', { text: hint }) : null));
    input.addEventListener('change', function () { onChange(input.checked); });
    row.input = input;
    return row;
  }
  function selectField(label, options, value, onChange) {
    var s = h('select.mk-select', { 'aria-label': label });
    options.forEach(function (o) { s.appendChild(h('option', { value: o.value, text: o.label, props: { selected: o.value === value } })); });
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }
  ui.form = { section: section, chipGroup: chipGroup, rangeFields: rangeFields, toggle: toggle, selectField: selectField };

  function mountListings(ctx, id) {
    var def = PAGES[id], state = pageState(id), host = ctx.host, scope = ctx.scope, realm = ctx.realm, env = ctx.env();
    var advanced = C.settings.get('marketMode') === 'advanced';
    var view = C.settings.get('marketView');
    var reduced = !!C.settings.get('marketReducedData');
    var pageSize = reduced ? cfg().pageSize.reduced : view === 'terminal' ? cfg().pageSize.terminal : cfg().pageSize.feed;
    if (id === 'discover' && state.tab === 'trades') return mountRecentTrades(ctx, state);
    if (def.formats) state.filters.formats = def.formats.slice();
    if (id === 'discover' && ctx.params.q != null) { state.filters.q = ctx.params.q; }
    if (id === 'discover') state.filters = store.session.filters && store.session.filters !== state.filters ? Object.assign(state.filters, { q: store.session.filters.q }) : state.filters;
    var facets = null, lastTotal = 0, cursor = null, loading = false, token = 0, known = null;

    // ---- page head ----
    var head = h('div.mk-pagehead');
    var titleBlock = h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', { data: { anim: id } }, icon(def.icon)), h('span', { text: def.title })), def.blurb ? h('p', { text: def.blurb }) : null);
    var actions = h('div.mk-pagehead-actions');
    // refresh: shows what changed since you arrived, with the new listings sliding in
    var refreshBtn = ui.iconButton('refresh', 'Refresh listings', function () {
      refreshBtn.classList.remove('is-spin'); void refreshBtn.offsetWidth; refreshBtn.classList.add('is-spin');
      pill.hidden = true; refresh(false, true);
    }, { variant: 'ghost' });
    refreshBtn.classList.add('mk-refresh');
    var viewSwitch = ui.segmented({ label: 'Layout', value: view, onChange: function (v) { C.settings.set('marketView', v); },
      options: [{ value: 'feed', label: 'Feed', icon: 'grid' }, { value: 'terminal', label: 'Terminal', icon: 'list' }] });
    viewSwitch.classList.add('mk-view-switch');
    var modeSwitch = ui.segmented({ label: 'Detail level', value: advanced ? 'advanced' : 'simple', onChange: function (v) { C.settings.set('marketMode', v); },
      options: [{ value: 'simple', label: 'Simple' }, { value: 'advanced', label: 'Advanced' }] });
    modeSwitch.classList.add('mk-mode-switch');
    var sellBtn = ui.button('List a card', { variant: 'primary', icon: 'plus', onClick: function () { ui.go('compose', {}); } });
    actions.append(refreshBtn, viewSwitch, modeSwitch, sellBtn);
    head.append(titleBlock, actions);
    host.appendChild(head);
    // one short tip at a time (hide it for good with its close button)
    if ((id === 'discover' || id === 'auctions') && ui.flourish && ui.flourish.tips) { var tipBox = ui.flourish.tips(scope); if (tipBox) host.appendChild(tipBox); }

    // ---- intro for first visit (Standard is introduced by the guided tour instead of a block of text) ----
    if (!store.prefs.guideSeen && id === 'discover') {
      if (realm === 'global' && ui.sim.live(realm) && ui.online && ui.online.introCard) host.appendChild(ui.online.introCard());
      else if (ui.sim.live(realm)) { /* the tour (tour.js) */ }
      else {
        var intro = h('aside.mk-intro', { role: 'note' },
          h('div', h('strong', { text: 'This is a preview of the Market.' }),
            h('p', { text: 'Two markets: Standard, with traders on this device, and Players, with real players. Everything here is sample data. Nothing is bought, sold or saved.' })),
          ui.button('Got it', { variant: 'secondary', onClick: function () { store.markGuideSeen(); intro.remove(); } }));
        host.appendChild(intro);
      }
    }
    // Global Discover: what is moving, what is busy and what just sold, from completed player sales only. The Simulation
    // appears as one separate line, never as listings or prices.
    if (realm === 'global' && ui.sim.live(realm) && id === 'discover' && C.market.onlineProvider) {
      var strip = h('section.mk-explore', { 'aria-label': 'Moving now' });
      host.appendChild(strip);
      var paintStrip = function () {
        var M = C.market.onlineProvider.movers();
        ui.clear(strip);
        strip.appendChild(h('div.mk-panel-head', h('h3', { text: 'Moving now' }), ui.chip('Completed player sales', { tone: 'soft', title: 'Quick Sell, swaps, offers and bundles never count here.' })));
        if (!M || !M.cardsTraded) {
          strip.appendChild(h('p.mk-hint', { text: M ? 'No two players have completed a sale of a single card in the last two weeks, so nothing is moving yet.' : 'Reading the latest sales.' }));
        } else {
          var cols = h('div.mk-explore-cols');
          [['Greatest change', M.rising.concat(M.falling).sort(function (a, b) { return Math.abs(b.change7d || 0) - Math.abs(a.change7d || 0); }).slice(0, 4), function (x) { return ui.delta(x.change7d, { label: '7 d' }); }],
            ['Trending', M.trending.slice(0, 4), function (x) { return h('span.mk-muted', { text: x.units7 + ' sold in 7 d' }); }],
            ['Highly liquid', M.liquid.slice(0, 4), function (x) { return h('span.mk-muted', { text: x.units7 + ' sold in 7 d' }); }],
            ['Recently sold', M.recentlySold.filter(function (x) { return !x.bundle; }).slice(0, 4), function (x) { return h('span.mk-muted', { text: ui.fmt.exact(x.price) + ' · ' + ui.fmt.age(x.minutesAgo) }); }]
          ].forEach(function (col) {
            var box = h('div.mk-explore-col', h('h4', { text: col[0] }));
            if (!col[1].length) box.appendChild(h('p.mk-hint', { text: 'Not enough sales yet.' }));
            col[1].forEach(function (x) {
              var idn = ui.identity(x.card, !!env.owned[x.card.id]);
              var b = h('button.mk-minirow', { type: 'button' }, h('span.mk-minirow-main', { text: idn.name }), col[2](x));
              b.addEventListener('click', function () { ui.go('card', { id: x.card.id, variant: '' }); });
              box.appendChild(b);
            });
            cols.appendChild(box);
          });
          strip.appendChild(cols);
        }
        strip.appendChild(h('p.mk-hint', { text: 'Want to practise? Standard is a separate, offline market. Its listings never appear here.' }));
      };
      paintStrip();
      scope.add(store.subscribe(function (what) { if (what === 'sim') paintStrip(); }));
      // what real players have just listed and sold, and what the people you follow are doing
      if (ui.social && C.market.onlineProvider && C.market.onlineProvider.social) host.appendChild(ui.social.feedSection(ctx));
    }
    // Simulation realm: a quiet pill when the market changed under the page, so rows never jump while you read.
    var pill = h('button.mk-updates', { type: 'button', hidden: true, 'aria-live': 'polite' });
    pill.addEventListener('click', function () { pill.hidden = true; refresh(false, true); });
    host.appendChild(h('div.mk-updates-row', pill));

    var heroHost = id === 'discover' ? h('div.mk-hero-host') : null;
    if (heroHost) host.appendChild(heroHost);

    // ---- tabs (Discover) ----
    var tabsEl = null;
    if (def.tabs) {
      tabsEl = ui.segmented({ label: 'Discover feeds', role: 'tablist', value: state.tab,
        options: cfg().tabs.map(function (t) { return { value: t.id, label: t.label }; }),
        onChange: function (v) { state.tab = v; state.pages = 1; if (v === 'trades') { ui.shell.remount(); return; } if (v !== 'for-you') state.sort = ''; else if (!state.sort) state.sort = 'recommended'; refresh(true); updateSortSelect(); } });
      tabsEl.classList.add('mk-feed-tabs');
      var tabWrap = h('div.mk-feedbar', tabsEl);
      host.appendChild(tabWrap);
    }

    // ---- toolbar ----
    var toolbar = h('div.mk-controlbar');
    var filterToggle = h('button.mk-button.mk-filter-toggle', { type: 'button', data: { variant: 'secondary' }, 'aria-expanded': String(store.session.filtersOpen), 'aria-controls': 'mk-filters' }, icon('sliders'), h('span', { text: 'Filters' }), h('span.mk-count.is-inline', { hidden: true }));
    var presetRow = h('div.mk-presets', { role: 'group', 'aria-label': 'Quick views' });
    var presets = cfg().presets.filter(function (p) {
      if (def.formats && p.filters.formats && !p.filters.formats.every(function (f) { return def.formats.indexOf(f) >= 0; })) return false;
      // Trades have no price to compare, so price-based quick views do not apply to them.
      if (def.formats && def.formats[0] === 'swap' && (p.id === 'good-value' || p.id === 'budget')) return false;
      return true;
    });
    presets.forEach(function (p) {
      var b = h('button.mk-pill', { type: 'button', 'aria-pressed': 'false', data: { preset: p.id } }, h('span', { text: p.label }));
      b.addEventListener('click', function () { applyPreset(p); });
      presetRow.appendChild(b);
    });
    var sortWrap = h('label.mk-sort', h('span.mk-sort-label', { text: 'Sort' }));
    var sortSelect = h('select.mk-select', { 'aria-label': 'Sort listings' });
    function fillSort() {
      ui.clear(sortSelect);
      cfg().sorts.filter(function (s) { return advanced || ['recommended', 'newest', 'ending', 'value', 'price-asc', 'price-desc', 'bids', 'rarity'].indexOf(s.id) >= 0; })
        .filter(function (s) { return def.formats ? !(s.id === 'bids' && def.formats[0] !== 'auction') && !(s.id === 'ending' && def.formats[0] !== 'auction') : true; })
        .forEach(function (s) { sortSelect.appendChild(h('option', { value: s.id, text: s.label, title: s.help || '' })); });
      var pick = state.sort || (state.tab === 'new' ? 'newest' : state.tab === 'ending' ? 'ending' : state.tab === 'trending' ? 'popular' : 'recommended');
      if (!Array.from(sortSelect.options).some(function (o) { return o.value === pick; })) sortSelect.appendChild(h('option', { value: pick, text: (cfg().sorts.find(function (s) { return s.id === pick; }) || { label: pick }).label }));
      sortSelect.value = pick;
    }
    function updateSortSelect() { fillSort(); }
    fillSort();
    sortSelect.addEventListener('change', function () { state.sort = sortSelect.value; state.pages = 1; refresh(true); });
    sortWrap.appendChild(sortSelect);
    var viewsBtn = ui.button('Saved views', { icon: 'bookmark', variant: 'ghost' });
    viewsBtn.setAttribute('aria-haspopup', 'dialog'); viewsBtn.setAttribute('aria-expanded', 'false');
    var right = h('div.mk-controlbar-right', sortWrap, viewsBtn);
    toolbar.append(filterToggle, presetRow, right);
    host.appendChild(toolbar);

    // ---- active chips + count ----
    var chipsRow = h('div.mk-chiprow');
    var countEl = h('p.mk-resultcount', { role: 'status', 'aria-live': 'polite' });
    host.appendChild(h('div.mk-statusrow', chipsRow, countEl));

    // ---- layout: filters rail + results ----
    // Narrow windows start with the filters folded away so the listings lead.
    if (!store.session.filtersTouched) store.session.filtersOpen = (ui.shell.el ? ui.shell.el.clientWidth : 1200) >= 980;
    var layout = h('div.mk-listlayout', { data: { filters: store.session.filtersOpen ? 'open' : 'closed' } });
    var rail = h('aside.mk-filters', { id: 'mk-filters', 'aria-label': 'Filters' });
    var results = h('section.mk-results', { 'aria-label': 'Listings' });
    layout.append(rail, results);
    host.appendChild(layout);
    filterToggle.addEventListener('click', function () {
      store.session.filtersTouched = true;
      store.session.filtersOpen = !store.session.filtersOpen;
      layout.dataset.filters = store.session.filtersOpen ? 'open' : 'closed';
      filterToggle.setAttribute('aria-expanded', String(store.session.filtersOpen));
    });

    var grid = null, sentinel = null, more = null, observer = null, shown = 0;
    var tileEnv = { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: 0 };

    function query(limit) {
      var q = { tab: state.tab, filters: state.filters, limit: limit, cursor: null, sort: state.sort || undefined, lockFormats: def.formats || null };
      return q;
    }

    // ---- filter rail ----
    var controls = {};
    function change(mutator) {
      mutator(state.filters); state.pages = 1; refresh(true);
    }
    function setFacetCounts() {
      if (!facets) return;
      [['formats', 'format'], ['rarities', 'rarity'], ['variants', 'variant'], ['generations', 'generation'], ['brands', 'brand'], ['packs', 'pack']].forEach(function (g) {
        var grp = controls[g[0]]; if (!grp) return;
        Object.keys(grp.els).forEach(function (v) {
          var n = facets[g[0]][v] || 0, el = grp.els[v];
          el.querySelector('.mk-pill-count').textContent = String(n);
          el.dataset.empty = String(n === 0 && state.filters[g[0]].indexOf(v) < 0);
          el.setAttribute('aria-pressed', String(state.filters[g[0]].indexOf(v) >= 0));
        });
      });
    }
    function buildRail() {
      ui.clear(rail);
      var f = state.filters, simple = [];
      var head = h('div.mk-rail-head', h('h2', { text: 'Filters' }), h('div.mk-rail-head-actions', ui.button('Clear all', { variant: 'ghost', size: 'sm', onClick: function () { clearAll(); } }),
        (function () { var done = ui.button('Show results', { variant: 'primary', size: 'sm', onClick: function () { filterToggle.click(); } }); done.classList.add('mk-rail-done'); return done; })()));
      rail.appendChild(head);
      var body = h('div.mk-rail-body');
      rail.appendChild(body);
      function toggleIn(group) { return function (value) { change(function (g) { var i = g[group].indexOf(value); if (i >= 0) g[group].splice(i, 1); else g[group].push(value); }); }; }
      if (!def.formats) {
        controls.formats = chipGroup(cfg().formats.map(function (x) { return { value: x.id, label: x.short, count: 0 }; }), f.formats, toggleIn('formats'), 'Listing type');
        body.appendChild(section('Listing type', controls.formats, { key: 'format' }));
      }
      if (def.auctionControls) {
        var statusSel = selectField('Auction status', [{ value: '', label: 'Any status' }, { value: 'open', label: 'Open' }, { value: 'ending', label: 'Ending within 2 hours' }, { value: 'reserve-met', label: 'Reserve met' }, { value: 'no-bids', label: 'No bids yet' }], f.auctionStatus, function (v) { change(function (g) { g.auctionStatus = v; }); });
        body.appendChild(section('Auction state', statusSel, { key: 'auction' }));
      }
      controls.rarities = chipGroup(rarityList(env).map(function (r) { return { value: r.id, label: r.name, count: 0, title: r.name }; }), f.rarities, toggleIn('rarities'), 'Rarity');
      body.appendChild(section('Rarity', controls.rarities, { key: 'rarity' }));
      var budgetFields = h('div.mk-stack');
      if (realm === 'simulation') budgetFields.appendChild(toggle('Within my budget', f.withinBudget, function (v) { change(function (g) { g.withinBudget = v; }); }, 'Credits you hold: ' + ui.fmt.credits(env.budget || 0)));
      controls.price = rangeFields('Price in Credits', f.price, '–', function (v) { change(function (g) { g.price = v; }); });
      budgetFields.appendChild(controls.price);
      body.appendChild(section('Price', budgetFields, { key: 'price' }));
      var own = selectField('Ownership', [{ value: '', label: 'Any' }, { value: 'owned', label: 'Cards I own' }, { value: 'not-owned', label: 'Cards I do not own' }, { value: 'gap', label: 'Collection gaps' }, { value: 'wishlist', label: 'On my wishlist' }, { value: 'watching', label: 'On my watchlist' }], f.ownership, function (v) { change(function (g) { g.ownership = v; }); });
      body.appendChild(section('Your collection', own, { key: 'own' }));
      if (advanced) {
        controls.variants = chipGroup([{ value: 'normal', label: 'Normal', count: 0 }].concat(C.data.variants.filter(function (v) { return v.kind !== 'frame'; }).map(function (v) { return { value: v.id, label: v.name, count: 0 }; })), f.variants, toggleIn('variants'), 'Finish');
        body.appendChild(section('Finish', controls.variants, { key: 'variant', open: false }));
        controls.generations = chipGroup(C.data.generations.map(function (g) { return { value: g.id, label: g.name.replace('Generation', 'Gen'), count: 0, title: g.name }; }), f.generations, toggleIn('generations'), 'Generation');
        body.appendChild(section('Generation', controls.generations, { key: 'gen', open: false }));
        var brands = Array.from(new Set(env.data.cards.map(function (c) { return c.brand; }).filter(Boolean))).sort();
        controls.brands = chipGroup(brands.map(function (b) { return { value: b, label: b, count: 0 }; }), f.brands, toggleIn('brands'), 'Brand');
        body.appendChild(section('Brand', controls.brands, { key: 'brand', open: false }));
        controls.packs = chipGroup(env.data.packIds.map(function (p) { return { value: p, label: packName(p), count: 0 }; }), f.packs, toggleIn('packs'), 'Original pack');
        body.appendChild(section('Original pack', controls.packs, { key: 'pack', open: false }));
        var ratio = h('div.mk-stack');
        controls.ratio = rangeFields('Price as % of Average Value', f.valueRatio, '%', function (v) { change(function (g) { g.valueRatio = v; }); }, ['e.g. 60', 'e.g. 95']);
        ratio.append(h('p.mk-hint', { text: 'Under 100% is below Average Value. Listings without an Average Value are left out.' }), controls.ratio);
        var conf = selectField('Value confidence', [{ value: '', label: 'Any confidence' }, { value: 'medium', label: 'Medium or higher' }, { value: 'high', label: 'High only' }], f.minConfidence, function (v) { change(function (g) { g.minConfidence = v; }); });
        ratio.appendChild(conf);
        body.appendChild(section('Value', ratio, { key: 'value', open: false }));
        var fair = h('div.mk-stack', rangeFields('Average Value', f.fairValue, '–', function (v) { change(function (g) { g.fairValue = v; }); }));
        body.appendChild(section('Estimated fair value', fair, { key: 'fair', open: false }));
        var ser = h('div.mk-stack');
        ser.appendChild(toggle('Low serials only', f.serial.lowOnly, function (v) { change(function (g) { g.serial.lowOnly = v; }); }, 'Serial number ' + cfg().serial.lowCounter + ' or lower in its owner’s sequence.'));
        controls.serial = rangeFields('Serial number', f.serial, '–', function (v) { change(function (g) { g.serial.min = v.min; g.serial.max = v.max; }); });
        ser.appendChild(controls.serial);
        body.appendChild(section('Serial', ser, { key: 'serial', open: false }));
        var age = selectField('Listed within', [{ value: '', label: 'Any time' }, { value: '1', label: 'The last hour' }, { value: '24', label: 'The last 24 hours' }, { value: '72', label: 'The last 3 days' }], f.listedWithin, function (v) { change(function (g) { g.listedWithin = v; }); });
        var rating = selectField('Seller rating', [{ value: '0', label: 'Any seller' }, { value: '0.8', label: '80% or higher' }, { value: '0.9', label: '90% or higher' }], String(f.minSellerRating || 0), function (v) { change(function (g) { g.minSellerRating = Number(v); }); });
        body.appendChild(section('Listing and seller', h('div.mk-stack', age, rating), { key: 'seller', open: false }));
      } else {
        body.appendChild(h('button.mk-linkbutton', { type: 'button', on: { click: function () { C.settings.set('marketMode', 'advanced'); } } }, icon('sliders'), h('span', { text: 'More filters: finish, brand, serial, value' })));
      }
      var footer = h('div.mk-rail-foot', ui.button('Save this view', { icon: 'save', variant: 'secondary', onClick: function () { saveViewDialog(); } }));
      rail.appendChild(footer);
      setFacetCounts();
    }

    function clearAll() {
      var keep = def.formats ? def.formats.slice() : [];
      state.filters = K().emptyFilters(); state.filters.formats = keep; state.pages = 1;
      if (id === 'discover') store.session.filters = state.filters;
      buildRail(); refresh(true);
    }
    // A few presets are about you: the finishes you keep, the brand you hold most of.
    function dynamicFilters(p) {
      var f = JSON.parse(JSON.stringify(p.filters || {}));
      if (p.dynamic === 'variants' && env.ctx && env.ctx.prefs) {
        var wanted = Object.keys(env.ctx.prefs.variant).filter(function (k) { return k !== 'normal' && env.ctx.prefs.variant[k] >= 0.5; });
        if (wanted.length) f.variants = wanted.slice(0, 6);
      }
      if (p.dynamic === 'brands') {
        var count = {};
        Object.keys(env.owned || {}).forEach(function (id) { var c = env.cards[id]; if (c && c.brand) count[c.brand] = (count[c.brand] || 0) + env.owned[id]; });
        var top = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; })[0];
        if (top) f.brands = [top];
      }
      return f;
    }
    function applyPreset(p) {
      var base = K().emptyFilters();
      if (def.formats) base.formats = def.formats.slice();
      base.q = state.filters.q;
      state.filters = K().normalizeFilters(Object.assign(base, dynamicFilters(p)));
      if (def.formats && !state.filters.formats.length) state.filters.formats = def.formats.slice();
      if (p.filters.formats && def.formats) state.filters.formats = def.formats.slice();
      state.sort = p.sort; state.pages = 1; fillSort(); buildRail(); refresh(true);
    }
    function saveViewDialog() {
      var surface = h('section.mk-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Save this view' });
      var input = h('input.mk-input', { type: 'text', maxlength: '40', placeholder: 'Name this view', 'aria-label': 'View name', value: '' });
      var h2 = h('h2', { text: 'Save this view' });
      var saveB = ui.button('Save view', { variant: 'primary', onClick: function () { store.saveView(input.value, { q: state.filters.q, sort: state.sort, tab: state.tab, filters: state.filters, realm: realm }); C.ui.toast('View saved'); handle.close(); } });
      surface.append(h2, h('p', { text: 'Saved views remember your search, filters and sort on this device.' }), input, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), saveB));
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveB.click(); } });
      var handle = C.ui.present(surface, { anchor: doc_active() });
    }
    function doc_active() { return root.document.activeElement; }
    viewsBtn.addEventListener('click', function () {
      ui.popover(viewsBtn, function (close) {
        var box = h('div.mk-menu', { role: 'menu' });
        box.appendChild(h('div.mk-menu-title', { text: 'Saved views' }));
        var saved = store.prefs.saved.filter(function (v) { return !v.realm || v.realm === realm; });
        if (!saved.length) box.appendChild(h('p.mk-hint', { text: 'None yet for ' + ui.realmDef(realm).label + '. Set up a search and use “Save this view”. Views are kept per realm on this device.' }));
        saved.forEach(function (v) {
          var row = h('div.mk-menu-row');
          var apply = h('button.mk-menu-item', { type: 'button', role: 'menuitem' }, h('span', { text: v.name }), h('small', { text: (v.q ? '“' + v.q + '” · ' : '') + K().activeFilterCount(K().normalizeFilters(v.filters)) + ' filters' }));
          apply.addEventListener('click', function () {
            state.filters = K().normalizeFilters(v.filters); if (def.formats) state.filters.formats = def.formats.slice();
            state.sort = v.sort || state.sort; state.tab = v.tab || state.tab; state.pages = 1; if (id === 'discover') store.session.filters = state.filters;
            close(); buildRail(); fillSort(); refresh(true);
            if (tabsEl) tabsEl.set(state.tab);
          });
          var del = h('button.mk-icon-button', { type: 'button', 'aria-label': 'Delete saved view ' + v.name, title: 'Delete' }, icon('trash'));
          del.addEventListener('click', function () { store.removeView(v.id); close(false); C.ui.toast('Saved view removed'); });
          row.append(apply, del); box.appendChild(row);
        });
        box.appendChild(ui.button('Save current view…', { icon: 'save', variant: 'secondary', onClick: function () { close(false); saveViewDialog(); } }));
        // named sort presets, and an alert for this search (Global: delivered to the in-app inbox)
        box.appendChild(ui.button('Save this sort as a preset', { icon: 'sliders', variant: 'ghost', onClick: function () {
          var name = (cfg().sorts.find(function (s) { return s.id === (state.sort || 'recommended'); }) || { label: 'Sort' }).label;
          store.addSortPreset(realm, name, state.sort || 'recommended', state.tab); close(false); C.ui.toast('Sort preset saved'); } }));
        store.prefs.sortPresets.filter(function (p) { return p.realm === realm; }).forEach(function (p) {
          box.appendChild(h('button.mk-menu-item', { type: 'button', role: 'menuitem', on: { click: function () { state.sort = p.sort; state.tab = p.tab || state.tab; state.pages = 1; close(false); fillSort(); refresh(true); if (tabsEl) tabsEl.set(state.tab); } } }, h('span', { text: 'Sort: ' + p.name }), h('small', { text: 'preset' })));
        });
        if (realm === 'global' && ui.sim.live(realm) && C.market.onlineProvider) {
          box.appendChild(ui.button('Alert me when something matches', { icon: 'bell', variant: 'secondary', onClick: function () {
            var f = state.filters, q = {};
            if (f.q) q.q = f.q; if (f.rarities.length) q.rarity = f.rarities.slice(0, 8);
            if (f.formats.length) q.kind = f.formats.map(function (x) { return x === 'buy-now' ? 'fixed' : x; });
            if (f.price.max != null) q.maxPrice = f.price.max;
            if (f.brands.length === 1) q.brand = f.brands[0];
            if (f.generations.length === 1) q.generation = f.generations[0];
            if (f.variants.length === 1 && f.variants[0] !== 'normal') q.variantId = f.variants[0];
            close(false);
            if (!Object.keys(q).length) { C.ui.toast('Set a search or a filter first.', null, 'error'); return; }
            C.market.onlineProvider.createAlert({ kind: 'search', query: q, label: f.q || 'Saved search' }).then(function (r) {
              C.ui.toast(r.ok ? 'Alert saved. Matches reach your Activity inbox, even while the game is closed they wait for you.' : r.message, null, r.ok ? 'info' : 'error');
            });
          } }));
        }
        return box;
      }, { label: 'Saved views', align: 'end' });
    });

    // ---- results ----
    function renderChips() {
      ui.clear(chipsRow);
      var chips = describe(state.filters, env, function (m) { change(m); });
      var visible = chips.filter(function (c) { return !(def.formats && /^format:/.test(c.id)); });
      var count = visible.length + (state.filters.q ? 1 : 0);
      var badge = filterToggle.querySelector('.mk-count');
      badge.textContent = count ? String(count) : ''; badge.hidden = !count;
      if (state.filters.q) {
        var qc = h('button.mk-activechip', { type: 'button', 'aria-label': 'Remove search “' + state.filters.q + '”' }, icon('search'), h('span', { text: '“' + state.filters.q + '”' }), icon('close'));
        qc.addEventListener('click', function () { state.filters.q = ''; if (id === 'discover') { store.session.filters.q = ''; if (ui.shell.searchField) ui.shell.searchField.syncFromFilters(); } state.pages = 1; refresh(true); });
        chipsRow.appendChild(qc);
      }
      visible.forEach(function (c) {
        var b = h('button.mk-activechip', { type: 'button', 'aria-label': 'Remove filter: ' + c.label }, h('span', { text: c.label }), icon('close'));
        b.addEventListener('click', function () { c.remove(); buildRail(); });
        chipsRow.appendChild(b);
      });
      if (count > 1) chipsRow.appendChild(ui.button('Clear all', { variant: 'ghost', size: 'sm', onClick: clearAll }));
      presetRow.querySelectorAll('.mk-pill').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    }
    function tableShell() {
      var t = h('div.mk-table', { role: 'table', 'aria-label': def.title + ' listings' });
      t.appendChild(ui.terminalHeader(state.sort || 'recommended', function (s) { state.sort = s; state.pages = 1; fillSort(); refresh(true); }));
      return t;
    }
    function appendEntries(entries, container) {
      var frag = root.document.createDocumentFragment();
      entries.forEach(function (entry, i) {
        tileEnv.index = i;
        frag.appendChild(view === 'terminal' ? ui.terminalRow(entry, tileEnv) : ui.listingTile(entry, tileEnv));
      });
      container.appendChild(frag);
    }
    function renderEmpty(res) {
      ui.releaseArt(results, ctx.thumbs);
      ui.clear(results); grid = null;
      if (realm === 'global' && ['signed-out', 'offline', 'paused', 'no-listings'].indexOf(res.emptyReason) >= 0 && !store.session.showGlobalSample) {
        var gs = C.market.api.statusSync('global');
        var actions = [];
        if (res.emptyReason === 'signed-out') actions.push({ label: 'Connect to Players', variant: 'primary', icon: 'user', run: function () { if (ui.online) ui.online.connectDialog(); } });
        if (res.emptyReason === 'offline' || res.emptyReason === 'paused') actions.push({ label: 'Try again', variant: 'primary', icon: 'forward', run: function () { C.market.online.refresh(true); } });
        actions.push({ label: 'Open Standard', variant: actions.length ? 'secondary' : 'primary', icon: 'layers', run: function () { store.setRealm('simulation'); } });
        if (res.emptyReason === 'no-listings') actions.unshift({ label: 'List a card', variant: 'secondary', icon: 'plus', run: function () { ui.go('compose', {}); } });
        results.appendChild(ui.emptyState({ kind: res.emptyReason === 'no-listings' ? 'empty' : 'offline', icon: res.emptyReason === 'no-listings' ? 'market' : 'lock',
          title: res.emptyReason === 'no-listings' ? 'No one is selling yet' : res.emptyReason === 'paused' ? 'Players is paused' : res.emptyReason === 'offline' ? 'Players is unreachable' : 'Connect to see Players',
          body: res.emptyReason === 'no-listings' ? 'Everything here comes from real players, and the beta is new. When a player lists a card it appears here. Nothing is added to make it look busy: no bots, no samples. List a card of your own, or sell a few to the system to get your first Credits.'
            : gs.message, actions: actions }));
        return;
      }
      if (res.emptyReason === 'not-connected') {
        results.appendChild(ui.emptyState({ kind: 'offline', icon: 'lock', title: 'Players is not connected',
          body: 'It lists real players’ cards once connected. You can browse Standard or draft a listing meanwhile.',
          actions: [
            { label: 'Open Standard', variant: 'primary', icon: 'layers', run: function () { store.setRealm('simulation'); } },
            { label: 'Draft a listing', variant: 'secondary', icon: 'plus', run: function () { ui.go('compose', {}); } },
            { label: 'Preview the layout with sample listings', variant: 'ghost', icon: 'eye', run: function () { store.session.showGlobalSample = true; store.emit('realm'); } }].filter(function (action) { return action.icon !== 'eye' || devMode(); }) }));
        return;
      }
      var pool = ui.sim.live(realm)
        ? ctx.api.listingsSync(realm, { tab: 'for-you', filters: K().emptyFilters(), limit: 400, facets: false, lockFormats: def.formats || null }).items.map(function (e) { return e.listing; })
        : env.data.listings[realm === 'global' && !store.session.showGlobalSample ? 'simulation' : realm].filter(function (l) { return l.status === 'active' || l.status === 'ending'; });
      var hints = K().relaxSuggestions(pool, state.filters, env.ctx);
      var extra = h('div.mk-hints');
      hints.forEach(function (hint) {
        var b = h('button.mk-hintbutton', { type: 'button' }, h('span', { text: hint.label }), h('small', { text: hint.count + ' listings' }));
        b.addEventListener('click', function () { state.filters = K().normalizeFilters(hint.filters); if (def.formats) state.filters.formats = def.formats.slice(); if (id === 'discover') store.session.filters = state.filters; state.pages = 1; buildRail(); refresh(true); });
        extra.appendChild(b);
      });
      results.appendChild(ui.emptyState({ kind: 'no-results', icon: 'search', title: 'No listings match',
        body: ui.sim.live(realm) && !pool.length ? (realm === 'global' ? 'No player is selling this right now. Players lists only what real players put up.' : 'No one in Standard is selling this right now. New cards are listed through the day.') : 'Nothing fits every filter. Loosen one, or clear them all.', extra: hints.length ? extra : null,
        actions: [{ label: 'Clear all filters', variant: 'secondary', run: clearAll }] }));
    }
    function renderResults(res, append) {
      lastTotal = res.total; cursor = res.nextCursor; facets = res.facets || facets;
      setFacetCounts();
      var desc = res.total === res.universe ? res.total + ' listings' : res.total + ' of ' + res.universe + ' listings';
      countEl.textContent = desc;
      if (!res.items.length && !append) { renderEmpty(res); return; }
      if (!append) {
        ui.releaseArt(results, ctx.thumbs);
        ui.clear(results);
        if (view === 'terminal') { grid = tableShell(); results.appendChild(grid); }
        else { grid = h('div.mk-grid', { role: 'list', 'aria-label': def.title + ' listings' }); results.appendChild(grid); }
        shown = 0;
        sentinel = h('div.mk-sentinel', { 'aria-hidden': 'true' });
        more = ui.button('Show more listings', { variant: 'secondary', onClick: function () { loadMore(); } });
        results.append(sentinel, h('div.mk-more-row', more));
        if (observer) observer.disconnect();
        if (root.IntersectionObserver) {
          observer = new root.IntersectionObserver(function (es) { if (es[0].isIntersecting) loadMore(); }, { root: ctx.scroller, rootMargin: '600px' });
          observer.observe(sentinel); scope.add(function () { observer.disconnect(); });
        }
      }
      appendEntries(res.items, grid);
      if (view !== 'terminal') Array.from(grid.children).forEach(function (n) { n.setAttribute('role', 'listitem'); });
      shown += res.items.length;
      more.hidden = !cursor; sentinel.hidden = !cursor;
      if (cursor) more.querySelector('span').textContent = 'Show more · ' + (lastTotal - shown) + ' left';
    }
    function refresh(resetScroll, markNew) {
      var mine = ++token, before = null;
      if (markNew && grid) { before = {}; Array.prototype.forEach.call(grid.querySelectorAll('[data-id]'), function (n) { before[n.dataset.id] = true; }); }
      renderChips();
      // A provider that answers later (the simulator, the online realm) gets a designed loading state.
      if (!results.firstChild) results.appendChild(ui.skeletonGrid(Math.min(8, pageSize)));
      if (id === 'discover') store.session.filters = state.filters;
      if (ui.shell.searchField && id === 'discover') ui.shell.searchField.syncFromFilters();
      var q = query(pageSize * Math.max(1, state.pages));
      ctx.api.listings(realm, q).then(function (res) {
        if (mine !== token || scope.dead) return;
        renderResults(res, false);
        if (before && grid && ui.flourish) ui.flourish.markFresh(grid, before);
        // every listing that exists now, shown or not: only a listing that appears after this counts as new
        if (ui.sim.live(realm)) { known = {}; ctx.api.listingsSync(realm, { tab: state.tab, filters: state.filters, limit: 400, cursor: null, sort: state.sort || undefined, lockFormats: def.formats || null, facets: false }).items.forEach(function (e) { known[e.listing.id] = true; }); }
        if (heroHost) renderHero(res);
        if (resetScroll) ctx.scroller.scrollTop = 0;
        ctx.restoreScroll();
      });
    }
    function loadMore() {
      if (loading || !cursor) return;
      loading = true;
      var q = { tab: state.tab, filters: state.filters, limit: pageSize, cursor: cursor, sort: state.sort || undefined, facets: false };
      ctx.api.listings(realm, q).then(function (res) {
        loading = false; if (scope.dead) return;
        cursor = res.nextCursor; state.pages = Math.ceil((shown + res.items.length) / pageSize);
        appendEntries(res.items, grid);
        if (view !== 'terminal') Array.from(grid.children).forEach(function (n) { n.setAttribute('role', 'listitem'); });
        shown += res.items.length;
        more.hidden = !cursor; sentinel.hidden = !cursor;
        if (cursor) more.querySelector('span').textContent = 'Show more · ' + (lastTotal - shown) + ' left';
      });
    }

    // ---- editorial hero ----
    function renderHero(res) {
      ui.releaseArt(heroHost, ctx.thumbs);
      ui.clear(heroHost);
      var active = K().activeFilterCount(state.filters) + (state.filters.q ? 1 : 0);
      if (id !== 'discover' || state.tab !== 'for-you' || active || !res.items.length || view === 'terminal') return;
      var pool = ctx.api.listingsSync(realm, { tab: 'for-you', filters: K().emptyFilters(), limit: 48, facets: false }).items.filter(function (e) { return e.listing.format !== 'swap'; });
      // Editorial picks: confident discounts first, scarcer cards leading, one entry per card.
      function tierOf(e) { var r = env.rarities[env.cards[e.listing.card.cardId].rarity]; return r ? r.tier : 0; }
      var good = pool.filter(function (e) { return e.rank.discount >= 0.05 && (e.listing.valuation.confidence === 'high' || e.listing.valuation.confidence === 'medium'); });
      good.sort(function (a, b) { return (tierOf(b) >= 3 ? 1 : 0) - (tierOf(a) >= 3 ? 1 : 0) || b.rank.score - a.rank.score; });
      var picks = [], seen = {};
      good.concat(pool).forEach(function (e) {
        if (picks.length >= 4 || seen[e.listing.card.cardId]) return; seen[e.listing.card.cardId] = true; picks.push(e);
      });
      if (!picks.length) return;
      var shelf = h('section.mk-hero', { 'aria-label': 'Featured opportunities' });
      var main = picks[0], l = main.listing, card = env.cards[l.card.cardId], idn = ui.identity(card, !!env.owned[card.id]);
      var artHost = h('div.mk-hero-art');
      artHost.appendChild(ctx.thumbs.mount(card, { instanceId: 'mk-hero-' + l.id, cardId: card.id, serial: l.card.serial, variantId: l.card.variantId, cardSkinId: l.card.cardSkinId, seen: true }, { owned: !!env.owned[card.id] }));
      var price = K().currentPrice(l), v = l.valuation;
      var copy = h('div.mk-hero-copy');
      copy.appendChild(h('span.mk-eyebrow.mk-hero-kind', icon(ui.formatDef(l.format).icon), h('span', { text: ui.formatDef(l.format).label })));
      copy.appendChild(h('h2', { text: idn.name }));
      var why = main.rank.discount >= 0.05 && v.average ? ui.fmt.pct(main.rank.discount, false) + ' under its usual price of ' + ui.fmt.exact(v.average) : '';
      if (why) copy.appendChild(h('p.mk-hero-why', icon('down'), h('span', { text: why })));
      var meta = h('div.mk-hero-meta', ui.chip(idn.rarityName, { tone: 'rarity' }));
      if (l.card.variantId) meta.appendChild(ui.chip(env.variants[l.card.variantId].name));
      var HERO = { gap: ['cards', 'New to you'], wishlist: ['star', 'Wishlist'], ending: ['clock', 'Ends soon'], fresh: ['sparkle', 'Just listed'], risk: ['warn', 'Risky'] };
      main.rank.reasons.forEach(function (r) { if (HERO[r.id] && meta.children.length < 3) meta.appendChild(ui.chip(HERO[r.id][1], { tone: r.id === 'risk' ? 'warn' : 'soft', icon: HERO[r.id][0] })); });
      copy.appendChild(meta);
      var priceRow = h('div.mk-hero-price', ui.credits(price, { big: true }), l.format === 'auction' ? h('span.mk-muted', { text: (l.auction.bids === 1 ? '1 bid' : l.auction.bids + ' bids') + ' · ' + ui.fmt.duration(l.endsMin) + ' left' }) : null, why ? null : ui.valueTag(price, v));
      copy.appendChild(priceRow);
      var cta = h('div.mk-hero-actions', ui.button('View listing', { variant: 'primary', icon: 'forward', onClick: function () { ui.go('listing', { id: l.id }, { focusKey: l.id }); } }),
        ui.button(store.isWatching(l.id) ? 'Watching' : 'Watch', { variant: 'secondary', icon: 'bookmark', onClick: function (e) { var on = store.toggleWatch(l.id); e.currentTarget.querySelector('span').textContent = on ? 'Watching' : 'Watch'; } }));
      copy.appendChild(cta);
      shelf.append(artHost, copy);
      var side = h('div.mk-hero-side');
      picks.slice(1).forEach(function (e) {
        var sl = e.listing, sc = env.cards[sl.card.cardId], sid = ui.identity(sc, !!env.owned[sc.id]);
        var tile = h('button.mk-mini', { type: 'button', 'aria-label': sid.name + ', ' + ui.formatDef(sl.format).label + ', ' + ui.fmt.exact(K().currentPrice(sl)) + ' Credits' });
        var a = h('div.mk-mini-art');
        a.appendChild(ctx.thumbs.mount(sc, { instanceId: 'mk-hero-' + sl.id, cardId: sc.id, serial: sl.card.serial, variantId: sl.card.variantId, cardSkinId: sl.card.cardSkinId, seen: true }, { owned: !!env.owned[sc.id] }));
        tile.append(a, h('span.mk-mini-copy', h('strong', { text: sid.name }), h('span', { text: ui.formatDef(sl.format).short + ' · ' + sid.rarityName }), ui.credits(K().currentPrice(sl))));
        tile.addEventListener('click', function () { ui.go('listing', { id: sl.id }, { focusKey: sl.id }); });
        side.appendChild(tile);
      });
      shelf.appendChild(side);
      heroHost.appendChild(shelf);
    }

    // ---- live simulation updates ----
    // Prices change in place, listings that closed are marked, and anything new waits behind the pill.
    function liveUpdate() {
      if (!ui.sim.live(realm) || !grid) return;
      ui.sim.countdowns(results);
      var res = ctx.api.listingsSync(realm, { tab: state.tab, filters: state.filters, limit: Math.max(pageSize, shown + 24), cursor: null, sort: state.sort || undefined, lockFormats: def.formats || null, facets: false });
      var now = {}; res.items.forEach(function (e) { now[e.listing.id] = e.listing; });
      var present = {}, changed = 0;
      Array.prototype.forEach.call(grid.querySelectorAll('[data-id]'), function (node) {
        var lid = node.dataset.id; present[lid] = true;
        var l = now[lid];
        if (!l) {
          if (node.dataset.state !== 'gone') {
            node.dataset.state = 'gone';
            var top = node.querySelector('.mk-tile-top') || node.querySelector('.mk-tcell');
            if (top) top.appendChild(h('span.mk-gone-note', { text: 'No longer open' }));
          }
          return;
        }
        var amount = node.querySelector('.mk-credits .mk-num'), p = K().currentPrice(l);
        if (amount && l.format !== 'swap') {
          var text = ui.fmt.credits(p);
          var prevPrice = Number(node.dataset.price) || null; node.dataset.price = String(p);
          if (amount.textContent !== text) {
            amount.textContent = text; var wrap = amount.parentNode; wrap.title = ui.fmt.exact(p) + ' Credits'; wrap.setAttribute('aria-label', ui.fmt.exact(p) + ' Credits');
            // A price that moved while you were looking says so: a brief flash in the direction it went.
            if (prevPrice != null && prevPrice !== p && ui.motion) ui.motion.flash(wrap, p > prevPrice ? 'up' : 'down');
          }
        }
      });
      res.items.forEach(function (e) { if (!present[e.listing.id] && !(known && known[e.listing.id])) changed++; });
      // At the top of the page with nothing in hand, new listings simply slide in; further down they wait behind the pill
      // so nothing moves under what you are reading.
      var atTop = ctx.scroller.scrollTop < 140 && !(root.document.activeElement && root.document.activeElement.closest && root.document.activeElement.closest('.mk-results,.mk-filters,.mk-controlbar'));
      if (changed && atTop && !results.matches(':hover') && !ui.hasPopover() && !(C.ui && C.ui.modal) && Date.now() - (liveUpdate.last || 0) > 4000) { liveUpdate.last = Date.now(); pill.hidden = true; refresh(false, true); return; }
      if (changed) { ui.clear(pill); pill.append(icon('sparkle'), h('span', { text: changed === 1 ? '1 new listing' : changed + ' new listings' }), h('span.mk-updates-go', icon('refresh'), h('span', { text: 'Show' }))); pill.hidden = false; } else pill.hidden = true;
    }

    // ---- store-driven updates ----
    scope.add(store.subscribe(function (what) {
      if (what === 'filters' && id === 'discover') { state.filters = store.session.filters; state.pages = 1; buildRail(); refresh(true); }
      if (what === 'watch') { /* tile controls reflect themselves */ }
      if (what === 'sim') liveUpdate();
    }));
    buildRail();
    refresh(false);
  }

  // ---- Recent trades ----
  function mountRecentTrades(ctx, state) {
    var host = ctx.host, realm = ctx.realm, env = ctx.env(), live = ui.sim.live(realm);
    var head = h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', icon('swap')), h('span', { text: 'Recent trades' })), h('p', { text: 'Completed trades only.' })));
    host.appendChild(head);
    var tabs = ui.segmented({ label: 'Discover feeds', role: 'tablist', value: 'trades', options: cfg().tabs.map(function (t) { return { value: t.id, label: t.label }; }),
      onChange: function (v) { state.tab = v; state.pages = 1; ui.shell.remount(); } });
    tabs.classList.add('mk-feed-tabs');
    host.appendChild(h('div.mk-feedbar', tabs));
    var listHost = h('section.mk-trades', { 'aria-label': 'Recent trades' });
    host.appendChild(listHost);
    ctx.api.trades(realm, { limit: 40 }).then(function (res) {
      if (ctx.scope.dead) return;
      if (!res.items.length) {
        listHost.appendChild(ui.emptyState({ kind: 'offline', icon: 'swap', title: realm === 'global' ? 'No real trades yet' : 'No trades yet',
          body: realm === 'global' ? (live ? 'No two players have completed a trade yet. When they do, every completed player trade appears here, and nothing else: never a bot, a sample or a system sale.' : 'Players is not connected. When it is, every completed player trade appears here, and nothing else.') : 'Completed Standard trades appear here as traders buy and sell.',
          actions: [{ label: 'Back to For You', variant: 'secondary', run: function () { state.tab = 'for-you'; ui.shell.remount(); } }] }));
        ctx.restoreScroll();
        return;
      }
      var table = h('div.mk-table.is-trades', { role: 'table', 'aria-label': 'Recent trades' });
      var head = h('div.mk-trow.mk-trow-head', { role: 'row' });
      (live ? ['Card', 'Finish', 'Type', 'Price', 'vs Average', 'Seller to buyer', 'When'] : ['Card', 'Finish', 'Type', 'Price', 'vs Average', 'When']).forEach(function (t) { head.appendChild(h('div.mk-tcell', { role: 'columnheader', text: t })); });
      table.appendChild(head);
      res.items.forEach(function (t) {
        var card = env.cards[t.cardId], idn = ui.identity(card, !!env.owned[t.cardId]);
        var row = h('div.mk-trow', { role: 'row' });
        var open = h('button.mk-tile-open', { type: 'button', 'aria-label': idn.name + ', open card market' }, h('span.mk-tile-name', { text: idn.name }));
        open.addEventListener('click', function () { ui.go('card', { id: t.cardId, variant: t.variantId || '' }); });
        row.append(h('div.mk-tcell', { role: 'cell' }, open), h('div.mk-tcell', { role: 'cell', text: t.variantId ? (env.variants[t.variantId] || {}).name : 'Normal' }),
          h('div.mk-tcell', { role: 'cell' }, h('span.mk-format', { data: { format: t.format } }, icon(ui.formatDef(t.format).icon), h('span', { text: ui.formatDef(t.format).short }))),
          h('div.mk-tcell', { role: 'cell' }, ui.credits(t.price)), h('div.mk-tcell', { role: 'cell' }, ui.delta(t.vs, { label: 'vs Average', empty: 'No reference' })),
          live ? h('div.mk-tcell', { role: 'cell', title: [t.sellerWhy, t.buyerWhy].filter(Boolean).join(' · ') }, h('span', { text: t.seller + ' → ' + t.buyer }), t.you ? h('small.mk-you', { text: ' you' }) : null) : null,
          h('div.mk-tcell', { role: 'cell', text: ui.fmt.age(t.minutesAgo) }));
        table.appendChild(row);
      });
      listHost.appendChild(table);
      listHost.appendChild(h('p.mk-hint', { text: live ? 'The ' + res.items.length + ' most recent of ' + res.total + ' trades kept, ' + ui.fmt.exact(res.volume) + ' Credits in all. Every row was a completed sale between two traders; the fee is not included in the price.' : 'Sample trades. Total shown: ' + ui.fmt.exact(res.volume) + ' Credits across ' + res.items.length + ' trades. These are invented and are not market volume.' }));
      ctx.restoreScroll();
    });
  }

  Object.keys(PAGES).forEach(function (id) {
    ui.pages.register(id, { nav: id, async: true, title: function () { return PAGES[id].title; }, mount: function (ctx) { return mountListings(ctx, id); } });
  });
})(window.Cardable = window.Cardable || {}, window);
