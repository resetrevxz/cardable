(function (C) {
  'use strict';
  function weightedPick(tiers, modifiers, random) {
    var rows=tiers.filter(function(t){return t.pullable&&t.chance>0;}).map(function(t){return {tier:t,weight:t.chance*(modifiers[t.id]==null?1:modifiers[t.id])};}).filter(function(r){return Number.isFinite(r.weight)&&r.weight>0;});
    var total=rows.reduce(function(n,r){return n+r.weight;},0), needle=random()*total;
    if(!total)throw new Error('No pullable rarity weights');
    for(var i=0;i<rows.length;i++){needle-=rows[i].weight;if(needle<0)return rows[i].tier;}return rows[rows.length-1].tier;
  }
  function tierAllowed(pack,tier) {
    var pool=pack.pool||{};
    return (pool.minTier==null||tier.tier>=pool.minTier)&&(pool.maxTier==null||tier.tier<=pool.maxTier);
  }
  function cardAllowed(pack,card,tiers) {
    var pool=pack.pool||{},tier=tiers.find(function(t){return t.id===card.rarity;});
    return cardWeight(pack,card)>0&&card.pullable!==false&&tier&&tier.pullable&&tierAllowed(pack,tier)&&
      (!pool.brands||pool.brands.includes(card.brand))&&(!pool.generations||pool.generations.includes(card.generation))&&(!pool.cardIds||pool.cardIds.includes(card.id));
  }
  function cardWeight(pack,card) {
    var modifiers=pack.eraWeightModifiers||{},weight=modifiers[card.era]==null?1:modifiers[card.era];
    if(card.era==='modern'&&pack.modernWeightConfig)weight=C.config.classicPack[pack.modernWeightConfig];
    return Number.isFinite(weight)&&weight>0?weight:0;
  }
  function chooseCard(cards,pack,random) {
    if(!pack.eraWeightModifiers)return cards[Math.floor(random()*cards.length)];
    var sum=cards.reduce(function(n,c){return n+cardWeight(pack,c);},0),needle=random()*sum;
    for(var i=0;i<cards.length;i++){needle-=cardWeight(pack,cards[i]);if(needle<0)return cards[i];}return cards[cards.length-1];
  }
  function probabilities(pack,options) {
    options=options||{};var tiers=options.rarities||C.data.rarities,cards=options.cards||C.data.cards;
    cards=cards.filter(function(card){return cardAllowed(pack,card,tiers);});
    var ranked=tiers.filter(function(t){return t.pullable&&t.chance>0&&tierAllowed(pack,t);}).slice().sort(function(a,b){return a.tier-b.tier;});
    var luck=Math.max(1,Math.min(50,Number(options.luck)||1)),modifiers=pack.tierWeightModifiers||{};
    var rows=ranked.map(function(t,i){return {tier:t,cards:cards.filter(function(c){return c.rarity===t.id&&c.pullable!==false;}),weight:t.chance*(modifiers[t.id]==null?1:modifiers[t.id])*Math.pow(luck,i/Math.max(1,ranked.length-1)),chance:0};}).filter(function(r){return Number.isFinite(r.weight)&&r.weight>0;});
    var total=rows.reduce(function(n,r){return n+r.weight;},0);if(!total)throw new Error('No pullable rarity weights');
    if(C.config.pull.emptyTierPolicy==='renormalize') {
      total=rows.reduce(function(n,r){return n+(r.cards.length?r.weight:0);},0);if(!total)throw new Error('No cards available');
      rows.forEach(function(r){r.chance=r.cards.length?r.weight/total:0;});
    } else rows.forEach(function(r,i){var target=r;if(!r.cards.length){target=null;for(var j=i-1;j>=0;j--)if(rows[j].cards.length){target=rows[j];break;}}if(!target)throw new Error('No cards available for selected tier or downgrade policy');target.chance+=r.weight/total;});
    var gate=Math.max(0,Math.min(1,C.config.variants.chance*luck*(pack.variantChanceMultiplier==null?1:pack.variantChanceMultiplier))),variants=(C.data.variants||[]).filter(function(v){return !(pack.excludedVariantKinds||[]).includes(v.kind||'surface');}),sum=variants.reduce(function(n,v){return n+Math.max(0,Number(v.weight)||0);},0);
    return {tiers:rows,variants:[{id:null,name:'Normal',chance:sum?1-gate:1}].concat(variants.map(function(v){return {id:v.id,name:v.name,chance:sum?gate*Math.max(0,v.weight)/sum:0};})),cards:rows.reduce(function(list,r){var sum=r.cards.reduce(function(n,c){return n+cardWeight(pack,c);},0);return list.concat(r.cards.map(function(c){return {card:c,chance:r.chance*cardWeight(pack,c)/sum};}));},[]),luck:luck};
  }
  function pick(rows,random){var needle=random(),last=null;for(var i=0;i<rows.length;i++){if(rows[i].chance>0)last=rows[i];needle-=rows[i].chance;if(needle<0)return rows[i];}return last;}
  C.pull={weightedTier:weightedPick,probabilities:probabilities,
    createSampler:function(pack,options){options=options||{};var table=probabilities(pack,options),random=options.random||Math.random;
      return {table:table,draw:function(){var card;
        if(options.forcedCard){card=(options.cards||C.data.cards).find(function(c){return c.id===options.forcedCard;});if(!card)throw new Error('Unknown forced card');if(!cardAllowed(pack,card,options.rarities||C.data.rarities))throw new Error('Forced card is outside this pack pool');}
        else if(options.forcedTier){var tiers=options.rarities||C.data.rarities,tier=tiers.find(function(t){return t.id===options.forcedTier&&t.pullable;});if(!tier||!tierAllowed(pack,tier))throw new Error('Forced tier is outside this pack pool');
          var eligible=(options.cards||C.data.cards).filter(function(c){return c.rarity===tier.id&&cardAllowed(pack,c,tiers);});
          if(!eligible.length&&C.config.pull.emptyTierPolicy==='downgrade')for(var i=tiers.indexOf(tier)-1;i>=0;i--){eligible=(options.cards||C.data.cards).filter(function(c){return c.rarity===tiers[i].id&&cardAllowed(pack,c,tiers);});if(tiers[i].pullable&&eligible.length)break;eligible=[];}
          if(!eligible.length&&C.config.pull.emptyTierPolicy==='renormalize')card=pick(table.cards,random).card;else{if(!eligible.length)throw new Error('No cards available for forced tier');card=chooseCard(eligible,pack,random);}
        }else{var row=pick(table.tiers,random);card=chooseCard(row.cards,pack,random);}
        var variant;if(options.forcedVariant!==undefined)variant=options.forcedVariant;else{var normal=table.variants[0].chance;if(random()>=1-normal)variant=null;else{var available=table.variants.slice(1).filter(function(v){return v.chance>0;}).map(function(v){return {id:v.id,chance:v.chance/(1-normal)};});variant=available.length?pick(available,random).id:null;}}if(variant!==null&&(!C.variant(variant)||!table.variants.some(function(v){return v.id===variant;})))throw new Error('Variant is outside this pack pool');return {packId:pack.id||'standard',cardId:card.id,variantId:variant};
      }};
    },
    pullCard:function(pack,options){options=options||{};var result=C.pull.createSampler(pack,options).draw();return {instanceId:C.randomId('card'),packId:pack.id||'standard',cardSkinId:pack.cardSkinId||null,cardId:result.cardId,variantId:result.variantId,serial:options.allocateSerial?options.allocateSerial():C.serial.next(),pulledAt:options.now==null?C.clock.now():options.now,seen:false};}
  };
})(window.Cardable);
