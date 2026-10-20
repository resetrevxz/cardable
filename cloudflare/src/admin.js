// Operator tools: reconcile the whole realm against its invariants, repair what a crash could have orphaned, run the
// sweep by hand, and revoke a disputed import. Guarded by a secret admin token (a Wrangler secret, never in the client).
// None of this is needed in normal operation: every mutation is atomic, so a clean run reports no problems.
import { ApiError, timingSafeEqual } from './util.js';
import { RULES } from './economy.js';
import { settleListing } from './listings.js';
import { expireOffer } from './offers.js';
import { expireOrder, matchOrder } from './orders.js';
import { sweepMedia } from './uploads.js';

export function requireAdmin(env, request) {
  const given = request.headers.get('x-admin-token') || '';
  if (typeof env.ADMIN_TOKEN !== 'string' || env.ADMIN_TOKEN.length < 24 || !timingSafeEqual(env.ADMIN_TOKEN, given)) throw new ApiError(404, 'not-found', 'There is no such endpoint.');
}

const CHECKS = [
  ['wallet-held-matches-holds', "SELECT w.account_id AS account, w.held AS held, COALESCE(h.s, 0) AS holds FROM wallets w LEFT JOIN (SELECT account_id, SUM(amount) AS s FROM holds WHERE released_at IS NULL GROUP BY account_id) h ON h.account_id = w.account_id WHERE w.held <> COALESCE(h.s, 0)"],
  ['wallet-balance-matches-ledger', "SELECT w.account_id AS account, w.balance AS balance, COALESCE(g.s, 0) AS ledger FROM wallets w LEFT JOIN (SELECT account_id, SUM(delta) AS s FROM ledger GROUP BY account_id) g ON g.account_id = w.account_id WHERE w.balance <> COALESCE(g.s, 0)"],
  ['wallet-never-over-held', 'SELECT account_id AS account, balance, held FROM wallets WHERE held > balance OR balance < 0 OR held < 0'],
  ['escrow-without-owner-entity', "SELECT i.id AS instance, i.escrow_ref AS ref FROM instances i WHERE i.state = 'escrow' AND NOT (" +
    "(i.escrow_ref LIKE 'lst_%' AND EXISTS (SELECT 1 FROM listings l WHERE l.id = i.escrow_ref AND l.status = 'active' AND l.seller_id = i.owner_id)) OR " +
    "(i.escrow_ref LIKE 'offer:%' AND EXISTS (SELECT 1 FROM offers o WHERE 'offer:' || o.id = i.escrow_ref AND o.status = 'pending' AND o.from_id = i.owner_id)))"],
  ['reference-on-free-card', "SELECT id AS instance, state, escrow_ref AS ref FROM instances WHERE state <> 'escrow' AND escrow_ref IS NOT NULL"],
  ['listing-items-without-escrow', "SELECT li.instance_id AS instance, li.listing_id AS listing FROM listing_items li LEFT JOIN instances i ON i.id = li.instance_id WHERE i.id IS NULL OR i.state <> 'escrow' OR i.escrow_ref <> li.listing_id"],
  ['offer-items-without-escrow', "SELECT oi.instance_id AS instance, oi.offer_id AS offer FROM offer_items oi LEFT JOIN instances i ON i.id = oi.instance_id WHERE i.id IS NULL OR i.state <> 'escrow' OR i.escrow_ref <> 'offer:' || oi.offer_id"],
  ['active-listing-item-count', "SELECT l.id AS listing, l.item_count AS expected, (SELECT COUNT(*) FROM listing_items li WHERE li.listing_id = l.id) AS actual FROM listings l WHERE l.status = 'active' AND l.item_count <> (SELECT COUNT(*) FROM listing_items li WHERE li.listing_id = l.id)"],
  ['closed-listing-still-attached', "SELECT li.listing_id AS listing FROM listing_items li JOIN listings l ON l.id = li.listing_id WHERE l.status <> 'active'"],
  ['bid-hold-mismatch', "SELECT b.listing_id AS listing, b.bidder_id AS account, b.max_amount AS max, h.amount AS hold FROM bids b LEFT JOIN holds h ON h.kind = 'bid' AND h.ref = b.listing_id AND h.account_id = b.bidder_id AND h.released_at IS NULL " +
    "WHERE (b.active = 1 AND (h.id IS NULL OR h.amount <> b.max_amount)) OR (b.active = 0 AND h.id IS NOT NULL)"],
  ['bid-hold-without-listing', "SELECT h.id AS hold, h.ref AS ref FROM holds h WHERE h.kind = 'bid' AND h.released_at IS NULL AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = h.ref AND l.status = 'active')"],
  ['more-than-one-leader-hold', "SELECT listing_id AS listing, COUNT(*) AS n FROM bids WHERE active = 1 GROUP BY listing_id HAVING COUNT(*) > 1"],
  ['leader-is-not-top-proxy', "SELECT l.id AS listing FROM listings l WHERE l.kind = 'auction' AND l.status = 'active' AND l.bid_count > 0 AND l.leader_id IS NOT (SELECT bidder_id FROM bids WHERE listing_id = l.id ORDER BY max_amount DESC, seq LIMIT 1)"],
  ['order-hold-mismatch', "SELECT o.id AS ord, o.max_price * (o.quantity - o.filled) AS expected, h.amount AS hold FROM orders o LEFT JOIN holds h ON h.kind = 'order' AND h.ref = o.id AND h.released_at IS NULL " +
    "WHERE (o.status = 'open' AND (h.id IS NULL OR h.amount <> o.max_price * (o.quantity - o.filled))) OR (o.status <> 'open' AND h.id IS NOT NULL)"],
  ['offer-hold-on-closed-offer', "SELECT h.id AS hold, h.ref AS ref FROM holds h LEFT JOIN offers o ON o.id = h.ref WHERE h.kind = 'offer' AND h.released_at IS NULL AND (o.id IS NULL OR o.status <> 'pending')"],
  ['pending-offer-items', "SELECT o.id AS offer FROM offers o WHERE o.status = 'pending' AND (SELECT COUNT(*) FROM offer_items oi WHERE oi.offer_id = o.id) = 0"],
  ['sold-listing-without-trade', "SELECT l.id AS listing FROM listings l WHERE l.status = 'sold' AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.listing_id = l.id)"],
  ['observation-without-trade', 'SELECT p.id AS observation FROM price_observations p WHERE p.trade_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.id = p.trade_id AND t.attributed = 1)'],
  ['attributed-trade-without-observation', "SELECT t.id AS trade FROM trades t WHERE t.attributed = 1 AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id IN (t.seller_id,t.buyer_id) AND a.actor_kind='trader') AND NOT EXISTS (SELECT 1 FROM price_observations p WHERE p.trade_id = t.id)"],
  ['swap-in-price-history', "SELECT p.id AS observation FROM price_observations p JOIN trades t ON t.id = p.trade_id WHERE t.kind = 'swap'"],
  ['redeemed-in-play', "SELECT r.instance_id AS instance FROM redemptions r JOIN instances i ON i.id = r.instance_id WHERE i.state <> 'redeemed'"]
];

// Credits are created only by the system redemption and destroyed only by fees, so the total in wallets is exact.
async function supply(env) {
  const row = await env.DB.prepare("SELECT (SELECT COALESCE(SUM(balance), 0) FROM wallets) AS wallets, (SELECT COALESCE(SUM(quote), 0) FROM redemptions) + (SELECT COALESCE(SUM(delta),0) FROM ledger WHERE reason IN ('game migration','gameplay','trader issuance')) AS issued, (SELECT COALESCE(SUM(fee), 0) FROM trades) AS burned").first();
  return { wallets: row.wallets, issued: row.issued, burned: row.burned, balanced: row.wallets === row.issued - row.burned };
}

export async function reconcile(env) {
  const results = await env.DB.batch(CHECKS.map(([, sql]) => env.DB.prepare(sql + ' LIMIT 25')));
  const problems = [];
  results.forEach((r, n) => r.results.forEach((row) => problems.push(Object.assign({ check: CHECKS[n][0] }, row))));
  const counts = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM accounts) AS accounts, (SELECT COUNT(*) FROM instances WHERE state <> 'redeemed') AS cards, (SELECT COUNT(*) FROM listings WHERE status = 'active') AS listings, " +
    "(SELECT COUNT(*) FROM orders WHERE status = 'open') AS orders, (SELECT COUNT(*) FROM offers WHERE status = 'pending') AS offers, (SELECT COUNT(*) FROM trades) AS trades, (SELECT COUNT(*) FROM holds WHERE released_at IS NULL) AS holds").first();
  const money = await supply(env);
  if (!money.balanced) problems.push({ check: 'credit-supply', wallets: money.wallets, issued: money.issued, burned: money.burned });
  return { ok: problems.length === 0, problems, counts, supply: money, checks: CHECKS.length + 1 };
}

// Conservative repair: only things no live entity owns. It never invents Credits or cards.
export async function repair(env, now) {
  const done = [];
  const orphanCards = await env.DB.prepare("UPDATE instances SET state = 'owned', escrow_ref = NULL WHERE state = 'escrow' AND NOT (" +
    "(escrow_ref LIKE 'lst_%' AND EXISTS (SELECT 1 FROM listings l WHERE l.id = instances.escrow_ref AND l.status = 'active' AND l.seller_id = instances.owner_id)) OR " +
    "(escrow_ref LIKE 'offer:%' AND EXISTS (SELECT 1 FROM offers o WHERE 'offer:' || o.id = instances.escrow_ref AND o.status = 'pending' AND o.from_id = instances.owner_id)))").run();
  if (orphanCards.meta.changes) done.push({ action: 'released-orphan-escrow', cards: orphanCards.meta.changes });
  const strayRefs = await env.DB.prepare("UPDATE instances SET escrow_ref = NULL WHERE state <> 'escrow' AND escrow_ref IS NOT NULL").run();
  if (strayRefs.meta.changes) done.push({ action: 'cleared-stray-references', cards: strayRefs.meta.changes });
  await env.DB.prepare("DELETE FROM listing_items WHERE instance_id IN (SELECT id FROM instances WHERE state <> 'escrow' OR escrow_ref IS NULL OR escrow_ref <> listing_items.listing_id)").run();
  await env.DB.prepare("DELETE FROM listing_items WHERE listing_id IN (SELECT id FROM listings WHERE status <> 'active')").run();
  await env.DB.prepare("DELETE FROM offer_items WHERE offer_id IN (SELECT id FROM offers WHERE status <> 'pending')").run();
  const holds = await env.DB.prepare("UPDATE holds SET released_at = ?, outcome = 'repaired' WHERE released_at IS NULL AND (" +
    "(kind = 'bid' AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = holds.ref AND l.status = 'active')) OR " +
    "(kind = 'order' AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = holds.ref AND o.status = 'open')) OR " +
    "(kind = 'offer' AND NOT EXISTS (SELECT 1 FROM offers f WHERE f.id = holds.ref AND f.status = 'pending')))").bind(now).run();
  if (holds.meta.changes) done.push({ action: 'released-orphan-holds', holds: holds.meta.changes });
  // A wallet's held total always equals its open holds; this restores that after any of the above.
  const wallets = await env.DB.prepare('UPDATE wallets SET held = COALESCE((SELECT SUM(amount) FROM holds WHERE holds.account_id = wallets.account_id AND released_at IS NULL), 0) WHERE held <> COALESCE((SELECT SUM(amount) FROM holds WHERE holds.account_id = wallets.account_id AND released_at IS NULL), 0)').run();
  if (wallets.meta.changes) done.push({ action: 'recomputed-held', wallets: wallets.meta.changes });
  return { done, after: await reconcile(env) };
}

// The sweep: close what is due, expire what is old, match what is waiting. The same functions the alarms use.
export async function sweep(env, now, limit) {
  const cap = Math.max(1, Math.min(200, Number(limit) || Number(env.SWEEP_LIMIT) || 5));
  const out = { settled: 0, ordersExpired: 0, offersExpired: 0, matched: 0, cleaned: 0 };
  const due = (await env.DB.prepare("SELECT id FROM listings WHERE status = 'active' AND ends_at <= ? ORDER BY ends_at LIMIT ?").bind(now, cap).all()).results;
  // One bad item never stops the rest of the sweep; it is reported and left for the next run.
  const safe = async (fn) => { try { return await fn(); } catch (error) { out.errors = (out.errors || 0) + 1; return null; } };
  for (const r of due) { const x = await safe(() => settleListing(env, r.id, now)); if (x && x.ok) out.settled++; }
  const oo = (await env.DB.prepare("SELECT id FROM orders WHERE status = 'open' AND expires_at <= ? LIMIT ?").bind(now, cap).all()).results;
  for (const r of oo) { const x = await safe(() => expireOrder(env, r.id, now)); if (x && x.ok) out.ordersExpired++; }
  const of = (await env.DB.prepare("SELECT id FROM offers WHERE status = 'pending' AND expires_at <= ? LIMIT ?").bind(now, cap).all()).results;
  for (const r of of) { const x = await safe(() => expireOffer(env, r.id, now)); if (x && x.ok) out.offersExpired++; }
  const waiting = (await env.DB.prepare("SELECT o.id FROM orders o WHERE o.status = 'open' AND o.expires_at > ? AND EXISTS (SELECT 1 FROM listings l WHERE l.status = 'active' AND l.kind = 'fixed' AND l.item_count = 1 AND l.card_id = o.card_id AND l.ask <= o.max_price AND l.seller_id <> o.account_id AND l.ends_at > ?) LIMIT ?").bind(now, now, Math.min(cap, 5)).all()).results;
  for (const r of waiting) out.matched += (await safe(() => matchOrder(env, r.id, now))) || 0;
  const old = await env.DB.prepare('DELETE FROM idempotency WHERE rowid IN (SELECT rowid FROM idempotency WHERE durable = 0 AND created_at < ? LIMIT 200)').bind(now - RULES.history.keepIdempotencyMs).run();
  out.cleaned = old.meta ? old.meta.changes : 0;
  const notes = await env.DB.prepare('DELETE FROM notifications WHERE id IN (SELECT id FROM notifications WHERE at < ? LIMIT 200)').bind(now - RULES.history.keepNotificationsMs).run();
  out.cleaned += notes.meta ? notes.meta.changes : 0;
  const hits = await env.DB.prepare('DELETE FROM alert_hits WHERE rowid IN (SELECT rowid FROM alert_hits WHERE at < ? LIMIT 200)').bind(now - 30 * 86400000).run();
  out.cleaned += hits.meta ? hits.meta.changes : 0;
  const events = await env.DB.prepare('DELETE FROM listing_events WHERE seq IN (SELECT seq FROM listing_events WHERE at < ? ORDER BY seq LIMIT 500)').bind(now - 30 * 86400000).run();
  out.cleaned += events.meta ? events.meta.changes : 0;
  out.media = await safe(() => sweepMedia(env, now, Math.min(cap, 25)));
  return out;
}

// A disputed import is revoked: the cards that are still unspent in that account are removed and the claim is freed,
// so the rightful owner of the save can import it. Cards already traded, listed or sold are reported, never undone.
export async function revokeImport(env, body, now) {
  const alias = String(body.alias || '').trim();
  const acct = await env.DB.prepare('SELECT id, alias FROM accounts WHERE alias = ? COLLATE NOCASE').bind(alias).first();
  if (!acct) throw new ApiError(404, 'not-found', 'No account has that name.');
  const imp = await env.DB.prepare('SELECT id, origin_code FROM imports WHERE account_id = ?').bind(acct.id).first();
  if (!imp) throw new ApiError(404, 'no-import', 'That account has not imported.');
  const unspent = await env.DB.prepare("SELECT COUNT(*) AS n FROM instances WHERE owner_id = ? AND source = 'legacy-import' AND state = 'owned'").bind(acct.id).first();
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM instances WHERE source = 'legacy-import' AND origin_code = ?").bind(imp.origin_code).first();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM instances WHERE owner_id = ? AND source = 'legacy-import' AND state = 'owned' AND origin_code = ?").bind(acct.id, imp.origin_code),
    env.DB.prepare('DELETE FROM imports WHERE account_id = ?').bind(acct.id),
    env.DB.prepare('UPDATE accounts SET imported = 0 WHERE id = ?').bind(acct.id),
    env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body) VALUES (?, ?, 'import-revoked', 'The operator revoked your collection import after a dispute. Unspent imported cards were removed.')").bind(acct.id, now)
  ]);
  return { ok: true, alias: acct.alias, removed: unspent.n, remainingFromThatSave: total.n - unspent.n, originCodeFreed: imp.origin_code };
}
