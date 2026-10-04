(function (C, root) {
  'use strict';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function canonical(value, depth) {
    depth = depth || 0; if (depth > 64) throw new Error('Save nesting is too deep.');
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(function (v) { return canonical(v, depth + 1); }).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key], depth + 1); }).join(',') + '}';
  }
  function checksum(value) {
    var text = canonical(value), hash = 2166136261;
    for (var i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return 'fnv1a-' + (hash >>> 0).toString(16).padStart(8, '0');
  }
  function envelope(save, now) { var value = JSON.parse(C.state.encode(save)); return { app: 'cardable', schemaVersion: value.schemaVersion, exportedAt: new Date(now).toISOString(), save: value, checksum: checksum(value) }; }
  function parse(text) {
    if (typeof text !== 'string' || text.length > C.config.polish.maxSaveBytes) throw new Error('Save file is too large.');
    var value; try { value = JSON.parse(text); } catch (_) { throw new Error('This file is not readable JSON.'); }
    if (!value || value.app !== 'cardable' || !Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1 || value.schemaVersion > C.config.storage.schemaVersion || !value.save || value.save.schemaVersion !== value.schemaVersion) throw new Error('This is not a supported Cardable export.');
    if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) throw new Error('The export date is invalid.');
    if (value.checksum !== checksum(value.save)) throw new Error('The checksum does not match. The file may be damaged or edited.');
    if (!['playerCode', 'createdAt', 'packs', 'serialCounter', 'inventory', 'pendingReveal', 'currency', 'tutorial', 'stats'].every(function (key) { return Object.prototype.hasOwnProperty.call(value.save, key); })) throw new Error('Required progress fields are missing.');
    return { save: C.state.validate(value.save, true), exportedAt: value.exportedAt };
  }
  function summary(save) { return { cardCount: save.inventory.length, uniqueCount: new Set(save.inventory.map(function (i) { return i.cardId; })).size, packs: save.packs.ready, currency: save.currency, tutorialDone: save.tutorial.done }; }
  function create(adapter) {
    var undoByKey = Object.create(null), undo = null;
    function backupKey() { return C.config.storage.key + '.backup'; }
    var undoKey = C.config.storage.key;
    function context() { if (undoKey !== C.config.storage.key) { undoByKey[undoKey] = undo; undoKey = C.config.storage.key; undo = undoByKey[undoKey] || null; } }
    function notify() { if (adapter.changed) adapter.changed(); }
    function backup(save) {
      var value = { app: 'cardable', backedUpAt: adapter.now(), summary: summary(save), save: JSON.parse(C.state.encode(save)) };
      value.checksum = checksum(value.save);
      try { adapter.storage().setItem(backupKey(), JSON.stringify(value)); }
      catch (_) { throw new Error('Could not save a backup. Your current progress is unchanged.'); }
      return value;
    }
    function previous() {
      var raw; try { raw = adapter.storage().getItem(backupKey()); } catch (_) { return null; }
      if (!raw) return null;
      try { var value = JSON.parse(raw); if (value.app !== 'cardable' || !Number.isFinite(value.backedUpAt) || value.checksum !== checksum(value.save)) return null;
        value.save = C.state.validate(value.save, false); value.summary = summary(value.save); return value;
      } catch (_) { return null; }
    }
    function adopt(next, kind, record) {
      context();
      // Local backups follow load's catalog compatibility; external imports stay strict.
      var candidate = C.state.validate(clone(next), kind === 'import'), before = clone(adapter.current());
      backup(before);
      if (!adapter.commit(candidate)) throw new Error('Could not save the change. Your current progress is unchanged.');
      undo = record === false ? null : { kind: kind, before: before, expiresAt: adapter.now() + 15000 };
      if (adapter.replaced) adapter.replaced(kind, candidate); notify(); return candidate;
    }
    return {
      exportText: function () { return JSON.stringify(envelope(adapter.current(), adapter.now()), null, 2) + '\n'; },
      importText: function (text) { return adopt(parse(text).save, 'import'); },
      importSave: function (value) { return adopt(value, 'import'); },
      reset: function () { var fresh = C.state.fresh(adapter.now()), current = adapter.current();
        if (fresh.playerCode === current.playerCode) { var end = fresh.playerCode.slice(-1), alphabet = C.serial.alphabet; fresh.playerCode = fresh.playerCode.slice(0, -1) + alphabet.charAt((alphabet.indexOf(end) + 1) % alphabet.length); }
        fresh.settings = C.settingsSchema.normalize(current.settings); return adopt(fresh, 'reset'); },
      restore: function () { var value = previous(); if (!value) throw new Error('No readable previous save is available.'); return adopt(value.save, 'restore'); },
      replay: function () { context(); var next = clone(adapter.current()), before = clone(next.tutorial); next.tutorial = { step: 'welcome', done: false };
        adapter.sessionSave(next); undo = { kind: 'replay', before: before, expiresAt: adapter.now() + 8000 }; if (adapter.replayed) adapter.replayed(); notify(); return next;
      },
      undo: function () {
        context();
        if (!undo || adapter.now() >= undo.expiresAt) { undo = null; notify(); throw new Error('Undo has expired. Use Restore previous save in Data.'); }
        var record = undo;
        if (record.kind === 'replay') { var next = clone(adapter.current()); next.tutorial = record.before; adapter.sessionSave(next); undo = null; if (adapter.replayed) adapter.replayed(); notify(); return next; }
        return adopt(record.before, 'undo', false);
      },
      expireUndo: function () { context(); undo = null; notify(); },
      get undoInfo() { context(); return undo ? { kind: undo.kind, remainingMs: Math.max(0, undo.expiresAt - adapter.now()) } : null; },
      previous: previous, backup: backup
    };
  }
  C.saveTools = create({ current: function () { return C.state.current; }, now: function () { return Date.now(); }, storage: function () { return root.localStorage; },
    commit: function (value) { return C.state.commit(value); }, sessionSave: function (value) { C.state.current = value; C.state.save(); },
    replaced: function (kind) { if (kind === 'reset') C.events.emit('save:willReset'); C.events.emit('save:willReplace'); C.events.emit('save:replaced', C.state.current); },
    replayed: function () { C.events.emit('tutorial:replay'); }, changed: function () { C.events.emit('data:changed'); } });
  C.saveTools.create = create; C.saveTools.checksum = checksum; C.saveTools.envelope = envelope; C.saveTools.parse = parse; C.saveTools.summary = summary;
  // Replacements have one public lifecycle boundary. Existing renderers keep their
  // cleanup/recovery events while all of them are refreshed from save:replaced.
  C.events.on('save:replaced', function () { C.events.emit('save:reset', C.state.current); C.events.emit('save:imported', C.state.current); C.events.emit('menu:activity'); C.fx.wake(); });
})(window.Cardable, window);
