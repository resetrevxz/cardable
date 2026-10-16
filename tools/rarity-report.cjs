'use strict';
// How rare is rare? Loads the real catalog, rarities and every pack, and reports for each pack and for the whole opening
// schedule the chance of each rarity and "one in N", the average Quick Sell value of a pull, and how often a pack
// delivers a given tier or better. Used to compare odds before and after a change.
//   node tools/rarity-report.cjs [--json] [--packs]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function load(rootDir) {
  const sandbox = { console, Math, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  ['src/core/namespace.js', 'src/config.js', 'src/data/rarities.js', 'src/data/cards.js', 'src/data/packs.js', 'src/data/brand-packs.js', 'src/data/classic-pack.js', 'src/data/royal-pack.js',
    'src/data/titan-pack.js', 'src/data/picker-pack.js', 'src/data/variants.js', 'src/data/market-config.js', 'src/core/pull.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(rootDir, file), 'utf8'), sandbox, { filename: file });
  });
  return sandbox.Cardable;
}
const C = load(root);
const tiers = C.data.rarities.filter((r) => r.pullable).sort((a, b) => a.tier - b.tier);
const value = (id) => C.data.market.rarityBase[id] || 0;

// what each pack gives, per card drawn
function table(pack) {
  const t = C.pull.probabilities(pack), out = {};
  t.tiers.forEach((r) => { out[r.tier.id] = (out[r.tier.id] || 0) + r.chance; });
  return out;
}
const packs = C.data.packs.filter((p) => p.enabled);
const byId = Object.fromEntries(packs.map((p) => [p.id, p]));
// the schedule: every fourth opening is a Rare Pack (and one in twenty of those is Royal); the rest are random types by their own chance, else Standard
const rare = byId.rare, royal = byId.royal, randoms = packs.filter((p) => p.randomChance > 0 && p.id !== 'picker');
const share = {};
const every = rare.cadence.every, cad = 1 / every, other = 1 - cad;
share.rare = cad * (1 - (royal ? royal.replacementChance : 0)); if (royal) share.royal = cad * royal.replacementChance;
let used = 0;
packs.filter((p) => p.randomChance > 0).forEach((p) => { share[p.id] = other * p.randomChance; used += p.randomChance; });
share.standard = other * (1 - used);

// a Picker Pack shows three cards, one of them guaranteed Rare or better; the player keeps the best
function pickerBest(pack) {
  const base = table(pack), minTier = (pack.guarantees && pack.guarantees[0] && pack.guarantees[0].minTier) || 3;
  const idx = Object.fromEntries(tiers.map((t) => [t.id, t.tier]));
  const draw = Object.entries(base).map(([id, p]) => [idx[id], p]);
  const guaranteed = draw.filter(([t]) => t >= minTier), gsum = guaranteed.reduce((n, [, p]) => n + p, 0);
  const best = {};
  // enumerate tier of best among two ordinary draws and one guaranteed draw
  draw.forEach(([a, pa]) => draw.forEach(([b, pb]) => guaranteed.forEach(([c, pc]) => {
    const m = Math.max(a, b, c), p = pa * pb * (pc / gsum); best[m] = (best[m] || 0) + p;
  })));
  const out = {}; Object.entries(best).forEach(([t, p]) => { const id = tiers.find((x) => x.tier === Number(t)).id; out[id] = p; });
  return out;
}

const perPack = {};
packs.forEach((p) => { perPack[p.id] = p.id === 'picker' ? pickerBest(p) : table(p); });
const overall = {};
Object.keys(share).forEach((id) => Object.entries(perPack[id] || {}).forEach(([tier, p]) => { overall[tier] = (overall[tier] || 0) + share[id] * p; }));
const pickerShare = byId.picker ? other * byId.picker.randomChance : 0;
Object.entries(perPack.picker || {}).forEach(([tier, p]) => { overall[tier] = (overall[tier] || 0) + pickerShare * p; });
const norm = Object.values(overall).reduce((n, v) => n + v, 0);
Object.keys(overall).forEach((k) => { overall[k] /= norm; });

const fmt = (p) => (p >= 0.1 ? (p * 100).toFixed(1) + '%' : p >= 0.001 ? (p * 100).toFixed(2) + '%' : (p * 100).toFixed(4) + '%');
const oneIn = (p) => (p > 0 ? '1 in ' + Math.round(1 / p).toLocaleString('en-US') : 'never');
const result = { base: Object.fromEntries(tiers.map((t) => [t.id, t.chance])), shares: share, perPack, overall,
  meanValue: { overall: tiers.reduce((n, t) => n + (overall[t.id] || 0) * value(t.id), 0) } };
Object.keys(perPack).forEach((id) => { result.meanValue[id] = tiers.reduce((n, t) => n + (perPack[id][t.id] || 0) * value(t.id), 0); });

if (args.includes('--json')) { console.log(JSON.stringify(result, null, 1)); process.exit(0); }
const sum = tiers.reduce((n, t) => n + t.chance, 0);
console.log('Base odds (sum ' + sum.toFixed(3) + '):', tiers.map((t) => t.id + ' ' + t.chance).join(', '));
console.log('\nWhole opening schedule (all pack types by how often they open):');
let cumulative = 0;
const rows = tiers.slice().reverse().map((t) => { cumulative += overall[t.id] || 0; return { id: t.id, p: overall[t.id] || 0, cum: cumulative, value: value(t.id) }; }).reverse();
rows.forEach((r) => console.log('  ' + r.id.padEnd(18) + fmt(r.p).padStart(9) + '  ' + oneIn(r.p).padStart(14) + '   this or better ' + fmt(r.cum).padStart(8) + '  ' + oneIn(r.cum).padStart(13) + '   value ' + r.value));
console.log('  mean Quick-Sell-scale value of a pull (rarity base): ' + result.meanValue.overall.toFixed(1));
if (args.includes('--packs')) {
  console.log('\nBy pack (share of openings, mean value, Rare+ / Legendary+ per card):');
  Object.keys(perPack).forEach((id) => {
    const rp = tiers.filter((t) => t.tier >= 3).reduce((n, t) => n + (perPack[id][t.id] || 0), 0), lp = tiers.filter((t) => t.tier >= 7).reduce((n, t) => n + (perPack[id][t.id] || 0), 0);
    console.log('  ' + id.padEnd(9) + ((share[id] != null ? share[id] : pickerShare) * 100).toFixed(2).padStart(6) + '%  mean ' + result.meanValue[id].toFixed(1).padStart(8) + '   Rare+ ' + fmt(rp).padStart(8) + ' (' + oneIn(rp) + ')   Legendary+ ' + fmt(lp).padStart(8) + ' (' + oneIn(lp) + ')');
  });
}
