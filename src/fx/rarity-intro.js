(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function smooth(n) { n = clamp(n); return n * n * (3 - 2 * n); }
  function out(n) { return 1 - Math.pow(1 - clamp(n), 3); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rgba(c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a) + ')'; }
  function color(c) {
    if (C.config.rarityColorMode !== 'mono') return c;
    var l = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072);
    return [l, l, l];
  }
  function tint(c, strength) { return c.map(function (v) { return Math.round(v * strength); }); }
  // Presentation randomness never touches the reserved pull's RNG.
  function randomFor(text) {
    var value = 2166136261;
    for (var i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return function () { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  function starPath(q, r, faceted) {
    q.beginPath(); q.moveTo(0, -r);
    if (faceted) {
      q.lineTo(r * .13, -r * .13); q.lineTo(r, 0); q.lineTo(r * .13, r * .13);
      q.lineTo(0, r); q.lineTo(-r * .13, r * .13); q.lineTo(-r, 0); q.lineTo(-r * .13, -r * .13);
    } else {
      q.quadraticCurveTo(r * .12, -r * .12, r, 0); q.quadraticCurveTo(r * .12, r * .12, 0, r);
      q.quadraticCurveTo(-r * .12, r * .12, -r, 0); q.quadraticCurveTo(-r * .12, -r * .12, 0, -r);
    }
    q.closePath();
  }
  C.rarityIntro = { create: function (parent) {
    var cfg = C.config.rarityIntro, canvas, g, spec, name = '', w = 1, h = 1, dpr = 1;
    var active = false, handing = false, section = null, stageId = '', lastElapsed = 0, fadeMs = 160,runMode='full',cardStage=false,cardAgeMs=0,cardState=null;
    var stars = [], motes = [], shards = [], clouds = Object.create(null), glows = Object.create(null);
    var nebula = null, nebulaKey = '', nebulaAt = -Infinity;
    var refraction = C.refractionIntro.create();
    var gilded = C.gildedIntro.create(), backdrop, backdropG, backSpec = null, backAge = null, seed = '';
    var mythical = C.mythicalIntro.create(), backTime = 0, backPaintAt = -Infinity, backdropFocused = true;
    C.cutscenes.register('crimson', C.mythicalIntro.create); C.cutscenes.register('cosmic', C.exoticIntro.create);
    var exotic = C.cutscenes.create('cosmic'), ascendant = C.cutscenes.create('prismatic'), secret = C.cutscenes.create('secret');
    var notice=C.cutscenes.createNotice(parent),limiter=C.cutscenes.createLimiter(parent),blockedElapsed=0;
    var runtime = C.cutscenes.createRuntime(parent);
    root.addEventListener('blur', function () { backdropFocused = false; });
    root.addEventListener('focus', function () { backdropFocused = true; C.fx.wake(); });
    var stats = { paints: 0, lastDrawMs: 0, maxDrawMs: 0 };
    function quality() { return C.settings.get('cinematicQuality'); }
    function still() { return (active?runtime.mode==='light':backSpec&&runMode==='light')||C.settings.get('cutscenes')==='off'||C.motion.reduced || C.settings.policy.animation === 0 || quality() === 'very-low' || quality() === 'low' && ['prismatic','system'].indexOf((spec||backSpec||{}).kind)<0; }
    function scale() { return C.settings.get('revealSpeed') === 'fast' ? cfg.fastScale : 1; }
    function duration() {
      if(!spec)return 0;
      return C.cutscenes.playDuration(spec,active?runtime.mode:C.cutscenes.mode())*scale();
    }
    function ensure() {
      if (canvas) return;
      canvas = root.document.createElement('canvas'); canvas.className = 'rarity-intro'; canvas.hidden = true;
      canvas.setAttribute('aria-hidden', 'true'); parent.appendChild(canvas); g = canvas.getContext('2d', { alpha: false });
    }
    function resize() {
      if (!canvas && !backdrop) return;
      w = Math.max(1, root.innerWidth); h = Math.max(1, root.innerHeight);
      var budget = quality() === 'high' ? cfg.maxPixels : cfg.maxPixels * .65;
      var visibleSpec = spec || backSpec;
      if (visibleSpec && visibleSpec.kind === 'refraction') budget = Math.min(budget, cfg.refractionMaxPixels);
      if (visibleSpec && visibleSpec.kind === 'gilded') budget = Math.min(budget, cfg.gildedMaxPixels);
      if (visibleSpec && visibleSpec.kind === 'crimson') budget = Math.min(budget, quality() === 'high' ? cfg.mythicalMaxPixels : cfg.mythicalMediumPixels);
      if (visibleSpec && visibleSpec.kind === 'cosmic') budget = Math.min(budget, quality() === 'high' ? cfg.exoticMaxPixels : cfg.exoticMediumPixels);
      if (visibleSpec && visibleSpec.kind === 'system') budget = Math.min(budget, quality() === 'high' ? 1500000 : 975000);
      dpr = visibleSpec && visibleSpec.kind === 'prismatic' ? Math.min(2, C.settings.policy.dpr) * (quality() === 'high' ? 1 : quality() === 'medium' ? .75 : .5) : Math.min(cfg.maxDpr, C.settings.policy.dpr, Math.sqrt(budget / (w * h)));
      if (canvas) {
        var pixelWidth = Math.max(1, Math.floor(w * dpr)), pixelHeight = Math.max(1, Math.floor(h * dpr));
        // Setting an unchanged canvas dimension still clears its pixels and backing store.
        if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      }
      if (active&&!handing) paint(lastElapsed);
      if (backSpec) paintBackdrop();
    }
    function glow(x, y, r, c, a) {
      if (r <= 0 || a <= 0) return;
      var key = c.join(','), sprite = glows[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 128;
        var q = sprite.getContext('2d'), gradient = q.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, rgba(c, 1)); gradient.addColorStop(.18, rgba(c, .64));
        gradient.addColorStop(.5, rgba(c, .17)); gradient.addColorStop(1, rgba(c, 0));
        q.fillStyle = gradient; q.fillRect(0, 0, 128, 128); glows[key] = sprite;
      }
      var before = g.globalAlpha; g.globalAlpha *= clamp(a); g.drawImage(sprite, x - r, y - r, r * 2, r * 2); g.globalAlpha = before;
    }
    function cloudTexture() {
      var base = color(spec.color), light = color(spec.starColor || spec.color), key = spec.kind + ':' + base + ':' + light;
      if (clouds[key]) return clouds[key];
      var atlas = root.document.createElement('canvas'), size = cfg.cloudSize;
      atlas.width = atlas.height = size;
      var q = atlas.getContext('2d'), image = q.createImageData(size, size), random = randomFor('cardable-cloud-material-v2');
      var grids = [16, 32, 64].map(function (n) {
        var grid = { n: n, values: new Float32Array(n * n) };
        for (var i = 0; i < grid.values.length; i++) grid.values[i] = random();
        return grid;
      });
      function noise(grid, u, v) {
        var n = grid.n, x = ((u % 1 + 1) % 1) * n, y = ((v % 1 + 1) % 1) * n;
        var ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy), values = grid.values;
        return mix(mix(values[iy * n + ix], values[iy * n + (ix + 1) % n], fx),
          mix(values[((iy + 1) % n) * n + ix], values[((iy + 1) % n) * n + (ix + 1) % n], fx), fy);
      }
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var dx = x / size - .5, dy = y / size - .5, radius = Math.hypot(dx, dy), angle = Math.atan2(dy, dx) + radius * 3.5;
        var u = .5 + Math.cos(angle) * radius, v = .5 + Math.sin(angle) * radius;
        u += Math.sin(v * 13) * .045; v += Math.sin(u * 9) * .05;
        var density = noise(grids[0], u * .58, v * .58) * .58 + noise(grids[1], u, v) * .29 + noise(grids[2], u, v) * .13;
        var billow = smooth((density - .27) / .46), bright = Math.pow(billow, 3.2);
        var edge = 1 - smooth((radius - .32) / .19), index = (y * size + x) * 4;
        for (var channel = 0; channel < 3; channel++) {
          image.data[index + channel] = spec.kind === 'crystal' ? mix(base[channel], light[channel], billow) :
            mix(base[channel] * (.15 + billow * .85), light[channel], bright * .52);
        }
        image.data[index + 3] = Math.round(edge * (spec.kind === 'crystal' ? 255 : 230));
      }
      q.putImageData(image, 0, 0); clouds[key] = atlas; return atlas;
    }
    function star(x, y, r, c, a, angle, stretch) {
      g.save(); g.translate(x, y); g.rotate(angle || 0); g.scale(1, stretch || 1);
      starPath(g, r); g.fillStyle = rgba(c, a); g.fill(); g.restore();
    }
    function background() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (spec.kind !== 'refraction' && spec.kind !== 'gilded' && spec.kind !== 'crimson' && spec.kind !== 'cosmic') { g.fillStyle = rgba(color(spec.background || [8, 8, 10]), 1); g.fillRect(0, 0, w, h); }
    }
    // Four curved, beveled light fronts: the luminous edge, not a flat tint, leads the sweep.
    function fronts(spread, opacity, wash) {
      var c = color(spec.color), reach = Math.hypot(w, h) * mix(.105, .57, spread);
      g.save(); g.globalAlpha = opacity * spec.intensity;
      [[0, 0], [w, 0], [w, h], [0, h]].forEach(function (point) {
        g.save(); g.translate(point[0], point[1]); g.rotate(Math.atan2(h / 2 - point[1], w / 2 - point[0]));
        var gradient = g.createLinearGradient(0, 0, reach, 0);
        gradient.addColorStop(0, rgba(c, .02)); gradient.addColorStop(.56, rgba(c, .035));
        gradient.addColorStop(.82, rgba(c, .32)); gradient.addColorStop(.95, rgba(c, .8)); gradient.addColorStop(1, rgba(c, 0));
        g.beginPath(); g.moveTo(0, -reach * .65); g.bezierCurveTo(reach * .4, -reach * .55, reach * .9, -reach * .32, reach, 0);
        g.bezierCurveTo(reach * .9, reach * .32, reach * .4, reach * .55, 0, reach * .65); g.closePath();
        g.fillStyle = gradient; g.fill();
        for (var i = 0; i < 3; i++) {
          var r = reach * (1 - i * .045);
          g.beginPath(); g.ellipse(0, 0, r, r * .72, 0, -.52, .52);
          g.strokeStyle = rgba(c, .58 / (1 + i * 1.7)); g.lineWidth = i ? 1 : 2; g.stroke();
        }
        glow(0, 0, reach * .42, c, .22); g.restore();
      });
      g.fillStyle = rgba(c, wash); g.fillRect(0, 0, w, h); g.restore();
    }
    function collapse(p, opacity) {
      var c = color(spec.color), amount = opacity * spec.intensity, travel = out(p), r = Math.min(w, h) * mix(.3, .065, travel);
      g.save(); g.globalAlpha = amount;
      [[0, 0], [w, 0], [w, h], [0, h]].forEach(function (point) {
        var x = mix(point[0], w / 2, travel), y = mix(point[1], h / 2, travel);
        var gradient = g.createLinearGradient(x, y, w / 2, h / 2);
        gradient.addColorStop(0, rgba(c, 0)); gradient.addColorStop(.76, rgba(c, .22)); gradient.addColorStop(1, rgba(c, .6));
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(w / 2, y, w / 2, h / 2); g.strokeStyle = gradient;
        g.lineWidth = mix(2.5, .75, travel); g.stroke();
      });
      glow(w / 2, h / 2, r * 3, c, .5); star(w / 2, h / 2, r, c, .7 * (1 - travel)); g.restore();
    }
    function screenStars(t, c, opacity, contraction) {
      var count = quality() === 'high' ? stars.length : Math.ceil(stars.length * .75), pull = out(contraction || 0);
      for (var i = 0; i < count; i++) {
        var s = stars[i], a = opacity * (.5 + .5 * Math.pow(Math.sin(t * .7 + s.phase), 2));
        var x = mix(s.x * w, w / 2, pull), y = mix(s.y * h, h / 2, pull), r = s.size * (1 - pull * .55);
        if (i < 6) glow(x, y, r * 5, c, a * .4);
        star(x, y, r, c, a, s.angle + t * .035);
      }
    }
    function borderOrbits(t, opacity, contraction) {
      var c = color(spec.orbitColor || spec.color), pull = out(contraction || 0), rx = mix(w * .46, Math.min(w, h) * .07, pull);
      var ry = mix(h * .43, Math.min(w, h) * .07, pull);
      g.save(); g.globalAlpha = opacity;
      g.strokeStyle = rgba(c, .14); g.lineWidth = 1; g.beginPath(); g.ellipse(w / 2, h / 2, rx, ry, 0, 0, TAU); g.stroke();
      for (var i = 0; i < 12; i++) {
        var angle = t * .23 + i * TAU / 12, x = w / 2 + Math.cos(angle) * rx, y = h / 2 + Math.sin(angle) * ry;
        var r = (9 + i % 3 * 7) * (1 - pull * .7);
        glow(x, y, r * 2.5, c, .2); g.strokeStyle = rgba(c, .65); g.lineWidth = 1.4;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
        g.strokeStyle = rgba(c, .2); g.beginPath(); g.arc(x, y, r * .74, -.7 + t, .9 + t); g.stroke();
      }
      g.restore();
    }
    function cloudStar(radius, opacity, t) {
      var c = color(spec.color), light = color(spec.starColor), atlas = cloudTexture();
      glow(w / 2, h / 2, radius * 1.65, c, opacity * .4);
      g.save(); g.translate(w / 2, h / 2); g.globalAlpha = opacity; starPath(g, radius, true); g.clip();
      var gradient = g.createLinearGradient(-radius, -radius, radius, radius);
      gradient.addColorStop(0, rgba(light, 1)); gradient.addColorStop(.48, rgba(c, 1)); gradient.addColorStop(1, rgba(tint(c, .45), 1));
      g.fillStyle = gradient; g.fillRect(-radius, -radius, radius * 2, radius * 2);
      g.save(); g.translate(Math.sin(t * .55) * radius * .14, Math.cos(t * .3) * radius * .1); g.rotate(t * .055);
      g.drawImage(atlas, -radius * 1.3, -radius * 1.3, radius * 2.6, radius * 2.6); g.restore();
      g.globalAlpha = opacity * .32; g.rotate(-t * .08); g.drawImage(atlas, -radius * .94, -radius * 1.2, radius * 2, radius * 2.5); g.restore();
      g.save(); g.translate(w / 2, h / 2); starPath(g, radius, true); g.strokeStyle = rgba(light, opacity * .85); g.lineWidth = 1.5; g.stroke();
      g.beginPath(); g.moveTo(0, -radius); g.lineTo(0, radius); g.moveTo(-radius, 0); g.lineTo(radius, 0);
      g.strokeStyle = rgba(light, opacity * .22); g.lineWidth = .8; g.stroke(); g.restore();
    }
    // Tessellated from the actual four-point star. At p=0 these pieces assemble the original silhouette.
    function crystalShards(p, t, radius) {
      var c = color(spec.color), light = color(spec.starColor), atlas = cloudTexture();
      shards.forEach(function (shard, index) {
        var delay = index % 4 * .025, progress = clamp((p - delay) / (1 - delay));
        var travel = out(progress) * radius * (.3 + shard.speed * .45), fade = 1 - smooth((progress - .12) / .88);
        var cx = shard.cx * radius, cy = shard.cy * radius, angle = Math.atan2(cy, cx);
        g.save(); g.translate(w / 2 + Math.cos(angle) * travel, h / 2 + Math.sin(angle) * travel);
        g.translate(cx, cy); g.rotate(shard.turn * progress); g.translate(-cx, -cy); g.globalAlpha = fade;
        g.beginPath(); shard.points.forEach(function (point, i) { if (i) g.lineTo(point[0] * radius, point[1] * radius); else g.moveTo(point[0] * radius, point[1] * radius); }); g.closePath();
        g.save(); g.clip(); g.fillStyle = rgba(c, 1); g.fillRect(-radius, -radius, radius * 2, radius * 2);
        g.drawImage(atlas, -radius * 1.3 + Math.sin(t * .55) * radius * .14, -radius * 1.3, radius * 2.6, radius * 2.6); g.restore();
        g.strokeStyle = rgba(light, .8); g.lineWidth = 1; g.stroke(); g.restore();
      });
    }
    function pulseFrame(s, t) {
      var p = s.p, c = color(spec.color), isCrystal = spec.kind === 'crystal', retreat = s.id === 'retreat' || s.id === 'release';
      var opacity = s.id === 'corners' ? smooth(p) : retreat ? 1 - smooth(p) * .8 : 1;
      if (s.id === 'corners') fronts(.035, opacity, 0);
      else if (s.id === 'spread') fronts(smooth(p), 1, .12 * smooth(p));
      else if (s.id === 'peak' || s.id === 'orbit') {
        fronts(1, 1, .16 + .24 * Math.sin(p * Math.PI)); glow(w / 2, h / 2, Math.hypot(w, h) * .6, c, .38);
      } else if (retreat) {
        if (!isCrystal) {
          var tail = 1 - smooth(p / .55); fronts(1 - .18 * smooth(p), tail, .16 * tail);
          collapse(p, opacity * (.2 + .8 * smooth(p / .4)));
        } else glow(w / 2, h / 2, Math.min(w, h) * mix(.62, .18, out(p)), c, .2);
      }
      else {
        var remaining = s.id === 'approach' ? 1 - smooth(p * 2) : 0;
        fronts(1, remaining * .35, 0); glow(w / 2, h / 2, Math.min(w, h) * .62, c, .2);
      }
      if (spec.kind !== 'pulse') {
        var envelope = isCrystal && !retreat && s.id !== 'corners' && s.id !== 'spread' ? .35 : opacity;
        borderOrbits(t, envelope * .75, retreat ? p : 0);
        screenStars(t, color(spec.orbitColor || spec.color), envelope * .85, retreat ? p : 0);
      }
      if (s.id === 'approach') cloudStar(Math.min(w, h) * mix(.13, .26, smooth(p)), smooth(p * 4), t);
      else if (s.id === 'snap') {
        var r = Math.min(w, h) * mix(.26, .42, out(p)); cloudStar(r, 1, t); glow(w / 2, h / 2, r * .7, color(spec.starColor), .35 * Math.sin(p * Math.PI));
      } else if (s.id === 'fracture') crystalShards(p, t, Math.min(w, h) * .42);
    }
    function ring(radius, angle, opacity, inner) {
      var c = color(spec.orbitColor || spec.color), light = color(spec.starColor || c), count = inner ? 6 : 8;
      g.save(); g.translate(w / 2, h / 2); g.rotate(angle); g.globalAlpha *= opacity;
      var gradient = g.createLinearGradient(-radius, -radius, radius, radius);
      gradient.addColorStop(0, rgba(light, .96)); gradient.addColorStop(.4, rgba(c, .9)); gradient.addColorStop(1, rgba(tint(c, .42), .9));
      for (var i = 0; i < count; i++) {
        var start = i * TAU / count + .055, end = (i + 1) * TAU / count - .055, thickness = radius * (inner ? .006 : .014);
        g.beginPath(); g.arc(0, 0, radius, start, end); g.strokeStyle = rgba(c, .12); g.lineWidth = thickness * 4; g.stroke();
        g.beginPath(); g.arc(0, 0, radius - thickness, start, end);
        g.lineTo(Math.cos(end + .022) * (radius + thickness), Math.sin(end + .022) * (radius + thickness));
        g.arc(0, 0, radius + thickness, end + .022, start, true); g.closePath(); g.fillStyle = gradient; g.fill();
        g.beginPath(); g.arc(0, 0, radius + thickness, start, end);
        g.strokeStyle = rgba(light, inner ? .45 : .82); g.lineWidth = 1.1; g.stroke();
        g.beginPath(); g.arc(0, 0, radius - thickness * 2.4, start + .035, end - .07);
        g.strokeStyle = rgba(c, .3); g.lineWidth = .75; g.stroke();
      }
      if (!inner) for (var j = 0; j < 4; j++) {
        var a = j * TAU / 4, x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        g.save(); g.translate(x, y); g.rotate(a); starPath(g, radius * .063); g.fillStyle = gradient; g.fill();
        g.strokeStyle = rgba(light, .8); g.lineWidth = 1; g.stroke();
        starPath(g, radius * .035); g.fillStyle = rgba(tint(c, .16), 1); g.fill();
        g.beginPath(); g.moveTo(radius * .085, 0); g.lineTo(radius * .124, radius * .022); g.lineTo(radius * .164, 0); g.lineTo(radius * .124, -radius * .022); g.closePath();
        g.fillStyle = rgba(c, .72); g.fill(); g.strokeStyle = rgba(light, .65); g.stroke(); g.restore();
      }
      g.restore();
    }
    // Composite cloud layers at material resolution, then scale once. Camera dives never
    // allocate a larger texture or re-rasterize two clouds across the entire viewport.
    function nebulaTexture(t) {
      var c = color(spec.color), light = color(spec.starColor), size = quality() === 'high' ? cfg.cloudSize : Math.round(cfg.cloudSize * .75), key = c + ':' + light + ':' + size;
      if (!nebula) nebula = root.document.createElement('canvas');
      if (nebula.width !== size) nebula.width = nebula.height = size;
      // Only slow cloud advection is cached at 30 Hz. Rings, camera, light and the
      // full-screen intro continue to paint on every shared scheduler frame.
      if (key === nebulaKey && Math.abs(t - nebulaAt) < 1 / 30) return nebula;
      nebulaKey = key; nebulaAt = t;
      var q = nebula.getContext('2d'), radius = size / 2, atlas = cloudTexture();
      q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, size, size);
      q.save(); q.translate(radius, radius); q.beginPath(); q.arc(0, 0, radius * .91, 0, TAU); q.clip();
      var gradient = q.createRadialGradient(-radius * .12, -radius * .13, 0, 0, 0, radius);
      gradient.addColorStop(0, rgba(c, .82)); gradient.addColorStop(.52, rgba(tint(c, .55), .8)); gradient.addColorStop(1, rgba(tint(c, .07), .9));
      q.fillStyle = gradient; q.fillRect(-radius, -radius, radius * 2, radius * 2);
      q.save(); q.rotate(t * .12); q.drawImage(atlas, -radius, -radius, radius * 2, radius * 2); q.restore();
      q.save(); q.rotate(-t * .17 + 1.5); q.globalAlpha = .65; q.drawImage(atlas, -radius * 1.08, -radius * .92, radius * 2.16, radius * 1.84); q.restore();
      for (var i = 0; i < 3; i++) {
        q.save(); q.rotate(t * .17 + i * TAU / 3); var r = radius * (.5 + i * .055);
        var arcLight = q.createLinearGradient(-r, -r, r, r); arcLight.addColorStop(0, rgba(light, 0));
        arcLight.addColorStop(.5, rgba(light, .1)); arcLight.addColorStop(1, rgba(c, 0));
        q.strokeStyle = arcLight; q.lineWidth = radius * .025; q.lineCap = 'round'; q.beginPath(); q.ellipse(0, 0, r, r * .88, 0, -.9, 1.4); q.stroke(); q.restore();
      }
      q.restore(); return nebula;
    }
    function portal(radius, t, opacity) {
      var c = color(spec.color), light = color(spec.starColor);
      g.save(); g.globalAlpha = opacity; glow(w / 2, h / 2, radius * 1.4, c, .32);
      g.drawImage(nebulaTexture(t), w / 2 - radius, h / 2 - radius, radius * 2, radius * 2);
      ring(radius, t * .14, .95, false); ring(radius * .81, -t * .23, .78, true);
      var beam = g.createLinearGradient(0, h / 2 - radius * 1.2, 0, h / 2 + radius * 1.2);
      beam.addColorStop(0, rgba(light, 0)); beam.addColorStop(.5, rgba(light, .36)); beam.addColorStop(1, rgba(light, 0));
      g.fillStyle = beam; g.fillRect(w / 2 - radius * .008, h / 2 - radius * 1.2, radius * .016, radius * 2.4);
      glow(w / 2, h / 2, radius * .5, light, .6);
      g.save(); g.translate(w / 2, h / 2); g.scale(1, 2.15); starPath(g, radius * .245);
      var jewel = g.createLinearGradient(-radius * .2, -radius * .25, radius * .2, radius * .25);
      jewel.addColorStop(0, rgba(c, 1)); jewel.addColorStop(.44, rgba(light, 1)); jewel.addColorStop(.55, rgba(light, 1)); jewel.addColorStop(1, rgba(tint(c, .6), 1));
      g.fillStyle = jewel; g.fill(); g.strokeStyle = rgba(light, .95); g.lineWidth = .8; g.stroke();
      g.save(); g.clip(); g.beginPath(); g.moveTo(0, -radius * .245); g.lineTo(0, radius * .245); g.lineTo(radius * .245, 0); g.closePath();
      g.fillStyle = rgba(c, .23); g.fill(); g.beginPath(); g.moveTo(0, -radius * .245); g.lineTo(0, 0); g.lineTo(-radius * .245, 0); g.closePath();
      g.fillStyle = rgba(light, .25); g.fill(); g.restore(); g.restore();
      glow(w / 2, h / 2, radius * .18, light, .55);
      star(w / 2, h / 2, radius * .08, light, 1, 0, 2.35);
      for (var j = 0; j < 6; j++) {
        var a = j * TAU / 6 + t * .09, x = w / 2 + Math.cos(a) * radius * .42, y = h / 2 + Math.sin(a) * radius * .43;
        star(x, y, radius * (j % 2 ? .035 : .064), light, .86, -a * .6);
      }
      star(w / 2, h / 2 - radius * .71, radius * .025, light, .92, 0, 2);
      star(w / 2, h / 2 + radius * .71, radius * .025, light, .92, 0, 2); g.restore();
    }
    function converging(t, progress, opacity) {
      var c = color(spec.starColor), radius = Math.min(w, h) * .4;
      motes.forEach(function (m, i) {
        var a = m.angle + t * (.32 + m.speed * .15) + progress * 1.6, distance = radius * mix(m.distance, .025, smooth(progress));
        var x = w / 2 + Math.cos(a) * distance, y = h / 2 + Math.sin(a) * distance;
        g.beginPath(); g.moveTo(w / 2 + Math.cos(a - .11) * distance * 1.015, h / 2 + Math.sin(a - .11) * distance * 1.015); g.lineTo(x, y);
        g.strokeStyle = rgba(c, opacity * .26); g.lineWidth = .75; g.stroke();
        if (i < 8) glow(x, y, m.size * 5, c, opacity * .38);
        star(x, y, m.size * (1 + progress * .6), c, opacity * (.4 + .6 * m.speed), a);
      });
    }
    function sky(t, opacity, flash) {
      var c = color(spec.orbitColor || spec.color), light = color(spec.starColor), gradient = g.createLinearGradient(0, h, w, 0);
      gradient.addColorStop(0, rgba(c, opacity)); gradient.addColorStop(.52 + Math.sin(t * .65) * .13, rgba(light, opacity)); gradient.addColorStop(1, rgba(c, opacity));
      g.fillStyle = gradient; g.fillRect(0, 0, w, h);
      glow(w * (.5 + Math.sin(t * .35) * .12), h * .45, Math.hypot(w, h) * .8, light, flash);
    }
    function portalFrame(s, t) {
      var p = s.p, radius = Math.min(w, h) * .44, c = color(spec.color), light = color(spec.starColor);
      screenStars(t, light, s.id === 'sparks' ? smooth(p) * .12 : s.id === 'release' ? .18 * (1 - p) : .3, 0);
      if (s.id === 'sparks') { converging(t, 0, smooth(p) * .6); glow(w / 2, h / 2, radius * .3, c, .08 * smooth(p)); }
      else if (s.id === 'orbit') {
        converging(t, p * .2, .7); var a = t * 2.1, orbit = radius * .17;
        ring(orbit, t * .4, smooth(p) * .4, true); glow(w / 2, h / 2, radius * .35, c, .13);
        star(w / 2 + Math.cos(a) * orbit, h / 2 + Math.sin(a) * orbit, radius * .035, light, 1, -a, 1.3);
      } else if (s.id === 'gather') {
        converging(t, mix(.2, 1, p), 1); var r = radius * mix(.018, .12, smooth(p));
        var a = t * 2.1 + p * 1.6, distance = radius * .17 * (1 - smooth(p / .7));
        star(w / 2 + Math.cos(a) * distance, h / 2 + Math.sin(a) * distance, radius * .035, light, 1 - smooth(p / .7), -a, 1.3);
        star(w / 2, h / 2, r, light, .96, 0, 1.8); glow(w / 2, h / 2, radius * .55, c, mix(.13, .65, p));
      } else if (s.id === 'burst') {
        var reveal = out(p);
        star(w / 2, h / 2, radius * .12, light, 1 - reveal, 0, 1.8); glow(w / 2, h / 2, radius * .55, c, .65 * (1 - reveal));
        portal(radius * (.18 + reveal * .82 + Math.sin(p * Math.PI) * .035), t, reveal);
        glow(w / 2, h / 2, radius * 1.2, light, .3 * Math.sin(p * Math.PI));
      } else if (s.id === 'portal') portal(radius * mix(1, 1.025, smooth(p)), t, 1);
      else if (s.id === 'dive') { portal(radius * (1.025 + 5.5 * Math.pow(p, 2.8)), t, 1); sky(t, smooth((p - .45) / .55), .15 * smooth(p)); }
      else if (s.id === 'wash') sky(t, 1, .3 * Math.sin(p * Math.PI));
      else if (s.id === 'release') sky(t, 1 - .55 * out(p), .08 * (1 - p));
    }
    function staticFrame(p) {
      var envelope = smooth(p / .25) * (1 - smooth((p - .65) / .35)), c = color(spec.color);
      fronts(.7, envelope * .23, .04); glow(w / 2, h / 2, Math.min(w, h) * .38, c, envelope * .2);
      if (spec.kind === 'portal') {
        ring(Math.min(w, h) * .34, 0, envelope * .45, false); ring(Math.min(w, h) * .28, 0, envelope * .3, true);
        star(w / 2, h / 2, Math.min(w, h) * .075, color(spec.starColor), envelope * .5, 0, 1.9);
      } else if (spec.kind === 'crystal') star(w / 2, h / 2, Math.min(w, h) * .22, color(spec.starColor), envelope * .45);
      else if (spec.kind === 'orbit') { g.strokeStyle = rgba(color(spec.orbitColor), envelope * .25); g.beginPath(); g.ellipse(w / 2, h / 2, w * .44, h * .43, 0, 0, TAU); g.stroke(); }
    }
    function segment(elapsed, total) {
      var full = spec.sections.reduce(function (n, s) { return n + s.ms; }, 0), time = clamp(elapsed / total) * full, offset = 0;
      for (var i = 0; i < spec.sections.length; i++) {
        var s = spec.sections[i];
        if (time < offset + s.ms || i === spec.sections.length - 1) return { id: s.id, p: clamp((time - offset) / s.ms) };
        offset += s.ms;
      }
    }
    function basicPrelude(time) {
      var saved=spec,offset=0;spec=C.rarity('basic').openingIntro;
      for(var i=0;i<spec.sections.length;i++){var part=spec.sections[i];if(time<=offset+part.ms){pulseFrame({id:part.id,p:clamp((time-offset)/part.ms)},time/1000);break;}offset+=part.ms;}
      spec=saved;
    }
    function paint(elapsed) {
      var begin = root.performance.now(), total = duration(); background(); section = segment(elapsed, total);
      if(spec.kind==='system'){
        if(notice.pending){g.fillStyle='#000';g.fillRect(0,0,w,h);return;}
        var skip=runtime.skipState,secretSection=skip?segment(skip.from/spec.sections.reduce(function(n,p){return n+p.ms;},0)*total,total):section;
        if(!still()&&secretSection.id==='fakeout')basicPrelude(secretSection.p*2400);
        secret.paint(g,w,h,secretSection,elapsed/1000,still()?clamp(elapsed/total):null);
        if(skip){secret.setSkipped();g.fillStyle='rgba(0,0,0,'+smooth(skip.progress)+')';g.fillRect(0,0,w,h);}
        limiter.apply(canvas,root.performance.now());
      }
      else if (spec.kind === 'prismatic') ascendant.paint(g, w, h, section, elapsed / 1000, still() ? clamp(elapsed / total) : null);
      else if (spec.kind === 'refraction') refraction.paint(g, w, h, section, elapsed / 1000, still() ? clamp(elapsed / total) : null);
      else if (spec.kind === 'gilded') gilded.paint(g, w, h, section, still() ? clamp(elapsed / total) : null);
      else if (spec.kind === 'crimson') mythical.paint(g, w, h, section, elapsed / 1000, still() ? clamp(elapsed / total) : null);
      else if (spec.kind === 'cosmic') {
        exotic.paint(g, w, h, section, elapsed / 1000, still() ? clamp(elapsed / total) : null);
        if (!still() && section.id === 'prelude') {
          // Use Basic's real fronts and palette, interrupting at its peak before any card mounts.
          basicPrelude(section.p * spec.sections[0].ms);
        }
      }
      else if (still()) staticFrame(clamp(elapsed / total)); else if (spec.kind === 'portal') portalFrame(section, elapsed / 1000); else pulseFrame(section, elapsed / 1000);
      if (spec.kind === 'prismatic' && !still()) runtime.letterbox(g, w, h, elapsed / total * spec.sections.reduce(function(n,s){return n+s.ms;},0));
      if(spec.kind!=='system')runtime.meter(canvas,runtime.presentationMs);
      stats.paints++; stats.lastDrawMs = root.performance.now() - begin; stats.maxDrawMs = Math.max(stats.maxDrawMs, stats.lastDrawMs);
    }
    function start(next, label, instanceSeed) {
      if (active) stop(); ensure(); spec = next; name = label; active = true; handing = false; stageId = ''; lastElapsed = 0;cardStage=false;cardAgeMs=0;cardState=null;runMode=C.cutscenes.mode();if(quality()==='low'&&['prismatic','system'].indexOf(next.kind)<0)runMode='light';blockedElapsed=0;
      clearBackdrop(); seed = instanceSeed || label;
      if(spec.kind==='system'){
        root.document.body.classList.add('is-secret-cinematic');
        notice.start(function(profile){secret.setProfile(profile);limiter.reset(profile);runtime.start(spec,secret,runMode);});
        secret.start(spec,seed,runMode==='light');limiter.reset(C.cutscenes.profile());
      }
      if (spec.kind === 'refraction') refraction.start(spec, seed || label);
      if (spec.kind === 'gilded') gilded.start(spec, seed);
      if (spec.kind === 'crimson') mythical.start(spec, seed);
      if (spec.kind === 'cosmic') exotic.start(spec, seed);
      if (spec.kind === 'prismatic') { ascendant.start(spec, seed,runMode==='light'); C.ascendantBackground.begin(seed, 0); }
      runtime.start(spec, spec.kind === 'system' ? secret : spec.kind === 'prismatic' ? ascendant : spec.kind === 'crimson' ? mythical : exotic,runMode);
      canvas.hidden = false; canvas.style.opacity = '1'; resize();
      var random = randomFor(seed || label); stars = []; motes = []; shards = [];
      for (var i = 0; i < cfg.stars; i++) stars.push({ x: random(), y: random(), size: i < 6 ? 5 + random() * 6 : 1.8 + random() * 3.6, phase: random() * TAU, angle: random() * .25 });
      for (var j = 0; j < cfg.motes; j++) motes.push({ angle: random() * TAU, distance: .28 + random() * .72, speed: random(), size: 1.5 + random() * 2.8 });
      for (var arm = 0; arm < 4; arm++) {
        var a = arm * TAU / 4, left = [-.13, -.13], right = [.13, -.13], tip = [0, -1], mid = [0, -.52];
        [[[0, 0], left, mid], [left, tip, mid], [[0, 0], mid, right], [mid, tip, right]].forEach(function (triangle) {
          var points = triangle.map(function (p) { return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]; });
          shards.push({ points: points, cx: (points[0][0] + points[1][0] + points[2][0]) / 3, cy: (points[0][1] + points[1][1] + points[2][1]) / 3, speed: random(), turn: (random() - .5) * 1.1 });
        });
      }
      if (!still() && (spec.kind === 'crystal' || spec.kind === 'portal')) cloudTexture();
      C.events.emit('opening:introStart', { rarity: label, durationMs: duration(), sections: next.sections }); update(0, root.performance.now());
    }
    function update(elapsed, now) {
      if (!active || handing) return true;
      if(spec.kind==='system'){
        if(notice.pending){blockedElapsed=elapsed;if(notice.update(now)){paint(0);return false;}}
        elapsed=Math.max(0,elapsed-blockedElapsed);
      }
      elapsed = runtime.update(elapsed, duration(), still());
      lastElapsed = elapsed; paint(elapsed);
      if (section.id !== stageId) { stageId = section.id; C.events.emit('opening:introSection', { rarity: name, id: stageId }); }
      if(spec.kind==='prismatic'&&spec.cardScene){var film=C.cutscenes.timeline(spec);return runtime.mode==='light'?elapsed>=duration()*spec.light.handoffMs/spec.light.ms:runtime.timeMs>=film.sections.card.start;}
      return elapsed >= duration();
    }
    function beginHandoff() {
      if (!active) return;
      runMode=runtime.mode;cardStage=spec.kind==='prismatic'&&!!spec.cardScene;cardAgeMs=0;cardState=null;
      runtime.stop(); handing = true; fadeMs = spec.handoff.fadeMs * scale(); canvas.style.opacity = '1';
      if (spec.kind === 'system') secret.handoff(runMode==='light');
      if (spec.kind === 'crimson') mythical.releaseScene();
      if (spec.kind === 'prismatic') {if(cardStage)cardAgeMs=ascendant.handoff(runMode==='light');else ascendant.releaseScene();}
      if (spec.backdrop && spec.backdrop.enabled) { backSpec = spec; backAge = null; backTime = spec.kind==='system'?C.secretBackground.sample(seed,0).time*1000:cardStage?cardAgeMs:0; backPaintAt = -Infinity; paintBackdrop(); }
    }
    function updateRelease(elapsed,dt) {
      if (!handing || !active) return;
      if(cardStage){
        cardAgeMs+=Math.max(0,dt||0)/scale();backTime=cardAgeMs;cardState=ascendant.cardFrame(cardAgeMs,runMode==='light');
        if(cardAgeMs<(spec.cardScene.fadeMs||160)){g.setTransform(dpr,0,0,dpr,0,0);ascendant.paintRelease(g,w,h,cardAgeMs,runMode==='light');}
        canvas.style.opacity=String(1-smooth(cardAgeMs/(spec.cardScene.fadeMs||160)));
        if(cardAgeMs>=spec.cardScene.fadeMs)canvas.hidden=true;
        if(cardState.done){C.ascendantBackground.setBorder(seed,1);endOverlay();}
      }else{canvas.style.opacity = String(1 - smooth(elapsed / fadeMs));if (elapsed >= fadeMs) endOverlay();}
    }
    function endOverlay() {
      if (!active) return;
      runtime.stop();
      if(spec&&spec.kind==='system'){secret.releaseScene();notice.stop();limiter.hide();root.document.body.classList.remove('is-secret-cinematic');}
      if (spec && spec.kind === 'crimson') mythical.releaseScene();
      if (spec && spec.kind === 'prismatic') ascendant.releaseScene();
      active = false; handing = false;cardStage=false;cardState=null; canvas.hidden = true; canvas.style.opacity = ''; spec = null; section = null;
      C.events.emit('opening:introEnd', { rarity: name });
    }
    function paintBackdrop() {
      if (!backSpec) return;
      if (!backdrop) {
        backdrop = root.document.createElement('canvas'); backdrop.className = 'rarity-backdrop'; backdrop.setAttribute('aria-hidden', 'true');
        parent.insertBefore(backdrop, parent.firstChild); backdropG = backdrop.getContext('2d', { alpha: false });
      }
      var bw = Math.max(1, Math.floor(w * dpr)), bh = Math.max(1, Math.floor(h * dpr));
      if (backdrop.width !== bw || backdrop.height !== bh) { backdrop.width = bw; backdrop.height = bh; }
      backdropG.setTransform(dpr, 0, 0, dpr, 0, 0);
      if(backSpec.kind==='system'){C.secretBackground.setTime(seed,backTime/1000);secret.backplate(backdropG,w,h,backTime/1000);}
      else if (backSpec.kind === 'crimson') mythical.backplate(backdropG, w, h, still() ? 0 : backTime / 1000);
      else if (backSpec.kind === 'prismatic') { C.ascendantBackground.setTime(seed, still() ? 0 : backTime / 1000); ascendant.backplate(backdropG, w, h, still() ? 0 : backTime / 1000); }
      else if (backSpec.kind === 'cosmic') exotic.backplate(backdropG, w, h, still() ? 0 : backTime / 1000);
      else gilded.backplate(backdropG, w, h);
      backPaintAt = backTime;
      backdrop.hidden = false; backdrop.style.opacity = backAge === null ? '1' : String(1 - smooth(backAge / (backSpec.backdrop.exitMs * scale())));
      parent.classList.add('has-rarity-backdrop');
    }
    function restoreBackdrop(next, instanceSeed) {
      if (!next || !next.backdrop || !next.backdrop.enabled) return;
      ensure(); backSpec = next;runMode=C.cutscenes.mode(); backAge = null; seed = instanceSeed; backTime = 0; backPaintAt = -Infinity;
      if(next.kind==='system'){C.cutscenes.chooseProfile(null);secret.start(next,seed,true);C.secretBackground.begin(seed,0,C.cutscenes.profile());}
      else if (next.kind === 'prismatic') { ascendant.start(next, seed, true); C.ascendantBackground.begin(seed, 0); } else if (next.kind === 'crimson') mythical.start(next, seed); else if (next.kind === 'cosmic') exotic.start(next, seed, true); else gilded.start(next, seed); resize();
    }
    function clearBackdrop() {
      if(backSpec&&backSpec.kind==='system'){C.secretBackground.end();C.cutscenes.chooseProfile(null);}
      if (backSpec && backSpec.kind === 'prismatic') C.ascendantBackground.end();
      backSpec = null; backAge = null; backTime = 0; backPaintAt = -Infinity; parent.classList.remove('has-rarity-backdrop');
      if (backdrop) { backdrop.hidden = true; backdrop.style.opacity = ''; }
    }
    function exitBackdrop() { if (backSpec && backAge === null) backAge = 0; }
    function updateBackdrop(dt) {
      if (!backSpec) return false;
      if (backAge === null) {
        var living = backSpec.backdrop.animated && !still() && backdropFocused && !root.document.hidden && !(C.menu && (C.menu.afk || C.menu.idle));
        if (living) { if(!cardStage)backTime += dt; if (backTime - backPaintAt >= cfg.backdropFrameMs) paintBackdrop(); }
        return !!living;
      }
      backAge += dt; var p = clamp(backAge / (backSpec.backdrop.exitMs * scale()));
      backdrop.style.opacity = String(1 - smooth(p)); if (p === 1) clearBackdrop();
      return p < 1;
    }
    function stop() { notice.stop();limiter.hide();secret.stop();root.document.body.classList.remove('is-secret-cinematic');runtime.stop(); endOverlay(); clearBackdrop(); mythical.stop(); ascendant.stop(); }
    return { start: start, update: update, stop: stop, resize: resize, beginHandoff: beginHandoff, updateRelease: updateRelease,
      restoreBackdrop: restoreBackdrop, exitBackdrop: exitBackdrop, updateBackdrop: updateBackdrop,
      get cardFrame(){return cardState;},get cardStageActive(){return cardStage;},
      get backdrop() { return backdrop; }, get backdropActive() { return !!backSpec; },
      get runtime() { return runtime; }, get sceneCanvas() { var painter = (spec || {}).kind === 'system' ? secret : (spec || {}).kind === 'prismatic' ? ascendant : mythical; return painter.scene && painter.scene.canvas; }, get rendererStats() { var kind = (spec || backSpec || {}).kind; return kind === 'system' ? secret.stats : kind === 'prismatic' ? ascendant.stats : kind === 'cosmic' ? exotic.stats : mythical.stats; },
      get active() { return active; }, get durationMs() { return duration(); }, get section() { return section && section.id; }, get canvas() { return canvas; }, stats: stats };
  } };
})(window.Cardable, window);
