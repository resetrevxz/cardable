(function(C,root){'use strict';
  var unit=null,lastPack=null,lastState=null,host=root.document.getElementById('pack'),open=root.document.getElementById('open');
  function update(state){if(!state)return;var pack=C.pack(state.packId);if(!pack)return;
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
  root.cardableMini.onState(update);root.cardableMini.getState().then(update).catch(function(error){root.console.error('Mini state:',error);});
  root.document.getElementById('expand').addEventListener('click',function(){root.cardableMini.restore();});open.addEventListener('click',function(){root.cardableMini.open();});
  root.document.addEventListener('dblclick',function(event){if(!event.target.closest('button'))root.cardableMini.restore();});
  root.document.addEventListener('keydown',function(event){if(event.key==='Escape'||(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='m'){event.preventDefault();root.cardableMini.restore();}});
})(window.Cardable,window);
