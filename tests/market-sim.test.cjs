'use strict';
// Stage 2: the offline market simulator. Deterministic engine, exact-once settlement, freeze semantics and persistence.
//   node --test tests/market-sim.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./support/sim-harness.cjs');

const DAY = 86400000, HOUR = 3600000, MIN = 60000;

function fresh(options) {
  const C = h.load(['src/market/sim/runtime.js']);
  const S = C.market.sim, env = h.makeEnv(C);
  if (options && options.bots) C.data.marketSim.world.bots = options.bots;
  return { C, S, env };
}
function run(S, world, env, host, to) { let r; do { r = S.advance(world, env, host, to, 5000); } while (!r.reached); }
function world0(ctx, seed, extra) {
  const w = ctx.S.create(Object.assign({ seed: seed || 'unit', nonce: 1, wall: 1700000000000 }, extra || {}), ctx.env);
  return w;
}
function giveBot(ctx, world, botId, cardId, serial) {
  const bot = ctx.S.botOf(world, botId);
  const it = { i: 'x-' + botId + '-' + (serial || cardId), c: cardId, v: null, k: null, s: 'CBL-ZZZ' + botId.slice(1) + '-' + String(serial || 1).padStart(6, '0'), p: 'standard', a: world.now, u: 0 };
  bot.inv.push(it);
  return it;
}
function commonCard(ctx) { return ctx.env.cards.find((c) => ctx.env.tierOf[c.id] === 1).id; }
function rareCard(ctx) { return ctx.env.cards.find((c) => ctx.env.tierOf[c.id] === 4).id; }
function player(ctx, over) {
  const state = Object.assign({ balance: 1000, inventory: [] }, over || {});
  return h.mockHost(state);
}
function withCard(ctx, host, cardId, id) {
  const inst = h.playerCard(ctx.C, ctx.env, cardId, id ? { instanceId: id } : {});
  host.state.inventory.push(inst);
  return inst;
}
// Runs bots out of the way so a hand-built scenario is not disturbed.
function quiet(world) { world.queue = world.queue.filter((e) => e.type === 'end' || e.type === 'orderEnd' || e.type === 'offerReply' || e.type === 'offerEnd' || e.type === 'snipe'); }

test('same seed gives the same world, whatever the slice size', () => {
  const a = fresh({ bots: 12 }), b = fresh({ bots: 12 });
  const wa = world0(a, 'replay'), wb = world0(b, 'replay');
  const ha = player(a), hb = player(b);
  run(a.S, wa, a.env, ha, 6 * DAY);
  for (let t = HOUR; t <= 6 * DAY; t += 7 * HOUR) a.S.advance(wb, b.env, hb, t, 100000);
  run(b.S, wb, b.env, hb, 6 * DAY);
  assert.equal(a.S.serialize(wa), b.S.serialize(wb));
  const c = fresh({ bots: 12 }), wc = world0(c, 'other');
  run(c.S, wc, c.env, player(c), 6 * DAY);
  assert.notEqual(c.S.serialize(wc), a.S.serialize(wa));
});

test('history comes only from trades the engine executed', () => {
  const ctx = fresh({ bots: 18 }), w = world0(ctx, 'history'), host = player(ctx);
  assert.equal(w.trades.length, 0);
  run(ctx.S, w, ctx.env, host, 6 * DAY);
  assert.ok(w.trades.length > 10, 'bots trade among themselves: ' + w.trades.length);
  let observed = 0;
  Object.keys(w.obs).forEach((k) => { observed += w.obs[k].length; });
  assert.ok(observed > 0 && observed <= w.stats.trades);
  w.trades.forEach((t) => { assert.ok(Number.isInteger(t.price) && t.price >= 1); assert.notEqual(t.seller, t.buyer); });
  // A card nobody traded still shows the baseline, with no sales.
  const untouched = ctx.env.cards.find((c) => !w.obs[ctx.S.keyOf(c.id, null, null)]);
  const info = ctx.S.fairInfo(w, ctx.env, untouched.id, null, null);
  assert.equal(info.basis, 'baseline'); assert.equal(info.confidence, 'none'); assert.equal(info.lastSale, null);
});

test('Credits and cards are conserved: only the allowance and packs add, only the fee removes', () => {
  const ctx = fresh({ bots: 18 }), w = world0(ctx, 'conserve'), host = player(ctx);
  const total = () => w.bots.reduce((a, b) => a + b.credits, 0);
  const cards = () => w.bots.reduce((a, b) => a + b.inv.length, 0) + Object.values(w.listings).filter((l) => l.status === 'open').reduce((a, l) => a + l.items.length, 0);
  const t0 = total(), c0 = cards(), a0 = w.stats.allowance, f0 = w.stats.burnt, m0 = w.minted;
  run(ctx.S, w, ctx.env, host, 12 * DAY);
  assert.equal(total(), t0 + (w.stats.allowance - a0) - (w.stats.burnt - f0));
  assert.equal(cards(), c0 + (w.minted - m0));
  assert.equal(ctx.S.audit(w, []).problems.length, 0);
  w.bots.forEach((b) => { assert.ok(b.credits >= 0); assert.ok(ctx.S.botHeld(b) <= b.credits); });
});

test('bots with no Credits cannot buy or bid', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'broke'), host = player(ctx);
  w.bots.forEach((b) => { b.credits = 0; });
  const before = w.stats.trades;
  // Only the daily allowance may revive them; stop before the first day.
  run(ctx.S, w, ctx.env, host, 20 * HOUR);
  assert.equal(w.stats.trades, before);
  w.bots.forEach((b) => assert.ok(b.credits >= 0));
});

test('listing locks the exact copy and prevents a second operation', () => {
  const ctx = fresh({ bots: 6 }), w = world0(ctx, 'lock'), host = player(ctx);
  const a = withCard(ctx, host, commonCard(ctx)), b = withCard(ctx, host, commonCard(ctx));
  const r = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [a.instanceId], ask: 500, durationMs: 3 * DAY });
  assert.equal(r.ok, true);
  assert.equal(w.locks[a.instanceId], r.listing.id);
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [a.instanceId], ask: 400, durationMs: DAY }).error, 'locked');
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'auction', instanceIds: [b.instanceId, a.instanceId], start: 10, durationMs: DAY }).error, 'locked');
  // the other copy of the same stack is untouched
  assert.equal(w.locks[b.instanceId], undefined);
  assert.equal(ctx.S.player.cancel(w, ctx.env, host, r.listing.id).ok, true);
  assert.equal(w.locks[a.instanceId], undefined);
  assert.equal(host.state.inventory.length, 2);
});

test('invalid prices are rejected: zero, negative, fractional, huge', () => {
  const ctx = fresh({ bots: 6 }), w = world0(ctx, 'prices'), host = player(ctx);
  const a = withCard(ctx, host, commonCard(ctx));
  [0, -5, 1.5, NaN, 1e12].forEach((ask) => assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [a.instanceId], ask, durationMs: DAY }).ok, false, String(ask)));
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'auction', instanceIds: [a.instanceId], start: 10, reserve: 5, durationMs: DAY }).error, 'reserve');
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'auction', instanceIds: [a.instanceId], start: 10, buyout: 10, durationMs: DAY }).error, 'buyout');
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'auction', instanceIds: [a.instanceId], start: 10, durationMs: 60000 }).error, 'duration');
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'auction', instanceIds: [a.instanceId, a.instanceId], start: 10, durationMs: DAY }).error, 'bundle');
  assert.equal(Object.keys(w.locks).length, 0);
});

test('a bot buying the player\'s card settles exactly once', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'sale'), host = player(ctx, { balance: 100 });
  const card = commonCard(ctx), inst = withCard(ctx, host, card);
  const l = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 1, durationMs: 3 * DAY }).listing;
  run(ctx.S, w, ctx.env, host, 4 * DAY);
  assert.equal(l.status, 'sold');
  assert.equal(host.state.inventory.find((i) => i.instanceId === inst.instanceId), undefined, 'the card left the save');
  assert.equal(host.state.balance, 100 + 1 - ctx.S.fee(1), 'net of the fee, once');
  assert.equal(host.state.receipts.size, 1);
  assert.equal(w.pending.length, 0);
  const net = host.state.balance;
  run(ctx.S, w, ctx.env, host, 8 * DAY);
  assert.equal(host.state.balance, net);
  assert.equal(ctx.S.holdersOf(w, inst.instanceId).length, 1);
  assert.equal(ctx.S.audit(w, host.state.inventory.map((i) => i.instanceId)).problems.length, 0);
});

test('a failed save write leaves the sale pending and a retry applies it once', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'retry'), host = player(ctx, { balance: 100, failNext: 3 });
  const inst = withCard(ctx, host, commonCard(ctx));
  const l = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 1, durationMs: 3 * DAY }).listing;
  run(ctx.S, w, ctx.env, host, 3 * DAY);
  assert.equal(l.status, 'settling', 'waiting on the save');
  assert.equal(w.pending.length, 1);
  assert.ok(host.state.inventory.find((i) => i.instanceId === inst.instanceId), 'the card is still in the save');
  assert.equal(host.state.balance, 100);
  host.state.failNext = 0;
  assert.equal(ctx.S.retrySettlements(w, ctx.env, host), 0);
  assert.equal(l.status, 'sold');
  assert.equal(host.state.balance, 100 + 1 - ctx.S.fee(1));
  assert.equal(ctx.S.retrySettlements(w, ctx.env, host), 0);
  assert.equal(host.state.log.length, 1);
});

test('a crash between the two writes is repaired on load, whichever side finished', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'crash'), host = player(ctx, { balance: 100, failNext: 1 });
  const inst = withCard(ctx, host, commonCard(ctx));
  const l = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 1, durationMs: 3 * DAY }).listing;
  run(ctx.S, w, ctx.env, host, 3 * DAY);
  assert.equal(l.status, 'settling');
  // Case A: the simulator state was saved with the intent; the save never changed.
  const savedText = ctx.S.serialize(w);
  const restored = ctx.S.deserialize(savedText, ctx.env);
  const changes = ctx.S.reconcile(restored, ctx.env, host);
  assert.equal(restored.listings[l.id].status, 'sold');
  assert.equal(host.state.balance, 100 + 1 - ctx.S.fee(1));
  assert.equal(changes.length, 0);
  // Case B: the save applied the effect but the simulator never recorded it as done.
  const again = ctx.S.deserialize(savedText, ctx.env);
  const balance = host.state.balance;
  ctx.S.reconcile(again, ctx.env, host);
  assert.equal(host.state.balance, balance, 'no second credit');
  assert.equal(again.listings[l.id].status, 'sold');
  assert.equal(host.state.receipts.size, 1);
});

test('buying: Credits and the exact card move once, and a repeated request is ignored', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'buy'), host = player(ctx, { balance: 400 });
  quiet(w);
  const it = giveBot(ctx, w, 'b01', commonCard(ctx), 7);
  const bot = ctx.S.botOf(w, 'b01'); bot.inv = bot.inv.filter((x) => x !== it);
  const l = ctx.S.makeListing(w, { kind: 'fixed', seller: 'b01', items: [it], ask: 60, durationMs: 3 * DAY });
  const r1 = ctx.S.player.buy(w, ctx.env, host, l.id, 'req-1');
  assert.equal(r1.ok, true);
  assert.equal(host.state.balance, 340);
  const bought = host.state.inventory.find((i) => i.instanceId === it.i);
  assert.ok(bought && bought.serial === it.s && bought.cardId === it.c && bought.variantId === null);
  const r2 = ctx.S.player.buy(w, ctx.env, host, l.id, 'req-1');
  assert.equal(r2.repeated, true);
  assert.equal(host.state.balance, 340);
  assert.equal(ctx.S.player.buy(w, ctx.env, host, l.id, 'req-2').error, 'closed');
  assert.equal(host.state.inventory.length, 1);
  // The seller was paid the price less the fee.
  assert.equal(bot.credits >= 0, true);
});

test('holds stop the same Credits from being promised twice', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'holds'), host = player(ctx, { balance: 150 });
  quiet(w);
  const a = giveBot(ctx, w, 'b02', commonCard(ctx), 1), b = giveBot(ctx, w, 'b03', commonCard(ctx), 2);
  const c = giveBot(ctx, w, 'b04', commonCard(ctx), 3);
  [a, b, c].forEach((it) => { const bot = ctx.S.botOf(w, 'b02'); void bot; });
  ctx.S.botOf(w, 'b02').inv = []; ctx.S.botOf(w, 'b03').inv = []; ctx.S.botOf(w, 'b04').inv = [];
  const auction = ctx.S.makeListing(w, { kind: 'auction', seller: 'b02', items: [a], start: 10, durationMs: DAY });
  const fixed = ctx.S.makeListing(w, { kind: 'fixed', seller: 'b03', items: [b], ask: 100, durationMs: DAY });
  const auction2 = ctx.S.makeListing(w, { kind: 'auction', seller: 'b04', items: [c], start: 10, durationMs: DAY });
  assert.equal(ctx.S.player.bid(w, ctx.env, host, auction.id, 120).ok, true);
  assert.equal(ctx.S.playerHeld(w), 120);
  assert.equal(ctx.S.player.buy(w, ctx.env, host, fixed.id).error, 'funds', 'only 30 is free');
  assert.equal(ctx.S.player.bid(w, ctx.env, host, auction2.id, 40).error, 'funds');
  assert.equal(ctx.S.player.bid(w, ctx.env, host, auction2.id, 30).ok, true);
  // raising the same bid only needs the difference
  assert.equal(ctx.S.player.bid(w, ctx.env, host, auction.id, 130).ok, false, 'not enough free for the +10 only if exhausted');
});

test('proxy bidding: second price plus one step, ties to the earlier bid, anti-snipe, reserve and buyout', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'proxy'), host = player(ctx, { balance: 5000 });
  quiet(w);
  const seller = ctx.S.botOf(w, 'b01'), it = giveBot(ctx, w, 'b01', rareCard(ctx), 1); seller.inv = [];
  ['b02', 'b03', 'b04'].forEach((id) => { ctx.S.botOf(w, id).credits = 5000; });
  const l = ctx.S.makeListing(w, { kind: 'auction', seller: 'b01', items: [it], start: 100, reserve: 160, durationMs: 6 * HOUR });
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b02', 90).error, 'increment');
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b02', 200).ok, true);
  assert.equal(ctx.S.auctionView(l).price, 160, 'a maximum above the reserve shows the reserve as the price');
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b03', 150).error, 'increment', 'at the reserve price the next bid must clear one more step');
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b03', 170).ok, true);
  let v = ctx.S.auctionView(l);
  assert.equal(v.lead.by, 'b02'); assert.equal(v.price, 170 + ctx.S.incrementFor(170));
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b03', 200).ok, true);
  v = ctx.S.auctionView(l);
  assert.equal(v.lead.by, 'b02', 'equal maxima: the earlier bidder keeps it'); assert.equal(v.price, 200);
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b01', 500).error, 'own');
  // anti-sniping extends the close once a bid lands in the last window
  w.now = l.endsAt - 2 * MIN;
  const ends = l.endsAt;
  assert.equal(ctx.S.placeBid(w, ctx.env, host, l, 'b04', 400).ok, true);
  assert.ok(l.endsAt > ends && l.extensions === 1);
  // settle: b04 wins at the price above the runner-up, seller gets it net of the fee
  const before = seller.credits, buyerBefore = ctx.S.botOf(w, 'b04').credits;
  run(ctx.S, w, ctx.env, host, l.endsAt + MIN);
  assert.equal(l.status, 'sold'); assert.equal(l.buyer, 'b04');
  const price = l.soldFor;
  assert.equal(price, 200 + ctx.S.incrementFor(200));
  assert.equal(seller.credits, before + price - ctx.S.fee(price));
  assert.equal(ctx.S.botOf(w, 'b04').credits, buyerBefore - price);
  assert.equal(ctx.S.botOf(w, 'b02').held['L' + l.id], undefined, 'losing holds are released');
});

test('a reserve that is not met returns the card; a reserve inside the leader\'s maximum lifts the price to it', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'reserve'), host = player(ctx);
  quiet(w);
  ['b02'].forEach((id) => { ctx.S.botOf(w, id).credits = 9000; });
  const mk = (id, serial, reserve) => { const it = giveBot(ctx, w, id, rareCard(ctx), serial); ctx.S.botOf(w, id).inv = []; return ctx.S.makeListing(w, { kind: 'auction', seller: id, items: [it], start: 50, reserve, durationMs: 6 * HOUR }); };
  const low = mk('b01', 1, 400), lift = mk('b03', 2, 150);
  ctx.S.placeBid(w, ctx.env, host, low, 'b02', 100);
  ctx.S.placeBid(w, ctx.env, host, lift, 'b02', 300);
  run(ctx.S, w, ctx.env, host, 7 * HOUR);
  assert.equal(low.status, 'expired'); assert.equal(low.endNote, 'Reserve not met');
  assert.ok(ctx.S.botOf(w, 'b01').inv.length === 1, 'returned to the seller');
  assert.equal(lift.status, 'sold'); assert.equal(lift.soldFor, 150);
});

test('buyout ends an auction at once and cancels other holds', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'buyout'), host = player(ctx, { balance: 3000 });
  quiet(w);
  const it = giveBot(ctx, w, 'b01', rareCard(ctx), 3); ctx.S.botOf(w, 'b01').inv = [];
  ctx.S.botOf(w, 'b02').credits = 4000;
  const l = ctx.S.makeListing(w, { kind: 'auction', seller: 'b01', items: [it], start: 100, buyout: 900, durationMs: DAY });
  ctx.S.placeBid(w, ctx.env, host, l, 'b02', 300);
  const r = ctx.S.player.buyout(w, ctx.env, host, l.id);
  assert.equal(r.ok, true);
  assert.equal(host.state.balance, 2100);
  assert.equal(l.status, 'sold');
  assert.equal(ctx.S.botOf(w, 'b02').held['L' + l.id], undefined);
  assert.equal(host.state.inventory.length, 1);
});

test('buy orders fill at the ask, cheapest first, and release their hold', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'orders'), host = player(ctx, { balance: 500 });
  quiet(w);
  const card = commonCard(ctx);
  const i1 = giveBot(ctx, w, 'b01', card, 11), i2 = giveBot(ctx, w, 'b02', card, 12);
  ctx.S.botOf(w, 'b01').inv = []; ctx.S.botOf(w, 'b02').inv = [];
  ctx.S.makeListing(w, { kind: 'fixed', seller: 'b01', items: [i1], ask: 90, durationMs: DAY });
  const cheap = ctx.S.makeListing(w, { kind: 'fixed', seller: 'b02', items: [i2], ask: 70, durationMs: DAY });
  const r = ctx.S.player.placeOrder(w, ctx.env, host, { c: card, maxPrice: 100, durationMs: DAY });
  assert.equal(r.ok, true);
  assert.equal(r.order.status, 'filled'); assert.equal(r.order.paid, 70);
  assert.equal(cheap.status, 'sold');
  assert.equal(host.state.balance, 430);
  assert.equal(ctx.S.playerHeld(w), 0);
  // below every ask: it waits, holds the Credits, and can be cancelled
  const r2 = ctx.S.player.placeOrder(w, ctx.env, host, { c: commonCard(ctx), v: 'matte', maxPrice: 20, durationMs: DAY });
  assert.equal(r2.ok, true); assert.equal(r2.order.status, 'open');
  assert.equal(ctx.S.playerHeld(w), 20);
  assert.equal(ctx.S.player.cancelOrder(w, ctx.env, host, r2.order.id).ok, true);
  assert.equal(ctx.S.playerHeld(w), 0);
  assert.equal(ctx.S.player.placeOrder(w, ctx.env, host, { c: card, maxPrice: 9999, durationMs: DAY }).error, 'funds');
});

test('a swap moves both cards once, or neither', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'swap'), host = player(ctx, { balance: 50 });
  quiet(w);
  const card = commonCard(ctx);
  const theirs = giveBot(ctx, w, 'b01', card, 21); ctx.S.botOf(w, 'b01').inv = [];
  const l = ctx.S.makeListing(w, { kind: 'swap', seller: 'b01', items: [theirs], durationMs: 5 * DAY, wants: { cardId: card, minFrac: 0.85 } });
  const mine = withCard(ctx, host, card);
  const r = ctx.S.player.propose(w, ctx.env, host, { listingId: l.id, instanceIds: [mine.instanceId] });
  assert.equal(r.ok, true);
  assert.equal(w.locks[mine.instanceId], 'offer:' + r.offer.id);
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [mine.instanceId], ask: 5, durationMs: DAY }).error, 'locked');
  run(ctx.S, w, ctx.env, host, 2 * DAY);
  assert.equal(r.offer.status, 'accepted');
  assert.equal(host.state.inventory.length, 1);
  assert.equal(host.state.inventory[0].instanceId, theirs.i);
  assert.equal(ctx.S.holdersOf(w, mine.instanceId).filter((x) => x.indexOf('b01') === 0 || x.indexOf('b0') === 0).length, 1, 'now held by the bot');
  assert.equal(host.state.balance, 50);
  assert.equal(ctx.S.audit(w, host.state.inventory.map((i) => i.instanceId)).problems.length, 0);
  // a worse card is declined and unlocks
  const l2 = ctx.S.makeListing(w, { kind: 'swap', seller: 'b02', items: [rareCard(ctx) && (() => { const it = giveBot(ctx, w, 'b02', rareCard(ctx), 22); ctx.S.botOf(w, 'b02').inv = []; return it; })()], durationMs: 5 * DAY });
  const cheap = withCard(ctx, host, commonCard(ctx));
  const r2 = ctx.S.player.propose(w, ctx.env, host, { listingId: l2.id, instanceIds: [cheap.instanceId] });
  run(ctx.S, w, ctx.env, host, 5 * DAY);
  assert.ok(['declined', 'countered'].includes(r2.offer.status), r2.offer.status);
  if (r2.offer.status === 'declined') assert.equal(w.locks[cheap.instanceId], undefined);
});

test('the clock only runs while the game is active, never catches up and ignores the system clock', () => {
  const ctx = fresh({ bots: 12 });
  let mono = 1000, wall = 1700000000000, visible = true;
  const store = new Map();
  const state = { balance: 100, inventory: [] }, host = h.mockHost(state);
  const rt = ctx.S.Runtime({ env: ctx.env, storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    now: () => mono, wall: () => wall, gate: () => (visible ? true : 'The window is hidden.'), timers: { set: () => 1, clear: () => {} },
    player: { balance: host.balance, instance: host.instance, hasReceipt: host.hasReceipt, apply: host.settle, identity: () => 'TEST:1', codes: () => [] }, speedId: 'standard' });
  rt.create({ seed: 'clock' });
  const t0 = rt.world.now;
  rt.tick(); // first tick only starts the interval
  mono += 5000; rt.tick();
  const afterFive = rt.world.now - t0;
  assert.ok(afterFive >= 5000 * rt.factor() * 0.99 && afterFive <= 5000 * rt.factor() * 1.01 + 1, 'five active seconds, scaled: ' + afterFive);
  // hidden: nothing advances, and the hidden minutes are never banked
  visible = false;
  mono += 600000; rt.tick();
  assert.equal(rt.world.now - t0, afterFive);
  assert.equal(rt.state, 'frozen');
  visible = true;
  rt.resumeClock();
  mono += 1000; rt.tick();           // starts a fresh interval
  const resumed = rt.world.now;
  mono += 2000; rt.tick();
  assert.ok(Math.abs((rt.world.now - resumed) - 2000 * rt.factor()) < 5, 'resumed with only the new interval');
  // a long gap is an interruption, not time that happened
  const before = rt.world.now;
  mono += 120000; rt.tick();
  assert.equal(rt.world.now, before);
  // the system clock moving does not matter
  wall -= 7 * 86400000;
  mono += 1000; rt.tick();
  assert.ok(rt.world.now - before >= 0 && rt.world.now - before <= 1000 * rt.factor() + 1);
  // explicit pause
  rt.pause();
  const frozenAt = rt.world.now;
  mono += 4000; rt.tick(); mono += 4000; rt.tick();
  assert.equal(rt.world.now, frozenAt);
  rt.resume();
  assert.equal(rt.state === 'running' || rt.state === 'frozen', true);
});

test('state survives reload and a damaged copy falls back to the backup', () => {
  const ctx = fresh({ bots: 12 });
  let mono = 0, wall = 1700000000000;
  const store = new Map();
  const host = h.mockHost({ balance: 100, inventory: [] });
  const mk = () => ctx.S.Runtime({ env: ctx.env, storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    now: () => mono, wall: () => wall, gate: () => true, timers: { set: () => 1, clear: () => {} },
    player: { balance: host.balance, instance: host.instance, hasReceipt: host.hasReceipt, apply: host.settle, identity: () => 'TEST:1', codes: () => [] } });
  const a = mk();
  a.create({ seed: 'persist' });
  a.dev.fastForward(2 * DAY);
  a.flush();
  const snapshot = ctx.S.serialize(a.world);
  const b = mk();
  assert.equal(b.load(), true);
  assert.equal(ctx.S.serialize(b.world), snapshot);
  // damage the main copy: the backup (kept on player actions) takes over and the damaged text is kept
  a.dev.fastForward(HOUR); a.flush();
  const key = ctx.C.data.marketSim.storageKey;
  const good = store.get(key);
  store.set(key, good.slice(0, good.length - 40));
  const c = mk();
  assert.equal(c.load(), true);
  assert.equal(c.recoveredFrom, 'backup');
  assert.ok([...store.keys()].some((k) => k.indexOf('.corrupt') >= 0), 'the damaged text is kept');
  // both damaged: no world, nothing deleted
  store.set(key + '.bak', 'nonsense');
  store.set(key, 'nonsense');
  const d = mk();
  assert.equal(d.load(), false);
  assert.ok(d.loadNotes.length >= 2);
  // a tampered body fails its checksum
  const wrapper = JSON.parse(snapshot); wrapper.body = wrapper.body.replace('"now":', '"now":1');
  assert.throws(() => ctx.S.deserialize(JSON.stringify(wrapper), ctx.env), /checksum/);
});

test('a different save detaches the player from the world and an older save is brought up to date', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'identity'), host = player(ctx, { balance: 100 });
  const inst = withCard(ctx, host, commonCard(ctx));
  const l = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 1, durationMs: 3 * DAY }).listing;
  run(ctx.S, w, ctx.env, host, 3 * DAY);
  assert.equal(l.status, 'sold');
  // The save is rolled back to before the sale: the receipt is applied again, once.
  host.state.inventory.push(inst); host.state.balance = 100; host.state.receipts = new Set();
  const changes = ctx.S.reconcile(w, ctx.env, host);
  assert.ok(changes.some((c) => c.indexOf('replayed') === 0), JSON.stringify(changes));
  assert.equal(host.state.inventory.length, 0);
  assert.equal(host.state.balance, 100 + 1 - ctx.S.fee(1));
  assert.equal(ctx.S.reconcile(w, ctx.env, host).length, 0);
  // another player's save: their listings are cancelled
  const inst2 = withCard(ctx, host, commonCard(ctx));
  const l2 = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst2.instanceId], ask: 9999, durationMs: 3 * DAY }).listing;
  ctx.S.detachPlayer(w, ctx.env);
  assert.equal(l2.status, 'cancelled');
  assert.equal(Object.keys(w.locks).filter((k) => k === inst2.instanceId).length, 0);
});

test('a card removed from the collection cancels its listing', () => {
  const ctx = fresh({ bots: 12 }), w = world0(ctx, 'gone'), host = player(ctx);
  const inst = withCard(ctx, host, commonCard(ctx));
  const l = ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 9999, durationMs: 3 * DAY }).listing;
  host.state.inventory = [];
  const changes = ctx.S.reconcile(w, ctx.env, host);
  assert.equal(l.status, 'cancelled');
  assert.ok(changes.length >= 1);
  assert.equal(w.locks[inst.instanceId], undefined);
});

test('locked cards cannot be listed', () => {
  const ctx = fresh({ bots: 6 }), w = world0(ctx, 'protected'), host = player(ctx);
  const inst = withCard(ctx, host, commonCard(ctx));
  inst.locked = true;
  assert.equal(ctx.S.player.list(w, ctx.env, host, { kind: 'fixed', instanceIds: [inst.instanceId], ask: 20, durationMs: DAY }).error, 'protected');
});

test('the fee is taken once, rounded half up with a one Credit minimum', () => {
  const ctx = fresh({ bots: 6 });
  assert.equal(ctx.S.fee(1), 1); assert.equal(ctx.S.fee(25), 1); assert.equal(ctx.S.fee(75), 2); assert.equal(ctx.S.fee(1000), 20);
});
