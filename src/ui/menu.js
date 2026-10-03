(function (C, root) {
  'use strict';
  var holds = new Set(), idleTimer = null, afkTimer = null, waveTimer = null, lastActivity = 0, queuedWave = false;
  var notifiedReady = false, manualIdle = false;
  var favicon = null, faviconStates = {}, faviconReady = null;
  function setIdle(value) {
    value = value && (manualIdle || !holds.size);
    if (C.menu.idle === value) return;
    root.document.body.classList.toggle('is-idle', value);
    C.menu.idle = value;
    C.events.emit('menu:idle', value);
  }
  function arm() {
    root.clearTimeout(idleTimer); root.clearTimeout(afkTimer); root.clearTimeout(waveTimer);
    if (root.document.hidden) return;
    var elapsed = root.performance.now() - lastActivity;
    var idleMs = C.settings.idleMs;
    if (idleMs === Infinity) { quiet(false); setIdle(false); }
    else if (elapsed >= idleMs) { quiet(true); setIdle(true); }
    else idleTimer = root.setTimeout(function () { quiet(true); setIdle(true); }, idleMs - elapsed);
    var afkMs = C.config.shell.afkMs;
    if (elapsed >= afkMs) setAfk(true);
    else afkTimer = root.setTimeout(function () { setAfk(true); }, afkMs - elapsed);
    if (elapsed >= C.config.shell.idleWaveMs) queuedWave = true;
    else waveTimer = root.setTimeout(function () { queuedWave = true; }, C.config.shell.idleWaveMs - elapsed);
  }
  function quiet(value) { root.document.body.classList.toggle('is-quiet', value); }
  function setAfk(value) {
    if (C.menu.afk === value) return;
    C.menu.afk = value;
    root.document.body.classList.toggle('is-afk', value);
    C.events.emit('menu:afk', value);
    C.fx.wake();
  }
  function activity() {
    manualIdle = false;
    lastActivity = root.performance.now();
    quiet(false);
    setAfk(false);
    setIdle(false);
    if (queuedWave) { queuedWave = false; C.events.emit('logo:wave'); }
    arm();
  }
  function keyboardHold() {
    var active = root.document.activeElement;
    var control = active && active.matches && active.matches('button, input, select, textarea, a[href], [tabindex]');
    C.menu.holdVisible('keyboard', C.input.modality === 'keyboard' && !!control);
  }
  function title() {
    var hidden = root.document.hidden;
    var ready = C.state.current && C.state.current.packs.ready > 0;
    var full = C.state.current && C.state.current.packs.ready >= C.config.packs.maxStored;
    var waiting = C.state.current && !full && !notifiedReady;
    var remaining = waiting ? C.timers.remaining(Date.now()) : 0;
    var suffix = waiting ? ' · ' + C.timers.format(remaining) + ' · ' + Math.ceil(remaining / C.config.packs.regenMs * 100) + '%' : full || notifiedReady ? ' · pack ready' : '';
    var next = C.packs.upcoming(1)[0];
    var nextTitle = ready && next && next.cadence ? C.config.gameName + ' - ' + next.name.replace(/ Pack$/, ' pack') + ' ready' : C.config.gameName + suffix;
    if (root.document.title !== nextTitle) root.document.title = nextTitle;
    var showReady = ready || hidden && notifiedReady;
    if (favicon && faviconReady !== showReady) { faviconReady = showReady; favicon.setAttribute('href', faviconStates[showReady ? 'ready' : 'normal']); }
  }
  C.menu = {
    initialized: false, idle: false, afk: false,
    hideInterface: function () { manualIdle = true; quiet(true); setIdle(true); C.fx.wake(); },
    holdVisible: function (reason, value) {
      if (value === false) holds.delete(reason); else holds.add(reason);
      if (manualIdle) return;
      if (holds.size) setIdle(false); else arm();
    },
    refreshTitle: title,
    init: function () {
      if (C.menu.initialized) return;
      C.menu.initialized = true;
      var shell = C.config.shell, body = root.document.body;
      body.style.setProperty('--load-stagger', shell.loadStaggerMs + 'ms');
      body.style.setProperty('--pack-width', shell.packWidth + 'px');
      body.style.setProperty('--pack-height', shell.packHeight + 'px');
      var firstFrame = true;
      var unsubscribe = C.fx.subscribe(function () {
        if (firstFrame) { firstFrame = false; return true; }
        body.classList.add('is-loaded');
        var fadeMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-ui'));
        root.setTimeout(function () { body.classList.add('has-entered'); }, shell.loadStaggerMs * 2 + fadeMs);
        unsubscribe(); return false;
      });
      lastActivity = root.performance.now(); arm();
      C.events.on('pointer:activity', activity);
      C.events.on('menu:activity', activity);
      ['pointerdown', 'keydown', 'wheel', 'input'].forEach(function (name) { root.document.addEventListener(name, activity, { capture: true, passive: true }); });
      C.settings.onChange('idleFade', activity);
      C.events.on('input:modality', keyboardHold);
      C.events.on('menu:visibilityHold', function (event) { C.menu.holdVisible(event.reason, event.active); });
      root.document.addEventListener('focusin', keyboardHold);
      root.document.addEventListener('focusout', function () { root.setTimeout(keyboardHold, 0); });
      C.events.on('pack:ready', function (event) { if (event) notifiedReady = event.ready > 0; title(); });
      C.events.on('pack:opened', function () { notifiedReady = false; title(); });
      C.events.on('save:reset', function () { notifiedReady = false; title(); });
      C.events.on('save:imported', function () { notifiedReady = false; title(); });
      C.events.on('timer:tick', title);
      C.events.on('save:written', title);
      C.events.on('packs:queueChanged', title);
      root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden) notifiedReady = false; title(); arm(); });
      title();
      favicon = root.document.getElementById('favicon');
      var tokens = root.getComputedStyle(root.document.documentElement);
      var mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="' + tokens.getPropertyValue('--bg').trim() + '"/><path d="M44 20C40 16 35 15 31 16C21 18 16 25 16 32C16 42 22 49 32 49C37 49 41 47 44 44" fill="none" stroke="' + tokens.getPropertyValue('--text').trim() + '" stroke-width="8" stroke-linecap="round"/></svg>';
      faviconStates.normal = 'data:image/svg+xml,' + encodeURIComponent(mark);
      faviconStates.ready = 'data:image/svg+xml,' + encodeURIComponent(mark.replace('</svg>', '<circle cx="53" cy="11" r="' + C.config.polish.faviconReadyDotPx + '" fill="' + tokens.getPropertyValue('--text').trim() + '"/></svg>'));
      title();
    }
  };
})(window.Cardable, window);
