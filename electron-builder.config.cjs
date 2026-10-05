// Only public identifiers enter the application. CI credentials are never metadata.
const source = require('./package.json');
const publicConfig = require('./desktop-release.json');
const owner = process.env.CARDABLE_RELEASE_OWNER || publicConfig.owner;
const repository = process.env.CARDABLE_RELEASE_REPOSITORY || publicConfig.repository;
const discordApplicationId = process.env.CARDABLE_DISCORD_APPLICATION_ID || publicConfig.discordApplicationId;
if ((owner || repository) && (!/^[A-Za-z0-9-]+$/.test(owner || '') || !/^[A-Za-z0-9_.-]+$/.test(repository || ''))) {
  throw new Error('Set both valid public release owner and repository names.');
}
if (discordApplicationId && !/^\d{17,20}$/.test(discordApplicationId)) throw new Error('Invalid public Discord Application ID');
module.exports = {
  ...source.build,
  files: [...source.build.files, 'desktop-release.json', 'CHANGELOG.md'],
  publish: owner && repository ? { provider: 'github', owner, repo: repository, releaseType: 'draft' } : null,
  extraMetadata: {
    cardableDesktop: {
      releaseConfigured: !!(owner && repository),
      releaseRepository: owner && repository ? `${owner}/${repository}` : null,
      updatesMode: publicConfig.updates && publicConfig.updates.mode === 'github-public' ? 'github-public' : 'link',
      discordApplicationId: discordApplicationId || null,
      discordImageKey: publicConfig.discordImageKey || null
    }
  }
};
