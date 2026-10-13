// Races and interleavings: 120 deterministic, seeded scenarios in which several players act on the same listing,
// order or offer at the same instant. Whatever the interleaving, every scenario must end in exactly one valid
// outcome, and after all of them the whole realm must reconcile: cards in one place, Credits conserved, holds equal
// to what is open. The seed is fixed, so a failure names a scenario number that can be replayed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { admin, call, DAY, HOUR, MIN, player, rnd, sql, start, stopAll, wallet, inventory, packageOf } from './helpers.mjs';
import { CATALOG } from '../src/catalog.js';
import { closeAuction } from '../src/economy.js';

let server;
const sellers = [], buyers = [];
const T = Date.now() + HOUR;
const cheapCards = Object.keys(CATALOG.cards).filter((id) => CATALOG.cards[id] === 'basic' || CATALOG.cards[id] === 'common');
const rand = rnd(20261013);
const pickOf = (list) => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(list, n) { return shuffle(list).slice(0, n); }

before(async () => {
  server = await start(8821, {});
  const make = async (n, credits) => {
    const me = await player(server, { cards: n, cardList: cheapCards, credits });
    me.next = 0;
    me.take = () => me.cards[me.next++].id;
    return me;
  };
  for (let i = 0; i < 6; i++) sellers.push(await make(40, 0));
  for (let i = 0; i < 8; i++) buyers.push(await make(24, 200000));
});
after(() => stopAll());

const act = (me, id, what, body, at) => call(server, 'POST', '/v1/listings/' + id + '/' + what, body || {}, me.token, { at });
const listing = (me, body, at) => call(server, 'POST', '/v1/listings', body, me.token, { at });
const detail = (me, id, at) => call(server, 'GET', '/v1/listings/' + id, null, me.token, { at });
const q = (text) => sql(server, text);
// every concurrent request of a phase carries the same instant, as simultaneous requests do
const together = (ops, at) => Promise.all(shuffle(ops).map((o) => o.run(at).then((r) => ({ name: o.name, who: o.who, r }))));
function noServerError(results) { results.forEach((x) => assert.ok(x.r.status < 500, x.name + ' answered ' + x.r.status + ': ' + x.r.text)); }

async function fixedScenario(s) {
  const seller = pickOf(sellers), card = seller.take(), ask = between(30, 250), at = T + s * HOUR;
  const made = await listing(seller, { kind: 'fixed', instanceIds: [card], ask, durationMs: 2 * HOUR }, at);
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId, ops = sample(buyers, between(2, 5)).map((b) => ({ name: 'buy', who: b, run: (t) => act(b, id, 'buy', {}, t) }));
  if (rand() < 0.5) ops.push({ name: 'cancel', run: (t) => act(seller, id, 'cancel', {}, t) });
  if (rand() < 0.4) ops.push({ name: 'reprice', run: (t) => call(server, 'PUT', '/v1/listings/' + id, { ask: ask + 10 }, seller.token, { at: t }) });
  const res = await together(ops, at + 1000);
  noServerError(res);
  const bought = res.filter((x) => x.name === 'buy' && x.r.status === 200), cancelled = res.some((x) => x.name === 'cancel' && x.r.status === 200);
  assert.ok(bought.length <= 1, 'at most one buyer');
  assert.ok(!(bought.length && cancelled), 'sold and withdrawn are exclusive');
  const final = (await detail(seller, id, at + 2000)).data.listing;
  if (bought.length) {
    assert.equal(final.status, 'sold');
    assert.equal(q("SELECT COUNT(*) AS n FROM trades WHERE listing_id = '" + id + "'")[0].n, 1);
    res.filter((x) => x.name === 'buy' && x.r.status !== 200).forEach((x) => assert.equal(x.r.error.code, 'closed'));
  } else if (cancelled) assert.equal(final.status, 'cancelled');
  else { assert.equal(final.status, 'active'); await act(seller, id, 'cancel', {}, at + 3000); }
  return 'fixed';
}

async function auctionScenario(s) {
  const seller = pickOf(sellers), card = seller.take(), at = T + s * 4 * HOUR;
  const start = between(10, 50), reserve = rand() < 0.3 ? start + between(10, 120) : null, buyout = rand() < 0.4 ? Math.max(start, reserve || 0) + between(200, 400) : null;
  const made = await listing(seller, { kind: 'auction', instanceIds: [card], start, reserve, buyout, durationMs: HOUR }, at);
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId, maxes = [40, 60, 60, 90, 150, 150, 220, 300, 450];
  const bidOps = (n) => sample(buyers, n).map((b) => ({ name: 'bid', who: b, run: (t) => act(b, id, 'bid', { max: pickOf(maxes) + between(0, 1) * 5 }, t) }));
  let all = await together(bidOps(between(2, 4)), at + 10 * MIN);
  if (rand() < 0.6) all = all.concat(await together(bidOps(between(1, 3)), at + 57 * MIN));
  if (rand() < 0.5) {
    const ops = bidOps(between(1, 2));
    if (buyout) ops.push({ name: 'buyout', run: (t) => act(pickOf(buyers), id, 'buyout', {}, t) });
    if (rand() < 0.5) ops.push({ name: 'cancel', run: (t) => act(seller, id, 'cancel', {}, t) });
    all = all.concat(await together(ops, at + 58 * MIN));
  }
  noServerError(all);
  const final = (await detail(seller, id, at + 3 * HOUR)).data.listing;
  const proxies = q("SELECT bidder_id AS id, max_amount AS max, seq FROM bids WHERE listing_id = '" + id + "'");
  const open = q("SELECT COUNT(*) AS n FROM holds WHERE kind = 'bid' AND ref = '" + id + "' AND released_at IS NULL")[0].n;
  assert.equal(open, 0, 'every hold on a finished auction is released');
  assert.equal(q("SELECT COUNT(*) AS n FROM instances WHERE escrow_ref = '" + id + "'")[0].n, 0, 'nothing left in escrow');
  const expected = closeAuction({ start, reserve, step: null }, proxies);
  if (final.status === 'sold') {
    const trades = q("SELECT * FROM trades WHERE listing_id = '" + id + "'");
    assert.equal(trades.length, 1, 'exactly one sale');
    if (trades[0].kind === 'buyout') assert.equal(trades[0].price, buyout);
    else { assert.equal(expected.sold, true); assert.equal(trades[0].price, expected.price, 'priced exactly as the proxies at the deadline say'); }
    assert.equal(q("SELECT owner_id FROM instances WHERE id = '" + card + "'")[0].owner_id, trades[0].buyer_id);
  } else if (final.status === 'cancelled') assert.equal(proxies.length, 0, 'an auction with a bid cannot be withdrawn');
  else { assert.equal(final.status, 'expired'); assert.equal(expected.sold, false); assert.equal(q("SELECT owner_id FROM instances WHERE id = '" + card + "'")[0].owner_id, q("SELECT seller_id AS owner_id FROM listings WHERE id = '" + id + "'")[0].owner_id); }
  return 'auction';
}

async function orderScenario(s) {
  const seller = pickOf(sellers), cardId = seller.take(), at = T + s * HOUR;
  const row = q("SELECT card_id, variant_id FROM instances WHERE id = '" + cardId + "'")[0];
  const [b1, b2] = sample(buyers, 2), ask = between(20, 120), max = rand() < 0.7 ? ask + between(0, 40) : Math.max(1, ask - between(1, 10));
  const made = await listing(seller, { kind: 'fixed', instanceIds: [cardId], ask, durationMs: 2 * HOUR }, at);
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId;
  const ops = [
    { name: 'order', run: (t) => call(server, 'POST', '/v1/orders', { cardId: row.card_id, maxPrice: max, quantity: 1, durationMs: HOUR }, b1.token, { at: t }) },
    { name: 'buy', who: b2, run: (t) => act(b2, id, 'buy', {}, t) }
  ];
  if (rand() < 0.4) ops.push({ name: 'cancel', run: (t) => act(seller, id, 'cancel', {}, t) });
  const res = await together(ops, at + 1000);
  noServerError(res);
  // a placed order is matched after it commits; give that its own moment, then count what happened
  await admin(server, 'POST', '/v1/admin/sweep', { limit: 20 }, at + 2000);
  const trades = q("SELECT buyer_id, price, kind FROM trades WHERE listing_id = '" + id + "'");
  assert.ok(trades.length <= 1, 'one listing, at most one sale');
  const final = (await detail(seller, id, at + 3000)).data.listing;
  if (trades.length) { assert.equal(final.status, 'sold'); assert.equal(trades[0].price, ask, 'the trade is at the listing price'); }
  else if (final.status === 'active') await act(seller, id, 'cancel', {}, at + 4000);
  // the order, if it placed, is either filled once or still open with its full hold; it never over- or under-reserves
  const placed = res.find((x) => x.name === 'order' && x.r.status === 200);
  if (placed) {
    const o = q("SELECT status, filled, spent, quantity, max_price FROM orders WHERE id = '" + placed.r.data.orderId + "'")[0];
    if (o.status === 'filled') { assert.equal(o.filled, 1); assert.equal(o.spent, ask); }
    else { assert.equal(o.status, 'open'); assert.equal(q("SELECT amount FROM holds WHERE kind = 'order' AND ref = '" + placed.r.data.orderId + "' AND released_at IS NULL")[0].amount, o.max_price); await call(server, 'POST', '/v1/orders/' + placed.r.data.orderId + '/cancel', {}, b1.token, { at: at + 5000 }); }
  }
  return 'order';
}

async function swapScenario(s) {
  const seller = pickOf(sellers), card = seller.take(), at = T + s * HOUR;
  const [o1, o2] = sample(buyers, 2);
  const made = await listing(seller, { kind: 'swap', instanceIds: [card], durationMs: 6 * HOUR }, at);
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId, c1 = o1.take(), c2 = o2.take();
  const offers = await together([
    { name: 'offer1', run: (t) => call(server, 'POST', '/v1/offers', { listingId: id, instanceIds: [c1], cash: between(0, 1) * 25 }, o1.token, { at: t }) },
    { name: 'offer2', run: (t) => call(server, 'POST', '/v1/offers', { listingId: id, instanceIds: [c2] }, o2.token, { at: t }) }
  ], at + 1000);
  noServerError(offers);
  const o = offers.filter((x) => x.r.status === 200).map((x) => ({ name: x.name, id: x.r.data.offerId, who: x.name === 'offer1' ? o1 : o2 }));
  assert.equal(o.length, 2, 'both offers are valid and both place');
  const ops = [{ name: 'accept', run: (t) => call(server, 'POST', '/v1/offers/' + o[0].id + '/accept', {}, seller.token, { at: t }) },
    { name: 'accept2', run: (t) => call(server, 'POST', '/v1/offers/' + o[1].id + '/accept', {}, seller.token, { at: t }) },
    { name: 'withdraw', run: (t) => call(server, 'POST', '/v1/offers/' + o[1].id + '/withdraw', {}, o[1].who.token, { at: t }) }];
  if (rand() < 0.5) ops.push({ name: 'cancel', run: (t) => act(seller, id, 'cancel', {}, t) });
  const res = await together(ops, at + 2000);
  noServerError(res);
  const accepted = res.filter((x) => x.name.startsWith('accept') && x.r.status === 200);
  assert.ok(accepted.length <= 1, 'one swap at most');
  const state = q("SELECT status FROM listings WHERE id = '" + id + "'")[0].status;
  if (accepted.length) assert.equal(state, 'sold');
  assert.equal(q("SELECT COUNT(*) AS n FROM offers WHERE listing_id = '" + id + "' AND status = 'pending'")[0].n === 0 || state === 'active', true, 'no offer waits on a closed listing');
  if (state === 'active') {
    await act(seller, id, 'cancel', {}, at + 3000);
  }
  return 'swap';
}

async function raceOfSale(s) {
  // the same card can only go one way at a time: to the system, into a listing, into an offer, or into a second listing
  const seller = pickOf(sellers), card = seller.take(), at = T + s * HOUR;
  const res = await together([
    { name: 'sell', run: (t) => call(server, 'POST', '/v1/sell', { instanceIds: [card] }, seller.token, { at: t }) },
    { name: 'list1', run: (t) => listing(seller, { kind: 'fixed', instanceIds: [card], ask: 25 }, t) },
    { name: 'list2', run: (t) => listing(seller, { kind: 'auction', instanceIds: [card], start: 5, durationMs: HOUR }, t) }
  ], at);
  noServerError(res);
  assert.equal(res.filter((x) => x.r.status === 200).length, 1, 'exactly one of them took the card: ' + res.map((x) => x.name + ':' + x.r.status).join(' '));
  const listed = res.find((x) => x.name.startsWith('list') && x.r.status === 200);
  if (listed) await act(seller, listed.r.data.listingId, 'cancel', {}, at + 10);
  return 'sale-race';
}

test('120 generated interleavings each end in exactly one valid outcome, and the realm reconciles', async () => {
  const plan = [];
  for (let i = 0; i < 30; i++) plan.push(fixedScenario);
  for (let i = 0; i < 40; i++) plan.push(auctionScenario);
  for (let i = 0; i < 15; i++) plan.push(orderScenario);
  for (let i = 0; i < 15; i++) plan.push(swapScenario);
  for (let i = 0; i < 20; i++) plan.push(raceOfSale);
  const order = shuffle(plan), tally = {};
  assert.equal(order.length, 120);
  for (let s = 0; s < order.length; s++) {
    let kind;
    try { kind = await order[s](s); } catch (error) { console.error('SCENARIO ' + s + ' ' + order[s].name + ' WORKER LOG: ' + server.log().slice(-3500)); throw error; }
    tally[kind] = (tally[kind] || 0) + 1;
    if (s % 20 === 19) {
      const r = await admin(server, 'GET', '/v1/admin/reconcile');
      assert.deepEqual(r.data.problems, [], 'after scenario ' + s);
    }
  }
  assert.deepEqual(Object.values(tally).reduce((n, v) => n + v, 0), 120);
  const final = await admin(server, 'GET', '/v1/admin/reconcile');
  assert.deepEqual(final.data.problems, []);
  assert.equal(final.data.supply.balanced, true);
  assert.equal(final.data.counts.holds, 0, 'nothing is still reserved');
  // every Credit anyone has was issued by the system or is the buyers' starting grant; fees are the only sink
  const w = q('SELECT SUM(balance) AS b FROM wallets')[0].b, g = q('SELECT SUM(quote) AS s FROM redemptions')[0].s, f = q('SELECT SUM(fee) AS s FROM trades')[0].s;
  assert.equal(w, g - f);
  assert.ok(tally.auction === 40 && tally.fixed === 30);
});

test('the same sale settled many ways at once is settled once: alarm, sweep, a look and a late bid', async () => {
  const seller = sellers[0], buyer = buyers[0], card = seller.take(), at = T + 1000 * HOUR;
  const made = await listing(seller, { kind: 'auction', instanceIds: [card], start: 30, durationMs: HOUR }, at);
  const id = made.data.listingId;
  await act(buyer, id, 'bid', { max: 100 }, at + 10 * MIN);
  const end = at + HOUR + 1;
  const res = await Promise.all([
    admin(server, 'POST', '/v1/admin/sweep', { limit: 50 }, end), admin(server, 'POST', '/v1/admin/sweep', { limit: 50 }, end),
    detail(seller, id, end), detail(buyer, id, end), act(buyers[1], id, 'bid', { max: 500 }, end)
  ]);
  res.forEach((r) => assert.ok(r.status < 500, r.text));
  assert.equal(q("SELECT COUNT(*) AS n FROM trades WHERE listing_id = '" + id + "'")[0].n, 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM ledger WHERE ref IN (SELECT id FROM trades WHERE listing_id = '" + id + "')")[0].n, 2);
  const r = await admin(server, 'GET', '/v1/admin/reconcile');
  assert.deepEqual(r.data.problems, []);
});

test('a sale that cannot be completed is closed, not retried forever, and nobody is charged', async () => {
  const seller = sellers[1], buyer = buyers[2], card = seller.take(), at = T + 1100 * HOUR;
  const made = await listing(seller, { kind: 'auction', instanceIds: [card], start: 30, durationMs: HOUR }, at);
  const id = made.data.listingId;
  await act(buyer, id, 'bid', { max: 100 }, at + 10 * MIN);
  const before = await wallet(buyer);
  // damage that no rule allows: the escrowed card is moved away behind the market's back
  const other = q("SELECT id FROM accounts WHERE alias <> '" + seller.alias + "' LIMIT 1")[0].id;
  const { runSql } = await import('./helpers.mjs');
  runSql(server, ["UPDATE instances SET owner_id = '" + other + "', state = 'owned', escrow_ref = NULL WHERE id = '" + card + "'"]);
  const done = await detail(buyer, id, at + 2 * HOUR);
  assert.equal(done.data.listing.status, 'expired');
  const afterWallet = await wallet(buyer);
  assert.deepEqual([afterWallet.balance, afterWallet.held], [before.balance, 0], 'nothing was charged and the hold was released');
  assert.equal(q("SELECT COUNT(*) AS n FROM trades WHERE listing_id = '" + id + "'")[0].n, 0);
  // put the card back where the rules say it was, so the realm is whole for the final reconciliation
  runSql(server, ["UPDATE instances SET owner_id = (SELECT id FROM accounts WHERE alias = '" + seller.alias + "') WHERE id = '" + card + "'"]);
  const r = await admin(server, 'GET', '/v1/admin/reconcile');
  assert.deepEqual(r.data.problems, []);
});

test('numbers at the edges: overflow, fractions, strings and huge reservations are refused without changing anything', async () => {
  const me = buyers[3], seller = sellers[2];
  const before = await wallet(me), card = seller.take();
  const bad = [[{ cardId: cheapCards[0], maxPrice: 2 ** 53, quantity: 1 }], [{ cardId: cheapCards[0], maxPrice: 99999999, quantity: 10 }],
    [{ cardId: cheapCards[0], maxPrice: 10.5, quantity: 1 }], [{ cardId: cheapCards[0], maxPrice: '10', quantity: '1' }], [{ cardId: cheapCards[0], maxPrice: 10, quantity: 11 }],
    [{ cardId: 'nope', maxPrice: 10, quantity: 1 }], [{ cardId: cheapCards[0], maxPrice: -1, quantity: 1 }]];
  for (const [body] of bad.map((b) => b)) {
    const r = await call(server, 'POST', '/v1/orders', body, me.token, { at: T });
    assert.ok([409, 422].includes(r.status), JSON.stringify(body) + ' -> ' + r.status + ' ' + r.text);
  }
  for (const ask of [2 ** 53, 1e9, 0.5, -3, NaN, Infinity]) {
    const r = await listing(seller, { kind: 'fixed', instanceIds: [card], ask }, T);
    assert.equal(r.status, 422, 'ask ' + ask);
  }
  const after = await wallet(me);
  assert.deepEqual([after.balance, after.held], [before.balance, before.held]);
  assert.equal(q("SELECT state FROM instances WHERE id = '" + card + "'")[0].state, 'owned');
  void inventory; void packageOf;
});
