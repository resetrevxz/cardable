const { app, BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const { registerSecureHandler } = require('./security');
const gracefulShutdown = require('../lifecycle/graceful-shutdown');
const logger = require('../logging/logger');

function registerAppHandlers() {
  registerSecureHandler(IPC_CHANNELS.APP_GET_INFO, () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      safeMode: process.argv.includes('--safe-mode')
    };
  });

  registerSecureHandler(IPC_CHANNELS.APP_GET_PATHS, () => {
    return {
      userData: app.getPath('userData'),
      logs: logger.getLogPath(),
      appPath: app.getAppPath()
    };
  });

  registerSecureHandler(IPC_CHANNELS.APP_QUIT, (event) => {
    logger.info('App quit requested from renderer');
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close(); else app.quit();
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.APP_CLOSE_READY, (event, success) => {
    return gracefulShutdown.acknowledge(event, success === true);
  });
}

module.exports = { registerAppHandlers };
