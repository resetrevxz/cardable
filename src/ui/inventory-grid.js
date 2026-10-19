(function (C, root) {
  'use strict';
  var node=C.packMarkup.node;
  C.inventoryGrid={create:function(host,callbacks){
    var cfg=C.config.inventoryMotion,el=node('div','inventory-grid',host),canvas=node('div','inventory-grid-canvas',el),entries=[],groups=[],layout=[],tiles=new Map(),labels=new Map(),columns=1,width=180,rowHeight=280,height=400,active=false,selected=0,dirty=true,detailId=null;
    el.setAttribute('role','listbox');el.setAttribute('tabindex','0');el.setAttribute('aria-label','GPU card grid');
    // Height follows the animated sheet; row positions depend only on width
    // and model. Keep that catalog-sized layout through height-only frames.
    var geometryWidth=null;
    function geometry(){
      var available=(canvas.clientWidth||Math.max(1,(el.clientWidth||C.viewport.width-80)-cfg.gridGapPx*2)),gap=cfg.gridGapPx;
      if(available===geometryWidth)return false;geometryWidth=available;
      columns=Math.max(1,Math.floor((available+gap)/(cfg.gridMinWidthPx+gap)));width=Math.min(cfg.gridMaxWidthPx,(available-gap*(columns-1))/columns);rowHeight=width*7/5*1.3+gap+72;var x=(available-(width+gap)*columns+gap)/2,y=width*7/5*.18+36,col=0,groupIndex=0;
      layout=[];groups.forEach(function(group){if(col){y+=rowHeight;col=0;}if(group.label)y+=44;group.y=y-(group.label?44:0);for(var i=group.start;i<group.start+group.count;i++){layout[i]={x:x+col*(width+gap),y:y,width:width};col++;if(col===columns){col=0;y+=rowHeight;}}groupIndex++;});
      if(col)y+=rowHeight;canvas.style.height=(y+24)+'px';dirty=true;return true;
    }
    function paint(){dirty=false;var created=0,started=performance.now(),scroll=el.scrollTop||0,min=scroll-rowHeight*2,max=scroll+height+rowHeight;
      tiles.forEach(function(tile,i){if(!layout[i]||layout[i].y<min||layout[i].y>max||entries[i].stackKey!==tile.entry.stackKey){C.inventoryTiles.destroy(tile);tiles.delete(i);}});
      // Layout is ordered by row. Locate the visible range without scanning the catalog per scroll.
      var lo=0,hi=layout.length;while(lo<hi){var mid=(lo+hi)>>1;if(layout[mid].y<min)lo=mid+1;else hi=mid;}
      var order=[];for(var at=lo;at<layout.length&&layout[at].y<=max;at++)order.push(at);
      function priority(i){return i===selected?-1:layout[i].y+rowHeight>scroll&&layout[i].y<scroll+height?0:1;}
      order.sort(function(a,b){return priority(a)-priority(b)||a-b;});
      // Prepare the next row ahead of scrolling, but never mount a whole row in
      // one frame. A selected card always mounts first for keyboard focus.
      for(var oi=0;oi<order.length;oi++){var i=order[oi],p=layout[i];if(entries[i].stackKey===detailId)continue;var tile=tiles.get(i);if(tile&&!tile.visual){C.inventoryTiles.destroy(tile);tiles.delete(i);tile=null;}if(!tile){if(created>=2||(created&&performance.now()-started>=2)){dirty=true;continue;}tile=C.inventoryTiles.create(entries[i],i,{activate:function(t,e){if(!callbacks.blocked()){selected=t.index;callbacks.select(t.entry,t.index);callbacks.activate(t,e);}},context:callbacks.context});canvas.appendChild(tile.el);tiles.set(i,tile);created++;}else C.inventoryTiles.refresh(tile,entries[i]);var geometryKey=[width,p.x,p.y].join('/');if(tile.geometryKey!==geometryKey){tile.geometryKey=geometryKey;tile.el.style.width=width+'px';tile.el.style.height=width*7/5+'px';tile.el.style.transform='translate('+p.x+'px,'+p.y+'px)';tile.el.id='inventory-grid-'+i;}var centered=i===selected;if(tile.centered!==centered){tile.centered=centered;tile.el.classList.toggle('is-centered',centered);tile.el.setAttribute('tabindex',centered?'0':'-1');tile.el.setAttribute('aria-selected',centered);}if(tile.view){tile.view.setMode('lite');tile.view.setVisible(active&&p.y+rowHeight>scroll&&p.y<scroll+height);}}
      labels.forEach(function(label,index){if(!groups[index]||!groups[index].label||groups[index].y<min-44||groups[index].y>max){label.remove();labels.delete(index);}});
      groups.forEach(function(g,i){if(!g.label||g.y<min-44||g.y>max)return;var label=labels.get(i);if(!label){label=node('div','inventory-grid-group',canvas);labels.set(i,label);}var text=g.label+' · '+g.count+' CARDS';if(label.textContent!==text)label.textContent=text;label.style.transform='translateY('+g.y+'px)';});
      el.setAttribute('aria-activedescendant','inventory-grid-'+selected);
    }
    function focusId(id,instant){var i=entries.findIndex(function(e){return e.stackKey===id;});if(i<0)return;selected=i;var p=layout[i],scroll=el.scrollTop||0;if(p&&(p.y<scroll||p.y+rowHeight>scroll+height)){var top=Math.max(0,rowHeight>height?p.y-36:p.y-(height-rowHeight)/2),jump=instant||C.motion.reduced||C.settings.policy.animation===0||Math.abs(top-scroll)>height*2;if(el.scrollTo)el.scrollTo({top:top,behavior:jump?'instant':'smooth'});else el.scrollTop=top;}dirty=true;callbacks.select(entries[i],i);C.fx.wake();}
    // The sheet can change width after the window resize callback (responsive
    // chrome, scrollbars, and font layout). Observe its settled content box.
    if(root.ResizeObserver){var observedWidth=0;new root.ResizeObserver(function(records){var next=records[0].contentRect.width;if(next<=0||Math.abs(next-observedWidth)<.5)return;observedWidth=next;var scroll=el.scrollTop;geometry();el.scrollTop=scroll;C.fx.wake();}).observe(el);}
    el.addEventListener('scroll',function(){dirty=true;C.fx.wake();});
    C.keys.listen(el, 'keydown', 'src.ui.inventory-grid.js.1', function(event){if(!active||callbacks.blocked()||event.target.closest('input,select,textarea'))return;var key=event.key,to=key==='Home'?0:key==='End'?entries.length-1:key==='ArrowLeft'?selected-1:key==='ArrowRight'?selected+1:key==='ArrowUp'?selected-columns:key==='ArrowDown'?selected+columns:key==='PageDown'?selected+columns*Math.max(1,Math.floor(height/rowHeight)):key==='PageUp'?selected-columns*Math.max(1,Math.floor(height/rowHeight)):null;if(to!=null&&entries.length){event.preventDefault();to=Math.max(0,Math.min(entries.length-1,to));focusId(entries[to].stackKey);paint();if(tiles.get(to))tiles.get(to).el.focus({preventScroll:true});}else if(key==='Enter'&&event.target===el&&tiles.get(selected)){event.preventDefault();callbacks.activate(tiles.get(selected),event);}});
    return {el:el,tiles:tiles,get center(){return selected;},get columns(){return columns;},get layout(){return layout;},
      setActive:function(value){active=value;el.hidden=!value;tiles.forEach(function(t){if(t.view)t.view.setVisible(value);});dirty=true;},
      setModel:function(next,id,nextGroups){entries=next;groups=nextGroups||[{label:'',start:0,count:next.length}];geometryWidth=null;tiles.forEach(C.inventoryTiles.destroy);tiles.clear();selected=Math.max(0,entries.findIndex(function(e){return e.stackKey===id;}));geometry();if(entries[selected])focusId(entries[selected].stackKey,true);else el.scrollTop=0;},
      refreshModel:function(next){entries=next;dirty=true;},
      resize:function(value,heightOnly){var next=Math.max(0,value-144);if(next!==height){height=next;dirty=true;}if(heightOnly&&geometryWidth!==null)return;var scroll=el.scrollTop;if(geometry()&&el.scrollTop!==scroll)el.scrollTop=scroll;},focus:focusId,
      update:function(){if(active&&dirty)paint();return active&&dirty;},
      rect:function(id){var tile=Array.from(tiles.values()).find(function(t){return t.entry.stackKey===id;});return tile?tile.card.getBoundingClientRect():null;},
      take:function(tile){detailId=tile.entry.stackKey;return C.inventoryTiles.take(tile);},restore:function(event){detailId=null;var tile=Array.from(tiles.values()).find(function(t){return t.entry.stackKey===event.stackKey;});if(tile)C.inventoryTiles.restore(tile,event);else if(event.view)event.view.destroy();else event.visual.remove();focusId(event.stackKey,true);dirty=true;},
      reserve:function(id){detailId=id;tiles.forEach(function(t){if(t.entry.stackKey===id){if(t.view)t.view.destroy();else if(t.visual)t.visual.remove();t.view=null;t.visual=null;t.card.style.visibility='hidden';}});dirty=true;},scroll:function(delta){el.scrollTop=(el.scrollTop||0)+delta*cfg.gridMinWidthPx;dirty=true;C.fx.wake();},cancel:function(){},clear:function(){tiles.forEach(C.inventoryTiles.destroy);tiles.clear();labels.forEach(function(l){l.remove();});labels.clear();detailId=null;}
    };
  }};
})(window.Cardable,window);
