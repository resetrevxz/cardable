(function (C) {
  'use strict';
  var formatters = new Map();
  function register(id, label, unit) {
    formatters.set(id, { label: label, format: function (value) { return String(value) + (unit ? ' ' + unit : ''); } });
  }
  register('cores', 'Cores', ''); register('boostMhz', 'Boost', 'MHz');
  register('busBits', 'Bus', 'bit'); register('tdpW', 'Power', 'W');
  C.cardSpecs = {
    register: function (id, formatter) { formatters.set(id, formatter); },
    rows: function (card) {
      var rows = [];
      formatters.forEach(function (formatter, key) {
        if (card.specs && card.specs[key] != null) rows.push({ key: key, label: formatter.label, value: formatter.format(card.specs[key]) });
      });
      return rows;
    },
    vram: function (card) { return card.vram.amount + ' ' + card.vram.unit; }
  };
})(window.Cardable);
