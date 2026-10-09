(function (C) {
  'use strict';
  function add(key,label,helper,value,choices,control) {
    C.settingsSchema.entries[key] = { key:key,label:label,helper:helper,group:'Desktop',defaultValue:value,choices:choices,control:control || 'switch',apply:function(value,api){api.attribute(this.key,value);} };
  }
  add('interfaceSize','Interface size','Auto fits the 1920 × 1080 composition. Shortcuts: Ctrl/Cmd +, −, 0.','auto',['auto','90','100','110','125','150'],'select');
  C.settingsSchema.entries.interfaceSize.format=function(value){return value === 'auto' ? 'Auto' : value + ' %';};
  add('aspectLock','Lock window to 16:9','Keeps the desktop window at the design aspect ratio.',false);
  add('batterySaver','Battery saver','Auto temporarily lowers effects one tier on battery; your saved choices stay unchanged.','auto',['off','auto'],'select');
  add('alwaysOnTop','Always on top','Keeps Cardable above other windows.',false);
  add('taskbarProgress','Taskbar progress','Shows next-pack progress and a full bar when a pack is ready.',true);
  add('focusModeDefault','Focus mode on launch','Keep only the pack and counter visible. H brings the interface back.',false);
  C.settingsSchema.entries.restartUpdatesWhenIdle = {key:'restartUpdatesWhenIdle',label:'Restart for updates when idle',helper:'After a background download, show a 15-second restart notice when the menu is idle. Later postpones this session.',group:'About',defaultValue:true,nativeOnly:true,control:'switch',apply:function(value,api){api.attribute(this.key,value);}};
})(window.Cardable);
