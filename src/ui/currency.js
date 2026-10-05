(function (C, root) {
  'use strict';
  var coinSvg = '<svg class="currency-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="currency-mark__edge" cx="16" cy="16" r="14.4"/><circle class="currency-mark__face" cx="16" cy="16" r="11.6"/><circle class="currency-mark__ring" cx="16" cy="16" r="8.6"/><path class="currency-mark__glyph" d="M20 11.1c-1-1.2-2.2-1.9-4-1.9-3.1 0-5.2 2.8-5.2 6.8s2.1 6.8 5.2 6.8c1.8 0 3-.7 4-1.9"/></svg>';
  function grouped(amount) { return Number(amount).toLocaleString(); }

  C.currencyView = {
    initialized: false,
    init: function () {
      if (C.currencyView.initialized) return;
      C.currencyView.initialized = true;
      var host = root.document.getElementById('currency-counter');
      var mark = root.document.createElement('span'), balance = root.document.createElement('span');
      var label = root.document.createElement('span'), number = root.document.createElement('span');
      var shimmer = root.document.createElement('span'), feed = root.document.createElement('span');
      mark.className = 'currency-mark-wrap'; mark.innerHTML = coinSvg;
      balance.className = 'currency-balance';
      label.className = 'currency-label'; label.textContent = C.config.currency.name;
      number.className = 'currency-value';
      shimmer.className = 'currency-shimmer'; shimmer.setAttribute('aria-hidden', 'true');
      feed.className = 'currency-feed'; feed.setAttribute('aria-live', 'polite'); feed.setAttribute('aria-atomic', 'false');
      balance.appendChild(label); balance.appendChild(number);
      host.appendChild(mark); host.appendChild(balance); host.appendChild(shimmer); host.appendChild(feed);

      var digits = C.numbers.create(number), value = C.state.current.currency, from = value, target = value, start = null, shimmerStart = null;
      digits.set(C.config.currency.symbol + grouped(value), false);
      host.setAttribute('role', 'group'); host.setAttribute('aria-label', C.config.currency.name + ': ' + value);

      function refresh() {
        var next = C.state.current.currency;
        if (next === target) return;
        from = value; target = next; start = root.performance.now(); shimmerStart = C.settings.policy.glareHz > 0 ? start : null;
        host.setAttribute('aria-label', C.config.currency.name + ': ' + grouped(target)); C.fx.wake();
      }
      function feedback(change) {
        if (!change || !change.amount) return;
        var gain = change.direction > 0;
        var receipt = root.document.createElement('span');
        receipt.className = 'currency-receipt ' + (gain ? 'is-gain' : 'is-loss');
        receipt.textContent = (gain ? '+' : '−') + grouped(change.amount) + ' ' + C.config.currency.name.toUpperCase();
        feed.appendChild(receipt);
        root.setTimeout(function () { if (receipt.parentNode) receipt.parentNode.removeChild(receipt); }, 1350);
        if (gain && !C.motion.reduced && C.settings.policy.animation > 0 && C.settings.policy.particles > 0) {
          var rect = host.getBoundingClientRect();
          for (var i = 0; i < Math.ceil(8 * C.settings.policy.particles); i++) {
            var coin = root.document.createElement('span');
            coin.className = 'currency-flight'; coin.innerHTML = coinSvg;
            var flightX = ((i % 4) - 1.5) * (12 + (i % 3) * 6);
            coin.style.setProperty('--flight-x', flightX + 'px');
            coin.style.setProperty('--flight-x-reverse', -flightX + 'px');
            coin.style.setProperty('--flight-y', (48 + (i % 3) * 15) + 'px');
            coin.style.setProperty('--flight-delay', (i * 34) + 'ms');
            coin.style.left = (rect.width * (0.52 + ((i % 4) - 1.5) * 0.09)) + 'px';
            coin.style.top = (rect.height * 0.85 + (i % 2) * 9) + 'px';
            host.appendChild(coin);
            (function (particle) { root.setTimeout(function () { if (particle.parentNode) particle.parentNode.removeChild(particle); }, 1300); })(coin);
          }
        }
      }
      function insufficient(result) {
        var receipt = root.document.createElement('span');
        receipt.className = 'currency-receipt is-loss';
        receipt.textContent = 'NEED ' + grouped(result.requested - result.available) + ' MORE';
        feed.appendChild(receipt);
        root.setTimeout(function () { if (receipt.parentNode) receipt.parentNode.removeChild(receipt); }, 1350);
      }

      C.events.on('save:written', refresh); C.events.on('currency:changed', function (change) { refresh(); feedback(change); });
      C.events.on('currency:insufficient', insufficient);
      C.currencyView.el = host; C.currencyView.digits = digits;
      C.fx.subscribe(function (now) {
        var cfg = C.config.menuMotion;
        if (start !== null) {
          var p = C.motion.reduced || !C.settings.policy.animation ? 1 : Math.min(1, (now - start) / cfg.currencyMs);
          value = p === 1 ? target : Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
          digits.set(C.config.currency.symbol + grouped(value), !C.motion.reduced);
          if (p === 1) start = null;
        }
        if (shimmerStart !== null) {
          var shineP = Math.min(1, (now - shimmerStart) / cfg.shimmerMs);
          shimmer.style.transform = 'translateX(' + (C.motion.reduced ? 0 : -cfg.sweepTravelPercent + (1 - Math.pow(1 - shineP, 3)) * cfg.sweepTravelPercent * 2) + '%)';
          shimmer.style.opacity = Math.sin(shineP * Math.PI) * cfg.shimmerOpacity;
          if (shineP === 1) shimmerStart = null;
        }
        return digits.update(now) || start !== null || shimmerStart !== null;
      }, 'currency');
    }
  };
})(window.Cardable, window);
