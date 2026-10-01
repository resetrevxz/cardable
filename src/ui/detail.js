(function (C, root) {
  'use strict';
  var cfg, overlay, mount, panel, closeButton, flipButton, serialText, previous, next, positionLabel;
  var payload = null, view = null, visual = null, serialIndex = 0, side = 'front', phase = 'closed', spring, from, to;
  var shineAge = 0, drag = null, dragSpring, panelOpacity = 0, swapping = null, fadeMs, returnPanelFrom = 1, returnBackdropFrom = 1;
  var node = C.packMarkup.node;
  var preferencesActive = false, scrollPositions = new Map();
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function prevent(event) { if (event.preventDefault) event.preventDefault(); }
  function focus(el) { if (el && el.focus) el.focus({ preventScroll: true }); }
  function icon(button, pathData) {
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', pathData); svg.appendChild(path); button.appendChild(svg);
  }
  function detailRect() {
    var margin = cfg.safeMarginPx, width = root.innerWidth, height = root.innerHeight;
    var stacked = width < cfg.detailStackWidthPx;
    var cardHeight = Math.min(height * cfg.detailHeightVh / 100, height - margin * 2, (width - margin * 2) * 7 / 5);
    if (stacked) cardHeight = Math.min(cardHeight, height * cfg.detailStackHeightVh / 100);
    var cardWidth = cardHeight * 5 / 7, groupWidth = cardWidth + (stacked ? 0 : cfg.detailGapPx + cfg.detailInfoWidthPx);
    var rect = { left: (width - groupWidth) / 2, top: stacked ? margin : (height - cardHeight) / 2, width: cardWidth, height: cardHeight };
    panel.style.width = (stacked ? Math.min(cfg.detailInfoWidthPx, width - margin * 2) : cfg.detailInfoWidthPx) + 'px';
    panel.style.left = (stacked ? (width - Math.min(cfg.detailInfoWidthPx, width - margin * 2)) / 2 : rect.left + cardWidth + cfg.detailGapPx) + 'px';
    panel.style.top = (stacked ? rect.top + cardHeight + cfg.detailGapPx / 2 : rect.top) + 'px';
    panel.style.maxHeight = Math.max(margin, height - parseFloat(panel.style.top) - margin) + 'px';
    return rect;
  }
  function pose(rect, opacity) {
    var fixed = phase === 'returning' ? from : to;
    mount.style.width = (C.motion.reduced ? fixed.width : to.width) + 'px';
    mount.style.transform = C.motion.reduced ? 'translate3d(' + fixed.left + 'px,' + fixed.top + 'px,0)' :
      'translate3d(' + rect.left + 'px,' + (rect.top + dragSpring.value) + 'px,0) scale(' + rect.width / to.width + ')';
    mount.style.opacity = opacity;
  }
  function currentRect() {
    var p = clamp(spring.value, 0, 1);
    return { left: from.left + (to.left - from.left) * p, top: from.top + (to.top - from.top) * p,
      width: from.width + (to.width - from.width) * p, height: from.height + (to.height - from.height) * p };
  }
  function fillPanel() {
    while (panel.children.length) panel.children[0].remove();
    var entry = payload.entry, generation = entry.generation;
    node('p', 'detail-kicker', panel, generation ? generation.name : entry.card.generation);
    node('h1', 'detail-name', panel, entry.owned ? entry.card.name : '???');
    if (entry.owned) {
      var tier = node('div', 'detail-tier', panel); node('span', 'detail-badge', tier, entry.rarity.code);
      var meter = node('div', 'detail-meter', tier); meter.setAttribute('aria-label', 'Tier ' + entry.rarity.tier + ' of 12');
      for (var i = 0; i < C.config.cardView.meterSegments; i++) { var tick = node('i', '', meter); tick.dataset.filled = i <= entry.rarity.tier; }
      node('p', 'detail-vram', panel, C.cardSpecs.vram(entry.card) + ' ' + entry.card.vram.type);
      var specs = node('dl', 'detail-specs', panel);
      C.cardSpecs.rows(entry.card).forEach(function (row) { var item = node('div', '', specs); node('dt', '', item, row.label); node('dd', '', item, row.value); });
    }
    var description = entry.owned ? view && view.description || entry.rarity.description : view && view.description || '';
    if (description) node('p', 'detail-description', panel, description);
    if (entry.owned) {
      node('p', 'detail-quantity', panel, entry.instances.length + (entry.instances.length === 1 ? ' copy owned' : ' copies owned'));
      var acquired = Math.max.apply(null, entry.instances.map(function (i) { return i.pulledAt; }));
      node('p', 'detail-acquired', panel, 'Latest acquisition · ' + new Date(acquired).toLocaleDateString());
    }
    var actions = node('div', 'detail-actions', panel);
    C.inventoryIcons.button('back', 'Previous card', function () { navigate(-1); }, actions);
    C.inventoryIcons.button('next', 'Next card', function () { navigate(1); }, actions);
    if (entry.owned && !payload.preview) {
      var favorite = C.inventoryIcons.button('favorite', 'Favorite card', function () {
        C.inventoryModel.favorite(payload.entry.card.id);
        favorite.setAttribute('aria-pressed', C.inventoryModel.current.favorites.indexOf(payload.entry.card.id) >= 0);
      }, actions);
      favorite.setAttribute('aria-pressed', C.inventoryModel.current.favorites.indexOf(entry.card.id) >= 0);
      var collections = C.inventoryIcons.button('collection', 'Add to collection', function () { C.events.emit('inventory:detailMembership', { entry: payload.entry, anchor: collections }); }, actions);
    }
    var browser = node('div', 'detail-serial-browser', panel); browser.hidden = !entry.owned;
    previous = node('button', 'detail-serial-arrow', browser); previous.setAttribute('type', 'button'); previous.setAttribute('aria-label', 'Previous serial'); icon(previous, 'M14 6l-6 6 6 6');
    var serial = node('div', 'detail-serial-values', browser); serialText = node('div', 'detail-serial', serial); serialText.setAttribute('role', 'status');
    positionLabel = node('div', 'detail-serial-position', serial);
    next = node('button', 'detail-serial-arrow', browser); next.setAttribute('type', 'button'); next.setAttribute('aria-label', 'Next serial'); icon(next, 'M10 6l6 6-6 6');
    previous.addEventListener('click', function () { browse(-1); }); next.addEventListener('click', function () { browse(1); });
    flipButton = node('button', 'detail-flip glass', panel); flipButton.setAttribute('type', 'button'); flipButton.setAttribute('aria-label', 'Flip card'); flipButton.setAttribute('aria-pressed', 'false'); flipButton.hidden = !entry.owned; icon(flipButton, 'M19 10a7 7 0 1 0-1 7M19 5v5h-5');
    flipButton.addEventListener('click', flip);
    syncSerial(); panel.scrollTop = scrollPositions.get(entry.card.id) || 0;
  }
  function syncSerial() {
    var instances = payload.entry.instances;
    serialText.textContent = instances.length ? instances[serialIndex].serial : '';
    positionLabel.textContent = instances.length > 1 ? (serialIndex + 1) + ' / ' + instances.length : '';
    previous.disabled = serialIndex === 0; next.disabled = serialIndex >= instances.length - 1;
    previous.hidden = next.hidden = instances.length < 2;
  }
  function open(event) {
    if (phase !== 'closed') return;
    payload = event; view = event.view; visual = event.visual; serialIndex = 0; side = 'front';
    overlay.hidden = false; overlay.inert = false; panelOpacity = 0; panel.style.opacity = 0;
    C.accessibility.trap(overlay);
    overlay.style.setProperty('--detail-dim', 0); root.document.body.style.setProperty('--detail-focus', 0);
    mount.appendChild(visual); from = event.sourceRect; to = detailRect(); spring.reset(0); dragSpring.reset(0);
    phase = 'lifting'; shineAge = 0; fillPanel(); pose(from, C.motion.reduced ? 0 : 1);
    if (view) { view.setVisible(true); view.setFace('front'); view.setMode('full'); }
    root.document.body.classList.add('inventory-detail-active'); C.events.emit('inventory:detailContext', { active: true });
    focus(closeButton); C.fx.wake();
  }
  function flip() {
    if (phase !== 'detail' || !view || !payload.entry.owned) return;
    if (!view.flip()) return; side = view.side; flipButton.setAttribute('aria-pressed', side === 'back'); C.fx.wake();
  }
  function browse(delta) {
    if (phase !== 'detail' || !payload.entry.owned || swapping) return;
    var index = clamp(serialIndex + delta, 0, payload.entry.instances.length - 1); if (index === serialIndex) return;
    serialIndex = index;
    var old = view; old.setMode('lite'); old.setShine(0);
    view = C.cardView.create(payload.entry.card, payload.entry.instances[index], { owned: true, autoFocus: false, keyboardFlip: false, autoStamp: false, shine: true });
    view.el.setAttribute('tabindex', '-1'); view.el.setAttribute('role', 'img'); view.el.setAttribute('aria-label', payload.entry.card.name);
    visual = view.el; visual.style.opacity = 0; mount.appendChild(visual); view.setFace(side); view.setMode('full');
    swapping = { old: old, age: 0 }; shineAge = 0; syncSerial(); C.fx.wake();
  }
  function navigate(delta) {
    if (phase !== 'detail' || swapping) return;
    var request = { delta: delta }; C.events.emit('inventory:detailNavigate', request);
    if (!request.entry) return;
    scrollPositions.set(payload.entry.card.id, panel.scrollTop || 0);
    var old = view; if (old) old.destroy(); else if (visual) visual.remove();
    payload.entry = request.entry; payload.preview = request.preview; serialIndex = 0; side = 'front';
    var entry = payload.entry;
    if (entry.owned || entry.rarity.finish === 'secret') {
      view = C.cardView.create(entry.card, entry.instances[0] || { instanceId: 'unknown-' + entry.card.id, cardId: entry.card.id, serial: '', seen: true }, { owned: entry.owned, autoFocus: false, keyboardFlip: false, autoStamp: false, shine: true });
      visual = view.el; view.setMode('full');
    } else {
      var tile = C.inventoryTiles.create(entry, 0, { activate: function () {}, context: function () {} });
      view = null; visual = tile.visual; tile.el.remove();
    }
    visual.setAttribute('tabindex', '-1'); mount.appendChild(visual); shineAge = 0; fillPanel(); C.fx.wake();
  }
  function releaseDrag(event, cancelled) {
    if (!drag || event && event.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (mount.hasPointerCapture(d.id)) mount.releasePointerCapture(d.id);
    var velocity = d.velocity * Math.exp(-(root.performance.now() - d.at) / cfg.flickDecayMs);
    if (d.moved && !cancelled && (d.distance > to.height * cfg.detailClosePortion || velocity > cfg.detailFlickPxPerSecond)) close();
    else { dragSpring.target = 0; C.fx.wake(); }
  }
  function close() {
    if (phase === 'closed' || phase === 'returning') return;
    scrollPositions.set(payload.entry.card.id, panel.scrollTop || 0);
    releaseDrag(null, true); if (C.inventory.toolbar) C.inventory.toolbar.close();
    var target = { cardId: payload.entry.card.id, rect: null }; C.events.emit('inventory:returnTarget', target);
    returnPanelFrom = panelOpacity; returnBackdropFrom = clamp(spring.value, 0, 1);
    from = currentRect(); from.top += dragSpring.value; to = target.rect || payload.sourceRect;
    spring.reset(0); dragSpring.reset(0); phase = 'returning';
    if (view) { view.setMode('lite'); view.setShine(0); }
    if (swapping) { swapping.old.destroy(); swapping = null; visual.style.opacity = 1; }
    C.fx.wake();
  }
  function finish() {
    var result = { cardId: payload.entry.card.id, view: view, visual: visual };
    if (view) view.setFace('front');
    phase = 'closed'; overlay.hidden = true; overlay.inert = true; root.document.body.classList.remove('inventory-detail-active');
    C.accessibility.release(overlay);
    C.events.emit('inventory:detailReturned', result); C.events.emit('inventory:detailContext', { active: false });
    payload = null; view = null; visual = null;
  }
  function reset() {
    scrollPositions.clear();
    if (phase === 'closed') return;
    releaseDrag(null, true); if (swapping) swapping.old.destroy(); swapping = null;
    if (view) view.destroy(); else if (visual) visual.remove();
    phase = 'closed'; payload = null; view = null; visual = null; overlay.hidden = true; overlay.inert = true;
    root.document.body.classList.remove('inventory-detail-active'); C.events.emit('inventory:detailContext', { active: false });
    C.accessibility.release(overlay);
  }
  function update(now, dt) {
    if (phase === 'closed') return false;
    if (phase === 'detail' && spring.value === 1 && !drag && dragSpring.settled() && !swapping && shineAge >= cfg.detailShineMs) return false;
    if (C.motion.reduced) { spring.target = 1; spring.velocity = 0; if (1 - spring.value <= dt / fadeMs) spring.reset(1); else spring.value += dt / fadeMs; }
    else spring.step(dt, 1);
    if (!drag) dragSpring.step(dt, 0);
    var p = clamp(spring.value, 0, 1), returning = phase === 'returning';
    var rect = currentRect(); pose(rect, C.motion.reduced ? returning ? Math.pow(1 - p, 3) : 1 - Math.pow(1 - p, 3) : 1);
    var dim = returning ? returnBackdropFrom * (1 - p) : p;
    overlay.style.setProperty('--detail-dim', dim); root.document.body.style.setProperty('--detail-focus', dim);
    panelOpacity = returning ? returnPanelFrom * (1 - p) : p; panel.style.opacity = panelOpacity; closeButton.style.opacity = panelOpacity;
    if (phase === 'lifting' && spring.settled()) { phase = 'detail'; C.events.emit('detail:opened', payload.entry.card.id); }
    if (returning && spring.settled()) { finish(); return false; }
    if (!returning && shineAge < cfg.detailShineMs) { shineAge += dt; if (view) view.setShine(Math.min(1, shineAge / cfg.detailShineMs)); }
    if (swapping) {
      swapping.age += dt; var blend = Math.min(1, swapping.age / C.config.cardView.crossfadeMs); visual.style.opacity = blend; swapping.old.el.style.opacity = 1 - blend;
      if (blend === 1) { swapping.old.destroy(); swapping = null; }
    }
    return phase !== 'detail' || !!drag || !dragSpring.settled() || !!swapping || shineAge < cfg.detailShineMs;
  }
  C.detail = {
    initialized: false, get phase() { return phase; }, get view() { return view; }, get serialIndex() { return serialIndex; },
    init: function () {
      if (C.detail.initialized) return; C.detail.initialized = true;
      var params = new URLSearchParams(root.location.search); if (params.get(C.config.dev.queryFlag) === '1' && params.get('gallery') === '1') return;
      cfg = C.config.inventoryMotion; spring = C.springs.create(0, cfg.sheetSpring); dragSpring = C.springs.create(0, cfg.sheetSpring);
      fadeMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-sheet'));
      overlay = node('section', 'inventory-detail', root.document.body); overlay.hidden = true; overlay.inert = true; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Card detail');
      mount = node('div', 'detail-card-mount', overlay); panel = node('div', 'detail-info', overlay);
      closeButton = node('button', 'detail-close', overlay); closeButton.setAttribute('type', 'button'); closeButton.setAttribute('aria-label', 'Close card detail'); icon(closeButton, 'M7 7l10 10M17 7L7 17'); closeButton.addEventListener('click', close);
      overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
      mount.addEventListener('pointerdown', function (event) {
        if (phase !== 'detail' || event.button !== 0 || event.isPrimary === false) return;
        drag = { id: event.pointerId, y: event.clientY, lastY: event.clientY, at: root.performance.now(), moved: false, velocity: 0, distance: 0 };
      });
      root.document.addEventListener('pointermove', function (event) {
        if (!drag || event.pointerId !== drag.id) return;
        var dy = event.clientY - drag.y, now = root.performance.now();
        if (Math.abs(dy) > cfg.dragSlopPx && !drag.moved) { drag.moved = true; mount.setPointerCapture(drag.id); }
        if (!drag.moved) return;
        prevent(event); dragSpring.value = C.motion.reduced ? 0 : Math.max(-cfg.rubberBandPx, dy);
        drag.distance = Math.max(0, dy);
        drag.velocity = (event.clientY - drag.lastY) * 1000 / Math.max(C.config.shell.frameMs, now - drag.at); drag.lastY = event.clientY; drag.at = now; C.fx.wake();
      });
      root.document.addEventListener('pointerup', function (event) { releaseDrag(event, false); });
      root.document.addEventListener('pointercancel', function (event) { releaseDrag(event, true); });
      mount.addEventListener('lostpointercapture', function () { releaseDrag(null, true); });
      root.addEventListener('blur', function () { releaseDrag(null, true); });
      C.events.on('fx:visibility', function (visible) { if (!visible) releaseDrag(null, true); });
      root.document.addEventListener('keydown', function (event) {
        if (preferencesActive) return;
        if (phase === 'closed' || event.repeat) return;
        if (event.key === 'Escape') { prevent(event); if (!(C.inventory.toolbar && C.inventory.toolbar.escape())) close(); }
        else if (phase === 'detail' && !(C.inventory.toolbar && C.inventory.toolbar.modal) && !(event.target && event.target.closest && event.target.closest('input,select,textarea')) && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { prevent(event); navigate(event.key === 'ArrowLeft' ? -1 : 1); }
      });
      C.events.on('card:face', function (event) { if (event.view === view) { side = event.side; if (flipButton) flipButton.setAttribute('aria-pressed', side === 'back'); } });
      C.events.on('inventory:detailOpen', open); C.events.on('detail:requestClose', close); C.events.on('detail:reset', reset);
      C.events.on('preferences:context', function (event) { preferencesActive = event.active; });
      C.events.on('motion:changed', function () { if (phase !== 'closed') C.fx.wake(); });
      root.addEventListener('resize', function () { if (phase === 'closed') return; from = currentRect(); if (phase === 'returning') { var target = { cardId: payload.entry.card.id }; C.events.emit('inventory:returnTarget', target); to = target.rect || payload.sourceRect; } else to = detailRect(); spring.reset(0); C.fx.wake(); });
      C.detail.el = overlay; C.detail.mount = mount; C.detail.panel = panel; C.detail.closeButton = closeButton;
      C.fx.subscribe(update, 'detail');
    }
  };
})(window.Cardable, window);
