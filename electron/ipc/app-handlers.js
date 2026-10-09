const { app, BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const { registerSecureHandler } = require('./security');
const gracefulShutdown = require('../lifecycle/graceful-shutdown');
const logger = require('../logging/logger');

let restarting=false;
function registerAppHandlers() {
  registerSecureHandler(IPC_CHANNELS.APP_SET_GRAPHICS, (_,value) => require('../config/graphics-preferences').write(value));
  registerSecureHandler(IPC_CHANNELS.APP_RESTART_GRAPHICS, async (event,value) => {
    if(typeof value!=='boolean'||restarting)return false;restarting=true;
    try { const win=BrowserWindow.fromWebContents(event.sender);if(!win||!await gracefulShutdown.flush(win))return false;
      require('../config/graphics-preferences').write(value);
      require('../updater/auto-updater').updaterService.suspendInstallation('Graphics restart');
      app.relaunch({args:process.argv.slice(1).filter(arg=>!['--disable-frame-rate-limit','--disable-gpu-vsync','--reset-controls'].includes(arg))});gracefulShutdown.approve(win);app.quit();return true;
    } finally { restarting=false; }
  });
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
      resetControls: process.argv.includes('--reset-controls'),
      unlimitedGraphics: app.commandLine.hasSwitch('disable-frame-rate-limit'),
      safeMode: process.argv.includes('--safe-mode'),
      updated: process.argv.includes('--updated'),
      installed: require('../updater/auto-updater').updaterService.isInstalled,
      installDirectory: require('path').dirname(process.execPath)
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
