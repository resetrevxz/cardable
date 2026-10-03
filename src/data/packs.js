/* Cardable — pack types. DATA ONLY.
 * Add a pack: append a complete definition; register an optional skin with C.packSkins.register.
 * tierWeightModifiers multiplies a tier's base chance for this pack only, e.g. { 'rare': 2 } doubles Rare.
 * Rare sapphire is an owner-approved color exception, scoped to packs, queue markers and provenance tags.
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
      priority: 0, cadence: null, pool: {}, skin: 'standard', variantChanceMultiplier: 1,
      counterStyle: { accent: null, glyph: 'C', label: 'STANDARD PACK' }, tagline: '', introText: '',
      cardsPerPack: 1,                       // OPEN-QUESTIONS #4
      tierWeightModifiers: {},
      guarantees: [],                        // future: [{ minTier: 2, slot: 0 }]
      design: { material: 'silver-foil', wrapper: 'satin-foil', graphic: 'die-ring',
        roughness: 0.42, foilStrength: 0.65, refraction: 0.32, emboss: 0.7,
        subtitle: 'Collectible graphics series', showGenerationPool: false, series: '01', batch: 'CB / 00018472',
        microprint: '', security: 'CBL / AUTHENTIC' },
      obtainable: 'timer'                    // 'timer' = regenerates on config.packs.regenMs
    },
    {
      id: 'rare', name: 'Rare Pack', enabled: true,
      priority: 10, cadence: { every: 4 }, pool: { minTier: 3 }, skin: 'rare',
      variantChanceMultiplier: 1,
      counterStyle: { accent: 'var(--pack-rare-blue)', glyph: 'R+', label: 'RARE PACK' },
      tagline: 'RARE OR BETTER', introText: 'Every fourth pack is a Rare Pack. Rare or better.',
      cardsPerPack: 1,
      tierWeightModifiers: { 'super-rare': 1.5, 'unusual': 1.5, 'double-super-rare': 1.5,
        legendary: 2, mythical: 2, exotic: 2, ascendant: 2, secret: 2 },
      guarantees: [],
      design: { material: 'sapphire-lacquer', wrapper: 'gloss-foil', graphic: 'die-ring',
        roughness: 0.12, foilStrength: 0.85, refraction: 0.32, emboss: 0.7,
        subtitle: 'Collectible graphics series', showGenerationPool: false,
        series: '01', batch: 'R+ / CB / 00018472', security: 'CBL / AUTHENTIC' },
      obtainable: 'timer'
    }
  ];
})(window.Cardable = window.Cardable || {});
