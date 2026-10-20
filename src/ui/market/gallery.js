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
    var tiles = group('Listing tiles', 'Card art, name, price and time lead. Seller source stays visible; detailed values and serials belong to Advanced.');
    var grid = h('div.mk-grid.is-compact'); tiles.appendChild(grid);
    ['buy-now', 'auction', 'swap'].forEach(function (f) {
      var l = sim.find(function (x) { return x.format === f; });
      if (l) grid.appendChild(ui.listingTile({ listing: l, rank: K().recommend(l, env.ctx) }, env));
    });
    var variant = sim.find(function (x) { return x.card.variantId; });
    if (variant) grid.appendChild(ui.listingTile({ listing: variant, rank: K().recommend(variant, env.ctx) }, env));

    var readable = group('Readable Market', 'Labelled navigation, comfortable text and explicit actions. Advanced tools live in Settings.');
    var nav = row(readable);
    ['Browse', 'Shop', 'Your cards', 'Activity'].forEach(function (label) { nav.appendChild(ui.button(label, { variant: label === 'Browse' ? 'primary' : 'secondary' })); });
    var actions = row(readable);
    actions.append(ui.button('Bid 120 Credits', { variant: 'primary', icon: 'gavel' }), ui.button('Buy for 240 Credits', { variant: 'secondary', icon: 'tag' }), ui.chip('Game trader'), ui.chip('Player'));

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
    var simGroup = group('The island, live updates and offers', 'One pill says what needs you, and otherwise the clock or the connection. Prices change in place and anything new waits behind a pill. A real action asks once and says what moves.');
    var clocks = row(simGroup);
    [['bad', 'down', 'Outbid', 'GeForce GTX 760'], ['good', 'up', 'Leading', 'Radeon RX 5600 XT'], ['warn', 'clock', 'Ends soon', 'RTX 4060 \u00b7 42m'], ['info', 'swap', 'Swap offer', 'Calm Otter \u00b7 1d 23h'], ['good', 'check', 'Sold', 'RTX 3050 for 640'], ['run', 'play', 'Day 4 \u00b7 06:12', 'Running'], ['idle', 'lock', 'Not connected', 'Market']].forEach(function (c) {
      clocks.appendChild(h('span.mk-island', { data: { tone: c[0] } }, h('span.mk-island-glyph', ui.icon(c[1])), h('span.mk-island-text', h('span.mk-island-label', { text: c[2] }), h('span.mk-island-name', { text: c[3] }))));
    });
    // the notch's peek, its spending card and a row with quick bids, made from the same pieces the notch uses
    var peeks = row(simGroup);
    peeks.appendChild(h('div.mk-notch-peek.is-specimen', { data: { tone: 'bad' } }, h('span.mk-island-glyph', ui.icon('down')), h('div.mk-notch-peek-copy', h('strong', { text: 'Outbid \u00b7 GeForce GTX 760' }), h('span', { text: 'Now 38 \u00b7 your max 36' })),
      h('div.mk-notch-peek-actions', h('button.mk-quick', { type: 'button', data: { kind: 'raise' } }, h('span', { text: 'Lead' }), h('span.mk-num', { text: '40' })), h('button.mk-quick', { type: 'button', data: { kind: 'raise' } }, h('span', { text: '+10%' }), h('span.mk-num', { text: '42' })))));
    var wallet = h('section.mk-notch-wallet.is-specimen', h('div.mk-notch-spend', h('span.mk-notch-big.mk-num', { text: '5,045' }), h('span.mk-notch-sub', { text: 'to spend \u00b7 955 held by bids and orders' })),
      h('div.mk-notch-bar', h('i', { data: { part: 'free' }, style: { flexGrow: '5' } }), h('i', { data: { part: 'held' }, style: { flexGrow: '1' } })),
      h('div.mk-notch-worth', h('div', h('span.mk-notch-sub', { text: 'Net worth' }), h('span.mk-num.mk-notch-nw', { text: '9,137' })), h('span.mk-notch-delta', { data: { dir: 'up' } }, ui.icon('up'), h('span.mk-num', { text: '312' }), h('span', { text: 'today' }))));
    simGroup.appendChild(wallet);
    var tiers = row(simGroup);
    ['basic', 'rare', 'unusual', 'double-super-rare', 'legendary', 'mythical', 'secret'].forEach(function (r) {
      var rar = C.rarity(r) || { name: r };
      tiers.appendChild(h('span.mk-tile.mk-spec-tile', { data: { rarity: r }, style: { '--mk-rgb': ui.rarityRgb(r), '--mk-tier': ui.rarityTier(r), '--mk-i': 0 } }, h('span.mk-tile-rarity', { data: { rarity: r }, text: rar.name })));
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

    // the social layer: a seller's picture, comments, reviews and a profile line (sample text, no actions)
    var social = group('Pictures, comments and reputation', 'A seller picture is always labelled and never replaces the card. Comments and reviews are plain text under an anonymous name.');
    var photoRow = row(social);
    photoRow.appendChild(h('div.mk-tile-photo', { data: { layout: 'banner' }, style: { width: '260px' } }, h('div', { style: { height: '100%', background: 'linear-gradient(120deg, var(--ink-2), var(--glass-3))' } }), h('span.mk-photo-tag', { text: 'Seller photo' })));
    photoRow.appendChild(h('div.mk-tile-photo', { data: { layout: 'banner', treatment: 'frame' }, style: { width: '260px' } }, h('div', { style: { height: '100%', background: 'linear-gradient(120deg, var(--ink-2), var(--glass-3))' } }), h('span.mk-photo-tag', { text: 'Seller photos · 3' })));
    photoRow.appendChild(h('p.mk-hint', { text: 'A restrained look (plain, framed, spotlight) is the most a seller can add.' }));
    var cm = h('div.mk-comment-list');
    cm.appendChild(h('article.mk-comment', h('div.mk-comment-head', h('span.mk-comment-who', h('button.mk-comment-alias', { type: 'button', text: 'Silent Falcon' })), h('span.mk-muted', { text: '3 min ago' })), h('p.mk-comment-body', { text: 'Is the serial a low number?' }),
      h('div.mk-comment-actions', ui.button('Reply', { variant: 'ghost', size: 'sm' }), ui.button('Report', { variant: 'ghost', size: 'sm' }), ui.button('Mute', { variant: 'ghost', size: 'sm' })),
      h('div.mk-comment-replies', h('article.mk-comment.is-reply', h('div.mk-comment-head', h('span.mk-comment-who', h('button.mk-comment-alias', { type: 'button', text: 'Amber Otter' }), ui.chip('Seller', { tone: 'soft' })), h('span.mk-muted', { text: '1 min ago' })), h('p.mk-comment-body', { text: 'Yes, in the low hundreds.' })))));
    cm.appendChild(h('article.mk-comment', h('p.mk-comment-body.is-placeholder', { text: 'Hidden while it is reviewed.' })));
    social.appendChild(cm);
    var rep = row(social);
    rep.appendChild(h('p.mk-rep-score', { text: '★★★★☆ 4.3' }));
    rep.appendChild(ui.chip('A fair sample', { tone: 'soft' }));
    rep.appendChild(h('span.mk-muted', { text: 'Rated 4.3 out of 5 from 9 reviews by 7 buyers.' }));
    var stars = h('div.mk-stars', { role: 'radiogroup', 'aria-label': 'Rating specimen' });
    for (var n = 1; n <= 5; n++) stars.appendChild(h('button.mk-star' + (n <= 4 ? '.is-on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(n === 4), 'aria-label': n + ' out of 5', text: n <= 4 ? '★' : '☆' }));
    social.appendChild(stars);
    var drop = h('div.mk-dropzone', ui.icon('upload'), h('span', { text: 'Drop a picture here, or paste one from your clipboard' }));
    social.appendChild(drop);

    // states
    var states = group('States', 'Loading, empty, offline, error, closed and draft states share one family.');
    states.appendChild(ui.skeletonGrid(3));
    states.appendChild(ui.emptyState({ kind: 'offline', icon: 'lock', title: 'Link an account to trade with players', body: 'Game traders and the Shop remain available.', actions: [{ label: 'Browse cards', variant: 'primary' }] }));
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
