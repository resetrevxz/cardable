'use strict';
// Cardable Market Beta, Stage 4: headless browser check of the online beta client against a LOCAL Worker.
// Starts `wrangler dev --local` (local D1 and Durable Objects, no Cloudflare network), serves the game over http with a
// connect-src that allows only that one local origin, and drives: connect, recovery code, the empty Global Market,
// the one-time collection conversion with its receipt, a reload, an unreachable service, and that the offline game and
// Simulation are untouched throughout. It also proves what is and is not sent over the wire.
//   node tools/check-market-online-browser.cjs [--out qa-output/market-beta/stage-4]
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
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-4');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], requests: [] };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 8795, WEB_PORT = 8796;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };

async function startWorker() {
  const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-online-'));
  execFileSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + secret, '--var', 'ENVIRONMENT:test', '--var', 'REGISTER_PER_HOUR:500'],
    { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch('http://127.0.0.1:' + API_PORT + '/v1/status'); if (r.ok) return { child, persist }; } catch (_) { /* waiting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill(); throw new Error('the local Worker did not start');
}
function serveGame() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root) || file.includes(path.sep + 'node_modules' + path.sep) || file.includes(path.sep + '.git' + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      if (path.basename(file) === 'index.html') data = Buffer.from(data.toString().replace(/connect-src [^;]*;/, 'connect-src http://127.0.0.1:' + API_PORT + ';'));
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(WEB_PORT, '127.0.0.1', () => resolve(server)));
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 700) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 3).join('\n     ')); throw error; }
}
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 });

(async () => {
  const worker = await startWorker();
  const web = await serveGame();
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await context.addInitScript('window.__CARDABLE_MARKET_API__ = "http://127.0.0.1:' + API_PORT + '";');
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
    page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:' + WEB_PORT) && !/^(data|blob):/.test(u)) evidence.requests.push({ method: r.method(), url: u.replace(/\?.*/, ''), body: (r.postData() || '').length > 200 ? '[' + r.postData().length + ' bytes]' : r.postData() }); });
    await page.goto('http://127.0.0.1:' + WEB_PORT + '/index.html');
    await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.online);
    await page.evaluate(() => {
      const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
      s.tutorial = { step: 'done', done: true };
      const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
      for (let i = 0; i < 14; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[i * 3 % cards.length].id, variantId: i % 5 === 4 ? 'rainbow-holo' : null, serial: C.serial.format(s.playerCode, 100 + i), pulledAt: Date.UTC(2026, 4, 1) + i * 60000, seen: true });
      s.serialCounter = 200; s.stats.packsOpened = 40; s.currency = 321; C.state.commit(s);
    });
    await page.reload();
    await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
    const offlineBefore = await page.evaluate(() => ({ currency: Cardable.state.current.currency, ids: Cardable.state.current.inventory.map((i) => i.instanceId).sort(), count: Cardable.state.current.inventory.length }));

    await step('Global Market is not connected until you choose it, and says so', async () => {
      await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.store.setRealm('global'); Cardable.market.open({ name: 'discover', params: {} }); });
      await page.waitForSelector('.mk-empty');
      const text = await page.evaluate(() => document.querySelector('.mk-empty').textContent);
      assert(/Connect to see Global Market/.test(text), text);
      const sent = evidence.requests.filter((r) => r.url.includes('/v1/auth')).length;
      assert.equal(sent, 0, 'nothing was sent before the player chose to connect');
      await shot(page, 'global-signed-out');
    });

    await step('connecting creates a private account, shows the two word name and the recovery code once', async () => {
      await page.locator('.mk-empty button', { hasText: 'Connect to Global Market' }).click();
      await page.waitForSelector('.mk-online');
      await shot(page, 'connect-dialog');
      await page.locator('.mk-online button', { hasText: 'Create a private account' }).click();
      await page.waitForSelector('.mk-recovery');
      const alias = await page.evaluate(() => Cardable.market.online.state.alias);
      assert.match(alias, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
      const code = await page.evaluate(() => document.querySelector('.mk-recovery').textContent);
      assert.match(code, /^[2-9A-Z]{5}(-[2-9A-Z]{5}){3}$/);
      await shot(page, 'recovery-code');
      assert((await page.locator('.mk-online button', { hasText: 'Done' }).isDisabled()), 'Done waits for the acknowledgement');
      await page.locator('.mk-online label.mk-toggle').click();
      await page.locator('.mk-online button', { hasText: 'Done' }).click();
      await page.waitForSelector('.mk-online', { state: 'detached' });
      return { alias };
    });

    await step('the connected Global Market is empty on purpose and has a wallet of zero', async () => {
      await page.waitForFunction(() => Cardable.market.online.state.status === 'online');
      await page.waitForSelector('.mk-empty');
      const text = await page.evaluate(() => document.querySelector('.mk-empty').textContent);
      assert(/No one is selling yet/.test(text), text);
      const wallet = await page.evaluate(() => document.querySelector('.mk-wallet').textContent);
      assert(/0/.test(wallet), wallet);
      const badge = await page.evaluate(() => document.querySelector('.mk-sim-chip').textContent);
      assert(/Online/.test(badge), 'the island says Global is online: ' + badge);
      await shot(page, 'global-empty');
    });

    await step('the offline Simulation still works alongside it', async () => {
      await page.evaluate(() => Cardable.market.store.setRealm('simulation'));
      await page.waitForFunction(() => document.querySelectorAll('.mk-tile').length > 5);
      const wallet = await page.evaluate(() => document.querySelector('.mk-wallet').textContent);
      assert(/321/.test(wallet), 'offline Credits shown: ' + wallet);
      await page.evaluate(() => Cardable.market.store.setRealm('global'));
    });

    await step('converting the collection: export, preview, convert once, receipt; the offline cards are unchanged', async () => {
      await page.evaluate(() => Cardable.market.ui.go('settings', {}, { reset: true }));
      await page.waitForSelector('.mk-onlinebox');
      await shot(page, 'settings-online');
      await page.locator('.mk-onlinebox button', { hasText: 'Convert my collection' }).click();
      await page.waitForSelector('.mk-online');
      const next = page.locator('.mk-online button', { hasText: 'Review what would convert' });
      assert(await next.isDisabled(), 'preview waits for a backup');
      const download = page.waitForEvent('download');
      await page.locator('.mk-online button', { hasText: 'Export a backup of my save' }).click();
      const file = await download;
      assert(/cardable-save/.test(file.suggestedFilename()));
      await next.click();
      await page.waitForSelector('.mk-importlist');
      const summary = await page.evaluate(() => document.querySelector('.mk-online-body > p').textContent);
      assert(/14 cards can convert/.test(summary), summary);
      await shot(page, 'import-preview');
      await page.locator('.mk-online button', { hasText: 'Convert 14 cards' }).click();
      await page.waitForFunction(() => /Receipt/.test(document.querySelector('.mk-online').textContent));
      const receipt = await page.evaluate(() => Cardable.market.online.receipt());
      assert.equal(receipt.count, 14); assert(receipt.signature.length > 20);
      await shot(page, 'import-receipt');
      await page.locator('.mk-online button', { hasText: 'Done' }).click();
      const after = await page.evaluate(() => ({ currency: Cardable.state.current.currency, ids: Cardable.state.current.inventory.map((i) => i.instanceId).sort(), count: Cardable.state.current.inventory.length }));
      assert.deepEqual(after, offlineBefore, 'offline Credits and cards untouched');
      await page.waitForFunction(() => Cardable.market.online.state.inventoryTotal === 14);
    });

    await step('what went over the wire: no Credits, no tokens in URLs, only the allowed origin', async () => {
      const urls = evidence.requests.map((r) => r.url);
      assert(urls.length > 4);
      assert(urls.every((u) => u.startsWith('http://127.0.0.1:' + API_PORT + '/v1/')), JSON.stringify(urls.filter((u) => !u.startsWith('http://127.0.0.1:' + API_PORT))));
      assert(!evidence.requests.some((r) => /token|Bearer|secret/i.test(r.url)));
      const preview = await page.evaluate(() => JSON.stringify(Cardable.market.online.packageFromSave()));
      assert(!/currency|wallet|settings|photo/i.test(preview), 'the package carries card identity only');
    });

    await step('a reload keeps the private session without asking again', async () => {
      await page.reload();
      await page.waitForFunction(() => Cardable.market.online.state.status === 'online', null, { timeout: 20000 });
      const s = await page.evaluate(() => ({ alias: Cardable.market.online.state.alias, imported: Cardable.market.online.state.imported, total: Cardable.market.online.state.inventoryTotal }));
      assert(s.alias && s.imported && s.total === 14, JSON.stringify(s));
    });

    await step('an unreachable service is a quiet offline state, and the offline game carries on', async () => {
      worker.child.kill();
      await new Promise((r) => setTimeout(r, 800));
      await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.store.setRealm('global'); Cardable.market.open({ name: 'discover', params: {} }); });
      await page.evaluate(() => Cardable.market.online.refresh(true));
      await page.waitForFunction(() => Cardable.market.online.state.status === 'offline');
      await page.waitForSelector('.mk-empty');
      const text = await page.evaluate(() => document.querySelector('.mk-empty').textContent);
      assert(/unreachable/i.test(text), text);
      await shot(page, 'global-offline');
      const save = await page.evaluate(() => ({ currency: Cardable.state.current.currency, count: Cardable.state.current.inventory.length }));
      assert.deepEqual(save, { currency: offlineBefore.currency, count: offlineBefore.count });
      await page.evaluate(() => Cardable.market.store.setRealm('simulation'));
      await page.waitForFunction(() => document.querySelectorAll('.mk-tile').length > 5);
    });

    await step('no page errors; the only console messages are the expected network failure', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors));
      const unexpected = evidence.console.filter((c) => !/Failed to load resource|net::ERR|ERR_CONNECTION/i.test(c.text));
      assert.equal(unexpected.length, 0, JSON.stringify(unexpected));
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
