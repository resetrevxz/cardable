/* Cardable Market — Shop (1.13.0).
 * The daily Shop as a tab of the Market: today's four cards and the featured pack, sold at a fixed price by the game
 * itself. It reads the same daily offers as the classic Shop (C.shopState.ensure) and buys through the same code
 * (C.shopPurchase), so a purchase here and one in the classic Shop are the same thing. Every purchase opens the usual
 * review first; nothing is bought by a single click. The classic Shop is one button away for the full showroom. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;

  function fx(n) { return ui.fmt.exact(n); }
  function balance() { return C.state.current ? C.state.current.currency : 0; }
  function nextMidnight() { var d = new Date(C.clock.now()); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); }
  function resetIn() {
    var ms = Math.max(0, nextMidnight() - C.clock.now()), hrs = Math.floor(ms / 3600000), min = Math.floor(ms % 3600000 / 60000);
    return hrs + 'h ' + String(min).padStart(2, '0') + 'm';
  }
  // Why a purchase cannot happen right now, in words, or null when it can.
  function blocked(kind, offer, amount) {
    if (C.state.recovery && C.state.recovery.pending) return 'Finish save recovery first.';
    if (!C.state.persistenceAvailable || !C.state.lastWriteSucceeded) return 'Saving is unavailable, so nothing can be bought.';
    if (!C.state.current.shop) return 'Today’s offers are not ready yet.';
    if (C.state.current.pendingReveal || (C.opening && C.opening.phase !== 'idle')) return 'Finish the current pack first.';
    if (kind === 'pack' && C.shopPurchase.entitlement(C.state.current)) return 'Your Titan Pack is ready to open.';
    if (kind === 'card' && offer.purchased) return 'Bought. A new offer comes tomorrow.';
    if (balance() < amount) return 'You need ' + fx(amount - balance()) + ' more Credits.';
    return null;
  }
  function owned(cardId) { return C.state.current.inventory.filter(function (i) { return i.cardId === cardId; }).length; }
  function marketValue(offer) {
    try { var v = C.valuation.read({ cardId: offer.cardId, variantId: offer.variantId, cardSkinId: null, serial: null }); return v ? v.average : null; } catch (_) { return null; }
  }

  function mount(ctx) {
    var host = ctx.host, scope = ctx.scope, data = C.market.api.data();
    var daily = C.shopState.ensure();
    host.classList.add('mk-shop-page');

    // ---- head ----
    var timer = h('span.mk-num', { text: resetIn() });
    var head = h('div.mk-pagehead.mk-shop-head',
      h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', icon('bag')), h('span', { text: 'Shop' })),
        h('p.mk-shop-sub', icon('clock'), h('span', { text: 'New offers in ' }), timer)),
      h('div.mk-pagehead-actions', ui.button('Classic Shop', { variant: 'ghost', icon: 'forward', onClick: function () { openClassic(); } })));
    host.appendChild(head);
    var tick = root.setInterval(function () { if (!timer.isConnected) return; var t = resetIn(); if (timer.textContent !== t) timer.textContent = t; }, 15000);
    scope.add(function () { root.clearInterval(tick); });

    if (daily.error) {
      host.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', title: 'The Shop is not ready', body: daily.error, actions: [{ label: 'Try again', variant: 'primary', icon: 'refresh', run: function () { ui.shell.remount(); } }] }));
      ctx.restoreScroll();
      return;
    }
    var snap = daily.snapshot;

    // ---- how it differs from the Market, in three short points with icons ----
    host.appendChild(h('ul.mk-shop-facts', { 'aria-label': 'About the Shop' },
      h('li', icon('lock'), h('span', { text: 'Fixed price, no bidding' })),
      h('li', icon('sparkle'), h('span', { text: 'Brand-new copy, your serial' })),
      h('li', icon('refresh'), h('span', { text: 'Four new cards every day' }))));

    // ---- featured pack ----
    var pack = C.pack(C.data.shop.featuredPackId), price = C.data.shop.featuredPrice;
    if (pack && pack.enabled) {
      var ent = C.shopPurchase.entitlement(C.state.current);
      // the classic Shop's own exhibit class gives the pack its size and silhouette
      var stage = h('div.mk-shop-pack-stage.shop-detail-pack', { 'aria-hidden': 'true' });
      stage.dataset.skin = pack.skin || 'titan'; stage.dataset.packQuality = C.settings.get('quality');
      try { C.packMarkup.unit(stage, false, pack); } catch (_) { stage.appendChild(h('span.mk-shop-pack-fallback', icon('box'))); }
      var why = blocked('pack', null, price);
      var buy = ent ? ui.button('Open it now', { variant: 'primary', icon: 'sparkle', onClick: function () { openEntitlement(); } })
        : ui.button('Buy · ' + fx(price), { variant: 'primary', icon: 'bag', disabled: !!why, reason: why || '', onClick: function () { reviewPack(buy, pack, price); } });
      var copy = h('div.mk-shop-pack-copy',
        h('span.mk-eyebrow', { text: 'Featured pack' }),
        h('h2', { text: pack.name }),
        pack.tagline ? h('p.mk-shop-pack-tag', { text: pack.tagline }) : null,
        h('div.mk-shop-price', ui.credits(price, { big: true })),
        h('div.mk-shop-pack-actions', buy),
        ent ? h('p.mk-shop-state', { data: { tone: 'good' } }, icon('check'), h('span', { text: 'Bought. It waits on the main menu until you open it.' }))
          : why ? h('p.mk-shop-state', icon('info'), h('span', { text: why })) : null);
      host.appendChild(h('section.mk-shop-feature', { 'aria-label': 'Featured pack', data: { owned: ent ? 'true' : '' } }, h('div.mk-shop-feature-glow', { 'aria-hidden': 'true' }), stage, copy));
    }

    // ---- today's cards ----
    host.appendChild(h('div.mk-section-head', h('h2', icon('tag'), h('span', { text: 'Today’s cards' })), h('span.mk-muted', { text: snap.offers.filter(function (o) { return !o.purchased; }).length + ' left' })));
    var grid = h('div.mk-shop-grid', { role: 'list' });
    snap.offers.forEach(function (offer, i) {
      var card = data.cardById[offer.cardId];
      if (!card) return;
      var idn = ui.identity(card, true), variant = offer.variantId ? C.variant(offer.variantId) : null, n = owned(offer.cardId), value = marketValue(offer);
      var tile = h('article.mk-shop-card', { role: 'listitem', data: { state: offer.purchased ? 'purchased' : 'open', rarity: card.rarity }, style: { '--mk-i': i, '--mk-rgb': ui.rarityRgb(card.rarity), '--mk-tier': ui.rarityTier(card.rarity) } });
      var art = h('div.mk-shop-card-art');
      art.appendChild(ctx.thumbs.mount(card, { instanceId: 'shop-' + offer.offerId, cardId: card.id, serial: 'SHOP', variantId: offer.variantId, cardSkinId: null, seen: true }, { owned: true }));
      if (offer.purchased) art.appendChild(h('span.mk-shop-sold', icon('check'), h('span', { text: 'Bought' })));
      tile.appendChild(art);
      var body = h('div.mk-shop-card-body',
        h('strong.mk-shop-card-name', { text: idn.name }),
        h('div.mk-shop-card-meta', h('span.mk-tile-rarity', { data: { rarity: card.rarity }, text: idn.rarityName }), variant ? h('span.mk-tile-variant', { text: variant.name }) : null, n ? h('span.mk-shop-owned', icon('cards'), h('span', { text: n + ' owned' })) : null),
        h('div.mk-shop-card-price', ui.credits(offer.price, { big: true }), value ? h('span.mk-muted', { title: 'What this card usually sells for between traders in Standard' }, icon('market'), h('span', { text: '~' + fx(value) + ' on the Market' })) : null));
      var why2 = blocked('card', offer, offer.price);
      var b = ui.button(offer.purchased ? 'Bought' : 'Buy', { variant: offer.purchased ? 'ghost' : 'secondary', icon: offer.purchased ? 'check' : 'bag', disabled: !!why2, reason: why2 || '', onClick: function () { reviewCard(b, offer, card, idn, variant); } });
      body.appendChild(b);
      if (why2 && !offer.purchased) body.appendChild(h('p.mk-shop-state', { text: why2 }));
      tile.appendChild(body);
      grid.appendChild(tile);
    });
    host.appendChild(grid);
    host.appendChild(h('p.mk-hint.mk-shop-foot', icon('info'), h('span', { text: 'The Shop sells at a fixed price above what traders usually ask. Bargains are on the Market; the Shop is for the card you want today, for sure.' })));

    function openClassic() {
      ui.shell.close();
      root.setTimeout(function () { if (C.shop && C.shop.open) C.shop.open(); }, 60);
    }
    function openEntitlement() {
      ui.shell.close();
      root.setTimeout(function () { var a = doc.querySelector('.pack-open-action'); if (a && !a.disabled) a.focus({ preventScroll: true }); if (C.qol && C.qol.toast) C.qol.toast('Titan Pack is ready. Hold to open it.'); }, 80);
    }
    ctx.restoreScroll();
  }

  function reviewCard(anchor, offer, card, idn, variant) {
    var after = balance() - offer.price;
    ui.sim.confirm({ title: 'Buy from the Shop', eyebrow: 'Shop', anchor: anchor, icon: 'bag', confirmLabel: 'Buy for ' + fx(offer.price),
      card: h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName + (variant ? ' · ' + variant.name : '') })),
      rows: [{ label: 'Price', node: ui.credits(offer.price), strong: true }, { label: 'Your Credits after', value: fx(after) }, { label: 'Arrives', value: 'In your inventory, right away' }],
      note: 'A fixed price from the game. It is a brand-new copy with your own serial.',
      run: function () {
        var day = C.shopState.ensure();
        if (!day.snapshot) return { ok: false, message: day.error || 'Today’s offers are not ready.' };
        var res = C.shopPurchase.buyCard(Object.assign({ dayKey: day.snapshot.dayKey }, offer));
        return res && res.ok ? res : { ok: false, message: (res && res.message) || 'That did not work. Nothing was bought.' };
      },
      success: function (res) {
        if (ui.flourish && ui.flourish.arrived) ui.flourish.arrived({ instance: res.instance, from: anchor, verb: 'Bought' });
        else C.ui.toast('Bought ' + idn.name + '. It is in your inventory.');
        ui.shell.remount();
      } });
  }
  function reviewPack(anchor, pack, price) {
    ui.sim.confirm({ title: 'Buy the ' + pack.name, eyebrow: 'Shop', anchor: anchor, icon: 'bag', confirmLabel: 'Buy for ' + fx(price),
      card: h('div.mk-review-card', h('strong', { text: pack.name }), h('span', { text: pack.tagline || 'Featured pack' })),
      rows: [{ label: 'Price', node: ui.credits(price), strong: true }, { label: 'Your Credits after', value: fx(balance() - price) }, { label: 'Opens', value: 'From the main menu, when you choose' }],
      note: 'Your pack timer is not used. The pack waits for you until you open it.',
      run: function () { var res = C.shopPurchase.buyTitan(); return res && res.ok ? res : { ok: false, message: (res && res.message) || 'That did not work. Nothing was bought.' }; },
      success: function () { C.ui.toast(pack.name + ' bought. Open it from the main menu.'); if (ui.flourish && ui.flourish.cheer) ui.flourish.cheer(anchor); ui.shell.remount(); } });
  }

  ui.pages.register('shop', { nav: 'shop', title: function () { return 'Shop'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
