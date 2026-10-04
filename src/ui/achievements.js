(function (C, root) {
  'use strict';
  var toast, pending = [], showing = null, until = 0, dismissedAt = 0;
  var overlay, panel, rail, grid, search, filter, sort, totalText, ring, resultText, detail;
  var opened = false, category = 'all', focusId = null, origin, blocked = [], detailOrigin, tiles = [], ringAge = 0, ringTarget = 0;
  var paths = {
    pack: 'M5 4h14v16H5zM5 8h14M9 12h6M9 16h6',
    collection: 'M4 7h16v14H4zM7 3h10M7 11h10M7 15h6',
    star: 'm12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',
    secret: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
    variant: 'm12 3 9 9-9 9-9-9zM8 12l4-4 4 4-4 4z',
    serial: 'M8 3 6 21M16 3l-2 18M3 9h18M3 15h18',
    archive: 'M4 4h16v5H4zM6 9v12h12V9M10 13h4',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15 8a5 5 0 1 0 0 8',
    cut: 'M4 5l16 14M4 19 20 5M7 5a3 3 0 1 0-6 0 3 3 0 0 0 6 0M7 19a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
    camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'
  };
  function node(tag, cls, parent, text) { return C.packMarkup.node(tag, cls, parent, text); }
  function glyph(name, parent) {
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'achievement-glyph');
    var path = root.document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.star); svg.appendChild(path); parent.appendChild(svg); return svg;
  }
  function safeMenu() {
    return !root.document.hidden && C.opening.phase === 'idle' && !C.state.current.pendingReveal && !C.inventory.active && !C.preferences.open &&
      !C.menu.afk && !C.tutorial.active && !C.contextMenu.open && !(C.dev && (C.dev.immersive || C.dev.paletteOpen)) && !(C.achievementView && C.achievementView.open);
  }
  function hide() {
    toast.classList.remove('is-visible'); dismissedAt = root.performance.now();
    showing = null; C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: false }); C.fx.wake();
  }
  function enqueue(entry) { pending.push(entry); C.fx.wake(); }
  C.achievementView = { glyph: glyph, get open() { return opened; }, show: openPanel, close: closePanel, replayToast: function (id) {
    var p = C.achievements.progress(id); if (p) enqueue({ id: id, tier: p.tier || 1 });
  } };
  C.events.on('achievement:unlocked', function (event) { if (!event.retro) enqueue(event); });
  C.events.on('achievement:backfilled', function (event) { enqueue({ summary: true, count: event.count }); });
  C.events.on('app:ready', function () {
    toast = node('button', 'achievement-toast glass', root.document.body); toast.type = 'button'; toast.hidden = true;
    toast.setAttribute('aria-live', 'polite'); toast.setAttribute('aria-atomic', 'true');
    toast.addEventListener('click', function () { var id = showing && showing[0].id; hide(); C.events.emit('achievements:open', { id: id }); });
    C.fx.subscribe(function (now) {
      if (!C.settings.get('achievementToasts')) { pending = []; if (showing) hide(); }
      if (showing && !safeMenu()) { pending = showing.concat(pending); hide(); toast.hidden = true; }
      if (showing && now >= until) hide();
      if (!showing && !toast.hidden && now - dismissedAt >= 250) toast.hidden = true;
      if (!showing && pending.length && safeMenu() && C.settings.get('achievementToasts')) {
        showing = pending.splice(0); toast.replaceChildren(); var first = showing[0], def = C.achievements.list().find(function (d) { return d.id === first.id; });
        glyph(def ? def.glyph : 'star', toast); var copy = node('span', 'achievement-toast-copy', toast);
        node('span', 'achievement-eyebrow', copy, first.summary ? 'From your collection' : 'Achievement unlocked');
        node('strong', '', copy, first.summary ? first.count + ' achievements unlocked from your collection' : showing.length > 1 ? showing.length + ' achievements unlocked' : (def?.name || 'Achievement') + (def?.tiers.length > 1 ? ' · Tier ' + first.tier : ''));
        toast.hidden = false; toast.classList.add('is-visible'); until = now + 4000;
        C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: true }); C.events.emit('ui:achievement', { beat: 'toast', id: first.id, count: showing.length });
      }
      return !!showing || !toast.hidden;
    }, 'achievements');
    ['opening:context', 'inventory:context', 'preferences:context', 'tutorial:step', 'contextmenu:close', 'fx:visibility', 'menu:afk', 'settings:changed'].forEach(function (event) { C.events.on(event, function () { C.fx.wake(); }); });
    C.events.on('achievement:resetting', function () { pending = []; if (showing) hide(); toast.hidden = true; });
    buildPanel();
    C.fx.subscribe(updatePanel, 'achievement-panel');
  });
  function button(label, parent, action, cls) {
    var el = node('button', cls || 'quiet-button', parent, label); el.type = 'button'; el.addEventListener('click', action); return el;
  }
  function date(at) { return at === null ? 'Before tracking' : new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function rewardText(reward) { return !reward ? 'No reward' : reward.credits ? reward.credits.toLocaleString() + ' credits' : reward.pack ? reward.count + ' × ' + (C.pack(reward.pack)?.name || reward.pack) : 'No reward'; }
  function concealed(def, p) { return def.hidden && !p.tier; }
  function name(def) { return concealed(def, C.achievements.progress(def.id)) ? '???' : def.name; }
  function latest(def) { var entry = C.state.current.achievements.unlocked[def.id]; return entry ? Math.max(0, ...Object.values(entry.at).filter(Number.isFinite)) : -1; }
  function ratio(def) { var p = C.achievements.progress(def.id); return concealed(def, p) ? 0 : p.tier === p.maxTier ? 1 : Math.min(1, p.value / p.goal); }
  function buildPanel() {
    overlay = node('div', 'achievements-overlay', root.document.body); overlay.hidden = true; overlay.inert = true;
    panel = node('section', 'achievements-panel glass glass--sheet', overlay); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'achievements-title');
    var header = node('header', 'achievements-header', panel), heading = node('div', '', header);
    node('span', 'achievement-eyebrow', heading, 'Your collection, in milestones'); node('h2', '', heading, 'Achievements').id = 'achievements-title';
    var progress = node('div', 'achievements-total', header), svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true');
    [false, true].forEach(function (fill) { var circle = root.document.createElementNS(svg.namespaceURI, 'circle'); circle.setAttribute('cx', '24'); circle.setAttribute('cy', '24'); circle.setAttribute('r', '20'); circle.setAttribute('pathLength', '100'); if (fill) { circle.setAttribute('class', 'achievements-ring-fill'); ring = circle; } svg.appendChild(circle); }); progress.appendChild(svg);
    totalText = node('span', '', progress); var close = button('Close', header, closePanel); close.setAttribute('aria-label', 'Close achievements');
    var controls = node('div', 'achievements-controls', panel);
    search = node('input', '', controls); search.type = 'search'; search.placeholder = 'Search achievements'; search.setAttribute('aria-label', 'Search achievements'); search.autocomplete = 'off'; search.addEventListener('input', render);
    var filterLabel = node('label', '', controls, 'Show'); filter = node('select', '', filterLabel); filter.setAttribute('aria-label', 'Filter achievements');
    [['all', 'All'], ['unlocked', 'Unlocked'], ['progress', 'In progress'], ['locked', 'Locked']].forEach(function (item) { var option = node('option', '', filter, item[1]); option.value = item[0]; }); filter.addEventListener('change', render);
    var sortLabel = node('label', '', controls, 'Sort'); sort = node('select', '', sortLabel); sort.setAttribute('aria-label', 'Sort achievements');
    [['recent', 'Recent'], ['name', 'Name'], ['progress', 'Progress'], ['group', 'Group']].forEach(function (item) { var option = node('option', '', sort, item[1]); option.value = item[0]; }); sort.addEventListener('change', render);
    var body = node('div', 'achievements-body', panel); rail = node('nav', 'achievements-rail', body); rail.setAttribute('aria-label', 'Achievement categories');
    var content = node('div', 'achievements-content', body); resultText = node('p', 'achievement-eyebrow', content); resultText.setAttribute('role', 'status'); grid = node('div', 'achievements-grid', content);
    detail = node('div', 'achievement-detail', panel); detail.hidden = true;
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closePanel(); });
    grid.addEventListener('pointermove', function (event) {
      if (C.settings.get('quality') !== 'high' || C.motion.reduced) return;
      var tile = event.target.closest('.achievement-tile'); if (!tile) return; var r = tile.getBoundingClientRect(); tile.style.setProperty('--light-x', (event.clientX - r.left) + 'px'); tile.style.setProperty('--light-y', (event.clientY - r.top) + 'px');
    });
    root.document.addEventListener('keydown', function (event) {
      if (!opened || event.key === 'Tab') return;
      // This modal owns shortcuts; keep native button/input keyboard behavior.
      event.stopImmediatePropagation();
      if (event.key === 'Escape' && !event.repeat) { event.preventDefault(); if (!detail.hidden) closeDetail(); else closePanel(); }
    }, true);
    C.inventoryToolbar.registerTool({ id: 'achievements', label: 'Achievements', icon: 'favorite', run: function () { openPanel(); } });
    C.contextMenu.register({ target: 'empty', build: function () { return [{ id: 'achievements', type: 'action', label: 'Achievements', icon: 'check', run: function () { openPanel(); } }]; } });
    C.events.on('achievements:open', function (event) { openPanel(event && event.id); });
    C.events.on('achievement:changed', function () { if (opened) render(); });
    C.events.on('achievement:resetting', function () { if (opened) closePanel(); });
    C.events.on('opening:context', function (event) { if (event.active && opened) closePanel(); });
    C.events.on('preferences:context', function (event) { if (event.active && opened) closePanel(); });
    C.events.on('settings:changed', function () { if (opened) C.fx.wake(); });
    C.achievementView.el = overlay;
  }
  function openPanel(id) {
    if (!overlay || root.document.hidden || C.opening.phase !== 'idle' || C.preferences.open || C.tutorial.active || C.detail.phase !== 'closed') return false;
    if (showing) hide();
    focusId = id || null;
    if (!opened) {
      opened = true; origin = root.document.activeElement; overlay.hidden = false; overlay.inert = false;
      Array.from(root.document.body.querySelectorAll('.menu-shell, .inventory-sheet, .inventory-detail, .settings-gear, .tutorial, [data-tool-surface]')).forEach(function (el) { blocked.push({ el: el, inert: el.inert }); el.inert = true; });
      C.accessibility.trap(panel); C.events.emit('input:cancel', { reason: 'achievements' });
      C.events.emit('achievements:context', { active: true }); C.events.emit('menu:visibilityHold', { reason: 'achievements', active: true });
      C.state.current.achievements.settingsSeenIntro = true; C.state.save();
    }
    if (id) { search.value = ''; filter.value = 'all'; category = 'all'; }
    ringAge = 0; ringTarget = C.achievements.totals().unlocked; render(); search.focus({ preventScroll: true });
    if (id) { var tile = grid.querySelector('[data-achievement="' + id + '"]'); if (tile) { tile.scrollIntoView({ block: 'nearest' }); tile.focus({ preventScroll: true }); showDetail(id, tile); } }
    C.events.emit('ui:achievement', { beat: 'panel' }); C.fx.wake(); return true;
  }
  function closePanel() {
    if (!opened) return;
    closeDetail(false); opened = false; overlay.inert = true; overlay.classList.remove('is-open');
    blocked.forEach(function (item) { item.el.inert = item.inert; }); blocked = []; C.accessibility.release(panel);
    C.events.emit('achievements:context', { active: false }); C.events.emit('menu:visibilityHold', { reason: 'achievements', active: false }); C.events.emit('menu:activity');
    if (origin && origin.isConnected && C.accessibility.available(origin)) origin.focus({ preventScroll: true });
    else (C.inventory.active ? C.inventory.arrow : root.document.getElementById('pack-stage')).focus({ preventScroll: true });
    root.setTimeout(function () { if (!opened) overlay.hidden = true; }, C.settings.get('quality') === 'very-low' ? 0 : 250);
    tiles = []; C.fx.wake();
  }
  function render() {
    if (!opened) return;
    var all = C.achievements.list(), totals = C.achievements.totals(); ringTarget = totals.unlocked;
    totalText.textContent = totals.unlocked + ' / ' + totals.total; totalText.parentElement.setAttribute('aria-label', totals.unlocked + ' of ' + totals.total + ' tiers unlocked');
    rail.replaceChildren();
    ['all'].concat(Array.from(new Set(all.map(function (d) { return d.group; })))).forEach(function (group) {
      var members = group === 'all' ? all : all.filter(function (d) { return d.group === group; });
      var unlocked = members.filter(function (d) { return C.achievements.isUnlocked(d.id); }).length;
      var label = group === 'all' ? 'All categories' : C.data.achievementGroups[group] || group;
      var b = button(label, rail, function () { category = group; render(); rail.querySelector('[aria-pressed="true"]').focus({ preventScroll: true }); }, 'achievements-category'); node('span', '', b, unlocked + ' / ' + members.length); b.setAttribute('aria-pressed', String(category === group));
    });
    var query = search.value.trim().toLocaleLowerCase();
    var shown = all.filter(function (def) {
      var p = C.achievements.progress(def.id), hidden = concealed(def, p);
      var match = name(def) + (hidden ? '' : ' ' + def.description);
      return (category === 'all' || def.group === category) && match.toLocaleLowerCase().includes(query) &&
        (filter.value === 'all' || filter.value === 'unlocked' && p.tier > 0 || filter.value === 'progress' && !hidden && p.value > 0 && p.tier < p.maxTier || filter.value === 'locked' && p.tier === 0);
    });
    shown.sort(function (a, b) {
      var order = sort.value === 'recent' ? latest(b) - latest(a) : sort.value === 'progress' ? ratio(b) - ratio(a) : sort.value === 'group' ? a.group.localeCompare(b.group) : 0;
      return order || name(a).localeCompare(name(b)) || a.id.localeCompare(b.id);
    });
    grid.replaceChildren(); tiles = []; resultText.textContent = shown.length + ' achievements';
    if (!shown.length) node('p', 'achievements-empty', grid, 'No achievements match. Try another search or filter.');
    shown.forEach(function (def, index) {
      var p = C.achievements.progress(def.id), hidden = concealed(def, p), entry = C.state.current.achievements.unlocked[def.id];
      var tile = button('', grid, function () { showDetail(def.id, tile); }, 'achievement-tile'); tile.dataset.achievement = def.id; tile.style.setProperty('--stagger', Math.min(index, 12) * 30 + 'ms');
      if (hidden) tile.classList.add('is-hidden'); if (focusId === def.id) tile.classList.add('is-focused');
      var head = node('span', 'achievement-tile-head', tile); glyph(hidden ? 'secret' : def.glyph, head);
      if (entry && !C.state.current.achievements.seen.includes(def.id)) { var dot = node('i', 'achievement-new-dot', head); dot.setAttribute('aria-label', 'Newly unlocked'); }
      node('strong', '', tile, name(def)); node('span', 'achievement-tile-description', tile, hidden ? 'A hidden milestone' : def.description);
      var bar = node('span', 'achievement-bar', tile), fill = node('i', '', bar); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', hidden ? 'Hidden progress' : def.name + ' progress'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(hidden ? 1 : p.goal)); bar.setAttribute('aria-valuenow', String(hidden ? 0 : Math.min(p.value, p.goal)));
      var numbers = node('span', 'achievement-numbers', tile), ticks = node('span', 'achievement-ticks', numbers);
      def.tiers.forEach(function (_, tier) { var tick = node('i', '', ticks); tick.classList.toggle('is-earned', p.tier > tier); }); ticks.setAttribute('aria-label', p.tier + ' of ' + p.maxTier + ' tiers');
      var count = node('span', '', numbers, hidden ? '???' : p.value + ' / ' + p.goal);
      node('span', 'achievement-date', tile, entry ? date(entry.at[p.tier]) : 'Locked');
      tile.setAttribute('aria-label', hidden ? 'Hidden achievement, locked' : def.name + ', tier ' + p.tier + ' of ' + p.maxTier);
      tiles.push({ fill: fill, count: count, hidden: hidden, value: p.value, goal: p.goal, ratio: hidden ? 0 : ratio(def), age: -Math.min(index, 12) * 30 });
    });
    overlay.classList.add('is-open'); C.fx.wake();
  }
  function showDetail(id, tile) {
    var def = C.achievements.list().find(function (item) { return item.id === id; }); if (!def) return;
    var p = C.achievements.progress(id), hidden = concealed(def, p), entry = C.state.current.achievements.unlocked[id];
    closeDetail(false); detailOrigin = tile; detail.replaceChildren(); detail.hidden = false; detail.inert = false; detail.classList.remove('is-closing');
    var box = node('section', 'achievement-detail-box glass', detail); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'achievement-detail-title');
    var close = button('Close', box, closeDetail); close.setAttribute('aria-label', 'Close achievement detail');
    glyph(hidden ? 'secret' : def.glyph, box); node('h3', '', box, name(def)).id = 'achievement-detail-title';
    node('p', '', box, hidden ? 'This milestone reveals itself when you unlock it.' : def.description);
    var ladder = node('ol', 'achievement-ladder', box);
    def.tiers.forEach(function (tier, i) {
      var row = node('li', '', ladder); row.classList.toggle('is-earned', p.tier > i);
      node('strong', '', row, 'Tier ' + (i + 1)); node('span', '', row, hidden ? '???' : 'Goal: ' + tier.goal.toLocaleString());
      node('span', '', row, hidden ? '???' : rewardText(tier.reward)); node('span', 'achievement-date', row, entry && i < entry.tier ? date(entry.at[i + 1]) : 'Locked');
    });
    var item = entry && C.state.current.inventory.find(function (i) { return i.instanceId === entry.instanceId; });
    if (item) button('View ' + (C.card(item.cardId)?.name || 'card'), box, function () { closePanel(); C.events.emit('inventory:showInstance', { instanceId: item.instanceId }); });
    C.accessibility.trap(box); close.focus({ preventScroll: true });
    if (entry) { C.achievements.markSeen(id); var dot = tile && tile.querySelector('.achievement-new-dot'); if (dot) dot.remove(); }
    detail.addEventListener('click', detailOutside, { once: true });
    C.events.emit('ui:achievement', { beat: 'detail', id: id });
  }
  function detailOutside(event) { if (event.target === detail) closeDetail(); else if (!detail.hidden) detail.addEventListener('click', detailOutside, { once: true }); }
  function closeDetail(restore) {
    if (!detail || detail.hidden) return;
    var box = detail.firstElementChild; if (box) C.accessibility.release(box); detail.inert = true; detail.classList.add('is-closing'); detail.removeEventListener('click', detailOutside);
    root.setTimeout(function () { if (detail.firstElementChild === box && detail.classList.contains('is-closing')) detail.hidden = true; }, C.settings.get('quality') === 'very-low' ? 0 : 250);
    if (restore !== false && detailOrigin && detailOrigin.isConnected) detailOrigin.focus({ preventScroll: true });
  }
  function updatePanel(now, dt) {
    if (!opened) return false;
    var quality = C.settings.get('quality'), duration = quality === 'high' ? 600 : 350, instant = quality === 'very-low' || quality === 'low' || C.motion.reduced;
    ringAge += dt; var ringP = instant ? 1 : Math.min(1, ringAge / duration), total = C.achievements.totals().total;
    totalText.textContent = Math.round(ringTarget * (1 - Math.pow(1 - ringP, 3))) + ' / ' + total;
    ring.style.strokeDashoffset = String(100 * (1 - (total ? ringTarget / total : 0) * (1 - Math.pow(1 - ringP, 3))));
    var moving = ringP < 1;
    tiles.forEach(function (tile) {
      tile.age += dt; var p = instant ? 1 : Math.max(0, Math.min(1, tile.age / duration)), eased = 1 - Math.pow(1 - p, 3);
      tile.fill.style.transform = 'scaleX(' + tile.ratio * eased + ')';
      if (!tile.hidden) tile.count.textContent = Math.round(tile.value * eased).toLocaleString() + ' / ' + tile.goal.toLocaleString();
      moving = moving || p < 1;
    });
    return moving;
  }
})(window.Cardable, window);
