/* Electron Shop purchase, native mirror rejection/retry and backup recovery. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '..'), qa = path.resolve(root, 'qa-output');
fs.mkdirSync(qa, { recursive: true });
const profile = fs.mkdtempSync(path.join(qa, 'shop-native-'));
const saves = path.resolve(profile, 'saves'), blocked = path.resolve(profile, 'retained-saves');
assert.ok(profile.startsWith(qa + path.sep));
assert.ok(saves.startsWith(profile + path.sep) && blocked.startsWith(profile + path.sep));
let app, page;
const errors = [];
async function launch() {
  const packaged = !!process.env.CARDABLE_QA_BINARY;
  app = await electron.launch({ executablePath: process.env.CARDABLE_QA_BINARY || path.join(root, 'node_modules/electron/dist/electron.exe'),
    args: packaged ? ['--qa-test','--test-user-data=' + profile] : [root, '--dev', '--diagnostic-user-data=' + profile] });
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), profile, 'Native test profile was ignored');
  page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  const start = page.getByRole('button', { name:'Start collecting', exact:true });
  if (await start.isVisible()) await start.click();
}
(async () => {
  await launch();
  const before = await page.evaluate(async () => {
    if (Cardable.tutorial.active) Cardable.tutorial.skipButton.click();
    Cardable.settings.applyPreset('very-low'); Cardable.settings.set('shopMotion', 'quiet');
    Cardable.currency.add(100000, 'dev'); Cardable.shopState.ensure();
    const result = await Cardable.desktop.retryBackup();
    return { saved: result.success, currency: Cardable.state.current.currency, count: Cardable.state.current.inventory.length };
  });
  assert.equal(before.saved, true);
  await page.locator('#shop-entry').click();
  const price = await page.evaluate(() => Cardable.shopState.ensure().snapshot.offers[0].price);
  const buy = page.locator('.shop-offer .shop-hold').first();
  await buy.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1650); await page.keyboard.up('Space');
  await page.locator('.shop-receipt').waitFor();
  const purchase = await page.evaluate(async () => {
    const saved = await Cardable.desktop.retryBackup();
    return { saved: saved.success, currency: Cardable.state.current.currency,
      card: Cardable.state.current.inventory.at(-1).instanceId, serial: Cardable.state.current.serialCounter,
      receipts: Cardable.state.current.shop.receipts.length };
  });
  assert.equal(purchase.saved, true); assert.equal(purchase.currency, before.currency - price);
  assert.equal(purchase.receipts, 1);
  const wanted = await page.evaluate(async cardId => {
    const C=Cardable,copy=C.state.current.inventory.find(item=>item.instanceId===cardId);
    const id=C.inventoryModel.create('Native targets',{kind:'wishlist',cardId:copy.cardId,durable:true,activate:false});
    if(!id)throw Error('Native wishlist could not be saved');
    const backup=await C.desktop.retryBackup();return {id,saved:backup.success};
  },purchase.card);
  assert.equal(wanted.saved,true);
  // Both paths are verified under the test profile above. No player directory is moved.
  fs.renameSync(saves, blocked); fs.writeFileSync(saves, 'temporary native-write rejection');
  const rejected = await page.evaluate(() => Cardable.desktop.retryBackup());
  assert.equal(rejected.success, false);
  await page.locator('.shop-save-notice').waitFor();
  assert.match(await page.locator('.shop-save-notice p').innerText(), /Local save is intact/);
  assert.equal(await page.locator('.shop-save-retry').textContent(), 'Retry backup');
  assert.equal(await page.evaluate(() => Cardable.state.lastWriteSucceeded), true);
  await page.locator('.shop-save-retry').click();
  await page.waitForFunction(() => !document.querySelector('.shop-save-retry').disabled);
  assert.equal(await page.locator('.shop-save-notice').isVisible(), true);
  await page.locator('.shop-screen').screenshot({ path: path.join(root, 'artifacts/shop-native-backup-error.png') });
  fs.unlinkSync(saves); fs.renameSync(blocked, saves);
  await page.locator('.shop-save-retry').click();
  await page.waitForFunction(() => !Cardable.desktop.storageIssue && document.querySelector('.shop-save-notice').hidden);
  assert.equal(await page.evaluate(() => Cardable.state.current.shop.receipts.length), 1);
  assert.equal(await page.evaluate(() => Cardable.state.current.currency), purchase.currency);
  const mirror = JSON.parse(fs.readFileSync(path.join(saves, 'cardable-desktop-save.json'), 'utf8'));
  assert.ok(mirror.inventory.some(item => item.instanceId === purchase.card));
  assert.equal(mirror.currency, purchase.currency);
  await app.close(); app = null;
  await launch();
  assert.equal(await page.evaluate(id => Cardable.state.current.inventory.some(item => item.instanceId === id), purchase.card), true);
  assert.equal(await page.evaluate(() => Cardable.state.current.currency), purchase.currency);
  // Clear this test renderer's primary store, then recover the native mirror on launch.
  await page.evaluate(() => localStorage.removeItem(Cardable.config.storage.key));
  // Shut down without a renderer rewrite, otherwise graceful close repopulates the primary store.
  const exited = app.waitForEvent('close');
  app.evaluate(({ app }) => app.exit(0)).catch(function () {});
  await exited; app = null;
  await launch();
  const recovered = await page.evaluate(id => ({ copy: Cardable.state.current.inventory.some(item => item.instanceId === id),
    currency: Cardable.state.current.currency, serial: Cardable.state.current.serialCounter,
    receipts: Cardable.state.current.shop.receipts.length, saved: Cardable.state.lastWriteSucceeded }), purchase.card);
  assert.deepEqual(recovered, { copy:true, currency:purchase.currency, serial:purchase.serial, receipts:1, saved:true });
  assert.equal(await page.evaluate(id=>Cardable.inventoryModel.current.collections.some(item=>item.id===id&&item.kind==='wishlist'),wanted.id),true);
  await page.locator('#shop-entry').click(); await page.locator('.shop-options-control').click();
  await page.locator('.shop-save-status-open').click(); await page.locator('.shop-save-check').click();
  await page.waitForFunction(expected=>{
    const fields=[...document.querySelectorAll('.shop-save-facts > div')];
    return fields.some(row=>row.querySelector('dt').textContent==='Data location'&&row.querySelector('dd').textContent===expected);
  },profile);
  const status=await page.locator('.shop-save-facts').innerText();
  assert.match(status,/Present · 1 card/);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const windowHandle=await app.browserWindow(page);
  const nativeCapture=await windowHandle.evaluate(async window=>(await window.webContents.capturePage()).toPNG().toString('base64'));
  fs.writeFileSync(path.join(root,'artifacts/shop-save-status-native.png'),Buffer.from(nativeCapture,'base64'));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass:true, nativePurchase:true, mirrorRejected:true, retryRecovered:true,
    primaryStayedValid:true, noPurchaseReplay:true, restart:true, mirrorRestored:true, packaged:!!process.env.CARDABLE_QA_BINARY }));
  await app.close(); app = null;
})().catch(async error => {
  console.error(error); process.exitCode = 1;
  if (fs.existsSync(blocked)) { if (fs.existsSync(saves) && fs.statSync(saves).isFile()) fs.unlinkSync(saves); fs.renameSync(blocked, saves); }
  if (app) await app.close();
});
