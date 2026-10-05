(function (C, root) {
  'use strict';
  var node = C.packMarkup.node;
  C.settingsData = {
    create: function (host, options) {
      var pending = null, epoch = 0, exportAge = null, exportText = '', feedback, busy = false, toastExit = null, toastMotion = null, confirmations = [];
      function button(text, parent, fn) { var b = node('button', 'quiet-button', parent, text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
      function message(text) { feedback.textContent = text; }
      function cancelConfirms(except) { confirmations.forEach(function (c) { if (c !== except) c.cancel(); }); }
      function perform(action) {
        try { busy = true; action(); message(''); return true; }
        catch (error) { message(error.message); return false; }
        finally { busy = false; refresh(); }
      }
      var exportButton = button('Export save', host, function () {
        if (C.state.recovery && C.state.recovery.pending) { message('Recovery is pending. Download the original from the recovery notice, then import or restore before exporting a collection.'); return; }
        if (exportAge !== null) return;
        try { exportText = C.saveTools.exportText(); exportAge = 0; exportButton.disabled = true; exportButton.classList.add('is-exporting'); exportButton.textContent = 'Exporting'; C.fx.wake(); }
        catch (error) { message(error.message); }
      });
      var zone = node('div', 'settings-drop-zone', host); zone.setAttribute('aria-label', 'Import a Cardable save');
      node('p', '', zone, 'Drop a save file here or choose a file');
      var input = node('input', '', zone); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
      var choose = button('Import save', zone, function () { input.value = ''; input.click(); });
      var preview = node('section', 'settings-import-preview glass', host); preview.hidden = true; preview.setAttribute('aria-label', 'Import preview');
      var previewCopy = node('p', '', preview);
      var apply = button('Replace my save', preview, function () { cancelConfirms(importConfirm); });
      var importConfirm = C.settingsControls.confirmation(apply, function () { if (pending) perform(function () { C.saveTools.importSave(pending.save); options.close(); }); }, { announce: options.announce, confirmMessage: 'Click again within three seconds to replace your save.' }); confirmations.push(importConfirm);
      button('Cancel import', preview, function () { epoch++; pending = null; preview.hidden = true; importConfirm.cancel(); message(''); });
      function read(file) {
        var ticket = ++epoch; pending = null; preview.hidden = true; cancelConfirms(); message('');
        if (!file) return Promise.resolve(false);
        if (file.size > C.config.polish.maxSaveBytes) { message('Save file is too large.'); return Promise.resolve(false); }
        message('Reading save…');
        var task;
        try { task = typeof file.text === 'function' ? file.text() : new Promise(function (resolve, reject) { var reader = new root.FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = function () { reject(new Error('This file could not be read.')); }; reader.readAsText(file); }); }
        catch (_) { task = Promise.reject(new Error('This file could not be read.')); }
        return Promise.resolve(task).then(function (text) {
          if (ticket !== epoch || !C.preferences.open) return false;
          pending = C.saveTools.parse(text); var s = C.saveTools.summary(pending.save);
          previewCopy.textContent = 'Exported ' + new Date(pending.exportedAt).toLocaleString() + '\n' + s.cardCount + ' cards · ' + s.uniqueCount + ' unique\n' + s.packs + ' packs ready · ' + C.config.currency.symbol + s.currency + '\nTutorial ' + (s.tutorialDone ? 'complete' : 'not complete');
          preview.hidden = false; message('File checked. Your current save has not changed.'); apply.focus({ preventScroll: true }); return true;
        }).catch(function (error) { if (ticket === epoch) { pending = null; preview.hidden = true; message(error.message); } return false; });
      }
      input.addEventListener('change', function () { read(input.files && input.files[0]); });
      ['dragenter', 'dragover'].forEach(function (name) { zone.addEventListener(name, function (e) { e.preventDefault(); zone.classList.add('is-drag-over'); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('is-drag-over'); });
      zone.addEventListener('drop', function (e) { e.preventDefault(); zone.classList.remove('is-drag-over'); read(e.dataTransfer && e.dataTransfer.files[0]); });
      var reset = button('Reset save', host);
      node('p', 'settings-helper', host, 'Deletes your cards, packs and progress. Your settings are kept.');
      reset.addEventListener('pointerdown', function () { cancelConfirms(resetConfirm); }); reset.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') cancelConfirms(resetConfirm); });
      var resetConfirm = C.settingsControls.confirmation(reset, function () { perform(function () { C.saveTools.reset(); options.close(); }); }, { mode: 'hold', holdLabel: 'Hold to reset', announce: options.announce }); confirmations.push(resetConfirm);
      var restore = button('Restore previous save', host, function () { cancelConfirms(restoreConfirm); });
      var restoreConfirm = C.settingsControls.confirmation(restore, function () { perform(C.saveTools.restore); }, { announce: options.announce, confirmMessage: 'Click again within three seconds to restore the previous save.' }); confirmations.push(restoreConfirm);
      var replay = button('Replay tutorial', host, function () { cancelConfirms(); perform(function () { C.saveTools.replay(); options.close(); }); });
      feedback = node('p', 'settings-data-feedback', zone); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      var toast = node('aside', 'settings-data-toast glass', root.document.body); toast.hidden = true; toast.setAttribute('aria-label', 'Save action');
      var toastCopy = node('p', '', toast); toastCopy.setAttribute('role', 'status');
      var undo = button('Undo', toast, function () { if (!perform(C.saveTools.undo)) toastCopy.textContent = feedback.textContent; });
      function refresh() {
        var backup = C.saveTools.previous(); restore.hidden = !backup;
        if (backup) restoreConfirm.setLabel('Restore previous save (' + new Date(backup.backedUpAt).toLocaleDateString() + ', ' + backup.summary.cardCount + ' cards)');
        var record = C.saveTools.undoInfo;
        if (record && record.remainingMs > 0) {
          toastCopy.textContent = { import: 'Save imported. Undo', reset: 'Save reset. Undo', restore: 'Previous save restored. Undo', replay: 'Tutorial restarted. Undo' }[record.kind] || 'Save changed. Undo';
          if (!toast.classList.contains('is-visible')) { toastMotion = 0; toast.style.willChange = 'transform'; }
          toastExit = null; toast.hidden = false; toast.classList.add('is-visible'); C.events.emit('menu:visibilityHold', { reason: 'data-undo', active: true }); C.fx.wake();
        } else { if (!toast.hidden && toastExit === null) { toastExit = 0; toastMotion = 0; toast.style.willChange = 'transform'; C.fx.wake(); } toast.classList.remove('is-visible'); C.events.emit('menu:visibilityHold', { reason: 'data-undo', active: false }); }
      }
      function close() { epoch++; pending = null; preview.hidden = true; zone.classList.remove('is-drag-over'); cancelConfirms(); }
      C.events.on('settings:close', close); C.events.on('settings:open', refresh); C.events.on('data:changed', refresh); C.events.on('save:replaced', refresh);
      C.fx.subscribe(function (now, dt) {
        var moving = false;
        if (exportAge !== null) {
          exportAge += dt; exportButton.style.setProperty('--export-progress', Math.min(1, exportAge / 600));
          if (exportAge >= 600 && exportText) { var date = new Date(Date.now()), name = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); try { C.saveFiles.download(exportText, 'cardable-save-' + name + '.json'); exportButton.textContent = '✓ Exported'; } catch (_) { message('The download could not start. Please try again.'); exportButton.textContent = 'Try export again'; } exportText = ''; exportButton.classList.remove('is-exporting'); }
          if (exportAge >= 1600) { exportAge = null; exportButton.disabled = false; exportButton.textContent = 'Export save'; } else moving = true;
        }
        if (C.preferences.open) confirmations.forEach(function (c) { moving = c.update(now, dt) || moving; });
        if (toastExit !== null) { toastExit += dt; if (toastExit >= 250 || C.motion.reduced) { toast.hidden = true; toastExit = null; } else moving = true; }
        if (toastMotion !== null) { toastMotion += dt; if (toastMotion >= 250 || C.motion.reduced) { toast.style.willChange = ''; toastMotion = null; } else moving = true; }
        var record = C.saveTools.undoInfo;
        if (record) { if (record.remainingMs <= 0) C.saveTools.expireUndo(); else { toast.style.setProperty('--undo-progress', record.remainingMs / (record.kind === 'replay' ? 8000 : 15000)); moving = true; } }
        return moving;
      }, 'settings-data');
      refresh();
      var api = { read: read, preview: preview, feedback: feedback, input: input, zone: zone, exportButton: exportButton, apply: apply, reset: reset, restore: restore, replay: replay, toast: toast, undo: undo, confirmations: confirmations,
        escape: function () { var active = confirmations.find(function (c) { return c.active; }); if (!active) return false; active.cancel(); return true; } };
      C.settingsData.current = api; return api;
    }
  };
})(window.Cardable, window);
