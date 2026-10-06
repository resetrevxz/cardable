const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { IPC_CHANNELS } = require('../ipc/channels');
const logger = require('../logging/logger');
const { CardableAutoUpdater, UPDATER_STATES } = require('./service');
const metadata = require('../../package.json').cardableDesktop || {};
const path = require('node:path');
const fs = require('node:fs');
const mode = metadata.updatesMode || require('../../desktop-release.json').updates?.mode || 'link';
const automatic = metadata.updatesMode === 'automatic' && !metadata.updateFixture;
// An unpacked preview must never launch an installer for the separate player app.
const installed = !!metadata.updateFixture || (app.isPackaged &&
  process.platform === 'win32' && fs.existsSync(path.join(path.dirname(process.execPath), 'Uninstall Cardable.exe')));
let mainWindow, initialized = false;
const updaterService = new CardableAutoUpdater({
  engine: autoUpdater, currentVersion: app.getVersion(), isPackaged: app.isPackaged,
  configured: metadata.releaseConfigured === true, logger,
  isInstalled: installed, mode,
  automaticChecks: automatic || !!metadata.updateFixture,
  automaticDownload: automatic, installOnQuit: automatic,
  broadcast: payload => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, payload);
  }
});
const init = updaterService.init.bind(updaterService);
updaterService.init = win => { mainWindow = win; if (!initialized) { initialized = true; init(); } };
module.exports = { updaterService, UPDATER_STATES };
