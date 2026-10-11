(function (C, root) {
  'use strict';
  var bindings = new Map();
  var battery = false, notice, noticeTimer, awake = false, studioActive = false, booted = false, nativeState = null, lastPack = null;
  var recent = null;
  function recentCards(){
    var latest=[];
    C.state.current.inventory.forEach(function(item){
      var at=0;while(at<latest.length&&(latest[at].pulledAt>item.pulledAt||latest[at].pulledAt===item.pulledAt&&latest[at].serial.localeCompare(item.serial)>=0))at++;
      if(at<3){latest.splice(at,0,item);if(latest.length>3)latest.pop();}
    });
    return latest.map(miniCard);
  }
  function miniToken(){var p=C.state.current.pendingReveal;return p?'reserved:'+p.committedAt+':'+p.choice+':'+p.cards.map(function(i){return i.instanceId;}).join(','):'idle:'+C.state.current.serialCounter;}
  function miniCard(item){var card=C.card(item.cardId),rarity=C.rarity(card.rarity),variant=item.variantId&&C.variant(item.variantId);return {id:item.instanceId||card.id,name:card.name,rarity:rarity.name,tier:rarity.tier,serial:item.serial||'',variant:variant?variant.name:'',art:card.art.kind==='image'?card.art.src.replace(/\.webp$/,'-thumb.webp'):null};}
  function nativeCall(promise) { return promise.catch(function (error) { root.console.warn('Desktop QoL unavailable:',error.message); }); }
  function toast(text,action) { return C.ui.toast(text,action); }
  function batteryPolicy() { var active=battery&&C.settings.get('batterySaver')==='auto',before=C.settings.batterySaving;C.settings.setBatterySaver(active);if(active&&!before)toast('Battery saver · effects reduced temporarily'); }
  function syncPack() {
    if(!C.native||!booted)return; var next=C.packs.upcoming(1)[0]; if(!next)return;
    var value={packId:next.id,ready:C.state.current.packs.ready,progress:C.timers.progress(),countdown:C.timers.format(C.timers.remaining()),quality:C.settings.get('quality'),reduced:C.motion.reduced,canMini:C.opening.phase==='idle'&&!C.inventory.active&&!C.preferences.open&&!C.tutorial.active&&!studioActive&&!C.studioAlbumUI?.active&&!C.dev?.immersive&&!C.commands?.active&&!C.friendly?.active&&!C.contextMenu.open&&!C.patchNotes?.open&&!C.ui?.modal};
    value.keyBindings={};['menu.mini','opening.hold','global.settings'].forEach(function(id){value.keyBindings[id]=C.keys.bindings(id);});value.rarityColor=C.settings.get('rarityColor');value.graphics={};C.settingsSchema.graphicsKeys.forEach(function(key){value.graphics[key]=C.settings.get(key);});
    value.keyBindings['opening.keep']=C.keys.bindings('opening.keep');
    var reserved=C.state.current.pendingReveal;
    value.token=miniToken();value.capacity=C.config.packs.maxStored;value.credits=C.state.current.currency;
    value.remainingMs=Math.ceil(C.timers.remaining());
    value.nextPackName=next.name;value.miniFps=C.settings.get('miniFps');value.miniSide=C.settings.get('miniSide');
    value.accent=C.data.accentColors[C.settings.get('accentColor')]?.[0]||'#ADC4FF';
    value.reveal=reserved?{packName:C.pack(reserved.packId).name,choices:!!reserved.options&&reserved.choice==null,cards:(reserved.options&&reserved.choice==null?reserved.options:reserved.cards.slice(reserved.keptCount||0)).map(miniCard)}:null;
    if(!recent)recent=recentCards();
    value.recent=recent;
    var signature=JSON.stringify(value);if(signature===lastPack)return;
    lastPack=signature;
    nativeCall(C.native.window.setPack(value).then(function(ok){if(!ok&&lastPack===signature)lastPack=null;},function(error){if(lastPack===signature)lastPack=null;throw error;}));
  }
  function syncAwake() { var value=studioActive||C.opening&&C.opening.phase==='rarityIntro';value=!!value&&!root.document.hidden&&(!nativeState||nativeState.visible);if(value===awake)return;awake=value;nativeCall(C.native.window.setAwake(value)); }
  function runtime(state) { var wasMini=nativeState&&nativeState.mini;nativeState=state;battery=state.onBattery;C.events.emit('desktop:visibility',state.visible);batteryPolicy();syncAwake();if(wasMini&&!state.mini&&state.visible)root.requestAnimationFrame(function(){C.opening.resumeMini();}); }
  function preferences() { nativeCall(C.native.window.setPreferences({miniSide:C.settings.get('miniSide'),miniFps:C.settings.get('miniFps'),notifyPackReady:C.settings.get('notifyPackReady'),taskbarProgress:C.settings.get('taskbarProgress'),alwaysOnTop:C.settings.get('alwaysOnTop')})); }
  function command(action) {
    if(action&&typeof action==='object'){
      if(action.type!=='mini-action'&&action.type!=='mini-configure')return;
      var ok=false,message='This action is unavailable. Expand Cardable to continue.';
      try{
        if(nativeState&&nativeState.mini){
          if(action.type==='mini-configure'){
            if(action.side==='left'||action.side==='right')C.settings.set('miniSide',action.side);
            if(action.fps===30||action.fps===60)C.settings.set('miniFps',action.fps);
            ok=C.settings.saved;
          }else if(action.token===miniToken())ok=C.opening.miniAction(action.choice)==true;
        }
        if(!ok&&C.state.lastError)message='Could not save. Your pack and reserved cards are preserved. Retry or expand to Settings → Data.';
      }catch(error){root.console.error('Mini action failed:',error);message='Could not complete this action. Your reserved cards are preserved.';}
      recent=null;syncPack();nativeCall(C.native.window.completeMiniAction({id:action.id,ok:ok,message:ok?'':message}));return;
    }
    if(action==='reset-controls'){C.controlOptions.reset();C.preferences.show(null,true);return;}if(action.indexOf('scale-')===0){C.qol.adjustScale(action);return;}if(action==='inventory')C.inventory.request(true);else if(action==='settings')C.preferences.show();else if(action==='saves')nativeCall(C.native.storage.openSaveDir());else if(action==='open-pack'){root.requestAnimationFrame(function(){if(C.opening.phase==='idle'&&!root.document.hidden)C.input.chargeStart();});}
  }
  C.keybindings = { entries:bindings, label:function(key){var item=bindings.get(key);return C.keys.label(key);}, tooltip:function(key,label){var text=C.keys.label(key);return label+(text?' · '+text:'');}, register:function(item){if(bindings.has(item.binding))throw new Error('Duplicate keybinding: '+item.binding);bindings.set(item.binding,item);return item;} };
  C.qol = {
    toast:toast,
    get fullscreen(){return !!nativeState&&nativeState.fullscreen;},
    // Shared with the existing developer palette; no second matcher.
    fuzzyScore:function(query,text){query=query.toLowerCase().replace(/\s/g,'');text=text.toLowerCase();if(!query)return 1;var index=-1,value=0;for(var i=0;i<query.length;i++){var next=text.indexOf(query[i],index+1);if(next<0)return 0;value+=next===index+1?5:1;index=next;}return value+100/(1+text.length);},
    awaySummary:function(last,now,ready,started,interval,cap){var elapsed=Math.max(0,now-last),gained=started==null?0:Math.max(0,Math.floor((now-started)/interval));return {elapsedMs:elapsed,ready:Math.min(cap,ready+gained)};},
    adjustScale:function(action){var choices=Array.from({length:17},function(_,i){return String(70+i*5);}),value=C.settings.get('interfaceSize'),index=value==='auto'?6:choices.indexOf(value);C.settings.set('interfaceSize',action==='scale-reset'?'auto':choices[Math.max(0,Math.min(choices.length-1,index+(action==='scale-up'?1:-1)))]);},
    init:function(){
      [['Mod+Plus','scale-up'],['Mod+Minus','scale-down'],['Mod+0','scale-reset']].forEach(function(pair){C.keybindings.register({binding:pair[0],label:'Interface size',run:function(){C.qol.adjustScale(pair[1]);}});});
      if(!C.native)return;
      C.keybindings.register({binding:'Mod+M',label:'Mini mode',run:function(){return C.native.window.toggleMini();}});
      C.native.window.onCommand(command);
      C.events.on('app:ready',function(){
        booted=true;C.native.window.onRuntimeState(runtime);nativeCall(C.native.window.getRuntimeState().then(runtime));
        C.settings.onChange('batterySaver',batteryPolicy);['miniSide','miniFps','taskbarProgress','alwaysOnTop','notifyPackReady'].forEach(function(key){C.settings.onChange(key,preferences);});preferences();
        C.events.on('save:written',function(){recent=null;syncPack();});
        ['timer:tick','pack:ready','pack:opened','packs:queueChanged','save:replaced','opening:context','inventory:context','preferences:context','tutorial:context','studio:albumContext','qol:context'].forEach(function(name){C.events.on(name,function(){syncPack();syncAwake();});});
        C.events.on('studio:enter',function(){studioActive=true;syncPack();syncAwake();});C.events.on('studio:exit',function(){studioActive=false;syncPack();syncAwake();});
        C.events.on('settings:changed',syncPack);C.events.on('motion:changed',syncPack);root.document.addEventListener('visibilitychange',syncAwake);syncPack();
        C.contextMenu.register({target:'empty',build:function(){return [{type:'separator'},{id:'always-on-top',type:'toggle',label:'Always on top',icon:'quality',checked:C.settings.get('alwaysOnTop'),run:function(){C.settings.set('alwaysOnTop',!C.settings.get('alwaysOnTop'));}},{id:'mini-mode',type:'action',label:'Mini mode',icon:'quality',shortcut:C.keys.label('menu.mini'),run:function(){nativeCall(C.native.window.toggleMini());}}].filter(function(item){return item.id!=='mini-mode'||C.settings.get('visibleMini');});}});
      });
    }
  };
})(window.Cardable,window);
