'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const output=process.env.CARDABLE_QA_OUTPUT||path.resolve(__dirname,'../../../outputs/cut-swipe');
const evidence={groups:[],errors:[],network:[]};
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});
 try{
  async function setup(options={}){
   const p=await browser.newPage({viewport:{width:1366,height:900},...options});
   p.on('pageerror',e=>evidence.errors.push(e.stack));p.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
   await p.clock.install();await p.goto(url);await p.evaluate(()=>{
    const C=Cardable;C.tutorial.skipButton.click();C.settings.set('nudgeDismissed',true);C.events.on('opening:resolve',r=>{r.options.forcedTier='basic';r.options.forcedVariant=null;});
   });await p.clock.runFor(1000);return p;
  }
  const p=await setup();
  const stock=await p.evaluate(()=>Cardable.state.current.packs.ready);
  await p.keyboard.down('Space');await p.clock.runFor(1000);await p.keyboard.up('Space');await p.clock.runFor(1000);
  assert.equal(await p.evaluate(()=>Cardable.state.current.packs.ready),stock);
  assert.equal(await p.evaluate(()=>Cardable.state.current.pendingReveal),null);
  await p.keyboard.down('Space');await p.clock.runFor(3100);await p.keyboard.up('Space');await p.clock.runFor(1000);
  assert.equal(await p.evaluate(()=>Cardable.opening.phase),'cutting');
  assert.equal(await p.locator('.pack-pool').count(),0);
  const reserved=await p.evaluate(()=>({id:Cardable.state.current.pendingReveal.cards[0].instanceId,currency:Cardable.state.current.currency,ready:Cardable.state.current.packs.ready}));
  assert.equal(reserved.ready,stock-1);assert.equal(reserved.currency,200);
  evidence.groups.push('The three-second charge and early-release cancellation remain intact; one commit/reward reserves the card; Standard Pack has no generation-pool print on any layer.');
  async function point(x,y,steps=1){const r=await p.locator('.opening-pack').boundingBox();await p.mouse.move(r.x+r.width*x,r.y+r.height*y,{steps});}
  await point(.1,.75);await p.mouse.down();await point(.9,.75,4);await p.mouse.up();
  assert.equal(await p.evaluate(()=>Cardable.opening.path.length),0);
  await point(-.08,.30);await p.mouse.down();await point(.32,.46,6);await p.clock.runFor(80);
  const cut=await p.evaluate(()=>({path:Cardable.opening.path,guide:Cardable.config.cut.guideY,glow:Number(document.querySelector('.opening-cut-glow').style.opacity),tip:Number(document.querySelector('.opening-cut-tip').style.opacity),segments:document.querySelectorAll('.opening-cut-glint').length}));
  assert(cut.path.length>1);assert(cut.path.every(q=>q.y===cut.guide));assert(cut.glow>.5);assert(cut.tip>.4);assert(cut.segments<=24);
  await p.screenshot({path:path.join(output,'aligned-drag-glow.png')});
  await p.mouse.up();await p.clock.runFor(500);const partial=await p.evaluate(()=>JSON.stringify(Cardable.opening.path));
  await point(.15,.3);await p.mouse.down();await point(.15,.51);await p.mouse.up();
  assert.equal(await p.evaluate(()=>JSON.stringify(Cardable.opening.path)),partial);
  await point(.18,.34);await p.mouse.down();await point(.55,.49,5);await p.mouse.up();await p.clock.runFor(80);
  assert.equal(await p.evaluate(()=>Cardable.opening.phase),'cutting');
  await point(.40,.29);await p.mouse.down();await point(.83,.52,5);await p.clock.runFor(60);
  assert(await p.locator('.opening-pack').evaluate(el=>el.classList.contains('is-cut-finishing')));
  await p.screenshot({path:path.join(output,'completion-sweep.png')});
  await p.clock.runFor(160);await p.mouse.up();
  assert.equal(await p.evaluate(()=>Cardable.opening.phase),'tearing');
  const split=await p.evaluate(()=>({axis:Cardable.opening.split.axis,path:Cardable.opening.split.path,guide:Cardable.config.cut.guideY}));
  assert.equal(split.axis,'x');assert(split.path.every(q=>Math.abs(q.y-split.guide)<1e-8));
  await p.clock.runFor(220);
  await p.screenshot({path:path.join(output,'snappy-cap-peel.png')});
  assert.equal(await p.evaluate(()=>Cardable.state.current.pendingReveal.cards[0].instanceId),reserved.id);
  assert.equal(await p.evaluate(()=>Cardable.state.current.currency),reserved.currency);
  evidence.groups.push('Body strokes are rejected; starts outside the old narrow strip and side edge work, vertical drift snaps to the seal, partial cuts resume broadly, vertical-only strokes do not progress, and a 130ms finishing sweep peels a straight top cap.');
  await p.reload();await p.clock.runFor(1000);
  assert.equal(await p.evaluate(()=>Cardable.opening.phase),'revealed');
  assert.equal(await p.evaluate(()=>Cardable.state.current.pendingReveal.cards[0].instanceId),reserved.id);
  await p.keyboard.press('Space');await p.clock.runFor(5000);
  assert.equal(await p.evaluate(id=>Cardable.state.current.inventory.filter(c=>c.instanceId===id).length,reserved.id),1);
  assert.equal(await p.evaluate(()=>Cardable.state.current.currency),reserved.currency);
  await p.evaluate(()=>Cardable.opening.openNow());await p.clock.runFor(1100);
  await point(1.10,.02);await p.mouse.down();await point(-.1,.5);await p.clock.runFor(180);await p.mouse.up();
  assert.equal(await p.evaluate(()=>Cardable.opening.phase),'tearing');
  assert.equal(await p.evaluate(()=>Cardable.opening.stats.tears),1);
  evidence.groups.push('Reload after slashing recovers the same reserved card without another reward; Keep collects once; one fast right-to-left slash also completes.');
  const touch=await setup({viewport:{width:390,height:844},hasTouch:true});
  await touch.emulateMedia({reducedMotion:'reduce'});
  await touch.evaluate(()=>{Cardable.settings.set('cutAssist','easy');Cardable.settings.set('fpsLimit','30');Cardable.opening.openNow();});await touch.clock.runFor(1100);
  const r=await touch.locator('.opening-pack').boundingBox(),cdp=await touch.context().newCDPSession(touch);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x-.04*r.width,y:r.y+.30*r.height}]});
  await touch.clock.runFor(50);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+.65*r.width,y:r.y+.49*r.height}]});
  await touch.clock.runFor(200);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await touch.evaluate(()=>Cardable.opening.phase),'tearing');
  assert.equal(await touch.evaluate(()=>Cardable.opening.stats.particles),0);
  assert.equal(await touch.locator('.opening-half').first().evaluate(el=>el.style.transform),'none');
  evidence.groups.push('Native phone touch accepts a drifting swipe; Easy assist, reduced motion and 30 FPS complete correctly without particles or recoil.');
  const credits=await setup();
  await credits.keyboard.press('Tab');
  await credits.evaluate(()=>Cardable.menu.holdVisible('qa-open-panel',true));
  await credits.clock.fastForward(16000);await credits.waitForTimeout(700);
  assert.equal(await credits.evaluate(()=>Cardable.menu.idle),false);
  assert.equal(await credits.locator('#currency-counter').evaluate(el=>getComputedStyle(el).opacity),'0');
  await credits.mouse.move(1000,100);await credits.clock.runFor(250);await credits.waitForTimeout(700);
  assert.equal(await credits.locator('#currency-counter').evaluate(el=>getComputedStyle(el).opacity),'1');
  evidence.groups.push('Credits fade after stillness even when keyboard/panel holds keep the rest of the UI visible; movement restores them.');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);
 }finally{fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));await browser.close();}
 console.log(JSON.stringify(evidence,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
