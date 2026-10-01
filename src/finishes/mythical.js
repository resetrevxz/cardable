(function (C) {
  'use strict';
  // Design: "A ruby like color which slowly goes from a basic to a shining one, has the glassy look with shiny refractions and actual crystal look"
  // Prop: "White to red flames outside the card having a burning flame animation from the bottom only"
  function crystal(parent) {
    var svg = C.finishes.svg('svg', { viewBox: '0 0 400 560', preserveAspectRatio: 'none', class: 'finish-mythical-crystal', 'aria-hidden': 'true' }, parent);
    // Cut facets stay in the rim. Alternating faces catch the shared moving lamp.
    for (var side = 0; side < 4; side += 1) {
      var length = side < 2 ? 560 : 400, steps = side < 2 ? 14 : 10;
      for (var i = 0; i < steps; i += 1) {
        var at = i * length / steps, next = (i + 1) * length / steps, middle = (at + next) / 2, points;
        if (side === 0) points = '0,' + at + ' 18,' + middle + ' 0,' + next;
        else if (side === 1) points = '400,' + at + ' 382,' + middle + ' 400,' + next;
        else if (side === 2) points = at + ',0 ' + middle + ',18 ' + next + ',0';
        else points = at + ',560 ' + middle + ',542 ' + next + ',560';
        C.finishes.svg('polygon', { points: points, fill: 'var(--ruby-facet-' + (i % 3 + 1) + ')', stroke: 'var(--ruby-cut)', 'stroke-width': 0.65 }, svg);
      }
    }
  }
  function surface(card, context) {
    var cfg = C.config.finishMotion.mythical, element = C.finishes.surface('mythical', context);
    crystal(element);
    var shine = C.finishes.element('div', 'finish-mythical-shine', element);
    var prop = C.finishes.surface('mythical-prop', context); prop.classList.add('finish-prop');
    var svg = C.finishes.svg('svg', { viewBox: '0 0 400 120', preserveAspectRatio: 'none', class: 'finish-mythical-flames', 'data-origin': 'bottom', 'aria-hidden': 'true' }, prop);
    var defs = C.finishes.svg('defs', {}, svg), fireId = C.finishes.uid('fire'), maskId = C.finishes.uid('bottom-fire');
    var gradient = C.finishes.svg('linearGradient', { id: fireId, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    C.finishes.svg('stop', { offset: 0, 'stop-color': 'var(--highlight)' }, gradient);
    C.finishes.svg('stop', { offset: 0.45, 'stop-color': 'var(--flame-middle)' }, gradient);
    C.finishes.svg('stop', { offset: 1, 'stop-color': 'var(--flame-tip)' }, gradient);
    var fadeId = C.finishes.uid('fire-fade'), fade = C.finishes.svg('linearGradient', { id: fadeId, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    C.finishes.svg('stop', { offset: 0.7, 'stop-color': '#fff' }, fade);
    C.finishes.svg('stop', { offset: 1, 'stop-color': '#000' }, fade);
    var mask = C.finishes.svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 400, height: 120 }, defs);
    C.finishes.svg('rect', { width: 400, height: 120, fill: 'url(#' + fadeId + ')' }, mask);
    C.finishes.svg('rect', { x: 18, y: 0, width: 364, height: 60, fill: '#000' }, mask);
    var fire = C.finishes.svg('g', { mask: 'url(#' + maskId + ')' }, svg);
    var random = C.art.random(card.art.seed), flames = [];
    for (var i = 0; i < cfg.flameCount; i += 1) {
      var x = i / (cfg.flameCount - 1) * 400, side = i < 2 || i >= cfg.flameCount - 2;
      var height = side ? 72 + random() * 20 : 35 + random() * 38;
      var width = 7 + random() * 9, curl = -8 + random() * 16;
      var tongue = C.finishes.svg('path', { d: 'M' + (x - width) + ' 100C' + (x - width * 1.6) + ' ' + (100 - height * 0.5) + ' ' + (x + curl + 8) + ' ' + (100 - height * 0.7) + ' ' + (x + curl) + ' ' + (100 - height) + 'C' + (x + curl - 3) + ' ' + (100 - height * 0.5) + ' ' + (x + width * 1.5) + ' ' + (100 - height * 0.3) + ' ' + (x + width) + ' 100Z', fill: 'url(#' + fireId + ')', class: 'finish-flame' }, fire);
      flames.push({ el: tongue, phase: random() * Math.PI * 2 });
    }
    (context.propElement || element).appendChild(prop);
    return { el: element, prop: prop, shine: shine, flames: flames, time: 0 };
  }
  C.finishes.register('mythical', {
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.mythical;
      state.shine.style.opacity = 0.1 + 0.8 * (1 - Math.cos(state.time / cfg.shineCycleMs * Math.PI * 2)) / 2;
      state.shine.style.setProperty('--ruby-ray', (25 + Math.sin(state.time / cfg.shineCycleMs * Math.PI * 2) * 35) + '%');
      state.flames.forEach(function (flame) {
        var phase = state.time / cfg.flameCycleMs * Math.PI * 2 + flame.phase, energy = (1 + Math.sin(phase)) / 2;
        flame.el.style.transform = 'scaleX(' + (0.82 + energy * 0.18) + ') scaleY(' + (cfg.flameScaleMin + energy * (cfg.flameScaleMax - cfg.flameScaleMin)) + ') rotate(' + Math.sin(phase) * 3 + 'deg)';
        flame.el.style.opacity = 0.45 + energy * 0.5;
      });
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable);
