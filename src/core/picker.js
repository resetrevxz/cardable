/* Unminted offers and exact-once choice. No storage or presentation in pure helpers. */
(function(C){
  'use strict';
  function tier(result){return C.rarity(C.card(result.cardId).rarity).tier;}
  function isChoicePack(pack){return !!pack&&pack.cardsShown>pack.cardsKept;}
  function effectivePack(pack,options){
    options=options||{};var pool=pack.pool||{},rarities=options.rarities||C.data.rarities;
    var tiers=(options.cards||C.data.cards).filter(function(card){var rarity=rarities.find(function(r){return r.id===card.rarity;});return card.pullable!==false&&rarity&&rarity.pullable&&rarity.chance>0&&(pool.minTier==null||rarity.tier>=pool.minTier)&&(pool.maxTier==null||rarity.tier<=pool.maxTier)&&(!pool.cardIds||pool.cardIds.includes(card.id))&&(!pool.brands||pool.brands.includes(card.brand))&&(!pool.generations||pool.generations.includes(card.generation));}).map(function(card){return rarities.find(function(r){return r.id===card.rarity;}).tier;});
    if(!tiers.length)throw new Error('No choice cards available');
    // A tiny catalog may have no low-tier entry. Keep downgrade within the
    // existing pool and start its probability table at its first occupied tier.
    return Object.assign({},pack,{pool:Object.assign({},pool,{minTier:Math.max(pool.minTier||0,Math.min.apply(null,tiers))})});
  }
  function draw(pack,options){
    options=options||{};
    pack=effectivePack(pack,options);
    var random=options.random||Math.random, table=C.pull.probabilities(pack,options),
      available=table.cards.filter(function(r){return r.chance>0;}), selected=[], count=Math.min(pack.cardsShown,available.length);
    if(!count)throw new Error('No choice cards available');
    function next(minTier,forced,forcedTier){
      var eligible=available.filter(function(r){return !selected.some(function(s){return s.cardId===r.card.id;})&&(minTier==null||C.rarity(r.card.rarity).tier>=minTier)&&(!forcedTier||r.card.rarity===forcedTier);});
      if(!eligible.length)throw new Error('Choice guarantee cannot be satisfied');
      var row;
      if(forced){row=eligible.find(function(r){return r.card.id===forced;});if(!row)throw new Error('Forced option is duplicate or outside the pool');}
      else {var sum=eligible.reduce(function(n,r){return n+r.chance;},0),needle=random()*sum;row=eligible[eligible.length-1];for(var i=0;i<eligible.length;i++){needle-=eligible[i].chance;if(needle<0){row=eligible[i];break;}}}
      // Production sampler rolls each option's finish; forcing the selected ID
      // avoids rejection loops and retains normalized pool/card probabilities.
      return C.pull.createSampler(pack,Object.assign({},options,{random:random,forcedCard:row.card.id,forcedTier:null})).draw();
    }
    for(var i=0;i<count;i++)selected.push(next(null,options.forcedCards&&options.forcedCards[i]||i===0&&options.forcedCard,i===0&&options.forcedTier));
    (pack.guarantees||[]).forEach(function(g){
      var eligible=available.filter(function(r){return C.rarity(r.card.rarity).tier>=g.minTier;});
      var required=Math.min(g.count,count,eligible.length);
      if(g.count>0&&!eligible.length)throw new Error('Choice guarantee cannot be satisfied');
      for(var j=selected.length-1;j>=0&&selected.filter(function(s){return tier(s)>=g.minTier;}).length<required;j--){
        if(tier(selected[j])>=g.minTier)continue;
        if(options.forcedCards&&options.forcedCards[j])throw new Error('Forced options violate the guarantee');
        selected.splice(j,1);selected.splice(j,0,next(g.minTier));
      }
    });
    return selected;
  }
  function reserve(pack,options,now){return {packId:pack.id,cards:[],options:draw(pack,options),choice:null,guarantees:JSON.parse(JSON.stringify(pack.guarantees||[])),committedAt:now,keptCount:0};}
  function validatePending(pending){
    var pack=C.pack(pending.packId), rows=pending.options;
    if(!isChoicePack(pack)||!Array.isArray(rows)||!rows.length||rows.length>pack.cardsShown)throw new Error('Invalid choice reservation');
    var validIds=new Set(C.pull.probabilities(effectivePack(pack)).cards.filter(function(r){return r.chance>0;}).map(function(r){return r.card.id;}));
    if(rows.length!==Math.min(pack.cardsShown,validIds.size))throw new Error('Incomplete choice reservation');
    var ids=new Set();rows.forEach(function(r){
      if(!r||!validIds.has(r.cardId)||ids.has(r.cardId)||r.packId!==pack.id||r.instanceId!==undefined||r.serial!==undefined||r.variantId!==null&&!C.variant(r.variantId))throw new Error('Invalid unminted choice option');
      ids.add(r.cardId);
    });
    var guarantees=pending.guarantees===undefined?pack.guarantees:pending.guarantees;
    if(!Array.isArray(guarantees))throw new Error('Invalid choice guarantees');
    guarantees.forEach(function(g){if(!g||!Number.isInteger(g.minTier)||g.minTier<0||g.minTier>11||!Number.isInteger(g.count)||g.count<0||g.count>pack.cardsShown)throw new Error('Invalid choice guarantee');var possible=Array.from(validIds).filter(function(id){return C.rarity(C.card(id).rarity).tier>=g.minTier;}).length;if(rows.filter(function(r){return tier(r)>=g.minTier;}).length<Math.min(g.count,rows.length,possible))throw new Error('Invalid choice guarantee');});
    if(pending.choice===null){if(pending.cards.length)throw new Error('Unchosen options cannot own instances');}
    else {
      if(!Number.isInteger(pending.choice)||pending.choice<0||pending.choice>=rows.length||pending.cards.length!==pack.cardsKept)throw new Error('Invalid saved choice');
      var chosen=rows[pending.choice],instance=pending.cards[0];
      if(instance.cardId!==chosen.cardId||instance.variantId!==chosen.variantId||!instance.pickerChoice||instance.pickerChoice.index!==pending.choice||instance.pickerChoice.count!==rows.length)throw new Error('Saved choice mismatch');
    }
    return true;
  }
  function chooseInto(candidate,index){
    var p=candidate.pendingReveal;if(!p||!p.options||p.choice!==null)throw new Error('No unresolved choice');
    validatePending(p);
    if(!Number.isInteger(index)||index<0||index>=p.options.length)throw new Error('Unknown choice');
    var pack=C.pack(p.packId),option=p.options[index];
    candidate.serialCounter++;
    if(!Number.isSafeInteger(candidate.serialCounter))throw new Error('Serial counter exceeds its safe range');
    var instance={instanceId:C.randomId('card'),packId:pack.id,cardSkinId:pack.cardSkinId||null,cardId:option.cardId,variantId:option.variantId,
      serial:C.serial.format(candidate.playerCode,candidate.serialCounter),pulledAt:p.committedAt,seen:false,pickerChoice:{index:index,count:p.options.length}};
    p.choice=index;p.cards=[instance];
    var refund=p.options.reduce(function(n,r,i){return n+(i===index?0:Math.round(Math.max(0,pack.unpickedRefund||0)*(tier(r)+1)));},0);
    candidate.currency+=refund;if(!Number.isSafeInteger(candidate.currency))throw new Error('Invalid refund balance');
    return {instance:instance,refund:refund,options:p.options.map(function(r){return Object.assign({},r);}),chosenIndex:index,chosenTier:tier(option),
      lowestTierChosen:tier(option)===Math.min.apply(null,p.options.map(tier)),bestTierChosen:tier(option)===Math.max.apply(null,p.options.map(tier))};
  }
  C.picker={isChoicePack:isChoicePack,draw:draw,reserve:reserve,chooseInto:chooseInto,validatePending:validatePending,
    choose:function(index){var candidate=JSON.parse(JSON.stringify(C.state.current)),event=chooseInto(candidate,index);C.state.validate(candidate,true);if(!C.state.commit(candidate))return null;C.events.emit('picker:chosen',event);if(event.refund)C.events.emit('currency:changed',{value:candidate.currency,amount:event.refund});return event;}};
  C.events.on('opening:resolve',function(request){if(isChoicePack(request.pack))request.buildPending=function(candidate,now){return reserve(request.pack,request.options,now);};});
})(window.Cardable);
