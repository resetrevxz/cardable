/* Original brand-neutral vault; curated catalog IDs only. Data only. */
(function(C){
  'use strict';
  C.data.packs.push({id:'titan',name:'Titan Pack',enabled:true,priority:0,cadence:null,randomChance:.05,
    pool:{minTier:5,maxTier:10,cardIds:['geforce-gtx-titan','titan-x-pascal','titan-rtx','geforce-gtx-690',
      'geforce-gtx-980-ti','geforce-gtx-1080-ti','geforce-rtx-2080-ti','geforce-rtx-3090',
      'geforce-rtx-3090-ti','geforce-rtx-4090','geforce-rtx-5090','geforce-rtx-5080',
      'radeon-vii','radeon-rx-6900-xt','radeon-rx-7900-xtx','apple-m3-ultra-gpu','apple-m4-max-gpu']},
    tierWeightModifiers:{unusual:.3,'double-super-rare':.5,exotic:3,ascendant:4},
    variantChanceMultiplier:1,cardsPerPack:1,skin:'titan',opening:'vaultDial',swapIn:'monolithDrop',
    counterStyle:{accent:'#B9C4CE',glyph:'◉',label:'TITAN PACK'},tagline:'CURATED HALO HARDWARE',
    introText:'Titan Pack. Seventeen halo designs, sealed inside a titanium vault.',
    design:{material:'brushed-titanium',wrapper:'vault',graphic:'die-ring',roughness:.65,foilStrength:.35,refraction:0,emboss:.9,
      subtitle:'TITAN PACK / HALO SERIES',showGenerationPool:false,series:'01',batch:'LIMITED RUN',security:'CBL / TITAN'},obtainable:'timer'});
})(window.Cardable);
