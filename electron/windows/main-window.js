const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const desktopConfig = require('../config/desktop-config');
const windowState = require('./window-state');
const logger = require('../logging/logger');
const gracefulShutdown = require('../lifecycle/graceful-shutdown');

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
      devTools: desktopConfig.isDev,
      webviewTag: false
    }
  });

  mainWindow = win;
  require('../native/window-life').init(win);
  win.webContents.setVisualZoomLevelLimits(1, 1);
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
  const loadOptions = process.argv.includes('--smoke-dev-workspace') || process.argv.includes('--qa-dev-workspace') ? { query: { dev: '1' } } : undefined;
  win.loadFile(appHtml, loadOptions).catch(async err => {
    logger.error('Failed to load index.html:', err);
    if(win.isDestroyed())return;
    win.show();
    let detail='Keep the original app files and player profile. Setup has not reset your collection. Ask the supplier for a complete build if files are missing.';
    while(!win.isDestroyed()){
      const choice=await dialog.showMessageBox(win,{type:'error',title:'Cardable startup recovery',message:'Cardable could not load its game files.',detail,buttons:['Close Cardable','Open saves folder','Open logs folder'],defaultId:0,cancelId:0,noLink:true});
      if(choice.response===0){gracefulShutdown.approve(win);isQuitting=true;app.quit();break;}
      const folder=choice.response===1?path.join(app.getPath('userData'),'saves'):path.dirname(logger.getLogPath());
      try { const failure=await shell.openPath(folder);detail=failure?'Could not open that folder. Keep your original files and ask the supplier for help.':'The folder was opened. Keep the original files and ask the supplier for a complete build.'; }
      catch(_){detail='Could not open that folder. Keep the original files and ask the supplier for help.';}
    }
  }).catch(err=>logger.error('Could not show startup recovery:',err.message));

  // Restrict navigation: never leave the local application
  const expectedUrl = pathToFileURL(appHtml);
  function handleNavigation(event, navigationUrl) {
    try {
      const parsedUrl = new URL(navigationUrl);
      const sameDocument = parsedUrl.protocol === 'file:' && parsedUrl.hostname === expectedUrl.hostname && decodeURIComponent(parsedUrl.pathname).toLowerCase() === decodeURIComponent(expectedUrl.pathname).toLowerCase();
      if (sameDocument) return;
      event.preventDefault();
      logger.warn('Prevented unexpected navigation protocol:', parsedUrl.protocol);
      if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol) && !parsedUrl.username && !parsedUrl.password && navigationUrl.length <= 2048) {
        shell.openExternal(navigationUrl).catch(e => logger.error('Failed to open external url:', e));
      }
    } catch (_) {
      event.preventDefault();
      logger.warn('Prevented invalid navigation URL');
    }
  }
  win.webContents.on('will-navigate', handleNavigation);
  win.webContents.on('will-redirect', handleNavigation);

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    logger.warn('Blocked unexpected webview attachment');
  });

  win.webContents.session.setPermissionCheckHandler(() => false);
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    logger.warn(`Denied renderer permission request: ${permission}`);
    callback(false);
  });

  // Restrict new windows: deny child windows, open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol) && !parsedUrl.username && !parsedUrl.password && url.length <= 2048) {
        shell.openExternal(url).catch(e => logger.error('Failed to open external link:', e));
      } else {
        logger.warn('Blocked disallowed window open protocol:', parsedUrl.protocol);
      }
    } catch (e) {
      logger.warn('Invalid URL in window open handler');
    }
    return { action: 'deny' };
  });

  win.webContents.on('render-process-gone', (event, details) => {
    logger.error('Renderer process exited unexpectedly:', details);
  });
  win.on('unresponsive', () => logger.warn('Main window became unresponsive'));
  win.on('responsive', () => logger.info('Main window recovered responsiveness'));

  // Keyboard shortcut handlers
  win.webContents.on('before-input-event', (event, input) => {
    // Gameplay/window shortcuts are remappable and owned by Cardable.keys.
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
    if (!isQuitting && !gracefulShutdown.isApproved(win)) {
      event.preventDefault();
      logger.info('Main window closing, requesting renderer state flush...');
      gracefulShutdown.request(win);
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
