(function(C){
  'use strict';
  var forced='',pack=C.data.packs.find(C.picker.isChoicePack);
  C.events.on('opening:resolve',function(request){if(C.picker.isChoicePack(request.pack)&&forced)request.options.forcedCards=forced.split(',').map(function(id){return id.trim();});});
  C.events.on('opening:committed',function(event){if(C.picker.isChoicePack(event.pack))forced='';});
  C.dev.startups.push(function(){
    C.dev.register({id:'picker.options',group:'Packs',label:'Force three Picker options',type:'input',helper:'Comma-separated catalog IDs. Distinct and pool-safe; guarantee still applies. Clears only after commit.',get:function(){return forced;},set:function(v){var ids=v.trim()?v.split(',').map(function(id){return id.trim();}):[];if(ids.length&& (ids.length!==3||new Set(ids).size!==3||ids.some(function(id){return !C.card(id);})))throw new Error('Enter three distinct catalog IDs');forced=v.trim();}});
    C.dev.register({id:'picker.guarantee',group:'Packs',label:'Picker minimum guaranteed tier',type:'input',inputType:'number',min:0,max:11,step:1,helper:'Session data tuning. Finish the active offer before editing.',get:function(){return pack.guarantees[0].minTier;},set:function(v){if(C.opening.phase!=='idle')throw new Error('Finish the current opening');pack.guarantees[0].minTier=Math.max(0,Math.min(11,Math.round(Number(v)||0)));}});
    C.dev.register({id:'picker.replay',group:'Packs',label:'Replay reserved pick screen',type:'button',helper:'Presentation only. Requires an unresolved saved offer; no new draw, reward or serial.',available:function(){var p=C.state.current&&C.state.current.pendingReveal;return !!p&&!!p.options&&p.choice===null;},run:function(){C.events.emit('save:imported');}});
  });
})(window.Cardable);
