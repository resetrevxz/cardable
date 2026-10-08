(function (C, root) {
  'use strict';
  var registry = new Map(), host, panels = [], pill, focused, ctx, opened = false, closing, hoverTimer, leaveTimer;
  var surfaces=[];
  var selected = null, highlight, highlightPanel = null, unsubscribe = null, dirty = false, typeBuffer = '', typeAt = 0;
  var pointer = {x:0,y:0}, safeOrigin = null, safeUntil = 0, note = '', noteTimer, initialized = false, outsideClick = false;
  function node(tag, cls, parent, text) { return C.packMarkup.node(tag, cls, parent, text); }
  function disabled(item) { return typeof item.disabled === 'function' ? item.disabled(ctx) : !!item.disabled; }
  function editable(target) { return target && target.closest && target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])'); }
  function blocked() {
    return C.patchNotes&&C.patchNotes.open||C.commands && C.commands.active || C.friendly && C.friendly.modal || root.document.hidden || C.studio && C.studio.active || C.studioAlbumUI && C.studioAlbumUI.active || C.inventory && C.inventory.active || C.preferences && (C.preferences.open || C.preferences.el && !C.preferences.el.hidden) ||
      C.opening && C.opening.phase !== 'idle' || C.tutorial && (C.tutorial.active || C.tutorial.el && !C.tutorial.el.hidden) ||
      C.dev && (C.dev.opened || C.dev.immersive || C.dev.paletteOpen) ||
      !!root.document.querySelector('.save-notice, .settings-data-toast:not([hidden]), .collection-toast:not([hidden]), .dev-palette-backdrop:not([hidden]), .cb-scrim[data-tool-surface=ui], .cb-gallery');
  }
  function targetOf(el) {
    if (!el || !el.closest) return 'empty';
    if (el.closest('.settings-gear')) return 'gear';
    if (el.closest('#currency-counter')) return 'currency';
    if (el.closest('#wordmark')) return 'wordmark';
    if (el.closest('#pack-stage')) return 'pack';
    return 'empty';
  }
  function icon(name, parent) {
    var paths = {
      pack:'M5 4h14v16H5zM5 7h14M9 11h6M9 14h6', inventory:'M4 7h16v13H4zM7 4h10M8 11h8M8 15h8',
      settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
      quality:'M4 6h16v12H4zM8 21h8M12 18v3', dots:'M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01',
      cursor:'M5 3l14 10-7 1-3 7z', motion:'M5 7h14M8 12h11M11 17h8', timer:'M12 8v5l3 2M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M9 1h6',
      color:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18', hide:'M3 3l18 18M4 9l-2 3s4 6 10 6l4-1M8 6l4-1c6 0 10 7 10 7l-3 4',
      fullscreen:'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6', export:'M12 3v12M8 7l4-4 4 4M4 14v7h16v-7',
      replay:'M4 9V3M4 9h6M4 9a8 8 0 1 1 0 8', info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 10v7M12 7h.01',
      copy:'M9 8h11v13H9zM5 16H3V3h11v2', coin:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15 8c-5-3-7 8 0 8',
      check:'M5 12l4 4L19 6', chevron:'M9 5l7 7-7 7', volume:'M3 9h4l5-4v14l-5-4H3zM16 8l5 8M21 8l-5 8'
    };
    if(paths[name])C.icons.register(name,paths[name]);var el=C.icons.create(name||'help');el.classList.add('context-icon');parent.appendChild(el);return el;
  }
  function ensure() {
    if (host) return;
    host=node('div','context-menu-host',root.document.body);host.hidden=true;host.setAttribute('data-context-menu','');
    pill=node('div','context-highlight',host);pill.setAttribute('aria-hidden','true');
    highlight=C.springs.create(0,{stiffness:500,damping:42,mass:1,epsilon:.1});
    host.addEventListener('pointerover',hover);
    host.addEventListener('pointerout',function(e){var row=e.target.closest('.context-item');if(row&&(!e.relatedTarget||!row.contains(e.relatedTarget))&&panels[Number(row.dataset.level)+1]&&panels[Number(row.dataset.level)+1].trigger===row){safeOrigin={x:e.clientX,y:e.clientY};safeUntil=root.performance.now()+300;}if(e.relatedTarget&&host.contains(e.relatedTarget))return;if(panels.length>1){leaveTimer=root.setTimeout(function(){if(opened&&!inTriangle(pointer)){trim(1);}},320);}});
    host.addEventListener('pointerenter',function(){root.clearTimeout(leaveTimer);},true);
    host.addEventListener('click',function(e){if(e.button!==0)return;var row=e.target.closest('.context-item');if(!row)return;e.preventDefault();activate(row);});
  }
  function panelAt(level) {
    var existing=panels[level];if(existing)return existing;
    var el=node('div','context-panel',host), surface=node('div','context-surface glass',el), rows;
    el.dataset.level=level;surface.setAttribute('role','menu');surface.setAttribute('aria-label',level?'Quick settings':'Cardable menu');
    var panel={el:el,surface:surface,rows:null,items:[],buttons:[],x:0,y:0,trigger:null};
    if(level===0){var header=node('div','context-status',surface);header.setAttribute('role','presentation');
      var dot=node('i','context-fluid-dot',header);dot.setAttribute('aria-hidden','true');node('i','',dot);
      panel.packLabel=node('div','context-status-pack',header);panel.timer=C.numbers.create(node('div','context-status-time',header));
      panel.credits=C.numbers.create(node('div','context-status-credits',header));
      panel.notice=node('div','context-notice',header);panel.notice.setAttribute('role','status');panel.notice.setAttribute('aria-live','polite');
    }
    rows=node('div','context-rows',surface);panel.rows=rows;panels.push(panel);return panel;
  }
  function itemsFor(target) {
    var items=[];(registry.get(target)||[]).forEach(function(builder){items=items.concat(builder(ctx)||[]);});return items;
  }
  function render(panel, items) {
    var active=selected && selected.dataset.id, scroll=panel.surface.scrollTop, hadFocus=panel.surface.contains(root.document.activeElement);
    if(highlightPanel===panel){pill.remove();highlightPanel=null;}
    panel.rows.replaceChildren();panel.items=items;panel.buttons=[];
    items.forEach(function(item,i){
      if(item.type==='separator'){node('div','context-separator',panel.rows).setAttribute('role','separator');return;}
      if(item.type==='group'){node('div','context-group',panel.rows,item.label);return;}
      var readout=item.type==='readout', row=node(readout?'div':'button','context-item'+(readout?' is-readout':''),panel.rows);
      row.dataset.id=item.id;row.dataset.level=panel.el.dataset.level;row._item=item;
      row.style.setProperty('--context-index',i);row.style.setProperty('--context-index-capped',Math.min(i,10));
      if(!readout){row.type='button';row.tabIndex=-1;panel.buttons.push(row);}
      row.setAttribute('role',readout?'presentation':item.type==='toggle'?'menuitemcheckbox':item.type==='radio'?'menuitemradio':'menuitem');
      if(item.icon)icon(item.icon,row);else node('span','context-icon-placeholder',row);
      var copy=node('span','context-item-copy',row);node('span','context-label',copy,item.label);
      var off=disabled(item);row.classList.toggle('is-disabled',off||readout);row.setAttribute('aria-disabled',String(off||readout));
      if(off&&item.hint)node('span','context-hint',copy,item.hint);
      if(item.type==='toggle'||item.type==='radio'){row.setAttribute('aria-checked',String(!!item.checked));if(item.type==='toggle'){var toggle=node('i','context-switch',row);toggle.classList.toggle('is-on',!!item.checked);}else if(item.checked)icon('check',row);}
      else if(item.shortcut||item.value)node('span','context-value',row,item.shortcut||item.value);
      if(item.type==='submenu'){row.setAttribute('aria-haspopup','menu');row.setAttribute('aria-expanded','false');icon('chevron',row);}
    });
    panel.surface.scrollTop=scroll;
    var restored=panel.buttons.find(function(b){return b.dataset.id===active && !disabled(b._item);});
    if(restored){select(restored,hadFocus);}
    else if(hadFocus)select(panel.buttons.find(function(b){return !disabled(b._item);}),true);
  }
  function place(panel,x,y,glide) {
    var margin=8,w=panel.surface.offsetWidth,h=panel.surface.offsetHeight;
    var safe=C.viewport.safe,flipX=x+w>safe.right-margin,flipY=y+h>safe.bottom-margin;
    if(flipX)x-=w;if(flipY)y-=h;
    x=Math.max(safe.left+margin,Math.min(x,safe.right-w-margin));y=Math.max(safe.top+margin,Math.min(y,safe.bottom-h-margin));
    panel.x=x;panel.y=y;panel.el.classList.toggle('is-gliding',!!glide);
    panel.el.style.transform='translate3d('+x+'px,'+y+'px,0)';panel.surface.style.transformOrigin=(flipX?'right':'left')+' '+(flipY?'bottom':'top');
  }
  function select(row, keyboard) {
    if(!row||disabled(row._item)||row._item.type==='readout')return;
    if(selected)selected.classList.remove('is-selected');selected=row;row.classList.add('is-selected');
    var panel=panels[Number(row.dataset.level)];
    if(highlightPanel!==panel){panel.rows.appendChild(pill);highlightPanel=panel;highlight.reset(row.offsetTop);}
    highlight.target=row.offsetTop;pill.style.opacity=1;pill.style.setProperty('--pill-scale',row.offsetHeight/34);
    if(keyboard){row.focus({preventScroll:true});row.scrollIntoView({block:'nearest'});}
    C.fx.wake();
  }
  function trim(level) {
    root.clearTimeout(hoverTimer);root.clearTimeout(leaveTimer);safeOrigin=null;
    while(panels.length>level){var p=panels.pop();if(p.trigger)p.trigger.setAttribute('aria-expanded','false');if(highlightPanel===p){pill.remove();highlightPanel=null;}p.el.remove();}
  }
  function submenu(row,keyboard) {
    if(disabled(row._item))return;var level=Number(row.dataset.level)+1;
    if(panels[level]&&panels[level].trigger===row){if(keyboard)focusPanel(panels[level]);return;}
    trim(level);var p=panelAt(level);p.trigger=row;row.setAttribute('aria-expanded','true');
    p.surface.setAttribute('aria-label',row._item.label);
    var items=typeof row._item.items==='function'?row._item.items(ctx):row._item.items||[];
    render(p,items);p.el.classList.remove('is-open');
    var r=C.viewport.rect(row.getBoundingClientRect()),width=p.surface.offsetWidth;
    var x=r.right+8;if(x+width>C.viewport.width-8)x=r.left-width-8;
    p.x=Math.max(8,x);p.y=Math.max(8,Math.min(r.top,C.viewport.height-p.surface.offsetHeight-8));
    p.el.style.transform='translate3d('+p.x+'px,'+p.y+'px,0)';p.surface.style.transformOrigin=x<r.left?'right top':'left top';
    root.requestAnimationFrame(function(){if(opened&&p.el.isConnected)p.el.classList.add('is-open');});
    if(keyboard)focusPanel(p);
  }
  function focusPanel(panel) {
    var first=panel.buttons.find(function(b){return !disabled(b._item);});
    if(first)select(first,true);
    else {if(selected)selected.classList.remove('is-selected');selected=null;panel.surface.tabIndex=-1;panel.surface.focus({preventScroll:true});}
  }
  function inTriangle(p) {
    if(!safeOrigin||panels.length<2||root.performance.now()>safeUntil)return false;
    var r=panels[panels.length-1].el.getBoundingClientRect(),x=r.left>safeOrigin.x?r.left:r.right;
    var a=safeOrigin,b={x:x,y:r.top-12},c={x:x,y:r.bottom+12};
    function cross(u,v,w){return (v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);}
    var d1=cross(a,b,p),d2=cross(b,c,p),d3=cross(c,a,p);return !(d1<0||d2<0||d3<0)||!(d1>0||d2>0||d3>0);
  }
  function hover(e) {
    var row=e.target.closest('.context-item');if(!row||!host.contains(row)||disabled(row._item))return;
    if(inTriangle({x:e.clientX,y:e.clientY})&&panels.length>Number(row.dataset.level)+1&&panels[Number(row.dataset.level)+1].trigger!==row){root.clearTimeout(hoverTimer);hoverTimer=root.setTimeout(function(){if(opened&&row.isConnected&&row.matches(':hover'))hover({target:row,clientX:pointer.x,clientY:pointer.y});},320);return;}
    root.clearTimeout(hoverTimer);root.clearTimeout(leaveTimer);safeOrigin=null;select(row,false);
    if(row._item.type==='submenu')hoverTimer=root.setTimeout(function(){if(opened&&row.isConnected)submenu(row,false);},150);
    else trim(Number(row.dataset.level)+1);
  }
  function notify(text) { note=text;dirty=true;C.fx.wake();root.clearTimeout(noteTimer);noteTimer=root.setTimeout(function(){note='';if(opened){dirty=true;C.fx.wake();}},1200); }
  function activate(row) {
    if(!row||disabled(row._item))return;var item=row._item;
    if(item.type==='submenu'){submenu(row,true);return;}
    if(!C.motion.reduced&&C.settings.get('quality')!=='very-low'){
      row.classList.add('is-pressed');root.setTimeout(function(){row.classList.remove('is-pressed');},130);
      var flash=node('i','context-item-ripple',row);flash.setAttribute('aria-hidden','true');root.setTimeout(function(){flash.remove();},220);
    }
    C.events.emit('contextmenu:select',item.id);
    var stay=item.keepOpen||item.type==='toggle'||item.type==='radio';
    if(!stay)close();
    try{var result=item.run&&item.run(ctx);if(result&&result.catch)result.catch(function(){notify('This action is unavailable here.');});}
    catch(error){notify(error.message||'This action is unavailable here.');}
    if(opened&&item.type==='radio'){var parent=panels[Number(row.dataset.level)].trigger;if(parent){trim(Number(row.dataset.level));select(parent,true);}}
    if(opened){dirty=true;C.fx.wake();}
  }
  function refresh(relocating) {
    if(!opened)return;host.dataset.quality=C.settings.get('quality');
    var p=panels[0],save=C.state.current,pack=ctx.pack=C.packs.upcoming(1)[0],ready=save.packs.ready;
    p.packLabel.textContent=pack.name+(ready?' - Ready':' - Regenerating');
    p.timer.set(ready>=C.config.packs.maxStored?'Stock full':(ready?'Next pack in ':'')+C.timers.format(C.timers.remaining(Date.now())));
    p.credits.set(C.config.currency.name+' '+C.config.currency.symbol+Number(save.currency).toLocaleString());
    p.notice.textContent=note;p.el.style.setProperty('--context-fluid',ready?1:C.timers.progress(Date.now()));
    p.surface.setAttribute('aria-label',p.packLabel.textContent+' '+p.timer.text+', '+p.credits.text);
    var items=itemsFor(ctx.target),signature=JSON.stringify(items,function(k,v){return typeof v==='function'?undefined:v;});
    if(signature!==p.signature){p.signature=signature;var keep=panels.slice(1).map(function(sub){return sub.trigger&&sub.trigger.dataset.id;});render(p,items);
      keep.forEach(function(id,i){var parent=panels[i],row=parent&&parent.buttons.find(function(b){return b.dataset.id===id;});if(!row){trim(i+1);return;}var sub=panels[i+1];if(sub){sub.trigger=row;row.setAttribute('aria-expanded','true');render(sub,typeof row._item.items==='function'?row._item.items(ctx):row._item.items||[]);}});
      if(!relocating)place(p,ctx.x,ctx.y,false);
    }
    panels.slice(1).forEach(function(sub,i){var parent=panels[i],row=parent.buttons.find(function(b){return b.dataset.id===sub.trigger.dataset.id;});if(!row){trim(i+1);return;}sub.trigger=row;row.setAttribute('aria-expanded','true');var items=typeof row._item.items==='function'?row._item.items(ctx):row._item.items||[],signature=JSON.stringify(items);if(signature!==sub.signature){sub.signature=signature;render(sub,items);}});
  }
  function update(now,dt) {
    if(!opened)return false;if(dirty){dirty=false;refresh();}
    var timerMoving=panels[0].timer.update(now),creditsMoving=panels[0].credits.update(now),moving=timerMoving||creditsMoving;
    if(highlightPanel){if(C.motion.reduced||['low','very-low'].includes(C.settings.get('quality')))highlight.reset(highlight.target);else highlight.step(dt,highlight.target);
      pill.style.transform='translate3d(0,'+highlight.value+'px,0) scaleY(var(--pill-scale,1))';moving=!highlight.settled()||moving;}
    return moving;
  }
  function open(x,y,target,keyboard) {
    var point=C.viewport.local({x:x,y:y});x=point.x;y=point.y;
    if(blocked())return false;ensure();root.clearTimeout(closing);
    var wasOpen=opened;if(!wasOpen)focused=root.document.activeElement;
    opened=true;host.hidden=false;host.inert=false;note='';selected=null;trim(1);
    ctx={target:targetOf(target),element:target,x:x,y:y,pack:C.packs.upcoming(1)[0]};
    if(!ctx.pack){close();return false;}
    C.events.emit('menu:activity');C.events.emit('menu:visibilityHold',{reason:'context-menu',active:true});
    var p=panelAt(0);p.signature=null;dirty=false;refresh(true);place(p,x,y,wasOpen);
    if(!unsubscribe)unsubscribe=C.fx.subscribe(update,'context menu');
    if(!wasOpen){p.el.classList.remove('is-open');root.requestAnimationFrame(function(){if(opened)p.el.classList.add('is-open');});C.events.emit('contextmenu:open',ctx);C.events.emit('dots:pulse',{x:x,y:y,intensity:.08});}
    else p.el.classList.add('is-open');
    select(p.buttons.find(function(b){return !disabled(b._item);}),true);
    C.fx.wake();return true;
  }
  function close(options) {
    if(!opened)return;opened=false;root.clearTimeout(hoverTimer);root.clearTimeout(leaveTimer);root.clearTimeout(noteTimer);
    if(unsubscribe){unsubscribe();unsubscribe=null;}host.inert=true;panels.forEach(function(p){p.el.classList.remove('is-open');});
    closing=root.setTimeout(function(){host.hidden=true;trim(1);},C.settings.get('quality')==='very-low'?0:100);
    C.events.emit('menu:visibilityHold',{reason:'context-menu',active:false});C.events.emit('contextmenu:close');
    if(!options||options.focus!==false)if(focused&&focused.isConnected&&!focused.inert)focused.focus({preventScroll:true});
  }
  function keydown(e) {
    var launch=e.key==='ContextMenu'||e.shiftKey&&e.key==='F10';if(launch&&surfaces.slice().some(function(handle){return handle(e)===true;}))return;
    if(launch&&!editable(e.target)){e.preventDefault();e.stopImmediatePropagation();if(!blocked()){var pack=root.document.getElementById('pack-stage'),r=pack.getBoundingClientRect();open(r.left+r.width/2,r.top+r.height/2,pack,true);}return;}
    if(!opened)return;
    if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    e.stopImmediatePropagation();
    if(['Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key))e.preventDefault();
    if(e.key==='Escape'){close();return;}
    var level=selected?Number(selected.dataset.level):panels.length-1,p=panels[level],buttons=p.buttons.filter(function(b){return !disabled(b._item);}),at=buttons.indexOf(selected);
    if(e.key==='ArrowLeft'&&level){var parent=p.trigger;trim(level);select(parent,true);return;}
    if(e.key==='ArrowRight'){if(selected&&selected._item.type==='submenu')submenu(selected,true);return;}
    if(e.key==='Enter'||e.key===' '){if(!e.repeat)activate(selected);return;}
    var next=e.key==='Home'?0:e.key==='End'?buttons.length-1:e.key==='ArrowDown'?(at+1)%buttons.length:e.key==='ArrowUp'?(at-1+buttons.length)%buttons.length:null;
    if(next!==null){select(buttons[next],true);return;}
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){var now=Date.now();typeBuffer=now-typeAt>700?'':typeBuffer;typeAt=now;typeBuffer+=e.key.toLowerCase();if(/^(.)(\1)*$/.test(typeBuffer))typeBuffer=typeBuffer[0];
      var found=buttons.slice(at+1).concat(buttons.slice(0,at+1)).find(function(b){return b._item.label.toLowerCase().startsWith(typeBuffer);});select(found,true);}
  }
  C.contextMenu={registerSurface:function(handle){surfaces.push(handle);return function(){var i=surfaces.indexOf(handle);if(i>=0)surfaces.splice(i,1);};},register:function(def){if(!registry.has(def.target))registry.set(def.target,[]);registry.get(def.target).push(def.build);},get open(){return opened;},show:open,close:close,notify:notify,refresh:function(){if(opened){dirty=true;C.fx.wake();}},init:function(){
    if(initialized)return;initialized=true;
    root.document.addEventListener('contextmenu',function(e){
      if(surfaces.slice().some(function(handle){return handle(e)===true;}))return;
      if(editable(e.target)||e.shiftKey&&new URLSearchParams(root.location.search).get('dev')==='1'){close({focus:false});return;}
      e.preventDefault();e.stopImmediatePropagation();if(blocked()){close();return;}
      var target=host&&host.contains(e.target)?ctx.element:e.target;open(e.clientX,e.clientY,target,false);
    },true);
    root.document.addEventListener('keydown',keydown,true);
    root.document.addEventListener('pointerdown',function(e){outsideClick=false;if(opened&&e.button===0&&!host.contains(e.target)){outsideClick=true;e.preventDefault();e.stopImmediatePropagation();close();}},true);
    root.document.addEventListener('click',function(e){if(outsideClick){outsideClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
    root.document.addEventListener('pointermove',function(e){if(!opened)return;pointer={x:e.clientX,y:e.clientY};if(host.dataset.quality==='high'){panels.forEach(function(p){var r=p.surface.getBoundingClientRect();p.surface.style.setProperty('--context-light-x',e.clientX-r.left+'px');p.surface.style.setProperty('--context-light-y',e.clientY-r.top+'px');});}if(inTriangle(pointer))root.clearTimeout(leaveTimer);},true);
    ['blur','resize'].forEach(function(name){root.addEventListener(name,function(){close();});});
    ['wheel','scroll'].forEach(function(name){root.document.addEventListener(name,function(e){if(!host||!host.contains(e.target))close();},{capture:true,passive:true});});
    root.document.addEventListener('visibilitychange',function(){if(root.document.hidden)close();});
    ['timer:tick','save:written','settings:changed','currency:changed','fullscreenchange'].forEach(function(name){if(name==='fullscreenchange')root.document.addEventListener(name,C.contextMenu.refresh);else C.events.on(name,C.contextMenu.refresh);});
    ['opening:context','inventory:context','preferences:context','tutorial:context'].forEach(function(name){C.events.on(name,function(e){if(e.active)close();});});
    C.events.on('menu:visibilityHold',function(e){if(e.active&&e.reason!=='context-menu'&&blocked())close();});
    C.events.on('packs:queueChanged',function(){C.contextMenu.refresh();});
    C.events.on('data:changed',function(){if(blocked())close();else C.contextMenu.refresh();});
  }};
})(window.Cardable,window);
