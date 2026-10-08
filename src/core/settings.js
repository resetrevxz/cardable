(function (C, root) {
  'use strict';
  var schema = C.settingsSchema, values = schema.normalize(), applying = false, initialized = false;
  var overrides = Object.create(null), batterySaving = false;
  function effective(key) { var value = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : values[key]; if(batterySaving && (key === 'quality' || schema.graphicsKeys.includes(key))) value=schema.tiers[Math.max(0,schema.tiers.indexOf(value)-1)];return C.quality&&(key==='quality'||schema.graphicsKeys.includes(key))?C.quality.effective(value):value; }
  var media = root.matchMedia('(prefers-reduced-motion: reduce)');
  function rank(key) { return schema.tiers.indexOf(effective(key)); }
  function budget(key){return C.quality.resolve(schema.tiers[rank(key)]);}
  function resolvePolicy() {
    var finish = rank('finishQuality'), reflection = rank('reflectionQuality'), background = rank('backgroundQuality'), animation = rank('animationQuality');
    return { finishHz: [0, 15, 30, 60, 60][finish], glareHz: [0, 15, 30, Infinity, Infinity][reflection],
      reflection: reflection, prop: rank('propQuality'), animation: animation, ambient: animation >= 2,
      animationHz: [0, 15, 30, 60, 60][animation], dotsHz: [0, 15, 30, 60, 60][background], background: background,
      rippleLimit: [0, 1, 2, 3, 4][background], particles: budget('particleQuality').particles,
      blur: budget('glassQuality').glass, layers: reflection < 2 ? 7 : 10,
      shadows: [0, 1, 2, 3, 4][rank('shadowQuality')], trail: background >= 2,
      dpr: Math.min(batterySaving ? 1 : 2.5, budget('canvasQuality').canvasDpr) * (effective('resolutionScale') || 1) };
  }
  var policy = resolvePolicy();
  function attribute(key, value) { root.document.documentElement.setAttribute('data-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }), String(value)); }
  function resolveMotion() {
    var reduced = effective('motion') === 'on' || effective('motion') === 'auto' && media.matches;
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
    Object.keys(schema.entries).forEach(function (key) { if (force || before[key] !== next[key]) apply(key, effective(key)); });
  }
  function replace(next) {
    next = schema.normalize(next); var before = values; values = next; policy = resolvePolicy();
    C.state.current.settings = next;
    Object.keys(schema.entries).forEach(function (key) { if (before[key] !== next[key]) apply(key, effective(key)); });
    C.state.save(); C.events.emit('settings:persisted', { saved: C.state.persistenceAvailable });
    return C.state.persistenceAvailable;
  }
  C.settings = {
    get batterySaving() { return batterySaving; },
    setBatterySaver: function (active) { active = !!active; if (active === batterySaving) return; batterySaving = active; policy = resolvePolicy(); ['quality'].concat(schema.graphicsKeys).forEach(function(key){apply(key,effective(key));}); },
    get: function (key) { return effective(key); },
    get snapshot() { return Object.assign({}, values); },
    get saved() { return C.state.persistenceAvailable; },
    get policy() { return policy; },
    refreshQuality: function(){policy=resolvePolicy();['quality'].concat(schema.graphicsKeys).forEach(function(key){apply(key,effective(key));});},
    get customized() { return schema.graphicsKeys.some(function (key) { return values[key] !== values.quality; }); },
    applyPreset: function (tier) {
      if (!C.state.current || schema.tiers.indexOf(tier) === -1 || tier==='very-high'&&!C.quality.availability().available) return false;
      var next = Object.assign({}, values, { quality: tier });
      schema.graphicsKeys.forEach(function (key) { next[key] = tier; });
      return replace(next);
    },
    get holdKey() { return values.openKey === 'enter' ? 'Enter' : 'Space'; },
    get actionKey() { return values.openKey === 'enter' ? 'Space' : 'Enter'; },
    get idleMs() { return values.visibleIdleFade===false||values.idleFade === 'never' ? Infinity : Number(values.idleFade) * 1000; },
    get tiltPolicy() { return { cap: policy.animation === 0 ? 0 : Math.min(policy.animation === 1 ? 8 : 18, { low: 8, normal: 14, high: 18 }[values.tilt]) * values.tiltStrength / 100, stiffness: { low: 0.8, normal: 1, high: 1.15 }[values.tilt] }; },
    get holdMs() { return {normal:3000,short:2000,quick:1000}[values.holdDuration] || C.config.hold.chargeMs; },
    get cutPolicy() { var easy = values.cutAssist === 'easy'; return { span: easy ? 0.6 : C.config.cut.autoFinishSpan, tolerance: easy ? 1.5 : 1, smoothing: easy ? 2 : 1 }; },
    revealTiming: function (reveal, tier, duplicate) {
      var fast = values.revealSpeed === 'fast', floor = tier === 10 || tier === 11 ? 0.6 : 0;
      return { riseMs: reveal.riseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1),
        preFlipPauseMs: reveal.preFlipPauseMs * (duplicate || 1) * (fast ? Math.max(floor, 0.5) : 1),
        flipMs: reveal.flipMs * (duplicate || 1) * (fast ? Math.max(floor, 0.7) : 1) };
    },
    dotsPolicy: function () {
      var subtle = effective('dots') === 'subtle', base = C.config.dots;
      return Object.assign({}, base, { enabled: effective('visibleDots')!==false && effective('dots') !== 'off' && policy.background > 0,
        spacing: base.spacing * (policy.background === 4 ? .92 : policy.background === 1 ? 1.5 : 1),
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
    withPolicy: function (tier, fn) {
      if (!tier || schema.tiers.indexOf(tier) < 0) return fn();
      var before = overrides, beforePolicy = policy;
      overrides = Object.assign({}, overrides); overrides.quality = tier;
      schema.graphicsKeys.forEach(function (key) { overrides[key] = tier; }); policy = resolvePolicy();
      try { return fn(); } finally { overrides = before; policy = beforePolicy; }
    },
    policyFor: function (tier) { return C.settings.withPolicy(tier, function () { return Object.assign({}, policy); }); },
    override: function (key, value) {
      if (!schema.entries[key]) return;
      if (value === undefined) delete overrides[key]; else overrides[key] = schema.validate(key, value);
      policy = resolvePolicy(); apply(key, effective(key));
    },
    clearOverrides: function () {
      var keys = Object.keys(overrides); overrides = Object.create(null); policy = resolvePolicy();
      keys.forEach(function (key) { apply(key, effective(key)); });
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
