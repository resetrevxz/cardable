(function (C, root) {
  'use strict';
  var overlay, panel, feedback, replace, picker, motion, color, staged = null, opened = false, origin = null, blocked = [], reading = 0;
  var opacity = 0, fadeMs;
  var previousExport;
  var node = C.packMarkup.node;
  function button(text, parent, action) { var el = node('button', 'quiet-button', parent, text); el.setAttribute('type', 'button'); el.addEventListener('click', action); return el; }
  function message(text) { feedback.textContent = text; }
  function close() {
    if (!opened) return;
    opened = false; staged = null; reading += 1; overlay.inert = true; C.fx.wake();
    blocked.forEach(function (item) { item.el.inert = item.before; }); blocked = [];
    C.accessibility.release(panel); C.events.emit('preferences:context', { active: false });
    C.events.emit('menu:visibilityHold', { reason: 'preferences', active: false }); C.events.emit('menu:activity');
    if (origin && C.accessibility.available(origin)) origin.focus({ preventScroll: true });
  }
  function open() {
    if (opened || root.document.hidden || C.opening.phase !== 'idle' && C.opening.phase !== 'revealed') return;
    opened = true; origin = root.document.activeElement; staged = null; replace.hidden = true; message('');
    previousExport.hidden = !C.saveFiles.previous();
    motion.value = C.state.current.settings.reducedMotion === null ? 'system' : C.state.current.settings.reducedMotion ? 'reduce' : 'full'; color.value = C.config.rarityColorMode;
    Array.from(root.document.body.querySelectorAll('.menu-shell, .inventory-sheet, .inventory-detail, .card-gallery, .dev-panel, .tutorial, .opening-stage, .save-notice')).forEach(function (el) {
      blocked.push({ el: el, before: !!el.inert }); el.inert = true;
    });
    overlay.hidden = false; overlay.inert = false; C.accessibility.trap(panel);
    C.fx.wake();
    C.events.emit('preferences:context', { active: true }); C.events.emit('menu:visibilityHold', { reason: 'preferences', active: true });
    C.preferences.closeButton.focus({ preventScroll: true });
  }
  function read(file) {
    var token = ++reading; staged = null; replace.hidden = true;
    if (!file) return Promise.resolve(false);
    if (file.size > C.config.polish.maxSaveBytes) { message('This save file is too large. Your collection is unchanged.'); return Promise.resolve(false); }
    message('Reading save…');
    return file.text().then(function (text) {
      if (token !== reading || !opened) return false;
      staged = C.saveFiles.parse(text);
      var unique = new Set(staged.inventory.map(function (item) { return item.cardId; })).size;
      message(unique + ' collected cards · ' + staged.inventory.length + ' instances · ' + staged.packs.ready + ' packs' +
        (staged.pendingReveal ? ' · a reserved reveal' : '') + '. Replace this device’s save? A local backup will be kept.');
      replace.hidden = false; return true;
    }).catch(function (error) { if (token === reading && opened) message('Could not import: ' + error.message + '. Your collection is unchanged.'); return false; });
  }
  function recoverNotice() {
    var recovery = C.state.recovery; if (!recovery) return;
    var notice = node('aside', 'save-notice glass', root.document.body); notice.setAttribute('aria-label', 'Save recovery');
    var copy = node('p', '', notice, recovery.backedUp ? 'Your save could not be read. A backup was kept and a fresh save is ready.' :
      'Your save could not be read. A fresh save is ready. Download the unreadable file to keep a copy.'); copy.setAttribute('role', 'status');
    var actions = node('div', 'save-notice-actions', notice);
    button('Download backup', actions, C.saveFiles.exportBackup);
    button('Dismiss', actions, function () { notice.remove(); C.preferences.notice = null; C.state.recovery = null; C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: false }); });
    C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: true });
    C.preferences.notice = notice;
  }
  function storageNotice() {
    if (!C.state.noticeShown || C.preferences.notice) return;
    var notice = node('aside', 'save-notice glass', root.document.body);
    var copy = node('p', '', notice, 'This browser cannot save changes on this device. Export a file to keep your collection.'); copy.setAttribute('role', 'status');
    var actions = node('div', 'save-notice-actions', notice);
    button('Export save', actions, C.saveFiles.export);
    button('Dismiss', actions, function () { notice.remove(); C.preferences.notice = null; }); C.preferences.notice = notice;
  }
  C.preferences = {
    initialized: false, get open() { return opened; }, show: open, close: close, read: read,
    init: function () {
      if (C.preferences.initialized) return; C.preferences.initialized = true;
      fadeMs = parseFloat(root.getComputedStyle(root.document.documentElement).getPropertyValue('--t-ui'));
      overlay = node('div', 'preferences-overlay', root.document.body); overlay.hidden = true; overlay.inert = true; overlay.style.opacity = 0;
      panel = node('section', 'preferences-panel glass glass--sheet', overlay); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Save and display');
      var head = node('header', 'preferences-header', panel); node('h2', '', head, 'Save & display');
      node('span', 'preferences-version', head, 'v' + C.config.version);
      C.preferences.closeButton = button('Close', head, close);
      node('p', 'preferences-caption', panel, 'Your collection stays on this device. Keep a file copy when you need one.');
      var actions = node('div', 'preferences-actions', panel);
      button('Export save', actions, function () { try { C.saveFiles.export(); message('Save file exported.'); } catch (_) { message('Could not download the save. Try again.'); } });
      button('Import JSON…', actions, function () { picker.value = ''; picker.click(); });
      previousExport = button('Export previous save', actions, function () { try { C.saveFiles.exportPrevious(); message('Previous save exported.'); } catch (_) { message('Could not download the previous save. Try again.'); } }); previousExport.hidden = true;
      picker = node('input', '', panel); picker.type = 'file'; picker.accept = '.json,application/json'; picker.hidden = true; picker.setAttribute('aria-label', 'Import Cardable save');
      picker.addEventListener('change', function () { read(picker.files && picker.files[0]); });
      function select(labelText, choices) {
        var label = node('label', 'preferences-setting', panel, labelText), control = node('select', '', label); control.setAttribute('aria-label', labelText);
        choices.forEach(function (choice) { var option = node('option', '', control, choice[1]); option.value = choice[0]; }); return control;
      }
      motion = select('Motion', [['system', 'Follow system'], ['reduce', 'Reduced'], ['full', 'Full']]);
      motion.addEventListener('change', function () { C.motion.setPreference(motion.value === 'system' ? null : motion.value === 'reduce'); });
      color = select('Card finishes', [['color', 'Color'], ['mono', 'Monochrome']]);
      color.addEventListener('change', function () { C.config.rarityColorMode = color.value; C.events.emit('settings:rarityColorMode', color.value); });
      feedback = node('p', 'preferences-feedback', panel); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      replace = button('Replace save', panel, function () { if (!staged) return; try { C.saveFiles.apply(staged); } catch (error) { message(error.message); } }); replace.hidden = true;
      var hosts = root.document.body.querySelectorAll('.inventory-header, .gallery-tools');
      Array.from(hosts).forEach(function (host) { var control = button('Save & display', host, open); control.classList.add('preferences-entry'); var version = node('span', 'preferences-version', control, 'v' + C.config.version); version.setAttribute('aria-hidden', 'true'); if (host.classList.contains('inventory-header')) host.insertBefore(control, host.children[1]); });
      overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
      root.document.addEventListener('keydown', function (event) {
        if (opened && event.key === 'Escape') { event.preventDefault(); close(); }
        else if ((event.ctrlKey || event.metaKey) && event.key === ',' && !event.repeat) { event.preventDefault(); open(); }
      });
      C.events.on('preferences:open', open); C.events.on('save:willReplace', close); C.events.on('save:reset', close);
      C.events.on('save:willReset', close);
      C.events.on('save:imported', function () { if (C.preferences.notice) C.preferences.notice.remove(); C.preferences.notice = null; C.state.recovery = null; C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: false }); });
      C.preferences.el = overlay; C.preferences.panel = panel; C.preferences.picker = picker; C.preferences.replaceButton = replace; C.preferences.feedback = feedback;
      C.fx.subscribe(function (now, dt) {
        if (overlay.hidden) return false;
        opacity = Math.max(0, Math.min(1, opacity + (opened ? 1 : -1) * dt / fadeMs));
        overlay.style.opacity = 1 - Math.pow(1 - opacity, 3);
        if (!opened && opacity === 0) overlay.hidden = true;
        return opacity > 0 && opacity < 1;
      }, 'preferences');
      recoverNotice();
      storageNotice(); C.events.on('save:unavailable', storageNotice);
    }
  };
})(window.Cardable, window);
