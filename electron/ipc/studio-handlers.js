const { BrowserWindow, dialog, clipboard, nativeImage } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { registerSecureHandler } = require('./security');

// Folder paths stay in the main process. A renderer gets an owner-bound lease,
// and may write a single basename at a time, without replacing existing files.
const folders = new Map();
const watched = new Set();
function filename(value) {
  if (typeof value !== 'string' || value.length > 180 || /[\\/:*?"<>|\x00-\x1f]/.test(value) || /[. ]$/.test(value) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value) || !/\.(png|jpe?g|webp|webm)$/i.test(value)) throw Error('Invalid studio filename.');
  return value;
}
function bytes(value, name) {
  if (!(value instanceof Uint8Array) && !(value instanceof ArrayBuffer)) throw Error('Invalid studio image.');
  const b = Buffer.from(value instanceof ArrayBuffer ? value : value.buffer, value instanceof ArrayBuffer ? 0 : value.byteOffset, value instanceof ArrayBuffer ? value.byteLength : value.byteLength);
  if (b.length < 12 || b.length > 128 * 1024 * 1024) throw Error('Studio export exceeds the 128 MB file limit.');
  const ext = path.extname(name).toLowerCase();
  const valid = ext === '.png' ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : /^\.jpe?g$/.test(ext) ? b[0] === 255 && b[1] === 216 : ext === '.webp' ? b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP' : b.readUInt32BE(0) === 0x1a45dfa3;
  if (!valid) throw Error('Studio file type does not match its extension.');
  return b;
}
function watch(sender) {
  if (watched.has(sender.id)) return;
  watched.add(sender.id);
  sender.once('destroyed', () => { watched.delete(sender.id); for (const [id, f] of folders) if (f.owner === sender.id) folders.delete(id); });
}
function registerStudioHandlers() {
  registerSecureHandler('studio:save-file', async (event, payload) => {
    const name = filename(payload && payload.name), data = bytes(payload.data, name);
    const chosen = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), { title:'Save studio export', defaultPath:name, filters:[{name:'Studio export',extensions:[path.extname(name).slice(1)]}] });
    if (chosen.canceled || !chosen.filePath || event.sender.isDestroyed()) return false;
    if (path.extname(chosen.filePath).toLowerCase() !== path.extname(name).toLowerCase()) throw Error('Keep the selected export extension.');
    await fs.writeFile(chosen.filePath, data); return true;
  });
  registerSecureHandler('studio:choose-folder', async event => {
    if ([...folders.values()].filter(f => f.owner === event.sender.id).length >= 4) throw Error('Finish the current folder export first.');
    const chosen = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), { title:'Choose studio export folder', properties:['openDirectory','createDirectory'] });
    if (chosen.canceled || !chosen.filePaths[0] || event.sender.isDestroyed()) return null;
    const id = randomUUID(), directory = await fs.realpath(chosen.filePaths[0]);
    if(event.sender.isDestroyed()) return null;
    watch(event.sender); folders.set(id,{owner:event.sender.id,directory,busy:false}); return id;
  });
  registerSecureHandler('studio:write-file', async (event, payload) => {
    const lease = folders.get(payload && payload.folder);
    if (!lease || lease.owner !== event.sender.id || lease.busy) throw Error('The export folder is unavailable or busy.');
    const name = filename(payload.name), data = bytes(payload.data,name); lease.busy = true;
    try {
      if (await fs.realpath(lease.directory) !== lease.directory) throw Error('The export folder has changed. Choose it again.');
      const destination = path.resolve(lease.directory,name);
      if (path.dirname(destination) !== lease.directory) throw Error('Invalid export path.');
      await fs.writeFile(destination,data,{flag:'wx'}); return true;
    } finally { lease.busy = false; }
  });
  registerSecureHandler('studio:release-folder', (event, id) => { const f=folders.get(id); if(f && f.owner === event.sender.id) folders.delete(id); return true; });
  registerSecureHandler('studio:copy-image', (event, payload) => {
    const image=nativeImage.createFromBuffer(bytes(payload && payload.data, filename(payload && payload.name)));
    const size=image.getSize(); if(image.isEmpty() || size.width*size.height > 36000000) throw Error('Image clipboard is unavailable for this size.');
    clipboard.writeImage(image); return true;
  });
}
module.exports = { registerStudioHandlers };
