(function (C, root) {
  'use strict';
  function createStorageCache() {
    return { memory: null, unavailable: false, written: function (json) { this.memory = json; this.unavailable = false; } };
  }
  var cache = createStorageCache();
  function freshState(now) {
    return {
      schemaVersion: C.config.storage.schemaVersion,
      playerCode: C.serial ? C.serial.makePlayerCode() : '2345',
      createdAt: now == null ? Date.now() : now,
      packs: { ready: C.config.packs.startingPacks, timerStartedAt: null },
      serialCounter: 0, inventory: [], pendingReveal: null, currency: 0,
      tutorial: { step: 'welcome', done: false },
      settings: { reducedMotion: null }, stats: { packsOpened: 0 },
      inventoryUi: C.inventoryModel ? C.inventoryModel.defaults() : {}
    };
  }
  function migrate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Save must be an object');
    var version = Number(value.schemaVersion) || 0;
    if (version > C.config.storage.schemaVersion) throw new Error('Save is from a newer version');
    while (version < C.config.storage.schemaVersion) {
      if (version === 0) { value.schemaVersion = 1; version = 1; }
      else if (version === 1) { value.schemaVersion = 2; version = 2; }
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
    base.inventoryUi = C.inventoryModel.normalize(base.inventoryUi);
    return base;
  }
  function validate(value, strict) {
    function require(ok, message) { if (!ok) throw new Error(message); }
    function number(n) { return typeof n === 'number' && Number.isFinite(n) && n >= 0; }
    function integer(n) { return number(n) && Number.isSafeInteger(n); }
    require(value && typeof value === 'object' && !Array.isArray(value), 'Save must be an object');
    require(value.schemaVersion !== undefined || value.packs !== undefined || value.inventory !== undefined, 'This file is not a Cardable save');
    if (strict) require(value.packs && Array.isArray(value.inventory) && typeof value.playerCode === 'string', 'This file is not a Cardable save');
    // Reject dangerous keys before any migration copies nested objects.
    function keys(object, depth) {
      require(depth < 64, 'Save nesting is too deep');
      if (!object || typeof object !== 'object') return;
      Object.keys(object).forEach(function (key) { require(key !== '__proto__' && key !== 'constructor' && key !== 'prototype', 'Unsupported save field'); keys(object[key], depth + 1); });
    }
    keys(value, 0);
    if (value.packs) {
      require(typeof value.packs === 'object' && !Array.isArray(value.packs), 'Invalid pack state');
      require(integer(value.packs.ready) && value.packs.ready <= C.config.packs.maxStored, 'Invalid pack stock');
      require(value.packs.timerStartedAt == null || number(value.packs.timerStartedAt), 'Invalid timer');
    }
    if (value.inventory !== undefined) require(Array.isArray(value.inventory), 'Invalid collection');
    ['settings', 'tutorial', 'stats'].forEach(function (key) { if (value[key] !== undefined) require(value[key] && typeof value[key] === 'object' && !Array.isArray(value[key]), 'Invalid ' + key); });
    if (value.serialCounter !== undefined) require(integer(value.serialCounter), 'Invalid serial counter');
    var candidate = migrate(value);
    require(typeof candidate.playerCode === 'string' && candidate.playerCode.length === C.config.serial.playerCodeLength &&
      Array.from(candidate.playerCode).every(function (c) { return C.serial.alphabet.indexOf(c) !== -1; }), 'Invalid player code');
    require(number(candidate.createdAt) && integer(candidate.serialCounter) && number(candidate.currency), 'Invalid save counters');
    require(candidate.stats && integer(candidate.stats.packsOpened), 'Invalid opening statistics');
    require(candidate.tutorial && ['welcome', 'hold', 'cut', 'keep', 'inventory', 'timer', 'done'].indexOf(candidate.tutorial.step) !== -1 &&
      typeof candidate.tutorial.done === 'boolean', 'Invalid tutorial progress');
    require(candidate.settings && (candidate.settings.reducedMotion === null || typeof candidate.settings.reducedMotion === 'boolean'), 'Invalid motion setting');
    require(!candidate.settings.rarityColorMode || ['color', 'mono'].indexOf(candidate.settings.rarityColorMode) !== -1, 'Invalid rarity color setting');
    var ids = new Set(), serials = new Set(), maxCounter = 0;
    function instance(item, reserved) {
      require(item && typeof item.instanceId === 'string' && item.instanceId.length > 0 && typeof item.cardId === 'string', 'Invalid card instance');
      require(!ids.has(item.instanceId), 'Repeated card instance'); ids.add(item.instanceId);
      require(typeof item.serial === 'string' && item.serial.length > 0 && !serials.has(item.serial), 'Invalid or repeated serial'); serials.add(item.serial);
      require(number(item.pulledAt) && typeof item.seen === 'boolean', 'Invalid card progress');
      if (reserved) require(!!C.card(item.cardId), 'Reserved card is outside this catalog');
      var parts = item.serial.split('-'), count = Number(parts[2]);
      if (parts.length === 3 && parts[0] === C.config.serial.prefix && parts[1] === candidate.playerCode &&
          /^\d+$/.test(parts[2]) && integer(count)) maxCounter = Math.max(maxCounter, count);
      if (strict) {
        require(!!C.card(item.cardId), 'Save refers to a card outside this catalog: ' + item.cardId);
        require(parts.length === 3 && parts[0] === C.config.serial.prefix && parts[1].length === C.config.serial.playerCodeLength &&
          Array.from(parts[1]).every(function (c) { return C.serial.alphabet.indexOf(c) !== -1; }) && /^\d+$/.test(parts[2]) &&
          parts[2].length >= C.config.serial.counterDigits && integer(count) && count > 0, 'Invalid card serial');
        if (parts[1] === candidate.playerCode) maxCounter = Math.max(maxCounter, count);
      }
    }
    candidate.inventory.forEach(function (item) { instance(item, false); });
    if (candidate.pendingReveal !== null) {
      var pending = candidate.pendingReveal;
      require(pending && typeof pending === 'object' && Array.isArray(pending.cards) && pending.cards.length > 0 &&
        typeof pending.packId === 'string' && !!C.pack(pending.packId) && number(pending.committedAt), 'Invalid reserved pack');
      pending.cards.forEach(function (item) { instance(item, true); });
      require(pending.keptCount === undefined || integer(pending.keptCount) && pending.keptCount < pending.cards.length, 'Invalid reserved pack progress');
      if (pending.discardedInstanceIds !== undefined) {
        require(Array.isArray(pending.discardedInstanceIds) && new Set(pending.discardedInstanceIds).size === pending.discardedInstanceIds.length &&
          pending.discardedInstanceIds.every(function (id) { return pending.cards.slice(0, pending.keptCount || 0).some(function (item) { return item.instanceId === id; }); }), 'Invalid discarded pack cards');
      }
    }
    if (strict) require(candidate.serialCounter >= maxCounter, 'Serial counter precedes existing cards');
    else candidate.serialCounter = Math.max(candidate.serialCounter, maxCounter);
    return candidate;
  }
  function storage() {
    try { return root.localStorage; } catch (_) { cache.unavailable = true; return null; }
  }
  function notifyUnavailable() {
    if (!cache.unavailable || C.state.noticeShown) return;
    C.state.noticeShown = true;
    if (root.console) root.console.info('Cardable: local storage is unavailable; changes are kept in memory for this session.');
    C.events.emit('save:unavailable');
  }
  C.state = {
    current: null,
    noticeShown: false,
    recovery: null,
    fresh: freshState,
    migrate: migrate,
    validate: validate,
    createStorageCache: createStorageCache,
    withIsolatedCache: function (check) {
      var previous = cache; cache = createStorageCache();
      try { return check(); } finally { cache = previous; }
    },
    // Opening is irrevocable only after this single durable write succeeds.
    // Ordinary saves keep their existing session-only fallback.
    commit: function (candidate) {
      try {
        var store = root.localStorage;
        if (!store) return false;
        var json = JSON.stringify(candidate);
        store.setItem(C.config.storage.key, json);
      } catch (_) { return false; }
      cache.written(json);
      C.state.current = candidate;
      C.events.emit('save:written', candidate);
      return true;
    },
    save: function () {
      if (!C.state.current) C.state.current = freshState();
      var json = JSON.stringify(C.state.current);
      var store = storage();
      if (store) {
        try { store.setItem(C.config.storage.key, json); cache.written(json); }
        catch (_) { cache.unavailable = true; cache.memory = json; notifyUnavailable(); }
      } else { cache.memory = json; cache.unavailable = true; notifyUnavailable(); }
      C.events.emit('save:written', C.state.current);
      return C.state.current;
    },
    load: function (now) {
      var raw = null, store = storage();
      if (store) {
        try { raw = store.getItem(C.config.storage.key); }
        catch (_) { cache.unavailable = true; raw = cache.memory; notifyUnavailable(); }
      } else { cache.unavailable = true; raw = cache.memory; notifyUnavailable(); }
      if (cache.unavailable && cache.memory !== null) raw = cache.memory;
      if (!raw) C.state.current = freshState(now);
      else {
        try { C.state.current = validate(JSON.parse(raw), false); }
        catch (error) {
          var backedUp = false;
          if (store) {
            try { store.setItem(C.config.storage.key + '.corrupt', raw); backedUp = true; }
            catch (_) { cache.unavailable = true; }
          } else cache.memory = null;
          if (root.console) root.console.warn('Cardable: invalid save backed up and replaced.', error);
          C.state.current = freshState(now);
          C.state.recovery = { backedUp: backedUp, raw: raw };
        }
      }
      C.state.save();
      return C.state.current;
    },
    reset: function () {
      C.events.emit('save:willReset');
      var store = storage();
      if (store) try { store.removeItem(C.config.storage.key); } catch (_) { cache.unavailable = true; }
      cache.memory = null;
      C.state.current = freshState();
      C.state.save();
      C.events.emit('save:reset', C.state.current);
      return C.state.current;
    }
  };
})(window.Cardable, window);
