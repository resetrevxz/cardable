/* Isolated file:// failure, expiry, import, and ownership checks. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.shopPurchase && Cardable.setup && !Cardable.setup.loading);
  const result = await page.evaluate(() => {
    const C = Cardable, clone = value => JSON.parse(JSON.stringify(value));
    const snapshot = C.shopState.ensure().snapshot, offer = snapshot.offers[0];
    const expected = Object.assign({ dayKey: snapshot.dayKey }, offer);
    const first = C.shopPurchase.buyCard(expected);
    const before = clone(C.state.current), stored = localStorage.getItem(C.config.storage.key);
    C.currency.add(offer.price, 'dev');
    const exact = C.state.current.currency === offer.price;
    const affordableBefore = clone(C.state.current);
    C.state.beforeWrite = () => { throw new Error('simulated write failure'); };
    const failed = C.shopPurchase.buyCard(expected);
    C.state.beforeWrite = null;
    const failedAtomic = JSON.stringify(C.state.current) === JSON.stringify(affordableBefore) &&
      localStorage.getItem(C.config.storage.key) === C.state.encode(affordableBefore);
    const blocked = C.shopPurchase.buyCard(expected);
    C.state.save(); const recovered = C.state.lastWriteSucceeded;
    const purchased = C.shopPurchase.buyCard(expected);
    const twice = C.shopPurchase.buyCard(expected);
    const purchaseSave = clone(C.state.current), owned = purchaseSave.inventory.filter(i => i.instanceId === purchased.instance.instanceId).length;
    const exported = C.saveTools.exportText();
    C.saveTools.importSave(affordableBefore);
    const importedPrior = !C.state.current.inventory.some(i => i.instanceId === purchased.instance.instanceId) &&
      !C.state.current.shop.days.find(d => d.dayKey === snapshot.dayKey).offers[0].purchased;
    C.saveTools.restore();
    const restored = C.state.current.inventory.filter(i => i.instanceId === purchased.instance.instanceId).length === 1 &&
      C.state.current.shop.days.find(d => d.dayKey === snapshot.dayKey).offers[0].purchased;
    C.saveTools.importText(exported);
    const roundTrip = C.state.current.inventory.filter(i => i.instanceId === purchased.instance.instanceId).length === 1;
    const second = Object.assign({ dayKey: snapshot.dayKey }, snapshot.offers[1]);
    C.currency.add(second.price, 'dev');
    C.state.current.serialCounter = Number.MAX_SAFE_INTEGER;
    const full = C.shopPurchase.buyCard(second);
    C.state.current.serialCounter = purchaseSave.serialCounter;
    const savedNow = C.clock.now;
    const originalValidate = C.state.validate;
    C.state.validate = (original => function (value, strict) {
      const valid = original(value, strict); C.clock.now = () => savedNow() + 86400000; return valid;
    })(C.state.validate);
    const midnight = C.shopPurchase.buyCard(second);
    C.clock.now = savedNow; C.state.validate = originalValidate;
    return { first, exact, failed, failedAtomic, blocked, recovered, purchased, twice,
      owned, importedPrior, restored, roundTrip, full, midnight,
      beforeWallet: before.currency, storedInitially: !!stored,
      finalWallet: C.state.current.currency };
  });
  assert.equal(result.first.code, 'funds');
  assert.equal(result.exact, true);
  assert.equal(result.failed.code, 'write');
  assert.equal(result.failedAtomic, true);
  assert.equal(result.blocked.code, 'storage');
  assert.equal(result.recovered, true);
  assert.equal(result.purchased.ok, true, JSON.stringify(result.purchased));
  assert.equal(result.purchased.balance, 0);
  assert.equal(result.twice.code, 'purchased');
  assert.equal(result.owned, 1);
  assert.equal(result.importedPrior, true);
  assert.equal(result.restored, true);
  assert.equal(result.roundTrip, true);
  assert.equal(result.full.code, 'capacity');
  assert.equal(result.midnight.code, 'expired');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const afterReload = await page.evaluate(() => {
    const C = Cardable, snapshot = C.shopState.ensure().snapshot, offer = snapshot.offers[1];
    const previous = C.state.current.shop.days.find(d => d.dayKey === snapshot.dayKey).offers[0];
    const before = C.state.encode(C.state.current);
    const malformed = C.state.current.shop; C.state.current.shop = { version: 1, days: 'wrong' };
    const invalid = C.shopPurchase.buyCard(Object.assign({ dayKey: snapshot.dayKey }, offer));
    C.state.current.shop = malformed;
    const unchanged = before === C.state.encode(C.state.current);
    const fixture = JSON.parse(C.state.encode(C.state.current));
    fixture.serialCounter += 1;
    fixture.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null,
      cardId: offer.cardId, variantId: offer.variantId,
      serial: C.serial.format(fixture.playerCode, fixture.serialCounter), pulledAt: C.clock.now(), seen: true });
    C.state.commit(C.state.validate(fixture, true));
    const beforeCopies = C.state.current.inventory.filter(i => i.cardId === offer.cardId).length;
    const second = C.shopPurchase.buyCard(Object.assign({ dayKey: snapshot.dayKey }, offer));
    const copies = C.state.current.inventory.filter(i => i.cardId === offer.cardId);
    return { previous, invalid, unchanged, secondPurchased: offer.purchased, beforeCopies,
      second, copies: copies.length, unique: new Set(copies.map(i => i.instanceId)).size === copies.length &&
        new Set(copies.map(i => i.serial)).size === copies.length };
  });
  assert.equal(afterReload.previous.purchased, true);
  assert.equal(afterReload.secondPurchased, false);
  assert.equal(afterReload.invalid.code, 'invalid');
  assert.equal(afterReload.unchanged, true);
  assert.equal(afterReload.beforeCopies, 1);
  assert.equal(afterReload.second.ok, true, JSON.stringify(afterReload.second));
  assert.equal(afterReload.copies, 2);
  assert.equal(afterReload.unique, true);
  const natural = await page.evaluate(() => {
    const C = Cardable;
    const before = { wallet: C.state.current.currency, stock: C.state.current.packs.ready,
      opened: C.state.current.packs.openedCount, stats: C.state.current.stats.packsOpened };
    const opened = C.opening.miniAction();
    return { opened, before, after: { wallet: C.state.current.currency, stock: C.state.current.packs.ready,
      opened: C.state.current.packs.openedCount, stats: C.state.current.stats.packsOpened },
      source: C.state.current.pendingReveal?.source || 'natural' };
  });
  assert.equal(natural.opened, true);
  assert.equal(natural.after.stock, natural.before.stock - 1);
  assert.equal(natural.after.opened, natural.before.opened + 1);
  assert.equal(natural.after.stats, natural.before.stats + 1);
  assert.equal(natural.after.wallet, natural.before.wallet); // opening a pack pays nothing since Market Beta stage 3
  assert.equal(natural.source, 'natural');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, checks: ['insufficient', 'exact funds', 'write failure', 'recovery', 'repeat', 'import', 'restore', 'full counter', 'midnight', 'invalid save', 'duplicate copy', 'natural pack regression'] }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
