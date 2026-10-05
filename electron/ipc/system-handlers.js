const { ipcMain, shell, clipboard, app } = require('electron');
const os = require('os');
const { IPC_CHANNELS } = require('./channels');
const logger = require('../logging/logger');

function registerSystemHandlers() {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (event, url) => {
    if (typeof url !== 'string') {
      logger.warn('Rejected non-string URL in open-external');
      return false;
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        logger.warn('Rejected untrusted protocol in open-external:', parsed.protocol);
        return false;
      }
      logger.info('Opening validated external URL:', url);
      await shell.openExternal(url);
      return true;
    } catch (e) {
      logger.error('Failed to open external url:', e.message);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_COPY_TEXT, (event, text) => {
    if (typeof text !== 'string') return false;
    try {
      clipboard.writeText(text);
      return true;
    } catch (e) {
      logger.error('Failed to copy text to clipboard:', e.message);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_DIAGNOSTICS, async (event) => {
    try {
      let gpuFeatureStatus = {};
      let gpuInfo = {};
      try { gpuFeatureStatus = app.getGPUFeatureStatus(); } catch (_) {}
      try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}

      return {
        timestamp: new Date().toISOString(),
        cardableVersion: app.getVersion(),
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
        v8Version: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        osType: os.type(),
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0] ? os.cpus()[0].model : 'Unknown',
        gpuFeatures: gpuFeatureStatus,
        gpuInfo: gpuInfo,
        userDataPath: app.getPath('userData'),
        logPath: logger.getLogPath()
      };
    } catch (e) {
      logger.error('Failed to gather system diagnostics:', e.message);
      return { error: e.message };
    }
  });
}

module.exports = { registerSystemHandlers };
