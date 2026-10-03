(function (C, root) {
  'use strict';
  function parse(text) {
    if (typeof text !== 'string' || text.length > C.config.polish.maxSaveBytes) throw new Error('Save file is too large');
    return C.state.validate(JSON.parse(text), true);
  }
  function download(text, filename) {
    var url = root.URL.createObjectURL(new root.Blob([text], { type: 'application/json' }));
    var link = root.document.createElement('a'); link.href = url; link.download = filename; root.document.body.appendChild(link); link.click(); link.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, C.config.polish.downloadReleaseMs);
    if (filename === 'cardable-save.json' || /^cardable-(save|sandbox)-\d/.test(filename)) C.events.emit('save:exported');
  }
  C.saveFiles = {
    parse: parse,
    download: download,
    exportText: function () { return JSON.stringify(JSON.parse(C.state.encode(C.state.current)), null, 2) + '\n'; },
    export: function () { download(C.saveFiles.exportText(), 'cardable-save.json'); },
    exportBackup: function () { if (C.state.recovery) download(C.state.recovery.raw, 'cardable-save-recovery.json'); },
    previous: function () { try { return root.localStorage.getItem(C.config.storage.key + '.before-import'); } catch (_) { return null; } },
    exportPrevious: function () { var text = C.saveFiles.previous(); if (text) download(text, 'cardable-previous-save.json'); },
    apply: function (value) {
      var candidate = parse(JSON.stringify(value));
      // Preserve the previous local save before replacing it. A failed write adopts nothing.
      try { root.localStorage.setItem(C.config.storage.key + '.before-import', C.saveFiles.exportText()); }
      catch (_) { throw new Error('Could not save a backup. Your current collection is unchanged.'); }
      if (!C.state.commit(candidate)) throw new Error('Could not save the import. Your current collection is unchanged.');
      C.events.emit('save:willReplace');
      C.events.emit('save:replaced', candidate);
      C.timers.tick();
      return candidate;
    }
  };
})(window.Cardable, window);
