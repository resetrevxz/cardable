/* Purchased Titan opening lifecycle in an isolated file:// Chromium profile. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const quality = process.env.SHOP_QUALITY || 'medium';
const reduced = process.env.SHOP_REDUCED === '1';
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading);
  const bought = await page.evaluate(({ quality, reduced }) => {
    const C = Cardable;
    C.settings.set('quality', quality); C.settings.set('motion', reduced ? 'on' : 'off');
    const save = JSON.parse(C.state.encode(C.state.current));
    save.packs.ready = 0; save.tutorial = { step: 'done', done: true };
    if (!C.state.commit(save)) throw new Error('Could not make empty-stock test fixture');
    C.currency.add(C.data.shop.featuredPrice * 2, 'dev');
    C.shopState.ensure();
    const before = { stock: C.state.current.packs.ready, opened: C.state.current.packs.openedCount,
      stats: C.state.current.stats.packsOpened, wallet: C.state.current.currency };
    const result = C.shopPurchase.buyTitan();
    return { result, before, after: { stock: C.state.current.packs.ready,
      opened: C.state.current.packs.openedCount, stats: C.state.current.stats.packsOpened,
      wallet: C.state.current.currency } };
  }, { quality, reduced });
  assert.equal(bought.result.ok, true, JSON.stringify(bought.result));
  assert.equal(bought.after.stock, 0);
  assert.equal(bought.after.opened, bought.before.opened);
  assert.equal(bought.after.stats, bought.before.stats);
  assert.equal(bought.after.wallet, bought.before.wallet - bought.result.price);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.entitlement?.entitlementId), bought.result.entitlementId);
  const action = page.locator('.pack-open-action');
  await page.waitForFunction(() => !document.querySelector('.pack-open-action').disabled);
  assert.match(await action.getAttribute('aria-label'), /purchased Titan/);
  await action.scrollIntoViewIfNeeded();
  let box = await action.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => Cardable.opening.phase === 'charging');
  await page.waitForTimeout(350);
  await page.reload({ waitUntil: 'load' }); // close during charge
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const interrupted = await page.evaluate(() => ({ entitlement: Cardable.state.current.shop.entitlement,
    pending: Cardable.state.current.pendingReveal, wallet: Cardable.state.current.currency,
    stock: Cardable.state.current.packs.ready }));
  assert.equal(interrupted.entitlement.entitlementId, bought.result.entitlementId);
  assert.equal(interrupted.pending, null);
  assert.equal(interrupted.wallet, bought.after.wallet);
  assert.equal(interrupted.stock, 0);
  await page.evaluate(() => { Cardable.state.beforeWrite = () => { throw new Error('simulated Titan reservation write failure'); }; });
  await page.waitForFunction(() => Cardable.opening.phase === 'idle' && !document.querySelector('.pack-open-action').disabled);
  box = await action.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => Cardable.opening.phase === 'charging');
  await page.waitForTimeout(3200); await page.mouse.up();
  const failedReservation = await page.evaluate(() => ({ entitlement: Cardable.state.current.shop.entitlement,
    pending: Cardable.state.current.pendingReveal, wallet: Cardable.state.current.currency,
    stock: Cardable.state.current.packs.ready }));
  assert.equal(failedReservation.entitlement.entitlementId, bought.result.entitlementId);
  assert.equal(failedReservation.pending, null);
  assert.equal(failedReservation.wallet, interrupted.wallet);
  assert.equal(failedReservation.stock, 0);
  await page.evaluate(() => { Cardable.state.beforeWrite = null; Cardable.state.save(); });
  await page.waitForFunction(() => !document.querySelector('.pack-open-action').disabled);
  await page.waitForFunction(() => Cardable.opening.phase === 'idle');
  box = await action.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => Cardable.opening.phase === 'charging');
  await page.waitForTimeout(3200);
  await page.mouse.up();
  await page.waitForFunction(() => Cardable.state.current.pendingReveal?.source === 'shop', { timeout: 10000 });
  const reserved = await page.evaluate(() => ({ pending: Cardable.state.current.pendingReveal,
    wallet: Cardable.state.current.currency, stock: Cardable.state.current.packs.ready,
    opened: Cardable.state.current.packs.openedCount, stats: Cardable.state.current.stats.packsOpened,
    entitlement: Cardable.state.current.shop.entitlement, phase: Cardable.opening.phase,
    packOpening: Cardable.pack('titan').opening }));
  assert.equal(reserved.packOpening, 'shroudDial');
  assert.equal(reserved.entitlement, null);
  assert.equal(reserved.pending.entitlementId, bought.result.entitlementId);
  assert.equal(reserved.pending.cards.length, 1);
  assert.equal(reserved.wallet, interrupted.wallet);
  assert.equal(reserved.stock, 0);
  assert.equal(reserved.opened, bought.before.opened);
  assert.equal(reserved.stats, bought.before.stats);
  await page.waitForFunction(() => Cardable.opening.phase === 'cutting' && !!document.querySelector('.shroud-dial'), { timeout: 20000 });
  assert.equal(await page.locator('.shroud-dial').getAttribute('aria-valuemax'), '3');
  await page.screenshot({ path: path.join(root, 'artifacts', 'shop-stage3-titan-vault-' + quality + (reduced ? '-reduced' : '') + '.png') });
  await page.locator('.shroud-dial').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  await page.waitForFunction(() => Cardable.opening.phase !== 'cutting', { timeout: 10000 });
  const revealPhase = await page.evaluate(() => Cardable.opening.phase);
  assert.notEqual(revealPhase, 'idle');
  await page.reload({ waitUntil: 'load' }); // after outcome, during reveal, before Keep
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const recovery = await page.evaluate(() => ({ pending: Cardable.state.current.pendingReveal,
    copies: Cardable.state.current.inventory.filter(i => i.instanceId === Cardable.state.current.pendingReveal?.cards[0]?.instanceId).length,
    entitlement: Cardable.state.current.shop.entitlement, wallet: Cardable.state.current.currency }));
  assert.deepEqual(recovery.pending, reserved.pending);
  assert.equal(recovery.copies, 0);
  assert.equal(recovery.entitlement, null);
  assert.equal(recovery.wallet, reserved.wallet);
  await page.waitForFunction(() => Cardable.opening.phase === 'revealed' && !document.querySelector('.opening-keep')?.disabled, null, { timeout: 30000 }).catch(() => {});
  const phaseOnRecovery = await page.evaluate(() => Cardable.opening.phase);
  if (phaseOnRecovery !== 'revealed') await page.evaluate(() => Cardable.opening.resumeMini());
  await page.waitForFunction(() => Cardable.opening.phase === 'revealed', { timeout: 30000 });
  await page.evaluate(() => Cardable.opening.keepCurrent());
  await page.waitForFunction(() => Cardable.state.current.pendingReveal === null, { timeout: 10000 });
  const kept = await page.evaluate(id => ({ count: Cardable.state.current.inventory.filter(i => i.instanceId === id).length,
    wallet: Cardable.state.current.currency, stock: Cardable.state.current.packs.ready,
    opened: Cardable.state.current.packs.openedCount }), reserved.pending.cards[0].instanceId);
  assert.equal(kept.count, 1);
  assert.equal(kept.wallet, reserved.wallet);
  assert.equal(kept.stock, 0);
  assert.equal(kept.opened, bought.before.opened);
  await page.reload({ waitUntil: 'load' }); // immediately after Keep
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const final = await page.evaluate(id => ({ count: Cardable.state.current.inventory.filter(i => i.instanceId === id).length,
    pending: Cardable.state.current.pendingReveal, entitlement: Cardable.state.current.shop.entitlement,
    wallet: Cardable.state.current.currency }), reserved.pending.cards[0].instanceId);
  assert.equal(final.count, 1);
  assert.equal(final.pending, null);
  assert.equal(final.entitlement, null);
  assert.equal(final.wallet, reserved.wallet);
  const second = await page.evaluate(() => ({ buy: Cardable.shopPurchase.buyTitan(), repeat: Cardable.shopPurchase.buyTitan() }));
  assert.equal(second.buy.ok, true);
  assert.equal(second.repeat.code, 'entitlement');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, quality, reduced, route: 'charge→shroudDial→reveal→Keep', card: reserved.pending.cards[0].cardId,
    reopenedAfterKeep: true, phaseOnRecovery }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
