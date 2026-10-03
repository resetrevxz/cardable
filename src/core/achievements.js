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
    if (value.trackedEvents !== undefined) {
      require(value.trackedEvents && typeof value.trackedEvents === 'object' && !Array.isArray(value.trackedEvents));
      Object.keys(value.trackedEvents).forEach(function (id) { require(Array.isArray(value.trackedEvents[id]) && value.trackedEvents[id].every(function (key) { return typeof key === 'string'; })); });
    }
  }
  // The same engine is used by gameplay and the single isolated developer check.
  function create(adapter) {
    var definitions = new Map(), counterIndex = new Map(), eventIndex = new Map(), derivedIndex = new Map();
    var queue = [], draining = false, instances = new Set(), designs = new Set(), eventInstances = new Map();
    var firstDates = {}, savedSettings = {};
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
      var def = definitions.get(id); if (!def || !active(def)) return null;
      var tier = data().unlocked[id]?.tier || 0;
      return { value: value(def), goal: def.tiers[Math.min(tier, def.tiers.length - 1)].goal, tier: tier, maxTier: def.tiers.length };
    }
    function drain() {
      if (draining) return; draining = true;
      try { while (queue.length) adapter.emit('achievement:unlocked', queue.shift()); }
      finally { draining = false; }
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
      rebuild(); var total = 0;
      if (missing) {
        var items = save().inventory;
        data().counters.packsOpened = Math.max(save().stats?.packsOpened || 0, save().packs?.openedCount || 0);
        data().counters.uniqueCards = designs.size;
        data().counters.variantCopies = items.filter(function (i) { return !!i.variantId; }).length;
        definitions.forEach(function (def) {
          if (!active(def)) return;
          if (def.track.backfill) {
            var evidence = def.track.backfill(save());
            data().counters['event.' + def.id] = Array.isArray(evidence) ? evidence.length : Math.max(0, Number(evidence) || 0);
            if (Array.isArray(evidence)) {
              rememberDate(def.id, evidence);
              var seen = evidence.map(function (i) { return i.instanceId; }).filter(Boolean);
              data().trackedEvents = data().trackedEvents || {}; data().trackedEvents[def.id] = seen; eventInstances.set(def.id, new Set(seen));
            }
          } else if (def.track.counter === 'uniqueCards') rememberDate(def.id, items);
          else if (def.track.counter === 'variantCopies') rememberDate(def.id, items.filter(function (i) { return !!i.variantId; }));
        });
        total = evaluate(Array.from(definitions.values()), true);
        // One summary replaces individual retro toasts. Journal still receives each contractual event.
        adapter.persist(); drain();
        if (total) adapter.emit('achievement:backfilled', { count: Object.keys(data().unlocked).length });
      }
      return total;
    }
    function handle(name, payload) {
      if (!data()) init();
      var affected = [], changed = false;
      function set(key, next) { if (!integer(next)) return; if (count(key) !== next) { data().counters[key] = next; affected = affected.concat(counterIndex.get(key) || []); changed = true; } }
      if (name === 'pack:opened') set('packsOpened', Math.max(count('packsOpened'), save().stats?.packsOpened || 0, save().packs?.openedCount || 0));
      if (name === 'card:kept' && payload && !instances.has(payload.instanceId)) {
        instances.add(payload.instanceId);
        if (!designs.has(payload.cardId)) { designs.add(payload.cardId); set('uniqueCards', designs.size); }
        if (payload.variantId) set('variantCopies', count('variantCopies') + 1);
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
        if (payload?.instanceId && (seen.has(payload.instanceId) || instances.has(payload.instanceId) && name === 'card:revealed')) return;
        if (payload?.instanceId) { seen.add(payload.instanceId); data().trackedEvents = data().trackedEvents || {}; data().trackedEvents[def.id] = Array.from(seen); }
        var key = 'event.' + def.id; set(key, count(key) + (accepted === true ? 1 : Math.max(0, Number(accepted) || 0))); affected.push(def);
      });
      affected = affected.concat(derivedIndex.get(name) || []);
      var unlocked = evaluate(affected, false, payload);
      if (changed || unlocked) { adapter.persist(); drain(); adapter.emit('achievement:changed'); }
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
      progress: progress,
      isUnlocked: function (id) { return !!progress(id)?.tier; },
      list: function () { return Array.from(definitions.values()).filter(active); },
      totals: function () { return api.list().reduce(function (out, def) { var p = progress(def.id); out.unlocked += p.tier; out.total += p.maxTier; out.achievements += p.tier ? 1 : 0; return out; }, { unlocked: 0, total: 0, achievements: 0 }); },
      markSeen: function (id) { if (!data().seen.includes(id)) { data().seen.push(id); adapter.persist(); } },
      setCounter: function (key, amount) { if (!integer(amount)) throw new Error('Use a non-negative safe integer'); data().counters[key] = amount; evaluate(counterIndex.get(key) || [], false); adapter.persist(); drain(); adapter.emit('achievement:changed'); },
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
    available: function (name) { return !!C.config.flags[name]; }, listen: subscribe,
    emit: function (name, value) { C.events.emit(name, value); },
    reward: function (reward, save) {
      if (reward.credits) {
        if (!integer(reward.credits) || !integer(save.currency + reward.credits)) throw new Error('Invalid achievement reward');
        if (rewardBefore === null) rewardBefore = save.currency;
        save.currency += reward.credits;
      }
      // No typed pack-grant API exists yet. C will declare only supported rewards.
    },
    persist: function () {
      C.state.save();
      if (rewardBefore !== null) { var before = rewardBefore; rewardBefore = null; C.events.emit('currency:changed', { before: before, value: C.state.current.currency, amount: C.state.current.currency - before, direction: 1 }); }
    }
  });
  C.achievements.create = create;
  C.data.achievements.forEach(C.achievements.register);
  ['pack:opened', 'card:kept', 'save:exported', 'settings:persisted'].forEach(subscribe);
  C.events.on('app:ready', function () { initialized = true; C.achievements.init(); });
  C.events.on('save:replaced', function () { if (initialized) { C.events.emit('achievement:resetting'); C.achievements.init(); C.events.emit('achievement:changed'); } });
})(window.Cardable);
