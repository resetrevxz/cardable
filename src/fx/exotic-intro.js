(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function smooth(x) { x = clamp(x); return x * x * (3 - 2 * x); }
  function randomFor(seed) {
    var n = 2166136261; for (var i = 0; i < seed.length; i++) n = Math.imul(n ^ seed.charCodeAt(i), 16777619);
    return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function rgb(c) { if (C.config.rarityColorMode !== 'mono') return c; var v = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072); return [v, v, v]; }
  function rgba(c, a) { return 'rgba(' + rgb(c).join(',') + ',' + clamp(a) + ')'; }
  C.exoticIntro = { create: function () {
    var spec, field = [], disk = [], sprites = Object.create(null), materials = [], materialKey = '', timeline = Object.create(null);
    var stellarLayers = [], stellarKey = '', instanceSeed = '';
    var stats = { backend: 'canvas', backdropPaints: 0, stars: 0, materialBuilds: 0 };
    function sprite(c) {
      var color = rgb(c), key = color.join(','); if (sprites[key]) return sprites[key];
      var canvas = root.document.createElement('canvas'); canvas.width = canvas.height = 64;
      var q = canvas.getContext('2d'), grad = q.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.065, rgba(c, .95)); grad.addColorStop(.2, rgba(c, .38));
      grad.addColorStop(.5, rgba(c, .065)); grad.addColorStop(1, rgba(c, 0)); q.fillStyle = grad; q.fillRect(0, 0, 64, 64);
      return sprites[key] = canvas;
    }
    function glow(g, x, y, r, c, alpha, ry) {
      if (alpha <= 0 || r <= 0) return; g.save(); g.globalAlpha *= alpha;
      g.drawImage(sprite(c), x - r, y - (ry || r), r * 2, (ry || r) * 2); g.restore();
    }
    function glint(g, x, y, r, c, a, angle) {
      g.save(); g.translate(x, y); g.rotate(angle || 0); g.fillStyle = rgba(c, a);
      g.beginPath(); g.moveTo(0, -r * 1.45); g.quadraticCurveTo(r * .12, -r * .13, r, 0);
      g.quadraticCurveTo(r * .12, r * .13, 0, r * 1.45); g.quadraticCurveTo(-r * .12, r * .13, -r, 0);
      g.quadraticCurveTo(-r * .12, -r * .13, 0, -r * 1.45); g.fill(); g.restore();
    }
    // Cached original spiral dust: broad gas, luminous ridges, and irregular dark lanes.
    // Separate gas layers rotate independently; the sharp stellar disk is drawn above them.
    function prepareMaterials() {
      var key = C.config.rarityColorMode + ':' + JSON.stringify(spec.palette);
      if (key === materialKey) return; materialKey = key; materials = []; stats.materialBuilds++;
      var random = randomFor('exotic-spiral-material'), size = C.config.rarityIntro.exoticMaterialSize;
      var grids = [16, 40, 96].map(function (n) { var data = new Float32Array(n * n); for (var i = 0; i < data.length; i++) data[i] = random(); return { n: n, data: data }; });
      function noise(grid, x, y) {
        x = ((x % 1 + 1) % 1) * grid.n; y = ((y % 1 + 1) % 1) * grid.n;
        var ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy), n = grid.n, d = grid.data;
        return mix(mix(d[iy * n + ix], d[iy * n + (ix + 1) % n], fx), mix(d[((iy + 1) % n) * n + ix], d[((iy + 1) % n) * n + (ix + 1) % n], fx), fy);
      }
      for (var layer = 0; layer < 2; layer++) {
        var canvas = root.document.createElement('canvas'); canvas.width = canvas.height = size;
        var q = canvas.getContext('2d'), image = q.createImageData(size, size);
        for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
          var u = x / size, v = y / size, dx = (u - .5) * 2, dy = (v - .5) * 2, r = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
          var n = noise(grids[0], u, v) * .55 + noise(grids[1], u, v) * .3 + noise(grids[2], u, v) * .15;
          var spiral = angle - Math.log(r + .09) * 3.7 + layer * .33 + (n - .5) * .7;
          var ridge = Math.pow(.5 + .5 * Math.cos(spiral * 3), layer ? 5 : 2.8);
          var density = ridge * Math.pow(clamp((n - .22) / .65), 1.5), edge = 1 - smooth((r - .53) / .46);
          var lanes = smooth((noise(grids[1], u + .011, v + .018) - .28) / .36);
          var alpha = edge * (.045 * (1 - r) + density * lanes * (layer ? .68 : .8)) * smooth(r / .11);
          var c = rgb(spec.palette.nebula.map(function (channel, k) { return mix(channel * .34, spec.palette.pink[k], ridge * .64 + n * .16); }));
          var at = (y * size + x) * 4; for (var k = 0; k < 3; k++) image.data[at + k] = c[k]; image.data[at + 3] = Math.round(clamp(alpha) * 255);
        }
        q.putImageData(image, 0, 0); materials.push(canvas);
      }
    }
    function start(next, seed, backgroundOnly) {
      spec = next; timeline = Object.create(null); var at = 0;
      spec.sections.forEach(function (s) { timeline[s.id] = { at: at / 1000, duration: s.ms / 1000 }; at += s.ms; });
      instanceSeed = String(seed || 'exotic'); var random = randomFor(instanceSeed); field = []; disk = [];
      for (var i = 0; i < C.config.rarityIntro.exoticStars; i++) field.push({ x: (random() - .5) * 2.8, y: (random() - .5) * 2.8,
        z: random(), size: .6 + Math.pow(random(), 5) * 3.1, c: i % spec.palette.stars.length, phase: random() * TAU, glint: i % 53 === 0 });
      for (var j = 0; !backgroundOnly && j < C.config.rarityIntro.exoticGalaxyStars; j++) {
        var r = .055 + Math.pow(random(), .7) * .93, arm = j % 3;
        disk.push({ r: r, angle: Math.log(r + .09) * 3.7 + arm * TAU / 3 + (random() - .5) * (.17 + r * .36),
          height: (random() - .5) * .085 * (1 - r), size: .3 + Math.pow(random(), 7) * 3.5, phase: random() * TAU, c: j % spec.palette.stars.length });
      }
      var staticPolicy = C.motion.reduced || C.settings.policy.animation === 0 || ['low', 'very-low'].indexOf(C.settings.get('cinematicQuality')) !== -1;
      if (!backgroundOnly && !staticPolicy) { prepareMaterials(); prepareStellarLayers(); }
      spec.palette.stars.forEach(sprite); sprite(spec.palette.core); sprite(spec.palette.nebula);
    }
    function prepareStellarLayers() {
      var key = instanceSeed + ':' + C.config.rarityColorMode + ':' + JSON.stringify(spec.palette);
      if (stellarKey === key || !disk.length) return; stellarKey = key; stellarLayers = [];
      var size = C.config.rarityIntro.exoticStellarSize, radius = size / 2;
      for (var band = 0; band < 3; band++) {
        var canvas = root.document.createElement('canvas'); canvas.width = canvas.height = size;
        var q = canvas.getContext('2d'); q.translate(radius, radius);
        disk.forEach(function (s, i) {
          if (Math.min(2, Math.floor(s.r * 3)) !== band) return;
          var x = Math.cos(s.angle) * s.r * radius, y = Math.sin(s.angle) * s.r * radius + s.height * radius;
          var c = i % 7 ? spec.palette.stars[s.c] : spec.palette.core, point = s.size * size / 1024;
          if (point > 1.1) glow(q, x, y, point * 7, c, .62);
          q.fillStyle = rgba(c, .8); q.beginPath(); q.arc(x, y, Math.max(.38, point * .34), 0, TAU); q.fill();
          if (i % 127 === 0) glint(q, x, y, Math.max(2, point * 2.4), spec.palette.gold, .7, s.angle * .2);
        });
        stellarLayers.push(canvas);
      }
    }
    function elapsedFor(s) { var part = timeline[s.id]; return part ? part.at + part.duration * s.p : 0; }
    // Integral of velocity, not frame accumulation: resize, Fast and stalled frames keep the same shot.
    function flight(s) {
      var acceleration = timeline.acceleration, t = elapsedFor(s), p = clamp((t - acceleration.at) / acceleration.duration);
      var distance = .035 * Math.min(t, acceleration.at) + acceleration.duration * (.035 * p + .6 * Math.pow(p, 3));
      var speed = .035 + 1.8 * p * p, roll = .06 + t * .012 + 1.3 * Math.pow(p, 3);
      var tail = t - acceleration.at - acceleration.duration;
      if (tail > 0) {
        var duration = timeline.brake.duration, b = clamp(tail / duration);
        distance += duration * (.035 * b + 1.8 * (b - b * b + b * b * b / 3));
        distance += Math.max(0, tail - duration) * .006;
        speed = .006 + 1.8 * Math.pow(1 - b, 2); roll += .13 * smooth(b) + Math.max(0, tail - duration) * .006;
      }
      return { distance: distance, speed: speed, roll: roll, power: p, tail: Math.max(0, tail) };
    }
    function stars(g, w, h, f, opacity, quiet) {
      var high = C.settings && C.settings.get('cinematicQuality') === 'high', count = high ? field.length : Math.round(field.length * .7);
      var unit = Math.min(w, h) * .62, cx = w * .5, cy = h * .5;
      var shake = quiet ? 0 : Math.pow(f.power, 7) * (f.tail > 0 ? 1 - smooth(f.tail / timeline.brake.duration) : 1);
      cx += Math.sin(f.distance * 81) * shake * Math.min(w, h) * .004; cy += Math.cos(f.distance * 67) * shake * Math.min(w, h) * .003;
      var cos = Math.cos(f.roll), sin = Math.sin(f.roll), stampTime = f.distance * 8;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < count; i++) {
        var s = field[i], z = (s.z - f.distance % 1 + 1) % 1, depth = .24 + z * 2.2;
        var x = s.x * cos - s.y * sin, y = s.x * sin + s.y * cos;
        var px = cx + x * unit / depth, py = cy + y * unit / depth;
        if (px < -120 || px > w + 120 || py < -120 || py > h + 120) continue;
        var a = opacity * (.45 + .55 * (1 - z)) * (.78 + .22 * Math.sin(stampTime + s.phase));
        if (quiet) { var center = Math.hypot((px - w / 2) / w, (py - h / 2) / h); a *= mix(1, .26 + .74 * smooth(center / .35), Number(quiet)); }
        var c = spec.palette.stars[s.c], radius = Math.max(.55, s.size / depth);
        if (s.c === spec.palette.stars.length - 1) { a *= .55; radius *= .8; }
        var shutter = quiet ? 0 : Math.min(.19, f.speed * .087), trailDepth = depth + shutter * 2.2;
        if (shutter > .006) {
          var backRoll = f.roll - shutter * (.1 + f.power * .5), bx = s.x * Math.cos(backRoll) - s.y * Math.sin(backRoll), by = s.x * Math.sin(backRoll) + s.y * Math.cos(backRoll);
          var tx = cx + bx * unit / trailDepth, ty = cy + by * unit / trailDepth;
          // A broad low-opacity shutter smear under a sharp tapered streak.
          g.strokeStyle = rgba(c, a * .08); g.lineWidth = radius * 5 + 1; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((px + tx) * .5 + (py - ty) * .04, (py + ty) * .5 - (px - tx) * .04, px, py); g.stroke();
          g.strokeStyle = rgba(c, a * .58); g.lineWidth = Math.max(.7, radius * .8); g.beginPath(); g.moveTo(tx, ty); g.lineTo(px, py); g.stroke();
        }
        if (radius > 1.2) glow(g, px, py, radius * 5.5, c, a);
        g.fillStyle = rgba(radius > 2.2 ? spec.palette.core : c, a); g.beginPath(); g.arc(px, py, radius * .38, 0, TAU); g.fill();
        if (s.glint && shutter < .015) glint(g, px, py, radius * 2.8, c, a * .8, f.roll * .2);
      }
      g.restore(); stats.stars = count;
    }
    function beams(g, w, h, f) {
      var energy = smooth((f.power - .28) / .72) * (f.tail ? 1 - smooth(f.tail / timeline.brake.duration) : 1);
      if (energy <= 0) return; var short = Math.min(w, h), reach = Math.hypot(w, h) * .8;
      var cx = w * (.5 + .09 * energy), cy = h * (.5 - .025 * energy), time = f.distance;
      g.save(); g.globalCompositeOperation = 'lighter';
      glow(g, w * .13, h * .5, short * .65, spec.palette.nebula, energy * .22, short * .9);
      glow(g, w * .88, h * .42, short * .5, spec.palette.pink, energy * .13, short * .8);
      for (var i = 0; i < 92; i++) {
        var s = field[i], a = s.phase + f.roll, phase = (s.z + time * 2.2) % 1;
        var head = .18 + phase * 1.5, tail = Math.max(.08, head - (.05 + energy * .8));
        var bend = Math.sin(time * 17 + s.phase) * .009 * energy;
        var x = cx + Math.cos(a + bend) * head * reach, y = cy + Math.sin(a + bend) * head * reach;
        var tx = cx + Math.cos(a - .055 * energy) * tail * reach, ty = cy + Math.sin(a - .055 * energy) * tail * reach;
        var c = i % 4 === 0 ? spec.palette.core : i % 3 ? spec.palette.nebula : spec.palette.pink;
        var grad = g.createLinearGradient(tx, ty, x, y), alpha = energy * (.25 + s.size * .08) * smooth(phase / .2);
        grad.addColorStop(0, rgba(c, 0)); grad.addColorStop(.6, rgba(c, alpha * .42)); grad.addColorStop(1, rgba(c, alpha));
        g.strokeStyle = rgba(c, alpha * .065); g.lineWidth = 7 + s.size * 2;
        g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((x + tx) * .5 + (y - ty) * .025, (y + ty) * .5 - (x - tx) * .025, x, y); g.stroke();
        g.strokeStyle = grad; g.lineWidth = .8 + s.size * .48; g.stroke();
      }
      g.restore();
    }
    function shooting(g, w, h, t, opacity, quiet) {
      var cycle = quiet ? 11 : 2.9, p = (t / cycle + .22) % 1;
      if (p > .26) return;
      var q = p / .26, x = mix(w * .13, w * .9, q), y = mix(h * .1, h * .45, q);
      var a = opacity * Math.sin(q * Math.PI), length = Math.min(w, h) * (quiet ? .08 : .19);
      var grad = g.createLinearGradient(x - length, y - length * .35, x, y);
      grad.addColorStop(0, rgba(spec.palette.nebula, 0)); grad.addColorStop(.75, rgba(spec.palette.pink, a * .5)); grad.addColorStop(1, rgba(spec.palette.core, a));
      g.strokeStyle = grad; g.lineWidth = quiet ? 1 : 2; g.beginPath(); g.moveTo(x - length, y - length * .35); g.lineTo(x, y); g.stroke();
      glow(g, x, y, quiet ? 8 : 15, spec.palette.core, a); glint(g, x, y, quiet ? 2 : 4, spec.palette.core, a);
    }
    function galaxy(g, w, h, t, presence, formation) {
      if (presence <= 0) return; prepareMaterials(); prepareStellarLayers(); var short = Math.min(w, h);
      var radius = Math.min(w * .45, h * (w < h ? .35 : .68)) * mix(.65, 1, smooth(formation));
      var tilt = w < h ? .66 : .48, rotation = t * .19;
      g.save(); g.translate(w / 2, h * .48); g.rotate(-.16 + Math.sin(t * .12) * .04); g.globalAlpha = presence;
      glow(g, 0, 0, radius * .86, spec.palette.nebula, .56, radius * tilt * 1.5);
      g.save(); g.scale(1, tilt); g.rotate(rotation); g.drawImage(materials[0], -radius, -radius, radius * 2, radius * 2); g.restore();
      g.save(); g.scale(1, tilt); g.rotate(rotation * .82 + .07); g.globalAlpha *= .65; g.drawImage(materials[1], -radius * 1.06, -radius * 1.06, radius * 2.12, radius * 2.12); g.restore();
      g.globalCompositeOperation = 'lighter';
      stellarLayers.forEach(function (layer, band) {
        g.save(); g.scale(1, tilt); g.rotate(rotation * (1.07 - (band + .5) / 3 * .2));
        g.globalAlpha *= smooth((formation - band * .11) / .45); g.drawImage(layer, -radius, -radius, radius * 2, radius * 2); g.restore();
      });
      // Local twinkles float above the cached disk; no thousands of fresh paths per frame.
      for (var i = 0; i < disk.length; i += 41) {
        var s = disk[i], band = Math.min(2, Math.floor(s.r * 3)), orbit = s.angle + rotation * (1.07 - (band + .5) / 3 * .2);
        var r = s.r * radius, x = Math.cos(orbit) * r, y = Math.sin(orbit) * r * tilt + s.height * radius;
        var a = smooth((formation - s.r * .33) / .45) * Math.pow(Math.max(0, Math.sin(t * 1.1 + s.phase)), 5);
        glow(g, x, y, Math.max(4, s.size * short / 800 * 8), spec.palette.pink, a * .52);
        if (i % 123 === 0) glint(g, x, y, Math.max(2, s.size * short / 800 * 2.5), spec.palette.core, a * .75, orbit * .2);
      }
      var pulse = .92 + .08 * Math.sin(t * 1.4); glow(g, 0, 0, radius * .39, spec.palette.core, .95);
      glow(g, 0, 0, radius * .64, spec.palette.pink, .65, radius * .16);
      glint(g, 0, 0, radius * .145 * pulse, spec.palette.gold, .55);
      glint(g, 0, 0, radius * .095 * pulse, spec.palette.core, 1);
      // Fine axial diffraction belongs to the core, never a full-screen white wash.
      var beam = g.createLinearGradient(0, -short * .46, 0, short * .46);
      beam.addColorStop(0, rgba(spec.palette.gold, 0)); beam.addColorStop(.48, rgba(spec.palette.gold, .45 * presence)); beam.addColorStop(.5, rgba(spec.palette.core, presence)); beam.addColorStop(.52, rgba(spec.palette.gold, .45 * presence)); beam.addColorStop(1, rgba(spec.palette.gold, 0));
      g.fillStyle = beam; g.fillRect(-.65, -short * .46, 1.3, short * .92); g.restore();
    }
    function base(g, w, h) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba(spec.background, 1); g.fillRect(0, 0, w, h); }
    function backplate(g, w, h, t) {
      var settled = flight({ id: 'release', p: 1 });
      base(g, w, h); stars(g, w, h, { distance: settled.distance + t * .006, speed: 0, roll: settled.roll + t * .006, power: 0, tail: 0 }, 1, true);
      shooting(g, w, h, t, .45, true); stats.backdropPaints++;
    }
    function paint(g, w, h, s, ignoredTime, staticP) {
      base(g, w, h);
      if (staticP !== null && staticP !== undefined) { stars(g, w, h, { distance: .42, speed: 0, roll: .26, power: 0, tail: 0 }, .55, true); glow(g, w / 2, h / 2, Math.min(w, h) * .13, spec.palette.nebula, .18 * Math.sin(staticP * Math.PI)); return; }
      if (s.id === 'blackout' || s.id === 'prelude') return;
      var f = flight(s), t = elapsedFor(s), opacity = s.id === 'starlight' ? smooth(s.p) : 1;
      if (s.id === 'dissolve' || s.id === 'release') {
        // The exact final wallpaper is already present underneath the departing galaxy.
        stars(g, w, h, f, 1, s.id === 'dissolve' ? smooth(s.p) : 1);
        if (s.id === 'dissolve') galaxy(g, w, h, t, 1 - smooth(s.p), 1); return;
      }
      stars(g, w, h, f, opacity, false);
      beams(g, w, h, f);
      if (s.id === 'brake') {
        var ghost = { distance: f.distance - .045 * (1 - smooth(s.p)), speed: 1.6 * (1 - smooth(s.p)), roll: f.roll - .018, power: 1, tail: f.tail };
        stars(g, w, h, ghost, .24 * (1 - smooth(s.p)), false);
      }
      var formation = s.id === 'ignition' ? smooth(s.p) : 1, presence = s.id === 'ignition' ? smooth(s.p / .62) : s.id === 'galaxy' ? 1 : 0;
      galaxy(g, w, h, t, presence, formation);
      if (s.id === 'ignition') {
        var short = Math.min(w, h), bloom = Math.sin(s.p * Math.PI);
        glow(g, w / 2, h * .48, short * mix(.04, .5, s.p), spec.palette.core, bloom * .36);
        g.save(); g.translate(w / 2, h * .48); g.rotate(-.16); g.strokeStyle = rgba(spec.palette.pink, bloom * .16); g.lineWidth = 1.1;
        g.beginPath(); g.ellipse(0, 0, short * (.08 + s.p * .46), short * (.04 + s.p * .23), 0, 0, TAU); g.stroke(); g.restore();
      }
      if (presence) shooting(g, w, h, t, presence, false);
    }
    return { start: start, paint: paint, backplate: backplate, stats: stats };
  } };
})(window.Cardable, window);
