// Central registry of IPC channel constants for type-safety and contract maintenance
const IPC_CHANNELS = {
  // App
  APP_GET_INFO: 'app:get-info',
  APP_GET_PATHS: 'app:get-paths',
  APP_QUIT: 'app:quit',
  APP_PREPARE_CLOSE: 'app:prepare-close',
  APP_CLOSE_READY: 'app:close-ready',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_RESTORE: 'window:restore',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_CLOSE: 'window:close',
  WINDOW_TOGGLE_FULLSCREEN: 'window:toggle-fullscreen',
  WINDOW_IS_FULLSCREEN: 'window:is-fullscreen',

  // System & Diagnostics
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_GET_DIAGNOSTICS: 'system:get-diagnostics',
  SYSTEM_COPY_TEXT: 'system:copy-text',

  // Storage / Persistence Sync
  STORAGE_BACKUP_SAVE: 'storage:backup-save',
  STORAGE_GET_BACKUP: 'storage:get-backup',
  STORAGE_OPEN_SAVE_DIR: 'storage:open-save-dir',

  // Logging
  LOG_WRITE: 'log:write',
  LOG_GET_PATH: 'log:get-path',
  LOG_OPEN_DIR: 'log:open-dir',

  // Auto Updater (Milestone 2)
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_GET_STATE: 'updater:get-state',
  UPDATER_STATE_CHANGED: 'updater:state-changed', // Event from main to renderer

  // Discord Rich Presence
  DISCORD_SET_ENABLED: 'discord:set-enabled',
  DISCORD_STATUS_CHANGED: 'discord:status-changed',
  DISCORD_SET_PRESENCE: 'discord:set-presence',
  DISCORD_CLEAR_PRESENCE: 'discord:clear-presence',
  DISCORD_GET_STATUS: 'discord:get-status'
};

module.exports = { IPC_CHANNELS };
