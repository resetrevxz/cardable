(function (C, root) {
  'use strict';
  var element, x = 0, y = 0, dirty = false, present = false;
  var finePointer = root.matchMedia('(hover: hover) and (pointer: fine)');
  function update(_, dt) {
    if (!dirty) return false;
    var p = C.input.pointer, cfg = C.config.shell.cursor;
    if (!p.inside || !finePointer.matches) {
      present = false; element.classList.remove('is-present'); dirty = false; return false;
    }
    var amount = C.motion.reduced ? 1 : 1 - Math.pow(1 - cfg.follow, dt / C.config.shell.frameMs);
    if (!present) { x = p.x; y = p.y; present = true; }
    else { x += (p.x - x) * amount; y += (p.y - y) * amount; }
    var moving = Math.hypot(p.x - x, p.y - y) > cfg.settlePx;
    if (!moving) { x = p.x; y = p.y; }
    element.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    element.classList.add('is-present');
    element.classList.toggle('is-ring', p.interactive);
    dirty = moving;
    return moving;
  }
  C.cursor = {
    initialized: false,
    init: function () {
      if (C.cursor.initialized) return;
      C.cursor.initialized = true;
      element = root.document.getElementById('cursor-glow');
      var cfg = C.config.shell.cursor;
      element.style.setProperty('--glow-size', cfg.glowPx + 'px');
      element.style.setProperty('--ring-size', cfg.ringPx + 'px');
      element.style.setProperty('--ring-scale', cfg.ringScale);
      element.style.setProperty('--glow-opacity', cfg.opacity);
      element.style.setProperty('--ring-ratio', cfg.ringPx / cfg.glowPx);
      C.events.on('pointer:move', function () { dirty = true; });
      C.events.on('pointer:leave', function () { dirty = true; });
      C.events.on('motion:changed', function () { dirty = true; });
      function pointerChanged() { dirty = true; C.fx.wake(); }
      if (finePointer.addEventListener) finePointer.addEventListener('change', pointerChanged);
      else finePointer.addListener(pointerChanged);
      C.fx.subscribe(update);
    }
  };
})(window.Cardable, window);
