'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'qa-output','merged-collections');
const baseline=cp.execFileSync('git',['show','64e9dd7:src/core/inventory-model.js'],{cwd:root,encoding:'utf8'});
(async()=>{
  const browser=await chromium.launch({headless:true});fs.mkdirSync(output,{recursive:true});
  const evidence={errors:[],network:[]};
  try{
    const page=await browser.newPage({viewport:{width:1366,height:900}});
    page.on('pageerror',e=>evidence.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
    await page.goto(pathToFileURL(path.join(root,'index.html')).href+'?dev=1');
    await page.waitForFunction(()=>window.Cardable?.dev?.checkCollections&&Cardable.preferences.initialized);
    await page.waitForFunction(()=>!Cardable.setup?.loading);
    evidence.result=await page.evaluate(baseline=>{
      const C=Cardable;C.tutorial.skipButton.click();if(C.friendly?.active)C.friendly.close();C.dev.show(false);
      const checks=C.dev.checkCollections(),clone=Object.assign({},C,{events:{on(){}}});
      new Function('window',baseline)({Cardable:clone});
      const cards=C.data.cards,instances=[];
      cards.filter(c=>!c.retired&&c.active!==false).forEach((c,i)=>[null,...C.data.variants.map(v=>v.id)].forEach((v,j)=>instances.push({instanceId:'merged-'+i+'-'+j,cardId:c.id,variantId:v,serial:'TEST-'+i+'-'+j,pulledAt:i,seen:true})));
      const base=C.collection.project(cards,instances,'all'),keys=base.entries.filter(e=>e.owned).map(e=>e.stackKey);
      const ui=C.inventoryModel.normalize({viewMode:'grid',collections:Array.from({length:24},(_,i)=>({id:'c'+i,name:'Collection '+i,kind:i%2?'wishlist':'collection',pinned:i%3===0,color:'blue',stackKeys:keys.filter((_,j)=>j%8===i%8),cardIds:cards.slice(i,i+60).map(c=>c.id)}))});
      const same=(a,b)=>JSON.stringify({tabs:a.tabs,active:a.active,entries:a.entries})===JSON.stringify({tabs:b.tabs,active:b.active,entries:b.entries});
      let comparisons=0;
      for(const id of ['all','favorites','c0','c1','stale'])for(const sort of ['manual','name','count','completion','color','created']){
        ui.activeCollectionId=id;ui.tabSortMode=sort;
        if(!same(C.inventoryModel.describe(base,ui),clone.inventoryModel.describe(base,ui)))throw new Error('Projection changed: '+id+'/'+sort);
        comparisons++;
      }
      ui.activeCollectionId='c1';ui.collections[1].cardIds.push(cards[100].id);
      if(!same(C.inventoryModel.describe(base,ui),clone.inventoryModel.describe(base,ui)))throw new Error('In-place membership invalidation failed');
      function time(model){const start=performance.now();for(let i=0;i<150;i++)model.describe(base,ui);return performance.now()-start;}
      time(C.inventoryModel);time(clone.inventoryModel);
      const timings=Array.from({length:5},()=>({baselineMs:time(clone.inventoryModel),mergedMs:time(C.inventoryModel)}));
      C.events.emit('inventory:fixture',{cards,instances});C.inventoryModel.update(ui);C.settings.applyPreset('medium');C.inventory.request('expanded');
      return {checks,comparisons,stacks:base.entries.length,timings};
    },baseline);
    await page.waitForTimeout(1500);
    evidence.tabs=await page.evaluate(()=>{
      const C=Cardable,first=document.querySelector('[data-collection-id="c0"]'),label=first.querySelector('.inventory-tab-name');
      document.querySelector('[data-collection-id="c0"]').click();
      document.querySelector('[data-collection-id="c1"]').click();
      const selected=document.querySelectorAll('.inventory-tab-list [aria-selected="true"]');
      return {sameLabel:first.querySelector('.inventory-tab-name')===label,selected:selected.length,id:selected[0]?.dataset.collectionId,tabIndex:selected[0]?.tabIndex};
    });
    assert.deepEqual(evidence.tabs,{sameLabel:true,selected:1,id:'c1',tabIndex:0});
    await page.screenshot({path:path.join(output,'desktop-color.png')});
    await page.evaluate(()=>Cardable.settings.set('rarityColor','mono'));
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
    await page.screenshot({path:path.join(output,'phone-mono.png')});
    assert.equal(evidence.result.checks.passed,true);assert.equal(evidence.errors.length,0);assert.equal(evidence.network.length,0);
    console.log(JSON.stringify(evidence,null,2));
  }finally{fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
