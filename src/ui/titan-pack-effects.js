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
  // Titan opening, milestone D: a machined unlock knob on the shroud. Three clicks release the latches,
  // then the two halves of the shroud slide apart over a lit core.
  C.packOpenings.register('shroudDial',{bind:function(host,foil,pack){
    var cfg=C.config.titanPack,ticks=0,progress=0,drag=null,context=null,dial=null,leds=null,core=null,doors=[null,null],age=0,unsealing=false;
    function layer(){return foil.querySelector('.pack-print--face')||foil;}
    function release(event){if(!drag||event&&event.pointerId!==drag.id)return;var id=drag.id;drag=null;host.classList.remove('is-pull-dragging');if(host.hasPointerCapture&&host.hasPointerCapture(id))host.releasePointerCapture(id);}
    function clear(){
      release();[dial,leds,core].concat(doors).forEach(function(el){if(el&&el.remove)el.remove();});
      dial=leds=core=null;doors=[null,null];unsealing=false;context=null;ticks=0;progress=0;age=0;
      host.classList.remove('titan-doors-open');foil.style.removeProperty('--shroud-turn');
    }
    function paint(){
      if(dial){dial.style.setProperty('--shroud-turn',((ticks*cfg.tickRadians+progress)*180/Math.PI)+'deg');dial.setAttribute('aria-valuenow',ticks);dial.setAttribute('aria-valuetext',ticks+' of '+cfg.tickCount+' latches released');}
      if(leds){leds.querySelectorAll('i').forEach(function(light,i){light.classList.toggle('is-lit',i<ticks);});leds.querySelector('span').textContent=ticks+' / '+cfg.tickCount;}
    }
    function unseal(){
      unsealing=true;age=0;release();
      core=node('div','shroud-core',host);host.insertBefore(core,foil);core.setAttribute('aria-hidden','true');
      [0,1].forEach(function(side){
        var el=C.packMarkup.foil(host,pack);el.classList.add('shroud-door');if(C.packFaces)C.packFaces.foil(el,{charge:1,t:0});el.style.opacity=1;
        el.style.clipPath=side?'polygon(50% 0,100% 0,100% 100%,50% 100%)':'polygon(0 0,50% 0,50% 100%,0 100%)';el.setAttribute('aria-hidden','true');doors[side]=el;
      });
      if(dial)dial.style.visibility='hidden';
      host.classList.add('titan-doors-open');context.unseal();
    }
    function advance(){
      if(!context||!context.canActivate()||unsealing||ticks>=cfg.tickCount)return;ticks++;progress=0;paint();
      context.announce('Latch '+ticks+' of '+cfg.tickCount+' released.');C.fx.wake();
      if(ticks===cfg.tickCount)unseal();
    }
    return {hint:'Turn the knob clockwise through three clicks. Enter advances one click.',actionLabel:'Next click',advance:advance,
      begin:function(ctx){
        clear();context=ctx;
        dial=node('div','shroud-dial',layer());dial.setAttribute('role','slider');dial.setAttribute('tabindex','0');dial.setAttribute('aria-label','Shroud unlock knob. Drag clockwise or press Enter.');
        dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax',cfg.tickCount);dial.setAttribute('aria-keyshortcuts','Enter');
        leds=node('div','shroud-leds',layer());for(var i=0;i<cfg.tickCount;i++)node('i','',leds);node('span','',leds);paint();
      },
      start:function(event){
        if(!context||!context.canActivate()||event.button!==0||event.isPrimary===false||!event.target.closest('.shroud-dial'))return;release();
        var r=dial.getBoundingClientRect();drag={id:event.pointerId,x:r.x+r.width/2,y:r.y+r.height/2,angle:Math.atan2(event.clientY-r.y-r.height/2,event.clientX-r.x-r.width/2)};
        host.setPointerCapture(event.pointerId);host.classList.add('is-pull-dragging');event.preventDefault();C.fx.wake();
      },
      move:function(event){
        if(!drag||event.pointerId!==drag.id||unsealing)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<12)return;
        var angle=Math.atan2(event.clientY-drag.y,event.clientX-drag.x),delta=angle-drag.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;drag.angle=angle;
        if(delta<=0||delta>.65)return;progress+=delta;if(progress>=cfg.tickRadians)advance();else paint();C.fx.wake();
      },release:release,reset:clear,clearReveal:clear,
      dissolve:function(){},geometry:function(){var z=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];return {axis:'y',path:[{x:.5,y:0},{x:.5,y:1}],halves:[z,z],normal:{x:1,y:0}};},tear:function(){},
      update:function(dt){
        if(!unsealing)return !!drag;
        age+=dt;var p=clamp(age/(moving()?cfg.unsealMs:260)),open=ease(clamp((p-.12)/.88));
        doors.forEach(function(d,side){if(!d)return;d.style.transform=moving()?'translateX('+((side?1:-1)*open*62)+'%) rotateY('+((side?-1:1)*open*14)+'deg)':'none';d.style.opacity=moving()?1-Math.max(0,open-.7)*3.3:1-open;});
        if(core)core.style.opacity=.25+.75*ease(clamp(p/.5));
        if(p===1){var ctx=context;clear();ctx.reveal();}
        return true;
      },
      get active(){return !!drag||unsealing;}
    };
  }});
})(window.Cardable,window);
