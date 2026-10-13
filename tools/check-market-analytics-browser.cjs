'use strict';
// Cardable Market Beta, Stage 6: stocks, portfolio, discovery and alerts on the Global Market, in the real interface,
// against a LOCAL Worker and a throw-away database holding LABELED FIXTURES (trade ids `trd_fixture_*`) next to real
// sales made through the interface. Contrasting scenarios: a busy common card, a card with one old sale, a card with an
// outlier, and nothing at all; five window widths, saved monochrome and two quality tiers.
//   node tools/check-market-analytics-browser.cjs [--out qa-output/market-beta/stage-6]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-6');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], timings: {} };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 8803, WEB_PORT = 8804, API = 'http://127.0.0.1:' + API_PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const HOUR = 3600000, DAY = 24 * HOUR;
let persist = '';

async function startWorker() {
  persist = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-analytics-'));
  execFileSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + secret, '--var', 'ENVIRONMENT:test', '--var', 'REGISTER_PER_HOUR:200', '--var', 'API_RATE_LIMIT:100000'],
    { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(API + '/v1/status'); if (r.ok) return { child }; } catch (_) { /* waiting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill(); throw new Error('the local Worker did not start');
}
function serveGame() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root) || file.includes(path.sep + 'node_modules' + path.sep) || file.includes(path.sep + '.git' + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      if (path.basename(file) === 'index.html') data = Buffer.from(data.toString().replace("connect-src 'none'", 'connect-src ' + API));
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(WEB_PORT, '127.0.0.1', () => resolve(server)));
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 900) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 4).join('\n     ')); throw error; }
}
const shot = async (page, name) => { await new Promise((r) => setTimeout(r, 700)); return page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function sql(statements) {
  const file = path.join(persist, 'fixtures-' + crypto.randomBytes(4).toString('hex') + '.sql');
  fs.writeFileSync(file, statements.join(';\n') + ';\n');
  execFileSync(process.execPath, [wrangler, 'd1', 'execute', 'cardable-market-beta-db', '--local', '--persist-to', persist, '--file', file], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
}

async function newPlayer(browser, label, seedOffset, size) {
  const context = await browser.newContext({ viewport: size || { width: 1440, height: 900 }, acceptDownloads: true });
  await context.addInitScript('window.__CARDABLE_MARKET_API__ = "' + API + '";');
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ who: label, type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ who: label, text: String(e).slice(0, 300) }));
  await page.goto('http://127.0.0.1:' + WEB_PORT + '/index.html');
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.online);
  await page.evaluate((offset) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    for (let i = 0; i < 14; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 7 + offset) % cards.length].id, variantId: null, serial: 'CBL-' + s.playerCode + '-' + String(i + 1).padStart(6, '0'), pulledAt: Date.now() - i * 1000, seen: true });
    s.serialCounter = 200; s.stats.packsOpened = 40; s.currency = 100; C.state.commit(s);
  }, seedOffset);
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  await page.evaluate(() => Cardable.market.store.markGuideSeen());
  await page.evaluate(async () => { const o = Cardable.market.online; await o.connect('Test device'); const pv = await o.previewImport(); await o.commitImport(pv.previewId); });
  await page.waitForFunction(() => Cardable.market.online.state.status === 'online' && Cardable.market.online.state.imported);
  return { label, context, page };
}
const openGlobal = (p, route) => p.page.evaluate((r) => { Cardable.market.store.setRealm('global'); Cardable.market.open(r); }, route);
const refresh = (p) => p.page.evaluate(async () => { await Cardable.market.onlineData.invalidate(); const s = Cardable.market.online.state; return { balance: s.balance, held: s.held }; });
const apiCall = (p, expr, arg) => p.page.evaluate(new Function('arg', 'return (async () => { const P = Cardable.market.onlineProvider; return ' + expr + '; })();'), arg);

(async () => {
  const worker = await startWorker();
  const web = await serveGame();
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const A = await newPlayer(browser, 'A', 0), B = await newPlayer(browser, 'B', 3);
    // cards the game really offers (not retired scaffolds), by rarity
    const pools = await A.page.evaluate(() => { const by = {}; Cardable.data.cards.filter((c) => !c.retired && c.pullable !== false).forEach((c) => { (by[c.rarity] = by[c.rarity] || []).push(c.id); }); return by; });
    const BUSY = pools.common[0], RARE = pools.rare[0], SPIKE = pools.uncommon[0], EMPTY = pools.uncommon[1];
    // two accounts that exist only to carry the fixture sales, so no player's books are touched by them
    const reg = async () => (await (await fetch(API + '/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).data.alias;
    const FX1 = await reg(), FX2 = await reg();
    // LABELED FIXTURES: sales between two real (test) accounts of this throw-away realm, ids prefixed trd_fixture_
    const now = Date.now();
    const st = [];
    const who = (n) => "(SELECT id FROM accounts WHERE alias = '" + (n ? FX2 : FX1) + "')";
    const add = (tag, card, i, at, price) => {
      const id = 'trd_fixture_' + tag + '_' + i;
      st.push("INSERT INTO trades (id, at, kind, listing_id, seller_id, buyer_id, price, fee, item_count, card_id, variant_id, skin_id, items, attributed) VALUES ('" + id + "', " + at + ", 'fixed', NULL, " + who(0) + ', ' + who(1) + ', ' + price + ', 1, 1, \'' + card + "', NULL, NULL, '[{\"c\":\"" + card + "\",\"v\":null,\"k\":null,\"s\":\"CBL-FIXT-" + String(i).padStart(6, '0') + "\"}]', 1)");
      st.push("INSERT INTO price_observations (at, card_key, price, kind, trade_id, card_id) VALUES (" + at + ", '" + card + "||', " + price + ", 'fixed', '" + id + "', '" + card + "')");
    };
    for (let i = 0; i < 48; i++) add('busy', BUSY, i, now - HOUR - (47 - i) * 6 * HOUR, 12 + (i % 5) + Math.floor(i / 12));
    add('rare', RARE, 0, now - 40 * DAY, 400);
    for (let i = 0; i < 9; i++) add('spike', SPIKE, i, now - (9 - i) * 8 * HOUR, 60);
    add('spike', SPIKE, 99, now - HOUR, 4000);
    sql(st);
    await Promise.all([refresh(A), refresh(B)]);
    const fixtureCount = 48 + 1 + 10;

    await step('Stocks (Global, whole market): a real series from completed sales, with totals that match the database', async () => {
      await openGlobal(A, { name: 'stocks', params: {} });
      await A.page.waitForSelector('.mk-stocks .mk-chart', { timeout: 20000 });
      await A.page.waitForFunction(() => !document.querySelector('.mk-skeleton-grid'), null, { timeout: 20000 });
      const chip = await A.page.evaluate(() => document.querySelector('.mk-pagehead-actions').textContent);
      assert(/Player trades/.test(chip), chip);
      const text = await A.page.evaluate(() => document.querySelector('.mk-stocks').textContent);
      assert(/Volume, 24 h/.test(text) && /Credits traded, 24 h/.test(text), text.slice(0, 300));
      const count = await A.page.evaluate(async () => (await Cardable.market.online.authed('GET', '/v1/analytics/stocks?scope=index&window=all')).tradesCounted);
      assert.equal(count, fixtureCount, 'every labeled fixture sale and nothing else is behind the index');
      await shot(A.page, 'stocks-index-desktop');
    });

    await step('a busy card: Average Value and fair value are distinct, volume is units and Credits, targets are ranges, time to sell is inferred', async () => {
      await A.page.evaluate((id) => { Cardable.market.store.session.stocks = { scope: 'card', id: id, variantId: null }; }, BUSY);
      await openGlobal(A, { name: 'stocks', params: {} });
      await A.page.waitForSelector('.mk-analytics', { timeout: 20000 });
      const t = await A.page.evaluate(() => document.querySelector('.mk-analytics').textContent);
      assert(/Average Value/.test(t) && /Fair value \(model\)/.test(t), t.slice(0, 200));
      assert(/\d+ sold · [\d,]+ Credits/.test(t), 'units and Credits: ' + t.slice(0, 600));
      assert(/Target buy range/.test(t) && /Target sell range/.test(t) && /Proposed listing ask/.test(t));
      assert(/Estimated time to sell/.test(t) && !/Not enough sales to say/.test(t), 'inferable from 48 sales');
      assert(/after the \d+ Credit fee/.test(t) || /after the \d+ fee/.test(t), 'proceeds include the fee');
      await shot(A.page, 'stocks-busy-card-desktop');
    });

    await step('a card with one old sale and a card with nothing: honest empty states, no invented line', async () => {
      await A.page.evaluate((id) => { Cardable.market.store.session.stocks = { scope: 'card', id: id, variantId: null }; }, RARE);
      await openGlobal(A, { name: 'stocks', params: {} });
      await A.page.waitForSelector('.mk-analytics', { timeout: 20000 });
      let t = await A.page.evaluate(() => document.querySelector('.mk-analytics').textContent);
      assert(/No sales in 30 days/.test(t) && /Not enough sales to say/.test(t), t.slice(0, 500));
      await shot(A.page, 'stocks-one-old-sale-desktop');
      await A.page.evaluate((id) => { Cardable.market.store.session.stocks = { scope: 'card', id: id, variantId: null }; }, EMPTY);
      await openGlobal(A, { name: 'stocks', params: {} });
      await A.page.waitForSelector('.mk-analytics', { timeout: 20000 });
      t = await A.page.evaluate(() => document.querySelector('.mk-analytics').textContent);
      assert(/No sales yet/.test(t) && /Baseline estimate/.test(t), t.slice(0, 400));
      const hint = await A.page.evaluate(() => document.querySelector('.mk-chart-title').textContent);
      assert(/baseline|No trades|No two players/i.test(hint), hint);
      await shot(A.page, 'stocks-no-sales-desktop');
    });

    await step('an outlier sale does not move the Average Value of a card that trades rarely', async () => {
      const r = await A.page.evaluate(async (id) => {
        const d = await Cardable.market.online.authed('GET', '/v1/analytics/card?cardId=' + id + '&window=7d');
        return { avg: d.analytics.averageValue, vwap: d.analytics.observed.vwap, mean: d.analytics.observed.weightedMean, median: d.analytics.observed.median };
      }, SPIKE);
      assert.equal(r.avg, 60, JSON.stringify(r));
      assert(r.vwap > 300, 'the plain mean is reported as it is: ' + r.vwap);
      assert(r.mean < 100, 'the capped mean stays near the others: ' + r.mean);
    });

    await step('Portfolio: cost basis from what was paid, imports say No cost basis, books, groups and a CSV export without private ids', async () => {
      await A.page.evaluate(async () => { await Cardable.market.onlineData.loadInventory(true); });
      const sellId = await A.page.evaluate(() => Cardable.market.onlineProvider.inventory('global').items.slice().sort((a, b) => a.cardId < b.cardId ? -1 : 1)[0].instanceId);
      const listed = await apiCall(A, "(await P.publishListing('global', { kind: 'fixed', instanceIds: [arg.id], ask: 9, title: '', note: '', durationMs: 86400000, requestId: 'pf-' + Math.random().toString(36).slice(2) }))", { id: sellId });
      assert.equal(listed.ok, true, JSON.stringify(listed));
      // B needs Credits: sell the cheapest cards to the system through the API, then buy
      await apiCall(B, "(await Cardable.market.onlineData.loadInventory(true), await P.quickSell('global', { instanceIds: Cardable.market.onlineProvider.inventory('global').items.slice().sort((x, y) => P.quoteLocal(x).quote - P.quoteLocal(y).quote).slice(0, 8).map((i) => i.instanceId), requestId: 'q-' + Math.random().toString(36).slice(2) }))");
      await refresh(B);
      const bought = await apiCall(B, "(await P.purchase('global', arg.id, 'buy-' + Math.random().toString(36).slice(2), 9))", { id: listed.listing.id });
      assert.equal(bought.ok, true, JSON.stringify(bought));
      await B.page.evaluate(() => Cardable.market.store.markGuideSeen());
      await openGlobal(B, { name: 'portfolio', params: {} });
      await B.page.waitForSelector('.mk-table.is-holdings .mk-trow:not(.mk-trow-head)', { timeout: 20000 });
      await B.page.waitForFunction(() => /No cost basis/.test(document.body.textContent) && /paid 9/.test(document.body.textContent), null, { timeout: 15000 });
      const books = await B.page.evaluate(() => document.querySelector('[aria-label="Global accounts"]').textContent);
      assert(/Held by open bids/.test(books) && /Cards with no cost basis/.test(books) && /Quick Sell value/.test(books), books.slice(0, 300));
      await shot(B.page, 'portfolio-global-desktop');
      // a group is saved on this device
      await B.page.locator('button', { hasText: 'New group' }).click();
      await B.page.waitForSelector('.mk-review .mk-pick-row');
      await B.page.locator('.mk-review input[type=text]').fill('Starter set');
      await B.page.locator('.mk-review .mk-pick-row').first().click();
      await B.page.locator('.mk-review button', { hasText: 'Save group' }).click();
      await B.page.waitForSelector('.mk-group strong');
      // the export is the player's own rows
      const download = B.page.waitForEvent('download');
      await B.page.locator('button', { hasText: 'Trades (CSV)' }).click();
      const file = await download;
      const text = fs.readFileSync(await file.path(), 'utf8');
      assert(/^at,role,kind,card,cards,price,fee/.test(text), text.slice(0, 120));
      assert(!/acct_|ses_|Bearer/.test(text) && /buyer/.test(text), text.slice(0, 300));
    });

    await step('Compare holds two to four exact cards with the same numbers, and says when a number is missing', async () => {
      for (const id of [BUSY, RARE]) {
        await openGlobal(B, { name: 'card', params: { id, variant: '' } });
        await B.page.waitForSelector('.mk-detail-actions button:has-text("Compare")', { timeout: 20000 });
        await B.page.locator('.mk-detail-actions button', { hasText: /^Compare$/ }).click();
      }
      await openGlobal(B, { name: 'compare', params: {} });
      try { await B.page.waitForSelector('.mk-compare .mk-crow', { timeout: 8000 }); } catch (e) {
        const d = await B.page.evaluate(() => ({ list: Cardable.market.store.compareList(), page: !!Cardable.market.ui.pages.get('compare'), text: document.querySelector('.mk-page') && document.querySelector('.mk-page').textContent.slice(0, 300), realm: Cardable.market.store.session.realm }));
        throw new Error('compare page: ' + JSON.stringify(d));
      }
      const cols = await B.page.evaluate(() => document.querySelectorAll('.mk-crow-head [role=columnheader]').length);
      assert.equal(cols, 3, 'a label column and two cards');
      const t = await B.page.evaluate(() => document.querySelector('.mk-compare').textContent);
      assert(/No sales yet|No comparison yet/.test(t) && /Average Value/.test(t));
      await shot(B.page, 'compare-desktop');
    });

    await step('Discover: what is moving comes from real sales; presets, saved views per realm and a search alert', async () => {
      await B.page.evaluate(() => Cardable.market.store.markGuideSeen());
      await openGlobal(B, { name: 'discover', params: {} });
      await B.page.waitForSelector('.mk-explore', { timeout: 20000 });
      await B.page.waitForFunction(() => document.querySelectorAll('.mk-explore-col .mk-minirow').length > 0, null, { timeout: 20000 });
      const t = await B.page.evaluate(() => document.querySelector('.mk-explore').textContent);
      assert(/Completed player sales/.test(t) && /Simulation is a separate/.test(t), t.slice(0, 300));
      await shot(B.page, 'discover-moving-desktop');
      // a saved view belongs to its realm
      const views = await B.page.evaluate(() => { const s = Cardable.market.store; s.saveView('Cheap commons', { q: '', sort: 'price-asc', tab: 'for-you', filters: Cardable.market.core.emptyFilters(), realm: 'global' }); return s.prefs.saved.filter((v) => v.realm === 'global').length; });
      assert.equal(views, 1);
    });

    await step('an alert reaches the inbox once, from the server, when a real listing matches', async () => {
      await openGlobal(B, { name: 'alerts', params: {} });
      await B.page.waitForSelector('.mk-alertform');
      const set = await B.page.evaluate((id) => { const sel = document.querySelector('.mk-alertform select'); sel.value = sel.options[4].value; sel.dispatchEvent(new Event('change', { bubbles: true })); return { value: sel.value, options: sel.options.length }; }, null);
      assert.ok(set.value, JSON.stringify(set));
      await B.page.fill('.mk-alertform input[type=number]', '30');
      await B.page.locator('.mk-alertform button[type=submit]').click();
      await B.page.waitForSelector('.mk-alert[data-server="1"]', { timeout: 15000 });
      // A lists one for 20 Credits: the cheapest card A holds of that kind may not exist, so list any card and set the alert on it
      const inv = await A.page.evaluate(async () => { await Cardable.market.onlineData.loadInventory(true); return Cardable.market.onlineProvider.inventory('global').items.filter((i) => i.state === 'owned').map((i) => ({ id: i.instanceId, cardId: i.cardId })); });
      const pick = inv[0];
      await apiCall(B, "(await P.createAlert({ kind: 'price', cardId: arg.cardId, maxPrice: 25, label: '' }))", { cardId: pick.cardId });
      const made = await apiCall(A, "(await P.publishListing('global', { kind: 'fixed', instanceIds: [arg.id], ask: 20, title: '', note: '', durationMs: 86400000, requestId: 'al-' + Math.random().toString(36).slice(2) }))", { id: pick.id });
      assert.equal(made.ok, true, JSON.stringify(made));
      await sleep(1200);
      const notes = await apiCall(B, "(await Cardable.market.onlineData.loadActivity(true)).data.notifications.filter(n => n.kind === 'price').length");
      assert.equal(notes, 1, 'one alert, once');
      await openGlobal(B, { name: 'activity', params: {} });
      await B.page.waitForSelector('.mk-page');
      await shot(B.page, 'activity-alert-desktop');
    });

    await step('the same pages fit 360, 390, 768, 1366 and 1920 wide, in saved monochrome and at Very Low and High quality', async () => {
      const sizes = [[360, 800], [390, 844], [768, 1024], [1366, 768], [1920, 1080]];
      await A.page.evaluate((id) => { Cardable.market.store.session.stocks = { scope: 'card', id: id, variantId: null }; }, BUSY);
      for (const [w, hgt] of sizes) {
        await A.page.setViewportSize({ width: w, height: hgt });
        await openGlobal(A, { name: 'stocks', params: {} });
        await A.page.waitForSelector('.mk-analytics', { timeout: 20000 });
        const over = await A.page.evaluate(() => { const m = document.querySelector('.mk'); return m.scrollWidth - m.clientWidth; });
        assert(over <= 1, w + 'px: horizontal overflow ' + over);
        await shot(A.page, 'stocks-card-' + w);
      }
      await A.page.setViewportSize({ width: 1440, height: 900 });
      for (const [name, settings] of [['mono', { rarityColor: 'mono' }], ['very-low', { quality: 'very-low' }], ['high', { quality: 'high' }]]) {
        await A.page.evaluate((s) => Object.keys(s).forEach((k) => Cardable.settings.set(k, s[k])), settings);
        await openGlobal(A, { name: 'stocks', params: {} });
        await A.page.waitForSelector('.mk-analytics', { timeout: 20000 });
        await shot(A.page, 'stocks-card-' + name);
      }
      await A.page.evaluate(() => { Cardable.settings.set('rarityColor', 'color'); Cardable.settings.set('quality', 'medium'); });
    });

    await step('cost: one chart on Stocks, none per listing; the page draws quickly and the Worker reports its query cost', async () => {
      await openGlobal(A, { name: 'discover', params: {} });
      await A.page.waitForSelector('.mk-explore', { timeout: 20000 });
      const feedCharts = await A.page.evaluate(() => document.querySelectorAll('.mk-chart').length);
      assert.equal(feedCharts, 0, 'no chart per feed item');
      const t0 = Date.now();
      await A.page.evaluate((id) => { Cardable.market.store.session.stocks = { scope: 'index', id: '', variantId: null }; }, BUSY);
      await openGlobal(A, { name: 'stocks', params: {} });
      await A.page.waitForSelector('.mk-stocks .mk-chart');
      evidence.timings.stocksMountMs = Date.now() - t0;
      assert.equal(await A.page.evaluate(() => document.querySelectorAll('.mk-chart').length), 1);
      const cost = await A.page.evaluate(async () => { const r = await Cardable.market.online.authed('GET', '/v1/listings?limit=20'); return r.cost; });
      assert(cost && cost.rowsRead >= 0);
      evidence.timings.listingQueryRowsRead = cost.rowsRead;
    });

    await step('no page errors and no unexpected console messages', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors));
      const bad = evidence.console.filter((c) => !/Failed to load resource|net::ERR|favicon/i.test(c.text));
      assert.equal(bad.length, 0, JSON.stringify(bad));
    });
  } catch (error) {
    failed = error;
  } finally {
    fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
    web.close();
    try { worker.child.kill(); } catch (_) { /* gone */ }
    try { fs.rmSync(persist, { recursive: true, force: true }); } catch (_) { /* busy */ }
  }
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + evidence.steps.filter((s) => !s.ok).length + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
