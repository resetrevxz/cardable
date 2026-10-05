const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { IPC_CHANNELS } = require('../ipc/channels');
const logger = require('../logging/logger');
const { CardableAutoUpdater, UPDATER_STATES } = require('./service');
const metadata = require('../../package.json').cardableDesktop || {};
let mainWindow, initialized = false;
const updaterService = new CardableAutoUpdater({
  engine: autoUpdater, currentVersion: app.getVersion(), isPackaged: app.isPackaged,
  configured: metadata.releaseConfigured === true, logger,
  broadcast: payload => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, payload);
  }
});
const init = updaterService.init.bind(updaterService);
updaterService.automaticChecks = !!metadata.updateFixture;
updaterService.init = win => { mainWindow = win; if (!initialized) { initialized = true; init(); } };
module.exports = { updaterService, UPDATER_STATES };
