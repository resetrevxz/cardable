'use strict';
// Idle cost and compositor layers of each main surface at each quality tier. For every surface it opens the surface,
// lets it settle, then reports: compositor layers, layers that are only alive because of a running or held animation,
// running animations, and renderer main-thread + GPU task milliseconds over a 3 second idle window.
//   node tools/survey-surfaces.cjs [tier,tier,...] [surface,surface,...]      (env WIDTH, HEIGHT)
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const tiers = (process.argv[2] || 'very-low,low,medium,high').split(',');
const only = process.argv[3] ? process.argv[3].split(',') : null;
const width = Number(process.env.WIDTH || 1920), height = Number(process.env.HEIGHT || 1080);

const SURFACES = {
  menu: async () => {},
  inventory: async (page) => { await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'shelf' }); Cardable.inventory.request('expanded'); }); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0); },
  grid: async (page) => { await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'grid' }); Cardable.inventory.request('expanded'); }); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0); },
  detail: async (page) => {
    await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'grid' }); Cardable.inventory.request('expanded'); });
    await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
    await page.locator('.inventory-grid .inventory-tile[data-owned=true]').first().click();
    await page.waitForFunction(() => Cardable.detail.phase === 'detail');
  },
  settings: async (page) => { await page.locator('.settings-corner button, button.settings-corner, #settings-open').first().click({ timeout: 4000 }); await page.waitForTimeout(600); },
  shop: async (page) => { await page.locator('.shop-entry').first().click({ timeout: 4000 }); await page.waitForTimeout(900); },
  // The Market opens on its Simulation world (offline, no network). A listing page is the heaviest route: charts, tiles, countdowns.
  'market-discover': async (page) => { await marketOpen(page, { name: 'discover', params: {} }); },
  'market-listing': async (page) => {
    await marketOpen(page, { name: 'discover', params: {} });
    const id = await page.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((l) => l.format === 'auction').id);
    await page.evaluate((id) => Cardable.market.ui.go('listing', { id }, { reset: true }), id); await page.waitForSelector('#mk-max'); await page.waitForTimeout(500);
  },
  'market-stocks': async (page) => { await marketOpen(page, { name: 'stocks', params: {} }); }
};
async function marketOpen(page, route) {
  await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
  await page.evaluate((r) => { Cardable.market.store.markGuideSeen(); Cardable.market.open(r); }, route);
  await page.waitForSelector('.mk-page'); await page.waitForTimeout(500);
}

async function measure(browser, local, tier, name) {
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
  try { await SURFACES[name](page); } catch (e) { await page.close(); return { tier, name, error: String(e.message).split('\n')[0].slice(0, 90) }; }
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable'); await cdp.send('LayerTree.enable');
  let layers = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
  await page.mouse.move(500, 500); await page.waitForTimeout(300);
  const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.waitForTimeout(3000);
  const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  let held = 0, running = 0;
  for (const l of layers) {
    try { const r = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasonIds; if (r.includes('ActiveTransformAnimation') || r.includes('ActiveOpacityAnimation')) held++; } catch (_) { /* gone */ }
  }
  const anims = await page.evaluate(() => { const a = document.getAnimations(); return { total: a.length, running: a.filter((x) => x.playState === 'running').length, finished: a.filter((x) => x.playState === 'finished').length }; });
  running = anims.running;
  const px = layers.reduce((n, l) => n + l.width * l.height, 0) / 1e6;
  const out = { tier, name, layers: layers.length, animLayers: held, animsRunning: running, animsFinished: anims.finished, layerMP: +px.toFixed(1), taskMsPerSec: +(((after.TaskDuration - before.TaskDuration) * 1000) / 3).toFixed(1), scriptMsPerSec: +(((after.ScriptDuration - before.ScriptDuration) * 1000) / 3).toFixed(1), layoutMsPerSec: +(((after.LayoutDuration - before.LayoutDuration) * 1000) / 3).toFixed(1) };
  await page.close();
  return out;
}
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const name of Object.keys(SURFACES)) {
      if (only && !only.includes(name)) continue;
      for (const tier of tiers) console.log(JSON.stringify(await measure(browser, local, tier, name)));
    }
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
