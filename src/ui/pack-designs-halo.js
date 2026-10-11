/* Designed faces for the Titan and Picker packs (pack remake, milestone D).
 * Titan takes its cues from the Titan X and GTX 1080 Ti coolers: a faceted aluminium shroud,
 * a window onto a black heatsink, chrome lettering, a cold LED edge.
 * Picker is a clear plastic sleeve with three card backs showing inside. */
(function (C, root) {
  'use strict';
  if (!C.packFaces) return;
  var K = C.packFaces.kit, clamp = K.clamp, smooth = K.smooth, mix = K.mix, TAU = K.TAU, node = K.node;
  var define = C.packFaces.define;
  var CHAMFER = [[1.6, 0], [98.4, 0], [100, 1.1], [100, 98.9], [98.4, 100], [1.6, 100], [0, 98.9], [0, 1.1]];
  var TITAN_SHAPE = [[2.5, 0], [97.5, 0], [100, 2], [100, 98], [97.5, 100], [2.5, 100], [0, 98], [0, 2]];

  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hex(ctx, x, y, r) { ctx.beginPath(); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + .52; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function screw(ctx, x, y, r) {
    var g = ctx.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); g.addColorStop(0, '#d7dce2'); g.addColorStop(1, '#4b5058');
    ctx.fillStyle = g; hex(ctx, x, y, r); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.beginPath(); ctx.arc(x, y, r * .38, 0, TAU); ctx.fill();
  }

  // ------------------------------------------------------------------ Titan
  var TI = { ice: '223,240,255', steel: '#8e9399' };
  function silver(ctx, x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#f2f5f8'); g.addColorStop(.3, '#aeb4bc'); g.addColorStop(.52, '#5d636b'); g.addColorStop(.75, '#c6cbd2'); g.addColorStop(1, '#6e747c');
    return g;
  }
  function windowShape(w, h) {
    var x0 = w * .205, x1 = w * .795, y0 = h * .235, y1 = h * .745, c = w * .07;
    return [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
  }
  function paintTitan(ctx, w, h, rear, id) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2c3036'); g.addColorStop(.5, '#14161a'); g.addColorStop(1, '#0a0b0d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.028)'; for (var y = 0; y < h; y += 2) if ((y / 2) % 3 === 0) ctx.fillRect(0, y, w, 1);
    var edge = ctx.createLinearGradient(0, 0, w, 0);
    edge.addColorStop(0, 'rgba(0,0,0,.6)'); edge.addColorStop(.1, 'rgba(0,0,0,0)'); edge.addColorStop(.9, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
    if (!rear) {
      // Top plate: polished aluminium, angled like the cooler's crown.
      poly(ctx, [[w * .03, h * .03], [w * .97, h * .03], [w * .91, h * .185], [w * .09, h * .185]]); ctx.fillStyle = silver(ctx, 0, h * .03, w, h * .185); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
      poly(ctx, [[w * .09, h * .185], [w * .91, h * .185], [w * .86, h * .205], [w * .14, h * .205]]); ctx.fillStyle = '#05060a'; ctx.fill();
      // Side chevrons.
      [[0, 1], [1, -1]].forEach(function (s) {
        var x = s[0] * w, k = s[1];
        poly(ctx, [[x, h * .21], [x + k * w * .2, h * .25], [x + k * w * .2, h * .73], [x, h * .78]]);
        var sg = ctx.createLinearGradient(x, 0, x + k * w * .2, 0); sg.addColorStop(0, '#4b5058'); sg.addColorStop(1, '#16181c'); ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = 'rgba(200,210,225,.28)'; ctx.stroke();
        poly(ctx, [[x, h * .21], [x + k * w * .2, h * .25], [x + k * w * .2, h * .3], [x, h * .26]]); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
      });
      // The window onto the heatsink.
      var win = windowShape(w, h);
      poly(ctx, win.map(function (p) { return [p[0] + (p[0] < w / 2 ? -w * .018 : w * .018), p[1] + (p[1] < h / 2 ? -h * .01 : h * .01)]; })); ctx.fillStyle = silver(ctx, 0, h * .22, w, h * .76); ctx.fill();
      poly(ctx, win); var wg = ctx.createLinearGradient(0, h * .235, 0, h * .745);
      wg.addColorStop(0, '#0a0c10'); wg.addColorStop(.7, '#10141b'); wg.addColorStop(1, '#1d2a3a');
      ctx.fillStyle = wg; ctx.fill();
      ctx.save(); poly(ctx, win); ctx.clip();
      var fins = 34, x0 = w * .205, span = w * .59;
      for (var i = 0; i < fins; i++) {
        var fx = x0 + i * span / fins;
        ctx.fillStyle = '#05060a'; ctx.fillRect(fx, h * .235, span / fins * .55, h * .51);
        ctx.fillStyle = 'rgba(190,215,245,.2)'; ctx.fillRect(fx + span / fins * .55, h * .235, 1, h * .51);
      }
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(w * .205, h * .235, span, h * .02);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.8)'; poly(ctx, win); ctx.lineWidth = 1.5; ctx.stroke();
      // Bottom plate.
      poly(ctx, [[w * .09, h * .79], [w * .91, h * .79], [w * .97, h * .97], [w * .03, h * .97]]); ctx.fillStyle = silver(ctx, 0, h * .79, w, h * .97); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.stroke();
      [[.1, .05], [.9, .05], [.1, .95], [.9, .95], [.5, .955]].forEach(function (p) { screw(ctx, w * p[0], h * p[1], w * .016); });
    } else {
      // Backplate: black brushed, vent slits, screw grid, and a spec label.
      ctx.fillStyle = '#0c0d10'; roundRect(ctx, w * .06, h * .05, w * .88, h * .9, w * .02); ctx.fill();
      ctx.strokeStyle = 'rgba(190,200,215,.22)'; ctx.lineWidth = 1; ctx.stroke();
      for (var r = 0; r < 12; r++) {
        ctx.fillStyle = '#030406'; ctx.fillRect(w * .16, h * (.2 + r * .036), w * .68, h * .014);
        ctx.fillStyle = 'rgba(200,215,235,.16)'; ctx.fillRect(w * .16, h * (.2 + r * .036) + h * .014, w * .68, 1);
      }
      for (var sx = 0; sx < 3; sx++) for (var sy = 0; sy < 5; sy++) screw(ctx, w * (.14 + sx * .36), h * (.1 + sy * .2), w * .014);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(w * .56, h * .79, w * .3, h * .08);
      K.barcode(ctx, w * .58, h * .803, w * .26, h * .035, K.seedOf(id + ':bar'), '20,22,26');
    }
    K.grain(ctx, w, h, .03, K.seedOf(id + (rear ? 'r' : 'f')));
  }
  function drawTitan(ctx, size, face, t) {
    if (face.rear) return;
    var w = size.w, h = size.h, charge = face.charge, win = windowShape(w, h);
    var breath = .5 + .5 * Math.sin(t * 1.3);
    // Cold edge LED beside the window, breathing; sequential ticks light with the hold.
    var ledA = .3 + .5 * breath + charge * .2;
    [w * .185, w * .815].forEach(function (x) {
      var g = ctx.createLinearGradient(0, h * .26, 0, h * .72);
      g.addColorStop(0, 'rgba(' + TI.ice + ',0)'); g.addColorStop(.5, 'rgba(' + TI.ice + ',' + ledA.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + TI.ice + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - 1, h * .26, 2, h * .46);
      ctx.fillStyle = 'rgba(' + TI.ice + ',' + (ledA * .18).toFixed(3) + ')'; ctx.fillRect(x - 5, h * .3, 10, h * .38);
    });
    ctx.save(); poly(ctx, win); ctx.clip();
    // A bar of light crosses the fins every few seconds: the idle animation.
    var cycle = (t % 8) / 8, sx = mix(-w * .3, w * 1.1, smooth(0, 1, cycle));
    if (cycle < .55) {
      var bg = ctx.createLinearGradient(sx - w * .12, 0, sx + w * .12, h * .1);
      bg.addColorStop(0, 'rgba(' + TI.ice + ',0)'); bg.addColorStop(.5, 'rgba(' + TI.ice + ',' + (.22 * Math.sin(cycle / .55 * Math.PI)).toFixed(3) + ')'); bg.addColorStop(1, 'rgba(' + TI.ice + ',0)');
      ctx.fillStyle = bg; ctx.fillRect(0, h * .235, w, h * .51);
    }
    if (charge > 0) {
      // Heat rises through the fins as the hold fills.
      var top = mix(h * .745, h * .235, charge * .92), hg = ctx.createLinearGradient(0, top, 0, h * .745);
      hg.addColorStop(0, 'rgba(255,255,255,' + (.38 * charge).toFixed(3) + ')'); hg.addColorStop(.25, 'rgba(' + TI.ice + ',' + (.3 * charge).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(120,175,235,' + (.45 * charge).toFixed(3) + ')');
      ctx.fillStyle = hg; ctx.fillRect(0, top, w, h * .745 - top);
      for (var k = 0; k < 6; k++) {
        var fx = w * (.24 + k * .1) + Math.sin(t * 2 + k) * 2;
        ctx.fillStyle = 'rgba(255,255,255,' + (.25 * charge).toFixed(3) + ')'; ctx.fillRect(fx, top, 1.2, h * .745 - top);
      }
    }
    ctx.restore();
    // Six ticks on the crown plate.
    for (var i = 0; i < 6; i++) {
      var on = charge * 6 > i + .2, x = w * (.3 + i * .08), y = h * .165;
      ctx.fillStyle = on ? 'rgba(' + TI.ice + ',.95)' : 'rgba(30,35,42,.8)'; ctx.fillRect(x, y, w * .05, h * .006);
      if (on) { ctx.fillStyle = 'rgba(' + TI.ice + ',.25)'; ctx.fillRect(x - 1, y - 2, w * .05 + 2, h * .006 + 4); }
    }
  }
  function cutTitan(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, life = 1 - (cut.release || 0);
    if (x1 > x0) {
      ctx.strokeStyle = 'rgba(' + TI.ice + ',' + (.35 * life).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + life.toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    K.drawCutDots(ctx, size, cut, t, '223,240,255');
  }
  define('titan', {
    paint: paintTitan, ambient: true, nodes: 0, draw: drawTitan, cutDraw: cutTitan, cutRgb: '223,240,255', outline: TITAN_SHAPE,
    foil: function (fx) { fx.charge = .55; },
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName); mark.dataset.packText = 'wordmark';
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
      if (!rear) {
        node('div', 'titan-title', layer, 'TITAN').dataset.packText = 'title';
        node('div', 'titan-sub', layer, 'HALO SERIES');
      } else {
        node('div', 'pack-rear-title', layer, pack.name);
        var copy = node('div', 'pack-rear-copy', layer);
        [pack.tagline || '', 'One card per pack'].filter(Boolean).forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, pack.design.batch || '');
      }
    }
  });

  // ------------------------------------------------------------------ Picker
  var PK = '#2de2b8';
  function cardBack(ctx, w, h, alpha) {
    // One card back, centred on the origin.
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    var g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#2a2e36'); g.addColorStop(.5, '#14161b'); g.addColorStop(1, '#0b0c10');
    ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, w * .07); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(45,226,184,.35)'; roundRect(ctx, -w / 2 + w * .06, -h / 2 + w * .06, w * .88, h - w * .12, w * .045); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 ' + w * .3 + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.beginPath(); ctx.arc(0, 0, w * .2, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.fillText('c', 0, w * .01);
    var sh = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(.4, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; roundRect(ctx, -w / 2, -h / 2, w, h, w * .07); ctx.fill();
    ctx.restore();
  }
  function paintPicker(ctx, w, h, rear, id) {
    // A clear sleeve: faint body, bright edges, frosted heat-sealed crimps, a diagonal glare.
    var m = w * .045;
    ctx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(ctx, m, h * .03, w - 2 * m, h * .94, w * .035); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1.2, w * .006); ctx.stroke();
    ctx.strokeStyle = 'rgba(45,226,184,.25)'; ctx.lineWidth = 1; roundRect(ctx, m + 3, h * .03 + 3, w - 2 * m - 6, h * .94 - 6, w * .03); ctx.stroke();
    // Glare bands.
    [[.12, .22], [.3, .05]].forEach(function (b) {
      var g = ctx.createLinearGradient(w * b[0], 0, w * (b[0] + b[1]), h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + (rear ? .06 : .1) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w * b[0], 0); ctx.lineTo(w * (b[0] + b[1]), 0); ctx.lineTo(w * (b[0] + b[1] - .35), h); ctx.lineTo(w * (b[0] - .35), h); ctx.closePath(); ctx.fill();
    });
    // Heat seals.
    [h * .03, h * .875].forEach(function (y) {
      var sg = ctx.createLinearGradient(0, y, 0, y + h * .095); sg.addColorStop(0, 'rgba(255,255,255,.24)'); sg.addColorStop(1, 'rgba(255,255,255,.07)');
      ctx.fillStyle = sg; ctx.fillRect(m, y, w - 2 * m, h * .095);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; for (var x = m + 2; x < w - m; x += Math.max(2.4, w / 84)) ctx.fillRect(x, y + 2, 1, h * .095 - 4);
    });
    // Label strip.
    ctx.fillStyle = 'rgba(45,226,184,.88)'; ctx.fillRect(m, h * .83, w - 2 * m, h * .035);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(m, h * .865, w - 2 * m, 1);
    if (rear) { K.barcode(ctx, w * .56, h * .75, w * .3, h * .035, K.seedOf(id + ':bar'), '230,255,248'); }
    K.perforation(ctx, w, h, { dot: '255,255,255' }, rear ? 0 : .3);
  }
  function fanPose(i, w, h, sway) {
    var a = (i - 1) * .17 + Math.sin(sway + i * 1.7) * .012;
    return { x: w / 2 + (i - 1) * w * .105, y: h * .5 + Math.abs(i - 1) * h * .012, r: a };
  }
  function drawPicker(ctx, size, face, t) {
    var w = size.w, h = size.h, cw = w * .46, ch = cw * 1.4, arrive = face.arrive, charge = face.charge;
    var sway = t * .9;
    if (arrive >= 1) {
      // Idle: the three backs sit fanned inside the sleeve, a slow sway and an occasional glint.
      for (var i = 0; i < 3; i++) {
        var p = fanPose(i, w, h, sway), lift = charge * h * .015 * (i - 1) * 0;
        ctx.save(); ctx.translate(p.x, p.y - lift); ctx.rotate(p.r); cardBack(ctx, cw, ch, 1); ctx.restore();
      }
      var gl = (t % 5) / 5;
      if (gl < .3) {
        var gx = mix(w * .2, w * .8, gl / .3), gg = ctx.createLinearGradient(gx - 14, 0, gx + 14, 0);
        gg.addColorStop(0, 'rgba(45,226,184,0)'); gg.addColorStop(.5, 'rgba(180,255,240,.35)'); gg.addColorStop(1, 'rgba(45,226,184,0)');
        ctx.fillStyle = gg; ctx.fillRect(gx - 14, h * .2, 28, h * .56);
      }
      if (charge > 0) {
        // The cards stir: they rise and fan wider as the hold fills.
        var halo = ctx.createRadialGradient(w / 2, h * .5, 0, w / 2, h * .5, w * .55);
        halo.addColorStop(0, 'rgba(45,226,184,' + (.35 * charge).toFixed(3) + ')'); halo.addColorStop(1, 'rgba(45,226,184,0)');
        ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
      }
      return;
    }
    // Arrival: three backs riffle like a magician's overhand, then settle into the sleeve.
    var p = arrive, shuffle = clamp(p / .74), settle = smooth(.72, 1, p), passes = 4, cyc = shuffle * passes, k = Math.floor(cyc), u = cyc - k;
    var pile = [0, 1, 2], order = pile.slice();
    for (var s = 0; s < k; s++) order.push(order.shift());
    var center = { x: w / 2, y: h * .5 };
    // Pile layers, bottom to top.
    var lifted = order[0], rest = order.slice(1).reverse();
    function put(index, x, y, r, a) {
      var fan = fanPose(index, w, h, sway), q = settle;
      ctx.save(); ctx.translate(mix(x, fan.x, q), mix(y, fan.y, q)); ctx.rotate(mix(r, fan.r, q)); cardBack(ctx, cw, ch, a); ctx.restore();
    }
    rest.forEach(function (idx, layer) { put(idx, center.x + (layer - .5) * 1.6, center.y - layer * 1.8, (layer - .5) * .02, 1); });
    // The moving card: lifts, arcs out and drops back under; with a motion trail.
    var moving = u < 1 && shuffle < 1;
    if (moving) {
      for (var gI = 5; gI >= 0; gI--) {
        var uu = Math.max(0, u - gI * .035), arc = Math.sin(uu * Math.PI);
        var ax = center.x + Math.sin(uu * Math.PI) * w * .3 * (k % 2 ? -1 : 1), ay = center.y - arc * h * .17, ar = arc * .5 * (k % 2 ? -1 : 1);
        put(lifted, ax, ay, ar, gI ? .1 + .08 * (5 - gI) / 5 : 1);
      }
      if (u > .88 || u < .06) {
        var burst = u > .88 ? (u - .88) / .12 : 1 - u / .06;
        for (var sp = 0; sp < 8; sp++) {
          var a = sp * TAU / 8 + k, rr = (1 - burst) * w * .22 + 4;
          ctx.strokeStyle = 'rgba(45,226,184,' + (burst * .8).toFixed(3) + ')'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(center.x + Math.cos(a) * rr * .5, center.y + Math.sin(a) * rr * .5); ctx.lineTo(center.x + Math.cos(a) * rr, center.y + Math.sin(a) * rr); ctx.stroke();
        }
      }
    } else put(lifted, center.x, center.y - 3.6, 0, 1);
    // Whole-shuffle flourish: a soft teal ring pulses with each pass.
    var ring = Math.sin(clamp(u) * Math.PI) * (1 - settle);
    ctx.strokeStyle = 'rgba(45,226,184,' + (.28 * ring).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(center.x, center.y, w * (.28 + .1 * u), 0, TAU); ctx.stroke();
  }
  function cutPicker(ctx, size, cut, t) {
    var w = size.w, h = size.h, y = h * C.config.cut.guideY, x0 = cut.min * w, x1 = cut.max * w, life = 1 - (cut.release || 0);
    if (x1 > x0) {
      ctx.strokeStyle = 'rgba(45,226,184,' + (.4 * life).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,255,248,' + life.toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    K.drawCutDots(ctx, size, cut, t, '180,255,240');
  }
  define('picker', {
    paint: paintPicker, ambient: true, nodes: 0, draw: drawPicker, cutDraw: cutPicker, cutRgb: '180,255,240', outline: CHAMFER,
    foil: function (fx) { fx.charge = 0; },
    print: function (layer, pack, rear) {
      var mark = node('div', 'pack-mark', layer, C.config.gameName); mark.dataset.packText = 'wordmark';
      node('div', 'pack-series-mark', layer, 'Series ' + (pack.design.series || '01')).dataset.packText = 'series';
      node('div', 'picker-label', layer, rear ? 'PICK 1 OF 3' : pack.name.toUpperCase());
      if (!rear) node('div', 'picker-glyph', layer, '1/3');
      else {
        node('div', 'pack-rear-title', layer, pack.name);
        var copy = node('div', 'pack-rear-copy', layer);
        ['Three cards shown', 'You keep one'].forEach(function (line) { node('span', '', copy, line); });
        node('div', 'pack-batch', layer, pack.design.batch || '');
      }
    }
  });
  C.packFaces.defineArrival('cardRiffle', { ms: 2600, holdMs: 220, fadeMs: 360 });

  ['titan', 'picker'].forEach(function (id) {
    var skin = C.packSkins && C.packSkins.registry[id], spec = id === 'titan' ? paintTitan : paintPicker;
    if (skin) skin.snapshot = function (g, w, h, pack) { spec(g, w, h, false, pack.id); };
  });
  C.packFaces.cardBack = cardBack;
})(window.Cardable, window);
