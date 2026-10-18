'use strict';
// Market hover and press feedback, driven through the real interface with a real mouse: a tile leans toward the pointer, takes its
// rarity colour, the tab underline slides, and all of it stays off under reduced motion and Hover animations off.
//   node tools/check-market-hover-browser.cjs [--out qa-output/market-hover]
// Headless: it never opens a window on the desktop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-hover');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [] };
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell && Cardable.preferences);
  await page.evaluate(() => { const s = JSON.parse(JSON.stringify(Cardable.state.current)); s.tutorial = { step: 'done', done: true }; s.currency = 1500; Cardable.state.commit(s); });
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  if (options.hoverOff) await page.evaluate(() => { document.documentElement.dataset.hoverAnimations = 'false'; });
  await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
  await page.waitForSelector('.mk-page');
  await page.click('.mk-tab[data-tab="discover"]');
  await page.waitForSelector('.mk-tile');
  await page.waitForTimeout(900);
  return { context, page };
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 700) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 3).join('\n     ')); }
}
// where a tile is, after scrolling it into view
async function tileBox(page, index) {
  const tile = page.locator('.mk-tile').nth(index);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  // tiles can be taller than the window: aim only at the part that is on screen
  const box = await tile.boundingBox(), view = page.viewportSize();
  const top = Math.max(box.y, 0), bottom = Math.min(box.y + box.height, view.height);
  return { x: box.x, width: box.width, y: top, height: Math.max(bottom - top, 1) };
}
// moves the mouse onto a tile and waits (on a busy machine, longer) until the page has answered with the lean
async function pointAt(page, index, fx, fy) {
  const box = await tileBox(page, index);
  const x = box.x + box.width * fx, y = box.y + box.height * fy;
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.mouse.move(x + attempt, y, { steps: 4 });
    try { await page.waitForFunction((i) => document.querySelectorAll('.mk-tile')[i].classList.contains('is-pointed'), index, { timeout: 1500 }); break; } catch (e) { /* move again */ }
  }
  await page.waitForTimeout(450);
}
const artState = (page, index) => page.evaluate((i) => {
  const t = document.querySelectorAll('.mk-tile')[i], art = t.querySelector('.mk-art');
  // the rarity glow is a coloured shadow with a wide blur and a negative spread: look for one with some strength
  const shadow = getComputedStyle(t).boxShadow, glows = [];
  shadow.replace(/rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/g, (m, rgb, x, y, blur, spread) => { const a = rgb.split(',').length > 3 ? parseFloat(rgb.split(',')[3]) : 1; if (parseFloat(blur) >= 18 && parseFloat(spread) < 0 && x === '0' && y === '0') glows.push(a); return m; });
  return { pointed: t.classList.contains('is-pointed'), tiltX: t.style.getPropertyValue('--tilt-x'), tiltY: t.style.getPropertyValue('--tilt-y'), transform: art ? getComputedStyle(art).transform : null, glow: glows.length ? Math.max.apply(null, glows) : 0, tier: Number(t.style.getPropertyValue('--mk-tier')), rarity: t.dataset.rarity };
}, index);

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const { context, page } = await boot(browser);
    await step('a tile leans toward the pointer and the lean follows it', async () => {
      await pointAt(page, 0, 0.2, 0.3);
      const a = await artState(page, 0);
      await page.screenshot({ path: path.join(out, 'hover-left.png') });
      await pointAt(page, 0, 0.8, 0.7);
      const b = await artState(page, 0);
      await page.screenshot({ path: path.join(out, 'hover-right.png') });
      assert.ok(a.pointed && b.pointed, 'tile is marked as pointed');
      assert.notEqual(a.tiltY, b.tiltY, 'tilt follows the pointer: ' + a.tiltY + ' vs ' + b.tiltY);
      assert.ok(parseFloat(a.tiltY) < 0 && parseFloat(b.tiltY) > 0, 'left side leans left, right side leans right');
      assert.notEqual(a.transform, 'none', 'the card art is transformed while pointed');
      return { a, b };
    });
    await step('leaving the tile removes every pointer value', async () => {
      await page.mouse.move(5, 5, { steps: 3 });
      await page.waitForTimeout(500);
      const s = await artState(page, 0);
      assert.equal(s.pointed, false); assert.equal(s.tiltX, ''); assert.equal(s.tiltY, '');
    });
    await step('a scarcer card glows in its own colour, a common one does not', async () => {
      const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-tile')).map((t) => t.dataset.rarity));
      const hiIdx = rows.findIndex((r) => ['rare', 'super-rare', 'unusual', 'double-super-rare', 'legendary', 'mythical', 'exotic', 'ascendant', 'secret'].indexOf(r) >= 0);
      const loIdx = rows.findIndex((r) => r === 'basic' || r === 'common');
      const res = {};
      for (const [name, idx] of [['high', hiIdx], ['low', loIdx]]) {
        if (idx < 0) continue;
        const box = await tileBox(page, idx);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
        await page.waitForTimeout(450);
        res[name] = await artState(page, idx);
        if (name === 'high') await page.screenshot({ path: path.join(out, 'hover-rare.png') });
      }
      if (res.high) assert.ok(res.high.tier >= 3 && parseFloat(res.high.glow) > 0.1, 'a ' + res.high.rarity + ' tile glows (' + res.high.glow + ')');
      if (res.low) assert.equal(parseFloat(res.low.glow), 0, 'a ' + res.low.rarity + ' tile does not glow');
      return res;
    });
    await step('pressing a button sinks it', async () => {
      const btn = page.locator('.mk-button:not(:disabled)').first();
      await btn.scrollIntoViewIfNeeded();
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(250);
      const t = await btn.evaluate((e) => getComputedStyle(e).transform);
      await page.mouse.up();
      assert.notEqual(t, 'none', 'pressed button is scaled: ' + t);
    });
    await step('the tab underline slides to the tab you pick', async () => {
      await page.evaluate(() => { const m = document.querySelector('.mk-main'); if (m) m.scrollTop = 0; });
      const read = () => page.evaluate(() => { const tabs = document.querySelector('.mk-tabs'); return { x: tabs.style.getPropertyValue('--ink-x'), w: tabs.style.getPropertyValue('--ink-w'), ink: tabs.dataset.ink }; });
      const a = await read();
      const other = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.mk-tab[data-tab]')).filter((b) => !b.hidden && b.dataset.active !== 'true'); return t.length ? t[t.length - 1].dataset.tab : null; });
      await page.click('.mk-tab[data-tab="' + other + '"]');
      await page.waitForTimeout(700);
      const b = await read();
      await page.screenshot({ path: path.join(out, 'tabs.png'), clip: { x: 0, y: 0, width: 1440, height: 160 } });
      assert.equal(a.ink, 'on'); assert.equal(b.ink, 'on');
      assert.notEqual(a.x, b.x, 'ink moved: ' + a.x + ' to ' + b.x);
      assert.ok(parseFloat(b.w) > 20, 'ink has a width: ' + b.w);
    });
    await context.close();

    for (const mode of [{ name: 'reduced motion', options: { reducedMotion: true } }, { name: 'Hover animations off', options: { hoverOff: true } }]) {
      await step('no tilt, shine or sliding under ' + mode.name, async () => {
        const { context: c2, page: p2 } = await boot(browser, mode.options);
        const box = await tileBox(p2, 0);
        await p2.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3, { steps: 4 });
        await p2.waitForTimeout(450);
        const s = await artState(p2, 0);
        assert.equal(s.pointed, false, 'not pointed'); assert.equal(s.tiltY, '');
        assert.ok(s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)', 'art is not transformed: ' + s.transform);
        await c2.close();
      });
    }
  } catch (error) { failed = error; console.log('FATAL ' + (error.stack || error)); }
  await browser.close();
  evidence.failed = evidence.steps.filter((s) => !s.ok).length;
  if (evidence.pageErrors.length) { evidence.failed++; console.log('page errors:', JSON.stringify(evidence.pageErrors.slice(0, 3))); }
  fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(evidence.steps.length + ' steps, ' + evidence.failed + ' failed; screenshots in ' + path.relative(root, out));
  process.exit(failed || evidence.failed ? 1 : 0);
})();
