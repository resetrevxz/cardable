const { BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('../ipc/channels');
const logger = require('../logging/logger');
const approved = new WeakSet(), pending = new WeakMap();
let lastFlushSucceeded = false;
function flush(win) {
  if (!win || win.isDestroyed()) return Promise.resolve(false);
  if (pending.has(win)) return pending.get(win).promise;
  lastFlushSucceeded = false;
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  const finish = success => {
    const record = pending.get(win); if (!record) return;
    clearTimeout(record.timer); pending.delete(win);
    lastFlushSucceeded = success === true;
    logger.info(`Renderer shutdown flush ${success ? 'completed' : 'failed or timed out'}`);
    resolve(success);
  };
  const timer = setTimeout(() => finish(false), 3000);
  pending.set(win, { promise, timer, finish });
  try { win.webContents.send(IPC_CHANNELS.APP_PREPARE_CLOSE); }
  catch (_) { finish(false); }
  return promise;
}
function request(win) {
  if (!win || win.isDestroyed() || approved.has(win)) return true;
  if (!pending.has(win)) flush(win).then(() => {
    if (!win.isDestroyed()) { approved.add(win); win.close(); }
  });
  return false;
}
function acknowledge(event, success) {
  const win = BrowserWindow.fromWebContents(event.sender), record = win && pending.get(win);
  if (!record) return false;
  record.finish(success); return true;
}
module.exports = { acknowledge, isApproved: win => approved.has(win), approve: win => approved.add(win), request, flush,
  mayInstallUpdate: () => lastFlushSucceeded };
