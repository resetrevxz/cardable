(function(C,root){
  'use strict';
  var node=C.packMarkup.node;
  function ring(parent,cls){var el=node('div',cls||'titan-ring',parent);for(var i=0;i<24;i++){var tick=node('i','titan-ring-tick',el);tick.style.setProperty('--tick-angle',i*15+'deg');}return el;}
  function face(parent,pack){
    var el=node('div','pack-skin-layer titan-face',parent);
    node('div','titan-carbon titan-carbon--left',el);node('div','titan-carbon titan-carbon--right',el);
    node('div','titan-armor titan-armor--left',el);node('div','titan-armor titan-armor--right',el);
    ['left','right'].forEach(function(side){[44,60].forEach(function(y){var bolt=node('i','titan-bolt titan-bolt--'+side,el);bolt.style.top=y+'%';});});
    [[8,9],[92,9],[8,91],[92,91],[8,35],[92,35],[8,65],[92,65]].forEach(function(p){var rivet=node('i','titan-rivet',el);rivet.style.left=p[0]+'%';rivet.style.top=p[1]+'%';});
    node('strong','titan-header',el,C.config.gameName);node('span','titan-label',el,pack.name.toUpperCase());
    var core=node('div','titan-core',el);ring(core);node('i','titan-core-window',core);node('i','titan-core-cross',core);
    node('span','titan-series',el,'HALO SERIES');node('span','titan-serial',el,pack.design.batch);
    node('span','titan-footer',el,'SERIES '+pack.design.series+' / CBL VAULT');node('i','titan-rim',el);
    var steam=node('div','titan-steam',el);for(var i=0;i<C.config.titanPack.steamCount;i++){var wisp=node('i','',steam);wisp.style.left=(i%2?92:5)+'%';wisp.style.top=(37+Math.floor(i/2)*18)+'%';wisp.style.setProperty('--steam-offset',i*400+'ms');}
    return el;
  }
  function render(el,pack){el.dataset.skin=pack.skin;el.querySelectorAll('.pack-wrapper').forEach(function(w){if(!w.querySelector('.titan-face'))face(w,pack);});}
  function quality(el,pose,time,reduced,state){
    var policy=C.settings.policy,rank=Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')),policy.reflection),cfg=C.config.titanPack;
    el.dataset.packQuality=C.settingsSchema.tiers[rank];
    if(state.appeared==null||time<state.appeared){state.appeared=time;state.last=-Infinity;}
    var stage=el.closest('.opening-stage'),phase=stage&&stage.dataset.phase,charging=phase==='charging'||phase==='draining',waiting=!!el.closest('[data-state="waiting"]');
    if(state.waiting!==waiting){state.waiting=waiting;state.appeared=time;state.last=-Infinity;}
    if(time-state.last<1000/(policy.animationHz||20)&&phase===state.phase)return !!state.active;state.last=time;state.phase=phase;
    var age=time-state.appeared,active=!reduced&&policy.ambient&&policy.animation>=2&&rank>=2;
    var fill=charging?Number(el.dataset.chargeFill)||0:waiting?C.timers.progress():1;
    var lit=Math.floor(fill*24);el.querySelectorAll('.titan-ring').forEach(function(r){if(r.dataset.lit===String(lit))return;r.dataset.lit=lit;Array.from(r.children).forEach(function(t,i){t.classList.toggle('is-lit',i<lit);});});
    el.style.setProperty('--titan-core-opacity',charging?.5+fill*.4:waiting?.12:.65+(active?Math.sin(age/cfg.coreMs*Math.PI*2)*.08:0));
    var sweep=(rank>=3?age%cfg.rimMs:age)/1400,shine=active&&sweep<1;
    el.style.setProperty('--titan-rim-x',(shine?-140+sweep*280:140)+'%');el.style.setProperty('--titan-rim-opacity',shine?Math.sin(sweep*Math.PI)*.2:0);
    el.style.setProperty('--titan-light-x',(rank>=3&&active?42+(pose.ry||0):42)+'%');
    el.style.setProperty('--titan-steam-y',active?(-age%6000/6000*12)+'px':'0px');
    el.style.setProperty('--titan-steam-opacity',active&&rank>=3&&!waiting?policy.particles*(charging?fill*.18:.08):0);
    state.active=active&&(rank>=3||age<1400);return state.active;
  }
  C.titanPackArt={face:face,ring:ring};
  C.packSkins.register('titan',{renderIdle:render,renderWaiting:render,renderWrapper:render,quality:quality,
    fluidTint:['#EDF5FF','#A7B9C9'],leakTint:'#EEF5FC',cutGlow:'#F2F7FF',counterThumb:function(host){var thumb=node('span','pack-counter-thumb pack-counter-thumb--titan',host);node('i','titan-counter-core',thumb);node('span','pack-counter-glyph',host,'TITAN');}});
})(window.Cardable,window);
