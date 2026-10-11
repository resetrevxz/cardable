/* Designed pack faces (Standard and Rare). Each sealed pack has a printed front and a
 * printed back. Static artwork is painted once per size into a canvas; the only per-frame
 * work is one small dynamic canvas on the face that is actually turned toward the player
 * (Rare network / grid / chameleon, and the cut dots on the opened wrapper).
 * Everything runs from the existing pack materials and opening updates: no private clock. */
(function (C, root) {
  'use strict';
  var ASPECT = 1.48, TAU = Math.PI * 2;
  var registry = Object.create(null);
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function seedOf(text) { var h = 2166136261; for (var i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; }
  function node(tag, className, parent, text) { return C.packMarkup.node(tag, className, parent, text); }

  // Shared layout, in fractions of pack width (x) and pack height (y).
  var LAYOUT = { crimp: .06, seam: .09, markX: .09, markY: .125, seriesX: .09, seriesY: .895, focusY: .56 };

  var PALETTE = {
    standard: {
      body: ['#101014', '#0a0a0d', '#050506'], edge: '#020203', ridge: 'rgba(255,255,255,.1)', ridgeLow: 'rgba(0,0,0,.7)',
      crimp: ['#18181c', '#0c0c0f'], dot: '255,255,255', node: '#ffffff', line: '255,255,255', grid: '255,255,255', accent: '#ffffff'
    },
    rare: {
      body: ['#1b5fe0', '#0d3aa6', '#061a52'], edge: '#031033', ridge: 'rgba(214,232,255,.34)', ridgeLow: 'rgba(2,12,44,.7)',
      crimp: ['#2a6cf0', '#0a2f8e'], dot: '255,255,255', node: '#e4f0ff', line: '178,214,255', grid: '255,255,255', accent: '#7fb2ff'
    }
  };

  function pixelRatio() {
    var policy = C.settings && C.settings.policy ? C.settings.policy.dpr : 1.5;
    return clamp(Math.min(root.devicePixelRatio || 1, policy || 1.5, 2), 1, 2);
  }
  function sizeOf(el) {
    // Layout size is untouched by pose transforms; fall back to the shell default when detached.
    var w = el && el.offsetWidth;
    if (!w) { var rect = el && el.getBoundingClientRect && el.getBoundingClientRect(); w = rect && rect.width || 0; }
    if (!w) w = C.config.shell.packWidth * 1.4;
    return { w: Math.round(w), h: Math.round(w * ASPECT) };
  }
  function fit(canvas, size) {
    var ratio = pixelRatio(), pw = Math.round(size.w * ratio), ph = Math.round(size.h * ratio);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    return ctx;
  }

  // ---------------------------------------------------------------- static painting
  function dotField(ctx, w, h, focusX, opts) {
    // The Cardable dot grid, parked at one edge: dots swell and brighten toward the focus,
    // exactly as the background grid does around the cursor.
    var pitch = w / (opts.cols || 15), radius = w * (opts.reach || .66), fy = h * LAYOUT.focusY;
    var minR = w * .0016, maxR = pitch * (opts.max || .3), top = h * .19, bottom = h * .86;
    ctx.fillStyle = 'rgba(' + (opts.rgb || '255,255,255') + ',1)';
    var left = w * .035, right = w * .935;
    for (var y = pitch * .5; y < h; y += pitch) {
      if (y < top || y > bottom) continue;
      for (var x = pitch * .5; x < w; x += pitch) {
        if (x < left || x > right) continue;
        var dx = x - focusX, dy = (y - fy) * .82, d = Math.sqrt(dx * dx + dy * dy);
        var f = 1 - smooth(0, radius, d);
        if (f <= .02) continue;
        var edge = smooth(0, h * .09, y - top) * smooth(0, h * .09, bottom - y);
        var r = minR + (maxR - minR) * f * f * edge;
        if (r < .35) continue;
        ctx.globalAlpha = clamp(.12 + .88 * f, 0, 1) * (opts.alpha == null ? 1 : opts.alpha) * (.4 + .6 * edge);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function crimpBands(ctx, w, h, pal) {
    var ch = h * LAYOUT.crimp;
    [0, h - ch].forEach(function (y0, band) {
      var g = ctx.createLinearGradient(0, y0, 0, y0 + ch);
      if (band === 0) { g.addColorStop(0, pal.crimp[0]); g.addColorStop(1, pal.crimp[1]); }
      else { g.addColorStop(0, pal.crimp[1]); g.addColorStop(1, pal.crimp[0]); }
      ctx.fillStyle = g; ctx.fillRect(0, y0, w, ch);
      var step = Math.max(2.2, w / 78);
      for (var x = step * .5; x < w; x += step) {
        ctx.fillStyle = pal.ridge; ctx.fillRect(x, y0, Math.max(.6, step * .28), ch);
        ctx.fillStyle = pal.ridgeLow; ctx.fillRect(x + step * .34, y0, Math.max(.5, step * .22), ch);
      }
      var line = ctx.createLinearGradient(0, 0, w, 0);
      line.addColorStop(0, 'rgba(255,255,255,0)'); line.addColorStop(.5, 'rgba(255,255,255,.22)'); line.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = line; ctx.fillRect(0, band === 0 ? y0 + ch - 1 : y0, w, 1);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, band === 0 ? y0 + ch : y0 - 1, w, 1);
    });
  }
  function folds(ctx, w, h, pal, strength) {
    // The shallow creases that radiate from each crimp corner of a sealed foil pack.
    ctx.lineWidth = Math.max(.6, w * .003);
    [[0, 1], [1, 1], [0, -1], [1, -1]].forEach(function (c) {
      var x0 = c[0] * w, y0 = c[1] > 0 ? h * LAYOUT.crimp : h * (1 - LAYOUT.crimp), dir = c[0] ? -1 : 1, up = c[1];
      for (var i = 0; i < 4; i++) {
        var spread = (i + 1) * .045;
        var g = ctx.createLinearGradient(x0, y0, x0 + dir * w * .32, y0 + up * h * .26);
        g.addColorStop(0, 'rgba(255,255,255,' + (.16 * strength).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x0 + dir * w * spread * .35, y0);
        ctx.lineTo(x0 + dir * w * (spread + .1), y0 + up * h * (.06 + i * .035)); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,' + (.34 * strength).toFixed(3) + ')'; ctx.beginPath();
        ctx.moveTo(x0 + dir * w * (spread * .35 + .006), y0); ctx.lineTo(x0 + dir * w * (spread + .106), y0 + up * h * (.06 + i * .035)); ctx.stroke();
      }
    });
  }
  function grain(ctx, w, h, amount, seed) {
    var random = rng(seed), count = Math.round(w * h / 38);
    for (var i = 0; i < count; i++) {
      ctx.fillStyle = random() > .5 ? 'rgba(255,255,255,' + (amount * random()).toFixed(3) + ')' : 'rgba(0,0,0,' + (amount * 1.4 * random()).toFixed(3) + ')';
      ctx.fillRect(random() * w, random() * h, 1, 1);
    }
  }
  function perforation(ctx, w, h, pal, alpha) {
    var y = h * LAYOUT.seam, step = Math.max(3.4, w / 46);
    ctx.fillStyle = 'rgba(' + pal.dot + ',' + alpha + ')';
    for (var x = w * .035; x < w * .965; x += step) { ctx.beginPath(); ctx.arc(x, y, Math.max(.55, w * .0032), 0, TAU); ctx.fill(); }
  }
  function barcode(ctx, x, y, w, h, seed, rgb) {
    var random = rng(seed), cursor = x;
    ctx.fillStyle = 'rgba(' + rgb + ',.82)';
    while (cursor < x + w) {
      var bar = Math.max(.7, random() * 2.4 * (w / 70)), gap = Math.max(.7, random() * 2 * (w / 70));
      if (cursor + bar > x + w) break;
      ctx.fillRect(cursor, y, bar, h); cursor += bar + gap;
    }
  }
  function body(ctx, w, h, pal, kind) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, pal.edge); g.addColorStop(.07, pal.body[2]); g.addColorStop(.3, pal.body[1]); g.addColorStop(.52, pal.body[0]);
    g.addColorStop(.74, pal.body[1]); g.addColorStop(.93, pal.body[2]); g.addColorStop(1, pal.edge);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Pillow shading: the foil bulges around the card inside.
    var v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(0,0,0,.5)'); v.addColorStop(.12, 'rgba(0,0,0,0)'); v.addColorStop(.88, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    if (kind === 'rare') {
      var glow = ctx.createRadialGradient(w * .36, h * .3, 0, w * .36, h * .3, w * .95);
      glow.addColorStop(0, 'rgba(120,176,255,.34)'); glow.addColorStop(.5, 'rgba(60,120,240,.1)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    }
  }
  function finSeal(ctx, w, h, pal) {
    // The overlapped centre seam on the back of a flow-wrapped pack.
    var x = w * .465, sw = w * .07, y0 = h * LAYOUT.crimp, y1 = h * (1 - LAYOUT.crimp);
    var g = ctx.createLinearGradient(x, 0, x + sw, 0);
    g.addColorStop(0, 'rgba(255,255,255,.0)'); g.addColorStop(.1, 'rgba(255,255,255,.07)'); g.addColorStop(.5, 'rgba(255,255,255,.025)');
    g.addColorStop(.9, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,.0)');
    ctx.fillStyle = g; ctx.fillRect(x, y0, sw, y1 - y0);
    ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fillRect(x, y0, 1, y1 - y0);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + sw - 1, y0, 1, y1 - y0);
    var step = Math.max(2.4, w / 70);
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    for (var yy = y0; yy < y1; yy += step) ctx.fillRect(x + 2, yy, sw - 4, 1);
  }

  // Standard is black, minimal, with the dot grid parked on its right edge.
  function paintStandard(ctx, w, h, rear, id) {
    var pal = PALETTE.standard;
    body(ctx, w, h, pal, 'standard');
    folds(ctx, w, h, pal, .55);
    grain(ctx, w, h, .035, seedOf(id + (rear ? ':rear' : ':front')));
    if (rear) {
      dotField(ctx, w, h, 0, { cols: 15, reach: .6, max: .28, alpha: .85 });
      finSeal(ctx, w, h, pal);
      barcode(ctx, w * .56, h * .79, w * .32, h * .042, seedOf(id + ':bar'), '255,255,255');
    } else {
      dotField(ctx, w, h, w, { cols: 15, reach: .72, max: .32, alpha: 1 });
    }
    crimpBands(ctx, w, h, pal);
    perforation(ctx, w, h, pal, rear ? .0 : .3);
  }
  function paintRare(ctx, w, h, rear, id) {
    var pal = PALETTE.rare;
    body(ctx, w, h, pal, 'rare');
    folds(ctx, w, h, pal, .8);
    grain(ctx, w, h, .02, seedOf(id + (rear ? ':rear' : ':front')));
    if (rear) {
      finSeal(ctx, w, h, pal);
      barcode(ctx, w * .56, h * .79, w * .32, h * .042, seedOf(id + ':bar'), '228,240,255');
    }
    crimpBands(ctx, w, h, pal);
    perforation(ctx, w, h, pal, rear ? 0 : .34);
  }

  // ---------------------------------------------------------------- dynamic layers
  function makeNetwork(id, count) {
    var random = rng(seedOf(id + ':network')), nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: .08 + random() * .84, y: .13 + random() * .72,
        ax: .018 + random() * .045, ay: .014 + random() * .04,
        fx: .6 + random() * .9, fy: .5 + random() * .9, px: random() * TAU, py: random() * TAU,
        r: .0046 + Math.pow(random(), 2.2) * .0064
      });
    }
    return nodes;
  }
  function nodeAt(n, t) { return { x: n.x + Math.sin(t * n.fx + n.px) * n.ax, y: n.y + Math.cos(t * n.fy + n.py) * n.ay }; }
  var GRID_CELLS = 10;

  // Draws the Rare network. `grid` morphs it into the clean white grid (0..1 from the bottom up).
  function drawRare(ctx, size, state, t, opts) {
    var w = size.w, h = size.h, ratio = opts.network == null ? 1 : opts.network;
    var cell = w / GRID_CELLS, nodes = state.nodes, grid = opts.grid || 0, wave = opts.wave == null ? 1 : opts.wave;
    var pts = nodes.map(function (n, i) {
      var p = nodeAt(n, t), x = p.x * w, y = p.y * h;
      // Snap target: nearest grid crossing, released in sequence as the grid forms.
      var gx = Math.round(x / cell) * cell, gy = Math.round(y / cell) * cell;
      var local = smooth(0, .4, grid * 1.4 - (1 - y / h) * .9 - ((i % 5) * .02));
      return { x: mix(x, gx, local), y: mix(y, gy, local), r: n.r * w * (1 + local * .1), local: local };
    });
    var reach = w * .36;
    ctx.lineWidth = Math.max(.6, w * .0034);
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > reach) continue;
        var f = 1 - d / reach, a = f * f * .62 * ratio * (1 - grid * .85);
        if (a < .02) continue;
        ctx.strokeStyle = 'rgba(' + PALETTE.rare.line + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
    pts.forEach(function (p) {
      var halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
      halo.addColorStop(0, 'rgba(180,215,255,' + (.34 * ratio).toFixed(3) + ')'); halo.addColorStop(1, 'rgba(180,215,255,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.rare.node; ctx.globalAlpha = .96 * ratio; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (grid > 0) drawGrid(ctx, size, grid, t, wave, opts.cut);
    if (opts.icons) drawIcons(ctx, size, opts.icons);
  }
  function drawIcons(ctx, size, icons) {
    // Printed marks come apart into grid-cell squares and re-form, one after another.
    var cell = size.w / GRID_CELLS / 2;
    icons.forEach(function (icon, n) {
      var u = icon.u; if (u <= 0 || u >= 1) return;
      var strength = Math.sin(u * Math.PI), r = icon.rect;
      for (var y = Math.floor(r.y / cell) * cell; y < r.y + r.h; y += cell) {
        for (var x = Math.floor(r.x / cell) * cell; x < r.x + r.w; x += cell) {
          var h = ((Math.imul((x / cell | 0) + 31 * n, 374761393) ^ Math.imul((y / cell | 0) + 17, 668265263)) >>> 0) / 4294967296;
          if (h > strength * 1.05) continue;
          var wobble = .72 + .28 * Math.sin(u * 9 + h * 6);
          ctx.fillStyle = 'rgba(255,255,255,' + (.9 * strength * wobble + .1).toFixed(3) + ')';
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    });
  }
  function drawGrid(ctx, size, p, t, wave, cut) {
    // A clean white grid that assembles from the fluid line upward, crossings first.
    var w = size.w, h = size.h, cell = w / GRID_CELLS, y0 = h * LAYOUT.crimp, y1 = h * (1 - LAYOUT.crimp);
    var front = h * (1 - clamp(p, 0, 1) * 1.08) - h * .04;
    ctx.lineWidth = Math.max(.6, w * .0026);
    for (var gx = cell; gx < w - cell * .1; gx += cell) {
      var a = .5 * wave;
      var g = ctx.createLinearGradient(0, y0, 0, y1);
      var stop = clamp((front - y0) / (y1 - y0), 0, 1);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(Math.max(0, stop - .001), 'rgba(255,255,255,0)');
      g.addColorStop(Math.min(1, stop + .12), 'rgba(255,255,255,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
    }
    for (var gy = Math.ceil(y0 / cell) * cell; gy < y1; gy += cell) {
      var row = smooth(front - cell * 1.5, front + cell, gy);
      if (row <= .01) continue;
      ctx.strokeStyle = 'rgba(255,255,255,' + (.5 * wave * row).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(w * .02, gy); ctx.lineTo(w * .98, gy); ctx.stroke();
      for (var cx = cell; cx < w; cx += cell) {
        var pulse = .5 + .5 * Math.sin(t * 1.4 + cx * .05 + gy * .03), boost = 0;
        if (cut && cut.heat > 0) boost = (1 - smooth(0, cell * 2.6, Math.hypot(cx - cut.tip * w, gy - h * C.config.cut.guideY))) * cut.heat;
        ctx.fillStyle = 'rgba(255,255,255,' + clamp((.55 + .3 * pulse + boost * .45) * wave * row, 0, 1).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx, gy, Math.max(.9, w * .0058) * (1 + boost * 1.1), 0, TAU); ctx.fill();
      }
    }
  }

  // The chameleon: scale-sized cells flip from black to sapphire in a wave, flushing teal first.
  function makeCells(size, id) {
    var random = rng(seedOf(id + ':cells')), cell = size.w / 11, cells = [];
    var seed = { x: size.w * (.2 + random() * .6), y: size.h * (.62 + random() * .2) };
    for (var row = -1; row * cell * .87 < size.h + cell; row++) {
      for (var col = -1; col * cell < size.w + cell; col++) {
        var x = col * cell + (row & 1 ? cell * .5 : 0) + (random() - .5) * cell * .22;
        var y = row * cell * .87 + (random() - .5) * cell * .22;
        var d = Math.hypot(x - seed.x, (y - seed.y) * .9) / size.h;
        cells.push({ x: x, y: y, r: cell * (.62 + random() * .08), start: d * .78 + random() * .16, rot: random() * 1.047 });
      }
    }
    return cells;
  }
  function drawCover(ctx, size, cells, source, p) {
    // The standard pack, drawn over the Rare face and erased cell by cell.
    var flush = ['#3cf2c6', '#25c9ff', '#6a8bff'];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], local = clamp((p * 1.35 - c.start) / .28, 0, 1);
      if (local >= 1) continue;
      ctx.save();
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var a = c.rot + k * Math.PI / 3, px = c.x + Math.cos(a) * c.r * 1.03, py = c.y + Math.sin(a) * c.r * 1.03;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.clip();
      if (local < .5) ctx.drawImage(source, 0, 0, size.w, size.h);
      else {
        ctx.fillStyle = 'rgb(8,8,11)'; ctx.globalAlpha = 1 - (local - .5) * 2; ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      }
      if (local > 0) {
        var f = flush[Math.min(2, Math.floor(local * 3))];
        ctx.globalAlpha = Math.sin(local * Math.PI) * .75; ctx.fillStyle = f; ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Cut dots: a dotted seam that ignites behind the blade and lifts away when torn.
  function drawCutDots(ctx, size, cut, t, rgb) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, step = Math.max(3.4, w / 46);
    var min = cut.min * w, max = cut.max * w, tip = cut.tip * w;
    for (var x = w * .035, i = 0; x < w * .965; x += step, i++) {
      var inside = x >= min && x <= max;
      var near = 1 - smooth(0, w * .22, Math.abs(x - tip));
      var cooled = inside ? .5 + .5 * cut.heat * near : .16;
      var r = Math.max(.7, w * .0032) * (1 + (inside ? 1.4 : 0) * (.6 + near * .8));
      var rise = cut.release ? -cut.release * (14 + (i % 7) * 7) * (.5 + near) : 0;
      ctx.fillStyle = 'rgba(' + rgb + ',' + clamp(cooled * (1 - (cut.release || 0)), 0, 1).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y + rise + Math.sin(t * 3 + i) * (inside ? .6 : 0), r, 0, TAU); ctx.fill();
      if (inside && near > .15) {
        // A second row either side of the blade: the grid noticing the cut.
        ctx.fillStyle = 'rgba(' + rgb + ',' + (near * .55 * (1 - (cut.release || 0))).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y - step * .8 + rise * .6, r * .62, 0, TAU); ctx.arc(x, y + step * .8 + rise * .6, r * .62, 0, TAU); ctx.fill();
      }
    }
  }

  // ---------------------------------------------------------------- face registry
  function define(id, spec) { registry[id] = spec; }
  function specOf(pack) { return registry[pack && pack.design && pack.design.face]; }

  var observer = null;
  function watch(face) {
    if (!root.ResizeObserver) return;
    if (!observer) observer = new root.ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var faces = entry.target._packFaces; if (!faces) return;
        var width = Math.round(entry.target.offsetWidth);
        entry.target._packFaces = faces.filter(function (f) { return !f.dead; });
        entry.target._packFaces.forEach(function (f) { if (width > 0 && f.size.w !== width) f.paint(); });
      });
    });
    var host = face.wrapper.parentNode; if (!host) return;
    face.host = host;
    (host._packFaces || (host._packFaces = [])).push(face);
    observer.observe(host);
  }

  // One controller per painted face element (".pack-face-root" inside a unit face or foil).
  function build(wrapper, pack, rear, kind) {
    var spec = specOf(pack);
    if (!spec) return null;
    if (wrapper._packFace) wrapper._packFace.destroy();
    var body = node('canvas', 'pack-face-art', wrapper), dyn = node('canvas', 'pack-face-fx', wrapper);
    body.setAttribute('aria-hidden', 'true'); dyn.setAttribute('aria-hidden', 'true');
    var face = {
      pack: pack, spec: spec, rear: !!rear, kind: kind || 'face', body: body, dyn: dyn, wrapper: wrapper,
      size: { w: 0, h: 0 }, nodes: null, cells: null, standard: null, t: 0, painted: false, dynKey: '',
      chameleon: 1, grid: 0, cut: null, network: 1, wave: 1, active: false, icons: null, dead: false,
      charge: 0, arrive: 1, last: null, store: {}, ratio: 0
    };
    wrapper._packFace = face;
    face.destroy = function () {
      if (face.dead) return;
      face.dead = true;
      if (face.host && face.host._packFaces) {
        var at = face.host._packFaces.indexOf(face);
        if (at >= 0) face.host._packFaces.splice(at, 1);
        if (!face.host._packFaces.length && observer) observer.unobserve(face.host);
      }
      body.width = body.height = dyn.width = dyn.height = 0;
      face.nodes = face.cells = face.standard = face.icons = null; face.store = {};
      if (wrapper._packFace === face) wrapper._packFace = null;
      face.host = null;
    };
    face.paint = function () {
      if (face.dead) return false;
      var host = wrapper.parentNode || wrapper;
      if (host.offsetWidth === 0) return false;
      var size = sizeOf(host); face.size = size; face.icons = null;
      var ctx = fit(body, size); spec.paint(ctx, size.w, size.h, face.rear, pack.id);
      fit(dyn, size); face.ratio = pixelRatio(); face.dynKey = ''; face.cells = null; face.standard = null; face.painted = true;
      if (spec.nodes && !face.nodes) face.nodes = makeNetwork(pack.id + (face.rear ? ':r' : ''), spec.nodes);
      face.draw(true);
      return true;
    };
    face.draw = function (force) {
      if (face.dead) return false;
      if (!face.painted) return false;
      // Static and dynamic buffers must share the current quality/DPR budget.
      if (face.ratio !== pixelRatio()) return face.paint();
      var size = face.size, key;
      var ctx = dyn.getContext('2d');
      var t = face.t / 1000;
      var animated = !!(spec.nodes || spec.ambient);
      key = [face.chameleon.toFixed(3), face.grid.toFixed(3), face.wave.toFixed(2), face.network.toFixed(2), animated ? Math.floor(t * 30) : 0,
        face.charge.toFixed(3), face.arrive.toFixed(3),
        face.icons ? face.icons.map(function (i) { return i.u.toFixed(2); }).join() : '',
        face.cut ? [face.cut.min.toFixed(3), face.cut.max.toFixed(3), face.cut.tip.toFixed(3), face.cut.heat.toFixed(2), (face.cut.release || 0).toFixed(2)].join() : ''].join('|');
      if (!force && key === face.dynKey) return false;
      face.dynKey = key;
      var ratio = pixelRatio();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, size.w, size.h);
      if (spec.nodes && !face.rear) {
        drawRare(ctx, size, face, t, { grid: face.grid, wave: face.wave, network: face.network, cut: face.cut, icons: face.icons });
        if (face.chameleon < 1) {
          if (!face.standard) {
            var src = root.document.createElement('canvas'); src.width = size.w; src.height = size.h;
            var sctx = src.getContext('2d'); paintStandard(sctx, size.w, size.h, false, 'standard');
            face.standard = src; face.cells = makeCells(size, pack.id);
          }
          drawCover(ctx, size, face.cells, face.standard, face.chameleon);
        }
      } else if (spec.nodes && face.rear) {
        drawRare(ctx, size, face, t, { grid: face.grid, wave: face.wave, network: .8 });
      } else if (spec.draw) {
        spec.draw(ctx, size, face, t);
      }
      if (face.cut) (spec.cutDraw || drawCutDots)(ctx, size, face.cut, t, face.cutRgb || spec.cutRgb || '255,255,255', face);
      return true;
    };
    watch(face);
    return face;
  }

  C.packFaces = {
    define: define, spec: specOf, layout: LAYOUT, palette: PALETTE, registry: registry,
    has: function (pack) { return !!specOf(pack); },
    build: build,
    dispose: function (el) {
      if (el._packFace) el._packFace.destroy();
      el.querySelectorAll('.pack-face-root').forEach(function (wrapper) { if (wrapper._packFace) wrapper._packFace.destroy(); });
    },
    // Called when an element carries solid faces: repaint after a size or quality change.
    repaint: function (root$1) {
      root$1.querySelectorAll('.pack-face-root').forEach(function (w) { if (w._packFace) w._packFace.paint(); });
    },
    faces: function (el) {
      var out = []; el.querySelectorAll('.pack-face-root').forEach(function (w) { if (w._packFace) out.push(w._packFace); }); return out;
    },
    // Per-frame update for a unit: lights both faces from the pack's world rotation.
    update: function (unit, pose, flip, time, reduced) {
      var yaw = ((pose.ry || 0) + (flip || 0)) % 360;
      if (yaw > 180) yaw -= 360; if (yaw < -180) yaw += 360;
      var rearYaw = yaw > 0 ? yaw - 180 : yaw + 180, frontVisible = Math.abs(yaw) < 90, any = false;
      [[unit.faceFront, yaw], [unit.faceRear, rearYaw]].forEach(function (pair, index) {
        var el = pair[0]; if (!el) return;
        var local = pair[1], rx = pose.rx || 0;
        var sx = Math.sin(local * Math.PI / 180), cos = Math.cos(local * Math.PI / 180);
        var vars = {
          '--face-x': (Math.round((50 + clamp(sx * 78 + (pose.ry || 0) * 0 , -90, 90)) * 10) / 10).toFixed(1) + '%',
          '--face-y': (Math.round((42 - clamp(rx * 1.7, -34, 34)) * 10) / 10).toFixed(1) + '%',
          '--face-angle': (53 + local * .9 - rx * .8).toFixed(1) + 'deg',
          '--face-fresnel': (Math.round((1 - Math.abs(cos)) * 200) / 200).toFixed(3),
          '--face-sweep': (clamp(local / 70, -1.2, 1.2) * 70).toFixed(1) + '%',
          '--face-light': (Math.round(clamp(.3 + .7 * Math.max(0, cos) + (rx > 0 ? -rx : -rx) * .004, .12, 1) * 200) / 200).toFixed(3)
        };
        Object.keys(vars).forEach(function (key) { if (el._faceVars && el._faceVars[key] === vars[key]) return; (el._faceVars || (el._faceVars = {}))[key] = vars[key]; el.style.setProperty(key, vars[key]); });
        var visible = index === 0 ? frontVisible : !frontVisible;
        var visibility = visible ? 'true' : 'false';
        if (el.dataset.faceVisible !== visibility) el.dataset.faceVisible = visibility;
        var wrapper = el.querySelector('.pack-face-root'), face = wrapper && wrapper._packFace;
        if (face && visible) {
          // The constellation only drifts on tiers that allow ambient motion; otherwise it holds its last pose.
          var live = !reduced && C.settings.policy.animation >= 2;
          if (live) face.t = time;
          if (face.draw()) any = true;
          if ((face.spec.nodes || face.spec.ambient) && live) any = true;
        }
      });
      return any;
    },
    foil: function (el, fx) {
      // Opened wrapper: fx = { cut: {min,max,tip,heat,release}|null, grid, wave, chameleon, t }
      var root$ = el.querySelector('.pack-face-root'), face = root$ && root$._packFace;
      if (!face) return false;
      face.cut = fx.cut || null; face.cutRgb = fx.rgb || (face.spec.nodes ? '214,232,255' : '255,255,255');
      face.grid = fx.grid || 0; face.wave = fx.wave == null ? 1 : fx.wave; face.network = fx.network == null ? 0 : fx.network;
      face.chameleon = 1; face.t = fx.t || 0; face.icons = null;
      face.charge = fx.charge == null ? 0 : fx.charge; face.arrive = 1;
      return face.draw();
    },
    chameleon: function (el, p) {
      var changed = false;
      C.packFaces.faces(el).forEach(function (face) {
        if (face.rear || !face.spec.nodes) return;
        face.chameleon = clamp(p, 0, 1);
        changed = face.draw() || changed;
      });
      return changed;
    },
    charge: function (el, fill, time) {
      var changed = false;
      C.packFaces.faces(el).forEach(function (face) {
        if (face.rear) return;
        if (!face.spec.nodes) { face.charge = clamp(fill, 0, 1); face.t = time; changed = face.draw() || changed; return; }
        face.charge = clamp(fill, 0, 1);
        if (!face.icons) {
          var layer = face.wrapper.parentNode && face.wrapper.parentNode.querySelector('.pack-print--face');
          face.icons = []; var windows = { wordmark: [.1, .56], series: [.3, .78], rare: [.46, .94] };
          if (layer) layer.querySelectorAll('[data-pack-text]').forEach(function (m) {
            var win = windows[m.dataset.packText] || [.2, .8];
            face.icons.push({ el: m, a: win[0], b: win[1], u: 0, rect: { x: m.offsetLeft, y: m.offsetTop, w: m.offsetWidth, h: m.offsetHeight } });
          });
        }
        face.icons.forEach(function (icon) {
          icon.u = clamp((fill - icon.a) / (icon.b - icon.a), 0, 1);
          // The printed mark itself dissolves to the middle of its window and comes back whole.
          var v = fill >= 1 || icon.u <= 0 ? 1 : Math.abs(1 - 2 * icon.u);
          C.packTransitions.dither(icon.el, v);
        });
        face.grid = clamp(fill, 0, 1); face.t = time; changed = face.draw() || changed;
      });
      return changed;
    },
    reset: function (el) {
      C.packFaces.faces(el).forEach(function (face) {
        if (face.icons) face.icons.forEach(function (icon) { C.packTransitions.dither(icon.el, 1); });
        face.icons = null; face.grid = 0; face.cut = null; face.chameleon = 1; face.wave = 1; face.charge = 0; face.arrive = 1; face.last = null; face.store = {}; face.draw(true);
      });
    }
  };

  define('standard', {
    paint: paintStandard, nodes: 0,
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName);
      mark.dataset.packText = 'wordmark';
      if (rear) {
        node('div', 'pack-rear-title', layer, 'Standard pack');
        var copy = node('div', 'pack-rear-copy', layer);
        ['One card per pack', 'Hold to open'].forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, (pack.design.batch || 'CB / 00018472'));
      }
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
    }
  });
  define('rare', {
    paint: paintRare, nodes: 26,
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName);
      mark.dataset.packText = 'wordmark';
      if (rear) {
        node('div', 'pack-rear-title', layer, 'Rare pack');
        var copy = node('div', 'pack-rear-copy', layer);
        ['Rare or better', 'Every fourth pack'].forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, (pack.design.batch || 'R+ / CB / 00018472'));
      }
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
      node('div', 'pack-rare-mark', layer, 'R+').dataset.packText = 'rare';
    }
  });
  C.packFaces.makeNetwork = makeNetwork;

  // Flat snapshots for the Studio prop and the pixel-transition source: the printed front, painted directly.
  function snapshotOf(painter) {
    return function (g, w, h, pack) {
      painter(g, w, h, false, pack.id);
      var size = w * .074;
      g.save(); g.fillStyle = '#f5f5f7'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = '600 ' + size + 'px Inter, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = size * .3 + 'px';
      g.fillText(C.config.gameName, w * .09, h * .122 + size * .78);
      var small = w * .03; g.font = '500 ' + small + 'px "JetBrains Mono", monospace'; if ('letterSpacing' in g) g.letterSpacing = small * .26 + 'px';
      g.fillStyle = 'rgba(245,245,247,.82)'; g.fillText('SERIES ' + (pack.design.series || '01'), w * .09, h * .905);
      g.restore();
    };
  }
  if (C.packSkins && C.packSkins.registry) {
    if (C.packSkins.registry.standard) C.packSkins.registry.standard.snapshot = snapshotOf(paintStandard);
    if (C.packSkins.registry.rare) C.packSkins.registry.rare.snapshot = snapshotOf(paintRare);
  }

  // Generic arrival for designed packs: the face redraws itself from 0 to 1 (spec.draw reads face.arrive)
  // while its printed text fades in behind it. Used by every brand pack for its startup.
  C.packFaces.arrivals = C.packFaces.arrivals || {};
  C.packFaces.arrive = function (el, p) {
    var changed = false;
    C.packFaces.faces(el).forEach(function (face) {
      if (face.rear) return;
      face.arrive = clamp(p, 0, 1); changed = face.draw() || changed;
    });
    return changed;
  };
  C.packFaces.defineArrival = function (id, opts) {
    C.packFaces.arrivals[id] = opts;
    if (!C.packTransitions) return;
    C.packTransitions.register(id, function (host, sourcePack, targetEl, adopt, options) {
      var rank = C.settings.policy.animation, still = C.motion.reduced || rank === 0;
      var arriveMs = options.incomingAlready ? (opts.fadeMs || 420) : 0, hold = options.delay != null ? options.delay : (opts.holdMs || 240);
      var run = still ? 360 : rank === 1 ? opts.ms * .5 : opts.ms, age = 0, done = false, adopted = false, last = -1;
      function ease(v) { v = clamp(v, 0, 1); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
      function paint(p) {
        targetEl.style.setProperty('--arrive', p.toFixed(3));
        targetEl.style.setProperty('--arrive-text', smooth(.55, 1, p).toFixed(3));
        C.packFaces.arrive(targetEl, p);
      }
      function finish() {
        done = true; targetEl.style.opacity = ''; targetEl.style.removeProperty('--arrive'); targetEl.style.removeProperty('--arrive-text');
        C.packFaces.arrive(targetEl, 1);
      }
      if (!adopted) { adopted = true; adopt(); paint(0); }
      if (options.incomingAlready) targetEl.style.opacity = 0;
      return {
        duration: arriveMs + hold + run,
        update: function (dt) {
          if (done) return false;
          age += dt;
          if (arriveMs && age < arriveMs) { targetEl.style.opacity = ease(age / arriveMs); return true; }
          if (arriveMs) targetEl.style.opacity = 1;
          var q = clamp((age - arriveMs - hold) / run, 0, 1), e = still ? q : q;
          if (Math.abs(e - last) > .0025) { last = e; paint(e); }
          if (q >= 1) { finish(); return false; }
          return true;
        },
        destroy: function () { if (!done) finish(); }
      };
    });
  };
  C.packFaces.kit = {
    clamp: clamp, smooth: smooth, mix: mix, rng: rng, seedOf: seedOf, node: node, TAU: TAU, LAYOUT: LAYOUT,
    dotField: dotField, crimpBands: crimpBands, folds: folds, grain: grain, perforation: perforation,
    barcode: barcode, body: body, finSeal: finSeal, drawCutDots: drawCutDots, pixelRatio: pixelRatio
  };

  // The Rare pack's arrival: it comes up as an ordinary black pack and changes colour like a
  // chameleon: scales flush teal, then settle sapphire, spreading from one patch of skin.
  C.packFaces.arrivals.chameleon = { ms: 2100 };
  if (C.packTransitions) C.packTransitions.register('chameleon', function (host, sourcePack, targetEl, adopt, options) {
    var rank = C.settings.policy.animation, still = C.motion.reduced || rank === 0;
    var arrive = options.incomingAlready ? 520 : 0, hold = options.delay != null ? options.delay : 420;
    var wave = still ? 360 : rank === 1 ? 900 : 2100, age = 0, done = false, adopted = false, last = -1;
    function ease(v) { v = clamp(v, 0, 1); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
    function finish() {
      done = true; targetEl.style.opacity = ''; targetEl.style.removeProperty('--chameleon');
      C.packFaces.chameleon(targetEl, 1);
    }
    function begin() {
      if (adopted) return; adopted = true; adopt();
      targetEl.style.setProperty('--chameleon', 0); C.packFaces.chameleon(targetEl, 0);
    }
    begin();
    if (options.incomingAlready) targetEl.style.opacity = 0;
    return {
      duration: arrive + hold + wave,
      update: function (dt) {
        if (done) return false;
        age += dt;
        if (arrive && age < arrive) { targetEl.style.opacity = ease(age / arrive); return true; }
        if (arrive) targetEl.style.opacity = 1;
        var q = clamp((age - arrive - hold) / wave, 0, 1), e = still ? q : ease(q);
        if (Math.abs(e - last) > .002) {
          last = e; targetEl.style.setProperty('--chameleon', e.toFixed(3)); C.packFaces.chameleon(targetEl, e);
        }
        if (q >= 1) { finish(); return false; }
        return true;
      },
      destroy: function () { if (!done) finish(); }
    };
  });
})(window.Cardable, window);
