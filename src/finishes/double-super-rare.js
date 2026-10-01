(function (C, root) {
  'use strict';
  // Design: "A dark blue checkerbox pattern moving to a gold color with animated sparkles and the gold shifting colors with the dark blue following too slowly"
  // propSpec is null: this tier adds no prop.
  function surface(card, context) {
    var element = C.finishes.surface('double-super-rare', context), stars = [], random = C.art.random(card.art.seed);
    for (var i = 0; i < C.config.finishMotion.doubleSuperRare.sparkleCount; i += 1) {
      var star = root.document.createElement('i'); star.className = 'finish-sparkle finish-ssr-sparkle';
      var side = i % 4, along = 7 + random() * 86;
      star.style.left = (side === 0 ? 1.4 : side === 1 ? 98.6 : along) + '%';
      star.style.top = (side === 2 ? 1.1 : side === 3 ? 98.9 : along) + '%';
      var strength = 0.25 + random() * 0.65;
      star.style.opacity = strength; element.appendChild(star);
      stars.push({ el: star, phase: random() * Math.PI * 2, strength: strength });
    }
    return { el: element, stars: stars, time: 0 };
  }
  C.finishes.register('double-super-rare', {
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.doubleSuperRare;
      var gold = Math.sin(state.time / cfg.goldCycleMs * Math.PI * 2), blue = Math.sin(state.time / cfg.blueCycleMs * Math.PI * 2);
      state.el.style.setProperty('--ssr-gold', 'hsl(' + (cfg.goldHue + gold * cfg.goldHueRange) + ' 74% 66%)');
      state.el.style.setProperty('--ssr-blue', 'hsl(' + (cfg.blueHue + blue * cfg.blueHueRange) + ' 65% 21%)');
      state.el.style.setProperty('--ssr-gold-mono', 'hsl(0 0% ' + (73 + gold * 7) + '%)');
      state.el.style.setProperty('--ssr-blue-mono', 'hsl(0 0% ' + (19 + blue * 3) + '%)');
      state.stars.forEach(function (star) {
        star.el.style.opacity = star.strength * (0.25 + 0.75 * Math.pow(Math.sin(state.time / 1000 * cfg.sparkleSpeed + star.phase), 4));
      });
      return true;
    },
    destroy: function (state) { state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable, window);
