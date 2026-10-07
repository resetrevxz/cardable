(function(C,root){'use strict';
  C.dev.checkQol=function(){var at=root.performance.now(),checks=[];function require(ok,label){if(!ok)throw new Error('QoL: '+label);checks.push(label);}
    [[1100,680,1,.62],[1280,720,1,2/3],[1366,768,1,768/1080],[1920,1080,1,1],[2560,1440,1,4/3],[3840,2160,1,1.6],[3440,1440,1,4/3],[800,1200,1,.62],[1920,1080,1.25,1.25],[1920,1080,1.5,1.5]].forEach(function(v){require(Math.abs(C.viewport.scale(v[0],v[1],v[2])-v[3])<.00001,'scale '+v.slice(0,3).join('×'));});
    var bindings=Array.from(C.keybindings.entries.values()).map(function(v){return v.binding.toLowerCase();});require(new Set(bindings).size===bindings.length,'unique registered keybindings');
    require(C.qol.fuzzyScore('inv','Inventory')>C.qol.fuzzyScore('inv','Inspect view'),'palette ranks inv');require(C.qol.fuzzyScore('set','Settings')>C.qol.fuzzyScore('set','Reset settings'),'palette ranks set');require(C.qol.fuzzyScore('xyz','Settings')===0,'palette excludes mismatch');
    var away=C.qol.awaySummary(1000,21000,1,1000,10000,4);require(away.elapsedMs===20000&&away.ready===3,'away timestamp catch-up');require(C.qol.awaySummary(1000,51000,3,1000,10000,4).ready===4,'away cap');require(C.qol.awaySummary(21000,1000,2,null,10000,4).elapsedMs===0,'away backwards clock');
    require(C.commands.entries.has('help')&&C.playerHelp.some(function(section){return section.id==='saves';}),'bundled help and palette route');
    var recovery=C.state.recovery,current=C.state.current,writes=0,off=C.events.on('save:written',function(){writes++;});
    try { C.state.recovery={pending:true,raw:'unreadable-original'};require(!C.state.commit(C.state.fresh()),'pending recovery blocks opening commit');C.state.save();require(writes===0&&C.state.current===current,'pending recovery pauses autosave without adopting fresh progress'); }
    finally {off();C.state.recovery=recovery;}
    var values=new Map(),key=C.config.storage.key+'.corrupt';values.set(key,'older-original');var store={getItem:function(k){return values.get(k)||null;},setItem:function(k,v){values.set(k,v);}};C.state.preserveOriginal(store,'new-original');require(values.get(key)==='older-original'&&Array.from(values.values()).includes('new-original'),'recovery retains both corrupt originals');
    var before=C.state.fresh(),adopted=before,commits=0;values.set(C.config.storage.key+'.backup','known-previous');
    var tools=C.saveTools.create({current:function(){return adopted;},now:function(){return 1000;},storage:function(){return store;},recovering:function(){return true;},commit:function(candidate){commits++;adopted=candidate;return true;}});var imported=C.state.fresh();tools.importSave(imported);require(commits===1&&adopted.playerCode===imported.playerCode&&values.get(C.config.storage.key+'.backup')==='known-previous','confirmed recovery import preserves previous backup');
    var achievementClock=Date.UTC(2026,9,5),rewards=[],a={currency:0,achievements:{counters:{packsOpened:100},unlocked:{},seen:[]}},writes=0;
    var board=C.achievementBoard.create({current:function(){return a;},now:function(){return achievementClock;},reward:function(r,s){s.currency+=r.credits;},persist:function(){writes++;},emit:function(name,event){if(name==='achievement:unlocked')rewards.push(event);}});
    board.init();require(board.list().filter(function(d){return d.kind==='weekly';}).length===3&&board.list().filter(function(d){return d.kind==='recurring';}).length===20,'three weekly and twenty recurring achievements');
    require(C.data.achievements.every(function(d){return d.tiers.length===1;}),'one-time achievements have no milestones');
    var weekly=board.list().find(function(d){return d.kind==='weekly'&&d.slot==='pack';});
    a.achievements.counters.packsOpened+=weekly.objectives[0].goal;board.refresh();board.drain();var beforeClaim=a.currency;
    require(board.progress(weekly.id).ready&&!board.progress(weekly.id).claimed,'weekly completion waits for a claim');
    board.togglePin(weekly.id);achievementClock+=604800000;board.refresh();board.drain();
    require(board.list().some(function(d){return d.id===weekly.id&&d.archived;})&&board.isPinned(board.list().find(function(d){return d.slot==='pack'&&!d.archived;}).id),'reset preserves unclaimed rewards and weekly pin');
    require(board.claim(weekly.id)&&a.currency===beforeClaim+weekly.credits&&!board.claim(weekly.id),'weekly claim pays exactly once after reset');
    a.achievements.counters.packsOpened+=17;board.refresh();board.drain();var recurring=board.progress('recurring-pack-routine'),paid=a.currency;board.refresh();board.drain();
    require(recurring.cycles>=3&&recurring.rank>=2&&recurring.objectives[0].value===a.achievements.counters.packsOpened%5&&a.currency===paid,'recurring cycles carry overflow and do not repay');
    require(rewards.every(function(e){return Object.keys(e).sort().join(',')==='at,id,retro,tier';})&&writes>0,'achievement unlocks keep the four-field bus contract');
    C.achievementBoard.validate(JSON.parse(JSON.stringify(a.achievements.board)));
    var legacy=C.state.fresh();legacy.achievements=C.achievements.defaults();legacy.achievements.unlocked['check-earned']={tier:3,at:{1:null,2:null,3:null},retro:true};var legacyBalance=legacy.currency;
    var engine=C.achievements.create({current:function(){return legacy;},now:function(){return achievementClock;},board:true,reward:function(r,s){s.currency+=r.credits||0;},persist:function(){},emit:function(){}});
    engine.register({id:'check-earned',tiers:[{goal:1,reward:{credits:25}}],track:{counter:'packsOpened'}});engine.init();
    require(engine.progress('check-earned').tier===1&&legacy.achievements.unlocked['check-earned'].tier===3&&legacy.currency===legacyBalance,'legacy milestones become one-time without paying or deleting old receipts');
    var kept={instanceId:'check-keep-receipt',cardId:'check-card'};legacy.inventory.push(kept);engine.handle('card:kept',kept);legacy.inventory=[];engine.init();engine.handle('card:kept',kept);
    require(legacy.achievements.counters.cardsKept===1,'kept receipt survives deletion and reload');
    require(root.performance.now()-at<1000,'under one second');return {passed:true,checks:checks};
  };
})(window.Cardable,window);
