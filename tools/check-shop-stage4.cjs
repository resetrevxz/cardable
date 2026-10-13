/* Final Shop integration checks against a local file:// Chromium session. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;

async function ready(page) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading);
}

(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await page.evaluate(() => { if (Cardable.tutorial.active) Cardable.tutorial.skipButton.click(); });
  await page.evaluate(() => { Cardable.currency.add(100000, 'dev'); Cardable.settings.set('quality', 'high'); });
  const beforeShopSubscribers = await page.evaluate(() => Cardable.fx.stats.subscribers);
  await page.locator('#shop-entry').focus();
  await page.keyboard.press('Enter');
  await page.locator('.shop-offer').first().waitFor();
  assert.equal(await page.evaluate(() => Cardable.fx.stats.subscribers), beforeShopSubscribers + 1);
  const sizes = [[360,800],[390,844],[768,1024],[1024,768],[1366,768],[1920,1080]];
  const layout = [];
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width, height });
    const item = await page.evaluate(() => {
      const sheet = document.querySelector('.shop-screen');
      const scroll = document.querySelector('.shop-scroll');
      const buttons = [...sheet.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
      return { sheetWidth: sheet.getBoundingClientRect().width,
        scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
        offers: sheet.querySelectorAll('.shop-offer').length,
        minButton: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
        smallButtons: buttons.filter(button => button.getBoundingClientRect().height < 43.9)
          .map(button => [button.textContent || button.getAttribute('aria-label'), button.className, button.getBoundingClientRect().height]) };
    });
    assert.ok(item.sheetWidth <= width + 1, `${width}: sheet overflow`);
    assert.ok(item.scrollWidth <= item.clientWidth + 1, `${width}: horizontal scroll`);
    assert.equal(item.offers, 4);
    assert.ok(item.minButton >= (width <= 390 ? 43.9 : 31.9), `${width}: small buttons ${JSON.stringify(item.smallButtons)}`);
    layout.push({ viewport: `${width}x${height}`, ...item });
    if (width === 390 || width === 1024 || width === 1366 || width === 1920)
      await page.screenshot({ path: path.join(root, 'artifacts', `shop-stage4-${width}x${height}.png`) });
  }

  const calm = await page.evaluate(() => {
    Cardable.settings.set('motion', 'on');
    const reduced = getComputedStyle(document.querySelector('.shop-feature')).animationName;
    Cardable.settings.set('motion', 'off');
    Cardable.settings.set('quality', 'very-low');
    const veryLow = getComputedStyle(document.querySelector('.shop-feature')).animationName;
    return { reduced, veryLow };
  });
  assert.equal(calm.reduced, 'none');
  assert.equal(calm.veryLow, 'none');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.shop-offer .shop-inspect').first().click();
  await page.locator('.shop-detail .shop-hold').waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('.shop-screen')), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.shop-screen').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'shop-entry');
  const afterFirstCloseSubscribers = await page.evaluate(() => Cardable.fx.stats.subscribers);
  // card.js installs one shared subscriber the first time any card view exists.
  assert.ok(afterFirstCloseSubscribers <= beforeShopSubscribers + 1);

  assert.equal(await page.evaluate(() => Cardable.commands.entries.has('shop')), true);
  await page.keyboard.press('Control+k');
  await page.locator('.dev-search').fill('Open Shop');
  await page.keyboard.press('Enter');
  await page.locator('.shop-screen').waitFor();
  await page.locator('.shop-close').click();
  assert.equal(await page.evaluate(() => Cardable.fx.stats.subscribers), afterFirstCloseSubscribers);

  await page.locator('#shop-entry').click();
  const hold = page.locator('.shop-offer .shop-hold').first();
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  await page.locator('.shop-close').click();
  assert.equal(await page.evaluate(() => Cardable.fx.stats.subscribers), afterFirstCloseSubscribers);

  // A normally loaded historic copy may outlive its catalog definition. Its
  // presence must not prevent an unrelated valid daily card purchase.
  const legacy = await page.evaluate(() => {
    const C = Cardable;
    const candidate = JSON.parse(C.state.encode(C.state.current));
    candidate.serialCounter += 1;
    candidate.inventory.push({ instanceId: C.randomId('card'), cardId: 'retired-historic-gpu',
      packId: 'standard', variantId: null, cardSkinId: null,
      serial: C.serial.format(candidate.playerCode, candidate.serialCounter),
      pulledAt: C.clock.now(), seen: true });
    if (!C.state.commit(candidate)) throw Error('Could not create legacy fixture');
    return { balance: candidate.currency, inventory: candidate.inventory.length };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const purchase = await page.evaluate(() => {
    const C = Cardable;
    const offer = C.shopState.ensure().snapshot.offers[0];
    return { result: C.shopPurchase.buyCard(Object.assign({ dayKey: C.shopState.dayKey() }, offer)),
      inventory: C.state.current.inventory.length, currency: C.state.current.currency };
  });
  assert.equal(purchase.result.ok, true);
  assert.equal(purchase.inventory, legacy.inventory + 1);
  assert.equal(purchase.currency, legacy.balance - purchase.result.price);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 1);

  const capped = await page.evaluate(() => {
    const C = Cardable;
    const titan = C.shopPurchase.buyTitan();
    if (!titan.ok) throw Error(titan.message);
    const candidate = JSON.parse(C.state.encode(C.state.current));
    let index = 0;
    while (candidate.shop.receipts.length < C.data.shop.retainedReceipts) {
      candidate.shop.receipts.push({ receiptId: `archived-${index}`, offerId: `archive:${index}`,
        kind: 'card', cardId: 'retired-historic-gpu', instanceId: `archived-instance-${index}`,
        at: C.clock.now(), price: 100 });
      index++;
    }
    if (!C.state.commit(C.state.validate(candidate, false))) throw Error('Could not seed capped receipts');
    const offer = C.shopState.ensure().snapshot.offers[1];
    const card = C.shopPurchase.buyCard(Object.assign({ dayKey: C.shopState.dayKey() }, offer));
    return { card, count: C.state.current.shop.receipts.length,
      entitlement: C.state.current.shop.entitlement.entitlementId,
      retained: C.state.current.shop.receipts.some(row => row.receiptId === titan.entitlementId) };
  });
  assert.equal(capped.card.ok, true);
  assert.equal(capped.count, 64);
  assert.equal(capped.retained, true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.entitlement?.entitlementId), capped.entitlement);

  const dpi = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const hi = await dpi.newPage();
  hi.on('pageerror', error => errors.push(error.message));
  await ready(hi);
  await hi.locator('#shop-entry').click();
  const hiWidth = await hi.evaluate(() => ({ width: document.querySelector('.shop-scroll').scrollWidth,
    client: document.querySelector('.shop-scroll').clientWidth }));
  assert.ok(hiWidth.width <= hiWidth.client + 1);
  await dpi.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, layout, calm, legacy, cappedReceipts: capped.count, highDpi: hiWidth, focusReturned: true, resizeCancelled: true, subscriberReturned: true }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
