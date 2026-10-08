(function (C, root) {
  'use strict';
  var entries = Object.create(null), active = null;
  var math = C.cutsceneMath;
  function sections(spec) {
    var offset = 0, result = Object.create(null);
    spec.sections.forEach(function (part) { result[part.id] = { start: offset, ms: part.ms }; offset += part.ms; });
    return { sections: result, total: offset };
  }
  function mode(){if(C.cutscenes.openingRoute==='short'&&!C.motion.reduced&&C.settings.policy.animation)return 'short';if(C.cutscenes.openingRoute==='play'&&!C.motion.reduced&&C.settings.policy.animation)return 'full';return C.motion.reduced||C.settings.get('cutscenes')==='off'||C.settings.get('cinematicQuality')==='very-low'||!C.settings.policy.animation?'light':C.settings.get('cutscenes')==='short'?'short':'full';}
  function playDuration(spec,choice){
    if(choice==='light')return spec.light?spec.light.ms:3000;
    var total=sections(spec).total;
    return choice==='short'?(spec.shortRoute?spec.shortRoute.reduce(function(n,s){return n+s.ms;},0):Math.min(total,14000)):total;
  }
  function storyTime(spec,choice,time){
    if(choice!=='short'||!spec.shortRoute)return time;
    var at=0,route=spec.shortRoute;
    for(var i=0;i<route.length;i++){var part=route[i];if(time<=at+part.ms||i===route.length-1)return math.mix(part.from,part.to,math.clamp((time-at)/part.ms));at+=part.ms;}
  }
  function playTime(spec,choice,time){
    if(choice!=='short'||!spec.shortRoute)return time;
    var at=0;for(var i=0;i<spec.shortRoute.length;i++){var part=spec.shortRoute[i];if(time<=part.to)return at+math.clamp((time-part.from)/(part.to-part.from))*part.ms;at+=part.ms;}
    return at;
  }
  function pulseFactor(spec,choice,rate){
    if(!spec.ritual)return 1;var film=sections(spec),part=film.sections.topPulse,actual=playTime(spec,choice,part.start+part.ms)-playTime(spec,choice,part.start);
    return Math.min(1,actual/part.ms*(C.settings.get('revealSpeed')==='fast'?.7:1)/(rate||1))*(C.cutscenes.profile()==='safe'?Math.min(1,1.8/spec.ritual.pulseHzEnd):1);
  }
  function pulses(spec,factor){
    if(!spec.ritual)return [];var part=sections(spec).sections.topPulse,duration=part.ms/1000;
    var a=(spec.ritual.pulseHzEnd-spec.ritual.pulseHzStart)/(2*duration)*factor,b=spec.ritual.pulseHzStart*factor,total=(a*duration*duration+b*duration),out=[];
    for(var i=0;i<total;i++){var age=i===0?0:(-b+Math.sqrt(b*b+4*a*i))/(2*a);out.push({id:'pulse',key:'pulse:'+i,ms:part.start+age*1000});}
    return out;
  }
  function safeSparks(spec,choice,rate){
    var original=(spec.beats||[]).filter(function(beat){return /^spark[123]$/.test(beat.id);});
    if(spec.kind!=='prismatic'||choice==='light')return original;
    var speed=(C.settings.get('revealSpeed')==='fast'?.7:1)/(rate||1),gap=1000/2.4/speed;
    var times=original.map(function(beat){return playTime(spec,choice,beat.ms);});
    if(times.every(function(t,i){return !i||t-times[i-1]>=gap;}))return original;
    var film=sections(spec),start=playTime(spec,choice,film.sections.spark.start),end=playTime(spec,choice,film.sections.spark.start+film.sections.spark.ms),margin=Math.min(100/speed,(end-start)*.1);
    var count=Math.min(3,Math.floor((end-start-2*margin)/gap)+1),first=Math.max(start+margin,Math.min(times[0],end-margin-(count-1)*gap));
    return original.slice(0,count).map(function(beat,i){return {id:beat.id,ms:storyTime(spec,choice,first+i*gap),key:beat.id};});
  }
  function quality() { return C.settingsSchema.tiers.indexOf(C.settings.get('cinematicQuality')); }
  C.cutscenes = {
    registry: entries, timeline: sections, mode:mode, playDuration:playDuration,pulseFactor:pulseFactor,pulses:pulses, debug:{meter:false},
    register: function (kind, factory) { entries[kind] = factory; },
    create: function (kind) { return entries[kind] ? entries[kind]() : null; },
    warmup: function (rarity, serial) {
      if(!rarity||!['ascendant','secret'].includes(rarity.reveal.cutscene))return;
      var loader=C.ui?C.ui.create('loader',{label:'Warming cinematic assets',total:2}):null,effects,fonts,timer;
      if(loader){loader.classList.add('cb-cinematic-loader');effects=C.ui.progress(0,'Effects prepared',true);fonts=C.ui.progress(0,'Fonts prepared',true);loader.append(effects,fonts);C.viewport.parent(root.document.body).appendChild(loader);timer=root.setTimeout(dispose,8000);}
      function dispose(){root.clearTimeout(timer);if(loader)loader.remove();}
      try{if(rarity.reveal.cutscene==='ascendant')C.ascendantIntro.warmup(rarity.openingIntro,String(serial));else C.secretIntro.warmup(rarity.openingIntro,String(serial));if(loader){effects.update(1);loader.update(1,2);}}
      catch(error){dispose();throw error;}
      var fontTask=root.document.fonts?root.document.fonts.load(rarity.reveal.cutscene==='ascendant'?'48px "Ascendant Bodoni"':'48px "JetBrains Mono"'):Promise.resolve();
      fontTask.then(function(){if(loader){fonts.update(1);loader.update(2,2);}dispose();},dispose);
    },
    get active() { return active; },
    createRuntime: function (parent) {
      var spec, painter, clock = 0, playClock=0, runMode='full', intensityProfile='safe', previous = 0, rate = 1, hint, film, skipping = null;
      var pulseKey='',pulseEvents=[],sparkKey='',sparkEvents=[];var meterPanel,meterSvg,meterLine,meterLabel,meterSample,meterLast=null,meterHistory=[],meterCount=0,meterMax=0;
      var level = 2, beats = Object.create(null), adaptive = { samples: 0, sum: 0, dropped: false }, current = false;
      function emit(id, time, key) {
        key = key || id;
        if (beats[key]) return;
        beats[key] = true;
        if(id==='flash')meterCount++;
        C.events.emit('cutscene:beat', { cutscene: spec.cutscene || spec.kind, id: id, timeMs: time });
      }
      function ensureHint() {
        if (hint) return;
        hint = root.document.createElement('button'); hint.type = 'button'; hint.className = 'cutscene-skip';
        hint.textContent = 'Esc to skip'; hint.hidden = true; hint.setAttribute('aria-label', 'Skip cinematic');
        parent.appendChild(hint); hint.addEventListener('click', skip);
      }
      function skip() {
        if (!current || previous < 2000 || skipping) return false;
        C.cutscenes.lastSkipped=true;var endpoint = runMode==='light'?{start:film.total*((spec.light?spec.light.handoffMs:2600)/playDuration(spec,'light'))}:film.sections.explosion || film.sections.release;
        skipping = { from: clock, to: Math.max(clock, endpoint ? endpoint.start : film.total), age: 0 };
        C.fx.wake(); return true;
      }
      C.keys.listen(root, 'keydown', 'src.fx.cutscene-runtime.js.1', function (event) {
        if (event.key === 'Escape' && current && previous >= 2000) {
          event.preventDefault(); event.stopImmediatePropagation(); skip();
        }
      }, true);
      function stop() {
        // Painters can discover a beat on the last rendered frame (e.g. the final
        // field inversion). Flush it on the shared scheduler before releasing it.
        if(current&&painter&&painter.getBeats)painter.getBeats().forEach(function(beat){if(clock>=beat.ms)emit(beat.id,beat.ms,beat.key);});
        current = false; skipping = null; if (hint) hint.hidden = true;if(meterPanel)meterPanel.hidden=true;
        root.document.body.classList.remove('cutscene-cursor-available');
        if (active === api) active = null;
      }
      var api = {
        start: function (next, renderer,choice) {
          C.cutscenes.lastSkipped=false;ensureHint(); spec = next; painter = renderer; film = sections(spec); clock = previous = playClock = 0;runMode=choice||mode(); skipping = null;meterLast=null;meterHistory=[];meterCount=0;meterMax=0;pulseKey='';pulseEvents=[];sparkKey='';sparkEvents=[];
          level = quality(); rate = 1; current = true; beats = Object.create(null);
          adaptive = { samples: 0, sum: 0, dropped: false }; active = api;
          intensityProfile=C.cutscenes.profile();if(painter&&painter.setProfile)painter.setProfile(intensityProfile);
          hint.hidden = true; if (painter && painter.setQuality) painter.setQuality(level);
        },
        update: function (elapsed, duration, staticPolicy) {
          var dt = Math.max(0, elapsed - previous); previous = elapsed;
          if(staticPolicy&&runMode!=='light')api.setMode('light');
          if(painter&&painter.setPresentationFactor){
            var slowest=1,speed=(C.settings.get('revealSpeed')==='fast'?.7:1)/rate;
            Object.keys(film.sections).forEach(function(id){var part=film.sections[id],actual=runMode==='short'&&!spec.shortRoute?part.ms*playDuration(spec,runMode)/film.total:playTime(spec,runMode,part.start+part.ms)-playTime(spec,runMode,part.start);slowest=Math.min(slowest,actual/part.ms*speed);});
            painter.setPresentationFactor(slowest);
          }
          if(spec.ritual){var factor=pulseFactor(spec,runMode,rate),key=String(factor);if(key!==pulseKey){pulseKey=key;pulseEvents=pulses(spec,factor);if(painter.setPulseFactor)painter.setPulseFactor(factor,pulseEvents);}}
          var nextSparkKey=runMode+':'+rate+':'+C.settings.get('revealSpeed');if(nextSparkKey!==sparkKey){
            sparkKey=nextSparkKey;sparkEvents=safeSparks(spec,runMode,rate);if(painter&&painter.setSparkBeats)painter.setSparkBeats(sparkEvents);
            if(spec.ritual&&painter.setSpinFactors){var speed=(C.settings.get('revealSpeed')==='fast'?.7:1)/rate;
              function factor(from,to){return Math.min(1,(playTime(spec,runMode,to)-playTime(spec,runMode,from))/(to-from)*speed);}
              painter.setSpinFactors([factor(film.sections.title.start,film.sections.aurora.start),factor(film.sections.aurora.start,film.sections.card.start)]);
            }
          }
          if (skipping) {
            skipping.age += dt; clock = math.mix(skipping.from, skipping.to, math.smooth(skipping.age / 500));
            if (skipping.age >= 500) { clock = skipping.to;playClock=runMode==='light'?clock/film.total*playDuration(spec,runMode):runMode==='short'&&!spec.shortRoute?clock/film.total*playDuration(spec,runMode):playTime(spec,runMode,clock); skipping = null; }
          } else {
            playClock+=dt*rate*playDuration(spec,runMode)/duration;
            clock=runMode==='light'?playClock/playDuration(spec,runMode)*film.total:runMode==='short'&&!spec.shortRoute?playClock/playDuration(spec,runMode)*film.total:storyTime(spec,runMode,playClock);
          }
          clock = Math.min(film.total, clock);
          hint.hidden = elapsed < 2000;
          root.document.body.classList.toggle('cutscene-cursor-available', !hint.hidden);
          if(runMode==='light'){
            if(clock>=film.total*((spec.light?spec.light.handoffMs:2600)/playDuration(spec,'light')))emit('cardIn',spec.light?spec.light.handoffMs:2600);
          }else (spec.beats || []).filter(function(beat){return (!spec.ritual||beat.id!=='pulse')&&(spec.kind!=='prismatic'||!/^spark[123]$/.test(beat.id));}).concat(pulseEvents,spec.kind==='prismatic'?sparkEvents:[],painter&&painter.getBeats?painter.getBeats():[]).forEach(function (beat) { if (clock >= beat.ms) emit(beat.id, beat.ms, beat.key); });
          // Live adaptation is part of the presentation, not a separate profiling loop.
          // Programs and targets were warmed during cutting; ignore the first ten visible frames.
          if (((spec.kind === 'prismatic'||spec.kind === 'crimson') && clock >= 1000 && clock < 10000 || spec.kind === 'system' && clock >= 4000 && clock < 19000) && !staticPolicy && dt > 0 && !adaptive.dropped) {
            adaptive.samples += 1; if (adaptive.samples > 10) adaptive.sum += dt;
            var count = adaptive.samples - 10;
            if (count >= 60 && adaptive.sum / count > Math.max(24,1000/(C.frame?C.frame.cap():60)*1.35) && level >= 2) {
              level -= 1; adaptive.dropped = true; if (painter.setQuality) painter.setQuality(level);
              C.events.emit('cutscene:quality', { level: level, reason: 'adaptive' });
            }
          }
          return clock / film.total * duration;
        },
        letterbox: function (g, w, h, ms) {
          var amount = math.smooth(ms / 800);
          if (film.sections.explosion) amount *= 1 - math.smooth((ms - film.sections.explosion.start) / 500);
          var height = Math.max(0, (h - w / 2.39) * .5) * amount;
          g.fillStyle = '#05060a'; g.fillRect(0, 0, w, height); g.fillRect(0, h - height, w, height);
        },
        meter:function(source,storyMs){
          if(!C.cutscenes.debug.meter){if(meterPanel)meterPanel.hidden=true;return;}
          if(!meterPanel){
            meterPanel=root.document.createElement('aside');meterPanel.className='cutscene-meter';meterPanel.setAttribute('aria-label','Single-flash luminance meter');
            meterLabel=root.document.createElement('span');meterPanel.appendChild(meterLabel);
            meterSvg=root.document.createElementNS('http://www.w3.org/2000/svg','svg');meterSvg.setAttribute('viewBox','0 0 220 48');
            meterLine=root.document.createElementNS(meterSvg.namespaceURI,'polyline');meterLine.setAttribute('fill','none');meterLine.setAttribute('stroke','currentColor');meterLine.setAttribute('stroke-width','1');meterSvg.appendChild(meterLine);meterPanel.appendChild(meterSvg);parent.appendChild(meterPanel);
            meterSample=root.document.createElement('canvas');meterSample.width=32;meterSample.height=18;
          }
          meterPanel.hidden=false;if(meterLast&&storyMs>=meterLast.time&&storyMs-meterLast.time<100)return;
          var q=meterSample.getContext('2d',{willReadFrequently:true});q.drawImage(source,0,0,32,18);var pixels=q.getImageData(0,0,32,18).data,luma=0;
          function linear(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
          for(var at=0;at<pixels.length;at+=4)luma+=linear(pixels[at])*.213+linear(pixels[at+1])*.715+linear(pixels[at+2])*.072;luma/=pixels.length/4;
          var change=meterLast&&storyMs>meterLast.time?Math.abs(luma-meterLast.luma)/((storyMs-meterLast.time)/1000):0;meterMax=Math.max(meterMax,change);meterLast={time:storyMs,luma:luma};meterHistory.push(change);if(meterHistory.length>110)meterHistory.shift();
          meterLine.setAttribute('points',meterHistory.map(function(v,i){return i*2+','+(46-Math.min(42,v*5));}).join(' '));
          meterLabel.textContent='FLASH '+meterCount+'/1 · MAX ΔY/s '+meterMax.toFixed(2)+' · PULSE ≤2.4 Hz';meterPanel.classList.toggle('is-over-limit',meterCount>1);
        },
        skip: skip, stop: stop,
        seek: function (ms) { if (current) {clock = Math.max(0, Math.min(film.total - 1, ms));
          playClock=runMode==='light'?clock/film.total*playDuration(spec,runMode):runMode==='short'&&!spec.shortRoute?clock/film.total*playDuration(spec,runMode):playTime(spec,runMode,clock);skipping = null; C.fx.wake(); } },
        setMode:function(choice){if(['full','short','light'].indexOf(choice)<0)return;runMode=choice;api.seek(clock);},
        get mode(){return runMode;},get profile(){return intensityProfile;},
        jump: function (id) { if (film.sections[id]) api.seek(film.sections[id].start); },
        setRate: function (value) { rate = Math.max(.1, Math.min(4, Number(value) || 1)); },
        setQuality: function (value) { level = Math.max(0, Math.min(4, value));if(level===0)api.setMode('light'); adaptive.dropped = true; if (painter.setQuality) painter.setQuality(level); },
        get presentationMs(){return previous;}, get timeMs() { return clock; }, get totalMs() { return film ? film.total : 0; },
        get skipState(){return skipping?{from:skipping.from,progress:math.clamp(skipping.age/500)}:null;}, get rate() { return rate; }, get level() { return level; }, get sections() { return film ? film.sections : {}; }
      };
      return api;
    }
  };
})(window.Cardable, window);
