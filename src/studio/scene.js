(function (C) {
  'use strict';
  // Pure scene data is available before save loading; no renderer starts here.
  var tiers = { high: { lights: 8, props: 40, texture: 2048 }, medium: { lights: 4, props: 25, texture: 1536 }, low: { lights: 2, props: 12, texture: 1024 }, 'very-low': { lights: 1, props: 0, texture: 768 } };
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback, low, high) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback; }
  function vector(value, fallback, low, high) { return fallback.map(function (n, i) { return number(Array.isArray(value) ? value[i] : null, n, low, high); }); }
  function defaults(instance, pose) {
    pose = pose || {};
    return { version: 1, card: { side: pose.side === 'back' ? 'back' : 'front', tilt: [pose.x || 0, pose.y || 0], plate: true,
      source: instance ? { cardId: instance.cardId, instanceId: instance.instanceId, serial: instance.serial, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, packId: instance.packId || 'standard', pulledAt: instance.pulledAt } : null },
      lights: [{ id: 'key', type: 'point', position: [-2.2, 3.2, 4], color: [1, 1, 1], intensity: 1.4, visible: true, locked: true }], props: [],
      camera: { yaw: 0, pitch: 0, distance: 3, fov: 35, target: [0, 0, 0], roll: 0 }, backdrop: { color: [0.035, 0.035, 0.045] }, keyframes: [], post: {} };
  }
  function parse(value) {
    if (typeof value === 'string') value = JSON.parse(value);
    if (!value || value.version !== 1) throw new Error('Unsupported studio scene version.');
    var scene = defaults(value.card && value.card.source), card = value.card || {}, camera = value.camera || {};
    scene.card.side = card.side === 'back' ? 'back' : 'front'; scene.card.tilt = vector(card.tilt, [0, 0], -180, 180); scene.card.plate = card.plate !== false;
    if (card.source) { var source = card.source; scene.card.source = { cardId: String(source.cardId || '').slice(0, 120), instanceId: String(source.instanceId || '').slice(0, 120), serial: String(source.serial || '').slice(0, 120), variantId: typeof source.variantId === 'string' ? source.variantId.slice(0, 80) : null, cardSkinId: typeof source.cardSkinId === 'string' ? source.cardSkinId.slice(0, 80) : null, packId: String(source.packId || 'standard').slice(0, 80), pulledAt: number(source.pulledAt, 0, 0, 8640000000000000) }; }
    scene.camera = { yaw: number(camera.yaw, 0, -Math.PI * 20, Math.PI * 20), pitch: number(camera.pitch, 0, -1.35, 1.35), distance: number(camera.distance, 3, 1.3, 9), fov: number(camera.fov, 35, 15, 90), target: vector(camera.target, [0, 0, 0], -10, 10), roll: number(camera.roll, 0, -Math.PI, Math.PI) };
    scene.backdrop.color = vector(value.backdrop && value.backdrop.color, scene.backdrop.color, 0, 1);
    scene.lights = (Array.isArray(value.lights) ? value.lights : scene.lights).slice(0, 8).map(function (light, index) { light = light || {}; return { id: String(light.id || 'light-' + index).slice(0, 80), type: ['point', 'spot', 'directional', 'area', 'strip', 'ambient'].indexOf(light.type) >= 0 ? light.type : 'point', position: vector(light.position, [-2.2, 3.2, 4], -100, 100), color: vector(light.color, [1, 1, 1], 0, 1), intensity: number(light.intensity, 1.4, 0, 20), visible: light.visible !== false, locked: light.locked !== false }; });
    // Milestone A accepts only its implemented scene data. Later modules extend
    // this parser alongside their object definitions, rather than trusting JSON.
    return scene;
  }
  function store(value) {
    var result = { slots: [], last: {} };
    if (!value || typeof value !== 'object') return result;
    Object.keys(value.last || {}).forEach(function (id) { if (id === '__proto__' || id === 'constructor' || id === 'prototype') return; try { result.last[id] = parse(value.last[id]); } catch (_) { /* An invalid scene never invalidates gameplay progress. */ } });
    return result;
  }
  C.studioScenes = { tiers: tiers, clone: clone, defaults: defaults, parse: parse, serialize: function (scene) { return JSON.stringify(parse(scene)); }, normalize: store,
    limits: function (tier) { return tiers[tier] || tiers.medium; },
    effective: function (scene, tier) { var result = clone(scene), limit = this.limits(tier); result.lights = result.lights.slice(0, limit.lights); result.props = result.props.slice(0, limit.props); return result; },
    last: function (instance) { var saved = C.state.current.studio; try { return saved && saved.last && saved.last[instance.instanceId] ? parse(saved.last[instance.instanceId]) : null; } catch (_) { return null; } },
    saveLast: function (instance, scene) { var saved = C.state.current.studio || (C.state.current.studio = { slots: [], last: {} }); if (!saved.last) saved.last = {}; saved.last[instance.instanceId] = parse(scene); C.state.save(); }
  };
})(window.Cardable);
