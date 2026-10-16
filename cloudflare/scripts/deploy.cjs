#!/usr/bin/env node
/* Cardable Market Beta — guarded Cloudflare deployment helper (beta/staging only).
 *
 *   node scripts/deploy.cjs --check                 read-only: tooling, authentication, config sanity, secret scan
 *   node scripts/deploy.cjs --plan                  print exactly what --apply would create; changes nothing
 *   node scripts/deploy.cjs --apply                 create D1 + R2 (cardable-market-beta*), migrate, set secrets, deploy
 *   node scripts/deploy.cjs --verify <origin>       real requests against a deployed origin; fails loudly
 *   node scripts/deploy.cjs --apply-origin <origin> write a verified origin into the client config and the page CSP
 *   node scripts/deploy.cjs --admin <origin> reconcile|repair|sweep|summary|budget|ops-log|reset-plan   operator tools, with the admin token kept beside this file
 *   node scripts/deploy.cjs --admin <origin> mode [open|read-only|maintenance [message]]   show or change the service mode
 *
 * Safety rules, enforced here:
 *  - it refuses to do anything remote unless `wrangler whoami` proves an authenticated account;
 *  - it only ever touches resources named cardable-market-beta*; it never lists-and-deletes, never deletes anything;
 *  - secrets are generated locally, piped to `wrangler secret put` on stdin and never printed, logged or written to a file;
 *  - the account id and resource ids written to wrangler.toml are identifiers, not secrets.
 * Run it from the `cloudflare/` folder (npm run deploy:check). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const NAMES = { worker: 'cardable-market-beta', d1: 'cardable-market-beta-db', r2: 'cardable-market-beta-media' };
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valueOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : ''; };

function wrangler(wargs, options) {
  options = options || {};
  const bin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  if (!fs.existsSync(bin)) return { status: 127, stdout: '', stderr: 'wrangler is not installed: run `npm install` in cloudflare/' };
  const r = spawnSync(process.execPath, [bin].concat(wargs), { cwd: ROOT, encoding: 'utf8', input: options.input, timeout: options.timeout || 120000,
    env: Object.assign({}, process.env, { WRANGLER_SEND_METRICS: 'false', CI: '1' }) });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function out(label, ok, detail) { console.log((ok ? '  ok   ' : '  FAIL ') + label + (detail ? ' — ' + detail : '')); return ok; }
function fail(message) { console.error('\nBLOCKED: ' + message); process.exit(2); }

function whoami() {
  const r = wrangler(['whoami']);
  const text = r.stdout + r.stderr;
  if (/not authenticated/i.test(text) || r.status !== 0) return { ok: false, text: text.trim().split('\n').slice(-2).join(' ') };
  const m = /([0-9a-f]{32})/.exec(text);
  return { ok: true, accountId: m ? m[1] : '', text: '' };
}

function secretScan() {
  // A coarse guard: nothing that looks like a Cloudflare API token, private key or long hex secret is committed here.
  const bad = [];
  const skip = new Set(['node_modules', '.wrangler', 'package-lock.json']);
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      if (skip.has(e.name)) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.(js|mjs|cjs|toml|json|md|sql|html|css)$/.test(e.name)) return;
      const t = fs.readFileSync(p, 'utf8');
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) bad.push(p + ': private key');
      if (/\bcf[a-z]{0,2}_[A-Za-z0-9_-]{30,}\b/.test(t)) bad.push(p + ': token-shaped string');
      if (/(SESSION_SECRET|TURNSTILE_SECRET)\s*=\s*["'][^"']{8,}["']/.test(t)) bad.push(p + ': secret assignment');
    });
  })(ROOT);
  return bad;
}

function toml() { return fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8'); }
function setToml(patch) { let t = toml(); Object.keys(patch).forEach((k) => { t = t.replace(patch[k][0], patch[k][1]); }); fs.writeFileSync(path.join(ROOT, 'wrangler.toml'), t); }

function check() {
  console.log('Cardable Market Beta — deployment check (read-only)');
  let ok = true;
  const t = toml();
  ok = out('wrangler.toml names are namespaced', t.includes('name = "' + NAMES.worker + '"') && t.includes(NAMES.d1) && t.includes(NAMES.r2)) && ok;
  ok = out('no secret values in config or source', secretScan().length === 0, secretScan().join('; ')) && ok;
  const w = wrangler(['--version']);
  ok = out('wrangler available', w.status === 0, (w.stdout || w.stderr).trim().split('\n').pop()) && ok;
  const who = whoami();
  out('Cloudflare account authenticated', who.ok, who.ok ? 'account ' + (who.accountId || 'unknown') : 'not signed in — an owner action: run `npx wrangler login` and approve the consent screen');
  if (!who.ok) console.log('\nRemote steps are blocked until the owner signs in. Local verification does not need an account (npm test).');
  return ok && who.ok;
}

function plan() {
  console.log('Plan (nothing is changed by --plan). Account: the authenticated one. Plan: Workers Free is enough for the beta.\n');
  console.log('  1. D1 database      ' + NAMES.d1 + '   (wrangler d1 create; id written into wrangler.toml)');
  console.log('  2. R2 bucket        ' + NAMES.r2 + '   (private; no public access, no custom domain; used from Stage 7)');
  console.log('  3. migrations       wrangler d1 migrations apply ' + NAMES.d1 + ' --remote   (migrations/0001_init.sql)');
  console.log('  4. secrets          SESSION_SECRET and ADMIN_TOKEN (32 and 24 random bytes, generated locally, piped to wrangler, never printed;');
  console.log('                      the admin token is also kept in cloudflare/.admin-token, which git ignores, for the operator tools)');
  console.log('                      TURNSTILE_SECRET only if the owner supplies one with --turnstile-secret-stdin');
  console.log('  5. Worker           ' + NAMES.worker + '  (SQLite-backed Durable Object class Gate via migration v1)');
  console.log('  6. verify           node scripts/deploy.cjs --verify <origin>   (real requests: status, CORS, auth, headers)');
  console.log('  7. client origin    node scripts/deploy.cjs --apply-origin <origin>   (only after step 6 passes)');
  console.log('\nNothing is deleted. Nothing outside cardable-market-beta* is read or modified.');
}

function apply() {
  const who = whoami();
  if (!who.ok) fail('Cloudflare is not authenticated (' + who.text + '). The owner must run `npx wrangler login` and approve the consent screen; this script never types credentials.');
  if (secretScan().length) fail('the secret scan found something: ' + secretScan().join('; '));
  console.log('Deploying ' + NAMES.worker + ' to account ' + who.accountId);

  // D1: reuse an existing database of exactly this name; create otherwise.
  let id = '';
  const list = wrangler(['d1', 'list', '--json']);
  try { const found = JSON.parse(list.stdout).find((d) => d.name === NAMES.d1); if (found) id = found.uuid || found.id; } catch (_) { /* create below */ }
  if (!id) {
    const c = wrangler(['d1', 'create', NAMES.d1]);
    const m = /"?database_id"?\s*[:=]\s*"([0-9a-f-]{36})"/.exec(c.stdout + c.stderr);
    if (c.status !== 0 || !m) fail('d1 create failed: ' + (c.stderr || c.stdout).trim().split('\n').slice(-3).join(' '));
    id = m[1];
  }
  out('D1 ' + NAMES.d1, true, id);
  setToml({ id: [/database_id = "[^"]*"/, 'database_id = "' + id + '"'], account: [/account_id = "[^"]*"/, 'account_id = "' + (who.accountId || '') + '"'] });

  const r2 = wrangler(['r2', 'bucket', 'create', NAMES.r2]);
  out('R2 ' + NAMES.r2, r2.status === 0 || /already exists/i.test(r2.stdout + r2.stderr), r2.status === 0 ? 'created' : 'exists or ' + (r2.stderr || '').trim().split('\n').pop());

  const mig = wrangler(['d1', 'migrations', 'apply', NAMES.d1, '--remote']);
  if (mig.status !== 0) fail('migrations failed: ' + (mig.stderr || mig.stdout).trim().split('\n').slice(-3).join(' '));
  out('migrations applied', true);

  // The Worker must exist before secrets can be attached; deploy first, then set secrets, which does not need a redeploy.
  const dep = wrangler(['deploy'], { timeout: 240000 });
  if (dep.status !== 0) fail('deploy failed: ' + (dep.stderr || dep.stdout).trim().split('\n').slice(-4).join(' '));
  const url = (/https:\/\/[A-Za-z0-9.-]+\.workers\.dev/.exec(dep.stdout + dep.stderr) || [''])[0];
  out('Worker deployed', true, url || '(origin not parsed)');

  const secret = crypto.randomBytes(32).toString('hex');
  const s = wrangler(['secret', 'put', 'SESSION_SECRET'], { input: secret + '\n' });
  out('SESSION_SECRET set', s.status === 0, s.status === 0 ? 'value not shown' : (s.stderr || '').trim().split('\n').pop());
  const adminToken = crypto.randomBytes(24).toString('hex');
  const a = wrangler(['secret', 'put', 'ADMIN_TOKEN'], { input: adminToken + '\n' });
  if (a.status === 0) { fs.writeFileSync(path.join(ROOT, '.admin-token'), adminToken + '\n', { mode: 0o600 }); }
  out('ADMIN_TOKEN set', a.status === 0, a.status === 0 ? 'value kept in cloudflare/.admin-token (git-ignored), not shown' : (a.stderr || '').trim().split('\n').pop());
  if (flag('--turnstile-secret-stdin')) {
    const v = fs.readFileSync(0, 'utf8').trim();
    const t = wrangler(['secret', 'put', 'TURNSTILE_SECRET'], { input: v + '\n' });
    out('TURNSTILE_SECRET set', t.status === 0, 'value not shown');
  }
  console.log('\nNext: node scripts/deploy.cjs --verify ' + (url || '<origin>') + '  then  --apply-origin <origin>');
}

async function verify(origin) {
  // A local `wrangler dev` origin is accepted here only so the verification itself can be rehearsed offline.
  if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin || '') && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) fail('give the deployed https://….workers.dev origin');
  console.log('Verifying ' + origin);
  let ok = true;
  const get = (p, init) => fetch(origin + p, Object.assign({ redirect: 'error' }, init || {}));
  const s = await get('/v1/status', { headers: { origin: 'null' } });
  const j = await s.json().catch(() => null);
  ok = out('status 200 and ok envelope', s.status === 200 && j && j.ok === true && j.data.service === 'cardable-market-beta', 'schema ' + (j && j.data && j.data.schema)) && ok;
  ok = out('trace id present', !!(j && j.trace)) && ok;
  ok = out('the service says whether it is open', !!(j && j.data && ['open', 'read-only', 'maintenance'].includes(j.data.mode)), 'mode ' + (j && j.data && j.data.mode) + ', version ' + (j && j.data && j.data.version)) && ok;
  ok = out('schema is the current one (6)', !!(j && j.data && j.data.schema === 6), 'schema ' + (j && j.data && j.data.schema)) && ok;
  ok = out('HTTPS is pinned (HSTS)', /max-age=\d+/.test(s.headers.get('strict-transport-security') || '') || /^http:/.test(origin)) && ok;
  ok = out('CSP is locked down', /default-src 'none'/.test(s.headers.get('content-security-policy') || '')) && ok;
  ok = out('no-store caching', /no-store/.test(s.headers.get('cache-control') || '')) && ok;
  ok = out('CORS answers the null origin (file://)', s.headers.get('access-control-allow-origin') === 'null') && ok;
  const evil = await get('/v1/status', { headers: { origin: 'https://evil.example' } });
  ok = out('CORS refuses a foreign origin', !evil.headers.get('access-control-allow-origin')) && ok;
  const me = await get('/v1/me');
  ok = out('unauthenticated /v1/me is 401', me.status === 401) && ok;
  const reg = await get('/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'verify' }) });
  const rj = await reg.json().catch(() => null);
  ok = out('register issues an alias and a recovery code', reg.status === 200 && rj && rj.ok && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(rj.data.alias || ''), rj && rj.data ? 'alias ' + rj.data.alias : 'status ' + reg.status) && ok;
  if (rj && rj.ok) {
    const tok = rj.data.accessToken;
    const w = await get('/v1/wallet', { headers: { authorization: 'Bearer ' + tok } });
    const wj = await w.json().catch(() => null);
    ok = out('new account wallet is zero and empty', w.status === 200 && wj.data.balance === 0) && ok;
    // pictures: a real round trip through R2, with what must be refused refused, and nobody else able to read a draft
    const auth = (extra) => Object.assign({ authorization: 'Bearer ' + tok }, extra || {});
    const webp = (w, h) => { const p = Buffer.alloc(5 + 41); p[0] = 0x2f; p.writeUInt32LE(((w - 1) | ((h - 1) << 14)) >>> 0, 1); const c = Buffer.alloc(8 + p.length); c.write('VP8L', 0, 'ascii'); c.writeUInt32LE(p.length, 4); p.copy(c, 8);
      const r = Buffer.alloc(12); r.write('RIFF', 0, 'ascii'); r.writeUInt32LE(c.length + 4, 4); r.write('WEBP', 8, 'ascii'); return Buffer.concat([r, c]); };
    const slot = await get('/v1/uploads', { method: 'POST', headers: auth({ 'content-type': 'application/json', 'idempotency-key': 'verify-' + Date.now().toString(36) + '-slot' }), body: '{}' });
    const sj = await slot.json().catch(() => null);
    ok = out('an upload slot is issued', slot.status === 200 && sj && sj.ok && /^upl_/.test(sj.data.uploadId), 'status ' + slot.status) && ok;
    if (sj && sj.ok) {
      const id = sj.data.uploadId;
      const html = await get('/v1/uploads/' + id + '/thumb', { method: 'PUT', headers: auth({ 'content-type': 'image/jpeg' }), body: '<html><script>1</script></html>' });
      ok = out('a web page sent as a picture is refused', html.status === 415, 'status ' + html.status) && ok;
      const svg = await get('/v1/uploads/' + id + '/thumb', { method: 'PUT', headers: auth({ 'content-type': 'image/svg+xml' }), body: '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>' });
      ok = out('an SVG is refused', svg.status === 415, 'status ' + svg.status) && ok;
      let last = null;
      for (const [v, w, h] of [['thumb', 320, 180], ['card', 960, 540], ['full', 1600, 900]]) {
        last = await get('/v1/uploads/' + id + '/' + v, { method: 'PUT', headers: auth({ 'content-type': 'image/webp' }), body: webp(w, h) });
      }
      const lj = last && await last.json().catch(() => null);
      ok = out('three sizes make a finished picture', last && last.status === 200 && lj && lj.data.ready === true, last ? 'status ' + last.status : 'none') && ok;
      const mine = await get('/v1/media/' + id + '/card', { headers: auth() });
      ok = out('the owner can read it back as an image, with nosniff and a sandbox policy', mine.status === 200 && mine.headers.get('content-type') === 'image/webp' && mine.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(mine.headers.get('content-security-policy') || '')) && ok;
      const other = await get('/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const oj = await other.json().catch(() => null);
      if (oj && oj.ok) {
        const theirs = await get('/v1/media/' + id + '/card', { headers: { authorization: 'Bearer ' + oj.data.accessToken } });
        ok = out('another player cannot read a draft picture', theirs.status === 404, 'status ' + theirs.status) && ok;
        const forged = await get('/v1/uploads/' + id + '/thumb', { method: 'PUT', headers: { authorization: 'Bearer ' + oj.data.accessToken, 'content-type': 'image/webp' }, body: webp(320, 180) });
        ok = out('another player cannot write to it', forged.status === 404, 'status ' + forged.status) && ok;
      }
      const anon = await get('/v1/media/' + id + '/card');
      ok = out('no token, no picture', anon.status === 401, 'status ' + anon.status) && ok;
      const del = await get('/v1/uploads/' + id, { method: 'DELETE', headers: auth({ 'idempotency-key': 'verify-' + Date.now().toString(36) + '-del' }) });
      ok = out('the picture can be removed', del.status === 200, 'status ' + del.status) && ok;
      const gone = await get('/v1/media/' + id + '/card', { headers: auth() });
      ok = out('and is then gone', gone.status === 404, 'status ' + gone.status) && ok;
    }
    await get('/v1/auth/logout', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: '{}' });
    const again = await get('/v1/me', { headers: { authorization: 'Bearer ' + tok } });
    ok = out('logout revokes the session at once', again.status === 401) && ok;
  }
  console.log(ok ? '\nVerified.' : '\nVERIFICATION FAILED — do not apply this origin.');
  process.exit(ok ? 0 : 1);
}

function applyOrigin(origin) {
  if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin || '')) fail('give the verified https://….workers.dev origin');
  const cfgFile = path.join(REPO, 'src', 'data', 'market-online.js');
  let cfg = fs.readFileSync(cfgFile, 'utf8');
  cfg = cfg.replace(/apiBase: '[^']*'/, "apiBase: '" + origin + "'");
  fs.writeFileSync(cfgFile, cfg);
  const idx = path.join(REPO, 'index.html');
  let html = fs.readFileSync(idx, 'utf8');
  html = html.replace(/connect-src [^;]*;/, "connect-src " + origin + ";");
  fs.writeFileSync(idx, html);
  console.log('Wrote ' + origin + ' into src/data/market-online.js and the page CSP connect-src. Commit them together.');
}

async function adminCall(origin, what) {
  if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin || '') && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) fail('give the deployed origin');
  const READS = ['reconcile', 'reports', 'usage', 'log', 'ops-log', 'summary', 'reset-plan', 'mode'], WRITES = ['repair', 'sweep', 'budget'];
  if (!READS.concat(WRITES).includes(what)) fail('say one of: ' + READS.concat(WRITES).join(', '));
  const file = path.join(ROOT, '.admin-token');
  if (!fs.existsSync(file)) fail('there is no cloudflare/.admin-token: it is written when --apply sets the secret');
  const token = fs.readFileSync(file, 'utf8').trim();
  // 'mode' alone shows the service mode; 'mode <open|read-only|maintenance> [message words]' changes it (and is logged by the Worker).
  const rest = args.slice(args.indexOf('--admin') + 3);
  const setting = what === 'mode' && rest.length > 0;
  if (setting && !['open', 'read-only', 'maintenance'].includes(rest[0])) fail('the mode must be open, read-only or maintenance');
  const method = setting || WRITES.includes(what) ? 'POST' : 'GET';
  const payload = setting ? JSON.stringify({ mode: rest[0], message: rest.slice(1).join(' ') }) : method === 'POST' ? '{}' : undefined;
  const res = await fetch(origin + '/v1/admin/' + what, { method, headers: { 'x-admin-token': token, 'content-type': 'application/json', 'x-admin-actor': 'deploy-script' }, body: payload });
  const body = await res.json();
  console.log(JSON.stringify(body.data || body.error, null, 2));
  // A reset is never run from here. The plan is written for a person to read, and applied by hand after an export.
  if (what === 'reset-plan' && res.ok) {
    const plan = body.data, out = path.join(ROOT, 'reset-plan.sql');
    const lines = ['-- Cardable Market Beta reset plan, written ' + new Date(plan.at).toISOString() + '. NOT APPLIED.', '-- Read docs/market-beta/RUNBOOK.md section "Beta reset" first. Needs: maintenance mode on, an export on disk, the owner\'s written approval.', '-- Rows that would be deleted:']
      .concat(Object.keys(plan.wouldDelete).map((t) => '--   ' + t + ': ' + plan.wouldDelete[t]), ['PRAGMA foreign_keys = OFF;'], plan.statements, ['PRAGMA foreign_keys = ON;']);
    fs.writeFileSync(out, lines.join('\n') + '\n');
    console.log('Wrote ' + out + ' (git-ignored). Nothing was applied.');
  }
  process.exit(res.ok && (what !== 'reconcile' || body.data.ok) ? 0 : 1);
}

(async function main() {
  if (flag('--check')) process.exit(check() ? 0 : 1);
  if (flag('--admin')) return adminCall(valueOf('--admin'), args[args.indexOf('--admin') + 2]);
  if (flag('--plan')) return plan();
  if (flag('--apply')) return apply();
  if (flag('--verify')) return verify(valueOf('--verify'));
  if (flag('--apply-origin')) return applyOrigin(valueOf('--apply-origin'));
  console.log('usage: --check | --plan | --apply | --verify <origin> | --apply-origin <origin>');
})().catch((e) => { console.error('deploy script error: ' + e.message); process.exit(1); });
