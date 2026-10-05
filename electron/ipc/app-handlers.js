const { ipcMain, app } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const logger = require('../logging/logger');

function registerAppHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, (event) => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch
    };
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_PATHS, (event) => {
    return {
      userData: app.getPath('userData'),
      logs: logger.getLogPath(),
      appPath: app.getAppPath()
    };
  });

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, (event) => {
    logger.info('App quit requested from renderer');
    app.quit();
    return true;
  });
}

module.exports = { registerAppHandlers };
