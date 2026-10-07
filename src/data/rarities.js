/* Cardable — rarity tiers. DATA ONLY.
 * Add a tier: append an object, add src/finishes/<id>.js, add a reveal row. See docs/02-RARITIES.md.
 *
 * chance: percent. NOTE: the chances below sum to 100.5 (OPEN-QUESTIONS #2). Code normalizes by the sum.
 * marketValueUsd: RESERVED for the future market. Do not read, display or build logic on it.
 * The source template's "variation chance" is intentionally omitted (variants system not made yet).
 * reveal: see the table in docs/02-RARITIES.md section 4.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.rarities = [
    {
      id: 'basic', tier: 0, code: 'B', name: 'Basic', group: 'Common Tiers',
      chance: 46.5, pullable: true, targetCardCount: 34,
      description: 'A basic card with no distinction.',
      designSpec: 'A basic white color which changes to gray based on viewing angles', propSpec: null,
      finish: 'basic', frontDesign: 'full-art',
      openingIntro: { kind: 'pulse', color: [255,255,255], intensity: .78, handoff: { flipMs:400, fadeMs:160 },
        sections: [{ id:'corners', ms:240 }, { id:'spread', ms:540 }, { id:'peak', ms:100 }, { id:'retreat', ms:320 }] },
      reveal: { riseMs: 900, preFlipPauseMs: 0, flipMs: 700, bloom: 0, gridDim: 0.6, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$" (probably "<$1")
    },
    {
      id: 'common', tier: 1, code: 'C', name: 'Common', group: 'Common Tiers',
      chance: 23.5, pullable: true, targetCardCount: 23,
      description: 'Common cards found in almost every pack.',
      designSpec: 'A gray color that spins around the card border in a shiny white outline', propSpec: null,
      finish: 'common', frontDesign: 'full-art',
      openingIntro: { kind: 'pulse', color: [190,190,190], intensity: .86, handoff: { flipMs:400, fadeMs:160 },
        sections: [{ id:'corners', ms:260 }, { id:'spread', ms:600 }, { id:'peak', ms:120 }, { id:'retreat', ms:370 }] },
      reveal: { riseMs: 900, preFlipPauseMs: 0, flipMs: 750, bloom: 0, gridDim: 0.6, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$"
    },
    {
      id: 'uncommon', tier: 2, code: 'UC', name: 'Uncommon', group: 'Common Tiers',
      chance: 15, pullable: true, targetCardCount: 18,
      description: 'More uncommon than common cards, but still usual.',
      designSpec: 'A basic lime color going to gradient green, and changes from green to dark green based on moving it', propSpec: null,
      finish: 'uncommon', frontDesign: 'full-art',
      openingIntro: { kind: 'orbit', color: [182,255,60], orbitColor: [80,221,112], intensity: .72, handoff: { flipMs:400, fadeMs:160 },
        sections: [{ id:'corners', ms:300 }, { id:'spread', ms:650 }, { id:'orbit', ms:400 }, { id:'retreat', ms:450 }] },
      reveal: { riseMs: 950, preFlipPauseMs: 0, flipMs: 800, bloom: 0.1, gridDim: 0.65, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$"
    },
    {
      id: 'rare', tier: 3, code: 'R', name: 'Rare', group: 'Common Tiers',
      chance: 7.5, pullable: true, targetCardCount: 39,
      description: 'A rare card mostly found in rare card packs.',
      designSpec: 'A light blue shade with sparkles going to a less light blue without sparkles', propSpec: null,
      finish: 'rare', frontDesign: 'full-art',
      openingIntro: { kind: 'crystal', color: [41,135,250], orbitColor: [96,194,255], starColor: [208,247,255], background: [5,12,27], intensity: .62, handoff: { flipMs:400, fadeMs:160 },
        sections: [{ id:'corners', ms:350 }, { id:'spread', ms:500 }, { id:'approach', ms:1550 }, { id:'snap', ms:180 }, { id:'fracture', ms:820 }, { id:'release', ms:400 }] },
      reveal: { riseMs: 1000, preFlipPauseMs: 300, flipMs: 900, bloom: 0.2, gridDim: 0.7, shiftPx: 0 },
      marketValueUsd: 1.1
    },
    {
      id: 'super-rare', tier: 4, code: 'SR', name: 'Super Rare', group: 'Uncommon Tiers',
      chance: 2.5, pullable: true, targetCardCount: 14,
      description: 'A super rare card mostly found rarely in rare card packs.',
      designSpec: 'A blue color with ocean-like animated waves on the blue going/fading to a darker blue with a checkerbox pattern non-animated',
      propSpec: null,
      finish: 'super-rare', frontDesign: 'full-art',
      openingIntro: { kind: 'portal', color: [71,142,255], orbitColor: [106,192,255], starColor: [200,246,255], background: [7,14,34], intensity: .68, handoff: { flipMs:400, fadeMs:160 },
        sections: [{ id:'sparks', ms:600 }, { id:'orbit', ms:900 }, { id:'gather', ms:1000 }, { id:'burst', ms:180 }, { id:'portal', ms:2000 }, { id:'dive', ms:1050 }, { id:'wash', ms:550 }, { id:'release', ms:320 }] },
      reveal: { riseMs: 1050, preFlipPauseMs: 350, flipMs: 1000, bloom: 0.3, gridDim: 0.75, shiftPx: 0 },
      marketValueUsd: 6.3
    },
    {
      id: 'unusual', tier: 5, code: 'U', name: 'Unusual', group: 'Uncommon Tiers',
      chance: 2, pullable: true, targetCardCount: 16,
      description: 'A strangely unique unusual card to come across.',
      designSpec: 'A purple color with animated white shining coming from the top with slowly boosting down and up (the white)',
      propSpec: null,
      finish: 'unusual', frontDesign: 'full-art',
      openingIntro: { kind: 'refraction', color: [168, 62, 255], orbitColor: [225, 130, 255], starColor: [249, 233, 255], background: [20, 5, 38],
        handoff: { flipMs: 400, fadeMs: 160 }, sections: [
          { id: 'material', ms: 1500 }, { id: 'ignition', ms: 1100 }, { id: 'accelerate', ms: 2200 },
          { id: 'saturate', ms: 1660 }, { id: 'lock', ms: 140 }, { id: 'release', ms: 200 }
        ] },
      reveal: { riseMs: 1100, preFlipPauseMs: 350, flipMs: 1050, bloom: 0.35, gridDim: 0.78, shiftPx: 0 },
      marketValueUsd: 8.9
    },
    {
      id: 'double-super-rare', tier: 6, code: 'SSR', name: 'Double Super Rare', group: 'Uncommon Tiers',
      chance: 1.5, pullable: true, targetCardCount: 20,
      description: 'A double super rare card found rarest in rare card packs',
      designSpec: 'A dark blue checkerbox pattern moving to a gold color with animated sparkles and the gold shifting colors with the dark blue following too slowly',
      propSpec: null,
      finish: 'double-super-rare', frontDesign: 'full-art',
      openingIntro: { kind: 'refraction', split: true, color: [58, 126, 245], orbitColor: [120, 200, 255], starColor: [225, 243, 255], background: [5, 15, 35],
        secondColor: [237, 157, 25], secondAccent: [255, 208, 92], secondLight: [255, 245, 213], secondaryBackground: [34, 18, 4],
        handoff: { flipMs: 400, fadeMs: 160 }, sections: [
          { id: 'material', ms: 1600 }, { id: 'ignition', ms: 1200 }, { id: 'accelerate', ms: 2400 },
          { id: 'saturate', ms: 1860 }, { id: 'lock', ms: 140 }, { id: 'release', ms: 200 }
        ] },
      reveal: { riseMs: 1200, preFlipPauseMs: 400, flipMs: 1150, bloom: 0.45, gridDim: 0.8, shiftPx: 0 },
      marketValueUsd: 12.5
    },
    {
      id: 'legendary', tier: 7, code: 'L', name: 'Legendary', group: 'Rare Tiers',
      chance: 1, pullable: true, targetCardCount: 31,   // OPEN-QUESTIONS #2: running totals imply 0.5
      description: "A card so legendary that it's sought after for millions.",
      designSpec: 'A golden color with sparkles, tip sparks, and in the middle part a different waving line which fades colors from light yellow-gold to a red-maroon colors, the red maroon color has a checkerbox pattern in it',
      propSpec: 'A gold crown (with sparkles and sparks) with red, blue and green gemstones with red having a hexagonal rotating glow, the blue being a mythril like non-animated white-ish texture, and the green having a extremely shiny outline',
      finish: 'legendary', frontDesign: 'full-art', propOutset: { top: 0.18, bottom: 0, side: 0 },
      openingIntro: { kind: 'gilded', color: [238, 174, 47], orbitColor: [173, 92, 18], starColor: [255, 239, 179], background: [14, 10, 5],
        handoff: { flipMs: 400, fadeMs: 160 }, backdrop: { enabled: true, exitMs: 450 }, sections: [
          { id: 'embers', ms: 650 }, { id: 'flames', ms: 1850 }, { id: 'aura', ms: 1700 },
          { id: 'sweeps', ms: 3000 }, { id: 'seal', ms: 900 }, { id: 'resolve', ms: 500 }
        ] },
      reveal: { riseMs: 1300, preFlipPauseMs: 450, flipMs: 1300, bloom: 0.6, gridDim: 0.85, shiftPx: 1 },
      marketValueUsd: 41.6
    },
    {
      id: 'mythical', tier: 8, code: 'M', name: 'Mythical', group: 'Rare Tiers',
      chance: 0.75, pullable: true, targetCardCount: 26,
      description: 'Such a tale said about mythical cards almost no one has seen it for ages.',
      designSpec: 'A ruby like color which slowly goes from a basic to a shining one, has the glassy look with shiny refractions and actual crystal look',
      propSpec: 'White to red flames outside the card having a burning flame animation from the bottom only',
      finish: 'mythical', frontDesign: 'full-art', propOutset: { top: 0, bottom: 0.11, side: 0.06 },
      openingIntro: { kind: 'crimson', color: [236, 16, 40], orbitColor: [100, 3, 20], starColor: [255, 209, 204], background: [7, 0, 3],
        caveArt: { clusters: 18, highClusters: 30, sway: .012, tipAngle: .29, pauseAt: .72,
          rockRelief: .68, wetness: .58, heroLight: 1.15 },
        handoff: { flipMs: 400, fadeMs: 160 }, backdrop: { enabled: true, animated: true, exitMs: 450 }, sections: [
          { id: 'cave', ms: 5000 }, { id: 'tip', ms: 1800 }, { id: 'fall', ms: 1200 },
          { id: 'impact', ms: 1000 }, { id: 'underwater', ms: 4500 }, { id: 'ascend', ms: 2200 },
          { id: 'omen', ms: 3000 }, { id: 'clock', ms: 4600 }, { id: 'rupture', ms: 3300 },
          { id: 'explosion', ms: 500 }, { id: 'release', ms: 500 }
        ] },
      reveal: { riseMs: 1400, preFlipPauseMs: 450, flipMs: 1400, bloom: 0.65, gridDim: 0.88, shiftPx: 1 },
      marketValueUsd: 66.9
    },
    {
      id: 'exotic', tier: 9, code: 'E', name: 'Exotic', group: 'Rare Tiers',
      chance: 0.2, pullable: true, targetCardCount: 19,
      description: 'A truly Exotic card that stands apart from the rest.',
      designSpec: 'A pink color with a purple border, and animated random shapes in the middle.',
      propSpec: 'A glowing outside square with small squircle edges border made of dark purple with a pink outline with white going circling border',
      finish: 'exotic', frontDesign: 'full-art', propOutset: { top: 0.045, bottom: 0.045, side: 0.045 },
      reveal: { riseMs: 1500, preFlipPauseMs: 500, flipMs: 1500, bloom: 0.75, gridDim: 0.9, shiftPx: 1 },
      openingIntro: { kind: 'cosmic', preludeRarity: 'basic', color: [184, 111, 255], background: [3, 3, 9], intensity: 1,
        palette: { nebula: [93, 54, 206], pink: [236, 119, 255], core: [255, 246, 233], gold: [255, 217, 143],
          stars: [[121, 148, 255], [173, 99, 255], [246, 123, 232], [170, 207, 255], [255, 179, 145]] },
        handoff: { flipMs: 400, fadeMs: 160 }, backdrop: { enabled: true, animated: true, exitMs: 450 },
        sections: [{ id: 'prelude', ms: 880 }, { id: 'blackout', ms: 520 }, { id: 'starlight', ms: 1400 },
          { id: 'acceleration', ms: 10000 }, { id: 'brake', ms: 420 }, { id: 'ignition', ms: 1000 },
          { id: 'galaxy', ms: 3600 }, { id: 'dissolve', ms: 1200 }, { id: 'release', ms: 280 }] },
      marketValueUsd: 208.7
    },
    {
      id: 'ascendant', tier: 10, code: 'A', name: 'Ascendant', group: 'Legendary Tiers',
      chance: 0.045, pullable: true, targetCardCount: 15,
      description: 'A truly Ascendant card throughout generations.',
      designSpec: 'A white colored shifting pastel RGB colors on all side with random faded splashes happening every 2-3 seconds for 1 second fade in and out.',
      propSpec: 'A outside square with small squircle edges which shines and shifts colors like a aurora but with pastel colors',
      finish: 'ascendant', frontDesign: 'full-art', propOutset: { top: 0.045, bottom: 0.045, side: 0.045 },
      openingIntro: { kind: 'prismatic', cutscene: 'ascendant', milestone: 'A', color: [213, 229, 255], background: [5, 6, 10],
        handoff: { flipMs: 400, fadeMs: 160 }, backdrop: { enabled: true, animated: true, exitMs: 450 },
        sections: [{ id: 'prelude', ms: 1000 }, { id: 'spark', ms: 3000 }, { id: 'clouds', ms: 5000 },
          { id: 'veil', ms: 1600 }],
        beats: [{ id: 'spark1', ms: 1600 }, { id: 'spark2', ms: 2400 }, { id: 'spark3', ms: 3000 }] },
      reveal: { cutscene: 'ascendant', riseMs: 1700, preFlipPauseMs: 500, flipMs: 1800, bloom: 0.9, gridDim: 0.95, shiftPx: 1 },
      marketValueUsd: 1192.4
    },
    {
      id: 'secret', tier: 11, code: '?', name: 'Secret', group: 'Legendary Tiers',
      chance: 0.005, pullable: true, targetCardCount: 16,
      // Two states: "unfound" (player does not own it) and "found" (owned). See docs/02-RARITIES.md tier 11.
      unfoundDescription: 'No record of this card exists.',
      unfoundDesignSpec: 'Fast white line sweeps on black, confined to the sides, without lettering.',
      unfoundPropSpec: 'A black square outside border with small squircle edges at 95% opacity',
      foundDescription: 'A secret card which was hidden by the world.',
      foundDesignSpec: 'White line sweeps on black sides invert to black lines on white, accelerate and grow to cover the sides, then repeat; no lettering.',
      foundPropSpec: 'A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes',
      finish: 'secret', frontDesign: 'full-art', propOutset: { top: 0.04, bottom: 0.04, side: 0.04 },
      reveal: { cutscene: 'secret', riseMs: 2000, preFlipPauseMs: 500, flipMs: 2200, bloom: 1, gridDim: 1, shiftPx: 1 },
      marketValueUsd: 9875
    },
    {
      id: 'limited', tier: 12, code: '#', name: 'Limited', group: 'Exclusive Tiers',
      chance: null, pullable: false, targetCardCount: 15,   // not part of the normal odds
      availableUntil: null,                                  // set a date (ms or ISO string) to activate
      availableDescription: 'Only obtainable for a limited time till <date>',
      unavailableDescription: 'Was obtainable for a limited time till <date>',
      designSpec: 'A purple color with animated white shining coming from the top with slowly boosting down and up (the white)',
      propSpec: "A glowing crimson red border which makes the logo feel like it's flying.",
      finish: 'limited',
      reveal: { riseMs: 1300, preFlipPauseMs: 450, flipMs: 1300, bloom: 0.6, gridDim: 0.85, shiftPx: 1 },
      marketValueUsd: null
    }
  ];
})(window.Cardable = window.Cardable || {});
