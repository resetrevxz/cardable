'use strict';
// Does the Simulation reward playing it well? Seeded experiments with policies that play the player's side, headless:
//   idle       does nothing (the control: the market itself must not make or lose the player money)
//   quick      sells every card to the system at once (the floor a beginner starts from)
//   random     buys and lists at random (what clicking without a plan gets)
//   coach      follows the coach's best suggestion each simulated hour (what a beginner reading the Home page does)
//   naive      the old test: buy anything 12% under Average Value and relist at Average Value
//   node tools/sim-strategy.cjs [--days 4] [--seeds 8] [--start 1] [--json]
// Net worth = Credits + the Average Value of every card owned (including cards in your own listings).
const h = require('../tests/support/sim-harness.cjs');
const args = process.argv.slice(2);
const val = (name, d) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : d);
const DAYS = val('--days', 4), SEEDS = val('--seeds', 8), START = val('--start', 1), JSON_OUT = args.includes('--json');
const POLICIES = (args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : ['idle', 'quick', 'random', 'coach', 'naive']);

function makeGame(seed) {
  const C = h.load(['src/market/sim/advisor.js']), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: 320, inventory: [] });
  const step = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  step(S.DAY * C.data.marketSim.warmupDays);
  world.epoch = world.now;
  // the same starter collection for every policy: fourteen everyday-to-uncommon cards
  const pool = env.cards.filter((c) => { const t = env.tierOf[c.id] || 0; return t >= 0 && t <= 4; });
  const rnd = (() => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  for (let i = 0; i < 14; i++) host.state.inventory.push(h.playerCard(C, env, pool[Math.floor(rnd() * pool.length)].id, {}));
  return { C, S, env, world, host, step, rnd };
}
const netWorth = (g) => Math.round(g.host.state.balance + g.host.state.inventory.reduce((n, i) => n + g.S.advisor.fairOf(g.world, g.env, { c: i.cardId, v: i.variantId, k: i.cardSkinId, s: i.serial }), 0));
const quote = (g) => (inst) => Math.max(1, Math.floor(g.S.advisor.fairOf(g.world, g.env, { c: inst.cardId, v: inst.variantId, k: inst.cardSkinId, s: inst.serial }) * 0.62));
function available(g) { return g.host.state.balance - g.S.playerHeld(g.world); }
function ownedFree(g) { return g.host.state.inventory.filter((i) => !g.world.locks[i.instanceId]); }
function listAt(g, inst, price, days) { return g.S.player.list(g.world, g.env, g.host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: Math.max(1, Math.round(price)), durationMs: (days || 6) * g.S.DAY }); }
// What a sensible seller does with a card that has not sold: lower the price a little each day, never below 85% of Average Value.
function reprice(g) {
  for (const id in g.world.listings) {
    const l = g.world.listings[id];
    if (l.status !== 'open' || l.seller !== 'you' || l.kind !== 'fixed') continue;
    if (g.world.now - (l.pricedAt || l.createdAt) < 30 * g.S.HOUR) continue;
    const fair = g.S.advisor.fairOf(g.world, g.env, l.items[0]);
    const floor = Math.max(1, Math.round(fair * 0.85));
    if (l.ask > floor) { l.ask = Math.max(floor, Math.round(l.ask * 0.94)); l.pricedAt = g.world.now; g.S.matchOrdersFor(g.world, g.env, g.host, l); }
  }
}
const POLICY = {
  idle() {},
  quick(g, hour) { if (hour !== 1) return; ownedFree(g).forEach((i) => { g.host.state.balance += quote(g)(i); g.host.state.inventory = g.host.state.inventory.filter((x) => x !== i); }); },
  random(g, hour) {
    if (hour % 3) return;
    const open = Object.values(g.world.listings).filter((l) => l.status === 'open' && l.kind === 'fixed' && l.seller !== 'you' && l.items.length === 1 && l.ask <= available(g));
    if (open.length && g.rnd() < 0.7) { const l = open[Math.floor(g.rnd() * open.length)]; g.S.player.buy(g.world, g.env, g.host, l.id); }
    const mine = ownedFree(g);
    if (mine.length && g.rnd() < 0.5) { const c = mine[Math.floor(g.rnd() * mine.length)]; listAt(g, c, g.S.advisor.fairOf(g.world, g.env, { c: c.cardId, v: c.variantId, k: c.cardSkinId, s: c.serial }) * (0.9 + g.rnd() * 0.5)); }
    reprice(g);
  },
  coach(g, hour, state) {
    const player = { inventory: ownedFree(g), available: available(g), quote: quote(g), balance: g.host.state.balance };
    // Cards bought to resell are listed at once at the suggested price.
    ownedFree(g).forEach((i) => { const plan = state.plan[i.instanceId]; if (plan) { const r = listAt(g, i, plan); if (r.ok) delete state.plan[i.instanceId]; } });
    const moves = g.S.advisor.moves(g.world, g.env, Object.assign(player, { inventory: ownedFree(g).filter((i) => !state.plan[i.instanceId]) }));
    let acted = 0;
    for (const m of moves) {
      if (acted >= 2) break;
      if (m.type === 'buy') { const r = g.S.player.buy(g.world, g.env, g.host, m.listingId); if (r.ok) { state.plan[m.itemId] = m.resell; state.bought++; acted++; } }
      else if (m.type === 'bid') { if (m.expiresMin > 60) continue; const r = g.S.player.bid(g.world, g.env, g.host, m.listingId, m.max); if (r.ok) { state.bids++; acted++; } }
      else if (m.type === 'order') { const r = g.S.player.placeOrder(g.world, g.env, g.host, { c: m.cardId, maxPrice: m.cost, durationMs: 2 * g.S.DAY }); if (r.ok) { state.orders++; acted++; } }
      else if (m.type === 'sell') { const inst = g.host.state.inventory.find((x) => x.instanceId === m.itemId); if (inst && !g.world.locks[inst.instanceId]) { const r = listAt(g, inst, m.price); if (r.ok) { state.sellsListed++; acted++; } } }
    }
    // A won auction becomes a card to resell.
    g.host.state.inventory.forEach((i) => { if (!g.world.basis[i.instanceId] || state.plan[i.instanceId] || g.world.locks[i.instanceId]) return; if (!state.seen[i.instanceId]) { state.seen[i.instanceId] = 1; const f = g.S.advisor.fairOf(g.world, g.env, { c: i.cardId, v: i.variantId, k: i.cardSkinId, s: i.serial }); state.plan[i.instanceId] = Math.round(f * 0.97); } });
    // Traps older than a day and a half are taken down so the Credits are free for something better.
    Object.values(g.world.orders).forEach((o) => { if (o.owner === 'you' && o.status === 'open' && g.world.now - o.createdAt > 36 * g.S.HOUR) g.S.player.cancelOrder(g.world, g.env, g.host, o.id); });
    reprice(g);
  },
  naive(g, hour) {
    let best = null;
    Object.values(g.world.listings).forEach((l) => {
      if (l.status !== 'open' || l.kind !== 'fixed' || l.seller === 'you' || l.items.length !== 1) return;
      const fair = g.S.advisor.fairOf(g.world, g.env, l.items[0]), m = (fair - l.ask) / fair;
      if (m > 0.12 && available(g) >= l.ask && (!best || m > best.m)) best = { l, m, fair };
    });
    if (best) { const r = g.S.player.buy(g.world, g.env, g.host, best.l.id); if (r.ok) { const inst = g.host.state.inventory.find((x) => x.instanceId === best.l.items[0].i); if (inst) listAt(g, inst, best.fair); } }
    reprice(g);
  }
};

function run(policy, seed) {
  const g = makeGame(seed), state = { plan: {}, seen: {}, bought: 0, bids: 0, sellsListed: 0, orders: 0 };
  const start = netWorth(g), series = [start];
  for (let day = 1; day <= DAYS; day++) {
    const t0 = g.world.now;
    for (let hour = 1; hour <= 24; hour++) { g.step(t0 + hour * g.S.HOUR); POLICY[policy](g, hour, state); }
    series.push(netWorth(g));
  }
  const audit = g.S.audit(g.world, g.host.state.inventory.map((i) => i.instanceId)).problems;
  return { policy, seed, start, end: series[series.length - 1], series, trades: g.world.stats.you.bought + g.world.stats.you.sold, realized: Math.round(g.world.stats.you.realized || 0), realizedN: g.world.stats.you.realizedN || 0, bought: g.world.stats.you.bought, sold: g.world.stats.you.sold, listed: Object.values(g.world.listings).filter((l) => l.seller === 'you').length, cash: g.host.state.balance, held: g.host.state.inventory.length, state: { bought: state.bought, bids: state.bids, sells: state.sellsListed, orders: state.orders }, audit: audit.length, news: g.world.stats.trades };
}
const stats = (xs) => { const s = xs.slice().sort((a, b) => a - b), n = s.length, mean = s.reduce((a, b) => a + b, 0) / n; return { mean, p10: s[Math.floor(n * 0.1)], median: s[Math.floor(n / 2)], p90: s[Math.min(n - 1, Math.floor(n * 0.9))], min: s[0], max: s[n - 1] }; };
const rows = {};
for (const p of POLICIES) { rows[p] = []; for (let s = START; s < START + SEEDS; s++) rows[p].push(run(p, s)); }
if (JSON_OUT) { console.log(JSON.stringify(rows)); process.exit(0); }
console.log('Net worth growth over ' + DAYS + ' simulated days, ' + SEEDS + ' seeds (start = 320 Credits + 14 starter cards)');
for (const p of POLICIES) {
  const g = rows[p].map((r) => (r.end - r.start) / r.start * 100), d = stats(g);
  const perDay = Array.from({ length: DAYS + 1 }, (_, i) => Math.round(rows[p].reduce((n, r) => n + (r.series[i] - r.start) / r.start * 100, 0) / rows[p].length * 10) / 10);
  if (args.includes('--verbose')) rows[p].forEach((r) => console.log('   ' + p + ' seed ' + r.seed + ' start ' + r.start + ' end ' + r.end + ' realized ' + r.realized + ' (' + r.realizedN + ') bought ' + r.bought + ' sold ' + r.sold + ' listed ' + r.listed + ' cash ' + r.cash + ' cards ' + r.held + ' ' + JSON.stringify(r.state)));
  console.log(p.padEnd(7) + ' growth % mean ' + d.mean.toFixed(1) + '  p10 ' + d.p10.toFixed(1) + '  median ' + d.median.toFixed(1) + '  p90 ' + d.p90.toFixed(1) + '  worst ' + d.min.toFixed(1) + '  best ' + d.max.toFixed(1) + '  by day ' + perDay.join(' / ') + '  trades ' + (rows[p].reduce((n, r) => n + r.trades, 0) / rows[p].length).toFixed(1) + '  audit ' + rows[p].reduce((n, r) => n + r.audit, 0));
}
