'use strict';
// Which elements become compositor layers in the inventory, and why. Run:
//   node tools/diagnose-inventory-layers.cjs [tier] [shelf|grid]        (env WIDTH, HEIGHT, SCALE)
// Loads the real game with the 1,512-stack fixture the other inventory profilers use, opens the inventory and reports
// layer count, layer pixels, and the elements and compositing reasons behind them. Read-only diagnosis.
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const tier = process.argv[2] || 'medium', mode = process.argv[3] || 'shelf';
const scale = Number(process.env.SCALE || 1), width = Number(process.env.WIDTH || 1366), height = Number(process.env.HEIGHT || 900);
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(local.url + '/index.html');
    await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
    await page.evaluate((a) => {
      const C = Cardable; C.tutorial.skipButton.click(); C.settings.applyPreset(a.tier); C.settings.set('motion', 'off'); C.settings.set('fpsLimit', '60');
      const instances = [];
      C.data.cards.filter((c) => !c.retired && c.active !== false).forEach((c, i) => [null].concat(C.data.variants.map((v) => v.id)).forEach((v, j) => instances.push({ instanceId: 'reg-' + i + '-' + j, cardId: c.id, variantId: v, serial: 'QA-' + i + '-' + j, pulledAt: 1, seen: true })));
      C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
      C.inventoryModel.update({ showUnowned: false, viewMode: a.mode, activeCollectionId: 'all' });
      C.inventory.request('expanded');
    }, { tier, mode });
    await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
    if (process.env.EXTRA_CSS) await page.addStyleTag({ content: process.env.EXTRA_CSS });
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('LayerTree.enable');
    let layers = [];
    cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
    await page.evaluate(() => { document.body.style.setProperty('--probe', String(Math.random())); });
    await page.mouse.move(300, 300); await page.waitForTimeout(400);
    const stats = await page.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, tiles: Cardable.inventory.rendered.size, dpr: devicePixelRatio, w: innerWidth, h: innerHeight }));
    const rows = {}, reasons = {};
    let pixels = 0, content = 0;
    for (const l of layers) {
      pixels += l.width * l.height; if (l.drawsContent) content++;
      let label = 'unknown';
      if (l.backendNodeId) {
        try { const d = (await cdp.send('DOM.describeNode', { backendNodeId: l.backendNodeId })).node; const attrs = d.attributes || []; const ci = attrs.indexOf('class'); label = d.nodeName.toLowerCase() + (ci >= 0 ? '.' + String(attrs[ci + 1]).split(/\s+/).slice(0, 3).join('.') : ''); } catch (_) { /* gone */ }
      }
      const r = rows[label] || (rows[label] = { n: 0, px: 0, content: 0 });
      r.n++; r.px += l.width * l.height; if (l.drawsContent) r.content++;
      try { const why = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasonIds; why.forEach((x) => { reasons[x] = (reasons[x] || 0) + 1; }); } catch (_) { /* no reasons */ }
    }
    const top = Object.entries(rows).sort((a, b) => b[1].px - a[1].px).slice(0, 18).map(([k, v]) => k + ' x' + v.n + ' px=' + (v.px / 1e6).toFixed(2) + 'M content=' + v.content);
    console.log(JSON.stringify({ tier, mode, stats, layers: layers.length, content, megapixels: +(pixels / 1e6).toFixed(2), reasons }, null, 1));
    console.log(top.join('\n'));
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
