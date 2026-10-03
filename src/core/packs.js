(function (C) {
  'use strict';
  var forced = null, signature = '', priorCount = null;
  // A separate deterministic draw leaves card/finish RNG consumption unchanged.
  // Existing immutable save identity supplies the seed; no new save fields needed.
  function rollAt(n, save) {
    var identity = save ? save.playerCode + ':' + save.createdAt : 'Cardable';
    var hash = 2166136261;
    for (var i = 0; i < identity.length; i++) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
    hash = (hash + Math.imul(n, 0x9e3779b9)) | 0;
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad);
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97);
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296;
  }
  function typeAt(n, save) {
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('Opening number must be a positive safe integer');
    var winner = null;
    C.data.packs.forEach(function(p) {
      if (!p.enabled || !p.cadence || !Number.isSafeInteger(p.cadence.every) || p.cadence.every < 1 || n % p.cadence.every) return;
      if (!winner || (p.priority || 0) > (winner.priority || 0)) winner = p;
    });
    if (winner) return winner;
    if (n > C.config.packs.startingPacks) {
      var needle = rollAt(n, save === undefined ? C.state.current : save);
      var randomTypes = C.data.packs.filter(function(p) { return p.enabled && p.randomChance > 0; });
      for (var j = 0; j < randomTypes.length; j++) {
        needle -= randomTypes[j].randomChance;
        if (needle < 0) return randomTypes[j];
      }
    }
    return C.data.packs.find(function(p) { return p.enabled && p.cadence == null && !p.randomChance; });
  }
  function upcoming(count) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Queue size must be a non-negative safe integer');
    var opened = C.state.current ? C.state.current.packs.openedCount : 0;
    return Array.from({length: count}, function(_, i) { return i === 0 && forced ? C.pack(forced) : typeAt(opened + i + 1); });
  }
  function refresh(reason) {
    if (!C.state.current) return;
    var count = C.state.current.packs.openedCount;
    if (reason === 'save' && priorCount !== null && count !== priorCount) {
      reason = count === priorCount + 1 && C.state.current.pendingReveal ? 'advance' : 'replace';
      if (reason === 'advance') forced = null;
    }
    var types = upcoming(C.config.packs.maxStored), key = JSON.stringify([count, forced, types.map(function(p) { return p.id; })]);
    priorCount = count;
    if (signature === key && reason !== 'replace') return;
    signature = key;
    C.events.emit('packs:queueChanged', { openedCount: count, types: types, reason: reason, forced: forced });
  }
  C.packs = {
    typeAt: typeAt, upcoming: upcoming,
    resolve: function(save) { return forced ? C.pack(forced) : typeAt(save.packs.openedCount + 1, save); },
    get forced() { return forced; },
    forceNext: function(id) {
      if (C.opening && C.opening.phase !== 'idle') throw new Error('Finish opening before forcing a pack');
      if (id && (!C.pack(id) || !C.pack(id).enabled)) throw new Error('Pack is unavailable');
      forced = id || null; refresh('override');
    },
    init: function() {
      if (C.packs.initialized) return; C.packs.initialized = true;
      C.events.on('save:written', function() { refresh('save'); });
      C.events.on('save:replaced', function() { forced = null; refresh('replace'); });
      refresh('initial');
    }
  };
})(window.Cardable);
