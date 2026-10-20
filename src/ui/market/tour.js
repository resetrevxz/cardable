/* Cardable Market — the first-visit tour (1.13.0).
 * Seven short steps, each pointing at the real control it is about: what the Market is, Browse, Auctions, selling, the
 * notch, Market time and the Shop. It replaces the block of text new players used to get. It runs once, the first time
 * the Standard market opens; More → Take the tour plays it again. Escape skips it, the arrow keys step through it, and
 * focus stays on its buttons. The spotlight follows its target on resize; a step whose control is not on screen (a
 * narrow window) is shown in the middle instead. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document, KEY = 'cardable.market.tour';

  var STEPS = [
    { target: '.mk-tab[data-tab="discover"]', icon: 'explore', title: 'Browse', body: 'Cards from players and traders share one feed. Each listing tells you who is selling.' },
    { target: '.mk-tab[data-tab="discover"]', icon: 'gavel', title: 'Bid or buy', body: 'Open a card to bid or buy now. Review the exact card and Credits before confirming.' },
    { target: '.mk-sell', icon: 'tag', title: 'Sell', body: 'Choose a card and set a starting bid. Turn off Allow bids for a buy now listing.' }
  ];

  function done() { try { return root.localStorage.getItem(KEY) === 'done'; } catch (_) { return true; } }
  function markDone() { try { root.localStorage.setItem(KEY, 'done'); } catch (_) { /* this session only */ } if (C.market.store.markGuideSeen) C.market.store.markGuideSeen(); }

  var active = null;
  function start(options) {
    options = options || {};
    if (active || !ui.shell || !ui.shell.isOpen) return false;
    var frame = ui.shell.el.querySelector('.mk-frame'), at = 0, restore = doc.activeElement;
    var spot = h('div.mk-tour-spot', { 'aria-hidden': 'true' });
    var card = h('section.mk-tour-card', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mk-tour-title' });
    var layer = h('div.mk-tour', spot, card);
    layer.addEventListener('pointerdown', function (e) { if (e.target === layer) e.preventDefault(); });
    frame.appendChild(layer);
    function place() {
      var s = STEPS[at], target = s.target ? ui.shell.el.querySelector(s.target) : null, r = target ? target.getBoundingClientRect() : null;
      var box = frame.getBoundingClientRect();
      if (r && r.width && r.height) {
        var pad = 8;
        spot.hidden = false;
        spot.style.transform = 'translate(' + Math.round(r.left - box.left - pad) + 'px,' + Math.round(r.top - box.top - pad) + 'px)';
        spot.style.width = Math.round(r.width + pad * 2) + 'px'; spot.style.height = Math.round(r.height + pad * 2) + 'px';
        layer.dataset.mode = 'spot';
        var cw = Math.min(360, box.width - 32), below = r.bottom + 18 + 220 < box.bottom;
        var left = Math.max(16, Math.min(box.width - cw - 16, r.left - box.left + r.width / 2 - cw / 2));
        card.style.width = cw + 'px';
        card.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(below ? r.bottom - box.top + 18 : Math.max(16, r.top - box.top - 18 - card.offsetHeight)) + 'px)';
        card.dataset.side = below ? 'below' : 'above';
      } else {
        spot.hidden = true; layer.dataset.mode = 'center';
        var w = Math.min(420, box.width - 32); card.style.width = w + 'px';
        card.style.transform = 'translate(' + Math.round((box.width - w) / 2) + 'px,' + Math.round(Math.max(24, box.height / 2 - card.offsetHeight / 2)) + 'px)';
        card.dataset.side = 'center';
      }
    }
    function paint() {
      var s = STEPS[at], last = at === STEPS.length - 1;
      ui.clear(card);
      var dots = h('div.mk-tour-dots', { 'aria-hidden': 'true' });
      STEPS.forEach(function (_, i) { dots.appendChild(h('i', { data: { on: String(i === at), past: String(i < at) } })); });
      card.appendChild(h('div.mk-tour-top', h('span.mk-tour-icon', { data: { anim: s.icon } }, icon(s.icon)), h('span.mk-tour-step.mk-num', { text: (at + 1) + ' / ' + STEPS.length }), ui.iconButton('close', 'Skip the tour', function () { finish(); }, { variant: 'ghost' })));
      card.appendChild(h('h2', { id: 'mk-tour-title', text: s.title }));
      card.appendChild(h('p', { text: s.body }));
      if (s.ways) card.appendChild(h('ul.mk-tour-ways', s.ways.map(function (w) { return h('li', icon(w[0]), h('span', { text: w[1] })); })));
      var back = ui.button('Back', { variant: 'ghost', icon: 'back', disabled: at === 0, onClick: function () { go(at - 1); } });
      var next = ui.button(last ? 'Start trading' : 'Next', { variant: 'primary', icon: last ? 'check' : 'forward', onClick: function () { if (last) finish(); else go(at + 1); } });
      card.appendChild(h('div.mk-tour-actions', dots, h('div.mk-tour-buttons', back, next)));
      place();
      if (!ui.motion.still()) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
      next.focus({ preventScroll: true });
    }
    function go(i) { at = Math.max(0, Math.min(STEPS.length - 1, i)); paint(); }
    function finish() {
      if (!active) return;
      markDone();
      root.removeEventListener('keydown', onKey, true); root.removeEventListener('resize', place);
      active = null;
      var end = function () { layer.remove(); if (restore && restore.isConnected) restore.focus({ preventScroll: true }); };
      if (ui.motion.still() || !layer.animate) end(); else layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).onfinish = end;
    }
    function onKey(e) {
      if (!active) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); if (at < STEPS.length - 1) go(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(at - 1); }
      else if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(card.querySelectorAll('button:not([disabled])'), function (b) { return b.offsetParent; });
        if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        e.preventDefault(); e.stopImmediatePropagation(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      } else if (/^[0-9/]$/.test(e.key)) { e.stopImmediatePropagation(); }
    }
    root.addEventListener('keydown', onKey, true);
    root.addEventListener('resize', place, { passive: true });
    active = { finish: finish };
    if (options.step) at = options.step;
    paint();
    return true;
  }

  C.events.on('market:close', function () { if (active) active.finish(); });

  ui.tour = { start: start, get active() { return !!active; }, reset: function () { try { root.localStorage.removeItem(KEY); } catch (_) { /* nothing kept */ } }, STEPS: STEPS };
})(window.Cardable = window.Cardable || {}, window);
