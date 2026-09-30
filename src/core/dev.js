(function (C, root) {
  'use strict';
  var forcedTier = null;
  var fpsValue = 0;
  var openingPhase = 'idle';
  function node(tag, text) { var el = root.document.createElement(tag); if (text) el.textContent = text; return el; }
  function button(label, action) {
    var el = node('button', label);
    el.addEventListener('click', function () {
      if (openingPhase !== 'idle' && label !== 'Reset save' && label !== 'Replay committed reveal' && label.indexOf('Profile current screen') !== 0 && !(openingPhase === 'revealed' && label === 'Toggle rarityColorMode')) return;
      action();
    });
    return el;
  }
  function report(ok, label, detail) {
    var line = (ok ? 'PASS ' : 'FAIL ') + label + (detail ? ' — ' + detail : '');
    root.console[ok ? 'log' : 'error']('[Cardable check] ' + line);
    if (C.dev.output) C.dev.output.textContent += line + '\n';
    return ok;
  }
  function validateData() {
    var errors = [], warnings = [], ids = Object.create(null), rarities = C.data.rarities || [], cards = C.data.cards || [], generations = C.data.generations || [], sum = 0;
    rarities.forEach(function (r) { if (r.pullable && Number.isFinite(Number(r.chance))) sum += Number(r.chance); });
    if (Math.abs(sum - 100) > 1e-8) warnings.push('Pullable rarity chances sum to ' + sum + ' (expected 100).');
    function unique(items, kind) { items.forEach(function (item) { if (ids[kind + ':' + item.id]) errors.push('Duplicate ' + kind + ' id: ' + item.id); ids[kind + ':' + item.id] = true; }); }
    unique(rarities, 'rarity'); unique(cards, 'card'); unique(generations, 'generation'); unique(C.data.packs || [], 'pack');
    cards.forEach(function (card) {
      if (!rarities.some(function (r) { return r.id === card.rarity; })) errors.push('Card ' + card.id + ' references unknown rarity ' + card.rarity);
      if (!generations.some(function (g) { return g.id === card.generation; })) errors.push('Card ' + card.id + ' references unknown generation ' + card.generation);
    });
    var finishes = C.finishes && C.finishes.registry ? C.finishes.registry : {};
    rarities.forEach(function (rarity) {
      if (!finishes[rarity.finish]) warnings.push('Rarity ' + rarity.id + ' has no registered finish yet (' + rarity.finish + ').');
      if (rarity.pullable && !cards.some(function (card) { return card.rarity === rarity.id && card.pullable !== false; })) warnings.push('Pullable tier ' + rarity.id + ' has no pullable cards; emptyTierPolicy=' + C.config.pull.emptyTierPolicy + '.');
    });
    warnings.forEach(function (message) { root.console.warn('[Cardable data] ' + message); });
    errors.forEach(function (message) { root.console.error('[Cardable data] ' + message); });
    root.console.info('[Cardable data] validation: ' + errors.length + ' error(s), ' + warnings.length + ' warning(s).');
    return { errors: errors, warnings: warnings };
  }
  function runChecks() {
    var passed = true, cfg = C.config, oldState = C.state.current;
    var oldSave = C.state.save;
    // Simulations must not overwrite the player's real saved state.
    C.state.save = function () {};

    var timerState = C.state.migrate({ schemaVersion: 1, playerCode: '2345', createdAt: 1,
      packs: { ready: 0, timerStartedAt: 0 }, serialCounter: 0, inventory: [], pendingReveal: null, currency: 0,
      tutorial: { step: 'welcome', done: false }, settings: {}, stats: {} });
    C.state.current = timerState;
    var catchup = C.timers.tick(20 * 60 * 60 * 1000);
    passed = report(catchup.ready === 2, 'timer catch-up after 20 hours respects cap 2', 'ready=' + catchup.ready) && passed;
    timerState.packs = { ready: 0, timerStartedAt: 10000 };
    var backwards = C.timers.tick(9000);
    passed = report(backwards.gained === 0 && timerState.packs.timerStartedAt === 9000, 'timer ignores a backwards clock') && passed;

    var fixtures = C.data.rarities.filter(function (r) { return r.pullable; }).map(function (r) {
      return { id: 'fixture-' + r.id, rarity: r.id, pullable: true };
    });
    var counts = Object.create(null), sample = 100000, pack = { tierWeightModifiers: {} };
    C.data.rarities.filter(function (r) { return r.pullable; }).forEach(function (r) { counts[r.id] = 0; });
    for (var i = 0; i < sample; i += 1) {
      var selected = C.pull.pullCard(pack, { cards: fixtures, random: Math.random });
      counts[fixtures.find(function (card) { return card.id === selected.cardId; }).rarity] += 1;
    }
    var chanceSum = C.data.rarities.filter(function (r) { return r.pullable; }).reduce(function (n, r) { return n + r.chance; }, 0);
    var distributionOK = C.data.rarities.filter(function (r) { return r.pullable; }).every(function (r) {
      var actual = counts[r.id] * 100 / sample, expected = r.chance * 100 / chanceSum;
      return Math.abs(actual - expected) <= Math.max(0.1, expected * 0.25);
    });
    var limited = C.data.rarities.find(function (r) { return r.id === 'limited'; });
    passed = report(distributionOK && (!limited || !limited.pullable), '100,000 pulls follow normalized tier chances; Limited never appears', distributionOK ? 'tiers within tolerance' : JSON.stringify(counts)) && passed;

    var emptyTier = C.data.rarities.find(function (r) { return r.pullable && !C.data.cards.some(function (card) { return card.rarity === r.id && card.pullable !== false; }); });
    var downgradeOK = !emptyTier || C.config.pull.emptyTierPolicy !== 'downgrade' || (function () {
      var cards = C.data.cards.filter(function (card) { return card.rarity !== emptyTier.id && card.pullable !== false; });
      var lower = C.data.rarities.slice(0, C.data.rarities.indexOf(emptyTier)).reverse().find(function (tier) { return tier.pullable && cards.some(function (card) { return card.rarity === tier.id; }); });
      if (!lower) return false;
      var result = C.pull.pullCard(pack, { cards: cards, forcedTier: emptyTier.id, random: function () { return 0; } });
      return result.cardId === cards.find(function (card) { return card.rarity === lower.id; }).id;
    })();
    passed = report(downgradeOK, 'emptyTierPolicy downgrade selects the next lower non-empty tier') && passed;

    C.state.current = C.state.migrate({ schemaVersion: 1, playerCode: '2345', createdAt: 1,
      packs: { ready: 0, timerStartedAt: null }, serialCounter: 0, inventory: [], pendingReveal: null, currency: 0,
      tutorial: { step: 'welcome', done: false }, settings: {}, stats: {} });
    var serials = new Set(), serialOK = true;
    for (var s = 0; s < 10000; s += 1) {
      var serial = C.serial.next();
      if (!/^CBL-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-\d{6,}$/.test(serial) || serials.has(serial)) serialOK = false;
      serials.add(serial);
    }
    passed = report(serialOK && serials.size === 10000, '10,000 generated serials are unique and formatted') && passed;
    C.state.save = oldSave;
    C.state.current = oldState;

    var storageKey = cfg.storage.key, testKey = storageKey + '.stage0-check';
    var storage = null;
    try { storage = root.localStorage; } catch (_) {}
    if (!storage) passed = report(false, 'save survives reload and corrupted-save recovery', 'localStorage unavailable') && passed;
    else {
      var prior = cfg.storage.key, priorRecovery = C.state.recovery;
      try {
        cfg.storage.key = testKey;
        C.state.current = C.state.fresh(123);
        C.state.current.playerCode = '7K3F';
        C.state.save();
        C.state.current = null;
        var reloaded = C.state.load();
        var persisted = reloaded.playerCode === '7K3F' && Number(reloaded.createdAt) === 123;
        storage.setItem(testKey, '{broken json');
        C.state.current = null;
        var recovered = C.state.load();
        var corruptHandled = storage.getItem(testKey + '.corrupt') === '{broken json' && recovered.playerCode !== undefined;
        passed = report(persisted && corruptHandled, 'save survives reload and corrupted save is backed up and replaced') && passed;
      } catch (error) {
        passed = report(false, 'save survives reload and corrupted-save recovery', error.message) && passed;
      } finally {
        cfg.storage.key = prior;
        try { storage.removeItem(testKey); storage.removeItem(testKey + '.corrupt'); } catch (_) {}
        C.state.current = oldState;
        C.state.recovery = priorRecovery; C.events.emit('save:written', oldState);
      }
    }
    return passed;
  }
  function init() {
    var params;
    try { params = new URLSearchParams(root.location.search); } catch (_) { params = new URLSearchParams(''); }
    if (params.get(C.config.dev.queryFlag) !== '1') return;
    var panel = node('aside');
    panel.className = 'dev-panel glass idle-chrome entrance';
    panel.style.setProperty('--entry', 2);
    panel.setAttribute('aria-label', 'Developer tools');
    panel.appendChild(node('div', 'CARDABLE / DEV'));
    var select = node('select');
    select.setAttribute('aria-label', 'Force next pull tier');
    select.appendChild(new Option('Force next pull: off', ''));
    C.data.rarities.filter(function (r) { return r.pullable; }).forEach(function (r) { select.appendChild(new Option('Force next pull: ' + r.name, r.id)); });
    select.addEventListener('change', function () { forcedTier = select.value || null; });
    panel.appendChild(select);
    panel.appendChild(button('Grant a pack', function () {
      C.timers.tick();
      var packs = C.state.current.packs;
      if (packs.ready >= C.config.packs.maxStored) return;
      packs.ready += 1;
      if (packs.ready >= C.config.packs.maxStored) packs.timerStartedAt = null;
      else if (packs.timerStartedAt == null) packs.timerStartedAt = Date.now();
      C.state.save();
      C.events.emit('pack:ready', { ready: packs.ready, gained: 1 });
    }));
    panel.appendChild(button('Skip timer', function () {
      var p = C.state.current.packs;
      if (p.ready >= C.config.packs.maxStored) C.timers.openPack(Date.now());
      p.timerStartedAt = Date.now() - C.config.packs.regenMs;
      C.timers.tick(Date.now());
    }));
    panel.appendChild(button('Consume a pack (dev only)', function () { C.timers.openPack(Date.now()); }));
    function waiting(progress) {
      progress = Math.max(0, Math.min(1, progress));
      C.state.current.packs = { ready: 0, timerStartedAt: Date.now() - C.config.packs.regenMs * progress };
      C.state.save(); C.fx.wake();
    }
    panel.appendChild(button('Waiting: empty', function () { waiting(0); }));
    panel.appendChild(button('Waiting: halfway', function () { waiting(0.5); }));
    panel.appendChild(button('Waiting: nearly ready', function () { waiting(1 - C.config.menuMotion.previewReadyLeadMs / C.config.packs.regenMs); }));
    Object.keys(C.config.menuMotion.previewCountdownsMs).forEach(function (unit) {
      panel.appendChild(button('Waiting: ' + unit, function () { waiting(1 - C.config.menuMotion.previewCountdownsMs[unit] / C.config.packs.regenMs); }));
    });
    panel.appendChild(button('Add currency (dev only)', function () { C.currency.add(C.config.menuMotion.previewCurrencyAmount); }));
    panel.appendChild(button('Reset save', function () { C.state.reset(); }));
    var replay = button('Replay committed reveal', function () { C.events.emit('opening:replay'); });
    replay.disabled = true; panel.appendChild(replay);
    var openingStatus = node('div', 'Opening: idle'); panel.appendChild(openingStatus);
    C.events.on('opening:context', function (event) {
      openingPhase = event.phase;
      openingStatus.textContent = 'Opening: ' + event.phase + (event.phase === 'revealed' ? ' · pull reserved' : '');
      panel.querySelectorAll('button').forEach(function (control) {
        control.disabled = control === replay ? event.phase !== 'revealed' : event.active && control.textContent !== 'Reset save' && !(event.phase === 'revealed' && control.textContent === 'Toggle rarityColorMode');
      });
      select.disabled = event.active;
    });
    panel.appendChild(button('Replay tutorial', function () {
      C.state.current.tutorial = { step: 'welcome', done: false };
      C.state.save();
      C.events.emit('tutorial:replay');
    }));
    panel.appendChild(button('Preview 300 inventory tiles', function () { C.events.emit('inventory:preview', true); C.events.emit('inventory:request', true); }));
    var performanceButton = button('Profile current screen · 5 s', function () { C.profiler.start(root.document.body.dataset.phase || (C.inventory.active ? 'inventory' : 'menu')); performanceButton.textContent = 'Profiling…'; });
    panel.appendChild(performanceButton);
    performanceButton.setAttribute('title', 'Profile any phase with Ctrl+Shift+P');
    root.document.addEventListener('keydown', function (event) { if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p' && !event.repeat) { event.preventDefault(); C.profiler.start('current screen'); performanceButton.textContent = 'Profiling…'; } });
    C.events.on('profile:finished', function (sample) { performanceButton.textContent = sample.valid ? sample.fps.toFixed(1) + ' FPS · p95 ' + sample.p95Ms.toFixed(1) + ' ms' : 'Sample interrupted · retry'; });
    panel.appendChild(button('Toggle rarityColorMode', function () {
      C.config.rarityColorMode = C.config.rarityColorMode === 'color' ? 'mono' : 'color';
      mode.textContent = 'rarityColorMode: ' + C.config.rarityColorMode;
      C.events.emit('settings:rarityColorMode', C.config.rarityColorMode);
    }));
    panel.appendChild(button('Test pack-ready title', function () {
      titleHint.textContent = 'Switch tabs now; title event in 1 second.';
      root.setTimeout(function () {
        C.events.emit('pack:ready', { ready: 1, simulated: true });
        titleHint.textContent = 'Title event sent. Returning shows Cardable.';
      }, C.config.shell.dev.titleTestDelayMs);
    }));
    var mode = node('div', 'rarityColorMode: ' + C.config.rarityColorMode);
    var fps = node('div', 'FPS: idle'), titleHint = node('div');
    panel.appendChild(mode); panel.appendChild(fps); panel.appendChild(titleHint);
    C.dev = { panel: panel, output: node('pre'), validateData: validateData, runChecks: runChecks,
      peekForcedTier: function () { return forcedTier; },
      consumeForcedTier: function () { var tier = forcedTier; forcedTier = null; select.value = ''; return tier; },
      get fps() { return fpsValue; } };
    root.document.body.appendChild(panel);
    var details = node('details');
    details.appendChild(node('summary', 'Checks and data validation'));
    details.appendChild(C.dev.output); panel.appendChild(details);
    var validation = validateData();
    C.dev.output.textContent += 'Data validation: ' + validation.errors.length + ' error(s), ' + validation.warnings.length + ' warning(s).\n';
    runChecks();
    var frames = 0, last = root.performance.now();
    C.events.on('fx:wake', function () { frames = 0; last = root.performance.now(); fps.textContent = 'FPS: measuring'; });
    C.events.on('fx:frame', function (event) {
      frames += 1;
      if (event.now - last >= C.config.shell.dev.fpsSampleMs) {
        fpsValue = Math.round(frames * 1000 / (event.now - last)); frames = 0; last = event.now;
        fps.textContent = 'FPS: ' + fpsValue + ' · frames ' + event.frameCount;
      }
    });
    C.events.on('fx:sleep', function (stats) { fpsValue = 0; fps.textContent = 'FPS: idle · frames ' + stats.frameCount; });
  }
  C.dev = { init: init, validateData: validateData, runChecks: runChecks,
    peekForcedTier: function () { return forcedTier; },
    consumeForcedTier: function () { var tier = forcedTier; forcedTier = null; return tier; } };
})(window.Cardable, window);
