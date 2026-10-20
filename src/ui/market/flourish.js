/* Cardable Market — small delights (1.13.0).
 *  - Each tab's icon has its own motion when you arrive: the house settles, the compass spins, the gavel strikes, the
 *    briefcase lifts, the price bars grow, the bag swings.
 *  - Cards under the pointer catch the light where the pointer is; Super Rare and better also get a glint that sweeps
 *    across when you reach them. The light is a custom property written on the card itself (never on a container).
 *  - Listings that just arrived slide in with a "New" mark.
 * One-shot transform/opacity motion only; Reduced motion, Hover animations off and the lowest qualities turn it all off. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;

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

  ui.flourish = Object.assign(ui.flourish || {}, { playTab: playTab, attach: attach, markFresh: markFresh, cheer: cheer });
  C.events.on('market:open', function () { if (ui.shell && ui.shell.scroller) attach(ui.shell.scroller); if (ui.shell && ui.shell.trackerHost) attach(ui.shell.trackerHost); });
})(window.Cardable = window.Cardable || {}, window);
