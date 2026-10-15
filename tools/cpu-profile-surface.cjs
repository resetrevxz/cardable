'use strict';
// Where an open surface spends its idle main-thread time: a V8 CPU profile over a few seconds, aggregated by function.
//   node tools/cpu-profile-surface.cjs <surface> [tier] [seconds]       surfaces: menu detail settings shop inventory grid market-discover market-listing
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const surface = process.argv[2] || 'detail', tier = process.argv[3] || 'medium', seconds = Number(process.argv[4] || 4);
const width = Number(process.env.WIDTH || 1920), height = Number(process.env.HEIGHT || 1080);
const OPEN = {
  menu: async () => {},
  inventory: async (page) => { await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'shelf' }); Cardable.inventory.request('expanded'); }); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0); },
  grid: async (page) => { await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'grid' }); Cardable.inventory.request('expanded'); }); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0); },
  detail: async (page) => { await OPEN.grid(page); await page.locator('.inventory-grid .inventory-tile[data-owned=true]').first().click(); await page.waitForFunction(() => Cardable.detail.phase === 'detail'); },
  settings: async (page) => { await page.locator('.settings-corner button, button.settings-corner, #settings-open').first().click({ timeout: 4000 }); await page.waitForTimeout(600); },
  shop: async (page) => { await page.locator('.shop-entry').first().click({ timeout: 4000 }); await page.waitForTimeout(900); },
  'market-discover': async (page) => {
    await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
    await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open({ name: 'discover', params: {} }); });
    await page.waitForSelector('.mk-page'); await page.waitForTimeout(500);
  },
  'market-listing': async (page) => {
    await OPEN['market-discover'](page);
    const id = await page.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((l) => l.format === 'auction').id);
    await page.evaluate((id) => Cardable.market.ui.go('listing', { id }, { reset: true }), id); await page.waitForSelector('#mk-max'); await page.waitForTimeout(500);
  }
};
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(local.url + '/index.html');
    await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
    await page.evaluate((tier) => {
      const C = Cardable; C.tutorial.skipButton.click(); C.settings.applyPreset(tier);
      const instances = [];
      C.data.cards.filter((c) => !c.retired && c.active !== false).forEach((c, i) => [null].concat(C.data.variants.map((v) => v.id)).forEach((v, j) => instances.push({ instanceId: 'reg-' + i + '-' + j, cardId: c.id, variantId: v, serial: 'QA-' + i + '-' + j, pulledAt: 1, seen: true })));
      C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
      C.inventoryModel.update({ showUnowned: false, activeCollectionId: 'all' });
    }, tier);
    await page.waitForTimeout(800);
    await OPEN[surface](page);
    await page.waitForTimeout(1500);
    await page.mouse.move(700, 500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    await page.waitForTimeout(seconds * 1000);
    const { profile } = await cdp.send('Profiler.stop');
    const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const dt = profile.timeDeltas; const total = dt.reduce((a, b) => a + b, 0);
    profile.samples.forEach((id, i) => { self.set(id, (self.get(id) || 0) + dt[i]); });
    const byFn = new Map();
    self.forEach((us, id) => {
      const n = nodes.get(id), cf = n.callFrame;
      const key = (cf.functionName || '(anonymous)') + ' ' + cf.url.replace(/^https?:\/\/[^/]+\//, '') + ':' + (cf.lineNumber + 1);
      byFn.set(key, (byFn.get(key) || 0) + us);
    });
    const top = Array.from(byFn.entries()).sort((a, b) => b[1] - a[1]).slice(0, 14);
    console.log(surface + ' @ ' + tier + ': ' + (total / 1000 / seconds).toFixed(0) + ' ms sampled per second');
    top.forEach(([k, us]) => console.log('  ' + (us / 1000 / seconds).toFixed(1).padStart(6) + ' ms/s  ' + k));
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
