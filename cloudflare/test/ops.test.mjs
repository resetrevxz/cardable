// Stage 8: the service mode (open, read-only, maintenance), the operator's reports and the reset dry-run, against the real
// Worker on the local Workers runtime. A paused service must refuse in the right way, keep everyone signed in where it
// promised to, and come back exactly as it was.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { admin, call, player, sql, start, stopAll } from './helpers.mjs';

let server;
before(async () => { server = await start(8861, {}); });
after(() => stopAll());

const mode = (m, message) => admin(server, 'POST', '/v1/admin/mode', { mode: m, message });

test('the service starts open and says so on the public status page', async () => {
  const s = await call(server, 'GET', '/v1/status');
  assert.equal(s.status, 200);
  assert.equal(s.data.mode, 'open');
  assert.equal(s.data.version, '1.0.0-beta');
  assert.equal(s.data.schema, 6);
});

test('the operator route answers 404 without the token and the mode cannot be changed by a player', async () => {
  const p = await player(server);
  const anon = await call(server, 'POST', '/v1/admin/mode', { mode: 'maintenance' }, null, { key: null });
  assert.equal(anon.status, 404);
  const asPlayer = await call(server, 'POST', '/v1/admin/mode', { mode: 'maintenance' }, p.token, { key: null });
  assert.equal(asPlayer.status, 404);
  assert.equal((await call(server, 'GET', '/v1/status')).data.mode, 'open');
});

test('read-only: reads answer, writes are refused with a stable code, a sign-in refresh still works', async () => {
  const p = await player(server);
  assert.equal((await mode('read-only', 'Checking the books.')).status, 200);
  const s = await call(server, 'GET', '/v1/status');
  assert.equal(s.data.mode, 'read-only');
  assert.match(s.data.message, /books/);
  assert.equal((await call(server, 'GET', '/v1/wallet', null, p.token)).status, 200);
  assert.equal((await call(server, 'GET', '/v1/listings', null, p.token)).status, 200);
  const write = await call(server, 'PUT', '/v1/settings', { notifyBids: false }, p.token);
  assert.equal(write.status, 503);
  assert.equal(write.error.code, 'read-only');
  assert.ok(write.error.detail.retryAfter > 0);
  const reg = await call(server, 'POST', '/v1/auth/register', {}, null, { key: null });
  assert.equal(reg.status, 503);
  const ref = await call(server, 'POST', '/v1/auth/refresh', { refreshToken: p.refreshToken }, null, { key: null });
  assert.notEqual(ref.status, 503, 'a refresh is not refused by the pause');
});

test('maintenance: everything but the status page and the operator is refused, and nothing is lost', async () => {
  await mode('open', '');
  const p = await player(server);
  const before = await call(server, 'GET', '/v1/wallet', null, p.token);
  assert.equal((await mode('maintenance', 'Back soon.')).status, 200);
  for (const [method, path] of [['GET', '/v1/wallet'], ['GET', '/v1/listings'], ['PUT', '/v1/settings'], ['POST', '/v1/auth/register'], ['POST', '/v1/auth/refresh']]) {
    const r = await call(server, method, path, method === 'GET' ? null : {}, p.token, { key: method === 'GET' ? undefined : 'k-m-' + path });
    assert.equal(r.status, 503, method + ' ' + path);
    assert.equal(r.error.code, 'maintenance');
  }
  const s = await call(server, 'GET', '/v1/status');
  assert.equal(s.status, 200);
  assert.equal(s.data.mode, 'maintenance');
  assert.equal((await admin(server, 'GET', '/v1/admin/reconcile')).status, 200, 'the operator can still look');
  assert.equal((await mode('open', '')).status, 200);
  const after = await call(server, 'GET', '/v1/wallet', null, p.token);
  assert.equal(after.status, 200);
  assert.equal(after.data.balance, before.data.balance);
});

test('an unknown mode is refused and every change is in the operator log', async () => {
  assert.equal((await mode('turbo')).status, 400);
  const log = await admin(server, 'GET', '/v1/admin/ops-log');
  assert.equal(log.status, 200);
  const modes = log.data.items.map((i) => JSON.parse(i.detail).mode);
  assert.deepEqual(modes.slice(0, 4), ['open', 'maintenance', 'open', 'read-only'], 'newest first');
  assert.ok(log.data.items.every((i) => i.action === 'mode' && i.actor));
});

test('the summary and the reset dry-run change nothing and list no personal detail', async () => {
  await mode('open', '');
  await player(server, { cards: 2, credits: 500 });
  const rowsBefore = JSON.stringify(sql(server, 'SELECT (SELECT COUNT(*) FROM accounts) a, (SELECT COUNT(*) FROM wallets) w, (SELECT COUNT(*) FROM instances) i, (SELECT COUNT(*) FROM ledger) l'));
  const sum = await admin(server, 'GET', '/v1/admin/summary');
  assert.equal(sum.status, 200);
  assert.ok(sum.data.rows.accounts >= 3);
  assert.ok(sum.data.credits.inWallets >= 500);
  const plan = await admin(server, 'GET', '/v1/admin/reset-plan');
  assert.equal(plan.status, 200);
  assert.equal(plan.data.dryRun, true);
  assert.equal(plan.data.executed, false);
  assert.ok(plan.data.statements.includes('DELETE FROM accounts;'));
  assert.ok(!plan.data.statements.some((s) => /moderation_log|ops_log|schema_info/.test(s)), 'the audit trail and schema record are kept');
  assert.equal(plan.data.wouldDelete.accounts, sum.data.rows.accounts);
  assert.ok(Object.values(plan.data.wouldDelete).every((n) => Number.isInteger(n)), 'every table in the plan exists: ' + JSON.stringify(plan.data.wouldDelete));
  assert.ok(Object.values(sum.data.rows).every((n) => Number.isInteger(n)), 'every table in the summary exists');
  const real = sql(server, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations'").map((r) => r.name);
  const named = Object.keys(plan.data.wouldDelete).concat(Object.keys(plan.data.wouldKeep));
  assert.deepEqual(real.filter((t) => !named.includes(t)), [], 'a reset plan that forgets a table would leave orphans behind');
  assert.ok(!/alias|token|serial/i.test(JSON.stringify(sum.data.rows)));
  const rowsAfter = JSON.stringify(sql(server, 'SELECT (SELECT COUNT(*) FROM accounts) a, (SELECT COUNT(*) FROM wallets) w, (SELECT COUNT(*) FROM instances) i, (SELECT COUNT(*) FROM ledger) l'));
  assert.equal(rowsAfter, rowsBefore);
});

test('the daily circuit breaker pauses writes on its own, says why, and opens again at the next UTC day', async () => {
  const small = await start(8862, { DAILY_EVENT_BUDGET: '6' });
  const DAY = 86400000, t0 = Math.floor(Date.now() / DAY) * DAY + 3600000;
  const first = await admin(small, 'POST', '/v1/admin/budget', null, t0);
  assert.equal(first.data.used, 0);
  assert.equal(first.data.tripped, false);
  const a = await player(small, { cards: 2, credits: 400 });
  await player(small, { credits: 400 });
  await player(small, { credits: 400 });
  const second = await admin(small, 'POST', '/v1/admin/budget', null, t0 + 1800000);
  assert.ok(second.data.used >= 6, 'the events were counted: ' + JSON.stringify(second.data));
  assert.equal(second.data.tripped, true);
  assert.equal(second.data.mode, 'read-only');
  const status = await call(small, 'GET', '/v1/status');
  assert.match(status.data.message, /^Daily capacity reached/);
  const write = await call(small, 'PUT', '/v1/settings', { notifyBids: false }, a.token);
  assert.equal(write.status, 503);
  assert.equal(write.error.code, 'read-only');
  assert.equal((await call(small, 'GET', '/v1/wallet', null, a.token)).status, 200, 'looking still works');
  const again = await admin(small, 'POST', '/v1/admin/budget', null, t0 + 2400000);
  assert.equal(again.data.tripped, false, 'it trips once, not on every look');
  const nextDay = await admin(small, 'POST', '/v1/admin/budget', null, t0 + DAY);
  assert.equal(nextDay.data.reopened, true);
  assert.equal(nextDay.data.mode, 'open');
  assert.equal(nextDay.data.used, 0);
  assert.equal((await call(small, 'PUT', '/v1/settings', { notifyBids: false }, a.token)).status, 200, 'writes are back');
  const log = await admin(small, 'GET', '/v1/admin/ops-log');
  assert.ok(log.data.items.some((i) => i.actor === 'circuit-breaker'), 'the breaker is in the log under its own name');
});

test('read-only means a look changes nothing: an ended auction is not settled by anyone opening it, and the sweep waits', async () => {
  await mode('open', '');
  const seller = await player(server, { cards: 2, credits: 0 }), buyer = await player(server, { cards: 0, credits: 5000 });
  const T = Date.now() + 3600000, HOUR = 3600000, id0 = seller.cards[0].id;
  const made = await call(server, 'POST', '/v1/listings', { kind: 'auction', instanceIds: [id0], start: 30, durationMs: HOUR }, seller.token, { at: T });
  assert.equal(made.status, 200, made.text);
  const id = made.data.listingId;
  assert.equal((await call(server, 'POST', '/v1/listings/' + id + '/bid', { max: 100 }, buyer.token, { at: T + 600000 })).status, 200);
  await mode('read-only', 'Looking after the books.');
  const end = T + HOUR + 5000;
  const look = await call(server, 'GET', '/v1/listings/' + id, null, buyer.token, { at: end });
  assert.equal(look.status, 200);
  assert.equal(sql(server, "SELECT status FROM listings WHERE id = '" + id + "'")[0].status, 'active', 'opening it did not settle it');
  assert.equal(sql(server, "SELECT COUNT(*) AS n FROM trades WHERE listing_id = '" + id + "'")[0].n, 0);
  await mode('open', '');
  const look2 = await call(server, 'GET', '/v1/listings/' + id, null, buyer.token, { at: end });
  assert.equal(look2.status, 200);
  assert.equal(sql(server, "SELECT status FROM listings WHERE id = '" + id + "'")[0].status, 'sold', 'once open again, the same look settles it exactly once');
  assert.equal(sql(server, "SELECT COUNT(*) AS n FROM trades WHERE listing_id = '" + id + "'")[0].n, 1);
});
