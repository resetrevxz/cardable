(function(C,root){
  'use strict';
  var active=null, node=C.packMarkup.node;
  function close(){if(!active)return;var a=active;active=null;if(a.confirm)a.confirm.destroy();if(a.view)a.view.destroy();a.off();C.accessibility.release(a.el);a.el.remove();if(a.focus&&a.focus.isConnected)a.focus.focus({preventScroll:true});}
  function show(entry,selected,onDeleted){
    close();if(!entry.owned||C.inventory.preview)return;
    var focus=root.document.activeElement,el=node('section','cb-delete-overlay',C.viewport.parent(root.document.body)),dialog=node('div','cb-delete-dialog glass',el);
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Delete card copy');
    var a=active={el:el,focus:focus,view:null,confirm:null,off:function(){}};
    var heading=node('h2','',dialog,'Delete a copy'),intro=node('p','cb-delete-copy',dialog,entry.card.name),chooser=node('div','cb-delete-chooser',dialog),content=node('div','cb-delete-content',dialog);
    var cancel=node('button','cb-action',dialog,'Cancel');cancel.type='button';cancel.addEventListener('click',close);
    function choose(instance){
      if(a.confirm)a.confirm.destroy();if(a.view)a.view.destroy();content.replaceChildren();a.confirm=null;
      chooser.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.instanceId===instance.instanceId);});
      var rule=C.cardDeletion.rules(C.state.current,instance),preview=node('div','cb-delete-preview',content);a.view=C.cardView.createThumbnail(entry.card,instance,{owned:true});preview.appendChild(a.view.el);
      node('p','cb-delete-serial',content,instance.serial+' · '+new Date(instance.pulledAt).toLocaleString());node('p','cb-delete-copy',content,'Refund: '+rule.refund+' credits.');
      if(Number(instance.serial.split('-').pop())<=100)node('p','cb-delete-warning',content,'Low serial: one of the first 100 recorded copies.');
      if(instance.variantId)node('p','cb-delete-warning',content,'Permanent finish: '+C.variant(instance.variantId).name+'.');
      if(instance.comboId)node('p','cb-delete-warning',content,'This copy has a finish combo.');
      if(C.state.current.inventory.filter(function(i){return i.cardId===instance.cardId;}).length===1)node('p','cb-delete-warning',content,'This is your only copy of this card.');
      var live=node('p','cb-delete-copy',content);live.setAttribute('role','status');live.setAttribute('aria-live','polite');
      function unblock(){var current=C.state.current.inventory.find(function(i){return i.instanceId===instance.instanceId;});if(current)choose(current);}
      if(rule.favorite){node('p','cb-delete-warning',content,'Favorited cards cannot be deleted.');var unfav=node('button','cb-action',content,'Unfavorite');unfav.type='button';unfav.addEventListener('click',function(){C.inventoryModel.favorite(entry.stackKey);unblock();});}
      if(rule.locked){node('p','cb-delete-warning',content,'Locked copies cannot be deleted.');var unlock=node('button','cb-action',content,'Unlock this copy');unlock.type='button';unlock.addEventListener('click',function(){var candidate=JSON.parse(C.state.encode(C.state.current));var copy=candidate.inventory.find(function(i){return i.instanceId===instance.instanceId;});if(copy){copy.locked=false;if(C.state.commit(candidate))unblock();else live.textContent='Could not save. Copy stays locked.';}});}
      var typed=null;
      if(rule.typed){node('p','cb-delete-warning',content,'This card is '+entry.rarity.name+'. This cannot be undone after the undo window.');var label=node('label','cb-delete-name',content,'Type the exact card name');typed=node('input','',label);typed.type='text';typed.autocomplete='off';typed.spellcheck=false;typed.placeholder=entry.card.name;}
      var hold=node('button','cb-action cb-delete-hold',content,rule.holdMs?'Hold '+(rule.holdMs/1000)+' s to delete':'Delete this copy');hold.type='button';hold.disabled=rule.blocked||rule.typed;
      if(typed)typed.addEventListener('input',function(){a.confirm.cancel();hold.disabled=C.cardDeletion.rules(C.state.current,instance,typed.value).blocked||!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches;});
      a.confirm=C.uiKit.confirmation(hold,function(){
        if(!C.cardDeletion.remove(instance.instanceId,typed&&typed.value,rule.holdMs)){live.textContent='Could not delete. Check protection and saving, then try again.';a.confirm.cancel();return;}
        close();if(onDeleted)onDeleted();C.qol.toast('Copy deleted. Undo is available for 10 seconds.',{label:'Undo',run:function(){if(C.cardDeletion.undo())C.qol.toast('Exact copy restored.');else C.qol.toast('Undo expired or could not save.');}});
      },{mode:rule.holdMs?'hold':'immediate',holdMs:rule.holdMs,holdLabel:'Keep holding to delete',announce:function(text){if(live.isConnected)live.textContent=text;}});
      C.fx.wake();
    }
    if(entry.instances.length>1){node('p','cb-delete-copy',chooser,'Choose the exact copy to delete.');entry.instances.forEach(function(i){var finish=C.variant(i.variantId),b=node('button','cb-delete-option',chooser,i.serial+' · '+new Date(i.pulledAt).toLocaleDateString()+' · '+(finish?finish.name:'Normal'));b.type='button';b.dataset.instanceId=i.instanceId;b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){choose(i);});});}
    else choose(entry.instances[0]);
    if(selected&&entry.instances.length>1)choose(selected);
    C.keys.listen(el, 'keydown', 'src.ui.card-deletion.js.1', function(e){if(e.key==='Escape'){e.preventDefault();close();}e.stopPropagation();});
    ['pointerdown','click','contextmenu'].forEach(function(name){el.addEventListener(name,function(e){e.stopPropagation();});});
    a.off=C.fx.subscribe(function(now,dt){return a.confirm?a.confirm.update(now,dt):false;},'card-delete');C.accessibility.trap(el);cancel.focus();
  }
  function confirmPending(instance,run){var rule=C.cardDeletion.rules(C.state.current,instance),card=C.card(instance.cardId);if(rule.blocked){C.qol.toast('Protected cards cannot be discarded.');return;}if(!rule.holdMs){run();return;}
    var dialog=C.ui.create('dialog',{label:'Discard revealed card'});node('h2','',dialog,'Discard this card?');node('p','',dialog,card.name+' · '+instance.serial);node('p','cb-small',dialog,'This discards the reserved copy. Your opening reward is kept.');var typed=null;if(rule.typed){var label=node('label','cb-delete-name',dialog,'Type the exact card name');typed=node('input','',label);typed.type='text';typed.autocomplete='off';typed.spellcheck=false;}
    var live=node('p','cb-small',dialog);live.setAttribute('role','status');var actions=node('div','cb-controls-actions',dialog),p,stop,confirm;
    var cancel=C.ui.create('button',{label:'Keep card',onClick:function(){p.close();}}),hold=C.ui.create('button',{label:'Hold '+rule.holdMs/1000+' s to discard',variant:'danger'});actions.append(cancel,hold);hold.disabled=rule.typed;
    if(typed)typed.addEventListener('input',function(){hold.disabled=!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches;confirm.cancel();});
    confirm=C.uiKit.confirmation(hold,function(){if(rule.typed&&!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches)return;p.close();run();},{mode:'hold',holdMs:rule.holdMs,announce:function(t){live.textContent=t;}});stop=C.fx.subscribe(function(now,dt){return confirm.update(now,dt);},'pending-delete');p=C.ui.present(dialog,{onClose:function(){stop();confirm.destroy();}});
  }
  C.cardDeletionView={show:show,confirmPending:confirmPending,close:close,get active(){return !!active;}};
  C.events.on('save:willReplace',close);
})(window.Cardable,window);
