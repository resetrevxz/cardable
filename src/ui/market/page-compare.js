/* Cardable Market — side-by-side comparison of two to four cards.
 * Every column is one exact card and finish, read the same way as its own page: the same analytics, the same words for
 * a missing number. Nothing is ranked or recommended here; it only lines the numbers up. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store;

  function keyOf(realm, cardId, variantId) { return realm + '|' + cardId + '|' + (variantId || ''); }
  function toggle(realm, cardId, variantId) {
    var added = store.toggleCompare({ key: keyOf(realm, cardId, variantId), realm: realm, cardId: cardId, variantId: variantId || null });
    if (added === false) C.ui.toast('Compare holds up to four cards. Remove one first.', null, 'error');
    else C.ui.toast(added ? 'Added to Compare' : 'Removed from Compare');
    return added;
  }

  var ROWS = [
    ['Average Value', function (v) { return v.averageValue != null ? ui.fmt.exact(v.averageValue) : (v.basis === 'baseline' ? 'No sales yet' : ui.fmt.exact(v.average)); }],
    ['Fair value (model)', function (v) { return ui.fmt.exact(v.fairValue != null ? v.fairValue : v.average); }],
    ['Last sold', function (v) { return v.lastSale ? ui.fmt.exact(v.lastSale) : 'No sales yet'; }],
    ['7 d change', function (v) { return v.change7d == null ? 'No comparison yet' : ui.fmt.pct(v.change7d, true, 1); }],
    ['Volume, 7 d', function (v) { return v.volume7d ? v.volume7d + ' sold' : 'No sales'; }],
    ['Lowest ask', function (v) { return ui.fmt.exact(v.lowestAsk) + (v.askReal ? '' : ' (estimate)'); }],
    ['Best bid', function (v) { return ui.fmt.exact(v.bestBid) + (v.bidReal ? '' : ' (estimate)'); }],
    ['Spread', function (v) { return ui.fmt.pct(v.spread, false, 1) + (v.spreadReal ? '' : ' (estimate)'); }],
    ['Target buy', function (v) { return v.targetBuyLow != null ? ui.fmt.exact(v.targetBuyLow) + ' to ' + ui.fmt.exact(v.targetBuy) : ui.fmt.exact(v.targetBuy); }],
    ['Target sell', function (v) { return v.targetSellHigh != null ? ui.fmt.exact(v.targetSell) + ' to ' + ui.fmt.exact(v.targetSellHigh) : ui.fmt.exact(v.targetSell); }],
    ['Liquidity', function (v) { return v.liquidity == null ? 'No trades yet' : Math.round(v.liquidity * 100) + ' of 100'; }],
    ['Volatility', function (v) { return v.volatility == null ? 'Not enough trades' : ui.fmt.pct(v.volatility, false, 1); }],
    ['Confidence', function (v) { return { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' }[v.confidence] || '—'; }],
    ['Listed now', function (v) { return String(v.supply != null ? v.supply : v.openAsks || 0) + ' open'; }]
  ];

  function mount(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope;
    var items = store.compareList().filter(function (x) { return x.realm === realm; });
    host.appendChild(h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', icon('cards')), h('span', { text: 'Compare' })),
      h('p', { text: 'Two to four cards, side by side.' })),
      h('div.mk-pagehead-actions', items.length ? ui.button('Clear', { variant: 'ghost', onClick: function () { store.clearCompare(); ui.shell.remount(); } }) : null)));
    if (items.length < 1) {
      host.appendChild(ui.emptyState({ icon: 'cards', title: 'Nothing to compare yet', body: 'Open a card’s market or its Prices view and choose Compare. Up to four.',
        actions: [{ label: 'Open Prices', variant: 'primary', run: function () { ui.shell.goTab('stocks'); } }] }));
      ctx.restoreScroll();
      return;
    }
    var table = h('div.mk-compare', { role: 'table', 'aria-label': 'Cards compared', style: { '--cols': String(items.length) } });
    function paint() {
      ui.clear(table);
      var head = h('div.mk-crow.mk-crow-head', { role: 'row' }, h('div.mk-ccell', { role: 'columnheader', text: '' }));
      var cols = items.map(function (it) {
        var res = ctx.api.cardMarketSync(realm, it.cardId, it.variantId), card = env.cards[it.cardId], idn = ui.identity(card, !!env.owned[it.cardId]);
        var name = h('div.mk-ccell', { role: 'columnheader' }, h('strong', { text: idn.name }),
          h('span.mk-muted', { text: idn.rarityName + ' · ' + (it.variantId ? (env.variants[it.variantId] || {}).name : 'Normal finish') }),
          h('div.mk-ccell-actions', ui.button('Open', { variant: 'ghost', size: 'sm', onClick: function () { ui.go('card', { id: it.cardId, variant: it.variantId || '' }); } }),
            ui.button('Remove', { variant: 'ghost', size: 'sm', onClick: function () { store.toggleCompare(it); ui.shell.remount(); } })));
        head.appendChild(name);
        return res ? res.valuation : null;
      });
      table.appendChild(head);
      ROWS.forEach(function (r) {
        var row = h('div.mk-crow', { role: 'row' }, h('div.mk-ccell.mk-clabel', { role: 'rowheader', text: r[0] }));
        cols.forEach(function (v) { row.appendChild(h('div.mk-ccell.mk-num', { role: 'cell', text: v ? r[1](v) : 'Loading' })); });
        table.appendChild(row);
      });
      var own = h('div.mk-crow', { role: 'row' }, h('div.mk-ccell.mk-clabel', { role: 'rowheader', text: 'You own' }));
      items.forEach(function (it) { own.appendChild(h('div.mk-ccell.mk-num', { role: 'cell', text: String(env.owned[it.cardId] || 0) })); });
      table.appendChild(own);
    }
    paint();
    host.appendChild(table);
    host.appendChild(h('p.mk-hint', { text: ui.sim.isGlobal(realm) ? 'Figures come only from completed player sales; a card with none shows its baseline and says so.' : 'Figures come from trades completed in this simulation.' }));
    scope.add(store.subscribe(function (what) { if (what === 'sim' || what === 'compare') paint(); }));
    ctx.restoreScroll();
  }
  ui.compare = { toggle: toggle, has: function (realm, cardId, variantId) { return store.compareList().some(function (x) { return x.key === keyOf(realm, cardId, variantId); }); } };
  ui.pages.register('compare', { nav: function () { return 'stocks'; }, title: function () { return 'Compare'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
