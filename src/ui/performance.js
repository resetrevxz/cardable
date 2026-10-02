(function (C, root) {
  'use strict';
  var hud = root.document.createElement('output'), age = 0, frames = 0;
  hud.className = 'performance-display'; hud.setAttribute('aria-label', 'Animation performance'); hud.hidden = true;
  root.document.body.appendChild(hud);
  function state() { hud.hidden = !C.settings.get('showFps'); hud.textContent = C.fx.stats.paused ? 'Paused' : 'Idle'; age = frames = 0; }
  C.settings.onChange('showFps', state);
  C.events.on('fx:sleep', state); C.events.on('fx:visibility', state);
  C.events.on('fx:frame', function (event) {
    if (hud.hidden) return;
    age += event.realDt; frames++;
    if (age >= 250) { hud.textContent = Math.round(frames * 1000 / age) + ' FPS · ' + (age / frames).toFixed(1) + ' ms · JS ' + event.jsMs.toFixed(2) + ' ms'; age = frames = 0; }
  });
  C.performanceDisplay = hud; state();
})(window.Cardable, window);
