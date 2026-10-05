const UPDATER_STATES = Object.freeze({
  IDLE: 'idle', CHECKING: 'checking', UPDATE_AVAILABLE: 'update-available',
  DOWNLOADING: 'downloading', UPDATE_DOWNLOADED: 'update-downloaded',
  INSTALL_READY: 'install-ready', NO_UPDATE: 'no-update', ERROR: 'error', UNCONFIGURED: 'unconfigured'
});

class CardableAutoUpdater {
  constructor({ engine, currentVersion, isPackaged, configured, logger, broadcast = () => {} }) {
    Object.assign(this, { engine, currentVersion, isPackaged, configured, logger, broadcast });
    this.state = configured ? UPDATER_STATES.IDLE : UPDATER_STATES.UNCONFIGURED;
    this.updateInfo = this.downloadProgress = this.errorMessage = null;
    this.operation = null;
    this.listeners = [];
    this.timers = [];
  }
  init() {
    const e = this.engine;
    e.logger = this.logger;
    e.autoDownload = false;
    e.autoInstallOnAppQuit = false;
    e.allowPrerelease = this.currentVersion.includes('-');
    const on = (name, fn) => { e.on(name, fn); this.listeners.push([name, fn]); };
    on('checking-for-update', () => this.setState(UPDATER_STATES.CHECKING));
    on('update-available', info => { this.updateInfo = this.cleanInfo(info); this.setState(UPDATER_STATES.UPDATE_AVAILABLE); });
    on('update-not-available', info => { this.updateInfo = this.cleanInfo(info); this.setState(UPDATER_STATES.NO_UPDATE); });
    on('download-progress', info => {
      this.downloadProgress = {
        percent: Math.max(0, Math.min(100, Math.round(info.percent || 0))),
        transferred: Math.max(0, info.transferred || 0), total: Math.max(0, info.total || 0),
        bytesPerSecond: Math.max(0, info.bytesPerSecond || 0)
      };
      this.setState(UPDATER_STATES.DOWNLOADING);
    });
    on('update-downloaded', info => {
      this.updateInfo = this.cleanInfo(info);
      this.setState(UPDATER_STATES.UPDATE_DOWNLOADED);
      this.setState(UPDATER_STATES.INSTALL_READY);
    });
    on('error', error => this.fail(error));
    if (this.configured && this.isPackaged) {
      const first = setTimeout(() => this.checkForUpdates(false), 30000);
      const interval = setInterval(() => this.checkForUpdates(false), 6 * 60 * 60 * 1000);
      first.unref(); interval.unref(); this.timers.push(first, interval);
    }
  }
  cleanInfo(info) {
    if (!info) return null;
    return { version: info.version, releaseDate: info.releaseDate, releaseName: info.releaseName, releaseNotes: info.releaseNotes };
  }
  setState(state) {
    this.state = state;
    this.logger.info(`Updater state: ${state}`);
    this.broadcast(this.getStatePayload());
  }
  fail(error) {
    this.errorMessage = String(error && error.message || error || 'Unknown update error').slice(0, 1000);
    this.setState(UPDATER_STATES.ERROR);
    this.logger.warn(`Updater: ${this.errorMessage}`);
  }
  getStatePayload() {
    return { state: this.state, currentVersion: this.currentVersion, updateInfo: this.updateInfo,
      downloadProgress: this.downloadProgress, errorMessage: this.errorMessage,
      isPackaged: this.isPackaged, configured: this.configured };
  }
  async checkForUpdates() {
    if (this.operation || ['install-ready', 'update-downloaded', 'downloading'].includes(this.state)) return this.getStatePayload();
    if (!this.isPackaged || !this.configured) return this.getStatePayload();
    this.errorMessage = null; this.downloadProgress = null;
    this.setState(UPDATER_STATES.CHECKING);
    this.operation = 'check';
    try { await this.engine.checkForUpdates(); } catch (e) { this.fail(e); }
    finally { this.operation = null; }
    return this.getStatePayload();
  }
  async downloadUpdate() {
    if (this.operation || this.state !== UPDATER_STATES.UPDATE_AVAILABLE) return this.getStatePayload();
    this.errorMessage = null;
    this.operation = 'download'; this.setState(UPDATER_STATES.DOWNLOADING);
    try { await this.engine.downloadUpdate(); } catch (e) { this.fail(e); }
    finally { this.operation = null; }
    return this.getStatePayload();
  }
  quitAndInstall() {
    if (this.state !== UPDATER_STATES.INSTALL_READY) return false;
    try { this.engine.quitAndInstall(false, true); return true; }
    catch (e) { this.fail(e); return false; }
  }
  destroy() {
    this.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); this.timers = [];
    this.listeners.forEach(([event, fn]) => this.engine.removeListener(event, fn)); this.listeners = [];
  }
}
module.exports = { CardableAutoUpdater, UPDATER_STATES };
