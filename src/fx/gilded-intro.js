(function (C, root) {
  'use strict';
  // Original molten-gold/prismatic ceremony. The opening controller owns its clock.
  var TAU = Math.PI * 2;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function rgba(c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a) + ')'; }
  function blend(a, b, p) { return a.map(function (v, i) { return Math.round(mix(v, b[i], clamp(p))); }); }
  function mono(c) {
    if (C.config.rarityColorMode !== 'mono') return c;
    var l = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072); return [l, l, l];
  }
  function randomFor(seed) {
    var n = 2166136261, text = String(seed);
    for (var i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
    return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function canvas() { return root.document.createElement('canvas'); }
  function polygon(g, points, w, h) {
    g.beginPath(); g.moveTo(points[0][0] * w, points[0][1] * h);
    for (var i = 1; i < points.length; i++) g.lineTo(points[i][0] * w, points[i][1] * h);
    g.closePath();
  }
  C.gildedIntro = { create: function () {
    var spec, facets = [], flames = [], embers = [], palette, key = '', mesh = null, hotMesh = null;
    var heat = canvas(), heatContext = heat.getContext('2d'), heatAt = -Infinity, heatKey = '';
    var sweep = canvas(), sweepContext = sweep.getContext('2d'), sweepKey = '', sweepAt = -Infinity;
    var glows = Object.create(null), backdrop = null, backdropKey = '';
    var flameMaterial = null, flameMaterialKey = '';
    function start(next, seed) {
      spec = next; var random = randomFor(seed + ':gilded'), columns = 12, rows = 8, points = [];
      facets = []; flames = []; embers = []; key = ''; heatKey = ''; heatAt = -Infinity; backdropKey = ''; sweepKey = ''; sweepAt = -Infinity;
      for (var y = 0; y <= rows; y++) {
        var row = [];
        for (var x = 0; x <= columns; x++) row.push([x / columns + (x && x < columns ? (random() - .5) * .07 : 0),
          y / rows + (y && y < rows ? (random() - .5) * .09 : 0)]);
        points.push(row);
      }
      for (var r = 0; r < rows; r++) for (var c = 0; c < columns; c++) {
        var a = points[r][c], b = points[r][c + 1], d = points[r + 1][c], e = points[r + 1][c + 1];
        var triangles = random() < .5 ? [[a, b, d], [b, e, d]] : [[a, b, e], [a, e, d]];
        triangles.forEach(function (p) { facets.push({ points: p, light: random(), angle: random() * TAU,
          cx: (p[0][0] + p[1][0] + p[2][0]) / 3, cy: (p[0][1] + p[1][1] + p[2][1]) / 3 }); });
      }
      for (var f = 0; f < 28; f++) flames.push({ y: (f % 14 + random()) / 14, reach: .45 + random() * .55,
        phase: random() * TAU, speed: .6 + random() * .7, size: .025 + random() * .035 });
      for (var i = 0; i < 36; i++) embers.push({ x: random(), y: random(), phase: random(), size: 1 + random() * 2.5, turn: random() * TAU });
    }
    function prepare(w, h) {
      palette = { dark: mono(spec.background), gold: mono(spec.color), amber: mono(spec.orbitColor), light: mono(spec.starColor) };
      var size = C.config.rarityIntro.gildedFieldSize, scale = Math.min(1, size / Math.max(w, h));
      var fw = Math.max(1, Math.round(w * scale)), fh = Math.max(1, Math.round(h * scale));
      var next = palette.gold + ':' + fw + ':' + fh;
      if (key === next) return;
      key = next; mesh = canvas(); hotMesh = canvas(); mesh.width = hotMesh.width = fw; mesh.height = hotMesh.height = fh;
      var q = mesh.getContext('2d'), hot = hotMesh.getContext('2d');
      q.fillStyle = rgba(palette.dark, 1); q.fillRect(0, 0, fw, fh); hot.fillStyle = rgba(palette.dark, 1); hot.fillRect(0, 0, fw, fh);
      facets.forEach(function (face) {
        var length = Math.min(fw, fh) * .16, dx = Math.cos(face.angle) * length, dy = Math.sin(face.angle) * length;
        [q, hot].forEach(function (g, layer) {
          polygon(g, face.points, fw, fh);
          var grad = g.createLinearGradient(face.cx * fw - dx, face.cy * fh - dy, face.cx * fw + dx, face.cy * fh + dy);
          var strength = layer ? .45 + face.light * .45 : .08 + face.light * .28;
          grad.addColorStop(0, rgba(blend(palette.dark, palette.gold, strength * .32), 1));
          grad.addColorStop(.52, rgba(blend(palette.dark, palette.amber, strength), 1));
          grad.addColorStop(1, rgba(blend(palette.dark, palette.light, strength * .74), 1));
          g.fillStyle = grad; g.fill(); g.strokeStyle = rgba(palette.gold, layer ? .5 : .18); g.lineWidth = .65; g.stroke();
          // Beveled top-left catch; the other two edges remain bronze/dark.
          g.beginPath(); g.moveTo(face.points[0][0] * fw, face.points[0][1] * fh); g.lineTo(face.points[1][0] * fw, face.points[1][1] * fh);
          g.strokeStyle = rgba(palette.light, (layer ? .42 : .1) * face.light); g.lineWidth = .7; g.stroke();
        });
      });
      heatKey = ''; backdropKey = ''; sweepKey = '';
      if (flameMaterialKey !== String(palette.gold)) {
        flameMaterial = canvas(); flameMaterial.width = 128; flameMaterial.height = 256;
        var materialContext = flameMaterial.getContext('2d'), pixels = materialContext.createImageData(128,256), random = randomFor('molten-gold-turbulence');
        var values = new Float32Array(17*33); for (var i = 0; i < values.length; i++) values[i] = random();
        for (var row = 0; row <= 32; row++) values[row*17+16] = values[row*17];
        for (var column = 0; column <= 16; column++) values[32*17+column] = values[column];
        function noise(x,y) {
          x = (x % 16 + 16) % 16; y = (y % 32 + 32) % 32;
          var ix = Math.floor(x), iy = Math.floor(y), dx = smooth(x-ix), dy = smooth(y-iy);
          return mix(mix(values[iy*17+ix],values[iy*17+ix+1],dx),mix(values[(iy+1)*17+ix],values[(iy+1)*17+ix+1],dx),dy);
        }
        for (var py = 0; py < 256; py++) for (var px = 0; px < 128; px++) {
          var u = px/128, v = py/256, cloud = noise(u*6,v*32), fine = noise(u*13,v*64);
          var fold = Math.pow(.5+.5*Math.sin((u*3.7+cloud*1.2+v*2)*TAU),4);
          var warmth = clamp(fold*.8+Math.pow(fine,3)*.4), tint = blend(palette.gold,palette.light,warmth*.9), at = (py*128+px)*4;
          pixels.data[at] = tint[0]; pixels.data[at+1] = tint[1]; pixels.data[at+2] = tint[2];
          pixels.data[at+3] = warmth * smooth(u/.14) * (1-smooth((u-.8)/.2)) * 110;
        }
        materialContext.putImageData(pixels,0,0); flameMaterialKey = String(palette.gold);
      }
    }
    function glow(g, x, y, rx, ry, color, a) {
      if (a <= 0 || rx <= 0 || ry <= 0) return;
      var k = color.join(','), sprite = glows[k];
      if (!sprite) {
        sprite = canvas(); sprite.width = sprite.height = 96; var q = sprite.getContext('2d');
        var grad = q.createRadialGradient(48, 48, 0, 48, 48, 48);
        grad.addColorStop(0, rgba(color, 1)); grad.addColorStop(.18, rgba(color, .65)); grad.addColorStop(.5, rgba(color, .17)); grad.addColorStop(1, rgba(color, 0));
        q.fillStyle = grad; q.fillRect(0, 0, 96, 96); glows[k] = sprite;
        if (Object.keys(glows).length > 8) delete glows[Object.keys(glows)[0]];
      }
      g.globalAlpha = a; g.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1;
    }
    function foundation(g, w, h, warmth) {
      g.fillStyle = rgba(palette.dark, 1); g.fillRect(0, 0, w, h);
      var light = g.createRadialGradient(w * .46, h * .4, 0, w * .5, h * .5, Math.hypot(w, h) * .7);
      light.addColorStop(0, rgba(palette.gold, .06 + warmth * .23)); light.addColorStop(.5, rgba(palette.gold, warmth * .08)); light.addColorStop(1, rgba(palette.dark, 0));
      g.fillStyle = light; g.fillRect(0, 0, w, h);
    }
    function fire(g, w, h, t, amount) {
      if (amount <= 0) return;
      var fw = mesh.width, fh = mesh.height, next = key + ':' + amount.toFixed(2);
      if (next !== heatKey || t < heatAt || t - heatAt >= 1 / 30) {
        if (heat.width !== fw || heat.height !== fh) { heat.width = fw; heat.height = fh; }
        var q = heatContext; q.clearRect(0, 0, fw, fh);
        for (var side = 0; side < 2; side++) {
          q.save(); if (side) { q.translate(fw, 0); q.scale(-1, 1); }
          // A continuous molten edge, with large curls and fine rising turbulence.
          var edge = [], base = fw * (.018 + amount * .19);
          for (var n = 0; n <= 100; n++) {
            var v = n / 100, large = Math.sin(v * 17 + t * 1.2 + side) + Math.sin(v * 33 + t * 2.1) * .45;
            var fine = Math.sin(v * 91 + t * 3.4) * Math.sin(v * 47 - t * 1.8);
            edge.push([base + fw * amount * (.032 * large + .012 * fine), v * fh]);
          }
          polygon(q, [[-10,-10]].concat(edge, [[-10,fh+10]]), 1, 1);
          var wall = q.createLinearGradient(0, 0, base * 1.25, 0);
          wall.addColorStop(0, rgba(palette.amber, amount * .05)); wall.addColorStop(.65, rgba(palette.gold, amount * .19));
          wall.addColorStop(.92, rgba(palette.gold, amount * .42)); wall.addColorStop(1, rgba(palette.light, amount * .15)); q.fillStyle = wall; q.fill();
          q.save(); q.clip(); q.globalAlpha = amount;
          var lift = (t*.08%1)*fh;
          for (var layer = -1; layer <= 1; layer++) q.drawImage(flameMaterial, -base*.2, layer*fh-lift, base*1.65, fh);
          q.restore();
          q.beginPath(); edge.forEach(function (p, index) { if (index) q.lineTo(p[0],p[1]); else q.moveTo(p[0],p[1]); });
          [[12,.04,palette.gold],[6,.14,palette.gold],[2.2,.52,palette.gold],[.8,.85,palette.light]].forEach(function (stroke) {
            q.lineWidth = stroke[0]; q.strokeStyle = rgba(stroke[2], amount * stroke[1]); q.stroke();
          });
          for (var i = side * 14; i < (side + 1) * 14; i++) {
            var flame = flames[i], pulse = Math.sin(t * flame.speed * 2 + flame.phase), y = (flame.y + pulse * .014) * fh;
            var reach = fw * amount * (.055 + .05 * flame.reach), height = fh * flame.size * .7;
            var anchor = base + fw * amount * .02 * Math.sin(flame.y * 17 + t * 1.2 + side);
            q.beginPath(); q.moveTo(anchor, y + height);
            q.bezierCurveTo(anchor + reach * .6, y, anchor - reach * .25, y - height * 1.1, anchor + reach, y - height * 2.3);
            q.bezierCurveTo(anchor + reach * .25, y - height * 1.4, anchor + reach * .8, y + height * .2, anchor, y + height); q.closePath();
            var grad = q.createLinearGradient(anchor, y + height, anchor + reach, y - height * 2.3);
            grad.addColorStop(0, rgba(palette.gold, amount * .22)); grad.addColorStop(.55, rgba(palette.light, amount * .09)); grad.addColorStop(1, rgba(palette.light, 0));
            q.fillStyle = grad; q.fill(); q.strokeStyle = rgba(palette.light, amount * .12); q.lineWidth = .7; q.stroke();
          }
          glow(q, base, fh * .48, fw * .25, fh * .8, palette.gold, amount * .35); q.restore();
        }
        heatAt = t; heatKey = next;
      }
      g.drawImage(heat, 0, 0, w, h);
    }
    function mote(g, w, h, t, amount, still) {
      for (var i = 0; i < embers.length; i++) {
        var e = embers[i], life = still ? .5 : (e.phase + t * .07) % 1;
        var x = (e.x < .5 ? e.x * .72 + life * .07 : .64 + (e.x - .5) * .72 - life * .07) * w;
        var y = ((e.y + (still ? 0 : -t * .026) + 10) % 1) * h, a = amount * Math.sin(life * Math.PI);
        g.save(); g.translate(x, y); g.rotate(e.turn + (still ? 0 : t * .13));
        g.fillStyle = rgba(i % 4 ? palette.gold : palette.light, a); g.beginPath(); g.moveTo(0, -e.size * 2); g.lineTo(e.size, e.size); g.lineTo(-e.size, e.size * .5); g.closePath(); g.fill(); g.restore();
      }
    }
    function prism(g, w, h, t, amount, dissolve) {
      if (amount <= 0) return;
      var short = Math.min(w, h), ry = Math.min(h * .31, short * .6), rx = Math.min(w * .2, short * .18);
      var size = mix(.72, 1.08, smooth(amount)), cx = w / 2, cy = h * .48;
      glow(g, cx, cy, rx * 2.8, ry * 1.7, palette.gold, amount * .45 * (1 - dissolve));
      g.save(); g.translate(cx, cy); g.scale(size, size); g.rotate((1 - smooth(amount)) * -.075);
      var points = [[0,-ry],[rx,-ry*.53],[rx,ry*.5],[0,ry],[-rx,ry*.53],[-rx,-ry*.5]];
      g.globalAlpha = amount * (1 - dissolve);
      var pairs = [[points[0],points[1],[0,0]],[points[1],points[2],[0,0]],[points[2],points[3],[0,0]],
        [points[3],points[4],[0,0]],[points[4],points[5],[0,0]],[points[5],points[0],[0,0]]];
      pairs.forEach(function (p, i) {
        polygon(g, p, 1, 1); var grad = g.createLinearGradient(-rx, -ry, rx, ry);
        grad.addColorStop(0, rgba(blend(palette.dark, palette.light, i === 5 || i === 0 ? .9 : .25), 1));
        grad.addColorStop(.22, rgba(blend(palette.dark, palette.gold, i % 2 ? .28 : .74), 1));
        grad.addColorStop(.48, rgba(blend(palette.dark, palette.amber, i % 2 ? .12 : .6), 1));
        grad.addColorStop(1, rgba(blend(palette.dark, palette.light, i === 2 ? .68 : .1), 1)); g.fillStyle = grad; g.fill();
        g.strokeStyle = rgba(palette.gold, .45); g.lineWidth = .8; g.stroke();
      });
      g.save(); polygon(g, points, 1, 1); g.clip(); g.globalAlpha = amount * .35 * (1 - dissolve);
      g.drawImage(hotMesh, -rx + Math.sin(t * .35) * rx * .1, -ry, rx * 2.1, ry * 2); g.restore();
      var core = g.createLinearGradient(-rx * .07, 0, rx * .07, 0);
      core.addColorStop(0, rgba(palette.gold, 0)); core.addColorStop(.45, rgba(palette.gold, .4)); core.addColorStop(.5, rgba(palette.light, .85)); core.addColorStop(1, rgba(palette.gold, 0));
      polygon(g, [[0,-ry],[rx*.07,-ry*.12],[rx*.05,ry*.5],[0,ry],[-rx*.05,ry*.2],[-rx*.07,-ry*.3]], 1, 1); g.fillStyle = core; g.fill();
      polygon(g, points, 1, 1); g.strokeStyle = rgba(palette.gold, .13); g.lineWidth = 12; g.stroke();
      g.strokeStyle = rgba(palette.gold, .6); g.lineWidth = 3; g.stroke(); g.strokeStyle = rgba(palette.light, .95); g.lineWidth = 1; g.stroke();
      // Fine triangulation and small travelling edge flames refer to the golden outline/mesh.
      for (var j = 0; j < 12; j++) {
        var edge = j % 6, u = (j / 12 + t * .075) % 1, p1 = points[edge], p2 = points[(edge + 1) % 6];
        var x = mix(p1[0],p2[0],u), y = mix(p1[1],p2[1],u), wave = 8 + Math.sin(t * 2.1 + j) * 5;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (x > 0 ? wave : -wave), y - 13, x + (x > 0 ? 4 : -4), y - 29);
        g.strokeStyle = rgba(palette.light, .35 + .3 * Math.sin(u * Math.PI)); g.lineWidth = .9; g.stroke();
      }
      g.restore();
      // A warm top-left source and a narrow vertical axis; no ornamental portal/ring.
      glow(g, cx - rx * .75, cy - ry * .4, rx * .7, ry * .3, palette.light, amount * .5 * (1 - dissolve));
      glow(g, cx, cy - ry * size, rx * .38, ry * .15, palette.light, amount * .65 * (1 - dissolve));
      glow(g, cx + rx * size, cy + ry * .5 * size, rx * .3, ry * .12, palette.gold, amount * .4 * (1 - dissolve));
    }
    function seam(g, w, h, amount) {
      var axis = g.createLinearGradient(0, 0, 0, h);
      axis.addColorStop(0, rgba(palette.gold, 0)); axis.addColorStop(.18, rgba(palette.gold, amount * .2));
      axis.addColorStop(.5, rgba(palette.light, amount * .8)); axis.addColorStop(.82, rgba(palette.gold, amount * .2)); axis.addColorStop(1, rgba(palette.gold, 0));
      g.fillStyle = axis; g.fillRect(w / 2 - .65, 0, 1.3, h);
    }
    function crystals(g, w, h, p) {
      var pass = Math.min(2, Math.floor(p * 3)), u = clamp(p * 3 - pass), front = pass === 1 ? 1 - smooth(u) : smooth(u);
      if (sweepKey !== key || p < sweepAt || p - sweepAt >= 1 / 90) {
        var fw = mesh.width, fh = mesh.height, q = sweepContext;
        if (sweep.width !== fw || sweep.height !== fh) { sweep.width = fw; sweep.height = fh; }
        q.clearRect(0, 0, fw, fh); q.globalAlpha = .65 * smooth(p * 5); q.drawImage(mesh, 0, 0); q.globalAlpha = 1;
        facets.forEach(function (face) {
          var distance = Math.abs(face.cx - .5) * 2, stagger = Math.sin(face.cy * 15 + face.light * 3) * .025;
          var catchLight = Math.exp(-Math.pow((distance - front + stagger) / .14, 2));
          var fill = pass === 2 ? smooth((front - distance + .1) / .2) : 0, strength = Math.max(catchLight * .9, fill * .82);
          if (strength < .01) return;
          polygon(q, face.points, fw, fh); var grad = q.createLinearGradient(face.cx * fw - fw * .09, face.cy * fh - fh * .1, face.cx * fw + fw * .09, face.cy * fh + fh * .1);
          grad.addColorStop(0, rgba(blend(palette.dark,palette.gold,.35), strength));
          grad.addColorStop(.43, rgba(blend(palette.gold,palette.light,face.light*.6), strength));
          grad.addColorStop(.7, rgba(blend(palette.dark,palette.amber,.4), strength));
          grad.addColorStop(1, rgba(blend(palette.gold,palette.light,face.light*.3), strength));
          q.fillStyle = grad; q.fill(); q.strokeStyle = rgba(palette.light, catchLight * .6); q.lineWidth = .7; q.stroke();
          if (face.light > .84 && catchLight > .5) {
            glow(q, face.cx * fw, face.cy * fh, fw * .05, fh * .045, palette.light, catchLight * .5);
          }
        });
        sweepAt = p; sweepKey = key;
      }
      g.drawImage(sweep, 0, 0, w, h); seam(g, w, h, .9);
    }
    function backplate(g, w, h) {
      prepare(w, h);
      if (!backdrop || backdropKey !== key) {
        backdrop = canvas(); backdrop.width = mesh.width; backdrop.height = mesh.height;
        var q = backdrop.getContext('2d'), fw = mesh.width, fh = mesh.height;
        q.drawImage(mesh, 0, 0); q.globalAlpha = .14; q.drawImage(hotMesh, 0, 0); q.globalAlpha = 1;
        // Preserve gold at the edges while leaving the card/metadata/buttons a quiet center.
        var shade = q.createRadialGradient(fw * .5, fh * .52, 0, fw * .5, fh * .52, fw * .48);
        shade.addColorStop(0, rgba(palette.dark, .92)); shade.addColorStop(.32, rgba(palette.dark, .82)); shade.addColorStop(.7, rgba(palette.dark, .35)); shade.addColorStop(1, rgba(palette.dark, .1));
        q.fillStyle = shade; q.fillRect(0, 0, fw, fh);
        glow(q, fw * .17, fh * .25, fw * .3, fh * .5, palette.gold, .1);
        glow(q, fw * .85, fh * .7, fw * .27, fh * .5, palette.gold, .08); backdropKey = key;
      }
      g.drawImage(backdrop, 0, 0, w, h);
    }
    function paint(g, w, h, s, stillProgress) {
      prepare(w, h); var quiet = typeof stillProgress === 'number', p = s.p, offset = 0;
      for (var i = 0; i < spec.sections.length; i++) { if (spec.sections[i].id === s.id) { offset += spec.sections[i].ms * p; break; } offset += spec.sections[i].ms; }
      var t = offset / 1000;
      if (quiet) {
        backplate(g, w, h); var fade = smooth(stillProgress / .35) * (1 - smooth((stillProgress - .7) / .3));
        glow(g, w / 2, h * .48, w * .35, h * .5, palette.gold, .13 * fade); seam(g, w, h, .2 * fade); return;
      }
      var warmth = s.id === 'embers' ? smooth(p) * .25 : s.id === 'flames' ? .25 + .75 * smooth(p) : 1;
      foundation(g, w, h, warmth);
      if (s.id === 'embers') { fire(g, w, h, t, smooth(p) * .12); mote(g, w, h, t, smooth(p) * .55, false); }
      else if (s.id === 'flames') { fire(g, w, h, t, .12 + .88 * smooth(p)); mote(g, w, h, t, .55, false); seam(g, w, h, smooth((p - .4) / .6) * .25); }
      else if (s.id === 'aura') { fire(g, w, h, t, 1 - .28 * smooth(p)); prism(g, w, h, t, smooth(p), 0); mote(g, w, h, t, .55, false); seam(g, w, h, .3 + .5 * p); }
      else if (s.id === 'sweeps') {
        fire(g, w, h, t, .72 * (1 - smooth(p))); prism(g, w, h, t, 1, smooth((p - .5) / .5));
        crystals(g, w, h, p); mote(g, w, h, t, .6 * (1 - p), false);
      } else if (s.id === 'seal') {
        crystals(g, w, h, 1); g.globalAlpha = smooth(p); g.drawImage(hotMesh, 0, 0, w, h); g.globalAlpha = 1;
        glow(g, w / 2, h * .48, w * .6, h * .65, palette.light, .16 * Math.sin(p * Math.PI));
        g.globalAlpha = smooth(p) * .85; backplate(g, w, h); g.globalAlpha = 1; seam(g, w, h, .9 * (1 - smooth(p)));
      } else {
        g.drawImage(hotMesh, 0, 0, w, h); g.globalAlpha = .85 + .15 * smooth(p); backplate(g, w, h); g.globalAlpha = 1;
      }
    }
    return { start: start, paint: paint, backplate: backplate };
  } };
})(window.Cardable, window);
