// Only public identifiers enter the application. CI credentials are never metadata.
const source = require('./package.json');
const publicConfig = require('./desktop-release.json');
const path = require('node:path');
const fs = require('node:fs');
const owner = process.env.CARDABLE_RELEASE_OWNER || publicConfig.owner;
const repository = process.env.CARDABLE_RELEASE_REPOSITORY || publicConfig.repository;
const discordApplicationId = process.env.CARDABLE_DISCORD_APPLICATION_ID || publicConfig.discordApplicationId;
if ((owner || repository) && (!/^[A-Za-z0-9-]+$/.test(owner || '') || !/^[A-Za-z0-9_.-]+$/.test(repository || ''))) {
  throw new Error('Set both valid public release owner and repository names.');
}
if (discordApplicationId && !/^\d{17,20}$/.test(discordApplicationId)) throw new Error('Invalid public Discord Application ID');
const updatesMode = publicConfig.updates?.mode || 'automatic';
if (!['automatic', 'link', 'github-public'].includes(updatesMode)) throw new Error('Invalid updates mode');
// Build-only credentials/configuration. Nothing below enters app metadata.
const signingMode = process.env.CARDABLE_SIGNING_MODE || 'certificate';
const requireSigning = process.env.CARDABLE_REQUIRE_SIGNING === '1';
const publisherName = process.env.CARDABLE_SIGNING_PUBLISHER;
if (requireSigning && !publisherName) throw new Error('A signed release requires CARDABLE_SIGNING_PUBLISHER matching the certificate Common Name');
const signing = {};
const signtoolOptions = { signingHashAlgorithms: ['sha256'] };
if (publisherName) signtoolOptions.publisherName = publisherName;
if (process.env.CARDABLE_CERTIFICATE_SUBJECT) signtoolOptions.certificateSubjectName = process.env.CARDABLE_CERTIFICATE_SUBJECT;
if (process.env.CARDABLE_CERTIFICATE_SHA1) signtoolOptions.certificateSha1 = process.env.CARDABLE_CERTIFICATE_SHA1;
if (signingMode === 'azure') {
  const fields = {
    publisherName, endpoint: process.env.CARDABLE_AZURE_SIGNING_ENDPOINT,
    certificateProfileName: process.env.CARDABLE_AZURE_CERTIFICATE_PROFILE,
    codeSigningAccountName: process.env.CARDABLE_AZURE_SIGNING_ACCOUNT
  };
  if (Object.values(fields).some(value => !value)) throw new Error('Azure signing requires publisher, endpoint, account and certificate profile');
  const endpoint = new URL(fields.endpoint);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !endpoint.hostname.endsWith('.codesigning.azure.net')) throw new Error('Invalid Azure signing endpoint');
  signing.azureSignOptions = fields;
} else if (signingMode === 'custom') {
  const hook = process.env.CARDABLE_SIGN_SCRIPT;
  if (!hook || !fs.statSync(path.resolve(__dirname, hook)).isFile()) throw new Error('Custom signing requires an existing signing hook');
  if (!publisherName) throw new Error('Custom signing requires the exact certificate publisher');
  signing.signtoolOptions = { ...signtoolOptions, sign: path.resolve(__dirname, hook) };
} else if (signingMode !== 'certificate') throw new Error('Invalid signing mode: use certificate, azure or custom');
else if (Object.keys(signtoolOptions).length) signing.signtoolOptions = signtoolOptions;
module.exports = {
  ...source.build,
  forceCodeSigning: requireSigning,
  win: { ...source.build.win, ...signing },
  files: [...source.build.files, 'desktop-release.json', 'CHANGELOG.md'],
  publish: owner && repository ? { provider: 'github', owner, repo: repository, releaseType: 'draft' } : null,
  extraMetadata: {
    cardableDesktop: {
      releaseConfigured: !!(owner && repository),
      releaseRepository: owner && repository ? `${owner}/${repository}` : null,
      updatesMode,
      discordApplicationId: discordApplicationId || null,
      discordImageKey: publicConfig.discordImageKey || null
    }
  }
};
