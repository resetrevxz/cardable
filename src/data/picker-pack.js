(function(C){
  'use strict';
  var pack={id:'picker',name:'Picker Pack',enabled:true,priority:0,cadence:null,
    slotRules:{regularChance:.03},pool:{},tierWeightModifiers:{},variantChanceMultiplier:1,
    cardsPerPack:1,cardsShown:3,cardsKept:1,guarantees:[{minTier:3,count:1}],unpickedRefund:0,
    skin:'picker',opening:'shuffleThree',swapIn:'cardRiffle',choiceLabel:'PICKED 1 OF 3',
    counterStyle:{accent:'#2DE2B8',glyph:'1/3',label:'PICKER PACK'},tagline:'PICK 1 OF 3',
    readyTitle:'Picker pack ready',introText:'Picker Pack. Three cards are shown, shuffled by hand, and you pick one from their backs.',
    design:{face:'picker',material:'clear-sleeve',wrapper:'triptych',graphic:'die-ring',roughness:.3,foilStrength:.4,
      refraction:.15,emboss:.55,subtitle:'PICKER PACK',showGenerationPool:false,series:'01',batch:'P3',security:'CBL / THREE WINDOWS'},
    motion:{swapMs:1200,sheenMs:7000,showEnterMs:700,showHoldMs:1700,turnMs:520,gatherMs:520,opMs:1000,dealMs:540,monteMs:620,confirmMs:600,choiceMs:650,
      shuffleOps:['overhand','overhand','riffle','cut','overhand']},obtainable:'timer'};
  Object.defineProperty(pack,'randomChance',{enumerable:true,get:function(){return pack.slotRules.regularChance;}});
  C.data.packs.push(pack);
})(window.Cardable);
