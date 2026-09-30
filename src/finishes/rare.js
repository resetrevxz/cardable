(function (C, root) {
  'use strict';
  function surface(card, context) {
    var element = C.finishes.surface('rare', context), stars = [], random = C.art.random(card.art.seed);
    for (var i = 0; i < C.config.cardView.sparkleCount; i += 1) {
      var star = root.document.createElement('i');
      star.className = 'finish-sparkle';
      star.style.left = (8 + random() * 84) + '%'; star.style.top = (5 + random() * 38) + '%';
      var phase = random() * Math.PI * 2, strength = 0.25 + random() * 0.6;
      star.style.opacity = strength;
      element.appendChild(star); stars.push({ el: star, phase: phase, strength: strength });
    }
    return { el: element, stars: stars, time: 0 };
  }
  C.finishes.register('rare', {
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt / 1000;
      state.stars.forEach(function (star) { star.el.style.opacity = star.strength * (0.35 + 0.65 * Math.pow(Math.sin(state.time * 1.5 + star.phase), 4)); });
      return true;
    },
    destroy: function (state) { state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable, window);
