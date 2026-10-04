(function (C, root) {
  'use strict';
  var loading = null, busy = false, scripts=new Map(),reopening=null;
  function files(paths){return paths.reduce(function(chain,file){return chain.then(function(){if(scripts.has(file))return scripts.get(file);var pending=new Promise(function(resolve,reject){var script=root.document.createElement('script');script.src=file;script.async=false;script.onload=resolve;script.onerror=function(){script.remove();scripts.delete(file);reject(new Error('The studio could not load. Restore its local files.'));};root.document.head.appendChild(script);});scripts.set(file,pending);return pending;});},Promise.resolve());}
  function loadAlbum(){return files(['src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js']);}
  function load() {
    if(C.studioController)return Promise.resolve();if(loading)return loading;
    loading=files(['assets/art-data/manifest.js','src/studio/art-data.js','src/studio/camera.js','src/studio/lights.js','src/studio/presets.js','src/studio/card-face.js','src/studio/props.js','src/studio/renderer.js','src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js','src/studio/ui/panels.js','src/studio/ui/gizmos.js','src/studio/ui/scenes.js','src/studio/ui/photo.js','src/studio/studio.js']).catch(function(error){loading=null;throw error;});return loading;
  }
  function reopen(photo){
    if(reopening||busy)return Promise.resolve(false);
    if(!C.state.current.inventory.some(function(i){return i.instanceId===photo.instanceId&&i.cardId===photo.cardId;})){report('The serial in this photo is no longer owned.');return Promise.resolve(false);}
    if(C.studio.active&&C.studioController.instanceId===photo.instanceId)return Promise.resolve(C.studioController.loadPhoto(photo.sceneJson));
    return new Promise(function(resolve){
      var pending=reopening={off:[],stage:'start'};
      function finish(result){if(reopening!==pending)return;reopening=null;pending.off.forEach(function(off){off();});resolve(result);}
      function enter(){
        if(reopening!==pending)return;
        pending.stage='select';
        var ok=C.detail.selectInstance(photo.instanceId,function(){if(reopening!==pending)return;pending.stage='enter';C.studio.enter({sceneJson:photo.sceneJson}).then(finish);});
        if(!ok){report('The saved serial could not be selected.');finish(false);}
      }
      function show(){
        if(reopening!==pending)return;pending.stage='lifting';
        var off=C.events.on('detail:opened',function(id){if(id===photo.cardId){off();enter();}else finish(false);});pending.off.push(off);
        C.events.emit('inventory:showCard',{cardId:photo.cardId,instanceId:photo.instanceId});
      }
      function detail(){
        if(C.detail.phase==='detail'&&C.detail.view&&C.detail.view.card.id===photo.cardId)return enter();
        if(C.detail.phase==='closed')return show();
        pending.stage='returning';var off=C.events.on('inventory:detailReturned',function(){off();root.queueMicrotask(show);});pending.off.push(off);C.events.emit('detail:requestClose');
      }
      pending.off.push(C.events.on('save:willReplace',function(){finish(false);}),C.events.on('detail:reset',function(){finish(false);}),C.events.on('inventory:detailContext',function(e){if(!e.active&&(pending.stage==='lifting'||pending.stage==='select'))finish(false);}));
      if(C.studio.active){pending.stage='exit';var off=C.events.on('studio:exit',function(){off();root.queueMicrotask(detail);});pending.off.push(off);C.studio.exit();}else detail();
    });
  }
  function report(message) { var panel = C.detail && C.detail.panel; if (!panel) return; var notice = panel.querySelector('.studio-entry-notice'); if (!notice) { notice = root.document.createElement('p'); notice.className = 'studio-entry-notice'; notice.setAttribute('role', 'status'); panel.appendChild(notice); } notice.textContent = message; }
  C.studio = {
    get active() { return !!(C.studioController && C.studioController.active); },
    get pending() { return busy || !!reopening; },
    enter: async function (context) { if (busy || this.active || !C.detail || C.detail.phase !== 'detail' || !C.detail.view || C.preferences.open) return false; busy = true; var selected = C.detail.view;
      try { await load(); if (C.detail.view !== selected || C.detail.phase !== 'detail') return false; return await C.studioController.enter(context || {}, selected); } catch (error) { report(error.message); return false; } finally { busy = false; }
    },
    openAlbum:async function(id){try{await loadAlbum();await C.studioAlbumUI.open(id);}catch(error){report(error.message);if(C.contextMenu)C.contextMenu.notify(error.message);}},
    reopenPhoto:async function(photo){try{await load();return await reopen(photo);}catch(error){report(error.message);return false;}},
    exit: function () { if (C.studioController) C.studioController.exit(); }
  };
  C.inventoryTabs.register('studio-album',function(host){var button=root.document.createElement('button');button.type='button';button.className='inventory-menu-option';button.textContent='Photo album';button.addEventListener('click',function(){C.studio.openAlbum();});host.appendChild(button);});
  C.contextMenu.register({target:'empty',build:function(){return [{id:'studio-album',type:'action',label:'Photo album',icon:'inventory',run:function(){C.studio.openAlbum();}}];}});
  C.detailActions.register('studio', function (host, context) { if (!context.entry.owned) return; var button = root.document.createElement('button'); button.type = 'button'; button.className = 'studio-inspect-action'; button.title = 'Inspect this instance · E'; button.setAttribute('aria-label', 'Inspect card in studio');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v13H4ZM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/></svg><span>Inspect</span>'; button.addEventListener('click', function () { C.studio.enter(context); }); host.appendChild(button);
  });
  root.document.addEventListener('keydown', function (event) { if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || String(event.key).toLowerCase() !== 'e' || C.studio.active || busy || C.detail.phase !== 'detail' || !C.detail.view || !C.detail.view.instance.serial || event.target.closest && event.target.closest('input,select,textarea,[contenteditable],[data-tool-surface]')) return; event.preventDefault(); C.studio.enter(); });
  C.events.on('app:ready', function () {
    if (!C.dev) return;
    C.dev.checkStudio = async function () {
      var at = root.performance.now(), cases = [], pending = [];
      function require(ok, label) { if (!ok) throw new Error('Studio: ' + label); cases.push(label); }
      var scene = C.studioScenes.defaults();scene.props=[C.studioScenes.prop({type:'neon-tube',text:'STUDIO',scale:[.5,2,1],material:'emissive'})]; require(JSON.stringify(C.studioScenes.parse(C.studioScenes.serialize(scene))) === JSON.stringify(C.studioScenes.parse(scene)), 'scene JSON round-trip');
      scene.lights = Array.from({ length: 20 }, function () { return scene.lights[0]; }); scene.props = Array.from({ length: 60 }, function (_, i) { return C.studioScenes.prop({id:'p'+i,type:'fan'}); });
      require(C.studioScenes.parse(scene).lights.length === 8 && ['high', 'medium', 'low', 'very-low'].every(function (tier) { var effective = C.studioScenes.effective(scene, tier), limits = C.studioScenes.limits(tier); return effective.lights.length <= limits.lights && effective.props.length <= limits.props; }), 'light and prop budget clamps');
      var first = C.studioScenes.defaults(), history = C.studioScenes.history(first), second = C.studioScenes.clone(first); second.props = [C.studioScenes.prop({type:'glass-case',position:[1,2,3],scale:[2,1,.5],locked:true})]; second.camera.roll = .4; second.lights[0].color = [.2, .7, 1]; history.begin(first); history.commit(second);
      require(C.studioScenes.serialize(history.undo()) === C.studioScenes.serialize(first) && C.studioScenes.serialize(history.redo()) === C.studioScenes.serialize(second), 'undo/redo restores state');
      for (var i = 0; i < 60; i++) { second.camera.distance = 2 + i / 100; history.commit(second); } require(history.steps === 50, '50-step history bound');
      await load();
      var source=root.document.createElement('canvas');source.width=32;source.height=24;source.getContext('2d').fillRect(0,0,32,24);var image=C.studioPhoto.frame(source,{w:96,h:64,frame:'polaroid',caption:'Check',watermark:false},{}),blob,decoded;
      try{blob=await C.studioPhoto.encode(image,'image/png',1);decoded=await root.createImageBitmap(blob);require(decoded.width===96&&decoded.height===64,'photo pixel dimensions match request');}finally{if(decoded)decoded.close();source.width=source.height=image.width=image.height=1;}
      var recovered=await C.studioAlbum.probe(blob),expected=new Uint8Array(await blob.arrayBuffer()),actual=new Uint8Array(await recovered.arrayBuffer());require(recovered instanceof root.Blob&&recovered.type===blob.type&&recovered.size===blob.size&&expected.every(function(byte,index){return byte===actual[index];}),'album blob round-trip');
      require(root.performance.now() - at < 2000, 'under two seconds'); var result = { milestone: 'D', passed: cases, pending: pending, elapsedMs:Math.round(root.performance.now()-at) }; root.console.info('checkStudio', result); return result;
    };
    C.dev.register({ id: 'studio.check', group: 'Studio', label: 'Check Studio', type: 'button', helper: 'One explicit small check: scene, history, limits, photo pixels and album blob.', run: function () { return C.dev.checkStudio(); } });
  });
})(window.Cardable, window);
