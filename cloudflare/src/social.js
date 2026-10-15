// The social layer of the Global Market: comments on listings, buyer-rated reviews, follows, public profiles, the
// community feed and reports. Everything a player can see about another player is their alias and counts. No account
// id, address, session or device detail is ever in an answer.
//
// What a player may NOT do is as deliberate as what they may: reviews exist only for a completed trade, once; comments
// are plain text with a cooldown and hourly and daily limits; an operator's removal is final for the author.
import { ApiError } from './util.js';
import { cleanPublicText, sameness } from './textrules.js';
import { Tx, mutate, newId } from './ops.js';
import { DAY } from './economy.js';
import { LISTING_SQL, withValuations } from './views.js';

const HOUR = 3_600_000;
export const SOCIAL = {
  comment: { max: 300, cooldownMs: 15_000, perHour: 20, perDay: 80, perListing: 200, editWindowMs: 10 * 60_000, duplicateWindowMs: 10 * 60_000, closedAfterMs: 7 * DAY, repliesShown: 20 },
  review: { maxText: 200, window: 30 * DAY, editWindowMs: 24 * HOUR, perDay: 10 },
  report: { perDay: 20, holdAt: 3, reasons: ['spam', 'abusive', 'scam', 'unsafe-image', 'other'], noteMax: 140 },
  follow: { max: 100 },
  muted: { max: 50 }
};
const ALIAS = /^[A-Za-z][A-Za-z' -]{2,38}[A-Za-z]$/;
const SOCIAL_ON = "COALESCE((SELECT json_extract(value, '$.notifySocial') FROM settings WHERE account_id = ?), 1) <> 0";
const FOLLOWS_ON = "COALESCE((SELECT json_extract(value, '$.notifyFollows') FROM settings WHERE account_id = ?), 1) <> 0";

// A notification the recipient has not switched off (the setting is read inside the same statement).
function socialNote(tx, accountId, kind, body, ref) {
  tx.add('INSERT INTO notifications (account_id, at, kind, body, ref) SELECT ?, ?, ?, ?, ? WHERE ' + SOCIAL_ON, accountId, tx.now, kind, String(body).slice(0, 240), ref || null, accountId);
}
const cursorOf = (a, b) => btoa(JSON.stringify([a, b])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function parseCursor(text) {
  if (!text) return null;
  try { const v = JSON.parse(atob(String(text).replace(/-/g, '+').replace(/_/g, '/'))); if (Array.isArray(v) && v.length === 2 && typeof v[1] === 'string') return v; } catch (_) { /* bad cursor */ }
  throw new ApiError(400, 'bad-cursor', 'That page marker is not valid.');
}
const limitOf = (v, def, max) => Math.max(1, Math.min(max, Number(v) || def));

async function restriction(env, accountId, now) {
  const a = await env.DB.prepare('SELECT muted_until FROM accounts WHERE id = ?').bind(accountId).first();
  if (a && a.muted_until && a.muted_until > now) throw new ApiError(403, 'muted', 'Commenting and reviewing are switched off for your account until ' + new Date(a.muted_until).toISOString().slice(0, 10) + '.');
}

// ---- comments -------------------------------------------------------------------------------------------------------
function commentView(c, me, sellerId, now) {
  const mine = c.author_id === me, seller = me === sellerId;
  let body = c.body, placeholder = null;
  if (c.status === 'author_removed') { body = null; placeholder = 'Removed by its author.'; }
  else if (c.status === 'removed') { body = null; placeholder = 'Removed by the operator.'; }
  else if (c.status === 'held' && !mine) { body = null; placeholder = 'Hidden while it is reviewed.'; }
  else if (c.status === 'seller_hidden' && !mine && !seller) { body = null; placeholder = 'Hidden by the seller.'; }
  return { id: c.id, parentId: c.parent_id, author: c.author_alias, isYou: mine, isSeller: c.author_id === sellerId, body, placeholder, status: c.status,
    createdAt: c.created_at, editedAt: c.edited_at, canEdit: mine && c.status === 'visible' && now - c.created_at <= SOCIAL.comment.editWindowMs,
    canDelete: mine && c.status !== 'author_removed' && c.status !== 'removed', canHide: seller && !mine && (c.status === 'visible' || c.status === 'seller_hidden'), hiddenBySeller: c.status === 'seller_hidden' };
}

async function listingFor(env, listingId) {
  if (!/^lst_[A-Za-z0-9_-]{6,40}$/.test(listingId)) throw new ApiError(404, 'not-found', 'That listing could not be found.');
  const L = await env.DB.prepare('SELECT id, seller_id, status, closed_at FROM listings WHERE id = ?').bind(listingId).first();
  if (!L) throw new ApiError(404, 'not-found', 'That listing could not be found.');
  return L;
}
function commentsOpen(L, now) {
  if (L.status === 'active') return true;
  return L.closed_at != null && now - L.closed_at <= SOCIAL.comment.closedAfterMs;
}

export async function listComments(env, who, listingId, url, now) {
  const L = await listingFor(env, listingId), p = url.searchParams, limit = limitOf(p.get('limit'), 20, 50), cur = parseCursor(p.get('cursor'));
  const where = ['c.listing_id = ?', 'c.parent_id IS NULL'], binds = [listingId];
  if (cur) { where.push('(c.created_at < ? OR (c.created_at = ? AND c.id < ?))'); binds.push(cur[0], cur[0], cur[1]); }
  const rows = (await env.DB.prepare('SELECT c.*, a.alias AS author_alias FROM comments c JOIN accounts a ON a.id = c.author_id WHERE ' + where.join(' AND ') + ' ORDER BY c.created_at DESC, c.id DESC LIMIT ' + (limit + 1)).bind(...binds).all()).results;
  const page = rows.slice(0, limit), ids = page.map((r) => r.id);
  let replies = [], counts = {};
  if (ids.length) {
    replies = (await env.DB.prepare('SELECT c.*, a.alias AS author_alias FROM comments c JOIN accounts a ON a.id = c.author_id WHERE c.parent_id IN (' + ids.map(() => '?').join(',') + ') ORDER BY c.created_at, c.id LIMIT 400').bind(...ids).all()).results;
    (await env.DB.prepare('SELECT parent_id, COUNT(*) AS n FROM comments WHERE parent_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY parent_id').bind(...ids).all()).results.forEach((r) => { counts[r.parent_id] = r.n; });
  }
  const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE listing_id = ?').bind(listingId).first()).n;
  const mineReports = new Set();
  const all = page.concat(replies).map((r) => r.id);
  if (all.length) (await env.DB.prepare("SELECT target_id FROM reports WHERE reporter_id = ? AND target_type = 'comment' AND target_id IN (" + all.map(() => '?').join(',') + ')').bind(who.accountId, ...all).all()).results.forEach((r) => mineReports.add(r.target_id));
  const view = (r) => Object.assign(commentView(r, who.accountId, L.seller_id, now), { reported: mineReports.has(r.id) });
  const byParent = {};
  replies.forEach((r) => { (byParent[r.parent_id] = byParent[r.parent_id] || []).push(view(r)); });
  const last = page[page.length - 1];
  return {
    items: page.map((r) => Object.assign(view(r), { replies: (byParent[r.id] || []).slice(0, SOCIAL.comment.repliesShown), replyCount: counts[r.id] || 0 })),
    nextCursor: rows.length > limit && last ? cursorOf(last.created_at, last.id) : null, total,
    open: commentsOpen(L, now), closedReason: commentsOpen(L, now) ? null : 'Comments close a week after a listing ends.', rules: { max: SOCIAL.comment.max, cooldownSeconds: SOCIAL.comment.cooldownMs / 1000, editMinutes: SOCIAL.comment.editWindowMs / 60000 },
    serverNow: now
  };
}

export async function postComment(env, who, key, listingId, body, now) {
  const text = cleanPublicText(body.body, SOCIAL.comment.max, 'comment');
  if (!text) throw new ApiError(422, 'empty', 'Write something first.');
  const parentId = body.parentId == null ? null : String(body.parentId);
  if (parentId != null && !/^cmt_[A-Za-z0-9_-]{6,40}$/.test(parentId)) throw new ApiError(422, 'invalid', 'That reply is not to a comment.');
  return mutate(env, who, key, { op: 'comment', listingId, text, parentId }, now, async () => {
    const L = await listingFor(env, listingId);
    if (!commentsOpen(L, now)) throw new ApiError(409, 'comments-closed', 'Comments on this listing have closed.');
    await restriction(env, who.accountId, now);
    let parent = null;
    if (parentId) {
      parent = await env.DB.prepare('SELECT id, listing_id, parent_id, author_id, status FROM comments WHERE id = ?').bind(parentId).first();
      if (!parent || parent.listing_id !== listingId) throw new ApiError(404, 'not-found', 'That comment could not be found.');
      if (parent.parent_id) throw new ApiError(409, 'depth', 'Replies go to the comment, not to another reply.');
      if (parent.status === 'removed' || parent.status === 'author_removed') throw new ApiError(409, 'removed', 'That comment was removed.');
    }
    const c = SOCIAL.comment;
    const last = await env.DB.prepare('SELECT created_at FROM comments WHERE author_id = ? ORDER BY created_at DESC LIMIT 1').bind(who.accountId).first();
    if (last && now - last.created_at < c.cooldownMs) throw new ApiError(429, 'cooldown', 'Give it a moment before posting again.', { retryAfter: Math.ceil((c.cooldownMs - (now - last.created_at)) / 1000) });
    const hour = (await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE author_id = ? AND created_at > ?').bind(who.accountId, now - HOUR).first()).n;
    if (hour >= c.perHour) throw new ApiError(429, 'rate-limited', 'That is a lot of comments for one hour. Try again later.', { retryAfter: 600 });
    const day = (await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE author_id = ? AND created_at > ?').bind(who.accountId, now - DAY).first()).n;
    if (day >= c.perDay) throw new ApiError(429, 'rate-limited', 'You have reached the daily comment limit.', { retryAfter: 3600 });
    const same = sameness(text);
    const recent = (await env.DB.prepare('SELECT body FROM comments WHERE author_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 10').bind(who.accountId, now - c.duplicateWindowMs).all()).results;
    if (recent.some((r) => sameness(r.body) === same)) throw new ApiError(409, 'duplicate', 'You already said that.');
    const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE listing_id = ?').bind(listingId).first()).n;
    if (count >= c.perListing) throw new ApiError(409, 'full', 'This listing has reached its comment limit.');
    const id = newId('cmt'), tx = new Tx(env, now);
    tx.guard('limit_hit', '(SELECT COUNT(*) FROM comments WHERE listing_id = ?) < ?', listingId, c.perListing);
    tx.guard('quota', '(SELECT COUNT(*) FROM comments WHERE author_id = ? AND created_at > ?) < ?', who.accountId, now - HOUR, c.perHour);
    tx.guard('quota', '(SELECT COUNT(*) FROM comments WHERE author_id = ? AND created_at > ?) < ?', who.accountId, now - DAY, c.perDay);
    // the cooldown is in the transaction too: two comments at once cannot both be the first
    tx.guard('quota', 'NOT EXISTS (SELECT 1 FROM comments WHERE author_id = ? AND created_at > ?)', who.accountId, now - c.cooldownMs);
    tx.add("INSERT INTO comments (id, listing_id, author_id, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)", id, listingId, who.accountId, parentId, text, now);
    const name = who.alias;
    if (parent && parent.author_id !== who.accountId) socialNote(tx, parent.author_id, 'reply', name + ' replied to your comment.', listingId);
    if (L.seller_id !== who.accountId && !(parent && parent.author_id === L.seller_id)) socialNote(tx, L.seller_id, 'comment', name + ' commented on your listing.', listingId);
    return { tx, result: { ok: true, commentId: id, listingId } };
  });
}

export async function editComment(env, who, key, commentId, body, now) {
  const text = cleanPublicText(body.body, SOCIAL.comment.max, 'comment');
  if (!text) throw new ApiError(422, 'empty', 'Write something first.');
  return mutate(env, who, key, { op: 'comment-edit', commentId, text }, now, async () => {
    const c = await env.DB.prepare('SELECT id, author_id, status, created_at FROM comments WHERE id = ?').bind(commentId).first();
    if (!c || c.author_id !== who.accountId) throw new ApiError(404, 'not-found', 'That comment could not be found.');
    if (c.status !== 'visible') throw new ApiError(409, 'edit-closed', 'This comment can no longer be changed.');
    if (now - c.created_at > SOCIAL.comment.editWindowMs) throw new ApiError(409, 'edit-closed', 'A comment can be changed for ' + SOCIAL.comment.editWindowMs / 60000 + ' minutes after it is posted.');
    await restriction(env, who.accountId, now);
    const tx = new Tx(env, now);
    tx.guard('edit_closed', "EXISTS (SELECT 1 FROM comments WHERE id = ? AND author_id = ? AND status = 'visible')", commentId, who.accountId);
    tx.add('UPDATE comments SET body = ?, edited_at = ? WHERE id = ?', text, now, commentId);
    return { tx, result: { ok: true, commentId } };
  });
}

// The author removes their own comment (its words are erased, its place in the thread stays), or the seller hides or
// shows a comment on their listing. A hidden comment stays visible to its author and to the seller.
export async function removeComment(env, who, key, commentId, now) {
  return mutate(env, who, key, { op: 'comment-remove', commentId }, now, async () => {
    const c = await env.DB.prepare('SELECT id, author_id, status FROM comments WHERE id = ?').bind(commentId).first();
    if (!c || c.author_id !== who.accountId) throw new ApiError(404, 'not-found', 'That comment could not be found.');
    if (c.status === 'removed') throw new ApiError(409, 'removed', 'The operator removed this comment.');
    const tx = new Tx(env, now);
    tx.add("UPDATE comments SET status = 'author_removed', body = '' WHERE id = ? AND author_id = ? AND status <> 'removed'", commentId, who.accountId);
    return { tx, result: { ok: true, commentId } };
  });
}
export async function hideComment(env, who, key, commentId, body, now) {
  const hidden = body.hidden !== false;
  return mutate(env, who, key, { op: 'comment-hide', commentId, hidden }, now, async () => {
    const c = await env.DB.prepare('SELECT c.id, c.status, c.author_id, l.seller_id FROM comments c JOIN listings l ON l.id = c.listing_id WHERE c.id = ?').bind(commentId).first();
    if (!c || c.seller_id !== who.accountId) throw new ApiError(404, 'not-found', 'That comment could not be found.');
    if (c.author_id === who.accountId) throw new ApiError(409, 'own', 'Use remove for your own comment.');
    const from = hidden ? 'visible' : 'seller_hidden', to = hidden ? 'seller_hidden' : 'visible';
    if (c.status !== from) throw new ApiError(409, 'not-visible', hidden ? 'That comment is not showing, so it cannot be hidden.' : 'That comment was not hidden by you.');
    const tx = new Tx(env, now);
    tx.add('UPDATE comments SET status = ? WHERE id = ? AND status = ?', to, commentId, from);
    return { tx, result: { ok: true, commentId, status: to } };
  });
}

// ---- reports ----------------------------------------------------------------------------------------------------------------
export async function report(env, who, key, body, now) {
  const type = String(body.targetType || ''), id = String(body.targetId || ''), reason = String(body.reason || 'other');
  if (!['comment', 'review', 'upload', 'listing'].includes(type)) throw new ApiError(422, 'invalid', 'Say what you are reporting.');
  if (!SOCIAL.report.reasons.includes(reason)) throw new ApiError(422, 'invalid', 'Choose a reason.');
  const note = body.note == null || body.note === '' ? '' : cleanPublicText(body.note, SOCIAL.report.noteMax, 'note');
  return mutate(env, who, key, { op: 'report', type, id, reason, note }, now, async () => {
    let owner = null, exists = null;
    if (type === 'comment') { const c = await env.DB.prepare('SELECT author_id FROM comments WHERE id = ?').bind(id).first(); exists = !!c; owner = c && c.author_id; }
    else if (type === 'review') { const r = await env.DB.prepare('SELECT buyer_id FROM reviews WHERE id = ?').bind(id).first(); exists = !!r; owner = r && r.buyer_id; }
    else if (type === 'upload') { const u = await env.DB.prepare("SELECT account_id FROM uploads WHERE id = ? AND status = 'attached'").bind(id).first(); exists = !!u; owner = u && u.account_id; }
    else { const l = await env.DB.prepare('SELECT seller_id FROM listings WHERE id = ?').bind(id).first(); exists = !!l; owner = l && l.seller_id; }
    if (!exists) throw new ApiError(404, 'not-found', 'That could not be found.');
    if (owner === who.accountId) throw new ApiError(409, 'own', 'That is yours. Remove it instead.');
    const today = (await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ? AND created_at > ?').bind(who.accountId, now - DAY).first()).n;
    if (today >= SOCIAL.report.perDay) throw new ApiError(429, 'quota', 'You have sent a lot of reports today. The operator will look at them.', { limit: SOCIAL.report.perDay });
    const already = await env.DB.prepare('SELECT 1 AS x FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?').bind(who.accountId, type, id).first();
    if (already) throw new ApiError(409, 'duplicate', 'You already reported that. Thank you.');
    const rid = newId('rep'), tx = new Tx(env, now);
    tx.guard('duplicate', 'NOT EXISTS (SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?)', who.accountId, type, id);
    tx.guard('quota', '(SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND created_at > ?) < ?', who.accountId, now - DAY, SOCIAL.report.perDay);
    tx.add('INSERT INTO reports (id, reporter_id, target_type, target_id, reason, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', rid, who.accountId, type, id, reason, note, now);
    // A comment or review that several different players report is held (hidden from everyone but its author) until
    // the operator looks. Reports are one per player per target, so the count is of distinct players.
    if (type === 'comment') {
      tx.add("UPDATE comments SET reports = reports + 1, status = CASE WHEN status = 'visible' AND reports + 1 >= ? THEN 'held' ELSE status END WHERE id = ?", SOCIAL.report.holdAt, id);
    } else if (type === 'review') {
      tx.add("UPDATE reviews SET reports = reports + 1, status = CASE WHEN status = 'visible' AND reports + 1 >= ? THEN 'held' ELSE status END WHERE id = ?", SOCIAL.report.holdAt, id);
    }
    return { tx, result: { ok: true, reportId: rid } };
  });
}

// ---- reviews ------------------------------------------------------------------------------------------------------------------
const reviewView = (r, me) => ({ id: r.id, rating: r.rating, body: r.status === 'visible' || r.buyer_id === me ? r.body : '', status: r.status, buyer: r.buyer_alias, isYou: r.buyer_id === me, createdAt: r.created_at, editedAt: r.edited_at,
  canEdit: r.buyer_id === me && r.status === 'visible' && !r.edited_at });

export async function pendingReviews(env, who, now) {
  const rows = (await env.DB.prepare('SELECT t.id, t.at, t.kind, t.price, t.item_count, t.card_id, s.alias AS seller_alias FROM trades t JOIN accounts s ON s.id = t.seller_id ' +
    'WHERE t.buyer_id = ? AND t.at > ? AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.trade_id = t.id) ORDER BY t.at DESC LIMIT 20').bind(who.accountId, now - SOCIAL.review.window).all()).results;
  return { items: rows.map((r) => ({ tradeId: r.id, at: r.at, kind: r.kind, price: r.price, count: r.item_count, cardId: r.card_id, seller: r.seller_alias, expiresAt: r.at + SOCIAL.review.window })), serverNow: now };
}

export async function postReview(env, who, key, body, now) {
  const tradeId = String(body.tradeId || ''), rating = body.rating;
  if (!/^trd_[A-Za-z0-9_-]{6,40}$/.test(tradeId)) throw new ApiError(422, 'invalid', 'Choose a completed trade to review.');
  if (!Number.isSafeInteger(rating) || rating < 1 || rating > 5) throw new ApiError(422, 'rating', 'Rate from 1 to 5.');
  const text = body.body == null || body.body === '' ? '' : cleanPublicText(body.body, SOCIAL.review.maxText, 'review');
  return mutate(env, who, key, { op: 'review', tradeId, rating, text }, now, async () => {
    const t = await env.DB.prepare('SELECT id, at, seller_id, buyer_id FROM trades WHERE id = ?').bind(tradeId).first();
    // Not found and not yours look the same: whether a trade exists between two other players is not for anyone to probe.
    if (!t || t.buyer_id !== who.accountId) throw new ApiError(403, 'not-eligible', 'You can review a seller only after a completed trade with them.');
    if (now - t.at > SOCIAL.review.window) throw new ApiError(409, 'review-window', 'Reviews can be left for ' + SOCIAL.review.window / DAY + ' days after a trade.');
    await restriction(env, who.accountId, now);
    const dup = await env.DB.prepare('SELECT id FROM reviews WHERE trade_id = ?').bind(tradeId).first();
    if (dup) throw new ApiError(409, 'duplicate', 'You already reviewed this trade.');
    const day = (await env.DB.prepare('SELECT COUNT(*) AS n FROM reviews WHERE buyer_id = ? AND created_at > ?').bind(who.accountId, now - DAY).first()).n;
    if (day >= SOCIAL.review.perDay) throw new ApiError(429, 'quota', 'That is a lot of reviews for one day.', { limit: SOCIAL.review.perDay });
    const id = newId('rev'), tx = new Tx(env, now);
    tx.guard('duplicate', 'NOT EXISTS (SELECT 1 FROM reviews WHERE trade_id = ?)', tradeId);
    tx.guard('quota', '(SELECT COUNT(*) FROM reviews WHERE buyer_id = ? AND created_at > ?) < ?', who.accountId, now - DAY, SOCIAL.review.perDay);
    tx.add('INSERT INTO reviews (id, trade_id, seller_id, buyer_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, tradeId, t.seller_id, who.accountId, rating, text, now);
    socialNote(tx, t.seller_id, 'review', who.alias + ' rated a trade with you ' + rating + ' out of 5.', t.id);
    return { tx, result: { ok: true, reviewId: id, tradeId } };
  });
}

// Once, within a day, and only while it has not been held or removed.
export async function editReview(env, who, key, reviewId, body, now) {
  const rating = body.rating;
  if (!Number.isSafeInteger(rating) || rating < 1 || rating > 5) throw new ApiError(422, 'rating', 'Rate from 1 to 5.');
  const text = body.body == null || body.body === '' ? '' : cleanPublicText(body.body, SOCIAL.review.maxText, 'review');
  return mutate(env, who, key, { op: 'review-edit', reviewId, rating, text }, now, async () => {
    const r = await env.DB.prepare('SELECT id, buyer_id, status, created_at, edited_at FROM reviews WHERE id = ?').bind(reviewId).first();
    if (!r || r.buyer_id !== who.accountId) throw new ApiError(404, 'not-found', 'That review could not be found.');
    if (r.status !== 'visible' || r.edited_at) throw new ApiError(409, 'edit-closed', r.edited_at ? 'A review can be changed once.' : 'This review can no longer be changed.');
    if (now - r.created_at > SOCIAL.review.editWindowMs) throw new ApiError(409, 'edit-closed', 'A review can be changed for a day after it is left.');
    const tx = new Tx(env, now);
    tx.guard('edit_closed', "EXISTS (SELECT 1 FROM reviews WHERE id = ? AND buyer_id = ? AND status = 'visible' AND edited_at IS NULL)", reviewId, who.accountId);
    tx.add('UPDATE reviews SET rating = ?, body = ?, edited_at = ? WHERE id = ?', rating, text, now, reviewId);
    return { tx, result: { ok: true, reviewId } };
  });
}

// ---- profiles --------------------------------------------------------------------------------------------------------------------
// Counts and a transparent sample: every figure says how many it comes from. Nothing here reveals who a player is.
async function accountByAlias(env, alias) {
  const a = String(alias || '');
  if (!ALIAS.test(a)) throw new ApiError(404, 'not-found', 'No player has that name.');
  const row = await env.DB.prepare('SELECT id, alias, created_at FROM accounts WHERE alias = ? COLLATE NOCASE').bind(a).first();
  if (!row) throw new ApiError(404, 'not-found', 'No player has that name.');
  return row;
}
export function sampleTier(n) { return n === 0 ? 'none' : n < 5 ? 'small' : n < 20 ? 'fair' : 'solid'; }

export async function profile(env, who, alias, now) {
  const a = await accountByAlias(env, alias), id = a.id;
  const [sales, bought, swaps, rev, dist, buyers, active, followers, isFollowing, recent] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n, MAX(at) AS last FROM trades WHERE seller_id = ? AND kind <> 'swap'").bind(id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM trades WHERE buyer_id = ? AND kind <> 'swap'").bind(id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM trades WHERE kind = 'swap' AND (seller_id = ? OR buyer_id = ?)").bind(id, id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE seller_id = ? AND status = 'visible'").bind(id).first(),
    env.DB.prepare("SELECT rating, COUNT(*) AS n FROM reviews WHERE seller_id = ? AND status = 'visible' GROUP BY rating").bind(id).all(),
    env.DB.prepare("SELECT COUNT(DISTINCT buyer_id) AS n FROM reviews WHERE seller_id = ? AND status = 'visible'").bind(id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'active' AND ends_at > ?").bind(id, now).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM follows WHERE kind = 'seller' AND target = ?").bind(id).first(),
    env.DB.prepare("SELECT 1 AS x FROM follows WHERE account_id = ? AND kind = 'seller' AND target = ?").bind(who.accountId, id).first(),
    env.DB.prepare("SELECT r.*, b.alias AS buyer_alias FROM reviews r JOIN accounts b ON b.id = r.buyer_id WHERE r.seller_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC, r.id DESC LIMIT 11").bind(id).all()
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.results.forEach((r) => { distribution[r.rating] = r.n; });
  const n = rev.n;
  return {
    alias: a.alias, isYou: id === who.accountId, isFollowing: !!isFollowing, followers: followers.n,
    // the month, not the day: enough to say "new" or "long-standing", too coarse to be a fingerprint
    memberSince: Date.UTC(new Date(a.created_at).getUTCFullYear(), new Date(a.created_at).getUTCMonth(), 1),
    activity: { sales: sales.n, purchases: bought.n, swaps: swaps.n, activeListings: active.n },
    reputation: { reviews: n, average: n ? Math.round(rev.avg * 10) / 10 : null, distribution, distinctBuyers: buyers.n, sample: sampleTier(n),
      note: n ? 'Rated ' + (Math.round(rev.avg * 10) / 10) + ' out of 5 from ' + n + ' review' + (n === 1 ? '' : 's') + ' by ' + buyers.n + ' buyer' + (buyers.n === 1 ? '' : 's') + '.' : 'No reviews yet. Reviews come only from completed trades.' },
    reviews: recent.results.slice(0, 10).map((r) => reviewView(r, who.accountId)),
    reviewsCursor: recent.results.length > 10 ? cursorOf(recent.results[9].created_at, recent.results[9].id) : null, serverNow: now
  };
}

export async function profileReviews(env, who, alias, url, now) {
  const a = await accountByAlias(env, alias), p = url.searchParams, limit = limitOf(p.get('limit'), 10, 50), cur = parseCursor(p.get('cursor'));
  const where = ["r.seller_id = ?", "r.status = 'visible'"], binds = [a.id];
  if (cur) { where.push('(r.created_at < ? OR (r.created_at = ? AND r.id < ?))'); binds.push(cur[0], cur[0], cur[1]); }
  const rows = (await env.DB.prepare('SELECT r.*, b.alias AS buyer_alias FROM reviews r JOIN accounts b ON b.id = r.buyer_id WHERE ' + where.join(' AND ') + ' ORDER BY r.created_at DESC, r.id DESC LIMIT ' + (limit + 1)).bind(...binds).all()).results;
  const page = rows.slice(0, limit), last = page[page.length - 1];
  return { items: page.map((r) => reviewView(r, who.accountId)), nextCursor: rows.length > limit && last ? cursorOf(last.created_at, last.id) : null, serverNow: now };
}

// ---- follows ----------------------------------------------------------------------------------------------------------------------
export async function listFollows(env, who) {
  const rows = (await env.DB.prepare("SELECT f.kind, f.target, f.created_at, a.alias FROM follows f LEFT JOIN accounts a ON f.kind = 'seller' AND a.id = f.target WHERE f.account_id = ? ORDER BY f.created_at DESC").bind(who.accountId).all()).results;
  return { sellers: rows.filter((r) => r.kind === 'seller' && r.alias).map((r) => ({ alias: r.alias, since: r.created_at })), cards: rows.filter((r) => r.kind === 'card').map((r) => ({ cardId: r.target, since: r.created_at })), max: SOCIAL.follow.max };
}
export async function follow(env, who, body, now, on) {
  const kind = body.kind === 'card' ? 'card' : 'seller';
  let target;
  if (kind === 'seller') {
    const a = await accountByAlias(env, body.alias);
    if (a.id === who.accountId) throw new ApiError(409, 'own', 'You cannot follow yourself.');
    target = a.id;
  } else {
    const { isCard } = await import('./economy.js');
    if (!isCard(body.cardId)) throw new ApiError(404, 'not-found', 'That card is not in the catalog.');
    target = body.cardId;
  }
  if (on) {
    const r = await env.DB.prepare('INSERT INTO follows (account_id, kind, target, created_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM follows WHERE account_id = ?) < ? ON CONFLICT(account_id, kind, target) DO NOTHING')
      .bind(who.accountId, kind, target, now, who.accountId, SOCIAL.follow.max).run();
    if (!r.meta.changes) {
      const exists = await env.DB.prepare('SELECT 1 AS x FROM follows WHERE account_id = ? AND kind = ? AND target = ?').bind(who.accountId, kind, target).first();
      if (!exists) throw new ApiError(409, 'limit', 'You can follow up to ' + SOCIAL.follow.max + ' sellers and cards.');
    }
  } else {
    await env.DB.prepare('DELETE FROM follows WHERE account_id = ? AND kind = ? AND target = ?').bind(who.accountId, kind, target).run();
  }
  return { ok: true, following: !!on, kind };
}

// Tells the followers of a seller or a card about a new listing: one notification each, for followers who have not
// switched it off. One statement, so the cost does not grow with the number of followers.
export async function notifyFollowers(env, listingId, now) {
  const L = await env.DB.prepare("SELECT id, seller_id, card_id FROM listings WHERE id = ? AND status = 'active'").bind(listingId).first();
  if (!L) return 0;
  const alias = await env.DB.prepare('SELECT alias FROM accounts WHERE id = ?').bind(L.seller_id).first();
  const { nameOf } = await import('./economy.js');
  const r = await env.DB.prepare("INSERT INTO notifications (account_id, at, kind, body, ref) " +
    "SELECT f.account_id, ?, 'follow', ?, ? FROM (SELECT DISTINCT account_id FROM follows WHERE (kind = 'seller' AND target = ?) OR (kind = 'card' AND target = ?) LIMIT 200) f " +
    "WHERE f.account_id <> ? AND COALESCE((SELECT json_extract(value, '$.notifyFollows') FROM settings WHERE account_id = f.account_id), 1) <> 0")
    .bind(now, ((alias && alias.alias) || 'A seller') + ' listed ' + nameOf(L.card_id) + '.', L.id, L.seller_id, L.card_id, L.seller_id).run();
  return r.meta ? r.meta.changes : 0;
}

// ---- the community feed ---------------------------------------------------------------------------------------------------------------
export async function feed(env, who, url, now) {
  const p = url.searchParams, limit = limitOf(p.get('limit'), 20, 50), cur = parseCursor(p.get('cursor')), following = p.get('scope') === 'following';
  const where = ["l.status IN ('active', 'sold')", "(l.status = 'sold' OR l.ends_at > ?)"], binds = [now];
  if (following) {
    where.push("(l.seller_id IN (SELECT target FROM follows WHERE account_id = ? AND kind = 'seller') OR l.card_id IN (SELECT target FROM follows WHERE account_id = ? AND kind = 'card'))");
    binds.push(who.accountId, who.accountId);
  }
  if (cur) { where.push('(l.feed_at < ? OR (l.feed_at = ? AND l.id < ?))'); binds.push(Number(cur[0]), Number(cur[0]), cur[1]); }
  const rows = (await env.DB.prepare(LISTING_SQL + 'WHERE ' + where.join(' AND ') + ' ORDER BY l.feed_at DESC, l.id DESC LIMIT ' + (limit + 1)).bind(who.accountId, ...binds).all()).results;
  const page = rows.slice(0, limit), items = await withValuations(env, page, who.accountId, now), last = page[page.length - 1];
  return { items: items.map((it, n) => Object.assign(it, { event: page[n].status === 'sold' ? 'sold' : 'listed', eventAt: page[n].feed_at })),
    nextCursor: rows.length > limit && last ? cursorOf(last.feed_at, last.id) : null, scope: following ? 'following' : 'all', serverNow: now };
}
