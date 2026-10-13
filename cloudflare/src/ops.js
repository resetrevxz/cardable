// The transaction layer. Every change to ownership or Credits is ONE D1 batch (one SQLite transaction) built from:
//   1. an idempotency record, so a retry returns the first answer and can never act twice;
//   2. guards, INSERTs that abort the whole batch and name the broken rule when a condition read earlier no longer holds;
//   3. the changes, ordered so every intermediate state satisfies the table's own CHECK constraints.
// Reads that a plan is built from are never trusted on their own: the guards re-check them inside the transaction, so a
// race or a retry can only fail whole (and be re-planned), never half-apply.
import { ApiError, randomId, sha256 } from './util.js';

const GUARD_ERRORS = {
  stale: [409, 'conflict', 'Something changed while you were acting, so nothing was done. Try again.'],
  funds: [409, 'funds', 'You do not have enough available Credits.'],
  closed: [409, 'closed', 'This is no longer open.'],
  not_owned: [409, 'not-owned', 'One of those cards is no longer yours to use.'],
  busy: [409, 'busy', 'That is being changed right now. Try again.'],
  price_changed: [409, 'price-changed', 'The price changed. Review the new price.'],
  limit_hit: [409, 'limit', 'You have reached a limit.'],
  own: [403, 'own', 'You cannot trade with your own listing.'],
  quota: [429, 'quota', 'A daily limit has been reached.'],
  conflict: [409, 'conflict', 'Something changed while you were acting, so nothing was done. Try again.'],
  media: [409, 'media-unavailable', 'One of the pictures cannot be used any more. Upload it again.'],
  duplicate: [409, 'duplicate', 'That has already been done.'],
  edit_closed: [409, 'edit-closed', 'That can no longer be changed.']
};
const MAX_ATTEMPTS = 5;

// The server's clock. In the test environment a request may carry `x-test-now` so a test can stand at an exact
// instant; the deployed Worker (ENVIRONMENT=beta) ignores the header.
export function nowOf(env, request) {
  if (env.ENVIRONMENT === 'test' && request) {
    const v = Number(request.headers.get('x-test-now'));
    if (Number.isSafeInteger(v) && v > 0) return v;
  }
  return Date.now();
}

export class Tx {
  constructor(env, now) { this.env = env; this.now = now; this.statements = []; }
  add(sql, ...binds) { this.statements.push(this.env.DB.prepare(sql).bind(...binds)); return this; }
  // Aborts the batch with `code` unless `cond` (a SQL boolean expression over the tables) is true.
  guard(code, cond, ...binds) { return this.add('INSERT INTO _guard (' + code + ') SELECT NULL WHERE NOT (' + cond + ')', ...binds); }

  // ---- Credits ----
  credit(accountId, amount, reason, ref) {
    if (!(amount > 0)) return this;
    this.add('UPDATE wallets SET balance = balance + ?, version = version + 1 WHERE account_id = ?', amount, accountId);
    return this.ledger(accountId, amount, reason, ref);
  }
  // Debits `price` and, in the same statement, lets go of `heldRelease` Credits of holds the caller released.
  debit(accountId, price, heldRelease, reason, ref) {
    this.add('UPDATE wallets SET balance = balance - ?, held = held - ?, version = version + 1 WHERE account_id = ?', price, heldRelease || 0, accountId);
    return this.ledger(accountId, -price, reason, ref);
  }
  ledger(accountId, delta, reason, ref) {
    if (!delta) return this;
    return this.add('INSERT INTO ledger (account_id, at, delta, reason, ref, balance_after) SELECT ?, ?, ?, ?, ?, balance FROM wallets WHERE account_id = ?', accountId, this.now, delta, reason, ref || null, accountId);
  }
  // ---- holds: Credits reserved for something open ----
  holdOpen(accountId, kind, ref, amount) {
    this.guard('funds', 'EXISTS (SELECT 1 FROM wallets WHERE account_id = ? AND balance - held >= ?)', accountId, amount);
    this.add('INSERT INTO holds (account_id, kind, ref, amount, created_at) VALUES (?, ?, ?, ?, ?)', accountId, kind, ref, amount, this.now);
    return this.add('UPDATE wallets SET held = held + ?, version = version + 1 WHERE account_id = ?', amount, accountId);
  }
  holdChange(accountId, kind, ref, oldAmount, newAmount) {
    if (newAmount === oldAmount) return this;
    if (newAmount > oldAmount) this.guard('funds', 'EXISTS (SELECT 1 FROM wallets WHERE account_id = ? AND balance - held >= ?)', accountId, newAmount - oldAmount);
    this.guard('stale', 'EXISTS (SELECT 1 FROM holds WHERE kind = ? AND ref = ? AND account_id = ? AND amount = ? AND released_at IS NULL)', kind, ref, accountId, oldAmount);
    this.add('UPDATE holds SET amount = ? WHERE kind = ? AND ref = ? AND account_id = ? AND released_at IS NULL', newAmount, kind, ref, accountId);
    return this.add('UPDATE wallets SET held = held + ?, version = version + 1 WHERE account_id = ?', newAmount - oldAmount, accountId);
  }
  // Closes a hold row and gives its Credits back to the available balance.
  holdClose(accountId, kind, ref, amount, outcome) {
    this.guard('stale', 'EXISTS (SELECT 1 FROM holds WHERE kind = ? AND ref = ? AND account_id = ? AND amount = ? AND released_at IS NULL)', kind, ref, accountId, amount);
    this.add('UPDATE holds SET released_at = ?, outcome = ? WHERE kind = ? AND ref = ? AND account_id = ? AND released_at IS NULL', this.now, outcome || 'released', kind, ref, accountId);
    return this.add('UPDATE wallets SET held = held - ?, version = version + 1 WHERE account_id = ?', amount, accountId);
  }
  // Closes a hold row whose Credits are being spent by the caller's own wallet statement (see debit's heldRelease).
  holdConsume(accountId, kind, ref, amount, outcome) {
    this.guard('stale', 'EXISTS (SELECT 1 FROM holds WHERE kind = ? AND ref = ? AND account_id = ? AND amount = ? AND released_at IS NULL)', kind, ref, accountId, amount);
    return this.add('UPDATE holds SET released_at = ?, outcome = ? WHERE kind = ? AND ref = ? AND account_id = ? AND released_at IS NULL', this.now, outcome || 'spent', kind, ref, accountId);
  }
  notify(accountId, kind, body, ref) {
    return this.add('INSERT INTO notifications (account_id, at, kind, body, ref) VALUES (?, ?, ?, ?, ?)', accountId, this.now, kind, String(body).slice(0, 240), ref || null);
  }
}

function guardOf(error) {
  const m = /_guard\.([a-z_]+)/.exec(String(error && error.message || error));
  return m ? m[1] : null;
}
function isWalletCheck(error) { return /CHECK constraint failed/.test(String(error && error.message)) && /balance|held/.test(String(error && error.message)); }

// Runs a planned mutation with idempotency and bounded retries.
//   plan(attempt) reads the current state, validates (throws ApiError for client mistakes) and returns { tx, result }.
export async function mutate(env, who, key, requestShape, now, plan) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw new ApiError(400, 'idempotency-key-required', 'An Idempotency-Key header of 8 to 80 characters is required.');
  const requestHash = await sha256(JSON.stringify(requestShape));
  const stored = async () => {
    const row = await env.DB.prepare('SELECT request_hash, response FROM idempotency WHERE account_id = ? AND key = ?').bind(who.accountId, key).first();
    if (!row) return null;
    if (row.request_hash !== requestHash) throw new ApiError(422, 'idempotency-mismatch', 'That request key was already used for a different request.');
    return Object.assign(JSON.parse(row.response), { replayed: true });
  };
  const prior = await stored();
  if (prior) return prior;
  let lastGuard = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { tx, result } = await plan(attempt);
    const statements = [env.DB.prepare('INSERT INTO idempotency (account_id, key, request_hash, response, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(who.accountId, key, requestHash, JSON.stringify(result), now)].concat(tx.statements);
    try {
      await env.DB.batch(statements);
      return Object.assign({}, result, { replayed: false });
    } catch (error) {
      const text = String(error && error.message);
      if (/idempotency\.account_id/.test(text)) { const again = await stored(); if (again) return again; }
      const g = guardOf(error);
      if (g) {
        lastGuard = g;
        if (g === 'stale' || g === 'conflict') continue; // re-read and re-plan against the new state
        const [status, code, message] = GUARD_ERRORS[g] || GUARD_ERRORS.conflict;
        throw new ApiError(status, code, message);
      }
      if (isWalletCheck(error)) throw new ApiError(409, 'funds', GUARD_ERRORS.funds[2]);
      if (/UNIQUE constraint failed: (listing_items|offer_items)\.instance_id/.test(text)) throw new ApiError(409, 'not-owned', GUARD_ERRORS.not_owned[2]);
      throw error;
    }
  }
  const [status, code, message] = GUARD_ERRORS[lastGuard || 'stale'];
  throw new ApiError(status, code, message);
}

// A system operation (settlement, expiry, matching): no account owns it, so there is no idempotency record. It acts only
// when the guards say the state is still the one it read, so running it twice, or two of it at once, is harmless.
export async function system(env, plan) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const p = await plan(attempt);
    if (!p || p.noop || !p.tx) return p || { noop: true };
    if (!p.tx.statements.length) return p.result;
    try {
      await env.DB.batch(p.tx.statements);
      return p.result;
    } catch (error) {
      const g = guardOf(error);
      if (g === 'stale' || g === 'conflict' || g === 'closed') continue;
      throw error;
    }
  }
  return { noop: true, contended: true };
}

export const newId = (prefix, bytes = 10) => randomId(prefix, bytes);
