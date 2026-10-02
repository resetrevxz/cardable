(function (C, root) {
  'use strict';
  var schema = C.settingsSchema, values = schema.normalize(), applying = false, initialized = false;
  var media = root.matchMedia('(prefers-reduced-motion: reduce)');
  function rank(key) { return schema.tiers.indexOf(values[key]); }
  function resolvePolicy() {
    var finish = rank('finishQuality'), reflection = rank('reflectionQuality'), background = rank('backgroundQuality'), animation = rank('animationQuality');
    return { finishHz: [0, 15, 30, 60][finish], glareHz: [0, 15, 30, Infinity][reflection],
      reflection: reflection, prop: rank('propQuality'), animation: animation, ambient: animation >= 2,
      animationHz: [0, 15, 30, 60][animation], dotsHz: [0, 15, 30, 60][background], background: background,
      rippleLimit: [0, 1, 2, 3][background], particles: [0, 0.15, 0.5, 1][rank('particleQuality')],
      blur: [0, 0, 0.6, 1][rank('glassQuality')], layers: reflection < 2 ? 7 : 10,
      shadows: [0, 1, 2, 3][rank('shadowQuality')], trail: background >= 2,
      dpr: [1, 1.25, 1.5, 2][rank('canvasQuality')] };
  }
  var policy = resolvePolicy();
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
    var before = values; values = next; policy = resolvePolicy();
    Object.keys(schema.entries).forEach(function (key) { if (force || before[key] !== next[key]) apply(key, next[key]); });
  }
  function replace(next) {
    next = schema.normalize(next); var before = values; values = next; policy = resolvePolicy();
    C.state.current.settings = next;
    Object.keys(schema.entries).forEach(function (key) { if (before[key] !== next[key]) apply(key, next[key]); });
    C.state.save(); C.events.emit('settings:persisted', { saved: C.state.persistenceAvailable });
    return C.state.persistenceAvailable;
  }
  C.settings = {
    get: function (key) { return values[key]; },
    get snapshot() { return Object.assign({}, values); },
    get saved() { return C.state.persistenceAvailable; },
    get policy() { return policy; },
    get customized() { return schema.graphicsKeys.some(function (key) { return values[key] !== values.quality; }); },
    applyPreset: function (tier) {
      if (!C.state.current || schema.tiers.indexOf(tier) === -1) return false;
      var next = Object.assign({}, values, { quality: tier });
      schema.graphicsKeys.forEach(function (key) { next[key] = tier; });
      return replace(next);
    },
    get holdKey() { return values.openKey === 'enter' ? 'Enter' : 'Space'; },
    get actionKey() { return values.openKey === 'enter' ? 'Space' : 'Enter'; },
    get idleMs() { return values.idleFade === 'never' ? Infinity : Number(values.idleFade) * 1000; },
    get tiltPolicy() { return { cap: policy.animation === 0 ? 0 : Math.min(policy.animation === 1 ? 8 : 18, { low: 8, normal: 14, high: 18 }[values.tilt]), stiffness: { low: 0.8, normal: 1, high: 1.15 }[values.tilt] }; },
    get cutPolicy() { var easy = values.cutAssist === 'easy'; return { span: easy ? 0.6 : C.config.cut.autoFinishSpan, tolerance: easy ? 1.5 : 1, smoothing: easy ? 2 : 1 }; },
    revealTiming: function (reveal, tier, duplicate) {
      var fast = values.revealSpeed === 'fast', floor = tier === 10 || tier === 11 ? 0.6 : 0;
      return { riseMs: reveal.riseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1),
        preFlipPauseMs: reveal.preFlipPauseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.5) : 1),
        flipMs: reveal.flipMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1) };
    },
    dotsPolicy: function () {
      var subtle = values.dots === 'subtle', base = C.config.dots;
      return Object.assign({}, base, { enabled: values.dots !== 'off' && policy.background > 0,
        spacing: base.spacing * (policy.background === 1 ? 1.5 : 1),
        maxAlpha: base.maxAlpha * (subtle ? 0.5 : 1) * (policy.background === 1 ? 0.7 : 1), influenceRadius: base.influenceRadius * (subtle ? 0.8 : 1),
        lean: subtle || policy.background < 2 ? 0 : base.lean, trail: !subtle && policy.trail,
        ripple: Object.assign({}, base.ripple, { peakAlpha: base.ripple.peakAlpha * (subtle ? 0.5 : 1), maxSimultaneous: policy.rippleLimit }) });
    },
    set: function (key, value) {
      if (!schema.entries[key] || !C.state.current) return false;
      if (key === 'quality') return C.settings.applyPreset(schema.validate(key, value));
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
