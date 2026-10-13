/* Native object handoff, saved Shop preferences and recoverable write failures. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  await page.evaluate(() => {
    if (Cardable.tutorial.active) Cardable.tutorial.skipButton.click();
    Cardable.settings.applyPreset('high'); Cardable.currency.add(100000, 'dev');
    window.shopTransitions = [];
    window.nativeShopTransition = document.startViewTransition.bind(document);
    document.startViewTransition = update => {
      const transition = nativeShopTransition(update), record = { ready: 'pending', finished: false };
      shopTransitions.push(record);
      transition.ready.then(() => { record.ready = 'ready'; }, error => { record.ready = error.name; });
      transition.finished.finally(() => { record.finished = true; });
      return transition;
    };
  });
  await page.locator('#shop-entry').click();
  assert.equal(await page.locator('.shop-offer .shop-purchase-note:visible').count(), 0);
  assert.doesNotMatch(await page.locator('.shop-screen').innerText(), /COLLECTION ROOM|EXHIBIT|Saved daily quote|LOCAL · OFFLINE|Balance after purchase/);
  await page.locator('.shop-offer-art').first().click();
  await page.locator('.shop-detail-card').waitFor();
  await page.waitForFunction(() => shopTransitions.every(item => item.finished));
  assert.equal(await page.evaluate(() => shopTransitions.at(-1).ready), 'ready');
  assert.equal(await page.locator('[style*="shop-object"]').count(), 0);
  await page.locator('.shop-back').click();
  await page.locator('.shop-offer-art').first().waitFor();
  await page.waitForFunction(() => shopTransitions.every(item => item.finished));
  assert.ok(await page.evaluate(() => shopTransitions.every(item => item.ready === 'ready')));
  const before = await page.evaluate(() => ({ currency: Cardable.state.current.currency,
    shop: Cardable.state.current.shop, inventory: Cardable.state.current.inventory, serial: Cardable.state.current.serialCounter }));
  await page.locator('.shop-options-control').click();
  assert.ok(await page.locator('.shop-options-close').evaluate(el => el.getBoundingClientRect().height >= 44));
  assert.ok(await page.locator('.shop-option-select').evaluateAll(elements => elements.every(el => el.getBoundingClientRect().height >= 44)));
  await page.locator('.shop-options [data-setting="shopSort"]').selectOption('price-asc');
  const prices = await page.locator('.shop-offer').evaluateAll(tiles => tiles.map(tile => Number(tile.dataset.price)));
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  await page.locator('.shop-options [data-setting="shopLayout"]').selectOption('compact');
  assert.equal(await page.locator('.shop-screen').getAttribute('data-shop-layout'), 'compact');
  assert.ok(await page.locator('.shop-feature').evaluate(el => el.getBoundingClientRect().height < 350));
  await page.locator('.shop-options [data-setting="shopMotion"]').selectOption('quiet');
  assert.equal(await page.locator('.shop-screen').getAttribute('data-shop-motion'), 'static');
  await page.screenshot({ path: path.join(root, 'artifacts/shop-cinema-options.png') });
  await page.locator('.shop-options-close').click();
  assert.deepEqual(await page.evaluate(() => ({ currency: Cardable.state.current.currency,
    shop: Cardable.state.current.shop, inventory: Cardable.state.current.inventory, serial: Cardable.state.current.serialCounter })), before);
  const interrupted = page.locator('.shop-offer .shop-hold').first();
  await interrupted.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(500);
  await page.evaluate(() => Cardable.settings.set('shopSort', 'price-desc'));
  await page.waitForTimeout(1150); await page.keyboard.up('Space');
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 0, 'Sorting completed an active hold');
  await page.evaluate(() => Cardable.settings.set('shopSort', 'price-asc'));
  const transitions = await page.evaluate(() => shopTransitions.length);
  await page.locator('.shop-feature .shop-inspect').click();
  assert.equal(await page.evaluate(() => shopTransitions.length), transitions);
  await page.locator('.shop-back').click();
  await page.reload();
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  await page.locator('#shop-entry').click();
  assert.equal(await page.locator('.shop-screen').getAttribute('data-shop-layout'), 'compact');
  assert.equal(await page.locator('.shop-screen').getAttribute('data-shop-motion'), 'static');
  assert.equal(await page.evaluate(() => Cardable.settings.get('shopSort')), 'price-asc');
  const buy = page.locator('.shop-offer .shop-hold').first();
  await buy.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space');
  assert.equal(await page.locator('.shop-offer .shop-purchase-note:visible').count(), 0, 'Cancelled progress remained visible');
  await buy.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.keyboard.up('Space');
  assert.equal(await page.locator('.shop-offer .shop-purchase-note:visible').count(), 0, 'Window blur left stale progress');
  await page.evaluate(() => { Cardable.state.beforeWrite = () => { throw Error('Shop guard test'); }; });
  await buy.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1650); await page.keyboard.up('Space');
  assert.match(await page.locator('.shop-offer .shop-purchase-note').first().innerText(), /Could not save/);
  assert.equal(await page.locator('.shop-save-notice').isVisible(), true);
  assert.ok(await page.locator('.shop-save-notice button').evaluateAll(elements => elements.every(el => el.getBoundingClientRect().height >= 44)));
  assert.ok(await page.locator('.shop-save-retry').evaluate(el => {
    const bounds = el.getBoundingClientRect(), sheet = document.querySelector('.shop-screen').getBoundingClientRect();
    return bounds.top >= sheet.top && bounds.bottom <= sheet.bottom;
  }), 'Retry action was outside the visible Shop after failed hold');
  await page.screenshot({ path: path.join(root, 'artifacts/shop-cinema-save-error.png') });
  assert.equal(await page.evaluate(() => Cardable.state.current.currency), before.currency);
  await page.evaluate(() => { Cardable.state.beforeWrite = null; });
  await page.locator('.shop-save-retry').click();
  assert.equal(await page.locator('.shop-save-notice').isVisible(), false);
  assert.equal(await buy.isEnabled(), true);
  assert.equal(await page.locator('.shop-offer .shop-purchase-note:visible').count(), 0);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 0, 'Retry save repeated failed purchase');
  await page.evaluate(() => {
    window.shopStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === Cardable.config.storage.key) throw new DOMException('Test quota', 'QuotaExceededError');
      return shopStorageWrite.call(this, key, value);
    };
    Cardable.state.save();
  });
  assert.match(await page.locator('.shop-save-notice p').innerText(), /full/);
  await page.locator('.shop-save-retry').click();
  assert.equal(await buy.isDisabled(), true);
  assert.equal(await page.locator('.shop-save-notice').isVisible(), true);
  await page.evaluate(() => { Storage.prototype.setItem = shopStorageWrite; });
  await page.locator('.shop-save-retry').click();
  await page.evaluate(() => { Cardable.settings.set('shopMotion', 'cinematic'); });
  const price = prices[0];
  await buy.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1650); await page.keyboard.up('Space');
  await page.locator('.shop-receipt').waitFor();
  await page.waitForFunction(() => !document.getAnimations().some(animation => animation.effect &&
    /^::view-transition/.test(animation.effect.pseudoElement || '') && animation.playState === 'running'));
  assert.equal(await page.locator('[style*="shop-object"]').count(), 0);
  await page.screenshot({ path: path.join(root, 'artifacts/shop-cinema-acquired.png') });
  assert.equal(await page.evaluate(() => Cardable.state.current.currency), before.currency - price);
  assert.equal(await page.evaluate(() => Cardable.state.current.inventory.length), before.inventory.length + 1);
  const owned = await page.evaluate(() => Cardable.state.current.inventory.at(-1));
  await page.reload(); await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.ok(await page.evaluate(id => Cardable.state.current.inventory.some(item => item.instanceId === id), owned.instanceId));
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 1);
  await page.evaluate(() => {
    Cardable.settings.set('shopMotion', 'cinematic');
    document.startViewTransition = undefined;
  });
  await page.locator('#shop-entry').click();
  await page.locator('.shop-feature .shop-inspect').click();
  await page.locator('.shop-detail-pack').waitFor();
  assert.equal(await page.locator('[style*="shop-object"]').count(), 0, 'Fallback retained a snapshot name');
  await page.locator('.shop-back').click();
  await page.evaluate(() => {
    window.pendingShopCut = null;
    document.startViewTransition = update => {
      const transition = Object.create(null);
      transition.finished = new Promise(resolve => { transition.skipTransition = resolve; });
      pendingShopCut = () => { update(); transition.skipTransition(); };
      return transition;
    };
    document.querySelector('.shop-feature .shop-inspect').click();
    Cardable.shop.close(); pendingShopCut();
  });
  assert.equal(await page.locator('.shop-screen').count(), 0, 'Delayed transition reopened closed Shop');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, nativeHandoff: true, fallback: true, lateClose: true,
    savedPreferences: true, sortKeepsOffers: true, guardedRetry: true, quotaRetry: true,
    freshHoldAfterRetry: true, purchasedReload: owned.instanceId }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
