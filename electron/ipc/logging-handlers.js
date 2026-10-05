const { ipcMain } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const logger = require('../logging/logger');

function registerLoggingHandlers() {
  ipcMain.handle(IPC_CHANNELS.LOG_WRITE, (event, { level, message, meta }) => {
    if (typeof message !== 'string') return false;
    const safeLevel = ['INFO', 'WARN', 'ERROR', 'DEBUG'].includes(String(level).toUpperCase())
      ? String(level).toUpperCase()
      : 'INFO';
    logger.write(safeLevel, `[Renderer] ${message}`, meta);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LOG_GET_PATH, () => {
    return logger.getLogPath();
  });

  ipcMain.handle(IPC_CHANNELS.LOG_OPEN_DIR, async () => {
    return await logger.openLogFolder();
  });
}

module.exports = { registerLoggingHandlers };
