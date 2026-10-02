(function (C, root) {
  'use strict';
  var pending = null, path = [];
  var pointer = { x: 0, y: 0, inside: false, interactive: false, target: null };
  var controls = 'button, a[href], input, select, textarea, summary, [role="button"], [data-cursor="ring"]';
  var opening = { enabled: false, phase: 'idle', ready: false }, spaceDown = false, enterDown = false, chargeKey = null;
  var inventoryActive = false;
  var preferencesActive = false;
  function prevent(event) { if (event.preventDefault) event.preventDefault(); }
  function chargeTarget(target) {
    if (inventoryActive) return false;
    if (!target) return true;
    var pack = root.document.getElementById('pack-stage');
    if (pack && pack.contains(target)) return true;
    return !(target.isContentEditable || (target.closest && target.closest(controls + ', [contenteditable]')));
  }
  function cancel(reason) {
    spaceDown = false; enterDown = false; chargeKey = null;
    C.events.emit('input:cancel', { reason: reason });
  }
  function modality(value) {
    if (C.input.modality === value) return;
    C.input.modality = value;
    C.events.emit('input:modality', value);
  }
  function leave() {
    pending = null; path = [];
    if (!pointer.inside) return;
    pointer.inside = false;
    C.events.emit('pointer:leave', pointer);
    C.fx.wake();
  }
  C.input = {
    initialized: false, pointer: pointer, modality: 'pointer',
    // Detach gestures first so capture-loss handlers cannot reuse stale state.
    cancelGestures: function (gestures) {
      var pending = Object.keys(gestures).map(function (key) { var gesture = gestures[key]; gestures[key] = null; return gesture; });
      pending.forEach(function (gesture) {
        if (gesture && gesture.capture && gesture.capture.hasPointerCapture(gesture.id)) gesture.capture.releasePointerCapture(gesture.id);
      });
    },
    chargeStart: function () { if (!preferencesActive && !inventoryActive) C.events.emit('input:chargeStart'); },
    chargeEnd: function () { C.events.emit('input:chargeEnd'); },
    cutMove: function (event) { C.events.emit('input:cutMove', event); },
    keep: function () { if (!preferencesActive && !spaceDown && !enterDown && !root.document.hidden) C.events.emit('input:keep'); },
    discard: function () { if (!preferencesActive && !spaceDown && !enterDown && !root.document.hidden) C.events.emit('input:discard'); },
    init: function () {
      if (C.input.initialized) return;
      C.input.initialized = true;
      C.fx.subscribe(function () {
        if (!pending) return false;
        Object.assign(pointer, pending);
        pending = null;
        var travelled = path;
        path = [];
        C.events.emit('pointer:move', { pointer: pointer, path: travelled });
        return false;
      }, 'input');
      root.document.addEventListener('pointermove', function (event) {
        if (opening.enabled && opening.phase === 'cutting') C.input.cutMove(event);
        if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        var previous = pending || pointer;
        if (previous.inside && previous.x === event.clientX && previous.y === event.clientY) return;
        if (!path.length && pointer.inside) path.push({ x: pointer.x, y: pointer.y });
        path.push({ x: event.clientX, y: event.clientY });
        if (path.length > C.config.shell.pointerSamples) path.splice(1, 1);
        pending = { x: event.clientX, y: event.clientY, inside: true, target: event.target,
          interactive: !!(event.target.closest && event.target.closest(controls)) };
        modality('pointer');
        C.events.emit('pointer:activity', pending);
        C.fx.wake();
      }, { passive: true });
      root.document.addEventListener('pointerout', function (event) { if (!event.relatedTarget) leave(); }, { passive: true });
      root.document.addEventListener('pointerdown', function (event) {
        modality('pointer');
        if (opening.enabled && opening.phase === 'cutting') C.events.emit('input:cutStart', event);
      });
      root.document.addEventListener('pointerup', function (event) { C.events.emit('input:cutEnd', event); });
      root.document.addEventListener('pointercancel', function (event) { C.events.emit('input:cutEnd', event); });
      root.document.addEventListener('keydown', function (event) {
        modality('keyboard');
        var key = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' ? 'Space' : event.key === 'Enter' ? 'Enter' : null;
        var wasDown = key === 'Space' ? spaceDown : enterDown;
        if (key === 'Space') spaceDown = true;
        if (key === 'Enter') enterDown = true;
        if (preferencesActive || !opening.enabled) return;
        if (event.key === 'Escape' && opening.phase === 'charging') { prevent(event); cancel('escape'); return; }
        if (!key) return;
        var button = event.target && event.target.closest && event.target.closest('button');
        var discardTarget = button && button.classList.contains('opening-delete');
        var actionTarget = chargeTarget(event.target) || discardTarget || button && button.classList.contains('opening-keep');
        // Space resolves the focused card action, independent of the opening key setting.
        if (key === 'Space' && opening.phase === 'revealed' && actionTarget) {
          prevent(event);
          if (!event.repeat && !wasDown && !enterDown && !root.document.hidden) C.events.emit(discardTarget ? 'input:discard' : 'input:keep');
          return;
        }
        if (key === C.settings.holdKey) {
          if (!chargeTarget(event.target)) return;
          if (opening.phase !== 'idle' || opening.ready) prevent(event);
          if (event.repeat || wasDown || opening.phase !== 'idle' || !opening.ready || root.document.hidden) return;
          chargeKey = key; C.input.chargeStart();
        } else if (actionTarget && (opening.phase === 'cutting' || opening.phase === 'revealed')) {
          prevent(event);
          var otherDown = key === 'Space' ? enterDown : spaceDown;
          if (event.repeat || wasDown || otherDown || root.document.hidden) return;
          if (opening.phase === 'cutting') C.events.emit('input:tear');
          else C.events.emit(discardTarget ? 'input:discard' : 'input:keep');
        }
      });
      root.document.addEventListener('keyup', function (event) {
        var key = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' ? 'Space' : event.key === 'Enter' ? 'Enter' : null;
        if (chargeKey !== null && key === chargeKey) { prevent(event); chargeKey = null; C.input.chargeEnd(); }
        if (key === 'Space') spaceDown = false;
        if (key === 'Enter') enterDown = false;
      });
      C.events.on('opening:context', function (event) { opening = event; });
      C.events.on('inventory:context', function (event) { inventoryActive = event.active; });
      C.events.on('preferences:context', function (event) { preferencesActive = event.active; });
      root.document.addEventListener('click', function (event) {
        var x = event.clientX, y = event.clientY;
        if (event.detail === 0 && event.target.getBoundingClientRect) {
          var rect = event.target.getBoundingClientRect(); x = rect.left + rect.width / 2; y = rect.top + rect.height / 2;
        }
        C.events.emit('pointer:click', { x: x, y: y, target: event.target, now: root.performance.now() });
        C.fx.wake();
      }, true);
      root.addEventListener('blur', leave);
      root.addEventListener('blur', function () { cancel('blur'); });
      C.events.on('fx:visibility', function (visible) { if (!visible) { leave(); cancel('hidden'); } });
    }
  };
})(window.Cardable, window);
