const { app, BrowserWindow, clipboard, nativeImage, shell } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { registerSecureHandler } = require('./security');
const { IPC_CHANNELS } = require('./channels');
const captures = new Map();
let busy = false;

// The renderer never supplies a filesystem path. Only this session's captures
// can be revealed; Mini and child frames cannot call these secure handlers.
function registerCaptureHandlers() {
  registerSecureHandler(IPC_CHANNELS.QOL_SHOW_CAPTURE, (_, id) => {
    if (typeof id !== 'string' || !captures.has(id)) return false;
    shell.showItemInFolder(captures.get(id)); return true;
  });
  registerSecureHandler(IPC_CHANNELS.QOL_CAPTURE, async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (busy || !win || !win.isVisible() || win.isMinimized() || !request || !['window', 'card'].includes(request.kind)) return { success: false };
    busy = true;
    try {
      let rect, radius = 0, squircle = false;
      if (request.kind === 'card') {
        const r = request.rect, zoom = event.sender.getZoomFactor(), bounds = win.getContentBounds();
        if (!r || !['x', 'y', 'width', 'height', 'radius'].every(k => Number.isFinite(r[k])) || r.width < 1 || r.height < 1 || r.x < 0 || r.y < 0 || r.x * zoom + r.width * zoom > bounds.width + 1 || r.y * zoom + r.height * zoom > bounds.height + 1) return { success: false };
        rect = { x: Math.round(r.x * zoom), y: Math.round(r.y * zoom), width: Math.round(r.width * zoom), height: Math.round(r.height * zoom) };
        radius = Math.max(0, Math.min(r.radius * zoom, rect.width / 2, rect.height / 2)); squircle = r.squircle === true;
      }
      let image = await event.sender.capturePage(rect);
      if (image.isEmpty()) return { success: false };
      if (radius) {
        const size = image.getSize(), bytes = image.toBitmap(), r = radius * size.width / rect.width, exponent = squircle ? 4 : 2;
        // Clip only the rounded corners. Card material/content pixels stay intact.
        for (let y = 0; y < size.height; y++) for (let x = 0; x < size.width; x++) {
          const dx = Math.max(0, r - Math.min(x + .5, size.width - x - .5)), dy = Math.max(0, r - Math.min(y + .5, size.height - y - .5));
          if (dx && dy && Math.pow(dx / r, exponent) + Math.pow(dy / r, exponent) > 1) bytes[(y * size.width + x) * 4 + 3] = 0;
        }
        image = nativeImage.createFromBitmap(bytes, { width: size.width, height: size.height });
      }
      if (request.kind === 'card' && request.copy === true) { clipboard.writeImage(image); return { success: true, copied: true }; }
      const id = crypto.randomUUID(), directory = path.join(app.getPath('pictures'), 'Cardable');
      const fileName = `Cardable-${new Date().toISOString().replace(/[:.]/g, '-')}-${id.slice(0, 8)}.png`, filePath = path.join(directory, fileName);
      await fs.mkdir(directory, { recursive: true }); await fs.writeFile(filePath, image.toPNG(), { flag: 'wx' });
      captures.set(id, filePath); if (captures.size > 100) captures.delete(captures.keys().next().value);
      return { success: true, id, fileName };
    } catch (_) { return { success: false }; } finally { busy = false; }
  });
}
module.exports = { registerCaptureHandlers };
