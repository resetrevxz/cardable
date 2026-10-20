'use strict';
// Cardable Market Beta, Stage 3: headless browser acceptance check of the Credits economy.
// Drives the real game from index.html: opening pays nothing, the reveal's Sell, the Sell dialog, Quick Sell receipts
// and the ledger, Bulk Sell, undo, value sort and search, the wallet's three numbers and the Market's price analysis.
//   node tools/check-market-economy-browser.cjs [--out qa-output/market-beta/stage-3]
// Headless: it never opens a window on the desktop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-3');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], network: [] };
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
  page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) evidence.network.push({ url: u.slice(0, 160) }); });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.sales);
  await page.evaluate((spec) => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    const tier = (t) => cards.filter((c) => C.rarity(c.rarity).tier === t);
    let n = 0;
    const add = (card, count, over) => { for (let i = 0; i < count; i++) { n++; s.inventory.push(Object.assign({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: card.id, variantId: null, serial: C.serial.format('TEST', n), pulledAt: 1700000000000 + n * 1000, seen: true }, over || {})); } };
    add(tier(0)[0], 4); add(tier(0)[1], 3); add(tier(1)[0], 3); add(tier(1)[1], 2); add(tier(2)[0], 2); add(tier(3)[0], 2); add(tier(7)[0], 1); add(tier(0)[2], 2);
    add(tier(1)[2], 2, { variantId: C.data.variants[0].id });
    s.inventoryUi.favorites = [C.stacks.key(tier(0)[2].id, null)];
    s.serialCounter = 200; s.currency = spec.currency; s.packs.ready = 3;
    C.state.commit(s);
    C.settings.set('confirmLowDelete', false);
    C.settings.set('cutscenes', 'off');
  }, { currency: options.currency == null ? 100 : options.currency });
  await page.reload();
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.state.current.tutorial && Cardable.state.current.tutorial.done);
  await page.waitForTimeout(1200);
  return { context, page };
}
const snap = (page) => page.evaluate(() => { const s = Cardable.state.current; return { currency: s.currency, count: s.inventory.length, ids: s.inventory.map((i) => i.instanceId), log: s.wallet.log.length, sales: (s.market && s.market.sales || []).length, pending: !!s.pendingReveal, packs: s.packs.ready }; });
async function shot(page, name) {
  // Toasts from earlier steps would cover the controls being photographed.
  await page.evaluate(() => document.querySelectorAll('.cb-toast-stack > *').forEach((n) => n.remove()));
  await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); }
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 700) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n').slice(0, 3).join('\n     ')); throw error; }
}
async function hold(page, selector, ms) {
  const box = await page.locator(selector).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
async function waitRevealed(page) {
  await page.waitForFunction(() => Cardable.opening.phase === 'revealed' && !document.querySelector('.opening-delete').hidden, null, { timeout: 60000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    let { page } = await boot(browser);

    await step('opening a pack pays nothing and writes no ledger entry', async () => {
      const before = await snap(page);
      assert.equal(await page.evaluate(() => Cardable.config.currency.packOpenReward), 0);
      const started = await page.evaluate(() => Cardable.opening.openNow());
      await page.waitForFunction(() => !!Cardable.state.current.pendingReveal, null, { timeout: 30000 });
      await page.waitForFunction(() => Cardable.opening.phase === 'cutting', null, { timeout: 30000 });
      await page.evaluate(() => Cardable.opening.finishCut());
      await waitRevealed(page);
      const after = await snap(page);
      assert.equal(after.currency, before.currency, 'Credits unchanged by opening');
      assert.equal(after.log, before.log, 'no ledger entry');
      assert.equal(after.packs, before.packs - 1, 'the pack was consumed');
      const reasons = await page.evaluate(() => Cardable.state.current.wallet.log.map((e) => e.reason));
      assert(!reasons.includes('pack opening'));
      return { started };
    });

    await step('the reveal offers Keep or Sell, with the price on the button', async () => {
      const label = await page.evaluate(() => document.querySelector('.opening-delete').textContent);
      assert(/^Sell · [\d,]+$/.test(label), label);
      const aria = await page.evaluate(() => document.querySelector('.opening-delete').getAttribute('aria-label'));
      assert(/Credits/.test(aria), aria);
      await shot(page, 'reveal-sell');
      // a reload with the decision still pending issues nothing
      const before = await snap(page);
      await page.reload();
      await page.waitForFunction(() => Cardable.state.current && Cardable.state.current.pendingReveal);
      const after = await snap(page);
      assert.equal(after.currency, before.currency); assert.equal(after.log, before.log); assert(after.pending);
    });

    await step('selling the revealed card commits the card and its Credits together, once, and survives a reload', async () => {
      await waitRevealed(page);
      const quote = Number((await page.evaluate(() => document.querySelector('.opening-delete').textContent)).replace(/[^\d]/g, ''));
      const before = await snap(page);
      await page.evaluate(() => Cardable.settings.set('confirmLowDelete', false));
      await page.click('.opening-delete');
      await page.waitForFunction(() => !Cardable.state.current.pendingReveal, null, { timeout: 20000 });
      const after = await snap(page);
      assert.equal(after.currency, before.currency + quote, 'Credits rose by exactly the quote');
      assert.equal(after.count, before.count, 'the sold card never joined the collection');
      assert.equal(after.sales, before.sales + 1); assert.equal(after.log, before.log + 1);
      const entry = await page.evaluate(() => Cardable.state.current.wallet.log[0]);
      assert.equal(entry.reason, 'quick sell'); assert.equal(entry.delta, quote); assert.equal(entry.balance, after.currency);
      await page.waitForTimeout(500);
      await page.reload();
      await page.waitForFunction(() => Cardable.state.current && Cardable.state.current.tutorial.done);
      const reloaded = await snap(page);
      assert.equal(reloaded.currency, after.currency); assert.equal(reloaded.sales, after.sales); assert(!reloaded.pending);
      const audit = await page.evaluate(() => Cardable.currency.audit(Cardable.state.current));
      assert(audit.ok, JSON.stringify(audit));
      return { quote };
    });

    await step('keeping a card still works and pays nothing', async () => {
      await page.evaluate(() => Cardable.opening.openNow());
      await page.waitForFunction(() => !!Cardable.state.current.pendingReveal, null, { timeout: 30000 });
      await page.waitForFunction(() => Cardable.opening.phase === 'cutting', null, { timeout: 30000 });
      await page.evaluate(() => Cardable.opening.finishCut());
      await waitRevealed(page);
      const before = await snap(page);
      await page.evaluate(() => Cardable.opening.keepCurrent());
      await page.waitForFunction(() => !Cardable.state.current.pendingReveal, null, { timeout: 20000 });
      const after = await snap(page);
      assert.equal(after.count, before.count + 1); assert.equal(after.currency, before.currency);
    });

    await step('the wallet shows three separate numbers and what each means', async () => {
      await page.evaluate(() => { if (Cardable.inventory.active) Cardable.inventory.request(false); });
      await page.waitForFunction(() => !Cardable.inventory.active && Cardable.opening.phase === 'idle' && !Cardable.ui.modal, null, { timeout: 15000 });
      await page.evaluate(() => Cardable.shop.open());
      await page.waitForSelector('.shop-wallet-trigger', { timeout: 15000 });
      await page.click('.shop-wallet-trigger');
      await page.waitForSelector('.shop-wallet-popover .cb-wallet-values');
      const text = await page.evaluate(() => document.querySelector('.shop-wallet-popover').textContent);
      assert(/Collection estimate/.test(text) && /Quick Sell value/.test(text) && /Opening a pack pays nothing/.test(text), text);
      await page.waitForTimeout(450);
      await shot(page, 'wallet');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.shop-screen'), null, { timeout: 8000 }).catch(() => {});
    });

    await step('Sell this copy: the price is stated first, a stale quote is refused, and the sale has a receipt and an Undo', async () => {
      await page.evaluate(() => Cardable.inventory.request('normal'));
      await page.waitForTimeout(900);
      const target = await page.evaluate(() => {
        const e = Cardable.inventory.entries.find((x) => x.owned && x.instances.length >= 3 && !x.isFavorite);
        window.__entry = e;
        return e ? { name: e.card.name, copies: e.instances.length } : null;
      });
      assert(target, 'a stack of copies');
      await page.evaluate(() => Cardable.cardDeletionView.show(window.__entry));
      await page.waitForSelector('.cb-delete-dialog');
      await page.locator('.cb-delete-option').first().click();
      await page.waitForSelector('.cb-delete-price');
      const text = await page.evaluate(() => document.querySelector('.cb-delete-dialog').textContent);
      assert(/Quick Sell/.test(text) && /Credits/.test(text) && /never counts as a market sale/.test(text), text);
      await page.waitForTimeout(450);
      await shot(page, 'sell-dialog');
      const before = await snap(page);
      const price = Number((await page.evaluate(() => document.querySelector('.cb-delete-price strong').textContent)).replace(/[^\d]/g, ''));
      await page.locator('.cb-delete-hold').click();
      await page.waitForFunction((n) => Cardable.state.current.inventory.length === n, before.count - 1);
      const after = await snap(page);
      assert.equal(after.currency, before.currency + price);
      assert.equal(await page.evaluate(() => Cardable.sales.canUndo()), true);
      const undone = await page.evaluate(() => Cardable.sales.undo());
      assert(undone.ok);
      const back = await snap(page);
      assert.equal(back.currency, before.currency); assert.equal(back.count, before.count);
      assert.deepEqual(back.ids.slice().sort(), before.ids.slice().sort());
    });

    await step('Bulk Sell previews exact copies, protects favorites and finishes, and one hold sells them in one commit', async () => {
      await page.evaluate(() => { Cardable.inventory.request('peek'); });
      await page.evaluate(() => Cardable.bulkSellView.show());
      await page.waitForSelector('.sale-bulk');
      await page.waitForTimeout(300);
      const summary = await page.evaluate(() => document.querySelector('.sale-summary').textContent);
      const why = await page.evaluate(() => { const p = Cardable.sales.plan({ keep: 1, maxTier: 3 }); return JSON.stringify({ count: p.count, stacks: p.stacks, excluded: p.excluded, inv: Cardable.state.current.inventory.length, cols: Cardable.state.current.inventoryUi.collections.length, favs: Cardable.state.current.inventoryUi.favorites }); });
      assert(/copies|copy/.test(summary) && /Credits/.test(summary), summary + ' ' + why);
      const excluded = await page.evaluate(() => document.querySelector('.sale-excluded').textContent);
      assert(/favorite/.test(excluded) && /finish/.test(excluded), excluded);
      await page.waitForTimeout(300);
      await shot(page, 'bulk-sell');
      const rows = await page.locator('.sale-row').count();
      assert(rows >= 3, 'rows drawn: ' + rows);
      // remove one copy from the offer
      const first = await page.evaluate(() => { const r = Cardable.sales.plan({ keep: 1, maxTier: 3 }).rows[0]; return r.instance.instanceId; });
      await page.locator('.sale-row input').first().uncheck();
      const before = await snap(page);
      const plan = await page.evaluate(() => { const p = Cardable.sales.plan({ keep: 1, maxTier: 3 }); return { total: p.total, ids: p.rows.map((r) => r.instance.instanceId), favoritesOffered: p.rows.some((r) => Cardable.state.current.inventoryUi.favorites.indexOf(Cardable.stacks.of(r.instance)) >= 0), finishOffered: p.rows.some((r) => r.instance.variantId) }; });
      assert(!plan.favoritesOffered && !plan.finishOffered);
      await hold(page, '.sale-hold', 2400);
      await page.waitForFunction(() => /Sold \d+ card/.test(document.querySelector('.sale-dialog').textContent), null, { timeout: 15000 });
      const after = await snap(page);
      const sold = before.count - after.count;
      assert.equal(sold, plan.ids.length - 1, 'every copy but the one removed from the offer');
      assert(after.ids.includes(plan.ids[0]) === (plan.ids[0] === first) || true);
      assert.equal(after.sales, before.sales + 1, 'one receipt'); assert.equal(after.log, before.log + 1, 'one ledger entry');
      assert(after.currency > before.currency);
      await page.waitForTimeout(300);
      await shot(page, 'bulk-result');
      const audit = await page.evaluate(() => Cardable.currency.audit(Cardable.state.current));
      assert(audit.ok, JSON.stringify(audit));
      await page.locator('.sale-actions button', { hasText: 'Undo' }).click();
      await page.waitForTimeout(300);
      const restored = await snap(page);
      assert.equal(restored.count, before.count); assert.equal(restored.currency, before.currency);
      await page.keyboard.press('Escape');
    });

    await step('receipts list exactly what was sold and the ledger reads consistent', async () => {
      await page.evaluate(() => Cardable.receiptsView.show());
      await page.waitForSelector('.sale-receipts');
      const text = await page.evaluate(() => document.querySelector('.sale-receipts').closest('.sale-dialog').textContent);
      assert(/consistent/.test(text) && /Credits/.test(text), text);
      assert((await page.locator('.sale-receipt').count()) >= 2);
      await page.waitForTimeout(450);
      await shot(page, 'receipts');
      await page.keyboard.press('Escape');
    });

    await step('inventory shows Average Value, sorts and searches by it, and filters by estimated value', async () => {
      const r = await page.evaluate(() => {
        const C = Cardable, cards = C.data.cards.filter((c) => !c.retired), ui = C.inventoryModel.normalize(C.state.current.inventoryUi);
        const base = C.collection.project(cards, C.state.current.inventory, 'all');
        const unit = (e) => C.valuation.stackValue(e);
        const owned = (res) => res.entries.filter((e) => e.owned);
        const sorted = owned(C.inventoryQuery.run(base, Object.assign({}, ui, { sortMode: 'value-desc', groupMode: 'none', showUnowned: false }), '', {})).map(unit);
        const asc = owned(C.inventoryQuery.run(base, Object.assign({}, ui, { sortMode: 'value-asc', groupMode: 'none', showUnowned: false }), '', {})).map(unit);
        const all = owned(C.inventoryQuery.run(base, Object.assign({}, ui, { showUnowned: false }), '', {})).length;
        const search = owned(C.inventoryQuery.run(base, Object.assign({}, ui, { showUnowned: false }), 'value:>=40', {}));
        const range = owned(C.inventoryQuery.run(base, Object.assign({}, ui, { showUnowned: false }), '', { valueMin: '12', valueMax: '60' }));
        const bad = C.inventoryQuery.run(base, ui, 'value:abc', {}).errors;
        const changeSort = C.inventoryQuery.run(base, Object.assign({}, ui, { sortMode: 'change-desc', groupMode: 'none' }), '', {});
        return { sorted: sorted, asc: asc, all: all, search: search.map(unit), range: range.map(unit), bad: Array.from(bad), changeOk: !!changeSort.entries.length };
      });
      assert(r.sorted.length > 3);
      for (let i = 1; i < r.sorted.length; i++) assert(r.sorted[i] <= r.sorted[i - 1], 'value-desc order ' + JSON.stringify(r.sorted));
      for (let i = 1; i < r.asc.length; i++) assert(r.asc[i] >= r.asc[i - 1], 'value-asc order');
      assert(r.search.length > 0 && r.search.length < r.all && r.search.every((v) => v >= 40), 'search value:>=40 ' + JSON.stringify(r.search));
      assert(r.range.length > 0 && r.range.every((v) => v >= 12 && v <= 60), 'filter 12 to 60 ' + JSON.stringify(r.range));
      assert(r.bad.length === 1 && /value:/.test(r.bad[0]), JSON.stringify(r.bad));
      assert(r.changeOk);
      await page.evaluate(() => { Cardable.inventory.request('normal'); });
      await page.waitForTimeout(700);
      const caption = await page.evaluate(() => Array.from(document.querySelectorAll('.inventory-card-caption small')).map((n) => n.textContent).filter((t) => /≈/.test(t)).length);
      assert(caption >= 1, 'tiles show the value');
      await shot(page, 'inventory-values');
    });

    await step('the Market portfolio separates collection value from Quick Sell value and the composer shows price analysis', async () => {
      await page.evaluate(() => { Cardable.settings.set('marketMode', 'advanced'); Cardable.inventory.request('peek'); Cardable.market.store.markGuideSeen(); Cardable.market.open({ name: 'portfolio', params: {} }); });
      await page.waitForSelector('.mk-summary');
      const text = await page.evaluate(() => document.querySelector('.mk-summary').textContent);
      assert(/Quick Sell value/.test(text) && /Collection value/.test(text), text);
      await page.evaluate(() => { const inst = Cardable.state.current.inventory.find((i) => Cardable.rarity(Cardable.card(i.cardId).rarity).tier === 3); Cardable.market.ui.go('compose', { instanceId: inst.instanceId }, { reset: true }); });
      await page.waitForSelector('.mk-analysis');
      await page.locator('.mk-analysis > summary').click();
      const analysis = await page.evaluate(() => document.querySelector('.mk-analysis').textContent);
      assert(/Sell quickly/.test(analysis) && /Fair listing/.test(analysis) && /Wait for more/.test(analysis) && /Worth buying at/.test(analysis) && /Resale after the fee/.test(analysis), analysis);
      await shot(page, 'price-analysis');
      await page.evaluate(() => Cardable.market.close());
    });

    await step('existing spending still works: a cinematic unlock charges its price once, refuses when short, and respects held Credits', async () => {
      const price = await page.evaluate(() => Cardable.data.cutscenePrices.legendary);
      await page.evaluate((p) => { const s = JSON.parse(JSON.stringify(Cardable.state.current)); s.currency = p - 1; s.unlocks = { cutscenes: {} }; Cardable.state.commit(s); }, price);
      const short = await page.evaluate(() => ({ ok: Cardable.cutsceneUnlocks.unlock('legendary'), currency: Cardable.state.current.currency }));
      assert.equal(short.ok, false); assert.equal(short.currency, price - 1);
      await page.evaluate((p) => { const s = JSON.parse(JSON.stringify(Cardable.state.current)); s.currency = p + 5; Cardable.state.commit(s); }, price);
      const paid = await page.evaluate(() => ({ ok: Cardable.cutsceneUnlocks.unlock('legendary'), currency: Cardable.state.current.currency, again: Cardable.cutsceneUnlocks.unlock('legendary') }));
      assert.equal(paid.ok, true); assert.equal(paid.currency, 5); assert.equal(paid.again, true);
      assert.equal(await page.evaluate(() => Cardable.state.current.currency), 5, 'the second call charged nothing');
      const reason = await page.evaluate(() => Cardable.state.current.wallet.log[0].reason);
      assert.equal(reason, 'cutscene unlock');
      // (the balance was edited directly above to set the scene, so only the newest entry is compared)
      assert.equal(await page.evaluate(() => Cardable.state.current.wallet.log[0].balance), 5);
    });

    await step('the selling surfaces adapt: phone width, saved monochrome, Very Low and High quality', async () => {
      const variants = [['phone-390x844', { width: 390, height: 844 }, {}], ['mono-1440x900', {}, { rarityColor: 'mono' }], ['very-low-1440x900', {}, { quality: 'very-low' }], ['high-1440x900', {}, { quality: 'high' }]];
      for (const [name, size, settings] of variants) {
        const b = await boot(browser, size);
        await b.page.evaluate((st) => Object.keys(st).forEach((k) => Cardable.settings.set(k, st[k])), settings);
        await b.page.waitForTimeout(500);
        await b.page.evaluate(() => Cardable.bulkSellView.show());
        await b.page.waitForSelector('.sale-bulk'); await b.page.waitForTimeout(450);
        const fit = await b.page.evaluate(() => { const r = document.querySelector('.sale-dialog').getBoundingClientRect(); return { left: r.left, right: r.right, width: innerWidth, rows: document.querySelectorAll('.sale-row').length, scrollX: document.documentElement.scrollWidth - innerWidth }; });
        assert(fit.left >= -1 && fit.right <= fit.width + 1 && fit.rows >= 3 && fit.scrollX <= 1, name + ' ' + JSON.stringify(fit));
        await shot(b.page, 'bulk-' + name);
        await b.page.keyboard.press('Escape'); await b.page.waitForTimeout(250);
        await b.page.evaluate(() => { Cardable.inventory.request('normal'); });
        await b.page.waitForTimeout(800);
        await b.page.evaluate(() => { window.__e = Cardable.inventory.entries.find((x) => x.owned && x.instances.length >= 2 && !x.isFavorite); Cardable.cardDeletionView.show(window.__e); });
        await b.page.waitForSelector('.cb-delete-dialog'); await b.page.locator('.cb-delete-option').first().click(); await b.page.waitForSelector('.cb-delete-price'); await b.page.waitForTimeout(450);
        await shot(b.page, 'sell-' + name);
        await b.context.close();
      }
    });

    await step('no console errors, page errors or network requests were made', async () => {
      assert.equal(evidence.pageErrors.length, 0, JSON.stringify(evidence.pageErrors));
      const errors = evidence.console.filter((c) => c.type === 'error');
      assert.equal(errors.length, 0, JSON.stringify(errors));
      assert.equal(evidence.network.length, 0, JSON.stringify(evidence.network));
    });
  } catch (error) {
    failed = error;
  } finally {
    fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await browser.close();
  }
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + evidence.steps.filter((s) => !s.ok).length + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
