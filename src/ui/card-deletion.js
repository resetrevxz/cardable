(function(C,root){
  'use strict';
  // Selling a copy. This module keeps its old name and the cb-delete-* styles; what it does since Market Beta Stage 3
  // is Quick Sell: the system's standing bid for the exact copy, committed once with a receipt and a ledger entry.
  var active=null, node=C.packMarkup.node;
  function close(){if(!active)return;var a=active;active=null;if(a.confirm)a.confirm.destroy();if(a.view)a.view.destroy();a.off();C.accessibility.release(a.el);a.el.remove();if(a.focus&&a.focus.isConnected)a.focus.focus({preventScroll:true});}
  function credits(n){return Number(n).toLocaleString()+' Credits';}
  function soldToast(result,name){
    var undo=C.sales.canUndo()?{label:'Undo',run:function(){var r=C.sales.undo();C.qol.toast(r.ok?(r.count===1?'Exact copy restored.':r.count+' copies restored.'):r.message);}}:null;
    C.qol.toast((result.count>1?result.count+' cards':name)+' sold for '+credits(result.total)+'.'+(undo?' Undo is available for 10 seconds.':''),undo||undefined);
  }
  function basisText(q){return q.basis==='baseline'?'Baseline estimate: no recent trades of this card yet.':'From '+q.samples+' recent trade'+(q.samples===1?'':'s')+'.';}
  function show(entry,selected,onSold){
    close();if(!entry.owned||C.inventory.preview)return;
    var focus=root.document.activeElement,el=node('section','cb-delete-overlay',C.viewport.parent(root.document.body)),dialog=node('div','cb-delete-dialog glass',el);
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Sell card copy');
    var a=active={el:el,focus:focus,view:null,confirm:null,off:function(){}};
    var heading=node('h2','',dialog,'Sell a copy'),intro=node('p','cb-delete-copy',dialog,entry.card.name),chooser=node('div','cb-delete-chooser',dialog),content=node('div','cb-delete-content',dialog);
    var cancel=node('button','cb-action',dialog,'Cancel');cancel.type='button';cancel.addEventListener('click',close);
    function choose(instance,notice){
      if(a.confirm)a.confirm.destroy();if(a.view)a.view.destroy();content.replaceChildren();a.confirm=null;
      chooser.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.instanceId===instance.instanceId);});
      var rule=C.cardDeletion.rules(C.state.current,instance),preview=node('div','cb-delete-preview',content),q=C.sales.quote(instance),shown=C.sales.quoteMany([instance]);
      a.view=C.cardView.createThumbnail(entry.card,instance,{owned:true});preview.appendChild(a.view.el);
      node('p','cb-delete-serial',content,instance.serial+' · '+new Date(instance.pulledAt).toLocaleString());
      // The price, stated before anything is pressed.
      var price=node('p','cb-delete-price',content);price.setAttribute('role','status');
      node('strong','',price,q?credits(q.quote):'No quote');
      if(q)node('span','cb-delete-copy',price,' Quick Sell · '+Math.round(q.factor*100)+'% of Average Value '+q.fair.toLocaleString()+'. '+basisText(q));
      node('p','cb-delete-copy',content,'Quick Sell is a fixed, certain price from the system. Another trader on the Market would normally pay more. It never counts as a market sale.');
      if(notice)node('p','cb-delete-warning',content,notice);
      if(Number(instance.serial.split('-').pop())<=100)node('p','cb-delete-warning',content,'Low serial: one of the first 100 recorded copies.');
      if(instance.variantId)node('p','cb-delete-warning',content,'Permanent finish: '+C.variant(instance.variantId).name+'. Its Average Value already includes it.');
      if(instance.comboId)node('p','cb-delete-warning',content,'This copy has a finish combo.');
      if(C.state.current.inventory.filter(function(i){return i.cardId===instance.cardId;}).length===1)node('p','cb-delete-warning',content,'This is your only copy of this card.');
      var live=node('p','cb-delete-copy',content);live.setAttribute('role','status');live.setAttribute('aria-live','polite');
      function unblock(){var current=C.state.current.inventory.find(function(i){return i.instanceId===instance.instanceId;});if(current)choose(current);}
      if(rule.favorite){node('p','cb-delete-warning',content,'Favorited cards cannot be sold.');var unfav=node('button','cb-action',content,'Unfavorite');unfav.type='button';unfav.addEventListener('click',function(){C.inventoryModel.favorite(entry.sourceStackKey||entry.stackKey);unblock();});}
      if(rule.listed)node('p','cb-delete-warning',content,'This copy is listed on the Market. Withdraw the listing first, or let it sell.');
      if(rule.locked){node('p','cb-delete-warning',content,'Locked copies cannot be sold.');var unlock=node('button','cb-action',content,'Unlock this copy');unlock.type='button';unlock.addEventListener('click',function(){var candidate=JSON.parse(C.state.encode(C.state.current));var copy=candidate.inventory.find(function(i){return i.instanceId===instance.instanceId;});if(copy){copy.locked=false;if(C.state.commit(candidate))unblock();else live.textContent='Could not save. Copy stays locked.';}});}
      var typed=null;
      if(rule.typed){node('p','cb-delete-warning',content,'This card is '+entry.rarity.name+'. A sale cannot be undone once the Credits are spent.');var label=node('label','cb-delete-name',content,'Type the exact card name');typed=node('input','',label);typed.type='text';typed.autocomplete='off';typed.spellcheck=false;typed.placeholder=entry.card.name;}
      var price1=q?q.quote:0,hold=node('button','cb-action cb-delete-hold',content,rule.holdMs?'Hold '+(rule.holdMs/1000)+' s to sell for '+credits(price1):'Sell for '+credits(price1));hold.type='button';hold.disabled=rule.blocked||rule.typed||!q;
      if(typed)typed.addEventListener('input',function(){a.confirm.cancel();hold.disabled=C.cardDeletion.rules(C.state.current,instance,typed.value).blocked||!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches;});
      var list=node('button','cb-action',content,'List on the Market instead');list.type='button';list.disabled=!!rule.listed||!C.market||!C.market.open;
      list.addEventListener('click',function(){var id=instance.instanceId;close();if(!C.market.open({name:'compose',params:{instanceId:id,cardId:instance.cardId},from:'portfolio'}))C.qol.toast('Finish what you are doing, then open the Market.');});
      var refresh=node('button','cb-action',content,'Refresh quote');refresh.type='button';refresh.addEventListener('click',function(){C.valuation.invalidate();choose(instance);});
      a.confirm=C.uiKit.confirmation(hold,function(){
        if(typed&&!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches){a.confirm.cancel();return;}
        var result=C.sales.sell([instance.instanceId],{strict:true,expectTotal:shown.total,expiresAt:shown.expiresAt,kind:'quick'});
        if(!result.ok){
          if(result.error==='quote-changed'||result.error==='quote-expired'){C.valuation.invalidate();choose(instance,'The quote changed, so nothing was sold. Review the new price.');return;}
          live.textContent=result.message||'Could not sell. Check protection and saving, then try again.';a.confirm.cancel();return;
        }
        close();if(onSold)onSold();soldToast(result,entry.card.name);
      },{mode:rule.holdMs?'hold':'immediate',holdMs:rule.holdMs,holdLabel:'Keep holding to sell',announce:function(text){if(live.isConnected)live.textContent=text;}});
      C.fx.wake();
    }
    if(entry.instances.length>1){node('p','cb-delete-copy',chooser,'Choose the exact copy to sell.');entry.instances.forEach(function(i){var finish=C.variant(i.variantId),qi=C.sales.quote(i),b=node('button','cb-delete-option',chooser,i.serial+' · '+new Date(i.pulledAt).toLocaleDateString()+' · '+(finish?finish.name:'Normal')+(qi?' · '+credits(qi.quote):''));b.type='button';b.dataset.instanceId=i.instanceId;b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){choose(i);});});}
    else choose(entry.instances[0]);
    if(selected&&entry.instances.length>1)choose(selected);
    C.keys.listen(el, 'keydown', 'src.ui.card-deletion.js.1', function(e){if(e.key==='Escape'){e.preventDefault();close();}e.stopPropagation();});
    ['pointerdown','click','contextmenu'].forEach(function(name){el.addEventListener(name,function(e){e.stopPropagation();});});
    a.off=C.fx.subscribe(function(now,dt){return a.confirm?a.confirm.update(now,dt):false;},'card-delete');C.accessibility.trap(el);cancel.focus();
  }
  // The revealed card's Sell decision. The sale itself is committed by the opening, in the same write as the decision.
  function confirmPending(instance,run){
    var rule=C.cardDeletion.rules(C.state.current,instance),card=C.card(instance.cardId),q=C.sales.quote(instance);
    if(rule.blocked){C.qol.toast('Favorite cards cannot be sold. Keep this one.');return;}
    if(!rule.holdMs){run();return;}
    var dialog=C.ui.create('dialog',{label:'Sell revealed card'});node('h2','',dialog,'Sell this card for '+(q?credits(q.quote):'Credits')+'?');node('p','',dialog,card.name+' · '+instance.serial);
    node('p','cb-small',dialog,'Quick Sell pays '+(q?Math.round(q.factor*100)+'% of its Average Value':'the system price')+', less than another trader would. The card is gone once you confirm.');
    var typed=null;if(rule.typed){var label=node('label','cb-delete-name',dialog,'Type the exact card name');typed=node('input','',label);typed.type='text';typed.autocomplete='off';typed.spellcheck=false;}
    var live=node('p','cb-small',dialog);live.setAttribute('role','status');var actions=node('div','cb-controls-actions',dialog),p,stop,confirm;
    var cancel=C.ui.create('button',{label:'Keep card',onClick:function(){p.close();}}),hold=C.ui.create('button',{label:'Hold '+rule.holdMs/1000+' s to sell',variant:'danger'});actions.append(cancel,hold);hold.disabled=rule.typed;
    if(typed)typed.addEventListener('input',function(){hold.disabled=!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches;confirm.cancel();});
    confirm=C.uiKit.confirmation(hold,function(){if(rule.typed&&!C.cardDeletion.rules(C.state.current,instance,typed.value).nameMatches)return;p.close();run();},{mode:'hold',holdMs:rule.holdMs,announce:function(t){live.textContent=t;}});stop=C.fx.subscribe(function(now,dt){return confirm.update(now,dt);},'pending-delete');p=C.ui.present(dialog,{onClose:function(){stop();confirm.destroy();}});
  }
  C.cardDeletionView={show:show,confirmPending:confirmPending,close:close,soldToast:soldToast,get active(){return !!active;}};
  C.events.on('save:willReplace',close);
})(window.Cardable,window);
