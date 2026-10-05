'use strict';
const fs = require('node:fs');
const base = require('../electron-builder.config.cjs');
const input = process.env.CARDABLE_DELIVERY_INPUT;
if (!input) throw new Error('Use npm run deliver:desktop for this configuration.');
const identity = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!/^[0-9a-f]{40}$/.test(identity.sourceRevision) || !/^[0-9a-f]{64}$/.test(identity.sourceFingerprint) || !/^[0-9TZ.-]+-[0-9a-f]{12}$/.test(identity.buildId)) throw new Error('Invalid delivery identity');
module.exports = {...base, extraMetadata: {...base.extraMetadata, cardableDelivery: {
  buildId: identity.buildId, sourceRevision: identity.sourceRevision, sourceFingerprint: identity.sourceFingerprint
}}};
