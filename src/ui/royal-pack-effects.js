/* Royal wrapper effects extend the existing scheduler, commit and reveal flow. */
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
  C.packOpenings.register('cutThenBox',{bind:function(host,foil,pack){
    var cfg=C.config.royalPack,boxStage=null,button=null,lid=null,boxState='',age=0,lastPaint=-Infinity,context=null,ready=false,decor=null;
    var fragments=null,fragmentCtx=null,triangles=[],fragmentAge=0,fragmentPaint=-Infinity;
    function clearFragments(){if(fragments)fragments.remove();fragments=null;fragmentCtx=null;triangles=[];fragmentAge=0;fragmentPaint=-Infinity;}
    function clearReveal(){if(decor)decor.remove();decor=null;}
    function clearBox(){if(boxStage)boxStage.remove();boxStage=null;button=null;lid=null;boxState='';ready=false;}
    function activate(){if(boxState!=='waiting'||!ready||!context.canActivate())return;boxState='opening';age=0;lastPaint=-Infinity;button.disabled=true;button.querySelector('.royal-box-hint').hidden=true;context.phase('boxOpening');context.announce('Opening the royal card holder.');C.fx.wake();}
    var api={usesSharedCut:true,fallbackMs:cfg.fallbackMs,
      begin:function(){},release:function(){},tear:function(){},clearReveal:clearReveal,
      reset:function(){clearFragments();clearBox();clearReveal();context=null;},
      activate:activate,
      afterTear:function(next){
        clearBox();clearReveal();context=next;boxState='waiting';age=0;lastPaint=-Infinity;
        boxStage=node('div','royal-holder-stage',host.parentElement);
        button=node('button','royal-holder',boxStage);button.type='button';button.disabled=true;button.setAttribute('aria-label','Royal card holder. Click or press Enter to open.');button.setAttribute('aria-keyshortcuts','Enter');
        node('i','royal-box-ring',button);node('i','royal-box-light',button);
        var body=node('span','royal-holder-box',button);node('i','royal-box-body',body);node('i','royal-box-interior',body);
        lid=node('span','royal-box-lid',body);C.royalPackArt.crown(lid,'royal-box-crown');node('span','royal-box-engraving',body,C.config.gameName.toUpperCase());node('i','royal-box-shine',body);
        var hint=node('span','royal-box-hint',button,'Click');hint.hidden=true;
        button.addEventListener('click',activate);context.announce('A royal card holder rises. Click it or press Enter to open.');
      },
      update:function(dt){
        if(!button||!context)return false;age+=dt;
        if(age-lastPaint<1000/(C.settings.policy.animationHz||20))return true;lastPaint=age;
        var travel=moving(),ambient=travel&&C.settings.policy.ambient;
        if(boxState==='waiting'){
          var p=clamp(age/cfg.boxRiseMs),float=ambient&&p===1?Math.sin(age/2400)*2:0;
          button.style.opacity=ease(p);button.style.setProperty('--royal-box-y',travel?(55*(1-ease(p))+float)+'px':'0px');
          if(p===1&&!ready){ready=true;button.disabled=false;if(C.input.modality==='keyboard')button.focus({preventScroll:true});}
          button.querySelector('.royal-box-hint').hidden=age<cfg.boxHintMs;
          return ambient||age<cfg.boxHintMs;
        }
        if(boxState==='opening'){
          var open=clamp(age/cfg.boxOpenMs),hinge=ease(clamp((open-.18)/.7));
          lid.style.transform=travel?'rotateX('+(-108*hinge)+'deg)':'none';lid.style.opacity=travel?1:1-hinge;
          button.style.setProperty('--royal-box-light',Math.sin(open*Math.PI)*.5);
          button.style.setProperty('--royal-box-shine-x',(-130+open*260)+'%');
          button.style.setProperty('--royal-box-shine',travel&&C.settings.policy.reflection>=1?Math.sin(open*Math.PI)*.35:0);
          if(open===1){
            var pending=C.state.current.pendingReveal,instance=pending.cards[Number(pending.keptCount)||0],fallback=!C.rarity(C.card(instance.cardId).rarity).openingIntro,ctx=context;
            clearBox();
            if(fallback){decor=node('div','royal-reveal-emblem',host.parentElement);decor.setAttribute('aria-hidden','true');C.royalPackArt.crown(decor,'royal-reveal-crown');node('i','royal-reveal-shine',decor);}
            ctx.reveal(fallback);return true;
          }return true;
        }return false;
      },
      updateReveal:function(phase,time){
        if(!decor)return;if(phase!=='rising'){clearReveal();return;}
        var p=clamp(time/cfg.fallbackMs);decor.dataset.mono=C.config.rarityColorMode==='mono';
        decor.style.opacity=Math.sin(p*Math.PI)*.65;decor.style.setProperty('--royal-glint',moving()?Math.pow(Math.sin(p*Math.PI),6):0);
        decor.style.setProperty('--royal-sheen-x',moving()?(-130+p*260)+'%':'0%');
      },
      dissolve:function(glass,p,dt){
        if(!moving()||C.settings.policy.particles<=0){clearFragments();return;}
        if(!fragments){
          var rect=host.getBoundingClientRect();fragments=node('canvas','royal-triangle-field',host);fragments.width=Math.round(rect.width);fragments.height=Math.round(rect.height);fragments.setAttribute('aria-hidden','true');fragmentCtx=fragments.getContext('2d');
          var polygons=Array.from(glass.el.querySelectorAll('.royal-mosaic polygon')),step=C.settings.policy.animation===3?1:2;
          polygons.forEach(function(poly,i){if(i%step)return;triangles.push({points:poly.getAttribute('points').split(' ').map(function(point){return point.split(',').map(Number);}),color:poly.getAttribute('fill'),seed:i});});
        }
        fragmentAge+=dt;if(fragmentAge-fragmentPaint<1000/(C.settings.policy.animationHz||20)&&p<1)return;fragmentPaint=fragmentAge;
        var q=fragmentCtx,w=fragments.width,h=fragments.height;q.clearRect(0,0,w,h);
        triangles.forEach(function(tri){
          var points=tri.points.map(function(point){return [point[0]/180*w,point[1]/266*h];}),cx=points.reduce(function(n,pt){return n+pt[0];},0)/3,cy=points.reduce(function(n,pt){return n+pt[1];},0)/3;
          q.save();q.translate(cx+Math.sin(tri.seed*2.4)*p*24,cy-p*(18+tri.seed%17));q.rotate(Math.sin(tri.seed)*p*.7);q.globalAlpha=Math.sin(clamp(p/.12)*Math.PI/2)*(1-p);q.fillStyle=tri.color;q.beginPath();points.forEach(function(pt,i){if(i)q.lineTo(pt[0]-cx,pt[1]-cy);else q.moveTo(pt[0]-cx,pt[1]-cy);});q.closePath();q.fill();q.restore();
        });
        if(p===1)clearFragments();
      },get active(){return false;}
    };return api;
  }});
})(window.Cardable,window);
