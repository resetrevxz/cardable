(function(C,root){
  'use strict';
  var profiles=C.data.qualityProfiles;
  var hardware={webgl2:false,maxTexture:0,maxBuffer:0,accelerated:false,samples:0,probeMs:0},slow=false,slowMs=0,notified=false,started=false;
  function eligibility(h){var reason=!h.webgl2?'WebGL 2 is unavailable.':!h.accelerated?'Hardware acceleration is unavailable.':Math.min(h.maxTexture,h.maxBuffer)<4096?'Requires 4096 px textures and renderbuffers.':h.samples<12?'Checking rendering capacity…':h.probeMs>24?'Rendering capacity is below the Very High budget.':'';return {available:!reason,reason:reason};}
  function availability(){if(slow)return {available:false,reason:'High is active after sustained slow rendering. Restart to check again.'};return eligibility(hardware);}
  function changed(){if(C.settings){C.settings.refreshQuality();}C.events.emit('quality:availability',availability());}
  function guard(state,ms,limit){if(!Number.isFinite(ms)||ms<=0||ms>1000)return {slowMs:0,fallback:false};var threshold=Math.max(25,1000/Math.max(20,Math.min(60,limit||60))*1.35),next=ms>threshold?state.slowMs+ms:Math.max(0,state.slowMs-ms*2);return {slowMs:next,fallback:next>=3000};}
  C.quality={profiles:profiles,resolve:function(tier){return Object.assign({},profiles[tier]||profiles.medium);},eligibility:eligibility,guard:guard,availability:availability,
    get profile(){return this.resolve(C.settings?C.settings.get('quality'):'medium');},
    effective:function(tier){return tier==='very-high'&&!availability().available?'high':tier;},
    observe:function(ms,limit){if(C.settings.snapshot.quality!=='very-high'||slow||!availability().available)return;var next=guard({slowMs:slowMs},ms,limit);slowMs=next.slowMs;if(!next.fallback)return;slow=true;changed();if(C.ui&&!notified&&C.settings.get('veryHighQuiet')!==true){notified=true;C.ui.toast('High graphics is active to keep rendering responsive.',{label:'Don’t ask again',run:function(){C.settings.set('veryHighQuiet',true);}},'info',{duration:9000});}},
    probe:function(){if(started)return;started=true;var canvas=root.document.createElement('canvas'),gl;
      try{gl=canvas.getContext('webgl2',{powerPreference:'high-performance',antialias:false});if(gl){hardware.webgl2=true;hardware.maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);hardware.maxBuffer=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);var ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER));hardware.accelerated=!/swiftshader|llvmpipe|software|microsoft basic/i.test(name);}}catch(_){hardware.webgl2=false;}
      if(!gl||!hardware.accelerated||Math.min(hardware.maxTexture,hardware.maxBuffer)<4096){if(gl){var end=gl.getExtension('WEBGL_lose_context');if(end)end.loseContext();}changed();return;}
      // Twelve bounded startup paints share Cardable's frame queue; no idle probe remains.
      canvas.width=canvas.height=256;var last=null,total=0;
      function sample(now){if(root.document.hidden){var interrupted=gl.getExtension('WEBGL_lose_context');if(interrupted)interrupted.loseContext();canvas.width=canvas.height=1;gl=null;hardware.probeMs=Infinity;hardware.samples=12;changed();return;}var begin=root.performance.now();gl.clearColor(.12,.15,.2,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.flush();var elapsed=root.performance.now()-begin;if(last!==null){var expected=C.frame?1000/C.frame.cap():0;elapsed=Math.max(elapsed,Math.max(0,now-last-(Number.isFinite(expected)?Math.max(16.67,expected):16.67)));}last=now;total+=elapsed;hardware.samples++;
        if(hardware.samples<12){root.requestAnimationFrame(sample);return;}hardware.probeMs=total/12;var end=gl.getExtension('WEBGL_lose_context');if(end)end.loseContext();canvas.width=canvas.height=1;gl=null;changed();}
      root.requestAnimationFrame(sample);
    }
  };
  C.events.on('app:ready',function(){C.quality.probe();});
  C.events.on('fx:frame',function(e){if(!root.document.hidden&&root.document.hasFocus()&&!(C.menu&&C.menu.afk)&&!C.settings.batterySaving)C.quality.observe(e.realDt,e.targetFps);});
})(window.Cardable,window);
