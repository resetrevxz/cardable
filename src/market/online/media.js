/* Cardable Market — pictures for listings (the player's side).
 * Picks the bytes apart before anything leaves the device: what the file really is (never its name), that it is not
 * animated or a vector image, that it decodes, and what part of it the player chose to show. The result is three small
 * re-encoded pictures with no camera data, GPS or colour profile (drawing to a canvas drops all of it), which is all
 * that is ever uploaded. The server checks every byte again; this is courtesy and economy, not trust.
 *
 * Nothing is uploaded unless the player takes an explicit action and has confirmed that the picture will be published.
 * The Director album and the original files are only read: never changed, renamed or deleted. */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var online = function () { return C.market.online; };

  var VARIANTS = { thumb: { maxSide: 320, maxBytes: 40000, minSide: 48 }, card: { maxSide: 960, maxBytes: 180000, minSide: 96 }, full: { maxSide: 1920, maxBytes: 600000, minSide: 160 } };
  var ORDER = ['thumb', 'card', 'full'];
  var SOURCE = { maxBytes: 15 * 1024 * 1024, maxSide: 12000, maxPixels: 60000000, minShort: 200 };
  var LAYOUTS = { banner: { ratio: 16 / 9, label: 'Banner 16:9' }, square: { ratio: 1, label: 'Square 1:1' }, portrait: { ratio: 4 / 5, label: 'Portrait 4:5' } };

  function failure(code, message, extra) { return Object.assign(new Error(message), { code: code, detail: extra || null }); }

  // ---- what a file is, from its first bytes ---------------------------------------------------------------------------
  function ascii(b, from, to) { var s = ''; for (var i = from; i < to && i < b.length; i++) s += String.fromCharCode(b[i]); return s; }
  function sniff(bytes) {
    var b = bytes;
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (b.length > 11 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'webp';
    if (b.length > 7 && b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return 'png';
    if (ascii(b, 0, 3) === 'GIF') return 'gif';
    var head = ascii(b, 0, 200).replace(/^\s+/, '').toLowerCase();
    if (head.indexOf('<svg') === 0 || head.indexOf('<?xml') === 0) return 'svg';
    return 'other';
  }
  // Animated PNG has an acTL chunk before the first IDAT; animated WebP has an ANIM chunk or the VP8X animation flag.
  function animated(type, b) {
    if (type === 'webp') {
      var s = ascii(b, 12, Math.min(b.length, 8192));
      return s.indexOf('ANIM') >= 0 || s.indexOf('ANMF') >= 0 || (ascii(b, 12, 16) === 'VP8X' && (b[20] & 0x02) !== 0);
    }
    if (type === 'png') { var t = ascii(b, 8, Math.min(b.length, 8192)), idat = t.indexOf('IDAT'), act = t.indexOf('acTL'); return act >= 0 && (idat < 0 || act < idat); }
    return false;
  }
  var REFUSED = {
    gif: 'GIF pictures are not accepted, animated or not. Choose a JPEG, PNG or WebP picture.',
    svg: 'Vector pictures (SVG) can carry scripts, so they are not accepted. Choose a JPEG, PNG or WebP picture.',
    other: 'That file is not a picture this market can show. Choose a JPEG, PNG or WebP picture.'
  };

  function readHead(blob) {
    var part = blob.slice(0, 16384);
    if (part.arrayBuffer) return part.arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
    return new Promise(function (resolve, reject) { var r = new root.FileReader(); r.onload = function () { resolve(new Uint8Array(r.result)); }; r.onerror = function () { reject(r.error); }; r.readAsArrayBuffer(part); });
  }
  // Decodes with the browser's own decoder, applying the picture's rotation so a photo turned on its side is shown upright.
  function decode(blob) {
    if (typeof root.createImageBitmap === 'function') {
      return root.createImageBitmap(blob, { imageOrientation: 'from-image' }).then(function (bmp) { return { source: bmp, width: bmp.width, height: bmp.height, close: function () { try { bmp.close(); } catch (_) { /* closed */ } } }; });
    }
    return new Promise(function (resolve, reject) {
      var url = root.URL.createObjectURL(blob), img = new root.Image();
      img.onload = function () { resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: function () { root.URL.revokeObjectURL(url); } }); };
      img.onerror = function () { root.URL.revokeObjectURL(url); reject(failure('undecodable', 'That picture could not be read. It may be damaged.')); };
      img.src = url;
    });
  }
  // Opens a file or album photo for choosing a crop: verified, decoded and ready to draw. Close it when done.
  function open(blob) {
    if (!blob || !blob.size) return Promise.reject(failure('empty', 'That file is empty.'));
    if (blob.size > SOURCE.maxBytes) return Promise.reject(failure('too-large', 'That picture is over ' + Math.round(SOURCE.maxBytes / 1048576) + ' MB. Choose a smaller one.'));
    return readHead(blob).then(function (head) {
      var type = sniff(head);
      if (type !== 'jpeg' && type !== 'png' && type !== 'webp') throw failure('unsupported', REFUSED[type] || REFUSED.other);
      if (animated(type, head)) throw failure('animated', 'Animated pictures are not accepted. Choose a still picture.');
      return decode(blob).then(function (d) {
        if (!d.width || !d.height || d.width > SOURCE.maxSide || d.height > SOURCE.maxSide || d.width * d.height > SOURCE.maxPixels) { d.close(); throw failure('dimensions', 'That picture is too large to use. Choose one under ' + SOURCE.maxSide + ' pixels on a side.'); }
        if (Math.min(d.width, d.height) < SOURCE.minShort) { d.close(); throw failure('small', 'That picture is too small. It needs at least ' + SOURCE.minShort + ' pixels on its short side.'); }
        return { type: type, width: d.width, height: d.height, source: d.source, close: d.close, bytes: blob.size };
      }, function (e) { throw e && e.code ? e : failure('undecodable', 'That picture could not be read. It may be damaged.'); });
    });
  }

  // ---- cropping and encoding ----------------------------------------------------------------------------------------------
  // crop: { layout, zoom (1-4), x, y (0-100, where in the spare room the window sits) } -> a rectangle of the source.
  function cropRect(img, crop) {
    var L = LAYOUTS[crop.layout] || LAYOUTS.banner, a = L.ratio, w, hgt;
    if (img.width / img.height > a) { hgt = img.height; w = hgt * a; } else { w = img.width; hgt = w / a; }
    var z = Math.max(1, Math.min(4, Number(crop.zoom) || 1));
    w /= z; hgt /= z;
    var x = (img.width - w) * Math.max(0, Math.min(100, crop.x == null ? 50 : crop.x)) / 100, y = (img.height - hgt) * Math.max(0, Math.min(100, crop.y == null ? 50 : crop.y)) / 100;
    return { sx: x, sy: y, sw: w, sh: hgt, ratio: a };
  }
  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) { try { canvas.toBlob(function (b) { b ? resolve(b) : reject(failure('encode', 'The picture could not be prepared.')); }, type, quality); } catch (e) { reject(e); } });
  }
  // Draws the cropped window at `side` pixels on its long edge and encodes it under its byte budget.
  function render(img, r, name) {
    var v = VARIANTS[name], longSrc = Math.max(r.sw, r.sh), side = Math.min(v.maxSide, Math.round(longSrc));
    var attempt = 0, quality = 0.84;
    function once() {
      var scale = side / longSrc, w = Math.max(1, Math.round(r.sw * scale)), h = Math.max(1, Math.round(r.sh * scale));
      if (Math.min(w, h) < v.minSide) return Promise.reject(failure('small', 'The part you chose is too small to show clearly. Zoom out a little.'));
      var canvas = root.document.createElement('canvas'); canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#16181c'; ctx.fillRect(0, 0, w, h);   // a flat backing, so a transparent picture has no hidden surprise
      ctx.drawImage(img.source, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
      return toBlob(canvas, 'image/webp', quality).then(function (b) {
        var type = b.type === 'image/webp' ? 'image/webp' : null;
        if (!type) return toBlob(canvas, 'image/jpeg', quality).then(function (j) { return { blob: j, width: w, height: h }; });
        return { blob: b, width: w, height: h };
      }).then(function (out) {
        if (out.blob.size <= v.maxBytes) return out;
        attempt++;
        if (attempt > 10) return Promise.reject(failure('too-large', 'That picture cannot be made small enough. Try a simpler picture.'));
        if (quality > 0.46) quality -= 0.08; else side = Math.max(Math.ceil(v.minSide * 1.1), Math.round(side * 0.85));
        return once();
      });
    }
    return once();
  }
  // All three sizes of one crop, and what the player will see: { variants: { thumb, card, full }, aspect }
  function prepare(img, crop) {
    var r = cropRect(img, crop);
    return render(img, r, 'thumb').then(function (t) {
      return render(img, r, 'card').then(function (c) {
        return render(img, r, 'full').then(function (f) { return { variants: { thumb: t, card: c, full: f }, ratio: r.ratio, bytes: t.blob.size + c.blob.size + f.blob.size }; });
      });
    });
  }

  // ---- upload ------------------------------------------------------------------------------------------------------------------
  function slotKey() { return 'up-' + Date.now().toString(36) + '-' + String(C.randomId ? C.randomId('k') : Math.random()).replace(/[^A-Za-z0-9]/g, '').slice(0, 16); }
  function putVariant(base, token, uploadId, name, blob, onProgress, holder) {
    return new Promise(function (resolve, reject) {
      var xhr = new root.XMLHttpRequest();
      holder.xhr = xhr;
      xhr.open('PUT', base + '/v1/uploads/' + encodeURIComponent(uploadId) + '/' + name);
      xhr.setRequestHeader('authorization', 'Bearer ' + token);
      xhr.setRequestHeader('content-type', blob.type);
      xhr.timeout = 60000;
      if (xhr.upload) xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded); };
      xhr.onload = function () {
        var json = null; try { json = JSON.parse(xhr.responseText); } catch (_) { /* not json */ }
        if (xhr.status >= 200 && xhr.status < 300 && json && json.ok) { onProgress(blob.size); resolve(json.data); return; }
        var err = json && json.error || { code: 'http-' + xhr.status, message: 'The upload was refused.' };
        reject(failure(err.code, err.message, { status: xhr.status }));
      };
      xhr.onerror = function () { reject(failure('offline', 'The connection dropped during the upload.')); };
      xhr.ontimeout = function () { reject(failure('offline', 'The upload took too long.')); };
      xhr.onabort = function () { reject(failure('cancelled', 'The upload was cancelled.')); };
      xhr.send(blob);
    });
  }
  // Starts an upload and returns { promise, cancel }. `onProgress(fraction)` is called with real bytes sent. A cancelled or
  // failed upload leaves nothing: its slot is removed. Each size is retried a couple of times if the connection drops.
  function upload(prepared, options) {
    options = options || {};
    var holder = { xhr: null }, cancelled = false, uploadId = null, total = ORDER.reduce(function (n, k) { return n + prepared.variants[k].blob.size; }, 0), sent = 0, base = online().base();
    function progress(done) { if (options.onProgress) options.onProgress(Math.min(1, (sent + done) / total)); }
    var promise = online().authed('POST', '/v1/uploads', { source: options.source === 'director' ? 'director' : 'file' }, { idempotencyKey: slotKey() }).then(function (slot) {
      uploadId = slot.uploadId;
      var chain = Promise.resolve();
      ORDER.forEach(function (name) {
        chain = chain.then(function () {
          if (cancelled) throw failure('cancelled', 'The upload was cancelled.');
          var blob = prepared.variants[name].blob, tries = 0;
          function attempt() {
            return online().ensureToken().then(function (token) { return putVariant(base, token, uploadId, name, blob, progress, holder); }).then(function (res) { sent += blob.size; return res; }, function (e) {
              if (e.code === 'offline' && tries++ < 2 && !cancelled) return new Promise(function (r) { root.setTimeout(r, 500 * tries); }).then(attempt);
              throw e;
            });
          }
          return attempt();
        });
      });
      return chain.then(function (last) { if (!last || !last.ready) throw failure('incomplete', 'The upload did not finish.'); return { uploadId: uploadId }; });
    }).then(null, function (error) {
      var clean = uploadId ? online().authed('DELETE', '/v1/uploads/' + encodeURIComponent(uploadId), null, { idempotencyKey: slotKey() }).then(null, function () { /* the sweep removes it */ }) : Promise.resolve();
      return clean.then(function () { throw error; });
    });
    return { promise: promise, cancel: function () { cancelled = true; if (holder.xhr) try { holder.xhr.abort(); } catch (_) { /* done */ } } };
  }

  // ---- reading -----------------------------------------------------------------------------------------------------------------
  // A picture is fetched with the player's own token and shown from memory, so no token is ever in an address and a
  // picture is never loaded by another site's request. Kept briefly so a feed does not fetch the same thing twice.
  var cache = new Map(), MAX = 80;
  function url(id, variant) {
    var key = id + '/' + variant;
    if (cache.has(key)) { var hit = cache.get(key); cache.delete(key); cache.set(key, hit); return hit; }
    var p = online().ensureToken().then(function (token) {
      return root.fetch(online().base() + '/v1/media/' + encodeURIComponent(id) + '/' + variant, { headers: { authorization: 'Bearer ' + token }, credentials: 'omit', cache: 'default' });
    }).then(function (res) {
      if (!res.ok) throw failure('unavailable', 'The picture is not available.');
      return res.blob();
    }).then(function (blob) { return root.URL.createObjectURL(blob); });
    cache.set(key, p);
    p.then(null, function () { cache.delete(key); });
    while (cache.size > MAX) { var oldest = cache.keys().next().value, old = cache.get(oldest); cache.delete(oldest); old.then(function (u) { try { root.URL.revokeObjectURL(u); } catch (_) { /* gone */ } }, function () {}); }
    return p;
  }
  // Puts a picture into an <img> when the element is near the screen. Returns the element.
  var observer = null;
  function lazy(img, id, variant) {
    img.dataset.media = id + '/' + variant;
    function load() {
      if (img.dataset.loaded) return;
      img.dataset.loaded = '1';
      img.addEventListener('load', function () { img.classList.add('is-loaded'); });
      img.addEventListener('error', function () { img.dataset.failed = '1'; img.classList.add('is-failed'); if (img.parentNode) img.parentNode.classList.add('is-missing'); });
      url(id, variant).then(function (u) { img.src = u; }, function () { img.dataset.failed = '1'; img.classList.add('is-failed'); if (img.parentNode) img.parentNode.classList.add('is-missing'); });
    }
    if (typeof root.IntersectionObserver !== 'function') { load(); return img; }
    if (!observer) observer = new root.IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { observer.unobserve(e.target); e.target.__load && e.target.__load(); } }); }, { rootMargin: '240px' });
    img.__load = load; observer.observe(img);
    return img;
  }
  function forget() { cache.forEach(function (p) { p.then(function (u) { try { root.URL.revokeObjectURL(u); } catch (_) { /* gone */ } }, function () {}); }); cache.clear(); }

  C.market.media = { VARIANTS: VARIANTS, LAYOUTS: LAYOUTS, SOURCE: SOURCE, sniff: sniff, open: open, cropRect: cropRect, prepare: prepare, upload: upload, url: url, lazy: lazy, forget: forget };
})(window.Cardable = window.Cardable || {}, window);
