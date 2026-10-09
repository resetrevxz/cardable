(function(C,root){
  'use strict';
  var D=C.dev,key=C.config.storage.key,legacyKey=key+'.dev-session-backup',prepared=null,previous=null,done=false,issue=null;
  function open(){return new Promise(function(resolve,reject){
    var blocked=false,request=root.indexedDB.open('cardable-developer-backups',1);
    request.onupgradeneeded=function(){request.result.createObjectStore('sessions');};
    request.onsuccess=function(){if(blocked){request.result.close();return;}request.result.onversionchange=function(){request.result.close();};resolve(request.result);};request.onerror=function(){reject(request.error);};
    request.onblocked=function(){blocked=true;reject(new Error('Close other Cardable tabs to prepare the developer backup.'));};
  });}
  function read(db){return new Promise(function(resolve,reject){
    var tx=db.transaction('sessions','readonly'),request=tx.objectStore('sessions').get(key),value;
    request.onsuccess=function(){value=request.result;};tx.oncomplete=function(){resolve(value||null);};tx.onabort=function(){reject(tx.error||new Error('Developer backup read failed.'));};
  });}
  function write(db,value){return new Promise(function(resolve,reject){
    var tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put(value,key);
    tx.oncomplete=function(){resolve();};tx.onabort=function(){reject(tx.error||new Error('Developer backup write failed.'));};
  });}
  function legacy(raw){try{var value=JSON.parse(raw);return value&&value.save?value:null;}catch(_){return null;}}
  D.prepareBackup=async function(){
    var db,raw=null;
    try{
      if(C.state.recovery&&C.state.recovery.pending)throw new Error('Resolve save recovery before editing real progress.');
      try{raw=root.localStorage.getItem(legacyKey);}catch(_){}
      db=await open();var saved=await read(db),value;
      if(D.sandbox){var real=root.localStorage.getItem(key);value=real?{at:Date.now(),save:JSON.parse(real)}:null;}
      else value={at:Date.now(),save:JSON.parse(C.state.encode(C.state.current))};
      previous=saved&&saved.current||legacy(raw);
      if(previous&&value&&JSON.stringify(previous.save)===JSON.stringify(value.save))previous=saved&&saved.previous||legacy(raw);
      // Keep the preceding session and the exact legacy bytes. Only the known
      // developer backup key is migrated; primary/recovery/photo data stays put.
      var earlierLegacy=saved&&saved.earlierLegacy||[];
      if(raw&&saved&&saved.legacy&&saved.legacy!==raw&&earlierLegacy.indexOf(saved.legacy)<0)earlierLegacy.push(saved.legacy);
      var record={current:value,previous:previous,legacy:raw||saved&&saved.legacy||null,earlierLegacy:earlierLegacy};
      await write(db,record);var verified=await read(db);
      if(JSON.stringify(verified)!==JSON.stringify(record))throw new Error('Developer backup verification failed.');
      prepared=value;issue=null;
      if(raw&&verified.legacy===raw){try{if(root.localStorage.getItem(legacyKey)===raw)root.localStorage.removeItem(legacyKey);}catch(_){} }
    }catch(error){issue=error;root.console.warn('Cardable developer backup store unavailable:',error);}
    finally{if(db)db.close();}
  };
  D.backup=function(){
    if(D.sandbox||done)return;
    if(C.state.recovery&&C.state.recovery.pending)throw new Error('Resolve save recovery before editing real progress.');
    if(prepared){done=true;return;}
    // Browsers without IndexedDB retain the original durable local backup.
    // A failed backup still blocks real edits and opening preparation.
    try{var raw=root.localStorage.getItem(key),value={at:Date.now(),save:raw?JSON.parse(raw):D.clone(C.state.current)};D.write(legacyKey,value);prepared=value;done=true;}
    catch(error){if(issue)error.backupStoreError=issue.message;throw error;}
  };
  D.getSessionBackup=function(prior){return prior?previous:prepared||D.read(legacyKey,null);};
})(window.Cardable,window);
