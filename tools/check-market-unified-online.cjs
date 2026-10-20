'use strict';
// Cardable Market Beta, Stage 5: three players in three independent browser profiles trade through the real interface
// against a LOCAL Worker (local D1 and Durable Objects; nothing leaves this machine). It drives: selling cards to the
// system for the first Credits, a fixed sale, a timed auction that is outbid and then closes on the server's clock, a
// swap with a counteroffer, a standing buy order that fills when a card is listed, and the realm's own reconciliation.
//   node tools/check-market-trading-browser.cjs [--out qa-output/market-unified]
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
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-unified');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], requests: 0 };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 13000 + crypto.randomInt(0, 5000) * 2, WEB_PORT = API_PORT + 1, API = 'http://127.0.0.1:' + API_PORT;
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
      if (path.basename(file) === 'index.html') data = Buffer.from(data.toString().replace(/connect-src [^;]*;/, 'connect-src ' + API + ';'));
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(WEB_PORT, '127.0.0.1', () => resolve(server)); });
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 900) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 4).join('\n     ')); throw error; }
}
const shot = async (page, name) => { await new Promise((r) => setTimeout(r, 600)); return page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (text) => Number(String(text).replace(/[^0-9]/g, '')) || 0;

async function player(browser, label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(api => { window.__CARDABLE_MARKET_API__ = api; }, API);
  const page = await context.newPage();
  page.on('pageerror', e => evidence.pageErrors.push({ label, text: String(e).slice(0, 500) }));
  await page.goto('http://127.0.0.1:' + WEB_PORT + '/index.html?dev=1');
  await page.waitForFunction(() => window.Cardable?.market?.sync && Cardable.state.current);
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(C.state.encode(C.state.current)); s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter(c => !c.retired && c.pullable !== false);
    s.inventory = cards.slice(0, 12).map((c, i) => ({ instanceId: C.randomId('card'), cardId: c.id, variantId: null, cardSkinId: null, serial: C.serial.format(s.playerCode, i + 1), packId: 'standard', pulledAt: Date.now(), seen: true }));
    s.serialCounter = 12; s.currency = 1000000; C.state.commit(s); C.market.store.markGuideSeen();
  });
  await page.reload(); await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
  return { context, page, label };
}
const summary = p => p.page.evaluate(() => { const C = Cardable, u = C.market.sync; return { balance: C.state.current.currency, cards: C.state.current.inventory.map(i => ({ id: i.instanceId, serial: i.serial, cardId: i.cardId })), sync: u.state, ready: u.ready() }; });
async function uiLink(p) {
  await p.page.evaluate(() => Cardable.market.ui.online.connectDialog());
  await p.page.getByRole('button', { name: 'Create a private account', exact: true }).click();
  await p.page.waitForSelector('.mk-recovery');
  // Recovery credential stays in this disposable context; never log or capture it.
  p.recoveryCode = await p.page.locator('.mk-recovery').textContent();
  await p.page.locator('.mk-online label.mk-toggle').click();
  await p.page.getByRole('button', { name: 'Done', exact: true }).click();
  await p.page.waitForFunction(() => Cardable.market.sync.ready(), null, { timeout: 30000 });
}
async function invoke(p, fn, arg) { return p.page.evaluate(fn, arg); }
(async () => {
  let worker, web, browser, failure;
  try {
    worker = await startWorker(); web = await serveGame(); browser = await chromium.launch({ headless: true });
    const A = await player(browser, 'seller'), B = await player(browser, 'buyer');
    let migratedId, retainedSerial;
    await step('unlinked market hides players and offline listing survives automatic publication', async () => {
      const result = await invoke(A, async () => {
        const C = Cardable; C.marketSim.ensure(true); C.marketSim.runtime.pause();
        const listed = await C.market.api.publishListing('unified', { kind: 'fixed', instanceIds: [C.state.current.inventory[0].instanceId], ask: 999999, title: 'Retained terms', durationMs: 86400000, requestId: 'offline-listing-fixture' });
        return { listed, serial: C.state.current.inventory[0].serial, effective: C.market.api.effectiveRealm(), linked: C.market.sync.isLinked() };
      });
      assert.equal(result.linked, false); assert.equal(result.effective, 'simulation'); assert.equal(result.listed.ok, true, JSON.stringify(result));
      retainedSerial = result.serial;
      await uiLink(A);
      const got = await invoke(A, async () => { const C = Cardable, list = await C.market.online.authed('GET', '/v1/listings?mine=1&limit=100'); return { list, u: C.state.current.unified }; });
      assert.equal(got.u.pendingListings.length, 0); assert.equal(got.u.publishedListings.length, 1);
      migratedId = got.u.publishedListings[0].listingId;
      const detail = await invoke(A, id => Cardable.market.online.authed('GET', '/v1/listings/' + id), migratedId);
      assert.equal(detail.listing.ask, 999999); assert.equal(detail.listing.title, 'Retained terms');
    });
    await step('UI linking merges one wallet and exact collection once, reload retains it', async () => {
      await uiLink(B);
      for (const p of [A, B]) {
        const before = await summary(p); assert.equal(before.balance, 1000000); assert.equal(before.cards.length, 12);
        await invoke(p, () => Cardable.market.sync.sync());
        assert.equal((await summary(p)).balance, 1000000);
        await p.page.reload(); await p.page.waitForFunction(() => Cardable.market.sync.ready(), null, { timeout: 30000 });
        const after = await summary(p); assert.equal(after.balance, before.balance); assert.deepEqual(after.cards, before.cards);
      }
    });
    await step('linked Browse loads a cold feed and keeps focused search input during background updates', async () => {
      await invoke(A, () => { Cardable.market.onlineData.reset(); Cardable.market.open({ name: 'discover', params: {} }); });
      try { await A.page.waitForSelector('.mk-grid .mk-tile', { timeout: 15000 }); }
      catch (error) { await shot(A.page, 'cold-feed-failure'); console.log(await invoke(A, () => ({ effective: Cardable.market.api.effectiveRealm(), sync: Cardable.market.sync.state, online: Cardable.market.online.state.status, listingCount: Cardable.market.onlineData.state.listings.items && Cardable.market.onlineData.state.listings.items.length, loading: !!Cardable.market.onlineData.state.listings.loading, error: Cardable.market.onlineData.state.listings.error, page: document.querySelector('.mk-main') && document.querySelector('.mk-main').textContent.slice(0, 500) }))); throw error; }
      await A.page.locator('.mk-search-input').fill('GeForce');
      await invoke(A, () => Cardable.market.onlineData.loadListings(true));
      await A.page.waitForTimeout(500);
      assert.equal(await A.page.locator('.mk-search-input').inputValue(), 'GeForce');
      assert.equal(await A.page.locator('.mk-search-input').evaluate(el => document.activeElement === el), true);
      await A.page.locator('.mk-search-input').fill('');
      await invoke(A, () => Cardable.market.ui.shell.close());
    });
    let auctionId, auctionCard;
    await step('two linked players bid then buy out the exact shared copy with server fee', async () => {
      auctionCard = await invoke(A, () => { const i = Cardable.state.current.inventory.find(i => !Cardable.marketSim.lockOf(i.instanceId)); return { id: i.instanceId, serial: i.serial, cardId: i.cardId }; });
      const listed = await invoke(A, async id => Cardable.market.onlineProvider.publishListing('global', { kind: 'auction', instanceIds: [id], start: 10, reserve: 20, buyout: 100, title: 'Shared auction fixture', durationMs: 86400000, requestId: 'unified-auction-fixture' }), auctionCard.id);
      assert.equal(listed.ok, true, JSON.stringify(listed)); auctionId = listed.listing.id;
      const bid = await invoke(B, id => Cardable.market.onlineProvider.placeBid('global', id, 30, 'unified-bid-fixture'), auctionId);
      assert.equal(bid.ok, true, JSON.stringify(bid)); assert.equal((await summary(B)).sync.held, 30);
      const bought = await invoke(B, id => Cardable.market.onlineProvider.buyout('global', id, 'unified-buyout-fixture', 100), auctionId);
      assert.equal(bought.ok, true, JSON.stringify(bought));
      await invoke(A, () => Cardable.market.sync.sync());
      assert.equal((await summary(B)).balance, 999900); assert.equal((await summary(A)).balance, 1000098);
      assert((await summary(B)).cards.some(i => i.id === auctionCard.id)); assert(!(await summary(A)).cards.some(i => i.id === auctionCard.id));
      const retained = (await summary(A)).cards.find(i => i.serial === retainedSerial);
      assert.ok(retained, 'the migrated listing still owns the same copy');
      const locked = await invoke(A, id => Cardable.marketSim.lockOf(id), retained.id); assert.ok(locked);
    });
    await step('offline Quick Sell and Shop keep exact progress, then reconnect journal into shared state', async () => {
      await B.context.route(API + '/**', route => route.abort('internetdisconnected'));
      await invoke(B, () => Cardable.market.sync.sync().catch(() => null));
      const local = await invoke(B, async () => {
        const C = Cardable, sale = C.sales.sell([C.state.current.inventory.find(i => !C.marketSim.lockOf(i.instanceId)).instanceId], { strict: true });
        C.shopState.ensure();
        const day = C.state.current.shop.days.find(x => x.dayKey === C.shopState.dayKey(C.clock.now()));
        const offer = day.offers.find(x => !x.purchased && x.price < C.state.current.currency);
        const bought = offer && C.shopPurchase.buyCard(Object.assign({ dayKey: day.dayKey }, offer));
        return { sale, bought, balance: C.state.current.currency, serials: C.state.current.inventory.map(i => i.serial).sort(), pending: C.market.sync.state.pending };
      });
      assert.equal(local.sale.ok, true, JSON.stringify(local.sale)); assert.equal(local.bought.ok, true, JSON.stringify(local.bought)); assert.ok(local.pending >= 2);
      await B.page.reload(); await B.page.waitForFunction(() => Cardable.market.sync.isLinked());
      assert.equal((await summary(B)).balance, local.balance);
      await B.context.unroute(API + '/**');
      await invoke(B, () => Cardable.market.online.refresh(true).then(() => Cardable.market.sync.flush()));
      const after = await summary(B); assert.equal(after.balance, local.balance); assert.deepEqual(after.cards.map(i => i.serial).sort(), local.serials); assert.equal(after.sync.pending, 0);
    });
    await step('lost sync reply retries durable operations without duplicate Credits', async () => {
      let lost = false;
      await B.context.route(API + '/v1/game/sync', async route => { if (!lost) { lost = true; await route.fetch(); await route.abort('failed'); } else await route.continue(); });
      const result = await invoke(B, async () => {
        const C = Cardable; const s = JSON.parse(C.state.encode(C.state.current)); C.currency.applyInto(s, 7, 'dev'); C.state.commit(s);
        await C.market.sync.sync().catch(() => null); return { balance: C.state.current.currency, pending: C.market.sync.state.pending };
      });
      assert.ok(lost); assert.ok(result.pending > 0);
      await B.context.unroute(API + '/v1/game/sync'); await invoke(B, () => Cardable.market.sync.flush());
      assert.equal((await summary(B)).balance, result.balance); assert.equal((await summary(B)).sync.pending, 0);
    });
    await step('a lost player mutation reply stays reserved across offline restart and replays once', async () => {
      let lost = false;
      await B.context.route(API + '/v1/listings', async route => { if (!lost && route.request().method() === 'POST') { lost = true; await route.fetch(); await route.abort('failed'); } else await route.continue(); });
      const uncertain = await invoke(B, async () => {
        const C = Cardable, item = C.state.current.inventory.find(i => !C.marketSim.lockOf(i.instanceId));
        const result = await C.market.onlineProvider.publishListing('global', { kind: 'fixed', instanceIds: [item.instanceId], ask: 999999, title: 'Uncertain mutation fixture', durationMs: 86400000, requestId: 'uncertain-mutation-fixture' });
        return { result, id: item.instanceId, balance: C.state.current.currency, key: C.state.current.unified.actionRequest && C.state.current.unified.actionRequest.key };
      });
      assert.ok(lost); assert.equal(uncertain.result.ok, false); assert.ok(uncertain.key);
      await B.context.route(API + '/**', route => route.abort('internetdisconnected'));
      await B.page.reload(); await B.page.waitForFunction(() => Cardable.market.sync && Cardable.state.current.unified);
      const reserve = await invoke(B, id => ({ held: Cardable.marketSim.heldCredits(), locked: Cardable.marketSim.lockOf(id), key: Cardable.state.current.unified.actionRequest.key }), uncertain.id);
      assert.equal(reserve.held, uncertain.balance); assert.ok(reserve.locked); assert.equal(reserve.key, uncertain.key);
      await B.context.unroute(API + '/**'); await B.context.unroute(API + '/v1/listings');
      await invoke(B, () => Cardable.market.online.refresh(true).then(() => Cardable.market.sync.flush()));
      const reconciled = await invoke(B, async () => ({ request: !!Cardable.state.current.unified.actionRequest, balance: Cardable.state.current.currency, listings: (await Cardable.market.online.authed('GET', '/v1/listings?mine=1&limit=100')).items.filter(i => i.title === 'Uncertain mutation fixture').length }));
      assert.equal(reconciled.request, false); assert.equal(reconciled.balance, uncertain.balance); assert.equal(reconciled.listings, 1);
    });
    await step('active device transfer and recovery preserve the shared collection without another wallet merge', async () => {
      const before = await summary(B);
      const receiver = await player(browser, 'receiver');
      const receivingDevice = await invoke(receiver, () => Cardable.market.sync.deviceId());
      await invoke(B, id => Cardable.market.sync.transfer(id), receivingDevice);
      const error = await invoke(B, () => Cardable.market.sync.sync().then(() => null, e => ({ code: e.code, message: e.message })));
      assert.equal(error.code, 'device-mismatch'); assert.equal((await summary(B)).balance, before.balance);
      await invoke(receiver, code => Cardable.market.online.recover(code), B.recoveryCode);
      const after = await summary(receiver);
      assert.equal(after.balance, before.balance); assert.deepEqual(after.cards, before.cards);
      assert.equal(after.sync.deviceId, receivingDevice); assert.equal(after.ready, true);
      assert.equal(await invoke(receiver, () => !!Cardable.state.current.unified.localBackup), true);
    });
    await step('recovery from a lost device requires explicit confirmation and restores the last synced collection', async () => {
      const rescue = await player(browser, 'rescue'), before = await summary(B);
      await invoke(rescue, () => Cardable.market.ui.online.recoverDialog());
      await rescue.page.getByLabel('Recovery code', { exact: true }).fill(B.recoveryCode);
      await rescue.page.getByRole('button', { name: 'Reconnect', exact: true }).click();
      const restore = rescue.page.getByRole('button', { name: 'Restore last synced state', exact: true });
      await restore.waitFor(); assert.equal(await restore.isEnabled(), false);
      assert.equal((await summary(rescue)).balance, 1000000, 'no implicit replacement on sign-in');
      await rescue.page.getByText('I understand and want to move play to this device', { exact: true }).click();
      assert.equal(await rescue.page.getByLabel('I understand and want to move play to this device', { exact: true }).isChecked(), true);
      await restore.click();
      await rescue.page.waitForFunction(() => Cardable.market.sync.ready());
      const after = await summary(rescue);
      assert.equal(after.balance, before.balance); assert.deepEqual(after.cards, before.cards);
      assert.equal(await invoke(rescue, () => !!Cardable.state.current.unified.localBackup), true);
    });
    await invoke(A, () => Cardable.market.open({ name: 'discover', params: {} })); await shot(A.page, 'unified-linked-market');
    assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors));
  } catch (e) { failure = e; evidence.error = String(e.stack || e); }
  finally {
    evidence.ok = !failure; fs.writeFileSync(path.join(out, 'unified-online.json'), JSON.stringify(evidence, null, 2));
    if (browser) await browser.close(); if (web) await new Promise(r => web.close(r));
    if (worker) { if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(worker.child.pid), '/t', '/f'], { stdio: 'ignore' }); } catch (_) {} } else worker.child.kill(); }
  }
  if (failure) { console.error(failure.stack); process.exitCode = 1; }
})();

