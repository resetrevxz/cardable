const SCREENS = Object.freeze({ menu: 'Browsing the Main Menu', opening: 'Opening GPU Packs',
  inventory: 'Browsing the Collection', detail: 'Inspecting their Collection', creator: 'Creating in Cardable' });

class DiscordRpcService {
  constructor({ createClient, logger, persist = () => {}, changed = () => {}, retryMs = 15000 }) {
    Object.assign(this, { createClient, logger, persist, changed, retryMs });
    this.enabled = false; this.connected = false; this.client = null;
    this.screen = 'menu'; this.startedAt = new Date(); this.retry = this.throttle = this.timeout = null;
  }
  init(clientId, enabled = false, imageKey = null) {
    this.clientId = /^\d{17,20}$/.test(clientId || '') ? clientId : null;
    this.imageKey = /^[a-z0-9_-]{1,64}$/.test(imageKey || '') ? imageKey : null;
    this.setEnabled(enabled, false);
  }
  getStatus() { return { configured: !!this.clientId, enabled: this.enabled, connected: this.connected,
    state: !this.clientId ? 'unconfigured' : !this.enabled ? 'disabled' : this.connected ? 'connected' : 'waiting' }; }
  notify() { this.changed(this.getStatus()); }
  setEnabled(enabled, save = true) {
    if (typeof enabled !== 'boolean') return false;
    if (save) { try { this.persist(enabled); } catch (_) { return false; } }
    this.enabled = enabled;
    if (enabled && this.clientId) this.connect(); else this.disconnect(true);
    this.notify(); return true;
  }
  connect() {
    if (!this.enabled || !this.clientId || this.client || this.retry) return;
    const client = this.createClient(); this.client = client;
    const lost = () => {
      if (this.client !== client) return;
      this.disconnect(false);
      this.logger.info('Discord RPC unavailable; reconnect scheduled');
      if (this.enabled) { this.retry = setTimeout(() => { this.retry = null; this.connect(); }, this.retryMs); this.retry.unref(); }
      this.notify();
    };
    client.on('ready', () => {
      if (this.client !== client || !this.enabled) return;
      clearTimeout(this.timeout); this.timeout = null; this.connected = true;
      this.logger.info('Discord RPC connected'); this.notify(); this.send();
    });
    client.on('disconnected', lost); client.on('error', lost);
    this.timeout = setTimeout(lost, 8000); this.timeout.unref();
    Promise.resolve().then(() => client.login({ clientId: this.clientId })).catch(lost);
  }
  setPresence(presence) {
    if (!presence || typeof presence !== 'object' || !Object.hasOwn(SCREENS, presence.screen)) return false;
    this.screen = presence.screen;
    if (!this.throttle) { this.throttle = setTimeout(() => { this.throttle = null; this.send(); }, 1500); this.throttle.unref(); }
    return true;
  }
  send() {
    if (!this.enabled || !this.connected || !this.client) return;
    const activity = { details: SCREENS[this.screen], startTimestamp: this.startedAt, instance: false };
    if (this.imageKey) Object.assign(activity, { largeImageKey: this.imageKey, largeImageText: 'Cardable' });
    const client = this.client;
    Promise.resolve().then(() => { if (this.enabled && this.client === client) return client.setActivity(activity); }).catch(() => {
      this.logger.warn('Discord activity failed; waiting for reconnect');
      this.disconnect(false);
      if (this.enabled && !this.retry) { this.retry = setTimeout(() => { this.retry = null; this.connect(); }, this.retryMs); this.retry.unref(); }
      this.notify();
    });
  }
  clearPresence() {
    if (!this.connected || !this.client) return Promise.resolve(true);
    const client = this.client;
    return Promise.resolve().then(() => client.clearActivity()).then(() => true, () => false);
  }
  disconnect(clear) {
    clearTimeout(this.retry); clearTimeout(this.throttle); clearTimeout(this.timeout);
    this.retry = this.throttle = this.timeout = null;
    const client = this.client, wasConnected = this.connected; this.client = null; this.connected = false;
    if (client) {
      // Clear first, then close the IPC transport; disconnect also removes activity.
      const pending = clear && wasConnected ? Promise.race([
        Promise.resolve().then(() => client.clearActivity()).catch(() => {}),
        new Promise(resolve => { const timer = setTimeout(resolve, 500); timer.unref(); })
      ]) : Promise.resolve();
      pending.then(() => client.destroy()).catch(() => {});
    }
  }
  destroy() { this.enabled = false; this.disconnect(true); }
}
module.exports = { DiscordRpcService, SCREENS };
