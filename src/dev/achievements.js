(function (C) {
  'use strict';
  var D = C.dev, selected = 'pack-opener', counter = 'packsOpened', amount = 0;
  function change(label, action) {
    var events = [], before = C.state.current.currency;
    D.mutate(label, function (save) {
      var engine = C.achievements.create({ current: function () { return save; }, now: Date.now, available: C.achievements.available,
        emit: function (name, payload) { if (name === 'achievement:unlocked') events.push(payload); }, persist: function () {},
        reward: function (r, s) { if (r.credits) s.currency += r.credits; } });
      C.data.achievements.forEach(engine.register); engine.init(); action(engine);
    });
    if (C.state.current.currency !== before) C.events.emit('currency:changed', { before: before, value: C.state.current.currency, amount: Math.abs(C.state.current.currency - before), direction: Math.sign(C.state.current.currency - before) });
    events.forEach(function (p) { C.events.emit('achievement:unlocked', p); }); C.events.emit('achievement:changed');
  }
  D.startups.push(function () {
    function tool(id, label, type, extra) { D.register(Object.assign({ id: 'achievements.' + id, group: 'Achievements', label: label, type: type }, extra)); }
    tool('selection', 'Achievement', 'input', { choices: function () { return C.achievements.list().map(function (d) { return { value: d.id, label: d.name }; }); }, get: function () { return selected; }, set: function (v) { selected = v; } });
    tool('unlock', 'Unlock all tiers', 'button', { helper: 'Pays unearned tier rewards once in the active context. Sandbox recommended.', run: function () { change('Achievement unlocked', function (engine) { engine.unlock(selected); }); } });
    tool('lock', 'Lock achievement', 'button', { danger: true, helper: 'A held developer reset; unlocking it again can pay rewards again.', run: function () { D.mutate('Achievement locked', function (s) { delete s.achievements.unlocked[selected]; s.achievements.seen = s.achievements.seen.filter(function (id) { return id !== selected; }); }); } });
    tool('counter', 'Counter', 'input', { get: function () { return counter; }, set: function (v) { counter = v; }, choices: function () { return Array.from(new Set(C.data.achievements.map(function (d) { return d.track.counter; }).filter(Boolean))).sort(); } });
    tool('amount', 'Counter value', 'input', { inputType: 'number', min: 0, get: function () { return amount; }, set: function (v) { if (!Number.isSafeInteger(Number(v)) || Number(v) < 0) throw new Error('Use a non-negative integer'); amount = Number(v); } });
    tool('set', 'Set counter', 'button', { run: function () { change('Achievement counter changed', function (engine) { engine.setCounter(counter, amount); }); } });
    tool('toast', 'Replay unlock toast', 'button', { helper: 'Presentation only; no reward or Journal unlock event.', run: function () { C.achievementView.replayToast(selected); } });
    tool('check', 'Check achievements', 'button', { helper: 'One isolated, sub-second logic check. Never runs automatically.', run: function () { D.message(D.checkAchievements().message); } });
  });
  D.checkAchievements = function () {
    var start = performance.now(), logs = [], saves = 0;
    function assert(ok, message) { if (!ok) throw new Error('Achievements: ' + message); }
    var ladder = { id: 'check-ladder', name: 'Check', tiers: [{ goal: 1, reward: { credits: 2 } }, { goal: 2, reward: { credits: 3 } }, { goal: 3, reward: { credits: 5 } }], track: { counter: 'packsOpened' } };
    var kept = { id: 'check-kept', tiers: [{ goal: 1 }, { goal: 3 }], track: { event: 'card:kept', test: function () { return true; }, backfill: function (s) { return s.inventory; } } };
    function fixture(save) {
      var events = [], engine = C.achievements.create({ current: function () { return save; }, now: function () { return 123; },
        emit: function (name, p) { if (name === 'achievement:unlocked') events.push(p); }, persist: function () { saves++; },
        reward: function (r, s) { s.currency += r.credits || 0; } });
      engine.register(ladder); engine.register(kept); engine.init(); return { engine: engine, events: events, save: save };
    }
    var blank = C.state.validate(C.state.fresh(1), false);
    assert(blank.achievements === undefined, 'save without optional field loads');
    var live = fixture(blank);
    for (var n = 1; n <= 3; n++) {
      live.save.stats.packsOpened = n; live.save.packs.openedCount = n; live.engine.handle('pack:opened', {}); live.engine.handle('pack:opened', {});
      var item = { instanceId: 'check-' + n, cardId: 'check-card-' + n, pulledAt: n, serial: String(n), variantId: n === 2 ? 'fixture' : null };
      live.save.inventory.push(item); live.engine.handle('card:kept', item); live.engine.handle('card:kept', item);
    }
    assert(live.save.achievements.counters.packsOpened === 3 && live.save.achievements.counters.uniqueCards === 3 && live.save.achievements.counters.variantCopies === 1 && live.save.achievements.counters['event.check-kept'] === 3, 'scripted counters increment once');
    assert(live.events.filter(function (e) { return e.id === ladder.id; }).map(function (e) { return e.tier; }).join(',') === '1,2,3' && live.save.currency === 10, 'tiers unlock in order and pay once');
    var retroSave = C.state.fresh(1); retroSave.stats.packsOpened = 3; retroSave.packs.openedCount = 3; retroSave.inventory = live.save.inventory.slice();
    var retro = fixture(retroSave);
    assert(JSON.stringify(retro.events.map(function (e) { return [e.id, e.tier]; }).sort()) === JSON.stringify(live.events.map(function (e) { return [e.id, e.tier]; }).sort()), 'backfill matches event replay');
    assert(retro.events.every(function (e) { return e.retro; }) && retro.events.filter(function (e) { return e.id === ladder.id; }).every(function (e) { return e.at === null; }), 'unknown retro dates remain null');
    var before = retro.save.currency; retro.engine.init(); assert(retro.save.currency === before && retro.events.length === live.events.length, 'backfill rewards never repeat');
    // Catalogue upgrade and optional publishers use the same isolated check, never a second suite.
    var available = new Set(), upgraded = C.state.fresh(1); upgraded.achievements = C.achievements.defaults();
    var upgradeEvents = [], upgrade = C.achievements.create({ current: function () { return upgraded; }, now: function () { return 123; },
      available: function (name) { return available.has(name); }, persist: function () {}, reward: function (r,s) { s.currency += r.credits || 0; },
      emit: function (name,p) { if (name === 'achievement:unlocked') upgradeEvents.push(p); } });
    var studio = C.data.achievements.find(function (d) { return d.id === 'shutterbug'; }); upgrade.register(studio); upgrade.init();
    assert(upgrade.list().length === 0 && upgrade.totals().total === 0, 'subscribing does not activate an absent publisher');
    available.add('studio:photo'); upgrade.init(); upgrade.handle('studio:photo', { photoId: 'check-photo' }); upgrade.handle('studio:photo', { photoId: 'check-photo' });
    assert(upgraded.achievements.counters['event.shutterbug'] === 1 && upgradeEvents.length === 1, 'conditional publisher activates with replay receipts');
    var serialDef = C.data.achievements.find(function (d) { return d.id === 'lucky-seven'; });
    upgraded.inventory = [{ instanceId: 'upgrade-card', cardId: C.data.cards.find(function (c) { return !c.retired; }).id, serial: 'CBL-2345-000777', pulledAt: 5 }];
    upgrade.register(serialDef); upgrade.init(); before = upgraded.currency; upgrade.init();
    assert(upgrade.isUnlocked('lucky-seven') && upgraded.currency === before && upgradeEvents.filter(function (p) { return p.id === 'lucky-seven'; }).every(function (p) { return p.retro && p.at === 5; }), 'A/B catalogue upgrades backfill new definitions once');
    assert(performance.now() - start < 1000, 'check stays under one second');
    logs.push('PASS · counters, ordered tiers, once-only rewards, backfill/replay parity and legacy save');
    return { passed: true, message: logs[0], durationMs: Math.round(performance.now() - start), isolatedSaves: saves };
  };
})(window.Cardable);
