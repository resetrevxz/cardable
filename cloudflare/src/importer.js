// One-time beta conversion of an offline collection into online-owned copies.
//
// What this is, and is not: a convenience for beta testers. The offline save is a local file the player can edit, so
// this does NOT prove a card was ever legitimately opened, and it does not try to. It validates the package's shape
// and plausibility (known cards and finishes, serial grammar, counts bounded by the number of openings), enforces one
// claim per account and per package and one owner per serial, and makes the commit atomic. The client never deletes
// or changes the offline originals: the online realm receives separately owned copies.
import { CATALOG } from './catalog.js';
import { ApiError, hmac, randomId, secretOrThrow, sha256 } from './util.js';
import { gateCall, rateLimit } from './auth.js';

const SERIAL = /^CBL-([2-9A-HJ-NP-Z]{4})-(\d{6})$/;
const SIMPLE_ID = /^[A-Za-z0-9_-]{4,64}$/;
const CODE = /^[2-9A-HJ-NP-Z]{4}$/;
const MIN_TIME = Date.UTC(2024, 0, 1);

export async function normalizePackage(env, pkg) {
  if (!pkg || typeof pkg !== 'object' || pkg.v !== 1 || pkg.app !== 'cardable') throw new ApiError(400, 'bad-package', 'That is not a Cardable collection package.');
  const cap = Number(env.BETA_IMPORT_CAP || 3000);
  if (!Array.isArray(pkg.items) || pkg.items.length === 0) throw new ApiError(400, 'empty-package', 'There are no cards to import.');
  if (pkg.items.length > cap) throw new ApiError(413, 'too-many', 'The beta imports at most ' + cap + ' cards.');
  if (typeof pkg.originCode !== 'string' || !CODE.test(pkg.originCode)) throw new ApiError(400, 'bad-package', 'The collection has no valid player code.');
  const opened = Number(pkg.packsOpened);
  if (!Number.isSafeInteger(opened) || opened < 0 || opened > 5_000_000) throw new ApiError(400, 'bad-package', 'The opening count is not valid.');
  // The opening count is self-reported by the package, so this is a consistency check against honest damage and typos,
  // not protection against a forged file. The real limits are the beta cap, one import per account, per package and per
  // origin code, one owner per serial, and the Quick Sell quotas that apply to imported cards.
  if (pkg.items.length > opened + 25) throw new ApiError(422, 'implausible-count', 'The collection holds far more cards than packs opened, so it cannot be imported.');
  const now = Date.now(), seenSerial = new Set(), seenId = new Set(), accepted = [], rejected = [];
  for (const raw of pkg.items) {
    const it = raw && typeof raw === 'object' ? raw : {};
    const serial = typeof it.serial === 'string' ? it.serial : '';
    const reasonFor = () => {
      if (!SIMPLE_ID.test(String(it.instanceId || ''))) return 'bad-id';
      const m = SERIAL.exec(serial);
      if (!m) return 'bad-serial';
      if (m[1] !== pkg.originCode) return 'serial-code-mismatch';
      if (!Object.prototype.hasOwnProperty.call(CATALOG.cards, it.cardId)) return 'unknown-card';
      if (it.variantId != null && !CATALOG.variants.includes(it.variantId)) return 'bad-finish';
      if (it.cardSkinId != null && !CATALOG.skins.includes(it.cardSkinId)) return 'bad-skin';
      if (it.packId != null && !/^[a-z0-9-]{2,40}$/.test(String(it.packId))) return 'bad-pack';
      if (it.pulledAt != null && !(Number.isFinite(it.pulledAt) && it.pulledAt >= MIN_TIME && it.pulledAt <= now + 86400000)) return 'bad-time';
      return null;
    };
    const why = reasonFor();
    if (why) { rejected.push({ serial: serial.slice(0, 20), reason: why }); continue; }
    if (seenSerial.has(serial) || seenId.has(it.instanceId)) throw new ApiError(422, 'duplicate-in-package', 'The package lists the same card twice, so it looks damaged.');
    seenSerial.add(serial); seenId.add(it.instanceId);
    accepted.push({ serial, cardId: it.cardId, variantId: it.variantId || null, skinId: it.cardSkinId || null, packId: it.packId || null, pulledAt: it.pulledAt == null ? null : Math.floor(it.pulledAt) });
  }
  accepted.sort((a, b) => (a.serial < b.serial ? -1 : 1));
  const hash = await sha256('package|' + pkg.originCode + '|' + accepted.map((i) => [i.serial, i.cardId, i.variantId || '', i.skinId || ''].join(':')).join(','));
  return { originCode: pkg.originCode, accepted, rejected, hash, opened };
}

async function claimedSerials(env, serials) {
  const taken = new Set();
  for (let i = 0; i < serials.length; i += 80) {
    const chunk = serials.slice(i, i + 80);
    const rows = await env.DB.prepare('SELECT serial FROM instances WHERE serial IN (' + chunk.map(() => '?').join(',') + ')').bind(...chunk).all();
    rows.results.forEach((r) => taken.add(r.serial));
  }
  return taken;
}

export async function preview(env, who, body) {
  await rateLimit(env, who.accountId, 'import-preview', 12, 3600);
  const account = await env.DB.prepare('SELECT imported FROM accounts WHERE id = ?').bind(who.accountId).first();
  if (account.imported) throw new ApiError(409, 'already-imported', 'This account has already imported its collection.');
  const pkg = await normalizePackage(env, body.package);
  const claimedPackage = await env.DB.prepare('SELECT account_id FROM imports WHERE package_hash = ?').bind(pkg.hash).first();
  if (claimedPackage) throw new ApiError(409, 'package-claimed', 'This collection has already been imported by an account.');
  // One account per origin code: a save has one player code, so a second account cannot import cards claiming it.
  const claimedOrigin = await env.DB.prepare('SELECT account_id FROM imports WHERE origin_code = ?').bind(pkg.originCode).first();
  if (claimedOrigin) throw new ApiError(409, 'origin-claimed', 'Another account has already imported cards from this save.');
  const taken = await claimedSerials(env, pkg.accepted.map((i) => i.serial));
  const accepted = [], rejected = pkg.rejected.slice();
  for (const it of pkg.accepted) { if (taken.has(it.serial)) rejected.push({ serial: it.serial, reason: 'serial-already-claimed' }); else accepted.push(it); }
  if (!accepted.length) throw new ApiError(422, 'nothing-eligible', 'None of these cards can be imported.', { rejected: rejected.slice(0, 50) });
  const now = Date.now(), id = randomId('prv', 12);
  const summary = { accepted: accepted.length, rejected: rejected.length, originCode: pkg.originCode, packageHash: pkg.hash, catalog: CATALOG.hash };
  await env.DB.batch([
    env.DB.prepare('DELETE FROM import_previews WHERE account_id = ?').bind(who.accountId),
    env.DB.prepare('INSERT INTO import_previews (id, account_id, package_hash, summary, items, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, who.accountId, pkg.hash, JSON.stringify(summary), JSON.stringify({ accepted, rejected }), now, now + 15 * 60000)
  ]);
  return { previewId: id, expiresAt: now + 15 * 60000, summary, items: accepted, rejected: rejected.slice(0, 200), truncatedRejected: Math.max(0, rejected.length - 200) };
}

export async function commit(env, who, body, idemKey) {
  if (typeof body.previewId !== 'string') throw new ApiError(400, 'bad-request', 'A preview is needed first.');
  const key = typeof idemKey === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(idemKey) ? idemKey : null;
  if (!key) throw new ApiError(400, 'idempotency-key-required', 'An Idempotency-Key header of 8 to 80 characters is required.');
  await rateLimit(env, who.accountId, 'import-commit', 6, 3600);
  // A replay of the same key returns the first receipt, never a second import.
  const replay = await env.DB.prepare('SELECT id, package_hash, item_count, rejected, created_at, receipt_sig FROM imports WHERE account_id = ? AND idem = ?').bind(who.accountId, key).first();
  if (replay) return receiptOf(env, who, replay, true);
  const lock = await gateCall(env, who.accountId, '/lock', { name: 'import', ttlMs: 20000 });
  if (!lock.ok) throw new ApiError(409, 'busy', 'An import is already running for this account.');
  try {
    const row = await env.DB.prepare('SELECT items, summary, package_hash, expires_at FROM import_previews WHERE id = ? AND account_id = ?').bind(body.previewId, who.accountId).first();
    if (!row) throw new ApiError(404, 'preview-not-found', 'That preview is not available. Preview again.');
    if (row.expires_at < Date.now()) throw new ApiError(410, 'preview-expired', 'That preview expired. Preview again.');
    const { accepted, rejected } = JSON.parse(row.items);
    const now = Date.now(), importId = randomId('imp', 12);
    const sig = await hmac(secretOrThrow(env), ['import', importId, who.accountId, row.package_hash, accepted.length, now].join('|'));
    const origin = JSON.parse(row.summary).originCode;
    const statements = [
      env.DB.prepare('INSERT INTO imports (id, account_id, package_hash, origin_code, item_count, rejected, created_at, receipt_sig, idem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(importId, who.accountId, row.package_hash, origin, accepted.length, rejected.length, now, sig, key)
    ];
    for (let i = 0; i < accepted.length; i += 400) {
      const chunk = accepted.slice(i, i + 400).map((it, n) => ({ id: importId + '-' + (i + n), card: it.cardId, v: it.variantId, k: it.skinId, s: it.serial, p: it.packId, t: it.pulledAt }));
      statements.push(env.DB.prepare(
        'INSERT INTO instances (id, owner_id, card_id, variant_id, skin_id, serial, origin_code, pack_id, pulled_at, source, created_at) ' +
        "SELECT json_extract(value, '$.id'), ?1, json_extract(value, '$.card'), json_extract(value, '$.v'), json_extract(value, '$.k'), json_extract(value, '$.s'), ?2, " +
        "json_extract(value, '$.p'), json_extract(value, '$.t'), 'legacy-import', ?3 FROM json_each(?4)").bind(who.accountId, origin, now, JSON.stringify(chunk)));
    }
    if (env.ENVIRONMENT === 'test' && env.TEST_FAULT === 'import-late') {
      statements.push(env.DB.prepare('INSERT INTO wallets (account_id) VALUES (?)').bind(who.accountId)); // violates the primary key: the whole batch rolls back
    }
    statements.push(env.DB.prepare('UPDATE accounts SET imported = 1 WHERE id = ? AND imported = 0').bind(who.accountId));
    statements.push(env.DB.prepare('DELETE FROM import_previews WHERE account_id = ?').bind(who.accountId));
    try { await env.DB.batch(statements); }
    catch (error) {
      const text = String(error && error.message);
      if (/imports\.account_id/.test(text)) {
        // The same request raced with itself: the first one won, so answer with its receipt.
        const first = await env.DB.prepare('SELECT id, package_hash, item_count, rejected, created_at, receipt_sig FROM imports WHERE account_id = ? AND idem = ?').bind(who.accountId, key).first();
        if (first) return receiptOf(env, who, first, true);
        throw new ApiError(409, 'already-imported', 'This account has already imported its collection.');
      }
      if (/imports\.package_hash/.test(text)) throw new ApiError(409, 'package-claimed', 'This collection has already been imported by an account.');
      if (/imports\.origin_code/.test(text)) throw new ApiError(409, 'origin-claimed', 'Another account has already imported cards from this save.');
      if (/instances\.serial/.test(text)) throw new ApiError(409, 'serial-already-claimed', 'Some of these cards were claimed in the meantime. Preview again.');
      if (/imports\.idem/.test(text)) { const again = await env.DB.prepare('SELECT id, package_hash, item_count, rejected, created_at, receipt_sig FROM imports WHERE account_id = ? AND idem = ?').bind(who.accountId, key).first(); if (again) return receiptOf(env, who, again, true); }
      throw new ApiError(500, 'import-failed', 'The import did not complete. Nothing was changed; try again.');
    }
    return receiptOf(env, who, { id: importId, package_hash: row.package_hash, item_count: accepted.length, rejected: rejected.length, created_at: now, receipt_sig: sig }, false);
  } finally {
    await gateCall(env, who.accountId, '/unlock', { name: 'import' });
  }
}

export function receiptOf(env, who, row, replayed) {
  return { receipt: { id: row.id, alias: who.alias, importedAt: row.created_at, count: row.item_count, rejected: row.rejected, packageHash: row.package_hash, signature: row.receipt_sig, catalog: CATALOG.hash }, replayed: !!replayed };
}
export async function existingReceipt(env, who) {
  const row = await env.DB.prepare('SELECT id, package_hash, item_count, rejected, created_at, receipt_sig FROM imports WHERE account_id = ?').bind(who.accountId).first();
  return row ? receiptOf(env, who, row, true) : null;
}
