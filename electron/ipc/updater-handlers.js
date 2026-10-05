const { ipcMain } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const { updaterService } = require('../updater/auto-updater');

function registerUpdaterHandlers() {
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async (event, isManual) => {
    return await updaterService.checkForUpdates(isManual);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    return await updaterService.downloadUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    updaterService.quitAndInstall();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_GET_STATE, () => {
    return updaterService.getStatePayload();
  });
}

module.exports = { registerUpdaterHandlers };
