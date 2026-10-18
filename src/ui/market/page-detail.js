/* Cardable Market — listing detail and card detail.
 * The real card is the hero. In the Simulation every action here is real: a purchase, bid, swap offer, buy order or
 * withdrawal changes the exact cards and Credits in the player's save, once, after a review. In the sample realm the
 * same buttons only open a review that says plainly nothing was changed. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };
  var CONFIDENCE = { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' };
  var STATUS = { active: 'Open', ending: 'Ending soon', sold: 'Sold', expired: 'Ended', cancelled: 'Withdrawn', settling: 'Settling' };

  // ---- review dialog for the sample realm: exact terms of what a trade would be, and a plain statement that this is a preview ----
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
    surface.appendChild(h('p.mk-review-note', icon('info'), h('span', { text: options.note || 'Nothing was bought, sold or saved. Your Credits and collection are unchanged. Global Market is not connected yet.' })));
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

  function sellerPanel(seller, live) {
    var persona = seller.isBot && !live ? C.market.fixtures.PERSONAS.find(function (p) { return p.id === seller.persona; }) : null;
    var box = h('section.mk-box.mk-seller-box', { 'aria-label': 'Seller' });
    box.appendChild(h('div.mk-panel-head', ui.eyebrow(seller.isYou ? 'Your listing' : seller.isBot ? 'Simulation trader' : 'Seller'), h('h3', { text: seller.alias })));
    if (live) {
      var rows = seller.isYou ? [{ label: 'Completed sales', value: String(seller.sales) }] : [
        seller.personaLabel ? { label: 'Style', value: seller.personaLabel } : { label: 'Here for', value: seller.tenureDays + (seller.tenureDays === 1 ? ' day' : ' days') }, { label: 'Completed sales', value: String(seller.sales) }
      ];
      box.appendChild(ui.statGrid(rows, { cols: rows.length }));
      var player = !seller.isBot && !seller.isYou && C.market.store && C.market.store.session.realm === 'global';
      if (player && C.market.onlineProvider && ui.social) {
        rows.push({ label: 'Reviews', value: seller.reviews ? ui.social.starsLine(seller.reviews.average) + ' · ' + seller.reviews.count + (seller.reviews.count === 1 ? ' review' : ' reviews') : 'No reviews yet' });
        var oldGrid = box.querySelector('.mk-stats'); if (oldGrid) oldGrid.remove();
        box.appendChild(ui.statGrid(rows, { cols: rows.length }));
        box.appendChild(h('div.mk-linkrow', ui.button('View profile', { icon: 'user', variant: 'secondary', size: 'sm', onClick: function () { ui.go('profile', { alias: seller.alias }); } }),
          ui.social.followButton({ kind: 'seller', alias: seller.alias }, { size: 'sm' })));
      }
      box.appendChild(h('p.mk-hint', { text: seller.isYou ? 'Withdraw it while it has no bids or offers, or let it run.'
        : player ? 'A real player, shown only by a generated two-word name. Their sales count is every completed player trade of theirs.'
          : (seller.personaNote ? seller.personaNote + ' ' : '') + 'A simulated trader on this device, not a person. It decides with its own budget and habits.' }));
      return box;
    }
    var sample = [
      { label: seller.isBot ? 'Style' : 'Completed sales', value: seller.isBot ? (persona ? persona.label : 'Bot') : String(seller.sales) },
      { label: 'Rating', value: Math.round(seller.rating * 100) + '% positive' },
      { label: 'In Beta for', value: seller.tenureDays + ' days' }
    ];
    box.appendChild(ui.statGrid(sample, { cols: 3 }));
    box.appendChild(h('p.mk-hint', { text: seller.isBot ? (persona ? persona.note + ' ' : '') + 'A simulated trader on this device, not a person.' : 'Public identity is a generated two-word name. Email and account details are never shown.' }));
    return box;
  }

  function historyPanel(l, live) {
    var box = h('section.mk-box', { 'aria-label': 'History' });
    box.appendChild(h('div.mk-panel-head', h('h3', { text: 'History' })));
    var list = h('ol.mk-events');
    var events = [{ icon: 'plus', text: 'Listed by ' + l.seller.alias, when: l.listedMin }];
    if (live) {
      if (l.format === 'auction') {
        (l.auction.history || []).forEach(function (b) { events.push({ icon: 'gavel', text: b.by + ' bid · price ' + ui.fmt.exact(b.price) + ' Credits', when: Math.max(0, b.minutesAgo) }); });
        if (l.auction.extensions) events.push({ icon: 'clock', text: 'Closing time extended ' + (l.auction.extensions === 1 ? 'once' : l.auction.extensions + ' times') + ' by late bids', when: 0.5 });
      }
      if (l.status === 'sold') events.push({ icon: 'check', text: 'Sold for ' + ui.fmt.exact(l.soldFor || 0) + ' Credits', when: l.endedMin || 0 });
      else if (l.status === 'cancelled') events.push({ icon: 'info', text: 'Withdrawn by the seller', when: l.endedMin || 0 });
      else if (l.status === 'expired') events.push({ icon: 'clock', text: 'Ended without a sale' + (l.endNote ? ' · ' + l.endNote : ''), when: l.endedMin || 0 });
    } else if (l.format === 'auction') {
      var amount = l.auction.start, count = Math.min(l.auction.bids, 6), at = l.listedMin;
      for (var i = 1; i <= count; i++) { amount = Math.min(l.auction.current, amount + K().minIncrement(amount)); events.push({ icon: 'gavel', text: 'Bid of ' + ui.fmt.exact(i === count ? l.auction.current : amount) + ' Credits', when: Math.max(1, at - Math.round(at * i / (count + 1))) }); }
      if (l.auction.bids > count) events.splice(1, 0, { icon: 'info', text: (l.auction.bids - count) + ' earlier bids not shown', when: at - 1 });
    }
    events.sort(function (a, b) { return b.when - a.when; });
    events.forEach(function (e) { list.appendChild(h('li', icon(e.icon), h('span', { text: e.text }), h('span.mk-muted', { text: e.when < 1 ? 'just now' : ui.fmt.age(e.when) }))); });
    box.appendChild(list);
    if (!live) box.appendChild(h('p.mk-hint', { text: 'Sample history, generated for this preview.' }));
    else if (l.format === 'auction' && l.auction.bids > (l.auction.history || []).length) box.appendChild(h('p.mk-hint', { text: 'Showing the most recent bids. Prices are the price after each bid, not anyone’s maximum.' }));
    return box;
  }

  function signature(r) {
    var l = r.listing, a = l.auction;
    return [l.status, l.ask, l.endsAt, l.soldFor, a ? [a.current, a.bids, a.extensions, a.youLead, a.myMax, a.reserveMet, a.bidders].join(',') : '',
      (r.offers || []).map(function (o) { return o.id + o.status + o.cash; }).join(';'), (r.myOffers || []).map(function (o) { return o.id + o.status + o.cash; }).join(';'),
      l.valuation.average, l.valuation.lowestAsk, l.valuation.bestBid, l.valuation.volume7d].join('|');
  }

  function mountListing(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, live = ui.sim.live(realm);
    var res = ctx.api.listingSync(realm, ctx.params.id);
    var back = ui.button('Back', { icon: 'back', variant: 'ghost', onClick: function () { ui.shell.back(); } });
    if (!res) {
      host.appendChild(h('div.mk-pagehead', back));
      host.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', title: 'This listing is not available', body: live ? (realm === 'global' ? 'It may have been removed, or it could not be read from Global Market just now. Try again in a moment.' : 'It closed a while ago and is no longer kept, or this simulation was reset.') : 'It may have sold, expired or been withdrawn, or this sample set may have changed.',
        actions: [{ label: 'Back to Discover', variant: 'primary', run: function () { ui.shell.goTab('discover'); } }] }));
      return;
    }
    var first = res.listing, card = res.card, owned = !!env.owned[card.id], idn = ui.identity(card, owned);
    var variant0 = first.card.variantId ? env.variants[first.card.variantId] : null;
    ctx.title(first.title || idn.name);
    host.appendChild(h('div.mk-pagehead.is-detail', back));
    var layout = h('div.mk-detail');
    host.appendChild(layout);
    var instance = { instanceId: 'mk-' + first.id, cardId: card.id, serial: first.card.serial, variantId: first.card.variantId, cardSkinId: first.card.cardSkinId, packId: first.card.packId, seen: true };
    var left = h('div.mk-detail-left');
    left.appendChild(cardStage(ctx, card, instance, owned, variant0 ? variant0.name : 'normal finish'));
    var identity = h('section.mk-box', { 'aria-label': 'Card identity' }, h('div.mk-panel-head', h('h3', { text: 'The exact card' })));
    identity.appendChild(ui.statGrid(identityRows(card, instance, env, owned), { cols: 2 }));
    var specs = null;
    try {
      var rows = [{ label: 'Memory', value: C.cardSpecs.vram(card) + ' ' + C.cardSpecs.memoryType(card) }].concat(C.cardSpecs.rows(card)).filter(function () { return !idn.concealed; });
      if (rows.length) specs = ui.statGrid(rows, { cols: 2 });
    } catch (_) { /* specs are optional */ }
    if (specs) identity.appendChild(specs);
    if (first.cover && first.cover.kind === 'sample') identity.appendChild(h('div.mk-cover-sample', { style: { '--hue': first.cover.hue } }, h('span', { text: 'Seller cover' }), h('small', { text: 'A seller’s own image. It is decoration, not proof of ownership.' })));
    if (first.items && first.items.length > 1) {
      var bundle = h('ul.mk-bundle', { 'aria-label': 'Cards in this bundle' });
      first.items.forEach(function (it) {
        var c = env.cards[it.cardId], n = c ? ui.identity(c, !!env.owned[it.cardId]) : { name: it.cardId, rarityName: '' };
        bundle.appendChild(h('li', h('strong', { text: n.name }), h('span', { text: n.rarityName + (it.variantId ? ' · ' + ((env.variants[it.variantId] || {}).name || '') : '') }), h('span.mk-mono', { text: it.serial })));
      });
      identity.appendChild(h('p.mk-hint', { text: 'A bundle of ' + first.items.length + ' cards. They sell together, and each keeps its own serial.' }));
      identity.appendChild(bundle);
    }
    identity.appendChild(h('div.mk-linkrow', ui.button('Open this card’s market', { icon: 'trend', variant: 'ghost', onClick: function () { ui.go('card', { id: card.id, variant: first.card.variantId || '' }); } })));
    left.appendChild(identity);
    // the seller's own pictures, after and apart from the card: labelled, and never a substitute for it
    var photos = realm === 'global' && ui.social ? ui.social.gallery(first) : null;
    if (photos) left.appendChild(photos);
    layout.appendChild(left);

    var right = h('div.mk-detail-right');
    layout.appendChild(right);
    var bidDraft = { value: '', touched: false };
    var lastSig = '', commentsBox = null;

    // ---- the right column is rebuilt from the latest listing whenever something that matters changed ----
    function paintRight(r) {
      var focusId = root.document.activeElement && right.contains(root.document.activeElement) ? root.document.activeElement.id : '';
      ui.clear(right);
      lastSig = signature(r);
      var l = r.listing, price = K().currentPrice(l), v = l.valuation, variant = l.card.variantId ? env.variants[l.card.variantId] : null;
      var open = l.status === 'active' || l.status === 'ending', closed = !open;
      var wallet = ctx.api.walletSync(realm), available = wallet.available != null ? wallet.available : wallet.balance;
      var mine = !!l.isMine;

      var headBox = h('header.mk-detail-head');
      var topLine = h('div.mk-detail-top');
      topLine.appendChild(h('span.mk-format', { data: { format: l.format } }, icon(ui.formatDef(l.format).icon), h('span', { text: ui.formatDef(l.format).label })));
      // The realm switch already says where you are in the Simulation; Global keeps its badge because real players are involved.
      if ((l.realm || realm) !== 'simulation') topLine.appendChild(ui.realmBadge(l.realm || realm, { short: true }));
      topLine.appendChild(ui.chip(STATUS[l.status] || l.status, { tone: l.status === 'sold' || l.status === 'expired' || l.status === 'cancelled' ? 'warn' : 'soft', icon: l.status === 'sold' ? 'check' : closed ? 'clock' : null }));
      if (mine) topLine.appendChild(ui.chip('Yours', { tone: 'soft' }));
      // What is going on with this exact auction, in the words the market uses everywhere.
      if (realm === 'global' && l.format === 'auction' && l.auction) {
        var au = l.auction;
        if (open && !au.bids) topLine.appendChild(ui.chip('Awaiting bids', { tone: 'soft' }));
        if (open && au.bids && au.hasReserve && !au.reserveMet) topLine.appendChild(ui.chip('Reserve not met', { tone: 'warn', title: 'The seller set a minimum. If bidding stops below it the auction ends unsold.' }));
        if (open && !mine && au.myMax) topLine.appendChild(au.youLead ? ui.chip('Reserved ' + ui.fmt.exact(au.myMax), { tone: 'good', icon: 'lock', title: 'Your maximum is held in escrow until the auction ends or you are outbid.' }) : ui.chip('Outbid', { tone: 'warn' }));
      }
      if (realm === 'global' && l.status === 'sold' && mine) topLine.appendChild(ui.chip('Completed', { tone: 'good', icon: 'check' }));
      headBox.appendChild(topLine);
      headBox.appendChild(h('h1', { text: l.title || idn.name }));
      var sub = [idn.rarityName, variant ? variant.name : 'Normal finish'];
      if (l.title) sub.unshift(idn.name);
      headBox.appendChild(h('p.mk-detail-sub', { text: sub.join(' · ') }));
      var watch = ui.button(store.isWatching(l.id) ? 'Watching' : 'Watch', { icon: 'bookmark', variant: 'secondary', pressed: store.isWatching(l.id), onClick: function () {
        var on = store.toggleWatch(l.id); watch.setAttribute('aria-pressed', String(on)); watch.querySelector('span').textContent = on ? 'Watching' : 'Watch';
      } });
      headBox.appendChild(h('div.mk-detail-actions', watch));
      right.appendChild(headBox);

      // ---- state banners ----
      function banner(tone, ic, text) { right.appendChild(h('div.mk-banner', { role: 'status', data: { tone: tone } }, icon(ic), h('span', { text: text }))); }
      if (l.status === 'sold') banner('warn', 'check', 'This listing sold ' + ui.fmt.age(l.endedMin || 0) + ' for ' + ui.fmt.exact(l.soldFor || price) + ' Credits.');
      else if (l.status === 'expired') banner('warn', 'clock', 'This listing ended ' + ui.fmt.age(l.endedMin || 0) + ' without a sale.' + (l.endNote ? ' ' + l.endNote + '.' : ''));
      else if (l.status === 'cancelled') banner('warn', 'info', 'The seller withdrew this listing ' + ui.fmt.age(l.endedMin || 0) + '.');
      else if (l.status === 'settling') banner('info', 'clock', 'This sale is being written to your collection. It finishes the next time the game saves.');
      if (live && l.format === 'auction' && l.auction.myMax && open && !mine) {
        if (l.auction.youLead) banner('success', 'up', 'You are leading with a maximum of ' + ui.fmt.exact(l.auction.myMax) + ' Credits. The price is ' + ui.fmt.exact(price) + '.');
        else banner('danger', 'down', 'You were outbid. Your maximum of ' + ui.fmt.exact(l.auction.myMax) + ' Credits is below the current bid of ' + ui.fmt.exact(price) + '.');
      } else if (!live) {
        var myBid = ctx.api.activitySync(realm).bids.find(function (b) { return b.listingId === l.id; });
        if (myBid && myBid.state === 'outbid') banner('danger', 'down', 'You were outbid. Your maximum of ' + ui.fmt.exact(myBid.yourMax) + ' Credits is below the current bid of ' + ui.fmt.exact(myBid.current) + '.');
        else if (myBid && myBid.state === 'leading') banner('success', 'up', 'You are leading with a maximum of ' + ui.fmt.exact(myBid.yourMax) + ' Credits.');
      }

      // ---- the coach: a plain answer to "is this a good price?" (Simulation) ----
      if (r.coach && open && !mine) {
        var co = r.coach, cbox = h('section.mk-coachbox', { data: { verdict: co.verdict }, 'aria-label': 'What the coach thinks' }, h('span.mk-coach-mark', icon(co.verdict === 'good' ? 'up' : co.verdict === 'fair' ? 'check' : 'warn')));
        var ctext = h('div.mk-coach-text', h('strong', { text: co.title }));
        co.lines.forEach(function (t) { ctext.appendChild(h('p', { text: t })); });
        ctext.appendChild(h('p.mk-coach-foot', { text: 'A guide from today’s prices, not a promise.' }));
        cbox.appendChild(ctext); right.appendChild(cbox);
      }

      // ---- price and action ----
      var panel = h('section.mk-box.mk-buybox', { 'aria-label': 'Price and action' });
      var actions = h('div.mk-buybox-actions');
      var why = function (text) { return { disabled: true, reason: text }; };
      if (l.format === 'buy-now') {
        panel.appendChild(h('div.mk-buybox-price', ui.eyebrow('Price'), ui.credits(price, { big: true }), ui.valueTag(price, v)));
        var fee = K().feeFor(price);
        panel.appendChild(ui.statGrid([
          { label: mine ? 'Buyer pays' : 'You pay', value: ui.fmt.exact(price) + ' Credits' },
          { label: mine ? 'You receive' : 'Seller receives', value: ui.fmt.exact(price - fee) + ' Credits', note: 'After the ' + cfg().fee.label.toLowerCase() + ' of ' + fee, help: 'settlement' }
        ], { cols: 2 }));
        if (live) {
          if (mine) {
            var caps = ctx.api.capabilities(realm);
            if (open && caps.reprice) actions.appendChild(ui.button('Change price', { variant: 'secondary', icon: 'tag', onClick: function () { repriceDialog(l, price); } }));
            if (!open && caps.relist && l.status !== 'sold') actions.appendChild(ui.button('List again', { variant: 'primary', icon: 'plus', onClick: function () { relistDialog(l); } }));
            actions.appendChild(ui.button('Withdraw listing', Object.assign({ variant: 'secondary', icon: 'trash', onClick: function () { withdrawListing(l); } }, open ? {} : why('This listing is closed.'))));
          } else {
            var buyOpts = { variant: 'primary', icon: 'tag', onClick: function () { buyNow(l, price, available, wallet); } };
            if (closed) Object.assign(buyOpts, why('This listing is closed.'));
            else if (available < price) Object.assign(buyOpts, why('You have ' + ui.fmt.exact(available) + ' Credits available. This costs ' + ui.fmt.exact(price) + '.'));
            actions.appendChild(ui.button('Buy now', buyOpts));
          }
        } else {
          actions.appendChild(ui.button('Preview purchase', { variant: 'primary', icon: 'tag', disabled: closed, reason: closed ? 'This listing is closed.' : '', onClick: function () { sampleReview('purchase', l, price, v); } }));
          actions.appendChild(ui.button('Make an offer', { variant: 'secondary', icon: 'swap', disabled: closed, reason: closed ? 'This listing is closed.' : '', onClick: function () { sampleOffer(l, price, v); } }));
        }
      } else if (l.format === 'auction') {
        var a = l.auction, inc = live && a.increment ? a.increment : K().minIncrement(a.current);
        var minBid = live ? (a.youLead ? a.myMax + 1 : a.minNext) : price + K().minIncrement(price);
        panel.appendChild(h('div.mk-buybox-price', ui.eyebrow(a.bids ? 'Current bid' : 'Starting bid'), ui.credits(price, { big: true }),
          h('span.mk-muted', { text: (a.bids === 1 ? '1 bid' : a.bids + ' bids') + (a.leaderAlias ? ' · ' + a.leaderAlias + ' leads' : '') })));
        panel.appendChild(ui.statGrid([
          { label: 'Time left', node: closed ? h('span.mk-num', { text: 'Ended' }) : h('span.mk-num.mk-countdown', { data: { end: String(l.endsAt || '') }, class: l.endsMin <= 60 ? 'is-urgent' : '', text: ui.fmt.duration(l.endsMin) }), tone: l.endsMin <= 60 && open ? 'urgent' : '' },
          { label: 'Reserve', value: a.reserve == null && !a.hasReserve ? 'None' : a.reserveMet ? 'Met' : 'Not met', help: 'reserve', note: mine && a.reserveAmount ? ui.fmt.exact(a.reserveAmount) + ' Credits' : null },
          { label: mine ? 'Next bid must be' : 'Lowest bid you can place', value: ui.fmt.exact(minBid) + ' Credits' },
          a.buyout ? { label: 'Buyout', value: ui.fmt.exact(a.buyout) + ' Credits' } : null
        ], { cols: 2 }));
        if (live && mine) {
          actions.appendChild(ui.button('Withdraw listing', Object.assign({ variant: 'secondary', icon: 'trash', onClick: function () { withdrawListing(l); } },
            !open ? why('This listing is closed.') : a.bids ? why('An auction with bids cannot be withdrawn.') : {})));
        } else {
          var startValue = bidDraft.touched ? bidDraft.value : String(minBid);
          var field = h('label.mk-field', h('span.mk-field-label', ui.labelWithHelp('Your maximum', 'proxy-bid')),
            h('input.mk-input.is-large', { id: 'mk-max', type: 'number', min: String(minBid), step: '1', inputmode: 'numeric', value: startValue, 'aria-describedby': 'mk-max-hint', props: { disabled: closed } }),
            h('small.mk-hint', { id: 'mk-max-hint', text: 'It bids the least that keeps you in front, up to this. A late bid adds ' + (live ? C.data.marketSim.listing.snipeExtendMin : cfg().auction.snipeExtendMin) + ' minutes.' }));
          panel.appendChild(field);
          var input = field.querySelector('input');
          var bidBtn = ui.button(live ? (a.myMax ? 'Raise maximum' : 'Place bid') : 'Preview bid', { variant: 'primary', icon: 'gavel', disabled: closed, reason: closed ? 'This auction is closed.' : '', onClick: function () {
            if (live) liveBid(l, Number(input.value), price, available, a); else sampleBid(l, Number(input.value), price);
          } });
          actions.appendChild(bidBtn);
          if (a.buyout) {
            var cannotBuyout = closed ? 'This auction is closed.' : price >= a.buyout ? 'The price has passed the buyout.' : live && available + (a.myMax || 0) < a.buyout ? 'You have ' + ui.fmt.exact(available + (a.myMax || 0)) + ' Credits available. The buyout is ' + ui.fmt.exact(a.buyout) + '.' : '';
            actions.appendChild(ui.button(live ? 'Buy out' : 'Preview buyout', { variant: 'secondary', icon: 'tag', disabled: !!cannotBuyout, reason: cannotBuyout, onClick: function () { if (live) liveBuyout(l, a, available); else sampleReview('buyout', l, price, v); } }));
          }
          var check = function () {
            var n = Number(input.value), bad = !(n >= minBid) || n !== Math.floor(n);
            input.setAttribute('aria-invalid', String(bad)); bidDraft.value = input.value; bidDraft.touched = true;
            bidBtn.disabled = bad || closed;
            bidBtn.title = bad ? 'Enter a whole maximum of at least ' + ui.fmt.exact(minBid) + ' Credits.' : '';
            if (!bad && live && n - (a.myMax || 0) > available) bidBtn.title = 'You have ' + ui.fmt.exact(available + (a.myMax || 0)) + ' Credits available for this bid.';
          };
          input.addEventListener('input', check);
          check(); bidDraft.touched = bidDraft.touched && input.value !== String(minBid);
        }
      } else {
        var wants = h('ul.mk-wants');
        l.swap.wanted.forEach(function (w) { wants.appendChild(h('li', icon('check'), h('span', { text: w.label }))); });
        panel.appendChild(h('div.mk-buybox-price', ui.eyebrow('Wants'), wants));
        if (live) {
          panel.appendChild(h('p.mk-swap-copy', { text: 'A card-for-card swap. You can add Credits to even things out; the ' + cfg().fee.label.toLowerCase() + ' applies only to that part.' }));
          panel.appendChild(ui.statGrid([
            { label: 'Value of this card', value: ui.fmt.exact(v.average) + ' Credits', note: v.basis === 'baseline' ? 'Baseline estimate' : v.samples + ' recent trades' },
            { label: 'Offers worth at least', value: l.swap.minFrac ? Math.round(l.swap.minFrac * 100) + '% of that' : 'Any' },
            { label: 'Open offers', value: String((r.offers || []).filter(function (o) { return o.status === 'pending' || o.status === 'countered'; }).length) }
          ], { cols: 2 }));
          if (mine) actions.appendChild(ui.button('Withdraw listing', Object.assign({ variant: 'secondary', icon: 'trash', onClick: function () { withdrawListing(l); } }, open ? {} : why('This listing is closed.'))));
          else {
            var free = ctx.api.inventorySync(realm).items.filter(function (i) { return !i._listed && !i.locked; });
            var swapOpts = { variant: 'primary', icon: 'swap', onClick: function () { liveSwap(l, v, r, wallet); } };
            if (closed) Object.assign(swapOpts, why('This listing is closed.'));
            else if (!free.length) Object.assign(swapOpts, why('You have no unlisted, unlocked cards to offer.'));
            actions.appendChild(ui.button('Offer a swap', swapOpts));
          }
        } else {
          var topUpText = l.swap.topUp ? (l.swap.direction === 'asks' ? 'Seller asks for ' + ui.fmt.exact(l.swap.topUp) + ' Credits on top of the card.' : 'Seller adds ' + ui.fmt.exact(l.swap.topUp) + ' Credits to even things out.') : 'A straight card-for-card swap with no Credits involved.';
          panel.appendChild(h('p.mk-swap-copy', { text: topUpText }));
          panel.appendChild(ui.statGrid([
            { label: 'Value of this card', value: ui.fmt.exact(v.average) + ' Credits', note: v.confidence === 'none' ? 'Baseline estimate' : null },
            { label: 'Market fee', value: l.swap.topUp && l.swap.direction === 'asks' ? ui.fmt.exact(K().feeFor(l.swap.topUp)) + ' on the top-up' : 'None on a pure swap', help: 'settlement' },
            { label: 'Open to counter-offers', value: l.swap.openToCounter ? 'Yes' : 'No' }
          ], { cols: 2 }));
          actions.appendChild(ui.button('Preview a swap', { variant: 'primary', icon: 'swap', disabled: closed, onClick: function () { sampleSwap(l); } }));
        }
      }
      panel.appendChild(actions);
      if (!live && !closed) panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'Preview only. Global Market is not connected, so no button here completes a trade.' })));
      if (live && !closed && !mine && wallet.held) panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: ui.fmt.exact(wallet.held) + ' of your Credits are held by open bids and buy orders, so ' + ui.fmt.exact(available) + ' are available now.' })));
      right.appendChild(panel);

      // ---- swap offers (simulation) ----
      if (live && l.format === 'swap') right.appendChild(offersPanel(r, l, mine, open, wallet));

      // ---- value read ----
      if (l.format !== 'swap') {
        var vp = h('section.mk-box', { 'aria-label': 'Value read' });
        vp.appendChild(h('div.mk-panel-head', h('h3', { text: 'How this price compares' }), live
          ? ui.chip(v.basis === 'baseline' ? 'Baseline estimate' : v.samples + ' recent trades', { tone: 'soft', title: v.basis === 'baseline' ? 'No completed trades of this card yet, so the figure comes from its specs and rarity.' : (realm === 'global' ? 'Built only from completed player trades. Quick Sell and swaps are never counted.' : 'Built only from completed trades in this simulation.') })
          : ui.chip('Illustrative', { tone: 'soft', title: 'Sample figures for the preview' })));
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
          { label: 'Confidence', value: CONFIDENCE[v.confidence], help: 'confidence' },
          { label: 'Target Buy', value: ui.fmt.exact(v.targetBuy), help: 'target-buy' }, { label: 'Target Sell', value: ui.fmt.exact(v.targetSell), help: 'target-sell' },
          { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: live ? (v.bidReal ? 'Open buy order' : 'Estimate: no buy order') : 'Hypothetical' },
          { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: live ? (v.askReal ? 'Open listing' : 'Estimate: none listed') : 'Hypothetical' },
          { label: '7 day volume', value: v.samples ? v.volume7d + ' sold' : 'No sales yet', help: 'volume' },
          live ? { label: 'Open now', value: (v.openAsks || 0) + ' listed · ' + (v.openBids || 0) + ' wanted' } : { label: 'Estimated sale time', value: '~' + v.windowHours + ' h', help: 'liquidity' }
        ], { cols: 2 }));
        right.appendChild(vp);
      }

      // ---- why this listing ranks where it does ----
      if (r.rank && open && !mine) {
        var whyBox = h('section.mk-box', { 'aria-label': 'Why this ranks here' }, h('div.mk-panel-head', h('h3', { text: 'Why you are seeing this' }), ui.chip(live ? 'Ranking factors' : 'Illustrative weights', { tone: 'soft' })));
        var reasons = h('ul.mk-reasons');
        (r.rank.reasons.length ? r.rank.reasons : [{ id: 'none', label: 'Nothing stands out. It is shown because it matches what you are browsing.' }]).forEach(function (x) {
          reasons.appendChild(h('li', { data: { reason: x.id } }, icon(x.id === 'risk' ? 'warn' : 'check'), h('span', { text: x.label })));
        });
        whyBox.appendChild(reasons);
        var parts = [['value', 'Value against Average Value'], ['budget', 'Fit for your budget'], ['gap', 'Fills a collection gap'], ['liquidity', 'How easily it trades'], ['trust', 'Seller track record'], ['fresh', 'How recently it was listed']];
        var bars = h('div.mk-bars', { role: 'list' });
        parts.forEach(function (p) {
          var value = Math.max(0, Math.min(1, r.rank.components[p[0]] || 0));
          bars.appendChild(h('div.mk-bar', { role: 'listitem', 'aria-label': p[1] + ' ' + Math.round(value * 100) + ' of 100' }, h('span', { text: p[1] }), h('i', { style: { '--v': value } }), h('span.mk-num', { text: String(Math.round(value * 100)) })));
        });
        whyBox.appendChild(bars);
        whyBox.appendChild(h('p.mk-hint', { text: 'Risk: ' + { low: 'lower', moderate: 'moderate', higher: 'higher' }[r.rank.risk] + '. The Recommended order weighs these together. It is never just the lowest price, and it is not advice to buy.' }));
        right.appendChild(whyBox);
      }
      right.appendChild(sellerPanel(l.seller, live));
      if (l.description) right.appendChild(h('section.mk-box', h('div.mk-panel-head', h('h3', { text: 'From the seller' })), h('p.mk-prose', { text: l.description })));
      right.appendChild(historyPanel(l, live));
      if (live && r.trades && r.trades.length) {
        var tbox = h('section.mk-box', { 'aria-label': 'Recent sales of this card' }, h('div.mk-panel-head', h('h3', { text: 'Recent sales of this card' })));
        var tl = h('ul.mk-events');
        r.trades.slice(0, 5).forEach(function (t) {
          tl.appendChild(h('li', { title: [t.sellerWhy, t.buyerWhy].filter(Boolean).join(' · ') }, icon('check'), h('span', { text: ui.fmt.exact(t.price) + ' Credits · ' + t.seller + ' to ' + t.buyer }), h('span.mk-muted', { text: ui.fmt.age(t.minutesAgo) })));
        });
        tbox.appendChild(tl);
        right.appendChild(tbox);
      }
      if (realm === 'global' && ui.social && C.market.onlineProvider) {
        // built once: it keeps its own draft and subscription while the rest of this column is redrawn
        if (!commentsBox) commentsBox = ui.social.commentsPanel(ctx, l);
        right.appendChild(commentsBox);
        var share = h('section.mk-box', { 'aria-label': 'Share or report' }, h('div.mk-panel-head', h('h3', { text: 'Share or report' })));
        share.appendChild(h('div.mk-linkrow', ui.button('Copy listing reference', { icon: 'copy', variant: 'secondary', size: 'sm', onClick: function () { ui.social.copyRef(l.id); } }),
          mine ? null : ui.button('Report listing', { icon: 'warn', variant: 'ghost', size: 'sm', onClick: function () { ui.social.reportDialog('listing', l.id, l.id, 'this listing'); } })));
        share.appendChild(h('p.mk-hint', { text: 'A reference is plain text. Paste it into Market search to open this listing. It is not a link.' }));
        right.appendChild(share);
      } else {
        var comments = h('section.mk-box.is-inactive', { 'aria-label': 'Comments' }, h('div.mk-panel-head', h('h3', { text: 'Comments' }), ui.chip('Players only', { tone: 'soft' })));
        comments.appendChild(h('p.mk-hint', { text: 'Local traders are software, so there is no one to comment or rate. Comments and reviews live in Global.' }));
        right.appendChild(comments);
      }
      ui.sim.countdowns(right);
      if (focusId) { var again = right.querySelector('#' + focusId); if (again) again.focus({ preventScroll: true }); }
    }

    // ---- simulation: swap offers panel ----
    function offerLine(o) {
      var give = o.give.map(function (g) { var c = env.cards[g.cardId]; return (c ? ui.identity(c, true).name : g.cardId) + ' (' + ui.fmt.exact(g.worth) + ')'; }).join(', ');
      return give + (o.cash ? ' + ' + ui.fmt.exact(o.cash) + ' Credits' : '') + (o.refund ? ' and ' + ui.fmt.exact(o.refund) + ' Credits back' : '');
    }
    function offersPanel(r, l, mine, open, wallet) {
      var box = h('section.mk-box', { 'aria-label': mine ? 'Offers on your listing' : 'Your offers' });
      box.appendChild(h('div.mk-panel-head', h('h3', { text: mine ? 'Offers on your listing' : 'Your offers' })));
      var list = (mine ? r.offers : r.myOffers) || [];
      if (!list.length) { box.appendChild(h('p.mk-hint', { text: mine ? (realm === 'global' ? 'No one has offered yet. An offer from another player appears here the moment it arrives.' : 'No one has offered yet. Traders look at swaps as they wake through the day.') : 'You have not offered anything on this listing.' })); return box; }
      var ul = h('ul.mk-offers');
      list.slice().sort(function (a, b) { return a.minutesAgo - b.minutesAgo; }).forEach(function (o) {
        var live1 = o.status === 'pending' || o.status === 'countered';
        var li = h('li.mk-offer', { data: { status: o.status } });
        var statusWord = { pending: 'Waiting', countered: o.fromYou ? 'Countered' : 'Countered', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired', settling: 'Settling' }[o.status] || o.status;
        li.appendChild(h('div.mk-offer-copy', h('strong', { text: (o.fromYou ? 'You offered' : o.from + ' offered') + ': ' + offerLine(o) }),
          h('span.mk-muted', { text: statusWord + ' · ' + ui.fmt.age(o.minutesAgo) + (live1 ? ' · ' + ui.fmt.duration(o.minutesLeft) + ' left' : '') + (o.note ? ' · ' + o.note : '') })));
        var acts = h('div.mk-offer-actions');
        var canCounter = realm === 'global' && ctx.api.capabilities(realm).counter && o.myTurn && (o.round || 0) < 6;
        if (live1 && o.myTurn != null && realm === 'global') {
          if (o.myTurn) {
            acts.appendChild(ui.button(o.fromYou ? 'Accept counter' : 'Accept', { variant: 'primary', size: 'sm', onClick: function () { answerOffer(o, true); } }));
            if (canCounter) acts.appendChild(ui.button('Counter', { variant: 'secondary', size: 'sm', onClick: function () { counterDialog(o); } }));
            acts.appendChild(ui.button('Decline', { variant: 'ghost', size: 'sm', onClick: function () { answerOffer(o, false); } }));
          } else if (o.fromYou) acts.appendChild(ui.button('Withdraw', { variant: 'ghost', size: 'sm', onClick: function () { dropOffer(o); } }));
        } else if (live1 && o.toYou && o.status === 'pending') {
          acts.appendChild(ui.button('Accept', { variant: 'primary', size: 'sm', onClick: function () { answerOffer(o, true); } }));
          acts.appendChild(ui.button('Decline', { variant: 'ghost', size: 'sm', onClick: function () { answerOffer(o, false); } }));
        } else if (live1 && o.fromYou && o.status === 'countered') {
          acts.appendChild(ui.button('Accept counter', { variant: 'primary', size: 'sm', onClick: function () { answerOffer(o, true); } }));
          acts.appendChild(ui.button('Withdraw', { variant: 'ghost', size: 'sm', onClick: function () { dropOffer(o); } }));
        } else if (live1 && o.fromYou) acts.appendChild(ui.button('Withdraw', { variant: 'ghost', size: 'sm', onClick: function () { dropOffer(o); } }));
        li.appendChild(acts);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      return box;
    }
    // In Global an offer carries only what the other side puts forward; what you receive or give up is the listing's own cards.
    function offerGet(o) {
      if (o.get && o.get.length) return o.get;
      var cur = ctx.api.listingSync(realm, ctx.params.id);
      return cur ? cur.listing.items.map(function (i) { return { cardId: i.cardId, variantId: i.variantId, serial: i.serial, worth: cur.listing.valuation ? Math.round(cur.listing.valuation.average / Math.max(1, cur.listing.items.length)) : 0 }; }) : [];
    }
    function counterDialog(o) {
      var iAmSeller = !!o.toYou, mode = 'cash';
      var amount = h('input.mk-input.is-large', { type: 'number', min: '0', step: '1', inputmode: 'numeric', value: String(o.cash || o.refund || 0), 'aria-label': 'Credits' });
      var note = h('input.mk-input', { type: 'text', maxlength: '140', placeholder: 'A short note (optional, no links or contact details)', 'aria-label': 'Note to the other player' });
      var opts = iAmSeller
        ? [{ value: 'cash', label: 'They add Credits on top' }, { value: 'refund', label: 'I give Credits back' }]
        : [{ value: 'cash', label: 'I add Credits on top' }, { value: 'refund', label: 'I ask for Credits back' }];
      if (o.refund && !o.cash) mode = 'refund';
      var seg = ui.segmented({ label: 'Direction of the Credits', value: mode, onChange: function (v) { mode = v; sync(); }, options: opts });
      var summary = h('p.mk-swap-summary', { role: 'status', 'aria-live': 'polite' });
      function sync() {
        var n = Math.max(0, Math.floor(Number(amount.value) || 0)), fee = n ? K().feeFor(n) : 0;
        summary.textContent = n ? ui.fmt.exact(n) + ' Credits ' + (mode === 'cash' ? 'move from the person who offered to the seller' : 'go back from the seller to the person who offered') + '. The ' + cfg().fee.label.toLowerCase() + ' of ' + ui.fmt.exact(fee) + ' is taken from the one who receives them.' : 'A card-for-card swap: no Credits move, so there is no fee.';
      }
      amount.addEventListener('input', sync); sync();
      var body = h('div.mk-swapper', h('label.mk-field', h('span.mk-field-label', { text: 'Credits' }), amount), seg, h('label.mk-field', h('span.mk-field-label', { text: 'Note' }), note), summary);
      ui.sim.confirm({
        title: 'Counter this offer', eyebrow: iAmSeller ? 'Reply to ' + o.from : 'Reply to ' + o.to, anchor: root.document.activeElement, body: body, rows: [],
        note: 'Only the Credits change. They can accept, counter (six replies at most) or decline. Nothing moves until someone accepts.',
        confirmLabel: 'Send counteroffer', icon: 'swap',
        run: function (req) {
          var n = Math.max(0, Math.floor(Number(amount.value) || 0));
          return ctx.api.counterOffer(realm, o.id, { cash: mode === 'cash' ? n : 0, refund: mode === 'refund' ? n : 0, message: note.value.trim() }, req);
        },
        success: function () { C.ui.toast('Counteroffer sent'); repaintNow(); }, failure: repaintNow
      });
    }
    function answerOffer(o, accept) {
      var got = offerGet(o);
      var worthIn = o.give.reduce(function (n, g) { return n + g.worth; }, 0), worthOut = got.reduce(function (n, g) { return n + g.worth; }, 0);
      if (!accept) {
        ctx.api.respondToOffer(realm, o.id, false).then(function (res) { C.ui.toast(res.ok ? 'Offer declined' : res.message, null, res.ok ? 'info' : 'error'); repaintNow(); });
        return;
      }
      ui.sim.confirm({
        title: 'Accept this swap', eyebrow: 'Review', anchor: root.document.activeElement,
        rows: (function () {
          var name = function (g) { var c = env.cards[g.cardId]; return c ? ui.identity(c, true).name : g.cardId; };
          var youGive = o.fromYou && realm === 'global' ? o.give : got, youGet = o.fromYou && realm === 'global' ? got : o.give;
          var moves = o.cash ? { label: o.fromYou ? 'You add' : 'They add', value: ui.fmt.exact(o.cash) + ' Credits', fee: K().feeFor(o.cash) } : o.refund ? { label: o.fromYou ? 'You receive back' : 'You give back', value: ui.fmt.exact(o.refund) + ' Credits', fee: K().feeFor(o.refund) } : null;
          return [
            { label: 'You give', value: youGive.map(name).join(', ') },
            { label: 'You receive', value: youGet.map(name).join(', ') },
            moves ? { label: moves.label, value: moves.value } : null,
            moves ? { label: 'Market fee', value: ui.fmt.exact(moves.fee) + ' Credits, taken once from whoever receives the Credits' } : { label: 'Market fee', value: 'None on a card-for-card swap' },
            { label: 'Value in and out', value: ui.fmt.exact(worthOut) + ' for ' + ui.fmt.exact(worthIn) + ' Credits', strong: true }
          ];
        }()),
        note: 'Both sides move at once. If anything changed in the meantime, nothing happens and nothing is held.',
        confirmLabel: 'Accept swap', icon: 'swap',
        run: function (req) { return ctx.api.respondToOffer(realm, o.id, true, req); },
        success: function () { C.ui.toast('Swap complete'); repaintNow(); }
      });
    }
    function dropOffer(o) {
      ctx.api.withdrawOffer(realm, o.id).then(function (res) { C.ui.toast(res.ok ? 'Offer withdrawn' : res.message, null, res.ok ? 'info' : 'error'); repaintNow(); });
    }

    // ---- simulation: actions ----
    function repaintNow() {
      var fresh = ctx.api.listingSync(realm, ctx.params.id);
      if (fresh) paintRight(fresh);
      ui.shell.refresh();
    }
    function cardChip(l) { return h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName + ' · ' + (l.card.variantId ? (env.variants[l.card.variantId] || {}).name : 'Normal finish') + ' · ' + l.card.serial })); }
    function balanceRows(cost, wallet) {
      var avail = wallet.available != null ? wallet.available : wallet.balance;
      return [{ label: 'Your Credits now', value: ui.fmt.exact(wallet.balance) + (wallet.held ? ' (' + ui.fmt.exact(wallet.held) + ' held)' : '') },
        { label: 'Available after', value: avail - cost >= 0 ? ui.fmt.exact(avail - cost) : 'Short by ' + ui.fmt.exact(cost - avail), strong: true }];
    }
    function direct(fn, okText) {
      // Under the Large trades only setting, a small trade runs straight away; the result is always told.
      Promise.resolve(fn(ui.sim.newRequestId())).then(function (res) {
        if (res && res.ok !== false) { C.ui.toast(okText(res)); } else C.ui.toast((res && res.message) || 'That did not work. Nothing was changed.', null, 'error');
        repaintNow();
      });
    }
    function buyNow(l, price, available, wallet) {
      var run = function (req) { return ctx.api.purchase(realm, l.id, req, price); };
      var done = function () { return 'Bought ' + idn.name + ' for ' + ui.fmt.exact(price) + ' Credits'; };
      if (!needsReview(price)) { direct(run, done); return; }
      ui.sim.confirm({
        title: 'Confirm purchase', card: cardChip(l), anchor: root.document.activeElement,
        rows: [{ label: 'Item', value: idn.name }, { label: 'Serial', node: h('span.mk-mono', { text: l.card.serial }) }, { label: 'Price', node: ui.credits(price) }, { label: 'Seller', value: l.seller.alias }].concat(balanceRows(price, wallet)),
        note: 'The card is yours at once. The seller gets ' + ui.fmt.exact(price - K().feeFor(price)) + ' after the ' + cfg().fee.label.toLowerCase() + '.',
        confirmLabel: 'Buy for ' + ui.fmt.exact(price), icon: 'tag', run: run,
        success: function () { C.ui.toast(done()); repaintNow(); }, failure: repaintNow
      });
    }
    function liveBid(l, max, price, available, a) {
      var minBid = a.youLead ? a.myMax + 1 : a.minNext;
      if (!(max >= minBid) || max !== Math.floor(max)) { C.ui.toast('Enter a whole maximum of at least ' + ui.fmt.exact(minBid) + ' Credits.', null, 'error'); return; }
      var extra = max - (a.myMax || 0);
      var run = function (req) { return ctx.api.placeBid(realm, l.id, max, req); };
      var done = function (res) { return res.leading ? 'You are leading at ' + ui.fmt.exact(res.price) + ' Credits' : 'Bid placed, but another bid is higher'; };
      if (!needsReview(extra)) { direct(run, done); return; }
      var now = a.bidders ? Math.min(max, a.minNext) : a.minNext;
      ui.sim.confirm({
        title: 'Confirm bid', card: cardChip(l), anchor: root.document.activeElement,
        rows: [
          { label: 'Your maximum', node: ui.credits(max) },
          { label: a.bidders ? 'The market bids now' : 'Opening bid', node: ui.credits(a.bidders ? Math.min(max, a.minNext) : a.start) },
          { label: 'Held until it ends', value: ui.fmt.exact(max) + ' Credits' },
          { label: 'Closes', value: ui.fmt.duration(l.endsMin) + (l.endsMin <= C.data.marketSim.listing.snipeWindowMin ? ' (extends on late bids)' : '') }
        ].concat(balanceRows(extra, ctx.api.walletSync(realm))),
        note: 'Nothing is paid until you win. You pay the least that beats the next bidder, never more than your maximum.',
        confirmLabel: a.myMax ? 'Raise maximum to ' + ui.fmt.exact(max) : 'Place bid', icon: 'gavel', run: run,
        success: function (res) { C.ui.toast(done(res)); repaintNow(); }, failure: repaintNow
      });
    }
    function liveBuyout(l, a, available) {
      ui.sim.confirm({
        title: 'Confirm buyout', card: cardChip(l), anchor: root.document.activeElement,
        rows: [{ label: 'Buyout price', node: ui.credits(a.buyout) }, { label: 'Ends the auction', value: 'Immediately' }].concat(balanceRows(a.buyout - (a.myMax || 0), ctx.api.walletSync(realm))),
        note: 'The card joins your collection straight away. Anyone currently bidding gets their hold back.',
        confirmLabel: 'Buy out for ' + ui.fmt.exact(a.buyout), icon: 'tag',
        run: function (req) { return ctx.api.buyout(realm, l.id, req, a.buyout); },
        success: function () { C.ui.toast('Bought ' + idn.name + ' for ' + ui.fmt.exact(a.buyout) + ' Credits'); repaintNow(); }, failure: repaintNow
      });
    }
    function repriceDialog(l, price) {
      var input = h('input.mk-input.is-large', { type: 'number', min: '1', step: '1', inputmode: 'numeric', value: String(price), 'aria-label': 'New price in Credits' });
      var preview = h('p.mk-swap-summary', { role: 'status', 'aria-live': 'polite' });
      function sync() { var n = Math.floor(Number(input.value) || 0); preview.textContent = n >= 1 ? 'Buyers pay ' + ui.fmt.exact(n) + ' Credits. You receive ' + ui.fmt.exact(n - K().feeFor(n)) + ' after the ' + cfg().fee.label.toLowerCase() + ' of ' + ui.fmt.exact(K().feeFor(n)) + '.' : 'Enter a whole price of at least 1 Credit.'; }
      input.addEventListener('input', sync); sync();
      ui.sim.confirm({
        title: 'Change the price', card: cardChip(l), eyebrow: 'Your listing', anchor: root.document.activeElement, body: h('div.mk-swapper', h('label.mk-field', h('span.mk-field-label', { text: 'New price' }), input), preview), rows: [],
        note: 'A buyer looking at the old price is told it changed and must review the new one.',
        confirmLabel: 'Change price', icon: 'tag',
        run: function (req) { var n = Math.floor(Number(input.value)); if (!(n >= 1)) return { ok: false, message: 'Enter a whole price of at least 1 Credit.' }; return ctx.api.repriceListing(realm, l.id, n, req); },
        success: function () { C.ui.toast('Price changed'); repaintNow(); }, failure: repaintNow
      });
    }
    function relistDialog(l) {
      ui.sim.confirm({
        title: 'List this card again', card: cardChip(l), eyebrow: 'Your listing', anchor: root.document.activeElement,
        rows: [{ label: 'Type', value: ui.formatDef(l.format).label }, { label: l.format === 'auction' ? 'Starting bid' : 'Price', node: ui.credits(l.format === 'auction' ? l.auction.start : l.ask) }],
        note: 'The same terms, a new listing. The card is held again until it sells or you withdraw it.',
        confirmLabel: 'List again', icon: 'check',
        run: function (req) { return ctx.api.relistListing(realm, l.id, req); },
        success: function (res) { C.ui.toast('Listed again'); if (res.listing && res.listing.id) ui.go('listing', { id: res.listing.id }, { replace: true }); else repaintNow(); }, failure: repaintNow
      });
    }
    function withdrawListing(l) {
      ui.sim.confirm({
        title: 'Withdraw this listing', card: cardChip(l), eyebrow: 'Your listing', anchor: root.document.activeElement,
        rows: [{ label: 'Card', value: idn.name }, { label: 'After', value: 'Back to your collection, unlocked' }],
        note: l.format === 'swap' ? 'Open offers on it are closed and anything locked for them is released.' : 'No fee is charged for withdrawing.',
        confirmLabel: 'Withdraw', icon: 'trash',
        run: function () { return ctx.api.cancelListing(realm, l.id); },
        success: function () { C.ui.toast('Listing withdrawn'); repaintNow(); }, failure: repaintNow
      });
    }
    function liveSwap(l, v, r, wallet) {
      var inv = ctx.api.inventorySync(realm).items.filter(function (i) { return !i._listed && !i.locked; });
      var chosen = {}, cash = 0, ready = null;
      var body = h('div.mk-swapper');
      var summary = h('p.mk-swap-summary', { role: 'status', 'aria-live': 'polite' });
      var cashInput = h('input.mk-input', { type: 'number', min: '0', step: '1', inputmode: 'numeric', placeholder: '0', 'aria-label': 'Credits to add (optional)' });
      var search = h('input.mk-input', { type: 'search', placeholder: 'Search your cards', 'aria-label': 'Search your cards' });
      var list = h('div.mk-picker.is-compact', { role: 'group', 'aria-label': 'Your cards' });
      var enriched = inv.map(function (i) {
        var c = env.cards[i.cardId], n = ui.identity(c, true);
        var val = ctx.api.valuationSync(realm, { cardId: i.cardId, variantId: i.variantId || null, cardSkinId: i.cardSkinId || null, serial: i.serial });
        return { inst: i, name: n.name, rarity: n.rarityName, worth: val ? val.average : 0, finish: i.variantId ? (env.variants[i.variantId] || {}).name : 'Normal' };
      }).sort(function (a, b) { return Math.abs(a.worth - v.average) - Math.abs(b.worth - v.average) || b.worth - a.worth; });
      var pick = function () { return enriched.filter(function (e) { return chosen[e.inst.instanceId]; }); };
      function update() {
        var picks = pick(), worth = picks.reduce(function (n, e) { return n + e.worth; }, 0), add = Math.max(0, Math.floor(Number(cashInput.value) || 0));
        var total = worth + add, theirs = v.average, pct = theirs ? Math.round(total / theirs * 100) : 0;
        summary.textContent = picks.length
          ? 'You give ' + picks.length + (picks.length === 1 ? ' card' : ' cards') + ' worth about ' + ui.fmt.exact(worth) + (add ? ' plus ' + ui.fmt.exact(add) + ' Credits' : '') + ' for a card worth about ' + ui.fmt.exact(theirs) + ' (' + pct + '% of it).'
            + (pct > 140 ? ' That is well above what it is worth: a trader would happily take it.' : pct < 70 ? ' That is well below, so it is unlikely to be accepted.' : '')
          : 'Choose the card or cards you would give. The closest in value are listed first.';
        if (ready) {
          var short = add > ((wallet.available != null ? wallet.available : wallet.balance));
          ready.go.disabled = !picks.length || short;
          ready.go.title = !picks.length ? 'Choose at least one card.' : short ? 'You do not have that many Credits available.' : '';
        }
      }
      function paint() {
        ui.releaseArt(list, ctx.thumbs); ui.clear(list);
        var q = search.value.trim().toLowerCase();
        enriched.filter(function (e) { return !q || (e.name + ' ' + e.rarity + ' ' + e.finish).toLowerCase().indexOf(q) >= 0; }).slice(0, 80).forEach(function (e) {
          var on = !!chosen[e.inst.instanceId];
          var b = h('button.mk-pick-row', { type: 'button', role: 'checkbox', 'aria-checked': String(on), data: { instance: e.inst.instanceId } }, icon(on ? 'check' : 'plus'),
            h('span.mk-pick-name', { text: e.name }), h('span.mk-muted', { text: e.rarity + ' · ' + e.finish }), h('span.mk-mono', { text: e.inst.serial.replace('CBL-', '') }), h('span.mk-num', { text: '~' + ui.fmt.exact(e.worth) }));
          b.addEventListener('click', function () {
            if (chosen[e.inst.instanceId]) delete chosen[e.inst.instanceId];
            else if (Object.keys(chosen).length < C.data.marketSim.listing.maxBundle) chosen[e.inst.instanceId] = true;
            else C.ui.toast('An offer holds at most ' + C.data.marketSim.listing.maxBundle + ' cards.');
            paint(); update();
          });
          list.appendChild(b);
        });
        if (!list.firstChild) list.appendChild(h('p.mk-hint', { text: 'No card matches that search.' }));
      }
      search.addEventListener('input', paint); cashInput.addEventListener('input', update);
      body.append(search, list, h('label.mk-field', h('span.mk-field-label', { text: 'Add Credits (optional)' }), cashInput,
        h('small.mk-hint', { text: 'Credits you add are held until the seller answers. The ' + cfg().fee.label.toLowerCase() + ' applies to that part only.' })), summary);
      paint();
      ui.sim.confirm({
        title: 'Offer a swap', eyebrow: 'For ' + idn.name, card: cardChip(l), body: body, anchor: root.document.activeElement,
        rows: [], note: 'Your chosen cards are locked while the offer is open. The seller has two days to answer.',
        confirmLabel: 'Send offer', icon: 'swap', disabledReason: 'Choose at least one card.',
        ready: function (api) { ready = api; update(); },
        run: function (req) { return ctx.api.makeOffer(realm, { listingId: l.id, instanceIds: Object.keys(chosen), cash: Math.max(0, Math.floor(Number(cashInput.value) || 0)), requestId: req }); },
        success: function () { C.ui.toast('Offer sent'); repaintNow(); }, failure: repaintNow
      });
    }

    // ---- sample realm: previews that change nothing ----
    function sampleBalanceRows(cost) {
      var w = ctx.api.walletSync(realm);
      if (w.balance == null) return [{ label: 'Wallet', value: 'Not connected' }];
      var after = w.balance - cost;
      return [{ label: 'Your Credits now', value: ui.fmt.exact(w.balance) }, { label: 'Would be after', value: after >= 0 ? ui.fmt.exact(after) : 'Short by ' + ui.fmt.exact(-after), strong: true }];
    }
    function sampleReview(kind, l, price, v) {
      if (kind === 'purchase') {
        if (!needsReview(price)) { C.ui.toast('Preview only. A purchase under your confirmation setting would have completed. Nothing was spent.'); return; }
        review({ title: 'Review purchase', card: cardChip(l), rows: [
          { label: 'Item', value: idn.name }, { label: 'Serial', node: h('span.mk-mono', { text: l.card.serial }) },
          { label: 'Price', node: ui.credits(price) }, { label: 'Seller', value: l.seller.alias }
        ].concat(sampleBalanceRows(price), [{ label: 'Realm', value: ui.realmDef(l.realm || realm).label }]) });
      } else review({ title: 'Review buyout', card: cardChip(l), rows: [{ label: 'Buyout price', node: ui.credits(l.auction.buyout) }, { label: 'Ends the auction', value: 'Immediately' }].concat(sampleBalanceRows(l.auction.buyout)) });
    }
    function sampleBid(l, max, price) {
      var next = price + K().minIncrement(price);
      review({ title: 'Review bid', card: cardChip(l), rows: [
        { label: 'Your maximum', node: ui.credits(max) }, { label: 'Market bids now', node: ui.credits(Math.min(max, next)) },
        { label: 'Held in escrow', value: 'Up to ' + ui.fmt.exact(max) + ' Credits' }, { label: 'Closes', value: ui.fmt.duration(l.endsMin) + (l.endsMin <= cfg().auction.snipeWindowMin ? ' (extends on late bids)' : '') }
      ].concat(sampleBalanceRows(Math.min(max, next))) });
    }
    function sampleOffer(l, price, v) {
      var min = Math.max(1, Math.round(v.average * 0.8));
      var surface = h('section.mk-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Make an offer' });
      var input = h('input.mk-input.is-large', { type: 'number', min: '1', value: String(Math.max(1, Math.round(price * 0.92))), inputmode: 'numeric', 'aria-label': 'Offer in Credits' });
      surface.append(h('h2', { text: 'Make an offer' }), h('p', { text: 'Offers below ' + ui.fmt.exact(min) + ' Credits, 80% of Average Value, rarely succeed. The seller may accept, decline or counter.' }), input,
        h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }),
          ui.button('Preview offer', { variant: 'primary', onClick: function () { var n = Number(input.value); handle.close(); review({ title: 'Review offer', card: cardChip(l), rows: [{ label: 'Your offer', node: ui.credits(n) }, { label: 'Asking price', node: ui.credits(price) }, { label: 'Difference', value: ui.fmt.pct((n - price) / price, true) }].concat(sampleBalanceRows(n)) }); } })));
      var handle = C.ui.present(surface, { anchor: root.document.activeElement });
    }
    function sampleSwap(l) {
      var inv = ctx.api.inventorySync(realm);
      review({ title: 'Review swap', card: cardChip(l), rows: [
        { label: 'You give', value: inv.items.length ? 'Choose one of your ' + inv.items.length + ' cards when swaps are live' : 'A card from your collection' },
        { label: 'You receive', value: idn.name }, { label: 'Credits', value: l.swap.topUp ? (l.swap.direction === 'asks' ? 'You add ' : 'You receive ') + ui.fmt.exact(l.swap.topUp) : 'None' }
      ] });
    }

    paintRight(res);

    // similar
    if (res.similar && res.similar.length) {
      var sim = h('section.mk-section', h('div.mk-section-head', h('h2', { text: 'More of this card' })));
      var grid = h('div.mk-grid.is-compact', { role: 'list' });
      var tileEnv = { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: 0 };
      res.similar.forEach(function (s, i) { tileEnv.index = i; var t = ui.listingTile({ listing: s, rank: K().recommend(s, env.ctx) }, tileEnv); t.setAttribute('role', 'listitem'); grid.appendChild(t); });
      sim.appendChild(grid); host.appendChild(sim);
    }

    if (live) {
      scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var fresh = ctx.api.listingSync(realm, ctx.params.id);
        if (!fresh) return;
        if (signature(fresh) !== lastSig) paintRight(fresh); else ui.sim.countdowns(right);
      }));
    }
    ctx.restoreScroll();
  }

  // ---- card detail ----
  function mountCard(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, live = ui.sim.live(realm);
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
    layout.appendChild(right);
    var charts = [], cardSig = '';
    scope.add(function () { charts.forEach(function (c) { c.destroy(); }); charts = []; });
    function signatureOf(r) {
      var v = r.valuation, d = r.depth || { asks: [], bids: [] };
      return [v.average, v.lastSale, v.volume24h, v.volume7d, v.bestBid, v.lowestAsk, r.owned, r.listings.map(function (l) { return l.id + ':' + K().currentPrice(l); }).join(','),
        r.trades[0] ? r.trades[0].id : '', d.asks.join(','), d.bids.join(','), (r.myOrders || []).map(function (o) { return o.id; }).join(',')].join('|');
    }

    function paint(r) {
      charts.forEach(function (c) { c.destroy(); }); charts = [];
      ui.clear(right);
      cardSig = signatureOf(r);
      var v = r.valuation;
      var headBox = h('header.mk-detail-head');
      headBox.appendChild(h('div.mk-detail-top', ui.chip(idn.rarityName, { tone: 'rarity' }), variant ? ui.chip(variant.name) : null, ui.realmBadge(realm, { short: true })));
      headBox.appendChild(h('h1', { text: idn.name }));
      headBox.appendChild(h('p.mk-detail-sub', { text: r.listings.length + ' open listings · ' + (owned ? 'You own ' + r.owned : 'Not in your collection') }));
      var acts = h('div.mk-detail-actions');
      acts.appendChild(ui.button('Set a price alert', { icon: 'bell', variant: 'secondary', onClick: function () { ui.go('alerts', { cardId: card.id }); } }));
      acts.appendChild(ui.button('Open in Prices', { icon: 'trend', variant: 'secondary', onClick: function () { var s = store.session; s.stocks = { scope: 'card', id: card.id, variantId: variantId }; ui.shell.goTab('stocks'); } }));
      if (ui.compare) {
        var inCompare = ui.compare.has(realm, card.id, variantId);
        acts.appendChild(ui.button(inCompare ? 'In Compare' : 'Compare', { icon: 'cards', variant: 'secondary', pressed: inCompare, onClick: function (e) {
          var now = ui.compare.toggle(realm, card.id, variantId);
          if (e && e.currentTarget && now !== false) { e.currentTarget.setAttribute('aria-pressed', String(!!now)); e.currentTarget.querySelector('span').textContent = now ? 'In Compare' : 'Compare'; }
        } }));
      }
      if (live) acts.appendChild(ui.button('Place a buy order', { icon: 'tag', variant: 'secondary', onClick: function () { buyOrder(r); } }));
      if (owned) acts.appendChild(ui.button('List a copy', { icon: 'plus', variant: 'primary', onClick: function () { ui.go('compose', { cardId: card.id }); } }));
      headBox.appendChild(acts);
      right.appendChild(headBox);

      var vp = h('section.mk-box', { 'aria-label': 'Market numbers' });
      vp.appendChild(h('div.mk-panel-head', h('h3', { text: 'Market numbers' }), ui.chip(v.basis === 'baseline' ? 'Baseline estimate' : live ? v.samples + ' recent trades' : 'Illustrative', { tone: 'soft' })));
      vp.appendChild(ui.statGrid([
        { label: 'Average Value', value: ui.fmt.exact(v.average), help: 'average-value', note: v.basis === 'baseline' ? 'No sales yet' : v.samples + ' recent sales' },
        { label: 'Last sale', value: v.lastSale ? ui.fmt.exact(v.lastSale) : 'No sales yet' },
        { label: 'Target Buy', value: ui.fmt.exact(v.targetBuy), help: 'target-buy' }, { label: 'Target Sell', value: ui.fmt.exact(v.targetSell), help: 'target-sell' },
        { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: live ? (v.bidReal ? 'Open buy order' : 'Estimate: no buy order') : 'Hypothetical' },
        { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: live ? (v.askReal ? 'Open listing' : 'Estimate: none listed') : 'Hypothetical', help: 'spread' },
        { label: '24 h change', node: ui.delta(v.change24h, { empty: 'No sales yet' }) }, { label: '7 d change', node: ui.delta(v.change7d, { empty: 'No sales yet' }) },
        { label: 'Volume, 7 d', value: v.samples ? v.volume7d + ' sold' : 'No sales yet', help: 'volume' },
        { label: 'Volatility', value: v.volatility == null ? 'Not enough trades' : ui.fmt.pct(v.volatility, false, 1) + ' a trade', help: 'volatility' },
        { label: 'Liquidity', value: v.liquidity == null ? 'No trades yet' : Math.round(v.liquidity * 100) + ' of 100', help: 'liquidity' }, { label: 'Confidence', value: CONFIDENCE[v.confidence], help: 'confidence' }
      ], { cols: 2 }));
      // With the server's analytics the full header replaces the short one: fair value apart from Average Value,
      // volumes in units and Credits, targets as ranges, depth, time to sell only when it can be inferred.
      if (v.analytics && ui.analytics) right.appendChild(ui.analytics.panel(v)); else right.appendChild(vp);

      var chartPanel = h('section.mk-box', { 'aria-label': 'Price history' });
      var chartHead = h('div.mk-panel-head', h('h3', { text: 'Price history' }));
      var windowId = C.settings.get('marketWindow'), type = C.settings.get('marketChartType');
      var winSwitch = ui.segmented({ label: 'Time window', role: 'tablist', value: windowId, options: Object.keys(K().WINDOWS).map(function (k) { return { value: k, label: k === 'all' ? 'All' : k }; }), onChange: function (w) { windowId = w; drawChart(); } });
      chartHead.appendChild(winSwitch);
      chartPanel.appendChild(chartHead);
      var chart = ui.chart.create({ id: 'card', height: 280 });
      var chartLoading = false;
      scope.add(store.subscribe(function (what) { if (what === 'sim' && chartLoading) drawChart(); }));
      charts.push(chart);
      chartPanel.appendChild(chart);
      var note = h('p.mk-hint');
      chartPanel.appendChild(note);
      function drawChart() {
        var s = ctx.api.stocksSync(realm, { scope: 'card', id: card.id, variantId: variantId, window: windowId });
        chartLoading = !!s.loading;
        chart.update({ candles: s.candles, type: type, window: windowId, unit: 'Credits', label: idn.name + ' price', live: live, now: s.now || 0, badge: live ? (realm === 'global' ? 'Player trades' : 'Simulated trades') : 'Illustrative' });
        note.textContent = live ? (s.candles.length ? s.tradesCounted + ' completed trades of this card are kept. A bar appears only where a trade happened.' : 'No trades of this card in this window yet. Nothing is drawn until one happens.') : '';
        note.hidden = !live;
      }
      drawChart();
      right.appendChild(chartPanel);

      var lp = h('section.mk-box', { 'aria-label': 'Open listings' }, h('div.mk-panel-head', h('h3', { text: 'Open listings' })));
      if (!r.listings.length) lp.appendChild(h('p.mk-hint', { text: realm === 'global' && !store.session.showGlobalSample ? 'Global Market is not connected, so there are no real listings.' : 'No one is selling this exact card right now.' }));
      else {
        var rows = h('div.mk-minilist');
        r.listings.slice(0, 6).forEach(function (l) {
          var b = h('button.mk-minirow', { type: 'button' }, h('span.mk-format', { data: { format: l.format } }, icon(ui.formatDef(l.format).icon), h('span', { text: ui.formatDef(l.format).short })),
            h('span.mk-minirow-main', { text: l.card.variantId ? env.variants[l.card.variantId].name : 'Normal finish' }), l.format === 'swap' ? h('span.mk-muted', { text: 'Trade' }) : ui.credits(K().currentPrice(l)), h('span.mk-mono', { text: l.card.serial.replace('CBL-', '') }));
          b.addEventListener('click', function () { ui.go('listing', { id: l.id }); });
          rows.appendChild(b);
        });
        lp.appendChild(rows);
      }
      right.appendChild(lp);

      if (live) {
        var dp = h('section.mk-box', { 'aria-label': 'Order book' }, h('div.mk-panel-head', h('h3', { text: 'Asks and buy orders' })));
        var depth = r.depth || { asks: [], bids: [] };
        dp.appendChild(ui.statGrid([
          { label: 'Lowest asks', value: depth.asks.length ? depth.asks.map(ui.fmt.exact).join(' · ') : 'None listed' },
          { label: 'Highest buy orders', value: depth.bids.length ? depth.bids.map(ui.fmt.exact).join(' · ') : 'None open' }
        ], { cols: 2 }));
        var mineOrders = r.myOrders || [];
        if (mineOrders.length) {
          var ol = h('ul.mk-offers');
          mineOrders.forEach(function (o) {
            ol.appendChild(h('li.mk-offer', h('div.mk-offer-copy', h('strong', { text: 'Your buy order up to ' + ui.fmt.exact(o.maxPrice) + ' Credits' + (o.anyFinish ? ' · any finish' : '') }), h('span.mk-muted', { text: ui.fmt.duration(o.minutesLeft) + ' left' })),
              h('div.mk-offer-actions', ui.button('Cancel order', { variant: 'ghost', size: 'sm', onClick: function () {
                ctx.api.cancelOrder(realm, o.id).then(function (x) { C.ui.toast(x.ok ? 'Buy order cancelled' : x.message, null, x.ok ? 'info' : 'error'); paint(ctx.api.cardMarketSync(realm, cardId, variantId)); ui.shell.refresh(); });
              } }))));
          });
          dp.appendChild(ol);
        }
        right.appendChild(dp);
      }

      var tp = h('section.mk-box', { 'aria-label': 'Recent trades' }, h('div.mk-panel-head', h('h3', { text: 'Recent trades' })));
      if (!r.trades.length) tp.appendChild(h('p.mk-hint', { text: 'No completed trades of this card yet. Listings and Quick Sell never count as trades.' }));
      else {
        var tl = h('ul.mk-events');
        r.trades.forEach(function (t) {
          tl.appendChild(h('li', { title: [t.sellerWhy, t.buyerWhy].filter(Boolean).join(' · ') }, icon('check'),
            h('span', { text: ui.fmt.exact(t.price) + ' Credits · ' + ui.formatDef(t.format).label + (live ? ' · ' + t.seller + ' to ' + t.buyer : '') }), h('span.mk-muted', { text: ui.fmt.age(t.minutesAgo) })));
        });
        tp.appendChild(tl);
        if (!live) tp.appendChild(h('p.mk-hint', { text: 'Sample trades, invented for the preview.' }));
      }
      right.appendChild(tp);
    }

    function buyOrder(r) {
      var v = r.valuation, dur = { '1d': 86400000, '3d': 3 * 86400000, '7d': 7 * 86400000 }, pick = '3d';
      var price = h('input.mk-input.is-large', { type: 'number', min: '1', step: '1', inputmode: 'numeric', value: String(Math.max(1, v.targetBuy || v.average)), 'aria-label': 'Highest price you will pay' });
      var any = h('input', { type: 'checkbox', props: { checked: !variantId } });
      var lengths = ui.segmented({ label: 'How long it stays open', value: pick, onChange: function (x) { pick = x; }, options: [{ value: '1d', label: '1 day' }, { value: '3d', label: '3 days' }, { value: '7d', label: '7 days' }] });
      var body = h('div.mk-order-form',
        h('label.mk-field', h('span.mk-field-label', { text: 'Highest price (Credits)' }), price, h('small.mk-hint', { text: 'It buys the first matching listing at that listing’s asking price, never above this.' })),
        h('label.mk-toggle', any, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'Any finish' }), h('small', { text: variant ? 'Off means only ' + variant.name + '.' : 'Off means only the normal finish.' }))),
        h('div.mk-field', h('span.mk-field-label', { text: 'Stays open' }), lengths));
      var wallet = ctx.api.walletSync(realm), ready = null;
      price.addEventListener('input', function () { var n = Number(price.value); if (ready) { ready.go.disabled = !(n >= 1) || n !== Math.floor(n) || n > wallet.available; ready.go.title = n > wallet.available ? 'You have ' + ui.fmt.exact(wallet.available) + ' Credits available.' : ''; } });
      ui.sim.confirm({
        title: 'Place a buy order', eyebrow: idn.name, body: body, anchor: root.document.activeElement, rows: [],
        note: 'Your highest price is held until the order fills, expires or you cancel it.',
        confirmLabel: 'Place order', icon: 'tag', ready: function (api) { ready = api; },
        run: function (req) { return ctx.api.placeOrder(realm, { c: card.id, v: any.checked ? null : variantId, anyFinish: any.checked, maxPrice: Math.floor(Number(price.value)), durationMs: dur[pick], requestId: req }); },
        success: function (x) { C.ui.toast('Buy order placed'); paint(ctx.api.cardMarketSync(realm, cardId, variantId)); ui.shell.refresh(); }
      });
    }

    paint(res);
    if (live) {
      scope.add(store.subscribe(function (what) {
        if (what !== 'sim') return;
        var fresh = ctx.api.cardMarketSync(realm, cardId, variantId);
        if (fresh && signatureOf(fresh) !== cardSig) paint(fresh);
      }));
    }
    ctx.restoreScroll();
  }

  ui.pages.register('listing', { nav: function () { var c = ui.shell.current(); return c && c.from || 'discover'; }, title: function () { return 'Listing'; }, mount: mountListing });
  ui.pages.register('card', { nav: function () { return 'stocks'; }, title: function () { return 'Card market'; }, mount: mountCard });
})(window.Cardable = window.Cardable || {}, window);
