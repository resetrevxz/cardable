(function (C, root) {
  'use strict';
  var sample = null;
  C.profiler = {
    get active() { return !!sample; }, last: null,
    start: function (label) {
      if (root.document.hidden) return false;
      sample = { label: label, elapsed: 0, gaps: [], costs: Object.create(null), invalid: false };
      C.profiler.last = null; C.events.emit('profile:started', label); C.fx.wake(); return true;
    },
    record: function (label, ms) {
      if (!sample) return;
      var cost = sample.costs[label] || (sample.costs[label] = { totalMs: 0, maxMs: 0, calls: 0 });
      cost.totalMs += ms; cost.maxMs = Math.max(cost.maxMs, ms); cost.calls += 1;
    }
  };
  C.events.on('fx:frame', function (event) {
    if (!sample) return;
    sample.elapsed += event.realDt; sample.gaps.push(event.realDt);
    if (sample.elapsed < C.config.polish.profileMs && sample.gaps.length < C.config.polish.profileMaxFrames) return;
    var result = sample; sample = null; var sorted = result.gaps.slice().sort(function (a, b) { return a - b; });
    C.profiler.last = { label: result.label, valid: !result.invalid, frames: sorted.length,
      fps: sorted.length * 1000 / result.elapsed, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      slowFrames: sorted.filter(function (ms) { return ms > C.config.polish.slowFrameMs; }).length,
      subscribers: result.costs, fullCards: C.cardView.stats.fullCards, gridDraws: C.dots.stats.draws };
    root.console.info('[Cardable performance: cadence and JS only; inspect paint separately]', C.profiler.last);
    C.events.emit('profile:finished', C.profiler.last);
  });
  function invalidate() { if (sample) sample.invalid = true; }
  C.events.on('fx:visibility', invalidate); C.events.on('motion:changed', invalidate);
  C.fx.subscribe(function () { return !!sample; }, 'profile');
})(window.Cardable, window);
