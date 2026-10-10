/** Settings pages, sections and the options added by the settings redesign.
 *  Data only: the shell reads this layout; the engine keeps every saved key. */
(function (C) {
  'use strict';
  var base = C.settingsSchema, s = base.entries;
  function add(key, label, helper, value, choices, control) {
    s[key] = { key: key, label: label, helper: helper, group: 'Appearance', defaultValue: value, choices: choices || null,
      control: control || (typeof value === 'boolean' ? 'switch' : 'segments'), aliases: label.toLowerCase().split(' '),
      apply: function (next, api) { api.attribute(this.key, next); } };
    return s[key];
  }

  // New options.
  add('accentColor', 'Accent color', 'Tints selection, focus and progress. Monochrome stays neutral.', 'periwinkle',
    ['periwinkle', 'mint', 'amber', 'rose', 'lavender', 'sky', 'lime', 'pearl'], 'swatches');
  add('logoStyle', 'Wordmark style', 'A finish for the Cardable wordmark on the menu.', 'classic',
    ['classic', 'outline', 'chrome', 'prism', 'neon', 'ember', 'ghost'], 'tiles');
  add('logoAnimation', 'Wordmark glyph swaps', 'Letters trade places with look-alike glyphs on hover and after a long idle.', true);
  add('dotDensity', 'Dot spacing', 'Closer dots draw more of them.', 'normal', ['sparse', 'normal', 'dense']);
  add('dotTint', 'Dot color', 'White, or tinted with your accent color.', 'white', ['white', 'accent']);
  add('cursorGlowTint', 'Glow color', 'White, or tinted with your accent color.', 'white', ['white', 'accent']);
  add('clickRipples', 'Click ripples', 'A soft ring through the dot grid when you click.', true);
  add('cursorGlowSize', 'Cursor glow size', 'A percentage of the standard glow.', 100, null, 'slider');
  Object.assign(s.cursorGlowSize, { min: 50, max: 200, step: 10, unit: '%' });
  add('settingsPreviews', 'Setting previews', 'The live preview at the bottom of Settings. Its arrow folds it away too.', true);
  C.data.accentColors = { periwinkle: ['#ADC4FF', '173,196,255'], mint: ['#9ADCC0', '154,220,192'], amber: ['#F1CF99', '241,207,153'],
    rose: ['#F3ADB8', '243,173,184'], lavender: ['#C7A9FF', '199,169,255'], sky: ['#8FD3F4', '143,211,244'],
    lime: ['#C5E59A', '197,229,154'], pearl: ['#EDEDF2', '237,237,242'] };

  // Any frame cap is valid; the presets are only shortcuts.
  s.fpsLimit.control = 'fps'; s.fpsLimit.min = 10; s.fpsLimit.max = 360;
  s.fpsLimit.presets = ['30', '60', '90', '120', '144', '165', '240'];
  s.fpsLimit.label = 'Frame rate limit'; s.fpsLimit.helper = 'Pick a preset or set any cap. Lower caps save power.';
  s.fpsLimit.validate = function (value) {
    if (value === 'display' || value === 'unlimited') return value;
    var n = Math.round(Number(value));
    return Number.isFinite(n) && n > 0 ? String(Math.max(s.fpsLimit.min, Math.min(500, n))) : 'display';
  };

  // Placeholders and duplicates leave the panel. Their saved keys stay valid.
  ['volume', 'muted', 'notifyDaily', 'notifySound', 'visibleDesktop', 'visibleDots', 'visibleCursor', 'visibleIdleFade', 'visiblePerformance']
    .forEach(function (key) { if (s[key]) { s[key].group = null; s[key].retired = true; } });
  var normalize = base.normalize;
  base.normalize = function (input) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      var fold = null, take = function () { return fold || (fold = Object.assign({}, input)); };
      // A hidden duplicate switch folds into the one control that remains.
      if (input.visibleDots === false) { take().dots = 'off'; fold.visibleDots = true; }
      if (input.visibleCursor === false) { take().cursorGlow = false; fold.visibleCursor = true; }
      if (input.visibleIdleFade === false) { take().idleFade = 'never'; fold.visibleIdleFade = true; }
      if (input.visiblePerformance === false) { take().performanceMode = 'off'; fold.visiblePerformance = true; }
      if (fold) input = fold;
    }
    return normalize.call(base, input);
  };

  // Readable choice names.
  var names = { current: 'Keep current', recent: 'Newest first', oldest: 'Oldest first', 'rarity-desc': 'Rarest first', 'name-asc': 'Name A–Z',
    dmy: 'Day / month / year', mdy: 'Month / day / year', iso: 'ISO 8601', system: 'System', '12': '12-hour', '24': '24-hour',
    full: 'Full', abbreviated: 'Short', inherit: 'Follow global', play: 'Play full', short: 'Short', skip: 'Skip', off: 'Off',
    menu: 'Main menu', last: 'Where I left off', compact: 'Compact', semi: 'Semi-open', shelf: 'Shelf', grid: 'Grid',
    normal: 'Normal', quick: 'Quick', global: 'Game setting', 'default': 'Default', blender: 'Blender', figma: 'Figma', simple: 'Simple', pro: 'Pro',
    on: 'On', 'very-low': 'Very Low', low: 'Low', medium: 'Medium', high: 'High', 'very-high': 'Very High', auto: 'Auto',
    'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right', 'top-left': 'Top left', 'top-right': 'Top right',
    sleep: 'Sleep completely', timer: 'Timer and title only', pause: 'Pause visuals', '30': 'Limit to 30 FPS', advanced: 'Advanced',
    sparse: 'Sparse', dense: 'Dense', white: 'White', accent: 'Accent', safe: 'Safe', subtle: 'Subtle', easy: 'Easy', fast: 'Fast', space: 'Space', enter: 'Enter' };
  function named(extra) { return function (value) { var k = String(value); return extra && extra[k] || names[k] || k.charAt(0).toUpperCase() + k.slice(1); }; }
  Object.keys(s).forEach(function (key) { var d = s[key]; if (d.choices && !d.format && key !== 'fpsLimit') d.format = named(); });
  s.idleFade.format = function (value) { return value === 'never' ? 'Never' : value + ' s'; };
  s.resolutionScale.format = function (value) { return Math.round(Number(value) * 100) + '%'; };
  s.studioGizmoSize.format = function (value) { return Number(value) * 100 + '%'; };
  s.studioAutosave.format = function (value) { return String(value); };
  s.holdDuration.format = named({ normal: '3 s', 'short': '2 s', quick: '1 s' });
  s.timeFormat.format = named(); s.numberFormat.format = named({ current: 'Keep current', full: '12,345', abbreviated: '12.3K' });
  s.interfaceSize.unit = '%'; s.tiltStrength.unit = '%'; s.uiAnimationSpeed.unit = '×';

  // Friendlier copy and control types.
  function tune(key, patch) { if (s[key]) Object.assign(s[key], patch); }
  tune('quality', { label: 'Graphics preset', helper: 'One choice sets every effect below. Frame rate stays separate.', control: 'tiers' });
  tune('motion', { label: 'Reduced motion', helper: 'Swaps travel, sway and parallax for calm fades. Auto follows your system.' });
  tune('dots', { helper: 'A quiet field of dots that answers your pointer.' });
  tune('cursorGlow', { helper: 'A soft light that follows the pointer. Your normal cursor stays.' });
  tune('idleFade', { helper: 'How long before the menu fades back to the pack and wordmark.' });
  tune('rarityColor', { label: 'Color', helper: 'Switch off for a monochrome game: cards, cinematics and accents.' });
  tune('tilt', { helper: 'How far a card leans toward your pointer.' });
  tune('tiltStrength', { helper: 'Fine-tune the lean as a percentage of the style above.' });
  tune('revealSpeed', { helper: 'Fast shortens the rise and flip. The hold and cut keep their timing.' });
  tune('serialOnFront', { label: 'Serial on the front', helper: 'The back of a card always shows its serial.' });
  tune('openKey', { label: 'Open key', helper: 'Hold it to open a pack. The other key tears; Space also keeps.' });
  tune('holdDuration', { label: 'Hold time', helper: 'How long you hold to open a pack.' });
  tune('cutAssist', { helper: 'Easy finishes the cut after a shorter swipe.' });
  tune('keyHints', { helper: 'Small key reminders near the pack. Tutorial hints always stay.' });
  tune('cutscenes', { helper: 'The full ceremony, a short route, or a calm reveal for high rarities.' });
  tune('strobing', { helper: 'Full adds rapid flashing that can trigger seizures in people with photosensitive epilepsy. Hold to enable.' });
  tune('performanceMode', { helper: 'A frame-rate readout in a corner. F3 cycles it.' });
  tune('backgroundMode', { label: 'When the tab is hidden', helper: 'Packs refill by real time either way.' });
  tune('unfocusedMode', { label: 'When another window is in front', helper: 'For a visible window you are not using.' });
  tune('performanceCorner', { label: 'Overlay corner' });
  tune('resolutionScale', { label: 'Scene resolution', helper: 'Lowers pixel work in heavy scenes. Text stays sharp.' });
  tune('interfaceSize', { helper: 'Scales the whole interface from 70 to 150%.' });
  tune('achievementToasts', { helper: 'Quiet unlock notices, held until you are back on the menu.' });
  tune('notifyPackReady', { helper: 'A Windows notification when a pack finishes refilling.', nativeOnly: true });
  tune('batterySaver', { control: 'segments', helper: 'On battery, drops effects one tier and caps 30 FPS. Saved choices stay.' });
  tune('proximityChrome', { label: 'Hide until nearby', helper: 'Credits and the inventory peek fade until your pointer is close.' });
  ['backgroundMode', 'unfocusedMode', 'performanceCorner', 'resolutionScale', 'dotDensity', 'dotTint', 'clickRipples', 'cursorGlowSize', 'cursorGlowTint',
    'defaultSort', 'defaultView', 'defaultTagMode', 'startupScreen', 'timeFormat', 'dateFormat', 'numberFormat', 'playCutscenesOnce',
    'batterySaver', 'focusModeDefault', 'taskbarProgress', 'confirmLowDelete', 'toggleHold', 'announcements', 'logoAnimation']
    .forEach(function (key) { tune(key, { advanced: true }); });
  Object.keys(s).forEach(function (key) {
    if (/^cutscene_/.test(key)) tune(key, { advanced: true, helper: 'Its own route, or follow the global choice.' });
    if (s[key].control === 'select') s[key].control = 'menu';
    if (/^visible[A-Z]/.test(key)) s[key].helper = '';
  });
  ['aspectLock', 'alwaysOnTop', 'taskbarProgress', 'focusModeDefault', 'batterySaver', 'notifyPackReady', 'restartUpdatesWhenIdle']
    .forEach(function (key) { tune(key, { nativeOnly: true }); });

  base.graphicsKeys.forEach(function (key) { tune(key, { control: 'level', advanced: false }); });
  var visibility = C.data.visibilityKeys.filter(function (key) { return s[key] && !s[key].retired; });
  var routes = Object.keys(s).filter(function (key) { return /^cutscene_/.test(key); });
  var studio = Object.keys(s).filter(function (key) { return /^studio[A-Z]/.test(key); });
  // Page → sections → keys. `slot` names a host the settings UI fills itself.
  var pages = [
    { id: 'Graphics', icon: 'sparkle', blurb: 'How rich the game looks.', sections: [
      { title: 'Preset', keys: ['quality'] },
      { title: 'What it changes', slot: 'effects', keys: base.graphicsKeys.slice() },
      { title: 'Rendering', keys: ['resolutionScale'] } ] },
    { id: 'Performance', icon: 'gauge', blurb: 'Frame rate and background behavior.', sections: [
      { title: 'Frame rate', keys: ['fpsLimit', 'performanceMode', 'performanceCorner'] },
      { title: 'In the background', keys: ['backgroundMode', 'unfocusedMode', 'batterySaver'] } ] },
    { id: 'Appearance', icon: 'palette', blurb: 'Color, the wordmark and the menu.', sections: [
      { title: 'Theme', keys: ['rarityColor', 'accentColor'] },
      { title: 'Wordmark', keys: ['logoStyle', 'logoAnimation'] },
      { title: 'Backdrop', keys: ['dots', 'dotDensity', 'dotTint', 'clickRipples', 'cursorGlow', 'cursorGlowSize', 'cursorGlowTint'] },
      { title: 'Interface', keys: ['interfaceSize', 'idleFade', 'settingsPreviews'] },
      { title: 'Show and hide', slot: 'visibility', grid: true, keys: visibility.concat(['proximityChrome']) } ] },
    { id: 'Motion', icon: 'motion', blurb: 'Movement, cards and cutscenes.', sections: [
      { title: 'Comfort', keys: ['motion', 'strobing'] },
      { title: 'Cards', keys: ['tilt', 'tiltStrength', 'revealSpeed'] },
      { title: 'Cutscenes', keys: ['cutscenes', 'skipAllCutscenes', 'playCutscenesOnce'] },
      { title: 'Per rarity', keys: routes },
      { title: 'Interface motion', keys: ['uiAnimationSpeed', 'hoverAnimations', 'packSwapAnimations', 'variantAnimation', 'tagAnimations'] } ] },
    { id: 'Gameplay', icon: 'pack', blurb: 'Opening packs and your collection.', sections: [
      { title: 'Opening packs', keys: ['openKey', 'holdDuration', 'toggleHold', 'cutAssist', 'keyHints'] },
      { title: 'Cards', keys: ['serialOnFront', 'confirmLowDelete'] },
      { title: 'Notices', keys: ['achievementToasts', 'notifyPackReady'] },
      { title: 'Collection', keys: ['defaultSort', 'defaultView', 'defaultTagMode', 'startupScreen'] },
      { title: 'Formats', keys: ['timeFormat', 'dateFormat', 'numberFormat'] } ] },
    { id: 'Controls', icon: 'keyboard', advanced: true, blurb: 'Two keys for every action.', sections: [{ title: 'Keyboard', slot: 'bindings', keys: [] }] },
    { id: 'Accessibility', icon: 'access', blurb: 'Clearer, calmer, easier to read.', sections: [
      { title: 'Vision', keys: ['highContrast', 'largerText', 'reduceTransparency', 'focusEmphasis'] },
      { title: 'Assistive', keys: ['announcements'] } ] },
    { id: 'Desktop', icon: 'monitor', nativeOnly: true, blurb: 'The Windows app.', sections: [
      { title: 'Window', keys: ['aspectLock', 'alwaysOnTop', 'focusModeDefault', 'taskbarProgress'] },
      { title: 'Updates', keys: ['restartUpdatesWhenIdle'] } ] },
    { id: 'Studio', icon: 'camera', advanced: true, blurb: 'Defaults for the photo studio.', sections: [{ title: 'Workspace', keys: studio }] },
    { id: 'Profiles', icon: 'layers', blurb: 'One-tap setups you can undo.', sections: [{ title: 'Quick setups', slot: 'profiles', keys: [] }] },
    { id: 'Data', icon: 'folder', blurb: 'Back up, move or reset your save.', sections: [
      { title: 'Back up', slot: 'backup', keys: [] }, { title: 'Bring a save in', slot: 'import', keys: [] },
      { title: 'Tutorial', slot: 'tutorial', keys: [] }, { title: 'Start over', slot: 'danger', danger: true, keys: [] } ] },
    { id: 'About', icon: 'info', blurb: 'Version, help and credits.', sections: [{ title: 'Cardable', slot: 'about', keys: [] }] }
  ];
  pages.forEach(function (page) { page.sections.forEach(function (section) { section.keys.forEach(function (key) { if (s[key]) s[key].group = page.id; }); }); });
  // An option no page lists is not offered (and not searchable) rather than orphaned.
  Object.keys(s).forEach(function (key) { if (s[key].group && !pages.some(function (page) { return page.id === s[key].group; })) s[key].group = null; });
  C.data.settingsPages = pages;
  // Older deep links keep opening the page that now holds their options.
  C.data.settingsAliases = { 'Advanced graphics': 'Graphics', 'Motion and effects': 'Motion', Cards: 'Gameplay', 'Interface visibility': 'Appearance',
    Display: 'Appearance', 'Animation and effects': 'Motion', 'Cutscene skip': 'Motion', 'Gameplay behavior': 'Gameplay', Formats: 'Gameplay',
    Notifications: 'Gameplay', Sound: 'Appearance' };
  C.data.settingsProfiles = {
    Balanced: {},
    Performance: { quality: 'low', fpsLimit: '60', resolutionScale: .75, dots: 'off', reduceTransparency: true },
    Cinematic: { quality: 'high', cutscenes: 'full', skipAllCutscenes: false, revealSpeed: 'normal' },
    Minimal: { visibleWordmark: false, visibleCredits: false, visibleHelp: false, visibleTooltips: false, visibleTags: false, dots: 'off', cursorGlow: false },
    Comfort: { motion: 'on', reduceTransparency: true, highContrast: true, largerText: true, focusEmphasis: true, toggleHold: true, holdDuration: 'short' }
  };
  C.data.settingsProfileInfo = {
    Balanced: ['sparkle', 'Every option back to its default.'],
    Performance: ['gauge', 'Lighter effects and a 60 FPS cap for a smooth, cool machine.'],
    Cinematic: ['play', 'High detail with every cutscene in full.'],
    Minimal: ['eye', 'Just the pack. Hides most of the menu furniture.'],
    Comfort: ['access', 'Reduced motion, solid surfaces, larger text and an easier hold.']
  };
})(window.Cardable);
