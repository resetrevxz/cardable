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
  // Opt-in per-subscriber CPU timing (milliseconds of JS inside each frame callback).
  // Off by default: enabling it costs two clock reads per subscriber per frame.
  var profile = { enabled: false, labels: Object.create(null), frames: 0,
    reset: function () { this.labels = Object.create(null); this.frames = 0; },
    // Labels sorted by mean cost, with the worst single call, for a quick "what is expensive" view.
    report: function () {
      var frames = Math.max(1, this.frames), labels = this.labels;
      return Object.keys(labels).map(function (key) {
        var row = labels[key]; return { label: key, meanMs: row.total / frames, maxMs: row.max, calls: row.calls, keptAwake: row.kept };
      }).sort(function (a, b) { return b.meanMs - a.meanMs; });
    } };
  function record(label, ms, kept) {
    var row = profile.labels[label] || (profile.labels[label] = { total: 0, max: 0, calls: 0, kept: 0 });
    row.total += ms; row.calls += 1; if (kept) row.kept += 1; if (ms > row.max) row.max = ms;
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
    var sampled = last !== null;
    var realDt = sampled ? now - last : C.config.shell.frameMs;
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
          var began = profile.enabled ? root.performance.now() : 0;
          var kept = update(now, dt) === true;
          active = kept || active;
          if (profile.enabled) record(update.subscriberLabel || update.name || 'subscriber', root.performance.now() - began, kept);
          failures.delete(update);
        } catch (error) {
          // Report once until recovery, while other subscribers remain usable.
          if (!failures.has(update)) {
            failures.add(update);
            root.console.error('[Cardable frame: ' + (update.subscriberLabel || update.name || 'subscriber') + ']', error);
          }
        }
      });
      profile.frames += 1;
      stats.frameCount += 1; stats.lastFrameMs = realDt; stats.jsMs = root.performance.now() - frameBegin;
      C.events.emit('fx:frame', { now: now, dt: dt, realDt: realDt, sampled: sampled, frameCount: stats.frameCount, targetFps: stats.targetFps, jsMs: stats.jsMs });
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
    // Bounding rect for proximity checks driven by pointer events. A fresh read after the last frame's
    // style writes forces a synchronous restyle, so the rect is reused for 100 ms (these checks use a 160 px
    // halo; a 100 ms old rect is well inside it, including for the moving inventory sheet).
    rect: (function () {
      var memo = new WeakMap();
      return function (el) {
        var now = root.performance.now(), hit = memo.get(el);
        if (hit && now - hit.at < 100) return hit.rect;
        var rect = el.getBoundingClientRect(); memo.set(el, { at: now, rect: rect }); return rect;
      };
    })(),
    stats: stats, profile: profile,
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
