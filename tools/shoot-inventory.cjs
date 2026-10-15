'use strict';
// Screenshots of the inventory (shelf and grid) with the 1,512-stack fixture: node tools/shoot-inventory.cjs <outdir> [tier]
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'qa-output/inventory-shots'), tier = process.argv[3] || 'high';
(async () => {
  require('node:fs').mkdirSync(out, { recursive: true });
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.goto(local.url + '/index.html');
    await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
    await page.evaluate((tier) => {
      const C = Cardable; C.tutorial.skipButton.click(); C.settings.applyPreset(tier);
      const instances = [];
      C.data.cards.filter((c) => !c.retired && c.active !== false).forEach((c, i) => [null].concat(C.data.variants.map((v) => v.id)).forEach((v, j) => instances.push({ instanceId: 'reg-' + i + '-' + j, cardId: c.id, variantId: v, serial: 'QA-' + i + '-' + j, pulledAt: 1, seen: true })));
      C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
      C.inventoryModel.update({ showUnowned: false, viewMode: 'shelf', activeCollectionId: 'all' });
      C.inventory.request('expanded');
    }, tier);
    await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, 'shelf-' + tier + '.png') });
    await page.evaluate(() => Cardable.inventoryModel.update({ viewMode: 'grid' }));
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, 'grid-' + tier + '.png') });
  } finally { await browser.close(); await local.close(); }
})();
