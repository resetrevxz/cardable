(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function smooth(n) { n = clamp(n); return n * n * (3 - 2 * n); }
  function out(n) { return 1 - Math.pow(1 - clamp(n), 3); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rgba(c, a) { return C.fxColor.rgba(c, a); }
  function color(c) {
    return C.fxColor.tone(c);
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
    var portalCloud = null, portalCloudKey = '', portalWhite = 0;
    var refraction = C.refractionIntro.create();
    var rare = C.rareIntro.create();
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
      w = Math.max(1, C.viewport.width); h = Math.max(1, C.viewport.height);
      var budget = quality() === 'high' ? cfg.maxPixels : cfg.maxPixels * .65;
      var visibleSpec = spec || backSpec;
      if (visibleSpec && visibleSpec.kind === 'refraction') budget = Math.min(budget, cfg.refractionMaxPixels);
      if (visibleSpec && visibleSpec.kind === 'gilded') budget = Math.min(budget, cfg.gildedMaxPixels);
      if (visibleSpec && (visibleSpec.kind === 'crimson' || visibleSpec.kind === 'prismatic')) budget = Math.min(budget, quality() === 'high' ? cfg.mythicalMaxPixels : cfg.mythicalMediumPixels);
      if (visibleSpec && visibleSpec.kind === 'cosmic') budget = Math.min(budget, quality() === 'high' ? cfg.exoticMaxPixels : cfg.exoticMediumPixels);
      if (visibleSpec && visibleSpec.kind === 'system') budget = Math.min(budget, quality() === 'high' ? 1500000 : 975000);
      dpr = Math.min(root.devicePixelRatio || 1, cfg.maxDpr, C.settings.policy.dpr, Math.sqrt(budget / (w * h)));
      if (visibleSpec && visibleSpec.kind === 'prismatic') dpr *= quality() === 'high' ? 1 : quality() === 'medium' ? .75 : .5;
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
    function cloudStar(radius, opacity, t, travel) {
      var c = color(spec.color), light = color(spec.starColor), atlas = cloudTexture();
      glow(w / 2, h / 2, radius * 1.65, c, opacity * .4);
      g.save(); g.translate(w / 2, h / 2); g.globalAlpha = opacity; starPath(g, radius, true); g.clip();
      var gradient = g.createLinearGradient(-radius, -radius, radius, radius);
      gradient.addColorStop(0, rgba(light, 1)); gradient.addColorStop(.48, rgba(c, 1)); gradient.addColorStop(1, rgba(tint(c, .45), 1));
      g.fillStyle = gradient; g.fillRect(-radius, -radius, radius * 2, radius * 2);
      if (travel === undefined) {
        g.save(); g.translate(Math.sin(t * .55) * radius * .14, Math.cos(t * .3) * radius * .1); g.rotate(t * .055);
        g.drawImage(atlas, -radius * 1.3, -radius * 1.3, radius * 2.6, radius * 2.6); g.restore();
        g.globalAlpha = opacity * .32; g.rotate(-t * .08); g.drawImage(atlas, -radius * .94, -radius * 1.2, radius * 2, radius * 2.5);
      } else {
        // Tiled motion stays continuous as the timelapse accelerates; the star remains fixed.
        var tile = radius * 2.25, offset = (travel * radius * 2.2) % tile;
        for (var layer = -1; layer < 3; layer++) g.drawImage(atlas, -radius * 1.3 + layer * tile - offset, -radius * 1.3, radius * 2.6, radius * 2.6);
        g.globalAlpha = opacity * .38;
        for (var upper = -1; upper < 3; upper++) g.drawImage(atlas, -radius * 1.3 + upper * tile - (offset * .55) % tile, -radius * 1.1, radius * 2.6, radius * 2.2);
      }
      g.restore();
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
    function rareFrame(s, t) {
      rare.paint(g, w, h, s, t, quality());
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
    // Basic, Common and Uncommon: a single line grows from the centre and sheds particles.
    // Every frame is analytic in the section clock, so scrubbing and resize never restart it.
    var lineSet = null, lineSetKey = '';
    function lineKind() { return spec && (spec.kind === 'pulse' || spec.kind === 'orbit'); }
    function lineReach(u) { return w * mix(.03, .47, smooth(clamp(u / .8))); }
    function lineClock(s) {
      var total = 0, at = 0;
      spec.sections.forEach(function (part) { if (part.id === s.id) at = total + part.ms * s.p; total += part.ms; });
      return total ? at / total : 0;
    }
    function lineParticles() {
      var key = seed + ':' + spec.kind + ':' + quality();
      if (lineSet && lineSetKey === key) return lineSet;
      var random = randomFor(key + ':line'), list = [];
      var count = Math.round((spec.kind === 'orbit' ? 150 : spec.intensity > .8 ? 110 : 84) * (quality() === 'high' ? 1 : .6));
      for (var i = 0; i < count; i++) list.push({
        x: random() * 2 - 1, born: .06 + random() * .66, life: .2 + random() * .2, dir: random() < .5 ? -1 : 1,
        rise: .1 + random() * .26, drift: (random() - .5) * .06, size: 1.5 + random() * 2.3, phase: random() * TAU, alt: random() < .4
      });
      lineSetKey = key; lineSet = list; return list;
    }
    function lineBody(reach, level, surge, thick) {
      var c = color(spec.color), cx = w / 2, cy = h / 2;
      g.save(); g.translate(cx, cy); g.scale(1, .1); glow(0, 0, reach * 1.05, c, .2 * level * spec.intensity * surge); g.restore();
      var gradient = g.createLinearGradient(cx - reach, 0, cx + reach, 0);
      gradient.addColorStop(0, rgba(c, 0)); gradient.addColorStop(.2, rgba(c, .6)); gradient.addColorStop(.5, rgba(c, 1));
      gradient.addColorStop(.8, rgba(c, .6)); gradient.addColorStop(1, rgba(c, 0));
      g.save(); g.fillStyle = gradient; g.globalAlpha = clamp(level * (.4 + .6 * spec.intensity));
      g.fillRect(cx - reach, cy - thick / 2, reach * 2, thick);
      g.globalAlpha *= .2; g.fillRect(cx - reach, cy - thick * 3, reach * 2, thick * 6); g.restore();
      glow(cx - reach, cy, 15, c, .45 * level); glow(cx + reach, cy, 15, c, .45 * level);
    }
    function lineFrame(s, t) {
      var c = color(spec.color), accent = color(spec.orbitColor || spec.color), u = lineClock(s), cx = w / 2, cy = h / 2;
      var ret = s.id === 'retreat' ? smooth(s.p) : 0, reach = lineReach(u) * (1 - .86 * ret), level = (1 - .9 * ret) * Math.min(1, .3 + u * 8);
      var surge = s.id === 'peak' || s.id === 'orbit' ? 1 + .3 * Math.sin(s.p * Math.PI) : 1;
      lineBody(reach, level, surge, mix(2, 3.4, spec.intensity) * (1 - .55 * ret) * surge);
      lineParticles().forEach(function (q) {
        var age = (u - q.born) / q.life; if (age <= 0 || age >= 1) return;
        var x = cx + q.x * lineReach(q.born) + q.drift * w * age + (spec.kind === 'orbit' ? Math.sin(age * TAU * 1.2 + q.phase) * 9 : 0);
        var y = cy + q.dir * out(age) * q.rise * h, alpha = Math.pow(1 - age, 1.25) * smooth(age / .12) * clamp(.35 + spec.intensity * .6);
        var tone = q.alt && spec.kind === 'orbit' ? accent : c, r = q.size * (1 - age * .45), trail = q.size * 9 * (1 - age) * (1 - age);
        if (q.size > 2) glow(x, y, r * 4.5, tone, alpha * .35);
        if (trail > 1) {
          var tail = g.createLinearGradient(x, y, x, y - q.dir * trail * 1.8);
          tail.addColorStop(0, rgba(tone, alpha * .7)); tail.addColorStop(1, rgba(tone, 0));
          g.strokeStyle = tail; g.lineWidth = Math.max(1, r * .7); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - q.dir * trail * 1.8); g.stroke();
        }
        g.fillStyle = rgba(tone, alpha); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      });
    }
    function lineStill(envelope) {
      var c = color(spec.color), accent = color(spec.orbitColor || spec.color), cx = w / 2, cy = h / 2;
      lineBody(w * .38, envelope, 1, mix(1.4, 2.4, spec.intensity));
      lineParticles().slice(0, 22).forEach(function (q, i) {
        var age = .22 + (i % 5) * .13, x = cx + q.x * w * .36, y = cy + q.dir * out(age) * q.rise * h;
        g.fillStyle = rgba(q.alt && spec.kind === 'orbit' ? accent : c, envelope * (1 - age) * .8); g.beginPath(); g.arc(x, y, q.size * .85, 0, TAU); g.fill();
      });
    }
    function ring(radius, angle, opacity, inner) {
      var c = color(spec.orbitColor || spec.color), light = color(spec.starColor || c), count = inner ? 3 : 4;
      g.save(); g.translate(w / 2, h / 2); g.rotate(angle); g.globalAlpha *= opacity;
      var gradient = g.createLinearGradient(-radius, -radius, radius, radius);
      gradient.addColorStop(0, rgba(light, .96)); gradient.addColorStop(.4, rgba(c, .9)); gradient.addColorStop(1, rgba(tint(c, .42), .9));
      for (var i = 0; i < count; i++) {
        var start = i * TAU / count + .095, end = (i + 1) * TAU / count - .095, thickness = radius * (inner ? .0025 : .009);
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
    // A seeded turbulent spiral is baked once per palette/quality, then advected on
    // the shared cinematic clock. Its irregular alpha edge avoids a flat blue disc.
    function portalCloudTexture() {
      var c = color(spec.color), light = color(spec.starColor), size = quality() === 'high' || quality() === 'very-high' ? 640 : 448;
      var key = c + ':' + light + ':' + size;
      if (portalCloud && portalCloudKey === key) return portalCloud;
      portalCloudKey = key; portalCloud = root.document.createElement('canvas'); portalCloud.width = portalCloud.height = size;
      var q = portalCloud.getContext('2d'), pixels = q.createImageData(size, size), random = randomFor('super-rare-storm-v1');
      var grids = [8, 16, 32, 64].map(function(n){var values=new Float32Array(n*n);for(var k=0;k<values.length;k++)values[k]=random();return {n:n,values:values};});
      function noise(u,v){
        var result=0,weights=[.48,.28,.16,.08];
        for(var k=0;k<grids.length;k++){
          var grid=grids[k],n=grid.n,x=((u%1+1)%1)*n,y=((v%1+1)%1)*n,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy),values=grid.values;
          result+=weights[k]*mix(mix(values[iy*n+ix],values[iy*n+(ix+1)%n],fx),mix(values[((iy+1)%n)*n+ix],values[((iy+1)%n)*n+(ix+1)%n],fx),fy);
        }
        return result;
      }
      for(var y=0;y<size;y++)for(var x=0;x<size;x++){
        var dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
        var swirl=a+r*2.4,ux=Math.cos(swirl)*r,uy=Math.sin(swirl)*r;
        var broad=noise(ux*.52+.3,uy*.52+.5),detail=noise(ux*1.15+.7,uy*1.15+.2);
        var arms=.5+.5*Math.sin(a*3+r*5+broad*3),density=smooth((broad*.7+detail*.25+arms*.05-.27)/.43);
        var edge=1-smooth((r-(.76+(broad-.5)*.27))/.22),rim=Math.exp(-Math.pow((r-.59)/.24,2));
        var brightness=clamp(density*.52+rim*.24),highlight=Math.pow(density,4)*.42,at=(y*size+x)*4;
        for(var channel=0;channel<3;channel++)pixels.data[at+channel]=mix(c[channel]*(.15+brightness),light[channel],highlight);
        pixels.data[at+3]=Math.round(edge*(.22+density*.78)*245);
      }
      q.putImageData(pixels,0,0); return portalCloud;
    }
    // Composite at bounded material resolution; camera movement only scales this image.
    function nebulaTexture(t) {
      var c = color(spec.color), light = color(spec.starColor), size = quality() === 'high' || quality() === 'very-high' ? cfg.cloudSize : Math.round(cfg.cloudSize * .75), key = c + ':' + light + ':' + size;
      if (!nebula) nebula = root.document.createElement('canvas');
      if (nebula.width !== size) nebula.width = nebula.height = size;
      // Only slow cloud advection is cached at 30 Hz. Rings, camera, light and the
      // full-screen intro continue to paint on every shared scheduler frame.
      if (key === nebulaKey && Math.abs(t - nebulaAt) < 1 / 30) return nebula;
      nebulaKey = key; nebulaAt = t;
      var q = nebula.getContext('2d'), radius = size / 2, atlas = portalCloudTexture();
      q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, size, size);
      q.save(); q.translate(radius, radius); q.filter='blur('+Math.max(2,size*.008)+'px)';
      q.save(); q.rotate(t * .085); q.drawImage(atlas, -radius, -radius, radius * 2, radius * 2); q.restore();
      q.save(); q.rotate(-t * .045 + 1.7); q.globalAlpha = .58; q.drawImage(atlas, -radius * .92, -radius * .96, radius * 1.84, radius * 1.92); q.restore();
      q.restore(); return nebula;
    }
    function portalCrescents(radius,t,opacity) {
      var light=color(spec.starColor),c=color(spec.orbitColor);
      g.save();g.translate(w/2,h/2);g.rotate(t*.045);g.globalAlpha*=opacity;
      for(var j=0;j<6;j++){
        var a=j*TAU/6+Math.PI/6,len=radius*.115;
        g.save();g.translate(Math.cos(a)*radius*.43,Math.sin(a)*radius*.43);g.rotate(a+Math.PI/2);
        g.beginPath();g.moveTo(-len,len*.42);g.bezierCurveTo(-len*.1,len*.12,len*.23,-len*.24,len,-len*.62);
        g.quadraticCurveTo(len*.31,len*.02,len*.26,len*.55);g.quadraticCurveTo(-len*.3,len*.12,-len,len*.42);g.closePath();
        var sheen=g.createLinearGradient(-len,len,len,-len);sheen.addColorStop(0,rgba(c,.85));sheen.addColorStop(.6,rgba(light,1));sheen.addColorStop(1,rgba(light,.96));
        g.fillStyle=sheen;g.fill();g.strokeStyle=rgba(light,.68);g.lineWidth=.65;g.stroke();g.restore();
      }g.restore();
    }
    function portalBeam(radius,power) {
      var light=color(spec.starColor);
      g.save();g.globalCompositeOperation='lighter';
      g.translate(w/2,h/2);g.scale(1,.035);glow(0,0,radius*2.1,light,.4*power);g.restore();
      g.save();g.translate(w/2,h/2);g.scale(.026,1);glow(0,0,radius*1.18,light,.24*power);g.restore();
      var reach=Math.max(radius*1.45,w*.46),beam=g.createLinearGradient(w/2-reach,0,w/2+reach,0);
      beam.addColorStop(0,rgba(light,0));beam.addColorStop(.4,rgba(light,.18*power));beam.addColorStop(.5,rgba(light,.55*power));beam.addColorStop(.6,rgba(light,.18*power));beam.addColorStop(1,rgba(light,0));
      g.fillStyle=beam;g.fillRect(w/2-reach,h/2-.55,reach*2,1.1);
    }
    function portalCore(radius,intensity,collapse) {
      var c=color(spec.color),light=color(spec.starColor),r=radius*mix(.205,.255,collapse);
      glow(w/2,h/2,radius*mix(.48,.85,intensity),light,.22+intensity*.42);
      g.save();g.translate(w/2,h/2);g.scale(1,mix(1.9,1.25,collapse));starPath(g,r);
      var jewel=g.createLinearGradient(-r,-r,r,r);jewel.addColorStop(0,rgba(c,1));jewel.addColorStop(.4,rgba(light,1));jewel.addColorStop(.6,rgba(light,1));jewel.addColorStop(1,rgba(c,.95));
      g.fillStyle=jewel;g.fill();g.strokeStyle=rgba(light,.95);g.lineWidth=1;g.stroke();
      g.beginPath();g.moveTo(0,-r*.6);g.lineTo(r*.34,0);g.lineTo(0,r*.6);g.lineTo(-r*.34,0);g.closePath();
      g.fillStyle=rgba(c,(1-intensity)*.7);g.fill();g.strokeStyle=rgba(light,(1-intensity)*.8);g.lineWidth=1.2;g.stroke();g.restore();
      star(w/2,h/2,r*.48,light,.65+intensity*.35,0,1.7);
      g.save();g.globalCompositeOperation='lighter';glow(w/2,h/2,radius*.34,light,intensity*.58);g.restore();
    }
    function portalPetals(radius,t,p) {
      if(p<=0)return;
      var c=color(spec.color),light=color(spec.starColor),distance=radius*mix(.66,.33,smooth(p)),size=radius*mix(.1,.28,smooth(p));
      g.save();g.translate(w/2,h/2);g.rotate(t*.06);g.globalAlpha=p;
      for(var j=0;j<6;j++){
        var a=j*TAU/6;
        g.save();g.rotate(a);g.translate(distance*(1+(j%2)*.06),0);g.rotate(.42+p*.35+(j%2?-.13:.08));g.scale(j%2?1.08:.94,1);
        g.beginPath();g.moveTo(-size*.7,-size*.5);g.lineTo(-size*.1,-size*1.15);
        g.bezierCurveTo(size*.45,-size*1.4,size*.7,-size*.75,size*.68,-size*.2);g.lineTo(size*1.15,size*.25);
        g.quadraticCurveTo(size*.75,size*.95,size*.22,size*.78);g.lineTo(-size*.42,size*.57);
        g.quadraticCurveTo(-size*.95,size*.13,-size*.7,-size*.5);g.closePath();
        var glass=g.createLinearGradient(-size,-size,size,size);glass.addColorStop(0,rgba(light,.22));glass.addColorStop(.3,rgba(c,.25));glass.addColorStop(.5,rgba(light,.45));glass.addColorStop(.7,rgba(c,.08));glass.addColorStop(1,rgba(light,.5));
        g.fillStyle=glass;g.fill();g.strokeStyle=rgba(c,.22);g.lineWidth=size*.12;g.stroke();g.strokeStyle=rgba(light,.18);g.lineWidth=size*.055;g.stroke();g.strokeStyle=rgba(light,.88);g.lineWidth=Math.max(1.2,size*.016);g.stroke();
        g.beginPath();g.moveTo(-size*.62,-size*.28);g.lineTo(size*.22,-size*.91);g.lineTo(size*.55,-size*.09);g.lineTo(size*.28,size*.68);g.closePath();g.fillStyle=rgba(light,.12);g.fill();
        g.beginPath();g.moveTo(-size*.47,-size*.36);g.bezierCurveTo(size*.4,-size*1.3,size*.6,-size*.8,size*.55,-size*.1);g.quadraticCurveTo(size*.08,size*.08,size*.25,size*.64);
        g.strokeStyle=rgba(light,.65);g.lineWidth=Math.max(1,size*.02);g.stroke();g.restore();
      }g.restore();
    }
    function portal(radius, t, opacity, intensity, collapse) {
      var c = color(spec.color), light = color(spec.starColor);
      g.save(); g.globalAlpha = opacity;
      glow(w / 2, h / 2, radius * 1.55, c, .25+intensity*.3);
      g.globalAlpha*=1-collapse*.66;g.drawImage(nebulaTexture(t), w / 2 - radius, h / 2 - radius, radius * 2, radius * 2);g.globalAlpha=opacity;
      g.save();g.globalCompositeOperation='lighter';
      var mist=g.createRadialGradient(w/2,h/2,radius*.12,w/2,h/2,radius*.96);
      mist.addColorStop(0,rgba(light,.14+intensity*.26));mist.addColorStop(.52,rgba(c,.1+intensity*.27));mist.addColorStop(1,rgba(c,0));
      g.fillStyle=mist;g.fillRect(w/2-radius,h/2-radius,radius*2,radius*2);
      glow(w/2,h/2,radius*.9,light,intensity*.45);g.restore();
      ring(radius*mix(1,.91,collapse), t*.055, .92-collapse*.62, false);
      ring(radius*mix(.86,.6,collapse), -t*.075, .42-collapse*.35, true);
      portalCrescents(radius,t,1-smooth(collapse/.6));portalPetals(radius,t,smooth(collapse));
      portalBeam(radius,.65+intensity*.75+collapse*.6);portalCore(radius,intensity,collapse);
      star(w/2,h/2-radius*.73,radius*.023,light,.85*(1-collapse),0,2.5);
      star(w/2,h/2+radius*.73,radius*.023,light,.85*(1-collapse),0,2.5);
      g.restore();
    }
    function portalFrame(s, t) {
      var p=s.p,unit=Math.min(w,h),light=color(spec.starColor),c=color(spec.color),white=0;
      screenStars(t,light,s.id==='seed'?smooth(p)*.08:.12,0);
      if(s.id==='seed')cloudStar(unit*mix(.028,.062,smooth(p)),smooth(p/.5),t,0);
      else if(s.id==='evolve'){
        var form=smooth(p),r=unit*mix(.062,.385,form),morph=smooth(p/.62);
        cloudStar(unit*.062,1-morph,t,0);portal(r,t,morph,.1+form*.12,0);
      }else if(s.id==='intensify')portal(unit*mix(.385,.535,smooth(p)),t,1,mix(.22,.8,smooth(p)),0);
      else if(s.id==='collapse'){
        var fold=smooth(p);portal(unit*mix(.535,.65,fold),t,1,mix(.8,1,fold),fold);
        g.save();g.globalCompositeOperation='lighter';glow(w/2,h/2,unit*.85,c,fold*.22);g.restore();
      }else if(s.id==='explosion'){
        portal(unit*.65,t,1,1,1);var burst=out(p);glow(w/2,h/2,Math.hypot(w,h)*mix(.2,1.2,burst),light,.7);
        white=smooth(p/(C.cutscenes.profile()==='full'?.38:.9));
      }else if(s.id==='whiteout')white=1;
      // One monotonic white climax per run. Backward scrubbing cannot reflash it.
      portalWhite=Math.max(portalWhite,white);if(portalWhite>0){g.fillStyle='rgba(255,255,255,'+portalWhite+')';g.fillRect(0,0,w,h);}
    }
    function staticFrame(p) {
      var envelope = smooth(p / .25) * (1 - smooth((p - .65) / .35)), c = color(spec.color);
      if (lineKind()) { lineStill(envelope); return; }
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
    function paint(elapsed) {
      var begin = root.performance.now(), total = duration(); background(); section = segment(elapsed, total);
      if(spec.kind==='system'){
        if(notice.pending){g.fillStyle='#000';g.fillRect(0,0,w,h);return;}
        var skip=runtime.skipState,secretSection=skip?segment(skip.from/spec.sections.reduce(function(n,p){return n+p.ms;},0)*total,total):section;
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
      }
      else if (still()) staticFrame(clamp(elapsed / total)); else if (spec.kind === 'crystal') rareFrame(section, elapsed / 1000); else if (spec.kind === 'portal') portalFrame(section, elapsed / 1000); else if (lineKind()) lineFrame(section, elapsed / 1000); else pulseFrame(section, elapsed / 1000);
      if (spec.kind === 'prismatic' && !still()) runtime.letterbox(g, w, h, elapsed / total * spec.sections.reduce(function(n,s){return n+s.ms;},0));
      if(spec.kind!=='system')runtime.meter(canvas,runtime.presentationMs);
      stats.paints++; stats.lastDrawMs = root.performance.now() - begin; stats.maxDrawMs = Math.max(stats.maxDrawMs, stats.lastDrawMs);
    }
    function start(next, label, instanceSeed) {
      if (active) stop(); ensure(); spec = next; name = label; active = true; handing = false; stageId = ''; lastElapsed = 0;cardStage=false;cardAgeMs=0;cardState=null;runMode=C.cutscenes.mode();if(quality()==='low'&&['prismatic','system'].indexOf(next.kind)<0)runMode='light';blockedElapsed=0;
      clearBackdrop(); seed = instanceSeed || label; portalWhite=0;
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
      if (!still() && spec.kind === 'portal') cloudTexture();
      if (!still() && spec.kind === 'portal') portalCloudTexture();
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
      rare.stop();
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
    function stop() { notice.stop();limiter.hide();secret.stop();rare.stop();root.document.body.classList.remove('is-secret-cinematic');runtime.stop(); endOverlay(); clearBackdrop(); mythical.stop(); ascendant.stop(); }
    return { start: start, update: update, stop: stop, resize: resize, beginHandoff: beginHandoff, updateRelease: updateRelease,
      restoreBackdrop: restoreBackdrop, exitBackdrop: exitBackdrop, updateBackdrop: updateBackdrop,
      get cardFrame(){return cardState;},get cardStageActive(){return cardStage;},
      get backdrop() { return backdrop; }, get backdropActive() { return !!backSpec; },
      get runtime() { return runtime; }, get sceneCanvas() { var painter = (spec || {}).kind === 'system' ? secret : (spec || {}).kind === 'prismatic' ? ascendant : mythical; return painter.scene && painter.scene.canvas; }, get rendererStats() { var kind = (spec || backSpec || {}).kind; return kind === 'system' ? secret.stats : kind === 'prismatic' ? ascendant.stats : kind === 'cosmic' ? exotic.stats : mythical.stats; },
      get active() { return active; }, get durationMs() { return duration(); }, get section() { return section && section.id; }, get canvas() { return canvas; }, stats: stats };
  } };
})(window.Cardable, window);
