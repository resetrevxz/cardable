// Shared harness for the integration tests: a real Worker on the local Workers runtime with a real (local) D1 and
// Durable Objects, a few small helpers to make accounts with cards and Credits, and an operator SQL window.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { CATALOG } from '../src/catalog.js';

const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '..');
const wrangler = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
export const SECRET = randomBytes(32).toString('hex');
export const ADMIN = randomBytes(24).toString('hex');
export { CATALOG };
const servers = [];

export function run(args, options) { return execFileSync(process.execPath, [wrangler, ...args], Object.assign({ cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, options || {})); }

export async function start(port, vars) {
  const persist = mkdtempSync(join(tmpdir(), 'cardable-trade-'));
  run(['d1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist]);
  const args = [wrangler, 'dev', '--local', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', persist,
    '--var', 'SESSION_SECRET:' + SECRET, '--var', 'ENVIRONMENT:test', '--var', 'ADMIN_TOKEN:' + ADMIN, '--var', 'REGISTER_PER_HOUR:1000', '--var', 'API_RATE_LIMIT:100000'];
  Object.keys(vars || {}).forEach((k) => args.push('--var', k + ':' + vars[k]));
  const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  const server = { base: 'http://127.0.0.1:' + port, persist, child, log: () => log };
  servers.push(server);
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(server.base + '/v1/status'); if (r.ok) return server; } catch (_) { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('worker did not start: ' + log.slice(-800));
}
export function stopAll() {
  dbs.forEach((db) => { try { db.close(); } catch (_) { /* closed */ } });
  dbs.clear();
  servers.forEach((s) => { try { s.child.kill(); } catch (_) { /* gone */ } try { rmSync(s.persist, { recursive: true, force: true }); } catch (_) { /* busy */ } });
}

// One request. `at` is the instant the server should treat as "now" (test environment only).
export async function call(server, method, path, body, token, options) {
  options = options || {};
  const headers = Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {});
  if (options.at != null) headers['x-test-now'] = String(options.at);
  if (options.key !== undefined) { if (options.key) headers['idempotency-key'] = options.key; }
  else if (method !== 'GET') headers['idempotency-key'] = 'k-' + randomBytes(10).toString('hex');
  if (options.headers) Object.assign(headers, options.headers);
  // The local development proxy now and then drops a connection under heavy concurrency ("Network connection lost")
  // although the Worker answered. A client retries; with the same Idempotency-Key that is exactly what the API is for.
  for (let attempt = 0; ; attempt++) {
    let res, text;
    try {
      res = await fetch(server.base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      text = await res.text();
    } catch (error) { if (attempt < 3) continue; throw error; }
    if (res.status === 500 && /Network connection lost/.test(text) && attempt < 3) continue;
    let json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
    return { status: res.status, json, data: json && json.data, error: json && json.error, text };
  }
}
export function admin(server, method, path, body, at) {
  return call(server, method, path, body, null, { headers: { 'x-admin-token': ADMIN }, at, key: null });
}

// ---- the database, as the operator sees it ----
// Reads go straight to the local database file the Worker is using (read-only), so a test can look at the truth cheaply.
const dbs = new Map();
export function sql(server, command) {
  let db = dbs.get(server.persist);
  if (!db) {
    const dir = join(server.persist, 'v3', 'd1', 'miniflare-D1DatabaseObject');
    const file = readdirSync(dir).find((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
    db = new DatabaseSync(join(dir, file), { readOnly: true });
    dbs.set(server.persist, db);
  }
  return db.prepare(command).all().map((row) => Object.assign({}, row));
}
export function runSql(server, statements) {
  const file = join(server.persist, 'batch-' + randomBytes(4).toString('hex') + '.sql');
  writeFileSync(file, statements.join(';\n') + ';\n');
  run(['d1', 'execute', 'cardable-market-beta-db', '--local', '--persist-to', server.persist, '--file', file]);
}

// ---- players ----
let seq = 0, grants = 0;
const CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const cardIds = Object.keys(CATALOG.cards);
function code() { seq++; return 'R' + CODES[Math.floor(seq / 32) % 32] + CODES[seq % 32] + 'Z'; }
export function packageOf(count, options) {
  options = options || {};
  const originCode = code(), items = [];
  for (let i = 1; i <= count; i++) {
    const cardId = options.cards ? options.cards[(i - 1) % options.cards.length] : cardIds[(i * 7 + seq) % cardIds.length];
    items.push({ instanceId: 'inst-' + originCode + '-' + i, cardId, variantId: options.variant === undefined ? null : options.variant, cardSkinId: null,
      serial: 'CBL-' + originCode + '-' + String(i).padStart(6, '0'), packId: 'standard', pulledAt: Date.UTC(2026, 5, 1) + i * 1000 });
  }
  return { v: 1, app: 'cardable', originCode, packsOpened: count + 3, items };
}
// An account with `cards` imported cards and `credits` Credits. Credits are issued through the same ledger tables the
// system redemption uses, so the realm's supply invariant still balances.
export async function player(server, options) {
  options = options || {};
  const r = await call(server, 'POST', '/v1/auth/register', {}, null, { key: null });
  if (r.status !== 200) throw new Error('register failed ' + r.text);
  const me = Object.assign({ server, token: r.data.accessToken }, r.data);
  if (options.cards) {
    const p = await call(server, 'POST', '/v1/import/preview', { package: packageOf(options.cards, { cards: options.cardList, variant: options.variant }) }, me.token, { key: null });
    if (p.status !== 200) throw new Error('preview failed ' + p.text);
    const c = await call(server, 'POST', '/v1/import/commit', { previewId: p.data.previewId }, me.token, { key: 'imp-' + randomBytes(8).toString('hex') });
    if (c.status !== 200) throw new Error('commit failed ' + c.text);
  }
  me.cards = await inventory(me);
  if (options.credits) await grant(server, [{ alias: me.alias, amount: options.credits }]);
  return me;
}
export async function inventory(me) {
  const out = [];
  let cursor = null;
  do {
    const r = await call(me.server, 'GET', '/v1/inventory?limit=100' + (cursor ? '&cursor=' + cursor : ''), null, me.token);
    out.push(...r.data.items); cursor = r.data.nextCursor;
  } while (cursor);
  return out;
}
export function grant(server, list) {
  const statements = [];
  for (const { alias, amount } of list) {
    grants++;
    const id = 'grant-' + grants, serial = 'CBL-GRNT-' + String(grants).padStart(6, '0'), who = "(SELECT id FROM accounts WHERE alias = '" + alias + "')";
    statements.push("INSERT INTO instances (id, owner_id, card_id, serial, origin_code, source, state, created_at) VALUES ('" + id + "', " + who + ", 'x', '" + serial + "', 'GRNT', 'online-pack', 'redeemed', 1)");
    statements.push("INSERT INTO redemptions (id, account_id, at, instance_id, card_id, serial, quote, fair, baseline, op_id) VALUES ('rd-" + id + "', " + who + ", 1, '" + id + "', 'x', '" + serial + "', " + amount + ', ' + amount + ', ' + amount + ", 'qs-" + id + "')");
    statements.push('UPDATE wallets SET balance = balance + ' + amount + ' WHERE account_id = ' + who);
    statements.push("INSERT INTO ledger (account_id, at, delta, reason, ref, balance_after) SELECT account_id, 1, " + amount + ", 'test grant', 'qs-" + id + "', balance FROM wallets WHERE account_id = " + who);
  }
  runSql(server, statements);
}
export const wallet = async (me, at) => (await call(me.server, 'GET', '/v1/wallet', null, me.token, { at })).data;
export const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const HOUR = 3600_000, DAY = 24 * HOUR, MIN = 60_000;
