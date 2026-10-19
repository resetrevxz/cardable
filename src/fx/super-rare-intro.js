(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2, warmed = null;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rgba(c, a) { return C.fxColor.rgba(c, a); }
  function palette() { return {
    blue: C.fxColor.tone([50, 108, 255]), ice: C.fxColor.tone([155, 220, 255]),
    white: C.fxColor.tone([232, 253, 255]), dark: C.fxColor.tone([4, 8, 28]), violet: C.fxColor.tone([94, 108, 247])
  }; }
  function random() { var n = 61843297; return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function curvedStar(q, r) {
    q.beginPath(); q.moveTo(0, -r);
    q.bezierCurveTo(r * .06, -r * .28, r * .18, -r * .08, r, 0);
    q.bezierCurveTo(r * .18, r * .08, r * .06, r * .28, 0, r);
    q.bezierCurveTo(-r * .06, r * .28, -r * .18, r * .08, -r, 0);
    q.bezierCurveTo(-r * .18, -r * .08, -r * .06, -r * .28, 0, -r); q.closePath();
  }
  function diamond(q, x, y, r, tall) {
    q.beginPath(); q.moveTo(x, y - r * tall); q.lineTo(x + r, y); q.lineTo(x, y + r * tall); q.lineTo(x - r, y); q.closePath();
  }
  // The cloud and shadow atlases are a per-pixel bake of about 180 ms. A job does it in slices of whole rows; the opening starts one while the pack is
  // still dissolving, and reading the result finishes whatever is left.
  function materialJob(size) {
    var rng = random(), grids = [8, 16, 32, 64].map(function (n) {
      var a = new Float32Array(n * n); for (var i = 0; i < a.length; i++) a[i] = rng(); return { n: n, a: a };
    });
    function noise(grid, u, v) {
      var n = grid.n, x = ((u % 1 + 1) % 1) * n, y = ((v % 1 + 1) % 1) * n;
      var ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy), a = grid.a;
      return mix(mix(a[iy * n + ix], a[iy * n + (ix + 1) % n], fx), mix(a[((iy + 1) % n) * n + ix], a[((iy + 1) % n) * n + (ix + 1) % n], fx), fy);
    }
    function fbm(u, v) { return noise(grids[0], u, v) * .5 + noise(grids[1], u, v) * .28 + noise(grids[2], u, v) * .15 + noise(grids[3], u, v) * .07; }
    var values = new Float32Array(size * size);
    var cloud = root.document.createElement('canvas'), shadow = root.document.createElement('canvas');
    cloud.width = cloud.height = shadow.width = shadow.height = size;
    var q = cloud.getContext('2d'), z = shadow.getContext('2d'), pixels = q.createImageData(size, size), darks = z.createImageData(size, size);
    var blue = C.fxColor.tone([34, 76, 197]), pale = C.fxColor.tone([134, 193, 255]), deep = C.fxColor.tone([5, 13, 45]);
    var row = 0, shade = 0, job = { done: false, material: null };
    job.step = function (budgetMs) {
      if (job.done) return true;
      var end = root.performance.now() + budgetMs;
      for (; row < size; row++) {
        var y = row;
        for (var x = 0; x < size; x++) {
          var dx = (x + .5) / size * 2 - 1, dy = (y + .5) / size * 2 - 1, radius = Math.hypot(dx, dy);
          var angle = Math.atan2(dy, dx) + radius * 1.8 + Math.sin(radius * 9) * .14;
          var u = .5 + Math.cos(angle) * radius * .48, v = .5 + Math.sin(angle) * radius * .48;
          u += (noise(grids[0], u, v) - .5) * .12; v += (noise(grids[1], u, v) - .5) * .1;
          values[y * size + x] = fbm(u, v);
        }
        if (root.performance.now() > end) { row++; return false; }
      }
      // The shading reads rows above and to the left only, so it can start once every value exists.
      for (; shade < size; shade++) {
        var py = shade;
        for (var px = 0; px < size; px++) {
          var rx = (px + .5) / size * 2 - 1, ry = (py + .5) / size * 2 - 1, r = Math.hypot(rx, ry);
          var n = values[py * size + px], density = smooth((n - .29) / .4);
          var adjacent = values[Math.max(0, py - 4) * size + Math.max(0, px - 2)], lighting = clamp(.36 + (adjacent - n) * 6);
          var edge = 1 - smooth((r - .72 - (n - .5) * .35) / .25);
          var volume = edge * (.38 + .62 * Math.exp(-Math.pow((r - .52) / .3, 2))), at = (py * size + px) * 4;
          for (var c = 0; c < 3; c++) {
            pixels.data[at + c] = mix(blue[c], pale[c], clamp(density * .52 + lighting * .5));
            darks.data[at + c] = mix(deep[c], blue[c], lighting * .15);
          }
          pixels.data[at + 3] = Math.round(density * volume * 245);
          darks.data[at + 3] = Math.round(smooth((n - .45) / .24) * edge * smooth((r - .27) / .32) * 230);
        }
        if (root.performance.now() > end) { shade++; return false; }
      }
      q.putImageData(pixels, 0, 0); z.putImageData(darks, 0, 0);
      job.material = { cloud: cloud, shadow: shadow }; job.done = true; return true;
    };
    return job;
  }
  C.superRareIntro = { create: function () {
    var material = null, materialKey = '', field = null, fieldKey = '', fieldAt = -Infinity;
    var glows = Object.create(null), whites = 0, stars = [], seed = '', glassScene = null, glassAt = -Infinity;
    var glassGPU = C.superRareGlass.create();
    function quality() { return C.settings.get('cinematicQuality'); }
    function materialFor() {
      var key = C.settings.get('rarityColor') + ':' + quality();
      if (material && materialKey === key) return material;
      if (warmed && warmed.key === key) {
        var w = warmed; warmed = null; w.job.step(Infinity); if (!w.glassReady) w.painter.warmGlass(w.job.material);
        material = w.job.material; materialKey = key; glassGPU.stop(); glassGPU = w.glass; glassAt = -Infinity; return material;
      }
      var job = materialJob(quality() === 'high' || quality() === 'very-high' ? 640 : 448); job.step(Infinity);
      material = job.material; materialKey = key; fieldKey = ''; glassAt = -Infinity; return material;
    }
    function glow(q, x, y, r, c, alpha, sx, sy) {
      if (r <= 0 || alpha <= 0) return;
      var key = c.join(','), sprite = glows[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 192;
        var g = sprite.getContext('2d'), a = g.createRadialGradient(96, 96, 0, 96, 96, 96);
        a.addColorStop(0, rgba(c, 1)); a.addColorStop(.08, rgba(c, .82)); a.addColorStop(.25, rgba(c, .3)); a.addColorStop(.6, rgba(c, .04)); a.addColorStop(1, rgba(c, 0));
        g.fillStyle = a; g.fillRect(0, 0, 192, 192); glows[key] = sprite;
      }
      q.save(); q.globalAlpha *= clamp(alpha); q.drawImage(sprite, x - r * (sx || 1), y - r * (sy || 1), r * 2 * (sx || 1), r * 2 * (sy || 1)); q.restore();
    }
    function cloudField(t) {
      var assets = materialFor(), size = assets.cloud.width;
      if (!field) field = root.document.createElement('canvas');
      if (field.width !== size) { field.width = field.height = size; fieldKey = ''; }
      if (fieldKey === materialKey && Math.abs(t - fieldAt) < 1 / 30) return field;
      fieldAt = t; fieldKey = materialKey;
      var q = field.getContext('2d'), half = size / 2, p = palette();
      q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, size, size); q.translate(half, half);
      q.save(); q.filter = 'blur(' + (size * .006) + 'px)'; q.rotate(t * .085); q.drawImage(assets.cloud, -half, -half, size, size); q.restore();
      q.save(); q.rotate(-t * .052 + 1.12); q.globalAlpha = .3; q.drawImage(assets.cloud, -half * .9, -half * .95, size * .9, size * .95); q.restore();
      q.save(); q.globalCompositeOperation = 'screen'; glow(q, 0, 0, half * 1.1, p.blue, .78); glow(q, 0, 0, half * .76, p.ice, .36); q.restore();
      q.save(); q.rotate(t * .036 - .64); q.globalAlpha = .65; q.drawImage(assets.shadow, -half, -half, size, size); q.restore();
      return field;
    }
    function projection(x, y, z, tilt, yaw) {
      var yy = y * Math.cos(tilt) - z * Math.sin(tilt), zz = y * Math.sin(tilt) + z * Math.cos(tilt);
      var xx = x * Math.cos(yaw) + zz * Math.sin(yaw); zz = -x * Math.sin(yaw) + zz * Math.cos(yaw);
      var f = 3 / (3 - zz); return { x: xx * f, y: yy * f, z: zz };
    }
    function outline(q, points) { q.beginPath(); points.forEach(function (p, i) { if (i) q.lineTo(p.x, p.y); else q.moveTo(p.x, p.y); }); q.closePath(); }
    function arcGeometry(start, length, radius, thickness, depth, tilt, yaw, turn) {
      var face = [], back = [], inner = [], outer = [], count = 38;
      for (var i = 0; i <= count; i++) {
        var u = i / count, a = start + length * u + turn, thick = thickness * (.35 + .65 * Math.sin(Math.PI * u));
        var point = projection(Math.cos(a) * (radius + thick), Math.sin(a) * (radius + thick), depth, tilt, yaw);
        outer.push(point); back.push(projection(Math.cos(a) * (radius + thick), Math.sin(a) * (radius + thick), depth - .018, tilt, yaw));
        inner.push(projection(Math.cos(a) * radius, Math.sin(a) * radius, depth, tilt, yaw));
      }
      face = outer.concat(inner.slice().reverse()); return { face: face, outer: outer, inner: inner, side: outer.concat(back.reverse()) };
    }
    function seal(q, radius, t, level, fold, tilt) {
      var p = palette(), turn = t * .045, yaw = -.1 + Math.sin(t * .17) * .035;
      q.save(); q.scale(radius, radius); q.globalAlpha *= level;
      for (var i = 0; i < 4; i++) {
        var shape = arcGeometry(i * Math.PI / 2 + .10, 1.29, mix(1, .66, fold), .042, Math.sin(i * 1.7) * .04, tilt + fold * Math.sin(i * 2.1) * .72, yaw + fold * Math.cos(i * 1.5) * .5, turn + fold * (i % 2 ? -.18 : .18));
        outline(q, shape.side); q.fillStyle = rgba(p.blue, .28); q.fill();
        outline(q, shape.face); var bevel = q.createLinearGradient(-1, -.7, 1, .8);
        bevel.addColorStop(0, rgba(p.ice, .92)); bevel.addColorStop(.3, rgba(p.blue, .58)); bevel.addColorStop(.6, rgba(p.blue, .16)); bevel.addColorStop(1, rgba(p.ice, .72)); q.fillStyle = bevel; q.fill();
        q.beginPath(); shape.outer.forEach(function (v, j) { if (j) q.lineTo(v.x, v.y); else q.moveTo(v.x, v.y); });
        q.strokeStyle = rgba(p.ice, .76); q.lineWidth = 1.2 / radius; q.stroke();
        q.beginPath(); shape.inner.forEach(function (v, j) { if (j) q.lineTo(v.x, v.y); else q.moveTo(v.x, v.y); });
        q.strokeStyle = rgba(p.blue, .56); q.lineWidth = 1 / radius; q.stroke();
        var a = i * Math.PI / 2 + .49 + turn, mark = projection(Math.cos(a) * mix(1.008, .69, fold), Math.sin(a) * mix(1.008, .69, fold), .02, tilt, yaw);
        q.save(); q.translate(mark.x, mark.y); q.rotate(a + Math.PI / 2); curvedStar(q, .059); q.fillStyle = rgba(p.blue, .92); q.fill(); q.strokeStyle = rgba(p.ice, .82); q.lineWidth = 1 / radius; q.stroke(); q.restore();
      }
      // Small detached diamonds and hairline arcs give the broken seal scale.
      for (var j = 0; j < 8; j++) {
        var angle = j * TAU / 8 + .07 + turn, dist = mix(1.07 + (j % 3) * .027, .7, fold);
        var m = projection(Math.cos(angle) * dist, Math.sin(angle) * dist, -.05, tilt, yaw);
        diamond(q, m.x, m.y, j % 2 ? .025 : .036, 1.3); q.strokeStyle = rgba(p.ice, .58); q.lineWidth = .85 / radius; q.stroke();
      }
      for (var k = 0; k < 3; k++) {
        q.beginPath(); for (var n = 0; n <= 26; n++) {
          var aa = k * 2.1 + .23 + n / 26 * .53 - t * .02, v = projection(Math.cos(aa) * .9, Math.sin(aa) * .9, -.1, tilt, yaw);
          if (n) q.lineTo(v.x, v.y); else q.moveTo(v.x, v.y);
        } q.strokeStyle = rgba(p.ice, .2); q.lineWidth = .7 / radius; q.stroke();
      }
      q.restore();
    }
    function glyph(q, r, t, level, pressure, fold) {
      var p = palette(), width = r * mix(.26, .095, smooth(fold)), length = mix(1.9, 1.05, fold);
      q.save(); q.globalAlpha *= level;
      q.save(); q.globalCompositeOperation = 'lighter';
      glow(q, 0, 0, r * (.68 + pressure * .65), p.blue, .62); glow(q, 0, 0, r * (.32 + pressure * .55), p.ice, .55 + pressure * .35);
      glow(q, 0, 0, r * 1.9, p.ice, .3 + pressure * .3, 1, .025);
      glow(q, 0, 0, r * 1.1, p.ice, .28 + pressure * .32, .025, 1); q.restore();
      q.save(); q.scale(1, length); curvedStar(q, width);
      var shine = q.createLinearGradient(-width, 0, width, 0);
      shine.addColorStop(0, rgba(p.ice, 1)); shine.addColorStop(.35, rgba(p.white, 1)); shine.addColorStop(.65, rgba(p.white, 1)); shine.addColorStop(1, rgba(p.ice, 1));
      q.fillStyle = shine; q.fill(); q.restore();
      if (pressure < .7) {
        diamond(q, 0, 0, width * .33, 1.85); q.fillStyle = rgba(p.blue, (1 - pressure / .7) * .85); q.fill();
        diamond(q, 0, 0, width * .2, 1.75); q.fillStyle = rgba(p.ice, 1 - pressure); q.fill();
      }
      q.save(); q.globalAlpha *= 1 - smooth(fold / .38); q.rotate(t * .018);
      for (var i = 0; i < 4; i++) {
        var angle = Math.PI / 4 + i * Math.PI / 2;
        q.save(); q.translate(Math.cos(angle) * r * .43, Math.sin(angle) * r * .43); q.rotate(angle + Math.PI / 2);
        var d = r * .145;
        q.beginPath(); q.moveTo(-d * .8, -d * .7);
        q.bezierCurveTo(d * .1, -d * .05, d * .25, -d * .2, d, -d * .65);
        q.bezierCurveTo(d * .25, -d * .15, d * .05, d * .3, -d * .6, d);
        q.bezierCurveTo(-d * .15, d * .3, -d * .35, -d * .1, -d * .8, -d * .7); q.closePath();
        q.fillStyle = rgba(p.white, .98); q.fill(); q.restore();
      }
      for (var side = -1; side <= 1; side += 2) {
        diamond(q, 0, side * r * .64, r * .034, 2.25); q.fillStyle = rgba(p.white, .96); q.fill();
        q.beginPath(); q.moveTo(0, side * r * .7); q.lineTo(0, side * r * .78); q.strokeStyle = rgba(p.ice, .3); q.lineWidth = .8; q.stroke();
      }
      q.restore();
      q.save(); q.globalCompositeOperation = 'lighter'; glow(q, 0, 0, r * (.18 + pressure * .34 + fold * .35), p.white, .45 + pressure * .5); q.restore();
      curvedStar(q, width * .22); q.fillStyle = rgba(p.white, .9); q.fill(); q.restore();
    }
    function ground(q, w, h, radius, level, t) {
      if (level <= 0) return;
      var p = palette(), y = h * .79;
      q.save(); q.globalAlpha = level;
      q.save(); q.globalAlpha *= .2; q.drawImage(materialFor().cloud, -w * .15, -h * .45, w * 1.3, h * 1.4); q.restore();
      // Far dunes and their darker foreground place the suspended seal in a world.
      for (var layer = 0; layer < 3; layer++) {
        q.beginPath(); q.moveTo(-w * .05, h);
        var points = [];
        for (var i = 0; i <= 16; i++) {
          var x = i / 16 * w, rise = Math.sin(i * 1.37 + layer) * h * .012 + Math.sin(i * .42 + layer * 2) * h * .018;
          points.push({x:x,y:h * (.72 + layer * .065) + rise});
        }
        q.lineTo(points[0].x, points[0].y);
        for (var k = 1; k < points.length; k++) q.quadraticCurveTo(points[k - 1].x, points[k - 1].y, (points[k - 1].x + points[k].x) / 2, (points[k - 1].y + points[k].y) / 2);
        q.lineTo(w, points[points.length-1].y); q.lineTo(w * 1.05, h); q.closePath(); q.fillStyle = rgba(layer ? p.dark : C.fxColor.tone([13, 23, 56]), layer ? .9 : .85); q.fill();
      }
      glow(q, w / 2, y, radius * 1.55, p.blue, .9, 1, .27);
      q.save(); q.globalCompositeOperation = 'lighter'; glow(q, w / 2, y, radius * .85, p.ice, .78, 1, .1); q.restore();
      for (var ring = 0; ring < 3; ring++) {
        q.beginPath(); q.ellipse(w / 2, y, radius * (1 - ring * .12), radius * (.115 - ring * .025), 0, 0, TAU);
        q.strokeStyle = rgba(ring ? p.blue : p.ice, .7); q.lineWidth = ring ? 1 : 1.7; q.stroke();
      }
      var beam = q.createLinearGradient(0, h * .47, 0, y);
      beam.addColorStop(0, rgba(p.white, .65)); beam.addColorStop(.7, rgba(p.ice, .8)); beam.addColorStop(1, rgba(p.white, .95));
      q.fillStyle = beam; q.fillRect(w / 2 - .8, h * .47, 1.6, y - h * .47);
      q.save(); q.globalCompositeOperation = 'lighter'; glow(q, w / 2, h * .63, h * .28, p.ice, .7, .055, 1); q.restore();
      // Suspended ellipses intersect the pillar at separate depths.
      for (var j = 0; j < 2; j++) {
        q.beginPath(); q.ellipse(w / 2, h * (.4 + j * .16), radius * (1.25 - j * .34), radius * .16, Math.sin(t * .04) * .02, .08, TAU - .23);
        q.strokeStyle = rgba(p.ice, .42); q.lineWidth = 1.05; q.stroke();
      }
      q.restore();
    }
    function petalContour() {
      var list = [], corners = [[-.19,-.16],[-.05,-.26],[.15,-.20],[.23,-.04],[.15,.18],[-.04,.23],[-.22,.1],[-.25,-.04]];
      corners.forEach(function (v, index) {
        var before = corners[(index + 7) % 8], after = corners[(index + 1) % 8];
        var start = [mix(v[0], before[0], .22), mix(v[1], before[1], .22)], end = [mix(v[0], after[0], .22), mix(v[1], after[1], .22)];
        for (var i = 0; i <= 3; i++) { var t = i / 3, u = 1 - t; list.push([u * u * start[0] + 2 * u * t * v[0] + t * t * end[0], u * u * start[1] + 2 * u * t * v[1] + t * t * end[1]]); }
      }); return list;
    }
    var contour = petalContour();
    function glass(q, r, t, fold, cloud) {
      if (fold <= 0) return;
      if (!glassScene) glassScene = root.document.createElement('canvas');
      if (glassScene.width !== cloud.width) { glassScene.width = glassScene.height = cloud.width; glassAt = -Infinity; }
      if (Math.abs(t - glassAt) >= 1 / 30) {
        glassAt = t; var scene = glassScene.getContext('2d'), center = cloud.width / 2, lights = palette();
        scene.setTransform(1,0,0,1,0,0); scene.fillStyle = rgba(lights.dark,1); scene.fillRect(0,0,cloud.width,cloud.height);
        scene.drawImage(cloud,0,0); scene.save(); scene.translate(center,center); scene.globalCompositeOperation = 'lighter';
        glow(scene,0,0,center*.8,lights.ice,.7); glow(scene,0,0,center*.45,lights.white,.8);
        glow(scene,0,0,center*1.6,lights.ice,.65,1,.018); scene.restore();
      }
      if (glassGPU.paint(q,r,t,smooth(fold),glassScene,contour)) return;
      var p = palette(), appear = smooth(fold / .4), items = [];
      for (var i = 0; i < 8; i++) {
        var a = i * TAU / 8 + .22 + t * .08, distance = mix(.84, .29, smooth(fold)), depth = Math.sin(a + t * .12) * .3;
        var tilt = Math.sin(a) * (.3 + fold * .85), yaw = Math.cos(a) * (.25 + fold * .7), spin = a + .42 + fold * .7;
        var scale = mix(.84, 1.65, smooth(fold)) * (1 + (i % 3 - 1) * .07), face = [], back = [];
        contour.forEach(function (v) {
          var x = (v[0] * Math.cos(spin) - v[1] * Math.sin(spin)) * scale;
          var y = (v[0] * Math.sin(spin) + v[1] * Math.cos(spin)) * scale;
          var f = projection(x, y, .085 + depth, tilt, yaw), b = projection(x, y, -.085 + depth, tilt, yaw);
          face.push({ x: f.x + Math.cos(a) * distance, y: f.y + Math.sin(a) * distance });
          back.push({ x: b.x + Math.cos(a) * distance, y: b.y + Math.sin(a) * distance });
        }); items.push({ face: face, back: back, depth: depth, a: a, index: i });
      }
      items.sort(function (a, b) { return a.depth - b.depth; });
      q.save(); q.scale(r, r); q.globalAlpha *= appear;
      items.forEach(function (item) {
        outline(q, item.back); q.fillStyle = rgba(p.dark, .48); q.fill();
        // Projected side faces have actual thickness and selectively catch the core.
        for (var side = 0; side < item.face.length; side++) {
          var next = (side + 1) % item.face.length, a = item.face[side], b = item.face[next];
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ex = b.x - a.x, ey = b.y - a.y;
          var normal = Math.hypot(ex, ey) || 1, distance = Math.hypot(mx, my) || 1, illumination = clamp((ey * -mx + -ex * -my) / (normal * distance) * .5 + .5);
          outline(q, [a, b, item.back[next], item.back[side]]);
          var sideColor = p.blue.map(function (v, c) { return Math.round(mix(v * .22, p.ice[c], illumination * .78)); });
          q.fillStyle = rgba(sideColor, .82); q.fill();
        }
        outline(q, item.face); q.save(); q.clip();
        // Offset and magnify the cloud field through each lens, then lay directional
        // absorption/reflection across its volume. The rear outline supplies thickness.
        q.fillStyle = rgba(p.dark, .34); q.fillRect(-1.4, -1.4, 2.8, 2.8);
        q.globalAlpha *= .35; q.drawImage(cloud, -1.14 + Math.cos(item.a) * .15, -1.14 + Math.sin(item.a) * .15, 2.28, 2.28);
        var tint = q.createLinearGradient(Math.cos(item.a) * .8, Math.sin(item.a) * .8, -Math.cos(item.a) * .4, -Math.sin(item.a) * .4);
        tint.addColorStop(0, rgba(p.blue, .38)); tint.addColorStop(.23, rgba(p.ice, .04)); tint.addColorStop(.44, rgba(p.white, .24)); tint.addColorStop(.52, rgba(p.dark, .18)); tint.addColorStop(.82, rgba(p.ice, .04)); tint.addColorStop(1, rgba(p.white, .4));
        q.globalAlpha = appear; q.fillStyle = tint; q.fillRect(-1.4, -1.4, 2.8, 2.8); q.restore();
        outline(q, item.face); q.strokeStyle = rgba(p.ice, .35 + Math.max(0, item.depth)); q.lineWidth = .004; q.stroke();
        var center = item.face.reduce(function (v, point) { v.x += point.x / item.face.length; v.y += point.y / item.face.length; return v; }, { x: 0, y: 0 });
        var inset = item.face.map(function(v){return {x:mix(v.x,center.x,.1),y:mix(v.y,center.y,.1)};});
        outline(q, inset); q.strokeStyle = rgba(p.ice, .22); q.lineWidth = .007; q.stroke();
        q.beginPath(); inset.slice(2, 15).forEach(function (v, i) { if (i) q.lineTo(v.x, v.y); else q.moveTo(v.x, v.y); });
        q.strokeStyle = rgba(p.white, .7); q.lineWidth = .0025; q.stroke();
      }); q.restore();
    }
    function atmosphere(q, w, h, r, t, level, pressure) {
      var p = palette(); q.save(); q.globalAlpha *= level;
      glow(q, w / 2, h / 2, Math.max(w, h) * .62, p.blue, .12 + pressure * .17);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], x = s.x * w, y = s.y * h;
        q.fillStyle = rgba(p.ice, s.alpha * (.6 + .4 * Math.sin(t * .3 + s.phase) ** 2)); q.beginPath(); q.arc(x, y, s.size, 0, TAU); q.fill();
      }
      q.restore();
    }
    function lightRays(q, radius, t, pressure) {
      if (pressure <= 0) return;
      var p = palette(); q.save(); q.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 14; i++) {
        var a = i * TAU / 14 + .13 + Math.sin(t * .1) * .025, reach = radius * (1.2 + i % 3 * .4);
        q.save(); q.rotate(a); var beam = q.createLinearGradient(radius * .1, 0, reach, 0);
        beam.addColorStop(0, rgba(p.ice, pressure * .06)); beam.addColorStop(.2, rgba(p.blue, pressure * .08)); beam.addColorStop(1, rgba(p.blue, 0));
        q.beginPath(); q.moveTo(radius * .1, 0); q.lineTo(reach, -reach * .06); q.lineTo(reach, reach * .025); q.closePath(); q.fillStyle = beam; q.fill(); q.restore();
      } q.restore();
    }
    function paint(q, w, h, section, t, quiet) {
      var p = palette(), id = section.id, u = section.p, min = Math.min(w, h);
      if (quiet != null) {
        if (whites > 0) { q.fillStyle = 'rgba(255,255,255,' + whites + ')'; q.fillRect(0, 0, w, h); return; }
        var envelope = smooth(quiet / .25) * (1 - smooth((quiet - .7) / .3));
        q.save(); q.translate(w / 2, h / 2); q.globalAlpha = envelope * .65;
        glow(q, 0, 0, min * .44, p.blue, .34); seal(q, min * .3, 0, .58, 0, .06); glyph(q, min * .3, 0, .65, .05, 0); q.restore(); return;
      }
      var form = id === 'seed' ? 0 : id === 'evolve' ? smooth(u) : 1;
      var pressure = id === 'intensify' ? smooth(u) : id === 'collapse' || id === 'explosion' || id === 'whiteout' ? 1 : 0;
      var fold = id === 'collapse' ? smooth(u) : id === 'explosion' || id === 'whiteout' ? 1 : 0;
      var radius = min * (id === 'seed' ? .068 : id === 'evolve' ? mix(.068, .395, form) : id === 'intensify' ? mix(.395, .56, pressure) : mix(.56, .76, fold));
      var establish = id === 'evolve' ? Math.sin(Math.PI * clamp(u / .65)) * (1 - smooth((u - .32) / .33)) : 0;
      atmosphere(q, w, h, radius, t, id === 'seed' ? smooth(u) : 1, pressure);
      if (fold > 0) { q.save(); q.globalCompositeOperation='screen';glow(q,w/2,h/2,Math.max(w,h)*.8,p.blue,fold*.45);q.restore(); }
      ground(q, w, h, min * .21, establish * .9, t);
      q.save(); q.translate(w / 2, h / 2);
      if (id === 'evolve' && form < .35) {
        q.save(); q.globalAlpha = 1 - smooth(form / .35); curvedStar(q, min * .052); q.fillStyle = rgba(p.ice, 1); q.fill(); glow(q, 0, 0, min * .1, p.ice, .22); q.restore();
      }
      if (id === 'seed') {
        var opacity = smooth(u / .6), size = min * mix(.018, .052, smooth(u));
        q.globalAlpha = opacity; glow(q, 0, 0, size * 2.8, p.blue, .36);
        q.save(); curvedStar(q, size); q.clip(); var a = materialFor().cloud;
        q.fillStyle = rgba(p.ice, 1); q.fillRect(-size, -size, size * 2, size * 2); q.globalAlpha *= .55; q.drawImage(a, -size, -size, size * 2, size * 2); q.restore();
        curvedStar(q, size); q.strokeStyle = rgba(p.white, .85); q.lineWidth = .8; q.stroke();
      } else if (id !== 'whiteout') {
        var assets = cloudField(t + fold * 2.7), cloudOpacity = smooth(form / .4) * (1 - fold * .62);
        q.save(); q.globalAlpha = cloudOpacity; q.drawImage(assets, -radius * (1 - fold * .3), -radius * (1 - fold * .3), radius * 2 * (1 - fold * .3), radius * 2 * (1 - fold * .3)); q.restore();
        q.save(); q.globalCompositeOperation = 'screen'; glow(q, 0, 0, radius * 1.3, p.blue, form * (.44 + pressure * .28)); glow(q, 0, 0, radius * .92, p.ice, pressure * .32); q.restore();
        lightRays(q, radius, t, pressure * .3 + fold * .7);
        seal(q, radius, t, smooth(form / .4) * (1 - fold * .65), fold, mix(.38, .065, form));
        glass(q, radius, t, fold, assets);
        glyph(q, radius, t, smooth(form / .25), .12 + pressure * .7 + fold * .18, fold);
        if (fold > 0) {
          q.save(); q.globalCompositeOperation = 'lighter'; glow(q, 0, 0, radius * .65, p.white, fold * .55);
          glow(q, 0, 0, Math.max(w, h) * .65, p.ice, fold * .35, 1, .014); q.restore();
          q.beginPath(); q.arc(0, 0, radius * 1.37, 0, TAU); q.strokeStyle = rgba(p.blue, fold * .18); q.lineWidth = 2.5; q.stroke();
          q.beginPath(); q.arc(0, 0, radius * 1.39, 0, TAU); q.strokeStyle = rgba(p.violet, fold * .09); q.lineWidth = 1; q.stroke();
        }
      }
      q.restore();
      var white = id === 'explosion' ? smooth(u / (C.cutscenes.profile() === 'full' ? .48 : .95)) : id === 'whiteout' ? 1 : 0;
      // The single white envelope can only rise during a run, including backward seeks.
      whites = Math.max(whites, white);
      if (whites > 0) { q.fillStyle = 'rgba(255,255,255,' + whites + ')'; q.fillRect(0, 0, w, h); }
    }
    function start(value) {
      seed = String(value || 'super-rare'); whites = 0; fieldAt = -Infinity; stars = [];
      var rng = random(); for (var i = 0; i < 48; i++) stars.push({ x: rng(), y: rng(), size: i % 9 ? .55 : 1, alpha: .1 + rng() * .34, phase: rng() * TAU });
    }
    function warmGlass(m){if(glassGPU.prepare()){var warmCanvas=root.document.createElement('canvas');warmCanvas.width=warmCanvas.height=1;glassGPU.paint(warmCanvas.getContext('2d'),1,0,.6,m.cloud,contour);}}
    function stop() { material = null; materialKey = ''; field = null; fieldKey = ''; glows = Object.create(null); if(warmed&&root.performance.now()-warmed.at>20000)releaseWarm(); stars = []; glassScene = null; glassAt = -Infinity; glassGPU.stop(); }
    return { paint: paint, start: start, stop: stop, warmGlass: warmGlass, prepare: function(){var m=materialFor();warmGlass(m);return m;},get gpu(){return glassGPU;},
      get stats() { return { materialSize: material ? material.cloud.width : 0, fieldSize: field ? field.width : 0, glowCount: Object.keys(glows).length, white: whites, seed: seed, glass:glassGPU.stats }; } };
  } };
  // The opening stops the intro between the warm-up and its start, so a warm-up survives a stop while it is fresh.
  function releaseWarm() { if (warmed && warmed.glass) warmed.glass.stop(); warmed = null; }
  C.superRareIntro.warmup = function () {
    if (C.cutscenes.mode() === 'light' || C.settings.get('cinematicQuality') === 'low') { releaseWarm(); return; }
    var quality = C.settings.get('cinematicQuality'), key = C.settings.get('rarityColor') + ':' + quality;
    if (warmed && warmed.key === key) return;
    releaseWarm();
    var painter = C.superRareIntro.create(), job = materialJob(quality === 'high' || quality === 'very-high' ? 640 : 448);
    var mine = warmed = { key: key, job: job, painter: painter, glass: painter.gpu, glassReady: false, at: root.performance.now() };
    (function slice() {
      if (warmed !== mine) return;
      if (!job.step(3)) { if (root.requestAnimationFrame) root.requestAnimationFrame(slice); return; }
      painter.warmGlass(job.material); mine.glassReady = true;
    })();
  };
})(window.Cardable, window);
