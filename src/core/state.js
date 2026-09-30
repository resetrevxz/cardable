(function (C, root) {
  'use strict';
  var memory = null;
  var unavailable = false;
  function freshState(now) {
    return {
      schemaVersion: C.config.storage.schemaVersion,
      playerCode: C.serial ? C.serial.makePlayerCode() : '2345',
      createdAt: now == null ? Date.now() : now,
      packs: { ready: C.config.packs.startingPacks, timerStartedAt: null },
      serialCounter: 0, inventory: [], pendingReveal: null, currency: 0,
      tutorial: { step: 'welcome', done: false },
      settings: { reducedMotion: null }, stats: { packsOpened: 0 }
    };
  }
  function migrate(value) {
    var version = Number(value.schemaVersion) || 0;
    if (version > C.config.storage.schemaVersion) throw new Error('Save is from a newer version');
    while (version < C.config.storage.schemaVersion) {
      if (version === 0) { value.schemaVersion = 1; version = 1; }
      else throw new Error('No migration from save schema ' + version);
    }
    var base = freshState(value.createdAt || Date.now());
    Object.keys(base).forEach(function (key) {
      if (value[key] !== undefined) base[key] = value[key];
    });
    base.schemaVersion = C.config.storage.schemaVersion;
    base.packs = Object.assign({ ready: C.config.packs.startingPacks, timerStartedAt: null }, base.packs || {});
    base.packs.ready = Math.max(0, Math.min(C.config.packs.maxStored, Number(base.packs.ready) || 0));
    base.inventory = Array.isArray(base.inventory) ? base.inventory : [];
    base.serialCounter = Math.max(0, Number(base.serialCounter) || 0);
    base.tutorial = Object.assign({ step: 'welcome', done: false }, base.tutorial || {});
    base.settings = Object.assign({ reducedMotion: null }, base.settings || {});
    base.stats = Object.assign({ packsOpened: 0 }, base.stats || {});
    return base;
  }
  function storage() {
    try { return root.localStorage; } catch (_) { unavailable = true; return null; }
  }
  function notifyUnavailable() {
    if (!unavailable || C.state.noticeShown) return;
    C.state.noticeShown = true;
    if (root.console) root.console.info('Cardable: local storage is unavailable; changes are kept in memory for this session.');
  }
  C.state = {
    current: null,
    noticeShown: false,
    fresh: freshState,
    migrate: migrate,
    // Opening is irrevocable only after this single durable write succeeds.
    // Ordinary saves keep their existing session-only fallback.
    commit: function (candidate) {
      try {
        var store = root.localStorage;
        if (!store) return false;
        store.setItem(C.config.storage.key, JSON.stringify(candidate));
      } catch (_) { return false; }
      C.state.current = candidate;
      C.events.emit('save:written', candidate);
      return true;
    },
    save: function () {
      if (!C.state.current) C.state.current = freshState();
      var json = JSON.stringify(C.state.current);
      var store = storage();
      if (store) {
        try { store.setItem(C.config.storage.key, json); }
        catch (_) { unavailable = true; memory = json; notifyUnavailable(); }
      } else { memory = json; notifyUnavailable(); }
      C.events.emit('save:written', C.state.current);
      return C.state.current;
    },
    load: function (now) {
      var raw = null, store = storage();
      if (store) {
        try { raw = store.getItem(C.config.storage.key); }
        catch (_) { unavailable = true; notifyUnavailable(); }
      } else { raw = memory; notifyUnavailable(); }
      if (!raw) C.state.current = freshState(now);
      else {
        try { C.state.current = migrate(JSON.parse(raw)); }
        catch (error) {
          if (store) {
            try { store.setItem(C.config.storage.key + '.corrupt', raw); }
            catch (_) { unavailable = true; }
          } else memory = null;
          if (root.console) root.console.warn('Cardable: invalid save backed up and replaced.', error);
          C.state.current = freshState(now);
        }
      }
      C.state.save();
      return C.state.current;
    },
    reset: function () {
      var store = storage();
      if (store) try { store.removeItem(C.config.storage.key); } catch (_) { unavailable = true; }
      memory = null;
      C.state.current = freshState();
      C.state.save();
      C.events.emit('save:reset', C.state.current);
      return C.state.current;
    }
  };
})(window.Cardable, window);
