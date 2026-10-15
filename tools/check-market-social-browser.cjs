'use strict';
// Cardable Market Beta, Stage 7: pictures, profiles, comments, reviews, follows, the feed and moderation, in the real
// interface against a LOCAL Worker (real local D1 and R2). Three independent test accounts. Pictures are generated here
// (a PNG, a Director album photo made on the page, an SVG and a GIF to be refused), and everything goes through the
// same file choosers and dialogs a player uses.
//   node tools/check-market-social-browser.cjs [--out qa-output/market-beta/stage-7]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const { spawn, execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-7');
const wrangler = path.join(root, 'cloudflare', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], timings: {} };
fs.mkdirSync(out, { recursive: true });
const API_PORT = 8805, WEB_PORT = 8806, API = 'http://127.0.0.1:' + API_PORT;
const ADMIN = crypto.randomBytes(24).toString('hex');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
let persist = '', work = '';

async function startWorker() {
  persist = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-social-'));
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-pictures-'));
  execFileSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + secret, '--var', 'ENVIRONMENT:test',
    '--var', 'ADMIN_TOKEN:' + ADMIN, '--var', 'REGISTER_PER_HOUR:200', '--var', 'API_RATE_LIMIT:100000', '--var', 'ALERT_GAP_MS:0'], { cwd: path.join(root, 'cloudflare'), stdio: 'ignore' });
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

// ---- the pictures a player might choose --------------------------------------------------------------------------------
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(t)); return Buffer.concat([len, t, crc]); }
function makePng(w, h, seed) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = (x * 255 / w + seed * 40) & 255; raw[o + 1] = (y * 255 / h) & 255; raw[o + 2] = ((x + y) * 255 / (w + h) + seed * 90) & 255;
      if (Math.abs(x - w / 2) < 6 || Math.abs(y - h / 2) < 6) { raw[o] = 255; raw[o + 1] = 255; raw[o + 2] = 255; }
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}
const FILES = {};

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
    for (let i = 0; i < 12; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 7 + offset) % cards.length].id, variantId: null, serial: 'CBL-' + s.playerCode + '-' + String(i + 1).padStart(6, '0'), pulledAt: Date.now() - i * 1000, seen: true });
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
const refresh = (p) => p.page.evaluate(async () => { await Cardable.market.onlineData.invalidate(); const s = Cardable.market.online.state; return { balance: s.balance, held: s.held, alias: s.alias }; });
const call = (p, method, route, body) => p.page.evaluate(async (a) => { try { return { ok: true, data: await Cardable.market.online.authed(a.m, a.r, a.b || undefined, a.m === 'GET' ? undefined : { idempotencyKey: 'k-' + Math.random().toString(36).slice(2) + Date.now() }) }; } catch (e) { return { ok: false, code: e.code, message: e.message }; } }, { m: method, r: route, b: body });
async function admin(pathname, body) {
  const res = await fetch(API + pathname, { method: body ? 'POST' : 'GET', headers: { 'x-admin-token': ADMIN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: (await res.json()).data };
}
// drives the crop dialog with a file the way a player would
async function addPicture(p, file, alt) {
  await p.page.evaluate(() => { const d = document.querySelector('.mk-present'); if (d) d.open = true; });
  const input = p.page.locator('.mk-pictures-edit input[type=file]');
  await input.setInputFiles(file);
  await p.page.waitForSelector('.mk-crop', { timeout: 15000 });
  await p.page.waitForFunction(() => /pixels/.test(document.querySelector('.mk-crop').textContent) || document.querySelector('.mk-crop .mk-field-error:not([hidden])'), null, { timeout: 15000 });
  if (alt) await p.page.fill('.mk-crop input[type=text]', alt);
}

(async () => {
  const worker = await startWorker();
  const web = await serveGame();
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    FILES.png = path.join(work, 'desk.png'); fs.writeFileSync(FILES.png, makePng(960, 600, 1));
    FILES.png2 = path.join(work, 'shelf.png'); fs.writeFileSync(FILES.png2, makePng(800, 800, 2));
    FILES.svg = path.join(work, 'logo.svg'); fs.writeFileSync(FILES.svg, '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><script>alert(1)</script><rect width="400" height="300" fill="red"/></svg>');
    FILES.gif = path.join(work, 'spin.gif'); fs.writeFileSync(FILES.gif, Buffer.concat([Buffer.from('GIF89a'), crypto.randomBytes(64)]));
    FILES.tiny = path.join(work, 'tiny.png'); fs.writeFileSync(FILES.tiny, makePng(120, 90, 3));
    FILES.big = path.join(work, 'huge.png'); fs.writeFileSync(FILES.big, Buffer.concat([makePng(64, 64, 4), Buffer.alloc(16 * 1024 * 1024)]));
    const A = await newPlayer(browser, 'A', 0), B = await newPlayer(browser, 'B', 3), C = await newPlayer(browser, 'C', 5);
    const aAlias = (await refresh(A)).alias, bAlias = (await refresh(B)).alias;
    await refresh(C);

    await step('A adds a picture from a file: it is cropped and confirmed first, uploaded with progress, and stored without its source', async () => {
      await openGlobal(A, { name: 'compose', params: {} });
      await A.page.waitForSelector('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])', { timeout: 20000 });
      await A.page.locator('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])').first().click();
      await A.page.evaluate(() => { const d = document.querySelector('.mk-present'); if (d) d.open = true; });
      await A.page.fill('.mk-composer input[type=number]', '25');
      await A.page.fill('.mk-present input[type=text]', 'Clean card, fast shipping');
      await addPicture(A, FILES.png, 'The card on a wooden desk');
      assert.equal(await A.page.locator('.mk-crop button', { hasText: 'Upload picture' }).isDisabled(), true, 'nothing is uploaded until the player confirms');
      await shot(A.page, 'composer-crop-desktop');
      await A.page.locator('.mk-crop input[type=checkbox]').check();
      await A.page.locator('.mk-crop button', { hasText: 'Upload picture' }).click();
      await A.page.waitForSelector('.mk-pictures-edit .mk-picture', { timeout: 30000 });
      const list = await call(A, 'GET', '/v1/uploads');
      assert.equal(list.data.items.length, 1); assert.equal(list.data.items[0].status, 'ready');
      assert(list.data.items[0].bytes > 0 && list.data.items[0].bytes < 800000, 'three small pictures, not the original: ' + list.data.items[0].bytes);
      await shot(A.page, 'composer-picture-desktop');
    });

    await step('A lists the card with the picture; the card, serial and price stay the listing, the picture sits beside them', async () => {
      await A.page.locator('.mk-composer-side button', { hasText: 'List this card' }).click();
      const rows = await A.page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(/Pictures/.test(rows) && /shown to other players/.test(rows), rows.slice(0, 400));
      await A.page.locator('.mk-review button', { hasText: /^List card/ }).click();
      await A.page.waitForSelector('.mk-detail', { timeout: 20000 });
      const lazyBefore = await A.page.evaluate(() => { const i = document.querySelector('.mk-gallery .mk-photo-img'); return !!i && !i.dataset.loaded; });
      await A.page.locator('.mk-gallery').scrollIntoViewIfNeeded();
      evidence.timings.galleryLazyUntilScrolled = lazyBefore;
      try { await A.page.waitForSelector('.mk-gallery .mk-photo-img.is-loaded', { timeout: 15000 }); } catch (e) { const d = await A.page.evaluate(() => ({ gallery: (document.querySelector('.mk-gallery') || {}).outerHTML, detail: document.querySelector('.mk-detail') && document.querySelector('.mk-detail').textContent.slice(0, 200), imgs: Array.from(document.querySelectorAll('img')).map((i) => i.className + ' ' + i.dataset.media + ' ' + i.dataset.failed) })); throw new Error('no gallery: ' + JSON.stringify(d).slice(0, 1500) + ' console: ' + JSON.stringify(evidence.console.slice(-5))); }
      const natural = await A.page.evaluate(() => document.querySelector('.mk-gallery .mk-photo-img').naturalWidth);
      assert(natural > 100, 'the picture really decoded: ' + natural);
      const txt = await A.page.evaluate(() => document.querySelector('.mk-detail').textContent);
      assert(/The exact card/.test(txt) && /Serial/.test(txt) && /not proof of the item/.test(txt), txt.slice(0, 300));
      FILES.listingId = await A.page.evaluate(() => Cardable.market.store.session && document.querySelector('[data-id]') ? null : null);
      const mine = await call(A, 'GET', '/v1/listings?mine=1');
      FILES.listingId = mine.data.items[0].id;
      assert.equal(mine.data.items[0].images.length, 1);
      await shot(A.page, 'listing-with-picture-desktop');
    });

    await step('B (an independent account) sees the listing in the feed with the seller picture, labelled, and the card art beside it', async () => {
      await refresh(B);
      await openGlobal(B, { name: 'discover', params: {} });
      await B.page.waitForSelector('.mk-tile[data-photo="1"]', { timeout: 25000 });
      await B.page.locator('.mk-tile[data-photo="1"]').first().scrollIntoViewIfNeeded();
      await B.page.waitForSelector('.mk-tile[data-photo="1"] .mk-photo-img.is-loaded', { timeout: 25000 });
      const tile = await B.page.evaluate(() => { const t = document.querySelector('.mk-tile[data-photo="1"]'); return { text: t.textContent, art: !!t.querySelector('.mk-tile-art'), tag: t.querySelector('.mk-photo-tag').textContent, w: t.querySelector('.mk-photo-img').naturalWidth }; });
      if (!(tile.w > 50)) { tile.dbg = await B.page.evaluate(() => Array.from(document.querySelectorAll('.mk-tile-photo img')).map((i) => ({ c: i.className, complete: i.complete, nw: i.naturalWidth, src: i.src.slice(0, 40), cw: i.clientWidth, ch: i.clientHeight }))); }
      assert(tile.art && /Seller photo/.test(tile.tag) && tile.w > 50, JSON.stringify(tile));
      assert(/Clean card, fast shipping/.test(tile.text));
      await shot(B.page, 'discover-photo-desktop');
      const feed = await B.page.evaluate(() => document.querySelector('.mk-feed') && document.querySelector('.mk-feed').textContent);
      assert(feed && /Community/.test(feed), 'the community feed is on Discover');
    });

    await step('B comments; A replies and hides nothing; threads, limits and plain text hold', async () => {
      await openGlobal(B, { name: 'listing', params: { id: FILES.listingId } });
      await B.page.waitForSelector('.mk-comments textarea', { timeout: 20000 });
      await B.page.fill('.mk-comments textarea', 'Is the corner clean? <b>please</b>');
      await B.page.locator('.mk-comments button', { hasText: 'Post' }).click();
      await B.page.waitForSelector('.mk-comments .mk-field-error:not([hidden])');
      const err = await B.page.evaluate(() => document.querySelector('.mk-comments .mk-field-error:not([hidden])').textContent);
      assert(/plain text/i.test(err), err);
      await B.page.fill('.mk-comments textarea', 'Is the corner clean?');
      await B.page.locator('.mk-comments button', { hasText: 'Post' }).click();
      await B.page.waitForSelector('.mk-comment .mk-comment-body');
      await sleep(300);
      await refresh(A);
      await openGlobal(A, { name: 'listing', params: { id: FILES.listingId } });
      await A.page.waitForSelector('.mk-comment', { timeout: 20000 });
      await A.page.locator('.mk-comment button', { hasText: 'Reply' }).first().click();
      await A.page.fill('.mk-comments textarea', 'Yes, all four corners are sharp.');
      await A.page.locator('.mk-comments button', { hasText: 'Post' }).click();
      await A.page.waitForSelector('.mk-comment.is-reply', { timeout: 15000 });
      const seller = await A.page.evaluate(() => document.querySelector('.mk-comment.is-reply .mk-comment-head').textContent);
      assert(/Seller/.test(seller), 'the seller is indicated: ' + seller);
      await shot(A.page, 'listing-comments-desktop');
      // B is told of the reply, and the body is text, never markup
      const notes = await call(B, 'GET', '/v1/activity');
      assert(notes.data.notifications.some((n) => n.kind === 'reply'), JSON.stringify(notes.data.notifications.map((n) => n.kind)));
      const html = await B.page.evaluate(() => document.querySelector('.mk-comments').innerHTML);
      assert(!/<b>|<script/.test(html), 'no markup from player text');
    });

    await step('B buys, rates the trade, and the seller profile shows the review with its sample; A cannot rate their own sale', async () => {
      const sold = await B.page.evaluate(async () => { const P = Cardable.market.onlineProvider; await Cardable.market.onlineData.loadInventory(true); const ids = P.inventory('global').items.slice().sort((x, y) => P.quoteLocal(x).quote - P.quoteLocal(y).quote).slice(0, 4).map((i) => i.instanceId); return P.quickSell('global', { instanceIds: ids, requestId: 'q-' + Math.random().toString(36).slice(2) + Date.now() }); });
      assert.equal(sold.ok, true, 'quick sell to fund the purchase: ' + JSON.stringify(sold));
      await refresh(B);
      const bought = await B.page.evaluate(async (id) => { const P = Cardable.market.onlineProvider; await Cardable.market.onlineData.loadDetail(id, true); const l = Cardable.market.onlineData.state.details[id].data.listing; return P.purchase('global', id, 'rq-' + Math.random().toString(36).slice(2) + Date.now(), l.ask); }, FILES.listingId);
      assert.equal(bought.ok, true, JSON.stringify(bought));
      await openGlobal(B, { name: 'activity', params: {} });
      await B.page.waitForSelector('.mk-reviews-due:not([hidden]) button', { timeout: 20000 });
      await B.page.locator('.mk-reviews-due button', { hasText: 'Rate' }).first().click();
      await B.page.waitForSelector('.mk-review-dialog');
      await B.page.locator('.mk-review-dialog .mk-star').nth(3).click();
      await B.page.fill('.mk-review-dialog textarea', 'Arrived as described, thanks.');
      await B.page.locator('.mk-review-dialog button', { hasText: 'Leave review' }).click();
      await B.page.waitForFunction(() => !document.querySelector('.mk-review-dialog'), null, { timeout: 15000 });
      const self = await call(A, 'POST', '/v1/reviews', { tradeId: (await call(B, 'GET', '/v1/trades?mine=1')).data.items[0].id, rating: 5 });
      assert.equal(self.ok, false); assert.equal(self.code, 'not-eligible');
      await openGlobal(B, { name: 'profile', params: { alias: aAlias } });
      await B.page.waitForSelector('.mk-profile .mk-rep-score', { timeout: 20000 });
      await B.page.waitForFunction(() => /1 review by 1 buyer/.test(document.querySelector('.mk-profile').textContent), null, { timeout: 15000 });
      const prof = await B.page.evaluate(() => document.querySelector('.mk-profile').textContent);
      assert(/Completed sales/.test(prof) && /Arrived as described/.test(prof) && !/@/.test(prof), prof.slice(0, 400));
      await shot(B.page, 'profile-desktop');
    });

    await step('follow: C follows A, A lists again, and it reaches C\'s feed and inbox; C can switch it off', async () => {
      await refresh(C);
      await openGlobal(C, { name: 'profile', params: { alias: aAlias } });
      await C.page.waitForSelector('.mk-profile button:has-text("Follow")', { timeout: 20000 });
      await C.page.locator('.mk-profile button', { hasText: /^Follow$/ }).first().click();
      await C.page.waitForFunction(() => document.querySelector('.mk-profile button[aria-pressed="true"]'), null, { timeout: 15000 });
      const second = await A.page.evaluate(async () => { await Cardable.market.onlineData.loadInventory(true); const it = Cardable.market.onlineProvider.inventory('global').items.filter((i) => i.state === 'owned')[0]; return Cardable.market.onlineProvider.publishListing('global', { kind: 'fixed', instanceIds: [it.instanceId], ask: 15, title: 'Second listing', note: '', durationMs: 86400000, requestId: 'fl-' + Math.random().toString(36).slice(2) + Date.now() }); });
      assert.equal(second.ok, true, JSON.stringify(second));
      await sleep(600);
      const feed = await call(C, 'GET', '/v1/feed?scope=following');
      assert(feed.data.items.some((i) => i.title === 'Second listing'), JSON.stringify(feed.data.items.map((i) => i.title)));
      const notes = await call(C, 'GET', '/v1/activity');
      assert(notes.data.notifications.some((n) => n.kind === 'follow'));
      await openGlobal(C, { name: 'settings', params: {} });
      await C.page.waitForSelector('.mk-social-settings', { timeout: 20000 });
      await C.page.waitForFunction(() => /Following/.test(document.querySelector('.mk-social-settings').textContent), null, { timeout: 10000 });
      await shot(C.page, 'settings-social-desktop');
    });

    await step('a photo taken sideways (EXIF orientation) is shown upright, and its metadata does not travel', async () => {
      const page = A.page;
      const b64 = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 800; c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 800, 400); g.fillStyle = '#fff'; g.fillRect(0, 0, 100, 400);
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; buf.forEach((x) => { s += String.fromCharCode(x); }); return btoa(s);
      });
      const jpeg = Buffer.from(b64, 'base64');
      const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
      const gps = Buffer.from('GPSLatitude 51.5074 N Make Canon');
      const payload = Buffer.concat([Buffer.from('Exif  ', 'binary'), tiff, gps]);
      const seg = Buffer.concat([Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
      FILES.rot = path.join(work, 'sideways.jpg'); fs.writeFileSync(FILES.rot, Buffer.concat([jpeg.subarray(0, 2), seg, jpeg.subarray(2)]));
      await openGlobal(A, { name: 'compose', params: {} });
      await A.page.waitForSelector('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])', { timeout: 20000 });
      await A.page.locator('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])').first().click();
      await addPicture(A, FILES.rot, 'Sideways');
      const text = await A.page.evaluate(() => document.querySelector('.mk-crop').textContent);
      assert(/400 × 800 pixels/.test(text), 'turned upright: ' + text.slice(0, 200));
      await A.page.locator('.mk-crop button', { hasText: 'Cancel' }).click();
      await A.page.waitForFunction(() => !document.querySelector('.mk-crop'));
    });

    await step('cancelling an upload in flight leaves nothing behind', async () => {
      await A.page.route('**/v1/uploads/*/full', async (route) => { await new Promise((r) => setTimeout(r, 4000)); try { await route.continue(); } catch (_) { /* aborted */ } });
      const before = (await call(A, 'GET', '/v1/uploads')).data.items.length;
      await addPicture(A, FILES.png2, 'Shelf');
      await A.page.locator('.mk-crop input[type=checkbox]').check();
      await A.page.locator('.mk-crop button', { hasText: 'Upload picture' }).click();
      await A.page.waitForFunction(() => /Uploading/.test(document.querySelector('.mk-crop').textContent), null, { timeout: 15000 });
      await sleep(900);
      await A.page.locator('.mk-crop button', { hasText: 'Cancel upload' }).click();
      await A.page.waitForFunction(() => !document.querySelector('.mk-crop') || /cancelled/.test(document.querySelector('.mk-crop').textContent), null, { timeout: 15000 });
      await A.page.unroute('**/v1/uploads/*/full');
      await sleep(800);
      const after = (await call(A, 'GET', '/v1/uploads')).data.items;
      assert.equal(after.length, before, 'no half upload is kept: ' + JSON.stringify(after.map((i) => i.status)));
      if (await A.page.locator('.mk-crop').count()) { await A.page.locator('.mk-crop button', { hasText: 'Cancel' }).click(); }
    });

    await step('refused pictures say why: a vector file, an animated format and a too-small picture; nothing is uploaded', async () => {
      await refresh(A);
      await openGlobal(A, { name: 'compose', params: {} });
      await A.page.waitForSelector('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])', { timeout: 20000 });
      await A.page.locator('.mk-composer .mk-pick .mk-pill.is-serial:not([disabled])').first().click();
      const before = (await call(A, 'GET', '/v1/uploads')).data.usage.startedToday;
      for (const [file, re] of [[FILES.svg, /Vector pictures|SVG/], [FILES.gif, /GIF/], [FILES.tiny, /too small/], [FILES.big, /over 15 MB/]]) {
        await A.page.evaluate(() => { const d = document.querySelector('.mk-present'); if (d) d.open = true; });
        await A.page.locator('.mk-pictures-edit input[type=file]').setInputFiles(file);
        await A.page.waitForSelector('.mk-crop .mk-field-error:not([hidden])', { timeout: 15000 });
        const msg = await A.page.evaluate(() => document.querySelector('.mk-crop .mk-field-error:not([hidden])').textContent);
        assert(re.test(msg), file + ': ' + msg);
        if (file === FILES.svg) await shot(A.page, 'composer-picture-error-desktop');
        assert.equal(await A.page.locator('.mk-crop button', { hasText: 'Upload picture' }).isDisabled(), true);
        await A.page.locator('.mk-crop button', { hasText: 'Cancel' }).click();
        await A.page.waitForFunction(() => !document.querySelector('.mk-crop'));
      }
      assert.equal((await call(A, 'GET', '/v1/uploads')).data.usage.startedToday, before, 'a refused picture never started an upload');
    });

    await step('a Director album photo is chosen, cropped and uploaded; the album itself is untouched', async () => {
      await A.page.evaluate(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 500;
        const g = canvas.getContext('2d'); const grd = g.createLinearGradient(0, 0, 800, 500); grd.addColorStop(0, '#3b82f6'); grd.addColorStop(1, '#f59e0b'); g.fillStyle = grd; g.fillRect(0, 0, 800, 500);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        await new Promise((resolve, reject) => {
          const req = indexedDB.open('cardable-studio', 1);
          req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains('photos')) { const s = d.createObjectStore('photos', { keyPath: 'id' }); s.createIndex('createdAt', 'createdAt'); } if (!d.objectStoreNames.contains('checks')) d.createObjectStore('checks', { keyPath: 'id' }); };
          req.onsuccess = () => { const tx = req.result.transaction('photos', 'readwrite'); tx.objectStore('photos').put({ id: 'director-1', name: 'Director shot', createdAt: Date.now(), blob: blob, thumb: blob }); tx.oncomplete = () => { req.result.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
          req.onerror = () => reject(req.error);
        });
      });
      await A.page.evaluate(() => { const d = document.querySelector('.mk-present'); if (d) d.open = true; });
      await A.page.locator('.mk-pictures-edit button', { hasText: 'From Director album' }).click();
      try { await A.page.waitForSelector('.mk-album-item', { timeout: 15000 }); } catch (e) { throw new Error('album: ' + await A.page.evaluate(() => (document.querySelector('.mk-album') || { textContent: 'no dialog' }).textContent + ' | studioAlbum=' + typeof Cardable.studioAlbum)); }
      await A.page.locator('.mk-album-item').first().click();
      await A.page.waitForSelector('.mk-crop', { timeout: 15000 });
      await A.page.waitForFunction(() => /pixels/.test(document.querySelector('.mk-crop').textContent), null, { timeout: 15000 });
      await A.page.locator('.mk-crop input[type=checkbox]').check();
      await A.page.locator('.mk-crop button', { hasText: 'Upload picture' }).click();
      await A.page.waitForSelector('.mk-pictures-edit .mk-picture', { timeout: 30000 });
      const up = (await call(A, 'GET', '/v1/uploads')).data.items.filter((i) => i.source === 'director');
      assert.equal(up.length, 1, 'recorded as a Director upload');
      const kept = await A.page.evaluate(() => new Promise((resolve) => { const r = indexedDB.open('cardable-studio', 1); r.onsuccess = () => { const q = r.result.transaction('photos').objectStore('photos').count(); q.onsuccess = () => { r.result.close(); resolve(q.result); }; }; }));
      assert.equal(kept, 1, 'the album still holds its photo');
    });

    await step('C reports the seller picture; the operator removes it; it is gone for everyone and A is told why; the log records it', async () => {
      await openGlobal(C, { name: 'listing', params: { id: FILES.listingId } });
      // the first listing sold; report through the second listing's picture-free page is not possible, so use the API on the sold listing's picture
      const detail = await call(C, 'GET', '/v1/listings/' + FILES.listingId);
      const pic = detail.data.listing.images[0].id;
      const rep = await call(C, 'POST', '/v1/reports', { targetType: 'upload', targetId: pic, reason: 'unsafe-image', note: 'test' });
      assert.equal(rep.ok, true, JSON.stringify(rep));
      const pending = await admin('/v1/admin/reports');
      assert(pending.data.items.some((i) => i.targetId === pic && i.reports === 1));
      const done = await admin('/v1/admin/moderate', { action: 'remove_upload', uploadId: pic, reason: 'Does not belong on a listing' });
      assert.equal(done.status, 200, JSON.stringify(done));
      const gone = await C.page.evaluate(async (id) => { try { const t = await Cardable.market.online.ensureToken(); const r = await fetch(Cardable.market.online.base() + '/v1/media/' + id + '/card', { headers: { authorization: 'Bearer ' + t } }); return r.status; } catch (e) { return -1; } }, pic);
      assert.equal(gone, 404);
      const told = await call(A, 'GET', '/v1/activity');
      assert(told.data.notifications.some((n) => n.kind === 'moderation' && /Does not belong/.test(n.text)));
      const log = await admin('/v1/admin/log');
      assert(log.data.items.some((l) => l.action === 'remove_upload' && l.targetId === pic));
      // a player cannot use the operator's routes
      const denied = await call(C, 'POST', '/v1/admin/moderate', { action: 'remove_upload', uploadId: pic, reason: 'x' });
      assert.equal(denied.ok, false); assert.equal(denied.code, 'not-found');
      await openGlobal(C, { name: 'listing', params: { id: FILES.listingId } });
      await C.page.waitForSelector('.mk-detail', { timeout: 15000 });
      await shot(C.page, 'listing-after-removal-desktop');
    });

    await step('the pictures, comments and profile fit 360, 390, 768, 1366 and 1920 wide, in saved monochrome and with reduced motion', async () => {
      await refresh(B);
      for (const [w, hgt] of [[360, 800], [390, 844], [768, 1024], [1366, 768], [1920, 1080]]) {
        await B.page.setViewportSize({ width: w, height: hgt });
        await openGlobal(B, { name: 'discover', params: {} });
        await B.page.waitForSelector('.mk-tile', { timeout: 20000 });
        const over = await B.page.evaluate(() => { const m = document.querySelector('.mk'); return m.scrollWidth - m.clientWidth; });
        assert(over <= 1, w + 'px discover: horizontal overflow ' + over);
        await shot(B.page, 'discover-feed-' + w);
        await openGlobal(B, { name: 'profile', params: { alias: aAlias } });
        await B.page.waitForSelector('.mk-profile .mk-rep-score', { timeout: 20000 });
        const over2 = await B.page.evaluate(() => { const m = document.querySelector('.mk'); return m.scrollWidth - m.clientWidth; });
        assert(over2 <= 1, w + 'px profile: horizontal overflow ' + over2);
        if (w === 360) await shot(B.page, 'profile-360');
      }
      await B.page.setViewportSize({ width: 1440, height: 900 });
      await B.page.emulateMedia({ reducedMotion: 'reduce' });
      await B.page.evaluate(() => Cardable.settings.set('rarityColor', 'mono'));
      await openGlobal(B, { name: 'discover', params: {} });
      await B.page.waitForSelector('.mk-tile', { timeout: 20000 });
      await shot(B.page, 'discover-mono-reduced-motion');
      await B.page.evaluate(() => Cardable.settings.set('rarityColor', 'color'));
    });

    await step('storage is bounded and accounted for, and the operator can see it', async () => {
      const usage = await admin('/v1/admin/usage');
      assert(usage.data.live.pictures >= 1 && usage.data.live.bytes > 0, JSON.stringify(usage.data));
      evidence.timings.liveBytes = usage.data.live.bytes; evidence.timings.livePictures = usage.data.live.pictures;
      const reconcile = await admin('/v1/admin/reconcile');
      assert.deepEqual(reconcile.data.problems, [], JSON.stringify(reconcile.data.problems.slice(0, 3)));
    });

    await step('no page errors and no unexpected console messages', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors));
      const bad = evidence.console.filter((c) => !/Failed to load resource|net::ERR|favicon|status of 404/i.test(c.text));
      assert.equal(bad.length, 0, JSON.stringify(bad));
    });
  } catch (error) {
    failed = error;
  } finally {
    fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
    web.close();
    try { worker.child.kill(); } catch (_) { /* gone */ }
    try { fs.rmSync(persist, { recursive: true, force: true }); fs.rmSync(work, { recursive: true, force: true }); } catch (_) { /* busy */ }
  }
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + evidence.steps.filter((s) => !s.ok).length + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
