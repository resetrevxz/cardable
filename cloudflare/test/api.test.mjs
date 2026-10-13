// Integration tests for the beta API against the real Worker, a real (local) D1 database and real Durable Objects,
// started with `wrangler dev --local`. Nothing here talks to Cloudflare's network or to any deployed resource.
//   cd cloudflare && npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { CATALOG } from '../src/catalog.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const wrangler = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const SECRET = randomBytes(32).toString('hex');
const servers = [];
let main, faulty, limited;

function run(args, options) { return execFileSync(process.execPath, [wrangler, ...args], Object.assign({ cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, options || {})); }
async function start(port, vars) {
  const persist = mkdtempSync(join(tmpdir(), 'cardable-beta-'));
  run(['d1', 'migrations', 'apply', 'cardable-market-beta-db', '--local', '--persist-to', persist]);
  const args = [wrangler, 'dev', '--local', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', persist, '--var', 'SESSION_SECRET:' + SECRET, '--var', 'ENVIRONMENT:test'];
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
before(async () => {
  main = await start(8791, { REGISTER_PER_HOUR: '500' });
  faulty = await start(8792, { TEST_FAULT: 'import-late', REGISTER_PER_HOUR: '500' });
  limited = await start(8793, { REGISTER_PER_HOUR: '3' });
});
after(() => { servers.forEach((s) => { try { s.child.kill(); } catch (_) { /* gone */ } try { rmSync(s.persist, { recursive: true, force: true }); } catch (_) { /* busy */ } }); });

async function call(server, method, path, body, token, headers) {
  const res = await fetch(server.base + path, { method, headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}, headers || {}), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
  return { status: res.status, json, headers: res.headers, text };
}
async function account(server) {
  const r = await call(server || main, 'POST', '/v1/auth/register', {});
  assert.equal(r.status, 200, r.text);
  return Object.assign({ server: server || main }, r.json.data);
}
let serialSeq = 0;
const CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function uniqueCode() { serialSeq++; return 'T' + CODES[Math.floor(serialSeq / 32) % 32] + CODES[serialSeq % 32] + 'X'; }
function makePackage(count, over) {
  const originCode = (over && over.originCode) || uniqueCode();
  const cards = Object.keys(CATALOG.cards);
  const items = [];
  for (let i = 1; i <= count; i++) items.push({ instanceId: 'inst-' + originCode + '-' + i, cardId: cards[i % cards.length], variantId: i % 7 === 0 ? CATALOG.variants[0] : null, cardSkinId: null, serial: 'CBL-' + originCode + '-' + String(i).padStart(6, '0'), packId: 'standard', pulledAt: Date.UTC(2026, 5, 1) + i * 1000 });
  return Object.assign({ v: 1, app: 'cardable', originCode, packsOpened: count + 3, items }, over || {});
}
const idem = () => 'k-' + randomBytes(10).toString('hex');

test('status is public, versioned and carries no secret; unknown paths answer with a trace id', async () => {
  const r = await call(main, 'GET', '/v1/status');
  assert.equal(r.json.ok, true); assert.equal(r.json.data.service, 'cardable-market-beta'); assert.ok(r.json.data.schema >= 2);
  assert.equal(r.json.data.features.trading, true); assert.ok(r.headers.get('x-trace-id'));
  assert.ok(!JSON.stringify(r.json).includes(SECRET));
  const nf = await call(main, 'GET', '/v1/nope');
  assert.equal(nf.status, 401, 'unknown authenticated paths do not reveal themselves');
  const notV1 = await call(main, 'GET', '/elsewhere');
  assert.equal(notV1.status, 404); assert.equal(notV1.json.error.code, 'not-found'); assert.ok(notV1.json.trace);
  const pre = await fetch(main.base + '/v1/me', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const evil = await fetch(main.base + '/v1/status', { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
});

test('registering gives a private account, a two word alias, tokens and a one-time recovery code', async () => {
  const a = await account();
  assert.match(a.alias, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
  assert.ok(a.accessToken.includes('.') && a.refreshToken.length > 30 && /^[2-9A-Z]{5}(-[2-9A-Z]{5}){3}$/.test(a.recoveryCode));
  const me = await call(main, 'GET', '/v1/me', null, a.accessToken);
  assert.equal(me.json.data.alias, a.alias); assert.equal(me.json.data.imported, false);
  assert.ok(!('id' in me.json.data) && !('email' in me.json.data), 'no private identifier is returned');
  const wallet = await call(main, 'GET', '/v1/wallet', null, a.accessToken);
  assert.equal(wallet.json.data.balance, 0); assert.equal(wallet.json.data.ledger.length, 0);
  const listings = await call(main, 'GET', '/v1/listings', null, a.accessToken);
  assert.deepEqual(listings.json.data.items, []); assert.equal(listings.json.data.emptyReason, 'no-listings');
  const prices = await call(main, 'GET', '/v1/prices', null, a.accessToken);
  assert.deepEqual(prices.json.data.items, []);
});

test('public names are unique across many accounts', async () => {
  const names = new Set();
  for (let i = 0; i < 60; i++) names.add((await account()).alias.toLowerCase());
  assert.equal(names.size, 60);
});

test('a tampered, missing or logged-out token is refused at once', async () => {
  const a = await account();
  assert.equal((await call(main, 'GET', '/v1/me')).status, 401);
  const bad = a.accessToken.slice(0, -2) + (a.accessToken.endsWith('AA') ? 'BB' : 'AA');
  assert.equal((await call(main, 'GET', '/v1/me', null, bad)).status, 401);
  assert.equal((await call(main, 'GET', '/v1/me', null, a.accessToken)).status, 200);
  assert.equal((await call(main, 'POST', '/v1/auth/logout', {}, a.accessToken)).status, 200);
  const after = await call(main, 'GET', '/v1/me', null, a.accessToken);
  assert.equal(after.status, 401); assert.equal(after.json.error.code, 'session-ended');
});

test('refresh rotates the token and a copied old token ends the session', async () => {
  const a = await account();
  const first = await call(main, 'POST', '/v1/auth/refresh', { refreshToken: a.refreshToken });
  assert.equal(first.status, 200);
  assert.notEqual(first.json.data.refreshToken, a.refreshToken);
  assert.equal((await call(main, 'GET', '/v1/me', null, first.json.data.accessToken)).status, 200);
  // the old token is replayed: refused, and it takes the session with it
  assert.equal((await call(main, 'POST', '/v1/auth/refresh', { refreshToken: a.refreshToken })).status, 401);
  const second = await call(main, 'POST', '/v1/auth/refresh', { refreshToken: first.json.data.refreshToken });
  assert.equal(second.status, 401);
  assert.equal((await call(main, 'GET', '/v1/me', null, first.json.data.accessToken)).status, 401);
});

test('the recovery code opens a new session on another device and a wrong one does not', async () => {
  const a = await account();
  const r = await call(main, 'POST', '/v1/auth/recover', { recoveryCode: a.recoveryCode, label: 'Laptop' });
  assert.equal(r.status, 200); assert.equal(r.json.data.alias, a.alias);
  const sessions = await call(main, 'GET', '/v1/auth/sessions', null, r.json.data.accessToken);
  assert.equal(sessions.json.data.sessions.length, 2);
  assert.equal((await call(main, 'POST', '/v1/auth/recover', { recoveryCode: 'AAAAA-AAAAA-AAAAA-AAAAA' })).status, 401);
  assert.equal((await call(main, 'POST', '/v1/auth/recover', { recoveryCode: 'nope' })).status, 400);
});

test('registration is rate limited per network address', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await call(limited, 'POST', '/v1/auth/register', {})).status, 200);
  const r = await call(limited, 'POST', '/v1/auth/register', {});
  assert.equal(r.status, 429); assert.equal(r.json.error.code, 'rate-limited'); assert.ok(r.headers.get('retry-after'));
});

test('import: preview then commit once, with a signed receipt, and the cards appear in the online inventory', async () => {
  const a = await account(), pkg = makePackage(25);
  const p = await call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  assert.equal(p.status, 200, p.text);
  assert.equal(p.json.data.summary.accepted, 25); assert.equal(p.json.data.items.length, 25);
  const key = idem();
  const c = await call(main, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': key });
  assert.equal(c.status, 200, c.text);
  const receipt = c.json.data.receipt;
  assert.equal(receipt.count, 25); assert.ok(receipt.signature.length > 20); assert.equal(c.json.data.replayed, false);
  const inv = await call(main, 'GET', '/v1/inventory?limit=10', null, a.accessToken);
  assert.equal(inv.json.data.total, 25); assert.equal(inv.json.data.items.length, 10); assert.ok(inv.json.data.nextCursor);
  assert.ok(inv.json.data.items.every((i) => i.source === 'legacy-import' && i.state === 'owned' && i.id.startsWith('imp_')), 'server-issued ids');
  const me = await call(main, 'GET', '/v1/me', null, a.accessToken);
  assert.equal(me.json.data.imported, true);
  // a retry with the same key returns the same receipt and changes nothing
  const again = await call(main, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': key });
  assert.equal(again.status, 200); assert.equal(again.json.data.replayed, true); assert.equal(again.json.data.receipt.id, receipt.id);
  assert.equal((await call(main, 'GET', '/v1/inventory', null, a.accessToken)).json.data.total, 25);
  // a second import of anything is refused
  const p2 = await call(main, 'POST', '/v1/import/preview', { package: makePackage(3) }, a.accessToken);
  assert.equal(p2.status, 409); assert.equal(p2.json.error.code, 'already-imported');
  const stored = await call(main, 'GET', '/v1/import/receipt', null, a.accessToken);
  assert.equal(stored.json.data.receipt.id, receipt.id);
});

test('import: a package another account already claimed, and serials already owned, are refused', async () => {
  const a = await account(), b = await account(), pkg = makePackage(10);
  const p = await call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  await call(main, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() });
  const same = await call(main, 'POST', '/v1/import/preview', { package: pkg }, b.accessToken);
  assert.equal(same.status, 409); assert.equal(same.json.error.code, 'package-claimed');
  // an edited copy of the same collection with one extra card: the claimed serials are rejected item by item
  const edited = JSON.parse(JSON.stringify(pkg));
  edited.items.push({ instanceId: 'extra-1', cardId: Object.keys(CATALOG.cards)[0], variantId: null, cardSkinId: null, serial: 'CBL-' + pkg.originCode + '-000999', packId: 'standard', pulledAt: Date.UTC(2026, 5, 2) });
  edited.packsOpened = 40;
  // a save has one player code: a second account cannot import cards claiming it, edited or not
  const ed = await call(main, 'POST', '/v1/import/preview', { package: edited }, b.accessToken);
  assert.equal(ed.status, 409); assert.equal(ed.json.error.code, 'origin-claimed');
});

test('security review: steady traffic in one bucket cannot reset another bucket counter (hourly limits hold)', async () => {
  const a = await account();
  const statuses = [];
  for (let i = 0; i < 8; i++) {
    const c = await call(main, 'POST', '/v1/import/commit', { previewId: 'prv_missing' }, a.accessToken, { 'idempotency-key': idem() });
    statuses.push(c.status);
    assert.equal((await call(main, 'GET', '/v1/me', null, a.accessToken)).status, 200); // a different bucket with a shorter window, in between
  }
  assert.deepEqual(statuses.slice(0, 6), [404, 404, 404, 404, 404, 404]);
  assert.deepEqual(statuses.slice(6), [429, 429], 'the seventh and eighth commit in the hour are limited');
});

test('security review: recovery cannot pile up sessions; the oldest are ended', async () => {
  const a = await account();
  let last;
  for (let i = 0; i < 13; i++) {
    last = await call(main, 'POST', '/v1/auth/recover', { recoveryCode: a.recoveryCode, label: 'Device ' + i }, null, { 'cf-connecting-ip': '10.20.30.' + (i % 2) });
    assert.equal(last.status, 200, last.text);
  }
  const sessions = await call(main, 'GET', '/v1/auth/sessions', null, last.json.data.accessToken);
  assert.equal(sessions.json.data.sessions.filter((s) => s.active).length, 10);
  assert.equal((await call(main, 'GET', '/v1/me', null, a.accessToken)).status, 401, 'the oldest session was ended');
});

test('import: implausible, malformed and damaged packages are refused with a reason', async () => {
  const a = await account();
  const bad = async (pkg) => call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  const many = makePackage(60); many.packsOpened = 5;
  assert.equal((await bad(many)).json.error.code, 'implausible-count');
  assert.equal((await bad({ v: 2, app: 'cardable', items: [] })).json.error.code, 'bad-package');
  assert.equal((await bad({ v: 1, app: 'cardable', originCode: 'ABCD', packsOpened: 5, items: [] })).json.error.code, 'empty-package');
  const dup = makePackage(4); dup.items.push(Object.assign({}, dup.items[0], { instanceId: 'other-id' }));
  assert.equal((await bad(dup)).json.error.code, 'duplicate-in-package');
  const mixed = makePackage(5);
  mixed.items[0].cardId = 'not-a-card'; mixed.items[1].serial = 'CBL-ZZZZ-000002'; mixed.items[2].variantId = 'made-up-finish'; mixed.items[3].pulledAt = 5;
  const m = await bad(mixed);
  assert.equal(m.status, 200); assert.equal(m.json.data.summary.accepted, 1);
  assert.deepEqual(m.json.data.rejected.map((r) => r.reason).sort(), ['bad-finish', 'bad-time', 'serial-code-mismatch', 'unknown-card']);
  const none = makePackage(2); none.items.forEach((i) => { i.cardId = 'zzz'; });
  assert.equal((await bad(none)).json.error.code, 'nothing-eligible');
  const huge = makePackage(5); huge.items.length = 0; for (let i = 0; i < 3001; i++) huge.items.push({ instanceId: 'x' + i });
  assert.equal((await bad(huge)).status, 413);
});

test('simultaneous imports of one collection by two accounts: exactly one wins and no card is duplicated', async () => {
  const a = await account(), b = await account(), pkg = makePackage(30);
  const [pa, pb] = await Promise.all([call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken), call(main, 'POST', '/v1/import/preview', { package: pkg }, b.accessToken)]);
  assert.equal(pa.status, 200); assert.equal(pb.status, 200);
  const [ca, cb] = await Promise.all([
    call(main, 'POST', '/v1/import/commit', { previewId: pa.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() }),
    call(main, 'POST', '/v1/import/commit', { previewId: pb.json.data.previewId }, b.accessToken, { 'idempotency-key': idem() })
  ]);
  const wins = [ca, cb].filter((r) => r.status === 200), losses = [ca, cb].filter((r) => r.status !== 200);
  assert.equal(wins.length, 1, JSON.stringify([ca.text, cb.text]));
  assert.equal(losses.length, 1); assert.equal(losses[0].status, 409);
  const totals = (await Promise.all([a, b].map((x) => call(main, 'GET', '/v1/inventory', null, x.accessToken)))).map((r) => r.json.data.total).sort();
  assert.deepEqual(totals, [0, 30]);
});

test('simultaneous commits by one account import once', async () => {
  const a = await account(), pkg = makePackage(12);
  const p = await call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  const results = await Promise.all([1, 2, 3, 4].map(() => call(main, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() })));
  assert.equal(results.filter((r) => r.status === 200).length, 1, results.map((r) => r.status + ' ' + (r.json && r.json.error && r.json.error.code)).join(', '));
  assert.equal((await call(main, 'GET', '/v1/inventory', null, a.accessToken)).json.data.total, 12);
});

test('an interrupted import leaves nothing behind and the account can still import', async () => {
  const a = await account(faulty), pkg = makePackage(8);
  const p = await call(faulty, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  const c = await call(faulty, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() });
  assert.equal(c.status, 500); assert.equal(c.json.error.code, 'import-failed');
  assert.equal((await call(faulty, 'GET', '/v1/inventory', null, a.accessToken)).json.data.total, 0);
  assert.equal((await call(faulty, 'GET', '/v1/me', null, a.accessToken)).json.data.imported, false);
  assert.equal((await call(faulty, 'GET', '/v1/import/receipt', null, a.accessToken)).status, 404);
  const rows = JSON.parse(run(['d1', 'execute', 'cardable-market-beta-db', '--local', '--persist-to', faulty.persist, '--json', '--command', 'SELECT (SELECT COUNT(*) FROM instances) AS i, (SELECT COUNT(*) FROM imports) AS m']));
  assert.deepEqual(rows[0].results[0], { i: 0, m: 0 });
});

test('accounts cannot see or use each other\'s data', async () => {
  const a = await account(), b = await account(), pkg = makePackage(6);
  const p = await call(main, 'POST', '/v1/import/preview', { package: pkg }, a.accessToken);
  await call(main, 'POST', '/v1/import/commit', { previewId: p.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() });
  assert.equal((await call(main, 'GET', '/v1/inventory', null, b.accessToken)).json.data.total, 0);
  assert.equal((await call(main, 'GET', '/v1/import/receipt', null, b.accessToken)).status, 404);
  // another account's preview id is not found, and a deleted session cannot revoke someone else's session
  const q = await call(main, 'POST', '/v1/import/preview', { package: makePackage(3) }, a.accessToken);
  assert.equal(q.status, 409);
  const pb = await call(main, 'POST', '/v1/import/preview', { package: makePackage(4) }, b.accessToken);
  const steal = await call(main, 'POST', '/v1/import/commit', { previewId: pb.json.data.previewId }, a.accessToken, { 'idempotency-key': idem() });
  assert.equal(steal.status, 404);
  const sessions = await call(main, 'GET', '/v1/auth/sessions', null, a.accessToken);
  const theirs = (await call(main, 'GET', '/v1/auth/sessions', null, b.accessToken)).json.data.sessions[0].id;
  assert.equal((await call(main, 'DELETE', '/v1/auth/sessions/' + theirs, null, a.accessToken)).json.data.revoked, false);
  assert.ok(sessions.json.data.sessions.length >= 1);
});

test('the database enforces its own rules: negative balances, duplicate serials, bad formats, orphan rows', async () => {
  const sql = (command) => { try { run(['d1', 'execute', 'cardable-market-beta-db', '--local', '--persist-to', main.persist, '--command', command]); return null; } catch (e) { return String(e.stderr || e.message); } };
  const a = await account();
  const rows = JSON.parse(run(['d1', 'execute', 'cardable-market-beta-db', '--local', '--persist-to', main.persist, '--json', '--command', "SELECT id FROM accounts WHERE alias = '" + a.alias + "'"]));
  const id = rows[0].results[0].id;
  assert.match(sql("UPDATE wallets SET balance = -1 WHERE account_id = '" + id + "'") || '', /CHECK|constraint/i);
  assert.match(sql("UPDATE wallets SET held = 5 WHERE account_id = '" + id + "'") || '', /CHECK|constraint/i);
  assert.match(sql("INSERT INTO listings (id, seller_id, kind, status, price, card_id, rarity, item_count, items, created_at, ends_at, first_ends_at) VALUES ('l1', '" + id + "', 'dutch', 'active', 1, 'x', 'basic', 1, '[]', 1, 2, 2)") || '', /CHECK|constraint/i);
  assert.match(sql("INSERT INTO instances (id, owner_id, card_id, serial, origin_code, source, created_at) VALUES ('i1', 'acct_missing', 'x', 'CBL-AAAA-000001', 'AAAA', 'legacy-import', 1)") || '', /FOREIGN|constraint/i);
  assert.equal(sql("INSERT INTO instances (id, owner_id, card_id, serial, origin_code, source, created_at) VALUES ('i2', '" + id + "', 'x', 'CBL-UNIQ-000001', 'UNIQ', 'online-pack', 1)"), null);
  assert.match(sql("INSERT INTO instances (id, owner_id, card_id, serial, origin_code, source, created_at) VALUES ('i3', '" + id + "', 'x', 'CBL-UNIQ-000001', 'UNIQ', 'online-pack', 1)") || '', /UNIQUE|constraint/i);
  assert.match(sql("INSERT INTO ledger (account_id, at, delta, reason, balance_after) VALUES ('" + id + "', 1, 0, 'x', 0)") || '', /CHECK|constraint/i);
  assert.match(sql("INSERT INTO accounts (id, alias, created_at, recovery_hash) VALUES ('acct_dup', '" + a.alias.toUpperCase() + "', 1, 'h')") || '', /UNIQUE|constraint/i);
});

test('errors carry a code and a trace id and never a stack', async () => {
  const r = await call(main, 'POST', '/v1/auth/register', null, null, { 'content-type': 'application/json' });
  assert.equal(r.status, 200);
  const bad = await fetch(main.base + '/v1/auth/refresh', { method: 'POST', body: '{nope' });
  const body = await bad.json();
  assert.equal(bad.status, 400); assert.equal(body.error.code, 'bad-json'); assert.ok(body.trace);
  assert.ok(!/at .*\.js/.test(JSON.stringify(body)));
});

// Last on purpose: the local dev proxy drops the next request after an aborted upload (a dev-proxy artifact, not the Worker).
test('security review: a request body is cut off at its limit even when it is chunked and has no length', async () => {
  const big = new TextEncoder().encode('{"label":"' + 'x'.repeat(9000) + '"}');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < big.length; i += 1000) controller.enqueue(big.slice(i, i + 1000)); controller.close(); } });
  const res = await fetch(main.base + '/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error.code, 'too-large');
});
