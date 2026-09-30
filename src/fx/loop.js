(function (C, root) {
  'use strict';
  var updates = [], raf = null, inFrame = false, requested = false, last = null;
  var stats = { running: false, frameCount: 0, lastFrameMs: 0 };
  function sleep() {
    if (raf !== null) root.cancelAnimationFrame(raf);
    raf = null; last = null;
    if (stats.running) { stats.running = false; C.events.emit('fx:sleep', stats); }
  }
  function frame(now) {
    raf = null;
    if (root.document.hidden) { sleep(); return; }
    inFrame = true; requested = false;
    var dt = last === null ? C.config.shell.frameMs : Math.min(now - last, C.config.shell.maxFrameDeltaMs);
    last = now;
    var active = false;
    updates.slice().forEach(function (update) { active = update(now, dt) === true || active; });
    stats.frameCount += 1; stats.lastFrameMs = dt;
    C.events.emit('fx:frame', { now: now, dt: dt, frameCount: stats.frameCount });
    inFrame = false;
    if (active || requested) raf = root.requestAnimationFrame(frame);
    else sleep();
  }
  C.fx = {
    stats: stats,
    subscribe: function (update) {
      updates.push(update);
      C.fx.wake();
      return function () { var i = updates.indexOf(update); if (i !== -1) updates.splice(i, 1); };
    },
    wake: function () {
      if (root.document.hidden) return;
      if (inFrame) { requested = true; return; }
      if (raf !== null) return;
      stats.running = true;
      C.events.emit('fx:wake', stats);
      raf = root.requestAnimationFrame(frame);
    }
  };
  root.document.addEventListener('visibilitychange', function () {
    if (root.document.hidden) sleep();
    C.events.emit('fx:visibility', !root.document.hidden);
    if (!root.document.hidden) C.fx.wake();
  });

  var query = root.matchMedia('(prefers-reduced-motion: reduce)');
  C.motion = { reduced: query.matches };
  function motionChanged() {
    C.motion.reduced = query.matches;
    root.document.documentElement.classList.toggle('reduced-motion', query.matches);
    C.events.emit('motion:changed', query.matches);
    C.fx.wake();
  }
  if (query.addEventListener) query.addEventListener('change', motionChanged);
  else query.addListener(motionChanged);
  motionChanged();
})(window.Cardable, window);
