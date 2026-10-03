/* Original retro case skin and catalog-era policy. Data only. */
(function(C) {
  'use strict';
  C.data.cardSkins = [{id:'classic', name:'Classic monitor bezel'}];
  C.cardSkin = function(id) { return C.data.cardSkins.find(function(s) { return s.id === id; }) || null; };
  // Explicit catalog IDs: Generation 1 also contains 2007+ cards and is not an era.
  C.data.classicCardIds = ['geforce-256','geforce-2-mx','geforce-2-mx-200','geforce-2-gts','geforce-2-ultra',
    'geforce-fx-5200','geforce-fx-5500','geforce-fx-5600-ultra','radeon-ddr','radeon-7000','radeon-7500','radeon-8500','radeon-9000','radeon-9200'];
  C.data.cards.forEach(function(card) { if (!card.retired) card.era = C.data.classicCardIds.includes(card.id) ? 'classic' : 'modern'; });
  C.data.packs.push({
    id:'classic', name:'Classic Pack', enabled:true, priority:0, cadence:null, randomChance:.05,
    pool:{}, tierWeightModifiers:{secret:4}, eraWeightModifiers:{classic:3, modern:1},
    modernWeightConfig:'modernCardWeight', excludedVariantKinds:['frame'], cardSkinId:'classic',
    variantChanceMultiplier:1, cardsPerPack:1, skin:'classic', opening:'pullTab', swapIn:'tornadoPixel',
    counterStyle:{accent:'#D8D2BE',glyph:'486',label:'CLASSIC PACK'},
    tagline:'PAST MEETS PRESENT', introText:'Classic Pack. Vintage hardware, a permanent monitor bezel, and every ordinary tier.',
    design:{material:'aged-plastic',wrapper:'plastic-bezel',graphic:'die-ring',roughness:.85,foilStrength:.08,refraction:0,emboss:.25,
      subtitle:'CLASSIC / HARDWARE ARCHIVE',showGenerationPool:false,series:'01',batch:'486 / 66 MHz',security:'CBL / ORIGINAL'},
    obtainable:'timer'
  });
})(window.Cardable);
