/* Cardable Market — UI gallery section (?dev=1&gallery=ui).
 * Every Market primitive appears here in each state, from the same builders the shell uses, so a pattern is
 * reviewed once and reused. Specimens are sample data and perform no action. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, K = function () { return C.market.core; };

  function specimens(section, held) {
    var scope = ui.createScope();
    held.push({ destroy: function () { scope.destroy(); }, update: function () { return false; } });
    var host = h('div.mk-specimens');
    section.appendChild(host);
    var env = (function () { var d = C.market.api.data(), ctx = C.market.api.context('simulation'); return { cards: ctx.cards, owned: ctx.owned, variants: ctx.variants, thumbs: ui.thumbs(null, scope), index: 0, data: d, ctx: ctx }; })();
    function group(title, note) { var g = h('section.mk-spec-group', h('h3', { text: title }), note ? h('p.mk-hint', { text: note }) : null); host.appendChild(g); return g; }
    function row(parent) { var r = h('div.mk-spec-row'); parent.appendChild(r); return r; }
    var d = env.data, sim = d.listings.simulation.filter(function (l) { return l.status === 'active' || l.status === 'ending'; });

    // tiles
    var tiles = group('Listing tiles', 'Real card art leads. Format, time, price, value against Average Value, reason, seller and serial.');
    var grid = h('div.mk-grid.is-compact'); tiles.appendChild(grid);
    ['buy-now', 'auction', 'swap'].forEach(function (f) {
      var l = sim.find(function (x) { return x.format === f; });
      if (l) grid.appendChild(ui.listingTile({ listing: l, rank: K().recommend(l, env.ctx) }, env));
    });
    var variant = sim.find(function (x) { return x.card.variantId; });
    if (variant) grid.appendChild(ui.listingTile({ listing: variant, rank: K().recommend(variant, env.ctx) }, env));

    // atoms
    var atoms = group('Price, change and value', 'Direction is a shape and a word as well as a colour.');
    var r1 = row(atoms);
    r1.append(ui.credits(1240, { big: true }), ui.credits(86));
    [0.082, -0.134, 0, null].forEach(function (v) { r1.appendChild(ui.delta(v, { label: '24 h' })); });
    var avg = { average: 100, confidence: 'high', samples: 30 };
    var r2 = row(atoms);
    [80, 100, 130].forEach(function (p) { r2.appendChild(ui.valueTag(p, avg)); });
    r2.appendChild(ui.valueTag(80, { average: 100, confidence: 'low', samples: 3 }));
    r2.appendChild(ui.valueTag(80, { average: 100, confidence: 'none', samples: 0 }));
    var r3 = row(atoms);
    cfgFormats().forEach(function (f) { r3.appendChild(h('span.mk-format', { data: { format: f.id } }, ui.icon(f.icon), h('span', { text: f.short }))); });
    ['simulation', 'global'].forEach(function (r) { r3.appendChild(ui.realmBadge(r)); });
    r3.append(ui.chip('Illustrative', { tone: 'soft', icon: 'info' }), ui.chip('Simulated trades', { tone: 'soft', icon: 'info' }), ui.chip('Higher risk', { tone: 'warn' }), ui.chip('Collection gap'));
    // The state words of a real trade (Global trading).
    var r3b = row(atoms);
    [['Awaiting bids', 'soft'], ['Reserve not met', 'warn'], ['Reserved 240', 'good'], ['Outbid', 'warn'], ['Ending soon', 'soft'], ['Sold', 'warn'], ['Completed', 'good'], ['Processing', 'soft'], ['Retry safely', 'warn']].forEach(function (c) { r3b.appendChild(ui.chip(c[0], { tone: c[1] })); });
    var r4 = row(atoms);
    r4.appendChild(ui.segmented({ label: 'Segmented specimen', value: 'a', options: [{ value: 'a', label: 'For You' }, { value: 'b', label: 'New' }, { value: 'c', label: 'Ending soon' }] }));
    ['Rare', 'Auction', 'Holo'].forEach(function (t, i) { var b = h('button.mk-pill', { type: 'button', 'aria-pressed': String(i === 0) }, h('span', { text: t }), h('span.mk-pill-count', { text: String(12 - i * 3) })); r4.appendChild(b); });
    r4.appendChild(h('button.mk-watch.is-inline', { type: 'button', 'aria-pressed': 'true', 'aria-label': 'Watching' }, ui.icon('bookmark')));
    r4.appendChild(ui.helpTip('average-value'));

    // meter + chart
    var meterGroup = group('Value meter and chart', 'Where a price sits against bid, targets and Average Value.');
    var v = sim.find(function (x) { return x.valuation.confidence === 'high'; });
    if (v) meterGroup.appendChild(ui.valueMeter(v.valuation, Math.round(v.valuation.average * 0.88), { priceLabel: 'Asking price' }));
    var chart = ui.chart.create({ id: 'gallery', height: 220 });
    scope.add(function () { chart.destroy(); });
    meterGroup.appendChild(chart);
    var card = d.cards.find(function (c) { return c.rarity === 'rare'; });
    var series = d.seriesFor(card.id, null, '30d');
    chart.update({ candles: series.candles, type: 'line', window: '30d', unit: 'Credits', label: card.name + ' price' });

    // simulation clock, live updates and offers
    var simGroup = group('Simulation clock, live updates and offers', 'The clock is a button. Prices change in place and anything new waits behind a pill. A real action asks once and says what moves.');
    var clocks = row(simGroup);
    [['running', 'play', 'Day 4 · 06:12', 'Running'], ['paused', 'pause', 'Day 4 · 06:12', 'Paused'], ['frozen', 'pause', 'Day 4 · 06:12', 'Frozen']].forEach(function (c) {
      clocks.appendChild(h('span.mk-sim-chip', { data: { state: c[0] } }, ui.icon(c[1]), h('span.mk-sim-clock.mk-num', { text: c[2] }), h('span.mk-sim-word', { text: c[3] })));
    });
    var live = row(simGroup);
    live.appendChild(h('span.mk-updates', { text: '3 new listings · Show' }));
    live.appendChild(h('span.mk-gone-note', { text: 'No longer open' }));
    live.appendChild(h('span.mk-num.mk-countdown.is-urgent', { text: '42m' }));
    var offers = h('ul.mk-offers');
    offers.appendChild(h('li.mk-offer', h('div.mk-offer-copy', h('strong', { text: 'Calm Otter offered: Radeon RX 6800 XT (444) + 20 Credits' }), h('span.mk-muted', { text: 'Waiting · 12 min ago · 1d 23h left' })),
      h('div.mk-offer-actions', ui.button('Accept', { variant: 'primary', size: 'sm' }), ui.button('Decline', { variant: 'ghost', size: 'sm' }))));
    offers.appendChild(h('li.mk-offer', { data: { status: 'declined' } }, h('div.mk-offer-copy', h('strong', { text: 'You offered: GeForce GTX 1080 Ti (730)' }), h('span.mk-muted', { text: 'Declined · 2 h ago' }))));
    simGroup.appendChild(offers);
    var trade = row(simGroup);
    trade.appendChild(ui.button('Open a confirmation', { variant: 'secondary', onClick: function () {
      ui.sim.confirm({ title: 'Confirm purchase', rows: [{ label: 'Item', value: 'Specimen card' }, { label: 'Price', value: '120 Credits' }, { label: 'Available after', value: '340', strong: true }],
        note: 'The card joins your collection straight away and the Credits leave your balance once.', confirmLabel: 'Buy for 120', icon: 'tag', run: function () { return { ok: true }; } });
    } }));

    // selling cards (Credits economy)
    var sell = group('Selling cards', 'The price comes first, in mono. A sale is one hold. Estimates are never mixed with the balance.');
    var quote = h('p.cb-delete-price', h('strong', { text: '23 Credits' }), h('span.cb-delete-copy', { text: ' Quick Sell · 55% of Average Value 42. From 6 recent trades.' }));
    sell.appendChild(quote);
    var saleList = h('div.sale-list', { style: { height: 'auto' } });
    [['GeForce GTX 1650', 'Common · Normal', 'CBL-7K3F-000142', '23'], ['Radeon RX 580', 'Uncommon · Normal', 'CBL-7K3F-000147', '38']].forEach(function (r, i) {
      var row = h('div.sale-row' + (i ? '.is-off' : ''), h('input', { type: 'checkbox', props: { checked: !i }, 'aria-label': 'Sell ' + r[0] }),
        h('span.sale-name', h('strong', { text: r[0] }), h('small', { text: r[1] })), h('span.sale-mono.sale-serial', { text: r[2] }), h('span.sale-mono.sale-price', { text: r[3] }));
      saleList.appendChild(row);
    });
    sell.appendChild(saleList);
    var sellRow = row(sell);
    sellRow.appendChild(h('button.sale-pill', { type: 'button', 'aria-pressed': 'true' }, 'Extra copies'));
    sellRow.appendChild(h('button.sale-pill', { type: 'button', 'aria-pressed': 'false' }, 'Basic and Common extras'));
    sellRow.appendChild(h('button.sale-hold', { type: 'button', text: 'Hold 2 s to sell 14 copies for 311' }));
    sellRow.appendChild(h('button.sale-hold', { type: 'button', disabled: true, text: 'Nothing to sell' }));

    // states
    var states = group('States', 'Loading, empty, offline, error, closed and draft states share one family.');
    states.appendChild(ui.skeletonGrid(3));
    states.appendChild(ui.emptyState({ kind: 'offline', icon: 'lock', title: 'Global Market is not connected', body: 'It will list real players’ cards once it is connected.', actions: [{ label: 'Open Simulation', variant: 'primary' }] }));
    states.appendChild(ui.emptyState({ kind: 'no-results', icon: 'search', title: 'No listings match', body: 'Loosen one filter, or clear everything.', actions: [{ label: 'Clear all filters', variant: 'secondary' }] }));
    states.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', role: 'alert', title: 'This listing is not available', body: 'It may have sold, expired or been withdrawn.' }));
    var banners = row(states); banners.classList.add('is-stack');
    [['danger', 'down', 'You were outbid. Your maximum is below the current bid.'], ['success', 'up', 'You are leading with a maximum of 120 Credits.'], ['warn', 'check', 'This listing sold 6 h ago for 214 Credits.'], ['warn', 'clock', 'This listing expired without a sale.'], ['info', 'save', 'You have a draft from 4 min ago.']].forEach(function (b) {
      banners.appendChild(h('div.mk-banner', { data: { tone: b[0] } }, ui.icon(b[1]), h('span', { text: b[2] })));
    });
    var forms = row(states);
    forms.appendChild(h('span.mk-draft-status', { text: 'Unsaved changes', 'data-state': 'dirty' }));
    forms.appendChild(h('span.mk-draft-status', { text: 'Draft saved on this device', 'data-state': 'saved' }));
    forms.appendChild(ui.button('Preview this listing', { variant: 'primary', disabled: true, reason: 'Enter a whole price of at least 1 Credit.' }));
    forms.appendChild(h('small.mk-field-error.is-inline', { text: 'Enter a whole price of at least 1 Credit.' }));
    var open = ui.button('Open a review dialog', { variant: 'secondary', onClick: function () {
      ui.review({ title: 'Review purchase', rows: [{ label: 'Item', value: 'Specimen card' }, { label: 'Price', value: '120 Credits' }, { label: 'Your Credits now', value: '460' }, { label: 'Would be after', value: '340', strong: true }] });
    } });
    forms.appendChild(open);
  }
  function cfgFormats() { return C.data.market.formats; }
  ui.gallerySection = function (section, held) { try { specimens(section, held); } catch (e) { console.error('Market gallery failed', e); } };
})(window.Cardable = window.Cardable || {}, window);
