// Main-thread cost per graphics tier and scene, from Chromium's Performance metrics (headless, offline).
// Reports busy / script / layout / style time as a share of wall time plus style-recalc and layout counts per
// second, with scripted pointer or wheel input. Use it to compare a change against the same machine's baseline.
//   TIERS=very-low,low,medium,high SCENES=menu,menu-pointer,detail,detail-pointer,shelf,grid
//   RARITY=mythical VARIANT=galaxy-holo MS=3000 CSS="<extra css to test>" node tools/profile-main-thread.cjs
const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
const INDEX=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const tiers=(process.env.TIERS||'very-low,low,medium,high').split(','),scenes=(process.env.SCENES||'menu,menu-pointer,detail,detail-pointer,shelf,grid').split(',');
const rar=process.env.RARITY||'mythical',variant=process.env.VARIANT||'galaxy-holo',ms=Number(process.env.MS||3000);
(async()=>{const browser=await chromium.launch({headless:true});
for(const scene of scenes)for(const tier of tiers){
const page=await browser.newPage({viewport:{width:1366,height:900}});await page.goto(INDEX);await page.waitForTimeout(1500);
await page.evaluate(({tier,scene,rar,variant})=>{const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset(tier);C.settings.set('idleFade','never');C.settings.set('fpsLimit','display');
if(/^(detail|shelf|grid)/.test(scene)){const instances=[];const cards=C.data.cards.filter(c=>!c.retired&&c.active!==false);
 if(scene.startsWith('detail')){const card=cards.find(c=>c.rarity===rar);instances.push({instanceId:'v3-profile',cardId:card.id,variantId:variant,serial:'TEST-1',pulledAt:Date.now(),seen:true,packId:'standard',cardSkinId:'standard'});}
 else cards.forEach((c,i)=>[null,...C.data.variants.map(v=>v.id)].forEach((v,j)=>instances.push({instanceId:'v3-'+i+'-'+j,cardId:c.id,variantId:v,serial:'TEST-'+i+'-'+j,pulledAt:Date.now(),seen:true})));
 C.events.emit('inventory:fixture',{cards:C.data.cards,instances});C.inventoryModel.update({showUnowned:false,viewMode:scene==='grid'?'grid':'shelf'});C.inventory.request('expanded');}
},{tier,scene,rar,variant});
if(process.env.CSS)await page.addStyleTag({content:process.env.CSS});
await page.waitForTimeout(1800);
if(scene.startsWith('detail')){await page.locator('.inventory-tile').first().click();await page.waitForTimeout(1800);}
const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
const get=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
const a=await get();const t0=Date.now();
const pointer=/pointer|shelf|grid/.test(scene);
let frames=0;
if(pointer){const end=t0+ms;let i=0;while(Date.now()<end){i++;if(scene==='shelf')await page.mouse.wheel(0,40);else if(scene==='grid'){await page.mouse.wheel(0,60);}else await page.mouse.move(400+300*Math.sin(i/20),400+200*Math.cos(i/15));await page.waitForTimeout(16);}}
else await page.waitForTimeout(ms);
const b=await get();const wall=(Date.now()-t0)/1000;
const d=k=>(b[k]-a[k]);
console.log(scene.padEnd(14),tier.padEnd(9),'busy',(100*d('TaskDuration')/wall).toFixed(1).padStart(5)+'%','script',(100*d('ScriptDuration')/wall).toFixed(1).padStart(5)+'%','layout',(100*d('LayoutDuration')/wall).toFixed(1).padStart(5)+'%','style',(100*d('RecalcStyleDuration')/wall).toFixed(1).padStart(5)+'%','recalc#',Math.round(d('RecalcStyleCount')/wall),'layout#',Math.round(d('LayoutCount')/wall),'nodes',b.Nodes);
await page.close();}
await browser.close();})();
