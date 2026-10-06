(function (C, root) {
  'use strict';
  var loading = null, busy = false, scripts=new Map(),reopening=null;
  function files(paths){return paths.reduce(function(chain,file){return chain.then(function(){if(scripts.has(file))return scripts.get(file);var pending=new Promise(function(resolve,reject){var script=root.document.createElement('script');script.src=file;script.async=false;script.onload=resolve;script.onerror=function(){script.remove();scripts.delete(file);reject(new Error('The studio could not load. Restore its local files.'));};root.document.head.appendChild(script);});scripts.set(file,pending);return pending;});},Promise.resolve());}
  function loadAlbum(){return files(['src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js']);}
  function load() {
    if(C.studioController)return Promise.resolve();if(loading)return loading;
    loading=files(['assets/art-data/manifest.js','src/studio/art-data.js','src/studio/camera.js','src/studio/lights.js','src/studio/presets.js','src/studio/materials.js','src/studio/card-face.js','src/studio/props.js','src/studio/renderer.js','src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js','src/studio/ui/panels.js','src/studio/ui/gizmos.js','src/studio/ui/scenes.js','src/studio/ui/photo.js','src/studio/director.js','src/studio/recording.js','src/studio/ui/director.js','src/studio/editing.js','src/studio/ui/workspace.js','src/studio/studio.js']).catch(function(error){loading=null;throw error;});return loading;
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
        var wanted=C.state.current.inventory.find(function(i){return i.instanceId===photo.instanceId;});
        if(wanted&&C.detail.phase==='detail'&&C.detail.view&&C.stacks.of(C.detail.view.instance)===C.stacks.of(wanted))return enter();
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
    C.dev.checkStudio2=async function(){
      await load();var at=root.performance.now(),passed=[];
      function require(ok,name){if(!ok)throw new Error('Studio 2: '+name);passed.push(name);}
      var old=C.studioScenes.defaults();old.version=1;delete old.groups;delete old.animation;old.props=[C.studioScenes.prop({id:'key',type:'fan'})];
      var migrated=C.studioScenes.parse(old),json=C.studioScenes.serialize(migrated);
      require(migrated.version===2&&C.studioScenes.serialize(C.studioScenes.parse(json))===json,'v1 migration and canonical v2 serialization');
      require(new Set(C.studioScenes.objects(migrated).map(function(o){return o.id;})).size===C.studioScenes.objects(migrated).length,'stable unique object IDs');
      var scene=C.studioScenes.parse(old),history=C.studioScenes.history(scene),states=[C.studioScenes.serialize(scene)];
      history.begin(scene,'Grouped camera drag');for(var i=0;i<12;i++)scene.camera.distance=2+i*.025;history.commit(scene);states.push(C.studioScenes.serialize(scene));
      history.begin(scene,'Grouped light scrub');for(i=0;i<10;i++)scene.lights[0].intensity=.7+i*.1;history.commit(scene);states.push(C.studioScenes.serialize(scene));
      history.execute(scene,'Add prop',function(s){s.props.push(C.studioScenes.prop({id:'check-prop',type:'plinth-square'}));});states.push(C.studioScenes.serialize(scene));
      require(history.steps===3&&states.slice(0,-1).reverse().every(function(s){return C.studioScenes.serialize(history.undo())===s;})&&states.slice(1).every(function(s){return C.studioScenes.serialize(history.redo())===s;}),'exact undo/redo with grouped gestures');
      require(C.studioScenes.serialize(history.jump(1))===states[1]&&C.studioScenes.serialize(history.jump(3))===states[3],'history jump restores exact state');
      for(i=0;i<105;i++){scene.camera.distance=3+i*.01;history.commit(scene,'Bound check');}require(history.entries.length===101&&history.steps===100,'100 command bound');
      ['linear','ease-in','ease-out','ease-in-out'].forEach(function(easing){['camera','light'].forEach(function(kind){var a=kind==='camera'?{distance:2}:{intensity:1},b=kind==='camera'?{distance:5}:{intensity:4},field=kind==='camera'?'distance':'intensity',frames=[{time:0,easing:easing},{time:1,easing:easing}];frames[0][kind]=a;frames[1][kind]=b;
        var values=Array.from({length:33},function(_,n){return C.studioDirector.pose(frames,n/32,kind,a)[field];});require(values[0]===a[field]&&values[32]===b[field]&&values.every(function(v,n){return n===0||v>=values[n-1];}),kind+' interpolation: '+easing);});});
      require([[.35,.1,.4],[-1.26,.1,-1.3],[22,15,15],[0,.1,0]].every(function(v){return C.studioScenes.snap(v[0],v[1])===v[2];}),'snapping round and negative values');
      var preset={id:'check',kind:'scene',name:'Foundation',version:1,scene:migrated},saved=C.studioPresets.serialize(preset);require(C.studioPresets.serialize(C.studioPresets.parse(saved))===saved,'preset serialization round-trip');
      var editScene=C.studioScenes.defaults(),editStates=[],editHistory=C.studioScenes.history(editScene),ed=C.studioEditing;editScene.props=[C.studioScenes.prop({id:'b-prop',type:'plinth-square',position:[1,-.4,0]})];editHistory=C.studioScenes.history(editScene);editStates.push(C.studioScenes.serialize(editScene));var groupId;
      editHistory.execute(editScene,'Group objects',function(s){groupId=ed.group(s,['card','b-prop']);});editStates.push(C.studioScenes.serialize(editScene));
      editHistory.begin(editScene,'Grouped transform drag');var originals=new Map(ed.members(editScene,[groupId]).map(function(o){return [o.id,C.studioScenes.clone(o)];}));for(i=0;i<20;i++)ed.transform(editScene,[groupId],originals,'move',[i*.025,.2,0],[1,0,0],[0,0,0]);editHistory.commit(editScene);editStates.push(C.studioScenes.serialize(editScene));
      editHistory.execute(editScene,'Duplicate group',function(s){ed.duplicate(s,[groupId],'high');});editStates.push(C.studioScenes.serialize(editScene));
      require(editStates.slice(0,-1).reverse().every(function(s){return C.studioScenes.serialize(editHistory.undo())===s;})&&editStates.slice(1).every(function(s){return C.studioScenes.serialize(editHistory.redo())===s;}),'B group/drag/duplicate commands restore exact state');
      var v=C.studioScenes.defaults();v.camera.projection='ortho';v.camera.pitch=Math.PI/2;v.card.position=[.5,.2,-.4];v.card.scale=[1.2,.8,1];v.camera.aspect='2.39:1';var canonical=C.studioScenes.serialize(v),mat=C.studioCamera.matrices(v.camera,2.39,v.card);require(C.studioScenes.serialize(C.studioScenes.parse(canonical))===canonical&&Array.from(mat.inverseVP).every(Number.isFinite)&&C.studioCamera.aspect('2.39:1')===2.39,'B transforms, top view and orthographic migration');
      v.keyframes=[{id:'camera-check',time:0,track:'camera',target:'camera',easing:'linear',camera:C.studioScenes.camera(v.camera)}];v.camera.parentId='check-group';v.camera.locked=true;var posed=C.studioDirector.sample(v,0,0,true);require(posed.camera.id==='camera'&&posed.camera.parentId==='check-group'&&posed.camera.locked===true,'B sampled camera preserves object metadata');
      v.animation.tracks=[{id:'spin-check',target:'card',property:'tilt',enabled:true,keys:[{id:'a',time:0,value:[0,0],easing:'linear'},{id:'b',time:8,value:[0,360],easing:'linear'}]}];require([0,4,8].every(function(t){return C.studioDirector.sample(v,t,0,true).card.tilt[1]===t*45;}),'B Simple spin uses editable timeline keys');
      var elapsedMs=Math.round(root.performance.now()-at);require(elapsedMs<2000,'under two seconds');var result={milestone:'B',passed:passed,elapsedMs:elapsedMs};root.console.info('checkStudio2',result);return result;
    };
    C.dev.register({id:'studio.check2',group:'Studio',label:'Check Studio 2',type:'button',helper:'Manual foundation check: migration, history, current easing, snapping and preset data.',run:function(){return C.dev.checkStudio2();}});
    C.dev.checkStudio = async function () {
      var at = root.performance.now(), cases = [], pending = [];
      function require(ok, label) { if (!ok) throw new Error('Studio: ' + label); cases.push(label); }
      var scene = C.studioScenes.defaults();scene.props=[C.studioScenes.prop({type:'neon-tube',text:'STUDIO',scale:[.5,2,1],material:'emissive'})];scene.director={duration:10,repeat:'ping-pong',title:true,playhead:3,preview:true};scene.keyframes=[{id:'camera-a',time:0,track:'camera',target:'camera',easing:'ease-in-out',camera:C.studioScenes.clone(scene.camera)},{id:'light-a',time:3,track:'light',target:'key',easing:'linear',light:{position:[2,3,4],intensity:1.2,color:[.2,.6,1]}}]; require(JSON.stringify(C.studioScenes.parse(C.studioScenes.serialize(scene))) === JSON.stringify(C.studioScenes.parse(scene)), 'scene JSON round-trip');
      scene.lights = Array.from({ length: 20 }, function () { return scene.lights[0]; }); scene.props = Array.from({ length: 60 }, function (_, i) { return C.studioScenes.prop({id:'p'+i,type:'fan'}); });
      require(C.studioScenes.parse(scene).lights.length === 8 && ['high', 'medium', 'low', 'very-low'].every(function (tier) { var effective = C.studioScenes.effective(scene, tier), limits = C.studioScenes.limits(tier); return effective.lights.length <= limits.lights && effective.props.length <= limits.props; }), 'light and prop budget clamps');
      var first = C.studioScenes.defaults(), history = C.studioScenes.history(first), second = C.studioScenes.clone(first); second.props = [C.studioScenes.prop({type:'glass-case',position:[1,2,3],scale:[2,1,.5],locked:true})]; second.camera.roll = .4; second.lights[0].color = [.2, .7, 1]; history.begin(first); history.commit(second);
      require(C.studioScenes.serialize(history.undo()) === C.studioScenes.serialize(first) && C.studioScenes.serialize(history.redo()) === C.studioScenes.serialize(second), 'undo/redo restores state');
      for (var i = 0; i < 60; i++) { second.camera.distance = 2 + i / 100; history.commit(second); } require(history.steps === 50, '50-step history bound');
      await load();
      var source=root.document.createElement('canvas');source.width=32;source.height=24;source.getContext('2d').fillRect(0,0,32,24);var image=C.studioPhoto.frame(source,{w:96,h:64,frame:'polaroid',caption:'Check',watermark:false},{}),blob,decoded;
      try{blob=await C.studioPhoto.encode(image,'image/png',1);decoded=await root.createImageBitmap(blob);require(decoded.width===96&&decoded.height===64,'photo pixel dimensions match request');}finally{if(decoded)decoded.close();source.width=source.height=image.width=image.height=1;}
      var recovered=await C.studioAlbum.probe(blob),expected=new Uint8Array(await blob.arrayBuffer()),actual=new Uint8Array(await recovered.arrayBuffer());require(recovered instanceof root.Blob&&recovered.type===blob.type&&recovered.size===blob.size&&expected.every(function(byte,index){return byte===actual[index];}),'album blob round-trip');
      require(root.performance.now() - at < 2000, 'under two seconds'); var result = { milestone: 'E', passed: cases, pending: pending, elapsedMs:Math.round(root.performance.now()-at) }; root.console.info('checkStudio', result); return result;
    };
    C.dev.register({ id: 'studio.check', group: 'Studio', label: 'Check Studio', type: 'button', helper: 'One explicit small check: scene, history, limits, photo pixels and album blob.', run: function () { return C.dev.checkStudio(); } });
  });
})(window.Cardable, window);
