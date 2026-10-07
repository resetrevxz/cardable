(function (C) {
  'use strict';
  function entry(label, helper, group, value, choices, control) {
    return { label: label, helper: helper, group: group, defaultValue: value, choices: choices,
      control: control || (typeof value === 'boolean' ? 'switch' : 'segments'),
      apply: function (next, api) { api.attribute(this.key, next); } };
  }
  var schema = {
    motion: entry('Reduced motion', 'Auto follows your system.', 'Motion and effects', 'auto', ['auto', 'on', 'off']),
    quality: entry('Graphics preset', 'A complete graphics profile. FPS stays independent.', 'Graphics', 'medium', ['very-low', 'low', 'medium', 'high']),
    fpsLimit: entry('FPS limit', 'Unlimited removes the game cap; browser/display cadence still applies. Lower caps save power.', 'Performance', 'display', ['display', 'unlimited', '20', '30', '45', '60', '90', '120', '144', '165', '240'], 'select'),
    backgroundMode: entry('Hidden tab', 'Packs refill by real time in either mode.', 'Performance', 'sleep', ['sleep', 'timer'], 'select'),
    unfocusedMode: entry('Unfocused window', 'For a visible window while using another app.', 'Performance', 'normal', ['normal', '30', 'pause'], 'select'),
    showFps: entry('Performance display', 'A quiet readout that sleeps with the game.', 'Performance', false),
    performanceMode: entry('Display detail', 'Simple shows FPS only. Advanced adds frame and JS timing.', 'Performance', 'simple', ['simple', 'advanced']),
    dots: entry('Dot grid', 'A quiet response to the pointer.', 'Motion and effects', 'on', ['on', 'subtle', 'off']),
    cursorGlow: entry('Cursor glow', 'The native cursor stays visible.', 'Motion and effects', true),
    idleFade: entry('Idle fade', 'Keep the small logo and pack metrics while idle.', 'Motion and effects', '15', ['2.5', '5', '15', '30', 'never']),
    rarityColor: entry('Rarity color', 'Existing card colors on or off.', 'Cards', 'color', ['color', 'mono'], 'switch'),
    tilt: entry('Card tilt', 'Changes weight and maximum angle.', 'Cards', 'normal', ['low', 'normal', 'high']),
    revealSpeed: entry('Reveal speed', 'Hold and cut keep their timing.', 'Cards', 'normal', ['normal', 'fast']),
    serialOnFront: entry('Front serial', 'The back always shows its serial.', 'Cards', true),
    openKey: entry('Hold to open', 'The other key tears; Space also keeps.', 'Controls', 'space', ['space', 'enter'], 'keycaps'),
    cutAssist: entry('Cut assist', 'Easy finishes a shorter cut.', 'Controls', 'normal', ['normal', 'easy']),
    keyHints: entry('Key hints', 'Tutorial hints always remain.', 'Controls', true),
    volume: entry('Volume', 'Coming soon', 'Sound', 70, null, 'volume'),
    muted: entry('Mute', 'Coming soon', 'Sound', false),
    nudgeDismissed: entry('', '', null, false)
  };
  schema.idleFade.format = function (value) { return value === 'never' ? 'Never' : value + ' s'; };
  var tiers = ['very-low', 'low', 'medium', 'high'];
  var graphics = {
    finishQuality: ['Card finishes', 'Rarity materials and cosmetic coatings.'],
    reflectionQuality: ['Reflections', 'Foil, beams, glare and pack highlights.'],
    propQuality: ['Borders and props', 'Rarity ornaments, glow and geometry detail.'],
    particleQuality: ['Particles', 'Dust, sparkles and currency flights.'],
    shadowQuality: ['Shadows', 'Depth and grounding beneath objects.'],
    glassQuality: ['Glass and blur', 'Very Low and Low use solid tinted surfaces.'],
    backgroundQuality: ['Background effects', 'Dots, ripples, trails and cursor glow.'],
    animationQuality: ['Ambient animation', 'Sway, fluid, logo and decorative motion.'],
    canvasQuality: ['Canvas resolution', 'Pixel ratio ceiling: 1 / 1.25 / 1.5 / 2. Text stays sharp.'],
    cinematicQuality: ['Cinematic detail', 'Very Low uses calm Canvas scenes; higher tiers add geometry and post effects.']
  };
  Object.keys(graphics).forEach(function (key) { schema[key] = entry(graphics[key][0], graphics[key][1], 'Advanced graphics', 'medium', tiers, 'select'); });
  Object.keys(schema).forEach(function (key) { schema[key].key = key; });
  function valid(key, value) {
    var item = schema[key];
    if (!item) return undefined;
    if (key === 'volume') return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : item.defaultValue;
    if (item.choices) return item.choices.indexOf(value) !== -1 ? value : item.defaultValue;
    return typeof value === 'boolean' ? value : item.defaultValue;
  }
  C.settingsSchema = {
    entries: schema, graphicsKeys: Object.keys(graphics), tiers: tiers, version: 2, validate: valid,
    normalize: function (input) {
      input = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      var source = Object.assign({}, input), result = { settingsVersion: 2 };
      if (source.motion === undefined) source.motion = source.reducedMotion === true ? 'on' : source.reducedMotion === false ? 'off' : 'auto';
      if (source.rarityColor === undefined) source.rarityColor = source.rarityColorMode;
      Object.keys(graphics).forEach(function (key) { if (source[key] === undefined) source[key] = valid('quality', source.quality); });
      Object.keys(schema).forEach(function (key) { result[key] = valid(key, source[key]); });
      return result;
    }
  };
})(window.Cardable);
