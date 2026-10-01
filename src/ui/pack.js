(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, unit = C.packMarkup.unit, openingPaused = false, inventoryPaused = false;
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
      var interaction = C.packInteraction.create(host), frontMaterial = C.packMaterial.create(front.el, pack), backMaterial = C.packMaterial.create(back.el, pack);
      var frontFluid = C.packFluid.create(front), backFluid = C.packFluid.create(back);
      C.packView.interaction = interaction; C.packView.fluidController = frontFluid;
      C.packView.snapshot = function () { return Object.assign({}, interaction.state); };
      host.setAttribute('role', 'group');
      host.setAttribute('aria-description', 'Drag to inspect the sealed wrapper. Hold Space to open when ready. Press V for a closer look; Escape returns.');
      var meta = node('div', 'pack-meta idle-chrome entrance', host); meta.style.setProperty('--entry', 2);
      var timer = node('div', 'pack-timer', meta); timer.setAttribute('role', 'timer'); timer.setAttribute('aria-live', 'off');
      var action = node('button', 'pack-open-action', meta, 'Open pack'); action.type = 'button';
      action.setAttribute('aria-label', 'Hold to open pack');
      var chargePointer = null;
      action.addEventListener('pointerdown', function (event) { if (event.button !== 0 || action.disabled) return; event.preventDefault(); chargePointer = event.pointerId; C.input.chargeStart(); });
      function endCharge(event) { if (chargePointer !== null && event.pointerId === chargePointer) { chargePointer = null; C.input.chargeEnd(); } }
      root.document.addEventListener('pointerup', endCharge); root.document.addEventListener('pointercancel', endCharge);
      C.events.on('input:cancel', function () { chargePointer = null; });
      var digits = C.numbers.create(node('span', '', timer));
      var stock = node('div', 'pack-stock', meta); stock.setAttribute('role', 'img');
      var vials = [];
      for (var i = 0; i < C.config.packs.maxStored; i++) {
        var vial = node('div', 'stock-card', stock); vial.setAttribute('aria-hidden', 'true');
        var face = node('div', 'stock-card__face', vial);
        var fill = node('div', 'stock-card__fill', face); node('div', 'stock-card__meniscus', fill);
        node('span', 'stock-card__mark', face, 'c');
        node('div', 'stock-card__shine', face);
        var initialFill = i < C.state.current.packs.ready ? 1 : i === C.state.current.packs.ready ? C.timers.progress(Date.now()) : 0;
        vials.push({ el: vial, fill: fill, value: initialFill, from: 0, target: 0, start: null, arrival: null });
      }
      var hint = node('div', 'pack-key-hint idle-chrome', host); hint.setAttribute('aria-hidden', 'true'); node('kbd', '', hint, 'Space');
      function updateOpeningKey() { hint.querySelector('kbd').textContent = C.settings.holdKey; var description = host.getAttribute('aria-description'); if (description) host.setAttribute('aria-description', description.replace(/Hold (Space|Enter)/, 'Hold ' + C.settings.holdKey)); }
      C.settings.onChange('openKey', updateOpeningKey); updateOpeningKey();
      var ready = C.state.current.packs.ready, pendingGain = 0, arrivalStart = null, time = 0, handoff = null;
      host.style.setProperty('--pack-reflection-opacity', cfg.reflectionOpacity);
      var gallery = new URLSearchParams(root.location.search).get('gallery') === '1' && new URLSearchParams(root.location.search).get(C.config.dev.queryFlag) === '1';
      if (gallery) C.packView.visible = false;
      function refresh(initial) {
        var state = C.state.current, next = state.packs.ready, now = root.performance.now();
        if (!initial && next > ready) pendingGain = next - ready;
        if (next < ready) { pendingGain = 0; arrivalStart = null; host.classList.remove('is-arriving'); }
        ready = next; host.dataset.state = ready > 0 ? 'ready' : 'waiting'; host.dataset.ready = ready;
        back.el.style.opacity = ready > 1 ? cfg.backOpacity : 0;
        host.classList.toggle('is-first-visit', !state.tutorial.done && state.stats.packsOpened === 0);
        stock.setAttribute('aria-label', ready + ' of ' + C.config.packs.maxStored + ' packs stored');
        host.setAttribute('aria-label', pack.name + ': ' + (ready ? ready + ' ready' : 'regenerating'));
        action.disabled = ready <= 0; action.hidden = ready <= 0;
        timer.dataset.label = ready >= C.config.packs.maxStored ? 'PACK STORAGE' : ready > 0 ? 'NEXT PACK' : 'REGENERATING';
        vials.forEach(function (vial, i) {
          var target = i < ready ? 1 : 0;
          if (initial) { vial.target = target; }
          else if (target !== vial.target) {
            vial.from = vial.value; vial.target = target; vial.start = now;
            vial.arrival = target ? now : null;
          }
          vial.el.classList.toggle('is-ready', !!target);
          vial.el.classList.toggle('is-refilling', i === ready && ready < C.config.packs.maxStored);
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
      C.packView.stockCards = vials;
      C.events.on('save:written', function () { refresh(false); });
      C.events.on('pack:ready', arrival);
      C.events.on('pack:opened', function () { refresh(false); });
      C.events.on('pointer:move', function () { C.fx.wake(); });
      C.events.on('pointer:leave', function () { C.fx.wake(); });
      C.events.on('motion:changed', function () { C.fx.wake(); });
      C.events.on('opening:context', function (event) { openingPaused = event.active; C.fx.wake(); });
      C.events.on('inventory:context', function (event) { inventoryPaused = event.active; C.fx.wake(); });
      C.events.on('pack:handoff', function () { if (ready) handoff = 0; C.fx.wake(); });
      C.events.on('save:reset', function () { handoff = null; front.el.style.transform = ''; });
      C.events.on('fx:visibility', function (visible) {
        // A completed one-shot is not replayed when returning from a hidden tab.
        if (visible && arrivalStart !== null && root.performance.now() - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
      });
      refresh(true);
      C.fx.subscribe(function (now, dt) {
        if (!C.packView.visible || openingPaused || inventoryPaused) return false;
        C.packView.stats.updates += 1; time += dt;
        if (handoff !== null) {
          handoff += dt; var slide = Math.min(1, handoff / C.config.revealMotion.packSlideMs);
          front.el.style.transform = C.motion.reduced ? 'none' : 'translate(' + (1 - slide) * C.config.revealMotion.packSlidePx + 'px,' + (slide - 1) * C.config.revealMotion.packSlidePx + 'px)';
          if (slide === 1) { handoff = null; front.el.style.transform = ''; }
        }
        var reduced = C.motion.reduced; interaction.update(dt); var pose = interaction.state;
        var rx = pose.rx, ry = pose.ry;
        var progress = C.timers.progress(Date.now());
        C.packView.progress = progress;
        var fill = ready > 0 ? 1 : progress;
        if (arrivalStart !== null && now - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
        var arrivalP = arrivalStart === null ? 1 : Math.min(1, (now - arrivalStart) / cfg.readyMomentMs);
        host.style.setProperty('--arrival-sweep', (reduced ? 0 : -cfg.sweepTravelPercent + (1 - Math.pow(1 - arrivalP, 3)) * cfg.sweepTravelPercent * 2) + '%');
        host.style.setProperty('--arrival-lift', reduced ? '0px' : -Math.sin(arrivalP * Math.PI) * cfg.arrivalLiftPx + 'px');
        host.style.setProperty('--arrival-opacity', arrivalStart === null ? 0 : Math.sin(arrivalP * Math.PI));
        [front, back].forEach(function (item, index) {
          if (index && ready < 2) return;
          var lift = index === 0 && !reduced && arrivalStart !== null ? -Math.sin(arrivalP * Math.PI) * cfg.arrivalLiftPx : 0;
          var amount = index ? 0.35 : 1;
          item.pose.style.transform = 'translate3d(' + pose.x * amount + 'px,' + (pose.y * amount - pose.lift * amount + lift) + 'px,' + pose.lift * amount + 'px) rotateX(' + rx * amount + 'deg) rotateY(' + ry * amount + 'deg) rotateZ(' + pose.rz * amount + 'deg) scale(' + (1 - pose.grip * 0.008) + ')';
          item.shadow.style.opacity = cfg.shadowOpacity - pose.lift * 0.003;
          item.shadow.style.transform = 'translate(' + (8 + pose.x * amount - ry * 0.4) + 'px,' + (12 + pose.y * amount + pose.lift * 0.35) + 'px) scale(' + (1 + pose.lift * 0.009) + ')';
          item.el.style.setProperty('--mass-x', (pose.massX - pose.x) * 0.045 + 'px');
          item.el.style.setProperty('--mass-y', (pose.massY - pose.y) * 0.045 + 'px');
          item.el.style.setProperty('--wrapper-flex', pose.flex * pose.grip * 1.1 + 'deg');
          (index ? backMaterial : frontMaterial).update(index ? { rx: rx * amount, ry: ry * amount } : pose, index ? 0 : time, reduced);
          (index ? backFluid : frontFluid).update(dt, fill, pose, reduced);
          if (!ready) item.specks.forEach(function (speck) { speck.el.style.transform = 'translateY(' + (reduced ? 0 : Math.sin(time / cfg.fluidWaveMs * Math.PI * 2 + speck.phase) * cfg.speckTravelPx) + 'px)'; });
        });
        var timerText = ready >= C.config.packs.maxStored ? 'Stock full' : C.timers.format(C.timers.remaining(Date.now()));
        if (timerText !== digits.text) { digits.set(timerText); timer.setAttribute('aria-label', timerText); }
        var active = digits.update(now);
        vials.forEach(function (vial, index) {
          if (vial.start !== null) {
            var p = Math.min(1, (now - vial.start) / cfg.vialMs), ease = 1 - Math.pow(1 - p, 3);
            var endValue = index < ready ? 1 : index === ready ? progress : 0;
            vial.value = vial.from + (endValue - vial.from) * ease;
            if (p === 1) vial.start = null; else active = true;
          } else vial.value = index < ready ? 1 : index === ready ? progress : 0;
          vial.fill.style.transform = 'translateY(' + (1 - vial.value) * 100 + '%)';
          if (vial.arrival !== null) {
            var arriveP = Math.min(1, (now - vial.arrival) / cfg.stockShineMs);
            vial.el.style.transform = reduced ? 'none' : 'translateY(' + -Math.sin(arriveP * Math.PI) * cfg.stockLiftPx + 'px)';
            vial.el.style.setProperty('--stock-shine-x', (reduced ? 0 : -130 + arriveP * 260) + '%');
            vial.el.style.setProperty('--stock-shine-opacity', Math.sin(arriveP * Math.PI));
            if (arriveP === 1) { vial.arrival = null; vial.el.style.transform = ''; vial.el.style.setProperty('--stock-shine-opacity', 0); }
            else active = true;
          }
        });
        // Even with reduced motion the timestamp-derived fluid remains continuous.
        return !reduced || ready < C.config.packs.maxStored || active || arrivalStart !== null || handoff !== null;
      }, 'pack');
    }
  };
})(window.Cardable, window);
