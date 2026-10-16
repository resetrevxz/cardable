// Read-only reports for the operator: how big the realm is and, before any beta reset, exactly what a reset would remove.
// Nothing here changes data. A reset is never run through the API: `plan` lists the statements, and the reviewed SQL is
// applied by hand with Wrangler after an export (see docs/market-beta/RUNBOOK.md).
import { currentMode } from './maintenance.js';

// Player-owned state, children before parents. The audit tables (moderation_log, ops_log), the service mode, the schema
// record and the constant guard table are kept.
const PLAYER_TABLES = ['alert_hits', 'alerts', 'order_fills', 'orders', 'offer_items', 'offers', 'bid_events', 'bids', 'holds', 'listing_events', 'reviews', 'comments', 'follows', 'reports',
  'upload_variants', 'uploads', 'price_observations', 'trades', 'redemptions', 'listing_items', 'listings', 'notifications', 'settings', 'idempotency', 'ledger', 'instances', 'imports_v', 'import_previews',
  'imports', 'sessions', 'wallets', 'accounts'];
const KEPT_TABLES = ['moderation_log', 'ops_log', 'ops_state', 'schema_info', '_guard'];

async function counts(env, tables) {
  const out = {};
  for (const t of tables) {
    try { out[t] = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ' + t).first()).n; } catch (_) { out[t] = null; }
  }
  return out;
}

export async function summary(env, now) {
  const rows = await counts(env, PLAYER_TABLES.concat(KEPT_TABLES));
  const money = await env.DB.prepare('SELECT COALESCE(SUM(balance), 0) AS balance, COALESCE(SUM(held), 0) AS held, COUNT(*) AS wallets FROM wallets').first();
  const open = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM listings GROUP BY status").all();
  const schema = await env.DB.prepare("SELECT value FROM schema_info WHERE key = 'schema'").first();
  return { at: now, schema: Number(schema && schema.value), mode: await currentMode(env), rows, credits: { inWallets: money.balance, held: money.held, wallets: money.wallets },
    listingsByStatus: Object.fromEntries(open.results.map((r) => [r.status, r.n])), note: 'Counts only. No alias, token or card serial is listed.' };
}

export async function resetPlan(env, now) {
  const rows = await counts(env, PLAYER_TABLES);
  const kept = await counts(env, KEPT_TABLES);
  const statements = PLAYER_TABLES.map((t) => 'DELETE FROM ' + t + ';');
  return { dryRun: true, at: now, wouldDelete: rows, wouldKeep: kept, statements,
    alsoRemove: ['Every object in the R2 bucket cardable-market-beta-media (pictures), by listing the bucket and deleting keys; the rows above are the only index.'],
    before: ['Set the service to maintenance mode.', 'Export the database (wrangler d1 export) and keep the file outside the repository.', 'Have the owner approve this plan in writing in the stage record.'],
    after: ['Check /v1/admin/reconcile reports no problems.', 'Open the service again.', 'Tell players the beta economy was reset and why.'],
    executed: false, note: 'This report changed nothing. The API cannot run a reset.' };
}
