/* Designed faces for the Classic and Royal packs (pack remake, milestone C).
 * Classic is a beige tower-case front in the manner of an FLP03: bay vents, drive slot,
 * control strip with a power rocker, key lock and a two-digit display, and a long intake grille.
 * Royal is a crimson lacquered sleeve under a gold-and-glass coat that breathes every two seconds. */
(function (C, root) {
  'use strict';
  if (!C.packFaces) return;
  var K = C.packFaces.kit, clamp = K.clamp, smooth = K.smooth, mix = K.mix, TAU = K.TAU, node = K.node;
  var define = C.packFaces.define;

  function hash2(a, b, seed) {
    var h = Math.imul(a * 374761393 + b * 668265263 + (seed || 0) * 2246822519, 3266489917) >>> 0;
    h = (h ^ h >>> 15) >>> 0; return h / 4294967296;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function bevel(ctx, x, y, w, h, lit, shade, width) {
    ctx.lineWidth = width || 1;
    ctx.strokeStyle = lit; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
    ctx.strokeStyle = shade; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.stroke();
  }
  var CHAMFER = [[1.6, 0], [98.4, 0], [100, 1.1], [100, 98.9], [98.4, 100], [1.6, 100], [0, 98.9], [0, 1.1]];

  // ------------------------------------------------------------------ Classic
  var CL = { beige: '#d8d3c0', light: '#f0ecdd', mid: '#c6c0aa', dark: '#a69e86', deep: '#7c755f', slot: '#24231d', red: '#d3281a', amber: '#ffb000', green: '#5cc03e' };
  function classicBody(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#bfb9a3'); g.addColorStop(.06, '#d4cfbb'); g.addColorStop(.5, '#e4dfcd'); g.addColorStop(.94, '#d0cab6'); g.addColorStop(1, '#b3ad97');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,255,255,.18)'); v.addColorStop(.5, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(70,60,40,.2)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  function screw(ctx, x, y, r, angle) {
    var g = ctx.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r);
    g.addColorStop(0, '#f2f0e8'); g.addColorStop(1, '#8e8b7d');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,58,48,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#4a4a3f'; ctx.lineWidth = Math.max(1, r * .28);
    ctx.beginPath(); ctx.moveTo(x - Math.cos(angle) * r * .7, y - Math.sin(angle) * r * .7); ctx.lineTo(x + Math.cos(angle) * r * .7, y + Math.sin(angle) * r * .7); ctx.stroke();
  }
  function paintClassic(ctx, w, h, rear, id) {
    classicBody(ctx, w, h);
    var seed = K.seedOf(id);
    // Moulded edge: light top and left, shade bottom and right.
    bevel(ctx, 1.5, 1.5, w - 3, h - 3, 'rgba(255,255,255,.85)', 'rgba(70,60,40,.45)', 1.5);
    bevel(ctx, w * .035, h * .026, w * .93, h * .948, 'rgba(70,60,40,.22)', 'rgba(255,255,255,.55)', 1);
    [[.05, .028], [.95, .028], [.05, .972], [.95, .972]].forEach(function (s, i) { screw(ctx, w * s[0], h * s[1], w * .017, i * 1.1 + .4); });
    if (!rear) {
      // Two bay vents of horizontal louvres.
      for (var bay = 0; bay < 2; bay++) {
        var by = h * (.062 + bay * .08), bh = h * .066, bx = w * .08, bw = w * .84;
        ctx.fillStyle = CL.dark; ctx.fillRect(bx, by, bw, bh);
        bevel(ctx, bx, by, bw, bh, 'rgba(70,60,40,.55)', 'rgba(255,255,255,.7)', 1.2);
        for (var s = 0; s < 8; s++) {
          var sy = by + bh * .1 + s * (bh * .8 / 8);
          ctx.fillStyle = CL.slot; ctx.fillRect(bx + bw * .03, sy, bw * .94, bh * .055);
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + bw * .03, sy + bh * .055, bw * .94, 1);
        }
      }
      // Drive bezel with slot and release lever.
      var dx = w * .08, dy = h * .225, dw = w * .84, dh = h * .092;
      ctx.fillStyle = CL.mid; ctx.fillRect(dx, dy, dw, dh); bevel(ctx, dx, dy, dw, dh, 'rgba(70,60,40,.5)', 'rgba(255,255,255,.8)', 1.4);
      ctx.fillStyle = CL.slot; ctx.fillRect(dx + dw * .06, dy + dh * .6, dw * .66, dh * .1);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(dx + dw * .06, dy + dh * .7, dw * .66, 1.2);
      var lx = dx + dw * .76, ly = dy + dh * .44, lw = dw * .17, lh = dh * .36;
      ctx.fillStyle = CL.light; ctx.fillRect(lx, ly, lw, lh); bevel(ctx, lx, ly, lw, lh, 'rgba(255,255,255,.9)', 'rgba(70,60,40,.55)', 1);
      ctx.strokeStyle = 'rgba(70,60,40,.4)'; for (var g = 1; g < 6; g++) { ctx.beginPath(); ctx.moveTo(lx + lw * g / 6, ly + lh * .15); ctx.lineTo(lx + lw * g / 6, ly + lh * .85); ctx.stroke(); }
      // Control strip.
      var cx = w * .08, cy = h * .335, cw = w * .84, ch = h * .092;
      ctx.fillStyle = '#cdc7b1'; ctx.fillRect(cx, cy, cw, ch); bevel(ctx, cx, cy, cw, ch, 'rgba(70,60,40,.5)', 'rgba(255,255,255,.8)', 1.4);
      // Power rocker.
      var rx = w * .115, ry = cy + ch * .2, rw = w * .115, rh = ch * .6;
      var rg = ctx.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, '#e2543d'); rg.addColorStop(1, '#8e1d12');
      ctx.fillStyle = rg; roundRect(ctx, rx, ry, rw, rh, 2); ctx.fill(); bevel(ctx, rx, ry, rw, rh, 'rgba(255,200,190,.8)', 'rgba(60,10,5,.7)', 1.2);
      // Key lock.
      var kx = w * .325, ky = cy + ch * .5, kr = w * .036;
      var kg = ctx.createRadialGradient(kx - kr * .3, ky - kr * .3, 0, kx, ky, kr);
      kg.addColorStop(0, '#fafaf4'); kg.addColorStop(.6, '#b9b9ae'); kg.addColorStop(1, '#6f7068');
      ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,32,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#2a2a24'; ctx.fillRect(kx - kr * .13, ky - kr * .55, kr * .26, kr * 1.1);
      // Round buttons.
      [[.47, 'RESET'], [.57, 'TURBO']].forEach(function (b) {
        var bx = w * b[0], br = w * .027, bg = ctx.createRadialGradient(bx - br * .3, ky - br * .3, 0, bx, ky, br);
        bg.addColorStop(0, '#fffdf0'); bg.addColorStop(1, '#bcb496');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, ky, br, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(70,60,40,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // Display window (digits are drawn live).
      var wx = w * .67, wy = cy + ch * .16, ww = w * .23, wh = ch * .68;
      ctx.fillStyle = '#17100d'; ctx.fillRect(wx, wy, ww, wh); bevel(ctx, wx, wy, ww, wh, 'rgba(0,0,0,.7)', 'rgba(255,255,255,.7)', 1.5);
      // Intake grille with two reinforcing ribs.
      var gx = w * .08, gy = h * .455, gw = w * .84, gh = h * .43;
      ctx.fillStyle = CL.deep; ctx.fillRect(gx, gy, gw, gh); bevel(ctx, gx, gy, gw, gh, 'rgba(40,36,26,.7)', 'rgba(255,255,255,.75)', 1.6);
      var slats = 28, pitch = (gw - 8) / slats;
      for (var k = 0; k < slats; k++) {
        var sx = gx + 4 + k * pitch, sg = ctx.createLinearGradient(sx, 0, sx + pitch, 0);
        sg.addColorStop(0, '#f5f1e2'); sg.addColorStop(.35, '#dcd6c3'); sg.addColorStop(1, '#a29a82');
        ctx.fillStyle = sg; ctx.fillRect(sx, gy + 4, pitch * .62, gh - 8);
        ctx.fillStyle = CL.slot; ctx.fillRect(sx + pitch * .62, gy + 4, pitch * .38, gh - 8);
      }
      [.33, .66].forEach(function (f) {
        var ry2 = gy + gh * f; ctx.fillStyle = CL.beige; ctx.fillRect(gx + 2, ry2, gw - 4, gh * .028);
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(gx + 2, ry2, gw - 4, 1); ctx.fillStyle = 'rgba(70,60,40,.5)'; ctx.fillRect(gx + 2, ry2 + gh * .028, gw - 4, 1);
      });
      // Maker's badge.
      var bx2 = w * .1, by2 = h * .9;
      ctx.fillStyle = '#eef2f8'; ctx.fillRect(bx2, by2, w * .07, h * .034); ctx.fillStyle = '#3a6bb5'; ctx.fillRect(bx2 + w * .006, by2 + h * .004, w * .028, h * .026);
      ctx.fillStyle = '#b8c8e6'; ctx.fillRect(bx2 + w * .038, by2 + h * .008, w * .024, h * .004); ctx.fillRect(bx2 + w * .038, by2 + h * .016, w * .024, h * .004);
    } else {
      // The back of the case: fan guard, port row, expansion brackets and a serial label.
      var fx = w * .66, fy = h * .27, fr = w * .17;
      ctx.fillStyle = CL.slot; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.fill();
      ctx.strokeStyle = CL.light; ctx.lineWidth = Math.max(1, w * .006);
      for (var r = 1; r <= 5; r++) { ctx.beginPath(); ctx.arc(fx, fy, fr * r / 5.2, 0, TAU); ctx.stroke(); }
      for (var sp = 0; sp < 8; sp++) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(sp * TAU / 8) * fr, fy + Math.sin(sp * TAU / 8) * fr); ctx.stroke(); }
      ctx.fillStyle = CL.light; ctx.beginPath(); ctx.arc(fx, fy, fr * .14, 0, TAU); ctx.fill();
      ctx.fillStyle = CL.dark; ctx.fillRect(w * .1, h * .25, w * .3, h * .06); bevel(ctx, w * .1, h * .25, w * .3, h * .06, 'rgba(70,60,40,.5)', 'rgba(255,255,255,.7)', 1);
      for (var v2 = 0; v2 < 6; v2++) { ctx.fillStyle = CL.slot; ctx.fillRect(w * .12 + v2 * w * .045, h * .262, w * .02, h * .036); }
      // DB-25 and DB-9 connectors and a round keyboard port.
      function db(x, y, bw, bh, pins, col) {
        ctx.fillStyle = '#8f8f88'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw * .96, y + bh); ctx.lineTo(x + bw * .04, y + bh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2a2a26'; ctx.fillRect(x + bw * .12, y + bh * .3, bw * .76, bh * .4);
        ctx.fillStyle = col || '#c9a24a'; for (var q = 0; q < pins; q++) ctx.fillRect(x + bw * .16 + q * (bw * .68 / pins), y + bh * .42, Math.max(1, bw * .02), bh * .16);
      }
      db(w * .1, h * .46, w * .42, h * .034, 25); db(w * .58, h * .46, w * .28, h * .034, 9); db(w * .1, h * .52, w * .28, h * .034, 9);
      ctx.fillStyle = '#2a2a26'; ctx.beginPath(); ctx.arc(w * .55, h * .537, w * .028, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8f8f88'; ctx.stroke();
      ctx.fillStyle = '#26251f'; ctx.fillRect(w * .66, h * .52, w * .2, h * .042); ctx.fillStyle = '#d8d3c0'; ctx.fillRect(w * .675, h * .527, w * .17, h * .028);
      // Five expansion brackets.
      for (var e = 0; e < 5; e++) {
        var ex = w * .1 + e * w * .17, ey = h * .6;
        ctx.fillStyle = '#b9b9b0'; ctx.fillRect(ex, ey, w * .13, h * .24); bevel(ctx, ex, ey, w * .13, h * .24, 'rgba(255,255,255,.8)', 'rgba(60,60,50,.6)', 1);
        ctx.fillStyle = CL.slot; ctx.fillRect(ex + w * .03, ey + h * .03, w * .07, h * .05);
        screw(ctx, ex + w * .065, ey + h * .015, w * .011, e * .6);
      }
      // Serial label with a barcode.
      var lx2 = w * .52, ly2 = h * .87; ctx.fillStyle = '#f4f1e4'; ctx.fillRect(lx2, ly2, w * .38, h * .075);
      ctx.strokeStyle = 'rgba(70,60,40,.45)'; ctx.strokeRect(lx2, ly2, w * .38, h * .075);
      K.barcode(ctx, lx2 + w * .02, ly2 + h * .012, w * .34, h * .03, K.seedOf(id + ':bar'), '40,38,30');
    }
    K.grain(ctx, w, h, .045, seed + (rear ? 1 : 2));
  }

  var DIGIT = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  function sevenSeg(ctx, x, y, w, h, mask, on, off) {
    var t = Math.max(1.4, w * .22), half = (h - t) / 2, len = w;
    function horiz(px, py) {
      ctx.beginPath(); ctx.moveTo(px + t * .5, py); ctx.lineTo(px + len - t * .5, py); ctx.lineTo(px + len, py + t * .5);
      ctx.lineTo(px + len - t * .5, py + t); ctx.lineTo(px + t * .5, py + t); ctx.lineTo(px, py + t * .5); ctx.closePath(); ctx.fill();
    }
    function vert(px, py) {
      ctx.beginPath(); ctx.moveTo(px + t * .5, py); ctx.lineTo(px + t, py + t * .5); ctx.lineTo(px + t, py + half - t * .5);
      ctx.lineTo(px + t * .5, py + half); ctx.lineTo(px, py + half - t * .5); ctx.lineTo(px, py + t * .5); ctx.closePath(); ctx.fill();
    }
    var layout = { a: [0, 0, 'h'], g: [0, half, 'h'], d: [0, half * 2, 'h'], f: [0, t * .5, 'v'], b: [w - t, t * .5, 'v'], e: [0, half + t * .5, 'v'], c: [w - t, half + t * .5, 'v'] };
    'abcdefg'.split('').forEach(function (s) {
      ctx.fillStyle = mask.indexOf(s) !== -1 ? on : off;
      var l = layout[s]; if (l[2] === 'h') horiz(x + l[0], y + l[1]); else vert(x + l[0], y + l[1]);
    });
  }
  function display(ctx, w, h, value, lit, blink) {
    var cy = h * .335, ch = h * .092, wx = w * .67, wy = cy + ch * .16, ww = w * .23, wh = ch * .68;
    var dw = ww * .34, dh = wh * .72, gap = ww * .1, x0 = wx + ww * .12, y0 = wy + wh * .14;
    var str = value == null ? '88' : String(value).padStart(2, '0');
    for (var i = 0; i < 2; i++) {
      var mask = DIGIT[Number(str[i])] || '';
      sevenSeg(ctx, x0 + i * (dw + gap), y0, dw, dh, lit ? mask : 'abcdefg', lit ? '#ff3d2a' : 'rgba(255,60,40,.07)', 'rgba(255,60,40,.08)');
    }
    if (lit) {
      var gl = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh); gl.addColorStop(0, 'rgba(255,255,255,.14)'); gl.addColorStop(.4, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(wx, wy, ww, wh);
    }
  }
  function led(ctx, x, y, r, color, on, glow) {
    ctx.fillStyle = on ? color : 'rgba(60,40,30,.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (on) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.2); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.2, 0, TAU); ctx.fill();
    }
  }
  function keyBow(ctx, x, y, size, angle, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(30,25,10,.5)'; ctx.shadowBlur = size * .5; ctx.shadowOffsetY = size * .18;
    var g = ctx.createLinearGradient(-size, -size, size, size); g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#d9ac3d'); g.addColorStop(1, '#8a6218');
    ctx.fillStyle = g; roundRect(ctx, -size * .95, -size * .58, size * 1.9, size * 1.16, size * .5); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(70,45,5,.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(40,30,10,.6)'; ctx.beginPath(); ctx.arc(-size * .45, 0, size * .2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-size * .6, -size * .46, size * 1.3, size * .1);
    ctx.restore();
  }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }

  function coverFor(size, face) {
    // The ordinary Standard pack, drawn once at this size: what the Classic arrives disguised as.
    var key = size.w + 'x' + size.h;
    if (face.store.coverKey === key && face.store.cover) return face.store.cover;
    var spec = C.packFaces.registry.standard, canvas = root.document.createElement('canvas');
    canvas.width = size.w; canvas.height = size.h;
    var ctx = canvas.getContext('2d'); if (spec) spec.paint(ctx, size.w, size.h, false, 'standard');
    // Wordmark and series, so the disguise reads as the pack it imitates.
    var s = size.w * .074; ctx.fillStyle = '#f5f5f7'; ctx.font = '600 ' + s + 'px Inter, sans-serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = s * .3 + 'px';
    ctx.fillText(C.config.gameName, size.w * .09, size.h * .122 + s * .78);
    var m = size.w * .03; ctx.font = '500 ' + m + 'px "JetBrains Mono", monospace'; if ('letterSpacing' in ctx) ctx.letterSpacing = m * .26 + 'px';
    ctx.fillStyle = 'rgba(245,245,247,.82)'; ctx.fillText('SERIES 01', size.w * .09, size.h * .905);
    face.store.cover = canvas; face.store.coverKey = key; return canvas;
  }
  function pixelAway(ctx, size, face, p) {
    var w = size.w, h = size.h, src = coverFor(size, face), cols = 10, cell = w / cols, rows = Math.ceil(h / cell);
    var tiny = face.store.tiny || (face.store.tiny = root.document.createElement('canvas'));
    var a = clamp(p / .3, 0, 1), block = a < 1 ? Math.max(1, Math.round(mix(1, cell, a * a))) : cell;
    tiny.width = Math.max(1, Math.ceil(w / block)); tiny.height = Math.max(1, Math.ceil(h / block));
    var t = tiny.getContext('2d'); t.imageSmoothingEnabled = false; t.clearRect(0, 0, tiny.width, tiny.height); t.drawImage(src, 0, 0, tiny.width, tiny.height);
    ctx.imageSmoothingEnabled = false;
    if (p < .3) { ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, 0, 0, tiny.width * block, tiny.height * block); return; }
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var delay = hash2(i, j, 5) * .55, local = clamp((p - .3 - delay * .45) / .4, 0, 1);
      if (local >= 1) continue;
      var dx = i * cell, dy = j * cell, drift = (hash2(i, j, 9) - .3) * w * .9, spin = (hash2(i, j, 13) - .5) * 2.2, lift = local * local * h * .9 + local * 14;
      var sx = i * (tiny.width / cols), sy = j * (tiny.height / rows);
      ctx.save(); ctx.globalAlpha = 1 - local * local; ctx.translate(dx + cell / 2 + drift * local, dy + cell / 2 - lift); ctx.rotate(spin * local);
      var sc = 1 - local * .35;
      ctx.drawImage(tiny, sx, sy, tiny.width / cols, tiny.height / rows, -cell / 2 * sc, -cell / 2 * sc, cell * sc, cell * sc);
      ctx.restore();
    }
  }
  function drawClassic(ctx, size, face, t) {
    var w = size.w, h = size.h, charge = face.charge, arrive = face.arrive;
    if (face.rear) return;
    var cy = h * .335, ch = h * .092, kx = w * .325, ky = cy + ch * .5, store = face.store;
    // Key: arrives from the lower right, seats, then turns the machine on.
    var ins = ease(charge / .26), turn = ease((charge - .26) / .2), on = charge > .46, boot = clamp((charge - .46) / .54, 0, 1);
    if (charge > 0) {
      var kk = w * .034, fromX = kx + w * .26, fromY = ky + h * .12;
      var kx0 = mix(fromX, kx, ins), ky0 = mix(fromY, ky, ins) - Math.sin(ins * Math.PI) * h * .02;
      var scale = mix(1.7, 1, ins), ang = mix(-.5, 0, ins) + turn * Math.PI / 2;
      keyBow(ctx, kx0 + (1 - ins) * 0, ky0, kk * scale, ang, charge > .995 ? 1 : 1);
    }
    // Power state: rocker glows, LEDs blink, display counts.
    var rx = w * .115 + w * .0575, ry = cy + ch * .5;
    if (on) {
      var rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, w * .09);
      rg.addColorStop(0, 'rgba(255,90,60,' + (.35 + .15 * Math.sin(t * 5)).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(rx, ry, w * .09, 0, TAU); ctx.fill();
    }
    var value = !on ? null : boot >= 1 ? 88 : Math.min(99, Math.floor(boot * 100));
    var blinkOn = Math.floor(t * 2.4) % 2 === 0;
    if (arrive < 1) {
      // Arrival: still in disguise, displays dark.
      display(ctx, w, h, null, false);
    } else if (charge === 0) {
      display(ctx, w, h, 88, false);
    } else {
      display(ctx, w, h, value, on);
    }
    // Indicator LEDs beside the display.
    var lx = w * .685, ly = cy + ch * .9;
    var hdd = on && hash2(Math.floor(t * 13), 3, 7) > .55;
    led(ctx, lx, ly, w * .0075, '#6ee04b', hdd || (arrive >= 1 && charge === 0 && hash2(Math.floor(t * 1.7), 1, 4) > .86), 'rgba(110,224,75,.5)');
    led(ctx, lx + w * .04, ly, w * .0075, '#ffb000', charge > .72, 'rgba(255,176,0,.55)');
    led(ctx, lx + w * .08, ly, w * .0075, '#ff3322', on && (boot >= 1 ? blinkOn : true), 'rgba(255,50,34,.55)');
    if (arrive < 1) pixelAway(ctx, size, face, arrive);
  }
  define('classic', {
    paint: paintClassic, ambient: true, nodes: 0, draw: drawClassic, cutRgb: '255,176,0', outline: CHAMFER,
    foil: function (fx) { fx.charge = 1; },
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName); mark.dataset.packText = 'wordmark';
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
      if (!rear) {
        ['PWR', 'LOCK', 'RESET', 'TURBO'].forEach(function (label, i) {
          var el = node('span', 'classic-silk classic-silk--' + i, layer, label); el.setAttribute('aria-hidden', 'true');
        });
        var tab = node('div', 'classic-pull-tab', layer);
        node('span', 'classic-pull-tab__arrow', tab, '↑'); node('span', '', tab, 'PULL'); node('i', 'classic-perforation', tab);
        tab.setAttribute('data-hint', 'Pull the seal');
      } else {
        node('div', 'pack-rear-title', layer, pack.name);
        var copy = node('div', 'pack-rear-copy', layer);
        [pack.tagline || '', 'One card per pack'].filter(Boolean).forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, pack.design.batch || '');
      }
    }
  });
  C.packFaces.defineArrival('pixelAway', { ms: 3200, holdMs: 700, fadeMs: 420 });

  // ------------------------------------------------------------------ Royal
  var RY = { gold: '#e5c56a', pale: '#fff1b8', deep: '#8c5a1c', red: '#7a0f20', dark: '#25030a' };
  function goldGradient(ctx, x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#fff4c6'); g.addColorStop(.28, '#e8c768'); g.addColorStop(.52, '#9a6a24'); g.addColorStop(.74, '#f2d27c'); g.addColorStop(1, '#7c531b');
    return g;
  }
  function paintRoyal(ctx, w, h, rear, id) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6b0c1c'); g.addColorStop(.5, '#42060f'); g.addColorStop(1, '#210309');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var vig = ctx.createLinearGradient(0, 0, w, 0);
    vig.addColorStop(0, 'rgba(0,0,0,.55)'); vig.addColorStop(.12, 'rgba(0,0,0,0)'); vig.addColorStop(.5, 'rgba(255,120,120,.07)'); vig.addColorStop(.88, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
    // Damask lattice: faint gold diamonds with a bud at each crossing.
    ctx.strokeStyle = 'rgba(229,197,106,.09)'; ctx.lineWidth = 1; var step = w * .13;
    for (var i = -h; i < w + h; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(229,197,106,.12)';
    for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step * 2) { ctx.beginPath(); ctx.arc(x + ((y / step) % 2 ? step : 0), y, w * .006, 0, TAU); ctx.fill(); }
    // Gold frame with corner ornaments.
    var m = w * .045;
    ctx.strokeStyle = goldGradient(ctx, 0, 0, w, h); ctx.lineWidth = Math.max(1.6, w * .007); ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
    ctx.lineWidth = Math.max(1, w * .003); ctx.strokeRect(m * 1.6, m * 1.6, w - 3.2 * m, h - 3.2 * m);
    [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(function (c) {
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(c[2], c[3]);
      ctx.fillStyle = goldGradient(ctx, 0, 0, w * .1, w * .1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * .09, 0); ctx.lineTo(w * .09, w * .014); ctx.lineTo(w * .014, w * .014); ctx.lineTo(w * .014, w * .09); ctx.lineTo(0, w * .09); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w * .045, w * .045); ctx.lineTo(w * .06, w * .06); ctx.lineTo(w * .045, w * .075); ctx.lineTo(w * .03, w * .06); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // Caps: engraved gold bars top and bottom.
    [0, h - h * .035].forEach(function (y0) {
      ctx.fillStyle = goldGradient(ctx, 0, y0, 0, y0 + h * .035); ctx.fillRect(0, y0, w, h * .035);
      ctx.fillStyle = 'rgba(60,30,0,.5)'; ctx.fillRect(0, y0 + (y0 ? 0 : h * .035 - 1), w, 1);
    });
    if (!rear) {
      // Medallion behind the crown.
      var cx = w / 2, cy = h * .37, r = w * .27;
      var md = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); md.addColorStop(0, '#8e1426'); md.addColorStop(.7, '#5a0a17'); md.addColorStop(1, '#2d050c');
      ctx.fillStyle = md; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r); ctx.lineWidth = Math.max(1.5, w * .006); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * .88, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(229,197,106,.22)';
      for (var k = 0; k < 24; k++) { var a = k * TAU / 24; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * .5, cy + Math.sin(a) * r * .5); ctx.lineTo(cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .86); ctx.stroke(); }
      // Runner carpet rising to the medallion, fringed at the foot.
      var rw = w * .2, rt = h * .62, rb = h * .915;
      var cg = ctx.createLinearGradient(0, rt, 0, rb); cg.addColorStop(0, '#6e0a19'); cg.addColorStop(1, '#a3162d');
      ctx.fillStyle = cg; ctx.fillRect(cx - rw / 2, rt, rw, rb - rt);
      ctx.fillStyle = goldGradient(ctx, 0, rt, 0, rb); ctx.fillRect(cx - rw / 2, rt, w * .012, rb - rt); ctx.fillRect(cx + rw / 2 - w * .012, rt, w * .012, rb - rt);
      ctx.strokeStyle = 'rgba(229,197,106,.35)'; ctx.lineWidth = 1;
      for (var d = 0; d < 7; d++) { var yy = rt + (rb - rt) * (d + .5) / 7; ctx.beginPath(); ctx.moveTo(cx - rw * .32, yy); ctx.lineTo(cx, yy - h * .008); ctx.lineTo(cx + rw * .32, yy); ctx.stroke(); }
      ctx.strokeStyle = RY.gold; ctx.lineWidth = Math.max(1, w * .004);
      for (var f = 0; f < 11; f++) { var fx = cx - rw / 2 + (f + .5) * rw / 11; ctx.beginPath(); ctx.moveTo(fx, rb); ctx.lineTo(fx, rb + h * .014); ctx.stroke(); }
    } else {
      // Back: a wax seal on a gold ribbon.
      var rx = w * .455, rwid = w * .09;
      ctx.fillStyle = goldGradient(ctx, rx, 0, rx + rwid, 0); ctx.fillRect(rx, h * .035, rwid, h * .93);
      ctx.fillStyle = 'rgba(60,30,0,.35)'; ctx.fillRect(rx, h * .035, 1, h * .93); ctx.fillRect(rx + rwid - 1, h * .035, 1, h * .93);
      var sx = w / 2, sy = h * .42, sr = w * .115;
      var wax = ctx.createRadialGradient(sx - sr * .3, sy - sr * .3, 0, sx, sy, sr); wax.addColorStop(0, '#d63a4d'); wax.addColorStop(1, '#6a0a18');
      ctx.fillStyle = wax; ctx.beginPath(); for (var p = 0; p < 18; p++) { var rr = sr * (p % 2 ? .93 : 1.02), aa = p * TAU / 18; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,170,.55)'; ctx.lineWidth = Math.max(1, w * .004); ctx.beginPath(); ctx.arc(sx, sy, sr * .66, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,170,.5)'; ctx.beginPath(); ctx.moveTo(sx - sr * .4, sy + sr * .22); ctx.lineTo(sx - sr * .4, sy - sr * .2); ctx.lineTo(sx - sr * .2, sy); ctx.lineTo(sx, sy - sr * .28); ctx.lineTo(sx + sr * .2, sy); ctx.lineTo(sx + sr * .4, sy - sr * .2); ctx.lineTo(sx + sr * .4, sy + sr * .22); ctx.closePath(); ctx.stroke();
      K.barcode(ctx, w * .56, h * .79, w * .32, h * .042, K.seedOf(id + ':bar'), '244,225,170');
    }
    K.grain(ctx, w, h, .03, K.seedOf(id + (rear ? 'r' : 'f')));
  }
  function royalLattice(face, size) {
    if (face.store.tris && face.store.trisKey === size.w) return face.store.tris;
    var cols = 5, rows = 7, random = K.rng(K.seedOf('royal-coat')), pts = [], tris = [];
    for (var y = 0; y <= rows; y++) for (var x = 0; x <= cols; x++) {
      var jx = x && x < cols ? (random() - .5) * .5 : 0, jy = y && y < rows ? (random() - .5) * .5 : 0;
      pts.push([(x + jx) / cols * size.w, (y + jy) / rows * size.h]);
    }
    for (var yy = 0; yy < rows; yy++) for (var xx = 0; xx < cols; xx++) {
      var a = pts[yy * (cols + 1) + xx], b = pts[yy * (cols + 1) + xx + 1], c = pts[(yy + 1) * (cols + 1) + xx], d = pts[(yy + 1) * (cols + 1) + xx + 1];
      var flip = (xx + yy) % 2;
      tris.push({ p: flip ? [a, b, c] : [a, b, d], u: (xx + yy) / (cols + rows), n: random() });
      tris.push({ p: flip ? [b, d, c] : [a, d, c], u: (xx + yy + 1) / (cols + rows), n: random() });
    }
    face.store.trisKey = size.w; return face.store.tris = tris;
  }
  function drawRoyal(ctx, size, face, t) {
    var w = size.w, h = size.h, charge = face.charge;
    // The coat materialises and dematerialises on a two-second cycle; the hold dissolves it for good.
    var coat = 1 - smooth(.05, .92, charge);
    if (coat <= .01) return;
    var cycle = (t / 2) % 1, index = Math.floor(t / 2);
    var tris = royalLattice(face, size);
    tris.forEach(function (tr, i) {
      var phase = clamp((cycle - tr.u * .38) / .62, 0, 1), a = Math.pow(Math.sin(phase * Math.PI), 1.35);
      var skip = hash2(i, index, 3) > .72; if (skip) a *= .25;
      var alpha = a * coat * (.16 + tr.n * .34);
      if (alpha < .01) return;
      ctx.fillStyle = 'rgba(' + (tr.n > .5 ? '255,226,140' : '229,185,90') + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath(); tr.p.forEach(function (pt, k) { if (k) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,190,' + (alpha * 1.8).toFixed(3) + ')'; ctx.lineWidth = Math.max(.8, w * .0026); ctx.stroke();
    });
    var pulse = Math.pow(Math.sin(cycle * Math.PI), 1.2) * coat;
    // Frosted glass: a clear veil and one reflection that travels the pack each cycle.
    ctx.fillStyle = 'rgba(255,245,225,' + (.07 * pulse).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h);
    var sx = mix(-w * .6, w * 1.6, cycle), sg = ctx.createLinearGradient(sx - w * .25, 0, sx + w * .25, h * .6);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,248,225,' + (.34 * pulse).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,240,190,' + (.5 * pulse).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, w * .006); ctx.strokeRect(w * .012, h * .008, w * .976, h * .984);
  }
  define('royal', {
    paint: paintRoyal, ambient: true, nodes: 0, draw: drawRoyal, cutRgb: '255,228,150', outline: CHAMFER,
    foil: function (fx) { fx.charge = 1; },
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName); mark.dataset.packText = 'wordmark';
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
      if (!rear) {
        var holder = node('div', 'royal-face-crown-wrap', layer);
        if (C.royalPackArt) C.royalPackArt.crown(holder, 'royal-face-crown');
        node('div', 'royal-face-title', layer, pack.name.toUpperCase());
        node('div', 'royal-face-tagline', layer, pack.tagline);
      } else {
        node('div', 'pack-rear-title', layer, pack.name);
        var copy = node('div', 'pack-rear-copy', layer);
        [pack.tagline || '', 'One card per pack'].filter(Boolean).forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, pack.design.batch || '');
      }
    }
  });

  ['classic', 'royal'].forEach(function (id) {
    var skin = C.packSkins && C.packSkins.registry[id], spec = id === 'classic' ? paintClassic : paintRoyal;
    if (skin) skin.snapshot = function (g, w, h, pack) { spec(g, w, h, false, pack && pack.id || id); };
  });
})(window.Cardable, window);
