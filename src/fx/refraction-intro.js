(function (C, root) {
  'use strict';
  // A material painter for the shared intro controller. No timer, pull RNG or DOM state.
  var TAU = Math.PI * 2;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function rgba(c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a) + ')'; }
  function mono(c) {
    if (C.config.rarityColorMode !== 'mono') return c;
    var l = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072); return [l, l, l];
  }
  function randomFor(seed) {
    var n = 2166136261, text = String(seed);
    for (var i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
    return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  var materials = Object.create(null), materialKeys = [];
  function material(palette) {
    var key = palette.base + ':' + palette.light + ':' + palette.dark;
    if (materials[key]) return materials[key];
    var size = C.config.rarityIntro.glassSize, canvas = root.document.createElement('canvas');
    canvas.width = canvas.height = size;
    var q = canvas.getContext('2d'), image = q.createImageData(size, size), random = randomFor('cardable-refractive-gel-v1');
    var shine = root.document.createElement('canvas'); shine.width = shine.height = size;
    var shineContext = shine.getContext('2d'), shineImage = shineContext.createImageData(size, size);
    var grid = new Float32Array(33 * 33);
    for (var i = 0; i < grid.length; i++) grid[i] = random();
    var facets = [];
    for (var f = 0; f < 24; f++) facets.push({ x: random() * 1.2 - .1, y: random() * 1.2 - .1, shade: random() });
    function noise(x, y) {
      x = (x % 32 + 32) % 32; y = (y % 32 + 32) % 32;
      var ix = Math.floor(x), iy = Math.floor(y), px = smooth(x - ix), py = smooth(y - iy);
      return mix(mix(grid[iy * 33 + ix], grid[iy * 33 + ix + 1], px), mix(grid[(iy + 1) * 33 + ix], grid[(iy + 1) * 33 + ix + 1], px), py);
    }
    // Broad refracted bands, smaller glass folds, and sharp caustics; baked only once.
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var u = x / size, v = y / size, broad = noise(u * 4.8, v * 4.2), fold = noise(u * 13, v * 11);
      var warp = u * 7.5 + .56 * Math.sin(v * 8 + broad * 4) + broad * 1.4;
      var band = .5 + .5 * Math.sin(warp * TAU), ridge = Math.pow(band, 20);
      var inner = .5 + .5 * Math.sin((warp + fold * .24) * TAU);
      var first = Infinity, second = Infinity, facet = facets[0], fx = u + (broad - .5) * .055, fy = v + (fold - .5) * .025;
      for (var cell = 0; cell < facets.length; cell++) {
        var site = facets[cell], dx = (fx - site.x) * 1.15, dy = (fy - site.y) * .8, distance = dx * dx + dy * dy;
        if (distance < first) { second = first; first = distance; facet = site; } else if (distance < second) second = distance;
      }
      var edge = 1 - smooth((second - first) / .004), face = facet.shade * .22 + (u - facet.x) * .3 - (v - facet.y) * .4;
      var height = clamp(.05 + .38 * broad + .2 * inner + .12 * fold + face), light = clamp(ridge * .7 + edge * .27 + Math.pow(fold, 5) * .2);
      var at = (y * size + x) * 4;
      for (var ch = 0; ch < 3; ch++) {
        image.data[at + ch] = mix(mix(palette.dark[ch], palette.base[ch], height), palette.light[ch], light);
        shineImage.data[at + ch] = palette.light[ch];
      }
      image.data[at + 3] = 255;
      shineImage.data[at + 3] = clamp(ridge * .4 + edge * .2) * 255;
    }
    q.putImageData(image, 0, 0); shineContext.putImageData(shineImage, 0, 0);
    materials[key] = { body: canvas, shine: shine }; materialKeys.push(key);
    // Color and Mono for three palettes, with one spare. No unbounded instance cache.
    if (materialKeys.length > 7) delete materials[materialKeys.shift()];
    return materials[key];
  }
  C.refractionIntro = { create: function () {
    var spec, panes = [], rays = [], glints = [], palettes = [], atlas = [], preparedKey = '', glowSprites = Object.create(null);
    var surface = null, surfaceContext, surfaceKey = '', surfaceAt = -Infinity;
    function start(next, seed) {
      spec = next; var random = randomFor(seed + ':glass'); panes = []; rays = []; glints = [];
      for (var i = 0; i < 7; i++) {
        var points = [], x = (i + .1 + random() * .8) / 7;
        for (var j = 0; j < 7; j++) points.push({ x: x + (random() - .5) * .055, y: j / 6 });
        panes.push({ points: points, bend: (random() - .5) * .026, phase: random() * TAU, shine: .4 + random() * .6 });
      }
      for (var k = 0; k < 24; k++) rays.push({ y: .04 + random() * .92, phase: random(), tilt: (random() - .5) * .19,
        width: .004 + random() * .009, length: .2 + random() * .42, white: k % 3 === 0, direction: k % 4 === 0 ? -1 : 1 });
      // The first slow sweep is staged visibly; random offscreen rays cannot swallow ignition.
      rays[0] = { y: .62, phase: .15, tilt: -.075, width: .008, length: .48, white: true, direction: -1 };
      for (var s = 0; s < 7; s++) glints.push({ x: .08 + random() * .84, y: .08 + random() * .84, phase: random() * TAU, size: .008 + random() * .011 });
      // One deliberate large, elongated caustic sparkle echoes the reference's corner.
      glints[0] = { x: .77, y: .22, phase: .6, size: .036 };
      palettes = []; atlas = []; preparedKey = ''; surfaceKey = ''; surfaceAt = -Infinity;
    }
    function prepare() {
      var next = [{ base: mono(spec.color), accent: mono(spec.orbitColor), light: mono(spec.starColor), dark: mono(spec.background) }];
      if (spec.split) next.push({ base: mono(spec.secondColor), accent: mono(spec.secondAccent), light: mono(spec.secondLight), dark: mono(spec.secondaryBackground) });
      var key = next[0].base + ':' + C.settings.get('quality');
      if (preparedKey !== key) {
        preparedKey = key;
        palettes = next;
        atlas = C.settings.get('quality') === 'very-low' ? [] : palettes.map(material);
      }
    }
    function glow(g, x, y, rx, ry, c, a) {
      if (a <= 0) return;
      var key = c.join(','), sprite = glowSprites[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 96;
        var q = sprite.getContext('2d'), grad = q.createRadialGradient(48, 48, 0, 48, 48, 48);
        grad.addColorStop(0, rgba(c, 1)); grad.addColorStop(.25, rgba(c, .5)); grad.addColorStop(1, rgba(c, 0));
        q.fillStyle = grad; q.fillRect(0, 0, 96, 96); glowSprites[key] = sprite;
        if (Object.keys(glowSprites).length > 8) delete glowSprites[Object.keys(glowSprites)[0]];
      }
      g.globalAlpha = a; g.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1;
    }
    function seam(g, pane, w, h, t, offset) {
      var ps = pane.points, drift = Math.sin(t * .42 + pane.phase) * pane.bend;
      g.beginPath(); g.moveTo((ps[0].x + drift) * w + offset, -.04 * h);
      for (var i = 1; i < ps.length; i++) {
        var prev = ps[i - 1], p = ps[i], bend = Math.sin(t * .27 + pane.phase + i) * .008;
        g.bezierCurveTo((prev.x + drift + bend) * w + offset, (prev.y + .055) * h,
          (p.x + drift - bend) * w + offset, (p.y - .055) * h, (p.x + drift) * w + offset, p.y * h);
      }
    }
    function glass(g, w, h, t, p, strength, quiet) {
      g.globalAlpha = strength;
      if (atlas.length) {
        // Overscan gives texture movement without wrapping seams or repeated tiling.
        var driftX = quiet ? 0 : Math.sin(t * .17) * w * .018, driftY = quiet ? 0 : Math.cos(t * .13) * h * .025;
        g.drawImage(atlas[p].body, -w * .055 + driftX, -h * .055 + driftY, w * 1.11, h * 1.11);
        // Independent highlight advection through the same glass gives visible depth.
        g.globalAlpha = strength * (quiet ? .15 : .3);
        g.drawImage(atlas[p].shine, -w * .09 - driftX * 1.4, -h * .09 + driftY * 1.3, w * 1.18, h * 1.18);
      } else { g.fillStyle = rgba(palettes[p].base, .5); g.fillRect(0, 0, w, h); }
      g.globalAlpha = 1;
      var palette = palettes[p], lamp = quiet ? .62 : .48 + Math.sin(t * .32 + p * 1.4) * .16;
      var wash = g.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, rgba(palette.accent, .3 * strength)); wash.addColorStop(.42, rgba(palette.base, .08 * strength));
      wash.addColorStop(lamp, rgba(palette.light, .28 * strength)); wash.addColorStop(1, rgba(palette.dark, .45 * strength));
      g.fillStyle = wash; g.fillRect(0, 0, w, h);
      // Thin refracted seams and broad irregular folds keep the gel translucent.
      for (var i = 0; i < panes.length; i++) {
        var pane = panes[i]; seam(g, pane, w, h, t, 0); g.lineWidth = Math.max(1, w * .0016);
        g.strokeStyle = rgba(palette.dark, strength * .24); g.stroke();
        seam(g, pane, w, h, t, w * .0012); g.lineWidth = Math.max(.75, w * .0007);
        var edge = g.createLinearGradient(0, 0, 0, h);
        edge.addColorStop(0, rgba(palette.light, strength * .7 * pane.shine)); edge.addColorStop(.45, rgba(palette.accent, strength * .15));
        edge.addColorStop(.7, rgba(palette.light, strength * .5 * pane.shine)); edge.addColorStop(1, rgba(palette.light, 0));
        g.strokeStyle = edge; g.stroke();
        // Broad angular folds catch a moving light; no repeated outlined triangles.
        var point = pane.points[2 + i % 3], d = Math.sin(t * .42 + pane.phase) * pane.bend;
        g.beginPath(); g.moveTo((point.x + d) * w, point.y * h);
        g.lineTo((point.x + d + .07) * w, (point.y - .21) * h);
        g.lineTo((point.x + d + .16) * w, (point.y - .12) * h);
        g.lineTo((point.x + d + .13) * w, (point.y + .14) * h);
        g.lineTo((point.x + d + .025) * w, (point.y + .29) * h); g.closePath();
        var fold = g.createLinearGradient(point.x * w, point.y * h, (point.x + .14) * w, (point.y + .15) * h);
        fold.addColorStop(0, rgba(palette.dark, strength * .28)); fold.addColorStop(.3, rgba(palette.accent, strength * .05));
        fold.addColorStop(.8, rgba(palette.light, strength * .16)); fold.addColorStop(1, rgba(palette.dark, 0)); g.fillStyle = fold; g.fill();
      }
    }
    function sparkle(g, x, y, r, palette, a) {
      glow(g, x, y, r * 3, r * 5, palette.accent, a * .35);
      g.save(); g.translate(x, y); g.scale(.58, 1.55); g.beginPath(); g.moveTo(0, -r);
      g.quadraticCurveTo(r * .1, -r * .1, r, 0); g.quadraticCurveTo(r * .1, r * .1, 0, r);
      g.quadraticCurveTo(-r * .1, r * .1, -r, 0); g.quadraticCurveTo(-r * .1, -r * .1, 0, -r);
      g.closePath(); g.fillStyle = rgba(palette.light, a); g.fill(); g.restore();
    }
    function beam(g, ray, x, w, h, palette, a, t) {
      var length = w * ray.length, thickness = Math.max(2, h * ray.width), c = ray.white ? palette.light : palette.accent;
      var y = ray.y * h + Math.sin(t * .45 + ray.phase * TAU) * h * .013;
      g.save(); g.translate(x, y); g.rotate(ray.tilt); g.scale(ray.direction, 1); g.globalCompositeOperation = 'screen';
      glow(g, 0, 0, length * .75, thickness * 10, c, a * .5);
      var gradient = g.createLinearGradient(-length, 0, length * .3, 0);
      gradient.addColorStop(0, rgba(c, 0)); gradient.addColorStop(.45, rgba(c, a * .22));
      gradient.addColorStop(.8, rgba(c, a)); gradient.addColorStop(.91, rgba(palette.light, a)); gradient.addColorStop(1, rgba(c, 0));
      g.fillStyle = gradient; g.beginPath(); g.moveTo(-length, 0); g.lineTo(-length * .1, -thickness);
      g.quadraticCurveTo(length * .12, -thickness, length * .3, 0); g.quadraticCurveTo(length * .12, thickness, -length * .1, thickness); g.closePath(); g.fill();
      g.fillStyle = rgba(palette.light, a * .65); g.beginPath(); g.moveTo(-length * .7, 0);
      g.lineTo(length * .05, -thickness * .12); g.lineTo(length * .18, 0); g.lineTo(length * .05, thickness * .12); g.closePath(); g.fill();
      g.fillStyle = gradient;
      g.globalAlpha = .2; g.beginPath(); g.moveTo(-length * .8, thickness * 3); g.lineTo(length * .16, thickness * 2.6);
      g.lineTo(-length * .15, thickness * 3.4); g.closePath(); g.fill(); g.globalAlpha = 1;
      g.restore();
    }
    function choreography(s) {
      var p = s.p, strength = 1, energy = 0, wash = 0, clock = 0;
      if (s.id === 'material') { strength = smooth(p); clock = p * 1.5; }
      else if (s.id === 'ignition') { energy = .1 + .17 * smooth(p); clock = 1.5 + p * 1.1; }
      else if (s.id === 'accelerate') { energy = .27 + .55 * p * p; clock = 2.6 + p * 2.2; }
      else if (s.id === 'saturate') { energy = .82 + .18 * smooth(p); wash = smooth(p) * .9; clock = 4.8 + p * 1.66; }
      else if (s.id === 'lock') { energy = 1; wash = .9 + .08 * smooth(p); clock = 6.46; }
      else { energy = 1 - smooth(p); wash = .98 - .25 * smooth(p); clock = 6.46; }
      var offset = 0;
      for (var i = 0; i < spec.sections.length; i++) {
        var part = spec.sections[i];
        if (part.id === 'lock' || part.id === 'release') { clock = offset / 1000; break; }
        if (part.id === s.id) { clock = (offset + part.ms * p) / 1000; break; }
        offset += part.ms;
      }
      return { strength: strength, energy: energy, wash: wash, clock: clock };
    }
    function paint(g, w, h, s, elapsed, stillProgress) {
      prepare(); var quiet = typeof stillProgress === 'number', q = choreography(s);
      if (quiet) q = { strength: .7 * smooth(stillProgress / .25), energy: 0, wash: .25 * Math.sin(stillProgress * Math.PI), clock: 0 };
      var t = q.clock, e = q.energy, half = spec.split ? w / 2 : w, short = Math.min(w, h);
      // Cache only the slowly moving glass. Beams and handoff still draw every shared frame.
      var fieldScale = Math.min(1, C.config.rarityIntro.glassFieldSize / Math.max(w, h)), fw = Math.max(1, Math.round(w * fieldScale)), fh = Math.max(1, Math.round(h * fieldScale));
      var key = preparedKey + ':' + fw + ':' + fh + ':' + quiet + ':' + (quiet || s.id === 'material' ? q.strength.toFixed(2) : 'formed');
      if (!surface) { surface = root.document.createElement('canvas'); surfaceContext = surface.getContext('2d', { alpha: false }); }
      if (key !== surfaceKey || t < surfaceAt || t - surfaceAt >= 1 / 30) {
        if (surface.width !== fw || surface.height !== fh) { surface.width = fw; surface.height = fh; }
        var fieldHalf = spec.split ? fw / 2 : fw, field = surfaceContext;
        for (var side = 0; side < palettes.length; side++) {
          field.save(); field.beginPath(); field.rect(side * fieldHalf, 0, fieldHalf, fh); field.clip();
          field.fillStyle = rgba(palettes[side].dark, 1); field.fillRect(0, 0, fw, fh);
          glass(field, fw, fh, t, side, q.strength, quiet);
          field.restore();
        }
        surfaceKey = key; surfaceAt = t;
      }
      g.drawImage(surface, 0, 0, w, h);
      // Palette clips preserve the blue/gold split even as a beam crosses the center.
      for (var p = 0; p < palettes.length; p++) {
        var palette = palettes[p]; g.save(); g.beginPath(); g.rect(p * half, 0, half, h); g.clip();
        if (!quiet) {
          for (var j = 0; j < glints.length; j++) {
            var glint = glints[j], pulse = .5 + .5 * Math.sin(t * 1.35 + glint.phase);
            sparkle(g, glint.x * w, glint.y * h, short * glint.size, palette, q.strength * (.25 + pulse * .6) * (1 - q.wash));
          }
          var count = 1 + e * e * (rays.length - 1);
          // Integrated accelerating travel, then a genuine frozen 140 ms impact hold.
          var travel = .12 * t + .016 * Math.pow(Math.max(0, t - 1.5), 3);
          for (var i = 0; i < rays.length; i++) {
            var ray = rays[i], opacity = smooth(count - i) * smooth(e / .14);
            if (opacity <= 0) continue;
            var cycle = (ray.phase + travel * (1 + i * .034)) % 1, x = mix(-w * .65, w * 1.65, ray.direction > 0 ? cycle : 1 - cycle);
            beam(g, ray, x, w, h, palette, opacity * (.4 + e * .48) * (1 - q.wash * .58), t);
          }
        }
        if (q.wash > 0) {
          // Each side remains tinted at the white peak. One rise, no strobe loop.
          var wash = g.createLinearGradient(p * half, 0, (p + 1) * half, h);
          wash.addColorStop(0, rgba(palette.light, q.wash)); wash.addColorStop(.5, rgba(palette.accent, q.wash * .8));
          wash.addColorStop(1, rgba(palette.light, q.wash)); g.fillStyle = wash; g.fillRect(0, 0, w, h);
          glow(g, spec.split ? half * (p + .5) : w * .55, h * .46, half * .85, h * .7, palette.light, q.wash * .5);
        }
        g.restore();
      }
      if (spec.split) {
        var seamLight = palettes[0].light; g.fillStyle = rgba(seamLight, q.strength * (.12 + e * .25)); g.fillRect(w / 2 - .5, 0, 1, h);
      }
      g.globalAlpha = 1;
    }
    return { start: start, paint: paint };
  } };
})(window.Cardable, window);
