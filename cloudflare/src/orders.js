// Limit buy orders. An order names one card (and a finish and skin, or "any"), a maximum price per card, a quantity and
// an expiry. Its Credits are held when it is placed: max price x cards still wanted, never more than the buyer has.
// Matching is deterministic and documented:
//   * a new order takes the CHEAPEST eligible single-card fixed listing, ties by the OLDER listing, then by id;
//   * a new listing is taken by the order with the HIGHEST maximum, ties by the OLDER order, then by id;
//   * the trade is at the LISTING's price, so the buyer never pays more than the seller asked, and the unused part of the
//     reservation is released. Reputation, alias and account age play no part.
// An order only ever buys the card, finish and skin it names (unless it says "any"): never a lesser variant.
import { ApiError, num } from './util.js';
import { RULES, isCard, nameOf } from './economy.js';
import { Tx, mutate, newId, system } from './ops.js';
import { getListing, _planSale } from './listings.js';

function validateSpec(body) {
  if (!isCard(body.cardId)) throw new ApiError(422, 'invalid', 'Choose a card.');
  const anyFinish = body.anyFinish === true, anySkin = body.anySkin !== false;
  const variantId = anyFinish || body.variantId == null || body.variantId === '' ? null : String(body.variantId);
  const skinId = anySkin || body.skinId == null || body.skinId === '' ? null : String(body.skinId);
  const maxPrice = num(body.maxPrice), quantity = body.quantity == null ? 1 : num(body.quantity);
  if (!Number.isSafeInteger(maxPrice) || maxPrice < RULES.price.min || maxPrice > RULES.price.max) throw new ApiError(422, 'price', 'Enter a whole price of at least 1 Credit.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > RULES.limits.orderQuantity) throw new ApiError(422, 'quantity', 'Ask for 1 to ' + RULES.limits.orderQuantity + ' cards.');
  const ms = body.durationMs == null ? RULES.order.defaultMs : num(body.durationMs);
  if (!Number.isSafeInteger(ms) || ms < RULES.order.minDurationMs || ms > RULES.order.maxDurationMs) throw new ApiError(422, 'duration', 'Choose a length from 1 hour to 30 days.');
  return { cardId: body.cardId, anyFinish, variantId, anySkin, skinId, maxPrice, quantity, ms };
}
const getOrder = (env, id) => env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
const remaining = (o) => o.quantity - o.filled;

export async function placeOrder(env, who, key, body, now) {
  const s = validateSpec(body);
  return mutate(env, who, key, { op: 'order', s }, now, async () => {
    const open = (await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE account_id = ? AND status = 'open'").bind(who.accountId).first()).n;
    if (open >= RULES.limits.openOrders) throw new ApiError(409, 'limit', 'You can have ' + RULES.limits.openOrders + ' open buy orders at once.');
    const hold = s.maxPrice * s.quantity;
    if (!Number.isSafeInteger(hold) || hold > 2_000_000_000) throw new ApiError(422, 'price', 'That reservation is too large.');
    const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(who.accountId).first();
    if (hold > w.balance - w.held) throw new ApiError(409, 'funds', 'This order reserves ' + hold + ' Credits and you have ' + (w.balance - w.held) + ' available.', { available: w.balance - w.held, price: hold });
    const id = newId('ord'), tx = new Tx(env, now);
    tx.guard('limit_hit', "(SELECT COUNT(*) FROM orders WHERE account_id = ? AND status = 'open') < ?", who.accountId, RULES.limits.openOrders);
    tx.add("INSERT INTO orders (id, account_id, card_id, variant_id, any_finish, skin_id, any_skin, max_price, quantity, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, who.accountId, s.cardId, s.variantId, s.anyFinish ? 1 : 0, s.skinId, s.anySkin ? 1 : 0, s.maxPrice, s.quantity, now, now + s.ms);
    tx.holdOpen(who.accountId, 'order', id, hold);
    return { tx, result: { ok: true, orderId: id, hold, expiresAt: now + s.ms } };
  }).then(async (res) => { if (!res.replayed) { try { await matchOrder(env, res.orderId, now); } catch (_) { /* the sweep matches it */ } } return res; });
}

export async function cancelOrder(env, who, key, orderId, now) {
  return mutate(env, who, key, { op: 'order-cancel', orderId }, now, async () => {
    const o = await getOrder(env, orderId);
    if (!o || o.account_id !== who.accountId) throw new ApiError(404, 'not-found', 'That order could not be found.');
    if (o.status !== 'open') throw new ApiError(409, 'closed', 'This order is already ' + o.status + '.', { status: o.status });
    const tx = new Tx(env, now);
    closeOrder(tx, o, 'cancelled');
    return { tx, result: { ok: true, orderId: o.id, status: 'cancelled', released: o.max_price * remaining(o) } };
  });
}
// Edit: a new maximum and/or expiry. The reservation follows the new maximum; it cannot exceed available Credits.
export async function editOrder(env, who, key, orderId, body, now) {
  const maxPrice = body.maxPrice == null ? null : num(body.maxPrice), ms = body.durationMs == null ? null : num(body.durationMs);
  if (maxPrice != null && (!Number.isSafeInteger(maxPrice) || maxPrice < RULES.price.min || maxPrice > RULES.price.max)) throw new ApiError(422, 'price', 'Enter a whole price of at least 1 Credit.');
  if (ms != null && (!Number.isSafeInteger(ms) || ms < RULES.order.minDurationMs || ms > RULES.order.maxDurationMs)) throw new ApiError(422, 'duration', 'Choose a length from 1 hour to 30 days.');
  return mutate(env, who, key, { op: 'order-edit', orderId, maxPrice, ms }, now, async () => {
    const o = await getOrder(env, orderId);
    if (!o || o.account_id !== who.accountId) throw new ApiError(404, 'not-found', 'That order could not be found.');
    if (o.status !== 'open' || now >= o.expires_at) throw new ApiError(409, 'closed', 'This order is already ' + o.status + '.', { status: o.status });
    const newMax = maxPrice == null ? o.max_price : maxPrice, oldHold = o.max_price * remaining(o), newHold = newMax * remaining(o);
    const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(who.accountId).first();
    if (newHold - oldHold > w.balance - w.held) throw new ApiError(409, 'funds', 'You do not have enough available Credits for that maximum.', { available: w.balance - w.held + oldHold });
    const tx = new Tx(env, now);
    tx.guard('stale', "EXISTS (SELECT 1 FROM orders WHERE id = ? AND version = ? AND status = 'open')", o.id, o.version);
    tx.holdChange(who.accountId, 'order', o.id, oldHold, newHold);
    tx.add('UPDATE orders SET max_price = ?, expires_at = ?, version = version + 1 WHERE id = ?', newMax, ms == null ? o.expires_at : now + ms, o.id);
    return { tx, result: { ok: true, orderId: o.id, maxPrice: newMax, hold: newHold } };
  }).then(async (res) => { if (!res.replayed) { try { await matchOrder(env, res.orderId, now); } catch (_) { /* the sweep matches it */ } } return res; });
}
function closeOrder(tx, o, status) {
  const hold = o.max_price * remaining(o);
  tx.guard('stale', "EXISTS (SELECT 1 FROM orders WHERE id = ? AND version = ? AND status = 'open')", o.id, o.version);
  if (hold > 0) tx.holdClose(o.account_id, 'order', o.id, hold, status);
  tx.add('UPDATE orders SET status = ?, closed_at = ?, version = version + 1 WHERE id = ?', status, tx.now, o.id);
  if (status === 'expired') tx.notify(o.account_id, 'order-expired', 'Your buy order for ' + nameOf(o.card_id) + ' expired' + (o.filled ? ' after ' + o.filled + ' fill' + (o.filled === 1 ? '' : 's') : ' without a fill') + '. Your reserved Credits are back.', o.id);
}
export async function expireOrder(env, orderId, now) {
  return system(env, async () => {
    const o = await getOrder(env, orderId);
    if (!o || o.status !== 'open' || now < o.expires_at) return { noop: true };
    const tx = new Tx(env, now);
    closeOrder(tx, o, 'expired');
    return { tx, result: { ok: true } };
  });
}

// ---- matching -----------------------------------------------------------------------------------------------------------------
// One fill: the order and the listing are both re-checked inside the transaction, so two fills of the same listing, or
// a fill racing a cancel, can only fail whole.
async function fill(env, order, L, now) {
  return system(env, async () => {
    const o = await getOrder(env, order.id), l = await getListing(env, L.id);
    if (!o || o.status !== 'open' || now >= o.expires_at || remaining(o) < 1 || !l || l.status !== 'active' || l.kind !== 'fixed' || l.item_count !== 1 || now >= l.ends_at) return { noop: true };
    if (l.ask > o.max_price || l.seller_id === o.account_id) return { noop: true };
    const tx = new Tx(env, now), oldHold = o.max_price * remaining(o), newHold = o.max_price * (remaining(o) - 1), done = o.filled + 1 === o.quantity;
    tx.guard('stale', "EXISTS (SELECT 1 FROM orders WHERE id = ? AND version = ? AND status = 'open' AND filled < quantity)", o.id, o.version);
    tx.guard('own', 'NOT EXISTS (SELECT 1 FROM listings WHERE id = ? AND seller_id = ?)', l.id, o.account_id);
    // The order's hold shrinks by the reservation for this card; the payment is made from the same wallet statement.
    if (newHold > 0) { tx.guard('stale', 'EXISTS (SELECT 1 FROM holds WHERE kind = ? AND ref = ? AND account_id = ? AND amount = ? AND released_at IS NULL)', 'order', o.id, o.account_id, oldHold); tx.add('UPDATE holds SET amount = ? WHERE kind = ? AND ref = ? AND account_id = ? AND released_at IS NULL', newHold, 'order', o.id, o.account_id); }
    else tx.holdConsume(o.account_id, 'order', o.id, oldHold, 'filled');
    const sale = _planSale(tx, l, o.account_id, l.ask, 'order', o.max_price);
    tx.add("UPDATE orders SET filled = filled + 1, spent = spent + ?, status = ?, closed_at = ?, version = version + 1 WHERE id = ?", l.ask, done ? 'filled' : 'open', done ? now : null, o.id);
    tx.add('INSERT INTO order_fills (id, order_id, listing_id, trade_id, price, at) VALUES (?, ?, ?, ?, ?, ?)', newId('ofl'), o.id, l.id, sale.tradeId, l.ask, now);
    tx.notify(o.account_id, 'order-filled', 'Your buy order for ' + nameOf(o.card_id) + ' filled at ' + l.ask + ' Credits' + (done ? '.' : ' (' + (o.filled + 1) + ' of ' + o.quantity + ').'), o.id);
    return { tx, result: { ok: true, orderId: o.id, listingId: l.id, price: l.ask, receiptId: sale.tradeId } };
  });
}

// An order looks for the cheapest listing it accepts; repeats until it is full or nothing qualifies.
export async function matchOrder(env, orderId, now) {
  let filled = 0;
  for (let guard = 0; guard < RULES.limits.orderQuantity + 2; guard++) {
    const o = await getOrder(env, orderId);
    if (!o || o.status !== 'open' || now >= o.expires_at || remaining(o) < 1) break;
    const L = await env.DB.prepare("SELECT * FROM listings WHERE status = 'active' AND kind = 'fixed' AND item_count = 1 AND ends_at > ? AND card_id = ? AND ask <= ? AND seller_id <> ? " +
      'AND (? = 1 OR variant_id IS ?) AND (? = 1 OR skin_id IS ?) ORDER BY ask, created_at, id LIMIT 1')
      .bind(now, o.card_id, o.max_price, o.account_id, o.any_finish, o.variant_id, o.any_skin, o.skin_id).first();
    if (!L) break;
    const r = await fill(env, o, L, now);
    if (r && r.ok) filled++; else if (r && r.noop && !r.contended) break;
  }
  return filled;
}
// A new or cheaper listing goes to the open order that bids the most, the older first on a tie.
export async function matchListing(env, listingId, now) {
  const L = await getListing(env, listingId);
  if (!L || L.status !== 'active' || L.kind !== 'fixed' || L.item_count !== 1 || now >= L.ends_at) return 0;
  const O = await env.DB.prepare("SELECT * FROM orders WHERE status = 'open' AND expires_at > ? AND card_id = ? AND max_price >= ? AND account_id <> ? AND filled < quantity " +
    'AND (any_finish = 1 OR variant_id IS ?) AND (any_skin = 1 OR skin_id IS ?) ORDER BY max_price DESC, created_at, id LIMIT 1')
    .bind(now, L.card_id, L.ask, L.seller_id, L.variant_id, L.skin_id).first();
  if (!O) return 0;
  const r = await fill(env, O, L, now);
  return r && r.ok ? 1 : 0;
}
