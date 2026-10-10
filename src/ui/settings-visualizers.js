/** Live previews for the Settings dock. One canvas, drawn only while Settings is
 *  open and recently used; it shares the game scheduler and holds a still frame
 *  for reduced motion and Very Low animation. Nothing here changes a saved value. */
(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2, node;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function out(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function white(a) { return 'rgba(255,255,255,' + a + ')'; }
  function tierRank(v) { return Math.max(0, C.settingsSchema.tiers.indexOf(v)); }
  function text(g, s, x, y, a, size, align, mono) { var c = g.ctx; c.font = '500 ' + (size || 11) + 'px ' + (mono ? g.mono : g.ui); c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillStyle = white(a == null ? .62 : a); c.fillText(s, x, y); }
  function pointer(g, x, y, a) { var c = g.ctx; c.save(); c.translate(x, y); c.globalAlpha = a == null ? 1 : a; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 15); c.lineTo(4, 11.5); c.lineTo(7, 18); c.lineTo(9.5, 17); c.lineTo(6.6, 10.6); c.lineTo(11.5, 10.6); c.closePath(); c.fillStyle = '#F5F5F7'; c.strokeStyle = 'rgba(8,8,10,.9)'; c.lineWidth = 1.2; c.fill(); c.stroke(); c.restore(); }
  // A small collectible: enough to read as a card without borrowing real artwork.
  function card(g, cx, cy, h, o) {
    o = o || {}; var c = g.ctx, w = h * 5 / 7, x = -w / 2, y = -h / 2, r = h * .075;
    c.save(); c.translate(cx, cy); if (o.rotate) c.rotate(o.rotate); c.scale(o.scaleX == null ? 1 : o.scaleX, 1); c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    for (var s = 0; s < (o.shadows == null ? 2 : o.shadows); s++) { rr(c, x, y + 3 + s * 5, w, h, r); c.fillStyle = 'rgba(0,0,0,' + (.34 - s * .09) + ')'; c.filter = 'blur(' + (4 + s * 6) + 'px)'; c.fill(); c.filter = 'none'; }
    var face = c.createLinearGradient(x, y, x + w, y + h); face.addColorStop(0, o.back ? '#22222a' : '#2a2a32'); face.addColorStop(1, o.back ? '#121217' : '#17171c'); rr(c, x, y, w, h, r); c.fillStyle = face; c.fill();
    c.lineWidth = 1; c.strokeStyle = o.edge || white(.2); c.stroke();
    if (o.back) { rr(c, x + w * .2, y + h * .32, w * .6, h * .36, r * .6); c.strokeStyle = white(.16); c.stroke(); }
    else {
      var art = c.createLinearGradient(x, y, x + w, y + h * .6); art.addColorStop(0, o.tint || 'rgba(' + g.accentRgb + ',.55)'); art.addColorStop(1, 'rgba(' + g.accentRgb + ',.10)'); rr(c, x + w * .1, y + h * .09, w * .8, h * .5, r * .55); c.fillStyle = o.mono ? white(.16) : art; c.fill();
      c.fillStyle = white(.5); rr(c, x + w * .1, y + h * .66, w * .52, h * .045, 2); c.fill(); c.fillStyle = white(.22); rr(c, x + w * .1, y + h * .75, w * .7, h * .03, 2); c.fill(); rr(c, x + w * .1, y + h * .81, w * .44, h * .03, 2); c.fill();
      if (o.serial !== false) { c.fillStyle = white(.34); rr(c, x + w * .62, y + h * .9, w * .28, h * .028, 2); c.fill(); }
      if (o.glare) { c.save(); rr(c, x, y, w, h, r); c.clip(); var gl = c.createLinearGradient(x + w * (o.glare - .35), y, x + w * (o.glare + .25), y + h); gl.addColorStop(0, white(0)); gl.addColorStop(.5, white(.22)); gl.addColorStop(1, white(0)); c.fillStyle = gl; c.fillRect(x, y, w, h); c.restore(); }
    }
    c.restore();
  }
  function pack(g, cx, cy, h, fill) {
    var c = g.ctx, w = h * .68, x = cx - w / 2, y = cy - h / 2; rr(c, x, y, w, h, 7); c.fillStyle = '#1b1b21'; c.fill(); c.strokeStyle = white(.2); c.lineWidth = 1; c.stroke();
    if (fill > 0) { c.save(); rr(c, x, y, w, h, 7); c.clip(); c.fillStyle = 'rgba(' + g.accentRgb + ',.42)'; var top = y + h * (1 - fill); c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, top); for (var i = 0; i <= 8; i++) c.lineTo(x + w * i / 8, top + (g.still ? 0 : Math.sin(g.t * 5 + i) * 1.6)); c.lineTo(x + w, y + h); c.fill(); c.restore(); }
    c.fillStyle = white(.14); c.fillRect(x, y + h * .13, w, 1); c.fillStyle = white(.3); rr(c, cx - w * .22, cy - 3, w * .44, 6, 3); c.fill();
  }
  function keycap(g, label, cx, cy, down, lit) { var c = g.ctx; c.font = '500 11px ' + g.mono; var w = Math.max(30, c.measureText(label).width + 18), y = cy - 12 + (down ? 2 : 0); rr(c, cx - w / 2, y, w, 24, 6); c.fillStyle = lit ? 'rgba(' + g.accentRgb + ',.2)' : white(.07); c.fill(); c.strokeStyle = lit ? g.accent : white(.2); c.lineWidth = 1; c.stroke(); if (!down) { c.fillStyle = white(.12); c.fillRect(cx - w / 2 + 4, y + 24, w - 8, 2); } text(g, label, cx, y + 12.5, lit ? .95 : .7, 11, 'center', true); return w; }
  function dotField(g, v, spacing) {
    var c = g.ctx, count = 0; if (v === 'off') return 0;
    var subtle = v === 'subtle', radius = 78 * (subtle ? .8 : 1), max = .62 * (subtle ? .5 : 1);
    c.fillStyle = C.settings.get('dotTint') === 'accent' ? g.accent : '#fff';
    for (var y = spacing / 2; y < g.h; y += spacing) for (var x = spacing / 2; x < g.w; x += spacing) {
      var dx = x - g.px, dy = y - g.py, d = Math.hypot(dx, dy), e = d < radius ? 1 - smooth(d / radius) : 0, a = e * max;
      g.rings.forEach(function (ring) { var band = 12, rd = Math.abs(d2(x, y, ring) - ring.r); if (rd < band) a = Math.max(a, (1 - rd / band) * ring.a * (subtle ? .5 : 1)); });
      if (a < .02) continue; count++; var lean = subtle || !d ? 0 : 1.2 * e;
      c.globalAlpha = a; c.beginPath(); c.arc(x - dx / (d || 1) * lean, y - dy / (d || 1) * lean, .8 + 1.1 * e, 0, TAU); c.fill();
    }
    c.globalAlpha = 1; return count;
  }
  function d2(x, y, p) { return Math.hypot(x - p.x, y - p.y); }
  function glow(g, size) { var c = g.ctx, r = 62 * size, rgb = C.settings.get('cursorGlowTint') === 'accent' ? g.accentRgb : '255,255,255', light = c.createRadialGradient(g.px, g.py, 0, g.px, g.py, r); light.addColorStop(0, 'rgba(' + rgb + ',.15)'); light.addColorStop(.7, 'rgba(' + rgb + ',0)'); c.fillStyle = light; c.fillRect(g.px - r, g.py - r, r * 2, r * 2); }
  function sparkles(g, n) { var c = g.ctx; for (var i = 0; i < n; i++) { var s = i * 12.9898, x = (Math.sin(s) * 43758.5453 % 1 + 1) % 1 * g.w, sp = .25 + (i % 5) * .08, y = (((Math.sin(s * 1.7) * 9631.11 % 1 + 1) % 1) + (g.still ? 0 : g.t * sp * .12)) % 1; c.globalAlpha = .25 + .5 * Math.abs(Math.sin(g.t * 1.3 + i)); c.fillStyle = i % 4 ? '#fff' : g.accent; c.beginPath(); c.arc(x, g.h * (1 - y), .8 + (i % 3) * .5, 0, TAU); c.fill(); } c.globalAlpha = 1; }
  function chromeMock(g, hide, focus) {
    var c = g.ctx, w = g.w, h = g.h, parts = {
      visibleWordmark: function () { text(g, 'cardable', 22, 22, .9, 15, 'left'); return [16, 10, 82, 24]; },
      visibleCredits: function () { rr(c, w - 122, 12, 66, 20, 10); c.fillStyle = white(.08); c.fill(); text(g, '◈ 1,250', w - 89, 22.5, .8, 10, 'center', true); return [w - 126, 8, 74, 28]; },
      visibleSettings: function () { c.strokeStyle = white(.7); c.lineWidth = 1.3; c.beginPath(); c.arc(w - 32, 22, 6, 0, TAU); c.stroke(); c.beginPath(); c.arc(w - 32, 22, 2, 0, TAU); c.stroke(); return [w - 46, 8, 28, 28]; },
      visibleVersion: function () { text(g, 'v' + C.config.version, w - 32, 40, .4, 8, 'center', true); return [w - 54, 33, 44, 14]; },
      visiblePackCounter: function () { text(g, '3 / 5', w / 2, h - 44, .8, 11, 'center', true); return [w / 2 - 26, h - 54, 52, 20]; },
      visibleStockVials: function () { for (var i = 0; i < 5; i++) { rr(c, w / 2 - 34 + i * 14, h - 32, 10, 5, 2.5); c.fillStyle = i < 3 ? g.accent : white(.16); c.fill(); } return [w / 2 - 40, h - 38, 80, 16]; },
      visibleTimer: function () { text(g, '04:12', w / 2, h - 16, .5, 9, 'center', true); return [w / 2 - 24, h - 25, 48, 18]; },
      visibleInventoryArrow: function () { c.strokeStyle = white(.6); c.lineWidth = 1.4; c.beginPath(); c.moveTo(w - 96, h - 20); c.lineTo(w - 88, h - 26); c.lineTo(w - 80, h - 20); c.stroke(); return [w - 104, h - 36, 32, 26]; },
      visibleAchievements: function () { text(g, '★', w - 132, h - 22, .6, 12, 'center'); return [w - 144, h - 36, 24, 26]; },
      visibleHelp: function () { c.strokeStyle = white(.5); c.lineWidth = 1; c.beginPath(); c.arc(28, h - 22, 8, 0, TAU); c.stroke(); text(g, '?', 28, h - 21.5, .7, 10, 'center', true); return [14, h - 36, 28, 28]; },
      visibleReleaseNotes: function () { rr(c, 46, h - 30, 54, 16, 8); c.fillStyle = white(.07); c.fill(); text(g, 'What’s new', 73, h - 21.5, .6, 8, 'center'); return [42, h - 34, 62, 24]; },
      visibleContextHint: function () { text(g, 'Right-click for more', 22, 44, .36, 8, 'left'); return [16, 35, 96, 18]; },
      visibleMini: function () { rr(c, w - 160, 14, 22, 16, 4); c.strokeStyle = white(.5); c.lineWidth = 1; c.stroke(); return [w - 166, 8, 34, 28]; },
      visibleTooltips: function () { rr(c, w - 112, 44, 76, 18, 5); c.fillStyle = '#1b1b20'; c.fill(); c.strokeStyle = white(.14); c.stroke(); text(g, 'Settings (S)', w - 74, 53.5, .7, 8, 'center'); return [w - 116, 40, 84, 26]; },
      visibleTags: function () { rr(c, w / 2 + 46, h / 2 - 26, 40, 14, 7); c.fillStyle = white(.08); c.fill(); text(g, 'FOIL', w / 2 + 66, h / 2 - 18.5, .7, 8, 'center', true); return [w / 2 + 42, h / 2 - 30, 48, 22]; },
      visibleToastInfo: toast('Copied', 0), visibleToastSuccess: toast('✓ Saved', 1), visibleToastAchievements: toast('★ Unlocked', 2),
      visibleTitleDecorations: function () { c.fillStyle = white(.2); c.fillRect(108, 22, 44, 1); return [104, 14, 52, 16]; }
    };
    function toast(label, i) { return function () { var x = 118 + i * 78; rr(c, x, h - 30, 70, 18, 6); c.fillStyle = '#1b1b20'; c.fill(); c.strokeStyle = white(.14); c.lineWidth = 1; c.stroke(); text(g, label, x + 35, h - 20.5, .7, 8, 'center'); return [x - 4, h - 34, 78, 26]; }; }
    pack(g, w / 2, h / 2 - 6, Math.min(74, h * .5), 0);
    Object.keys(parts).forEach(function (key) {
      if (hide(key)) { if (key !== focus) return; c.save(); c.globalAlpha = .18; var ghost = parts[key](); c.restore(); mark(ghost, true); return; }
      var box = parts[key](); if (key === focus) mark(box, false);
    });
    function mark(b, off) { c.save(); c.setLineDash(off ? [3, 3] : []); rr(c, b[0], b[1], b[2], b[3], 6); c.strokeStyle = off ? white(.4) : g.accent; c.lineWidth = 1.2; c.stroke(); c.restore(); }
  }
  function title(key, value) { var d = C.settingsSchema.entries[key]; return d && d.format ? d.format(value) : String(value); }
  function other(key, current, baseline, fallback) { return current === baseline ? fallback : baseline; }

  // Each preview: kind split (one scene, draggable divider), pair (two panes), single, or card (the real card).
  var views = {
    dots: { kind: 'split', sides: function (v) { return ['off', v === 'off' ? 'on' : v]; }, sim: true, ripple: true,
      draw: function (g, v) { var n = dotField(g, v, 13 * ({ sparse: 1.35, dense: .78 }[C.settings.get('dotDensity')] || 1)); g.count = n; },
      stat: function (g, v) { var p = C.settings.dotsPolicy(), all = p.enabled ? Math.ceil(C.viewport.width / p.spacing) * Math.ceil(C.viewport.height / p.spacing) : 0; return v === 'off' ? 'Off · nothing is drawn' : g.count + ' lit here · ' + all.toLocaleString() + ' on your screen'; } },
    dotDensity: { kind: 'single', sim: true, ripple: true, draw: function (g, v) { g.count = dotField(g, C.settings.get('dots') === 'off' ? 'on' : C.settings.get('dots'), 13 * ({ sparse: 1.35, dense: .78 }[v] || 1)); },
      stat: function (g, v) { var base = C.config.dots.spacing * ({ sparse: 1.35, dense: .78 }[v] || 1); return Math.round(base) + ' px apart · ' + (Math.ceil(C.viewport.width / base) * Math.ceil(C.viewport.height / base)).toLocaleString() + ' dots'; } },
    dotTint: { kind: 'single', sim: true, ripple: true, draw: function (g) { dotField(g, 'on', 13); } },
    cursorGlowTint: { kind: 'single', sim: true, cursor: true, draw: function (g) { glow(g, (C.settings.get('cursorGlowSize') || 100) / 100); } },
    clickRipples: { kind: 'split', sides: function () { return [false, true]; }, sim: true, ripple: true, draw: function (g, v) { var keep = g.rings; if (!v) g.rings = []; dotField(g, 'on', 13); g.rings = keep; }, stat: function () { return 'Click the preview'; } },
    backgroundQuality: { kind: 'split', sides: function (v) { return [other('backgroundQuality', v, 'very-low', 'high'), v]; }, sim: true, ripple: true,
      draw: function (g, v) { var r = tierRank(v); if (!r) return; dotField(g, 'on', 13 * (r === 4 ? .92 : r === 1 ? 1.5 : 1)); if (C.settings.get('cursorGlow')) glow(g, 1); }, stat: function (g, v) { return ['Dots and glow off', 'Sparse dots · 15 Hz', '30 Hz · trails', '60 Hz · three ripples', 'Dense · four ripples'][tierRank(v)]; } },
    cursorGlow: { kind: 'split', sides: function () { return [false, true]; }, sim: true, draw: function (g, v) { rr(g.ctx, g.w * .12, g.h * .3, g.w * .2, g.h * .4, 8); g.ctx.fillStyle = white(.04); g.ctx.fill(); rr(g.ctx, g.w * .66, g.h * .2, g.w * .22, g.h * .6, 8); g.ctx.fill(); if (v) glow(g, (C.settings.get('cursorGlowSize') || 100) / 100); }, cursor: true },
    cursorGlowSize: { kind: 'single', sim: true, cursor: true, draw: function (g, v) { glow(g, v / 100); g.ctx.strokeStyle = white(.14); g.ctx.setLineDash([3, 4]); g.ctx.beginPath(); g.ctx.arc(g.px, g.py, 62 * v / 100 * .7, 0, TAU); g.ctx.stroke(); g.ctx.setLineDash([]); }, stat: function (g, v) { return Math.round(C.config.shell.cursor.glowPx * v / 100) + ' px wide'; } },
    motion: { kind: 'pair', sides: function () { return ['off', 'on']; }, labels: ['Full motion', 'Reduced'],
      draw: function (g, v) { var loop = g.t % 4 / 4, cy = g.h / 2; if (v === 'on') { card(g, g.w / 2, cy, g.h * .7, { alpha: loop < .12 ? smooth(loop / .12) : loop > .88 ? smooth((1 - loop) / .12) : 1, glare: .5 }); return; }
        var enter = out(loop / .22), leave = loop > .85 ? smooth((loop - .85) / .15) : 0; card(g, g.w / 2 + (1 - enter) * -g.w * .5 + leave * g.w * .6, cy + Math.sin(g.t * 2) * 4, g.h * .7, { rotate: (1 - enter) * -.5 + Math.sin(g.t * 1.4) * .07 + leave * .4, glare: .5 + Math.sin(g.t * 1.4) * .5 }); },
      stat: function () { var v = C.settings.get('motion'); return v === 'auto' ? 'Auto · your system asks for ' + (C.motion.reduced ? 'reduced' : 'full') + ' motion' : v === 'on' ? 'Calm fades everywhere' : 'Full motion, ignoring the system'; } },
    fpsLimit: { kind: 'single', draw: function (g, v) {
        var c = g.ctx, hz = C.fx.stats.refreshHz || 60, cap = v === 'display' || v === 'unlimited' ? hz : Math.min(Number(v), hz), lanes = [[hz, 'Your display · ' + hz + ' Hz', .42], [cap, v === 'display' ? 'Following the display' : v === 'unlimited' ? 'Unlimited' : v + ' FPS cap', .95]], x0 = 18, x1 = g.w - 18, span = x1 - x0, slice = .12;
        lanes.forEach(function (lane, i) { var y = g.h * (i ? .7 : .3), frames = Math.max(1, Math.round(lane[0] * slice)), head = (g.still ? .62 : g.t * .45 % 1.25) * span;
          text(g, lane[1], x0, y - 20, i ? .8 : .5, 10, 'left'); text(g, (1000 / lane[0]).toFixed(1) + ' ms', x1, y - 20, i ? .7 : .4, 10, 'right', true);
          c.fillStyle = white(.07); c.fillRect(x0, y + 12, span, 1);
          for (var f = 0; f <= frames; f++) { var x = x0 + head - f / frames * span * .34; if (x < x0 || x > x1) continue; c.globalAlpha = (1 - f / (frames + 1)) * lane[2]; c.fillStyle = i ? g.accent : '#fff'; c.beginPath(); c.arc(x, y, f ? 4 : 6, 0, TAU); c.fill(); c.globalAlpha = (1 - f / (frames + 1)) * .5; c.fillRect(x - .5, y + 9, 1, 6); }
          c.globalAlpha = 1; });
      }, stat: function (g, v) { var hz = C.fx.stats.refreshHz || 60; return v === 'display' ? 'Matches your screen' : v === 'unlimited' ? 'No cap · restart to apply' : Number(v) > hz ? 'Above your ' + hz + ' Hz display' : Math.round(Number(v) / hz * 100) + '% of your display rate'; } },
    quality: { kind: 'card', stat: function (g, v) { return title('quality', v) + (C.settings.customized ? ' · customized' : ''); } },
    finishQuality: { kind: 'card' }, reflectionQuality: { kind: 'card' }, propQuality: { kind: 'card' }, shadowQuality: { kind: 'card' },
    rarityColor: { kind: 'card', stat: function (g, v) { return v === 'mono' ? 'Monochrome' : 'Full color'; } },
    serialOnFront: { kind: 'card' }, tilt: { kind: 'card', stat: function () { return 'Leans up to ' + Math.round(C.settings.tiltPolicy.cap) + '° · hover the card'; } },
    tiltStrength: { kind: 'card', stat: function () { return 'Leans up to ' + Math.round(C.settings.tiltPolicy.cap) + '° · hover the card'; } },
    particleQuality: { kind: 'split', sides: function (v) { return [other('particleQuality', v, 'very-low', 'high'), v]; }, draw: function (g, v) { sparkles(g, [0, 8, 22, 44, 66][tierRank(v)]); card(g, g.w / 2, g.h / 2, g.h * .62, { glare: .5 }); }, stat: function (g, v) { return ['No particles', '15% of full', 'Half of full', 'Full', '150% of full'][tierRank(v)]; } },
    glassQuality: { kind: 'split', sides: function (v) { return [other('glassQuality', v, 'very-low', 'high'), v]; }, draw: function (g, v) { glass(g, [0, 0, 6, 10, 12][tierRank(v)]); }, stat: function (g, v) { return tierRank(v) < 2 ? 'Solid tinted panels' : ['', '', '60% blur', 'Full blur', 'Deep blur'][tierRank(v)]; } },
    reduceTransparency: { kind: 'split', sides: function () { return [false, true]; }, draw: function (g, v) { glass(g, v ? 0 : 10); } },
    animationQuality: { kind: 'pair', sides: function (v) { return [other('animationQuality', v, 'very-low', 'high'), v]; }, draw: function (g, v) { var r = tierRank(v), hz = [0, 15, 30, 60, 60][r], t = hz ? Math.floor(g.t * hz) / hz : 0; card(g, g.w / 2, g.h / 2 + (r ? Math.sin(t * 2) * 5 : 0), g.h * .66, { rotate: r ? Math.sin(t * 1.5) * .09 : 0, glare: r ? .5 + Math.sin(t * 1.5) * .5 : .5 }); }, stat: function (g, v) { return ['Still poses', 'Decorative motion at 15 Hz', '30 Hz', '60 Hz', '60 Hz, finer steps'][tierRank(v)]; } },
    canvasQuality: { kind: 'split', sides: function (v) { return [other('canvasQuality', v, 'very-low', 'high'), v]; }, pixel: function (v) { return [1, 1.25, 1.5, 2, 2.5][tierRank(v)] / 2.5; }, draw: scene, stat: function (g, v) { return 'Up to ' + [1, 1.25, 1.5, 2, 2.5][tierRank(v)] + '× pixels'; } },
    resolutionScale: { kind: 'split', sides: function (v) { return [v === 1 ? .5 : 1, v]; }, pixel: function (v) { return Number(v); }, draw: scene },
    cinematicQuality: { kind: 'split', sides: function (v) { return [other('cinematicQuality', v, 'very-low', 'high'), v]; }, draw: function (g, v) { cinema(g, tierRank(v)); } },
    accentColor: { kind: 'single', draw: function (g) {
        var c = g.ctx, x = g.w / 2 - 150, y = g.h / 2, on = g.still || g.t % 3 < 1.8, k = on ? 1 : 0;
        rr(c, x, y - 12, 44, 24, 12); c.fillStyle = on ? 'rgba(' + g.accentRgb + ',.2)' : white(.06); c.fill(); c.strokeStyle = white(.14); c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(x + 12 + 20 * k, y, 8, 0, TAU); c.fillStyle = on ? g.accent : white(.5); c.fill();
        rr(c, x + 62, y - 14, 120, 28, 9); c.fillStyle = white(.05); c.fill(); rr(c, x + 65, y - 11, 56, 22, 6); c.fillStyle = white(.09); c.fill(); text(g, 'Color', x + 93, y + .5, 1, 10, 'center'); c.fillStyle = g.accent; c.fillText('Color', x + 93, y + .5); text(g, 'Mono', x + 152, y + .5, .5, 10, 'center');
        rr(c, x + 200, y - 4, 100, 8, 4); c.fillStyle = white(.09); c.fill(); rr(c, x + 200, y - 4, 100 * (g.still ? .7 : (g.t * .25 % 1)), 8, 4); c.fillStyle = g.accent; c.fill();
        rr(c, x + 110, y + 26, 80, 24, 8); c.fillStyle = g.accent; c.fill(); c.font = '600 10px ' + g.ui; c.textAlign = 'center'; c.fillStyle = '#08080A'; c.fillText('Apply', x + 150, y + 38.5);
      }, stat: function (g, v) { return C.settings.get('rarityColor') === 'mono' ? 'Monochrome is on · accents stay neutral' : title('accentColor', v); } },
    logoStyle: { kind: 'single', draw: function (g, v) { wordmark(g, v, 'cardable'); }, stat: function (g, v) { return title('logoStyle', v); } },
    logoAnimation: { kind: 'pair', sides: function () { return [false, true]; }, draw: function (g, v) { var word = 'cardable', swaps = C.config.logoMorph; if (v && !g.still) { var i = Math.floor(g.t / .7) % word.length, on = g.t % .7 < .45; if (on && swaps[word[i]]) word = word.slice(0, i) + swaps[word[i]] + word.slice(i + 1); } wordmark(g, C.settings.get('logoStyle'), word, 26); } },
    idleFade: { kind: 'single', draw: function (g, v) {
        var never = v === 'never', wait = never ? 1e9 : Number(v), speed = 4, cycle = never ? 6 : wait / speed + 2.4, t = g.still ? 0 : g.t % cycle, idle = Math.max(0, t - .8) * speed, fade = never ? 0 : smooth((idle - wait) / 1.6);
        g.px = g.w * .3 + Math.min(t, .8) * 60; g.py = g.h * .62; chromeMock(g, function () { return false; }, null);
        if (fade) { g.ctx.save(); g.ctx.globalCompositeOperation = 'destination-out'; g.ctx.fillStyle = 'rgba(0,0,0,' + fade * .9 + ')'; g.ctx.fillRect(0, 0, g.w, 50); g.ctx.fillRect(0, g.h - 58, g.w, 58); g.ctx.restore(); text(g, 'cardable', 22, 22, fade * .5, 11, 'left'); }
        text(g, never ? 'Always visible' : idle < wait ? 'Idle ' + Math.min(wait, idle).toFixed(0) + ' s' : 'Faded', g.w - 18, g.h / 2, .6, 10, 'right', true);
      }, cursor: true, stat: function (g, v) { return v === 'never' ? 'The menu never fades' : 'Fades after ' + v + ' s without input · shown 4× faster'; } },
    interfaceSize: { kind: 'single', draw: function (g, v) { var k = v === 'auto' ? 1 : Number(v) / 100, c = g.ctx, w = 150, h = 84; c.save(); c.translate(g.w / 2, g.h / 2); c.setLineDash([3, 4]); rr(c, -w / 2, -h / 2, w, h, 8); c.strokeStyle = white(.22); c.lineWidth = 1; c.stroke(); c.setLineDash([]); c.scale(k, k); rr(c, -w / 2, -h / 2, w, h, 8); c.fillStyle = white(.05); c.fill(); c.strokeStyle = g.accent; c.stroke(); c.fillStyle = white(.7); rr(c, -w / 2 + 12, -h / 2 + 12, 56, 7, 3); c.fill(); c.fillStyle = white(.25); rr(c, -w / 2 + 12, -h / 2 + 28, 96, 5, 2); c.fill(); rr(c, -w / 2 + 12, -h / 2 + 40, 74, 5, 2); c.fill(); rr(c, w / 2 - 50, h / 2 - 28, 38, 16, 5); c.fillStyle = g.accent; c.fill(); c.restore(); }, stat: function (g, v) { return v === 'auto' ? 'Auto · fits the window' : v + '% · the dashed frame is 100%'; } },
    holdDuration: { kind: 'single', draw: holdScene, stat: function () { return 'Hold ' + (C.settings.holdMs / 1000) + ' s to open'; } },
    toggleHold: { kind: 'single', draw: holdScene, stat: function (g, v) { return v ? 'Press once to start, again to cancel' : 'Keep holding; release cancels'; } },
    openKey: { kind: 'single', draw: holdScene, stat: function (g, v) { return title('openKey', v) + ' opens · ' + (v === 'enter' ? 'Space' : 'Enter') + ' tears'; } },
    keyHints: { kind: 'split', sides: function () { return [false, true]; }, draw: function (g, v) { pack(g, g.w / 2, g.h / 2 - 12, g.h * .52, 0); if (v) { keycap(g, C.settings.holdKey, g.w / 2 - 26, g.h - 22, false, true); text(g, 'hold', g.w / 2 + 18, g.h - 22, .5, 10, 'left'); } } },
    cutAssist: { kind: 'pair', sides: function () { return ['normal', 'easy']; }, draw: function (g, v) { var c = g.ctx, need = v === 'easy' ? .6 : .8, x0 = g.w * .16, x1 = g.w * .84, y = g.h * .42, p = g.still ? need : Math.min(1, g.t % 3 / 1.6), done = p >= need, reach = done ? 1 : p; pack(g, g.w / 2, g.h / 2 + 4, g.h * .62, 0); c.setLineDash([4, 4]); c.strokeStyle = white(.3); c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]); c.strokeStyle = g.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + (x1 - x0) * reach, y); c.stroke(); var mx = x0 + (x1 - x0) * need; c.fillStyle = white(.8); c.fillRect(mx - .5, y - 9, 1, 18); text(g, Math.round(need * 100) + '%', mx, y - 17, .7, 9, 'center', true); if (!done) pointer(g, x0 + (x1 - x0) * p, y); }, stat: function (g, v) { return 'The cut completes itself at ' + (v === 'easy' ? '60' : '80') + '% of the way'; } },
    revealSpeed: { kind: 'pair', sides: function () { return ['normal', 'fast']; }, draw: function (g, v) { var k = v === 'fast' ? .7 : 1, rise = .9 * k, hold = .5 * (v === 'fast' ? .5 : 1), flip = .7 * k, t = g.still ? 9 : g.t % 3.6, y = g.h * .5 + (1 - out(t / rise)) * g.h * .5, f = clamp((t - rise - hold) / flip, 0, 1), sx = Math.cos(f * Math.PI); card(g, g.w / 2, y, g.h * .66, { scaleX: Math.max(.03, Math.abs(sx)), back: sx > 0, glare: .5 }); text(g, ((rise + hold + flip)).toFixed(1) + ' s', g.w / 2, g.h - 10, .5, 9, 'center', true); }, stat: function (g, v) { return v === 'fast' ? 'Rise and flip 30% quicker' : 'The authored pace'; } },
    cutscenes: { kind: 'single', draw: function (g, v) { var c = g.ctx, rows = [['full', 'Full', 1], ['short', 'Short', .46], ['off', 'Calm reveal', .1]], x0 = 96, span = g.w - x0 - 24; rows.forEach(function (row, i) { var y = g.h * (.26 + i * .24), on = row[0] === v; text(g, row[1], x0 - 12, y, on ? .95 : .45, 11, 'right'); rr(c, x0, y - 4, span, 8, 4); c.fillStyle = white(.05); c.fill(); rr(c, x0, y - 4, span * row[2], 8, 4); c.fillStyle = on ? g.accent : white(.2); c.fill(); if (on && !g.still) { var head = x0 + span * row[2] * (g.t * .22 % 1); c.fillStyle = '#fff'; c.beginPath(); c.arc(head, y, 5, 0, TAU); c.fill(); } }); }, stat: function (g, v) { return { full: 'Every beat of the ceremony', 'short': 'The authored short route', off: 'Straight to a calm reveal' }[v]; } },
    strobing: { kind: 'single', draw: function (g, v) { var c = g.ctx, cx = g.w / 2, cy = g.h / 2 - 6; if (v === 'full') { c.strokeStyle = '#F1CF99'; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx, cy - 26); c.lineTo(cx + 28, cy + 22); c.lineTo(cx - 28, cy + 22); c.closePath(); c.stroke(); c.fillStyle = '#F1CF99'; c.fillRect(cx - 1, cy - 8, 2, 16); c.fillRect(cx - 1, cy + 12, 2, 2.5); text(g, 'Rapid flashing is enabled', cx, g.h - 16, .8, 11, 'center'); return; } var p = g.still ? .5 : .5 + .5 * Math.sin(g.t * 1.2); c.strokeStyle = 'rgba(' + g.accentRgb + ',' + (.35 + p * .3) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 20 + p * 5, 0, TAU); c.stroke(); c.fillStyle = 'rgba(' + g.accentRgb + ',.18)'; c.beginPath(); c.arc(cx, cy, 14, 0, TAU); c.fill(); text(g, 'Brightness changes stay limited', cx, g.h - 16, .7, 11, 'center'); } },
    performanceMode: { kind: 'single', draw: overlayScene, stat: function (g, v) { return { off: 'Hidden', simple: 'Frame rate only', advanced: 'Frame times, memory and counts' }[v]; } },
    performanceCorner: { kind: 'single', draw: overlayScene },
    unfocusedMode: { kind: 'single', draw: function (g, v) { windows(g, { normal: ['Running', 1], '30': ['30 FPS', .7], pause: ['Paused', .25] }[v], 'Another app'); } },
    backgroundMode: { kind: 'single', draw: function (g, v) { windows(g, v === 'timer' ? ['Timer only', .35] : ['Asleep', .15], 'Hidden tab'); }, stat: function () { return 'Packs keep refilling either way'; } },
    uiAnimationSpeed: { kind: 'single', draw: function (g, v) { var ms = 500 / v, t = g.still ? 1 : clamp(g.t * 1000 % (ms + 900) / ms, 0, 1), c = g.ctx, w = 130, h = g.h * .56; rr(c, g.w / 2 - w / 2, g.h * .22 + (1 - out(t)) * 26, w, h, 10); c.globalAlpha = out(t); c.fillStyle = white(.07); c.fill(); c.strokeStyle = white(.18); c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; text(g, Math.round(ms) + ' ms', g.w / 2, g.h - 12, .6, 10, 'center', true); }, stat: function (g, v) { return Number(v).toFixed(1) + '× · cutscenes keep their own timing'; } },
    hoverAnimations: { kind: 'split', sides: function () { return [false, true]; }, sim: true, cursor: true, draw: function (g, v) { var c = g.ctx; [0, 1, 2].forEach(function (i) { var x = g.w * (.2 + i * .3), y = g.h / 2, near = Math.abs(g.px - x) < 44 && Math.abs(g.py - y) < 26, lift = v && near ? -2 : 0; rr(c, x - 40, y - 14 + lift, 80, 28, 9); c.fillStyle = white(near ? .1 : .05); c.fill(); c.strokeStyle = white(near ? .28 : .12); c.lineWidth = 1; c.stroke(); text(g, ['Keep', 'Flip', 'Inspect'][i], x, y + lift + .5, .8, 10, 'center'); }); } },
    highContrast: { kind: 'split', sides: function () { return [false, true]; }, draw: function (g, v) { var c = g.ctx, x = g.w / 2 - 100, y = g.h / 2 - 30; rr(c, x, y, 200, 60, 10); c.fillStyle = v ? '#000' : white(.04); c.fill(); c.strokeStyle = white(v ? .6 : .12); c.lineWidth = v ? 1.5 : 1; c.stroke(); text(g, 'Legendary pull', x + 16, y + 22, v ? 1 : .86, 13, 'left'); text(g, 'Kept 2 minutes ago', x + 16, y + 42, v ? .9 : .5, 10, 'left'); } },
    largerText: { kind: 'split', sides: function () { return [false, true]; }, draw: function (g, v) { text(g, 'Legendary pull', g.w / 2, g.h / 2 - 10, .9, v ? 17 : 14, 'center'); text(g, 'Kept 2 minutes ago', g.w / 2, g.h / 2 + 14, .5, v ? 13 : 11, 'center'); } },
    focusEmphasis: { kind: 'split', sides: function () { return [false, true]; }, draw: function (g, v) { var c = g.ctx; [0, 1].forEach(function (i) { var x = g.w / 2 - 92 + i * 104; rr(c, x, g.h / 2 - 15, 80, 30, 9); c.fillStyle = white(.06); c.fill(); c.strokeStyle = white(.14); c.lineWidth = 1; c.stroke(); text(g, i ? 'Delete' : 'Keep', x + 40, g.h / 2 + .5, .8, 11, 'center'); }); rr(c, g.w / 2 - 96, g.h / 2 - 19, 88, 38, 12); c.strokeStyle = white(v ? 1 : .7); c.lineWidth = v ? 3.5 : 2; c.stroke(); } }
  };
  function scene(g) { var c = g.ctx; c.strokeStyle = white(.8); c.lineWidth = 1.5; c.beginPath(); c.arc(g.w / 2, g.h / 2, g.h * .3, 0, TAU); c.stroke(); for (var i = -6; i < 16; i++) { c.strokeStyle = white(.22); c.lineWidth = 1; c.beginPath(); c.moveTo(i * 44 + (g.still ? 0 : g.t * 6 % 44), 0); c.lineTo(i * 44 + g.h * .7 + (g.still ? 0 : g.t * 6 % 44), g.h); c.stroke(); } c.fillStyle = 'rgba(' + g.accentRgb + ',.7)'; c.beginPath(); c.arc(g.w / 2, g.h / 2, g.h * .12, 0, TAU); c.fill(); }
  function glass(g, blur) { var c = g.ctx, t = g.still ? 0 : g.t; [[.3, .4, '173,196,255'], [.6, .62, '243,173,184'], [.78, .3, '154,220,192']].forEach(function (b, i) { c.fillStyle = 'rgba(' + b[2] + ',.75)'; c.beginPath(); c.arc(g.w * b[0] + Math.sin(t * .7 + i * 2) * 14, g.h * b[1] + Math.cos(t * .6 + i) * 8, 22, 0, TAU); c.fill(); }); var x = g.w * .14, y = g.h * .18, w = g.w * .72, h = g.h * .64; if (blur) { c.save(); rr(c, x, y, w, h, 12); c.clip(); c.filter = 'blur(' + blur + 'px)'; c.drawImage(c.canvas, 0, 0, c.canvas.width, c.canvas.height, 0, 0, g.w, g.h); c.filter = 'none'; c.fillStyle = white(.07); c.fillRect(x, y, w, h); c.restore(); } else { rr(c, x, y, w, h, 12); c.fillStyle = '#17171b'; c.fill(); } rr(c, x, y, w, h, 12); c.strokeStyle = white(.18); c.lineWidth = 1; c.stroke(); c.fillStyle = white(.7); rr(c, x + 16, y + 16, 70, 7, 3); c.fill(); c.fillStyle = white(.3); rr(c, x + 16, y + 32, 120, 5, 2); c.fill(); }
  function cinema(g, r) { var c = g.ctx, t = g.still ? 0 : g.t; for (var i = 0; i < [10, 26, 60, 120, 190][r]; i++) { var s = i * 7.13; c.globalAlpha = .2 + .6 * ((Math.sin(s * 3.3) + 1) / 2) * (r > 1 ? .6 + .4 * Math.sin(t * 2 + i) : 1); c.fillStyle = '#fff'; c.fillRect(((Math.sin(s) * 43758.5 % 1 + 1) % 1) * g.w, ((Math.sin(s * 1.9) * 9631.1 % 1 + 1) % 1) * g.h, r > 2 ? 1.2 : 1, r > 2 ? 1.2 : 1); } c.globalAlpha = 1; var cx = g.w / 2, cy = g.h / 2, R = g.h * .22; if (r > 1) { var halo = c.createRadialGradient(cx, cy, R * .6, cx, cy, R * (r > 2 ? 2.6 : 1.8)); halo.addColorStop(0, 'rgba(' + g.accentRgb + ',.35)'); halo.addColorStop(1, 'rgba(' + g.accentRgb + ',0)'); c.fillStyle = halo; c.fillRect(0, 0, g.w, g.h); } var body = c.createRadialGradient(cx - R * .4, cy - R * .4, 1, cx, cy, R); body.addColorStop(0, r ? '#dfe6ff' : '#b9b9c0'); body.addColorStop(1, r ? 'rgba(' + g.accentRgb + ',.5)' : '#55555c'); c.fillStyle = body; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); if (r > 2) { c.strokeStyle = white(.5); c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, cy, R * 1.8, R * .42, -.3 + Math.sin(t * .4) * .04, 0, TAU); c.stroke(); if (r > 3) { c.strokeStyle = white(.22); c.beginPath(); c.ellipse(cx, cy, R * 2.15, R * .52, -.3 + Math.sin(t * .4) * .04, 0, TAU); c.stroke(); } } }
  function wordmark(g, style, word, size) { var c = g.ctx, mono = C.settings.get('rarityColor') === 'mono'; size = size || Math.min(44, g.h * .34); c.font = '600 ' + size + 'px ' + g.ui; c.textAlign = 'center'; c.textBaseline = 'middle'; var w = c.measureText(word).width, x = g.w / 2, y = g.h / 2, x0 = x - w / 2, fill = '#F5F5F7', grad;
    function stops(a, b, colors) { grad = c.createLinearGradient(a[0], a[1], b[0], b[1]); colors.forEach(function (color, i) { grad.addColorStop(i / (colors.length - 1), color); }); return grad; }
    if (style === 'chrome' || mono && (style === 'prism' || style === 'ember')) fill = stops([0, y - size / 2], [0, y + size / 2], ['#FFFFFF', '#B9B9C0', '#F5F5F7', '#8E8E93']);
    else if (style === 'prism') fill = stops([x0, y - size / 2], [x0 + w, y + size / 2], ['#ADC4FF', '#C7A9FF', '#F3ADB8', '#F1CF99', '#9ADCC0']);
    else if (style === 'ember') fill = stops([0, y - size / 2], [0, y + size / 2], ['#FFE9C2', '#F1CF99', '#F3ADB8']);
    else if (style === 'neon') { fill = g.accent; c.shadowColor = g.accent; c.shadowBlur = 16; }
    if (style === 'outline' || style === 'ghost') { c.lineWidth = 1.2; c.strokeStyle = white(style === 'ghost' ? .5 : .95); c.strokeText(word, x, y); if (style === 'ghost') { c.fillStyle = white(.14); c.fillText(word, x, y); } }
    else { c.fillStyle = fill; c.fillText(word, x, y); }
    c.shadowBlur = 0; }
  function holdScene(g) { var ms = C.settings.holdMs / 1000, toggle = C.settings.get('toggleHold'), loop = ms + 1.6, t = g.still ? ms * .6 : g.t % loop, p = clamp((t - .4) / ms, 0, 1), down = t > .4 && t < .4 + ms, cx = g.w / 2; pack(g, cx - 54, g.h / 2, g.h * .66, t > .4 ? p : 0); if (p >= 1) { g.ctx.strokeStyle = 'rgba(' + g.accentRgb + ',' + (1 - clamp((t - .4 - ms) / .8, 0, 1)) + ')'; g.ctx.lineWidth = 2; g.ctx.beginPath(); g.ctx.arc(cx - 54, g.h / 2, 30 + (t - .4 - ms) * 50, 0, TAU); g.ctx.stroke(); } keycap(g, C.settings.holdKey, cx + 50, g.h / 2 - 8, toggle ? t > .4 && t < .7 : down, down); text(g, toggle ? 'tap once' : 'hold ' + ms + ' s', cx + 50, g.h / 2 + 24, .5, 10, 'center'); text(g, Math.round(p * 100) + '%', cx - 54, g.h - 10, .6, 9, 'center', true); }
  function overlayScene(g) { var c = g.ctx, mode = C.settings.get('performanceMode'), corner = C.settings.get('performanceCorner'), adv = mode === 'advanced', w = adv ? 96 : 58, h = adv ? 58 : 22, x = /left/.test(corner) ? 28 : g.w - 28 - w, y = /top/.test(corner) ? 22 : g.h - 22 - h; rr(c, 14, 10, g.w - 28, g.h - 20, 10); c.strokeStyle = white(.14); c.lineWidth = 1; c.stroke(); pack(g, g.w / 2, g.h / 2, g.h * .46, 0); if (mode === 'off') { c.setLineDash([3, 3]); rr(c, x, y, w, h, 6); c.strokeStyle = white(.2); c.stroke(); c.setLineDash([]); return; } rr(c, x, y, w, h, 6); c.fillStyle = '#17171b'; c.fill(); c.strokeStyle = g.accent; c.stroke(); text(g, Math.round(C.fx.stats.targetFps || 60) + ' FPS', x + 9, y + 11.5, .9, 10, 'left', true); if (adv) { c.strokeStyle = 'rgba(' + g.accentRgb + ',.8)'; c.beginPath(); for (var i = 0; i < 16; i++) { var yy = y + 40 - (Math.sin(i * 1.7 + (g.still ? 0 : g.t * 3)) * 5 + 6); if (i) c.lineTo(x + 9 + i * 5.2, yy); else c.moveTo(x + 9, yy); } c.stroke(); } }
  function windows(g, state, front) { var c = g.ctx, x = g.w / 2 - 120; rr(c, x, g.h * .16, 150, g.h * .62, 9); c.fillStyle = '#121216'; c.fill(); c.strokeStyle = white(.16); c.lineWidth = 1; c.stroke(); c.globalAlpha = state[1]; pack(g, x + 75, g.h * .5, g.h * .36, 0); c.globalAlpha = 1; text(g, 'Cardable · ' + state[0], x + 10, g.h * .16 + 11, .7, 9, 'left'); rr(c, x + 96, g.h * .32, 146, g.h * .56, 9); c.fillStyle = '#1d1d23'; c.fill(); c.strokeStyle = white(.3); c.stroke(); text(g, front, x + 108, g.h * .32 + 12, .8, 9, 'left'); c.fillStyle = white(.12); for (var i = 0; i < 3; i++) { rr(c, x + 108, g.h * .32 + 26 + i * 12, 96 - i * 18, 5, 2); c.fill(); } }
  Object.keys(C.settingsSchema.entries).forEach(function (key) { if (/^visible[A-Z]/.test(key) && !C.settingsSchema.entries[key].retired) views[key] = { kind: 'single', draw: function (g) { chromeMock(g, function (k) { return C.settings.get(k) === false; }, key); }, stat: function (g, v) { return v ? 'Shown' : 'Hidden'; } }; });
  ['skipAllCutscenes', 'playCutscenesOnce'].forEach(function (key) { views[key] = { kind: 'single', draw: function (g) { views.cutscenes.draw(g, C.settings.get('skipAllCutscenes') ? 'off' : C.settings.get('cutscenes')); } }; });

  C.settingsViz = { views: views, create: function (host) {
    node = C.packMarkup.node;
    var dock = node('aside', 'cbs-dock', host); dock.setAttribute('aria-label', 'Setting preview');
    var head = node('header', 'cbs-dock-head', dock), eyebrow = node('span', 'cbs-dock-eyebrow', head, 'Preview'), name = node('strong', 'cbs-dock-name', head), stat = node('span', 'cbs-dock-stat', head), fold = node('button', 'cbs-dock-fold', head); fold.type = 'button'; fold.appendChild(C.icons.create('chevron'));
    fold.addEventListener('click', function () { C.settings.set('settingsPreviews', C.settings.get('settingsPreviews') === false); });
    function folded() { var off = C.settings.get('settingsPreviews') === false; dock.dataset.collapsed = String(off); fold.setAttribute('aria-expanded', String(!off)); fold.setAttribute('aria-label', off ? 'Show preview' : 'Hide preview'); fold.title = off ? 'Show preview' : 'Hide preview'; }
    var stage = node('div', 'cbs-dock-stage', dock), canvas = node('canvas', 'cbs-dock-canvas', stage), ctx = canvas.getContext('2d'); canvas.setAttribute('aria-hidden', 'true');
    var tags = [node('span', 'cbs-dock-tag', stage), node('span', 'cbs-dock-tag cbs-dock-tag--end', stage)];
    var divider = node('div', 'cbs-dock-divider', stage); divider.tabIndex = 0; divider.setAttribute('role', 'slider'); divider.setAttribute('aria-label', 'Comparison position'); divider.setAttribute('aria-valuemin', 0); divider.setAttribute('aria-valuemax', 100);
    var cardHost = node('div', 'cbs-dock-card', stage);
    var key = null, view = null, pending = {}, split = .5, dragging = false, real = null, sim = { x: 0, y: 0 }, rings = [], lastPoke = 0, clock = 0, dirty = true, w = 0, h = 0, dpr = 1, buffer = null, lastRing = 0, statText = '', theme = null;
    function value(k) { return Object.prototype.hasOwnProperty.call(pending, k) ? pending[k] : C.settings.get(k); }
    function size() { var r = stage.getBoundingClientRect(), zoom = stage.offsetWidth ? r.width / stage.offsetWidth : 1; w = stage.clientWidth; h = stage.clientHeight; dpr = Math.min(2, (root.devicePixelRatio || 1) * (zoom || 1)); canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr)); dirty = true; }
    function local(event) { var r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) / r.width * w, y: (event.clientY - r.top) / r.height * h }; }
    function poke() { lastPoke = root.performance.now(); dirty = true; C.fx.wake(); }
    function show(next) {
      var d = C.settingsSchema.entries[next]; if (!d || next === key && view) return;
      key = next; view = views[next] || null; name.textContent = d.label; rings = []; pending = {};
      dock.dataset.kind = view ? view.kind : 'none'; dock.dataset.key = next;
      var sides = view && view.sides ? view.sides(value(key)) : null;
      divider.hidden = !view || view.kind !== 'split'; tags.forEach(function (tag) { tag.hidden = !sides; });
      cardHost.hidden = !view || view.kind !== 'card'; canvas.hidden = !view || view.kind === 'card';
      poke(); paint(root.performance.now(), 0);
    }
    function labels(sides) { var names = view.labels || sides.map(function (v) { return typeof v === 'boolean' ? (v ? 'On' : 'Off') : title(key, v); }); tags[0].textContent = names[0]; tags[1].textContent = names[1]; }
    function paint(now, dt) {
      dirty = false; if (!view || view.kind === 'card' || !w) { statText = view && view.stat ? view.stat({}, value(key)) : ''; stat.textContent = statText || ''; return; }
      var still = C.motion.reduced || C.settings.policy.animation === 0; if (!still) clock += dt / 1000;
      if (!theme) { var style = root.getComputedStyle(root.document.documentElement); theme = [style.getPropertyValue('--accent').trim() || '#ADC4FF', style.getPropertyValue('--accent-rgb').trim() || '173,196,255']; }
      var g = { ctx: ctx, w: w, h: h, t: clock, still: still, rings: rings, accent: theme[0], accentRgb: theme[1], ui: 'Inter, system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
      sim.x = w * (.5 + .4 * Math.sin(clock * .8)); sim.y = h * (.5 + .28 * Math.sin(clock * 1.5 + 1));
      g.px = real ? real.x : still ? w * .5 : sim.x; g.py = real ? real.y : still ? h * .5 : sim.y;
      if (view.ripple && !still && !real && clock - lastRing > 2.6) { lastRing = clock; rings.push({ x: g.px, y: g.py, born: clock }); }
      rings = g.rings = rings.filter(function (ring) { ring.r = (clock - ring.born) * 150; ring.a = .5 * (1 - (clock - ring.born) / 1.1); return ring.a > 0; });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var current = value(key), sides = view.sides ? view.sides(current) : [current];
      function pane(v, x, width, whole) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, 0, width, h); ctx.clip();
        var sub = Object.assign({}, g, { count: 0 }); if (!whole) { ctx.translate(x, 0); sub.w = width; sub.px = g.px - x; }
        if (view.pixel && view.pixel(v) < 1) { var k = view.pixel(v) * .5; buffer = buffer || root.document.createElement('canvas'); buffer.width = Math.max(1, Math.round(w * k)); buffer.height = Math.max(1, Math.round(h * k)); var b = buffer.getContext('2d'); b.setTransform(k, 0, 0, k, 0, 0); b.clearRect(0, 0, w, h); view.draw(Object.assign({}, sub, { ctx: b }), v); ctx.imageSmoothingEnabled = false; ctx.drawImage(buffer, 0, 0, buffer.width, buffer.height, 0, 0, w, h); ctx.imageSmoothingEnabled = true; }
        else view.draw(sub, v);
        g.count = sub.count; ctx.restore();
      }
      if (view.kind === 'split') { pane(sides[0], 0, w * split, true); var left = g.count; pane(sides[1], w * split, w * (1 - split), true); g.count = current === sides[0] ? left : g.count; labels(sides); }
      else if (view.kind === 'pair') { pane(sides[0], 0, w / 2, false); pane(sides[1], w / 2, w / 2, false); ctx.fillStyle = white(.1); ctx.fillRect(w / 2 - .5, 12, 1, h - 24); labels(sides); }
      else pane(current, 0, w, true);
      if (view.cursor || view.sim) pointer(g, g.px, g.py, real ? 0 : .9);
      statText = view.stat ? view.stat(g, current) : ''; if (stat.textContent !== statText) stat.textContent = statText || '';
      divider.style.left = split * 100 + '%'; divider.setAttribute('aria-valuenow', Math.round(split * 100));
    }
    function drag(event) { split = clamp(local(event).x / w, .08, .92); dirty = true; C.fx.wake(); }
    divider.addEventListener('pointerdown', function (event) { dragging = true; divider.setPointerCapture(event.pointerId); drag(event); event.preventDefault(); });
    divider.addEventListener('pointermove', function (event) { if (dragging) drag(event); });
    ['pointerup', 'pointercancel'].forEach(function (type) { divider.addEventListener(type, function () { dragging = false; }); });
    C.keys.listen(divider, 'keydown', 'settings.preview.divider', function (event) { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); split = clamp(split + (event.key === 'ArrowLeft' ? -.05 : .05), .08, .92); poke(); });
    canvas.addEventListener('pointermove', function (event) { real = local(event); poke(); });
    canvas.addEventListener('pointerleave', function () { real = null; poke(); });
    canvas.addEventListener('pointerdown', function (event) { if (!view || !view.ripple || C.motion.reduced) return; var p = local(event); rings.push({ x: p.x, y: p.y, born: clock }); poke(); });
    var observer = new root.ResizeObserver(function () { size(); C.fx.wake(); }); observer.observe(stage);
    var stops = [C.settings.onChange('*', function (v, k) { delete pending[k]; theme = null; if (k === 'settingsPreviews') { folded(); dirty = true; } poke(); }), C.events.on('settings:preview', function (event) { pending[event.key] = event.value; poke(); }), C.events.on('motion:changed', poke)];
    folded();
    return { el: dock, card: cardHost, show: show, poke: poke, get key() { return key; },
      // Animate for a few seconds after the last interaction, then rest on a still frame.
      update: function (now, dt) { if (dock.dataset.collapsed === 'true' || !view) return false; if (!w) size(); var live = !C.motion.reduced && C.settings.policy.animation > 0 && view.kind !== 'card' && now - lastPoke < 8000; if (live || dirty) paint(now, dt); return live; },
      destroy: function () { observer.disconnect(); stops.forEach(function (stop) { stop(); }); dock.remove(); } };
  } };
})(window.Cardable, window);
