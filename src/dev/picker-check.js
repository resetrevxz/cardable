(function(C){
  'use strict';
  C.dev.checkPicker=function(){
    var start=performance.now(),checks=[],seed=0x503133;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    var pack=C.data.packs.find(C.picker.isChoicePack),distinct=true,guaranteed=true;
    for(var n=0;n<80;n++){var rows=C.picker.draw(pack,{random:random});distinct=distinct&&rows.length===3&&new Set(rows.map(function(r){return r.cardId;})).size===3;guaranteed=guaranteed&&rows.some(function(r){return C.rarity(C.card(r.cardId).rarity).tier>=3;});}
    checks.push({label:'Seeded offers: three distinct cards, Rare-or-better guarantee',pass:distinct&&guaranteed});
    var save=C.state.fresh(123);save.pendingReveal=C.picker.reserve(pack,{random:random},124);
    var original=JSON.stringify(save.pendingReveal.options),reloaded=C.state.validate(JSON.parse(JSON.stringify(save)),true);
    checks.push({label:'Mid-pick migration resumes unchanged options without minting',pass:reloaded.pendingReveal.choice===null&&JSON.stringify(reloaded.pendingReveal.options)===original&&reloaded.serialCounter===0&&reloaded.inventory.length===0&&reloaded.pendingReveal.cards.length===0});
    var chosen=C.picker.chooseInto(reloaded,1),counter=reloaded.serialCounter,replayRejected=false;
    try{C.picker.chooseInto(reloaded,0);}catch(_){replayRejected=true;}
    reloaded=C.state.validate(JSON.parse(JSON.stringify(reloaded)),true);
    checks.push({label:'Only choice mints next serial; chosen recovery and replay guard',pass:counter===1&&reloaded.serialCounter===1&&reloaded.pendingReveal.cards.length===1&&reloaded.inventory.length===0&&chosen.instance.cardId===save.pendingReveal.options[1].cardId&&replayRejected});
    var legacy=C.state.fresh(100);legacy.schemaVersion=3;delete legacy.packs.openedCount;legacy.stats.packsOpened=9;
    checks.push({label:'Old save loads at current schema',pass:C.state.validate(legacy,true).packs.openedCount===9});
    var elapsedMs=performance.now()-start;return {pass:checks.every(function(c){return c.pass;})&&elapsedMs<1000,checks:checks,elapsedMs:Number(elapsedMs.toFixed(2))};
  };
  C.dev.startups.push(function(){C.dev.register({id:'checks.picker',group:'Checks',label:'Check Picker logic',type:'button',helper:'Manual only, isolated data, no saves.',run:function(){var r=C.dev.checkPicker();C.dev.message((r.pass?'PASS':'FAIL')+' · Picker · '+r.elapsedMs+' ms',!r.pass);}});});
})(window.Cardable);
