// Swaps, multi-card offers and counteroffers.
//
// A swap listing holds the seller's cards in escrow. An offer puts the offerer's cards in escrow too (state 'escrow',
// escrow_ref 'offer:<id>') and, when it includes Credits, holds them. The two sides then negotiate over Credits only
// (`cash` the offerer pays, or `refund` the seller pays back), each reply flipping whose turn it is, up to a bounded
// number of rounds. Acceptance settles BOTH card sets and the Credit difference in one transaction, or nothing.
//
// Fee semantics, decided and documented: a pure card-for-card swap moves no Credits, so there is no fee and nothing is
// recorded as a sale. When Credits change hands, the usual 2% fee applies to those Credits and is taken from the
// receiver, once. A swap is never a price observation: it is stored as a barter, apart from sale volume.
import { ApiError, cleanText, num } from './util.js';
import { RULES, checkWants, feeFor, nameOf } from './economy.js';
import { Tx, mutate, newId, system } from './ops.js';
import { valuations } from './valuation.js';

const placeholders = (n) => new Array(n).fill('?').join(',');
const names = (items) => { const list = JSON.parse(items); return nameOf(list[0].c) + (list.length > 1 ? ' and ' + (list.length - 1) + ' more' : ''); };

export async function getOffer(env, id) {
  const o = await env.DB.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first();
  if (!o) return null;
  o.holds = (await env.DB.prepare("SELECT account_id, amount FROM holds WHERE kind = 'offer' AND ref = ? AND released_at IS NULL").bind(id).all()).results;
  return o;
}
export async function pendingOffersOf(env, listingId) {
  const rows = (await env.DB.prepare("SELECT * FROM offers WHERE listing_id = ? AND status = 'pending'").bind(listingId).all()).results;
  if (!rows.length) return rows;
  const holds = (await env.DB.prepare("SELECT ref, account_id, amount FROM holds WHERE kind = 'offer' AND released_at IS NULL AND ref IN (" + placeholders(rows.length) + ')').bind(...rows.map((o) => o.id)).all()).results;
  rows.forEach((o) => { o.holds = holds.filter((h) => h.ref === o.id).map((h) => ({ account_id: h.account_id, amount: h.amount })); });
  return rows;
}

// Ends an offer without a trade: the offerer's cards go home, every hold is let go, the other side is told.
export function closeOfferStatements(tx, o, status, note) {
  const n = JSON.parse(o.items).length;
  tx.guard('stale', "EXISTS (SELECT 1 FROM offers WHERE id = ? AND version = ? AND status = 'pending')", o.id, o.version);
  tx.guard('stale', "(SELECT COUNT(*) FROM instances WHERE escrow_ref = ? AND state = 'escrow') = ?", 'offer:' + o.id, n);
  tx.add("UPDATE instances SET state = 'owned', escrow_ref = NULL WHERE escrow_ref = ? AND state = 'escrow'", 'offer:' + o.id);
  tx.add('DELETE FROM offer_items WHERE offer_id = ?', o.id);
  (o.holds || []).forEach((h) => tx.holdClose(h.account_id, 'offer', o.id, h.amount, status));
  tx.add('UPDATE offers SET status = ?, closed_at = ?, updated_at = ?, note = ?, version = version + 1 WHERE id = ?', status, tx.now, tx.now, note || null, o.id);
  const other = status === 'withdrawn' || status === 'declined' || status === 'expired';
  if (other) {
    tx.notify(o.from_id, 'offer-' + status, 'Your offer for a swap was ' + (status === 'expired' ? 'not answered in time' : status) + '. ' + (note || '') + ' Your cards and Credits are back with you.', o.listing_id);
  }
}

// ---- making an offer ------------------------------------------------------------------------------------------------------
export async function makeOffer(env, who, key, body, now) {
  const ids = Array.isArray(body.instanceIds) ? body.instanceIds.filter((x) => typeof x === 'string') : [];
  if (!ids.length || ids.length > RULES.bundle.max || new Set(ids).size !== ids.length) throw new ApiError(422, 'bundle', 'An offer holds between 1 and ' + RULES.bundle.max + ' different cards.');
  const cash = body.cash == null || body.cash === '' ? 0 : num(body.cash);
  if (!Number.isSafeInteger(cash) || cash < 0 || cash > RULES.price.max) throw new ApiError(422, 'invalid', 'Enter a whole number of Credits, or none.');
  const message = cleanText(body.message, RULES.limits.messageLength, 'message');
  const listingId = String(body.listingId || '');
  return mutate(env, who, key, { op: 'offer', listingId, ids, cash, message }, now, async () => {
    const L = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(listingId).first();
    if (!L) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    if (L.kind !== 'swap') throw new ApiError(409, 'not-swap', 'This listing is not open to swaps.');
    if (L.seller_id === who.accountId) throw new ApiError(403, 'own', 'You cannot make an offer on your own listing.');
    if (L.status !== 'active' || now >= L.ends_at) throw new ApiError(409, 'closed', 'This listing is no longer open.', { status: L.status });
    const rows = (await env.DB.prepare('SELECT id, card_id, variant_id, skin_id, serial, pack_id, state, owner_id FROM instances WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all()).results;
    if (rows.length !== ids.length || rows.some((r) => r.owner_id !== who.accountId)) throw new ApiError(409, 'not-owned', 'One of those cards is not in your collection.');
    if (rows.some((r) => r.state !== 'owned')) throw new ApiError(409, 'locked', 'One of those cards is already listed, in an offer or sold.');
    const mineHere = (await env.DB.prepare("SELECT COUNT(*) AS n FROM offers WHERE listing_id = ? AND from_id = ? AND status = 'pending'").bind(L.id, who.accountId).first()).n;
    if (mineHere) throw new ApiError(409, 'duplicate-offer', 'You already have an offer waiting on this listing. Withdraw it to send another.');
    const here = (await env.DB.prepare("SELECT COUNT(*) AS n FROM offers WHERE listing_id = ? AND status = 'pending'").bind(L.id).first()).n;
    if (here >= RULES.limits.pendingOffersPerListing) throw new ApiError(409, 'limit', 'This listing has as many offers waiting as it can hold.');
    const mine = (await env.DB.prepare("SELECT COUNT(*) AS n FROM offers WHERE from_id = ? AND status = 'pending'").bind(who.accountId).first()).n;
    if (mine >= RULES.limits.pendingOffersPerAccount) throw new ApiError(409, 'limit', 'You have as many offers waiting as you can have.');
    // The seller's conditions are checked now and again at acceptance, on the value of the cards at that moment.
    const wants = L.wants ? JSON.parse(L.wants) : null, listed = JSON.parse(L.items);
    const specs = rows.map((r) => ({ cardId: r.card_id, variantId: r.variant_id, skinId: r.skin_id, serial: r.serial })).concat(listed.map((i) => ({ cardId: i.c, variantId: i.v, skinId: i.k, serial: i.s })));
    const vals = await valuations(env, specs, now);
    const offered = rows.map((r, n) => ({ cardId: r.card_id, variantId: r.variant_id, skinId: r.skin_id, serial: r.serial, value: vals[n].average }));
    const listingValue = vals.slice(rows.length).reduce((n, v) => n + v.average, 0);
    const checked = checkWants(wants, offered, (it) => it.value, listingValue, cash);
    const failures = checked.failures.slice();
    if (cash < L.min_topup) failures.push('The seller asks for at least ' + L.min_topup + ' Credits on top.');
    if (failures.length) throw new ApiError(422, 'terms-not-met', 'This offer does not meet the seller\'s conditions.', { failures });
    const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(who.accountId).first();
    if (cash > w.balance - w.held) throw new ApiError(409, 'funds', 'You do not have ' + cash + ' available Credits.', { available: w.balance - w.held });
    const id = newId('ofr'), items = JSON.stringify(rows.map((r) => ({ i: r.id, c: r.card_id, v: r.variant_id, k: r.skin_id, s: r.serial })));
    const expires = Math.min(now + RULES.swap.offerExpiryMs, L.ends_at);
    const tx = new Tx(env, now);
    tx.guard('stale', "EXISTS (SELECT 1 FROM listings WHERE id = ? AND version = ? AND status = 'active' AND ends_at > ?)", L.id, L.version, now);
    tx.guard('own', 'NOT EXISTS (SELECT 1 FROM listings WHERE id = ? AND seller_id = ?)', L.id, who.accountId);
    tx.guard('not_owned', "(SELECT COUNT(*) FROM instances WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned') = ?", ...ids, who.accountId, ids.length);
    tx.guard('busy', "NOT EXISTS (SELECT 1 FROM offers WHERE listing_id = ? AND from_id = ? AND status = 'pending')", L.id, who.accountId);
    tx.add('INSERT INTO offers (id, listing_id, from_id, to_id, status, awaiting, round, cash, refund, message, items, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?)',
      id, L.id, who.accountId, L.seller_id, 'pending', 'seller', cash, message, items, now, now, expires);
    tx.add("UPDATE instances SET state = 'escrow', escrow_ref = ? WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned'", 'offer:' + id, ...ids, who.accountId);
    ids.forEach((iid) => tx.add('INSERT INTO offer_items (offer_id, instance_id) VALUES (?, ?)', id, iid));
    if (cash > 0) tx.holdOpen(who.accountId, 'offer', id, cash);
    // Bumping the listing makes a concurrent close re-plan, so an offer can never be left behind in escrow.
    tx.add('UPDATE listings SET version = version + 1 WHERE id = ?', L.id);
    tx.notify(L.seller_id, 'offer', 'You have a swap offer for ' + names(L.items) + ': ' + (ids.length === 1 ? '1 card' : ids.length + ' cards') + (cash ? ' and ' + cash + ' Credits.' : '.'), L.id);
    return { tx, result: { ok: true, offerId: id, listingId: L.id, cards: ids.length, cash, expiresAt: expires, value: checked.total } };
  });
}

// ---- answering ----------------------------------------------------------------------------------------------------------
export async function respondToOffer(env, who, key, offerId, action, body, now) {
  if (!['accept', 'decline', 'counter', 'withdraw'].includes(action)) throw new ApiError(422, 'invalid', 'Choose accept, decline, counter or withdraw.');
  const counter = {};
  if (action === 'counter') {
    for (const f of ['cash', 'refund']) {
      const v = body[f] == null || body[f] === '' ? 0 : num(body[f]);
      if (!Number.isSafeInteger(v) || v < 0 || v > RULES.price.max) throw new ApiError(422, 'invalid', 'Enter a whole number of Credits, or none.');
      counter[f] = v;
    }
    if (counter.cash > 0 && counter.refund > 0) throw new ApiError(422, 'invalid', 'Credits can move one way only: either top up or take back, not both.');
    counter.message = cleanText(body.message, RULES.limits.messageLength, 'message');
  }
  return mutate(env, who, key, { op: 'respond', offerId, action, counter }, now, async () => {
    const o = await getOffer(env, offerId);
    if (!o || (o.from_id !== who.accountId && o.to_id !== who.accountId)) throw new ApiError(404, 'not-found', 'That offer could not be found.');
    if (o.status !== 'pending') throw new ApiError(409, 'closed', 'This offer is already ' + o.status + '.', { status: o.status });
    const L = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(o.listing_id).first();
    const iAmSeller = o.to_id === who.accountId, iAmOfferer = o.from_id === who.accountId;
    const myTurn = (o.awaiting === 'seller' && iAmSeller) || (o.awaiting === 'offerer' && iAmOfferer);
    const tx = new Tx(env, now);
    const listingLive = L && L.status === 'active' && now < L.ends_at;

    if (action === 'withdraw' || action === 'decline') {
      // The offerer may withdraw whenever it is theirs to take back; whoever's turn it is may decline.
      if (action === 'withdraw' && !iAmOfferer) throw new ApiError(403, 'not-yours', 'Only the person who made the offer can withdraw it.');
      if (action === 'decline' && !myTurn) throw new ApiError(409, 'not-your-turn', 'It is not your turn to answer.');
      closeOfferStatements(tx, o, action === 'decline' ? 'declined' : 'withdrawn', action === 'decline' ? 'It was declined.' : 'It was withdrawn.');
      return { tx, result: { ok: true, offerId: o.id, status: action === 'decline' ? 'declined' : 'withdrawn' } };
    }
    if (!listingLive) {
      closeOfferStatements(tx, o, 'withdrawn', 'The listing is no longer open.');
      await system(env, async () => ({ tx, result: null }));
      throw new ApiError(409, 'closed', 'The listing is no longer open, so the offer was closed and your cards are back.', { status: L ? L.status : 'gone' });
    }
    if (now >= o.expires_at) throw new ApiError(409, 'expired', 'This offer has expired.', { status: 'expired' });
    if (!myTurn) throw new ApiError(409, 'not-your-turn', 'It is not your turn to answer.');
    const expires = Math.min(now + RULES.swap.offerExpiryMs, L.ends_at);

    if (action === 'counter') {
      if (o.round >= RULES.limits.counterRounds) throw new ApiError(409, 'rounds', 'This negotiation has reached its limit of ' + RULES.limits.counterRounds + ' replies. Accept, decline or withdraw.');
      if (counter.cash === o.cash && counter.refund === o.refund) throw new ApiError(422, 'same-terms', 'Change the Credits to make a counteroffer.');
      const mineOld = (o.holds.find((h) => h.account_id === who.accountId) || { amount: 0 }).amount;
      const newMine = iAmSeller ? counter.refund : counter.cash;
      const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(who.accountId).first();
      if (newMine - mineOld > w.balance - w.held) throw new ApiError(409, 'funds', 'You do not have enough available Credits for that.', { available: w.balance - w.held + mineOld });
      tx.guard('stale', "EXISTS (SELECT 1 FROM offers WHERE id = ? AND version = ? AND status = 'pending')", o.id, o.version);
      tx.guard('stale', "EXISTS (SELECT 1 FROM listings WHERE id = ? AND status = 'active' AND ends_at > ?)", L.id, now);
      if (mineOld && !newMine) tx.holdClose(who.accountId, 'offer', o.id, mineOld, 'countered');
      else if (mineOld) tx.holdChange(who.accountId, 'offer', o.id, mineOld, newMine);
      else if (newMine) tx.holdOpen(who.accountId, 'offer', o.id, newMine);
      tx.add("UPDATE offers SET cash = ?, refund = ?, awaiting = ?, round = round + 1, message = ?, updated_at = ?, expires_at = ?, version = version + 1 WHERE id = ? AND status = 'pending'",
        counter.cash, counter.refund, iAmSeller ? 'offerer' : 'seller', counter.message || o.message, now, expires, o.id);
      tx.notify(iAmSeller ? o.from_id : o.to_id, 'counter', 'You have a counteroffer on ' + names(L.items) + (counter.cash ? ': ' + counter.cash + ' Credits on top.' : counter.refund ? ': ' + counter.refund + ' Credits back.' : ': cards for cards.'), L.id);
      return { tx, result: { ok: true, offerId: o.id, status: 'pending', awaiting: iAmSeller ? 'offerer' : 'seller', cash: counter.cash, refund: counter.refund, round: o.round + 1 } };
    }

    // ---- accept: both card sets and the Credits, once ----
    const listed = JSON.parse(L.items), offered = JSON.parse(o.items);
    const vals = await valuations(env, offered.map((i) => ({ cardId: i.c, variantId: i.v, skinId: i.k, serial: i.s })).concat(listed.map((i) => ({ cardId: i.c, variantId: i.v, skinId: i.k, serial: i.s }))), now);
    const wants = L.wants ? JSON.parse(L.wants) : null;
    const items = offered.map((i, n) => ({ cardId: i.c, variantId: i.v, skinId: i.k, serial: i.s, value: vals[n].average }));
    const listingValue = vals.slice(offered.length).reduce((n, v) => n + v.average, 0);
    const credits = o.cash || o.refund, payerId = o.cash ? o.from_id : o.to_id, receiverId = o.cash ? o.to_id : o.from_id;
    // Conditions are re-checked on today's values. Credits paid by the offerer count toward a value condition.
    const checked = checkWants(wants, items, (it) => it.value, listingValue, o.cash);
    if (!checked.ok && !iAmSeller) throw new ApiError(422, 'terms-not-met', 'The listing\'s conditions are no longer met.', { failures: checked.failures });
    const payerHold = (o.holds.find((h) => h.account_id === payerId) || { amount: 0 }).amount;
    if (credits > 0) {
      const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(payerId).first();
      if (credits > w.balance - (w.held - payerHold)) {
        throw new ApiError(409, 'funds', (payerId === who.accountId ? 'You do' : 'The other side does') + ' not have ' + credits + ' available Credits.', { price: credits });
      }
    }
    const fee = credits > 0 ? feeFor(credits) : 0, net = credits - fee, tradeId = newId('trd');
    tx.guard('stale', "EXISTS (SELECT 1 FROM offers WHERE id = ? AND version = ? AND status = 'pending')", o.id, o.version);
    tx.guard('stale', "EXISTS (SELECT 1 FROM listings WHERE id = ? AND version = ? AND status = 'active' AND ends_at > ?)", L.id, L.version, now);
    tx.guard('stale', "(SELECT COUNT(*) FROM instances WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?) = ?", L.id, L.seller_id, L.item_count);
    tx.guard('stale', "(SELECT COUNT(*) FROM instances WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?) = ?", 'offer:' + o.id, o.from_id, offered.length);
    // Holds first (they only free Credits), then the one wallet movement.
    o.holds.filter((h) => h.account_id !== payerId || credits === 0).forEach((h) => tx.holdClose(h.account_id, 'offer', o.id, h.amount, 'settled'));
    if (credits > 0) {
      if (payerHold) tx.holdConsume(payerId, 'offer', o.id, payerHold, 'paid');
      tx.guard('funds', 'EXISTS (SELECT 1 FROM wallets WHERE account_id = ? AND balance - (held - ?) >= ?)', payerId, payerHold, credits);
      tx.debit(payerId, credits, payerHold, 'swap top-up', tradeId);
      tx.credit(receiverId, net, 'swap proceeds', tradeId);
    }
    tx.add("UPDATE instances SET owner_id = ?, state = 'owned', escrow_ref = NULL WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?", o.from_id, L.id, L.seller_id);
    tx.add("UPDATE instances SET owner_id = ?, state = 'owned', escrow_ref = NULL WHERE escrow_ref = ? AND state = 'escrow' AND owner_id = ?", L.seller_id, 'offer:' + o.id, o.from_id);
    tx.add('DELETE FROM listing_items WHERE listing_id = ?', L.id);
    tx.add('DELETE FROM offer_items WHERE offer_id = ?', o.id);
    tx.add("UPDATE offers SET status = 'accepted', closed_at = ?, updated_at = ?, version = version + 1 WHERE id = ?", now, now, o.id);
    tx.add("UPDATE listings SET status = 'sold', closed_at = ?, sold_price = ?, fee = ?, buyer_id = ?, version = version + 1 WHERE id = ?", now, credits, fee, o.from_id, L.id);
    tx.add("INSERT INTO trades (id, at, kind, listing_id, seller_id, buyer_id, price, fee, item_count, card_id, variant_id, skin_id, items, given, attributed) VALUES (?, ?, 'swap', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
      tradeId, now, L.id, L.seller_id, o.from_id, credits, fee, L.item_count, listed[0].c, listed[0].v || null, listed[0].k || null, L.items, o.items);
    const others = (await env.DB.prepare("SELECT * FROM offers WHERE listing_id = ? AND status = 'pending' AND id <> ?").bind(L.id, o.id).all()).results;
    if (others.length) {
      const holds = (await env.DB.prepare("SELECT ref, account_id, amount FROM holds WHERE kind = 'offer' AND released_at IS NULL AND ref IN (" + placeholders(others.length) + ')').bind(...others.map((x) => x.id)).all()).results;
      others.forEach((x) => { x.holds = holds.filter((h) => h.ref === x.id).map((h) => ({ account_id: h.account_id, amount: h.amount })); closeOfferStatements(tx, x, 'declined', 'The listing was swapped with someone else.'); });
    }
    tx.notify(o.from_id, 'swap', 'Your swap for ' + names(L.items) + ' completed' + (credits ? (o.cash ? ': you paid ' + credits + ' Credits.' : ': you received ' + net + ' Credits.') : '.'), L.id);
    tx.notify(L.seller_id, 'swap', 'Your swap of ' + names(L.items) + ' completed' + (credits ? (o.cash ? ': you received ' + net + ' Credits.' : ': you paid ' + credits + ' Credits.') : '.'), L.id);
    return { tx, result: { ok: true, offerId: o.id, status: 'accepted', receiptId: tradeId, credits, fee } };
  });
}

// ---- expiry (system) ------------------------------------------------------------------------------------------------------
export async function expireOffer(env, offerId, now) {
  return system(env, async () => {
    const o = await getOffer(env, offerId);
    if (!o || o.status !== 'pending' || now < o.expires_at) return { noop: true };
    const tx = new Tx(env, now);
    closeOfferStatements(tx, o, 'expired', '');
    return { tx, result: { ok: true } };
  });
}
