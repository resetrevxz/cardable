'use strict';
// Cardable Market Beta, Stage 3: seeded economy experiments for the Credits flow.
//   node tools/economy-experiment.cjs [--pulls 20000] [--days 60] [--packs 4] [--worldDays 30] [--json]
// Answers, with the shipped catalog, rarity odds and the Quick Sell factor in src/data/market-config.js:
//  1. What does a pack pay when every card is Quick Sold? (mean, median, spread, share by rarity)
//  2. How long does a new player take to afford each cinematic unlock if all they do is sell what they open?
//  3. Is there any loop that turns Credits into more Credits (buy a listing, Quick Sell it)? It must lose every time.
//  4. What does a card sold on the market leave compared with Quick Sell?
const h = require('../tests/support/sales-harness.cjs');
const args = process.argv.slice(2);
const val = (name, d) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : d);
const PULLS = val('--pulls', 20000), DAYS = val('--days', 60), PACKS = val('--packs', 4), WORLD_DAYS = val('--worldDays', 30), JSON_OUT = args.includes('--json');

const G = h.load();
G.newSave([]);
const C = G.C;

function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pullable = C.data.rarities.filter((r) => r.pullable !== false && r.chance > 0);
const totalChance = pullable.reduce((n, r) => n + r.chance, 0);
const byRarity = {};
C.data.cards.filter((c) => !c.retired && c.pullable !== false).forEach((c) => { (byRarity[c.rarity] = byRarity[c.rarity] || []).push(c); });
const variants = C.data.variants, variantTotal = variants.reduce((n, v) => n + v.weight, 0);

function samplePull(rnd) {
  let needle = rnd() * totalChance, rarity = pullable[pullable.length - 1];
  for (const r of pullable) { needle -= r.chance; if (needle < 0) { rarity = r; break; } }
  const pool = byRarity[rarity.id] || byRarity[pullable[0].id];
  const card = pool[Math.floor(rnd() * pool.length)];
  let variantId = null;
  if (rnd() < C.config.variants.chance) { let n = rnd() * variantTotal; for (const v of variants) { n -= v.weight; if (n < 0) { variantId = v.id; break; } } }
  return { cardId: card.id, variantId, cardSkinId: null, serial: 'CBL-SIMU-' + String(Math.floor(rnd() * 900000) + 1).padStart(6, '0'), tier: rarity.tier, rarity: rarity.id };
}
function quoteOf(p) { return C.sales.quote({ instanceId: 'x', cardId: p.cardId, variantId: p.variantId, cardSkinId: p.cardSkinId, serial: p.serial }); }
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]; }

const out = {};
// ---- 1. income per pack --------------------------------------------------------------------------------------------
{
  const rnd = mulberry(7), quotes = [], fair = [], byTier = {};
  for (let i = 0; i < PULLS; i++) {
    const p = samplePull(rnd), q = quoteOf(p);
    quotes.push(q.quote); fair.push(q.fair);
    byTier[p.tier] = (byTier[p.tier] || 0) + q.quote;
  }
  const sorted = quotes.slice().sort((a, b) => a - b), sum = quotes.reduce((a, b) => a + b, 0);
  out.income = { pulls: PULLS, mean: +(sum / PULLS).toFixed(2), median: pct(sorted, 0.5), p10: pct(sorted, 0.1), p90: pct(sorted, 0.9), p99: pct(sorted, 0.99), max: sorted[sorted.length - 1],
    meanFair: +(fair.reduce((a, b) => a + b, 0) / PULLS).toFixed(2), quickSellShareOfFair: +(sum / fair.reduce((a, b) => a + b, 0)).toFixed(3),
    incomeShareByTier: Object.keys(byTier).map(Number).sort((a, b) => a - b).map((t) => ({ tier: t, rarity: C.data.rarities.find((r) => r.tier === t).id, share: +(byTier[t] / sum).toFixed(3) })) };
}
// ---- 2. progression for a player who only sells what they open ----------------------------------------------------
{
  const prices = C.data.cutscenePrices || {}, thresholds = Object.keys(prices).map((k) => ({ id: k, price: prices[k] })).sort((a, b) => a.price - b.price);
  const SEEDS = 40, result = {};
  thresholds.forEach((t) => { result[t.id] = []; });
  for (let seed = 1; seed <= SEEDS; seed++) {
    const rnd = mulberry(1000 + seed);
    let credits = 0, spentAll = 0;
    const reached = {};
    // Start with the two packs a new save has, then PACKS a day.
    let packsLeft = 2;
    for (let day = 0; day <= DAYS; day++) {
      const today = day === 0 ? packsLeft : PACKS;
      for (let n = 0; n < today; n++) { credits += quoteOf(samplePull(rnd)).quote; }
      thresholds.forEach((t) => { if (reached[t.id] == null && credits >= t.price) reached[t.id] = day; });
    }
    thresholds.forEach((t) => { result[t.id].push(reached[t.id] == null ? DAYS + 1 : reached[t.id]); });
  }
  out.progression = { packsPerDay: PACKS, seeds: SEEDS, days: DAYS, unlockDays: thresholds.map((t) => { const s = result[t.id].slice().sort((a, b) => a - b); return { unlock: t.id, price: t.price, medianDay: s[Math.floor(s.length / 2)], p90Day: s[Math.floor(s.length * 0.9)] }; }) };
}
// ---- 3. arbitrage: buy anything the market offers, Quick Sell it ------------------------------------------------
{
  const world = G.S.create({ seed: 'econ', nonce: 1, wall: 1700000000000 }, G.env);
  G.runtime.world = world;
  G.C.valuation.invalidate();
  const host = { balance: () => 0, instance: () => null, hasReceipt: () => false, settle: () => true };
  const step = (to) => { let r; do { r = G.S.advance(world, G.env, host, to, 5000); } while (!r.reached); };
  let worst = -Infinity, checked = 0, profitable = 0, worstItem = null, trades = 0, tradeWorst = -Infinity;
  const seen = new Set();
  for (let d = 5; d <= 5 + WORLD_DAYS; d++) {
    step(d * 86400000);
    G.C.valuation.invalidate();
    Object.keys(world.listings).forEach((id) => {
      const l = world.listings[id];
      if (l.status !== 'open' || l.kind !== 'fixed' || l.items.length !== 1) return;
      const it = l.items[0], q = quoteOf({ cardId: it.c, variantId: it.v, cardSkinId: it.k, serial: it.s });
      const gain = q.quote - l.ask;
      checked++;
      if (gain > worst) { worst = gain; worstItem = { card: it.c, ask: l.ask, quote: q.quote, fair: q.fair }; }
      if (gain > 0) profitable++;
    });
    world.trades.forEach((t) => {
      if (seen.has(t.id)) return; seen.add(t.id);
      const q = quoteOf({ cardId: t.c, variantId: t.v, cardSkinId: t.k, serial: t.s });
      trades++; tradeWorst = Math.max(tradeWorst, q.quote - t.price);
    });
  }
  out.arbitrage = { simulatedDays: WORLD_DAYS, listingsChecked: checked, listingsWhereQuickSellBeatsTheAsk: profitable, bestGainAnywhere: worst, bestCase: worstItem,
    executedTradesChecked: trades, bestGainOnAnExecutedTrade: tradeWorst };
}
// ---- 4. market versus Quick Sell for the same card --------------------------------------------------------------
{
  const rnd = mulberry(99), rows = [];
  for (let i = 0; i < 2000; i++) {
    const p = samplePull(rnd), q = quoteOf(p), fee = C.market.core.feeFor(q.fair, C.data.market.fee);
    rows.push({ tier: p.tier, quick: q.quote, market: q.fair - fee, fair: q.fair });
  }
  const t = {};
  rows.forEach((r) => { const k = r.tier; (t[k] = t[k] || { n: 0, quick: 0, market: 0 }); t[k].n++; t[k].quick += r.quick; t[k].market += r.market; });
  out.marketVersusQuickSell = Object.keys(t).map(Number).sort((a, b) => a - b).map((k) => ({ tier: k, quickSellAsShareOfMarketNet: +(t[k].quick / t[k].market).toFixed(3) }));
}

if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else {
  console.log('Quick Sell factor ' + C.data.market.quickSell.factor + ', band ' + C.data.market.quickSell.floorUnderBaseline + 'x to ' + C.data.market.quickSell.ceilingOverBaseline + 'x baseline');
  const i = out.income;
  console.log('\n1. Income per pack, every card Quick Sold (' + i.pulls + ' simulated pulls)');
  console.log('   mean ' + i.mean + '  median ' + i.median + '  p10 ' + i.p10 + '  p90 ' + i.p90 + '  p99 ' + i.p99 + '  max ' + i.max + '  mean Average Value ' + i.meanFair + '  paid ' + (i.quickSellShareOfFair * 100).toFixed(1) + '% of it');
  console.log('   share of income by rarity: ' + i.incomeShareByTier.map((s) => s.rarity + ' ' + (s.share * 100).toFixed(1) + '%').join(', '));
  console.log('\n2. Days for a new player to afford each cinematic unlock by selling only (' + out.progression.packsPerDay + ' packs a day, 2 to start, ' + out.progression.seeds + ' seeds)');
  out.progression.unlockDays.forEach((u) => console.log('   ' + u.unlock.padEnd(18) + String(u.price).padStart(5) + ' Credits   median day ' + String(u.medianDay).padStart(3) + '   p90 day ' + String(u.p90Day).padStart(3) + (u.p90Day > out.progression.days ? ' (beyond the window)' : '')));
  const a = out.arbitrage;
  console.log('\n3. Buy any open listing and Quick Sell it, over ' + a.simulatedDays + ' simulated days');
  console.log('   ' + a.listingsChecked + ' listing observations, ' + a.listingsWhereQuickSellBeatsTheAsk + ' where Quick Sell paid more than the ask; best gain anywhere ' + a.bestGainAnywhere + ' Credits' + (a.bestCase ? ' (ask ' + a.bestCase.ask + ', quote ' + a.bestCase.quote + ', Average Value ' + a.bestCase.fair + ')' : ''));
  console.log('   ' + a.executedTradesChecked + ' executed trades: best gain from Quick Selling the card at the price it traded ' + a.bestGainOnAnExecutedTrade + ' Credits');
  console.log('\n4. Quick Sell as a share of what the market leaves after the 2% fee, by rarity tier');
  console.log('   ' + out.marketVersusQuickSell.map((r) => 'tier ' + r.tier + ': ' + (r.quickSellAsShareOfMarketNet * 100).toFixed(0) + '%').join('   '));
}
