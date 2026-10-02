(function (C) {
  'use strict';
  var palette = [[255,159,178],[168,240,198],[169,204,255],[213,195,255],[255,210,176],[255,241,168]];
  var cache = new Map(), session = null;
  function material(seed) {
    seed = String(seed);
    if (cache.has(seed)) return cache.get(seed);
    var random = C.cutsceneMath.random('ascendant-background:' + seed), flashes = [], at = 0;
    for (var i=0;i<64;i++) { at += 2000+random()*1000; flashes.push({at:at,side:Math.floor(random()*4),along:.08+random()*.84,color:Math.floor(random()*6)}); }
    var result = {phase:random()*Math.PI*2,flashes:flashes,period:at+3000};
    if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(seed,result);return result;
  }
  function rgba(c,a) {
    if(C.config.rarityColorMode==='mono'){var l=Math.round(c[0]*.213+c[1]*.715+c[2]*.072);c=[l,l,l];}
    return 'rgba('+c.join(',')+','+a+')';
  }
  C.ascendantBackground = {
    begin:function(seed,time){session={seed:String(seed),time:time||0,active:true};},
    setTime:function(seed,time){if(session&&session.seed===String(seed))session.time=time;},
    end:function(){if(session)session.active=false;},
    sampleTime:function(seed,fallback){return session&&session.seed===String(seed)&&session.active?session.time:fallback;},
    draw:function(g,w,h,time,seed) {
      var field=material(seed),t=time*1000,phase=time/12*Math.PI*2+field.phase;
      g.fillStyle='#fff';g.fillRect(0,0,w,h);
      for(var side=0;side<4;side++){
        var x=side<2?side*w:w*(.5+.18*Math.sin(phase+side)),y=side>=2?(side-2)*h:h*(.5+.18*Math.cos(phase+side));
        var c=palette[(side+Math.floor((phase%(Math.PI*2)+Math.PI*2)/(Math.PI*2)*6))%6],r=Math.max(w,h)*.62;
        var grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,rgba(c,.52));grad.addColorStop(.6,rgba(c,.13));grad.addColorStop(1,rgba(c,0));
        g.fillStyle=grad;g.fillRect(0,0,w,h);
      }
      if(!C.settings.policy.particles)return;
      var loop=t%field.period;
      field.flashes.forEach(function(p){var progress=(loop-p.at)/1000;if(progress<0||progress>1)return;
        var x=p.side<2?p.side*w:p.along*w,y=p.side>=2?(p.side-2)*h:p.along*h,r=Math.min(w,h)*(.12+.24*progress);
        var grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,rgba(palette[p.color],Math.sin(progress*Math.PI)*.5));grad.addColorStop(1,rgba(palette[p.color],0));g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
      });
    }
  };
})(window.Cardable);
