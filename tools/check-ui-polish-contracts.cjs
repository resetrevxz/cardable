'use strict';
// Disposable localhost browser context: never opens the installed player's save.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'qa-output/ui-polish-contracts');
const evidence = { checks: [], errors: [], gallery: [], persistence: [], lifecycle: [], screens: [] };
let page;
async function shot(name, options = {}) {
  const file = path.join(out, name + '.png'); await page.screenshot({ path: file, ...options }); evidence.screens.push(file);
}
async function ready() {
  await page.waitForFunction(() => window.Cardable?.preferences?.initialized);
  await page.evaluate(() => { Cardable.tutorial.skipButton.click(); if (Cardable.friendly?.active) Cardable.friendly.close(); });
  for (let i = 0; i < 5; i++) {
    const button = page.locator('.qol-friendly:visible').getByRole('button', { name: /^(Continue|Keep this collection|Done|Dismiss)$/ });
    if (!await button.count()) break; await button.click(); await page.waitForTimeout(200);
  }
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
}
async function closedInventory() {
  await page.evaluate(() => { Cardable.inventory.setPage(null); Cardable.inventory.request(false); });
  await page.waitForFunction(() => !Cardable.inventory.active);
  // Inventory close restores focus to its arrow, which legitimately prewarms cards.
  // Move both real pointer and focus away before measuring the idle baseline.
  await page.mouse.move(1, 1);
  await page.evaluate(() => { Cardable.packView.openButton.focus(); Cardable.events.emit('pointer:leave'); });
  await page.waitForTimeout(200);
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => evidence.errors.push(error.stack));
  try {
    await page.goto(local.url + '/index.html'); await ready();
    await page.evaluate(() => {
      // Limited designs remain renderable owned records after availability ends.
      const C = Cardable, next = C.state.fresh(), cards = C.data.cards;
      next.tutorial.done = true; next.tutorial.step = 'done'; next.currency = 100000;
      next.inventory = C.data.rarities.map(r => cards.find(c => c.rarity === r.id)).filter(Boolean).map((c, i) => ({ cardId: c.id, instanceId: 'contracts-' + i, packId: 'standard', serial: C.serial.format(next.playerCode, i + 1), pulledAt: Date.now() - i, seen: true, variantId: null, cardSkinId: null }));
      next.serialCounter = next.inventory.length;
      if (!C.state.commit(C.state.validate(next, true))) throw Error('Fixture commit failed');
      C.events.emit('save:replaced', C.state.current); C.settings.set('motion', 'off'); C.settings.set('cutscenes', 'off'); C.settings.set('interfaceSize', '100');
    });
    await closedInventory();
    const galleryBaseline = await page.evaluate(() => Cardable.cardView.stats.liveViews);
    for (const color of ['color', 'mono']) {
      evidence.gallery.push(...await page.evaluate(color => {
        const C = Cardable; C.settings.set('rarityColor', color);
        const host = document.createElement('section'); host.id = 'contracts-gallery'; host.style.cssText = 'position:absolute;inset:0 auto auto 0;width:1280px;z-index:99999;padding:32px;background:#181b20;display:grid;grid-template-columns:repeat(4,1fr);gap:28px;';
        document.body.appendChild(host); window.contractViews = [];
        const visible = el => {
          if (!el || !el.isConnected) return false;
          const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false;
          for (let e = el; e && e !== host.parentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; }
          return true;
        };
        const values = el => ['.card__name', '.card__vram', '.card__memory-type', '.card__specs'].map(selector => el.querySelector(selector)?.textContent.trim() || '');
        return C.data.rarities.map(rarity => {
          const actual = C.state.current.inventory.find(i => C.card(i.cardId).rarity === rarity.id), instance = actual || C.state.current.inventory[0];
          const card = actual ? C.card(instance.cardId) : { ...C.card(instance.cardId), rarity: rarity.id };
          const cell = document.createElement('div'), label = document.createElement('p'); label.textContent = rarity.name + ' · ' + color + (actual ? '' : ' · representative definition'); label.style.cssText = 'color:white;font:14px sans-serif;margin:0 0 15px'; cell.appendChild(label); host.appendChild(cell);
          const thumb = C.cardView.createThumbnail(card, instance, { owned: true, presentation: 'full' }); cell.appendChild(thumb.el); window.contractViews.push(thumb);
          const live = C.cardView.create(card, instance, { owned: true, independent: true, autoFocus: false }); cell.appendChild(live.el); window.contractViews.push(live);
          const a = values(thumb.el), b = values(live.el); live.destroy();
          return { color, rarity: rarity.id, representativeDefinition: !actual, values: a, liveValues: b, mode: thumb.mode, body: visible(thumb.el.querySelector('.card__body')), finish: visible(thumb.el.querySelector('.card__finish-render > *')), propRequired: !!rarity.propSpec || rarity.id === 'secret', prop: visible(thumb.el.querySelector('.card__prop-render > *')), text: visible(thumb.el.querySelector('.card__name')), liveMaterials: thumb.el.querySelectorAll('.card__material--live').length };
        });
      }, color));
      const rows = evidence.gallery.filter(r => r.color === color);
      for (const row of rows) {
        assert.deepEqual(row.values, row.liveValues, `${color}/${row.rarity} shared front values`);
        assert(row.values[0] && row.values[1] && row.values[2] && row.values[3], `${color}/${row.rarity} front values present`);
        assert(row.body && row.finish && row.text, `${color}/${row.rarity} visible static front`);
        if (row.propRequired) assert(row.prop, `${color}/${row.rarity} static prop visible`);
        assert.equal(row.mode, 'lite'); assert.equal(row.liveMaterials, 0);
      }
      await page.waitForFunction(() => Array.from(document.querySelectorAll('#contracts-gallery img')).every(img => img.complete && img.naturalWidth > 0));
      await page.locator('#contracts-gallery').screenshot({ path: path.join(out, 'thumbnail-gallery-' + color + '.png') }); evidence.screens.push(path.join(out, 'thumbnail-gallery-' + color + '.png'));
      await page.evaluate(() => { window.contractViews.forEach(v => v.destroy()); window.contractViews = []; document.getElementById('contracts-gallery').remove(); });
    }
    const special = await page.evaluate(() => {
      const C = Cardable, base = C.state.current.inventory[0], card = C.card(base.cardId), secret = C.data.cards.find(c => c.rarity === 'secret'), variant = C.data.variants[0].id;
      const art = C.cardView.createThumbnail(card, base, { owned: true, presentation: 'art-only' }); document.body.appendChild(art.el);
      const explicitArt = { presentation: art.el.dataset.presentation, text: !!art.el.querySelector('.card__text'), finish: !!art.el.querySelector('.card__finish'), art: !!art.el.querySelector('.card__art-window') }; art.destroy();
      const hidden = C.cardView.createThumbnail(secret, { ...base, cardId: secret.id, variantId: variant }, { owned: false, presentation: 'full' }); document.body.appendChild(hidden.el);
      const concealed = { name: !!hidden.el.querySelector('.card__name'), protectedName: hidden.el.textContent.includes(secret.name), art: !!hidden.el.querySelector('.card__art-window, img'), variant: hidden.el.dataset.variant, variantLayer: !!hidden.el.querySelector('.card__variant'), state: hidden.el.dataset.finishState, description: !!hidden.el.querySelector('.card__unknown') }; hidden.destroy();
      return { explicitArt, concealed, views: C.cardView.stats.liveViews };
    });
    assert.deepEqual(special.explicitArt, { presentation: 'art-only', text: false, finish: false, art: true });
    assert.deepEqual(special.concealed, { name: false, protectedName: false, art: false, variant: 'normal', variantLayer: false, state: 'unfound', description: true });
    assert.equal(special.views, galleryBaseline);
    evidence.checks.push('Every rarity in color and mono: mounted static body/finish and required props, complete front values equal live front, no live material; explicit art-only; concealed unowned Secret; every created view destroyed.');

    for (const value of [true, false]) {
      const saved = await page.evaluate(value => {
        const C = Cardable, schema = C.config.storage.schemaVersion; C.inventoryModel.update({ showUnowned: value });
        const text = C.saveTools.exportText(), parsed = C.saveTools.parse(text); C.saveTools.importText(text);
        return { schema, exportedSchema: JSON.parse(text).schemaVersion, parsed: parsed.save.inventoryUi.showUnowned, imported: C.state.current.inventoryUi.showUnowned, stored: JSON.parse(localStorage.getItem(C.config.storage.key)).inventoryUi.showUnowned };
      }, value);
      assert.equal(saved.parsed, value); assert.equal(saved.imported, value); assert.equal(saved.stored, value); assert.equal(saved.exportedSchema, saved.schema);
      await page.reload(); await ready();
      const reloaded = await page.evaluate(() => ({ showUnowned: Cardable.inventoryModel.current.showUnowned, schema: Cardable.state.current.schemaVersion }));
      assert.equal(reloaded.showUnowned, value); assert.equal(reloaded.schema, saved.schema); evidence.persistence.push({ value, ...saved, reloaded });
    }
    const defaults = await page.evaluate(() => {
      const C = Cardable;
      return ['missing', null, 'true', 1, {}, []].map(value => { const next = JSON.parse(C.state.encode(C.state.current)); if (value === 'missing') delete next.inventoryUi.showUnowned; else next.inventoryUi.showUnowned = value; return C.state.validate(next, true).inventoryUi.showUnowned; });
    });
    assert.deepEqual(defaults, [false, false, false, false, false, false]);
    evidence.checks.push('Explicit true and false survive exportText/parse/importText and real page reload; missing/invalid values normalize false; schema unchanged.');

    await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'grid', sortMode: 'catalog', groupMode: 'none' }); Cardable.inventory.request('expanded'); });
    await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
    await page.getByRole('button', { name: 'Inventory controls', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Inventory controls', exact: true });
    for (const title of ['Sort', 'Options', 'Filters']) await panel.locator('details').filter({ has: page.locator('summary', { hasText: new RegExp('^' + title + '$') }) }).locator('summary').click();
    await panel.getByLabel('Sort cards', { exact: true }).selectOption('name-desc');
    await panel.locator('[data-group-mode="rarity"]').click();
    assert.deepEqual(await page.evaluate(() => [Cardable.inventoryModel.current.sortMode, Cardable.inventoryModel.current.groupMode]), ['name-desc', 'rarity']);
    assert.equal(await panel.getByLabel('Sort cards', { exact: true }).inputValue(), 'name-desc');
    for (const group of await panel.locator('[data-group-mode]').all()) assert.equal(await group.getAttribute('aria-pressed'), String(await group.getAttribute('data-group-mode') === 'rarity'));
    await panel.getByLabel('Sort cards', { exact: true }).selectOption('custom');
    assert.equal(await page.evaluate(() => Cardable.inventoryModel.current.groupMode), 'none');
    assert.equal(await panel.locator('[data-group-mode="none"]').getAttribute('aria-pressed'), 'true');
    await panel.locator('[data-group-mode="generation"]').click();
    assert.deepEqual(await page.evaluate(() => [Cardable.inventoryModel.current.sortMode, Cardable.inventoryModel.current.groupMode]), ['catalog', 'generation']);
    await panel.getByRole('button', { name: 'Missing only', exact: true }).click();
    assert(await panel.getByRole('checkbox', { name: 'Show unowned', exact: true }).isChecked());
    assert.equal(await panel.getByRole('button', { name: 'Missing only', exact: true }).getAttribute('aria-pressed'), 'true');
    await panel.getByRole('checkbox', { name: 'Show unowned', exact: true }).uncheck();
    assert.equal(await panel.getByRole('button', { name: 'All ownership', exact: true }).getAttribute('aria-pressed'), 'true');
    await panel.locator('input[data-filter-key="rarity"]').first().check(); await panel.getByRole('checkbox', { name: 'New cards only', exact: true }).check();
    await page.evaluate(() => { window.contractPanel = document.querySelector('.inventory-popover'); window.contractCheckboxes = Array.from(window.contractPanel.querySelectorAll('input[type="checkbox"]')); window.contractClear = Array.from(window.contractPanel.querySelectorAll('button')).find(b => b.textContent === 'Clear all filters'); });
    await panel.getByRole('button', { name: 'Clear all filters', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => ({ samePanel: window.contractPanel === document.querySelector('.inventory-popover'), sameInputs: window.contractCheckboxes.every(el => el.isConnected && window.contractPanel.contains(el)), focused: document.activeElement === window.contractClear, unchecked: window.contractCheckboxes.filter(el => el.dataset.filterKey).every(el => !el.checked) })), { samePanel: true, sameInputs: true, focused: true, unchecked: true });
    evidence.checks.push('Same controls panel preserves new sort through grouping, resets Custom correctly, synchronizes pressed/check states, and clears filter checkboxes without replacing inputs or stealing focus.');
    await page.keyboard.press('Escape'); await closedInventory();

    const counts = () => page.evaluate(() => ({ views: Cardable.cardView.stats.liveViews, subscribers: Cardable.fx.stats.subscribers }));
    async function cycleSurfaces(cycle, baseline) {
      const stages = [];
      async function record(surface) { const actual = await counts(); stages.push({ surface, ...actual }); if (baseline) assert.deepEqual(actual, baseline, surface + ' lifecycle cycle ' + cycle); }
      await page.evaluate(() => Cardable.inventory.request('expanded')); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
      for (const tile of (await page.locator('.inventory-tile:visible').all()).slice(0, 3)) { await tile.focus(); await page.waitForTimeout(60); assert(await page.locator('.inventory-tile .collectible-card[data-mode="full"]').count() <= 1); }
      await closedInventory(); await record('Inventory');
      await page.evaluate(() => Cardable.shop.open()); await page.waitForFunction(() => Cardable.shop.isOpen);
      await page.getByRole('button', { name: 'Close Shop', exact: true }).click(); await page.waitForFunction(() => !Cardable.shop.isOpen);
      await closedInventory(); await record('Shop');
      await page.evaluate(() => Cardable.preferences.show()); await page.waitForTimeout(150); await page.evaluate(() => Cardable.preferences.close()); await page.waitForFunction(() => !Cardable.preferences.open);
      await closedInventory(); await record('Settings');
      await page.evaluate(() => Cardable.commands.open()); await page.waitForTimeout(100); await page.evaluate(() => Cardable.commands.close()); await page.waitForFunction(() => !Cardable.commands.active);
      await closedInventory(); await record('Command menu');
      return { cycle, stages };
    }
    // Live-card scheduling is installed once, lazily (card.js), after this page's
    // real save reload. Warm each path before comparing repeated close cycles.
    evidence.coldCounts = await counts(); evidence.warmup = await cycleSurfaces('warmup');
    const baseline = await counts(); evidence.baseline = baseline;
    for (let cycle = 0; cycle < 3; cycle++) evidence.lifecycle.push(await cycleSurfaces(cycle, baseline));
    evidence.checks.push('Three inventory, Shop, Settings and command menu close cycles return live view and frame subscriber counts to baseline with pointer/focus away from peek; at most one focused full inventory card.');
    assert.deepEqual(evidence.errors, []); console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    evidence.failure = error.stack; console.error(error); process.exitCode = 1;
    if (page && !page.isClosed()) await shot('failure').catch(() => {});
  } finally {
    if (page && !page.isClosed()) await page.evaluate(() => { window.contractViews?.forEach(v => v.destroy()); document.getElementById('contracts-gallery')?.remove(); }).catch(() => {});
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(evidence, null, 2)); await context.close(); await browser.close(); local.close();
  }
})();
