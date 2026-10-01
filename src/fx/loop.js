(function (C, root) {
  'use strict';
  var updates = [], raf = null, inFrame = false, requested = false, last = null;
  var stats = { running: false, frameCount: 0, lastFrameMs: 0, get subscribers() { return updates.length; } };
  function sleep() {
    if (raf !== null) root.cancelAnimationFrame(raf);
    raf = null; last = null;
    if (stats.running) { stats.running = false; C.events.emit('fx:sleep', stats); }
  }
  function frame(now) {
    raf = null;
    if (root.document.hidden) { sleep(); return; }
    inFrame = true; requested = false;
    var realDt = last === null ? C.config.shell.frameMs : now - last;
    var dt = Math.min(realDt, C.config.shell.maxFrameDeltaMs);
    last = now;
    var active = false;
    updates.slice().forEach(function (update) {
      var begin = C.profiler && C.profiler.active ? root.performance.now() : null;
      active = update(now, dt) === true || active;
      if (begin !== null) C.profiler.record(update.profileLabel || update.name || 'subscriber', root.performance.now() - begin);
    });
    stats.frameCount += 1; stats.lastFrameMs = dt;
    C.events.emit('fx:frame', { now: now, dt: dt, realDt: realDt, frameCount: stats.frameCount });
    inFrame = false;
    if (active || requested) raf = root.requestAnimationFrame(frame);
    else sleep();
  }
  C.fx = {
    stats: stats,
    subscribe: function (update, label) {
      if (label) update.profileLabel = label;
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
    root.document.documentElement.classList.toggle('is-hidden', root.document.hidden);
    if (root.document.hidden) sleep();
    C.events.emit('fx:visibility', !root.document.hidden);
    if (!root.document.hidden) C.fx.wake();
  });
  root.document.documentElement.classList.toggle('is-hidden', root.document.hidden);

  var query = root.matchMedia('(prefers-reduced-motion: reduce)'), defaultColorMode = C.config.rarityColorMode;
  C.motion = { reduced: query.matches };
  function motionChanged() {
    var preference = C.state.current && C.state.current.settings.reducedMotion;
    var reduced = typeof preference === 'boolean' ? preference : query.matches;
    var changed = C.motion.reduced !== reduced;
    C.motion.reduced = reduced;
    root.document.documentElement.classList.toggle('reduced-motion', reduced);
    if (changed) C.events.emit('motion:changed', reduced);
    C.fx.wake();
  }
  if (query.addEventListener) query.addEventListener('change', motionChanged);
  else query.addListener(motionChanged);
  C.motion.setPreference = function (value) { C.state.current.settings.reducedMotion = value; C.state.save(); };
  C.events.on('save:written', function () {
    motionChanged();
    var mode = C.state.current.settings.rarityColorMode || defaultColorMode;
    if (mode && mode !== C.config.rarityColorMode) { C.config.rarityColorMode = mode; C.events.emit('settings:rarityColorMode', mode); }
  });
  C.events.on('settings:rarityColorMode', function (mode) {
    if (C.state.current && C.state.current.settings.rarityColorMode !== mode) { C.state.current.settings.rarityColorMode = mode; C.state.save(); }
  });
  motionChanged();
})(window.Cardable, window);
