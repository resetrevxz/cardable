// Market analytics: the formulas against hand-computed expectations, then the real endpoints against a real database
// holding LABELED FIXTURES (every fixture row carries the id prefix `trd_fixture_`, in a throw-away local database that is
// never a beta realm). Real events made through the API are mixed in to prove what does and does not count.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCard, buildCandles, candleChange, changeOver, median, weightedQuantile, perCard } from '../src/analytics.js';
import { baselineOf, feeFor, keyOf } from '../src/economy.js';
import { CATALOG } from '../src/catalog.js';
import { admin, call, DAY, HOUR, MIN, player, runSql, sql, start, stopAll, wallet } from './helpers.mjs';

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const CARD = 'gen1-basic-01', RARE = Object.keys(CATALOG.cards).find((c) => CATALOG.cards[c] === 'rare');
const base = baselineOf(CARD, null, null);

// ---- the formulas ----------------------------------------------------------------------------------------------------
test('no sales: the value is the baseline, labelled so, and nothing is invented', () => {
  const a = analyzeCard({ obs: [], now: NOW, baseline: base, tier: 0, vol: {}, asks: [], bids: [], supply: 0 });
  assert.equal(a.averageValue, null); assert.equal(a.fairValue, base); assert.equal(a.confidence, 'none');
  assert.equal(a.last, null); assert.equal(a.observed, null); assert.equal(a.volatility, null); assert.equal(a.liquidity, null);
  assert.deepEqual(Object.values(a.change), [null, null, null, null, null]);
  assert.equal(a.timeToSell, null); assert.equal(a.target.basis === undefined, true); assert.equal(a.basis, 'baseline');
  assert.equal(a.spread.real, false);
});

test('one sale: it is the Average Value, pulled only a little from the baseline, with low confidence and no invented trend', () => {
  const a = analyzeCard({ obs: [[NOW - HOUR, 200]], now: NOW, baseline: 100, tier: 2, vol: { h24: { units: 1, credits: 200 }, d7: { units: 1, credits: 200 } }, asks: [], bids: [], supply: 0 });
  assert.equal(a.averageValue, 200);
  const w = Math.pow(0.5, HOUR / (14 * DAY));
  assert.equal(a.fairValue, Math.round((100 * 6 + 200 * w) / (6 + w)));
  assert.ok(a.fairValue > 100 && a.fairValue < 150);
  assert.equal(a.confidence, 'low'); assert.equal(a.volatility, null); assert.equal(a.timeToSell, null);
  assert.equal(a.change.h24, null, 'one sale has no change to report');
  assert.equal(a.basis, 'baseline', 'targets lean on the baseline until there are four sales');
});

test('an outlier is capped for the mean and cannot move the median at all', () => {
  const obs = Array.from({ length: 10 }, (_, i) => [NOW - (10 - i) * HOUR, 100]).concat([[NOW - HOUR, 10000]]);
  const a = analyzeCard({ obs, now: NOW, baseline: 100, tier: 2, vol: {}, asks: [], bids: [], supply: 0 });
  assert.equal(a.mechanic, 'scarce');
  assert.equal(a.averageValue, 100, 'the scarce mechanic uses the weighted median');
  assert.equal(a.observed.vwap, Math.round((1000 + 10000) / 11), 'the plain volume-weighted mean is reported as it is, uncapped');
  assert.ok(a.observed.weightedMean < 160, 'the capped mean stays near the others: ' + a.observed.weightedMean);
});

test('a card that trades often is judged on recent trades with the mean', () => {
  const obs = Array.from({ length: 15 }, (_, i) => [NOW - (15 - i) * 2 * HOUR, 50 + (i % 3)]);
  const a = analyzeCard({ obs, now: NOW, baseline: 40, tier: 0, vol: { d7: { units: 15, credits: 770 } }, asks: [51], bids: [49], supply: 1 });
  assert.equal(a.mechanic, 'frequent'); assert.equal(a.confidence, 'high');
  assert.ok(Math.abs(a.averageValue - 51) <= 1);
  assert.equal(a.spread.real, true); assert.equal(a.spread.abs, 2);
});

test('changes compare against the last sale at or before the start, and are withheld when the reference is stale', () => {
  const obs = [[NOW - 3 * DAY, 100], [NOW - 20 * HOUR, 110], [NOW - HOUR, 121]];
  assert.deepEqual(changeOver(obs, NOW, DAY).from, { price: 100, at: NOW - 3 * DAY });
  const c = changeOver(obs, NOW, DAY);
  assert.ok(Math.abs(c.pct - 0.21) < 1e-9); assert.equal(c.abs, 21);
  assert.equal(changeOver(obs, NOW, 7 * DAY), null, 'no sale old enough to compare against');
  const stale = [[NOW - 40 * DAY, 100], [NOW - HOUR, 130]];
  assert.equal(changeOver(stale, NOW, DAY), null, 'a 40 day old reference is not a 24 hour change');
  assert.equal(changeOver(stale, NOW, 7 * DAY), null);
  assert.ok(changeOver(stale, NOW, Infinity).pct > 0.29);
});

test('time to sell is given only from three or more sales, as the usual gap times the queue ahead', () => {
  const obs = [[NOW - 30 * HOUR, 100], [NOW - 20 * HOUR, 100], [NOW - 10 * HOUR, 100]];
  const none = analyzeCard({ obs: obs.slice(0, 2), now: NOW, baseline: 100, tier: 0, vol: {}, asks: [], bids: [], supply: 0 });
  assert.equal(none.timeToSell, null);
  const a = analyzeCard({ obs, now: NOW, baseline: 100, tier: 0, vol: {}, asks: [], bids: [], supply: 0 });
  assert.equal(a.timeToSell.medianHours, 10);
  const queued = analyzeCard({ obs, now: NOW, baseline: 100, tier: 0, vol: {}, asks: [90, 95, 99], bids: [], supply: 3 });
  assert.equal(queued.timeToSell.medianHours, 40, 'three cheaper listings ahead: four times the wait');
});

test('targets come from executions, demand and spread, never from the lowest ask minus a number', () => {
  const obs = Array.from({ length: 12 }, (_, i) => [NOW - (12 - i) * 6 * HOUR, 100 + (i % 4) * 5]);
  const calm = analyzeCard({ obs, now: NOW, baseline: 100, tier: 1, vol: {}, asks: [], bids: [], supply: 0 });
  const cheapAsk = analyzeCard({ obs, now: NOW, baseline: 100, tier: 1, vol: {}, asks: [20], bids: [], supply: 1 });
  const dearAsk = analyzeCard({ obs, now: NOW, baseline: 100, tier: 1, vol: {}, asks: [5000], bids: [], supply: 1 });
  assert.equal(calm.basis, 'executions');
  [calm, cheapAsk, dearAsk].forEach((a) => {
    assert.ok(a.target.buy.low <= a.target.buy.high && a.target.buy.high < a.target.sell.low && a.target.sell.low <= a.target.sell.high, JSON.stringify(a.target));
    assert.ok(a.target.sell.low >= 100 && a.target.sell.high <= 140, 'near what was executed: ' + JSON.stringify(a.target));
  });
  const demand = analyzeCard({ obs, now: NOW, baseline: 100, tier: 1, vol: {}, asks: [], bids: [100, 100, 99, 98], supply: 0 });
  assert.ok(demand.target.buy.high >= calm.target.buy.high, 'open buy orders push the range up, never down');
  assert.equal(calm.expectedProceeds, calm.suggestedAsk - feeFor(calm.suggestedAsk), 'expected proceeds are after the fee');
});

test('series are bucketed by UTC time of the sale, whatever the machine\'s time zone', () => {
  const before = Date.UTC(2026, 9, 13, 23, 30), after = Date.UTC(2026, 9, 14, 0, 30);
  const rows = [{ at: before, card_key: CARD + '||', price: 10 }, { at: after, card_key: CARD + '||', price: 12 }, { at: after + 1000, card_key: CARD + '||', price: 14 }];
  const candles = buildCandles(rows, '30d', after + HOUR, 'price');
  assert.equal(candles.length, 2);
  assert.deepEqual([candles[1].open, candles[1].close, candles[1].volume, candles[1].credits], [12, 14, 2, 26]);
  assert.equal(candles[0].at, Date.UTC(2026, 9, 13, 12), 'a daily bucket is centred on 12:00 UTC');
});

test('an index point is a price against that card\'s own baseline, so cheap and dear cards share a line', () => {
  const dear = baselineOf(RARE, null, null);
  const rows = [{ at: NOW - HOUR, card_key: CARD + '||', price: base * 2 }, { at: NOW - 30 * MIN, card_key: RARE + '||', price: dear }];
  const [c] = buildCandles(rows, '24h', NOW, 'index');
  assert.equal(c.open, 200); assert.equal(c.close, 100); assert.equal(c.high, 200); assert.equal(c.low, 100);
  assert.ok(candleChange([{ at: NOW - 2 * DAY, close: 100 }, { at: NOW - HOUR, close: 110 }], NOW, DAY) > 0.099);
});

test('quantiles and medians are what they say', () => {
  assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5); assert.equal(median([]), null);
  assert.equal(weightedQuantile([10, 20, 30], [1, 1, 1], 0.5), 20);
  assert.equal(weightedQuantile([10, 20, 30], [1, 1, 8], 0.5), 30, 'weight moves the quantile');
  const rows = [{ at: NOW - DAY, card_id: CARD, card_key: CARD + '||', price: 10 }, { at: NOW - HOUR, card_id: CARD, card_key: CARD + '||', price: 15 }];
  const [p] = perCard(rows, NOW);
  assert.equal(p.units7, 2); assert.equal(p.credits7, 25); assert.equal(p.lastPrice, 15);
});

// ---- the endpoints, on a database with labeled fixtures ------------------------------------------------------------------
let server, cached;
before(async () => { server = await start(8831, {}); cached = await start(8832, { ANALYTICS_CACHE: 'on' }); });
after(() => stopAll());

// A labeled fixture: n sales of one exact card, ending `endAgo` ms ago, on a given interval, from a price function.
function fixtureRows(srv, spec) {
  const statements = [];
  const who = "(SELECT id FROM accounts ORDER BY created_at LIMIT 1)", who2 = "(SELECT id FROM accounts ORDER BY created_at DESC LIMIT 1)";
  for (let i = 0; i < spec.n; i++) {
    const at = spec.end - (spec.n - 1 - i) * spec.every, price = spec.price(i), id = 'trd_fixture_' + spec.tag + '_' + i;
    statements.push("INSERT INTO trades (id, at, kind, listing_id, seller_id, buyer_id, price, fee, item_count, card_id, variant_id, skin_id, items, attributed) VALUES ('" + id + "', " + at + ", 'fixed', NULL, " + who + ', ' + who2 + ', ' + price + ', ' + feeFor(price) + ", 1, '" + spec.card + "', NULL, NULL, '[{\"c\":\"" + spec.card + "\",\"v\":null,\"k\":null,\"s\":\"CBL-FIXT-" + String(i).padStart(6, '0') + "\"}]', 1)");
    statements.push("INSERT INTO price_observations (at, card_key, price, kind, trade_id, card_id) VALUES (" + at + ", '" + spec.card + "||', " + price + ", 'fixed', '" + id + "', '" + spec.card + "')");
  }
  runSql(srv, statements);
}

test('high and low liquidity fixtures: exact totals, honest series, and only real sales are counted', async () => {
  const a = await player(server, { cards: 2 }), b = await player(server, { cards: 1 });
  const now = Date.now();
  // fixture: a busy common card (48 sales over 12 days) and a rare one with a single old sale
  fixtureRows(server, { tag: 'busy', card: CARD, n: 48, every: 6 * HOUR, end: now - HOUR, price: (i) => 40 + (i % 7) });
  fixtureRows(server, { tag: 'rare', card: RARE, n: 1, every: HOUR, end: now - 20 * DAY, price: () => baselineOf(RARE, null, null) * 2 });
  const busy = await call(server, 'GET', '/v1/analytics/card?cardId=' + CARD + '&window=30d', null, a.token, { at: now });
  assert.equal(busy.status, 200, busy.text);
  const an = busy.data.analytics;
  const expectUnits24 = sql(server, "SELECT COUNT(*) AS n FROM price_observations WHERE card_key = '" + CARD + "||' AND at > " + (now - DAY))[0].n;
  assert.equal(an.volume.h24.units, expectUnits24); assert.equal(an.volume.all.units, 48);
  assert.equal(an.volume.d30.credits, sql(server, "SELECT SUM(price) AS s FROM price_observations WHERE card_key = '" + CARD + "||'")[0].s);
  assert.equal(an.mechanic, 'frequent'); assert.equal(an.confidence, 'high');
  assert.ok(an.timeToSell && an.timeToSell.medianHours === 6, JSON.stringify(an.timeToSell));
  assert.equal(an.range30.low, 40); assert.equal(an.range30.high, 46);
  assert.equal(busy.data.tradesCounted, 48);
  assert.ok(busy.data.candles.length >= 12 && busy.data.candles.every((c) => c.volume >= 1), 'buckets only where there were sales');
  // the rare card: one sale, stale for a 24 hour comparison, low confidence
  const rare = await call(server, 'GET', '/v1/analytics/card?cardId=' + RARE + '&window=24h', null, a.token, { at: now });
  assert.equal(rare.data.analytics.volume.all.units, 1); assert.equal(rare.data.analytics.confidence, 'none', 'a sale 20 days ago is not recent');
  assert.equal(rare.data.analytics.change.h24, null); assert.equal(rare.data.candles.length, 0, 'no sales in the window means no candles, not an invented line');
  // real events: a Quick Sell, a swap and a bundle sale never add to volume or the series
  const before = await call(server, 'GET', '/v1/analytics/card?cardId=' + CARD + '&window=7d', null, a.token, { at: now });
  const seller = await player(server, { cards: 3 }), buyer = await player(server, { credits: 5000 });
  const qs = await call(server, 'POST', '/v1/sell', { instanceIds: [seller.cards[0].id] }, seller.token, { at: now });
  assert.equal(qs.status, 200, qs.text);
  const bundle = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[1].id, seller.cards[2].id], ask: 120 }, seller.token, { at: now });
  assert.equal((await call(server, 'POST', '/v1/listings/' + bundle.data.listingId + '/buy', { expectedPrice: 120 }, buyer.token, { at: now })).status, 200);
  const after = await call(server, 'GET', '/v1/analytics/stocks?scope=index&window=24h', null, a.token, { at: now });
  const idxBefore = await call(server, 'GET', '/v1/analytics/stocks?scope=index&window=24h', null, a.token, { at: now - 1 });
  assert.equal(after.data.aggregate.volume24h, idxBefore.data.aggregate.volume24h, 'the redemption and the bundle are not market volume');
  assert.ok(before.data.analytics.volume.d7.units === (await call(server, 'GET', '/v1/analytics/card?cardId=' + CARD + '&window=7d', null, a.token, { at: now })).data.analytics.volume.d7.units);
  void b;
});

test('a real single-card sale is counted once, at the price, and appears in the series and the totals', async () => {
  const seller = await player(server, { cards: 1 }), buyer = await player(server, { credits: 1000 });
  const card = seller.cards[0].cardId, now = Date.now() + HOUR;
  const key = keyOf(card, null, null);
  const before = sql(server, "SELECT COUNT(*) AS n FROM price_observations WHERE card_key = '" + key + "'")[0].n;
  const made = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 77 }, seller.token, { at: now });
  assert.equal((await call(server, 'POST', '/v1/listings/' + made.data.listingId + '/buy', { expectedPrice: 77 }, buyer.token, { at: now + 1000 })).status, 200);
  assert.equal(sql(server, "SELECT COUNT(*) AS n FROM price_observations WHERE card_key = '" + key + "'")[0].n, before + 1);
  const r = await call(server, 'GET', '/v1/analytics/card?cardId=' + card + '&window=24h', null, buyer.token, { at: now + 2000 });
  assert.equal(r.data.analytics.last.price, 77);
  assert.equal(r.data.analytics.volume.h24.units, 1 + (before ? sql(server, "SELECT COUNT(*) AS n FROM price_observations WHERE card_key = '" + key + "' AND at > " + (now - DAY + 2000) + ' AND at < ' + now)[0].n : 0));
  const group = await call(server, 'GET', '/v1/analytics/stocks?scope=rarity&id=' + CATALOG.cards[card] + '&window=24h', null, buyer.token, { at: now + 2000 });
  assert.ok(group.data.tradesCounted >= 1 && group.data.candles.length >= 1 && group.data.source === 'players');
  const mv = await call(server, 'GET', '/v1/analytics/movers', null, buyer.token, { at: now + 2000 });
  assert.ok(Array.isArray(mv.data.active) && mv.data.source === 'players');
});

test('portfolio: cost basis is what was paid, imports have none, profit is after the fee and only where the basis is known', async () => {
  const seller = await player(server, { cards: 1 }), trader = await player(server, { cards: 2, credits: 2000 }), end = await player(server, { credits: 2000 });
  const now = Date.now() + 2 * HOUR;
  const l1 = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 100 }, seller.token, { at: now });
  assert.equal((await call(server, 'POST', '/v1/listings/' + l1.data.listingId + '/buy', { expectedPrice: 100 }, trader.token, { at: now + 1 })).status, 200);
  let p = (await call(server, 'GET', '/v1/portfolio', null, trader.token, { at: now + 2 })).data;
  const bought = p.holdings.find((h) => h.instanceId === seller.cards[0].id);
  assert.equal(bought.basis, 100); assert.equal(bought.acquiredVia, 'fixed');
  assert.equal(p.cards.noCostBasis, 2, 'the two imported cards have no cost basis'); assert.equal(p.cards.withCostBasis, 1);
  assert.equal(p.realized.profit, null, 'nothing sold with a known basis yet');
  // sell the bought card for 150, and one imported card for 60
  const l2 = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 150 }, trader.token, { at: now + 10 });
  assert.equal((await call(server, 'POST', '/v1/listings/' + l2.data.listingId + '/buy', { expectedPrice: 150 }, end.token, { at: now + 11 })).status, 200);
  const imported = trader.cards.find((c) => c.id !== seller.cards[0].id);
  const l3 = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [imported.id], ask: 60 }, trader.token, { at: now + 12 });
  assert.equal((await call(server, 'POST', '/v1/listings/' + l3.data.listingId + '/buy', { expectedPrice: 60 }, end.token, { at: now + 13 })).status, 200);
  p = (await call(server, 'GET', '/v1/portfolio', null, trader.token, { at: now + 20 })).data;
  assert.equal(p.realized.sales.count, 2); assert.equal(p.realized.sales.volume, 210); assert.equal(p.realized.sales.fees, feeFor(150) + feeFor(60));
  assert.equal(p.realized.sales.withBasis, 1);
  assert.equal(p.realized.profit, 150 - feeFor(150) - 100, 'only the sale with a known basis counts: proceeds after the fee minus cost');
  const held = (await call(server, 'GET', '/v1/portfolio', null, end.token, { at: now + 20 })).data;
  assert.equal(held.cards.withCostBasis, 2); assert.ok(held.unrealized && held.unrealized.cards === 2 && held.unrealized.costBasis === 210);
  assert.equal(held.realized.bought.count, 2);
  // the export carries the player's own rows and no private ids
  const csv = await fetch(server.base + '/v1/export?what=trades&format=csv', { headers: { authorization: 'Bearer ' + trader.token, 'x-test-now': String(now + 30) } });
  const text = await csv.text();
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.ok(text.split('\n')[0].includes('counterparty') && text.includes('No cost basis') && !/acct_|ses_/.test(text));
  const json = await (await fetch(server.base + '/v1/export?what=holdings', { headers: { authorization: 'Bearer ' + trader.token } })).json();
  assert.ok(json.items.every((i) => i.cost_basis === 'No cost basis' || Number.isInteger(i.cost_basis)));
});

test('alerts reach the in-app inbox once, only for real listings, never for your own', async () => {
  const watcher = await player(server, { cards: 1, credits: 100 }), seller = await player(server, { cards: 3 });
  const card = seller.cards[0].cardId, now = Date.now() + 3 * HOUR;
  const price = await call(server, 'POST', '/v1/alerts', { kind: 'price', cardId: card, maxPrice: 50, label: 'cheap one' }, watcher.token);
  assert.equal(price.status, 200, price.text);
  const search = await call(server, 'POST', '/v1/alerts', { kind: 'search', query: { rarity: [CATALOG.cards[card]], maxPrice: 40 } }, watcher.token);
  assert.equal(search.status, 200, search.text);
  assert.equal((await call(server, 'POST', '/v1/alerts', { kind: 'search', query: {} }, watcher.token)).status, 422);
  const dear = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 90 }, seller.token, { at: now });
  const inbox0 = (await call(server, 'GET', '/v1/activity', null, watcher.token, { at: now })).data.notifications.filter((n) => n.kind === 'price');
  assert.equal(inbox0.length, 0, 'above both thresholds: silence');
  await call(server, 'PUT', '/v1/listings/' + dear.data.listingId, { ask: 35 }, seller.token, { at: now + 1 });
  const inbox1 = (await call(server, 'GET', '/v1/activity', null, watcher.token, { at: now + 2 })).data.notifications.filter((n) => n.kind === 'price');
  assert.equal(inbox1.length, 2, 'the price alert and the saved search each fire once: ' + JSON.stringify(inbox1.map((n) => n.text)));
  await call(server, 'PUT', '/v1/listings/' + dear.data.listingId, { ask: 30 }, seller.token, { at: now + 3 });
  const inbox2 = (await call(server, 'GET', '/v1/activity', null, watcher.token, { at: now + 4 })).data.notifications.filter((n) => n.kind === 'price');
  assert.equal(inbox2.length, 2, 'a repeat reprice of the same listing does not repeat the alert');
  // an alert never fires for the watcher's own listing
  const mine = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [watcher.cards[0].id], ask: 5 }, watcher.token, { at: now + 5 });
  assert.equal(mine.status, 200);
  const inbox3 = (await call(server, 'GET', '/v1/activity', null, watcher.token, { at: now + 6 })).data.notifications.filter((n) => n.kind === 'price');
  assert.equal(inbox3.length, 2);
  const list = (await call(server, 'GET', '/v1/alerts', null, watcher.token)).data.items;
  assert.equal(list.length, 2);
  assert.equal((await call(server, 'DELETE', '/v1/alerts/' + price.data.alertId, null, watcher.token, { key: null })).status, 200);
  assert.equal((await call(server, 'DELETE', '/v1/alerts/' + price.data.alertId, null, watcher.token, { key: null })).status, 404);
});

test('alerts: a crowd of alerts that match nothing cannot starve a real one, the cap holds under a race, and bad finishes are refused', async () => {
  const crowd = [];
  for (let i = 0; i < 16; i++) crowd.push(await player(server, {}));
  // 16 accounts x 20 saved searches that match nothing: more than the old fixed window of 300 alerts
  for (const c of crowd) {
    const made = await Promise.all(Array.from({ length: 20 }, (_, n) => call(server, 'POST', '/v1/alerts', { kind: 'search', query: { q: 'nomatch-' + n } }, c.token)));
    assert.ok(made.every((r) => r.status === 200), made.map((r) => r.text).join(' '));
  }
  const over = await call(server, 'POST', '/v1/alerts', { kind: 'search', query: { q: 'one-too-many' } }, crowd[0].token);
  assert.equal(over.status, 409, 'the 21st alert is refused');
  // the cap is part of the insert: a burst of 8 from a fresh account makes at most 20 in all
  const burster = await player(server, {});
  const burst = await Promise.all(Array.from({ length: 24 }, (_, n) => call(server, 'POST', '/v1/alerts', { kind: 'search', query: { q: 'burst-' + n } }, burster.token)));
  assert.equal(burst.filter((r) => r.status === 200).length, 20);
  const watcher = await player(server, {}), seller = await player(server, { cards: 1 });
  const card = seller.cards[0].cardId, now = Date.now() + 5 * HOUR;
  assert.equal((await call(server, 'POST', '/v1/alerts', { kind: 'price', cardId: card, maxPrice: 500 }, watcher.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/alerts', { kind: 'price', cardId: card, maxPrice: 500, variantId: 'not-a-finish' }, watcher.token)).status, 422);
  const made = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 100 }, seller.token, { at: now });
  assert.equal(made.status, 200, made.text);
  const inbox = (await call(server, 'GET', '/v1/activity', null, watcher.token, { at: now + 1 })).data.notifications.filter((n) => n.kind === 'price');
  assert.equal(inbox.length, 1, 'the alert that matched was delivered although 320 others were registered first');
  // an unknown finish or skin is refused before anything is read, so a caller cannot mint cache keys
  assert.equal((await call(server, 'GET', '/v1/analytics/card?cardId=' + CARD + '&variantId=made-up&window=7d', null, watcher.token, { at: now })).status, 404);
  assert.equal((await call(server, 'GET', '/v1/analytics/stocks?scope=card&id=' + CARD + '&variantId=made-up', null, watcher.token, { at: now })).status, 404);
  const a1 = await call(server, 'GET', '/v1/analytics/stocks?scope=index&id=one&window=7d', null, watcher.token, { at: now });
  const a2 = await call(server, 'GET', '/v1/analytics/stocks?scope=index&id=two&window=7d', null, watcher.token, { at: now });
  assert.deepEqual(a1.data.title, a2.data.title); assert.equal(a1.data.id, ''); assert.equal(a2.data.id, '');
});

test('search: filters narrow on indexes, pages never repeat or skip, and the plan does not scan the table', async () => {
  const s = await player(server, { cards: 14, cardList: Object.keys(CATALOG.cards).filter((c) => ['basic', 'common', 'uncommon', 'rare'].includes(CATALOG.cards[c])).slice(0, 14) });
  const now = Date.now() + 4 * HOUR;
  for (let i = 0; i < s.cards.length; i++) {
    const r = await call(server, 'POST', '/v1/listings', { kind: i % 3 === 0 ? 'auction' : 'fixed', instanceIds: [s.cards[i].id], ask: 10 + i * 7, start: 10 + i * 7, durationMs: 2 * DAY }, s.token, { at: now + i });
    assert.equal(r.status, 200, r.text);
  }
  const viewer = await player(server, {});
  const all = [];
  let cursor = null;
  for (let page = 0; page < 10; page++) {
    const r = await call(server, 'GET', '/v1/listings?mine=0&sort=price-asc&limit=5&seller=' + encodeURIComponent(s.alias) + (cursor ? '&cursor=' + cursor : ''), null, viewer.token, { at: now + 100 });
    assert.equal(r.status, 200, r.text);
    all.push(...r.data.items.map((l) => l.id)); cursor = r.data.nextCursor;
    assert.ok(r.data.cost && r.data.cost.rowsRead >= 0);
    if (!cursor) break;
  }
  assert.equal(all.length, 14); assert.equal(new Set(all).size, 14, 'pages never repeat');
  const auctions = await call(server, 'GET', '/v1/listings?kind=auction&seller=' + encodeURIComponent(s.alias), null, viewer.token, { at: now + 100 });
  assert.equal(auctions.data.items.length, 5); assert.ok(auctions.data.items.every((l) => l.format === 'auction'));
  assert.equal(auctions.data.total, 5, 'the count follows the filters');
  const cheap = await call(server, 'GET', '/v1/listings?max=40&seller=' + encodeURIComponent(s.alias), null, viewer.token, { at: now + 100 });
  assert.ok(cheap.data.items.length > 0 && cheap.data.items.every((l) => l.ask <= 40));
  const byName = await call(server, 'GET', '/v1/listings?q=' + encodeURIComponent('zzzz-no-such-card'), null, viewer.token, { at: now + 100 });
  assert.equal(byName.data.total, 0);
  // the plan: every listing search is served by an index
  const { searchPlan } = await import('../src/views.js');
  const shapes = ['kind=auction&sort=ending', 'rarity=rare,common&max=50', 'brand=NVIDIA', 'generation=gen1&min=5', 'cardId=' + CARD, 'seller=' + s.alias, 'reserve=unmet&minBids=1'];
  for (const q of shapes) {
    const plan = searchPlan(new URLSearchParams(q), { accountId: 'x' }, now);
    const text = 'SELECT l.id FROM listings l WHERE ' + plan.where.join(' AND ') + ' ORDER BY l.price LIMIT 51';
    const rows = sql(server, 'EXPLAIN QUERY PLAN ' + text.replace(/\?/g, () => "'x'"));
    const detail = rows.map((r) => r.detail).join(' | ');
    assert.ok(/USING (COVERING )?INDEX|USING INTEGER PRIMARY KEY/.test(detail) && !/^SCAN l\b/.test(rows[0].detail), q + ' -> ' + detail);
  }
});

test('the analytics are cached for everyone, and the cache never changes a figure', async () => {
  const a = await player(cached, { cards: 1 });
  const now = Date.now();
  const first = await call(cached, 'GET', '/v1/analytics/stocks?scope=index&window=7d', null, a.token, { at: now });
  const second = await call(cached, 'GET', '/v1/analytics/stocks?scope=index&window=7d', null, (await player(cached, {})).token, { at: now });
  assert.equal(first.data.cache, 'miss'); assert.equal(second.data.cache, 'hit');
  assert.deepEqual(Object.assign({}, second.data, { cache: 0 }), Object.assign({}, first.data, { cache: 0 }));
  void admin; void wallet;
});

test('Quick Sell records the cost basis as a number or nothing, never a label; the realized loss is the quote minus what was paid', async () => {
  const seller = await player(server, { cards: 1 }), me = await player(server, { cards: 1, credits: 3000 });
  const now = Date.now() + 5 * HOUR;
  const l = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 500 }, seller.token, { at: now });
  assert.equal((await call(server, 'POST', '/v1/listings/' + l.data.listingId + '/buy', { expectedPrice: 500 }, me.token, { at: now + 1 })).status, 200);
  const sold = await call(server, 'POST', '/v1/sell', { instanceIds: [seller.cards[0].id, me.cards[0].id] }, me.token, { at: now + 2 });
  assert.equal(sold.status, 200, sold.text);
  const rows = sql(server, "SELECT instance_id, basis, quote, typeof(basis) AS t FROM redemptions WHERE op_id = '" + sold.data.receiptId + "'");
  const bought = rows.find((r) => r.instance_id === seller.cards[0].id), imported = rows.find((r) => r.instance_id === me.cards[0].id);
  assert.equal(bought.t, 'integer'); assert.equal(bought.basis, 500);
  assert.equal(imported.t, 'null', 'an imported card has no basis');
  const p = (await call(server, 'GET', '/v1/portfolio', null, me.token, { at: now + 3 })).data;
  assert.equal(p.realized.quickSell.withBasis, 1);
  assert.equal(p.realized.quickSell.profit, bought.quote - 500, 'a loss against the price paid, counted once');
});

test('every analytics answer reports what it cost, and a card answer stays within five statements', async () => {
  const a = await player(server, {});
  const card = await call(server, 'GET', '/v1/analytics/card?cardId=' + CARD + '&window=30d', null, a.token, { at: Date.now() });
  assert.ok(card.data.cost.queries <= 5, JSON.stringify(card.data.cost));
  assert.ok(card.data.cost.rowsRead >= 0);
  const stocks = await call(server, 'GET', '/v1/analytics/stocks?scope=rarity&id=common&window=30d', null, a.token, { at: Date.now() });
  assert.equal(stocks.data.cost.queries, 2);
});
