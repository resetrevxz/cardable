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
      var owned = 0;
      var entries = catalog.filter(function (card) {
        return !card.retired || (grouped.get(card.id) || []).length > 0;
      }).map(function (card) {
        var instances = (grouped.get(card.id) || []).slice().sort(function (a, b) { return (a.pulledAt || 0) - (b.pulledAt || 0) || String(a.instanceId).localeCompare(String(b.instanceId)); });
        if (instances.length) owned += 1;
        return { card: card, generation: generations.get(card.generation), rarity: rarities.get(card.rarity),
          instances: instances, owned: instances.length > 0, isNew: instances.some(function (i) { return !i.seen; }) };
      });
      entries.sort(function (a, b) {
        var generation = (a.generation ? a.generation.order : 0) - (b.generation ? b.generation.order : 0);
        var tier = (a.rarity ? a.rarity.tier : 0) - (b.rarity ? b.rarity.tier : 0);
        return (order === 'rarity' ? tier || generation : generation || tier) || a.card.id.localeCompare(b.card.id);
      });
      return { entries: entries, owned: owned, total: entries.length };
    },
    markSeen: function (cardId, inventory) {
      var changed = false;
      inventory.forEach(function (instance) { if (instance.cardId === cardId && !instance.seen) { instance.seen = true; changed = true; } });
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
            pulledAt: i, seen: i % 2 === 0 });
        }
      }
      return { cards: cards, instances: instances };
    }
  };
})(window.Cardable);
