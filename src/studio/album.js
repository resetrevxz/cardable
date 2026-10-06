(function(C,root){
  'use strict';
  var opening=null,db=null,users=0;
  function open(){
    if(db)return Promise.resolve(db);if(opening)return opening;
    opening=new Promise(function(resolve,reject){
      if(!root.indexedDB)return reject(new Error('Photo storage is unavailable. Download your photos to keep them.'));
      var request,abandoned=false;try{request=root.indexedDB.open('cardable-studio',1);}catch(error){reject(error);return;}
      request.onupgradeneeded=function(){if(abandoned){request.transaction.abort();return;}var data=request.result;if(!data.objectStoreNames.contains('photos')){var store=data.createObjectStore('photos',{keyPath:'id'});store.createIndex('createdAt','createdAt');}if(!data.objectStoreNames.contains('checks'))data.createObjectStore('checks',{keyPath:'id'});};
      request.onerror=function(){abandoned=true;reject(new Error('Photo storage is unavailable. Download your photos to keep them.'));};
      request.onblocked=function(){abandoned=true;reject(new Error('Photo storage is busy in another game window. Download your photo or close that window.'));};
      request.onsuccess=function(){var connection=request.result;if(abandoned){connection.close();return;}db=connection;connection.onversionchange=function(){connection.close();if(db===connection)db=null;};resolve(connection);};
    }).finally(function(){opening=null;});return opening;
  }
  async function operation(storeName,mode,run,signal){
    users++;try{var data=await open();return await new Promise(function(resolve,reject){
      if(signal&&signal.aborted)return reject(new Error('Capture cancelled.'));var tx=data.transaction(storeName,mode),store=tx.objectStore(storeName),result,error;function abort(){error=new Error('Capture cancelled.');try{tx.abort();}catch(_){}}function detach(){if(signal)signal.removeEventListener('abort',abort);}if(signal)signal.addEventListener('abort',abort,{once:true});
      tx.oncomplete=function(){detach();resolve(result);};tx.onabort=tx.onerror=function(){detach();reject(error||tx.error||new Error('Photo storage failed. Download your photo to keep it.'));};
      try{run(store,function(value){result=value;},function(reason){error=reason;tx.abort();});}catch(reason){error=reason;tx.abort();}
    });}finally{users--;if(!users&&db){db.close();db=null;}}
  }
  function metadata(photo){var out={};Object.keys(photo).forEach(function(key){if(key!=='blob')out[key]=photo[key];});out.bytes=(photo.blob instanceof root.Blob?photo.blob.size:0)+(photo.thumb instanceof root.Blob?photo.thumb.size:0);out.thumb=photo.thumb instanceof root.Blob?photo.thumb:photo.blob instanceof root.Blob?photo.blob:null;return out;}
  C.studioAlbum={
    limit:100,
    list:function(){return operation('photos','readonly',function(store,set){var result=[],req=store.index('createdAt').openCursor(null,'prev');req.onsuccess=function(){var cursor=req.result;if(cursor){result.push(metadata(cursor.value));cursor.continue();}else set(result);};});},
    get:function(id){return operation('photos','readonly',function(store,set){var req=store.get(id);req.onsuccess=function(){set(req.result||null);};});},
    save:function(photo,alive,signal){return operation('photos','readwrite',function(store,set,fail){var count=store.count();count.onsuccess=function(){if(alive&&!alive())return fail(new Error('Capture cancelled.'));if(count.result>=100)return fail(new Error('Album full: 100 photos. Download this photo or delete one to make room.'));store.add(photo);set(photo.id);};},signal);},
    rename:function(id,name){return operation('photos','readwrite',function(store,set){var req=store.get(id);req.onsuccess=function(){var photo=req.result;if(photo){photo.name=String(name||'Untitled photo').trim().slice(0,60);store.put(photo);}set(!!photo);};});},
    remove:function(id){return operation('photos','readwrite',function(store,set){store.delete(id);set(true);});},
    usage:async function(list){list=list||await this.list();var total=list.reduce(function(n,p){return n+p.bytes;},0),estimate=null;try{if(root.navigator.storage&&root.navigator.storage.estimate)estimate=await root.navigator.storage.estimate();}catch(_){}return {count:list.length,bytes:total,estimate:estimate};},
    probe:async function(blob){var id='logic-check';try{await operation('checks','readwrite',function(store){store.put({id:id,blob:blob});});var result=await operation('checks','readonly',function(store,set){var req=store.get(id);req.onsuccess=function(){set(req.result&&req.result.blob);};});return result;}finally{await operation('checks','readwrite',function(store){store.delete(id);});}}
  };
})(window.Cardable,window);
