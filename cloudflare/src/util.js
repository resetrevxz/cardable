// Small shared helpers: encoding, hashing, signing, responses. WebCrypto only (the Workers runtime has no Node crypto).
const encoder = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromB64url(text) {
  const s = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function randomBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
export function randomId(prefix, bytes = 12) { return prefix + '_' + b64url(randomBytes(bytes)); }
export function randomInt(max) {
  // Rejection sampling: no modulo bias.
  const limit = Math.floor(0x100000000 / max) * max, a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % max;
}
export async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function hmac(secret, text) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(text));
  return b64url(new Uint8Array(sig));
}
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export function secretOrThrow(env) {
  const s = env.SESSION_SECRET;
  if (typeof s !== 'string' || s.length < 32) throw new ApiError(503, 'not-configured', 'The service is not configured yet.');
  return s;
}
export function recoveryCode() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 20; i++) out += alphabet[randomInt(alphabet.length)];
  return out.match(/.{5}/g).join('-');
}

export class ApiError extends Error {
  constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra || null; }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allow = String(env.CORS_ALLOW || '').split(',').map((s) => s.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key,x-trace-id',
    'Access-Control-Max-Age': '600', Vary: 'Origin' };
  if (origin === null) return headers;
  // The game runs from file:// (Origin: null) and the packaged app. The API uses bearer tokens only, so this is not an auth boundary.
  const ok = allow.includes(origin) || allow.some((a) => a !== 'null' && a !== 'file://' && origin.startsWith(a + ':'));
  if (ok) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
export function json(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'referrer-policy': 'no-referrer', 'cross-origin-resource-policy': 'cross-origin' }, headers || {}) });
}
export async function readJson(request, maxBytes = 1_500_000) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new ApiError(413, 'too-large', 'That request is too large.');
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, 'too-large', 'That request is too large.');
  if (!text) return {};
  try { const v = JSON.parse(text); if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('shape'); return v; }
  catch (_) { throw new ApiError(400, 'bad-json', 'The request body is not valid JSON.'); }
}
