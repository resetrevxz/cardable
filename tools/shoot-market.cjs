'use strict';
// Screenshots of Market routes in the Simulation for a seeded profile, for looking at the interface while designing it.
//   node tools/shoot-market.cjs <outDir> [width] [height] [route,route,...]
// Headless; writes <outDir>/<route>-<width>.png. Routes: discover, listing, portfolio, stocks, card, compose, activity, help, settings.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'qa-output', 'shots'));
const width = Number(process.argv[3] || 1440), height = Number(process.argv[4] || 900);
const routes = (process.argv[5] || 'discover,listing,portfolio').split(',');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })).newPage();
  await page.goto(local.url + '/index.html');
  await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    for (let i = 0; i < 14; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 3) % cards.length].id, variantId: i % 5 === 4 ? 'rainbow-holo' : null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now() - i * 1000, seen: true });
    s.serialCounter = 200; s.currency = 321; C.state.commit(s);
  });
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open({ name: 'discover', params: {} }); });
  await page.waitForSelector('.mk-page'); await page.waitForTimeout(900);
  // PLAY=hours: let the Simulation run first and take the best purchase on offer, so the screens show a market with a history.
  if (process.env.PLAY) {
    await page.evaluate((h) => { Cardable.marketSim.runtime.dev.fastForward(h * 3600000); }, Number(process.env.PLAY));
    await page.evaluate(() => { const rt = Cardable.marketSim.runtime, m = Cardable.market.sim.provider.home().moves.find((x) => x.type === 'buy'); if (m) { const r = rt.act.buy(m.listingId, 'shoot-buy'); if (r && r.ok) Cardable.market.sim.provider.notePlan(m.itemId, m.resell); } rt.dev.fastForward(14 * 3600000); });
  }
  for (const r of routes) {
    let params = {};
    if (r === 'card') params = { id: await page.evaluate(() => Cardable.data.cards.filter((c) => !c.retired)[4].id), variant: '' };
    if (r === 'listing') params = { id: await page.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((l) => l.format === 'auction').id) };
    await page.evaluate(([n, p]) => Cardable.market.ui.go(n, p, { reset: true }), [r, params]);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, r + '-' + width + '.png') });
    console.log('shot ' + r);
  }
  await browser.close(); await local.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
