(function (C, root) {
  'use strict';
  var state, host, title, status, progress, restart, later, countdown = 15000, lastSecond = -1, installing = false, deferred = false;
  function idle() {
    return !root.document.hidden && root.document.hasFocus() && !C.bootFailure && !C.state.recovery?.pending &&
      C.opening.phase === 'idle' && !C.state.current.pendingReveal && !C.inventory.active && !C.preferences.open &&
      !C.tutorial.active && !C.detail?.phase?.match(/^(opening|open|closing)$/) && !C.studio?.active &&
      !C.studioAlbumUI?.active && !C.ui.modal && !C.commands.active && !C.contextMenu.open &&
      !C.friendly.active && !C.patchNotes.open && !C.achievementView?.open && !C.journalView?.open && !C.dev?.immersive &&
      !host?.contains(root.document.activeElement);
  }
  function install() {
    if (installing || !state || state.state !== 'install-ready') return;
    installing = true; restart.disabled = later.disabled = true;
    title.textContent = 'Saving before your update'; status.textContent = 'Your collection will reopen after installation.';
    return C.desktop.installUpdate().then(function (ok) {
      if (!ok) throw new Error('Save flush was not acknowledged');
    }).catch(function (error) {
      root.console.error('Cardable update restart postponed:', error);
      deferred = true; installing = false; restart.disabled = later.disabled = false;
      title.textContent = 'Restart postponed'; status.textContent = 'Could not save safely. Keep playing, export from Settings → Data, then try again.';
    });
  }
  function render(value) {
    if (!value || !host) return;
    var wasReady = state && state.state === 'install-ready'; state = value;
    var downloading = value.state === 'downloading', isReady = value.state === 'install-ready';
    host.hidden = !value.isInstalled || !value.automaticDownload || !(downloading || isReady) || deferred;
    if (isReady && !wasReady) { countdown = 15000; lastSecond = -1; }
    progress.hidden = !downloading; restart.hidden = later.hidden = !isReady;
    if (downloading) {
      title.textContent = 'Updating in the background';
      var data = value.downloadProgress;
      if (data && data.total) { progress.value = data.percent; status.textContent = data.percent + '% downloaded · keep playing'; }
      else { progress.removeAttribute('value'); status.textContent = 'Downloading the next version · keep playing'; }
    } else if (isReady) {
      title.textContent = 'Your update is ready';
      status.textContent = 'Finish what you are doing. Cardable will save before restarting.';
    }
    if (!installing) restart.disabled = later.disabled = false;
    C.fx.wake();
  }
  function update(_now, dt) {
    if (!state || state.state !== 'install-ready' || deferred || installing || !state.installOnQuit) return false;
    if (!C.settings.get('restartUpdatesWhenIdle') || !idle()) {
      countdown = 15000; lastSecond = -1;
      status.textContent = C.settings.get('restartUpdatesWhenIdle') ? 'Restart waits until you return to the menu.' : 'Restart when you are ready, or the update will install when you quit.';
      return false;
    }
    countdown = Math.max(0, countdown - Math.min(dt, 1000));
    var second = Math.ceil(countdown / 1000);
    if (second !== lastSecond) { lastSecond = second; status.textContent = 'Saving and restarting in ' + second + ' seconds. Choose Later to keep playing.'; }
    if (!second) install();
    return !installing;
  }
  C.events.on('app:ready', function () {
    if (!C.desktop.isAvailable) return;
    host = C.ui.create('panel', {className:'cb-desktop-update'}); host.hidden = true;
    title = C.packMarkup.node('strong', '', host);
    title.setAttribute('role', 'status'); title.setAttribute('aria-live', 'polite');
    status = C.packMarkup.node('p', '', host);
    progress = root.document.createElement('progress'); progress.max = 100; progress.setAttribute('aria-label', 'Update download'); host.appendChild(progress);
    var actions = C.packMarkup.node('div', 'cb-setup-actions', host);
    restart = C.ui.create('button', {label:'Restart now',variant:'primary',onClick:install}); actions.appendChild(restart);
    later = C.ui.create('button', {label:'Later',onClick:function () {
      later.disabled = true;
      C.desktop.postponeUpdate().then(function (value) { deferred = true; render(value); host.hidden = true; }).catch(function () { later.disabled = false; status.textContent = 'Could not postpone the update. Try Later again.'; });
    }}); actions.appendChild(later);
    root.document.body.appendChild(host);
    C.keys.listen(host, 'keydown', 'desktop-update.actions', function (event) {
      if (!['Enter', ' '].includes(event.key) || !event.target.closest('button')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) event.target.closest('button').click();
    });
    C.desktop.onUpdateState(render); C.desktop.getUpdateState().then(render).catch(function (error) { root.console.warn('Update status unavailable:', error); });
    C.fx.subscribe(update, 'desktop-update');
    ['opening:context','inventory:context','preferences:context','studio:exit','qol:context','settings:changed'].forEach(function (name) { C.events.on(name, function () { C.fx.wake(); }); });
    C.desktopUpdate = {render:render, host:host};
  });
})(window.Cardable, window);
