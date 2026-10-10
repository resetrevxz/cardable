/** Settings shell: a docked glass panel with an icon rail, one page at a time,
 *  search across every page, Simple/Advanced, and a live preview dock.
 *  The layout comes from C.data.settingsPages; rows come from the control factory. */
(function (C, root) {
  'use strict';
  C.settingsShell = { create: function (panel, options) {
    var node = C.packMarkup.node, schema = C.settingsSchema.entries, pages = C.data.settingsPages.filter(function (page) { return !page.nativeOnly || C.native; });
    var groups = {}, slots = {}, rows = {}, nav = {}, cards = [], confirmations = [], controls = [], current = pages[0].id, query = '', lastMode = null, filtered = false;
    var starts = { Graphics: 'quality', Performance: 'fpsLimit', Appearance: 'accentColor', Motion: 'motion', Gameplay: 'holdDuration', Accessibility: 'highContrast' };
    function announce(text) { if (C.preferences.status) C.preferences.status.textContent = text; }
    function advanced() { return C.settings.get('settingsMode') === 'advanced'; }

    var rail = node('nav', 'cbs-rail cb-scroll', panel); rail.setAttribute('aria-label', 'Settings pages');
    var pill = node('i', 'cbs-nav-pill', rail); pill.setAttribute('aria-hidden', 'true');
    var main = node('div', 'cbs-main', panel), header = node('header', 'settings-header', main), heading = node('div', 'cbs-heading', header);
    var title = node('h2', '', heading, 'Settings'), blurb = node('p', 'cbs-blurb', heading);
    var help = C.ui.create('help', { help: 'settings', label: 'Settings help' }); header.appendChild(help);
    var close = C.ui.create('icon-button', { label: 'Close settings', icon: 'close', onClick: options.close }); close.classList.add('cbs-close'); close.title = 'Close (Esc)'; header.appendChild(close);
    var tools = node('div', 'cbs-tools', main);
    var search = C.ui.create('search-field', { label: 'Search settings', placeholder: 'Search every setting…', onChange: function (value) { query = value.toLowerCase().trim(); refresh(); content.scrollTop = 0; } }); tools.appendChild(search);
    var mode = C.ui.create('segmented-control', { label: 'Settings mode', options: ['Simple', 'Advanced'], value: advanced() ? 1 : 0, onChange: function (value) { C.settings.set('settingsMode', value.toLowerCase()); } }); mode.classList.add('cbs-mode'); tools.appendChild(mode);
    var content = node('div', 'settings-scroll cb-scroll', main); content.tabIndex = -1;
    var empty = C.ui.create('empty-state', { label: 'No matching settings. Try another search.' }); empty.hidden = true; content.appendChild(empty);
    var showAdvanced = C.ui.create('button', { label: 'Show Advanced', onClick: function () { C.settings.set('settingsMode', 'advanced'); } }); empty.appendChild(showAdvanced);
    var viz = C.settingsViz.create(main), footer = node('footer', 'settings-footer', main);

    pages.forEach(function (page, index) {
      var button = node('button', 'cbs-nav', rail); button.type = 'button'; button.appendChild(C.icons.create(page.icon)); node('span', '', button, page.id); button.dataset.page = page.id; button.style.setProperty('--i', index); button.title = page.id + ' · ' + page.blurb;
      button.addEventListener('click', function () { go(page.id, true); });
      C.keys.listen(button, 'keydown', 'settings.shell.rail', function (event) {
        var step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key]; if (!step) return; event.preventDefault();
        var visible = pages.filter(function (p) { return !nav[p.id].hidden; }), at = visible.indexOf(page), next = visible[(at + step + visible.length) % visible.length]; go(next.id, true); nav[next.id].focus();
      });
      nav[page.id] = button;
      var section = node('section', 'settings-group', content); section.dataset.group = page.id; section.id = 'settings-group-' + page.id; section.setAttribute('aria-label', page.id); button.setAttribute('aria-controls', section.id);
      node('h3', 'cbs-page-title', section, page.id);
      page.sections.forEach(function (part, order) {
        var card = node('section', 'cbs-card', section), head = node('header', 'cbs-card-head', card); node('h4', '', head, part.title);
        var body = node('div', 'cbs-card-body' + (part.grid ? ' cbs-card-grid' : ''), card); card.style.setProperty('--i', order);
        if (part.slot) { slots[part.slot] = body; card.dataset.slot = part.slot; }
        cards.push({ el: card, part: part, page: page, head: head, body: body });
        part.keys.forEach(function (key) {
          var d = schema[key]; if (!d || d.nativeOnly && !C.native) return;
          var control = C.settingsControls.create(d, body); controls.push(control); add(control.row, d);
        });
      });
      // A page with options can return to its defaults; the click-again step and Undo keep it safe.
      if (Object.keys(schema).some(function (key) { return schema[key].group === page.id; })) {
        var reset = node('button', 'cbs-page-reset', section, 'Restore ' + page.id.toLowerCase() + ' defaults'); reset.type = 'button';
        confirmations.push(C.settingsControls.confirmation(reset, function () {
          var before = C.settings.snapshot, next = Object.assign({}, before); Object.keys(schema).forEach(function (key) { if (schema[key].group === page.id) next[key] = schema[key].defaultValue; });
          C.settings.restore(next); C.ui.toast(page.id + ' restored.', { label: 'Undo', run: function () { C.settings.restore(before); } });
        }, { announce: announce, confirmMessage: 'Click again within three seconds to restore ' + page.id.toLowerCase() + ' defaults.' }));
      }
      groups[page.id] = section; if (index === 0) current = page.id;
    });

    function add(row, d) {
      var label = row.querySelector('.settings-label'), reset = C.ui.create('icon-button', { label: 'Reset ' + d.label, icon: 'reset', onClick: function () { C.settings.set(d.key, d.defaultValue); } });
      reset.classList.add('cb-setting-reset'); reset.title = 'Reset to default'; row.appendChild(reset); row.appendChild(node('span', 'cb-changed-dot', null)); row.dataset.setting = d.key; rows[d.key] = { row: row, label: label, reset: reset };
    }
    function highlight(label, text) {
      label.replaceChildren(); var at = query ? text.toLowerCase().indexOf(query) : -1; if (at < 0) { label.textContent = text; return; }
      label.append(root.document.createTextNode(text.slice(0, at))); var hit = root.document.createElement('mark'); hit.textContent = text.slice(at, at + query.length); label.append(hit, root.document.createTextNode(text.slice(at + query.length)));
    }
    function matches(d, key) { return !query || [d.label, d.helper, key, d.group].concat(d.aliases || []).join(' ').toLowerCase().includes(query); }
    function pageVisible(page) { return !page.advanced || advanced(); }
    function movePill() { var button = nav[current]; pill.hidden = !!query || !button || button.hidden; if (pill.hidden) return; pill.style.transform = 'translate(' + button.offsetLeft + 'px,' + button.offsetTop + 'px)'; pill.style.width = button.offsetWidth + 'px'; pill.style.height = button.offsetHeight + 'px'; }
    function refresh() {
      var isAdvanced = advanced(), snapshot = C.settings.snapshot; panel.dataset.mode = isAdvanced ? 'advanced' : 'simple'; panel.dataset.searching = String(!!query);
      if (!pages.some(function (p) { return p.id === current && pageVisible(p); })) current = pages[0].id;
      Object.keys(rows).forEach(function (key) {
        var r = rows[key], d = schema[key], changed = JSON.stringify(snapshot[key]) !== JSON.stringify(d.defaultValue);
        r.row.hidden = !matches(d, key) || !!d.advanced && !isAdvanced; r.row.dataset.changed = String(changed); r.reset.hidden = !changed; highlight(r.label, d.label);
      });
      var bindingMatch = query && C.controlsSettings ? C.controlsSettings.filter(query) : false; if (!query && filtered && C.controlsSettings) C.controlsSettings.filter(''); filtered = !!query;
      cards.forEach(function (card) {
        var list = Array.from(card.body.querySelectorAll(':scope > .settings-row')), shown = list.some(function (row) { return !row.hidden; });
        if (card.part.slot && !list.length) shown = !query || (card.part.slot === 'bindings' ? bindingMatch : card.el.textContent.toLowerCase().includes(query));
        card.el.hidden = !shown || !pageVisible(card.page) && !query;
      });
      var any = false;
      pages.forEach(function (page) {
        var section = groups[page.id], has = cards.some(function (card) { return card.page === page && !card.el.hidden; });
        section.hidden = query ? !has : page.id !== current; any = any || !section.hidden;
        nav[page.id].hidden = !pageVisible(page); nav[page.id].setAttribute('aria-current', String(!query && page.id === current));
      });
      var hiddenAdvanced = !!query && !isAdvanced && Object.keys(rows).some(function (key) { return schema[key].advanced && matches(schema[key], key); });
      empty.hidden = !query || any; empty.childNodes[0].textContent = hiddenAdvanced ? 'This setting is in Advanced. Show Advanced to continue.' : 'No matching settings. Try another search.'; showAdvanced.hidden = !hiddenAdvanced;
      var page = pages.find(function (p) { return p.id === current; });
      title.textContent = query ? 'Search' : page.id; blurb.textContent = query ? 'Results from every page' + (isAdvanced ? '.' : ', Simple options only.') : page.blurb;
      mode.style.setProperty('--selected', isAdvanced ? 1 : 0); mode.querySelectorAll('button').forEach(function (b, i) { var on = i === (isAdvanced ? 1 : 0); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      viz.el.dataset.idle = String(!query && !starts[current]); movePill();
      if (lastMode !== null && lastMode !== isAdvanced) enter(groups[current]); lastMode = isAdvanced;
    }
    function enter(section) { section.classList.remove('is-entering'); void section.offsetWidth; section.classList.add('is-entering'); }
    function go(id, animate) {
      if (!groups[id]) return; var changed = id !== current || !!query; current = id; query = ''; search.value = ''; refresh();
      if (changed) { content.scrollTop = 0; if (animate) enter(groups[id]); if (starts[id]) viz.show(starts[id]); }
    }
    function focus(id) {
      id = C.data.settingsAliases[id] || id; var item = schema[id];
      if (!item || !rows[id]) { if (id && groups[id]) { var target = pages.find(function (p) { return p.id === id; }); if (target.advanced && !advanced()) C.settings.set('settingsMode', 'advanced'); go(id, false); } else refresh(); return; }
      if (item.advanced && !advanced()) C.settings.set('settingsMode', 'advanced');
      go(item.group, false); var row = rows[id].row; row.scrollIntoView({ block: 'center' }); row.classList.remove('is-located'); void row.offsetWidth; row.classList.add('is-located'); viz.show(id);
      var control = row.querySelector('button:not(.cb-setting-reset),input,select'); if (control) control.focus({ preventScroll: true });
    }
    function point(event) { var row = event.target.closest && event.target.closest('.settings-row[data-setting]'); if (row && schema[row.dataset.setting]) viz.show(row.dataset.setting); }
    content.addEventListener('pointerover', point); content.addEventListener('focusin', point);
    panel.addEventListener('pointermove', function () { viz.poke(); }, { passive: true });
    content.addEventListener('scroll', function () { main.dataset.scrolled = String(content.scrollTop > 4); }, { passive: true });
    // The panel edge catches the light under the pointer, like the rest of the glass.
    panel.addEventListener('pointermove', function (event) { if (C.motion.reduced || !C.settings.policy.blur) return; var r = panel.getBoundingClientRect(); panel.style.setProperty('--light-x', (event.clientX - r.left) / r.width * 100 + '%'); panel.style.setProperty('--light-y', (event.clientY - r.top) / r.height * 100 + '%'); }, { passive: true });
    C.settings.onChange('*', refresh);
    if (root.ResizeObserver) new root.ResizeObserver(movePill).observe(rail);
    return { body: main, content: content, preview: viz.card, viz: viz, groups: groups, slots: slots, footer: footer, closeButton: close, add: add, refresh: refresh, focus: focus, go: go, get page() { return current; },
      group: function (name) { return slots[String(name).toLowerCase()] || groups[C.data.settingsAliases[name] || name]; },
      opened: function () { refresh(); enter(rail); enter(groups[current]); if (starts[current]) viz.show(starts[current]); viz.poke(); },
      update: function (now, dt) { var active = viz.update(now, dt); controls.forEach(function (c) { active = c.update(now, dt) || active; }); confirmations.forEach(function (c) { active = c.update(now, dt) || active; }); return active; } };
  } };
  C.openSettings = function (id) { if (C.commands && C.commands.active) C.commands.close(); return C.preferences.show(id); };
})(window.Cardable, window);
