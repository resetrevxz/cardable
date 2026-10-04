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
    'radeon-rx-6900-xt', 'geforce-rtx-5080', 'apple-m5-gpu', 'geforce-256',
    'radeon-rx-5700-xt',
    'radeon-rx-6600',
    'radeon-rx-7600',
    'geforce-gtx-970',
    'geforce-gtx-1060-6gb',
    'geforce-gtx-1660-ti',
    'arc-a580',
    'geforce-2-ultra',
    'geforce-gtx-680',
    'geforce-gtx-780',
    'geforce-gtx-1070',
    'apple-m2-pro-gpu',
    'snapdragon-x-elite',
    'radeon-rx-7800-xt',
    'radeon-rx-6700-xt',
    'radeon-rx-7700-xt',
    'geforce-rtx-2060',
    'geforce-rtx-3060-ti',
    'arc-a750',
    'apple-m2-gpu',
    'geforce-rtx-2060-super',
    'geforce-rtx-2070',
    'geforce-rtx-3070',
    'geforce-rtx-4060-ti',
    'arc-b570',
    'apple-m3-gpu',
    'radeon-rx-9060-xt',
    'geforce-rtx-5090',
    'radeon-rx-9070-xt',
    'geforce-rtx-4070-super',
    'arc-b580',
    'snapdragon-x2-elite',
    'geforce-gtx-980',
    'geforce-rtx-4070',
    'geforce-rtx-5070',
    'arc-a770',
    'apple-m4-gpu',
    'radeon-rx-9070',
    'radeon-vii',
    'radeon-rx-6800-xt',
    'geforce-rtx-3080',
    'apple-m3-max-gpu',
    'geforce-gtx-1080',
    'radeon-rx-6800',
    'geforce-rtx-4070-ti',
  ]);

  var rosterGeneratedImages = new Set([
    'radeon-rx-5700-xt',
    'radeon-rx-6600',
    'radeon-rx-7600',
    'geforce-gtx-970',
    'geforce-gtx-1060-6gb',
    'geforce-gtx-1660-ti',
    'arc-a580',
    'geforce-2-ultra',
    'geforce-gtx-680',
    'geforce-gtx-780',
    'geforce-gtx-1070',
    'apple-m2-pro-gpu',
    'snapdragon-x-elite',
    'radeon-rx-7800-xt',
    'radeon-rx-6700-xt',
    'radeon-rx-7700-xt',
    'geforce-rtx-2060',
    'geforce-rtx-3060-ti',
    'arc-a750',
    'apple-m2-gpu',
    'geforce-rtx-2060-super',
    'geforce-rtx-2070',
    'geforce-rtx-3070',
    'geforce-rtx-4060-ti',
    'arc-b570',
    'apple-m3-gpu',
    'radeon-rx-9060-xt',
    'geforce-rtx-5090',
    'radeon-rx-9070-xt',
    'geforce-rtx-4070-super',
    'arc-b580',
    'snapdragon-x2-elite',
    'geforce-gtx-980',
    'geforce-rtx-4070',
    'geforce-rtx-5070',
    'arc-a770',
    'apple-m4-gpu',
    'radeon-rx-9070',
    'radeon-vii',
    'radeon-rx-6800-xt',
    'geforce-rtx-3080',
    'apple-m3-max-gpu',
    'geforce-gtx-1080',
    'radeon-rx-6800',
    'geforce-rtx-4070-ti',
    'apple-m3-pro-gpu',
    'geforce-rtx-4080',
    'radeon-rx-7900-xt',
    'apple-m3-ultra-gpu',
    'geforce-gtx-690',
    'titan-x-pascal',
    'geforce-gtx-titan',
    'geforce-rtx-3090-ti',
    'titan-rtx',
    'radeon-ddr'
  ]);

  function makeCard(row, index) {
    var id = row[0], shared = row[5] == null;
    var art = rosterGeneratedImages.has(id) ? { kind: 'image', src: 'assets/cards/' + id + '.webp', thumb: 'assets/cards/' + id + '-thumb.webp' } : suppliedImages.has(id) ? { kind: 'image', src: 'assets/cards/' + id + '.webp', subjectMask: 'assets/cards/masks/' + id + '.png' } :
      { kind: 'procedural', motif: row[8] || 'fan', seed: 3000 + index };
    return {
      id: id, name: row[1], generation: row[3], rarity: row[2],
      vram: { amount: row[5], unit: row[6], type: row[7], shared: shared },
      specs: row[4], specsVerified: !!integratedSpecSources[id], specsSource: integratedSpecSources[id] || null,
      specsNote: integratedSpecSources[id] ? 'Integrated GPU; shared unified memory. Values show the highest documented chip configuration where variants exist.' : '',
      art: art, artStatus: rosterGeneratedImages.has(id) ? 'final' : 'placeholder', pullable: true, type: 'gpu', brand: row[9]
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
    ['apple-m1-gpu', 'Apple M1 GPU', 'basic', 'gen2', { gpuCores: 8, gpuTflops: 2.6 }, null, '', 'Unified memory', 'die'],
    ['snapdragon-x', 'Snapdragon X', 'basic', 'gen2', { gpuTflops: 1.7 }, null, '', 'LPDDR5X', 'die'],
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
    ['apple-m2-gpu', 'Apple M2 GPU', 'super-rare', 'gen2', { gpuCores: 10, memoryBandwidthGBps: 100 }, null, '', 'Unified memory', 'die'],

    ['geforce-rtx-5090', 'GeForce RTX 5090', 'unusual', 'gen2', { cudaCores: 21760, boostMhz: 2410, busBits: 512, boardPowerW: 575 }, 32, 'GB', 'GDDR7', 'fan'],
    ['radeon-rx-9070-xt', 'Radeon RX 9070 XT', 'unusual', 'gen2', { streamProcessors: 4096, boostMhz: 2970, busBits: 256, boardPowerW: 304 }, 16, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-4070-super', 'GeForce RTX 4070 Super', 'unusual', 'gen2', { cudaCores: 7168, boostMhz: 2475, busBits: 192, boardPowerW: 220 }, 12, 'GB', 'GDDR6X', 'fan'],
    ['intel-arc-b580', 'Intel Arc B580', 'unusual', 'gen2', { xeCores: 20, boostMhz: 2670, busBits: 192, boardPowerW: 190 }, 12, 'GB', 'GDDR6', 'fan'],
    ['snapdragon-x2-elite', 'Snapdragon X2 Elite', 'unusual', 'gen2', { gpuClockMhz: 1700, memoryBandwidthGBps: 152 }, null, '', 'LPDDR5X', 'die'],

    ['radeon-vii', 'Radeon VII', 'double-super-rare', 'gen2', { streamProcessors: 3840, boostMhz: 1800, busBits: 4096, boardPowerW: 300 }, 16, 'GB', 'HBM2', 'fan'],
    ['radeon-rx-6800-xt', 'Radeon RX 6800 XT', 'double-super-rare', 'gen2', { streamProcessors: 4608, boostMhz: 2250, busBits: 256, boardPowerW: 300 }, 16, 'GB', 'GDDR6', 'fan'],
    ['geforce-rtx-3080', 'GeForce RTX 3080', 'double-super-rare', 'gen2', { cudaCores: 8704, boostMhz: 1710, busBits: 320, boardPowerW: 320 }, 10, 'GB', 'GDDR6X', 'fan'],
    ['apple-m3-max-gpu', 'Apple M3 Max GPU', 'double-super-rare', 'gen2', { gpuCores: 40, memoryBandwidthGBps: 400 }, null, '', 'Unified memory', 'die'],

    ['geforce-gtx-1080-ti', 'GeForce GTX 1080 Ti', 'legendary', 'gen2', { cudaCores: 3584, boostMhz: 1582, busBits: 352, boardPowerW: 250 }, 11, 'GB', 'GDDR5X', 'fan'],
    ['geforce-rtx-2080-ti', 'GeForce RTX 2080 Ti', 'legendary', 'gen2', { cudaCores: 4352, boostMhz: 1545, busBits: 352, boardPowerW: 250 }, 11, 'GB', 'GDDR6', 'fan'],
    ['radeon-rx-7900-xtx', 'Radeon RX 7900 XTX', 'legendary', 'gen2', { streamProcessors: 6144, boostMhz: 2500, busBits: 384, boardPowerW: 355 }, 24, 'GB', 'GDDR6', 'fan'],

    ['geforce-gtx-980-ti', 'GeForce GTX 980 Ti', 'mythical', 'gen2', { cudaCores: 2816, boostMhz: 1075, busBits: 384, boardPowerW: 250 }, 6, 'GB', 'GDDR5', 'fan'],
    ['geforce-rtx-3090', 'GeForce RTX 3090', 'mythical', 'gen2', { cudaCores: 10496, boostMhz: 1695, busBits: 384, boardPowerW: 350 }, 24, 'GB', 'GDDR6X', 'fan'],
    ['apple-m4-max-gpu', 'Apple M4 Max GPU', 'mythical', 'gen2', { gpuCores: 40, memoryBandwidthGBps: 546 }, null, '', 'Unified memory', 'die'],

    ['geforce-rtx-4090', 'GeForce RTX 4090', 'exotic', 'gen2', { cudaCores: 16384, boostMhz: 2520, busBits: 384, boardPowerW: 450 }, 24, 'GB', 'GDDR6X', 'fan'],
    ['radeon-rx-6900-xt', 'Radeon RX 6900 XT', 'exotic', 'gen2', { streamProcessors: 5120, boostMhz: 2250, busBits: 256, boardPowerW: 300 }, 16, 'GB', 'GDDR6', 'fan'],

    ['geforce-rtx-5080', 'GeForce RTX 5080', 'ascendant', 'gen2', { cudaCores: 10752, boostMhz: 2620, busBits: 256, boardPowerW: 360 }, 16, 'GB', 'GDDR7', 'fan'],
    ['apple-m5-gpu', 'Apple M5 GPU', 'ascendant', 'gen2', { gpuCores: 10, memoryBandwidthGBps: 153 }, null, '', 'Unified memory', 'die'],

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
  var integratedSpecSources = {
    'apple-m1-gpu': 'https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/',
    'apple-m1-pro-gpu': 'https://support.apple.com/en-gb/111901',
    'apple-m1-max-gpu': 'https://support.apple.com/en-us/111902',
    'apple-m2-gpu': 'https://www.apple.com/newsroom/2022/06/apple-unveils-all-new-macbook-air-supercharged-by-the-new-m2-chip/',
    'apple-m2-pro-gpu': 'https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/',
    'apple-m3-gpu': 'https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/',
    'apple-m3-pro-gpu': 'https://support.apple.com/en-ie/117737',
    'apple-m3-max-gpu': 'https://support.apple.com/en-ie/117737',
    'apple-m3-ultra-gpu': 'https://www.apple.com/newsroom/2025/03/apple-unveils-new-mac-studio-the-most-powerful-mac-ever/',
    'apple-m4-gpu': 'https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/',
    'apple-m4-max-gpu': 'https://support.apple.com/en-au/122211',
    'apple-m5-gpu': 'https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/',
    'snapdragon-x': 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/1174_Qualcomm_High_Performance_PC_Listicle.pdf',
    'snapdragon-x-plus': 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X-Plus-Product-Brief.pdf',
    'snapdragon-x-elite': 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Product-Brief-Snapdragon-X-Elite.pdf',
    'snapdragon-x2-elite': 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf'
  };
  catalog.forEach(function (row) { Object.keys(brands).forEach(function (brand) { if (brands[brand].indexOf(row[0]) >= 0) row[9] = brand; }); });
  legacyCards.forEach(function (card) { card.brand = null; card.type = 'gpu'; });
  var rosterImageCards = [
    { id: 'arc-a580', name: 'Arc A580', generation: 'gen2', rarity: 'rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 24, gpuClockMhz: 1700, busBits: 256, boardPowerW: 185 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-a580.webp', thumb: 'assets/cards/arc-a580-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'geforce-2-ultra', name: 'GeForce 2 Ultra', generation: 'gen1', rarity: 'rare', vram: { amount: 32, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 250, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-2-ultra.webp', thumb: 'assets/cards/geforce-2-ultra-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-680', name: 'GeForce GTX 680', generation: 'gen2', rarity: 'rare', vram: { amount: 2, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 1536, boostMhz: 1058, busBits: 256, boardPowerW: 195 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-680.webp', thumb: 'assets/cards/geforce-gtx-680-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-780', name: 'GeForce GTX 780', generation: 'gen2', rarity: 'rare', vram: { amount: 3, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 2304, boostMhz: 900, busBits: 384, boardPowerW: 250 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-780.webp', thumb: 'assets/cards/geforce-gtx-780-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1070', name: 'GeForce GTX 1070', generation: 'gen2', rarity: 'rare', vram: { amount: 8, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 1920, boostMhz: 1683, busBits: 256, boardPowerW: 150 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1070.webp', thumb: 'assets/cards/geforce-gtx-1070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'apple-m2-pro-gpu', name: 'Apple M2 Pro GPU', generation: 'gen2', rarity: 'rare', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 19, memoryBandwidthGBps: 200 }, specsVerified: true, specsSource: integratedSpecSources['apple-m2-pro-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m2-pro-gpu.webp', thumb: 'assets/cards/apple-m2-pro-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'snapdragon-x-elite', name: 'Snapdragon X Elite', generation: 'gen2', rarity: 'rare', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuTflops: 4.6, memoryBandwidthGBps: 135 }, specsVerified: true, specsSource: integratedSpecSources['snapdragon-x-elite'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/snapdragon-x-elite.webp', thumb: 'assets/cards/snapdragon-x-elite-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'qualcomm' },
    { id: 'radeon-rx-7800-xt', name: 'Radeon RX 7800 XT', generation: 'gen2', rarity: 'rare', vram: { amount: 16, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 3840, boostMhz: 2430, busBits: 256, boardPowerW: 263 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-7800-xt.webp', thumb: 'assets/cards/radeon-rx-7800-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'arc-a750', name: 'Arc A750', generation: 'gen2', rarity: 'super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 28, gpuClockMhz: 2050, busBits: 256, boardPowerW: 225 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-a750.webp', thumb: 'assets/cards/arc-a750-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'geforce-rtx-2060-super', name: 'GeForce RTX 2060 Super', generation: 'gen2', rarity: 'super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 2176, boostMhz: 1650, busBits: 256, boardPowerW: 175 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-2060-super.webp', thumb: 'assets/cards/geforce-rtx-2060-super-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-2070', name: 'GeForce RTX 2070', generation: 'gen2', rarity: 'super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 2304, boostMhz: 1620, busBits: 256, boardPowerW: 175 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-2070.webp', thumb: 'assets/cards/geforce-rtx-2070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-3070', name: 'GeForce RTX 3070', generation: 'gen2', rarity: 'super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 5888, boostMhz: 1725, busBits: 256, boardPowerW: 220 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-3070.webp', thumb: 'assets/cards/geforce-rtx-3070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-4060-ti', name: 'GeForce RTX 4060 Ti', generation: 'gen2', rarity: 'super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 4352, boostMhz: 2535, busBits: 128, boardPowerW: 160 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-4060-ti.webp', thumb: 'assets/cards/geforce-rtx-4060-ti-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'arc-b570', name: 'Arc B570', generation: 'gen2', rarity: 'super-rare', vram: { amount: 10, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 18, gpuClockMhz: 2500, busBits: 160, boardPowerW: 150 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-b570.webp', thumb: 'assets/cards/arc-b570-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'apple-m3-gpu', name: 'Apple M3 GPU', generation: 'gen2', rarity: 'super-rare', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 10 }, specsVerified: true, specsSource: integratedSpecSources['apple-m3-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m3-gpu.webp', thumb: 'assets/cards/apple-m3-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'radeon-rx-9060-xt', name: 'Radeon RX 9060 XT', generation: 'gen2', rarity: 'super-rare', vram: { amount: 16, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 2048, boostMhz: 3130, busBits: 128, boardPowerW: 160 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-9060-xt.webp', thumb: 'assets/cards/radeon-rx-9060-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'arc-b580', name: 'Arc B580', generation: 'gen2', rarity: 'unusual', vram: { amount: 12, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 20, gpuClockMhz: 2670, busBits: 192, boardPowerW: 190 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-b580.webp', thumb: 'assets/cards/arc-b580-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'geforce-gtx-980', name: 'GeForce GTX 980', generation: 'gen2', rarity: 'unusual', vram: { amount: 4, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 2048, boostMhz: 1216, busBits: 256, boardPowerW: 165 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-980.webp', thumb: 'assets/cards/geforce-gtx-980-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-4070', name: 'GeForce RTX 4070', generation: 'gen2', rarity: 'unusual', vram: { amount: 12, unit: 'GB', type: 'GDDR6X', shared: false }, specs: { cudaCores: 5888, boostMhz: 2475, busBits: 192, boardPowerW: 200 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-4070.webp', thumb: 'assets/cards/geforce-rtx-4070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-5070', name: 'GeForce RTX 5070', generation: 'gen2', rarity: 'unusual', vram: { amount: 12, unit: 'GB', type: 'GDDR7', shared: false }, specs: { cudaCores: 6144, boostMhz: 2512, busBits: 192, boardPowerW: 250 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-5070.webp', thumb: 'assets/cards/geforce-rtx-5070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'arc-a770', name: 'Arc A770', generation: 'gen2', rarity: 'unusual', vram: { amount: 16, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 32, gpuClockMhz: 2100, busBits: 256, boardPowerW: 225 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-a770.webp', thumb: 'assets/cards/arc-a770-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'apple-m4-gpu', name: 'Apple M4 GPU', generation: 'gen2', rarity: 'unusual', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 10, memoryBandwidthGBps: 120 }, specsVerified: true, specsSource: integratedSpecSources['apple-m4-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m4-gpu.webp', thumb: 'assets/cards/apple-m4-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'radeon-rx-9070', name: 'Radeon RX 9070', generation: 'gen2', rarity: 'unusual', vram: { amount: 16, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 3584, boostMhz: 2520, busBits: 256, boardPowerW: 220 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-9070.webp', thumb: 'assets/cards/radeon-rx-9070-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'geforce-gtx-1080', name: 'GeForce GTX 1080', generation: 'gen2', rarity: 'double-super-rare', vram: { amount: 8, unit: 'GB', type: 'GDDR5X', shared: false }, specs: { cudaCores: 2560, boostMhz: 1733, busBits: 256, boardPowerW: 180 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1080.webp', thumb: 'assets/cards/geforce-gtx-1080-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-rx-6800', name: 'Radeon RX 6800', generation: 'gen2', rarity: 'double-super-rare', vram: { amount: 16, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 3840, boostMhz: 2105, busBits: 256, boardPowerW: 250 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-6800.webp', thumb: 'assets/cards/radeon-rx-6800-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'geforce-rtx-4070-ti', name: 'GeForce RTX 4070 Ti', generation: 'gen2', rarity: 'double-super-rare', vram: { amount: 12, unit: 'GB', type: 'GDDR6X', shared: false }, specs: { cudaCores: 7680, boostMhz: 2610, busBits: 192, boardPowerW: 285 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-4070-ti.webp', thumb: 'assets/cards/geforce-rtx-4070-ti-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'apple-m3-pro-gpu', name: 'Apple M3 Pro GPU', generation: 'gen2', rarity: 'double-super-rare', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 18, memoryBandwidthGBps: 150 }, specsVerified: true, specsSource: integratedSpecSources['apple-m3-pro-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m3-pro-gpu.webp', thumb: 'assets/cards/apple-m3-pro-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'geforce-rtx-4080', name: 'GeForce RTX 4080', generation: 'gen2', rarity: 'legendary', vram: { amount: 16, unit: 'GB', type: 'GDDR6X', shared: false }, specs: { cudaCores: 9728, boostMhz: 2505, busBits: 256, boardPowerW: 320 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-4080.webp', thumb: 'assets/cards/geforce-rtx-4080-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-rx-7900-xt', name: 'Radeon RX 7900 XT', generation: 'gen2', rarity: 'legendary', vram: { amount: 20, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 5376, boostMhz: 2400, busBits: 320, boardPowerW: 315 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-7900-xt.webp', thumb: 'assets/cards/radeon-rx-7900-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'apple-m3-ultra-gpu', name: 'Apple M3 Ultra GPU', generation: 'gen2', rarity: 'legendary', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 80, memoryBandwidthGBps: '800+' }, specsVerified: true, specsSource: integratedSpecSources['apple-m3-ultra-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m3-ultra-gpu.webp', thumb: 'assets/cards/apple-m3-ultra-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'geforce-gtx-690', name: 'GeForce GTX 690', generation: 'gen2', rarity: 'mythical', vram: { amount: 4, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 3072, boostMhz: 1019, busBits: 512, boardPowerW: 300 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-690.webp', thumb: 'assets/cards/geforce-gtx-690-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'titan-x-pascal', name: 'TITAN X (Pascal)', generation: 'gen2', rarity: 'mythical', vram: { amount: 12, unit: 'GB', type: 'GDDR5X', shared: false }, specs: { cudaCores: 3584, boostMhz: 1531, busBits: 384, boardPowerW: 250 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/titan-x-pascal.webp', thumb: 'assets/cards/titan-x-pascal-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-titan', name: 'GeForce GTX TITAN', generation: 'gen2', rarity: 'exotic', vram: { amount: 6, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 2688, boostMhz: 876, busBits: 384, boardPowerW: 250 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-titan.webp', thumb: 'assets/cards/geforce-gtx-titan-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-3090-ti', name: 'GeForce RTX 3090 Ti', generation: 'gen2', rarity: 'exotic', vram: { amount: 24, unit: 'GB', type: 'GDDR6X', shared: false }, specs: { cudaCores: 10752, boostMhz: 1860, busBits: 384, boardPowerW: 450 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-3090-ti.webp', thumb: 'assets/cards/geforce-rtx-3090-ti-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'titan-rtx', name: 'TITAN RTX', generation: 'gen2', rarity: 'ascendant', vram: { amount: 24, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 4608, boostMhz: 1770, busBits: 384, boardPowerW: 280 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/titan-rtx.webp', thumb: 'assets/cards/titan-rtx-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-ddr', name: 'Radeon DDR', generation: 'gen1', rarity: 'secret', vram: { amount: 32, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 183, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-ddr.webp', thumb: 'assets/cards/radeon-ddr-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'radeon-9000', name: 'Radeon 9000', generation: 'gen1', rarity: 'basic', vram: { amount: 64, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 250, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-9000.webp', thumb: 'assets/cards/radeon-9000-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'radeon-hd-2400-xt', name: 'Radeon HD 2400 XT', generation: 'gen1', rarity: 'basic', vram: { amount: 256, unit: 'MB', type: 'GDDR3', shared: false }, specs: { streamProcessors: 40, coreClockMhz: 700, busBits: 64, boardPowerW: 35 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-hd-2400-xt.webp', thumb: 'assets/cards/radeon-hd-2400-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'geforce-fx-5500', name: 'GeForce FX 5500', generation: 'gen1', rarity: 'basic', vram: { amount: 128, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 270, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-fx-5500.webp', thumb: 'assets/cards/geforce-fx-5500-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-2-mx-200', name: 'GeForce 2 MX 200', generation: 'gen1', rarity: 'basic', vram: { amount: 32, unit: 'MB', type: 'SDR', shared: false }, specs: { pipelines: 2, coreClockMhz: 175, busBits: 64 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-2-mx-200.webp', thumb: 'assets/cards/geforce-2-mx-200-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gt-630', name: 'GeForce GT 630', generation: 'gen2', rarity: 'basic', vram: { amount: 2, unit: 'GB', type: 'DDR3', shared: false }, specs: { cudaCores: 96, boostMhz: 810, busBits: 128, boardPowerW: 65 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gt-630.webp', thumb: 'assets/cards/geforce-gt-630-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gt-730', name: 'GeForce GT 730', generation: 'gen2', rarity: 'basic', vram: { amount: 2, unit: 'GB', type: 'DDR3', shared: false }, specs: { cudaCores: 384, boostMhz: 902, busBits: 64, boardPowerW: 38 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gt-730.webp', thumb: 'assets/cards/geforce-gt-730-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gt-1030', name: 'GeForce GT 1030', generation: 'gen2', rarity: 'basic', vram: { amount: 2, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 384, boostMhz: 1468, busBits: 64, boardPowerW: 30 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gt-1030.webp', thumb: 'assets/cards/geforce-gt-1030-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1050', name: 'GeForce GTX 1050', generation: 'gen2', rarity: 'basic', vram: { amount: 2, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 640, boostMhz: 1455, busBits: 128, boardPowerW: 75 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1050.webp', thumb: 'assets/cards/geforce-gtx-1050-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1650', name: 'GeForce GTX 1650', generation: 'gen2', rarity: 'basic', vram: { amount: 4, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 896, boostMhz: 1665, busBits: 128, boardPowerW: 75 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1650.webp', thumb: 'assets/cards/geforce-gtx-1650-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-rx-6400', name: 'Radeon RX 6400', generation: 'gen2', rarity: 'basic', vram: { amount: 4, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 768, boostMhz: 2321, busBits: 64, boardPowerW: 53 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-6400.webp', thumb: 'assets/cards/radeon-rx-6400-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'geforce-rtx-3060', name: 'GeForce RTX 3060', generation: 'gen2', rarity: 'basic', vram: { amount: 12, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 3584, boostMhz: 1777, busBits: 192, boardPowerW: 170 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-3060.webp', thumb: 'assets/cards/geforce-rtx-3060-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1650-super', name: 'GeForce GTX 1650 Super', generation: 'gen2', rarity: 'common', vram: { amount: 4, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 1280, boostMhz: 1725, busBits: 128, boardPowerW: 100 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1650-super.webp', thumb: 'assets/cards/geforce-gtx-1650-super-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1660', name: 'GeForce GTX 1660', generation: 'gen2', rarity: 'common', vram: { amount: 6, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 1408, boostMhz: 1785, busBits: 192, boardPowerW: 120 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1660.webp', thumb: 'assets/cards/geforce-gtx-1660-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1660-super', name: 'GeForce GTX 1660 Super', generation: 'gen2', rarity: 'common', vram: { amount: 6, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 1408, boostMhz: 1785, busBits: 192, boardPowerW: 125 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1660-super.webp', thumb: 'assets/cards/geforce-gtx-1660-super-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-3050', name: 'GeForce RTX 3050', generation: 'gen2', rarity: 'common', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 2560, boostMhz: 1777, busBits: 128, boardPowerW: 130 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-3050.webp', thumb: 'assets/cards/geforce-rtx-3050-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-rtx-4060', name: 'GeForce RTX 4060', generation: 'gen2', rarity: 'common', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { cudaCores: 3072, boostMhz: 2460, busBits: 128, boardPowerW: 115 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-rtx-4060.webp', thumb: 'assets/cards/geforce-rtx-4060-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-rx-5500-xt', name: 'Radeon RX 5500 XT', generation: 'gen2', rarity: 'common', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 1408, boostMhz: 1845, busBits: 128, boardPowerW: 130 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-5500-xt.webp', thumb: 'assets/cards/radeon-rx-5500-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'radeon-rx-6500-xt', name: 'Radeon RX 6500 XT', generation: 'gen2', rarity: 'common', vram: { amount: 4, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 1024, boostMhz: 2815, busBits: 64, boardPowerW: 107 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-rx-6500-xt.webp', thumb: 'assets/cards/radeon-rx-6500-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'arc-a310', name: 'Arc A310', generation: 'gen2', rarity: 'common', vram: { amount: 4, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 6, gpuClockMhz: 2000, busBits: 64, boardPowerW: 75 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-a310.webp', thumb: 'assets/cards/arc-a310-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'apple-m1-pro-gpu', name: 'Apple M1 Pro GPU', generation: 'gen2', rarity: 'common', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 16, memoryBandwidthGBps: 200 }, specsVerified: true, specsSource: integratedSpecSources['apple-m1-pro-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m1-pro-gpu.webp', thumb: 'assets/cards/apple-m1-pro-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'snapdragon-x-plus', name: 'Snapdragon X Plus', generation: 'gen2', rarity: 'common', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuTflops: 3.8, memoryBandwidthGBps: 135 }, specsVerified: true, specsSource: integratedSpecSources['snapdragon-x-plus'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/snapdragon-x-plus.webp', thumb: 'assets/cards/snapdragon-x-plus-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'qualcomm' },
    { id: 'arc-a380', name: 'Arc A380', generation: 'gen2', rarity: 'uncommon', vram: { amount: 6, unit: 'GB', type: 'GDDR6', shared: false }, specs: { xeCores: 8, gpuClockMhz: 2000, busBits: 96, boardPowerW: 75 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/arc-a380.webp', thumb: 'assets/cards/arc-a380-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'intel' },
    { id: 'geforce-gtx-750-ti', name: 'GeForce GTX 750 Ti', generation: 'gen2', rarity: 'uncommon', vram: { amount: 2, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 640, boostMhz: 1085, busBits: 128, boardPowerW: 60 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-750-ti.webp', thumb: 'assets/cards/geforce-gtx-750-ti-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-hd-2900-pro', name: 'Radeon HD 2900 Pro', generation: 'gen1', rarity: 'uncommon', vram: { amount: 512, unit: 'MB', type: 'GDDR3', shared: false }, specs: { streamProcessors: 320, coreClockMhz: 600, busBits: 512, boardPowerW: 200 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/radeon-hd-2900-pro.webp', thumb: 'assets/cards/radeon-hd-2900-pro-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'geforce-2-gts', name: 'GeForce 2 GTS', generation: 'gen1', rarity: 'uncommon', vram: { amount: 32, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 200, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-2-gts.webp', thumb: 'assets/cards/geforce-2-gts-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-fx-5600-ultra', name: 'GeForce FX 5600 Ultra', generation: 'gen1', rarity: 'uncommon', vram: { amount: 128, unit: 'MB', type: 'DDR', shared: false }, specs: { pipelines: 4, coreClockMhz: 400, busBits: 128 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-fx-5600-ultra.webp', thumb: 'assets/cards/geforce-fx-5600-ultra-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'geforce-gtx-1060-3gb', name: 'GeForce GTX 1060 3GB', generation: 'gen2', rarity: 'uncommon', vram: { amount: 3, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 1152, boostMhz: 1708, busBits: 192, boardPowerW: 120 }, specsVerified: false, art: { kind: 'image', src: 'assets/cards/geforce-gtx-1060-3gb.webp', thumb: 'assets/cards/geforce-gtx-1060-3gb-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' },
    { id: 'radeon-rx-6600-xt', name: 'Radeon RX 6600 XT', generation: 'gen2', rarity: 'uncommon', vram: { amount: 8, unit: 'GB', type: 'GDDR6', shared: false }, specs: { streamProcessors: 2048, boostMhz: 2589, busBits: 128, boardPowerW: 160 }, specsVerified: false, specsNote: 'Reference specifications; board configurations may vary.', art: { kind: 'image', src: 'assets/cards/radeon-rx-6600-xt.webp', thumb: 'assets/cards/radeon-rx-6600-xt-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'amd' },
    { id: 'apple-m1-max-gpu', name: 'Apple M1 Max GPU', generation: 'gen2', rarity: 'uncommon', vram: { amount: null, unit: '', type: '', shared: false }, specs: { gpuCores: 32, memoryBandwidthGBps: 400 }, specsVerified: true, specsSource: integratedSpecSources['apple-m1-max-gpu'], specsNote: 'Integrated GPU; shared unified memory. Highest documented chip configuration.', art: { kind: 'image', src: 'assets/cards/apple-m1-max-gpu.webp', thumb: 'assets/cards/apple-m1-max-gpu-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'apple' },
    { id: 'geforce-gt-740', name: 'GeForce GT 740', generation: 'gen2', rarity: 'uncommon', vram: { amount: 1, unit: 'GB', type: 'GDDR5', shared: false }, specs: { cudaCores: 384, boostMhz: 993, busBits: 128, boardPowerW: 64 }, specsVerified: false, specsNote: 'Reference GDDR5 configuration; GT 740 board configurations vary.', art: { kind: 'image', src: 'assets/cards/geforce-gt-740.webp', thumb: 'assets/cards/geforce-gt-740-thumb.webp' }, artStatus: 'final', pullable: true, type: 'gpu', brand: 'nvidia' }
  ];

  C.data.cards = legacyCards.concat(catalog.map(makeCard), rosterImageCards);
})(window.Cardable = window.Cardable || {});
