/* Daily Shop showroom and purchase presentation. Transactions live in shop-purchase.js. */
(function (C, root) {
  'use strict';
  var FEATURED_PRICE = C.data.shop.featuredPrice;
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
  function previewInstance(card, offer) {
    return { cardId: card.id, serial: 'PREVIEW', variantId: offer.variantId, cardSkinId: offer.cardSkinId };
  }
  function nextMidnight() {
    var d = new Date(C.clock.now()); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }
  function countdown() {
    var ms = Math.max(0, nextMidnight() - C.clock.now());
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
    var session = { surface: surface, views: [], holds: [], controls: [], cleanups: [], animations: [], locked: false, entered: false, selected: null, presentation: null, ticker: null, status: null, balance: null, countdown: null, offSave: null, previewState: previewState,
      result: C.shopState.ensure(), offReplace: null };
    active = session;
    function motionPolicy() {
      var level = C.settings.policy.animation;
      surface.dataset.shopMotion = C.motion.reduced || level === 0 ? 'static' : level === 1 ? 'calm' : 'full';
      surface.dataset.shopHover = C.settings.get('hoverAnimations') ? 'true' : 'false';
      if (surface.dataset.shopMotion !== 'full') {
        session.animations.forEach(function (animation) { animation.cancel(); });
      }
      if (surface.dataset.shopMotion !== 'full' || surface.dataset.shopHover === 'false') {
        surface.querySelectorAll('[data-shop-reactive]').forEach(function (el) {
          el.style.removeProperty('--object-x'); el.style.removeProperty('--object-y');
        });
      }
    }
    motionPolicy();
    function animate(el, frames, options) {
      session.animations = session.animations.filter(function (animation) { return animation.playState === 'running' || animation.playState === 'paused'; });
      session.animations.push(el.animate(frames, options));
    }
    function arrive(el, index) {
      if (!root.IntersectionObserver) return;
      var observer = new root.IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        if (surface.dataset.shopMotion !== 'full' || !el.isConnected) return;
        animate(el, [
          { opacity: 0, transform: 'translateY(22px) rotateX(3deg)' },
          { opacity: 1, transform: 'translateY(0) rotateX(0)' }
        ], { duration: 560 / C.settings.get('uiAnimationSpeed'), delay: (index || 0) * 55 / C.settings.get('uiAnimationSpeed'), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      }, { threshold: .08 });
      observer.observe(el); session.cleanups.push(function () { observer.disconnect(); });
    }
    function reactive(el) {
      el.dataset.shopReactive = 'true';
      el.addEventListener('pointermove', function (event) {
        if (surface.dataset.shopMotion !== 'full' || surface.dataset.shopHover === 'false' || event.pointerType !== 'mouse') return;
        if (el.tagName !== 'BUTTON' && event.target.closest('input,button')) {
          el.style.removeProperty('--object-x'); el.style.removeProperty('--object-y'); return;
        }
        var rect = C.fx.rect(el), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
        el.style.setProperty('--light-x', x * 100 + '%'); el.style.setProperty('--light-y', y * 100 + '%');
        el.style.setProperty('--object-x', (x - .5) * 8 + 'deg'); el.style.setProperty('--object-y', (.5 - y) * 5 + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--object-x'); el.style.removeProperty('--object-y');
      });
    }
    function turntable(parent, exhibit) {
      var controls = node('div', 'shop-turntable', parent);
      node('span', 'shop-turntable-label', controls, 'Rotate exhibit');
      var range = node('input', 'shop-turntable-range', controls);
      range.type = 'range'; range.min = -24; range.max = 24; range.step = 1; range.value = 0;
      range.setAttribute('aria-label', 'Rotate Titan exhibit');
      function pose() {
        parent.style.removeProperty('--object-x'); parent.style.removeProperty('--object-y');
        exhibit.style.setProperty('--pack-yaw', range.value + 'deg');
        range.setAttribute('aria-valuetext', range.value + ' degrees');
      }
      range.addEventListener('input', pose); pose();
      button(controls, 'Reset exhibit', function () { range.value = 0; pose(); }, 'shop-turntable-reset', 'reset');
    }
    function clearContent() {
      session.cleanups.forEach(function (cleanup) { cleanup(); }); session.cleanups = [];
      session.animations.forEach(function (animation) { animation.cancel(); }); session.animations = [];
      session.views.forEach(function (view) { view.destroy(); }); session.views = [];
      session.holds.forEach(function (hold) { if (hold.destroy) hold.destroy(); }); session.holds = [];
      session.controls = []; session.actionNote = null; session.expired = null;
      surface.replaceChildren();
    }
    function announce(message) { if (session.status) session.status.textContent = message; }
    function format(amount) { return amount.toLocaleString() + ' Credits'; }
    function entitlement() { return C.shopPurchase.entitlement(C.state.current); }
    function availability(kind, offer, amount) {
      if (C.state.recovery && C.state.recovery.pending) return { state: 'error', message: 'Finish save recovery first.' };
      if (!C.state.persistenceAvailable || !C.state.lastWriteSucceeded) return { state: 'error', message: 'Save storage unavailable · no purchase possible.' };
      if (!C.state.current.shop) return { state: 'error', message: 'Daily Shop state is unavailable. Reopen the Shop.' };
      if (C.state.current.pendingReveal || C.opening.phase !== 'idle') return { state: 'disabled', message: 'Finish the current pack reveal first.' };
      if (kind === 'pack' && entitlement()) return { state: 'purchased', message: 'Purchased Titan Pack ready to open.' };
      if (kind === 'card') {
        var key = C.shopState.dayKey(), day = C.state.current.shop && C.state.current.shop.days.find(function (row) { return row.dayKey === key; });
        var current = day && day.offers.find(function (row) { return row.offerId === offer.offerId; });
        if (!current || session.result.snapshot && session.result.snapshot.dayKey !== key) return { state: 'expired', message: 'Offer expired · return to today’s offers.' };
        if (current.purchased) return { state: 'purchased', message: 'Purchased · next offer tomorrow.' };
      }
      if (C.state.current.currency < amount) return { state: 'unaffordable', message: 'Not enough Credits · ' + format(amount - C.state.current.currency) + ' needed.' };
      return { state: 'normal', message: 'Balance after purchase: ' + format(C.state.current.currency - amount) };
    }
    function refreshControls() {
      session.controls.forEach(function (item) {
        if (!item.control.isConnected) return;
        var state = availability(item.kind, item.offer, item.amount);
        item.control.disabled = session.locked || state.state !== 'normal';
        item.control.title = state.message;
        if (item.note) item.note.textContent = state.message;
        if (item.tile) {
          item.tile.dataset.state = state.state;
          if (item.stateNote) { item.stateNote.hidden = state.state === 'normal'; item.stateNote.textContent = state.message; }
          if (item.copies && item.offer) item.copies.textContent = (item.offer.variantId ? C.variant(item.offer.variantId).name : 'Standard finish') + ' · ' + C.state.current.inventory.filter(function (copy) { return copy.cardId === item.offer.cardId; }).length + ' owned';
        }
      });
    }
    function openPurchasedPack() {
      session.presentation.close();
      root.queueMicrotask(function () {
        var action = root.document.querySelector('.pack-open-action');
        if (action && !action.disabled) action.focus({ preventScroll: true });
        C.qol.toast('Titan Pack is ready. Hold to charge, then open the vault.');
      });
    }
    function showReceipt(result) {
      clearContent(); session.selected = 'receipt';
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      session.refreshBalance = chrome(scroll, 'Acquired');
      var detail = node('section', 'shop-detail shop-receipt', scroll);
      var stage = node('div', result.kind === 'pack' ? 'shop-detail-pack shop-receipt-object' : 'shop-detail-card shop-receipt-object', detail);
      if (result.kind === 'pack') {
        stage.dataset.skin = 'titan'; stage.dataset.packQuality = C.settings.get('quality');
        stage.style.setProperty('--pack-width', 'min(52vw, 260px)'); stage.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
        C.packMarkup.unit(stage, false, C.pack('titan'));
      } else {
        var card = C.card(result.instance.cardId);
        var view = C.cardView.create(card, result.instance, { owned: true, independent: true, autoFocus: false });
        stage.appendChild(view.el); session.views.push(view); view.applyMode('full');
      }
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, 'PURCHASE SAVED / LOCAL COLLECTION');
      node('h2', '', copy, result.kind === 'pack' ? 'Titan Pack acquired' : C.card(result.instance.cardId).name + ' acquired');
      node('p', 'shop-detail-fact', copy, result.kind === 'pack' ? 'Your sealed Titan Pack is ready. Opening it will not use timer stock.' : 'This exact card and finish are now in your collection.');
      node('p', 'shop-receipt-balance', copy, 'New balance: ' + format(result.balance));
      node('p', 'shop-receipt-id', copy, 'Receipt ' + result.receiptId);
      var actions = node('div', 'shop-actions', copy);
      var primary = button(actions, result.kind === 'pack' ? 'Open Titan Pack' : 'View in inventory', function () {
        if (result.kind === 'pack') openPurchasedPack();
        else { session.presentation.close(); root.queueMicrotask(function () { C.events.notify('inventory:showCard', { cardId: result.instance.cardId, instanceId: result.instance.instanceId }); }); }
      }, 'shop-inspect');
      button(actions, 'Back to shop', function () { session.locked = false; session.result = C.shopState.ensure(); renderShop(true); }, 'shop-back');
      footer(scroll); announce('Purchase saved. ' + format(result.balance) + ' remain.');
      primary.focus({ preventScroll: true });
    }
    function hold(parent, name, amount, kind, offer, tile, copies) {
      var label = 'Hold to purchase';
      var note = node('p', 'shop-purchase-note', parent);
      var control = C.ui.create('button', {
        label: label, holdLabel: label, variant: 'hold-confirm', holdMs: 1400,
        onConfirm: function () {
          if (active !== session || session.locked || !control.isConnected || control.disabled ||
              kind === 'card' && session.selected && (!session.selected.offerId || session.selected.offerId !== offer.offerId) ||
              kind === 'pack' && session.selected && session.selected !== 'pack') return false;
          session.locked = true; control.disabled = true; note.textContent = 'Saving purchase…'; announce('Saving purchase…');
          var result = kind === 'pack' ? C.shopPurchase.buyTitan() : C.shopPurchase.buyCard(Object.assign({ dayKey: session.result.snapshot.dayKey }, offer));
          if (result.ok) showReceipt(result);
          else { session.locked = false; note.textContent = result.message; announce(result.message); refreshControls(); note.textContent = result.message; }
          return false;
        },
        announce: function (message) { if (/percent/.test(message)) { note.textContent = message + ' Hold to purchase ' + name + '.'; announce(note.textContent); } }
      });
      control.classList.add('shop-hold');
      control.setAttribute('aria-label', 'Hold to purchase ' + name + ' for ' + format(amount));
      control.setAttribute('aria-description', 'Hold for 1.4 seconds. Releasing early cancels without spending Credits.');
      parent.insertBefore(control, note); session.holds.push(control);
      var stateNote = tile && node('p', 'shop-offer-state', tile); if (stateNote) stateNote.hidden = true;
      session.controls.push({ control: control, note: note, kind: kind, amount: amount, offer: offer, tile: tile, copies: copies, stateNote: stateNote });
      refreshControls();
      return control;
    }
    function chrome(section, label) {
      var header = node('header', 'shop-header', section);
      var brand = node('div', 'shop-brand', header);
      node('span', 'shop-overline', brand, 'CARDABLE / THE COLLECTION ROOM');
      node('h1', '', brand, label);
      var actions = node('div', 'shop-header-actions', header);
      session.balance = node('div', 'shop-balance', actions);
      function refreshBalance() { session.balance.textContent = (C.state.current ? C.state.current.currency : 0).toLocaleString() + ' Credits'; }
      refreshBalance();
      button(actions, 'Shop help', function () { var help = surface.querySelector('.shop-help'); if (help) { help.hidden = !help.hidden; if (!help.hidden) help.focus(); } }, 'shop-help-control', 'help');
      button(actions, 'Close Shop', function () { session.presentation.close(); }, 'shop-close', 'close');
      var help = node('p', 'shop-help', section, 'Four catalog card offers refresh at local midnight. The Titan Pack remains featured until a game update. Hold the exact item’s purchase button for 1.4 seconds; releasing early spends nothing. Purchases save locally.');
      help.hidden = true; help.tabIndex = -1;
      return refreshBalance;
    }
    function footer(section) {
      var foot = node('footer', 'shop-footer', section);
      node('span', '', foot, 'LOCAL / OFFLINE');
      node('span', '', foot, 'Daily offers · local ownership');
      session.status = node('p', 'shop-status', foot, 'Inspect an item, then hold to purchase it with Credits.');
      session.status.setAttribute('role', 'status'); session.status.setAttribute('aria-live', 'polite');
    }
    function hero(section) {
      var pack = C.pack('titan');
      var feature = node('section', 'shop-feature', section);
      if (!session.entered) { feature.classList.add('shop-feature--enter'); session.entered = true; }
      feature.setAttribute('aria-labelledby', 'shop-feature-title');
      var stage = node('div', 'shop-feature-stage', feature);
      node('span', 'shop-stage-coordinate', stage, 'EXHIBIT / 001');
      var exhibit = node('div', 'shop-pack-exhibit', stage);
      reactive(stage);
      exhibit.dataset.skin = 'titan'; exhibit.dataset.packQuality = C.settings.get('quality');
      exhibit.style.setProperty('--pack-width', 'min(18vw, 200px)');
      exhibit.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
      C.packMarkup.unit(exhibit, false, pack);
      turntable(stage, exhibit);
      var plaque = node('div', 'shop-feature-plaque', stage);
      node('span', '', plaque, 'BRUSHED TITANIUM');
      node('span', '', plaque, 'CBL / SERIES 01');
      var copy = node('div', 'shop-feature-copy', feature);
      node('span', 'shop-kicker', copy, 'THE PERMANENT COLLECTION / HALO HARDWARE');
      var title = node('h2', '', copy); title.id = 'shop-feature-title'; title.setAttribute('aria-label', 'TITAN: FIRST CONTACT');
      node('span', 'shop-feature-name', title, 'TITAN'); node('span', 'shop-feature-subtitle', title, 'FIRST CONTACT');
      node('p', 'shop-feature-description', copy, 'Halo hardware. Sealed in metal. Seventeen catalog designs, one card behind the shroud.');
      var purchase = node('div', 'shop-feature-purchase', copy);
      price(purchase, FEATURED_PRICE);
      node('span', 'shop-price-note', purchase, 'Local Shop quote');
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Inspect pack', function () { inspectPack(); }, 'shop-inspect');
      if (entitlement()) button(actions, 'Open Titan Pack', openPurchasedPack, 'shop-open-owned');
      else hold(actions, 'Titan Pack', FEATURED_PRICE, 'pack');
      node('p', 'shop-disabled-note', copy, entitlement() ? 'Purchased pack ready · timer stock stays separate.' : 'One sealed pack at a time. Featured until a future update.');
      button(copy, 'Daily selection', function () {
        var heading = surface.querySelector('#shop-offers-title');
        if (heading) { heading.scrollIntoView({ behavior: surface.dataset.shopMotion === 'full' ? 'smooth' : 'instant', block: 'start' }); heading.focus({ preventScroll: true }); }
      }, 'shop-jump');
    }
    function offers(section) {
      var area = node('section', 'shop-offers', section); area.setAttribute('aria-labelledby', 'shop-offers-title');
      area.dataset.newRotation = session.result.isNew ? 'true' : 'false';
      var heading = node('div', 'shop-offers-heading', area);
      var titles = node('div', '', heading);
      node('span', 'shop-kicker', titles, 'THE DAILY SELECTION');
      var offersTitle = node('h2', '', titles, 'Your daily offers'); offersTitle.id = 'shop-offers-title'; offersTitle.tabIndex = -1;
      var clock = node('div', 'shop-reset', heading);
      node('span', '', clock, 'Resets in');
      session.countdown = node('strong', '', clock, countdown());
      node('p', 'shop-fixture-note', area, session.result.error || (session.result.isNew ? 'New offers · selected for today' : 'Today’s offers · saved locally'));
      var grid = node('div', 'shop-offer-grid', area);
      var daily = session.result.snapshot ? session.result.snapshot.offers : [];
      (session.previewState === 'empty' ? [] : session.previewState === 'underfilled' ? daily.slice(0, 2) : daily).forEach(function (offer, index) {
        var card = C.card(offer.cardId);
        if (!C.shopState.eligible(card, card && C.rarity(card.rarity))) {
          var unavailable = node('article', 'shop-offer', grid);
          unavailable.dataset.state = 'disabled';
          node('span', 'shop-offer-index', unavailable, String(index + 1).padStart(2, '0') + ' / 04');
          node('h3', '', unavailable, 'Card unavailable');
          node('p', 'shop-offer-state', unavailable, 'This saved offer is no longer in the catalog. It will refresh at local midnight.');
          return;
        }
        var tile = node('article', 'shop-offer', grid);
        arrive(tile, index);
        tile.dataset.rarity = card.rarity;
        var state = index === 0 && previewLabels[session.previewState] ? session.previewState : offer.purchased ? 'purchased' : 'normal';
        tile.dataset.state = state;
        if (state === 'loading') tile.setAttribute('aria-busy', 'true');
        var thumb = node('button', 'shop-offer-art', tile); thumb.type = 'button';
        thumb.setAttribute('aria-label', 'Inspect ' + card.name + ', ' + C.rarity(card.rarity).name);
        thumb.addEventListener('click', function () { inspectCard(card, offer); });
        reactive(thumb);
        var view = C.cardView.create(card, previewInstance(card, offer), { thumbnail: true, owned: false, keyboardFlip: false, autoFocus: false });
        view.el.inert = true;
        thumb.appendChild(view.el); session.views.push(view);
        var meta = node('div', 'shop-offer-meta', tile);
        node('span', 'shop-offer-index', meta, String(index + 1).padStart(2, '0') + ' / 04');
        node('span', 'shop-offer-rarity', meta, C.rarity(card.rarity).name);
        node('h3', '', tile, card.name);
        var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
        var copiesLabel = node('p', 'shop-offer-variant', tile, (offer.variantId ? C.variant(offer.variantId).name : 'Standard finish') + ' · ' + copies + ' owned');
        price(tile, offer.price);
        var actions = node('div', 'shop-offer-actions', tile);
        var inspect = button(actions, 'Inspect', function () { inspectCard(card, offer); }, 'shop-inspect');
        inspect.setAttribute('aria-label', 'Inspect ' + card.name);
        var control = hold(actions, card.name, offer.price, 'card', offer, tile, copiesLabel);
        if (state !== 'normal' && session.previewState !== 'normal') { control.disabled = true; control.title = previewLabels[state] + ' · UI state preview'; }
      });
      if (!grid.children.length) {
        var empty = C.ui.create('empty-state', { label: session.result.error || 'The catalog has fewer than four eligible cards. Daily offers are unavailable.' });
        grid.appendChild(empty);
      }
    }
    function renderShop(focus) {
      clearContent(); session.selected = null;
      var scroll = node('div', 'shop-scroll', surface);
      var refreshBalance = chrome(scroll, 'The Shop');
      hero(scroll); offers(scroll); footer(scroll);
      session.result.isNew = false;
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
      price(copy, FEATURED_PRICE); node('small', 'shop-price-note', copy, 'Local Shop quote');
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Back to shop', function () { renderShop(true); }, 'shop-back');
      if (entitlement()) button(actions, 'Open Titan Pack', openPurchasedPack, 'shop-open-owned');
      else hold(actions, 'Titan Pack', FEATURED_PRICE, 'pack');
      var vault = node('details', 'shop-vault', scroll); vault.open = true;
      node('summary', '', vault, 'Inside the vault · 17 designs');
      var browse = node('div', 'shop-vault-browse', vault);
      var preview = node('div', 'shop-vault-card', browse);
      var catalog = node('div', 'shop-vault-copy', browse);
      node('span', 'shop-kicker', catalog, 'THE TITAN POOL');
      var name = node('h3', '', catalog), rarity = node('p', 'shop-vault-rarity', catalog);
      var chooser = node('select', 'shop-vault-select', catalog); chooser.setAttribute('aria-label', 'Preview a Titan design');
      var pool = C.pack('titan').pool.cardIds.map(C.card).filter(Boolean), current = 0, previewView = null;
      pool.forEach(function (card, index) { var option = node('option', '', chooser, card.name); option.value = index; });
      var nav = node('div', 'shop-vault-nav', catalog);
      button(nav, 'Previous Titan design', function () { showDesign((current + pool.length - 1) % pool.length); }, 'shop-vault-prev', 'chevron');
      var count = node('span', 'shop-vault-count', nav);
      button(nav, 'Next Titan design', function () { showDesign((current + 1) % pool.length); }, 'shop-vault-next', 'chevron');
      node('p', 'shop-vault-note', catalog, 'Preview the Titan catalog. Your card and finish are rolled when you open the pack.');
      function showDesign(index) {
        current = index; chooser.value = index;
        if (previewView) { previewView.destroy(); session.views = session.views.filter(function (view) { return view !== previewView; }); }
        var card = pool[index]; if (!card) return;
        previewView = C.cardView.create(card, previewInstance(card, { variantId: null, cardSkinId: null }), { thumbnail: true, owned: false, keyboardFlip: false });
        preview.appendChild(previewView.el); session.views.push(previewView);
        name.textContent = card.name; rarity.textContent = C.rarity(card.rarity).name + ' · Standard finish preview';
        count.textContent = String(index + 1).padStart(2, '0') + ' / ' + pool.length;
        preview.getAnimations().forEach(function (animation) { animation.cancel(); });
        if (surface.dataset.shopMotion === 'full') animate(preview, [
          { opacity: .25, transform: 'translateX(16px) rotateY(-8deg)' }, { opacity: 1, transform: 'translateX(0) rotateY(0)' }
        ], { duration: 360 / C.settings.get('uiAnimationSpeed'), easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      chooser.addEventListener('change', function () { showDesign(Number(chooser.value)); });
      showDesign(0);
      footer(scroll); actions.querySelector('button').focus({ preventScroll: true });
    }
    function inspectCard(card, offer) {
      clearContent(); session.selected = { offerId: offer.offerId, dayKey: session.result.snapshot.dayKey };
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      var refreshBalance = chrome(scroll, 'Card inspection'); session.refreshBalance = refreshBalance;
      var detail = node('section', 'shop-detail', scroll);
      var stage = node('div', 'shop-detail-card', detail);
      var view = C.cardView.create(card, previewInstance(card, offer), { owned: false, independent: true, autoFocus: false, canFlip: true });
      stage.appendChild(view.el); session.views.push(view); view.applyMode('full');
      var turn = button(stage, 'Turn card', function () {
        view.flip();
      }, 'shop-turn-card');
      turn.setAttribute('aria-label', 'Turn card to see its reverse or front');
      turn.setAttribute('aria-keyshortcuts', 'R'); turn.title = 'Turn card · R';
      session.cleanups.push(C.keys.listen(surface, 'keydown', 'shop.card-turn', function (event) {
        if (event.key.toLowerCase() !== 'r' || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
            event.target.closest('input,select,textarea,[contenteditable]')) return;
        event.preventDefault(); event.stopPropagation(); view.flip();
      }));
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, C.rarity(card.rarity).name.toUpperCase() + ' / ' + card.generation.toUpperCase());
      node('h2', '', copy, card.name);
      node('p', '', copy, (offer.variantId ? C.variant(offer.variantId).name : 'Standard finish') + ' · source card from the Cardable catalog.');
      var specs = node('dl', 'shop-specs', copy);
      C.cardSpecs.frontRows(card).forEach(function (row) {
        var line = node('div', '', specs); node('dt', '', line, row.label); node('dd', '', line, row.value);
      });
      node('p', 'shop-detail-fact', copy, 'This exact finish is included. A unique serial is assigned when the purchase saves.');
      var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
      node('p', 'shop-detail-owned', copy, copies + ' currently owned');
      price(copy, offer.price); node('small', 'shop-price-note', copy, 'Saved daily quote');
      session.expired = node('p', 'shop-offer-state', copy, 'This offer is no longer current. Return to the Shop for today’s offers.');
      session.expired.hidden = C.shopState.dayKey() === session.selected.dayKey;
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Back to shop', function () { renderShop(); var tile = Array.from(surface.querySelectorAll('.shop-offer')).find(function (el) { return el.querySelector('h3') && el.querySelector('h3').textContent === card.name; }); var target = tile && tile.querySelector('.shop-inspect'); if (target) target.focus({ preventScroll: true }); }, 'shop-back');
      var control = hold(actions, card.name, offer.price, 'card', offer);
      if (!session.expired.hidden) { control.disabled = true; control.title = 'Offer expired'; }
      footer(scroll); actions.querySelector('button').focus({ preventScroll: true });
    }
    session.renderShop = renderShop;
    renderShop();
    session.presentation = C.ui.present(surface, { anchor: origin, onClose: function () {
      if (active !== session) return;
      root.clearInterval(session.ticker); if (session.offSave) session.offSave();
      if (session.offReplace) session.offReplace();
      if (session.offFrame) session.offFrame();
      if (session.offMotion) session.offMotion();
      if (session.offSettings) session.offSettings();
      root.document.removeEventListener('visibilitychange', sync);
      root.removeEventListener('focus', sync);
      clearContent(); active = null;
      C.packView.setVisible(packWasVisible);
    }});
    refreshControls();
    function sync() {
      surface.dataset.shopHidden = root.document.hidden ? 'true' : 'false';
      session.animations.forEach(function (animation) {
        if (root.document.hidden) animation.pause(); else if (animation.playState === 'paused') animation.play();
      });
      if (!active || active !== session || root.document.hidden || session.syncing) return;
      session.syncing = true;
      try {
        var key = C.shopState.dayKey();
        if (session.result.snapshot && session.result.snapshot.dayKey !== key || !session.result.snapshot) {
          var next = C.shopState.ensure();
          if (next.snapshot || next.error) {
            session.result = next;
            if (!session.selected) {
              var focused = root.document.activeElement, inside = surface.contains(focused);
              var tiles = Array.from(surface.querySelectorAll('.shop-offer'));
              var slot = tiles.findIndex(function (tile) { return tile.contains(focused); });
              var action = focused && focused.classList.contains('shop-hold') ? '.shop-hold' : '.shop-inspect';
              session.renderShop();
              if (inside) {
                var newTile = slot >= 0 ? surface.querySelectorAll('.shop-offer')[slot] : null;
                var target = newTile && newTile.querySelector(action) || surface.querySelector('.shop-close');
                if (target) target.focus({ preventScroll: true });
              }
            } else if (session.selected !== 'pack' && session.expired) {
              session.expired.hidden = key === session.selected.dayKey && !!(next.snapshot && next.snapshot.offers.some(function (offer) { return offer.offerId === session.selected.offerId; }));
              var selectedHold = surface.querySelector('.shop-detail .shop-hold');
              if (selectedHold) selectedHold.disabled = !session.expired.hidden;
            }
          }
        }
        if (session.countdown) session.countdown.textContent = countdown();
        if (session.refreshBalance) session.refreshBalance();
        refreshControls();
      } finally { session.syncing = false; }
    }
    root.document.addEventListener('visibilitychange', sync);
    root.addEventListener('focus', sync);
    session.offSave = C.events.on('save:written', sync);
    session.offMotion = C.events.on('motion:changed', motionPolicy);
    session.offSettings = C.events.on('settings:changed', motionPolicy);
    session.offReplace = C.events.on('save:replaced', function () {
      session.result = C.shopState.ensure();
      if (!session.selected) session.renderShop();
      else if (session.selected === 'receipt') { session.locked = false; session.renderShop(true); }
      else if (session.selected === 'pack') inspectPack();
      else if (session.selected !== 'pack' && session.expired) {
        session.expired.hidden = false;
        var selectedHold = surface.querySelector('.shop-detail .shop-hold');
        if (selectedHold) selectedHold.disabled = true;
      }
    });
    session.ticker = root.setInterval(sync, 30000);
    session.offFrame = C.fx.subscribe(function (now, dt) {
      if (active !== session) return false;
      var moving = false;
      session.holds.forEach(function (control) { moving = control.update(now, dt) || moving; });
      session.views.forEach(function (view) {
        if (view.mode === 'full' && view.visible && !view.destroyed && view.update)
          moving = view.update(now, dt) || moving;
      });
      return moving;
    }, 'shop-showroom');
  }
  C.shop = {
    get daily() { return C.shopState.ensure(); },
    get isOpen() { return !!active; },
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
