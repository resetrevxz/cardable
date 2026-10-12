/* Responsive presentation and touch hold, using local file:// Chromium emulation. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const errors = [];
  const large = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  large.on('pageerror', error => errors.push(error.message));
  await large.goto(url, { waitUntil: 'load' });
  await large.waitForFunction(() => Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading);
  await large.evaluate(() => { Cardable.currency.add(100000, 'dev'); Cardable.settings.set('rarityColor', 'mono'); Cardable.settings.set('quality', 'very-low'); });
  await large.locator('#shop-entry').click();
  await large.locator('.shop-offer .shop-hold').first().waitFor();
  await large.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-1920-mono-very-low.png') });
  const largeUi = await large.evaluate(() => ({ quality: Cardable.settings.get('quality'), mono: Cardable.settings.get('rarityColor'),
    width: document.querySelector('.shop-screen').getBoundingClientRect().width,
    viewport: innerWidth, holds: [...document.querySelectorAll('.shop-hold')].map(el => el.getAttribute('aria-description')) }));
  assert.equal(largeUi.quality, 'very-low'); assert.equal(largeUi.mono, 'mono');
  assert.ok(largeUi.width <= largeUi.viewport);
  assert.ok(largeUi.holds.every(value => /Releasing early cancels/.test(value)));
  const first = large.locator('.shop-offer .shop-hold').first();
  await first.scrollIntoViewIfNeeded();
  const box = await first.boundingBox();
  await large.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await large.mouse.down();
  await large.evaluate(() => document.querySelector('.shop-close').click());
  await large.waitForTimeout(1600); await large.mouse.up();
  assert.equal(await large.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  await large.locator('#shop-entry').click();
  await large.evaluate(() => { Cardable.state.beforeWrite = () => { throw new Error('simulated Shop write failure'); }; });
  const failing = large.locator('.shop-offer .shop-hold').first();
  await failing.scrollIntoViewIfNeeded();
  const failureBox = await failing.boundingBox();
  await large.mouse.move(failureBox.x + failureBox.width / 2, failureBox.y + failureBox.height / 2);
  await large.mouse.down(); await large.waitForTimeout(1600); await large.mouse.up();
  const failureUi = await large.evaluate(() => ({ wallet: Cardable.state.current.currency,
    receipts: Cardable.state.current.shop.receipts.length,
    note: document.querySelector('.shop-offer .shop-purchase-note').textContent }));
  assert.equal(failureUi.wallet, 100000);
  assert.equal(failureUi.receipts, 0);
  assert.match(failureUi.note, /Could not save/);
  await large.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-write-failure.png') });
  await large.evaluate(() => { Cardable.state.beforeWrite = null; Cardable.state.save(); });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(url, { waitUntil: 'load' });
  await mobile.waitForFunction(() => Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading);
  await mobile.evaluate(() => { Cardable.currency.add(100000, 'dev'); Cardable.settings.set('rarityColor', 'mono'); Cardable.settings.set('quality', 'very-low'); });
  await mobile.locator('#shop-entry').click();
  await mobile.locator('.shop-offer .shop-hold').first().waitFor();
  await mobile.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-390-mono-very-low.png') });
  const touch = mobile.locator('.shop-offer .shop-hold').first();
  await touch.scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-390-offers.png') });
  const bounds = await touch.boundingBox();
  const point = { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) };
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [Object.assign({ id: 1 }, point)] });
  await mobile.waitForTimeout(1600);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.locator('.shop-receipt').waitFor({ timeout: 10000 });
  assert.equal(await mobile.evaluate(() => Cardable.state.current.shop.receipts.length), 1);
  const receiptMode = await mobile.evaluate(() => ({ configured: Cardable.config.rarityColorMode,
    setting: Cardable.settings.get('rarityColor'), cards: [...document.querySelectorAll('.shop-receipt [data-color-mode]')].map(el => [el.className, el.getAttribute('data-color-mode')]).slice(0, 5),
    faceFilter: getComputedStyle(document.querySelector('.shop-receipt .card__face')).filter,
    cardFilter: getComputedStyle(document.querySelector('.shop-receipt .collectible-card')).filter }));
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-390-acquired.png') });
  await mobile.locator('.shop-back').click();
  const purchased = await mobile.evaluate(() => ({ state: document.querySelector('.shop-offer').dataset.state,
    note: document.querySelector('.shop-offer .shop-purchase-note').textContent,
    copied: document.querySelector('.shop-offer .shop-offer-variant').textContent,
    viewport: innerWidth, width: document.querySelector('.shop-screen').getBoundingClientRect().width }));
  assert.equal(purchased.state, 'purchased');
  assert.match(purchased.note, /Purchased/);
  assert.match(purchased.copied, /1 owned/);
  assert.ok(purchased.width <= purchased.viewport);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, large: largeUi.width, mobile: purchased.width, touchReceipt: 1, purchasedState: purchased.state, receiptMode }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
