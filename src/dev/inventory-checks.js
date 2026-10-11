(function(C){
  'use strict';
  C.dev.checkCollections=function(){
    var checks=[];function require(ok,label){if(!ok)throw new Error('Collections: '+label);checks.push(label);}
    var cards=C.data.cards.filter(function(c){return !c.retired&&C.rarity(c.rarity).finish!=='secret';}).slice(0,3),a=cards[0],b=cards[1],variant=C.data.variants[0].id,key=C.stacks.key(a.id,variant),missing=C.stacks.key(b.id,null);
    var legacy={collections:[{id:'z',name:'Zeta',stackKeys:[key,missing,'stale']},{id:'a',name:'Alpha',stackKeys:[]}],customOrders:{z:[missing,key,'stale']},activeCollectionId:'z'},ui=C.inventoryModel.normalize(legacy);
    require(JSON.stringify(ui.collections.map(function(c){return [c.id,c.name,c.stackKeys];}))===JSON.stringify(legacy.collections.map(function(c){return [c.id,c.name,c.stackKeys.map(C.stacks.canonical.bind(C.stacks))];}))&&JSON.stringify(ui.customOrders.z)===JSON.stringify(legacy.customOrders.z.map(C.stacks.canonical.bind(C.stacks))),'legacy membership and orders preserved');
    require(ui.tabSortMode==='manual'&&ui.collections.every(function(c){return c.kind==='collection'&&!c.pinned&&c.color===null&&c.description===''&&c.createdAt===null;}),'optional defaults');
    var instances=[{instanceId:'collections-check',cardId:a.id,variantId:variant,cardSkinId:null,pulledAt:1,seen:true}],base=C.collection.project(cards,instances,'all'),before=JSON.stringify(ui.collections);
    ui.tabSortMode='name';var desc=C.inventoryModel.describe(base,ui);require(desc.tabs[2].id==='a'&&JSON.stringify(ui.collections)===before,'tab sort leaves manual order untouched');
    ui.collections[0].pinned=true;require(C.inventoryModel.describe(base,ui).tabs[2].id==='z','pins follow built-ins');
    var result=C.inventoryQuery.run(base,ui,'',{});require(result.total===2&&result.owned===1&&result.entries.some(function(e){return e.stackKey===missing&&!e.owned;}),'missing regular members remain and stale references are ignored');
    ui=C.inventoryModel.normalize({showUnowned:false,activeCollectionId:'w',collections:[{id:'w',name:'Wanted',kind:'wishlist',cardIds:[a.id,a.id,b.id,'stale'],priorities:{[a.id]:'high',[b.id]:'invalid'}}]});
    result=C.inventoryQuery.run(base,ui,'',{});require(ui.collections[0].cardIds.length===3&&result.total===2&&result.owned===1&&result.entries.length===2,'wishlist definitions deduplicate and any finish counts once');
    var owned=result.entries.find(function(e){return e.owned;}),wanted=result.entries.find(function(e){return !e.owned;});require(owned.sourceStackKey===key&&owned.stackKey===C.stacks.key(a.id,null)&&wanted.priority==='normal','stable identity, real action stack and default priority');
    require(C.inventoryQuery.run(base,ui,'name:"'+b.name+'"',{}).shown===1,'missing wishlist names are searchable');
    require(C.inventoryQuery.run(base,ui,'',{ownership:'unowned'}).shown===1,'missing filter');
    ui.sortMode='missing-first';require(!C.inventoryQuery.run(base,ui,'',{}).entries[0].owned,'missing first');
    var updated=C.collection.project(cards,instances.concat([{instanceId:'collections-check-2',cardId:b.id,variantId:null,cardSkinId:null,pulledAt:2,seen:true}]),'all');require(C.inventoryQuery.run(updated,ui,'',{}).owned===2&&ui.collections[0].cardIds.includes(b.id),'ownership does not remove wishlist membership');
    var current=C.state.current,save=C.state.save,emit=C.events.emit;
    try{
      C.state.current=Object.assign({},current,{inventory:instances,inventoryUi:ui});C.state.save=function(){};C.events.emit=function(){};
      C.inventoryModel.settings('w',{description:'A'.repeat(130),color:'blue',pinned:true});var duplicate=C.inventoryModel.duplicate('w'),copy=C.inventoryModel.current.collections.find(function(c){return c.id===duplicate;});
      require(copy.name==='Wanted copy'&&copy.description.length===120&&copy.pinned&&copy.priorities[a.id]==='high'&&copy.cardIds.length===3,'duplicate settings and entries with unique name');
      var receipt=C.inventoryModel.clear('w');C.inventoryModel.wishlistMembership('w',cards[2].id,true);require(C.inventoryModel.restoreClear(receipt)&&C.inventoryModel.current.collections.find(function(c){return c.id==='w';}).cardIds.length===4&&!C.inventoryModel.restoreClear(receipt),'clear undo merges later additions and is once-only');
      C.inventoryModel.update({tabSortMode:'count'});var order=JSON.stringify(C.inventoryModel.current.collections.map(function(c){return c.id;}));C.inventoryModel.moveCollection('w',1);require(JSON.stringify(C.inventoryModel.current.collections.map(function(c){return c.id;}))===order,'manual moves disabled in sorted views');
      receipt=C.inventoryModel.clear('w');receipt.until=0;require(!C.inventoryModel.restoreClear(receipt),'expired undo rejected');
    }finally{C.state.current=current;C.state.save=save;C.events.emit=emit;}
    return {passed:true,checks:checks};
  };
  C.dev.registerCheck('inventory preferences migrate without losing owned instances',function(){var old=C.state.fresh();old.schemaVersion=1;delete old.inventoryUi;var next=C.state.migrate(old);return next.schemaVersion===C.config.storage.schemaVersion&&next.inventory.length===old.inventory.length&&next.inventoryUi.viewMode==='shelf';});
  C.dev.registerCheck('invalid inventory tags are reported',function(){return C.inventoryQuery.parse('vram:nope owned:maybe unknown:yes').errors.length===3;});
  C.dev.registerCheck('VRAM normalization preserves shared memory',function(){return C.inventoryQuery.memory({vram:{amount:1024,unit:'MB'}})===1&&C.inventoryQuery.memory({vram:{amount:null,shared:true}})===null;});
  C.dev.registerCheck('inventory preferences deduplicate collection references',function(){var ui=C.inventoryModel.normalize({favorites:['a','a'],collections:[{id:'test',name:'Test',stackKeys:['a','a']},{id:'test'}]});return ui.favorites.length===1&&ui.collections.length===1&&ui.collections[0].stackKeys.length===1;});
  C.dev.registerCheck('unknown cards cannot disclose their name in search',function(){var card=C.data.cards.find(function(c){return !c.retired;});var e={card:card,owned:false,rarity:C.rarity(card.rarity),generation:C.data.generations.find(function(g){return g.id===card.generation;})};return !C.inventoryQuery.matches(e,{key:'name',value:card.name.toLowerCase()});});
  C.dev.registerCheck('combined inventory facets and rarity sorting use registries',function(){var base=C.collection.project(C.data.cards,[],'all'),ui=C.inventoryModel.defaults();ui.sortMode='rarity-desc';var result=C.inventoryQuery.run(base,ui,'',{});return result.entries.every(function(e,i,a){return !i||a[i-1].rarity.tier>=e.rarity.tier;})&&result.shown===base.total;});
  C.dev.registerCheck('inventory windows stay bounded at the first and last of 1000 cards',function(){return [0,1,2,5,20,60,200,500,1000].every(function(n){return [0,n/2,n-1].every(function(p){var r=C.inventoryShelf.range(p,n);return r.min>=0&&r.max<n&&r.max-r.min+1<=13&&Number.isFinite(r.center);});});});
  C.dev.registerCheck('stale and unowned favorites never enter a collection result',function(){var base=C.collection.project(C.data.cards,[],'all'),ui=C.inventoryModel.defaults();ui.activeCollectionId='favorites';ui.favorites=base.entries.map(function(e){return e.card.id;}).concat(['stale']);var result=C.inventoryQuery.run(base,ui,'',{});return result.shown===0&&result.collectionCounts.favorites===0;});
  C.dev.registerCheck('schema migration preserves pending acquisition focus',function(){var state=C.state.fresh();state.inventoryUi.pendingFocusStackKey=C.stacks.key('test-card',null);return C.state.migrate(state).inventoryUi.pendingFocusStackKey===C.stacks.key('test-card',null);});
  C.dev.registerCheck('reorder Escape is claimed before sheet dismissal',function(){var event={key:'Escape'};return C.inventoryReorder.claimEscape(event,true)&&event.inventoryReorderHandled&&!C.inventoryReorder.claimEscape({key:'Enter'},true);});
})(window.Cardable);
