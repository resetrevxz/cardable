(function(C,root){'use strict';
  var unit=null,lastPack=null,host=root.document.getElementById('pack'),open=root.document.getElementById('open');
  function update(state){if(!state)return;var pack=C.pack(state.packId);if(!pack)return;
    if(lastPack!==pack.id){host.replaceChildren();unit=C.packMarkup.unit(host,false,pack);lastPack=pack.id;}
    host.dataset.state=state.ready?'ready':'waiting';host.dataset.ready=state.ready;unit.el.dataset.packQuality=state.quality;
    C.packSkins.apply(unit.el,pack,state.ready?'idle':'waiting');unit.fluid.style.transform='translateY('+(1-(state.ready?1:state.progress))*100+'%)';
    root.document.documentElement.dataset.quality=state.quality;root.document.documentElement.classList.toggle('reduced-motion',state.reduced);
    root.document.getElementById('name').textContent=pack.name;root.document.getElementById('countdown').textContent=state.ready?state.ready+' pack'+(state.ready===1?'':'s')+' ready':'Next in '+state.countdown;open.disabled=state.ready<=0;
  }
  root.cardableMini.onState(update);root.cardableMini.getState().then(update).catch(function(error){root.console.error('Mini state:',error);});
  root.document.getElementById('expand').addEventListener('click',function(){root.cardableMini.restore();});open.addEventListener('click',function(){root.cardableMini.open();});
  root.document.addEventListener('dblclick',function(event){if(!event.target.closest('button'))root.cardableMini.restore();});
  root.document.addEventListener('keydown',function(event){if(event.key==='Escape'||(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='m'){event.preventDefault();root.cardableMini.restore();}});
})(window.Cardable,window);
