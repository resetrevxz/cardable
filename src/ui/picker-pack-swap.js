/* This factory is advanced by the existing pack/opening subscription. */
(function(C){
  'use strict';
  var node=C.packMarkup.node;
  C.packTransitions.register('fanCollapse',function(host,source,target,adopt){
    var motion=!C.motion.reduced&&C.settings.policy.animation>=2,duration=motion?1200:C.config.packSwap.reducedMs,age=0,done=false,adopted=false;
    var fan=node('div','picker-swap-fan',host);fan.setAttribute('aria-hidden','true');
    var backs=[];for(var i=0;i<3;i++){var back=node('div','picker-swap-back',fan);node('span','',back,'C');backs.push(back);}
    target.style.opacity=0;
    function clean(){fan.remove();target.style.opacity='';target.style.transform='';}
    return {duration:duration,update:function(dt){
      if(done)return false;age+=dt;var p=Math.min(1,age/duration),spread=Math.sin(Math.min(1,p/.72)*Math.PI),collapse=Math.max(0,(p-.45)/.55);
      if(!adopted&&p>=.45){adopt();adopted=true;}
      backs.forEach(function(back,i){back.style.transform=motion?'translateX('+((i-1)*spread*46)+'px) rotate('+((i-1)*spread*19)+'deg) scale('+(1-collapse*.08)+')':'none';back.style.opacity=motion?(1-Math.max(0,(p-.6)/.4))*.85:1-p;});
      target.style.opacity=adopted?Math.min(1,(p-.45)/.55):0;target.style.transform=motion?'scale('+(.97+.03*Math.min(1,collapse))+')':'none';
      if(p===1){done=true;clean();return false;}return true;
    },destroy:function(){done=true;clean();}};
  });
})(window.Cardable);
