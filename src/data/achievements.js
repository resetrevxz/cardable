(function (C) {
  'use strict';
  // Foundation catalog for A/B. Milestone C expands this list.
  C.data.achievements = [
    { id: 'pack-opener', group: 'packs', name: 'Pack Opener', description: 'Open packs.', glyph: 'pack', tiers: [
      { goal: 1, reward: { credits: 25 } }, { goal: 10, reward: { credits: 50 } },
      { goal: 50, reward: { credits: 100 } }, { goal: 250, reward: { credits: 250 } }, { goal: 1000, reward: { credits: 1000 } }
    ], track: { counter: 'packsOpened' } },
    { id: 'collector', group: 'collection', name: 'Collector', description: 'Own different card designs.', glyph: 'collection', tiers: [
      { goal: 10, reward: { credits: 25 } }, { goal: 25, reward: { credits: 50 } },
      { goal: 50, reward: { credits: 100 } }, { goal: 100, reward: { credits: 250 } }
    ], track: { counter: 'uniqueCards' } },
    { id: 'first-rare', group: 'rarity', name: 'First Rare', description: 'Pull a Rare card.', glyph: 'star', tiers: [{ goal: 1, reward: { credits: 25 } }],
      track: { event: 'card:revealed', test: function (i) { return !!i && C.card(i.cardId)?.rarity === 'rare'; }, backfill: function (s) { return s.inventory.filter(function (i) { return C.card(i.cardId)?.rarity === 'rare'; }); } } },
    { id: 'secret-occurred', group: 'rarity', name: 'A Secret Has Occurred', description: 'Pull a Secret card.', glyph: 'secret', hidden: true, tiers: [{ goal: 1 }],
      track: { event: 'card:revealed', test: function (i) { return !!i && C.card(i.cardId)?.rarity === 'secret'; }, backfill: function (s) { return s.inventory.filter(function (i) { return C.card(i.cardId)?.rarity === 'secret'; }); } } },
    { id: 'first-variant', group: 'variants', name: 'First Variant', description: 'Keep a card with a permanent variant.', glyph: 'variant', tiers: [{ goal: 1, reward: { credits: 25 } }], track: { counter: 'variantCopies' } },
    { id: 'first-serial', group: 'serials', name: 'First Serial', description: 'Keep a serial ending in 000001.', glyph: 'serial', tiers: [{ goal: 1 }],
      track: { event: 'card:kept', test: function (i) { return !!i && /-0*1$/.test(i.serial); }, backfill: function (s) { return s.inventory.filter(function (i) { return /-0*1$/.test(i.serial); }); } } },
    { id: 'archivist', group: 'meta', name: 'Archivist', description: 'Export your save.', glyph: 'archive', tiers: [{ goal: 1 }], track: { counter: 'exports' } },
    { id: 'settings-tinkerer', group: 'meta', name: 'Settings Tinkerer', description: 'Change five settings.', glyph: 'settings', tiers: [{ goal: 5 }], track: { counter: 'settingsChanged' } }
  ];
  C.data.achievementGroups = { packs: 'Packs', collection: 'Collection', rarity: 'Rarity firsts', variants: 'Variants', serials: 'Serials', meta: 'Economy and meta' };
})(window.Cardable);
