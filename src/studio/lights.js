(function (C) {
  'use strict';
  var sequence = 0, types = ['point', 'spot', 'directional', 'area', 'strip', 'ambient'];
  function hsv(h, s, v) { h = ((h % 360) + 360) % 360 / 60; var c = v * s, x = c * (1 - Math.abs(h % 2 - 1)), m = v - c, rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]; return rgb.map(function (n) { return n + m; }); }
  function toHSV(rgb) { var max = Math.max.apply(Math, rgb), min = Math.min.apply(Math, rgb), d = max - min, h = d === 0 ? 0 : max === rgb[0] ? (rgb[1] - rgb[2]) / d % 6 : max === rgb[1] ? (rgb[2] - rgb[0]) / d + 2 : (rgb[0] - rgb[1]) / d + 4; return [((h * 60) + 360) % 360, max === 0 ? 0 : d / max, max]; }
  function kelvin(k) { var t = k / 100, red = t <= 66 ? 255 : 329.698727 * Math.pow(t - 60, -.13320476), green = t <= 66 ? 99.4708026 * Math.log(t) - 161.119568 : 288.12217 * Math.pow(t - 60, -.07551485), blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.517732 * Math.log(t - 10) - 305.04479; return [red, green, blue].map(function (n) { return Math.max(0, Math.min(255, n)) / 255; }); }
  function direction(light) { var x = light.rotation[0] * Math.PI / 180, y = light.rotation[1] * Math.PI / 180; return [-Math.sin(y) * Math.cos(x), Math.sin(x), -Math.cos(y) * Math.cos(x)]; }
  function active(lights, tier) { return tier !== 'very-low' && !C.motion.reduced && lights.some(function (l) { return l.visible && l.type !== 'ambient' && l.animation !== 'none'; }); }
  function sample(lights, time, tier) { if (!active(lights, tier)) return lights; var full = C.cutscenes.profile() === 'full', cap = full ? 5 : 1.8, amplitude = full ? .18 : .08;
    return lights.map(function (source) { if (!source.visible || source.type === 'ambient' || source.animation === 'none') return source; var l = C.studioScenes.clone(source), phase = time * Math.min(source.speed, cap) * Math.PI * 2;
      // Continuous soft ramps and low contrast; sky lights never animate.
      if (l.animation === 'pulse') l.intensity *= 1 - amplitude + amplitude * Math.sin(phase);
      if (l.animation === 'flicker') l.intensity *= 1 - amplitude + amplitude * (.65 * Math.sin(phase) + .35 * Math.sin(phase * .47 + 2));
      if (l.animation === 'sweep') l.rotation[1] += Math.sin(phase * .25) * 25;
      if (l.animation === 'orbit') { var angle = phase * .15, x = l.position[0], z = l.position[2]; l.position[0] = x * Math.cos(angle) + z * Math.sin(angle); l.position[2] = z * Math.cos(angle) - x * Math.sin(angle); }
      return l;
    });
  }
  C.studioLights = { types: types, hsv: hsv, toHSV: toHSV, kelvin: kelvin, direction: direction, active: active, sample: sample,
    create: function (type) { return C.studioScenes.light({ id: 'light-' + Date.now().toString(36) + '-' + (++sequence), name: { point: 'Point', spot: 'Spot', directional: 'Sun', area: 'Softbox', strip: 'Strip', ambient: 'Sky' }[type] || 'Point', type: type, rotation: [-33, -31, 0] }); },
    duplicate: function (light) { var next = C.studioScenes.clone(light); next.id = this.create(light.type).id; next.name += ' copy'; next.position[0] += .2; next.locked = false; return next; },
    colorPresets: { Pastel: [.86, .8, 1], Neon: [1, .08, .52], Warm: [1, .69, .4], Cool: [.42, .7, 1] }
  };
})(window.Cardable);
