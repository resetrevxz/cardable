// For each coach purchase: what it cost, what the coach expected, what it actually sold for, how long it took.
const h = require('../tests/support/sim-harness.cjs');
const byTag = {};
for (const seed of [1, 2, 3, 4, 5, 6]) {
  const C = h.load(['src/market/sim/advisor.js']), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: 600, inventory: [] });
  const step = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  step(S.DAY * 5); world.epoch = world.now;
  const meta = {}; // instanceId -> {tag, cost, expect, fair, t}
  const t0 = world.now;
  for (let hr = 1; hr <= 24 * 6; hr++) {
    step(t0 + hr * S.HOUR);
    // list anything we own for resale
    host.state.inventory.forEach((i) => {
      const m = meta[i.instanceId];
      if (m && !m.listed && !world.locks[i.instanceId]) {
        const r = S.player.list(world, env, host, { kind: 'fixed', instanceIds: [i.instanceId], ask: m.resell, durationMs: 8 * S.DAY });
        if (r.ok) m.listed = world.now;
      }
    });
    for (const id in world.listings) { // resell price floor like a sensible seller
      const l = world.listings[id];
      if (l.status !== 'open' || l.seller !== 'you' || l.kind !== 'fixed') continue;
      if (world.now - (l.pricedAt || l.createdAt) >= 30 * S.HOUR) { const fair = S.advisor.fairOf(world, env, l.items[0]); const floor = Math.round(fair * 0.85); if (l.ask > floor) { l.ask = Math.max(floor, Math.round(l.ask * 0.94)); l.pricedAt = world.now; S.matchOrdersFor(world, env, host, l); } }
    }
    const moves = S.advisor.moves(world, env, { inventory: [], available: host.state.balance - S.playerHeld(world), balance: host.state.balance, noOrders: true });
    let n = 0;
    for (const m of moves) {
      if (n >= 1) break;
      if (m.type === 'buy') { const r = S.player.buy(world, env, host, m.listingId); if (r.ok) { meta[m.itemId] = { tag: m.tag, cost: m.cost, expect: m.gain, resell: m.resell, fair: m.fair, t: world.now }; n++; } }
      if (m.type === 'bid') { const r = S.player.bid(world, env, host, m.listingId, m.max); if (r.ok) { meta['bid:' + m.listingId] = { tag: m.tag, cost: m.cost, expect: m.gain, resell: m.resell, fair: m.fair, t: world.now, bidFor: m.itemId }; n++; } }
    }
    // a won auction: map to the item
    Object.keys(meta).forEach((k) => { if (k.startsWith('bid:')) { const m = meta[k]; const inst = host.state.inventory.find((x) => x.instanceId === m.bidFor); if (inst && !meta[inst.instanceId]) { meta[inst.instanceId] = Object.assign({}, m, { cost: world.basis[inst.instanceId] || m.cost }); delete meta[k]; } } });
  }
  // outcomes
  const soldBy = {};
  world.trades.forEach((t) => { if (t.seller === 'you') soldBy[t.s] = t; });
  host.state.inventory.concat([]).forEach(() => {});
  for (const id in meta) {
    const m = meta[id]; if (id.startsWith('bid:')) { (byTag[m.tag + ' (lost/unwon)'] = byTag[m.tag + ' (lost/unwon)'] || []).push({ lost: true }); continue; }
    // find trade where seller you and item id matches via listing items
    let sold = null;
    for (const lid in world.listings) { const l = world.listings[lid]; if (l.seller === 'you' && l.items.some((x) => x.i === id) && l.status === 'sold') { sold = l; } }
    const rec = { cost: m.cost, expect: m.expect, resell: m.resell, fair: m.fair, sold: sold ? sold.soldFor : null, hours: sold ? Math.round((sold.closedAt - m.t) / S.HOUR) : null };
    (byTag[m.tag] = byTag[m.tag] || []).push(rec);
  }
}
for (const tag in byTag) {
  const v = byTag[tag].filter((x) => !x.lost), lost = byTag[tag].filter((x) => x.lost).length, sold = v.filter((x) => x.sold != null);
  const net = (p) => p - Math.max(1, Math.round(p * 0.02));
  console.log(tag.padEnd(22), 'bought', v.length, 'lost', lost, 'sold', sold.length, ' avg cost', (v.reduce((n, x) => n + x.cost, 0) / Math.max(1, v.length)).toFixed(1),
    ' expected gain', (v.reduce((n, x) => n + x.expect, 0) / Math.max(1, v.length)).toFixed(1), ' realized gain on sold', (sold.reduce((n, x) => n + net(x.sold) - x.cost, 0) / Math.max(1, sold.length)).toFixed(1),
    ' sold/expected price', (sold.reduce((n, x) => n + x.sold / x.resell, 0) / Math.max(1, sold.length)).toFixed(2), ' hours to sell', (sold.reduce((n, x) => n + x.hours, 0) / Math.max(1, sold.length)).toFixed(0));
}
