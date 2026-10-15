'use strict';
// Native Electron QA uses an isolated profile; it never reads a player's save.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'qa-output/ui-polish');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-ui-polish-'));
const evidence = { passed: [], errors: [], screenshots: [], layouts: [] };
let app, page;
async function shot(name) { const file = path.join(output, name + '.png');await page.waitForTimeout(260);const png=await app.evaluate(async({BrowserWindow},url)=>{const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);return (await win.webContents.capturePage()).toPNG().toString('base64');},page.url());fs.writeFileSync(file,Buffer.from(png,'base64'));evidence.screenshots.push(file); }
async function size(w, h) { await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value.w, value.h), { w, h }); await page.waitForTimeout(300); }
async function idle() { await page.evaluate(() => Cardable.inventory.request(false)); await page.waitForFunction(() => !Cardable.inventory.active); }
async function fixture() {
  await page.evaluate(() => {
    const C = Cardable, next = C.state.fresh(), cards = C.data.cards.filter(c => !c.retired && c.active !== false);
    next.tutorial.done = true; next.tutorial.step = 'done'; next.currency = 100000;
    const chosen = C.data.rarities.map(r => cards.find(c => c.rarity === r.id)).filter(Boolean).concat(cards.slice(0, 25));
    next.inventory = chosen.map((c, i) => ({ instanceId: 'polish-' + i, cardId: c.id, variantId: i % 3 === 0 ? C.data.variants[0].id : null, cardSkinId: null, packId: 'standard', serial: C.serial.format(next.playerCode, i + 1), pulledAt: Date.now() - i, seen: true }));
    next.inventory.push(Object.assign({}, next.inventory[0], { instanceId: 'polish-copy', serial: C.serial.format(next.playerCode, next.inventory.length + 1) }));
    next.serialCounter = next.inventory.length;
    if (!C.state.commit(C.state.validate(next, true))) throw Error('Fixture save failed');
    C.events.emit('save:replaced', C.state.current); C.settings.set('motion', 'off'); C.settings.set('cutscenes', 'off'); C.settings.set('fpsLimit', '60');
  });
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    app = await _electron.launch({ executablePath: process.env.CARDABLE_QA_BINARY || path.join(root, 'node_modules/electron/dist/electron.exe'), args: [root, '--qa-test', '--test-user-data=' + profile], timeout: 30000 });
    page = await app.firstWindow();page.setDefaultTimeout(10000); page.on('pageerror', e => evidence.errors.push(e.stack));
    page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
    await page.waitForFunction(() => window.Cardable && Cardable.preferences?.initialized && !Cardable.setup?.loading);
    await page.evaluate(() => { const C = Cardable; C.tutorial.skipButton.click(); if (C.friendly?.active) C.friendly.close(); if (C.dev) C.dev.show(false); });
    if(await page.getByRole('button',{name:'Start collecting',exact:true}).count())await page.getByRole('button',{name:'Start collecting',exact:true}).click();
    await page.evaluate(()=>Cardable.settings.set('interfaceSize','100'));
    await size(1280, 720);
    assert.deepEqual(await page.evaluate(() => [undefined, null, 'bad', true, false].map(v => Cardable.inventoryModel.normalize({ showUnowned: v }).showUnowned)), [false, false, false, true, false]);
    assert.equal(await page.locator('#currency-counter').count(), 0);
    await shot('main');
    await page.evaluate(() => Cardable.inventory.request('expanded'));
    await page.waitForFunction(() => Cardable.inventory.active);
    await page.getByRole('button', { name: 'Inventory controls', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Show unowned', exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('searchbox', { name: 'Search cards', exact: true }).count(), 1);
    await shot('inventory-controls-empty');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Open a pack', exact: true }).click(); await page.waitForFunction(() => !Cardable.inventory.active);
    assert(await page.evaluate(() => document.activeElement === Cardable.packView.openButton));
    evidence.passed.push('Fresh Show unowned default and normalization; combined controls; empty inventory CTA focuses the existing pack action without opening or spending.');

    const lifecycle = await page.evaluate(async () => {
      const C = Cardable, a = C.ui.present(C.ui.create('dialog', { label: 'Parent', children: [C.ui.create('button', { label: 'Parent action' })] }));
      const b = C.ui.present(C.ui.create('dialog', { label: 'Child', children: [C.ui.create('button', { label: 'Child action' })] }));
      const p = b.close(), same = p === b.close(), blocked = a.surface.closest('.cb-scrim').inert;
      await p; const restored = !a.surface.closest('.cb-scrim').inert; await a.close(); return { same, blocked, restored, state: a.state, modal: C.ui.modal };
    });
    assert.deepEqual(lifecycle, { same: true, blocked: true, restored: true, state: 'closed', modal: 0 });
    evidence.passed.push('Idempotent nested surface close promises and background blocking/restoration.');
    await fixture();
    await page.evaluate(() => Cardable.inventory.request('expanded')); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
    await page.getByRole('button', { name: 'Inventory controls', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('brand:NVIDIA'); await page.waitForTimeout(250);
    assert(await page.evaluate(() => Cardable.inventory.entries.length > 0 && Cardable.inventory.entries.every(e => e.card.brand.toLowerCase() === 'nvidia')));
    await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('');
    await page.getByRole('radio', { name: 'Grid', exact: true }).click(); await page.waitForTimeout(350);
    assert.equal(await page.getByRole('searchbox', { name: 'Search cards', exact: true }).count(), 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); await shot('inventory-grid');
    const previews = await page.evaluate(() => Array.from(document.querySelectorAll('.inventory-grid [data-thumbnail="true"]')).map(el => ({ rarity: el.dataset.rarity, text: !!el.querySelector('.card__text'), artOnly: el.dataset.presentation === 'art-only', back: !!el.querySelector('.card__face--back') })));
    assert(previews.length > 0 && previews.every(p => p.text && !p.artOnly && !p.back));
    const stable = await page.evaluate(() => { const tiles=Array.from(Cardable.inventory.rendered.values()).slice(0,4),views=tiles.map(t=>t.view);tiles.forEach(t=>t.el.focus());return tiles.every((t,i)=>t.view===views[i]&&t.view.thumbnail); });
    assert(stable);
    evidence.passed.push('Search stays in the combined panel; complete card fronts remain static and preserve identity through keyboard focus.');
    for (const [w, h] of [[1280,720],[1920,1080]]) {
      await size(w, h); await shot('grid-' + w);
      const layout = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, rendered: Cardable.inventory.rendered.size }));
      evidence.layouts.push(layout); assert.equal(layout.overflow, false);
    }
    await size(1280, 720);
    for (const quality of ['very-low','low','medium','high']) { await page.evaluate(q => Cardable.settings.applyPreset(q), quality); await page.waitForTimeout(150); }
    await page.evaluate(() => Cardable.settings.set('rarityColor', 'mono')); await shot('inventory-monochrome');
    await page.evaluate(() => Cardable.settings.set('rarityColor', 'color'));
    await idle();
    await page.evaluate(() => Cardable.preferences.show()); await page.waitForTimeout(400); await shot('settings');
    await page.evaluate(() => Cardable.preferences.close()); await page.waitForFunction(() => !Cardable.preferences.open);
    await page.evaluate(() => Cardable.shop.open()); await page.locator('.shop-offer').first().waitFor(); await shot('shop');
    assert.equal(await page.locator('.shop-wallet').count(), 1);
    assert.equal(await page.locator('.shop-wallet-trigger strong').count(), 1);
    await page.evaluate(() => Cardable.shop.close()); await page.waitForFunction(() => !Cardable.shop.isOpen);
    evidence.passed.push('Responsive grid, graphics presets, monochrome, Settings and Shop wallet rendered.');

    await page.evaluate(() => { const C=Cardable, i=C.state.current.inventory[0]; C.inventory.request('expanded'); C.events.emit('inventory:showCard',{cardId:i.cardId,instanceId:i.instanceId}); });
    await page.waitForFunction(() => Cardable.detail.phase === 'detail');
    await page.evaluate(() => Cardable.studio.enter()); await page.waitForFunction(() => document.querySelector('.studio-shell.is-ready'), null, { timeout: 20000 });
    await shot('studio'); await page.getByRole('button', { name: 'Advanced', exact: true }).click(); await page.getByRole('button', { name: 'Director', exact: true }).click(); assert.equal(await page.locator('.studio-tools [data-page=Animate]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.studio-tools [aria-pressed=true]').count(),1);await shot('director');
    assert.equal(await page.getByRole('button', { name: 'Zoom timeline out', exact: true }).count(), 1);
    await page.evaluate(() => Cardable.studio.exit()); await page.waitForFunction(() => !Cardable.studio.active);
    evidence.passed.push('Simple/Advanced Studio and Director icon transport rendered; exit returns to detail.');
    assert.deepEqual(evidence.errors, []);
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) { evidence.failure = error.stack; console.error(error); if(page)await shot('failure').catch(()=>{}); process.exitCode = 1; }
  finally { fs.writeFileSync(path.join(output,'report.json'), JSON.stringify(evidence,null,2)); if(app)await app.close(); }
})();
