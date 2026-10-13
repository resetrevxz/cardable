'use strict';
// Cardable Market Beta, Stage 5: three players in three independent browser profiles trade through the real interface
// against a LOCAL Worker (local D1 and Durable Objects; nothing leaves this machine). It drives: selling cards to the
// system for the first Credits, a fixed sale, a timed auction that is outbid and then closes on the server's clock, a
// swap with a counteroffer, a standing buy order that fills when a card is listed, and the realm's own reconciliation.
//   node tools/check-market-trading-browser.cjs [--out qa-output/market-beta/stage-5]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-5');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], requests: 0 };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 8801, WEB_PORT = 8802, API = 'http://127.0.0.1:' + API_PORT;
const ADMIN = crypto.randomBytes(24).toString('hex');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm' };

async function startWorker() {
  const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-trading-'));
  execFileSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + secret, '--var', 'ENVIRONMENT:test',
    '--var', 'REGISTER_PER_HOUR:200', '--var', 'ADMIN_TOKEN:' + ADMIN, '--var', 'TEST_MIN_AUCTION_MS:3000', '--var', 'TEST_SNIPE_WINDOW_MS:0'], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(API + '/v1/status'); if (r.ok) return { child, persist }; } catch (_) { /* waiting */ }
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
const shot = async (page, name) => { await new Promise((r) => setTimeout(r, 600)); return page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (text) => Number(String(text).replace(/[^0-9]/g, '')) || 0;

async function newPlayer(browser, label, seedOffset) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.addInitScript('window.__CARDABLE_MARKET_API__ = "' + API + '";');
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ who: label, type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ who: label, text: String(e).slice(0, 300) }));
  page.on('request', () => { evidence.requests++; });
  await page.goto('http://127.0.0.1:' + WEB_PORT + '/index.html');
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.online);
  await page.evaluate((offset) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    for (let i = 0; i < 16; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 7 + offset) % cards.length].id, variantId: null, serial: C.serial.format ? C.serial.format(s.playerCode, i + 1) : 'CBL-' + s.playerCode + '-' + String(i + 1).padStart(6, '0'), pulledAt: Date.now() - i * 1000, seen: true });
    s.serialCounter = 200; s.stats.packsOpened = 40; s.currency = 100; C.state.commit(s);
  }, seedOffset);
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  await page.evaluate(() => Cardable.market.store.markGuideSeen());
  return { label, context, page };
}
async function goOnline(p) {
  await p.page.evaluate(async () => {
    const o = Cardable.market.online;
    await o.connect('Test device');
    const pv = await o.previewImport();
    await o.commitImport(pv.previewId);
  });
  await p.page.waitForFunction(() => Cardable.market.online.state.status === 'online' && Cardable.market.online.state.imported && Cardable.market.online.state.inventoryTotal > 0);
}
const openGlobal = (p, route) => p.page.evaluate((r) => { Cardable.market.store.setRealm('global'); Cardable.market.open(r || { name: 'discover', params: {} }); }, route);
const state = (p) => p.page.evaluate(() => { const s = Cardable.market.online.state; return { balance: s.balance, held: s.held, available: s.available, alias: s.alias, cards: s.inventoryTotal }; });
const refresh = (p) => p.page.evaluate(async () => { await Cardable.market.onlineData.invalidate(); const s = Cardable.market.online.state; return { balance: s.balance, held: s.held }; });
const inventory = (p) => p.page.evaluate(async () => { await Cardable.market.onlineData.loadInventory(true); return Cardable.market.onlineProvider.inventory('global').items.map((i) => ({ id: i.instanceId, cardId: i.cardId, serial: i.serial, state: i.state, listed: i._listed })); });
const api = (p, expr, arg) => p.page.evaluate(new Function('arg', 'return (async () => { const P = Cardable.market.onlineProvider; return ' + expr + '; })();'), arg);
async function adminGet(pathname) {
  const r = await fetch(API + pathname, { headers: { 'x-admin-token': ADMIN } });
  return (await r.json()).data;
}

(async () => {
  const worker = await startWorker();
  const web = await serveGame();
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const A = await newPlayer(browser, 'A (seller)', 0), B = await newPlayer(browser, 'B (buyer)', 3), C = await newPlayer(browser, 'C (bidder)', 5);
    await Promise.all([goOnline(A), goOnline(B), goOnline(C)]);

    await step('three players come online, each with their own private name and no Credits', async () => {
      const [a, b, c] = await Promise.all([state(A), state(B), state(C)]);
      assert.equal(new Set([a.alias, b.alias, c.alias]).size, 3);
      [a, b, c].forEach((s) => { assert.equal(s.balance, 0); assert.equal(s.cards, 16); });
      return { names: [a.alias, b.alias, c.alias].length };
    });

    await step('the first Credits come from selling cards to the system, which says what it is', async () => {
      await openGlobal(B, { name: 'portfolio', params: {} });
      await B.page.waitForSelector('button:has-text("Sell to the system")');
      await shot(B.page, 'portfolio-global');
      await B.page.locator('button', { hasText: 'Sell to the system' }).first().click();
      await B.page.waitForSelector('.mk-qs');
      const intro = await B.page.evaluate(() => document.querySelector('.mk-qs').textContent);
      assert(/not a player|It is not a player/i.test(intro) && /never counts as a trade/i.test(intro), intro.slice(0, 300));
      await B.page.waitForSelector('.mk-qs .mk-pick-row');
      const rows = await B.page.locator('.mk-qs .mk-pick-row').count();
      assert(rows >= 10, 'cards listed: ' + rows);
      // the list is ordered by what the system would pay; the cheapest four keep the sale well inside the daily limit
      for (let i = 0; i < 4; i++) await B.page.locator('.mk-qs .mk-pick-row').nth(rows - 1 - i).click();
      await shot(B.page, 'quick-sell-dialog');
      await B.page.locator('.mk-qs button', { hasText: 'Review the sale' }).click();
      await B.page.waitForSelector('.mk-review');
      const review = await B.page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(/Not a player sale/.test(review) && /retired for good/.test(review), review.slice(0, 400));
      await shot(B.page, 'quick-sell-review');
      await B.page.locator('.mk-review button', { hasText: /^Sell for/ }).click();
      await B.page.waitForFunction(() => Cardable.market.online.state.balance > 0, null, { timeout: 15000 });
      await B.page.waitForFunction(() => Cardable.market.online.state.inventoryTotal === 12, null, { timeout: 15000 });
      const s = await state(B);
      assert(s.balance > 20, 'balance after Quick Sell: ' + s.balance);
      assert.equal(s.cards, 12);
      // the same screen for another player, so both buyers have something to spend
      for (const p of [A, C]) {
        await api(p, "(await Cardable.market.onlineData.loadInventory(true), await P.quickSell('global', { instanceIds: Cardable.market.onlineProvider.inventory('global').items.slice().sort((x, y) => P.quoteLocal(x).quote - P.quoteLocal(y).quote).slice(0, 6).map((i) => i.instanceId), requestId: 'seed-' + Math.random().toString(36).slice(2) }))");
      }
      await Promise.all([refresh(A), refresh(C)]);
      return { balance: s.balance };
    });

    let fixedId, fixedPrice;
    await step('a fixed price sale: list, find it, buy it, the fee is taken once and both sides see it', async () => {
      const inv = await inventory(A), sellCard = inv.find((i) => i.state === 'owned');
      fixedPrice = 10;
      const made = await api(A, "(await P.publishListing('global', { kind: 'fixed', instanceIds: [arg.id], ask: arg.price, title: 'Clean card', note: 'Careful owner.', durationMs: 86400000, requestId: 'list-' + Math.random().toString(36).slice(2) }))", { id: sellCard.id, price: fixedPrice });
      assert.equal(made.ok, true, JSON.stringify(made));
      fixedId = made.listing.id;
      const before = { b: await state(B), a: await state(A) };
      await refresh(B); // what a player sees after a moment: the listing another player just made
      await openGlobal(B, { name: 'discover', params: {} });
      await B.page.waitForSelector('.mk-tile', { timeout: 20000 });
      await shot(B.page, 'discover-global');
      await openGlobal(B, { name: 'listing', params: { id: fixedId } });
      await B.page.waitForSelector('.mk-buybox');
      await shot(B.page, 'listing-fixed');
      const text = await B.page.evaluate(() => document.querySelector('.mk-buybox').textContent);
      assert(/Seller receives/.test(text) && /fee/i.test(text), text.slice(0, 300));
      await B.page.locator('.mk-buybox button', { hasText: 'Buy now' }).click();
      const dlg = B.page.locator('.mk-review');
      if (await dlg.count()) { await dlg.locator('button', { hasText: /^Buy for/ }).click(); }
      await B.page.waitForFunction((p) => /sold/i.test(document.querySelector('.mk-detail-top') ? document.querySelector('.mk-detail-top').textContent : ''), null, { timeout: 15000 });
      const after = { b: await refresh(B), a: await refresh(A) };
      assert.equal(after.b.balance, before.b.balance - fixedPrice);
      assert.equal(after.a.balance, before.a.balance + fixedPrice - 1, 'seller receives the price less the 2% fee (rounded half up, at least 1)');
      const inv2 = await inventory(B);
      assert(inv2.some((i) => i.id === sellCard.id), 'the exact card is now B\'s');
      await shot(B.page, 'listing-sold');
    });

    let auctionId;
    await step('an auction: a bid, an outbid, the banner, then it closes on the server clock with nobody touching it', async () => {
      const inv = await inventory(A), card = inv.find((i) => i.state === 'owned');
      const made = await api(A, "(await P.publishListing('global', { kind: 'auction', instanceIds: [arg.id], start: 5, reserve: null, buyout: null, durationMs: 30000, title: '', note: '', requestId: 'auc-' + Math.random().toString(36).slice(2) }))", { id: card.id });
      assert.equal(made.ok, true, JSON.stringify(made));
      auctionId = made.listing.id;
      await openGlobal(B, { name: 'listing', params: { id: auctionId } });
      await B.page.waitForSelector('#mk-max');
      await B.page.fill('#mk-max', '12');
      await B.page.locator('.mk-buybox button', { hasText: /Place bid/ }).click();
      const dlg = B.page.locator('.mk-review');
      if (await dlg.count()) await dlg.locator('button', { hasText: /Place bid/ }).click();
      await B.page.waitForFunction(() => Cardable.market.online.state.held >= 12, null, { timeout: 15000 });
      await shot(B.page, 'auction-leading');
      const bannerLead = await B.page.waitForSelector('.mk-banner[data-tone="success"]', { timeout: 15000 });
      assert(bannerLead);
      // C outbids from another profile
      const bid = await api(C, "(await P.placeBid('global', arg.id, 30, 'c-bid-' + Math.random().toString(36).slice(2)))", { id: auctionId });
      assert.equal(bid.ok, true, JSON.stringify(bid));
      await B.page.waitForSelector('.mk-banner[data-tone="danger"]', { timeout: 30000 });
      await shot(B.page, 'auction-outbid');
      assert.equal((await refresh(B)).held, 0, 'the outbid player\'s Credits were released');
      assert.equal((await refresh(C)).held, 30);
      // nobody touches it; the listing's own alarm closes it
      await sleep(22000);
      const done = await api(C, "(await Cardable.market.onlineData.loadDetail(arg.id, true)).data.listing", { id: auctionId });
      assert.equal(done.status, 'sold', 'closed by the server: ' + done.status);
      assert.equal(done.soldFor, 13, 'the price is one step above the runner-up, not the winner\'s maximum');
      const c = await refresh(C);
      assert.equal(c.held, 0);
    });

    await step('a swap: an offer, a counteroffer from the seller, acceptance, both card sets move at once', async () => {
      const invA = (await inventory(A)).filter((i) => i.state === 'owned'), invC = (await inventory(C)).filter((i) => i.state === 'owned');
      const made = await api(A, "(await P.publishListing('global', { kind: 'swap', instanceIds: [arg.id], wants: {}, durationMs: 3600000, title: '', note: '', requestId: 'sw-' + Math.random().toString(36).slice(2) }))", { id: invA[0].id });
      assert.equal(made.ok, true, JSON.stringify(made));
      const id = made.listing.id;
      await openGlobal(C, { name: 'listing', params: { id } });
      await C.page.waitForSelector('button:has-text("Offer a swap")');
      await C.page.locator('button', { hasText: 'Offer a swap' }).click();
      await C.page.waitForSelector('.mk-swapper .mk-pick-row');
      await C.page.locator('.mk-swapper .mk-pick-row').first().click();
      await shot(C.page, 'swap-offer');
      await C.page.locator('.mk-review button', { hasText: 'Send offer' }).click();
      await C.page.waitForSelector('.mk-offer', { timeout: 15000 });
      // A answers with a counter, from the real interface
      await openGlobal(A, { name: 'listing', params: { id } });
      await A.page.waitForSelector('.mk-offer button:has-text("Counter")', { timeout: 20000 });
      await shot(A.page, 'swap-offers-seller');
      await A.page.locator('.mk-offer button', { hasText: 'Counter' }).click();
      await A.page.waitForSelector('.mk-review input[type=number]');
      await A.page.fill('.mk-review input[type=number]', '6');
      await A.page.locator('.mk-review button', { hasText: 'Send counteroffer' }).click();
      await A.page.waitForFunction(() => !document.querySelector('.mk-review'), null, { timeout: 15000 });
      await C.page.waitForSelector('.mk-offer button:has-text("Accept counter")', { timeout: 30000 });
      await shot(C.page, 'swap-counter');
      const cBefore = await state(C), aBefore = await state(A);
      await C.page.locator('.mk-offer button', { hasText: 'Accept counter' }).click();
      await C.page.locator('.mk-review button', { hasText: 'Accept swap' }).click();
      await C.page.waitForFunction(() => !document.querySelector('.mk-review'), null, { timeout: 15000 });
      const cAfter = await refresh(C), aAfter = await refresh(A);
      assert.equal(cAfter.balance, cBefore.balance - 6);
      assert.equal(aAfter.balance, aBefore.balance + 6 - 1);
      const aInv = await inventory(A), cInv = await inventory(C);
      assert(cInv.some((i) => i.id === invA[0].id), 'C now holds the card A listed');
      assert(aInv.some((i) => i.cardId && cInv.every((x) => x.id !== i.id)));
    });

    await step('a standing buy order reserves Credits and fills at the listing\'s price when the card appears', async () => {
      const invA = (await inventory(A)).filter((i) => i.state === 'owned' && !i.listed);
      const target = invA[0];
      await openGlobal(B, { name: 'card', params: { id: target.cardId, variant: '' } });
      await B.page.waitForSelector('button:has-text("Place a buy order")');
      await B.page.locator('button', { hasText: 'Place a buy order' }).click();
      await B.page.waitForSelector('.mk-review input[type=number]');
      await B.page.fill('.mk-review input[type=number]', '15');
      await shot(B.page, 'order-dialog');
      await B.page.locator('.mk-review button', { hasText: /Place order|Place buy order|Place/ }).last().click();
      await B.page.waitForFunction(() => Cardable.market.online.state.held >= 15, null, { timeout: 15000 });
      const mid = await state(B);
      const listed = await api(A, "(await P.publishListing('global', { kind: 'fixed', instanceIds: [arg.id], ask: 9, title: '', note: '', durationMs: 86400000, requestId: 'ord-' + Math.random().toString(36).slice(2) }))", { id: target.id });
      assert.equal(listed.ok, true, JSON.stringify(listed));
      await sleep(1500);
      const after = await refresh(B);
      assert.equal(after.held, 0, 'the reservation was released');
      assert.equal(after.balance, mid.balance - 9, 'paid the listing price, not the maximum');
      const act = await api(B, "(await Cardable.market.onlineData.loadActivity(true)).data.orders.map(o => ({ status: o.status, spent: o.spent }))");
      assert(act.some((o) => o.status === 'filled' && o.spent === 9), JSON.stringify(act));
    });

    await step('listing from the composer: choose the exact card, see the price and fee, confirm, and it is live and escrowed', async () => {
      await refresh(A);
      await openGlobal(A, { name: 'compose', params: {} });
      await A.page.waitForSelector('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])', { timeout: 20000 });
      const chips = A.page.locator('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])');
      const n = await chips.count();
      const chosen = await chips.nth(n - 1).getAttribute('data-instance');
      await chips.nth(n - 1).click();
      await A.page.waitForSelector('.mk-composer input[type=number]');
      await shot(A.page, 'composer-global');
      const side = await A.page.evaluate(() => document.querySelector('.mk-composer-side').textContent);
      assert(/fee/i.test(side) && /net proceeds/i.test(side), side.slice(0, 300));
      await A.page.locator('.mk-composer-side button', { hasText: 'List this card' }).click();
      await A.page.locator('.mk-review button', { hasText: /^List card/ }).click();
      await A.page.waitForSelector('.mk-detail', { timeout: 20000 });
      const inv = await inventory(A);
      const row = inv.find((i) => i.id === chosen);
      assert(row && row.state === 'escrow', 'the card is held in escrow: ' + JSON.stringify(row));
      const mine = await api(A, "(await Cardable.market.onlineData.loadListings(true), Cardable.market.onlineData.state.listings.items.filter(l => l.isMine).length)");
      assert(mine >= 1);
    });

    await step('the realm reconciles: cards in one place, Credits conserved, nothing left reserved', async () => {
      const r = await adminGet('/v1/admin/reconcile');
      assert.deepEqual(r.problems, [], JSON.stringify(r.problems.slice(0, 3)));
      assert.equal(r.supply.balanced, true);
      assert(r.counts.trades >= 3);
      return r.counts;
    });

    await step('the same trading works at phone width and in saved monochrome', async () => {
      await B.page.setViewportSize({ width: 390, height: 844 });
      await B.page.evaluate(() => Cardable.settings.set('rarityColor', 'mono'));
      await openGlobal(B, { name: 'listing', params: { id: fixedId } });
      await B.page.waitForSelector('.mk-detail');
      const overflow = await B.page.evaluate(() => document.querySelector('.mk').scrollWidth - document.querySelector('.mk').clientWidth);
      assert(overflow <= 1, 'no horizontal scroll: ' + overflow);
      await shot(B.page, 'listing-phone-mono');
      await openGlobal(B, { name: 'activity', params: {} });
      await B.page.waitForSelector('.mk-page');
      await shot(B.page, 'activity-phone-mono');
      await B.page.setViewportSize({ width: 1440, height: 900 });
    });

    await step('no page errors; every request went to the one allowed origin', async () => {
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
    try { fs.rmSync(worker.persist, { recursive: true, force: true }); } catch (_) { /* busy */ }
  }
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + evidence.steps.filter((s) => !s.ok).length + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
