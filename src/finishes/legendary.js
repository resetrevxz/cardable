(function (C) {
  'use strict';
  // Design: "A golden color with sparkles, tip sparks, and in the middle part a different waving line which fades colors from light yellow-gold to a red-maroon colors, the red maroon color has a checkerbox pattern in it"
  // Prop: "A gold crown (with sparkles and sparks) with red, blue and green gemstones with red having a hexagonal rotating glow, the blue being a mythril like non-animated white-ish texture, and the green having a extremely shiny outline"
  function band(parent) {
    var svg = C.finishes.svg('svg', { viewBox: '0 0 400 160', preserveAspectRatio: 'none', class: 'finish-legendary-band', 'aria-hidden': 'true' }, parent);
    var defs = C.finishes.svg('defs', {}, svg), clipId = C.finishes.uid('wave'), gradientId = C.finishes.uid('wave-color');
    var patternId = C.finishes.uid('maroon-checker'), maskId = C.finishes.uid('maroon-mask'), fadeId = C.finishes.uid('maroon-fade');
    var clip = C.finishes.svg('clipPath', { id: clipId }, defs);
    C.finishes.svg('path', { d: 'M-20 35C60 -10 135 85 210 45S330 5 420 50V115C320 65 275 145 200 115S60 70 -20 100Z' }, clip);
    var gradient = C.finishes.svg('linearGradient', { id: gradientId }, defs);
    [[0, 'var(--legendary-light)'], [45, 'var(--legendary-gold)'], [100, 'var(--legendary-maroon)']].forEach(function (stop) {
      C.finishes.svg('stop', { offset: stop[0] + '%', 'stop-color': stop[1] }, gradient);
    });
    var pattern = C.finishes.svg('pattern', { id: patternId, width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
    C.finishes.svg('path', { d: 'M0 0H8V8H0ZM8 8H16V16H8Z', fill: 'var(--legendary-checker)' }, pattern);
    var fade = C.finishes.svg('linearGradient', { id: fadeId }, defs);
    C.finishes.svg('stop', { offset: '55%', 'stop-color': '#000' }, fade); C.finishes.svg('stop', { offset: '88%', 'stop-color': '#fff' }, fade);
    var mask = C.finishes.svg('mask', { id: maskId }, defs);
    C.finishes.svg('rect', { width: 400, height: 160, fill: 'url(#' + fadeId + ')' }, mask);
    var wave = C.finishes.svg('g', { 'clip-path': 'url(#' + clipId + ')' }, svg);
    C.finishes.svg('rect', { width: 400, height: 160, fill: 'url(#' + gradientId + ')' }, wave);
    C.finishes.svg('rect', { width: 400, height: 160, fill: 'url(#' + patternId + ')', mask: 'url(#' + maskId + ')', opacity: 0.38 }, wave);
    return svg;
  }
  function crown(parent) {
    var svg = C.finishes.svg('svg', { viewBox: '0 0 120 70', class: 'finish-legendary-crown', 'aria-hidden': 'true' }, parent);
    var defs = C.finishes.svg('defs', {}, svg), metalId = C.finishes.uid('crown-metal'), blueId = C.finishes.uid('mythril');
    var gradient = C.finishes.svg('linearGradient', { id: metalId, x2: '25%', y2: '100%' }, defs);
    [[0, 'var(--legendary-light)'], [42, 'var(--legendary-gold)'], [70, 'var(--crown-shadow)'], [100, 'var(--legendary-light)']].forEach(function (stop) {
      C.finishes.svg('stop', { offset: stop[0] + '%', 'stop-color': stop[1] }, gradient);
    });
    C.finishes.svg('path', { d: 'M15 56L7 14L32 33L60 4L88 33L113 14L105 56ZM15 56H105V64H15Z', fill: 'url(#' + metalId + ')', stroke: 'var(--crown-shadow)', 'stroke-width': 2 }, svg);
    var redGlow = C.finishes.svg('polygon', { points: '24,35 34,29 44,35 44,47 34,53 24,47', class: 'crown-red-glow', fill: 'none', stroke: 'var(--gem-red)', 'stroke-width': 3 }, svg);
    C.finishes.svg('polygon', { points: '27,37 34,33 41,37 41,45 34,49 27,45', class: 'crown-red-gem', fill: 'var(--gem-red)', stroke: 'var(--highlight)', 'stroke-width': 0.6 }, svg);
    var bluePath = 'M60 31L70 41L60 51L50 41Z';
    C.finishes.svg('path', { d: bluePath, class: 'crown-blue-gem', fill: 'var(--gem-blue)', stroke: 'var(--highlight)', 'stroke-width': 1 }, svg);
    var clip = C.finishes.svg('clipPath', { id: blueId }, defs); C.finishes.svg('path', { d: bluePath }, clip);
    var mythril = C.finishes.svg('g', { 'clip-path': 'url(#' + blueId + ')', class: 'crown-mythril' }, svg);
    C.finishes.svg('path', { d: 'M48 36L70 43M48 40L70 47M54 31L65 51', stroke: 'var(--highlight)', 'stroke-width': 1, opacity: 0.75 }, mythril);
    C.finishes.svg('path', { d: 'M86 32L95 41L86 50L77 41Z', class: 'crown-green-gem', fill: 'var(--gem-green)', stroke: 'var(--gem-green-edge)', 'stroke-width': 2 }, svg);
    return redGlow;
  }
  function surface(card, context) {
    var cfg = C.config.finishMotion.legendary, element = C.finishes.surface('legendary', context);
    var prop = C.finishes.surface('legendary-prop', context); prop.classList.add('finish-prop');
    var wave = band(element), redGlow = crown(prop);
    var stars = C.finishes.sparkles(element, cfg.sparkleCount, card.art.seed, { x: 4, y: 4, width: 92, height: 89 });
    stars.forEach(function (star, i) {
      var side = i % 4, along = 6 + parseFloat(star.el.style.left) * 0.88;
      star.el.style.left = (side === 0 ? 1.3 : side === 1 ? 98.7 : along) + '%';
      star.el.style.top = (side === 2 ? 1 : side === 3 ? 99 : along) + '%';
    });
    var crownStars = C.finishes.sparkles(prop, cfg.crownSparkleCount, card.art.seed + 17, { x: 35, y: -10, width: 30, height: 12 });
    var sparks = [];
    [[1,1],[99,1],[1,99],[99,99],[35,-4],[50,-12],[65,-4]].forEach(function (position, i) {
      if (i >= Math.ceil(7 * C.settings.policy.particles)) return;
      var spark = C.finishes.element('i', 'finish-tip-spark', prop); spark.style.left = position[0] + '%'; spark.style.top = position[1] + '%';
      sparks.push({ el: spark, phase: i * 0.83 });
    });
    (context.propElement || element).appendChild(prop);
    return { el: element, prop: prop, wave: wave, redGlow: redGlow, stars: stars.concat(crownStars), sparks: sparks, time: 0 };
  }
  C.finishes.register('legendary', {
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      var cfg = C.config.finishMotion.legendary, seconds = state.time / 1000;
      state.wave.style.transform = 'translateY(' + Math.sin(state.time / cfg.waveCycleMs * Math.PI * 2) * cfg.waveTravelPercent + '%)';
      var propDue = C.finishes.propDue(state, dt);
      if (propDue) state.redGlow.setAttribute('transform', 'rotate(' + (state.time / cfg.gemCycleMs * 360 % 360) + ' 34 41)');
      C.finishes.twinkle(state.stars, seconds, cfg.sparkleSpeed);
      state.sparks.forEach(function (spark) {
        if (!propDue) return;
        var phase = (seconds * cfg.tipSparkSpeed + spark.phase) % 1;
        spark.el.style.opacity = Math.pow(Math.sin(phase * Math.PI), 3);
        spark.el.style.transform = 'translateY(' + (-phase * cfg.tipSparkTravelPx) + 'px) scale(' + (1 - phase * 0.6) + ')';
      });
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context).el; }
  });
})(window.Cardable);
