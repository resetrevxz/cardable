'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium,_electron}=require('playwright'),root=path.resolve(__dirname,'..');
const native=process.env.CARDABLE_TEST_NATIVE==='1',output=path.join(root,'qa-output/inventory-regression'),evidence={native,checks:[],errors:[],network:[]};
let app,browser,local,page;
async function pause(ms=200){await page.waitForTimeout(ms);}
async function hoveredTile(){return page.evaluate(()=>Array.from(Cardable.inventory.rendered.values()).find(t=>t.el.matches(':hover'))?.entry.stackKey);}
async function aim(){
  await page.waitForFunction(()=>Cardable.inventoryModel.current.viewMode!=='shelf'||Cardable.inventory.carousel.settled());
  const point=await page.evaluate(()=>{
    for(const tile of Array.from(Cardable.inventory.rendered.values())){
      const r=tile.card.getBoundingClientRect(),x=r.x+r.width*.5,y=Math.max(240,Math.min(innerHeight-150,r.y+r.height*.35));
      if(tile.entry.owned&&r.left>5&&r.right<innerWidth-5&&r.top<innerHeight-160&&r.bottom>220&&document.elementFromPoint(x,y)?.closest('.inventory-tile')===tile.el){window.interactionTile=tile;return {x,y,key:tile.entry.stackKey};}
    }
    throw Error('No unobscured owned card');
  });await page.mouse.move(point.x,point.y);return point;
}
async function detailCheck(){
  const result=await page.evaluate(()=>{const v=Cardable.detail.view;const r=v.el.getBoundingClientRect();return {inert:v.el.inert,hidden:v.el.getAttribute('aria-hidden'),x:r.x,y:r.y,w:r.width,h:r.height};});assert.equal(result.inert,false);assert.equal(result.hidden,null);
  await page.mouse.move(result.x+result.w*.8,result.y+result.h*.35);await pause(180);
  assert(await page.evaluate(()=>{const v=Cardable.detail.view;return v.el.contains(Cardable.input.pointer.target)&&Number(v.el.style.getPropertyValue('--mx'))>.6;}));
  await page.mouse.move(result.x+result.w*.25,result.y+result.h*.65);await pause(180);assert(await page.evaluate(()=>Number(Cardable.detail.view.el.style.getPropertyValue('--mx'))<.45));
  await page.getByRole('button',{name:'Flip',exact:true}).click();await page.waitForFunction(()=>Cardable.detail.view.side==='back');await page.locator('.detail-close').click();await page.waitForFunction(()=>Cardable.detail.phase==='closed');
}
(async()=>{fs.mkdirSync(output,{recursive:true});try{
  if(native){const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cardable-inventory-fix-'));app=await _electron.launch({executablePath:require('electron'),args:[root,'--qa-test','--test-user-data='+profile],timeout:30000});page=await app.firstWindow();}
  else{local=await require('./qa-local-server.cjs').start(root);browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});}
  page.setDefaultTimeout(12000);page.on('pageerror',e=>evidence.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url())&&(!local||!r.url().startsWith(local.url)))evidence.network.push(r.url());});
  if(!native)await page.goto(local.url+'/index.html');await page.waitForFunction(()=>Cardable.preferences?.initialized&&!Cardable.setup.loading);
  await page.evaluate(()=>{const C=Cardable;C.tutorial.skipButton.click();if(C.friendly?.active)C.friendly.close();C.settings.applyPreset('high');C.settings.set('motion','off');C.settings.set('fpsLimit','60');const cards=C.data.cards.filter(c=>!c.retired&&c.active!==false).slice(0,60),instances=cards.map((c,i)=>({instanceId:'interaction-'+i,cardId:c.id,serial:'INTERACTION-'+i,variantId:null,pulledAt:1,seen:true}));C.events.emit('inventory:fixture',{cards:C.data.cards,instances});C.inventoryModel.update({showUnowned:false,viewMode:'grid'});C.inventory.request('expanded');});
  if(await page.getByRole('button',{name:'Start collecting',exact:true}).count())await page.getByRole('button',{name:'Start collecting',exact:true}).click();await page.waitForFunction(()=>Cardable.inventory.rendered.size>0);await pause(900);
  const original=await page.evaluate(()=>JSON.stringify([Cardable.state.current.inventory,Cardable.state.current.currency,Cardable.state.current.serialCounter]));
  for(const mode of ['grid','shelf']){
    await page.evaluate(mode=>Cardable.inventoryModel.update({viewMode:mode}),mode);await page.mouse.move(100,100);await pause(400);const point=await aim();await pause(240);assert.equal(await hoveredTile(),point.key);assert(await page.evaluate(()=>interactionTile.live));
    await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>Cardable.detail.phase==='detail');await detailCheck();evidence.checks.push(mode+': first hovered card opens interactively, follows both cursor directions and flips/returns.');
    await page.mouse.move(100,100);await page.getByRole('button',{name:'Inventory controls',exact:true}).focus();await pause(220);
    await aim();await pause(240);await page.evaluate(()=>interactionTile.el.focus());await page.mouse.move(100,100);await pause(200);assert(await page.evaluate(()=>interactionTile.live));
    await page.getByRole('button',{name:'Inventory controls',exact:true}).focus();await pause(220);assert(await page.evaluate(()=>!interactionTile.live&&interactionTile.view.thumbnail));evidence.checks.push(mode+': keyboard focus retains live materials; blur/leave returns to a complete static preview.');
    // Close while a delayed hover is pending; no detached card can promote later.
    await aim();await page.evaluate(()=>Cardable.inventory.request(false));await page.waitForFunction(()=>!Cardable.inventory.active);await page.mouse.move(100,100);await page.waitForFunction(()=>Cardable.inventory.rendered.size===0);assert.equal(await page.evaluate(()=>Cardable.inventoryTiles.liveTile||null),null);
    await page.evaluate(()=>Cardable.inventory.request('expanded'));await page.waitForFunction(()=>Cardable.inventory.rendered.size>0);await pause(400);
  }
  // Simulate a background document at the timer boundary without hiding the QA window.
  await page.mouse.move(100,100);await page.getByRole('button',{name:'Inventory controls',exact:true}).focus();await pause(220);
  await aim();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  try{await pause(240);assert(await page.evaluate(()=>!interactionTile.live));}finally{await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});}
  await page.mouse.move(100,100);await pause(220);
  await aim();await page.evaluate(()=>{interactionTile.el.closest('.inventory-grid, .inventory-shelf').inert=true;});
  try{await pause(240);assert(await page.evaluate(()=>!interactionTile.live));}finally{await page.evaluate(()=>{interactionTile.el.closest('.inventory-grid, .inventory-shelf').inert=false;});}
  await page.mouse.move(100,100);await pause(220);evidence.checks.push('Pending hover cannot promote while the document is hidden or its browsing surface is inert.');
  if(native)await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());
  await page.evaluate(()=>Cardable.settings.set('motion','on'));await page.waitForFunction(()=>Cardable.inventory.rendered.size>0);await pause(300);await aim();await pause(240);await page.evaluate(()=>interactionTile.el.click());await page.waitForFunction(()=>Cardable.detail.phase==='detail');const before=await page.evaluate(()=>Cardable.detail.view.el.style.getPropertyValue('--ry'));const r=await page.evaluate(()=>{const r=Cardable.detail.view.el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});await page.mouse.move(r.x+r.w*.85,r.y+r.h*.2);await pause(200);assert.equal(await page.evaluate(()=>Cardable.detail.view.el.style.getPropertyValue('--ry')),before);await page.locator('.detail-close').click();await page.waitForFunction(()=>Cardable.detail.phase==='closed');evidence.checks.push('Reduced motion remains still; pending hover/close cleanup leaves no live inventory tile.');
  assert.equal(await page.evaluate(()=>JSON.stringify([Cardable.state.current.inventory,Cardable.state.current.currency,Cardable.state.current.serialCounter])),original);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);console.log(JSON.stringify(evidence,null,2));
}catch(error){evidence.failure=error.stack;if(page)evidence.state=await page.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus(),active:Cardable.inventory.active,detent:Cardable.inventory.detent,entries:Cardable.inventory.entries.length,tiles:Cardable.inventory.rendered.size,phase:Cardable.detail.phase,scope:Cardable.fx.scopeLabel,studio:Cardable.studio.active,preferences:Cardable.preferences.active,shelfHidden:document.querySelector('.inventory-shelf').hidden,fx:Cardable.fx.stats,afk:Cardable.menu.afk})).catch(()=>null);if(page)await page.screenshot({path:path.join(output,(native?'native':'browser')+'-interaction-failure.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(output,(native?'native':'browser')+'-interaction.json'),JSON.stringify(evidence,null,2));if(app)await app.close();if(browser)await browser.close();if(local)await local.close();}})().catch(e=>{console.error(e);process.exitCode=1});
