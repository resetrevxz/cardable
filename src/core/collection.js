(function (C) {
  'use strict';
  // A projection of the catalog and instances. No second inventory save format.
  C.collection = {
    project: function (catalog, inventory, order) {
      var grouped = new Map(), generations = new Map(), rarities = new Map();
      C.data.generations.forEach(function (g) { generations.set(g.id, g); });
      C.data.rarities.forEach(function (r) { rarities.set(r.id, r); });
      inventory.forEach(function (instance) {
        if (!instance || typeof instance.cardId !== 'string') return;
        if (!grouped.has(instance.cardId)) grouped.set(instance.cardId, []);
        grouped.get(instance.cardId).push(instance);
      });
      var owned = 0, ownedStacks = 0, variantCopies = 0, newCopies = 0, entries = [];
      catalog.filter(function (card) { return !card.retired || (grouped.get(card.id) || []).length > 0; }).forEach(function (card) {
        var all = grouped.get(card.id) || [], finishes = new Map();
        all.forEach(function (i) { var id = i.variantId || null; if (!finishes.has(id)) finishes.set(id, []); finishes.get(id).push(i); if (id) variantCopies++; if (!i.seen) newCopies++; });
        if (all.length) owned++; else finishes.set(null, []);
        Array.from(finishes.keys()).sort(function (a,b) { return a === null ? -1 : b === null ? 1 : C.data.variants.findIndex(function(v){return v.id===a;})-C.data.variants.findIndex(function(v){return v.id===b;}); }).forEach(function (variantId) {
          var instances = finishes.get(variantId).slice().sort(function (a,b) { return a.pulledAt-b.pulledAt || a.instanceId.localeCompare(b.instanceId); });
          if (instances.length) ownedStacks++;
          entries.push({ card: card, stackKey: C.stacks.key(card.id, variantId), variantId: variantId, variant: C.variant(variantId), generation: generations.get(card.generation), rarity: rarities.get(card.rarity), instances: instances, owned: instances.length > 0, isNew: instances.some(function(i){return !i.seen;}) });
        });
      });
      entries.sort(function (a, b) {
        var generation = (a.generation ? a.generation.order : 0) - (b.generation ? b.generation.order : 0);
        var tier = (a.rarity ? a.rarity.tier : 0) - (b.rarity ? b.rarity.tier : 0);
        return (order === 'rarity' ? tier || generation : generation || tier) || a.card.id.localeCompare(b.card.id);
      });
      entries.forEach(function (entry, index) { entry.catalogIndex = index; });
      return { entries: entries, owned: owned, total: catalog.filter(function(c){return !c.retired || (grouped.get(c.id)||[]).length;}).length, stackCount: ownedStacks, variantCopies: variantCopies, newCopies: newCopies };
    },
    markSeen: function (cardId, inventory) {
      var changed = false;
      inventory.forEach(function (instance) { if (C.stacks.of(instance) === C.stacks.canonical(cardId) && !instance.seen) { instance.seen = true; changed = true; } });
      return changed;
    },
    preview: function (count) {
      var cards = [], instances = [], cfg = C.config.inventoryMotion;
      var available = C.data.cards.filter(function (card) { return !card.retired && card.pullable !== false; });
      var tiers = C.data.rarities.filter(function (tier) { return C.finishes.registry[tier.finish]; });
      for (var i = 0; i < count; i++) {
        var template = available[i % available.length], tier = tiers[i % tiers.length];
        var card = Object.assign({}, template, { id: 'inventory-preview-' + String(i).padStart(4, '0'), name: 'GPU study ' + (i + 1),
          rarity: tier.id, generation: C.data.generations[i % C.data.generations.length].id,
          art: Object.assign({}, template.art, { seed: template.art.seed + i }) });
        cards.push(card);
        if (i % (cfg.previewDuplicateMax + 1) !== 0) {
          for (var j = 0; j <= i % cfg.previewDuplicateMax; j++) instances.push({ cardId: card.id,
            instanceId: card.id + '-' + j, serial: C.serial.format(C.state.current.playerCode, i * cfg.previewDuplicateMax + j + 1),
            pulledAt: Date.now() - i * 86400000, seen: i % 2 === 0, variantId: j ? C.data.variants[(i+j) % C.data.variants.length].id : null });
        }
      }
      return { cards: cards, instances: instances };
    }
  };
})(window.Cardable);
