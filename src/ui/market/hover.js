/* Cardable Market — pointer feedback for tiles and suggestion cards.
 * One delegated listener on the scrolling page, so there is no listener per card and nothing runs while the pointer is
 * still: a card under the mouse leans a few degrees toward it and a soft highlight follows (CSS reads --tilt-x/y and
 * --shine-x/y). It only runs for a real mouse on a device that can hover, and never under reduced motion, Hover
 * animations off, Very Low or Low quality, or when the page is hidden. Everything it sets is removed when the pointer leaves. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, doc = root.document;
  var fine = root.matchMedia ? root.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var TARGETS = '.mk-tile, .mk-move, .mk-news';
  function enabled() {
    return fine.matches && !ui.motion.still() && doc.documentElement.dataset.hoverAnimations !== 'false';
  }
  function attach(host) {
    var current = null, frame = 0, px = 0, py = 0;
    function reset(el) { if (!el) return; ['--tilt-x', '--tilt-y', '--shine-x', '--shine-y'].forEach(function (p) { el.style.removeProperty(p); }); el.classList.remove('is-pointed'); }
    function apply() {
      frame = 0;
      if (!current || !current.isConnected) return;
      var r = current.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = Math.max(0, Math.min(1, (px - r.left) / r.width)), y = Math.max(0, Math.min(1, (py - r.top) / r.height));
      current.style.setProperty('--tilt-y', ((x - 0.5) * 7).toFixed(2) + 'deg');
      current.style.setProperty('--tilt-x', ((0.5 - y) * 7).toFixed(2) + 'deg');
      current.style.setProperty('--shine-x', (x * 100).toFixed(1) + '%');
      current.style.setProperty('--shine-y', (y * 100).toFixed(1) + '%');
      current.classList.add('is-pointed');
    }
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !enabled()) { if (current) { reset(current); current = null; } return; }
      var t = e.target && e.target.closest ? e.target.closest(TARGETS) : null;
      if (t !== current) { reset(current); current = t; }
      if (!t) return;
      px = e.clientX; py = e.clientY;
      if (!frame) frame = root.requestAnimationFrame(apply);
    }, { passive: true });
    host.addEventListener('pointerleave', function () { reset(current); current = null; if (frame) { root.cancelAnimationFrame(frame); frame = 0; } }, { passive: true });
    // Scrolling or a repaint can remove the card under the pointer: forget it rather than keep a stale reference.
    host.addEventListener('scroll', function () { if (current) { reset(current); current = null; } }, { passive: true });
  }
  ui.hover = { attach: attach, enabled: enabled };
})(window.Cardable = window.Cardable || {}, window);
