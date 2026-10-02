(function (C, root) {
  'use strict';
  function limit(n, cap) { return Math.max(-cap, Math.min(cap, n)); }
  C.packInteraction = {
    create: function (host) {
      var cfg = C.config.packObject, bounds, gesture = null, blocked = false, hovered = false, inspecting = false;
      var springs = {}, targets = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, lift: 0, grip: 0 };
      Object.keys(targets).forEach(function (key) { springs[key] = C.springs.create(0, cfg.spring); });
      var state = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, lift: 0, grip: 0, vx: 0, massX: 0, massY: 0, flex: 0 };
      function measure() { bounds = host.getBoundingClientRect(); }
      function clear() {
        var old = gesture; gesture = null; hovered = false; inspecting = false;
        host.classList.remove('is-grabbed', 'is-inspecting', 'is-hovered');
        if (old && host.hasPointerCapture(old.id)) host.releasePointerCapture(old.id);
        Object.keys(targets).forEach(function (key) { targets[key] = 0; }); C.fx.wake();
      }
      function move(event) {
        if (blocked || !bounds) return;
        if (gesture) {
          if (event.pointerId !== gesture.id) return;
          var dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
          gesture.moved = gesture.moved || Math.hypot(dx, dy) > cfg.dragSlopPx;
          if (!gesture.moved) { dx = 0; dy = 0; }
          targets.x = cfg.dragRangeX * Math.tanh(dx / cfg.dragRangeX);
          targets.y = cfg.dragRangeY * Math.tanh(dy / cfg.dragRangeY);
          targets.rx = limit(-dy * 0.13, cfg.dragTilt); targets.ry = limit(dx * 0.13, cfg.dragTilt);
          targets.rz = limit(dx * 0.022, 3.5); targets.lift = cfg.liftPx;
          state.flex = gesture.grabY;
        } else {
          var cap = inspecting ? cfg.inspectTilt : cfg.idleTilt;
          targets.rx = limit((0.5 - (event.clientY - bounds.top) / bounds.height) * cap * 2, cap);
          targets.ry = limit(((event.clientX - bounds.left) / bounds.width - 0.5) * cap * 2, cap);
        }
        C.fx.wake();
      }
      host.addEventListener('pointerenter', function () { if (blocked) return; measure(); hovered = true; host.classList.add('is-hovered'); targets.lift = inspecting ? cfg.inspectLiftPx : 3; C.fx.wake(); });
      host.addEventListener('pointerleave', function () { if (!gesture && !inspecting) clear(); });
      host.addEventListener('pointerdown', function (event) {
        if (blocked || event.button !== 0 || gesture || event.isPrimary === false || event.target.closest('button')) return;
        measure(); gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, grabY: limit(((event.clientY - bounds.top) / bounds.height - 0.5) * 2, 1) };
        host.setPointerCapture(event.pointerId); targets.grip = 1; targets.lift = cfg.liftPx;
        host.classList.add('is-grabbed'); event.preventDefault(); C.fx.wake();
      });
      host.addEventListener('pointermove', move);
      C.events.on('pointer:move', function (event) {
        if (blocked || gesture || inspecting || !bounds) return;
        var p = event.pointer, near = p.x > bounds.left - bounds.width * 0.7 && p.x < bounds.left + bounds.width * 1.7 && p.y > bounds.top - bounds.height * 0.5 && p.y < bounds.top + bounds.height * 1.5;
        if (near) move({ clientX: p.x, clientY: p.y });
        else if (!hovered) { targets.rx = 0; targets.ry = 0; }
      });
      host.addEventListener('pointerup', function (event) { if (gesture && gesture.id === event.pointerId) clear(); });
      host.addEventListener('pointercancel', clear); host.addEventListener('lostpointercapture', clear);
      host.addEventListener('contextmenu', function (event) {
        if (blocked) return; event.preventDefault(); inspecting = !inspecting; measure();
        host.classList.toggle('is-inspecting', inspecting); targets.lift = inspecting ? cfg.inspectLiftPx : 0; C.fx.wake();
      });
      host.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') clear();
        if (event.key.toLowerCase() === 'v' && !blocked) { inspecting = !inspecting; measure(); targets.lift = inspecting ? cfg.inspectLiftPx : 0; host.classList.toggle('is-inspecting', inspecting); C.fx.wake(); }
      });
      root.addEventListener('resize', measure); root.addEventListener('blur', clear);
      ['opening:context', 'inventory:context', 'preferences:context'].forEach(function (name) {
        C.events.on(name, function (event) { blocks[name] = event.active; blocked = Object.keys(blocks).some(function (key) { return blocks[key]; }); if (blocked) clear(); });
      });
      var blocks = {};
      C.events.on('fx:visibility', function (visible) { if (!visible) clear(); });
      C.events.on('save:reset', clear); C.events.on('motion:changed', clear);
      measure();
      return {
        state: state, clear: clear, get dragging() { return !!gesture; }, get inspecting() { return inspecting; },
        update: function (dt) {
          Object.keys(targets).forEach(function (key) {
            if ((C.motion.reduced || C.settings.policy.animation === 0)) { springs[key].reset(); state[key] = 0; }
            else state[key] = springs[key].step(dt, targets[key]);
          });
          state.rx = limit(state.rx, cfg.inspectTilt); state.ry = limit(state.ry, cfg.inspectTilt);
          state.vx = springs.x.velocity;
          var lag = (C.motion.reduced || C.settings.policy.animation === 0) ? 1 : 1 - Math.exp(-dt / cfg.massLagMs);
          state.massX += (state.x - state.massX) * lag; state.massY += (state.y - state.massY) * lag;
          if (!gesture) state.flex *= Math.exp(-dt / 100);
          return !!gesture || Object.keys(springs).some(function (key) { return !springs[key].settled(); });
        }
      };
    }
  };
})(window.Cardable, window);
