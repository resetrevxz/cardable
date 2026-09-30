(function (C, root) {
  'use strict';
  var cfg, stage, host, glass, foil, halves, gap, hint, enterHint, status, error, seam, trails, particles, pack;
  var phase = 'idle', elapsed = 0, lastVisual = 0, chargeAt = 0, fill = 0, drainFrom = 0, pulseAt = 0;
  var path = [], hot = [], dirty = false, drag = null, split = null, cutIdle = 0, errorUntil = 0, savedFocus = null;
  var meniscus, enabled = false, width = 0, height = 0;
  var finePointer = root.matchMedia('(hover: hover) and (pointer: fine)');
  var stats = { commits: 0, transitions: 0, tears: 0, updates: 0, particles: 0 };
  function node(tag, className, parent, text) { return C.packMarkup.node(tag, className, parent, text); }
  function svg(tag, parent) { var el = root.document.createElementNS('http://www.w3.org/2000/svg', tag); if (parent) parent.appendChild(el); return el; }
  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function ease(value) { return 1 - Math.pow(1 - clamp(value), 3); }
  function context() { C.events.emit('opening:context', { enabled: enabled, active: phase !== 'idle', phase: phase, ready: !C.state.current.pendingReveal && C.state.current.packs.ready > 0 }); }
  function announce(text) { status.textContent = text; }
  function focus(el) { if (el && el.focus) el.focus({ preventScroll: true }); }
  function blade(value) { value = value && finePointer.matches; host.classList.toggle('has-blade', value); C.events.emit('cursor:blade', value); }
  function phaseTo(next) {
    if (phase === next) return;
    var previous = phase;
    phase = next; C.opening.phase = next; elapsed = 0; lastVisual = root.performance.now(); stats.transitions += 1;
    stage.dataset.phase = next;
    host.setAttribute('tabindex', next === 'charging' || next === 'draining' || next === 'cutting' ? '0' : '-1');
    var active = next !== 'idle';
    root.document.body.classList.toggle('is-opening', active);
    root.document.body.classList.toggle('is-opening-torn', next === 'torn');
    stage.hidden = !active;
    if (active) bounds();
    ['wordmark', 'pack-stage', 'currency-counter', 'inventory-affordance'].forEach(function (id) {
      var el = root.document.getElementById(id); if (el) el.inert = active;
    });
    if (C.dev.panel) C.dev.panel.inert = active && next !== 'torn';
    if (next === 'idle') {
      C.events.emit('menu:activity'); focus(savedFocus); savedFocus = null;
    }
    C.events.emit('menu:visibilityHold', { reason: 'opening', active: active });
    context(); C.events.emit('reveal:phase', next);
    if (new URLSearchParams(root.location.search).get(C.config.dev.queryFlag) === '1') root.console.info('[Cardable opening] ' + previous + ' → ' + next);
    if (next !== 'cutting') { release(); blade(false); }
    hint.classList.toggle('is-held', next === 'charging');
    hint.style.opacity = next === 'charging' || next === 'draining' ? 1 : 0;
    if (next !== 'cutting') enterHint.style.opacity = 0;
    if (next === 'charging') announce('Hold Space to open the pack.');
    if (next === 'draining') announce('Opening cancelled. Pack preserved.');
    if (next === 'cutting') { announce('Drag across the foil wrapper, or press Enter to tear.'); focus(host); }
    if (next === 'torn') { announce('Wrapper opened.'); particles.clear(); stats.particles = 0; }
    C.fx.wake();
  }
  function bounds() {
    var rect = host.getBoundingClientRect(); width = rect.width || C.config.shell.packWidth; height = rect.height || C.config.shell.packHeight;
    trails.setAttribute('viewBox', '0 0 ' + width + ' ' + height); dirty = true;
    if (split) halves.forEach(function (half, i) { half.style.clipPath = C.cutGeometry.polygon(split.halves[i]); });
    return rect;
  }
  function local(event) {
    var rect = host.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  }
  function inside(event) {
    var rect = host.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.left + rect.width && event.clientY >= rect.top && event.clientY <= rect.top + rect.height;
  }
  function clearCut() {
    release(); path = []; hot.forEach(function (item) { if (item.el) item.el.remove(); }); hot = []; split = null; cutIdle = 0;
    seam.setAttribute('d', ''); gap.setAttribute('d', ''); dirty = true;
    halves.forEach(function (half) { half.style.transform = ''; half.style.opacity = 0; half.style.clipPath = ''; });
  }
  function reset() {
    clearCut(); particles.clear(); fill = 0; meniscus.reset(0); errorUntil = 0; error.style.opacity = 0;
    phaseTo('idle'); glass.pose.style.transform = ''; glass.el.style.opacity = 0; foil.style.opacity = 0;
  }
  function chargeStart() {
    if (!enabled || phase !== 'idle' || C.state.current.pendingReveal || root.document.hidden) return;
    C.timers.tick(); if (C.state.current.packs.ready <= 0) return;
    savedFocus = root.document.activeElement; clearCut(); particles.clear(); meniscus.reset(0); fill = 0;
    errorUntil = 0; error.style.opacity = 0; chargeAt = root.performance.now(); pulseAt = 0;
    phaseTo('charging'); glass.el.style.opacity = 1; foil.style.opacity = 0; paintFluid(0); focus(host); C.events.emit('charge:start');
  }
  function cancel(reason) {
    release(); blade(false);
    if (phase !== 'charging') return;
    fill = clamp((root.performance.now() - chargeAt) / C.config.hold.chargeMs); drainFrom = fill;
    phaseTo('draining'); C.events.emit('charge:end', { reason: reason });
  }
  function commit() {
    if (phase !== 'charging' || root.document.hidden) return;
    C.timers.tick();
    var candidate = JSON.parse(JSON.stringify(C.state.current)), now = Date.now();
    if (candidate.pendingReveal || !C.timers.consumeInto(candidate, now)) { cancel('unavailable'); return; }
    var forced = C.dev.peekForcedTier ? C.dev.peekForcedTier() : null;
    try {
      var cards = [];
      for (var i = 0; i < pack.cardsPerPack; i++) cards.push(C.pull.pullCard(pack, {
        forcedTier: i === 0 ? forced : null,
        allocateSerial: function () { candidate.serialCounter += 1; return C.serial.format(candidate.playerCode, candidate.serialCounter); }
      }));
      candidate.stats.packsOpened += 1;
      candidate.pendingReveal = { packId: pack.id, cards: cards, committedAt: now };
      if (!C.state.commit(candidate)) throw new Error('durable save unavailable');
    } catch (_) {
      error.textContent = 'Could not save. Your pack is still here.'; errorUntil = root.performance.now() + cfg.errorMs;
      cancel('save-failed'); announce(error.textContent); return;
    }
    if (forced) C.dev.consumeForcedTier();
    stats.commits += 1; fill = 1;
    C.events.emit('pack:opened', { ready: candidate.packs.ready }); C.events.emit('charge:complete', candidate.pendingReveal);
    phaseTo('dissolving'); particles.emit('dissolve', null, width, height);
  }
  function chargeEnd() {
    if (phase !== 'charging') return;
    if (root.performance.now() - chargeAt >= C.config.hold.chargeMs && !root.document.hidden) commit();
    else cancel('release');
  }
  function release(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    var id = drag.id; drag = null;
    if (host.releasePointerCapture && host.hasPointerCapture && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    blade(false);
  }
  function cutStart(event) {
    if (phase !== 'cutting' || event.button !== 0 || event.isPrimary === false || !host.contains(event.target) || !inside(event)) return;
    var point = local(event);
    if (path.length) {
      var first = path[0], last = path[path.length - 1];
      var a = Math.hypot((point.x - first.x) * width, (point.y - first.y) * height), b = Math.hypot((point.x - last.x) * width, (point.y - last.y) * height);
      if (Math.min(a, b) > cfg.snapPx) return;
      if (a < b) path.reverse();
    } else path.push(point);
    drag = { id: event.pointerId, last: point };
    if (host.setPointerCapture) host.setPointerCapture(event.pointerId);
    if (event.preventDefault) event.preventDefault();
    cutIdle = 0; blade(true); dirty = true; C.fx.wake();
  }
  function addPoint(point, now, speed) {
    var previous = path[path.length - 1]; path.push(point);
    if (path.length > cfg.maxPathSamples) path = path.filter(function (_, i, items) { return i === 0 || i === items.length - 1 || i % 2 === 0; });
    hot.push({ el: null, at: now, a: previous, b: point, stroke: cfg.glintPx + (cfg.fastGlintPx - cfg.glintPx) * clamp(speed / cfg.glintSpeedPx) });
    if (hot.length > cfg.maxPathSamples) { var expired = hot.shift(); if (expired.el) expired.el.remove(); }
  }
  function cutMove(event) {
    if (phase !== 'cutting') return;
    blade(inside(event));
    if (!drag && C.config.cut.requirePress) return;
    if (drag && event.pointerId !== drag.id) return;
    if (!path.length) path.push(local(event));
    var point = local(event), last = path[path.length - 1], distance = Math.hypot((point.x - last.x) * width, (point.y - last.y) * height);
    var count = Math.floor(distance / cfg.samplePx), now = root.performance.now();
    var speed = distance / Math.max(C.config.shell.frameMs, now - (drag && drag.at || now - C.config.shell.frameMs)) * 1000;
    for (var i = 1; i <= count; i++) {
      var amount = i * cfg.samplePx / distance;
      addPoint({ x: last.x + (point.x - last.x) * amount, y: last.y + (point.y - last.y) * amount }, now, speed);
    }
    if (!count) return;
    if (drag) drag.at = now;
    cutIdle = 0; dirty = true;
    var info = C.cutGeometry.metrics(path, width, height);
    C.events.emit('cut:progress', info.span);
    if (info.span >= C.config.cut.autoFinishSpan) tear();
    C.fx.wake();
  }
  function tear() {
    if (phase !== 'cutting') return;
    split = C.cutGeometry.finish(path, width, height);
    halves.forEach(function (half, i) { half.style.clipPath = C.cutGeometry.polygon(split.halves[i]); half.style.opacity = 1; });
    gap.setAttribute('d', C.cutGeometry.svg(split.path, width, height));
    stats.tears += 1; C.events.emit('cut:complete', { axis: split.axis, path: split.path });
    phaseTo('tearing'); particles.emit('tear', split.path, width, height, split.normal);
  }
  function paintFluid(dt) {
    var reduced = C.motion.reduced, agitation = clamp((fill - cfg.chargeAgitationAt) / (1 - cfg.chargeAgitationAt));
    var target = Math.sin(elapsed / cfg.waveMs * Math.PI * 2) * (cfg.meniscusPx + agitation * cfg.agitationPx);
    if (phase === 'draining') target += Math.sin(elapsed / C.config.hold.drainMs * Math.PI * cfg.sloshCycles) * cfg.sloshPx * (1 - elapsed / C.config.hold.drainMs);
    var wave = reduced ? 0 : meniscus.step(dt, target);
    var vibration = !reduced && phase === 'charging' ? clamp((fill - cfg.vibrationAt) / (1 - cfg.vibrationAt)) * cfg.vibrationPx : 0;
    glass.fluid.style.transform = 'translateY(' + (1 - fill) * 100 + '%)';
    glass.el.style.setProperty('--meniscus-wave', wave + 'px');
    glass.el.style.setProperty('--charge-leak', fill * fill);
    glass.pose.style.transform = 'translate(' + Math.sin(elapsed / 1000 * cfg.vibrationHz * Math.PI * 2) * vibration + 'px,' + Math.cos(elapsed / 1000 * cfg.vibrationHz * Math.PI * 2) * vibration * 0.5 + 'px)';
    glass.specks.forEach(function (speck) { speck.el.style.transform = 'translateY(' + (reduced ? 0 : -((elapsed / 1000 * cfg.speckSpeedPx + speck.phase * cfg.speckSpeedPx) % height)) + 'px)'; });
    C.events.emit('charge:progress', fill);
  }
  function paintCut(now) {
    // Coalesce native pointer samples into one DOM paint on the shared frame.
    if (dirty) { seam.setAttribute('d', C.cutGeometry.svg(C.cutGeometry.smooth(path), width, height)); dirty = false; }
    hot = hot.filter(function (item) {
      var age = now - item.at;
      if (age >= cfg.trailMs || C.motion.reduced) { if (item.el) item.el.remove(); return false; }
      if (!item.el) { item.el = svg('path', trails); item.el.setAttribute('class', 'opening-cut-glint'); item.el.setAttribute('stroke-width', item.stroke); }
      item.el.setAttribute('d', C.cutGeometry.svg([item.a, item.b], width, height));
      item.el.style.opacity = 1 - ease(age / cfg.trailMs); return true;
    });
  }
  function update(now) {
    if (!enabled) return false;
    var dt = Math.max(0, Math.min(now - lastVisual, C.config.shell.maxFrameDeltaMs)); lastVisual = now;
    stats.updates += 1;
    if (errorUntil) { error.style.opacity = now < errorUntil ? 1 : 0; if (now >= errorUntil) errorUntil = 0; }
    if (phase === 'idle' || phase === 'torn') return errorUntil > 0;
    elapsed += dt;
    if (phase === 'charging') {
      fill = clamp((now - chargeAt) / C.config.hold.chargeMs); paintFluid(dt);
      glass.el.style.opacity = 1; foil.style.opacity = 0;
      if (!C.motion.reduced && elapsed >= pulseAt) {
        var rect = host.getBoundingClientRect();
        C.events.emit('dots:pulse', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, intensity: cfg.pulseIntensity });
        pulseAt = elapsed + cfg.pulseStartMs + (cfg.pulseEndMs - cfg.pulseStartMs) * fill;
      }
      if (fill === 1) commit();
      return true;
    }
    if (phase === 'draining') {
      var drain = clamp(elapsed / C.config.hold.drainMs); fill = drainFrom * (1 - ease(drain)); paintFluid(dt);
      glass.el.style.opacity = C.motion.reduced ? 1 - ease(drain) : 1 - ease((drain - (1 - cfg.drainExitPortion)) / cfg.drainExitPortion);
      hint.style.opacity = 1 - ease(drain);
      if (drain === 1) { glass.el.style.opacity = 0; phaseTo('idle'); }
      return phase !== 'idle' || errorUntil > 0;
    }
    var particleActive = particles.update(dt); stats.particles = particles.count;
    paintCut(now);
    if (phase === 'dissolving') {
      var dissolve = clamp(elapsed / cfg.dissolveMs); glass.el.style.opacity = 1 - ease(dissolve); foil.style.opacity = ease(dissolve);
      paintFluid(dt);
      if (dissolve === 1) { glass.el.style.opacity = 0; phaseTo('cutting'); }
      return true;
    }
    if (phase === 'cutting') {
      foil.style.opacity = 1; cutIdle += dt;
      hint.style.opacity = elapsed >= cfg.cutHintMs ? 1 : 0;
      enterHint.style.opacity = cutIdle >= cfg.enterHintMs ? 1 : 0;
      return cutIdle < cfg.enterHintMs || hot.length > 0 || particleActive;
    }
    if (phase === 'tearing') {
      foil.style.opacity = 0; hint.style.opacity = 0; enterHint.style.opacity = 0;
      var lift = ease(elapsed / cfg.tearMs), separation = ease((elapsed - cfg.tearMs) / cfg.splitMs);
      var fall = ease((elapsed - cfg.tearMs - cfg.splitMs) / cfg.fallMs), reduced = C.motion.reduced;
      var gapPx = cfg.separationMinPx * lift + (cfg.separationMaxPx - cfg.separationMinPx) * separation;
      gap.style.opacity = reduced ? 0 : lift * (1 - fall); gap.setAttribute('stroke-width', gapPx);
      halves.forEach(function (half, i) {
        var side = (i === 0 ? -1 : 1) * (split.axis === 'x' ? 1 : -1);
        half.style.transform = reduced ? 'none' : 'translate3d(' + split.normal.x * side * gapPx + 'px,' + (split.normal.y * side * gapPx + fall * (i === 0 ? cfg.fallMinPx : cfg.fallMaxPx)) + 'px,0) rotate(' + side * cfg.rotationDegrees * separation + 'deg)';
        half.style.opacity = reduced ? 1 - ease(elapsed / (cfg.tearMs + cfg.splitMs + cfg.fallMs)) : 1 - fall;
      });
      if (elapsed >= cfg.tearMs + cfg.splitMs + cfg.fallMs) { gap.style.opacity = 0; phaseTo('torn'); }
      return phase !== 'torn';
    }
    return false;
  }
  C.opening = {
    initialized: false, phase: phase, stats: stats,
    get path() { return path; }, get fill() { return fill; }, get split() { return split; },
    init: function () {
      if (C.opening.initialized) return; C.opening.initialized = true;
      var params = new URLSearchParams(root.location.search);
      if (params.get('gallery') === '1' && params.get(C.config.dev.queryFlag) === '1') return;
      pack = C.data.packs.find(function (item) { return item.enabled && item.obtainable === 'timer'; }); if (!pack) return;
      if (C.state.current.pendingReveal) pack = C.pack(C.state.current.pendingReveal.packId) || pack;
      enabled = true; cfg = C.config.openingMotion;
      root.document.body.style.setProperty('--opening-chrome-opacity', cfg.chargeChromeOpacity);
      stage = node('section', 'opening-stage', root.document.body); stage.hidden = true; stage.setAttribute('aria-label', 'Pack opening');
      host = node('div', 'opening-pack', stage); host.setAttribute('tabindex', '0'); host.setAttribute('role', 'group');
      host.setAttribute('aria-label', 'Pack wrapper. Hold Space to charge; drag or press Enter to tear.');
      glass = C.packMarkup.unit(host, false, pack); glass.el.classList.add('opening-glass');
      foil = C.packMarkup.foil(host, pack);
      halves = [C.packMarkup.foil(host, pack), C.packMarkup.foil(host, pack)]; halves.forEach(function (half) { half.classList.add('opening-half'); });
      trails = svg('svg', host); trails.setAttribute('class', 'opening-seams'); trails.setAttribute('aria-hidden', 'true');
      gap = svg('path', trails); gap.setAttribute('class', 'opening-light-gap'); seam = svg('path', trails); seam.setAttribute('class', 'opening-cut-seam'); seam.setAttribute('stroke-width', cfg.seamPx);
      var particleHost = node('div', 'opening-particles', host);
      particles = C.particles.create(particleHost, Math.max(cfg.dissolveCount, cfg.fleckCount));
      hint = node('div', 'opening-hint', host); node('kbd', 'opening-keycap', hint, 'Space'); node('span', 'opening-cut-hint', hint, 'cut here');
      enterHint = node('div', 'opening-enter-hint', host, 'Enter to tear');
      status = node('div', 'visually-hidden', stage); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      error = node('div', 'opening-error', root.document.body); error.setAttribute('role', 'status');
      meniscus = C.springs.create(0); bounds();
      C.opening.el = stage; C.opening.wrapper = host; C.opening.glass = glass; C.opening.foil = foil; C.opening.halves = halves;
      C.opening.hint = hint; C.opening.enterHint = enterHint; C.opening.seam = seam; C.opening.error = error;
      root.document.getElementById('pack-stage').setAttribute('role', 'button');
      C.events.on('input:chargeStart', chargeStart); C.events.on('input:chargeEnd', chargeEnd); C.events.on('input:cancel', function (event) { cancel(event.reason); });
      C.events.on('input:cutStart', cutStart); C.events.on('input:cutMove', cutMove); C.events.on('input:cutEnd', release); C.events.on('input:tear', tear);
      host.addEventListener('lostpointercapture', function () { release(); });
      host.addEventListener('pointerenter', function () { if (phase === 'cutting') blade(true); });
      host.addEventListener('pointerleave', function () { blade(false); });
      C.events.on('pointer:leave', function () { blade(false); });
      C.events.on('fx:visibility', function () { lastVisual = root.performance.now(); release(); blade(false); });
      C.events.on('motion:changed', function () { particles.clear(); meniscus.reset(0); hot.forEach(function (item) { if (item.el) item.el.remove(); }); hot = []; dirty = true; C.fx.wake(); });
      C.events.on('save:written', function () { if (phase !== 'idle' && phase !== 'charging' && phase !== 'draining' && !C.state.current.pendingReveal) reset(); context(); });
      C.events.on('save:reset', reset);
      C.events.on('opening:replay', function () { if (phase === 'torn' && C.state.current.pendingReveal) { clearCut(); phaseTo('cutting'); foil.style.opacity = 1; } });
      root.addEventListener('resize', function () { bounds(); C.fx.wake(); });
      C.fx.subscribe(update);
      if (C.state.current.pendingReveal) { phaseTo('cutting'); foil.style.opacity = 1; }
      else context();
    }
  };
})(window.Cardable, window);
