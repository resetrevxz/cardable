(function (C, root) {
  'use strict';
  var cfg, shell, instruction, skipButton, ghost, cutHint, step = 'done', active = false, phase = 'idle';
  var elapsed = 0, pulseClock = 0, ghostClock = 0, cutStarted = false, target = null, lastContext = '', opacity = 0, exitMs = 0, uiMs, shellOpacity = 0;
  var steps = ['welcome', 'hold', 'cut', 'keep', 'inventory', 'timer', 'done'];
  var stats = { updates: 0, advances: 0, ghostCycles: 0 };
  var packHost, wrapperHost, keepControl, inventoryHost, meta, toastHost, enter;
  var inventoryActive = false;
  var preferencesActive = false;
  var layoutDirty = true, fastMs;
  function first(parent, selector) { return parent.querySelectorAll(selector)[0] || null; }
  function copy() {
    var hours = C.config.packs.regenMs / 3600000;
    var interval = Number.isInteger(hours) ? hours + (hours === 1 ? ' hour' : ' hours') : C.config.packs.regenMs / 60000 + ' minutes';
    return { welcome: 'You have ' + C.state.current.packs.ready + (C.state.current.packs.ready === 1 ? ' pack.' : ' packs.'), hold: 'Hold ' + C.settings.holdKey + ' to open.',
      cut: 'Drag across the top to cut.', keep: 'Press Space to keep it.', inventory: 'Your cards live here.',
      timer: 'A new pack arrives every ' + interval + '.', done: '' }[step];
  }
  function clearTarget() { if (target) target.classList.remove('is-tutorial-target'); target = null; }
  function adopt() {
    var saved = C.state.current.tutorial;
    var next = saved.done ? 'done' : (steps.indexOf(saved.step) !== -1 ? saved.step : 'welcome');
    if (next === step && active === (next !== 'done')) return;
    var wasActive = active;
    layoutDirty = true; clearTarget(); step = next; active = step !== 'done'; elapsed = 0; pulseClock = 0; ghostClock = 0; opacity = 0;
    if (step === 'cut') cutStarted = false;
    C.tutorial.step = step; C.tutorial.active = active;
    if (active && !wasActive) shellOpacity = 0;
    shell.hidden = false; exitMs = active ? 0 : uiMs; skipButton.disabled = !active;
    if (active) { instruction.textContent = copy(); instruction.style.opacity = 0; }
    root.document.body.classList.toggle('has-tutorial', active);
    C.events.emit('menu:visibilityHold', { reason: 'tutorial', active: active });
    if (!active) {
      cutHint.dataset.tutorial = ''; cutHint.closest('.opening-hint').dataset.tutorial = ''; cutHint.classList.remove('is-cut-started');
      C.events.emit('menu:activity');
    }
    lastContext = ''; layout(); C.fx.wake();
  }
  function advance(next) {
    if (!active || next === step) return;
    C.state.current.tutorial.step = next; C.state.current.tutorial.done = next === 'done';
    stats.advances += 1; C.state.save();
  }
  function skip() { if (active) advance('done'); }
  function reconcile() {
    // Restore an unfinished cut lesson using the existing committed-wrapper replay.
    // Presentation resets, while the exact pull, serials and stock stay reserved.
    if (!active) return;
    if (C.state.current.pendingReveal && step === 'cut') {
      if (phase === 'revealed') C.events.emit('opening:replay');
    } else if (C.state.current.pendingReveal && ['welcome', 'hold', 'inventory', 'timer'].indexOf(step) !== -1) advance('keep');
    else if (!C.state.current.pendingReveal && (step === 'cut' || step === 'keep')) advance(C.state.current.inventory.length ? 'inventory' : 'hold');
  }
  function lessonTarget() {
    if (inventoryActive || preferencesActive) return null;
    if (step === 'welcome' && phase === 'idle') return packHost;
    if (step === 'hold') {
      if (phase === 'idle') return packHost;
      if (phase === 'charging' || phase === 'draining') return wrapperHost;
    }
    if (step === 'cut' && phase === 'cutting') return wrapperHost;
    if (step === 'keep' && phase === 'revealed') {
      return keepControl && !keepControl.hidden && !keepControl.disabled ? keepControl : null;
    }
    if (phase === 'idle') {
      if (step === 'inventory') {
        if (!toastHost || toastHost.hidden) return inventoryHost;
      }
      if (step === 'timer') return meta;
    }
    return null;
  }
  function layout() {
    var nextTarget = active ? lessonTarget() : null, body = root.document.body;
    if (!layoutDirty && nextTarget === target) return !!target;
    layoutDirty = false;
    if (nextTarget !== target) { clearTarget(); target = nextTarget; if (target) target.classList.add('is-tutorial-target'); }
    body.dataset.tutorial = target ? step : '';
    cutHint.dataset.tutorial = active && step === 'cut' && phase === 'cutting' ? 'cut' : '';
    cutHint.closest('.opening-hint').dataset.tutorial = cutHint.dataset.tutorial;
    cutHint.classList.toggle('is-cut-started', cutStarted);
    if (enter) enter.textContent = cutHint.dataset.tutorial ? 'Press ' + C.settings.actionKey + ' to tear' : C.settings.actionKey + ' to tear';
    var halo = null;
    if (target) {
      var rect = target.getBoundingClientRect();
      if (step === 'inventory') { var arrow = target.querySelector('button'); if (arrow) rect = arrow.getBoundingClientRect(); }
      halo = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
        rx: rect.width / 2 + cfg.haloPaddingPx, ry: rect.height / 2 + cfg.haloPaddingPx };
      var textRect = instruction.getBoundingClientRect(), x = halo.x, y = rect.top - cfg.instructionGapPx - textRect.height;
      if (step === 'keep') { x = rect.left + rect.width + cfg.instructionGapPx + textRect.width / 2; y = halo.y - textRect.height / 2; }
      if (step === 'timer') y = rect.top + rect.height + cfg.instructionGapPx;
      x = Math.max(cfg.safeMarginPx + textRect.width / 2, Math.min(root.innerWidth - cfg.safeMarginPx - textRect.width / 2, x));
      y = Math.max(cfg.safeMarginPx, Math.min(root.innerHeight - cfg.safeMarginPx - textRect.height, y));
      instruction.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translateX(-50%)';
    }
    var context = { gridDim: target ? cfg.gridDim : 0, halo: halo }, key = JSON.stringify(context);
    if (key !== lastContext) { lastContext = key; C.events.emit('tutorial:context', context); }
    return !!target;
  }
  function update(now, dt) {
    if (!active) {
      if (exitMs <= 0) return false;
      exitMs = Math.max(0, exitMs - dt); shell.style.opacity = (1 - Math.pow(1 - shellOpacity, 3)) * Math.pow(exitMs / uiMs, 3);
      if (!exitMs) shell.hidden = true;
      return exitMs > 0;
    }
    stats.updates += 1;
    shellOpacity = Math.min(1, shellOpacity + dt / uiMs); shell.style.opacity = 1 - Math.pow(1 - shellOpacity, 3);
    var visible = layout(), fadeMs = fastMs;
    opacity = visible ? Math.min(1, opacity + dt / fadeMs) : Math.max(0, opacity - dt / fadeMs);
    instruction.style.opacity = 1 - Math.pow(1 - opacity, 3);
    if (visible) {
      elapsed += dt; pulseClock += dt;
      var pulse = C.motion.reduced || !C.settings.policy.animation ? 1 : cfg.pulseMin + (1 - cfg.pulseMin) * (1 + Math.sin(pulseClock / cfg.pulseMs * Math.PI * 2)) / 2;
      shell.style.setProperty('--tutorial-pulse', pulse); root.document.body.style.setProperty('--tutorial-pulse', pulse);
      if (step === 'cut' && !cutStarted) {
        ghostClock += dt; stats.ghostCycles = Math.floor(ghostClock / cfg.ghostMs);
        ghost.style.strokeDashoffset = C.motion.reduced || !C.settings.policy.animation ? 0 : 1 - ghostClock % cfg.ghostMs / cfg.ghostMs;
      }
      if (step === 'welcome' && elapsed >= cfg.welcomeMs) advance('hold');
      else if (step === 'inventory' && elapsed >= cfg.inventoryMs) advance('timer');
      else if (step === 'timer' && elapsed >= cfg.timerMs) advance('done');
    }
    var timed = visible && ['welcome', 'inventory', 'timer'].indexOf(step) !== -1;
    var moving = visible && C.settings.policy.animation > 0 && !C.motion.reduced && (step === 'hold' || step === 'inventory' || step === 'cut' && !cutStarted);
    return active && (timed || moving || opacity > 0 && opacity < 1 || shellOpacity < 1);
  }
  C.tutorial = {
    initialized: false, active: false, step: 'done', stats: stats,
    init: function () {
      if (C.tutorial.initialized) return;
      C.tutorial.initialized = true;
      var query = new URLSearchParams(root.location.search);
      if (C.presentation.gallery) return;
      cfg = C.config.tutorialMotion; phase = C.opening.phase;
      uiMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-ui'));
      fastMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-fast'));
      cutHint = first(root.document.body, '.opening-cut-hint');
      if (!cutHint) return;
      packHost = root.document.getElementById('pack-stage'); wrapperHost = first(root.document.body, '.opening-pack');
      keepControl = first(root.document.body, '.opening-keep'); inventoryHost = root.document.getElementById('inventory-affordance');
      meta = first(packHost, '.pack-meta'); toastHost = first(root.document.body, '.collection-toast'); enter = first(root.document.body, '.opening-enter-hint');
      shell = C.packMarkup.node('aside', 'tutorial', root.document.body); shell.hidden = true; shell.setAttribute('aria-label', 'Getting started');
      instruction = C.packMarkup.node('p', 'tutorial-instruction', shell); instruction.setAttribute('role', 'status'); instruction.setAttribute('aria-live', 'polite'); instruction.setAttribute('aria-atomic', 'true');
      skipButton = C.packMarkup.node('button', 'tutorial-skip', shell, 'Skip'); skipButton.setAttribute('type', 'button'); skipButton.setAttribute('aria-label', 'Skip tutorial');
      skipButton.addEventListener('click', function (event) { if (event.button === 0) skip(); });
      var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'tutorial-ghost'); svg.setAttribute('viewBox', '0 0 100 20'); svg.setAttribute('aria-hidden', 'true'); cutHint.appendChild(svg);
      ghost = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); ghost.setAttribute('d', cfg.ghostPath); ghost.setAttribute('pathLength', '1'); svg.appendChild(ghost);
      C.tutorial.el = shell; C.tutorial.instruction = instruction; C.tutorial.skipButton = skipButton; C.tutorial.ghost = ghost;
      root.document.body.style.setProperty('--tutorial-dim', cfg.chromeOpacity);
      C.events.on('save:written', adopt);
      C.events.on('save:reset', function () { adopt(); });
      C.events.on('save:imported', reconcile);
      C.events.on('tutorial:replay', function () { elapsed = 0; adopt(); reconcile(); });
      C.events.on('opening:context', function (event) { phase = event.phase; layout(); C.fx.wake(); });
      C.events.on('opening:keepReady', function () { layout(); C.fx.wake(); });
      C.events.on('charge:start', function () { if (active && step === 'welcome') advance('hold'); });
      C.events.on('opening:prepareCommit', function (candidate) { if (active && (step === 'welcome' || step === 'hold')) { candidate.tutorial.step = 'cut'; candidate.tutorial.done = false; } });
      C.events.on('opening:prepareKeep', function (event) { if (active && step === 'keep' && event.final) { event.candidate.tutorial.step = 'inventory'; event.candidate.tutorial.done = false; } });
      C.events.on('reveal:phase', function (next) { if (active && step === 'cut' && next === 'rising') advance('keep'); });
      C.events.on('cut:started', function () { cutStarted = true; layoutDirty = true; layout(); C.fx.wake(); });
      C.events.on('inventory:open', function () { if (active && step === 'inventory' && phase === 'idle') advance('timer'); });
      C.events.on('inventory:context', function (event) { inventoryActive = event.active; layout(); C.fx.wake(); });
      C.settings.onChange('openKey', function () { instruction.textContent = copy(); layoutDirty = true; C.fx.wake(); });
      C.events.on('preferences:context', function (event) { preferencesActive = event.active; layout(); C.fx.wake(); });
      C.events.on('motion:changed', function () { C.fx.wake(); });
      C.events.on('fx:visibility', function () { C.fx.wake(); });
      root.document.getElementById('pack-stage').addEventListener('pointerenter', function () { if (active && step === 'welcome') advance('hold'); });
      root.document.addEventListener('keydown', function (event) { if (!preferencesActive && active && event.key === 'Escape') { if (event.preventDefault) event.preventDefault(); skip(); } });
      root.addEventListener('resize', function () { layoutDirty = true; layout(); C.fx.wake(); });
      if (root.document.fonts && root.document.fonts.ready) root.document.fonts.ready.then(function () { layoutDirty = true; layout(); C.fx.wake(); });
      C.fx.subscribe(update, 'tutorial'); adopt(); reconcile();
    }
  };
})(window.Cardable, window);
