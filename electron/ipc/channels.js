// Central registry of IPC channel constants for type-safety and contract maintenance
const IPC_CHANNELS = {
  // App
  APP_GET_INFO: 'app:get-info',
  APP_SET_GRAPHICS: 'app:set-graphics',
  APP_RESTART_GRAPHICS: 'app:restart-graphics',
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
  WINDOW_GET_RUNTIME_STATE: 'window:get-runtime-state',
  WINDOW_RUNTIME_STATE: 'window:runtime-state',
  WINDOW_SET_UI_SCALE: 'window:set-ui-scale',
  WINDOW_SET_ASPECT_LOCK: 'window:set-aspect-lock',
  WINDOW_COMMAND: 'window:command',
  WINDOW_SET_PREFERENCES: 'window:set-preferences',
  WINDOW_SET_PACK: 'window:set-pack',
  WINDOW_SET_AWAKE: 'window:set-awake',
  WINDOW_TOGGLE_MINI: 'window:toggle-mini',

  // System & Diagnostics
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_GET_DIAGNOSTICS: 'system:get-diagnostics',
  SYSTEM_COPY_TEXT: 'system:copy-text',
  QOL_CAPTURE: 'qol:capture',
  QOL_SHOW_CAPTURE: 'qol:show-capture',
  QOL_SUPPORT_INFO: 'qol:support-info',
  QOL_SUPPORT_DIAGNOSTICS: 'qol:support-diagnostics',
  QOL_SUPPORT_UPDATES: 'qol:support-updates',
  QOL_SUPPORT_BUG: 'qol:support-bug',
  QOL_SAFE_MODE: 'qol:safe-mode',

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
  UPDATER_POSTPONE: 'updater:postpone',
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
