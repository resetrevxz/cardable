(function (C) {
  'use strict';
  // Isolated fixtures and fake lifecycle targets; never adopt or write a player save.
  C.dev.registerCheck('inventory requests preserve detail and preferences focus', function () {
    return !C.inventory.canRequest({ phase: 'idle', detail: true }, true) &&
      C.inventory.canRequest({ phase: 'idle', detail: true }, false) &&
      !C.inventory.canRequest({ phase: 'idle', preferences: true }, true);
  });
  ['close', 'sort', 'resize'].forEach(function (reason) {
    C.dev.registerCheck('inventory ' + reason + ' cancels both captures before callbacks', function () {
      var releases = 0, detached = true, gestures = {};
      var capture = { hasPointerCapture: function () { return true; }, releasePointerCapture: function () {
        releases += 1; detached = detached && !gestures.sheet && !gestures.shelf;
      } };
      gestures.sheet = { id: 1, capture: capture }; gestures.shelf = { id: 2, capture: capture };
      C.input.cancelGestures(gestures);
      return releases === 2 && detached && !gestures.sheet && !gestures.shelf;
    });
  });
  C.dev.registerCheck('successful writes replace a stale session fallback', function () {
    var cache = C.state.createStorageCache(); cache.memory = 'old'; cache.unavailable = true;
    cache.written('latest'); return !cache.unavailable && cache.memory === 'latest';
  });
  C.dev.registerCheck('unknown reserved cards are rejected before rendering', function () {
    var candidate = C.state.fresh();
    candidate.pendingReveal = { packId: C.data.packs.find(function (pack) { return pack.enabled; }).id, committedAt: 0,
      cards: [{ instanceId: 'check-only', cardId: 'not-in-catalog', serial: 'check-only', pulledAt: 0, seen: false }] };
    try { C.state.validate(candidate, false); return false; } catch (_) { return true; }
  });
  C.dev.registerCheck('local reload repairs a serial counter behind owned cards', function () {
    var candidate = C.state.fresh(); candidate.serialCounter = 0;
    candidate.inventory = [{ instanceId: 'counter-check', cardId: C.data.cards[0].id,
      serial: C.serial.format(candidate.playerCode, 99), pulledAt: 0, seen: false, variantId: null, cardSkinId: null, packId: 'standard' }];
    return C.state.validate(candidate, false).serialCounter === 99;
  });
  C.dev.registerCheck('timer start/stop removes its visibility callback', function () {
    var callbacks = new Set(), target = {
      addEventListener: function (name, fn) { callbacks.add(fn); },
      removeEventListener: function (name, fn) { callbacks.delete(fn); }
    };
    for (var i = 0; i < 5; i++) { var off = C.timers.watchVisibility(target); if (callbacks.size !== 1) return false; off(); }
    return callbacks.size === 0;
  });
  C.dev.registerCheck('charge reconciliation mutates only the durable candidate', function () {
    var original = C.state.fresh(0); original.packs = { ready: 1, timerStartedAt: 0 };
    var now = C.config.packs.regenMs * (C.config.packs.maxStored - 1);
    var candidate = JSON.parse(JSON.stringify(original)); C.timers.reconcileInto(candidate, now);
    return original.packs.ready === 1 && candidate.packs.ready === C.config.packs.maxStored &&
      C.timers.consumeInto(candidate, now) && candidate.packs.ready === C.config.packs.maxStored - 1;
  });
  C.dev.registerCheck('state simulations cannot replace an active opening or modal', function () {
    return C.dev.canRunStateChecks({ phase: 'idle' }) && !C.dev.canRunStateChecks({ phase: 'revealed' }) &&
      !C.dev.canRunStateChecks({ phase: 'idle', inventory: true }) && !C.dev.canRunStateChecks({ phase: 'idle', preferences: true });
  });
  C.dev.registerCheck('blocked storage is tested as a supported session fallback', function () {
    return !C.dev.storageAvailable(null, 'check-only') && !C.dev.storageAvailable({ setItem: function () { throw new Error('blocked'); } }, 'check-only');
  });
  C.dev.registerCheck('visible tutorial Skip remains in modal keyboard navigation', function () {
    var skip = { disabled: false, getAttribute: function () { return null; } };
    var scope = { querySelectorAll: function () { return []; } };
    if (C.accessibility.focusables(scope, [skip])[0] !== skip) return false;
    skip.disabled = true; return C.accessibility.focusables(scope, [skip]).length === 0;
  });
  C.dev.registerCheck('dev storage fixtures have an independent fallback cache', function () {
    var player = C.state.createStorageCache(), fixture = C.state.createStorageCache();
    player.written('player'); fixture.written('fixture'); fixture.unavailable = true;
    return player.memory === 'player' && !player.unavailable && fixture.memory === 'fixture';
  });
})(window.Cardable);
