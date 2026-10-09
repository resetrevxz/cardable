(function (C) {
  'use strict';
  // Design: "A pink color with a purple border, and animated random shapes in the middle."
  // Prop: "A glowing outside square with small squircle edges border made of dark purple with a pink outline with white going circling border"
  var framePath = 'M12 2H88C98 2 98 2 98 12V128C98 138 98 138 88 138H12C2 138 2 138 2 128V12C2 2 2 2 12 2Z';
  function surface(card, context) {
    var element = C.finishes.surface('exotic', context), cfg = C.config.finishMotion.exotic, random = C.art.random(card.art.seed), shapes = [];
    for (var i = 0; i < Math.ceil(cfg.shapeCount * [0, 0.5, 0.75, 1, 1][C.settings.policy.prop]); i += 1) {
      var svg = C.finishes.svg('svg', { viewBox: '0 0 40 40', class: 'finish-exotic-shape', 'aria-hidden': 'true' }, element);
      svg.style.left = (i % 2 ? 96.8 : -0.8) + '%'; svg.style.top = (28 + random() * 34) + '%';
      var kind = Math.floor(random() * 3);
      if (kind === 0) C.finishes.svg('circle', { cx: 20, cy: 20, r: 13 }, svg);
      else C.finishes.svg('path', { d: kind === 1 ? 'M20 4L36 32H4Z' : 'M9 7H31V33H9Z' }, svg);
      shapes.push({ el: svg, phase: random() * Math.PI * 2 });
    }
    var prop = C.finishes.surface('exotic-prop', context); prop.classList.add('finish-prop');
    var frame = C.finishes.svg('svg', { viewBox: '0 0 100 140', class: 'finish-exotic-frame', 'aria-hidden': 'true', 'data-shape': 'squircle' }, prop);
    var defs = C.finishes.svg('defs', {}, frame), clipId = C.finishes.uid('squircle');
    var clip = C.finishes.svg('clipPath', { id: clipId }, defs);
    C.finishes.svg('path', { d: 'M12 0H88C100 0 100 0 100 12V128C100 140 100 140 88 140H12C0 140 0 140 0 128V12C0 0 0 0 12 0Z' }, clip);
    var border = C.finishes.svg('g', { 'clip-path': 'url(#' + clipId + ')' }, frame);
    C.finishes.svg('path', { d: framePath, class: 'exotic-pink-outline', fill: 'none', 'stroke-width': 5 }, border);
    C.finishes.svg('path', { d: framePath, class: 'exotic-dark-border', fill: 'none', 'stroke-width': 3 }, border);
    var highlight = C.finishes.svg('path', { d: framePath, class: 'exotic-border-highlight', fill: 'none', 'stroke-width': 1.2, pathLength: 1000, 'stroke-dasharray': '85 915' }, border);
    (context.propElement || element).appendChild(prop);
    return { el: element, prop: prop, shapes: shapes, highlight: highlight, time: 0 };
  }
  C.finishes.register('exotic', {
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.exotic;
      state.shapes.forEach(function (shape) {
        var phase = state.time / cfg.shapeCycleMs * Math.PI * 2 + shape.phase;
        shape.el.style.transform = 'translateY(' + Math.cos(phase * 0.8) * cfg.shapeTravelPx + 'px) rotate(' + Math.sin(phase) * cfg.shapeRotateDegrees + 'deg)';
        shape.el.style.opacity = 0.4 + 0.5 * (1 + Math.sin(phase)) / 2;
      });
      if (C.finishes.propDue(state, dt)) state.highlight.style.strokeDashoffset = -(state.time / cfg.borderCycleMs * 1000 % 1000);
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable);
