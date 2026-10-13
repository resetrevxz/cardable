// The operator's moderation tools. Reached only through the admin routes, which answer 404 to anyone without the
// server-side ADMIN_TOKEN (a Wrangler secret): there is no role a client can claim. Every action here writes a row to
// `moderation_log` (who, what, why) in the same batch as its effect, and tells the player it affected.
//
//   GET  /v1/admin/reports?status=open        grouped by target, with what the target is
//   POST /v1/admin/moderate                   one action (below)
//   GET  /v1/admin/log                        the audit trail
//   GET  /v1/admin/usage                      picture storage in use
import { ApiError } from './util.js';
import { revokeListing } from './listings.js';
import { mediaUsage, purgeObjects } from './uploads.js';

const DAY = 86_400_000;
const REASON = (v) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
const ACTIONS = ['remove_comment', 'release_comment', 'remove_review', 'release_review', 'remove_upload', 'revoke_listing', 'clear_listing_text',
  'mute', 'unmute', 'block_uploads', 'unblock_uploads', 'dismiss_report'];

export function actorOf(request) {
  const raw = request.headers.get('x-admin-actor') || '';
  return /^[A-Za-z0-9 ._@-]{1,40}$/.test(raw) ? raw : 'operator';
}

export async function listReports(env, url, now) {
  const p = url.searchParams, status = ['open', 'actioned', 'dismissed'].includes(p.get('status')) ? p.get('status') : 'open', limit = Math.max(1, Math.min(100, Number(p.get('limit')) || 50));
  const groups = (await env.DB.prepare('SELECT target_type, target_id, COUNT(*) AS reports, MIN(created_at) AS first_at, MAX(created_at) AS last_at, GROUP_CONCAT(DISTINCT reason) AS reasons ' +
    'FROM reports WHERE status = ? GROUP BY target_type, target_id ORDER BY reports DESC, first_at LIMIT ?').bind(status, limit).all()).results;
  const items = [];
  for (const g of groups) {
    let what = null;
    if (g.target_type === 'comment') {
      what = await env.DB.prepare('SELECT c.id, c.body, c.status, c.listing_id, a.alias AS author FROM comments c JOIN accounts a ON a.id = c.author_id WHERE c.id = ?').bind(g.target_id).first();
    } else if (g.target_type === 'review') {
      what = await env.DB.prepare('SELECT r.id, r.rating, r.body, r.status, b.alias AS author, s.alias AS about FROM reviews r JOIN accounts b ON b.id = r.buyer_id JOIN accounts s ON s.id = r.seller_id WHERE r.id = ?').bind(g.target_id).first();
    } else if (g.target_type === 'upload') {
      what = await env.DB.prepare('SELECT u.id, u.status, u.listing_id, u.alt, a.alias AS owner FROM uploads u JOIN accounts a ON a.id = u.account_id WHERE u.id = ?').bind(g.target_id).first();
    } else {
      what = await env.DB.prepare('SELECT l.id, l.title, l.note, l.status, a.alias AS seller FROM listings l JOIN accounts a ON a.id = l.seller_id WHERE l.id = ?').bind(g.target_id).first();
    }
    items.push({ targetType: g.target_type, targetId: g.target_id, reports: g.reports, reasons: String(g.reasons || '').split(','), firstAt: g.first_at, lastAt: g.last_at, target: what });
  }
  const totals = (await env.DB.prepare('SELECT status, COUNT(*) AS n FROM reports GROUP BY status').all()).results;
  return { items, totals, serverNow: now };
}

async function accountOf(env, alias) {
  const a = await env.DB.prepare('SELECT id, alias FROM accounts WHERE alias = ? COLLATE NOCASE').bind(String(alias || '').slice(0, 40)).first();
  if (!a) throw new ApiError(404, 'not-found', 'No player has that name.');
  return a;
}

export async function moderate(env, body, actor, now) {
  const action = String(body.action || ''), reason = REASON(body.reason);
  if (!ACTIONS.includes(action)) throw new ApiError(422, 'invalid', 'Unknown action. Use one of: ' + ACTIONS.join(', ') + '.');
  if (!reason && action !== 'dismiss_report') throw new ApiError(422, 'reason', 'Every action needs a reason; it is written to the log and sent to the player.');
  const log = (type, id, detail) => env.DB.prepare('INSERT INTO moderation_log (at, actor, action, target_type, target_id, reason, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(now, actor, action, type, id, reason, detail ? JSON.stringify(detail) : null);
  const resolve = (type, id, outcome) => env.DB.prepare("UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE target_type = ? AND target_id = ? AND status = 'open'").bind(outcome, now, actor, type, id);
  const tell = (accountId, text, ref) => env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body, ref) VALUES (?, ?, 'moderation', ?, ?)").bind(accountId, now, String(text).slice(0, 240), ref || null);

  if (action === 'remove_comment' || action === 'release_comment') {
    const c = await env.DB.prepare('SELECT id, author_id, status, listing_id FROM comments WHERE id = ?').bind(String(body.commentId || '')).first();
    if (!c) throw new ApiError(404, 'not-found', 'That comment could not be found.');
    if (action === 'remove_comment') {
      await env.DB.batch([env.DB.prepare("UPDATE comments SET status = 'removed', body = '', note = ? WHERE id = ?").bind(reason, c.id), resolve('comment', c.id, 'actioned'),
        tell(c.author_id, 'The operator removed one of your comments: ' + reason, c.listing_id), log('comment', c.id)]);
    } else {
      if (c.status !== 'held') throw new ApiError(409, 'not-held', 'Only a held comment can be released.');
      await env.DB.batch([env.DB.prepare("UPDATE comments SET status = 'visible', reports = 0 WHERE id = ? AND status = 'held'").bind(c.id), resolve('comment', c.id, 'dismissed'), log('comment', c.id)]);
    }
    return { ok: true, action, commentId: c.id };
  }
  if (action === 'remove_review' || action === 'release_review') {
    const r = await env.DB.prepare('SELECT id, buyer_id, status FROM reviews WHERE id = ?').bind(String(body.reviewId || '')).first();
    if (!r) throw new ApiError(404, 'not-found', 'That review could not be found.');
    if (action === 'remove_review') {
      await env.DB.batch([env.DB.prepare("UPDATE reviews SET status = 'removed', body = '' WHERE id = ?").bind(r.id), resolve('review', r.id, 'actioned'),
        tell(r.buyer_id, 'The operator removed one of your reviews: ' + reason, null), log('review', r.id)]);
    } else {
      if (r.status !== 'held') throw new ApiError(409, 'not-held', 'Only a held review can be released.');
      await env.DB.batch([env.DB.prepare("UPDATE reviews SET status = 'visible', reports = 0 WHERE id = ? AND status = 'held'").bind(r.id), resolve('review', r.id, 'dismissed'), log('review', r.id)]);
    }
    return { ok: true, action, reviewId: r.id };
  }
  if (action === 'remove_upload') {
    const u = await env.DB.prepare('SELECT id, account_id, listing_id, status FROM uploads WHERE id = ?').bind(String(body.uploadId || '')).first();
    if (!u || u.status === 'removed' || u.status === 'expired') throw new ApiError(404, 'not-found', 'That picture could not be found.');
    const statements = [env.DB.prepare("UPDATE uploads SET status = 'removed', removed_at = ?, removed_by = 'operator', removed_note = ? WHERE id = ?").bind(now, reason, u.id)];
    if (u.listing_id) {
      statements.push(env.DB.prepare("UPDATE listings SET images = (SELECT COALESCE(json_group_array(json(value)), '[]') FROM json_each(listings.images) WHERE json_extract(value, '$.u') <> ?1), " +
        "cover = CASE WHEN json_extract(listings.images, '$[0].u') = ?1 THEN NULL ELSE cover END WHERE id = ?2").bind(u.id, u.listing_id));
    }
    statements.push(resolve('upload', u.id, 'actioned'), tell(u.account_id, 'The operator removed a picture from your listing: ' + reason, u.listing_id), log('upload', u.id, { listing: u.listing_id }));
    await env.DB.batch(statements);
    const purged = await purgeObjects(env, u.id);
    return { ok: true, action, uploadId: u.id, objectsDeleted: purged };
  }
  if (action === 'revoke_listing') {
    const id = String(body.listingId || ''), L = await env.DB.prepare('SELECT id, seller_id, status FROM listings WHERE id = ?').bind(id).first();
    if (!L) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    const out = await revokeListing(env, id, reason, now);
    if (out.contended) throw new ApiError(409, 'busy', 'The listing is being settled. Try again in a moment.');
    let objects = 0;
    for (const uid of out.uploads || []) objects += await purgeObjects(env, uid);
    await env.DB.batch([resolve('listing', id, 'actioned'), tell(L.seller_id, 'The operator took down your listing: ' + reason, id), log('listing', id, { was: L.status, pictures: (out.uploads || []).length })]);
    return { ok: true, action, listingId: id, was: L.status, picturesRemoved: (out.uploads || []).length, objectsDeleted: objects };
  }
  if (action === 'clear_listing_text') {
    const id = String(body.listingId || ''), L = await env.DB.prepare('SELECT id, seller_id FROM listings WHERE id = ?').bind(id).first();
    if (!L) throw new ApiError(404, 'not-found', 'That listing could not be found.');
    await env.DB.batch([env.DB.prepare("UPDATE listings SET title = '', note = '' WHERE id = ?").bind(id), resolve('listing', id, 'actioned'), tell(L.seller_id, 'The operator cleared the title and note of your listing: ' + reason, id), log('listing', id)]);
    return { ok: true, action, listingId: id };
  }
  if (action === 'dismiss_report') {
    const t = String(body.targetType || ''), id = String(body.targetId || '');
    if (!['comment', 'review', 'upload', 'listing'].includes(t) || !id) throw new ApiError(422, 'invalid', 'Name the target type and id.');
    const r = await resolve(t, id, 'dismissed').run();
    await log(t, id).run();
    return { ok: true, action, dismissed: r.meta ? r.meta.changes : 0 };
  }
  // restrictions on a player
  const a = await accountOf(env, body.alias);
  if (action === 'mute') {
    const hours = Number(body.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 90) throw new ApiError(422, 'invalid', 'Give a number of hours from 1 to 2160.');
    const until = now + Math.round(hours * 3_600_000);
    await env.DB.batch([env.DB.prepare('UPDATE accounts SET muted_until = ? WHERE id = ?').bind(until, a.id), tell(a.id, 'The operator switched off your comments and reviews until ' + new Date(until).toISOString().slice(0, 10) + ': ' + reason, null), log('account', a.alias, { until })]);
    return { ok: true, action, alias: a.alias, until };
  }
  if (action === 'unmute') {
    await env.DB.batch([env.DB.prepare('UPDATE accounts SET muted_until = NULL WHERE id = ?').bind(a.id), tell(a.id, 'The operator switched your comments and reviews back on.', null), log('account', a.alias)]);
    return { ok: true, action, alias: a.alias };
  }
  const block = action === 'block_uploads';
  await env.DB.batch([env.DB.prepare('UPDATE accounts SET uploads_blocked = ? WHERE id = ?').bind(block ? 1 : 0, a.id),
    tell(a.id, block ? 'The operator switched off picture uploads for your account: ' + reason : 'The operator switched picture uploads back on.', null), log('account', a.alias)]);
  return { ok: true, action, alias: a.alias, uploadsBlocked: block };
}

export async function moderationLog(env, url) {
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 50));
  const rows = (await env.DB.prepare('SELECT id, at, actor, action, target_type, target_id, reason, detail FROM moderation_log ORDER BY id DESC LIMIT ?').bind(limit).all()).results;
  return { items: rows.map((r) => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, targetType: r.target_type, targetId: r.target_id, reason: r.reason, detail: r.detail ? JSON.parse(r.detail) : null })) };
}
export { mediaUsage, DAY };
