(function (C, root) {
  'use strict';
  var forcedTier = null;
  var fpsValue = 0;
  function node(tag, text) { var el = root.document.createElement(tag); if (text) el.textContent = text; return el; }
  function button(label, action) {
    var el = node('button', label);
    el.addEventListener('click', action);
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

    var timerState = C.state.migrate({ schemaVersion: 1, playerCode: '2345', createdAt: 1,
      packs: { ready: 0, timerStartedAt: 0 }, serialCounter: 0, inventory: [], pendingReveal: null, currency: 0,
      tutorial: { step: 'welcome', done: false }, settings: {}, stats: {} });
    C.state.current = timerState;
    var catchup = C.timers.tick(20 * 60 * 60 * 1000);
    passed = report(catchup.ready === 2, 'timer catch-up after 20 hours respects cap 2', 'ready=' + catchup.ready) && passed;
    timerState.packs = { ready: 0, timerStartedAt: 10000 };
    var backwards = C.timers.tick(9000);
    passed = report(backwards.gained === 0 && timerState.packs.timerStartedAt === 9000, 'timer ignores a backwards clock') && passed;

    C.state.save = function () {};
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
      var prior = cfg.storage.key;
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
      }
    }
    return passed;
  }
  function init() {
    var params;
    try { params = new URLSearchParams(root.location.search); } catch (_) { params = new URLSearchParams(''); }
    if (params.get(C.config.dev.queryFlag) !== '1') return;
    var panel = node('aside');
    panel.className = 'dev-panel';
    panel.setAttribute('aria-label', 'Developer tools');
    panel.appendChild(node('div', 'CARDABLE / DEV'));
    var select = node('select');
    select.setAttribute('aria-label', 'Force next pull tier');
    select.appendChild(new Option('Force next pull: off', ''));
    C.data.rarities.filter(function (r) { return r.pullable; }).forEach(function (r) { select.appendChild(new Option('Force next pull: ' + r.name, r.id)); });
    select.addEventListener('change', function () { forcedTier = select.value || null; });
    panel.appendChild(select);
    panel.appendChild(button('Grant a pack', function () {
      C.state.current.packs.ready = Math.min(C.config.packs.maxStored, C.state.current.packs.ready + 1);
      C.state.save();
    }));
    panel.appendChild(button('Skip timer', function () {
      var p = C.state.current.packs;
      if (p.ready >= C.config.packs.maxStored) p.ready -= 1;
      p.timerStartedAt = Date.now() - C.config.packs.regenMs;
      C.timers.tick(Date.now());
    }));
    panel.appendChild(button('Reset save', function () { C.state.reset(); }));
    panel.appendChild(button('Replay tutorial flag', function () {
      C.state.current.tutorial = { step: 'welcome', done: false };
      C.state.save();
    }));
    panel.appendChild(button('Toggle rarityColorMode', function () {
      C.config.rarityColorMode = C.config.rarityColorMode === 'color' ? 'mono' : 'color';
      mode.textContent = 'rarityColorMode: ' + C.config.rarityColorMode;
    }));
    var mode = node('div', 'rarityColorMode: ' + C.config.rarityColorMode);
    var fps = node('div', 'FPS: --');
    panel.appendChild(mode); panel.appendChild(fps);
    C.dev = { panel: panel, output: node('pre'), validateData: validateData, runChecks: runChecks,
      consumeForcedTier: function () { var tier = forcedTier; forcedTier = null; select.value = ''; return tier; },
      get fps() { return fpsValue; } };
    root.document.body.appendChild(panel);
    panel.appendChild(C.dev.output);
    var validation = validateData();
    C.dev.output.textContent += 'Data validation: ' + validation.errors.length + ' error(s), ' + validation.warnings.length + ' warning(s).\n';
    runChecks();
    var frames = 0, last = performance.now();
    function frame(now) {
      frames += 1;
      if (now - last >= 1000) { fpsValue = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; fps.textContent = 'FPS: ' + fpsValue; }
      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);
  }
  C.dev = { init: init, validateData: validateData, runChecks: runChecks,
    consumeForcedTier: function () { var tier = forcedTier; forcedTier = null; return tier; } };
})(window.Cardable, window);
