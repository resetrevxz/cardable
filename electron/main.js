const { app, BrowserWindow, session } = require('electron');
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

const smokeTest = process.argv.includes('--smoke-test');
const testUserDataArg = process.argv.find(arg => arg.startsWith('--test-user-data='));
if (smokeTest && testUserDataArg) {
  app.setPath('userData', path.resolve(testUserDataArg.slice('--test-user-data='.length)));
}

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
  app.whenReady().then(async () => {
    logger.init();
    logger.info('Electron app ready event fired');

    if (smokeTest && process.argv.includes('--clear-renderer-storage')) {
      await session.defaultSession.clearStorageData({ storages: ['localstorage'] });
      logger.info('Smoke test cleared renderer localStorage before launch');
    }

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
    if (smokeTest) {
      logger.info('Running smoke test verification...');
      win.webContents.on('did-finish-load', async () => {
        try {
          if (process.argv.includes('--smoke-dev-workspace')) {
            const result = await win.webContents.executeJavaScript(`(async () => {
              const until = performance.now() + 15000;
              while (!(window.Cardable && Cardable.dev && Cardable.dev.ui && Cardable.dev.ui.panel && Cardable.state && Cardable.state.current)) {
                if (performance.now() > until) throw new Error('Developer workspace did not initialize');
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              const picker = Cardable.dev.checkPicker();
              return { initialized: !!Cardable.dev.ui.panel, picker: picker.pass, storageKey: Cardable.config.storage.key };
            })()`);
            logger.info('Developer workspace smoke results:', result);
            if (!result.initialized || !result.picker) throw new Error('Developer workspace check failed');
            console.log('SMOKE_TEST_SUCCESS');
            win.close();
            return;
          }
          const testResults = await win.webContents.executeJavaScript(`
            (async () => {
              const res = {
                hasCardableDesktop: typeof window.cardableDesktop === 'object',
                hasCardable: typeof window.Cardable === 'object',
                hasState: !!(window.Cardable && window.Cardable.state && window.Cardable.state.current),
                cardableVersion: window.Cardable ? window.Cardable.config.version : null,
                desktopAppInfo: null,
                backupSuccess: false,
                rendererIsolated: typeof require === 'undefined' && typeof process === 'undefined',
                coreUiPresent: !!(document.querySelector('.menu-shell') && document.querySelector('.preferences-entry') && document.getElementById('inventory-affordance')),
                preferencesInteraction: false,
                inventoryInteraction: false,
                openingInteraction: false,
                persistedCurrency: window.Cardable && window.Cardable.state ? window.Cardable.state.current.currency : null,
                persistedInventoryCount: window.Cardable && window.Cardable.state ? window.Cardable.state.current.inventory.length : null
              };
              if (res.hasCardableDesktop) {
                res.desktopAppInfo = await window.cardableDesktop.app.getInfo();
                if (${process.argv.includes('--smoke-seed')}) {
                  window.Cardable.state.current.currency = 424242;
                  window.Cardable.state.current.tutorial.done = true;
                  window.Cardable.state.save();
                  res.persistedCurrency = window.Cardable.state.current.currency;
                }
                const settingsButton = document.querySelector('.preferences-entry');
                if (settingsButton) {
                  settingsButton.click();
                  await new Promise(resolve => setTimeout(resolve, 80));
                  res.preferencesInteraction = !!window.Cardable.preferences.open;
                  window.Cardable.preferences.close();
                }
                window.Cardable.inventory.request(true);
                await new Promise(resolve => setTimeout(resolve, 80));
                res.inventoryInteraction = !!window.Cardable.inventory.active;
                window.Cardable.inventory.request('peek');
                if (${process.argv.includes('--smoke-game')}) {
                  const C = window.Cardable;
                  const waitFor = async predicate => {
                    const until = performance.now() + 20000;
                    while (!predicate()) {
                      if (performance.now() > until) throw new Error('Timed out waiting for opening phase: ' + C.opening.phase);
                      await new Promise(resolve => setTimeout(resolve, 40));
                    }
                  };
                  C.tutorial.skipButton.click();
                  C.settings.applyPreset('very-low');
                  C.settings.set('cutscenes', 'off');
                  await waitFor(() => !C.inventory.active);
                  const before = C.state.current.inventory.length;
                  const opened = C.opening.openNow('standard');
                  if (!opened) throw new Error('Standard pack did not begin from idle menu');
                  await waitFor(() => C.opening.phase === 'cutting');
                  C.opening.finishCut();
                  await waitFor(() => C.opening.phase === 'revealed' && !C.opening.keepButton.hidden);
                  C.opening.keepCurrent();
                  await waitFor(() => C.state.current.pendingReveal === null);
                  res.openingInteraction = opened && C.state.current.inventory.length === before + 1;
                }
                res.persistedCurrency = window.Cardable.state.current.currency;
                res.persistedInventoryCount = window.Cardable.state.current.inventory.length;
                const backup = await window.cardableDesktop.storage.backupSave(JSON.stringify(window.Cardable.state.current));
                res.backupSuccess = backup && backup.success;
              }
              return res;
            })()
          `);
          logger.info('Smoke Test Execution Results:', testResults);
          const persistenceOk = !process.argv.includes('--smoke-verify') || testResults.persistedCurrency > 424242 && testResults.persistedInventoryCount === 1;
          const openingOk = !process.argv.includes('--smoke-game') || testResults.openingInteraction;
          if (testResults.hasCardableDesktop && testResults.hasCardable && testResults.hasState && testResults.backupSuccess && testResults.rendererIsolated && testResults.coreUiPresent && testResults.preferencesInteraction && testResults.inventoryInteraction && persistenceOk && openingOk) {
            logger.info('ALL SMOKE TEST CHECKS PASSED SUCCESSFULLY!');
            console.log('SMOKE_TEST_SUCCESS');
            win.close();
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
        logger.error('Smoke test timed out after 45s');
        console.error('SMOKE_TEST_TIMEOUT');
        app.exit(1);
      }, 45000);
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
    updaterService.destroy();
  });

  app.on('child-process-gone', (event, details) => {
    logger.error('Electron child process exited unexpectedly:', details);
  });
}
