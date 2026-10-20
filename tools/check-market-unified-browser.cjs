'use strict';
// Disposable offline journeys and readability checks for One Market.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'qa-output', 'market-unified');
const evidence = { when: new Date().toISOString(), steps: [], errors: [], layouts: [] };
fs.mkdirSync(out, { recursive: true });
async function step(name, fn) { await fn(); evidence.steps.push(name); console.log('ok ' + name); }
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => evidence.errors.push(String(e)));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.Cardable && Cardable.market && Cardable.market.ui && !Cardable.setup.loading);
    await page.evaluate(() => {
      const C = Cardable, s = JSON.parse(C.state.encode(C.state.current));
      s.tutorial = { step: 'done', done: true }; s.currency = 50000;
      const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
      for (let i = 0; i < 8; i++) s.inventory.push({ instanceId: 'unified-fixture-' + i, cardId: cards[i].id, packId: 'standard', variantId: null, cardSkinId: null, serial: C.serial.format(s.playerCode, i + 1), pulledAt: Date.now(), seen: true });
      s.serialCounter = 20; C.state.commit(s);
    });
    await page.reload();
    await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
    await page.evaluate(() => { Cardable.market.store.markGuideSeen(); Cardable.market.open(); Cardable.marketSim.runtime.pause(); });
    await page.waitForSelector('.mk-grid .mk-tile');
    await step('four labelled tabs, shared Credits and no realm switch', async () => {
      assert.deepEqual(await page.locator('.mk-nav .mk-tab[data-tab]').allTextContents(), ['Browse', 'Shop', 'Your cards', 'Activity']);
      assert.equal(await page.locator('.mk-realm-switch').count(), 0);
      assert.equal(await page.locator('.mk-mode-switch').count(), 0);
      assert.equal(await page.locator('.mk-nav .mk-sell').count(), 1);
      const facts = await page.evaluate(() => ({ wallet: Cardable.market.api.walletSync('unified').balance, playerRows: Cardable.market.api.listingsSync('unified', { limit: 100 }).items.filter((r) => r.listing.source === 'player').length }));
      assert.equal(facts.wallet, 50000); assert.equal(facts.playerRows, 0);
      const visible = await page.locator('.mk-tile').first().evaluate((el) => ({ bottom: el.getBoundingClientRect().bottom, top: el.getBoundingClientRect().top, art: el.querySelector('.mk-tile-art').getBoundingClientRect().height, body: el.querySelector('.mk-tile-body').getBoundingClientRect().height, font: getComputedStyle(document.querySelector('.mk-frame')).fontSize }));
      await page.screenshot({ path: path.join(out, 'browse-desktop.png') });
      assert.equal(visible.font, '16px'); assert.ok(visible.bottom <= 900, 'first complete listing visible: ' + JSON.stringify(visible));
      await page.screenshot({ path: path.join(out, 'browse-desktop.png') });
    });
    await step('Sell defaults to bids, supports buyout, and preserves card on toggle', async () => {
      await page.locator('.mk-sell').click();
      await page.getByRole('button', { name: 'Select', exact: true }).first().click();
      assert.equal(await page.getByLabel('Allow bids', { exact: true }).isChecked(), true);
      await page.getByLabel('Starting bid (Credits)', { exact: true }).fill('100');
      const buyout = page.getByLabel(/Buy.*price.*optional|Buyout.*Credits|Buy now.*Credits/i).first();
      await buyout.fill('200');
      await page.locator('label.mk-toggle').filter({ hasText: 'Allow bids' }).click();
      assert.equal(await page.getByLabel('Allow bids', { exact: true }).isChecked(), false);
      await page.getByRole('spinbutton', { name: /Buy price/ }).fill('180');
      await page.locator('label.mk-toggle').filter({ hasText: 'Allow bids' }).click();
      assert.equal(await page.getByLabel('Starting bid (Credits)', { exact: true }).inputValue(), '100');
      assert.equal(await buyout.inputValue(), '200');
      assert.equal(await page.getByRole('button', { name: 'Selected', exact: true }).count(), 1);
      await page.screenshot({ path: path.join(out, 'sell-desktop.png') });
    });
    await step('Shop review changes balance and collection exactly once', async () => {
      await page.evaluate(() => Cardable.market.ui.go('shop', {}, { reset: true }));
      const before = await page.evaluate(() => ({ balance: Cardable.state.current.currency, count: Cardable.state.current.inventory.length }));
      assert.equal(await page.locator('.mk-shop-facts').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Classic Shop' }).count(), 0);
      await page.locator('.mk-shop-card').first().getByRole('button', { name: 'Buy', exact: true }).click();
      assert.equal(await page.evaluate(() => Cardable.state.current.currency), before.balance);
      await page.locator('.mk-modal').getByRole('button', { name: /^Buy for/ }).click();
      await page.waitForFunction((n) => Cardable.state.current.inventory.length === n + 1, before.count);
      assert.ok(await page.evaluate((n) => Cardable.state.current.currency < n, before.balance));
      await page.locator('.mk-shop-card').first().getByRole('button', { name: 'Inspect', exact: true }).click();
      await page.locator('.mk-shop-inspect').waitFor();
      await page.locator('.mk-shop-inspect').getByRole('button', { name: 'Close', exact: true }).click();
      if (await page.locator('.mk-arrival').getByRole('button', { name: 'Dismiss', exact: true }).count()) await page.locator('.mk-arrival').getByRole('button', { name: 'Dismiss', exact: true }).click();
      await page.screenshot({ path: path.join(out, 'shop-desktop.png') });
    });
    await step('Shop cannot spend Credits already held by a trade', async () => {
      const result = await page.evaluate(() => {
        const C = Cardable, day = C.shopState.ensure(), offer = day.snapshot.offers.find((o) => !o.purchased), old = C.marketSim.heldCredits;
        C.marketSim.heldCredits = () => C.state.current.currency;
        try { return C.shopPurchase.buyCard(Object.assign({ dayKey: day.snapshot.dayKey }, offer)); }
        finally { C.marketSim.heldCredits = old; }
      });
      assert.equal(result.ok, false); assert.equal(result.code, 'funds');
    });
    await step('settings and primary pages remain contained at phone sizes, mono and large text', async () => {
      for (const theme of ['color', 'mono']) {
        await page.evaluate((mono) => { const C = Cardable; C.settings.set('rarityColor', mono ? 'mono' : 'color'); C.settings.set('marketTextSize', mono ? 'large' : 'standard'); C.settings.set('motion', 'on'); }, theme === 'mono');
        for (const width of [360, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: width > 840 ? 900 : 844 });
          for (const route of ['discover', 'shop', 'portfolio', 'activity', 'settings']) {
            await page.evaluate((name) => Cardable.market.ui.go(name, {}, { reset: true }), route);
            await page.locator('.mk-main').evaluate((el) => { el.scrollTop = 0; });
            const header = await page.evaluate(() => { const wallet = document.querySelector('.mk-wallet').getBoundingClientRect(), close = document.querySelector('.mk-close').getBoundingClientRect(), head = document.querySelector('.mk-header').getBoundingClientRect(); return { separate: wallet.right <= close.left + 1, contained: wallet.bottom <= head.bottom + 1 && close.right <= head.right + 1 }; });
            assert.ok(header.separate && header.contained, 'header controls overlap or leave header: ' + JSON.stringify({ route, width, header }));
            if (width <= 840) {
              const labels = await page.locator('.mk-bottom-item[data-tab] > span').allTextContents();
              assert.deepEqual(labels, ['Browse', 'Shop', 'Your cards', 'Activity']);
              for (const label of await page.locator('.mk-bottom-item[data-tab] > span').all()) assert.equal(await label.isVisible(), true);
            }
            const layout = await page.locator('.mk-main').evaluate((el) => ({ scroll: el.scrollWidth, width: el.clientWidth, body: document.body.scrollWidth, viewport: innerWidth }));
            assert.ok(layout.scroll <= layout.width + 1, JSON.stringify({ route, theme, width, layout }));
            assert.ok(layout.body <= layout.viewport + 1);
            evidence.layouts.push({ route, theme, width, ...layout });
            if (width === 390 || width === 1440 && route === 'settings') await page.screenshot({ path: path.join(out, route + '-' + width + '-' + theme + '.png') });
          }
        }
      }
    });
    await step('keyboard exit and saved Market settings survive reload', async () => {
      await page.evaluate(() => Cardable.market.ui.go('discover', {}, { reset: true }));
      await page.locator('.mk-frame').focus(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => !Cardable.market.isOpen);
      await page.reload();
      await page.waitForFunction(() => Cardable.settings && Cardable.market && Cardable.market.initialized);
      assert.equal(await page.evaluate(() => Cardable.settings.get('marketTextSize')), 'large');
    });
    assert.deepEqual(evidence.errors, []);
  } finally { await browser.close(); fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
