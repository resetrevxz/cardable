/* Cardable Market — wires the simulation runtime into the game.
 * This is the only simulation file that knows about C.state, the event bus, the document and localStorage. */
(function (C, root) {
  'use strict';
  var S = C.market.sim, doc = root.document;
  var cfg = function () { return C.data.marketSim; };

  var memory = {};
  var storage = {
    getItem: function (k) { try { var v = root.localStorage.getItem(k); return v; } catch (_) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; } },
    setItem: function (k, v) { try { root.localStorage.setItem(k, v); delete memory[k]; } catch (e) { memory[k] = v; throw e; } },
    removeItem: function (k) { try { root.localStorage.removeItem(k); } catch (_) { /* nothing to remove */ } delete memory[k]; }
  };
  var nativeHidden = false;

  function save() { return C.state.current; }
  function identity() { var s = save(); return s ? s.playerCode + ':' + s.createdAt : 'none'; }

  // Two independent 32-bit hashes over a canonical form of the effect: tamper evidence, not cryptography.
  function signature(key, effect) {
    var parts = [key, effect.receiptId, effect.kind, effect.delta, effect.reason, (effect.remove || []).join(','),
      (effect.add || []).map(function (i) { return i.instanceId + ':' + i.cardId + ':' + (i.variantId || '') + ':' + i.serial; }).join(',')].join('|');
    var core = C.market.core;
    return core.hash32('a' + parts).toString(36) + core.hash32(parts.split('').reverse().join('') + 'b').toString(36);
  }
  function secret() {
    var s = save();
    if (!s) return null;
    if (s.market && s.market.secret) return s.market.secret;
    var candidate = JSON.parse(C.state.encode(s)), text = '';
    while (text.length < 24) text += C.randomId('k').replace(/[^A-Za-z0-9]/g, '');
    candidate.market = Object.assign({ receipts: [] }, candidate.market, { secret: text.slice(0, 24) });
    return C.state.commit(candidate) ? candidate.market.secret : null;
  }

  var player = {
    balance: function () { var s = save(); return s ? s.currency : 0; },
    instance: function (id) {
      var s = save(), found = s && s.inventory.find(function (i) { return i.instanceId === id; });
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    hasReceipt: function (id) { var s = save(); return !!(s && s.market && s.market.receipts.indexOf(id) >= 0); },
    identity: identity,
    // Effects are signed with this save's own secret when they are created and checked before they are applied.
    sign: function (effect) { var key = secret(); if (key) effect.sig = signature(key, effect); return effect; },
    codes: function () { var s = save(); return s ? [s.playerCode] : []; },
    // The one place a simulated trade changes the player's save: cards, Credits and the receipt in a single commit.
    apply: function (effect) {
      var current = save();
      if (!current) return false;
      if (player.hasReceipt(effect.receiptId)) return true;
      var key = current.market && current.market.secret;
      if (!key || typeof effect.sig !== 'string' || effect.sig !== signature(key, effect)) return false;
      var candidate = JSON.parse(C.state.encode(current)), before = current.currency;
      var ids = {};
      candidate.inventory.forEach(function (i) { ids[i.instanceId] = true; });
      for (var r = 0; r < effect.remove.length; r++) if (!ids[effect.remove[r]]) return false;
      for (var a = 0; a < effect.add.length; a++) if (ids[effect.add[a].instanceId]) return false;
      candidate.inventory = candidate.inventory.filter(function (i) { return effect.remove.indexOf(i.instanceId) < 0; });
      effect.add.forEach(function (i) { candidate.inventory.push(JSON.parse(JSON.stringify(i))); });
      try { C.currency.applyInto(candidate, effect.delta, effect.reason); } catch (_) { return false; }
      var receipts = (candidate.market && candidate.market.receipts) || [];
      receipts.push(effect.receiptId);
      candidate.market = Object.assign({}, candidate.market, { receipts: receipts.slice(-600) });
      // The same checks a loaded save passes: unique serials and instance ids, known packs and finishes.
      try { C.state.validate(JSON.parse(JSON.stringify(candidate)), false); } catch (_) { return false; }
      if (!C.state.commit(candidate)) return false;
      C.collection.revision += 1;
      C.currency.notify(before, effect.reason);
      C.events.emit('market:settled', { effect: effect });
      return true;
    }
  };

  // ---- when the clock may run ----
  function gate() {
    if (C.bootFailure) return 'Cardable did not finish starting.';
    if (C.state.recovery && C.state.recovery.pending) return 'Waiting for a save recovery choice.';
    // The notch keeps the market moving on the main menu, so the clock also waits while something else is changing the save.
    if (C.setup && C.setup.loading) return 'Cardable is starting.';
    if (C.opening && C.opening.phase && C.opening.phase !== 'idle') return 'A pack is opening.';
    if (C.studio && C.studio.active) return 'Studio is open.';
    if (C.tutorial && C.tutorial.active) return 'The tutorial is running.';
    if (doc.hidden || nativeHidden) return 'Cardable is hidden or minimized.';
    var unfocused = C.settings && C.settings.get('unfocusedMode');
    if (unfocused === 'pause' && !doc.hasFocus()) return 'The window is not in front, and your setting pauses it.';
    return true;
  }

  var rt = null;
  function runtime() {
    if (rt) return rt;
    var env = S.makeEnv({ cards: C.data.cards, rarities: C.data.rarities, variants: C.data.variants, packs: C.data.packs,
      names: { adjectives: C.market.fixtures.ADJECTIVES, nouns: C.market.fixtures.NOUNS } });
    rt = S.Runtime({
      env: env, storage: storage, key: cfg().storageKey,
      now: function () { return root.performance.now(); }, wall: function () { return Date.now(); },
      gate: gate, timers: { set: function (fn, ms) { return root.setTimeout(fn, ms); }, clear: function (id) { root.clearTimeout(id); } },
      sample: function (world, env) { var s = save(); if (s) S.advisor.sample(world, env, { inventory: s.inventory, balance: s.currency }); },
      player: player, speedId: C.settings.get('marketSimSpeed') || cfg().defaultSpeed,
      saveSpeed: function (id) { C.settings.set('marketSimSpeed', id); },
      log: function (e) { if (root.console) root.console.error('Market simulation', e); }
    });
    return rt;
  }

  var api = {
    get runtime() { return runtime(); },
    get ready() { return !!(rt && rt.world); },
    // Loads an existing world, or creates the first one on demand.
    ensure: function (create) {
      var r = runtime();
      if (r.world) return r;
      if (r.load()) { r.start(); return r; }
      if (create) { r.create(); r.start(); }
      return r;
    },
    lockOf: function (id) { return rt && rt.world ? rt.lockOf(id) : null; },
    heldCredits: function () { return rt && rt.world ? rt.heldCredits() : 0; },
    dev: {
      // Moving simulated time by hand is a developer and test affordance. No interface offers it, and the wrapper
      // needs ?dev=1; it runs the same engine, so it can never fabricate a trade.
      fastForward: function (ms) {
        var on = false;
        try { on = new root.URLSearchParams(root.location.search).get('dev') === '1'; } catch (_) { on = false; }
        if (!on) throw new Error('Developer tools are not enabled. Add ?dev=1 to the address to move simulated time by hand.');
        return api.ensure(true).dev.fastForward(ms);
      },
      state: function () { return rt && rt.world ? { now: rt.world.now, epoch: rt.world.epoch, trades: rt.world.stats.trades, bots: rt.world.bots.length, pending: rt.world.pending.length } : null; }
    }
  };
  C.marketSim = api;

  C.events.on('app:ready', function () {
    var r = runtime();
    // An existing world resumes in the background: bots trade while you play, and freeze when you do not.
    if (r.exists() && r.load()) r.start();
    root.addEventListener('pagehide', function () { if (r.world) r.interrupt(); });
    doc.addEventListener('visibilitychange', function () { if (!r.world) return; if (doc.hidden) r.interrupt(); else r.resumeClock(); });
    root.addEventListener('blur', function () { if (r.world && C.settings.get('unfocusedMode') === 'pause') r.interrupt(); });
    root.addEventListener('focus', function () { if (r.world) r.resumeClock(); });
    C.events.on('desktop:visibility', function (visible) { nativeHidden = !visible; if (!r.world) return; if (visible) r.resumeClock(); else r.interrupt(); });
    C.events.on('save:replaced', function () { if (r.world) r.saveReplaced(); });
    C.events.on('save:willReplace', function () { if (r.world) r.flush(); });
    C.settings.onChange('marketSimSpeed', function () { var id = C.settings.get('marketSimSpeed'); if (id && id !== r.speedId) r.setSpeed(id); });
    C.events.on('card:deleted', function () { /* deletion is refused for listed cards; nothing to do */ });
  });
})(window.Cardable = window.Cardable || {}, window);
