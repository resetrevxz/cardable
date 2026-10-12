/* Cardable Market — listing detail and card detail.
 * The real card is the hero. Every action here either navigates, edits a local preview, or opens a review
 * that states plainly that nothing was changed. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };

  // ---- review dialog: exact terms of what a real trade would be, and a plain statement that this is a preview ----
  function review(options) {
    var surface = h('section.mk-modal.mk-review', { role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title });
    surface.appendChild(h('header', ui.eyebrow('Preview only'), h('h2', { text: options.title })));
    if (options.card) surface.appendChild(options.card);
    var dl = h('dl.mk-review-rows');
    options.rows.forEach(function (r) {
      if (!r) return;
      dl.appendChild(h('div', { data: { strong: r.strong ? 'true' : '' } }, h('dt', { text: r.label }), h('dd', r.node ? r.node : { text: r.value })));
    });
    surface.appendChild(dl);
    surface.appendChild(h('p.mk-review-note', icon('info'), h('span', { text: options.note || 'Nothing was bought, sold or saved. Your Credits and collection are unchanged. Trading arrives with the simulator in a later update.' })));
    var actions = h('div.mk-modal-actions');
    var handle;
    (options.actions || []).forEach(function (a) { actions.appendChild(ui.button(a.label, { variant: a.variant || 'secondary', icon: a.icon, onClick: function () { handle.close(); if (a.run) a.run(); } })); });
    actions.appendChild(ui.button(options.closeLabel || 'Close preview', { variant: 'primary', onClick: function () { handle.close(); } }));
    surface.appendChild(actions);
    handle = C.ui.present(surface, { anchor: root.document.activeElement });
    return handle;
  }
  ui.review = review;

  function needsReview(amount) {
    var level = C.settings.get('marketConfirm');
    return level === 'always' || amount >= cfg().confirmThreshold;
  }
  function previewToast(text) { C.ui.toast(text); }

  function identityRows(card, instance, env, owned) {
    var idn = ui.identity(card, owned), v = instance.variantId ? env.variants[instance.variantId] : null;
    var rows = [
      { label: 'Rarity', value: idn.rarityName }, { label: 'Finish', value: v ? v.name : 'Normal' }
    ];
    if (instance.cardSkinId) rows.push({ label: 'Skin', value: C.cardSkin && C.cardSkin(instance.cardSkinId) ? C.cardSkin(instance.cardSkinId).name : 'Skin' });
    rows.push({ label: 'Serial', node: h('span.mk-mono', { text: instance.serial }) });
    if (instance.packId) rows.push({ label: 'Original pack', value: (function () { var p = (C.data.packs || []).find(function (x) { return x.id === instance.packId; }); return p ? p.name : instance.packId; })() });
    return rows;
  }

  // ---- full card stage ----
  function cardStage(ctx, card, instance, owned, caption) {
    var stage = h('div.mk-stage');
    var mount = h('div.mk-stage-card');
    stage.appendChild(mount);
    var view = null;
    try {
      view = C.cardView.create(card, instance, { owned: !!owned, autoFocus: false, keyboardFlip: false, autoStamp: false, presentation: 'full' });
      view.el.tabIndex = 0;
      var idn = ui.identity(card, owned);
      view.el.setAttribute('role', 'img'); view.el.setAttribute('aria-label', idn.name + ', ' + idn.rarityName + (caption ? ', ' + caption : ''));
      mount.appendChild(view.el);
      if (C.settings.get('quality') !== 'very-low') view.setMode('full');
      ctx.scope.add(function () { try { view.destroy(); } catch (_) { /* gone */ } });
    } catch (error) {
      mount.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', title: 'Card preview unavailable', body: 'The card could not be drawn here. Its details are still listed alongside.' }));
    }
    var tools = h('div.mk-stage-tools');
    if (view) tools.appendChild(ui.button('Flip', { icon: 'flip', variant: 'secondary', onClick: function () { try { view.setFace(view.side === 'front' ? 'back' : 'front'); } catch (_) { /* no back face */ } } }));
    stage.appendChild(tools);
    stage.appendChild(h('p.mk-stage-note', { text: 'The real card, exactly as it would transfer. A seller’s cover image never replaces it.' }));
    return stage;
  }

  function sellerPanel(seller) {
    var persona = seller.isBot ? C.market.fixtures.PERSONAS.find(function (p) { return p.id === seller.persona; }) : null;
    var box = h('section.mk-box.mk-seller-box', { 'aria-label': 'Seller' });
    box.appendChild(h('div.mk-panel-head', ui.eyebrow(seller.isBot ? 'Simulation bot' : 'Seller'), h('h3', { text: seller.alias })));
    var rows = [
      { label: seller.isBot ? 'Style' : 'Completed sales', value: seller.isBot ? (persona ? persona.label : 'Bot') : String(seller.sales) },
      { label: 'Rating', value: Math.round(seller.rating * 100) + '% positive' },
      { label: 'In Beta for', value: seller.tenureDays + ' days' }
    ];
    box.appendChild(ui.statGrid(rows.map(function (r) { return r; }), { cols: 3 }));
    box.appendChild(h('p.mk-hint', { text: seller.isBot ? (persona ? persona.note + ' ' : '') + 'A simulated trader on this device, not a person.' : 'Public identity is a generated two-word name. Email and account details are never shown.' }));
    return box;
  }

  function historyPanel(l, env) {
    var box = h('section.mk-box', { 'aria-label': 'History' });
    box.appendChild(h('div.mk-panel-head', h('h3', { text: 'History' })));
    var list = h('ol.mk-events');
    var at = l.listedMin;
    var events = [];
    events.push({ icon: 'plus', text: 'Listed by ' + l.seller.alias, when: at });
    if (l.format === 'auction') {
      var amount = l.auction.start, count = Math.min(l.auction.bids, 6);
      for (var i = 1; i <= count; i++) { amount = Math.min(l.auction.current, amount + K().minIncrement(amount)); events.push({ icon: 'gavel', text: 'Bid of ' + ui.fmt.exact(i === count ? l.auction.current : amount) + ' Credits', when: Math.max(1, at - Math.round(at * i / (count + 1))) }); }
      if (l.auction.bids > count) events.splice(1, 0, { icon: 'info', text: (l.auction.bids - count) + ' earlier bids not shown', when: at - 1 });
    }
    events.sort(function (a, b) { return b.when - a.when; });
    events.forEach(function (e) { list.appendChild(h('li', icon(e.icon), h('span', { text: e.text }), h('span.mk-muted', { text: ui.fmt.age(e.when) }))); });
    box.appendChild(list);
    box.appendChild(h('p.mk-hint', { text: 'Sample history, generated for this preview.' }));
    return box;
  }

  function mountListing(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm;
    var res = ctx.api.listingSync(realm, ctx.params.id);
    var back = ui.button('Back', { icon: 'back', variant: 'ghost', onClick: function () { ui.shell.back(); } });
    if (!res) {
      host.appendChild(h('div.mk-pagehead', back));
      host.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', title: 'This listing is not available', body: 'It may have sold, expired or been withdrawn, or this sample set may have changed.',
        actions: [{ label: 'Back to Discover', variant: 'primary', run: function () { ui.shell.goTab('discover'); } }] }));
      return;
    }
    var l = res.listing, card = res.card, owned = !!env.owned[card.id], idn = ui.identity(card, owned);
    var variant = l.card.variantId ? env.variants[l.card.variantId] : null, price = K().currentPrice(l), v = l.valuation;
    ctx.title(l.title || idn.name);
    var myBid = ctx.api.activitySync(realm).bids.find(function (b) { return b.listingId === l.id; });
    host.appendChild(h('div.mk-pagehead.is-detail', back));
    var layout = h('div.mk-detail');
    host.appendChild(layout);
    var instance = { instanceId: 'mk-' + l.id, cardId: card.id, serial: l.card.serial, variantId: l.card.variantId, cardSkinId: l.card.cardSkinId, packId: l.card.packId, seen: true };
    var left = h('div.mk-detail-left');
    left.appendChild(cardStage(ctx, card, instance, owned, variant ? variant.name : 'normal finish'));
    var identity = h('section.mk-box', { 'aria-label': 'Card identity' }, h('div.mk-panel-head', h('h3', { text: 'The exact card' })));
    identity.appendChild(ui.statGrid(identityRows(card, instance, env, owned), { cols: 2 }));
    var specs = null;
    try {
      var rows = [{ label: 'Memory', value: C.cardSpecs.vram(card) + ' ' + C.cardSpecs.memoryType(card) }].concat(C.cardSpecs.rows(card)).filter(function () { return !idn.concealed; });
      if (rows.length) specs = ui.statGrid(rows, { cols: 2 });
    } catch (_) { /* specs are optional */ }
    if (specs) identity.appendChild(specs);
    if (l.cover.kind === 'sample') identity.appendChild(h('div.mk-cover-sample', { style: { '--hue': l.cover.hue } }, h('span', { text: 'Seller cover' }), h('small', { text: 'A seller’s own image. It is decoration, not proof of ownership.' })));
    identity.appendChild(h('div.mk-linkrow', ui.button('Open this card’s market', { icon: 'trend', variant: 'ghost', onClick: function () { ui.go('card', { id: card.id, variant: l.card.variantId || '' }); } })));
    left.appendChild(identity);
    layout.appendChild(left);

    var right = h('div.mk-detail-right');
    // header
    var headBox = h('header.mk-detail-head');
    var topLine = h('div.mk-detail-top');
    topLine.appendChild(h('span.mk-format', { data: { format: l.format } }, icon(ui.formatDef(l.format).icon), h('span', { text: ui.formatDef(l.format).label })));
    topLine.appendChild(ui.realmBadge(l.realm || realm, { short: true }));
    var statusLabel = { active: 'Open', ending: 'Ending soon', sold: 'Sold', expired: 'Expired' }[l.status] || l.status;
    topLine.appendChild(ui.chip(statusLabel, { tone: l.status === 'sold' || l.status === 'expired' ? 'warn' : 'soft', icon: l.status === 'sold' ? 'check' : l.status === 'expired' ? 'clock' : null }));
    headBox.appendChild(topLine);
    headBox.appendChild(h('h1', { text: l.title || idn.name }));
    var sub = [idn.rarityName, variant ? variant.name : 'Normal finish'];
    if (l.title) sub.unshift(idn.name);
    headBox.appendChild(h('p.mk-detail-sub', { text: sub.join(' · ') }));
    var watch = ui.button(store.isWatching(l.id) ? 'Watching' : 'Watch', { icon: 'bookmark', variant: 'secondary', pressed: store.isWatching(l.id), onClick: function (e) {
      var on = store.toggleWatch(l.id); watch.setAttribute('aria-pressed', String(on)); watch.querySelector('span').textContent = on ? 'Watching' : 'Watch';
    } });
    headBox.appendChild(h('div.mk-detail-actions', watch));
    right.appendChild(headBox);

    // state banners
    if (l.status === 'sold' || l.status === 'expired') {
      right.appendChild(h('div.mk-banner', { role: 'status', data: { tone: 'warn' } }, icon(l.status === 'sold' ? 'check' : 'clock'),
        h('span', { text: l.status === 'sold' ? 'This listing sold ' + ui.fmt.age(l.endedMin || 0) + ' for ' + ui.fmt.exact(l.soldFor || price) + ' Credits.' : 'This listing expired ' + ui.fmt.age(l.endedMin || 0) + ' without a sale.' })));
    }
    if (myBid && myBid.state === 'outbid') {
      right.appendChild(h('div.mk-banner', { role: 'status', data: { tone: 'danger' } }, icon('down'), h('span', { text: 'You were outbid. Your maximum of ' + ui.fmt.exact(myBid.yourMax) + ' Credits is below the current bid of ' + ui.fmt.exact(myBid.current) + '.' })));
    } else if (myBid && myBid.state === 'leading') {
      right.appendChild(h('div.mk-banner', { role: 'status', data: { tone: 'success' } }, icon('up'), h('span', { text: 'You are leading with a maximum of ' + ui.fmt.exact(myBid.yourMax) + ' Credits.' })));
    }

    // price + action
    var panel = h('section.mk-box.mk-buybox', { 'aria-label': 'Price and action' });
    var closed = l.status === 'sold' || l.status === 'expired';
    if (l.format === 'buy-now') {
      panel.appendChild(h('div.mk-buybox-price', ui.eyebrow('Price'), ui.credits(price, { big: true }), ui.valueTag(price, v)));
      var fee = K().feeFor(price);
      panel.appendChild(ui.statGrid([
        { label: 'You pay', value: ui.fmt.exact(price) + ' Credits' },
        { label: 'Seller receives', value: ui.fmt.exact(price - fee) + ' Credits', note: 'After the ' + cfg().fee.label.toLowerCase() + ' of ' + fee, help: 'settlement' }
      ], { cols: 2 }));
      var go = ui.button('Preview purchase', { variant: 'primary', icon: 'tag', disabled: closed, reason: closed ? 'This listing is closed.' : '', onClick: function () { purchaseReview(); } });
      var offer = ui.button('Make an offer', { variant: 'secondary', icon: 'swap', disabled: closed, reason: closed ? 'This listing is closed.' : '', onClick: function () { offerReview(); } });
      panel.appendChild(h('div.mk-buybox-actions', go, offer));
    } else if (l.format === 'auction') {
      var min = K().minIncrement(l.auction.current);
      panel.appendChild(h('div.mk-buybox-price', ui.eyebrow(l.auction.bids ? 'Current bid' : 'Starting bid'), ui.credits(price, { big: true }),
        h('span.mk-muted', { text: (l.auction.bids === 1 ? '1 bid' : l.auction.bids + ' bids') + (l.auction.leaderAlias ? ' · ' + l.auction.leaderAlias + ' leads' : '') })));
      panel.appendChild(ui.statGrid([
        { label: 'Time left', value: ui.fmt.duration(l.endsMin), tone: l.endsMin <= 60 ? 'urgent' : '' },
        { label: 'Reserve', value: l.auction.reserve == null ? 'None' : l.auction.reserveMet ? 'Met' : 'Not met', help: 'reserve' },
        { label: 'Next bid at least', value: ui.fmt.exact(price + min) + ' Credits' },
        l.auction.buyout ? { label: 'Buyout', value: ui.fmt.exact(l.auction.buyout) + ' Credits' } : null
      ], { cols: 2 }));
      var field = h('label.mk-field', h('span.mk-field-label', ui.labelWithHelp('Your maximum', 'proxy-bid')),
        h('input.mk-input.is-large', { type: 'number', min: String(price + min), step: '1', inputmode: 'numeric', value: String(price + min), 'aria-describedby': 'mk-max-hint', props: { disabled: closed } }),
        h('small.mk-hint', { id: 'mk-max-hint', text: 'The market bids the smallest amount that keeps you in front, up to this maximum. Anti-sniping extends the close by ' + cfg().auction.snipeExtendMin + ' minutes for late bids.' }));
      panel.appendChild(field);
      var input = field.querySelector('input');
      var bidBtn = ui.button('Preview bid', { variant: 'primary', icon: 'gavel', disabled: closed, reason: closed ? 'This auction is closed.' : '', onClick: function () { bidReview(Number(input.value)); } });
      var actions = h('div.mk-buybox-actions', bidBtn);
      if (l.auction.buyout) actions.appendChild(ui.button('Preview buyout', { variant: 'secondary', icon: 'tag', disabled: closed, onClick: function () { buyoutReview(); } }));
      panel.appendChild(actions);
      input.addEventListener('input', function () {
        var n = Number(input.value), bad = !(n >= price + min) || n !== Math.floor(n);
        input.setAttribute('aria-invalid', String(bad)); bidBtn.disabled = bad || closed;
        bidBtn.title = bad ? 'Enter a whole maximum of at least ' + ui.fmt.exact(price + min) + ' Credits.' : '';
      });
    } else {
      var wants = h('ul.mk-wants');
      l.swap.wanted.forEach(function (w) { wants.appendChild(h('li', icon('check'), h('span', { text: w.label }))); });
      panel.appendChild(h('div.mk-buybox-price', ui.eyebrow('Wants'), wants));
      var topUpText = l.swap.topUp ? (l.swap.direction === 'asks' ? 'Seller asks for ' + ui.fmt.exact(l.swap.topUp) + ' Credits on top of the card.' : 'Seller adds ' + ui.fmt.exact(l.swap.topUp) + ' Credits to even things out.') : 'A straight card-for-card swap with no Credits involved.';
      panel.appendChild(h('p.mk-swap-copy', { text: topUpText }));
      panel.appendChild(ui.statGrid([
        { label: 'Value of this card', value: ui.fmt.exact(v.average) + ' Credits', note: v.confidence === 'none' ? 'Baseline estimate' : null },
        { label: 'Market fee', value: l.swap.topUp && l.swap.direction === 'asks' ? ui.fmt.exact(K().feeFor(l.swap.topUp)) + ' on the top-up' : 'None on a pure swap', help: 'settlement' },
        { label: 'Open to counter-offers', value: l.swap.openToCounter ? 'Yes' : 'No' }
      ], { cols: 2 }));
      panel.appendChild(h('div.mk-buybox-actions', ui.button('Preview a swap', { variant: 'primary', icon: 'swap', disabled: closed, onClick: function () { swapReview(); } })));
    }
    if (!closed) panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'Preview only. Settlement, escrow and bidding arrive with the simulator, so no button here completes a trade.' })));
    right.appendChild(panel);

    // value read
    if (l.format !== 'swap') {
      var vp = h('section.mk-box', { 'aria-label': 'Value read' });
      vp.appendChild(h('div.mk-panel-head', h('h3', { text: 'How this price compares' }), ui.chip('Illustrative', { tone: 'soft', title: 'Sample figures for the preview' })));
      vp.appendChild(ui.valueMeter(v, price, { priceLabel: l.format === 'auction' ? 'Current bid' : 'Asking price' }));
      var verdict = K().verdictFor(price, v), say = {
        undervalued: 'Below Average Value with good support from recent sales. Recent sales say it is well priced.',
        'possibly-under': 'Below Average Value, but few sales back that figure. Treat it as a maybe.',
        fair: 'Close to Average Value. A fair price rather than a bargain.',
        overpriced: 'Above Average Value. Waiting, or offering less, may serve you better.',
        unrated: 'There is no sale history yet, so the figure compared with is only a baseline estimate.'
      }[verdict];
      vp.appendChild(h('p.mk-verdict', { data: { verdict: verdict }, text: say }));
      vp.appendChild(ui.statGrid([
        { label: 'Average Value', value: ui.fmt.exact(v.average), help: 'average-value', note: v.basis === 'baseline' ? 'Baseline, no sales yet' : v.samples + ' recent sales' },
        { label: 'Confidence', value: { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' }[v.confidence], help: 'confidence' },
        { label: 'Target Buy', value: ui.fmt.exact(v.targetBuy), help: 'target-buy' }, { label: 'Target Sell', value: ui.fmt.exact(v.targetSell), help: 'target-sell' },
        { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: 'Hypothetical' }, { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: 'Hypothetical' },
        { label: '7 day volume', value: v.samples ? v.volume7d + ' sold' : 'No sales yet', help: 'volume' }, { label: 'Estimated sale time', value: '~' + v.windowHours + ' h', help: 'liquidity' }
      ], { cols: 2 }));
      right.appendChild(vp);
    }

    // Why this listing ranks where it does: every reason, the risk, and the shape of the score.
    if (res.rank && !closed) {
      var why = h('section.mk-box', { 'aria-label': 'Why this ranks here' }, h('div.mk-panel-head', h('h3', { text: 'Why you are seeing this' }), ui.chip('Illustrative weights', { tone: 'soft' })));
      var reasons = h('ul.mk-reasons');
      (res.rank.reasons.length ? res.rank.reasons : [{ id: 'none', label: 'Nothing stands out. It is shown because it matches what you are browsing.' }]).forEach(function (r) {
        reasons.appendChild(h('li', { data: { reason: r.id } }, icon(r.id === 'risk' ? 'warn' : 'check'), h('span', { text: r.label })));
      });
      why.appendChild(reasons);
      var parts = [['value', 'Value against Average Value'], ['budget', 'Fit for your budget'], ['gap', 'Fills a collection gap'], ['liquidity', 'How easily it trades'], ['trust', 'Seller track record'], ['fresh', 'How recently it was listed']];
      var bars = h('div.mk-bars', { role: 'list' });
      parts.forEach(function (p) {
        var value = Math.max(0, Math.min(1, res.rank.components[p[0]] || 0));
        bars.appendChild(h('div.mk-bar', { role: 'listitem', 'aria-label': p[1] + ' ' + Math.round(value * 100) + ' of 100' }, h('span', { text: p[1] }), h('i', { style: { '--v': value } }), h('span.mk-num', { text: String(Math.round(value * 100)) })));
      });
      why.appendChild(bars);
      why.appendChild(h('p.mk-hint', { text: 'Risk: ' + { low: 'lower', moderate: 'moderate', higher: 'higher' }[res.rank.risk] + '. The Recommended order weighs these together. It is never just the lowest price, and it is not advice to buy.' }));
      right.appendChild(why);
    }
    right.appendChild(sellerPanel(l.seller));
    if (l.description) right.appendChild(h('section.mk-box', h('div.mk-panel-head', h('h3', { text: 'From the seller' })), h('p.mk-prose', { text: l.description })));
    right.appendChild(historyPanel(l, env));
    var comments = h('section.mk-box.is-inactive', { 'aria-label': 'Comments' }, h('div.mk-panel-head', h('h3', { text: 'Comments' }), ui.chip('Not active', { tone: 'soft' })));
    comments.appendChild(h('p.mk-hint', { text: 'Questions and sale reputation arrive with the social update. Nothing can be posted here yet.' }));
    comments.appendChild(h('input.mk-input', { type: 'text', disabled: true, placeholder: 'Comments are not available yet', 'aria-label': 'Comment (not available yet)' }));
    right.appendChild(comments);
    layout.appendChild(right);

    // similar
    if (res.similar && res.similar.length) {
      var sim = h('section.mk-section', h('div.mk-section-head', h('h2', { text: 'More of this card' })));
      var grid = h('div.mk-grid.is-compact', { role: 'list' });
      var tileEnv = { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: 0 };
      res.similar.forEach(function (s, i) { tileEnv.index = i; var t = ui.listingTile({ listing: s, rank: K().recommend(s, env.ctx) }, tileEnv); t.setAttribute('role', 'listitem'); grid.appendChild(t); });
      sim.appendChild(grid); host.appendChild(sim);
    }

    // ---- reviews ----
    function cardChip() { return h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName + ' · ' + (variant ? variant.name : 'Normal finish') + ' · ' + l.card.serial })); }
    function balanceRows(cost) {
      var w = ctx.api.walletSync(realm);
      if (w.balance == null) return [{ label: 'Wallet', value: 'Not connected' }];
      var after = w.balance - cost;
      return [{ label: 'Your Credits now', value: ui.fmt.exact(w.balance) }, { label: 'Would be after', value: after >= 0 ? ui.fmt.exact(after) : 'Short by ' + ui.fmt.exact(-after), strong: true }];
    }
    function purchaseReview() {
      if (!needsReview(price)) { previewToast('Preview only. A purchase under your confirmation setting would have completed. Nothing was spent.'); return; }
      review({ title: 'Review purchase', card: cardChip(), rows: [
        { label: 'Item', value: idn.name }, { label: 'Serial', node: h('span.mk-mono', { text: l.card.serial }) },
        { label: 'Price', node: ui.credits(price) }, { label: 'Seller', value: l.seller.alias }
      ].concat(balanceRows(price), [{ label: 'Realm', value: ui.realmDef(l.realm || realm).label }]) });
    }
    function bidReview(max) {
      var next = price + K().minIncrement(price);
      review({ title: 'Review bid', card: cardChip(), rows: [
        { label: 'Your maximum', node: ui.credits(max) }, { label: 'Market bids now', node: ui.credits(Math.min(max, next)), },
        { label: 'Held in escrow', value: 'Up to ' + ui.fmt.exact(max) + ' Credits' }, { label: 'Closes', value: ui.fmt.duration(l.endsMin) + (l.endsMin <= cfg().auction.snipeWindowMin ? ' (extends on late bids)' : '') }
      ].concat(balanceRows(Math.min(max, next))) });
    }
    function buyoutReview() { review({ title: 'Review buyout', card: cardChip(), rows: [{ label: 'Buyout price', node: ui.credits(l.auction.buyout) }, { label: 'Ends the auction', value: 'Immediately' }].concat(balanceRows(l.auction.buyout)) }); }
    function offerReview() {
      var min = Math.max(1, Math.round(v.average * 0.8));
      var surface = h('section.mk-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Make an offer' });
      var input = h('input.mk-input.is-large', { type: 'number', min: '1', value: String(Math.max(1, Math.round(price * 0.92))), inputmode: 'numeric', 'aria-label': 'Offer in Credits' });
      surface.append(h('h2', { text: 'Make an offer' }), h('p', { text: 'Offers below ' + ui.fmt.exact(min) + ' Credits, 80% of Average Value, rarely succeed. The seller may accept, decline or counter.' }), input,
        h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }),
          ui.button('Preview offer', { variant: 'primary', onClick: function () { var n = Number(input.value); handle.close(); review({ title: 'Review offer', card: cardChip(), rows: [{ label: 'Your offer', node: ui.credits(n) }, { label: 'Asking price', node: ui.credits(price) }, { label: 'Difference', value: ui.fmt.pct((n - price) / price, true) }].concat(balanceRows(n)) }); } })));
      var handle = C.ui.present(surface, { anchor: root.document.activeElement });
    }
    function swapReview() {
      var inv = ctx.api.inventorySync(realm);
      review({ title: 'Review swap', card: cardChip(), rows: [
        { label: 'You give', value: inv.items.length ? 'Choose one of your ' + inv.items.length + ' cards when swaps are live' : 'A card from your collection' },
        { label: 'You receive', value: idn.name }, { label: 'Credits', value: l.swap.topUp ? (l.swap.direction === 'asks' ? 'You add ' : 'You receive ') + ui.fmt.exact(l.swap.topUp) : 'None' }
      ] });
    }
    ctx.restoreScroll();
  }

  // ---- card detail ----
  function mountCard(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm;
    var cardId = ctx.params.id, variantId = ctx.params.variant || null;
    var res = ctx.api.cardMarketSync(realm, cardId, variantId);
    var back = ui.button('Back', { icon: 'back', variant: 'ghost', onClick: function () { ui.shell.back(); } });
    host.appendChild(h('div.mk-pagehead.is-detail', back));
    if (!res) { host.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', title: 'Card not found', body: 'That card is not in this catalog.' })); return; }
    var card = res.card, v = res.valuation, owned = res.owned > 0, idn = ui.identity(card, owned);
    ctx.title(idn.name + ' market');
    var variant = variantId ? env.variants[variantId] : null;
    var layout = h('div.mk-detail');
    host.appendChild(layout);
    var instance = { instanceId: 'mk-card-' + card.id, cardId: card.id, serial: C.market.fixtures.demoSerial(1), variantId: variantId, cardSkinId: null, seen: true };
    var left = h('div.mk-detail-left');
    left.appendChild(cardStage(ctx, card, instance, owned, variant ? variant.name : 'normal finish'));
    left.querySelector('.mk-stage-note').textContent = 'A specimen of the card. Serials on real listings are always shown exactly.';
    layout.appendChild(left);
    var right = h('div.mk-detail-right');
    var headBox = h('header.mk-detail-head');
    headBox.appendChild(h('div.mk-detail-top', ui.chip(idn.rarityName, { tone: 'rarity' }), variant ? ui.chip(variant.name) : null, ui.realmBadge(realm, { short: true })));
    headBox.appendChild(h('h1', { text: idn.name }));
    headBox.appendChild(h('p.mk-detail-sub', { text: res.listings.length + ' open listings · ' + (owned ? 'You own ' + res.owned : 'Not in your collection') }));
    var acts = h('div.mk-detail-actions');
    acts.appendChild(ui.button('Set a price alert', { icon: 'bell', variant: 'secondary', onClick: function () { ui.go('alerts', { cardId: card.id }); } }));
    acts.appendChild(ui.button('Open in Stocks', { icon: 'trend', variant: 'secondary', onClick: function () { var s = store.session; s.stocks = { scope: 'card', id: card.id, variantId: variantId }; ui.shell.goTab('stocks'); } }));
    if (owned) acts.appendChild(ui.button('List a copy', { icon: 'plus', variant: 'primary', onClick: function () { ui.go('compose', { cardId: card.id }); } }));
    headBox.appendChild(acts);
    right.appendChild(headBox);

    var vp = h('section.mk-box', { 'aria-label': 'Market numbers' });
    vp.appendChild(h('div.mk-panel-head', h('h3', { text: 'Market numbers' }), ui.chip(v.basis === 'baseline' ? 'Baseline estimate' : 'Illustrative', { tone: 'soft' })));
    vp.appendChild(ui.statGrid([
      { label: 'Average Value', value: ui.fmt.exact(v.average), help: 'average-value', note: v.basis === 'baseline' ? 'No sales yet' : v.samples + ' recent sales' },
      { label: 'Last sale', value: v.lastSale ? ui.fmt.exact(v.lastSale) : 'No sales yet' },
      { label: 'Target Buy', value: ui.fmt.exact(v.targetBuy), help: 'target-buy' }, { label: 'Target Sell', value: ui.fmt.exact(v.targetSell), help: 'target-sell' },
      { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: 'Hypothetical' }, { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: 'Hypothetical', help: 'spread' },
      { label: '24 h change', node: ui.delta(v.change24h, { empty: 'No sales yet' }) }, { label: '7 d change', node: ui.delta(v.change7d, { empty: 'No sales yet' }) },
      { label: 'Volume, 7 d', value: v.samples ? v.volume7d + ' sold' : 'No sales yet', help: 'volume' }, { label: 'Volatility', value: ui.fmt.pct(v.volatility, false, 1) + ' a day', help: 'volatility' },
      { label: 'Liquidity', value: Math.round(v.liquidity * 100) + ' of 100', help: 'liquidity' }, { label: 'Confidence', value: { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' }[v.confidence], help: 'confidence' }
    ], { cols: 2 }));
    right.appendChild(vp);

    var chartPanel = h('section.mk-box', { 'aria-label': 'Price history' });
    var chartHead = h('div.mk-panel-head', h('h3', { text: 'Price history' }));
    var windowId = C.settings.get('marketWindow'), type = C.settings.get('marketChartType');
    var winSwitch = ui.segmented({ label: 'Time window', role: 'tablist', value: windowId, options: Object.keys(K().WINDOWS).map(function (k) { return { value: k, label: k === 'all' ? 'All' : k }; }), onChange: function (w) { windowId = w; drawChart(); } });
    chartHead.appendChild(winSwitch);
    chartPanel.appendChild(chartHead);
    var chart = ui.chart.create({ id: 'card', height: 280 });
    ctx.scope.add(function () { chart.destroy(); });
    chartPanel.appendChild(chart);
    function drawChart() {
      var s = ctx.api.stocksSync(realm, { scope: 'card', id: card.id, variantId: variantId, window: windowId });
      chart.update({ candles: s.candles, type: type, window: windowId, unit: 'Credits', label: idn.name + ' price' });
    }
    drawChart();
    right.appendChild(chartPanel);

    var lp = h('section.mk-box', { 'aria-label': 'Open listings' }, h('div.mk-panel-head', h('h3', { text: 'Open listings' })));
    if (!res.listings.length) lp.appendChild(h('p.mk-hint', { text: realm === 'global' && !store.session.showGlobalSample ? 'Global Market is not connected, so there are no real listings.' : 'No one is selling this exact card right now.' }));
    else {
      var rows = h('div.mk-minilist');
      res.listings.slice(0, 6).forEach(function (l) {
        var b = h('button.mk-minirow', { type: 'button' }, h('span.mk-format', { data: { format: l.format } }, icon(ui.formatDef(l.format).icon), h('span', { text: ui.formatDef(l.format).short })),
          h('span.mk-minirow-main', { text: l.card.variantId ? env.variants[l.card.variantId].name : 'Normal finish' }), l.format === 'swap' ? h('span.mk-muted', { text: 'Trade' }) : ui.credits(K().currentPrice(l)), h('span.mk-mono', { text: l.card.serial.replace('CBL-', '') }));
        b.addEventListener('click', function () { ui.go('listing', { id: l.id }); });
        rows.appendChild(b);
      });
      lp.appendChild(rows);
    }
    right.appendChild(lp);
    var tp = h('section.mk-box', { 'aria-label': 'Recent trades' }, h('div.mk-panel-head', h('h3', { text: 'Recent trades' })));
    if (!res.trades.length) tp.appendChild(h('p.mk-hint', { text: 'No completed trades of this card yet. Listings and Quick Sell never count as trades.' }));
    else {
      var tl = h('ul.mk-events');
      res.trades.forEach(function (t) { tl.appendChild(h('li', icon('check'), h('span', { text: ui.fmt.exact(t.price) + ' Credits · ' + ui.formatDef(t.format).label }), h('span.mk-muted', { text: ui.fmt.age(t.minutesAgo) }))); });
      tp.appendChild(tl); tp.appendChild(h('p.mk-hint', { text: 'Sample trades, invented for the preview.' }));
    }
    right.appendChild(tp);
    layout.appendChild(right);
    ctx.restoreScroll();
  }

  ui.pages.register('listing', { nav: function () { var c = ui.shell.current(); return c && c.from || 'discover'; }, title: function () { return 'Listing'; }, mount: mountListing });
  ui.pages.register('card', { nav: function () { return 'stocks'; }, title: function () { return 'Card market'; }, mount: mountCard });
})(window.Cardable = window.Cardable || {}, window);
