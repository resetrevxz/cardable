const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = {
  APP_GET_INFO: 'app:get-info',
  APP_GET_PATHS: 'app:get-paths',
  APP_QUIT: 'app:quit',
  APP_PREPARE_CLOSE: 'app:prepare-close',
  APP_CLOSE_READY: 'app:close-ready',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_RESTORE: 'window:restore',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_CLOSE: 'window:close',
  WINDOW_TOGGLE_FULLSCREEN: 'window:toggle-fullscreen',
  WINDOW_IS_FULLSCREEN: 'window:is-fullscreen',
  WINDOW_GET_RUNTIME_STATE: 'window:get-runtime-state',
  WINDOW_RUNTIME_STATE: 'window:runtime-state',
  WINDOW_SET_UI_SCALE: 'window:set-ui-scale',
  WINDOW_SET_ASPECT_LOCK: 'window:set-aspect-lock',
  WINDOW_COMMAND: 'window:command',
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_GET_DIAGNOSTICS: 'system:get-diagnostics',
  SYSTEM_COPY_TEXT: 'system:copy-text',
  STORAGE_BACKUP_SAVE: 'storage:backup-save',
  STORAGE_GET_BACKUP: 'storage:get-backup',
  STORAGE_OPEN_SAVE_DIR: 'storage:open-save-dir',
  LOG_WRITE: 'log:write',
  LOG_GET_PATH: 'log:get-path',
  LOG_OPEN_DIR: 'log:open-dir',
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_GET_STATE: 'updater:get-state',
  UPDATER_STATE_CHANGED: 'updater:state-changed',
  DISCORD_SET_PRESENCE: 'discord:set-presence',
  DISCORD_CLEAR_PRESENCE: 'discord:clear-presence',
  DISCORD_GET_STATUS: 'discord:get-status',
  DISCORD_SET_ENABLED: 'discord:set-enabled',
  DISCORD_STATUS_CHANGED: 'discord:status-changed'
};

// Narrow, typed, validated desktop bridge
function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
const cardableDesktop = {
  isDesktop: true,

  app: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),
    getPaths: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PATHS),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT)
  },

  lifecycle: {
    onPrepareClose: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const subscription = () => callback();
      ipcRenderer.on(IPC_CHANNELS.APP_PREPARE_CLOSE, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_PREPARE_CLOSE, subscription);
    },
    closeReady: (success = true) => ipcRenderer.invoke(IPC_CHANNELS.APP_CLOSE_READY, success === true)
  },

  window: {
    getRuntimeState: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_RUNTIME_STATE),
    setUiScale: value => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_UI_SCALE, value),
    setAspectLock: value => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_ASPECT_LOCK, value),
    onRuntimeState: callback => subscribe(IPC_CHANNELS.WINDOW_RUNTIME_STATE, callback),
    onCommand: callback => subscribe(IPC_CHANNELS.WINDOW_COMMAND, callback),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_RESTORE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN),
    isFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_FULLSCREEN)
  },

  system: {
    openExternal: (url) => {
      if (typeof url !== 'string') return Promise.resolve(false);
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, url);
    },
    getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_DIAGNOSTICS),
    copyText: (text) => {
      if (typeof text !== 'string') return Promise.resolve(false);
      return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_COPY_TEXT, text);
    }
  },

  storage: {
    backupSave: (jsonString) => {
      if (typeof jsonString !== 'string') return Promise.resolve({ success: false, error: 'Invalid payload' });
      return ipcRenderer.invoke(IPC_CHANNELS.STORAGE_BACKUP_SAVE, jsonString);
    },
    getBackup: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_BACKUP),
    openSaveDir: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_OPEN_SAVE_DIR)
  },

  logs: {
    write: (level, message, meta) => {
      if (typeof message !== 'string') return Promise.resolve(false);
      return ipcRenderer.invoke(IPC_CHANNELS.LOG_WRITE, { level, message, meta });
    },
    getPath: () => ipcRenderer.invoke(IPC_CHANNELS.LOG_GET_PATH),
    openDir: () => ipcRenderer.invoke(IPC_CHANNELS.LOG_OPEN_DIR)
  },

  updates: {
    check: (isManual = true) => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK, !!isManual),
    download: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_STATE),
    onStateChange: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const subscription = (event, data) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATE_CHANGED, subscription);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATE_CHANGED, subscription);
      };
    }
  },

  discord: {
    setEnabled: enabled => typeof enabled === 'boolean' ? ipcRenderer.invoke(IPC_CHANNELS.DISCORD_SET_ENABLED, enabled) : Promise.resolve(false),
    onStatusChange: callback => {
      if (typeof callback !== 'function') return () => {};
      const listener = (event, status) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.DISCORD_STATUS_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DISCORD_STATUS_CHANGED, listener);
    },
    setPresence: (presence) => {
      if (typeof presence !== 'object' || presence === null) return Promise.resolve(false);
      return ipcRenderer.invoke(IPC_CHANNELS.DISCORD_SET_PRESENCE, presence);
    },
    clearPresence: () => ipcRenderer.invoke(IPC_CHANNELS.DISCORD_CLEAR_PRESENCE),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DISCORD_GET_STATUS)
  }
};

// Expose safely via contextBridge
contextBridge.exposeInMainWorld('cardableDesktop', cardableDesktop);
