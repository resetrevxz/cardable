'use strict';
// Real file:// journey in an isolated browser save. No user save is touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const output = process.env.CARDABLE_QA_OUTPUT || path.resolve(__dirname, '../../../outputs/opening-qol');
const evidence = { groups: [], errors: [], network: [] };
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', e => evidence.errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) evidence.network.push(r.url()); });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?dev=1');
    await page.evaluate(() => { Cardable.tutorial.skipButton.click(); Cardable.dev.panel.style.display = 'none'; });
    await page.mouse.move(700, 550);
    async function stock(ready, elapsed = 0) {
      await page.evaluate(({ ready, elapsed }) => {
        Cardable.state.current.packs = { ready, timerStartedAt: ready === Cardable.config.packs.maxStored ? null : Date.now() - elapsed };
        Cardable.state.save(); Cardable.timers.tick(); Cardable.fx.wake();
      }, { ready, elapsed });
      await page.waitForTimeout(500);
    }
    const regen = await page.evaluate(() => Cardable.config.packs.regenMs);
    assert.equal(regen, 2 * 3600000);
    assert.match(await page.title(), /Cardable · .* · \d+%/);
    await stock(0, regen / 2);
    assert.equal(await page.locator('.stock-card').count(), 4);
    let fills = await page.evaluate(() => Cardable.packView.stockCards.map(slot => slot.value));
    assert(fills[0] > .49 && fills[0] < .51); assert(fills.slice(1).every(value => value === 0));
    assert.match(await page.title(), /Cardable · .* · 50%/);
    await page.screenshot({ path: path.join(output, 'stock-refilling.png') });
    evidence.groups.push('four tiny cards, two-hour timestamp refill, one partial slot and shared remaining-percentage title');

    await stock(0, regen - 3000);
    const titleBefore = await page.title(); await page.waitForTimeout(1100);
    assert.notEqual(await page.title(), titleBefore);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => Cardable.state.current.packs.ready === 1, null, { timeout: 5000 });
    assert.equal(await page.title(), 'Cardable · pack ready');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.mouse.move(705, 550);
    await stock(3, regen - 1000);
    await page.waitForFunction(() => Cardable.state.current.packs.ready === 4, null, { timeout: 4000 });
    const arrival = await page.evaluate(() => Cardable.packView.stockCards[3].arrival);
    assert.notEqual(arrival, null);
    await page.screenshot({ path: path.join(output, 'stock-arrival.png') });
    await page.waitForTimeout(750);
    assert.equal(await page.evaluate(() => Cardable.state.current.packs.timerStartedAt), null);
    fills = await page.evaluate(() => Cardable.packView.stockCards.map(slot => slot.value)); assert(fills.every(value => value === 1));
    await page.evaluate(() => Cardable.timers.tick(Date.now() + Cardable.config.packs.regenMs * 10));
    assert.equal(await page.evaluate(() => Cardable.state.current.packs.ready), 4);
    await page.mouse.move(710, 555); await page.waitForTimeout(170);
    await page.screenshot({ path: path.join(output, 'stock-full.png') });
    evidence.groups.push('title ticks, refill completes while document is hidden, arrival glints, four-slot cap pauses without banking');

    await stock(2);
    await page.evaluate(() => { const s = Cardable.dev.panel.querySelector('select'); s.value = 'common'; s.dispatchEvent(new Event('change')); });
    await page.locator('#pack-stage').focus();
    await page.keyboard.down('Space'); await page.waitForTimeout(3060); await page.keyboard.up('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'cutting');
    const rect = await page.locator('.opening-pack').boundingBox();
    async function point(x, y, steps = 1) { await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * y, { steps }); }
    await point(.1, .5); await page.mouse.down(); await point(.9, .5, 12); await page.mouse.up();
    assert.equal(await page.evaluate(() => Cardable.opening.path.length), 0);
    const guideBefore = await page.locator('.opening-cut-guide').evaluate(el => el.style.strokeDashoffset);
    await page.waitForTimeout(250);
    assert.notEqual(await page.locator('.opening-cut-guide').evaluate(el => el.style.strokeDashoffset), guideBefore);
    const hintBox = await page.locator('.opening-cut-hint').boundingBox(); assert(hintBox.y < rect.y + rect.height * .2);
    await point(.5, .15); await page.screenshot({ path: path.join(output, 'top-cut-guide.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(150);
    assert.equal(await page.locator('.opening-cut-guide').evaluate(el => el.style.strokeDashoffset), '0');
    await page.screenshot({ path: path.join(output, 'top-cut-reduced-motion.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await point(.04, .15); await page.mouse.down(); await point(.4, .18, 8); await page.mouse.up();
    const scratch = await page.evaluate(() => JSON.stringify(Cardable.opening.path));
    await point(.4, .5); await page.mouse.down(); await point(.8, .5, 5); await page.mouse.up();
    assert.equal(await page.evaluate(() => JSON.stringify(Cardable.opening.path)), scratch);
    await page.screenshot({ path: path.join(output, 'top-cut-seam.png') });
    const last = await page.evaluate(() => Cardable.opening.path.at(-1));
    await point(last.x, last.y); await page.mouse.down(); await point(.96, .16, 12); await page.mouse.up();
    assert.equal(await page.evaluate(() => Cardable.opening.phase), 'tearing');
    const split = await page.evaluate(() => ({ axis: Cardable.opening.split.axis, path: Cardable.opening.split.path }));
    assert.equal(split.axis, 'x'); assert(split.path.every(p => p.y >= .08 && p.y <= .22));
    evidence.groups.push('middle cuts rejected, drawing guide and indicator at top, partial seam resumes, horizontal tear stays in top band, reduced motion is static');

    await page.waitForFunction(() => Cardable.opening.phase === 'revealed' && !Cardable.opening.keepButton.hidden, null, { timeout: 20000 });
    await page.screenshot({ path: path.join(output, 'space-to-keep.png') });
    const reserved = await page.evaluate(() => Cardable.state.current.pendingReveal.cards[0].instanceId);
    await page.keyboard.down('Space'); await page.keyboard.down('Space'); await page.keyboard.up('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'idle');
    assert.equal(await page.evaluate(id => Cardable.state.current.inventory.filter(x => x.instanceId === id).length, reserved), 1);
    assert.equal(await page.evaluate(() => Cardable.opening.stats.keeps), 1);
    await page.reload(); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(id => Cardable.state.current.inventory.filter(x => x.instanceId === id).length, reserved), 1);
    await page.evaluate(() => { Cardable.dev.panel.style.display = 'none'; const s = Cardable.dev.panel.querySelector('select'); s.value = 'common'; s.dispatchEvent(new Event('change')); });
    await page.locator('#pack-stage').focus(); await page.keyboard.down('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'cutting');
    await page.evaluate(() => Cardable.events.emit('input:tear'));
    assert(await page.evaluate(() => Cardable.opening.split.path.every(p => Math.abs(p.y - Cardable.config.cut.guideY) < .000001)));
    await page.waitForFunction(() => Cardable.opening.phase === 'revealed' && !Cardable.opening.keepButton.hidden, null, { timeout: 20000 });
    await page.keyboard.down('Space'); assert.notEqual(await page.evaluate(() => Cardable.state.current.pendingReveal), null);
    await page.keyboard.up('Space');
    if (await page.evaluate(() => !!Cardable.settings)) await page.evaluate(() => Cardable.settings.set('openKey', 'enter'));
    assert.equal(await page.locator('.opening-keep-key').textContent(), 'Space');
    await page.locator('.opening-keep').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'idle');
    assert.equal(await page.evaluate(() => Cardable.state.current.inventory.length), 2);
    evidence.groups.push('fresh Space Keeps once, repeat does not double-save, reload preserves card, held opening key is guarded, Enter fallback removes top cap, Space-to-Keep survives opening-key preference changes');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.network, []);
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ groups: evidence.groups, errors: evidence.errors, networkRequests: evidence.network.length, output }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
