'use strict';
// Stage 3: card values, Quick Sell, Bulk Sell and the money ledger. Pure logic against the shipped modules.
//   node --test tests/market-sales.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./support/sales-harness.cjs');

const tierId = (G, tier) => G.rarities.find((r) => r.tier === tier).id;
const cardOfTier = (G, tier, n) => G.cards.filter((c) => c.rarity === tierId(G, tier) && !c.retired)[n || 0];

test('every card, finish and skin has a data-driven baseline: integers, never zero, rising with rarity', () => {
  const G = h.load(); G.newSave([]);
  const byTier = {};
  G.cards.forEach((card) => {
    const v = G.C.valuation.read({ cardId: card.id });
    assert.ok(v && Number.isInteger(v.average) && v.average >= 1, card.id);
    assert.equal(v.basis, 'baseline'); assert.equal(v.confidence, 'none'); assert.equal(v.source, 'baseline');
    const t = G.C.rarity(card.rarity).tier;
    (byTier[t] = byTier[t] || []).push(v.average);
  });
  const means = Object.keys(byTier).map(Number).sort((a, b) => a - b).map((t) => byTier[t].reduce((a, b) => a + b, 0) / byTier[t].length);
  for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], 'tier ' + i + ' is worth more than tier ' + (i - 1));
});

test('a finish or skin is worth more than the normal card, and each class is ordered', () => {
  const G = h.load(); G.newSave([]);
  const card = cardOfTier(G, 3);
  const normal = G.C.valuation.read({ cardId: card.id }).average;
  const byClass = {};
  G.C.data.variants.forEach((variant) => { byClass[variant.class] = G.C.valuation.read({ cardId: card.id, variantId: variant.id }).average; });
  Object.keys(byClass).forEach((k) => assert.ok(byClass[k] > normal, k + ' finish is worth more than Normal'));
  const order = ['Common', 'Uncommon', 'Rare', 'Epic'].filter((k) => byClass[k] != null).map((k) => byClass[k]);
  assert.ok(order.length >= 3);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1], 'finish classes rise');
  const skinned = G.C.valuation.read({ cardId: card.id, cardSkinId: 'any-skin' }).average;
  assert.ok(skinned > normal);
});

test('serial provenance is bounded: a low serial adds a bonus, nothing runs away', () => {
  const G = h.load(); G.newSave([]);
  const card = cardOfTier(G, 4);
  const plain = G.C.valuation.read({ cardId: card.id, serial: 'CBL-ABCD-000537' }).average;
  const low = G.C.valuation.read({ cardId: card.id, serial: 'CBL-ABCD-000001' }).average;
  const high = G.C.valuation.read({ cardId: card.id, serial: 'CBL-ABCD-999999' }).average;
  assert.ok(low > plain); assert.ok(low <= Math.ceil(plain * 1.4)); assert.equal(high, plain);
  // an old save with no skin or finish property at all is valued like a null finish
  const legacy = G.C.valuation.read({ cardId: card.id, variantId: undefined, cardSkinId: undefined, serial: 'CBL-ABCD-000537' }).average;
  assert.equal(legacy, plain);
});

test('Quick Sell pays a fixed share of Average Value, rounded down, never under 1, always below the market', () => {
  const G = h.load(); G.newSave([]);
  const cfg = G.C.data.market.quickSell;
  G.cards.slice(0, 40).forEach((card) => {
    const inst = G.inventoryItem(card.id);
    const q = G.C.sales.quote(inst), v = G.C.valuation.ofInstance(inst);
    assert.ok(q.quote >= cfg.minPrice);
    assert.equal(q.quote, Math.max(1, Math.floor(v.average * cfg.factor)), card.id);
    assert.ok(q.quote <= v.average, 'never above Average Value');
    if (v.average >= 4) assert.ok(q.quote < v.targetBuy, 'below what a patient buyer would pay');
  });
  // a per-rarity override is honoured
  G.C.data.market.quickSell.tierFactor = { legendary: 0.4 };
  const leg = G.inventoryItem(cardOfTier(G, 7).id);
  assert.equal(G.C.sales.quote(leg).factor, 0.4);
});

test('a thin or lopsided market cannot move a quote outside a band around the baseline', () => {
  const G = h.load(); G.newSave([]);
  const card = cardOfTier(G, 5), inst = G.inventoryItem(card.id);
  const base = G.C.valuation.ofInstance(inst).baselineExact;
  // fake an observed market at three times and at a tenth of the baseline
  const reads = [[base * 3, Math.floor(Math.floor(base * 1.5) * 0.55)], [Math.max(1, Math.round(base * 0.1)), Math.floor(Math.ceil(base * 0.4) * 0.55)]];
  reads.forEach(([avg, expected]) => {
    const real = G.C.valuation.ofInstance;
    G.C.valuation.ofInstance = () => Object.assign({}, real(inst), { average: avg });
    assert.equal(G.C.sales.quote(inst).quote, Math.max(1, expected));
    G.C.valuation.ofInstance = real;
  });
});

test('selling commits once: the copy leaves, Credits arrive once, a receipt and a ledger entry name each other', () => {
  const G = h.load(); const a = G.inventoryItem(cardOfTier(G, 2).id), b = G.inventoryItem(cardOfTier(G, 2).id);
  const save = G.newSave([a, b], { currency: 50 });
  const q = G.C.sales.quote(a).quote;
  const r = G.C.sales.sell([a.instanceId], { strict: true });
  assert.equal(r.ok, true);
  assert.equal(G.store.commits, 1, 'one durable write');
  const now = G.store.current;
  assert.equal(now.currency, 50 + q); assert.equal(r.total, q);
  assert.deepEqual(now.inventory.map((i) => i.instanceId), [b.instanceId], 'only the chosen copy left; the other copy of the same card stays');
  const log = now.wallet.log[0];
  assert.equal(log.delta, q); assert.equal(log.reason, 'quick sell'); assert.equal(log.ref, r.receipt.id); assert.equal(log.balance, now.currency); assert.equal(log.realm, 'local');
  assert.equal(now.market.sales[0].id, r.receipt.id); assert.equal(now.market.sales[0].items[0].s, a.serial);
  assert.equal(G.C.currency.audit(now).ok, true);
  assert.equal(save.currency, 50, 'the candidate, not the live object, was changed');
});

test('an interrupted save changes nothing: no Credits, no card gone, no receipt', () => {
  const G = h.load(); const a = G.inventoryItem(cardOfTier(G, 3).id);
  G.newSave([a], { currency: 10 });
  G.store.failNext = 1;
  const r = G.C.sales.sell([a.instanceId], { strict: true });
  assert.equal(r.ok, false); assert.equal(r.error, 'save-failed');
  assert.equal(G.store.current.currency, 10); assert.equal(G.store.current.inventory.length, 1);
  assert.equal(G.store.current.market.sales.length, 0); assert.equal(G.store.current.wallet.log.length, 0);
  // and the very next try works, once
  assert.equal(G.C.sales.sell([a.instanceId], { strict: true }).ok, true);
  assert.equal(G.store.current.inventory.length, 0);
});

test('the same copy cannot be sold twice and a repeated request pays nothing more', () => {
  const G = h.load(); const a = G.inventoryItem(cardOfTier(G, 1).id);
  G.newSave([a], { currency: 0 });
  const first = G.C.sales.sell([a.instanceId], { strict: true });
  const again = G.C.sales.sell([a.instanceId], { strict: true });
  assert.equal(first.ok, true); assert.equal(again.ok, false);
  assert.equal(G.store.current.currency, first.total);
  assert.equal(G.store.current.market.sales.length, 1);
});

test('a balance that would leave the safe range refuses the sale and changes nothing', () => {
  const G = h.load(); const a = G.inventoryItem(cardOfTier(G, 5).id);
  G.newSave([a], { currency: Number.MAX_SAFE_INTEGER - 1 });
  const r = G.C.sales.sell([a.instanceId], { strict: true });
  assert.equal(r.ok, false);
  assert.equal(G.store.current.inventory.length, 1); assert.equal(G.store.current.currency, Number.MAX_SAFE_INTEGER - 1);
  assert.equal(G.store.commits, 0);
});

test('protected cards are refused: favorite, locked and listed, with the reason', () => {
  const G = h.load();
  const fav = G.inventoryItem(cardOfTier(G, 2, 0).id), locked = G.inventoryItem(cardOfTier(G, 2, 1).id, { locked: true }), listed = G.inventoryItem(cardOfTier(G, 2, 2).id), free = G.inventoryItem(cardOfTier(G, 2, 3).id);
  const save = G.newSave([fav, locked, listed, free]);
  save.inventoryUi.favorites = [G.C.stacks.of(fav)];
  G.runtime.world = { locks: { [listed.instanceId]: 'Labc' }, stats: { trades: 0, you: {} }, now: 0, nonce: 1, bots: [], listings: {}, orders: {} };
  G.C.market.sim.playerHeld = G.C.market.sim.playerHeld || (() => 0);
  const strict = (inst) => G.C.sales.sell([inst.instanceId], { strict: true });
  assert.equal(strict(fav).error, 'favorite');
  assert.equal(strict(locked).error, 'locked');
  assert.equal(strict(listed).error, 'listed');
  const mixed = G.C.sales.sell([fav, locked, listed, free].map((i) => i.instanceId), { kind: 'bulk' });
  assert.equal(mixed.ok, true);
  assert.equal(mixed.count, 1); assert.equal(mixed.skipped.length, 3);
  assert.equal(Array.from(mixed.skipped.map((s) => s.reason)).sort().join(','), 'favorite,listed,locked');
  assert.equal(G.store.current.inventory.length, 3);
});

test('a changed or expired quote is refused before anything is sold', () => {
  const G = h.load(); const a = G.inventoryItem(cardOfTier(G, 4).id);
  G.newSave([a]);
  const q = G.C.sales.quote(a).quote;
  const changed = G.C.sales.sell([a.instanceId], { strict: true, expectTotal: q + 1 });
  assert.equal(changed.error, 'quote-changed'); assert.equal(G.store.current.inventory.length, 1);
  G.advance(60000);
  const expired = G.C.sales.sell([a.instanceId], { strict: true, expectTotal: q, expiresAt: 1000 + 45000 });
  assert.equal(expired.error, 'quote-expired'); assert.equal(G.store.current.currency, 0);
  assert.equal(G.C.sales.sell([a.instanceId], { strict: true, expectTotal: q }).ok, true);
});

test('undo restores the exact copies in place and takes the Credits back; spent Credits cannot be undone', () => {
  const G = h.load();
  const items = [0, 1, 2, 3].map((n) => G.inventoryItem(cardOfTier(G, 2, n).id));
  G.newSave(items.slice(), { currency: 100 });
  const r = G.C.sales.sell([items[1].instanceId, items[2].instanceId], { kind: 'bulk' });
  assert.equal(r.ok, true); assert.equal(G.store.current.inventory.length, 2);
  assert.equal(G.C.sales.canUndo(), true);
  const u = G.C.sales.undo();
  assert.equal(u.ok, true);
  assert.deepEqual(G.store.current.inventory.map((i) => i.instanceId), items.map((i) => i.instanceId), 'original order');
  assert.equal(G.store.current.currency, 100);
  assert.equal(G.store.current.market.sales[0].undone, true);
  assert.equal(G.C.currency.audit(G.store.current).ok, true);
  assert.equal(G.C.sales.undo().ok, false, 'only once');
  // spend the Credits, then undo is refused
  const r2 = G.C.sales.sell([items[0].instanceId], { strict: true });
  G.store.current.currency = 0;
  G.store.current.wallet.log.unshift({ at: 1, delta: -r2.total, reason: 'shop', balance: 0, realm: 'local' });
  assert.equal(G.C.sales.undo().ok, false);
  G.advance(20000);
  assert.equal(G.C.sales.canUndo(), false, 'the window closes');
});

test('the ledger audit finds a broken chain and ignores legacy entries without balances', () => {
  const G = h.load(); G.newSave([]);
  const save = G.store.current;
  G.C.currency.applyInto(save, 10, 'quick sell', 5, 'S-a'); G.C.currency.applyInto(save, 25, 'bulk sell', 6, 'S-b'); G.C.currency.applyInto(save, -5, 'shop', 7);
  assert.equal(G.C.currency.audit(save).ok, true);
  assert.equal(save.wallet.log.length, 3); assert.equal(save.wallet.log[0].balance, 30);
  save.wallet.log[1].balance = 999;
  assert.equal(G.C.currency.audit(save).ok, false);
  const legacy = { currency: 40, wallet: { daily: {}, log: [{ at: 1, delta: 40, reason: 'pack opening' }] } };
  assert.equal(G.C.currency.audit(legacy).ok, true, 'saves from before balances are not accused');
  assert.equal(G.C.currency.normalize(legacy.wallet).log[0].reason, 'pack opening', 'historical Credits keep their reason');
});

test('Bulk Sell keeps what it should and offers the rest in a stable order', () => {
  const G = h.load();
  const c1 = cardOfTier(G, 0, 0), c2 = cardOfTier(G, 1, 0), rare = cardOfTier(G, 3, 0), epic = cardOfTier(G, 6, 0);
  const items = [];
  for (let i = 0; i < 4; i++) items.push(G.inventoryItem(c1.id));
  for (let i = 0; i < 3; i++) items.push(G.inventoryItem(c2.id));
  items.push(G.inventoryItem(c2.id, { variantId: G.C.data.variants[0].id }), G.inventoryItem(c2.id, { variantId: G.C.data.variants[0].id }));
  for (let i = 0; i < 2; i++) items.push(G.inventoryItem(rare.id));
  for (let i = 0; i < 3; i++) items.push(G.inventoryItem(epic.id));
  const save = G.newSave(items, { currency: 0 });
  const p = G.C.sales.plan({ keep: 1, maxTier: 3 });
  // basic: 4 owned keep 1 -> 3; common: 3 keep 1 -> 2; finish stack excluded; rare: 2 keep 1 -> 1; epic above the limit
  assert.equal(p.count, 3 + 2 + 1);
  assert.equal(p.excluded.finish, 2); assert.equal(p.excluded.tier, 3);
  assert.ok(p.rows.every((r) => !r.instance.variantId));
  const prices = p.rows.map((r) => r.quote.quote);
  assert.deepEqual(prices, prices.slice().sort((a, b) => a - b), 'lowest price first');
  // the copy kept in each stack is the most valuable one (lowest serial)
  const sold = new Set(p.rows.map((r) => r.instance.instanceId));
  const basics = items.filter((i) => i.cardId === c1.id);
  assert.equal(sold.has(basics[0].instanceId), false, 'the lowest serial copy stays');
  // favorites and collection members are protected by default
  save.inventoryUi.favorites = [G.C.stacks.of(basics[0])];
  assert.equal(G.C.sales.plan({ keep: 1, maxTier: 3 }).count, 3);
  const rareCopy = items.find((i) => i.cardId === rare.id);
  save.inventoryUi.collections = [{ id: 'c1', kind: 'collection', stackKeys: [G.C.stacks.of(rareCopy)] }];
  const inColl = G.C.sales.plan({ keep: 1, maxTier: 3 });
  assert.equal(inColl.excluded.collection, 2);
  assert.equal(G.C.sales.plan({ keep: 1, maxTier: 3, keepCollections: false }).count, 3);
  // selling the plan, once
  const result = G.C.sales.sell(inColl.rows.map((r) => r.instance.instanceId), { kind: 'bulk', expectTotal: inColl.total });
  assert.equal(result.ok, true); assert.equal(G.store.current.currency, inColl.total);
  assert.equal(G.store.current.inventory.length, items.length - inColl.count);
  assert.equal(G.C.sales.plan({ keep: 1, maxTier: 3 }).count, 0, 'nothing more to offer under the same rules');
});

test('a thousand copies plan and sell inside one commit and stay fast', () => {
  const G = h.load();
  const items = [];
  for (let i = 0; i < 1200; i++) items.push(G.inventoryItem(cardOfTier(G, i % 3, i % 5).id));
  G.newSave(items, { currency: 0 });
  const t0 = Date.now();
  const p = G.C.sales.plan({ keep: 0, maxTier: 3 });
  const t1 = Date.now();
  assert.equal(p.count, 1200);
  const ids = p.rows.slice(0, G.C.data.market.bulkSell.maxPerSale).map((r) => r.instance.instanceId);
  const r = G.C.sales.sell(ids, { kind: 'bulk', expectTotal: ids.reduce((n, id) => n + p.rows.find((x) => x.instance.instanceId === id).quote.quote, 0) });
  assert.equal(r.ok, true); assert.equal(r.count, 500);
  assert.equal(G.store.current.inventory.length, 700);
  assert.equal(G.store.commits, 1);
  assert.ok(t1 - t0 < 1500, 'planning 1200 copies took ' + (t1 - t0) + ' ms');
  assert.equal(G.store.current.market.sales[0].items.length, G.C.data.market.quickSell.receiptItemsKept);
  assert.equal(G.store.current.market.sales[0].more, 500 - G.C.data.market.quickSell.receiptItemsKept);
  assert.equal(G.C.sales.sell(ids, { kind: 'bulk' }).ok, false, 'a repeat finds nothing to sell');
});

test('Quick Sell is not a trade: it never enters the simulation world, volume or Average Value', () => {
  const G = h.load();
  const world = G.S.create({ seed: 'qs', nonce: 1, wall: 1700000000000 }, G.env);
  G.runtime.world = world;
  const inst = G.inventoryItem(cardOfTier(G, 3).id);
  G.newSave([inst]);
  const before = { trades: world.trades.length, stats: JSON.stringify(world.stats), obs: JSON.stringify(world.obs) };
  const r = G.C.sales.sell([inst.instanceId], { strict: true });
  assert.equal(r.ok, true);
  assert.equal(world.trades.length, before.trades); assert.equal(JSON.stringify(world.stats), before.stats); assert.equal(JSON.stringify(world.obs), before.obs);
});

test('the market fee: 2% half-up, at least 1, removed exactly once and the net is an integer', () => {
  const G = h.load();
  const fee = (p) => G.C.market.core.feeFor(p, G.C.data.market.fee);
  const table = { 1: 1, 24: 1, 25: 1, 49: 1, 50: 1, 74: 1, 75: 2, 124: 2, 125: 3, 1000: 20, 1249: 25, 1250: 25, 1251: 25, 99999: 2000 };
  Object.keys(table).forEach((price) => assert.equal(fee(Number(price)), table[price], 'fee on ' + price));
  for (let p = 1; p < 5000; p += 7) { const f = fee(p); assert.ok(Number.isInteger(f) && f >= 1 && f <= p, 'fee bounds ' + p); assert.ok(Number.isInteger(p - f)); }
  // a completed simulated sale removes the fee from the world once and pays the player the net
  const world = G.S.create({ seed: 'fee', nonce: 1, wall: 1700000000000 }, G.env);
  G.runtime.world = world;
  const inst = G.inventoryItem(cardOfTier(G, 3).id);
  const host = { balance: () => 0, instance: () => inst, hasReceipt: () => false, settle: () => true };
  G.newSave([inst]);
  const res = G.S.player.list(world, G.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 125, durationMs: 86400000 });
  const burnt = world.stats.burnt;
  G.S.completeSale(world, G.env, host, world.listings[res.listing.id], { buyer: 'b05', price: 125, kind: 'fixed' });
  assert.equal(world.stats.burnt - burnt, 3);
  const tr = world.trades[world.trades.length - 1];
  assert.equal(tr.fee, 3); assert.equal(tr.price - tr.fee, 122);
});

test('opening a pack no longer pays, and an old save keeps the Credits it already earned', () => {
  const G = h.load();
  assert.equal(G.C.config.currency.packOpenReward, 0);
  const save = { currency: 600, wallet: { daily: {}, log: [{ at: 1, delta: 200, reason: 'pack opening' }, { at: 2, delta: 200, reason: 'pack opening' }, { at: 3, delta: 200, reason: 'pack opening' }] } };
  const normalized = G.C.currency.normalize(save.wallet);
  assert.equal(normalized.log.length, 3, 'history is kept');
  assert.equal(save.currency, 600, 'nothing is clawed back');
  assert.equal(G.C.currency.audit(save).ok, true);
});
