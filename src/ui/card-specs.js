(function (C) {
  'use strict';
  var formatters = new Map();
  function register(id, label, unit) {
    formatters.set(id, { label: label, format: function (value) { return String(value) + (unit ? ' ' + unit : ''); } });
  }
  register('cores', 'Cores', ''); register('gpuCores', 'GPU cores', '');
  register('cudaCores', 'CUDA cores', ''); register('streamProcessors', 'Stream processors', '');
  register('xeCores', 'Xe cores', ''); register('executionUnits', 'Execution units', '');
  register('pipelines', 'Pipelines', ''); register('gpuTflops', 'GPU compute', 'TFLOPS');
  register('coreClockMhz', 'Core clock', 'MHz'); register('gpuClockMhz', 'GPU clock', 'MHz');
  register('boostMhz', 'Boost', 'MHz'); register('busBits', 'Bus', 'bit');
  register('boardPowerW', 'Board power', 'W'); register('tdpW', 'Power', 'W');
  C.cardSpecs = {
    icon: function (key) { return /clock|boost/i.test(key) ? 'clock' : /bus/i.test(key) ? 'bus' : /power|tdp/i.test(key) ? 'power' : 'chip'; },
    frontRows: function (card) { return C.cardSpecs.rows(card).slice(0, C.rarity(card.rarity).frontDesign === 'full-art' ? C.config.cardView.maxScreenSpecs : C.config.cardView.maxFrontSpecs); },
    register: function (id, formatter) { formatters.set(id, formatter); },
    rows: function (card) {
      var rows = [];
      formatters.forEach(function (formatter, key) {
        if (card.specs && card.specs[key] != null) rows.push({ key: key, label: formatter.label, value: formatter.format(card.specs[key]) });
      });
      return rows;
    },
    memoryType: function (card) { return card.vram && card.vram.type || ''; },
    vram: function (card) { if (!card.vram) return 'Unknown'; return card.vram.shared || card.vram.amount == null ? 'Shared' : card.vram.amount + ' ' + card.vram.unit; }
  };
})(window.Cardable);
