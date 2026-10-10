/** Settings controls beyond switch and segments: dropdown, slider, frame-rate
 *  picker, graphics tiers, swatches and wordmark tiles. Each returns the same
 *  { el, row, buttons, update, destroy } contract as the base control factory. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, base = C.uiKit.create, uid = 0;
  [['sparkle', 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z'],
    ['gauge', 'M4.5 17a8.5 8.5 0 1 1 15 0M12 13l3.5-4.5M8 21h8'], ['palette', 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 11.8C21 6.9 17 3 12 3zM7.5 12h.01M9.5 8h.01M14.5 8h.01'],
    ['motion', 'M13 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 8h6M2 12h7M3 16h6'], ['keyboard', 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10'],
    ['access', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7.5h.01M8 10.5c2.7 1 5.3 1 8 0M12 11v3.5M12 14.5l-2 3.5M12 14.5l2 3.5'], ['monitor', 'M3 4h18v12H3zM9 20h6M12 16v4'],
    ['layers', 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5'], ['info', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v5M12 8h.01'], ['lock', 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
    ['download', 'M12 4v11M7 11l5 5 5-5M5 20h14'], ['upload', 'M12 16V5M7 9l5-5 5 5M5 20h14'], ['trash', 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13'], ['bolt', 'M13 3 5 14h6l-1 7 8-11h-6z'],
    ['undo', 'M8 6 3 11l5 5M3 11h11a6 6 0 0 1 0 12h-3'], ['swap', 'M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4'], ['image', 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9h.01'], ['book', 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 21V5M9 8h7']
  ].forEach(function (icon) { C.icons.register(icon[0], icon[1]); });

  function label(d, value) { return d.format ? d.format(value) : String(value); }
  function frame(d, parent, block) {
    var row = node('div', 'settings-row' + (block ? ' cbs-row-block' : ''), parent), copy = node('div', 'settings-copy', row); row.dataset.setting = d.key;
    var name = node('span', 'settings-label', copy, d.label); name.id = (d.prefix || 'setting-') + d.key; node('span', 'settings-helper', copy, d.helper);
    return { row: row, copy: copy, label: name, host: node('div', 'settings-control', row), disabled: !!d.disabled || !!d.nativeOnly && !C.native };
  }
  function bind(binding) { return binding || { get: C.settings.get, set: C.settings.set, subscribe: C.settings.onChange }; }
  function result(el, f, buttons, stops) { return { el: el, row: f.row, buttons: buttons || [], update: function () { return false; }, destroy: function () { (stops || []).forEach(function (stop) { if (stop) stop(); }); } }; }
  function roving(buttons, select) {
    buttons.forEach(function (b, i) { C.keys.listen(b, 'keydown', 'settings.widget.roving', function (event) {
      var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key], next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null;
      if (step == null && next == null) return; event.preventDefault();
      if (next == null) { next = i; for (var n = 0; n < buttons.length; n++) { next = (next + step + buttons.length) % buttons.length; if (!buttons[next].disabled) break; } }
      if (buttons[next].disabled) return; select(next); buttons[next].focus();
    }); });
  }
  function mark(buttons, index) { buttons.forEach(function (b, i) { b.setAttribute('aria-checked', String(i === index)); b.tabIndex = i === index || index < 0 && !i ? 0 : -1; }); }
  function gate(d, apply) { if (!d.choices || d.choices.indexOf('very-high') < 0 || !C.quality) return null; function run() { apply(C.quality.availability()); } run(); return C.events.on('quality:availability', run); }

  // Dropdown: a button and a listbox. Focus stays on the button; arrows move the active option.
  function menu(d, parent, binding, meter) {
    binding = bind(binding); var f = frame(d, parent), id = 'cbs-menu-' + (++uid), open = false, active = 0, pips = [];
    if (meter) { var level = node('span', 'cbs-level', f.host); level.setAttribute('aria-hidden', 'true'); for (var p = 0; p < 5; p++) pips.push(node('i', '', level)); f.row.classList.add('cbs-row-level'); }
    var wrap = node('div', 'cbs-menu', f.host), button = node('button', 'cbs-menu-button', wrap), value = node('span', 'cbs-menu-value', button); button.type = 'button'; button.appendChild(C.icons.create('chevron'));
    value.id = id + '-value'; button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-labelledby', f.label.id + ' ' + value.id); button.disabled = f.disabled;
    var list = node('div', 'cbs-menu-list cb-scroll', wrap); list.id = id; list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', f.label.id); button.setAttribute('aria-controls', id);
    var options = d.choices.map(function (choice, i) { var o = node('div', 'cbs-menu-option', list); o.id = id + '-' + i; o.setAttribute('role', 'option'); node('span', '', o, label(d, choice)); o.appendChild(C.icons.create('check'));
      o.addEventListener('pointerdown', function (event) { event.preventDefault(); }); o.addEventListener('click', function () { pick(i); }); o.addEventListener('pointermove', function () { if (active !== i) highlight(i); }); return o; });
    list.addEventListener('pointerdown', function (event) { event.preventDefault(); });
    function enabled(i) { return options[i].getAttribute('aria-disabled') !== 'true'; }
    function highlight(i) { active = i; options.forEach(function (o, n) { o.classList.toggle('is-active', n === i); }); button.setAttribute('aria-activedescendant', options[i].id); if (open) options[i].scrollIntoView({ block: 'nearest' }); }
    function outside(event) { if (!wrap.contains(event.target)) toggle(false); }
    function toggle(next) {
      if (next === open || next && (button.disabled || meter && f.row.closest('[data-mode="simple"]'))) return; open = next; wrap.dataset.open = String(open); button.setAttribute('aria-expanded', String(open)); f.row.classList.toggle('is-raised', open);
      var section = f.row.closest('.cbs-card'); if (section) section.classList.toggle('is-raised', open);
      if (!open) { root.document.removeEventListener('pointerdown', outside, true); button.removeAttribute('aria-activedescendant'); return; }
      root.document.addEventListener('pointerdown', outside, true); delete wrap.dataset.side; highlight(Math.max(0, d.choices.indexOf(binding.get(d.key))));
      var scroller = f.row.closest('.settings-scroll'); if (scroller && list.getBoundingClientRect().bottom > scroller.getBoundingClientRect().bottom - 8) wrap.dataset.side = 'up';
      C.ui.emit('open', { component: 'menu' });
    }
    function pick(i) { if (!enabled(i)) return; toggle(false); binding.set(d.key, d.choices[i]); button.focus({ preventScroll: true }); }
    function move(step) { var i = active; for (var n = 0; n < options.length; n++) { i = (i + step + options.length) % options.length; if (enabled(i)) break; } highlight(i); }
    button.addEventListener('click', function () { toggle(!open); }); button.addEventListener('blur', function () { toggle(false); });
    C.keys.listen(button, 'keydown', 'settings.widget.menu', function (event) {
      if (event.key === 'Escape') { if (!open) return; event.preventDefault(); event.settingsHandled = true; toggle(false); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) toggle(true); else move(event.key === 'ArrowDown' ? 1 : -1); }
      else if (open && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); pick(active); }
      else if (open && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); active = event.key === 'Home' ? options.length - 1 : 0; move(event.key === 'Home' ? 1 : -1); }
      else if (open && event.key === 'Tab') toggle(false);
    });
    function refresh(v) { var i = d.choices.indexOf(v); value.textContent = i < 0 ? String(v) : label(d, v); options.forEach(function (o, n) { o.setAttribute('aria-selected', String(n === i)); }); pips.forEach(function (pip, n) { pip.classList.toggle('is-on', n <= C.settingsSchema.tiers.indexOf(v)); }); if (meter) f.row.dataset.level = String(C.settingsSchema.tiers.indexOf(v)); }
    refresh(binding.get(d.key));
    var stopGate = gate(d, function (state) { var i = d.choices.indexOf('very-high'); options[i].setAttribute('aria-disabled', String(!state.available)); options[i].title = state.available ? '' : state.reason; options[i].classList.toggle('is-locked', !state.available); });
    return result(button, f, [], [binding.subscribe && binding.subscribe(d.key, refresh), stopGate, function () { toggle(false); }]);
  }

  // Slider: a native range with a filled track and a readable value.
  function slider(d, parent, binding) {
    binding = bind(binding); var f = frame(d, parent), wrap = node('div', 'cbs-range', f.host), input = node('input', 'settings-volume', wrap), out = node('output', 'settings-value', wrap), late = d.key === 'interfaceSize';
    input.type = 'range'; input.min = d.min == null ? 0 : d.min; input.max = d.max == null ? 100 : d.max; input.step = d.step || 1; input.disabled = f.disabled; input.setAttribute('aria-labelledby', f.label.id);
    function number(v) { return v === 'auto' ? 100 : Number(v); }
    function show(v) { var n = number(v), span = input.max - input.min; wrap.style.setProperty('--fill', span ? (n - input.min) / span : 0); out.textContent = v === 'auto' ? 'Auto' : (d.step && d.step < 1 ? n.toFixed(1) : n) + (d.unit || ''); input.setAttribute('aria-valuetext', out.textContent); }
    function refresh(v) { input.value = number(v); show(v); }
    // Interface scale re-lays out the page, so it commits on release instead of under the pointer.
    input.addEventListener('input', function () { var v = Number(input.value); show(v); if (late) C.events.emit('settings:preview', { key: d.key, value: String(v) }); else binding.set(d.key, v); });
    input.addEventListener('change', function () { if (late) binding.set(d.key, Number(input.value)); });
    refresh(binding.get(d.key));
    return result(input, f, [], [binding.subscribe && binding.subscribe(d.key, refresh)]);
  }

  // Frame-rate picker: readout, slider, scrollable presets and an exact field.
  function fps(d, parent, binding) {
    binding = bind(binding); var f = frame(d, parent, true), box = node('div', 'cbs-fps', f.host);
    var read = node('div', 'cbs-fps-readout', box), big = node('strong', 'cbs-fps-number', read), unit = node('span', 'cbs-fps-unit', read), note = node('span', 'cbs-fps-note', read);
    var range = node('div', 'cbs-range cbs-fps-range', box), input = node('input', 'settings-volume', range); input.type = 'range'; input.min = d.min; input.max = d.max; input.step = 1; input.setAttribute('aria-label', 'Frame rate limit slider');
    var ticks = node('div', 'cbs-fps-ticks', range); d.presets.forEach(function (p) { var t = node('i', '', ticks); t.style.left = (Number(p) - d.min) / (d.max - d.min) * 100 + '%'; });
    var bar = node('div', 'cbs-chipbar cb-scroll', box); bar.setAttribute('role', 'radiogroup'); bar.setAttribute('aria-labelledby', f.label.id);
    var choices = ['display'].concat(d.presets, C.native ? ['unlimited'] : []), chips = choices.map(function (v) { var b = node('button', 'cbs-chip', bar, v === 'display' ? 'Display' : v === 'unlimited' ? 'Unlimited' : v); b.type = 'button'; b.setAttribute('role', 'radio'); b.addEventListener('click', function () { binding.set(d.key, v); }); return b; });
    roving(chips, function (i) { binding.set(d.key, choices[i]); });
    var exact = node('label', 'cbs-fps-exact', box); node('span', '', exact, 'Custom'); var field = node('input', 'settings-input', exact); field.type = 'number'; field.min = d.min; field.max = 500; field.step = 1; field.inputMode = 'numeric'; field.placeholder = '75'; field.setAttribute('aria-label', 'Custom frame rate limit'); node('span', '', exact, 'FPS');
    function snap(n) { var near = d.presets.map(Number).filter(function (p) { return Math.abs(p - n) <= 3; })[0]; return near || n; }
    function show(v) {
      var hz = C.fx && C.fx.stats.refreshHz || 60, numeric = v !== 'display' && v !== 'unlimited', n = numeric ? Number(v) : hz;
      big.textContent = v === 'display' ? 'Display' : v === 'unlimited' ? 'Unlimited' : String(n); unit.textContent = numeric ? 'FPS' : '';
      note.textContent = v === 'display' ? 'Follows your screen, about ' + hz + ' Hz' : v === 'unlimited' ? 'No cap. Uses more power; applies after a restart.' : (1000 / n).toFixed(1) + ' ms per frame' + (n > hz ? ' · above your ' + hz + ' Hz screen' : '');
      range.style.setProperty('--fill', (Math.min(n, d.max) - d.min) / (d.max - d.min)); range.classList.toggle('is-open-ended', !numeric);
    }
    function refresh(v) { v = String(v); show(v); var numeric = v !== 'display' && v !== 'unlimited'; input.value = numeric ? Math.min(Number(v), d.max) : C.fx && C.fx.stats.refreshHz || 60; mark(chips, choices.indexOf(v)); if (root.document.activeElement !== field) field.value = numeric && choices.indexOf(v) < 0 ? v : ''; var chip = chips[choices.indexOf(v)]; if (chip && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = Math.max(0, chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2); }
    // Dragging previews without saving every pixel; release commits.
    input.addEventListener('input', function () { var v = String(snap(Number(input.value))); show(v); C.events.emit('settings:preview', { key: d.key, value: v }); });
    input.addEventListener('change', function () { binding.set(d.key, String(snap(Number(input.value)))); });
    function commit() { if (field.value === '') return; binding.set(d.key, field.value); field.value = ''; refresh(binding.get(d.key)); }
    field.addEventListener('change', commit); C.keys.listen(field, 'keydown', 'settings.widget.fps', function (event) { if (event.key === 'Enter') { event.preventDefault(); commit(); } });
    refresh(binding.get(d.key));
    return result(input, f, chips, [binding.subscribe && binding.subscribe(d.key, refresh)]);
  }

  // Graphics tiers: five tiles, the effect of each in a sentence, and a way back from a customized mix.
  var tierCopy = { 'very-low': ['Very Low', 'Still materials and solid panels. For basic devices.'], low: ['Low', 'Clean materials with light motion.'], medium: ['Medium', 'Balanced detail and cost. The default.'], high: ['High', 'Full materials, lighting and focused effects.'], 'very-high': ['Very High', 'Extra reflections and cinematic optics for capable hardware.'] };
  function tiers(d, parent, binding) {
    binding = bind(binding); var f = frame(d, parent, true), group = node('div', 'cbs-tiers', f.host); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-labelledby', f.label.id);
    var buttons = d.choices.map(function (tier, i) { var b = node('button', 'cbs-tier', group); b.type = 'button'; b.value = tier; b.setAttribute('role', 'radio'); var bars = node('span', 'cbs-tier-bars', b); bars.setAttribute('aria-hidden', 'true'); for (var n = 0; n < 5; n++) node('i', n <= i ? 'is-on' : '', bars); node('span', 'cbs-tier-name', b, tierCopy[tier][0]); b.addEventListener('click', function () { binding.set(d.key, tier); }); return b; });
    roving(buttons, function (i) { binding.set(d.key, d.choices[i]); });
    var foot = node('div', 'cbs-tier-foot', f.host), status = node('p', 'settings-preset-status', foot), chip = node('span', 'cbs-badge', foot, 'Customized'), match = node('button', 'cbs-link', foot, 'Match preset'); match.type = 'button';
    match.addEventListener('click', function () { C.settings.applyPreset(C.settings.snapshot.quality); });
    function refresh() { var tier = C.settings.snapshot.quality, custom = C.settings.customized; mark(buttons, d.choices.indexOf(tier)); group.style.setProperty('--selected', d.choices.indexOf(tier)); status.textContent = tierCopy[tier][1]; chip.hidden = match.hidden = !custom; }
    var stopGate = gate(d, function (state) { var b = buttons[d.choices.indexOf('very-high')]; b.disabled = !state.available; b.title = state.available ? 'Additional detail for capable hardware' : state.reason; b.classList.toggle('is-locked', !state.available); });
    refresh();
    return result(group, f, buttons, [C.settings.onChange('*', refresh), stopGate]);
  }

  function swatches(d, parent, binding) {
    binding = bind(binding); var f = frame(d, parent, true), group = node('div', 'cbs-swatches', f.host); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-labelledby', f.label.id);
    var buttons = d.choices.map(function (name) { var b = node('button', 'cbs-swatch', group); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', label(d, name)); b.title = label(d, name); b.style.setProperty('--swatch', C.data.accentColors[name][0]); b.addEventListener('click', function () { binding.set(d.key, name); }); return b; });
    roving(buttons, function (i) { binding.set(d.key, d.choices[i]); });
    function refresh(v) { mark(buttons, d.choices.indexOf(v)); }
    refresh(binding.get(d.key));
    return result(group, f, buttons, [binding.subscribe && binding.subscribe(d.key, refresh)]);
  }

  // Wordmark finishes: a scrollable strip of live specimens.
  function tiles(d, parent, binding) {
    binding = bind(binding); var f = frame(d, parent, true), group = node('div', 'cbs-tiles cb-scroll', f.host); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-labelledby', f.label.id);
    var buttons = d.choices.map(function (name) { var b = node('button', 'cbs-tile', group); b.type = 'button'; b.setAttribute('role', 'radio'); var mark = node('span', 'cbs-tile-mark', b, 'cardable'); mark.dataset.logoStyle = name; mark.setAttribute('aria-hidden', 'true'); node('span', 'cbs-tile-name', b, label(d, name)); b.addEventListener('click', function () { binding.set(d.key, name); }); return b; });
    roving(buttons, function (i) { binding.set(d.key, d.choices[i]); });
    function refresh(v) { var i = d.choices.indexOf(v); mark(buttons, i); if (buttons[i] && group.scrollWidth > group.clientWidth) group.scrollLeft = Math.max(0, buttons[i].offsetLeft - group.clientWidth / 2 + buttons[i].offsetWidth / 2); }
    refresh(binding.get(d.key));
    return result(group, f, buttons, [binding.subscribe && binding.subscribe(d.key, refresh)]);
  }

  var kinds = { menu: menu, slider: slider, fps: fps, tiers: tiers, swatches: swatches, tiles: tiles, level: function (d, parent, binding) { return menu(d, parent, binding, true); } };
  C.uiKit.create = function (descriptor, parent, binding) {
    var make = kinds[descriptor.control];
    return make ? make(descriptor, parent, binding) : base.call(this, descriptor, parent, binding);
  };
})(window.Cardable, window);
