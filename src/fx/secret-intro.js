(function(C,root){
  'use strict';
  var warmed=null;
  function create(){
    var spec,seed='secret',level=2,profile='safe',os=root.document.createElement('canvas'),q=os.getContext('2d',{alpha:false}),engine=null,shadowDone=false,skipped=false,model,desktop=null;
    var stats={backend:'canvas',frames:0,milestone:'C'},channels=null,fieldTime=0,fieldFirstAt=3,fieldStarted=null,invertStep=0,fieldBeats=[];
    function resize(){var size=spec.os.buffers[Math.max(0,level)];if(os.width!==size[0]||os.height!==size[1]){os.width=size[0];os.height=size[1];}q.imageSmoothingEnabled=false;}
    function write(text,x,y,color){q.fillStyle=color||'#bfc3c8';q.font=Math.round(12*os.width/640)+'px "JetBrains Mono", monospace';q.textBaseline='top';q.fillText(text,Math.round(x),Math.round(y));}
    function typed(text,age,start,speed){var t=Math.max(0,age-start),stall=Math.min(.14,Math.max(0,t-.36))+Math.min(.1,Math.max(0,t-.8));return text.slice(0,Math.max(0,Math.floor((t-stall)*speed)));}
    function boot(age){
      q.save();q.setTransform(1,0,0,1,0,0);
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
      q.restore();
    }
    function lowPost(g,w,h,time){g.save();g.strokeStyle='rgba(0,0,0,.025)';g.lineWidth=1;for(var y=0;y<h;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}var shade=g.createRadialGradient(w*.5,h*.5,h*.12,w*.5,h*.5,Math.max(w,h)*.65);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=shade;g.fillRect(0,0,w,h);g.restore();}
    function lowScreen(g,x,y,w,h,effect){
      if(!effect.shift){g.drawImage(os,x,y,w,h);return;}
      if(!channels)channels=['#ff0000','#00ff00','#0000ff'].map(function(color){var c=root.document.createElement('canvas');return {canvas:c,q:c.getContext('2d',{alpha:false}),color:color};});
      g.save();g.globalCompositeOperation='lighter';
      channels.forEach(function(part,i){var c=part.canvas,cq=part.q;if(c.width!==os.width||c.height!==os.height){c.width=os.width;c.height=os.height;}cq.globalCompositeOperation='source-over';cq.drawImage(os,0,0);cq.globalCompositeOperation='multiply';cq.fillStyle=part.color;cq.fillRect(0,0,c.width,c.height);g.drawImage(c,x+(i===0?effect.shift:i===2?-effect.shift:0),y,w,h);});g.restore();
    }
    function calm(g,w,h,p){
      var M=C.cutsceneMath,ms=p*spec.light.ms;fieldTime=0;fieldFirstAt=3;
      g.fillStyle='#000';g.fillRect(0,0,w,h);
      if(ms<1000){C.cutsceneCardBack.draw(g,w,h,{turn:0,rise:0,opacity:(1-M.smooth((ms-600)/400))*.7});return;}
      if(ms<2100){
        var visibility=M.smooth((ms-1000)/300)*(1-M.smooth((ms-1650)/450)),cw=Math.min(360,w*.85),ch=110,x=(w-cw)/2,y=(h-ch)/2;
        g.save();g.globalAlpha=visibility*.65;g.fillStyle='#c8c8cc';g.fillRect(x,y,cw,ch);g.fillStyle='#22262d';g.fillRect(x+2,y+2,cw-4,22);g.fillStyle='#ddd';g.font='12px "JetBrains Mono",monospace';g.fillText('NorthStar / exception',x+12,y+17);g.fillStyle='#17191c';g.fillText('SECRET.DAT ... FOUND',x+14,y+59);g.fillText('The pack contains an unexpected file.',x+14,y+81);g.restore();return;
      }
      g.save();g.globalAlpha=M.smooth((ms-3200)/800);C.secretBackground.draw(g,w,h,0,seed,true,'safe',true);g.restore();
      var bloom=M.smooth((ms-2100)/450),fade=1-M.smooth((ms-3300)/700),size=Math.min(w*.105,h*.1,64),word='Secret';
      g.save();g.fillStyle='#c9c9c9';g.globalAlpha=fade*.65;g.fillRect(w/2-1,h/2-1,2,2);
      g.font=Math.round(size)+'px "JetBrains Mono",monospace';g.textBaseline='middle';
      for(var i=0;i<6;i++){g.globalAlpha=fade*M.smooth((ms-2200-i*180)/280)*bloom;g.fillText(word[i],w/2+(i-3)*size*.63,h/2);}g.restore();
    }
    function resurrection(g,w,h,ageMs){
      var film=C.cutscenes.active,scale=(C.settings.get('revealSpeed')==='fast'?.7:1)/(film?film.rate:1),presentation=film?film.presentationMs:ageMs;
      if(fieldStarted===null){fieldStarted=presentation-ageMs*scale;fieldFirstAt=spec.resurrection.firstCycleMs/1000*scale;C.secretBackground.begin(seed,0,profile,fieldFirstAt);}
      fieldTime=skipped?0:Math.max(0,(presentation-fieldStarted)/1000);if(skipped){fieldFirstAt=3;C.secretBackground.begin(seed,0,profile,fieldFirstAt);}
      C.secretBackground.setTime(seed,fieldTime);
      var picture=C.secretBackground.draw(g,w,h,fieldTime,seed,true,profile,false,skipped?null:{resurrection:true,ageMs:ageMs});
      if(picture.step>invertStep){invertStep=picture.step;fieldBeats.push({id:'invert',key:'invert:'+invertStep,ms:36000+ageMs});}
    }
    return {
      stats:stats,
      start:function(next,value,light){this.releaseScene();if(desktop)desktop.stop();spec=next;seed=String(value);profile=C.cutscenes.profile();level=['very-low','low','medium','high'].indexOf(C.settings.get('quality'));shadowDone=false;skipped=false;fieldStarted=null;fieldTime=0;fieldFirstAt=3;invertStep=0;fieldBeats=[];resize();desktop=C.secretOSScene.create(spec,seed,os);model=desktop.model;
        if(warmed&&warmed.seed===seed){engine=warmed.engine;warmed=null;}else if(!light&&level>=2)engine=C.cutsceneScreenEngine.create();stats.backend=engine?engine.stats.backend:'canvas';},
      setProfile:function(value){profile=value;},
      setSkipped:function(){skipped=true;},
      setQuality:function(value){level=value;if(spec)resize();},
      paint:function(g,w,h,section,time,staticProgress){
        stats.frames++;if(staticProgress!==null&&staticProgress!==undefined){calm(g,w,h,staticProgress);return;}
        if(section.id==='resurrection'){resurrection(g,w,h,section.p*4000);return;}
        if(section.id==='fakeout'){
          var age=section.p*2.4,rise=1-C.cutsceneMath.smooth(age/.7),flip=C.cutsceneMath.smooth((age-2.19)/.42)*Math.PI;
          var glitch=!shadowDone&&age>=1;if(glitch)shadowDone=true;
          C.cutsceneCardBack.draw(g,w,h,{turn:Math.min(Math.PI/2-.01,flip),rise:rise*h*.075,opacity:C.cutsceneMath.smooth(age/.18),shadowSkip:glitch});return;
        }
        g.fillStyle='#000';g.fillRect(0,0,w,h);
        if(section.id==='black'){if(section.p>.625){q.fillStyle='#000';q.fillRect(0,0,os.width,os.height);if(Math.floor((section.p-.625)*4)%2===0)write('_',Math.round(os.width*.046),18,'#aaa');}else return;}
        else if(section.id==='boot')boot(section.p*6);
        var age=section.id==='boot'?section.p*6:0,effect={curve:.035,shift:age>3.3?.55:0,tear:age>3.3?.002:0,noise:.008};
        if(['desktop','breakdown','stop','collapse'].indexOf(section.id)>=0)effect=desktop.paint(section.id,section.p*(section.id==='desktop'?9:section.id==='breakdown'?8:section.id==='collapse'?4:5),time,{level:level,profile:profile,presentationMs:C.cutscenes.active?C.cutscenes.active.presentationMs:time*1000,boot:boot});
        // Full's single partial POST flicker burst is gated again by the output limiter.
        if(profile==='full'&&section.id==='boot'&&age>3.35&&age<3.75)effect.flicker=Math.floor((age-3.35)*12)%2?.12:0;
        var source=section.id==='black'?os:engine?engine.render(os,w,h,time,effect,level):os;
        stats.backend=source===os?'canvas':engine.stats.backend;
        var aspect=os.width/os.height,dw=w,dh=w/aspect;if(dh>h){dh=h;dw=h*aspect;}var x=(w-dw)/2,y=(h-dh)/2;
        g.save();g.imageSmoothingEnabled=false;
        if(effect.shake)g.translate(effect.shake,0);
        // GL already covers the viewport; the 2D fallback retains the complete POST.
        if(source!==os)g.drawImage(source,0,0,w,h);else{g.save();if(C.config.rarityColorMode==='mono')g.filter='grayscale(1)';lowScreen(g,x,y,dw,dh,effect);g.restore();if(section.id!=='black')lowPost(g,w,h,time);}g.restore();
      },
      backplate:function(g,w,h,time){var field=C.secretBackground.sample(seed,time);C.secretBackground.draw(g,w,h,field.time,seed,true,field.profile,C.motion.reduced||!C.settings.policy.animation);},
      getBeats:function(){return (desktop?desktop.getBeats():[]).concat(fieldBeats);},
      handoff:function(light){this.releaseScene();if(light||skipped){fieldTime=0;fieldFirstAt=3;}C.secretBackground.begin(seed,fieldTime,profile,fieldFirstAt);return fieldTime*1000;},
      releaseScene:function(){if(engine){engine.dispose();engine=null;}},
      stop:function(){this.releaseScene();if(desktop){desktop.stop();desktop=null;}if(channels){channels.forEach(function(part){part.canvas.width=part.canvas.height=1;});channels=null;}},
      get scene(){return engine;},get model(){return model;}
    };
  }
  C.secretIntro={create:create,warmup:function(spec,seed){seed=String(seed);if(warmed&&warmed.seed===seed)return;if(warmed)warmed.engine.dispose();if(C.cutscenes.mode()==='light'||C.settings.get('quality')==='low')return;var engine=C.cutsceneScreenEngine.create(),canvas=root.document.createElement('canvas');canvas.width=480;canvas.height=270;var q=canvas.getContext('2d');q.fillStyle='#000';q.fillRect(0,0,480,270);engine.render(canvas,root.innerWidth,root.innerHeight,0,{},C.settings.get('quality')==='high'?3:2);warmed={seed:seed,engine:engine};}};
  C.cutscenes.register('secret',create);
})(window.Cardable,window);
