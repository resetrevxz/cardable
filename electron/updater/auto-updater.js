const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { IPC_CHANNELS } = require('../ipc/channels');
const logger = require('../logging/logger');

// Lifecycle States
const UPDATER_STATES = {
  IDLE: 'idle',
  CHECKING: 'checking',
  UPDATE_AVAILABLE: 'update-available',
  DOWNLOADING: 'downloading',
  UPDATE_DOWNLOADED: 'update-downloaded',
  INSTALL_READY: 'install-ready',
  NO_UPDATE: 'no-update',
  ERROR: 'error'
};

class CardableAutoUpdater {
  constructor() {
    this.state = UPDATER_STATES.IDLE;
    this.currentVersion = app.getVersion();
    this.updateInfo = null;
    this.downloadProgress = null;
    this.errorMessage = null;
    this.mainWindow = null;
    this.mockMode = false;
    this.initialized = false;
  }

  init(win) {
    if (this.initialized) {
      this.mainWindow = win;
      return;
    }
    this.mainWindow = win;
    this.initialized = true;

    // Configure electron-updater logger
    autoUpdater.logger = {
      info: (msg) => logger.info(`[AutoUpdater] ${msg}`),
      warn: (msg) => logger.warn(`[AutoUpdater] ${msg}`),
      error: (msg) => logger.error(`[AutoUpdater] ${msg}`)
    };

    // Do not automatically download updates until user or background policy consents
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    this.setupListeners();
    logger.info(`AutoUpdater initialized (Current Version: ${this.currentVersion}, isPackaged: ${app.isPackaged})`);
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.setState(UPDATER_STATES.CHECKING);
      logger.info('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      this.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName
      };
      this.setState(UPDATER_STATES.UPDATE_AVAILABLE);
      logger.info(`Update available: version ${info.version}`);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.updateInfo = info ? { version: info.version } : null;
      this.setState(UPDATER_STATES.NO_UPDATE);
      logger.info('No update available. Current version is up to date.');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      };
      this.setState(UPDATER_STATES.DOWNLOADING);
      logger.debug(`Download progress: ${progressObj.percent.toFixed(1)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName
      };
      this.setState(UPDATER_STATES.UPDATE_DOWNLOADED);
      logger.info(`Update downloaded successfully: version ${info.version}`);
    });

    autoUpdater.on('error', (err) => {
      this.errorMessage = err == null ? 'Unknown error' : (err.message || String(err));
      this.setState(UPDATER_STATES.ERROR);
      logger.error('AutoUpdater error:', this.errorMessage);
    });
  }

  setState(newState) {
    this.state = newState;
    this.broadcastState();
  }

  getStatePayload() {
    return {
      state: this.state,
      currentVersion: this.currentVersion,
      updateInfo: this.updateInfo,
      downloadProgress: this.downloadProgress,
      errorMessage: this.errorMessage,
      isPackaged: app.isPackaged,
      mockMode: this.mockMode
    };
  }

  broadcastState() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, this.getStatePayload());
    }
  }

  async checkForUpdates(isManual = false) {
    this.errorMessage = null;

    if (this.mockMode) {
      return this.runMockUpdateCheck();
    }

    if (!app.isPackaged) {
      logger.info('Skipping live update check in unpackaged development mode');
      this.setState(UPDATER_STATES.NO_UPDATE);
      return this.getStatePayload();
    }

    try {
      this.setState(UPDATER_STATES.CHECKING);
      await autoUpdater.checkForUpdates();
    } catch (e) {
      this.errorMessage = e.message;
      this.setState(UPDATER_STATES.ERROR);
      logger.error('Failed to check for updates:', e.message);
    }
    return this.getStatePayload();
  }

  async downloadUpdate() {
    if (this.mockMode) {
      return this.runMockDownload();
    }

    try {
      this.setState(UPDATER_STATES.DOWNLOADING);
      await autoUpdater.downloadUpdate();
    } catch (e) {
      this.errorMessage = e.message;
      this.setState(UPDATER_STATES.ERROR);
      logger.error('Failed to download update:', e.message);
    }
    return this.getStatePayload();
  }

  quitAndInstall() {
    if (this.state !== UPDATER_STATES.UPDATE_DOWNLOADED && this.state !== UPDATER_STATES.INSTALL_READY) {
      logger.warn('Ignored install request without a downloaded update');
      return false;
    }
    logger.info('Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
    return true;
  }

  destroy() {
    this.mainWindow = null;
  }

  // Support local mock testing for complete state machine verification
  enableMockMode(targetVersion = '4.1.0') {
    this.mockMode = true;
    this.mockTargetVersion = targetVersion;
    logger.info(`AutoUpdater Mock Mode enabled (Target: ${targetVersion})`);
  }

  async runMockUpdateCheck() {
    this.setState(UPDATER_STATES.CHECKING);
    await new Promise(r => setTimeout(r, 600));
    this.updateInfo = {
      version: this.mockTargetVersion || '4.1.0',
      releaseDate: new Date().toISOString(),
      releaseNotes: 'Mock update: Performance enhancements, new cards, and fixes.',
      releaseName: `v${this.mockTargetVersion || '4.1.0'}`
    };
    this.setState(UPDATER_STATES.UPDATE_AVAILABLE);
    return this.getStatePayload();
  }

  async runMockDownload() {
    this.setState(UPDATER_STATES.DOWNLOADING);
    const total = 45 * 1024 * 1024; // 45MB
    for (let percent = 10; percent <= 100; percent += 20) {
      await new Promise(r => setTimeout(r, 200));
      this.downloadProgress = {
        percent,
        bytesPerSecond: 2.5 * 1024 * 1024,
        transferred: Math.round((percent / 100) * total),
        total
      };
      this.broadcastState();
    }
    this.setState(UPDATER_STATES.UPDATE_DOWNLOADED);
    return this.getStatePayload();
  }
}

const updaterService = new CardableAutoUpdater();
module.exports = {
  updaterService,
  UPDATER_STATES
};
