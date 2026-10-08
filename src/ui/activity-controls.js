(function (C, root) {
  'use strict';
  // Local chrome uses cancellable deadlines, never a cosmetic frame subscriber.
  C.events.on('app:ready', function () {
    var counter = root.document.getElementById('currency-counter'), sheet = C.inventory.el, arrow = C.inventory.arrow;
    if (!counter || !sheet || !arrow || C.presentation.gallery) return;
    var creditTimer, peekTimer, creditNear = false, creditMenu = false, rewardActive = false, feedbackUntil = 0;
    var peekUntil = root.performance.now() + 5000, quiet = false;
    counter.tabIndex = 0;
    function distance(el, pointer) {
      var r = el.getBoundingClientRect();
      return Math.hypot(Math.max(r.left - pointer.x, 0, pointer.x - r.right), Math.max(r.top - pointer.y, 0, pointer.y - r.bottom));
    }
    function creditFocus() { return C.input.modality === 'keyboard' && counter.contains(root.document.activeElement); }
    function creditPinned() { return creditNear || creditMenu || rewardActive || creditFocus() || root.performance.now() < feedbackUntil; }
    function credits() {if(!C.settings.get('proximityChrome')){root.clearTimeout(creditTimer);counter.classList.add('is-credit-visible');return;}
      root.clearTimeout(creditTimer);
      if (root.document.hidden) return;
      var visible = creditPinned();
      counter.classList.toggle('is-credit-visible', visible);
      counter.classList.toggle('is-credit-pinned', creditMenu || rewardActive || creditFocus() || root.performance.now() < feedbackUntil);
      if (visible && !creditNear && !creditMenu && !rewardActive && !creditFocus())
        creditTimer = root.setTimeout(credits, Math.max(1, feedbackUntil - root.performance.now()));
    }
    function leaveCredits() { creditNear = false; root.clearTimeout(creditTimer); creditTimer = root.setTimeout(credits, 600); }
    function feedback() { feedbackUntil = root.performance.now() + 1500; credits(); }
    function peekPinned() {
      return C.inventory.active || C.inventory.gesturesActive || C.input.modality === 'keyboard' && (sheet.contains(root.document.activeElement) || arrow === root.document.activeElement) ||
        C.tutorial.active && C.tutorial.step === 'inventory';
    }
    function setQuiet(value) {
      quiet = value; root.document.body.classList.toggle('inventory-peek-quiet', value);
      C.inventoryHint.setVisible(!value); C.inventory.setPeekQuiet(value);
    }
    function armPeek() {if(!C.settings.get('proximityChrome')){root.clearTimeout(peekTimer);setQuiet(false);return;}
      root.clearTimeout(peekTimer); if (root.document.hidden) return;
      if (peekPinned()) { setQuiet(false); return; }
      var remaining = peekUntil - root.performance.now();
      if (remaining <= 0) setQuiet(true); else peekTimer = root.setTimeout(armPeek, remaining);
    }
    function wakePeek() { peekUntil = root.performance.now() + 5000; setQuiet(false); armPeek(); }
    C.events.on('pointer:move', function (event) {
      var p = event.pointer; if (!p || !p.inside) return;
      if (distance(counter, p) <= 160) { creditNear = true; credits(); } else if (creditNear) leaveCredits();
      if (!C.inventory.active && C.opening.phase === 'idle' && !C.preferences.open && Math.min(distance(arrow, p), distance(sheet, p)) <= 160) {
        wakePeek(); C.inventory.warmPeek(true);
      } else armPeek();
    });
    C.events.on('input:modality', function () { credits(); armPeek(); });
    C.events.on('pointer:leave', function () { leaveCredits(); armPeek(); });
    C.events.on('currency:rewardPresentation', function (active) { rewardActive = active; credits(); });
    C.events.on('currency:changed', feedback); C.events.on('currency:insufficient', feedback); C.events.on('pack:reward', feedback);
    C.events.on('contextmenu:open', function (ctx) { creditMenu = ctx.target === 'currency'; credits(); });
    C.events.on('contextmenu:close', function () { creditMenu = false; leaveCredits(); });
    C.events.on('inventory:context', wakePeek); C.events.on('tutorial:context', armPeek); C.events.on('save:written', armPeek);
    C.events.on('menu:idle', function (idle) { if (idle) { creditNear = false; credits(); } });
    root.document.addEventListener('focusin', function () { credits(); if (peekPinned()) wakePeek(); });
    root.document.addEventListener('focusout', function () { root.queueMicrotask(function () { credits(); armPeek(); }); });
    root.document.addEventListener('pointerdown', function (event) {
      if (C.inventory.active || C.opening.phase !== 'idle' || C.preferences.open || C.friendly.active || C.commands.active) return;
      if (sheet.contains(event.target) || arrow.contains(event.target)) wakePeek();
      else if (quiet && event.pointerType === 'touch' && Math.min(distance(arrow, { x: event.clientX, y: event.clientY }), distance(sheet, { x: event.clientX, y: event.clientY })) <= 64) {
        wakePeek(); C.inventory.request(true);
      }
    });
    root.document.addEventListener('visibilitychange', function () {
      root.clearTimeout(creditTimer); root.clearTimeout(peekTimer);
      if (!root.document.hidden) { credits(); armPeek(); }
    });
    C.settings.onChange('proximityChrome',function(){credits();armPeek();});credits(); armPeek();
  });
})(window.Cardable, window);
