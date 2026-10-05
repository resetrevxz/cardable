# Discord Rich Presence

RPC runs only in the Electron main process through the discord-rpc IPC transport. It uses a public Discord Application ID, never an OAuth secret, bot token or account credential. Set discordApplicationId in desktop-release.json or the public CI variable CARDABLE_DISCORD_APPLICATION_ID. Optionally set discordImageKey to a branding asset uploaded to that Discord application.

Off is the default. The Settings switch persists under userData/desktop-settings.json, independently of game progress. Without an Application ID, the switch is unavailable and the game still runs/builds/tests. When enabled, the service connects asynchronously, times out after eight seconds, reconnects after failures/restarts and throttles screen changes. Disabling clears activity and destroys the connection.

Only fixed screen descriptions are allowed: main menu, pack opening, collection, collection inspection and developer creation. Session elapsed time and an optional Cardable image are sent. No collection contents, GPU model, serial, currency, player code, username, save file or market activity is sent. There is no market implementation.

Service tests cover absence, reconnect, disabling and privacy with injected clients. A real Discord-connected test is still required with the owner's public Application ID: enable, inspect each screen, disable and confirm activity disappears, close/reopen Discord, then verify reconnection. No ID or credentials are needed to complete local migration work. The IPC protocol is documented by [Discord](https://docs.discord.com/developers/topics/rpc).
