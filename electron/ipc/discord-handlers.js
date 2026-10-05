const { IPC_CHANNELS } = require('./channels');
const discordService = require('../discord/rpc');
const { registerSecureHandler } = require('./security');

function registerDiscordHandlers() {
  registerSecureHandler(IPC_CHANNELS.DISCORD_SET_ENABLED, (event, enabled) => {
    return discordService.setEnabled(enabled);
  });
  registerSecureHandler(IPC_CHANNELS.DISCORD_SET_PRESENCE, (event, presence) => {
    return discordService.setPresence(presence);
  });

  registerSecureHandler(IPC_CHANNELS.DISCORD_CLEAR_PRESENCE, () => {
    discordService.clearPresence();
    return true;
  });

  registerSecureHandler(IPC_CHANNELS.DISCORD_GET_STATUS, () => {
    return discordService.getStatus();
  });
}

module.exports = { registerDiscordHandlers };
