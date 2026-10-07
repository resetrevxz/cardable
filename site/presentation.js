/* Website-only surfaces: one real card, two adjacent real coatings, pointer reactions, drag rotation. */
(function(C, root) {
  'use strict';
  if (document.body.dataset.page !== 'home') {
    var render = C.art.render;
    C.art.render = function(card, options) {
      var el = render(card, options);
      if (el.tagName === 'IMG') el.src = '../' + el.getAttribute('src');
      return el;
    };
  }
  var finishes = ['normal', 'matte', 'rainbow-holo', 'galaxy-holo', 'aurora'];

  C.webCard = function(host, id, instance) {
    var card = C.card(id);
    var view = C.cardView.create(card, instance, {
      owned: true,
      quality: 'high',
      autoFocus: false,
      keyboardFlip: false,
      controlledReveal: true,
      autoStamp: false,
      shine: true
    });
    var layers = {}, position = 0;
    host.appendChild(view.el);
    view.el.classList.add('live-card', 'web-surface');
    view.setMode('full');

    // Drag-to-rotate interaction on the live card
    var dragStart = null, currentDragOffset = 0, targetDragOffset = 0,plx = 0, ply = 0;
    view.el.addEventListener('pointerdown', function(e) {
      if (e.button !== 0) return;
      dragStart = { x: e.clientX, y: e.clientY, startOffset: currentDragOffset, time: performance.now() };
      try { view.el.setPointerCapture(e.pointerId); } catch(err) {}
      document.body.classList.add('card-grabbing');
    });

    view.el.addEventListener('pointermove', function(e) {
      if (!dragStart) return;
      var dx = e.clientX - dragStart.x;
      targetDragOffset = dragStart.startOffset + dx * 0.45;
      if (root.CardableWeb && root.CardableWeb.wake) root.CardableWeb.wake();
    });

    function endDrag(e) {
      if (!dragStart) return;
      document.body.classList.remove('card-grabbing');
      var elapsed = performance.now() - dragStart.time;
      var dist = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
      if (elapsed < 240 && dist < 6) {
        // Quick tap: trigger card flip
        if (root.CardableWeb && root.CardableWeb.turnCard) {
          root.CardableWeb.turnCard();
        }
      }
      dragStart = null;
      // Spring back toward neutral or snap to 180 flip if spun
      targetDragOffset = 0;
      if (root.CardableWeb && root.CardableWeb.wake) root.CardableWeb.wake();
    }
    view.el.addEventListener('pointerup', endDrag);
    view.el.addEventListener('pointercancel', endDrag);

    function surface(p) {
      position = Math.max(0, Math.min(4, p));
      var lo = Math.floor(position), hi = Math.min(4, lo + 1), weights = {};
      weights[finishes[lo]] = 1 - (position - lo);
      weights[finishes[hi]] = (weights[finishes[hi]] || 0) + (position - lo);
      Object.keys(layers).forEach(function(finishKey) {
        if (!weights[finishKey]) {
          layers[finishKey].binding.destroy();
          layers[finishKey].el.remove();
          delete layers[finishKey];
        }
      });
      Object.keys(weights).forEach(function(finishKey) {
        if (finishKey === 'normal' || !weights[finishKey]) return;
        if (!layers[finishKey]) {
          var el = document.createElement('div');
          el.className = 'card__variant web-coating';
          view.el.querySelector('.card__face--front').appendChild(el);
          var binding = C.variantMaterials.bind(finishKey, el, card, instance);
          binding.activate();
          layers[finishKey] = { el: el, binding: binding };
        }
        layers[finishKey].el.style.opacity = weights[finishKey];
      });
      view.el.style.setProperty('--web-coating', 1 - (weights.normal || 0));
      view.el.style.setProperty('--web-matte', weights.matte || 0);
      view.el.dataset.webFinish = finishes[Math.round(position)];
    }

    return {
      view: view,
      id: id,
      surface: surface,
      get dragOffset() { return currentDragOffset; },
      get interacting() { return Math.abs(targetDragOffset - currentDragOffset) > 0.05; },
      frame: function(frame, lamp, pointer) {
        // Integrate drag rotation
        currentDragOffset += (targetDragOffset - currentDragOffset) * 0.18;
        if (Math.abs(targetDragOffset - currentDragOffset) > 0.1 && root.CardableWeb && root.CardableWeb.wake) {
          root.CardableWeb.wake();
        }
        var adjustedFrame = Object.assign({}, frame);
        if (adjustedFrame.pose) {
          adjustedFrame.pose = Object.assign({}, adjustedFrame.pose);
          adjustedFrame.pose.turn = (adjustedFrame.pose.turn || 0) + currentDragOffset;
        }
        view.setLamp(lamp.x, lamp.y);
        if (pointer) view.pointer({ pointer: pointer });
        view.setRevealFrame(adjustedFrame);
        // Layered depth: art, info and shadow drift at different rates under the pointer.
        var face = view.el.querySelector('.card__face--front');
        if (face) {
          var nx = pointer ? Math.max(-1, Math.min(1, pointer.x / 250)) : 0;
          var ny = pointer ? Math.max(-1, Math.min(1, pointer.y / 350)) : 0;
          plx += (nx - plx) * 0.2;
          ply += (ny - ply) * 0.2;
          var live = Math.abs(plx) + Math.abs(ply) > 0.02;
          var art = face.querySelector('.card__art-window'), info = face.querySelector('.card__info');
          var shadow = view.el.querySelector('.card__shadow');
          if (art) art.style.transform = live ? 'translate3d(' + (plx * 7).toFixed(2) + 'px,' + (ply * 5).toFixed(2) + 'px,0)' : '';
          if (info) info.style.transform = live ? 'translate3d(' + (plx * 11).toFixed(2) + 'px,' + (ply * 8).toFixed(2) + 'px,0)' : '';
          if (shadow) shadow.style.transform = live ? 'translate3d(' + (plx * -9).toFixed(2) + 'px,' + (ply * -6).toFixed(2) + 'px,0)' : '';
        }
      },
      update: function(now, dt) {
        if (!view.visible) return false;
        var moving = view.update(now, dt);
        Object.keys(layers).forEach(function(finishKey) {
          moving = layers[finishKey].binding.update(dt, null) || moving;
        });
        if (Math.abs(targetDragOffset - currentDragOffset) > 0.05) {
          moving = true;
        }
        return moving;
      },
      suspend: function() {
        view.setVisible(false);
        view.setMode('lite');
        Object.keys(layers).forEach(function(finishKey) {
          layers[finishKey].binding.deactivate();
        });
      },
      resume: function() {
        view.setVisible(true);
        view.setMode('full');
        Object.keys(layers).forEach(function(finishKey) {
          layers[finishKey].binding.activate();
        });
      },
      destroy: function() {
        Object.keys(layers).forEach(function(finishKey) {
          layers[finishKey].binding.destroy();
        });
        view.destroy();
      },
      get position() { return position; }
    };
  };
})(window.Cardable, window);
