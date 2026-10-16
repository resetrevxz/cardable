// A circuit breaker for the daily write budget. Every trade, sale, registration, listing and notification leaves a row in a
// table whose ids only grow, so the number of new rows since the last look is the number of things that happened, read
// with four index-only lookups. The cron backstop calls this every five minutes. When a day's events pass DAILY_EVENT_BUDGET
// the service goes read-only on its own, says why, and opens again at 00:00 UTC; an operator can open it sooner. It
// protects the plan's daily write allowance (a Free plan blocks past it) and a runaway client's bill on a Paid plan.
import { currentMode, setMode, forgetMode } from './maintenance.js';

const DAY = 86400000;
export const DEFAULT_DAILY_EVENTS = 15000;
const MARK = 'Daily capacity reached';
const SOURCES = [['ledger', 'SELECT COALESCE(MAX(id), 0) AS n FROM ledger'], ['events', 'SELECT COALESCE(MAX(seq), 0) AS n FROM listing_events'],
  ['notes', 'SELECT COALESCE(MAX(id), 0) AS n FROM notifications'], ['accounts', 'SELECT COALESCE(MAX(rowid), 0) AS n FROM accounts']];

async function readCounters(env) {
  const out = {};
  for (const [key, query] of SOURCES) out[key] = (await env.DB.prepare(query).first()).n;
  return out;
}
async function readState(env) {
  const row = await env.DB.prepare("SELECT value FROM ops_state WHERE key = 'budget'").first();
  try { return row ? JSON.parse(row.value) : null; } catch (_) { return null; }
}
async function writeState(env, state, now) {
  await env.DB.prepare("INSERT INTO ops_state (key, value, updated_at) VALUES ('budget', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(JSON.stringify(state), now).run();
}

export function budgetOf(env) { const n = Number(env.DAILY_EVENT_BUDGET); return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_EVENTS; }

export async function checkBudget(env, now) {
  const limit = budgetOf(env), day = Math.floor(now / DAY), counters = await readCounters(env);
  let state = await readState(env), reopened = false, tripped = false;
  if (!state || state.day !== day) {
    // A new UTC day: the count starts again, and a pause the breaker itself made is lifted.
    const mode = await currentMode(env);
    if (mode.mode === 'read-only' && String(mode.message || '').startsWith(MARK)) { await setMode(env, { mode: 'open', message: '' }, 'circuit-breaker', now); reopened = true; }
    state = { day, base: counters, used: 0 };
  } else {
    const delta = Object.keys(counters).reduce((sum, k) => sum + Math.max(0, counters[k] - (state.base[k] || 0)), 0);
    state = { day, base: counters, used: state.used + delta };
  }
  if (state.used >= limit) {
    const mode = await currentMode(env);
    if (mode.mode === 'open') { await setMode(env, { mode: 'read-only', message: MARK + ' (' + state.used + ' of ' + limit + ' events). Changes resume at 00:00 UTC.' }, 'circuit-breaker', now); tripped = true; }
  }
  await writeState(env, state, now);
  forgetMode();
  return { day, used: state.used, limit, tripped, reopened, mode: (await currentMode(env)).mode };
}
