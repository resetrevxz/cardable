const { IPC_CHANNELS } = require('./channels');
const { updaterService } = require('../updater/auto-updater');
const { registerSecureHandler } = require('./security');
const { BrowserWindow } = require('electron');
const gracefulShutdown = require('../lifecycle/graceful-shutdown');

function registerUpdaterHandlers() {
  registerSecureHandler(IPC_CHANNELS.UPDATER_CHECK, async (event, isManual) => {
    if (typeof isManual !== 'boolean') throw new Error('Invalid update check argument');
    return await updaterService.checkForUpdates(isManual);
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    return await updaterService.downloadUpdate();
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_INSTALL, async event => {
    if (updaterService.state !== 'install-ready') return false;
    const win = BrowserWindow.fromWebContents(event.sender);
    const flushed = await gracefulShutdown.flush(win);
    if (flushed) gracefulShutdown.approve(win);
    return flushed && updaterService.quitAndInstall();
  });

  registerSecureHandler(IPC_CHANNELS.UPDATER_GET_STATE, () => {
    return updaterService.getStatePayload();
  });
}

module.exports = { registerUpdaterHandlers };
