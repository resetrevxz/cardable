(function (C) {
  'use strict';
  function lamp(type, position, color, intensity, extras) { return Object.assign(C.studioScenes.light({ type: type, position: position, color: color, intensity: intensity }), extras || {}); }
  var rigs = {
    Studio: function () { return [lamp('area', [-1.6, 2, 2.6], [1, .97, .93], 2.8, { rotation: [-30, -30, 0], size: 1 }), lamp('area', [1.4, .4, 2], [.8, .88, 1], 1.2, { rotation: [-10, 35, 0] }), lamp('strip', [0, 1, -1], [1, 1, 1], 2.2, { rotation: [-25, 180, 0] })]; },
    Rim: function () { return [lamp('strip', [-1.1, .6, -.8], [.75, .86, 1], 4, { rotation: [-10, -125, 0], size: .9 }), lamp('point', [1.3, .2, 1.7], [1, .94, .83], .9)]; },
    Noir: function () { return [lamp('spot', [-1.2, 2.2, 2.3], [1, 1, 1], 5, { rotation: [-40, -28, 0], angle: 35, gobo: 'blinds', softness: .18 })]; },
    'Neon Alley': function () { return [lamp('strip', [-1.2, .7, 1.3], [1, .08, .5], 3, { rotation: [-20, -42, 0] }), lamp('strip', [1.3, .3, 1.7], [.06, .8, 1], 3, { rotation: [-10, 38, 0] }), lamp('ambient', [0, 0, 0], [.18, .13, .25], .25)]; },
    Sunset: function () { return [lamp('directional', [-2, 1, 2], [1, .45, .15], 1.3, { rotation: [-18, -55, 0] }), lamp('ambient', [0, 0, 0], [.42, .35, .62], .6, { bottom: [.2, .1, .08] })]; },
    Moonlight: function () { return [lamp('directional', [1.5, 2, 2], [.4, .6, 1], 1.6, { rotation: [-45, 35, 0] }), lamp('area', [-1, .2, 2], [.78, .86, 1], .5)]; },
    Showroom: function () { return [lamp('area', [-1.3, 1.6, 2.2], [1, 1, 1], 3, { size: 1.2, rotation: [-30, -30, 0] }), lamp('area', [1.2, 1, 1.8], [1, .98, .92], 2, { size: .9, rotation: [-25, 30, 0] }), lamp('ambient', [0, 0, 0], [.8, .85, 1], .35)]; },
    Vault: function () { return [lamp('spot', [0, 2.5, 2], [1, .8, .36], 4, { rotation: [-50, 0, 0], angle: 40 }), lamp('strip', [1.1, .1, -1], [.5, .72, 1], 2.5, { rotation: [0, 140, 0] })]; }
  };
  C.studioPresets = { rigs: Object.keys(rigs), scenes: ['Studio', 'Museum', 'Neon Alley', 'Sunset Desk', 'Void', 'Vault', 'Showroom', 'Surprise me'],
    lights: function (name, tier) { return (rigs[name] || rigs.Studio)().slice(0, C.studioScenes.limits(tier).lights).map(function (l, i) { l.id = i === 0 ? 'key' : 'rig-' + i; l.name = i === 0 ? 'Key light' : 'Fill ' + i; return l; }); },
    apply: function (name, scene, tier) { if (name === 'Surprise me') name = this.scenes[Math.floor(Math.random() * (this.scenes.length - 1))]; var rig = { Museum: 'Studio', 'Sunset Desk': 'Sunset', Void: 'Rim' }[name] || name, next = C.studioScenes.defaults(); next.card = C.studioScenes.clone(scene.card); next.lights = this.lights(rig, tier); next.backdrop.color = name === 'Showroom' ? [.16, .16, .17] : name === 'Museum' ? [.07, .07, .075] : name === 'Sunset Desk' ? [.05, .025, .02] : name === 'Void' ? [.004, .004, .006] : [.025, .025, .033]; next.camera.yaw = name === 'Museum' ? 0 : -.12; next.camera.pitch = name === 'Sunset Desk' ? .18 : .04; next.post.bloom = name === 'Neon Alley' ? .35 : .12; return next; }
  };
})(window.Cardable);
