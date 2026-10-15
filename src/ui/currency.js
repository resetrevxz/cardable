(function(C,root){
  'use strict';var uid=0;
  // The wallet lives in the Shop (the main menu no longer carries a Credits chip). Its popover keeps three different
  // numbers, never blended: what you hold, what the cards are estimated to be worth, and what the system would pay for
  // all of them today. The ledger stays in the save; receipts are one click away.
  C.currencyView={init:function(){},create:function(host){
    var node=C.packMarkup.node,off=[],dead=false,pinned=false;
    host.classList.add('shop-wallet');var trigger=node('button','shop-wallet-trigger',host);trigger.type='button';trigger.appendChild(C.icons.create('coin'));
    var number=node('strong','',trigger),popover=node('section','shop-wallet-popover cb-popover',host);popover.id='shop-wallet-'+(++uid);popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Credits');trigger.setAttribute('aria-controls',popover.id);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','dialog');
    function hide(){if(!pinned)return false;pinned=false;trigger.setAttribute('aria-expanded','false');C.ui.exit(popover,function(){popover.hidden=true;});return true;}
    function render(){
      if(dead)return;var save=C.state.current,balance=save.currency;number.textContent=balance.toLocaleString();trigger.setAttribute('aria-label','Credits: '+balance.toLocaleString());trigger.dataset.tooltip='Credits';
      if(!pinned)return;popover.replaceChildren();
      node('strong','',popover,balance.toLocaleString()+' Credits');
      var worth=0,quick=0;
      if(C.valuation&&C.sales)save.inventory.forEach(function(i){worth+=C.valuation.average(i);var q=C.sales.quote(i);if(q)quick+=q.quote;});
      var dl=node('dl','cb-wallet-values',popover);
      function value(label,amount,note){var row=node('div','',dl);node('dt','',row,label);node('dd','',row,amount);node('small','',row,note);}
      if(C.valuation){
        value('Collection estimate','≈ '+worth.toLocaleString(),save.inventory.length+' cards at Average Value. An estimate, not Credits you hold.');
        value('Quick Sell value','≈ '+quick.toLocaleString(),'What the system would pay for all of them now. Another trader would normally pay more.');
      }
      var held=C.marketSim&&C.marketSim.heldCredits?C.marketSim.heldCredits():0;
      if(held)value('Held by open bids and orders',held.toLocaleString(),'Not spendable until they end. Your balance above still counts them.');
      node('p','cb-wallet-helper',popover,balance?'Credits come from selling cards and from trades on the Market. Opening a pack pays nothing.':'Sell a card you do not need to earn your first Credits. Opening a pack pays nothing.');
      var links=node('div','cb-wallet-links',popover);
      [['Sell cards…',function(){hide();if(C.bulkSellView)C.bulkSellView.show();}],['Sale receipts',function(){hide();if(C.receiptsView)C.receiptsView.show();}]].forEach(function(pair){var b=node('button','cb-button cb-wallet-link',links,pair[0]);b.type='button';b.addEventListener('click',pair[1]);});
    }
    trigger.addEventListener('click',function(){if(pinned){hide();return;}pinned=true;C.ui.enter(popover);popover.hidden=false;trigger.setAttribute('aria-expanded','true');render();});
    function outside(e){if(pinned&&!host.contains(e.target))hide();}root.document.addEventListener('pointerdown',outside);
    off.push(C.keys.listen(host,'keydown','shop.wallet',function(e){if(e.key==='Escape'&&hide()){e.preventDefault();e.stopPropagation();trigger.focus();}}));off.push(C.events.on('currency:changed',render));off.push(C.events.on('save:written',render));render();
    return {refresh:render,destroy:function(){dead=true;root.document.removeEventListener('pointerdown',outside);off.forEach(function(fn){fn();});host.replaceChildren();}};
  }};
})(window.Cardable,window);
