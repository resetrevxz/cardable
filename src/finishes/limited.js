(function (C) {
  'use strict';
  // Design: "A purple color with animated white shining coming from the top with slowly boosting down and up (the white)"
  // Prop: "A glowing crimson red border which makes the logo feel like it's flying."
  function decorate(base, context) {
    base.el.classList.add('finish-limited');
    var prop = C.finishes.surface('limited-prop', context); prop.classList.add('finish-prop');
    C.finishes.element('div', 'finish-limited-border', prop);
    var logo = C.finishes.svg('svg', { viewBox: '0 0 160 50', class: 'finish-limited-logo', 'aria-hidden': 'true' }, prop);
    logo.style.transform = 'translateY(' + -C.config.finishMotion.limited.floatPx + 'px)';
    C.finishes.svg('path', { d: 'M36 14C32 10 26 10 23 12C15 15 13 20 13 25C13 34 19 40 27 40C31 40 34 39 37 36', fill: 'none', stroke: 'var(--highlight)', 'stroke-width': 3, 'stroke-linecap': 'round' }, logo);
    var word = C.finishes.svg('text', { x: 48, y: 32, class: 'finish-limited-wordmark' }, logo); word.textContent = 'cardable';
    (context.propElement || base.el).appendChild(prop);
    return { el: base.el, prop: prop, logo: logo, base: base, time: 0 };
  }
  C.finishes.register('limited', {
    describe: function (card) {
      var rarity = C.rarity(card.rarity), raw = rarity.availableUntil, until = raw == null ? NaN : typeof raw === 'number' ? raw : Date.parse(raw);
      var date = Number.isFinite(until) ? new Date(until).toISOString().slice(0, 10) : '<date>';
      var template = Number.isFinite(until) && until < Date.now() ? rarity.unavailableDescription : rarity.availableDescription;
      return { description: template.replace('<date>', date) };
    },
    mount: function (element, card, context) {
      var base = C.finishes.registry.unusual.mount(element, card, context); return decorate(base, context);
    },
    update: function (dt, pointer, state) {
      C.finishes.registry.unusual.update(dt, pointer, state.base); state.time += dt;
      var cfg = C.config.finishMotion.limited;
      state.logo.style.transform = 'translate(' + ((pointer.x == null ? 0.5 : pointer.x) - 0.5) * cfg.parallaxPx + 'px,' + (-cfg.floatPx + Math.sin(state.time / cfg.floatCycleMs * Math.PI * 2) * cfg.floatPx) + 'px)';
      return true;
    },
    destroy: function (state) { state.prop.remove(); C.finishes.registry.unusual.destroy(state.base); },
    lite: function (card, context) { return decorate({ el: C.finishes.registry.unusual.lite(card, context) }, context).el; }
  });
})(window.Cardable);
