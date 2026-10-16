// The service mode. `open` is normal. `read-only` answers every read and refuses every write (a sign-in refresh is the one
// exception, so nobody is signed out by a pause). `maintenance` answers only the status page: nothing is read, written or
// settled until the operator opens the service again. The mode lives in D1, so it survives a deploy; each isolate looks
// at it at most every few seconds, which is the longest a change can take to reach every edge.
import { ApiError } from './util.js';

export const MODES = ['open', 'read-only', 'maintenance'];
const TTL_MS = 3000;
let cache = null;

export function forgetMode() { cache = null; }

export async function currentMode(env) {
  const t = Date.now();
  if (cache && t - cache.at < TTL_MS) return cache.value;
  let value = { mode: 'open', message: '', since: 0 };
  try {
    const rows = await env.DB.prepare("SELECT key, value, updated_at FROM ops_state WHERE key IN ('mode', 'message')").all();
    rows.results.forEach((r) => { if (r.key === 'mode' && MODES.includes(r.value)) { value.mode = r.value; value.since = r.updated_at; } if (r.key === 'message') value.message = r.value; });
  } catch (_) { /* a database without the table (before the migration) is simply open */ }
  cache = { at: t, value };
  return value;
}

// Refuse what the mode refuses. A path is a read when its method is GET; the refresh of a sign-in is always allowed in read-only.
export async function enforceMode(env, method, pathname) {
  const state = await currentMode(env);
  if (state.mode === 'open') return state;
  const note = state.message ? ' ' + state.message : '';
  if (state.mode === 'maintenance') throw new ApiError(503, 'maintenance', 'The Global Market is paused for maintenance. Nothing is lost and nothing is changing.' + note, { mode: state.mode, retryAfter: 120 });
  if (method !== 'GET' && method !== 'HEAD' && pathname !== '/v1/auth/refresh' && pathname !== '/v1/auth/logout') {
    throw new ApiError(503, 'read-only', 'The Global Market is read-only right now. You can look around, but nothing can be changed.' + note, { mode: state.mode, retryAfter: 120 });
  }
  return state;
}

export async function setMode(env, body, actor, now) {
  const mode = String(body && body.mode || '');
  if (!MODES.includes(mode)) throw new ApiError(400, 'bad-request', 'The mode must be one of: ' + MODES.join(', ') + '.');
  const message = String(body && body.message || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
  await env.DB.batch([
    env.DB.prepare("UPDATE ops_state SET value = ?, updated_at = ? WHERE key = 'mode'").bind(mode, now),
    env.DB.prepare("UPDATE ops_state SET value = ?, updated_at = ? WHERE key = 'message'").bind(message, now),
    env.DB.prepare('INSERT INTO ops_log (at, actor, action, detail) VALUES (?, ?, ?, ?)').bind(now, actor, 'mode', JSON.stringify({ mode, message }))
  ]);
  forgetMode();
  return { mode, message, since: now };
}

export async function opsLog(env, limit) {
  const rows = await env.DB.prepare('SELECT id, at, actor, action, detail FROM ops_log ORDER BY id DESC LIMIT ?').bind(Math.max(1, Math.min(200, Number(limit) || 50))).all();
  return { items: rows.results.map((r) => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, detail: r.detail })) };
}
