(function(C,root){
  'use strict';
  var session=null,replayHost=null,replayIntro=null,node=C.packMarkup.node;
  function stop(){
    if(!session)return;var s=session;session=null;s.intro.stop();s.cleanups.forEach(function(off){off();});s.releaseScope();C.accessibility.release(s.el);s.el.hidden=true;s.el.inert=true;
    s.hidden.forEach(function(r){if(r.el.isConnected){r.el.inert=r.inert;r.el.style.visibility=r.visibility;}});s.releaseMenu();
    C.events.emit('cutscene:replayContext',{active:false});if(s.focus&&s.focus.isConnected)s.focus.focus({preventScroll:true});C.fx.wake();
  }
  function play(instance){
    var card=C.card(instance.cardId),rarity=C.rarity(card.rarity);
    if(session||C.studio&&C.studio.pending||C.opening.phase!=='idle'||!rarity.openingIntro||!C.cutsceneUnlocks.owned(rarity.id)||!C.state.current.inventory.some(function(i){return i.instanceId===instance.instanceId;}))return false;
    var el=replayHost||(replayHost=node('section','cb-replay-overlay',C.viewport.parent(root.document.body)));el.hidden=false;el.inert=false;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',rarity.name+' cutscene replay');
    var s=session={el:el,instance:instance,hidden:[],cleanups:[],focus:root.document.activeElement,age:0,handoff:false,releaseAge:0};
    s.releaseMenu=C.menu.suspendActivity();s.releaseScope=C.fx.scope('cutscene-replay');
    C.viewport.layers().forEach(function(layer){if(layer===el||layer===C.performanceDisplay||layer.tagName==='SCRIPT')return;s.hidden.push({el:layer,inert:layer.inert,visibility:layer.style.visibility});layer.inert=true;layer.style.visibility='hidden';});
    if(!el.querySelector('.cb-help-button')){var help=C.ui.create('help',{help:'cinematic',label:'Cinematic help'});el.appendChild(help);}
    var close=el.querySelector('.cb-replay-return');if(!close){close=node('button','cb-replay-return cb-action',el,'Return to card');close.type='button';close.addEventListener('click',stop);C.keys.listen(el, 'keydown', 'src.ui.cutscene-replay.js.1', function(e){if(e.key==='Escape'){e.preventDefault();stop();}e.stopPropagation();});}
    s.intro=replayIntro||(replayIntro=C.rarityIntro.create(el));try{s.intro.start(rarity.openingIntro,rarity.name,instance.serial);}catch(error){stop();C.qol.toast('Could not start this cutscene.');return false;}
    // Reuse the cinematic clock/safety/skip, with no opening, reward or serial calls.
    s.cleanups.push(C.fx.subscribe(function(now,dt){
      s.age+=dt;
      if(!s.handoff){if(s.intro.update(s.age,now)){s.handoff=true;s.intro.beginHandoff();}}
      else{s.releaseAge+=dt;s.intro.updateRelease(s.releaseAge,dt);if(!s.intro.active){stop();return false;}}
      return true;
    },'cutscene-replay'));
    s.cleanups.push(C.viewport.onResize(function(){if(session===s)s.intro.resize();}));
    s.cleanups.push(C.events.on('save:willReplace',stop));C.accessibility.trap(el);close.focus();C.events.emit('cutscene:replayContext',{active:true,tier:rarity.id,instanceId:instance.instanceId});C.fx.wake();return true;
  }
  function button(host,instance){
    var card=C.card(instance.cardId),rarity=C.rarity(card.rarity);if(!rarity.openingIntro||C.data.cutscenePrices[rarity.id]==null)return null;
    var b=node('button','cb-replay-action cb-action',host);b.type='button';var armed=0;
    function refresh(){var price=C.data.cutscenePrices[rarity.id],missing=price-C.state.current.currency;b.textContent=C.cutsceneUnlocks.owned(rarity.id)?'Replay cutscene':missing>0?'Locked · '+price.toLocaleString()+' credits · need '+missing.toLocaleString()+' more':'Unlock replay · '+price.toLocaleString()+' credits';b.setAttribute('aria-label',b.textContent+' · '+rarity.name);b.title='Unlock '+rarity.name+' replay for '+price.toLocaleString()+' credits, once per tier';if(!C.cutsceneUnlocks.owned(rarity.id))b.prepend(C.inventoryIcons.create('lock'));}
    b.addEventListener('click',function(){
      if(C.cutsceneUnlocks.owned(rarity.id)){play(instance);return;}
      if(!C.currency.canAfford(C.data.cutscenePrices[rarity.id])){refresh();return;}
      var now=root.performance.now();if(armed&&now-armed<3000){armed=0;if(C.cutsceneUnlocks.unlock(rarity.id)){refresh();play(instance);}else{b.textContent='Could not save unlock. Try again.';}}
      else{armed=now;b.textContent='Click again to unlock · '+C.data.cutscenePrices[rarity.id]+' credits';C.fx.wake();}
    });
    var off=C.fx.subscribe(function(now){if(!b.isConnected){off();return false;}if(armed&&now-armed>=3000){armed=0;refresh();}return !!armed;},C.studio&&C.studio.active?'studio':'detail-info');
    b.addEventListener('blur',function(){armed=0;refresh();});refresh();return b;
  }
  C.cutsceneReplay={play:play,stop:stop,button:button,get active(){return !!session;}};
  C.detailActions.register('cutscene-replay',function(host,context){if(context.entry.owned&&!context.preview)button(host,C.detail.view?C.detail.view.instance:context.entry.instances[0]);});
})(window.Cardable,window);
