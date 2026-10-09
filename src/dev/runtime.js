(function (C, root) {
  'use strict';
  var realKey=C.config.storage.key, baseCap=C.config.packs.maxStored, baseRegen=C.config.packs.regenMs;
  var originals={clock:C.clock.now,tick:C.timers.tick,progress:C.timers.progress,emit:C.events.emit,encode:C.state.encode};
  var undo=null, undoContexts=Object.create(null), suppressWorkspace=false, stamps=Object.create(null), listeners=[], timerPauseAt=null;
  var D=C.dev={tools:new Map(),groups:new Map(),startups:[],frames:new Set(),closeHandlers:new Set(),jobs:new Map(),
    opened:false,immersive:false,sandbox:false,offset:0,luck:1,cap:baseCap,regen:'1',paused:false,
    settings:Object.create(null),metadata:Object.create(null),logs:[],errors:[],capture:true,logPaused:false,
    selectedPack:null,selectedCard:null,selectedVariant:null,quantity:1,force:{tier:'',card:'',variant:'random',sticky:false},
    fpsEnabled:true,fps:0,gaps:[],burn:0,recording:null,visualRate:1,ui:{},counter:0};
  D.clone=function(v){return JSON.parse(JSON.stringify(v));};
  D.node=function(tag,cls,parent,text){var el=root.document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;if(parent)C.viewport.parent(parent).appendChild(el);return el;};
  D.safe=function(fn){return function(){try{var result=fn.apply(this,arguments);if(result&&typeof result.catch==='function')return result.catch(function(error){D.message(error.message,true);return false;});return result;}catch(error){D.message(error.message,true);return false;}};};
  D.button=function(label,parent,fn){var b=D.node('button','quiet-button',parent,label);b.type='button';b.addEventListener('click',D.safe(fn));return b;};
  D.copy=function(text){text=typeof text==='string'?text:JSON.stringify(text,null,2);if(root.navigator.clipboard&&root.isSecureContext)return root.navigator.clipboard.writeText(text).then(function(){D.message('Copied');},function(){fallback();});function fallback(){var area=D.node('textarea','',root.document.body,text);area.style.position='fixed';area.style.opacity='0';area.select();var copied=root.document.execCommand('copy');area.remove();D.message(copied?'Copied':'Copy unavailable in this browser',!copied);}fallback();};
  D.message=function(text,error){if(D.ui.notice){D.ui.notice.textContent=text;D.ui.notice.classList.toggle('is-error',!!error);}else root.console.info('[Cardable dev] '+text);};
  D.changed=function(){C.events.emit('dev:changed');D.persistWorkspace();if(D.refresh)D.refresh();};
  D.read=function(key,fallback){try{var v=root.localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch(_){return fallback;}};
  D.write=function(key,value){root.localStorage.setItem(key,JSON.stringify(value));};
  D.register=function(tool){
    if(!tool||!tool.id||!tool.group||!tool.label||!['button','toggle','segment','slider','input','readout','custom'].includes(tool.type))throw new Error('Invalid developer tool');
    if(D.tools.has(tool.id))throw new Error('Duplicate developer tool: '+tool.id);
    if(tool.hotkey&&!/^Alt\+[A-HJ-QT-Z0-9]$/i.test(tool.hotkey))throw new Error('Tool hotkeys must use an allowed Alt key');
    D.tools.set(tool.id,tool);if(!D.groups.has(tool.group))D.groups.set(tool.group,[]);D.groups.get(tool.group).push(tool.id);
    if(D.rebuildRail)D.rebuildRail();return function(){D.tools.delete(tool.id);var group=D.groups.get(tool.group)||[];var i=group.indexOf(tool.id);if(i>=0)group.splice(i,1);if(!group.length)D.groups.delete(tool.group);if(D.rebuildRail)D.rebuildRail();if(D.opened&&D.ui.heading&&D.ui.heading.textContent===tool.group){var group=D.groups.has(tool.group)?tool.group:Array.from(D.groups.keys())[0];if(group)D.selectGroup(group);}};
  };
  D.available=function(t){return !t.available||t.available()===true;};
  function encoded(value){
    var next=D.clone(value);
    if(!D.sandbox){
      next.packs.ready=Math.min(baseCap,next.packs.ready);
      var progress=next.packs.timerStartedAt==null?0:Math.max(0,Math.min(1,((D.paused?timerPauseAt:C.clock.now())-next.packs.timerStartedAt)/C.config.packs.regenMs));next.packs.timerStartedAt=next.packs.ready>=baseCap?null:Date.now()-progress*baseRegen;
      [next.inventory,next.pendingReveal&&next.pendingReveal.cards||[]].forEach(function(items){items.forEach(function(i){if(stamps[i.instanceId]!=null)i.pulledAt=Math.max(0,i.pulledAt-stamps[i.instanceId]);});});
      if(next.pendingReveal)next.pendingReveal.committedAt=Math.max(0,next.pendingReveal.committedAt-(stamps[(next.pendingReveal.cards[0]||{}).instanceId]||0));
    }
    return JSON.stringify(next);
  }
  D.mutate=function(label,fn,workspaceBefore){
    if(C.opening.phase!=='idle')throw new Error('Finish the current opening before editing its save.');
    D.backup();var before=D.clone(C.state.current),beforeWorkspace=workspaceBefore||D.workspace(),next=D.clone(before);fn(next);
    next=C.state.validate(next,true);if(JSON.stringify(next).length>C.config.polish.maxSaveBytes)throw new Error('The result exceeds the save size limit. Use fewer cards.');
    if(!C.state.commit(next))throw new Error('Storage could not save the change. Progress is unchanged.');
    undo={before:before,workspace:beforeWorkspace,key:C.config.storage.key,until:Date.now()+15000,after:C.saveTools.checksum(next)};
    C.events.emit('save:replaced',next);D.message(label+' · Undo available for 15 s');D.changed();return next;
  };
  D.undo=function(){if(!undo||undo.key!==C.config.storage.key||Date.now()>undo.until)throw new Error('Undo expired. Load a snapshot or backup.');if(C.saveTools.checksum(C.state.current)!==undo.after)throw new Error('Progress changed after this action; use a snapshot instead.');var record=undo,prior=record.before,workspace=record.workspace,beforeWorkspace=D.workspace();if(workspace)D.applySnapshotWorkspace(workspace);try{D.mutate('Undone',function(next){Object.keys(next).forEach(function(k){delete next[k];});Object.assign(next,prior);});undo=null;}catch(e){D.applySnapshotWorkspace(beforeWorkspace);undo=record;throw e;}};
  D.grant=function(draws,label){return D.mutate(label||'Cards granted',function(next){draws.forEach(function(draw){if(!C.card(draw.cardId))throw new Error('Unknown card');if(draw.variantId&&!C.variant(draw.variantId))throw new Error('Unknown variant');next.serialCounter++;var id=C.randomId('card');stamps[id]=D.offset;next.inventory.push({instanceId:id,packId:draw.packId||'standard',cardSkinId:draw.cardSkinId||(C.pack(draw.packId||'standard').cardSkinId)||null,cardId:draw.cardId,variantId:draw.variantId||null,serial:C.serial.format(next.playerCode,next.serialCounter),pulledAt:C.clock.now(),seen:false});});});};
  D.card=function(){return C.card(D.selectedCard)||C.data.cards.find(function(c){return !c.retired&&c.type==='gpu';})||C.data.cards[0];};
  D.pack=function(){return C.pack(D.selectedPack)||C.data.packs.find(function(p){return p.enabled;});};
  D.flags=function(){return D.clone(D.force);};
  D.setCap=function(value){if(!Number.isInteger(value)||value<1||value>99)throw new Error('Choose a cap from 1 to 99.');D.backup();var old=D.cap;D.cap=value;C.config.packs.maxStored=value;try{D.mutate('Pack cap changed',function(s){s.packs.ready=Math.min(D.cap,s.packs.ready);if(s.packs.ready===D.cap)s.packs.timerStartedAt=null;});}catch(e){D.cap=old;C.config.packs.maxStored=old;throw e;}};
  D.setRegen=function(value){D.backup();var old=D.regen,oldMs=C.config.packs.regenMs,progress=C.timers.progress();D.regen=String(value);C.config.packs.regenMs=baseRegen/(Number(value)||1);if(value==='instant')C.config.packs.regenMs=1;try{D.mutate('Regeneration speed changed',function(s){s.packs.timerStartedAt=s.packs.ready>=D.cap?null:C.clock.now()-progress*C.config.packs.regenMs;if(value==='instant')C.timers.reconcileInto(s,C.clock.now()+D.cap);});}catch(e){D.regen=old;C.config.packs.regenMs=oldMs;throw e;}D.changed();};
  D.pauseTimer=function(value){D.backup();if(value&&!D.paused){timerPauseAt=C.clock.now();C.timers.stop();}else if(!value&&D.paused){D.paused=false;try{D.mutate('Regeneration resumed',function(s){if(s.packs.timerStartedAt!=null)s.packs.timerStartedAt+=C.clock.now()-timerPauseAt;});}catch(e){D.paused=true;throw e;}timerPauseAt=null;}D.paused=value;if(!value)C.timers.start();D.changed();};
  D.skip=function(ms){if(!Number.isFinite(ms)||ms<0)throw new Error('Enter a non-negative duration.');D.backup();var oldOffset=D.offset;D.offset+=ms;try{D.mutate('Time skipped',function(s){C.timers.reconcileInto(s,D.paused?timerPauseAt:C.clock.now());});}catch(e){D.offset=oldOffset;throw e;}D.message('Virtual clock advanced '+(ms/3600000).toFixed(2)+' h');D.changed();};
  D.setSetting=function(key,value){if(value===null||value===undefined){delete D.settings[key];C.settings.override(key,undefined);}else{D.settings[key]=value;C.settings.override(key,value);}D.changed();};
  D.quality=function(tier){D.setSetting('quality',tier);C.settingsSchema.graphicsKeys.forEach(function(k){D.setSetting(k,tier);});};
  D.cancelJobs=function(){D.jobs.forEach(function(job){job.cancelled=true;});D.jobs.clear();D.burn=0;D.recording=null;if(D.ui.jobStatus)D.ui.jobStatus.textContent='';};
  D.chunk=function(id,step,finish){if(D.jobs.has(id))D.jobs.get(id).cancelled=true;var job={cancelled:false,progress:0};D.jobs.set(id,job);function work(){if(job.cancelled||(!D.opened&&!D.immersive))return;try{var start=root.performance.now(),done=false;do{done=step(job);if(done)break;}while(root.performance.now()-start<8);if(D.ui.jobStatus)D.ui.jobStatus.textContent=id+' '+Math.round(job.progress*100)+'%';if(done){D.jobs.delete(id);finish(job);if(D.ui.jobStatus)D.ui.jobStatus.textContent='';}else root.setTimeout(work,0);}catch(e){D.jobs.delete(id);D.message(e.message,true);}}root.setTimeout(work,0);return job;};
  D.resetOverrides=function(){D.cancelJobs();if(D.disposePreview)D.disposePreview();if(D.exitImmersive)D.exitImmersive();C.settings.clearOverrides();D.settings=Object.create(null);D.force={tier:'',card:'',variant:'random',sticky:false};if(C.packs)C.packs.forceNext(null);D.luck=1;D.burn=0;D.setVisualRate(1);if(D.paused){if(C.state.current.packs.timerStartedAt!=null)C.state.current.packs.timerStartedAt+=C.clock.now()-timerPauseAt;D.paused=false;timerPauseAt=null;C.timers.start();}var p=C.timers.progress();if(C.state.current.pendingReveal)C.state.current.pendingReveal.committedAt=Math.max(0,C.state.current.pendingReveal.committedAt-(stamps[(C.state.current.pendingReveal.cards[0]||{}).instanceId]||0));[C.state.current.inventory,C.state.current.pendingReveal&&C.state.current.pendingReveal.cards||[]].forEach(function(items){items.forEach(function(i){if(stamps[i.instanceId]!=null)i.pulledAt=Math.max(0,i.pulledAt-stamps[i.instanceId]);});});stamps=Object.create(null);D.offset=0;D.cap=baseCap;D.regen='1';C.config.packs.maxStored=baseCap;C.config.packs.regenMs=baseRegen;C.state.current.packs.ready=Math.min(baseCap,C.state.current.packs.ready);C.state.current.packs.timerStartedAt=C.state.current.packs.ready>=baseCap?null:Date.now()-p*baseRegen;C.presentation.openingRate=1;root.document.body.classList.remove('dev-outlines','dev-layers','dev-hits','dev-force-idle');D.changed();};
  D.persistWorkspace=function(){if(!D.sandbox||suppressWorkspace)return;try{D.write(realKey+'.dev-sandbox.workspace',{offset:D.offset,cap:D.cap,regen:D.regen,settings:D.settings,metadata:D.metadata,stamps:stamps,paused:D.paused,timerPauseAt:timerPauseAt});}catch(_){D.message('Sandbox workspace could not persist.',true);}};
  D.switchSandbox=function(value){if(C.opening.phase!=='idle')throw new Error('Finish opening before switching saves.');D.persistWorkspace();undoContexts[C.config.storage.key]=undo;suppressWorkspace=true;try{D.resetOverrides();}finally{suppressWorkspace=false;}D.sandbox=!!value;stamps=Object.create(null);C.state.setStorageContext(value?realKey+'.dev-sandbox':realKey);D.restoreWorkspace();C.state.load();undo=undoContexts[C.config.storage.key]||null;C.events.emit('save:replaced',C.state.current);Object.keys(D.settings).forEach(function(k){C.settings.override(k,D.settings[k]);});D.changed();};
  D.restoreWorkspace=function(){if(!D.sandbox)return;var w=D.read(realKey+'.dev-sandbox.workspace',{});D.offset=Number(w.offset)||0;D.cap=Math.max(1,Math.min(99,Number(w.cap)||baseCap));D.regen=w.regen||'1';D.settings=w.settings||{};D.metadata=w.metadata||{};stamps=w.stamps||Object.create(null);D.paused=!!w.paused;timerPauseAt=D.paused?(Number(w.timerPauseAt)||C.clock.now()):null;C.config.packs.maxStored=D.cap;C.config.packs.regenMs=D.regen==='instant'?1:baseRegen/(Number(D.regen)||1);};
  D.isVisual=function(target){return !target||!!target.closest('.collectible-card,.pack-unit,.opening-foil')||!target.closest('[data-tool-surface]');};
  D.setVisualRate=function(rate){D.visualRate=Math.max(.1,Math.min(4,Number(rate)||1));C.fx.presentationRate=D.visualRate;root.document.getAnimations().forEach(function(a){if(!a.effect||D.isVisual(a.effect.target))a.updatePlaybackRate(D.visualRate);});D.changed();};
  D.prepare=function(){
    var params=new URLSearchParams(root.location.search);D.sandbox=params.get('sandbox')==='1';C.presentation.gallery=!!params.get('gallery')&&params.get('gallery')!=='presets'&&params.get('gallery')!=='ui'; // Preset gallery belongs to the lazy studio, which needs normal card detail.
    C.clock.now=function(){return Date.now()+D.offset;};C.state.encode=encoded;C.state.beforeWrite=function(){if(D.offset||D.cap!==baseCap||D.regen!=='1'||D.force.tier||D.force.card||D.force.variant!=='random'||D.luck!==1)D.backup();};
    C.timers.tick=function(now){
      now=D.paused?timerPauseAt:now==null?C.clock.now():now;if(!C.state.current)return originals.tick(now);
      // Timer reconciliation owns packs only. Do not copy every card, journal
      // entry and photo descriptor once a second when stock has not changed.
      var next={packs:Object.assign({},C.state.current.packs)},ready=next.packs.ready,anchor=next.packs.timerStartedAt,result=C.timers.reconcileInto(next,now);
      if(ready!==next.packs.ready||anchor!==next.packs.timerStartedAt){
        try{if(D.offset||D.cap!==baseCap||D.regen!=='1')D.backup();var candidate=D.clone(C.state.current);candidate.packs=next.packs;if(!C.state.commit(C.state.validate(candidate,true)))throw new Error('Timer change could not persist; stock is unchanged.');}
        catch(e){D.message(e.message,true);return {ready:ready,gained:0};}
      }
      if(result.gained)C.events.emit('pack:ready',result);C.events.emit('timer:tick',{now:now});return result;
    };C.timers.progress=function(now){return originals.progress(D.paused?timerPauseAt:now);};
    if(D.sandbox)C.state.setStorageContext(realKey+'.dev-sandbox');D.restoreWorkspace();
    C.events.on('opening:resolve',function(request){var f=D.force;D.backup();request.options={forcedTier:f.tier||null,forcedCard:f.card||null,forcedVariant:f.variant==='random'?undefined:f.variant||null,luck:D.luck};});
    C.events.on('opening:prepareCommit',function(s){s.pendingReveal.cards.forEach(function(i){stamps[i.instanceId]=D.offset;});});
    C.events.on('opening:committed',function(event){if(D.trackLuck)D.trackLuck(event);if(!D.force.sticky){D.force.tier='';D.force.card='';D.force.variant='random';D.changed();}});
    Object.keys(D.settings).forEach(function(k){C.settings.override(k,D.settings[k]);});
  };
  function summarize(value,depth){if(depth>2)return '…';if(value&&value.nodeType)return '<'+value.nodeName+'>';if(value instanceof Error)return value.message;if(Array.isArray(value))return value.slice(0,8).map(function(v){return summarize(v,depth+1);});if(value&&typeof value==='object'){var out={};Object.keys(value).slice(0,12).forEach(function(k){if(k!=='parentNode')out[k]=summarize(value[k],depth+1);});return out;}return typeof value==='function'?'[function]':value;}
  C.events.emit=function(name,payload){if(D.opened&&D.capture&&!D.logPaused){D.logs.push({at:C.clock.now(),name:name,payload:summarize(payload,0)});if(D.logs.length>1000)D.logs.shift();}return originals.emit.call(C.events,name,payload);};
  ['warn','error'].forEach(function(level){var original=root.console[level];root.console[level]=function(){if(D.opened){D.errors.push({at:Date.now(),level:level,message:Array.from(arguments).map(function(a){return typeof a==='string'?a:JSON.stringify(summarize(a,0));}).join(' ')});if(D.errors.length>200)D.errors.shift();}original.apply(root.console,arguments);};});
  root.addEventListener('error',function(e){if(!D.opened)return;D.errors.push({at:Date.now(),level:'error',message:e.message});});
  root.addEventListener('unhandledrejection',function(e){if(!D.opened)return;D.errors.push({at:Date.now(),level:'error',message:String(e.reason)});});
  root.document.addEventListener('animationstart',function(e){if(D.visualRate!==1&&D.isVisual(e.target))e.target.getAnimations().forEach(function(a){a.updatePlaybackRate(D.visualRate);});},true);
  root.document.addEventListener('transitionrun',function(e){if(D.visualRate!==1&&D.isVisual(e.target))e.target.getAnimations().forEach(function(a){a.updatePlaybackRate(D.visualRate);});},true);
  D.clearAcquisitionOverride=function(id){delete stamps[id];};
  D.editTimestamp=function(id,time){var stamp=stamps[id];delete stamps[id];try{D.mutate('Acquisition date changed',function(s){s.inventory.find(function(i){return i.instanceId===id;}).pulledAt=time;});}catch(e){if(stamp!=null)stamps[id]=stamp;throw e;}};
  D.workspace=function(){return D.clone({offset:D.offset,cap:D.cap,regen:D.regen,settings:D.settings,metadata:D.metadata,stamps:stamps});};
  D.applySnapshotWorkspace=function(w){if(!w)return;stamps=D.clone(w.stamps||{});if(D.sandbox){D.offset=Number(w.offset)||0;D.metadata=w.metadata||{};}else{Object.keys(stamps).forEach(function(id){stamps[id]=Number(stamps[id])||0;});}};
  var animate=root.Element.prototype.animate;if(animate)root.Element.prototype.animate=function(){var animation=animate.apply(this,arguments);if(D.isVisual(this))animation.updatePlaybackRate(D.visualRate);return animation;};
  D.init=function(){D.selectedPack=D.pack().id;D.selectedCard=D.card().id;D.startups.forEach(function(fn){fn();});var order=['Save','Packs and time','Pulls','Cards and inventory','Variants lab','Opening and reveal','Quality and performance','View and debug','Checks','Fun'];D.groups=new Map(order.filter(function(g){return D.groups.has(g);}).map(function(g){return [g,D.groups.get(g)];}).concat(Array.from(D.groups).filter(function(pair){return !order.includes(pair[0]);})));D.mountShell();if(D.paused)C.timers.stop();if(C.presentation.gallery)D.openGallery(new URLSearchParams(root.location.search).get('gallery'));};
})(window.Cardable,window);
