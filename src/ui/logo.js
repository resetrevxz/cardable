(function (C, root) {
  'use strict';
  var svg, host, letters = [], waveAt = null, settling = null, hovered = false, focused = false, visible = true;
  var NS = 'http://www.w3.org/2000/svg', word = 'cardable';
  var stats = { waves: 0, active: false };
  var openingPaused = false;
  function make(tag, attrs) {
    var el = root.document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }
  function ease(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
  function paint(letter, amount) {
    var cfg = C.config.shell.logo;
    letter.amount = amount;
    letter.real.style.transform = 'translateY(' + (-amount * cfg.cellHeight) + 'px)';
    letter.alternate.style.transform = 'translateY(' + ((1 - amount) * cfg.cellHeight) + 'px)';
    letter.clip.style.filter = amount > 0 && amount < 1 ? 'blur(' + (Math.sin(amount * Math.PI) * cfg.blurPx) + 'px)' : '';
  }
  function measure() {
    var cfg = C.config.shell.logo;
    var probe = make('text', { y: cfg.baseline, opacity: 0, 'aria-hidden': 'true' });
    svg.appendChild(probe);
    var previous = 0, position = 0;
    letters.forEach(function (letter, i) {
      probe.textContent = word.slice(0, i + 1);
      var prefix = probe.getComputedTextLength();
      var advance = prefix - previous;
      previous = prefix;
      letter.group.setAttribute('transform', 'translate(' + position + ',0)');
      letter.rect.setAttribute('width', advance + 4);
      probe.textContent = C.config.logoMorph[word[i]] || word[i];
      if (probe.getComputedTextLength() > advance) {
        letter.alternate.setAttribute('textLength', advance);
        letter.alternate.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      } else { letter.alternate.removeAttribute('textLength'); letter.alternate.removeAttribute('lengthAdjust'); }
      position += advance + (i < letters.length - 1 ? cfg.fontPx * cfg.letterSpacingEm : 0);
    });
    probe.remove();
    svg.setAttribute('viewBox', '-2 0 ' + (position + 4) + ' ' + cfg.cellHeight);
    svg.setAttribute('width', position + 4); svg.setAttribute('height', cfg.cellHeight);
  }
  function start() {
    if (openingPaused || C.motion.reduced || root.document.hidden || !visible || waveAt !== null) return;
    waveAt = root.performance.now(); settling = null; stats.waves += 1; stats.active = true;
    C.fx.wake();
  }
  function settle() {
    if (waveAt === null && !settling) return;
    waveAt = null;
    settling = { at: root.performance.now(), amounts: letters.map(function (letter) { return letter.amount; }) };
    C.fx.wake();
  }
  function reset() {
    waveAt = null; settling = null; stats.active = false;
    letters.forEach(function (letter) { paint(letter, 0); });
  }
  function update(now) {
    var cfg = C.config.shell.logo;
    if (C.motion.reduced) { reset(); return false; }
    if (settling) {
      var t = (now - settling.at) / cfg.swapMs;
      letters.forEach(function (letter, i) { paint(letter, settling.amounts[i] * (1 - ease(t))); });
      if (t >= 1) { reset(); return false; }
      return true;
    }
    if (waveAt === null) return false;
    var elapsed = now - waveAt;
    if (elapsed >= cfg.loopMs) {
      if (visible && (hovered || focused)) { waveAt += Math.floor(elapsed / cfg.loopMs) * cfg.loopMs; elapsed = now - waveAt; stats.waves += 1; }
      else { reset(); return false; }
    }
    letters.forEach(function (letter, i) {
      var time = elapsed - i * cfg.staggerMs;
      var amount = time < 0 ? 0 : time < cfg.swapMs ? ease(time / cfg.swapMs) : time < cfg.returnMs ? 1 : 1 - ease((time - cfg.returnMs) / cfg.swapMs);
      paint(letter, amount);
    });
    return true;
  }
  C.logo = {
    initialized: false, stats: stats,
    init: function () {
      if (C.logo.initialized) return;
      C.logo.initialized = true;
      host = root.document.getElementById('wordmark'); svg = host.querySelector('svg');
      var cfg = C.config.shell.logo;
      svg.style.fontSize = cfg.fontPx + 'px';
      var defs = make('defs'), group = make('g', { 'aria-hidden': 'true' });
      svg.appendChild(defs); svg.appendChild(group);
      Array.from(word).forEach(function (character, i) {
        var clipPath = make('clipPath', { id: 'logo-letter-' + i, clipPathUnits: 'userSpaceOnUse' });
        var rect = make('rect', { x: -2, y: 0, height: cfg.cellHeight });
        clipPath.appendChild(rect); defs.appendChild(clipPath);
        var outer = make('g'), clip = make('g', { 'clip-path': 'url(#logo-letter-' + i + ')' });
        var real = make('text', { x: 0, y: cfg.baseline }), alternate = make('text', { x: 0, y: cfg.baseline });
        real.textContent = character; alternate.textContent = C.config.logoMorph[character] || character;
        clip.appendChild(real); clip.appendChild(alternate); outer.appendChild(clip); group.appendChild(outer);
        var letter = { group: outer, clip: clip, rect: rect, real: real, alternate: alternate, amount: 0 };
        letters.push(letter); paint(letter, 0);
      });
      measure();
      if (root.document.fonts) root.document.fonts.ready.then(measure);
      host.addEventListener('pointerenter', function () { hovered = true; start(); });
      host.addEventListener('pointerleave', function () { hovered = false; if (!focused) settle(); });
      host.addEventListener('focus', function () { focused = C.input.modality === 'keyboard'; if (focused) start(); });
      host.addEventListener('blur', function () { focused = false; if (!hovered) settle(); });
      C.events.on('logo:wave', start);
      C.events.on('opening:context', function (event) { openingPaused = event.active; if (openingPaused) reset(); });
      C.events.on('menu:idle', function (idle) {
        visible = !idle;
        if (idle) settle(); else if (hovered || focused) start();
      });
      C.events.on('input:modality', function (value) {
        focused = value === 'keyboard' && root.document.activeElement === host;
        if (focused) start(); else if (!hovered) settle();
      });
      C.events.on('pointer:leave', function () { hovered = false; if (!focused) settle(); });
      C.events.on('motion:changed', function (reduced) { if (reduced) reset(); else if (hovered || focused) start(); });
      C.events.on('fx:visibility', function (visible) { if (!visible) { hovered = false; reset(); } else if (focused) start(); });
      C.fx.subscribe(update, 'logo');
    }
  };
})(window.Cardable, window);
