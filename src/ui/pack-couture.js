(function(C,root){
  'use strict';
  // Presentation adapters preserve the registered opening strategies and shared silhouette.
  var recipes={
    standard:{base:'#AAB3BF',dark:'#38434F',accent:'#DFE9F3',ink:'#172331',pattern:'brush',period:12000},
    rare:{base:'#163F83',dark:'#071429',accent:'#92CBFF',ink:'#E5F2FF',pattern:'hex',period:10000},
    nvidia:{base:'#28332C',dark:'#101713',accent:'#96CE4D',ink:'#ECF5E4',pattern:'facet',period:14000},
    amd:{base:'#322629',dark:'#130E13',accent:'#F66167',ink:'#FFF0F1',pattern:'slash',period:12000},
    snapdragon:{base:'#C8AF7D',dark:'#41342C',accent:'#F1DFB8',ink:'#28231F',pattern:'ceramic',period:16000},
    apple:{base:'#C5CEDB',dark:'#717D90',accent:'#F4F8FF',ink:'#243047',pattern:'glass',period:18000},
    classic:{base:'#C6BBA0',dark:'#7A725C',accent:'#F2C16A',ink:'#302E25',pattern:'case',period:14000},
    royal:{base:'#B89341',dark:'#423013',accent:'#FFE4A0',ink:'#FFF3D5',pattern:'mosaic',period:16000},
    titan:{base:'#75818F',dark:'#202834',accent:'#D1E5F5',ink:'#EAF5FE',pattern:'vault',period:18000},
    picker:{base:'#CCD8D9',dark:'#738B91',accent:'#72DBC8',ink:'#213D41',pattern:'triptych',period:15000}
  };
  var states=['ready','waiting','ready-moment','charge','dissolve','hover','swap-in'];
  function decorate(el,pack,state){
    var r=recipes[pack.id]||recipes.standard;
    if(pack.design&&pack.design.face){el.dataset.packVisualState=state||'ready';return;}
    el.dataset.couture=pack.id;el.dataset.packVisualState=state||'ready';
    ['base','dark','accent','ink'].forEach(function(k){el.style.setProperty('--couture-'+k,r[k]);});
    el.dataset.packPattern=r.pattern;
    el.querySelectorAll('.pack-wrapper').forEach(function(w){
      if(w.querySelector('.pack-couture-layer'))return;
      ['grain','relief','light','reflection'].forEach(function(k){C.packMarkup.node('div','pack-skin-layer pack-couture-layer pack-couture-'+k,w).setAttribute('aria-hidden','true');});
    });
    el.querySelectorAll('.pack-print:not(.pack-print--transmitted)').forEach(function(p){
      if(!p.querySelector('.pack-couture-seal'))C.packMarkup.node('span','pack-couture-seal',p,'CB / '+String(pack.id).toUpperCase());
    });
  }
  C.packCouture={recipes:recipes,states:states,setState:decorate};
  Object.keys(C.packSkins.registry).forEach(function(id){
    var skin=C.packSkins.registry[id],quality=skin.quality;
    ['renderIdle','renderWaiting','renderWrapper'].forEach(function(key){var original=skin[key];skin[key]=function(el,pack){original(el,pack);decorate(el,pack,key==='renderWaiting'?'waiting':'ready');};});
    states.forEach(function(s){skin['render'+s.split('-').map(function(x){return x[0].toUpperCase()+x.slice(1);}).join('')]=function(el,pack){skin.renderIdle(el,pack);decorate(el,pack,s);};});
    skin.renderStatic=function(el,pack,tier){skin.renderIdle(el,pack);{var q$=tier||'low';if(el.dataset.packQuality!==q$)el.dataset.packQuality=q$;}};
    skin.swapStyle=C.data.packs.find(function(p){return p.skin===id;}).swapIn||'shared-foil';
    skin.quality=function(el,pose,time,reduced,state){
      var active=quality(el,pose,time,reduced,state),rank=Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')),C.settings.policy.reflection),r=recipes[id]||recipes.standard;
      {var q$=C.settingsSchema.tiers[Math.max(0,rank)];if(el.dataset.packQuality!==q$)el.dataset.packQuality=q$;}
      // Packs with a designed face are not couture-decorated: there are no layers to light.
      if(!el.dataset.couture)return active;
      var rich=rank>=3&&!reduced&&C.settings.policy.ambient;
      if(rank<2)return active;
      var x=(pose.ry||0)/18,y=(pose.rx||0)/18;
      // Inherited variables restyle the whole pack subtree, so only the lamp position stays a variable
      // (several layers read it). Sweep, parallax and breathing are written straight to the one element
      // that uses each, which restyles that element alone. Values are quantized well under a device pixel.
      function q(n,size){return (Math.round(n/size)*size).toFixed(size<.1?2:1);}
      var refs=el._coutureRefs;
      if(!refs||!refs.light||!refs.light.isConnected){refs=el._coutureRefs={light:el.querySelector('.pack-couture-light'),reflection:el.querySelector('.pack-couture-reflection'),graphics:Array.prototype.slice.call(el.querySelectorAll('.pack-graphic')),last:{}};}
      function put(node,key,value,prop){var id=prop||'transform';if(!node)return;var memo=refs.last[key];if(memo===value)return;refs.last[key]=value;node.style[id]=value;}
      el.style.setProperty('--couture-x',q(50+x*25,.1)+'%');el.style.setProperty('--couture-y',q(38+y*18,.1)+'%');
      var px=reduced?0:x*2,py=reduced?0:-y*2,sweep=rich?Math.sin(time/r.period*Math.PI*2)*65:x*45,breathe=rich?Math.round((.5+.5*Math.sin(time/r.period*Math.PI*2))*100)/100:.4;
      put(refs.light,'sweep','translateX('+q(sweep,.1)+'%)');
      var tx=q(px,.05),ty=q(py,.05);
      put(refs.reflection,'reflect','translate('+(tx*1.5).toFixed(2)+'px,'+(ty*1.5).toFixed(2)+'px)');
      put(refs.reflection,'breathe',(.3+breathe*.3).toFixed(3),'opacity');
      refs.graphics.forEach(function(g,i){put(g,'graphic'+i,'translate('+tx+'px,'+ty+'px)');});
      return active||rich;
    };
    var counter=skin.counterThumb;skin.counterThumb=function(host,pack){counter(host,pack);host.dataset.couture=pack.id;host.style.setProperty('--couture-accent',(recipes[pack.id]||recipes.standard).accent);};
  });
})(window.Cardable,window);
