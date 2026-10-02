(function (C, root) {
  'use strict';
  var reward = null;
  function clear() {
    if (!reward) return;
    reward.el.remove(); reward.counter.classList.remove('has-pack-reward'); reward = null;
    C.events.emit('menu:visibilityHold', { reason: 'pack-reward', active: false });
  }
  C.events.on('pack:reward', function (change) {
    clear();
    var counter = root.document.getElementById('currency-counter'), cfg = C.config.currency;
    var target = counter.getBoundingClientRect(), source = change.source;
    var el = root.document.createElement('div'); el.className = 'pack-reward'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    var receipt = root.document.createElement('span'); receipt.className = 'pack-reward__receipt'; receipt.textContent = '+' + cfg.symbol + change.amount;
    receipt.style.left = source.left + source.width / 2 + 'px'; receipt.style.top = source.top + source.height / 2 + 'px'; el.appendChild(receipt);
    var coins = [];
    if (!C.motion.reduced) for (var i = 0; i < Math.ceil(cfg.rewardCoins * C.settings.policy.particles); i += 1) {
      var coin = root.document.createElement('span'); coin.className = 'pack-reward__coin'; coin.textContent = cfg.symbol; coin.setAttribute('aria-hidden', 'true');
      coin.style.left = source.left + source.width / 2 + 'px'; coin.style.top = source.top + source.height / 2 + 'px'; el.appendChild(coin);
      coins.push({ el: coin, delay: i * 55, arc: 80 + i * 18, spread: (i - (cfg.rewardCoins - 1) / 2) * 11 });
    }
    root.document.body.appendChild(el); counter.classList.add('has-pack-reward');
    reward = { el: el, counter: counter, receipt: receipt, coins: coins, born: root.performance.now(),
      dx: target.left + target.width / 2 - source.left - source.width / 2, dy: target.top + target.height / 2 - source.top - source.height / 2 };
    C.events.emit('menu:visibilityHold', { reason: 'pack-reward', active: true });
    C.fx.wake();
  });
  C.fx.subscribe(function (now) {
    if (!reward) return false;
    var age = now - reward.born, cfg = C.config.currency;
    reward.receipt.style.opacity = Math.min(1, age / 140, (cfg.rewardHoldMs - age) / 220);
    reward.receipt.style.transform = 'translate(-50%,-50%) translateY(' + (C.motion.reduced ? 0 : -Math.min(age / 6, 35)) + 'px)';
    reward.coins.forEach(function (coin) {
      var p = Math.max(0, Math.min(1, (age - coin.delay) / (cfg.rewardFlightMs - coin.delay))), e = p * p * (3 - 2 * p);
      coin.el.style.opacity = age < coin.delay ? 0 : Math.min(1, p * 9, (1 - p) * 12);
      coin.el.style.transform = 'translate(-50%,-50%) translate3d(' + (reward.dx * e + Math.sin(p * Math.PI) * coin.spread) + 'px,' + (reward.dy * e - Math.sin(p * Math.PI) * coin.arc) + 'px,0) rotateY(' + p * 540 + 'deg) scale(' + (1 - p * .5) + ')';
    });
    if (age >= cfg.rewardHoldMs) clear();
    return !!reward;
  }, 'pack-reward');
  C.events.on('save:reset', clear);
  C.events.on('motion:changed', function () { if (reward) { reward.coins.forEach(function (coin) { coin.el.remove(); }); reward.coins = []; } });
  C.events.on('fx:visibility', function (visible) { if (!visible) clear(); });
})(window.Cardable, window);
