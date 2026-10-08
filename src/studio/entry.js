(function (C, root) {
  'use strict';
  var loading = null, busy = false, scripts=new Map(),reopening=null;
  function files(paths){
    var loader=null,loaded=0,groups={Art:paths.filter(function(p){return p.indexOf('art')>=0;}).length,UI:paths.filter(function(p){return p.indexOf('/ui/')>=0;}).length,Scene:paths.filter(function(p){return p.indexOf('art')<0&&p.indexOf('/ui/')<0;}).length},counts={Art:0,UI:0,Scene:0},rings={};
    if(C.ui&&paths.length>6&&C.detail.panel){loader=C.ui.create('loader',{label:'Warming Studio assets',total:paths.length});loader.classList.add('cb-studio-loader');Object.keys(groups).forEach(function(g){if(groups[g]){rings[g]=C.ui.progress(0,g+' assets',true);loader.appendChild(rings[g]);}});C.detail.panel.appendChild(loader);}
    var task=paths.reduce(function(chain,file){return chain.then(function(){var pending=scripts.get(file);if(!pending){pending=new Promise(function(resolve,reject){var script=root.document.createElement('script');script.src=file;script.async=false;script.onload=resolve;script.onerror=function(){script.remove();scripts.delete(file);reject(new Error('The studio could not load. Restore its local files.'));};root.document.head.appendChild(script);});scripts.set(file,pending);}return pending.then(function(){loaded++;var g=file.indexOf('art')>=0?'Art':file.indexOf('/ui/')>=0?'UI':'Scene';counts[g]++;if(loader){loader.update(loaded,paths.length);Object.keys(rings).forEach(function(k){rings[k].update(counts[k]/groups[k]);});}});});},Promise.resolve());
    var timer=loader?root.setTimeout(function(){loader.remove();},8000):null;return task.finally(function(){if(loader)loader.remove();root.clearTimeout(timer);});
  }
  function loadAlbum(){return files(['src/studio/files.js','src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js']);}
  function load() {
    if(C.studioController)return Promise.resolve();if(loading)return loading;
    loading=files(['assets/art-data/manifest.js','src/studio/art-data.js','src/studio/camera.js','src/studio/lights.js','src/studio/preset-catalog.js','src/studio/visual-presets.js','src/studio/presets.js','src/studio/materials.js','src/studio/card-face.js','src/studio/props.js','src/studio/renderer.js','src/studio/files.js','src/studio/album.js','src/studio/photo.js','src/studio/ui/album.js','src/studio/ui/panels.js','src/studio/ui/gizmos.js','src/studio/ui/scenes.js','src/studio/ui/photo.js','src/studio/animation.js','src/studio/director.js','src/studio/webm.js','src/studio/recording.js','src/studio/ui/timeline-tools.js','src/studio/ui/timeline-curves.js','src/studio/ui/director.js','src/studio/editing.js','src/studio/ui/presets.js','src/studio/ui/look.js','src/studio/ui/deliver.js','src/studio/ui/workspace.js','src/studio/studio.js']).catch(function(error){loading=null;throw error;});return loading;
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
    button.appendChild(C.icons.create('camera'));var caption=root.document.createElement('span');caption.textContent='Inspect';button.appendChild(caption); button.addEventListener('click', function () { C.studio.enter(context); }); host.appendChild(button);
  });
  C.keys.listen(root.document, 'keydown', 'src.studio.entry.js.1', function (event) { if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || String(event.key).toLowerCase() !== 'e' || C.studio.active || busy || C.detail.phase !== 'detail' || !C.detail.view || !C.detail.view.instance.serial || event.target.closest && event.target.closest('input,select,textarea,[contenteditable],[data-tool-surface]')) return; event.preventDefault(); C.studio.enter(); });
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
      var catalog=C.studioPresets.catalog,counts={scene:24,rig:12,look:10,props:8,move:13,animation:9};require(Object.keys(counts).every(function(k){return catalog.filter(function(e){return e.kind===k;}).length===counts[k];}),'C authored catalog covers all six preset kinds');
      require(Object.keys(counts).every(function(kind){var e=catalog.find(function(e){return e.kind===kind;}),base=C.studioScenes.defaults();base.props=[C.studioScenes.prop({type:'fan'})];var built=C.studioPresets.build(e,base,null,'check'),p=C.studioPresets.snapshot(kind,'Check',built,'check-'+kind),encoded=C.studioPresets.serialize(p);return C.studioPresets.serialize(C.studioPresets.parse(encoded))===encoded;}),'C all preset kinds round-trip canonically');
      var seeded=C.studioPresets.surprise('check-seed'),seedBase=C.studioScenes.defaults(),seedA=C.studioPresets.remix(seeded,seedBase,null,'check-seed');require(C.studioPresets.surprise('check-seed').id===seeded.id&&C.studioScenes.serialize(seedA)===C.studioScenes.serialize(C.studioPresets.remix(seeded,seedBase,null,'check-seed')),'C Surprise and Remix are reproducible');
      var motion=C.studioPresets.build('animation:float',seedBase,null,'check');require(C.studioDirector.sample(motion,4,0,true).card.position[1]===.07&&motion.card.position[1]===0,'C typed animation samples without mutating authored data');
      var optional=C.studioScenes.normalize({presets:[C.studioPresets.snapshot('look','Saved look',seedBase,'user-check')],presetRecents:['look:clean'],presetFavorites:['look:clean'],presetSeed:'check'});require(optional.presets.length===1&&optional.presetRecents[0]==='look:clean'&&optional.presetSeed==='check','C optional preset state survives save normalization');
      var qaA=C.studioAnimation,qaD=C.studioScenes.defaults();
      require(qaA.easings.every(function(e){return qaA.ease(0,e)===0&&qaA.ease(1,e)===1&&Array.from({length:101},function(_,i){return qaA.ease(i/100,e);}).every(Number.isFinite);}), 'D easing endpoints and finite overshoot');
      require(['linear','step','cubic-in','cubic-out','cubic-in-out','bezier'].every(function(e){var prior=-1;return Array.from({length:101},function(_,i){var v=qaA.ease(i/100,e),ok=v>=prior-1e-7;prior=v;return ok;}).every(Boolean);}), 'D monotone time curves');
      qaA.upsert(qaD,'card','side',0,'front');qaA.upsert(qaD,'card','side',1,'back');qaA.upsert(qaD,'card','visible',0,true);qaA.upsert(qaD,'card','visible',1,false);
      require(C.studioDirector.sample(qaD,.5,0,true).card.side==='front'&&C.studioDirector.sample(qaD,1,0,true).card.side==='back'&&!C.studioDirector.sample(qaD,1,0,true).card.visible,'D discrete values change at exact key boundaries');
      qaA.upsert(qaD,'backdrop','color',0,[0,0,0]);qaA.upsert(qaD,'backdrop','color',2,[1,1,1]);var qaBefore=C.studioScenes.serialize(qaD);C.studioDirector.sample(qaD,1,0,true);require(qaBefore===C.studioScenes.serialize(qaD),'D sampling never changes authored backdrop');
      var qaMove=qaA.upsert(qaD,'card','position',0,[0,0,0]),qaEnd=qaA.upsert(qaD,'card','position',2,[1,0,0]);qaA.retime(qaD,[qaEnd.key.id],1,1);require(qaEnd.key.time===3&&qaA.value(qaMove.track.keys,3,[0,0,0])[0]===1,'D grouped retiming keeps key values');qaA.loop(qaD,[qaEnd.key.id]);require(JSON.stringify(qaMove.track.keys[0].value)===JSON.stringify(qaMove.track.keys[qaMove.track.keys.length-1].value),'D loop helper matches selected endpoints');
      var qaOld=C.studioScenes.parse(qaD);qaD.card.rotationZ=17;qaA.autoKey(qaD,qaOld,1);require(qaD.animation.tracks.some(function(t){return t.target==='card'&&t.property==='rotationZ'&&t.keys.length===2;}),'D auto-key records only changed properties with an initial pose');
      qaD.animation.cameras=[Object.assign(C.studioScenes.camera(qaD.camera),{id:'qa-camera',name:'Detail',yaw:.6,autoFrame:false})];qaD.animation.shots=[{id:'qa-shot-a',cameraId:'camera',start:0,duration:2,transition:'cut',blend:.4},{id:'qa-shot-b',cameraId:'qa-camera',start:2,duration:2,transition:'dissolve',blend:.4}];var qaShot=C.studioDirector.sample(qaD,2.2,0,true);require(Math.abs(qaShot.camera.yaw-.6)<1e-7&&qaShot.camera.id==='camera'&&qaShot.shotBlend.blend>0&&qaShot.shotBlend.blend<1,'D shots bind cameras while preserving main object identity');qaD.animation.shots[1].transition='dip';require(C.studioDirector.sample(qaD,2.2,0,true).transitionBlack>.99,'D dip reaches black at its midpoint');
      var qaTitle=qaA.addTitle(qaD,'Museum Label',{name:'Card',tier:'Legendary',serial:'001'},0);require(qaTitle.text==='Card\nLegendary'&&qaA.titlePose(qaTitle,0).alpha===0&&qaA.titlePose(qaTitle,1).alpha===1&&qaA.titlePose(qaTitle,qaTitle.duration).alpha===0&&qaA.titles.length===8,'D eight titles animate in and out');
      require(C.studioScenes.serialize(C.studioScenes.parse(C.studioScenes.serialize(qaD)))===C.studioScenes.serialize(qaD),'D camera, shot, discrete key and title data round-trip');
      var qaLegacy=C.studioScenes.defaults();qaLegacy.keyframes=[{id:'legacy',time:0,track:'camera',target:'camera',easing:'linear',camera:C.studioScenes.camera(qaLegacy.camera)}];qaA.migratePoses(qaLegacy);require(!qaLegacy.keyframes.length&&qaLegacy.animation.tracks.some(function(t){return t.target==='camera'&&t.property==='fov';}),'D legacy pose expansion retains camera channels');
      var qaLook=C.studioScenes.defaults();delete qaLook.post.curve;delete qaLook.post.vibrance;qaLook.version=1;qaLook=C.studioScenes.parse(qaLook);require(qaLook.post.vibrance===0&&qaLook.post.highlights===0&&qaLook.post.sharpen===0&&qaLook.camera.apertureShape==='circle'&&Array.from({length:65},function(_,i){return Math.abs(C.studioLook.curve(qaLook.post.curve,i/64)-i/64)<1e-8;}).every(Boolean),'E legacy Look defaults are neutral');
      qaLook.post.curve=[.02,.18,.51,.82,.99];qaLook.post.vibrance=.2;qaLook.camera.apertureShape='hexagon';qaLook.animation.tracks=[{id:'curve-key',target:'look',property:'curve',enabled:true,keys:[{id:'curve-a',time:0,value:qaLook.post.curve,easing:'linear'}]}];require(C.studioScenes.serialize(C.studioScenes.parse(C.studioScenes.serialize(qaLook)))===C.studioScenes.serialize(qaLook)&&C.studioDirector.sample(C.studioScenes.parse(qaLook),0,0,true).post.curve.length===5,'E grade and five-point curve keys round-trip');
      var qaPhoto=C.studioPhoto.options({w:7680,h:4320,frame:'poster',samples:999},8192,false),qaArea=C.studioPhoto.area(qaPhoto);require(qaPhoto.samples===512&&qaPhoto.frame==='poster'&&qaArea.w>0&&qaArea.h>0,'E 8K dimensions, poster area and sample bound');
      qaLook.animation.workArea={in:1,out:3};qaLook.animation.speed=2;require(C.studioDeliver.frames(qaLook,60)===60&&C.studioDeliver.frameTime(qaLook,59,60)<3&&C.studioDeliver.frameTime(qaLook,0,60)===1,'E frame stepping honors work area and speed');
      require(C.studioScenes.limits('very-high').lights===16&&C.studioScenes.limits('very-high').texture===4096&&C.studioQuality.samples('very-high')===512&&C.studioQuality.samples('low')===64&&C.studioQuality.resolve('global','very-high')==='very-high','E quality budgets and future global tier hook');
      var qaHeader=C.studioWebM.header(1920,1080,60,1,'vp8');require(qaHeader[0]===26&&qaHeader[1]===69&&qaHeader[2]===223&&qaHeader[3]===163&&qaHeader.length<512,'E bounded video-only WebM header');
      var elapsedMs=Math.round(root.performance.now()-at);require(elapsedMs<2000,'under two seconds');var result={milestone:'E',passed:passed,elapsedMs:elapsedMs};root.console.info('checkStudio2',result);return result;
    };
    C.dev.register({id:'studio.check2',group:'Studio',label:'Check Studio 2',type:'button',helper:'Manual studio check: migration, history, presets, easing, timeline, cameras and titles.',run:function(){return C.dev.checkStudio2();}});
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
