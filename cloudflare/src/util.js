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

// A number the client sent: only a real JSON number counts. A string such as "10" is not coerced into one.
export const num = (v) => (typeof v === 'number' ? v : NaN);

export class ApiError extends Error {
  constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra || null; }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allow = String(env.CORS_ALLOW || '').split(',').map((s) => s.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key,x-trace-id,x-game-device,x-game-sequence',
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
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'referrer-policy': 'no-referrer', 'strict-transport-security': 'max-age=31536000', 'cross-origin-resource-policy': 'cross-origin' }, headers || {}) });
}
// Reads at most `maxBytes` of body. The declared length is checked first, and the stream itself is counted, so a
// chunked or lying request is cut off at the limit instead of being buffered whole.
export async function readBytes(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new ApiError(413, 'too-large', 'That request is too large.');
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(), parts = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { try { await reader.cancel(); } catch (_) { /* already closed */ } throw new ApiError(413, 'too-large', 'That request is too large.'); }
    parts.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return all;
}
async function readBounded(request, maxBytes) { return new TextDecoder().decode(await readBytes(request, maxBytes)); }
export async function readJson(request, maxBytes = 1_500_000) {
  const text = await readBounded(request, maxBytes);
  if (!text) return {};
  try { const v = JSON.parse(text); if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('shape'); return v; }
  catch (_) { throw new ApiError(400, 'bad-json', 'The request body is not valid JSON.'); }
}

// Free text a player may attach to a listing or offer. It is shown to other players under an anonymous name, so it may
// not carry a way to leave the market: links, contact handles, e-mail addresses, phone numbers or off-platform payment
// talk. Control and direction-override characters are removed rather than refused.
const CONTACT = [
  /https?:|www\.|:\/\//i,
  /\b[a-z0-9-]{2,}\.(com|net|org|io|gg|me|co|app|xyz|ly|tv|dev|info|link|click|shop|store|site|online|top|ru|cn|uk|de|us|to|cc|ws)\b/i,
  /\S+@\S+/,
  /(^|\s)@\w{3,}/,
  /(\d[\s().+-]*){8,}/,
  /\b(discord|telegram|whatsapp|paypal|venmo|cashapp|zelle|steam ?gift|gift ?card|bitcoin|crypto|western union)\b/i
];
export function cleanText(raw, max, what) {
  if (raw == null || raw === '') return '';
  if (typeof raw !== 'string') throw new ApiError(422, 'bad-text', 'The ' + what + ' must be text.');
  // Control characters and the invisible direction and zero-width marks are replaced by spaces, then spaces are collapsed.
  const text = raw.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > max) throw new ApiError(422, 'too-long', 'The ' + what + ' can be at most ' + max + ' characters.');
  if (CONTACT.some((re) => re.test(text))) throw new ApiError(422, 'unsafe-text', 'The ' + what + ' cannot contain links, contact details or payment talk. Everything happens inside the market.');
  return text;
}
