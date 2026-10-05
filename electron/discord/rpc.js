/**
 * Discord RPC Service Boundary
 *
 * NOTE: Per explicit project instructions, actual Discord Rich Presence connection
 * is DEFERRED for this release. This module provides the architectural service boundary,
 * clean type-safe interfaces, and logging so that the Discord integration can be activated
 * later without restructuring Cardable's Electron architecture.
 *
 * See docs/DISCORD_RPC.md for complete integration instructions.
 */

const logger = require('../logging/logger');

class DiscordRpcService {
  constructor() {
    this.enabled = false;
    this.connected = false;
    this.currentPresence = null;
    this.clientId = null;
  }

  init(clientId = null) {
    this.clientId = clientId;
    logger.info('Discord RPC Service initialized (Status: DEFERRED / Boundary Ready)');
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled) {
      this.clearPresence();
    }
  }

  setPresence(presence = {}) {
    if (!this.enabled) return;
    this.currentPresence = presence;
    // Log presence update at debug level
    logger.debug('Discord presence updated (simulated):', presence);
  }

  clearPresence() {
    this.currentPresence = null;
    logger.debug('Discord presence cleared');
  }

  getStatus() {
    return {
      available: false,
      connected: this.connected,
      enabled: this.enabled,
      deferred: true,
      currentPresence: this.currentPresence,
      message: 'Discord Rich Presence is deferred. Architectural boundary is active.'
    };
  }

  destroy() {
    this.clearPresence();
    this.connected = false;
  }
}

const discordService = new DiscordRpcService();
module.exports = discordService;
