const { BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const { registerSecureHandler } = require('./security');

function registerWindowHandlers() {
  const life = require('../native/window-life');
  registerSecureHandler(IPC_CHANNELS.WINDOW_GET_RUNTIME_STATE, () => life.state());
  registerSecureHandler(IPC_CHANNELS.WINDOW_SET_UI_SCALE, (_event,value) => life.scale(value));
  registerSecureHandler(IPC_CHANNELS.WINDOW_SET_ASPECT_LOCK, (_event,value) => life.aspect(value));
  registerSecureHandler(IPC_CHANNELS.WINDOW_SET_PREFERENCES, (_event,value) => life.preferences(value));
  registerSecureHandler(IPC_CHANNELS.WINDOW_SET_PACK, (_event,value) => life.pack(value));
  registerSecureHandler(IPC_CHANNELS.WINDOW_SET_AWAKE, (_event,value) => life.awake(value));
  registerSecureHandler(IPC_CHANNELS.WINDOW_TOGGLE_MINI, () => life.openMini());
  function getSenderWindow(event) {
    return BrowserWindow.fromWebContents(event.sender);
  }

  registerSecureHandler(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = getSenderWindow(event);
    if (win) win.minimize();
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = getSenderWindow(event);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return win ? win.isMaximized() : false;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_RESTORE, (event) => {
    const win = getSenderWindow(event);
    if (win && win.isMaximized()) win.unmaximize();
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = getSenderWindow(event);
    return win ? win.isMaximized() : false;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = getSenderWindow(event);
    if (win) win.close();
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN, (event) => {
    const win = getSenderWindow(event);
    if (win) {
      const next = !win.isFullScreen();
      win.setFullScreen(next);
      return next;
    }
    return false;
  });

  registerSecureHandler(IPC_CHANNELS.WINDOW_IS_FULLSCREEN, (event) => {
    const win = getSenderWindow(event);
    return win ? win.isFullScreen() : false;
  });
}

module.exports = { registerWindowHandlers };
