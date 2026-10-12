// Cardable Market Beta online API (beta/staging). Routes are small and typed; every response carries a trace id.
//   GET  /v1/status                      public
//   POST /v1/auth/register|refresh|recover   public, rate limited
//   POST /v1/auth/logout, GET /v1/auth/sessions, DELETE /v1/auth/sessions/:id
//   GET  /v1/me /v1/wallet /v1/inventory /v1/listings /v1/prices /v1/notifications /v1/settings    authenticated, read
//   PUT  /v1/settings
//   POST /v1/import/preview, POST /v1/import/commit, GET /v1/import/receipt
// There are no bots and no fabricated data: a new realm is empty and says so.
import { authenticate, listSessions, logout, recover, refresh, register, revokeSession, rateLimit } from './auth.js';
import { commit as commitImport, existingReceipt, preview as previewImport } from './importer.js';
import { CATALOG } from './catalog.js';
import { ApiError, corsHeaders, json, randomId, readJson, sha256 } from './util.js';
export { Gate } from './gate.js';

const VERSION = '0.4.0-beta';

async function route(request, env, url, trace) {
  const { pathname } = url, method = request.method;
  if (pathname === '/v1/status' && method === 'GET') {
    const schema = await env.DB.prepare("SELECT value FROM schema_info WHERE key = 'schema'").first();
    return { service: 'cardable-market-beta', version: VERSION, apiVersion: env.API_VERSION || '1', environment: env.ENVIRONMENT || 'beta', schema: Number(schema && schema.value),
      catalog: CATALOG.hash, time: Date.now(), features: { listings: false, trading: false, imports: true, turnstile: !!env.TURNSTILE_SITEKEY }, turnstileSitekey: env.TURNSTILE_SITEKEY || null };
  }
  if (pathname === '/v1/auth/register' && method === 'POST') return register(env, request, await readJson(request, 8_000));
  if (pathname === '/v1/auth/refresh' && method === 'POST') return refresh(env, request, await readJson(request, 8_000));
  if (pathname === '/v1/auth/recover' && method === 'POST') return recover(env, request, await readJson(request, 8_000));

  const who = await authenticate(env, request);
  await rateLimit(env, who.accountId, 'api', 600, 60);
  if (pathname === '/v1/auth/logout' && method === 'POST') { await logout(env, who); return { ok: true }; }
  if (pathname === '/v1/auth/sessions' && method === 'GET') return { sessions: await listSessions(env, who) };
  const sessionMatch = /^\/v1\/auth\/sessions\/([A-Za-z0-9_-]{4,40})$/.exec(pathname);
  if (sessionMatch && method === 'DELETE') return { revoked: await revokeSession(env, who, sessionMatch[1]) };

  if (pathname === '/v1/me' && method === 'GET') {
    const a = await env.DB.prepare('SELECT alias, created_at, imported FROM accounts WHERE id = ?').bind(who.accountId).first();
    return { alias: a.alias, createdAt: a.created_at, imported: !!a.imported, realm: 'global' };
  }
  if (pathname === '/v1/wallet' && method === 'GET') {
    const w = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(who.accountId).first();
    const rows = await env.DB.prepare('SELECT id, at, delta, reason, ref, balance_after FROM ledger WHERE account_id = ? ORDER BY id DESC LIMIT 30').bind(who.accountId).all();
    return { balance: w.balance, held: w.held, available: w.balance - w.held, label: 'Credits', realm: 'global',
      ledger: rows.results.map((r) => ({ id: r.id, at: r.at, delta: r.delta, reason: r.reason, ref: r.ref, balance: r.balance_after })) };
  }
  if (pathname === '/v1/inventory' && method === 'GET') {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50)), after = url.searchParams.get('cursor') || '';
    const rows = await env.DB.prepare('SELECT id, card_id, variant_id, skin_id, serial, source, state, pulled_at FROM instances WHERE owner_id = ? AND id > ? ORDER BY id LIMIT ?')
      .bind(who.accountId, after, limit + 1).all();
    const items = rows.results.slice(0, limit).map((r) => ({ id: r.id, cardId: r.card_id, variantId: r.variant_id, cardSkinId: r.skin_id, serial: r.serial, source: r.source, state: r.state, pulledAt: r.pulled_at }));
    const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM instances WHERE owner_id = ? AND state <> 'redeemed'").bind(who.accountId).first()).n;
    return { items, nextCursor: rows.results.length > limit ? items[items.length - 1].id : null, total };
  }
  if (pathname === '/v1/listings' && method === 'GET') {
    // Listings are created by players only, from Stage 5. Until then the truthful answer is none.
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'").first();
    return { items: [], nextCursor: null, total: rows.n, emptyReason: 'no-listings', source: 'players' };
  }
  if (pathname === '/v1/prices' && method === 'GET') return { items: [], source: 'players', note: 'Prices come only from completed player sales.' };
  if (pathname === '/v1/notifications' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, at, kind, body, read_at FROM notifications WHERE account_id = ? ORDER BY id DESC LIMIT 50').bind(who.accountId).all();
    return { items: rows.results.map((r) => ({ id: r.id, at: r.at, kind: r.kind, body: r.body, read: !!r.read_at })) };
  }
  if (pathname === '/v1/settings' && method === 'GET') {
    const r = await env.DB.prepare('SELECT value, updated_at FROM settings WHERE account_id = ?').bind(who.accountId).first();
    return { value: r ? JSON.parse(r.value) : {}, updatedAt: r ? r.updated_at : null };
  }
  if (pathname === '/v1/settings' && method === 'PUT') {
    const body = await readJson(request, 4_000);
    const value = {};
    if (typeof body.notifyBids === 'boolean') value.notifyBids = body.notifyBids;
    if (typeof body.notifyTrades === 'boolean') value.notifyTrades = body.notifyTrades;
    if (typeof body.notifyWatch === 'boolean') value.notifyWatch = body.notifyWatch;
    await env.DB.prepare('INSERT INTO settings (account_id, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(who.accountId, JSON.stringify(value), Date.now()).run();
    return { value };
  }
  if (pathname === '/v1/import/preview' && method === 'POST') return previewImport(env, who, await readJson(request, 1_400_000));
  if (pathname === '/v1/import/commit' && method === 'POST') return commitImport(env, who, await readJson(request, 8_000), request.headers.get('idempotency-key'));
  if (pathname === '/v1/import/receipt' && method === 'GET') {
    const r = await existingReceipt(env, who);
    if (!r) throw new ApiError(404, 'no-import', 'This account has not imported a collection.');
    return r;
  }
  throw new ApiError(404, 'not-found', 'There is no such endpoint.');
}

export default {
  async fetch(request, env, ctx) {
    const trace = request.headers.get('x-trace-id') && /^[A-Za-z0-9_-]{6,40}$/.test(request.headers.get('x-trace-id')) ? request.headers.get('x-trace-id') : randomId('tr', 8);
    const cors = corsHeaders(request, env);
    const baseHeaders = Object.assign({ 'x-trace-id': trace }, cors);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
    const url = new URL(request.url);
    try {
      if (!url.pathname.startsWith('/v1/')) throw new ApiError(404, 'not-found', 'There is no such endpoint.');
      const data = await route(request, env, url, trace);
      return json(200, { ok: true, data, trace }, baseHeaders);
    } catch (error) {
      if (error instanceof ApiError) {
        const headers = Object.assign({}, baseHeaders);
        if (error.extra && error.extra.retryAfter) headers['retry-after'] = String(error.extra.retryAfter);
        return json(error.status, { ok: false, error: { code: error.code, message: error.message, detail: error.extra || undefined }, trace }, headers);
      }
      // Unexpected: log with the trace id, answer without internals.
      console.error(JSON.stringify({ trace, path: url.pathname, error: String(error && error.message || error).slice(0, 300) }));
      return json(500, { ok: false, error: { code: 'internal', message: 'Something went wrong. Nothing was changed. Quote this id if you report it.' }, trace }, baseHeaders);
    }
  }
};
