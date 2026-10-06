(function (C) {
  'use strict';
  // Pure scene data is available before save loading; no renderer starts here.
  var tiers = { 'very-high': { lights: 16, props: 60, texture: 4096 }, high: { lights: 8, props: 40, texture: 2048 }, medium: { lights: 4, props: 25, texture: 1536 }, low: { lights: 2, props: 12, texture: 1024 }, 'very-low': { lights: 1, props: 0, texture: 768 } };
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback, low, high) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback; }
  function vector(value, fallback, low, high) { return fallback.map(function (n, i) { return number(Array.isArray(value) ? value[i] : null, n, low, high); }); }
  var catalog = {
    stage: [['floor','Floor'],['backdrop','Seamless backdrop'],['plinth-square','Square plinth'],['plinth-round','Round plinth'],['easel','Display easel'],['glass-case','Glass case'],['turntable','Turntable'],['grid-floor','Grid floor']],
    fixtures: [['softbox','Softbox'],['ring-light','Ring light'],['neon-tube','Neon tube'],['spotlight-can','Spotlight can'],['led-strip','LED strip']],
    effects: [['haze','Haze / volumetric fog'],['dust','Dust motes'],['sparks','Sparks'],['confetti','Confetti'],['snow','Snow'],['rain','Rain'],['fireflies','Fireflies'],['smoke','Smoke'],['lens-flare','Lens flare']],
    hardware: [['fan','Fan'],['heatsink','Heatsink block'],['cables','Cable bundle'],['pcie-bracket','PCIe bracket'],['rgb-strip','RGB strip'],['screw','Screw'],['standoff','Standoff']],
    decor: [['crown','Crown'],['trophy','Trophy cup'],['laurel','Laurel ribbon'],['plant','Plant'],['pack','Cardable pack'],['collection','Collection cards']]
  }, propTypes = [].concat.apply([], Object.keys(catalog).map(function (k) { return catalog[k].map(function (v) { return v[0]; }); }));
  function prop(value, index) {
    value = value || {}; var type = choice(value.type, propTypes, 'plinth-square');
    return { id: String(value.id || 'prop-' + (index || 0)).slice(0,80), type: type,
      name: String(value.name || [].concat.apply([], Object.keys(catalog).map(function (k) { return catalog[k]; })).find(function (p) { return p[0] === type; })[1]).slice(0,60),
      position: vector(value.position, [1,-.4,0],-20,20), rotation: vector(value.rotation,[0,0,0],-180,180), scale: vector(value.scale,[1,1,1],.05,6),
      color: vector(value.color,[.45,.47,.5],0,1), material: choice(value.material,['matte','gloss','metal','emissive'],'matte'),
      castShadow: value.castShadow !== false, animation: choice(value.animation,['none','spin','float'],'none'), speed: number(value.speed,.5,.1,3),
      visible: value.visible !== false, locked: value.locked === true, text: String(value.text || 'CARDABLE').slice(0,12),
      surface: choice(value.surface,['matte','glossy','mirror'],'matte'), gradient: vector(value.gradient,[.015,.015,.025],0,1),
      arrangement: choice(value.arrangement,['stack','fan','wall'],'fan'),
      instances: (Array.isArray(value.instances) ? value.instances : []).filter(function (id) { return typeof id === 'string'; }).slice(0,10).map(function (id) { return id.slice(0,120); }),
      packId: String(value.packId || 'standard').slice(0,80), density: number(value.density,.5,.05,1) };
  }
  function defaults(instance, pose) {
    pose = pose || {};
    return { version: 2, groups: [], animation: animation({},8), card: { id:'card', parentId:null, side: pose.side === 'back' ? 'back' : 'front', tilt: [pose.x || 0, pose.y || 0], position:[0,0,0], scale:[1,1,1], rotationZ:0, plate: true, visible: true, locked: false,
      source: instance ? { cardId: instance.cardId, instanceId: instance.instanceId, serial: instance.serial, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, packId: instance.packId || 'standard', pulledAt: instance.pulledAt } : null },
      lights: [Object.assign(light({ id: 'key', position: [-2.2, 3.2, 4], intensity: 1.4 }),{parentId:null})], props: [],
      camera: { id:'camera',parentId:null,visible:true,locked:false,yaw: 0, pitch: 0, distance: 3, fov: 35, target: [0, 0, 0], roll: 0, focus: [0, 0, 0], aperture: 0, aspect: 'free', projection:'perspective', orthoScale:2.2, autoFrame: false, lockToCard: false }, backdrop: { id:'backdrop',parentId:null,visible:true,locked:false,color: [0.035, 0.035, 0.045] }, keyframes: [], director: { duration: 8, repeat: 'once', title: false, playhead: 0, preview: true }, post: { id:'look',parentId:null,visible:true,locked:false,exposure: 0, bloom: .12, vignette: .18, grain: 0, aberration: 0, flare: 0, tiltShift: 0 } };
  }
  function choice(value, choices, fallback) { return choices.indexOf(value) >= 0 ? value : fallback; }
  function light(value, index) {
    value = value || {};
    return { id: String(value.id || 'light-' + (index || 0)).slice(0, 80), name: String(value.name || (value.id === 'key' ? 'Key light' : 'Light')).slice(0, 60), type: choice(value.type, ['point', 'spot', 'directional', 'area', 'strip', 'ambient'], 'point'),
      position: vector(value.position, [-1.2, 1.5, 2], -20, 20), rotation: vector(value.rotation, [0, 0, 0], -180, 180), color: vector(value.color, [1, 1, 1], 0, 1), bottom: vector(value.bottom, [.15, .17, .22], 0, 1), intensity: number(value.intensity, 1, 0, 20),
      temperature: value.temperature == null ? null : number(value.temperature, 6500, 1000, 12000),
      size: number(value.size, .4, .02, 4), falloff: number(value.falloff, 2, 0, 4), angle: number(value.angle, 45, 5, 120), softness: number(value.softness, .5, 0, 1), shadows: value.shadows !== false, shadowSoftness: number(value.shadowSoftness, .4, 0, 1),
      gobo: choice(value.gobo, ['none', 'blinds', 'grid', 'leaves', 'stars'], 'none'), animation: choice(value.animation, ['none', 'pulse', 'flicker', 'sweep', 'orbit'], 'none'), speed: number(value.speed, .5, .1, 5), visible: value.visible !== false, locked: value.locked === true };
  }
  function cameraPose(camera) { camera = camera || {}; return { yaw: yaw(number(camera.yaw, 0, -Math.PI * 20, Math.PI * 20)), pitch: number(camera.pitch, 0, -Math.PI/2, Math.PI/2), distance: number(camera.distance, 3, 1.3, 9), fov: number(camera.fov, 35, 15, 90), target: vector(camera.target, [0, 0, 0], -10, 10), roll: number(camera.roll, 0, -Math.PI, Math.PI), focus: vector(camera.focus, [0, 0, 0], -20, 20), aperture: number(camera.aperture, 0, 0, 10), aspect: choice(camera.aspect, ['free', '1:1', '4:5', '16:9', '9:16', '2.39:1', 'card'], 'free'), projection:choice(camera.projection,['perspective','ortho'],'perspective'),orthoScale:number(camera.orthoScale,2.2,.2,20),autoFrame: camera.autoFrame === true, lockToCard: camera.lockToCard === true }; }
  function parse(value) {
    if (typeof value === 'string') value = JSON.parse(value);
    if (!value || (value.version !== 1 && value.version !== 2)) throw new Error('Unsupported studio scene version.');
    var scene = defaults(value.card && value.card.source), card = value.card || {}, camera = value.camera || {};
    scene.card.position=vector(card.position,[0,0,0],-20,20);scene.card.scale=vector(card.scale,[1,1,1],.05,6);scene.card.rotationZ=number(card.rotationZ,0,-180,180);scene.card.side = card.side === 'back' ? 'back' : 'front'; scene.card.tilt = vector(card.tilt, [0, 0], -180, 180); scene.card.plate = card.plate !== false; scene.card.visible = card.visible !== false; scene.card.locked = card.locked === true;
    if (card.source) { var source = card.source; scene.card.source = { cardId: String(source.cardId || '').slice(0, 120), instanceId: String(source.instanceId || '').slice(0, 120), serial: String(source.serial || '').slice(0, 120), variantId: typeof source.variantId === 'string' ? source.variantId.slice(0, 80) : null, cardSkinId: typeof source.cardSkinId === 'string' ? source.cardSkinId.slice(0, 80) : null, packId: String(source.packId || 'standard').slice(0, 80), pulledAt: number(source.pulledAt, 0, 0, 8640000000000000) }; }
    scene.camera = cameraPose(camera);
    scene.backdrop.color = vector(value.backdrop && value.backdrop.color, scene.backdrop.color, 0, 1);
    scene.lights = (Array.isArray(value.lights) ? value.lights : scene.lights).slice(0, 16).map(light);
    var ids = new Set(['card','camera','backdrop','look']); scene.lights.forEach(function (l, i) { var base = safeId(l.id,'light-'+i), suffix = i;l.id=base;while (ids.has(l.id)) l.id = base.slice(0,65) + '-' + suffix++; ids.add(l.id); });
    var post = value.post || {}; scene.post = { exposure: number(post.exposure, 0, -2, 2), bloom: number(post.bloom, .12, 0, 1), vignette: number(post.vignette, .18, 0, 1), grain: number(post.grain, 0, 0, .3), aberration: number(post.aberration, 0, 0, 1), flare: number(post.flare, 0, 0, 1), tiltShift: number(post.tiltShift, 0, 0, 1) };
    scene.props = (Array.isArray(value.props) ? value.props : []).slice(0,60).map(prop);
    var cardsLeft = 10; scene.props.forEach(function (p) { if (p.type === 'collection') { p.instances = p.instances.slice(0,cardsLeft); cardsLeft -= p.instances.length; } });
    scene.props.forEach(function (p,i) { var base=safeId(p.id,'prop-'+i), suffix=i;p.id=base;while(ids.has(p.id)) p.id=base.slice(0,65)+'-'+suffix++; ids.add(p.id); });
    if(typeof value.presentationTime==='number')scene.presentationTime=number(value.presentationTime,0,0,86400);
    var d = value.director || {}; scene.director = { duration: number(d.duration,8,1,15), repeat: choice(d.repeat,['once','loop','ping-pong'],'once'), title: d.title === true, preview: d.preview !== false, playhead: number(d.playhead,0,0,number(d.duration,8,1,15)) };
    var aliases=new Map();(Array.isArray(value.lights)?value.lights:[]).slice(0,16).forEach(function(l,i){if(l&&!aliases.has(l.id))aliases.set(l.id,scene.lights[i].id);});function target(id){return aliases.get(id)||id;}var frameIds = new Set(); scene.keyframes = (Array.isArray(value.keyframes)?value.keyframes:[]).slice(0,96).filter(function(f){return f && (f.track==='camera'||f.track==='light'&&scene.lights.some(function(l){return l.id===target(f.target);}));}).map(function(f,i){
      var base=safeId(f.id,'frame-'+i),id=base,n=i;while(frameIds.has(id))id=base.slice(0,65)+'-'+n++;frameIds.add(id);var frame={id:id,time:number(f.time,0,0,scene.director.duration),track:f.track,target:f.track==='camera'?'camera':String(target(f.target)).slice(0,80),easing:choice(f.easing,['linear','ease-in','ease-out','ease-in-out'],'ease-in-out')};
      if(f.track==='camera')frame.camera=cameraPose(f.camera);else{var l=light(f.light);frame.light={position:l.position,intensity:l.intensity,color:l.color};}return frame;
    }).sort(function(a,b){return a.time-b.time||(a.id<b.id?-1:a.id>b.id?1:0);});
    hierarchy(scene,value,ids);scene.animation=animation(value.animation,scene.director.duration);return scene;
  }
  function store(value) {
    var result = { slots: [], last: {}, quality:'global',workspace:workspace({}) };
    if (!value || typeof value !== 'object') return result;
    result.workspace=workspace(value.workspace);result.quality=choice(value.quality,['global','very-high','high','medium','low','very-low'],'global');
    result.slots = Array.from({length:10},function (_,i) { var slot = Array.isArray(value.slots) && value.slots[i]; if (!slot) return null; try { return { name: String(slot.name || 'Scene '+(i+1)).slice(0,60), thumbnail: typeof slot.thumbnail === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(slot.thumbnail) && slot.thumbnail.length <= 80000 ? slot.thumbnail : '', scene: parse(slot.scene) }; } catch (_) { return null; } });
    Object.keys(value.last || {}).forEach(function (id) { if (id === '__proto__' || id === 'constructor' || id === 'prototype') return; try { result.last[id] = parse(value.last[id]); } catch (_) { /* An invalid scene never invalidates gameplay progress. */ } });
    return result;
  }

  function workspace(v){v=v||{};return {mode:choice(v.mode,['simple','pro'],'simple'),page:choice(v.page,['Set','Light','Camera','Animate','Look','Deliver'],'Set'),leftWidth:number(v.leftWidth,250,200,360),rightWidth:number(v.rightWidth,292,240,380),leftClosed:v.leftClosed===true,rightClosed:v.rightClosed===true,tourDone:v.tourDone===true,favorites:(Array.isArray(v.favorites)?v.favorites:[]).filter(function(x){return typeof x==='string';}).slice(0,128)};}
  function yaw(v){return ((v+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;}
  function safeId(value,fallback){return String(value||fallback).replace(/[^a-zA-Z0-9_.:-]/g,'_').slice(0,80)||fallback;}
  function ordered(value){if(Array.isArray(value))return value.map(ordered);if(value&&typeof value==='object'){var out={};Object.keys(value).sort().forEach(function(k){out[k]=ordered(value[k]);});return out;}return value;}
  function objects(scene){return [scene.card,scene.camera,scene.backdrop,scene.post].concat(scene.lights,scene.props,scene.groups||[]);}
  function hierarchy(scene,source,ids){
    var groups=(Array.isArray(source.groups)?source.groups:[]).slice(0,64);
    scene.groups=groups.map(function(g,i){g=g||{};var base=safeId(g.id,'group-'+i),id=base,n=i;while(ids.has(id))id=base.slice(0,65)+'-'+n++;ids.add(id);return {id:id,name:String(g.name||'Group').slice(0,60),parentId:g.parentId||null,children:[],visible:g.visible!==false,locked:g.locked===true};});
    var originals=[source.card,source.camera,source.backdrop,source.post].concat((Array.isArray(source.lights)?source.lights:scene.lights).slice(0,16),(Array.isArray(source.props)?source.props:[]).slice(0,60),groups);
    [scene.card,scene.camera,scene.backdrop,scene.post].forEach(function(o,i){o.id=['card','camera','backdrop','look'][i];var old=originals[i]||{};o.visible=old.visible!==false;o.locked=old.locked===true;});
    var all=objects(scene),byId=new Map(all.map(function(o){return [o.id,o];})),sourceById=new Map(originals.filter(Boolean).map(function(o){return [safeId(o.id,''),o];}));
    all.forEach(function(o){var original=originals[all.indexOf(o)]||sourceById.get(o.id)||{},parent=scene.groups.find(function(g){return g.id===original.parentId;});o.parentId=parent&&parent!==o?parent.id:null;});
    // Old files may list children rather than parents. Explicit parentId wins.
    groups.forEach(function(old,i){if(!old||!Array.isArray(old.children))return;old.children.slice(0,124).forEach(function(id){var child=byId.get(id);if(child&&!Object.prototype.hasOwnProperty.call(originals[all.indexOf(child)]||{},'parentId')&&!child.parentId&&child!==scene.groups[i])child.parentId=scene.groups[i].id;});});
    all.forEach(function(o){var visited=new Set([o.id]),p=o.parentId;while(p){if(visited.has(p)){o.parentId=null;break;}visited.add(p);p=byId.get(p).parentId;}});
    all.forEach(function(o){if(o.parentId)byId.get(o.parentId).children.push(o.id);});
    scene.groups.forEach(function(g){g.children.sort();});
  }
  function animation(value,duration){
    value=value||{};var ids=new Set(),keysLeft=1024;function id(v,f){var base=safeId(v,f),next=base,n=0;while(ids.has(next))next=base.slice(0,65)+'-'+n++;ids.add(next);return next;}var a={fps:choice(value.fps,[24,30,60],30),speed:number(value.speed,1,.25,2),autoKey:value.autoKey===true,workArea:{in:number(value.workArea&&value.workArea.in,0,0,duration),out:number(value.workArea&&value.workArea.out,duration,0,duration)},tracks:[],markers:[],shots:[],titles:[]};
    if(a.workArea.out<a.workArea.in)a.workArea.out=a.workArea.in;
    // The typed channel format is a foundation for D; existing pose keys stay intact.
    a.tracks=(Array.isArray(value.tracks)?value.tracks:[]).slice(0,256).map(function(track,i){track=track||{};return {id:id(track.id,'track-'+i),target:safeId(track.target,'card'),property:String(track.property||'position').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,60),enabled:track.enabled!==false,keys:(Array.isArray(track.keys)?track.keys:[]).slice(0,Math.min(96,keysLeft)).map(function(k,j){keysLeft--;k=k||{};return {id:id(k.id,'key-'+i+'-'+j),time:number(k.time,0,0,duration),value:Array.isArray(k.value)?k.value.slice(0,4).map(function(v){return number(v,0,-10000,10000);}):number(k.value,0,-10000,10000),easing:choice(k.easing,['linear','ease-in','ease-out','ease-in-out'],'ease-in-out')};}).sort(function(x,y){return x.time-y.time||(x.id<y.id?-1:x.id>y.id?1:0);})};});
    a.markers=(Array.isArray(value.markers)?value.markers:[]).slice(0,96).map(function(m,i){m=m||{};return {id:id(m.id,'marker-'+i),name:String(m.name||'Marker').slice(0,60),time:number(m.time,0,0,duration),color:vector(m.color,[.6,.6,.6],0,1)};});
    a.shots=(Array.isArray(value.shots)?value.shots:[]).slice(0,64).map(function(s,i){s=s||{};return {id:id(s.id,'shot-'+i),cameraId:safeId(s.cameraId,'camera'),start:number(s.start,0,0,duration),duration:number(s.duration,1,.01,duration),transition:choice(s.transition,['cut','dissolve','dip','whip'],'cut')};});
    a.titles=(Array.isArray(value.titles)?value.titles:[]).slice(0,16).map(function(v,i){v=v||{};return {id:id(v.id,'title-'+i),text:String(v.text||'').slice(0,240),visible:v.visible!==false,locked:v.locked===true,position:vector(v.position,[.5,.85],0,1),opacity:number(v.opacity,1,0,1),start:number(v.start,0,0,duration),duration:number(v.duration,1,.01,duration),font:choice(v.font,['Inter','JetBrains Mono'],'Inter')};});
    return a;
  }
  function nameEdit(a,b){a=parse(a);b=parse(b);var parts=['card','camera','lights','props','backdrop','post','keyframes','director','groups','animation'],part=parts.find(function(k){return JSON.stringify(ordered(a[k]))!==JSON.stringify(ordered(b[k]));});return {card:'Edit card',camera:'Edit camera',lights:'Edit lights',props:'Edit props',backdrop:'Edit backdrop',post:'Edit look',keyframes:'Edit keyframes',director:'Edit shot',groups:'Edit groups',animation:'Edit animation'}[part]||'Edit scene';}
  function history(initial){
    var entries=[],cursor=0,base=C.studioScenes.serialize(initial),current=base,before=null,label=null,revision=0,baseAt=Date.now(),trimmed=false;
    function snapshot(s){return C.studioScenes.serialize(s);}
    function jump(index){before=null;label=null;index=Math.max(0,Math.min(entries.length,Math.floor(index)));while(cursor>index)current=entries[--cursor].undo();while(cursor<index)current=entries[cursor++].do();revision++;return parse(current);}
    return {begin:function(s,name){if(before===null){before=snapshot(s);label=name||null;}},
      commit:function(s,name){var after=snapshot(s),prior=before===null?current:before,title=name||label;before=label=null;if(after===prior){current=after;return false;}
        var command={name:title||nameEdit(prior,after),at:Date.now(),do:function(){return after;},undo:function(){return prior;}};
        entries.splice(cursor);entries.push(command);cursor++;if(entries.length>100){var dropped=entries.shift();base=dropped.do();baseAt=dropped.at;trimmed=true;cursor--;}current=command.do();revision++;return true;},
      execute:function(s,name,run){this.commit(s);this.begin(s,name);try{run(s);this.commit(s);return parse(current);}catch(e){before=label=null;Object.keys(s).forEach(function(k){delete s[k];});Object.assign(s,parse(current));throw e;}},
      cancel:function(){before=label=null;return parse(current);},undo:function(){return cursor?jump(cursor-1):null;},redo:function(){return cursor<entries.length?jump(cursor+1):null;},jump:jump,
      get entries(){return [{index:0,name:trimmed?'Earlier edits':'Session start',at:baseAt,active:cursor===0}].concat(entries.map(function(e,i){return {index:i+1,name:e.name,at:e.at,active:cursor===i+1};}));},
      get canUndo(){return cursor>0;},get canRedo(){return cursor<entries.length;},get steps(){return cursor;},get revision(){return revision;},get cursor(){return cursor;}};
  }
  C.studioQuality={choices:['very-low','low','medium','high','very-high'],resolve:function(override,global){var requested=override&&override!=='global'?override:global;return tiers[requested]?requested:'medium';},renderTier:function(tier){return tier==='very-high'?'high':tier;},availability:function(tier){return tier==='very-high'?{available:false,reason:'Very High render features arrive in milestone E.'}:{available:!!tiers[tier],reason:''};}};
  C.studioScenes = { tiers: tiers, clone: clone, defaults: defaults, light: light, prop: prop, catalog: catalog, camera: cameraPose, parse: parse, serialize: function (scene) { return JSON.stringify(ordered(parse(scene))); }, normalize: store, objects:objects, syncGroups:function(scene){var all=objects(scene);(scene.groups||[]).forEach(function(g){g.children=all.filter(function(o){return o.parentId===g.id;}).map(function(o){return o.id;}).sort();});},
    limits: function (tier) { return tiers[tier] || tiers.medium; },
    effective: function (scene, tier) {var limit=this.limits(tier),result={card:clone(scene.card),camera:clone(scene.camera),backdrop:clone(scene.backdrop),post:clone(scene.post),lights:[],props:[],keyframes:[],director:scene.director,materialTime:scene.materialTime||0},byId=new Map((scene.groups||[]).map(function(g){return [g.id,g];}));
      function usable(o){var p=o.parentId,seen=new Set();while(p&&!seen.has(p)){seen.add(p);var group=byId.get(p);if(!group)break;if(!group.visible)return false;p=group.parentId;}return o.visible!==false;}
      result.card.visible=usable(scene.card);if(!usable(scene.backdrop))result.backdrop.color=[.035,.035,.045];if(!usable(scene.post))['exposure','bloom','vignette','grain','aberration','flare','tiltShift'].forEach(function(k){result.post[k]=0;});result.lights=scene.lights.filter(usable).slice(0,limit.lights).map(clone);result.props=scene.props.filter(usable).slice(0,limit.props).map(clone);return result;},
    history:history,
    locked:function(scene,o){var groups=new Map((scene.groups||[]).map(function(g){return [g.id,g];})),seen=new Set();while(o&&!seen.has(o.id)){if(o.locked)return true;seen.add(o.id);o=groups.get(o.parentId);}return false;},
    snap:function(value,step){if(!Number.isFinite(value)||!Number.isFinite(step)||step<=0)return value;return Number((Math.round((value/step)+1e-9)*step).toFixed(8));},
    last: function (instance) { var saved = C.state.current.studio; try { return saved && saved.last && saved.last[instance.instanceId] ? parse(saved.last[instance.instanceId]) : null; } catch (_) { return null; } },
    saveLast: function (instance, scene) { var saved = C.state.current.studio || (C.state.current.studio = { slots: [], last: {} }); if (!saved.last) saved.last = {}; saved.last[instance.instanceId] = parse(scene); C.state.save(); }
  };
})(window.Cardable);
