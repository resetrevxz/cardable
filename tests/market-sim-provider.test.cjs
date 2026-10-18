'use strict';
// Stage 2: the Simulation provider, i.e. what the Market interface reads. Valuation, charts and listings are
// derived only from executed trades and open orders; where there is no data the fields are null, not invented.
//   node --test tests/market-sim-provider.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./support/sim-harness.cjs');

const DAY = 86400000, HOUR = 3600000;

function setup(bots) {
  const C = h.load(['src/market/api.js', 'src/market/sim/provider.js']);
  const S = C.market.sim;
  if (bots) C.data.marketSim.world.bots = bots;
  const env = h.makeEnv(C);
  const host = h.mockHost({ balance: 2000, inventory: [] });
  const world = S.create({ seed: 'provider', nonce: 1, wall: 1700000000000 }, env);
  C.state = { current: { inventory: host.state.inventory, currency: 2000, inventoryUi: { collections: [] } } };
  C.market.store = { watching: () => ({}), session: {}, isWatching: () => false };
  const runtime = { world, env, host, revision: 1, paused: false, speedId: 'standard', state: 'running', reason: '', error: null,
    factor: () => 60, peek: () => ({ state: 'running', reason: '' }), heldCredits: () => S.playerHeld(world) };
  C.marketSim = { ensure: () => runtime, runtime };
  return { C, S, env, host, world, runtime, api: C.market.sim.provider };
}
function run(S, world, env, host, to) { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); }

test('an untraded card is valued from its baseline with no sales, no confidence and no change', () => {
  const x = setup(14);
  const card = x.env.cards.find((c) => !x.world.obs[x.S.keyOf(c.id, null, null)]);
  const v = x.api.valuation('simulation', { cardId: card.id });
  assert.equal(v.basis, 'baseline');
  assert.equal(v.samples, 0); assert.equal(v.confidence, 'none');
  assert.equal(v.lastSale, null); assert.equal(v.change24h, null); assert.equal(v.change7d, null); assert.equal(v.volatility, null);
  assert.equal(v.askReal, false); assert.equal(v.bidReal, false);
  assert.ok(v.average >= 1 && v.targetBuy <= v.average && v.targetSell >= v.average);
});

test('a card that traded is valued from those trades, and its figures come from executed sales only', () => {
  const x = setup(20);
  run(x.S, x.world, x.env, x.host, 8 * DAY);
  const key = Object.keys(x.world.obs).sort((a, b) => x.world.obs[b].length - x.world.obs[a].length)[0];
  const [cardId, variantId] = key.split('|');
  const trades = x.world.trades.filter((t) => x.S.keyOf(t.c, t.v, t.k) === key);
  const v = x.api.valuation('simulation', { cardId, variantId: variantId || null });
  assert.ok(trades.length > 0 && v.samples > 0, 'observed trades back the value');
  assert.equal(v.lastSale, trades[trades.length - 1].price, 'the last sale is the last executed trade');
  assert.ok(v.basis === 'sales');
  const last7 = trades.filter((t) => t.t > x.world.now - 7 * DAY).length;
  assert.equal(v.volume7d, last7);
  assert.equal(v.credits24h, trades.filter((t) => t.t > x.world.now - DAY).reduce((n, t) => n + t.price, 0));
});

test('charts place trades by time: nothing without trades, then only buckets where a trade happened', () => {
  const x = setup(18);
  const none = x.api.stocks('simulation', { scope: 'index', window: '24h' });
  assert.equal(none.candles.length, 0, 'no trades, no candles');
  assert.equal(none.closes.length, 0);
  run(x.S, x.world, x.env, x.host, 6 * DAY);
  const res = x.api.stocks('simulation', { scope: 'index', window: '7d' });
  assert.ok(res.candles.length > 3);
  let prev = -Infinity;
  res.candles.forEach((c) => {
    assert.ok(c.at > prev, 'ordered in time'); prev = c.at;
    assert.ok(c.at <= x.world.now + 6 * HOUR && c.at >= x.world.now - 8 * DAY, 'inside the window');
    assert.ok(c.high >= c.low && c.volume >= 1);
  });
  const total = res.candles.reduce((n, c) => n + c.volume, 0);
  assert.equal(total, x.world.trades.filter((t) => t.t >= x.world.now - 7 * DAY).length, 'every trade in the window is in exactly one bucket');
  const sparse = x.api.stocks('simulation', { scope: 'card', id: x.env.cards[0].id, window: '24h' });
  assert.ok(sparse.candles.length <= 24, 'a quiet card has a few points, never one per hour');
});

test('listing views carry the exact card, a price, a countdown and honest seller facts', () => {
  const x = setup(24);
  run(x.S, x.world, x.env, x.host, 2 * DAY);
  const res = x.api.listings('simulation', { filters: x.C.market.core.emptyFilters(), limit: 400, facets: false });
  assert.ok(res.items.length > 8);
  const kinds = new Set();
  res.items.forEach((e) => {
    const l = e.listing; kinds.add(l.format);
    assert.ok(l.card.serial && l.card.cardId && l.items.length >= 1);
    assert.ok(Number.isFinite(l.ask) && l.ask >= 0);
    assert.ok(l.valuation.average >= 1 && !Number.isNaN(l.valuation.targetBuy));
    assert.ok(l.seller.alias && l.seller.isBot);
    if (l.format === 'auction') assert.ok(l.endsAt > x.world.now && l.auction.minNext >= l.auction.start);
    if (l.format === 'buy-now') assert.equal(l.ask, x.world.listings[l.id].ask);
  });
  assert.ok(kinds.has('buy-now') && kinds.has('auction'));
});

test('the player\'s portfolio reports cost basis only for cards bought here', () => {
  const x = setup(14);
  const card = x.env.cards.find((c) => x.env.tierOf[c.id] === 3).id;
  const bought = h.playerCard(x.C, x.env, card), pack = h.playerCard(x.C, x.env, card);
  x.host.state.inventory.push(bought, pack);
  x.world.basis[bought.instanceId] = 40;
  const p = x.api.portfolio('simulation');
  assert.equal(p.holdings.length, 2);
  assert.equal(p.unrealizedCount, 1);
  const est = p.holdings.find((hd) => hd.instance.instanceId === bought.instanceId).estimate;
  assert.equal(p.unrealized, est - 40);
  assert.equal(p.holdings.find((hd) => hd.instance.instanceId === pack.instanceId).basis, null, 'a pack pull has no cost basis');
  assert.equal(p.realized, null, 'nothing realized until a sale of a bought card');
});

test('a player listing appears with the right view, is locked, and a sale writes one trade and one fee', () => {
  const x = setup(14);
  const card = x.env.cards.find((c) => x.env.tierOf[c.id] === 3).id;
  const inst = h.playerCard(x.C, x.env, card);
  x.host.state.inventory.push(inst);
  const res = x.S.player.list(x.world, x.env, x.host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 200, durationMs: 3 * DAY });
  assert.equal(res.ok, true);
  const view = x.api.listing('simulation', res.listing.id).listing;
  assert.equal(view.isMine, true); assert.equal(view.seller.alias, 'You'); assert.equal(view.format, 'buy-now');
  assert.equal(x.world.locks[inst.instanceId], res.listing.id);
  x.S.completeSale(x.world, x.env, x.host, x.world.listings[res.listing.id], { buyer: 'b05', price: 200, kind: 'fixed' });
  const closed = x.api.listing('simulation', res.listing.id).listing;
  assert.equal(closed.status, 'sold'); assert.equal(closed.soldFor, 200);
  const sold = x.world.trades.filter((t) => t.seller === 'you');
  assert.equal(sold.length, 1); assert.equal(sold[0].fee, x.S.fee(200));
  assert.equal(x.host.state.balance, 2000 + 200 - x.S.fee(200));
});

test('changes over 24 h and 7 d are measured on executed trades and are null without enough of them', () => {
  const x = setup(14);
  const card = x.env.cards.find((c) => x.env.tierOf[c.id] === 3).id, key = x.S.keyOf(card, null, null);
  const trade = (t, price) => ({ id: 'T' + t, c: card, v: null, k: null, s: 'CBL-X-000001', price: price, fee: 1, t: t, seller: 'b01', buyer: 'b02', kind: 'fixed', f: price, bw: '', sw: '' });
  x.world.now = 10 * DAY;
  x.world.trades.length = 0;
  assert.equal(x.api.valuation('simulation', { cardId: card }).change24h, null, 'no trades, no change');
  x.world.trades.push(trade(10 * DAY - 2 * HOUR, 120));
  assert.equal(x.api.valuation('simulation', { cardId: card }).change24h, null, 'one trade is not a change');
  x.world.trades.unshift(trade(8.5 * DAY, 100));
  x.world._idx = null;
  const v = x.api.valuation('simulation', { cardId: card });
  assert.equal(v.change7d, null, 'the reference trade must sit near the start of the window, not be 1.5 days old and still pass for a week');
  x.world.trades.length = 0;
  x.world.trades.push(trade(10 * DAY - 7.2 * DAY, 100), trade(10 * DAY - 30 * HOUR, 105), trade(10 * DAY - 6 * HOUR, 110), trade(10 * DAY - 1 * HOUR, 120));
  x.world._idx = null;
  const w = x.api.valuation('simulation', { cardId: card });
  assert.equal(w.change7d, 0.2, 'a 100 sale a week ago and a 120 sale now is +20%');
  assert.ok(Math.abs(w.change24h - (120 / 105 - 1)) < 1e-9, '24 h is measured against the last trade on or before the start of the window');
  // volume counts executed trades only, by window
  assert.equal(w.volume24h, 2); assert.equal(w.volume7d, 3);
  assert.equal(w.credits24h, 230);
  // a window whose reference is far older than the window itself is not a change
  x.world.trades.length = 0;
  x.world.trades.push(trade(10 * DAY - 7.2 * DAY, 100), trade(10 * DAY - 1 * HOUR, 120));
  x.world._idx = null;
  assert.equal(x.api.valuation('simulation', { cardId: card }).change24h, null, 'no reference near the start of the 24 h window');
  void key;
});

test('longer changes come from the daily aggregates and need a day that old', () => {
  const x = setup(14);
  const card = x.env.cards.find((c) => x.env.tierOf[c.id] === 3).id, key = x.S.keyOf(card, null, null);
  x.world.now = 100 * DAY;
  x.world.daily[key] = {};
  assert.equal(x.api.valuation('simulation', { cardId: card }).change30d, null);
  x.world.daily[key][20] = [80, 85, 78, 82, 2, 164];
  x.world.daily[key][68] = [90, 95, 88, 92, 3, 276];
  x.world.daily[key][99] = [100, 110, 98, 104, 4, 416];
  const v = x.api.valuation('simulation', { cardId: card });
  assert.ok(Math.abs(v.change30d - (104 / 92 - 1)) < 1e-9, '30 d against the close on or before day 70');
  assert.equal(v.change90d, null, 'no day as old as 90 d, so no 90 d change');
  assert.ok(Math.abs(v.changeAll - (104 / 80 - 1)) < 1e-9, 'all time against the first open');
});

test('the notch reader: big sales are other traders\' sales that were high for their time, movers are cards you hold, matches are what you look for', () => {
  const x = setup(24);
  run(x.S, x.world, x.env, x.host, 9 * DAY);
  const pool = x.env.cards.filter((c) => (x.env.tierOf[c.id] || 0) <= 3);
  for (let i = 0; i < 6; i++) x.host.state.inventory.push({ instanceId: 'n' + i, packId: 'standard', cardSkinId: null, cardId: pool[i * 3].id, variantId: null, serial: 'CBL-TEST-00000' + i, pulledAt: 1, seen: true });
  const wanted = Object.values(x.world.listings).find((l) => l.status === 'open' && l.seller !== 'you' && l.items.length === 1 && l.kind === 'fixed');
  x.C.state.current.inventoryUi.collections = [{ kind: 'wishlist', cardIds: [wanted.items[0].c] }];
  const n = x.api.notch([], []);
  const win = (cfgHours) => x.world.now - cfgHours * HOUR;
  n.sales.forEach((t) => {
    assert.ok(!t.you, 'your own sales are in your notices, not in the big sales');
    assert.ok(t.minutesAgo * 60000 <= 12 * HOUR + 1, 'inside the window: ' + t.minutesAgo);
    assert.ok(t.tier >= 7 || t.price > 0, 'high for their time or Legendary and above');
  });
  assert.ok(n.sales.length <= 4 && n.sales.every((t, i, a) => i === 0 || a[i - 1].price >= t.price), 'at most four, dearest first');
  n.movers.forEach((m) => { assert.ok(x.host.state.inventory.some((i) => i.cardId === m.cardId), 'a card you hold'); assert.ok(m.change24h != null, 'with a change to report'); assert.ok(m.owned >= 1); });
  assert.ok(n.matches.some((m) => m.kind === 'wishlist' && m.listing.card.cardId === wanted.items[0].c), 'a wishlist card that is on sale matches');
  n.rare.forEach((l) => { assert.ok((x.env.tierOf[l.card.cardId] || 0) >= 7, 'Legendary or better'); assert.ok(l.createdSim >= win(3), 'listed in the last three hours'); assert.ok(!l.isMine); });
  assert.equal(JSON.stringify(x.api.notch([], [])), JSON.stringify(n), 'reading twice changes nothing');
});
