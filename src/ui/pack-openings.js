/* Opening strategies extend the shared hold/commit/reveal state machine. */
(function(C,root){
  'use strict';
  var registry=Object.create(null);
  C.packOpenings={register:function(id,strategy){registry[id]=strategy;},get:function(pack){return registry[pack.opening]||null;}};
  C.packOpenings.register('pullTab',{
    bind:function(host,foil,pack){
      var value=0,drag=null,transition=null,strip=null,crinkles=[],tab=foil.querySelector('.classic-pull-tab');
      function release(event){if(!drag||event&&event.pointerId!==drag.id)return;var id=drag.id;drag=null;host.classList.remove('is-pull-dragging');crinkles.forEach(function(pixel){pixel.style.opacity=0;});if(host.hasPointerCapture(id))host.releasePointerCapture(id);}
      function paint(){foil.dataset.tabPull=value;foil.style.setProperty('--classic-pull',value);foil.style.setProperty('--classic-tear-steps',Math.floor(value*32)/32);crinkles.forEach(function(pixel,i){var p=(value*9+i*.17)%1;pixel.style.transform='translate('+(Math.sin(i*2.4)*p*34)+'px,'+(-value*70-p*20)+'px) rotate('+(p*160)+'deg)';pixel.style.opacity=drag?Math.sin(p*Math.PI)*.7:0;});}
      return {
        begin:function(){value=0;paint();if(!C.motion.reduced&&C.settings.policy.animation>=2&&!crinkles.length)for(var i=0;i<Math.round(C.settings.policy.particles*8);i++){var pixel=root.document.createElement('i');pixel.className='classic-crinkle';pixel.setAttribute('aria-hidden','true');pixel.style.opacity=0;host.appendChild(pixel);crinkles.push(pixel);}if(tab){tab.style.transform='';tab.style.opacity='';tab.setAttribute('role','img');tab.setAttribute('aria-label','Pull tab. Drag upwards to open, or press Enter.');}},
        start:function(event){if(event.button!==0||event.isPrimary===false||!host.contains(event.target)||!event.target.closest('.classic-pull-tab'))return;release();drag={id:event.pointerId,y:event.clientY,value:value,height:host.getBoundingClientRect().height};host.setPointerCapture(event.pointerId);host.classList.add('is-pull-dragging');event.preventDefault();C.events.emit('cut:started');C.fx.wake();},
        move:function(event,finish){if(!drag||event.pointerId!==drag.id)return;var raw=Math.max(0,(drag.y-event.clientY)/(drag.height*C.config.classicPack.pullDistance));value=Math.min(1,drag.value+Math.pow(raw,1.12)*.94);paint();C.events.emit('cut:progress',value);if(value>=C.config.classicPack.pullSnap){value=1;paint();release();finish();}C.fx.wake();},
        release:release,
        reset:function(){release();value=0;paint();crinkles.forEach(function(pixel){pixel.remove();});crinkles=[];if(strip)strip.remove();strip=null;if(transition)transition.destroy();transition=null;},
        dissolve:function(glass,p,dt){
          if(C.motion.reduced||C.settings.policy.animation===0)return;
          if(!transition)transition=C.packTransitions.create('tornadoPixel',host,pack,glass.el,function(){},{fragmentsOnly:true});
          // Dissolution uses the fragment field only; the committed case remains
          // behind it for the subsequent pull. It never changes the queue.
          transition.update(dt);glass.el.style.opacity=1-p;
          if(p>=1){transition.destroy();transition=null;}
        },
        geometry:function(width,height){return C.cutGeometry.finish([{x:.5,y:0},{x:.5,y:1}],width,height,{axis:'y'});},
        tear:function(halves,p){if(!strip&&tab){strip=tab.cloneNode(true);strip.classList.add('classic-pull-strip');host.appendChild(strip);}if(strip){strip.style.transform=C.motion.reduced?'none':'translateY('+(-80-p*140)+'px) rotate('+p*25+'deg)';strip.style.opacity=1-p;}halves.forEach(function(half){half.style.setProperty('--classic-pull',1);half.querySelectorAll('.classic-pull-tab').forEach(function(t){t.style.visibility='hidden';});});},
        get active(){return !!drag;}
      };
    }
  });
})(window.Cardable,window);
