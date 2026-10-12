/* Cardable Market — Stocks.
 * Market intelligence about collectible cards, not shares: nothing here can be owned or traded.
 * One chart is drawn for the chosen scope; leaders are plain rows with no per-row charts. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var WINDOWS = ['24h', '7d', '30d', '90d', 'all'];

  function mount(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, live = ui.sim.live(realm);
    var session = store.session;
    var st = session.stocks = session.stocks || { scope: 'index', id: '', variantId: null };
    // The chart style is a saved preference; the window starts at the saved default until you pick another.
    st.type = C.settings.get('marketChartType');
    if (!st.windowTouched) st.window = C.settings.get('marketWindow');
    var reduced = !!C.settings.get('marketReducedData');

    host.appendChild(h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', { text: 'Stocks' }),
      h('p', { text: 'Prices, trends and depth for collectible cards. This is market intelligence only: cards are not shares and nothing here can be traded.' })),
      h('div.mk-pagehead-actions', live
        ? ui.chip('Simulated trades', { tone: 'soft', icon: 'info', title: 'Every figure comes from trades completed in this simulation. Where there are none, nothing is drawn.' })
        : ui.chip('Illustrative', { tone: 'soft', icon: 'info', title: 'All figures are sample data for the preview' }))));

    // controls
    var controls = h('div.mk-stocks-controls');
    var scopeSwitch = ui.segmented({ label: 'Scope', value: st.scope, onChange: function (v) { st.scope = v; st.id = defaultId(v); st.variantId = null; draw(); buildPicker(); },
      options: [{ value: 'index', label: 'Market' }, { value: 'rarity', label: 'Rarity' }, { value: 'brand', label: 'Brand' }, { value: 'generation', label: 'Generation' }, { value: 'card', label: 'One GPU' }] });
    var pickerHost = h('div.mk-stocks-picker');
    var winSwitch = ui.segmented({ label: 'Time window', role: 'tablist', value: st.window, onChange: function (w) { st.window = w; st.windowTouched = true; draw(); },
      options: WINDOWS.map(function (w) { return { value: w, label: w === 'all' ? 'All' : w }; }) });
    var typeSwitch = ui.segmented({ label: 'Chart style', value: st.type, onChange: function (t) { st.type = t; C.settings.set('marketChartType', t); draw(); },
      options: [{ value: 'line', label: 'Line', icon: 'line' }, { value: 'candles', label: 'Candles', icon: 'candle' }] });
    controls.append(scopeSwitch, pickerHost, winSwitch, typeSwitch);
    host.appendChild(controls);

    function defaultId(scopeId) {
      if (scopeId === 'rarity') return 'rare';
      if (scopeId === 'brand') return (env.data.cards.find(function (c) { return c.brand; }) || {}).brand || '';
      if (scopeId === 'generation') return C.data.generations[0].id;
      if (scopeId === 'card') return env.data.cards.find(function (c) { return c.rarity === 'rare'; }).id;
      return '';
    }
    if (!st.id && st.scope !== 'index') st.id = defaultId(st.scope);
    function buildPicker() {
      ui.clear(pickerHost);
      if (st.scope === 'index') { pickerHost.appendChild(h('span.mk-muted', { text: 'Every card in the catalog' })); return; }
      var sel = h('select.mk-select', { 'aria-label': 'Choose ' + st.scope });
      if (st.scope === 'rarity') C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).filter(function (r) { return env.data.cards.some(function (c) { return c.rarity === r.id; }); }).forEach(function (r) { sel.appendChild(h('option', { value: r.id, text: r.name })); });
      else if (st.scope === 'brand') Array.from(new Set(env.data.cards.map(function (c) { return c.brand; }).filter(Boolean))).sort().forEach(function (b) { sel.appendChild(h('option', { value: b, text: b })); });
      else if (st.scope === 'generation') C.data.generations.forEach(function (g) { sel.appendChild(h('option', { value: g.id, text: g.name })); });
      else {
        C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).forEach(function (r) {
          var cards = env.data.cards.filter(function (c) { return c.rarity === r.id; }); if (!cards.length) return;
          var g = h('optgroup', { label: r.name });
          cards.forEach(function (c) { g.appendChild(h('option', { value: c.id, text: ui.identity(c, !!env.owned[c.id]).name })); });
          sel.appendChild(g);
        });
      }
      sel.value = st.id;
      sel.addEventListener('change', function () { st.id = sel.value; st.variantId = null; draw(); });
      pickerHost.appendChild(sel);
    }
    buildPicker();

    // layout
    var layout = h('div.mk-stocks');
    var main = h('section.mk-stocks-main'), rail = h('aside.mk-stocks-rail', { 'aria-label': 'Market numbers' });
    layout.append(main, rail);
    host.appendChild(layout);
    var title = h('div.mk-chart-title'), chart = ui.chart.create({ id: 'stocks', height: 360 });
    scope.add(function () { chart.destroy(); });
    main.append(title, chart);
    var leadersHost = h('section.mk-leaders', { 'aria-label': 'Leading cards' });
    host.appendChild(leadersHost);

    function statItems(res) {
      var a = res.aggregate, v = res.valuation;
      if (v) {
        return [
          { label: 'Average Value', value: ui.fmt.exact(v.average), help: 'average-value', note: v.basis === 'baseline' ? 'Baseline, no sales yet' : v.samples + ' recent sales' },
          { label: 'Last sale', value: v.lastSale ? ui.fmt.exact(v.lastSale) : 'No sales yet' },
          { label: '24 h change', node: ui.delta(v.change24h, { empty: 'No sales yet' }) }, { label: '7 d change', node: ui.delta(v.change7d, { empty: 'No sales yet' }) },
          { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: live ? (v.bidReal ? 'Open buy order' : 'Estimate: no buy order') : 'Hypothetical' },
          { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: live ? (v.askReal ? 'Open listing' : 'Estimate: none listed') : 'Hypothetical' },
          { label: 'Spread', value: ui.fmt.pct(v.spread, false, 1), help: 'spread', note: live && !v.spreadReal ? 'Estimate: no open order on one side' : null },
          { label: 'Target Buy', value: ui.fmt.exact(v.targetBuy), help: 'target-buy' }, { label: 'Target Sell', value: ui.fmt.exact(v.targetSell), help: 'target-sell' },
          { label: 'Volume, 24 h', value: v.samples ? v.volume24h + ' sold' : 'No sales yet', help: 'volume' }, { label: 'Volume, 7 d', value: v.samples ? v.volume7d + ' sold' : 'No sales yet' },
          { label: 'Volatility', value: v.volatility == null ? 'Not enough trades' : ui.fmt.pct(v.volatility, false, 1) + ' a trade', help: 'volatility' },
          { label: 'Liquidity', value: v.liquidity == null ? 'No trades yet' : Math.round(v.liquidity * 100) + ' of 100', help: 'liquidity' },
          { label: 'Confidence', value: { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' }[v.confidence], help: 'confidence' },
          live ? { label: 'Open now', value: (v.openAsks || 0) + ' listed · ' + (v.openBids || 0) + ' wanted' } : { label: 'Estimated sale time', value: '~' + v.windowHours + ' h' }
        ];
      }
      return [
        { label: 'Index level', value: res.closes.length ? res.closes[res.closes.length - 1].toFixed(1) : 'No trades yet', note: live ? 'Trade price against each card’s baseline, as 100' : 'Starts at 100 for the window' },
        { label: '24 h change', node: ui.delta(a.change24h) }, { label: '7 d change', node: ui.delta(a.change7d) },
        { label: 'Volume, 24 h', value: a.volume24h + ' sold', help: 'volume' }, { label: 'Volume, 7 d', value: a.volume7d + ' sold' },
        { label: 'Credits traded, 24 h', value: ui.fmt.exact(a.credits24h) },
        { label: 'Average spread', value: ui.fmt.pct(a.spread, false, 1), help: 'spread' }, { label: 'Volatility', value: a.volatility == null ? 'Not enough trades' : ui.fmt.pct(a.volatility, false, 1), help: 'volatility' },
        { label: 'Liquidity', value: a.liquidity == null ? 'No trades yet' : Math.round(a.liquidity * 100) + ' of 100', help: 'liquidity' },
        { label: 'Cards in scope', value: String(res.members) }, { label: 'Recent sales behind it', value: String(a.samples), help: 'confidence' }
      ];
    }

    function draw() {
      var empty = realm === 'global' && !store.session.showGlobalSample;
      st.window = st.window || '7d';
      winSwitch.set(st.window); typeSwitch.set(st.type); scopeSwitch.set(st.scope);
      ui.clear(rail); ui.clear(leadersHost); ui.clear(title);
      if (empty) {
        chart.hidden = true; title.hidden = true;
        rail.appendChild(ui.emptyState({ kind: 'offline', icon: 'trend', title: 'No Global Market data', body: 'Global Market is not connected. Its prices will be built only from real completed player sales, so there is nothing to chart yet. The Simulation has its own numbers.',
          actions: [{ label: 'Open Simulation', variant: 'primary', run: function () { store.setRealm('simulation'); } }] }));
        return;
      }
      chart.hidden = false; title.hidden = false;
      var res = ctx.api.stocksSync(realm, { scope: st.scope, id: st.id, variantId: st.variantId, window: st.window });
      if (res.empty) { ui.clear(rail); rail.appendChild(ui.emptyState({ title: 'Nothing in this scope', body: 'Choose another scope.' })); return; }
      var has = res.closes.length > 0;
      var last = has ? res.closes[res.closes.length - 1] : null, first = has ? res.candles[0].open : null, change = has && res.closes.length > 1 && first ? (last - first) / first : null;
      var heading = res.scope === 'card' ? ui.identity(env.cards[res.id], !!env.owned[res.id]).name : res.title;
      var nowText = !has ? (res.scope === 'card' && res.valuation ? ui.fmt.exact(res.valuation.average) : '—') : res.scope === 'card' ? ui.fmt.exact(last) : last.toFixed(1);
      title.append(h('div', ui.eyebrow(res.scope === 'index' ? 'Market index' : res.scope === 'card' ? 'Single GPU' : 'Group index'), h('h2', { text: heading })),
        h('div.mk-chart-now', h('span.mk-num.is-big', { text: nowText }), h('span.mk-muted', { text: !has && res.scope === 'card' ? 'Credits · baseline, no trades in this window' : res.unit }),
          ui.delta(change, { label: 'over ' + K().WINDOWS[st.window].label, empty: has ? 'One trade so far' : 'No trades' })));
      chart.update({ candles: res.candles, type: st.type, window: st.window, unit: res.unit, label: heading, live: live, now: res.now || 0, badge: live ? 'Simulated trades' : 'Illustrative' });
      if (live) {
        var cover = res.coverage ? 'The ' + res.tradesCounted + ' trades of this scope kept go back ' + ui.fmt.age((res.now - res.coverage.from) / 60000).replace(/ ago$/, '') + '.' : 'No trades have happened yet.';
        title.appendChild(h('p.mk-hint', { text: cover + ' Each point is a time-bucket of real completed trades; quiet periods are gaps, not guesses.' }));
      }
      rail.appendChild(h('div.mk-panel-head', h('h3', { text: 'The numbers' })));
      rail.appendChild(ui.statGrid(statItems(res), { cols: 2 }));
      if (res.scope === 'card') rail.appendChild(ui.button('Open this card’s market', { icon: 'forward', variant: 'secondary', onClick: function () { ui.go('card', { id: res.id, variant: st.variantId || '' }); } }));
      if (reduced) { leadersHost.appendChild(h('p.mk-hint', { text: 'Leader tables are hidden while Reduced data is on.' })); return; }
      // leaders
      var tabs = [['active', 'Most active'], ['gainers', 'Rising'], ['losers', 'Falling'], ['values', 'Closest to fair value']];
      var lead = res.leaders, current = 'active';
      var tabBar = ui.segmented({ label: 'Leading cards', role: 'tablist', value: current, onChange: function (v) { current = v; paint(); }, options: tabs.map(function (t) { return { value: t[0], label: t[1] }; }) });
      leadersHost.append(h('div.mk-section-head', h('h2', { text: 'Leading cards' }), tabBar));
      var tableHost = h('div.mk-leaders-table');
      leadersHost.appendChild(tableHost);
      function paint() {
        ui.clear(tableHost);
        var list = lead[current];
        if (!list.length) { tableHost.appendChild(h('p.mk-hint', { text: 'No cards in this scope have recent sales yet.' })); return; }
        var table = h('div.mk-table.is-leaders', { role: 'table', 'aria-label': 'Leading cards' });
        var head = h('div.mk-trow.mk-trow-head', { role: 'row' });
        ['Card', 'Average Value', '7 d change', '7 d volume', 'Confidence'].forEach(function (t) { head.appendChild(h('div.mk-tcell', { role: 'columnheader', text: t })); });
        table.appendChild(head);
        list.forEach(function (x) {
          var idn = ui.identity(x.card, !!env.owned[x.card.id]), row = h('div.mk-trow', { role: 'row' });
          var open = h('button.mk-tile-open', { type: 'button', 'aria-label': idn.name + ', open card market' }, h('span.mk-tile-name', { text: idn.name }), h('span.mk-tile-rarity', { data: { rarity: x.card.rarity }, text: idn.rarityName }));
          open.addEventListener('click', function () { ui.go('card', { id: x.card.id, variant: '' }); });
          row.append(h('div.mk-tcell', { role: 'cell' }, open), h('div.mk-tcell', { role: 'cell' }, ui.credits(x.valuation.average)), h('div.mk-tcell', { role: 'cell' }, ui.delta(x.valuation.change7d)),
            h('div.mk-tcell', { role: 'cell', text: x.valuation.volume7d + ' sold' }), h('div.mk-tcell', { role: 'cell', text: { high: 'High', medium: 'Medium', low: 'Low', none: 'None' }[x.valuation.confidence] }));
          table.appendChild(row);
        });
        tableHost.appendChild(table);
      }
      paint();
    }
    draw();
    // New trades redraw the chart in place; nothing else about the page moves.
    if (live) {
      var lastDrawn = -1;
      scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var rev = ctx.api.statusSync(realm).revision;
        if (rev === lastDrawn) return;
        lastDrawn = rev;
        var next = ctx.api.stocksSync(realm, { scope: st.scope, id: st.id, variantId: st.variantId, window: st.window });
        if (next && !next.empty && String(next.tradesCounted) !== String(chart.dataset.count)) { chart.dataset.count = String(next.tradesCounted); draw(); }
      }));
    }
    ctx.restoreScroll();
  }
  ui.pages.register('stocks', { nav: 'stocks', title: function () { return 'Stocks'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
