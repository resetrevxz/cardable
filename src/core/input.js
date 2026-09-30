(function (C, root) {
  'use strict';
  var pending = null, path = [];
  var pointer = { x: 0, y: 0, inside: false, interactive: false, target: null };
  var controls = 'button, a[href], input, select, textarea, [role="button"], [data-cursor="ring"]';
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
      });
      root.document.addEventListener('pointermove', function (event) {
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
      root.document.addEventListener('pointerdown', function () { modality('pointer'); }, { passive: true });
      root.document.addEventListener('keydown', function () { modality('keyboard'); });
      root.document.addEventListener('click', function (event) {
        var x = event.clientX, y = event.clientY;
        if (event.detail === 0 && event.target.getBoundingClientRect) {
          var rect = event.target.getBoundingClientRect(); x = rect.left + rect.width / 2; y = rect.top + rect.height / 2;
        }
        C.events.emit('pointer:click', { x: x, y: y, target: event.target, now: root.performance.now() });
        C.fx.wake();
      }, true);
      root.addEventListener('blur', leave);
      C.events.on('fx:visibility', function (visible) { if (!visible) leave(); });
    }
  };
})(window.Cardable, window);
