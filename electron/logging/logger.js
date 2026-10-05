const fs = require('fs');
const path = require('path');
const { app, shell } = require('electron');

class Logger {
  constructor() {
    this.logDir = null;
    this.logFile = null;
    this.maxBytes = 5 * 1024 * 1024; // 5 MB
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.logFile = path.join(this.logDir, 'cardable.log');
      this.rotateIfNeeded();
      this.initialized = true;

      this.info('====================================================');
      this.info(`Cardable Desktop Launching - Version ${app.getVersion()}`);
      this.info(`Electron: ${process.versions.electron}, Node: ${process.versions.node}, Chromium: ${process.versions.chrome}`);
      this.info(`Platform: ${process.platform} (${process.arch}) - OS: ${process.getSystemVersion()}`);
      this.info(`Executable: ${process.execPath}`);
      this.info(`UserData: ${app.getPath('userData')}`);
      this.info('====================================================');
    } catch (e) {
      console.error('Failed to initialize logger:', e);
    }
  }

  rotateIfNeeded() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxBytes) {
          const oldFile = path.join(this.logDir, 'cardable.old.log');
          if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
          fs.renameSync(this.logFile, oldFile);
        }
      }
    } catch (_) {}
  }

  write(level, message, meta) {
    const timestamp = new Date().toISOString();
    let line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (meta !== undefined) {
      try {
        line += ' ' + (typeof meta === 'object' ? JSON.stringify(meta) : String(meta));
      } catch (_) {}
    }
    line += '\n';

    // Output to console in development
    if (level === 'ERROR') {
      console.error(line.trim());
    } else if (level === 'WARN') {
      console.warn(line.trim());
    } else {
      console.log(line.trim());
    }

    if (!this.initialized || !this.logFile) return;
    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.logFile, line, 'utf8');
    } catch (e) {
      console.error('Failed to write log to file:', e);
    }
  }

  info(msg, meta) { this.write('INFO', msg, meta); }
  warn(msg, meta) { this.write('WARN', msg, meta); }
  error(msg, meta) { this.write('ERROR', msg, meta); }
  debug(msg, meta) { this.write('DEBUG', msg, meta); }

  getLogPath() {
    return this.logFile || (this.logDir ? path.join(this.logDir, 'cardable.log') : '');
  }

  async openLogFolder() {
    if (this.logDir && fs.existsSync(this.logDir)) {
      return !(await shell.openPath(this.logDir));
    }
    return false;
  }
}

const logger = new Logger();
module.exports = logger;
