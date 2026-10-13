(function (C) {
  'use strict';
  var colors = [{id:null,label:'None',mark:'–'}, {id:'blue',label:'Blue',mark:'1',token:'--cb-action-tint'}, {id:'mint',label:'Mint',mark:'2',token:'--success'}, {id:'amber',label:'Amber',mark:'3',token:'--warning'}, {id:'rose',label:'Rose',mark:'4',token:'--danger'}, {id:'green',label:'Green',mark:'5',token:'--cb-positive'}, {id:'peach',label:'Peach',mark:'6',token:'--cb-warning'}];
  var tabSorts = [['manual','Manual'],['name','Name A–Z'],['count','Card count'],['completion','Completion %'],['color','Color'],['created','Recently created']], receipts = new Map();
  function ids(value) { return Array.isArray(value) ? Array.from(new Set(value.map(function (id) { return C.stacks.canonical(id); }).filter(Boolean))) : []; }
  function definitions(value) { return Array.isArray(value) ? Array.from(new Set(value.filter(function(id){return typeof id==='string'&&id.length>0;}))) : []; }
  function find(ui,id) { return ui.collections.find(function(c){return c.id===id;}); }
  function color(id) { return colors.find(function(c){return c.id===id;})||colors[0]; }
  function defaults() { return { viewMode: 'shelf', sortMode: 'catalog', tabSortMode:'manual', groupMode: 'none', showUnowned: true, activeCollectionId: 'all', lastSelectedStackKey: null, pendingFocusStackKey: null, favorites: [], collections: [], customOrders: { all: [], favorites: [] } }; }
  function normalize(value) {
    var result = Object.assign(defaults(), value && typeof value === 'object' && !Array.isArray(value) ? value : {});
    ['viewMode', 'sortMode', 'groupMode'].forEach(function (key) {
      var options = key === 'viewMode' ? ['shelf', 'grid'] : key === 'groupMode' ? ['none', 'rarity', 'generation', 'brand', 'ownership', 'new', 'variant'] : ['catalog', 'custom', 'missing-first', 'recent', 'oldest', 'name-asc', 'name-desc', 'rarity-asc', 'rarity-desc', 'generation', 'vram-asc', 'vram-desc', 'quantity', 'serial'];
      if (options.indexOf(result[key]) < 0) result[key] = defaults()[key];
    });
    result.showUnowned = result.showUnowned !== false; result.favorites = ids(result.favorites);
    if(!tabSorts.some(function(pair){return pair[0]===result.tabSortMode;}))result.tabSortMode='manual';
    var used = new Set(['all', 'favorites']);
    result.collections = (Array.isArray(result.collections) ? result.collections : []).filter(function (item) {
      if (!item || typeof item.id !== 'string' || !item.id || used.has(item.id)) return false; used.add(item.id); return true;
    }).map(function (item) {
      var c={id:item.id,name:String(item.name||'Collection').trim().slice(0,60)||'Collection',stackKeys:ids(item.stackKeys),kind:item.kind==='wishlist'?'wishlist':'collection',color:color(item.color).id,pinned:item.pinned===true,description:String(item.description||'').trim().slice(0,120),createdAt:typeof item.createdAt==='number'&&Number.isFinite(item.createdAt)&&item.createdAt>=0?item.createdAt:null};
      if(c.kind==='wishlist'){c.cardIds=definitions(item.cardIds);c.priorities=Object.create(null);c.cardIds.forEach(function(id){var p=item.priorities&&item.priorities[id];c.priorities[id]=['low','normal','high'].indexOf(p)>=0?p:'normal';});}
      return c;
    });
    var orders = result.customOrders, clean = Object.create(null);
    used.forEach(function (id) { clean[id] = ids(orders && orders[id]); }); result.customOrders = clean;
    if (!used.has(result.activeCollectionId)) result.activeCollectionId = 'all';
    ['lastSelectedStackKey', 'pendingFocusStackKey'].forEach(function (key) { result[key] = C.stacks.canonical(result[key]); });
    if (result.sortMode === 'custom'||result.sortMode==='missing-first') result.groupMode = 'none';
    return result;
  }
  function mutate(update, durable) {
    if(C.bootFailure||C.state.recovery&&C.state.recovery.pending)return false;
    if(durable&&(!C.state.persistenceAvailable||!C.state.lastWriteSucceeded))return false;
    var previousCollections=JSON.stringify(C.state.current.inventoryUi.collections);
    // UI edits own only inventoryUi. Preserve card-instance identity and avoid
    // cloning the complete collection/journal/Studio state on each selection.
    var candidate = Object.assign({}, C.state.current);
    candidate.inventoryUi = JSON.parse(JSON.stringify(candidate.inventoryUi));
    update(candidate.inventoryUi, candidate); candidate.inventoryUi = normalize(candidate.inventoryUi);
    if(durable){if(!C.state.commit(candidate))return false;}
    else {C.state.current = candidate; C.state.save();}
    var notify=durable?C.events.notify:C.events.emit;
    notify('inventory:preferencesChanged', candidate.inventoryUi);
    if(previousCollections!==JSON.stringify(candidate.inventoryUi.collections))notify('inventory:collectionsChanged',candidate.inventoryUi.collections);
    return candidate.inventoryUi;
  }
  // All collection membership, metrics and tab ordering are projections, never UI rules.
  var descriptionBase=null,descriptionKey='',descriptionValue=null;
  function describe(base,ui) {
    // Search/filter changes reuse membership; content keys also catch in-place
    // developer edits without retaining older catalogs or save projections.
    var key=JSON.stringify([ui.favorites,ui.collections,ui.tabSortMode,ui.showUnowned]);
    if(descriptionBase===base&&descriptionKey===key&&descriptionValue){
      return Object.assign({},descriptionValue,{active:descriptionValue.tabs.find(function(c){return c.id===ui.activeCollectionId;})||descriptionValue.tabs[0],entries:descriptionValue.sources.get(ui.activeCollectionId)||descriptionValue.sources.get('all')});
    }
    var byStack=new Map(),byCard=new Map(),favorites=new Set(ui.favorites),sources=new Map();
    base.entries.forEach(function(e){byStack.set(e.stackKey,e);if(!byCard.has(e.card.id))byCard.set(e.card.id,[]);byCard.get(e.card.id).push(e);});
    function missing(key) {
      var parts=JSON.parse(key),examples=byCard.get(parts[0]),card=examples?examples[0].card:C.card(parts[0]);if(!card)return null;
      var generation=C.data.generations.find(function(g){return g.id===card.generation;}),rarity=C.rarity(card.rarity);if(!generation||!rarity)return null;
      return {card:card,stackKey:key,sourceStackKey:key,variantId:parts[1],variant:C.variant(parts[1]),cardSkinId:parts[2]||null,generation:generation,rarity:rarity,instances:[],owned:false,isNew:false,catalogIndex:examples?examples[0].catalogIndex:base.entries.length+C.data.cards.indexOf(card)};
    }
    var all=base.entries.map(function(e){return Object.assign({},e,{sourceStackKey:e.stackKey,isFavorite:favorites.has(e.stackKey)});}),fav=all.filter(function(e){return e.owned&&e.isFavorite;});sources.set('all',all);sources.set('favorites',fav);
    function descriptor(c,entries,index) {var owned=entries.filter(function(e){return e.owned;}).length,total=entries.length;return Object.assign({},c,{entries:undefined,count:total,owned:owned,total:total,completion:total?owned/total:0,manualIndex:index,colorInfo:color(c.color),canClear:!!(c.kind==='wishlist'?c.cardIds.length:c.stackKeys&&c.stackKeys.length)});}
    var custom=ui.collections.map(function(c,index){
      var entries=c.kind==='wishlist'?c.cardIds.map(function(id){
        var choices=byCard.get(id)||[],normal=choices.find(function(e){return e.owned&&e.variantId===null&&!e.cardSkinId;}),chosen=normal||choices.find(function(e){return e.owned;})||choices[0]||missing(C.stacks.key(id,null));if(!chosen)return null;
        return Object.assign({},chosen,{stackKey:C.stacks.key(id,null),sourceStackKey:chosen.stackKey,wishlist:true,priority:c.priorities[id]||'normal',nameVisible:chosen.owned||chosen.rarity.finish!=='secret',isFavorite:favorites.has(chosen.stackKey)});
      }):c.stackKeys.map(function(key){var e=byStack.get(key)||missing(key);return e&&Object.assign({},e,{sourceStackKey:key,isFavorite:favorites.has(key)});});
      entries=entries.filter(Boolean);sources.set(c.id,entries);return descriptor(c,entries,index);
    });
    [false,true].forEach(function(pinned){var group=custom.filter(function(c){return !!c.pinned===pinned;});group.forEach(function(c,at){c.canMoveEarlier=ui.tabSortMode==='manual'&&at>0;c.canMoveLater=ui.tabSortMode==='manual'&&at<group.length-1;});});
    var ordered=custom.slice().sort(function(a,b){
      if(a.pinned!==b.pinned)return a.pinned?-1:1;if(a.pinned)return a.manualIndex-b.manualIndex;
      var mode=ui.tabSortMode,compare=mode==='name'?a.name.localeCompare(b.name,undefined,{sensitivity:'base'}):mode==='count'?b.count-a.count:mode==='completion'?b.completion-a.completion:mode==='color'?colors.indexOf(a.colorInfo)-colors.indexOf(b.colorInfo):mode==='created'?(b.createdAt==null?-Infinity:b.createdAt)-(a.createdAt==null?-Infinity:a.createdAt):0;
      return compare||a.manualIndex-b.manualIndex;
    });
    var allTab={id:'all',name:'All cards',count:all.filter(function(e){return e.owned||ui.showUnowned;}).length,owned:base.owned,total:base.total,completion:base.total?base.owned/base.total:0,colorInfo:colors[0],description:''},favTab=descriptor({id:'favorites',name:'Favorites',description:'',color:null},fav,-1);
    var tabs=[allTab,favTab].concat(ordered),active=tabs.find(function(c){return c.id===ui.activeCollectionId;})||allTab;
    descriptionBase=base;descriptionKey=key;descriptionValue={tabs:tabs,active:active,entries:sources.get(active.id)||[],sources:sources};
    return descriptionValue;
  }
  function identity() {var s=C.state.current;return C.config.storage.key+':'+s.playerCode+':'+s.createdAt;}
  C.inventoryModel = {
    defaults: defaults, normalize: normalize,describe:describe,colors:colors,tabSorts:tabSorts,color:color,
    get current() { return C.state.current.inventoryUi; },
    update: function (patch) { return mutate(function (ui) { Object.assign(ui, patch); }); },
    favorite: function (id) { id = C.stacks.canonical(id); if (!C.state.current.inventory.some(function (item) { return C.stacks.of(item) === C.stacks.canonical(id); })) return; return mutate(function (ui) { var at = ui.favorites.indexOf(id); if (at < 0) ui.favorites.push(id); else ui.favorites.splice(at, 1); }); },
    create: function (name,options) { options=options||{};var id = C.randomId('collection');var result=mutate(function (ui) { var c={id:id,name:String(name).trim().slice(0,60)||'Collection',stackKeys:[],kind:options.kind==='wishlist'?'wishlist':'collection',createdAt:C.clock.now()};if(c.kind==='wishlist'){c.cardIds=options.cardId&&C.card(options.cardId)?[options.cardId]:[];c.priorities={};}ui.collections.push(c); ui.customOrders[id] = []; if(options.activate!==false)ui.activeCollectionId = id; },options.durable===true); return result?id:false; },
    settings:function(id,patch){return mutate(function(ui){var c=find(ui,id);if(!c)return;['name','color','pinned','description'].forEach(function(key){if(Object.prototype.hasOwnProperty.call(patch,key)&&(key!=='name'||String(patch.name).trim()))c[key]=patch[key];});});},
    duplicate:function(id){var source=find(this.current,id);if(!source)return false;var names=new Set(this.current.collections.map(function(c){return c.name.toLocaleLowerCase();})),n=1,name;do{var suffix=' copy'+(n>1?' '+n:'');name=source.name.slice(0,60-suffix.length)+suffix;n++;}while(names.has(name.toLocaleLowerCase()));var newId=C.randomId('collection');return mutate(function(ui){var c=JSON.parse(JSON.stringify(find(ui,id)));c.id=newId;c.name=name;c.createdAt=C.clock.now();ui.collections.splice(ui.collections.findIndex(function(c){return c.id===id;})+1,0,c);ui.customOrders[newId]=(ui.customOrders[id]||[]).slice();ui.activeCollectionId=newId;})?newId:false;},
    clear:function(id){var c=find(this.current,id);if(!c)return false;var receipt={id:id,identity:identity(),until:performance.now()+4000,collection:JSON.parse(JSON.stringify(c)),order:(this.current.customOrders[id]||[]).slice()};if(!mutate(function(ui){var item=find(ui,id);item.stackKeys=[];if(item.kind==='wishlist'){item.cardIds=[];item.priorities={};}ui.customOrders[id]=[];}))return false;receipts.set(id,receipt);return receipt;},
    restoreClear:function(receipt){if(!receipt||receipts.get(receipt.id)!==receipt||receipt.until<performance.now()||receipt.identity!==identity()||!find(this.current,receipt.id))return false;var result=mutate(function(ui){var c=find(ui,receipt.id),old=receipt.collection;c.stackKeys=ids(old.stackKeys.concat(c.stackKeys));if(c.kind==='wishlist'){c.cardIds=definitions(old.cardIds.concat(c.cardIds));c.priorities=Object.assign({},old.priorities,c.priorities);}ui.customOrders[c.id]=ids(receipt.order.concat(ui.customOrders[c.id]||[]));});if(result)receipts.delete(receipt.id);return !!result;},
    wishlistMembership:function(id,cardId,included,options){var c=find(this.current,id);if(!c||c.kind!=='wishlist'||included&&!C.card(cardId))return false;return mutate(function(ui){var c=find(ui,id);c.cardIds=c.cardIds.filter(function(key){return key!==cardId;});if(included){c.cardIds.push(cardId);if(!c.priorities[cardId])c.priorities[cardId]='normal';}else delete c.priorities[cardId];},options&&options.durable===true);},
    priority:function(id,cardId,value,options){var c=find(this.current,id);if(!c||c.kind!=='wishlist'||c.cardIds.indexOf(cardId)<0||['low','normal','high'].indexOf(value)<0)return false;return mutate(function(ui){find(ui,id).priorities[cardId]=value;},options&&options.durable===true);},
    rename: function (id, name) { mutate(function (ui) { var item = ui.collections.find(function (c) { return c.id === id; }); if (item && String(name).trim()) item.name = String(name).trim().slice(0, 60); }); },
    remove: function (id) { mutate(function (ui) { ui.collections = ui.collections.filter(function (c) { return c.id !== id; }); delete ui.customOrders[id]; if (ui.activeCollectionId === id) ui.activeCollectionId = 'all'; }); },
    moveCollection: function (id, delta) { if(this.current.tabSortMode!=='manual')return false;return mutate(function (ui) {var c=find(ui,id);if(!c)return;var group=ui.collections.filter(function(item){return item.pinned===c.pinned;}),at=group.indexOf(c),next=group[at+delta];if(!next)return;var from=ui.collections.indexOf(c),to=ui.collections.indexOf(next);ui.collections[from]=next;ui.collections[to]=c;}); },
    membership: function (collectionId, cardId, included) { cardId = C.stacks.canonical(cardId); if (!cardId||included&&!C.state.current.inventory.some(function (i) { return C.stacks.of(i) === cardId; })) return;return mutate(function (ui) { var c = find(ui,collectionId); if (!c||c.kind==='wishlist') return; c.stackKeys = c.stackKeys.filter(function (id) { return id !== cardId; }); if (included) c.stackKeys.push(cardId); }); },
    reorder: function (visibleIds, from, to) { if (from === to || !visibleIds[from]) return; mutate(function (ui) {
      var key = ui.activeCollectionId, stored = ui.customOrders[key] || [], merged = stored.concat(visibleIds.filter(function (id) { return stored.indexOf(id) < 0; }));
      var selected = visibleIds[from], destination = visibleIds[to]; merged = merged.filter(function (id) { return id !== selected; });
      var at = merged.indexOf(destination); merged.splice(at < 0 ? merged.length : at + (to > from ? 1 : 0), 0, selected);
      ui.customOrders[key] = merged; ui.sortMode = 'custom'; ui.groupMode = 'none';
    }); }
  };
  ['save:willReplace','save:willReset','save:replaced','save:reset'].forEach(function(event){C.events.on(event,function(){receipts.clear();});});
})(window.Cardable);
