(function (C) {
  'use strict';
  function require(ok, what) { if (!ok) throw new Error(what); }
  C.dev.registerCheck('settings defaults and unknown-key removal', function () {
    var value = C.settingsSchema.normalize({ surprise: 'discard', settingsVersion: 999 });
    require(value.settingsVersion === 1 && value.motion === 'auto' && value.quality === 'high' && value.volume === 70 && !('surprise' in value), 'normalization');
    return true;
  });
  C.dev.registerCheck('settings validation and finite volume clamp', function () {
    var value = C.settingsSchema.normalize({ quality: 'ultra', cursorGlow: 'true', volume: 200, tilt: null });
    require(value.quality === 'high' && value.cursorGlow === true && value.volume === 100 && value.tilt === 'normal', 'validation');
    require(C.settingsSchema.normalize({ volume: NaN }).volume === 70, 'nonfinite volume');
    return true;
  });
  C.dev.registerCheck('settings legacy migration preserves progress', function () {
    var state = C.state.fresh(100); state.settings = { reducedMotion: true, rarityColorMode: 'mono' }; state.currency = 42;
    var result = C.state.migrate(state);
    require(result.schemaVersion === 3 && result.currency === 42 && result.settings.motion === 'on' && result.settings.rarityColor === 'mono', 'migration');
    return true;
  });
  C.dev.registerCheck('settings subscription cleanup', function () {
    var count = 0, stop = C.settings.onChange('unused-isolated-check', function () { count++; });
    C.events.emit('settings:changed', { key: 'unused-isolated-check', value: false }); stop(); stop();
    C.events.emit('settings:changed', { key: 'unused-isolated-check', value: false }); require(count === 1, 'unsubscribe');
    return true;
  });
  C.dev.registerCheck('settings reveal timing keeps charge fixed and top-tier floor', function () {
    var value = C.settings.revealTiming({ riseMs: 1000, flipMs: 1000, preFlipPauseMs: 1000 }, 11, 1);
    require(value.riseMs >= 600 && value.flipMs >= 600 && value.preFlipPauseMs >= 600 && C.config.hold.chargeMs === 3000, 'timing');
    return true;
  });
})(window.Cardable);
