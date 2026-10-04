(function(C){
  'use strict';
  var session=null,cache=new Map(),M=C.cutsceneMath;
  function descriptor(){return C.rarity('secret').openingIntro.resurrection;}
  function material(seed){
    seed=String(seed);if(cache.has(seed))return cache.get(seed);
    var random=M.random('secret-field:'+seed),lines=[],glyphs=[],bank=descriptor().glyphs;
    for(var i=0;i<8;i++)lines.push({y:(i+.15+random()*.65)/8,width:.007+random()*.012,phase:random()*6.28,length:.35+random()*.6});
    for(i=0;i<24;i++){var row='';for(var j=0;j<96;j++)row+=bank[Math.floor(random()*bank.length)];glyphs.push({text:row,phase:random(),x:random()*.08});}
    var result={lines:lines,glyphs:glyphs};if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(seed,result);return result;
  }
  function stateAt(time,found,profile,firstAt){
    var cfg=descriptor(),ms=Math.max(0,time*1000),start=firstAt==null?cfg.firstCycleMs:firstAt*1000;
    if(profile==='full'&&firstAt==null){var original=C.config.finishMotion.secret,cycle=Math.max(1000,original.sweepLeadMs+original.coverMs),a=ms%cycle,covered=found&&a>=original.sweepLeadMs;
      return {inversion:covered?Math.min(1,(a-original.sweepLeadMs)/160):0,progress:covered?(a-original.sweepLeadMs)/original.coverMs:0,age:a,period:cycle,step:0};}
    if(!found||ms<start)return {inversion:0,progress:0,age:ms,period:start,step:0};
    if(profile==='full'){
      // The first cycle closes into black at handoff; later cycles retain the Found sweep.
      var elapsed=ms-start,first=cfg.fullFirstCycleMs,motion=C.config.finishMotion.secret;
      if(elapsed<first)return {inversion:M.smooth(elapsed/250),progress:M.smooth((elapsed-350)/(first-350)),age:elapsed,period:first,step:1};
      var period=Math.max(1000,motion.sweepLeadMs+motion.coverMs),age=(elapsed-first)%period,cover=age>=motion.sweepLeadMs;
      return {inversion:cover?M.smooth((age-motion.sweepLeadMs)/250):0,progress:cover?(age-motion.sweepLeadMs)/motion.coverMs:0,opacity:M.smooth((elapsed-first)/300),age:age,period:period,step:2};
    }
    // Presentation seconds, never accelerated story time: reversals are 4.8 s apart.
    var at=ms-start,step=Math.floor(at/cfg.safePeriodMs),age=at%cfg.safePeriodMs,blend=M.smooth(age/cfg.safeCrossfadeMs);
    return {inversion:step%2?1-blend:blend,progress:0,age:age,period:cfg.safePeriodMs,step:step+1};
  }
  C.secretBackground={
    begin:function(seed,time,profile,firstAt){session={seed:String(seed),time:time||0,profile:profile||C.cutscenes.profile(),firstAt:firstAt==null?3:firstAt,active:true};},
    end:function(){if(session)session.active=false;},
    setTime:function(seed,time){if(session&&session.seed===String(seed))session.time=time;},
    sample:function(seed,time){return session&&session.active&&session.seed===String(seed)?{time:session.time,profile:session.profile,found:true,firstAt:session.firstAt}:{time:time,profile:C.cutscenes.profile()};},
    stateAt:stateAt,
    draw:function(g,w,h,time,seed,found,profile,staticPolicy,scene){
      profile=profile||C.cutscenes.profile();var field=this.sample(seed,time);
      // Share the reserved card's field without changing front concealment/ownership.
      // Shelf renders stay static and never borrow the active full-screen field.
      if(!staticPolicy&&field.found){found=true;time=field.time;profile=field.profile;}
      var state=stateAt(time,found,profile,field.firstAt),safe=profile!=='full';
      var v=Math.round(state.inversion*250),ink=250-v,asset=material(seed),cfg=descriptor();
      var age=scene&&scene.resurrection?scene.ageMs:Infinity;
      g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(0,0,w,h);
      if(age<cfg.blackMs)return state;
      var bloom=scene?M.smooth((age-cfg.blackMs)/480):1;
      g.save();if(scene&&bloom<1){g.beginPath();g.ellipse(w/2,h/2,Math.max(1,w*.72*bloom),Math.max(1,h*.72*bloom),0,0,Math.PI*2);g.clip();}
      var progress=state.progress,growth=found&&!safe?1+progress*progress*4.25:1;
      asset.lines.forEach(function(line,i){
        var phase=time*(staticPolicy?0:safe?.4:2)*6.28+line.phase;
        if(!safe&&progress){var motion=C.config.finishMotion.secret,a=progress*motion.coverMs;phase=(motion.sweepHz*a/1000+(motion.maxSweepHz-motion.sweepHz)*a*a/(2*motion.coverMs*1000))*6.28+i;}
        var x=Math.sin(phase)*w*(safe?.025:.12*(1-progress)),height=h*(safe?line.width:.03)*growth;
        var left=safe?x:x-w*.3,width=safe?w*line.length:w*1.6,y=safe?line.y:(i+.5)/8;
        var gradient=g.createLinearGradient(left,0,left+width,0),alpha=(safe?.68:.75)*(state.opacity==null?1:state.opacity);
        gradient.addColorStop(0,'rgba('+ink+','+ink+','+ink+',0)');gradient.addColorStop(.15,'rgba('+ink+','+ink+','+ink+','+alpha+')');gradient.addColorStop(.85,'rgba('+ink+','+ink+','+ink+','+alpha+')');gradient.addColorStop(1,'rgba('+ink+','+ink+','+ink+',0)');
        g.fillStyle=gradient;g.fillRect(left,y*h-height/2,width,height);
      });
      // Coalesce into solid ink rather than leave a broad striped frame on screen.
      if(!safe&&progress>.74){g.globalAlpha=M.smooth((progress-.74)/.26);g.fillStyle='rgb('+ink+','+ink+','+ink+')';g.fillRect(0,0,w,h);g.globalAlpha=1;}
      if(scene){
        var fade=1-M.smooth((age-cfg.firstCycleMs)/280),storm=bloom*fade;
        if(storm>0){
          var size=Math.max(9,Math.min(15,w/65)),cols=Math.ceil(w*1.1/(size*.61))+2,tick=staticPolicy?0:Math.floor(time*1000/(safe?120:55));
          g.font=Math.round(size)+'px "JetBrains Mono",monospace';g.textBaseline='middle';g.fillStyle='rgb('+ink+','+ink+','+ink+')';
          asset.glyphs.forEach(function(row,i){var start=(tick+i*7)%96,yy=(i+.5)/24*h,stream=row.text.repeat(Math.ceil((cols+96)/96));g.globalAlpha=storm*(safe?.18:.36)*(.55+row.phase*.45);g.fillText(stream.slice(start,start+cols),-row.x*w,yy);});
          var title='Secret',locked=Math.min(6,Math.floor(Math.max(0,age-cfg.blackMs)/cfg.lockMs));
          size=Math.min(w*.105,h*.11,76);g.font=Math.round(size)+'px "JetBrains Mono",monospace';var spacing=size*.64,left=w/2-spacing*3;
          g.globalAlpha=fade;g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(left-12,h/2-size*.65,spacing*6+24,size*1.3);
          for(var i=0;i<6;i++){var letterAge=age-cfg.blackMs-(i+1)*cfg.lockMs;g.fillStyle=i<locked?'rgb('+ink+','+ink+','+ink+')':'#666';g.globalAlpha=fade*(i<locked?1:.28);g.fillText(i<locked?title[i]:cfg.glyphs[(tick+i*3)%cfg.glyphs.length],left+i*spacing,h/2);
            if(letterAge>=0&&letterAge<120){g.globalAlpha=fade*(safe?.18:.38)*(1-letterAge/120);g.fillRect(left+i*spacing,h/2-size*.55,spacing-2,size*1.1);}}
        }
      }
      g.restore();
      if(scene&&age<cfg.blackMs+240){g.save();g.globalAlpha=1-M.smooth((age-cfg.blackMs)/240);g.fillStyle='#eee';g.fillRect(Math.round(w/2),Math.round(h/2),Math.max(1,w/640),Math.max(1,h/360));g.restore();}
      return state;
    }
  };
})(window.Cardable);
