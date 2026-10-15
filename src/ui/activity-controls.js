(function(C,root){'use strict';
  C.events.on('app:ready',function(){
    var sheet=C.inventory.el,arrow=C.inventory.arrow,timer=null,until=performance.now()+5000;if(!sheet||!arrow||C.presentation.gallery)return;
    function distance(el,p){var r=C.fx.rect(el);return Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));}
    function pinned(){return C.inventory.active||C.inventory.gesturesActive||C.input.modality==='keyboard'&&(sheet.contains(root.document.activeElement)||arrow===root.document.activeElement)||C.tutorial.active&&C.tutorial.step==='inventory';}
    function quiet(value){root.document.body.classList.toggle('inventory-peek-quiet',value);C.inventoryHint.setVisible(!value);C.inventory.setPeekQuiet(value);}
    function arm(){root.clearTimeout(timer);if(root.document.hidden)return;if(!C.settings.get('proximityChrome')||pinned()){quiet(false);return;}var remaining=until-performance.now();quiet(remaining<=0);if(remaining>0)timer=root.setTimeout(arm,remaining);}
    function wake(){until=performance.now()+5000;arm();}
    C.events.on('pointer:move',function(event){var p=event.pointer;if(p&&p.inside&&!C.inventory.active&&C.opening.phase==='idle'&&!C.preferences.open&&Math.min(distance(arrow,p),distance(sheet,p))<=160){wake();C.inventory.warmPeek(true);}else arm();});
    ['inventory:context','tutorial:context','save:written','input:modality'].forEach(function(name){C.events.on(name,wake);});root.document.addEventListener('pointerdown',function(event){if(C.inventory.active||C.opening.phase!=='idle'||C.preferences.open||C.friendly.active||C.commands.active)return;if(sheet.contains(event.target)||arrow.contains(event.target))wake();else if(event.pointerType==='touch'&&root.document.body.classList.contains('inventory-peek-quiet')&&Math.min(distance(arrow,{x:event.clientX,y:event.clientY}),distance(sheet,{x:event.clientX,y:event.clientY}))<=64){wake();C.inventory.request(true);}});root.document.addEventListener('focusin',arm);root.document.addEventListener('focusout',function(){root.queueMicrotask(arm);});root.document.addEventListener('visibilitychange',arm);C.settings.onChange('proximityChrome',arm);arm();
  });
})(window.Cardable,window);
