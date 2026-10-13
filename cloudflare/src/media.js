// Image validation without a decoder. The Workers runtime has no image library, so the server checks what it can check
// with certainty from the bytes: the real format (never the file name or the declared type), that the container is
// complete and well formed, the pixel dimensions from the headers, and that nothing animated is inside. Anything that
// can carry private or active content (camera metadata, GPS, colour profiles, text chunks, trailing data after the
// image) is removed by rewriting the container, so the stored bytes are the picture and nothing else.
//
// What this cannot do is prove the compressed data decodes: the player's own game decodes every image before it is
// sent (a failed decode never gets this far), and a file that only pretends to be an image is served with a fixed
// image type, `nosniff` and a locked-down policy, so the browser either draws it or shows nothing.
import { ApiError } from './util.js';

// The three pictures that make one upload: a small one for lists, a medium one for a listing and a large one to look at.
export const VARIANTS = {
  thumb: { maxBytes: 40_000, maxSide: 320, minSide: 48 },
  card: { maxBytes: 180_000, maxSide: 960, minSide: 96 },
  full: { maxBytes: 600_000, maxSide: 1920, minSide: 160 }
};
export const VARIANT_NAMES = Object.keys(VARIANTS);
export const TYPES = { webp: 'image/webp', jpeg: 'image/jpeg' };
const MAX_PIXELS = 4_200_000;

const fail = (code, message, status) => { throw new ApiError(status || 422, code, message); };
const ascii = (b, from, to) => { let s = ''; for (let i = from; i < to; i++) s += String.fromCharCode(b[i]); return s; };
const le16 = (b, i) => b[i] | (b[i + 1] << 8);
const le24 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const le32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const be16 = (b, i) => (b[i] << 8) | b[i + 1];

// What the bytes are, by their first bytes.
export function sniff(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return 'gif';
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return 'png';
  const head = ascii(b, 0, Math.min(b.length, 256)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('<!doctype svg')) return 'svg';
  if (head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<script') || head.startsWith('<')) return 'markup';
  if (b.length >= 12 && ascii(b, 4, 8) === 'ftyp') return 'video-or-heif';
  return 'unknown';
}
const REFUSED = {
  gif: 'GIF images are not accepted, animated or not. Use a JPEG or WebP picture.',
  png: 'Send the image as JPEG or WebP. (The game converts PNG files for you.)',
  svg: 'Vector images (SVG) can carry scripts, so they are not accepted. Use a JPEG or WebP picture.',
  markup: 'That is a web page or script, not a picture.',
  'video-or-heif': 'That format is not supported. Use a JPEG or WebP picture.',
  unknown: 'That file is not a picture this market can show. Use a JPEG or WebP image.'
};

// ---- JPEG ---------------------------------------------------------------------------------------------------------
// Walks every marker segment. Keeps the structure the picture needs (tables, frame, scans), drops application data
// (EXIF, XMP, GPS, ICC, Photoshop, Adobe) and comments, and stops at the end-of-image marker, discarding anything after.
function inspectJpeg(b) {
  const parts = [b.subarray(0, 2)], removed = {};
  let i = 2, width = 0, height = 0, frames = 0, scans = 0, ended = false, comps = 0;
  const drop = (name) => { removed[name] = (removed[name] || 0) + 1; };
  while (i < b.length && !ended) {
    if (b[i] !== 0xff) fail('damaged', 'The image data is damaged.');
    while (i < b.length && b[i] === 0xff) i++;
    if (i >= b.length) break;
    const marker = b[i++];
    if (marker === 0xd9) { ended = true; break; }
    if (marker === 0x00 || marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) fail('damaged', 'The image data is damaged.');
    if (i + 2 > b.length) fail('truncated', 'The image ends too early. Try the upload again.');
    const len = be16(b, i);
    if (len < 2 || i + len > b.length) fail('truncated', 'The image ends too early. Try the upload again.');
    const seg = b.subarray(i - 2, i + len), payload = i + 2;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (marker !== 0xc0 && marker !== 0xc1 && marker !== 0xc2) fail('unsupported', 'That kind of JPEG (arithmetic, lossless or hierarchical) is not accepted.');
      if (len < 8 || b[payload] !== 8) fail('unsupported', 'Only 8-bit pictures are accepted.');
      height = be16(b, payload + 1); width = be16(b, payload + 3); comps = b[payload + 5];
      if (comps !== 1 && comps !== 3) fail('unsupported', 'Only grey and colour (RGB) pictures are accepted.');
      frames++;
      if (frames > 1) fail('damaged', 'The image data is damaged.');
      parts.push(seg);
    } else if (marker >= 0xe0 && marker <= 0xef) {
      // application data: JFIF (APP0) is only a header and is kept; everything else is metadata and is dropped
      if (marker === 0xe0 && len >= 7 && ascii(b, payload, payload + 4) === 'JFIF') parts.push(seg);
      else drop('APP' + (marker - 0xe0));
    } else if (marker === 0xfe) {
      drop('COM');
    } else {
      parts.push(seg);
    }
    i += len;
    if (marker === 0xda) {
      if (!frames) fail('damaged', 'The image data is damaged.');
      scans++;
      // entropy-coded data runs to the next real marker (stuffed 0xFF00 and restart markers belong to it)
      let j = i;
      while (j < b.length - 1) {
        if (b[j] === 0xff) {
          const n = b[j + 1];
          if (n === 0x00 || (n >= 0xd0 && n <= 0xd7)) { j += 2; continue; }
          if (n === 0xff) { j++; continue; }
          break;
        }
        j++;
      }
      if (j >= b.length - 1 && !(b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9)) fail('truncated', 'The image ends too early. Try the upload again.');
      parts.push(b.subarray(i, j));
      i = j;
    }
  }
  if (!ended) fail('truncated', 'The image ends too early. Try the upload again.');
  if (!frames || !scans || !width || !height) fail('damaged', 'The image data is damaged.');
  parts.push(Uint8Array.of(0xff, 0xd9));
  return { type: 'jpeg', width, height, parts, removed, trailing: b.length - i - 0 };
}

// ---- WebP ---------------------------------------------------------------------------------------------------------
function inspectWebp(b) {
  if (b.length < 20) fail('truncated', 'The image ends too early. Try the upload again.');
  const riff = le32(b, 4);
  if (riff < 12) fail('damaged', 'The image data is damaged.');
  if (riff + 8 > b.length) fail('truncated', 'The image ends too early. Try the upload again.');
  const end = riff + 8, chunks = [], removed = {};
  let i = 12;
  while (i + 8 <= end) {
    const tag = ascii(b, i, i + 4), size = le32(b, i + 4), data = i + 8, next = data + size + (size & 1);
    if (next > end) fail('truncated', 'The image ends too early. Try the upload again.');
    chunks.push({ tag, size, data, next, start: i });
    i = next;
    if (chunks.length > 16) fail('damaged', 'The image has too many parts.');
  }
  if (i !== end) fail('damaged', 'The image data is damaged.');
  const tags = chunks.map((c) => c.tag);
  if (tags.includes('ANIM') || tags.includes('ANMF')) fail('animated', 'Animated images are not accepted.');
  const known = ['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ICCP', 'EXIF', 'XMP '];
  if (tags.some((t) => !known.includes(t))) fail('damaged', 'The image has parts this market does not accept.');
  const frame = chunks.filter((c) => c.tag === 'VP8 ' || c.tag === 'VP8L');
  if (frame.length !== 1) fail('damaged', 'The image data is damaged.');
  const f = frame[0], x = chunks.find((c) => c.tag === 'VP8X');
  let width, height;
  if (f.tag === 'VP8 ') {
    if (f.size < 10 || b[f.data + 3] !== 0x9d || b[f.data + 4] !== 0x01 || b[f.data + 5] !== 0x2a) fail('damaged', 'The image data is damaged.');
    width = le16(b, f.data + 6) & 0x3fff; height = le16(b, f.data + 8) & 0x3fff;
  } else {
    if (f.size < 5 || b[f.data] !== 0x2f) fail('damaged', 'The image data is damaged.');
    const bits = le32(b, f.data + 1);
    width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
  }
  if (x) {
    if (x.size < 10 || chunks[0] !== x) fail('damaged', 'The image data is damaged.');
    if (b[x.data] & 0x02) fail('animated', 'Animated images are not accepted.');
    if (1 + le24(b, x.data + 4) !== width || 1 + le24(b, x.data + 7) !== height) fail('damaged', 'The image data is damaged.');
  } else if (chunks.length !== 1) {
    fail('damaged', 'The image data is damaged.');
  }
  if (!width || !height) fail('damaged', 'The image data is damaged.');
  // rebuild without colour profile, camera data and extensible metadata
  const keep = [];
  chunks.forEach((c) => {
    if (c.tag === 'ICCP' || c.tag === 'EXIF' || c.tag === 'XMP ') { removed[c.tag.trim()] = (removed[c.tag.trim()] || 0) + 1; return; }
    if (c.tag === 'VP8X') {
      const head = new Uint8Array(b.subarray(c.start, c.next));
      head[8] &= ~(0x20 | 0x08 | 0x04 | 0x02); // ICC, EXIF, XMP and animation flags
      keep.push(head);
    } else keep.push(b.subarray(c.start, c.next));
  });
  const body = keep.reduce((n, p) => n + p.length, 0), head = new Uint8Array(12);
  head.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const size = body + 4;
  head[4] = size & 0xff; head[5] = (size >>> 8) & 0xff; head[6] = (size >>> 16) & 0xff; head[7] = (size >>> 24) & 0xff;
  return { type: 'webp', width, height, parts: [head].concat(keep), removed, trailing: b.length - end };
}

function join(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p) => { out.set(p, at); at += p.length; });
  return out;
}

// Validates one uploaded variant and returns the cleaned bytes with what was learned about them. Throws ApiError.
//   declaredType: the request's content type; it must agree with what the bytes are.
export function inspectImage(bytes, declaredType, variant) {
  const spec = VARIANTS[variant];
  if (!spec) fail('no-such-variant', 'Choose thumb, card or full.', 404);
  if (!bytes.length) fail('empty', 'The upload was empty.');
  if (bytes.length > spec.maxBytes) fail('too-large', 'That ' + variant + ' picture is over ' + Math.round(spec.maxBytes / 1000) + ' KB.', 413);
  const kind = sniff(bytes);
  if (kind !== 'jpeg' && kind !== 'webp') fail('unsupported-type', REFUSED[kind] || REFUSED.unknown, 415);
  if (String(declaredType || '').split(';')[0].trim().toLowerCase() !== TYPES[kind]) fail('type-mismatch', 'The file is ' + TYPES[kind] + ' but was sent as ' + (declaredType || 'nothing') + '.', 415);
  const info = kind === 'jpeg' ? inspectJpeg(bytes) : inspectWebp(bytes);
  const side = Math.max(info.width, info.height), small = Math.min(info.width, info.height);
  if (side > spec.maxSide) fail('dimensions', 'The ' + variant + ' picture can be at most ' + spec.maxSide + ' pixels on its long side.');
  if (small < spec.minSide) fail('dimensions', 'The ' + variant + ' picture must be at least ' + spec.minSide + ' pixels on its short side.');
  if (info.width * info.height > MAX_PIXELS) fail('dimensions', 'That picture has too many pixels.');
  const cleaned = join(info.parts);
  if (cleaned.length > spec.maxBytes) fail('too-large', 'That ' + variant + ' picture is over ' + Math.round(spec.maxBytes / 1000) + ' KB.', 413);
  return { type: TYPES[kind], width: info.width, height: info.height, bytes: cleaned, removed: info.removed, stripped: Object.keys(info.removed).length > 0 || info.trailing > 0, trailing: info.trailing };
}

// All three variants must show the same picture: their shapes agree to within a pixel of rounding.
export function sameShape(a, b) {
  const ra = a.width / a.height, rb = b.width / b.height;
  return Math.abs(ra - rb) / Math.max(ra, rb) < 0.03;
}
