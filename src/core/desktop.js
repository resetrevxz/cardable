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
  if (desktop) C.native = desktop;

  function primaryStorage() { return C.config.storage.key === 'cardable.save'; }

  function backupCurrent() {
    if (!desktop || !primaryStorage() || !C.state || !C.state.current) return Promise.resolve(false);
    if (C.bootFailure || C.state.recovery && C.state.recovery.pending) return Promise.resolve({success:true,preserved:true});
    try { return desktop.storage.backupSave(C.state.encode(C.state.current)).then(function(result){
      if (!result || !result.success) { C.desktop.storageIssue = true; C.events.emit('desktop:storageError'); }
      else if (C.desktop.storageIssue) { C.desktop.storageIssue = false; C.events.emit('desktop:storageRecovered'); }
      return result;
    }).catch(function(){C.desktop.storageIssue=true;C.events.emit('desktop:storageError');return false;}); }
    catch (_) { C.desktop.storageIssue=true;C.events.emit('desktop:storageError');return Promise.resolve(false); }
  }

  C.desktop = {
    isAvailable: !!desktop,

    prepare: function () {
      if (prepareTask) return prepareTask;
      if (!desktop) return Promise.resolve(false);
      prepareTask = desktop.app.getInfo().then(function (info) {
        C.desktop.info = info;
        if (info && typeof info.version === 'string') C.config.version = info.version;
        var store = root.localStorage;
        if (!store || !primaryStorage()) return false;
        var existing = store.getItem(C.config.storage.key);
        if (existing) {
          try { C.state.validate(JSON.parse(existing), false); return false; }
          catch (_) { /* Preserve corrupt primary data before recovering a valid mirror. */ }
        }
        return desktop.storage.getBackup().then(function (result) {
          if (result && result.error) { C.desktop.startupRecovery={pending:true,reason:'native-backup',raw:result.data||null,backedUp:!!result.originalPreserved}; return false; }
          if (!result || !result.exists || !result.data) return false;
          var candidate;
          try { candidate = C.state.validate(JSON.parse(result.data), false); }
          catch (_) { C.desktop.startupRecovery={pending:true,reason:'native-backup',raw:result.data,backedUp:!!result.originalPreserved}; return false; }
          if (existing) C.state.preserveOriginal(store, existing);
          store.setItem(C.config.storage.key, JSON.stringify(candidate));
          if (root.console) root.console.info('Cardable: Restored save from desktop userData before boot.');
          return true;
        });
      }).catch(function (error) {
        C.desktop.storageIssue = true;
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
        if (C.bootFailure || C.state.recovery && C.state.recovery.pending) { desktop.lifecycle.closeReady(false); return; }
        var saved = true;
        try { if (C.state) { C.state.save(); saved = C.state.persistenceAvailable; } } catch (_) { saved = false; }
        backupCurrent().catch(function () { return false; }).then(function (result) {
          desktop.lifecycle.closeReady(saved && (!primaryStorage() || !!(result && result.success)));
        });
      });

      // Only broad screen names cross the RPC boundary, never player/card data.
      var contexts = { opening: false, inventory: false, detail: false, creator: false, studio: false };
      function presence() {
        var screen = contexts.creator || contexts.studio ? 'creator' : contexts.opening ? 'opening' : contexts.detail ? 'detail' : contexts.inventory ? 'inventory' : 'menu';
        desktop.discord.setPresence({ screen: screen });
      }
      C.events.on('opening:context', function (event) { contexts.opening = !!event.active; presence(); });
      C.events.on('inventory:context', function (event) { contexts.inventory = !!event.active; if (!event.active) contexts.detail = false; presence(); });
      C.events.on('detail:opened', function () { contexts.detail = true; presence(); });
      C.events.on('inventory:detailReturned', function () { contexts.detail = false; presence(); });
      C.events.on('studio:enter', function () { contexts.studio = true; presence(); });
      C.events.on('studio:exit', function () { contexts.studio = false; presence(); });
      C.events.on('menu:visibilityHold', function (event) { if (event.reason === 'developer') { contexts.creator = !!event.active; presence(); } });
      presence();

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
      if (desktop && desktop.support) return desktop.support.diagnostics(C.settings.get('quality')).then(function(text){return desktop.system.copyText(text);});
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
      // Main process requests/validates a renderer flush before it calls quitAndInstall.
      return desktop ? desktop.updates.install() : Promise.resolve(false);
    },
    postponeUpdate: function () {
      return desktop ? desktop.updates.postpone() : Promise.resolve(null);
    },
    getUpdateState: function () { return desktop ? desktop.updates.getState() : Promise.resolve({ state: 'unsupported' }); },
    onUpdateState: function (cb) {
      if (desktop) return desktop.updates.onStateChange(cb);
      return function () {};
    },

    // Discord Presence
    getDiscordStatus: function () { return desktop ? desktop.discord.getStatus() : Promise.resolve({ state: 'unsupported' }); },
    setDiscordEnabled: function (enabled) { return desktop ? desktop.discord.setEnabled(enabled) : Promise.resolve(false); },
    onDiscordStatus: function (cb) { return desktop ? desktop.discord.onStatusChange(cb) : function () {}; },
    setDiscordPresence: function (presence) {
      if (desktop) return desktop.discord.setPresence(presence);
    },
    clearDiscordPresence: function () {
      if (desktop) return desktop.discord.clearPresence();
    }
  };

})(window.Cardable, window);
