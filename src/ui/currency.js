(function (C, root) {
  'use strict';
  C.currencyView = {
    initialized: false,
    init: function () {
      if (C.currencyView.initialized) return; C.currencyView.initialized = true;
      var host = root.document.getElementById('currency-counter'), number = root.document.createElement('span'), shimmer = root.document.createElement('span');
      shimmer.className = 'currency-shimmer'; shimmer.setAttribute('aria-hidden', 'true'); host.appendChild(number); host.appendChild(shimmer);
      var digits = C.numbers.create(number), value = C.state.current.currency, from = value, target = value, start = null, shimmerStart = null;
      digits.set(C.config.currency.symbol + value, false);
      host.setAttribute('aria-label', C.config.currency.name + ': ' + value);
      function refresh() {
        var next = C.state.current.currency; if (next === target) return;
        from = value; target = next; start = root.performance.now(); shimmerStart = start;
        host.setAttribute('aria-label', C.config.currency.name + ': ' + target); C.fx.wake();
      }
      C.events.on('save:written', refresh); C.events.on('currency:changed', refresh);
      C.currencyView.el = host; C.currencyView.digits = digits;
      C.fx.subscribe(function (now) {
        var cfg = C.config.menuMotion;
        if (start !== null) {
          var p = Math.min(1, (now - start) / cfg.currencyMs);
          value = p === 1 ? target : Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
          digits.set(C.config.currency.symbol + value, !C.motion.reduced);
          if (p === 1) start = null;
        }
        if (shimmerStart !== null) {
          var shineP = Math.min(1, (now - shimmerStart) / cfg.shimmerMs);
          shimmer.style.transform = 'translateX(' + (C.motion.reduced ? 0 : -cfg.sweepTravelPercent + (1 - Math.pow(1 - shineP, 3)) * cfg.sweepTravelPercent * 2) + '%)';
          shimmer.style.opacity = Math.sin(shineP * Math.PI) * cfg.shimmerOpacity;
          if (shineP === 1) shimmerStart = null;
        }
        return digits.update(now) || start !== null || shimmerStart !== null;
      });
    }
  };
})(window.Cardable, window);
