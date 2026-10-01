(function (C) {
  'use strict';
  C.stacks = {
    key: function (cardId, variantId) { return JSON.stringify([cardId, variantId || null]); },
    of: function (instance) { return this.key(instance.cardId, instance.variantId); },
    canonical: function (value) {
      if (typeof value !== 'string' || !value.length) return null;
      if (value.charAt(0) !== '[') return this.key(value, null);
      try { var pair = JSON.parse(value); return Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && pair[0].length > 0 && (pair[1] === null || !!C.variant(pair[1])) ? this.key(pair[0], pair[1]) : null; } catch (_) { return null; }
    }
  };
  C.variants = {
    roll: function (random) {
      if (random() >= C.config.variants.chance) return null;
      var total = C.data.variants.reduce(function (sum, v) { return sum + v.weight; }, 0), needle = random() * total;
      for (var i = 0; i < C.data.variants.length; i++) { needle -= C.data.variants[i].weight; if (needle < 0) return C.data.variants[i].id; }
      return C.data.variants[C.data.variants.length - 1].id;
    }
  };
})(window.Cardable);
