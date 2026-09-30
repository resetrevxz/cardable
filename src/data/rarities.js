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
      designSpec: 'A basic white color', propSpec: null,
      finish: 'basic',
      reveal: { riseMs: 900, preFlipPauseMs: 0, flipMs: 700, bloom: 0, gridDim: 0.6, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$" (probably "<$1")
    },
    {
      id: 'common', tier: 1, code: 'C', name: 'Common', group: 'Common Tiers',
      chance: 23.5, pullable: true, targetCardCount: 23,
      description: 'Common cards found in almost every pack.',
      designSpec: 'A basic gray color', propSpec: null,
      finish: 'common',
      reveal: { riseMs: 900, preFlipPauseMs: 0, flipMs: 750, bloom: 0, gridDim: 0.6, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$"
    },
    {
      id: 'uncommon', tier: 2, code: 'UC', name: 'Uncommon', group: 'Common Tiers',
      chance: 15, pullable: true, targetCardCount: 18,
      description: 'More uncommon than common cards, but still usual.',
      designSpec: 'A basic lime color at the start fading to light green', propSpec: null,
      finish: 'uncommon',
      reveal: { riseMs: 950, preFlipPauseMs: 0, flipMs: 800, bloom: 0.1, gridDim: 0.65, shiftPx: 0 },
      marketValueUsd: null   // source said ">1$"
    },
    {
      id: 'rare', tier: 3, code: 'R', name: 'Rare', group: 'Common Tiers',
      chance: 7.5, pullable: true, targetCardCount: 39,
      description: 'A rare card mostly found in rare card packs.',
      designSpec: 'A light blue shade with sparkles going to a less light blue without sparkles', propSpec: null,
      finish: 'rare',
      reveal: { riseMs: 1000, preFlipPauseMs: 300, flipMs: 900, bloom: 0.2, gridDim: 0.7, shiftPx: 0 },
      marketValueUsd: 1.1
    },
    {
      id: 'super-rare', tier: 4, code: 'SR', name: 'Super Rare', group: 'Uncommon Tiers',
      chance: 2.5, pullable: true, targetCardCount: 14,
      description: 'A super rare card mostly found rarely in rare card packs.',
      designSpec: 'A blue color with ocean-like animated waves on the blue going/fading to a darker blue with a checkerbox pattern non-animated',
      propSpec: null,
      finish: 'super-rare',
      reveal: { riseMs: 1050, preFlipPauseMs: 350, flipMs: 1000, bloom: 0.3, gridDim: 0.75, shiftPx: 0 },
      marketValueUsd: 6.3
    },
    {
      id: 'unusual', tier: 5, code: 'U', name: 'Unusual', group: 'Uncommon Tiers',
      chance: 2, pullable: true, targetCardCount: 16,
      description: 'A strangely unique unusual card to come across.',
      designSpec: 'A purple color with animated white shining coming from the top with slowly boosting down and up (the white)',
      propSpec: null,
      finish: 'unusual',
      reveal: { riseMs: 1100, preFlipPauseMs: 350, flipMs: 1050, bloom: 0.35, gridDim: 0.78, shiftPx: 0 },
      marketValueUsd: 8.9
    },
    {
      id: 'double-super-rare', tier: 6, code: 'SSR', name: 'Double Super Rare', group: 'Uncommon Tiers',
      chance: 1.5, pullable: true, targetCardCount: 20,
      description: 'A double super rare card found rarest in rare card packs',
      designSpec: 'A dark blue checkerbox pattern moving to a gold color with animated sparkles and the gold shifting colors with the dark blue following too slowly',
      propSpec: null,
      finish: 'double-super-rare',
      reveal: { riseMs: 1200, preFlipPauseMs: 400, flipMs: 1150, bloom: 0.45, gridDim: 0.8, shiftPx: 0 },
      marketValueUsd: 12.5
    },
    {
      id: 'legendary', tier: 7, code: 'L', name: 'Legendary', group: 'Rare Tiers',
      chance: 1, pullable: true, targetCardCount: 31,   // OPEN-QUESTIONS #2: running totals imply 0.5
      description: "A card so legendary that it's sought after for millions.",
      designSpec: 'A golden color with sparkles, tip sparks, and in the middle part a different waving line which fades colors from light yellow-gold to a red-maroon colors, the red maroon color has a checkerbox pattern in it',
      propSpec: 'A gold crown (with sparkles and sparks) with red, blue and green gemstones with red having a hexagonal rotating glow, the blue being a mythril like non-animated white-ish texture, and the green having a extremely shiny outline',
      finish: 'legendary',
      reveal: { riseMs: 1300, preFlipPauseMs: 450, flipMs: 1300, bloom: 0.6, gridDim: 0.85, shiftPx: 1 },
      marketValueUsd: 41.6
    },
    {
      id: 'mythical', tier: 8, code: 'M', name: 'Mythical', group: 'Rare Tiers',
      chance: 0.75, pullable: true, targetCardCount: 26,
      description: 'Such a tale said about mythical cards almost no one has seen it for ages.',
      designSpec: 'A ruby like color which slowly goes from a basic to a shining one',
      propSpec: 'White to red flames outside the nametag having a burning flame animation from the bottom only',
      finish: 'mythical',
      reveal: { riseMs: 1400, preFlipPauseMs: 450, flipMs: 1400, bloom: 0.65, gridDim: 0.88, shiftPx: 1 },
      marketValueUsd: 66.9
    },
    {
      id: 'exotic', tier: 9, code: 'E', name: 'Exotic', group: 'Rare Tiers',
      chance: 0.2, pullable: true, targetCardCount: 19,
      description: 'A truly Exotic card that stands apart from the rest.',
      designSpec: 'A pink color with a purple border, and animated random shapes in the middle.',
      propSpec: 'A glowing outside square with small squircle edges border made of dark purple with a pink outline with white going circling border',
      finish: 'exotic',
      reveal: { riseMs: 1500, preFlipPauseMs: 500, flipMs: 1500, bloom: 0.75, gridDim: 0.9, shiftPx: 1 },
      marketValueUsd: 208.7
    },
    {
      id: 'ascendant', tier: 10, code: 'A', name: 'Ascendant', group: 'Legendary Tiers',
      chance: 0.045, pullable: true, targetCardCount: 15,
      description: 'A truly Ascendant card throughout generations.',
      designSpec: 'A white colored shifting pastel RGB colors on all side with random faded splashes happening every 2-3 seconds for 1 second fade in and out.',
      propSpec: 'A outside square with small squircle edges which shines and shifts colors like a aurora but with pastel colors',
      finish: 'ascendant',
      reveal: { riseMs: 1700, preFlipPauseMs: 500, flipMs: 1800, bloom: 0.9, gridDim: 0.95, shiftPx: 1 },
      marketValueUsd: 1192.4
    },
    {
      id: 'secret', tier: 11, code: '?', name: 'Secret', group: 'Legendary Tiers',
      chance: 0.005, pullable: true, targetCardCount: 16,
      // Two states: "unfound" (player does not own it) and "found" (owned). See docs/02-RARITIES.md tier 11.
      unfoundDescription: 'No record of this card exists.',
      unfoundDesignSpec: 'The secret logo is shifted by gibberish letters shifting including @#$&_- and many more in quick succession with a white color lines shifting across all of them quickly',
      unfoundPropSpec: 'A black square outside border with small squircle edges at 95% opacity',
      foundDescription: 'A secret card which was hidden by the world.',
      foundDesignSpec: 'The secret logo is shifted by gibberish letters shifting including @#$&_- and many more with a white color lines shifting across all of them quickly but every 0.3 seconds 1 letter of the word "Secret" locks in with a small white animation, until everything is "Secret", then it reverses to black color lines on white, and the lines start going faster and faster and bigger and bigger until everything is black then it reverses to White lines on black and so on.',
      foundPropSpec: 'A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes',
      finish: 'secret',
      reveal: { riseMs: 2000, preFlipPauseMs: 500, flipMs: 2200, bloom: 1, gridDim: 1, shiftPx: 1 },
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
