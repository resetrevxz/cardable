(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, active = null, copied = new Map(), uid = 0;
  function date(at) { return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function freshness(at) {
    var today = new Date(C.clock.now()), then = new Date(at);
    var days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? days + ' days ago' : date(at);
  }
  function button(host, label, action, cls) {
    var el = node('button', cls || 'detail-menu-item', host, label); el.type = 'button';
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
    if (ok && el && el.isConnected) {
      el.dataset.copied = 'true'; copied.set(el, root.performance.now() + 1600); C.fx.wake();
      if (active) active.announce('Copied serial.');
    } else if (active) active.announce(ok ? 'Copied serial.' : 'Could not copy. Select the serial in the details popover.');
    return ok;
  }
  function bindCard(view) {
    if (!view || !view.instance.serial) return;
    // An image role would flatten its interactive serial in the accessibility tree.
    if (!view.el.hasAttribute('data-detail-role')) view.el.dataset.detailRole = view.el.getAttribute('role') || '';
    view.el.setAttribute('role', 'group');
    view.el.querySelectorAll('.card__serial,.card__back-serial').forEach(function (el) {
      if (!el.dataset.copySerial) {
        el.dataset.copySerial = 'true'; el.setAttribute('role', 'button'); el.title = 'Copy serial';
        el.setAttribute('aria-label', 'Copy serial ' + view.instance.serial);
        el.addEventListener('click', function (event) { event.stopPropagation(); copy(view.instance.serial, el); });
        el.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) copy(view.instance.serial, el); } });
      }
      el.tabIndex = el.closest('.card__face--back') ? (view.side === 'back' ? 0 : -1) : (view.side === 'front' ? 0 : -1);
    });
  }
  function extraSpecs(entry) {
    var card = entry.card, classic = entry.cardSkinId === 'classic';
    var plate = new Set(classic ? [] : C.cardSpecs.frontRows(card).map(function (row) { return row.key; }));
    if (entry.cardSkinId === 'classic') {
      plate.add(card.specs.coreClockMhz != null ? 'coreClockMhz' : card.specs.gpuClockMhz != null ? 'gpuClockMhz' : 'boostMhz'); plate.add('busBits');
    }
    var rows = C.cardSpecs.rows(card).filter(function (row) { return !plate.has(row.key); });
    if (classic && C.cardSpecs.memoryType(card)) rows.unshift({ key: 'memoryType', label: 'Memory type', value: C.cardSpecs.memoryType(card) });
    var year = card.releaseYear || card.specs && card.specs.releaseYear;
    if (year != null && !plate.has('releaseYear') && !rows.some(function (row) { return row.key === 'releaseYear'; })) rows.unshift({ key: 'releaseYear', label: 'Release year', value: String(year) });
    return rows;
  }
  function build(host, context) {
    if (active) active.destroy(); host.replaceChildren();
    var entry = context.entry, instance = context.instance,  popover = null, anchor = null, confirm = null;
    var id = 'detail-info-' + (++uid), animations = [], destroyed = false, tooltip = null;
    host.classList.add('detail-info--clean');
    function item(el, index) { el.classList.add('detail-enter'); el.style.setProperty('--detail-order', index); return el; }
    var header = item(node('header', 'detail-heading', host), 0);
    node('p', 'detail-kicker', header, (entry.generation ? entry.generation.name : entry.card.generation) + ' · ' + entry.rarity.name);
    node('h1', 'detail-name', header, entry.owned ? entry.card.name : '???');
    var chips = item(node('div', 'detail-chip-row', host), 4); chips.setAttribute('aria-label', 'Card provenance');
    var overview=item(node('section','detail-tab-pane is-active',host),2);
    var rows = entry.owned ? extraSpecs(entry) : [];
    function specs(list, rows) { rows.forEach(function (row) { var pair = node('div', '', list); node('dt', '', pair, row.label); node('dd', '', pair, row.value); }); }
    if (rows.length) specs(node('dl', 'detail-extra-specs', overview), rows.slice(0, 4));
    else node('p', 'detail-dim detail-spec-note', overview, entry.owned ? 'Primary specs are on the card.' : 'Collect this card to see its details.');
    if (entry.owned) {
      var all = node('details', 'detail-all-specs', overview); node('summary', '', all, 'All specs');
      if (rows.length > 4) specs(node('dl', 'detail-extra-specs', all), rows.slice(4));
      node('p', 'detail-dim', all, rows.length > 4 ? 'Primary specs remain on the card.' : 'All additional specs are shown above; primary specs are on the card.');
      var acquired = Math.max.apply(null, entry.instances.map(function (copy) { return copy.pulledAt; }));
      node('p', 'detail-dim detail-ownership', overview, entry.instances.length + (entry.instances.length === 1 ? ' copy' : ' copies') + ' · latest ' + date(acquired));
      if (entry.instances.length > 1) {
        var copies = node('details', 'detail-copies', overview), copyLabel = node('summary', '', copies, 'Choose copy');
        var copyList = node('div', 'detail-copy-list', copies);
        entry.instances.forEach(function (copyInstance, index) {
          var variant = C.variant(copyInstance.variantId), copyButton = button(copyList, date(copyInstance.pulledAt) + ' · ' + (variant ? variant.name : 'Normal'), function () { context.browse(index); copies.open = false; }, 'detail-copy-option');
          node('span', 'detail-copy-serial', copyButton, copyInstance.serial); copyButton.dataset.instanceId = copyInstance.instanceId;
        });
        copyLabel.setAttribute('aria-label', 'Choose an owned copy');
      }
      var lore = entry.card.lore || entry.card.flavor;
      if (typeof lore === 'string' && lore.trim()) node('p', 'detail-dim detail-lore', overview, lore);
    }
    var actions = item(node('div', 'detail-actions detail-action-row', host), 3), extensionHost = node('div', 'detail-extension-actions', host);
    extensionHost.hidden = true;
    C.detailActions.render(extensionHost, { entry: entry, panel: overview, preview: context.preview, dismiss: function(){dismiss(false);} });
    var inspect = extensionHost.querySelector('.studio-inspect-action');
    if (inspect) { actions.appendChild(inspect); inspect.dataset.tooltip = 'Inspect · I'; inspect.title = 'Inspect · I'; inspect.setAttribute('aria-keyshortcuts', 'I'); }
    else { inspect = button(actions, 'Inspect', null, 'studio-inspect-action'); inspect.disabled = true; inspect.title = 'Collect this card to inspect it'; }
    C.icons.register('flip','M19 10a7 7 0 1 0-1 7M19 5v5h-5');
    var flip = C.inventoryIcons.button('flip', C.keybindings.tooltip('R','Flip'), context.flip, actions);
    flip.setAttribute('aria-keyshortcuts', 'R'); flip.disabled = !entry.owned;
    var favorite = C.inventoryIcons.button('favorite', C.keybindings.tooltip('F','Favorite'), function () {
      C.inventoryModel.favorite(entry.stackKey); refresh(instance);
    }, actions); favorite.setAttribute('aria-keyshortcuts', 'F'); favorite.disabled = !entry.owned || context.preview;
    var more = C.inventoryIcons.button('more', 'More actions', function () { openMore(); }, actions); more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-expanded', 'false');
    var replay=extensionHost.querySelector('.cb-replay-action');if(replay){host.appendChild(replay);}
    var extensionActions = Array.from(extensionHost.children);
    var status = node('p', 'detail-live', host); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function announce(text) { status.textContent = text; }
    function dismiss(returnFocus) {
      if (!popover) return false;
      if (confirm) { confirm.destroy(); confirm = null; }
      extensionActions.forEach(function (action) { extensionHost.appendChild(action); });
      popover.remove(); popover = null; if (anchor) { anchor.setAttribute('aria-expanded', 'false'); if (returnFocus && anchor.isConnected) anchor.focus({ preventScroll: true }); } anchor = null; return true;
    }
    function openPopover(source, label) {
      if (anchor === source) { dismiss(true); return null; } dismiss(false); anchor = source;
      popover = node('section', 'detail-popover glass', context.overlay); popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', label);
      source.setAttribute('aria-expanded', 'true'); var rect = C.viewport.rect(source.getBoundingClientRect());
      var width = Math.min(320, C.viewport.width - 32);
      popover.style.width = width + 'px'; popover.style.left = Math.max(16, Math.min(C.viewport.width - width - 16, rect.right - width)) + 'px';
      popover.style.top = Math.max(16, Math.min(C.viewport.height - 310, rect.bottom + 8)) + 'px';
      button(popover, 'Close', function () { dismiss(true); }, 'detail-popover-close').setAttribute('aria-label', 'Close ' + label);
      return popover;
    }
    function metadata() {
      var tags = C.cardTags.derive(entry, instance, 'detail').filter(function (tag) { return !['variant', 'pack', 'date', 'age'].includes(tag.kind); });
      if (entry.owned && !entry.variantId) tags.unshift({ kind: 'variant', text: 'Normal', label: 'Normal finish' });
      if (entry.owned && instance) tags.push({ kind: 'timestamp', text: 'Unpacked ' + new Date(instance.pulledAt).toLocaleString() });
      return tags;
    }
    function refresh(nextInstance) {
      instance = nextInstance; dismiss(false); chips.replaceChildren();
      var rendered = root.document.createElement('div'); C.cardTags.render(rendered, entry, instance, 'detail');
      var priorities = [], tags = C.cardTags.derive(entry, instance, 'detail'), extra = metadata();
      ['variant', 'pack'].forEach(function (kind) {
        var tag = tags.find(function (t) { return t.kind === kind; }); if (!tag || kind === 'variant' && !entry.variantId) return;
        var el = rendered.querySelector('.card-tag--' + kind).cloneNode(true);
        el.addEventListener('keydown', function (e) { if(e.key==='Escape'&&el.classList.contains('cb-tag-pinned')){e.preventDefault();e.stopPropagation();el.classList.remove('cb-tag-pinned');el.setAttribute('aria-expanded','false');} });
        el.addEventListener('click', function () { var expanded = el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', String(expanded)); el.classList.toggle('cb-tag-pinned', expanded); });
        if (kind === 'pack') { var pack = C.pack(instance.packId); el.lastChild.textContent = pack.name; el.dataset.rare = String(pack.skin === 'rare'); }
        priorities.push({ el: el, text: tag.kind === 'pack' ? C.pack(instance.packId).name : tag.text });
      });
      if (instance) priorities.push({ el: node('span', 'card-tag detail-freshness', root.document.createElement('div'), freshness(instance.pulledAt)), text: freshness(instance.pulledAt) });
      priorities.slice(0, 2).forEach(function (chip) { chips.appendChild(chip.el); });
      priorities.slice(2).forEach(function (chip) { extra.unshift({ text: chip.text }); });
      if (extra.length) {
        var overflow = button(chips, '+' + extra.length, function () {
          var pop = openPopover(overflow, 'Card details'); if (!pop) return;
          var list = node('ul', 'detail-metadata', pop);
          extra.forEach(function (tag) { node('li', '', list, tag.text || tag.label); });
          pop.querySelector('button').focus({ preventScroll: true });
        }, 'card-tag detail-overflow'); overflow.setAttribute('aria-label', extra.length + ' more card details'); overflow.setAttribute('aria-haspopup', 'dialog'); overflow.setAttribute('aria-expanded', 'false');
      }
      favorite.setAttribute('aria-pressed', String(C.inventoryModel.current.favorites.includes(entry.stackKey)));
      host.querySelectorAll('.detail-copy-option').forEach(function (b) { b.setAttribute('aria-pressed', String(instance && b.dataset.instanceId === instance.instanceId)); });
      bindCard(context.view());
    }
    function openMore() {
      var pop = openPopover(more, 'More actions'); if (!pop) return;
      var copyButton = button(pop, 'Copy serial', function () { copy(instance.serial, copyButton); }); copyButton.disabled = !instance;
      button(pop, 'Export card data', function () {
        var data = { card: entry.card, instance: instance || null }, blob = new root.Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
        var url = root.URL.createObjectURL(blob), link = node('a', '', pop); link.href = url; link.download = 'cardable-' + entry.card.id + '.json'; link.click(); link.remove(); root.URL.revokeObjectURL(url); announce('Card data exported.');
      }).disabled = !entry.owned;
      if (entry.owned && !context.preview) button(pop, 'Add to collection', function () { var source = more; dismiss(false); C.events.emit('inventory:detailMembership', { entry: entry, anchor: source }); });
      extensionActions.forEach(function (action) { pop.appendChild(action); });
      if (entry.owned && !context.preview) {
        button(pop, 'Delete this copy…', function(){var chosen=instance;dismiss(false);C.cardDeletionView.show(entry,chosen,context.close);});
      }
      copyButton.focus({ preventScroll: true });
    }
    function outside(event) { if (popover && !popover.contains(event.target) && !anchor.contains(event.target)) dismiss(false); }
    root.document.addEventListener('pointerdown', outside);
    function hideTooltip() { if (tooltip) tooltip.remove(); tooltip = null; }
    function showTooltip(event) {
      var target = event.target.closest('[data-tooltip]'); if (!target || !context.overlay.contains(target)) return;
      hideTooltip(); tooltip = node('div', 'detail-tooltip glass', context.overlay, target.dataset.tooltip); tooltip.setAttribute('role', 'tooltip');
      var rect = C.viewport.rect(target.getBoundingClientRect()); tooltip.style.left = Math.max(8, Math.min(C.viewport.width - tooltip.offsetWidth - 8, rect.left + rect.width / 2 - tooltip.offsetWidth / 2)) + 'px';
      tooltip.style.top = Math.max(8, rect.top - tooltip.offsetHeight - 8) + 'px';
    }
    context.overlay.addEventListener('pointerover', showTooltip); context.overlay.addEventListener('focusin', showTooltip);
    context.overlay.addEventListener('pointerout', hideTooltip); context.overlay.addEventListener('focusout', hideTooltip);
    function key(event) {
      if (event.key === 'Escape' && dismiss(true)) return true;
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,select,textarea,[contenteditable],[data-tool-surface]')) return false;
      if (C.inventory.toolbar && C.inventory.toolbar.modal) return false;
      if (popover) return false;
      switch (event.key.toLowerCase()) {
        case 'i': if (!inspect.disabled) inspect.click(); return true;

        case 'f': if (!favorite.disabled) favorite.click(); return true;
        // R belongs to the existing card-view handler; do not flip it twice.
      }
      return false;
    }
    function destroy() { if (destroyed) return; destroyed = true; dismiss(false); hideTooltip(); root.document.removeEventListener('pointerdown', outside); context.overlay.removeEventListener('pointerover', showTooltip); context.overlay.removeEventListener('focusin', showTooltip); context.overlay.removeEventListener('pointerout', hideTooltip); context.overlay.removeEventListener('focusout', hideTooltip); animations.forEach(function (a) { a.cancel(); }); if (active === api) active = null; }
    var api = { refresh: refresh, flipButton: flip, announce: announce, key: key, destroy: destroy, update: function (now, dt) { var moving = false; if (confirm) moving = confirm.update(now, dt) || moving; return moving; } };
    active = api; refresh(instance);
    var lift = !C.motion.reduced && C.settings.policy.animation >= 2, blur = lift && C.settings.get('quality') === 'high' && C.settings.policy.blur === 1;
    host.querySelectorAll('.detail-enter').forEach(function (el) {
      animations.push(el.animate([{ opacity: 0, transform: lift ? 'translateY(8px)' : 'none', filter: blur ? 'blur(4px)' : 'none' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 250, delay: Number(el.style.getPropertyValue('--detail-order')) * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    });
    return api;
  }
  C.detailPanel = { build: build, bindCard: bindCard, copy: copy };
  C.events.on('app:ready', function () { C.fx.subscribe(function (now, dt) {
    var moving = active ? active.update(now, dt) : false;
    copied.forEach(function (until, el) { if (!el.isConnected || now >= until) { delete el.dataset.copied; copied.delete(el); } else moving = true; }); return moving;
  }, 'detail-info'); });
})(window.Cardable, window);
