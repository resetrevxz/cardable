/**
 * Cardable Desktop Bridge
 *
 * Seamlessly connects the Cardable renderer to Electron desktop services
 * (persistence backup, diagnostics, logging, updater, discord presence boundary).
 *
 * Fully graceful: if running in a standalone browser, every API is a silent no-op.
 */
(function (C, root) {
  'use strict';

  var desktop = root.cardableDesktop || null, initialized = false, prepareTask = null, backupTimer = null;

  function primaryStorage() { return C.config.storage.key === 'cardable.save'; }

  function backupCurrent() {
    if (!desktop || !primaryStorage() || !C.state || !C.state.current) return Promise.resolve(false);
    try { return desktop.storage.backupSave(JSON.stringify(C.state.current)); }
    catch (_) { return Promise.resolve(false); }
  }

  C.desktop = {
    isAvailable: !!desktop,

    prepare: function () {
      if (prepareTask) return prepareTask;
      if (!desktop) return Promise.resolve(false);
      prepareTask = Promise.resolve().then(function () {
        var store = root.localStorage;
        if (!store || store.getItem(C.config.storage.key)) return false;
        return desktop.storage.getBackup().then(function (result) {
          if (!result || !result.exists || !result.data) return false;
          var candidate = C.state.validate(JSON.parse(result.data), false);
          store.setItem(C.config.storage.key, JSON.stringify(candidate));
          if (root.console) root.console.info('Cardable: Restored save from desktop userData before boot.');
          return true;
        });
      }).catch(function (error) {
        if (root.console) root.console.warn('Cardable: Desktop backup recovery was unavailable.', error);
        return false;
      }).then(function (restored) {
        C.desktop.init();
        return restored;
      });
      return prepareTask;
    },

    init: function () {
      if (!desktop || initialized) return;
      initialized = true;

      // 1. Hook unhandled renderer errors to desktop logger
      root.addEventListener('error', function (event) {
        try {
          var msg = event.message || 'Script error';
          var source = (event.filename || '') + ':' + (event.lineno || 0) + ':' + (event.colno || 0);
          desktop.logs.write('ERROR', msg, { source: source, stack: event.error ? event.error.stack : null });
        } catch (_) {}
      });

      root.addEventListener('unhandledrejection', function (event) {
        try {
          var reason = event.reason ? (event.reason.stack || event.reason.message || String(event.reason)) : 'Unhandled rejection';
          desktop.logs.write('ERROR', 'Unhandled Promise Rejection: ' + reason);
        } catch (_) {}
      });

      // 2. Double-persistence: Backup every save write to userData
      C.events.on('save:written', function () {
        if (!primaryStorage()) return;
        try {
          root.clearTimeout(backupTimer);
          backupTimer = root.setTimeout(function () { backupCurrent(); }, 120);
        } catch (_) {}
      });

      // 3. Native close handshake: flush the primary save and wait for disk backup.
      if (desktop.lifecycle) desktop.lifecycle.onPrepareClose(function () {
        try { if (C.state && primaryStorage()) C.state.save(); } catch (_) {}
        backupCurrent().catch(function () { return false; }).then(function () {
          desktop.lifecycle.closeReady();
        });
      });

      // Log successful renderer boot to native log
      desktop.logs.write('INFO', 'Cardable renderer desktop bridge initialized.');
    },

    // Window controls
    minimize: function () { if (desktop) desktop.window.minimize(); },
    maximize: function () { if (desktop) return desktop.window.maximize(); },
    close: function () { if (desktop) desktop.window.close(); },
    toggleFullscreen: function () { if (desktop) return desktop.window.toggleFullscreen(); },

    // Storage
    openSaveDirectory: function () { if (desktop) return desktop.storage.openSaveDir(); },

    // Logs & Diagnostics
    openLogDirectory: function () { if (desktop) return desktop.logs.openDir(); },
    getDiagnostics: function () {
      if (desktop) return desktop.system.getDiagnostics();
      return Promise.resolve({ isDesktop: false, userAgent: root.navigator.userAgent });
    },
    copyDiagnostics: function () {
      var self = this;
      return self.getDiagnostics().then(function (diag) {
        var text = JSON.stringify(diag, null, 2);
        if (desktop) return desktop.system.copyText(text);
        if (root.navigator && root.navigator.clipboard) return root.navigator.clipboard.writeText(text);
        return false;
      });
    },

    // Updates
    checkUpdates: function (isManual) {
      if (desktop) return desktop.updates.check(isManual);
      return Promise.resolve({ state: 'unsupported', message: 'Updates available in desktop app only' });
    },
    downloadUpdate: function () {
      if (desktop) return desktop.updates.download();
      return Promise.resolve();
    },
    installUpdate: function () {
      if (desktop) {
        if (C.state) C.state.save();
        return backupCurrent().catch(function () { return false; }).then(function () { return desktop.updates.install(); });
      }
    },
    onUpdateState: function (cb) {
      if (desktop) return desktop.updates.onStateChange(cb);
      return function () {};
    },

    // Discord Presence (deferred boundary)
    setDiscordPresence: function (presence) {
      if (desktop) return desktop.discord.setPresence(presence);
    },
    clearDiscordPresence: function () {
      if (desktop) return desktop.discord.clearPresence();
    }
  };

})(window.Cardable, window);
