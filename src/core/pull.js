(function (C) {
  'use strict';
  function availableCards(tier, cards) {
    return cards.filter(function (card) { return card.rarity === tier.id && card.pullable !== false; });
  }
  function weightedPick(tiers, modifiers, random) {
    var weighted = tiers.filter(function (tier) { return tier.pullable && Number(tier.chance) > 0; }).map(function (tier) {
      return { tier: tier, weight: Number(tier.chance) * (modifiers[tier.id] == null ? 1 : Number(modifiers[tier.id])) };
    }).filter(function (entry) { return Number.isFinite(entry.weight) && entry.weight > 0; });
    var total = weighted.reduce(function (sum, entry) { return sum + entry.weight; }, 0);
    if (!total) throw new Error('No pullable rarity weights');
    var needle = random() * total;
    for (var i = 0; i < weighted.length; i += 1) {
      needle -= weighted[i].weight;
      if (needle < 0) return weighted[i].tier;
    }
    return weighted[weighted.length - 1].tier;
  }
  C.pull = {
    weightedTier: weightedPick,
    pullCard: function (pack, options) {
      options = options || {};
      var tiers = options.rarities || C.data.rarities;
      var cards = options.cards || C.data.cards;
      var random = options.random || Math.random;
      var requestedTier = options.forcedTier || (!options.rarities && C.dev && C.dev.consumeForcedTier ? C.dev.consumeForcedTier() : null);
      var tier = requestedTier ? tiers.find(function (item) { return item.id === requestedTier && item.pullable; }) : weightedPick(tiers, pack.tierWeightModifiers || {}, random);
      if (!tier) throw new Error('Forced tier is unknown or not pullable');
      var eligible = availableCards(tier, cards);
      if (!eligible.length && C.config.pull.emptyTierPolicy === 'renormalize') {
        tier = weightedPick(tiers.filter(function (item) { return availableCards(item, cards).length > 0; }), pack.tierWeightModifiers || {}, random);
        eligible = availableCards(tier, cards);
      } else if (!eligible.length && C.config.pull.emptyTierPolicy === 'downgrade') {
        var index = tiers.indexOf(tier);
        for (var i = index - 1; i >= 0; i -= 1) {
          if (tiers[i].pullable && availableCards(tiers[i], cards).length) { tier = tiers[i]; eligible = availableCards(tier, cards); break; }
        }
      }
      if (!eligible.length) throw new Error('No cards available for selected tier or downgrade policy');
      var card = eligible[Math.floor(random() * eligible.length)];
      var serial = C.serial.next();
      return { instanceId: C.randomId('card'), cardId: card.id, serial: serial, pulledAt: Date.now(), seen: false };
    }
  };
})(window.Cardable);
