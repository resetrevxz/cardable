/* Cardable Market — small, one-shot motion for money and progress.
 * Rules: only transform and opacity are animated (numbers are counted in text); every motion is short, starts from a
 * real change, can be interrupted by the next one, and is skipped entirely under reduced motion, Very Low quality and
 * when the page is hidden. Nothing here keeps a clock running: each call plays once and removes what it made. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, doc = root.document;
  var running = new WeakMap();

  function still() { return ui.calm() || doc.hidden || (C.settings && C.settings.policy && C.settings.policy.animation < 2); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  // Counts the number shown in `el` from what it showed before to `to`. The first paint is not animated: nothing changed yet. The caller puts the exact value in an aria-label on the parent.
  // `format(n)` turns a value into text; the final text is always exact, 
  function countUp(el, to, options) {
    options = options || {};
    var format = options.format || function (n) { return ui.fmt.exact(n); };
    var from = el._mkValue, ms = options.ms || 650;
    var prior = running.get(el); if (prior) { root.cancelAnimationFrame(prior); running.delete(el); }
    el._mkValue = to;
    if (from == null || from === to || still() || Math.abs(to - from) < 1) { el.textContent = format(to); return; }
    var start = null;
    function frame(now) {
      if (start == null) start = now;
      var t = Math.min(1, (now - start) / ms), v = from + (to - from) * ease(t);
      el.textContent = format(t >= 1 ? to : Math.round(v));
      if (t < 1) running.set(el, root.requestAnimationFrame(frame)); else running.delete(el);
    }
    running.set(el, root.requestAnimationFrame(frame));
  }

  // A short flash on an element whose value just changed: up or down, drawn by CSS on a pseudo-element's opacity.
  function flash(el, dir) {
    if (!el || still()) return;
    el.classList.remove('mk-flash-up', 'mk-flash-down');
    void el.offsetWidth;
    el.classList.add(dir === 'down' ? 'mk-flash-down' : 'mk-flash-up');
    el.addEventListener('animationend', function done() { el.classList.remove('mk-flash-up', 'mk-flash-down'); el.removeEventListener('animationend', done); });
  }

  // A small badge that rises from an element and fades: "+33" leaving the wallet or a card. One element, removed when done.
  function floatBadge(anchor, text, tone) {
    if (!anchor || still() || !anchor.getBoundingClientRect) return;
    var r = anchor.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var badge = h('span.mk-float', { 'aria-hidden': 'true', data: { tone: tone || 'up' }, text: text });
    badge.style.left = Math.round(r.left + r.width / 2) + 'px'; badge.style.top = Math.round(r.top) + 'px';
    (ui.shell && ui.shell.el || doc.body).appendChild(badge);
    badge.addEventListener('animationend', function () { if (badge.parentNode) badge.parentNode.removeChild(badge); });
    root.setTimeout(function () { if (badge.parentNode) badge.parentNode.removeChild(badge); }, 1600);
  }

  // A press-and-settle for something that just changed (the wallet after a trade, a level badge).
  function pulse(el) {
    if (!el || still() || !el.animate) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  // A burst of a few dots around an element for a real achievement (a level, a first profit). Eight pieces, 800 ms, then gone.
  function burst(anchor) {
    if (!anchor || still() || !anchor.getBoundingClientRect || !anchor.animate) return;
    var r = anchor.getBoundingClientRect(), host = ui.shell && ui.shell.el || doc.body, n = 10, parts = [];
    for (var i = 0; i < n; i++) {
      var dot = h('span.mk-burst', { 'aria-hidden': 'true' });
      dot.style.left = Math.round(r.left + r.width / 2) + 'px'; dot.style.top = Math.round(r.top + r.height / 2) + 'px';
      dot.style.background = ['var(--accent)', 'var(--success)', 'var(--warning)'][i % 3];
      host.appendChild(dot); parts.push(dot);
      var angle = (i / n) * Math.PI * 2 + 0.3, dist = 46 + (i % 3) * 14;
      var a = dot.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.round(Math.cos(angle) * dist) + 'px), calc(-50% + ' + Math.round(Math.sin(angle) * dist) + 'px)) scale(.3)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.15,.7,.2,1)', fill: 'forwards' });
      a.onfinish = (function (d) { return function () { if (d.parentNode) d.parentNode.removeChild(d); }; })(dot);
    }
  }

  ui.motion = { countUp: countUp, flash: flash, floatBadge: floatBadge, pulse: pulse, burst: burst, still: still };
})(window.Cardable = window.Cardable || {}, window);
