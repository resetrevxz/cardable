'use strict';
// Cardable Market Beta 1.0.0, Stage 8: the acceptance check that crosses features.
// One local Worker (local D1 / Durable Objects / R2, no Cloudflare network) and the real game over http. It walks the
// journeys that no single stage check covers: a brand-new profile, an old save through migration and the one-time online
// import (with photos and locked cards), a paused and a read-only service seen from the client, the Help & feedback page,
// and a sweep of every route across viewports, color and monochrome, quality tiers and reduced motion.
//   node tools/check-market-acceptance-browser.cjs [--out qa-output/market-beta/stage-8] [--quick]
// Headless: it never opens a window on the desktop.
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
const quick = args.includes('--quick');
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-8');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], sweep: [] };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 8797, WEB_PORT = 8798;
const ADMIN = crypto.randomBytes(24).toString('hex');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm' };

async function startWorker() {
  const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-accept-'));
  execFileSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + secret, '--var', 'ENVIRONMENT:test',
    '--var', 'ADMIN_TOKEN:' + ADMIN, '--var', 'REGISTER_PER_HOUR:1000', '--var', 'API_RATE_LIMIT:100000', '--var', 'CORS_ALLOW:http://127.0.0.1:' + WEB_PORT], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch('http://127.0.0.1:' + API_PORT + '/v1/status'); if (r.ok) return { child, persist }; } catch (_) { /* waiting */ }
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
      if (path.basename(file) === 'index.html') data = Buffer.from(data.toString().replace(/connect-src [^;]*;/, 'connect-src http://127.0.0.1:' + API_PORT + ';'));
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(WEB_PORT, '127.0.0.1', () => resolve(server)));
}
async function admin(method, route, body) {
  const res = await fetch('http://127.0.0.1:' + API_PORT + route, { method, headers: { 'x-admin-token': ADMIN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return (await res.json()).data;
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 900) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 4).join('\n     ')); throw error; }
}
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 78 });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: options.dpr || 1, acceptDownloads: true, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  await context.addInitScript('window.__CARDABLE_MARKET_API__ = "http://127.0.0.1:' + API_PORT + '";');
  if (options.save) await context.addInitScript('try { if (!localStorage.getItem("cardable.save")) localStorage.setItem("cardable.save", ' + JSON.stringify(options.save) + '); } catch (e) {}');
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300), where: options.label || '' }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300), where: options.label || '' }));
  await page.goto('http://127.0.0.1:' + WEB_PORT + '/index.html');
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.online && Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading, null, { timeout: 30000 }).catch(async (e) => {
    const d = await page.evaluate(() => ({ hasCardable: !!window.Cardable, state: !!(window.Cardable && Cardable.state && Cardable.state.current), market: !!(window.Cardable && Cardable.market), online: !!(window.Cardable && Cardable.market && Cardable.market.online), pref: !!(window.Cardable && Cardable.preferences && Cardable.preferences.initialized), loading: !!(window.Cardable && Cardable.setup && Cardable.setup.loading), recovery: window.Cardable && Cardable.state && JSON.stringify(Cardable.state.recovery || null).slice(0, 300), body: document.body.innerText.slice(0, 300) }));
    throw new Error('boot stalled: ' + JSON.stringify(d) + ' errors ' + JSON.stringify(evidence.pageErrors.slice(0, 2)) + JSON.stringify(evidence.console.slice(0, 2)));
  });
  return { context, page };
}
// A save with cards, ready for the Market: tutorial done, a spread of rarities and finishes.
async function seed(page, count) {
  await page.evaluate((n) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    for (let i = 0; i < n; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 3) % cards.length].id, variantId: i % 5 === 4 ? 'rainbow-holo' : null, serial: C.serial.format('ACPT', i + 1), pulledAt: Date.now() - i * 1000, seen: true });
    s.serialCounter = 200; s.currency = 321; C.state.commit(s);
  }, count);
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen(), null, { timeout: 30000 });
}
async function openMarket(page, route) {
  await page.evaluate((r) => { Cardable.market.store.markGuideSeen(); Cardable.market.open(r || { name: 'discover', params: {} }); }, route);
  await page.waitForSelector('.mk-page');
  await page.waitForTimeout(350);
}

(async () => {
  const worker = await startWorker();
  const web = await serveGame();
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    // ---- journey 1: a brand-new offline profile ----
    await step('a brand-new profile opens a pack, keeps the card with its exact serial and is paid nothing', async () => {
      const { context, page } = await boot(browser, { label: 'new-profile' });
      const r = await page.evaluate(async () => {
        const C = Cardable, sleep = (ms) => new Promise((x) => setTimeout(x, ms));
        const waitFor = async (what, p) => { const until = performance.now() + 20000; while (!p()) { if (performance.now() > until) throw new Error('timed out: ' + what + ' phase=' + C.opening.phase); await sleep(40); } };
        const start = { currency: C.state.current.currency, inventory: C.state.current.inventory.length, opened: C.state.current.stats.packsOpened };
        if (C.tutorial && C.tutorial.skipButton) C.tutorial.skipButton.click();
        C.settings.applyPreset('very-low'); C.settings.set('cutscenes', 'off');
        await waitFor('idle', () => C.opening.phase === 'idle' && !C.inventory.active);
        if (!C.opening.openNow('standard')) throw new Error('the pack did not begin');
        await waitFor('cutting', () => C.opening.phase === 'cutting');
        C.opening.finishCut();
        await waitFor('revealed', () => C.opening.phase === 'revealed' && !C.opening.keepButton.hidden);
        const card = JSON.parse(JSON.stringify(C.state.current.pendingReveal.cards[0]));
        C.opening.keepCurrent();
        await waitFor('kept', () => C.state.current.pendingReveal === null);
        const kept = C.state.current.inventory.find((i) => i.instanceId === card.instanceId);
        const q = kept ? C.sales.quote(kept) : null;
        return { start, end: { currency: C.state.current.currency, inventory: C.state.current.inventory.length, opened: C.state.current.stats.packsOpened }, serialShown: card.serial, serialKept: kept && kept.serial, quote: q && q.quote, fair: q && q.fair };
      });
      assert.equal(r.end.inventory, r.start.inventory + 1);
      assert.equal(r.end.opened, r.start.opened + 1);
      assert.equal(r.end.currency, r.start.currency, 'opening a pack paid nothing: ' + JSON.stringify(r));
      assert(r.serialShown && r.serialShown === r.serialKept, 'the kept card keeps the exact serial shown: ' + JSON.stringify(r));
      assert(r.quote > 0 && r.quote < r.fair, 'Quick Sell pays less than the card is worth: ' + JSON.stringify(r));
      await context.close();
      return r;
    });

    // ---- journey 2: an old save, migrated, then the one-time online import ----
    let legacyJson = null;
    await step('an old save (duplicates, finishes, a locked card, favorites, a photo) loads intact through migration', async () => {
      const { context, page } = await boot(browser, { label: 'builder' });
      legacyJson = await page.evaluate(() => {
        const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
        const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false), a = cards[2], b = cards[7], c = cards[11];
        const mk = (card, variant, n) => ({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: card.id, variantId: variant, serial: C.serial.format(s.playerCode, n), pulledAt: Date.now() - n * 60000, seen: true });
        s.inventory = [mk(a, null, 1), mk(a, null, 2), mk(a, 'rainbow-holo', 3), mk(b, null, 4), mk(b, null, 5), mk(c, 'rainbow-holo', 6)];
        s.inventory[1].locked = true;
        s.serialCounter = 6; s.currency = 777; s.tutorial = { step: 'done', done: true }; s.stats.packsOpened = 12;
        // the shape of a 1.5.x save: current schema, but none of the Shop or Market records that came later
        s.inventoryUi = Object.assign({}, s.inventoryUi, { collections: [{ id: 'mine', name: 'Mine', stackKeys: [C.stacks.key(a.id, null), C.stacks.key(b.id, null)] }], favorites: [C.stacks.key(b.id, null)] });
        delete s.market; delete s.sales; delete s.shop;
        return JSON.stringify(s);
      });
      await context.close();
      const { context: ctx2, page: p2 } = await boot(browser, { label: 'legacy', save: legacyJson });
      await p2.waitForFunction(() => Cardable.state.current.inventory.length === 6, null, { timeout: 8000 }).catch(async () => { throw new Error('legacy save not loaded: ' + JSON.stringify(await p2.evaluate(() => ({ n: Cardable.state.current.inventory.length, schema: Cardable.state.current.schemaVersion, recovery: (r => r ? JSON.stringify(Object.assign({}, r, { raw: undefined })).slice(0, 500) : null)(Cardable.state.recovery), keys: Object.keys(localStorage).filter((k) => /cardable/.test(k)), len: (localStorage.getItem('cardable.save') || '').length })))); });
      const loaded = await p2.evaluate((raw) => {
        const C = Cardable, before = JSON.parse(raw), now = C.state.current;
        return { schema: now.schemaVersion, currency: now.currency, got: now.inventory.map((i) => [i.cardId.slice(0, 8), i.variantId, i.serial, !!i.locked].join('/')), want: before.inventory.map((i) => [i.cardId.slice(0, 8), i.variantId, i.serial, !!i.locked].join('/')), same: JSON.stringify(now.inventory.map((i) => [i.instanceId, i.cardId, i.variantId, i.serial, !!i.locked])) === JSON.stringify(before.inventory.map((i) => [i.instanceId, i.cardId, i.variantId, i.serial, !!i.locked])),
          collections: (now.inventoryUi.collections || []).map((x) => (x.stackKeys || []).length), favorites: (now.inventoryUi.favorites || []).length, packs: now.stats.packsOpened };
      }, legacyJson);
      assert.equal(loaded.schema, 5, 'on the current schema');
      assert.equal(loaded.currency, 777);
      assert(loaded.same, 'every instance, serial, finish and lock survived in order ' + JSON.stringify([loaded.got, loaded.want]));
      assert.deepEqual(loaded.collections, [2], 'the collection kept its two cards as stack keys');
      assert.equal(loaded.favorites, 1);
      assert.equal(loaded.packs, 12);
      // a Studio photo lives in IndexedDB, outside the save
      await p2.evaluate(() => new Promise((resolve, reject) => {
        const req = indexedDB.open('cardable-studio', 1);
        req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' }).createIndex('createdAt', 'createdAt'); if (!d.objectStoreNames.contains('checks')) d.createObjectStore('checks', { keyPath: 'id' }); };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => { const tx = req.result.transaction('photos', 'readwrite'); tx.objectStore('photos').put({ id: 'accept-photo', createdAt: Date.now(), name: 'Acceptance photo', blob: new Blob([new Uint8Array(2048).fill(7)], { type: 'image/jpeg' }) }); tx.oncomplete = () => { req.result.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
      }));
      globalThis.__legacyContext = { context: ctx2, page: p2 };
    });

    await step('connect, preview and convert once: a receipt, a retry that changes nothing, and the offline save, locks and photo untouched', async () => {
      const { page } = globalThis.__legacyContext;
      const offlineBefore = await page.evaluate(() => JSON.stringify({ inventory: Cardable.state.current.inventory, currency: Cardable.state.current.currency, ui: Cardable.state.current.inventoryUi }));
      await openMarket(page);
      await page.evaluate(() => Cardable.market.store.setRealm('global'));
      await page.waitForSelector('.mk-empty');
      await page.locator('.mk-empty button', { hasText: 'Connect to Players' }).click();
      await page.waitForSelector('.mk-online');
      await page.locator('.mk-online button', { hasText: 'Create a private account' }).click();
      await page.waitForSelector('.mk-recovery');
      await page.locator('.mk-online label.mk-toggle').click();
      await page.locator('.mk-online button', { hasText: 'Done' }).click();
      await page.waitForFunction(() => Cardable.market.online.state.status === 'online');
      const r = await page.evaluate(async () => {
        const o = Cardable.market.online, p = await o.previewImport();
        const first = await o.commitImport(p.previewId, 'accept-import-key-1');
        const retry = await o.commitImport(p.previewId, 'accept-import-key-1');
        const inv = await o.authed('GET', '/v1/inventory?limit=50');
        return { previewCount: p.count != null ? p.count : (p.items || []).length, receipt: first.receipt, retryReceipt: retry.receipt, total: inv.total, serials: (inv.items || []).map((i) => i.serial).sort(), locked: (p.items || []).filter((i) => i.locked).length };
      });
      assert.equal(r.total, 6, 'six cards converted once: ' + JSON.stringify(r));
      assert.deepEqual(r.serials, JSON.parse(legacyJson).inventory.map((i) => i.serial).sort(), 'every serial arrived exactly');
      assert.equal(JSON.stringify(r.receipt), JSON.stringify(r.retryReceipt), 'a retry returns the same receipt and converts nothing twice');
      const offlineAfter = await page.evaluate(() => JSON.stringify({ inventory: Cardable.state.current.inventory, currency: Cardable.state.current.currency, ui: Cardable.state.current.inventoryUi }));
      assert.equal(offlineAfter, offlineBefore, 'the offline save is byte-for-byte what it was');
      const photo = await page.evaluate(() => new Promise((resolve, reject) => { const req = indexedDB.open('cardable-studio', 1); req.onsuccess = () => { const g = req.result.transaction('photos').objectStore('photos').get('accept-photo'); g.onsuccess = () => { req.result.close(); resolve(g.result ? g.result.blob.size : -1); }; g.onerror = () => reject(g.error); }; req.onerror = () => reject(req.error); }));
      assert.equal(photo, 2048, 'the Studio photo is untouched');
      return { serials: r.serials.length };
    });

    // ---- journey 3: the service paused and read-only, as the player sees it ----
    await step('read-only: the client says so, looks still work, a write is refused before it is sent', async () => {
      const { page } = globalThis.__legacyContext;
      await admin('POST', '/v1/admin/mode', { mode: 'read-only', message: 'Checking the books.' });
      await page.evaluate(() => Cardable.market.online.refresh(true));
      await page.waitForFunction(() => Cardable.market.online.state.mode === 'read-only');
      await page.evaluate(() => Cardable.market.ui.go('discover', {}, { reset: true })); await page.waitForSelector('.mk-notice');
      const label = await page.evaluate(() => document.querySelector('.mk-notice').textContent);
      assert(/read-only/i.test(label), label);
      const refused = await page.evaluate(async () => {
        const o = Cardable.market.online;
        try { await o.authed('PUT', '/v1/settings', { notifyBids: false }, { idempotencyKey: 'k-readonly-1' }); return 'accepted'; } catch (e) { return e.code; }
      });
      assert.equal(refused, 'read-only');
      const still = await page.evaluate(() => Cardable.market.online.authed('GET', '/v1/wallet').then((w) => typeof w.balance));
      assert.equal(still, 'number');
      await shot(page, 'service-read-only');
    });
    await step('maintenance: the client shows a calm pause, nothing is lost, and opening the service restores it', async () => {
      const { page } = globalThis.__legacyContext;
      await admin('POST', '/v1/admin/mode', { mode: 'maintenance', message: 'Back soon.' });
      await page.evaluate(() => Cardable.market.online.refresh(true));
      await page.waitForFunction(() => Cardable.market.online.state.status === 'paused');
      await page.evaluate(() => Cardable.market.ui.go('discover', {}, { reset: true }));
      await page.waitForSelector('.mk-empty');
      const text = await page.evaluate(() => document.querySelector('.mk-empty').textContent);
      assert(/paused/i.test(text), text);
      await shot(page, 'service-paused');
      const offline = await page.evaluate(() => ({ currency: Cardable.state.current.currency, count: Cardable.state.current.inventory.length }));
      assert.deepEqual(offline, { currency: 777, count: 6 });
      await page.evaluate(() => Cardable.market.store.setRealm('simulation'));
      await page.waitForFunction(() => document.querySelectorAll('.mk-tile').length > 5);
      await page.evaluate(() => Cardable.market.store.setRealm('global'));
      await admin('POST', '/v1/admin/mode', { mode: 'open', message: '' });
      await page.evaluate(() => Cardable.market.online.refresh(true));
      await page.waitForFunction(() => Cardable.market.online.state.status === 'online' && Cardable.market.online.state.mode === 'open');
      const inv = await page.evaluate(() => Cardable.market.online.state.inventoryTotal);
      assert.equal(inv, 6, 'the converted cards are all still there');
    });

    // ---- the Help & feedback page ----
    await step('Help & feedback: honest sections, a report with no personal detail unless asked, a Beta badge at every width', async () => {
      const { page } = globalThis.__legacyContext;
      await page.evaluate(() => Cardable.market.ui.go('help', {}, { reset: true }));
      await page.waitForSelector('.mk-help-report');
      const text = await page.evaluate(() => document.querySelector('.mk-page').textContent);
      ['What this beta is', 'Your offline game is safe', 'Terms of use', 'What the service keeps', 'Moderation', 'Whose is whose'].forEach((t) => assert(text.includes(t), 'section ' + t));
      assert(/can be reset/i.test(text) && /no cash value/i.test(text));
      const alias = await page.evaluate(() => Cardable.market.online.state.alias);
      const plain = await page.evaluate(() => document.querySelector('#help-report').value);
      assert(plain.includes('Cardable Market Beta 1.0.0') && !plain.includes(alias) && !/token|secret|recovery/i.test(plain), plain);
      await page.locator('#help-named').check();
      assert((await page.evaluate(() => document.querySelector('#help-report').value)).includes(alias), 'the name is added only when asked');
      await shot(page, 'help');
      for (const [w, h] of [[360, 800], [390, 844], [768, 1024], [1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(250);
        const b = await page.evaluate(() => { const t = document.querySelector('.mk-brand-tag'), r = t.getBoundingClientRect(), cs = getComputedStyle(t); return { shown: cs.display !== 'none' && r.width > 0, inside: r.left >= 0 && r.right <= innerWidth, text: t.textContent }; });
        assert(b.shown && b.inside, 'Beta badge at ' + w + ': ' + JSON.stringify(b));
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    await globalThis.__legacyContext.context.close();

    // ---- the sweep: every route, viewport, color mode, quality tier, reduced motion ----
    const ROUTES = [['home', {}], ['discover', {}], ['buy-now', {}], ['trades', {}], ['stocks', {}], ['portfolio', {}], ['activity', {}], ['watchlist', {}], ['alerts', {}], ['compare', {}], ['my-listings', {}], ['settings', {}], ['help', {}], ['compose', {}], ['card', null], ['listing', null]];
    async function sweepOne(page, label, route, params, shotName) {
      const cardId = await page.evaluate(() => Cardable.data.cards.filter((c) => !c.retired)[4].id);
      if (route === 'card') params = { id: cardId, variant: '' };
      if (route === 'listing') params = { id: await page.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((l) => l.format === 'auction').id) };
      await page.evaluate(([n, p]) => Cardable.market.ui.go(n, p, { reset: true }), [route, params]);
      await page.waitForTimeout(450);
      const m = await page.evaluate(() => {
        const f = document.querySelector('.mk-frame').getBoundingClientRect(), main = document.querySelector('.mk-main'), off = [];
        document.querySelectorAll('.mk-frame *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.right > f.right + 1 && !el.closest('.mk-table, .mk-nav, .mk-presets, .mk-segments, .mk-hero-side, .mk-picker, .mk-sr, .mk-album-grid, .mk-stage, .mk-modal, .mk-popover, .mk-suggest, .mk-chart-plotarea, .mk-compare')) off.push((el.tagName + '.' + (el.getAttribute('class') || '')).slice(0, 60)); });
        const tag = document.querySelector('.mk-brand-tag'), tr = tag.getBoundingClientRect();
        return { scroll: main.scrollWidth - main.clientWidth, page: document.documentElement.scrollWidth - innerWidth, offenders: Array.from(new Set(off)).slice(0, 4), beta: getComputedStyle(tag).display !== 'none' && tr.width > 0 && tr.right <= innerWidth + 1,
          running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.mk-frame')).length, title: (document.querySelector('.mk-page h1') || {}).textContent || '' };
      });
      return Object.assign({ label, route }, m);
    }
    async function sweepSet(label, options, routes, settle) {
      const { context, page } = await boot(browser, Object.assign({ label }, options));
      await seed(page, 14);
      if (settle) await settle(page);
      await openMarket(page);
      const rows = [];
      for (const r of routes) {
        let row = await sweepOne(page, label, r[0], r[1]);
        if (row.scroll > 1 || row.page > 1 || row.offenders.length) { await page.waitForTimeout(500); row = await sweepOne(page, label, r[0], r[1]); }
        rows.push(row);
        evidence.sweep.push(row);
        if (options.shots && (options.shots === true || options.shots.includes(r[0]))) await shot(page, 'sweep-' + label + '-' + r[0]);
      }
      await context.close();
      return rows;
    }
    function judge(rows, what, reduced) {
      const bad = rows.filter((r) => r.scroll > 1 || r.page > 1 || r.offenders.length || !r.beta || !r.title || (reduced && r.running > 0));
      assert.equal(bad.length, 0, what + ': ' + JSON.stringify(bad.slice(0, 3)));
    }
    const VIEWPORTS = quick ? [['phone-360', 360, 800, 2], ['desktop-1920', 1920, 1080, 1]] : [['phone-360', 360, 800, 2], ['phone-390', 390, 844, 3], ['tablet-768', 768, 1024, 1], ['laptop-720p', 1280, 720, 1], ['desktop-1080p', 1920, 1080, 1], ['wide-2560', 2560, 1080, 1]];
    for (const [name, w, h, dpr] of VIEWPORTS) {
      await step('every route fits and shows the Beta badge: ' + name + ' (' + w + 'x' + h + ' @' + dpr + 'x, color, high quality)', async () => {
        judge(await sweepSet(name, { width: w, height: h, dpr, shots: ['discover', 'listing', 'portfolio', 'settings', 'help'] }, ROUTES), name);
      });
    }
    await step('every route fits in saved monochrome at phone and desktop width', async () => {
      for (const [name, w, h, dpr] of [['mono-phone-390', 390, 844, 2], ['mono-desktop-1080p', 1920, 1080, 1]]) {
        judge(await sweepSet(name, { width: w, height: h, dpr, shots: ['discover', 'listing'] }, ROUTES, (p) => p.evaluate(() => Cardable.settings.set('rarityColor', 'mono'))), name);
      }
    });
    await step('every route fits at each quality tier (very low, low, medium, high) and nothing animates under reduced motion', async () => {
      for (const tier of quick ? ['very-low'] : ['very-low', 'low', 'medium', 'high']) {
        judge(await sweepSet('tier-' + tier, { width: 1280, height: 720 }, ROUTES, (p) => p.evaluate((t) => Cardable.settings.applyPreset(t), tier)), 'tier ' + tier);
      }
      judge(await sweepSet('reduced-motion', { width: 1280, height: 720, reducedMotion: true }, ROUTES.filter((r) => ['discover', 'listing', 'stocks', 'help'].includes(r[0]))), 'reduced motion', true);
    });

    await step('no page errors and no unexpected console messages across the whole run', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors.slice(0, 3)));
      const unexpected = evidence.console.filter((c) => !/Failed to load resource|net::ERR|ERR_CONNECTION|status of 503/i.test(c.text));
      assert.equal(unexpected.length, 0, JSON.stringify(unexpected.slice(0, 3)));
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
