// Alerts: a price threshold on a card, or a saved search, delivered as a notification in the in-app inbox when a real
// player's listing matches. There is no push channel in the beta, so nothing is promised while the game is closed: the
// alert is checked when the listing appears (or is repriced) and waits in the inbox until the player opens the game.
import { ApiError, cleanText } from './util.js';
import { CATALOG } from './catalog.js';
import { isCard, nameOf } from './economy.js';
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
  if (variantId && !CATALOG.variants.includes(variantId)) throw new ApiError(422, 'invalid', 'That finish is not in the catalog.');
  // The limit is part of the INSERT, so two requests at once cannot both slip under it.
  const id = newId('alt');
  const r = await env.DB.prepare('INSERT INTO alerts (id, account_id, kind, card_id, variant_id, max_price, query, label, created_at) ' +
    'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM alerts WHERE account_id = ? AND active = 1) < ?')
    .bind(id, who.accountId, kind, cardId, variantId, maxPrice, query ? JSON.stringify(query) : null, label, now, who.accountId, MAX_ALERTS).run();
  if (!r.meta || !r.meta.changes) throw new ApiError(409, 'limit', 'You can have ' + MAX_ALERTS + ' alerts at once.');
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

// Delivery. An alert is evaluated by its OWNER's own requests, against the listings that appeared or got cheaper since
// the alert was last looked at. Nothing is shared between players: one player's alerts can neither crowd out another's
// nor cost the market a write per listing, and what one player does costs only that player's own reads. A match is one
// notification per alert per listing, ever. The inbox holds it until the game is opened; there is no push channel.
const PER_CALL = 8;        // alerts looked at per request, longest-unchecked first, so all of a player's alerts get a turn
const PER_ALERT = 5;       // notifications one alert can make in one look (the rest are still in the market)

function conditions(a, now, me, since) {
  const where = ["l.status = 'active'", 'l.ends_at > ?', 'l.touched_at > ?', 'l.seller_id <> ?'], binds = [now, since, me];
  if (a.kind === 'price') {
    where.push('l.card_id = ?', "l.kind <> 'swap'", 'l.price <= ?'); binds.push(a.card_id, a.max_price);
    if (a.variant_id) { where.push('l.variant_id = ?'); binds.push(a.variant_id); }
    return { where, binds };
  }
  const q = a.query ? JSON.parse(a.query) : {};
  if (q.q) {
    const needle = String(q.q).toLowerCase();
    const ids = Object.keys(CATALOG.names).filter((id) => CATALOG.names[id].toLowerCase().indexOf(needle) >= 0).slice(0, 50);
    if (!ids.length) where.push('0'); else { where.push('l.card_id IN (' + ids.map(() => '?').join(',') + ')'); binds.push(...ids); }
  }
  if (q.rarity && q.rarity.length) { where.push('l.rarity IN (' + q.rarity.map(() => '?').join(',') + ')'); binds.push(...q.rarity); }
  if (q.kind && q.kind.length) { where.push('l.kind IN (' + q.kind.map(() => '?').join(',') + ')'); binds.push(...q.kind); }
  if (q.maxPrice != null) { where.push("(l.kind = 'swap' OR l.price <= ?)"); binds.push(q.maxPrice); }
  if (q.brand) { where.push('l.brand = ?'); binds.push(q.brand); }
  if (q.generation) { where.push('l.generation = ?'); binds.push(q.generation); }
  if (q.variantId) { where.push('l.variant_id = ?'); binds.push(q.variantId); }
  return { where, binds };
}

export async function evaluateOwnAlerts(env, who, now) {
  const gap = env.ENVIRONMENT === 'test' && env.ALERT_GAP_MS != null ? Number(env.ALERT_GAP_MS) : 15_000;
  const due = (await env.DB.prepare('SELECT * FROM alerts WHERE account_id = ? AND active = 1 AND COALESCE(checked_at, created_at) <= ? ORDER BY COALESCE(checked_at, created_at) LIMIT ?')
    .bind(who.accountId, now - gap, PER_CALL).all()).results;
  let fired = 0;
  for (const a of due) {
    const since = a.checked_at == null ? a.created_at : a.checked_at;
    const c = conditions(a, now, who.accountId, since);
    const rows = (await env.DB.prepare('SELECT l.id, l.card_id, l.price, l.touched_at FROM listings l WHERE ' + c.where.join(' AND ') + ' ORDER BY l.touched_at DESC LIMIT ' + PER_ALERT).bind(...c.binds).all()).results;
    const statements = [];
    rows.forEach((L) => {
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO alert_hits (alert_id, listing_id, at) VALUES (?, ?, ?)').bind(a.id, L.id, L.touched_at));
      // written only when this is the first hit of this alert on this listing, by selecting on the row just inserted
      statements.push(env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body, ref) SELECT ?, ?, 'price', ?, ? WHERE (SELECT changes()) = 1").bind(a.account_id, L.touched_at,
        (a.kind === 'price' ? 'Price alert: ' : 'Saved search: ') + nameOf(L.card_id) + ' is listed at ' + L.price + ' Credits' + (a.label ? ' (' + a.label + ')' : '') + '.', L.id));
    });
    statements.push(env.DB.prepare('UPDATE alerts SET checked_at = ?, last_hit_at = CASE WHEN ? > 0 THEN ? ELSE last_hit_at END WHERE id = ?').bind(now, rows.length, now, a.id));
    await env.DB.batch(statements);
    fired += rows.length;
  }
  return fired;
}
export { QUERY_KEYS };
