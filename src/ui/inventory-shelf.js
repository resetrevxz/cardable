(function (C, root) {
  'use strict';
  var node = C.packMarkup.node;
  function clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
  C.inventoryTiles = {
    create: function (entry, index, callbacks) {
      var el = node('div','inventory-tile'), pose = node('div','inventory-tile-pose',el), card = node('div','inventory-tile-card',pose);
      el.dataset.cardId = entry.card.id; el.dataset.owned = entry.owned; el.setAttribute('role','option'); el.setAttribute('tabindex','-1');
      var tile = { el:el, pose:pose, card:card, entry:entry, index:index, view:null, visual:null };
      if (entry.owned || entry.rarity.finish === 'secret') {
        tile.view = C.cardView.create(entry.card,entry.instances[0] || { instanceId:'unknown-'+entry.card.id,cardId:entry.card.id,serial:'',seen:true }, { owned:entry.owned,autoFocus:false,autoStamp:false,keyboardFlip:false,shine:true });
        tile.visual=tile.view.el; tile.visual.setAttribute('tabindex','-1'); tile.visual.setAttribute('role','img'); tile.visual.setAttribute('aria-label',entry.owned ? entry.card.name : 'Unknown Secret card'); tile.view.setMode('lite');
      } else {
        tile.visual = node('div','inventory-mystery'); tile.visual.dataset.rarity = entry.rarity.id; tile.visual.dataset.colorMode = C.config.rarityColorMode;
        var finish = C.finishes.describe(entry.rarity.finish,entry.card,{owned:false});
        var liteHost=node('div','inventory-mystery-finish',tile.visual), props=node('div','inventory-mystery-props',tile.visual);
        liteHost.appendChild(C.finishes.registry[entry.rarity.finish].lite(entry.card,{owned:false,colorMode:C.config.rarityColorMode,presentation:finish,propElement:props}));
        var artwork=node('div','inventory-mystery-art',tile.visual); artwork.appendChild(C.inventoryIcons.create('unknown'));
        var badge=node('span','inventory-mystery-badge',tile.visual,entry.rarity.code); badge.setAttribute('aria-hidden','true');
        var title=node('div','inventory-mystery-title',tile.visual,'UNKNOWN CARD'); title.appendChild(C.inventoryIcons.create('lock'));
        node('div','inventory-mystery-meta',tile.visual,(entry.generation ? entry.generation.name : '')+' · '+entry.rarity.name);
      }
      card.appendChild(tile.visual);
      tile.count=node('span','inventory-stack-count',pose,entry.instances.length > 1 ? '×'+entry.instances.length : ''); tile.count.hidden=entry.instances.length<2;
      tile.newDot=node('span','inventory-new-dot',pose,'NEW'); tile.newDot.hidden=!entry.isNew;
      if (entry.instances.length>1) el.classList.add('has-stack');
      el.setAttribute('aria-label',(entry.owned ? entry.card.name : 'Unknown '+entry.rarity.name+' card, '+entry.generation.name)+(entry.instances.length>1?', '+entry.instances.length+' copies':'')+(entry.isNew?', New':''));
      el.addEventListener('click',function(event){ callbacks.activate(tile,event); });
      el.addEventListener('contextmenu',function(event){ event.preventDefault(); callbacks.context(tile,event); });
      el.addEventListener('pointerenter',function(){el.classList.add('is-hovered');}); el.addEventListener('pointerleave',function(){el.classList.remove('is-hovered');});
      el.addEventListener('keydown',function(event){ if(event.key==='Enter' && !event.repeat){event.preventDefault();callbacks.activate(tile,event);} if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();callbacks.context(tile,event);} });
      return tile;
    },
    destroy:function(tile){if(tile.view) tile.view.destroy(); if(tile.el.parentElement) tile.el.remove();},
    recycle:function(tile,entry,index){
      if(tile.view)tile.view.destroy();else if(tile.visual)tile.visual.remove();
      var next=this.create(entry,index,{activate:function(){},context:function(){}});
      tile.entry=entry;tile.index=index;tile.view=next.view;tile.visual=next.visual;tile.card.appendChild(next.visual);tile.card.style.visibility='';
      tile.el.dataset.cardId=entry.card.id;tile.el.dataset.owned=entry.owned;tile.el.setAttribute('aria-label',next.el.getAttribute('aria-label'));
      tile.el.classList.toggle('has-stack',entry.instances.length>1);tile.el.classList.remove('is-acquired','is-hovered');tile.el.style.opacity='';tile.pose.style.translate='';this.refresh(tile,entry);
      return tile;
    },
    refresh:function(tile,entry){tile.entry=entry;tile.count.textContent=entry.instances.length>1?'×'+entry.instances.length:'';tile.count.hidden=entry.instances.length<2;tile.newDot.hidden=!entry.isNew;tile.el.classList.toggle('has-stack',entry.instances.length>1);tile.el.setAttribute('aria-label',(entry.owned?entry.card.name:'Unknown '+entry.rarity.name+' card, '+entry.generation.name)+(entry.instances.length>1?', '+entry.instances.length+' copies':'')+(entry.isNew?', New':''));},
    take:function(tile){var result={entry:tile.entry,view:tile.view,visual:tile.visual,sourceRect:tile.card.getBoundingClientRect()};tile.view=null;tile.visual=null;tile.card.style.visibility='hidden';return result;},
    restore:function(tile,event){tile.card.style.visibility='';tile.card.appendChild(event.visual);tile.view=event.view;tile.visual=event.visual;if(tile.view)tile.view.setMode('lite');}
  };
  C.inventoryShelf = {
    range:function(position,count){var center=clamp(Math.round(position),0,Math.max(0,count-1)),radius=C.config.inventoryMotion.overscan;return {center:center,min:Math.max(0,center-radius),max:Math.min(count-1,center+radius)};},
    create:function(host,callbacks){
      var cfg=C.config.inventoryMotion, el=node('div','inventory-shelf',host), track=node('div','inventory-track',el), light=node('i','inventory-focus-light',el), label=node('div','inventory-group-label',el);
      el.setAttribute('role','listbox');el.setAttribute('tabindex','0');el.setAttribute('aria-label','GPU card shelf');light.style.width=cfg.indicatorWidthPx+'px';
      var spring=C.springs.create(0,{stiffness:C.config.carousel.stiffness,damping:C.config.carousel.damping,epsilon:0.0005}), entries=[],tiles=new Map(),width=180,pitch=204,center=0,drag=null,clickUntil=0,idle=null,dirty=true,active=false,detailId=null;
      function bounds(v){return clamp(v,0,Math.max(0,entries.length-1));}
      function setTarget(v){spring.target=bounds(v);dirty=true;C.fx.wake();}
      function snap(v,velocity){spring.target=bounds(Math.round(v));if(velocity!=null)spring.velocity=clamp(velocity,-15,15);idle=null;dirty=true;C.fx.wake();}
      function cancel(){if(drag&&el.hasPointerCapture(drag.id))el.releasePointerCapture(drag.id);if(drag&&drag.moved)clickUntil=root.performance.now()+cfg.dragClickGuardMs;drag=null;el.classList.remove('is-dragging');}
      var tileCallbacks={activate:function(tile,event){if(root.performance.now()<clickUntil||callbacks.blocked())return;snap(tile.index);callbacks.activate(tile,event);},context:callbacks.context};
      function paint(){
        dirty=false;var range=C.inventoryShelf.range(spring.value,entries.length);center=range.center;var min=range.min,max=range.max,pool=[];
        tiles.forEach(function(tile,index){if(index<min||index>max||entries[index].card.id!==tile.entry.card.id){pool.push(tile);tiles.delete(index);}});
        for(var i=min;i<=max;i++){
          if(entries[i].card.id===detailId)continue;
          var tile=tiles.get(i);if(tile&&!tile.visual){C.inventoryTiles.destroy(tile);tiles.delete(i);tile=null;}if(!tile){tile=pool.length?C.inventoryTiles.recycle(pool.pop(),entries[i],i):C.inventoryTiles.create(entries[i],i,tileCallbacks);track.appendChild(tile.el);tiles.set(i,tile);}else C.inventoryTiles.refresh(tile,entries[i]);
          var delta=i-spring.value,d=Math.min(1,Math.abs(delta)),turn=C.motion.reduced?0:clamp(-delta*cfg.shelfTurnDegrees,-cfg.shelfTurnCap,cfg.shelfTurnCap);
          tile.el.style.transform='translate3d('+delta*pitch+'px,0,0)';tile.el.style.zIndex=String(20-Math.round(Math.abs(delta)));
          tile.pose.style.transform=C.motion.reduced?'none':'translateZ('+(-Math.min(4,Math.abs(delta))*cfg.shelfDepthPx)+'px) rotateY('+turn+'deg) scale('+(1-(1-cfg.shelfSideScale)*d)+')';
          tile.pose.style.opacity=1-(1-cfg.shelfSideOpacity)*d;tile.el.classList.toggle('is-centered',i===center);tile.el.setAttribute('aria-selected',i===center);tile.el.setAttribute('tabindex',i===center?'0':'-1');
          if(tile.view){tile.view.setVisible(active&&Math.abs(delta)*pitch<(el.clientWidth||root.innerWidth)/2+width);tile.view.setMode(active&&i===center&&tile.entry.owned?'full':'lite');}
        }
        pool.forEach(C.inventoryTiles.destroy);
        var fractional=spring.value-Math.round(spring.value), stretch=C.motion.reduced?1:Math.min(cfg.indicatorStretchMax,1+Math.abs(spring.velocity)*0.08);
        light.style.transform='translateX('+(-fractional*pitch)+'px) scaleX('+stretch+')'; light.hidden=!entries.length;
        label.textContent=entries[center]?C.inventoryQuery.group(entries[center],C.inventoryModel.current.groupMode):'';
        el.setAttribute('aria-activedescendant','inventory-shelf-'+center);if(tiles.get(center))tiles.get(center).el.id='inventory-shelf-'+center;
        if(entries[center])callbacks.select(entries[center],center);
      }
      el.addEventListener('wheel',function(event){if(!active||callbacks.blocked())return;event.preventDefault();var unit=event.deltaMode===1?cfg.wheelLinePx:event.deltaMode===2?pitch:1,delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;setTarget(spring.target+delta*unit/pitch);idle=0;},{passive:false});
      el.addEventListener('pointerdown',function(event){if(!active||event.button!==0||callbacks.blocked())return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,at:root.performance.now(),start:spring.value,velocity:0,moved:false};});
      root.document.addEventListener('pointermove',function(event){if(!drag||event.pointerId!==drag.id||callbacks.blocked())return;var dx=event.clientX-drag.x,now=root.performance.now();if(!drag.moved&&Math.abs(dx)>cfg.dragSlopPx&&Math.abs(dx)>Math.abs(event.clientY-drag.y)){drag.moved=true;el.setPointerCapture(drag.id);el.classList.add('is-dragging');}if(!drag.moved)return;event.preventDefault();spring.value=bounds(drag.start-dx/pitch);spring.target=spring.value;spring.velocity=0;drag.velocity=-(event.clientX-drag.lastX)/pitch*1000/Math.max(16,now-drag.at);drag.lastX=event.clientX;drag.at=now;dirty=true;C.fx.wake();});
      function release(event,cancelled){if(!drag||event&&event.pointerId!==drag.id)return;var d=drag;cancel();if(d.moved){var velocity=cancelled||C.motion.reduced?0:d.velocity*Math.exp(-(root.performance.now()-d.at)/cfg.flickDecayMs);snap(spring.value+velocity*cfg.flickProjectionMs/1000,velocity);}}
      root.document.addEventListener('pointerup',function(e){release(e,false);});root.document.addEventListener('pointercancel',function(e){release(e,true);});root.addEventListener('blur',function(){release(null,true);});el.addEventListener('lostpointercapture',function(){release(null,true);});
      el.addEventListener('keydown',function(event){if(!active||callbacks.blocked()||event.target.closest('input,textarea,select'))return;var key=event.key,to=key==='Home'?0:key==='End'?entries.length-1:key==='PageUp'?center-5:key==='PageDown'?center+5:key==='ArrowLeft'?center-1:key==='ArrowRight'?center+1:null;if(to!=null){event.preventDefault();el.focus({preventScroll:true});snap(to);}else if(key==='Enter'&&event.target===el&&tiles.get(center)){event.preventDefault();tileCallbacks.activate(tiles.get(center),event);}});
      return {el:el,tiles:tiles,get center(){return center;},get position(){return spring.value;},get pitch(){return pitch;},get dragging(){return !!drag;},
        setActive:function(value){active=value;el.hidden=!value;tiles.forEach(function(t){if(t.view){t.view.setMode('lite');t.view.setVisible(value);}});dirty=true;},
        setModel:function(next,id){cancel();entries=next;tiles.forEach(C.inventoryTiles.destroy);tiles.clear();var i=entries.findIndex(function(e){return e.card.id===id;});spring.reset(bounds(i<0?center:i));dirty=true;},
        refreshModel:function(next){entries=next;dirty=true;},
        resize:function(height){cancel();width=clamp(Math.min(height-200,height*.62),80,360)*5/7;pitch=width+cfg.tileGapPx;el.style.setProperty('--inventory-tile-width',width+'px');el.style.setProperty('--inventory-tile-height',width*7/5+'px');dirty=true;},
        focus:function(id,instant){var i=entries.findIndex(function(e){return e.card.id===id;});if(i>=0){snap(i);if(instant)spring.reset(i);}},
        update:function(now,dt){if(!active)return false;if(idle!=null){idle+=dt;if(idle>=cfg.wheelSnapMs)snap(spring.target);}var old=spring.value;if(!drag){if(C.motion.reduced){spring.value+= (spring.target-spring.value)*Math.min(1,dt/70);spring.velocity=0;if(Math.abs(spring.value-spring.target)<.001)spring.reset(spring.target);}else spring.step(dt,spring.target);}spring.value=bounds(spring.value);if(dirty||old!==spring.value)paint();return !spring.settled()||idle!=null||!!drag;},
        rect:function(id){var tile=Array.from(tiles.values()).find(function(t){return t.entry.card.id===id;});return tile?tile.card.getBoundingClientRect():null;},
        take:function(tile){detailId=tile.entry.card.id;return C.inventoryTiles.take(tile);},
        reserve:function(id){detailId=id;tiles.forEach(function(t){if(t.entry.card.id===id){if(t.view)t.view.destroy();else if(t.visual)t.visual.remove();t.view=null;t.visual=null;t.card.style.visibility='hidden';}});dirty=true;},
        restore:function(event){detailId=null;var tile=Array.from(tiles.values()).find(function(t){return t.entry.card.id===event.cardId;});if(tile){C.inventoryTiles.restore(tile,event);tile.el.focus({preventScroll:true});}else if(event.view)event.view.destroy();else event.visual.remove();dirty=true;},
        cancel:cancel,clear:function(){cancel();tiles.forEach(C.inventoryTiles.destroy);tiles.clear();detailId=null;},snap:function(index){snap(index);},move:function(delta){setTarget(spring.target+delta);},settled:function(){return spring.settled();},get target(){return spring.target;}
      };
    }
  };
})(window.Cardable,window);
