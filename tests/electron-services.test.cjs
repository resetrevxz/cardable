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
test('logging: native Error causes survive serialization without arbitrary Error properties', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const lines = [], module = { exports: {} };
  const output = { log: line => lines.push(line), warn: line => lines.push(line), error: line => lines.push(line) };
  vm.runInNewContext('(function(require,module){' + fs.readFileSync(path.join(__dirname,'../electron/logging/logger.js'),'utf8') + '\n})', { Error, console: output })((name) => name === 'electron' ? {} : require(name), module);
  const error = new Error('Native operation failed'); error.privatePayload = 'not diagnostic data';
  module.exports.error('Operation:', error);
  assert.match(lines[0], /Native operation failed/);
  assert(!lines[0].includes('privatePayload')); assert(!lines[0].includes('not diagnostic data'));
  module.exports.error('Bounded:', new Error('x'.repeat(10000)));
  assert(lines[1].length < 2300);
});
test('desktop presence: Studio/Director and developer contexts are private and independently restored', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const listeners = {}, sent = [];
  const window = { Cardable: { events: { on: (name, handler) => { listeners[name] = handler; } } },
    cardableDesktop: { discord: { setPresence: presence => sent.push(presence) }, logs: { write() {} } }, addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/core/desktop.js'), 'utf8'), { window });
  window.Cardable.desktop.init();
  listeners['inventory:context']({ active: true }); listeners['detail:opened']();
  listeners['studio:enter']({ card: 'private', currency: 42 });
  assert.equal(sent.at(-1).screen, 'creator');
  listeners['menu:visibilityHold']({ reason: 'developer', active: true });
  listeners['studio:exit'](); assert.equal(sent.at(-1).screen, 'creator');
  listeners['menu:visibilityHold']({ reason: 'developer', active: false });
  assert.equal(sent.at(-1).screen, 'detail');
  assert(sent.every(presence => Object.keys(presence).join(',') === 'screen'));
});
test('IPC: accepts only the app document main frame, rejects remote/child/other files', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { pathToFileURL } = require('node:url');
  const handlers = {}, root = path.resolve(__dirname, '..'), module = { exports: {} };
  const electron = { app: { getAppPath: () => root }, ipcMain: { handle: (name, handler) => { handlers[name] = handler; } } };
  vm.runInNewContext('(function(require,module){' + fs.readFileSync(path.join(root,'electron/ipc/security.js'),'utf8') + '\n})', { URL, process })((name) => name === 'electron' ? electron : name === '../logging/logger' ? logger : require(name), module);
  const api=module.exports, frame={url:pathToFileURL(path.join(root,'index.html')).href+'?dev=1'}, event={senderFrame:frame,sender:{mainFrame:frame}};
  assert.equal(api.isTrustedSender(event),true);
  assert.equal(api.isTrustedSender({...event,senderFrame:{...frame}}),false);
  for(const url of ['https://example.com','data:text/html,anything',pathToFileURL(path.join(root,'package.json')).href]) {
    frame.url=url; assert.equal(api.isTrustedSender(event),false);
  }
  api.registerSecureHandler('test',()=>42); await assert.rejects(handlers.test(event),/Untrusted/);
  frame.url=pathToFileURL(path.join(root,'index.html')).href; assert.equal(await handlers.test(event),42);
});
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
