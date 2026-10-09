(function (C) {
  'use strict';
  function ids(value) { return Array.isArray(value) ? Array.from(new Set(value.map(function (id) { return C.stacks.canonical(id); }).filter(Boolean))) : []; }
  function defaults() { return { viewMode: 'shelf', sortMode: 'catalog', groupMode: 'none', showUnowned: true, activeCollectionId: 'all', lastSelectedStackKey: null, pendingFocusStackKey: null, favorites: [], collections: [], customOrders: { all: [], favorites: [] } }; }
  function normalize(value) {
    var result = Object.assign(defaults(), value && typeof value === 'object' && !Array.isArray(value) ? value : {});
    ['viewMode', 'sortMode', 'groupMode'].forEach(function (key) {
      var options = key === 'viewMode' ? ['shelf', 'grid'] : key === 'groupMode' ? ['none', 'rarity', 'generation', 'brand', 'ownership', 'new', 'variant'] : ['catalog', 'custom', 'recent', 'oldest', 'name-asc', 'name-desc', 'rarity-asc', 'rarity-desc', 'generation', 'vram-asc', 'vram-desc', 'quantity', 'serial'];
      if (options.indexOf(result[key]) < 0) result[key] = defaults()[key];
    });
    result.showUnowned = result.showUnowned !== false; result.favorites = ids(result.favorites);
    var used = new Set(['all', 'favorites']);
    result.collections = (Array.isArray(result.collections) ? result.collections : []).filter(function (item) {
      if (!item || typeof item.id !== 'string' || !item.id || used.has(item.id)) return false; used.add(item.id); return true;
    }).map(function (item) { return { id: item.id, name: String(item.name || 'Collection').trim().slice(0, 60) || 'Collection', stackKeys: ids(item.stackKeys) }; });
    var orders = result.customOrders, clean = Object.create(null);
    used.forEach(function (id) { clean[id] = ids(orders && orders[id]); }); result.customOrders = clean;
    if (!used.has(result.activeCollectionId)) result.activeCollectionId = 'all';
    ['lastSelectedStackKey', 'pendingFocusStackKey'].forEach(function (key) { result[key] = C.stacks.canonical(result[key]); });
    if (result.sortMode === 'custom') result.groupMode = 'none';
    return result;
  }
  function mutate(update) {
    var previousCollections=JSON.stringify(C.state.current.inventoryUi.collections);
    // UI edits own only inventoryUi. Preserve card-instance identity and avoid
    // cloning the complete collection/journal/Studio state on each selection.
    var candidate = Object.assign({}, C.state.current);
    candidate.inventoryUi = JSON.parse(JSON.stringify(candidate.inventoryUi));
    update(candidate.inventoryUi, candidate); candidate.inventoryUi = normalize(candidate.inventoryUi);
    C.state.current = candidate; C.state.save();
    C.events.emit('inventory:preferencesChanged', candidate.inventoryUi);
    if(previousCollections!==JSON.stringify(candidate.inventoryUi.collections))C.events.emit('inventory:collectionsChanged',candidate.inventoryUi.collections);
    return candidate.inventoryUi;
  }
  C.inventoryModel = {
    defaults: defaults, normalize: normalize,
    get current() { return C.state.current.inventoryUi; },
    update: function (patch) { return mutate(function (ui) { Object.assign(ui, patch); }); },
    favorite: function (id) { id = C.stacks.canonical(id); if (!C.state.current.inventory.some(function (item) { return C.stacks.of(item) === C.stacks.canonical(id); })) return; return mutate(function (ui) { var at = ui.favorites.indexOf(id); if (at < 0) ui.favorites.push(id); else ui.favorites.splice(at, 1); }); },
    create: function (name) { var id = C.randomId('collection'); mutate(function (ui) { ui.collections.push({ id: id, name: String(name).trim().slice(0, 60) || 'Collection', stackKeys: [] }); ui.customOrders[id] = []; ui.activeCollectionId = id; }); return id; },
    rename: function (id, name) { mutate(function (ui) { var item = ui.collections.find(function (c) { return c.id === id; }); if (item && String(name).trim()) item.name = String(name).trim().slice(0, 60); }); },
    remove: function (id) { mutate(function (ui) { ui.collections = ui.collections.filter(function (c) { return c.id !== id; }); delete ui.customOrders[id]; if (ui.activeCollectionId === id) ui.activeCollectionId = 'all'; }); },
    moveCollection: function (id, delta) { mutate(function (ui) { var at = ui.collections.findIndex(function (c) { return c.id === id; }); if (at < 0) return; var to = Math.max(0, Math.min(ui.collections.length - 1, at + delta)); ui.collections.splice(to, 0, ui.collections.splice(at, 1)[0]); }); },
    membership: function (collectionId, cardId, included) { cardId = C.stacks.canonical(cardId); if (!C.state.current.inventory.some(function (i) { return C.stacks.of(i) === C.stacks.canonical(cardId); })) return; mutate(function (ui) { var c = ui.collections.find(function (item) { return item.id === collectionId; }); if (!c) return; c.stackKeys = c.stackKeys.filter(function (id) { return id !== cardId; }); if (included) c.stackKeys.push(cardId); }); },
    reorder: function (visibleIds, from, to) { if (from === to || !visibleIds[from]) return; mutate(function (ui) {
      var key = ui.activeCollectionId, stored = ui.customOrders[key] || [], merged = stored.concat(visibleIds.filter(function (id) { return stored.indexOf(id) < 0; }));
      var selected = visibleIds[from], destination = visibleIds[to]; merged = merged.filter(function (id) { return id !== selected; });
      var at = merged.indexOf(destination); merged.splice(at < 0 ? merged.length : at + (to > from ? 1 : 0), 0, selected);
      ui.customOrders[key] = merged; ui.sortMode = 'custom'; ui.groupMode = 'none';
    }); }
  };
})(window.Cardable);
