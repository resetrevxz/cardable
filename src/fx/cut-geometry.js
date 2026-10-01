(function (C) {
  'use strict';
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }
  function intersection(a, b, c, d) {
    var r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
    var denominator = cross(r, s), epsilon = C.config.openingMotion.geometryEpsilon;
    if (Math.abs(denominator) < epsilon) return null;
    var offset = { x: c.x - a.x, y: c.y - a.y }, t = cross(offset, s) / denominator, u = cross(offset, r) / denominator;
    return t > epsilon && t < 1 - epsilon && u >= 0 && u <= 1 ? { x: a.x + t * r.x, y: a.y + t * r.y } : null;
  }
  // Scratches remain visible; only the tear boundary has loops removed.
  function simple(points) {
    var out = [];
    points.forEach(function (point) {
      if (out.length > 2) {
        for (var i = 0; i < out.length - 2; i++) {
          var hit = intersection(out[out.length - 1], point, out[i], out[i + 1]);
          if (hit) { out = out.slice(0, i + 1); out.push(hit); break; }
        }
      }
      out.push({ x: point.x, y: point.y });
    });
    return out;
  }
  function smooth(points) {
    if (points.length < 2) return points.slice();
    var out = [points[0]], steps = C.config.openingMotion.smoothSteps;
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
      for (var j = 1; j <= steps; j++) {
        if (j === steps) { out.push({ x: c.x, y: c.y }); continue; }
        var t = j / steps, t2 = t * t, t3 = t2 * t, point = {};
        ['x', 'y'].forEach(function (key) {
          point[key] = clamp(0.5 * (2 * b[key] + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3), 0, 1);
        });
        out.push(point);
      }
    }
    return out;
  }
  function metrics(points, width, height) {
    if (points.length < 2) return { axis: 'x', span: 0 };
    var first = points[0], last = points[points.length - 1];
    var axis = Math.abs((last.x - first.x) * width) >= Math.abs((last.y - first.y) * height) ? 'x' : 'y';
    var values = points.map(function (p) { return p[axis]; });
    return { axis: axis, span: Math.max.apply(null, values) - Math.min.apply(null, values) };
  }
  function edge(point, neighbour, axis, target) {
    var other = axis === 'x' ? 'y' : 'x', delta = point[axis] - neighbour[axis], next = {};
    next[axis] = target;
    next[other] = clamp(point[other] + (Math.abs(delta) > C.config.openingMotion.geometryEpsilon ? (point[other] - neighbour[other]) * (target - point[axis]) / delta : 0),
      C.config.openingMotion.boundaryInset, 1 - C.config.openingMotion.boundaryInset);
    return next;
  }
  function finish(points, width, height, options) {
    options = options || {};
    var fallbackY = options.lineY == null ? 0.5 : options.lineY;
    if (points.length < 2) points = [{ x: 0, y: fallbackY }, { x: 1, y: fallbackY }];
    var info = metrics(points, width, height), chain = simple(points);
    if (options.axis) info.axis = options.axis;
    if (chain.length < 2) chain = [{ x: 0, y: fallbackY }, { x: 1, y: fallbackY }];
    if (chain[chain.length - 1][info.axis] < chain[0][info.axis]) chain.reverse();
    chain.unshift(edge(chain[0], chain[1], info.axis, 0));
    chain.push(edge(chain[chain.length - 1], chain[chain.length - 2], info.axis, 1));
    chain = simple(smooth(chain));
    if (options.minY != null && options.maxY != null) chain = chain.map(function (point) { return { x: point.x, y: clamp(point.y, options.minY, options.maxY) }; });
    var first = chain[0], last = chain[chain.length - 1];
    var halves = info.axis === 'x' ? [chain.concat([{ x: 1, y: 0 }, { x: 0, y: 0 }]), chain.concat([{ x: 1, y: 1 }, { x: 0, y: 1 }])] :
      [chain.concat([{ x: 0, y: 1 }, { x: 0, y: 0 }]), chain.concat([{ x: 1, y: 1 }, { x: 1, y: 0 }])];
    var dx = (last.x - first.x) * width, dy = (last.y - first.y) * height, length = Math.hypot(dx, dy) || 1;
    return { axis: info.axis, path: chain, halves: halves, normal: { x: -dy / length, y: dx / length } };
  }
  C.cutGeometry = {
    smooth: smooth, simple: simple, metrics: metrics, finish: finish,
    svg: function (points, width, height) { return points.map(function (p, i) { return (i ? 'L' : 'M') + (p.x * width).toFixed(3) + ' ' + (p.y * height).toFixed(3); }).join(' '); },
    polygon: function (points) { return 'polygon(' + points.map(function (p) { return (p.x * 100).toFixed(4) + '% ' + (p.y * 100).toFixed(4) + '%'; }).join(',') + ')'; }
  };
})(window.Cardable);
