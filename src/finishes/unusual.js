(function (C, root) {
  'use strict';
  // Design: "A purple color with animated white shining coming from the top with slowly boosting down and up (the white)"
  // propSpec is null: this tier adds no prop.
  function surface(context) {
    var element = C.finishes.surface('unusual', context), glow = root.document.createElement('div');
    glow.className = 'finish-unusual-glow'; element.appendChild(glow);
    return { el: element, glow: glow, time: 0 };
  }
  C.finishes.register('unusual', {
    mount: function (element, card, context) { var state = surface(context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.unusual, amount = (1 - Math.cos(state.time / cfg.cycleMs * Math.PI * 2)) / 2;
      state.glow.style.transform = 'scaleY(' + (cfg.glowMinScale + (1 - cfg.glowMinScale) * amount) + ')';
      state.glow.style.opacity = cfg.glowMinOpacity + (1 - cfg.glowMinOpacity) * amount;
      return true;
    },
    destroy: function (state) { state.el.remove(); },
    lite: function (card, context) { return surface(context).el; }
  });
})(window.Cardable, window);
