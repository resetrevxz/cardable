'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const out=path.resolve(__dirname,'../../../outputs/v3-optimization'),evidence={journeys:[],errors:[],network:[]};
const tiers=['very-low','low','medium','high'];
(async()=>{
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
  function save(){fs.writeFileSync(path.join(out,'journeys-qa.json'),JSON.stringify(evidence,null,2));}
  try{
    const inventoryPage=await browser.newPage();await inventoryPage.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    const packs=await inventoryPage.evaluate(()=>Cardable.data.packs.filter(p=>p.enabled).map(p=>p.id));await inventoryPage.close();
    const cases=[];
    for(const tier of tiers)for(const pack of packs)cases.push({tier,pack,cutscenes:'off'});
    for(const rarity of ['legendary','mythical','exotic','ascendant','secret'])cases.push({tier:'high',pack:'standard',rarity,cutscenes:'full'});
    cases.push({tier:'medium',pack:'standard',rarity:'secret',cutscenes:'full',profile:'full'});
    cases.push({tier:'medium',pack:'standard',rarity:'ascendant',cutscenes:'short',skip:true});
    cases.push({tier:'low',pack:'standard',cutscenes:'off',recover:true,discard:true});
    for(const test of cases){
      const page=await browser.newPage({viewport:{width:1024,height:768}});
      page.on('pageerror',e=>evidence.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
      await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
      const opened=await page.evaluate(test=>{
        const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset(test.tier);C.settings.set('idleFade','never');C.settings.set('cutscenes',test.cutscenes);C.settings.set('strobing',test.profile||'safe');
        C.state.current.packs.ready=C.config.packs.maxStored;C.state.save();
        if(test.rarity)C.events.on('opening:resolve',request=>{request.options={forcedTier:test.rarity,forcedVariant:null};});
        window.journey={sections:[],beats:[],phases:[],maxSafety:0};
        C.events.on('opening:introSection',e=>journey.sections.push(e.id));C.events.on('cutscene:beat',e=>journey.beats.push(e.id));C.events.on('opening:context',e=>journey.phases.push(e.phase));
        return C.opening.openNow(test.pack);
      },test);assert(opened,JSON.stringify(test));
      await page.waitForFunction(()=>Cardable.opening.phase==='cutting');
      if(test.recover)await page.reload();else{
        if(test.pack==='titan'){for(let tick=0;tick<3;tick++)await page.keyboard.press('Enter');}
        else await page.evaluate(()=>Cardable.opening.finishCut());
      }
      if(test.pack==='royal')await page.locator('.royal-holder').click({timeout:15000});
      if(test.pack==='picker'){
        await page.waitForFunction(()=>document.querySelector('.picker-screen[data-state=pick]'));
        await page.keyboard.press('1');await page.keyboard.press('Enter');
      }
      if(test.profile==='full')await page.getByRole('button',{name:'Play full',exact:true}).click({timeout:15000});
      if(test.skip){await page.waitForFunction(()=>Cardable.opening.phase==='rarityIntro'&&Cardable.cutscenes.active&&Cardable.cutscenes.active.presentationMs>=2200);await page.keyboard.press('Escape');}
      let pendingIds=[],decisions=0;
      while(true){
        await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden,{},{timeout:100000});
        const reservation=await page.evaluate(()=>({pending:Cardable.state.current.pendingReveal.cards.map(c=>c.instanceId),current:Cardable.opening.view.instance.instanceId}));
        if(test.rarity)assert.equal(await page.evaluate(()=>Cardable.opening.view.card.rarity),test.rarity);
        reservation.pending.forEach(id=>{if(!pendingIds.includes(id))pendingIds.push(id);});
        await page.locator(test.discard?'.opening-delete':'.opening-keep').click();decisions++;
        await page.waitForFunction(()=>Cardable.opening.phase==='idle'||Cardable.opening.phase==='revealed'||Cardable.opening.phase==='rarityIntro',{},{timeout:15000});
        if(await page.evaluate(()=>Cardable.opening.phase==='idle'))break;
      }
      const settled=await page.evaluate(()=>({currency:Cardable.state.current.currency,pending:Cardable.state.current.pendingReveal,inventory:Cardable.state.current.inventory.map(i=>i.instanceId),journey:window.journey||null,safety:Cardable.cutscenes.safety.last,active:!!Cardable.cutscenes.active,intro:Cardable.opening.intro.active,body:document.body.className}));
      assert.equal(settled.pending,null);assert.equal(settled.active,false);assert.equal(settled.intro,false);
      for(const id of pendingIds)assert.equal(settled.inventory.filter(x=>x===id).length,test.discard?0:1);
      if(test.rarity==='secret'&&!test.skip){assert(settled.safety&&settled.safety.frames>30);assert.equal(settled.safety.status,'PASS',JSON.stringify(settled.safety));}
      await page.reload();const reloaded=await page.evaluate(()=>({currency:Cardable.state.current.currency,inventory:Cardable.state.current.inventory.map(i=>i.instanceId),pending:Cardable.state.current.pendingReveal}));
      assert.deepEqual(reloaded.inventory,settled.inventory);assert.equal(reloaded.currency,settled.currency);assert.equal(reloaded.pending,null);
      evidence.journeys.push({...test,decisions,reserved:pendingIds.length,sections:settled.journey&&[...new Set(settled.journey.sections)],safety:settled.safety});save();console.log('PASS '+JSON.stringify(test));await page.close();
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);save();console.log('PASS '+evidence.journeys.length+' complete opening/decision/reload journeys, no application errors or HTTP requests.');
  }finally{save();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
