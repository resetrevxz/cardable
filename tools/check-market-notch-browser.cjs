'use strict';
// The notch (1.12.0): one pill inside the Market and, with the Market closed, at the top of the main menu. It says what needs you,
// shows what you can spend and what your cards are worth, offers quick bids and deals through the usual review, peeks for what
// just happened, and does what you ask of it (what it covers, in what order, how much it says). Driven through the real interface
// with a real mouse and keyboard in headless Chromium; it never opens a window.
//   node tools/check-market-notch-browser.cjs [--out qa-output/market-notch]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-notch');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [] };
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell && Cardable.preferences);
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true }; s.currency = 6000;
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    ['basic', 'common', 'uncommon', 'rare', 'unusual', 'legendary'].forEach((r, i) => {
      const c = cards.find((x) => x.rarity === r);
      if (c) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: c.id, variantId: null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now() - i * 1000, seen: true });
    });
    s.serialCounter = 100;
    C.state.commit(s);
  });
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  return { context, page };
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 800) }); if (globalThis.__page) { try { await globalThis.__page.screenshot({ path: path.join(out, 'failed-' + evidence.steps.length + '.png') }); console.log('STATE', JSON.stringify(await globalThis.__page.evaluate(() => ({ body: document.body.className, pop: !!document.querySelector('.mk-island-pop'), panel: !!document.querySelector('.mk-island-panel'), modal: Cardable.ui.modal, label: (document.querySelector('.mk-notch-layer .mk-island') || {}).className, layer: getComputedStyle(document.querySelector('.mk-notch-layer')).opacity })))); } catch (e) { /* page gone */ } } console.log('AT', (String(error.stack).split('\n').filter((l) => l.indexOf('check-market-notch') >= 0)[0] || '').trim()); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 5).join('\n     ')); }
}
const pill = '.mk-notch-layer .mk-island';
// the menu's chrome fades when the player is idle; a real mouse wakes it
const wake = async (page) => { await page.mouse.move(300, 500, { steps: 3 }); await page.mouse.move(720, 300, { steps: 3 }); await page.waitForTimeout(350); };
const credits = (page) => page.evaluate(() => Cardable.state.current.currency);
// bids on a few auctions with the smallest valid maximum, the way the interface does
const bid = (page, n) => page.evaluate(async (count) => {
  const w = Cardable.marketSim.runtime.world, api = Cardable.market.api, placed = [];
  const list = Object.values(w.listings).filter((x) => x.status === 'open' && x.kind === 'auction' && x.seller !== 'you').slice(0, count);
  for (const l of list) { let r = await api.placeBid('simulation', l.id, l.start + 1, 'k1' + l.id); if (!r.ok && r.minimum) r = await api.placeBid('simulation', l.id, r.minimum, 'k2' + l.id); placed.push([l.id, !!r.ok]); }
  return placed;
}, n);

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const { context, page } = await boot(browser); globalThis.__page = page;
    await step('before the Local market exists the notch stays away; once it does, it sits on the main menu and the pack timer makes room', async () => {
      await page.waitForTimeout(1800);
      const before = await page.evaluate(() => { const l = document.querySelector('.mk-notch-layer'); return !l || l.hidden; });
      assert.equal(before, true, 'hidden for a player who has never opened the Market');
      await page.evaluate(() => { history.replaceState(null, '', location.pathname + '?dev=1'); Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
      await page.waitForSelector('.mk-page'); await page.waitForTimeout(900);
      await page.evaluate(() => Cardable.market.close()); await page.waitForTimeout(1600);
      const m = await page.evaluate(() => { const l = document.querySelector('.mk-notch-layer'), p = document.querySelector('.mk-notch-layer .mk-island').getBoundingClientRect(), hud = document.querySelector('.pack-hud').getBoundingClientRect(), hudBtn = document.querySelector('.mk-hud').getBoundingClientRect(); return { visible: !l.hidden, cls: document.body.classList.contains('has-notch'), pillTop: p.top, pillBottom: p.bottom, pillCentre: (p.left + p.right) / 2, hudTop: hud.top, hudBtnTop: hudBtn.top, vw: innerWidth }; });
      assert.ok(m.visible && m.cls, 'the notch is on the main menu'); assert.ok(Math.abs(m.pillTop - m.hudBtnTop) <= 1, 'on the same row as the round buttons'); assert.ok(Math.abs(m.pillCentre - m.vw / 2) <= 2, 'centred'); assert.ok(m.hudTop >= m.pillBottom, 'the pack timer is below it, not under it: ' + m.hudTop + ' vs ' + m.pillBottom);
      await page.screenshot({ path: path.join(out, 'menu.png') });
      return m;
    });

    await step('it shows what you can spend and what your cards are worth, and the spending matches the wallet', async () => {
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(700);
      const t = await page.evaluate(() => ({ big: document.querySelector('.mk-notch-big').textContent.replace(/,/g, ''), wallet: Cardable.market.api.walletSync('simulation'), nw: (document.querySelector('.mk-notch-nw') || {}).textContent, sub: document.querySelector('.mk-notch-spend .mk-notch-sub').textContent }));
      assert.equal(Number(t.big), t.wallet.available, 'to spend equals the available Credits');
      assert.ok(t.nw && Number(t.nw.replace(/,/g, '')) >= t.wallet.balance, 'net worth includes the cards: ' + t.nw);
      await page.screenshot({ path: path.join(out, 'panel-empty.png') });
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      return t;
    });

    await step('with bids open, the pill says what needs you and the panel offers higher bids', async () => {
      const placed = await bid(page, 3);
      assert.ok(placed.length >= 2 && placed.every((p) => p[1]), 'bids placed: ' + JSON.stringify(placed));
      // what the pill says is one of the top items (it moves through them every few seconds), and the feed holds the bids
      await page.waitForFunction(() => { const r = Cardable.market.ui.island.result; return r && r.items.some((i) => ['outbid', 'ending', 'bids'].indexOf(i.cat) >= 0); }, null, { timeout: 9000 });
      const says = await page.evaluate(() => { const r = Cardable.market.ui.island.result, a = document.querySelector('.mk-notch-layer .mk-island').getAttribute('aria-label'); return { a, ok: r.spotlight.some((i) => a.indexOf(i.label + ': ') === 0) }; });
      assert.ok(says.ok, 'the pill says one of the spotlight items: ' + says.a);
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(900);
      const t = await page.evaluate(() => ({ rows: document.querySelectorAll('.mk-island-row').length, quick: Array.from(document.querySelectorAll('.mk-quick[data-kind="raise"]')).map((b) => b.textContent), held: document.querySelector('.mk-notch-spend .mk-notch-sub').textContent }));
      assert.ok(t.rows >= 2, 'rows: ' + t.rows); assert.ok(t.quick.length >= 2, 'quick bids: ' + t.quick.join('|')); assert.ok(/held/.test(t.held), 'the held Credits are said: ' + t.held);
      await page.screenshot({ path: path.join(out, 'panel-bids.png') });
      return t;
    });

    await step('a quick bid opens the usual review, changes nothing until confirmed, and then raises the maximum', async () => {
      const before = await page.evaluate(() => { const w = Cardable.marketSim.runtime.world; return { cr: Cardable.state.current.currency, held: Cardable.marketSim.heldCredits() }; });
      await wake(page);
      if (!(await page.evaluate(() => !!document.querySelector('.mk-island-panel')))) { await page.click(pill); await page.waitForSelector('.mk-island-panel'); }
      await page.waitForTimeout(500);
      const chip = page.locator('.mk-quick[data-kind="raise"]').first();
      const label = await chip.textContent();
      await chip.click();
      await page.waitForSelector('.mk-review', { timeout: 4000 });
      const text = await page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert.ok(/Raise your bid/.test(text) && /Your new maximum/.test(text) && /Nothing is paid until you win/.test(text), text);
      await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'review.png') });
      assert.equal(await credits(page), before.cr, 'nothing moved while the review was open');
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^Cancel/ }).click(); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.querySelectorAll('.mk-review').length), 0);
      assert.equal(await page.evaluate(() => Cardable.marketSim.heldCredits()), before.held, 'cancelling changed nothing');
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(500);
      await page.locator('.mk-quick[data-kind="raise"]').first().click(); await page.waitForSelector('.mk-review');
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^Bid up to/ }).click();
      await page.waitForFunction((h) => Cardable.marketSim.heldCredits() > h, before.held, { timeout: 6000 });
      return { label };
    });

    await step('what needs you while the Market is closed peeks as a card with the same quick options', async () => {
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      // a sale of ours arrives (the world's own notice, as a trader buying one of our listings would leave)
      await page.evaluate(() => { const w = Cardable.marketSim.runtime.world; w.notices.push({ id: 'nz' + Date.now(), ty: 'sold', text: 'Sold GeForce GTX 760 for 120 Credits', t: w.now, listing: null, offer: null, read: false }); Cardable.market.ui.island.refresh(true); });
      let found = false;
      for (let i = 0; i < 10 && !found; i++) { await page.waitForTimeout(250); found = await page.evaluate(() => !!document.querySelector('.mk-notch-peek')); }
      assert.ok(found, 'a peek appeared');
      const t = await page.evaluate(() => { const e = document.querySelector('.mk-notch-peek'), r = e.getBoundingClientRect(); return { text: e.textContent, buttons: e.querySelectorAll('button').length, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0, tone: e.dataset.tone }; });
      assert.ok(t.buttons >= 2 && t.inside && t.text.length > 8, JSON.stringify(t));
      await page.screenshot({ path: path.join(out, 'peek.png') });
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => !!document.querySelector('.mk-notch-peek')), false, 'Escape dismisses it');
      return t;
    });

    await step('Customize: the order is the priority, a switch hides a kind, and the pill follows at once', async () => {
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel');
      await page.click('.mk-island-head .mk-icon-button'); await page.waitForSelector('.mk-notchset');
      await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'customize.png') });
      // move "Your bids" above everything with the keyboard
      const target = page.locator('.mk-notchset-row[data-id="bids"]');
      await target.focus();
      for (let i = 0; i < 6; i++) await page.keyboard.press('Alt+ArrowUp');
      await page.waitForTimeout(200);
      const order = await page.evaluate(() => Cardable.settings.get('marketNotchOrder'));
      assert.ok(order.split(',').indexOf('bids') < order.split(',').indexOf('listings') && order.split(',').indexOf('bids') <= 1, 'saved with bids near the top: ' + order);
      // hide Outbid
      await page.locator('.mk-notchset-row[data-id="outbid"] input[role="switch"]').evaluate((e) => e.click());
      assert.ok(/outbid/.test(await page.evaluate(() => Cardable.settings.get('marketNotchHidden'))), 'hidden is saved');
      // quiet: only what needs you
      await page.locator('.mk-notchset .mk-segments button', { hasText: 'Quiet' }).click(); await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => Cardable.settings.get('marketNotchMode')), 'quiet');
      await page.locator('.mk-modal-actions button', { hasText: 'Done' }).click(); await page.waitForTimeout(600);
      const res = await page.evaluate(() => { const r = Cardable.market.ui.island.result; return { cats: r.items.map((i) => i.cat), spotlight: r.spotlight.map((i) => i.cat) }; });
      assert.ok(!res.cats.includes('outbid'), 'Outbid is off: ' + res.cats.join(','));
      assert.ok(!res.cats.some((c) => ['bids', 'listings', 'watch', 'deals', 'fell', 'rose', 'sales'].indexOf(c) >= 0), 'quiet leaves the background out: ' + res.cats.join(','));
      return { order, res };
    });

    await step('pinning keeps an item first, hiding it for an hour removes it, and Reset restores the defaults', async () => {
      await page.evaluate(() => { Cardable.settings.set('marketNotchMode', 'busy'); Cardable.settings.set('marketNotchHidden', ''); });
      await page.waitForTimeout(500);
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(500);
      const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-island-row')).map((r) => r.querySelector('strong').textContent));
      assert.ok(rows.length >= 3, 'rows: ' + rows.length);
      const last = page.locator('.mk-island-row').nth(rows.length - 1);
      const title = rows[rows.length - 1];
      await last.hover();
      await last.locator('.mk-island-pin').click(); await page.waitForTimeout(500);
      const first = await page.evaluate(() => document.querySelector('.mk-island-row strong').textContent);
      assert.equal(first, title, 'the pinned item leads');
      assert.ok(await page.evaluate(() => /Pinned/.test(document.querySelector('.mk-notch-group').textContent)), 'under a Pinned heading');
      const row0 = page.locator('.mk-island-row').first(); await row0.hover();
      await row0.locator('.mk-island-tools .mk-icon-button').nth(1).click(); await page.waitForTimeout(500);
      const gone = await page.evaluate((t) => Array.from(document.querySelectorAll('.mk-island-row strong')).map((e) => e.textContent).indexOf(t), title);
      assert.equal(gone, -1, 'hidden for an hour');
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      // a visible tooltip takes the first Escape (it is dismissed first); the next one closes the panel
      if (await page.evaluate(() => !!document.querySelector('.mk-island-panel'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
      assert.equal(await page.evaluate(() => !!document.querySelector('.mk-island-panel')), false, 'Escape closes the panel');
      await page.evaluate(() => { const s = Cardable.settings; s.set('marketNotchOrder', 'worth,spend'); s.set('marketNotchMode', 'quiet'); });
      await wake(page); await page.click(pill); await page.waitForSelector('.mk-island-panel');
      await page.click('.mk-island-head .mk-icon-button'); await page.waitForSelector('.mk-notchset');
      await page.locator('.mk-modal-actions button', { hasText: 'Reset' }).click(); await page.waitForTimeout(250);
      const reset = await page.evaluate(() => ({ order: Cardable.settings.get('marketNotchOrder'), mode: Cardable.settings.get('marketNotchMode'), hidden: Cardable.settings.get('marketNotchHidden') }));
      assert.ok(/^outbid,offer,ending/.test(reset.order) && reset.mode === 'calm' && reset.hidden === '', JSON.stringify(reset));
      await page.locator('.mk-modal-actions button', { hasText: 'Done' }).click(); await page.waitForTimeout(300);
      await page.evaluate(() => Cardable.market.store.clearNotchSnoozes());
    });

    await step('the notch is part of Settings too: the four switches are saved with the shared settings and Off removes it from the main menu', async () => {
      const keys = await page.evaluate(() => ['marketNotch', 'marketNotchMode', 'marketNotchCycle', 'marketNotchPeek', 'marketNotchOrder', 'marketNotchHidden'].map((k) => [k, !!Cardable.settingsSchema.entries[k], Cardable.settings.get(k)]));
      keys.forEach((k) => assert.ok(k[1], k[0] + ' is in the schema'));
      await page.evaluate(() => Cardable.settings.set('marketNotch', false)); await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => document.querySelector('.mk-notch-layer').hidden), true, 'off on the main menu');
      assert.equal(await page.evaluate(() => document.body.classList.contains('has-notch')), false, 'and the pack timer moves back');
      await page.evaluate(() => { Cardable.market.open(); }); await page.waitForSelector('.mk-header .mk-island');
      assert.ok(await page.evaluate(() => !!document.querySelector('.mk-header .mk-island')), 'inside the Market it is always there');
      await page.evaluate(() => { Cardable.market.close(); Cardable.settings.set('marketNotch', true); });
      return keys;
    });
    await context.close();

    await step('Reduced motion: no ping, no peek animation, and the panel still opens', async () => {
      const { context: c2, page: p2 } = await boot(browser, { reducedMotion: true });
      await p2.evaluate(() => { history.replaceState(null, '', location.pathname + '?dev=1'); Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
      await p2.waitForSelector('.mk-page'); await p2.waitForTimeout(700); await p2.evaluate(() => Cardable.market.close()); await p2.waitForTimeout(1200);
      await bid(p2, 2); await p2.waitForTimeout(900);
      const t = await p2.evaluate(() => { const e = document.querySelector('.mk-notch-layer .mk-island'); return { anim: e.classList.contains('is-changed') || e.classList.contains('is-ping'), peekAnim: document.querySelector('.mk-notch-peek') ? getComputedStyle(document.querySelector('.mk-notch-peek')).animationName : 'none' }; });
      assert.equal(t.anim, false, 'the pill does not breathe or ping'); assert.ok(t.peekAnim === 'none', 'the peek is not animated: ' + t.peekAnim);
      await p2.click('.mk-notch-layer .mk-island'); await p2.waitForSelector('.mk-island-panel');
      await c2.close();
    });

    await step('on a small window the pill becomes its glyph, and on a phone it stays out of the way', async () => {
      const { context: c3, page: p3 } = await boot(browser, { width: 900, height: 700 });
      await p3.evaluate(() => { history.replaceState(null, '', location.pathname + '?dev=1'); Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
      await p3.waitForSelector('.mk-page'); await p3.waitForTimeout(600); await p3.evaluate(() => Cardable.market.close()); await p3.waitForTimeout(1300);
      const small = await p3.evaluate(() => { const r = document.querySelector('.mk-notch-layer .mk-island').getBoundingClientRect(), m = document.querySelector('.mk-hud').getBoundingClientRect(); return { w: r.width, gapToMarket: m.left - r.right, inside: r.left >= 0 && r.right <= innerWidth }; });
      assert.ok(small.w <= 46 && small.inside && small.gapToMarket >= 8 && small.gapToMarket <= 20, JSON.stringify(small));
      await p3.setViewportSize({ width: 390, height: 844 }); await p3.waitForTimeout(400);
      const phone = await p3.evaluate(() => getComputedStyle(document.querySelector('.mk-notch-layer')).display);
      assert.equal(phone, 'none', 'hidden below 520 px');
      await c3.close();
    });
  } catch (error) { failed = error; console.log('FATAL ' + (error.stack || error)); }
  await browser.close();
  evidence.failed = evidence.steps.filter((s) => !s.ok).length;
  if (evidence.pageErrors.length) { evidence.failed++; console.log('page errors:', JSON.stringify(evidence.pageErrors.slice(0, 3))); }
  if (evidence.console.length) console.log('console errors:', JSON.stringify(evidence.console.slice(0, 3)));
  fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(evidence.steps.length + ' steps, ' + evidence.failed + ' failed; screenshots in ' + path.relative(root, out));
  process.exit(failed || evidence.failed ? 1 : 0);
})();
