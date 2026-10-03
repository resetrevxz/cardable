/* Bounded vector snapshots, ordered dithering and fragment motion. No DOM copies,
 * image downloads, pixel reads, private timers or additional FX subscriptions. */
(function(C,root){
  'use strict';
  var bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],registry=Object.create(null);
  function clamp(v){return Math.max(0,Math.min(1,v));}
  function dither(el,p){
    if(p>=1){el.style.maskImage='';el.style.webkitMaskImage='';return;}
    var step=Math.floor(clamp(p)*16);if(el._ditherStep===step)return;el._ditherStep=step;
    var cells=bayer.map(function(v,i){return v<step?'<rect x="'+i%4+'" y="'+Math.floor(i/4)+'" width="1" height="1" fill="white"/>':'';}).join('');
    var url='url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 4 4" shape-rendering="crispEdges">'+cells+'</svg>')+'")';
    el.style.maskImage=url;el.style.webkitMaskImage=url;el.style.maskSize='8px 8px';
  }
  function snapshot(pack,width,height,source){
    var canvas=root.document.createElement('canvas');canvas.width=width;canvas.height=height;var ctx=canvas.getContext('2d');
    var gradient=ctx.createLinearGradient(0,0,width,height),accent=pack.counterStyle.accent;
    if(accent&&accent.startsWith('var('))accent=root.getComputedStyle(root.document.documentElement).getPropertyValue(accent.slice(4,-1)).trim();
    gradient.addColorStop(0,pack.design.material==='aged-plastic'?'#D8D2BE':'#DBDCE2');gradient.addColorStop(.55,accent&&accent.charAt(0)==='#'?accent:'#6D707B');gradient.addColorStop(1,pack.design.material==='aged-plastic'?'#B8AB88':'#CBCDD4');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);ctx.strokeStyle='#FFF8';ctx.strokeRect(2,2,width-4,height-4);
    ctx.fillStyle='#171A1B';ctx.textAlign='center';ctx.font='600 '+width*.115+'px Inter, sans-serif';ctx.fillText(C.config.gameName,width*.5,height*.17);
    ctx.font=width*.055+'px monospace';ctx.fillText(pack.name.toUpperCase(),width*.5,height*.27);
    var logo=Array.from(root.document.querySelectorAll('.pack-company-logo')).find(function(img){return img.getAttribute('src')===pack.design.companyLogo;})||source&&source.querySelector('.pack-company-logo');if(logo&&logo.complete&&logo.naturalWidth){var w=width*.58,h=w*logo.naturalHeight/logo.naturalWidth;ctx.drawImage(logo,width*.21,height*.44-h*.5,w,h);}
    else{ctx.strokeStyle='#202427';ctx.lineWidth=width*.018;ctx.beginPath();ctx.arc(width*.5,height*.49,width*.2,.6,Math.PI*2-.6);ctx.stroke();ctx.strokeRect(width*.44,height*.49-width*.06,width*.12,width*.12);}
    ctx.font=width*.039+'px monospace';ctx.fillText(pack.tagline,width*.5,height*.72);ctx.fillText('SERIES 01 / CARDABLE',width*.5,height*.86);
    var skin=C.packSkins.get(pack);if(skin.snapshot)skin.snapshot(ctx,width,height);return canvas;
  }
  C.packTransitions={register:function(id,factory){registry[id]=factory;},create:function(id,host,sourcePack,targetEl,adopt,options){return registry[id]?registry[id](host,sourcePack,targetEl,adopt,options||{}):null;},dither:dither};
  C.packTransitions.register('tornadoPixel',function(host,sourcePack,targetEl,adopt,options){
    var cfg=C.config.classicPack,rank=C.settings.policy.animation,still=C.motion.reduced||rank===0,low=rank===1;
    var vortex=still?C.config.packSwap.reducedMs/2:low?cfg.lowFadeMs/2:rank===2?cfg.mediumVortexMs:cfg.vortexMs,arrival=still?C.config.packSwap.reducedMs/2:low?cfg.lowFadeMs/2:cfg.appearanceMs;
    if(options.fragmentsOnly){vortex=C.config.openingMotion.dissolveMs;arrival=0;}
    var age=0,lastPaint=-Infinity,adopted=false,done=false,width=host.getBoundingClientRect().width||180,height=host.getBoundingClientRect().height||300;
    height=Math.min(height,width*1.8);width=Math.round(width);height=Math.round(height);
    var canvas=root.document.createElement('canvas');canvas.className='pack-pixel-transition';canvas.width=Math.round(width*1.5);canvas.height=Math.round(height*1.3);canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
    var ctx=canvas.getContext('2d'),image=snapshot(sourcePack,width,height,targetEl),small=root.document.createElement('canvas'),tiny=small.getContext('2d');
    function clean(){canvas.remove();targetEl.style.opacity='';targetEl.style.maskImage='';targetEl.style.webkitMaskImage='';targetEl.style.maskSize='';targetEl.style.removeProperty('--classic-scan-wipe');delete targetEl._ditherStep;}
    return {duration:vortex+arrival,update:function(dt){
      if(done)return false;
      if((C.motion.reduced||C.settings.policy.animation===0)&&!still){still=true;vortex=0;arrival=C.config.packSwap.reducedMs;age=0;if(!adopted){adopt();adopted=true;}}
      if(C.settings.policy.animation===1)low=true;
      age+=dt;
      var interval=1000/(C.settings.policy.animationHz||20);
      if(age-lastPaint<interval&&age<vortex+arrival)return true;lastPaint=age;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      var p=vortex?clamp(age/vortex):1;
      if(options.fragmentsOnly&&p===1){done=true;clean();return false;}
      if(!adopted&&p===1){adopt();adopted=true;targetEl.style.opacity=0;}
      if(!adopted){
        targetEl.style.opacity=options.incomingAlready?0:still?1-p:clamp(1-p/.22);
        if(still&&options.incomingAlready){ctx.globalAlpha=1-p;ctx.drawImage(image,width*.25,height*.15);ctx.globalAlpha=1;}
        if(!still){
          var pixel=Math.max(1,Math.round(1+(cfg.pixelMax-1)*clamp(p/.4))),w=Math.ceil(width/pixel),h=Math.ceil(height/pixel);
          small.width=w;small.height=h;tiny.imageSmoothingEnabled=false;tiny.drawImage(image,0,0,w,h);ctx.imageSmoothingEnabled=false;
          var spiral=low?0:options.fragmentsOnly?p:clamp((p-.28)/.72),size=Math.max(pixel,Math.round(width/cfg.pixelColumns)),ox=width*.25,oy=height*.15;
          for(var y=0;y<height;y+=size)for(var x=0;x<width;x+=size){
            var col=Math.floor(x/size),row=Math.floor(y/size),threshold=bayer[(row%4)*4+col%4]/16;
            if(low?threshold<p:p>.88&&threshold<(p-.88)/.12)continue;
            var dx=x+size/2-width/2,dy=y+size/2-height/2,r=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)+spiral*(options.fragmentsOnly ? .15 : Math.PI*4);
            var radius=r*(options.fragmentsOnly?1+spiral*.25:1-spiral),cx=ox+width/2+Math.cos(angle)*radius,cy=oy+height/2+Math.sin(angle)*radius-(options.fragmentsOnly?p*28:0);
            ctx.save();ctx.globalAlpha=clamp(p/.12)*(low||options.fragmentsOnly?1-p:1-spiral*.8);ctx.translate(cx,cy);if(!low)ctx.rotate(spiral*(options.fragmentsOnly ? .4 : Math.PI*2));var s=size*(1-spiral*(options.fragmentsOnly ? .25 : .7));
            ctx.drawImage(small,x/width*w,y/height*h,Math.min(size,width-x)/width*w,Math.min(size,height-y)/height*h,-s/2,-s/2,s,s);ctx.restore();
          }
          if(!low&&C.settings.policy.particles>0){ctx.fillStyle='#D8D2BE';for(var i=0;i<24;i++){var a=i*2.399+spiral*15,radius=(20+i*4)*(1-spiral);ctx.globalAlpha=(1-spiral)*.4;ctx.fillRect(ox+width/2+Math.cos(a)*radius,oy+height/2+Math.sin(a)*radius,2,2);}ctx.globalAlpha=1;}
        }
      }else{
        var q=clamp((age-vortex)/arrival);targetEl.style.opacity=q;if(!still)dither(targetEl,q);targetEl.style.setProperty('--classic-scan-wipe',q*100+'%');
        if(q===1){done=true;clean();return false;}
      }
      return true;
    },destroy:function(){done=true;clean();}};
  });
})(window.Cardable,window);
