(function (C, root) {
  'use strict';
  var hud = root.document.createElement('output'), age = 0, frames = 0, js = 0, sample = null;
  hud.className = 'performance-display'; hud.setAttribute('aria-label', 'Animation performance'); hud.hidden = true;
  root.document.body.appendChild(hud);
  function paint(status) {
    var advanced = C.settings.get('performanceMode') === 'advanced', cap = C.settings.get('fpsLimit');
    hud.dataset.mode = advanced ? 'advanced' : 'simple'; hud.replaceChildren();
    C.packMarkup.node('span', 'performance-fps', hud, status || (sample ? sample.fps + ' FPS' : 'Idle'));
    if (advanced) C.packMarkup.node('span', 'performance-detail', hud,
      (sample && !status ? sample.ms + ' ms · JS ' + sample.js + ' ms · ' : '') +
      (cap === 'unlimited' ? 'Unlimited' : cap === 'display' ? 'Display refresh' : cap + ' FPS cap'));
  }
  function state() { hud.hidden = !C.settings.get('showFps'); age = frames = js = 0; sample = null; paint(C.fx.stats.paused ? 'Paused' : 'Idle'); }
  ['showFps', 'performanceMode', 'fpsLimit'].forEach(function (key) { C.settings.onChange(key, state); });
  C.events.on('fx:sleep', state); C.events.on('fx:visibility', state);
  C.events.on('fx:frame', function (event) {
    if (hud.hidden) return;
    age += event.realDt; frames++; js += event.jsMs;
    if (age >= 250) {
      sample = { fps: Math.round(frames * 1000 / age), ms: (age / frames).toFixed(1), js: (js / frames).toFixed(2) };
      paint(); age = frames = js = 0;
    }
  });
  C.performanceDisplay = hud; state();
})(window.Cardable, window);
