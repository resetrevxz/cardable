const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const RPC = require('discord-rpc');
const logger = require('../logging/logger');
const { DiscordRpcService } = require('./service');
const { IPC_CHANNELS } = require('../ipc/channels');
function settingsPath() { return path.join(app.getPath('userData'), 'desktop-settings.json'); }
const service = new DiscordRpcService({
  createClient: () => new RPC.Client({ transport: 'ipc' }), logger,
  persist: enabled => {
    const target = settingsPath();
    fs.writeFileSync(target + '.tmp', JSON.stringify({ discordEnabled: enabled }), 'utf8');
    fs.renameSync(target + '.tmp', target);
  },
  changed: status => BrowserWindow.getAllWindows().forEach(win => win.webContents.send(IPC_CHANNELS.DISCORD_STATUS_CHANGED, status))
});
const init = service.init.bind(service);
service.init = () => {
  const metadata = require('../../package.json').cardableDesktop || {};
  let enabled = false;
  try { enabled = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')).discordEnabled === true; } catch (_) {}
  init(metadata.discordApplicationId, enabled, metadata.discordImageKey);
  logger.info(`Discord RPC: ${service.getStatus().state}`);
};
module.exports = service;
