(function (C) {
  'use strict';
  function defaults() { return { counters: {}, unlocked: {}, seen: [], settingsSeenIntro: false }; }
  function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
  function normalize(value) { return Object.assign(defaults(), value || {}); }
  function validate(value) {
    if (value === undefined) return;
    function require(ok) { if (!ok) throw new Error('Invalid achievement progress'); }
    require(value && typeof value === 'object' && !Array.isArray(value));
    value = normalize(value);
    require(value.counters && typeof value.counters === 'object' && !Array.isArray(value.counters));
    Object.keys(value.counters).forEach(function (key) { require(integer(value.counters[key])); });
    require(value.unlocked && typeof value.unlocked === 'object' && !Array.isArray(value.unlocked));
    Object.keys(value.unlocked).forEach(function (id) {
      var entry = value.unlocked[id]; require(entry && integer(entry.tier) && entry.tier > 0 && typeof entry.retro === 'boolean');
      require(entry.at && typeof entry.at === 'object' && !Array.isArray(entry.at));
      for (var tier = 1; tier <= entry.tier; tier++) require(entry.at[tier] === null || typeof entry.at[tier] === 'number' && Number.isFinite(entry.at[tier]) && entry.at[tier] >= 0);
      if (entry.cardId !== undefined) require(typeof entry.cardId === 'string');
      if (entry.instanceId !== undefined) require(typeof entry.instanceId === 'string');
    });
    require(Array.isArray(value.seen) && value.seen.every(function (id) { return typeof id === 'string'; }));
    require(typeof value.settingsSeenIntro === 'boolean');
    ['trackedEvents', 'distinct'].forEach(function (field) {
      if (value[field] === undefined) return;
      require(value[field] && typeof value[field] === 'object' && !Array.isArray(value[field]));
      Object.keys(value[field]).forEach(function (id) { require(Array.isArray(value[field][id]) && value[field][id].every(function (key) { return typeof key === 'string'; })); });
    });
    if (value.seeded !== undefined) require(Array.isArray(value.seeded) && value.seeded.every(function (id) { return typeof id === 'string'; }));
    if (value.catalogRevision !== undefined) require(integer(value.catalogRevision));
    C.achievementBoard.validate(value.board);
    if (value.history !== undefined) {
      var h = value.history; require(h && typeof h === 'object' && !Array.isArray(h));
      ['packTypes', 'studioProps', 'studioCards', 'lightColors'].forEach(function (key) { if (h[key] !== undefined) require(Array.isArray(h[key]) && h[key].every(function (v) { return typeof v === 'string'; })); });
      if (h.openDays !== undefined) require(Array.isArray(h.openDays) && h.openDays.every(Number.isSafeInteger));
      if (h.variantWindow !== undefined) require(Array.isArray(h.variantWindow) && h.variantWindow.length <= 10 && h.variantWindow.every(function (v) { return integer(v); }));
      ['lastPackNumber', 'hot', 'cold', 'lastVisit'].forEach(function (key) { if (h[key] !== undefined) require(integer(h[key])); });
    }
  }
  // The same engine is used by gameplay and the single isolated developer check.
  function create(adapter) {
    var definitions = new Map(), counterIndex = new Map(), eventIndex = new Map(), derivedIndex = new Map();
    var queue = [], draining = false, instances = new Set(), designs = new Set(), eventInstances = new Map();
    var firstDates = {}, savedSettings = {}, projection = adapter.projection;
    var board = adapter.board ? C.achievementBoard.create(adapter) : null, secondsSinceSave = 0;
    function save() { return adapter.current(); }
    function data() { return save().achievements; }
    function active(def) { return !def.requires || !!(adapter.available && adapter.available(def.requires)); }
    function index(map, key, def) { if (!map.has(key)) map.set(key, []); map.get(key).push(def); }
    function count(key) { return data().counters[key] || 0; }
    function value(def) {
      if (def.track.counter) return count(def.track.counter);
      if (def.track.event) return count('event.' + def.id);
      return Math.max(0, Number(def.track.derive(save())) || 0);
    }
    function progress(id) {
      var scheduled = board && board.progress(id); if (scheduled) return scheduled;
      var def = definitions.get(id); if (!def || !active(def)) return null;
      var tier = Math.min(data().unlocked[id]?.tier || 0, def.tiers.length);
      return { value: value(def), goal: def.tiers[Math.min(tier, def.tiers.length - 1)].goal, tier: tier, maxTier: def.tiers.length };
    }
    function drain() {
      if (draining) return; draining = true;
      try { while (queue.length) adapter.emit('achievement:unlocked', queue.shift()); }
      finally { draining = false; }
      if (board) board.drain();
    }
    function unlock(def, tier, retro, at, trigger) {
      var entry = data().unlocked[def.id] || { tier: 0, at: {}, retro: !!retro };
      if (tier <= entry.tier) return false;
      entry.tier = tier; entry.at[tier] = at; entry.retro = entry.retro && !!retro;
      if (trigger?.cardId) { entry.cardId = trigger.cardId; entry.instanceId = trigger.instanceId; }
      data().unlocked[def.id] = entry; data().seen = data().seen.filter(function (id) { return id !== def.id; });
      var reward = def.tiers[tier - 1].reward;
      // Record tier and reward together before publishing an unlock. Replayed events cannot pay twice.
      if (reward) adapter.reward(reward, save());
      queue.push({ id: def.id, tier: tier, at: at, retro: !!retro });
      return true;
    }
    function evaluate(defs, retro, trigger) {
      var unique = new Set(defs), unlocked = 0;
      unique.forEach(function (def) {
        if (!active(def)) return;
        var amount = value(def), tier = data().unlocked[def.id]?.tier || 0;
        while (tier < def.tiers.length && amount >= def.tiers[tier].goal) {
          tier++; if (unlock(def, tier, retro, retro ? firstDates[def.id] ?? null : adapter.now(), trigger || firstDates[def.id + '.card'])) unlocked++;
        }
      });
      return unlocked;
    }
    function rememberDate(id, items) {
      var earliest = items.reduce(function (a, i) { return Number.isFinite(i.pulledAt) && (!a || i.pulledAt < a.pulledAt) ? i : a; }, null);
      if (earliest) { firstDates[id] = earliest.pulledAt; firstDates[id + '.card'] = earliest; }
    }
    function rebuild() {
      instances.clear(); designs.clear(); eventInstances.clear(); firstDates = {};
      save().inventory.forEach(function (i) { instances.add(i.instanceId); designs.add(i.cardId); });
      savedSettings = Object.assign({}, save().settings);
      Object.keys(data().trackedEvents || {}).forEach(function (id) { eventInstances.set(id, new Set(data().trackedEvents[id])); });
    }
    function init() {
      var missing = save().achievements === undefined;
      if (missing) save().achievements = defaults(); else { validate(data()); save().achievements = normalize(data()); }
      rebuild(); var total = 0, items = save().inventory;
      if (missing || data().catalogRevision !== adapter.catalogRevision) data().counters.packsOpened = Math.max(count('packsOpened'), save().stats?.packsOpened || 0, save().packs?.openedCount || 0);
      var projected = projection && projection.rebuild(save());
      if (projection && (missing || data().catalogRevision !== adapter.catalogRevision)) Object.assign(data().counters, projected);
      else if (missing) { data().counters.uniqueCards = designs.size; data().counters.variantCopies = items.filter(function (i) { return !!i.variantId; }).length; }
      var upgrade = adapter.catalogRevision !== undefined && data().catalogRevision !== adapter.catalogRevision;
      var seeded = new Set(upgrade ? [] : data().seeded || []), added = [];
      definitions.forEach(function (def) {
          if (!active(def) || seeded.has(def.id)) return;
          added.push(def); seeded.add(def.id);
          if (projected && def.track.counter && integer(projected[def.track.counter])) data().counters[def.track.counter] = projected[def.track.counter];
          if (def.track.backfill) {
            var evidence = def.track.backfill(save());
            var amount = Array.isArray(evidence) ? evidence.length : Math.max(0, Number(evidence) || 0);
            if (Array.isArray(evidence)) {
              rememberDate(def.id, evidence);
              var seen = evidence.map(function (i) { return i.instanceId; }).filter(Boolean);
              var receipts = new Set((data().trackedEvents || {})[def.id] || []); seen.forEach(function (id) { receipts.add(id); });
              data().trackedEvents = data().trackedEvents || {}; data().trackedEvents[def.id] = Array.from(receipts); eventInstances.set(def.id, receipts);
              if (def.track.distinct) {
                var keys = new Set((data().distinct || {})[def.id] || []); evidence.forEach(function (i) { var key = def.track.key(i); if (typeof key === 'string') keys.add(key); });
                data().distinct = data().distinct || {}; data().distinct[def.id] = Array.from(keys); amount = keys.size;
              }
            }
            data().counters['event.' + def.id] = Math.max(count('event.' + def.id), amount);
          } else if (def.track.evidence) rememberDate(def.id, def.track.evidence(save()));
          else if (def.track.counter === 'uniqueCards') rememberDate(def.id, items);
          else if (def.track.counter === 'variantCopies') rememberDate(def.id, items.filter(function (i) { return !!i.variantId; }));
      });
      data().seeded = Array.from(seeded);
      if (adapter.catalogRevision !== undefined) data().catalogRevision = adapter.catalogRevision;
      if (board) board.init();
      if (added.length || missing) {
        total = evaluate(added, true);
        var summaryCount = new Set(queue.map(function (p) { return p.id; })).size;
        // One summary replaces individual retro toasts. Journal still receives each contractual event.
        adapter.persist(); drain();
        if (total) adapter.emit('achievement:backfilled', { count: summaryCount });
      }
      if (board) { adapter.persist(); drain(); }
      return total;
    }
    function handle(name, payload) {
      if (!data()) init();
      var affected = [], changed = false;
      if (board) changed = board.refresh();
      function set(key, next) { if (!integer(next)) return; if (count(key) !== next) { data().counters[key] = next; affected = affected.concat(counterIndex.get(key) || []); changed = true; } }
      // Only the compact projections touched by this event are updated; inventory is scanned at load only.
      if (projection) { var values = projection.handle(name, payload, save(), adapter.now()); Object.keys(values).forEach(function (key) { set(key, values[key]); }); }
      if (name === 'pack:opened' || name === 'opening:committed') set('packsOpened', Math.max(count('packsOpened'), save().stats?.packsOpened || 0, save().packs?.openedCount || 0));
      var keptReceipts = eventInstances.get('recurring-kept') || new Set();
      if (name === 'card:kept' && payload?.instanceId && !instances.has(payload.instanceId) && !keptReceipts.has(payload.instanceId)) {
        keptReceipts.add(payload.instanceId);eventInstances.set('recurring-kept',keptReceipts);
        data().trackedEvents = data().trackedEvents || {};data().trackedEvents['recurring-kept'] = Array.from(keptReceipts);
        set('cardsKept', count('cardsKept') + 1);
        instances.add(payload.instanceId);
        if (!projection) {
          if (!designs.has(payload.cardId)) { designs.add(payload.cardId); set('uniqueCards', designs.size); }
          if (payload.variantId) set('variantCopies', count('variantCopies') + 1);
        }
      }
      if (name === 'save:exported') set('exports', count('exports') + 1);
      if (name === 'settings:persisted') {
        var changedKeys = Object.keys(save().settings || {}).filter(function (key) { return key !== 'settingsVersion' && savedSettings[key] !== save().settings[key]; });
        set('settingsChanged', count('settingsChanged') + changedKeys.length); savedSettings = Object.assign({}, save().settings);
      }
      (eventIndex.get(name) || []).forEach(function (def) {
        if (!active(def)) return;
        var accepted = def.track.test ? def.track.test(payload, save()) : 1;
        if (!accepted) return;
        var seen = eventInstances.get(def.id) || new Set(); eventInstances.set(def.id, seen);
        var receipt = payload?.photoId || payload?.eventId || payload?.instanceId;
        if (receipt && (seen.has(receipt) || instances.has(receipt) && name === 'card:revealed')) return;
        if (receipt) { seen.add(receipt); data().trackedEvents = data().trackedEvents || {}; data().trackedEvents[def.id] = Array.from(seen); changed = true; }
        var key = 'event.' + def.id, next = count(key) + (accepted === true ? 1 : Math.max(0, Number(accepted) || 0));
        if (def.track.distinct) {
          var distinct = new Set((data().distinct || {})[def.id] || []), item = def.track.key(payload);
          if (typeof item !== 'string') return;
          distinct.add(item); data().distinct = data().distinct || {}; data().distinct[def.id] = Array.from(distinct); next = distinct.size;
        }
        set(key, next); affected.push(def);
      });
      affected = affected.concat(derivedIndex.get(name) || []);
      var unlocked = evaluate(affected, false, payload);
      if (board) changed = board.refresh() || changed;
      if (changed || unlocked || name === 'achievement:visit') { adapter.persist(); drain(); adapter.emit('achievement:changed'); }
    }
    var api = {
      defaults: defaults, normalize: normalize, validate: validate, init: init, handle: handle,
      register: function (def) {
        if (!def || !/^[a-z0-9-]+$/.test(def.id) || definitions.has(def.id) || !def.track || !def.tiers?.length) throw new Error('Invalid or duplicate achievement');
        def.tiers.forEach(function (tier, i) { if (!integer(tier.goal) || tier.goal < 1 || i && tier.goal <= def.tiers[i - 1].goal) throw new Error('Invalid achievement ladder'); });
        definitions.set(def.id, def);
        if (def.track.counter) index(counterIndex, def.track.counter, def);
        else if (def.track.event) index(eventIndex, def.track.event, def);
        else if (typeof def.track.derive === 'function') (def.track.events || ['card:kept', 'card:discarded']).forEach(function (name) { index(derivedIndex, name, def); });
        else throw new Error('Achievement needs a tracker');
        if (adapter.listen) {
          if (def.track.event) adapter.listen(def.track.event, handle);
          if (def.track.derive) (def.track.events || ['card:kept', 'card:discarded']).forEach(function (name) { adapter.listen(name, handle); });
        }
        return def;
      },
      progress: progress, available: function (name) { return !!(adapter.available && adapter.available(name)); },
      isUnlocked: function (id) { return !!progress(id)?.tier; },
      list: function () { return Array.from(definitions.values()).filter(active).concat(board ? board.list() : []); },
      totals: function () { return api.list().reduce(function (out, def) { var p = progress(def.id); out.unlocked += p.tier; out.total += p.maxTier; out.achievements += p.tier ? 1 : 0; return out; }, { unlocked: 0, total: 0, achievements: 0 }); },
      markSeen: function (id) { if (!data().seen.includes(id)) { data().seen.push(id); adapter.persist(); } },
      claim: function (id) { return board ? board.claim(id) : false; },
      isPinned: function (id) { return board ? board.isPinned(id) : false; },
      togglePin: function (id) { return board && board.togglePin(id); },
      get weekEndsAt() { return board && board.weekEndsAt; },
      get earnedCredits() { return board ? board.earned : 0; },
      tickOpen: function (seconds, force) {
        if (!board || !data() || !integer(seconds)) return;
        var changed = board.refresh();
        if (!integer(count('openSeconds') + seconds)) throw new Error('Achievement time exceeds its safe range');
        data().counters.openSeconds = count('openSeconds') + seconds;
        secondsSinceSave += seconds; changed = board.refresh() || changed;
        if (changed || force || secondsSinceSave >= 30) { secondsSinceSave = 0; adapter.persist(); drain(); }
        adapter.emit(changed ? 'achievement:changed' : 'achievement:clock');
      },
      setCounter: function (key, amount) { if (!integer(amount)) throw new Error('Use a non-negative safe integer'); data().counters[key] = amount; evaluate(counterIndex.get(key) || [], false); if (board) board.refresh(); adapter.persist(); drain(); adapter.emit('achievement:changed'); },
      unlock: function (id) { var def = definitions.get(id); if (!def || !active(def)) return; for (var tier = (data().unlocked[id]?.tier || 0) + 1; tier <= def.tiers.length; tier++) unlock(def, tier, false, adapter.now()); adapter.persist(); drain(); adapter.emit('achievement:changed'); },
      lock: function (id) { delete data().unlocked[id]; data().seen = data().seen.filter(function (item) { return item !== id; }); adapter.persist(); adapter.emit('achievement:changed'); }
    };
    return api;
  }
  var subscribed = new Set(), rewardBefore = null;
  function subscribe(name) { if (subscribed.has(name)) return; subscribed.add(name); C.events.on(name, function (payload) { if (initialized) C.achievements.handle(name, payload); }); }
  var initialized = false;
  C.achievements = create({
    current: function () { return C.state.current; }, now: function () { return Date.now(); },
    available: function (name) { return !!C.config.flags[name] || !!C.data.achievementCapabilities?.[name]?.() || C.events.supports(name); }, listen: subscribe,
    projection: C.achievementMetrics.create(), catalogRevision: C.data.achievementCatalogRevision, board: true,
    emit: function (name, value) { C.events.emit(name, value); },
    reward: function (reward, save) {
      if (reward.credits) {
        if (!integer(reward.credits) || !integer(save.currency + reward.credits)) throw new Error('Invalid achievement reward');
        if (rewardBefore === null) rewardBefore = save.currency;
        save.currency += reward.credits;
      }
      // This catalog uses credits; a typed pack-grant API is not available in the baseline.
    },
    persist: function () {
      C.state.save();
      if (rewardBefore !== null) { var before = rewardBefore; rewardBefore = null; C.events.emit('currency:changed', { before: before, value: C.state.current.currency, amount: C.state.current.currency - before, direction: 1 }); }
    }
  });
  C.achievements.create = create;
  C.data.achievements.forEach(C.achievements.register);
  // The existing opening publisher always provides this geometry event.
  C.events.declare('cut:complete');
  ['opening:committed', 'pack:opened', 'card:kept', 'save:exported', 'settings:persisted', 'pack:ready', 'inventory:preferencesChanged', 'studio:photo', 'achievement:visit'].forEach(subscribe);
  C.events.on('events:available', function (p) {
    if (initialized && C.data.achievements.some(function (def) { return def.requires === p.name; })) { C.achievements.init(); C.events.emit('achievement:changed'); }
  });
  function initialize() {
    C.achievements.init();
    // Recover the narrow gap between a durable pack reservation and its event receipt.
    if (C.state.current.pendingReveal) C.achievements.handle('opening:committed', { cards: C.state.current.pendingReveal.cards });
  }
  C.events.on('app:ready', function () { initialized = true; initialize(); timeSample = document.hidden ? null : performance.now(); C.achievements.handle('achievement:visit'); });
  function visit() { if (initialized) C.achievements.handle('achievement:visit'); }
  var timeSample = null, remainder = 0, nativeVisible = true;
  function sampleTime(force) {
    if (!initialized) return;
    var now = performance.now(), elapsed = timeSample === null ? 0 : now - timeSample;
    timeSample = document.hidden || !nativeVisible ? null : now;
    // Use the shared one-second timer. No offline catch-up or render-loop keepalive.
    if (timeSample !== null && elapsed >= 0 && elapsed <= 5000) remainder += elapsed;
    var seconds = Math.floor(remainder / 1000); remainder %= 1000;
    C.achievements.tickOpen(seconds, !!force);
  }
  function leave() { if (initialized) { C.achievements.tickOpen(0,true); timeSample = null; C.state.current.achievements.history.lastVisit = Date.now(); C.state.save(); } }
  C.events.on('timer:tick', function () { if (!document.hidden && nativeVisible) sampleTime(false); });
  C.events.on('desktop:visibility', function (visible) { if (!visible) sampleTime(true); nativeVisible = !!visible; timeSample = visible && !document.hidden ? performance.now() : null; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) leave(); else { timeSample = performance.now(); visit(); } });
  window.addEventListener('pagehide', leave);
  C.events.on('save:replaced', function () { if (initialized) { remainder = 0; timeSample = document.hidden ? null : performance.now(); C.events.emit('achievement:resetting'); initialize(); C.events.emit('achievement:changed'); } });
})(window.Cardable);
