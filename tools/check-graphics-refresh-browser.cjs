'use strict';
// Uses fresh browser contexts; the player's storage is never opened.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const output = path.resolve(__dirname, '../../../outputs/graphics-refresh');
const evidence = {groups: [], cinematics: [], errors: [], network: []};
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
(async () => {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({headless: true});
  function observe(page) {
    page.on('pageerror', e => evidence.errors.push(e.stack));
    page.on('console', m => {if (m.type() === 'error') evidence.errors.push(m.text());});
    page.on('request', r => {if (/^https?:/.test(r.url())) evidence.network.push(r.url());});
  }
  try {
    const page = await browser.newPage(); observe(page);
    await page.goto(url);
    await page.evaluate(() => Cardable.tutorial.skipButton.click());
    for (const tier of ['very-low', 'low', 'medium', 'high']) {
      const result = await page.evaluate(tier => {
        const C = Cardable;
        const migrated = C.settingsSchema.normalize({quality: tier});
        C.settings.set('fpsLimit', '45');
        C.settings.applyPreset(tier);
        return {migrated: migrated.cinematicQuality, values: C.settingsSchema.graphicsKeys.map(k => C.settings.get(k)), cap: C.settings.get('fpsLimit')};
      }, tier);
      assert.equal(result.migrated, tier);
      assert(result.values.every(value => value === tier));
      assert.equal(result.cap, '45');
    }
    await page.evaluate(() => {Cardable.settings.applyPreset('high'); Cardable.preferences.show();});
    await page.locator('.settings-advanced summary').click();
    await page.locator('[aria-labelledby=setting-cinematicQuality]').selectOption('very-low');
    assert.equal(await page.evaluate(() => Cardable.cutscenes.mode()), 'light');
    assert.equal(await page.evaluate(() => Cardable.settings.get('quality')), 'high');
    assert(await page.evaluate(() => Cardable.settings.customized));
    await page.reload();
    assert.equal(await page.evaluate(() => Cardable.settings.get('cinematicQuality')), 'very-low');
    evidence.groups.push('All presets migrate and apply ten graphics controls; independent cinematic detail persists and leaves FPS unchanged.');
    for (const cap of ['20', '45']) {
      const fps = await page.evaluate(async cap => {
        const C = Cardable;
        C.settings.set('fpsLimit', cap);
        const stop = C.fx.subscribe(() => true, 'qa-pacing');
        await new Promise(resolve => setTimeout(resolve, 250));
        const before = C.fx.stats.frameCount, start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 1500));
        const result = (C.fx.stats.frameCount - before) * 1000 / (performance.now() - start);
        stop(); return result;
      }, cap);
      assert(Math.abs(fps - Number(cap)) < 4, `${cap} FPS cap measured ${fps}`);
    }
    await page.evaluate(() => Cardable.settings.set('fpsLimit', 'display'));
    evidence.groups.push('Real browser pacing respects the new 20 and fractional 45 FPS caps.');
    for (const tier of ['very-low', 'low', 'medium', 'high']) {
      const scenes = await page.evaluate(tier => {
        const C = Cardable, intro = C.opening.intro, rows = [];
        C.settings.applyPreset(tier);
        for (const id of ['legendary', 'mythical', 'exotic', 'ascendant', 'secret']) {
          const rarity = C.rarity(id);
          intro.start(rarity.openingIntro, rarity.name, 'GRAPHICS-QA');
          const duration = intro.durationMs;
          intro.update(100, performance.now());
          rows.push({tier, id, duration, mode: C.cutscenes.mode(), pixels: intro.canvas.width * intro.canvas.height});
          intro.stop();
          if (intro.active) throw new Error('Cinematic failed to release: ' + id);
        }
        return rows;
      }, tier);
      assert(scenes.every(s => s.duration > 0 && s.pixels > 0));
      if (tier === 'very-low') assert(scenes.every(s => s.mode === 'light'));
      evidence.cinematics.push(...scenes);
    }
    evidence.groups.push('Five cinematic renderers start, render and release at all four tiers, including the calm Very Low route.');
    await page.evaluate(() => {Cardable.settings.set('unfocusedMode', 'pause'); window.dispatchEvent(new Event('blur'));});
    const count = await page.evaluate(() => Cardable.fx.stats.frameCount);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => Cardable.fx.stats.frameCount), count);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(() => {
      const C = Cardable;
      C.settings.set('backgroundMode', 'sleep');
      C.state.current.packs.ready = 0;
      C.state.current.packs.timerStartedAt = Date.now();
      C.state.save();
      Object.defineProperty(document, 'hidden', {configurable: true, value: true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(() => Cardable.timers.running), false);
    await page.evaluate(() => Cardable.settings.set('backgroundMode', 'timer'));
    assert.equal(await page.evaluate(() => Cardable.timers.running), true);
    assert.equal(await page.evaluate(() => Cardable.fx.stats.running), false);
    await page.evaluate(() => Cardable.settings.set('backgroundMode', 'sleep'));
    await page.evaluate(() => {
      Cardable.state.current.packs.timerStartedAt = Date.now() - Cardable.config.packs.regenMs * 2;
      Object.defineProperty(document, 'hidden', {configurable: true, value: false});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(() => Cardable.state.current.packs.ready), 2);
    evidence.groups.push('Unfocused pause stops frames; hidden sleep stops the timer and restores two real-time refills on return.');
    const phone = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true}); observe(phone);
    await phone.goto(url);
    await phone.evaluate(() => {
      const C = Cardable;
      C.tutorial.skipButton.click(); C.settings.applyPreset('very-low');
      const roll = C.pull.roll;
      C.pull.roll = function(pack, random, options) {return roll(pack, random, Object.assign({}, options, {forcedTier: 'basic'}));};
    });
    const cdp = await phone.context().newCDPSession(phone);
    const box = await phone.locator('.pack-open-action').boundingBox();
    const touch = [{x: box.x + box.width / 2, y: box.y + box.height / 2}];
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: touch});
    await phone.waitForTimeout(2100);
    assert.equal(await phone.evaluate(() => Cardable.state.current.pendingReveal), null);
    await phone.waitForTimeout(1100);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await phone.waitForFunction(() => Cardable.opening.phase === 'cutting');
    await phone.locator('.opening-tear-touch').tap();
    await phone.waitForFunction(() => Cardable.opening.phase === 'revealed' && !Cardable.opening.keepButton.hidden);
    const reserved = await phone.evaluate(() => ({id: Cardable.state.current.pendingReveal.cards[0].instanceId, currency: Cardable.state.current.currency}));
    await phone.locator('.opening-keep').tap();
    await phone.waitForFunction(() => Cardable.opening.phase === 'idle');
    // Keeping the first card can unlock catalog achievements with their own rewards.
    const afterKeep=await phone.evaluate(()=>Cardable.state.current.currency);
    assert(afterKeep>=reserved.currency);
    await phone.reload();
    assert.equal(await phone.evaluate(id => Cardable.state.current.inventory.filter(i => i.instanceId === id).length, reserved.id), 1);
    assert.equal(await phone.evaluate(() => Cardable.state.current.currency), afterKeep);
    await phone.reload();
    assert.equal(await phone.evaluate(() => Cardable.state.current.currency), afterKeep);
    assert.equal(await phone.evaluate(id => Cardable.state.current.inventory.filter(i => i.instanceId === id).length, reserved.id), 1);
    await phone.evaluate(() => Cardable.preferences.show());
    await phone.waitForTimeout(600);
    await phone.locator('.settings-advanced summary').tap();
    await phone.locator('[aria-labelledby=setting-fpsLimit]').selectOption('20');
    assert.equal(await phone.evaluate(() => Cardable.settings.get('fpsLimit')), '20');
    await phone.screenshot({path: path.join(output, 'phone-settings.png')});
    const panel = await phone.locator('.settings-panel').boundingBox();
    assert(panel.x >= 0 && panel.x + panel.width <= 391);
    evidence.groups.push('DPR3 phone: three-second native touch hold, Tear, Keep and exact-once reload; settings and 20 FPS control fit portrait.');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.network, []);
  } finally {
    fs.writeFileSync(path.join(output, 'qa.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(evidence, null, 2));
})().catch(e => {console.error(e); process.exitCode = 1;});
