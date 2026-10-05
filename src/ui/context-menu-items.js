(function (C, root) {
  'use strict';
  // Feature builders own their actions; the menu shell knows only the item schema.
  var confirmUntil = 0, copied = false;
  function separator() { return {type:'separator'}; }
  function readout(id,label,value) { return {id:id,type:'readout',label:label,value:value}; }
  function action(id,label,icon,run,extra) { return Object.assign({id:id,type:'action',label:label,icon:icon,run:run},extra||{}); }
  function inventory() { C.inventory.request(true); }
  function settings() { C.preferences.show(); }
  function credits() { if(C.preferences.show() || C.preferences.open){C.preferences.credits.hidden=false;C.accessibility.trap(C.preferences.credits);C.preferences.creditsClose.focus();} }
  function about() { return [readout('version','alpha '+C.config.version),action('licenses','Credits and licenses','info',credits)]; }
  function openPack() { return action('open-pack','Open pack','pack',function(){C.input.chargeStart();},{disabled:C.state.current.packs.ready<=0,hint:'Next pack in '+C.timers.format(C.timers.remaining(Date.now())),value:'3 s auto-charge'}); }
  function choice(key,label,icon,options) {
    return {id:'setting-'+key,type:'submenu',label:label,icon:icon,value:(options.find(function(o){return o[0]===C.settings.get(key);})||[null,C.settings.get(key)+' s'])[1],items:function(){return options.map(function(o){return {id:key+'-'+o[0],type:'radio',label:o[1],checked:C.settings.get(key)===o[0],run:function(){C.settings.set(key,o[0]);}};});}};
  }
  function toggle(key,label,icon) { return {id:'setting-'+key,type:'toggle',label:label,icon:icon,checked:!!C.settings.get(key),run:function(){C.settings.set(key,!C.settings.get(key));}}; }
  function quickSettings() {
    var items=[choice('quality','Effects quality','quality',[['high','High'],['medium','Medium'],['low','Low'],['very-low','Very Low']]),
      choice('dots','Dot grid','dots',[['on','On'],['subtle','Subtle'],['off','Off']]),toggle('cursorGlow','Cursor glow','cursor'),
      choice('motion','Reduced motion','motion',[['auto','Auto'],['on','On'],['off','Off']]),
      choice('idleFade','Idle fade','timer',[['2.5','2.5 s'],['5','5 s'],['never','Never']]),
      choice('rarityColor','Rarity color','color',[['color','Color'],['mono','Mono']])];
    if(C.config.flags.audio)items.push(toggle('muted','Mute','volume'));return items;
  }
  function view() { return [action('hide-interface','Hide interface','hide',function(){C.menu.hideInterface();}),
    {id:'fullscreen',type:'toggle',label:'Fullscreen',icon:'fullscreen',checked:!!root.document.fullscreenElement,
      disabled:!root.document.fullscreenEnabled,hint:'Unavailable in this window',run:function(){return root.document.fullscreenElement?root.document.exitFullscreen():root.document.documentElement.requestFullscreen();}}]; }
  function data() { return [action('export-save','Export save','export',function(){C.saveFiles.download(C.saveTools.exportText(),'cardable-save.json');}),action('replay-tutorial','Replay tutorial','replay',function(){C.saveTools.replay();})]; }
  function collection() { var model=C.collection.project(C.data.cards,C.state.current.inventory,'rarity');return action('collection','Cards '+model.owned+' / '+model.total+' - Variants '+model.variantCopies,'inventory',inventory); }
  C.contextMenu.register({target:'empty',build:function(){return [openPack(),action('inventory','Inventory','inventory',inventory,{shortcut:'I'}),action('settings','Settings','settings',settings,{shortcut:'S'}),separator(),
    {id:'quick-settings',type:'submenu',label:'Quick settings',icon:'settings',items:quickSettings},{id:'view',type:'submenu',label:'View',icon:'quality',items:view},separator(),collection(),
    {id:'data',type:'submenu',label:'Data',icon:'export',items:data},separator(),{id:'about',type:'submenu',label:'About',icon:'info',items:about}];}});
  C.contextMenu.register({target:'pack',build:function(ctx){return [openPack(),readout('pack-kind',ctx.pack.name,ctx.pack.cardsShown ? 'Choose '+ctx.pack.cardsKept+' of '+ctx.pack.cardsShown : ctx.pack.cardsPerPack+' card'+(ctx.pack.cardsPerPack===1?'':'s')+' per pack'),
    {id:'pack-info',type:'submenu',label:'Pack info',icon:'info',items:function(){var table=C.pull.probabilities(ctx.pack);return [{type:'group',label:ctx.pack.name},readout('pack-contents','Can contain'),separator()].concat(table.tiers.filter(function(t){return t.chance>0;}).map(function(t){return readout('tier-'+t.tier.id,t.tier.name);}));}}];}});
  function copyAmount() {
    var amount=String(C.state.current.currency),button=root.document.activeElement;
    function done(){copied=true;C.contextMenu.notify('Copied');C.contextMenu.refresh();root.setTimeout(function(){copied=false;C.contextMenu.refresh();},1200);}
    function fallback(){var field=root.document.createElement('textarea');field.value=amount;field.setAttribute('aria-label','Credits to copy');field.style.cssText='position:fixed;opacity:0;pointer-events:none';root.document.body.appendChild(field);field.select();var success=false;try{success=root.document.execCommand('copy');}finally{field.remove();if(button&&button.isConnected)button.focus({preventScroll:true});}if(!success)throw new Error('Copy unavailable in this window.');done();}
    if(root.navigator.clipboard&&root.navigator.clipboard.writeText)return root.navigator.clipboard.writeText(amount).then(done,fallback);fallback();
  }
  C.contextMenu.register({target:'currency',build:function(){return [action('copy-amount',copied?'Copied':'Copy amount',copied?'check':'copy',copyAmount,{keepOpen:true}),readout('credits','Credits',C.config.currency.symbol+Number(C.state.current.currency).toLocaleString())];}});
  C.contextMenu.register({target:'wordmark',build:function(){return [action('replay-logo','Replay logo animation','replay',function(){C.events.emit('logo:wave');}),{id:'about',type:'submenu',label:'About',icon:'info',items:about}];}});
  C.contextMenu.register({target:'gear',build:function(){var confirm=Date.now()<confirmUntil;return [action('settings','Open settings','settings',settings),action('restore-settings',confirm?'Click again to restore defaults':'Restore default settings','replay',function(){if(Date.now()<confirmUntil){confirmUntil=0;C.settings.resetToDefaults();C.contextMenu.close();}else{confirmUntil=Date.now()+5000;C.contextMenu.notify('Click again to confirm');root.setTimeout(C.contextMenu.refresh,5000);}},{keepOpen:true})];}});
})(window.Cardable,window);
