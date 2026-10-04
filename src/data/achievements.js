(function (C) {
  'use strict';
  function cards() { return C.data.cards.filter(function (c) { return !c.retired && c.active !== false; }); }
  function tiers(goals, rewards) {
    return Array.from(new Set(goals.filter(function (n) { return Number.isSafeInteger(n) && n > 0; }))).sort(function(a,b){return a-b;}).map(function (goal, i) { return { goal: goal, reward: { credits: (rewards || [25,50,100,250,500])[i] || 500 } }; });
  }
  function capped(goals, total) { return goals.map(function (n) { return Math.min(n, Math.max(1,total)); }).concat(Math.max(1,total)); }
  function evidence(test) { return function (s) { return s.inventory.filter(function (i) { var c=C.card(i.cardId); return c && test(c,i); }); }; }
  function counter(id, group, name, description, glyph, goals, key, extra) {
    return Object.assign({ id:id, group:group, name:name, description:description, glyph:glyph, tiers:tiers(goals), track:{counter:key} }, extra || {});
  }
  function event(id, group, name, description, glyph, goals, nameOfEvent, test, extra) {
    return Object.assign({id:id,group:group,name:name,description:description,glyph:glyph,tiers:tiers(goals),track:{event:nameOfEvent,test:test}},extra || {});
  }
  function serial(i) { var text=String(i.serial || '').split('-').pop(); return /^\d+$/.test(text) ? {text:text,n:Number(text),plain:String(Number(text))} : {text:'',plain:'',n:NaN}; }
  function rank(choice) { return typeof choice==='number' ? choice : C.rarity(choice?.rarity || C.card(choice?.cardId)?.rarity)?.tier ?? choice?.tier; }
  function picker(p, best) {
    if (!p || !Array.isArray(p.choices) || p.choices.length!==3) return false;
    var values=p.choices.map(rank), picked=Number.isInteger(p.chosenIndex) ? values[p.chosenIndex] : rank(p.chosen);
    if (!values.every(Number.isFinite) || !Number.isFinite(picked) || Math.min(...values)===Math.max(...values)) return false;
    return picked===(best?Math.max(...values):Math.min(...values));
  }
  var active=cards(), total=active.length, generationCount=new Set(active.map(function(c){return c.generation;})).size;
  var variantCount=C.data.variants.length, classicCount=active.filter(function(c){return c.era==='classic';}).length, packCount=C.data.packs.filter(function(p){return p.enabled;}).length;
  var list=C.data.achievements=[
    counter('pack-opener','packs','Pack Opener','Open packs.','pack',[1,10,50,250,1000],'packsOpened',{tiers:tiers([1,10,50,250,1000],[25,50,100,250,1000])}),
    counter('variety-pack','packs','Variety Pack','Open different pack types.','pack',capped([3,6],packCount),'packVariety'),
    counter('rare-find','packs','Rare Find','Open Rare Packs.','pack',[1,5,25],'rarePacks',{requires:'pack:rare'}),
    counter('legendary-moment','packs','Legendary Moment','Open Legendary Packs.','pack',[1,3],'legendaryPacks',{requires:'pack:legendary'}),
    counter('patient-collector','packs','Patient Collector','Let at least two packs refill to the stock cap.','clock',[1],'patientCollector'),
    counter('collector','collection','Collector','Own different card designs.','collection',[10,25,50,100,total],'uniqueCards',{track:{counter:'uniqueCards',evidence:evidence(function(c){return !c.retired;})}}),
    counter('generation-complete','collection','Generation Complete','Own every active card in a generation.','collection',capped([1,5],generationCount),'generationsComplete',{track:{counter:'generationsComplete',evidence:evidence(function(c){return !c.retired;})}}),
    counter('full-spectrum','collection','Full Spectrum','Own cards across the rarity tiers.','star',[4,8,12],'rarityCount',{track:{counter:'rarityCount',evidence:evidence(function(c){return !c.retired;})}}),
    counter('duplicates','collection','Duplicates','Own multiple copies of one card design.','collection',[3,10,25],'duplicates',{track:{counter:'duplicates',evidence:evidence(function(c){return !c.retired;})}}),
    counter('first-variant','variants','First Variant','Keep a card with a permanent variant.','variant',[1],'variantCopies',{track:{counter:'variantCopies',evidence:evidence(function(c,i){return !!i.variantId || !!i.variantIds?.length;})}}),
    counter('variant-hunter','variants','Variant Hunter','Own different permanent variants.','variant',capped([5,15,30],variantCount),'variantKinds',{track:{counter:'variantKinds',evidence:evidence(function(c,i){return !!i.variantId || !!i.variantIds?.length;})}}),
    counter('slot-machine','variants','Slot Machine','Own a variant in each slot: finish, art FX, frame, stamp and mutation.','variant',[5],'variantSlots',{requires:'variants:slots'}),
    event('combo-breaker','variants','Combo Breaker','Pull different named combinations.','variant',capped([1,5],(C.data.combos || []).length),'card:revealed',function(i){return !!i?.comboId;},{requires:'variants:combos',track:{event:'card:revealed',test:function(i){return !!i?.comboId;},distinct:true,key:function(i){return i.comboId;},backfill:evidence(function(c,i){return !!i.comboId;})}}),
    event('triple-threat','variants','Triple Threat','Pull a card with at least three variants.','variant',[1],'card:revealed',function(i){return !!i && C.achievementMetrics.variants(i).length>=3;},{requires:'variants:multiple',track:{event:'card:revealed',test:function(i){return !!i && C.achievementMetrics.variants(i).length>=3;},backfill:evidence(function(c,i){return C.achievementMetrics.variants(i).length>=3;})}}),
    event('mythic-touch','variants','Mythic Touch','Pull a Mythic-tier variant.','variant',[1],'card:revealed',function(i){return !!i && C.achievementMetrics.variants(i).some(function(id){return /^mythic(al)?$/i.test(C.variant(id)?.class || '');});},{requires:'variants:mythic',track:{event:'card:revealed',test:function(i){return !!i && C.achievementMetrics.variants(i).some(function(id){return /^mythic(al)?$/i.test(C.variant(id)?.class || '');});},backfill:evidence(function(c,i){return C.achievementMetrics.variants(i).some(function(id){return /^mythic(al)?$/i.test(C.variant(id)?.class || '');});})}}),
    counter('time-capsule','era','Time Capsule','Own a card released before 2003.','clock',[1],'timeCapsule',{requires:'catalog:releaseYears',track:{counter:'timeCapsule',evidence:evidence(function(c){return C.achievementMetrics.year(c)!==null && C.achievementMetrics.year(c)<2003;})}}),
    counter('classic-collector','era','Classic Collector','Own different classic-era card designs.','archive',capped([5,20],classicCount),'classicCards',{track:{counter:'classicCards',evidence:evidence(function(c){return c.era==='classic';})}}),
    counter('newcomer','era','Newcomer','Own a card from the newest generation.','collection',[1],'newcomer',{track:{counter:'newcomer',evidence:evidence(function(c){return c.generation===C.data.generations.slice().sort(function(a,b){return b.order-a.order;})[0]?.id;})}}),
    counter('daily-ritual','habits','Daily Ritual','Open packs on different local calendar days.','clock',[3,7,30],'openingDays',{track:{counter:'openingDays',evidence:evidence(function(){return true;})}}),
    counter('night-owl','habits','Night Owl','Open a pack between midnight and 04:00 local time.','clock',[1],'nightOwl',{track:{counter:'nightOwl',evidence:evidence(function(c,i){return new Date(i.pulledAt).getHours()<4;})}}),
    counter('welcome-back','habits','Welcome Back','Return after at least seven days away.','clock',[1],'welcomeBack'),
    counter('streak','habits','Streak','Open packs on five consecutive local calendar days.','clock',[5],'dayStreak',{track:{counter:'dayStreak',evidence:evidence(function(){return true;})}}),
    counter('hot-streak','luck','Hot Streak','Open three Rare-or-higher packs in a row.','star',[3],'hotStreak'),
    counter('cold-snap','luck','Cold Snap','Open ten packs in a row without a Rare-or-higher card.','star',[10],'coldStreak',{tiers:tiers([10],[50])}),
    counter('variant-run','luck','Variant Run','Find variant cards in two of your last ten packs.','variant',[2],'variantRun'),
    event('spender','meta','Spender','Spend credits in the shop.','coin',[100,1000,10000],'currency:changed',function(p){return p?.direction<0 ? p.amount : false;},{requires:'shop'}),
    {id:'saver',group:'meta',name:'Saver',description:'Build your credit balance.',glyph:'coin',requires:'shop',tiers:tiers([1000,10000,100000]),track:{derive:function(s){return s.currency;},events:['currency:changed']}},
    counter('tidy','meta','Tidy','Favorite ten card stacks.','star',[10],'favorites'),
    counter('archivist','meta','Archivist','Export your save.','archive',[1],'exports'),
    counter('settings-tinkerer','meta','Settings Tinkerer','Change five settings.','settings',[5],'settingsChanged'),
    event('cut-above','meta','Cut Above','Finish a straight pack cut.','cut',[1],'cut:complete',function(p){
      var path=p?.path; if (!Array.isArray(path) || path.length<3) return false;
      var a=path[0],b=path[path.length-1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      return length>=.6 && path.every(function(v){return Math.abs(dx*(v.y-a.y)-dy*(v.x-a.x))/length<=.005;});
    },{requires:'cut:complete'}),
    event('shutterbug','studio','Shutterbug','Take photos in the Studio.','camera',[1,10,50],'studio:photo',function(){return 1;},{requires:'studio:photo'}),
    counter('director','studio','Director','Use five different Studio props.','camera',[5],'studioProps',{requires:'studio:photo'}),
    counter('colorist','studio','Colorist','Use three different colored Studio lights.','camera',[3],'lightColors',{requires:'studio:photo'}),
    counter('portfolio','studio','Portfolio','Photograph ten different card designs.','camera',[10],'studioCards',{requires:'studio:photo'}),
    event('pickers-remorse','picker',"Picker’s Remorse",'Choose the lowest rarity of three.','eye',[1],'picker:chosen',function(p){return picker(p,false);},{requires:'picker:chosen'}),
    event('good-eye','picker','Good Eye','Choose the highest rarity of three ten times.','eye',[10],'picker:chosen',function(p){return picker(p,true);},{requires:'picker:chosen'}),
    event('fatal-exception','rarity','Fatal Exception','Watch the Secret cutscene to its end.','secret',[1],'cutscene:finished',function(p){return p?.rarity==='secret' && p.completed===true && !p.skipped && !p.preview;},{hidden:true,requires:'cutscene:finished'}),
    event('skipper','rarity','Skipper','Skip a rarity cutscene.','cut',[1],'cutscene:skipped',function(p){return !!C.rarity(p?.rarity) && !p.preview;},{hidden:true,requires:'cutscene:skipped'})
  ];
  [['amd','AMD'],['nvidia','NVIDIA'],['intel','Intel'],['apple','Apple'],['qualcomm','Qualcomm']].forEach(function(brand){
    list.push(counter('brand-loyalty-'+brand[0],'collection','Brand Loyalty · '+brand[1],'Own every active '+brand[1]+' card.','collection',[1],'brand.'+brand[0],{track:{counter:'brand.'+brand[0],evidence:evidence(function(c){return c.brand===brand[0] && !c.retired;})}}));
  });
  [['rare','Rare'],['super-rare','Super Rare'],['legendary','Legendary'],['mythical','Mythical'],['exotic','Exotic'],['ascendant','Ascendant'],['secret','Secret']].forEach(function(rarity){
    list.push(event(rarity[0]==='secret'?'secret-occurred':'first-'+rarity[0],'rarity',rarity[0]==='secret'?'A Secret Has Occurred':'First '+rarity[1],'Pull a '+rarity[1]+' card.',rarity[0]==='secret'?'secret':'star',[1],'card:revealed',function(i){return C.card(i?.cardId)?.rarity===rarity[0];},{hidden:rarity[0]==='secret',track:{event:'card:revealed',test:function(i){return C.card(i?.cardId)?.rarity===rarity[0];},backfill:evidence(function(c){return c.rarity===rarity[0];})}}));
  });
  [['first-serial','First Serial','Keep a serial ending in 000001.',function(i){return serial(i).n===1;}],
    ['low-serial','Low Serial','Keep a serial counter of 100 or below.',function(i){var n=serial(i).n;return n>0&&n<=100;}],
    ['round-number','Round Number','Keep a serial ending in 000.',function(i){return serial(i).n>0&&serial(i).text.endsWith('000');}],
    ['palindrome','Palindrome','Keep a palindromic serial counter.',function(i){var s=serial(i).plain;return s.length>1&&s===s.split('').reverse().join('');}],
    ['lucky-seven','Lucky Seven','Keep serial counter 777.',function(i){return serial(i).n===777;}],
    ['triplets','Triplets','Keep a counter with three matching digits in a row.',function(i){return /(\d)\1\1/.test(serial(i).plain);}]
  ].forEach(function(row){list.push(event(row[0],'serials',row[1],row[2],'serial',[1],'card:kept',row[3],{track:{event:'card:kept',test:row[3],backfill:evidence(function(c,i){return row[3](i);})}}));});
  C.data.achievementGroups={packs:'Packs',collection:'Collection',rarity:'Rarity firsts',variants:'Variants',serials:'Serials',era:'Era',habits:'Habits',luck:'Luck',meta:'Economy and meta',studio:'Studio',picker:'Picker'};
  C.data.achievementCatalogRevision=1;
  // Capability predicates inspect definitions, never infer completion/skip from a generic intro-end event.
  C.data.achievementCapabilities={
    'pack:rare':function(){return C.data.packs.some(function(p){return p.id==='rare'&&p.enabled;});},
    'pack:legendary':function(){return C.data.packs.some(function(p){return p.id==='legendary'&&p.enabled;});},
    'catalog:releaseYears':function(){return cards().some(function(c){return Number.isInteger(c.releaseYear)||c.releasedAt;});},
    'variants:slots':function(){return ['finish','art-fx','frame','stamp','mutation'].every(function(slot){return C.data.variants.some(function(v){return (v.slot||'finish')===slot;});});},
    'variants:combos':function(){return !!C.data.combos?.length;},
    'variants:multiple':function(){return !!C.config.flags.multipleVariants;},
    'variants:mythic':function(){return C.data.variants.some(function(v){return /^mythic(al)?$/i.test(v.class||'');});}
  };
})(window.Cardable);
