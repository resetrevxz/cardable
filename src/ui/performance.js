(function(C,root){
  'use strict';
  var node=C.packMarkup.node,hud=node('aside','cb-performance',root.document.body),simple=node('output','cb-performance-simple',hud),panel=node('section','cb-performance-panel glass',hud);
  hud.hidden=true;simple.setAttribute('aria-label','FPS and one percent low');panel.setAttribute('aria-label','Advanced performance');
  var head=node('header','cb-performance-header',panel),handle=node('button','cb-performance-handle',head,'Performance'),corner=node('select','cb-performance-corner',head),copy=node('button','cb-action',head,'Copy report');handle.type=copy.type='button';head.appendChild(C.ui.create('help',{help:'performance',label:'Performance display help'}));handle.setAttribute('aria-label','Drag performance panel');corner.setAttribute('aria-label','Pin performance panel to corner');
  ['bottom-left','bottom-right','top-left','top-right'].forEach(function(c){var o=node('option','',corner,c.replace('-',' '));o.value=c;});
  var graph=node('canvas','cb-performance-graph',panel);graph.width=300;graph.height=52;graph.setAttribute('aria-label','Five seconds of frame times');
  function section(label){var d=node('details','cb-performance-section',panel);d.open=true;node('summary','',d,label);return node('pre','',d);}
  var timing=section('Frames'),resources=section('Resources'),context=section('Context');
  var frames=[],history=[],snapshot=null,mode='off',timer=null,longObserver=null,longTasks=0,eventCount=0,eventStart=0,lastGraph=0,boot=root.performance.now(),originals=null,rafIds=new Set(),timerIds=new Map(),glRefs=[],gpu='Unavailable',eventHook=null,hiddenNative=false;
  function percentile(sorted,p){if(!sorted.length)return 0;var i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);}
  function statistics(values){var v=values.filter(function(n){return Number.isFinite(n)&&n>0;}).sort(function(a,b){return a-b;}),sum=v.reduce(function(n,x){return n+x;},0),p99=percentile(v,.99),p999=percentile(v,.999);return {fps:v.length?1000/(sum/v.length):0,low1:p99?1000/p99:0,low01:p999?1000/p999:0,p50:percentile(v,.5),p95:percentile(v,.95),p99:p99,max:v.length?v[v.length-1]:0};}
  function clearMetrics(){frames=[];history=[];snapshot=null;longTasks=0;eventCount=0;eventStart=root.performance.now();}
  function instrument(){
    if(originals)return;originals={raf:root.requestAnimationFrame,cancel:root.cancelAnimationFrame,timeout:root.setTimeout,interval:root.setInterval,clearTimeout:root.clearTimeout,clearInterval:root.clearInterval,context:root.HTMLCanvasElement.prototype.getContext,emit:C.events.emit};
    root.requestAnimationFrame=function(fn){var id=originals.raf.call(root,function(at){rafIds.delete(id);fn(at);});rafIds.add(id);return id;};root.cancelAnimationFrame=function(id){rafIds.delete(id);return originals.cancel.call(root,id);};
    root.setTimeout=function(fn,ms){if(typeof fn!=='function')return originals.timeout.apply(root,arguments);var args=Array.prototype.slice.call(arguments,2),id=originals.timeout.call(root,function(){timerIds.delete(id);if(typeof fn==='function')fn.apply(root,args);},ms);timerIds.set(id,'timeout');return id;};
    root.setInterval=function(fn,ms){var args=Array.prototype.slice.call(arguments,2),id=originals.interval.apply(root,[fn,ms].concat(args));timerIds.set(id,'interval');return id;};
    root.clearTimeout=function(id){timerIds.delete(id);return originals.clearTimeout.call(root,id);};root.clearInterval=function(id){timerIds.delete(id);return originals.clearInterval.call(root,id);};
    root.HTMLCanvasElement.prototype.getContext=function(kind,options){var gl=originals.context.call(this,kind,options);if(gl&&/^webgl/.test(kind)&&!glRefs.some(function(r){return r.deref()===gl;})){glRefs.push(new WeakRef(gl));try{var ext=gl.getExtension('WEBGL_debug_renderer_info');if(ext)gpu=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);}catch(_){} }return gl;};
    eventHook=function(name,payload){eventCount++;return originals.emit(name,payload);};C.events.emit=eventHook;
    try{longObserver=new root.PerformanceObserver(function(list){longTasks+=list.getEntries().length;});longObserver.observe({type:'longtask',buffered:false});}catch(_){}
  }
  function uninstrument(){
    if(!originals)return;var o=originals;root.requestAnimationFrame=o.raf;root.cancelAnimationFrame=o.cancel;root.setTimeout=o.timeout;root.setInterval=o.interval;root.clearTimeout=o.clearTimeout;root.clearInterval=o.clearInterval;root.HTMLCanvasElement.prototype.getContext=o.context;if(C.events.emit===eventHook)C.events.emit=o.emit;
    originals=null;eventHook=null;rafIds.clear();timerIds.clear();glRefs=[];if(longObserver)longObserver.disconnect();longObserver=null;
  }
  function active(){return mode!=='off'&&!root.document.hidden&&!hiddenNative&&!C.fx.stats.paused;}
  function stopTimer(){if(timer!==null)root.clearInterval(timer);timer=null;}
  function sample(){
    if(!active())return;
    var now=root.performance.now();frames=frames.filter(function(f){return now-f.at<=5000;});history=history.filter(function(f){return now-f.at<=30000;});var stats=statistics(frames.map(function(f){return f.ms;}));
    var state=C.fx.stats.paused?'Paused':!C.fx.stats.running?'Idle':null;
    simple.textContent=state||'FPS '+Math.round(stats.fps)+'  1% low '+Math.round(stats.low1);
    if(mode!=='advanced')return;
    glRefs=glRefs.filter(function(r){var gl=r.deref();return gl&&!gl.isContextLost();});
    var memory=root.performance.memory,win=[root.innerWidth,root.innerHeight],screen=C.cutsceneReplay&&C.cutsceneReplay.active?'cutscene replay':C.studio&&C.studio.active?'studio':C.detail&&C.detail.phase!=='closed'?'detail':C.preferences&&C.preferences.open?'settings':C.inventory&&C.inventory.active?'inventory':'menu';
    snapshot={version:C.config.version,platform:root.navigator.platform,quality:C.settings.get('quality'),fps:stats.fps,low1:stats.low1,low01:stats.low01,p50:stats.p50,p95:stats.p95,p99:stats.p99,max:stats.max,
      dropped:frames.reduce(function(n,f){return n+Math.max(0,Math.round(f.ms/(1000/C.fx.stats.targetFps))-1);},0),longTasks:longTasks,memory:memory?Math.round(memory.usedJSHeapSize/1048576)+' / '+Math.round(memory.jsHeapSizeLimit/1048576)+' MiB':'Unavailable',
      dom:root.document.getElementsByTagName('*').length,animations:root.document.getAnimations().length,raf:rafIds.size,timers:timerIds.size,canvases:root.document.getElementsByTagName('canvas').length,webgl:glRefs.length,
      events:Math.round(eventCount*1000/Math.max(1,now-eventStart)),dpr:root.devicePixelRatio,resolutionScale:C.settings.policy.dpr,window:win.join(' × '),uiScale:C.native?C.settings.get('interfaceSize'):'browser native CSS',screen:screen,scene:C.cutscenes.active?C.cutscenes.active.spec?.kind||C.cutscenes.active.section||'cinematic':C.opening&&C.opening.phase,
      gpu:gpu,uptime:Math.round((now-boot)/1000),saveBytes:new TextEncoder().encode(C.state.encode(C.state.current)).length};
    eventCount=0;eventStart=now;
    timing.textContent=(state?state+' · ':'')+'FPS '+Math.round(stats.fps)+'  1% '+Math.round(stats.low1)+'  0.1% '+Math.round(stats.low01)+'\nFrame ms p50 '+stats.p50.toFixed(2)+' · p95 '+stats.p95.toFixed(2)+'\np99 '+stats.p99.toFixed(2)+' · max '+stats.max.toFixed(2)+'\nDropped '+snapshot.dropped+' · long tasks '+longTasks;
    resources.textContent='Heap '+snapshot.memory+'\nDOM '+snapshot.dom+' · animations '+snapshot.animations+'\nRAF pending '+snapshot.raf+' · timers '+snapshot.timers+'\nCanvases '+snapshot.canvases+' · WebGL observed '+snapshot.webgl+'\nBus '+snapshot.events+'/s · listeners '+C.events.listenerCount+'\nRAF/timers/GL: observed since Advanced enabled';
    context.textContent=snapshot.quality+' · '+snapshot.screen+' · '+snapshot.scene+'\nDPR '+snapshot.dpr+' · canvas cap '+snapshot.resolutionScale+'\nWindow '+snapshot.window+' · UI '+snapshot.uiScale+'\nGPU '+snapshot.gpu+'\nUptime '+snapshot.uptime+' s · save '+snapshot.saveBytes+' B'+'\nStorage '+storageEstimate+(C.performanceStats.adaptive.length?'\nAdaptive '+C.performanceStats.adaptive.slice(-3).join(', '):'');
  }
  function setMode(){
    if(hud.parentElement!==root.document.body)root.document.body.appendChild(hud);stopTimer();uninstrument();clearMetrics();mode=C.settings.get('performanceMode');if(C.settings.get('quality')==='very-low'&&mode==='advanced')mode='simple';hud.hidden=mode==='off';panel.hidden=mode!=='advanced';simple.hidden=mode==='advanced';hud.dataset.mode=mode;
    hud.dataset.corner=C.settings.get('performanceCorner')||'bottom-left';corner.value=hud.dataset.corner;
    if(mode==='advanced'&&active()){instrument();estimateStorage();}if(active()){sample();timer=root.setInterval(sample,500);}C.fx.wake();
  }
  function visibility(){stopTimer();if(!active()){uninstrument();simple.textContent='Paused';}else{if(mode==='advanced')instrument();clearMetrics();sample();timer=root.setInterval(sample,500);}}
  C.performanceStats={statistics:statistics,percentile:percentile,adaptive:[],get snapshot(){return snapshot;},get mode(){return mode;},report:function(){sample();var recent=statistics(history.map(function(f){return f.ms;})),min=history.length?Math.min.apply(null,history.map(function(f){return f.ms;})):0,avg=history.length?history.reduce(function(n,f){return n+f.ms;},0)/history.length:0;return 'Cardable performance report\n'+JSON.stringify(snapshot||{version:C.config.version,mode:mode},null,2)+'\nLast 30 s observed frame ms: min '+min.toFixed(2)+' / avg '+avg.toFixed(2)+' / max '+recent.max.toFixed(2)+'\nRAF/timers/WebGL are observed counts since Advanced was enabled. Idle has no rendered-frame samples. Storage estimate: '+storageEstimate;}};
  var storageEstimate='Unavailable';
  async function estimateStorage(){if(root.navigator.storage&&root.navigator.storage.estimate){try{var e=await root.navigator.storage.estimate();storageEstimate=Math.round(e.usage||0)+' / '+Math.round(e.quota||0)+' B';}catch(_){}}}
  copy.addEventListener('click',async function(){if(root.navigator.storage&&root.navigator.storage.estimate){try{var estimate=await root.navigator.storage.estimate();storageEstimate=Math.round(estimate.usage||0)+' / '+Math.round(estimate.quota||0)+' B';}catch(_){}}var ok=await C.detailPanel.copy(C.performanceStats.report(),copy);copy.textContent=ok?'Copied':'Copy unavailable';});
  var drag=null;
  handle.addEventListener('pointerdown',function(e){if(e.button!==0)return;var r=hud.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);e.preventDefault();});
  handle.addEventListener('pointermove',function(e){if(!drag||drag.id!==e.pointerId)return;hud.dataset.corner='custom';hud.style.left=Math.max(0,Math.min(root.innerWidth-hud.offsetWidth,drag.left+e.clientX-drag.x))+'px';hud.style.top=Math.max(0,Math.min(root.innerHeight-hud.offsetHeight,drag.top+e.clientY-drag.y))+'px';hud.style.right=hud.style.bottom='auto';});
  function release(){drag=null;}handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
  corner.addEventListener('change',function(){hud.removeAttribute('style');C.settings.set('performanceCorner',corner.value);});
  root.addEventListener('resize',function(){if(hud.dataset.corner==='custom'){hud.style.left=Math.max(0,Math.min(root.innerWidth-hud.offsetWidth,parseFloat(hud.style.left)||0))+'px';hud.style.top=Math.max(0,Math.min(root.innerHeight-hud.offsetHeight,parseFloat(hud.style.top)||0))+'px';}});
  root.document.addEventListener('keydown',function(e){if(e.key==='F3'&&!e.repeat){e.preventDefault();var choices=C.settings.get('quality')==='very-low'?['off','simple']:['off','simple','advanced'],next=choices[(choices.indexOf(C.settings.get('performanceMode'))+1)%choices.length];C.settings.set('showFps',false);C.settings.set('performanceMode',next);}},true);
  C.events.on('fx:frame',function(e){if(!active())return;frames.push({at:e.now,ms:e.realDt});history.push({at:e.now,ms:e.realDt});if(frames.length>5000)frames.shift();if(history.length>12000)history.shift();if(mode==='advanced'&&e.now-lastGraph>=1000/30){lastGraph=e.now;var q=graph.getContext('2d'),now=e.now;q.clearRect(0,0,300,52);q.strokeStyle='#999ba4';q.lineWidth=1;q.beginPath();frames.forEach(function(f,i){var x=300-(now-f.at)*.06,y=51-Math.min(50,f.ms*1.5);if(i===0)q.moveTo(x,y);else q.lineTo(x,y);});q.stroke();}});
  C.events.on('cutscene:quality',function(e){if(mode!=='advanced')return;C.performanceStats.adaptive.push(JSON.stringify(e));if(C.performanceStats.adaptive.length>20)C.performanceStats.adaptive.shift();});
  C.events.on('fx:visibility',visibility);root.document.addEventListener('visibilitychange',visibility);C.events.on('desktop:visibility',function(v){hiddenNative=!v;visibility();});
  ['performanceMode','performanceCorner','showFps','quality'].forEach(function(key){C.settings.onChange(key,setMode);});C.events.on('app:ready',setMode);C.performanceDisplay=hud;
})(window.Cardable,window);
