(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, pop = null, owner = null, tip = null, described = null, scheduled = false, restoring = false;
  var topics = [
    ['.inventory-toolbar-buttons', 'inventory', 'Search, filter and sort your cards. New and variant counts are quick filters. Select a card to inspect it.'],
    ['.detail-heading', 'detail', 'Inspect opens the Studio. Flip, favorite and More apply to the selected copy. Use the arrows to browse.'],
    ['.settings-header', 'quality', 'Preferences save automatically. Graphics, motion and FPS are independent; temporary power limits do not replace your choices.'],
    ['.studio-topbar-actions', 'studio', 'Select a light or prop to edit it. Frame selection with F, orbit with arrow keys, and use Undo to restore an edit.'],
    ['.studio-album-top', 'album', 'Album photos are separate from your JSON save. Download the photos you want to keep before changing installations.']
  ];
  function close(returnFocus) {
    if (pop) { C.accessibility.release(pop); pop.remove(); } pop = null;
    if (owner) { owner.setAttribute('aria-expanded', 'false'); if (returnFocus && owner.isConnected) { restoring = true; owner.focus({ preventScroll: true }); restoring = false; } }
    owner = null;
  }
  function position(el, anchor) {
    var rect = C.viewport.rect(anchor.getBoundingClientRect()), w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(12, Math.min(C.viewport.width - w - 12, rect.right - w)) + 'px';
    el.style.top = Math.max(12, Math.min(C.viewport.height - h - 12, rect.bottom + 8)) + 'px';
  }
  function hideTip() {
    if (tip) tip.remove(); tip = null;
    if (described) { if (described.before) described.el.setAttribute('aria-describedby', described.before); else described.el.removeAttribute('aria-describedby'); }
    described = null;
  }
  function showTip(event) {
    if (restoring) return; var el = event.target.closest('[data-context-hint]'); if (!el || el.disabled) return;
    hideTip(); tip = node('div', 'context-help-tooltip glass', C.viewport.parent(root.document.body), el.dataset.contextHint);
    tip.id = 'context-help-tooltip'; tip.setAttribute('role', 'tooltip');
    described = { el: el, before: el.getAttribute('aria-describedby') };
    el.setAttribute('aria-describedby', [described.before, tip.id].filter(Boolean).join(' ')); position(tip, el);
  }
  function helpButton(host, topic, text) {
    var b = C.inventoryIcons.button('more', 'Help with ' + topic, function () {
      if (owner === b) { close(true); return; } close(false); hideTip(); owner = b; b.setAttribute('aria-expanded', 'true');
      pop = node('section', 'context-help-popover glass', C.viewport.parent(root.document.body)); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Help with ' + topic);
      node('p', '', pop, text);
      var actions = node('div', 'context-help-actions', pop), full = node('button', 'quiet-button', actions, 'Full guide'), dismiss = node('button', 'quiet-button', actions, 'Close');
      full.type = dismiss.type = 'button'; dismiss.addEventListener('click', function () { close(true); });
      full.addEventListener('click', function () { close(true); C.friendly.showContextHelp(topic); });
      position(pop, b); C.accessibility.trap(pop); full.focus({ preventScroll: true });
    }, host);
    b.classList.add('context-help-button'); b.removeAttribute('data-tooltip'); b.dataset.contextHint = text;
    b.firstChild.querySelector('path').setAttribute('d', 'M9 9a3 3 0 1 1 5 2c-1.5 1-2 1.5-2 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0');
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  }
  function keycap(el, key, hint) {
    if (!el || el.querySelector('.context-keycap')) return;
    var k = node('kbd', 'context-keycap', el, key); k.setAttribute('aria-hidden', 'true');
    if (hint) el.dataset.contextHint = hint;
  }
  function refresh() {
    scheduled = false;
    if (pop && (!owner.isConnected || owner.closest('[hidden],[inert]'))) close(false);
    topics.forEach(function (entry) { root.document.querySelectorAll(entry[0]).forEach(function (host) {
      if (!host.querySelector('.context-help-button')) helpButton(host, entry[1], entry[2]);
    }); });
    var packAction = root.document.querySelector('.pack-open-action'); if (packAction) packAction.dataset.contextHint = 'Hold ' + C.settings.holdKey + ' or this button to open a ready pack.';
    keycap(root.document.querySelector('#inventory-affordance button'), 'I', 'Open inventory · I / Arrow Up');
    keycap(root.document.querySelector('.settings-corner'), 'S', 'Open settings · S');
    root.document.querySelectorAll('.studio-inspect-action').forEach(function (el) { keycap(el, 'I'); });
    root.document.body.classList.toggle('hide-context-keycaps', !C.settings.get('keyHints'));
  }
  function schedule() { if (!scheduled) { scheduled = true; root.queueMicrotask(refresh); } }
  C.events.on('app:ready', function () {
    if (C.presentation.gallery) return;
    refresh();
    ['inventory:context', 'inventory:detailOpen', 'preferences:context', 'studio:enter', 'studio:albumContext', 'studio:directorContext'].forEach(function (event) { C.events.on(event, schedule); });
    C.settings.onChange('keyHints', refresh);
    root.document.addEventListener('pointerover', showTip); root.document.addEventListener('focusin', showTip);
    root.document.addEventListener('pointerout', hideTip); root.document.addEventListener('focusout', hideTip);
    root.document.addEventListener('pointerdown', function (event) { if (pop && !pop.contains(event.target) && !owner.contains(event.target)) close(false); });
    root.document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && (pop || tip)) { event.preventDefault(); if (pop) event.stopImmediatePropagation(); hideTip(); close(true); } }, true);
    C.viewport.onResize(function () { hideTip(); if (pop) position(pop, owner); });
  });
  C.contextHelp = { refresh: schedule, close: close };
})(window.Cardable, window);
