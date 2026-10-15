/* Real browser-process restart, retained receipts and exact-copy inventory links. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
fs.mkdirSync(path.join(root, 'qa-output'), { recursive: true });
const profile = fs.mkdtempSync(path.join(root, 'qa-output/shop-restart-'));
let context, page;
const errors = [], requests = [];
async function launch() {
  context = await chromium.launchPersistentContext(profile, { headless: true,
    executablePath: process.env.SHOP_BROWSER_PATH || undefined, viewport: { width: 1366, height: 768 } });
  page = context.pages()[0];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(url);
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
}
async function business() {
  return page.evaluate(() => ({ player: Cardable.state.current.playerCode, currency: Cardable.state.current.currency,
    serial: Cardable.state.current.serialCounter, shop: JSON.parse(Cardable.state.encode(Cardable.state.current.shop)),
    inventory: Cardable.state.current.inventory.map(item => [item.instanceId, item.cardId, item.serial, item.variantId]),
    preferences: ['shopLayout','shopMotion','shopSort'].map(key => Cardable.settings.getRequested(key)) }));
}
(async () => {
  await launch();
  const seed = await page.evaluate(() => {
    const C = Cardable, realNow = C.clock.now, now = realNow();
    if (C.tutorial.active) C.tutorial.skipButton.click();
    C.settings.applyPreset('very-low'); C.settings.set('shopLayout', 'compact');
    C.settings.set('shopMotion', 'quiet'); C.settings.set('shopSort', 'price-desc');
    C.currency.add(1000000, 'dev');
    const purchases = [];
    try {
      for (let ago = 2; ago >= 0; ago--) {
        C.clock.now = () => now - ago * 86400000;
        const day = C.shopState.ensure().snapshot;
        for (const offer of day.offers) {
          const result = C.shopPurchase.buyCard({ ...offer, dayKey: day.dayKey });
          if (!result.ok) throw Error(result.message); purchases.push(result);
        }
      }
    } finally { C.clock.now = realNow; }
    const target = purchases[0].instance, candidate = JSON.parse(C.state.encode(C.state.current));
    const older = { ...target, instanceId: C.randomId('card'), packId: 'standard', pulledAt: target.pulledAt - 1000 };
    delete older.source; delete older.shopOfferId;
    candidate.serialCounter++; older.serial = C.serial.format(candidate.playerCode, candidate.serialCounter);
    candidate.inventory.push(older);
    if (!C.state.commit(C.state.validate(candidate, false))) throw Error('Duplicate-copy fixture failed');
    const titan = C.shopPurchase.buyTitan(); if (!titan.ok) throw Error(titan.message);
    return { target, receipt: purchases[0].receiptId, titan: titan.entitlementId };
  });
  const before = await business();
  await page.locator('#shop-entry').click(); await page.locator('.shop-history-control').click();
  assert.equal(await page.locator('.shop-history-row').count(), 8);
  assert.equal(await page.locator('.shop-history-total').textContent(), '13 purchases');
  await page.screenshot({ path: path.join(root, 'artifacts/shop-history-desktop.png') });
  await page.locator('.shop-history-next').click();
  assert.equal(await page.locator('.shop-history-row').count(), 5);
  assert.equal(await page.locator('.shop-history-position').textContent(), '9–13 / 13');
  await page.locator('.shop-history-filter').selectOption('pack');
  assert.equal(await page.locator('.shop-history-row').count(), 1);
  assert.equal(await page.locator('.shop-history-state').textContent(), 'Ready to open');
  assert.equal(await page.locator('.shop-history-open').count(), 1);
  await page.locator('.shop-history-filter').selectOption('card');
  assert.equal(await page.locator('.shop-history-row').count(), 8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => Cardable.settings.set('rarityColor', 'mono'));
  await page.screenshot({ path: path.join(root, 'artifacts/shop-history-mobile-mono.png') });
  const geometry = await page.evaluate(() => {
    const scroll = document.querySelector('.shop-scroll');
    return { overflow: scroll.scrollWidth > scroll.clientWidth + 1,
      small: [...scroll.querySelectorAll('button,select,summary')].filter(el => el.getClientRects().length && !el.disabled && el.getBoundingClientRect().height < 43.9).map(el => el.className) };
  });
  assert.equal(geometry.overflow, false); assert.deepEqual(geometry.small, []);
  assert.deepEqual(await business(), before, 'History changed economy or preferences');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('.shop-history-next').click();
  const target = page.locator('.shop-history-row').filter({ has: page.locator(`.shop-history-details p`, { hasText: seed.receipt }) });
  await target.locator('summary').click();
  assert.match(await target.innerText(), new RegExp(seed.target.serial));
  await target.locator('.shop-history-view').click();
  await page.waitForFunction(() => Cardable.detail.phase === 'detail');
  assert.equal(await page.evaluate(() => Cardable.detail.view.instance.instanceId), seed.target.instanceId);
  assert.ok(await page.evaluate(() => Cardable.detail.serialIndex > 0), 'Exact-copy fixture did not exercise a later copy');
  await page.locator('.detail-close').click();
  await page.waitForFunction(() => Cardable.detail.phase === 'closed');
  await page.evaluate(() => Cardable.inventory.request(false));
  await page.waitForFunction(() => !Cardable.inventory.active);
  await page.evaluate(cardId => Cardable.events.notify('inventory:showCard', { cardId, instanceId: 'missing-shop-copy' }), seed.target.cardId);
  assert.equal(await page.evaluate(() => Cardable.detail.phase), 'closed');
  assert.equal(await page.evaluate(() => Cardable.inventory.active), false);
  await page.locator('#shop-entry').click(); await page.locator('.shop-history-control').click();
  await page.locator('.shop-history-filter').selectOption('pack');
  await page.locator('.shop-history-open').click();
  assert.equal(await page.locator('.shop-screen').count(), 0);
  assert.match(await page.locator('.pack-open-action').getAttribute('aria-label'), /purchased Titan/);
  assert.equal(await page.evaluate(() => Cardable.opening.miniAction()), true);
  await page.locator('#shop-entry').click(); await page.locator('.shop-history-control').click();
  await page.locator('.shop-history-filter').selectOption('pack');
  assert.equal(await page.locator('.shop-history-state').textContent(), 'Opening in progress');
  assert.equal(await page.locator('.shop-history-open').count(), 0);
  await page.locator('.shop-close').click();
  assert.equal(await page.evaluate(() => Cardable.opening.miniAction()), true);
  await page.locator('#shop-entry').click(); await page.locator('.shop-history-control').click();
  await page.locator('.shop-history-filter').selectOption('pack');
  assert.equal(await page.locator('.shop-history-state').textContent(), 'In inventory');
  assert.equal(await page.locator('.shop-history-view').count(), 1);
  const walletAfterPack = await page.evaluate(() => Cardable.state.current.currency);
  assert.equal(walletAfterPack, before.currency, 'Purchased Titan opening paid Credits');
  await page.locator('.shop-close').click();
  const saved = await business();
  await context.close(); context = null;
  await launch();
  assert.deepEqual(await business(), saved, 'Browser restart lost Shop state');
  assert.equal(await page.evaluate(() => Cardable.state.lastWriteSucceeded), true);
  await page.locator('#shop-entry').click(); await page.locator('.shop-history-control').click();
  assert.equal(await page.locator('.shop-history-total').textContent(), '13 purchases');
  await page.locator('.shop-history-filter').selectOption('card');
  const deleted = await page.evaluate(() => {
    const copy = Cardable.state.current.inventory.find(item => item.source === 'shop');
    const card = Cardable.card(copy.cardId);
    return { id: copy.instanceId, receipt: copy.shopOfferId, removed: Cardable.cardDeletion.remove(copy.instanceId, card.name, 3000) };
  });
  assert.equal(deleted.removed, true);
  await page.locator('.shop-history-next').click();
  const removedRow = page.locator('.shop-history-row').filter({ has: page.locator('.shop-history-details p', { hasText: deleted.receipt }) });
  assert.equal(await removedRow.locator('.shop-history-state').textContent(), 'Not in inventory');
  assert.equal(await removedRow.locator('.shop-history-view').count(), 0);
  const importResult = await page.evaluate(() => {
    const exported = Cardable.saveTools.exportText(), before = Cardable.state.current.shop.receipts.length;
    Cardable.saveTools.importText(exported);
    return { before, after: Cardable.state.current.shop.receipts.length, saved: Cardable.state.lastWriteSucceeded };
  });
  assert.deepEqual(importResult, { before: 13, after: 13, saved: true });
  assert.equal(await page.locator('.shop-history').isVisible(), true);
  const subscribers = await page.evaluate(() => Cardable.fx.stats.subscribers);
  for (let index = 0; index < 5; index++) {
    await page.locator('.shop-back').click(); await page.locator('.shop-history-control').click();
  }
  assert.equal(await page.evaluate(() => Cardable.fx.stats.subscribers), subscribers);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  console.log(JSON.stringify({ pass: true, receipts: 13, pages: 2, filters: true, exactCopy: seed.target.serial,
    titanStates: ['ready','opening','owned'], deletedCopy: true, exportImport: true,
    browserProcessRestart: true, preferencesRetained: true, geometry, stableSubscribers: true }));
  await context.close(); context = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (context) await context.close(); });
