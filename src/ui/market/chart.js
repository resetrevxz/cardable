/* Cardable Market — one chart renderer.
 * Plain SVG drawn once per data or size change; the crosshair is a single group moved on pointer input.
 * No chart exists per feed item. Candles differ from wicks by shape as well as hue, so mono keeps them readable. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, doc = root.document, NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, parent) {
    var e = doc.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(min, max, count) {
    var span = max - min || 1, step = Math.pow(10, Math.floor(Math.log10(span / count))), err = span / count / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var start = Math.ceil(min / step) * step, out = [];
    for (var v = start; v <= max + 1e-9; v += step) out.push(v);
    return out;
  }
  function pointLabel(index, count, windowId) {
    var w = C.market.core.WINDOWS[windowId] || C.market.core.WINDOWS['7d'];
    var hoursAgo = Math.round((count - 1 - index) * w.bucket);
    if (hoursAgo <= 0) return 'Now';
    if (hoursAgo < 24) return hoursAgo + ' h ago';
    return Math.round(hoursAgo / 24) + ' d ago';
  }

  function create(options) {
    var state = { candles: [], type: 'line', window: '7d', unit: 'Credits', label: 'Price' };
    var wrap = h('figure.mk-chart', { tabindex: '0', role: 'group' });
    var surface = h('div.mk-chart-plotarea');
    var svg = s('svg', { class: 'mk-chart-svg', role: 'img', preserveAspectRatio: 'none' });
    var tip = h('div.mk-chart-tip', { role: 'status', 'aria-live': 'off', hidden: true });
    var badge = h('span.mk-chart-badge', { text: 'Illustrative' });
    surface.append(svg, tip, badge);
    var table = h('details.mk-chart-table', h('summary', { text: 'View the data as a table' }));
    wrap.append(surface, table);
    var width = 600, height = options.height || 340, cross = null, hover = -1;
    var m = { l: 8, r: 56, t: 14, b: 22 };

    function layout() {
      var n = state.candles.length;
      var lows = state.candles.map(function (c) { return state.type === 'candles' ? c.low : Math.min(c.open, c.close); });
      var highs = state.candles.map(function (c) { return state.type === 'candles' ? c.high : Math.max(c.open, c.close); });
      var min = Math.min.apply(null, lows), max = Math.max.apply(null, highs), pad = (max - min) * 0.1 || max * 0.02;
      min = Math.max(0, min - pad); max += pad;
      var plotH = height - m.t - m.b, volH = plotH * 0.18, priceH = plotH - volH - 8;
      var volMax = Math.max.apply(null, state.candles.map(function (c) { return c.volume; })) || 1;
      var plotW = width - m.l - m.r;
      return {
        n: n, min: min, max: max, plotW: plotW, priceH: priceH, volH: volH, volMax: volMax,
        x: function (i) { return m.l + (n <= 1 ? 0 : i / (n - 1)) * plotW; },
        y: function (v) { return m.t + (1 - (v - min) / (max - min)) * priceH; },
        vy: function (v) { return height - m.b - v / volMax * volH; },
        slot: n <= 1 ? plotW : plotW / (n - 1)
      };
    }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('width', width); svg.setAttribute('height', height);
      if (!state.candles.length) return;
      var L = layout();
      var defs = s('defs', null, svg), grad = s('linearGradient', { id: 'mk-fill-' + options.id, x1: '0', x2: '0', y1: '0', y2: '1' }, defs);
      s('stop', { offset: '0', 'stop-color': 'var(--accent)', 'stop-opacity': '.20' }, grad); s('stop', { offset: '1', 'stop-color': 'var(--accent)', 'stop-opacity': '0' }, grad);
      var grid = s('g', { class: 'mk-chart-grid' }, svg);
      var decimals = (L.max - L.min) < 12 ? 1 : 0;
      niceTicks(L.min, L.max, 4).forEach(function (v) {
        var y = L.y(v);
        s('line', { x1: m.l, x2: width - m.r, y1: y, y2: y }, grid);
        var t = s('text', { x: width - m.r + 8, y: y + 3.5 }, grid); t.textContent = decimals ? v.toFixed(1) : ui.fmt.credits(v);
      });
      var last = state.candles[state.candles.length - 1], first = state.candles[0];
      var up = last.close >= first.open;
      var plot = s('g', { class: 'mk-chart-plot', 'data-dir': up ? 'up' : 'down' }, svg);
      // volume
      var vg = s('g', { class: 'mk-chart-volume' }, plot), bw = Math.max(1, Math.min(14, L.slot * 0.6));
      state.candles.forEach(function (c, i) { s('rect', { x: L.x(i) - bw / 2, y: L.vy(c.volume), width: bw, height: Math.max(1, height - m.b - L.vy(c.volume)), rx: 1 }, vg); });
      if (state.type === 'line') {
        var d = '', area = '';
        state.candles.forEach(function (c, i) { var x = L.x(i), y = L.y(c.close); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); });
        area = d + 'L' + L.x(L.n - 1).toFixed(1) + ' ' + (m.t + L.priceH) + 'L' + L.x(0).toFixed(1) + ' ' + (m.t + L.priceH) + 'Z';
        s('path', { d: area, class: 'mk-chart-area', fill: 'url(#mk-fill-' + options.id + ')' }, plot);
        s('path', { d: d, class: 'mk-chart-line', fill: 'none' }, plot);
      } else {
        var cw = Math.max(2, Math.min(16, L.slot * 0.62));
        state.candles.forEach(function (c, i) {
          var x = L.x(i), bull = c.close >= c.open, top = L.y(Math.max(c.open, c.close)), bottom = L.y(Math.min(c.open, c.close));
          var g = s('g', { class: 'mk-candle', 'data-dir': bull ? 'up' : 'down' }, plot);
          s('line', { x1: x, x2: x, y1: L.y(c.high), y2: L.y(c.low) }, g);
          s('rect', { x: x - cw / 2, y: top, width: cw, height: Math.max(1.5, bottom - top), rx: 1 }, g);
        });
      }
      var lastY = L.y(last.close);
      s('line', { x1: m.l, x2: width - m.r, y1: lastY, y2: lastY, class: 'mk-chart-last' }, svg);
      var tag = s('g', { class: 'mk-chart-lasttag', transform: 'translate(' + (width - m.r + 4) + ',' + (lastY - 9) + ')' }, svg);
      s('rect', { width: m.r - 6, height: 18, rx: 4 }, tag);
      var tl = s('text', { x: 6, y: 12.5 }, tag); tl.textContent = decimals ? last.close.toFixed(1) : ui.fmt.credits(last.close);
      cross = s('g', { class: 'mk-chart-cross', visibility: 'hidden' }, svg);
      s('line', { class: 'mk-chart-cross-line', y1: m.t, y2: height - m.b }, cross); s('circle', { r: 4 }, cross);
      if (hover >= 0) show(hover);
    }
    function summary() {
      var c = state.candles; if (!c.length) return 'No data';
      var first = c[0].open, last = c[c.length - 1].close, hi = Math.max.apply(null, c.map(function (x) { return x.high; })), lo = Math.min.apply(null, c.map(function (x) { return x.low; }));
      return state.label + ' over ' + (C.market.core.WINDOWS[state.window] || {}).label + ': from ' + ui.fmt.exact(first) + ' to ' + ui.fmt.exact(last) + ' ' + state.unit + ', high ' + ui.fmt.exact(hi) + ', low ' + ui.fmt.exact(lo) + '. Illustrative sample data.';
    }
    function show(i) {
      if (!cross || !state.candles.length) return;
      i = Math.max(0, Math.min(state.candles.length - 1, i)); hover = i;
      var L = layout(), c = state.candles[i], x = L.x(i), y = L.y(c.close);
      cross.setAttribute('visibility', 'visible');
      cross.querySelector('line').setAttribute('x1', x); cross.querySelector('line').setAttribute('x2', x);
      var dot = cross.querySelector('circle'); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      var rect = surface.getBoundingClientRect(), sx = rect.width / width;
      tip.hidden = false;
      ui.clear(tip);
      tip.append(h('strong', { text: pointLabel(i, state.candles.length, state.window) }),
        h('span', { text: 'Close ' + ui.fmt.exact(c.close) }),
        state.type === 'candles' ? h('span', { text: 'O ' + ui.fmt.credits(c.open) + ' · H ' + ui.fmt.credits(c.high) + ' · L ' + ui.fmt.credits(c.low) }) : null,
        h('span', { text: 'Volume ' + c.volume }));
      var left = x * sx + 12; if (left + 170 > rect.width) left = x * sx - 182;
      tip.style.left = Math.max(4, left) + 'px'; tip.style.top = '10px';
      tip.setAttribute('aria-live', 'polite');
    }
    function hide() { hover = -1; if (cross) cross.setAttribute('visibility', 'hidden'); tip.hidden = true; tip.setAttribute('aria-live', 'off'); }
    var pending = 0;
    surface.addEventListener('pointermove', function (e) {
      if (pending) return;
      var cx = e.clientX;
      pending = root.requestAnimationFrame(function () {
        pending = 0;
        var rect = surface.getBoundingClientRect(), L = layout(), px = (cx - rect.left) / rect.width * width;
        var i = Math.round((px - m.l) / (L.plotW || 1) * (L.n - 1));
        show(i);
      });
    });
    surface.addEventListener('pointerleave', hide);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show((hover < 0 ? state.candles.length - 1 : hover) + (e.key === 'ArrowLeft' ? -1 : 1)); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); } else if (e.key === 'End') { e.preventDefault(); show(state.candles.length - 1); }
      else if (e.key === 'Escape' && hover >= 0) { e.preventDefault(); e.stopPropagation(); hide(); }
    });
    wrap.addEventListener('blur', hide);
    var ro = root.ResizeObserver ? new root.ResizeObserver(function (entries) {
      var w = Math.max(240, Math.floor(entries[0].contentRect.width));
      if (w !== width) { width = w; draw(); }
    }) : null;
    if (ro) ro.observe(surface);
    function fillTable() {
      var old = table.querySelector('table'); if (old) old.remove();
      var t = h('table', h('thead', h('tr', h('th', { text: 'When' }), h('th', { text: 'Open' }), h('th', { text: 'High' }), h('th', { text: 'Low' }), h('th', { text: 'Close' }), h('th', { text: 'Volume' }))));
      var body = h('tbody');
      state.candles.forEach(function (c, i) { body.appendChild(h('tr', h('td', { text: pointLabel(i, state.candles.length, state.window) }), h('td', { text: ui.fmt.credits(c.open) }), h('td', { text: ui.fmt.credits(c.high) }), h('td', { text: ui.fmt.credits(c.low) }), h('td', { text: ui.fmt.credits(c.close) }), h('td', { text: String(c.volume) }))); });
      t.appendChild(body); table.appendChild(t);
    }
    wrap.update = function (next) {
      Object.assign(state, next);
      svg.setAttribute('aria-label', summary());
      wrap.setAttribute('aria-label', 'Price chart. Use the left and right arrow keys to read each point.');
      draw();
      if (table.open) fillTable();
    };
    table.addEventListener('toggle', function () { if (table.open) fillTable(); });
    wrap.destroy = function () { if (ro) ro.disconnect(); };
    wrap.badge = badge;
    return wrap;
  }
  ui.chart = { create: create };
})(window.Cardable = window.Cardable || {}, window);
