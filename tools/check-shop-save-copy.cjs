/* Read an explicitly supplied backup; exercise only its isolated browser copy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const input = process.env.SHOP_DIAGNOSTIC_SAVE;
if (!input) throw Error('Set SHOP_DIAGNOSTIC_SAVE to the backup to inspect. The source file is read only.');
const bytes = fs.readFileSync(input), value = JSON.parse(bytes.toString('utf8'));
const original = value.save || value;
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const beforeHash = digest(bytes), root = path.resolve(__dirname, '..');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(raw => {
    // Only seed the fresh context once; subsequent reloads use the test purchase.
    if (!localStorage.getItem('cardable.save')) localStorage.setItem('cardable.save', raw);
  }, JSON.stringify(original));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'));
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const baseline = await page.evaluate(() => ({ count: Cardable.state.current.inventory.length,
    recovery: !!Cardable.state.recovery, saved: Cardable.state.lastWriteSucceeded,
    retired: Cardable.state.current.inventory.filter(item => !Cardable.card(item.cardId)).length }));
  assert.equal(baseline.count, original.inventory.length);
  assert.equal(baseline.recovery, false, 'Backup copy entered recovery'); assert.equal(baseline.saved, true);
  await page.evaluate(() => {
    if (Cardable.tutorial.active) Cardable.tutorial.skipButton.click();
    Cardable.settings.set('shopMotion', 'quiet'); Cardable.currency.add(100000, 'dev');
  });
  await page.locator('#shop-entry').click();
  const hold = page.locator('.shop-offer .shop-hold').first();
  await hold.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1650); await page.keyboard.up('Space');
  await page.locator('.shop-receipt').waitFor();
  const committed = await page.evaluate(() => ({ count: Cardable.state.current.inventory.length,
    currency: Cardable.state.current.currency, serial: Cardable.state.current.serialCounter,
    receipts: Cardable.state.current.shop.receipts.length,
    instance: Cardable.state.current.inventory.at(-1).instanceId }));
  assert.equal(committed.count, baseline.count + 1);
  await page.reload(); await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const restored = await page.evaluate(id => ({ count: Cardable.state.current.inventory.length,
    currency: Cardable.state.current.currency, serial: Cardable.state.current.serialCounter,
    receipts: Cardable.state.current.shop.receipts.length,
    retained: Cardable.state.current.inventory.some(item => item.instanceId === id),
    saved: Cardable.state.lastWriteSucceeded }), committed.instance);
  assert.equal(restored.count, committed.count); assert.equal(restored.currency, committed.currency);
  assert.equal(restored.serial, committed.serial); assert.equal(restored.receipts, committed.receipts);
  assert.equal(restored.retained, true); assert.equal(restored.saved, true);
  const identityRetained = await page.evaluate(prior => prior.every(copy => Cardable.state.current.inventory.some(item =>
    item.instanceId === copy.instanceId && item.cardId === copy.cardId && item.serial === copy.serial && item.variantId === copy.variantId)), original.inventory);
  assert.equal(identityRetained, true, 'Existing card identity changed in the test copy');
  assert.equal(digest(fs.readFileSync(input)), beforeHash, 'Source backup changed');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, originalUnchanged: true, copiedInventory: baseline.count,
    retiredCatalogCopies: baseline.retired, holdPurchaseSaved: true, reloadRetained: true }));
  await browser.close(); browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
