(function (C, root) {
  'use strict';
  var svg, host, letters = [], clock = 0, hovered = false, focused = false, visible = true, openingPaused = false;
  var running = false, returning = false, single = null, returnQueue = [];
  var NS = 'http://www.w3.org/2000/svg', word = 'cardable';
  var curve;
  var stats = { waves: 0, active: false, swapping: 0, changed: 0, swaps: 0, slots: [] };
  function make(tag, attrs) { var el = root.document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); }); return el; }
  function random(min, max) { return min + Math.random() * (max - min); }
  function ease(t) {
    t = Math.max(0, Math.min(1, t)); if (t === 0 || t === 1) return t;
    function axis(u, a, b) { return 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u; }
    var low = 0, high = 1, u;
    for (var i = 0; i < 12; i++) { u = (low + high) / 2; if (axis(u, curve[0], curve[2]) < t) low = u; else high = u; }
    return axis((low + high) / 2, curve[1], curve[3]);
  }
  function hold() { return random(C.config.logo.holdMinMs, C.config.logo.holdMaxMs); }
  function eligible() { return C.settings.policy.animation > 0 && C.settings.get('logoAnimation') !== false && !openingPaused && !C.motion.reduced && !root.document.hidden && visible; }
  function paint(letter, progress) {
    var travel = C.config.shell.logo.cellHeight * C.config.logo.travelPortion, e = ease(progress);
    var outgoing = letter.snapshot || letter.real, incoming = letter.returnText || letter.alternate;
    outgoing.style.transform = 'translateY(' + (-e * travel) + 'px)'; outgoing.style.opacity = 1 - e;
    incoming.style.transform = 'translateY(' + ((1 - e) * travel) + 'px)'; incoming.style.opacity = e;
    var blur = progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) * C.config.logo.blurPx : 0;
    letter.clip.style.filter = blur ? 'blur(' + blur + 'px)' : '';
  }
  function rest(letter, glyph) {
    if (letter.snapshot) { letter.clip.appendChild(letter.real); letter.clip.appendChild(letter.alternate); letter.snapshot.remove(); letter.returnText.remove(); letter.snapshot = letter.returnText = null; }
    letter.glyph = glyph; letter.real.textContent = glyph; letter.alternate.textContent = glyph; letter.swap = null; paint(letter, 0);
  }
  function measure() {
    var cfg = C.config.shell.logo, tuning = C.config.logo;
    var probe = make('text', { y: cfg.baseline, opacity: 0, 'aria-hidden': 'true' }), position = 0;
    svg.appendChild(probe);
    letters.forEach(function (letter) {
      var width = 0;
      letter.pool.forEach(function (glyph) { probe.textContent = glyph; width = Math.max(width, probe.getComputedTextLength()); });
      width += tuning.slotPaddingPx * 2; letter.width = width;
      letter.group.setAttribute('transform', 'translate(' + position + ',0)');
      letter.rect.setAttribute('width', width); letter.real.setAttribute('x', width / 2); letter.alternate.setAttribute('x', width / 2);
      position += width + tuning.trackingPx;
    });
    probe.remove(); position -= tuning.trackingPx;
    stats.slots = letters.map(function (letter) { return letter.width; });
    svg.setAttribute('viewBox', '0 0 ' + position + ' ' + cfg.cellHeight); svg.setAttribute('width', position); svg.setAttribute('height', cfg.cellHeight);
  }
  function swap(letter, glyph, ms) {
    if (!letter.snapshot) { letter.real.textContent = letter.glyph; letter.alternate.textContent = glyph; }
    letter.swap = { at: clock, ms: ms, to: glyph }; paint(letter, 0); stats.swaps += 1; stats.waves += 1;
  }
  function reset() {
    running = returning = false; single = null; returnQueue = [];
    letters.forEach(function (letter) { rest(letter, letter.character); });
    stats.active = false; stats.swapping = stats.changed = 0;
  }
  function start(idle) {
    if (!eligible() || running || returning) return;
    running = true; returning = false; stats.active = true;
    single = idle && !hovered && !focused ? letters[Math.floor(Math.random() * letters.length)] : null;
    letters.forEach(function (letter) { letter.nextAt = clock + hold(); });
    if (single) { single.nextAt = clock; stats.waves += 1; }
    C.fx.wake();
  }
  function settle() {
    if (!running && !returning) return;
    running = false; returning = true; single = null;
    // Four non-real slots allow two calm return batches, rather than eight simultaneous swaps.
    letters.forEach(function (letter) {
      if (!letter.swap || letter.snapshot) return;
      // Freeze the exact in-flight composite, then roll it into the real letter without a jump.
      var snapshot = make('g'); letter.clip.appendChild(snapshot); snapshot.appendChild(letter.real); snapshot.appendChild(letter.alternate);
      letter.snapshot = snapshot; letter.returnText = make('text', { x: letter.width / 2, y: C.config.shell.logo.baseline, 'text-anchor': 'middle' });
      letter.returnText.textContent = letter.character; letter.returnText.style.opacity = 0; letter.clip.appendChild(letter.returnText); letter.swap = null;
    });
    returnQueue = letters.filter(function (letter) { return letter.glyph !== letter.character || letter.snapshot; }).map(function (letter) { return { letter: letter, order: Math.random() }; }).sort(function (a, b) { return a.order - b.order; }).map(function (item) { return item.letter; });
    C.fx.wake();
  }
  function update(now, dt) {
    clock += dt;
    if (!eligible()) { if (running || returning) reset(); return false; }
    if (!running && !returning) return false;
    letters.forEach(function (letter) {
      if (!letter.swap) return;
      var animation = letter.swap, p = Math.min(1, (clock - animation.at) / animation.ms);
      paint(letter, p);
      if (p === 1) { rest(letter, animation.to); letter.nextAt = clock + hold(); }
    });
    var active = letters.filter(function (letter) { return letter.swap; }).length;
    var changed = letters.filter(function (letter) { return letter.glyph !== letter.character || letter.swap && letter.swap.to !== letter.character; }).length;
    if (returning) {
      returnQueue = returnQueue.filter(function (letter) { return letter.swap || letter.snapshot || letter.glyph !== letter.character; });
      returnQueue.forEach(function (letter) {
        if (active >= C.config.logo.maxSwapping || letter.swap || letter.glyph === letter.character && !letter.snapshot) return;
        swap(letter, letter.character, C.config.logo.returnMs); active += 1;
      });
      if (!returnQueue.length && !active) { reset(); if (hovered || focused) start(false); return running; }
    } else {
      // Independent deadlines, never a positional wave.
      letters.slice().sort(function (a, b) { return a.nextAt - b.nextAt; }).forEach(function (letter) {
        if (active >= C.config.logo.maxSwapping || letter.swap || clock < letter.nextAt || single && single !== letter) return;
        var pool = letter.pool.filter(function (glyph) { return glyph !== letter.glyph; });
        var next = pool[Math.floor(Math.random() * pool.length)];
        if (letter.glyph === letter.character && changed >= C.config.logo.maxChanged) { letter.nextAt = clock + hold(); return; }
        if (letter.glyph !== letter.character && (single || changed >= C.config.logo.maxChanged)) next = letter.character;
        swap(letter, next, random(C.config.logo.swapMinMs, C.config.logo.swapMaxMs)); active += 1;
        if (letter.glyph === letter.character) changed += 1;
        if (single && next === letter.character) { running = false; returning = true; returnQueue = [letter]; }
      });
    }
    stats.swapping = active; stats.changed = changed; stats.active = true;
    return true;
  }
  C.logo = {
    initialized: false, stats: stats,
    init: function () {
      if (C.logo.initialized) return; C.logo.initialized = true;
      host = root.document.getElementById('wordmark'); svg = host.querySelector('svg');
      curve = root.getComputedStyle(root.document.documentElement).getPropertyValue('--ease-out').match(/[\d.]+/g).map(Number);
      var cfg = C.config.shell.logo; svg.style.fontSize = cfg.fontPx + 'px'; svg.style.fontWeight = '600';
      var defs = make('defs'), group = make('g', { 'aria-hidden': 'true' }); svg.appendChild(defs); svg.appendChild(group);
      Array.from(word).forEach(function (character, i) {
        // Ordinary Latin-subset glyphs only; no mathematical or superscript substitutes.
        var pool = Array.from(new Set([character, C.config.logoMorph[character]].concat(C.config.logo.pool[character] || []))).filter(Boolean);
        var clipPath = make('clipPath', { id: 'logo-letter-' + i, clipPathUnits: 'userSpaceOnUse' });
        var rect = make('rect', { x: 0, y: 0, height: cfg.cellHeight }); clipPath.appendChild(rect); defs.appendChild(clipPath);
        var outer = make('g'), clip = make('g', { 'clip-path': 'url(#logo-letter-' + i + ')' });
        var real = make('text', { y: cfg.baseline, 'text-anchor': 'middle' }), alternate = make('text', { y: cfg.baseline, 'text-anchor': 'middle' });
        clip.appendChild(real); clip.appendChild(alternate); outer.appendChild(clip); group.appendChild(outer);
        var letter = { character: character, pool: pool, group: outer, clip: clip, rect: rect, real: real, alternate: alternate, glyph: character, swap: null, nextAt: 0 };
        letters.push(letter); rest(letter, character);
      });
      measure(); if (root.document.fonts) root.document.fonts.ready.then(measure);
      host.addEventListener('pointerenter', function () { hovered = true; single = null; start(false); });
      host.addEventListener('pointerleave', function () { hovered = false; if (!focused) settle(); });
      host.addEventListener('focus', function () { focused = C.input.modality === 'keyboard'; if (focused) start(false); });
      host.addEventListener('blur', function () { focused = false; if (!hovered) settle(); });
      C.events.on('logo:wave', function () { if (C.settings.policy.ambient) start(true); });
      C.events.on('opening:context', function (event) { openingPaused = event.active; if (openingPaused) reset(); });
      C.events.on('menu:idle', function (idle) { visible = !idle; if (idle) reset(); else if (hovered || focused) start(false); });
      C.events.on('input:modality', function (value) { focused = value === 'keyboard' && root.document.activeElement === host; if (focused) start(false); else if (!hovered) settle(); });
      C.events.on('pointer:leave', function () { hovered = false; if (!focused) settle(); });
      C.events.on('motion:changed', function (reduced) { if (reduced) reset(); else if (hovered || focused) start(false); });
      C.events.on('fx:visibility', function (shown) { if (!shown) { hovered = false; reset(); } else if (focused) start(false); });
      C.settings.onChange('logoAnimation', function (value) { if (!value) reset(); });
      // Gradient finishes are inline so the fragment resolves in this document; monochrome falls back to chrome.
      function finish() {
        var style = C.settings.get('logoStyle') || 'classic', mono = C.settings.get('rarityColor') === 'mono';
        var paint = { chrome: 'chrome', prism: mono ? 'chrome' : 'prism', ember: mono ? 'chrome' : 'ember' }[style];
        host.dataset.logoStyle = style; svg.style.fill = paint ? 'url(#cb-logo-' + paint + ')' : '';
      }
      var paints = make('svg', { 'class': 'cb-sprite', 'aria-hidden': 'true' }), paintDefs = make('defs');
      [['chrome', 0, 1, ['#FFFFFF', '#B9B9C0', '#F5F5F7', '#8E8E93']], ['prism', 1, 1, ['#ADC4FF', '#C7A9FF', '#F3ADB8', '#F1CF99', '#9ADCC0']], ['ember', 0, 1, ['#FFE9C2', '#F1CF99', '#F3ADB8']]].forEach(function (g) {
        var gradient = make('linearGradient', { id: 'cb-logo-' + g[0], x1: 0, y1: 0, x2: g[1], y2: g[2] });
        g[3].forEach(function (color, i) { gradient.appendChild(make('stop', { offset: i / (g[3].length - 1), 'stop-color': color })); }); paintDefs.appendChild(gradient);
      });
      paints.appendChild(paintDefs); root.document.body.appendChild(paints);
      C.settings.onChange('logoStyle', finish); C.settings.onChange('rarityColor', finish); finish();
      C.fx.subscribe(update, 'logo');
    }
  };
})(window.Cardable, window);
