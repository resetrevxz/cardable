'use strict';
// Real Chromium/file:// acceptance. Run with Playwright available through NODE_PATH.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const output = process.env.CARDABLE_QA_OUTPUT || path.resolve(__dirname, '../../../outputs/idle-pack');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?dev=1';
const evidence = { groups: [], errors: [], network: [], views: [], frames: null };
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    page.on('pageerror', e => evidence.errors.push(e.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) evidence.network.push(request.url()); });
    await page.goto(url);
    await page.evaluate(() => Cardable.tutorial.skipButton.click());
    await page.waitForTimeout(850);
    await page.evaluate(() => { Cardable.dev.panel.style.display = 'none'; });
    const state = () => page.evaluate(() => ({ pose: Cardable.packView.snapshot(), fluid: Cardable.packView.fluidController.state, phase: Cardable.opening.phase, save: localStorage.getItem(Cardable.config.storage.key), dragging: Cardable.packView.interaction.dragging }));
    const box = () => page.locator('#pack-stage').boundingBox();
    const setFill = async fill => {
      await page.evaluate(fill => {
        Cardable.state.current.packs = { ready: fill === 1 ? 1 : 0, timerStartedAt: Date.now() - Cardable.config.packs.regenMs * (fill === 1 ? 0 : fill) };
        Cardable.state.save();
      }, fill);
      await page.waitForTimeout(100);
    };
    const grab = async (dx, dy, steps = 8) => {
      const b = await box(); await page.mouse.move(b.x + b.width * .5, b.y + b.height * .3);
      await page.mouse.down(); await page.mouse.move(b.x + b.width * .5 + dx, b.y + b.height * .3 + dy, { steps });
      await page.waitForTimeout(180);
    };
    const release = async () => { await page.mouse.up(); await page.mouse.move(20, 180); await page.waitForTimeout(1400); };
    const group = name => { evidence.groups.push(name); console.log('PASS ' + name); };
    await page.mouse.move(20, 180); await page.screenshot({ path: path.join(output, 'idle-1080p.png') });
    const original = await state(); await page.mouse.move(970, 430); await page.waitForTimeout(280);
    assert(Math.abs((await state()).pose.ry) > .05); group('hover changes the wrapper normal without consuming or opening');
    for (const [dx, dy, steps] of [[2, 1, 2], [60, -24, 12], [900, 500, 2], [-120, 35, 30]]) {
      await grab(dx, dy, steps); const s = await state();
      assert(s.dragging && s.phase === 'idle'); assert(Math.abs(s.pose.x) < 101 && Math.abs(s.pose.y) < 71);
      assert(Math.abs(s.pose.rx) <= 19 && Math.abs(s.pose.ry) <= 19); assert.equal(s.save, original.save);
      await release(); const rest = await state(); assert(!rest.dragging && Math.abs(rest.pose.x) < .2 && Math.abs(rest.pose.y) < .2);
    }
    group('tiny, slow, rapid and out-of-range grabs remain bounded, preserve saves and spring to rest');
    for (const fill of [0, .25, .5, .75, .99, 1]) {
      await setFill(fill); const saved = (await state()).save;
      await grab(70, -20); const s = await state(); assert(Math.abs(s.fluid.fill - fill) < .001); assert(Number.isFinite(s.fluid.angle));
      if (fill > 0 && fill < 1) assert(Math.abs(s.fluid.angle) > .05);
      await page.screenshot({ path: path.join(output, 'fluid-' + Math.round(fill * 100) + '.png') });
      await release(); assert.equal((await state()).save, saved); assert(Math.abs((await state()).fluid.angle) < .15);
    }
    group('all six fill levels track timestamps, slosh on drag and settle without save writes');
    for (const [name, width, height] of [['laptop',1280,720], ['1080p',1920,1080], ['1440p',2560,1440], ['4k',3840,2160], ['ultrawide',3440,1440]]) {
      await page.setViewportSize({width,height}); await page.mouse.move(20,180); await page.waitForTimeout(180);
      const b = await box(); assert(b.width >= 160 && b.width <= 360); assert(b.y > 32 && b.y + b.height < height - 100);
      evidence.views.push({name,width,height,pack:b}); await page.screenshot({path:path.join(output, 'layout-' + name + '.png')});
    }
    group('laptop, 1080p, 1440p, 4K and ultrawide keep the physical pack at a useful scale');
    await page.setViewportSize({width:1920,height:1080}); await setFill(.5);
    await page.locator('#pack-stage').focus(); await page.keyboard.press('v'); await page.waitForTimeout(500);
    assert((await state()).pose.lift > 35); await page.keyboard.press('Escape'); await page.mouse.move(20,180); await page.waitForTimeout(900);
    assert((await state()).pose.lift < .2); group('keyboard inspection lifts closer and Escape returns');
    await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(80); await grab(80,-30);
    const reduced = await state(); assert.equal(reduced.pose.x,0); assert.equal(reduced.pose.rx,0); assert.equal(reduced.fluid.angle,0);
    await release(); await page.screenshot({path:path.join(output,'reduced-motion.png')}); await page.emulateMedia({reducedMotion:'no-preference'});
    group('system reduced motion retains fill and foil while removing drag translation, tilt and slosh');
    await grab(60,0); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up(); await page.waitForTimeout(900);
    assert(!(await state()).dragging); assert(Math.abs((await state()).pose.x) < .3); group('blur cancels capture and returns the object');
    await grab(60,0); await page.evaluate(() => Cardable.events.emit('inventory:context',{active:true})); await page.mouse.up(); assert(!(await state()).dragging);
    const count = await page.evaluate(()=>Cardable.packView.stats.updates); await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>Cardable.packView.stats.updates),count); await page.evaluate(()=>Cardable.events.emit('inventory:context',{active:false}));
    group('screen handoff cancels capture and pauses detailed pack updates');
    await setFill(1); await page.locator('#pack-stage').focus(); const beforeCancel=(await state()).save;
    await page.keyboard.down('Space'); await page.waitForTimeout(900); await page.keyboard.up('Space'); await page.waitForTimeout(1000);
    assert.equal((await state()).phase,'idle'); assert.equal((await state()).save,beforeCancel);
    group('early Space release drains the foil body and preserves stock');
    await page.evaluate(()=>{Cardable.config.polish.profileMs=2000;Cardable.profiler.start('idle-wrapper')});
    const timing = await page.evaluate(()=>new Promise(resolve=>{
      const deltas=[];let previous=performance.now();const stop=Cardable.fx.subscribe(now=>{deltas.push(now-previous);previous=now;if(deltas.length===120){stop();resolve(deltas)}return true},'idle-pack-qa');
    }));
    const sorted=timing.slice(3).sort((a,b)=>a-b); evidence.frames={samples:sorted.length, medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],context:'headless Chromium 1920x1080; hardware-dependent'};
    await page.waitForFunction(()=>Cardable.profiler.last); evidence.profile=await page.evaluate(()=>Cardable.profiler.last);
    const blank=await context.newPage();
    const baseline=await blank.evaluate(()=>new Promise(resolve=>{const gaps=[];let prior=performance.now();function frame(now){gaps.push(now-prior);prior=now;if(gaps.length===65)resolve(gaps.slice(5));else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
    baseline.sort((a,b)=>a-b); evidence.frames.emptyPageMedianMs=baseline[30]; await blank.close(); await page.bringToFront();
    await page.mouse.move(20,180); await page.locator('#pack-stage').focus();
    const action=await page.locator('.pack-open-action').boundingBox();
    await page.mouse.move(action.x+action.width/2,action.y+action.height/2); await page.mouse.down(); await page.waitForTimeout(3050); await page.mouse.up();
    await page.waitForFunction(()=>Cardable.opening.phase==='cutting'); await page.screenshot({path:path.join(output,'opening-cut.png')});
    await page.keyboard.press('Enter'); await page.waitForFunction(()=>Cardable.opening.phase==='revealed',{},{timeout:20000});
    const reserved=await page.evaluate(()=>JSON.stringify(Cardable.state.current.pendingReveal));
    await page.reload(); await page.waitForFunction(()=>Cardable.opening.phase==='revealed');
    assert.equal(await page.evaluate(()=>JSON.stringify(Cardable.state.current.pendingReveal)),reserved);
    await page.waitForFunction(()=>!document.querySelector('.opening-keep').disabled); await page.locator('.opening-keep').click(); await page.waitForFunction(()=>Cardable.opening.phase==='idle');
    assert.equal(await page.evaluate(()=>Cardable.state.current.pendingReveal),null); group('pointer hold, tear, reveal, reload recovery and Keep complete with the reserved result');
    assert.equal(evidence.errors.length,0,JSON.stringify(evidence.errors)); assert.equal(evidence.network.length,0); group('direct file:// play produces no application errors or network requests');
    fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify(evidence,null,2));
  } finally { await browser.close(); }
}
main().catch(error=>{fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify({...evidence,failure:error.stack},null,2)); console.error(error);process.exitCode=1});
