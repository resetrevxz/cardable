(function(C,root){'use strict';
  var unit=null,lastPack=null,lastState=null,host=root.document.getElementById('pack'),open=root.document.getElementById('open');
  function update(state){if(!state)return;var pack=C.pack(state.packId);if(!pack)return;
    root.document.documentElement.dataset.rarityColor=state.rarityColor||'color';root.document.getElementById('stack').textContent=state.ready+' stored';
    var changed=lastPack!==pack.id,mode=state.ready?'ready':'waiting';
    if(changed){host.replaceChildren();unit=C.packMarkup.unit(host,false,pack);lastPack=pack.id;root.document.getElementById('name').textContent=pack.name;}
    if(changed||!lastState||!!lastState.ready!==!!state.ready){host.dataset.state=mode;C.packSkins.apply(unit.el,pack,state.ready?'idle':'waiting');open.disabled=state.ready<=0;}
    if(!lastState||lastState.ready!==state.ready)host.dataset.ready=state.ready;
    if(changed||!lastState||lastState.quality!==state.quality)root.document.documentElement.dataset.quality=state.quality;
    var tiers=['very-low','low','medium','high'],graphics=state.graphics||{};
    ['finishQuality','reflectionQuality','propQuality','particleQuality','shadowQuality','glassQuality','backgroundQuality','animationQuality','canvasQuality','cinematicQuality'].forEach(function(key){var value=graphics[key]||state.quality;if(!lastState||value!==((lastState.graphics||{})[key]||lastState.quality))root.document.documentElement.setAttribute('data-'+key.replace(/[A-Z]/g,function(letter){return '-'+letter.toLowerCase();}),value);});
    var packQuality=tiers[Math.min(tiers.indexOf(graphics.finishQuality||state.quality),tiers.indexOf(graphics.reflectionQuality||state.quality))];
    if(unit.el.dataset.packQuality!==packQuality)unit.el.dataset.packQuality=packQuality;
    if(!lastState||lastState.reduced!==state.reduced)root.document.documentElement.classList.toggle('reduced-motion',state.reduced);
    if(changed||!lastState||lastState.ready!==state.ready||!state.ready&&lastState.progress!==state.progress)unit.fluid.style.transform='translateY('+(1-(state.ready?1:state.progress))*100+'%)';
    if(!lastState||lastState.ready!==state.ready||!state.ready&&lastState.countdown!==state.countdown)root.document.getElementById('countdown').textContent=state.ready?state.ready+' pack'+(state.ready===1?'':'s')+' ready':'Next in '+state.countdown;
    lastState=state;
  }
  var queued=null,timer=null,lastPaint=0,menu=null;
  function enqueue(state){queued=state;if(root.document.hidden||timer!=null)return;timer=root.setTimeout(function(){timer=null;if(root.document.hidden)return;lastPaint=root.performance.now();update(queued);},Math.max(0,34-(root.performance.now()-lastPaint)));}
  root.document.addEventListener('visibilitychange',function(){root.document.body.classList.toggle('is-occluded',root.document.hidden);if(!root.document.hidden&&queued)enqueue(queued);});
  root.cardableMini.onState(enqueue);root.cardableMini.getState().then(enqueue).catch(function(error){root.console.error('Mini state:',error);});
  root.document.getElementById('expand').addEventListener('click',function(){root.cardableMini.restore();});open.addEventListener('click',function(){root.cardableMini.open();});
  var main=root.document.querySelector('main');main.dataset.help='mini';var help=C.ui.create('help',{help:'mini',label:'Mini mode help'});root.document.querySelector('header').appendChild(help);
  var drag=null;root.document.addEventListener('pointerdown',function(e){if(e.button!==0||e.target.closest('button,input,select,.cb-mini-menu'))return;drag={x:e.screenX,y:e.screenY,id:e.pointerId};root.document.body.setPointerCapture(e.pointerId);});
  root.document.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.screenX-drag.x,dy=e.screenY-drag.y;if(Math.abs(dx)+Math.abs(dy)<3)return;drag.x=e.screenX;drag.y=e.screenY;root.cardableMini.move({dx:dx,dy:dy});});
  root.document.addEventListener('pointerup',function(){drag=null;});root.document.addEventListener('pointercancel',function(){drag=null;});
  root.document.addEventListener('contextmenu',function(event){event.preventDefault();if(menu)menu.remove();menu=C.ui.create('popover',{className:'cb-mini-menu'});menu.appendChild(C.ui.create('button',{label:'Expand Cardable',onClick:function(){root.cardableMini.restore();}}));var pin=C.ui.create('switch',{label:'Always on top',value:queued&&queued.miniPinned,onChange:function(v){root.cardableMini.configure({pinned:v});}});var label=root.document.createElement('label');label.textContent='Always on top';label.appendChild(pin);menu.appendChild(label);var opacity=root.document.createElement('label');opacity.textContent='Window opacity';opacity.appendChild(C.ui.create('slider',{label:'Window opacity',min:50,max:100,value:Math.round((queued&&queued.miniOpacity||1)*100),onChange:function(v){root.cardableMini.configure({opacity:v/100});}}));menu.appendChild(opacity);menu.appendChild(C.ui.create('button',{label:'Close menu',onClick:function(){menu.remove();menu=null;}}));root.document.body.appendChild(menu);menu.style.left=Math.max(8,Math.min(root.innerWidth-menu.offsetWidth-8,event.clientX))+'px';menu.style.top=Math.max(8,Math.min(root.innerHeight-menu.offsetHeight-8,event.clientY))+'px';menu.querySelector('button').focus();});
  root.document.addEventListener('dblclick',function(event){if(!event.target.closest('button,input,select,.cb-mini-menu'))root.cardableMini.restore();});
  root.document.addEventListener('keydown',function(event){if(event.key==='Escape'&&menu){event.preventDefault();menu.remove();menu=null;return;}if(event.key==='Escape'||(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='m'){event.preventDefault();root.cardableMini.restore();}});
})(window.Cardable,window);
