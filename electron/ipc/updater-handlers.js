const { IPC_CHANNELS } = require('./channels');
const { updaterService } = require('../updater/auto-updater');
const { registerSecureHandler } = require('./security');

function registerUpdaterHandlers() {
  registerSecureHandler(IPC_CHANNELS.UPDATER_CHECK, async (event, isManual) => {
    return await updaterService.checkForUpdates(isManual);
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    return await updaterService.downloadUpdate();
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_INSTALL, () => {
    return updaterService.quitAndInstall();
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_GET_STATE, () => {
    return updaterService.getStatePayload();
  });
}

module.exports = { registerUpdaterHandlers };
