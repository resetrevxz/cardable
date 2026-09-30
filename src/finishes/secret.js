(function (C) {
  'use strict';
  // Unfound design: "The secret logo is shifted by gibberish letters shifting including @#$&_- and many more in quick succession with a white color lines shifting across all of them quickly"
  // Unfound prop: "A black square outside border with small squircle edges at 95% opacity"
  // Found design: 'The secret logo is shifted by gibberish letters shifting including @#$&_- and many more with a white color lines shifting across all of them quickly but every 0.3 seconds 1 letter of the word "Secret" locks in with a small white animation, until everything is "Secret", then it reverses to black color lines on white, and the lines start going faster and faster and bigger and bigger until everything is black then it reverses to White lines on black and so on.'
  // Found prop: "A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes"
  function presentation(card, context) {
    var state = context.state || (context.owned ? 'found' : 'unfound'), rarity = C.rarity(card.rarity);
    if (state !== 'found' && state !== 'unfound') throw new Error('Unknown Secret state: ' + state);
    return { state: state, concealed: state === 'unfound', hideArt: state === 'unfound', hasProp: true,
      description: state === 'found' ? rarity.foundDescription : rarity.unfoundDescription };
  }
  function surface(card, context, lite) {
    var cfg = C.config.finishMotion.secret, info = presentation(card, context), el = C.finishes.surface('secret', context);
    el.dataset.secretState = info.state;
    var logo = C.finishes.element('div', 'finish-secret-logo', el), random = C.art.random(card.art.seed + 11);
    logo.setAttribute('aria-hidden', 'true');
    var word = C.rarity(card.rarity).name, glyphs = [];
    for (var i = 0; i < word.length; i += 1) {
      var glyph = C.finishes.element('span', 'finish-secret-glyph', logo);
      glyph.textContent = lite && info.state === 'found' ? word[i] : cfg.glyphs[Math.floor(random() * cfg.glyphs.length)]; glyphs.push(glyph);
    }
    var field = C.finishes.element('div', 'finish-secret-lines', el), lines = [];
    for (var j = 0; j < cfg.lineCount; j += 1) {
      var line = C.finishes.element('i', 'finish-secret-line', field);
      line.style.top = ((j + 0.5) / cfg.lineCount * 100) + '%'; line.style.height = cfg.lineHeightPercent + '%'; lines.push(line);
    }
    var prop = C.finishes.surface('secret-prop', context); prop.classList.add('finish-prop');
    var frame = C.finishes.squircle(prop, 'finish-secret-frame'); frame.path.setAttribute('stroke', 'var(--secret-border)'); frame.path.setAttribute('opacity', '0.95');
    (context.propElement || el).appendChild(prop);
    return { el: el, prop: prop, glyphs: glyphs, lines: lines, random: random, word: word,
      found: info.state === 'found', time: 0, scrambleStep: -1, phase: 'scramble', locked: 0 };
  }
  C.finishes.register('secret', {
    previewStates: ['found', 'unfound'], describe: presentation,
    mount: function (element, card, context) { var state = surface(card, context, false); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      var cfg = C.config.finishMotion.secret; state.time += dt;
      var lockDuration = state.word.length * cfg.lockMs, cycle = lockDuration + cfg.coverMs;
      var elapsed = state.found ? state.time % cycle : state.time;
      var covering = state.found && elapsed >= lockDuration, phase = covering ? 'cover' : 'scramble';
      var locked = state.found ? Math.min(state.word.length, Math.floor(elapsed / cfg.lockMs)) : 0;
      var step = Math.floor(state.time / cfg.scrambleMs), changed = step !== state.scrambleStep || locked !== state.locked || phase !== state.phase;
      if (changed) {
        state.glyphs.forEach(function (glyph, i) {
          glyph.textContent = i < locked ? state.word[i] : cfg.glyphs[Math.floor(state.random() * cfg.glyphs.length)];
        }); state.scrambleStep = step;
      }
      state.glyphs.forEach(function (glyph, i) {
        var age = elapsed - (i + 1) * cfg.lockMs;
        glyph.style.setProperty('--lock-flash', i < locked && age < cfg.lockFlashMs ? 1 - age / cfg.lockFlashMs : 0);
      });
      state.phase = phase; state.locked = locked;
      state.el.dataset.phase = phase; state.prop.dataset.phase = phase;
      var progress = covering ? (elapsed - lockDuration) / cfg.coverMs : 0;
      var growth = 1 + progress * progress * (cfg.lineScaleMax - 1);
      // Integrating the rising frequency avoids a discontinuous speed jump.
      var sweep = covering ? cfg.sweepHz * (elapsed - lockDuration) / 1000 +
        (cfg.maxSweepHz - cfg.sweepHz) * Math.pow(elapsed - lockDuration, 2) / (2 * cfg.coverMs * 1000) : state.time / 1000 * cfg.sweepHz;
      state.lines.forEach(function (line, i) {
        line.style.transform = 'translateX(' + Math.sin(sweep * Math.PI * 2 + i) * cfg.sweepPercent * (1 - progress) + '%) scaleY(' + growth + ')';
      });
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context, true).el; }
  });
})(window.Cardable);
