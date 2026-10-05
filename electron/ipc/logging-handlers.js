const { IPC_CHANNELS } = require('./channels');
const logger = require('../logging/logger');
const { registerSecureHandler } = require('./security');

function registerLoggingHandlers() {
  registerSecureHandler(IPC_CHANNELS.LOG_WRITE, (event, payload) => {
    if (!payload || typeof payload !== 'object') return false;
    const { level, message, meta } = payload;
    if (typeof message !== 'string' || message.length > 8192) return false;
    const safeLevel = ['INFO', 'WARN', 'ERROR', 'DEBUG'].includes(String(level).toUpperCase())
      ? String(level).toUpperCase()
      : 'INFO';
    logger.write(safeLevel, `[Renderer] ${message}`, meta);
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.LOG_GET_PATH, () => {
    return logger.getLogPath();
  });

  registerSecureHandler(IPC_CHANNELS.LOG_OPEN_DIR, async () => {
    return await logger.openLogFolder();
  });
}

module.exports = { registerLoggingHandlers };
