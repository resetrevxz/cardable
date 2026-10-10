(function(C){
  'use strict';
  function normalize(value){var tiers={};Object.keys(value&&value.cutscenes||{}).forEach(function(id){if(C.data.cutscenePrices[id]!=null&&value.cutscenes[id]===true)tiers[id]=true;});return {cutscenes:tiers};}
  function unlockInto(save,tier){
    var price=C.data.cutscenePrices[tier];if(!Number.isSafeInteger(price)||price<0)throw new Error('Unavailable cinematic');
    save.unlocks=normalize(save.unlocks);if(save.unlocks.cutscenes[tier])return {paid:0,already:true};
    if(save.currency<price)return null;
    C.currency.applyInto(save,-price,'cutscene unlock');save.unlocks.cutscenes[tier]=true;return {paid:price,already:false};
  }
  function unlock(tier){
    var before=C.state.current.currency,candidate=JSON.parse(C.state.encode(C.state.current)),result=unlockInto(candidate,tier);
    if(!result)return false;if(result.already)return true;if(!C.state.commit(candidate))return false;
    C.currency.notify(before,'cutscene unlock');C.events.emit('cutscene:unlocked',{tier:tier,price:result.paid,at:C.clock.now()});return true;
  }
  C.cutsceneUnlocks={normalize:normalize,unlockInto:unlockInto,unlock:unlock,
    // Replays are free from 1.3.1. Earlier paid unlocks stay recorded in the save.
    owned:function(tier){return C.data.cutscenePrices[tier]!=null;}};
})(window.Cardable);
