'use strict';
// Local Market 2.0: the news, fire sales and market makers in the Simulation, and the coach that reads them. Every suggestion
// must be real (a listing that exists, a price that is the listing's price, a gain that is computed after the fee), the news
// must move what bots pay without breaking the conservation of cards and Credits, and the coach must be deterministic.
//   node --test tests/market-advisor.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./support/sim-harness.cjs');

const HOUR = 3600000, DAY = 86400000;

function game(seed, options) {
  options = options || {};
  const C = h.load(), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: options.balance == null ? 800 : options.balance, inventory: [] });
  const run = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  run(5 * DAY); world.epoch = world.now;
  const pool = env.cards.filter((c) => (env.tierOf[c.id] || 0) <= 4);
  for (let i = 0; i < (options.cards == null ? 10 : options.cards); i++) host.state.inventory.push(h.playerCard(C, env, pool[(i * 7 + seed) % pool.length].id, { instanceId: 'pc' + i, serial: 'CBL-TEST-' + String(100 + i * 37).padStart(6, '0') }));
  const player = (extra) => Object.assign({ inventory: host.state.inventory.filter((i) => !world.locks[i.instanceId]), available: host.state.balance - S.playerHeld(world), balance: host.state.balance }, extra || {});
  return { C, S, env, world, host, run, player };
}
const netOf = (S, price) => price - S.fee(price);

test('the news is real: scoped to cards that exist, in range, announced before it acts, and fading afterwards', () => {
  const g = game(11), cfg = g.C.data.marketSim.events;
  g.run(g.world.now + 3 * DAY);
  const all = g.world.events;
  assert.ok(all.length >= 1, 'three simulated days produce news');
  all.forEach((e) => {
    assert.ok(e.start > e.announced && e.end > e.start, 'announced first, then it acts');
    assert.ok(g.S.scopeCards(g.env, e.scope).length >= 1, 'it names cards');
    const lo = Math.min(...cfg.kinds.map((k) => Math.min(...k.mag))), hi = Math.max(...cfg.kinds.map((k) => Math.max(...k.mag)));
    assert.ok(e.mag >= lo - 1e-9 && e.mag <= hi + 1e-9, 'the size is within the configured range');
  });
  const e = all[0], card = g.S.scopeCards(g.env, e.scope)[0], item = { c: card.id, v: null, k: null };
  g.world.now = e.announced; assert.equal(g.S.eventFactor(g.world, g.env, item, null), g.S.eventFactor(g.world, g.env, item, null));
  g.world.now = e.start - 1; const before = g.S.eventFactor(g.world, g.env, item, null);
  g.world.now = e.start + cfg.rampHours * HOUR; const during = g.S.eventFactor(g.world, g.env, item, null);
  g.world.now = e.end + (cfg.afterHours + 1) * HOUR; const after = g.S.eventFactor(g.world, g.env, item, null);
  const others = all.filter((x) => x !== e && g.S.inScope(x.scope, card, g.env.tierOf[card.id] || 0)).length;
  if (!others) {
    assert.equal(before, 1, 'nothing before it starts'); assert.ok(e.mag > 0 ? during > 1 : during < 1, 'it moves the price the way it says'); assert.equal(after, 1, 'and it is gone afterwards');
  }
});

test('a card outside the news is untouched, and each personality reacts in its own measure', () => {
  const g = game(12);
  g.run(g.world.now + 2 * DAY);
  const e = { id: 'N-test', kind: 'hype', scope: { brand: g.env.brands[0] }, label: 'x', mag: 0.3, announced: g.world.now, start: g.world.now, end: g.world.now + 10 * HOUR };
  g.world.events = [e]; g.world.now += 3 * HOUR;
  const inside = g.env.cards.find((c) => c.brand === g.env.brands[0]), outside = g.env.cards.find((c) => c.brand !== g.env.brands[0]);
  assert.equal(g.S.eventFactor(g.world, g.env, { c: outside.id }, null), 1);
  const bots = {}; g.world.bots.forEach((b) => { bots[b.persona] = bots[b.persona] || b; });
  const hype = g.S.eventFactor(g.world, g.env, { c: inside.id }, bots.hype), cautious = g.S.eventFactor(g.world, g.env, { c: inside.id }, bots.cautious);
  assert.ok(hype > cautious && cautious > 1, 'the hype follower reacts more than the cautious buyer, and both react');
});

test('fire sales are listings far under Average Value, capped per day, and nobody sells below zero', () => {
  const g = game(13), fs = g.C.data.marketSim.fireSale;
  const perDay = {}, sample = [];
  for (let d = 0; d < 4; d++) {
    g.run(g.world.now + DAY);
    Object.values(g.world.listings).forEach((l) => { if (l.fire && !sample.includes(l.id)) { sample.push(l.id); const day = Math.floor(l.createdAt / DAY); perDay[day] = (perDay[day] || 0) + 1; assert.ok(l.fairAt >= 1 && l.ask <= Math.round(l.fairAt * (1 - fs.discount[0] + 0.05)) + 1, 'a fire sale is clearly under the usual price at the time: ' + l.ask + ' vs ' + l.fairAt); assert.equal(l.kind, 'fixed'); } });
  }
  assert.ok(sample.length >= 1, 'four days produce at least one fire sale');
  Object.keys(perDay).forEach((d) => assert.ok(perDay[d] <= fs.perDay, 'at most ' + fs.perDay + ' a day'));
  assert.equal(g.S.audit(g.world, g.host.state.inventory.map((i) => i.instanceId)).problems.length, 0);
  g.world.bots.forEach((b) => assert.ok(b.credits >= 0));
});

test('every suggestion is real: a listing that exists, its own price, a gain computed after the fee', () => {
  const g = game(14, { balance: 2000 });
  let seen = 0;
  for (let step = 0; step < 36; step++) {
    g.run(g.world.now + 2 * HOUR);
    g.S.advisor.moves(g.world, g.env, g.player()).forEach((m) => {
      seen++;
      assert.ok(m.gain > 0 && m.ratio > 0, 'worth doing');
      if (m.type === 'buy') {
        const l = g.world.listings[m.listingId];
        assert.ok(l && l.status === 'open' && l.kind === 'fixed' && l.seller !== 'you', 'an open fixed listing of someone else');
        assert.equal(m.cost, l.ask, 'the price is the listing\'s price');
        assert.equal(m.gain, netOf(g.S, m.resell) - m.cost, 'gain is what the resale keeps after the fee, minus the cost');
        assert.ok(m.cost <= g.host.state.balance);
      } else if (m.type === 'bid') {
        const l = g.world.listings[m.listingId];
        assert.ok(l && l.kind === 'auction' && l.status === 'open');
        assert.ok(m.expiresMin <= g.C.data.marketSim.coach.snipeHours * 60 + 1, 'only auctions about to close');
        assert.ok(m.max >= m.cost, 'the maximum covers the likely price');
      } else if (m.type === 'sell') {
        assert.ok(g.host.state.inventory.some((i) => i.instanceId === m.itemId), 'a card you own');
        assert.ok(!g.world.locks[m.itemId], 'not already listed');
        assert.equal(m.gain, netOf(g.S, m.price) - m.quick, 'gain is over Quick Sell, after the fee');
      } else assert.equal(m.type, 'order');
    });
  }
  assert.ok(seen > 20, 'a day and a half produce plenty of suggestions, saw ' + seen);
});

test('favorites and locked cards are never suggested for sale, and a plan outranks everything', () => {
  const g = game(15);
  g.run(g.world.now + DAY);
  const kept = g.host.state.inventory[0], planned = g.host.state.inventory[1];
  const protectedIds = {}; protectedIds[kept.instanceId] = true;
  g.S.advisor.plan(g.world, planned.instanceId, 77);
  const moves = g.S.advisor.moves(g.world, g.env, g.player({ protectedIds }));
  assert.ok(!moves.some((m) => m.itemId === kept.instanceId), 'a protected card is left alone');
  assert.equal(moves[0].itemId, planned.instanceId, 'the card you bought to resell comes first');
  assert.equal(moves[0].price, 77); assert.equal(moves[0].tag, 'Your plan');
});

test('the coach is deterministic: the same world gives the same advice, and asking changes nothing', () => {
  const a = game(16), b = game(16);
  a.run(a.world.now + 2 * DAY); b.run(b.world.now + 2 * DAY);
  const ma = JSON.stringify(a.S.advisor.moves(a.world, a.env, a.player()).map((m) => [m.type, m.cardId, m.cost, m.gain]));
  const mb = JSON.stringify(b.S.advisor.moves(b.world, b.env, b.player()).map((m) => [m.type, m.cardId, m.cost, m.gain]));
  assert.equal(ma, mb);
  const before = JSON.stringify(a.world);
  a.S.advisor.moves(a.world, a.env, a.player()); a.S.advisor.pulse(a.world, a.env, a.player()); a.S.advisor.progress(a.world, 1000);
  assert.equal(JSON.stringify(a.world), before, 'reading advice does not touch the world');
});

test('progress: levels follow realized profit and trades, goals tick once, and a sale records profit against cost', () => {
  const g = game(17, { balance: 1500 });
  g.run(g.world.now + DAY);
  assert.equal(g.S.advisor.progress(g.world, 1000).level.name, 'Newcomer');
  const l = Object.values(g.world.listings).find((x) => x.status === 'open' && x.kind === 'fixed' && x.seller !== 'you' && x.ask < 400 && x.items.length === 1);
  const res = g.S.player.buy(g.world, g.env, g.host, l.id);
  assert.ok(res.ok, 'bought');
  const bought = g.host.state.inventory.find((i) => i.instanceId === l.items[0].i), cost = l.ask;
  assert.equal(g.world.basis[bought.instanceId], cost, 'cost basis is what was paid');
  assert.equal(g.S.advisor.progress(g.world, 1000).quests.find((q) => q.id === 'buy').done, true);
  // sell it to a bot at a known price: the profit is the price less the fee less the cost
  const price = cost + 40, made = g.S.player.list(g.world, g.env, g.host, { kind: 'fixed', instanceIds: [bought.instanceId], ask: price, durationMs: 2 * DAY });
  assert.ok(made.ok);
  const listing = g.world.listings[made.listing.id];
  if (listing.status === 'open') g.S.completeSale(g.world, g.env, g.host, listing, { buyer: g.world.bots[0].id, price, kind: 'fixed' });
  const you = g.world.stats.you;
  assert.equal(Math.round(you.realized), Math.round(netOf(g.S, price) - cost), 'realized profit = net of the fee minus cost');
  assert.equal(you.realizedN, 1);
  const p = g.S.advisor.progress(g.world, 1000);
  assert.equal(p.quests.find((q) => q.id === 'sell').done, true);
  assert.equal(p.quests.find((q) => q.id === 'profit').done, price - g.S.fee(price) - cost > 0);
  assert.ok(p.xp >= 2 && p.trades === 2);
});

test('net worth history: a point at most every few simulated hours, a fixed starting point, bounded length', () => {
  const g = game(18), keep = g.C.data.marketSim.coach.historyKeep;
  const nw0 = g.S.advisor.sample(g.world, g.env, { inventory: g.host.state.inventory, balance: g.host.state.balance });
  assert.equal(g.world.coach.nw0, nw0);
  g.S.advisor.sample(g.world, g.env, { inventory: g.host.state.inventory, balance: g.host.state.balance });
  assert.equal(g.world.coach.hist.length, 1, 'asking twice at once adds no point');
  for (let i = 0; i < keep + 30; i++) { g.run(g.world.now + 3 * HOUR); if (g.S.advisor.due(g.world)) g.S.advisor.sample(g.world, g.env, { inventory: g.host.state.inventory, balance: g.host.state.balance }); }
  assert.ok(g.world.coach.hist.length <= keep, 'bounded');
  assert.equal(g.world.coach.nw0, nw0, 'the starting point never moves');
});

test('assess: a listing far under Average Value is "a good price" and says what a resale keeps; a dear one says so', () => {
  const g = game(19, { balance: 5000 });
  g.run(g.world.now + DAY);
  const l = Object.values(g.world.listings).find((x) => x.status === 'open' && x.kind === 'fixed' && x.seller !== 'you' && x.items.length === 1 && x.ask > 20);
  const fair = g.S.advisor.fairOf(g.world, g.env, l.items[0]);
  l.ask = Math.max(1, Math.round(fair * 0.7));
  const cheap = g.S.advisor.assess(g.world, g.env, l, 5000);
  assert.equal(cheap.verdict, 'good'); assert.ok(cheap.lines.some((t) => /2% fee/.test(t)), 'it states the fee'); assert.ok(cheap.gain > 0);
  l.ask = Math.round(fair * 1.4);
  const dear = g.S.advisor.assess(g.world, g.env, l, 10);
  assert.equal(dear.verdict, 'pricey'); assert.ok(dear.lines.some((t) => /short of the likely price/.test(t)), 'it says when you cannot afford it');
});

test('conservation holds with news, fire sales and market makers over twenty days: no card in two places, no negative Credits', () => {
  const g = game(20, { balance: 1000 });
  for (let d = 0; d < 20; d++) {
    g.run(g.world.now + DAY);
    const m = g.S.advisor.moves(g.world, g.env, g.player())[0];
    if (m && m.type === 'buy') g.S.player.buy(g.world, g.env, g.host, m.listingId);
    if (m && m.type === 'sell') g.S.player.list(g.world, g.env, g.host, { kind: 'fixed', instanceIds: [m.itemId], ask: m.price, durationMs: 3 * DAY });
  }
  const a = g.S.audit(g.world, g.host.state.inventory.map((i) => i.instanceId));
  assert.equal(JSON.stringify(a.problems), '[]');
  g.world.bots.forEach((b) => assert.ok(b.credits >= 0 && g.S.botHeld(b) <= b.credits + 1e-6));
  const wrapped = g.S.deserialize(g.S.serialize(g.world), g.env);
  assert.equal(wrapped.events.length, g.world.events.length, 'news survives saving and loading');
  assert.equal(JSON.stringify(wrapped.coach.done), JSON.stringify(g.world.coach.done));
});

test('a world saved before news existed still gets news after loading', () => {
  const g = game(21);
  g.world.queue = g.world.queue.filter((e) => e.type !== 'news');
  delete g.world.events; delete g.world.coach; delete g.world.fireToday;
  const loaded = g.S.deserialize(g.S.serialize(g.world), g.env);
  assert.ok(loaded.queue.some((e) => e.type === 'news'), 'a piece of news is scheduled');
  assert.ok(Array.isArray(loaded.events) && loaded.coach && loaded.coach.done && loaded.fireToday, 'the new fields have defaults');
  g.S.advance(loaded, g.env, g.host, loaded.now + 3 * HOUR, 5000);
  assert.ok(loaded.events.length >= 1, 'and it happens');
});
