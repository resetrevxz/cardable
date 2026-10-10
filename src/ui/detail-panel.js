/** Card detail: the card is the menu. Its parts are hotspots that open a small
 *  callout beside the card (rarity, serial, finish, name, specs, generation), and a
 *  rail of round actions sits next to it. There is no separate information panel. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, active = null, copied = new Map(), uid = 0;
  var PARTS = [['rarity', '.card__badge', 'Rarity'], ['generation', '.card__generation', 'Generation'], ['serial', '.card__serial', 'Serial'],
    ['finish', '.card__brand', 'Finish and pack'], ['name', '.card__title-block', 'Card'], ['specs', '.card__specs', 'Specifications'], ['memory', '.card__memory', 'Memory']];
  function date(at) { if (C.settings.get('dateFormat') !== 'system') return C.formats.date(at); return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function freshness(at) {
    var today = new Date(C.clock.now()), then = new Date(at);
    var days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? days + ' days ago' : date(at);
  }
  function button(host, label, action, cls, icon) {
    var el = node('button', cls || 'detail-menu-item', host); el.type = 'button';
    if (icon) el.appendChild(C.icons.create(icon)); if (label) node('span', '', el, label);
    if (action) el.addEventListener('click', action); return el;
  }
  async function copy(text, el) {
    var ok = false;
    try { if (root.navigator.clipboard) { await root.navigator.clipboard.writeText(text); ok = true; } } catch (_) { /* file:// or denied permission: use the local fallback. */ }
    if (!ok) {
      var focused = root.document.activeElement, area = node('textarea', 'detail-copy-buffer', root.document.body, text);
      area.setAttribute('aria-label', 'Copy serial'); area.select();
      try { ok = root.document.execCommand('copy'); } catch (_) { ok = false; }
      area.remove(); if (focused && focused.isConnected) focused.focus({ preventScroll: true });
    }
    if (ok && el && el.isConnected) { el.dataset.copied = 'true'; copied.set(el, root.performance.now() + 1600); C.fx.wake(); }
    if (active) active.announce(ok ? 'Copied serial.' : 'Could not copy the serial.');
    return ok;
  }
  // Marks the card's own parts as controls. The card keeps tilting; the parts move with it.
  function bindCard(view) {
    if (!view || !view.instance.serial) return;
    if (!view.el.hasAttribute('data-detail-role')) view.el.dataset.detailRole = view.el.getAttribute('role') || '';
    view.el.setAttribute('role', 'group');
    var front = view.side !== 'back';
    PARTS.forEach(function (part, index) {
      var el = view.el.querySelector('.card__face--front ' + part[1]) || view.el.querySelector(part[1]); if (!el) return;
      if (!el.dataset.hot) {
        el.dataset.hot = part[0]; el.classList.add('detail-hot'); el.style.setProperty('--hot-order', index); el.setAttribute('role', 'button'); el.setAttribute('aria-haspopup', 'dialog');
        el.setAttribute('aria-label', part[2] + (part[0] === 'serial' ? ' ' + view.instance.serial : '') + ' · details');
        el.addEventListener('pointerenter', function () { if (active) active.hover(el, true); });
        el.addEventListener('pointerleave', function () { if (active) active.hover(el, false); });
        el.addEventListener('focus', function () { if (active) active.open(el, false); });
        el.addEventListener('pointerdown', function (event) { event.stopPropagation(); });
        el.addEventListener('click', function (event) { event.stopPropagation(); if (part[0] === 'serial') copy(view.instance.serial, el); if (active) active.open(el, true); });
        C.keys.listen(el, 'keydown', 'detail.hotspot', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!event.repeat && active) active.open(el, true, true); } });
      }
      el.tabIndex = front ? 0 : -1;
    });
    view.el.querySelectorAll('.card__back-serial').forEach(function (el) {
      if (!el.dataset.copySerial) { el.dataset.copySerial = 'true'; el.setAttribute('role', 'button'); el.title = 'Copy serial'; el.setAttribute('aria-label', 'Copy serial ' + view.instance.serial);
        el.addEventListener('click', function (event) { event.stopPropagation(); copy(view.instance.serial, el); });
        C.keys.listen(el, 'keydown', 'detail.backSerial', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) copy(view.instance.serial, el); } }); }
      el.tabIndex = front ? -1 : 0;
    });
  }
  function allSpecs(entry) {
    var card = entry.card, rows = C.cardSpecs.rows(card).slice(), type = C.cardSpecs.memoryType(card);
    rows.unshift({ key: 'vram', label: 'Memory', value: C.cardSpecs.vram(card) + (type ? ' ' + type : '') });
    var year = card.releaseYear || card.specs && card.specs.releaseYear;
    if (year != null && !rows.some(function (row) { return row.key === 'releaseYear'; })) rows.push({ key: 'releaseYear', label: 'Release year', value: String(year) });
    return rows;
  }
  function build(host, context) {
    if (active) active.destroy(); host.replaceChildren(); host.classList.remove('detail-info--clean'); host.classList.add('detail-rail');
    var entry = context.entry, instance = context.instance, overlay = context.overlay, destroyed = false, animations = [];
    var callout = null, calloutPart = null, pinned = false, hoverTimer = null, menu = null, menuAnchor = null, id = 'detail-callout-' + (++uid);
    var status = node('p', 'detail-live', host); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function announce(text) { status.textContent = text; }
    function view() { return context.view(); }

    // ---- Action rail ----
    var extensionHost = node('div', 'detail-extension-actions', host); extensionHost.hidden = true;
    C.detailActions.render(extensionHost, { entry: entry, panel: host, preview: context.preview, dismiss: function () { closeMenu(false); } });
    function railButton(icon, label, keys, action) {
      var b = button(host, '', action, 'detail-rail-button', icon); b.setAttribute('aria-label', label); var tip = node('span', 'detail-rail-label', b, label); if (keys) { node('kbd', '', tip, keys); b.setAttribute('aria-keyshortcuts', keys); } return b;
    }
    var inspect = extensionHost.querySelector('.studio-inspect-action');
    if (inspect) { host.appendChild(inspect); inspect.classList.add('detail-rail-button', 'detail-rail-primary'); inspect.querySelector('span').className = 'detail-rail-label'; node('kbd', '', inspect.querySelector('span'), 'I'); inspect.dataset.keyAction = 'detail.inspect'; inspect.dataset.keyLabel = 'Inspect'; inspect.removeAttribute('title'); inspect.setAttribute('aria-keyshortcuts', 'I'); }
    else { inspect = railButton('camera', entry.owned ? 'Inspect' : 'Collect this card to inspect it', null, null); inspect.classList.add('detail-rail-primary'); inspect.disabled = true; }
    C.icons.register('flip', 'M19 10a7 7 0 1 0-1 7M19 5v5h-5'); C.icons.register('dots', 'M5 12h.01M12 12h.01M19 12h.01');
    var favorite = railButton('star', 'Favorite', 'F', function () { C.inventoryModel.favorite(entry.stackKey); refresh(instance); }); favorite.disabled = !entry.owned || context.preview;
    var flip = railButton('flip', 'Flip', 'R', context.flip); flip.disabled = !entry.owned;
    var copies = null;
    if (entry.owned && entry.instances.length > 1) { copies = railButton('layers', 'Copies', null, function () { openMenu(copies, 'copies'); }); node('i', 'detail-rail-count', copies, String(entry.instances.length)); copies.setAttribute('aria-haspopup', 'dialog'); }
    var more = railButton('dots', 'More', null, function () { openMenu(more, 'more'); }); more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-expanded', 'false'); more.classList.add('detail-rail-more');
    var extensionActions = Array.from(extensionHost.children).filter(function (el) { return !el.classList.contains('cb-replay-action'); });
    var hint = overlay.querySelector('.detail-card-hint');
    if (hint && !hint.querySelector('.detail-hint-parts')) node('span', 'detail-hint-parts', hint, 'Point at the card for details');

    // ---- Rail menus (More, Copies) ----
    function closeMenu(returnFocus) { if (!menu) return false; extensionActions.forEach(function (action) { extensionHost.appendChild(action); }); menu.remove(); menu = null; if (menuAnchor) { menuAnchor.setAttribute('aria-expanded', 'false'); if (returnFocus && menuAnchor.isConnected) menuAnchor.focus({ preventScroll: true }); } menuAnchor = null; return true; }
    function openMenu(source, kind) {
      if (menuAnchor === source) { closeMenu(true); return; } closeMenu(false); close(); menuAnchor = source; source.setAttribute('aria-expanded', 'true');
      menu = node('section', 'detail-menu', overlay); menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', kind === 'copies' ? 'Choose a copy' : 'More actions');
      if (kind === 'copies') {
        node('p', 'detail-callout-eyebrow', menu, entry.instances.length + ' copies');
        entry.instances.forEach(function (copyInstance, index) {
          var variant = C.variant(copyInstance.variantId), b = button(menu, date(copyInstance.pulledAt) + ' · ' + (variant ? variant.name : 'Normal'), function () { closeMenu(true); context.browse(index); });
          node('small', '', b, copyInstance.serial); b.setAttribute('aria-pressed', String(!!instance && copyInstance.instanceId === instance.instanceId));
        });
      } else {
        var copyButton = button(menu, 'Copy serial', function () { copy(instance.serial, copyButton); }, null, 'copy'); copyButton.disabled = !instance;
        button(menu, 'Export card data', function () {
          var data = { card: entry.card, instance: instance || null }, blob = new root.Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
          var url = root.URL.createObjectURL(blob), link = node('a', '', menu); link.href = url; link.download = 'cardable-' + entry.card.id + '.json'; link.click(); link.remove(); root.URL.revokeObjectURL(url); announce('Card data exported.');
        }, null, 'download').disabled = !entry.owned;
        if (entry.owned && !context.preview) button(menu, 'Add to collection', function () { var source = more; closeMenu(false); C.events.emit('inventory:detailMembership', { entry: entry, anchor: source }); }, null, 'folder');
        extensionActions.forEach(function (action) { action.classList.add('detail-menu-item'); menu.appendChild(action); });
        if (entry.owned && !context.preview) button(menu, 'Delete this copy…', function () { var chosen = instance; closeMenu(false); C.cardDeletionView.show(entry, chosen, context.close); }, 'detail-menu-item detail-menu-danger', 'trash');
      }
      var rect = C.viewport.rect(source.getBoundingClientRect()), stacked = overlay.classList.contains('is-stacked');
      menu.style.left = Math.max(12, Math.min(C.viewport.width - menu.offsetWidth - 12, stacked ? rect.left + rect.width / 2 - menu.offsetWidth / 2 : rect.right + 12)) + 'px';
      menu.style.top = Math.max(12, Math.min(C.viewport.height - menu.offsetHeight - 12, stacked ? rect.bottom + 10 : rect.top + rect.height / 2 - menu.offsetHeight / 2)) + 'px';
      var first = menu.querySelector('button:not(:disabled)'); if (first) first.focus({ preventScroll: true });
    }

    // ---- Callouts for card parts ----
    function line(parent, label, value) { var row = node('div', 'detail-callout-row', parent); node('span', '', row, label); node('strong', '', row, value); return row; }
    function fill(kind, body) {
      var card = entry.card, all = C.inventory.entries || [], actions = node('div', 'detail-callout-actions', null), pack = instance && C.pack(instance.packId);
      function head(eyebrow, title) { node('p', 'detail-callout-eyebrow', body, eyebrow); var h = node('h3', '', body, title); h.id = id + '-title'; }
      if (kind === 'rarity') {
        var tiers = C.data.rarities, mine = all.filter(function (e) { return e.owned && e.rarity && e.rarity.id === entry.rarity.id; }).length;
        head('Rarity', entry.rarity.name); var pips = node('div', 'detail-callout-pips', body); pips.setAttribute('aria-hidden', 'true'); tiers.forEach(function (r) { node('i', r.tier <= entry.rarity.tier ? 'is-on' : '', pips); });
        line(body, 'Tier', (entry.rarity.tier + 1) + ' of ' + tiers.length); line(body, 'In your collection', mine + (mine === 1 ? ' design' : ' designs'));
        if (entry.rarity.openingIntro && instance && !context.preview) button(actions, 'Replay cutscene', function () { close(); if (!C.cutsceneReplay.play(instance)) announce('The cutscene could not start right now.'); }, 'detail-callout-action', 'play');
        else node('p', 'detail-callout-note', body, entry.rarity.openingIntro ? 'Collect this card to replay its cutscene.' : 'This rarity arrives without a cutscene.');
      } else if (kind === 'generation') {
        var gen = entry.generation, same = all.filter(function (e) { return e.generation && gen && e.generation.id === gen.id; }), designs = new Set(same.map(function (e) { return e.card.id; })), owned = new Set(same.filter(function (e) { return e.owned; }).map(function (e) { return e.card.id; }));
        head('Generation', gen ? gen.name : String(card.generation)); line(body, 'Collected', owned.size + ' of ' + designs.size);
        var bar = node('div', 'detail-callout-bar', body); node('i', '', bar).style.transform = 'scaleX(' + (designs.size ? owned.size / designs.size : 0) + ')';
      } else if (kind === 'serial') {
        head('Serial', instance.serial); line(body, 'Unpacked', C.formats.date(instance.pulledAt, true)); if (pack) line(body, 'From', pack.name);
        node('p', 'detail-callout-note', body, 'A serial is unique to this copy and never changes.');
        button(actions, 'Copy serial', function () { copy(instance.serial, calloutPart); }, 'detail-callout-action', 'copy');
      } else if (kind === 'finish') {
        head('Finish', entry.variant ? entry.variant.name : 'Normal'); if (pack) line(body, 'Pack', pack.name); line(body, 'Unpacked', freshness(instance.pulledAt));
        var tags = C.cardTags.derive(entry, instance, 'detail').filter(function (tag) { return ['variant', 'pack', 'date', 'age', 'rarity', 'serial', 'generation', 'tier'].indexOf(tag.kind) < 0; });
        if (tags.length) { var chips = node('div', 'detail-callout-chips', body); tags.forEach(function (tag) { node('span', '', chips, tag.text || tag.label); }); }
      } else if (kind === 'name') {
        var latest = Math.max.apply(null, entry.instances.map(function (c) { return c.pulledAt; })), lore = card.lore || card.flavor;
        head((entry.generation ? entry.generation.name : 'Card') + ' · ' + entry.rarity.name, card.name);
        line(body, 'Copies', String(entry.instances.length)); line(body, 'Latest', date(latest));
        if (typeof lore === 'string' && lore.trim()) node('p', 'detail-callout-note', body, lore);
        if (C.inventoryModel.current.favorites.includes(entry.stackKey)) line(body, 'Favorite', 'Yes');
      } else {
        head('Specifications', card.name); var list = node('dl', 'detail-callout-specs', body);
        allSpecs(entry).forEach(function (row) { var pair = node('div', '', list); node('dt', '', pair, row.label); node('dd', '', pair, row.value); });
      }
      if (actions.firstChild) body.appendChild(actions);
    }
    function place() {
      if (!callout || !calloutPart || !calloutPart.isConnected) return;
      var current = view(), part = C.viewport.rect(calloutPart.getBoundingClientRect()), card = C.viewport.rect((current ? current.el : calloutPart).getBoundingClientRect());
      var width = callout.offsetWidth, height = callout.offsetHeight, beside = !overlay.classList.contains('is-stacked') && card.left - 76 - width >= 12, leader = callout.querySelector('.detail-callout-leader');
      var middle = part.top + part.height / 2, left, top;
      if (beside) { left = card.left - 64 - width; top = Math.max(12, Math.min(C.viewport.height - height - 12, middle - 34)); leader.hidden = false; leader.style.top = (middle - top) + 'px'; leader.style.width = Math.max(0, part.left - 8 - (left + width)) + 'px'; }
      else { left = Math.max(12, Math.min(C.viewport.width - width - 12, card.left + card.width / 2 - width / 2)); top = part.top + part.height + 12; if (top + height > C.viewport.height - 12) top = Math.max(12, part.top - height - 12); leader.hidden = true; }
      callout.style.left = left + 'px'; callout.style.top = top + 'px'; callout.dataset.side = beside ? 'left' : 'over';
    }
    function close(returnFocus) {
      root.clearTimeout(hoverTimer); if (!callout) return false; var part = calloutPart; callout.remove(); callout = null; calloutPart = null; pinned = false;
      if (part) { part.classList.remove('is-open'); part.setAttribute('aria-expanded', 'false'); if (returnFocus && part.isConnected) part.focus({ preventScroll: true }); } return true;
    }
    function open(part, pin, focusAction) {
      root.clearTimeout(hoverTimer); if (!instance || !part.isConnected) return; closeMenu(false);
      if (calloutPart === part) { if (pin) pinned = true; if (focusAction) { var again = callout.querySelector('button'); if (again) again.focus({ preventScroll: true }); } return; }
      close(); calloutPart = part; pinned = !!pin; part.classList.add('is-open'); part.setAttribute('aria-expanded', 'true');
      callout = node('section', 'detail-callout', overlay); callout.setAttribute('role', 'dialog'); callout.setAttribute('aria-labelledby', id + '-title'); callout.dataset.kind = part.dataset.hot;
      node('i', 'detail-callout-leader', callout).setAttribute('aria-hidden', 'true'); fill(part.dataset.hot === 'memory' ? 'specs' : part.dataset.hot, callout);
      callout.addEventListener('pointerenter', function () { root.clearTimeout(hoverTimer); }); callout.addEventListener('pointerleave', function () { hover(part, false); });
      callout.addEventListener('pointerdown', function (event) { event.stopPropagation(); pinned = true; }); callout.addEventListener('click', function (event) { event.stopPropagation(); });
      place(); if (focusAction) { var first = callout.querySelector('button'); if (first) first.focus({ preventScroll: true }); }
      C.ui.emit('open', { component: 'card-part', id: part.dataset.hot }); C.fx.wake();
    }
    // Hover opens after a beat and closes after a beat, so crossing the card does not flicker callouts.
    function hover(part, inside) {
      root.clearTimeout(hoverTimer);
      if (inside) hoverTimer = root.setTimeout(function () { if (!pinned || calloutPart !== part) open(part, false); }, calloutPart ? 60 : 140);
      else if (!pinned) hoverTimer = root.setTimeout(function () { if (!pinned) close(); }, 240);
    }
    function refresh(nextInstance) {
      instance = nextInstance; close(); closeMenu(false);
      favorite.setAttribute('aria-pressed', String(C.inventoryModel.current.favorites.includes(entry.stackKey)));
      favorite.querySelector('.detail-rail-label').firstChild.textContent = favorite.getAttribute('aria-pressed') === 'true' ? 'Favorited' : 'Favorite';
      bindCard(view());
    }
    function outside(event) {
      if (menu && !menu.contains(event.target) && !menuAnchor.contains(event.target)) closeMenu(false);
      if (callout && !callout.contains(event.target) && !(calloutPart && calloutPart.contains(event.target))) close();
    }
    root.document.addEventListener('pointerdown', outside);
    function key(event) {
      if (event.key === 'Escape' && (closeMenu(true) || close(true))) return true;
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,select,textarea,[contenteditable],[data-tool-surface]')) return false;
      if (C.inventory.toolbar && C.inventory.toolbar.modal || menu) return false;
      switch (event.key.toLowerCase()) {
        case 'i': if (!inspect.disabled) inspect.click(); return true;
        case 'f': if (!favorite.disabled) favorite.click(); return true;
        // R belongs to the existing card-view handler; do not flip it twice.
      }
      return false;
    }
    function destroy() { if (destroyed) return; destroyed = true; close(); closeMenu(false); root.document.removeEventListener('pointerdown', outside); animations.forEach(function (a) { a.cancel(); }); host.classList.remove('detail-rail'); if (active === api) active = null; }
    var api = { refresh: refresh, flipButton: flip, announce: announce, key: key, destroy: destroy, open: open, hover: hover,
      // The card tilts and settles after opening; an open callout follows its part.
      update: function () { if (callout) place(); return !!callout; } };
    active = api; refresh(instance);
    var lift = !C.motion.reduced && C.settings.policy.animation >= 2;
    Array.from(host.querySelectorAll('.detail-rail-button')).forEach(function (el, index) {
      animations.push(el.animate([{ opacity: 0, transform: lift ? 'translateX(-10px) scale(.9)' : 'none' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 120 + index * 45, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    });
    api.keyAction = function (action) {
      var current = view(), part = function (name) { return current && current.el.querySelector('[data-hot="' + name + '"]'); };
      if (action === 'delete' && entry.owned && !context.preview) { closeMenu(false); C.cardDeletionView.show(entry, instance, context.close); }
      else if (action === 'replay' && instance && entry.rarity.openingIntro && !context.preview) C.cutsceneReplay.play(instance);
      else if (action === 'copy-serial' && instance) copy(instance.serial, part('serial'));
      else if (action === 'tags' && part('finish')) open(part('finish'), true, true);
    };
    C.keys.refresh(); return api;
  }
  C.events.on('detail:keyAction', function (e) { if (active && active.keyAction) active.keyAction(e.id); });
  C.detailPanel = { build: build, bindCard: bindCard, copy: copy };
  C.events.on('app:ready', function () { C.fx.subscribe(function (now, dt) {
    var moving = active ? active.update(now, dt) : false;
    copied.forEach(function (until, el) { if (!el.isConnected || now >= until) { delete el.dataset.copied; copied.delete(el); } else moving = true; }); return moving;
  }, 'detail-info'); });
})(window.Cardable, window);
