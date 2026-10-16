#!/usr/bin/env node
'use strict';
/**
 * One real transaction between two real accounts on a deployed Worker, to prove the whole chain on the live service:
 * register two private accounts, convert a few cards each, one account Quick Sells to get Credits, the other lists a card
 * at a fixed price, the first buys it, and everything is read back: the price, the 2% fee (at least 1, half up), both
 * balances, who owns the card, that a replay of the same request changes nothing, and that the realm reconciles.
 *
 *   node scripts/live-trade.cjs https://<name>.workers.dev [--keep]
 *
 * It uses clearly labeled accounts ("stage8-seller" / "stage8-buyer"), prints no token or recovery code, and ends by
 * revoking both test imports through the operator route (so unspent test cards do not stay in the beta) unless --keep.
 * The one completed sale stays in the beta's history; it is reported so the owner knows it exists.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const origin = process.argv[2], keep = process.argv.includes('--keep');
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin || '') && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) { console.error('give the deployed https://….workers.dev origin'); process.exit(2); }
const CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const record = { origin, at: new Date().toISOString(), steps: [] };
function check(name, ok, detail) { record.steps.push({ name, ok: !!ok, detail: detail === undefined ? null : detail }); console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); if (!ok) throw new Error(name); }

async function call(method, route, body, token, key, extra) {
  const headers = Object.assign({ 'content-type': 'application/json', origin: 'null' }, token ? { authorization: 'Bearer ' + token } : {}, extra || {});
  if (method !== 'GET' && key !== null) headers['idempotency-key'] = key || 'lt-' + crypto.randomBytes(8).toString('hex');
  const res = await fetch(origin + route, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'error' });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json && json.data, error: json && json.error };
}
async function account(label) {
  const r = await call('POST', '/v1/auth/register', { label }, null, null);
  if (r.status !== 200) throw new Error('register ' + label + ' answered ' + r.status + ' ' + JSON.stringify(r.error));
  return { token: r.data.accessToken, alias: r.data.alias, label };
}
async function importCards(me, cards) {
  const originCode = Array.from({ length: 4 }, () => CODES[crypto.randomInt(CODES.length)]).join('');
  const items = cards.map((cardId, i) => ({ instanceId: 'live-' + originCode + '-' + (i + 1), cardId, variantId: null, cardSkinId: null, serial: 'CBL-' + originCode + '-' + String(i + 1).padStart(6, '0'), packId: 'standard', pulledAt: Date.UTC(2026, 9, 1) + i * 1000 }));
  const pkg = { v: 1, app: 'cardable', originCode, packsOpened: cards.length + 3, items };
  const p = await call('POST', '/v1/import/preview', { package: pkg }, me.token, null);
  if (p.status !== 200) throw new Error('preview ' + me.label + ': ' + JSON.stringify(p.error));
  const c = await call('POST', '/v1/import/commit', { previewId: p.data.previewId }, me.token, 'live-imp-' + crypto.randomBytes(6).toString('hex'));
  if (c.status !== 200) throw new Error('commit ' + me.label + ': ' + JSON.stringify(c.error));
  const inv = await call('GET', '/v1/inventory?limit=50', null, me.token);
  return inv.data.items;
}
const wallet = async (me) => (await call('GET', '/v1/wallet', null, me.token)).data;
const feeOf = (price) => Math.max(1, Math.floor(price * 0.02 + 0.5));

(async () => {
  let a = null, b = null;
  try {
    const status = await call('GET', '/v1/status');
    check('the service is open', status.data && status.data.mode === 'open', { mode: status.data && status.data.mode, version: status.data && status.data.version, schema: status.data && status.data.schema });
    const { CATALOG } = await import(require('node:url').pathToFileURL(path.join(__dirname, '..', 'src', 'catalog.js')).href);
    const cheap = Object.keys(CATALOG.cards).filter((id) => CATALOG.cards[id] === 'basic' || CATALOG.cards[id] === 'common');
    const pick = (n, off) => Array.from({ length: n }, (_, i) => cheap[(off + i * 5) % cheap.length]);
    a = await account('stage8-seller'); b = await account('stage8-buyer');
    check('two private accounts exist, with different names', a.alias !== b.alias, { seller: a.alias, buyer: b.alias });
    const invA = await importCards(a, pick(3, 1)), invB = await importCards(b, pick(5, 2));
    check('each converted a few test cards, once', invA.length === 3 && invB.length === 5, { seller: invA.length, buyer: invB.length });

    // the buyer sells some cards to the system to have Credits to spend
    const ids = invB.slice(0, 4).map((i) => i.id);
    const quote = await call('GET', '/v1/sell/quote?ids=' + ids.join(','), null, b.token);
    check('a Quick Sell quote is given before anything is sold', quote.status === 200 && quote.data.total > 0, { total: quote.data && quote.data.total });
    const sold = await call('POST', '/v1/sell', { instanceIds: ids, expectTotal: quote.data.total }, b.token);
    check('Quick Sell paid exactly the quote', sold.status === 200 && (await wallet(b)).balance === quote.data.total, { paid: quote.data.total });
    const buyerBefore = await wallet(b), sellerBefore = await wallet(a);

    const price = Math.max(2, Math.min(40, buyerBefore.balance));
    const card = invA[0];
    const made = await call('POST', '/v1/listings', { kind: 'fixed', instanceIds: [card.id], ask: price, durationMs: 3600000 }, a.token);
    check('the seller listed one card at a fixed price', made.status === 200 && made.data.listingId, { price });
    const listingId = made.data.listingId, key = 'live-buy-' + crypto.randomBytes(6).toString('hex');
    const bought = await call('POST', '/v1/listings/' + listingId + '/buy', { expectedPrice: price }, b.token, key);
    check('the buyer bought it at the listed price', bought.status === 200, bought.error || undefined);
    const fee = feeOf(price), sellerAfter = await wallet(a), buyerAfter = await wallet(b);
    check('the buyer paid the price and nothing else', buyerBefore.balance - buyerAfter.balance === price, { paid: buyerBefore.balance - buyerAfter.balance });
    check('the seller received the price less the 2% fee (at least 1, half up)', sellerAfter.balance - sellerBefore.balance === price - fee, { fee, received: sellerAfter.balance - sellerBefore.balance });
    const mine = (await call('GET', '/v1/inventory?limit=50', null, b.token)).data.items.map((i) => i.id);
    const theirs = (await call('GET', '/v1/inventory?limit=50', null, a.token)).data.items.map((i) => i.id);
    check('the card moved to the buyer, once', mine.includes(card.id) && !theirs.includes(card.id));
    const replay = await call('POST', '/v1/listings/' + listingId + '/buy', { expectedPrice: price }, b.token, key);
    const buyerReplay = await wallet(b);
    check('repeating the same request acts once (same key)', replay.status === 200 && buyerReplay.balance === buyerAfter.balance, { status: replay.status });
    const again = await call('POST', '/v1/listings/' + listingId + '/buy', { expectedPrice: price }, b.token);
    check('buying it again with a new key is refused and charges nothing', again.status >= 400 && (await wallet(b)).balance === buyerAfter.balance, { status: again.status, code: again.error && again.error.code });
    record.trade = { listing: listingId, price, fee, seller: a.alias, buyer: b.alias };
  } finally {
    // The operator's reconcile and the cleanup of the two test imports, when the operator token is on this machine.
    const file = path.join(__dirname, '..', '.admin-token');
    if (/^https:/.test(origin) && fs.existsSync(file)) {
      const token = fs.readFileSync(file, 'utf8').trim();
      const op = (m, r, body) => fetch(origin + '/v1/admin/' + r, { method: m, headers: { 'x-admin-token': token, 'content-type': 'application/json', 'x-admin-actor': 'live-trade' }, body: body ? JSON.stringify(body) : undefined }).then((x) => x.json()).catch(() => null);
      const rec = await op('GET', 'reconcile');
      record.reconcile = rec && rec.data ? { ok: rec.data.ok, problems: rec.data.problems } : null;
      console.log((rec && rec.data && rec.data.ok ? 'ok   ' : 'FAIL ') + 'the realm reconciles after the trade', record.reconcile);
      if (!keep) for (const me of [a, b]) if (me) { const r = await op('POST', 'import/revoke', { alias: me.alias }); console.log('     revoked the test import of ' + me.alias + ': ' + (r && r.data ? r.data.removed + ' unspent cards removed' : 'not revoked')); }
    }
    const target = /^https:/.test(origin) ? path.join(__dirname, '..', '..', 'docs', 'market-beta', 'stage-8-live-trade.json') : path.join(require('node:os').tmpdir(), 'cardable-live-trade-rehearsal.json');
    fs.writeFileSync(target, JSON.stringify(record, null, 2));
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
