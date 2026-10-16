const h = require('../tests/support/sim-harness.cjs');
const agg = { buy: new Map(), bid: new Map(), sell: new Map() };
for (const seed of [1, 2, 3, 4]) {
  const C = h.load(['src/market/sim/advisor.js']), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: 320, inventory: [] });
  const step = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  step(S.DAY * 5); world.epoch = world.now;
  const pool = env.cards.filter((c) => (env.tierOf[c.id] || 0) <= 4);
  for (let i = 0; i < 14; i++) host.state.inventory.push(h.playerCard(C, env, pool[(i * 7 + seed) % pool.length].id, {}));
  const t0 = world.now;
  for (let hr = 1; hr <= 72; hr++) {
    step(t0 + hr * S.HOUR);
    const m = S.advisor.moves(world, env, { inventory: host.state.inventory, available: 100000, balance: host.state.balance });
    m.forEach((x) => { const key = seed + ':' + (x.listingId || x.itemId); if (!agg[x.type].has(key)) agg[x.type].set(key, { gain: x.gain, cost: x.cost, tag: x.tag, quick: x.quick }); });
  }
}
for (const t of ['buy', 'bid', 'sell']) {
  const v = [...agg[t].values()]; const tags = {}; v.forEach((x) => { tags[x.tag] = (tags[x.tag] || 0) + 1; });
  console.log(t, 'distinct over 4 seeds x 3 days:', v.length, 'avg gain', (v.reduce((n, x) => n + x.gain, 0) / Math.max(1, v.length)).toFixed(1), 'avg cost', (v.reduce((n, x) => n + x.cost, 0) / Math.max(1, v.length)).toFixed(1), JSON.stringify(tags));
}
