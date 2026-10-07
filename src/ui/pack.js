(function (C, root) {
  'use strict';
  function cachedStyle(el, key, value) {
    var cache = el._packStyles || (el._packStyles = {}); value = String(value);
    if (cache[key] === value) return; cache[key] = value;
    if (key.indexOf('--') === 0) el.style.setProperty(key, value); else el.style[key] = value;
  }
  var node = C.packMarkup.node, unit = C.packMarkup.unit, openingPaused = false, inventoryPaused = false;
  C.packView = {
    initialized: false, visible: true, stats: { updates: 0, readyMoments: 0 },
    setVisible: function (value) { C.packView.visible = value; C.fx.wake(); },
    init: function () {
      if (C.packView.initialized) return; C.packView.initialized = true;
      var host = root.document.getElementById('pack-stage'), cfg = C.config.menuMotion;
      var pack = C.packs.upcoming(1)[0], rearPack = C.packs.upcoming(2)[1];
      if (!pack) { host.hidden = true; C.packView.visible = false; return; }
      host.dataset.pack = pack.id;
      var back = unit(host, true, rearPack), front = unit(host, false, pack);
      var interaction = C.packInteraction.create(host), frontMaterial = C.packMaterial.create(front.el, pack), backMaterial = C.packMaterial.create(back.el, rearPack);
      var frontFluid = C.packFluid.create(front), backFluid = C.packFluid.create(back);
      node('div', 'pack-preview-back', front.el, C.config.gameName);
      var previewSwap = null;
      var previewEffect=null;
      function clearPreviewEffect(){if(previewEffect)previewEffect.destroy();previewEffect=null;}
      function adopt(nextPack) {
        pack = nextPack; C.packMarkup.setPack(front.el, pack);
        frontMaterial = C.packMaterial.create(front.el, pack);
      }
      C.packView.interaction = interaction; C.packView.fluidController = frontFluid;
      C.packView.snapshot = function () { return Object.assign({}, interaction.state); };
      host.setAttribute('role', 'group');
      host.setAttribute('aria-description', 'Drag to inspect the sealed wrapper. Hold Space to open when ready. Press V for a closer look; Escape returns.');
      var meta = node('div', 'pack-meta idle-chrome entrance', host); meta.dataset.tutorialTarget='timer'; meta.style.setProperty('--entry', 2);
      var timer = node('div', 'pack-timer', meta); timer.setAttribute('role', 'timer'); timer.setAttribute('aria-live', 'off');
      var action = node('button', 'pack-open-action', meta, 'Open pack'); action.type = 'button';
      action.setAttribute('aria-label', 'Hold to open pack');
      var chargePointer = null;
      action.addEventListener('pointerdown', function (event) { if (event.button !== 0 || action.disabled) return; event.preventDefault(); chargePointer = event.pointerId; C.input.chargeStart(); });
      function endCharge(event) { if (event.type === 'pointerup' && event.button !== 0) return; if (chargePointer !== null && event.pointerId === chargePointer) { chargePointer = null; C.input.chargeEnd(); } }
      root.document.addEventListener('pointerup', endCharge); root.document.addEventListener('pointercancel', endCharge);
      C.events.on('input:cancel', function () { chargePointer = null; });
      var digits = C.numbers.create(node('span', '', timer));
      var stock = node('div', 'pack-stock', meta); stock.setAttribute('role', 'img');
      var metrics = node('div', 'pack-metrics', meta);
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
      var ready = C.state.current.packs.ready, pendingGain = 0, arrivalStart = null, time = 0, handoff = null, progress = C.timers.progress(Date.now());
      cachedStyle(host, '--pack-reflection-opacity', cfg.reflectionOpacity);
      var gallery = C.presentation.gallery;
      if (gallery) C.packView.visible = false;
      function refresh(initial) {
        var state = C.state.current, next = state.packs.ready, now = root.performance.now();
        var types = C.packs.upcoming(2);
        if (pack.id !== types[0].id) {
          if (initial || openingPaused || inventoryPaused || !C.packView.visible || root.document.hidden || C.menu.afk) {
            clearPreviewEffect();
            previewSwap = null; adopt(types[0]); front.el.style.transform = ''; front.el.style.opacity = ''; front.el.classList.remove('is-pack-swapping');
          } else if (!previewSwap || previewSwap.pack.id !== types[0].id) {
            clearPreviewEffect();
            previewSwap = { pack: types[0], at: now, adopted: false };
            if(types[0].swapIn)previewEffect=C.packTransitions.create(types[0].swapIn,host,pack,front.el,function(){adopt(previewSwap.pack);previewSwap.adopted=true;C.packSkins.apply(front.el,pack,ready?'idle':'waiting');});
            front.el.classList.add('is-pack-swapping');
          }
        } else if (previewSwap && previewSwap.pack.id !== types[0].id) {
          clearPreviewEffect();
          previewSwap = null; front.el.style.transform = ''; front.el.style.opacity = ''; front.el.classList.remove('is-pack-swapping');
        }
        if (rearPack.id !== types[1].id) { rearPack = types[1]; C.packMarkup.setPack(back.el, rearPack); backMaterial = C.packMaterial.create(back.el, rearPack); }
        host.dataset.pack = types[0].id;
        C.packSkins.apply(front.el, pack, next ? 'idle' : 'waiting');
        C.packSkins.apply(back.el, rearPack, next ? 'idle' : 'waiting');
        progress = C.timers.progress(Date.now());
        if (!initial && next > ready) pendingGain = next - ready;
        if (next < ready) { pendingGain = 0; arrivalStart = null; host.classList.remove('is-arriving'); }
        ready = next; host.dataset.state = ready > 0 ? 'ready' : 'waiting'; host.dataset.ready = ready;
        back.el.style.opacity = ready > 1 ? cfg.backOpacity : 0;
        host.classList.toggle('is-first-visit', !state.tutorial.done && state.stats.packsOpened === 0);
        stock.setAttribute('aria-label', ready + ' of ' + C.config.packs.maxStored + ' packs stored');
        metrics.textContent = state.inventory.length + (state.inventory.length === 1 ? ' card · ' : ' cards · ') + ready + ' / ' + C.config.packs.maxStored + ' packs';
        host.setAttribute('aria-label', types[0].name + ': ' + (ready ? ready + ' ready' : 'regenerating'));
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
          cachedStyle(vial.fill, 'transform', 'translateY(' + (1 - vial.value) * 100 + '%)');
        });
        C.fx.wake();
      }
      function arrival(event) {
        if (!event || event.simulated || !pendingGain || event.ready !== ready) return;
        pendingGain = 0;
        if (!C.packView.visible || root.document.hidden || C.menu.afk) return;
        C.packView.stats.readyMoments += 1; arrivalStart = root.performance.now(); host.classList.add('is-arriving'); C.fx.wake();
      }
      C.packView.el = host; C.packView.front = front; C.packView.back = back; C.packView.vials = vials; C.packView.digits = digits;
      C.packView.stockCards = vials;
      C.events.on('save:written', function () { refresh(false); });
      C.events.on('packs:queueChanged', function () { refresh(false); });
      C.events.on('pack:ready', arrival);
      C.events.on('pack:opened', function () { refresh(false); });
      C.events.on('pointer:move', function () { C.fx.wake(); });
      C.events.on('pointer:leave', function () { C.fx.wake(); });
      C.events.on('motion:changed', function () { C.fx.wake(); });
      C.events.on('timer:tick', function () { if (!root.document.hidden) { progress = C.timers.progress(Date.now()); if (C.menu.afk || C.packView.visible && !openingPaused && !inventoryPaused && ready < C.config.packs.maxStored) C.fx.wake(); } });
      C.events.on('menu:afk', function () { C.fx.wake(); });
      C.events.on('menu:idle', function () { C.fx.wake(); });
      C.settings.onChange('*', function () { C.fx.wake(); });
      C.events.on('opening:context', function (event) {
        openingPaused = event.active;
        if (openingPaused && previewSwap) { clearPreviewEffect();adopt(C.packs.upcoming(1)[0]); previewSwap = null; front.el.style.transform = ''; front.el.style.opacity = ''; front.el.classList.remove('is-pack-swapping'); }
        C.fx.wake();
      });
      C.events.on('inventory:context', function (event) { inventoryPaused = event.active; C.fx.wake(); });
      C.events.on('pack:handoff', function (event) { if (ready && !(event && event.swapped)) handoff = 0; C.fx.wake(); });
      C.events.on('save:reset', function () { handoff = null; front.el.style.transform = ''; });
      C.events.on('fx:visibility', function (visible) {
        // A completed one-shot is not replayed when returning from a hidden tab.
        if (visible && arrivalStart !== null && root.performance.now() - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
      });
      refresh(true);
      C.fx.subscribe(function (now, dt) {
        if (!C.packView.visible || (openingPaused || inventoryPaused) && !C.menu.afk) return false;
        if (C.menu.afk) {
          var afkText = ready >= C.config.packs.maxStored ? 'Stock full' : C.timers.format(C.timers.remaining(Date.now()));
          if (afkText !== digits.text) { digits.set(afkText, false); timer.setAttribute('aria-label', afkText); }
          vials.forEach(function (vial, index) { cachedStyle(vial.fill, 'transform', 'translateY(' + (1 - (index < ready ? 1 : index === ready ? progress : 0)) * 100 + '%)'); });
          digits.update(now + C.config.menuMotion.digitMs + C.config.polish.digitStaggerMs * digits.slots.length);
          return false;
        }
        C.packView.stats.updates += 1; time += dt;
        if (previewSwap) {
          if(previewEffect){if(!previewEffect.update(dt)){previewEffect=null;previewSwap=null;front.el.classList.remove('is-pack-swapping');}}
          else {
          var fade = C.motion.reduced || C.settings.policy.animation < 2;
          var swapP = Math.min(1, (now - previewSwap.at) / (fade ? C.config.packSwap.reducedMs : C.config.packSwap.previewMs));
          if (swapP >= .5 && !previewSwap.adopted) { adopt(previewSwap.pack); previewSwap.adopted = true; C.packSkins.apply(front.el, pack, ready ? 'idle' : 'waiting'); }
          var turn = swapP * swapP * (3 - 2 * swapP);
          front.el.style.transform = fade ? 'none' : 'rotateY(' + turn * 360 + 'deg)';
          front.el.style.opacity = fade ? Math.abs(1 - 2 * swapP) : 1;
          if (swapP === 1) { previewSwap = null; front.el.style.transform = ''; front.el.style.opacity = ''; front.el.classList.remove('is-pack-swapping'); }
          }
        }
        if (handoff !== null) {
          handoff += dt; var slide = Math.min(1, handoff / C.config.revealMotion.packSlideMs);
          front.el.style.transform = C.motion.reduced ? 'none' : 'translate(' + (1 - slide) * C.config.revealMotion.packSlidePx + 'px,' + (slide - 1) * C.config.revealMotion.packSlidePx + 'px)';
          if (slide === 1) { handoff = null; front.el.style.transform = ''; }
        }
        var reduced = C.motion.reduced || C.settings.policy.animation === 0;
        var interacting = interaction.update(dt), pose = interaction.state;
        var ambient = C.settings.policy.ambient && !C.menu.idle && !reduced;
        var rx = pose.rx, ry = pose.ry;
        C.packView.progress = progress;
        var fill = ready > 0 ? 1 : progress;
        if (arrivalStart !== null && now - arrivalStart >= cfg.readyMomentMs) { arrivalStart = null; host.classList.remove('is-arriving'); }
        var arrivalP = arrivalStart === null ? 1 : Math.min(1, (now - arrivalStart) / cfg.readyMomentMs);
        cachedStyle(host, '--arrival-sweep', (reduced ? 0 : -cfg.sweepTravelPercent + (1 - Math.pow(1 - arrivalP, 3)) * cfg.sweepTravelPercent * 2) + '%');
        cachedStyle(host, '--arrival-lift', reduced ? '0px' : -Math.sin(arrivalP * Math.PI) * cfg.arrivalLiftPx + 'px');
        cachedStyle(host, '--arrival-opacity', arrivalStart === null ? 0 : Math.sin(arrivalP * Math.PI));
        [front, back].forEach(function (item, index) {
          if (index && ready < 2) return;
          var lift = index === 0 && !reduced && arrivalStart !== null ? -Math.sin(arrivalP * Math.PI) * cfg.arrivalLiftPx : 0;
          var amount = index ? 0.35 : 1;
          cachedStyle(item.pose, 'transform', 'translate3d(' + pose.x * amount + 'px,' + (pose.y * amount - pose.lift * amount + lift) + 'px,' + pose.lift * amount + 'px) rotateX(' + rx * amount + 'deg) rotateY(' + ry * amount + 'deg) rotateZ(' + pose.rz * amount + 'deg) scale(' + (1 - pose.grip * 0.008) + ')');
          cachedStyle(item.shadow, 'opacity', cfg.shadowOpacity - pose.lift * 0.003);
          cachedStyle(item.shadow, 'transform', 'translate(' + (8 + pose.x * amount - ry * 0.4) + 'px,' + (12 + pose.y * amount + pose.lift * 0.35) + 'px) scale(' + (1 + pose.lift * 0.009) + ')');
          cachedStyle(item.el, '--mass-x', (pose.massX - pose.x) * 0.045 + 'px');
          cachedStyle(item.el, '--mass-y', (pose.massY - pose.y) * 0.045 + 'px');
          cachedStyle(item.el, '--wrapper-flex', pose.flex * pose.grip * 1.1 + 'deg');
          (index ? backMaterial : frontMaterial).update(index ? { rx: rx * amount, ry: ry * amount } : pose, time, reduced || !ambient || index > 0);
          (index ? backFluid : frontFluid).update(dt, fill, pose, reduced || !ambient && !interacting);
          if (!ready && C.settings.policy.particles > 0 && ambient) item.specks.forEach(function (speck) { speck.el.style.transform = 'translateY(' + Math.sin(time / cfg.fluidWaveMs * Math.PI * 2 + speck.phase) * cfg.speckTravelPx + 'px)'; });
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
          cachedStyle(vial.fill, 'transform', 'translateY(' + (1 - vial.value) * 100 + '%)');
          if (vial.arrival !== null) {
            var arriveP = Math.min(1, (now - vial.arrival) / cfg.stockShineMs);
            vial.el.style.transform = reduced ? 'none' : 'translateY(' + -Math.sin(arriveP * Math.PI) * cfg.stockLiftPx + 'px)';
            cachedStyle(vial.el, '--stock-shine-x', (reduced ? 0 : -130 + arriveP * 260) + '%');
            cachedStyle(vial.el, '--stock-shine-opacity', Math.sin(arriveP * Math.PI));
            if (arriveP === 1) { vial.arrival = null; vial.el.style.transform = ''; cachedStyle(vial.el, '--stock-shine-opacity', 0); }
            else active = true;
          }
        });
        return ambient || interacting || active || arrivalStart !== null || handoff !== null || previewSwap !== null;
      }, 'pack');
    }
  };
})(window.Cardable, window);
