(function (C) {
  'use strict';
  function surface(context) {
    var el = C.finishes.surface('common', context);
    C.finishes.element('div', 'finish-common-orbit', el); return el;
  }
  C.finishes.register('common', {
    mount: function (host, card, context) { var el = surface(context); host.appendChild(el); return { el: el, time: 0 }; },
    update: function (dt, pointer, state) { var cycle = C.config.finishMotion.common.cycleMs; state.time = (state.time + dt) % cycle; state.el.style.setProperty('--common-angle', state.time / cycle * 360 + 'deg'); return true; },
    destroy: function (state) { state.el.remove(); },
    lite: function (card, context) { return surface(context); }
  });
})(window.Cardable);
