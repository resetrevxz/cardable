/* Cardable release journal. Reuses static inventory cards and one focused view. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, doc = root.document;
  var version = C.config.version, seenKey = 'cardable.patchNotesSeen';
  var overlay, modal, archive, content, scroll, search, sort, filters, status, progress, modeButton, hud, hover;
  var opened = false, interactive = false, activeVersion = version, query = '', order = 'newest', filter = 'overview';
  var savedFocus, inspectFocus, inspectLayer, inspectView, inspector;
  var views = [], inertRecords = [], positions = {}, expansions = {}, observer, visibleViews = new Map();
  var categories = { features: 'Features', systems: 'Systems', visuals: 'Visuals', qol: 'Quality of life', fixes: 'Fixes' };
  var paths = {
    journal: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
    cards: 'M7 3h13v17H7zM4 7H2v14h13', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
    arrow: 'M5 12h14m-5-5 5 5-5 5', close: 'm6 6 12 12M6 18 18 6',
    motion: 'M3 8h11M3 12h7M3 16h11m2-12 5 8-5 8', chevron: 'm8 10 4 4 4-4', copy: 'M8 8h12v13H8zM16 8V3H3v13h5',
    check: 'm5 12 4 4L19 6', expand: 'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5'
  };
  function icon(name, host) {
    var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('patch-icon');
    var path = doc.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.journal); svg.appendChild(path); host.appendChild(svg);
    return svg;
  }
  function button(host, label, className, action, glyph) {
    var el = node('button', className || 'patch-button', host); el.type = 'button';
    if (glyph) icon(glyph, el); node('span', '', el, label); if (action) el.addEventListener('click', action); return el;
  }
  function calm() { return !!(C.motion.reduced || C.settings.policy.animation < 2 || root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function applyPolicy() {
    if (!modal) return;
    modal.classList.toggle('patch-calm', calm());
    modal.classList.toggle('patch-mono', C.settings.get('rarityColor') === 'mono');
    modal.classList.toggle('patch-low', C.settings.policy.shadows < 2);
  }
  function matches(text) { return !query || String(text).toLowerCase().indexOf(query) !== -1; }
  function cardFor(item) { return C.card(item.id); }
  function variantName(id) { var v = C.variant(id); return v ? v.name : 'Normal'; }
  function itemText(item) { var card = cardFor(item); return [card && card.name, card && card.rarity, item.description, item.badge, variantName(item.variantId)].join(' '); }
  function releaseMatches(note) { return matches(JSON.stringify(note) + ' ' + (note.showcase || []).map(itemText).join(' ')); }
  function releases() {
    return C.data.patchNotes.filter(function (note) { return (order !== 'major' || note.tag === 'Major') && releaseMatches(note); }).sort(function (a, b) {
      var aa = a.version.split('.').map(Number), bb = b.version.split('.').map(Number), diff = 0;
      for (var i = 0; i < 3 && !diff; i++) diff = (bb[i] || 0) - (aa[i] || 0);
      return order === 'oldest' ? -diff : diff;
    });
  }
  function activeNote() { return C.data.patchNotes.find(function (n) { return n.version === activeVersion; }); }
  function stateKey(key) { return activeVersion + '/' + key; }
  function destroyViews() {
    if (observer) observer.disconnect(); visibleViews.clear();
    views.forEach(function (view) { view.destroy(); }); views = [];
    scroll.querySelectorAll('video').forEach(function (video) { video.pause(); });
    hideHover();
  }
  function watch(view) {
    views.push(view); visibleViews.set(view.el, view);
    view.setVisible(false);
    if (observer) observer.observe(view.el); else view.setVisible(true);
  }
  function specimen(item) { return { cardId: item.id, serial: 'PREVIEW', variantId: item.variantId || null, cardSkinId: null }; }
  function mountCard(item, host) {
    var card = cardFor(item); if (!card) return null;
    var view = C.cardView.create(card, specimen(item), { thumbnail: true, owned: false, presentation: 'art-only' });
    host.appendChild(view.el); watch(view); return view;
  }
  function markSeen() {
    try { root.localStorage.setItem(seenKey, version); } catch (_) {}
    hud.classList.remove('has-unread'); hud.setAttribute('aria-label', 'Patch notes v' + version);
  }
  function build() {
    if (overlay) return;
    overlay = node('div', 'patch-overlay', C.viewport.parent(doc.body)); overlay.hidden = true;
    modal = node('section', 'patch-modal', overlay); modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'patch-title');
    var header = node('header', 'patch-header', modal), brand = node('div', 'patch-brand', header);
    icon('journal', brand); node('span', 'patch-wordmark', brand, 'cardable'); node('span', 'patch-header-divider', brand, '/');
    var title = node('h2', '', brand, 'Patch notes'); title.id = 'patch-title';
    var actions = node('div', 'patch-header-actions', header);
    modeButton = button(actions, 'Interactive', 'patch-button patch-mode', function () {
      interactive = !interactive; modeButton.setAttribute('aria-pressed', String(interactive));
      modal.classList.toggle('is-interactive', interactive); render(); announce(interactive ? 'Interactive previews enabled.' : 'Reading mode enabled.');
    }, 'motion'); modeButton.setAttribute('aria-pressed', 'false');
    button(actions, 'Copy notes', 'patch-button patch-copy', copyNotes, 'copy');
    var closeBtn = button(actions, '', 'patch-button patch-close', close, 'close'); closeBtn.setAttribute('aria-label', 'Close patch notes');
    progress = node('div', 'patch-progress', modal); progress.setAttribute('aria-hidden', 'true');
    var layout = node('div', 'patch-layout', modal), sidebar = node('aside', 'patch-sidebar', layout);
    var searchBox = node('div', 'patch-search', sidebar); icon('search', searchBox);
    search = node('input', '', searchBox); search.type = 'search'; search.placeholder = 'Find an update…'; search.setAttribute('aria-label', 'Search updates and changes'); search.autocomplete = 'off';
    node('kbd', '', searchBox, '/');
    search.addEventListener('input', function () { remember(); query = search.value.trim().toLowerCase(); render(true); });
    var sortLabel = node('label', 'patch-sort-label', sidebar, 'Release archive');
    sort = node('select', 'patch-sort', sidebar); sort.id = 'patch-sort'; sortLabel.htmlFor = sort.id;
    [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['major', 'Major releases']].forEach(function (pair) { var opt = node('option', '', sort, pair[1]); opt.value = pair[0]; });
    sort.addEventListener('change', function () { remember(); order = sort.value; render(true); });
    archive = node('nav', 'patch-archive', sidebar); archive.setAttribute('aria-label', 'Release archive');
    var note = node('div', 'patch-sidebar-note', sidebar); icon('cards', note); node('p', '', note, 'Your collection.\nA little more considered.');
    node('span', 'patch-micro', note, 'THE CARDABLE JOURNAL');
    var main = node('div', 'patch-main', layout);
    filters = node('nav', 'patch-filters', main); filters.setAttribute('aria-label', 'Patch note sections');
    [['overview', 'Overview'], ['cards', 'Cards & finishes'], ['changes', 'Changes'], ['details', 'Details']].forEach(function (pair) {
      var b = button(filters, pair[1], 'patch-filter', function () { remember(); filter = pair[0]; render(true); }); b.dataset.filter = pair[0];
    });
    scroll = node('div', 'patch-scroll', main); scroll.tabIndex = 0; scroll.setAttribute('aria-label', 'Selected release notes');
    content = node('div', 'patch-content', scroll);
    scroll.addEventListener('scroll', function () {
      var max = scroll.scrollHeight - scroll.clientHeight; progress.style.transform = 'scaleX(' + (max > 0 ? scroll.scrollTop / max : 0) + ')';
    }, { passive: true });
    var footer = node('footer', 'patch-footer', main); status = node('span', '', footer); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    button(footer, 'Back to top', 'patch-text-button', function () { scroll.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); }, 'arrow');
    overlay.addEventListener('click', function (event) { if (event.target === overlay && !inspectLayer) close(); });
    hover = node('div', 'patch-hover-inspect', overlay); hover.hidden = true; hover.setAttribute('aria-hidden', 'true');
    if (root.IntersectionObserver) observer = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { var view = visibleViews.get(entry.target); if (view) view.setVisible(entry.isIntersecting); });
    }, { root: scroll, rootMargin: '100px' });
  }
  function announce(text) { if (status) status.textContent = text; }
  function remember() { if (scroll) positions[activeVersion] = scroll.scrollTop; }
  function selectRelease(v) { remember(); activeVersion = v; render(true); }
  function render(reset) {
    if (!opened) return;
    if (!reset) remember();
    destroyViews(); content.replaceChildren(); archive.replaceChildren(); applyPolicy();
    var list = releases();
    if (!list.some(function (n) { return n.version === activeVersion; })) { activeVersion = list.length ? list[0].version : null; }
    list.forEach(function (note, index) {
      var b = button(archive, '', 'patch-release' + (note.version === activeVersion ? ' is-selected' : ''), function () { selectRelease(note.version); });
      b.querySelector('span').remove();
      var meta = node('span', 'patch-release-meta', b); node('span', '', meta, 'v' + note.version); node('span', 'patch-release-tag', meta, note.version === version ? 'LATEST' : note.tag.toUpperCase());
      node('strong', '', b, note.codename); node('span', 'patch-release-date', b, note.date);
      if (note.version === activeVersion) b.setAttribute('aria-current', 'true');
      C.keys.listen(b, 'keydown', 'patchnotes.navigation', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); var buttons = archive.querySelectorAll('button'); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus(); }
      });
    });
    Array.from(filters.children).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === filter)); });
    var note = activeNote();
    if (!note) { empty('No updates found.', 'Try a card name, release number, or a shorter search.'); announce('No matching updates.'); return; }
    var releaseHeading = node('div', 'patch-release-heading', content);
    node('span', 'patch-micro', releaseHeading, 'UPDATE ' + note.version + ' / ' + note.codename.toUpperCase());
    node('span', 'patch-date', releaseHeading, note.date);
    var count = 0;
    if (filter === 'overview' && !query) { renderHero(note); renderPreviews(note); }
    if (filter === 'overview' || filter === 'cards') count += renderShowcase(note);
    if (filter === 'overview' || filter === 'changes') count += renderChanges(note);
    if (filter === 'overview' || filter === 'details') count += renderDetails(note);
    if (!count && (query || filter !== 'overview')) empty('Nothing in this section.', 'Choose another section or clear your search to see the full update.');
    announce(list.length + ' update' + (list.length === 1 ? '' : 's') + (query ? ' found · ' + count + ' matching entries' : ' · ' + (interactive ? 'Interactive previews' : 'Reading mode')));
    scroll.scrollTop = reset ? positions[activeVersion] || 0 : positions[activeVersion] || 0;
    progress.style.transform = 'scaleX(' + (scroll.scrollHeight > scroll.clientHeight ? scroll.scrollTop / (scroll.scrollHeight - scroll.clientHeight) : 0) + ')';
  }
  function empty(title, text) {
    var box = node('div', 'patch-empty', content); icon('search', box); node('h3', '', box, title); node('p', '', box, text);
    button(box, 'Reset filters', 'patch-button', function () { query = ''; search.value = ''; filter = 'overview'; order = 'newest'; sort.value = order; activeVersion = version; render(true); });
  }
  function heading(host, number, title, subtitle) {
    var head = node('div', 'patch-section-heading', host); node('span', 'patch-section-number', head, number);
    var text = node('div', '', head); node('h3', '', text, title); if (subtitle) node('p', '', text, subtitle); return head;
  }
  function renderHero(note) {
    var hero = node('section', 'patch-hero', content), copy = node('div', 'patch-hero-copy', hero);
    node('span', 'patch-micro', copy, note.hero.badge); node('h1', '', copy, note.hero.title); node('p', '', copy, note.hero.subtitle || note.tagline);
    button(copy, 'Explore the update', 'patch-button patch-primary', function () { var el = content.querySelector('.patch-showcase-section, .patch-detail-section'); if (el) el.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); }, 'arrow');
    var media = (note.hero.media || [])[0];
    if (media) {
      var figure = node('figure', 'patch-hero-media', hero);
      if (media.kind === 'video') {
        var video = node('video', '', figure); video.src = media.src; video.poster = media.poster || ''; video.controls = true; video.muted = true; video.playsInline = true; video.preload = 'none'; video.setAttribute('aria-label', media.alt || 'Update preview');
      } else {
        var img = node('img', '', figure); img.src = media.src; img.alt = media.alt; img.width = 600; img.height = 800; img.decoding = 'async';
      }
      node('span', 'patch-media-index', figure, '01 / IN FOCUS'); node('figcaption', '', figure, media.caption || 'Update preview');
    }
  }
  function renderPreviews(note) {
    if (!note.previews) return;
    var grid = node('div', 'patch-feature-previews', content);
    note.previews.forEach(function (preview) {
      var card = node('section', 'patch-feature-preview', grid); node('span', 'patch-micro', card, preview.label);
      var visual = node('div', 'patch-preview-visual', card);
      if (preview.kind === 'gallery') {
        (note.showcase || []).slice(0, 3).forEach(function (item) { var host = node('div', 'patch-mini-specimen', visual); mountCard(item, host); });
        node('span', 'patch-preview-caption', visual, 'Actual inventory materials');
      } else {
        var sample = note.balanceChanges[0].changes[0];
        var before = node('div', 'patch-compare-sample', visual); node('span', 'patch-micro', before, 'BEFORE'); node('strong', '', before, sample.from);
        icon('arrow', visual);
        var after = node('div', 'patch-compare-sample', visual); node('span', 'patch-micro', after, 'AFTER'); node('strong', '', after, sample.to);
        if (interactive) {
          var label = node('label', 'patch-preview-slider', card, 'Compare the change');
          var range = node('input', '', label); range.type = 'range'; range.min = 0; range.max = 100; range.value = 50; range.setAttribute('aria-label', 'Before and after emphasis');
          function emphasize() { before.style.opacity = String(1 - Number(range.value) / 100 * .75); after.style.opacity = String(.25 + Number(range.value) / 100 * .75); }
          range.addEventListener('input', emphasize); emphasize();
        }
      }
      node('h3', '', card, preview.title); node('p', '', card, preview.description);
    });
  }
  function renderShowcase(note) {
    var items = (note.showcase || []).filter(function (item) { return cardFor(item) && (!query || matches(itemText(item)) || matches(note.version + ' ' + note.codename)); });
    if (!items.length) return 0;
    var section = node('section', 'patch-showcase-section', content);
    heading(section, '01', note.showcaseTitle || 'Cards & finishes', note.showcaseSubtitle);
    var grid = node('div', 'patch-showcase-grid', section), expanded = !!expansions[stateKey('cards')];
    (expanded || query ? items : items.slice(0, 3)).forEach(function (item) {
      var card = cardFor(item), tile = button(grid, '', 'patch-card-tile', function () { openInspect(item, tile); }); tile.querySelector('span').remove();
      tile.setAttribute('aria-label', 'Inspect ' + card.name + ', ' + variantName(item.variantId) + ' preview');
      node('span', 'patch-card-badge', tile, item.badge || 'Preview');
      var stage = node('div', 'patch-card-stage', tile); mountCard(item, stage);
      var labels = node('div', 'patch-card-labels', tile); node('span', 'patch-micro', labels, C.rarity(card.rarity).name + ' / ' + variantName(item.variantId));
      node('h4', '', labels, card.name); node('span', 'patch-card-memory', labels, C.cardSpecs.vram(card) + ' ' + C.cardSpecs.memoryType(card));
      var hint = node('span', 'patch-card-inspect-hint', tile, 'Inspect specimen'); icon('expand', hint);
      tile.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') showHover(item, event); });
      tile.addEventListener('pointermove', function (event) {
        if (event.pointerType !== 'mouse') return;
        moveHover(event);
        if (interactive && !calm()) { var r = tile.getBoundingClientRect(); stage.style.transform = 'rotateY(' + ((event.clientX - r.left) / r.width - .5) * 16 + 'deg) rotateX(' + -((event.clientY - r.top) / r.height - .5) * 12 + 'deg)'; }
      });
      tile.addEventListener('pointerleave', function () { hideHover(); stage.style.transform = ''; }); tile.addEventListener('blur', hideHover);
    });
    if (items.length > 3 && !query) expander(section, 'cards', expanded ? 'Show fewer specimens' : 'View all ' + items.length + ' specimens');
    return items.length;
  }
  function expander(host, key, label) {
    var b = button(host, label, 'patch-view-more', function () {
      expansions[stateKey(key)] = !expansions[stateKey(key)]; var top = scroll.scrollTop; render(); scroll.scrollTop = top;
      var replacement = content.querySelector('[data-expander="' + key + '"]'); if (replacement) replacement.focus({ preventScroll: true });
    }, 'chevron'); b.dataset.expander = key; b.setAttribute('aria-expanded', String(!!expansions[stateKey(key)]));
  }
  function renderChanges(note) {
    var total = 0, groups = (note.balanceChanges || []).map(function (group) {
      var changes = group.changes.filter(function (ch) { return !query || matches(JSON.stringify(ch) + ' ' + group.category + ' ' + note.version + ' ' + note.codename); });
      return { group: group, changes: changes };
    }).filter(function (entry) { return entry.changes.length; });
    if (!groups.length) return 0;
    var section = node('section', 'patch-changes-section', content), head = heading(section, '02', note.balanceTitle || 'Balance & changes', note.balanceSubtitle);
    var tools = node('div', 'patch-change-tools', head);
    function expandAll(value) { section.querySelectorAll('details').forEach(function (d) { d.open = value; }); }
    button(tools, 'Expand all', 'patch-text-button', function () { expandAll(true); }); button(tools, 'Collapse all', 'patch-text-button', function () { expandAll(false); });
    groups.forEach(function (entry, i) {
      var group = entry.group, key = 'group-' + (group.id || i), details = node('details', 'patch-change-group', section);
      details.open = query ? true : expansions[stateKey(key)] !== false;
      details.addEventListener('toggle', function () { expansions[stateKey(key)] = details.open; });
      var summary = node('summary', '', details); icon(group.icon, summary);
      var titles = node('span', 'patch-change-titles', summary); node('strong', '', titles, group.category); node('span', '', titles, group.subtitle);
      node('span', 'patch-count', summary, String(entry.changes.length).padStart(2, '0')); icon('chevron', summary);
      var body = node('div', 'patch-change-body', details), more = expansions[stateKey(key + '-more')];
      (more || query ? entry.changes : entry.changes.slice(0, 3)).forEach(function (change) {
        var row = node('div', 'patch-change-row', body), title = node('div', 'patch-change-row-title', row);
        node('strong', '', title, change.stat); node('span', 'patch-micro', title, change.entity || '');
        var diff = node('div', 'patch-diff', row), before = node('div', '', diff); node('span', 'patch-micro', before, 'BEFORE'); node('span', 'patch-diff-from', before, change.from);
        icon('arrow', diff); var after = node('div', '', diff); node('span', 'patch-micro', after, 'AFTER'); node('strong', '', after, change.to);
        if (change.diff || change.percent) node('span', 'patch-diff-tag', row, [change.type, change.diff, change.percent].filter(Boolean).join(' · '));
        if (change.note) node('p', 'patch-change-note', row, change.note);
        // Numerical meters are meaningful only when the author supplies actual values.
        if (Number.isFinite(change.fromValue) && Number.isFinite(change.toValue) && change.fromValue >= 0 && change.toValue >= 0) {
          var scale = Math.max(change.fromValue, change.toValue, 1), chart = node('div', 'patch-meters', row);
          [change.fromValue, change.toValue].forEach(function (v, j) { var meter = node('meter', '', chart); meter.min = 0; meter.max = scale; meter.value = v; meter.setAttribute('aria-label', (j ? 'After: ' : 'Before: ') + v); });
        }
      });
      if (entry.changes.length > 3 && !query) expander(body, key + '-more', more ? 'Show fewer changes' : 'View ' + (entry.changes.length - 3) + ' more change' + (entry.changes.length === 4 ? '' : 's'));
      total += entry.changes.length;
    });
    return total;
  }
  function renderDetails(note) {
    var section, total = 0;
    Object.keys(categories).forEach(function (key) {
      var items = ((note.sections || {})[key] || []).filter(function (text) { return !query || matches(text + ' ' + categories[key] + ' ' + note.version + ' ' + note.codename); });
      if (!items.length) return;
      if (!section) { section = node('section', 'patch-detail-section', content); heading(section, '03', 'The finer details', 'Everything else, neatly in its place.'); }
      var box = node('article', 'patch-detail-card', section); node('h4', '', box, categories[key]); node('span', 'patch-count', box, String(items.length).padStart(2, '0'));
      var ul = node('ul', 'patch-detail-list', box), expanded = expansions[stateKey('details-' + key)];
      (expanded || query ? items : items.slice(0, 3)).forEach(function (text) { node('li', '', ul, text); });
      if (items.length > 3 && !query) expander(box, 'details-' + key, expanded ? 'Show less' : 'View ' + (items.length - 3) + ' more'); total += items.length;
    });
    return total;
  }
  function showHover(item, event) {
    var card = cardFor(item); hover.replaceChildren(); node('span', 'patch-micro', hover, 'PREVIEW / ' + variantName(item.variantId));
    node('strong', '', hover, card.name); node('p', '', hover, item.description); node('span', 'patch-micro', hover, 'CLICK TO INSPECT'); hover.hidden = false; moveHover(event);
  }
  function moveHover(event) {
    if (hover.hidden) return; var rect = hover.getBoundingClientRect();
    hover.style.left = Math.max(8, Math.min(event.clientX + 18, root.innerWidth - rect.width - 8)) + 'px';
    hover.style.top = Math.max(8, Math.min(event.clientY + 18, root.innerHeight - rect.height - 8)) + 'px';
  }
  function hideHover() { if (hover) hover.hidden = true; }
  function openInspect(item, trigger) {
    hideHover(); inspectFocus = trigger; modal.inert = true;
    inspectLayer = node('div', 'patch-inspect-modal', overlay);
    inspector = node('section', 'patch-inspect-box', inspectLayer); inspector.setAttribute('role', 'dialog'); inspector.setAttribute('aria-modal', 'true'); inspector.setAttribute('aria-labelledby', 'patch-inspect-title'); inspector.tabIndex = -1;
    var stage = node('div', 'patch-inspect-stage', inspector), info = node('div', 'patch-inspect-info', inspector), card = cardFor(item);
    node('span', 'patch-micro', info, 'COLLECTION SPECIMEN / ' + C.rarity(card.rarity).name.toUpperCase()); var h = node('h2', '', info, card.name); h.id = 'patch-inspect-title';
    node('p', '', info, item.description); node('p', 'patch-preview-disclosure', info, 'Preview only · This card is not added to your collection.');
    var instance = specimen(item);
    function repaint() {
      if (inspectView) inspectView.destroy();
      inspectView = C.cardView.create(card, instance, { owned: false, autoFocus: false, keyboardFlip: false, presentation: 'full' });
      inspectView.el.tabIndex = -1; inspectView.el.setAttribute('role', 'img'); inspectView.el.setAttribute('aria-label', card.name + ' preview specimen'); stage.appendChild(inspectView.el);
      if (interactive) inspectView.setMode('full');
    }
    repaint();
    var dl = node('dl', 'patch-inspect-specs', info), rows = [{ label: 'Memory', value: C.cardSpecs.vram(card) + ' ' + C.cardSpecs.memoryType(card) }].concat(C.cardSpecs.rows(card));
    rows.forEach(function (row) { var box = node('div', '', dl); node('dt', '', box, row.label); node('dd', '', box, row.value); });
    if (card.specsNote) node('p', 'patch-spec-note', info, card.specsNote);
    if (interactive) {
      var label = node('label', 'patch-finish-label', info, 'Preview finish'), select = node('select', 'patch-sort', info); select.id = 'patch-preview-finish'; label.htmlFor = select.id;
      [{ id: '', name: 'Normal' }].concat(C.data.variants.filter(function (v) { return v.kind !== 'frame'; })).forEach(function (v) { var opt = node('option', '', select, v.name); opt.value = v.id; }); select.value = instance.variantId || '';
      select.addEventListener('change', function () { instance.variantId = select.value || null; repaint(); });
    }
    var actions = node('div', 'patch-inspect-actions', info);
    button(actions, 'Flip preview', 'patch-button', function () { inspectView.setFace(inspectView.side === 'front' ? 'back' : 'front'); }, 'cards');
    button(actions, 'Reset view', 'patch-button', function () { instance.variantId = item.variantId || null; var s = inspector.querySelector('select'); if (s) s.value = instance.variantId || ''; repaint(); });
    var closeBtn = button(info, 'Return to patch notes', 'patch-button patch-primary', closeInspect, 'arrow');
    inspectLayer.addEventListener('click', function (e) { if (e.target === inspectLayer) closeInspect(); });
    C.accessibility.trap(inspector); closeBtn.focus();
  }
  function closeInspect() {
    if (!inspectLayer) return;
    if (inspectView) inspectView.destroy(); inspectView = null;
    C.accessibility.release(inspector); inspectLayer.remove(); inspectLayer = null; inspector = null; modal.inert = false;
    if (opened && inspectFocus && inspectFocus.isConnected) inspectFocus.focus({ preventScroll: true });
  }
  function markdown(note) {
    var text = '# Cardable ' + note.version + ' — ' + note.codename + '\n\n' + note.date + ' · ' + note.tag + '\n\n' + note.tagline + '\n\n';
    if ((note.showcase || []).length) { text += '## Collection previews\n'; note.showcase.forEach(function (item) { var c = cardFor(item); text += '- ' + (c ? c.name : item.id) + ' · ' + variantName(item.variantId) + ' (preview): ' + item.description + '\n'; }); }
    (note.balanceChanges || []).forEach(function (group) { text += '\n## ' + group.category + '\n'; group.changes.forEach(function (ch) { text += '- ' + ch.stat + ' (' + ch.entity + '): ' + ch.from + ' → ' + ch.to + (ch.diff ? ' · ' + ch.diff : '') + (ch.percent ? ' · ' + ch.percent : '') + '. ' + (ch.note || '') + '\n'; }); });
    Object.keys(note.sections || {}).forEach(function (key) { text += '\n## ' + (categories[key] || key) + '\n'; note.sections[key].forEach(function (t) { text += '- ' + t + '\n'; }); });
    return text;
  }
  function fallbackCopy(text) {
    if (!opened) return;
    var box = modal.querySelector('.patch-copy-fallback'); if (box) box.remove();
    box = node('div', 'patch-copy-fallback', modal); node('p', '', box, 'Copy these notes with Ctrl+C.');
    var ta = node('textarea', '', box); ta.value = text; ta.readOnly = true; ta.setAttribute('aria-label', 'Release notes to copy');
    var focus = doc.activeElement;
    button(box, 'Done', 'patch-button', function () { box.remove(); if (focus && focus.isConnected) focus.focus(); }); ta.focus(); ta.select();
    try { if (doc.execCommand('copy')) { box.remove(); if (focus && focus.isConnected) focus.focus(); announce('Release notes copied.'); } } catch (_) {}
  }
  function copyNotes() {
    var note = activeNote(); if (!note) { announce('Select an update to copy.'); return; }
    var text = markdown(note);
    // Some file:// Chromium contexts leave a clipboard permission request pending.
    // Offer selectable notes promptly instead of waiting indefinitely for that request.
    if (!root.navigator.clipboard) { fallbackCopy(text); return; }
    announce('Copying release notes…');
    var finished = false, timeout = root.setTimeout(function () {
      if (!finished) { finished = true; announce('Select the notes to copy.'); fallbackCopy(text); }
    }, 1200);
    try {
      root.navigator.clipboard.writeText(text).then(function () {
        if (finished) return; finished = true; root.clearTimeout(timeout); if (opened) announce('Release notes copied.');
      }, function () {
        if (finished) return; finished = true; root.clearTimeout(timeout); fallbackCopy(text);
      });
    } catch (_) { finished = true; root.clearTimeout(timeout); fallbackCopy(text); }
  }
  function open() {
    if(C.opening.phase!=='idle'||C.studio.active||C.tutorial.active||C.state.recovery&&C.state.recovery.pending)return false;if(C.commands.active)C.commands.close();if(C.preferences.open)C.preferences.close();
    build(); if (opened) return; opened = true; savedFocus = doc.activeElement; overlay.hidden = false;
    // Restore exact prior inert values, including a Settings dialog beneath this journal.
    inertRecords = C.viewport.layers().filter(function (el) { return el !== overlay && el.tagName !== 'SCRIPT' && el.tagName !== 'LINK'; }).map(function (el) { var record = [el, el.inert]; el.inert = true; return record; });
    doc.body.classList.add('patch-notes-open'); modal.classList.toggle('is-interactive', interactive);
    markSeen(); render(); C.accessibility.trap(modal); modal.focus(); C.events.emit('menu:visibilityHold', { reason: 'patch-notes', active: true });
  }
  function close() {
    if (!opened) return; remember(); closeInspect(); opened = false; destroyViews(); content.replaceChildren();
    overlay.hidden = true; doc.body.classList.remove('patch-notes-open'); C.accessibility.release(modal);
    inertRecords.forEach(function (record) { record[0].inert = record[1]; }); inertRecords = [];
    C.events.emit('menu:visibilityHold', { reason: 'patch-notes', active: false });
    if (savedFocus && savedFocus.isConnected) savedFocus.focus({ preventScroll: true });
  }
  C.patchNotes = {
    initialized: false, version: version, get isOpen() { return opened; },get open(){return opened;},show:open,markdown:markdown,close:close,
    init: function () {
      if (C.patchNotes.initialized) return;
      hud = button(C.viewport.parent(doc.body), 'Patch notes', 'patch-notes-hud-btn idle-chrome entrance', open, 'journal'); hud.id = 'patch-notes-hud-btn'; var hudWidth = function () { doc.documentElement.style.setProperty('--patch-hud-width', hud.offsetWidth + 'px'); }; hudWidth(); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(hudWidth);
      node('span', 'patch-hud-version', hud, version);
      try { hud.classList.toggle('has-unread', root.localStorage.getItem(seenKey) !== version); } catch (_) { hud.classList.add('has-unread'); }
      hud.setAttribute('aria-label', 'Patch notes v' + version + (hud.classList.contains('has-unread') ? ', unread update' : ''));
      C.settings.onChange('*', function () { if (opened) applyPolicy(); });
      doc.addEventListener('visibilitychange', function () {
        if (doc.hidden && scroll) scroll.querySelectorAll('video').forEach(function (video) { video.pause(); });
      });
      C.keys.listen(doc, 'keydown', 'patchnotes.navigation', function (event) {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
        if (opened && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (inspectLayer) closeInspect(); else close(); return; }
        var editing = event.target && (event.target.isContentEditable || event.target.closest('input,select,textarea'));
        if (opened && !inspectLayer && event.key === '/' && !editing) { event.preventDefault(); event.stopImmediatePropagation(); search.focus(); }


      }, true);
      C.patchNotes.initialized = true;C.commands.register({id:'patchnotes',label:'Patch notes',group:'Help',run:open});
    }
  };
C.events.on('app:ready',C.patchNotes.init);
})(window.Cardable, window);
