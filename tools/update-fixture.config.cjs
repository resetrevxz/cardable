const path = require('node:path'), os = require('node:os');
const base = require('../electron-builder.config.cjs');
const target = path.resolve(process.env.CARDABLE_FIXTURE_OUTPUT || '');
if (!target.startsWith(path.join(os.tmpdir(), 'cardable-update-'))) throw new Error('Update fixture output must be an isolated test directory');
const version = process.env.CARDABLE_FIXTURE_VERSION;
if (!['4.0.0','4.0.1'].includes(version)) throw new Error('Invalid update fixture version');
const feed = new URL(process.env.CARDABLE_FIXTURE_FEED);
if (feed.hostname !== '127.0.0.1' || feed.protocol !== 'http:') throw new Error('Fixture feed must be loopback');
module.exports = {
  ...base, appId: 'com.cardable.migration.fixture', productName: 'Cardable Migration Fixture',
  directories: { ...base.directories, output: target },
  win: { ...base.win, executableName: 'CardableFixture', artifactName: 'Cardable-Fixture-${version}.${ext}', target: ['nsis'] },
  nsis: { ...base.nsis, createDesktopShortcut: false, createStartMenuShortcut: false, runAfterFinish: false, deleteAppDataOnUninstall: false, uninstallDisplayName: 'Cardable Migration Fixture' },
  publish: { provider: 'generic', url: feed.href },
  extraMetadata: { name: 'cardable-migration-fixture', version, cardableDesktop: {
    releaseConfigured: true, updateFixture: version === '4.0.0' ? 'A' : 'B',
    fixtureProfile: path.join(path.dirname(target), 'profile')
  } }
};
