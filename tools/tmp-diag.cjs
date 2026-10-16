const h = require('../tests/support/sim-harness.cjs');
for (const seed of [1, 2, 3]) {
  const C = h.load(['src/market/sim/advisor.js']), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: 320, inventory: [] });
  const step = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  step(S.DAY * 5); world.epoch = world.now;
  const pool = env.cards.filter((c) => (env.tierOf[c.id] || 0) <= 4);
  for (let i = 0; i < 14; i++) host.state.inventory.push(h.playerCard(C, env, pool[(i * 7 + seed) % pool.length].id, {}));
  const t0 = world.now, mv = [], fires = [];
  const trStart = world.trades.length;
  for (let hr = 1; hr <= 72; hr++) {
    step(t0 + hr * S.HOUR);
    const m = S.advisor.moves(world, env, { inventory: host.state.inventory, available: host.state.balance, balance: host.state.balance });
    mv.push(m.length);
    Object.values(world.listings).forEach((l) => { if (l.fire && l.status === 'open' && l.createdAt > t0 + (hr - 1) * S.HOUR) fires.push(l.id); });
  }
  const ev = world.events.map((e) => e.kind + ':' + e.label + ' ' + e.mag + ' ' + Math.round((e.start - e.announced) / 3600000) + 'h+' + Math.round((e.end - e.start) / 3600000) + 'h');
  const trades = world.trades.slice(trStart);
  const ratio = (list) => list.length ? (list.reduce((n, t) => n + t.price / t.f, 0) / list.length).toFixed(3) : 'n/a';
  const inScope = trades.filter((t) => world.events.some((e) => S.inScope(e.scope, env.cardById[t.c], env.tierOf[t.c] || 0) && t.t >= e.start && t.t <= e.end + 3600000 * 8));
  console.log('seed', seed, 'events', ev.join(' | '));
  console.log('  moves per hour', mv.join(','), ' fires', fires.length, ' trades', trades.length, ' price/fair all', ratio(trades), ' in news', inScope.length, ratio(inScope));
}
