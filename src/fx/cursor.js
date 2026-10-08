(function (C, root) {
  'use strict';
  var element, x = 0, y = 0, dirty = false, present = false;
  var finePointer = root.matchMedia('(hover: hover) and (pointer: fine)');
  var blade = false, angle = 0, previous = null, bladeElement, revealHidden = false, cutTarget = null;
  function update(_, dt) {
    if (!dirty) return false;
    var pointer=C.input.pointer;
    var p = blade && cutTarget ? {x:cutTarget.x,y:cutTarget.y,inside:pointer.inside,interactive:false} : pointer, cfg = C.config.shell.cursor;
    if (!C.settings.get('visibleCursor') || (!C.settings.get('cursorGlow') && !blade) || (!C.settings.policy.background && !blade) || revealHidden || !p.inside || !finePointer.matches) {
      present = false; element.classList.remove('is-present'); dirty = false; return false;
    }
    var amount = C.motion.reduced ? 1 : 1 - Math.pow(1 - (blade ? C.config.openingMotion.bladeFollow : cfg.follow), dt / C.config.shell.frameMs);
    if (!present) { x = p.x; y = p.y; present = true; }
    else { var steps=C.quality&&C.quality.profile.rank===4?2:1,sub=1-Math.pow(1-amount,1/steps);for(var step=0;step<steps;step++){x+=(p.x-x)*sub;y+=(p.y-y)*sub;} }
    var moving = Math.hypot(p.x - x, p.y - y) > cfg.settlePx;
    if (!moving) { x = p.x; y = p.y; }
    element.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    element.classList.add('is-present');
    element.classList.toggle('is-ring', !blade && p.interactive);
    element.classList.toggle('is-blade', blade);
    if (previous && (p.x !== previous.x || p.y !== previous.y)) angle = Math.atan2(p.y - previous.y, p.x - previous.x) * 180 / Math.PI;
    previous = { x: p.x, y: p.y };
    bladeElement.style.transform = 'translate(-50%,-50%) rotate(' + (blade ? 0 : angle) + 'deg)';
    dirty = moving;
    return moving;
  }
  C.cursor = {
    initialized: false,
    init: function () {
      if (C.cursor.initialized) return;
      C.cursor.initialized = true;
      element = root.document.getElementById('cursor-glow');
      bladeElement = root.document.createElement('div'); bladeElement.className = 'cursor-glow__blade'; element.appendChild(bladeElement);
      element.style.setProperty('--blade-length', C.config.openingMotion.bladeLengthPx + 'px');
      element.style.setProperty('--blade-width', C.config.openingMotion.bladeWidthPx + 'px');
      var cfg = C.config.shell.cursor;
      element.style.setProperty('--glow-size', cfg.glowPx + 'px');
      element.style.setProperty('--ring-size', cfg.ringPx + 'px');
      element.style.setProperty('--ring-scale', cfg.ringScale);
      element.style.setProperty('--glow-opacity', cfg.opacity);
      element.style.setProperty('--ring-ratio', cfg.ringPx / cfg.glowPx);
      C.events.on('pointer:move', function () { dirty = true; });
      C.events.on('pointer:leave', function () { dirty = true; });
      C.events.on('motion:changed', function () { dirty = true; });
      C.settings.onChange('cursorGlow', function () { dirty = true; C.fx.wake(); });
      C.settings.onChange('backgroundQuality', function () { dirty = true; C.fx.wake(); });
      C.events.on('cursor:blade', function (value) {
        blade = value;if(!blade)cutTarget=null; element.classList.toggle('is-blade', blade); dirty = true; C.fx.wake();
      });
      C.events.on('cursor:cutTarget', function(value){cutTarget=value;element.style.setProperty('--blade-strength',value?value.strength:0);dirty=true;C.fx.wake();});
      C.events.on('reveal:context', function (event) {
        revealHidden = !!event.hideCursor; element.classList.toggle('is-reveal-hidden', revealHidden);
        if (revealHidden) { element.classList.remove('is-present'); present = false; }
        dirty = true; C.fx.wake();
      });
      function pointerChanged() { dirty = true; C.fx.wake(); }
      if (finePointer.addEventListener) finePointer.addEventListener('change', pointerChanged);
      else finePointer.addListener(pointerChanged);
      C.fx.subscribe(update, 'cursor');
    }
  };
})(window.Cardable, window);
