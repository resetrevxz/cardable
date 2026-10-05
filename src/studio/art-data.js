(function (C, root) {
  'use strict';
  if (C.art.loadData) return;
  var generators = C.art.register, uris = new Map(), pending = new Map(), requests = new Set(), enabled = true, available = new Set(C.art.dataManifest || []);
  C.art.register = function (id, value) {
    if (typeof value !== 'string') return generators(id, value);
    if (!enabled) return;
    if (!/^data:image\/(webp|png|jpeg);base64,/.test(value)) throw new Error('Studio artwork must be an embedded image.');
    uris.set(id, value);
    while (uris.size > 3) uris.delete(uris.keys().next().value);
  };
  C.art.loadData = function (card) {
    enabled = true;
    if (card.art.kind !== 'image' || !available.has(card.id)) return Promise.resolve(null);
    if (pending.has(card.id)) return pending.get(card.id);
    var request, task = new Promise(function (resolve) {
      request = { cancelled: false, image: null, script: null, cancel: function () { request.cancelled = true; if (request.script) request.script.remove(); if (request.image) request.image.src = ''; resolve(null); } }; requests.add(request);
      function decode() { if (request.cancelled) return resolve(null); var uri = uris.get(card.id); if (!uri) return resolve(null); var image = request.image = new root.Image(); image.decoding = 'async'; image.src = uri; image.decode().then(function () { resolve(request.cancelled ? null : image); }, function () { resolve(null); }); }
      if (uris.has(card.id)) return decode();
      var script = request.script = root.document.createElement('script'); script.src = 'assets/art-data/' + encodeURIComponent(card.id) + '.js'; script.async = true;
      script.onload = function () { script.remove(); decode(); }; script.onerror = function () { script.remove(); resolve(null); }; root.document.head.appendChild(script);
    }).finally(function () { requests.delete(request); if (pending.get(card.id) === task) pending.delete(card.id); });
    pending.set(card.id, task); return task;
  };
  C.art.releaseStudioData = function () { enabled = false; requests.forEach(function (request) { request.cancel(); }); pending.clear(); uris.clear(); };
})(window.Cardable, window);
