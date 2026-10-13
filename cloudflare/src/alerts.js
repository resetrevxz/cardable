// Alerts: a price threshold on a card, or a saved search, delivered as a notification in the in-app inbox when a real
// player's listing matches. There is no push channel in the beta, so nothing is promised while the game is closed: the
// alert is checked by its owner's own requests and waits in the inbox until the player opens the game.
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
  const r = await env.DB.prepare('INSERT INTO alerts (id, account_id, kind, card_id, variant_id, max_price, query, label, created_at, checked_seq) ' +
    'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT MAX(seq) FROM listing_events), 0) WHERE (SELECT COUNT(*) FROM alerts WHERE account_id = ? AND active = 1) < ?')
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

// Delivery. An alert is evaluated by its OWNER's own requests, against the log of listing events (a listing appearing
// or getting cheaper) since the alert last looked. Nothing is shared between players: one player's alerts can neither
// crowd out another's nor cost the market a write per listing. A match is one notification per alert per listing, ever.
// The inbox holds it until the game is opened; there is no push channel.
//
// The place an alert has reached is a position in the event log (`seq`, assigned in commit order), never a clock
// reading, so it cannot move past a listing that committed late. A look reads ONE row per listing, in event order,
// at most EXAMINE of them, and filters them in SQL; the alert's place advances only over listings it examined, or up to
// the last match it reported when it reported the limit. Nothing is skipped to "catch up": whatever other players do to
// the market can delay a look, never make it miss a listing.
const PER_CALL = 8;       // alerts looked at per request, longest-unchecked first, so all of a player's alerts get a turn
const PER_ALERT = 5;      // new matches one alert reports in one look
const EXAMINE = 500;      // listings one look examines (smaller only in the test environment, to exercise the run)
const examineOf = (env) => (env.ENVIRONMENT === 'test' && Number(env.ALERT_EXAMINE) > 0 ? Number(env.ALERT_EXAMINE) : EXAMINE);

function conditions(a, me) {
  const where = ['l.seller_id <> ?'], binds = [me];
  if (a.kind === 'price') {
    where.push("l.kind <> 'swap'", 'l.price <= ?'); binds.push(a.max_price);
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
  const due = (await env.DB.prepare('SELECT * FROM alerts WHERE account_id = ? AND active = 1 AND (last_look_at IS NULL OR last_look_at <= ?) ORDER BY COALESCE(last_look_at, 0) LIMIT ?')
    .bind(who.accountId, now - gap, PER_CALL).all()).results;
  if (!due.length) return 0;
  // The end of what is visible now: a look that has examined everything up to here stands at here.
  const top = (await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS n FROM listing_events').first()).n;
  let fired = 0;
  const EXAMINE_N = examineOf(env);
  for (const a of due) {
    const c = conditions(a, who.accountId), scope = a.kind === 'price' ? 'AND card_id = ?' : '', scopeBind = a.kind === 'price' ? [a.card_id] : [];
    // the examined run: this alert's listings in event order, whatever they are; the filter and the limit come after it
    const run = "(SELECT * FROM listings WHERE status = 'active' AND event_seq > ? " + scope + ' ORDER BY event_seq LIMIT ' + EXAMINE_N + ') l';
    const [matched, span] = await env.DB.batch([
      env.DB.prepare('SELECT l.id, l.card_id, l.price, l.event_seq AS seq FROM ' + run + ' WHERE l.ends_at > ? AND ' + c.where.join(' AND ') +
        ' AND NOT EXISTS (SELECT 1 FROM alert_hits h WHERE h.alert_id = ? AND h.listing_id = l.id) ORDER BY l.event_seq LIMIT ' + PER_ALERT)
        .bind(a.checked_seq, ...scopeBind, now, ...c.binds, a.id),
      env.DB.prepare('SELECT COUNT(*) AS n, MAX(event_seq) AS last FROM (SELECT event_seq FROM listings WHERE status = \'active\' AND event_seq > ? ' + scope + ' ORDER BY event_seq LIMIT ' + EXAMINE_N + ')')
        .bind(a.checked_seq, ...scopeBind)
    ]);
    const rows = matched.results, examined = span.results[0];
    let reached;
    if (rows.length === PER_ALERT) reached = rows[rows.length - 1].seq;          // more may follow: continue from the last one reported
    else if (examined.n >= EXAMINE_N) reached = examined.last;                      // the run was full: continue after it
    else reached = Math.max(top, a.checked_seq);                                 // everything visible was examined
    const statements = [];
    rows.forEach((L) => {
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO alert_hits (alert_id, listing_id, at) VALUES (?, ?, ?)').bind(a.id, L.id, now));
      // written only when this is the first hit of this alert on this listing, by selecting on the row just inserted
      statements.push(env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body, ref) SELECT ?, ?, 'price', ?, ? WHERE (SELECT changes()) = 1").bind(a.account_id, now,
        (a.kind === 'price' ? 'Price alert: ' : 'Saved search: ') + nameOf(L.card_id) + ' is listed at ' + L.price + ' Credits' + (a.label ? ' (' + a.label + ')' : '') + '.', L.id));
    });
    statements.push(env.DB.prepare('UPDATE alerts SET checked_seq = ?, last_look_at = ?, last_hit_at = CASE WHEN ? > 0 THEN ? ELSE last_hit_at END WHERE id = ?').bind(Math.max(reached, a.checked_seq), now, rows.length, now, a.id));
    await env.DB.batch(statements);
    fired += rows.length;
  }
  return fired;
}
export { QUERY_KEYS };
