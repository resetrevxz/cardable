'use strict';
// Market Beta Stage 1: pure-function checks for src/market/{core,fixtures}.js and src/data/market-config.js.
// Run with: node --test tests/market-core.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function load(files) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.Cardable = { data: {} };
  vm.createContext(sandbox);
  files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
  return sandbox.Cardable;
}
const C = load(['src/data/rarities.js', 'src/data/cards.js', 'src/data/variants.js', 'src/data/packs.js', 'src/data/market-config.js', 'src/market/core.js', 'src/market/fixtures.js']);
const K = C.market.core;
const env = { cards: C.data.cards, rarities: C.data.rarities, variants: C.data.variants, packs: C.data.packs };
const built = C.market.fixtures.build;
const memo = {}; C.market.fixtures.build = function (e) { return memo.v || (memo.v = built(e)); };

function context(data, extra) {
  const cards = {}, rarities = {}, variants = {}, order = {};
  data.cards.forEach((c) => { cards[c.id] = c; });
  data.rarityById && Object.assign(rarities, data.rarityById);
  Object.assign(variants, data.variantById); Object.assign(order, data.variantOrder);
  return Object.assign({ cards, rarities, variants, variantOrder: order, owned: {}, wishlist: {}, watch: {}, budget: 400 }, extra || {});
}

test('fee is 2% rounded half up with a one Credit minimum and never exceeds the price', () => {
  assert.equal(K.feeFor(100), 2);
  assert.equal(K.feeFor(1000), 20);
  assert.equal(K.feeFor(75), 2);   // 1.5 rounds half up
  assert.equal(K.feeFor(10), 1);   // 0.2 raised to the minimum
  assert.equal(K.feeFor(1), 1);
  assert.equal(K.feeFor(0), 0);
  assert.equal(K.netProceeds(100), 98);
  assert.equal(K.netProceeds(1), 0);
  for (let p = 1; p < 5000; p += 7) assert.ok(K.feeFor(p) <= p && K.netProceeds(p) + K.feeFor(p) === p);
});

test('formatters are stable', () => {
  assert.equal(K.formatCredits(1234567), '1,234,567');
  assert.equal(K.formatCredits(12500, true), '12.5K');
  assert.equal(K.formatCredits(null), '—');
  assert.equal(K.formatPercent(0.0345, true), '+3.5%');
  assert.equal(K.formatPercent(-0.2, true), '−20%');
  assert.equal(K.formatPercent(0, true), '0%');
  assert.equal(K.formatDuration(0), 'Ended');
  assert.equal(K.formatDuration(45), '45m');
  assert.equal(K.formatDuration(134), '2h 14m');
  assert.equal(K.formatDuration(60 * 51), '2d 3h');
});

test('prng is deterministic and well distributed', () => {
  const a = K.prng('seed'), b = K.prng('seed');
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const r = K.prng(7); let min = 1, max = 0;
  for (let i = 0; i < 2000; i++) { const v = r(); min = Math.min(min, v); max = Math.max(max, v); assert.ok(v >= 0 && v < 1); }
  assert.ok(min < 0.05 && max > 0.95);
});

test('every GPU gets its own baseline and tiers stay ordered', () => {
  const data = C.market.fixtures.build(env);
  const values = {};
  data.cards.forEach((c) => { values[c.id] = data.index[c.id].baseValue; });
  const perRarity = {};
  data.cards.forEach((c) => { (perRarity[c.rarity] = perRarity[c.rarity] || new Set()).add(values[c.id]); });
  Object.keys(perRarity).forEach((r) => {
    const n = data.cards.filter((c) => c.rarity === r).length;
    if (n > 3) assert.ok(perRarity[r].size > 1, 'rarity ' + r + ' must not share one price');
  });
  const mean = (id) => { const l = data.cards.filter((c) => c.rarity === id).map((c) => values[c.id]); return l.reduce((a, b) => a + b, 0) / l.length; };
  assert.ok(mean('common') > mean('basic'));
  assert.ok(mean('rare') > mean('uncommon'));
  assert.ok(mean('legendary') > mean('rare'));
});

test('serial factor is bounded and rewards low or round counters', () => {
  assert.ok(K.serialFactor('CBL-DEMO-000001') > K.serialFactor('CBL-DEMO-000500'));
  assert.equal(K.serialFactor('CBL-DEMO-000777') >= 0.92, true);
  for (let n = 1; n < 2000; n += 13) {
    const f = K.serialFactor('CBL-DEMO-' + String(n).padStart(6, '0'));
    assert.ok(f >= 0.92 && f <= 1.35);
  }
  assert.equal(K.serialFactor('nonsense'), 1);
});

test('fixtures are deterministic and carry no fake global market by accident', () => {
  const one = C.market.fixtures.build(env), two = built(env);
  assert.equal(JSON.stringify(one.listings.simulation.slice(0, 8)), JSON.stringify(two.listings.simulation.slice(0, 8)));
  assert.ok(one.listings.simulation.length >= 100);
  one.listings.simulation.forEach((l) => {
    assert.ok(/^CBL-DEMO-\d{6}$/.test(l.card.serial), 'serials are plainly sample serials');
    assert.ok(l.seller.isBot === true);
    assert.ok(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(l.seller.alias), 'two-word alias');
    assert.ok(l.ask >= 1);
  });
  one.listings.global.forEach((l) => { assert.equal(l.seller.isBot, false); assert.equal(l.source, 'fixture-global-sample'); });
  const formats = new Set(one.listings.simulation.map((l) => l.format));
  assert.deepEqual([...formats].sort(), ['auction', 'buy-now', 'swap']);
});

test('valuation: common cards are steadier than scarce ones, spreads widen with rarity', () => {
  const data = C.market.fixtures.build(env);
  const basic = data.cards.find((c) => c.rarity === 'basic'), scarce = data.cards.filter((c) => data.index[c.id].tier >= 7)[0];
  const a = data.valuation({ cardId: basic.id }), b = data.valuation({ cardId: scarce.id });
  assert.ok(a.volatility < b.volatility);
  assert.ok(a.spread < b.spread);
  assert.ok(a.liquidity > b.liquidity);
  assert.ok(a.targetBuy < a.average && a.targetSell > a.average);
  assert.ok(a.bestBid < a.average && a.lowestAsk > a.average);
});

test('the Recommended order is not price order and weighs budget as a fit, not a cap', () => {
  const data = C.market.fixtures.build(env), ctx = context(data, { budget: 300 });
  const list = data.listings.simulation.filter((l) => l.status === 'active' || l.status === 'ending');
  const byRec = K.sortListings(list, 'recommended', ctx).slice(0, 30);
  const byPrice = K.sortListings(list, 'price-asc', ctx).slice(0, 30);
  assert.notEqual(byRec.map((l) => l.id).join(), byPrice.map((l) => l.id).join());
  const prices = byRec.map(K.currentPrice);
  assert.ok(prices.some((p, i) => i > 0 && p < prices[i - 1]), 'not ascending');
  // Something unaffordable never outranks an equivalent affordable listing.
  const within = byRec.filter((l) => K.currentPrice(l) <= 300).length;
  assert.ok(within >= 18, 'most of the top recommendations fit a 300 Credit budget, got ' + within);
});

test('recommendation explains itself and flags risk honestly', () => {
  const data = C.market.fixtures.build(env), ctx = context(data, { budget: 500 });
  const rare = data.listings.simulation.find((l) => l.valuation.confidence === 'none' || l.valuation.confidence === 'low');
  if (rare) {
    const r = K.recommend(rare, ctx);
    assert.equal(r.risk, 'higher');
    assert.ok(r.reasons.some((x) => x.id === 'risk'));
  }
  const strong = data.listings.simulation.find((l) => l.valuation.confidence === 'high' && l.ask <= l.valuation.average * 0.9 && l.format === 'buy-now');
  if (strong) assert.ok(K.recommend(strong, ctx).reasons.some((x) => x.id === 'value'));
});

test('filters compose and facet counts ignore their own facet', () => {
  const data = C.market.fixtures.build(env), ctx = context(data);
  const list = data.listings.simulation;
  const auctions = K.applyFilters(list, { formats: ['auction'] }, ctx);
  assert.ok(auctions.length > 0 && auctions.every((l) => l.format === 'auction'));
  const rareAuctions = K.applyFilters(list, { formats: ['auction'], rarities: ['rare', 'common'] }, ctx);
  assert.ok(rareAuctions.every((l) => l.format === 'auction' && ['rare', 'common'].includes(ctx.cards[l.card.cardId].rarity)));
  const variantOnly = K.applyFilters(list, { variantOnly: true }, ctx);
  assert.ok(variantOnly.every((l) => l.card.variantId));
  const priced = K.applyFilters(list, { price: { min: 50, max: 120 } }, ctx);
  assert.ok(priced.every((l) => K.currentPrice(l) >= 50 && K.currentPrice(l) <= 120));
  const counts = K.facetCounts(list, { formats: ['auction'] }, ctx);
  assert.equal(counts.formats['buy-now'] > 0, true, 'format counts ignore the format filter itself');
  const total = Object.values(counts.rarities).reduce((a, b) => a + b, 0);
  assert.equal(total, auctions.length);
});

test('search understands words and operators', () => {
  const data = C.market.fixtures.build(env), ctx = context(data);
  const list = data.listings.simulation;
  const sample = list[3], name = ctx.cards[sample.card.cardId].name.split(' ')[0].toLowerCase();
  const byName = K.applyFilters(list, { q: name }, ctx);
  assert.ok(byName.includes(sample));
  const cheap = K.applyFilters(list, { q: 'price:<40' }, ctx);
  assert.ok(cheap.length > 0 && cheap.every((l) => K.currentPrice(l) < 40));
  const range = K.applyFilters(list, { q: 'price:50-90' }, ctx);
  assert.ok(range.every((l) => K.currentPrice(l) >= 50 && K.currentPrice(l) <= 90));
  const bySeller = K.applyFilters(list, { q: 'seller:' + sample.seller.alias.split(' ')[0].toLowerCase() }, ctx);
  assert.ok(bySeller.includes(sample));
  assert.equal(K.applyFilters(list, { q: 'zzzzzz-no-such-card' }, ctx).length, 0);
  assert.equal(JSON.stringify(K.parseQuery('rarity:rare price:>=20 geforce').terms), '["geforce"]');
});

test('an unfound Secret is searched and shown only under its concealed name', () => {
  const data = C.market.fixtures.build(env), list = data.listings.simulation, ctx = context(data);
  const target = list[0], card = ctx.cards[target.card.cardId];
  const real = card.name.split(' ')[0].toLowerCase();
  assert.ok(K.applyFilters(list, { q: real }, ctx).includes(target));
  const hidden = Object.assign({}, ctx, { concealed: { [card.id]: true } });
  assert.ok(!K.applyFilters([target], { q: card.name }, hidden).length, 'the real name finds nothing');
  assert.ok(K.applyFilters([target], { q: 'unfound' }, hidden).length === 1);
});

test('ownership and budget filters use the supplied context', () => {
  const data = C.market.fixtures.build(env), list = data.listings.simulation;
  const ownedId = list[0].card.cardId;
  const ctx = context(data, { owned: { [ownedId]: true }, budget: 100 });
  assert.ok(K.applyFilters(list, { ownership: 'owned' }, ctx).every((l) => l.card.cardId === ownedId));
  assert.ok(K.applyFilters(list, { ownership: 'gap' }, ctx).every((l) => l.card.cardId !== ownedId));
  assert.ok(K.applyFilters(list, { withinBudget: true }, ctx).every((l) => l.format === 'swap' || K.currentPrice(l) <= 100));
});

test('no-results recovery names a single removal that brings results back', () => {
  const data = C.market.fixtures.build(env), ctx = context(data), list = data.listings.simulation;
  const dead = { q: 'zzzzzz', formats: ['auction'], rarities: ['rare'] };
  assert.equal(K.applyFilters(list, dead, ctx).length, 0);
  const hints = K.relaxSuggestions(list, dead, ctx);
  assert.ok(hints.length >= 1);
  assert.ok(hints.every((h) => h.count > 0 && K.applyFilters(list, h.filters, ctx).length === h.count));
});

test('sorting covers every labelled sort and is stable', () => {
  const data = C.market.fixtures.build(env), ctx = context(data), list = data.listings.simulation.slice(0, 60);
  C.data.market.sorts.forEach((s) => {
    const a = K.sortListings(list, s.id, ctx).map((l) => l.id), b = K.sortListings(list.slice().reverse(), s.id, ctx).map((l) => l.id);
    assert.deepEqual(a, b, 'sort ' + s.id + ' is independent of input order');
    assert.equal(a.length, list.length);
  });
  const asc = K.sortListings(list, 'price-asc', ctx).map(K.currentPrice);
  for (let i = 1; i < asc.length; i++) assert.ok(asc[i] >= asc[i - 1]);
  const ending = K.sortListings(list.filter((l) => l.format === 'auction'), 'ending', ctx).map((l) => l.endsMin);
  for (let i = 1; i < ending.length; i++) assert.ok(ending[i] >= ending[i - 1]);
});

test('players can be ranked ahead of simulated sellers without changing the base order', () => {
  const data = C.market.fixtures.build(env), ctx = context(data);
  const mixed = data.listings.simulation.slice(0, 20).concat(data.listings.global.slice(0, 10));
  const first = K.sortListings(mixed, 'recommended', ctx, { playersFirst: true });
  const idx = first.findIndex((l) => l.seller.isBot);
  assert.ok(idx === 10 && first.slice(0, 10).every((l) => !l.seller.isBot));
});

test('pagination is cursor based and exhaustive', () => {
  const items = Array.from({ length: 53 }, (_, i) => i);
  let cursor = null, seen = [];
  for (let guard = 0; guard < 10; guard++) { const p = K.paginate(items, cursor, 24); seen = seen.concat(p.items); cursor = p.nextCursor; if (!cursor) break; }
  assert.deepEqual(seen, items);
});

test('series are deterministic, anchored on the Average Value and bounded', () => {
  const data = C.market.fixtures.build(env), card = data.cards[10];
  const a = data.seriesFor(card.id, null, '30d'), b = data.seriesFor(card.id, null, '30d');
  assert.equal(JSON.stringify(a.candles), JSON.stringify(b.candles));
  const last = a.candles[a.candles.length - 1];
  assert.ok(Math.abs(last.close - a.valuation.average) / a.valuation.average < 0.02);
  Object.keys(K.WINDOWS).forEach((w) => {
    const s = data.seriesFor(card.id, null, w);
    assert.ok(s.candles.length >= 20 && s.candles.length <= 130, w + ' candle count ' + s.candles.length);
    s.candles.forEach((c) => { assert.ok(c.high >= Math.max(c.open, c.close) - 1e-9 && c.low <= Math.min(c.open, c.close) + 1e-9 && c.low > 0); });
  });
});

test('draft validation: simple mode cannot reach custom durations', () => {
  const base = { items: [{ instanceId: 'x' }], format: 'auction', startBid: 20, preset: '24h', durationMode: 'preset', mode: 'simple' };
  assert.equal(K.validateDraft(base).ok, true);
  const custom = K.validateDraft(Object.assign({}, base, { durationMode: 'custom', customHours: 5 }));
  assert.equal(custom.ok, false);
  assert.match(custom.errors.duration, /Advanced/);
  const advanced = K.validateDraft(Object.assign({}, base, { durationMode: 'custom', customHours: 5, mode: 'advanced' }));
  assert.equal(advanced.ok, true);
  assert.equal(advanced.hours, 5);
  assert.equal(K.validateDraft(Object.assign({}, base, { durationMode: 'custom', customHours: 9999, mode: 'advanced' })).ok, false);
});

test('draft validation: buy now, reserve, buyout, swap and fee preview', () => {
  const item = [{ instanceId: 'a' }];
  const buy = K.validateDraft({ items: item, format: 'buy-now', price: 250, mode: 'simple' });
  assert.equal(buy.ok, true); assert.equal(buy.fee, 5); assert.equal(buy.net, 245);
  assert.equal(K.validateDraft({ items: item, format: 'buy-now', price: 0, mode: 'simple' }).ok, false);
  assert.equal(K.validateDraft({ items: [], format: 'buy-now', price: 10 }).disabledReason.length > 0, true);
  const reserve = K.validateDraft({ items: item, format: 'auction', startBid: 50, reserve: 30, preset: '6h', mode: 'advanced' });
  assert.equal(reserve.ok, false); assert.ok(reserve.errors.reserve);
  const buyout = K.validateDraft({ items: item, format: 'auction', startBid: 50, reserve: 70, buyout: 60, preset: '6h', mode: 'advanced' });
  assert.ok(buyout.errors.buyout);
  assert.equal(K.validateDraft({ items: item, format: 'swap', wanted: [], mode: 'simple' }).ok, false);
  assert.equal(K.validateDraft({ items: item, format: 'swap', wanted: [{ rarity: 'rare' }], mode: 'simple' }).ok, true);
  assert.equal(K.validateDraft({ items: item, format: 'swap', wanted: [{ rarity: 'rare' }], creditTopUp: 100, mode: 'advanced' }).fee, 2);
  const long = K.validateDraft({ items: item, format: 'buy-now', price: 5, title: 'x'.repeat(200) });
  assert.ok(long.errors.title);
});

test('minimum increment is the larger of 5% and one Credit', () => {
  assert.equal(K.minIncrement(10), 1);
  assert.equal(K.minIncrement(100), 5);
  assert.equal(K.minIncrement(1000), 50);
});

test('config: the tuning table is marked and no field reads the reserved market value', () => {
  const src = fs.readFileSync(path.join(root, 'src/market/core.js'), 'utf8') + fs.readFileSync(path.join(root, 'src/market/fixtures.js'), 'utf8');
  assert.equal(/marketValueUsd/.test(src), false);
  assert.equal(C.data.market.fee.bps, 200);
  assert.ok(C.data.market.auction.presets.length >= 3);
  assert.equal(C.data.market.realms.length, 2);
});

// ---- Stage 6: the ranking weighs eleven things, explains them, and never reads unverifiable activity ----
function listing(over) {
  const base = { id: 'L1', format: 'buy-now', status: 'active', ask: 100, listedMin: 30, endsMin: null, watchers: 0,
    card: { cardId: C.data.cards[0].id, variantId: null, serial: 'CBL-AAAA-000500' }, seller: { alias: 'Calm Otter', sales: 12, rating: null, isBot: false },
    valuation: { average: 140, confidence: 'high', samples: 30, liquidity: 0.8, targetSell: 150, volume7d: 9, volatility: 0.03 } };
  return Object.assign({}, base, over || {}, { valuation: Object.assign({}, base.valuation, (over && over.valuation) || {}) });
}
test('the ranking has eleven weighted factors that sum to one, and cheapest-first is not among them', () => {
  const w = K.DEFAULT_WEIGHTS, keys = Object.keys(w);
  assert.equal(keys.length, 11);
  assert.ok(Math.abs(keys.reduce((n, k) => n + w[k], 0) - 1) < 1e-9);
  assert.ok(!('price' in w) && !('cheap' in w));
  const ctx = context(C.market.fixtures.build(env), { budget: 300 });
  const cheapButThin = listing({ id: 'A', ask: 20, valuation: { average: 22, confidence: 'none', samples: 0, liquidity: 0.1, targetSell: 22 } });
  const fairAndLiquid = listing({ id: 'B', ask: 110, valuation: { average: 140 } });
  assert.ok(K.recommend(fairAndLiquid, ctx).score > K.recommend(cheapButThin, ctx).score, 'a well-supported discount beats a cheap card nobody has traded');
});
test('margin is read against what the card actually sells for, after the fee', () => {
  const ctx = context(C.market.fixtures.build(env), { budget: 500 });
  const room = K.recommend(listing({ ask: 100, valuation: { targetSell: 160 } }), ctx), none = K.recommend(listing({ ask: 100, valuation: { targetSell: 101 } }), ctx);
  assert.ok(room.components.margin > none.components.margin);
  assert.ok(room.reasons.some((r) => r.id === 'margin'));
});
test('preferences come only from the cards in the realm\'s own collection, and a missing collection is neutral', () => {
  const data = C.market.fixtures.build(env), cardsById = {};
  data.cards.forEach((c) => { cardsById[c.id] = c; });
  assert.equal(K.preferences([], cardsById), null);
  const rare = data.cards.find((c) => c.rarity === 'rare'), basic = data.cards.find((c) => c.rarity === 'basic');
  const p = K.preferences([{ cardId: rare.id, variantId: null }, { cardId: rare.id, variantId: 'matte' }, { cardId: basic.id, variantId: null }], cardsById);
  assert.equal(p.rarity.rare, 1); assert.ok(p.rarity.basic < 1); assert.equal(p.variant.normal, 1);
  const ctx = context(data, { budget: 300 });
  const neutral = K.recommend(listing({ card: { cardId: rare.id, variantId: null, serial: 'CBL-AAAA-000500' } }), ctx);
  const liked = K.recommend(listing({ card: { cardId: rare.id, variantId: null, serial: 'CBL-AAAA-000500' } }), Object.assign({}, ctx, { prefs: p }));
  assert.equal(neutral.components.pref, 0.5);
  assert.ok(liked.components.pref > 0.9);
});
test('an auction is ranked by whether your balance can follow it, and a swap by whether you hold what it accepts', () => {
  const data = C.market.fixtures.build(env), ctx = context(data, { budget: 120 });
  const auction = (ask) => listing({ format: 'auction', ask, auction: { bids: 2, current: ask }, endsMin: 600 });
  assert.ok(K.recommend(auction(40), ctx).components.fill > K.recommend(auction(115), ctx).components.fill);
  const wantedId = data.cards[3].id;
  const swap = listing({ format: 'swap', swap: { wants: { cardIds: [wantedId] } } });
  assert.equal(K.recommend(swap, Object.assign({}, ctx, { owned: {} })).components.fill, 0.2);
  assert.equal(K.recommend(swap, Object.assign({}, ctx, { owned: { [wantedId]: 1 } })).components.fill, 1);
});
