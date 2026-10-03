/* Royal is a deterministic upgrade of scheduled Rare slots. Data only. */
(function(C) {
  'use strict';
  C.data.packs.push({
    id:'royal', name:'Royal Pack', enabled:true, priority:0, cadence:null,
    replacesPackId:'rare', replacementChance:.05,
    pool:{minTier:7,maxTier:11}, tierWeightModifiers:{}, variantChanceMultiplier:1,
    cardsPerPack:1, skin:'royal', opening:'cutThenBox', swapIn:'goldShine',
    counterStyle:{accent:'#D9B65F',glyph:'♛',label:'ROYAL PACK'},
    tagline:'LEGENDARY OR BETTER', introText:'Royal Pack. A crown, a velvet box, and one Legendary or better card.',
    design:{material:'faceted-gold',wrapper:'foil',graphic:'die-ring',roughness:.3,foilStrength:.7,refraction:.08,emboss:.85,
      subtitle:'ROYAL / CROWN SERIES',showGenerationPool:false,series:'01',batch:'CROWN / 01',security:'CBL / ROYAL'},
    obtainable:'timer'
  });
})(window.Cardable);
