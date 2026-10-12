/* Shop showroom layout and non-purchasing interaction smoke. */
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const file = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const sizes = [
  [1920, 1080], [1366, 768], [1093, 768], [1024, 768], [768, 1024], [683, 768], [390, 844], [360, 800]
];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(file, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Cardable && Cardable.shopState && Cardable.setup && !Cardable.setup.loading, { timeout: 30000 });
  await page.evaluate(() => Cardable.currency.add(100000, 'dev'));
  await page.locator('#shop-entry').click();
  await page.locator('.shop-offer').first().waitFor();
  if (await page.evaluate(() => Cardable.packView.visible)) throw new Error('Hidden menu pack still animates');
  if (await page.locator('.shop-offer').count() !== 4) throw new Error('Expected four saved card offers');
  const initialCredits = await page.evaluate(() => Cardable.state.current.currency);
  const initialCards = await page.evaluate(() => Cardable.state.current.inventory.length);
  const initialPackPhase = await page.evaluate(() => Cardable.opening.phase);
  const captures = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('.shop-scroll');
      return { scroll: el.scrollWidth, client: el.clientWidth };
    });
    if (overflow.scroll > overflow.client + 2) throw new Error(`Shop overflows at ${width}x${height}: ${JSON.stringify(overflow)}`);
    if ([1366, 390, 360].includes(width)) {
      const target = path.join(root, 'artifacts', `shop-stage1-${width}x${height}.png`);
      await page.screenshot({ path: target });
      captures.push(target);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.shop-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const offersCapture = path.join(root, 'artifacts', 'shop-stage1-mobile-offers.png');
  await page.screenshot({ path: offersCapture }); captures.push(offersCapture);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('.shop-scroll').evaluate(el => { el.scrollTop = 0; });
  await page.locator('.shop-feature .shop-hold').click();
  if (await page.evaluate(() => Cardable.state.current.shop.receipts.length)) throw new Error('Single click bypassed hold');
  const hold = page.locator('.shop-feature .shop-hold');
  await hold.hover();
  await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up();
  if (await page.evaluate(() => Cardable.state.current.shop.receipts.length)) throw new Error('Early release bypassed hold');
  await hold.focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(200); await page.keyboard.up('Space');
  if (await page.evaluate(() => Cardable.state.current.shop.receipts.length)) throw new Error('Short keyboard hold bypassed hold');
  await page.keyboard.press('Space');
  if (await page.evaluate(() => Cardable.opening.phase) !== initialPackPhase) throw new Error('Pack input leaked through Shop');
  await page.locator('.shop-offer .shop-inspect').first().click();
  await page.locator('.shop-detail-card .collectible-card').waitFor();
  const detailCapture = path.join(root, 'artifacts', 'shop-stage1-inspect.png');
  await page.screenshot({ path: detailCapture }); captures.push(detailCapture);
  await page.locator('.shop-back').click();
  await page.evaluate(() => { Cardable.settings.set('rarityColor', 'mono'); Cardable.settings.set('quality', 'very-low'); });
  await page.waitForTimeout(200);
  const monoCapture = path.join(root, 'artifacts', 'shop-stage1-mono-very-low.png');
  await page.screenshot({ path: monoCapture }); captures.push(monoCapture);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (await page.locator('.shop-offer').count() !== 4) throw new Error('Offers lost in reduced motion');
  await page.keyboard.press('Escape');
  if (await page.evaluate(() => Cardable.shop.isOpen)) throw new Error('Escape did not close Shop');
  if (!(await page.evaluate(() => Cardable.packView.visible))) throw new Error('Menu pack visibility was not restored');
  if (await page.evaluate(() => document.activeElement.id) !== 'shop-entry') throw new Error('Shop did not return focus to entry');
  if (await page.evaluate(() => Cardable.state.current.currency) !== initialCredits ||
      await page.evaluate(() => Cardable.state.current.inventory.length) !== initialCards) throw new Error('Preview mutated save state');
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  const dev = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await dev.goto(file + '?dev=1', { waitUntil: 'load' });
  await dev.waitForFunction(() => window.Cardable && Cardable.shop && Cardable.setup && !Cardable.setup.loading, { timeout: 30000 });
  await dev.evaluate(() => Cardable.shop.open());
  for (const state of ['unaffordable', 'purchased', 'loading', 'error', 'expired', 'disabled', 'underfilled', 'empty', 'normal']) {
    const okay = await dev.evaluate(value => Cardable.shop.previewState(value), state);
    if (!okay) throw new Error('Could not render state ' + state);
    if (state === 'empty' && await dev.locator('.shop-offer').count() !== 0) throw new Error('Empty state retained offers');
    if (state === 'underfilled' && await dev.locator('.shop-offer').count() !== 2) throw new Error('Underfilled state count is wrong');
  }
  await dev.evaluate(() => Cardable.shop.close());
  await dev.close();
  console.log('PASS shop showroom runtime; four saved offers, eight viewports, interrupted holds, inspect/back, Escape/focus, preview states, no purchase');
  captures.forEach(file => console.log('CAPTURE ' + file));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
