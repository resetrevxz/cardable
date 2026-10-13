// Real player trading against the real Worker, a real (local) D1 and real Durable Objects: fixed sales, auctions with
// proxy bids and anti-sniping, buy orders, swaps and counteroffers, the system redemption, escrow and reconciliation.
// Time is the server's, set per request with `x-test-now` (test environment only), so deadlines are exact.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { admin, call, DAY, HOUR, MIN, player, sql, start, stopAll, wallet } from './helpers.mjs';
import { CATALOG } from '../src/catalog.js';

let main, alarm;
const T0 = Date.now() + 10 * MIN;
const cards = Object.keys(CATALOG.cards);
before(async () => {
  main = await start(8811, {});
  alarm = await start(8812, { TEST_MIN_AUCTION_MS: '1500', TEST_SNIPE_WINDOW_MS: '0' });
});
after(() => stopAll());

const list = (me, body, at) => call(me.server, 'POST', '/v1/listings', body, me.token, { at: at == null ? T0 : at });
const act = (me, listingId, what, body, at, key) => call(me.server, 'POST', '/v1/listings/' + listingId + '/' + what, body || {}, me.token, { at, key });
const detail = (me, listingId, at) => call(me.server, 'GET', '/v1/listings/' + listingId, null, me.token, { at });
async function reconciled(server) {
  const r = await admin(server, 'GET', '/v1/admin/reconcile');
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.data.problems, [], 'the realm reconciles: ' + JSON.stringify(r.data.problems.slice(0, 3)));
  assert.equal(r.data.supply.balanced, true);
  return r.data;
}
const dbCount = (server, text) => sql(server, text)[0].n;

test('fixed price: list, buy, one fee, one receipt, ownership moves once, and a replay changes nothing', async () => {
  const seller = await player(main, { cards: 3 }), buyer = await player(main, { credits: 500 });
  const card = seller.cards[0];
  const made = await list(seller, { kind: 'fixed', instanceIds: [card.id], ask: 100, title: 'A fine card', note: 'Careful owner.' });
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId;
  assert.equal((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items.find((i) => i.id === card.id).state, 'escrow');
  const seen = await call(main, 'GET', '/v1/listings', null, buyer.token, { at: T0 + 1000 });
  const view = seen.data.items.find((l) => l.id === id);
  assert.ok(view && view.format === 'buy-now' && view.ask === 100 && view.seller.alias === seller.alias && !JSON.stringify(view).includes(seller.token));
  assert.equal(view.items[0].instanceId, undefined, 'another player\'s card ids are not shown');
  const key = 'buy-' + id;
  const bought = await act(buyer, id, 'buy', { expectedPrice: 100 }, T0 + 2000, key);
  assert.equal(bought.status, 200, bought.text);
  assert.deepEqual([bought.data.price, bought.data.fee], [100, 2]);
  assert.equal((await wallet(buyer)).balance, 400); assert.equal((await wallet(seller)).balance, 98);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, buyer.token)).data.items.some((i) => i.id === card.id && i.state === 'owned'), true);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items.some((i) => i.id === card.id), false);
  const replay = await act(buyer, id, 'buy', { expectedPrice: 100 }, T0 + 3000, key);
  assert.equal(replay.data.replayed, true); assert.equal(replay.data.receiptId, bought.data.receiptId);
  assert.equal((await wallet(buyer)).balance, 400);
  assert.equal(dbCount(main, "SELECT COUNT(*) AS n FROM price_observations WHERE trade_id = '" + bought.data.receiptId + "'"), 1);
  const hist = await call(main, 'GET', '/v1/history', null, buyer.token);
  assert.ok(hist.data.items.some((h) => h.receiptId === bought.data.receiptId && h.delta === -100 && h.trade.price === 100 && h.trade.seller === seller.alias));
  assert.ok(!JSON.stringify(hist.data).includes('acct_'), 'no private account id in a receipt');
  const after = await detail(buyer, id, T0 + 4000);
  assert.equal(after.data.listing.status, 'sold'); assert.equal(after.data.listing.soldFor, 100);
  await reconciled(main);
});

test('two buyers race for the last listing: exactly one wins, the other is told it is gone, the seller is paid once', async () => {
  const seller = await player(main, { cards: 1 }), a = await player(main, { credits: 300 }), b = await player(main, { credits: 300 });
  const made = await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 150 });
  const [ra, rb] = await Promise.all([act(a, made.data.listingId, 'buy', { expectedPrice: 150 }, T0 + 10), act(b, made.data.listingId, 'buy', { expectedPrice: 150 }, T0 + 10)]);
  const won = [ra, rb].filter((r) => r.status === 200), lost = [ra, rb].filter((r) => r.status !== 200);
  assert.equal(won.length, 1, JSON.stringify([ra.text, rb.text]));
  assert.equal(lost[0].error.code, 'closed');
  assert.equal((await wallet(seller)).balance, 147);
  assert.equal((await wallet(a)).balance + (await wallet(b)).balance, 450, 'only the winner paid');
  await reconciled(main);
});

test('a retry or double click with the same key acts once, even all at once; the same key for a different request is refused', async () => {
  const seller = await player(main, { cards: 1 }), buyer = await player(main, { credits: 400 });
  const made = await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 90 });
  const key = 'dup-' + made.data.listingId;
  const six = await Promise.all([1, 2, 3, 4, 5, 6].map(() => act(buyer, made.data.listingId, 'buy', { expectedPrice: 90 }, T0 + 5, key)));
  assert.ok(six.every((r) => r.status === 200), JSON.stringify(six.map((r) => r.status)));
  assert.equal(new Set(six.map((r) => r.data.receiptId)).size, 1);
  assert.equal((await wallet(buyer)).balance, 310);
  const other = await act(buyer, made.data.listingId, 'buy', { expectedPrice: 91 }, T0 + 6, key);
  assert.equal(other.status, 422); assert.equal(other.error.code, 'idempotency-mismatch');
  const noKey = await call(main, 'POST', '/v1/listings/' + made.data.listingId + '/buy', {}, buyer.token, { at: T0 + 6, key: null });
  assert.equal(noKey.status, 400); assert.equal(noKey.error.code, 'idempotency-key-required');
  await reconciled(main);
});

test('forbidden and impossible operations are refused and change nothing', async () => {
  const seller = await player(main, { cards: 2 }), buyer = await player(main, { credits: 50 }), other = await player(main, { cards: 1 });
  const made = await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 100 });
  const id = made.data.listingId;
  assert.equal((await act(seller, id, 'buy', { expectedPrice: 100 }, T0 + 1)).error.code, 'own');
  const poor = await act(buyer, id, 'buy', { expectedPrice: 100 }, T0 + 1);
  assert.equal(poor.status, 409); assert.equal(poor.error.code, 'funds');
  assert.equal((await act(buyer, id, 'buy', { expectedPrice: 99 }, T0 + 1)).error.code, 'price-changed');
  assert.equal((await act(other, id, 'cancel', {}, T0 + 1)).status, 404, 'only the seller can withdraw');
  assert.equal((await act(buyer, 'lst_doesnotexist1', 'buy', {}, T0 + 1)).status, 404);
  assert.equal((await act(buyer, id, 'bid', { max: 500 }, T0 + 1)).status, 404, 'a fixed listing is not an auction');
  // someone else's card cannot be listed, a listed card cannot be listed twice, and prices must be whole and in range
  assert.equal((await list(other, { kind: 'fixed', instanceIds: [seller.cards[1].id], ask: 10 })).error.code, 'not-owned');
  assert.equal((await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 10 })).error.code, 'locked');
  for (const ask of [0, -5, 1.5, 'abc', 1e12, null]) assert.equal((await list(seller, { kind: 'fixed', instanceIds: [seller.cards[1].id], ask })).status, 422, 'ask ' + ask);
  assert.equal((await list(seller, { kind: 'fixed', instanceIds: [seller.cards[1].id, seller.cards[1].id], ask: 5 })).error.code, 'bundle');
  assert.equal((await call(main, 'POST', '/v1/sell', { instanceIds: [seller.cards[0].id] }, seller.token)).error.code, 'locked', 'a listed card cannot be sold to the system');
  assert.equal((await wallet(buyer)).balance, 50);
  await reconciled(main);
});

test('a price change protects the buyer: the stale price is refused, the new one works; links and contact details are refused in text', async () => {
  const seller = await player(main, { cards: 1 }), buyer = await player(main, { credits: 500 });
  const made = await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 200 });
  const id = made.data.listingId;
  const re = await call(main, 'PUT', '/v1/listings/' + id, { ask: 150 }, seller.token, { at: T0 + 10 });
  assert.equal(re.status, 200); assert.equal(re.data.price, 150);
  assert.equal((await call(main, 'PUT', '/v1/listings/' + id, { ask: 100 }, buyer.token, { at: T0 + 11 })).status, 404);
  assert.equal((await act(buyer, id, 'buy', { expectedPrice: 200 }, T0 + 12)).error.code, 'price-changed');
  assert.equal((await act(buyer, id, 'buy', { expectedPrice: 150 }, T0 + 13)).status, 200);
  const spare = await player(main, { cards: 1 });
  for (const text of ['visit www.example.com now', 'dm me on discord', 'pay me paypal', 'call 555 123 4567', 'me@mail.com', 'https://x.example/y', '@somebody add me']) {
    const r = await list(spare, { kind: 'fixed', instanceIds: [spare.cards[0].id], ask: 10, title: text });
    assert.equal(r.status, 422, text); assert.equal(r.error.code, 'unsafe-text');
  }
  assert.equal((await list(spare, { kind: 'fixed', instanceIds: [spare.cards[0].id], ask: 10, title: 'x'.repeat(61) })).error.code, 'too-long');
  assert.equal((await list(spare, { kind: 'fixed', instanceIds: [spare.cards[0].id], ask: 10, title: 'Clean title' })).status, 200);
});

test('withdraw returns the card and releases the lock; it can be relisted; a withdrawn listing cannot be bought', async () => {
  const seller = await player(main, { cards: 1 }), buyer = await player(main, { credits: 500 });
  const made = await list(seller, { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 70, title: 'Again' });
  const id = made.data.listingId;
  assert.equal((await act(seller, id, 'cancel', {}, T0 + 1)).status, 200);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items[0].state, 'owned');
  const gone = await act(buyer, id, 'buy', { expectedPrice: 70 }, T0 + 2);
  assert.equal(gone.status, 409); assert.equal(gone.error.code, 'closed');
  const again = await act(seller, id, 'relist', {}, T0 + 3);
  assert.equal(again.status, 200, again.text);
  const view = await detail(buyer, again.data.listingId, T0 + 4);
  assert.deepEqual([view.data.listing.ask, view.data.listing.title, view.data.listing.status], [70, 'Again', 'active']);
  assert.equal((await act(seller, id, 'relist', {}, T0 + 5)).error.code, 'locked', 'the card is already in the new listing');
  await reconciled(main);
});

test('a bundle sells whole or not at all, and a bundle never makes a single card\'s price', async () => {
  const seller = await player(main, { cards: 4 }), poor = await player(main, { credits: 100 }), rich = await player(main, { credits: 1000 });
  const ids = seller.cards.slice(0, 3).map((c) => c.id);
  const made = await list(seller, { kind: 'fixed', instanceIds: ids, ask: 300 });
  const fail = await act(poor, made.data.listingId, 'buy', { expectedPrice: 300 }, T0 + 1);
  assert.equal(fail.error.code, 'funds');
  assert.equal((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items.filter((i) => i.state === 'escrow').length, 3, 'still all three in escrow');
  const ok = await act(rich, made.data.listingId, 'buy', { expectedPrice: 300 }, T0 + 2);
  assert.equal(ok.status, 200);
  const mine = (await call(main, 'GET', '/v1/inventory', null, rich.token)).data.items.map((i) => i.id);
  ids.forEach((id) => assert.ok(mine.includes(id)));
  assert.equal(dbCount(main, "SELECT COUNT(*) AS n FROM price_observations WHERE trade_id = '" + ok.data.receiptId + "'"), 0);
  assert.equal((await list(seller, { kind: 'fixed', instanceIds: seller.cards.map((c) => c.id).concat('inst-nope'), ask: 5 })).status, 409);
  await reconciled(main);
});

test('auction: proxy bidding raises the price only as far as needed, holds follow the leader, the end settles once', async () => {
  const seller = await player(main, { cards: 1 }), A = await player(main, { credits: 1000 }), B = await player(main, { credits: 1000 }), C = await player(main, { credits: 1000 });
  const made = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 100, durationMs: 24 * HOUR });
  const id = made.data.listingId, END = T0 + 24 * HOUR;
  const bid = (who, max, at) => act(who, id, 'bid', { max }, at);
  let r = await bid(A, 200, T0 + HOUR);
  assert.deepEqual([r.status, r.data.price, r.data.leading], [200, 100, true]);
  assert.equal((await wallet(A)).held, 200);
  r = await bid(B, 150, T0 + 2 * HOUR);
  assert.deepEqual([r.data.price, r.data.leading], [158, false], 'B only moves the price to one step over their own maximum');
  assert.equal((await wallet(B)).held, 0, 'a bidder who is not leading holds nothing');
  r = await bid(C, 300, T0 + 3 * HOUR);
  assert.deepEqual([r.data.price, r.data.leading], [210, true]);
  assert.equal((await wallet(A)).held, 0, 'the replaced leader\'s Credits are released at once');
  assert.equal((await wallet(C)).held, 300);
  assert.equal((await call(main, 'GET', '/v1/activity', null, A.token, { at: T0 + 3 * HOUR })).data.notifications.some((n) => n.kind === 'outbid'), true);
  assert.equal((await bid(A, 215, T0 + 4 * HOUR)).error.code, 'increment', 'below the minimum next bid');
  r = await bid(A, 250, T0 + 4 * HOUR);
  assert.deepEqual([r.data.price, r.data.leading], [263, false]);
  r = await bid(C, 400, T0 + 5 * HOUR);
  assert.deepEqual([r.data.price, r.data.leading], [263, true], 'raising your own maximum does not raise the price');
  assert.equal((await wallet(C)).held, 400);
  assert.equal((await bid(C, 400, T0 + 5 * HOUR)).error.code, 'lower');
  const mid = await detail(B, id, T0 + 6 * HOUR);
  assert.equal(mid.data.listing.auction.current, 263);
  assert.equal(mid.data.listing.auction.myMax, 150, 'a bidder sees only their own maximum');
  assert.equal(mid.data.listing.auction.youLead, false);
  assert.ok(!JSON.stringify(mid.data).includes('"max_amount"') && !JSON.stringify(mid.data.history).includes('400'), 'no one else\'s maximum is visible');
  // the end: the first look at it after the deadline settles it, whoever looks
  const done = await detail(B, id, END + 1);
  assert.equal(done.data.listing.status, 'sold'); assert.equal(done.data.listing.soldFor, 263);
  assert.deepEqual([(await wallet(C)).balance, (await wallet(C)).held], [737, 0]);
  assert.equal((await wallet(seller)).balance, 263 - 5);
  assert.deepEqual([(await wallet(A)).balance, (await wallet(A)).held, (await wallet(B)).held], [1000, 0, 0]);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, C.token)).data.items.length, 1);
  assert.equal((await bid(B, 999, END + 2)).status, 409, 'bids after the close are refused');
  await reconciled(main);
});

test('auction: the deadline is exact, the winner is whoever led at it, and a late settlement cannot change that', async () => {
  const seller = await player(main, { cards: 1 }), A = await player(main, { credits: 500 }), B = await player(main, { credits: 500 });
  const made = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 10, durationMs: HOUR });
  const id = made.data.listingId, END = T0 + HOUR;
  assert.equal((await act(A, id, 'bid', { max: 50 }, END - 10 * MIN)).status, 200);
  assert.equal((await act(B, id, 'bid', { max: 80 }, END - 1)).data.extended, true, 'a bid in the last minute is accepted and extends');
  // after the extension the deadline moved: END+1 is still open
  const live = await detail(A, id, END + 1);
  assert.equal(live.data.listing.status, 'active');
  const newEnd = live.data.listing.endsAt;
  assert.equal(newEnd, END - 1 + 5 * MIN);
  const at = await act(A, id, 'bid', { max: 500 }, newEnd);
  assert.equal(at.status, 409); assert.equal(at.error.code, 'ended', 'a bid at the deadline is too late');
  const after = await detail(B, id, newEnd + 1);
  assert.equal(after.data.listing.status, 'sold'); assert.equal(after.data.listing.soldFor, 53);
  assert.equal((await wallet(B)).balance, 447);
  assert.equal((await wallet(A)).balance, 500);
  // a second auction that nobody touches at all: a sweep a whole day later settles it exactly as the deadline decided
  const seller2 = await player(main, { cards: 1 });
  const quiet = await list(seller2, { kind: 'auction', instanceIds: [seller2.cards[0].id], start: 20, durationMs: HOUR }, T0 + 5 * DAY);
  await act(A, quiet.data.listingId, 'bid', { max: 90 }, T0 + 5 * DAY + 10 * MIN);
  await act(B, quiet.data.listingId, 'bid', { max: 60 }, T0 + 5 * DAY + 20 * MIN);
  const swept = await admin(main, 'POST', '/v1/admin/sweep', { limit: 50 }, T0 + 6 * DAY);
  assert.equal(swept.status, 200); assert.ok(swept.data.settled >= 1);
  const late = await detail(B, quiet.data.listingId, T0 + 6 * DAY);
  assert.deepEqual([late.data.listing.status, late.data.listing.soldFor], ['sold', 63]);
  assert.equal((await wallet(A)).balance, 500 - 63);
  assert.equal((await wallet(A)).held, 0);
  await reconciled(main);
});

test('auction: anti-sniping extends on a late bid that changes the price or the leader, and only a bounded number of times', async () => {
  const seller = await player(main, { cards: 1 }), A = await player(main, { credits: 100000 }), B = await player(main, { credits: 100000 });
  const made = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 100, durationMs: 2 * HOUR });
  const id = made.data.listingId;
  let r = await act(A, id, 'bid', { max: 1000 }, T0 + 30 * MIN);
  assert.equal(r.data.extended, false);
  let now = T0 + 2 * HOUR - 4 * MIN, endsAt = r.data.endsAt;
  const history = [];
  for (let n = 0; n < 9; n++) {
    const who = n % 2 ? A : B;
    r = await act(who, id, 'bid', { max: 2000 + n * 200 }, now);
    assert.equal(r.status, 200, r.text);
    history.push([r.data.extended, r.data.endsAt]);
    endsAt = r.data.endsAt; now = endsAt - 2 * MIN;
  }
  const extended = history.filter((h) => h[0]).length;
  assert.equal(extended, 6, 'at most six extensions: ' + JSON.stringify(history));
  const view = await detail(A, id, now);
  assert.equal(view.data.listing.auction.extensions, 6);
  assert.ok(view.data.listing.snipeNote.includes('Extended'));
});

test('auction: reserve not met sends the card home and frees every hold; reserve met sells at the reserve', async () => {
  const seller = await player(main, { cards: 2 }), A = await player(main, { credits: 1000 });
  const low = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 50, reserve: 500, durationMs: HOUR });
  await act(A, low.data.listingId, 'bid', { max: 300 }, T0 + 10);
  assert.equal((await wallet(A)).held, 300);
  const out = await detail(A, low.data.listingId, T0 + HOUR + 1);
  assert.equal(out.data.listing.status, 'expired'); assert.equal(out.data.listing.endNote, 'Reserve not met');
  assert.deepEqual([(await wallet(A)).balance, (await wallet(A)).held], [1000, 0]);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items.find((i) => i.id === seller.cards[0].id).state, 'owned');
  const met = await list(seller, { kind: 'auction', instanceIds: [seller.cards[1].id], start: 50, reserve: 200, durationMs: HOUR }, T0 + 2 * HOUR);
  const bid = await act(A, met.data.listingId, 'bid', { max: 400 }, T0 + 2 * HOUR + 10);
  assert.equal(bid.data.price, 200, 'once the maximum reaches the reserve the price shows the reserve');
  const sold = await detail(A, met.data.listingId, T0 + 3 * HOUR + 1);
  assert.equal(sold.data.listing.status, 'sold'); assert.equal(sold.data.listing.soldFor, 200);
});

test('auction: buy it now ends it at once, releases the leader, and a bid at the same moment cannot also win', async () => {
  const seller = await player(main, { cards: 1 }), A = await player(main, { credits: 1000 }), B = await player(main, { credits: 2000 });
  const made = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 100, buyout: 1000, durationMs: DAY });
  const id = made.data.listingId;
  await act(A, id, 'bid', { max: 400 }, T0 + 1);
  assert.equal((await wallet(A)).held, 400);
  const [bidRes, buyRes] = await Promise.all([act(A, id, 'bid', { max: 600 }, T0 + 2), act(B, id, 'buyout', {}, T0 + 2)]);
  assert.equal(buyRes.status, 200, buyRes.text);
  assert.ok(bidRes.status === 200 || bidRes.status === 409);
  const view = await detail(A, id, T0 + 3);
  assert.equal(view.data.listing.status, 'sold'); assert.equal(view.data.listing.soldFor, 1000);
  assert.deepEqual([(await wallet(A)).balance, (await wallet(A)).held], [1000, 0]);
  assert.equal((await wallet(B)).balance, 1000);
  assert.equal((await act(A, id, 'bid', { max: 5000 }, T0 + 4)).error.code, 'closed');
  assert.equal((await act(A, id, 'buyout', {}, T0 + 4)).error.code, 'closed');
  await reconciled(main);
});

test('auction: cancel is refused once there is a valid bid, and allowed before', async () => {
  const seller = await player(main, { cards: 2 }), A = await player(main, { credits: 500 });
  const one = await list(seller, { kind: 'auction', instanceIds: [seller.cards[0].id], start: 10, durationMs: DAY });
  const two = await list(seller, { kind: 'auction', instanceIds: [seller.cards[1].id], start: 10, durationMs: DAY });
  await act(A, two.data.listingId, 'bid', { max: 50 }, T0 + 1);
  assert.equal((await act(seller, two.data.listingId, 'cancel', {}, T0 + 2)).error.code, 'has-bids');
  assert.equal((await act(seller, one.data.listingId, 'cancel', {}, T0 + 2)).status, 200);
  assert.equal((await act(A, one.data.listingId, 'bid', { max: 50 }, T0 + 3)).error.code, 'closed');
  assert.equal((await act(seller, two.data.listingId, 'bid', { max: 50 }, T0 + 3)).error.code, 'own');
  assert.equal((await act(A, two.data.listingId, 'bid', { max: 1e12 }, T0 + 3)).status, 422);
  assert.equal((await act(A, two.data.listingId, 'bid', { max: 5e7 }, T0 + 3)).error.code, 'funds');
  await reconciled(main);
});

test('buy orders: reserved Credits, cheapest listing first at the listing\'s price, exact finish only, remainder released', async () => {
  const card = cards[10], other = cards[11];
  const seller = await playerFromCards(main, [card, card, other]);
  const buyer = await player(main, { credits: 1000 });
  const mk = (price, i, at) => list(seller, { kind: 'fixed', instanceIds: [seller.cards.filter((c) => c.cardId === card)[i].id], ask: price }, at);
  const first = await call(main, 'POST', '/v1/orders', { cardId: card, anyFinish: false, maxPrice: 120, quantity: 2 }, buyer.token, { at: T0 });
  assert.equal(first.status, 200, first.text);
  assert.deepEqual([first.data.hold], [240]);
  assert.equal((await wallet(buyer)).held, 240);
  const cheap = await mk(80, 0, T0 + 10), dear = await mk(110, 1, T0 + 20);
  const act1 = await call(main, 'GET', '/v1/activity', null, buyer.token, { at: T0 + 30 });
  const order = act1.data.orders[0];
  assert.deepEqual([order.status, order.filled, order.spent], ['filled', 2, 190]);
  assert.deepEqual([(await wallet(buyer)).balance, (await wallet(buyer)).held], [810, 0], 'paid at the listings\' prices, the rest of the reservation released');
  assert.equal((await wallet(seller)).balance, 78 + 108);
  assert.ok(cheap.data.listingId && dear.data.listingId);
  // an order never buys a different finish: this order asks for a holo finish and the listing is the plain card
  const variant = CATALOG.variants[0];
  const picky = await call(main, 'POST', '/v1/orders', { cardId: other, variantId: variant, maxPrice: 500, quantity: 1 }, buyer.token, { at: T0 + 40 });
  const plain = await list(seller, { kind: 'fixed', instanceIds: [seller.cards.find((c) => c.cardId === other).id], ask: 20 }, T0 + 50);
  assert.equal(plain.status, 200);
  const stillOpen = (await call(main, 'GET', '/v1/activity', null, buyer.token, { at: T0 + 60 })).data.orders.find((o) => o.id === picky.data.orderId);
  assert.equal(stillOpen.status, 'open'); assert.equal((await wallet(buyer)).held, 500);
  const any = await call(main, 'PUT', '/v1/orders/' + picky.data.orderId, { maxPrice: 400 }, buyer.token, { at: T0 + 70 });
  assert.equal(any.status, 200); assert.equal((await wallet(buyer)).held, 400);
  assert.equal((await call(main, 'POST', '/v1/orders/' + picky.data.orderId + '/cancel', {}, buyer.token, { at: T0 + 80 })).status, 200);
  assert.equal((await wallet(buyer)).held, 0);
  assert.equal((await call(main, 'POST', '/v1/orders', { cardId: card, maxPrice: 5000, quantity: 2 }, (await player(main, { credits: 100 })).token, { at: T0 })).error.code, 'funds');
  await reconciled(main);
});
async function playerFromCards(server, cardList) {
  const h = await import('./helpers.mjs');
  const r = await call(server, 'POST', '/v1/auth/register', {}, null, { key: null });
  const me = Object.assign({ server, token: r.data.accessToken }, r.data);
  const pkg = h.packageOf(cardList.length, { cards: cardList });
  const p = await call(server, 'POST', '/v1/import/preview', { package: pkg }, me.token, { key: null });
  assert.equal(p.status, 200, p.text);
  const c = await call(server, 'POST', '/v1/import/commit', { previewId: p.data.previewId }, me.token, { key: 'imp-' + Math.random().toString(36).slice(2, 12) });
  assert.equal(c.status, 200, c.text);
  me.cards = await h.inventory(me);
  return me;
}

test('swap: conditions are explained, an offer escrows both sides, a counteroffer moves Credits, acceptance settles all at once', async () => {
  const wanted = cards[20], offeredCard = cards[21];
  const seller = await playerFromCards(main, [cards[22], cards[23]]), offerer = await playerFromCards(main, [offeredCard, wanted]);
  const { grant } = await import('./helpers.mjs');
  grant(main, [{ alias: offerer.alias, amount: 300 }, { alias: seller.alias, amount: 300 }]);
  const made = await list(seller, { kind: 'swap', instanceIds: [seller.cards[0].id], wants: { cardIds: [wanted], minItems: 1 }, minTopUp: 0, durationMs: 5 * DAY });
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId;
  const wrong = await call(main, 'POST', '/v1/offers', { listingId: id, instanceIds: [offerer.cards.find((c) => c.cardId === offeredCard).id], cash: 0 }, offerer.token, { at: T0 + 1 });
  assert.equal(wrong.status, 422); assert.equal(wrong.error.code, 'terms-not-met'); assert.ok(wrong.error.detail.failures.length >= 1);
  const right = await call(main, 'POST', '/v1/offers', { listingId: id, instanceIds: [offerer.cards.find((c) => c.cardId === wanted).id], cash: 40, message: 'Happy to add a little.' }, offerer.token, { at: T0 + 2 });
  assert.equal(right.status, 200, right.text);
  assert.equal((await wallet(offerer)).held, 40);
  // the offered card is now in escrow: it cannot be listed, sold to the system or offered elsewhere
  const escrowed = offerer.cards.find((c) => c.cardId === wanted).id;
  assert.equal((await list(offerer, { kind: 'fixed', instanceIds: [escrowed], ask: 10 }, T0 + 3)).error.code, 'locked');
  assert.equal((await call(main, 'POST', '/v1/sell', { instanceIds: [escrowed] }, offerer.token, { at: T0 + 3 })).error.code, 'locked');
  // the seller sees it and counters: they want 60, not 40
  const seen = await detail(seller, id, T0 + 4);
  const offer = seen.data.offers[0];
  assert.deepEqual([offer.myTurn, offer.cash, offer.give.length], [true, 40, 1]);
  assert.equal((await call(main, 'POST', '/v1/offers/' + offer.id + '/accept', {}, offerer.token, { at: T0 + 5 })).error.code, 'not-your-turn');
  const counter = await call(main, 'POST', '/v1/offers/' + offer.id + '/counter', { cash: 60, message: 'Sixty and it is yours.' }, seller.token, { at: T0 + 6 });
  assert.equal(counter.status, 200, counter.text);
  assert.equal((await call(main, 'POST', '/v1/offers/' + offer.id + '/accept', {}, seller.token, { at: T0 + 7 })).error.code, 'not-your-turn');
  const done = await call(main, 'POST', '/v1/offers/' + offer.id + '/accept', {}, offerer.token, { at: T0 + 8 });
  assert.equal(done.status, 200, done.text);
  assert.deepEqual([done.data.credits, done.data.fee], [60, 1]);
  assert.equal((await wallet(offerer)).balance, 240); assert.equal((await wallet(offerer)).held, 0);
  assert.equal((await wallet(seller)).balance, 300 + 59);
  const mineNow = (await call(main, 'GET', '/v1/inventory', null, offerer.token)).data.items.map((i) => i.id);
  assert.ok(mineNow.includes(seller.cards[0].id) && !mineNow.includes(escrowed));
  assert.ok((await call(main, 'GET', '/v1/inventory', null, seller.token)).data.items.some((i) => i.id === escrowed));
  // a barter is a trade record, never a price: no observation, not in sale volume
  assert.equal(dbCount(main, "SELECT COUNT(*) AS n FROM price_observations WHERE trade_id = '" + done.data.receiptId + "'"), 0);
  assert.equal(sql(main, "SELECT kind, price, fee FROM trades WHERE id = '" + done.data.receiptId + "'")[0].kind, 'swap');
  await reconciled(main);
});

test('swap: card for card pays no fee; declining or withdrawing returns everything; the others close when one is accepted; rounds are bounded', async () => {
  const seller = await playerFromCards(main, [cards[30]]), o1 = await playerFromCards(main, [cards[31]]), o2 = await playerFromCards(main, [cards[32]]);
  const { grant } = await import('./helpers.mjs');
  grant(main, [{ alias: o1.alias, amount: 100 }, { alias: seller.alias, amount: 100 }]);
  const made = await list(seller, { kind: 'swap', instanceIds: [seller.cards[0].id], durationMs: 3 * DAY });
  const id = made.data.listingId;
  const a = await call(main, 'POST', '/v1/offers', { listingId: id, instanceIds: [o1.cards[0].id], cash: 20 }, o1.token, { at: T0 + 1 });
  const b = await call(main, 'POST', '/v1/offers', { listingId: id, instanceIds: [o2.cards[0].id] }, o2.token, { at: T0 + 2 });
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal((await call(main, 'POST', '/v1/offers', { listingId: id, instanceIds: [o2.cards[0].id] }, o2.token, { at: T0 + 3 })).status, 409, 'the card is already offered');
  // the seller bounces a counteroffer back and forth until the limit
  let turn = 'seller', last;
  for (let round = 0; round < 6; round++) {
    last = await call(main, 'POST', '/v1/offers/' + a.data.offerId + '/counter', { cash: 20 + round + 1 }, (turn === 'seller' ? seller : o1).token, { at: T0 + 10 + round });
    assert.equal(last.status, 200, last.text);
    turn = turn === 'seller' ? 'offerer' : 'seller';
  }
  const limit = await call(main, 'POST', '/v1/offers/' + a.data.offerId + '/counter', { cash: 99 }, (turn === 'seller' ? seller : o1).token, { at: T0 + 20 });
  assert.equal(limit.status, 409); assert.equal(limit.error.code, 'rounds');
  // the seller takes the free swap from the second offerer
  const done = await call(main, 'POST', '/v1/offers/' + b.data.offerId + '/accept', {}, seller.token, { at: T0 + 30 });
  assert.equal(done.status, 200, done.text);
  assert.deepEqual([done.data.credits, done.data.fee], [0, 0]);
  const first = (await detail(o1, id, T0 + 31)).data.offers.find((o) => o.id === a.data.offerId);
  assert.equal(first.status, 'declined', 'the other offer closed when the listing was swapped');
  assert.deepEqual([(await wallet(o1)).held, (await wallet(o1)).balance], [0, 100]);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, o1.token)).data.items[0].state, 'owned');
  await reconciled(main);
});

test('Quick Sell: a disclosed system redemption, not a trade; quotas bound it; the card is retired', async () => {
  const me = await playerFromCards(main, [cards[40], cards[41], cards[42]]);
  const q = await call(main, 'GET', '/v1/sell/quote?ids=' + me.cards.map((c) => c.id).join(','), null, me.token, { at: T0 });
  assert.equal(q.status, 200);
  assert.ok(q.data.items.every((i) => i.quote >= 1 && i.quote < i.fair), 'always below the card\'s Average Value');
  assert.ok(q.data.disclosure.includes('not another player'));
  const stale = await call(main, 'POST', '/v1/sell', { instanceIds: me.cards.map((c) => c.id), expectTotal: q.data.total + 1 }, me.token, { at: T0 });
  assert.equal(stale.status, 409); assert.equal(stale.error.code, 'quote-changed');
  const trades = dbCount(main, 'SELECT COUNT(*) AS n FROM trades'), obs = dbCount(main, 'SELECT COUNT(*) AS n FROM price_observations');
  const sold = await call(main, 'POST', '/v1/sell', { instanceIds: me.cards.map((c) => c.id), expectTotal: q.data.total }, me.token, { at: T0 });
  assert.equal(sold.status, 200, sold.text);
  assert.equal(sold.data.total, q.data.total);
  assert.equal((await wallet(me)).balance, q.data.total);
  assert.equal(dbCount(main, 'SELECT COUNT(*) AS n FROM trades'), trades, 'not a trade'); assert.equal(dbCount(main, 'SELECT COUNT(*) AS n FROM price_observations'), obs, 'not a price');
  assert.equal((await call(main, 'GET', '/v1/inventory', null, me.token)).data.total, 0);
  assert.equal((await call(main, 'POST', '/v1/sell', { instanceIds: [me.cards[0].id] }, me.token, { at: T0 })).status, 409, 'a retired card cannot be sold again');
  const hist = await call(main, 'GET', '/v1/history', null, me.token);
  assert.ok(hist.data.items[0].redemption && hist.data.items[0].redemption.note.includes('Not a player sale'));
  await reconciled(main);
});

test('Quick Sell quotas: a daily card limit per account, then it resets at midnight UTC', async () => {
  const cheap = cards.filter((id) => CATALOG.cards[id] === 'basic');
  const many = await playerFromCards(main, Array.from({ length: 45 }, (_, i) => cheap[i % cheap.length]));
  const day = Math.floor((T0 + 10 * DAY) / DAY) * DAY + HOUR;
  const ids = many.cards.map((c) => c.id);
  const first = await call(main, 'POST', '/v1/sell', { instanceIds: ids.slice(0, 40) }, many.token, { at: day });
  assert.equal(first.status, 200, first.text);
  const over = await call(main, 'POST', '/v1/sell', { instanceIds: ids.slice(40, 41) }, many.token, { at: day + HOUR });
  assert.equal(over.status, 429); assert.equal(over.error.code, 'quota');
  const next = await call(main, 'POST', '/v1/sell', { instanceIds: ids.slice(40, 45) }, many.token, { at: day + DAY });
  assert.equal(next.status, 200, next.text);
  assert.equal((await call(main, 'POST', '/v1/sell', { instanceIds: [] }, many.token, { at: day })).status, 422);
  await reconciled(main);
});

test('reconciliation finds and repairs orphaned escrow and holds that a crash could have left', async () => {
  const me = await player(main, { cards: 2, credits: 200 });
  const clean = await reconciled(main);
  assert.ok(clean.checks >= 20);
  // simulate damage: a card marked in escrow under nothing, a hold under nothing, and a wallet that disagrees
  const who = sql(main, "SELECT id FROM accounts WHERE alias = '" + me.alias + "'")[0].id;
  const { runSql } = await import('./helpers.mjs');
  runSql(main, [
    "UPDATE instances SET state = 'escrow', escrow_ref = 'lst_ghost000000' WHERE id = '" + me.cards[0].id + "'",
    "INSERT INTO holds (account_id, kind, ref, amount, created_at) VALUES ('" + who + "', 'bid', 'lst_ghost000000', 25, 1)",
    "UPDATE wallets SET held = 25 WHERE account_id = '" + who + "'"
  ]);
  const broken = await admin(main, 'GET', '/v1/admin/reconcile');
  const kinds = broken.data.problems.map((p) => p.check);
  assert.ok(kinds.includes('escrow-without-owner-entity') && kinds.includes('bid-hold-without-listing'), kinds.join(','));
  const fixed = await admin(main, 'POST', '/v1/admin/repair', {}, T0);
  assert.equal(fixed.data.after.ok, true, JSON.stringify(fixed.data.after.problems));
  assert.equal((await call(main, 'GET', '/v1/inventory', null, me.token)).data.items.find((i) => i.id === me.cards[0].id).state, 'owned');
  assert.equal((await wallet(me)).held, 0);
  // the operator's tools do not exist for anyone else
  assert.equal((await call(main, 'GET', '/v1/admin/reconcile', null, me.token)).status, 404);
  assert.equal((await call(main, 'GET', '/v1/admin/reconcile', null, null, { headers: { 'x-admin-token': 'nope' }, key: null })).status, 404);
});

test('an auction closes on time with nobody online: the listing\'s own alarm settles it', async () => {
  const seller = await player(alarm, { cards: 1 }), buyer = await player(alarm, { credits: 300 });
  const now = Date.now();
  const made = await call(alarm, 'POST', '/v1/listings', { kind: 'auction', instanceIds: [seller.cards[0].id], start: 40, durationMs: 2500 }, seller.token, { at: now });
  assert.equal(made.status, 200, made.text);
  const bid = await call(alarm, 'POST', '/v1/listings/' + made.data.listingId + '/bid', { max: 120 }, buyer.token, { at: now + 100 });
  assert.equal(bid.status, 200, bid.text);
  assert.equal(sql(alarm, "SELECT status FROM listings WHERE id = '" + made.data.listingId + "'")[0].status, 'active');
  let status = 'active';
  for (let i = 0; i < 40 && status === 'active'; i++) {
    await new Promise((r) => setTimeout(r, 500));
    status = sql(alarm, "SELECT status FROM listings WHERE id = '" + made.data.listingId + "'")[0].status;
  }
  assert.equal(status, 'sold', 'settled by the alarm without any request touching the listing');
  assert.equal((await wallet(buyer)).balance, 260);
  assert.equal((await wallet(seller)).balance, 39);
  await reconciled(alarm);
});
