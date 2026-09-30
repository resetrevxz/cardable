/* Cardable — generations and cards. DATA ONLY.
 * The names, specs and numbers below are PLACEHOLDERS. Replace them with the real generation-wise card list.
 * Add a card by appending an object. Add a generation by appending to `generations`.
 * Fields are documented in docs/03-CARD.md section 6.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.generations = [
    { id: 'gen1', name: 'Generation 1', order: 1 },
    { id: 'gen2', name: 'Generation 2', order: 2 }
  ];

  C.data.cards = [
    { id: 'gen1-basic-01',  name: 'Placeholder GPU 01', generation: 'gen1', rarity: 'basic',
      vram: { amount: 2, unit: 'GB', type: 'GDDR5' },
      specs: { cores: 640, boostMhz: 1100, busBits: 128, tdpW: 60 },
      art: { kind: 'procedural', motif: 'die', seed: 101 }, pullable: true },

    { id: 'gen1-common-01', name: 'Placeholder GPU 02', generation: 'gen1', rarity: 'common',
      vram: { amount: 4, unit: 'GB', type: 'GDDR5' },
      specs: { cores: 1024, boostMhz: 1250, busBits: 128, tdpW: 75 },
      art: { kind: 'procedural', motif: 'die', seed: 102 }, pullable: true },

    { id: 'gen1-rare-01',   name: 'Placeholder GPU 03', generation: 'gen1', rarity: 'rare',
      vram: { amount: 8, unit: 'GB', type: 'GDDR5X' },
      specs: { cores: 2560, boostMhz: 1600, busBits: 256, tdpW: 150 },
      art: { kind: 'procedural', motif: 'fan', seed: 103 }, pullable: true },

    { id: 'gen2-basic-01',  name: 'Placeholder GPU 04', generation: 'gen2', rarity: 'basic',
      vram: { amount: 4, unit: 'GB', type: 'GDDR6' },
      specs: { cores: 1408, boostMhz: 1700, busBits: 128, tdpW: 75 },
      art: { kind: 'procedural', motif: 'die', seed: 201 }, pullable: true },

    { id: 'gen2-legendary-01', name: 'Placeholder GPU 05', generation: 'gen2', rarity: 'legendary',
      vram: { amount: 24, unit: 'GB', type: 'GDDR6X' },
      specs: { cores: 10496, boostMhz: 1700, busBits: 384, tdpW: 350 },
      art: { kind: 'procedural', motif: 'vapor', seed: 205 }, pullable: true },

    { id: 'gen2-secret-01', name: 'Placeholder GPU 06', generation: 'gen2', rarity: 'secret',
      vram: { amount: 48, unit: 'GB', type: 'GDDR6X' },
      specs: { cores: 18176, boostMhz: 1900, busBits: 384, tdpW: 450 },
      art: { kind: 'procedural', motif: 'die', seed: 299 }, pullable: true }
  ];
})(window.Cardable = window.Cardable || {});
