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
    register: function (id, formatter) { formatters.set(id, formatter); },
    rows: function (card) {
      var rows = [];
      formatters.forEach(function (formatter, key) {
        if (card.specs && card.specs[key] != null) rows.push({ key: key, label: formatter.label, value: formatter.format(card.specs[key]) });
      });
      return rows;
    },
    vram: function (card) { return card.vram.shared || card.vram.amount == null ? 'Shared' : card.vram.amount + ' ' + card.vram.unit; }
  };
})(window.Cardable);
