const { BrowserWindow, shell, app } = require('electron');
const path = require('path');
const desktopConfig = require('../config/desktop-config');
const windowState = require('./window-state');
const logger = require('../logging/logger');

let mainWindow = null;
let isQuitting = false;

function createMainWindow() {
  windowState.init();
  const state = windowState.state;

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: desktopConfig.minWidth,
    minHeight: desktopConfig.minHeight,
    backgroundColor: desktopConfig.backgroundColor,
    icon: process.platform === 'win32' ? desktopConfig.icons.ico : desktopConfig.icons.png,
    show: false, // Wait until ready-to-show for smooth rendering
    title: 'Cardable',
    frame: true, // Native titlebar with maximize/minimize/close
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: desktopConfig.isDev
    }
  });

  mainWindow = win;
  windowState.track(win);

  // If state was maximized or fullscreen, restore that state
  if (state.isFullScreen) {
    win.setFullScreen(true);
  } else if (state.isMaximized) {
    win.maximize();
  }

  // Gracefully show window when ready
  win.once('ready-to-show', () => {
    logger.info('Main window ready-to-show');
    win.show();
    if (desktopConfig.isDev) {
      // In dev mode, can open DevTools if wanted or keep available on F12
      // win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Load the application
  const appHtml = path.join(__dirname, '../../index.html');
  win.loadFile(appHtml).catch(err => {
    logger.error('Failed to load index.html:', err);
  });

  // Restrict navigation: never leave the local application
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
      logger.warn('Prevented unexpected navigation to:', navigationUrl);
      if (['http:', 'https:'].includes(parsedUrl.protocol)) {
        shell.openExternal(navigationUrl).catch(e => logger.error('Failed to open external url:', e));
      }
    }
  });

  // Restrict new windows: deny child windows, open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
        shell.openExternal(url).catch(e => logger.error('Failed to open external link:', e));
      } else {
        logger.warn('Blocked disallowed window open protocol:', parsedUrl.protocol);
      }
    } catch (e) {
      logger.warn('Invalid URL in window open handler:', url);
    }
    return { action: 'deny' };
  });

  // Keyboard shortcut handlers
  win.webContents.on('before-input-event', (event, input) => {
    // F11 fullscreen toggle
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
      return;
    }
    // DevTools shortcut in development mode
    if (desktopConfig.isDev) {
      if ((input.key === 'F12' || (input.control && input.shift && input.key.toUpperCase() === 'I')) && input.type === 'keyDown') {
        event.preventDefault();
        win.webContents.toggleDevTools();
        return;
      }
    }
  });

  // Clean close handling
  win.on('close', (event) => {
    if (!isQuitting) {
      logger.info('Main window closing, flushing state...');
      // Allow window to close normally
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

function getMainWindow() {
  return mainWindow;
}

function setQuitting(value) {
  isQuitting = value;
}

module.exports = {
  createMainWindow,
  getMainWindow,
  setQuitting
};
