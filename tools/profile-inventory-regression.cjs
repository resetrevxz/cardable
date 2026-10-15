'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),label=process.env.CARDABLE_PROFILE_LABEL||'current',baseline=process.env.CARDABLE_PROFILE_BASELINE==='1';
const out=path.join(root,'qa-output/inventory-regression'),repeats=Number(process.env.CARDABLE_PROFILE_REPEATS||2),hoverSteps=Number(process.env.CARDABLE_PROFILE_HOVER_STEPS||24),hoverDelay=Number(process.env.CARDABLE_PROFILE_HOVER_DELAY_MS||35);
const evidence={label,baseline,repeats,hoverSteps,hoverDelay,layerDiagnostics:process.env.CARDABLE_PROFILE_LAYERS==='1',cases:[],pointer:[],errors:[],network:[]};const tiers=(process.env.CARDABLE_PROFILE_TIERS||'very-low,low,medium,high').split(',');
assert(Number.isInteger(repeats)&&repeats>0,'CARDABLE_PROFILE_REPEATS must be a positive integer');
function summary(values){const a=values.slice().sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)]||0,p95:a[Math.min(a.length-1,Math.floor(a.length*.95))]||0,over25ms:a.filter(v=>v>25).length,count:a.length};}
async function setup(browser,local,tier){
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  page.on('pageerror',e=>evidence.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(local.url))evidence.network.push(r.url());});
  if(baseline||process.env.CARDABLE_PROFILE_LAYER_BASELINE==='1'){for(const file of baseline?['src/ui/detail.js','src/ui/inventory-shelf.js','src/ui/kit/components/inventory-views.css']:['src/ui/kit/components/inventory-views.css']){const body=execFileSync('git',['show','7a34933:'+file],{cwd:root,encoding:'utf8'});await page.route('**/'+file,route=>route.fulfill({body,contentType:file.endsWith('.css')?'text/css':'text/javascript'}));}}
  await page.goto(local.url+'/index.html');await page.waitForFunction(()=>Cardable.preferences?.initialized&&!Cardable.setup.loading);
  await page.evaluate(tier=>{const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset(tier);C.settings.set('motion','off');C.settings.set('fpsLimit','60');const instances=[];C.data.cards.filter(c=>!c.retired&&c.active!==false).forEach((c,i)=>[null,...C.data.variants.map(v=>v.id)].forEach((v,j)=>instances.push({instanceId:'reg-'+i+'-'+j,cardId:c.id,variantId:v,serial:'QA-'+i+'-'+j,pulledAt:1,seen:true})));C.events.emit('inventory:fixture',{cards:C.data.cards,instances});C.inventoryModel.update({showUnowned:false,viewMode:'shelf',activeCollectionId:'all'});C.inventory.request('expanded');},tier);
  await page.waitForFunction(()=>Cardable.inventory.rendered.size>0);if(process.env.CARDABLE_PROFILE_FLATTEN_MASK==='1')await page.addStyleTag({content:'.inventory-tile [data-thumbnail=true][data-front-design=full-art] .card__face--front .card__finish{mask:none;padding:0}'});await page.waitForTimeout(1100);
  await page.evaluate(()=>{const C=Cardable;window.profileCreates={full:0,static:0,fullMs:0,staticMs:0};['create','createThumbnail'].forEach(name=>{const original=C.cardView[name],key=name==='create'?'full':'static';C.cardView[name]=function(...args){const at=performance.now(),v=original.apply(this,args);profileCreates[key]++;profileCreates[key+'Ms']+=performance.now()-at;return v;};});});
  return page;
}
async function measure(page,cdp,run){
  await page.evaluate(()=>{Object.keys(profileCreates).forEach(k=>profileCreates[k]=0);window.profileFrames=[];window.profileAt=performance.now();window.profileDone=false;let previous=performance.now();function frame(t){profileFrames.push(t-previous);previous=t;if(!profileDone)requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  const start=await cdp.send('Performance.getMetrics'),at=performance.now();await run();await page.waitForTimeout(180);const elapsed=performance.now()-at,end=await cdp.send('Performance.getMetrics');
  const result=await page.evaluate(()=>{profileDone=true;return {creates:profileCreates,frames:profileFrames.slice(1),tiles:Cardable.inventory.rendered.size,views:Cardable.cardView.stats.liveViews,full:Cardable.cardView.stats.fullCards,dom:document.querySelectorAll('.inventory-tile *').length};});
  const before=Object.fromEntries(start.metrics.map(m=>[m.name,m.value])),after=Object.fromEntries(end.metrics.map(m=>[m.name,m.value]));result.elapsedMs=elapsed;result.layers=cdp.profileLayers||null;result.frames=summary(result.frames);result.taskMs=(after.TaskDuration-before.TaskDuration)*1000;result.layoutMs=(after.LayoutDuration-before.LayoutDuration)*1000;result.restyleMs=(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000;return result;
}
async function pointerProbe(page){
  await page.evaluate(()=>Cardable.inventoryModel.update({viewMode:'grid'}));await page.waitForTimeout(600);
  const tile=page.locator('.inventory-grid .inventory-tile[data-owned=true]').first();await tile.scrollIntoViewIfNeeded();const r=await tile.boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+Math.min(r.height*.4,150));await page.waitForTimeout(240);await tile.click();await page.waitForFunction(()=>Cardable.detail.phase==='detail');await page.waitForTimeout(150);
  const bounds=await page.evaluate(()=>{const r=Cardable.detail.view.el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  const facts=await page.evaluate(()=>({inert:Cardable.detail.view.el.inert,hidden:Cardable.detail.view.el.getAttribute('aria-hidden'),before:Cardable.detail.view.el.style.getPropertyValue('--mx')}));
  await page.mouse.move(bounds.x+bounds.width*.78,bounds.y+bounds.height*.38);await page.waitForTimeout(180);
  Object.assign(facts,await page.evaluate(()=>{const v=Cardable.detail.view,p=Cardable.input.pointer;return {after:v.el.style.getPropertyValue('--mx'),tilt:v.el.style.getPropertyValue('--ry'),targetInside:v.el.contains(p.target),phase:Cardable.detail.phase};}));
  if(baseline){assert(facts.inert);assert.equal(facts.targetInside,false);}else{assert.equal(facts.inert,false);assert.equal(facts.hidden,null);assert(facts.targetInside);assert(Number(facts.after)>.6,JSON.stringify(facts));}
  evidence.pointer.push(facts);await page.screenshot({path:path.join(out,label+'-detail.png')});await page.locator('.detail-close').click();await page.waitForFunction(()=>Cardable.detail.phase==='closed');await page.mouse.move(100,100);await page.waitForTimeout(250);
}
(async()=>{fs.mkdirSync(out,{recursive:true});const local=await require('./qa-local-server.cjs').start(root),browser=await chromium.launch({channel:'msedge',headless:true});try{
  evidence.browser=browser.version();
  for(const tier of tiers){const page=await setup(browser,local,tier),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');if(evidence.layerDiagnostics){await cdp.send('LayerTree.enable');cdp.on('LayerTree.layerTreeDidChange',e=>{const layers=e.layers||[];cdp.profileLayers={count:layers.length,content:layers.filter(l=>l.drawsContent).length,pixels:layers.filter(l=>l.drawsContent).reduce((n,l)=>n+l.width*l.height,0)};});}
    if(tier==='high')await pointerProbe(page);
    for(const mode of ['shelf','grid']){await page.evaluate(mode=>Cardable.inventoryModel.update({viewMode:mode}),mode);await page.mouse.move(100,100);await page.waitForTimeout(650);if(mode==='grid')await page.screenshot({path:path.join(out,label+'-grid.png')});
      for(let repeat=0;repeat<repeats;repeat++){
        const hover=await measure(page,cdp,async()=>{for(let i=0;i<hoverSteps;i++){const points=await page.evaluate(()=>Array.from(Cardable.inventory.rendered.values()).map(t=>t.el.getBoundingClientRect()).filter(r=>r.width>0&&r.left>=0&&r.right<=innerWidth&&r.bottom>250&&r.top<innerHeight-80).map(r=>({x:r.x+r.width*.5,y:Math.min(innerHeight-100,Math.max(270,r.y+Math.min(r.height*.35,140)))})));const p=points[i%Math.max(1,points.length)];if(p)await page.mouse.move(p.x,p.y);await page.waitForTimeout(hoverDelay);}await page.mouse.move(100,100);});
        await page.waitForTimeout(250);
        const pan=await measure(page,cdp,async()=>{for(let i=0;i<24;i++){await page.evaluate(({mode,i})=>{if(mode==='shelf')Cardable.inventory.carousel.move(10+i*.55);else Cardable.inventory.grid.scrollTop=200+i*95;},{mode,i});await page.waitForTimeout(35);}});
        evidence.cases.push({tier,mode,repeat,hover,pan});console.log(tier,mode,repeat,JSON.stringify({hoverTaskMs:Math.round(hover.taskMs),fullCreates:hover.creates.full,panTaskMs:Math.round(pan.taskMs),hoverP95:Math.round(hover.frames.p95),panP95:Math.round(pan.frames.p95)}));
      }
    }
    await page.evaluate(()=>Cardable.inventory.request(false));await page.waitForFunction(()=>!Cardable.inventory.active);await page.close();
  }
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);
}finally{fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(evidence,null,2));await browser.close();await local.close();}})().catch(e=>{console.error(e);process.exitCode=1});
