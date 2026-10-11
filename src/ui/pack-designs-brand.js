/* Designed faces for the four brand packs (pack remake, milestone B).
 * Each design is a painter for the static artwork plus small dynamic hooks:
 *   draw(ctx,size,face,t)  ambient + hold + arrival, one transparent canvas over the artwork
 *   cutDraw(...)           the cut seam, in the pack's own language
 *   foil(fx,env)           how the opened wrapper carries the hold look
 * Nothing here is a clock of its own; everything runs from the pack's existing updates. */
(function (C, root) {
  'use strict';
  if (!C.packFaces) return;
  var K = C.packFaces.kit, clamp = K.clamp, smooth = K.smooth, mix = K.mix, TAU = K.TAU, node = K.node;
  var define = C.packFaces.define;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function dtOf(face, t) {
    // Seconds since this face last drew, bounded, so integrated motion survives key-skipped frames.
    var dt = face.last == null ? 0 : clamp(t - face.last, 0, .08); face.last = t; return dt;
  }
  function ink(layer, pack, rear, opts) {
    var mark = node('div', 'pack-mark', layer, C.config.gameName); mark.dataset.packText = 'wordmark';
    node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
    if (rear) {
      node('div', 'pack-rear-title', layer, pack.name);
      var copy = node('div', 'pack-rear-copy', layer);
      (opts.copy || [pack.tagline || '', 'One card per pack']).filter(Boolean).forEach(function (line) { node('span', '', copy, line); });
      node('div', 'pack-batch', layer, pack.design.batch || '');
    }
  }
  function logo(layer, className, src, alt) {
    var img = node('img', 'pack-brand-logo ' + className, layer); img.src = src; img.alt = alt || ''; img.draggable = false; img.setAttribute('aria-hidden', 'true');
    return img;
  }

  // ------------------------------------------------------------------ NVIDIA
  var NV = { green: '#76b900', hot: '#b6ff2e', dark: '#050604' };
  var nvPal = { body: ['#141812', '#0c0f0a', '#050604'], edge: '#020302', ridge: 'rgba(200,225,170,.13)', ridgeLow: 'rgba(0,0,0,.72)', crimp: ['#1d231a', '#0b0e09'], dot: '255,255,255' };
  function facet(ctx, pts, from, to, edge) {
    var g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
    g.addColorStop(0, from); g.addColorStop(1, to);
    ctx.fillStyle = g; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
  }
  function nvBand(ctx, w, h) {
    // The green wrap-around band, with an angled end like the box wrap.
    var y0 = h * .79, y1 = h * .845, g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#95d700'); g.addColorStop(.5, NV.green); g.addColorStop(1, '#5a8c00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.lineTo(w, y1); ctx.lineTo(0, y1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(0, y0, w, 1);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, y1 - 1, w, 1);
  }
  function paintNvidia(ctx, w, h, rear, id) {
    K.body(ctx, w, h, nvPal, 'nvidia');
    var cx = w / 2, cy = h * .49;
    if (!rear) {
      var e = 'rgba(180,200,160,.16)';
      facet(ctx, [[0, h * .2], [cx, h * .385], [w, h * .2], [w, h * .26], [cx, h * .445], [0, h * .26]], '#1f241b', '#2e3529', e);
      facet(ctx, [[0, h * .74], [cx, h * .555], [w, h * .74], [w, h * .68], [cx, h * .495 + h * .0], [0, h * .68]], '#161a13', '#232a1f', e);
      facet(ctx, [[0, h * .12], [w * .42, h * .2], [0, h * .17]], '#232a1f', '#171b14', e);
      facet(ctx, [[w, h * .12], [w * .58, h * .2], [w, h * .17]], '#232a1f', '#171b14', e);
      // The fan well: a dark disc inside two machined rings.
      var well = ctx.createRadialGradient(cx, cy, w * .02, cx, cy, w * .33);
      well.addColorStop(0, '#060705'); well.addColorStop(.8, '#0a0c08'); well.addColorStop(1, '#10130d');
      ctx.fillStyle = well; ctx.beginPath(); ctx.arc(cx, cy, w * .33, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,225,170,.2)'; ctx.lineWidth = Math.max(1, w * .004); ctx.beginPath(); ctx.arc(cx, cy, w * .33, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(cx, cy, w * .325, 0, TAU); ctx.stroke();
    } else {
      for (var i = 0; i < 7; i++) {
        var y = h * (.2 + i * .075);
        ctx.fillStyle = 'rgba(180,200,160,' + (i % 2 ? .05 : .09) + ')'; ctx.fillRect(w * .06, y, w * .88, 1);
      }
      K.finSeal(ctx, w, h, nvPal);
      K.barcode(ctx, w * .56, h * .7, w * .32, h * .042, K.seedOf(id + ':bar'), '220,240,200');
    }
    nvBand(ctx, w, h);
    K.folds(ctx, w, h, nvPal, .5); K.grain(ctx, w, h, .03, K.seedOf(id + (rear ? 'r' : 'f')));
    K.crimpBands(ctx, w, h, nvPal); K.perforation(ctx, w, h, nvPal, rear ? 0 : .26);
  }
  function fanBlade(ctx, r0, r1, sweep) {
    ctx.beginPath(); ctx.moveTo(r0, -r0 * .18);
    ctx.bezierCurveTo(r0 + (r1 - r0) * .3, -r1 * .06, r0 + (r1 - r0) * .7, -r1 * (.16 + sweep), r1, -r1 * (.3 + sweep));
    ctx.bezierCurveTo(r1 * 1.01, -r1 * .1, r0 + (r1 - r0) * .7, r1 * .12, r0 + (r1 - r0) * .1, r0 * .5);
    ctx.closePath();
  }
  function drawNvidia(ctx, size, face, t) {
    var w = size.w, h = size.h, cx = w / 2, cy = h * .49, charge = face.charge, arrive = face.arrive;
    var store = face.store, dt = dtOf(face, t);
    // Fan: idles on a slow drift, spins up with the hold.
    var rev = .025 + 5.2 * charge * charge;
    store.angle = ((store.angle || 0) + rev * TAU * dt) % TAU;
    var reveal = arrive < 1 ? h * (smooth(0, 1, arrive) * 1.06) : h * 2;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, reveal); ctx.clip();
    if (!face.rear) {
      var R = w * .3, r0 = w * .058, blades = 9, ghosts = charge > .35 ? 3 : 0;
      for (var gI = ghosts; gI >= 0; gI--) {
        var lag = gI * rev * TAU * .006;
        var alpha = gI ? .08 * charge : .13 + .2 * charge;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(store.angle - lag);
        for (var b = 0; b < blades; b++) {
          ctx.save(); ctx.rotate(b * TAU / blades);
          var g = ctx.createLinearGradient(r0, 0, R, 0); g.addColorStop(0, 'rgba(220,240,190,' + alpha.toFixed(3) + ')'); g.addColorStop(1, 'rgba(120,160,70,' + (alpha * .6).toFixed(3) + ')');
          ctx.fillStyle = g; fanBlade(ctx, r0, R, .06); ctx.fill();
          if (!gI) { ctx.strokeStyle = 'rgba(220,240,190,' + (.18 + .25 * charge).toFixed(3) + ')'; ctx.lineWidth = Math.max(.6, w * .0024); ctx.stroke(); }
          ctx.restore();
        }
        ctx.restore();
      }
      var hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 1.1);
      hub.addColorStop(0, '#2a3024'); hub.addColorStop(1, '#0b0d09');
      ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, r0 * 1.05, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,225,170,.35)'; ctx.lineWidth = 1; ctx.stroke();
      if (charge > 0) {
        var glow = ctx.createRadialGradient(cx, cy, r0, cx, cy, w * .46);
        glow.addColorStop(0, 'rgba(150,215,0,' + (.55 * charge * charge).toFixed(3) + ')'); glow.addColorStop(.55, 'rgba(118,185,0,' + (.16 * charge).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(118,185,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, w * .46, 0, TAU); ctx.fill();
      }
      // Power LEDs above the band, lit as the hold fills.
      var leds = 8, lit = Math.floor(charge * leds + (charge >= 1 ? 1 : 0));
      for (var l = 0; l < leds; l++) {
        var lx = w * .09 + l * w * .037, ly = h * .765, on = l < lit;
        ctx.fillStyle = on ? NV.hot : 'rgba(180,200,160,.18)'; ctx.fillRect(lx, ly, w * .026, h * .008);
        if (on) { ctx.fillStyle = 'rgba(182,255,46,.25)'; ctx.fillRect(lx - 1, ly - 1, w * .026 + 2, h * .008 + 2); }
      }
      // A sheen runs the band once the hold is nearly done.
      if (charge > .82) {
        var p = (charge - .82) / .18, sx = mix(-w * .3, w * 1.1, p), sg = ctx.createLinearGradient(sx - w * .2, 0, sx + w * .2, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(235,255,180,.7)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, h * .79, w, h * .055);
      }
    } else if (charge > 0) {
      var rg = ctx.createLinearGradient(0, h * .79, w, h * .79);
      rg.addColorStop(0, 'rgba(182,255,46,0)'); rg.addColorStop(charge, 'rgba(182,255,46,.5)'); rg.addColorStop(Math.min(1, charge + .001), 'rgba(182,255,46,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, h * .79, w, h * .055);
    }
    ctx.restore();
    if (arrive < 1) {
      // Arrival: a ray sweeps down the pack; below it the pack is still dark.
      ctx.fillStyle = NV.dark; ctx.fillRect(0, reveal, w, h - reveal);
      var lg = ctx.createLinearGradient(0, reveal - h * .14, 0, reveal);
      lg.addColorStop(0, 'rgba(118,185,0,0)'); lg.addColorStop(1, 'rgba(160,230,20,.38)');
      ctx.fillStyle = lg; ctx.fillRect(0, reveal - h * .14, w, h * .14);
      ctx.fillStyle = 'rgba(235,255,190,.95)'; ctx.fillRect(0, reveal - 1, w, 2);
      ctx.fillStyle = 'rgba(118,185,0,.5)'; ctx.fillRect(0, reveal - 5, w, 4);
    }
  }
  function cutNvidia(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, tip = cut.tip * w;
    if (x1 > x0) {
      var life = 1 - (cut.release || 0);
      ctx.strokeStyle = 'rgba(118,185,0,' + (.35 * life).toFixed(3) + ')'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(182,255,46,' + (.9 * life).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + life.toFixed(3) + ')'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (cut.heat > .05 && !cut.release) {
      var step = Math.floor(t * 28);
      for (var i = 0; i < 6; i++) {
        var rnd = ((Math.imul(step * 7 + i * 13, 2654435761) >>> 0) / 4294967296), a = -Math.PI / 2 + (rnd - .5) * 2.1, len = 4 + rnd * 12 * cut.heat;
        ctx.strokeStyle = 'rgba(210,255,120,' + (.9 - rnd * .5).toFixed(3) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(tip, y); ctx.lineTo(tip + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      }
    }
    K.drawCutDots(ctx, size, cut, t, '182,255,46');
  }
  define('nvidia', {
    paint: paintNvidia, ambient: true, nodes: 0, draw: drawNvidia, cutDraw: cutNvidia, cutRgb: '182,255,46',
    foil: function (fx, env) { fx.charge = env.reduced ? .5 : env.phase === 'tearing' ? .5 : .5; },
    print: function (layer, pack, rear) {
      ink(layer, pack, rear, {});
      if (!rear) {
        logo(layer, 'pack-brand-logo--nv-eye', 'assets/packs/nvidia-eye.svg', '');
        logo(layer, 'pack-brand-logo--nv-word', pack.design.companyLogo, pack.design.companyName + ' logo');
      }
      node('div', 'pack-band-text', layer, pack.name).dataset.packText = 'band';
    }
  });

  // ------------------------------------------------------------------ AMD
  var AMD = { red: '#ed1c24', hot: '#ff4a52', tilt: -11.7 };
  var amdPal = { body: ['#14141a', '#0b0b10', '#040407'], edge: '#020203', ridge: 'rgba(255,200,205,.1)', ridgeLow: 'rgba(0,0,0,.72)', crimp: ['#1c1c24', '#0a0a0e'], dot: '255,255,255' };
  function slashPoly(ctx, w, h, yLeft, yRight, thick) {
    ctx.beginPath(); ctx.moveTo(-w * .05, yLeft + (yRight - yLeft) * -.05); ctx.lineTo(w * 1.05, yRight + (yRight - yLeft) * .05);
    ctx.lineTo(w * 1.05, yRight + (yRight - yLeft) * .05 + thick); ctx.lineTo(-w * .05, yLeft + (yRight - yLeft) * -.05 + thick); ctx.closePath();
  }
  function paintAmd(ctx, w, h, rear, id) {
    K.body(ctx, w, h, amdPal, 'amd');
    // Fine diagonal hatch on the black, like brushed carbon.
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.028)'; ctx.lineWidth = 1;
    for (var x = -h; x < w + h; x += Math.max(5, w / 38)) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h * .5, 0); ctx.stroke(); }
    ctx.restore();
    var yl = rear ? h * .43 : h * .57, yr = rear ? h * .57 : h * .43;
    [[.0, .1, 1], [.125, .018, .8], [.155, .008, .5], [-.03, .006, .45]].forEach(function (s, i) {
      var y = (s[0]) * h; slashPoly(ctx, w, h, yl + y, yr + y, h * s[1]);
      var g = ctx.createLinearGradient(0, yl - h * .1, 0, yr + h * .15);
      g.addColorStop(0, '#ff3b44'); g.addColorStop(.5, AMD.red); g.addColorStop(1, '#8d0710');
      ctx.globalAlpha = s[2]; ctx.fillStyle = i === 0 ? g : AMD.red; ctx.fill(); ctx.globalAlpha = 1;
    });
    // Bevel highlight along the big slash.
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * .05, yl - h * .005); ctx.lineTo(w * 1.05, yr - h * .005); ctx.stroke();
    if (rear) { K.finSeal(ctx, w, h, amdPal); K.barcode(ctx, w * .56, h * .79, w * .32, h * .042, K.seedOf(id + ':bar'), '255,225,225'); }
    K.folds(ctx, w, h, amdPal, .5); K.grain(ctx, w, h, .03, K.seedOf(id + (rear ? 'r' : 'f')));
    K.crimpBands(ctx, w, h, amdPal); K.perforation(ctx, w, h, amdPal, rear ? 0 : .26);
  }
  function drawAmd(ctx, size, face, t) {
    var w = size.w, h = size.h, charge = face.charge, arrive = face.arrive, cx = w / 2, cy = h * .5;
    var rear = face.rear;
    if (!rear) {
      // Speed streaks run along the slash; they quicken with the hold.
      var speed = .12 + 1.6 * charge, n = 16, slope = (h * .43 - h * .57) / w;
      for (var i = 0; i < n; i++) {
        var seed = ((Math.imul(i + 1, 2246822519) >>> 0) / 4294967296), row = ((Math.imul(i + 9, 3266489917) >>> 0) / 4294967296);
        var u = ((seed + t * speed * (.5 + row)) % 1.2) - .1, x = u * w * 1.2 - w * .1;
        var y = h * (.36 + row * .3) + slope * x * (.4 + .6 * row), len = w * (.1 + .24 * row) * (.4 + charge);
        var a = (.05 + .32 * charge) * (1 - Math.abs(u - .5) * 1.2);
        if (a <= 0.01) continue;
        ctx.strokeStyle = 'rgba(237,28,36,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(1, w * .006);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + slope * len); ctx.stroke();
      }
      // A tachometer ring: ticks fill red as the hold nears its limit.
      var ticks = 28, R0 = w * .27, R1 = w * .31, lit = charge * ticks;
      for (var k = 0; k < ticks; k++) {
        var ang = Math.PI * .75 + (k / (ticks - 1)) * Math.PI * 1.5, on = k < lit, hot = k > ticks * .8;
        ctx.strokeStyle = on ? (hot ? '#ffffff' : AMD.hot) : 'rgba(255,255,255,.12)'; ctx.lineWidth = Math.max(1.2, w * .006);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0); ctx.lineTo(cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1); ctx.stroke();
      }
      if (charge >= .97) {
        var pulse = .5 + .5 * Math.sin(t * 14), flash = ctx.createLinearGradient(0, 0, w, 0);
        flash.addColorStop(0, 'rgba(255,255,255,0)'); flash.addColorStop(.5, 'rgba(255,230,230,' + (.5 * pulse).toFixed(3) + ')'); flash.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = flash; ctx.fillRect(0, h * .38, w, h * .24);
      }
    }
    if (arrive < 1) {
      // The slash cuts the pack in from the left; what it has not reached is still black.
      var p = smooth(0, 1, arrive), edge = mix(-w * .5, w * 1.5, p), slant = h * .5;
      ctx.fillStyle = amdPal.body[2]; ctx.beginPath();
      ctx.moveTo(edge + slant * .5, 0); ctx.lineTo(w * 2, 0); ctx.lineTo(w * 2, h); ctx.lineTo(edge - slant * .5, h); ctx.closePath(); ctx.fill();
      var g = ctx.createLinearGradient(edge - 28, 0, edge + 6, 0);
      g.addColorStop(0, 'rgba(237,28,36,0)'); g.addColorStop(1, 'rgba(255,74,82,.65)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(edge + slant * .5 - 34, 0); ctx.lineTo(edge + slant * .5, 0); ctx.lineTo(edge - slant * .5, h); ctx.lineTo(edge - slant * .5 - 34, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(edge + slant * .5, 0); ctx.lineTo(edge - slant * .5, h); ctx.stroke();
    }
  }
  function cutAmd(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, tip = cut.tip * w, life = 1 - (cut.release || 0);
    if (x1 > x0) {
      ctx.strokeStyle = 'rgba(237,28,36,' + (.4 * life).toFixed(3) + ')'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,96,' + life.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + life.toFixed(3) + ')'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (cut.heat > .05 && !cut.release) {
      // A slanted flare leaves the tip, in the direction of the brand slash.
      var len = w * (.1 + .16 * cut.heat), g = ctx.createLinearGradient(tip, y, tip + len, y - len * .21);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(237,28,36,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tip, y); ctx.lineTo(tip + len, y - len * .21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tip, y); ctx.lineTo(tip - len * .6, y + len * .13); ctx.stroke();
    }
    K.drawCutDots(ctx, size, cut, t, '255,120,126');
  }
  define('amd', {
    paint: paintAmd, ambient: true, nodes: 0, draw: drawAmd, cutDraw: cutAmd, cutRgb: '255,120,126',
    foil: function (fx) { fx.charge = .38; },
    print: function (layer, pack, rear) {
      ink(layer, pack, rear, {});
      if (!rear) {
        logo(layer, 'pack-brand-logo--amd', pack.design.companyLogo, pack.design.companyName + ' logo');
        node('div', 'pack-band-text', layer, pack.name).dataset.packText = 'band';
      }
    }
  });

  // ------------------------------------------------------------------ Snapdragon
  var SD = { gold: '#e2b866', pale: '#f6e3b4', red: '#ed1c24' };
  var sdPal = { body: ['#0f1424', '#080b16', '#03040a'], edge: '#010206', ridge: 'rgba(240,215,160,.14)', ridgeLow: 'rgba(0,0,0,.72)', crimp: ['#1a2036', '#080b16'], dot: '240,215,160' };
  function sdGeometry(w, h) { var s = w * .5; return { cx: w / 2, cy: h * .49, s: s, x: w / 2 - s / 2, y: h * .49 - s / 2, die: s * .56 }; }
  function sdPads(g, perSide) {
    var pads = [], step = g.s * .86 / (perSide - 1), start = -g.s * .43;
    for (var i = 0; i < perSide; i++) pads.push({ x: g.cx + start + i * step, y: g.y + 3, side: 0 });
    for (var j = 0; j < perSide; j++) pads.push({ x: g.x + g.s - 3, y: g.cy + start + j * step, side: 1 });
    for (var k = 0; k < perSide; k++) pads.push({ x: g.cx - start - k * step, y: g.y + g.s - 3, side: 2 });
    for (var m = 0; m < perSide; m++) pads.push({ x: g.x + 3, y: g.cy - start - m * step, side: 3 });
    return pads;
  }
  function paintSnapdragon(ctx, w, h, rear, id) {
    K.body(ctx, w, h, sdPal, 'snapdragon');
    var g = sdGeometry(w, h);
    ctx.strokeStyle = 'rgba(226,184,102,.28)'; ctx.lineWidth = 1; ctx.strokeRect(w * .055, h * .1, w * .89, h * .8);
    // Package substrate.
    var sub = ctx.createLinearGradient(g.x, g.y, g.x + g.s, g.y + g.s);
    sub.addColorStop(0, '#171d33'); sub.addColorStop(1, '#0b0f1d');
    ctx.fillStyle = sub; roundRect(ctx, g.x, g.y, g.s, g.s, w * .018); ctx.fill();
    ctx.strokeStyle = 'rgba(226,184,102,.55)'; ctx.stroke();
    if (rear) {
      // Underside: a ball grid array and the pin-one marker.
      var cols = 11, pitch = g.s * .84 / (cols - 1), r = pitch * .26;
      for (var yy = 0; yy < cols; yy++) for (var xx = 0; xx < cols; xx++) {
        var bx = g.x + g.s * .08 + xx * pitch, by = g.y + g.s * .08 + yy * pitch;
        var ball = ctx.createRadialGradient(bx - r * .3, by - r * .3, 0, bx, by, r);
        ball.addColorStop(0, '#fff0c8'); ball.addColorStop(1, '#a8803a');
        ctx.fillStyle = ball; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = SD.gold; ctx.beginPath(); ctx.moveTo(g.x + 2, g.y + 2); ctx.lineTo(g.x + w * .05, g.y + 2); ctx.lineTo(g.x + 2, g.y + w * .05); ctx.closePath(); ctx.fill();
      K.finSeal(ctx, w, h, sdPal);
      K.barcode(ctx, w * .56, h * .79, w * .32, h * .042, K.seedOf(id + ':bar'), '246,227,180');
    } else {
      // Die with bond wires running to the edge pads.
      var pads = sdPads(g, 12), die = g.die;
      ctx.strokeStyle = 'rgba(226,184,102,.22)'; ctx.lineWidth = Math.max(.6, w * .0024);
      pads.forEach(function (p, i) {
        var tx = clamp(p.x, g.cx - die / 2, g.cx + die / 2), ty = clamp(p.y, g.cy - die / 2, g.cy + die / 2);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
      ctx.fillStyle = '#06080f'; ctx.fillRect(g.cx - die / 2, g.cy - die / 2, die, die);
      ctx.strokeStyle = 'rgba(226,184,102,.7)'; ctx.strokeRect(g.cx - die / 2, g.cy - die / 2, die, die);
      ctx.strokeStyle = 'rgba(226,184,102,.1)';
      for (var q = 1; q < 8; q++) { var o = die * q / 8; ctx.beginPath(); ctx.moveTo(g.cx - die / 2 + o, g.cy - die / 2); ctx.lineTo(g.cx - die / 2 + o, g.cy + die / 2); ctx.moveTo(g.cx - die / 2, g.cy - die / 2 + o); ctx.lineTo(g.cx + die / 2, g.cy - die / 2 + o); ctx.stroke(); }
      pads.forEach(function (p) { ctx.fillStyle = 'rgba(226,184,102,.55)'; ctx.fillRect(p.x - w * .008, p.y - w * .008, w * .016, w * .016); });
    }
    K.folds(ctx, w, h, sdPal, .5); K.grain(ctx, w, h, .028, K.seedOf(id + (rear ? 'r' : 'f')));
    K.crimpBands(ctx, w, h, sdPal); K.perforation(ctx, w, h, sdPal, rear ? 0 : .3);
  }
  function sdTraces(face, g) {
    if (face.store.traces) return face.store.traces;
    var random = K.rng(K.seedOf('sd-traces')), out = [], per = 6;
    for (var side = 0; side < 4; side++) for (var i = 0; i < per; i++) {
      var along = (i + .5) / per - .5, dx = [0, 1, 0, -1][side], dy = [-1, 0, 1, 0][side], px = -dy, py = dx;
      var d = g.die / 2, sx = g.cx + dx * d + px * along * g.die * .8, sy = g.cy + dy * d + py * along * g.die * .8;
      var pts = [[sx, sy]], x = sx, y = sy, run = g.s * (.18 + random() * .12);
      x += dx * run; y += dy * run; pts.push([x, y]);
      var jog = (random() - .5) * g.s * .12; x += px * jog + dx * jog * .5; y += py * jog + dy * jog * .5; pts.push([x, y]);
      x = side % 2 ? (dx > 0 ? g.x + g.s - 4 : g.x + 4) : x; y = side % 2 ? y : (dy > 0 ? g.y + g.s - 4 : g.y + 4);
      pts.push([x, y]);
      var len = 0; for (var s = 1; s < pts.length; s++) len += Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]);
      out.push({ pts: pts, len: len, delay: random() * .35, red: random() > .84 });
    }
    return face.store.traces = out;
  }
  function pointOn(trace, d) {
    var left = d;
    for (var i = 1; i < trace.pts.length; i++) {
      var a = trace.pts[i - 1], b = trace.pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (left <= seg) { var k = seg ? left / seg : 0; return [mix(a[0], b[0], k), mix(a[1], b[1], k)]; }
      left -= seg;
    }
    var end = trace.pts[trace.pts.length - 1]; return [end[0], end[1]];
  }
  function drawSnapdragon(ctx, size, face, t) {
    if (face.rear) return;
    var w = size.w, h = size.h, g = sdGeometry(w, h), charge = face.charge, arrive = face.arrive;
    var traces = sdTraces(face, g), pads = sdPads(g, 12);
    // Boot-up: the package is dark until its pads light clockwise, then the die wakes.
    if (arrive < 1) {
      var cover = 1 - smooth(.05, .75, arrive);
      ctx.fillStyle = 'rgba(3,4,10,' + (.9 * cover).toFixed(3) + ')'; ctx.fillRect(w * .04, h * .08, w * .92, h * .84);
      var lit = arrive * pads.length * 1.5;
      pads.forEach(function (p, i) {
        if (i > lit) return; var f = clamp((lit - i) / 6, 0, 1);
        var gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * .05);
        gl.addColorStop(0, 'rgba(255,236,180,' + (.8 * f).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(226,184,102,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, w * .05, 0, TAU); ctx.fill();
        ctx.fillStyle = SD.pale; ctx.fillRect(p.x - w * .008, p.y - w * .008, w * .016, w * .016);
      });
      var wake = smooth(.6, 1, arrive);
      if (wake > 0) {
        var dg = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, g.s * .6);
        dg.addColorStop(0, 'rgba(255,230,170,' + (.6 * wake).toFixed(3) + ')'); dg.addColorStop(1, 'rgba(226,184,102,0)');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.s * .6, 0, TAU); ctx.fill();
      }
    }
    if (charge > 0) {
      // Routed traces grow out of the die with the hold; data packets ride them.
      traces.forEach(function (tr, i) {
        var p = clamp((charge * 1.25 - tr.delay) / .9, 0, 1); if (p <= 0) return;
        var d = tr.len * p, col = tr.red ? '237,28,36' : '226,184,102';
        ctx.strokeStyle = 'rgba(' + col + ',.85)'; ctx.lineWidth = Math.max(1, w * .0042); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
        var left = d;
        for (var s = 1; s < tr.pts.length && left > 0; s++) {
          var a = tr.pts[s - 1], b = tr.pts[s], seg = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.min(1, left / seg);
          ctx.lineTo(mix(a[0], b[0], k), mix(a[1], b[1], k)); left -= seg;
        }
        ctx.stroke();
        var head = pointOn(tr, d);
        ctx.fillStyle = tr.red ? '#ff8a8f' : SD.pale; ctx.beginPath(); ctx.arc(head[0], head[1], w * .007, 0, TAU); ctx.fill();
        if (p >= 1) {
          var pk = ((t * .9 + i * .37) % 1), pp = pointOn(tr, tr.len * pk);
          ctx.fillStyle = 'rgba(255,245,215,.95)'; ctx.beginPath(); ctx.arc(pp[0], pp[1], w * .006, 0, TAU); ctx.fill();
        }
      });
      var core = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, g.s * .55);
      core.addColorStop(0, 'rgba(255,225,160,' + (.5 * charge).toFixed(3) + ')'); core.addColorStop(1, 'rgba(226,184,102,0)');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.s * .55, 0, TAU); ctx.fill();
    }
  }
  function cutSnapdragon(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, life = 1 - (cut.release || 0);
    if (x1 > x0) {
      ctx.strokeStyle = 'rgba(226,184,102,' + (.85 * life).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      // Packets run the cut like data on a bus.
      for (var i = 0; i < 6; i++) {
        var u = (t * .8 + i / 6) % 1, x = mix(x0, x1, u);
        ctx.fillStyle = 'rgba(255,240,200,' + (.9 * life).toFixed(3) + ')'; ctx.fillRect(x - 2.5, y - 1.5, 5, 3);
      }
    }
    K.drawCutDots(ctx, size, cut, t, '240,215,160');
  }
  define('snapdragon', {
    paint: paintSnapdragon, ambient: true, nodes: 0, draw: drawSnapdragon, cutDraw: cutSnapdragon, cutRgb: '240,215,160',
    foil: function (fx) { fx.charge = .6; },
    print: function (layer, pack, rear) {
      ink(layer, pack, rear, {});
      if (!rear) {
        var mark = node('div', 'pack-brand-logo pack-brand-logo--sd-mark', layer); mark.style.backgroundImage = 'url("' + pack.design.companyLogo + '")'; mark.setAttribute('aria-hidden', 'true');
        logo(layer, 'pack-brand-logo--sd-word', pack.design.companyLogo, pack.design.companyName + ' logo');
      }
    }
  });

  // ------------------------------------------------------------------ Apple
  var APPLE = ['#6ea8ff', '#b78bff', '#ff8fb1', '#ffb86b'];
  var applePal = { crimp: ['#f7f8fb', '#c3c9d4'], ridge: 'rgba(255,255,255,.95)', ridgeLow: 'rgba(70,80,100,.28)', dot: '40,44,56' };
  function orbs(ctx, w, h, k, drift) {
    var spec = [[.3, .4, .5, 0], [.72, .5, .46, 1], [.5, .66, .5, 2], [.26, .66, .4, 3], [.7, .3, .34, 0]];
    spec.forEach(function (o, i) {
      var x = w * (o[0] + Math.sin(drift * .6 + i * 1.9) * .04), y = h * (o[1] + Math.cos(drift * .5 + i * 1.3) * .03), r = w * o[2] * k;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      var c = APPLE[o[3]];
      g.addColorStop(0, c + 'cc'); g.addColorStop(.55, c + '44'); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
  }
  function appleBody(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#c9ced8'); g.addColorStop(.08, '#e6e9ef'); g.addColorStop(.5, '#fafbfd'); g.addColorStop(.92, '#e3e6ec'); g.addColorStop(1, '#bfc5d0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(120,130,150,.35)'); v.addColorStop(.12, 'rgba(120,130,150,0)'); v.addColorStop(.88, 'rgba(120,130,150,0)'); v.addColorStop(1, 'rgba(120,130,150,.4)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  function chipTile(ctx, w, h, rear) {
    var s = w * (rear ? .2 : .36), x = w / 2 - s / 2, y = h * (rear ? .5 : .49) - s / 2, r = s * .22;
    ctx.save(); ctx.shadowColor = 'rgba(40,50,80,.28)'; ctx.shadowBlur = w * .05; ctx.shadowOffsetY = w * .016;
    ctx.fillStyle = 'rgba(255,255,255,.62)'; roundRect(ctx, x, y, s, s, r); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.2; roundRect(ctx, x, y, s, s, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,80,110,.2)'; ctx.lineWidth = 1; roundRect(ctx, x - 1, y - 1, s + 2, s + 2, r + 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,80,110,.28)'; ctx.lineWidth = Math.max(1, w * .003);
    for (var i = 0; i < 7; i++) {
      var o = s * .18 + i * s * .1;
      [[x + o, y], [x + o, y + s]].forEach(function (p, k) { ctx.beginPath(); ctx.moveTo(p[0], p[1] + (k ? 0 : 0)); ctx.lineTo(p[0], p[1] + (k ? w * .016 : -w * .016)); ctx.stroke(); });
      [[x, y + o], [x + s, y + o]].forEach(function (p, k) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + (k ? w * .016 : -w * .016), p[1]); ctx.stroke(); });
    }
  }
  function paintApple(ctx, w, h, rear, id) {
    appleBody(ctx, w, h);
    orbs(ctx, w, h, rear ? .6 : 1, 0);
    chipTile(ctx, w, h, rear);
    if (rear) {
      K.finSeal(ctx, w, h, { crimp: applePal.crimp });
      K.barcode(ctx, w * .56, h * .79, w * .32, h * .042, K.seedOf(id + ':bar'), '40,44,56');
    }
    K.folds(ctx, w, h, applePal, .35); K.grain(ctx, w, h, .018, K.seedOf(id + (rear ? 'r' : 'f')));
    K.crimpBands(ctx, w, h, applePal); K.perforation(ctx, w, h, applePal, rear ? 0 : .22);
  }
  function ringPath(w, h) { return { x: w * .045, y: h * .085, w: w * .91, h: h * .83, r: w * .06 }; }
  function drawApple(ctx, size, face, t) {
    var w = size.w, h = size.h, charge = face.charge, arrive = face.arrive;
    var live = t;
    if (arrive < 1 || charge > 0) {
      // Orbs swell with the hold and bloom open on arrival.
      var k = .75 + .55 * Math.max(charge, smooth(0, 1, arrive) * .35);
      ctx.globalAlpha = clamp(.3 + charge * .9 + (1 - arrive) * .0, 0, 1);
      orbs(ctx, w, h, k, live); ctx.globalAlpha = 1;
      if (!face.rear) chipTile(ctx, w, h, false);
    }
    if (charge > 0 && !face.rear) {
      // A ring of light circles the pack's body, brightening and tightening as the hold completes.
      var rp = ringPath(w, h), segs = 72, per = 2 * (rp.w + rp.h) - 8 * rp.r + TAU * rp.r;
      var head = (live * .32) % 1;
      ctx.lineCap = 'round';
      for (var i = 0; i < segs; i++) {
        var u = i / segs, d = ((u - head) % 1 + 1) % 1, glow = Math.pow(1 - d, 2.4), a = charge * (.4 + .6 * glow);
        var c = APPLE[Math.floor(u * 4 + live * .2) % 4];
        var p0 = perimeterPoint(rp, u), p1 = perimeterPoint(rp, (i + 1.4) / segs);
        ctx.strokeStyle = hexA(c, a); ctx.lineWidth = Math.max(1.2, w * (.006 + .018 * charge * glow));
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
    }
    if (arrive < 1) {
      ctx.fillStyle = 'rgba(247,248,251,' + (1 - smooth(0, .8, arrive)).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h);
      var bloom = smooth(0, 1, arrive), r = w * (.1 + bloom * .9), g = ctx.createRadialGradient(w / 2, h * .49, 0, w / 2, h * .49, r);
      g.addColorStop(0, 'rgba(255,255,255,' + (.9 * (1 - bloom)).toFixed(3) + ')'); g.addColorStop(.6, 'rgba(183,139,255,' + (.25 * (1 - bloom)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(110,168,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h * .49, r, 0, TAU); ctx.fill();
    }
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }
  function perimeterPoint(rp, u) {
    // A point along a rounded rectangle; u in [0,1).
    var straightW = rp.w - 2 * rp.r, straightH = rp.h - 2 * rp.r, arc = Math.PI / 2 * rp.r, total = 2 * straightW + 2 * straightH + 4 * arc;
    var d = ((u % 1) + 1) % 1 * total, x = rp.x, y = rp.y;
    if (d < straightW) return [x + rp.r + d, y];
    d -= straightW; if (d < arc) { var a = d / rp.r - Math.PI / 2; return [x + rp.w - rp.r + Math.cos(a) * rp.r, y + rp.r + Math.sin(a) * rp.r]; }
    d -= arc; if (d < straightH) return [x + rp.w, y + rp.r + d];
    d -= straightH; if (d < arc) { var b = d / rp.r; return [x + rp.w - rp.r + Math.cos(b) * rp.r, y + rp.h - rp.r + Math.sin(b) * rp.r]; }
    d -= arc; if (d < straightW) return [x + rp.w - rp.r - d, y + rp.h];
    d -= straightW; if (d < arc) { var c = d / rp.r + Math.PI / 2; return [x + rp.r + Math.cos(c) * rp.r, y + rp.h - rp.r + Math.sin(c) * rp.r]; }
    d -= arc; if (d < straightH) return [x, y + rp.h - rp.r - d];
    d -= straightH; var e = d / rp.r + Math.PI; return [x + rp.r + Math.cos(e) * rp.r, y + rp.r + Math.sin(e) * rp.r];
  }
  function cutApple(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, tip = cut.tip * w, life = 1 - (cut.release || 0);
    if (x1 > x0) {
      var g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, 'rgba(110,168,255,' + (.9 * life).toFixed(3) + ')'); g.addColorStop(.5, 'rgba(183,139,255,' + (.9 * life).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,143,177,' + (.9 * life).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (cut.heat > .05 && !cut.release) {
      var r = w * (.06 + .1 * cut.heat), rg = ctx.createRadialGradient(tip, y, 0, tip, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(.4, 'rgba(183,139,255,.5)'); rg.addColorStop(1, 'rgba(110,168,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(tip, y, r, 0, TAU); ctx.fill();
    }
    K.drawCutDots(ctx, size, cut, t, '70,76,100');
  }
  define('apple', {
    paint: paintApple, ambient: true, nodes: 0, draw: drawApple, cutDraw: cutApple, cutRgb: '70,76,100',
    foil: function (fx) { fx.charge = .35; },
    print: function (layer, pack, rear) {
      ink(layer, pack, rear, {});
      if (!rear) {
        logo(layer, 'pack-brand-logo--apple', pack.design.companyLogo, pack.design.companyName + ' logo');
        node('div', 'pack-band-text', layer, pack.name).dataset.packText = 'band';
      }
    }
  });

  // ------------------------------------------------------------------ startup animations
  C.packFaces.defineArrival('rayTrace', { ms: 1500, holdMs: 260, fadeMs: 360 });
  C.packFaces.defineArrival('slashIn', { ms: 1100, holdMs: 220, fadeMs: 320 });
  C.packFaces.defineArrival('bootUp', { ms: 1700, holdMs: 300, fadeMs: 380 });
  C.packFaces.defineArrival('bloom', { ms: 1600, holdMs: 240, fadeMs: 420 });

  // Studio / transition snapshots: the printed front, flat.
  function snapshot(painter) {
    return function (g, w, h, pack) { painter(g, w, h, false, pack.id); };
  }
  ['nvidia', 'amd', 'snapdragon', 'apple'].forEach(function (id) {
    var skin = C.packSkins && C.packSkins.registry[id];
    var spec = { nvidia: paintNvidia, amd: paintAmd, snapdragon: paintSnapdragon, apple: paintApple }[id];
    if (skin) skin.snapshot = snapshot(spec);
  });
})(window.Cardable, window);
