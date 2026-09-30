(function (C, root) {
  'use strict';
  var cfg, sheet, grip, shelf, header, filters, underline, empty, countLabel, numbers, arrow, arrowHome, previewLabel;
  var session = false, opened = false, openingPhase = 'idle', detailId = null, pendingClose = false, order = 'all', fixture = null;
  var model = { entries: [], owned: 0, total: 0 }, tiles = [], rendered = new Map(), center = 0, hovered = null;
  var sheetSpring, scrollSpring, underlineX, underlineScale, underlineTarget = { x: 0, scale: 1 }, underlineWidth;
  var sheetHeight = 0, tileWidth = 0, pitch = 0, scrollTarget = null, scrollIdle = null, settingScroll = false;
  var drag = null, shelfDrag = null, guardUntil = 0, snapAge = 0, shimmerAge = null, countAge = 0, countFrom = 0, countValue = 0;
  var focusAfterSnap = false, dev = false, lastProfile = null, profile = null, profileButton, controls = [], fadeMs;
  var stats = { updates: 0, mounted: 0, maxMounted: 0, opens: 0, closes: 0, snaps: 0 };
  var windowDirty = true, sheetDirty = true, paintedScroll = null, paintedSheet = null;
  var preferencesActive = false;
  var node = C.packMarkup.node;
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function focus(el) { if (el && el.focus) el.focus({ preventScroll: true }); }
  function prevent(event) { if (event.preventDefault) event.preventDefault(); }
  function source() { return fixture ? fixture.instances : C.state.current.inventory; }
  function context() { C.events.emit('inventory:context', { active: session, open: opened, detail: !!detailId }); }
  function setMenuInert(value) {
    ['wordmark', 'pack-stage', 'currency-counter', 'inventory-affordance'].forEach(function (id) { var el = root.document.getElementById(id); if (el) el.inert = value; });
    if (C.dev.panel) C.dev.panel.inert = value;
  }
  function unmount(tile) {
    if (tile.view) tile.view.destroy(); else if (tile.visual) tile.visual.remove();
    tile.view = null; tile.visual = null; tile.el.classList.add('is-placeholder'); rendered.delete(tile.index);
  }
  function clearTiles() {
    tiles.forEach(unmount); tiles = []; rendered.clear();
    while (shelf.children.length) shelf.children[0].remove();
  }
  function silhouette(entry) {
    var el = node('div', 'inventory-silhouette'); el.setAttribute('aria-hidden', 'true');
    node('span', 'inventory-silhouette-generation', el, entry.generation ? entry.generation.name : entry.card.generation);
    return el;
  }
  function mount(tile) {
    if (tile.visual || detailId === tile.entry.card.id) return;
    var entry = tile.entry;
    var concealed = C.finishes.describe(entry.rarity.finish, entry.card, { owned: false }).concealed;
    if (entry.owned || concealed) {
      var instance = entry.owned ? entry.instances[0] : { instanceId: 'silhouette-' + entry.card.id, cardId: entry.card.id, serial: '', seen: true };
      tile.view = C.cardView.create(entry.card, instance, { owned: entry.owned, autoFocus: false, autoStamp: false, keyboardFlip: false, shine: true });
      tile.visual = tile.view.el; tile.visual.setAttribute('tabindex', '-1'); tile.visual.setAttribute('role', 'img');
      tile.visual.setAttribute('aria-label', entry.owned ? entry.card.name : 'Unknown card');
    } else tile.visual = silhouette(entry);
    tile.card.appendChild(tile.visual); tile.el.classList.remove('is-placeholder'); rendered.set(tile.index, tile);
  }
  function buildTiles() {
    clearTiles(); windowDirty = true;
    model.entries.forEach(function (entry, index) {
      var el = node('div', 'inventory-tile is-placeholder', shelf); el.setAttribute('role', 'option'); el.setAttribute('tabindex', '-1');
      el.setAttribute('id', 'inventory-tile-' + index); el.dataset.cardId = entry.card.id; el.dataset.owned = entry.owned;
      var pose = node('div', 'inventory-tile-pose', el);
      var backs = [node('i', 'inventory-stack-back inventory-stack-back--far', pose), node('i', 'inventory-stack-back', pose)];
      backs.forEach(function (back) { back.setAttribute('aria-hidden', 'true'); });
      var card = node('div', 'inventory-tile-card', pose);
      var count = node('span', 'inventory-stack-count', pose), newDot = node('span', 'inventory-new-dot', pose); newDot.setAttribute('aria-hidden', 'true');
      var tile = { el: el, pose: pose, card: card, count: count, newDot: newDot, backs: backs, entry: entry, index: index, view: null, visual: null };
      el.addEventListener('pointerenter', function () { if (!detailId && opened) { hovered = index; el.classList.add('is-hovered'); windowDirty = true; C.fx.wake(); } });
      el.addEventListener('pointerleave', function () { hovered = null; el.classList.remove('is-hovered'); windowDirty = true; C.fx.wake(); });
      el.addEventListener('click', function () { if (root.performance.now() >= guardUntil) openDetail(index); });
      el.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.repeat) { prevent(event); openDetail(index); } });
      tiles.push(tile);
    });
  }
  function refresh(rebuild) {
    var oldOwned = model.owned;
    var oldId = model.entries[center] && model.entries[center].card.id;
    var next = C.collection.project(fixture ? fixture.cards : C.data.cards, source(), order);
    var same = !rebuild && next.entries.length === model.entries.length && next.entries.every(function (entry, i) { return entry.card.id === model.entries[i].card.id && entry.owned === model.entries[i].owned; });
    model = next;
    if (session && !same) {
      buildTiles(); center = Math.max(0, model.entries.findIndex(function (e) { return e.card.id === oldId; }));
      setScroll(center * pitch); scrollSpring.reset(shelf.scrollLeft); scrollTarget = null;
    }
    tiles.forEach(function (tile, i) {
      tile.entry = model.entries[i]; var entry = tile.entry;
      tile.count.textContent = entry.instances.length > 1 ? 'x' + entry.instances.length : ''; tile.count.hidden = entry.instances.length < 2;
      tile.backs[0].hidden = entry.instances.length < 3; tile.backs[1].hidden = entry.instances.length < 2;
      tile.newDot.hidden = !entry.isNew;
      tile.el.setAttribute('aria-label', (entry.owned ? entry.card.name : 'Unknown card, ' + (entry.generation ? entry.generation.name : entry.card.generation)) +
        (entry.instances.length > 1 ? ', ' + entry.instances.length + ' copies' : '') + (entry.isNew ? ', New' : ''));
    });
    if (oldOwned !== model.owned) { countFrom = countValue; countAge = 0; }
    countLabel.setAttribute('aria-label', model.owned + ' of ' + model.total + ' cards collected');
    empty.hidden = model.owned > 0; empty.textContent = 'Open your first pack.';
    previewLabel.hidden = !fixture; C.fx.wake();
  }
  function resize() {
    windowDirty = true; sheetDirty = true;
    var currentIndex = pitch ? (shelf.scrollLeft || 0) / pitch : center;
    sheetHeight = root.innerHeight * cfg.sheetHeightVh / 100;
    var height = clamp(Math.min(sheetHeight * cfg.tileHeightPortion, sheetHeight - cfg.shelfChromePx), cfg.tileMinHeightPx, cfg.tileMaxHeightPx);
    tileWidth = height * 5 / 7; pitch = tileWidth + cfg.tileGapPx;
    sheet.style.height = sheetHeight + 'px'; sheet.style.setProperty('--inventory-tile-width', tileWidth + 'px');
    sheet.style.setProperty('--inventory-tile-height', height + 'px'); sheet.style.setProperty('--inventory-tile-gap', cfg.tileGapPx + 'px');
    setScroll(currentIndex * pitch); scrollSpring.reset(shelf.scrollLeft || 0); scrollTarget = null;
    setUnderline(); C.fx.wake();
  }
  function setUnderline() {
    var selected = controls.find(function (button) { return button.dataset.order === order; });
    if (!selected) return;
    var parent = filters.getBoundingClientRect(), rect = selected.getBoundingClientRect();
    if (!underlineWidth) { underlineWidth = rect.width || 1; underline.style.width = underlineWidth + 'px'; }
    underlineTarget = { x: rect.left - parent.left, scale: rect.width / underlineWidth };
    underlineX.target = underlineTarget.x; underlineScale.target = underlineTarget.scale;
  }
  function beginSession() {
    if (session) return;
    session = true; sheet.hidden = false; sheet.inert = false; sheetSpring.reset(0); countValue = 0; countFrom = 0; countAge = 0;
    C.accessibility.trap(sheet);
    shimmerAge = 0; arrowHome.inert = false; grip.appendChild(arrow); arrow.classList.add('is-sheet-arrow');
    root.document.body.classList.add('inventory-depth-active'); setMenuInert(true);
    C.events.emit('menu:visibilityHold', { reason: 'inventory', active: true }); context(); refresh(true); resize();
  }
  function finishSession() {
    if (!session) return;
    if (profile) { profile = null; lastProfile = { valid: false }; profileButton.textContent = 'Sample cancelled · retry'; }
    session = false; opened = false; hovered = null; sheet.hidden = true; sheet.inert = true; clearTiles();
    C.accessibility.release(sheet);
    arrowHome.appendChild(arrow); arrow.classList.remove('is-sheet-arrow');
    root.document.body.classList.remove('inventory-depth-active'); setMenuInert(false);
    C.events.emit('menu:visibilityHold', { reason: 'inventory', active: false }); C.events.emit('menu:activity'); context();
    focus(arrow);
  }
  function request(value) {
    if (openingPhase !== 'idle' || root.document.hidden) return;
    var next = typeof value === 'boolean' ? value : !opened;
    if (detailId && !next) { pendingClose = true; C.events.emit('detail:requestClose'); return; }
    if (!session && !next) return;
    if (next) beginSession();
    windowDirty = true; sheetDirty = true;
    if (opened !== next) {
      opened = next; stats[next ? 'opens' : 'closes'] += 1;
      C.events.emit(next ? 'inventory:open' : 'inventory:close');
    }
    sheetSpring.target = next ? 1 : 0; context(); C.fx.wake();
    if (next && C.input.modality === 'keyboard') focus(shelf);
  }
  function rubber(value) {
    if (C.motion.reduced) return clamp(value, 0, 1);
    var edge = value < 0 ? 0 : 1, over = (value - edge) * sheetHeight;
    if (value >= 0 && value <= 1) return value;
    return edge + Math.sign(over) * cfg.rubberBandPx * (1 - 1 / (1 + Math.abs(over) / cfg.rubberBandPx)) / sheetHeight;
  }
  function startSheetDrag(event, capture) {
    if (openingPhase !== 'idle' || detailId || event.button !== 0 || event.isPrimary === false) return;
    beginSession(); drag = { id: event.pointerId, capture: capture, y: event.clientY, value: sheetSpring.value, lastY: event.clientY, at: root.performance.now(), moved: false };
    capture.setPointerCapture(event.pointerId); C.fx.wake();
    sheet.style.setProperty('--sheet-edge-alpha', C.config.polish.sheetDragHighlight);
  }
  function moveSheet(event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dy = event.clientY - drag.y, now = root.performance.now();
    if (Math.abs(dy) > cfg.dragSlopPx) drag.moved = true;
    if (!drag.moved) return;
    prevent(event); sheetSpring.value = rubber(drag.value - dy / sheetHeight);
    sheetSpring.velocity = -clamp((event.clientY - drag.lastY) * 1000 / Math.max(C.config.shell.frameMs, now - drag.at), -cfg.maxFlickPxPerSecond, cfg.maxFlickPxPerSecond) / sheetHeight;
    drag.lastY = event.clientY; drag.at = now; C.fx.wake();
  }
  function releaseSheet(event, cancel) {
    if (!drag || event && event.pointerId !== drag.id) return;
    var current = drag; drag = null;
    sheet.style.setProperty('--sheet-edge-alpha', C.config.polish.sheetRestHighlight);
    if (current.capture.hasPointerCapture(current.id)) current.capture.releasePointerCapture(current.id);
    if (current.moved) {
      guardUntil = root.performance.now() + cfg.dragClickGuardMs;
      sheetSpring.velocity *= Math.exp(-(root.performance.now() - current.at) / cfg.flickDecayMs);
      var projected = sheetSpring.value + (C.motion.reduced || cancel ? 0 : sheetSpring.velocity * cfg.flickProjectionMs / 1000);
      request(cancel ? opened : projected >= cfg.closeThreshold);
    } else if (!opened) { sheetSpring.target = 0; C.fx.wake(); }
  }
  function setScroll(value) {
    settingScroll = true; shelf.scrollLeft = clamp(value, 0, Math.max(0, (model.entries.length - 1) * pitch)); settingScroll = false; windowDirty = true;
  }
  function snapTo(index, velocity) {
    index = clamp(index, 0, Math.max(0, model.entries.length - 1)); scrollTarget = index * pitch;
    scrollSpring.reset(shelf.scrollLeft || 0); scrollSpring.velocity = C.motion.reduced ? 0 : velocity || 0;
    scrollIdle = null; shelf.style.scrollSnapType = 'none'; C.fx.wake();
  }
  function startShelfDrag(event) {
    if (!opened || detailId || event.button !== 0 || event.isPrimary === false) return;
    shelfDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: shelf.scrollLeft || 0, lastX: event.clientX, at: root.performance.now(), velocity: 0, moved: false };
  }
  function moveShelf(event) {
    if (!shelfDrag || event.pointerId !== shelfDrag.id) return;
    var d = shelfDrag, dx = event.clientX - d.x, now = root.performance.now();
    if (!d.moved && Math.abs(dx) > cfg.dragSlopPx && Math.abs(dx) > Math.abs(event.clientY - d.y)) { d.moved = true; shelf.setPointerCapture(d.id); shelf.classList.add('is-dragging'); }
    if (!d.moved) return;
    prevent(event); shelf.style.scrollSnapType = 'none'; setScroll(d.left - dx); scrollTarget = null; scrollIdle = null;
    d.velocity = clamp(-(event.clientX - d.lastX) * 1000 / Math.max(C.config.shell.frameMs, now - d.at), -cfg.maxFlickPxPerSecond, cfg.maxFlickPxPerSecond);
    d.lastX = event.clientX; d.at = now; C.fx.wake();
  }
  function releaseShelf(event, cancel) {
    if (!shelfDrag || event && event.pointerId !== shelfDrag.id) return;
    var d = shelfDrag; shelfDrag = null; shelf.classList.remove('is-dragging');
    if (shelf.hasPointerCapture(d.id)) shelf.releasePointerCapture(d.id);
    if (d.moved) {
      guardUntil = root.performance.now() + cfg.dragClickGuardMs;
      var velocity = C.motion.reduced || cancel ? 0 : d.velocity * Math.exp(-(root.performance.now() - d.at) / cfg.flickDecayMs);
      snapTo(Math.round(((shelf.scrollLeft || 0) + velocity * cfg.flickProjectionMs / 1000) / pitch), velocity);
    }
  }
  function renderWindow(dt) {
    windowDirty = false; paintedScroll = shelf.scrollLeft || 0;
    var position = (shelf.scrollLeft || 0) / pitch, next = clamp(Math.round(position), 0, Math.max(0, tiles.length - 1));
    if (next !== center) { center = next; snapAge = 0; stats.snaps += 1; C.events.emit('inventory:centered', model.entries[center]); }
    snapAge += dt;
    var min = Math.max(0, center - cfg.overscan), max = Math.min(tiles.length - 1, center + cfg.overscan);
    rendered.forEach(function (tile, index) { if (index < min || index > max) { if (hovered === index) hovered = null; unmount(tile); } });
    for (var i = min; i <= max; i++) {
      var tile = tiles[i]; mount(tile);
      var distance = i - position, weight = Math.min(1, Math.abs(distance));
      var pulse = i === center && snapAge < cfg.centerPulseMs && !C.motion.reduced ? Math.sin(snapAge / cfg.centerPulseMs * Math.PI) * cfg.centerPulseScale : 0;
      tile.pose.style.transform = 'translateY(' + (!C.motion.reduced && hovered === i ? -cfg.hoverLiftPx : 0) + 'px) rotateY(' + (C.motion.reduced ? 0 : -Math.sign(distance) * weight * cfg.sideTurnDegrees) + 'deg) scale(' + (1 - (1 - cfg.sideScale) * weight + pulse) + ')';
      tile.pose.style.opacity = 1 - (1 - cfg.sideOpacity) * weight;
      tile.card.style.setProperty('--reflection-alpha', (1 - weight) * 0.1);
      tile.el.classList.toggle('is-centered', i === center); tile.el.setAttribute('aria-selected', i === center); tile.el.setAttribute('tabindex', i === center ? '0' : '-1');
      if (tile.view) {
        var visible = Math.abs(distance) * pitch <= root.innerWidth / 2 + tileWidth / 2;
        if (tile.view.visible !== visible) tile.view.setVisible(visible);
      }
    }
    stats.mounted = rendered.size; stats.maxMounted = Math.max(stats.maxMounted, rendered.size);
    shelf.setAttribute('aria-activedescendant', 'inventory-tile-' + center);
    var selected = tiles[hovered === null ? center : hovered];
    if (!detailId) {
      rendered.forEach(function (tile) { if (tile.view && (!opened || tile !== selected) && tile.view.mode !== 'lite') tile.view.setMode('lite'); });
      if (opened && selected && selected.view && selected.view.visible && C.cardView.active !== selected.view) selected.view.setMode('full');
    }
    if (focusAfterSnap && scrollTarget === null) { focusAfterSnap = false; if (tiles[center]) focus(tiles[center].el); }
    var selectedEntry = model.entries[center];
    C.inventory.groupLabel.textContent = !selectedEntry || order === 'all' ? '' : order === 'generation' ? selectedEntry.generation.name : selectedEntry.rarity.name;
  }
  function openDetail(index) {
    if (!opened || detailId || drag || shelfDrag && shelfDrag.moved || root.document.hidden) return;
    var tile = tiles[index]; if (!tile) return; mount(tile);
    detailId = tile.entry.card.id; hovered = null; pendingClose = false;
    shelf.inert = true; filters.inert = true; grip.inert = true;
    var payload = { entry: tile.entry, visual: tile.visual, view: tile.view, sourceRect: tile.card.getBoundingClientRect(), preview: !!fixture };
    tile.view = null; tile.visual = null; tile.card.style.visibility = 'hidden'; rendered.delete(index);
    rendered.forEach(function (item) { if (item.view) item.view.setMode('lite'); });
    C.events.emit('inventory:detailOpen', payload); context();
    windowDirty = true;
    if (tile.entry.owned && C.collection.markSeen(detailId, source())) { if (!fixture) C.state.save(); else refresh(false); }
  }
  function detailReturned(event) {
    windowDirty = true;
    var tile = tiles.find(function (item) { return item.entry.card.id === event.cardId; });
    detailId = null; shelf.inert = false; filters.inert = false; grip.inert = false;
    if (tile && session) {
      tile.card.style.visibility = ''; tile.card.appendChild(event.visual); tile.visual = event.visual; tile.view = event.view;
      tile.el.classList.remove('is-placeholder'); rendered.set(tile.index, tile); focus(tile.el);
    } else { if (event.view) event.view.destroy(); else event.visual.remove(); }
    context(); C.fx.wake();
    if (pendingClose) { pendingClose = false; request(false); }
  }
  function update(now, dt) {
    if (!session) return false;
    var fraction = Math.min(1, countAge / cfg.countMs);
    var underlineMoving = !underlineX.settled() || !underlineScale.settled();
    if (!profile && !drag && !shelfDrag && sheetSpring.settled() && !sheetDirty && !windowDirty && paintedScroll === (shelf.scrollLeft || 0) &&
        scrollTarget === null && scrollIdle === null && fraction === 1 && shimmerAge === null && snapAge >= cfg.centerPulseMs && !underlineMoving) return false;
    stats.updates += 1;
    if (!drag) {
      if (C.motion.reduced) {
        var goal = opened ? 1 : 0, delta = goal - sheetSpring.value;
        sheetSpring.target = goal; sheetSpring.velocity = 0;
        if (Math.abs(delta) <= dt / fadeMs) sheetSpring.reset(goal);
        else sheetSpring.value += Math.sign(delta) * dt / fadeMs;
      }
      else sheetSpring.step(dt, opened ? 1 : 0);
    }
    var p = clamp(sheetSpring.value, 0, 1);
    if (sheetDirty || paintedSheet !== sheetSpring.value) {
      paintedSheet = sheetSpring.value; sheetDirty = false;
      sheet.style.transform = C.motion.reduced ? 'none' : 'translate3d(0,' + (1 - sheetSpring.value) * sheetHeight + 'px,0)';
      sheet.style.opacity = C.motion.reduced ? opened ? 1 - Math.pow(1 - p, 3) : Math.pow(p, 3) : 1;
      root.document.body.style.setProperty('--inventory-menu-scale', C.motion.reduced ? 1 : 1 - (1 - cfg.menuScale) * p);
      root.document.body.style.setProperty('--inventory-menu-blur', (C.motion.reduced ? 0 : cfg.menuBlurPx * p) + 'px');
      root.document.body.style.setProperty('--inventory-menu-opacity', 1 - cfg.menuDim * p);
    }
    if (!opened && !drag && sheetSpring.settled()) { finishSession(); return false; }
    if (scrollIdle !== null) { scrollIdle += dt; if (scrollIdle >= cfg.wheelSnapMs) snapTo(Math.round((shelf.scrollLeft || 0) / pitch)); }
    if (scrollTarget !== null && !shelfDrag) {
      if (C.motion.reduced) { scrollSpring.reset(scrollTarget); setScroll(scrollTarget); }
      else setScroll(scrollSpring.step(dt, scrollTarget));
      if (scrollSpring.settled()) { setScroll(scrollTarget); scrollTarget = null; shelf.style.scrollSnapType = ''; }
    }
    if (windowDirty || paintedScroll !== (shelf.scrollLeft || 0) || snapAge < cfg.centerPulseMs) renderWindow(dt);
    if (fraction < 1) {
      countAge += dt; fraction = Math.min(1, countAge / cfg.countMs); var eased = 1 - Math.pow(1 - fraction, 3);
      countValue = countFrom + (model.owned - countFrom) * eased; numbers.set(Math.round(countValue) + ' / ' + model.total, false);
      sheet.style.setProperty('--inventory-progress', model.total ? countValue / model.total : 0);
      sheet.style.setProperty('--inventory-progress-wave', C.motion.reduced || fraction === 1 ? '0px' : Math.sin(countAge / C.config.menuMotion.fluidWaveMs * Math.PI * 2) * C.config.menuMotion.fluidWavePx + 'px');
    }
    if (shimmerAge !== null) {
      shimmerAge += dt; var shimmer = Math.min(1, shimmerAge / cfg.shimmerMs);
      sheet.style.setProperty('--inventory-shimmer', C.motion.reduced ? 0 : Math.sin(shimmer * Math.PI));
      sheet.style.setProperty('--inventory-shimmer-x', (-1 + 2 * shimmer) * 100 + '%');
      if (shimmer === 1 || C.motion.reduced) shimmerAge = null;
    }
    if (underlineMoving) {
      if (C.motion.reduced) { underlineX.reset(underlineTarget.x); underlineScale.reset(underlineTarget.scale); }
      else { underlineX.step(dt, underlineTarget.x); underlineScale.step(dt, underlineTarget.scale); }
      underline.style.transform = 'translateX(' + underlineX.value + 'px) scaleX(' + underlineScale.value + ')';
    }
    return !!profile || !!drag || !!shelfDrag || !sheetSpring.settled() || scrollTarget !== null || scrollIdle !== null || fraction < 1 || shimmerAge !== null ||
      snapAge < cfg.centerPulseMs || !underlineX.settled() || !underlineScale.settled();
  }
  function reset() {
    C.events.emit('detail:reset'); detailId = null; pendingClose = false; releaseSheet(null, true); releaseShelf(null, true);
    fixture = null; if (session) finishSession(); refresh(true);
  }
  function measure() {
    if (!session || !opened || detailId || C.motion.reduced || root.document.hidden || !C.cardView.active || !C.cardView.active.visible) return;
    C.profiler.start('inventory · ' + model.total + ' tiles');
    profile = { elapsed: 0, stamps: [], view: C.cardView.active, invalid: false }; lastProfile = null; profileButton.textContent = 'Measuring…'; C.fx.wake();
  }
  C.inventory = {
    initialized: false, stats: stats,
    get open() { return opened; }, get active() { return session; }, get progress() { return sheetSpring ? sheetSpring.value : 0; },
    get entries() { return model.entries; }, get rendered() { return rendered; }, get center() { return center; }, get order() { return order; },
    get preview() { return !!fixture; }, get lastProfile() { return lastProfile; },
    init: function () {
      if (C.inventory.initialized) return; C.inventory.initialized = true;
      var params = new URLSearchParams(root.location.search); dev = params.get(C.config.dev.queryFlag) === '1';
      if (dev && params.get('gallery') === '1') return;
      cfg = C.config.inventoryMotion; openingPhase = C.opening.phase;
      fadeMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-sheet'));
      root.document.body.style.setProperty('--detail-backdrop-dim', cfg.detailBackdropDim); root.document.body.style.setProperty('--sheet-detail-opacity', cfg.sheetDetailOpacity);
      sheetSpring = C.springs.create(0, cfg.sheetSpring); scrollSpring = C.springs.create(0, cfg.sheetSpring);
      underlineX = C.springs.create(0, cfg.sheetSpring); underlineScale = C.springs.create(1, cfg.sheetSpring);
      sheet = node('section', 'inventory-sheet glass glass--sheet', root.document.body); sheet.hidden = true; sheet.inert = true;
      sheet.setAttribute('aria-label', 'Collection'); grip = node('div', 'inventory-grip', sheet); grip.setAttribute('aria-label', 'Drag collection sheet');
      header = node('header', 'inventory-header', sheet); node('h2', '', header, 'Collection');
      countLabel = node('div', 'inventory-count', header); countLabel.setAttribute('role', 'img'); numbers = C.numbers.create(node('span', '', countLabel));
      var progress = node('div', 'inventory-progress', countLabel); progress.setAttribute('aria-hidden', 'true'); node('div', 'inventory-progress-fill', progress);
      filters = node('nav', 'inventory-filters', sheet); filters.setAttribute('aria-label', 'Collection order'); filters.setAttribute('role', 'tablist');
      [['all', 'All'], ['generation', 'By generation'], ['rarity', 'By rarity']].forEach(function (item) {
        var button = node('button', '', filters, item[1]); button.setAttribute('type', 'button'); button.setAttribute('role', 'tab'); button.dataset.order = item[0];
        button.setAttribute('aria-selected', order === item[0]);
        button.addEventListener('click', function () { if (detailId) return; order = item[0]; controls.forEach(function (b) { b.setAttribute('aria-selected', b === button); }); refresh(true); setUnderline(); }); controls.push(button);
      });
      underline = node('i', 'inventory-filter-underline', filters); underline.setAttribute('aria-hidden', 'true');
      C.inventory.groupLabel = node('div', 'inventory-group-label', sheet);
      shelf = node('div', 'inventory-shelf', sheet); shelf.scrollLeft = 0; shelf.setAttribute('role', 'listbox'); shelf.setAttribute('tabindex', '0'); shelf.setAttribute('aria-label', 'GPU card shelf');
      empty = node('p', 'inventory-empty', sheet);
      previewLabel = node('p', 'inventory-preview-label', sheet, cfg.previewCount + '-tile preview · temporary'); previewLabel.hidden = true;
      if (dev) {
        var tools = node('div', 'inventory-dev-tools', sheet);
        var real = node('button', '', tools, 'Use real collection'); real.addEventListener('click', function () { C.events.emit('inventory:preview', false); });
        profileButton = node('button', '', tools, 'Measure 5 s FPS'); profileButton.addEventListener('click', measure);
        C.events.on('fx:frame', function (event) {
          if (!profile) return;
          if (!session || detailId || C.motion.reduced || C.cardView.active !== profile.view || !profile.view.visible) profile.invalid = true;
          profile.elapsed += event.dt; profile.stamps.push(event.now);
          if (profile.elapsed >= C.config.finishMotion.profileMs) {
            var sample = profile; profile = null; var gaps = sample.stamps.slice(1).map(function (stamp, i) { return stamp - sample.stamps[i]; }).sort(function (a, b) { return a - b; });
            lastProfile = { valid: !sample.invalid, fps: sample.stamps.length * 1000 / sample.elapsed, p95Ms: gaps[Math.ceil(gaps.length * 0.95) - 1], tiles: model.total, mounted: stats.mounted, fullCards: C.cardView.stats.fullCards };
            profileButton.textContent = sample.invalid ? 'Sample cancelled · retry' : lastProfile.fps.toFixed(1) + ' FPS · p95 ' + lastProfile.p95Ms.toFixed(1) + ' ms'; root.console.info('[Cardable inventory cadence]', lastProfile);
          }
        });
      }
      arrowHome = root.document.getElementById('inventory-affordance'); arrow = arrowHome.querySelector('button');
      arrow.removeAttribute('aria-disabled'); arrow.setAttribute('aria-controls', 'inventory-sheet'); arrow.setAttribute('aria-expanded', 'false'); sheet.setAttribute('id', 'inventory-sheet');
      arrow.addEventListener('click', function () { if (root.performance.now() >= guardUntil) request(); });
      arrow.addEventListener('pointerdown', function (event) { startSheetDrag(event, arrow); });
      grip.addEventListener('pointerdown', function (event) { if (!arrow.contains(event.target)) startSheetDrag(event, grip); });
      var peek = arrowHome.querySelectorAll('.inventory-peek')[0]; peek.style.pointerEvents = 'auto'; peek.addEventListener('pointerdown', function (event) { startSheetDrag(event, peek); });
      [arrow, grip, peek].forEach(function (el) { el.addEventListener('lostpointercapture', function () { releaseSheet(null, true); }); });
      root.document.addEventListener('pointermove', function (event) { moveSheet(event); moveShelf(event); });
      root.document.addEventListener('pointerup', function (event) { releaseSheet(event, false); releaseShelf(event, false); });
      root.document.addEventListener('pointercancel', function (event) { releaseSheet(event, true); releaseShelf(event, true); });
      root.addEventListener('blur', function () { releaseSheet(null, true); releaseShelf(null, true); });
      shelf.addEventListener('pointerdown', startShelfDrag); shelf.addEventListener('lostpointercapture', function () { releaseShelf(null, true); });
      shelf.addEventListener('scroll', function () { if (!session || detailId || settingScroll) return; if (scrollTarget === null && !shelfDrag) scrollIdle = 0; C.fx.wake(); });
      shelf.addEventListener('wheel', function (event) {
        if (!opened || detailId) return;
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX || 0)) {
          prevent(event); shelf.style.scrollSnapType = 'none';
          var unit = event.deltaMode === 1 ? cfg.wheelLinePx : event.deltaMode === 2 ? root.innerWidth : 1;
          setScroll((shelf.scrollLeft || 0) + event.deltaY * unit); scrollTarget = null; scrollIdle = 0; C.fx.wake();
        }
      }, { passive: false });
      shelf.addEventListener('keydown', function (event) {
        if (detailId || !opened) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
          prevent(event); var next = event.key === 'Home' ? 0 : event.key === 'End' ? model.entries.length - 1 : center + (event.key === 'ArrowLeft' ? -1 : 1);
          focusAfterSnap = true; snapTo(next);
        } else if (event.key === 'Enter' && event.target === shelf && !event.repeat) { prevent(event); openDetail(center); }
      });
      root.document.addEventListener('keydown', function (event) {
        if (preferencesActive) return;
        if (event.repeat || event.target && (event.target.isContentEditable || event.target.closest && event.target.closest('input, select, textarea, [contenteditable]'))) return;
        if (event.key === 'Escape' && session && !detailId) { prevent(event); request(false); }
        else if ((event.key.toLowerCase() === 'i' || event.key === 'ArrowUp' && !session) && openingPhase === 'idle') { prevent(event); request(); }
      });
      C.events.on('inventory:request', request); C.events.on('inventory:detailReturned', detailReturned);
      C.events.on('inventory:returnTarget', function (event) { var tile = tiles.find(function (item) { return item.entry.card.id === event.cardId; }); event.rect = tile ? tile.card.getBoundingClientRect() : null; });
      C.events.on('inventory:preview', function (value) { if (!dev || detailId) return; fixture = value ? C.collection.preview(cfg.previewCount) : null; refresh(true); });
      C.events.on('opening:context', function (event) { openingPhase = event.phase; if (event.active && session) reset(); });
      C.events.on('save:written', function () { refresh(false); }); C.events.on('save:reset', reset);
      C.events.on('preferences:context', function (event) { preferencesActive = event.active; });
      C.events.on('fx:visibility', function (visible) { if (!visible) { releaseSheet(null, true); releaseShelf(null, true); if (profile) profile.invalid = true; } });
      C.events.on('motion:changed', function () { sheetDirty = true; windowDirty = true; if (profile) profile.invalid = true; C.fx.wake(); });
      root.addEventListener('resize', resize);
      C.inventory.el = sheet; C.inventory.grip = grip; C.inventory.shelf = shelf; C.inventory.arrow = arrow; C.inventory.filters = controls; C.inventory.count = numbers;
      C.fx.subscribe(update, 'inventory'); refresh(false); resize();
      if (root.document.fonts && root.document.fonts.ready) root.document.fonts.ready.then(function () { underlineWidth = null; resize(); });
      C.events.on('inventory:context', function (event) { arrow.setAttribute('aria-expanded', event.open); });
    }
  };
})(window.Cardable, window);
