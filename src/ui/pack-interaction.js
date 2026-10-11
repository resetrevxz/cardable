(function (C, root) {
  'use strict';
  function limit(n, cap) { return Math.max(-cap, Math.min(cap, n)); }
  C.packInteraction = {
    create: function (host) {
      var cfg = C.config.packObject, bounds, gesture = null, blocked = false, hovered = false, inspecting = false;
      var springs = {}, targets = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, lift: 0, grip: 0 };
      Object.keys(targets).forEach(function (key) { springs[key] = C.springs.create(0, cfg.spring); });
      // Turning the pack over is its own spring: a long, weighty swing with a small overshoot.
      // Free orbiting (inspect) sits on top of it and is absorbed back into the nearest face on exit.
      var flipSpring = C.springs.create(0, cfg.flipSpring), orbitSpring = C.springs.create(0, cfg.orbitSpring);
      var flipTarget = 0, orbitTarget = 0, orbitPitch = 0, flipFadeAt = 0;
      var state = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, lift: 0, grip: 0, vx: 0, massX: 0, massY: 0, flex: 0, flip: 0, yaw: 0, flipped: false };
      function measure() { bounds = host.getBoundingClientRect(); }
      function faceIsRear() { return Math.round(flipTarget / 180) % 2 !== 0; }
      function absorbOrbit() {
        // Fold any free orbit into the flip spring and settle on the nearest face.
        var total = flipSpring.value + orbitSpring.value;
        flipSpring.value = total; flipSpring.velocity += orbitSpring.velocity;
        orbitSpring.reset(0); orbitTarget = 0; orbitPitch = 0;
        flipTarget = Math.round(total / 180) * 180;
        state.flipped = faceIsRear(); host.dataset.flipped = state.flipped ? 'true' : 'false';
      }
      function setInspecting(next) {
        if (inspecting === next) return;
        inspecting = next; host.classList.toggle('is-inspecting', inspecting);
        if (!inspecting) { absorbOrbit(); targets.rx = 0; targets.ry = 0; }
        targets.lift = inspecting ? cfg.inspectLiftPx : (hovered ? 3 : 0); measure(); C.fx.wake();
      }
      function clear() {
        var old = gesture; gesture = null; hovered = false;
        if (inspecting) { inspecting = false; absorbOrbit(); }
        host.classList.remove('is-grabbed', 'is-inspecting', 'is-hovered', 'is-orbiting');
        if (old && host.hasPointerCapture(old.id)) host.releasePointerCapture(old.id);
        Object.keys(targets).forEach(function (key) { targets[key] = 0; }); C.fx.wake();
      }
      function endGesture() {
        // In inspect the orbit holds its angle after release; otherwise everything settles.
        if (!inspecting) { clear(); return; }
        var old = gesture; gesture = null; host.classList.remove('is-grabbed', 'is-orbiting');
        if (old && host.hasPointerCapture(old.id)) host.releasePointerCapture(old.id);
        C.fx.wake();
      }
      function flip() {
        if (blocked) return false;
        if (inspecting) absorbOrbit();
        flipTarget += 180; flipFadeAt = root.performance.now();
        state.flipped = faceIsRear(); host.dataset.flipped = state.flipped ? 'true' : 'false';
        C.events.emit('pack:flip', { flipped: state.flipped });
        C.fx.wake(); return true;
      }
      function faceFront() {
        // Opening always starts from the front: fold into the nearest front-facing turn.
        if (inspecting) { inspecting = false; host.classList.remove('is-inspecting'); }
        var total = flipSpring.value + orbitSpring.value;
        orbitSpring.reset(0); orbitTarget = 0; orbitPitch = 0; flipSpring.value = total;
        flipTarget = Math.round(total / 360) * 360;
        var was = state.flipped;
        state.flipped = false; host.dataset.flipped = 'false';
        if (was) C.events.emit('pack:flip', { flipped: false });
      }
      function move(event) {
        if (blocked || !bounds) return;
        if (gesture) {
          if (event.pointerId !== gesture.id) return;
          var dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
          gesture.moved = gesture.moved || Math.hypot(dx, dy) > cfg.dragSlopPx;
          if (!gesture.moved) { dx = 0; dy = 0; }
          if (inspecting) {
            // Free orbit: horizontal drag turns the pack all the way round, vertical tips it.
            orbitTarget = gesture.orbit0 + dx * cfg.orbitPerPx; orbitPitch = limit(gesture.pitch0 - dy * 0.22, cfg.orbitPitchCap);
            targets.rx = orbitPitch; host.classList.add('is-orbiting'); C.fx.wake(); return;
          }
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
        measure(); gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, grabY: limit(((event.clientY - bounds.top) / bounds.height - 0.5) * 2, 1), orbit0: orbitTarget, pitch0: orbitPitch };
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
      host.addEventListener('pointerup', function (event) { if (event.button === 0 && gesture && gesture.id === event.pointerId) endGesture(); });
      host.addEventListener('pointercancel', clear); host.addEventListener('lostpointercapture', function () { if (gesture) endGesture(); });
      host.addEventListener('dblclick', function (event) { if (blocked || event.target.closest('button')) return; event.preventDefault(); flip(); });
      host.addEventListener('contextmenu', function (event) {
        if (C.contextMenu) return;
        if (blocked) return; event.preventDefault(); setInspecting(!inspecting);
      });
      C.keys.listen(host, 'keydown', 'src.ui.pack-interaction.js.1', function (event) {
        if (event.key === 'Escape') clear();
        if (event.key.toLowerCase() === 'v' && !blocked) setInspecting(!inspecting);
      });
      C.viewport.onResize( measure); root.addEventListener('blur', clear);
      ['opening:context', 'inventory:context', 'preferences:context'].forEach(function (name) {
        C.events.on(name, function (event) {
          blocks[name] = event.active; blocked = Object.keys(blocks).some(function (key) { return blocks[key]; }); if (blocked) clear();
          // The opening always starts from the front; the stage pack is hidden, so it simply returns upright.
          if (name === 'opening:context' && event.active) { faceFront(); flipSpring.reset(flipTarget); state.flip = flipSpring.value; state.yaw = flipSpring.value; C.events.emit('pack:flip', { flipped: false }); }
        });
      });
      var blocks = {};
      C.events.on('fx:visibility', function (visible) { if (!visible) clear(); });
      C.events.on('save:reset', function () { clear(); faceFront(); flipSpring.reset(0); flipTarget = 0; }); C.events.on('motion:changed', clear);
      measure();
      return {
        state: state, clear: clear, flip: flip, faceFront: faceFront, get blocked() { return blocked; },
        get dragging() { return !!gesture; }, get inspecting() { return inspecting; }, get flipped() { return faceIsRear(); },
        get flipFadeAt() { return flipFadeAt; },
        update: function (dt) {
          Object.keys(targets).forEach(function (key) {
            if ((C.motion.reduced || C.settings.policy.animation === 0)) { springs[key].reset(); state[key] = 0; }
            else state[key] = springs[key].step(dt, targets[key]);
          });
          state.rx = limit(state.rx, cfg.inspectTilt); state.ry = limit(state.ry, cfg.inspectTilt);
          state.vx = springs.x.velocity;
          var still = C.motion.reduced || C.settings.policy.animation === 0;
          if (still) { flipSpring.reset(flipTarget); orbitSpring.reset(0); orbitTarget = 0; }
          else { flipSpring.step(dt, flipTarget); orbitSpring.step(dt, orbitTarget); }
          state.flip = flipSpring.value; state.yaw = flipSpring.value + orbitSpring.value;
          var lag = (C.motion.reduced || C.settings.policy.animation === 0) ? 1 : 1 - Math.exp(-dt / cfg.massLagMs);
          state.massX += (state.x - state.massX) * lag; state.massY += (state.y - state.massY) * lag;
          if (!gesture) state.flex *= Math.exp(-dt / 100);
          return !!gesture || !flipSpring.settled() || !orbitSpring.settled() || Object.keys(springs).some(function (key) { return !springs[key].settled(); });
        }
      };
    }
  };
})(window.Cardable, window);
