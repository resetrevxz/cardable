(function (C, root) {
  'use strict';
  function require(ok, what) { if (!ok) throw new Error(what); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function fixture() {
    var save = C.state.fresh(100), card = C.data.cards.find(function (c) { return !c.retired && c.active !== false; });
    save.playerCode = '7K3F'; save.serialCounter = 1; save.currency = 456; save.stats.packsOpened = 1;
    save.packs = { ready: 1, timerStartedAt: 100 }; save.tutorial = { step: 'timer', done: false }; save.settings.quality = 'medium';
    save.inventory = [{ instanceId: 'isolated-data-check', cardId: card.id, serial: C.serial.format(save.playerCode, 1), pulledAt: 100, seen: false, variantId: null }];
    return save;
  }
  function isolated() {
    var current = fixture(), writes = [], store = new Map(), now = 1000, blocked = false;
    var api = C.saveTools.create({ current: function () { return current; }, now: function () { return now; },
      storage: function () { return { setItem: function (key, value) { if (blocked) throw new Error('full'); writes.push(key); store.set(key, value); }, getItem: function (key) { return store.get(key) || null; } }; },
      commit: function (value) { writes.push('main'); current = value; return true; }, sessionSave: function (value) { current = value; } });
    return { api: api, writes: writes, get current() { return current; }, block: function () { blocked = true; }, time: function (ms) { now += ms; } };
  }
  C.dev.registerCheck('Data export/import round-trip preserves all progress and settings', function () {
    var x = isolated(), before = JSON.stringify(x.current); x.api.importText(x.api.exportText()); require(JSON.stringify(x.current) === before, 'round-trip'); return true;
  });
  C.dev.registerCheck('Data checksum rejects tampering without adopting or writing', function () {
    var x = isolated(), value = JSON.parse(x.api.exportText()), rejected = false; value.save.currency++;
    try { x.api.importText(JSON.stringify(value)); } catch (_) { rejected = true; }
    require(rejected && x.writes.length === 0 && x.current.currency === 456, 'checksum'); return true;
  });
  C.dev.registerCheck('Data backup precedes reset and reset keeps settings', function () {
    var x = isolated(), settings = JSON.stringify(x.current.settings); x.api.reset();
    require(x.writes[0] === C.config.storage.key + '.backup' && x.writes[1] === 'main' && x.api.previous().save.inventory.length === 1, 'backup order');
    require(JSON.stringify(x.current.settings) === settings && !x.current.inventory.length && x.current.packs.ready === C.config.packs.startingPacks, 'reset'); return true;
  });
  C.dev.registerCheck('Data backup failure blocks destruction and Undo restores progress', function () {
    var x = isolated(), before = JSON.stringify(x.current), blocked = isolated(), rejected = false; blocked.block();
    try { blocked.api.reset(); } catch (_) { rejected = true; } require(rejected && blocked.current.inventory.length === 1, 'blocked backup');
    x.api.reset(); x.api.undo(); require(JSON.stringify(x.current) === before, 'Undo');
    x.current.inventory[0].cardId = 'retired-local-record'; x.api.reset(); x.api.undo(); require(x.current.inventory[0].cardId === 'retired-local-record', 'local backup catalog compatibility'); return true;
  });
  C.dev.registerCheck('Data replay Undo changes only tutorial; expired Undo retains backup', function () {
    var x = isolated(), tutorial = copy(x.current.tutorial); x.api.replay(); x.current.currency++; x.api.undo();
    require(JSON.stringify(x.current.tutorial) === JSON.stringify(tutorial) && x.current.currency === 457, 'tutorial-only Undo');
    x.api.reset(); x.time(15000); var rejected = false; try { x.api.undo(); } catch (_) { rejected = true; } require(rejected && !!x.api.previous(), 'expired Undo'); return true;
  });
  C.dev.registerCheck('Data reset ignores single click and an early hold release', function () {
    var button = root.document.createElement('button'), calls = 0, control = C.settingsControls.confirmation(button, function () { calls++; }, { mode: 'hold' });
    function fire(target, type) { if (target.dispatchEvent) target.dispatchEvent(new root.Event(type, { cancelable: true })); else target.fire(type, { preventDefault: function () {} }); }
    try { button.click(); require(calls === 0, 'single click'); var now = root.performance.now(); fire(button, 'pointerdown'); control.update(now + 2900, 2900); fire(root.document, 'pointerup'); control.update(now + 3700, 800); require(calls === 0, 'early release'); return true; }
    finally { control.destroy(); }
  });
})(window.Cardable, window);
