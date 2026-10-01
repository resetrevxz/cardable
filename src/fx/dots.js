(function (C, root) {
  'use strict';
  var canvas, ctx, ink, width, height, cols, rows, heat = new Map(), ripples = [], dirty = true;
  var pendingPaths = [], lastHeatAt = null;
  var reveal = { dim: 0, halo: null };
  var tutorial = { dim: 0, halo: null };
  var cursorBlocked = false, cursorGain = 1, cursorFade = null, cursorPoint = { x: 0, y: 0, inside: false };
  var stats = { draws: 0, visibleDots: 0, trailCells: 0, ripples: 0, rings: 0, clickRipples: 0, pulseRipples: 0, cursorGain: 1, columns: 0, rows: 0 };
  function falloff(distance, radius) {
    var t = Math.max(0, Math.min(1, distance / radius));
    return 1 - t * t * (3 - 2 * t);
  }
  var points = [];
  function point(index) { return points[index]; }
  function boundRipples() { if (ripples.length > C.config.dots.ripple.maxSimultaneous) ripples.splice(0, ripples.length - C.config.dots.ripple.maxSimultaneous); }
  function region(left, top, right, bottom, visit) {
    var pitch = C.config.dots.spacing;
    var minX = Math.max(0, Math.ceil(left / pitch - 0.5)), maxX = Math.min(cols - 1, Math.floor(right / pitch - 0.5));
    var minY = Math.max(0, Math.ceil(top / pitch - 0.5)), maxY = Math.min(rows - 1, Math.floor(bottom / pitch - 0.5));
    for (var y = minY; y <= maxY; y += 1) for (var x = minX; x <= maxX; x += 1) visit(y * cols + x);
  }
  function segmentDistance(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
    var t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function stamp(path) {
    var radius = C.config.dots.influenceRadius;
    for (var i = 0; i < path.length; i += 1) {
      var a = path[Math.max(0, i - 1)], b = path[i];
      region(Math.min(a.x, b.x) - radius, Math.min(a.y, b.y) - radius, Math.max(a.x, b.x) + radius, Math.max(a.y, b.y) + radius, function (index) {
        var energy = falloff(segmentDistance(point(index), a, b), radius) * C.config.shell.dots.trailStrength;
        if (energy > (heat.get(index) || 0)) heat.set(index, energy);
      });
    }
  }
  function resize() {
    width = root.innerWidth; height = root.innerHeight;
    var dpr = root.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / C.config.dots.spacing); rows = Math.ceil(height / C.config.dots.spacing);
    points = Array.from({ length: cols * rows }, function (_, index) { return { x: (index % cols + 0.5) * C.config.dots.spacing, y: (Math.floor(index / cols) + 0.5) * C.config.dots.spacing }; });
    stats.columns = cols; stats.rows = rows;
    heat.clear(); pendingPaths = []; lastHeatAt = null; dirty = true;
    C.fx.wake();
  }
  function update(now, dt) {
    if (!dirty && !heat.size && !ripples.length && !pendingPaths.length && !cursorFade) return false;
    var cfg = C.config.dots, tuning = C.config.shell.dots, pointer = cursorPoint;
    if (!cursorBlocked) { cursorPoint = { x: C.input.pointer.x, y: C.input.pointer.y, inside: C.input.pointer.inside }; pointer = cursorPoint; }
    if (cursorFade) {
      cursorFade.elapsed += dt;
      var fade = Math.min(1, cursorFade.elapsed / cursorFade.ms), e = 1 - Math.pow(1 - fade, 3);
      cursorGain = cursorFade.from + (cursorFade.to - cursorFade.from) * e;
      if (fade === 1) {
        cursorFade = null;
        if (cursorBlocked) { heat.clear(); pendingPaths = []; ripples = ripples.filter(function (r) { return r.kind === 'pulse'; }); }
      }
    }
    stats.cursorGain = cursorGain;
    if (lastHeatAt !== null) {
      var cooling = Math.exp(-(now - lastHeatAt) * tuning.trailCooling / cfg.trailDecayMs);
      heat.forEach(function (value, index) {
        value *= cooling;
        if (value * cfg.maxAlpha <= tuning.alphaThreshold) heat.delete(index);
        else heat.set(index, value);
      });
    }
    lastHeatAt = now;
    if (!C.motion.reduced && !cursorBlocked) pendingPaths.forEach(stamp);
    pendingPaths = [];
    ripples = ripples.filter(function (r) { return now - r.born - r.delay < (r.kind === 'click' ? cfg.ripple.lifeMs : cfg.pulse.lifeMs); });
    var candidates = new Set(heat.keys());
    if (tutorial.halo && cursorGain > 0) region(tutorial.halo.x - tutorial.halo.rx, tutorial.halo.y - tutorial.halo.ry, tutorial.halo.x + tutorial.halo.rx, tutorial.halo.y + tutorial.halo.ry, function (index) { candidates.add(index); });
    if (reveal.halo && cursorGain > 0) region(reveal.halo.x - reveal.halo.radius, reveal.halo.y - reveal.halo.radius, reveal.halo.x + reveal.halo.radius, reveal.halo.y + reveal.halo.radius, function (index) { candidates.add(index); });
    if (cfg.baseAlpha > tuning.alphaThreshold) region(0, 0, width, height, function (index) { candidates.add(index); });
    if (pointer.inside && cursorGain > 0) region(pointer.x - cfg.influenceRadius, pointer.y - cfg.influenceRadius, pointer.x + cfg.influenceRadius, pointer.y + cfg.influenceRadius, function (index) { candidates.add(index); });
    var rings = [];
    function ring(r, delay, scale) {
      var age = now - r.born - delay, click = r.kind === 'click', breath = cfg.ripple;
      var life = click ? breath.lifeMs : cfg.pulse.lifeMs;
      if (age < 0 || age >= life) return;
      var radius = click ? Math.min(breath.maxRadius, age * breath.speed / 1000) : age * cfg.pulse.speed / 1000;
      var band = click ? breath.ringWidth / 2 : cfg.pulse.ringWidth / 2;
      var alpha = (click ? breath.peakAlpha * cursorGain : cfg.maxAlpha * r.intensity) * scale * falloff(age, life);
      rings.push({ x: r.x, y: r.y, radius: radius, band: band, alpha: alpha });
      region(r.x - radius - band, r.y - radius - band, r.x + radius + band, r.y + radius + band, function (index) {
        var p = point(index);
        if (Math.abs(Math.hypot(p.x - r.x, p.y - r.y) - radius) <= band) candidates.add(index);
      });
    }
    ripples.forEach(function (r) { ring(r, r.delay, r.scale); });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink;
    stats.visibleDots = 0;
    candidates.forEach(function (index) {
      var p = point(index), dx = p.x - pointer.x, dy = p.y - pointer.y, distance = Math.hypot(dx, dy);
      var hover = pointer.inside ? falloff(distance, cfg.influenceRadius) * cursorGain : 0;
      var energy = Math.max(hover, (heat.get(index) || 0) * cursorGain);
      var alpha = cfg.baseAlpha * cursorGain + (cfg.maxAlpha - cfg.baseAlpha) * energy;
      rings.forEach(function (ring) {
        var ringAlpha = falloff(Math.abs(Math.hypot(p.x - ring.x, p.y - ring.y) - ring.radius), ring.band) * ring.alpha;
        alpha = Math.max(alpha, ringAlpha); energy = Math.max(energy, ringAlpha / cfg.maxAlpha);
      });
      alpha *= 1 - reveal.dim;
      if (reveal.halo) alpha = Math.max(alpha, cfg.maxAlpha * cursorGain * C.config.revealMotion.haloStrength * falloff(Math.hypot(p.x - reveal.halo.x, p.y - reveal.halo.y), reveal.halo.radius));
      var spotlight = tutorial.halo ? falloff(Math.hypot((p.x - tutorial.halo.x) / tutorial.halo.rx, (p.y - tutorial.halo.y) / tutorial.halo.ry), 1) : 0;
      alpha *= 1 - tutorial.dim * (1 - spotlight);
      alpha = Math.max(alpha, cfg.maxAlpha * cursorGain * C.config.tutorialMotion.haloStrength * spotlight);
      if (alpha <= tuning.alphaThreshold) return;
      var lean = !C.motion.reduced && distance > 0 ? cfg.lean * hover / distance : 0;
      var radius = C.motion.reduced ? cfg.baseRadius : cfg.baseRadius + (cfg.maxRadius - cfg.baseRadius) * energy;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(p.x + dx * lean, p.y + dy * lean, radius, 0, Math.PI * 2); ctx.fill();
      stats.visibleDots += 1;
    });
    ctx.globalAlpha = 1;
    stats.draws += 1; stats.trailCells = heat.size; stats.ripples = ripples.length;
    stats.rings = rings.length;
    stats.clickRipples = ripples.filter(function (r) { return r.kind === 'click'; }).length;
    stats.pulseRipples = ripples.length - stats.clickRipples;
    dirty = false;
    return heat.size > 0 || ripples.length > 0 || cursorFade !== null;
  }
  C.dots = {
    stats: stats, initialized: false,
    init: function () {
      if (C.dots.initialized) return;
      C.dots.initialized = true;
      canvas = root.document.getElementById('dot-grid'); ctx = canvas.getContext('2d');
      if (!ctx) { canvas.hidden = true; return; }
      ink = root.getComputedStyle(root.document.documentElement).getPropertyValue('--highlight').trim();
      resize();
      C.events.on('pointer:move', function (event) { if (cursorBlocked) return; if (!C.motion.reduced) pendingPaths.push(event.path); dirty = true; });
      C.events.on('pointer:leave', function () { if (!cursorBlocked) dirty = true; });
      C.events.on('pointer:click', function (event) {
        if (C.motion.reduced || cursorBlocked) return;
        // The cap includes queued echoes, so rapid clicks cannot accumulate hidden energy.
        ripples.push({ x: event.x, y: event.y, born: event.now, kind: 'click', delay: 0, scale: 1 });
        ripples.push({ x: event.x, y: event.y, born: event.now, kind: 'click', delay: C.config.dots.ripple.secondDelayMs, scale: C.config.dots.ripple.secondRingScale });
        boundRipples();
        dirty = true;
      });
      C.events.on('dots:pulse', function (event) {
        if (C.motion.reduced || root.document.hidden) return;
        ripples.push({ x: event.x, y: event.y, born: root.performance.now(), kind: 'pulse', intensity: event.intensity, delay: 0, scale: 1 });
        boundRipples();
        dirty = true; C.fx.wake();
      });
      C.events.on('reveal:context', function (event) { reveal = { dim: event.gridDim || 0, halo: event.halo || null }; dirty = true; C.fx.wake(); });
      C.events.on('tutorial:context', function (event) { tutorial = { dim: event.gridDim || 0, halo: event.halo || null }; dirty = true; C.fx.wake(); });
      C.events.on('opening:context', function (event) {
        var blocked = ['charging', 'draining', 'dissolving'].indexOf(event.phase) !== -1;
        if (blocked === cursorBlocked) return;
        cursorBlocked = blocked; pendingPaths = [];
        cursorFade = { elapsed: 0, from: cursorGain, to: blocked ? 0 : 1, ms: blocked ? C.config.dots.openingFadeOutMs : C.config.dots.openingFadeInMs };
        dirty = true; C.fx.wake();
      });
      C.events.on('motion:changed', function () { heat.clear(); ripples = []; pendingPaths = []; dirty = true; });
      C.events.on('fx:visibility', function (visible) { if (visible) dirty = true; });
      root.addEventListener('resize', resize);
      C.fx.subscribe(update, 'dots');
    }
  };
})(window.Cardable, window);
