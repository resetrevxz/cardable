const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');
const desktopConfig = require('../config/desktop-config');
const logger = require('../logging/logger');

class WindowStateKeeper {
  constructor() {
    this.statePath = null;
    this.state = null;
    this.saveTimeout = null;
  }

  init() {
    this.statePath = path.join(app.getPath('userData'), desktopConfig.storage.windowStateFileName);
    this.loadState();
  }

  loadState() {
    const defaults = {
      width: desktopConfig.defaultWidth,
      height: desktopConfig.defaultHeight,
      x: undefined,
      y: undefined,
      isMaximized: false,
      isFullScreen: false
    };

    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = {
          width: Number.isFinite(parsed.width) ? parsed.width : defaults.width,
          height: Number.isFinite(parsed.height) ? parsed.height : defaults.height,
          x: Number.isFinite(parsed.x) ? parsed.x : undefined,
          y: Number.isFinite(parsed.y) ? parsed.y : undefined,
          isMaximized: parsed.isMaximized === true,
          isFullScreen: parsed.isFullScreen === true,
          miniX: Number.isFinite(parsed.miniX) ? parsed.miniX : undefined,
          miniY: Number.isFinite(parsed.miniY) ? parsed.miniY : undefined,
          miniPinned: typeof parsed.miniPinned === 'boolean' ? parsed.miniPinned : undefined,
          miniOpacity: Number.isFinite(parsed.miniOpacity) ? Math.max(.5,Math.min(1,parsed.miniOpacity)) : 1,
          miniByDisplay: Object.fromEntries(Object.entries(parsed.miniByDisplay && typeof parsed.miniByDisplay === 'object' ? parsed.miniByDisplay : {}).filter(([id,v])=>/^-?\d+$/.test(id)&&v&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,16))
        };
        this.validateStateAgainstDisplays();
        return;
      }
    } catch (e) {
      logger.warn('Failed to load window state, falling back to defaults:', e.message);
    }
    this.state = defaults;
  }

  validateStateAgainstDisplays() {
    if (!this.state) return;

    // Check if the saved position intersects with any active display
    const displays = screen.getAllDisplays();
    const hasPosition = this.state.x !== undefined && this.state.y !== undefined;
    const isVisible = hasPosition && displays.some(display => {
      const area = display.workArea;
      // Allow bounds if at least some reasonable part of the window is visible
      return (
        this.state.x + 100 >= area.x &&
        this.state.x < area.x + area.width &&
        this.state.y >= area.y &&
        this.state.y < area.y + area.height
      );
    });

    if (hasPosition && !isVisible) {
      logger.info('Saved window position was offscreen or on a disconnected display, resetting to center.');
      this.state.x = undefined;
      this.state.y = undefined;
    }

    // Keep the restored window usable after DPI or monitor-layout changes.
    const target = this.state.x === undefined
      ? screen.getPrimaryDisplay()
      : displays.find(display => {
        const area = display.workArea;
        return this.state.x >= area.x && this.state.x < area.x + area.width && this.state.y >= area.y && this.state.y < area.y + area.height;
      }) || screen.getPrimaryDisplay();
    const area = target.workArea;
    this.state.width = Math.min(area.width, Math.max(desktopConfig.minWidth, this.state.width || desktopConfig.defaultWidth));
    this.state.height = Math.min(area.height, Math.max(desktopConfig.minHeight, this.state.height || desktopConfig.defaultHeight));
  }

  track(window) {
    const updateState = () => {
      if (!window || window.isDestroyed()) return;

      if (!window.isMaximized() && !window.isFullScreen()) {
        const bounds = window.getBounds();
        this.state.x = bounds.x;
        this.state.y = bounds.y;
        this.state.width = bounds.width;
        this.state.height = bounds.height;
      }
      this.state.isMaximized = window.isMaximized();
      this.state.isFullScreen = window.isFullScreen();

      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.saveState(), 500);
    };

    window.on('resize', updateState);
    window.on('move', updateState);
    window.on('maximize', updateState);
    window.on('unmaximize', updateState);
    window.on('enter-full-screen', updateState);
    window.on('leave-full-screen', updateState);
    window.on('close', () => {
      clearTimeout(this.saveTimeout);
      this.saveState();
    });
  }

  saveState() {
    try {
      if (!this.statePath) return;
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      logger.warn('Failed to save window state:', e.message);
    }
  }
}

module.exports = new WindowStateKeeper();
