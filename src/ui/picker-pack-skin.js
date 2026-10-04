(function(C){
  'use strict';
  var node=C.packMarkup.node;
  function face(parent,pack){
    var face=node('div','pack-skin-layer picker-face',parent);face.setAttribute('aria-hidden','true');
    node('strong','picker-header',face,C.config.gameName);
    var panels=node('div','picker-panels',face);
    for(var i=0;i<3;i++){
      var panel=node('div','picker-panel picker-panel--'+i,panels);panel.style.setProperty('--panel-index',i);
      var window=node('div','picker-window',panel);node('i','picker-window-glow',window);
      var back=node('div','picker-window-back',window);node('span','picker-back-mark',back,'C');
      node('span','picker-numeral',panel,String(i+1));
    }
    node('i','picker-reticle',face);node('strong','picker-label',face,pack.name.toUpperCase());
    node('span','picker-tagline',face,pack.tagline);node('span','picker-footer',face,'SERIES '+pack.design.series+' / '+pack.design.batch+' / CBL');
    node('i','picker-pearl-sheen',face);return face;
  }
  function render(el,pack){el.dataset.skin=pack.skin;el.querySelectorAll('.pack-wrapper').forEach(function(w){if(!w.querySelector('.picker-face'))face(w,pack);});}
  function quality(el,pose,time,reduced,state){
    var policy=C.settings.policy,rank=Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')),policy.reflection);
    el.dataset.packQuality=C.settingsSchema.tiers[rank];
    var stage=el.closest('.opening-stage'),phase=stage&&stage.dataset.phase,waiting=!!el.closest('[data-state="waiting"]'),charge=phase==='charging'||phase==='draining';
    if(phase!=='dissolving')el.style.removeProperty('--picker-dissolve');
    if(state.appeared==null||time<state.appeared||state.waiting!==waiting){state.appeared=time;state.waiting=waiting;state.last=-Infinity;}
    var age=time-state.appeared,move=!reduced&&policy.ambient&&policy.animation>=2;
    if(time-state.last<1000/(policy.animationHz||20)&&state.phase===phase)return state.active;
    state.last=time;state.phase=phase;
    var sweep=(rank===3?age%7000:age)/1300,sheen=move&&rank>=1&&sweep<1;
    el.style.setProperty('--picker-sheen-x',(-150+Math.min(1,sweep)*300)+'%');
    el.style.setProperty('--picker-sheen-opacity',sheen?Math.sin(sweep*Math.PI)*.45:0);
    el.style.setProperty('--picker-specular-x',(rank===3?45+(pose.ry||0)*1.3:45)+'%');
    var fill=charge?Number(el.dataset.chargeFill)||0:waiting?C.timers.progress():1;
    var windows=el.querySelectorAll('.picker-window');windows.forEach(function(w,i){
      var glow=charge?Math.max(.05,Math.min(1,fill*3-i)):waiting?.08+fill*.3:move&&rank>=2?.22+(1+Math.sin(age/3000*Math.PI*2-i*2.094))*(rank===3?.2:.12):.35;
      if(!charge&&!waiting&&move&&rank>=2&&age<900)glow=.08+.7*Math.max(0,Math.min(1,(age-i*220)/240));
      w.style.setProperty('--picker-window-light',glow.toFixed(3));
      w.style.setProperty('--picker-back-y',move&&rank===3?(Math.sin(age/4200*Math.PI*2-i)*2)+'px':'0px');
      w.style.setProperty('--picker-back-turn',charge&&!reduced?(i-1)*fill*7+'deg':'0deg');
    });
    state.active=move&&(rank>=2||sheen);return state.active;
  }
  C.pickerPackArt={face:face};
  C.packSkins.register('picker',{renderIdle:render,renderWaiting:render,renderWrapper:render,quality:quality,
    fluidTint:['#C8FFF1','#2DE2B8'],leakTint:'#D8FFF5',cutGlow:'#DCFFF8',
    counterThumb:function(host){var thumb=node('span','pack-counter-thumb pack-counter-thumb--picker',host);for(var i=0;i<3;i++)node('i','picker-counter-window',thumb);node('span','pack-counter-glyph',host,'1/3');}});
})(window.Cardable);
