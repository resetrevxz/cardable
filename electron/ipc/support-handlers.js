const { app, BrowserWindow } = require('electron');
const { registerSecureHandler } = require('./security');
const { IPC_CHANNELS } = require('./channels');
const support = require('../native/support');
const shutdown = require('../lifecycle/graceful-shutdown');
let restarting = false;
function registerSupportHandlers() {
  registerSecureHandler(IPC_CHANNELS.QOL_SUPPORT_INFO, () => support.info());
  registerSecureHandler(IPC_CHANNELS.QOL_SUPPORT_DIAGNOSTICS, (_, quality) => support.diagnostics(quality));
  registerSecureHandler(IPC_CHANNELS.QOL_SUPPORT_UPDATES, () => support.checkUpdates());
  registerSecureHandler(IPC_CHANNELS.QOL_SUPPORT_BUG, (_, quality) => support.reportBug(quality));
  registerSecureHandler(IPC_CHANNELS.QOL_SAFE_MODE, async event => {
    if(restarting)return false;restarting=true;
    const win=BrowserWindow.fromWebContents(event.sender);
    try {
      if(!win || !await shutdown.flush(win))return false;
      const args=process.argv.slice(1).filter(arg=>arg!=='--safe-mode');args.push('--safe-mode');
      app.relaunch({args});shutdown.approve(win);app.quit();return true;
    } finally {restarting=false;}
  });
}
module.exports = { registerSupportHandlers };
