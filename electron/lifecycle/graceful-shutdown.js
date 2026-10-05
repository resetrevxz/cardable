const { BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('../ipc/channels');
const logger = require('../logging/logger');

const approved = new WeakSet();
const pending = new WeakMap();

function finish(win, reason) {
  if (!win || win.isDestroyed()) return;
  const record = pending.get(win);
  if (record) clearTimeout(record.timer);
  pending.delete(win);
  approved.add(win);
  logger.info(`Renderer shutdown flush ${reason}`);
  win.close();
}

function request(win) {
  if (!win || win.isDestroyed() || approved.has(win)) return true;
  if (pending.has(win)) return false;

  const timer = setTimeout(() => finish(win, 'timed out; continuing close'), 1800);
  pending.set(win, { timer });
  win.webContents.send(IPC_CHANNELS.APP_PREPARE_CLOSE);
  return false;
}

function acknowledge(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !pending.has(win)) return false;
  finish(win, 'completed');
  return true;
}

function isApproved(win) {
  return !!win && approved.has(win);
}

module.exports = { acknowledge, isApproved, request };
