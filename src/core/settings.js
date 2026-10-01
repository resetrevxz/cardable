(function (C, root) {
  'use strict';
  var schema = C.settingsSchema, values = schema.normalize(), applying = false, initialized = false;
  var media = root.matchMedia('(prefers-reduced-motion: reduce)');
  var policies = {
    high: { finishHz: 60, glareHz: 60, rippleLimit: 3, particles: 1, blur: 1, layers: 10, shadows: 3, trail: true },
    medium: { finishHz: 30, glareHz: 30, rippleLimit: 2, particles: 0.5, blur: 0.6, layers: 10, shadows: 2, trail: true },
    low: { finishHz: 15, glareHz: 15, rippleLimit: 1, particles: 0.15, blur: 0.3, layers: 7, shadows: 1, trail: false }
  };
  function attribute(key, value) { root.document.documentElement.setAttribute('data-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }), String(value)); }
  function resolveMotion() {
    var reduced = values.motion === 'on' || values.motion === 'auto' && media.matches;
    if (!C.motion) return;
    var changed = C.motion.reduced !== reduced;
    C.motion.reduced = reduced; root.document.documentElement.classList.toggle('reduced-motion', reduced);
    if (changed) C.events.emit('motion:changed', reduced);
    if (C.fx) C.fx.wake();
  }
  function apply(key, value) {
    schema.entries[key].apply(value, { attribute: attribute });
    if (key === 'motion') resolveMotion();
    if (key === 'rarityColor') {
      applying = true; C.config.rarityColorMode = value;
      try { C.events.emit('settings:rarityColorMode', value); } finally { applying = false; }
    }
    C.events.emit('settings:changed', { key: key, value: value });
    if (C.fx) C.fx.wake();
  }
  function reread(force) {
    var next = schema.normalize(C.state.current && C.state.current.settings);
    if (C.state.current) C.state.current.settings = next;
    var before = values; values = next;
    Object.keys(schema.entries).forEach(function (key) { if (force || before[key] !== next[key]) apply(key, next[key]); });
  }
  function replace(next) {
    next = schema.normalize(next); var before = values; values = next;
    C.state.current.settings = next;
    Object.keys(schema.entries).forEach(function (key) { if (before[key] !== next[key]) apply(key, next[key]); });
    C.state.save(); C.events.emit('settings:persisted', { saved: C.state.persistenceAvailable });
    return C.state.persistenceAvailable;
  }
  C.settings = {
    get: function (key) { return values[key]; },
    get snapshot() { return Object.assign({}, values); },
    get saved() { return C.state.persistenceAvailable; },
    get policy() { return policies[values.quality]; },
    get holdKey() { return values.openKey === 'enter' ? 'Enter' : 'Space'; },
    get actionKey() { return values.openKey === 'enter' ? 'Space' : 'Enter'; },
    get idleMs() { return values.idleFade === 'never' ? Infinity : Number(values.idleFade) * 1000; },
    get tiltPolicy() { return { cap: { low: 8, normal: 14, high: 18 }[values.tilt], stiffness: { low: 0.8, normal: 1, high: 1.15 }[values.tilt] }; },
    get cutPolicy() { var easy = values.cutAssist === 'easy'; return { span: easy ? 0.6 : C.config.cut.autoFinishSpan, tolerance: easy ? 1.5 : 1, smoothing: easy ? 2 : 1 }; },
    revealTiming: function (reveal, tier, duplicate) {
      var fast = values.revealSpeed === 'fast', floor = tier === 10 || tier === 11 ? 0.6 : 0;
      return { riseMs: reveal.riseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1),
        preFlipPauseMs: reveal.preFlipPauseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.5) : 1),
        flipMs: reveal.flipMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1) };
    },
    dotsPolicy: function () {
      var subtle = values.dots === 'subtle', base = C.config.dots;
      return Object.assign({}, base, { maxAlpha: base.maxAlpha * (subtle ? 0.5 : 1), influenceRadius: base.influenceRadius * (subtle ? 0.8 : 1),
        lean: subtle ? 0 : base.lean, trail: !subtle && policies[values.quality].trail,
        ripple: Object.assign({}, base.ripple, { peakAlpha: base.ripple.peakAlpha * (subtle ? 0.5 : 1), maxSimultaneous: policies[values.quality].rippleLimit }) });
    },
    set: function (key, value) {
      if (!schema.entries[key] || !C.state.current) return false;
      var next = Object.assign({}, values); next[key] = schema.validate(key, value);
      if (next[key] === values[key]) return C.state.persistenceAvailable;
      return replace(next);
    },
    restore: replace,
    resetToDefaults: function () { return replace(schema.normalize()); },
    onChange: function (key, fn) { return C.events.on('settings:changed', function (event) { if (key === '*' || event.key === key) fn(event.value, event.key); }); },
    init: function () { if (initialized) return; initialized = true; reread(true); },
    applyMotion: resolveMotion
  };
  C.events.on('save:written', function () { if (initialized) reread(false); });
  C.events.on('save:replaced', function () { if (initialized) reread(true); });
  C.events.on('settings:rarityColorMode', function (value) { if (!applying && initialized) C.settings.set('rarityColor', value); });
  if (media.addEventListener) media.addEventListener('change', resolveMotion); else media.addListener(resolveMotion);
})(window.Cardable, window);
