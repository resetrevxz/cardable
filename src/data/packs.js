/* Cardable — pack types. DATA ONLY.
 * Add a pack: append an object and set enabled: true. Give its wrapper a look in pack.css via data-pack="<id>".
 * tierWeightModifiers multiplies a tier's base chance for this pack only, e.g. { 'rare': 2 } doubles Rare.
 * Pack designs differ by material and finish (matte, glass, brushed metal), not by UI color.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};
  C.data.packGraphics = {
    'die-ring': { viewBox: '0 0 100 100', paths: [
      'M78 25A35 35 0 1 0 78 75', 'M72 32A25 25 0 1 0 72 68',
      'M38 38H62V62H38Z', 'M43 43H57V57H43Z',
      'M44 29V35M50 29V35M56 29V35M44 65V71M50 65V71M56 65V71M29 44H35M29 50H35M29 56H35M65 44H71M65 50H71M65 56H71'
    ] }
  };

  C.data.packs = [
    {
      id: 'standard', name: 'Standard Pack', enabled: true,
      cardsPerPack: 1,                       // OPEN-QUESTIONS #4
      tierWeightModifiers: {},
      guarantees: [],                        // future: [{ minTier: 2, slot: 0 }]
      design: { material: 'silver-foil', wrapper: 'satin-foil', graphic: 'die-ring',
        roughness: 0.42, foilStrength: 0.65, refraction: 0.32, emboss: 0.7,
        subtitle: 'Collectible graphics series', series: '01', batch: 'CB / 00018472',
        microprint: 'Digital sealed pack / Offline collection system', security: 'CBL / AUTHENTIC' },
      obtainable: 'timer'                    // 'timer' = comes from the 8-hour pack timer
    },
    {
      id: 'rare', name: 'Rare Pack', enabled: false,   // example of a future pack; keep disabled
      cardsPerPack: 1,
      tierWeightModifiers: { 'rare': 2, 'super-rare': 2, 'unusual': 2, 'double-super-rare': 2 },
      guarantees: [],
      design: { material: 'brushed-metal', wrapper: 'satin-foil' },
      obtainable: 'none'
    }
  ];
})(window.Cardable = window.Cardable || {});
