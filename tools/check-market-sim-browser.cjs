'use strict';
// Cardable Market Beta, Stage 2: headless browser acceptance check of the offline simulation.
// Loads the real index.html from disk and drives the Simulation through the interface: buying, bidding, listing,
// withdrawing, swapping, buy orders, pause, reload, freeze on hidden, export, restore and reset. Every claim about
// Credits and cards is read back from the player's save. Writes screenshots and an evidence JSON.
//   node tools/check-market-sim-browser.cjs [--out qa-output/market-beta/stage-2]
// Headless: it never opens a window on the desktop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-output/market-beta/stage-2');
const evidence = { when: new Date().toISOString(), steps: [], console: [], pageErrors: [], network: [] };
const HOUR = 3600000, DAY = 24 * HOUR;
fs.mkdirSync(out, { recursive: true });

async function boot(browser, options) {
  options = options || {};
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: options.height || 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') evidence.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', (e) => evidence.pageErrors.push({ text: String(e).slice(0, 300) }));
  page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) evidence.network.push({ url: u.slice(0, 160) }); });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.market && Cardable.market.ui && Cardable.market.ui.shell);
  await page.evaluate(() => {
    const C = Cardable, s = JSON.parse(JSON.stringify(C.state.current));
    s.tutorial = { step: 'done', done: true };
    const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
    const picks = [];
    ['basic', 'common', 'uncommon', 'rare', 'super-rare', 'unusual', 'double-super-rare', 'legendary'].forEach((r) => cards.filter((c) => c.rarity === r).slice(0, 3).forEach((c) => picks.push(c)));
    picks.forEach((c, i) => s.inventory.push({ instanceId: C.randomId('card'), packId: 'standard', cardSkinId: null, cardId: c.id, variantId: i % 7 === 3 ? 'rainbow-holo' : null, serial: C.serial.format('TEST', i + 1), pulledAt: Date.now() - (i + 1) * 86400000, seen: true }));
    s.serialCounter = 120; s.currency = 3000;
    C.state.commit(s);
  });
  await page.reload();
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.state.current.tutorial && Cardable.state.current.tutorial.done);
  await page.waitForTimeout(900);
  return { context, page };
}
async function openMarket(page, route) {
  await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
  await page.evaluate((r) => { Cardable.market.store.markGuideSeen(); Cardable.market.open(r || { name: 'discover', params: {} }); }, route);
  await page.waitForSelector('.mk-page');
  await page.waitForTimeout(400);
}
const save = (page) => page.evaluate(() => { const s = Cardable.state.current; return { currency: s.currency, ids: s.inventory.map((i) => i.instanceId), count: s.inventory.length, receipts: (s.market && s.market.receipts || []).length }; });
async function shot(page, name) { await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); }
async function step(name, fn) {
  const started = Date.now();
  try { const detail = await fn(); evidence.steps.push({ name, ok: true, ms: Date.now() - started, detail: detail || null }); console.log('ok   ' + name); }
  catch (error) { evidence.steps.push({ name, ok: false, error: String(error.message || error).slice(0, 600) }); console.log('FAIL ' + name + '\n     ' + String(error.message || error).split('\n')[0]); throw error; }
}
async function fillNumber(page, selector, value) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.fill(selector, String(value));
    if ((await page.inputValue(selector)) === String(value)) return;
    await page.waitForTimeout(150);
  }
  throw new Error('the field ' + selector + ' did not keep ' + value);
}
async function clickByText(page, scope, text) {
  const btn = page.locator(scope + ' button', { hasText: text }).first();
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = null;
  try {
    const { page } = await boot(browser);
    await openMarket(page);

    await step('provider is registered and the world has traders, listings and history', async () => {
      const f = await page.evaluate(() => {
        const w = Cardable.marketSim.runtime.world;
        return { live: Cardable.market.api.simulationLive, bots: w.bots.length, trades: w.trades.length, open: Object.keys(w.listings).filter((k) => w.listings[k].status === 'open').length, kinds: Array.from(new Set(Object.keys(w.listings).map((k) => w.listings[k].kind))).sort() };
      });
      assert(f.live && f.bots >= 30 && f.trades >= 30 && f.open >= 30, JSON.stringify(f));
      assert.deepEqual(f.kinds, ['auction', 'fixed', 'swap']);
      await shot(page, 'discover');
      return f;
    });

    await step('the clock chip shows a running simulated day and opens its controls', async () => {
      const chip = await page.evaluate(() => document.querySelector('.mk-sim-chip').textContent);
      assert(/Day \d+/.test(chip) && /running/i.test(chip), chip);
      await page.click('.mk-sim-chip');
      await page.waitForSelector('.mk-sim-panel');
      await page.waitForTimeout(300);
      const text = await page.evaluate(() => document.querySelector('.mk-sim-panel').textContent);
      assert(/Pause/.test(text) && /Calm/.test(text) && /Standard/.test(text) && /Fast/.test(text), text);
      await shot(page, 'sim-panel');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    });

    await step('buying a fixed-price listing through the interface moves the card and the Credits exactly once', async () => {
      const target = await page.evaluate(() => {
        const api = Cardable.market.api, bal = Cardable.state.current.currency;
        const items = api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 400, facets: false }).items.map((e) => e.listing);
        const l = items.filter((x) => x.format === 'buy-now' && x.ask <= bal / 2 && !x.isMine).sort((a, b) => b.ask - a.ask)[0];
        return l ? { id: l.id, ask: l.ask, instance: l.items[0].instanceId, serial: l.items[0].serial } : null;
      });
      assert(target, 'a buy-now listing within budget');
      const before = await save(page);
      await page.evaluate((id) => Cardable.market.ui.go('listing', { id }, {}), target.id);
      await page.waitForSelector('.mk-buybox');
      await clickByText(page, '.mk-buybox-actions', 'Buy now');
      await page.waitForSelector('.mk-review');
      await shot(page, 'buy-confirm');
      const body = await page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(body.includes(target.serial) && body.includes('Available after'), body);
      await clickByText(page, '.mk-review .mk-modal-actions', 'Buy for');
      await page.waitForFunction((id) => Cardable.state.current.inventory.some((i) => i.instanceId === id), target.instance);
      const after = await save(page);
      assert.equal(after.currency, before.currency - target.ask, 'Credits fall by exactly the price');
      assert.equal(after.count, before.count + 1);
      assert.equal(after.receipts, before.receipts + 1);
      const view = await page.evaluate((id) => Cardable.market.api.listingSync('simulation', id).listing.status, target.id);
      assert.equal(view, 'sold');
      // the same request replayed changes nothing
      const again = await page.evaluate((id) => Cardable.market.api.purchaseSync('simulation', id, 'dup-1').ok, target.id);
      assert.equal(again, false);
      const same = await save(page);
      assert.equal(same.currency, after.currency);
      await shot(page, 'bought');
      return { price: target.ask, before: before.currency, after: after.currency };
    });

    await step('a proxy bid holds Credits, shows leading, and the hold is released when the auction ends', async () => {
      const t = await page.evaluate(() => {
        const items = Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 400, facets: false }).items.map((e) => e.listing);
        const l = items.filter((x) => x.format === 'auction' && x.endsMin > 600 && !x.isMine && x.auction.minNext < 300).sort((a, b) => a.auction.minNext - b.auction.minNext)[0];
        return l ? { id: l.id, min: l.auction.minNext, ends: l.endsAt } : null;
      });
      assert(t, 'an auction to bid on');
      const before = await save(page);
      const max = t.min + 40;
      await page.evaluate((id) => Cardable.market.ui.go('listing', { id }, {}), t.id);
      await page.waitForSelector('#mk-max');
      await fillNumber(page, '#mk-max', max);
      await clickByText(page, '.mk-buybox-actions', 'Place bid');
      await page.waitForSelector('.mk-review');
      await clickByText(page, '.mk-review .mk-modal-actions', 'Place bid');
      await page.waitForFunction((id) => { const l = Cardable.market.api.listingSync('simulation', id); return l && l.listing.auction.myMax; }, t.id);
      const state = await page.evaluate((id) => { const l = Cardable.market.api.listingSync('simulation', id).listing; return { myMax: l.auction.myMax, lead: l.auction.youLead, held: Cardable.marketSim.heldCredits(), balance: Cardable.state.current.currency }; }, t.id);
      assert.equal(state.myMax, max);
      assert.equal(state.held, max, 'the maximum is held');
      assert.equal(state.balance, before.currency, 'nothing is paid yet');
      const label = await page.evaluate(() => document.querySelector('.mk-wallet').getAttribute('aria-label'));
      assert(/held/.test(label), label);
      await shot(page, 'bid-placed');
      // run the market past the end
      await page.evaluate(() => Cardable.marketSim.runtime.dev.fastForward(4 * 24 * 3600000));
      await page.waitForTimeout(300);
      const end = await page.evaluate((id) => { const l = Cardable.market.api.listingSync('simulation', id); return { status: l.listing.status, soldFor: l.listing.soldFor, held: Cardable.marketSim.heldCredits(), balance: Cardable.state.current.currency }; }, t.id);
      assert(['sold', 'expired'].includes(end.status), end.status);
      const won = await page.evaluate((id) => Cardable.market.sim && Cardable.marketSim.runtime.world.listings[id].buyer === 'you', t.id);
      if (won) assert.equal(end.balance, before.currency - end.soldFor, 'the winner paid the final price, never the maximum');
      assert.equal(end.held, 0, 'every hold is released');
      return { won, price: end.soldFor, max };
    });

    await step('listing a card locks it, a sale pays the net once, and a locked card cannot be deleted', async () => {
      const inst = await page.evaluate(() => Cardable.state.current.inventory.find((i) => /TEST/.test(i.serial) && Cardable.data.cards.find((c) => c.id === i.cardId).rarity === 'rare'));
      assert(inst, 'a rare test card');
      await page.evaluate((id) => Cardable.market.ui.go('compose', { instanceId: id }, { reset: true }), inst.instanceId);
      await page.waitForSelector('.mk-composer');
      await page.waitForTimeout(300);
      const price = await page.evaluate(() => Number(document.querySelector('.mk-terms input[type="number"]').value));
      assert(price > 0, 'a suggested price');
      await shot(page, 'composer');
      await clickByText(page, '.mk-side-actions', 'List this card');
      await page.waitForSelector('.mk-review');
      const sum = await page.evaluate(() => document.querySelector('.mk-review').textContent);
      assert(/2% market fee|market fee/i.test(sum) && /You receive/.test(sum), sum);
      await clickByText(page, '.mk-review .mk-modal-actions', 'List card');
      await page.waitForSelector('.mk-detail');
      const lock = await page.evaluate((id) => Cardable.marketSim.lockOf(id), inst.instanceId);
      assert(lock, 'the card is locked to its listing');
      const del = await page.evaluate((id) => { const s = Cardable.state.current, i = s.inventory.find((x) => x.instanceId === id); const r = Cardable.cardDeletion.rules(s, i, ''); return { blocked: r.blocked, listed: r.listed }; }, inst.instanceId);
      assert(del.blocked && del.listed, 'the deletion rules refuse a listed card: ' + JSON.stringify(del));
      const stillThere = await page.evaluate((id) => Cardable.state.current.inventory.some((i) => i.instanceId === id), inst.instanceId);
      assert(stillThere);
      // my listings shows it
      await page.evaluate(() => Cardable.market.ui.go('my-listings', {}, { reset: true }));
      await page.waitForSelector('.mk-myrow');
      assert((await page.locator('.mk-myrow').count()) >= 1);
      await shot(page, 'my-listings');
      return { listing: lock, price, deletionRule: del };
    });

    await step('a listed card sells at most once and its net lands in the save', async () => {
      const mine = await page.evaluate(() => { const w = Cardable.marketSim.runtime.world; return Object.keys(w.listings).map((k) => w.listings[k]).filter((l) => l.seller === 'you' && l.status === 'open').map((l) => ({ id: l.id, item: l.items[0].i, serial: l.items[0].s, ask: l.ask })); });
      assert(mine.length >= 1);
      const before = await save(page);
      const t0 = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
      await page.evaluate(() => Cardable.marketSim.runtime.dev.fastForward(14 * 24 * 3600000));
      await page.waitForTimeout(300);
      const after = await save(page);
      const sales = await page.evaluate((from) => Cardable.marketSim.runtime.world.trades.filter((t) => t.seller === 'you' && t.t > from).map((t) => ({ price: t.price, fee: t.fee, serial: t.s })), t0);
      const net = sales.reduce((n, t) => n + t.price - t.fee, 0);
      assert.equal(after.currency - before.currency, net, 'Credits rose by exactly the net of every sale: ' + JSON.stringify(sales));
      assert.equal(after.count, before.count - sales.length, 'one card left the collection per sale');
      const sold = !after.ids.includes(mine[0].item);
      assert.equal(sold, sales.some((t) => t.serial === mine[0].serial), 'the listed card is gone exactly when a sale of it happened');
      assert.equal(new Set(after.ids).size, after.ids.length, 'no duplicate instances');
      const audit = await page.evaluate(() => Cardable.market.sim.audit(Cardable.marketSim.runtime.world, Cardable.state.current.inventory.map((i) => i.instanceId)));
      assert.equal(audit.problems.length, 0, JSON.stringify(audit.problems));
      return { sales: sales.length, net };
    });

    await step('withdrawing a listing returns the card unlocked', async () => {
      const inst = await page.evaluate(() => Cardable.state.current.inventory.find((i) => /TEST/.test(i.serial) && !Cardable.marketSim.lockOf(i.instanceId)));
      const spec = await page.evaluate((id) => Cardable.market.api.publishListingSync('simulation', { kind: 'fixed', instanceIds: [id], ask: 500, durationMs: 3 * 86400000, requestId: 'w1' }), inst.instanceId);
      assert(spec.ok);
      await page.evaluate(() => Cardable.market.ui.go('my-listings', {}, { reset: true }));
      await page.waitForSelector('.mk-myrow');
      await clickByText(page, '.mk-myrow', 'Withdraw');
      await page.waitForSelector('.mk-review');
      await clickByText(page, '.mk-review .mk-modal-actions', 'Withdraw');
      await page.waitForFunction((id) => !Cardable.marketSim.lockOf(id), inst.instanceId);
      const status = await page.evaluate((id) => Cardable.marketSim.runtime.world.listings[id].status, spec.listing.id);
      assert.equal(status, 'cancelled');
    });

    await step('a swap offer locks the offered card and withdrawing releases it', async () => {
      const t = await page.evaluate(() => {
        const items = Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 400, facets: false }).items.map((e) => e.listing);
        const l = items.find((x) => x.format === 'swap' && !x.isMine);
        return l ? { id: l.id } : null;
      });
      assert(t, 'a swap listing');
      const give = await page.evaluate(() => Cardable.state.current.inventory.find((i) => !Cardable.marketSim.lockOf(i.instanceId)).instanceId);
      await page.evaluate((id) => Cardable.market.ui.go('listing', { id }, {}), t.id);
      await page.waitForSelector('.mk-buybox');
      await clickByText(page, '.mk-buybox-actions', 'Offer a swap');
      await page.waitForSelector('.mk-swapper');
      await page.locator('.mk-pick-row').first().click();
      await shot(page, 'swap-offer');
      await clickByText(page, '.mk-review .mk-modal-actions', 'Send offer');
      await page.waitForSelector('.mk-offers');
      const offer = await page.evaluate((id) => { const w = Cardable.marketSim.runtime.world; return Object.keys(w.offers).map((k) => w.offers[k]).filter((o) => o.from === 'you' && o.listingId === id)[0]; }, t.id);
      assert(offer && offer.status === 'pending');
      const locked = await page.evaluate((id) => Cardable.marketSim.lockOf(id), offer.give[0].i);
      assert(locked === 'offer:' + offer.id, 'the offered card is locked: ' + locked);
      await clickByText(page, '.mk-offer-actions', 'Withdraw');
      await page.waitForFunction((id) => !Cardable.marketSim.lockOf(id), offer.give[0].i);
    });

    // The detail page remounts when the simulator reports a change, which can land between filling the form and confirming it (it also did before the notch); the step retries once the page is stable.
    await step('a buy order reserves its price and can be cancelled', async () => {
      for (let attempt = 0; ; attempt++) {
        try { await buyOrderOnce(); return; } catch (error) { if (attempt >= 2) throw error; await page.waitForTimeout(600); }
      }
    });
    async function buyOrderOnce() {
      const cardId = await page.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 10, facets: false }).items[0].listing.card.cardId);
      await page.evaluate((id) => Cardable.market.ui.go('card', { id, variant: '' }, { reset: true }), cardId);
      await page.waitForSelector('.mk-detail');
      const heldBefore = await page.evaluate(() => Cardable.marketSim.heldCredits());
      await clickByText(page, '.mk-detail-actions', 'Place a buy order');
      await page.waitForSelector('.mk-order-form');
      await page.fill('.mk-order-form input[type="number"]', '5');
      await shot(page, 'buy-order');
      await clickByText(page, '.mk-review .mk-modal-actions', 'Place order');
      await page.waitForFunction((b) => Cardable.marketSim.heldCredits() >= b + 5 || Object.keys(Cardable.marketSim.runtime.world.orders).some((k) => Cardable.marketSim.runtime.world.orders[k].owner === 'you'), heldBefore);
      const o = await page.evaluate(() => { const w = Cardable.marketSim.runtime.world; return Object.keys(w.orders).map((k) => w.orders[k]).filter((x) => x.owner === 'you')[0]; });
      assert(o && o.maxPrice === 5);
      await clickByText(page, '.mk-offers', 'Cancel order');
      await page.waitForFunction((id) => Cardable.marketSim.runtime.world.orders[id].status === 'cancelled', o.id);
    }

    await step('pausing stops simulated time and resuming does not jump it', async () => {
      const t0 = await page.evaluate(() => { Cardable.marketSim.runtime.pause(); return Cardable.marketSim.runtime.world.now; });
      await page.waitForTimeout(2600);
      const t1 = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
      assert.equal(t1, t0, 'time is frozen while paused');
      const chip = await page.evaluate(() => document.querySelector('.mk-sim-chip').textContent);
      assert(/paused/i.test(chip), chip);
      await page.evaluate(() => Cardable.marketSim.runtime.resume());
      await page.waitForTimeout(4600);
      const t2 = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
      assert(t2 > t1 && t2 - t1 < 12 * 60000 * 5, 'resumed and advanced by a small, speed-scaled amount: ' + (t2 - t1));
    });

    await step('a hidden document freezes the clock and returning does not catch up', async () => {
      const t0 = await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        return Cardable.marketSim.runtime.world.now;
      });
      await page.waitForTimeout(3200);
      const t1 = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
      assert.equal(t1, t0, 'frozen while hidden');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(1500);
      const t2 = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
      assert(t2 - t1 < 10 * 60000 * 2, 'no catch-up for the hidden time: ' + (t2 - t1));
    });

    await step('a reload keeps the world, an open bid and its hold', async () => {
      const t = await page.evaluate(() => {
        const items = Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 400, facets: false }).items.map((e) => e.listing);
        const l = items.filter((x) => x.format === 'auction' && x.endsMin > 1200 && !x.isMine && !x.auction.myMax).sort((a, b) => a.auction.minNext - b.auction.minNext)[0];
        return l ? { id: l.id, min: l.auction.minNext } : null;
      });
      assert(t, 'an auction');
      const max = t.min + 25;
      const placed = await page.evaluate(([id, m]) => Cardable.market.api.placeBidSync('simulation', id, m, 'rl-1').ok, [t.id, max]);
      assert(placed);
      await page.evaluate(() => Cardable.marketSim.runtime.flush());
      const before = await page.evaluate(() => ({ now: Cardable.marketSim.runtime.world.now, trades: Cardable.marketSim.runtime.world.stats.trades, held: Cardable.marketSim.heldCredits() }));
      await page.reload();
      await page.waitForFunction(() => window.Cardable && Cardable.marketSim && Cardable.marketSim.runtime && Cardable.marketSim.runtime.world);
      const after = await page.evaluate((id) => { const w = Cardable.marketSim.runtime.world; return { now: w.now, trades: w.stats.trades, held: Cardable.marketSim.heldCredits(), max: w.listings[id].maxes.you && w.listings[id].maxes.you.max }; }, t.id);
      assert.equal(after.max, max);
      assert.equal(after.held, before.held);
      assert(after.now >= before.now && after.now - before.now < 15 * 60000, 'time did not move while the game was closed: ' + (after.now - before.now));
    });

    await step('exporting, resetting and restoring brings the world back; cards and Credits are untouched by a reset', async () => {
      await openMarket(page, { name: 'settings', params: {} });
      const text = await page.evaluate(() => Cardable.marketSim.runtime.exportText());
      assert(text && text.length > 1000);
      const trades = await page.evaluate(() => Cardable.marketSim.runtime.world.stats.trades);
      const saveBefore = await save(page);
      await page.evaluate(() => Cardable.market.ui.sim.resetWorld());
      const afterReset = await page.evaluate(() => ({ trades: Cardable.marketSim.runtime.world.stats.trades, locks: Object.keys(Cardable.marketSim.runtime.world.locks).length, held: Cardable.marketSim.heldCredits() }));
      assert(afterReset.locks === 0 && afterReset.held === 0);
      const saveAfter = await save(page);
      assert.equal(saveAfter.currency, saveBefore.currency); assert.equal(saveAfter.count, saveBefore.count);
      await page.evaluate((t) => Cardable.marketSim.runtime.importText(t), text);
      const restored = await page.evaluate(() => Cardable.marketSim.runtime.world.stats.trades);
      assert.equal(restored, trades);
      await shot(page, 'settings');
    });

    await step('a simulation file with a forged receipt cannot add cards or Credits to the save', async () => {
      const before = await save(page);
      const outcome = await page.evaluate(() => {
        const rt = Cardable.marketSim.runtime, wrapper = JSON.parse(rt.exportText()), world = JSON.parse(wrapper.body);
        const t = world.now;
        // Receipts and pending settlements exactly as the simulator writes them, but without this save's signature.
        const effect = { receiptId: 'R-forged-1', kind: 'sale', listingId: 'Lforged', at: t, remove: [], delta: 100000, reason: 'market sale', price: 1, fee: 0, items: [],
          add: [{ instanceId: 'forged-card-1', cardId: Cardable.data.cards[0].id, variantId: null, cardSkinId: null, serial: 'CBL-FAKE-000001', packId: 'standard', pulledAt: 1, seen: false }], sig: 'forged' };
        world.receipts['R-forged-1'] = { state: 'done', t: t + 1, effect };
        world.receipts['R-forged-2'] = { state: 'pending', t: t + 2, effect: Object.assign({}, effect, { receiptId: 'R-forged-2' }) };
        world.pending.push('R-forged-2');
        const body = JSON.stringify(world);
        wrapper.body = body; wrapper.sum = Cardable.market.core.hash32(body);
        let error = null;
        try { rt.importText(JSON.stringify(wrapper)); } catch (e) { error = String(e.message); }
        return { error, credits: Cardable.state.current.currency, forged: Cardable.state.current.inventory.some((i) => i.instanceId === 'forged-card-1') };
      });
      assert.equal(outcome.forged, false, 'no forged card');
      assert.equal(outcome.credits, before.currency, 'no forged Credits');
      const after = await save(page);
      assert.equal(after.count, before.count);
    });

    await step('speed settings change the rate and Calm is slower than Fast', async () => {
      const rate = async (id) => {
        await page.evaluate((s) => { Cardable.marketSim.runtime.setSpeed(s); Cardable.marketSim.runtime.resumeClock(); }, id);
        const a = await page.evaluate(() => Cardable.marketSim.runtime.world.now);
        await page.waitForTimeout(3000);
        return (await page.evaluate(() => Cardable.marketSim.runtime.world.now)) - a;
      };
      const calm = await rate('calm'), fast = await rate('fast');
      assert(fast > calm * 3, 'fast ' + fast + ' vs calm ' + calm);
      await page.evaluate(() => Cardable.marketSim.runtime.setSpeed('standard'));
    });

    await step('every target size keeps the clock chip, wallet and pages inside the frame (no horizontal scroll)', async () => {
      const sizes = [['desktop-1920x1080', 1920, 1080], ['laptop-1366x768', 1366, 768], ['tablet-768x1024', 768, 1024], ['phone-390x844', 390, 844], ['phone-360x800', 360, 800]];
      const seen = [];
      for (const [name, width, height] of sizes) {
        const { context, page: p } = await boot(browser, { width, height });
        await openMarket(p);
        const route = async (n, params) => { await p.evaluate(([a, b]) => Cardable.market.ui.go(a, b, { reset: true }), [n, params || {}]); await p.waitForTimeout(450); };
        const metrics = async (label) => p.evaluate((l) => {
          const f = document.querySelector('.mk-frame').getBoundingClientRect(), main = document.querySelector('.mk-main');
          const chip = document.querySelector('.mk-sim-chip'), wallet = document.querySelector('.mk-wallet'), c = chip.getBoundingClientRect(), w = wallet.getBoundingClientRect();
          const off = [];
          document.querySelectorAll('.mk-frame *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.right > f.right + 1 && !el.closest('.mk-table, .mk-nav, .mk-presets, .mk-segments, .mk-hero-side, .mk-picker, .mk-sr, .mk-album-grid, .mk-stage, .mk-modal, .mk-popover, .mk-suggest, .mk-chart-plotarea')) off.push((el.tagName + '.' + (el.getAttribute('class') || '') + ' < ' + (el.parentElement ? el.parentElement.getAttribute('class') || el.parentElement.tagName : '')).slice(0, 80)); });
          return { label: l, scroll: main.scrollWidth - main.clientWidth, chipInside: c.right <= f.right + 1 && c.left >= f.left - 1, overlap: !(c.right <= w.left || c.left >= w.right || c.bottom <= w.top || c.top >= w.bottom), offenders: Array.from(new Set(off)).slice(0, 5) };
        }, label);
        await route('discover'); let m = await metrics('discover');
        if (m.scroll > 1 || m.offenders.length) { await p.waitForTimeout(500); m = await metrics('discover'); }
        seen.push(Object.assign({ size: name }, m));
        assert(m.scroll <= 1 && m.chipInside && !m.overlap && m.offenders.length === 0, name + ' discover ' + JSON.stringify(m));
        await shot(p, 'discover-' + name);
        const listing = await p.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((l) => l.format === 'auction').id);
        await p.evaluate((id) => Cardable.market.ui.go('listing', { id }, { reset: true }), listing); await p.waitForSelector('#mk-max'); await p.waitForTimeout(500);
        m = await metrics('listing'); seen.push(Object.assign({ size: name }, m));
        assert(m.scroll <= 1 && m.offenders.length === 0, name + ' listing ' + JSON.stringify(m));
        await shot(p, 'listing-' + name);
        await route('compose'); m = await metrics('compose'); assert(m.scroll <= 1, name + ' compose ' + JSON.stringify(m));
        await route('stocks'); m = await metrics('stocks'); assert(m.scroll <= 1, name + ' stocks ' + JSON.stringify(m));
        await route('portfolio'); m = await metrics('portfolio'); assert(m.scroll <= 1, name + ' portfolio ' + JSON.stringify(m));
        // on a phone the clock chip gives way (the clock is in the notch's panel); the panel opens from the notch there
        const chipShown = await p.evaluate(() => getComputedStyle(document.querySelector('.mk-sim-chip')).display !== 'none');
        if (chipShown) { await p.click('.mk-sim-chip'); await p.waitForSelector('.mk-sim-panel'); } else { await p.click('.mk-header .mk-island'); await p.waitForSelector('.mk-island-panel'); }
        await p.waitForTimeout(300);
        const panel = await p.evaluate(() => { const r = (document.querySelector('.mk-sim-panel') || document.querySelector('.mk-island-pop')).getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1; });
        assert(panel, name + ' sim panel inside the window');
        await shot(p, 'sim-panel-' + name);
        await context.close();
      }
      return seen;
    });

    await step('saved monochrome and reduced motion keep the simulation readable', async () => {
      const { context, page: p } = await boot(browser, { width: 1440, height: 900 });
      await p.evaluate(() => { Cardable.settings.set('rarityColor', 'mono'); });
      await openMarket(p);
      const chipState = await p.evaluate(() => { const c = document.querySelector('.mk-sim-chip'); return { text: c.textContent, label: c.getAttribute('aria-label') }; });
      assert(/Running/i.test(chipState.text) && /Simulation clock/.test(chipState.label), JSON.stringify(chipState));
      await shot(p, 'discover-mono');
      const l = await p.evaluate(() => Cardable.market.api.listingsSync('simulation', { filters: Cardable.market.core.emptyFilters(), limit: 100, facets: false }).items.map((e) => e.listing).find((x) => x.format === 'auction').id);
      await p.evaluate((id) => Cardable.market.ui.go('listing', { id }, { reset: true }), l); await p.waitForSelector('#mk-max');
      await shot(p, 'listing-mono');
      await context.close();
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
  const bad = evidence.steps.filter((s) => !s.ok).length;
  console.log('\n' + evidence.steps.filter((s) => s.ok).length + ' steps passed, ' + bad + ' failed. Evidence: ' + path.join(out, 'evidence.json'));
  if (failed) process.exit(1);
})();
