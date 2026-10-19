/* Cardable Market — small delights (1.13.0).
 *  - Each tab's icon has its own motion when you arrive: the house settles, the compass spins, the gavel strikes, the
 *    briefcase lifts, the price bars grow, the bag swings.
 *  - Cards under the pointer catch the light where the pointer is; Super Rare and better also get a glint that sweeps
 *    across when you reach them. The light is a custom property written on the card itself (never on a container).
 *  - Tips: one short tip at a time with an icon, moving on every few seconds while you are on the page (pause it, step
 *    through it, or hide it for good).
 *  - Listings that just arrived slide in with a "New" mark.
 * One-shot transform/opacity motion only; Reduced motion, Hover animations off and the lowest qualities turn it all off. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;
  var TIP_MS = 7000, TIPS_KEY = 'cardable.market.tips';

  function still() { return ui.motion.still(); }
  function hoverOn() { return !still() && C.settings.get('hoverAnimations') !== false; }

  // ---- tab icons ----
  function playTab(btn) {
    if (!btn || still()) return;
    btn.classList.remove('is-anim'); void btn.offsetWidth; btn.classList.add('is-anim');
    var ic = btn.querySelector('.mk-tab-icon');
    if (ic) ic.addEventListener('animationend', function end() { btn.classList.remove('is-anim'); ic.removeEventListener('animationend', end); });
    root.setTimeout(function () { btn.classList.remove('is-anim'); }, 1400);
  }

  // ---- light under the pointer, glint on arrival ----
  var LIT = '.mk-tile, .mk-shop-card, .mk-mini, .mk-track, .mk-hero-art, .mk-arrival';
  var pending = null, lastLit = null;
  function onMove(e) {
    if (!hoverOn()) return;
    var el = e.target && e.target.closest ? e.target.closest(LIT) : null;
    if (!el) return;
    pending = { el: el, x: e.clientX, y: e.clientY };
    if (!onMove.raf) onMove.raf = root.requestAnimationFrame(function () {
      onMove.raf = 0; var p = pending; if (!p) return;
      var r = p.el.getBoundingClientRect();
      p.el.style.setProperty('--mx', ((p.x - r.left) / Math.max(1, r.width) * 100).toFixed(1) + '%');
      p.el.style.setProperty('--my', ((p.y - r.top) / Math.max(1, r.height) * 100).toFixed(1) + '%');
    });
  }
  function onOver(e) {
    if (!hoverOn()) return;
    var el = e.target && e.target.closest ? e.target.closest(LIT) : null;
    if (!el || el === lastLit) return;
    lastLit = el;
    if (Number(el.style.getPropertyValue('--mk-tier')) >= 4 || el.dataset.glint === 'true') {
      el.classList.remove('is-glint'); void el.offsetWidth; el.classList.add('is-glint');
      root.setTimeout(function () { el.classList.remove('is-glint'); }, 1000);
    }
  }
  function onOut(e) { var el = e.target && e.target.closest ? e.target.closest(LIT) : null; if (el && !el.contains(e.relatedTarget)) { if (el === lastLit) lastLit = null; } }
  function attach(scroller) {
    if (!scroller || scroller._mkLit) return; scroller._mkLit = true;
    scroller.addEventListener('pointermove', onMove, { passive: true });
    scroller.addEventListener('pointerover', onOver, { passive: true });
    scroller.addEventListener('pointerout', onOut, { passive: true });
  }

  // ---- tips ----
  var TIPS = [
    { icon: 'bulb', text: 'Cards in green are priced under what they usually sell for.' },
    { icon: 'gavel', text: 'In an auction you set the most you would pay. The Market bids for you, one step at a time.' },
    { icon: 'tag', text: 'Selling? “List a card” suggests a fair price. Price a little lower to sell faster.' },
    { icon: 'bell', text: 'Outbid? The notch at the top tells you, with a button to bid again.' },
    { icon: 'clock', text: 'Market time only runs while you play. Speed it up from the clock.' },
    { icon: 'bookmark', text: 'Bookmark a listing to watch it. You will hear when its price moves.' },
    { icon: 'zap', text: 'A fire sale is a trader who needs Credits now. They do not last.' },
    { icon: 'bag', text: 'The Shop sells four cards a day at a fixed price. No bidding, no waiting.' },
    { icon: 'activity', text: 'News moves prices. A card in the news often sells for more a few hours later.' },
    { icon: 'cards', text: 'A card you list is locked, not gone. Withdraw it any time before it sells.' }
  ];
  function tipsHidden() { try { return root.localStorage.getItem(TIPS_KEY) === 'hidden'; } catch (_) { return false; } }
  function hideTips() { try { root.localStorage.setItem(TIPS_KEY, 'hidden'); } catch (_) { /* this session only */ } }
  function tips(scope, options) {
    options = options || {};
    if (tipsHidden() && !options.force) return null;
    var list = options.tips || TIPS, at = Math.floor((Date.now() / 86400000) % list.length), paused = false, timer = 0;
    var glyph = h('span.mk-tips-icon', { 'aria-hidden': 'true' }), text = h('span.mk-tips-text'), dots = h('span.mk-tips-dots', { 'aria-hidden': 'true' });
    var pauseBtn = ui.iconButton('pause', 'Pause tips', function () { paused = !paused; pauseBtn.setAttribute('aria-pressed', String(paused)); ui.clear(pauseBtn); pauseBtn.appendChild(icon(paused ? 'play' : 'pause')); pauseBtn.title = paused ? 'Play tips' : 'Pause tips'; pauseBtn.setAttribute('aria-label', pauseBtn.title); schedule(); }, { variant: 'ghost' });
    var box = h('aside.mk-tips', { 'aria-label': 'Tips', 'aria-roledescription': 'carousel' },
      h('span.mk-tips-label', icon('bulb'), h('span', { text: 'Tip' })),
      h('div.mk-tips-stage', { 'aria-live': 'polite' }, glyph, text),
      h('div.mk-tips-controls', dots,
        ui.iconButton('back', 'Previous tip', function () { show(at - 1, -1); }, { variant: 'ghost' }),
        ui.iconButton('forward', 'Next tip', function () { show(at + 1, 1); }, { variant: 'ghost' }),
        pauseBtn,
        ui.iconButton('close', 'Hide tips', function () { hideTips(); box.remove(); stop(); }, { variant: 'ghost' })));
    list.forEach(function () { dots.appendChild(h('i')); });
    function show(i, dir) {
      at = (i + list.length) % list.length;
      var t = list[at];
      ui.clear(glyph); glyph.appendChild(icon(t.icon)); text.textContent = t.text;
      Array.prototype.forEach.call(dots.children, function (d, n) { d.dataset.on = String(n === at); });
      if (dir && !still()) { box.dataset.dir = dir > 0 ? 'next' : 'prev'; box.classList.remove('is-turn'); void box.offsetWidth; box.classList.add('is-turn'); }
      schedule();
    }
    function schedule() { stop(); if (!paused && !still()) timer = root.setTimeout(function () { if (!box.isConnected) return; if (doc.hidden || box.matches(':hover') || box.contains(doc.activeElement)) { schedule(); return; } show(at + 1, 1); }, TIP_MS); }
    function stop() { if (timer) { root.clearTimeout(timer); timer = 0; } }
    show(at, 0);
    if (scope) scope.add(stop);
    return box;
  }

  // ---- fresh listings ----
  function markFresh(container, beforeIds) {
    if (!container || !beforeIds) return 0;
    var n = 0;
    Array.prototype.forEach.call(container.querySelectorAll('[data-id]'), function (el, i) {
      if (beforeIds[el.dataset.id]) return;
      n++;
      if (!el.querySelector('.mk-new-badge')) { var top = el.querySelector('.mk-tile-top'); if (top) top.appendChild(h('span.mk-new-badge', icon('sparkle'), h('span', { text: 'New' }))); }
      if (still()) return;
      el.style.setProperty('--mk-fresh', String(Math.min(i, 8)));
      el.classList.add('is-fresh');
      root.setTimeout(function () { el.classList.remove('is-fresh'); }, 1600);
    });
    return n;
  }

  // a short celebration on something you did (a Shop purchase, a first sale)
  function cheer(anchor) { ui.motion.burst(anchor); ui.motion.pulse(anchor); }

  ui.flourish = Object.assign(ui.flourish || {}, { playTab: playTab, attach: attach, tips: tips, markFresh: markFresh, cheer: cheer, TIPS: TIPS });
  C.events.on('market:open', function () { if (ui.shell && ui.shell.scroller) attach(ui.shell.scroller); if (ui.shell && ui.shell.trackerHost) attach(ui.shell.trackerHost); });
})(window.Cardable = window.Cardable || {}, window);
