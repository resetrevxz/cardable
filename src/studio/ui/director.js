(function(C,root){
  'use strict';
  function clock(t){return ('0'+Math.floor(t)).slice(-2)+':'+('0'+Math.floor((t%1)*100)).slice(-2);}
  C.studioDirectorPanel=function(s){
    s.keepTimeline=false;var ui=C.studioUI,d=s.scene.director,r=s.director,focused=root.document.activeElement;
    var focusKey=(s.panel.contains(focused)||s.directorDock&&s.directorDock.contains(focused))?focused.dataset.directorFocus:null;
    ui.closeDirector(s);s.root.classList.add('is-director');s.panel.replaceChildren();
    function mark(el,key){el.dataset.directorFocus=key;return el;}
    function action(label,host,run,symbol,key){var b=ui.button(label,host,run);if(symbol)ui.icon(b,symbol);if(key)mark(b,key);return b;}
    function inPanel(host,run){var old=s.panel;s.panel=host;try{return run();}finally{s.panel=old;}}
    function details(label,open){var el=ui.node('details','director-section',s.panel);el.open=!!open;ui.node('summary','',el,label);return ui.node('div','director-section-body',el);}
    function choose(f){s.api.commit();s.directorKeyId=f.id;s.directorTarget=f.target;r.seek(f.time);C.studioDirectorPanel(s);}
    var selected=s.scene.keyframes.find(function(f){return f.id===s.directorKeyId;});
    var dock=s.directorDock=ui.node('section','director-dock',null);dock.setAttribute('aria-label','Director timeline');s.bottom.prepend(dock);
    var transport=ui.node('div','director-transport',dock),identity=ui.node('div','director-timeline-identity',transport);
    ui.icon(identity,'film');ui.node('span','',identity,'Timeline');ui.node('span','director-key-count',identity,s.scene.keyframes.length+' KEYS');
    var playback=ui.node('div','director-playback',transport);
    function step(direction){var frames=s.scene.keyframes.filter(function(f){return direction<0?f.time<r.time-.005:f.time>r.time+.005;}).sort(function(a,b){return direction*(a.time-b.time);});if(frames.length)choose(frames[0]);}
    var previous=action('Previous keyframe',playback,function(){step(-1);},'previous','previous'),play=action('',playback,function(){r.play();r.sync();},null,'preview'),next=action('Next keyframe',playback,function(){step(1);},'next','next');
    [previous,next].forEach(function(b){b.classList.add('director-icon-button');b.setAttribute('aria-label',b.textContent);});
    play.classList.add('director-preview');var playIcon=ui.icon(play,r.playing?'pause':'play'),playText=ui.node('span','',play,r.playing?'Pause':'Preview');
    var time=ui.node('output','director-timecode',playback);time.setAttribute('aria-label','Current time and shot duration');
    var options=ui.node('div','director-play-options',transport),repeat=ui.node('div','director-repeat',options);repeat.setAttribute('role','group');repeat.setAttribute('aria-label','Playback repeat');
    [['once','Once'],['loop','Loop'],['ping-pong','Ping-pong']].forEach(function(pair){var b=action(pair[1],repeat,function(){s.api.mutate(function(){d.repeat=pair[0];});r.sync();},null,'repeat-'+pair[0]);b.dataset.repeat=pair[0];});
    var turn=action('Turntable',options,function(){r.toggleTurntable();},'rotate','turntable');ui.node('kbd','',play,'Space');
    var ruler=ui.node('div','director-ruler',dock);ui.node('span','director-ruler-label',ruler,'SECONDS');var scale=ui.node('div','director-scale',ruler),ticks=ui.node('div','director-ticks',scale);
    for(var i=0;i<=4;i++){var tick=ui.node('span','',ticks,Number((d.duration*i/4).toFixed(2))+'s');tick.style.left=i*25+'%';}
    var scrub=mark(ui.node('input','director-scrub',scale),'scrub');scrub.type='range';scrub.min=0;scrub.max=d.duration;scrub.step=.01;scrub.value=r.time;scrub.setAttribute('aria-label','Timeline playhead');scrub.addEventListener('input',function(){r.seek(Number(scrub.value));r.sync();});
    var lanes=ui.node('div','director-lanes',dock),tracks=[{id:'camera',name:'Camera',symbol:'camera'}].concat(s.scene.lights.map(function(l){return {id:l.id,name:l.name,symbol:'light'};})),heads=[];
    tracks.forEach(function(track){
      var row=ui.node('div','director-track',lanes),label=ui.node('div','director-track-label',row);ui.icon(label,track.symbol);ui.node('span','',label,track.name);
      var rail=ui.node('div','director-track-rail',row),frames=s.scene.keyframes.filter(function(f){return f.target===track.id;});
      if(!frames.length)ui.node('span','director-empty-track',rail,track.id==='camera'?'Capture a pose or build an orbit':'No light keys');
      frames.forEach(function(f){var b=action('',rail,function(){choose(f);},null,'key-'+f.id);b.className='director-key';b.style.left=f.time/d.duration*100+'%';b.title=track.name+' · '+f.time.toFixed(2)+' seconds';b.setAttribute('aria-label',track.name+' keyframe at '+f.time.toFixed(2)+' seconds');b.setAttribute('aria-pressed',String(selected&&selected.id===f.id||false));ui.node('span','director-diamond',b);});
      heads.push(ui.node('div','director-playhead',rail));
    });
    s.scene.animation.tracks.filter(function(t){return t.target==='card'&&t.property==='tilt';}).forEach(function(track){var row=ui.node('div','director-track',lanes),label=ui.node('div','director-track-label',row);ui.icon(label,'rotate');ui.node('span','',label,'Card tilt');var rail=ui.node('div','director-track-rail',row);track.keys.forEach(function(key){var b=action('',rail,function(){s.directorTyped={track:track.id,key:key.id};r.seek(key.time);C.studioDirectorPanel(s);});b.className='director-key';b.style.left=key.time/d.duration*100+'%';b.setAttribute('aria-label','Card tilt keyframe at '+key.time.toFixed(2)+' seconds');ui.node('span','director-diamond',b);});heads.push(ui.node('div','director-playhead',rail));});
    ui.node('p','studio-kicker',s.panel,'DIRECTOR / SHOT 01');ui.node('h2','studio-panel-title',s.panel,'Direct the shot.');
    ui.node('p','director-intro',s.panel,s.scene.keyframes.length?'Select a key on the timeline to refine its timing.':'Start with a camera move. Build an orbit, then make it yours.');
    var auto=ui.node('div','director-auto',s.panel);
    inPanel(auto,function(){mark(ui.select(s,'Light rig',s.directorRig||'Studio',C.studioPresets.rigs,function(v){s.directorRig=v;}),'rig');});
    var build=action('Build cinematic orbit',auto,function(){r.auto(s.directorRig||'Studio');},'rotate','build');build.classList.toggle('studio-primary',!s.scene.keyframes.length);
    var shot=details('Shot settings',true);
    inPanel(shot,function(){
      var duration=mark(ui.field(s,'Duration · seconds','number',d.duration,1,15,.5,function(v){r.pause();d.duration=Math.max(1,Math.min(15,v||1));r.time=Math.min(r.time,d.duration);s.scene.keyframes.forEach(function(f){f.time=Math.min(f.time,d.duration);});}),'duration');
      duration.addEventListener('change',function(){C.studioDirectorPanel(s);});
      mark(ui.field(s,'Intro title card','checkbox',d.title,null,null,null,function(v){d.title=v;}),'title');
    });
    var target=s.directorTarget&&s.scene.lights.some(function(l){return l.id===s.directorTarget;})?s.directorTarget:'camera';s.directorTarget=target;
    var capture=details('Keyframe',true);
    inPanel(capture,function(){mark(ui.select(s,'Capture track',target,[['camera','Camera']].concat(s.scene.lights.map(function(l){return [l.id,l.name];})),function(v){s.directorTarget=v;}),'target');});
    action('Capture keyframe',capture,function(){r.capture(s.directorTarget||'camera');},'plus','capture').disabled=s.scene.keyframes.length>=96;
    if(selected){
      var editor=ui.node('div','director-key-editor',capture),keyName=selected.track==='camera'?'Camera':(s.scene.lights.find(function(l){return l.id===selected.target;})||{}).name||'Light';
      var heading=ui.node('div','director-key-heading',editor);ui.icon(heading,'key');ui.node('span','',heading,keyName);ui.node('span','studio-kicker',heading,'SELECTED KEY');
      inPanel(editor,function(){
        var frameTime=mark(ui.field(s,'Time · seconds','number',selected.time,0,d.duration,.05,function(v){r.pause();selected.time=Math.max(0,Math.min(d.duration,v||0));}),'key-time');
        frameTime.addEventListener('change',function(){r.seek(selected.time);C.studioDirectorPanel(s);});
        mark(ui.select(s,'Easing',selected.easing,[['linear','Linear'],['ease-in','Ease in'],['ease-out','Ease out'],['ease-in-out','Ease in / out']],function(v){r.pause();selected.easing=v;}),'easing');
      });
      action('Delete keyframe',editor,function(){s.api.mutate(function(){s.scene.keyframes=s.scene.keyframes.filter(function(f){return f.id!==selected.id;});});s.directorKeyId=null;C.studioDirectorPanel(s);},'trash','delete');
    }
    if(s.directorTyped){var typedTrack=s.scene.animation.tracks.find(function(t){return t.id===s.directorTyped.track;}),typedKey=typedTrack&&typedTrack.keys.find(function(k){return k.id===s.directorTyped.key;});if(typedKey){var typed=details('Card tilt key',true);inPanel(typed,function(){ui.field(s,'Card key time','number',typedKey.time,0,d.duration,.01,function(v){typedKey.time=v;});['X','Y'].forEach(function(axis,i){ui.field(s,'Key tilt '+axis,'number',typedKey.value[i],-10000,10000,1,function(v){typedKey.value[i]=v;});});ui.select(s,'Card key easing',typedKey.easing,['linear','ease-in','ease-out','ease-in-out'],function(v){typedKey.easing=v;});});action('Delete card key',typed,function(){s.api.mutate(function(){typedTrack.keys=typedTrack.keys.filter(function(k){return k!==typedKey;});},'Delete card tilt key');s.directorTyped=null;C.studioDirectorPanel(s);});}}
    action('Load pose for editing',capture,function(){r.editPose();},'sliders','pose');
    ui.node('p','director-help',capture,'Load this moment, edit Camera or Lights, then return here to capture it.');
    if(C.studioRecording.supported()){var exportPanel=details('Export a clip',!!s.recordJob||!!s.clip);inPanel(exportPanel,function(){C.studioRecording.controls(s);});}
    ui.node('p','director-help',s.panel,C.motion.reduced?'Reduced motion is on. Scrub to choose still frames.':'Space plays or pauses the authored shot. Turntable is a separate preview tool.');
    var lastClock='',lastPlay=null,lastTurn=null,lastRepeat=null,lastDisabled=null;
    s.timelineUI={update:function(state){
      var value=clock(state.time)+' / '+clock(d.duration),p=state.time/d.duration*100;
      if(scrub.value!==String(state.time))scrub.value=state.time;
      heads.forEach(function(h){h.style.transform='translateX('+p+'%)';});
      if(value!==lastClock){time.textContent=value;lastClock=value;}
      if(state.playing!==lastPlay){playText.textContent=state.playing?'Pause':'Preview';play.setAttribute('aria-label',state.playing?'Pause preview':'Preview');playIcon.querySelector('path').setAttribute('d',state.playing?'M8 5v14M16 5v14':'m9 5 10 7-10 7Z');lastPlay=state.playing;}
      if(state.turntable!==lastTurn){turn.setAttribute('aria-pressed',String(state.turntable));lastTurn=state.turntable;}
      if(d.repeat!==lastRepeat){repeat.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.repeat===d.repeat));});lastRepeat=d.repeat;}
      var disabled=C.motion.reduced||!s.renderer||s.renderer.kind==='Simple';
      if(disabled!==lastDisabled){play.disabled=disabled||!(s.scene.keyframes.length||s.scene.animation.tracks.some(function(t){return t.enabled&&t.keys.length;}));turn.disabled=disabled;lastDisabled=disabled;}
      previous.disabled=!s.scene.keyframes.some(function(f){return f.time<state.time-.005;});next.disabled=!s.scene.keyframes.some(function(f){return f.time>state.time+.005;});
    }};
    r.sync();if(s.workspace&&!s.inspecting&&!s.workspaceBuildingTimeline)s.workspace.inspected('director');
    if(focusKey){var replacement=Array.from(s.root.querySelectorAll('[data-director-focus]')).find(function(el){return el.dataset.directorFocus===focusKey;});if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});else s.viewport.focus({preventScroll:true});}
  };
})(window.Cardable,window);
