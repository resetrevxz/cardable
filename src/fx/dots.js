(function (C, root) {
  'use strict';
  var canvas, ctx, ink, width, height, cols, rows, heat = new Map(), ripples = [], dirty = true;
  var pendingPaths = [], lastHeatAt = null;
  var stats = { draws: 0, visibleDots: 0, trailCells: 0, ripples: 0, columns: 0, rows: 0 };
  function falloff(distance, radius) {
    var t = Math.max(0, Math.min(1, distance / radius));
    return 1 - t * t * (3 - 2 * t);
  }
  function point(index) { return { x: (index % cols + 0.5) * C.config.dots.spacing, y: (Math.floor(index / cols) + 0.5) * C.config.dots.spacing }; }
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
    stats.columns = cols; stats.rows = rows;
    heat.clear(); pendingPaths = []; lastHeatAt = null; dirty = true;
    C.fx.wake();
  }
  function update(now) {
    if (!dirty && !heat.size && !ripples.length && !pendingPaths.length) return false;
    var cfg = C.config.dots, tuning = C.config.shell.dots, pointer = C.input.pointer;
    if (lastHeatAt !== null) {
      var cooling = Math.exp(-(now - lastHeatAt) * tuning.trailCooling / cfg.trailDecayMs);
      heat.forEach(function (value, index) {
        value *= cooling;
        if (value * cfg.maxAlpha <= tuning.alphaThreshold) heat.delete(index);
        else heat.set(index, value);
      });
    }
    lastHeatAt = now;
    if (!C.motion.reduced) pendingPaths.forEach(stamp);
    pendingPaths = [];
    ripples = ripples.filter(function (r) { return now - r.born - r.delay < cfg.rippleMs; });
    var candidates = new Set(heat.keys());
    if (cfg.baseAlpha > tuning.alphaThreshold) region(0, 0, width, height, function (index) { candidates.add(index); });
    if (pointer.inside) region(pointer.x - cfg.influenceRadius, pointer.y - cfg.influenceRadius, pointer.x + cfg.influenceRadius, pointer.y + cfg.influenceRadius, function (index) { candidates.add(index); });
    var rings = [];
    ripples.forEach(function (r) {
      var age = now - r.born - r.delay;
      if (age < 0) return;
      var radius = age * cfg.rippleSpeed / 1000, band = cfg.spacing * tuning.ringWidthPitches;
      rings.push({ x: r.x, y: r.y, radius: radius, band: band, intensity: r.intensity * falloff(age, cfg.rippleMs) });
      region(r.x - radius - band, r.y - radius - band, r.x + radius + band, r.y + radius + band, function (index) {
        var p = point(index);
        if (Math.abs(Math.hypot(p.x - r.x, p.y - r.y) - radius) <= band) candidates.add(index);
      });
    });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink;
    stats.visibleDots = 0;
    candidates.forEach(function (index) {
      var p = point(index), dx = p.x - pointer.x, dy = p.y - pointer.y, distance = Math.hypot(dx, dy);
      var hover = pointer.inside ? falloff(distance, cfg.influenceRadius) : 0;
      var energy = Math.max(hover, heat.get(index) || 0);
      rings.forEach(function (ring) { energy = Math.max(energy, falloff(Math.abs(Math.hypot(p.x - ring.x, p.y - ring.y) - ring.radius), ring.band) * ring.intensity); });
      var alpha = cfg.baseAlpha + (cfg.maxAlpha - cfg.baseAlpha) * energy;
      if (alpha <= tuning.alphaThreshold) return;
      var lean = !C.motion.reduced && distance > 0 ? cfg.lean * hover / distance : 0;
      var radius = C.motion.reduced ? cfg.baseRadius : cfg.baseRadius + (cfg.maxRadius - cfg.baseRadius) * energy;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(p.x + dx * lean, p.y + dy * lean, radius, 0, Math.PI * 2); ctx.fill();
      stats.visibleDots += 1;
    });
    ctx.globalAlpha = 1;
    stats.draws += 1; stats.trailCells = heat.size; stats.ripples = ripples.length;
    dirty = false;
    return heat.size > 0 || ripples.length > 0;
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
      C.events.on('pointer:move', function (event) { if (!C.motion.reduced) pendingPaths.push(event.path); dirty = true; });
      C.events.on('pointer:leave', function () { dirty = true; });
      C.events.on('pointer:click', function (event) {
        if (C.motion.reduced) return;
        ripples.push({ x: event.x, y: event.y, born: event.now, delay: 0, intensity: 1 });
        ripples.push({ x: event.x, y: event.y, born: event.now, delay: C.config.dots.rippleSecondDelayMs, intensity: C.config.shell.dots.secondRingIntensity });
        dirty = true;
      });
      C.events.on('motion:changed', function () { heat.clear(); ripples = []; pendingPaths = []; dirty = true; });
      C.events.on('fx:visibility', function (visible) { if (visible) dirty = true; });
      root.addEventListener('resize', resize);
      C.fx.subscribe(update);
    }
  };
})(window.Cardable, window);
