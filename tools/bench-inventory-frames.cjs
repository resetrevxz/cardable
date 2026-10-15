'use strict';
// A/B bench for inventory rendering cost. Loads the game with the 1,512-stack fixture, opens the inventory, runs a fixed
// pointer + pan workload while recording a Chromium trace, and prints where the time went (main thread, raster, GPU,
// compositor) for each variant. Variants are CSS/JS tweaks applied after load so one run compares them on equal terms.
//   node tools/bench-inventory-frames.cjs [tier] [shelf|grid] [variant,variant,...]     (env WIDTH, HEIGHT, SCALE)
// Software compositing in headless Edge exaggerates GPU cost, so read the numbers as a ranking, not as milliseconds on
// a player's GPU.
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const tier = process.argv[2] || 'medium', mode = process.argv[3] || 'shelf', want = (process.argv[4] || 'baseline').split(',');
const width = Number(process.env.WIDTH || 1366), height = Number(process.env.HEIGHT || 900), scale = Number(process.env.SCALE || 1);
const VARIANTS = require(process.env.VARIANTS || './bench-variants.cjs');

async function run(browser, local, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto(local.url + '/index.html');
  await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
  await page.evaluate((a) => {
    const C = Cardable; C.tutorial.skipButton.click(); C.settings.applyPreset(a.tier); C.settings.set('fpsLimit', '60');
    const instances = [];
    C.data.cards.filter((c) => !c.retired && c.active !== false).forEach((c, i) => [null].concat(C.data.variants.map((v) => v.id)).forEach((v, j) => instances.push({ instanceId: 'reg-' + i + '-' + j, cardId: c.id, variantId: v, serial: 'QA-' + i + '-' + j, pulledAt: 1, seen: true })));
    C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
    C.inventoryModel.update({ showUnowned: false, viewMode: a.mode, activeCollectionId: 'all' });
    C.inventory.request('expanded');
  }, { tier, mode });
  await page.waitForFunction(() => Cardable.inventory.rendered.size > 0);
  const v = VARIANTS[name];
  if (!v) throw new Error('no variant ' + name);
  if (v.css) await page.addStyleTag({ content: v.css });
  if (v.js) await page.evaluate(v.js);
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('LayerTree.enable');
  let layerList = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layerList = e.layers; });
  await page.mouse.move(310, 410); await page.waitForTimeout(500);
  const layerCount = layerList.length, layerMP = +(layerList.reduce((n, l) => n + l.width * l.height, 0) / 1e6).toFixed(1);
  const events = [];
  cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc,gpu,viz,benchmark', transferMode: 'ReportEvents' });
  const t0 = Date.now();
  // pointer sweeps across the sheet and a pan of the shelf/grid: the things a player does in the inventory
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 30; i++) { await page.mouse.move(200 + i * 35, 420 + (i % 5) * 20); await page.waitForTimeout(16); }
    await page.evaluate((a) => { for (let i = 0; i < 1; i++) { if (a.mode === 'shelf') Cardable.inventory.carousel.move(12 + a.r * 3); else Cardable.inventory.grid.scrollTop = 300 * (a.r + 1); } }, { mode, r: round });
    await page.waitForTimeout(500);
  }
  const wall = Date.now() - t0;
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end'); await done;
  const total = {}, counts = {};
  let draws = 0, mainFrames = 0;
  for (const e of events) {
    if (e.ph === 'X' && e.dur) { total[e.name] = (total[e.name] || 0) + e.dur / 1000; counts[e.name] = (counts[e.name] || 0) + 1; }
    if (e.name === 'DrawFrame' || e.name === 'Display::DrawAndSwap') draws++;
    if (e.name === 'BeginMainThreadFrame' || e.name === 'ProxyMain::BeginMainFrame') mainFrames++;
  }
  const pick = ['FunctionCall', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'RasterTask', 'ImageDecodeTask', 'GPUTask', 'DrawFrame', 'Display::DrawAndSwap', 'UpdateLayer', 'CompositeLayers', 'EvaluateScript', 'ParseHTML'];
  const out = { variant: name, layers: layerCount, layerMP, wallMs: wall, draws, mainFrames };
  pick.forEach((k) => { if (total[k]) out[k] = Math.round(total[k]) + 'ms/' + counts[k]; });
  const top = Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ' ' + Math.round(v) + 'ms');
  out.top = top.join(', ');
  await page.close();
  return out;
}
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const name of want) console.log(JSON.stringify(await run(browser, local, name)));
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
