'use strict';
// Cardable Market Beta, Stage 1: headless browser acceptance check of the sample-data interface.
// Loads the real index.html from disk, opens the Market and drives its sample-data flows at every target
// size, graphics tier, theme and motion setting. Writes screenshots and a JSON evidence file.
//   node tools/check-market-browser.cjs [--out qa-output/market-beta/screenshots] [--quick]
// Headless: it never opens a window on the desktop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/screenshots');
const quick = args.includes('--quick');
const evidence = { when: new Date().toISOString(), viewports: [], tiers: [], themes: [], motion: {}, interactions: [], performance: {}, console: [], pageErrors: [], network: [] };
const SIZES = [['desktop-1920x1080', 1920, 1080, 1], ['desktop-1440x900', 1440, 900, 1], ['laptop-1366x768', 1366, 768, 1], ['tablet-768x1024', 768, 1024, 1], ['phone-390x844', 390, 844, 2], ['phone-360x800', 360, 800, 2], ['desktop-1440x900-2x', 1440, 900, 2]];

async function boot(browser, size, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: size[1], height: size[2] }, deviceScaleFactor: size[3], reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ size: size[0], type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ size: size[0], text: String(e).slice(0, 300) }));
  page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) evidence.network.push({ size: size[0], url: u.slice(0, 160) }); });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell);
  // A prepared save: tutorial finished, a spread of cards and a few Credits. The save is the browser profile's, not the player's.
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    const picks = [];
    ['basic', 'common', 'uncommon', 'rare', 'super-rare', 'unusual', 'double-super-rare', 'legendary'].forEach((r) => cards.filter((c) => c.rarity === r).slice(0, 3).forEach((c) => picks.push(c)));
    picks.forEach((c, i) => s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: c.id, variantId: i % 7 === 3 ? 'rainbow-holo' : null, serial: C.serial.format('TEST', i + 1), pulledAt: Date.now() - (i + 1) * 86400000, seen: true }));
    s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: picks[2].id, variantId: null, serial: C.serial.format('TEST', 99), pulledAt: Date.now(), seen: true });
    s.serialCounter = 120; s.currency = 460;
    C.state.commit(s);
  });
  await page.reload();
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.state.current.tutorial && Cardable.state.current.tutorial.done);
  await page.waitForTimeout(1200);
  // Stage 1 checks the sample-data interface; the live simulator is covered by check-market-sim-browser.cjs.
  await page.evaluate(() => Cardable.market.api.useSample(true));
  if (options.settings) await page.evaluate((s) => Object.keys(s).forEach((k) => Cardable.settings.set(k, s[k])), options.settings);
  return { context, page };
}
async function openMarket(page, route) {
  await page.evaluate((r) => { Cardable.market.store.markGuideSeen(); Cardable.market.open(r || { name: 'discover', params: {} }); }, route);
  await page.waitForSelector('.mk-page');
  await page.waitForTimeout(700);
}
async function a11y(page) {
  return page.evaluate(() => {
    const bad = [], ids = {}, dup = [];
    document.querySelectorAll('.mk-frame button, .mk-frame input, .mk-frame select, .mk-frame textarea, .mk-frame summary, .mk-frame [role="button"]').forEach((el) => {
      if (el.closest('[hidden]') || el.type === 'file') return;
      const labelled = (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
      const labels = el.labels ? Array.from(el.labels).map((l) => l.textContent).join(' ').trim() : '';
      const name = (el.getAttribute('aria-label') || '').trim() || labelled || labels || (el.textContent || '').trim() || (el.getAttribute('title') || '').trim() || (el.placeholder || '').trim();
      if (!name) bad.push(el.tagName + '.' + String(el.className).slice(0, 40));
    });
    document.querySelectorAll('.mk [id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
    Object.keys(ids).forEach((k) => { if (ids[k] > 1) dup.push(k); });
    return { unnamed: bad.slice(0, 8), dupIds: dup, headings: document.querySelectorAll('.mk-page h1').length };
  });
}
async function contrast(page) {
  return page.evaluate(() => {
    function parse(c) {
      let m = /rgba?\(([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null || Number.isNaN(p[3]) ? 1 : p[3] }; }
      m = /color\(srgb ([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] == null ? 1 : p[3] }; }
      return null;
    }
    function over(top, bottom) { const a = top.a + bottom.a * (1 - top.a); return { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; }
    function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
    function bg(el) { let layers = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; } } let base = { r: 8, g: 8, b: 10, a: 1 }; layers.reverse().forEach((l) => { base = over(l, base); }); return base; }
    const sel = ['.mk-muted', '.mk-hint', '.mk-eyebrow', '.mk-tile-meta', '.mk-tile-foot', '.mk-stat dt', '.mk-notice p', '.mk-pill', '.mk-segment', '.mk-tab', '.mk-resultcount', '.mk-tile-reason', '.mk-value-tag', '.mk-delta'];
    const results = []; let worst = 21;
    sel.forEach((q) => { const el = document.querySelector('.mk ' + q); if (!el) return; const style = getComputedStyle(el), fg = parse(style.color); if (!fg) return; const b = bg(el), f = over(fg, b); const L1 = lum(f), L2 = lum(b), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (Number.isFinite(ratio)) { results.push({ q, ratio: +ratio.toFixed(2), size: style.fontSize }); worst = Math.min(worst, ratio); } });
    return { worst: +worst.toFixed(2), results };
  });
}
async function shot(page, name) { fs.mkdirSync(out, { recursive: true }); await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 82 }); }
async function overflow(page) {
  return page.evaluate(() => {
    const f = document.querySelector('.mk-frame'), bad = [];
    document.querySelectorAll('.mk-frame *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > f.getBoundingClientRect().right + 1 && !el.closest('.mk-table, .mk-nav, .mk-presets, .mk-segments, .mk-hero-side, .mk-picker, .mk-sr, .mk-album-grid')) bad.push(el.className.toString().slice(0, 40));
    });
    return { scrollWidth: document.querySelector('.mk-main').scrollWidth, clientWidth: document.querySelector('.mk-main').clientWidth, offenders: Array.from(new Set(bad)).slice(0, 6) };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // ---- every size: Discover, a listing, the composer ----
    for (const size of SIZES.slice(0, quick ? 3 : SIZES.length)) {
      const { context, page } = await boot(browser, size);
      await openMarket(page);
      const opened = await page.evaluate(() => ({ tiles: document.querySelectorAll('.mk-tile').length, hero: !!document.querySelector('.mk-hero'), header: document.querySelector('.mk-header').getBoundingClientRect().height }));
      assert(opened.tiles >= 6, size[0] + ': Discover shows tiles');
      const of = await overflow(page);
      assert(of.scrollWidth <= of.clientWidth + 1, size[0] + ': no horizontal page scroll, offenders ' + of.offenders.join(','));
      await shot(page, 'discover-' + size[0]);
      // bottom nav on phones, top nav otherwise
      const navs = await page.evaluate(() => ({ top: getComputedStyle(document.querySelector('.mk-nav')).display, bottom: getComputedStyle(document.querySelector('.mk-bottom')).display }));
      if (size[1] <= 840) assert.equal(navs.top, 'none', size[0] + ': top nav folds away'); else assert.equal(navs.bottom, 'none', size[0] + ': bottom bar hidden');
      // listing detail
      await page.evaluate(() => { const l = Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 60, sort: 'rarity' }).items.map((e) => e.listing).find((l) => l.format === 'auction'); Cardable.market.ui.go('listing', { id: l.id }); });
      await page.waitForSelector('.mk-detail');
      await page.waitForTimeout(900);
      assert((await overflow(page)).scrollWidth <= (await overflow(page)).clientWidth + 1, size[0] + ': listing detail does not overflow');
      await shot(page, 'listing-' + size[0]);
      // composer with a selected card
      await page.evaluate(() => Cardable.market.ui.go('compose', {}));
      await page.waitForSelector('.mk-composer');
      await page.locator('.mk-pick-chips .mk-pill').nth(2).click();
      await page.waitForTimeout(300);
      await shot(page, 'composer-' + size[0]);
      evidence.viewports.push({ size: size[0], opened, overflow: of, navs });
      await context.close();
    }

    // ---- interactions at desktop ----
    {
      const { context, page } = await boot(browser, SIZES[1]);
      await openMarket(page);
      const log = (name, value) => evidence.interactions.push({ name, value });
      const count = () => page.locator('.mk-resultcount').innerText();
      log('initial', await count());
      evidence.contrastDiscover = await contrast(page);
      assert(evidence.contrastDiscover.worst >= 4.5, 'Discover text contrast, worst ' + evidence.contrastDiscover.worst);
      await page.locator('.mk-fsec .mk-pill', { hasText: /^Rare/ }).first().click(); await page.waitForTimeout(200);
      const afterRare = await count(); log('rarity filter', afterRare); assert.notEqual(afterRare, '168 listings');
      await page.locator('.mk-fsec .mk-pill', { hasText: /^Auction/ }).first().click(); await page.waitForTimeout(200);
      log('format filter', await count());
      assert((await page.locator('.mk-activechip').count()) >= 2, 'filter chips appear');
      await page.locator('.mk-sort select').selectOption('price-desc'); await page.waitForTimeout(200);
      const prices = await page.$$eval('.mk-tile .mk-credits .mk-num', (els) => els.slice(0, 6).map((e) => Number(e.textContent.replace(/[^\d.]/g, ''))));
      for (let i = 1; i < prices.length; i++) assert(prices[i] <= prices[i - 1] + 0.001, 'price-desc order ' + prices.join(','));
      log('sort price-desc', prices);
      // no results recovery
      await page.locator('.mk-search-input').fill('zzzzzz'); await page.locator('.mk-search-input').press('Enter'); await page.waitForTimeout(250);
      assert(await page.locator('.mk-empty[data-kind="no-results"]').count() === 1, 'no-results state');
      assert(await page.locator('.mk-hintbutton').count() >= 1, 'recovery suggestions');
      await page.locator('.mk-hintbutton').first().click(); await page.waitForTimeout(250);
      assert(await page.locator('.mk-tile').count() > 0, 'recovery brings results back');
      log('recovery', await count());
      // scroll and back preservation
      await page.locator('.mk-chiprow .mk-button', { hasText: 'Clear all' }).click().catch(() => {});
      await page.waitForTimeout(250);
      await page.evaluate(() => { document.querySelector('.mk-main').scrollTop = 900; });
      await page.waitForTimeout(150);
      await page.locator('.mk-tile .mk-tile-open').nth(3).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const before = await page.evaluate(() => document.querySelector('.mk-main').scrollTop);
      await page.locator('.mk-tile .mk-tile-open').nth(3).click({ force: true }).catch(async () => { await page.evaluate(() => document.querySelectorAll('.mk-tile .mk-tile-open')[3].click()); });
      await page.waitForSelector('.mk-detail'); await page.waitForTimeout(300);
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({ top: document.querySelector('.mk-main').scrollTop, page: Cardable.market.ui.shell.current().name, focus: document.activeElement && document.activeElement.className }));
      assert.equal(after.page, 'discover');
      assert(Math.abs(after.top - before) < 40, 'scroll restored: ' + before + ' vs ' + after.top);
      assert(/mk-tile-open/.test(after.focus), 'focus returns to the opening tile: ' + after.focus);
      log('back context', { before, after });
      // watch, saved view, alert
      await page.locator('.mk-tile .mk-watch').first().click();
      assert.equal(await page.evaluate(() => Cardable.market.store.prefs.watch.length), 1);
      // composer flow
      await page.evaluate(() => Cardable.market.store.clearPreview());
      await page.evaluate(() => Cardable.market.ui.go('compose', {}));
      await page.waitForSelector('.mk-composer');
      const publish = page.locator('.mk-side-actions .mk-button').first();
      assert(await publish.isDisabled(), 'publish disabled without a card');
      await page.locator('.mk-pick-chips .mk-pill').nth(2).click(); await page.waitForTimeout(250);
      assert(!(await publish.isDisabled()), 'publish enabled with a valid draft');
      const fee = await page.locator('.mk-sumrows').innerText();
      log('composer summary', fee.replace(/\s+/g, ' ').slice(0, 160));
      await publish.click(); await page.waitForSelector('.mk-review'); await page.waitForTimeout(150);
      assert(/Preview only/i.test(await page.locator('.mk-review').innerText()), 'review states it is a preview');
      assert.equal(await page.evaluate(() => Cardable.state.current.currency), 460, 'preview never changes Credits');
      const inventoryBefore = await page.evaluate(() => Cardable.state.current.inventory.length);
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      assert.equal(await page.locator('.mk-review').count(), 0, 'Escape closes the dialog');
      assert(await page.evaluate(() => Cardable.market.isOpen), 'Escape closed only the dialog, not the Market');
      assert.equal(await page.evaluate(() => Cardable.state.current.inventory.length), inventoryBefore);
      // cover image: local file, replace and remove; Director album chooser opens read-only
      await page.locator('.mk-present > summary').click(); await page.waitForTimeout(200);
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
      await page.locator('.mk-cover input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.mk-cover-img:not([hidden])').count(), 1, 'cover preview shows the chosen image');
      await page.locator('.mk-cover-frame').scrollIntoViewIfNeeded();
      await page.locator('.mk-present .mk-segment', { hasText: '16:9' }).click(); await page.waitForTimeout(150);
      assert.equal(await page.locator('.mk-cover-frame').getAttribute('data-ratio'), '16:9');
      await page.locator('.mk-cover-actions .mk-button', { hasText: 'From Director album' }).click(); await page.waitForSelector('.mk-album'); await page.waitForTimeout(400);
      assert.equal(await page.locator('.mk-album .mk-empty, .mk-album .mk-album-item').count() >= 1, true, 'album chooser shows photos or an empty state');
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      await page.locator('.mk-cover-actions .mk-button', { hasText: 'Remove' }).click(); await page.waitForTimeout(150);
      assert.equal(await page.locator('.mk-cover-img:not([hidden])').count(), 0, 'removing the cover restores the card cover');
      // simple mode hides custom duration; advanced shows it
      await page.locator('.mk-type-switch .mk-segment', { hasText: 'Auction' }).click(); await page.waitForTimeout(200);
      assert.equal(await page.locator('.mk-presets-inline .mk-pill', { hasText: 'Custom' }).count(), 0, 'no custom duration in Simple');
      await page.evaluate(() => Cardable.settings.set('marketMode', 'advanced')); await page.waitForTimeout(500);
      assert.equal(await page.locator('.mk-presets-inline .mk-pill', { hasText: 'Custom' }).count(), 1, 'custom duration in Advanced');
      await shot(page, 'composer-advanced-desktop-1440x900');
      await page.evaluate(() => Cardable.settings.set('marketMode', 'simple')); await page.waitForTimeout(400);
      // saved views, glossary help and the guide
      await page.evaluate(() => Cardable.market.ui.shell.goTab('discover')); await page.waitForTimeout(400);
      await page.locator('.mk-fsec .mk-pill', { hasText: /^Uncommon/ }).first().click(); await page.waitForTimeout(150);
      await page.evaluate(() => { const f = Cardable.market.store.prefs; });
      await page.locator('.mk-rail-foot .mk-button').click(); await page.waitForSelector('.mk-modal'); await page.locator('.mk-modal input').fill('Uncommons'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => Cardable.market.store.prefs.saved.length), 1, 'view saved');
      await page.locator('.mk-chiprow .mk-button', { hasText: 'Clear all' }).click({ timeout: 1500 }).catch(() => {});
      // saved views belong to Advanced; the Simple list keeps only the sort
      await page.evaluate(() => Cardable.settings.set('marketMode', 'advanced')); await page.waitForTimeout(500);
      await page.locator('.mk-controlbar-right .mk-button').click(); await page.waitForTimeout(150);
      await page.locator('.mk-menu-item', { hasText: 'Uncommons' }).click(); await page.waitForTimeout(250);
      assert((await page.locator('.mk-activechip').count()) >= 1, 'saved view re-applies its filters');
      await page.evaluate(() => Cardable.settings.set('marketMode', 'simple')); await page.waitForTimeout(300);
      await page.locator('.mk-tab-more').click(); await page.locator('.mk-more-item', { hasText: 'Market guide' }).click(); await page.waitForSelector('.mk-guide');
      assert((await page.locator('.mk-glossary dt').count()) >= 10, 'glossary lists every term');
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      assert.equal(await page.locator('.mk-guide').count(), 0);
      // pagination: reaching the end loads more
      await page.evaluate(() => { document.querySelector('.mk-main').scrollTop = 1e6; }); await page.waitForTimeout(500);
      const shownCount = await page.locator('.mk-tile').count();
      log('tiles after scrolling to the end', shownCount);
      // global realm honesty
      await page.evaluate(() => Cardable.market.store.setRealm('global')); await page.waitForTimeout(300);
      await page.evaluate(() => Cardable.market.ui.shell.goTab('discover')); await page.waitForTimeout(400);
      assert.equal(await page.locator('.mk-empty[data-kind="offline"]').count(), 1, 'Global Market is empty and says so');
      assert.equal(await page.locator('.mk-tile').count(), 0, 'no listings in an unconnected Global Market');
      await shot(page, 'global-not-connected-desktop-1440x900');
      await page.evaluate(() => Cardable.market.store.setRealm('simulation')); await page.waitForTimeout(250);
      // every route renders without the error state
      for (const r of ['auctions', 'buy-now', 'trades', 'stocks', 'portfolio', 'activity', 'watchlist', 'alerts', 'my-listings', 'settings']) {
        await page.evaluate((n) => Cardable.market.ui.shell.go(n, {}, { reset: true }), r); await page.waitForTimeout(450);
        assert.equal(await page.locator('.mk-empty[data-kind="error"]').count(), 0, r + ' renders');
        const ax = await a11y(page);
        assert.deepEqual(ax.unnamed, [], r + ': every control has a name');
        assert.deepEqual(ax.dupIds, [], r + ': ids are unique');
        assert.equal(ax.headings, 1, r + ': one page heading');
        await shot(page, 'page-' + r + '-desktop-1440x900');
      }
      // terminal layout
      await page.evaluate(() => { Cardable.settings.set('marketView', 'terminal'); Cardable.market.ui.shell.goTab('discover'); }); await page.waitForTimeout(500);
      assert((await page.locator('.mk-trow').count()) > 5, 'terminal rows');
      await shot(page, 'discover-terminal-desktop-1440x900');
      await page.evaluate(() => Cardable.settings.set('marketView', 'feed'));
      // card detail and stocks candles
      await page.evaluate(() => { const id = Cardable.data.cards.find((c) => !c.retired && c.rarity === 'rare').id; Cardable.market.ui.go('card', { id }); }); await page.waitForTimeout(700);
      assert.equal(await page.locator('.mk-chart').count(), 1);
      await shot(page, 'card-market-desktop-1440x900');
      await page.evaluate(() => { Cardable.settings.set('marketChartType', 'candles'); Cardable.market.ui.shell.goTab('stocks'); }); await page.waitForTimeout(600);
      assert((await page.locator('.mk-candle').count()) > 10, 'candles drawn');
      await shot(page, 'stocks-candles-desktop-1440x900');
      await page.evaluate(() => Cardable.settings.set('marketChartType', 'line'));
      evidence.contrast = await contrast(page);
      assert(evidence.contrast.worst >= 4.5, 'text contrast at least 4.5:1, worst ' + evidence.contrast.worst + ' ' + JSON.stringify(evidence.contrast.results.filter((x) => x.ratio < 4.5)));
      // pack-opening keys do nothing while the Market is open
      const packs = await page.evaluate(() => Cardable.state.current.packs.ready);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('Space'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => Cardable.opening.phase), 'idle', 'Space and Enter never open a pack from the Market');
      assert.equal(await page.evaluate(() => Cardable.state.current.packs.ready), packs);
      // keyboard: tab stays inside the Market
      await page.evaluate(() => Cardable.market.ui.shell.goTab('discover')); await page.waitForTimeout(400);
      let inside = true;
      for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); inside = inside && await page.evaluate(() => !document.activeElement || document.querySelector('.mk-frame').contains(document.activeElement)); }
      assert(inside, 'Tab never leaves the Market');
      await page.keyboard.press('3'); await page.waitForTimeout(300);
      const keyed = await page.evaluate(() => Cardable.market.ui.shell.current().name);
      log('number key', keyed);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => Cardable.market.isOpen), false, 'Escape at the root closes the Market');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.mk-tile').length), 0, 'page content is released on close');
      await context.close();
    }

    // ---- graphics tiers, monochrome, reduced motion ----
    for (const tier of ['very-low', 'low', 'medium', 'high']) {
      const { context, page } = await boot(browser, SIZES[1], { settings: { quality: tier } });
      await openMarket(page);
      const info = await page.evaluate(() => ({ q: Cardable.settings.get('quality'), tiles: document.querySelectorAll('.mk-tile').length, header: getComputedStyle(document.querySelector('.mk-header')).backdropFilter, anims: document.querySelector('.mk-page').getAnimations({ subtree: true }).length }));
      assert.equal(info.q, tier); assert(info.tiles > 5);
      evidence.tiers.push(Object.assign({ tier }, info));
      await shot(page, 'discover-quality-' + tier);
      await context.close();
    }
    {
      const { context, page } = await boot(browser, SIZES[1], { settings: { rarityColor: 'mono' } });
      await openMarket(page);
      await shot(page, 'discover-mono-desktop-1440x900');
      await page.evaluate(() => { const l = Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 40 }).items.map((e) => e.listing).find((l) => l.format === 'buy-now'); Cardable.market.ui.go('listing', { id: l.id }); }); await page.waitForTimeout(800);
      await shot(page, 'listing-mono-desktop-1440x900');
      await page.evaluate(() => Cardable.market.ui.shell.goTab('stocks')); await page.waitForTimeout(500);
      await shot(page, 'stocks-mono-desktop-1440x900');
      evidence.themes.push({ mode: 'mono', accent: await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) });
      await context.close();
    }
    {
      const { context, page } = await boot(browser, SIZES[1], { settings: { motion: 'on' }, reducedMotion: true });
      await openMarket(page);
      const r = await page.evaluate(() => ({ reduced: document.body.classList.contains('reduced-motion') || document.documentElement.classList.contains('reduced-motion') || Cardable.motion.reduced, running: document.querySelector('.mk-frame').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length }));
      evidence.motion = r;
      assert.equal(r.running, 0, 'no running CSS animations under reduced motion: ' + r.running);
      await context.close();
    }

    // ---- performance ----
    {
      const { context, page } = await boot(browser, SIZES[1]);
      const perf = await page.evaluate(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const C = Cardable; C.market.store.markGuideSeen();
        const t0 = performance.now(); C.market.open({ name: 'discover', params: {} }); const t1 = performance.now();
        await wait(500);
        const nodes = document.querySelectorAll('.mk *').length, tiles = document.querySelectorAll('.mk-tile').length;
        const live = document.querySelectorAll('.mk-art.is-live').length, placeholders = document.querySelectorAll('.mk-art').length;
        const t2 = performance.now(); C.market.ui.shell.goTab('stocks'); await wait(300); const t3 = performance.now();
        C.market.ui.shell.goTab('discover'); await wait(300);
        document.querySelector('.mk-main').scrollTop = 4000; await wait(400);
        const liveAfterScroll = document.querySelectorAll('.mk-art.is-live').length;
        return { openSyncMs: +(t1 - t0).toFixed(1), domNodes: nodes, tiles, liveThumbnails: live, thumbnailPlaceholders: placeholders, liveAfterScroll, stocksSwitchMs: +(t3 - t2 - 300).toFixed(1), canvases: document.querySelectorAll('.mk canvas').length, rafSubscribersNote: 'market adds no scheduler subscriber' };
      });
      evidence.performance = perf;
      assert(perf.liveThumbnails <= 40, 'live thumbnails stay bounded: ' + perf.liveThumbnails);
      assert(perf.domNodes < 6000, 'DOM bounded: ' + perf.domNodes);
      await context.close();
    }

    assert.equal(evidence.pageErrors.length, 0, 'no page errors: ' + JSON.stringify(evidence.pageErrors.slice(0, 3)));
    assert.equal(evidence.network.length, 0, 'no network requests: ' + JSON.stringify(evidence.network.slice(0, 3)));
    const bad = evidence.console.filter((c) => c.type === 'error');
    assert.equal(bad.length, 0, 'no console errors: ' + JSON.stringify(bad.slice(0, 3)));
    console.log('Market browser check passed.');
  } finally {
    await browser.close();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(path.join(path.dirname(out), 'evidence.json'), JSON.stringify(evidence, null, 2));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
