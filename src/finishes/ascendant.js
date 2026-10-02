(function (C) {
  'use strict';
  // Design: "A white colored shifting pastel RGB colors on all side with random faded splashes happening every 2-3 seconds for 1 second fade in and out."
  // Prop: "A outside square with small squircle edges which shines and shifts colors like a aurora but with pastel colors"
  function surface(card, context, lite) {
    var cfg = C.config.finishMotion.ascendant, element = C.finishes.surface('ascendant', context);
    var sides=C.finishes.element('div', 'finish-ascendant-sides', element), field=C.finishes.element('canvas', '', sides);
    field.width=240;field.height=360;var seed=String(context.instance?context.instance.serial:card.art.seed);
    C.ascendantBackground.draw(field.getContext('2d'),240,360,0,seed);
    var splash = C.finishes.element('div', 'finish-ascendant-splash', element); splash.style.opacity = lite ? 0.16 : 0;
    var prop = C.finishes.surface('ascendant-prop', context); prop.classList.add('finish-prop');
    var frame = C.finishes.squircle(prop, 'finish-ascendant-frame'), gradientId = C.finishes.uid('aurora');
    var gradient = C.finishes.svg('linearGradient', { id: gradientId, x2: '100%', y2: '100%' }, frame.defs);
    ['var(--aurora-1)', 'var(--aurora-2)', 'var(--aurora-3)', 'var(--aurora-1)'].forEach(function (color, i) {
      C.finishes.svg('stop', { offset: i / 3, 'stop-color': color }, gradient);
    });
    frame.path.setAttribute('stroke', 'url(#' + gradientId + ')');
    (context.propElement || element).appendChild(prop);
    splash.hidden=true; var random = C.art.random(card.art.seed + 10);
    return { el: element, field:field, seed:seed, fieldAt:0, prop: prop, splash: splash, random: random, time: 0, birth: null,
      nextAt: cfg.splashMinDelayMs + random() * (cfg.splashMaxDelayMs - cfg.splashMinDelayMs) };
  }
  C.finishes.register('ascendant', {
    drawBackground: C.ascendantBackground.draw,
    mount: function (element, card, context) { var state = surface(card, context, false); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time += dt;
      if (state.time-state.fieldAt>=100) { state.fieldAt=state.time; C.ascendantBackground.draw(state.field.getContext('2d'),240,360,C.ascendantBackground.sampleTime(state.seed,state.time/1000),state.seed); }
      var cfg = C.config.finishMotion.ascendant, phase = state.time / cfg.auroraCycleMs * Math.PI * 2;
      state.el.style.setProperty('--asc-angle', (state.time / cfg.auroraCycleMs * 360 % 360) + 'deg');
      if (C.finishes.propDue(state, dt)) for (var i = 1; i <= 3; i += 1) {
        state.prop.style.setProperty('--aurora-color-' + i, 'hsl(' + ((i - 1) * 120 + Math.sin(phase) * 35) + ' 75% 86%)');
        state.prop.style.setProperty('--aurora-mono-' + i, 'hsl(0 0% ' + (80 + Math.sin(phase + i * 2) * 12) + '%)');
      }
      if (C.settings.policy.particles > 0 && state.time >= state.nextAt) {
        state.birth = state.nextAt;
        var side = Math.floor(state.random() * 4), along = 8 + state.random() * 84;
        state.splash.style.setProperty('--splash-x', (side < 2 ? side * 100 : along) + '%');
        state.splash.style.setProperty('--splash-y', (side >= 2 ? (side - 2) * 100 : along) + '%');
        state.splash.style.setProperty('--splash-color', 'hsl(' + state.random() * 360 + ' 70% 82%)');
        state.nextAt += cfg.splashMinDelayMs + state.random() * (cfg.splashMaxDelayMs - cfg.splashMinDelayMs);
      }
      var progress = state.birth === null ? 1 : Math.min(1, (state.time - state.birth) / cfg.splashMs);
      state.splash.style.opacity = !C.settings.policy.particles || progress >= 1 ? 0 : Math.sin(progress * Math.PI) * cfg.splashOpacity;
      // Expand the splash around its edge anchor; scaling the full surface would move it behind the artwork.
      state.splash.style.setProperty('--splash-spread', (12 + progress * 24) + '%');
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context, true).el; }
  });
})(window.Cardable);
