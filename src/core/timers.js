(function (C, root) {
  'use strict';
  var interval = null;
  function state() { if (!C.state.current) C.state.load(); return C.state.current; }
  C.timers = {
    tick: function (now) {
      now = now == null ? Date.now() : now;
      var packs = state().packs, before = packs.ready, max = C.config.packs.maxStored;
      if (packs.ready >= max) { packs.timerStartedAt = null; return { ready: packs.ready, gained: 0 }; }
      if (packs.timerStartedAt == null) packs.timerStartedAt = now;
      var elapsed = now - packs.timerStartedAt;
      if (elapsed < 0) { packs.timerStartedAt = now; return { ready: packs.ready, gained: 0 }; }
      var gained = Math.floor(elapsed / C.config.packs.regenMs);
      packs.ready = Math.min(max, packs.ready + gained);
      if (packs.ready >= max) packs.timerStartedAt = null;
      else packs.timerStartedAt += gained * C.config.packs.regenMs;
      if (packs.ready !== before) {
        C.state.save();
        C.events.emit('pack:ready', { ready: packs.ready, gained: packs.ready - before });
      }
      return { ready: packs.ready, gained: packs.ready - before };
    },
    progress: function (now) {
      var packs = state().packs;
      if (packs.ready >= C.config.packs.maxStored || packs.timerStartedAt == null) return 0;
      return Math.max(0, Math.min(1, ((now == null ? Date.now() : now) - packs.timerStartedAt) / C.config.packs.regenMs));
    },
    openPack: function (now) {
      now = now == null ? Date.now() : now;
      var packs = state().packs;
      C.timers.tick(now);
      if (packs.ready <= 0) return false;
      packs.ready -= 1;
      if (packs.timerStartedAt == null) packs.timerStartedAt = now;
      C.state.save();
      C.events.emit('pack:opened', { ready: packs.ready });
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
