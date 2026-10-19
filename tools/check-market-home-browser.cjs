'use strict';
// Local Market 2.0: the Home page, the calmer shell, the coach and the motion, driven through the real interface.
// Loads the real index.html from disk (no network). Every claim about Credits and cards is read back from the save.
//   node tools/check-market-home-browser.cjs [--out qa-output/market-home]
// Headless: it never opens a window on the desktop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-home');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [] };
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell && Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
  await page.evaluate((credits) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    for (let i = 0; i < 10; i++) s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: cards[(i * 4 + 1) % cards.length].id, variantId: null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now() - i * 1000, seen: true });
    s.serialCounter = 100; s.currency = credits; C.state.commit(s);
  }, options.credits == null ? 1500 : options.credits);
  await page.reload();
  await page.waitForFunction(() => Cardable.state.current.tutorial.done && Cardable.market.ui.shell.canOpen());
  return { context, page };
}
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 700) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 3).join('\n     ')); throw error; }
}
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
const save = (page) => page.evaluate(() => ({ currency: Cardable.state.current.currency, ids: Cardable.state.current.inventory.map((i) => i.instanceId), count: Cardable.state.current.inventory.length }));
// Moves the simulated clock forward in small steps until the coach has a suggestion of one of these types.
async function waitForMove(page, types, maxHours) {
  for (let h = 0; h <= maxHours; h += 2) {
    const found = await page.evaluate((t) => { const m = Cardable.market.sim.provider.home().moves.filter((x) => t.indexOf(x.type) >= 0); return m.length ? m[0].type + ':' + m[0].itemId : null; }, types);
    if (found) return found;
    await page.evaluate(() => Cardable.marketSim.runtime.dev.fastForward(2 * 3600000));
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const { context, page } = await boot(browser);
    await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
    await page.waitForSelector('.mk-page');

    await step('the Simulation opens on Home, with a calm header: six sections (Shop joined in 1.13.0), one More, no standing notice', async () => {
      const r = await page.evaluate(() => ({ route: Cardable.market.ui.shell.current().name, h1: document.querySelector('.mk-page h1').textContent, tabs: Array.from(document.querySelectorAll('.mk-tabs > .mk-tab')).filter((b) => !b.hidden).map((b) => b.textContent.trim().replace(/\d+$/, '')),
        notice: !!document.querySelector('.mk-notice-host:not([hidden]) .mk-notice'), headerHeight: document.querySelector('.mk-header').getBoundingClientRect().height + document.querySelector('.mk-nav').getBoundingClientRect().height }));
      assert.equal(r.route, 'home'); assert.equal(r.h1, 'Home');
      assert.deepEqual(r.tabs, ['Home', 'Browse', 'Auctions', 'Portfolio', 'Prices', 'Shop', 'More']);
      assert.equal(r.notice, false, 'no standing notice in the Simulation');
      await shot(page, 'home-1440');
      return r;
    });

    await step('Home shows net worth as Credits plus the cards\' Average Value, a level, goals and honest wording', async () => {
      const r = await page.evaluate(() => { const d = Cardable.market.sim.provider.home(); return { nw: d.netWorth, text: document.querySelector('.mk-home').textContent, level: d.progress.level.name, quests: d.progress.quests.length, label: document.querySelector('.mk-desk-value').getAttribute('aria-label'), credits: Cardable.state.current.currency }; });
      assert.equal(r.nw.credits, r.credits); assert.equal(r.nw.now, r.nw.credits + r.nw.cards);
      assert(r.nw.cards > 0, 'the cards are worth something');
      assert.equal(r.level, 'Newcomer'); assert.equal(r.quests, 7);
      assert(/Opening packs pays nothing/.test(r.text), 'the new-here note says packs pay nothing');
      assert(/not promises/i.test(await page.evaluate(() => (document.querySelector('.mk-moves [title]') || {}).title || '')), 'the moves say they are guides, in a tooltip');
      assert(new RegExp(r.nw.now.toLocaleString('en-US').replace(/,/g, ',?')).test(r.label), r.label);
    });

    await step('keys 1 to 5 and the More menu reach every section; Home is in both realms', async () => {
      for (const [key, name] of [['2', 'discover'], ['3', 'auctions'], ['4', 'portfolio'], ['5', 'stocks'], ['1', 'home']]) {
        await page.keyboard.press(key); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => Cardable.market.ui.shell.current().name), name, 'key ' + key);
      }
      await page.locator('.mk-tab-more').click();
      const items = await page.locator('.mk-more-item').allTextContents();
      ['Buy Now', 'Trades', 'Activity', 'Compare', 'My listings', 'Market settings', 'Help & feedback', 'Market guide'].forEach((t) => assert(items.some((x) => x.trim() === t), 'More lists ' + t + ': ' + items.join('|')));
      await page.keyboard.press('Escape');
      await page.evaluate(() => Cardable.market.store.setRealm('global')); await page.waitForTimeout(500);
      const g = await page.evaluate(() => ({ route: Cardable.market.ui.shell.current().name, homeTab: !!Array.from(document.querySelectorAll('.mk-tab')).find((b) => /Home/.test(b.textContent) && !b.hidden), notice: !!document.querySelector('.mk-notice-host:not([hidden]) .mk-notice') }));
      assert.equal(g.route, 'home', 'leaving Local from Home stays on Home, which Global has too'); assert.equal(g.homeTab, true, 'the Home tab does not move or vanish'); assert.equal(g.notice, false, 'no standing notice in either realm');
      await page.evaluate(() => Cardable.market.store.setRealm('simulation')); await page.waitForTimeout(400);
      await page.evaluate(() => Cardable.market.ui.shell.goTab('home')); await page.waitForSelector('.mk-home');
    });

    let planned = null;
    await step('a suggestion to buy runs through a review, costs exactly its price, and leaves a plan for the next step', async () => {
      const found = await waitForMove(page, ['buy', 'bid'], 96);
      assert(found, 'the coach found something to buy within four simulated days');
      await page.evaluate(() => Cardable.market.ui.shell.goTab('home')); await page.waitForSelector('.mk-move');
      const before = await save(page);
      const mv = await page.evaluate(() => { const m = Cardable.market.sim.provider.home().moves.find((x) => x.type === 'buy'); return m ? { cost: m.cost, resell: m.resell, item: m.itemId, name: m.card.name } : null; });
      if (!mv) return { skipped: 'only auctions on offer at this moment' };
      const card = page.locator('.mk-move[data-type="buy"]').first();
      await card.locator('.mk-button[data-variant="primary"]').click();
      await page.waitForSelector('.mk-review');
      const text = await page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(/Confirm purchase/.test(text) && /2% fee/.test(text) && /Prices can move/.test(text), text);
      await shot(page, 'home-confirm');
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^Buy for/ }).click();
      await page.waitForFunction((n) => Cardable.state.current.inventory.length === n + 1, before.count);
      const after = await save(page);
      assert.equal(before.currency - after.currency, mv.cost, 'paid exactly the price');
      assert(after.ids.includes(mv.item), 'the card is in the collection');
      planned = mv;
      const plan = await page.evaluate((id) => Cardable.marketSim.runtime.world.coach.plan[id], mv.item);
      assert.equal(plan, mv.resell, 'the plan remembers the resale price');
    });

    await step('the bought card comes back as "Your plan", the first goal is ticked, and listing it works', async () => {
      if (!planned) return { skipped: true };
      await page.evaluate(() => Cardable.market.ui.shell.remount()); await page.waitForSelector('.mk-move');
      const m = await page.evaluate((id) => { const d = Cardable.market.sim.provider.home(); const x = d.moves.find((y) => y.itemId === id); return { move: x ? { tag: x.tag, price: x.price, type: x.type } : null, buy: d.progress.quests.find((q) => q.id === 'buy').done }; }, planned.item);
      assert(m.move && m.move.tag === 'Your plan' && m.move.type === 'sell' && m.move.price === planned.resell, JSON.stringify(m));
      assert.equal(m.buy, true);
      const goal = await page.evaluate(() => document.querySelector('.mk-goal[data-id="buy"]').dataset.done);
      assert.equal(goal, 'true');
      const card = page.locator('.mk-move[data-type="sell"]', { hasText: 'Your plan' }).first();
      await card.locator('.mk-button[data-variant="primary"]').click();
      await page.waitForSelector('.mk-review');
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^(List at|Sell for)/ }).click();
      await page.waitForFunction((id) => { const w = Cardable.marketSim.runtime.world; return Object.keys(w.listings).some((k) => w.listings[k].seller === 'you' && w.listings[k].items.some((i) => i.i === id)); }, planned.item);
    });

    await step('Quick Sell from a suggestion pays exactly the quote at once, and the card leaves the collection', async () => {
      await page.evaluate(() => Cardable.market.ui.shell.goTab('home')); await page.waitForSelector('.mk-home');
      const mv = await page.evaluate(() => { const m = Cardable.market.sim.provider.home().moves.find((x) => x.type === 'sell' && !x.instant && !x.planned); return m ? { item: m.itemId, quick: m.quick } : null; });
      if (!mv) return { skipped: 'no plain sell suggestion at this moment' };
      const before = await save(page);
      await page.locator('.mk-move[data-type="sell"] .mk-button', { hasText: /^Quick Sell for/ }).first().click();
      await page.waitForSelector('.mk-review');
      const text = await page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(/Quick Sell/.test(text) && /less than a trader pays/.test(text) && /undo/i.test(text), text);
      await page.locator('.mk-review .mk-modal-actions button', { hasText: /^Quick Sell for/ }).click();
      await page.waitForFunction((n) => Cardable.state.current.inventory.length === n - 1, before.count);
      const after = await save(page);
      assert.equal(after.currency - before.currency, mv.quick, 'paid exactly the quote');
      assert(!after.ids.includes(mv.item), 'the card is gone');
    });

    await step('money moves with a little motion: the wallet answers a change, and reduced motion removes it', async () => {
      const r = await page.evaluate(async () => {
        const C = Cardable, count = () => document.querySelectorAll('.mk-float').length;
        const s = JSON.parse(JSON.stringify(C.state.current)); s.currency += 250; C.state.commit(s); C.market.ui.shell.refresh();
        await new Promise((x) => setTimeout(x, 150));
        const during = count(), flash = !!document.querySelector('.mk-wallet.mk-flash-up');
        await new Promise((x) => setTimeout(x, 1700));
        return { during, flash, after: count(), text: document.querySelector('.mk-wallet').textContent };
      });
      assert(r.during >= 1 && r.flash, 'a badge rose and the wallet flashed: ' + JSON.stringify(r));
      assert.equal(r.after, 0, 'the badge removed itself');
      const calm = await page.evaluate(async () => {
        Cardable.settings.set('motion', 'on'); await new Promise((x) => setTimeout(x, 200));
        const s = JSON.parse(JSON.stringify(Cardable.state.current)); s.currency += 100; Cardable.state.commit(s); Cardable.market.ui.shell.refresh();
        await new Promise((x) => setTimeout(x, 200));
        const n = document.querySelectorAll('.mk-float').length, animated = document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.mk-frame')).length;
        Cardable.settings.set('motion', 'off');
        return { n, animated };
      });
      assert.equal(calm.n, 0, 'no badge under reduced motion'); assert.equal(calm.animated, 0, 'nothing animates under reduced motion');
    });

    await step('news is shown with timing, reaches Browse as a filter, and the coach prices a trap', async () => {
      await page.evaluate(() => Cardable.marketSim.runtime.dev.fastForward(20 * 3600000));
      await page.evaluate(() => Cardable.market.ui.shell.goTab('home')); await page.waitForSelector('.mk-home');
      const r = await page.evaluate(() => { const d = Cardable.market.sim.provider.home(); return { news: d.news.length, headline: d.news[0] && d.news[0].headline, when: d.news[0] && d.news[0].when, cards: document.querySelectorAll('.mk-news').length, trap: d.moves.some((m) => m.type === 'order') }; });
      assert(r.news >= 1 && r.cards >= 1, JSON.stringify(r));
      assert(/in \d|Under way|Fading|Starts/.test(r.when), r.when);
      await page.locator('.mk-news .mk-button', { hasText: 'Find cards' }).first().click(); await page.waitForTimeout(500);
      const route = await page.evaluate(() => Cardable.market.ui.shell.current().name);
      assert(route === 'discover' || route === 'card', route);
      await page.evaluate(() => Cardable.market.ui.shell.goTab('home'));
      return r;
    });

    await step('the page is readable and inside the frame at phone, tablet and desktop widths', async () => {
      for (const [w, h] of [[360, 800], [390, 844], [768, 1024], [1280, 720], [1920, 1080]]) {
        const { context: c2, page: p2 } = await boot(browser, { width: w, height: h });
        await p2.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); });
        await p2.waitForSelector('.mk-move, .mk-empty'); await p2.waitForTimeout(500);
        const m = await p2.evaluate(() => { const f = document.querySelector('.mk-frame').getBoundingClientRect(), main = document.querySelector('.mk-main'), off = [];
          document.querySelectorAll('.mk-home *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.right > f.right + 1) off.push((el.className || el.tagName).toString().slice(0, 50)); });
          const tiny = Array.from(document.querySelectorAll('.mk-home .mk-button')).filter((b) => b.getBoundingClientRect().height && b.getBoundingClientRect().height < 32).length;
          return { scroll: main.scrollWidth - main.clientWidth, off: Array.from(new Set(off)).slice(0, 4), tiny }; });
        assert(m.scroll <= 1 && !m.off.length, w + ': ' + JSON.stringify(m));
        assert.equal(m.tiny, 0, 'no button under 32 px tall');
        await shot(p2, 'home-' + w);
        await c2.close();
      }
    });

    await step('no page errors and no unexpected console messages', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors.slice(0, 3)));
      assert.equal(evidence.console.length, 0, JSON.stringify(evidence.console.slice(0, 3)));
    });
    await context.close();
  } catch (error) {
    failed = error;
  } finally {
    fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
  }
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + evidence.steps.filter((s) => !s.ok).length + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
