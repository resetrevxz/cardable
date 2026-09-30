(function (C, root) {
  'use strict';
  var interval = null;
  function state() { if (!C.state.current) C.state.load(); return C.state.current; }
  C.timers = {
    tick: function (now) {
      now = now == null ? Date.now() : now;
      var packs = state().packs, before = packs.ready, started = packs.timerStartedAt, max = C.config.packs.maxStored;
      if (packs.ready >= max) { packs.timerStartedAt = null; if (started !== null) C.state.save(); return { ready: packs.ready, gained: 0 }; }
      if (packs.timerStartedAt == null) packs.timerStartedAt = now;
      var elapsed = now - packs.timerStartedAt;
      if (elapsed < 0) { packs.timerStartedAt = now; C.state.save(); return { ready: packs.ready, gained: 0 }; }
      var gained = Math.floor(elapsed / C.config.packs.regenMs);
      packs.ready = Math.min(max, packs.ready + gained);
      if (packs.ready >= max) packs.timerStartedAt = null;
      else packs.timerStartedAt += gained * C.config.packs.regenMs;
      if (packs.ready !== before || packs.timerStartedAt !== started) C.state.save();
      if (packs.ready !== before) {
        C.events.emit('pack:ready', { ready: packs.ready, gained: packs.ready - before });
      }
      return { ready: packs.ready, gained: packs.ready - before };
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
      if (interval) return;
      C.timers.tick();
      interval = root.setInterval(function () { if (!root.document || !root.document.hidden) C.timers.tick(); }, 1000);
      if (root.document) root.document.addEventListener('visibilitychange', function () {
        if (!root.document.hidden) C.timers.tick();
      });
    },
    stop: function () { if (interval) root.clearInterval(interval); interval = null; }
  };
})(window.Cardable, window);
