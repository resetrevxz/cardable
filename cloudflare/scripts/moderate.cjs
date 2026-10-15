#!/usr/bin/env node
'use strict';
// The operator's moderation tool for the Market beta. It talks to the Worker's admin routes with the ADMIN_TOKEN that
// `deploy.cjs --apply` wrote to the git-ignored cloudflare/.admin-token (or the ADMIN_TOKEN environment variable). The
// token never appears in output. Every action needs a reason; it is sent to the player and written to the audit log.
//
//   node scripts/moderate.cjs <origin> reports [open|actioned|dismissed]
//   node scripts/moderate.cjs <origin> log [limit]
//   node scripts/moderate.cjs <origin> usage
//   node scripts/moderate.cjs <origin> remove-comment <cmt_id>   "<reason>"
//   node scripts/moderate.cjs <origin> release-comment <cmt_id>  "<reason>"
//   node scripts/moderate.cjs <origin> remove-review <rev_id>    "<reason>"
//   node scripts/moderate.cjs <origin> release-review <rev_id>   "<reason>"
//   node scripts/moderate.cjs <origin> remove-upload <upl_id>    "<reason>"
//   node scripts/moderate.cjs <origin> revoke-listing <lst_id>   "<reason>"
//   node scripts/moderate.cjs <origin> clear-listing-text <lst_id> "<reason>"
//   node scripts/moderate.cjs <origin> mute "<Alias>" <hours>    "<reason>"
//   node scripts/moderate.cjs <origin> unmute "<Alias>"          "<reason>"
//   node scripts/moderate.cjs <origin> block-uploads "<Alias>"   "<reason>"
//   node scripts/moderate.cjs <origin> unblock-uploads "<Alias>" "<reason>"
//   node scripts/moderate.cjs <origin> dismiss <comment|review|upload|listing> <id>
//   (set ADMIN_ACTOR="your name" to put a name in the log)
const fs = require('node:fs');
const path = require('node:path');

const [origin, command, ...rest] = process.argv.slice(2);
function fail(message) { console.error(message); process.exit(1); }
if (!origin || !command) fail(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) fail('give the Worker origin, https://….workers.dev');
let token = process.env.ADMIN_TOKEN || '';
const tokenFile = path.join(__dirname, '..', '.admin-token');
if (!token && fs.existsSync(tokenFile)) token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!token) fail('no admin token: run deploy.cjs --apply first, or set ADMIN_TOKEN');
const actor = process.env.ADMIN_ACTOR || '';

async function call(method, route, body) {
  const headers = { 'x-admin-token': token, 'content-type': 'application/json' };
  if (/^[A-Za-z0-9 ._@-]{1,40}$/.test(actor)) headers['x-admin-actor'] = actor;
  const res = await fetch(origin + route, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) fail('refused (' + res.status + '): ' + JSON.stringify(json.error || json));
  return json.data;
}
const act = (body) => call('POST', '/v1/admin/moderate', body);
const reason = (n) => rest[n] || fail('every action needs a reason');

(async () => {
  let out;
  if (command === 'reports') out = await call('GET', '/v1/admin/reports?status=' + (rest[0] || 'open'));
  else if (command === 'log') out = await call('GET', '/v1/admin/log?limit=' + (Number(rest[0]) || 50));
  else if (command === 'usage') out = await call('GET', '/v1/admin/usage');
  else if (command === 'remove-comment') out = await act({ action: 'remove_comment', commentId: rest[0], reason: reason(1) });
  else if (command === 'release-comment') out = await act({ action: 'release_comment', commentId: rest[0], reason: reason(1) });
  else if (command === 'remove-review') out = await act({ action: 'remove_review', reviewId: rest[0], reason: reason(1) });
  else if (command === 'release-review') out = await act({ action: 'release_review', reviewId: rest[0], reason: reason(1) });
  else if (command === 'remove-upload') out = await act({ action: 'remove_upload', uploadId: rest[0], reason: reason(1) });
  else if (command === 'revoke-listing') out = await act({ action: 'revoke_listing', listingId: rest[0], reason: reason(1) });
  else if (command === 'clear-listing-text') out = await act({ action: 'clear_listing_text', listingId: rest[0], reason: reason(1) });
  else if (command === 'mute') out = await act({ action: 'mute', alias: rest[0], hours: Number(rest[1]), reason: reason(2) });
  else if (command === 'unmute') out = await act({ action: 'unmute', alias: rest[0], reason: reason(1) });
  else if (command === 'block-uploads') out = await act({ action: 'block_uploads', alias: rest[0], reason: reason(1) });
  else if (command === 'unblock-uploads') out = await act({ action: 'unblock_uploads', alias: rest[0], reason: reason(1) });
  else if (command === 'dismiss') out = await act({ action: 'dismiss_report', targetType: rest[0], targetId: rest[1] });
  else fail('unknown command: ' + command);
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => fail('moderation error: ' + e.message));
