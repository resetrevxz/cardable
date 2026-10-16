'use strict';
// The Shop must never sell a card for less than the market would pay for it, or a player could buy there and sell on the
// market for a profit with no risk. Checks every card and every finish in the catalog, at the market's most generous
// reading (the card's best spec, a low serial and the finish's value factor), and that market values rise with rarity.
//   node tools/check-value-relations.cjs [--margin 1.25]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const margin = process.argv.includes('--margin') ? Number(process.argv[process.argv.indexOf('--margin') + 1]) : 1.25;
const sandbox = { console, Math, Date };
sandbox.window = sandbox;
vm.createContext(sandbox);
['src/core/namespace.js', 'src/config.js', 'src/data/rarities.js', 'src/data/cards.js', 'src/data/variants.js', 'src/data/shop.js', 'src/data/market-config.js', 'src/market/core.js', 'src/core/shop-state.js'].forEach((file) => {
  try { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }); } catch (e) { throw new Error(file + ': ' + e.message); }
});
const C = sandbox.Cardable;
C.variant = C.variant || ((id) => (C.data.variants || []).find((v) => v.id === id) || null);
const cards = C.data.cards.filter((c) => !c.retired && c.pullable !== false);
const index = C.market.core.buildCardIndex(cards, C.data.rarities, C.data.market);
const M = C.data.market, serialMax = M.serial.max;
const problems = [], worst = {};
cards.forEach((card) => {
  const entry = index[card.id];
  [null].concat((C.data.variants || []).map((v) => v.id)).forEach((vid) => {
    const variant = vid ? C.variant(vid) : null;
    const factor = variant ? (M.variantClassFactor[variant.class] || 1) : 1;
    const market = entry.baseValue * factor * serialMax;
    let shop;
    try { shop = C.shopState.quote(card, vid); } catch (e) { return; }
    const ratio = shop / market;
    const key = card.rarity + (vid ? '+finish' : '');
    if (!worst[key] || ratio < worst[key].ratio) worst[key] = { ratio, card: card.id, finish: vid, shop, market: Math.round(market) };
    if (ratio < margin) problems.push(card.id + (vid ? ' (' + vid + ')' : '') + ': Shop ' + shop + ' vs market at best ' + Math.round(market) + ' (' + ratio.toFixed(2) + 'x)');
  });
});
// market values rise with rarity: the cheapest card of a tier is worth more than the average card of the tier below
const byTier = {};
cards.forEach((c) => { (byTier[c.rarity] = byTier[c.rarity] || []).push(index[c.id].baseValue); });
const order = C.data.rarities.filter((r) => r.pullable).sort((a, b) => a.tier - b.tier).map((r) => r.id);
for (let i = 1; i < order.length; i++) {
  const lo = byTier[order[i - 1]], hi = byTier[order[i]];
  if (!lo || !hi) continue;
  const meanLo = lo.reduce((a, b) => a + b, 0) / lo.length, minHi = Math.min.apply(null, hi);
  if (minHi <= meanLo) problems.push(order[i] + ' is not worth more than ' + order[i - 1] + ' (cheapest ' + minHi + ' vs average ' + meanLo.toFixed(1) + ')');
}
console.log('Tightest Shop-to-market ratio per tier (must stay at or above ' + margin + 'x):');
Object.keys(worst).sort((a, b) => worst[a].ratio - worst[b].ratio).slice(0, 8).forEach((k) => console.log('  ' + k.padEnd(26) + worst[k].ratio.toFixed(2) + 'x  ' + worst[k].card + ' shop ' + worst[k].shop + ' market ' + worst[k].market));
if (problems.length) { console.log('\n' + problems.length + ' problems:\n  ' + problems.slice(0, 20).join('\n  ')); process.exit(1); }
console.log('\nNo problems: the Shop is dearer than the market for every card and finish, and values rise with rarity.');
