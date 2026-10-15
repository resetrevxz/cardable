/* Offline Stage 2 Shop logic and rendered smoke checks. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.SHOP_BROWSER_PATH || undefined });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, timezoneId: 'America/New_York' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Cardable && Cardable.shop && Cardable.setup && !Cardable.setup.loading, { timeout: 30000 });
  await page.locator('#shop-entry').click();
  await page.locator('.shop-offer').first().waitFor();
  const initial = await page.evaluate(() => {
    const C = Cardable;
    const result = C.shopState.ensure();
    const shop = C.state.current.shop;
    return { result, shop, credits: C.state.current.currency, inventory: C.state.current.inventory.length,
      packs: C.state.current.packs.ready };
  });
  assert.equal(initial.result.snapshot.offers.length, 4);
  assert.equal(new Set(initial.result.snapshot.offers.map(o => o.cardId)).size, 4);
  assert.match(initial.shop.seed, /^[a-f0-9]{32}$/);
  assert.equal(await page.locator('.shop-offer').count(), 4);
  assert.deepEqual(await page.evaluate(() => Cardable.shopState.ensure().snapshot.offers), initial.result.snapshot.offers);
  const stats = await page.evaluate(() => {
    const C = Cardable, seed = C.state.current.shop.seed, key = '2026-03-08';
    const same = C.shopState.generate(seed, key, C.data.cards, C.data.rarities, C.variants.roll);
    const again = C.shopState.generate(seed, key, C.data.cards, C.data.rarities, C.variants.roll);
    const other = C.shopState.generate(seed, '2026-03-09', C.data.cards, C.data.rarities, C.variants.roll);
    const spring = [new Date(2026, 2, 8, 1, 59), new Date(2026, 2, 8, 3, 1)].map(C.shopState.dayKey);
    const fall = [new Date(2026, 10, 1, 0, 59), new Date(2026, 10, 1, 2, 1)].map(C.shopState.dayKey);
    const tiny = C.shopState.generate(seed, key, C.data.cards.filter(c => C.shopState.eligible(c, C.rarity(c.rarity))).slice(0, 3), C.data.rarities, C.variants.roll);
    const special = C.data.cards.filter(c => C.shopState.eligible(c, C.rarity(c.rarity)));
    const counts = {}; C.data.rarities.forEach(r => { counts[r.id] = 0; });
    const fixtures = ['basic', 'common', 'rare'].flatMap(rarity => Array.from({ length: 5 }, (_, i) => ({ id: rarity + '-' + i, rarity, type: 'gpu', pullable: true })));
    const rarities = [{ id: 'basic', pullable: true, chance: 7 }, { id: 'common', pullable: true, chance: 2 }, { id: 'rare', pullable: true, chance: 1 }, { id: 'empty', pullable: true, chance: 1000 }, { id: 'invalid', pullable: true, chance: NaN }];
    const sample = { basic: 0, common: 0, rare: 0 };
    for (let n = 0; n < 12000; n++) {
      const day = C.shopState.generate('seed-' + n, '2026-03-08', fixtures, rarities, () => null);
      sample[day.offers[0].cardId.split('-')[0]]++;
      if (new Set(day.offers.map(o => o.cardId)).size !== 4) throw Error('Duplicate within a day');
    }
    const invalidFields = ['price', 'seed', 'variant', 'duplicate'].map(field => {
      const bad = JSON.parse(JSON.stringify(C.state.current.shop));
      if (field === 'price') bad.days[0].offers[0].price = -1;
      if (field === 'seed') bad.seed = 'bad';
      if (field === 'variant') bad.days[0].offers[0].variantId = 'unsupported';
      if (field === 'duplicate') bad.days[0].offers[1].cardId = bad.days[0].offers[0].cardId;
      try { C.state.validate(Object.assign({}, C.state.current, { shop: bad }), true); return false; } catch (_) { return true; }
    });
    const removed = JSON.parse(JSON.stringify(C.state.current.shop));
    removed.days[0].offers[0].cardId = 'removed-card';
    removed.days[0].offers[0].offerId = removed.days[0].dayKey + ':01:removed-card';
    const missingKept = C.shopState.normalize(removed).days[0].offers[0].cardId === 'removed-card';
    const depleted = C.shopState.generate(seed, key, fixtures.filter(c => c.rarity === 'basic').slice(0, 4).concat(fixtures.find(c => c.rarity === 'rare')),
      [{ id: 'basic', pullable: true, chance: 1 }, { id: 'rare', pullable: true, chance: 100 }], () => null);
    const noRepeat = new Set(depleted.offers.map(o => o.cardId)).size === 4;
    const hypotheticalResaleCeiling = { basic: 400, common: 600, uncommon: 850, rare: 1200, 'super-rare': 1600,
      unusual: 2000, 'double-super-rare': 2400, legendary: 3000, mythical: 4000, exotic: 5500, ascendant: 8000, secret: 12000 };
    const quoteGuardrail = Object.entries(hypotheticalResaleCeiling).every(([rarity, ceiling]) =>
      C.shopState.quote({ rarity }, null) > ceiling);
    const hypotheticalTitanValueCeiling = 6200;
    const packGuardrail = C.data.shop.featuredPrice > hypotheticalTitanValueCeiling;
    const savedQuote = C.state.current.shop.days[0].offers[0].price;
    C.shopState.setValuationAdapter({ localBaseline: (card, base) => base * 2 });
    const adapted = C.shopState.quote({ rarity: 'basic' }, null) === 2250;
    C.shopState.setValuationAdapter(null);
    const frozen = C.state.current.shop.days[0].offers[0].price === savedQuote;
    return { same: JSON.stringify(same) === JSON.stringify(again), different: JSON.stringify(same.offers) !== JSON.stringify(other.offers),
      spring, fall, tiny: tiny.status, sample, invalidFields, missingKept, noRepeat, quoteGuardrail, packGuardrail, adapted, frozen, eligibleCount: special.length,
      secret: special.some(c => c.rarity === 'secret'), limited: special.some(c => c.rarity === 'limited'),
      retired: special.some(c => c.retired), quote: C.shopState.quote(fixtures[0], null) };
  });
  assert.equal(stats.same, true);
  assert.equal(stats.different, true);
  assert.deepEqual(stats.spring, ['2026-03-08', '2026-03-08']);
  assert.deepEqual(stats.fall, ['2026-11-01', '2026-11-01']);
  assert.equal(stats.tiny, 'underfilled');
  assert.deepEqual(stats.invalidFields, [true, true, true, true]);
  assert.equal(stats.missingKept, true);
  assert.equal(stats.noRepeat, true);
  assert.equal(stats.quoteGuardrail, true);
  assert.equal(stats.packGuardrail, true);
  assert.equal(stats.adapted, true);
  assert.equal(stats.frozen, true);
  assert.equal(stats.limited, false);
  assert.equal(stats.retired, false);
  for (const [rarity, expected] of Object.entries({ basic: 0.7, common: 0.2, rare: 0.1 }))
    assert.ok(Math.abs(stats.sample[rarity] / 12000 - expected) < 0.02, `Rarity rate ${rarity}: ${stats.sample[rarity]}`);
  const sameDay = await page.evaluate(() => {
    const C = Cardable, old = C.state.current.shop.days[0];
    const forward = C.shopState.ensure(new Date(2026, 11, 30, 12));
    const backward = C.shopState.ensure(new Date(old.dayKey + 'T12:00:00'));
    return { forward: forward.snapshot.dayKey, backward: backward.snapshot.offers, days: C.state.current.shop.days.length };
  });
  assert.equal(sameDay.forward, '2026-12-30');
  assert.deepEqual(sameDay.backward, initial.result.snapshot.offers);
  assert.equal(sameDay.days, 2);
  const imported = await page.evaluate(() => {
    const C = Cardable, text = C.saveTools.exportText(), parsed = C.saveTools.parse(text);
    const before = JSON.stringify(C.shopState.normalize(C.state.current.shop));
    C.saveTools.importSave(parsed.save);
    return before === JSON.stringify(C.shopState.normalize(C.state.current.shop));
  });
  assert.equal(imported, true);
  const storage = await page.evaluate(() => {
    const C = Cardable, before = C.state.encode(C.state.current), original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('Test quota', 'QuotaExceededError'); };
    const result = C.shopState.ensure(new Date(2026, 11, 31, 12));
    Storage.prototype.setItem = original;
    const unchanged = before === C.state.encode(C.state.current);
    C.state.save();
    return { failed: !!result.error, unchanged, available: C.state.persistenceAvailable };
  });
  assert.deepEqual(storage, { failed: true, unchanged: true, available: true });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Cardable.setup && !Cardable.setup.loading);
  assert.deepEqual(await page.evaluate(() => Cardable.shopState.ensure().snapshot.offers), initial.result.snapshot.offers);
  await page.locator('#shop-entry').click();
  assert.equal(await page.evaluate(() => Cardable.packView.visible), false);
  await page.locator('.shop-offer .shop-inspect').first().click();
  assert.equal(await page.locator('.shop-detail-card').count(), 1);
  const expired = await page.evaluate(() => {
    const C = Cardable, original = C.clock.now, tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(12, 0, 0, 0);
    C.clock.now = () => tomorrow.getTime();
    C.events.notify('save:written', C.state.current);
    const visible = !document.querySelector('.shop-detail .shop-offer-state').hidden;
    const disabled = document.querySelector('.shop-detail .shop-hold').disabled;
    C.clock.now = original;
    C.events.notify('save:written', C.state.current);
    return { visible, disabled };
  });
  assert.deepEqual(expired, { visible: true, disabled: true });
  await page.locator('.shop-back').click();
  await page.screenshot({ path: path.join(root, 'artifacts', 'shop-stage2-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.shop-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.screenshot({ path: path.join(root, 'artifacts', 'shop-stage2-mobile-offers.png') });
  await page.evaluate(() => { Cardable.settings.set('rarityColor', 'mono'); Cardable.settings.set('quality', 'very-low'); });
  await page.screenshot({ path: path.join(root, 'artifacts', 'shop-stage2-mono-low.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.shop-offer').count(), 4);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => Cardable.packView.visible), true);
  await page.evaluate(() => {
    const C = Cardable, shop = JSON.parse(JSON.stringify(C.state.current.shop));
    const key = C.shopState.dayKey(), day = shop.days.find(d => d.dayKey === key);
    day.offers[0].cardId = 'removed-card'; day.offers[0].offerId = key + ':01:removed-card';
    C.state.current.shop = shop;
  });
  await page.locator('#shop-entry').click();
  assert.equal(await page.locator('.shop-offer h3').first().textContent(), 'Card unavailable');
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => ({ credits: Cardable.state.current.currency,
    inventory: Cardable.state.current.inventory.length, packs: Cardable.state.current.packs.ready,
    purchased: Cardable.state.current.shop.days.some(d => d.offers.some(o => o.purchased)) }));
  assert.deepEqual(after, { credits: initial.credits, inventory: initial.inventory, packs: initial.packs, purchased: false });
  assert.deepEqual(errors.filter(error => !error.includes('Cardable save failed (commit/storage)')), []);
  console.log(JSON.stringify({ pass: true, eligibleCount: stats.eligibleCount, secretEligible: stats.secret,
    distribution: stats.sample, savedDays: sameDay.days, captures: ['shop-stage2-desktop.png', 'shop-stage2-mobile-offers.png', 'shop-stage2-mono-low.png'] }));
  await browser.close();
  browser = null;
})().catch(async error => { console.error(error); process.exitCode = 1; if (browser) await browser.close(); });
