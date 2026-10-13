'use strict';
// Cardable Market Beta, Stage 5: how the Global Market's Credits behave. A deterministic model, not a forecast:
// where Credits come from (only the system redemption), where they go (the fee), how fast, and what that means for a
// newcomer who has just converted a collection. Reads the game's own card data and rarity odds.
//   node tools/global-economy-experiment.cjs [--out docs/market-beta/stage-5-economy.txt]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const outIndex = process.argv.indexOf('--out');
const sandbox = { console }; sandbox.window = sandbox; sandbox.Cardable = { data: {} }; vm.createContext(sandbox);
['src/data/rarities.js', 'src/data/cards.js', 'src/data/variants.js', 'src/data/market-config.js', 'src/data/market-sim.js', 'src/market/core.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));
const C = sandbox.Cardable, M = C.data.market, core = C.market.core;
const index = core.buildCardIndex(C.data.cards, C.data.rarities, M);
const QS = { factor: M.quickSell.factor, perAccountCardsPerDay: 40, perAccountCreditsPerDay: 4000, globalCreditsPerDay: 250000 };
const lines = [];
const say = (t) => { lines.push(t); console.log(t); };

// a deterministic stream of pack results, weighted by rarity chance
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(5), rarities = C.data.rarities.filter((r) => r.chance > 0), total = rarities.reduce((n, r) => n + r.chance, 0);
const byRarity = {}; C.data.cards.forEach((c) => { (byRarity[c.rarity] = byRarity[c.rarity] || []).push(c); });
function pull() {
  let at = rand() * total, r = rarities[rarities.length - 1];
  for (const x of rarities) { at -= x.chance; if (at <= 0) { r = x; break; } }
  const list = byRarity[r.id] || C.data.cards; return list[Math.floor(rand() * list.length)];
}
const baseline = (card) => (index[card.id] ? index[card.id].baseValue : 1);
const quote = (card) => Math.max(1, Math.floor(baseline(card) * QS.factor));
const pct = (xs, p) => { const a = xs.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };

say('Cardable Global Market: Credit economy model (deterministic; card data and odds from the game)');
say('Rules: Quick Sell pays ' + QS.factor + ' x baseline, rounded down, min 1. Fee 2% half-up, min 1, taken from the seller once. Credits are created only by Quick Sell.');
say('Beta limits: ' + QS.perAccountCardsPerDay + ' cards and ' + QS.perAccountCreditsPerDay + ' Credits per account per UTC day; ' + QS.globalCreditsPerDay + ' Credits per day for the whole realm.');
say('');

const N = 5000, cardsPulled = Array.from({ length: N }, pull), quotes = cardsPulled.map(quote), bases = cardsPulled.map(baseline);
say('1. What a card is worth to the system (' + N + ' simulated pack results)');
say('   baseline value   median ' + pct(bases, 0.5) + ' · mean ' + Math.round(bases.reduce((a, b) => a + b, 0) / N) + ' · p90 ' + pct(bases, 0.9) + ' · p99 ' + pct(bases, 0.99));
say('   Quick Sell quote median ' + pct(quotes, 0.5) + ' · mean ' + Math.round(quotes.reduce((a, b) => a + b, 0) / N) + ' · p90 ' + pct(quotes, 0.9) + ' · p99 ' + pct(quotes, 0.99));
say('   cards whose single quote exceeds one day\'s limit (' + QS.perAccountCreditsPerDay + '): ' + (quotes.filter((q) => q > QS.perAccountCreditsPerDay).length / N * 100).toFixed(2) + '%');
say('');

// a newcomer converts 100 / 300 / 1000 cards
say('2. A newcomer after converting a collection: Credits available through the system, and how long the daily limit takes');
[100, 300, 1000].forEach((n) => {
  const mine = Array.from({ length: n }, () => quote(pull())).sort((a, b) => b - a), sum = mine.reduce((a, b) => a + b, 0);
  // sell the cheapest first (the sensible way to bootstrap), then everything else, under both daily limits
  const order = mine.slice().sort((a, b) => a - b);
  let days = 0, left = order.slice();
  while (left.length && days < 4000) {
    days++;
    let cards = 0, credits = 0;
    while (left.length && cards < QS.perAccountCardsPerDay && credits + left[0] <= QS.perAccountCreditsPerDay) { credits += left.shift(); cards++; }
    if (!cards) { left.shift(); } // a single card above a day's limit is never sellable to the system; listing it to players is the way
  }
  say('   ' + String(n).padStart(4) + ' cards: total quote ' + String(sum).padStart(7) + ' Credits, first day ' + Math.min(QS.perAccountCreditsPerDay, order.slice(0, QS.perAccountCardsPerDay).reduce((a, b) => a + b, 0)) + ', all sold in ' + days + ' day' + (days === 1 ? '' : 's'));
});
say('');

say('3. Playability of the 2% fee (half-up, at least 1 Credit): what a seller keeps');
[3, 5, 10, 25, 50, 100, 500, 2000].forEach((p) => { const f = core.feeFor(p, M.fee); say('   price ' + String(p).padStart(5) + ' -> fee ' + String(f).padStart(4) + ' (' + (f / p * 100).toFixed(1).padStart(5) + '%), seller keeps ' + (p - f)); });
say('');

say('4. Inflation: can Credits grow without bound?');
say('   Not without more cards. Credits are created only by retiring a card at ' + QS.factor + ' x its value, a card can be redeemed once, and the beta creates no new cards online.');
say('   So everything ever issued is bounded by the value of the collections players convert, times ' + QS.factor + '. A typical 300 card collection is worth about ' + Math.round(300 * quotes.reduce((a, b) => a + b, 0) / N) + ' Credits to the system.');
say('   Every Credit sale then destroys 2% (min 1). Total realm Credits can only fall after the last card is sold.');
say('   The rate is bounded too: ' + QS.perAccountCreditsPerDay + '/day per account and ' + QS.globalCreditsPerDay + '/day for the realm.');
const turn = 0.3, issue = 600;
say('   Steady state with each account issuing ' + issue + '/day and each Credit changing hands ' + turn + ' times a day: fees remove ' + (issue * 0 + Math.round(issue * 0.02 * turn)) + '/day per account, so supply tracks issuance until the cards run out.');
say('');
say('5. Abuse bound: a forged import');
say('   An edited save can claim up to 3000 cards (beta cap). At the daily limit that is ' + QS.perAccountCreditsPerDay + ' Credits/day per account; a farm of accounts is slowed by the per-address registration limit and bounded by the realm total of ' + QS.globalCreditsPerDay + '/day.');
say('   It is a beta risk, not a solved problem: the operator can revoke a disputed import, and the realm total is the circuit breaker.');

if (outIndex > 0) fs.writeFileSync(path.resolve(root, process.argv[outIndex + 1]), lines.join('\n') + '\n');
