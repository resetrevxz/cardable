const path = require('path');
const { app, ipcMain } = require('electron');
const { fileURLToPath } = require('url');
const logger = require('../logging/logger');

function senderUrl(event) {
  return event && event.senderFrame && event.senderFrame.url
    ? event.senderFrame.url
    : event && event.sender && typeof event.sender.getURL === 'function'
      ? event.sender.getURL()
      : '';
}

function isTrustedSender(event) {
  try {
    if (!event || !event.senderFrame || event.senderFrame !== event.sender.mainFrame) return false;
    const url = new URL(senderUrl(event));
    if (url.protocol !== 'file:') return false;
    const senderPath = path.resolve(fileURLToPath(url));
    const expectedPath = path.resolve(app.getAppPath(), 'index.html');
    return process.platform === 'win32'
      ? senderPath.toLowerCase() === expectedPath.toLowerCase()
      : senderPath === expectedPath;
  } catch (_) {
    return false;
  }
}

function registerSecureHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event)) {
      logger.warn(`Rejected IPC from untrusted sender on ${channel}`);
      throw new Error('Untrusted IPC sender');
    }
    return handler(event, ...args);
  });
}

module.exports = { isTrustedSender, registerSecureHandler };
