(function(C, root) {
  'use strict';
  // Fixed, ephemeral presentation. Descriptor utilities never load state/save/input.
  var reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
  C.motion={reduced:reduced.matches};
  // Public preview inputs have no gameplay registry, save or native bridge.
  C.keys={listen:function(host,type,id,fn,options){host.addEventListener(type,fn,options);return function(){host.removeEventListener(type,fn,options);};},remove:function(host,type,fn){host.removeEventListener(type,fn);},label:function(key){return key;}};
  var full=Object.freeze({finishHz:60,glareHz:30,reflection:3,prop:3,animation:3,ambient:false,animationHz:60,dotsHz:0,background:0,rippleLimit:0,particles:.5,blur:1,layers:10,shadows:3,trail:false,dpr:1.5});
  var low=Object.freeze(Object.assign({},full,{finishHz:0,prop:1,particles:0})),current=full;
  C.settings={get:function(key){return key==='uiAnimationSpeed'?1:key==='rarityColor'?'color':key==='serialOnFront'?true:key==='cinematicQuality'?'medium':'high';},
    get policy(){return current;},cutPolicy:{smoothing:1,tolerance:1,span:.72},tiltPolicy:{cap:4,stiffness:1},onChange:function(){return function(){};},
    withPolicy:function(tier,fn){var before=current;current=tier==='low'||tier==='very-low'?low:full;try{return fn();}finally{current=before;}},policyFor:function(){return full;}};
  C.viewport={parent:function(el){return el;}};C.presentation.gallery=true;
  C.cutscenes={debug:{profile:'safe',meter:false},register:function(){},profile:function(){return 'safe';},mode:function(){return 'full';},timeline:function(spec){var at=0,sections={};spec.sections.forEach(function(s){sections[s.id]={start:at,ms:s.ms};at+=s.ms;});return {sections:sections,total:at};}};
  // Pure pulse timing from cutscene-runtime.js; keep Safe's 1.8 Hz cap.
  C.cutscenes.pulses=function(spec,factor){var part=C.cutscenes.timeline(spec).sections.topPulse,duration=part.ms/1000,a=(spec.ritual.pulseHzEnd-spec.ritual.pulseHzStart)/(2*duration)*factor,b=spec.ritual.pulseHzStart*factor,total=a*duration*duration+b*duration,out=[];for(var i=0;i<total;i++){var age=i===0?0:(-b+Math.sqrt(b*b+4*a*i))/(2*a);out.push({id:'pulse',key:'pulse:'+i,ms:part.start+age*1000});}return out;};
  // Basic's 880 ms prelude, copied from rarity-intro.js's pure fronts/glow recipe.
  // The gameplay controller itself is deliberately not loaded into the public site.
  C.webPrelude={create:function(){var g,w,h,spec=C.rarity('basic').openingIntro,glows=Object.create(null);
    var clamp=function(n){return Math.max(0,Math.min(1,n));},smooth=function(n){n=clamp(n);return n*n*(3-2*n);},mix=function(a,b,t){return a+(b-a)*t;},color=function(c){return c;},rgba=function(c,a){return 'rgba('+c.join(',')+','+clamp(a)+')';};
    function glow(x, y, r, c, a) {
      if (r <= 0 || a <= 0) return;
      var key = c.join(','), sprite = glows[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 128;
        var q = sprite.getContext('2d'), gradient = q.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, rgba(c, 1)); gradient.addColorStop(.18, rgba(c, .64));
        gradient.addColorStop(.5, rgba(c, .17)); gradient.addColorStop(1, rgba(c, 0));
        q.fillStyle = gradient; q.fillRect(0, 0, 128, 128); glows[key] = sprite;
      }
      var before = g.globalAlpha; g.globalAlpha *= clamp(a); g.drawImage(sprite, x - r, y - r, r * 2, r * 2); g.globalAlpha = before;
    }
    function fronts(spread, opacity, wash) {
      var c = color(spec.color), reach = Math.hypot(w, h) * mix(.105, .57, spread);
      g.save(); g.globalAlpha = opacity * spec.intensity;
      [[0, 0], [w, 0], [w, h], [0, h]].forEach(function (point) {
        g.save(); g.translate(point[0], point[1]); g.rotate(Math.atan2(h / 2 - point[1], w / 2 - point[0]));
        var gradient = g.createLinearGradient(0, 0, reach, 0);
        gradient.addColorStop(0, rgba(c, .02)); gradient.addColorStop(.56, rgba(c, .035));
        gradient.addColorStop(.82, rgba(c, .32)); gradient.addColorStop(.95, rgba(c, .8)); gradient.addColorStop(1, rgba(c, 0));
        g.beginPath(); g.moveTo(0, -reach * .65); g.bezierCurveTo(reach * .4, -reach * .55, reach * .9, -reach * .32, reach, 0);
        g.bezierCurveTo(reach * .9, reach * .32, reach * .4, reach * .55, 0, reach * .65); g.closePath();
        g.fillStyle = gradient; g.fill();
        for (var i = 0; i < 3; i++) {
          var r = reach * (1 - i * .045);
          g.beginPath(); g.ellipse(0, 0, r, r * .72, 0, -.52, .52);
          g.strokeStyle = rgba(c, .58 / (1 + i * 1.7)); g.lineWidth = i ? 1 : 2; g.stroke();
        }
        glow(0, 0, reach * .42, c, .22); g.restore();
      });
      g.fillStyle = rgba(c, wash); g.fillRect(0, 0, w, h); g.restore();
    }
    return {paint:function(context,width,height,time){g=context;w=width;h=height;var at=0;for(var i=0;i<spec.sections.length;i++){var s=spec.sections[i];if(time<=at+s.ms){var p=clamp((time-at)/s.ms);if(s.id==='corners')fronts(.035,smooth(p),0);else if(s.id==='spread')fronts(smooth(p),1,.12*smooth(p));else if(s.id==='peak'){fronts(1,1,.16+.24*Math.sin(p*Math.PI));glow(w/2,h/2,Math.hypot(w,h)*.6,spec.color,.38);}break;}at+=s.ms;}},stop:function(){glows=Object.create(null);g=null;}};
  }};
  C.fx={subscribe:function(){return function(){};},wake:function(){if(root.CardableWeb)root.CardableWeb.wake();}};
  reduced.addEventListener('change',function(e){C.motion.reduced=e.matches;root.document.documentElement.classList.toggle('reduced-motion',e.matches);C.events.emit('motion:changed',e.matches);});
  root.document.documentElement.classList.toggle('reduced-motion',reduced.matches);
})(window.Cardable,window);
