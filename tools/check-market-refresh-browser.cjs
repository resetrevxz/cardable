'use strict';
// The Market refresh (1.13.0), driven through the real interface in headless Chromium (it never opens a window):
// the notch and header no longer rebuild on every clock tick, the timer bar's next-special-pack chip stays inside its pill,
// the realms are named Standard and Players, the first-visit tour, the Shop as a Market tab (a purchase goes through the
// review and lands in the inventory with an arrival card), the auction tracker at the top, tab icon motion, and the
// traders' generated handles.
//   node tools/check-market-refresh-browser.cjs [--out qa-output/market-refresh]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-refresh');
const evidence = { when: new Date().toISOString(), steps: [], pageErrors: [] };
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => evidence.pageErrors.push(String(e).slice(0, 300)));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell);
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true }; s.currency = 20000;
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    ['common', 'rare', 'legendary'].forEach((r, i) => { const c = cards.find((x) => x.rarity === r); s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: c.id, variantId: null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now(), seen: true }); });
    s.serialCounter = 10; C.state.commit(s);
  });
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  await page.waitForTimeout(800);
  return { context, page };
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 800) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 4).join('\n     ')); }
}
// elements added (a rebuild; a clock rewriting its own text does not count) and animations started inside `sel` over `ms`
const churn = (page, sel, ms) => page.evaluate(([sel, ms]) => new Promise((res) => {
  const n = document.querySelector(sel); if (!n) { res(null); return; }
  let adds = 0, anim = 0; const mo = new MutationObserver((l) => l.forEach((m) => { m.addedNodes.forEach((a) => { if (a.nodeType === 1) adds++; }); }));
  mo.observe(n, { subtree: true, childList: true }); const on = () => anim++; n.addEventListener('animationstart', on, true);
  setTimeout(() => { mo.disconnect(); n.removeEventListener('animationstart', on, true); res({ adds, anim }); }, ms);
}), [sel, ms]);

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await boot(browser);

    await step('the timer bar: the next special pack is a chip inside the pill, and an in-slot tag stays inside too', async () => {
      const r = await page.evaluate(() => {
        try { Cardable.packs.forceNext('nvidia'); } catch (_) { /* the queue may already be set */ }
        const hud = document.querySelector('.pack-hud').getBoundingClientRect(), inside = (e) => { const b = e.getBoundingClientRect(); return b.top >= hud.top - 0.5 && b.bottom <= hud.bottom + 0.5 && b.left >= hud.left - 0.5 && b.right <= hud.right + 0.5; };
        const beyond = document.querySelector('.pack-queue-beyond'), tags = Array.from(document.querySelectorAll('.pack-hud .pack-queue-marker .pack-counter-glyph'));
        return { beyondShown: !!beyond && !beyond.hidden, beyondInside: !beyond || beyond.hidden || inside(beyond), label: beyond && beyond.getAttribute('aria-label'), tags: tags.length, tagsInside: tags.every(inside) };
      });
      assert.ok(r.beyondInside, 'the chip is inside the pill');
      assert.ok(r.tagsInside, 'in-slot tags are inside the pill');
      if (r.beyondShown) assert.match(r.label, / in \d+ packs$/);
      return r;
    });

    await step('the realms are called Standard and Players', async () => {
      await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); }); await page.waitForSelector('.mk-page'); await page.waitForTimeout(900);
      const names = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-realm-switch .mk-segment')).map((b) => b.textContent.trim()));
      assert.deepEqual(names, ['Standard', 'Players']);
      return names;
    });

    await step('the header and the notch do not rebuild on clock ticks', async () => {
      await page.evaluate(() => Cardable.marketSim.runtime.setSpeed('fast'));
      const header = await churn(page, '.mk-header', 4000);
      assert.ok(header && header.adds === 0, 'header nodes added in 4 s of ticking: ' + JSON.stringify(header));
      await page.evaluate(() => Cardable.market.close()); await page.waitForTimeout(600);
      await page.mouse.move(300, 500, { steps: 3 }); await page.mouse.move(720, 300, { steps: 3 });
      // the pill moving on to its next item every few seconds is meant to animate; with that off, ticking alone must change nothing
      await page.evaluate(() => Cardable.settings.set('marketNotchCycle', false)); await page.waitForTimeout(1200);
      const menu = await churn(page, '.mk-notch-layer', 5000);
      await page.evaluate(() => Cardable.settings.set('marketNotchCycle', true));
      assert.ok(menu && menu.adds === 0 && menu.anim === 0, 'menu notch in 5 s: ' + JSON.stringify(menu));
      await page.click('.mk-notch-layer .mk-island'); await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(500);
      const panel = await churn(page, '.mk-island-panel', 4000);
      assert.ok(panel && panel.adds <= 4, 'open panel in 4 s: ' + JSON.stringify(panel));
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      await page.evaluate(() => Cardable.marketSim.runtime.setSpeed('brisk'));
      return { header, menu, panel };
    });

    await step('a new player gets the tour once: it points at real controls, Escape ends it, and More plays it again', async () => {
      const ctx2 = await boot(browser); const p = ctx2.page;
      await p.evaluate(() => Cardable.market.open()); await p.waitForSelector('.mk-tour-card', { timeout: 5000 });
      const first = await p.evaluate(() => document.querySelector('.mk-tour-card h2').textContent);
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
      const spot = await p.evaluate(() => { const s = document.querySelector('.mk-tour-spot').getBoundingClientRect(), t = document.querySelector('.mk-tab[data-tab="discover"]').getBoundingClientRect(); return { dx: Math.abs((s.left + s.width / 2) - (t.left + t.width / 2)), dy: Math.abs((s.top + s.height / 2) - (t.top + t.height / 2)) }; });
      assert.ok(spot.dx < 4 && spot.dy < 4, 'the spotlight sits on Browse: ' + JSON.stringify(spot));
      await p.screenshot({ path: path.join(out, 'tour.png') });
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      assert.equal(await p.evaluate(() => !!document.querySelector('.mk-tour')), false, 'Escape ends it');
      assert.equal(await p.evaluate(() => Cardable.market.ui.shell.isOpen), true, 'and leaves the Market open');
      await p.evaluate(() => { Cardable.market.close(); Cardable.market.open(); }); await p.waitForTimeout(1200);
      assert.equal(await p.evaluate(() => !!document.querySelector('.mk-tour')), false, 'not again on its own');
      await p.click('.mk-tab-more'); await p.locator('.mk-more-item', { hasText: 'Take the tour' }).click(); await p.waitForSelector('.mk-tour-card');
      await ctx2.context.close();
      return { first };
    });

    await step('the Shop is a Market tab: the bag on the main menu opens it, and a card is bought through the review', async () => {
      await page.mouse.move(300, 500, { steps: 3 }); await page.mouse.move(1270, 54, { steps: 3 }); await page.waitForTimeout(400);
      await page.click('#shop-entry'); await page.waitForSelector('.mk-shop-page', { timeout: 5000 }); await page.waitForTimeout(900);
      assert.equal(await page.evaluate(() => Cardable.market.ui.shell.current().name), 'shop');
      const offers = await page.evaluate(() => document.querySelectorAll('.mk-shop-card').length);
      assert.ok(offers >= 1, 'offers shown: ' + offers);
      await page.screenshot({ path: path.join(out, 'shop.png') });
      const before = await page.evaluate(() => ({ cr: Cardable.state.current.currency, n: Cardable.state.current.inventory.length }));
      const buy = page.locator('.mk-shop-card[data-state="open"] .mk-button:not([disabled])').first();
      await buy.click(); await page.waitForSelector('.mk-review');
      assert.equal(await page.evaluate(() => Cardable.state.current.currency), before.cr, 'nothing is paid while the review is open');
      const price = await page.evaluate(() => Number(document.querySelector('.mk-review .mk-review-rows .mk-credits').getAttribute('aria-label').replace(/\D/g, '')));
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^Buy for/ }).click();
      await page.waitForFunction((n) => Cardable.state.current.inventory.length === n + 1, before.n, { timeout: 5000 });
      const after = await page.evaluate(() => ({ cr: Cardable.state.current.currency, arrival: !!document.querySelector('.mk-arrival'), bought: document.querySelectorAll('.mk-shop-card[data-state="purchased"]').length }));
      assert.equal(before.cr - after.cr, price, 'it cost exactly its price');
      assert.ok(after.arrival, 'an arrival card says it is in the inventory');
      assert.ok(after.bought >= 1, 'the offer is marked bought');
      await page.screenshot({ path: path.join(out, 'shop-bought.png') });
      return { price, offers };
    });

    await step('bidding puts the auction in the tracker at the top, with whether you lead and the time left', async () => {
      const placed = await page.evaluate(async () => {
        const w = Cardable.marketSim.runtime.world, api = Cardable.market.api, outp = [];
        for (const l of Object.values(w.listings).filter((x) => x.status === 'open' && x.kind === 'auction' && x.seller !== 'you').slice(0, 2)) { let r = await api.placeBid('simulation', l.id, l.start + 1, 'r1' + l.id); if (!r.ok && r.minimum) r = await api.placeBid('simulation', l.id, r.minimum, 'r2' + l.id); outp.push(!!r.ok); }
        Cardable.market.ui.shell.goTab('auctions'); return outp;
      });
      await page.waitForTimeout(900);
      const t = await page.evaluate(() => ({ hidden: document.querySelector('.mk-tracker-host').hidden, chips: Array.from(document.querySelectorAll('.mk-track')).map((c) => ({ tone: c.dataset.tone, label: c.getAttribute('aria-label') })) }));
      assert.equal(t.hidden, false); assert.ok(t.chips.length >= placed.filter(Boolean).length, JSON.stringify(t));
      t.chips.forEach((c) => assert.match(c.label, /(Leading|Outbid|bid)/));
      await page.screenshot({ path: path.join(out, 'tracker.png') });
      return t;
    });

    await step('arriving at a tab plays its icon motion once', async () => {
      await page.evaluate(() => Cardable.market.ui.shell.goTab('discover'));
      const anim = await page.evaluate(() => { const b = document.querySelector('.mk-tab[data-tab="discover"]'); return { cls: b.classList.contains('is-anim'), name: getComputedStyle(b.querySelector('.mk-tab-icon')).animationName }; });
      assert.ok(anim.cls && /mk-ic-spin/.test(anim.name), JSON.stringify(anim));
      return anim;
    });

    await step('traders have unique generated handles and tiles lead with them', async () => {
      const r = await page.evaluate(() => { const w = Cardable.marketSim.runtime.world, a = w.bots.map((b) => b.alias); return { n: a.length, unique: new Set(a.map((x) => x.toLowerCase())).size, sample: a.slice(0, 6), v: w.namesV, tileSeller: (document.querySelector('.mk-tile .mk-tile-seller .mk-seller-alias') || {}).textContent }; });
      assert.equal(r.unique, r.n); assert.equal(r.v, 2); assert.ok(r.tileSeller, 'a tile shows its seller at the top');
      return r;
    });

    assert.equal(evidence.pageErrors.length, 0, 'page errors: ' + evidence.pageErrors.join(' | '));
  } catch (error) {
    evidence.steps.push({ name: 'run', ok: false, error: String(error.message || error) });
    console.log('FAIL ' + String(error.message || error));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
    const failed = evidence.steps.filter((s) => !s.ok).length;
    console.log((evidence.steps.length - failed) + ' steps passed, ' + failed + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
    process.exitCode = failed ? 1 : 0;
  }
})();
