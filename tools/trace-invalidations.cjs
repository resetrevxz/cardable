'use strict';
// What keeps a seemingly idle surface busy: a trace with invalidation tracking, aggregated by the element and the reason
// (style change, class/attribute change, layout invalidation) and by the work it caused.
//   node tools/trace-invalidations.cjs <surface> [tier] [seconds]
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const surface = process.argv[2] || 'shop', tier = process.argv[3] || 'medium', seconds = Number(process.argv[4] || 3);
const OPEN = {
  menu: async () => {},
  detail: async (page) => { await page.evaluate(() => { Cardable.inventoryModel.update({ viewMode: 'grid' }); Cardable.inventory.request('expanded'); }); await page.waitForFunction(() => Cardable.inventory.rendered.size > 0); await page.locator('.inventory-grid .inventory-tile[data-owned=true]').first().click(); await page.waitForFunction(() => Cardable.detail.phase === 'detail'); },
  settings: async (page) => { await page.locator('.settings-corner button, button.settings-corner, #settings-open').first().click({ timeout: 4000 }); await page.waitForTimeout(600); },
  shop: async (page) => { await page.locator('.shop-entry').first().click({ timeout: 4000 }); await page.waitForTimeout(900); }
};
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(local.url + '/index.html');
    await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
    await page.evaluate((tier) => {
      const C = Cardable; C.tutorial.skipButton.click(); C.settings.applyPreset(tier);
      const instances = [];
      C.data.cards.filter((c) => !c.retired && c.active !== false).slice(0, 40).forEach((c, i) => [null].forEach((v, j) => instances.push({ instanceId: 'reg-' + i + '-' + j, cardId: c.id, variantId: v, serial: 'QA-' + i + '-' + j, pulledAt: 1, seen: true })));
      C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
      C.inventoryModel.update({ showUnowned: false, activeCollectionId: 'all' });
    }, tier);
    await page.waitForTimeout(800);
    await OPEN[surface](page);
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' });
    await page.waitForTimeout(seconds * 1000);
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await done;
    const dur = {}, cnt = {}, inval = {};
    for (const e of events) {
      if (e.ph === 'X' && e.dur) { dur[e.name] = (dur[e.name] || 0) + e.dur / 1000; cnt[e.name] = (cnt[e.name] || 0) + 1; }
      if (/InvalidationTracking$/.test(e.name) && e.args && e.args.data) {
        const d = e.args.data;
        const key = e.name.replace('InvalidationTracking', '') + ' ' + (d.nodeName || '?') + ' ' + (d.reason || '') + ' ' + (d.changedClass || d.changedAttribute || d.changedId || d.changedPseudo || d.extraData || '');
        inval[key] = (inval[key] || 0) + 1;
      }
    }
    console.log(surface + ' @ ' + tier + ' over ' + seconds + ' s');
    ['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'FireAnimationFrame', 'FunctionCall'].forEach((k) => { if (dur[k]) console.log('  ' + k.padEnd(18) + Math.round(dur[k] / seconds) + ' ms/s  x' + Math.round(cnt[k] / seconds) + '/s'); });
    Object.entries(inval).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, n]) => console.log('  ' + String(Math.round(n / seconds)).padStart(5) + '/s  ' + k.slice(0, 150)));
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
