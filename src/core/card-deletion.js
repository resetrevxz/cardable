(function(C){
  'use strict';
  var undo=null;
  function rules(save,instance,typed){
    var card=instance&&C.card(instance.cardId),rarity=card&&C.rarity(card.rarity),favorite=instance&&save.inventoryUi.favorites.includes(C.stacks.of(instance));
    return {blocked:!card||!!instance.locked||!!favorite,locked:!!(instance&&instance.locked),favorite:!!favorite,
      typed:!!rarity&&rarity.tier>=7,holdMs:rarity&&rarity.tier>=7?2500:1500,
      nameMatches:!!card&&String(typed||'').trim().toLocaleLowerCase()===card.name.trim().toLocaleLowerCase(),refund:0};
  }
  function remove(id,typed,heldMs){
    var current=C.state.current,instance=current.inventory.find(function(i){return i.instanceId===id;}),rule=rules(current,instance,typed);
    if(rule.blocked||rule.typed&&!rule.nameMatches||!Number.isFinite(heldMs)||heldMs<rule.holdMs)return false;
    var candidate=JSON.parse(C.state.encode(current)),index=candidate.inventory.findIndex(function(i){return i.instanceId===id;}),snapshot=candidate.inventory[index];
    candidate.inventory.splice(index,1);
    if(!C.state.commit(candidate))return false;
    undo={instance:snapshot,index:index,until:performance.now()+10000,identity:current.playerCode+':'+current.createdAt};
    C.events.emit('card:deleted',{instance:snapshot,cardId:snapshot.cardId,instanceId:id,source:'inventory'});return true;
  }
  function restore(){
    var receipt=undo,current=C.state.current;
    if(!receipt||performance.now()>receipt.until||receipt.identity!==current.playerCode+':'+current.createdAt||current.inventory.some(function(i){return i.instanceId===receipt.instance.instanceId;}))return false;
    var candidate=JSON.parse(C.state.encode(current));candidate.inventory.splice(Math.min(receipt.index,candidate.inventory.length),0,receipt.instance);
    if(!C.state.commit(candidate))return false;undo=null;
    C.events.emit('card:restored',{instance:receipt.instance,cardId:receipt.instance.cardId,instanceId:receipt.instance.instanceId});return true;
  }
  C.cardDeletion={rules:rules,remove:remove,undo:restore};
  C.events.on('save:willReplace',function(){undo=null;});C.events.on('save:willReset',function(){undo=null;});
})(window.Cardable);
