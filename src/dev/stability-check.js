(function(C){
  'use strict';
  C.dev.checkStability=function(){
    var start=performance.now(),passed=[];
    function require(ok,name){if(!ok)throw new Error('Stability: '+name);passed.push(name);}
    var realCard=C.card,realRarity=C.rarity;
    try{
      C.card=function(id){return {id:id,name:'Check GPU',rarity:id};};C.rarity=function(id){return {id:id,tier:Number(id)};};
      for(var tier=0;tier<=11;tier++){
        var instance={cardId:String(tier),instanceId:'check',variantId:null,cardSkinId:null},save={inventoryUi:{favorites:[]}},rule=C.cardDeletion.rules(save,instance,' check gpu ');
        require(!rule.blocked&&rule.holdMs===(tier>=7?2500:1500)&&rule.typed===(tier>=7)&&rule.nameMatches,'delete rule tier '+tier);
        require(!C.cardDeletion.rules(save,instance,'wrong name').nameMatches,'exact typed name tier '+tier);
        instance.locked=true;require(C.cardDeletion.rules(save,instance).blocked,'locked blocked tier '+tier);instance.locked=false;
        save.inventoryUi.favorites=[C.stacks.of(instance)];require(C.cardDeletion.rules(save,instance).blocked,'favorite blocked tier '+tier);
      }
    }finally{C.card=realCard;C.rarity=realRarity;}
    var wallet={currency:100};C.currency.applyInto(wallet,25,'dev',100);C.currency.applyInto(wallet,-40,'shop',101);
    require(wallet.currency===85&&wallet.wallet.log[0].delta===-40&&wallet.wallet.log[1].delta===25,'ledger arithmetic and newest first');
    for(var i=0;i<220;i++)C.currency.applyInto(wallet,1,'dev',102+i);
    require(wallet.currency===305&&wallet.wallet.log.length===200,'ledger cap 200');
    var totals=C.currency.today(wallet,321);require(totals.earned===245&&totals.spent===40,'daily totals survive ledger cap');
    var failed=false,unchanged=JSON.stringify(wallet);try{C.currency.applyInto(wallet,-306,'shop',400);}catch(_){failed=true;}
    require(failed&&JSON.stringify(wallet)===unchanged,'insufficient payment changes nothing');
    var current=C.state.current,commit=C.state.commit,emit=C.events.emit;
    try{
      C.state.current=C.state.fresh();C.state.current.currency=1000;C.events.emit=function(){};
      C.state.commit=function(){return false;};
      require(!C.cutsceneUnlocks.unlock('mythical')&&C.state.current.currency===1000&&!C.state.current.unlocks,'failed commit adopts no payment/unlock');
      C.state.commit=function(candidate){C.state.current=candidate;return true;};
      require(C.cutsceneUnlocks.unlock('mythical')&&C.state.current.currency===850&&C.state.current.wallet.log[0].reason==='cutscene unlock','atomic successful unlock payment');
      require(C.cutsceneUnlocks.unlock('mythical')&&C.state.current.currency===850&&C.state.current.wallet.log.length===1,'tier unlock exactly once');
      require(C.cutsceneUnlocks.normalize(JSON.parse(JSON.stringify(C.state.current.unlocks))).cutscenes.mythical===true,'unlock persistence normalization');
    }finally{C.state.current=current;C.state.commit=commit;C.events.emit=emit;}
    var values=Array.from({length:100},function(_,n){return n+1;}),stats=C.performanceStats.statistics(values);
    require(Math.abs(stats.p50-50.5)<1e-9&&Math.abs(stats.p95-95.05)<1e-9&&Math.abs(stats.p99-99.01)<1e-9,'interpolated p50 p95 p99');
    require(Math.abs(stats.low1-1000/99.01)<1e-9&&Math.abs(stats.low01-1000/99.901)<1e-9,'one percent and point one percent lows');
    require(C.performanceStats.statistics([]).fps===0&&C.performanceStats.statistics([0,NaN,Infinity,20]).fps===50,'empty and invalid frame samples');
    require(performance.now()-start<1000,'manual check under one second');
    var result={passed:passed.length,checks:passed,ms:Math.round((performance.now()-start)*100)/100};console.info('checkStability PASS',result);return result;
  };
})(window.Cardable);
