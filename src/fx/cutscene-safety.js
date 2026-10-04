(function(C,root){
  'use strict';
  var chosen=null, linear=new Float32Array(256);
  for(var n=0;n<256;n++){var s=n/255;linear[n]=s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);}
  C.cutscenes.profile=function(){
    if(C.motion.reduced||C.settings.get('cutscenes')==='off'||C.cutscenes.mode()==='light')return 'safe';
    return chosen||C.cutscenes.debug.profile||C.settings.get('strobing')||'safe';
  };
  C.cutscenes.chooseProfile=function(value){chosen=value==='full'?'full':value==='safe'?'safe':null;};
  C.cutscenes.safety={last:null};
  C.cutscenes.createNotice=function(parent){
    var card=null,pending=false,age=0,last=null,resolve;
    function close(value){if(!pending)return;pending=false;C.cutscenes.chooseProfile(value);card.remove();card=null;if(C.accessibility)C.accessibility.release();if(resolve)resolve(value);C.fx.wake();}
    return {
      start:function(done){this.stop();C.cutscenes.chooseProfile(null);if(C.cutscenes.profile()!=='full')return false;
        pending=true;age=0;last=null;resolve=done;card=root.document.createElement('section');card.className='cutscene-notice';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Flashing and strobing notice');
        var copy=root.document.createElement('p');copy.textContent='This sequence contains rapid flashing and strobing.';card.appendChild(copy);
        ['Play safe','Play full'].forEach(function(label){var b=root.document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',function(){close(label==='Play full'?'full':'safe');});card.appendChild(b);});
        var hint=root.document.createElement('small');hint.textContent='Safe starts automatically after 8 seconds. No audio.';card.appendChild(hint);parent.appendChild(card);if(C.accessibility)C.accessibility.trap(card);card.querySelector('button').focus();return true;},
      update:function(now){if(!pending)return false;if(last!==null&&!root.document.hidden)age+=Math.max(0,Math.min(100,now-last));last=now;if(age>=8000)close('safe');return pending;},
      stop:function(){pending=false;resolve=null;last=null;if(card){card.remove();card=null;if(C.accessibility)C.accessibility.release();}},
      get pending(){return pending;}
    };
  };
  C.cutscenes.createLimiter=function(parent){
    var small=root.document.createElement('canvas');small.width=64;small.height=36;
    var sample=small.getContext('2d',{willReadFrequently:true}),previous=root.document.createElement('canvas'),pg=previous.getContext('2d',{alpha:false}),resized=root.document.createElement('canvas'),rg=resized.getContext('2d',{alpha:false});
    var anchor=null,dir=0,lastEvent=-Infinity,lastPair=-Infinity,flashes=[],burst=null,cooldown=-Infinity,strobeMs=0,safeRun=0,maxFlashes=0,history=[],panel=null,label=null,line=null,profile='safe',warnings=0;
    function measure(source){sample.drawImage(source,0,0,64,36);var raw=sample.getImageData(0,0,64,36).data,values=new Float32Array(2304),sum=0,red=0;
      for(var i=0;i<values.length;i++){var k=i*4,r=linear[raw[k]],g=linear[raw[k+1]],b=linear[raw[k+2]];sum+=(values[i]=.2126*r+.7152*g+.0722*b);if(r>.12&&r/(r+g+b+1e-6)>.8)red++;}
      return {values:values,y:sum/values.length,red:red/values.length};}
    function eventOf(frame){if(!anchor)return 0;var up=0,down=0;
      for(var i=0;i<anchor.length;i++){var d=frame.values[i]-anchor[i];if(d>=.1&&anchor[i]<.8)up++;if(d<=-.1&&frame.values[i]<.8)down++;}
      return up>=230.4&&up>down?1:down>=230.4&&down>up?-1:0;}
    function meter(frame,now,event,opposing,limited){
      flashes=flashes.filter(function(t){return now-t<1000;});
      if(event){if(opposing){if(now-lastPair>=1500)safeRun=0;safeRun++;flashes.push(now);lastPair=now;}anchor=frame.values;dir=event;lastEvent=now;}
      var redFlag=!!(event&&frame.red>=.1),pass=!redFlag&&flashes.length<=(profile==='safe'?3:8);
      if(!pass)warnings++;
      maxFlashes=Math.max(maxFlashes,flashes.length);
      var result={profile:profile,luminance:frame.y,flashesPerSecond:flashes.length,maxFlashesPerSecond:maxFlashes,redFlag:redFlag,status:pass&&warnings===0?'PASS':'WARN',limited:limited,frames:(C.cutscenes.safety.last&&C.cutscenes.safety.last.frames||0)+1,warnings:warnings};
      C.cutscenes.safety.last=result;history.push(frame.y);if(history.length>110)history.shift();
      if(!C.cutscenes.debug.meter){if(panel)panel.hidden=true;return;}
      if(!panel){panel=root.document.createElement('aside');panel.className='cutscene-meter secret-flash-meter';panel.setAttribute('aria-label','Measured output flash meter');label=root.document.createElement('span');panel.appendChild(label);var svg=root.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 220 48');line=root.document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1');svg.appendChild(line);panel.appendChild(svg);parent.appendChild(panel);}
      panel.hidden=false;panel.classList.toggle('is-over-limit',!pass);label.textContent=profile.toUpperCase()+' · Y '+frame.y.toFixed(3)+' · '+flashes.length+' flashes/s · RED '+(redFlag?'YES':'NO')+' · '+result.status;
      line.setAttribute('points',history.map(function(y,i){return (i*2)+','+(46-y*42);}).join(' '));
    }
    return {
      reset:function(next){profile=next||C.cutscenes.profile();anchor=null;dir=0;lastEvent=lastPair=-Infinity;flashes=[];burst=null;cooldown=-Infinity;strobeMs=safeRun=maxFlashes=0;warnings=0;history=[];C.cutscenes.safety.last=null;previous.width=previous.height=1;},
      apply:function(source,now){var q=source.getContext('2d'),frame=measure(source),sized=previous.width!==source.width||previous.height!==source.height,limited=false;
        // This palette has no saturated red. Also neutralize any later erroneous request.
        if(frame.red>=.1){q.save();q.setTransform(1,0,0,1,0,0);q.filter='saturate(0)';q.drawImage(source,0,0);q.restore();frame=measure(source);limited=true;}
        if(!anchor){previous.width=source.width;previous.height=source.height;pg.drawImage(source,0,0);anchor=frame.values;dir=0;meter(frame,now,0,false,limited);return;}
        if(sized){resized.width=source.width;resized.height=source.height;rg.drawImage(previous,0,0,source.width,source.height);previous.width=source.width;previous.height=source.height;pg.drawImage(resized,0,0);}
        var event=eventOf(frame),opposing=event&&dir&&event!==dir;
        flashes=flashes.filter(function(t){return now-t<1000;});
        // Time is wall-clock presentation time, never a scrubbed or Fast story position.
        var blocked=event&&frame.red>=.1;
        if(profile==='safe')blocked=blocked||(opposing&&(flashes.length>=3||now-lastPair<500||now-lastEvent<500||safeRun>=2&&now-lastPair<1500));
        else if(opposing){
          if(burst===null&&now>=cooldown){burst=now-lastEvent<=600?lastEvent:now;}
          blocked=blocked||now<cooldown||now-lastEvent<125||strobeMs>=8000||burst!==null&&(now-burst>=600||strobeMs+now-burst>=8000);
          if(burst!==null&&now-burst>=600){strobeMs+=Math.min(600,now-burst);burst=null;cooldown=now+1500;}
        }else if(burst!==null&&now-lastEvent>=600){strobeMs+=Math.min(600,now-burst);burst=null;cooldown=now+1500;}
        if(blocked){
          // Blend toward the actual prior output, then remeasure before accepting it.
          q.save();q.setTransform(1,0,0,1,0,0);q.globalAlpha=.9;q.drawImage(previous,0,0);q.restore();frame=measure(source);event=eventOf(frame);opposing=event&&dir&&event!==dir;limited=true;
          if(event&&(frame.red>=.1||opposing)){q.save();q.setTransform(1,0,0,1,0,0);q.drawImage(previous,0,0);q.restore();frame=measure(source);event=eventOf(frame);opposing=event&&dir&&event!==dir;}
        }
        if(event)anchor=frame.values;
        meter(frame,now,event,opposing,limited);pg.drawImage(source,0,0);
      },
      hide:function(){if(panel)panel.hidden=true;},
      get data(){return C.cutscenes.safety.last;}
    };
  };
})(window.Cardable,window);
