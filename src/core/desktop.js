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

  var desktop = root.cardableDesktop || null;

  C.desktop = {
    isAvailable: !!desktop,

    init: function () {
      if (!desktop) return;

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
      C.events.on('save:written', function (saveData) {
        try {
          var json = typeof saveData === 'string' ? saveData : JSON.stringify(saveData);
          desktop.storage.backupSave(json);
        } catch (_) {}
      });

      // 3. Fallback recovery: If localStorage has no save, check userData backup
      try {
        var store = root.localStorage;
        var existing = store ? store.getItem(C.config.storage.key) : null;
        if (!existing && desktop.storage) {
          desktop.storage.getBackup().then(function (result) {
            if (result && result.exists && result.data) {
              try {
                // Validate and adopt the backup
                var candidate = C.state.validate(JSON.parse(result.data), false);
                if (store) store.setItem(C.config.storage.key, JSON.stringify(candidate));
                C.state.current = candidate;
                if (root.console) root.console.info('Cardable: Restored save from desktop userData backup.');
                C.events.emit('save:written', candidate);
              } catch (e) {
                if (root.console) root.console.warn('Cardable: Failed to restore backup from desktop:', e);
              }
            }
          });
        }
      } catch (_) {}

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
        // Ensure saves are flushed before installing
        if (C.state) C.state.save();
        return desktop.updates.install();
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

  // Initialize immediately if DOM is ready, or on DOMContentLoaded
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', function () { C.desktop.init(); });
  } else {
    C.desktop.init();
  }

})(window.Cardable, window);
