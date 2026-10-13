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
    surface.style.viewTransitionName = 'shop-page';
    var session = { surface: surface, views: [], holds: [], controls: [], cleanups: [], animations: [], locked: false, entered: false, selected: null, presentation: null, ticker: null, status: null, balance: null, countdown: null, offSave: null, previewState: previewState,
      result: C.shopState.ensure(), offReplace: null, wishlists: [] };
    active = session;
    function motionPolicy() {
      var level = C.settings.policy.animation;
      surface.dataset.shopMotion = C.motion.reduced || level === 0 || C.settings.get('shopMotion') === 'quiet' ? 'static' : level === 1 ? 'calm' : 'full';
      surface.dataset.shopLayout = C.settings.get('shopLayout') || 'showroom';
      surface.dataset.shopHover = C.settings.get('hoverAnimations') ? 'true' : 'false';
      if (surface.dataset.shopMotion !== 'full') {
        session.animations.forEach(function (animation) { animation.cancel(); });
        if (session.transition) session.transition.skipTransition();
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
    function matchObject(el, kind, id) {
      var target = session.transitionTarget;
      if (target && target.kind === kind && (kind === 'pack' || target.id === id)) el.style.viewTransitionName = 'shop-object';
    }
    function navigate(render, source, target) {
      if (active !== session) return;
      var navigation = session.navigation = (session.navigation || 0) + 1;
      if (session.transition) session.transition.skipTransition();
      surface.querySelectorAll('[style]').forEach(function (el) { if (el.style.viewTransitionName === 'shop-object') el.style.removeProperty('view-transition-name'); });
      session.transitionTarget = target;
      if (!root.document.startViewTransition || surface.dataset.shopMotion !== 'full' || !source || !source.isConnected) {
        session.transitionTarget = null; render(); return;
      }
      source.style.viewTransitionName = 'shop-object';
      try {
        var transition = root.document.startViewTransition(function () { if (active === session && session.navigation === navigation) render(); });
        session.transition = transition;
        if (transition.ready) transition.ready.catch(function (error) { if (error.name !== 'AbortError') root.console.warn('Shop transition skipped:', error); });
        transition.finished.catch(function () {}).then(function () {
          if (session.transition !== transition) return;
          session.transition = null; session.transitionTarget = null;
          surface.querySelectorAll('[style]').forEach(function (el) { if (el.style.viewTransitionName === 'shop-object') el.style.removeProperty('view-transition-name'); });
        });
      } catch (_) { source.style.removeProperty('view-transition-name'); session.transitionTarget = null; render(); }
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
      node('span', 'shop-turntable-label', controls, 'Rotate');
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
      var specifications=surface.querySelector('.shop-inspection-specs');
      if(specifications)session.inspectionSpecsOpen=specifications.open;
      session.cleanups.forEach(function (cleanup) { cleanup(); }); session.cleanups = [];
      session.animations.forEach(function (animation) { animation.cancel(); }); session.animations = [];
      session.views.forEach(function (view) { view.destroy(); }); session.views = [];
      session.holds.forEach(function (hold) { if (hold.destroy) hold.destroy(); }); session.holds = [];
      session.controls = []; session.actionNote = null; session.expired = null; session.saveNotice = null; session.refreshHistory = null; session.refreshComparison = null;
      session.wishlists = []; session.refreshSaveDetails = null; session.refreshInspection = null;
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
        if(session.selected&&session.selected.offerId===offer.offerId&&session.expired&&!session.expired.hidden)
          return {state:'expired',message:'Offer expired · return to today’s offers.'};
        var key = C.shopState.dayKey(), day = C.state.current.shop && C.state.current.shop.days.find(function (row) { return row.dayKey === key; });
        var current = day && day.offers.find(function (row) { return row.offerId === offer.offerId; });
        if (!current || session.result.snapshot && session.result.snapshot.dayKey !== key) return { state: 'expired', message: 'Offer expired · return to today’s offers.' };
        if (current.purchased) return { state: 'purchased', message: 'Purchased · next offer tomorrow.' };
      }
      if (C.state.current.currency < amount) return { state: 'unaffordable', message: 'Not enough Credits · ' + format(amount - C.state.current.currency) + ' needed.' };
      return { state: 'normal', message: 'Balance after purchase: ' + format(C.state.current.currency - amount) };
    }
    function refreshControls() {
      if (session.refreshSaveNotice) session.refreshSaveNotice();
      refreshWishlists();
      if (session.refreshSaveDetails) session.refreshSaveDetails();
      if (session.refreshInspection) session.refreshInspection();
      session.controls.forEach(function (item) {
        if (!item.control.isConnected) return;
        var state = availability(item.kind, item.offer, item.amount);
        item.control.disabled = session.locked || session.retrying || state.state !== 'normal';
        item.control.title = state.message;
        if (item.note && !item.control.classList.contains('is-confirming')) {
          var sharedError = state.state === 'error' && session.saveNotice && !session.saveNotice.hidden;
          item.note.textContent = item.control.dataset.purchaseError || (state.state === 'normal' || sharedError ? '' : state.message);
          item.note.hidden = !item.note.textContent;
        }
        if (item.tile) {
          item.tile.dataset.state = state.state;
          if (item.stateNote) { item.stateNote.hidden = state.state === 'normal'; item.stateNote.textContent = state.message; }
          if (item.copies && item.offer) {
            var copies = C.state.current.inventory.filter(function (copy) { return copy.cardId === item.offer.cardId; }).length;
            item.copies.textContent = (item.offer.variantId ? C.variant(item.offer.variantId).name : 'Standard') + (copies ? ' · ' + copies + ' owned' : '');
          }
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
      clearContent(); session.selected = 'receipt'; session.locked = false;
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      session.refreshBalance = chrome(scroll, 'Shop');
      var detail = node('section', 'shop-detail shop-receipt', scroll);
      var stage = node('div', result.kind === 'pack' ? 'shop-detail-pack shop-receipt-object' : 'shop-detail-card shop-receipt-object', detail);
      if (result.kind === 'pack') {
        stage.dataset.skin = 'titan'; stage.dataset.packQuality = C.settings.get('quality');
        stage.style.setProperty('--pack-width', 'min(52vw, 260px)'); stage.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
        C.packMarkup.unit(stage, false, C.pack('titan'));
        matchObject(stage, 'pack');
      } else {
        var card = C.card(result.instance.cardId);
        var view = C.cardView.create(card, result.instance, { owned: true, independent: true, autoFocus: false });
        stage.appendChild(view.el); session.views.push(view); view.applyMode('full');
        matchObject(view.el, 'card', card.id);
      }
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, 'Acquired');
      node('h2', '', copy, result.kind === 'pack' ? 'Titan Pack' : C.card(result.instance.cardId).name);
      node('p', 'shop-detail-fact', copy, result.kind === 'pack' ? 'Ready to open' : 'Added to inventory');
      node('p', 'shop-receipt-balance', copy, format(result.balance));
      var receipt = node('details', 'shop-receipt-data', copy);
      node('summary', '', receipt, 'Receipt'); node('p', 'shop-receipt-id', receipt, result.receiptId);
      var actions = node('div', 'shop-actions', copy);
      var primary = button(actions, result.kind === 'pack' ? 'Open Titan Pack' : 'View in inventory', function () {
        if (result.kind === 'pack') openPurchasedPack();
        else { session.presentation.close(); root.queueMicrotask(function () { C.events.notify('inventory:showCard', { cardId: result.instance.cardId, instanceId: result.instance.instanceId }); }); }
      }, 'shop-inspect');
      button(actions, 'Back to shop', function () {
        session.locked = false; session.result = C.shopState.ensure();
        navigate(function () { renderShop(true); }, result.kind === 'pack' ? stage : stage.querySelector('.collectible-card'),
          { kind: result.kind, id: result.kind === 'card' ? result.instance.cardId : null });
      }, 'shop-back');
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
          session.locked = true; control.disabled = true; note.hidden = false; note.textContent = 'Saving purchase…'; announce('Saving purchase…');
          var result = kind === 'pack' ? C.shopPurchase.buyTitan() : C.shopPurchase.buyCard(Object.assign({ dayKey: session.result.snapshot.dayKey }, offer));
          if (result.ok) {
            var source = kind === 'card' ? (tile || surface.querySelector('.shop-detail-card')).querySelector('.collectible-card') : surface.querySelector('.shop-pack-exhibit,.shop-detail-pack');
            navigate(function () { showReceipt(result); }, source, { kind: kind, id: kind === 'card' ? result.instance.cardId : null });
          }
          else {
            session.locked = false; control.dataset.purchaseError = result.message;
            if (control.confirmation) control.confirmation.cancel();
            note.textContent = result.message; note.hidden = false;
            announce(result.message); refreshControls();
          }
          return false;
        },
        announce: function (message) { if (/percent/.test(message)) { note.hidden = false; note.textContent = message; announce('Purchase ' + name + ': ' + message); } }
      });
      control.classList.add('shop-hold');
      control.setAttribute('aria-label', 'Hold to purchase ' + name + ' for ' + format(amount));
      control.setAttribute('aria-description', 'Hold for 1.4 seconds. Releasing early cancels without spending Credits.');
      parent.insertBefore(control, note); session.holds.push(control);
      ['pointerdown','keydown'].forEach(function (event) { control.addEventListener(event, function () {
        if (control.classList.contains('is-confirming')) { delete control.dataset.purchaseError; note.hidden = true; }
      }); });
      ['pointerup','pointerleave','pointercancel','keyup','blur'].forEach(function (event) {
        control.addEventListener(event, function () { root.queueMicrotask(function () {
          if (control.isConnected && !session.locked && !control.classList.contains('is-confirming')) refreshControls();
        }); });
      });
      var stateNote = null;
      session.controls.push({ control: control, note: note, kind: kind, amount: amount, offer: offer, tile: tile, copies: copies, stateNote: stateNote });
      refreshControls();
      return control;
    }
    function chrome(section, label) {
      var header = node('header', 'shop-header', section);
      var brand = node('div', 'shop-brand', header);
      node('span', 'shop-overline', brand, 'CARDABLE');
      node('h1', '', brand, label);
      var actions = node('div', 'shop-header-actions', header);
      session.balance = node('div', 'shop-balance', actions);
      function refreshBalance() { session.balance.textContent = (C.state.current ? C.state.current.currency : 0).toLocaleString() + ' Credits'; }
      refreshBalance();
      button(actions, session.selected === 'history' ? 'Back to Shop' : 'Purchase history', function () {
        if (session.selected === 'history') renderShop(true); else history();
      }, 'shop-history-control', 'notes');
      button(actions, 'Shop help', function () { var help = surface.querySelector('.shop-help'); if (help) { help.hidden = !help.hidden; if (!help.hidden) help.focus(); } }, 'shop-help-control', 'help');
      var optionsButton = button(actions, 'Shop settings', function () {
        options.hidden = !options.hidden; optionsButton.setAttribute('aria-expanded', String(!options.hidden));
        if (!options.hidden) options.querySelector('select').focus({ preventScroll: true });
      }, 'shop-options-control', 'settings');
      optionsButton.setAttribute('aria-expanded', 'false'); optionsButton.setAttribute('aria-controls', 'shop-options');
      button(actions, 'Close Shop', function () { session.presentation.close(); }, 'shop-close', 'close');
      var help = node('p', 'shop-help', section, 'Four catalog card offers refresh at local midnight. The Titan Pack remains featured until a game update. Hold the exact item’s purchase button for 1.4 seconds; releasing early spends nothing. Purchases save locally.');
      help.hidden = true; help.tabIndex = -1;
      var options = node('section', 'shop-options', section); options.id = 'shop-options'; options.hidden = true; options.setAttribute('aria-label', 'Shop settings');
      ['shopLayout', 'shopMotion', 'shopSort'].forEach(function (key) {
        var definition = C.settingsSchema.entries[key], field = node('label', 'shop-option', options);
        node('span', '', field, definition.label);
        var select = node('select', 'shop-option-select', field); select.dataset.setting = key;
        definition.choices.forEach(function (value) { var option = node('option', '', select, definition.format(value)); option.value = value; });
        select.value = C.settings.getRequested(key);
        select.addEventListener('change', function () { C.settings.set(key, select.value); });
      });
      button(options, 'Close Shop settings', function () { options.hidden = true; optionsButton.setAttribute('aria-expanded', 'false'); optionsButton.focus({ preventScroll: true }); }, 'shop-options-close', 'close');
      var markerLabel=node('label','shop-option shop-option--check',options);
      var markers=node('input','shop-marker-toggle',markerLabel); markers.type='checkbox'; markers.checked=C.settings.get('shopWishlistMarkers');
      node('span','',markerLabel,'Wishlist marks'); markers.addEventListener('change',function(){C.settings.set('shopWishlistMarkers',markers.checked);});
      button(options,'Save status',saveStatus,'shop-save-status-open');
      var saveNotice = node('div', 'shop-save-notice', section); saveNotice.hidden = true;
      var message = node('p', '', saveNotice); message.setAttribute('role', 'status');
      var retry = button(saveNotice, 'Retry save', function () {
        if (C.state.recovery && C.state.recovery.pending || C.bootFailure || session.locked || session.retrying) return;
        session.retrying = true;
        session.holds.forEach(function (control) { if (control.confirmation) control.confirmation.cancel(); });
        refreshControls();
        C.state.save();
        if (C.state.lastWriteSucceeded) {
          session.result = C.shopState.ensure();
          if (!session.selected && session.result.snapshot && !surface.querySelector('.shop-offer')) renderShop(true);
          session.controls.forEach(function (item) { delete item.control.dataset.purchaseError; });
        }
        function finished() {
          session.retrying = false;
          if (active !== session) return;
          refreshControls();
          announce(C.state.lastWriteSucceeded && !desktopBackupFailed() ? 'Save restored. Hold to purchase again.' : 'Saving or backup is still unavailable.');
        }
        if (C.state.lastWriteSucceeded && desktopBackupFailed() && C.desktop.retryBackup)
          C.desktop.retryBackup().catch(function () {}).then(finished);
        else finished();
      }, 'shop-save-retry');
      button(saveNotice, 'Data settings', function () { session.presentation.close(); root.queueMicrotask(function () { C.openSettings('Data'); }); }, 'shop-save-data');
      session.saveNotice = saveNotice;
      session.refreshSaveNotice = function () {
        if (!saveNotice.isConnected) return;
        saveNotice.hidden = C.state.lastWriteSucceeded && !desktopBackupFailed() && !session.retrying;
        if (saveNotice.hidden) return;
        var recovery = C.state.recovery && C.state.recovery.pending || C.bootFailure;
        message.textContent = session.retrying ? 'Saving…' : recovery ? 'Resolve save recovery in Data settings.' :
          C.state.lastError && C.state.lastError.reason === 'quota' ? 'Save storage is full. Export your save in Data settings before freeing space.' : 'Saving failed. Retry or export your save in Data settings.';
        if (!session.retrying && C.state.lastWriteSucceeded && desktopBackupFailed()) message.textContent = 'Desktop backup failed. Local save is intact.';
        retry.textContent = session.retrying ? 'Retrying…' : C.state.lastWriteSucceeded && desktopBackupFailed() ? 'Retry backup' : 'Retry save';
        retry.disabled = !!recovery || session.locked || session.retrying;
      };
      session.refreshSaveNotice();
      return refreshBalance;
    }
    function desktopBackupFailed() {
      return C.desktop && C.desktop.isAvailable && C.config.storage.key === 'cardable.save' && C.desktop.storageIssue;
    }
    function comparison() {
      clearContent(); session.selected = 'compare'; session.locked = false;
      var scroll = node('div', 'shop-scroll shop-scroll--compare', surface);
      session.refreshBalance = chrome(scroll, 'Shop');
      var area = node('section', 'shop-comparison', scroll); area.setAttribute('aria-labelledby', 'shop-compare-title');
      var top = node('div', 'shop-compare-heading', area);
      var heading = node('h2', '', top, 'Compare offers'); heading.id = 'shop-compare-title'; heading.tabIndex = -1;
      var differences = C.ui.create('button', { label:'Differences only',
        onClick:function () { C.settings.set('shopCompareDifferences', !C.settings.get('shopCompareDifferences')); } });
      differences.setAttribute('role', 'switch'); differences.setAttribute('aria-checked', String(C.settings.get('shopCompareDifferences')));
      differences.classList.add('shop-compare-differences'); top.appendChild(differences);
      var entries = (session.result.snapshot ? session.result.snapshot.offers : []).map(function (offer) {
        return { offer: offer, card: C.card(offer.cardId) };
      }).filter(function (entry) { return entry.card && C.shopState.eligible(entry.card, C.rarity(entry.card.rarity)); });
      if (!entries.length) area.appendChild(C.ui.create('empty-state', { label: session.result.error || 'No current offers to compare.' }));
      else {
        var region = node('div', 'shop-compare-scroll', area); region.tabIndex = 0;
        region.setAttribute('role', 'region'); region.setAttribute('aria-label', 'Daily offer comparison');
        var table = node('table', 'shop-compare-table', region); node('caption', 'visually-hidden', table, 'Today’s saved offers. Missing catalog specs are shown as a dash.');
        var head = node('thead', '', table), headers = node('tr', '', head);
        var corner = node('th', 'shop-compare-label', headers, 'Daily offers'); corner.scope = 'col';
        entries.forEach(function (entry) {
          var cell = node('th', '', headers); cell.scope = 'col';
          var art = node('button', 'shop-compare-art', cell); art.type = 'button'; art.setAttribute('aria-label', 'Inspect ' + entry.card.name);
          art.dataset.cardId = entry.card.id;
          var view = C.cardView.create(entry.card, previewInstance(entry.card, entry.offer), { thumbnail: true, owned: false, keyboardFlip: false, autoFocus: false });
          view.el.inert = true; art.appendChild(view.el); session.views.push(view); arrive(art);
          matchObject(view.el, 'card', entry.card.id);
          art.addEventListener('click', function () { navigate(function () { inspectCard(entry.card, entry.offer); }, view.el, { kind: 'card', id: entry.card.id }); });
          node('h3', '', cell, entry.card.name);
          price(cell, entry.offer.price);
          button(cell, 'Inspect', function () { navigate(function () { inspectCard(entry.card, entry.offer); }, view.el, { kind: 'card', id: entry.card.id }); }, 'shop-inspect').setAttribute('aria-label', 'Inspect ' + entry.card.name);
        });
        var body = node('tbody', '', table);
        function row(label, values) {
          var line = node('tr', '', body), key = node('th', 'shop-compare-label', line, label); key.scope = 'row';
          values.forEach(function (value) { node('td', '', line, value == null || value === '' ? '—' : value); });
          return line;
        }
        row('Rarity', entries.map(function (entry) { return C.rarity(entry.card.rarity).name; }));
        row('Finish', entries.map(function (entry) { return entry.offer.variantId ? C.variant(entry.offer.variantId).name : 'Standard'; }));
        row('Memory', entries.map(function (entry) { return C.cardSpecs.vram(entry.card); }));
        row('Memory type', entries.map(function (entry) { return C.cardSpecs.memoryType(entry.card); }));
        var specs = entries.map(function (entry) { return C.cardSpecs.rows(entry.card); }), keys = new Map();
        specs.forEach(function (rows) { rows.forEach(function (spec) { keys.set(spec.key, spec.label); }); });
        keys.forEach(function (label, key) { row(label, specs.map(function (rows) { var spec = rows.find(function (item) { return item.key === key; }); return spec && spec.value; })); });
        var owned = row('Owned', entries.map(function () { return 0; }));
        var state = row('Offer', entries.map(function () { return ''; }));
        session.refreshComparison = function () {
          entries.forEach(function (entry, index) {
            owned.children[index + 1].textContent = C.state.current.inventory.filter(function (item) { return item.cardId === entry.card.id; }).length;
            var status = availability('card', entry.offer, entry.offer.price).state;
            state.children[index + 1].textContent = { normal:'Available', purchased:'Purchased', unaffordable:'Not enough Credits', error:'Save unavailable', expired:'Offer expired', disabled:'Unavailable' }[status] || 'Unavailable';
          });
          var onlyDifferences = C.settings.get('shopCompareDifferences');
          differences.setAttribute('aria-checked', String(onlyDifferences));
          Array.from(body.rows).forEach(function (line) {
            var values = Array.from(line.querySelectorAll('td')).map(function (cell) { return cell.textContent; });
            line.hidden = onlyDifferences && values.every(function (value) { return value === values[0]; });
          });
        };
        session.refreshComparison();
      }
      button(area, 'Back to shop', function () { renderShop(); var target = surface.querySelector('.shop-compare-open'); if (target) target.focus(); }, 'shop-back');
      footer(scroll); heading.focus({ preventScroll: true });
    }
    function orderedOffers() {
      var snapshot=session.result.snapshot, order=C.settings.get('shopSort');
      if(!snapshot)return [];
      return snapshot.offers.map(function(offer,index){var card=C.card(offer.cardId);return {offer:offer,index:index,card:card,
        rank:card?C.data.rarities.findIndex(function(rarity){return rarity.id===card.rarity;}):-1};}).filter(function(item){return !!item.card&&C.shopState.eligible(item.card,C.rarity(item.card.rarity));}).sort(function(a,b){
        var difference=order==='price-asc'?a.offer.price-b.offer.price:order==='price-desc'?b.offer.price-a.offer.price:
          order==='rarity-desc'?b.rank-a.rank:order==='wanted-first'?Number(C.shopWishlist.wanted(b.card.id))-Number(C.shopWishlist.wanted(a.card.id)):0;
        return difference||a.index-b.index;
      }).map(function(item){return item.offer;});
    }
    function arrangeOffers() {
      var grid = surface.querySelector('.shop-offer-grid'); if (!grid) return;
      var positions=new Map(orderedOffers().map(function(offer,index){return [offer.offerId,index];}));
      var tiles=Array.from(grid.querySelectorAll('.shop-offer'));
      tiles.sort(function(a,b){return (positions.get(a.dataset.offerId)??Number(a.dataset.slot))-(positions.get(b.dataset.offerId)??Number(b.dataset.slot));});
      tiles.forEach(function (tile) { grid.appendChild(tile); });
    }
    function refreshWishlists() { session.wishlists.forEach(function (control) { control.refresh(); }); }
    function wishlist(parent, cardId) {
      session.wishlists.push(C.shopWishlist.create(parent,cardId,{
        active:function(){return active===session;},busy:function(){return session.locked||session.retrying;},
        target:function(){return session.wishlistTarget;},setTarget:function(id){session.wishlistTarget=id;},
        changed:function(){refreshWishlists();arrangeOffers();},announce:announce
      }));
    }
    function saveStatus() {
      clearContent(); session.selected='save-status'; session.locked=false;
      var scroll=node('div','shop-scroll shop-scroll--save',surface);session.refreshBalance=chrome(scroll,'Shop');
      var area=node('section','shop-save-details',scroll);area.setAttribute('aria-labelledby','shop-save-title');
      var title=node('h2','',area,'Save status');title.id='shop-save-title';title.tabIndex=-1;
      var fields=node('dl','shop-save-facts',area), values={};
      ['Local save','Desktop backup','Save slot','Game file','Data location','Cards','Shop receipts','Local error'].forEach(function(label){
        var line=node('div','',fields);node('dt','',line,label);values[label]=node('dd','',line);
      });
      var nativeSummary=null, nativePath=null, checking=false, epoch=0;
      function refresh() {
        if(!area.isConnected)return;
        var recovery=C.state.recovery&&C.state.recovery.pending;
        values['Local save'].textContent=recovery?'Recovery pending':C.state.lastWriteSucceeded?'Saved':C.state.lastError&&C.state.lastError.reason==='quota'?'Storage full':'Unavailable';
        values['Desktop backup'].textContent=!C.desktop.isAvailable?'Browser only':C.config.storage.key!=='cardable.save'?'Not used for this project':desktopBackupFailed()?'Last attempt failed':nativeSummary||'Not checked';
        values['Save slot'].textContent=C.config.storage.key==='cardable.save'?'Main collection':'Developer project';
        values['Game file'].textContent=root.location.href.split('?')[0].split('#')[0];
        values['Data location'].textContent=C.desktop.isAvailable?(nativePath||'Check to show the Windows profile folder'):'This browser’s local storage';
        values['Cards'].textContent=C.state.current.inventory.length.toLocaleString();
        values['Shop receipts'].textContent=(C.state.current.shop?C.state.current.shop.receipts.length:0).toLocaleString();
        values['Local error'].textContent=C.state.lastError?C.state.lastError.reason+(C.state.lastError.operation?' · '+C.state.lastError.operation:''):'None';
        check.disabled=checking;check.textContent=checking?'Checking…':'Check now';
      }
      var actions=node('div','shop-actions',area);
      var check=button(actions,'Check now',function(){
        if(checking||active!==session||!area.isConnected)return;
        if(!C.native){refresh();announce('Local save status checked.');return;}
        checking=true;var ticket=++epoch;refresh();
        Promise.allSettled([C.native.app.getPaths(),C.config.storage.key==='cardable.save'?C.native.storage.getBackup():Promise.resolve(null)]).then(function(results){
          if(active!==session||!area.isConnected||ticket!==epoch)return;
          checking=false;
          if(results[0].status==='fulfilled')nativePath=results[0].value.userData;
          var result=results[1].status==='fulfilled'?results[1].value:null;
          nativeSummary=!result?'Unavailable':result.error?'Needs recovery':!result.exists?'No backup yet':'Present';
          if(result&&result.exists&&result.data&&!result.error){try{var stored=JSON.parse(result.data);nativeSummary=Array.isArray(stored.inventory)?'Present · '+stored.inventory.length+(stored.inventory.length===1?' card':' cards'):'Needs recovery';}catch(_){nativeSummary='Needs recovery';}}
          refresh();announce('Save status checked.');
        });
      },'shop-save-check');
      button(actions,'Data settings',function(){session.presentation.close();root.queueMicrotask(function(){C.openSettings('Data');});},'shop-save-data-open');
      button(actions,'Back to shop',function(){renderShop(true);},'shop-back');
      node('p','shop-save-guidance',area,'Export your save from Data settings. Studio photos have a separate export in the Album.');
      session.refreshSaveDetails=refresh;refresh();footer(scroll);title.focus({preventScroll:true});
    }
    function history() {
      clearContent(); session.selected = 'history'; session.locked = false;
      var scroll = node('div', 'shop-scroll shop-scroll--history', surface);
      session.refreshBalance = chrome(scroll, 'Shop');
      var area = node('section', 'shop-history', scroll); area.setAttribute('aria-labelledby', 'shop-history-title');
      var head = node('div', 'shop-history-heading', area);
      var title = node('h2', '', head, 'Purchase history'); title.id = 'shop-history-title'; title.tabIndex = -1;
      var count = node('span', 'shop-history-total', head);
      var tools = node('div', 'shop-history-tools', area);
      var label = node('label', '', tools); node('span', '', label, 'Show');
      var filter = node('select', 'shop-history-filter shop-option-select', label);
      [['all','All purchases'],['card','Cards'],['pack','Packs']].forEach(function (choice) {
        var option = node('option', '', filter, choice[1]); option.value = choice[0];
      });
      filter.value = session.historyFilter || 'all';
      var list = node('div', 'shop-history-list', area); list.setAttribute('role', 'list');
      var paging = node('nav', 'shop-history-paging', area); paging.setAttribute('aria-label', 'Purchase history pages');
      var previous = button(paging, 'Previous purchases', function () { session.historyPage--; refresh(true); }, 'shop-history-prev', 'chevron');
      var position = node('span', 'shop-history-position', paging); position.setAttribute('role', 'status');
      var next = button(paging, 'Next purchases', function () { session.historyPage++; refresh(true); }, 'shop-history-next', 'chevron');
      button(area, 'Back to shop', function () { renderShop(); surface.querySelector('.shop-history-control').focus({ preventScroll: true }); }, 'shop-back');
      var signature = null;
      function refresh(force) {
        if (!list.isConnected) return;
        var shop;
        try { shop = C.shopState.normalize(C.state.current.shop); }
        catch (_) { list.replaceChildren(C.ui.create('empty-state', { label: 'Purchase history is unavailable. Resolve save recovery in Data settings.' })); paging.hidden = true; return; }
        var byId = new Map(), byEntitlement = new Map();
        C.state.current.inventory.forEach(function (item) {
          byId.set(item.instanceId, item);
          if (item.source === 'shop-pack') byEntitlement.set(item.shopEntitlementId, item);
        });
        var records = (shop ? shop.receipts : []).slice().sort(function (a, b) { return b.at - a.at; });
        var rows = records.filter(function (receipt) { return filter.value === 'all' || receipt.kind === filter.value; }).map(function (receipt) {
          var copy = receipt.kind === 'card' ? byId.get(receipt.instanceId) : byEntitlement.get(receipt.entitlementId);
          var card = C.card(receipt.cardId || copy && copy.cardId);
          var ready = receipt.kind === 'pack' && shop.entitlement && shop.entitlement.entitlementId === receipt.entitlementId;
          var pending = receipt.kind === 'pack' && C.state.current.pendingReveal && C.state.current.pendingReveal.entitlementId === receipt.entitlementId;
          var validTime = Number.isFinite(new Date(receipt.at).getTime());
          return { receipt: receipt, copy: copy, card: card, ready: ready,
            state: ready ? 'Ready to open' : pending ? 'Opening in progress' : copy ? 'In inventory' : receipt.kind === 'pack' ? 'Opened' : 'Not in inventory',
            name: receipt.kind === 'pack' ? 'Titan Pack' : card ? card.name : receipt.cardId,
            date: validTime ? C.formats.date(receipt.at, true) : 'Date unavailable', validTime: validTime };
        });
        var nextSignature = JSON.stringify(rows.map(function (row) { return [row.receipt.receiptId, row.receipt.price, row.name, row.state, row.date,
          row.copy && [row.copy.instanceId, row.copy.serial, row.copy.variantId]]; })) + filter.value;
        var pages = Math.max(1, Math.ceil(rows.length / 8)); session.historyPage = Math.max(0, Math.min(pages - 1, session.historyPage || 0));
        count.textContent = records.length + (records.length === C.data.shop.retainedReceipts ? ' recent purchases' : records.length === 1 ? ' purchase' : ' purchases');
        previous.disabled = session.historyPage === 0; next.disabled = session.historyPage === pages - 1;
        position.textContent = rows.length ? (session.historyPage * 8 + 1) + '–' + Math.min(rows.length, (session.historyPage + 1) * 8) + ' / ' + rows.length : '0';
        paging.hidden = rows.length <= 8;
        if (!force && nextSignature === signature) return;
        signature = nextSignature; list.replaceChildren();
        if (!rows.length) list.appendChild(C.ui.create('empty-state', { label: records.length ? 'No purchases in this category.' : 'No purchases yet.' }));
        rows.slice(session.historyPage * 8, (session.historyPage + 1) * 8).forEach(function (row) {
          var entry = node('article', 'shop-history-row', list); entry.setAttribute('role', 'listitem'); entry.dataset.receipt = row.receipt.receiptId;
          var mark = node('span', 'shop-history-mark', entry); mark.appendChild(C.icons.create(row.receipt.kind));
          var body = node('div', 'shop-history-copy', entry);
          node('h3', '', body, row.name); var date = node('time', '', body, row.date); if (row.validTime) date.dateTime = new Date(row.receipt.at).toISOString();
          var status = node('span', 'shop-history-state', body, row.state); status.dataset.owned = row.copy ? 'true' : 'false';
          var details = node('details', 'shop-history-details', body); node('summary', '', details, 'Receipt');
          node('p', '', details, row.receipt.receiptId);
          if (row.copy) {
            node('p', '', details, row.copy.serial);
            node('p', '', details, row.copy.variantId ? C.variant(row.copy.variantId).name : 'Standard');
          }
          var actions = node('div', 'shop-history-actions', entry); price(actions, row.receipt.price);
          if (row.ready) button(actions, 'Open Titan Pack', openPurchasedPack, 'shop-history-open');
          else if (row.copy && row.card) button(actions, 'View card', function () {
            var current = C.state.current.inventory.find(function (item) { return item.instanceId === row.copy.instanceId; });
            if (!current) { refresh(true); announce('This copy is no longer in inventory.'); return; }
            session.presentation.close(); root.queueMicrotask(function () { C.events.notify('inventory:showCard', { cardId: current.cardId, instanceId: current.instanceId }); });
          }, 'shop-history-view');
        });
      }
      filter.addEventListener('change', function () { session.historyFilter = filter.value; session.historyPage = 0; refresh(true); });
      session.refreshHistory = refresh; refresh(true); footer(scroll);
      title.focus({ preventScroll: true });
    }
    function footer(section) {
      session.status = node('p', 'shop-status visually-hidden', section);
      session.status.setAttribute('role', 'status'); session.status.setAttribute('aria-live', 'polite');
    }
    function hero(section) {
      var pack = C.pack('titan');
      var feature = node('section', 'shop-feature', section);
      if (!session.entered) { feature.classList.add('shop-feature--enter'); session.entered = true; }
      feature.setAttribute('aria-labelledby', 'shop-feature-title');
      var stage = node('div', 'shop-feature-stage', feature);
      var light = node('div', 'shop-stage-light', stage); light.setAttribute('aria-hidden', 'true');
      var exhibit = node('div', 'shop-pack-exhibit', stage);
      reactive(stage);
      exhibit.dataset.skin = 'titan'; exhibit.dataset.packQuality = C.settings.get('quality');
      exhibit.style.setProperty('--pack-width', 'min(22vw, 240px)');
      exhibit.style.setProperty('--pack-height', 'calc(var(--pack-width) * 1.48)');
      C.packMarkup.unit(exhibit, false, pack);
      matchObject(exhibit, 'pack');
      turntable(stage, exhibit);
      var copy = node('div', 'shop-feature-copy', feature);
      node('span', 'shop-kicker', copy, 'Titan Pack');
      var title = node('h2', '', copy); title.id = 'shop-feature-title'; title.setAttribute('aria-label', 'TITAN: FIRST CONTACT');
      node('span', 'shop-feature-name', title, 'TITAN'); node('span', 'shop-feature-subtitle', title, 'FIRST CONTACT');
      node('p', 'shop-feature-description', copy, '17 designs · 1 card');
      var purchase = node('div', 'shop-feature-purchase', copy);
      price(purchase, FEATURED_PRICE);
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Inspect pack', function () { navigate(inspectPack, exhibit, { kind: 'pack' }); }, 'shop-inspect');
      if (entitlement()) button(actions, 'Open Titan Pack', openPurchasedPack, 'shop-open-owned');
      else hold(actions, 'Titan Pack', FEATURED_PRICE, 'pack');
      if (entitlement()) node('p', 'shop-disabled-note', copy, 'Ready to open');
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
      var offersTitle = node('h2', '', titles, 'Daily offers'); offersTitle.id = 'shop-offers-title'; offersTitle.tabIndex = -1;
      var tools = node('div', 'shop-offers-tools', heading);
      button(tools, 'Compare offers', comparison, 'shop-compare-open');
      var clock = node('div', 'shop-reset', tools);
      node('span', '', clock, 'Resets in');
      session.countdown = node('strong', '', clock, countdown());
      if (session.result.error) node('p', 'shop-fixture-note', area, session.result.error);
      var grid = node('div', 'shop-offer-grid', area);
      var daily = session.result.snapshot ? session.result.snapshot.offers : [];
      (session.previewState === 'empty' ? [] : session.previewState === 'underfilled' ? daily.slice(0, 2) : daily).forEach(function (offer, index) {
        var card = C.card(offer.cardId);
        if (!C.shopState.eligible(card, card && C.rarity(card.rarity))) {
          var unavailable = node('article', 'shop-offer', grid);
          unavailable.dataset.state = 'disabled';
          unavailable.dataset.slot = index;
          node('span', 'shop-offer-index', unavailable, String(index + 1).padStart(2, '0') + ' / 04');
          node('h3', '', unavailable, 'Card unavailable');
          node('p', 'shop-offer-state', unavailable, 'This saved offer is no longer in the catalog. It will refresh at local midnight.');
          return;
        }
        var tile = node('article', 'shop-offer', grid);
        arrive(tile, index);
        tile.dataset.rarity = card.rarity; tile.dataset.cardId=card.id;
        tile.dataset.slot = index; tile.dataset.price = offer.price; tile.dataset.offerId=offer.offerId;
        tile.dataset.rarityRank = C.data.rarities.findIndex(function (rarity) { return rarity.id === card.rarity; });
        var state = index === 0 && previewLabels[session.previewState] ? session.previewState : offer.purchased ? 'purchased' : 'normal';
        tile.dataset.state = state;
        if (state === 'loading') tile.setAttribute('aria-busy', 'true');
        var thumb = node('button', 'shop-offer-art', tile); thumb.type = 'button';
        thumb.setAttribute('aria-label', 'Inspect ' + card.name + ', ' + C.rarity(card.rarity).name);
        thumb.addEventListener('click', function () { navigate(function () { inspectCard(card, offer); }, view.el, { kind: 'card', id: card.id }); });
        reactive(thumb);
        var view = C.cardView.create(card, previewInstance(card, offer), { thumbnail: true, owned: false, keyboardFlip: false, autoFocus: false });
        view.el.inert = true;
        matchObject(view.el, 'card', card.id);
        thumb.appendChild(view.el); session.views.push(view);
        var meta = node('div', 'shop-offer-meta', tile);
        node('span', 'shop-offer-index', meta, String(index + 1).padStart(2, '0') + ' / 04');
        node('span', 'shop-offer-rarity', meta, C.rarity(card.rarity).name);
        node('h3', '', tile, card.name);
        var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
        var copiesLabel = node('p', 'shop-offer-variant', tile, (offer.variantId ? C.variant(offer.variantId).name : 'Standard') + (copies ? ' · ' + copies + ' owned' : ''));
        price(tile, offer.price);
        var actions = node('div', 'shop-offer-actions', tile);
        var inspect = button(actions, 'Inspect', function () { navigate(function () { inspectCard(card, offer); }, view.el, { kind: 'card', id: card.id }); }, 'shop-inspect');
        inspect.setAttribute('aria-label', 'Inspect ' + card.name);
        var control = hold(actions, card.name, offer.price, 'card', offer, tile, copiesLabel);
        wishlist(tile,card.id);
        if (state !== 'normal' && session.previewState !== 'normal') { control.disabled = true; control.title = previewLabels[state] + ' · UI state preview'; }
      });
      if (!grid.children.length) {
        var empty = C.ui.create('empty-state', { label: session.result.error || 'The catalog has fewer than four eligible cards. Daily offers are unavailable.' });
        grid.appendChild(empty);
      }
      arrangeOffers();
    }
    function renderShop(focus) {
      clearContent(); session.selected = null;
      var scroll = node('div', 'shop-scroll', surface);
      var refreshBalance = chrome(scroll, 'Shop');
      hero(scroll); offers(scroll); footer(scroll);
      session.result.isNew = false;
      session.refreshBalance = refreshBalance;
      if (focus) (focus.isConnected ? focus : surface.querySelector('.shop-close')).focus({ preventScroll: true });
      refreshWishlists();
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
      matchObject(stage, 'pack');
      var copy = node('div', 'shop-detail-copy', detail);
      node('span', 'shop-kicker', copy, 'Titan Pack');
      node('h2', '', copy, 'TITAN: FIRST CONTACT');
      node('p', 'shop-detail-fact', copy, '17 designs · 1 card');
      price(copy, FEATURED_PRICE);
      var actions = node('div', 'shop-actions', copy);
      button(actions, 'Back to shop', function () { navigate(function () { renderShop(true); }, stage, { kind: 'pack' }); }, 'shop-back');
      if (entitlement()) button(actions, 'Open Titan Pack', openPurchasedPack, 'shop-open-owned');
      else hold(actions, 'Titan Pack', FEATURED_PRICE, 'pack');
      var vault = node('details', 'shop-vault', scroll); vault.open = true;
      node('summary', '', vault, '17 designs');
      var browse = node('div', 'shop-vault-browse', vault);
      var preview = node('div', 'shop-vault-card', browse);
      var catalog = node('div', 'shop-vault-copy', browse);
      var name = node('h3', '', catalog), rarity = node('p', 'shop-vault-rarity', catalog);
      var chooser = node('select', 'shop-vault-select', catalog); chooser.setAttribute('aria-label', 'Preview a Titan design');
      var pool = C.pack('titan').pool.cardIds.map(C.card).filter(Boolean), current = 0, previewView = null;
      pool.forEach(function (card, index) { var option = node('option', '', chooser, card.name); option.value = index; });
      var nav = node('div', 'shop-vault-nav', catalog);
      button(nav, 'Previous Titan design', function () { showDesign((current + pool.length - 1) % pool.length); }, 'shop-vault-prev', 'chevron');
      var count = node('span', 'shop-vault-count', nav);
      button(nav, 'Next Titan design', function () { showDesign((current + 1) % pool.length); }, 'shop-vault-next', 'chevron');
      node('p', 'shop-vault-note', catalog, 'Pool preview · opening rolls one card');
      function showDesign(index) {
        current = index; chooser.value = index;
        if (previewView) { previewView.destroy(); session.views = session.views.filter(function (view) { return view !== previewView; }); }
        var card = pool[index]; if (!card) return;
        previewView = C.cardView.create(card, previewInstance(card, { variantId: null, cardSkinId: null }), { thumbnail: true, owned: false, keyboardFlip: false });
        preview.appendChild(previewView.el); session.views.push(previewView);
        name.textContent = card.name; rarity.textContent = C.rarity(card.rarity).name;
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
    function inspectCard(card, offer, context) {
      context=context||{};
      var returnToCompare = context.returnToCompare==null?session.selected === 'compare':context.returnToCompare;
      var inspectionDay=context.dayKey||session.result.snapshot.dayKey;
      clearContent(); session.selected = { offerId: offer.offerId, dayKey: inspectionDay, returnToCompare:returnToCompare };
      var scroll = node('div', 'shop-scroll shop-scroll--detail', surface);
      var refreshBalance = chrome(scroll, 'Shop'); session.refreshBalance = refreshBalance;
      var detail = node('section', 'shop-detail', scroll);
      var stage = node('div', 'shop-detail-card', detail);
      var view = C.cardView.create(card, previewInstance(card, offer), { owned: false, independent: true, autoFocus: false, canFlip: true });
      stage.appendChild(view.el); session.views.push(view); view.applyMode('full');
      matchObject(view.el, 'card', card.id);
      var tools=node('div','shop-inspection-tools',stage);
      var nav=node('nav','shop-inspection-nav',tools);nav.setAttribute('aria-label','Browse daily offers');
      var previous=button(nav,'Previous daily offer',function(){step(-1,'previous');},'shop-inspection-prev','chevron');
      var position=node('span','shop-inspection-position',nav);
      var next=button(nav,'Next daily offer',function(){step(1,'next');},'shop-inspection-next','chevron');
      previous.setAttribute('aria-keyshortcuts','ArrowLeft');next.setAttribute('aria-keyshortcuts','ArrowRight');
      previous.title='Previous daily offer · Left arrow';next.title='Next daily offer · Right arrow';
      function entries() {
        return inspectionDay===C.shopState.dayKey()&&session.result.snapshot&&session.result.snapshot.dayKey===inspectionDay&&
          !(session.expired&&!session.expired.hidden)?orderedOffers():[];
      }
      function refreshInspection() {
        if(!nav.isConnected)return;
        var offers=entries(), index=offers.findIndex(function(item){return item.offerId===offer.offerId;});
        var unavailable=index<0||offers.length<2||session.locked||session.retrying;
        previous.disabled=next.disabled=unavailable;
        position.textContent=index<0?'— / —':String(index+1).padStart(2,'0')+' / '+String(offers.length).padStart(2,'0');
      }
      function step(direction,focus) {
        if(active!==session||!nav.isConnected||session.locked||session.retrying)return;
        var offers=entries(),index=offers.findIndex(function(item){return item.offerId===offer.offerId;});
        if(index<0||offers.length<2)return;
        var destination=offers[(index+direction+offers.length)%offers.length], target=C.card(destination.cardId);
        if(!target)return;
        // Cancel now, before a snapshot transition defers destruction of the old view.
        session.holds.forEach(function(control){if(control.confirmation)control.confirmation.cancel();});
        navigate(function(){inspectCard(target,destination,{dayKey:inspectionDay,returnToCompare:returnToCompare,focus:focus});},view.el,{kind:'card',id:target.id});
      }
      session.cleanups.push(C.keys.listen(surface,'keydown','shop.offer-step',function(event){
        if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||
          event.target.closest('input,select,textarea,[contenteditable],[role="slider"],[role="tablist"],[role="listbox"]'))return;
        if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
        event.preventDefault();event.stopPropagation();step(event.key==='ArrowLeft'?-1:1,event.key==='ArrowLeft'?'previous':'next');
      }));
      var turn = button(tools, 'Turn card', function () {
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
      node('p', '', copy, offer.variantId ? C.variant(offer.variantId).name : 'Standard');
      var copies = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length;
      if (copies) node('p', 'shop-detail-owned', copy, copies + ' owned');
      price(copy, offer.price);
      wishlist(copy,card.id);
      session.expired = node('p', 'shop-offer-state', copy, 'This offer is no longer current. Return to the Shop for today’s offers.');
      session.expired.hidden = C.shopState.dayKey() === session.selected.dayKey;
      var actions = node('div', 'shop-actions', copy);
      button(actions, returnToCompare ? 'Back to comparison' : 'Back to shop', function () { navigate(function () {
        if (returnToCompare) {
          comparison(); var art = Array.from(surface.querySelectorAll('.shop-compare-art')).find(function (el) { return el.dataset.cardId === card.id; });
          if (art) art.focus(); return;
        }
        renderShop(); var tile = Array.from(surface.querySelectorAll('.shop-offer')).find(function (el) { return el.querySelector('h3') && el.querySelector('h3').textContent === card.name; });
        var target = tile && tile.querySelector('.shop-inspect'); if (target) target.focus();
      }, view.el, { kind: 'card', id: card.id }); }, 'shop-back');
      var control = hold(actions, card.name, offer.price, 'card', offer);
      if (!session.expired.hidden) { control.disabled = true; control.title = 'Offer expired'; }
      var specifications=node('details','shop-inspection-specs',copy);specifications.open=!!session.inspectionSpecsOpen;
      node('summary','',specifications,'Specifications');
      var specs=node('dl','shop-specs',specifications);
      C.cardSpecs.frontRows(card).forEach(function(row){
        var line=node('div','',specs);node('dt','',line,row.label);node('dd','',line,row.value);
      });
      specifications.addEventListener('toggle',function(){if(specifications.isConnected)session.inspectionSpecsOpen=specifications.open;});
      session.refreshInspection=refreshInspection;refreshInspection();
      footer(scroll);
      (context.focus?(context.focus==='previous'?previous:next):actions.querySelector('button')).focus({preventScroll:true});
      if(context.focus)announce(card.name+'. Offer '+position.textContent.replace(' / ',' of ')+'.');
    }
    session.renderShop = renderShop;
    renderShop();
    session.presentation = C.ui.present(surface, { anchor: origin, onClose: function () {
      if (active !== session) return;
      if (session.transition) session.transition.skipTransition();
      root.clearInterval(session.ticker); if (session.offSave) session.offSave();
      if (session.offReplace) session.offReplace();
      if (session.offFrame) session.offFrame();
      if (session.offMotion) session.offMotion();
      if (session.offSettings) session.offSettings();
      if (session.offSaveError) session.offSaveError();
      if (session.offBackupError) session.offBackupError();
      if (session.offBackupRecovered) session.offBackupRecovered();
      if (session.offWishlists) session.offWishlists();
      root.document.removeEventListener('visibilitychange', sync);
      root.removeEventListener('focus', sync);
      root.removeEventListener('blur', cancelledHold);
      root.document.removeEventListener('pointercancel', cancelledHold);
      root.document.removeEventListener('pointerup', cancelledHold);
      clearContent(); active = null;
      C.packView.setVisible(packWasVisible);
    }});
    refreshControls();
    function sync() {
      surface.dataset.shopHidden = root.document.hidden ? 'true' : 'false';
      if (root.document.hidden && session.transition) session.transition.skipTransition();
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
            } else if (session.selected === 'compare') { comparison(); announce('Daily offers refreshed.'); }
            else if (session.selected !== 'pack' && session.expired) {
              session.expired.hidden = key === session.selected.dayKey && !!(next.snapshot && next.snapshot.offers.some(function (offer) { return offer.offerId === session.selected.offerId; }));
              var selectedHold = surface.querySelector('.shop-detail .shop-hold');
              if (selectedHold) selectedHold.disabled = !session.expired.hidden;
            }
          }
        }
        if (session.countdown) session.countdown.textContent = countdown();
        if (session.refreshBalance) session.refreshBalance();
        if (session.refreshHistory) session.refreshHistory();
        if (session.refreshComparison) session.refreshComparison();
        refreshControls();
      } finally { session.syncing = false; }
    }
    root.document.addEventListener('visibilitychange', sync);
    root.addEventListener('focus', sync);
    function cancelledHold() {
      root.queueMicrotask(function () { if (active === session && !session.locked) refreshControls(); });
    }
    root.addEventListener('blur', cancelledHold);
    root.document.addEventListener('pointercancel', cancelledHold);
    root.document.addEventListener('pointerup', cancelledHold);
    session.offSave = C.events.on('save:written', sync);
    session.offMotion = C.events.on('motion:changed', motionPolicy);
    session.offSettings = C.events.on('settings:changed', function (event) {
      motionPolicy();
      if (event.key === 'shopCompareDifferences' && session.refreshComparison) session.refreshComparison();
      if(event.key==='shopWishlistMarkers'){refreshWishlists();var markers=surface.querySelector('.shop-marker-toggle');if(markers)markers.checked=C.settings.get('shopWishlistMarkers');}
      if (!/^shop(Layout|Motion|Sort)$/.test(event.key)) return;
      session.holds.forEach(function (control) { if (control.confirmation) control.confirmation.cancel(); });
      surface.querySelectorAll('.shop-options .shop-option-select[data-setting]').forEach(function (select) { select.value = C.settings.getRequested(select.dataset.setting); });
      arrangeOffers(); refreshControls();
    });
    session.offSaveError = C.events.on('save:error', refreshControls);
    session.offBackupError = C.events.on('desktop:storageError', refreshControls);
    session.offBackupRecovered = C.events.on('desktop:storageRecovered', refreshControls);
    session.offWishlists=C.events.on('inventory:collectionsChanged',function(){refreshWishlists();arrangeOffers();});
    session.offReplace = C.events.on('save:replaced', function () {
      session.navigation = (session.navigation || 0) + 1;
      if (session.transition) session.transition.skipTransition();
      session.transitionTarget = null;
      session.result = C.shopState.ensure();
      if (!session.selected) session.renderShop();
      else if (session.selected === 'history') history();
      else if (session.selected === 'compare') comparison();
      else if (session.selected === 'save-status') saveStatus();
      else if (session.selected === 'receipt') { session.locked = false; session.renderShop(true); }
      else if (session.selected === 'pack') inspectPack();
      else if (session.selected !== 'pack' && session.expired) {
        session.expired.hidden = false;
        var selectedHold = surface.querySelector('.shop-detail .shop-hold');
        if (selectedHold) selectedHold.disabled = true;
        if(session.refreshInspection)session.refreshInspection();
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
