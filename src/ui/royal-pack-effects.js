/* Royal wrapper effects extend the existing scheduler, commit and reveal flow.
 * sideTear (milestone C) replaced the old holder box: tear both sides, doors open, a carpet unrolls. */
(function(C,root) {
  'use strict';
  var node=C.packMarkup.node;
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function ease(n){return 1-Math.pow(1-clamp(n),3);}
  function moving(){return !C.motion.reduced&&C.settings.policy.animation>=2;}
  C.packTransitions.register('goldShine',function(host,sourcePack,target,adopt,options){
    var age=0,lastPaint=-Infinity,done=false,adopted=false,old=null,shine=node('div','royal-swap-shine',host);
    shine.setAttribute('aria-hidden','true');
    var duration=moving()?C.config.royalPack.swapMs:C.config.packSwap.reducedMs;
    if(options.incomingAlready){old=C.packMarkup.unit(host,false,sourcePack).el;old.classList.add('royal-swap-old');target.style.opacity=0;}
    function clean(){shine.remove();if(old)old.remove();target.style.opacity='';target.style.maskImage='';target.style.webkitMaskImage='';target.style.maskSize='';target.style.maskPosition='';}
    return {duration:duration,update:function(dt){
      if(done)return false;age+=dt;
      var p=clamp(age/duration),travel=moving()&&C.settings.policy.reflection>=1;
      if(age-lastPaint<1000/(C.settings.policy.animationHz||20)&&p<1)return true;lastPaint=age;
      if(!adopted&&p>=.45){adopt();adopted=true;}
      var q=clamp((p-.45)/.55);
      if(old)old.style.opacity=1-ease(p/.7);
      target.style.opacity=adopted?ease(q):options.incomingAlready?0:1-ease(p/.7);
      if(adopted&&travel){target.style.maskImage='linear-gradient(115deg,#000 40%,transparent 60%)';target.style.webkitMaskImage=target.style.maskImage;target.style.maskSize='300% 100%';target.style.maskPosition=(100-q*100)+'% 0';}
      shine.style.opacity=travel?Math.sin(p*Math.PI)*.24:0;
      shine.style.transform=travel?'translateX('+(-150+p*300)+'%)':'none';
      if(p===1){if(!adopted){adopt();adopted=true;}done=true;clean();return false;}return true;
    },destroy:function(){done=true;clean();}};
  });
  // Royal opening, milestone C: tear both sides, the sleeve opens onto a small red carpet, the card follows.
  C.packOpenings.register('sideTear',{bind:function(host,foil,pack){
    var STRIP=12,cfg=C.config.royalPack,context=null,interior=null,layer=null,runner=null,tabs=[null,null],strips=[null,null],doors=[null,null];
    var pr=[0,0],torn=[false,false],snap=[null,null],fall=[null,null],drag=null,state='idle',stateAge=0,lastPaint=-Infinity,announced=false;
    var shape='polygon(1.6% 0,98.4% 0,100% 1.1%,100% 98.9%,98.4% 100%,1.6% 100%,0 98.9%,0 1.1%)';
    function still(){return C.motion.reduced||C.settings.policy.animation===0;}
    function pct(n){return (Math.round(n*100)/100)+'%';}
    function clipFor(side,p){
      // Strip clone: the not-yet-peeled lower part of the side strip.
      var y=p*100,l=side===0;
      return l?'polygon(0 '+y+'%,'+STRIP+'% '+y+'%,'+STRIP+'% 100%,1.6% 100%,0 98.9%)':'polygon('+(100-STRIP)+'% '+y+'%,100% '+y+'%,100% 98.9%,98.4% 100%,'+(100-STRIP)+'% 100%)';
    }
    function bodyClip(){
      // The main wrapper with each peeled strip cut away from the top down.
      var l=pr[0],r=pr[1],pts=[];
      pts.push(l>0?[STRIP,0]:[1.6,0]);
      if(r>0){pts.push([100-STRIP,0]);if(r<1)pts.push([100-STRIP,r*100],[100,r*100]);else pts.push([100-STRIP,100]);}
      else pts.push([98.4,0],[100,1.1]);
      if(r<1){pts.push([100,98.9],[98.4,100]);}
      if(l<1){pts.push([1.6,100],[0,98.9]);if(l>0)pts.push([0,l*100],[STRIP,l*100]);}
      else pts.push([STRIP,100]);
      return 'polygon('+pts.map(function(p){return pct(p[0])+' '+pct(p[1]);}).join(',')+')';
    }
    function applyBody(){foil.style.clipPath=pr[0]>0||pr[1]>0?bodyClip():'';}
    function clearAll(){
      [interior,layer,runner].concat(tabs,strips,doors).forEach(function(el){if(el&&el.remove)el.remove();});
      interior=layer=runner=null;tabs=[null,null];strips=[null,null];doors=[null,null];
      pr=[0,0];torn=[false,false];snap=[null,null];fall=[null,null];drag=null;state='idle';stateAge=0;announced=false;
      host.classList.remove('royal-doors-open');foil.style.clipPath='';
    }
    function build(){
      clearAll();
      interior=node('div','royal-interior',host);host.insertBefore(interior,foil);interior.setAttribute('aria-hidden','true');
      interior.style.clipPath=shape;
      runner=node('div','royal-runner',interior);
      node('i','royal-runner__cloth',runner);node('i','royal-runner__roll',runner);node('i','royal-runner__card',runner);
      layer=node('div','royal-tear-layer',host);
      [0,1].forEach(function(side){
        var el=C.packMarkup.foil(host,pack);el.classList.add('royal-strip');if(C.packFaces)C.packFaces.foil(el,{charge:1,t:0});el.style.opacity=1;el.style.clipPath=clipFor(side,0);el.setAttribute('aria-hidden','true');strips[side]=el;
        var tab=node('button','royal-tear-tab royal-tear-tab--'+(side?'right':'left'),layer);tab.type='button';tab.tabIndex=-1;
        tab.setAttribute('aria-label',(side?'Right':'Left')+' tear strip. Drag down, or press Enter.');
        node('span','royal-tear-tab__arrow',tab,'↓');node('span','royal-tear-tab__label',tab,'TEAR');tabs[side]=tab;
      });
      layout();
    }
    function layout(){
      [0,1].forEach(function(side){
        if(!tabs[side])return;
        var y=torn[side]?100:pr[side]*100;
        tabs[side].style.top='calc('+Math.min(y,86)+'% + 1.5%)';
        tabs[side].style.opacity=torn[side]?0:1;tabs[side].style.pointerEvents=torn[side]?'none':'auto';
        if(strips[side])strips[side].style.clipPath=clipFor(side,Math.min(1,pr[side]));
      });
      applyBody();
    }
    function height(){return host.getBoundingClientRect().height||C.config.shell.packHeight;}
    function finishSide(side){
      if(torn[side])return;torn[side]=true;snap[side]=null;fall[side]={age:0};pr[side]=1;
      layout();C.fx.wake();
      if(torn[0]&&torn[1]&&state==='idle'){state='doors';stateAge=0;context.announce('Both sides torn. The royal sleeve opens.');openDoors();}
      else context.announce((side?'Right':'Left')+' side torn.');
    }
    function openDoors(){
      // Doors are clones of the wrapper hinged on the outer edges; the real foil steps aside.
      [0,1].forEach(function(side){
        var el=C.packMarkup.foil(host,pack);el.classList.add('royal-door');if(C.packFaces)C.packFaces.foil(el,{charge:1,t:0});el.style.opacity=1;
        el.style.clipPath=side?'polygon(50% 0,'+(100-STRIP)+'% 0,'+(100-STRIP)+'% 100%,50% 100%)':'polygon('+STRIP+'% 0,50% 0,50% 100%,'+STRIP+'% 100%)';
        el.style.transformOrigin=side?(100-STRIP)+'% 50%':STRIP+'% 50%';el.setAttribute('aria-hidden','true');doors[side]=el;
      });
      host.classList.add('royal-doors-open');
    }
    function paintDoors(p){
      var s=still(),e=1-Math.pow(1-p,3);
      doors.forEach(function(d,side){
        if(!d)return;
        d.style.transform=s?'none':'rotateY('+((side?1:-1)*e*104)+'deg)';
        d.style.opacity=s?1-e:(e>.9?1-(e-.9)*10:1);
      });
    }
    function paintRunner(p){
      var e=1-Math.pow(1-clamp(p),3);
      runner.style.setProperty('--roll',e.toFixed(3));runner.style.opacity=still()?e:Math.min(1,p*4);
      runner.style.setProperty('--card',clamp((p-.55)/.45).toFixed(3));
    }
    function clamp(n){return Math.max(0,Math.min(1,n));}
    var api={usesSharedCut:false,fallbackMs:cfg.fallbackMs,
      hint:'Drag each side strip down to tear it away. Or press Enter.',actionLabel:'Tear',
      begin:function(ctx){context=ctx;build();ctx.announce(api.hint);},
      start:function(event){
        if(!context||state!=='idle'||event.button!==0||event.isPrimary===false)return;
        var target=event.target&&event.target.closest&&event.target.closest('.royal-tear-tab');if(!target)return;
        var side=tabs.indexOf(target);if(side<0||torn[side])return;
        drag={id:event.pointerId,side:side,y:event.clientY,p:pr[side],height:height()};
        if(host.setPointerCapture)host.setPointerCapture(event.pointerId);host.classList.add('is-pull-dragging');
        if(event.preventDefault)event.preventDefault();C.events.emit('cut:started');C.fx.wake();
      },
      move:function(event){
        if(!drag||event.pointerId!==drag.id)return;
        var p=clamp(drag.p+(event.clientY-drag.y)/(drag.height*.8));pr[drag.side]=p;layout();C.events.emit('cut:progress',p);
        if(p>=.92){var s=drag.side;api.release(event);finishSide(s);}
        C.fx.wake();
      },
      release:function(event){
        if(!drag||event&&event.pointerId!==drag.id)return;
        var id=drag.id;drag=null;host.classList.remove('is-pull-dragging');
        if(host.hasPointerCapture&&host.hasPointerCapture(id))host.releasePointerCapture(id);
      },
      advance:function(){
        if(!context||state!=='idle')return;
        var side=torn[0]?1:0;if(torn[side])return;
        snap[side]={from:pr[side],age:0};C.fx.wake();
      },
      reset:function(){clearAll();context=null;},
      clearReveal:function(){clearAll();},
      dissolve:function(){},
      geometry:function(){var z=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];return {axis:'y',path:[{x:.5,y:0},{x:.5,y:1}],halves:[z,z],normal:{x:1,y:0}};},
      tear:function(){},
      update:function(dt){
        if(!context)return false;
        var moving=false,reduced=still();
        [0,1].forEach(function(side){
          if(snap[side]){
            snap[side].age+=dt;var q=clamp(snap[side].age/(reduced?1:260));pr[side]=snap[side].from+(1-snap[side].from)*(1-Math.pow(1-q,3));layout();moving=true;
            if(q>=1)finishSide(side);
          }
          if(fall[side]&&strips[side]){
            fall[side].age+=dt;var f=clamp(fall[side].age/(reduced?1:520));
            strips[side].style.transform=reduced?'none':'translate('+(side?1:-1)*f*14+'px,'+f*f*160+'px) rotate('+(side?1:-1)*f*18+'deg)';
            strips[side].style.opacity=1-f;moving=true;
            if(f>=1){strips[side].remove();strips[side]=null;fall[side]=null;}
          }
        });
        if(state==='doors'){
          stateAge+=dt;
          var doorMs=reduced?420:cfg.doorsMs,delay=reduced?0:cfg.carpetDelayMs,carpetMs=reduced?420:cfg.carpetMs,total=Math.max(doorMs,delay+carpetMs)+(reduced?0:cfg.carpetHoldMs),t=stateAge;
          paintDoors(clamp(t/doorMs));
          paintRunner(clamp((t-delay)/carpetMs));
          if(t>=total){var ctx=context;state='done';ctx.reveal();}
          return true;
        }
        if(state==='idle'){
          stateAge+=dt;
          // A quiet pulse on the open tabs so the gesture is found.
          if(!reduced&&C.settings.policy.animation>=2){
            var k=(Math.sin(stateAge/700)+1)/2;
            tabs.forEach(function(t,side){if(t&&!torn[side])t.style.setProperty('--tab-pulse',(.55+.45*k).toFixed(3));});
            moving=true;
          }
        }
        return moving||!!drag;
      },
      get active(){return !!drag||state==='doors';}
    };
    return api;
  }});
})(window.Cardable,window);
