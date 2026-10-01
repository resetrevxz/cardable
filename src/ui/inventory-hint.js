(function (C, root) {
  'use strict';
  C.inventoryHint = {
    initialized: false, visible: true,
    setVisible: function (value) { C.inventoryHint.visible = value; C.fx.wake(); },
    init: function () {
      if (C.inventoryHint.initialized) return; C.inventoryHint.initialized = true;
      var host = root.document.getElementById('inventory-affordance'), cfg = C.config.menuMotion;
      // The mounted sheet owns Peek; this compatibility lip stays hidden to avoid two sheet edges.
      var peek = root.document.createElement('div'); peek.className = 'inventory-peek glass glass--sheet'; peek.setAttribute('aria-hidden', 'true'); host.appendChild(peek);
      var cards = [];
      function refresh() {
        cards.forEach(function (card) { card.remove(); }); cards = [];
        C.state.current.inventory.slice(0, cfg.peekSlots).forEach(function () {
          var card = root.document.createElement('i'); card.className = 'inventory-peek__card'; peek.appendChild(card); cards.push(card);
        });
      }
      var arrow = root.document.createElement('button'); arrow.className = 'inventory-arrow'; arrow.setAttribute('type', 'button');
      arrow.setAttribute('aria-label', 'Inventory'); arrow.setAttribute('aria-disabled', 'true');
      var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M6 14l6-6 6 6'); svg.appendChild(path); arrow.appendChild(svg); host.appendChild(arrow);
      refresh(); C.events.on('save:written', refresh);
      C.events.on('menu:idle', function () { C.fx.wake(); });
      C.inventoryHint.el = host; C.inventoryHint.arrow = arrow; C.inventoryHint.peek = peek;
      var gallery = new URLSearchParams(root.location.search).get('gallery') === '1' && new URLSearchParams(root.location.search).get(C.config.dev.queryFlag) === '1';
      var time = 0, openingPaused = false, inventoryPaused = false, pulse = null;
      C.events.on('inventory:collectPulse', function () { pulse = 0; C.fx.wake(); });
      C.events.on('save:reset', function () { pulse = null; svg.style.transform = ''; });
      C.events.on('opening:context', function (event) { openingPaused = event.active; });
      C.events.on('inventory:context', function (event) { inventoryPaused = event.active; });
      C.fx.subscribe(function (now, dt) {
        var pulsing = pulse !== null;
        if (pulsing) {
          pulse += dt; var amount = Math.min(1, pulse / C.config.revealMotion.arrowPulseMs);
          svg.style.transform = C.motion.reduced ? 'none' : 'scale(' + (1 + Math.sin(amount * Math.PI) * (C.config.revealMotion.arrowPulseScale - 1)) + ')';
          svg.style.opacity = 0.7 + Math.sin(amount * Math.PI) * 0.3;
          if (amount === 1) { pulse = null; svg.style.transform = ''; svg.style.opacity = ''; }
        }
        if (!C.inventoryHint.visible || gallery || openingPaused || inventoryPaused || C.menu.idle || C.motion.reduced) { arrow.style.setProperty('--arrow-bob', '0px'); arrow.style.setProperty('--arrow-breath', 1); return pulse !== null; }
        time += dt;
        var p = time % cfg.arrowNudgeMs / cfg.arrowNudgeDurationMs;
        arrow.style.setProperty('--arrow-bob', (p < 1 ? -Math.sin(p * Math.PI) * cfg.arrowNudgePx : 0) + 'px');
        arrow.style.setProperty('--arrow-breath', cfg.arrowOpacity + Math.sin(time / cfg.arrowBreathMs * Math.PI * 2) * cfg.arrowOpacityRange);
        return true;
      }, 'inventory-arrow');
    }
  };
})(window.Cardable, window);
