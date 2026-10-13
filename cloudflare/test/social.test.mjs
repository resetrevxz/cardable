// Stage 7: pictures, comments, reviews, follows, profiles, the community feed and moderation, against the real Worker on
// the local Workers runtime with a real (local) D1 and R2. Images are built byte by byte here (a JPEG and a WebP with
// exactly the headers the server reads), so every rule about what is accepted, stripped or refused is exercised on
// known bytes.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomFillSync } from 'node:crypto';
import { admin, call, DAY, HOUR, MIN, player, sql, start, stopAll } from './helpers.mjs';
import { CATALOG } from '../src/catalog.js';

let server, small;
before(async () => {
  server = await start(8851, {});
  small = await start(8852, { MEDIA_MAX_STORED: '4', MEDIA_MAX_BYTES: '4000', MEDIA_CREATE_PER_DAY: '6' });
});
after(() => stopAll());

// ---- byte builders ----------------------------------------------------------------------------------------------------
const chunk = (tag, data) => { const b = Buffer.alloc(8 + data.length + (data.length & 1)); b.write(tag, 0, 'ascii'); b.writeUInt32LE(data.length, 4); data.copy(b, 8); return b; };
const riff = (chunks) => { const body = Buffer.concat(chunks), h = Buffer.alloc(12); h.write('RIFF', 0, 'ascii'); h.writeUInt32LE(body.length + 4, 4); h.write('WEBP', 8, 'ascii'); return Buffer.concat([h, body]); };
const noise = (n) => { const b = Buffer.alloc(n); randomFillSync(b); return b; };
function vp8l(w, h, extra = 60) {
  const p = Buffer.alloc(5 + extra); p[0] = 0x2f; p.writeUInt32LE(((w - 1) | ((h - 1) << 14)) >>> 0, 1); randomFillSync(p, 5);
  return chunk('VP8L', p);
}
const webp = (w, h, extra) => riff([vp8l(w, h, extra)]);
function vp8x(w, h, flags) { const p = Buffer.alloc(10); p[0] = flags; p.writeUIntLE(w - 1, 4, 3); p.writeUIntLE(h - 1, 7, 3); return chunk('VP8X', p); }
const webpWithMetadata = (w, h) => riff([vp8x(w, h, 0x08 | 0x04), vp8l(w, h), chunk('EXIF', Buffer.from('Exif camera Canon GPSLatitude 51.5074 N')), chunk('XMP ', Buffer.from('<x:xmpmeta>private</x:xmpmeta>'))]);
const webpAnimated = (w, h) => riff([vp8x(w, h, 0x02), chunk('ANIM', Buffer.alloc(6)), chunk('ANMF', Buffer.alloc(16))]);
const seg = (marker, data) => Buffer.concat([Buffer.from([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 255]), data]);
function jpeg(w, h, o) {
  o = o || {};
  const scan = noise(o.size || 120).map((b) => (b === 0xff ? 0xfe : b));
  const parts = [Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'binary'))];
  if (o.exif) parts.push(seg(0xe1, Buffer.from('Exif\0\0GPSLatitude=51.5074N GPSLongitude=0.1278W Make=Canon Serial=123456')));
  if (o.comment) parts.push(seg(0xfe, Buffer.from('written by someone private')));
  parts.push(seg(0xdb, Buffer.concat([Buffer.from([0]), Buffer.alloc(64, 1)])));
  parts.push(seg(0xc0, Buffer.from([8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0])));
  parts.push(seg(0xc4, Buffer.concat([Buffer.from([0x00, 1]), Buffer.alloc(15), Buffer.from([0])])));
  parts.push(seg(0xda, Buffer.from([3, 1, 0, 2, 0, 3, 0, 0, 63, 0])), scan, Buffer.from([0xff, 0xd9]));
  if (o.trailing) parts.push(Buffer.from('TRAILING-SECRET-PAYLOAD'.padEnd(o.trailing, 'x')));
  const all = Buffer.concat(parts);
  return o.cut ? all.subarray(0, all.length - o.cut) : all;
}
const SIZES = { thumb: [320, 180], card: [960, 540], full: [1600, 900] };
const TYPE = { jpeg: 'image/jpeg', webp: 'image/webp' };

async function put(srv, token, id, variant, bytes, type, at) {
  const headers = { authorization: 'Bearer ' + token, 'content-type': type };
  if (at != null) headers['x-test-now'] = String(at);
  const res = await fetch(srv.base + '/v1/uploads/' + id + '/' + variant, { method: 'PUT', headers, body: bytes });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
  return { status: res.status, data: json && json.data, error: json && json.error, text };
}
async function media(srv, token, id, variant, at, headers) {
  const h = Object.assign({}, token ? { authorization: 'Bearer ' + token } : {}, at != null ? { 'x-test-now': String(at) } : {}, headers || {});
  const res = await fetch(srv.base + '/v1/media/' + id + '/' + variant, { headers: h });
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, bytes, headers: res.headers };
}
// A finished picture: three variants of one 16:9 crop.
async function picture(srv, me, at, options) {
  options = options || {};
  const c = await call(srv, 'POST', '/v1/uploads', { source: options.source || 'file' }, me.token, { at });
  assert.equal(c.status, 200, c.text);
  const id = c.data.uploadId;
  const made = options.bytes || { thumb: [jpeg(...SIZES.thumb, { exif: true, size: 300 }), 'jpeg'], card: [webp(...SIZES.card, 500), 'webp'], full: [webp(...SIZES.full, 900), 'webp'] };
  let last;
  for (const v of ['thumb', 'card', 'full']) {
    last = await put(srv, me.token, id, v, made[v][0], TYPE[made[v][1]], at);
    assert.equal(last.status, 200, v + ': ' + last.text);
  }
  assert.equal(last.data.ready, true);
  return id;
}
const unwrap = (r) => { assert.equal(r.status, 200, r.text); return r.data; };
const cardsOf = (n, skip) => Object.keys(CATALOG.cards).filter((c) => ['basic', 'common', 'uncommon'].includes(CATALOG.cards[c])).slice(skip || 0, (skip || 0) + n);

// ---- aliases and privacy ----------------------------------------------------------------------------------------------
test('every player gets a unique two-word alias, and nothing private is in what others can read', async () => {
  const made = await Promise.all(Array.from({ length: 30 }, () => call(server, 'POST', '/v1/auth/register', {}, null, { key: null })));
  assert.ok(made.every((r) => r.status === 200));
  const aliases = made.map((r) => r.data.alias);
  assert.equal(new Set(aliases.map((a) => a.toLowerCase())).size, 30, 'no two players share an alias');
  assert.ok(aliases.every((a) => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(a)), aliases.join(', '));
  const sellers = await player(server, { cards: 1, cardList: cardsOf(1) });
  const viewer = await player(server, {});
  const made2 = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [sellers.cards[0].id], ask: 40, title: 'Nice one' }, sellers.token));
  const open = [await call(server, 'GET', '/v1/listings/' + made2.listingId, null, viewer.token), await call(server, 'GET', '/v1/profiles/' + encodeURIComponent(sellers.alias), null, viewer.token),
    await call(server, 'GET', '/v1/feed', null, viewer.token), await call(server, 'GET', '/v1/listings/' + made2.listingId + '/comments', null, viewer.token)];
  open.forEach((r) => { assert.equal(r.status, 200, r.text); assert.ok(!/acct_|ses_|recovery|@/i.test(r.text), 'no private identifier: ' + r.text.slice(0, 200)); });
});

// ---- pictures: what is accepted, stripped and refused -------------------------------------------------------------------------
test('a picture is stored without its metadata and is private until it is on a listing', async () => {
  const seller = await player(server, { cards: 2, cardList: cardsOf(2) }), other = await player(server, {});
  const id = await picture(server, seller, undefined, {
    bytes: { thumb: [jpeg(...SIZES.thumb, { exif: true, comment: true, trailing: 64 }), 'jpeg'], card: [webpWithMetadata(...SIZES.card), 'webp'], full: [webp(...SIZES.full), 'webp'] } });
  const own = await media(server, seller.token, id, 'thumb');
  assert.equal(own.status, 200); assert.equal(own.headers.get('content-type'), 'image/jpeg'); assert.equal(own.headers.get('x-content-type-options'), 'nosniff');
  assert.match(own.headers.get('content-security-policy'), /default-src 'none'/);
  const text = own.bytes.toString('latin1');
  assert.ok(!/Exif|GPSLatitude|Canon|TRAILING|private/.test(text), 'the camera data, the comment and the trailing bytes are gone');
  assert.equal(own.bytes[0], 0xff); assert.equal(own.bytes[1], 0xd8); assert.equal(own.bytes[own.bytes.length - 2], 0xff); assert.equal(own.bytes[own.bytes.length - 1], 0xd9);
  const card = (await media(server, seller.token, id, 'card')).bytes.toString('latin1');
  assert.ok(!/Exif|Canon|xmpmeta|GPS/.test(card), 'the WebP metadata chunks are gone');
  assert.equal(card.slice(0, 4), 'RIFF'); assert.equal(card.slice(8, 12), 'WEBP');
  // private until attached; nobody without a token at all
  assert.equal((await media(server, other.token, id, 'thumb')).status, 404, 'another player cannot read a draft picture');
  assert.equal((await media(server, null, id, 'thumb')).status, 401);
  assert.equal((await media(server, seller.token, id, 'thumb-../../x')).status, 404, 'keys cannot be named');
  assert.equal((await media(server, seller.token, 'upl_doesnotexist12', 'thumb')).status, 404);
  const etag = own.headers.get('etag');
  assert.ok(etag);
  assert.equal((await media(server, seller.token, id, 'thumb', undefined, { 'if-none-match': etag })).status, 304, 'a repeat view costs no bytes');
  // on a listing, everyone can see it, and it can be shown beside the card but never instead of it
  const listed = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 55, title: 'Bright and clean',
    images: [{ uploadId: id, alt: 'The card on a desk' }], cover: { layout: 'square', zoom: 1.5, x: 40, y: 60 }, treatment: 'frame' }, seller.token));
  const view = unwrap(await call(server, 'GET', '/v1/listings/' + listed.listingId, null, other.token)).listing;
  assert.equal(view.images.length, 1); assert.equal(view.images[0].id, id); assert.equal(view.images[0].alt, 'The card on a desk');
  assert.deepEqual(view.cover, { layout: 'square', zoom: 1.5, x: 40, y: 60 }); assert.equal(view.treatment, 'frame');
  assert.equal(view.card.cardId, seller.cards[0].cardId); assert.equal(view.card.serial, seller.cards[0].serial); assert.equal(view.ask, 55);
  assert.equal((await media(server, other.token, id, 'card')).status, 200, 'public through the listing');
  // and it cannot be reused by someone else or attached twice to open listings
  const thief = await player(server, { cards: 1, cardList: cardsOf(1, 3) });
  const stolen = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [thief.cards[0].id], ask: 10, images: [{ uploadId: id }] }, thief.token);
  assert.equal(stolen.status, 404, 'a picture of someone else cannot be attached');
  const twice = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[1].id], ask: 12, images: [{ uploadId: id }] }, seller.token);
  assert.equal(twice.status, 409, 'one picture is on one open listing at a time: ' + twice.text);
  // it cannot be deleted while its listing is open, and can be afterwards
  assert.equal((await call(server, 'DELETE', '/v1/uploads/' + id, null, seller.token)).status, 409);
  assert.equal((await call(server, 'POST', '/v1/listings/' + listed.listingId + '/cancel', {}, seller.token)).status, 200);
  assert.equal((await call(server, 'DELETE', '/v1/uploads/' + id, null, seller.token)).status, 200);
  assert.equal((await media(server, seller.token, id, 'thumb')).status, 404);
});

test('what is not a safe picture is refused: wrong type, wrong bytes, animation, markup, size and shape', async () => {
  const me = await player(server, {});
  const c = unwrap(await call(server, 'POST', '/v1/uploads', {}, me.token));
  const id = c.uploadId;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), noise(80)]);
  const cases = [
    ['a PNG', png, 'image/png', 415, 'unsupported-type'],
    ['a GIF', Buffer.concat([Buffer.from('GIF89a'), noise(40)]), 'image/gif', 415, 'unsupported-type'],
    ['an SVG with a script', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', 415, 'unsupported-type'],
    ['an HTML page called a JPEG', Buffer.from('<!doctype html><html><body><script>1</script></body></html>'), 'image/jpeg', 415, 'unsupported-type'],
    ['a JPEG declared as WebP', jpeg(...SIZES.thumb), 'image/webp', 415, 'type-mismatch'],
    ['a WebP declared as JPEG', webp(...SIZES.thumb), 'image/jpeg', 415, 'type-mismatch'],
    ['an animated WebP', webpAnimated(...SIZES.thumb), 'image/webp', 422, 'animated'],
    ['a JPEG cut off at 95%', jpeg(...SIZES.thumb, { size: 400, cut: 30 }), 'image/jpeg', 422, 'truncated'],
    ['nothing', Buffer.alloc(0), 'image/jpeg', 422, 'empty'],
    ['a thumb that is too large in pixels', jpeg(900, 500), 'image/jpeg', 422, 'dimensions'],
    ['a thumb that is too small', jpeg(20, 12), 'image/jpeg', 422, 'dimensions'],
    ['a thumb over its byte budget', jpeg(...SIZES.thumb, { size: 41000 }), 'image/jpeg', 413, 'too-large']
  ];
  for (const [what, bytes, type, status, code] of cases) {
    const r = await put(server, me.token, id, 'thumb', bytes, type);
    assert.equal(r.status, status, what + ': ' + r.text);
    assert.equal(r.error.code, code, what);
  }
  // nothing was stored by any of that, and a good one still works
  assert.equal(sql(server, "SELECT COUNT(*) AS n FROM upload_variants WHERE upload_id = '" + id + "'")[0].n, 0);
  assert.equal((await put(server, me.token, id, 'thumb', jpeg(...SIZES.thumb), 'image/jpeg')).status, 200);
  // the other sizes must be the same shape
  const wrong = await put(server, me.token, id, 'card', webp(600, 600), 'image/webp');
  assert.equal(wrong.status, 422); assert.equal(wrong.error.code, 'shape-mismatch');
  assert.equal((await put(server, me.token, id, 'huge', webp(10, 10), 'image/webp')).status, 404);
  // a link is not a picture
  const seller = await player(server, { cards: 1, cardList: cardsOf(1, 4) });
  const link = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 9, images: [{ uploadId: 'https://example.com/a.png' }] }, seller.token);
  assert.equal(link.status, 422);
  const mixed = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 9, images: [{ uploadId: id, url: 'https://example.com/a.png' }] }, seller.token);
  assert.equal(mixed.status, 422);
  // unfinished pictures cannot be attached
  const notReady = await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 9, images: [{ uploadId: id }] }, seller.token);
  assert.ok(notReady.status === 404 || notReady.status === 409, 'someone else\'s unfinished picture: ' + notReady.status);
});

test('an upload that is cut off, expires or is replaced at the same moment never leaves a half picture', async () => {
  const me = await player(server, {});
  const t0 = Date.now() + 10 * MIN;
  const c = unwrap(await call(server, 'POST', '/v1/uploads', {}, me.token, { at: t0 }));
  const id = c.uploadId;
  // interrupted at 95% on the card size: refused, nothing stored, the slot is still open
  assert.equal((await put(server, me.token, id, 'thumb', jpeg(...SIZES.thumb), 'image/jpeg', t0 + 1000)).status, 200);
  const cut = await put(server, me.token, id, 'card', webp(...SIZES.card, 800).subarray(0, 700), 'image/webp', t0 + 2000);
  assert.equal(cut.status, 422); assert.equal(cut.error.code, 'truncated');
  assert.equal(sql(server, "SELECT status FROM uploads WHERE id = '" + id + "'")[0].status, 'pending');
  assert.equal((await put(server, me.token, id, 'card', webp(...SIZES.card, 800), 'image/webp', t0 + 3000)).data.ready, false, 'two of three is not a picture yet');
  // two replacements of the same size at once: both are accepted, the last write is the one that counts, and what is
  // served is exactly what the row says (a lost race leaves no object behind that the row does not point at)
  const [a, b] = await Promise.all([put(server, me.token, id, 'card', webp(...SIZES.card, 300), 'image/webp', t0 + 4000), put(server, me.token, id, 'card', webp(...SIZES.card, 3000), 'image/webp', t0 + 4000)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const row = sql(server, "SELECT bytes FROM upload_variants WHERE upload_id = '" + id + "' AND variant = 'card'")[0];
  const served = await media(server, me.token, id, 'card', t0 + 4500);
  assert.equal(served.bytes.length, row.bytes, 'the bytes served are the bytes the row counts');
  assert.equal(sql(server, "SELECT status FROM uploads WHERE id = '" + id + "'")[0].status, 'pending', 'still two of three');
  const done = await put(server, me.token, id, 'full', webp(...SIZES.full, 400), 'image/webp', t0 + 5000);
  assert.equal(done.data.ready, true);
  // a third writer arriving after the picture is finished is refused, whichever size it brings
  assert.equal((await put(server, me.token, id, 'full', webp(...SIZES.full, 100), 'image/webp', t0 + 5500)).status, 409);
  // a finished picture cannot be overwritten, and an expired slot is refused
  assert.equal((await put(server, me.token, id, 'thumb', jpeg(...SIZES.thumb), 'image/jpeg', t0 + 6000)).status, 409);
  const late = unwrap(await call(server, 'POST', '/v1/uploads', {}, me.token, { at: t0 + 10_000 }));
  const gone = await put(server, me.token, late.uploadId, 'thumb', jpeg(...SIZES.thumb), 'image/jpeg', t0 + 10_000 + 16 * MIN);
  assert.equal(gone.status, 410); assert.equal(gone.error.code, 'expired');
  // the sweep retires what was never finished or never used
  const swept = (await admin(server, 'POST', '/v1/admin/sweep', { limit: 50 }, t0 + 3 * DAY)).data;
  assert.ok(swept.media && swept.media.expired >= 2, JSON.stringify(swept));
  assert.equal(sql(server, "SELECT status FROM uploads WHERE id = '" + id + "'")[0].status, 'expired');
  assert.equal((await media(server, me.token, id, 'thumb', t0 + 3 * DAY)).status, 404);
});

test('quotas bound what a player can store and start', async () => {
  const me = await player(small, {});
  // storage: 4000 bytes in all
  const c = unwrap(await call(small, 'POST', '/v1/uploads', {}, me.token));
  assert.equal((await put(small, me.token, c.uploadId, 'thumb', webp(...SIZES.thumb, 1500), 'image/webp')).status, 200);
  assert.equal((await put(small, me.token, c.uploadId, 'card', webp(...SIZES.card, 1500), 'image/webp')).status, 200);
  const over = await put(small, me.token, c.uploadId, 'full', webp(...SIZES.full, 1500), 'image/webp');
  assert.equal(over.status, 409); assert.equal(over.error.code, 'storage-full');
  // slots: at most 3 open at once
  const open = [];
  for (let i = 0; i < 2; i++) open.push(unwrap(await call(small, 'POST', '/v1/uploads', {}, me.token)).uploadId);
  const fourth = await call(small, 'POST', '/v1/uploads', {}, me.token);
  assert.equal(fourth.status, 409);
  // per day: 6 in all
  for (const id of open.concat([c.uploadId])) assert.equal((await call(small, 'DELETE', '/v1/uploads/' + id, null, me.token)).status, 200);
  for (let i = 0; i < 3; i++) { const r = unwrap(await call(small, 'POST', '/v1/uploads', {}, me.token)); await call(small, 'DELETE', '/v1/uploads/' + r.uploadId, null, me.token); }
  const sixth = await call(small, 'POST', '/v1/uploads', {}, me.token);
  assert.equal(sixth.status, 429, sixth.text); assert.equal(sixth.error.code, 'quota');
  // and the operator's switch
  const other = await player(small, {});
  assert.equal((await admin(small, 'POST', '/v1/admin/moderate', { action: 'block_uploads', alias: other.alias, reason: 'test' })).status, 200);
  const blocked = await call(small, 'POST', '/v1/uploads', {}, other.token);
  assert.equal(blocked.status, 403); assert.equal(blocked.error.code, 'uploads-blocked');
});

test('presentation can change while a listing is open, never what is for sale, and listing again carries it', async () => {
  const seller = await player(server, { cards: 1, cardList: cardsOf(1, 6) });
  const p1 = await picture(server, seller), p2 = await picture(server, seller);
  const made = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 80, images: [{ uploadId: p1, alt: 'first' }] }, seller.token));
  const swap = unwrap(await call(server, 'POST', '/v1/listings/' + made.listingId + '/presentation', { title: 'Now with a better photo', images: [{ uploadId: p2, alt: 'second' }], cover: { layout: 'portrait', zoom: 1, x: 50, y: 50 } }, seller.token));
  assert.equal(swap.images, 1);
  assert.equal(sql(server, "SELECT status, listing_id FROM uploads WHERE id = '" + p1 + "'")[0].status, 'ready', 'the replaced picture is the player\'s again');
  const v = unwrap(await call(server, 'GET', '/v1/listings/' + made.listingId, null, seller.token)).listing;
  assert.equal(v.title, 'Now with a better photo'); assert.equal(v.images[0].id, p2); assert.equal(v.ask, 80, 'the price did not move');
  // the route takes presentation only
  const sneaky = await call(server, 'POST', '/v1/listings/' + made.listingId + '/presentation', { ask: 1, instanceIds: [], images: [{ uploadId: p2 }] }, seller.token);
  assert.equal(sneaky.status, 200);
  assert.equal(unwrap(await call(server, 'GET', '/v1/listings/' + made.listingId, null, seller.token)).listing.ask, 80);
  // another player cannot change it
  const other = await player(server, {});
  assert.equal((await call(server, 'POST', '/v1/listings/' + made.listingId + '/presentation', { title: 'mine now' }, other.token)).status, 404);
  // withdrawn, then listed again: the picture comes along
  assert.equal((await call(server, 'POST', '/v1/listings/' + made.listingId + '/cancel', {}, seller.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/listings/' + made.listingId + '/presentation', { title: 'late' }, seller.token)).status, 409);
  const again = unwrap(await call(server, 'POST', '/v1/listings/' + made.listingId + '/relist', {}, seller.token));
  const v2 = unwrap(await call(server, 'GET', '/v1/listings/' + again.listingId, null, seller.token)).listing;
  assert.equal(v2.images.length, 1); assert.equal(v2.images[0].id, p2);
  assert.equal((await media(server, other.token, p2, 'card')).status, 200);
});

// ---- moderation ----------------------------------------------------------------------------------------------------------------
test('an operator can take down a picture or a listing; everyone else is refused and every action is logged', async () => {
  const seller = await player(server, { cards: 2, cardList: cardsOf(2, 8) }), buyer = await player(server, {});
  const pic = await picture(server, seller);
  const listed = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 70, images: [{ uploadId: pic }] }, seller.token));
  // a player cannot use the operator's routes, whatever they send
  for (const [m, p, b] of [['GET', '/v1/admin/reports'], ['POST', '/v1/admin/moderate', { action: 'remove_upload', uploadId: pic, reason: 'x' }], ['GET', '/v1/admin/log'], ['GET', '/v1/admin/usage']]) {
    const r = await call(server, m, p, b || null, buyer.token, { key: null, headers: { 'x-admin-token': 'guess' } });
    assert.equal(r.status, 404, p);
  }
  // report it; the operator sees it, grouped
  assert.equal((await call(server, 'POST', '/v1/reports', { targetType: 'upload', targetId: pic, reason: 'unsafe-image', note: 'not appropriate' }, buyer.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/reports', { targetType: 'upload', targetId: pic, reason: 'spam' }, buyer.token)).status, 409, 'one report per player per target');
  assert.equal((await call(server, 'POST', '/v1/reports', { targetType: 'upload', targetId: pic, reason: 'spam' }, seller.token)).status, 409, 'not your own');
  const reports = (await admin(server, 'GET', '/v1/admin/reports')).data;
  const mine = reports.items.find((i) => i.targetId === pic);
  assert.ok(mine && mine.reports === 1 && mine.target.owner === seller.alias && mine.reasons.includes('unsafe-image'));
  assert.equal((await admin(server, 'POST', '/v1/admin/moderate', { action: 'remove_upload', uploadId: pic })).status, 422, 'a reason is required');
  const removed = await admin(server, 'POST', '/v1/admin/moderate', { action: 'remove_upload', uploadId: pic, reason: 'Not suitable for the market' });
  assert.equal(removed.status, 200, removed.text);
  assert.equal((await media(server, buyer.token, pic, 'card')).status, 404, 'gone for everyone');
  assert.equal((await media(server, seller.token, pic, 'card')).status, 404, 'and for its owner');
  const v = unwrap(await call(server, 'GET', '/v1/listings/' + listed.listingId, null, buyer.token)).listing;
  assert.equal(v.images.length, 0, 'the listing keeps selling, without the picture'); assert.equal(v.status, 'active');
  const told = unwrap(await call(server, 'GET', '/v1/activity', null, seller.token)).notifications.filter((n) => n.kind === 'moderation');
  assert.ok(told.length === 1 && /Not suitable/.test(told[0].text));
  assert.equal(sql(server, "SELECT status FROM reports WHERE target_id = '" + pic + "'")[0].status, 'actioned');
  // the listing itself: revoked, the card goes home
  const revoked = await admin(server, 'POST', '/v1/admin/moderate', { action: 'revoke_listing', listingId: listed.listingId, reason: 'Misleading' });
  assert.equal(revoked.status, 200, revoked.text);
  assert.equal(unwrap(await call(server, 'GET', '/v1/listings/' + listed.listingId, null, buyer.token)).listing.status, 'cancelled');
  assert.equal(sql(server, "SELECT state FROM instances WHERE id = '" + seller.cards[0].id + "'")[0].state, 'owned');
  const log = (await admin(server, 'GET', '/v1/admin/log')).data.items;
  assert.ok(log.some((l) => l.action === 'remove_upload' && l.targetId === pic && l.actor === 'operator' && l.reason.startsWith('Not suitable')));
  assert.ok(log.some((l) => l.action === 'revoke_listing' && l.targetId === listed.listingId));
  const usage = (await admin(server, 'GET', '/v1/admin/usage')).data;
  assert.ok(usage.live && Array.isArray(usage.byStatus));
});

// ---- comments ------------------------------------------------------------------------------------------------------------------
test('comments are plain text with limits: no markup, links or hidden characters, one level of replies, and the author and seller can step in', async () => {
  const seller = await player(server, { cards: 1, cardList: cardsOf(1, 12) }), a = await player(server, {}), b = await player(server, {});
  const L = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 90 }, seller.token)).listingId;
  const base = Date.now() + 20 * MIN;
  let t = base;
  const say = (who, text, extra) => call(server, 'POST', '/v1/listings/' + L + '/comments', Object.assign({ body: text }, extra || {}), who.token, { at: (t += 20_000) });
  const first = unwrap(await say(a, 'Is the serial a low number?'));
  // refused: tags, links, contact, wording, characters
  for (const [text, code] of [['<script>alert(1)</script>', 'markup'], ['<img src=x onerror=alert(1)>', 'markup'], ['see example.com for more', 'unsafe-text'], ['write me at a@b.cd', 'unsafe-text'],
    ['that is shitty of you', 'wording'], ['aaaaaaaaaaaa', 'spam'], ['x'.repeat(301), 'too-long']]) {
    const r = await say(a, text);
    assert.equal(r.status, 422, text + ': ' + r.text); assert.equal(r.error.code, code, text);
  }
  assert.equal((await say(a, '   ')).status, 422);
  // direction overrides and zero-width characters are removed, not kept
  const bidi = unwrap(await say(b, 'Looks ‮good‬ to​ me'));
  const listed = unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments', null, a.token, { at: t + 1 }));
  const stored = listed.items.find((c) => c.id === bidi.commentId);
  assert.equal(stored.body, 'Looks good to me');
  // replies: one level
  const reply = unwrap(await say(seller, 'Yes, it is in the low hundreds.', { parentId: first.commentId }));
  assert.equal((await say(b, 'Thanks', { parentId: reply.commentId })).status, 409, 'a reply to a reply is refused');
  // a repeat is refused, and the cooldown holds
  assert.equal((await say(a, 'is the SERIAL a low number')).status, 409);
  unwrap(await say(b, 'A first remark from me'));
  const quick = await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'One more thing' }, b.token, { at: t + 1000 });
  assert.equal(quick.status, 429); assert.equal(quick.error.code, 'cooldown');
  // edit within the window by the author only, once it is past the window it is closed
  assert.equal((await call(server, 'PUT', '/v1/comments/' + first.commentId, { body: 'Is the serial a low one?' }, b.token, { at: t + 100 })).status, 404);
  assert.equal((await call(server, 'PUT', '/v1/comments/' + first.commentId, { body: 'Is the serial a low one?' }, a.token, { at: t + 100 })).status, 200);
  assert.equal((await call(server, 'PUT', '/v1/comments/' + first.commentId, { body: 'too late' }, a.token, { at: base + 30 * MIN })).status, 409);
  // the seller hides a comment on their listing; others see a placeholder, the author still sees it
  assert.equal((await call(server, 'POST', '/v1/comments/' + bidi.commentId + '/hide', { hidden: true }, seller.token, { at: t + 200 })).status, 200);
  let view = unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments', null, a.token, { at: t + 300 })).items.find((c) => c.id === bidi.commentId);
  assert.equal(view.body, null); assert.equal(view.placeholder, 'Hidden by the seller.');
  view = unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments', null, b.token, { at: t + 300 })).items.find((c) => c.id === bidi.commentId);
  assert.equal(view.body, 'Looks good to me');
  assert.equal((await call(server, 'POST', '/v1/comments/' + first.commentId + '/hide', { hidden: true }, b.token)).status, 404, 'only the seller');
  // the author removes their own: the words are gone
  assert.equal((await call(server, 'DELETE', '/v1/comments/' + bidi.commentId, null, b.token, { at: t + 400 })).status, 200);
  assert.equal(sql(server, "SELECT body FROM comments WHERE id = '" + bidi.commentId + "'")[0].body, '');
  // the seller was told, once, and a player who switched social notices off was not
  const notes = unwrap(await call(server, 'GET', '/v1/activity', null, seller.token)).notifications;
  assert.ok(notes.filter((n) => n.kind === 'comment').length >= 1);
  assert.ok(unwrap(await call(server, 'GET', '/v1/activity', null, a.token)).notifications.some((n) => n.kind === 'reply'));
  await call(server, 'PUT', '/v1/settings', { notifySocial: false }, a.token);
  const before = unwrap(await call(server, 'GET', '/v1/activity', null, a.token)).notifications.filter((n) => n.kind === 'reply').length;
  await say(seller, 'Another note for you.', { parentId: first.commentId });
  assert.equal(unwrap(await call(server, 'GET', '/v1/activity', null, a.token)).notifications.filter((n) => n.kind === 'reply').length, before, 'opted out');
});

test('comments are rate limited, reports hold a comment for review, a muted player cannot post, and a listing closes its thread', async () => {
  const seller = await player(server, { cards: 1, cardList: cardsOf(1, 14) }), talker = await player(server, {});
  const L = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 30, durationMs: 2 * DAY }, seller.token)).listingId;
  let t = Date.now() + 40 * MIN, last = null;
  for (let i = 0; i < 20; i++) {
    const r = await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'Comment number ' + i + ' about the finish' }, talker.token, { at: (t += 16_000) });
    assert.equal(r.status, 200, i + ': ' + r.text); last = r.data.commentId;
  }
  const hourly = await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'One more for the road' }, talker.token, { at: (t += 16_000) });
  assert.equal(hourly.status, 429); assert.equal(hourly.error.code, 'rate-limited');
  // three different players report the comment: it is held
  const fans = [await player(server, {}), await player(server, {}), await player(server, {})];
  for (const f of fans) assert.equal((await call(server, 'POST', '/v1/reports', { targetType: 'comment', targetId: last, reason: 'abusive' }, f.token, { at: t })).status, 200);
  const view = unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments?limit=50', null, fans[0].token, { at: t + 1 })).items.find((c) => c.id === last);
  assert.equal(view.status, 'held'); assert.equal(view.body, null);
  assert.equal(unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments?limit=50', null, talker.token, { at: t + 1 })).items.find((c) => c.id === last).body !== null, true, 'its author still sees it');
  const rel = await admin(server, 'POST', '/v1/admin/moderate', { action: 'release_comment', commentId: last, reason: 'Reviewed, fine' });
  assert.equal(rel.status, 200, rel.text);
  assert.equal(unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments?limit=50', null, fans[0].token, { at: t + 2 })).items.find((c) => c.id === last).status, 'visible');
  // the operator removes one for good
  const gone = await admin(server, 'POST', '/v1/admin/moderate', { action: 'remove_comment', commentId: last, reason: 'Harassment' });
  assert.equal(gone.status, 200);
  assert.equal(unwrap(await call(server, 'GET', '/v1/listings/' + L + '/comments?limit=50', null, talker.token, { at: t + 3 })).items.find((c) => c.id === last).placeholder, 'Removed by the operator.');
  // muted: refused, with the date; unmuted: allowed
  const m = await admin(server, 'POST', '/v1/admin/moderate', { action: 'mute', alias: talker.alias, hours: 48, reason: 'Repeated abuse' }, t);
  assert.equal(m.status, 200, m.text);
  const refused = await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'I am back' }, talker.token, { at: t + 2 * HOUR });
  assert.equal(refused.status, 403); assert.equal(refused.error.code, 'muted');
  assert.equal((await admin(server, 'POST', '/v1/admin/moderate', { action: 'unmute', alias: talker.alias, reason: 'Appeal accepted' })).status, 200);
  assert.equal((await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'Thanks for the second look' }, talker.token, { at: t + 3 * HOUR })).status, 200);
  // a week after the listing ends, the thread is closed
  assert.equal((await call(server, 'POST', '/v1/listings/' + L + '/cancel', {}, seller.token, { at: t + 4 * HOUR })).status, 200);
  assert.equal((await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'Still there?' }, talker.token, { at: t + 4 * HOUR + 2 * DAY })).status, 200, 'open for a week after it ends');
  const closed = await call(server, 'POST', '/v1/listings/' + L + '/comments', { body: 'Is it back up?' }, talker.token, { at: t + 4 * HOUR + 9 * DAY });
  assert.equal(closed.status, 409); assert.equal(closed.error.code, 'comments-closed');
});

// ---- reviews, reputation and profiles ----------------------------------------------------------------------------------------------
test('a review comes only from a completed trade, once; reputation shows its sample; a quick sell or a simulation earns none', async () => {
  const seller = await player(server, { cards: 3, cardList: cardsOf(3, 16) }), buyer = await player(server, { credits: 5000 }), stranger = await player(server, { credits: 500 });
  const now = Date.now() + 2 * HOUR;
  const L1 = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 120 }, seller.token, { at: now })).listingId;
  const L2 = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[1].id], ask: 130 }, seller.token, { at: now + 1 })).listingId;
  // nothing to review yet
  assert.equal(unwrap(await call(server, 'GET', '/v1/reviews/pending', null, buyer.token, { at: now })).items.length, 0);
  assert.equal((await call(server, 'POST', '/v1/reviews', { tradeId: 'trd_nonexistent123', rating: 5 }, buyer.token, { at: now })).status, 403);
  const sold1 = unwrap(await call(server, 'POST', '/v1/listings/' + L1 + '/buy', { expectedPrice: 120 }, buyer.token, { at: now + 10 }));
  const pending = unwrap(await call(server, 'GET', '/v1/reviews/pending', null, buyer.token, { at: now + 20 })).items;
  assert.equal(pending.length, 1); assert.equal(pending[0].tradeId, sold1.receiptId); assert.equal(pending[0].seller, seller.alias);
  // not the seller, not a stranger, not out of range
  assert.equal((await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 5 }, seller.token, { at: now + 30 })).status, 403, 'the seller cannot rate their own sale');
  const probe = await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 5 }, stranger.token, { at: now + 30 });
  assert.equal(probe.status, 403, 'a stranger cannot rate a trade between other players');
  assert.equal((await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 6 }, buyer.token, { at: now + 30 })).status, 422);
  assert.equal((await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 4, body: '<b>great</b>' }, buyer.token, { at: now + 30 })).status, 422);
  // the real one
  const rev = unwrap(await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 4, body: 'Fast and as described.' }, buyer.token, { at: now + 40 }));
  assert.equal((await call(server, 'POST', '/v1/reviews', { tradeId: sold1.receiptId, rating: 5 }, buyer.token, { at: now + 50 })).status, 409, 'one review per trade');
  // edit once, within a day
  assert.equal((await call(server, 'PUT', '/v1/reviews/' + rev.reviewId, { rating: 5, body: 'Fast, and exactly as described.' }, buyer.token, { at: now + 60 })).status, 200);
  assert.equal((await call(server, 'PUT', '/v1/reviews/' + rev.reviewId, { rating: 1 }, buyer.token, { at: now + 70 })).status, 409, 'only once');
  // reputation and the profile: counts, a transparent sample, and no private identity
  unwrap(await call(server, 'POST', '/v1/listings/' + L2 + '/buy', { expectedPrice: 130 }, stranger.token, { at: now + 80 }));
  const prof = unwrap(await call(server, 'GET', '/v1/profiles/' + encodeURIComponent(seller.alias.toLowerCase()), null, stranger.token, { at: now + 100 }));
  assert.equal(prof.alias, seller.alias); assert.equal(prof.activity.sales >= 1, true);
  assert.equal(prof.reputation.reviews, 1); assert.equal(prof.reputation.average, 5); assert.equal(prof.reputation.distinctBuyers, 1); assert.equal(prof.reputation.sample, 'small');
  assert.match(prof.reputation.note, /1 review by 1 buyer/);
  assert.equal(prof.reviews[0].buyer, buyer.alias); assert.ok(!/acct_|@/.test(JSON.stringify(prof)));
  assert.equal(prof.memberSince % 1, 0); assert.equal(new Date(prof.memberSince).getUTCDate(), 1, 'the month, not the day');
  const rated = unwrap(await call(server, 'GET', '/v1/listings/' + L2, null, stranger.token, { at: now + 100 })).listing;
  assert.deepEqual(rated.seller.rating, { average: 5, count: 1 });
  assert.equal((await call(server, 'GET', '/v1/profiles/' + encodeURIComponent('Nobody Here'), null, stranger.token)).status, 404);
  // a Quick Sell is a system redemption: it makes no trade, so it is nothing a player can review
  const qs = await call(server, 'POST', '/v1/sell', { instanceIds: [seller.cards[2].id] }, seller.token, { at: now + 200 });
  assert.equal(qs.status, 200, qs.text);
  assert.equal(unwrap(await call(server, 'GET', '/v1/reviews/pending', null, seller.token, { at: now + 210 })).items.length, 0);
  // reviews after the window are closed
  const old = await call(server, 'POST', '/v1/reviews', { tradeId: pending[0].tradeId, rating: 3 }, buyer.token, { at: now + 60 * DAY });
  assert.ok(old.status === 409, 'a duplicate is refused before the window is even asked: ' + old.status);
});

test('a review that several players report is held, and the operator releases or removes it', async () => {
  const seller = await player(server, { cards: 1, cardList: cardsOf(1, 20) }), buyer = await player(server, { credits: 500 });
  const now = Date.now() + 3 * HOUR;
  const L = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 60 }, seller.token, { at: now })).listingId;
  const trade = unwrap(await call(server, 'POST', '/v1/listings/' + L + '/buy', { expectedPrice: 60 }, buyer.token, { at: now + 5 })).receiptId;
  const rev = unwrap(await call(server, 'POST', '/v1/reviews', { tradeId: trade, rating: 1, body: 'Not what I hoped.' }, buyer.token, { at: now + 10 })).reviewId;
  const fans = [await player(server, {}), await player(server, {}), await player(server, {})];
  for (const f of fans) assert.equal((await call(server, 'POST', '/v1/reports', { targetType: 'review', targetId: rev, reason: 'other' }, f.token, { at: now + 20 })).status, 200);
  const prof = unwrap(await call(server, 'GET', '/v1/profiles/' + encodeURIComponent(seller.alias), null, fans[0].token, { at: now + 30 }));
  assert.equal(prof.reputation.reviews, 0, 'a held review stops counting until it is looked at');
  assert.equal((await admin(server, 'POST', '/v1/admin/moderate', { action: 'release_review', reviewId: rev, reason: 'Honest and civil' })).status, 200);
  assert.equal(unwrap(await call(server, 'GET', '/v1/profiles/' + encodeURIComponent(seller.alias), null, fans[0].token, { at: now + 40 })).reputation.reviews, 1);
  assert.equal((await admin(server, 'POST', '/v1/admin/moderate', { action: 'remove_review', reviewId: rev, reason: 'Retaliation' })).status, 200);
  assert.equal(unwrap(await call(server, 'GET', '/v1/profiles/' + encodeURIComponent(seller.alias), null, fans[0].token, { at: now + 50 })).reputation.reviews, 0);
});

// ---- follows and the feed ------------------------------------------------------------------------------------------------------------
test('following a seller or a card puts their listings in your feed and tells you once; you can switch it off', async () => {
  const seller = await player(server, { cards: 3, cardList: cardsOf(3, 24) }), fan = await player(server, {}), quiet = await player(server, {});
  assert.equal((await call(server, 'POST', '/v1/follows', { kind: 'seller', alias: seller.alias }, fan.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/follows', { kind: 'seller', alias: seller.alias }, quiet.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/follows', { kind: 'card', cardId: seller.cards[1].cardId }, fan.token)).status, 200);
  assert.equal((await call(server, 'POST', '/v1/follows', { kind: 'seller', alias: fan.alias }, fan.token)).status, 409, 'not yourself');
  assert.equal((await call(server, 'POST', '/v1/follows', { kind: 'seller', alias: 'Nobody Here' }, fan.token)).status, 404);
  await call(server, 'PUT', '/v1/settings', { notifyFollows: false }, quiet.token);
  const f = unwrap(await call(server, 'GET', '/v1/follows', null, fan.token));
  assert.deepEqual(f.sellers.map((s) => s.alias), [seller.alias]); assert.equal(f.cards.length, 1);
  const now = Date.now() + 4 * HOUR;
  const L = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 25 }, seller.token, { at: now })).listingId;
  const L2 = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[1].id], ask: 26 }, seller.token, { at: now + 1 })).listingId;
  const notes = unwrap(await call(server, 'GET', '/v1/activity', null, fan.token, { at: now + 5 })).notifications.filter((n) => n.kind === 'follow');
  assert.equal(notes.length, 2, 'one for each listing, though the second matches both follows');
  assert.equal(unwrap(await call(server, 'GET', '/v1/activity', null, quiet.token, { at: now + 5 })).notifications.filter((n) => n.kind === 'follow').length, 0, 'opted out');
  const mine = unwrap(await call(server, 'GET', '/v1/feed?scope=following', null, fan.token, { at: now + 6 }));
  assert.deepEqual(mine.items.map((i) => i.id), [L2, L]);
  assert.ok(mine.items.every((i) => i.event === 'listed'));
  const stranger = await player(server, {});
  assert.equal(unwrap(await call(server, 'GET', '/v1/feed?scope=following', null, stranger.token, { at: now + 6 })).items.length, 0, 'following nobody: nothing, not everything');
  const everyone = unwrap(await call(server, 'GET', '/v1/feed?limit=1', null, stranger.token, { at: now + 6 }));
  assert.equal(everyone.items.length, 1); assert.ok(everyone.nextCursor);
  const next = unwrap(await call(server, 'GET', '/v1/feed?limit=1&cursor=' + everyone.nextCursor, null, stranger.token, { at: now + 6 }));
  assert.notEqual(next.items[0].id, everyone.items[0].id, 'pages do not repeat');
  // a sale shows as a sale
  const buyer = await player(server, { credits: 200 });
  assert.equal((await call(server, 'POST', '/v1/listings/' + L + '/buy', { expectedPrice: 25 }, buyer.token, { at: now + 10 })).status, 200);
  const feed = unwrap(await call(server, 'GET', '/v1/feed?scope=following', null, fan.token, { at: now + 20 }));
  assert.equal(feed.items[0].id, L); assert.equal(feed.items[0].event, 'sold'); assert.equal(feed.items[0].soldFor, 25);
  assert.equal((await call(server, 'DELETE', '/v1/follows?kind=seller&alias=' + encodeURIComponent(seller.alias), null, fan.token, { key: null })).status, 200);
  assert.equal(unwrap(await call(server, 'GET', '/v1/follows', null, fan.token)).sellers.length, 0);
  void L2;
});

test('settings keep social choices, and a muted alias list is bounded and validated', async () => {
  const me = await player(server, {});
  const set = unwrap(await call(server, 'PUT', '/v1/settings', { notifySocial: false, notifyFollows: false, hideComments: true,
    mutedAliases: ['Silent Falcon', 'Amber Otter', '<script>', 'x', 'Silent Falcon'].concat(Array.from({ length: 80 }, (_, i) => 'Calm Heron' + String.fromCharCode(97 + (i % 26)))) }, me.token));
  assert.equal(set.value.notifySocial, false); assert.equal(set.value.hideComments, true);
  assert.deepEqual(set.value.mutedAliases.slice(0, 2), ['Silent Falcon', 'Amber Otter']);
  assert.ok(set.value.mutedAliases.length <= 50 && !set.value.mutedAliases.includes('<script>') && !set.value.mutedAliases.includes('x'));
  assert.equal(unwrap(await call(server, 'GET', '/v1/settings', null, me.token)).value.hideComments, true);
});

test('events other players read are bounded: a listing can be lowered only so often an hour, and listings are made only so fast', async () => {
  const seller = await player(server, { cards: 3, cardList: cardsOf(3, 28) });
  const now = Date.now() + 6 * HOUR;
  const L = unwrap(await call(server, 'POST', '/v1/listings', { kind: 'fixed', instanceIds: [seller.cards[0].id], ask: 500 }, seller.token, { at: now })).listingId;
  for (let i = 0; i < 6; i++) assert.equal((await call(server, 'PUT', '/v1/listings/' + L, { ask: 490 - i }, seller.token, { at: now + 10 + i })).status, 200, 'drop ' + i);
  const seventh = await call(server, 'PUT', '/v1/listings/' + L, { ask: 400 }, seller.token, { at: now + 30 });
  assert.equal(seventh.status, 429); assert.equal(seventh.error.code, 'quota');
  // raising the price is not an event watchers read, and an hour later lowering works again
  assert.equal((await call(server, 'PUT', '/v1/listings/' + L, { ask: 600 }, seller.token, { at: now + 40 })).status, 200);
  assert.equal((await call(server, 'PUT', '/v1/listings/' + L, { ask: 450 }, seller.token, { at: now + 2 * HOUR })).status, 200);
  // two reprices at once cannot both fit under the cap (the cap is in the transaction)
  const burst = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map((i) => call(server, 'PUT', '/v1/listings/' + L, { ask: 440 - i }, seller.token, { at: now + 2 * HOUR + 10 + i })));
  const drops = sql(server, "SELECT COUNT(*) AS n FROM listing_events WHERE listing_id = '" + L + "' AND kind = 'repriced' AND at >= " + (now + 2 * HOUR - 1))[0].n;
  assert.ok(drops <= 6, 'at most six drops in the hour, got ' + drops + ' from ' + burst.map((r) => r.status).join(','));
});
