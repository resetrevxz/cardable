/* Vault motion and gesture state use the existing presentation subscription. */
(function(C,root){
  'use strict';
  var node=C.packMarkup.node;
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function ease(n){return 1-Math.pow(1-clamp(n),3);}
  function moving(){return !C.motion.reduced&&C.settings.policy.animation>=2;}
  C.packTransitions.register('monolithDrop',function(host,source,target,adopt,options){
    var cfg=C.config.titanPack,duration=moving()?cfg.swapMs:C.config.packSwap.reducedMs,age=0,last=-Infinity,adopted=false,done=false;
    var old=C.packMarkup.unit(host,false,source).el;old.classList.add('titan-swap-old');
    var field=node('div','titan-impact',host);field.setAttribute('aria-hidden','true');node('i','titan-shockwave',field);node('i','titan-impact-dust',field);
    target.style.opacity=0;
    function clean(){old.remove();field.remove();target.style.opacity='';target.style.transform='';target.style.removeProperty('--titan-camera-dip');}
    return {duration:duration,update:function(dt){
      if(done)return false;age+=dt;var p=clamp(age/duration),travel=moving();
      if(age-last<1000/(C.settings.policy.animationHz||20)&&p<1)return true;last=age;
      if(!adopted&&p>=.12){adopt();adopted=true;}
      var drop=clamp((p-.12)/.48),settle=clamp((p-.6)/.4),y=drop<1?-180*(1-ease(drop)):Math.sin(settle*Math.PI*2)*Math.exp(-settle*6)*8;
      var dip=travel&&C.settings.policy.animation===3?Math.sin(settle*Math.PI)*cfg.dipPx:0;
      old.style.opacity=1-ease(clamp(p/.65));old.style.transform=travel?'translateY('+ease(clamp(p/.65))*36+'px)':'none';
      target.style.opacity=adopted?ease(clamp(p/.4)):0;target.style.transform=travel?'translateY('+(y+dip)+'px)':'none';
      var impact=clamp((p-.6)/.4);field.style.setProperty('--titan-impact-scale',1+impact*1.5);field.style.setProperty('--titan-impact-opacity',travel&&C.settings.policy.particles>0?Math.sin(impact*Math.PI)*.2:0);
      if(p===1){done=true;clean();return false;}return true;
    },destroy:function(){done=true;clean();}};
  });
  C.packOpenings.register('vaultDial',{bind:function(host,foil,pack){
    var cfg=C.config.titanPack,ticks=0,progress=0,drag=null,context=null,dial=null,indicator=null,door=null,age=0,pulseAge=cfg.tickPulseMs,last=-Infinity,unsealing=false;
    function release(event){if(!drag||event&&event.pointerId!==drag.id)return;var id=drag.id;drag=null;if(host.hasPointerCapture(id))host.releasePointerCapture(id);}
    function clear(){release();if(dial)dial.remove();if(indicator)indicator.remove();dial=null;indicator=null;door=null;unsealing=false;context=null;foil.classList.remove('is-vault-dial','is-vault-unsealing');['--titan-dial-turn','--titan-tick-pulse','--titan-door-x','--titan-door-opacity','--titan-unseal-light','--titan-bolts'].forEach(function(k){foil.style.removeProperty(k);});}
    function paint(){
      foil.style.setProperty('--titan-dial-turn',((ticks*cfg.tickRadians+progress)*180/Math.PI)+'deg');
      if(dial){dial.setAttribute('aria-valuenow',ticks);dial.setAttribute('aria-valuetext',ticks+' of '+cfg.tickCount+' bolts unlocked');}
      if(indicator){indicator.querySelectorAll('i').forEach(function(light,i){light.classList.toggle('is-lit',i<ticks);});indicator.querySelector('span').textContent=ticks+' / '+cfg.tickCount;}
    }
    function advance(){
      if(!context||!context.canActivate()||unsealing||ticks>=cfg.tickCount)return;ticks++;progress=0;pulseAge=0;paint();
      context.announce('Vault tick '+ticks+' of '+cfg.tickCount+'.');C.fx.wake();
      if(ticks===cfg.tickCount){release();unsealing=true;age=0;last=-Infinity;foil.classList.add('is-vault-unsealing');context.unseal();}
    }
    return {hint:'Rotate the vault dial clockwise through three ticks. Enter advances one tick.',actionLabel:'Next tick',advance:advance,
      begin:function(ctx){
        clear();context=ctx;ticks=0;progress=0;age=0;last=-Infinity;pulseAge=cfg.tickPulseMs;foil.classList.add('is-vault-dial');door=foil.querySelector('.titan-face');
        dial=node('div','titan-dial',door);dial.setAttribute('role','slider');dial.setAttribute('tabindex','0');dial.setAttribute('aria-label','Vault combination dial. Drag clockwise or press Enter.');dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax',cfg.tickCount);dial.setAttribute('aria-keyshortcuts','Enter');
        node('i','titan-dial-grip',dial);node('i','titan-dial-pointer',dial);
        var arrow=root.document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.classList.add('titan-dial-arrow');arrow.setAttribute('viewBox','0 0 100 100');arrow.setAttribute('aria-hidden','true');dial.appendChild(arrow);
        var arc=root.document.createElementNS('http://www.w3.org/2000/svg','path');arc.setAttribute('d','M25 24A36 36 0 1 1 19 68M18 55 19 68 32 67');arc.setAttribute('fill','none');arc.setAttribute('stroke','currentColor');arc.setAttribute('stroke-width','1');arrow.appendChild(arc);
        indicator=node('div','titan-dial-status',door);for(var i=0;i<cfg.tickCount;i++)node('i','',indicator);node('span','',indicator);paint();
      },
      start:function(event){
        if(!context||!context.canActivate()||event.button!==0||event.isPrimary===false||!event.target.closest('.titan-dial'))return;release();var r=dial.getBoundingClientRect();
        drag={id:event.pointerId,x:r.x+r.width/2,y:r.y+r.height/2,angle:Math.atan2(event.clientY-r.y-r.height/2,event.clientX-r.x-r.width/2)};host.setPointerCapture(event.pointerId);event.preventDefault();C.fx.wake();
      },move:function(event){
        if(!drag||event.pointerId!==drag.id||unsealing)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<12)return;
        var angle=Math.atan2(event.clientY-drag.y,event.clientX-drag.x),delta=angle-drag.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;drag.angle=angle;
        if(delta<=0||delta>.65)return;progress+=delta;if(progress>=cfg.tickRadians)advance();else paint();C.fx.wake();
      },release:release,reset:clear,
      update:function(dt){
        age+=dt;pulseAge+=dt;if(age-last<1000/(C.settings.policy.animationHz||20))return unsealing||!!drag||pulseAge<cfg.tickPulseMs;last=age;
        foil.style.setProperty('--titan-tick-pulse',moving()?Math.sin(clamp(pulseAge/cfg.tickPulseMs)*Math.PI)*.25:0);
        if(unsealing){var p=clamp(age/cfg.unsealMs),bolts=ease(clamp(p/.3)),open=ease(clamp((p-.22)/.78));foil.style.setProperty('--titan-bolts',bolts);foil.style.setProperty('--titan-door-x',moving()?open*115+'%':'0%');foil.style.setProperty('--titan-door-opacity',1-open);foil.style.setProperty('--titan-unseal-light',Math.sin(p*Math.PI)*.45);
          if(p===1){var ctx=context;clear();ctx.reveal();return true;}return true;}
        return !!drag||pulseAge<cfg.tickPulseMs;
      },
      dissolve:function(glass,p){var travel=moving();glass.el.style.setProperty('--titan-armor-split',travel?ease(p)*60+'%':'0%');glass.el.style.setProperty('--titan-armor-opacity',1-p);if(p===1){glass.el.style.removeProperty('--titan-armor-split');glass.el.style.removeProperty('--titan-armor-opacity');}},
      get active(){return !!drag||unsealing;}
    };
  }});
})(window.Cardable,window);
