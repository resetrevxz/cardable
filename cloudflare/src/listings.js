// Listings: creating, withdrawing, repricing, buying, bidding, buying out and settling. Fixed price, timed auction
// (proxy bidding, anti-sniping, reserve, buyout) and swap listings share one ownership model: a listed card is in
// escrow (instances.state = 'escrow', escrow_ref = listing id) until the listing closes, and then it moves exactly once.
import { ApiError, cleanText, num } from './util.js';
import { RULES, applyBid, closeAuction, feeFor, isCard, keyOf, nameOf, normalizeWants, rarityOf, resolveAuction } from './economy.js';
import { Tx, mutate, newId, system } from './ops.js';
import { valuations } from './valuation.js';
import { closeOfferStatements, pendingOffersOf } from './offers.js';
import { scheduleClose } from './schedule.js';

const placeholders = (n) => new Array(n).fill('?').join(',');
const label = (L) => { const first = JSON.parse(L.items)[0]; return nameOf(first.c) + (L.item_count > 1 ? ' and ' + (L.item_count - 1) + ' more' : ''); };

export async function getListing(env, id) { return env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first(); }
async function getProxies(env, id) {
  const rows = await env.DB.prepare('SELECT bidder_id, max_amount, seq, active FROM bids WHERE listing_id = ? ORDER BY seq').bind(id).all();
  return rows.results.map((r) => ({ id: r.bidder_id, max: r.max_amount, seq: r.seq, active: !!r.active }));
}
async function getWallet(env, accountId) { return env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(accountId).first(); }
async function aliasOf(env, accountId) { const r = await env.DB.prepare('SELECT alias FROM accounts WHERE id = ?').bind(accountId).first(); return r ? r.alias : 'Someone'; }
const auctionOf = (L) => ({ start: L.start_price, reserve: L.reserve, step: L.step });
const toProxy = (p) => ({ id: p.id, max: p.max, seq: p.seq });

// ---- statement builders shared by every way a listing can end --------------------------------------------------------
function guardOpen(tx, L, now) {
  tx.guard('stale', "EXISTS (SELECT 1 FROM listings WHERE id = ? AND version = ? AND status = 'active')", L.id, L.version);
  if (now != null) tx.guard('closed', 'EXISTS (SELECT 1 FROM listings WHERE id = ? AND ends_at > ?)', L.id, now);
}
function guardDue(tx, L, now) {
  tx.guard('stale', "EXISTS (SELECT 1 FROM listings WHERE id = ? AND version = ? AND status = 'active' AND ends_at <= ?)", L.id, L.version, now);
}
function moveItems(tx, L, toOwner) {
  tx.guard('stale', "(SELECT COUNT(*) FROM instances WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?) = ?", L.id, L.seller_id, L.item_count);
  tx.add("UPDATE instances SET owner_id = ?, state = 'owned', escrow_ref = NULL WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?", toOwner, L.id, L.seller_id);
  tx.add('DELETE FROM listing_items WHERE listing_id = ?', L.id);
}
// Every held bid on the listing is let go. Only the leader holds, so this is zero or one hold.
function releaseBids(tx, L, proxies, outcome) {
  proxies.filter((p) => p.active).forEach((p) => tx.holdClose(p.id, 'bid', L.id, p.max, outcome || 'released'));
  if (proxies.some((p) => p.active)) tx.add('UPDATE bids SET active = 0, updated_at = ? WHERE listing_id = ? AND active = 1', tx.now, L.id);
}
async function closeOffers(env, tx, L, why) {
  const offers = await pendingOffersOf(env, L.id);
  offers.forEach((o) => closeOfferStatements(tx, o, 'withdrawn', why));
  return offers;
}
// A listing ends without a sale: the cards go home, every hold is released, waiting offers close.
async function planClose(env, tx, L, status, note, proxies, now) {
  guardOpen(tx, L, null);
  moveItems(tx, L, L.seller_id);
  releaseBids(tx, L, proxies, 'closed');
  await closeOffers(env, tx, L, status === 'cancelled' ? 'The listing was withdrawn.' : 'The listing ended.');
  tx.add("UPDATE listings SET status = ?, closed_at = ?, end_note = ?, version = version + 1 WHERE id = ?", status, now, note || null, L.id);
}
// A listing ends in a sale of its cards for Credits.
function planSale(tx, L, buyerId, price, kind, heldRelease) {
  const fee = feeFor(price), net = price - fee, tradeId = newId('trd'), items = JSON.parse(L.items);
  guardOpen(tx, L, null);
  moveItems(tx, L, buyerId);
  tx.guard('funds', 'EXISTS (SELECT 1 FROM wallets WHERE account_id = ? AND balance - (held - ?) >= ?)', buyerId, heldRelease || 0, price);
  tx.debit(buyerId, price, heldRelease || 0, kind === 'auction' || kind === 'buyout' ? 'auction purchase' : 'purchase', tradeId);
  tx.credit(L.seller_id, net, 'sale', tradeId);
  tx.add("UPDATE listings SET status = 'sold', closed_at = ?, sold_price = ?, fee = ?, buyer_id = ?, price = ?, version = version + 1 WHERE id = ?", tx.now, price, fee, buyerId, price, L.id);
  const first = items[0];
  tx.add('INSERT INTO trades (id, at, kind, listing_id, seller_id, buyer_id, price, fee, item_count, card_id, variant_id, skin_id, items, attributed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    tradeId, tx.now, kind, L.id, L.seller_id, buyerId, price, fee, L.item_count, first.c, first.v || null, first.k || null, L.items, L.item_count === 1 ? 1 : 0);
  // One card sold for Credits is a price observation. A bundle is not attributed to any card, so it never moves a price.
  if (L.item_count === 1) tx.add('INSERT INTO price_observations (at, card_key, price, kind, trade_id) VALUES (?, ?, ?, ?, ?)', tx.now, keyOf(first.c, first.v, first.k), price, kind === 'order' ? 'fixed' : kind, tradeId);
  tx.notify(L.seller_id, 'sold', label(L) + ' sold for ' + price + ' Credits. You receive ' + net + ' after the ' + fee + ' Credit fee.', L.id);
  tx.notify(buyerId, kind === 'auction' ? 'won' : 'bought', (kind === 'auction' ? 'You won ' : 'You bought ') + label(L) + ' for ' + price + ' Credits.', L.id);
  return { tradeId, fee, net };
}
export { planSale as _planSale };

// ---- creating ---------------------------------------------------------------------------------------------------------
function intIn(value, lo, hi, field, optional) {
  if (value == null || value === '') { if (optional) return null; throw new ApiError(422, 'invalid', 'Enter a whole number for ' + field + '.'); }
  const n = num(value);
  if (!Number.isSafeInteger(n) || n < lo || n > hi) throw new ApiError(422, 'invalid', 'Enter a whole number from ' + lo + ' to ' + hi + ' for ' + field + '.');
  return n;
}
function durationMs(env, kind, requested) {
  const r = RULES[kind === 'swap' ? 'swap' : kind === 'auction' ? 'auction' : 'fixed'];
  const min = env.ENVIRONMENT === 'test' && Number(env.TEST_MIN_AUCTION_MS) > 0 ? Number(env.TEST_MIN_AUCTION_MS) : r.minDurationMs;
  if (requested == null || requested === '') return r.defaultMs;
  const ms = num(requested);
  if (!Number.isSafeInteger(ms) || ms < min || ms > r.maxDurationMs) {
    throw new ApiError(422, 'duration', 'Choose a length from ' + Math.round(min / 3600000) + ' hour to ' + Math.round(r.maxDurationMs / 86400000) + ' days.');
  }
  return ms;
}

export async function createListing(env, who, key, body, now, options) {
  options = options || {};
  const kind = body.kind === 'buy-now' ? 'fixed' : body.kind;
  if (!['fixed', 'auction', 'swap'].includes(kind)) throw new ApiError(422, 'invalid', 'Choose a listing type.');
  const ids = Array.isArray(body.instanceIds) ? body.instanceIds.filter((x) => typeof x === 'string') : [];
  if (!ids.length || ids.length > RULES.bundle.max || new Set(ids).size !== ids.length) throw new ApiError(422, 'bundle', 'A listing holds between 1 and ' + RULES.bundle.max + ' different cards.');
  const title = cleanText(body.title, RULES.limits.titleLength, 'title'), note = cleanText(body.note, RULES.limits.noteLength, 'description');
  let params = {};
  if (kind === 'fixed') {
    params = { ask: intIn(body.ask, RULES.price.min, RULES.price.max, 'the price'), ends: durationMs(env, 'fixed', body.durationMs) };
  } else if (kind === 'auction') {
    const start = intIn(body.start, RULES.price.min, RULES.price.max, 'the starting bid');
    const reserve = intIn(body.reserve, start, RULES.price.max, 'the reserve', true), buyout = intIn(body.buyout, 1, RULES.price.max, 'the buyout', true);
    if (buyout != null && buyout <= Math.max(start, reserve || 0)) throw new ApiError(422, 'buyout', 'The buyout must be above the starting bid and the reserve.');
    const step = intIn(body.step, 1, RULES.price.max, 'the bid step', true);
    params = { start, reserve, buyout, step, ends: durationMs(env, 'auction', body.durationMs) };
  } else {
    const minTopUp = intIn(body.minTopUp, 0, RULES.price.max, 'the minimum top-up', true) || 0;
    params = { wants: normalizeWants(body.wants), minTopUp, ends: durationMs(env, 'swap', body.durationMs) };
  }
  return mutate(env, who, key, { op: 'list', kind, ids, title, note, params }, now, async () => {
    const rows = (await env.DB.prepare('SELECT id, card_id, variant_id, skin_id, serial, pack_id, pulled_at, state, owner_id FROM instances WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all()).results;
    if (rows.length !== ids.length || rows.some((r) => r.owner_id !== who.accountId)) throw new ApiError(409, 'not-owned', 'One of those cards is not in your collection.');
    if (rows.some((r) => r.state !== 'owned')) throw new ApiError(409, 'locked', 'One of those cards is already listed, in an offer or sold.');
    const open = (await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'active'").bind(who.accountId).first()).n;
    if (open >= RULES.limits.activeListings) throw new ApiError(409, 'limit', 'You can have ' + RULES.limits.activeListings + ' open listings at once.');
    const ordered = ids.map((id) => rows.find((r) => r.id === id));
    const first = ordered[0], items = ordered.map((r) => ({ i: r.id, c: r.card_id, v: r.variant_id, k: r.skin_id, s: r.serial, p: r.pack_id }));
    const id = newId('lst');
    let price;
    if (kind === 'fixed') price = params.ask;
    else if (kind === 'auction') price = params.start;
    else price = (await valuations(env, [{ cardId: first.card_id, variantId: first.variant_id, skinId: first.skin_id, serial: first.serial }], now))[0].average;
    const tx = new Tx(env, now);
    tx.guard('not_owned', "(SELECT COUNT(*) FROM instances WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned') = ?", ...ids, who.accountId, ids.length);
    tx.guard('limit_hit', "(SELECT COUNT(*) FROM listings WHERE seller_id = ? AND status = 'active') < ?", who.accountId, RULES.limits.activeListings);
    tx.add('INSERT INTO listings (id, seller_id, kind, status, ask, start_price, reserve, buyout, step, price, title, note, wants, min_topup, card_id, variant_id, skin_id, rarity, item_count, items, created_at, ends_at, first_ends_at, relist_of) ' +
      "VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, who.accountId, kind, kind === 'fixed' ? params.ask : null, kind === 'auction' ? params.start : null, kind === 'auction' ? params.reserve : null, kind === 'auction' ? params.buyout : null,
      kind === 'auction' ? params.step : null, price, title, note, kind === 'swap' && params.wants ? JSON.stringify(params.wants) : null, kind === 'swap' ? params.minTopUp : 0,
      first.card_id, first.variant_id, first.skin_id, rarityOf(first.card_id), ids.length, JSON.stringify(items), now, now + params.ends, now + params.ends, options.relistOf || null);
    tx.add("UPDATE instances SET state = 'escrow', escrow_ref = ? WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned'", id, ...ids, who.accountId);
    ids.forEach((iid) => tx.add('INSERT INTO listing_items (listing_id, instance_id) VALUES (?, ?)', id, iid));
    return { tx, result: { ok: true, listingId: id, kind, price, endsAt: now + params.ends, items: ids.length } };
  }).then(async (res) => {
    if (!res.replayed) {
      await scheduleClose(env, res.listingId, res.endsAt);
      // A new single-card fixed listing may satisfy a standing buy order, in price-then-time order. Best effort: the
      // sweep repeats it, so an interruption here leaves the order open, never a half trade.
      if (kind === 'fixed' && ids.length === 1) { try { const { matchListing } = await import('./orders.js'); await matchListing(env, res.listingId, now); } catch (_) { /* the sweep will match it */ } }
    }
    return res;
  });
}

// ---- withdrawing and repricing -------------------------------------------------------------------------------------------
export async function cancelListing(env, who, key, listingId, now) {
  return mutate(env, who, key, { op: 'cancel', listingId }, now, async () => {
    const L = await getListing(env, listingId);
    if (!L || L.seller_id !== who.accountId) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    if (L.status !== 'active') throw new ApiError(409, 'closed', 'This listing is already closed.');
    const proxies = await getProxies(env, L.id);
    if (L.kind === 'auction' && L.bid_count > 0) throw new ApiError(409, 'has-bids', 'An auction with bids cannot be withdrawn.');
    const tx = new Tx(env, now);
    await planClose(env, tx, L, 'cancelled', 'Withdrawn by the seller', proxies, now);
    return { tx, result: { ok: true, listingId: L.id, status: 'cancelled' } };
  });
}
export async function repriceListing(env, who, key, listingId, body, now) {
  const ask = intIn(body.ask, RULES.price.min, RULES.price.max, 'the price');
  return mutate(env, who, key, { op: 'reprice', listingId, ask }, now, async () => {
    const L = await getListing(env, listingId);
    if (!L || L.seller_id !== who.accountId) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    if (L.status !== 'active' || now >= L.ends_at) throw new ApiError(409, 'closed', 'This listing is already closed.');
    if (L.kind !== 'fixed') throw new ApiError(409, 'not-fixed', 'Only a fixed price can be changed. Withdraw an auction or swap and list it again.');
    if (Number.isSafeInteger(num(body.expectedVersion)) && num(body.expectedVersion) !== L.version) throw new ApiError(409, 'conflict', 'The listing changed. Review it and try again.');
    const tx = new Tx(env, now);
    guardOpen(tx, L, now);
    tx.add("UPDATE listings SET ask = ?, price = ?, version = version + 1 WHERE id = ? AND status = 'active'", ask, ask, L.id);
    return { tx, result: { ok: true, listingId: L.id, price: ask, previous: L.ask } };
  }).then(async (res) => {
    if (!res.replayed && res.price < res.previous) { try { const { matchListing } = await import('./orders.js'); await matchListing(env, res.listingId, now); } catch (_) { /* the sweep will match it */ } }
    return res;
  });
}
export async function relistListing(env, who, key, listingId, now) {
  const L = await getListing(env, listingId);
  if (!L || L.seller_id !== who.accountId) throw new ApiError(404, 'not-found', 'That listing could not be found.');
  if (L.status === 'active' || L.status === 'sold') throw new ApiError(409, 'not-closed', 'Only an ended or withdrawn listing can be listed again.');
  const items = JSON.parse(L.items);
  const body = { kind: L.kind, instanceIds: items.map((i) => i.i), title: L.title, note: L.note };
  if (L.kind === 'fixed') body.ask = L.ask;
  if (L.kind === 'auction') Object.assign(body, { start: L.start_price, reserve: L.reserve, buyout: L.buyout, step: L.step });
  if (L.kind === 'swap') Object.assign(body, { wants: L.wants ? JSON.parse(L.wants) : null, minTopUp: L.min_topup });
  body.durationMs = Math.max(RULES.fixed.minDurationMs, L.first_ends_at - L.created_at);
  return createListing(env, who, key, body, now, { relistOf: L.id });
}

// ---- buying ---------------------------------------------------------------------------------------------------------------
export async function buyListing(env, who, key, listingId, body, now) {
  // The price the buyer was shown is part of the request, never optional: a purchase is only ever made at a price that
  // was on the screen. (A client that does not know the price cannot buy.)
  const expected = num(body.expectedPrice);
  if (!Number.isSafeInteger(expected) || expected < 1) throw new ApiError(422, 'price-required', 'A purchase must name the price you were shown.');
  return mutate(env, who, key, { op: 'buy', listingId, expected }, now, async () => {
    const L = await getListing(env, listingId);
    if (!L) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    if (L.kind !== 'fixed') throw new ApiError(409, 'not-fixed', 'This listing is not a fixed price.');
    if (L.seller_id === who.accountId) throw new ApiError(403, 'own', 'You cannot buy your own listing.');
    if (L.status !== 'active') throw new ApiError(409, 'closed', 'This listing is ' + (L.status === 'sold' ? 'sold' : 'no longer open') + '.', { status: L.status });
    if (now >= L.ends_at) { await settleListing(env, L.id, now); throw new ApiError(409, 'closed', 'This listing has ended.', { status: 'expired' }); }
    if (expected !== L.ask) throw new ApiError(409, 'price-changed', 'The price changed to ' + L.ask + ' Credits. Review it before buying.', { price: L.ask });
    const w = await getWallet(env, who.accountId);
    if (w.balance - w.held < L.ask) throw new ApiError(409, 'funds', 'You need ' + L.ask + ' available Credits.', { available: w.balance - w.held, price: L.ask });
    const tx = new Tx(env, now);
    guardOpen(tx, L, now);
    tx.guard('own', 'NOT EXISTS (SELECT 1 FROM listings WHERE id = ? AND seller_id = ?)', L.id, who.accountId);
    const sale = planSale(tx, L, who.accountId, L.ask, 'fixed', 0);
    return { tx, result: { ok: true, listingId: L.id, price: L.ask, fee: sale.fee, receiptId: sale.tradeId } };
  });
}

// ---- auctions --------------------------------------------------------------------------------------------------------------
export async function placeBid(env, who, key, listingId, body, now) {
  const max = num(body.max);
  return mutate(env, who, key, { op: 'bid', listingId, max }, now, async () => {
    const L = await getListing(env, listingId);
    if (!L || L.kind !== 'auction') throw new ApiError(404, 'not-found', 'That auction could not be found.');
    if (L.status === 'active' && now >= L.ends_at) { await settleListing(env, L.id, now); throw new ApiError(409, 'ended', 'This auction has ended.', { status: 'ended' }); }
    if (L.status !== 'active') throw new ApiError(409, 'closed', 'This auction is closed.', { status: L.status });
    if (L.seller_id === who.accountId) throw new ApiError(403, 'own', 'You cannot bid on your own auction.');
    if (!Number.isSafeInteger(max) || max <= 0 || max > RULES.price.max) throw new ApiError(422, 'invalid', 'Enter a whole number of Credits.');
    const proxies = await getProxies(env, L.id), auction = auctionOf(L), mine = proxies.find((p) => p.id === who.accountId) || null;
    const seq = proxies.reduce((n, p) => Math.max(n, p.seq), 0) + 1;
    const res = applyBid(auction, proxies.map(toProxy), who.accountId, max, seq);
    if (!res.ok) {
      const text = res.error === 'lower' ? 'Your maximum must be higher than your current one (' + (res.minimum - 1) + ').' : res.error === 'increment' ? 'The next bid must be at least ' + res.minimum + ' Credits.' : 'Enter a whole number of Credits.';
      throw new ApiError(res.error === 'invalid' ? 422 : 409, res.error, text, { minimum: res.minimum || null });
    }
    const w = await getWallet(env, who.accountId), oldHold = mine && mine.active ? mine.max : 0;
    if (max - oldHold > w.balance - w.held) throw new ApiError(409, 'funds', 'You do not have enough available Credits for that maximum.', { available: w.balance - w.held + oldHold });
    const view = res.view, before = res.before, leaderId = view.lead.id, leading = leaderId === who.accountId;
    const leaderChanged = before.lead ? before.lead.id !== leaderId : true, priceChanged = view.price !== before.price;
    // The window and extension are the rules' own; only the test environment may shrink them, to exercise short auctions.
    const testing = env.ENVIRONMENT === 'test', win = testing && env.TEST_SNIPE_WINDOW_MS != null ? Number(env.TEST_SNIPE_WINDOW_MS) : RULES.auction.snipeWindowMs;
    const extendMs = testing && env.TEST_SNIPE_EXTEND_MS != null ? Number(env.TEST_SNIPE_EXTEND_MS) : RULES.auction.snipeExtendMs;
    const snipe = (leaderChanged || priceChanged) && win > 0 && now >= L.ends_at - win && L.extensions < RULES.auction.snipeMaxExtensions;
    const endsAt = snipe ? now + extendMs : L.ends_at;
    const tx = new Tx(env, now);
    guardOpen(tx, L, now);
    tx.guard('own', 'NOT EXISTS (SELECT 1 FROM listings WHERE id = ? AND seller_id = ?)', L.id, who.accountId);
    // Only the leader holds Credits. Whoever was leading and is not now lets theirs go before anything new is reserved.
    proxies.filter((p) => p.active && p.id !== leaderId).forEach((p) => tx.holdClose(p.id, 'bid', L.id, p.max, 'outbid'));
    if (proxies.some((p) => p.active && p.id !== leaderId)) tx.add('UPDATE bids SET active = 0, updated_at = ? WHERE listing_id = ? AND active = 1 AND bidder_id <> ?', now, L.id, leaderId);
    if (mine) tx.add('UPDATE bids SET max_amount = ?, active = ?, updated_at = ? WHERE listing_id = ? AND bidder_id = ?', max, leading ? 1 : 0, now, L.id, who.accountId);
    else tx.add('INSERT INTO bids (listing_id, bidder_id, max_amount, seq, active, placed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', L.id, who.accountId, max, seq, leading ? 1 : 0, now, now);
    if (leading) { if (oldHold) tx.holdChange(who.accountId, 'bid', L.id, oldHold, max); else tx.holdOpen(who.accountId, 'bid', L.id, max); }
    tx.add('UPDATE listings SET price = ?, leader_id = ?, bid_count = bid_count + 1, bidder_count = ?, ends_at = ?, extensions = ?, snipe_note = ?, version = version + 1 WHERE id = ? AND status = ?',
      view.price, leaderId, view.bidders, endsAt, L.extensions + (snipe ? 1 : 0), snipe ? 'Extended by ' + Math.round(extendMs / 60000) + ' minutes after a late bid' : L.snipe_note, L.id, 'active');
    tx.add("INSERT INTO bid_events (listing_id, at, bidder_id, price_after, kind, leader_changed) VALUES (?, ?, ?, ?, 'bid', ?)", L.id, now, who.accountId, view.price, leaderChanged ? 1 : 0);
    if (snipe) tx.add("INSERT INTO bid_events (listing_id, at, bidder_id, price_after, kind, leader_changed) VALUES (?, ?, ?, ?, 'extend', 0)", L.id, now, who.accountId, view.price);
    if (before.lead && before.lead.id !== leaderId) tx.notify(before.lead.id, 'outbid', 'You were outbid on ' + label(L) + '. The price is now ' + view.price + ' Credits.', L.id);
    tx.notify(L.seller_id, 'bid', 'A bid arrived on your ' + label(L) + '. The price is now ' + view.price + ' Credits.', L.id);
    return { tx, result: { ok: true, listingId: L.id, price: view.price, leading, myMax: max, endsAt, extended: snipe, bids: L.bid_count + 1, minNext: view.minNext } };
  }).then(async (res) => { if (!res.replayed && res.extended) await scheduleClose(env, res.listingId, res.endsAt); return res; });
}

export async function buyoutListing(env, who, key, listingId, body, now) {
  const expected = num((body || {}).expectedPrice);
  if (!Number.isSafeInteger(expected) || expected < 1) throw new ApiError(422, 'price-required', 'A buyout must name the price you were shown.');
  return mutate(env, who, key, { op: 'buyout', listingId, expected }, now, async () => {
    const L = await getListing(env, listingId);
    if (!L || L.kind !== 'auction') throw new ApiError(404, 'not-found', 'That auction could not be found.');
    if (L.status === 'active' && now >= L.ends_at) { await settleListing(env, L.id, now); throw new ApiError(409, 'ended', 'This auction has ended.', { status: 'ended' }); }
    if (L.status !== 'active') throw new ApiError(409, 'closed', 'This auction is closed.', { status: L.status });
    if (L.seller_id === who.accountId) throw new ApiError(403, 'own', 'You cannot buy out your own auction.');
    // Policy: the buyout is on offer until the price reaches it, whether or not there are bids.
    if (!L.buyout) throw new ApiError(409, 'no-buyout', 'This auction has no buyout.');
    if (L.price >= L.buyout) throw new ApiError(409, 'no-buyout', 'The price has reached the buyout, so it is no longer offered.');
    if (expected !== L.buyout) throw new ApiError(409, 'price-changed', 'The buyout price changed to ' + L.buyout + ' Credits. Review it before buying.', { price: L.buyout });
    const proxies = await getProxies(env, L.id), mine = proxies.find((p) => p.id === who.accountId && p.active), ownHold = mine ? mine.max : 0;
    const w = await getWallet(env, who.accountId);
    if (w.balance - w.held + ownHold < L.buyout) throw new ApiError(409, 'funds', 'You need ' + L.buyout + ' available Credits.', { available: w.balance - w.held + ownHold, price: L.buyout });
    const tx = new Tx(env, now);
    guardOpen(tx, L, now);
    tx.guard('own', 'NOT EXISTS (SELECT 1 FROM listings WHERE id = ? AND seller_id = ?)', L.id, who.accountId);
    releaseBids(tx, L, proxies, 'buyout');
    tx.add("INSERT INTO bid_events (listing_id, at, bidder_id, price_after, kind, leader_changed) VALUES (?, ?, ?, ?, 'buyout', 1)", L.id, now, who.accountId, L.buyout);
    const sale = planSale(tx, L, who.accountId, L.buyout, 'buyout', 0);
    proxies.filter((p) => p.active && p.id !== who.accountId).forEach((p) => tx.notify(p.id, 'lost', 'Someone bought out ' + label(L) + '. Your bid hold was released.', L.id));
    return { tx, result: { ok: true, listingId: L.id, price: L.buyout, fee: sale.fee, receiptId: sale.tradeId } };
  });
}

// ---- closing on time -----------------------------------------------------------------------------------------------------------
// Settles one listing whose time has come. Safe to call any number of times, from a request, an alarm or a sweep:
// it acts only on a listing still active and past its end, and the outcome depends only on the bids made before the
// deadline (a bid at or after it is refused), never on when this runs.
export async function settleListing(env, listingId, now) {
  return system(env, async () => {
    const L = await getListing(env, listingId);
    if (!L || L.status !== 'active' || now < L.ends_at) return { noop: true };
    const tx = new Tx(env, now), proxies = L.kind === 'auction' ? await getProxies(env, L.id) : [];
    guardDue(tx, L, now);
    // If the cards are not all in escrow any more (something outside the rules touched them) the sale cannot be made
    // honestly. It is closed with nothing charged and every hold released, instead of being retried forever.
    const held = (await env.DB.prepare("SELECT COUNT(*) AS n FROM instances WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?").bind(L.id, L.seller_id).first()).n;
    let broken = held !== L.item_count;
    if (!broken && L.kind === 'auction') {
      const out = closeAuction(auctionOf(L), proxies.map(toProxy));
      if (out.sold) {
        const w = await getWallet(env, out.winner), p = proxies.find((x) => x.id === out.winner);
        broken = !p || !p.active || !w || w.balance < out.price;
      }
    }
    if (broken) {
      releaseBids(tx, L, proxies, 'failed');
      await closeOffers(env, tx, L, 'The listing could not be completed.');
      tx.add("UPDATE instances SET state = 'owned', escrow_ref = NULL WHERE escrow_ref = ? AND state = 'escrow'", L.id);
      tx.add('DELETE FROM listing_items WHERE listing_id = ?', L.id);
      tx.add("UPDATE listings SET status = 'expired', closed_at = ?, end_note = ?, version = version + 1 WHERE id = ?", now, 'The sale could not be completed, so nothing was charged and every hold was released.', L.id);
      tx.notify(L.seller_id, 'failed', 'The sale of ' + label(L) + ' could not be completed, so it was closed and nothing was charged.', L.id);
      proxies.filter((p) => p.active).forEach((p) => tx.notify(p.id, 'failed', 'The sale of ' + label(L) + ' could not be completed. Your hold was released and nothing was charged.', L.id));
      return { tx, result: { ok: true, status: 'expired', why: 'failed' } };
    }
    if (L.kind === 'auction') {
      const out = closeAuction(auctionOf(L), proxies.map(toProxy));
      if (out.sold) {
        const winner = proxies.find((p) => p.id === out.winner);
        if (!winner.active) return { noop: true, inconsistent: true };
        await closeOffers(env, tx, L, 'The auction ended.');
        proxies.filter((p) => p.active && p.id !== out.winner).forEach((p) => tx.holdClose(p.id, 'bid', L.id, p.max, 'outbid'));
        tx.holdConsume(out.winner, 'bid', L.id, winner.max, 'won');
        tx.add('UPDATE bids SET active = 0, updated_at = ? WHERE listing_id = ? AND active = 1', now, L.id);
        // The listing row is guarded due (not merely open) above; planSale re-guards open, which still holds.
        planSale(tx, L, out.winner, out.price, 'auction', winner.max);
        return { tx, result: { ok: true, status: 'sold', price: out.price } };
      }
      await planClose(env, tx, L, 'expired', out.why, proxies, now);
      tx.notify(L.seller_id, 'expired', 'Your auction of ' + label(L) + ' ended unsold. ' + out.why + '.', L.id);
      proxies.filter((p) => p.active).forEach((p) => tx.notify(p.id, 'lost', 'The auction for ' + label(L) + ' ended without a sale. ' + out.why + '. Your hold was released.', L.id));
      return { tx, result: { ok: true, status: 'expired', why: out.why } };
    }
    await planClose(env, tx, L, 'expired', 'The time ran out', proxies, now);
    tx.notify(L.seller_id, 'expired', 'Your listing of ' + label(L) + ' ended unsold.', L.id);
    return { tx, result: { ok: true, status: 'expired' } };
  });
}
export { getProxies, getWallet, aliasOf, auctionOf, resolveAuction, label, isCard };
