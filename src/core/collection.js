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
        all.forEach(function (i) { var id = C.stacks.of(i); if (!finishes.has(id)) finishes.set(id, []); finishes.get(id).push(i); if (i.variantId) variantCopies++; if (!i.seen) newCopies++; });
        if (all.length) owned++; else finishes.set(C.stacks.key(card.id,null), []);
        Array.from(finishes.keys()).sort(function (a,b) { var x=JSON.parse(a),y=JSON.parse(b),order=function(id){return id===null?-1:C.data.variants.findIndex(function(v){return v.id===id;});};return order(x[1])-order(y[1])||String(x[2]||'').localeCompare(y[2]||''); }).forEach(function (stackKey) {
          var parts=JSON.parse(stackKey),variantId=parts[1],cardSkinId=parts[2]||null;
          var instances = finishes.get(stackKey).slice().sort(function (a,b) { return a.pulledAt-b.pulledAt || a.instanceId.localeCompare(b.instanceId); });
          if (instances.length) ownedStacks++;
          entries.push({ card: card, stackKey: stackKey, cardSkinId:cardSkinId, variantId: variantId, variant: C.variant(variantId), generation: generations.get(card.generation), rarity: rarities.get(card.rarity), instances: instances, owned: instances.length > 0, isNew: instances.some(function(i){return !i.seen;}) });
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
    }
  };
})(window.Cardable);
