// Cardable Market Beta online API (beta/staging). Routes are small and typed; every response carries a trace id.
//   GET  /v1/status                      public
//   POST /v1/auth/register|refresh|recover   public, rate limited
//   POST /v1/auth/logout, GET /v1/auth/sessions, DELETE /v1/auth/sessions/:id
//   GET  /v1/me /v1/wallet /v1/inventory /v1/notifications /v1/settings /v1/activity /v1/history    authenticated
//   PUT  /v1/settings, POST /v1/notifications/read
//   POST /v1/import/preview, POST /v1/import/commit, GET /v1/import/receipt
//   GET  /v1/listings /v1/listings/:id /v1/trades /v1/prices /v1/cards/:id/market /v1/valuation /v1/sell/quote
//   POST /v1/listings (+ /:id/cancel|buy|bid|buyout|relist), PUT /v1/listings/:id
//   POST /v1/orders, PUT /v1/orders/:id, POST /v1/orders/:id/cancel
//   POST /v1/offers, POST /v1/offers/:id/accept|decline|counter|withdraw
//   POST /v1/sell        (Quick Sell: system redemption)
//   operator: GET /v1/admin/reconcile, POST /v1/admin/repair|sweep|import/revoke   (x-admin-token)
// Every write needs an Idempotency-Key. There are no bots and no fabricated data: a new realm is empty and says so.
import { authenticate, listSessions, logout, recover, refresh, register, revokeSession, rateLimit } from './auth.js';
import { commit as commitImport, existingReceipt, preview as previewImport } from './importer.js';
import { CATALOG } from './catalog.js';
import { ApiError, corsHeaders, json, randomId, readJson } from './util.js';
import { RULES, isCard, quickSellLimits } from './economy.js';
import { nowOf } from './ops.js';
import { buyListing, buyoutListing, cancelListing, createListing, placeBid, relistListing, repriceListing } from './listings.js';
import { cancelOrder, editOrder, placeOrder } from './orders.js';
import { makeOffer, respondToOffer } from './offers.js';
import { quote as quickSellQuote, quickSellUsage, redeem } from './quicksell.js';
import { activity, browse, cardMarket, detail, history, inventory, markRead, trades } from './views.js';
import { valuationOf } from './valuation.js';
import { reconcile, repair, requireAdmin, revokeImport, sweep } from './admin.js';
import { cardAnalytics, movers, stocks } from './stats.js';
import { exportData, portfolio } from './portfolio.js';
import { createAlert, deleteAlert, listAlerts } from './alerts.js';
export { Gate } from './gate.js';

const VERSION = '0.5.0-beta';
const LISTING_PATH = /^\/v1\/listings\/(lst_[A-Za-z0-9_-]{6,40})(?:\/(cancel|buy|bid|buyout|relist))?$/;
const ORDER_PATH = /^\/v1\/orders\/(ord_[A-Za-z0-9_-]{6,40})(?:\/(cancel))?$/;
const OFFER_PATH = /^\/v1\/offers\/(ofr_[A-Za-z0-9_-]{6,40})\/(accept|decline|counter|withdraw)$/;

function publicRules(env) {
  return { fee: { bps: RULES.fee.bps, minFee: RULES.fee.minFee, label: '2% market fee, taken once from the seller on a Credit sale' }, price: RULES.price, bundleMax: RULES.bundle.max,
    auction: { presetsMs: RULES.auction.presetsMs, minDurationMs: RULES.auction.minDurationMs, maxDurationMs: RULES.auction.maxDurationMs, incrementPct: RULES.auction.incrementPct, incrementMin: RULES.auction.incrementMin,
      snipeWindowMs: RULES.auction.snipeWindowMs, snipeExtendMs: RULES.auction.snipeExtendMs, snipeMaxExtensions: RULES.auction.snipeMaxExtensions, buyout: 'Offered until the price reaches it.' },
    fixed: { defaultMs: RULES.fixed.defaultMs, maxDurationMs: RULES.fixed.maxDurationMs }, swap: { defaultMs: RULES.swap.defaultMs, offerExpiryMs: RULES.swap.offerExpiryMs, counterRounds: RULES.limits.counterRounds },
    order: { defaultMs: RULES.order.defaultMs, maxQuantity: RULES.limits.orderQuantity, open: RULES.limits.openOrders }, limits: RULES.limits,
    quickSell: (() => { const q = quickSellLimits(env); return { perAccountCardsPerDay: q.perAccountCardsPerDay, perAccountCreditsPerDay: q.perAccountCreditsPerDay, perRequestMax: q.perRequestMax, quoteTtlMs: q.quoteTtlMs }; })(),
    swapFee: 'A card-for-card swap pays no fee. Credits that change hands pay the usual 2%, taken from the receiver.' };
}

async function route(request, env, url, trace) {
  const { pathname } = url, method = request.method, now = nowOf(env, request), key = request.headers.get('idempotency-key');
  if (pathname === '/v1/status' && method === 'GET') {
    const schema = await env.DB.prepare("SELECT value FROM schema_info WHERE key = 'schema'").first();
    return { service: 'cardable-market-beta', version: VERSION, apiVersion: env.API_VERSION || '1', environment: env.ENVIRONMENT || 'beta', schema: Number(schema && schema.value),
      catalog: CATALOG.hash, time: now, features: { listings: true, trading: true, auctions: true, orders: true, swaps: true, quickSell: true, imports: true, turnstile: !!env.TURNSTILE_SITEKEY },
      turnstileSitekey: env.TURNSTILE_SITEKEY || null, rules: publicRules(env) };
  }
  if (pathname === '/v1/auth/register' && method === 'POST') return register(env, request, await readJson(request, 8_000));
  if (pathname === '/v1/auth/refresh' && method === 'POST') return refresh(env, request, await readJson(request, 8_000));
  if (pathname === '/v1/auth/recover' && method === 'POST') return recover(env, request, await readJson(request, 8_000));

  // The operator's tools answer 404 to anyone without the admin token, so their existence is not advertised.
  if (pathname.startsWith('/v1/admin/')) {
    requireAdmin(env, request);
    if (pathname === '/v1/admin/reconcile' && method === 'GET') return reconcile(env);
    if (pathname === '/v1/admin/repair' && method === 'POST') return repair(env, now);
    if (pathname === '/v1/admin/sweep' && method === 'POST') { const b = await readJson(request, 2_000); return sweep(env, now, b.limit); }
    if (pathname === '/v1/admin/import/revoke' && method === 'POST') return revokeImport(env, await readJson(request, 2_000), now);
    throw new ApiError(404, 'not-found', 'There is no such endpoint.');
  }

  const who = await authenticate(env, request);
  await rateLimit(env, who.accountId, 'api', Number(env.API_RATE_LIMIT) || 600, 60);
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
    return { balance: w.balance, held: w.held, available: w.balance - w.held, label: 'Credits', realm: 'global', usage: await quickSellUsage(env, who.accountId, now),
      ledger: rows.results.map((r) => ({ id: r.id, at: r.at, delta: r.delta, reason: r.reason, ref: r.ref, balance: r.balance_after })) };
  }
  if (pathname === '/v1/inventory' && method === 'GET') return inventory(env, who, url);

  // ---- the market, read ----
  if (pathname === '/v1/listings' && method === 'GET') return browse(env, who, url, now);
  if (pathname === '/v1/activity' && method === 'GET') return activity(env, who, now);
  if (pathname === '/v1/history' && method === 'GET') return history(env, who, url);
  if (pathname === '/v1/trades' && method === 'GET') return trades(env, who, url);
  if (pathname === '/v1/prices' && method === 'GET') {
    const card = url.searchParams.get('cardId');
    if (!card || !isCard(card)) return { items: [], source: 'players', note: 'Prices come only from completed player sales.' };
    const rows = await env.DB.prepare("SELECT at, price, kind, card_key FROM price_observations WHERE card_key LIKE ? ORDER BY id DESC LIMIT 60").bind(card + '|%').all();
    return { items: rows.results.map((r) => ({ at: r.at, price: r.price, kind: r.kind, key: r.card_key })), source: 'players' };
  }
  const cardMatch = /^\/v1\/cards\/([a-z0-9-]{2,60})\/market$/.exec(pathname);
  if (cardMatch && method === 'GET') return cardMarket(env, who, cardMatch[1], url.searchParams.get('variant') || null, now);
  if (pathname === '/v1/valuation' && method === 'GET') {
    const p = url.searchParams, card = p.get('cardId');
    if (!card || !isCard(card)) throw new ApiError(404, 'not-found', 'That card is not in the catalog.');
    return { valuation: await valuationOf(env, { cardId: card, variantId: p.get('variantId') || null, skinId: p.get('skinId') || null, serial: p.get('serial') || null }, now), serverNow: now };
  }
  if (pathname === '/v1/notifications' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, at, kind, body, read_at, ref FROM notifications WHERE account_id = ? ORDER BY id DESC LIMIT 50').bind(who.accountId).all();
    return { items: rows.results.map((r) => ({ id: r.id, at: r.at, kind: r.kind, body: r.body, ref: r.ref, read: !!r.read_at })) };
  }
  if (pathname === '/v1/notifications/read' && method === 'POST') return markRead(env, who, await readJson(request, 1_000), now);

  // ---- analytics, portfolio and alerts ----
  if (pathname === '/v1/analytics/card' && method === 'GET') {
    const p = url.searchParams;
    return cardAnalytics(env, { cardId: p.get('cardId'), variantId: p.get('variantId') || null, skinId: p.get('skinId') || null }, p.get('window') || '7d', now);
  }
  if (pathname === '/v1/analytics/stocks' && method === 'GET') {
    const p = url.searchParams;
    return stocks(env, { scope: p.get('scope'), id: p.get('id'), window: p.get('window'), variantId: p.get('variantId') || null }, now);
  }
  if (pathname === '/v1/analytics/movers' && method === 'GET') return movers(env, now);
  if (pathname === '/v1/portfolio' && method === 'GET') return portfolio(env, who, now);
  if (pathname === '/v1/export' && method === 'GET') return exportData(env, who, url, now);
  if (pathname === '/v1/alerts' && method === 'GET') return listAlerts(env, who);
  if (pathname === '/v1/alerts' && method === 'POST') return createAlert(env, who, await readJson(request, 4_000), now);
  const am = /^\/v1\/alerts\/(alt_[A-Za-z0-9_-]{6,40})$/.exec(pathname);
  if (am && method === 'DELETE') return deleteAlert(env, who, am[1]);
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

  // ---- the market, write ----
  if (pathname === '/v1/listings' && method === 'POST') return createListing(env, who, key, await readJson(request, 8_000), now);
  const lm = LISTING_PATH.exec(pathname);
  if (lm) {
    const id = lm[1], action = lm[2] || null;
    if (!action && method === 'GET') return detail(env, who, id, now);
    if (!action && method === 'PUT') return repriceListing(env, who, key, id, await readJson(request, 2_000), now);
    if (method === 'POST') {
      if (action === 'cancel') return cancelListing(env, who, key, id, now);
      if (action === 'buy') return buyListing(env, who, key, id, await readJson(request, 2_000), now);
      if (action === 'bid') return placeBid(env, who, key, id, await readJson(request, 2_000), now);
      if (action === 'buyout') return buyoutListing(env, who, key, id, await readJson(request, 2_000), now);
      if (action === 'relist') return relistListing(env, who, key, id, now);
    }
  }
  if (pathname === '/v1/orders' && method === 'POST') return placeOrder(env, who, key, await readJson(request, 4_000), now);
  const om = ORDER_PATH.exec(pathname);
  if (om) {
    if (!om[2] && method === 'PUT') return editOrder(env, who, key, om[1], await readJson(request, 2_000), now);
    if (om[2] === 'cancel' && method === 'POST') return cancelOrder(env, who, key, om[1], now);
  }
  if (pathname === '/v1/offers' && method === 'POST') return makeOffer(env, who, key, await readJson(request, 4_000), now);
  const fm = OFFER_PATH.exec(pathname);
  if (fm && method === 'POST') return respondToOffer(env, who, key, fm[1], fm[2], await readJson(request, 2_000), now);
  if (pathname === '/v1/sell/quote' && method === 'GET') return quickSellQuote(env, who, url.searchParams.get('ids'), now);
  if (pathname === '/v1/sell' && method === 'POST') return redeem(env, who, key, await readJson(request, 4_000), now);

  // ---- the one-time conversion of an offline collection ----
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
  async fetch(request, env) {
    const trace = request.headers.get('x-trace-id') && /^[A-Za-z0-9_-]{6,40}$/.test(request.headers.get('x-trace-id')) ? request.headers.get('x-trace-id') : randomId('tr', 8);
    const cors = corsHeaders(request, env);
    const baseHeaders = Object.assign({ 'x-trace-id': trace }, cors);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
    const url = new URL(request.url);
    try {
      if (!url.pathname.startsWith('/v1/')) throw new ApiError(404, 'not-found', 'There is no such endpoint.');
      const data = await route(request, env, url, trace);
      if (data && data.raw !== undefined && data.contentType) {
        return new Response(data.raw, { status: 200, headers: Object.assign({ 'content-type': data.contentType, 'content-disposition': 'attachment; filename="' + data.filename + '"', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, baseHeaders) });
      }
      return json(200, { ok: true, data, trace }, baseHeaders);
    } catch (error) {
      if (error instanceof ApiError) {
        const headers = Object.assign({}, baseHeaders);
        if (error.extra && error.extra.retryAfter) headers['retry-after'] = String(error.extra.retryAfter);
        return json(error.status, { ok: false, error: { code: error.code, message: error.message, detail: error.extra || undefined }, trace }, headers);
      }
      // Unexpected: log with the trace id, answer without internals. Nothing was changed: every write is one transaction.
      console.error(JSON.stringify({ trace, path: url.pathname, error: String(error && error.message || error).slice(0, 300) }));
      return json(500, { ok: false, error: { code: 'internal', message: 'Something went wrong. Nothing was changed. Quote this id if you report it.' }, trace }, baseHeaders);
    }
  },
  // Backstop for the per-listing alarms: close and expire what is due, match what is waiting.
  async scheduled(event, env, ctx) { ctx.waitUntil(sweep(env, Date.now())); }
};
