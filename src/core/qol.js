(function (C, root) {
  'use strict';
  var bindings = new Map();
  C.keybindings = { entries:bindings, register:function(item){if(bindings.has(item.binding))throw new Error('Duplicate keybinding: '+item.binding);bindings.set(item.binding,item);return item;} };
  C.qol = {
    // Shared with the existing developer palette; no second matcher.
    fuzzyScore:function(query,text){query=query.toLowerCase().replace(/\s/g,'');text=text.toLowerCase();if(!query)return 1;var index=-1,value=0;for(var i=0;i<query.length;i++){var next=text.indexOf(query[i],index+1);if(next<0)return 0;value+=next===index+1?5:1;index=next;}return value+100/(1+text.length);},
    awaySummary:function(last,now,ready,started,interval,cap){var elapsed=Math.max(0,now-last),gained=started==null?0:Math.max(0,Math.floor((now-started)/interval));return {elapsedMs:elapsed,ready:Math.min(cap,ready+gained)};},
    adjustScale:function(action){var choices=['90','100','110','125','150'],value=C.settings.get('interfaceSize'),index=value==='auto'?1:choices.indexOf(value);C.settings.set('interfaceSize',action==='scale-reset'?'auto':choices[Math.max(0,Math.min(choices.length-1,index+(action==='scale-up'?1:-1)))]);},
    init:function(){
      [['Mod+Plus','scale-up'],['Mod+Minus','scale-down'],['Mod+0','scale-reset']].forEach(function(pair){C.keybindings.register({binding:pair[0],label:'Interface size',run:function(){C.qol.adjustScale(pair[1]);}});});
      if(C.native)C.native.window.onCommand(function(action){if(action.indexOf('scale-')===0)C.qol.adjustScale(action);});
    }
  };
})(window.Cardable,window);
