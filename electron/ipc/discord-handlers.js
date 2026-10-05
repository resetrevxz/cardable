const { ipcMain } = require('electron');
const { IPC_CHANNELS } = require('./channels');
const discordService = require('../discord/rpc');

function registerDiscordHandlers() {
  ipcMain.handle(IPC_CHANNELS.DISCORD_SET_PRESENCE, (event, presence) => {
    discordService.setPresence(presence);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.DISCORD_CLEAR_PRESENCE, () => {
    discordService.clearPresence();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.DISCORD_GET_STATUS, () => {
    return discordService.getStatus();
  });
}

module.exports = { registerDiscordHandlers };
