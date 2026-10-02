(function (C, root) {
  'use strict';
  var interval = null;
  var unwatch = null;
  var started = false;
  function schedule() {
    if (interval !== null) root.clearInterval(interval); interval = null;
    if (started && (!root.document.hidden || C.settings.get('backgroundMode') === 'timer')) interval = root.setInterval(function () { C.timers.tick(); }, 1000);
  }
  function onVisibility() { schedule(); if (!root.document.hidden) C.timers.tick(); }
  function state() { if (!C.state.current) C.state.load(); return C.state.current; }
  C.timers = {
    get running() { return interval !== null; },
    watchVisibility: function (target) {
      target.addEventListener('visibilitychange', onVisibility);
      return function () { target.removeEventListener('visibilitychange', onVisibility); };
    },
    reconcileInto: function (candidate, now) {
      var packs = candidate.packs, before = packs.ready, max = C.config.packs.maxStored;
      if (packs.ready >= max) packs.timerStartedAt = null;
      else {
        if (packs.timerStartedAt == null || now < packs.timerStartedAt) packs.timerStartedAt = now;
        var gained = Math.floor((now - packs.timerStartedAt) / C.config.packs.regenMs);
        packs.ready = Math.min(max, packs.ready + gained);
        packs.timerStartedAt = packs.ready >= max ? null : packs.timerStartedAt + gained * C.config.packs.regenMs;
      }
      return { ready: packs.ready, gained: packs.ready - before };
    },
    tick: function (now) {
      now = now == null ? Date.now() : now;
      var candidate = state(), packs = candidate.packs, before = packs.ready, started = packs.timerStartedAt;
      var result = C.timers.reconcileInto(candidate, now);
      if (packs.ready !== before || packs.timerStartedAt !== started) C.state.save();
      if (packs.ready !== before) {
        C.events.emit('pack:ready', { ready: packs.ready, gained: packs.ready - before });
      }
      C.events.emit('timer:tick', { now: now });
      return result;
    },
    progress: function (now) {
      var packs = state().packs;
      if (packs.ready >= C.config.packs.maxStored || packs.timerStartedAt == null) return 0;
      return Math.max(0, Math.min(1, ((now == null ? Date.now() : now) - packs.timerStartedAt) / C.config.packs.regenMs));
    },
    remaining: function (now) {
      var packs = state().packs;
      if (packs.ready >= C.config.packs.maxStored) return 0;
      return C.config.packs.regenMs * (1 - C.timers.progress(now));
    },
    format: function (ms) {
      var seconds = Math.max(0, Math.ceil(ms / 1000));
      if (seconds >= 3600) return Math.floor(seconds / 3600) + 'h ' + Math.floor(seconds % 3600 / 60) + 'm';
      if (seconds >= 60) return Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's';
      return seconds + 's';
    },
    // Mutates a supplied candidate only: no writes or presentation events.
    consumeInto: function (candidate, now) {
      var packs = candidate.packs;
      if (packs.ready <= 0) return false;
      packs.ready -= 1;
      if (packs.timerStartedAt == null) packs.timerStartedAt = now;
      return true;
    },
    openPack: function (now) {
      now = now == null ? Date.now() : now;
      C.timers.tick(now);
      if (!C.timers.consumeInto(state(), now)) return false;
      C.state.save();
      C.events.emit('pack:opened', { ready: state().packs.ready });
      return true;
    },
    start: function () {
      if (started) return; started = true;
      C.timers.tick();
      schedule();
      if (root.document) unwatch = C.timers.watchVisibility(root.document);
    },
    stop: function () {
      started = false;
      if (interval) root.clearInterval(interval); interval = null;
      if (unwatch) unwatch(); unwatch = null;
    }
  };
  C.settings.onChange('backgroundMode', schedule);
})(window.Cardable, window);
