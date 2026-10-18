/* Cardable Market — Portfolio, Activity, Watchlist, Alerts, My listings and Market settings. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };

  function head(title, blurb, actions) {
    return h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', { text: title }), blurb ? h('p', { text: blurb }) : null), actions ? h('div.mk-pagehead-actions', actions) : null);
  }
  function tileEnv(ctx, env) { return { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: 0 }; }

  // ---- Portfolio ----
  function portfolio(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, live = ui.sim.live(realm);
    var p = ctx.api.portfolioSync(realm);
    host.appendChild(head('Portfolio', 'What you hold, at estimated value.',
      [ui.button('List a card', { variant: 'primary', icon: 'plus', onClick: function () { ui.go('compose', {}); } }),
        realm === 'global' && live && ui.online ? ui.button('Sell to the system', { variant: 'secondary', icon: 'coin', onClick: function () { ui.online.quickSellDialog(); } }) : null].filter(Boolean)));
    var sampleNote = null;
    if (p.demo) host.appendChild(h('div.mk-banner', { data: { tone: 'info' } }, icon('info'), h('span', { text: 'No cards yet, so this is a sample collection. Open a pack to see your own.' })));
    var w = p.wallet;
    var summary = h('section.mk-summary', { 'aria-label': 'Totals' });
    summary.appendChild(h('div.mk-summary-main', ui.eyebrow('Collection value'), h('div.mk-summary-value', ui.credits(p.total, { big: true })),
      h('p.mk-hint', { text: p.count + (p.count === 1 ? ' card' : ' cards') + ' at Average Value. The market may pay less.' })));
    var signed = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + ui.fmt.exact(Math.abs(n)); };
    if (live) {
      summary.appendChild(ui.statGrid([
        { label: 'Credits', value: ui.fmt.exact(w.balance), note: w.held ? ui.fmt.exact(w.held) + ' held by bids and orders' : 'None held' },
        { label: 'Realized profit', value: p.realized == null ? '—' : signed(p.realized), note: p.realizedCount ? p.realizedCount + (p.realizedCount === 1 ? ' sale' : ' sales') + ', after fees' : 'After you sell a card you bought', help: 'settlement' },
        { label: 'Unrealized change', value: p.unrealized == null ? '—' : signed(p.unrealized), note: p.unrealizedCount ? 'Across ' + p.unrealizedCount + ' cards you bought' : 'Pack cards have no cost basis' },
        { label: 'Fees paid', value: ui.fmt.exact(p.feesPaid), note: cfg().fee.label + ' on your sales' },
        { label: 'Quick Sell value', value: ui.fmt.exact(p.quickSellValue || 0), note: 'All your cards. A trader pays more.', help: 'quick-sell' }
      ], { cols: 2 }));
    } else summary.appendChild(ui.statGrid([
      { label: realm === 'global' ? 'Global wallet' : 'Credits', value: w.balance == null ? 'Not connected' : ui.fmt.exact(w.balance), note: w.note },
      { label: 'Realized profit', value: '—', note: 'After your first sale', help: 'settlement' },
      { label: 'Unrealized change', value: '—', note: 'Pack cards have no cost basis' },
      { label: 'Fees paid', value: '0', note: cfg().fee.label }
    ], { cols: 2 }));
    host.appendChild(summary);
    // The Global books: what is held back, what is marked and how sure that mark is, volume and fees, and the convention.
    if (live && p.server) {
      var books = h('section.mk-box', { 'aria-label': 'Global accounts' }, h('div.mk-panel-head', h('h3', { text: 'Your Global books' }),
        ui.chip(({ high: 'High', medium: 'Medium', low: 'Low', none: 'Estimate only' })[p.confidence] + ' confidence in the marks', { tone: 'soft', title: 'How much of the estimated value rests on recent player sales' })));
      var rs = p.reserved || { bids: { amount: 0 }, orders: { amount: 0 }, offers: { amount: 0 } };
      books.appendChild(ui.statGrid([
        { label: 'Held by open bids', value: ui.fmt.exact(rs.bids.amount) + ' Credits', note: rs.bids.count + (rs.bids.count === 1 ? ' auction' : ' auctions') },
        { label: 'Held by buy orders', value: ui.fmt.exact(rs.orders.amount) + ' Credits', note: rs.orders.count + (rs.orders.count === 1 ? ' order' : ' orders') },
        { label: 'Held by offers', value: ui.fmt.exact(rs.offers.amount) + ' Credits', note: rs.offers.count + (rs.offers.count === 1 ? ' offer' : ' offers') },
        { label: 'Cards in escrow', value: String(p.cardsInEscrow || 0), note: 'Listed or offered, locked until they resolve' },
        { label: 'Sold on the market', value: ui.fmt.exact(p.volumeSold) + ' Credits', note: p.tradesSold + (p.tradesSold === 1 ? ' sale' : ' sales') + ' · fees ' + ui.fmt.exact(p.feesPaid) },
        { label: 'Bought on the market', value: ui.fmt.exact(p.volumeBought) + ' Credits', note: p.tradesBought + (p.tradesBought === 1 ? ' purchase' : ' purchases') },
        { label: 'Cards with no cost basis', value: String(p.noCostBasis || 0), note: 'From your import or a swap. Never counted as free.' },
        { label: 'Quick Sell value', value: ui.fmt.exact(p.quickSellValue || 0), note: 'What the system would pay for all of it: a different number' }
      ], { cols: 2 }));
      books.appendChild(h('p.mk-hint', { text: p.convention }));
      var exp = h('div.mk-sim-actions');
      [['holdings', 'csv', 'Holdings (CSV)'], ['trades', 'csv', 'Trades (CSV)'], ['trades', 'json', 'Trades (JSON)']].forEach(function (x) {
        exp.appendChild(ui.button(x[2], { variant: 'secondary', size: 'sm', icon: 'save', onClick: function () {
          C.market.onlineProvider.downloadExport(x[0], x[1]).then(function (text) {
            var blob = new root.Blob([text], { type: x[1] === 'csv' ? 'text/csv' : 'application/json' }), url = root.URL.createObjectURL(blob);
            var a = h('a', { href: url, download: 'cardable-global-' + x[0] + '.' + x[1] }); root.document.body.appendChild(a); a.click(); a.remove();
            root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
            C.ui.toast('Exported your own ' + x[0] + '. It contains no account details.');
          }, function (e) { C.ui.toast(e.message || 'The export could not be made.', null, 'error'); });
        } }));
      });
      books.appendChild(exp);
      host.appendChild(books);
    }

    // exposure by rarity: a static stacked bar with a legend, no chart library
    var entries = Object.keys(p.byRarity).map(function (k) { return { name: k, value: p.byRarity[k] }; }).sort(function (a, b) { return b.value - a.value; });
    if (entries.length && p.total) {
      var exposure = h('section.mk-box', { 'aria-label': 'Exposure by rarity' }, h('div.mk-panel-head', h('h3', { text: 'Where the value sits' })));
      var bar = h('div.mk-stack-bar', { role: 'img', 'aria-label': entries.slice(0, 4).map(function (e) { return e.name + ' ' + Math.round(e.value / p.total * 100) + ' percent'; }).join(', ') });
      var legend = h('ul.mk-legend');
      entries.forEach(function (e, i) {
        bar.appendChild(h('i', { style: { flexGrow: String(e.value), '--i': i }, title: e.name + ': ' + ui.fmt.exact(e.value) }));
        legend.appendChild(h('li', h('i', { style: { '--i': i }, 'aria-hidden': 'true' }), h('span', { text: e.name }), h('span.mk-num', { text: Math.round(e.value / p.total * 100) + '%' })));
      });
      exposure.append(bar, legend);
      host.appendChild(exposure);
    }

    // holdings
    var sec = h('section.mk-section', { 'aria-label': 'Holdings' });
    var sortId = 'value';
    var sortSel = h('select.mk-select', { 'aria-label': 'Sort holdings' }, h('option', { value: 'value', text: 'Highest value' }), h('option', { value: 'rarity', text: 'Rarity' }), h('option', { value: 'change', text: 'Biggest 7 day move' }));
    var viewId = store.session.holdingsView || 'cards';
    var viewSwitch = ui.segmented({ label: 'Holdings view', value: viewId, onChange: function (v) { viewId = store.session.holdingsView = v; paint(); },
      options: [{ value: 'cards', label: 'Cards', icon: 'grid' }, { value: 'list', label: 'List', icon: 'list' }] });
    sec.appendChild(h('div.mk-section-head', h('h2', { text: 'Holdings' }), h('div.mk-section-tools', viewSwitch, sortSel)));
    var grid = h('div.mk-grid.is-holdings');
    var table = h('div.mk-table.is-holdings', { role: 'table', 'aria-label': 'Holdings' });
    sec.append(grid, table);
    function holdTile(hd, i) {
      var idn = ui.identity(hd.card, true), variant = hd.instance.variantId ? env.variants[hd.instance.variantId] : null;
      var tile = h('article.mk-tile.mk-hold', { data: { rarity: hd.card.rarity }, style: { '--mk-i': Math.min(i, 8), '--mk-rgb': ui.rarityRgb(hd.card.rarity), '--mk-tier': ui.rarityTier(hd.card.rarity) } });
      var art = h('div.mk-tile-art');
      art.appendChild(ctx.thumbs.mount(hd.card, hd.instance, { owned: true }));
      tile.appendChild(art);
      var body = h('div.mk-tile-body');
      var open = h('button.mk-tile-open', { type: 'button', 'aria-label': idn.name + ', open card market' }, h('span.mk-tile-name', { text: idn.name, title: idn.name }));
      open.addEventListener('click', function () { ui.go('card', { id: hd.card.id, variant: hd.instance.variantId || '' }); });
      body.appendChild(open);
      body.appendChild(h('div.mk-tile-meta', h('span.mk-tile-rarity', { data: { rarity: hd.card.rarity }, text: idn.rarityName }), variant ? h('span.mk-tile-variant', { text: variant.name }) : null));
      var price = h('div.mk-tile-price', ui.credits(hd.estimate, { big: true }), hd.valuation.change7d != null ? ui.delta(hd.valuation.change7d, { label: '7 d' }) : null);
      body.appendChild(price);
      if (live && hd.basis != null) body.appendChild(h('div.mk-tile-value', h('span.mk-muted', { text: 'paid ' + ui.fmt.exact(hd.basis) })));
      var sell = hd.listing && live
        ? ui.button('Listed', { variant: 'ghost', size: 'sm', icon: 'layers', onClick: function () { var id = String(hd.listing).replace(/^offer:/, ''); if (/^offer:/.test(hd.listing)) ui.go('activity', {}); else ui.go('listing', { id: id }); } })
        : ui.button('List', { variant: 'secondary', size: 'sm', icon: 'plus', onClick: function () { ui.go('compose', { instanceId: hd.instance.instanceId }); } });
      sell.classList.add('mk-hold-act');
      body.appendChild(h('div.mk-tile-foot', h('span.mk-mono.mk-serial', { text: String(hd.instance.serial).replace('CBL-', ''), title: 'Serial ' + hd.instance.serial }), sell));
      tile.appendChild(body);
      return tile;
    }
    function paint() {
      ui.releaseArt(grid, ctx.thumbs); ui.clear(grid); ui.clear(table);
      grid.hidden = viewId !== 'cards'; table.hidden = viewId === 'cards';
      if (viewId === 'cards') {
        var ordered = p.holdings.slice().sort(function (a, b) {
          if (sortId === 'rarity') return (b.valuation.tier - a.valuation.tier) || b.estimate - a.estimate;
          if (sortId === 'change') return Math.abs(b.valuation.change7d || 0) - Math.abs(a.valuation.change7d || 0);
          return b.estimate - a.estimate;
        });
        ordered.slice(0, 60).forEach(function (hd, i) { grid.appendChild(holdTile(hd, i)); });
        if (ordered.length > 60) grid.appendChild(h('p.mk-hint', { text: 'Showing the 60 most valuable of ' + ordered.length + ' cards.' }));
        return;
      }
      var hr = h('div.mk-trow.mk-trow-head', { role: 'row' });
      ['Card', 'Finish', 'Serial', 'Estimate', '7 d change', ''].forEach(function (t) { hr.appendChild(h('div.mk-tcell', { role: 'columnheader', text: t })); });
      table.appendChild(hr);
      var rows = p.holdings.slice();
      rows.sort(function (a, b) {
        if (sortId === 'rarity') return (b.valuation.tier - a.valuation.tier) || b.estimate - a.estimate;
        if (sortId === 'change') return Math.abs(b.valuation.change7d || 0) - Math.abs(a.valuation.change7d || 0);
        return b.estimate - a.estimate;
      });
      rows.slice(0, 60).forEach(function (hd) {
        var idn = ui.identity(hd.card, true), row = h('div.mk-trow', { role: 'row' });
        var open = h('button.mk-tile-open', { type: 'button', 'aria-label': idn.name + ', open card market' }, h('span.mk-tile-name', { text: idn.name }), h('span.mk-tile-rarity', { data: { rarity: hd.card.rarity }, text: idn.rarityName }));
        open.addEventListener('click', function () { ui.go('card', { id: hd.card.id, variant: hd.instance.variantId || '' }); });
        var sell = hd.listing && live
          ? ui.button('Listed', { variant: 'ghost', size: 'sm', icon: 'layers', onClick: function () { var id = String(hd.listing).replace(/^offer:/, ''); if (/^offer:/.test(hd.listing)) ui.go('activity', {}); else ui.go('listing', { id: id }); } })
          : ui.button('List', { variant: 'ghost', size: 'sm', icon: 'plus', onClick: function () { ui.go('compose', { instanceId: hd.instance.instanceId }); } });
        var worth = h('div.mk-tcell', { role: 'cell' }, ui.credits(hd.estimate));
        if (live && hd.basis != null) worth.appendChild(h('small.mk-muted', { text: 'paid ' + ui.fmt.exact(hd.basis), title: realm === 'global' ? 'What you paid for this exact card on Global Market' : 'What you paid for this exact card in the Simulation' }));
        else if (live && p.server && hd.noBasis) worth.appendChild(h('small.mk-muted', { text: 'No cost basis', title: 'This card came from your collection import or a swap, so its cost is unknown. It is not counted as free.' }));
        row.append(h('div.mk-tcell', { role: 'cell' }, open), h('div.mk-tcell', { role: 'cell', text: hd.instance.variantId ? (env.variants[hd.instance.variantId] || {}).name : 'Normal' }),
          h('div.mk-tcell', { role: 'cell' }, h('span.mk-mono', { text: hd.instance.serial })), worth,
          h('div.mk-tcell', { role: 'cell' }, ui.delta(hd.valuation.change7d, { empty: 'No sales yet' })), h('div.mk-tcell', { role: 'cell' }, sell));
        table.appendChild(row);
      });
      if (rows.length > 60) table.appendChild(h('p.mk-hint', { text: 'Showing the 60 most valuable of ' + rows.length + ' cards.' }));
    }
    sortSel.addEventListener('change', function () { sortId = sortSel.value; paint(); });
    paint();
    if (!p.holdings.length) sec.appendChild(ui.emptyState({ icon: 'cards', title: 'No cards to value yet', body: 'Open a pack, keep a card, and it appears here with an estimate.' }));
    host.appendChild(sec);

    // saved groups: named sets of exact cards, kept on this device
    var groupsBox = h('section.mk-section', { 'aria-label': 'Saved groups' }, h('div.mk-section-head', h('h2', { text: 'Groups' }),
      ui.button('New group', { variant: 'secondary', size: 'sm', icon: 'plus', onClick: function () { groupDialog(); } })));
    function paintGroups() {
      Array.from(groupsBox.querySelectorAll('.mk-group')).forEach(function (n) { n.remove(); });
      var list = store.groupsFor(realm);
      if (!list.length) { groupsBox.appendChild(h('p.mk-hint.mk-group', { text: 'Group cards you think of together, such as a set. Saved on this device.' })); return; }
      list.forEach(function (g) {
        var mine = p.holdings.filter(function (hd) { return g.ids.indexOf(hd.instance.instanceId) >= 0; });
        var total = mine.reduce(function (n, hd) { return n + hd.estimate; }, 0);
        groupsBox.appendChild(h('div.mk-group.mk-linkcard', ui.eyebrow(g.name), h('strong.mk-num', { text: ui.fmt.exact(total) + ' Credits' }),
          h('span', { text: mine.length + ' of ' + g.ids.length + ' cards still held' }),
          ui.button('Remove group', { variant: 'ghost', size: 'sm', onClick: function () { store.removeGroup(g.id); paintGroups(); } })));
      });
    }
    function groupDialog() {
      var chosen = {}, name = h('input.mk-input', { type: 'text', maxlength: '40', placeholder: 'Group name', 'aria-label': 'Group name' });
      var listEl = h('div.mk-picker.is-compact', { role: 'group', 'aria-label': 'Your cards' });
      p.holdings.slice().sort(function (a, b) { return b.estimate - a.estimate; }).slice(0, 80).forEach(function (hd) {
        var idn = ui.identity(hd.card, true), id = hd.instance.instanceId;
        var b = h('button.mk-pick-row', { type: 'button', role: 'checkbox', 'aria-checked': 'false' }, icon('plus'), h('span.mk-pick-name', { text: idn.name }), h('span.mk-mono', { text: hd.instance.serial.replace('CBL-', '') }), h('span.mk-num', { text: ui.fmt.exact(hd.estimate) }));
        b.addEventListener('click', function () { if (chosen[id]) delete chosen[id]; else chosen[id] = true; b.setAttribute('aria-checked', String(!!chosen[id])); });
        listEl.appendChild(b);
      });
      ui.sim.confirm({ title: 'New group', eyebrow: 'Portfolio', anchor: root.document.activeElement, body: h('div.mk-swapper', name, listEl), rows: [], confirmLabel: 'Save group', icon: 'check',
        note: 'A group is a label for you. It does not lock, list or change any card.',
        run: function () { var ids = Object.keys(chosen); if (!ids.length) return { ok: false, message: 'Choose at least one card.' }; store.addGroup(realm, name.value, ids); return { ok: true }; },
        success: function () { paintGroups(); } });
    }
    paintGroups();
    host.appendChild(groupsBox);

    // active listings and bids (sample)
    var act = h('section.mk-section', { 'aria-label': 'Active listings and bids' }, h('div.mk-section-head', h('h2', { text: 'Listings and bids' }), live ? null : ui.chip('Sample', { tone: 'soft', title: 'Invented sample activity' })));
    var grid = h('div.mk-triple');
    var open = p.sampleMine.filter(function (l) { return l.status === 'active' || l.status === 'ending'; });
    var bidCount = live ? p.bids.length : p.sampleBids.filter(function (b) { return b.state === 'leading' || b.state === 'outbid'; }).length;
    grid.appendChild(h('button.mk-linkcard', { type: 'button', on: { click: function () { ui.go('my-listings', {}); } } }, ui.eyebrow('Active listings'), h('strong.mk-num', { text: String(open.length) }), h('span', { text: 'Open in My listings' })));
    grid.appendChild(h('button.mk-linkcard', { type: 'button', on: { click: function () { ui.shell.goTab('activity'); } } }, ui.eyebrow(live ? 'Open bids' : 'Open bids'), h('strong.mk-num', { text: String(bidCount) }), h('span', { text: 'See Activity' })));
    grid.appendChild(h('button.mk-linkcard', { type: 'button', on: { click: function () { ui.go('watchlist', {}); } } }, ui.eyebrow('Watching'), h('strong.mk-num', { text: String(store.prefs.watch.length) }), h('span', { text: 'Open Watchlist' })));
    act.appendChild(grid);
    host.appendChild(act);
    if (live) {
      var seen = -1;
      ctx.scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var rev = ctx.api.statusSync(realm).revision, key = rev + ':' + ctx.api.walletSync(realm).balance;
        if (key === seen) return; seen = key;
        // Rebuild only when something about the player's own position changed.
        var next = ctx.api.portfolioSync(realm);
        var sig = next.total + '|' + next.count + '|' + next.listings.length + '|' + next.bids.length + '|' + next.realizedCount + '|' + next.wallet.held;
        if (portfolio.sig !== undefined && portfolio.sig !== sig) ui.shell.remount();
        portfolio.sig = sig;
      }));
      var first = ctx.api.portfolioSync(realm);
      portfolio.sig = first.total + '|' + first.count + '|' + first.listings.length + '|' + first.bids.length + '|' + first.realizedCount + '|' + first.wallet.held;
    }
    ctx.restoreScroll();
  }

  // ---- Activity ----
  function activity(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, live = ui.sim.live(realm);
    host.appendChild(head('Activity', 'Bids, listings, sales and watched cards.',
      [ui.button('Mark all read', { variant: 'secondary', icon: 'check', onClick: function () { store.markRead(items.map(function (n) { return n.id; })); paint(); } })]));
    if (realm === 'global' && ui.social) { var due = ui.social.reviewsDueBox(ctx); if (due) host.appendChild(due); }
    var data = ctx.api.activitySync(realm);
    var items = data.notifications;
    var filter = 'all';
    var filters = ui.segmented({ label: 'Filter activity', role: 'tablist', value: filter, onChange: function (v) { filter = v; paint(); },
      options: [{ value: 'all', label: 'All' }, { value: 'bids', label: 'Bids' }, { value: 'trades', label: 'Sales' }, { value: 'watch', label: 'Watchlist' }] });
    host.appendChild(h('div.mk-feedbar', filters));
    host.appendChild(h('p.mk-hint', icon('info'), h('span', { text: live ? 'Notices about your own bids, listings, offers and orders. Categories follow your choices in Market settings.' : 'Sample activity, generated for the preview. Notice categories follow your choices in Market settings.' })));
    var list = h('ol.mk-activity', { 'aria-label': 'Activity' });
    host.appendChild(list);
    var allowed = function (n) { var m = ui.activityMeta[n.kind]; return m && ({ bids: C.settings.get('marketNotifyBids'), trades: C.settings.get('marketNotifyTrades'), watch: C.settings.get('marketNotifyWatch') })[m.group]; };
    function paint() {
      ui.clear(list);
      var read = {}; store.prefs.notificationsRead.forEach(function (id) { read[id] = true; });
      var shown = items.filter(allowed).filter(function (n) { return filter === 'all' || ui.activityMeta[n.kind].group === filter; });
      if (!shown.length) {
        list.appendChild(h('li', ui.emptyState({ icon: 'activity', title: 'Nothing here yet', body: items.length && !items.filter(allowed).length ? 'Every notice category is switched off in Market settings.' : 'When something happens to a bid, a listing or a card you watch, it shows up here.',
          actions: [{ label: 'Market settings', variant: 'secondary', icon: 'sliders', run: function () { ui.go('settings', {}); } }] })));
        return;
      }
      shown.forEach(function (n) {
        var m = ui.activityMeta[n.kind], unread = !read[n.id];
        var listing = n.listingId ? ctx.api.listingSync(realm, n.listingId) : null, card = listing && listing.card ? ui.identity(listing.card, !!env.owned[listing.card.id]).name : 'A listing';
        var b = h('button.mk-activity-item', { type: 'button', data: { unread: String(unread), kind: n.kind } },
          h('span.mk-activity-mark', icon(m.icon)), h('span.mk-activity-copy', h('strong', { text: m.label + (unread ? ' · New' : '') }), h('span', { text: live ? n.text : n.text + ' ' + card + '.' })), h('span.mk-muted', { text: ui.fmt.age(n.minutesAgo) }));
        b.addEventListener('click', function () {
          store.markRead([n.id]);
          if (listing) ui.go('listing', { id: n.listingId });
          else if (n.offerId && n.listingId == null) ui.shell.goTab('trades');
          else C.ui.toast(live ? 'That listing closed a while ago and is no longer kept.' : 'That listing is no longer in the sample set.');
        });
        list.appendChild(h('li', b));
      });
    }
    paint();
    if (live) {
      // The rest of the market, for context: what other traders just did, never what you did.
      var around = h('section.mk-section', { 'aria-label': 'Around the market' }, h('div.mk-section-head', h('h2', { text: 'Around the market' })));
      var feedList = h('ol.mk-events.is-feed');
      around.appendChild(feedList);
      host.appendChild(around);
      var paintFeed = function () {
        ui.clear(feedList);
        var d = ctx.api.activitySync(realm).feed.filter(function (f) { return !f.you; }).slice(0, 14);
        if (!d.length) feedList.appendChild(h('li', h('span.mk-muted', { text: 'Nothing has happened yet.' })));
        d.forEach(function (f) { feedList.appendChild(h('li', icon('activity'), h('span', { text: f.text }), h('span.mk-muted', { text: ui.fmt.age(f.minutesAgo) }))); });
      };
      paintFeed();
      var lastNotices = items.length;
      scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var fresh = ctx.api.activitySync(realm);
        paintFeed();
        if (fresh.notifications.length !== lastNotices || fresh.notifications[0] && items[0] && fresh.notifications[0].id !== items[0].id) { items = fresh.notifications; lastNotices = items.length; paint(); }
      }));
    }
    scope.add(store.subscribe(function (what) { if (what === 'notifications') paint(); }));
    ctx.restoreScroll();
  }

  // ---- Watchlist ----
  function watchlist(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, live = ui.sim.live(realm);
    host.appendChild(head('Watchlist', 'Listings you are watching.', [ui.button('Find cards to watch', { variant: 'secondary', icon: 'search', onClick: function () { ui.shell.goTab('discover'); } })]));
    var ids = store.prefs.watch.slice();
    var items = ids.map(function (id) { var r = ctx.api.listingSync(realm, id) || ctx.api.listingSync(realm === 'simulation' ? 'global' : 'simulation', id); return r ? { id: id, listing: r.listing } : { id: id, gone: true }; });
    if (!items.length) {
      host.appendChild(ui.emptyState({ icon: 'bookmark', title: 'Nothing on your watchlist', body: 'Bookmark a listing to follow it. Its latest price shows here.',
        actions: [{ label: 'Browse Discover', variant: 'primary', icon: 'search', run: function () { ui.shell.goTab('discover'); } }] }));
      return;
    }
    var grid = h('div.mk-grid', { role: 'list' }), te = tileEnv(ctx, env);
    items.forEach(function (it, i) {
      if (it.gone) {
        var gone = h('article.mk-tile.is-gone', { role: 'listitem' }, h('div.mk-tile-body', h('strong', { text: 'No longer listed' }), h('p.mk-hint', { text: live ? 'This listing closed a while ago and is no longer kept.' : 'This listing is not in the sample set any more.' }),
          ui.button('Remove', { variant: 'ghost', size: 'sm', onClick: function () { store.toggleWatch(it.id); ui.shell.remount(); } })));
        grid.appendChild(gone); return;
      }
      te.index = i;
      var t = ui.listingTile({ listing: it.listing, rank: K().recommend(it.listing, env.ctx) }, te); t.setAttribute('role', 'listitem'); grid.appendChild(t);
    });
    host.appendChild(grid);
    ctx.restoreScroll();
  }

  // ---- Alerts ----
  function alerts(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, live = ui.sim.live(realm);
    host.appendChild(head('Alerts', live ? 'Hear about a price you are waiting for.' : 'Hear about a price you are waiting for (sample listings).'));
    var form = h('form.mk-alertform', { novalidate: true });
    var cardSel = h('select.mk-select', { 'aria-label': 'Card' }, h('option', { value: '', text: 'Choose a card…' }));
    C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).forEach(function (r) {
      var cards = env.data.cards.filter(function (c) { return c.rarity === r.id; }); if (!cards.length) return;
      var g = h('optgroup', { label: r.name });
      cards.forEach(function (c) { g.appendChild(h('option', { value: c.id, text: ui.identity(c, !!env.owned[c.id]).name, props: { selected: ctx.params.cardId === c.id } })); });
      cardSel.appendChild(g);
    });
    var price = h('input.mk-input', { type: 'number', min: '1', inputmode: 'numeric', placeholder: 'Price in Credits', 'aria-label': 'Alert price' });
    var kind = h('select.mk-select', { 'aria-label': 'Alert when' }, h('option', { value: 'below', text: 'A listing is at or below' }), h('option', { value: 'avg-below', text: 'Average Value falls to' }));
    var err = h('small.mk-field-error', { role: 'alert', hidden: true });
    var submit = ui.button('Create alert', { variant: 'primary', icon: 'bell' }); submit.type = 'submit';
    form.append(h('div.mk-alertrow', cardSel, kind, price, submit), err);
    host.appendChild(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = Number(price.value);
      if (!cardSel.value) { err.textContent = 'Choose a card first.'; err.hidden = false; cardSel.focus(); return; }
      if (!(n >= 1) || n !== Math.floor(n)) { err.textContent = 'Enter a whole price of at least 1 Credit.'; err.hidden = false; price.focus(); return; }
      err.hidden = true;
      // On Global a "listing at or below" alert lives on the server, so it is checked when a player lists, not only when
      // this page is open. The Average Value alert is evaluated here, from the market numbers.
      if (realm === 'global' && live && kind.value === 'below' && C.market.onlineProvider) {
        C.market.onlineProvider.createAlert({ kind: 'price', cardId: cardSel.value, maxPrice: n, label: '' }).then(function (r) {
          C.ui.toast(r.ok ? 'Alert saved on Global Market. A match waits in your Activity inbox.' : r.message, null, r.ok ? 'info' : 'error');
          price.value = ''; paint();
        });
        return;
      }
      store.addAlert({ cardId: cardSel.value, kind: kind.value, value: n });
      C.ui.toast('Alert created'); price.value = '';
      paint();
    });
    var list = h('ul.mk-alerts', { 'aria-label': 'Your alerts' });
    host.appendChild(list);
    var serverAlerts = function () { return realm === 'global' && live && C.market.onlineProvider ? C.market.onlineProvider.alerts().items : []; };
    scope.add(store.subscribe(function (what) { if (what === 'sim' && serverAlerts().length !== list.querySelectorAll('[data-server="1"]').length) paint(); }));
    function paint() {
      ui.clear(list);
      serverAlerts().forEach(function (a) {
        var card = a.cardId ? env.cards[a.cardId] : null, idn = card ? ui.identity(card, !!env.owned[a.cardId]) : null;
        var what = a.kind === 'price' ? 'Listing at or below ' + ui.fmt.exact(a.maxPrice) + ' Credits' : 'Saved search' + (a.label ? ': ' + a.label : '');
        var row = h('li.mk-alert', { data: { state: 'waiting', server: '1' } }, h('span.mk-activity-mark', icon('bell')),
          h('div.mk-activity-copy', h('strong', { text: idn ? idn.name : 'Any matching listing' }), h('span', { text: what + ' · Checked by Global Market when a player lists. A match waits in your inbox.' })));
        row.appendChild(ui.iconButton('trash', 'Delete this alert', function () { C.market.onlineProvider.deleteAlert(a.id).then(function () { paint(); }); }));
        list.appendChild(row);
      });
      var items = store.prefs.alerts;
      if (!items.length && !serverAlerts().length) { list.appendChild(h('li', ui.emptyState({ icon: 'bell', title: 'No alerts yet', body: live ? 'Pick a card and a price above. When an open listing meets it, the alert shows as triggered here.' : 'Pick a card and a price above. When a sample listing meets it, the alert shows as triggered here.' }))); return; }
      items.forEach(function (a) {
        var card = env.cards[a.cardId]; if (!card) return;
        var idn = ui.identity(card, !!env.owned[a.cardId]);
        var match = null;
        if (a.kind === 'below') {
          var hit = (ctx.api.cardMarketSync(realm, a.cardId, null) || { listings: [] }).listings.filter(function (l) { return l.format !== 'swap' && K().currentPrice(l) <= a.value; }).sort(function (x, y) { return K().currentPrice(x) - K().currentPrice(y); })[0];
          match = hit || null;
        } else {
          var v = live ? ctx.api.valuationSync(realm, { cardId: a.cardId }) : env.data.valuation({ cardId: a.cardId });
          match = v && v.average <= a.value ? { avg: v.average } : null;
        }
        var row = h('li.mk-alert', { data: { state: match ? 'triggered' : 'waiting' } },
          h('span.mk-activity-mark', icon(match ? 'check' : 'clock')),
          h('div.mk-activity-copy', h('strong', { text: idn.name }), h('span', { text: (a.kind === 'below' ? 'Listing at or below ' : 'Average Value at or below ') + ui.fmt.exact(a.value) + ' Credits · ' + (match ? 'Triggered' : 'Waiting') })));
        if (match && match.id) row.appendChild(ui.button('View listing', { variant: 'secondary', size: 'sm', onClick: function () { ui.go('listing', { id: match.id }); } }));
        row.appendChild(ui.iconButton('trash', 'Delete alert for ' + idn.name, function () { store.removeAlert(a.id); paint(); }));
        list.appendChild(row);
      });
    }
    paint();
    ctx.restoreScroll();
  }

  // ---- My listings ----
  function myListings(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, live = ui.sim.live(realm), scope = ctx.scope;
    host.appendChild(head('My listings', 'What you have put up, and how it ended.', [ui.button('List a card', { variant: 'primary', icon: 'plus', onClick: function () { ui.go('compose', {}); } })]));
    if (!live) host.appendChild(h('div.mk-banner', { data: { tone: 'info' } }, icon('info'), h('span', { text: 'Sample listings, not yours. Yours appear here once listing is live.' })));
    var act = ctx.api.activitySync(realm), mine = act.mine;
    var tab = live && mine.every(function (l) { return !(l.status === 'active' || l.status === 'ending'); }) && mine.length ? 'ended' : 'active';
    var tabs = ui.segmented({ label: 'Listing state', role: 'tablist', value: tab, onChange: function (v) { tab = v; paint(); },
      options: live ? [{ value: 'active', label: 'Active' }, { value: 'ended', label: 'Ended' }, { value: 'orders', label: 'Buy orders' }, { value: 'offers', label: 'Swap offers' }]
        : [{ value: 'active', label: 'Active' }, { value: 'ended', label: 'Ended' }] });
    host.appendChild(h('div.mk-feedbar', tabs));
    var list = h('div.mk-mylist');
    host.appendChild(list);
    function ordersView() {
      var orders = act.orders.filter(function (o) { return o.status === 'open'; });
      if (!orders.length) { list.appendChild(ui.emptyState({ icon: 'tag', title: 'No open buy orders', body: 'Open any card’s market and place a buy order. It waits for a listing at or under your price.' })); return; }
      orders.forEach(function (o) {
        var card = env.cards[o.cardId], idn = card ? ui.identity(card, !!env.owned[o.cardId]) : { name: o.cardId, rarityName: '' };
        var row = h('article.mk-myrow', { data: { status: 'active' } },
          h('div.mk-myrow-copy', h('strong', { text: idn.name }), h('span', { text: 'Up to ' + ui.fmt.exact(o.maxPrice) + ' Credits' + (o.anyFinish ? ' · any finish' : ' · ' + (o.variantId ? (env.variants[o.variantId] || {}).name : 'normal finish')) })),
          h('div.mk-myrow-state', ui.chip('Open', { tone: 'soft' }), h('span.mk-muted', { text: ui.fmt.duration(o.minutesLeft) + ' left' })),
          h('div.mk-myrow-actions', ui.button('Card market', { variant: 'secondary', size: 'sm', onClick: function () { ui.go('card', { id: o.cardId, variant: o.variantId || '' }); } }),
            ui.button('Cancel order', { variant: 'ghost', size: 'sm', onClick: function () { ctx.api.cancelOrder(realm, o.id).then(function (x) { C.ui.toast(x.ok ? 'Buy order cancelled' : x.message, null, x.ok ? 'info' : 'error'); act = ctx.api.activitySync(realm); paint(); ui.shell.refresh(); }); } })));
        list.appendChild(row);
      });
    }
    function offersView() {
      var offers = act.offers.filter(function (o) { return o.fromYou; });
      if (!offers.length) { list.appendChild(ui.emptyState({ icon: 'swap', title: 'No swap offers yet', body: 'Offer one of your cards on a swap listing under Trades.' })); return; }
      offers.slice(0, 40).forEach(function (o) {
        var listing = ctx.api.listingSync(realm, o.listingId), card = listing && listing.card ? ui.identity(listing.card, !!env.owned[listing.card.id]).name : 'a listing';
        var giveNames = o.give.map(function (g) { var c = env.cards[g.cardId]; return c ? ui.identity(c, true).name : g.cardId; }).join(', ');
        var row = h('article.mk-myrow', { data: { status: o.status } },
          h('div.mk-myrow-copy', h('strong', { text: giveNames + (o.cash ? ' + ' + ui.fmt.exact(o.cash) + ' Credits' : '') }), h('span', { text: 'For ' + card })),
          h('div.mk-myrow-state', ui.chip({ pending: 'Waiting', countered: 'Countered', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired', settling: 'Settling' }[o.status] || o.status, { tone: o.status === 'accepted' ? 'good' : 'soft' }),
            h('span.mk-muted', { text: ui.fmt.age(o.minutesAgo) })),
          h('div.mk-myrow-actions', listing ? ui.button('Open listing', { variant: 'secondary', size: 'sm', onClick: function () { ui.go('listing', { id: o.listingId }); } }) : null));
        list.appendChild(row);
      });
    }
    function paint() {
      ui.clear(list);
      if (live && tab === 'orders') { ordersView(); return; }
      if (live && tab === 'offers') { offersView(); return; }
      var items = mine.filter(function (l) { return tab === 'active' ? l.status === 'active' || l.status === 'ending' : l.status !== 'active' && l.status !== 'ending'; });
      if (!items.length) { list.appendChild(ui.emptyState({ icon: 'layers', title: tab === 'active' ? 'No active listings' : 'Nothing has ended yet', body: 'List a card to see it here.' })); return; }
      items.forEach(function (l) {
        var card = env.cards[l.card.cardId], idn = ui.identity(card, true), price = K().currentPrice(l);
        var row = h('article.mk-myrow', { data: { status: l.status } });
        var art = h('div.mk-myrow-art'); art.appendChild(ctx.thumbs.mount(card, { instanceId: 'mk-' + l.id, cardId: card.id, serial: l.card.serial, variantId: l.card.variantId, cardSkinId: l.card.cardSkinId, seen: true }, { owned: true }));
        var copy = h('div.mk-myrow-copy', h('strong', { text: idn.name }), h('span', { text: ui.formatDef(l.format).label + ' · ' + idn.rarityName }), h('span.mk-mono', { text: l.card.serial }));
        var state = h('div.mk-myrow-state');
        var label = { active: 'Open', ending: 'Ending soon', sold: 'Sold for ' + ui.fmt.exact(l.soldFor || price), expired: 'Ended unsold', cancelled: 'Withdrawn', settling: 'Settling' }[l.status];
        state.append(ui.chip(label, { tone: l.status === 'sold' ? 'good' : l.status === 'expired' || l.status === 'cancelled' ? 'warn' : 'soft', icon: l.status === 'sold' ? 'check' : l.status === 'expired' || l.status === 'cancelled' ? 'clock' : null }));
        if (l.status === 'active' || l.status === 'ending') state.appendChild(h('span.mk-muted', { text: l.format === 'auction' ? l.auction.bids + ' bids · ' + ui.fmt.duration(l.endsMin) + ' left' : l.format === 'swap' ? 'Open to offers' : ui.fmt.exact(price) + ' Credits' }));
        else state.appendChild(h('span.mk-muted', { text: 'Ended ' + ui.fmt.age(l.endedMin || 0) }));
        var actions = h('div.mk-myrow-actions',
          ui.button('Open', { variant: 'secondary', size: 'sm', onClick: function () { ui.go('listing', { id: l.id }); } }),
          l.status === 'active' || l.status === 'ending'
            ? (live
              ? ui.button('Withdraw', Object.assign({ variant: 'ghost', size: 'sm', icon: 'trash' }, l.format === 'auction' && l.auction.bids ? { disabled: true, reason: 'An auction with bids cannot be withdrawn.' } : { onClick: function () {
                ui.sim.confirm({ title: 'Withdraw this listing', eyebrow: 'Your listing', rows: [{ label: 'Card', value: idn.name }, { label: 'After', value: 'Back in your collection, unlocked' }], note: 'No fee is charged for withdrawing.', confirmLabel: 'Withdraw', icon: 'trash',
                  run: function () { return ctx.api.cancelListing(realm, l.id); }, success: function () { C.ui.toast('Listing withdrawn'); act = ctx.api.activitySync(realm); mine = act.mine; paint(); ui.shell.refresh(); } });
              } }))
              : ui.button('Cancel listing', { variant: 'ghost', size: 'sm', disabled: true, reason: 'Preview: cancelling arrives with the simulator.' }))
            : ui.button(live ? 'List again' : 'Relist as a draft', { variant: 'ghost', size: 'sm', icon: 'plus', onClick: function () { ui.go('compose', { cardId: l.card.cardId }); } }));
        row.append(art, copy, state, actions);
        list.appendChild(row);
      });
    }
    paint();
    if (live) {
      // A sale, an ended auction or a new offer changes this list; rebuild it when the set of listings changes.
      var sig = function (a) { return a.mine.map(function (l) { return l.id + l.status + (l.auction ? l.auction.bids : ''); }).join(',') + '|' + a.orders.length + '|' + a.offers.map(function (o) { return o.id + o.status; }).join(','); };
      var lastSig = sig(act);
      scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var fresh = ctx.api.activitySync(realm);
        if (sig(fresh) !== lastSig) { lastSig = sig(fresh); act = fresh; mine = fresh.mine; paint(); }
      }));
    }
    ctx.restoreScroll();
  }

  // ---- Market settings ----
  function settings(ctx) {
    var host = ctx.host, scope = ctx.scope;
    host.appendChild(head('Market settings', 'Saved with Cardable’s settings.',
      [ui.button('Open in Settings', { variant: 'secondary', icon: 'sliders', onClick: function () { ui.shell.close(); C.openSettings('Market'); } })]));
    var page = C.data.settingsPages.find(function (p) { return p.id === 'Market'; });
    var advanced = C.settings.get('marketMode') === 'advanced';
    var layout = h('div.mk-settings');
    host.appendChild(layout);
    layout.appendChild(ui.online.settingsPanel(ctx));
    if (ctx.realm === 'global' && ui.social) layout.appendChild(ui.social.settingsPanel(ctx));
    if (ui.sim.live('simulation')) layout.appendChild(ui.sim.settingsPanel(ctx));
    page.sections.forEach(function (section) {
      var visible = section.keys.filter(function (key) { return advanced || !C.settingsSchema.entries[key].advanced; });
      if (!visible.length) return;
      var card = h('section.mk-box', h('div.mk-panel-head', h('h3', { text: section.title })));
      visible.forEach(function (key) {
        var d = C.settingsSchema.entries[key];
        var row = h('div.mk-setting', { data: { key: key } });
        var copy = h('div.mk-setting-copy', h('span.mk-setting-label', { id: 'mks-' + key, text: d.label }), h('span.mk-hint', { text: d.helper }));
        var control;
        if (typeof d.defaultValue === 'boolean') {
          var input = h('input', { type: 'checkbox', role: 'switch', 'aria-labelledby': 'mks-' + key, props: { checked: !!C.settings.get(key) } });
          control = h('label.mk-switch', input, h('span.mk-switch-track', { 'aria-hidden': 'true' }, h('i')));
          input.addEventListener('change', function () { C.settings.set(key, input.checked); });
          scope.add(C.settings.onChange(key, function () { input.checked = !!C.settings.get(key); }));
        } else {
          var seg = ui.segmented({ label: d.label, value: C.settings.get(key), onChange: function (v) { C.settings.set(key, v); },
            options: d.choices.map(function (c) { return { value: c, label: d.format ? d.format(c) : String(c).replace(/^./, function (x) { return x.toUpperCase(); }) }; }) });
          control = seg;
          scope.add(C.settings.onChange(key, function () { seg.set(C.settings.get(key)); }));
        }
        row.append(copy, control);
        card.appendChild(row);
      });
      if (section.title === 'Notch') card.appendChild(h('div.mk-setting', h('div.mk-setting-copy', h('span.mk-setting-label', { text: 'What it covers' }), h('span.mk-hint', { text: 'Turn kinds of news on or off and set their priority.' })), ui.button('Customize', { variant: 'secondary', icon: 'sliders', onClick: function () { ui.notchSettings.open(); } })));
      layout.appendChild(card);
    });

    // preview data
    var live = ui.sim.live('simulation');
    var data = h('section.mk-box', h('div.mk-panel-head', h('h3', { text: live ? 'Watchlist, views and drafts' : 'Preview data' })));
    data.appendChild(h('p.mk-hint', { text: 'Watchlist, saved views, alerts and drafts are stored apart from your collection. Clearing them never touches your cards or Credits' + (live ? ' or resets Local.' : '.') }));
    data.appendChild(ui.statGrid([{ label: 'Watching', value: String(store.prefs.watch.length) }, { label: 'Saved views', value: String(store.prefs.saved.length) }, { label: 'Alerts', value: String(store.prefs.alerts.length) }, { label: 'Drafts', value: String(Object.keys(store.prefs.drafts).length) }], { cols: 4 }));
    var clear = ui.button(live ? 'Clear watchlist and drafts' : 'Clear preview data', { variant: 'secondary', icon: 'trash' });
    var armed = false, timer = 0;
    clear.addEventListener('click', function () {
      if (!armed) { armed = true; clear.querySelector('span').textContent = 'Click again to clear'; clear.dataset.variant = 'danger'; timer = root.setTimeout(function () { armed = false; clear.querySelector('span').textContent = live ? 'Clear watchlist and drafts' : 'Clear preview data'; clear.dataset.variant = 'secondary'; }, 4000); return; }
      root.clearTimeout(timer); store.clearPreview(); C.ui.toast(live ? 'Watchlist and drafts cleared' : 'Preview data cleared'); ui.shell.remount();
    });
    scope.add(function () { root.clearTimeout(timer); });
    data.appendChild(clear);
    if (!store.persistent) data.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: 'Storage is unavailable here, so these choices last for this session only.' }));
    layout.appendChild(data);

    // Invented sample listings are a developer aid (?dev=1). In play, Global Market is empty and says so.
    var devMode = false;
    try { devMode = new root.URLSearchParams(root.location.search).get('dev') === '1'; } catch (_) { devMode = false; }
    if (devMode) {
      var realmCard = h('section.mk-box', h('div.mk-panel-head', h('h3', { text: 'Global Market preview (developer)' })));
      realmCard.appendChild(h('p.mk-hint', { text: 'Global is not connected, so it has no listings. Sample listings can be switched on; they are labelled and never count as volume.' }));
      var sample = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'Show sample listings in Global Market', props: { checked: !!store.session.showGlobalSample } });
      sample.addEventListener('change', function () { store.session.showGlobalSample = sample.checked; store.emit('realm'); });
      realmCard.appendChild(h('div.mk-setting', h('div.mk-setting-copy', h('span.mk-setting-label', { text: 'Sample listings in Global Market' }), h('span.mk-hint', { text: 'Off by default. Resets each time you open the game.' })), h('label.mk-switch', sample, h('span.mk-switch-track', { 'aria-hidden': 'true' }, h('i')))));
      layout.appendChild(realmCard);
    }

    if (advanced) {
      var tuning = h('section.mk-box', h('div.mk-panel-head', h('h3', { text: 'Provisional tuning' })));
      tuning.appendChild(h('p.mk-hint', { text: 'Starting values for the beta economy. Reversible, and tuned against real play.' }));
      var dl = h('dl.mk-sumrows');
      cfg().tuning.forEach(function (t) { dl.appendChild(h('div', h('dt', { text: t.key }), h('dd', { text: String(t.value) + ' · ' + t.note }))); });
      tuning.appendChild(dl);
      layout.appendChild(tuning);
    }
    ctx.restoreScroll();
  }

  ui.pages.register('portfolio', { nav: 'portfolio', title: function () { return 'Portfolio'; }, mount: portfolio });
  ui.pages.register('activity', { nav: 'activity', title: function () { return 'Activity'; }, mount: activity });
  ui.pages.register('watchlist', { nav: function () { return 'discover'; }, title: function () { return 'Watchlist'; }, mount: watchlist });
  ui.pages.register('alerts', { nav: function () { return 'activity'; }, title: function () { return 'Alerts'; }, mount: alerts });
  ui.pages.register('my-listings', { nav: function () { return 'portfolio'; }, title: function () { return 'My listings'; }, mount: myListings });
  ui.pages.register('settings', { nav: function () { return 'discover'; }, title: function () { return 'Market settings'; }, mount: settings });
})(window.Cardable = window.Cardable || {}, window);
