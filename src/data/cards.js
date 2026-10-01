/* Cardable — GPU catalog. DATA ONLY.
 * Reference desktop configurations are used where board memory varies by vendor.
 * Integrated GPUs show shared system memory as “Shared” rather than pretending it is dedicated VRAM.
 * Existing scaffold IDs are retained as retired records so saves made with them remain readable.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.generations = [
    { id: 'gen1', name: 'Generation 1', order: 1 },
    { id: 'gen2', name: 'Generation 2', order: 2 }
  ];

  var legacyCards = [
    { id: 'gen1-basic-01', name: 'Placeholder GPU 01', generation: 'gen1', rarity: 'basic', vram: { amount: 2, unit: 'GB', type: 'GDDR5' }, specs: { cores: 640, boostMhz: 1100, busBits: 128, tdpW: 60 }, art: { kind: 'procedural', motif: 'die', seed: 101 } },
    { id: 'gen1-common-01', name: 'Placeholder GPU 02', generation: 'gen1', rarity: 'common', vram: { amount: 4, unit: 'GB', type: 'GDDR5' }, specs: { cores: 1024, boostMhz: 1250, busBits: 128, tdpW: 75 }, art: { kind: 'procedural', motif: 'die', seed: 102 } },
    { id: 'gen1-rare-01', name: 'Placeholder GPU 03', generation: 'gen1', rarity: 'rare', vram: { amount: 8, unit: 'GB', type: 'GDDR5X' }, specs: { cores: 2560, boostMhz: 1600, busBits: 256, tdpW: 150 }, art: { kind: 'procedural', motif: 'fan', seed: 103 } },
    { id: 'gen2-basic-01', name: 'Placeholder GPU 04', generation: 'gen2', rarity: 'basic', vram: { amount: 4, unit: 'GB', type: 'GDDR6' }, specs: { cores: 1408, boostMhz: 1700, busBits: 128, tdpW: 75 }, art: { kind: 'procedural', motif: 'die', seed: 201 } },
    { id: 'gen2-legendary-01', name: 'Placeholder GPU 05', generation: 'gen2', rarity: 'legendary', vram: { amount: 24, unit: 'GB', type: 'GDDR6X' }, specs: { cores: 10496, boostMhz: 1700, busBits: 384, tdpW: 350 }, art: { kind: 'procedural', motif: 'vapor', seed: 205 } },
    { id: 'gen2-secret-01', name: 'Placeholder GPU 06', generation: 'gen2', rarity: 'secret', vram: { amount: 48, unit: 'GB', type: 'GDDR6X' }, specs: { cores: 18176, boostMhz: 1900, busBits: 384, tdpW: 450 }, art: { kind: 'procedural', motif: 'die', seed: 299 } }
  ];
  legacyCards.forEach(function (card) { card.pullable = false; card.retired = true; });

  var suppliedImages = new Set([
    'radeon-hd-2400-pro', 'radeon-hd-2600-pro', 'geforce-gt-610', 'geforce-gt-710', 'geforce-gtx-650', 'geforce-gtx-750',
    'intel-iris-xe-max', 'apple-m1-gpu', 'snapdragon-x', 'radeon-rx-5500', 'radeon-7000', 'radeon-9200',
    'radeon-hd-2600-xt', 'geforce-fx-5200', 'geforce-2-mx', 'geforce-gtx-660', 'geforce-gtx-760', 'geforce-gtx-950',
    'radeon-rx-5600-xt', 'radeon-7500', 'radeon-8500', 'radeon-hd-2900-xt', 'geforce-gtx-670', 'geforce-gtx-770',
    'geforce-gtx-960', 'geforce-gtx-1050-ti', 'intel-arc-a380', 'geforce-gtx-1080-ti', 'geforce-rtx-2080-ti',
    'radeon-rx-7900-xtx', 'geforce-gtx-980-ti', 'geforce-rtx-3090', 'apple-m4-max-gpu', 'geforce-rtx-4090',
    'radeon-rx-6900-xt', 'geforce-rtx-5080', 'apple-m5-gpu', 'geforce-256'
  ]);

  function makeCard(row, index) {
    var id = row[0], shared = row[5] == null;
    var art = suppliedImages.has(id) ? { kind: 'image', src: 'assets/cards/' + id + '.webp', subjectMask: 'assets/cards/masks/' + id + '.png' } :
      { kind: 'procedural', motif: row[8] || 'fan', seed: 3000 + index };
    return {
      id: id, name: row[1], generation: row[3], rarity: row[2],
      vram: { amount: row[5], unit: row[6], type: row[7], shared: shared },
      specs: row[4], art: art, pullable: true, type: 'gpu', brand: row[9]
    };
  }

  /* id, display name, rarity, generation, specs, memory amount, unit, type, art motif */
  var catalog = [
    ['radeon-hd-2400-pro', 'Radeon HD 2400 Pro', 'basic', 'gen1', { streamProcessors: 40, coreClockMhz: 525, busBits: 64 }, 256, 'MB', 'GDDR2', 'die'],
    ['radeon-hd-2600-pro', 'Radeon HD 2600 Pro', 'basic', 'gen1', { streamProcessors: 120, coreClockMhz: 600, busBits: 128, boardPowerW: 45 }, 256, 'MB', 'GDDR3', 'fan'],
    ['geforce-gt-610', 'GeForce GT 610', 'basic', 'gen2', { cudaCores: 48, boostMhz: 810, busBits: 64, boardPowerW: 29 }, 1024, 'MB', 'DDR3', 'die'],
    ['geforce-gt-710', 'GeForce GT 710', 'basic', 'gen2', { cudaCores: 192, boostMhz: 954, busBits: 64, boardPowerW: 19 }, 1, 'GB', 'DDR3', 'fan'],
    ['geforce-gtx-650', 'GeForce GTX 650', 'basic', 'gen2', { cudaCores: 384, boostMhz: 1058, busBits: 128, boardPowerW: 64 }, 1, 'GB', 'GDDR5', 'die'],
    ['geforce-gtx-750', 'GeForce GTX 750', 'basic', 'gen2', { cudaCores: 512, boostMhz: 1085, busBits: 128, boardPowerW: 55 }, 1, 'GB', 'GDDR5', 'fan'],
    ['intel-iris-xe-max', 'Intel Iris Xe MAX', 'basic', 'gen2', { executionUnits: 96, boostMhz: 1650, busBits: 128, boardPowerW: 25 }, 4, 'GB', 'LPDDR4X', 'die'],
    ['apple-m1-gpu', 'Apple M1 GPU', 'basic', 'gen2', { gpuCores: 8 }, null, '', 'Unified memory', 'die'],
    ['snapdragon-x', 'Snapdragon X', 'basic', 'gen2', { gpuClockMhz: 1250 }, null, '', 'LPDDR5X', 'die'],
    ['radeon-rx-5500', 'Radeon RX 5500', 'basic', 'gen2', { streamProcessors: 1408, boostMhz: 1845, busBits: 128, boardPowerW: 130 }, 8, 'GB', 'GDDR6', 'fan'],

    ['radeon-7000', 'Radeon 7000', 'common', 'gen1', { pipelines: 2, coreClockMhz: 166, busBits: 64 }, 32, 'MB', 'SDR', 'die'],
    ['radeon-9200', 'Radeon 9200', 'common', 'gen1', { pipelines: 4, coreClockMhz: 250, busBits: 128 }, 128, 'MB', 'DDR', 'die'],
    ['radeon-hd-2600-xt', 'Radeon HD 2600 XT', 'common', 'gen1', { streamProcessors: 120, coreClockMhz: 800, busBits: 128, boardPowerW: 45 }, 256, 'MB', 'GDDR3', 'fan'],
    ['geforce-fx-5200', 'GeForce FX 5200', 'common', 'gen1', { pipelines: 4, coreClockMhz: 250, busBits: 128 }, 128, 'MB', 'DDR', 'die'],
    ['geforce-2-mx', 'GeForce 2 MX', 'common', 'gen1', { pipelines: 2, coreClockMhz: 175, busBits: 128 }, 32, 'MB', 'SDR', 'die'],
    ['geforce-gtx-660', 'GeForce GTX 660', 'common', 'gen2', { cudaCores: 960, boostMhz: 1033, busBits: 192, boardPowerW: 140 }, 2, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-760', 'GeForce GTX 760', 'common', 'gen2', { cudaCores: 1152, boostMhz: 1033, busBits: 256, boardPowerW: 170 }, 2, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-950', 'GeForce GTX 950', 'common', 'gen2', { cudaCores: 768, boostMhz: 1188, busBits: 128, boardPowerW: 90 }, 2, 'GB', 'GDDR5', 'fan'],
    ['radeon-rx-5600-xt', 'Radeon RX 5600 XT', 'common', 'gen2', { streamProcessors: 2304, boostMhz: 1560, busBits: 192, boardPowerW: 150 }, 6, 'GB', 'GDDR6', 'fan'],

    ['radeon-7500', 'Radeon 7500', 'uncommon', 'gen1', { pipelines: 2, coreClockMhz: 290, busBits: 128 }, 64, 'MB', 'DDR', 'die'],
    ['radeon-8500', 'Radeon 8500', 'uncommon', 'gen1', { pipelines: 4, coreClockMhz: 275, busBits: 128 }, 64, 'MB', 'DDR', 'die'],
    ['radeon-hd-2900-xt', 'Radeon HD 2900 XT', 'uncommon', 'gen1', { streamProcessors: 320, coreClockMhz: 743, busBits: 512, boardPowerW: 215 }, 512, 'MB', 'GDDR3', 'fan'],
    ['geforce-gtx-670', 'GeForce GTX 670', 'uncommon', 'gen2', { cudaCores: 1344, boostMhz: 980, busBits: 256, boardPowerW: 170 }, 2, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-770', 'GeForce GTX 770', 'uncommon', 'gen2', { cudaCores: 1536, boostMhz: 1085, busBits: 256, boardPowerW: 230 }, 2, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-960', 'GeForce GTX 960', 'uncommon', 'gen2', { cudaCores: 1024, boostMhz: 1178, busBits: 128, boardPowerW: 120 }, 2, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-1050-ti', 'GeForce GTX 1050 Ti', 'uncommon', 'gen2', { cudaCores: 768, boostMhz: 1392, busBits: 128, boardPowerW: 75 }, 4, 'GB', 'GDDR5', 'fan'],
    ['intel-arc-a380', 'Intel Arc A380', 'uncommon', 'gen2', { xeCores: 8, boostMhz: 2000, busBits: 96, boardPowerW: 75 }, 6, 'GB', 'GDDR6', 'fan'],

    ['radeon-rx-5700-xt', 'Radeon RX 5700 XT', 'rare', 'gen2', { streamProcessors: 2560, boostMhz: 1905, busBits: 256, boardPowerW: 225 }, 8, 'GB', 'GDDR6', 'fan'],
    ['radeon-rx-6600', 'Radeon RX 6600', 'rare', 'gen2', { streamProcessors: 1792, boostMhz: 2491, busBits: 128, boardPowerW: 132 }, 8, 'GB', 'GDDR6', 'fan'],
    ['radeon-rx-7600', 'Radeon RX 7600', 'rare', 'gen2', { streamProcessors: 2048, boostMhz: 2655, busBits: 128, boardPowerW: 165 }, 8, 'GB', 'GDDR6', 'fan'],
    ['geforce-gtx-970', 'GeForce GTX 970', 'rare', 'gen2', { cudaCores: 1664, boostMhz: 1178, busBits: 256, boardPowerW: 145 }, 4, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-1060-6gb', 'GeForce GTX 1060 6GB', 'rare', 'gen2', { cudaCores: 1280, boostMhz: 1708, busBits: 192, boardPowerW: 120 }, 6, 'GB', 'GDDR5', 'fan'],
    ['geforce-gtx-1660-ti', 'GeForce GTX 1660 Ti', 'rare', 'gen2', { cudaCores: 1536, boostMhz: 1770, busBits: 192, boardPowerW: 120 }, 6, 'GB', 'GDDR6', 'fan'],
    ['intel-arc-a580', 'Intel Arc A580', 'rare', 'gen2', { xeCores: 24, boostMhz: 1700, busBits: 256, boardPowerW: 185 }, 8, 'GB', 'GDDR6', 'fan'],

    ['radeon-rx-6700-xt', 'Radeon RX 6700 XT', 'super-rare', 'gen2', { streamProcessors: 2560, boostMhz: 2581, busBits: 192, boardPowerW: 230 }, 12, 'GB', 'GDDR6', 'fan'],
    ['radeon-rx-7700-xt', 'Radeon RX 7700 XT', 'super-rare', 'gen2', { streamProcessors: 3456, boostMhz: 2544, busBits: 192, boardPowerW: 245 }, 12, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-2060', 'GeForce RTX 2060', 'super-rare', 'gen2', { cudaCores: 1920, boostMhz: 1680, busBits: 192, boardPowerW: 160 }, 6, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-3060-ti', 'GeForce RTX 3060 Ti', 'super-rare', 'gen2', { cudaCores: 4864, boostMhz: 1665, busBits: 256, boardPowerW: 200 }, 8, 'GB', 'GDDR6', 'fan'],
    ['intel-arc-a750', 'Intel Arc A750', 'super-rare', 'gen2', { xeCores: 28, boostMhz: 2050, busBits: 256, boardPowerW: 225 }, 8, 'GB', 'GDDR6', 'fan'],
    ['apple-m2-gpu', 'Apple M2 GPU', 'super-rare', 'gen2', { gpuCores: 10 }, null, '', 'Unified memory', 'die'],

    ['geforce-rtx-5090', 'GeForce RTX 5090', 'unusual', 'gen2', { cudaCores: 21760, boostMhz: 2410, busBits: 512, boardPowerW: 575 }, 32, 'GB', 'GDDR7', 'fan'],
    ['radeon-rx-9070-xt', 'Radeon RX 9070 XT', 'unusual', 'gen2', { streamProcessors: 4096, boostMhz: 2970, busBits: 256, boardPowerW: 304 }, 16, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-4070-super', 'GeForce RTX 4070 Super', 'unusual', 'gen2', { cudaCores: 7168, boostMhz: 2475, busBits: 192, boardPowerW: 220 }, 12, 'GB', 'GDDR6X', 'fan'],
    ['intel-arc-b580', 'Intel Arc B580', 'unusual', 'gen2', { xeCores: 20, boostMhz: 2670, busBits: 192, boardPowerW: 190 }, 12, 'GB', 'GDDR6', 'fan'],
    ['snapdragon-x2-elite', 'Snapdragon X2 Elite', 'unusual', 'gen2', { gpuClockMhz: 1700, busBits: 128 }, null, '', 'LPDDR5X', 'die'],

    ['radeon-vii', 'Radeon VII', 'double-super-rare', 'gen2', { streamProcessors: 3840, boostMhz: 1800, busBits: 4096, boardPowerW: 300 }, 16, 'GB', 'HBM2', 'fan'],
    ['radeon-rx-6800-xt', 'Radeon RX 6800 XT', 'double-super-rare', 'gen2', { streamProcessors: 4608, boostMhz: 2250, busBits: 256, boardPowerW: 300 }, 16, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-3080', 'GeForce RTX 3080', 'double-super-rare', 'gen2', { cudaCores: 8704, boostMhz: 1710, busBits: 320, boardPowerW: 320 }, 10, 'GB', 'GDDR6X', 'fan'],
    ['apple-m3-max-gpu', 'Apple M3 Max GPU', 'double-super-rare', 'gen2', { gpuCores: 40 }, null, '', 'Unified memory', 'die'],

    ['geforce-gtx-1080-ti', 'GeForce GTX 1080 Ti', 'legendary', 'gen2', { cudaCores: 3584, boostMhz: 1582, busBits: 352, boardPowerW: 250 }, 11, 'GB', 'GDDR5X', 'fan'],
    ['geforce-rtx-2080-ti', 'GeForce RTX 2080 Ti', 'legendary', 'gen2', { cudaCores: 4352, boostMhz: 1545, busBits: 352, boardPowerW: 250 }, 11, 'GB', 'GDDR6', 'fan'],
    ['radeon-rx-7900-xtx', 'Radeon RX 7900 XTX', 'legendary', 'gen2', { streamProcessors: 6144, boostMhz: 2500, busBits: 384, boardPowerW: 355 }, 24, 'GB', 'GDDR6', 'fan'],

    ['geforce-gtx-980-ti', 'GeForce GTX 980 Ti', 'mythical', 'gen2', { cudaCores: 2816, boostMhz: 1075, busBits: 384, boardPowerW: 250 }, 6, 'GB', 'GDDR5', 'fan'],
    ['geforce-rtx-3090', 'GeForce RTX 3090', 'mythical', 'gen2', { cudaCores: 10496, boostMhz: 1695, busBits: 384, boardPowerW: 350 }, 24, 'GB', 'GDDR6X', 'fan'],
    ['apple-m4-max-gpu', 'Apple M4 Max GPU', 'mythical', 'gen2', { gpuCores: 40 }, null, '', 'Unified memory', 'die'],

    ['geforce-rtx-4090', 'GeForce RTX 4090', 'exotic', 'gen2', { cudaCores: 16384, boostMhz: 2520, busBits: 384, boardPowerW: 450 }, 24, 'GB', 'GDDR6X', 'fan'],
    ['radeon-rx-6900-xt', 'Radeon RX 6900 XT', 'exotic', 'gen2', { streamProcessors: 5120, boostMhz: 2250, busBits: 256, boardPowerW: 300 }, 16, 'GB', 'GDDR6', 'fan'],

    ['geforce-rtx-5080', 'GeForce RTX 5080', 'ascendant', 'gen2', { cudaCores: 10752, boostMhz: 2620, busBits: 256, boardPowerW: 360 }, 16, 'GB', 'GDDR7', 'fan'],
    ['apple-m5-gpu', 'Apple M5 GPU', 'ascendant', 'gen2', { gpuCores: 10 }, null, '', 'Unified memory', 'die'],

    ['geforce-256', 'GeForce 256', 'secret', 'gen1', { pipelines: 4, coreClockMhz: 120, busBits: 128 }, 32, 'MB', 'SDR', 'die']
  ];

  // Explicit catalog metadata; UI search never infers a manufacturer from a name.
  var brands = {
    amd: ['radeon-hd-2400-pro','radeon-hd-2600-pro','radeon-rx-5500','radeon-7000','radeon-9200','radeon-hd-2600-xt','radeon-rx-5600-xt','radeon-7500','radeon-8500','radeon-hd-2900-xt','radeon-rx-5700-xt','radeon-rx-6600','radeon-rx-7600','radeon-rx-6700-xt','radeon-rx-7700-xt','radeon-rx-9070-xt','radeon-vii','radeon-rx-6800-xt','radeon-rx-7900-xtx','radeon-rx-6900-xt'],
    nvidia: ['geforce-gt-610','geforce-gt-710','geforce-gtx-650','geforce-gtx-750','geforce-fx-5200','geforce-2-mx','geforce-gtx-660','geforce-gtx-760','geforce-gtx-950','geforce-gtx-670','geforce-gtx-770','geforce-gtx-960','geforce-gtx-1050-ti','geforce-gtx-970','geforce-gtx-1060-6gb','geforce-gtx-1660-ti','geforce-rtx-2060','geforce-rtx-3060-ti','geforce-rtx-5090','geforce-rtx-4070-super','geforce-rtx-3080','geforce-gtx-1080-ti','geforce-rtx-2080-ti','geforce-gtx-980-ti','geforce-rtx-3090','geforce-rtx-4090','geforce-rtx-5080','geforce-256'],
    intel: ['intel-iris-xe-max','intel-arc-a380','intel-arc-a580','intel-arc-a750','intel-arc-b580'],
    apple: ['apple-m1-gpu','apple-m2-gpu','apple-m3-max-gpu','apple-m4-max-gpu','apple-m5-gpu'],
    qualcomm: ['snapdragon-x','snapdragon-x2-elite']
  };
  catalog.forEach(function (row) { Object.keys(brands).forEach(function (brand) { if (brands[brand].indexOf(row[0]) >= 0) row[9] = brand; }); });
  legacyCards.forEach(function (card) { card.brand = null; card.type = 'gpu'; });
  C.data.cards = legacyCards.concat(catalog.map(makeCard));
})(window.Cardable = window.Cardable || {});
