/** Native services inside the existing Settings surface. Browser play stays unchanged. */
(function (C) {
  'use strict';
  var node = C.packMarkup.node;
  C.settingsDesktop = { create: function (host, options) {
    if (!host || !C.desktop.isAvailable) return null;
    var container = node('div', 'settings-desktop-controls', host), current = null, postponed = false;
    function button(text, parent, action) { var el = node('button', 'quiet-button', parent, text); el.type = 'button'; el.addEventListener('click', action); return el; }
    var updateBox = node('section', 'settings-update-box glass', container);
    node('h4', 'settings-subhead', updateBox, 'Software updates');
    var status = node('p', 'settings-update-status', updateBox, 'Loading update status…'); status.setAttribute('role', 'status');
    var versions = node('p', 'settings-update-versions', updateBox);
    var progress = node('progress', 'settings-update-progress', updateBox); progress.max = 100; progress.value = 0; progress.hidden = true; progress.setAttribute('aria-label', 'Update download');
    var bytes = node('p', 'settings-update-bytes', updateBox), notes = node('div', 'settings-update-notes', updateBox); notes.hidden = true;
    var actions = node('div', 'settings-update-actions', updateBox);
    function failed(error) { status.textContent = 'Could not complete this action. ' + (error.message || String(error)); check.disabled = false; action.disabled = false; }
    function run(task) { return Promise.resolve().then(task).catch(failed); }
    var check = button('Check for updates', actions, function () { check.disabled = true; run(function () { return C.desktop.checkUpdates(true).then(render); }); });
    var action = button('Download update', actions, function () {
      action.disabled = true;
      if (current && current.state === 'install-ready') {
        run(function () { return C.desktop.installUpdate().then(function (ok) {
          if (!ok) { status.textContent = 'Your save could not be flushed. Installation postponed; try again.'; action.disabled = false; }
        }); });
      } else run(function () { return C.desktop.downloadUpdate().then(render); });
    }); action.hidden = true;
    var later = button('Later', actions, function () { postponed = true; render(current); }); later.hidden = true;
    function mb(value) { return (Math.max(0, value || 0) / (1024 * 1024)).toFixed(1) + ' MB'; }
    function render(state) {
      if (!state) return; current = state;
      var info = state.updateInfo || {}, busy = state.state === 'checking' || state.state === 'downloading';
      versions.textContent = 'Current v' + state.currentVersion + (info.version ? ' · Latest v' + info.version : '');
      check.disabled = busy || !state.configured || !state.isPackaged;
      check.textContent = state.state === 'error' ? 'Retry update check' : 'Check for updates';
      action.hidden = !(state.state === 'update-available' || state.state === 'install-ready' && !postponed);
      action.disabled = busy; action.textContent = state.state === 'install-ready' ? 'Install and restart' : 'Download update';
      later.hidden = state.state !== 'install-ready' || postponed;
      progress.hidden = state.state !== 'downloading'; bytes.hidden = progress.hidden;
      if (!progress.hidden) {
        var data = state.downloadProgress || {}; progress.value = data.percent || 0;
        bytes.textContent = progress.value + '% · ' + mb(data.transferred) + (data.total ? ' / ' + mb(data.total) : '');
      }
      var descriptions = { idle: 'Updates are checked quietly in the background.', checking: 'Checking for updates…',
        'update-available': 'A newer version is available.', downloading: 'Downloading update…',
        'update-downloaded': 'Download complete.', 'install-ready': postponed ? 'Update ready. Reopen Settings when you want to restart.' : 'Update ready. Your progress will be saved before restarting.',
        'no-update': 'Cardable is up to date.', unconfigured: 'Updates are not configured for this build.' };
      status.textContent = state.state === 'error' ? 'Update failed. ' + (state.errorMessage || 'Please try again.') : !state.isPackaged ? 'Update checks are available in installed builds.' : descriptions[state.state] || 'Update status unavailable.';
      var releaseNotes = info.releaseNotes;
      if (Array.isArray(releaseNotes)) releaseNotes = releaseNotes.map(function (entry) { return entry.note || ''; }).join('\n');
      notes.textContent = typeof releaseNotes === 'string' ? releaseNotes.replace(/<[^>]*>/g, '').slice(0, 16000) : '';
      notes.hidden = !notes.textContent;
    }
    C.desktop.onUpdateState(render); C.desktop.getUpdateState().then(render).catch(failed);
    C.events.on('settings:open', function () { postponed = false; if (current) render(current); });
    var tools = node('section', 'settings-desktop-tools', container); node('h4', 'settings-subhead', tools, 'Diagnostics');
    button('Open saves folder', tools, function () { run(function () { return C.desktop.openSaveDirectory(); }); });
    button('Open logs folder', tools, function () { run(function () { return C.desktop.openLogDirectory(); }); });
    var diagnostics = button('Copy system diagnostics', tools, function () {
      diagnostics.disabled = true;
      C.desktop.copyDiagnostics().then(function (ok) { if (options.announce) options.announce(ok ? 'Diagnostics copied.' : 'Diagnostics could not be copied.'); }, failed).then(function () { diagnostics.disabled = false; });
    });
    var row = node('div', 'settings-row settings-discord-row', container), copy = node('div', 'settings-copy', row);
    node('span', 'settings-label', copy, 'Discord Rich Presence');
    var helper = node('span', 'settings-helper', copy), rpcStatus = { enabled: false };
    var toggle = button('', row, function () {
      toggle.disabled = true;
      C.desktop.setDiscordEnabled(!rpcStatus.enabled).then(function (ok) { if (!ok && options.announce) options.announce('Discord preference could not be saved.'); return C.desktop.getDiscordStatus(); }).then(renderDiscord, failed);
    }); toggle.classList.add('settings-switch'); toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-label', 'Discord Rich Presence');
    node('span', 'settings-switch-knob', toggle);
    function renderDiscord(value) {
      rpcStatus = value; toggle.disabled = !value.configured;
      toggle.setAttribute('aria-checked', value.enabled ? 'true' : 'false'); toggle.classList.toggle('is-on', value.enabled);
      helper.textContent = !value.configured ? 'Available when Discord integration is configured for this build.' : value.connected ? 'Connected · shares your current screen only.' : value.enabled ? 'Waiting for Discord. Cardable works while it is unavailable.' : 'Off · no activity is shared.';
    }
    C.desktop.onDiscordStatus(renderDiscord); C.desktop.getDiscordStatus().then(renderDiscord).catch(failed);
    return { updateUi: render, updateBox: updateBox, status: status, action: action, check: check, progress: progress };
  } };
})(window.Cardable);
