(function (C, root) {
  'use strict';
  function node(tag, className, parent, text) {
    var el = root.document.createElement(tag); el.className = className;
    if (text != null) el.textContent = text; if (parent) parent.appendChild(el); return el;
  }
  function unit(parent, back, pack) {
    var el = node('div', 'pack-unit' + (back ? ' pack-unit--back' : ''), parent);
    el.setAttribute('aria-hidden', 'true'); el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
    var pose = node('div', 'pack-pose', el), glass = node('div', 'pack-body glass', pose);
    var fluid = node('div', 'pack-fluid', glass); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    var specks = [], random = C.art.random(C.config.menuMotion.speckCount);
    for (var i = 0; i < C.config.menuMotion.speckCount; i++) {
      var speck = node('i', 'pack-speck', fluid), inset = C.config.menuMotion.speckInsetPercent;
      speck.style.left = (inset + random() * (100 - inset * 2)) + '%'; speck.style.top = (inset + random() * (100 - inset * 2)) + '%';
      specks.push({ el: speck, phase: random() * Math.PI * 2 });
    }
    var wrapper = node('div', 'pack-wrapper', glass); node('div', 'pack-crimp pack-crimp--top', wrapper); node('div', 'pack-crimp pack-crimp--bottom', wrapper);
    node('div', 'pack-wrapper__grain', wrapper); node('div', 'pack-shine', wrapper);
    node('div', 'pack-brand', glass, C.config.gameName.toLowerCase()); node('div', 'pack-label', glass, pack.name);
    node('div', 'pack-arrival-sweep', glass);
    return { el: el, pose: pose, fluid: fluid, specks: specks };
  }
  C.packView = {
    initialized: false, visible: true, stats: { updates: 0, readyMoments: 0 },
    setVisible: function (value) { C.packView.visible = value; C.fx.wake(); },
    init: function () {
      if (C.packView.initialized) return; C.packView.initialized = true;
      var host = root.document.getElementById('pack-stage'), cfg = C.config.menuMotion;
      var pack = C.data.packs.find(function (item) { return item.enabled && item.obtainable === 'timer'; });
      if (!pack) { host.hidden = true; C.packView.visible = false; return; }
      host.dataset.pack = pack.id;
      var back = unit(host, true, pack), front = unit(host, false, pack);
      var meta = node('div', 'pack-meta idle-chrome entrance', host); meta.style.setProperty('--entry', 2);
      var timer = node('div', 'pack-timer', meta); timer.setAttribute('role', 'timer'); timer.setAttribute('aria-live', 'off');
      var digits = C.numbers.create(node('span', '', timer));
      var stock = node('div', 'pack-stock', meta); stock.setAttribute('role', 'img');
      var vials = [];
      for (var i = 0; i < C.config.packs.maxStored; i++) {
        var vial = node('div', 'stock-vial glass', stock); vial.setAttribute('aria-hidden', 'true');
        var fill = node('div', 'stock-vial__fill', vial); node('div', 'stock-vial__meniscus', fill);
        vials.push({ el: vial, fill: fill, value: i < C.state.current.packs.ready ? 1 : 0, from: 0, target: 0, start: null });
      }
      var hint = node('div', 'pack-key-hint idle-chrome', host); hint.setAttribute('aria-hidden', 'true'); node('kbd', '', hint, 'Space');
      var ready = C.state.current.packs.ready, pendingGain = 0, arrivalStart = null, time = 0, px = 0.5, py = 0.5;
      var gallery = new URLSearchParams(root.location.search).get('gallery') === '1' && new URLSearchParams(root.location.search).get(C.config.dev.queryFlag) === '1';
      if (gallery) C.packView.visible = false;
      function refresh(initial) {
        var state = C.state.current, next = state.packs.ready, now = root.performance.now();
        if (!initial && next > ready) pendingGain = next - ready;
        if (next < ready) { pendingGain = 0; arrivalStart = null; host.classList.remove('is-arriving'); }
        ready = next; host.dataset.state = ready > 0 ? 'ready' : 'waiting'; host.dataset.ready = ready;
        back.el.style.opacity = ready >= C.config.packs.maxStored ? cfg.backOpacity : 0;
        host.classList.toggle('is-first-visit', !state.tutorial.done && state.stats.packsOpened === 0);
        stock.setAttribute('aria-label', ready + ' of ' + C.config.packs.maxStored + ' packs stored');
        host.setAttribute('aria-label', pack.name + ': ' + (ready ? ready + ' ready' : 'regenerating'));
        vials.forEach(function (vial, i) {
          var target = i < ready ? 1 : 0;
          if (initial) { vial.value = target; vial.target = target; }
          else if (target !== vial.target) { vial.from = vial.value; vial.target = target; vial.start = now; }
          vial.fill.style.transform = 'translateY(' + (1 - vial.value) * 100 + '%)';
        });
        C.fx.wake();
      }
      function arrival(event) {
        if (!event || event.simulated || !pendingGain || event.ready !== ready) return;
        pendingGain = 0;
        if (!C.packView.visible || root.document.hidden) return;
        C.packView.stats.readyMoments += 1; arrivalStart = root.performance.now(); host.classList.add('is-arriving'); C.fx.wake();
      }
      C.packView.el = host; C.packView.front = front; C.packView.back = back; C.packView.vials = vials; C.packView.digits = digits;
      C.events.on('save:written', function () { refresh(false); });
      C.events.on('pack:ready', arrival);
      C.events.on('pack:opened', function () { refresh(false); });
      C.events.on('pointer:move', function () { C.fx.wake(); });
      C.events.on('pointer:leave', function () { C.fx.wake(); });
      C.events.on('motion:changed', function () { C.fx.wake(); });
      host.addEventListener('pointerenter', function () { host.classList.add('is-hovered'); });
      host.addEventListener('pointerleave', function () { host.classList.remove('is-hovered'); });
      C.events.on('fx:visibility', function (visible) {
        // A completed one-shot is not replayed when returning from a hidden tab.
        if (visible && arrivalStart !== null && root.performance.now() - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
      });
      refresh(true);
      C.fx.subscribe(function (now, dt) {
        if (!C.packView.visible) return false;
        C.packView.stats.updates += 1; time += dt;
        var reduced = C.motion.reduced, pointer = C.input.pointer;
        var x = pointer.inside ? pointer.x / root.innerWidth : 0.5, y = pointer.inside ? pointer.y / root.innerHeight : 0.5;
        var follow = reduced ? 1 : 1 - Math.exp(-dt / cfg.followMs); px += (x - px) * follow; py += (y - py) * follow;
        var progress = C.timers.progress(Date.now());
        C.packView.progress = progress;
        var fill = ready > 0 ? 1 : progress;
        if (arrivalStart !== null && now - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
        var arrivalP = arrivalStart === null ? 1 : Math.min(1, (now - arrivalStart) / cfg.readyMomentMs);
        host.style.setProperty('--arrival-sweep', (reduced ? 0 : -cfg.sweepTravelPercent + (1 - Math.pow(1 - arrivalP, 3)) * cfg.sweepTravelPercent * 2) + '%');
        host.style.setProperty('--arrival-lift', reduced ? '0px' : -Math.sin(arrivalP * Math.PI) * cfg.arrivalLiftPx + 'px');
        host.style.setProperty('--arrival-opacity', arrivalStart === null ? 0 : Math.sin(arrivalP * Math.PI));
        host.style.setProperty('--shine-x', px * 100 + '%'); host.style.setProperty('--shine-y', py * 100 + '%');
        [front, back].forEach(function (item, index) {
          var wave = reduced ? 0 : Math.sin((time + index * cfg.backPhaseMs) / cfg.floatMs * Math.PI * 2);
          item.pose.style.transform = 'translateY(' + (-wave * cfg.floatPx) + 'px) rotateX(' + (reduced ? 0 : (0.5 - py) * cfg.leanDegrees * 2) + 'deg) rotateY(' + (reduced ? 0 : (px - 0.5) * cfg.leanDegrees * 2) + 'deg)';
          item.el.style.setProperty('--breath-shadow', cfg.shadowOpacity + (reduced ? 0 : wave * cfg.shadowBreath));
          item.fluid.style.transform = 'translateY(' + (1 - fill) * 100 + '%)';
          item.el.style.setProperty('--meniscus-wave', reduced ? '0px' : Math.sin(time / cfg.fluidWaveMs * Math.PI * 2) * cfg.fluidWavePx + 'px');
          if (!ready) item.specks.forEach(function (speck) { speck.el.style.transform = 'translateY(' + (reduced ? 0 : Math.sin(time / cfg.fluidWaveMs * Math.PI * 2 + speck.phase) * cfg.speckTravelPx) + 'px)'; });
        });
        var timerText = ready >= C.config.packs.maxStored ? 'Stock full' : C.timers.format(C.timers.remaining(Date.now()));
        if (timerText !== digits.text) { digits.set(timerText); timer.setAttribute('aria-label', timerText); }
        var active = digits.update(now);
        vials.forEach(function (vial) {
          if (vial.start === null) return;
          var p = Math.min(1, (now - vial.start) / cfg.vialMs), ease = 1 - Math.pow(1 - p, 3);
          vial.value = vial.from + (vial.target - vial.from) * ease;
          vial.fill.style.transform = 'translateY(' + (1 - vial.value) * 100 + '%) rotate(' + (reduced ? 0 : Math.sin(p * Math.PI * cfg.vialOscillations) * (1 - p) * cfg.vialSloshDegrees) + 'deg)';
          if (p === 1) vial.start = null; else active = true;
        });
        // Even with reduced motion the timestamp-derived fluid remains continuous.
        return !reduced || ready < C.config.packs.maxStored || active || arrivalStart !== null;
      });
    }
  };
})(window.Cardable, window);
