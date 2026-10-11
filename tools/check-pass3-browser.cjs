'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'qa-output','optimization');
const evidence={groups:[],errors:[],network:[]};
(async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});
  try{
    for(const tier of ['very-low','low','medium','high']){
      const page=await browser.newPage({viewport:{width:1366,height:900}});
      page.on('pageerror',e=>evidence.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      await page.waitForFunction(()=>window.Cardable?.preferences?.initialized);
      await page.waitForFunction(()=>!Cardable.setup?.loading);
      await page.evaluate(tier=>{
        const C=Cardable;C.tutorial.skipButton.click();if(C.friendly?.active)C.friendly.close();C.settings.applyPreset(tier);C.settings.set('idleFade','never');
        const instances=[];C.data.cards.filter(c=>!c.retired&&c.active!==false).forEach((c,i)=>[null,...C.data.variants.map(v=>v.id)].forEach((v,j)=>instances.push({instanceId:'browser-'+i+'-'+j,cardId:c.id,variantId:v,serial:'TEST-'+i+'-'+j,pulledAt:Date.now(),seen:true})));
        C.events.emit('inventory:fixture',{cards:C.data.cards,instances});C.inventoryModel.update({viewMode:'grid'});C.inventory.request('expanded');
      },tier);
      await page.waitForTimeout(1600);
      await page.locator('.inventory-grid').focus();await page.keyboard.press('End');
      await page.waitForFunction(()=>document.querySelector('.inventory-grid .inventory-tile.is-centered'));
      await page.locator('.inventory-grid .inventory-tile.is-centered .inventory-tile-card').click();
      await page.waitForFunction(()=>Cardable.detail.phase==='detail');
      await page.getByRole('button',{name:'Flip',exact:true}).click();
      await page.waitForFunction(()=>Cardable.detail.view.side==='back');
      await page.locator('.detail-close').click();await page.waitForFunction(()=>Cardable.detail.phase==='closed');
      await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('.inventory-grid').focus();await page.keyboard.press('Home');await page.waitForTimeout(600);
      const count=await page.locator('.inventory-grid .inventory-tile').count();assert(count>0&&count<=12,'Bounded phone grid: '+count);
      for(const theme of ['color','mono']){
        const scroll=await page.evaluate(()=>Cardable.inventory.grid.scrollTop);
        await page.evaluate(theme=>Cardable.settings.set('rarityColor',theme),theme);await page.waitForTimeout(400);
        assert(Math.abs(await page.evaluate(()=>Cardable.inventory.grid.scrollTop)-scroll)<1,'Theme change preserves grid scroll');
        await page.screenshot({path:path.join(output,'pass3-'+tier+'-phone-'+theme+'.png')});
      }
      await page.evaluate(()=>Cardable.inventory.request('peek'));await page.waitForFunction(()=>!Cardable.inventory.active);await page.mouse.move(24,24);await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>Cardable.inventory.rendered.size),0);
      evidence.groups.push(tier+': desktop End, pointer detail promotion, Flip, return, 390px grid, Home, reduced motion, color/mono, and cleanup.');
      await page.close();
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);
  }finally{await browser.close();fs.writeFileSync(path.join(output,'pass3-browser.json'),JSON.stringify(evidence,null,2));}
  console.log(JSON.stringify(evidence,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
