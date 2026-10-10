(function(C,root){
  'use strict';
  var coin='<svg class="currency-mark" viewBox="0 0 32 32" aria-hidden="true"><circle class="currency-mark__edge" cx="16" cy="16" r="14.4"/><circle class="currency-mark__face" cx="16" cy="16" r="11.6"/><circle class="currency-mark__ring" cx="16" cy="16" r="8.6"/><path class="currency-mark__glyph" d="M20 11c-1-1.2-2.2-1.9-4-1.9-3.1 0-5.2 2.8-5.2 6.8s2.1 6.8 5.2 6.8c1.8 0 3-.7 4-1.9"/></svg>';
  function compact(n){return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'K':String(n);}
  C.currencyView={initialized:false,init:function(){
    if(this.initialized)return;this.initialized=true;
    var node=C.packMarkup.node,host=root.document.getElementById('currency-counter');host.replaceChildren();host.classList.add('cb-wallet-chip');
    var trigger=node('button','cb-wallet-trigger',host);trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    node('span','currency-mark-wrap',trigger).innerHTML=coin;
    var balance=node('span','currency-balance',trigger);node('span','currency-label',balance,'Credits');var number=node('span','currency-value',balance),digits=C.numbers.create(number),feed=node('span','cb-wallet-delta',host),popover=node('section','cb-wallet-popover glass',host);
    popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Wallet');popover.id='cb-wallet';trigger.setAttribute('aria-controls',popover.id);feed.setAttribute('role','status');feed.setAttribute('aria-live','polite');
    host.dataset.walletState='loading';number.textContent='…';trigger.disabled=true;
    var pinned=false,queue=[],effect=null,closeTimer=null;
    function render(){
      if(host.dataset.walletState==='loading')number.replaceChildren();host.dataset.walletState='ready';trigger.disabled=false;var save=C.state.current;digits.set(C.formats.number(save.currency,compact(save.currency)),['medium','high'].includes(C.settings.get('quality'))&&!C.motion.reduced);
      trigger.title=save.currency.toLocaleString()+' credits';trigger.setAttribute('aria-label','Wallet: '+save.currency.toLocaleString()+' credits');host.classList.toggle('cb-wallet-zero',save.currency===0);
      if(popover.hidden)return;popover.replaceChildren();
      // Balance only: the ledger stays in the save, without a history list in the way.
      var head=node('div','cb-wallet-head',popover);node('span','cb-wallet-coin',head).innerHTML=coin;var copy=node('div','',head);node('h2','',copy,'Credits');node('strong','cb-wallet-total',copy,save.currency.toLocaleString());
      node('p','cb-wallet-helper',popover,save.currency?'Earned from packs, duplicates and achievements.':'Open a pack to earn your first credits.');
      var close=node('button','cb-wallet-close',popover,'Done');close.type='button';close.addEventListener('click',hide);
    }
    function show(){root.clearTimeout(closeTimer);popover.hidden=false;trigger.setAttribute('aria-expanded','true');render();}
    function hide(){pinned=false;popover.hidden=true;trigger.setAttribute('aria-expanded','false');root.clearTimeout(closeTimer);C.events.emit('menu:visibilityHold',{reason:'wallet',active:false});}
    trigger.addEventListener('click',function(){if(pinned){hide();return;}pinned=true;show();C.events.emit('menu:visibilityHold',{reason:'wallet',active:true});popover.querySelector('button').focus();});
    host.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')show();});host.addEventListener('pointerleave',function(){if(!pinned)closeTimer=root.setTimeout(hide,180);});
    root.document.addEventListener('pointerdown',function(e){if(!host.contains(e.target))hide();});
    C.keys.listen(host, 'keydown', 'src.ui.currency.js.1', function(e){if(e.key==='Escape'&&!popover.hidden){e.preventDefault();e.stopPropagation();hide();trigger.focus();}});
    host.addEventListener('focusout',function(){root.queueMicrotask(function(){if(!host.contains(root.document.activeElement)&&!host.matches(':hover'))hide();});});
    function changed(e){render();var delta=e.delta==null?(e.direction||1)*e.amount:e.delta;if(!delta)return;var now=root.performance.now(),last=queue[queue.length-1];if(last&&now-last.at<=400){last.delta+=delta;last.at=now;}else queue.push({at:now,delta:delta});if(queue.length>30){queue[queue.length-2].delta+=queue.pop().delta;}C.fx.wake();}
    C.events.on('currency:changed',changed);C.events.on('save:written',render);C.events.on('save:willReplace',function(){queue=[];effect=null;hide();});C.events.on('menu:idle',function(idle){if(idle)hide();});
    C.fx.subscribe(function(now){
      var moving=digits.update(now);
      if(!effect&&queue.length&&now-queue[0].at>=400){effect=queue.shift();effect.born=now;feed.textContent=(effect.delta>=0?'+':'−')+Math.abs(effect.delta).toLocaleString();host.classList.add('cb-wallet-feedback');}
      if(effect){var p=Math.min(1,(now-effect.born)/1100),animate=['medium','high'].includes(C.settings.get('quality'))&&!C.motion.reduced;feed.style.opacity=String(Math.min(1,p*8,(1-p)*5));feed.style.transform='translateY('+(animate?-p*24:0)+'px)';if(p>=1){effect=null;feed.textContent='';host.classList.remove('cb-wallet-feedback');}else moving=true;}
      return moving||queue.length>0;
    },'currency');
    C.currencyView.el=host;C.currencyView.digits=digits;render();
  }};
})(window.Cardable,window);
