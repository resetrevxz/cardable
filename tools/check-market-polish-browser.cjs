'use strict';
// "The same Cardable" (1.11.0): the four round menu buttons, a header that does not move between Local and Global, an icon dock with names
// on hover, the island (what needs you, and the clock), rarity on tiles and holdings, the flight of a card into Portfolio, Global's own Home,
// and a phone layout that stays inside the window. Driven through the real interface in headless Chromium; it never opens a window.
//   node tools/check-market-polish-browser.cjs [--out qa-output/market-polish]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-polish');
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
  await page.evaluate((all) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true }; s.currency = 3000;
    if (all) {
      const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
      ['basic', 'common', 'uncommon', 'rare', 'super-rare', 'unusual', 'double-super-rare', 'legendary', 'mythical', 'exotic', 'ascendant', 'secret'].forEach((r, i) => {
        const c = cards.find((x) => x.rarity === r);
        if (c) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: c.id, variantId: null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now() - i * 1000, seen: true });
      });
      s.serialCounter = 100;
    }
    C.state.commit(s);
  }, !!options.holdings);
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  return { context, page };
}
async function openMarket(page) {
  await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
  await page.waitForSelector('.mk-page');
  await page.waitForTimeout(700);
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 700) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 4).join('\n     ')); }
}
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const rects = (page, selectors) => page.evaluate((list) => { const r = {}; list.forEach((q) => { const e = document.querySelector(q); if (e) { const b = e.getBoundingClientRect(); r[q] = [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; } }); return r; }, selectors);

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const { context, page } = await boot(browser, { holdings: true });
    await step('the four menu buttons are one family: 44 px circles, 12 px apart, the Shop one too', async () => {
      await page.waitForTimeout(2200);
      const m = await page.evaluate(() => ['.mk-hud', '#shop-entry', '.cb-menu-help', '.settings-corner button'].map((q) => { const e = document.querySelector(q), r = e.getBoundingClientRect(), c = getComputedStyle(e); return { q, x: r.left, y: r.top, w: r.width, h: r.height, radius: parseFloat(c.borderTopLeftRadius), text: (e.textContent || '').trim(), svg: !!e.querySelector('svg') }; }));
      m.forEach((b) => { assert.ok(near(b.w, 44, .6) && near(b.h, 44, .6), b.q + ' is 44 x 44: ' + b.w + ' x ' + b.h); assert.ok(b.radius >= 22, b.q + ' is round: ' + b.radius); assert.ok(near(b.y, m[0].y, .6), b.q + ' shares the top edge'); });
      assert.equal(m[1].text, '', 'the Shop button is an icon'); assert.ok(m[1].svg, 'with an icon');
      for (let i = 1; i < m.length; i++) assert.ok(near(m[i].x - (m[i - 1].x + m[i - 1].w), 12, 1), m[i - 1].q + ' to ' + m[i].q + ' is 12 px: ' + (m[i].x - (m[i - 1].x + m[i - 1].w)));
      await page.screenshot({ path: path.join(out, 'menu.png'), clip: { x: 1100, y: 0, width: 340, height: 100 } });
      return m;
    });

    await openMarket(page);
    const SELECTORS = ['.mk-brand-mark', '.mk-search', '.mk-header .mk-island', '.mk-sim-chip', '.mk-realm-switch', '.mk-wallet', '.mk-close', '.mk-tabs', '.mk-tab[data-tab="home"]', '.mk-tab[data-tab="discover"]', '.mk-tab[data-tab="auctions"]', '.mk-tab[data-tab="portfolio"]', '.mk-tab[data-tab="stocks"]', '.mk-tab-more', '.mk-util'];
    await step('the header does not move between Local and Global, and keeps every section', async () => {
      const local = await rects(page, SELECTORS);
      const localIsland = await page.evaluate(() => document.querySelector('.mk-header .mk-island').textContent);
      await page.evaluate(() => Cardable.market.store.setRealm('global'));
      await page.waitForTimeout(900);
      const global = await rects(page, SELECTORS);
      const globalIsland = await page.evaluate(() => document.querySelector('.mk-header .mk-island').textContent);
      Object.keys(local).forEach((q) => { assert.ok(global[q], q + ' exists in Global'); local[q].forEach((v, i) => assert.ok(near(v, global[q][i], 1), q + ' moved: ' + local[q] + ' to ' + global[q])); });
      assert.notEqual(localIsland, globalIsland, 'the island says something different in each realm: ' + localIsland + ' / ' + globalIsland);
      const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-tabs > .mk-tab')).filter((b) => !b.hidden).length);
      assert.equal(tabs, 6, 'five sections and More in Global too');
      const home = await page.evaluate(() => Cardable.market.ui.shell.goTab('home')); await page.waitForTimeout(700);
      const h1 = await page.evaluate(() => ({ h1: document.querySelector('.mk-page h1').textContent, ask: /Connect|Try again|Open Local/.test(document.querySelector('.mk-home').textContent) }));
      assert.equal(h1.h1, 'Home'); assert.ok(h1.ask, 'Global Home offers a next step');
      await page.screenshot({ path: path.join(out, 'global-home.png') });
      return { localIsland, globalIsland };
    });

    await page.evaluate(() => Cardable.market.store.setRealm('simulation')); await page.waitForTimeout(700);
    await step('the dock is icons only, every section keeps its name, and the name appears on hover', async () => {
      const info = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-tab[data-tab]')).map((b) => { const l = b.querySelector('.mk-tab-label'), r = l.getBoundingClientRect(); return { tab: b.dataset.tab, visibleText: r.width > 2, name: (b.textContent || '').trim().replace(/\d+$/, ''), icon: !!b.querySelector('svg') }; }));
      info.forEach((i) => { assert.ok(!i.visibleText, i.tab + ' shows no text'); assert.ok(i.icon && i.name.length >= 3, i.tab + ' has an icon and a name: ' + i.name); });
      await page.hover('.mk-tab[data-tab="auctions"]');
      await page.waitForSelector('.cb-tooltip', { timeout: 3000 });
      const tip = await page.evaluate(() => document.querySelector('.cb-tooltip').textContent);
      assert.ok(/Auctions/.test(tip), 'tooltip: ' + tip);
      await page.mouse.move(700, 600);
      return info.map((i) => i.tab + ':' + i.name);
    });

    await step('the island: the clock when nothing is open, then what needs you, and it opens, reads, closes and returns focus', async () => {
      const idle = await page.evaluate(() => document.querySelector('.mk-sim-chip').getAttribute('aria-label'));
      assert.ok(/Simulation clock: Day \d+/.test(idle), 'the clock chip says the day: ' + idle);
      await page.evaluate(async () => {
        const w = Cardable.marketSim.runtime.world, list = Object.values(w.listings).filter((x) => x.status === 'open' && x.kind === 'auction' && x.seller !== 'you').slice(0, 2);
        for (const l of list) { let r = await Cardable.market.api.placeBid('simulation', l.id, l.start + 1, 'p1' + l.id); if (!r.ok && r.minimum) r = await Cardable.market.api.placeBid('simulation', l.id, r.minimum, 'p2' + l.id); }
      });
      await page.waitForFunction(() => /^(Outbid|Leading|Ends soon)/.test(document.querySelector('.mk-header .mk-island').getAttribute('aria-label')), null, { timeout: 8000 });
      const label = await page.evaluate(() => document.querySelector('.mk-header .mk-island').getAttribute('aria-label'));
      await page.focus('.mk-header .mk-island'); await page.keyboard.press('Enter');
      await page.waitForSelector('.mk-island-panel'); await page.waitForTimeout(700);
      const panel = await page.evaluate(() => ({ rows: document.querySelectorAll('.mk-island-row').length, text: document.querySelector('.mk-island-panel').textContent, expanded: document.querySelector('.mk-header .mk-island').getAttribute('aria-expanded'), inside: (() => { const r = document.querySelector('.mk-island-pop').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })() }));
      assert.ok(panel.rows >= 1, 'rows for the bids: ' + panel.rows);
      assert.ok(/Your market/.test(panel.text) && /to spend/.test(panel.text) && /Pause|Resume/.test(panel.text) && /Calm/.test(panel.text), panel.text.slice(0, 200));
      assert.equal(panel.expanded, 'true'); assert.ok(panel.inside, 'panel inside the window');
      await page.screenshot({ path: path.join(out, 'island-open.png') });
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      const closed = await page.evaluate(() => ({ open: !!document.querySelector('.mk-island-panel'), focus: document.activeElement === document.querySelector('.mk-header .mk-island'), expanded: document.querySelector('.mk-header .mk-island').getAttribute('aria-expanded') }));
      assert.equal(closed.open, false); assert.equal(closed.expanded, 'false'); assert.ok(closed.focus, 'focus returns to the island');
      return { label, rows: panel.rows };
    });

    await step('a card that wears a rarity: tier colours and edges grow with the tier, Basic stays plain', async () => {
      await page.evaluate(() => Cardable.market.ui.go('portfolio', {}, { reset: true }));
      await page.waitForSelector('.mk-hold', { timeout: 8000 }); await page.waitForTimeout(900);
      const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mk-hold')).map((t) => { const edge = getComputedStyle(t, '::after'), foil = getComputedStyle(t.querySelector('.mk-tile-art'), '::after'); return { rarity: t.dataset.rarity, tier: Number(t.style.getPropertyValue('--mk-tier')), rgb: t.style.getPropertyValue('--mk-rgb'), edge: edge.content !== 'none', foil: foil.animationName !== 'none' && foil.animationName !== '' }; }));
      assert.ok(rows.length >= 10, 'holdings drawn as cards: ' + rows.length);
      const by = (r) => rows.find((x) => x.rarity === r);
      assert.ok(by('basic') && !by('basic').edge && !by('basic').foil, 'Basic has no edge and no foil');
      assert.ok(by('legendary').edge && by('legendary').foil && by('secret').edge, 'Legendary and Secret carry the prismatic edge and foil');
      assert.ok(by('super-rare').foil && !by('super-rare').edge, 'Super Rare gets the foil but not the edge');
      assert.ok(rows.every((r) => /^\d+,\s*\d+,\s*\d+$/.test(r.rgb)), 'every tile has its rarity colour: ' + rows.map((r) => r.rgb).join(' | '));
      assert.notEqual(by('mythical').rgb, by('legendary').rgb, 'rarities do not share a colour');
      await page.evaluate(() => { document.querySelector('.mk-main').scrollTop = 600; }); await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(out, 'holdings.png') });
      return rows.map((r) => r.rarity + ':' + r.tier);
    });

    await step('a settled purchase flies the card into Portfolio and leaves nothing behind', async () => {
      await page.evaluate(() => Cardable.market.ui.shell.goTab("home")); await page.waitForTimeout(600);
      await page.evaluate(() => { window.__received = 0; const t = document.querySelector('.mk-tab[data-tab="portfolio"]'); new MutationObserver(() => { if (t.classList.contains('is-received')) window.__received++; }).observe(t, { attributes: true, attributeFilter: ['class'] }); });
      const id = await page.evaluate(() => { const w = Cardable.marketSim.runtime.world; const l = Object.values(w.listings).filter((x) => x.status === 'open' && x.kind === 'fixed' && x.seller !== 'you' && x.ask < 400).sort((a, b) => b.ask - a.ask)[0]; return l.id; });
      await page.evaluate((x) => { Cardable.market.api.purchase('simulation', x, 'polish-' + x, 99999); }, id);
      await page.waitForTimeout(500);
      const during = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.mk-settle').length, art: !!document.querySelector('.mk-settle .mk-settle-art') }));
      assert.equal(during.ghosts, 1, 'one card in flight');
      await page.screenshot({ path: path.join(out, 'settle.png') });
      await page.waitForFunction(() => document.querySelectorAll('.mk-settle').length === 0 && window.__received > 0, null, { timeout: 6000 });
      const left = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.mk-settle, .mk-coinfly, .mk-settle-rays').length }));
      assert.equal(left.ghosts, 0, 'everything removed');
    });
    await context.close();

    await step('with reduced motion nothing flies, nothing breathes, and the trade still settles', async () => {
      const { context: c2, page: p2 } = await boot(browser, { reducedMotion: true });
      await openMarket(p2);
      const before = await p2.evaluate(() => Cardable.state.current.inventory.length);
      const id = await p2.evaluate(() => { const w = Cardable.marketSim.runtime.world; return Object.values(w.listings).filter((x) => x.status === 'open' && x.kind === 'fixed' && x.seller !== 'you' && x.ask < 400)[0].id; });
      await p2.evaluate((x) => { Cardable.market.api.purchase('simulation', x, 'rm-' + x, 99999); }, id);
      await p2.waitForFunction((n) => Cardable.state.current.inventory.length === n + 1, before, { timeout: 8000 });
      await p2.waitForTimeout(300);
      const seen = await p2.evaluate(() => ({ ghosts: document.querySelectorAll('.mk-settle').length, changed: document.querySelectorAll('.mk-island.is-changed, .mk-island.is-ping').length, ink: getComputedStyle(document.querySelector('.mk-tab-ink')).transitionDuration }));
      assert.equal(seen.ghosts, 0); assert.equal(seen.changed, 0);
      await c2.close();
    });

    await step('on a phone the header and island stay inside the window, and the bottom bar shows one name', async () => {
      const { context: c3, page: p3 } = await boot(browser, { width: 390, height: 844 });
      await openMarket(p3);
      const m = await p3.evaluate(() => {
        const f = document.querySelector('.mk-frame').getBoundingClientRect(), box = (q) => { const e = document.querySelector(q); return e ? e.getBoundingClientRect() : null; };
        const island = box('.mk-header .mk-island'), realm = box('.mk-realm-switch'), wallet = box('.mk-wallet'), close = box('.mk-close');
        const overlap = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const labels = Array.from(document.querySelectorAll('.mk-bottom-item')).map((b) => ({ name: b.getAttribute('aria-label'), shown: getComputedStyle(b.querySelector('span')).display !== 'none' }));
        return { scroll: document.querySelector('.mk-main').scrollWidth - document.querySelector('.mk-main').clientWidth, inside: [island, realm, wallet, close].every((r) => r.left >= f.left - 1 && r.right <= f.right + 1), overlap: overlap(island, realm) || overlap(wallet, close), labels, clockText: document.querySelector('.mk-sim-chip').textContent };
      });
      assert.ok(m.scroll <= 1, 'no sideways scroll: ' + m.scroll); assert.ok(m.inside, 'header controls inside the window'); assert.equal(m.overlap, false, 'no overlaps');
      assert.equal(m.labels.filter((l) => l.shown).length, 1, 'only the current section shows its name: ' + JSON.stringify(m.labels)); assert.ok(m.labels.every((l) => l.name), 'every one has an accessible name');
      assert.ok(/D(ay )?\d+/.test(m.clockText), 'the clock chip still says the day: ' + m.clockText);
      await p3.screenshot({ path: path.join(out, 'phone.png') });
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
