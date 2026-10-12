(function(C,root){
  'use strict';
  var coin='<svg class="currency-mark" viewBox="0 0 32 32" aria-hidden="true"><circle class="currency-mark__edge" cx="16" cy="16" r="14.4"/><circle class="currency-mark__face" cx="16" cy="16" r="11.6"/><circle class="currency-mark__ring" cx="16" cy="16" r="8.6"/><path class="currency-mark__glyph" d="M20 11c-1-1.2-2.2-1.9-4-1.9-3.1 0-5.2 2.8-5.2 6.8s2.1 6.8 5.2 6.8c1.8 0 3-.7 4-1.9"/></svg>';
  function compact(n){return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'K':String(n);}
  C.currencyView={initialized:false,init:function(){
    if(this.initialized)return;this.initialized=true;
    var node=C.packMarkup.node,host=root.document.getElementById('currency-counter');host.replaceChildren();host.classList.add('cb-wallet-chip','cb-credits');
    // A coin that opens into a readout: collapsed until hovered, focused, changed or pinned.
    var trigger=node('button','cb-wallet-trigger',host);trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    node('span','currency-mark-wrap',trigger).innerHTML=coin;
    var readout=node('span','cb-credits-readout',host);readout.setAttribute('aria-hidden','true');node('span','cb-credits-label',readout,'Credits');
    var number=node('span','currency-value',readout),digits=C.numbers.create(number),feed=node('span','cb-wallet-delta',host),popover=node('section','cb-wallet-popover glass',host);
    popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Credits');popover.id='cb-wallet';trigger.setAttribute('aria-controls',popover.id);feed.setAttribute('role','status');feed.setAttribute('aria-live','polite');
    host.dataset.walletState='loading';number.textContent='…';trigger.disabled=true;
    var pinned=false,hover=false,glancing=false,queue=[],effect=null,glanceTimer=null,leaveTimer=null;
    function expand(){var focused=C.input.modality==='keyboard'&&host.contains(root.document.activeElement);host.classList.toggle('is-expanded',hover||glancing||pinned||focused);}
    function glance(ms){glancing=true;expand();root.clearTimeout(glanceTimer);glanceTimer=root.setTimeout(function(){glancing=false;expand();},ms);}
    function render(){
      if(host.dataset.walletState==='loading')number.replaceChildren();host.dataset.walletState='ready';trigger.disabled=false;var save=C.state.current;digits.set(C.formats.number(save.currency,compact(save.currency)),['medium','high'].includes(C.settings.get('quality'))&&!C.motion.reduced);
      trigger.title=save.currency.toLocaleString()+' credits';trigger.setAttribute('aria-label','Credits: '+save.currency.toLocaleString());host.classList.toggle('cb-wallet-zero',save.currency===0);
      if(popover.hidden)return;popover.replaceChildren();
      // Three different numbers, never blended: what you hold, what the cards are estimated to be worth, and what the
      // system would pay for all of them today. The ledger itself stays in the save; receipts are one click away.
      var head=node('div','cb-wallet-head',popover);node('span','cb-wallet-coin',head).innerHTML=coin;var copy=node('div','',head);node('h2','',copy,'Credits');node('strong','cb-wallet-total',copy,save.currency.toLocaleString());
      var worth=0,quick=0;
      if(C.valuation&&C.sales)save.inventory.forEach(function(i){worth+=C.valuation.average(i);var q=C.sales.quote(i);if(q)quick+=q.quote;});
      var dl=node('dl','cb-wallet-values',popover);
      function value(label,amount,note){var row=node('div','',dl);node('dt','',row,label);node('dd','',row,amount);node('small','',row,note);}
      value('Collection estimate','≈ '+worth.toLocaleString(),save.inventory.length+' cards at Average Value. An estimate, not Credits you hold.');
      value('Quick Sell value','≈ '+quick.toLocaleString(),'What the system would pay for all of them now. Another trader would normally pay more.');
      var held=C.marketSim&&C.marketSim.heldCredits?C.marketSim.heldCredits():0;
      if(held)value('Held by open bids and orders',held.toLocaleString(),'Not spendable until they end. Your balance above still counts them.');
      node('p','cb-wallet-helper',popover,save.currency?'Credits come from selling cards and from trades on the Market. Opening a pack pays nothing.':'Sell a card you do not need to earn your first Credits. Opening a pack pays nothing.');
      var links=node('div','cb-wallet-links',popover);
      [['Sell cards…',function(){hide();if(C.bulkSellView)C.bulkSellView.show();}],['Sale receipts',function(){hide();if(C.receiptsView)C.receiptsView.show();}]].forEach(function(pair){var b=node('button','cb-action',links,pair[0]);b.type='button';b.addEventListener('click',pair[1]);});
    }
    function show(){popover.hidden=false;trigger.setAttribute('aria-expanded','true');render();}
    function hide(){pinned=false;popover.hidden=true;trigger.setAttribute('aria-expanded','false');expand();C.events.emit('menu:visibilityHold',{reason:'wallet',active:false});}
    trigger.addEventListener('click',function(){if(pinned){hide();return;}pinned=true;show();expand();C.events.emit('menu:visibilityHold',{reason:'wallet',active:true});});
    host.addEventListener('pointerenter',function(e){if(e.pointerType!=='mouse')return;root.clearTimeout(leaveTimer);hover=true;expand();});
    host.addEventListener('pointerleave',function(){root.clearTimeout(leaveTimer);leaveTimer=root.setTimeout(function(){hover=false;expand();},220);});
    root.document.addEventListener('pointerdown',function(e){if(pinned&&!host.contains(e.target))hide();});
    C.keys.listen(host, 'keydown', 'src.ui.currency.js.1', function(e){if(e.key==='Escape'&&pinned){e.preventDefault();e.stopPropagation();hide();trigger.focus();}});
    host.addEventListener('focusin',expand);
    host.addEventListener('focusout',function(){root.queueMicrotask(function(){if(!host.contains(root.document.activeElement)&&pinned)hide();expand();});});
    function changed(e){render();var delta=e.delta==null?(e.direction||1)*e.amount:e.delta;if(!delta)return;glance(2800);var now=root.performance.now(),last=queue[queue.length-1];if(last&&now-last.at<=400){last.delta+=delta;last.at=now;}else queue.push({at:now,delta:delta});if(queue.length>30){queue[queue.length-2].delta+=queue.pop().delta;}C.fx.wake();}
    C.events.on('currency:changed',changed);C.events.on('save:written',render);C.events.on('save:willReplace',function(){queue=[];effect=null;hide();});C.events.on('menu:idle',function(idle){if(idle){hover=false;glancing=false;hide();}});
    C.fx.subscribe(function(now){
      var moving=digits.update(now);
      if(!effect&&queue.length&&now-queue[0].at>=400){effect=queue.shift();effect.born=now;feed.textContent=(effect.delta>=0?'+':'−')+Math.abs(effect.delta).toLocaleString();host.classList.add('cb-wallet-feedback');}
      if(effect){var p=Math.min(1,(now-effect.born)/1100),animate=['medium','high'].includes(C.settings.get('quality'))&&!C.motion.reduced;feed.style.opacity=String(Math.min(1,p*8,(1-p)*5));feed.style.transform='translateY('+(animate?-p*24:0)+'px)';if(p>=1){effect=null;feed.textContent='';host.classList.remove('cb-wallet-feedback');}else moving=true;}
      return moving||queue.length>0;
    },'currency');
    C.currencyView.el=host;C.currencyView.digits=digits;render();
  }};
})(window.Cardable,window);
