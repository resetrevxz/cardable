(function (C, root) {
  'use strict';
  var bindings = new Map();
  var battery = false, notice, noticeTimer, awake = false, studioActive = false, booted = false, nativeState = null;
  function nativeCall(promise) { return promise.catch(function (error) { root.console.warn('Desktop QoL unavailable:',error.message); }); }
  function toast(text) { if (!notice) { notice=C.packMarkup.node('aside','qol-notice glass',root.document.body);notice.setAttribute('role','status'); } notice.textContent=text;notice.hidden=false;root.clearTimeout(noticeTimer);noticeTimer=root.setTimeout(function(){notice.hidden=true;},4000); }
  function batteryPolicy() { var active=battery&&C.settings.get('batterySaver')==='auto',before=C.settings.batterySaving;C.settings.setBatterySaver(active);if(active&&!before)toast('Battery saver · effects reduced temporarily'); }
  function syncPack() { if(!C.native||!booted)return; var next=C.packs.upcoming(1)[0]; if(!next)return;nativeCall(C.native.window.setPack({packId:next.id,ready:C.state.current.packs.ready,progress:C.timers.progress(),countdown:C.timers.format(C.timers.remaining()),quality:C.settings.get('quality'),reduced:C.motion.reduced,canMini:C.opening.phase==='idle'&&!C.inventory.active&&!C.preferences.open&&!C.tutorial.active&&!studioActive&&!C.studioAlbumUI?.active&&!C.dev?.immersive})); }
  function syncAwake() { var value=studioActive||C.opening&&C.opening.phase==='rarityIntro';value=!!value&&!root.document.hidden&&(!nativeState||nativeState.visible);if(value===awake)return;awake=value;nativeCall(C.native.window.setAwake(value)); }
  function runtime(state) { nativeState=state;battery=state.onBattery;C.events.emit('desktop:visibility',state.visible);batteryPolicy();syncAwake(); }
  function preferences() { nativeCall(C.native.window.setPreferences({taskbarProgress:C.settings.get('taskbarProgress'),alwaysOnTop:C.settings.get('alwaysOnTop')})); }
  function command(action) { if(action.indexOf('scale-')===0){C.qol.adjustScale(action);return;}if(action==='inventory')C.inventory.request(true);else if(action==='settings')C.preferences.show();else if(action==='saves')nativeCall(C.native.storage.openSaveDir());else if(action==='open-pack'){root.requestAnimationFrame(function(){if(C.opening.phase==='idle'&&!root.document.hidden)C.input.chargeStart();});} }
  C.keybindings = { entries:bindings, register:function(item){if(bindings.has(item.binding))throw new Error('Duplicate keybinding: '+item.binding);bindings.set(item.binding,item);return item;} };
  C.qol = {
    get fullscreen(){return !!nativeState&&nativeState.fullscreen;},
    // Shared with the existing developer palette; no second matcher.
    fuzzyScore:function(query,text){query=query.toLowerCase().replace(/\s/g,'');text=text.toLowerCase();if(!query)return 1;var index=-1,value=0;for(var i=0;i<query.length;i++){var next=text.indexOf(query[i],index+1);if(next<0)return 0;value+=next===index+1?5:1;index=next;}return value+100/(1+text.length);},
    awaySummary:function(last,now,ready,started,interval,cap){var elapsed=Math.max(0,now-last),gained=started==null?0:Math.max(0,Math.floor((now-started)/interval));return {elapsedMs:elapsed,ready:Math.min(cap,ready+gained)};},
    adjustScale:function(action){var choices=['90','100','110','125','150'],value=C.settings.get('interfaceSize'),index=value==='auto'?1:choices.indexOf(value);C.settings.set('interfaceSize',action==='scale-reset'?'auto':choices[Math.max(0,Math.min(choices.length-1,index+(action==='scale-up'?1:-1)))]);},
    init:function(){
      [['Mod+Plus','scale-up'],['Mod+Minus','scale-down'],['Mod+0','scale-reset']].forEach(function(pair){C.keybindings.register({binding:pair[0],label:'Interface size',run:function(){C.qol.adjustScale(pair[1]);}});});
      if(!C.native)return;
      C.keybindings.register({binding:'Mod+M',label:'Mini mode',run:function(){return C.native.window.toggleMini();}});
      C.native.window.onCommand(command);
      C.events.on('app:ready',function(){
        booted=true;C.native.window.onRuntimeState(runtime);nativeCall(C.native.window.getRuntimeState().then(runtime));
        C.settings.onChange('batterySaver',batteryPolicy);['taskbarProgress','alwaysOnTop'].forEach(function(key){C.settings.onChange(key,preferences);});preferences();
        ['timer:tick','pack:ready','pack:opened','packs:queueChanged','save:replaced','opening:context','inventory:context','preferences:context','tutorial:context','studio:albumContext'].forEach(function(name){C.events.on(name,function(){syncPack();syncAwake();});});
        C.events.on('studio:enter',function(){studioActive=true;syncPack();syncAwake();});C.events.on('studio:exit',function(){studioActive=false;syncPack();syncAwake();});
        C.events.on('settings:changed',syncPack);C.events.on('motion:changed',syncPack);root.document.addEventListener('visibilitychange',syncAwake);syncPack();
        C.contextMenu.register({target:'empty',build:function(){return [{type:'separator'},{id:'always-on-top',type:'toggle',label:'Always on top',icon:'quality',checked:C.settings.get('alwaysOnTop'),run:function(){C.settings.set('alwaysOnTop',!C.settings.get('alwaysOnTop'));}},{id:'mini-mode',type:'action',label:'Mini mode',icon:'quality',shortcut:'Ctrl/Cmd+M',run:function(){nativeCall(C.native.window.toggleMini());}}];}});
      });
    }
  };
})(window.Cardable,window);
