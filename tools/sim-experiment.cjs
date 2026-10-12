'use strict';
// Seeded multi-day experiments for the offline market simulator (Stage 2).
//   node tools/sim-experiment.cjs [--days 30] [--seeds 5] [--arb] [--json]
// Prints trade volume, credit supply, wealth spread, sell-through and a naive arbitrage test.
const h = require('../tests/support/sim-harness.cjs');
const args = process.argv.slice(2);
const val = (name, d) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : d);
const DAYS = val('--days', 30), SEEDS = val('--seeds', 5), ARB = args.includes('--arb'), JSON_OUT = args.includes('--json'), EDGE = val('--edge', 0.12);

function gini(values) {
  const v = values.slice().sort((a, b) => a - b), n = v.length, sum = v.reduce((a, b) => a + b, 0);
  if (!sum) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * v[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}
function openCards(world) {
  return world.bots.reduce((a, b) => a + b.inv.length, 0) + Object.values(world.listings).filter((l) => l.status === 'open').reduce((a, l) => a + l.items.length, 0);
}
function run(seed, days, withArb) {
  const C = h.load(), S = C.market.sim, env = h.makeEnv(C);
  const world = S.create({ seed, nonce: 1, wall: 1700000000000 }, env);
  const host = h.mockHost({ balance: withArb ? 5000 : 0, inventory: [] });
  const warm = S.DAY * C.data.marketSim.warmupDays;
  const step = (to) => { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); };
  step(warm);
  world.epoch = world.now;
  const start = { trades: world.stats.trades, volume: world.stats.volume, burnt: world.stats.burnt, allowance: world.stats.allowance, packs: world.stats.packs };
  const startCredits = world.bots.reduce((a, b) => a + b.credits, 0);
  const startCards = openCards(world);
  const startTradeCount = world.trades.length;
  const arb = { buys: 0, sells: 0, profit: 0, realized: 0 };
  const cost = {};
  for (let d = 1; d <= days; d++) {
    const t = world.now;
    for (let hour = 1; hour <= 24; hour++) {
      step(t + hour * S.HOUR);
      if (withArb) {
        // The naive arbitrageur: buy the best bargain under fair value and relist it at fair value.
        let best = null;
        Object.values(world.listings).forEach((l) => {
          if (l.status !== 'open' || l.kind !== 'fixed' || l.seller === 'you' || l.items.length !== 1) return;
          const it = l.items[0], fair = S.fairInfo(world, env, it.c, it.v, it.k).average * S.serialFactor(it.s);
          const margin = (fair - l.ask) / fair;
          if (margin > EDGE && host.balance() >= l.ask && (!best || margin > best.margin)) best = { l, margin, fair };
        });
        if (best) {
          const r = S.player.buy(world, env, host, best.l.id);
          if (r.ok) {
            arb.buys++; cost[best.l.items[0].i] = best.l.ask;
            S.player.list(world, env, host, { kind: 'fixed', instanceIds: [best.l.items[0].i], ask: Math.max(1, Math.round(best.fair)), durationMs: 5 * S.DAY });
          }
        }
      }
    }
  }
  const end = world.stats;
  const botCredits = world.bots.map((b) => b.credits);
  const ratios = world.trades.slice(startTradeCount).map((tr) => tr.price / S.baselineFor(env, tr.c, tr.v, tr.k)).sort((a, b) => a - b);
  const vsFair = world.trades.slice(startTradeCount).map((tr) => tr.price / tr.f);
  const meanVsFair = vsFair.reduce((a, b) => a + b, 0) / Math.max(1, vsFair.length);
  const q = (p) => (ratios.length ? ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))] : null);
  const closed = Object.values(world.listings).filter((l) => l.status === 'sold' || l.status === 'expired' || l.status === 'cancelled');
  const sold = closed.filter((l) => l.status === 'sold').length;
  const byPersona = {};
  world.bots.forEach((b) => {
    const p = (byPersona[b.persona] = byPersona[b.persona] || { n: 0, bought: 0, sold: 0, credits: 0 });
    p.n++; p.bought += b.stats.bought; p.sold += b.stats.sold; p.credits += b.credits;
  });
  const per = {};
  world.trades.slice(startTradeCount).forEach((tr) => { (per[tr.s] = per[tr.s] || []).push(tr.t); });
  let maxPerCard = 0, fast = 0;
  Object.values(per).forEach((ts) => { maxPerCard = Math.max(maxPerCard, ts.length); for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] < S.DAY) fast++; });
  const audit = S.audit(world, host.state.inventory.map((i) => i.instanceId));
  if (withArb) {
    const inv = host.state.inventory.reduce((a, i) => a + S.fairInfo(world, env, i.cardId, i.variantId, i.cardSkinId).average, 0);
    arb.profit = host.balance() + inv - 5000;
    arb.realized = host.balance() - 5000 + host.state.inventory.reduce((a, i) => a + (cost[i.instanceId] || 0), 0);
    arb.sells = world.stats.you.sold;
  }
  return {
    seed, days, botsStartCredits: startCredits, botsEndCredits: botCredits.reduce((a, b) => a + b, 0),
    tradesPerDay: (end.trades - start.trades) / days, volumePerDay: (end.volume - start.volume) / days,
    burntPerDay: (end.burnt - start.burnt) / days, allowancePerDay: (end.allowance - start.allowance) / days, packsPerDay: (end.packs - start.packs) / days,
    startCards, endCards: openCards(world), poorBots: botCredits.filter((c) => c < 30).length, gini: gini(botCredits), maxCredits: Math.max.apply(null, botCredits),
    medianCredits: botCredits.slice().sort((a, b) => a - b)[Math.floor(botCredits.length / 2)],
    priceVsBaseline: { p10: q(0.1), p50: q(0.5), p90: q(0.9) }, meanVsFair, sellThrough: closed.length ? sold / closed.length : null,
    openListings: Object.values(world.listings).filter((l) => l.status === 'open').length,
    maxTradesPerCard: maxPerCard, tradesUnderADay: fast, auditProblems: audit.problems.length, personas: byPersona, arb,
    sizeKB: Math.round(S.serialize(world).length / 1024)
  };
}
const results = [];
for (let s = 1; s <= SEEDS; s++) results.push(run('experiment-' + s, DAYS, ARB));
if (JSON_OUT) { console.log(JSON.stringify(results, null, 1)); process.exit(0); }
const avg = (f) => results.reduce((a, r) => a + f(r), 0) / results.length;
console.log('Seeds', SEEDS, 'days', DAYS, ARB ? '(with arbitrageur)' : '');
console.log('trades/day', avg((r) => r.tradesPerDay).toFixed(1), ' volume/day', avg((r) => r.volumePerDay).toFixed(0), ' fees burnt/day', avg((r) => r.burntPerDay).toFixed(1),
  ' allowance/day', avg((r) => r.allowancePerDay).toFixed(1), ' packs/day', avg((r) => r.packsPerDay).toFixed(1));
console.log('bot credits start->end', avg((r) => r.botsStartCredits).toFixed(0), '->', avg((r) => r.botsEndCredits).toFixed(0), ' cards', avg((r) => r.startCards).toFixed(0), '->', avg((r) => r.endCards).toFixed(0));
console.log('poor bots', avg((r) => r.poorBots).toFixed(1), ' gini', avg((r) => r.gini).toFixed(2), ' max', avg((r) => r.maxCredits).toFixed(0), ' median', avg((r) => r.medianCredits).toFixed(0));
console.log('price/baseline p10/p50/p90', ['p10', 'p50', 'p90'].map((k) => avg((r) => r.priceVsBaseline[k] || 0).toFixed(2)).join(' / '),
  ' sell-through', avg((r) => r.sellThrough || 0).toFixed(2), ' open listings', avg((r) => r.openListings).toFixed(0), ' state KB', avg((r) => r.sizeKB).toFixed(0));
console.log('mean trade price / fair at the time', avg((r) => r.meanVsFair).toFixed(3));
console.log('max trades of one card', Math.max.apply(null, results.map((r) => r.maxTradesPerCard)), ' repeat trades inside a day', avg((r) => r.tradesUnderADay).toFixed(1),
  ' audit problems', results.reduce((a, r) => a + r.auditProblems, 0));
if (ARB) console.log('edge', EDGE, 'arbitrageur profit per seed', results.map((r) => Math.round(r.arb.profit)).join(', '), ' realized (cash, held stock at cost)', results.map((r) => Math.round(r.arb.realized)).join(', '), ' buys', results.map((r) => r.arb.buys).join(', '));
const pers = {};
results.forEach((r) => Object.keys(r.personas).forEach((p) => {
  const a = (pers[p] = pers[p] || { n: 0, bought: 0, sold: 0, credits: 0 });
  a.n += r.personas[p].n; a.bought += r.personas[p].bought; a.sold += r.personas[p].sold; a.credits += r.personas[p].credits;
}));
console.log('by persona (per bot): bought / sold / credits');
Object.keys(pers).forEach((p) => console.log('  ' + p.padEnd(14), (pers[p].bought / pers[p].n).toFixed(1), '/', (pers[p].sold / pers[p].n).toFixed(1), '/', (pers[p].credits / pers[p].n).toFixed(0)));
