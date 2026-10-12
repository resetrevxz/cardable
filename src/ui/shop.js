/* Stage 1 Shop showroom. Offers and quotes are explicit UI fixtures; no save writes. */
(function (C, root) {
  'use strict';
  var FIXTURES = [
    { cardId: 'geforce-rtx-4070', price: 2400 },
    { cardId: 'arc-b580', price: 1600 },
    { cardId: 'radeon-rx-7900-xtx', price: 5400 },
    { cardId: 'geforce-gtx-1080-ti', price: 3200 }
  ];
  var FEATURED_PRICE = 7600; // Illustrative UI quote, not an economy rule.
  var active = null;
  var previewState = 'normal';
  var previewLabels = { unaffordable: 'Not enough Credits', purchased: 'Purchased · next offer tomorrow', loading: 'Loading offer…', error: 'Save unavailable · no purchase made', expired: 'Offer expired · refresh', disabled: 'Purchase unavailable' };
  function node(tag, cls, parent, copy) {
    var el = root.document.createElement(tag); el.className = cls || '';
    if (copy != null) el.textContent = copy;
    if (parent) parent.appendChild(el);
    return el;
  }
  function button(parent, label, run, cls, icon) {
    var el = C.ui.create(icon ? 'icon-button' : 'button', { label: label, onClick: run, icon: icon });
    if (cls) el.classList.add(cls); parent.appendChild(el); return el;
  }
  function price(parent, amount) {
    var row = node('div', 'shop-price', parent);
    node('strong', '', row, amount.toLocaleString()); node('span', '', row, 'Credits');
    return row;
  }
  function previewInstance(card) {
    return { cardId: card.id, serial: 'PREVIEW', variantId: null, cardSkinId: 'standard' };
  }
  function nextMidnight() {
    var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }
  function countdown() {
    var ms = Math.max(0, nextMidnight() - Date.now());
    var hours = Math.floor(ms / 3600000), minutes = Math.ceil(ms % 3600000 / 60000);
    if (minutes === 60) { hours++; minutes = 0; }
    return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
  }
  function open() {
    if (active || C.ui.modal || C.inventory && C.inventory.active || C.opening && C.opening.phase !== 'idle' || C.setup && C.setup.loading) return;
    var origin = root.document.activeElement;
    var packWasVisible = C.packView.visible;
    C.packView.setVisible(false);
    var surface = C.ui.create('sheet', { label: 'Cardable Shop', className: 'shop-screen' });
    surface.dataset.toolSurface = 'shop';
    var session = { surface: surface, views: [], holds: [], selected: null, presentation: null, ticker: null, status: null, balance: null, countdown: null, offSave: null, previewState: previewState };
    active = session;
    function clearContent() {
      session.views.forEach(function (view) { view.destroy(); }); session.views = [];
      session.holds.forEach(function (hold) { if (hold.destroy) hold.destroy(); }); session.holds = [];
      surface.replaceChildren();
    }
    function announce(message) { if (session.status) session.status.textContent = message; }
    function hold(parent, name, amount) {
      var control = C.ui.create('button', {
        label: 'Hold to preview', variant: 'hold-confirm', holdMs: 1400,
        onConfirm: function () { announce('Preview complete. No Credits spent and no item added.'); },
        announce: function (message) { announce(message === 'Confirmed.' ? 'Preview complete. No Credits spent and no item added.' : message + ' Preview only.'); }
      });
      control.classList.add('shop-hold');
      control.setAttribute('aria-label', 'Practice holding for ' + name + ', preview price ' + amount.toLocaleString() + ' Credits. No purchase is available.');
      control.title = 'Preview only · purchases arrive in Stage 3';
      parent.appendChild(control); session.holds.push(control);
      return control;
    }
    function chrome(section, label) {
      var header = node('header', 'shop-header', section);
      var brand = node('div', 'shop-brand', header);
      node('span', 'shop-overline', brand, 'CARDABLE / LOCAL SHOWROOM');
      node('h1', '', brand, label);
      var actions = node('div', 'shop-header-actions', header);
      session.balance = node('div', 'shop-balance', actions);
      function refreshBalance() { session.balance.textContent = (C.state.current ? C.state.current.currency : 0).toLocaleString() + ' Credits'; }
      refreshBalance();
      button(actions, 'Shop help', function () { var help = surface.querySelector('.shop-help'); if (help) { help.hidden = !help.hidden; if (!help.hidden) help.focus(); } }, 'shop-help-control', 'help');
      button(actions, 'Close Shop', function () { session.presentation.close(); }, 'shop-close', 'close');
      var help = node('p', 'shop-help', section, 'Four card offers will refresh at local midnight in Stage 2. The Titan Pack remains featured until a game update. Hold controls are a safe preview; purchases are unavailable in this stage.');
      help.hidden = true; help.tabIndex = -1;
      return refreshBalance;
    }
    function footer(section) {
      var foot = node('footer', 'shop-footer', section);
      node('span', '', foot, 'LOCAL / OFFLINE');
      node('span', '', foot, 'Stage 1 preview · no purchases or rotation');
      session.status = node('p', 'shop-status', foot, 'Inspect a card or practice a hold. Your collection stays unchanged.');
      session.status.setAttribute('role', 'status'); session.status.setAttribute('aria-live', 'polite');
    }
    function hero(section) {
      var pack = C.pack('titan');
      var feature = node('section', 'shop-feature', section);
      feature.setAttribute('aria-labelledby', 'shop-feature-title');
      var stage = node('div', 'shop-feature-stage', feature);
      var exhibit = node('div', 'shop-pack-exhibit', stage);
      exhibit.dataset.skin = 'titan'; exhibit.dataset.packQuality = C.settings.get('quality');
      exhibit.style.setProperty('--pack-width', 'min(31vw, 220px)');
      exhibit.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
      C.packMarkup.unit(exhibit, false, pack);
      var plaque = node('div', 'shop-feature-plaque', stage);
      node('span', '', plaque, '01 / PERMANENT FEATURE');
      node('span', '', plaque, 'CBL · TITAN VAULT');
      var copy = node('div', 'shop-feature-copy', feature);
      node('span', 'shop-kicker', copy, 'FEATURED COLLECTION  /  HALO SERIES');
      node('h2', '', copy, 'TITAN: FIRST CONTACT').id = 'shop-feature-title';
      node('p', 'shop-feature-description', copy, 'Seventeen halo designs behind the authentic machined Titan shroud. One pack. One rare encounter.');
      node('p', 'shop-feature-until', copy, 'Featured until next update');
      var purchase = node('div', 'shop-feature-purchase', copy);
      price(purchase, FEATURED_PRICE);
      node('span', 'shop-price-note', purchase, 'Illustrative price');
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Inspect pack', function () { inspectPack(); }, 'shop-inspect');
      hold(actions, 'Titan Pack', FEATURED_PRICE);
      node('p', 'shop-disabled-note', copy, 'Purchase unavailable · hold is a non-spending preview.');
    }
    function offers(section) {
      var area = node('section', 'shop-offers', section); area.setAttribute('aria-labelledby', 'shop-offers-title');
      var heading = node('div', 'shop-offers-heading', area);
      var titles = node('div', '', heading);
      node('span', 'shop-kicker', titles, 'THE DAILY SELECTION');
      node('h2', '', titles, 'Your daily offers').id = 'shop-offers-title';
      var clock = node('div', 'shop-reset', heading);
      node('span', '', clock, 'Next local midnight in');
      session.countdown = node('strong', '', clock, countdown());
      node('p', 'shop-fixture-note', area, 'Preview selection and prices. Daily rotation begins in Stage 2.');
      var grid = node('div', 'shop-offer-grid', area);
      (session.previewState === 'empty' ? [] : session.previewState === 'underfilled' ? FIXTURES.slice(0, 2) : FIXTURES).forEach(function (fixture, index) {
        var card = C.card(fixture.cardId);
        if (!card || card.retired || !C.rarity(card.rarity)) return;
        var tile = node('article', 'shop-offer', grid);
        tile.dataset.rarity = card.rarity;
        var state = index === 0 && previewLabels[session.previewState] ? session.previewState : 'normal';
        tile.dataset.state = state;
        if (state === 'loading') tile.setAttribute('aria-busy', 'true');
        var thumb = node('div', 'shop-offer-art', tile);
        var view = C.cardView.create(card, previewInstance(card), { thumbnail: true, owned: false });
        thumb.appendChild(view.el); session.views.push(view);
        var meta = node('div', 'shop-offer-meta', tile);
        node('span', 'shop-offer-index', meta, String(index + 1).padStart(2, '0') + ' / 04');
        node('span', 'shop-offer-rarity', meta, C.rarity(card.rarity).name);
        node('h3', '', tile, card.name);
        var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
        node('p', 'shop-offer-variant', tile, 'Standard finish · ' + copies + ' owned');
        if (state !== 'normal') node('p', 'shop-offer-state', tile, previewLabels[state]);
        price(tile, fixture.price);
        var actions = node('div', 'shop-offer-actions', tile);
        button(actions, 'Inspect ' + card.name, function (event) { inspectCard(card, fixture, event.currentTarget); }, 'shop-inspect');
        var control = hold(actions, card.name, fixture.price);
        if (state !== 'normal') { control.disabled = true; control.title = previewLabels[state] + ' · UI state preview'; }
      });
      if (!grid.children.length) {
        var empty = C.ui.create('empty-state', { label: 'No eligible cards are available for the Shop preview.' });
        grid.appendChild(empty);
      }
    }
    function renderShop(focus) {
      clearContent(); session.selected = null;
      var scroll = node('div', 'shop-scroll', surface);
      var refreshBalance = chrome(scroll, 'The Shop');
      hero(scroll); offers(scroll); footer(scroll);
      session.refreshBalance = refreshBalance;
      if (focus) (focus.isConnected ? focus : surface.querySelector('.shop-close')).focus({ preventScroll: true });
    }
    function inspectPack() {
      clearContent(); session.selected = 'pack';
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      var refreshBalance = chrome(scroll, 'Titan Pack'); session.refreshBalance = refreshBalance;
      var detail = node('section', 'shop-detail shop-detail--pack', scroll);
      var stage = node('div', 'shop-detail-pack', detail);
      stage.dataset.skin = 'titan'; stage.dataset.packQuality = C.settings.get('quality');
      stage.style.setProperty('--pack-width', 'min(52vw, 260px)');
      stage.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
      C.packMarkup.unit(stage, false, C.pack('titan'));
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, 'PACK / HALO SERIES');
      node('h2', '', copy, 'TITAN: FIRST CONTACT');
      node('p', '', copy, C.pack('titan').introText);
      node('p', 'shop-detail-fact', copy, 'Authentic Titan Pack · 17 curated GPU designs · serial assigned on opening');
      price(copy, FEATURED_PRICE); node('small', 'shop-price-note', copy, 'Illustrative Stage 1 quote');
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Back to shop', function () { renderShop(true); }, 'shop-back');
      hold(actions, 'Titan Pack', FEATURED_PRICE);
      footer(scroll); actions.querySelector('button').focus({ preventScroll: true });
    }
    function inspectCard(card, fixture, trigger) {
      clearContent(); session.selected = card.id;
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      var refreshBalance = chrome(scroll, 'Card inspection'); session.refreshBalance = refreshBalance;
      var detail = node('section', 'shop-detail', scroll);
      var stage = node('div', 'shop-detail-card', detail);
      var view = C.cardView.create(card, previewInstance(card), { owned: false, independent: true, autoFocus: false });
      stage.appendChild(view.el); session.views.push(view); view.applyMode('full');
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, C.rarity(card.rarity).name.toUpperCase() + ' / ' + card.generation.toUpperCase());
      node('h2', '', copy, card.name);
      node('p', '', copy, 'Standard finish · source card from the Cardable catalog.');
      var specs = node('dl', 'shop-specs', copy);
      C.cardSpecs.frontRows(card).forEach(function (row) {
        var line = node('div', '', specs); node('dt', '', line, row.label); node('dd', '', line, row.value);
      });
      node('p', 'shop-detail-fact', copy, 'Preview only · serial assigned on purchase. No copy is reserved or minted.');
      var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
      node('p', 'shop-detail-owned', copy, copies + ' currently owned');
      price(copy, fixture.price); node('small', 'shop-price-note', copy, 'Illustrative Stage 1 quote');
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Back to shop', function () { renderShop(); var tile = surface.querySelectorAll('.shop-offer')[FIXTURES.indexOf(fixture)]; var target = tile && tile.querySelector('.shop-inspect'); if (target) target.focus({ preventScroll: true }); }, 'shop-back');
      hold(actions, card.name, fixture.price);
      footer(scroll); actions.querySelector('button').focus({ preventScroll: true });
    }
    session.renderShop = renderShop;
    renderShop();
    session.presentation = C.ui.present(surface, { anchor: origin, onClose: function () {
      if (active !== session) return;
      root.clearInterval(session.ticker); if (session.offSave) session.offSave();
      if (session.offFrame) session.offFrame();
      root.document.removeEventListener('visibilitychange', sync);
      clearContent(); active = null;
      C.packView.setVisible(packWasVisible);
    }});
    function sync() {
      if (!active || active !== session || root.document.hidden) return;
      if (session.countdown) session.countdown.textContent = countdown();
      if (session.refreshBalance) session.refreshBalance();
    }
    root.document.addEventListener('visibilitychange', sync);
    session.offSave = C.events.on('save:written', sync);
    session.ticker = root.setInterval(sync, 30000);
    session.offFrame = C.fx.subscribe(function (now, dt) {
      if (active !== session) return false;
      var moving = false;
      session.holds.forEach(function (control) { moving = control.update(now, dt) || moving; });
      return moving;
    }, 'shop-hold-preview');
  }
  C.shop = {
    fixtures: FIXTURES.map(function (item) { return Object.assign({}, item); }),
    get open() { return !!active; },
    open: open,
    close: function () { if (active) active.presentation.close(); },
    previewState: function (state) {
      if (!new URLSearchParams(root.location.search).has('dev') || !['normal','unaffordable','purchased','loading','error','expired','disabled','empty','underfilled'].includes(state)) return false;
      previewState = state;
      if (active && !active.selected) { active.previewState = state; active.renderShop(); }
      return true;
    },
    init: function () {
      var entry = root.document.getElementById('shop-entry');
      if (!entry || entry.dataset.shopReady) return;
      entry.dataset.shopReady = 'true';
      entry.prepend(C.icons.create('card'));
      entry.addEventListener('click', open);
      C.events.on('opening:context', function (event) { entry.disabled = event.phase !== 'idle'; });
    }
  };
})(window.Cardable, window);
