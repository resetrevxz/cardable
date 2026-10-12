// Private accounts, public aliases and sessions.
//  - An account is private: no email, no network address, no device id is stored in the clear. Only the alias is public.
//  - The client holds a rotating refresh token and a one-time recovery code. Access tokens are short, signed and carry a
//    session id that is checked against D1 on every request, so logging out or revoking works immediately.
import { ADJECTIVES, NOUNS } from './words.js';
import { ApiError, b64url, fromB64url, hmac, randomBytes, randomId, randomInt, recoveryCode, secretOrThrow, sha256, timingSafeEqual } from './util.js';

const POOL = ADJECTIVES.length * NOUNS.length;

export async function gateCall(env, name, path, body) {
  const stub = env.GATE.get(env.GATE.idFromName(name));
  const res = await stub.fetch('https://gate' + path, { method: 'POST', body: JSON.stringify(body || {}) });
  return res.json();
}
export async function rateLimit(env, name, bucket, limit, windowSec) {
  const r = await gateCall(env, name, '/hit', { bucket, limit, windowSec });
  if (!r.ok) throw new ApiError(429, 'rate-limited', 'Too many requests. Try again shortly.', { retryAfter: r.retryAfter });
}

export async function addressKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'local';
  return 'ip:' + (await sha256('addr|' + ip)).slice(0, 24);
}

// Turnstile: server side only. The widget cannot run from file://, so a browser needs a hosted challenge page to produce
// the token; that page is not built (docs/market-beta/cloudflare.md section 4). With no TURNSTILE_SECRET this passes.
async function verifyTurnstile(env, token, request) {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET); form.append('response', token);
  const ip = request.headers.get('cf-connecting-ip'); if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const out = await res.json();
    return !!out.success;
  } catch (_) { return false; }
}

async function issueSession(env, accountId, label) {
  const now = Date.now(), ttl = Number(env.REFRESH_TTL_DAYS || 30) * 86400000;
  const sessionId = randomId('ses', 9), refresh = b64url(randomBytes(32)), refreshHash = await sha256('refresh|' + refresh);
  return { sessionId, refresh, refreshHash, createdAt: now, expiresAt: now + ttl, label: typeof label === 'string' ? label.slice(0, 40) : null };
}
async function accessToken(env, accountId, sessionId) {
  const exp = Math.floor(Date.now() / 1000) + Number(env.SESSION_TTL_SECONDS || 900);
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ a: accountId, s: sessionId, e: exp })));
  return { token: payload + '.' + (await hmac(secretOrThrow(env), 'access|' + payload)), exp };
}

export async function register(env, request, body) {
  const addr = await addressKey(request);
  await rateLimit(env, addr, 'register', Number(env.REGISTER_PER_HOUR || 8), 3600);
  if (!(await verifyTurnstile(env, body.turnstile, request))) throw new ApiError(403, 'challenge-failed', 'The human check did not pass.');
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM accounts').first()).n;
  if (count >= Math.floor(POOL * 0.9)) throw new ApiError(503, 'alias-pool-exhausted', 'No more public names are available. The operator has been notified by this error.');
  const now = Date.now(), accountId = randomId('acct', 12), recovery = recoveryCode(), recoveryHash = await sha256('recovery|' + recovery.replace(/-/g, ''));
  const s = await issueSession(env, accountId, body.label);
  for (let attempt = 0; attempt < 40; attempt++) {
    const alias = ADJECTIVES[randomInt(ADJECTIVES.length)] + ' ' + NOUNS[randomInt(NOUNS.length)];
    try {
      // One transaction: the account, its empty wallet and its first session exist together or not at all.
      await env.DB.batch([
        env.DB.prepare('INSERT INTO accounts (id, alias, created_at, recovery_hash) VALUES (?, ?, ?, ?)').bind(accountId, alias, now, recoveryHash),
        env.DB.prepare('INSERT INTO wallets (account_id) VALUES (?)').bind(accountId),
        env.DB.prepare('INSERT INTO sessions (id, account_id, refresh_hash, created_at, expires_at, last_used_at, label) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(s.sessionId, accountId, s.refreshHash, s.createdAt, s.expiresAt, s.createdAt, s.label)
      ]);
      const at = await accessToken(env, accountId, s.sessionId);
      return { alias, accessToken: at.token, accessExpiresAt: at.exp * 1000, refreshToken: s.refresh, recoveryCode: recovery, createdAt: now };
    } catch (error) {
      if (!/UNIQUE|constraint/i.test(String(error && error.message))) throw error;
    }
  }
  throw new ApiError(503, 'alias-unavailable', 'A public name could not be reserved. Try again.');
}

export async function refresh(env, request, body) {
  const addr = await addressKey(request);
  await rateLimit(env, addr, 'refresh', 60, 3600);
  const token = typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (token.length < 20 || token.length > 200) throw new ApiError(401, 'bad-token', 'Sign in again.');
  const hash = await sha256('refresh|' + token), now = Date.now();
  const row = await env.DB.prepare('SELECT s.id, s.account_id, s.expires_at, s.revoked_at, a.status FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.refresh_hash = ?').bind(hash).first();
  if (!row) {
    // A refresh token that was already rotated away is evidence of a copy: end that session.
    const reused = await env.DB.prepare('SELECT id FROM sessions WHERE prev_refresh_hash = ?').bind(hash).first();
    if (reused) await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').bind(now, reused.id).run();
    throw new ApiError(401, 'bad-token', 'Sign in again.');
  }
  if (row.revoked_at || row.expires_at < now || row.status !== 'active') throw new ApiError(401, 'session-ended', 'This session has ended. Sign in again.');
  const next = b64url(randomBytes(32)), nextHash = await sha256('refresh|' + next);
  const done = await env.DB.prepare('UPDATE sessions SET refresh_hash = ?, prev_refresh_hash = ?, last_used_at = ? WHERE id = ? AND refresh_hash = ? AND revoked_at IS NULL')
    .bind(nextHash, hash, now, row.id, hash).run();
  if (!done.meta || done.meta.changes !== 1) throw new ApiError(409, 'refresh-raced', 'That session was refreshed elsewhere. Try again.');
  const at = await accessToken(env, row.account_id, row.id);
  return { accessToken: at.token, accessExpiresAt: at.exp * 1000, refreshToken: next };
}

export async function recover(env, request, body) {
  const addr = await addressKey(request);
  await rateLimit(env, addr, 'recover', 10, 3600);
  const code = String(body.recoveryCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 20) throw new ApiError(400, 'bad-code', 'That recovery code is not valid.');
  const row = await env.DB.prepare('SELECT id, alias, status FROM accounts WHERE recovery_hash = ?').bind(await sha256('recovery|' + code)).first();
  if (!row || row.status !== 'active') throw new ApiError(401, 'bad-code', 'That recovery code is not valid.');
  const s = await issueSession(env, row.id, body.label);
  await env.DB.prepare('INSERT INTO sessions (id, account_id, refresh_hash, created_at, expires_at, last_used_at, label) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(s.sessionId, row.id, s.refreshHash, s.createdAt, s.expiresAt, s.createdAt, s.label).run();
  const at = await accessToken(env, row.id, s.sessionId);
  return { alias: row.alias, accessToken: at.token, accessExpiresAt: at.exp * 1000, refreshToken: s.refresh };
}

// Returns { accountId, sessionId, alias } or throws 401.
export async function authenticate(env, request) {
  const header = request.headers.get('authorization') || '';
  const m = /^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(header);
  if (!m) throw new ApiError(401, 'unauthenticated', 'Sign in to use the online market.');
  const expect = await hmac(secretOrThrow(env), 'access|' + m[1]);
  if (!timingSafeEqual(expect, m[2])) throw new ApiError(401, 'unauthenticated', 'Sign in to use the online market.');
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(fromB64url(m[1]))); } catch (_) { throw new ApiError(401, 'unauthenticated', 'Sign in to use the online market.'); }
  if (!payload || payload.e * 1000 < Date.now()) throw new ApiError(401, 'token-expired', 'Your session needs refreshing.');
  const row = await env.DB.prepare('SELECT s.revoked_at, s.expires_at, a.alias, a.status, a.imported FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.id = ? AND s.account_id = ?')
    .bind(payload.s, payload.a).first();
  if (!row || row.revoked_at || row.expires_at < Date.now() || row.status !== 'active') throw new ApiError(401, 'session-ended', 'This session has ended. Sign in again.');
  return { accountId: payload.a, sessionId: payload.s, alias: row.alias, imported: !!row.imported };
}
export async function logout(env, who) {
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL').bind(Date.now(), who.sessionId, who.accountId).run();
}
export async function listSessions(env, who) {
  const rows = await env.DB.prepare('SELECT id, created_at, last_used_at, label, revoked_at FROM sessions WHERE account_id = ? ORDER BY created_at DESC LIMIT 20').bind(who.accountId).all();
  return rows.results.map((r) => ({ id: r.id, createdAt: r.created_at, lastUsedAt: r.last_used_at, label: r.label, active: !r.revoked_at, current: r.id === who.sessionId }));
}
export async function revokeSession(env, who, id) {
  const r = await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL').bind(Date.now(), String(id), who.accountId).run();
  return r.meta && r.meta.changes === 1;
}
