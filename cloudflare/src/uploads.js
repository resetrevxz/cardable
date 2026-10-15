// Player-uploaded pictures for listings.
//
// A picture is three validated variants (thumb, card, full) in the private R2 bucket. The player's game decodes,
// crops and resizes locally; the server never trusts that. It re-checks every byte it stores (see media.js), strips what
// cannot be allowed, enforces size, count and storage budgets, and decides who may read which object.
//
//   POST   /v1/uploads                       create an upload slot (short-lived authorisation)
//   PUT    /v1/uploads/:id/:variant          store one variant (raw bytes; the type is checked against the bytes)
//   GET    /v1/uploads                       the player's own pictures and their storage use
//   DELETE /v1/uploads/:id                   remove a picture (not while its listing is open)
//   GET    /v1/media/:id/:variant            read a variant: its owner at any time, everyone once it is on a listing
//
// R2 object keys are made here and only here: `u/<upload id>/<variant>-<nonce>`. No request can name a key, list the
// bucket or reach an object that no upload row points at.
import { ApiError, cleanText, readBytes } from './util.js';
import { Tx, mutate, newId, system } from './ops.js';
import { VARIANTS, VARIANT_NAMES, inspectImage, sameShape } from './media.js';

const DAY = 86_400_000;
export const MEDIA = {
  maxStored: 12,            // pictures a player may hold (pending, ready or attached)
  maxBytes: 12_000_000,     // storage a player may hold across them
  createPerDay: 20,         // new upload slots per rolling 24 hours: bounds R2 writes
  maxPending: 3,            // slots open at once
  perListing: 3,            // pictures on one listing (the first is the cover)
  pendingTtlMs: 15 * 60_000, // how long a slot accepts variants
  readyTtlMs: DAY,          // how long a finished, unattached picture waits to be used
  keepSoldMs: 30 * DAY,     // a sold listing keeps its pictures this long
  keepUnsoldMs: 14 * DAY    // an ended or withdrawn one keeps them this long (so it can be listed again)
};
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

// The beta limits, tunable by the operator in the test environment only (so the quotas can be exercised cheaply).
export function mediaLimits(env) {
  const t = env.ENVIRONMENT === 'test', n = (v, d) => (t && Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return Object.assign({}, MEDIA, { maxStored: n(env.MEDIA_MAX_STORED, MEDIA.maxStored), maxBytes: n(env.MEDIA_MAX_BYTES, MEDIA.maxBytes), createPerDay: n(env.MEDIA_CREATE_PER_DAY, MEDIA.createPerDay) });
}

// ---- shapes a request may carry --------------------------------------------------------------------------------------
export const LAYOUTS = { banner: 16 / 9, square: 1, portrait: 4 / 5 };
export const TREATMENTS = ['none', 'frame', 'spotlight'];

// body.images: [{ uploadId, alt? }], body.cover: { layout, zoom, x, y }, body.treatment. Anything else is refused.
export function parseMedia(body, what) {
  const out = { images: null, cover: undefined, treatment: undefined };
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length > MEDIA.perListing) throw new ApiError(422, 'images', 'A listing can show up to ' + MEDIA.perListing + ' pictures.');
    const seen = new Set();
    out.images = body.images.map((i) => {
      if (!i || typeof i !== 'object' || typeof i.uploadId !== 'string' || !/^upl_[A-Za-z0-9_-]{6,40}$/.test(i.uploadId)) throw new ApiError(422, 'images', 'Pictures come from your uploads. Links to other places are not accepted.');
      if (Object.keys(i).some((k) => k !== 'uploadId' && k !== 'alt')) throw new ApiError(422, 'images', 'A picture is an upload and its description, nothing else.');
      if (seen.has(i.uploadId)) throw new ApiError(422, 'images', 'The same picture is listed twice.');
      seen.add(i.uploadId);
      return { uploadId: i.uploadId, alt: i.alt == null ? '' : cleanText(i.alt, 140, 'picture description') };
    });
  }
  if (body.cover !== undefined) {
    const c = body.cover;
    if (c === null) out.cover = null;
    else {
      if (!c || typeof c !== 'object' || !own(LAYOUTS, c.layout)) throw new ApiError(422, 'cover', 'Choose a cover layout: banner, square or portrait.');
      const f = (v, lo, hi, d) => (v == null ? d : (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : NaN));
      const zoom = f(c.zoom, 1, 4, 1), x = f(c.x, 0, 100, 50), y = f(c.y, 0, 100, 50);
      if ([zoom, x, y].some((v) => Number.isNaN(v))) throw new ApiError(422, 'cover', 'The crop is out of range.');
      out.cover = { layout: c.layout, zoom: Math.round(zoom * 100) / 100, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }
  }
  if (body.treatment !== undefined) {
    if (typeof body.treatment !== 'string' || !TREATMENTS.includes(body.treatment)) throw new ApiError(422, 'treatment', 'Choose none, frame or spotlight.');
    out.treatment = body.treatment;
  }
  void what;
  return out;
}

// ---- who may use which picture, and the statements that attach them ----------------------------------------------------
const ph = (n) => new Array(n).fill('?').join(',');

// Reads the player's uploads named by a request and returns the listing's `images` value. A picture must be the
// player's own and finished (or already on one of their closed listings, for listing again). The attach statements
// below re-check all of it inside the transaction.
export async function resolveImages(env, who, requested) {
  if (!requested.length) return [];
  const ids = requested.map((r) => r.uploadId);
  const rows = (await env.DB.prepare('SELECT u.id, u.status, u.account_id, u.listing_id, v.width, v.height FROM uploads u LEFT JOIN upload_variants v ON v.upload_id = u.id AND v.variant = ? WHERE u.id IN (' + ph(ids.length) + ')')
    .bind('card', ...ids).all()).results;
  return requested.map((r, n) => {
    const row = rows.find((x) => x.id === r.uploadId);
    if (!row || row.account_id !== who.accountId) throw new ApiError(404, 'upload-not-found', 'One of those pictures could not be found among your uploads.');
    if (row.status !== 'ready' && row.status !== 'attached') throw new ApiError(409, 'upload-not-ready', 'One of those pictures is not finished or is no longer available. Upload it again.');
    return { u: row.id, alt: r.alt, w: row.width, h: row.height, p: n };
  });
}

// Adds the statements that attach `images` to `listingId`, with guards that fail the whole transaction if any picture
// stopped being usable between the read and the write.
export function attachStatements(tx, listingId, who, images, now, limits) {
  if (!images.length) return;
  const ids = images.map((i) => i.u);
  tx.guard('media', "(SELECT COUNT(*) FROM uploads WHERE id IN (" + ph(ids.length) + ") AND account_id = ? AND (status = 'ready' OR (status = 'attached' AND (listing_id = ? OR listing_id IN (SELECT id FROM listings WHERE seller_id = ? AND status <> 'active'))))) = ?",
    ...ids, who.accountId, listingId, who.accountId, ids.length);
  images.forEach((img, n) => {
    tx.add("UPDATE uploads SET status = 'attached', listing_id = ?, position = ?, alt = ?, expires_at = ? WHERE id = ? AND account_id = ?", listingId, n, img.alt || '', now + limits.keepUnsoldMs, img.u, who.accountId);
  });
}
export const imagesJson = (images) => JSON.stringify(images.map((i) => ({ u: i.u, alt: i.alt || '', w: i.w, h: i.h })));

// ---- slots -------------------------------------------------------------------------------------------------------------
export async function createUpload(env, who, key, body, now) {
  const source = body.source === 'director' ? 'director' : 'file';
  const limits = mediaLimits(env);
  const acct = await env.DB.prepare('SELECT uploads_blocked FROM accounts WHERE id = ?').bind(who.accountId).first();
  if (acct && acct.uploads_blocked) throw new ApiError(403, 'uploads-blocked', 'Picture uploads are switched off for your account. Contact the operator through the usual channel.');
  return mutate(env, who, key, { op: 'upload-create', source }, now, async () => {
    const stored = (await env.DB.prepare("SELECT COUNT(*) AS n FROM uploads WHERE account_id = ? AND status IN ('pending', 'ready', 'attached')").bind(who.accountId).first()).n;
    if (stored >= limits.maxStored) throw new ApiError(409, 'limit', 'You can keep ' + limits.maxStored + ' pictures. Remove one you are not using first.', { limit: limits.maxStored });
    const pending = (await env.DB.prepare("SELECT COUNT(*) AS n FROM uploads WHERE account_id = ? AND status = 'pending' AND expires_at > ?").bind(who.accountId, now).first()).n;
    if (pending >= limits.maxPending) throw new ApiError(409, 'limit', 'Finish or cancel an upload in progress first.', { limit: limits.maxPending });
    const recent = (await env.DB.prepare('SELECT COUNT(*) AS n FROM uploads WHERE account_id = ? AND created_at > ?').bind(who.accountId, now - DAY).first()).n;
    if (recent >= limits.createPerDay) throw new ApiError(429, 'quota', 'You have started ' + limits.createPerDay + ' uploads in the last day. Try again later.', { limit: limits.createPerDay });
    const id = newId('upl'), tx = new Tx(env, now);
    tx.guard('limit_hit', "(SELECT COUNT(*) FROM uploads WHERE account_id = ? AND status IN ('pending', 'ready', 'attached')) < ?", who.accountId, limits.maxStored);
    tx.guard('quota', '(SELECT COUNT(*) FROM uploads WHERE account_id = ? AND created_at > ?) < ?', who.accountId, now - DAY, limits.createPerDay);
    tx.add("INSERT INTO uploads (id, account_id, status, source, created_at, expires_at) VALUES (?, ?, 'pending', ?, ?, ?)", id, who.accountId, source, now, now + limits.pendingTtlMs);
    return { tx, result: { ok: true, uploadId: id, expiresAt: now + limits.pendingTtlMs, variants: VARIANTS, limits: { maxStored: limits.maxStored, maxBytes: limits.maxBytes, perListing: limits.perListing } } };
  });
}

// Deletes every object an upload ever had in R2 (one prefix, so a lost race leaves nothing behind). Best effort: the
// row has already stopped pointing at anything, so a failure here only costs storage until the sweep tries again.
export async function purgeObjects(env, uploadId) {
  if (!env.MEDIA) return 0;
  let removed = 0;
  try {
    for (;;) {
      const list = await env.MEDIA.list({ prefix: 'u/' + uploadId + '/', limit: 100 });
      if (!list.objects.length) break;
      await env.MEDIA.delete(list.objects.map((o) => o.key));
      removed += list.objects.length;
      if (!list.truncated) break;
    }
  } catch (_) { /* tried again by the sweep */ }
  return removed;
}

export async function putVariant(env, who, uploadId, variant, request, now) {
  if (!own(VARIANTS, variant)) throw new ApiError(404, 'no-such-variant', 'Choose thumb, card or full.');
  if (!/^upl_[A-Za-z0-9_-]{6,40}$/.test(uploadId)) throw new ApiError(404, 'not-found', 'That upload could not be found.');
  if (!env.MEDIA) throw new ApiError(503, 'media-unavailable', 'Picture storage is not available.');
  const limits = mediaLimits(env);
  const U = await env.DB.prepare('SELECT id, status, expires_at FROM uploads WHERE id = ? AND account_id = ?').bind(uploadId, who.accountId).first();
  if (!U) throw new ApiError(404, 'not-found', 'That upload could not be found.');
  if (U.status !== 'pending') throw new ApiError(409, 'not-pending', U.status === 'ready' || U.status === 'attached' ? 'This picture is already finished. Start a new upload to change it.' : 'This upload is no longer open.');
  if (now >= U.expires_at) throw new ApiError(410, 'expired', 'This upload ran out of time. Start a new one.');
  const raw = await readBytes(request, VARIANTS[variant].maxBytes + 1);
  const img = inspectImage(raw, request.headers.get('content-type'), variant);
  // every variant must be the same picture
  const others = (await env.DB.prepare('SELECT variant, width, height FROM upload_variants WHERE upload_id = ? AND variant <> ?').bind(uploadId, variant).all()).results;
  if (others.some((o) => !sameShape(o, img))) throw new ApiError(422, 'shape-mismatch', 'The three sizes must show the same crop of the same picture.');
  // the player's storage, with this variant's old bytes (if any) taken out
  const used = (await env.DB.prepare("SELECT COALESCE(SUM(v.bytes), 0) AS n FROM upload_variants v JOIN uploads u ON u.id = v.upload_id WHERE u.account_id = ? AND u.status IN ('pending', 'ready', 'attached') AND NOT (v.upload_id = ? AND v.variant = ?)").bind(who.accountId, uploadId, variant).first()).n;
  if (used + img.bytes.length > limits.maxBytes) throw new ApiError(409, 'storage-full', 'This would take you over your ' + Math.round(limits.maxBytes / 1_000_000) + ' MB of picture storage. Remove a picture first.', { used, limit: limits.maxBytes });
  const objectKey = 'u/' + uploadId + '/' + variant + '-' + newId('n', 6);
  await env.MEDIA.put(objectKey, img.bytes, { httpMetadata: { contentType: img.type } });
  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare("INSERT INTO _guard (stale) SELECT NULL WHERE NOT EXISTS (SELECT 1 FROM uploads WHERE id = ? AND status = 'pending' AND expires_at > ?)").bind(uploadId, now),
      // two uploads at once cannot both slip under the storage cap: it is checked again here, where they are serialised
      env.DB.prepare("INSERT INTO _guard (quota) SELECT NULL WHERE NOT ((SELECT COALESCE(SUM(v.bytes), 0) FROM upload_variants v JOIN uploads u ON u.id = v.upload_id WHERE u.account_id = ? AND u.status IN ('pending', 'ready', 'attached') AND NOT (v.upload_id = ? AND v.variant = ?)) + ? <= ?)")
        .bind(who.accountId, uploadId, variant, img.bytes.length, limits.maxBytes),
      env.DB.prepare('SELECT object_key FROM upload_variants WHERE upload_id = ? AND variant = ?').bind(uploadId, variant),
      env.DB.prepare('INSERT INTO upload_variants (upload_id, variant, object_key, type, width, height, bytes, stripped, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(upload_id, variant) DO UPDATE SET object_key = excluded.object_key, type = excluded.type, width = excluded.width, height = excluded.height, bytes = excluded.bytes, stripped = excluded.stripped, created_at = excluded.created_at')
        .bind(uploadId, variant, objectKey, img.type, img.width, img.height, img.bytes.length, img.stripped ? 1 : 0, now),
      env.DB.prepare("UPDATE uploads SET status = 'ready', expires_at = ? WHERE id = ? AND status = 'pending' AND (SELECT COUNT(*) FROM upload_variants WHERE upload_id = ?) = ?")
        .bind(now + limits.readyTtlMs, uploadId, uploadId, VARIANT_NAMES.length)
    ]);
  } catch (error) {
    try { await env.MEDIA.delete(objectKey); } catch (_) { /* the sweep removes it */ }
    if (/_guard\.stale/.test(String(error && error.message))) throw new ApiError(409, 'not-pending', 'This upload is no longer open.');
    if (/_guard\.quota/.test(String(error && error.message))) throw new ApiError(409, 'storage-full', 'This would take you over your picture storage. Remove a picture first.');
    throw error;
  }
  const previous = results[1].results[0];
  if (previous && previous.object_key && previous.object_key !== objectKey) { try { await env.MEDIA.delete(previous.object_key); } catch (_) { /* the sweep removes it */ } }
  const have = (await env.DB.prepare('SELECT variant FROM upload_variants WHERE upload_id = ?').bind(uploadId).all()).results.map((r) => r.variant);
  const state = await env.DB.prepare('SELECT status FROM uploads WHERE id = ?').bind(uploadId).first();
  return { ok: true, uploadId, variant, bytes: img.bytes.length, width: img.width, height: img.height, stripped: Object.keys(img.removed), have, ready: !!state && state.status === 'ready' };
}

// ---- reading ---------------------------------------------------------------------------------------------------------------
export async function listUploads(env, who, now) {
  const limits = mediaLimits(env);
  const rows = (await env.DB.prepare("SELECT u.id, u.status, u.source, u.created_at, u.expires_at, u.alt, u.listing_id, (SELECT SUM(bytes) FROM upload_variants v WHERE v.upload_id = u.id) AS bytes, " +
    "(SELECT width FROM upload_variants v WHERE v.upload_id = u.id AND v.variant = 'card') AS width, (SELECT height FROM upload_variants v WHERE v.upload_id = u.id AND v.variant = 'card') AS height, " +
    "l.status AS listing_status FROM uploads u LEFT JOIN listings l ON l.id = u.listing_id WHERE u.account_id = ? AND u.status IN ('pending', 'ready', 'attached') ORDER BY u.created_at DESC LIMIT 50").bind(who.accountId).all()).results;
  const used = rows.reduce((n, r) => n + (r.bytes || 0), 0);
  const day = (await env.DB.prepare('SELECT COUNT(*) AS n FROM uploads WHERE account_id = ? AND created_at > ?').bind(who.accountId, now - DAY).first()).n;
  return {
    items: rows.map((r) => ({ id: r.id, status: r.status, source: r.source, createdAt: r.created_at, expiresAt: r.expires_at, alt: r.alt, bytes: r.bytes || 0, width: r.width, height: r.height,
      listingId: r.listing_id, listingStatus: r.listing_status || null, expired: r.status !== 'attached' && now >= r.expires_at })),
    usage: { count: rows.length, bytes: used, maxCount: limits.maxStored, maxBytes: limits.maxBytes, startedToday: day, maxPerDay: limits.createPerDay }, variants: VARIANTS, perListing: limits.perListing, serverNow: now
  };
}

export async function deleteUpload(env, who, key, uploadId, now) {
  return mutate(env, who, key, { op: 'upload-delete', uploadId }, now, async () => {
    const U = await env.DB.prepare('SELECT u.id, u.status, u.listing_id, l.status AS listing_status FROM uploads u LEFT JOIN listings l ON l.id = u.listing_id WHERE u.id = ? AND u.account_id = ?').bind(uploadId, who.accountId).first();
    if (!U || U.status === 'removed' || U.status === 'expired') throw new ApiError(404, 'not-found', 'That picture could not be found.');
    if (U.status === 'attached' && U.listing_status === 'active') throw new ApiError(409, 'in-use', 'This picture is on an open listing. Change or withdraw the listing first.');
    const tx = new Tx(env, now);
    tx.guard('stale', "EXISTS (SELECT 1 FROM uploads WHERE id = ? AND account_id = ? AND status IN ('pending', 'ready', 'attached') AND (listing_id IS NULL OR listing_id NOT IN (SELECT id FROM listings WHERE status = 'active')))", uploadId, who.accountId);
    tx.add("UPDATE uploads SET status = 'removed', removed_at = ?, removed_by = 'owner', listing_id = listing_id WHERE id = ?", now, uploadId);
    if (U.listing_id) tx.add("UPDATE listings SET images = (SELECT COALESCE(json_group_array(json(value)), '[]') FROM json_each(listings.images) WHERE json_extract(value, '$.u') <> ?), cover = CASE WHEN json_extract(listings.images, '$[0].u') = ? THEN NULL ELSE cover END WHERE id = ?", uploadId, uploadId, U.listing_id);
    return { tx, result: { ok: true, uploadId } };
  }).then(async (res) => { if (!res.replayed) await purgeObjects(env, uploadId); return res; });
}

// Streams a variant, if this player may see it. The answer to "no such picture" and "not yours to see" is the same.
export async function serveMedia(env, who, uploadId, variant, request) {
  if (!own(VARIANTS, variant) || !/^upl_[A-Za-z0-9_-]{6,40}$/.test(uploadId) || !env.MEDIA) throw new ApiError(404, 'not-found', 'That picture could not be found.');
  const row = await env.DB.prepare('SELECT u.status, u.account_id, v.object_key, v.type, v.bytes FROM uploads u JOIN upload_variants v ON v.upload_id = u.id AND v.variant = ? WHERE u.id = ?').bind(variant, uploadId).first();
  const visible = row && ((row.account_id === who.accountId && ['pending', 'ready', 'attached'].includes(row.status)) || row.status === 'attached');
  if (!visible) throw new ApiError(404, 'not-found', 'That picture could not be found.');
  const obj = await env.MEDIA.get(row.object_key, { onlyIf: request.headers });
  if (!obj) throw new ApiError(404, 'not-found', 'That picture could not be found.');
  // A precondition that held (If-None-Match): the object has no body, and the answer is 304.
  const headers = { 'content-type': row.type, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox", 'referrer-policy': 'no-referrer',
    'cross-origin-resource-policy': 'cross-origin', 'content-disposition': 'inline', 'cache-control': 'private, max-age=300', etag: obj.httpEtag };
  if (!obj.body) return new Response(null, { status: 304, headers });
  headers['content-length'] = String(row.bytes);
  return new Response(obj.body, { status: 200, headers });
}

// ---- housekeeping (the cron sweep) ---------------------------------------------------------------------------------------------
// Open slots that ran out of time, finished pictures nobody used, and pictures of listings that ended long ago. What
// stops being referenced is taken out of public view first, then its objects are deleted.
export async function sweepMedia(env, now, cap) {
  const limits = mediaLimits(env), out = { expired: 0, retired: 0, objects: 0 };
  const stale = (await env.DB.prepare("SELECT id FROM uploads WHERE status IN ('pending', 'ready') AND expires_at <= ? ORDER BY expires_at LIMIT ?").bind(now, cap).all()).results;
  for (const r of stale) {
    const done = await env.DB.prepare("UPDATE uploads SET status = 'expired', removed_at = ?, removed_by = 'sweep' WHERE id = ? AND status IN ('pending', 'ready') AND expires_at <= ?").bind(now, r.id, now).run();
    if (done.meta && done.meta.changes) { out.expired++; out.objects += await purgeObjects(env, r.id); }
  }
  const old = (await env.DB.prepare("SELECT u.id, u.listing_id FROM uploads u JOIN listings l ON l.id = u.listing_id WHERE u.status = 'attached' AND l.status <> 'active' AND l.closed_at IS NOT NULL AND " +
    "((l.status = 'sold' AND l.closed_at <= ?) OR (l.status <> 'sold' AND l.closed_at <= ?)) LIMIT ?").bind(now - limits.keepSoldMs, now - limits.keepUnsoldMs, cap).all()).results;
  for (const r of old) {
    await env.DB.batch([
      env.DB.prepare("UPDATE uploads SET status = 'expired', removed_at = ?, removed_by = 'sweep' WHERE id = ? AND status = 'attached'").bind(now, r.id),
      env.DB.prepare("UPDATE listings SET images = '[]', cover = NULL WHERE id = ? AND status <> 'active'").bind(r.listing_id)
    ]);
    out.retired++; out.objects += await purgeObjects(env, r.id);
  }
  return out;
}

// What storage is in use, for the operator's accounting.
export async function mediaUsage(env) {
  const byStatus = (await env.DB.prepare('SELECT u.status, COUNT(DISTINCT u.id) AS pictures, COALESCE(SUM(v.bytes), 0) AS bytes FROM uploads u LEFT JOIN upload_variants v ON v.upload_id = u.id GROUP BY u.status').all()).results;
  const top = (await env.DB.prepare("SELECT a.alias, COUNT(DISTINCT u.id) AS pictures, COALESCE(SUM(v.bytes), 0) AS bytes FROM uploads u JOIN accounts a ON a.id = u.account_id LEFT JOIN upload_variants v ON v.upload_id = u.id WHERE u.status IN ('pending', 'ready', 'attached') GROUP BY u.account_id ORDER BY bytes DESC LIMIT 10").all()).results;
  const live = byStatus.filter((r) => ['pending', 'ready', 'attached'].includes(r.status));
  return { byStatus, topAccounts: top, live: { pictures: live.reduce((n, r) => n + r.pictures, 0), bytes: live.reduce((n, r) => n + r.bytes, 0) },
    note: 'R2: one Class A write per stored variant (three per picture), Class B reads per view with a 5 minute private browser cache and conditional requests; egress is free.' };
}
export { system };
