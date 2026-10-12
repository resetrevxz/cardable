/* Stage 3 purchase and ownership regression in an isolated file:// browser profile. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Cardable && Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading, { timeout: 30000 });
  const first = await page.evaluate(() => {
    const C = Cardable;
    C.currency.add(100000, 'dev');
    const day = C.shopState.ensure().snapshot;
    const offer = day.offers[0];
    const before = { currency: C.state.current.currency, inventory: C.state.current.inventory.length,
      serial: C.state.current.serialCounter, packs: JSON.stringify(C.state.current.packs),
      stats: C.state.current.stats.packsOpened };
    const expected = Object.assign({ dayKey: day.dayKey }, offer);
    const result = C.shopPurchase.buyCard(expected);
    const repeat = C.shopPurchase.buyCard(expected);
    const copy = C.state.current.inventory.find(i => i.instanceId === result.instance?.instanceId);
    const card = copy && C.card(copy.cardId);
    const tags = copy && C.cardTags.derive({ card, rarity: C.rarity(card.rarity), owned: true,
      variantId: copy.variantId, stackKey: C.stacks.of(copy), isNew: true }, copy, 'detail');
    return { before, result, repeat, copy, tags, after: { currency: C.state.current.currency,
      inventory: C.state.current.inventory.length, serial: C.state.current.serialCounter,
      packs: JSON.stringify(C.state.current.packs), stats: C.state.current.stats.packsOpened },
      purchased: C.state.current.shop.days.find(d => d.dayKey === day.dayKey).offers[0].purchased,
      receipts: C.state.current.shop.receipts.length };
  });
  assert.equal(first.result.ok, true, JSON.stringify(first.result));
  assert.equal(first.repeat.code, 'purchased');
  assert.equal(first.copy.source, 'shop');
  assert.equal(first.copy.packId, null);
  assert.ok(first.tags.some(tag => tag.kind === 'shop'));
  assert.ok(first.tags.some(tag => tag.kind === 'date' && tag.text.startsWith('Acquired')));
  assert.equal(first.after.currency, first.before.currency - first.result.price);
  assert.equal(first.after.inventory, first.before.inventory + 1);
  assert.equal(first.after.serial, first.before.serial + 1);
  assert.equal(first.after.packs, first.before.packs);
  assert.equal(first.after.stats, first.before.stats);
  assert.equal(first.purchased, true);
  assert.equal(first.receipts, 1);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const reloaded = await page.evaluate(id => ({ copy: Cardable.state.current.inventory.filter(i => i.instanceId === id).length,
    receipts: Cardable.state.current.shop.receipts.length,
    purchased: Cardable.state.current.shop.days.find(d => d.dayKey === Cardable.shopState.dayKey()).offers[0].purchased }), first.copy.instanceId);
  assert.deepEqual(reloaded, { copy: 1, receipts: 1, purchased: true });
  const packPurchase = await page.evaluate(() => {
    const C = Cardable, before = { currency: C.state.current.currency, packs: JSON.stringify(C.state.current.packs),
      stats: C.state.current.stats.packsOpened, inventory: C.state.current.inventory.length };
    const result = C.shopPurchase.buyTitan(), repeat = C.shopPurchase.buyTitan();
    return { before, result, repeat, after: { currency: C.state.current.currency,
      packs: JSON.stringify(C.state.current.packs), stats: C.state.current.stats.packsOpened,
      inventory: C.state.current.inventory.length }, queued: C.packs.upcoming(1)[0].id,
      entitlement: C.state.current.shop.entitlement };
  });
  assert.equal(packPurchase.result.ok, true, JSON.stringify(packPurchase.result));
  assert.equal(packPurchase.repeat.code, 'entitlement');
  assert.equal(packPurchase.queued, 'titan');
  assert.equal(packPurchase.after.currency, packPurchase.before.currency - packPurchase.result.price);
  assert.equal(packPurchase.after.packs, packPurchase.before.packs);
  assert.equal(packPurchase.after.stats, packPurchase.before.stats);
  assert.equal(packPurchase.after.inventory, packPurchase.before.inventory);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.entitlement?.entitlementId), packPurchase.result.entitlementId);
  const opened = await page.evaluate(() => {
    const C = Cardable, before = { currency: C.state.current.currency, packs: JSON.stringify(C.state.current.packs),
      stats: C.state.current.stats.packsOpened, serial: C.state.current.serialCounter };
    const didOpen = C.opening.openNow();
    const pending = C.state.current.pendingReveal;
    return { didOpen, before, after: { currency: C.state.current.currency, packs: JSON.stringify(C.state.current.packs),
      stats: C.state.current.stats.packsOpened, serial: C.state.current.serialCounter },
      pending, entitlement: C.state.current.shop.entitlement, openingId: C.opening.wrapper?.dataset.opening };
  });
  assert.equal(opened.didOpen, true);
  assert.equal(opened.pending.source, 'shop');
  assert.equal(opened.pending.entitlementId, packPurchase.result.entitlementId);
  assert.equal(opened.pending.packId, 'titan');
  assert.equal(opened.pending.cards.length, 1);
  assert.equal(opened.entitlement, null);
  assert.equal(opened.after.currency, opened.before.currency);
  assert.equal(opened.after.packs, opened.before.packs);
  assert.equal(opened.after.stats, opened.before.stats);
  assert.equal(opened.after.serial, opened.before.serial + 1);
  const titanPool = await page.evaluate(() => Cardable.pack('titan').pool.cardIds);
  assert.ok(titanPool.includes(opened.pending.cards[0].cardId));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const recovered = await page.evaluate(() => ({ pending: Cardable.state.current.pendingReveal,
    entitlement: Cardable.state.current.shop.entitlement,
    copies: Cardable.state.current.inventory.filter(i => i.instanceId === Cardable.state.current.pendingReveal?.cards[0]?.instanceId).length }));
  assert.deepEqual(recovered.pending, opened.pending);
  assert.equal(recovered.entitlement, null);
  assert.equal(recovered.copies, 0);
  const holdContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const held = await holdContext.newPage();
  held.on('pageerror', error => errors.push(error.message));
  held.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await held.goto(url, { waitUntil: 'load' });
  await held.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  await held.locator('#shop-entry').click();
  await held.locator('.shop-offer').first().waitFor();
  assert.equal(await held.locator('.shop-offer .shop-hold').first().isDisabled(), true,
    JSON.stringify(await held.evaluate(() => ({ wallet: Cardable.state.current.currency, price: Cardable.shopState.ensure().snapshot.offers[0].price,
      disabled: document.querySelector('.shop-offer .shop-hold').disabled, state: document.querySelector('.shop-offer').dataset.state }))));
  await held.evaluate(() => Cardable.currency.add(100000, 'dev'));
  await held.waitForFunction(() => !document.querySelector('.shop-offer .shop-hold').disabled);
  await held.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-desktop-ready.png') });
  let target = held.locator('.shop-offer .shop-hold').nth(1);
  await target.scrollIntoViewIfNeeded();
  let box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down(); await held.waitForTimeout(260); await held.mouse.up();
  await held.waitForTimeout(1600);
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down(); await held.mouse.move(box.x + box.width / 2, box.y - 18); await held.waitForTimeout(1600);
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await held.mouse.up();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down();
  await held.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
  await held.waitForTimeout(1600); await held.mouse.up();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down(); await held.evaluate(() => window.dispatchEvent(new Event('blur')));
  await held.waitForTimeout(1600); await held.mouse.up();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down();
  await held.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await held.waitForTimeout(1600); await held.mouse.up();
  await held.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  box = await target.boundingBox();
  await held.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await held.mouse.down();
  await held.locator('.shop-offer .shop-inspect').nth(0).evaluate(el => el.click());
  await held.waitForTimeout(1600); await held.mouse.up();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 0);
  await held.locator('.shop-back').click();
  target = held.locator('.shop-offer .shop-hold').nth(1);
  await target.focus();
  await held.keyboard.down('Space'); await held.keyboard.down('Space');
  await held.waitForTimeout(1650); await held.keyboard.up('Space');
  await held.locator('.shop-receipt').waitFor();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 1);
  await held.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-card-acquired.png') });
  await held.locator('.shop-back').click();
  const nextHold = held.locator('.shop-offer .shop-hold').first();
  await nextHold.focus();
  assert.equal(await nextHold.isDisabled(), false);
  await held.keyboard.down('Enter');
  await held.waitForTimeout(1650);
  await held.keyboard.up('Enter');
  await held.locator('.shop-receipt').waitFor();
  assert.equal(await held.evaluate(() => Cardable.state.current.shop.receipts.length), 2);
  await held.locator('.shop-receipt .shop-inspect').click();
  await held.locator('.inventory-depth-active').waitFor();
  await held.keyboard.press('Escape');
  console.log(JSON.stringify({ pass: true, firstCard: first.copy.cardId, receipt: first.result.receiptId,
    titanCard: opened.pending.cards[0].cardId, entitlement: packPurchase.result.entitlementId }));
  assert.deepEqual(errors, []);
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
