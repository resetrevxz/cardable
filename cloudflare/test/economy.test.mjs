// The rules of the market as pure functions: fee rounding, bid increments, proxy bidding, auction close, swap
// conditions and the Quick Sell quote. No Worker and no database: these are the numbers the statements enforce, and
// they must hold for every input, so the auction rules are also checked against thousands of generated bid sequences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, applyBid, checkWants, closeAuction, feeFor, incrementFor, normalizeWants, quickSellQuote, resolveAuction, serialFactor, baselineOf, fairInfo } from '../src/economy.js';
import { CATALOG } from '../src/catalog.js';
import { rnd } from './helpers.mjs';

test('the 2% fee rounds half up, is at least one Credit and is never more than the price', () => {
  const table = [[1, 1], [24, 1], [49, 1], [50, 1], [74, 1], [75, 2], [124, 2], [125, 3], [1000, 20], [99999, 2000], [100000000, 2000000]];
  table.forEach(([price, fee]) => assert.equal(feeFor(price), fee, 'fee of ' + price));
  for (let p = 1; p <= 5000; p++) { const f = feeFor(p); assert.ok(f >= 1 && f <= p && Number.isInteger(p - f)); }
  assert.equal(feeFor(0), 0);
});

test('the minimum raise is 5% or one Credit, or the seller\'s own step', () => {
  assert.equal(incrementFor(1), 1); assert.equal(incrementFor(10), 1); assert.equal(incrementFor(40), 2); assert.equal(incrementFor(1000), 50);
  assert.equal(incrementFor(1000, 7), 7);
});

test('proxy bidding: the highest maximum leads, the price is one step over the runner-up, ties go to the earlier bidder', () => {
  const a = { start: 10, reserve: null, step: null };
  assert.deepEqual(pick(resolveAuction(a, [])), { lead: null, price: 10, bidders: 0, minNext: 10 });
  assert.deepEqual(pick(resolveAuction(a, [{ id: 'x', max: 50, seq: 1 }])), { lead: 'x', price: 10, bidders: 1, minNext: 11 });
  assert.deepEqual(pick(resolveAuction(a, [{ id: 'x', max: 50, seq: 1 }, { id: 'y', max: 30, seq: 2 }])), { lead: 'x', price: 32, bidders: 2, minNext: 34 });
  // the leader's maximum caps the price: a runner-up one step below pays no more than the leader's maximum
  assert.equal(resolveAuction(a, [{ id: 'x', max: 50, seq: 1 }, { id: 'y', max: 49, seq: 2 }]).price, 50);
  // equal maximums: the earlier bid keeps the lead and pays the maximum
  const tie = resolveAuction(a, [{ id: 'late', max: 40, seq: 5 }, { id: 'early', max: 40, seq: 2 }]);
  assert.equal(tie.lead.id, 'early'); assert.equal(tie.price, 40);
});

test('a reserve shows as the price once the leader\'s maximum reaches it, and an auction below it does not sell', () => {
  const a = { start: 10, reserve: 100, step: null };
  assert.equal(resolveAuction(a, [{ id: 'x', max: 99, seq: 1 }]).reserveMet, false);
  assert.equal(closeAuction(a, [{ id: 'x', max: 99, seq: 1 }]).sold, false);
  const met = resolveAuction(a, [{ id: 'x', max: 150, seq: 1 }, { id: 'y', max: 20, seq: 2 }]);
  assert.equal(met.price, 100); assert.equal(met.reserveMet, true);
  const out = closeAuction(a, [{ id: 'x', max: 150, seq: 1 }, { id: 'y', max: 20, seq: 2 }]);
  assert.deepEqual([out.sold, out.winner, out.price], [true, 'x', 100]);
  assert.equal(closeAuction(a, []).sold, false);
});

test('bids are refused with a reason: too low, not higher than your own, not valid', () => {
  const a = { start: 10, reserve: null, step: null };
  const one = [{ id: 'x', max: 50, seq: 1 }];
  assert.equal(applyBid(a, one, 'y', 10, 2).error, 'increment');
  assert.equal(applyBid(a, one, 'y', 11, 2).ok, true);
  assert.equal(applyBid(a, one, 'x', 50, 2).error, 'lower');
  assert.equal(applyBid(a, one, 'x', 60, 2).ok, true, 'the leader may raise their own maximum by any amount');
  assert.equal(applyBid(a, one, 'y', 0, 2).error, 'invalid');
  assert.equal(applyBid(a, one, 'y', 1.5, 2).error, 'invalid');
  assert.equal(applyBid(a, one, 'y', Number.MAX_SAFE_INTEGER + 2, 2).error, 'invalid');
});

test('property: 3000 generated auctions keep every proxy-bidding invariant', () => {
  const rand = rnd(20260);
  for (let run = 0; run < 3000; run++) {
    const a = { start: 1 + Math.floor(rand() * 50), reserve: rand() < 0.4 ? 20 + Math.floor(rand() * 400) : null, step: rand() < 0.2 ? 1 + Math.floor(rand() * 9) : null };
    if (a.reserve != null && a.reserve < a.start) a.reserve = a.start;
    let proxies = [], seq = 0, lastPrice = a.start;
    for (let n = 0; n < 12; n++) {
      const who = 'p' + Math.floor(rand() * 5), max = 1 + Math.floor(rand() * 800);
      const before = resolveAuction(a, proxies);
      const r = applyBid(a, proxies, who, max, ++seq);
      if (!r.ok) {
        // a refusal changes nothing, and always names a floor the bidder could meet
        assert.equal(resolveAuction(a, proxies).price, before.price);
        continue;
      }
      proxies = r.proxies;
      const view = r.view;
      assert.ok(view.price >= a.start, 'price never below the start');
      assert.ok(view.price >= lastPrice, 'price never falls');
      assert.ok(view.lead.max >= view.price, 'price never exceeds the leader\'s maximum');
      assert.ok(proxies.every((p) => p.max <= view.lead.max), 'the leader has the highest maximum');
      const tied = proxies.filter((p) => p.max === view.lead.max);
      assert.equal(view.lead.seq, Math.min(...tied.map((p) => p.seq)), 'ties go to the earliest');
      assert.ok(view.minNext > view.price);
      lastPrice = view.price;
    }
    const out = closeAuction(a, proxies);
    if (out.sold) { assert.ok(out.price <= out.view.lead.max); assert.ok(!a.reserve || out.price >= a.reserve || out.view.lead.max >= a.reserve); }
    else assert.ok(!proxies.length || (a.reserve && out.view.lead.max < a.reserve));
  }
});

test('swap conditions are evaluated clause by clause, in plain language', () => {
  const [c1, c2] = Object.keys(CATALOG.cards);
  const items = [{ cardId: c1, variantId: null, skinId: null, serial: 'CBL-AAAA-000500', value: 40 }];
  const wants = normalizeWants({ cardIds: [c2], minItems: 2, minValuePct: 150, serialMax: 100, bogus: true });
  assert.deepEqual(Object.keys(wants).sort(), ['cardIds', 'minItems', 'minValuePct', 'serialMax']);
  const r = checkWants(wants, items, (i) => i.value, 100, 0);
  assert.equal(r.ok, false); assert.equal(r.failures.length, 4);
  assert.equal(checkWants(null, items, (i) => i.value, 100, 0).ok, true);
  assert.equal(checkWants({ minValuePct: 100 }, items, (i) => i.value, 100, 60).ok, true, 'Credits count toward a value condition');
  assert.equal(normalizeWants({ cardIds: ['not-a-card'] }), null);
});

test('Quick Sell quotes sit below Average Value, inside a band around the baseline, rounded down, never under 1', () => {
  const id = Object.keys(CATALOG.cards)[0], base = baselineOf(id, null, null);
  const fair = fairInfo([], 1e12, base);
  const q = quickSellQuote({ cardId: id, serial: 'CBL-AAAA-000500' }, fair);
  const exact = Math.max(1, Math.round(base * serialFactor('CBL-AAAA-000500')));
  assert.equal(q.quote, Math.max(1, Math.floor(exact * 0.55)));
  assert.ok(q.quote < base);
  // a wildly high or low market cannot move the quote outside the band
  const hot = quickSellQuote({ cardId: id, serial: 'CBL-AAAA-000500' }, Object.assign({}, fair, { average: base * 50 }));
  assert.equal(hot.quote, Math.floor(Math.floor(exact * 1.5) * 0.55));
  const cold = quickSellQuote({ cardId: id, serial: 'CBL-AAAA-000500' }, Object.assign({}, fair, { average: 1 }));
  assert.ok(cold.quote >= 1);
});

test('Average Value is the baseline until players trade, then follows the trades and is pulled by outliers only a little', () => {
  const base = 100, now = 10 * 86400000;
  assert.equal(fairInfo([], now, base).average, 100); assert.equal(fairInfo([], now, base).confidence, 'none');
  const few = fairInfo([[now - 1000, 200]], now, base);
  assert.ok(few.average > 100 && few.average < 200); assert.equal(few.confidence, 'low');
  const many = fairInfo(Array.from({ length: 14 }, (_, i) => [now - i * 3600000, 200]), now, base);
  assert.ok(many.average > 160 && many.average < 200 && many.confidence === 'high');
  const spike = fairInfo(Array.from({ length: 13 }, (_, i) => [now - i * 3600000, 100]).concat([[now, 5000]]), now, base);
  assert.ok(spike.average < 140, 'one huge sale is clamped');
});

test('rules the client reads are consistent', () => {
  assert.ok(RULES.auction.presetsMs.every((m) => m >= RULES.auction.minDurationMs && m <= RULES.auction.maxDurationMs));
  assert.ok(RULES.auction.snipeMaxExtensions * RULES.auction.snipeExtendMs <= 60 * 60_000, 'repeated extension is bounded to an hour');
});

function pick(v) { return { lead: v.lead ? v.lead.id : null, price: v.price, bidders: v.bidders, minNext: v.minNext }; }

test('the operator can tune the system redemption\'s daily limits with plain variables, and bad values fall back', async () => {
  const { quickSellLimits } = await import('../src/economy.js');
  assert.deepEqual([quickSellLimits({}).perAccountCardsPerDay, quickSellLimits({}).perAccountCreditsPerDay, quickSellLimits({}).globalCreditsPerDay], [40, 4000, 250000]);
  const tuned = quickSellLimits({ QS_CARDS_PER_DAY: '10', QS_CREDITS_PER_DAY: '500', QS_REALM_CREDITS_PER_DAY: '9000' });
  assert.deepEqual([tuned.perAccountCardsPerDay, tuned.perAccountCreditsPerDay, tuned.globalCreditsPerDay], [10, 500, 9000]);
  assert.equal(quickSellLimits({ QS_CARDS_PER_DAY: 'lots' }).perAccountCardsPerDay, 40);
  assert.equal(quickSellLimits({ QS_CARDS_PER_DAY: '-3' }).perAccountCardsPerDay, 40);
});
