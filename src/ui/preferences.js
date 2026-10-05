(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, overlay, panel, gear, feedback, credits, previewHost, preview = null, previousCard = null;
  var opened = false, blocked = [], controls = [], spring, position = 0, confirmation, undo = null, undoAge = 0, undoButton;
  var saveAge = null, saved = true, tierIndex = 0, previewBase = null, nudge, nudgeShown = false, slowMs = 0, slowFrames = 0;
  function button(text, parent, action) { var el = node('button', 'quiet-button', parent, text); el.type = 'button'; el.addEventListener('click', action); return el; }
  function message(text) { feedback.textContent = text; }
  function announce(text) { C.preferences.status.textContent = text; }
  function canOpen() { return !root.document.hidden && (!C.opening || C.opening.phase === 'idle'); }
  function enabled() { gear.disabled = !canOpen(); gear.title = gear.disabled ? 'Finish opening first' : 'Settings (S)'; }
  function buildPreview() {
    if (preview) preview.destroy();
    var rarity = C.data.rarities[tierIndex], owned = C.state.current.inventory.some(function (i) { var card = C.card(i.cardId); return card && card.rarity === rarity.id; });
    var card = Object.assign({}, previewBase.card, { rarity: rarity.id });
    preview = C.cardView.create(card, previewBase.instance, { autoFocus: false, autoStamp: false, keyboardFlip: false, owned: owned, finishState: rarity.tier === 11 && !owned ? 'unfound' : 'found' });
    preview.el.setAttribute('tabindex', '-1'); previewHost.appendChild(preview.el); C.preferences.preview = preview; preview.setMode('full');
    C.preferences.preview = preview; C.preferences.tierLabel.textContent = rarity.name; C.fx.wake();
  }
  function open() {
    if (opened || !canOpen()) return false;
    opened = true; previousCard = C.cardView.active; C.events.emit('preferences:context', { active: true });
    C.events.emit('settings:open'); C.events.emit('menu:visibilityHold', { reason: 'preferences', active: true });
    root.document.body.classList.add('settings-open');
    Array.from(root.document.body.querySelectorAll('.menu-shell, .inventory-sheet, .inventory-detail, [data-tool-surface], .tutorial, .opening-stage, .save-notice')).forEach(function (el) { blocked.push({ el: el, before: !!el.inert }); el.inert = true; });
    var instances = C.state.current.inventory.filter(function (i) { return !!C.card(i.cardId); }).slice().sort(function (a, b) { return b.pulledAt - a.pulledAt; });
    var instance = instances[0], card = instance ? C.card(instance.cardId) : C.data.cards.find(function (c) { return !c.retired && c.active !== false; });
    previewBase = { card: card, instance: instance || { instanceId: 'settings-preview', cardId: card.id, serial: C.serial.format(C.state.current.playerCode, 0), pulledAt: 0, seen: true } };
    tierIndex = Math.max(0, C.data.rarities.findIndex(function (r) { return r.id === card.rarity; }));
    overlay.hidden = false; overlay.inert = false; buildPreview(); C.accessibility.trap(panel); C.preferences.closeButton.focus({ preventScroll: true });
    if (!C.settings.saved) message('Your browser is blocking saving. Settings last for this session only.');
    spring.target = 1; C.fx.wake(); return true;
  }
  function close() {
    if (!opened) return;
    if (confirmation) confirmation.cancel(); credits.hidden = true; C.accessibility.release(credits);
    opened = false; overlay.inert = true; root.document.body.classList.remove('settings-open');
    if (preview) preview.destroy(); preview = null; C.preferences.preview = null;
    blocked.forEach(function (item) { item.el.inert = item.before; }); blocked = [];
    C.events.emit('preferences:context', { active: false }); C.events.emit('settings:close');
    if (previousCard && !previousCard.destroyed && previousCard.visible) previousCard.setMode('full'); previousCard = null;
    C.accessibility.release(panel); C.events.emit('menu:visibilityHold', { reason: 'preferences', active: false }); C.events.emit('menu:activity');
    gear.focus({ preventScroll: true }); spring.target = 0; C.fx.wake();
  }
  function recoverNotice() {
    var recovery = C.state.recovery; if (!recovery) return;
    var notice = node('aside', 'save-notice glass', root.document.body); notice.setAttribute('aria-label', 'Save recovery');
    var copy = node('p', '', notice, recovery.backedUp ? 'Your save could not be read. A backup was kept and a fresh save is ready.' : 'Your save could not be read. A fresh save is ready. Download the unreadable file to keep a copy.'); copy.setAttribute('role', 'status');
    var actions = node('div', 'save-notice-actions', notice); button('Download backup', actions, C.saveFiles.exportBackup);
    button('Dismiss', actions, function () { notice.remove(); C.preferences.notice = null; C.state.recovery = null; C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: false }); });
    C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: true }); C.preferences.notice = notice;
  }
  function storageNotice() {
    if (!C.state.noticeShown || C.preferences.notice) return;
    var notice = node('aside', 'save-notice glass', root.document.body); var copy = node('p', '', notice, 'Your browser is blocking saving. Changes last for this session only.'); copy.setAttribute('role', 'status');
    button('Dismiss', notice, function () { notice.remove(); C.preferences.notice = null; }); C.preferences.notice = notice;
  }
  C.preferences = {
    initialized: false, get open() { return opened; }, show: open, close: close,
    read: function (file) { return C.settingsData.current.read(file); },
    init: function () {
      if (C.preferences.initialized) return; C.preferences.initialized = true;
      var corner = node('div', 'settings-corner idle-chrome entrance', root.document.body); corner.style.setProperty('--entry', 2);
      gear = button('', corner, function () { if (opened) close(); else open(); }); gear.classList.add('settings-gear', 'preferences-entry'); gear.setAttribute('aria-label', 'Settings'); gear.setAttribute('aria-keyshortcuts', 'S');
      C.events.on('pointer:move', function (event) {
        var p = event.pointer, r = corner.getBoundingClientRect();
        var distance = Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
        corner.classList.toggle('is-near', p.inside && distance < 120);
      });
      C.events.on('pointer:leave', function () { corner.classList.remove('is-near'); });
      function occluded() { corner.classList.toggle('is-occluded', opened || C.inventory && C.inventory.active || C.opening && C.opening.phase !== 'idle'); }
      ['inventory:context', 'opening:context', 'preferences:context', 'tutorial:context', 'menu:visibilityHold'].forEach(function (event) { C.events.on(event, occluded); });
      occluded();
      var icon = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
      var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M9 3h6l.5 2.4 2 1.2 2.3-.8 3 5.2-1.8 1.6v2.3l1.8 1.6-3 5.2-2.3-.8-2 1.2L15 24H9l-.5-2.4-2-1.2-2.3.8-3-5.2L3 15.4v-2.3L1.2 11.5l3-5.2 2.3.8 2-1.2z'); icon.setAttribute('viewBox', '0 0 24 27'); icon.appendChild(path); var circle = root.document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('cx', '12'); circle.setAttribute('cy', '13.5'); circle.setAttribute('r', '4'); icon.appendChild(circle); gear.appendChild(icon); node('span', 'settings-version', corner, 'v' + C.config.version);
      overlay = node('div', 'preferences-overlay settings-overlay', root.document.body); overlay.hidden = true; overlay.inert = true;
      panel = node('section', 'preferences-panel settings-panel glass glass--sheet', overlay); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Settings');
      var header = node('header', 'settings-header', panel); node('h2', '', header, 'Settings'); C.preferences.closeButton = button('Close', header, close);
      var scroll = node('div', 'settings-scroll', panel), graphics = node('section', 'settings-graphics', scroll);
      node('h3', '', graphics, 'Graphics');
      controls.push(C.settingsControls.create(C.settingsSchema.entries.quality, graphics));
      var presetStatus = node('p', 'settings-preset-status', graphics);
      function presetSummary() {
        var tier = C.settings.get('quality'), descriptions = { 'very-low': 'Minimum effects. Built for basic devices.', low: 'Clean materials with lightweight motion.', medium: 'Balanced detail and rendering cost.', high: 'Full materials, lighting and focused effects.' };
        presetStatus.textContent = (C.settings.customized ? 'Customized · ' : '') + descriptions[tier];
      }
      C.settings.onChange('*', presetSummary); presetSummary();
      var previewSection = node('div', 'settings-preview', scroll); previewHost = node('div', 'settings-preview-mount', previewSection);
      var selector = node('div', 'settings-preview-selector', previewSection); button('‹', selector, function () { tierIndex = (tierIndex + C.data.rarities.length - 1) % C.data.rarities.length; buildPreview(); });
      C.preferences.tierLabel = node('span', '', selector); button('›', selector, function () { tierIndex = (tierIndex + 1) % C.data.rarities.length; buildPreview(); });
      var groups = {};
      var advanced = node('details', 'settings-advanced', scroll); node('summary', '', advanced, 'Advanced graphics'); groups['Advanced graphics'] = advanced;
      ['Performance', 'Motion and effects', 'Cards', 'Controls', 'Sound', 'Data', 'About'].forEach(function (name) { var group = node('section', 'settings-group', scroll); node('h3', '', group, name); groups[name] = group; });
      if (C.native) { groups.Desktop = node('section', 'settings-group', scroll); node('h3', '', groups.Desktop, 'Desktop'); scroll.insertBefore(groups.Desktop, groups.About); }
      Object.keys(C.settingsSchema.entries).forEach(function (key) { var d = C.settingsSchema.entries[key]; if (d.group && groups[d.group] && key !== 'quality') controls.push(C.settingsControls.create(d, groups[d.group])); });
      C.preferences.data = C.settingsData.create(groups.Data, { close: close, announce: announce });
      var version = node('div', 'settings-about-version', groups.About), versionDigits = C.numbers.create(version); version.setAttribute('aria-label', 'Version ' + C.config.version); versionDigits.set('v' + C.config.version, false);
      if (C.settingsDesktop) C.preferences.desktop = C.settingsDesktop.create(groups.About, { close: close, announce: announce });
      button('Credits and licenses', groups.About, function () { credits.hidden = false; C.accessibility.trap(credits); C.preferences.creditsClose.focus(); });
      credits = node('section', 'settings-credits glass', panel); credits.hidden = true; credits.setAttribute('role', 'dialog'); credits.setAttribute('aria-modal', 'true'); credits.setAttribute('aria-label', 'Credits and licenses');
      node('h2', '', credits, 'Credits and licenses'); node('p', '', credits, 'Inter — Rasmus Andersson. JetBrains Mono — JetBrains. Both fonts use the SIL Open Font License 1.1.');
      node('p', '', credits, 'Local font files are optional. System UI and monospace fallbacks keep the game readable.');
      button('Read font licenses', credits, function () { C.preferences.licenseText.hidden = !C.preferences.licenseText.hidden; });
      C.preferences.licenseText = node('pre', 'settings-license', credits, C.fontLicense || 'SIL Open Font License 1.1: fonts may be used, studied, modified and redistributed with their copyright and license notices; fonts may not be sold by themselves. See assets/fonts/LICENSES.md.'); C.preferences.licenseText.hidden = true;
      C.preferences.creditsClose = button('Close credits', credits, function () { credits.hidden = true; C.accessibility.release(credits); });
      var footer = node('footer', 'settings-footer', panel); feedback = node('p', 'preferences-feedback settings-feedback', footer); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      var defaults = button('Restore defaults', footer, function () {});
      confirmation = C.settingsControls.confirmation(defaults, function () { undo = C.settings.snapshot; undoAge = 0; C.settings.resetToDefaults(); undoButton.hidden = false; announce('Settings restored. Undo available for eight seconds.'); }, { announce: announce });
      undoButton = button('Undo', footer, function () { if (!undo) return; var previous = undo; undo = null; undoButton.hidden = true; C.settings.restore(previous); announce('Settings restored to your previous choices.'); }); undoButton.hidden = true;
      C.preferences.status = node('span', 'visually-hidden', panel); C.preferences.status.setAttribute('aria-live', 'polite');
      nudge = node('aside', 'settings-nudge glass', root.document.body); nudge.hidden = true;
      var nudgeCopy = node('p', '', nudge), suggested = null, nudgeActive = false;
      function syncNudge() {
        // A performance suggestion must not cover Keep/Delete or tool controls.
        var clearMenu = canOpen() && !opened && !(C.inventory && C.inventory.active) &&
          !(C.tutorial && C.tutorial.active) && !(C.studio && (C.studio.active || C.studio.pending)) &&
          !(C.studioAlbumUI && C.studioAlbumUI.active);
        nudge.hidden = !nudgeActive || !clearMenu;
      }
      button('Apply', nudge, function () { if (suggested) C.settings.applyPreset(suggested); nudgeActive = false; syncNudge(); }); button('Dismiss', nudge, function () { C.settings.set('nudgeDismissed', true); nudgeActive = false; syncNudge(); });
      ['opening:context', 'inventory:context', 'preferences:context', 'tutorial:context', 'studio:enter', 'studio:exit', 'studio:albumContext', 'fx:visibility'].forEach(function (name) { C.events.on(name, syncNudge); });
      spring = C.springs.create(0, { stiffness: 220, damping: 26 });
      overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
      gear.addEventListener('keydown', function (event) { if (event.key === ' ') event.preventDefault(); });
      root.document.addEventListener('keydown', function (event) {
        if (event.settingsHandled) return;
        if (opened && event.key === 'Escape') {
          event.preventDefault(); event.settingsHandled = true;
          if (confirmation.active) confirmation.cancel(); else if (C.preferences.data.escape()) { /* Confirmation consumes this Escape. */ } else if (!credits.hidden) { credits.hidden = true; C.accessibility.release(credits); C.preferences.closeButton.focus(); } else close();
        } else if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && String(event.key).toLowerCase() === 's' && !(event.target && (event.target.isContentEditable || event.target.closest('input,select,textarea,[contenteditable]')))) { event.preventDefault(); if (opened) close(); else open(); }
        else if ((event.ctrlKey || event.metaKey) && event.key === ',' && !event.repeat) { event.preventDefault(); open(); }
      });
      C.events.on('preferences:open', open); C.events.on('opening:context', enabled); C.events.on('fx:visibility', enabled); C.events.on('save:willReset', close); C.events.on('save:willReplace', function () { undo = null; undoButton.hidden = true; close(); }); C.events.on('save:reset', close);
      C.events.on('save:imported', function () { if (C.preferences.notice) C.preferences.notice.remove(); C.preferences.notice = null; C.state.recovery = null; C.events.emit('menu:visibilityHold', { reason: 'save-notice', active: false }); });
      C.events.on('settings:persisted', function (event) { saved = event.saved; saveAge = 0; feedback.style.opacity = 1; message(saved ? '' : 'Your browser is blocking saving. Settings last for this session only.'); C.fx.wake(); });
      C.events.on('fx:frame', function (event) {
        if (nudgeShown || C.settings.get('nudgeDismissed') || C.settings.get('quality') === 'very-low' || root.document.hidden || C.fx.stats.paused) { slowMs = slowFrames = 0; return; }
        if (event.realDt <= 0 || event.realDt > 250) { slowMs = slowFrames = 0; return; }
        slowMs += event.realDt; slowFrames++;
        if (slowFrames * 1000 / slowMs >= (event.targetFps || 60) * 0.75) { slowMs = slowFrames = 0; return; }
        if (slowMs >= 8000 && root.performance.now() > 2000) {
          var tiers = C.settingsSchema.tiers, index = tiers.indexOf(C.settings.get('quality')); suggested = tiers[Math.max(0, index - 1)];
          nudgeCopy.textContent = 'Low animation FPS. Try ' + (suggested === 'very-low' ? 'Very Low' : suggested.charAt(0).toUpperCase() + suggested.slice(1)) + ' graphics for smoother play?';
          nudgeShown = true; nudgeActive = true; syncNudge();
        }
      });
      C.events.on('fx:sleep', function () { slowMs = slowFrames = 0; }); C.events.on('fx:visibility', function () { slowMs = slowFrames = 0; });
      C.fx.subscribe(function (now, dt) {
        var moving = false;
        if (saveAge !== null) { saveAge += dt; if (saved) { message(saveAge >= 200 ? '✓ Saved' : ''); feedback.style.opacity = saveAge < 1400 ? 1 : 0; } if (saveAge >= 1400) saveAge = null; else moving = true; }
        if (undo) { undoAge += dt; if (undoAge >= 8000) { undo = null; undoButton.hidden = true; } else moving = true; }
        if (!overlay.hidden) {
          if (C.motion.reduced) { position = Math.max(0, Math.min(1, position + (opened ? 1 : -1) * dt / 150)); spring.reset(position); } else { spring.step(dt, opened ? 1 : 0); position = spring.value; }
          panel.style.transform = C.motion.reduced ? 'none' : 'translate3d(' + (1 - position) * 110 + '%,0,0)'; panel.style.opacity = C.motion.reduced ? position : 1;
          var settled = C.motion.reduced ? position === (opened ? 1 : 0) : spring.settled();
          moving = !settled || moving;
          if (!opened && settled) overlay.hidden = true;
          if (opened) { controls.forEach(function (control) { moving = control.update(now, dt) || moving; }); moving = confirmation.update(now, dt) || moving; moving = versionDigits.update(now) || moving; }
        }
        return moving;
      }, 'settings');
      C.preferences.el = overlay; C.preferences.panel = panel; C.preferences.gear = gear; C.preferences.feedback = feedback; C.preferences.controls = controls; C.preferences.defaults = defaults; C.preferences.undo = undoButton; C.preferences.confirmation = confirmation; C.preferences.credits = credits; C.preferences.nudge = nudge;
      enabled(); recoverNotice(); storageNotice(); C.events.on('save:unavailable', storageNotice);
    }
  };
})(window.Cardable, window);
