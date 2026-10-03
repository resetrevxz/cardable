(function(C,root){
  'use strict';
  var warmed=null;
  function create(){
    var spec,seed='secret',level=2,profile='safe',os=root.document.createElement('canvas'),q=os.getContext('2d',{alpha:false}),engine=null,shadowDone=false,skipped=false,model;
    var stats={backend:'canvas',frames:0,milestone:'A'};
    function resize(){var size=spec.os.buffers[Math.max(0,level)];if(os.width!==size[0]||os.height!==size[1]){os.width=size[0];os.height=size[1];}q.imageSmoothingEnabled=false;}
    function write(text,x,y,color){q.fillStyle=color||'#bfc3c8';q.font=Math.round(12*os.width/640)+'px "JetBrains Mono", monospace';q.textBaseline='top';q.fillText(text,Math.round(x),Math.round(y));}
    function typed(text,age,start,speed){var t=Math.max(0,age-start),stall=Math.min(.14,Math.max(0,t-.36))+Math.min(.1,Math.max(0,t-.8));return text.slice(0,Math.max(0,Math.floor((t-stall)*speed)));}
    function boot(age){
      q.fillStyle='#000';q.fillRect(0,0,os.width,os.height);var margin=Math.round(os.width*.046),unit=os.width/640,y=Math.round(18*unit),line=Math.round(19*unit),random=C.cutsceneMath.random(seed+':post:'+Math.floor(age*7));
      write(typed('NORTHSTAR BIOS v0.0.5',age,0,58),margin,y,'#eceef0');y+=line*1.55;
      if(age>.45){var memory=Math.min(65536,Math.floor(Math.max(0,age-.45)*143000/1024)*1024);write('MEMORY TEST '+String(memory).padStart(5,'0')+' KB'+(memory===65536?' ... OK':''),margin,y);}y+=line;
      write(typed('CARDABLE VIRTUAL ADAPTER ... OK',age,1.0,55),margin,y);y+=line;
      write(typed('PACK BUS .................. OK',age,1.45,68),margin,y);y+=line;
      write(typed('SECRET.DAT ........ FOUND',age,1.95,42),margin,y,age>3.1?'#d8dbde':'#bfc3c8');y+=line;
      write(typed('WARNING: unexpected file in pack.',age,2.7,56),margin,y,'#c8c8cc');y+=line*1.15;
      if(age>3.3){var corrupt='PACK BUS .... SECRET .... SECRET';corrupt=corrupt.split('').map(function(c,i){return random()<.13&&c!==' '?('@#$&_-%/\\|'[Math.floor(random()*10)]):c;}).join('');write(corrupt,margin,y,'#939aa1');if(profile==='safe'||Math.floor(age*4)%3===0)write('SECRET.DAT ........ FOUND',margin+7,y+line,'#8f989c');}y+=line*2;
      write(typed('Booting NorthStar OS...',age,4.15,52),margin,y,'#dedee2');
      if(age>4.5){var progress=age<5.2?Math.min(.99,(age-4.5)/.7):.99-(Math.floor(age*9)%4===1?.024:0);var width=Math.min(Math.round(340*unit),os.width-margin*2);q.strokeStyle='#70777a';q.strokeRect(margin,y+Math.round(22*unit),width,Math.round(12*unit));q.fillStyle='#8d979b';q.fillRect(margin+2,y+Math.round(24*unit),Math.floor((width-4)*progress),Math.round(8*unit));write(Math.round(progress*100)+'%',margin+width-Math.round(29*unit),y+Math.round(40*unit),'#a2aaaf');}
      model.cursor={x:margin,y:Math.min(os.height-18,y+58),shape:'text'};
      if(age<4.45&&Math.floor(age*1.4)%2===0)write('_',margin,Math.min(os.height-15,y+3),'#949ca0');
    }
    function lowPost(g,w,h,time){g.save();g.strokeStyle='rgba(0,0,0,.025)';g.lineWidth=1;for(var y=0;y<h;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}var shade=g.createRadialGradient(w*.5,h*.5,h*.12,w*.5,h*.5,Math.max(w,h)*.65);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=shade;g.fillRect(0,0,w,h);g.restore();}
    function calm(g,w,h,p){g.fillStyle='#000';g.fillRect(0,0,w,h);var visibility=Math.max(0,Math.sin(p*Math.PI));g.globalAlpha=visibility*.65;var cw=Math.min(360,w*.85),ch=110,x=(w-cw)/2,y=(h-ch)/2;g.fillStyle='#c8c8cc';g.fillRect(x,y,cw,ch);g.fillStyle='#22262d';g.fillRect(x+2,y+2,cw-4,22);g.fillStyle='#ddd';g.font='12px "JetBrains Mono",monospace';g.fillText('NorthStar boot failure',x+12,y+17);g.fillStyle='#17191c';g.fillText('SECRET.DAT ... FOUND',x+14,y+59);g.fillText('The pack contains an unexpected file.',x+14,y+81);g.globalAlpha=1;}
    return {
      stats:stats,
      start:function(next,value,light){spec=next;seed=String(value);profile=C.cutscenes.profile();level=['very-low','low','medium','high'].indexOf(C.settings.get('quality'));shadowDone=false;skipped=false;model={windows:[],icons:[],cursor:{x:0,y:0,shape:'arrow'},seed:seed};resize();
        if(warmed&&warmed.seed===seed){engine=warmed.engine;warmed=null;}else if(!light&&level>=2)engine=C.cutsceneScreenEngine.create();stats.backend=engine?engine.stats.backend:'canvas';},
      setProfile:function(value){profile=value;},
      setSkipped:function(){skipped=true;},
      setQuality:function(value){level=value;if(spec)resize();},
      paint:function(g,w,h,section,time,staticProgress){
        stats.frames++;if(staticProgress!==null&&staticProgress!==undefined){calm(g,w,h,staticProgress);return;}
        if(section.id==='fakeout'){
          var age=section.p*2.4,rise=1-C.cutsceneMath.smooth(age/.7),flip=C.cutsceneMath.smooth((age-2.19)/.42)*Math.PI;
          var glitch=!shadowDone&&age>=1;if(glitch)shadowDone=true;
          C.cutsceneCardBack.draw(g,w,h,{turn:Math.min(Math.PI/2-.01,flip),rise:rise*h*.075,opacity:C.cutsceneMath.smooth(age/.18),shadowSkip:glitch});return;
        }
        g.fillStyle='#000';g.fillRect(0,0,w,h);
        if(section.id==='black'){if(section.p>.625){q.fillStyle='#000';q.fillRect(0,0,os.width,os.height);if(Math.floor((section.p-.625)*4)%2===0)write('_',Math.round(os.width*.046),18,'#aaa');}else return;}
        else boot(section.id==='release'?5.99:section.p*6);
        var age=section.id==='boot'?section.p*6:0,effect={curve:.035,shift:age>3.3?.55:0,tear:age>3.3?.002:0,noise:.008};
        // Full's single partial POST flicker burst is gated again by the output limiter.
        if(profile==='full'&&section.id==='boot'&&age>3.35&&age<3.75)effect.flicker=Math.floor((age-3.35)*12)%2?.12:0;
        var source=section.id==='black'?os:engine?engine.render(os,w,h,time,effect,level):os;
        var aspect=os.width/os.height,dw=w,dh=w/aspect;if(dh>h){dh=h;dw=h*aspect;}var x=(w-dw)/2,y=(h-dh)/2;
        g.save();g.imageSmoothingEnabled=false;
        if(section.id==='release')g.globalAlpha=skipped?0:1-C.cutsceneMath.smooth(section.p*2);
        // GL already covers the viewport; the 2D fallback retains the complete POST.
        if(source!==os)g.drawImage(source,0,0,w,h);else{g.drawImage(source,x,y,dw,dh);if(section.id!=='black')lowPost(g,w,h,time);}g.restore();
        if(section.id==='release'){g.save();g.globalAlpha=C.cutsceneMath.smooth((section.p-.5)*2);C.secretBackground.draw(g,w,h,0,seed,true,profile,false);g.restore();}
      },
      backplate:function(g,w,h,time){var field=C.secretBackground.sample(seed,time);C.secretBackground.draw(g,w,h,field.time,seed,true,field.profile,C.motion.reduced||!C.settings.policy.animation);},
      releaseScene:function(){if(engine){engine.dispose();engine=null;}},
      stop:function(){this.releaseScene();},
      get scene(){return engine;},get model(){return model;}
    };
  }
  C.secretIntro={create:create,warmup:function(spec,seed){seed=String(seed);if(warmed&&warmed.seed===seed)return;if(warmed)warmed.engine.dispose();if(C.cutscenes.mode()==='light'||C.settings.get('quality')==='low')return;var engine=C.cutsceneScreenEngine.create(),canvas=root.document.createElement('canvas');canvas.width=480;canvas.height=270;var q=canvas.getContext('2d');q.fillStyle='#000';q.fillRect(0,0,480,270);engine.render(canvas,root.innerWidth,root.innerHeight,0,{},C.settings.get('quality')==='high'?3:2);warmed={seed:seed,engine:engine};}};
  C.cutscenes.register('secret',create);
})(window.Cardable,window);
