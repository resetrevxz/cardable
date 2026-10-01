(function (C) {
  'use strict';
  function entry(label, helper, group, value, choices, control) {
    return { label: label, helper: helper, group: group, defaultValue: value, choices: choices,
      control: control || (typeof value === 'boolean' ? 'switch' : 'segments'),
      apply: function (next, api) { api.attribute(this.key, next); } };
  }
  var schema = {
    motion: entry('Reduced motion', 'Auto follows your system.', 'Motion and effects', 'auto', ['auto', 'on', 'off']),
    quality: entry('Effects quality', 'Keeps the card in focus.', 'Motion and effects', 'high', ['high', 'medium', 'low']),
    dots: entry('Dot grid', 'A quiet response to the pointer.', 'Motion and effects', 'on', ['on', 'subtle', 'off']),
    cursorGlow: entry('Cursor glow', 'The native cursor stays visible.', 'Motion and effects', true),
    idleFade: entry('Idle fade', 'Hide chrome after stillness.', 'Motion and effects', '2.5', ['2.5', '5', 'never']),
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
  Object.keys(schema).forEach(function (key) { schema[key].key = key; });
  function valid(key, value) {
    var item = schema[key];
    if (!item) return undefined;
    if (key === 'volume') return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : item.defaultValue;
    if (item.choices) return item.choices.indexOf(value) !== -1 ? value : item.defaultValue;
    return typeof value === 'boolean' ? value : item.defaultValue;
  }
  C.settingsSchema = {
    entries: schema, version: 1, validate: valid,
    normalize: function (input) {
      input = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      var source = Object.assign({}, input), result = { settingsVersion: 1 };
      if (source.motion === undefined) source.motion = source.reducedMotion === true ? 'on' : source.reducedMotion === false ? 'off' : 'auto';
      if (source.rarityColor === undefined) source.rarityColor = source.rarityColorMode;
      Object.keys(schema).forEach(function (key) { result[key] = valid(key, source[key]); });
      return result;
    }
  };
})(window.Cardable);
