/** Photo album as an inventory page, beside the cards and Achievements.
 *  Photos stay in their own IndexedDB store; this file only presents them. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, panel = null, opened = false, list = [], shown = [], urls = new Map(), picked = new Set(), selectedId = null, anchorId = null;
  var grid, inspector, usage, meter, search, sort = 'newest', tagFilter = '', tagBar, bulk, bulkText, status, lightbox = null, fullUrl = null, revision = 0, busy = false, stopBatch = false, folder = null, tab = null;
  function usageText(info) { var text = info.count + ' / ' + C.studioAlbum.limit + ' photos · ' + (info.bytes / 1048576).toFixed(1) + ' MB'; if (info.estimate && Number.isFinite(info.estimate.usage) && Number.isFinite(info.estimate.quota)) text += ' · storage ' + (info.estimate.usage / 1048576).toFixed(1) + ' / ' + (info.estimate.quota / 1048576).toFixed(0) + ' MB'; return text; }
  function say(text) { if (status) status.textContent = text || ''; }
  function button(label, host, run, cls, icon) { var b = node('button', cls || 'album-button', host); b.type = 'button'; if (icon) b.appendChild(C.icons.create(icon)); if (label) node('span', '', b, label); b.addEventListener('click', run); return b; }
  function thumb(photo) { if (!urls.has(photo.id) && photo.thumb) urls.set(photo.id, URL.createObjectURL(photo.thumb)); return urls.get(photo.id) || ''; }
  function favorite(photo) { return (photo.tags || []).indexOf('favorite') >= 0; }
  function when(time) { return C.formats ? C.formats.date(time, true) : new Date(time).toLocaleString(); }
  function blocked() { return root.document.hidden || C.opening.phase !== 'idle' || C.preferences.open || C.tutorial.active || C.detail.phase !== 'closed' || C.studio.active || C.studio.pending; }

  function build() {
    panel = node('section', 'album-page', C.inventory.content); panel.id = 'inventory-album'; panel.hidden = true; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-label', 'Photo album');
    var head = node('header', 'album-head', panel), copy = node('div', 'album-title', head); node('p', 'album-eyebrow', copy, 'Studio photos'); node('h2', '', copy, 'Photo album'); usage = node('p', 'album-usage', copy, '');
    meter = node('div', 'album-meter', copy); node('i', '', meter); meter.setAttribute('role', 'progressbar'); meter.setAttribute('aria-label', 'Album space used'); meter.setAttribute('aria-valuemin', 0); meter.setAttribute('aria-valuemax', C.studioAlbum.limit);
    var tools = node('div', 'album-tools', head), field = node('label', 'album-search', tools); field.appendChild(C.icons.create('search')); search = node('input', '', field); search.type = 'search'; search.placeholder = 'Search names and tags…'; search.setAttribute('aria-label', 'Search photos'); search.autocomplete = 'off'; search.addEventListener('input', paint);
    var order = C.ui.create('segmented-control', { label: 'Sort photos', options: ['Newest', 'Oldest', 'Name'], value: 0, onChange: function (value) { sort = value.toLowerCase(); paint(); } }); order.classList.add('album-sort'); tools.appendChild(order);
    button('Back to cards', tools, close, 'album-button album-back');
    tagBar = node('div', 'album-tags cb-scroll', panel); tagBar.setAttribute('role', 'group'); tagBar.setAttribute('aria-label', 'Filter by tag');
    bulk = node('div', 'album-bulk', panel); bulkText = node('strong', '', bulk, '');
    button('Select all', bulk, function () { shown.forEach(function (p) { picked.add(p.id); }); paint(); });
    button('Clear', bulk, function () { picked.clear(); paint(); });
    button('Compare two', bulk, compare, 'album-button', 'eye');
    button('Download', bulk, function () { batch(Array.from(picked), false); }, 'album-button', 'download');
    var all = button('Export all to a folder', bulk, function () { batch(list.map(function (p) { return p.id; }), true); }, 'album-button', 'folder'); all.disabled = !C.studioFiles.folders; if (all.disabled) all.title = 'Folder export is available in the Windows app and supporting browsers.';
    var stop = button('Stop', bulk, function () { stopBatch = true; }, 'album-button album-stop'); stop.hidden = true; bulk.stop = stop;
    status = node('span', 'album-status', bulk); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var work = node('div', 'album-work', panel); grid = node('div', 'album-grid cb-scroll', work); grid.setAttribute('role', 'listbox'); grid.setAttribute('aria-label', 'Photos'); grid.setAttribute('aria-multiselectable', 'true'); grid.tabIndex = 0;
    inspector = node('aside', 'album-inspector cb-scroll', work); inspector.setAttribute('aria-label', 'Selected photo');
    C.keys.listen(panel, 'keydown', 'album.page', keys);
    C.events.on('inventory:pageChanged', function (p) { if (p.id !== 'album' && opened) hide(); });
    C.events.on('inventory:close', function () { if (opened) close(); });
    C.events.on('studio:albumChanged', function () { if (opened && !busy) refresh(selectedId); });
    C.events.on('save:willReplace', close);
  }
  function filtered() {
    var query = search.value.trim().toLowerCase(), out = list.filter(function (p) { return (!tagFilter || (p.tags || []).indexOf(tagFilter) >= 0) && (!query || [p.name, p.cardId].concat(p.tags || []).join(' ').toLowerCase().indexOf(query) >= 0); });
    if (sort === 'oldest') out = out.slice().reverse(); else if (sort === 'name') out = out.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return out;
  }
  function paint() {
    shown = filtered(); grid.replaceChildren(); tagBar.replaceChildren();
    var tags = new Map(); list.forEach(function (p) { (p.tags || []).forEach(function (t) { tags.set(t, (tags.get(t) || 0) + 1); }); });
    if (tagFilter && !tags.has(tagFilter)) { tagFilter = ''; shown = filtered(); }
    tagBar.hidden = !tags.size;
    [['', 'All · ' + list.length]].concat(Array.from(tags.keys()).sort(function (a, b) { return (b === 'favorite') - (a === 'favorite') || a.localeCompare(b); }).map(function (t) { return [t, (t === 'favorite' ? '★ Favorites' : t) + ' · ' + tags.get(t)]; })).forEach(function (pair) {
      var chip = button(pair[1], tagBar, function () { tagFilter = pair[0]; paint(); }, 'album-chip'); chip.setAttribute('aria-pressed', String(tagFilter === pair[0]));
    });
    if (!shown.length) {
      var empty = node('div', 'album-empty', grid); empty.appendChild(C.icons.create('camera')); node('strong', '', empty, list.length ? 'No photos match.' : 'No photos yet.');
      node('p', '', empty, list.length ? 'Try another search or tag.' : 'Open a card, choose Inspect, and capture a photo. It will appear here.');
      if (list.length) button('Clear filters', empty, function () { search.value = ''; tagFilter = ''; paint(); }); else button('Back to cards', empty, close);
    }
    shown.forEach(function (photo, index) {
      var tile = node('div', 'album-tile', grid); tile.dataset.id = photo.id; tile.setAttribute('role', 'option'); tile.setAttribute('aria-selected', String(photo.id === selectedId)); tile.style.setProperty('--i', Math.min(index, 14));
      tile.classList.toggle('is-picked', picked.has(photo.id));
      var open = button('', tile, function (event) { choose(photo.id, event); }, 'album-thumb'); open.setAttribute('aria-label', 'Photo: ' + photo.name); open.addEventListener('dblclick', function () { view(photo.id); });
      var img = node('img', '', open); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false; img.src = thumb(photo);
      var check = button('', tile, function () { if (picked.has(photo.id)) picked.delete(photo.id); else picked.add(photo.id); anchorId = photo.id; sync(); }, 'album-check', 'check'); check.setAttribute('aria-label', 'Select ' + photo.name); check.setAttribute('aria-pressed', String(picked.has(photo.id)));
      var star = button('', tile, function () { toggleFavorite(photo); }, 'album-star', 'star'); star.setAttribute('aria-label', (favorite(photo) ? 'Remove from' : 'Add to') + ' favorites: ' + photo.name); star.setAttribute('aria-pressed', String(favorite(photo)));
      var caption = node('div', 'album-caption', tile); node('strong', '', caption, photo.name); node('span', '', caption, when(photo.createdAt));
    });
    sync();
  }
  // Selection state changes often; it updates classes without rebuilding the grid.
  function sync() {
    grid.querySelectorAll('.album-tile').forEach(function (tile) { var id = tile.dataset.id; tile.classList.toggle('is-picked', picked.has(id)); tile.setAttribute('aria-selected', String(id === selectedId)); tile.querySelector('.album-check').setAttribute('aria-pressed', String(picked.has(id))); });
    bulk.dataset.active = String(picked.size > 0); bulkText.textContent = picked.size ? picked.size + ' selected' : shown.length + (shown.length === 1 ? ' photo' : ' photos');
  }
  function choose(id, event) {
    if (event && (event.ctrlKey || event.metaKey)) { if (picked.has(id)) picked.delete(id); else picked.add(id); anchorId = id; sync(); return; }
    if (event && event.shiftKey && anchorId) { var a = shown.findIndex(function (p) { return p.id === anchorId; }), b = shown.findIndex(function (p) { return p.id === id; }); if (a >= 0 && b >= 0) shown.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(function (p) { picked.add(p.id); }); sync(); return; }
    anchorId = id; select(id);
  }
  function freeFull() { if (fullUrl) { URL.revokeObjectURL(fullUrl); fullUrl = null; } }
  async function select(id) {
    var ticket = ++revision; selectedId = id; sync(); freeFull();
    if (!id) { inspector.replaceChildren(); var hint = node('div', 'album-hint', inspector); hint.appendChild(C.icons.create('image')); node('p', '', hint, list.length ? 'Choose a photo to rename, tag, download or reopen its scene.' : 'Your photos will appear here.'); return; }
    try {
      var photo = await C.studioAlbum.get(id); if (ticket !== revision || !opened) return;
      if (!photo || !(photo.blob instanceof root.Blob)) { say('That photo was removed.'); selectedId = null; return select(null); }
      inspector.replaceChildren(); inspector.classList.remove('is-entering'); void inspector.offsetWidth; inspector.classList.add('is-entering');
      fullUrl = URL.createObjectURL(photo.blob);
      var frame = button('', inspector, function () { view(id); }, 'album-preview'); frame.setAttribute('aria-label', 'View ' + photo.name + ' full size'); frame.title = 'View full size · Enter'; var img = node('img', '', frame); img.alt = photo.name; img.src = fullUrl; img.draggable = false;
      var name = node('input', 'album-name', inspector); name.type = 'text'; name.value = photo.name; name.maxLength = 60; name.setAttribute('aria-label', 'Photo name'); name.spellcheck = false;
      function rename() { var next = name.value.trim() || 'Untitled photo'; if (next === photo.name) return; photo.name = next; C.studioAlbum.rename(id, next).then(function () { say('Renamed.'); return refresh(id, true); }, fail); }
      name.addEventListener('change', rename); C.keys.listen(name, 'keydown', 'album.name', function (event) { if (event.key === 'Enter') { event.preventDefault(); name.blur(); } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); name.value = photo.name; name.blur(); } });
      node('p', 'album-meta', inspector, photo.w + ' × ' + photo.h + ' · ' + when(photo.createdAt));
      var tags = node('div', 'album-tag-editor', inspector); (photo.tags || []).forEach(function (tag) { var chip = button(tag === 'favorite' ? '★ favorite' : tag, tags, function () { saveTags(photo, (photo.tags || []).filter(function (t) { return t !== tag; })); }, 'album-chip album-chip--remove'); chip.title = 'Remove tag'; chip.setAttribute('aria-label', 'Remove tag ' + tag); });
      var add = node('input', 'album-tag-input', tags); add.type = 'text'; add.placeholder = (photo.tags || []).length >= 8 ? 'Eight tags at most' : 'Add a tag…'; add.maxLength = 24; add.disabled = (photo.tags || []).length >= 8; add.setAttribute('aria-label', 'Add a tag');
      C.keys.listen(add, 'keydown', 'album.tag', function (event) { if ((event.key === 'Enter' || event.key === ',') && add.value.trim()) { event.preventDefault(); saveTags(photo, (photo.tags || []).concat(add.value.trim().toLowerCase())); } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); add.value = ''; add.blur(); } });
      var owned = C.state.current.inventory.some(function (i) { return i.instanceId === photo.instanceId && i.cardId === photo.cardId; });
      var actions = node('div', 'album-actions', inspector);
      button('Download', actions, function () { Promise.resolve(C.studioPhoto.download(photo)).then(function () { say('Downloaded.'); }, fail); }, 'album-button album-primary', 'download');
      var copy = button('Copy', actions, function () { C.studioPhoto.copy(photo).then(function () { say('Image copied.'); }, function (error) { say(error.message + ' Download it instead.'); }); }, 'album-button', 'copy'); copy.disabled = !C.studioPhoto.clipboard;
      var reopen = button('Reopen scene', actions, function () { if (owned) C.studio.reopenPhoto(photo); }, 'album-button', 'camera'); reopen.disabled = !owned; if (!owned) reopen.title = 'This serial is no longer in your collection.';
      var remove = button('Delete', actions, function () {}, 'album-button album-danger', 'trash'), confirm = C.settingsControls.confirmation(remove, function () { removePhotos([photo]); }, { announce: say, confirmMessage: 'Click again within three seconds to delete this photo.' });
      inspector.confirm = confirm; C.fx.wake();
      if (!owned) node('p', 'album-meta', inspector, 'This serial has left your collection. Its photo stays here.');
    } catch (error) { fail(error); }
  }
  function fail(error) { say(error && error.message || 'That did not work. Try again.'); }
  function saveTags(photo, tags) { C.studioAlbum.tags(photo.id, tags).then(function () { return refresh(photo.id); }, fail); }
  function toggleFavorite(photo) { var tags = (photo.tags || []).slice(), at = tags.indexOf('favorite'); if (at >= 0) tags.splice(at, 1); else tags.unshift('favorite'); C.studioAlbum.tags(photo.id, tags).then(function () { return refresh(selectedId); }, fail); }
  // Deleting keeps the full photos in memory until Undo expires, so a slip is recoverable.
  async function removePhotos(metas) {
    try {
      var kept = []; for (var i = 0; i < metas.length; i++) { var full = await C.studioAlbum.get(metas[i].id); if (full) { kept.push(full); await C.studioAlbum.remove(full.id); } }
      kept.forEach(function (p) { picked.delete(p.id); if (urls.has(p.id)) { URL.revokeObjectURL(urls.get(p.id)); urls.delete(p.id); } });
      var at = shown.findIndex(function (p) { return p.id === selectedId; }), next = kept.some(function (p) { return p.id === selectedId; }) ? (shown[at + 1] || shown[at - 1] || {}).id : selectedId;
      if (kept.some(function (p) { return p.id === next; })) next = null;
      C.events.emit('studio:albumChanged'); await refresh(next || null);
      C.ui.toast(kept.length === 1 ? 'Photo deleted.' : kept.length + ' photos deleted.', { label: 'Undo', run: async function () { for (var n = 0; n < kept.length; n++) await C.studioAlbum.save(kept[n]); C.events.emit('studio:albumChanged'); if (opened) await refresh(kept[0].id); } }, 'undo', { duration: 8000 });
    } catch (error) { fail(error); }
  }
  async function compare() {
    var ids = Array.from(picked); if (ids.length !== 2) { say('Select exactly two photos to compare.'); return; }
    try { var pair = (await Promise.all(ids.map(C.studioAlbum.get))).filter(Boolean); if (pair.length === 2 && opened) view(pair[0].id, pair); } catch (error) { fail(error); }
  }
  async function batch(ids, toFolder) {
    if (busy) return; if (!ids.length) { say('Select photos first.'); return; }
    busy = true; stopBatch = false; bulk.stop.hidden = false; var chosen = null, done = 0;
    try {
      if (toFolder) { chosen = await C.studioFiles.choose(); if (!chosen) return; folder = chosen; }
      for (var i = 0; i < ids.length; i++) { if (!opened || stopBatch) break; var photo = await C.studioAlbum.get(ids[i]); if (!photo) continue; say('Saving ' + (i + 1) + ' of ' + ids.length + '…'); if (chosen) await C.studioFiles.write(chosen, photo.blob, String(i + 1).padStart(3, '0') + '-' + photo.name + '-' + photo.id.slice(0, 8)); else if (!await C.studioPhoto.download(photo)) break; done++; }
      say(stopBatch ? 'Stopped after ' + done + '. Finished files are kept.' : done + (done === 1 ? ' photo saved.' : ' photos saved.'));
    } catch (error) { fail(error); } finally { if (chosen) await C.studioFiles.release(chosen).catch(function () {}); folder = null; busy = false; bulk.stop.hidden = true; }
  }
  // Full-size viewer inside the sheet: arrows step through the filtered photos.
  async function view(id, pair) {
    closeView(); var box = lightbox = node('div', 'album-lightbox', panel); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', pair ? 'Compare photos' : 'Photo viewer'); box.urls = [];
    var stage = node('div', 'album-lightbox-stage', box), caption = node('p', 'album-lightbox-caption', box), bar = node('div', 'album-lightbox-bar', box);
    function show(photos) { box.urls.forEach(URL.revokeObjectURL); box.urls = []; stage.replaceChildren(); stage.dataset.count = photos.length; photos.forEach(function (p) { var img = node('img', '', stage), url = URL.createObjectURL(p.blob); box.urls.push(url); img.src = url; img.alt = p.name; img.draggable = false; }); caption.textContent = photos.map(function (p) { return p.name + ' · ' + p.w + ' × ' + p.h; }).join('   |   '); }
    async function step(delta) { if (pair) return; var at = shown.findIndex(function (p) { return p.id === box.current; }), next = shown[(at + delta + shown.length) % shown.length]; if (!next) return; var photo = await C.studioAlbum.get(next.id); if (lightbox !== box || !photo) return; box.current = next.id; show([photo]); }
    box.step = step;
    if (!pair) { button('', bar, function () { step(-1); }, 'album-round album-prev', 'chevron').setAttribute('aria-label', 'Previous photo'); button('', bar, function () { step(1); }, 'album-round', 'chevron').setAttribute('aria-label', 'Next photo'); }
    var done = button('Close', bar, closeView, 'album-button'); box.addEventListener('click', function (event) { if (event.target === box || event.target === stage) closeView(); });
    try { if (pair) show(pair); else { var photo = await C.studioAlbum.get(id); if (lightbox !== box) return; if (!photo) { closeView(); return; } box.current = id; show([photo]); } done.focus({ preventScroll: true }); } catch (error) { closeView(); fail(error); }
  }
  function closeView() { if (!lightbox) return; var box = lightbox, last = box.current; lightbox = null; box.urls.forEach(URL.revokeObjectURL); box.remove(); if (last && last !== selectedId && opened) select(last); var tile = grid.querySelector('.album-tile[data-id="' + (last || selectedId) + '"] .album-thumb'); if (tile) tile.focus({ preventScroll: true }); }
  function keys(event) {
    var typing = event.target.closest && event.target.closest('input');
    if (lightbox) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeView(); } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); lightbox.step(event.key === 'ArrowLeft' ? -1 : 1); } return; }
    if (typing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (picked.size) { picked.clear(); sync(); } else close(); return; }
    if (event.key === '/') { event.preventDefault(); search.focus(); return; }
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'a') { event.preventDefault(); shown.forEach(function (p) { picked.add(p.id); }); sync(); return; }
    var inGrid = event.target.closest && event.target.closest('.album-grid'); if (!inGrid || !shown.length) return;
    var at = Math.max(0, shown.findIndex(function (p) { return p.id === selectedId; })), first = grid.querySelector('.album-tile'), columns = first ? Math.max(1, Math.round(grid.clientWidth / (first.offsetWidth + 14))) : 1;
    var move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key], target = event.key === 'Home' ? 0 : event.key === 'End' ? shown.length - 1 : move ? Math.max(0, Math.min(shown.length - 1, at + move)) : null;
    if (target !== null) { event.preventDefault(); var id = shown[target].id; select(id); var el = grid.querySelector('.album-tile[data-id="' + id + '"] .album-thumb'); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } }
    else if (event.key === 'Enter' && selectedId && event.target.closest('.album-tile[aria-selected="true"]') && event.target.classList.contains('album-thumb')) { event.preventDefault(); view(selectedId); }
    else if (event.key === 'Delete' && (picked.size || selectedId)) { event.preventDefault(); var ids = picked.size ? Array.from(picked) : [selectedId]; removePhotos(list.filter(function (p) { return ids.indexOf(p.id) >= 0; })); }
    else if (event.key === ' ' && selectedId && event.target.classList.contains('album-thumb')) { event.preventDefault(); if (picked.has(selectedId)) picked.delete(selectedId); else picked.add(selectedId); sync(); }
    else if (String(event.key).toLowerCase() === 'f' && selectedId) { var photo = list.find(function (p) { return p.id === selectedId; }); if (photo) toggleFavorite(photo); }
  }
  async function refresh(id, quiet) {
    var ticket = ++revision;
    try {
      var next = await C.studioAlbum.list(), info = await C.studioAlbum.usage(next); if (!opened) return; list = next;
      var alive = new Set(list.map(function (p) { return p.id; })); picked.forEach(function (key) { if (!alive.has(key)) picked.delete(key); }); urls.forEach(function (url, key) { if (!alive.has(key)) { URL.revokeObjectURL(url); urls.delete(key); } });
      usage.textContent = usageText(info); meter.firstChild.style.transform = 'scaleX(' + Math.min(1, list.length / C.studioAlbum.limit) + ')'; meter.setAttribute('aria-valuenow', list.length);
      if (tab) tab.querySelector('.album-tab-count').textContent = String(list.length);
      paint(); if (ticket === revision && !quiet) await select(id && alive.has(id) ? id : null); else if (quiet) sync();
    } catch (error) { fail(error); }
  }
  function hide() { if (!opened) return; opened = false; revision++; stopBatch = true; closeView(); freeFull(); if (folder) C.studioFiles.release(folder).catch(function () {}); panel.hidden = true; panel.inert = true; urls.forEach(function (url) { URL.revokeObjectURL(url); }); urls.clear(); grid.replaceChildren(); inspector.replaceChildren(); if (tab) tab.setAttribute('aria-selected', 'false'); C.events.emit('studio:albumContext', { active: false }); }
  function close() { if (!opened) return; hide(); if (C.inventory.page === 'album') C.inventory.setPage(null); if (tab && tab.isConnected) tab.focus({ preventScroll: true }); }
  C.studioAlbumUI = { get active() { return false; }, get shown() { return opened; }, usageText: usageText, close: close,
    update: function (now, dt) { return !!(opened && inspector.confirm && inspector.confirm.update(now, dt)); },
    show: async function (id) {
      if (!C.inventory.content) return false; if (!panel) build(); tab = root.document.getElementById('inventory-tab-album');
      if (opened) { if (id) await select(id); return true; }
      if (blocked()) return false; C.inventory.request('full'); if (!C.inventory.open) return false;
      opened = true; panel.hidden = false; panel.inert = false; C.inventory.setPage('album'); if (tab) tab.setAttribute('aria-selected', 'true');
      picked.clear(); selectedId = null; C.events.emit('studio:albumContext', { active: true }); await refresh(id || null); if (!id) search.focus({ preventScroll: true }); return true;
    }
  };
  C.studioAlbumUI.open = C.studioAlbumUI.show; // the name the studio loader calls
  C.fx.subscribe(function (now, dt) { return C.studioAlbumUI.update(now, dt); }, 'album');
})(window.Cardable, window);
