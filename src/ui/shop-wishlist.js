/* Wishlist controls use the inventory model's optional durable metadata path. */
(function (C, root) {
  'use strict';
  function node(tag, cls, parent, text) { var el=root.document.createElement(tag); el.className=cls||''; if(text!=null)el.textContent=text; if(parent)parent.appendChild(el); return el; }
  function lists() { return C.inventoryModel.current.collections.filter(function (item) { return item.kind==='wishlist'; }); }
  function wanted(cardId) { return lists().some(function (item) { return item.cardIds.indexOf(cardId)>=0; }); }
  C.shopWishlist = { lists:lists, wanted:wanted, create:function (parent, cardId, options) {
    var details=node('details','shop-wishlist',parent), summary=node('summary','shop-wishlist-summary',details);
    summary.appendChild(C.icons.create('star')); node('span','',summary,'Wishlist');
    var badge=node('span','shop-wishlist-badge',summary,'Wishlisted'), body=node('div','shop-wishlist-body',details);
    var signature=null, note=null;
    function canEdit() { return details.isConnected && options.active() && !options.busy() && C.state.lastWriteSucceeded && !(C.state.recovery&&C.state.recovery.pending); }
    function feedback(ok, message) {
      if (!details.isConnected) return;
      refresh();
      if (!ok && note) { note.textContent='Wishlist could not be saved. Retry save, then try again.'; note.hidden=false; }
      options.announce(ok?message:'Wishlist could not be saved. No change made.');
    }
    function control(parent,label,run,cls) { var button=C.ui.create('button',{label:label,onClick:function(){if(canEdit())run();}}); button.classList.add(cls); parent.appendChild(button); return button; }
    function refresh() {
      if (!details.isConnected) return;
      var available=lists(), selected=available.find(function (item) { return item.id===options.target(); })||available[0];
      var marked=wanted(cardId) && C.settings.get('shopWishlistMarkers')!==false;
      badge.hidden=!marked; details.dataset.wanted=String(marked);
      var next=JSON.stringify([available.map(function (item) { return [item.id,item.name,item.cardIds.indexOf(cardId)>=0,item.priorities[cardId]]; }),selected&&selected.id]);
      if(next!==signature) {
        var focused=body.contains(root.document.activeElement); signature=next; body.replaceChildren();
        if (selected) {
          var label=node('label','shop-wishlist-field',body); node('span','',label,'Wishlist');
          var select=node('select','shop-wishlist-select shop-option-select',label);
          available.forEach(function (item) { var option=node('option','',select,item.name); option.value=item.id; }); select.value=selected.id;
          select.addEventListener('change',function(){if(!details.isConnected||!options.active())return;options.setTarget(select.value);options.changed();var current=body.querySelector('.shop-wishlist-select');if(current)current.focus({preventScroll:true});});
          var included=selected.cardIds.indexOf(cardId)>=0;
          control(body,included?'Remove from wishlist':'Add to wishlist',function(){
            var result=C.inventoryModel.wishlistMembership(selected.id,cardId,!included,{durable:true});
            feedback(!!result,included?'Removed from '+selected.name+'.':'Added to '+selected.name+'.');
            var current=body.querySelector('.shop-wishlist-toggle');if(current)current.focus({preventScroll:true});
          },'shop-wishlist-toggle');
          if(included) {
            var priorityLabel=node('label','shop-wishlist-field',body);node('span','',priorityLabel,'Priority');
            var priority=node('select','shop-wishlist-priority shop-option-select',priorityLabel);
            ['low','normal','high'].forEach(function(value){var option=node('option','',priority,value.charAt(0).toUpperCase()+value.slice(1));option.value=value;});
            priority.value=selected.priorities[cardId]||'normal';
            priority.addEventListener('change',function(){if(!canEdit())return;feedback(!!C.inventoryModel.priority(selected.id,cardId,priority.value,{durable:true}),'Wishlist priority saved.');var current=body.querySelector('.shop-wishlist-priority');if(current)current.focus({preventScroll:true});});
          }
        } else node('p','shop-wishlist-empty',body,'No wishlists yet.');
        var form=node('details','shop-wishlist-new',body); node('summary','',form,'New wishlist');
        var field=node('label','shop-wishlist-field',form);node('span','',field,'Name');
        var name=node('input','shop-wishlist-name',field);name.type='text';name.maxLength=60;name.placeholder='Wishlist name';
        var create=control(form,'Create and add card',function(){
          if(!name.value.trim())return;
          var id=C.inventoryModel.create(name.value,{kind:'wishlist',cardId:cardId,durable:true,activate:false});
          if(id){options.setTarget(id);options.changed();}
          feedback(!!id,'Wishlist created.');
          if(id){var current=body.querySelector('.shop-wishlist-select');if(current)current.focus({preventScroll:true});}
        },'shop-wishlist-create');
        create.dataset.requiresName='true'; create.disabled=true;
        name.addEventListener('input',function(){create.disabled=!canEdit()||!name.value.trim();});
        note=node('p','shop-wishlist-note',body);note.hidden=true;note.setAttribute('role','status');
        if(focused){var target=body.querySelector('select')||summary;target.focus({preventScroll:true});}
      }
      body.querySelectorAll('button,select,input').forEach(function (el) {
        el.disabled=el.classList.contains('shop-wishlist-select') ? !options.active() : !canEdit() || el.dataset.requiresName==='true' && !body.querySelector('.shop-wishlist-name').value.trim();
      });
      // A rejected durable write leaves the model unchanged; restore the field too.
      var priorityField=body.querySelector('.shop-wishlist-priority');
      if(priorityField&&selected)priorityField.value=selected.priorities[cardId]||'normal';
    }
    refresh(); return {el:details,refresh:refresh};
  }};
})(window.Cardable,window);
