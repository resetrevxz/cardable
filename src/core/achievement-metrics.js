(function (C) {
  'use strict';
  function variants(item) {
    return Array.from(new Set([item.variantId].concat(item.variantIds || [], Object.values(item.variants || {})).filter(function (id) { return typeof id === 'string' && id; })));
  }
  function year(card) { return Number.isInteger(card.releaseYear) ? card.releaseYear : card.releasedAt ? new Date(card.releasedAt).getFullYear() : null; }
  function day(at) { var d = new Date(at); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000; }
  function create() {
    var instances, copies, owned, rarities, finishes, slots, brands, generations, classic, catalog, newest;
    var result = {};
    function add(item) {
      if (!item || instances.has(item.instanceId)) return;
      instances.add(item.instanceId); var card = C.card(item.cardId);
      if (!card || card.retired || card.active === false) return;
      copies.set(card.id, (copies.get(card.id) || 0) + 1);
      owned.add(card.id); rarities.add(card.rarity);
      variants(item).forEach(function (id) { var v = C.variant(id); if (!v) return; finishes.add(id); slots.add(v.slot || 'finish'); });
      if (variants(item).length) result.variantCopies++;
      if (card.era === 'classic') classic.add(card.id);
      if (year(card) !== null && year(card) < 2003) result.timeCapsule = 1;
      if (card.generation === newest) result.newcomer = 1;
    }
    function projection() {
      result.uniqueCards = owned.size; result.rarityCount = rarities.size; result.variantKinds = finishes.size; result.variantSlots = slots.size;
      result.duplicates = Math.max(0, ...copies.values()); result.classicCards = classic.size;
      result.generationsComplete = 0;
      generations.forEach(function (ids) { if (ids.length && ids.every(function (id) { return owned.has(id); })) result.generationsComplete++; });
      brands.forEach(function (ids, brand) { result['brand.' + brand] = ids.length && ids.every(function (id) { return owned.has(id); }) ? 1 : 0; });
      return Object.assign({}, result);
    }
    function history(save) {
      var a = save.achievements;
      if (!a.history) a.history = { packTypes: [], openDays: [], hot: 0, cold: 0, variantWindow: [], studioProps: [], studioCards: [], lightColors: [] };
      ['packTypes', 'openDays', 'variantWindow', 'studioProps', 'studioCards', 'lightColors'].forEach(function (key) { if (!Array.isArray(a.history[key])) a.history[key] = []; });
      return a.history;
    }
    function distinct(list, item) { if ((typeof item === 'string' || Number.isSafeInteger(item)) && !list.includes(item)) list.push(item); }
    function habitValues(h) {
      var sorted = h.openDays.slice().sort(function (a,b) { return a-b; }), run = 0, best = 0, previous = null;
      sorted.forEach(function (n) { run = n === previous + 1 ? run + 1 : 1; previous = n; best = Math.max(best, run); });
      return { openingDays: sorted.length, dayStreak: best, packVariety: h.packTypes.length };
    }
    function rebuild(save) {
      instances = new Set(); copies = new Map(); owned = new Set(); rarities = new Set(); finishes = new Set(); slots = new Set(); brands = new Map(); generations = new Map(); classic = new Set();
      catalog = C.data.cards.filter(function (c) { return !c.retired && c.active !== false; });
      newest = C.data.generations.slice().sort(function (a,b) { return b.order-a.order; })[0]?.id;
      catalog.forEach(function (c) { if (!brands.has(c.brand)) brands.set(c.brand, []); brands.get(c.brand).push(c.id); if (!generations.has(c.generation)) generations.set(c.generation, []); generations.get(c.generation).push(c.id); });
      result = { variantCopies: 0, newcomer: 0, timeCapsule: 0 };
      var kept = save.pendingReveal ? save.pendingReveal.cards.slice(0, save.pendingReveal.keptCount || 0).filter(function (i) { return !(save.pendingReveal.discardedInstanceIds || []).includes(i.instanceId); }) : [];
      var items = save.inventory.concat(kept); items.forEach(add);
      var h = history(save), evidence = new Map();
      if (save.achievements.catalogRevision === undefined) items.forEach(function (i) {
        if (Number.isFinite(i.pulledAt)) { distinct(h.openDays, day(i.pulledAt)); if (new Date(i.pulledAt).getHours() < 4) result.nightOwl = 1; }
        if (i.packId) { distinct(h.packTypes, i.packId); evidence.set(i.packId + ':' + i.pulledAt, i.packId); }
      });
      var rare = 0, legendary = 0; evidence.forEach(function (id) { if (id === 'rare') rare++; if (id === 'legendary') legendary++; });
      result.rarePacks = Math.max(save.achievements.counters.rarePacks || 0, rare);
      result.legendaryPacks = Math.max(save.achievements.counters.legendaryPacks || 0, legendary);
      result.favorites = save.inventoryUi?.favorites?.length || 0;
      result.studioProps = h.studioProps.length; result.studioCards = h.studioCards.length; result.lightColors = h.lightColors.length;
      Object.assign(result, habitValues(h));
      // Existing A/B saves had no per-pack receipt. Do not replay their historical luck or rewards.
      if (h.lastPackNumber == null || save.achievements.catalogRevision === undefined) h.lastPackNumber = save.packs?.openedCount || save.stats?.packsOpened || 0;
      return projection();
    }
    function pack(payload, save, now) {
      var h = history(save), number = save.packs?.openedCount || save.stats?.packsOpened || 0;
      if (number <= (h.lastPackNumber || 0)) return {};
      if (number > (h.lastPackNumber || 0) + 1) { h.hot = 0; h.cold = 0; h.variantWindow = []; }
      h.lastPackNumber = number;
      var reserved = save.pendingReveal, packId = payload?.pack?.id || payload?.packId || reserved?.packId;
      var at = reserved?.committedAt ?? now, cards = payload?.cards || reserved?.cards || [];
      if (packId) distinct(h.packTypes, packId);
      if (packId === 'rare') result.rarePacks = (save.achievements.counters.rarePacks || 0) + 1;
      if (packId === 'legendary') result.legendaryPacks = (save.achievements.counters.legendaryPacks || 0) + 1;
      distinct(h.openDays, day(at)); result.nightOwl = Math.max(save.achievements.counters.nightOwl || 0, new Date(at).getHours() < 4 ? 1 : 0);
      if (cards.length) {
        var good = cards.some(function (i) { return (C.rarity(C.card(i.cardId)?.rarity)?.tier ?? -1) >= (C.rarity('rare')?.tier ?? 3); });
        h.hot = good ? (h.hot || 0) + 1 : 0; h.cold = good ? 0 : (h.cold || 0) + 1;
        result.hotStreak = Math.max(save.achievements.counters.hotStreak || 0, h.hot); result.coldStreak = Math.max(save.achievements.counters.coldStreak || 0, h.cold);
        h.variantWindow.push(cards.filter(function (i) { return variants(i).length > 0; }).length); h.variantWindow = h.variantWindow.slice(-10);
        result.variantRun = Math.max(save.achievements.counters.variantRun || 0, h.variantWindow.reduce(function (n,v) { return n+v; }, 0));
      }
      return Object.assign({}, result, habitValues(h));
    }
    return {
      rebuild: rebuild,
      handle: function (name, payload, save, now) {
        if (name === 'card:kept') { add(payload); return projection(); }
        if (name === 'opening:committed' || name === 'pack:opened') return pack(payload, save, now);
        if (name === 'inventory:preferencesChanged') { result.favorites = save.inventoryUi?.favorites?.length || 0; return { favorites: result.favorites }; }
        if (name === 'pack:ready') return { patientCollector: payload?.gained > 0 && payload.ready >= Math.max(2, C.config.packs.maxStored) ? 1 : save.achievements.counters.patientCollector || 0 };
        if (name === 'achievement:visit') {
          var h = history(save), before = h.lastVisit; h.lastVisit = now;
          return { welcomeBack: Math.max(save.achievements.counters.welcomeBack || 0, before != null && now - before >= 7 * 86400000 ? 1 : 0) };
        }
        if (name === 'studio:photo') {
          if (payload?.photoId && save.achievements.trackedEvents?.shutterbug?.includes(payload.photoId)) return {};
          var h = history(save); (payload?.props || []).forEach(function (p) { distinct(h.studioProps, typeof p === 'string' ? p : p.id); });
          (payload?.lights || []).filter(function (l) { return l.color && !['white', '#fff', '#ffffff', 'neutral'].includes(String(l.color).toLowerCase()); }).forEach(function (l) { distinct(h.lightColors, String(l.color)); });
          distinct(h.studioCards, payload?.cardId);
          result.studioProps = h.studioProps.length; result.lightColors = h.lightColors.length; result.studioCards = h.studioCards.length;
          return { studioProps: result.studioProps, lightColors: result.lightColors, studioCards: result.studioCards };
        }
        return {};
      }
    };
  }
  C.achievementMetrics = { create: create, variants: variants, year: year };
})(window.Cardable);
