/* Cardable — pack types. DATA ONLY.
 * Add a pack: append an object and set enabled: true. Give its wrapper a look in pack.css via data-pack="<id>".
 * tierWeightModifiers multiplies a tier's base chance for this pack only, e.g. { 'rare': 2 } doubles Rare.
 * Pack designs differ by material and finish (matte, glass, brushed metal), not by UI color.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.packs = [
    {
      id: 'standard', name: 'Standard Pack', enabled: true,
      cardsPerPack: 1,                       // OPEN-QUESTIONS #4
      tierWeightModifiers: {},
      guarantees: [],                        // future: [{ minTier: 2, slot: 0 }]
      design: { material: 'glass', wrapper: 'matte-foil' },
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
