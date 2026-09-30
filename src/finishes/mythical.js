(function (C) {
  'use strict';
  // Design: "A ruby like color which slowly goes from a basic to a shining one"
  // Prop: "White to red flames outside the nametag having a burning flame animation from the bottom only"
  function surface(card, context) {
    var cfg = C.config.finishMotion.mythical, element = C.finishes.surface('mythical', context);
    var shine = C.finishes.element('div', 'finish-mythical-shine', element);
    var prop = C.finishes.surface('mythical-prop', context); prop.classList.add('finish-prop');
    var nametag = C.finishes.element('div', 'finish-mythical-nametag', prop);
    var label = C.finishes.element('div', 'card__name finish-mythical-label-measure', nametag); label.textContent = card.name; label.setAttribute('aria-hidden', 'true');
    var svg = C.finishes.svg('svg', { viewBox: '0 0 400 100', preserveAspectRatio: 'none', class: 'finish-mythical-flames', 'aria-hidden': 'true' }, nametag);
    var defs = C.finishes.svg('defs', {}, svg), fireId = C.finishes.uid('fire'), maskId = C.finishes.uid('nametag');
    var gradient = C.finishes.svg('linearGradient', { id: fireId, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    C.finishes.svg('stop', { offset: 0, 'stop-color': 'var(--highlight)' }, gradient);
    C.finishes.svg('stop', { offset: 0.45, 'stop-color': 'var(--flame-middle)' }, gradient);
    C.finishes.svg('stop', { offset: 1, 'stop-color': 'var(--flame-tip)' }, gradient);
    var mask = C.finishes.svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 400, height: 100 }, defs);
    C.finishes.svg('rect', { width: 400, height: 100, fill: '#fff' }, mask);
    C.finishes.svg('rect', { x: 14, y: 23, width: 372, height: 54, fill: '#000' }, mask);
    var fire = C.finishes.svg('g', { mask: 'url(#' + maskId + ')' }, svg);
    var random = C.art.random(card.art.seed), flames = [];
    for (var i = 0; i < cfg.flameCount; i += 1) {
      var x = i / (cfg.flameCount - 1) * 400, side = i < 2 || i >= cfg.flameCount - 2;
      var height = side ? 65 + random() * 20 : 12 + random() * 12;
      var tongue = C.finishes.svg('path', { d: 'M' + (x - 9) + ' 100Q' + (x - 14) + ' ' + (100 - height * 0.5) + ' ' + (x + 3) + ' ' + (100 - height) + 'Q' + (x + 8) + ' ' + (100 - height * 0.5) + ' ' + (x + 9) + ' 100Z', fill: 'url(#' + fireId + ')', class: 'finish-flame' }, fire);
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
      state.flames.forEach(function (flame) {
        var phase = state.time / cfg.flameCycleMs * Math.PI * 2 + flame.phase, energy = (1 + Math.sin(phase)) / 2;
        flame.el.style.transform = 'scaleY(' + (cfg.flameScaleMin + energy * (cfg.flameScaleMax - cfg.flameScaleMin)) + ')';
        flame.el.style.opacity = 0.45 + energy * 0.5;
      });
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable);
