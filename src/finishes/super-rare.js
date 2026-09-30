(function (C, root) {
  'use strict';
  // Design: "A blue color with ocean-like animated waves on the blue going/fading to a darker blue with a checkerbox pattern non-animated"
  // propSpec is null: this tier adds no prop.
  function surface(context) {
    var element = C.finishes.surface('super-rare', context);
    var checker = root.document.createElement('div'); checker.className = 'finish-sr-checker'; element.appendChild(checker);
    var ocean = root.document.createElement('div'); ocean.className = 'finish-sr-ocean'; element.appendChild(ocean);
    var bands = [];
    for (var i = 0; i < 3; i += 1) {
      var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 800 360'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('finish-sr-wave'); svg.style.opacity = 0.16 + i * 0.08;
      var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M-400 ' + (70 + i * 55) + 'q100 -55 200 0t200 0t200 0t200 0t200 0t200 0t200 0t200 0V400H-400Z');
      svg.appendChild(path); ocean.appendChild(svg); bands.push(svg);
    }
    return { el: element, bands: bands, time: 0 };
  }
  C.finishes.register('super-rare', {
    mount: function (element, card, context) { var state = surface(context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.superRare;
      state.bands.forEach(function (band, i) {
        var phase = state.time / (cfg.cycleMs * (1 + i * 0.3)) * Math.PI * 2 + i;
        band.style.transform = 'translateX(' + Math.sin(phase) * cfg.travelPercent + '%)';
      });
      return true;
    },
    destroy: function (state) { state.el.remove(); },
    lite: function (card, context) { return surface(context).el; }
  });
})(window.Cardable, window);
