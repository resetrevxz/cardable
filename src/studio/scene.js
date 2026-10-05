(function (C) {
  'use strict';
  // Pure scene data is available before save loading; no renderer starts here.
  var tiers = { high: { lights: 8, props: 40, texture: 2048 }, medium: { lights: 4, props: 25, texture: 1536 }, low: { lights: 2, props: 12, texture: 1024 }, 'very-low': { lights: 1, props: 0, texture: 768 } };
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback, low, high) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback; }
  function vector(value, fallback, low, high) { return fallback.map(function (n, i) { return number(Array.isArray(value) ? value[i] : null, n, low, high); }); }
  var catalog = {
    stage: [['floor','Floor'],['backdrop','Seamless backdrop'],['plinth-square','Square plinth'],['plinth-round','Round plinth'],['easel','Display easel'],['glass-case','Glass case'],['turntable','Turntable'],['grid-floor','Grid floor']],
    fixtures: [['softbox','Softbox'],['ring-light','Ring light'],['neon-tube','Neon tube'],['spotlight-can','Spotlight can'],['led-strip','LED strip']],
    effects: [['haze','Haze / volumetric fog'],['dust','Dust motes'],['sparks','Sparks'],['confetti','Confetti'],['snow','Snow'],['rain','Rain'],['fireflies','Fireflies'],['smoke','Smoke'],['lens-flare','Lens flare']],
    hardware: [['fan','Fan'],['heatsink','Heatsink block'],['cables','Cable bundle'],['pcie-bracket','PCIe bracket'],['rgb-strip','RGB strip'],['screw','Screw'],['standoff','Standoff']],
    decor: [['crown','Crown'],['trophy','Trophy cup'],['laurel','Laurel ribbon'],['plant','Plant'],['pack','Cardable pack'],['collection','Collection cards']]
  }, propTypes = [].concat.apply([], Object.keys(catalog).map(function (k) { return catalog[k].map(function (v) { return v[0]; }); }));
  function prop(value, index) {
    value = value || {}; var type = choice(value.type, propTypes, 'plinth-square');
    return { id: String(value.id || 'prop-' + (index || 0)).slice(0,80), type: type,
      name: String(value.name || [].concat.apply([], Object.keys(catalog).map(function (k) { return catalog[k]; })).find(function (p) { return p[0] === type; })[1]).slice(0,60),
      position: vector(value.position, [1,-.4,0],-20,20), rotation: vector(value.rotation,[0,0,0],-180,180), scale: vector(value.scale,[1,1,1],.05,6),
      color: vector(value.color,[.45,.47,.5],0,1), material: choice(value.material,['matte','gloss','metal','emissive'],'matte'),
      castShadow: value.castShadow !== false, animation: choice(value.animation,['none','spin','float'],'none'), speed: number(value.speed,.5,.1,3),
      visible: value.visible !== false, locked: value.locked === true, text: String(value.text || 'CARDABLE').slice(0,12),
      surface: choice(value.surface,['matte','glossy','mirror'],'matte'), gradient: vector(value.gradient,[.015,.015,.025],0,1),
      arrangement: choice(value.arrangement,['stack','fan','wall'],'fan'),
      instances: (Array.isArray(value.instances) ? value.instances : []).filter(function (id) { return typeof id === 'string'; }).slice(0,10).map(function (id) { return id.slice(0,120); }),
      packId: String(value.packId || 'standard').slice(0,80), density: number(value.density,.5,.05,1) };
  }
  function defaults(instance, pose) {
    pose = pose || {};
    return { version: 1, card: { side: pose.side === 'back' ? 'back' : 'front', tilt: [pose.x || 0, pose.y || 0], plate: true, visible: true, locked: false,
      source: instance ? { cardId: instance.cardId, instanceId: instance.instanceId, serial: instance.serial, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, packId: instance.packId || 'standard', pulledAt: instance.pulledAt } : null },
      lights: [light({ id: 'key', position: [-2.2, 3.2, 4], intensity: 1.4 })], props: [],
      camera: { yaw: 0, pitch: 0, distance: 3, fov: 35, target: [0, 0, 0], roll: 0, focus: [0, 0, 0], aperture: 0, aspect: 'free', autoFrame: false, lockToCard: false }, backdrop: { color: [0.035, 0.035, 0.045] }, keyframes: [], director: { duration: 8, repeat: 'once', title: false, playhead: 0, preview: true }, post: { exposure: 0, bloom: .12, vignette: .18, grain: 0, aberration: 0, flare: 0, tiltShift: 0 } };
  }
  function choice(value, choices, fallback) { return choices.indexOf(value) >= 0 ? value : fallback; }
  function light(value, index) {
    value = value || {};
    return { id: String(value.id || 'light-' + (index || 0)).slice(0, 80), name: String(value.name || (value.id === 'key' ? 'Key light' : 'Light')).slice(0, 60), type: choice(value.type, ['point', 'spot', 'directional', 'area', 'strip', 'ambient'], 'point'),
      position: vector(value.position, [-1.2, 1.5, 2], -20, 20), rotation: vector(value.rotation, [0, 0, 0], -180, 180), color: vector(value.color, [1, 1, 1], 0, 1), bottom: vector(value.bottom, [.15, .17, .22], 0, 1), intensity: number(value.intensity, 1, 0, 20),
      temperature: value.temperature == null ? null : number(value.temperature, 6500, 1000, 12000),
      size: number(value.size, .4, .02, 4), falloff: number(value.falloff, 2, 0, 4), angle: number(value.angle, 45, 5, 120), softness: number(value.softness, .5, 0, 1), shadows: value.shadows !== false, shadowSoftness: number(value.shadowSoftness, .4, 0, 1),
      gobo: choice(value.gobo, ['none', 'blinds', 'grid', 'leaves', 'stars'], 'none'), animation: choice(value.animation, ['none', 'pulse', 'flicker', 'sweep', 'orbit'], 'none'), speed: number(value.speed, .5, .1, 5), visible: value.visible !== false, locked: value.locked === true };
  }
  function cameraPose(camera) { camera = camera || {}; return { yaw: number(camera.yaw, 0, -Math.PI * 20, Math.PI * 20), pitch: number(camera.pitch, 0, -1.35, 1.35), distance: number(camera.distance, 3, 1.3, 9), fov: number(camera.fov, 35, 15, 90), target: vector(camera.target, [0, 0, 0], -10, 10), roll: number(camera.roll, 0, -Math.PI, Math.PI), focus: vector(camera.focus, [0, 0, 0], -20, 20), aperture: number(camera.aperture, 0, 0, 10), aspect: choice(camera.aspect, ['free', '1:1', '4:5', '16:9', '9:16', 'card'], 'free'), autoFrame: camera.autoFrame === true, lockToCard: camera.lockToCard === true }; }
  function parse(value) {
    if (typeof value === 'string') value = JSON.parse(value);
    if (!value || value.version !== 1) throw new Error('Unsupported studio scene version.');
    var scene = defaults(value.card && value.card.source), card = value.card || {}, camera = value.camera || {};
    scene.card.side = card.side === 'back' ? 'back' : 'front'; scene.card.tilt = vector(card.tilt, [0, 0], -180, 180); scene.card.plate = card.plate !== false; scene.card.visible = card.visible !== false; scene.card.locked = card.locked === true;
    if (card.source) { var source = card.source; scene.card.source = { cardId: String(source.cardId || '').slice(0, 120), instanceId: String(source.instanceId || '').slice(0, 120), serial: String(source.serial || '').slice(0, 120), variantId: typeof source.variantId === 'string' ? source.variantId.slice(0, 80) : null, cardSkinId: typeof source.cardSkinId === 'string' ? source.cardSkinId.slice(0, 80) : null, packId: String(source.packId || 'standard').slice(0, 80), pulledAt: number(source.pulledAt, 0, 0, 8640000000000000) }; }
    scene.camera = cameraPose(camera);
    scene.backdrop.color = vector(value.backdrop && value.backdrop.color, scene.backdrop.color, 0, 1);
    scene.lights = (Array.isArray(value.lights) ? value.lights : scene.lights).slice(0, 8).map(light);
    var ids = new Set(); scene.lights.forEach(function (l, i) { var base = l.id, suffix = i; while (ids.has(l.id)) l.id = base + '-' + suffix++; ids.add(l.id); });
    var post = value.post || {}; scene.post = { exposure: number(post.exposure, 0, -2, 2), bloom: number(post.bloom, .12, 0, 1), vignette: number(post.vignette, .18, 0, 1), grain: number(post.grain, 0, 0, .3), aberration: number(post.aberration, 0, 0, 1), flare: number(post.flare, 0, 0, 1), tiltShift: number(post.tiltShift, 0, 0, 1) };
    scene.props = (Array.isArray(value.props) ? value.props : []).slice(0,40).map(prop);
    var cardsLeft = 10; scene.props.forEach(function (p) { if (p.type === 'collection') { p.instances = p.instances.slice(0,cardsLeft); cardsLeft -= p.instances.length; } });
    scene.props.forEach(function (p,i) { var base=p.id, suffix=i; while(ids.has(p.id)) p.id=base+'-'+suffix++; ids.add(p.id); });
    if(typeof value.presentationTime==='number')scene.presentationTime=number(value.presentationTime,0,0,86400);
    var d = value.director || {}; scene.director = { duration: number(d.duration,8,1,15), repeat: choice(d.repeat,['once','loop','ping-pong'],'once'), title: d.title === true, preview: d.preview !== false, playhead: number(d.playhead,0,0,number(d.duration,8,1,15)) };
    var frameIds = new Set(); scene.keyframes = (Array.isArray(value.keyframes)?value.keyframes:[]).slice(0,96).filter(function(f){return f && (f.track==='camera'||f.track==='light'&&scene.lights.some(function(l){return l.id===f.target;}));}).map(function(f,i){
      var id=String(f.id||'frame-'+i).slice(0,80);while(frameIds.has(id))id+='-'+i;frameIds.add(id);var frame={id:id,time:number(f.time,0,0,scene.director.duration),track:f.track,target:f.track==='camera'?'camera':String(f.target).slice(0,80),easing:choice(f.easing,['linear','ease-in','ease-out','ease-in-out'],'ease-in-out')};
      if(f.track==='camera')frame.camera=cameraPose(f.camera);else{var l=light(f.light);frame.light={position:l.position,intensity:l.intensity,color:l.color};}return frame;
    }).sort(function(a,b){return a.time-b.time||a.id.localeCompare(b.id);});
    return scene;
  }
  function store(value) {
    var result = { slots: [], last: {} };
    if (!value || typeof value !== 'object') return result;
    result.slots = Array.from({length:10},function (_,i) { var slot = Array.isArray(value.slots) && value.slots[i]; if (!slot) return null; try { return { name: String(slot.name || 'Scene '+(i+1)).slice(0,60), thumbnail: typeof slot.thumbnail === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(slot.thumbnail) && slot.thumbnail.length <= 80000 ? slot.thumbnail : '', scene: parse(slot.scene) }; } catch (_) { return null; } });
    Object.keys(value.last || {}).forEach(function (id) { if (id === '__proto__' || id === 'constructor' || id === 'prototype') return; try { result.last[id] = parse(value.last[id]); } catch (_) { /* An invalid scene never invalidates gameplay progress. */ } });
    return result;
  }
  C.studioScenes = { tiers: tiers, clone: clone, defaults: defaults, light: light, prop: prop, catalog: catalog, camera: cameraPose, parse: parse, serialize: function (scene) { return JSON.stringify(parse(scene)); }, normalize: store,
    limits: function (tier) { return tiers[tier] || tiers.medium; },
    effective: function (scene, tier) { var result = clone(scene), limit = this.limits(tier); result.lights = result.lights.filter(function (l) { return l.visible; }).slice(0, limit.lights); result.props = result.props.filter(function (p) { return p.visible; }).slice(0, limit.props); return result; },
    history: function (initial) {
      var past = [], future = [], current = this.serialize(initial), before = null;
      function snapshot(scene) { return C.studioScenes.serialize(scene); }
      return { begin: function (scene) { if (before === null) before = snapshot(scene); },
        commit: function (scene) { var next = snapshot(scene), previous = before === null ? current : before; before = null; if (next !== previous) { past.push(previous); if (past.length > 50) past.shift(); future.length = 0; } current = next; },
        undo: function () { if (!past.length) return null; before = null; future.push(current); current = past.pop(); return parse(current); },
        redo: function () { if (!future.length) return null; before = null; past.push(current); current = future.pop(); return parse(current); },
        get canUndo() { return past.length > 0; }, get canRedo() { return future.length > 0; }, get steps() { return past.length; } };
    },
    last: function (instance) { var saved = C.state.current.studio; try { return saved && saved.last && saved.last[instance.instanceId] ? parse(saved.last[instance.instanceId]) : null; } catch (_) { return null; } },
    saveLast: function (instance, scene) { var saved = C.state.current.studio || (C.state.current.studio = { slots: [], last: {} }); if (!saved.last) saved.last = {}; saved.last[instance.instanceId] = parse(scene); C.state.save(); }
  };
})(window.Cardable);
