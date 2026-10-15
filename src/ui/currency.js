(function(C,root){
  'use strict';var uid=0;
  C.currencyView={init:function(){},create:function(host){
    var node=C.packMarkup.node,off=[],dead=false,pinned=false;
    host.classList.add('shop-wallet');var trigger=node('button','shop-wallet-trigger',host);trigger.type='button';trigger.appendChild(C.icons.create('coin'));
    var number=node('strong','',trigger),popover=node('section','shop-wallet-popover cb-popover',host);popover.id='shop-wallet-'+(++uid);popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Credits');trigger.setAttribute('aria-controls',popover.id);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','dialog');
    function render(){if(dead)return;var balance=C.state.current.currency;number.textContent=balance.toLocaleString();trigger.setAttribute('aria-label','Credits: '+balance.toLocaleString());trigger.dataset.tooltip='Credits';if(!pinned)return;popover.replaceChildren();node('strong','',popover,balance.toLocaleString()+' Credits');node('p','',popover,balance?'Earn Credits from packs and duplicate cards.':'Open a pack to earn Credits.');}
    function hide(){if(!pinned)return false;pinned=false;trigger.setAttribute('aria-expanded','false');C.ui.exit(popover,function(){popover.hidden=true;});return true;}
    trigger.addEventListener('click',function(){if(pinned){hide();return;}pinned=true;C.ui.enter(popover);popover.hidden=false;trigger.setAttribute('aria-expanded','true');render();});
    function outside(e){if(pinned&&!host.contains(e.target))hide();}root.document.addEventListener('pointerdown',outside);
    off.push(C.keys.listen(host,'keydown','shop.wallet',function(e){if(e.key==='Escape'&&hide()){e.preventDefault();e.stopPropagation();trigger.focus();}}));off.push(C.events.on('currency:changed',render));off.push(C.events.on('save:written',render));render();
    return {refresh:render,destroy:function(){dead=true;root.document.removeEventListener('pointerdown',outside);off.forEach(function(fn){fn();});host.replaceChildren();}};
  }};
})(window.Cardable,window);
