(function (C, root) {
  'use strict';
  var updates = [], raf = null, inFrame = false, requested = false, last = null, nextDue = null, rawLast = null, focused = true, paused = false;
  var refreshHz = 60, bestGap = Infinity, failures = new WeakSet(), nativeHidden = false;
  var scopes = [];
  var stats = { running: false, frameCount: 0, lastFrameMs: 0, jsMs: 0, skipped: 0,
    get subscribers() { return updates.length; }, get refreshHz() { return refreshHz; },
    get paused() { return paused; }, get targetFps() { return Math.min(refreshHz, cap()); } };
  function cap() {
    var value = C.settings.get('fpsLimit'), fps = value === 'display' || value === 'unlimited' ? Infinity : Number(value);
    if (C.settings.batterySaving) fps = Math.min(fps,30);
    return !focused && C.settings.get('unfocusedMode') === '30' ? Math.min(fps, 30) : fps;
  }
  function blocked() { return nativeHidden || root.document.hidden || !focused && C.settings.get('unfocusedMode') === 'pause'; }
  function sleep() {
    if (raf !== null) root.cancelAnimationFrame(raf);
    raf = null; last = nextDue = rawLast = null;
    if (stats.running) { stats.running = false; C.events.emit('fx:sleep', stats); }
  }
  function frame(now) {
    raf = null;
    if (blocked()) { sleep(); return; }
    if (rawLast !== null) {
      var gap = now - rawLast;
      if (gap >= 3 && gap <= 35) { bestGap = Math.min(bestGap, gap); refreshHz = Math.round(1000 / bestGap); }
    }
    rawLast = now;
    if (!C.frame && nextDue !== null && now + 0.1 < nextDue) { stats.skipped++; raf = root.requestAnimationFrame(frame); return; }
    inFrame = true; requested = false;
    var frameBegin = root.performance.now();
    var realDt = last === null ? C.config.shell.frameMs : now - last;
    var dt = Math.min(realDt, C.config.shell.maxFrameDeltaMs) * (C.fx.presentationRate || 1);
    last = now;
    var interval = 1000 / cap();
    nextDue = interval === 0 ? null : nextDue === null || now - nextDue > interval ? now + interval : nextDue + interval;
    var active = false;
    try {
      updates.slice().forEach(function (update) {
        if (scopes.length && scopes[scopes.length - 1].label !== update.subscriberLabel) return;
        // AFK retains timestamp-driven pack metrics; decorative/rendering work sleeps.
        if (C.menu && C.menu.afk && update.subscriberLabel !== 'pack') return;
        try {
          active = update(now, dt) === true || active;
          failures.delete(update);
        } catch (error) {
          // Report once until recovery, while other subscribers remain usable.
          if (!failures.has(update)) {
            failures.add(update);
            root.console.error('[Cardable frame: ' + (update.subscriberLabel || update.name || 'subscriber') + ']', error);
          }
        }
      });
      stats.frameCount += 1; stats.lastFrameMs = realDt; stats.jsMs = root.performance.now() - frameBegin;
      C.events.emit('fx:frame', { now: now, dt: dt, realDt: realDt, frameCount: stats.frameCount, targetFps: stats.targetFps, jsMs: stats.jsMs });
    } finally {
      // Even a failed telemetry callback must release the scheduler's frame lock.
      inFrame = false;
      if (active || requested) raf = root.requestAnimationFrame(frame);
      else sleep();
    }
  }
  C.fx = {
    presentationRate: 1,
    get scopeLabel() { return scopes.length ? scopes[scopes.length - 1].label : null; },
    scope: function (label) {
      var token = { label: label }, released = false; scopes.push(token); last = nextDue = rawLast = null;
      return function () { if (released) return; released = true; var index = scopes.indexOf(token); if (index >= 0) scopes.splice(index, 1); last = nextDue = rawLast = null; C.fx.wake(); };
    },
    stats: stats,
    subscribe: function (update, label) {
      if (label) update.subscriberLabel = label;
      updates.push(update);
      C.fx.wake();
      return function () { var i = updates.indexOf(update); if (i !== -1) updates.splice(i, 1); };
    },
    wake: function () {
      if (blocked()) return;
      if (inFrame) { requested = true; return; }
      if (raf !== null) return;
      if (!stats.running) { stats.running = true; C.events.emit('fx:wake', stats); }
      raf = root.requestAnimationFrame(frame);
    }
  };
  function visibility() {
    var next = blocked(); root.document.documentElement.classList.toggle('is-hidden', next);
    if (next) sleep();
    if (paused !== next) { paused = next; C.events.emit('fx:visibility', !next); }
    if (!next) C.fx.wake();
  }
  root.document.addEventListener('visibilitychange', visibility);
  root.addEventListener('blur', function () { focused = false; visibility(); });
  root.addEventListener('focus', function () { focused = true; visibility(); });
  C.settings.onChange('unfocusedMode', visibility);
  C.events.on('desktop:visibility', function (visible) { nativeHidden = !visible; visibility(); });
  C.settings.onChange('fpsLimit', function () { last = nextDue = rawLast = null; C.fx.wake(); });
  root.document.documentElement.classList.toggle('is-hidden', root.document.hidden);

  C.motion = { reduced: root.matchMedia('(prefers-reduced-motion: reduce)').matches };
  C.motion.setPreference = function (value) { C.settings.set('motion', value === true ? 'on' : value === false ? 'off' : 'auto'); };
  C.settings.applyMotion();
})(window.Cardable, window);
