// Alerts: a price threshold on a card, or a saved search, delivered as a notification in the in-app inbox when a real
// player's listing matches. There is no push channel in the beta, so nothing is promised while the game is closed: the
// alert is checked when the listing appears (or is repriced) and waits in the inbox until the player opens the game.
import { ApiError, cleanText } from './util.js';
import { isCard, nameOf, rarityOf } from './economy.js';
import { newId } from './ops.js';

const MAX_ALERTS = 20;
const QUERY_KEYS = ['q', 'rarity', 'kind', 'maxPrice', 'brand', 'generation', 'variantId'];

export function normalizeQuery(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {}, list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 40).slice(0, 12) : []);
  if (typeof raw.q === 'string' && raw.q.trim()) out.q = raw.q.trim().slice(0, 60);
  const rarity = list(raw.rarity); if (rarity.length) out.rarity = rarity;
  const kind = list(raw.kind).filter((k) => ['fixed', 'auction', 'swap'].includes(k)); if (kind.length) out.kind = kind;
  if (Number.isSafeInteger(raw.maxPrice) && raw.maxPrice >= 1 && raw.maxPrice <= 100_000_000) out.maxPrice = raw.maxPrice;
  if (typeof raw.brand === 'string' && raw.brand) out.brand = raw.brand.slice(0, 40);
  if (typeof raw.generation === 'string' && raw.generation) out.generation = raw.generation.slice(0, 40);
  if (typeof raw.variantId === 'string' && raw.variantId) out.variantId = raw.variantId.slice(0, 40);
  return Object.keys(out).length ? out : null;
}

export async function createAlert(env, who, body, now) {
  const kind = body.kind === 'search' ? 'search' : 'price';
  const label = cleanText(body.label, 60, 'label');
  let cardId = null, variantId = null, maxPrice = null, query = null;
  if (kind === 'price') {
    if (!isCard(body.cardId)) throw new ApiError(422, 'invalid', 'Choose a card.');
    cardId = body.cardId; variantId = typeof body.variantId === 'string' && body.variantId ? body.variantId : null;
    if (!Number.isSafeInteger(body.maxPrice) || body.maxPrice < 1 || body.maxPrice > 100_000_000) throw new ApiError(422, 'price', 'Enter the highest price you would pay, as a whole number of Credits.');
    maxPrice = body.maxPrice;
  } else {
    query = normalizeQuery(body.query);
    if (!query) throw new ApiError(422, 'invalid', 'A saved search needs at least one condition.');
  }
  const open = (await env.DB.prepare('SELECT COUNT(*) AS n FROM alerts WHERE account_id = ? AND active = 1').bind(who.accountId).first()).n;
  if (open >= MAX_ALERTS) throw new ApiError(409, 'limit', 'You can have ' + MAX_ALERTS + ' alerts at once.');
  const id = newId('alt');
  await env.DB.prepare('INSERT INTO alerts (id, account_id, kind, card_id, variant_id, max_price, query, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, who.accountId, kind, cardId, variantId, maxPrice, query ? JSON.stringify(query) : null, label, now).run();
  return { ok: true, alertId: id, kind };
}
export async function listAlerts(env, who) {
  const rows = (await env.DB.prepare('SELECT * FROM alerts WHERE account_id = ? AND active = 1 ORDER BY created_at DESC').bind(who.accountId).all()).results;
  return { items: rows.map((r) => ({ id: r.id, kind: r.kind, cardId: r.card_id, variantId: r.variant_id, maxPrice: r.max_price, query: r.query ? JSON.parse(r.query) : null, label: r.label, createdAt: r.created_at, lastHitAt: r.last_hit_at })), limit: MAX_ALERTS };
}
export async function deleteAlert(env, who, id) {
  const r = await env.DB.prepare('UPDATE alerts SET active = 0 WHERE id = ? AND account_id = ? AND active = 1').bind(id, who.accountId).run();
  if (!r.meta || !r.meta.changes) throw new ApiError(404, 'not-found', 'That alert could not be found.');
  return { ok: true };
}

function matches(alert, L) {
  if (alert.account_id === L.seller_id || L.kind === 'swap' && alert.kind === 'price') return false;
  if (alert.kind === 'price') {
    if (alert.card_id !== L.card_id) return false;
    if (alert.variant_id && alert.variant_id !== L.variant_id) return false;
    return L.price <= alert.max_price;
  }
  const q = alert.query ? JSON.parse(alert.query) : {};
  if (q.q && nameOf(L.card_id).toLowerCase().indexOf(q.q.toLowerCase()) < 0) return false;
  if (q.rarity && !q.rarity.includes(rarityOf(L.card_id))) return false;
  if (q.kind && !q.kind.includes(L.kind)) return false;
  if (q.maxPrice != null && L.kind !== 'swap' && L.price > q.maxPrice) return false;
  if (q.brand && L.brand !== q.brand) return false;
  if (q.generation && L.generation !== q.generation) return false;
  if (q.variantId && L.variant_id !== q.variantId) return false;
  return true;
}

// Called after a listing appears or gets cheaper. One notification per alert per listing, ever.
export async function evaluateAlerts(env, listingId, now) {
  const L = await env.DB.prepare("SELECT * FROM listings WHERE id = ? AND status = 'active'").bind(listingId).first();
  if (!L) return 0;
  const alerts = (await env.DB.prepare('SELECT * FROM alerts WHERE active = 1 AND (card_id = ? OR card_id IS NULL) LIMIT 300').bind(L.card_id).all()).results;
  const hits = alerts.filter((a) => matches(a, L)).slice(0, 50);
  if (!hits.length) return 0;
  const statements = [];
  hits.forEach((a) => {
    statements.push(env.DB.prepare('INSERT OR IGNORE INTO alert_hits (alert_id, listing_id, at) VALUES (?, ?, ?)').bind(a.id, L.id, now));
    // the notification is written only when this was the first hit, by selecting on the row that was just inserted
    statements.push(env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body, ref) SELECT ?, ?, 'price', ?, ? WHERE (SELECT changes()) = 1").bind(a.account_id, now,
      (a.kind === 'price' ? 'Price alert: ' : 'Saved search: ') + nameOf(L.card_id) + ' is listed at ' + L.price + ' Credits' + (a.label ? ' (' + a.label + ')' : '') + '.', L.id));
    statements.push(env.DB.prepare('UPDATE alerts SET last_hit_at = ? WHERE id = ?').bind(now, a.id));
  });
  await env.DB.batch(statements);
  return hits.length;
}
export { QUERY_KEYS };
