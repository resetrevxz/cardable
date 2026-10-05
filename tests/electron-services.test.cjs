const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { CardableAutoUpdater } = require('../electron/updater/service');
const { DiscordRpcService } = require('../electron/discord/service');
const logger = { info() {}, warn() {}, error() {} };
function fixture(options = {}) {
  const engine = new EventEmitter(), states = [];
  engine.checkForUpdates = async () => engine.emit('update-available', { version: '4.0.1', releaseNotes: 'Notes' });
  engine.downloadUpdate = async () => { engine.emit('download-progress', { percent: 50, transferred: 512, total: 1024 }); engine.emit('update-downloaded', { version: '4.0.1' }); };
  engine.quitAndInstall = () => { engine.installs = (engine.installs || 0) + 1; };
  const updater = new CardableAutoUpdater({ engine, logger, currentVersion: '4.0.0', isPackaged: true, configured: true, broadcast: payload => states.push(payload), ...options });
  updater.init(); return { engine, updater, states };
}
test('updater: confirmed download/install, progress and postpone remain safe', async () => {
  const { updater, engine, states } = fixture();
  assert.equal(updater.quitAndInstall(), false);
  await updater.downloadUpdate(); assert.equal(updater.state, 'idle');
  await updater.checkForUpdates(); assert.equal(updater.state, 'update-available');
  await updater.downloadUpdate(); assert.equal(updater.state, 'install-ready');
  assert.equal(states.find(s => s.state === 'downloading' && s.downloadProgress).downloadProgress.percent, 50);
  await updater.checkForUpdates(); assert.equal(updater.state, 'install-ready'); assert.equal(engine.installs, undefined);
  assert.equal(engine.autoDownload, false); assert.equal(engine.autoInstallOnAppQuit, false);
  assert.equal(updater.quitAndInstall(), true); assert.equal(engine.installs, 1); updater.destroy();
});
test('updater: offline error can retry and concurrent checks are deduplicated', async () => {
  const { updater, engine } = fixture();
  engine.checkForUpdates = async () => { throw new Error('offline'); };
  await updater.checkForUpdates(); assert.equal(updater.state, 'error');
  let done, calls = 0;
  engine.checkForUpdates = () => { calls++; return new Promise(resolve => { done = resolve; }); };
  const first = updater.checkForUpdates(); await updater.checkForUpdates(); assert.equal(calls, 1);
  engine.emit('update-not-available', { version: '4.0.0' }); done(); await first;
  assert.equal(updater.state, 'no-update'); assert.equal(updater.errorMessage, null); updater.destroy();
});
test('updater: unconfigured/dev builds never contact a provider; listeners clean up', async () => {
  const { updater, engine } = fixture({ configured: false });
  engine.checkForUpdates = () => assert.fail('Unexpected network check');
  await updater.checkForUpdates(); assert.equal(updater.state, 'unconfigured');
  updater.destroy(); assert.equal(engine.listenerCount('error'), 0);
});
function rpcFixture(options = {}) {
  const clients = [], persisted = [];
  const service = new DiscordRpcService({ logger, persist: enabled => persisted.push(enabled), retryMs: 10,
    createClient: () => {
      const client = new EventEmitter(); clients.push(client);
      client.login = async () => { client.emit('ready'); };
      client.setActivity = async activity => { client.activity = activity; };
      client.clearActivity = async () => { client.cleared = true; };
      client.destroy = async () => { client.destroyed = true; }; return client;
    }, ...options });
  return { service, clients, persisted };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('Discord: no ID, absence and invalid screen data do not block the game', async () => {
  const { service, clients } = rpcFixture(); service.init(null, true);
  assert.equal(clients.length, 0); assert.equal(service.getStatus().state, 'unconfigured');
  assert.equal(service.setPresence({ screen: 'market' }), false); assert.equal(service.setPresence({ details: 'private data' }), false);
  service.destroy();
  const absent = rpcFixture({ createClient: () => { const client = new EventEmitter(); client.login = async () => { throw new Error('Discord closed'); }; client.destroy = async () => {}; return client; } }).service;
  absent.init('123456789012345678', true); await tick(); assert.equal(absent.getStatus().state, 'waiting'); absent.destroy();
});
test('Discord: activity is private, off clears it, reconnection resumes it', async () => {
  const { service, clients, persisted } = rpcFixture(); service.init('123456789012345678', true, 'cardable'); await tick();
  service.setPresence({ screen: 'inventory', currency: 999, cardId: 'secret' }); service.send(); await tick();
  assert.equal(clients[0].activity.details, 'Browsing the Collection'); assert.equal(clients[0].activity.currency, undefined);
  clients[0].emit('disconnected'); await new Promise(resolve => setTimeout(resolve, 20)); await tick();
  assert.equal(clients.length, 2); assert.equal(service.connected, true);
  service.setEnabled(false); await tick(); assert.equal(clients[1].cleared, true); assert.equal(clients[1].destroyed, true);
  assert.deepEqual(persisted, [false]); assert.equal(service.connected, false); service.destroy();
});
