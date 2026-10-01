(function (C) {
  'use strict';
  // Unfound design: "Fast white line sweeps on black, confined to the sides, without lettering."
  // Unfound prop: "A black square outside border with small squircle edges at 95% opacity"
  // Found design: "White line sweeps on black sides invert to black lines on white, accelerate and grow to cover the sides, then repeat; no lettering."
  // Found prop: "A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes"
  function presentation(card, context) {
    var state = context.state || (context.owned ? 'found' : 'unfound'), rarity = C.rarity(card.rarity);
    if (state !== 'found' && state !== 'unfound') throw new Error('Unknown Secret state: ' + state);
    return { state: state, concealed: state === 'unfound', hideArt: state === 'unfound', hasProp: true, backScramble: true, revealAccent: '#FFFFFF',
      description: state === 'found' ? rarity.foundDescription : rarity.unfoundDescription };
  }
  function surface(card, context) {
    var cfg = C.config.finishMotion.secret, info = presentation(card, context), el = C.finishes.surface('secret', context);
    el.dataset.secretState = info.state;
    var field = C.finishes.element('div', 'finish-secret-lines', el), lines = [];
    for (var j = 0; j < cfg.lineCount; j += 1) {
      var line = C.finishes.element('i', 'finish-secret-line', field);
      line.style.top = ((j + 0.5) / cfg.lineCount * 100) + '%'; line.style.height = cfg.lineHeightPercent + '%'; lines.push(line);
    }
    var prop = C.finishes.surface('secret-prop', context); prop.classList.add('finish-prop');
    var frame = C.finishes.squircle(prop, 'finish-secret-frame'); frame.path.setAttribute('stroke', 'var(--secret-border)'); frame.path.setAttribute('opacity', '0.95');
    (context.propElement || el).appendChild(prop);
    return { el: el, prop: prop, lines: lines, found: info.state === 'found', time: 0, phase: 'sweep' };
  }
  C.finishes.register('secret', {
    previewStates: ['found', 'unfound'], describe: presentation,
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      var cfg = C.config.finishMotion.secret; state.time += dt;
      // Keep the original 1.8 s lead-in and 2.4 s inversion/coverage cadence, without glyphs.
      var elapsed = state.found ? state.time % (cfg.sweepLeadMs + cfg.coverMs) : state.time;
      var covering = state.found && elapsed >= cfg.sweepLeadMs;
      state.phase = covering ? 'cover' : 'sweep';
      state.el.dataset.phase = state.phase; state.prop.dataset.phase = state.phase;
      var age = elapsed - cfg.sweepLeadMs, progress = covering ? age / cfg.coverMs : 0;
      var growth = 1 + progress * progress * (cfg.lineScaleMax - 1);
      // Integrate rising frequency so inversion never jumps discontinuously in speed.
      var sweep = covering ? cfg.sweepHz * age / 1000 +
        (cfg.maxSweepHz - cfg.sweepHz) * age * age / (2 * cfg.coverMs * 1000) : state.time / 1000 * cfg.sweepHz;
      state.lines.forEach(function (line, i) {
        line.style.transform = 'translateX(' + Math.sin(sweep * Math.PI * 2 + i) * cfg.sweepPercent * (1 - progress) + '%) scaleY(' + growth + ')';
      });
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable);
