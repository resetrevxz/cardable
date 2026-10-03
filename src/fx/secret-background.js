(function(C){
  'use strict';
  var session=null,cache=new Map();
  function material(seed){seed=String(seed);if(cache.has(seed))return cache.get(seed);var random=C.cutsceneMath.random('secret-field:'+seed),lines=[];for(var i=0;i<8;i++)lines.push({y:(i+.15+random()*.65)/8,width:.007+random()*.012,phase:random()*6.28,length:.35+random()*.6});if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(seed,lines);return lines;}
  function stateAt(time,found,profile){
    if(profile==='full'){var cfg=C.config.finishMotion.secret,cycle=cfg.sweepLeadMs+cfg.coverMs,age=Math.max(0,time*1000)%cycle,cover=found&&age>=cfg.sweepLeadMs,progress=cover?(age-cfg.sweepLeadMs)/cfg.coverMs:0;
      return {inversion:cover?Math.min(1,(age-cfg.sweepLeadMs)/160):0,age:age,period:cycle,progress:progress};}
    var period=4800,ms=Math.max(0,time*1000),step=Math.floor(ms/period),age=ms%period;
    var blend=Math.min(1,age/(profile==='safe'?800:160));blend=blend*blend*(3-2*blend);
    var from=step%2?0:1,to=step%2?1:0;
    return {inversion:found?(step?from+(to-from)*blend:0):0,age:age,period:period,step:step};}
  C.secretBackground={
    begin:function(seed,time,profile){session={seed:String(seed),time:time||0,profile:profile||C.cutscenes.profile(),active:true};},
    end:function(){if(session)session.active=false;},
    setTime:function(seed,time){if(session&&session.seed===String(seed))session.time=time;},
    sample:function(seed,time){return session&&session.active&&session.seed===String(seed)?{time:session.time,profile:session.profile}:{time:time,profile:C.cutscenes.profile()};},
    stateAt:stateAt,
    draw:function(g,w,h,time,seed,found,profile,staticPolicy){
      var state=stateAt(staticPolicy?0:time,found,profile||C.cutscenes.profile()),v=Math.round(state.inversion*250),ink=250-v,lines=material(seed);
      g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(0,0,w,h);
      var safe=profile!=='full',progress=safe?state.age/state.period:state.progress,growth=found?1+(safe?Math.pow(Math.max(0,(progress-.4)/.6),2)*2:progress*progress*4.25):1;
      lines.forEach(function(line,i){var speed=staticPolicy?0:safe?.4:2,phase=time*speed*6.28+line.phase;
        if(!safe&&progress){var cfg=C.config.finishMotion.secret,age=progress*cfg.coverMs;phase=(cfg.sweepHz*age/1000+(cfg.maxSweepHz-cfg.sweepHz)*age*age/(2*cfg.coverMs*1000))*6.28+i;}
        var x=Math.sin(phase)*w*(safe?.025:.12*(1-progress)),height=h*(safe?line.width:.03)*growth;
        var left=safe?x:x-w*.3,width=safe?w*line.length:w*1.6,y=safe?line.y:(i+.5)/8;
        var gradient=g.createLinearGradient(left,0,left+width,0);gradient.addColorStop(0,'rgba('+ink+','+ink+','+ink+',0)');gradient.addColorStop(.15,'rgba('+ink+','+ink+','+ink+',.75)');gradient.addColorStop(.85,'rgba('+ink+','+ink+','+ink+',.75)');gradient.addColorStop(1,'rgba('+ink+','+ink+','+ink+',0)');g.fillStyle=gradient;g.fillRect(left,y*h-height/2,width,height);});
      return state;
    }
  };
})(window.Cardable);
