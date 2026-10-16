/* Cardable Market — offline simulation runtime.
 * Owns the single driver timer, the freeze rules, persistence with rotation and recovery, and the actions the UI
 * calls. It is a factory over injected dependencies so the same code runs in the game and under Node tests.
 *
 * Time rules (the "freeze" contract, also in docs/market-beta/stage-2.md):
 *  - simulated time advances by (active real time between two ticks) x speed factor;
 *  - it is active only while the document is visible, the game is not paused by the player and no save recovery
 *    is pending; the window being unfocused counts only when the player chose "pause when unfocused";
 *  - a gap longer than `maxGapMs` between two ticks is an interruption and is not counted. There is no catch-up;
 *  - the clock is monotonic (performance.now), so changing the system clock has no effect on it. */
(function (C) {
  'use strict';
  var S = C.market.sim;
  var cfg = function () { return C.data.marketSim; };

  function Runtime(deps) {
    var rt = { world: null, env: deps.env, host: null, state: 'idle', reason: '', error: null, revision: 0, speedId: deps.speedId || cfg().defaultSpeed };
    var listeners = new Set(), timer = 0, last = null, dirty = false, lastPersistWall = 0, lastBackupWall = 0, pendingTarget = null, running = false, paused = false, saveFailed = false;
    var store = deps.storage, KEY = deps.key || cfg().storageKey, BAK = KEY + '.bak';

    function emit(kind) { listeners.forEach(function (fn) { try { fn(kind, rt); } catch (e) { if (deps.log) deps.log(e); } }); }
    function factor() { var s = cfg().speeds.find(function (x) { return x.id === rt.speedId; }) || cfg().speeds[1]; return s.factor; }

    // ---- the player's save, seen through the host interface ----
    rt.host = {
      balance: function () { return deps.player.balance(); },
      instance: function (id) { return deps.player.instance(id); },
      hasReceipt: function (id) { return deps.player.hasReceipt(id); },
      sign: function (effect) { return deps.player.sign ? deps.player.sign(effect) : effect; },
      settle: function (effect) {
        // The intent is durable in the simulator before the save changes, so a crash between the two is repairable.
        persistNow('settle');
        var ok = false;
        try { ok = deps.player.apply(effect) === true; } catch (e) { ok = false; if (deps.log) deps.log(e); }
        return ok;
      }
    };

    // ---- persistence ----
    function trimForSpace() {
      var w = rt.world, k = cfg().keep;
      w.trades.splice(0, Math.max(0, w.trades.length - Math.floor(k.trades / 3)));
      w.feed.splice(0, Math.max(0, w.feed.length - Math.floor(k.feed / 2)));
      Object.keys(w.obs).forEach(function (key) { if (w.obs[key].length > 8) w.obs[key].splice(0, w.obs[key].length - 8); });
    }
    function persistNow(reason) {
      if (!rt.world || !store) return false;
      var text;
      try { text = S.serialize(rt.world); } catch (e) { rt.error = 'The simulation could not be written down.'; return false; }
      if (text.length > cfg().maxStateBytes) { trimForSpace(); text = S.serialize(rt.world); }
      var wall = deps.wall();
      try {
        var prev = null;
        try { prev = store.getItem(KEY); } catch (_) { prev = null; }
        // The previous good state is kept as a rolling backup: at once for player actions, otherwise every minute.
        if (prev && prev !== text && (reason === 'action' || reason === 'settle' || wall - lastBackupWall > 60000)) { store.setItem(BAK, prev); lastBackupWall = wall; }
        store.setItem(KEY, text);
      } catch (e) {
        try { trimForSpace(); store.setItem(KEY, S.serialize(rt.world)); }
        catch (e2) {
          if (!saveFailed) { saveFailed = true; rt.error = 'Simulation could not be saved on this device. It continues in this session.'; emit('error'); }
          return false;
        }
      }
      if (saveFailed) { saveFailed = false; rt.error = null; emit('error'); }
      dirty = false; lastPersistWall = wall;
      return true;
    }
    rt.flush = function () { return persistNow('flush'); };

    // ---- loading and creating ----
    function identity() { return deps.player.identity(); }
    function readStored() {
      var attempts = [KEY, BAK], notes = [];
      for (var i = 0; i < attempts.length; i++) {
        var raw = null;
        try { raw = store.getItem(attempts[i]); } catch (_) { raw = null; }
        if (!raw) continue;
        try { var w = S.deserialize(raw, rt.env); return { world: w, from: attempts[i], notes: notes }; }
        catch (error) {
          notes.push(attempts[i] + ': ' + error.message);
          // Keep the unreadable text for later inspection; never delete it.
          try { var ck = KEY + '.corrupt', n = 0; while (store.getItem(ck) && store.getItem(ck) !== raw) ck = KEY + '.corrupt.' + (++n); store.setItem(ck, raw); } catch (_) { /* nothing more to do */ }
        }
      }
      return { world: null, notes: notes };
    }
    rt.exists = function () { try { return !!store.getItem(KEY) || !!store.getItem(BAK); } catch (_) { return false; } };
    rt.load = function () {
      var found = readStored();
      if (!found.world) { rt.state = 'idle'; rt.loadNotes = found.notes; return false; }
      rt.world = found.world; rt.loadNotes = found.notes; rt.recoveredFrom = found.from === BAK ? 'backup' : null;
      if (rt.world.identity && rt.world.identity !== identity()) {
        // A different save: this world's player listings refer to cards that are not here.
        S.detachPlayer(rt.world, rt.env);
        rt.world.identity = identity();
      }
      rt.world.identity = identity();
      var changes = S.reconcile(rt.world, rt.env, rt.host);
      if (changes.length) dirty = true;
      rt.state = 'ready';
      paused = !!rt.world.paused;
      return true;
    };
    rt.create = function (options) {
      var o = options || {};
      var prevNonce = rt.world ? rt.world.nonce : 0;
      var nonce = o.nonce || prevNonce + 1 || 1;
      var seed = o.seed != null ? o.seed : (identity() + '|sim');
      var reserved = deps.player.codes ? deps.player.codes() : [];
      var world = S.create({ seed: seed, nonce: nonce, wall: deps.wall(), reservedCodes: reserved }, rt.env);
      world.identity = identity();
      // Warm-up: the same engine, run before the player arrives, so day one has real history.
      var warm = cfg().warmupDays * S.DAY;
      var r;
      do { r = S.advance(world, rt.env, rt.host, warm, 4000); } while (!r.reached);
      world.epoch = world.now;
      world.speedNote = '';
      paused = false;
      rt.world = world; rt.state = 'ready'; dirty = true; rt.revision++;
      persistNow('action');
      emit('changed');
      return world;
    };
    rt.ensure = function () { if (!rt.world && !rt.load()) rt.create(); return rt.world; };

    // ---- clock ----
    function active() {
      if (paused) return false;
      var g = deps.gate();
      return g === true;
    }
    function currentState() {
      if (!rt.world) return 'idle';
      if (paused) return 'paused';
      var g = deps.gate();
      if (g === true) return 'running';
      return 'frozen';
    }
    function setState() {
      var next = currentState(), why = '';
      if (next === 'paused') why = 'You paused the simulation.';
      else if (next === 'frozen') why = typeof deps.gate() === 'string' ? deps.gate() : 'The game is not active.';
      if (next !== rt.state || why !== rt.reason) { rt.state = next; rt.reason = why; emit('state'); }
    }
    rt.tick = function () {
      if (!rt.world) return { advanced: 0 };
      timer = 0;
      var now = deps.now();
      setState();
      if (!active()) { last = null; return { advanced: 0, frozen: true }; }
      if (last == null) { last = now; return { advanced: 0, started: true }; }
      var dt = now - last; last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > cfg().maxGapMs) { rt.skipped = (rt.skipped || 0) + 1; dt = 0; }
      var base = pendingTarget != null ? pendingTarget : rt.world.now;
      var target = base + dt * factor();
      var res = S.advance(rt.world, rt.env, rt.host, target, cfg().tickBudgetEvents);
      pendingTarget = res.reached ? null : target;
      if (res.processed) { rt.revision++; dirty = true; }
      if (deps.sample && S.advisor && S.advisor.due(rt.world)) { try { deps.sample(rt.world, rt.env); dirty = true; } catch (e) { if (deps.log) deps.log(e); } }
      if (S.retrySettlements && rt.world.pending.length) S.retrySettlements(rt.world, rt.env, rt.host);
      if (dirty && deps.wall() - lastPersistWall >= cfg().persistEveryMs) persistNow('tick');
      emit('tick');
      if (res.processed) emit('changed');
      return { advanced: dt * factor(), processed: res.processed };
    };
    function schedule() {
      if (!running || timer) return;
      var delay = 1000;
      if (rt.world && rt.world.queue.length) {
        var wait = (rt.world.queue[0].t - rt.world.now) / factor();
        delay = Math.max(250, Math.min(2000, wait));
      }
      timer = deps.timers.set(function () { timer = 0; rt.tick(); schedule(); }, delay);
    }
    rt.start = function () { if (running) return; running = true; last = rt.world && active() ? deps.now() : null; schedule(); };
    rt.stop = function () { running = false; if (timer) { deps.timers.clear(timer); timer = 0; } last = null; persistNow('flush'); };
    // Called when the game becomes hidden or inactive: the interval is dropped, not banked.
    rt.interrupt = function () { last = null; pendingTarget = null; setState(); persistNow('flush'); };
    rt.resumeClock = function () { setState(); last = active() ? deps.now() : null; };
    rt.pause = function () { paused = true; if (rt.world) rt.world.paused = true; last = null; pendingTarget = null; setState(); persistNow('action'); emit('state'); };
    rt.resume = function () { paused = false; if (rt.world) rt.world.paused = false; pendingTarget = null; setState(); last = active() ? deps.now() : null; persistNow('action'); emit('state'); };
    rt.setSpeed = function (id) { if (!cfg().speeds.some(function (s) { return s.id === id; })) return false; rt.speedId = id; if (deps.saveSpeed) deps.saveSpeed(id); emit('state'); return true; };
    // What the clock would be doing right now, without announcing anything: the interface reads this.
    rt.peek = function () {
      var state = currentState(), why = '';
      if (state === 'paused') why = 'You paused the simulation.';
      else if (state === 'frozen') { var g = deps.gate(); why = typeof g === 'string' ? g : 'The game is not active.'; }
      return { state: state, reason: why };
    };
    Object.defineProperty(rt, 'paused', { get: function () { return paused; } });
    rt.factor = factor;

    // ---- player actions: apply, persist at once, tell the UI ----
    function act(fn) {
      var w = rt.ensure();
      var result = fn(w);
      if (result && result.ok !== false) { rt.revision++; dirty = true; persistNow('action'); emit('changed'); }
      else if (result && result.pending) { persistNow('action'); emit('changed'); }
      return result;
    }
    var P = S.player;
    rt.act = {
      list: function (spec) { return act(function (w) { return P.list(w, rt.env, rt.host, spec); }); },
      cancel: function (id, req) { return act(function (w) { return P.cancel(w, rt.env, rt.host, id, req); }); },
      buy: function (id, req) { return act(function (w) { return P.buy(w, rt.env, rt.host, id, req); }); },
      bid: function (id, max, req) { return act(function (w) { return P.bid(w, rt.env, rt.host, id, max, req); }); },
      buyout: function (id, req) { return act(function (w) { return P.buyout(w, rt.env, rt.host, id, req); }); },
      placeOrder: function (spec) { return act(function (w) { return P.placeOrder(w, rt.env, rt.host, spec); }); },
      cancelOrder: function (id) { return act(function (w) { return P.cancelOrder(w, rt.env, rt.host, id); }); },
      propose: function (spec) { return act(function (w) { return P.propose(w, rt.env, rt.host, spec); }); },
      respond: function (id, accept, req) { return act(function (w) { return P.respond(w, rt.env, rt.host, id, accept, req); }); },
      withdraw: function (id) { return act(function (w) { return P.withdraw(w, rt.env, rt.host, id); }); }
    };
    rt.markNoticesRead = function () { if (!rt.world) return; rt.world.notices.forEach(function (n) { n.read = true; }); dirty = true; persistNow('action'); emit('changed'); };

    // ---- queries the rest of the game needs ----
    rt.lockOf = function (instanceId) { return rt.world ? rt.world.locks[instanceId] || null : null; };
    rt.heldCredits = function () { return rt.world ? S.playerHeld(rt.world) : 0; };
    rt.subscribe = function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; };

    // ---- lifecycle operations ----
    // Reset: a new world. Cards you have listed come back to you simply because they never left your save.
    rt.reset = function (options) {
      var keep = rt.world;
      var nonce = keep ? keep.nonce + 1 : 1;
      rt.world = null;
      rt.create(Object.assign({ nonce: nonce }, options || {}));
      emit('reset');
      return rt.world;
    };
    rt.exportText = function () { return rt.world ? S.serialize(rt.world) : null; };
    rt.importText = function (text) {
      var w = S.deserialize(text, rt.env);
      var prior = rt.world;
      rt.world = w; w.identity = identity();
      var changes = S.reconcile(w, rt.env, rt.host);
      dirty = true; rt.revision++; persistNow('action'); emit('reset');
      return { ok: true, changes: changes, replaced: !!prior };
    };
    // After the player's save was replaced.
    rt.saveReplaced = function () {
      if (!rt.world) return;
      if (rt.world.identity && rt.world.identity !== identity()) { S.detachPlayer(rt.world, rt.env); rt.world.identity = identity(); }
      var changes = S.reconcile(rt.world, rt.env, rt.host);
      if (changes.length || true) { dirty = true; rt.revision++; persistNow('action'); emit('changed'); }
      return changes;
    };
    // Developer-only: moves time forward explicitly. The normal clock is never changed behind the player's back.
    rt.dev = {
      fastForward: function (simMs) {
        var w = rt.ensure(), target = w.now + simMs, r, n = 0, chunk = 3 * 3600000;
        // In steps, so the net worth line gets its points exactly as it would while playing.
        while (w.now < target) {
          var to = Math.min(target, w.now + chunk);
          do { r = S.advance(w, rt.env, rt.host, to, 4000); n += r.processed; } while (!r.reached);
          if (deps.sample && S.advisor && S.advisor.due(w)) { try { deps.sample(w, rt.env); } catch (e) { if (deps.log) deps.log(e); } }
        }
        rt.revision++; dirty = true; persistNow('action'); emit('changed');
        return { processed: n, now: w.now };
      }
    };
    rt.setPaused = function (p) { paused = !!p; };
    rt.persist = persistNow;
    return rt;
  }
  S.Runtime = Runtime;
})(window.Cardable = window.Cardable || {});
