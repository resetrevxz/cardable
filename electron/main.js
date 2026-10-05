const { app, BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logging/logger');
const desktopConfig = require('./config/desktop-config');
const { createMainWindow, getMainWindow, setQuitting } = require('./windows/main-window');
const { updaterService } = require('./updater/auto-updater');
const discordService = require('./discord/rpc');

// Register IPC handlers
const { registerAppHandlers } = require('./ipc/app-handlers');
const { registerWindowHandlers } = require('./ipc/window-handlers');
const { registerSystemHandlers } = require('./ipc/system-handlers');
const { registerStorageHandlers } = require('./ipc/storage-handlers');
const { registerLoggingHandlers } = require('./ipc/logging-handlers');
const { registerUpdaterHandlers } = require('./ipc/updater-handlers');
const { registerDiscordHandlers } = require('./ipc/discord-handlers');

// 1. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running
  console.log('Another instance of Cardable is already running. Quitting.');
  app.quit();
} else {
  // When second instance tries to run, focus the existing window
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    logger.info('Second instance launched, restoring and focusing existing window');
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  // Windows App User Model ID for notifications and taskbar grouping
  if (process.platform === 'win32') {
    app.setAppUserModelId(desktopConfig.appId);
  }

  // Global uncaught exception handlers
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in Main Process:', error.stack || error.message);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection in Main Process:', reason);
  });

  // Application Lifecycle
  app.whenReady().then(() => {
    logger.init();
    logger.info('Electron app ready event fired');

    // Register all IPC handlers
    registerAppHandlers();
    registerWindowHandlers();
    registerSystemHandlers();
    registerStorageHandlers();
    registerLoggingHandlers();
    registerUpdaterHandlers();
    registerDiscordHandlers();

    // Create Main Window
    const win = createMainWindow();

    // Initialize Auto-Updater
    updaterService.init(win);

    // Initialize Discord RPC Service Boundary
    discordService.init(desktopConfig.urls.discordAppId);

    // Smoke Test Handler for CI and automated verification
    if (process.argv.includes('--smoke-test')) {
      logger.info('Running smoke test verification...');
      win.webContents.on('did-finish-load', async () => {
        try {
          const testResults = await win.webContents.executeJavaScript(`
            (async () => {
              const res = {
                hasCardableDesktop: typeof window.cardableDesktop === 'object',
                hasCardable: typeof window.Cardable === 'object',
                hasState: !!(window.Cardable && window.Cardable.state && window.Cardable.state.current),
                cardableVersion: window.Cardable ? window.Cardable.config.version : null,
                desktopAppInfo: null,
                backupSuccess: false
              };
              if (res.hasCardableDesktop) {
                res.desktopAppInfo = await window.cardableDesktop.app.getInfo();
                const backup = await window.cardableDesktop.storage.backupSave(JSON.stringify(window.Cardable.state.current));
                res.backupSuccess = backup && backup.success;
              }
              return res;
            })()
          `);
          logger.info('Smoke Test Execution Results:', testResults);
          if (testResults.hasCardableDesktop && testResults.hasCardable && testResults.hasState && testResults.backupSuccess) {
            logger.info('ALL SMOKE TEST CHECKS PASSED SUCCESSFULLY!');
            console.log('SMOKE_TEST_SUCCESS');
            app.exit(0);
          } else {
            logger.error('Smoke test checks failed:', testResults);
            console.error('SMOKE_TEST_FAILED', testResults);
            app.exit(1);
          }
        } catch (e) {
          logger.error('Error during smoke test execution:', e);
          console.error('SMOKE_TEST_ERROR', e);
          app.exit(1);
        }
      });
      setTimeout(() => {
        logger.error('Smoke test timed out after 20s');
        console.error('SMOKE_TEST_TIMEOUT');
        app.exit(1);
      }, 20000);
    }

    // Handle macOS activate
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  // Window all closed
  app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Before quit
  app.on('before-quit', () => {
    logger.info('App preparing to quit...');
    setQuitting(true);
    discordService.destroy();
  });
}
