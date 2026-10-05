const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = require('../package.json');
if (!/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(source.version)) throw new Error('Use MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-beta.N');
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : null;
if (tag && tag !== `v${source.version}`) throw new Error('Tag does not match package version');
const gameConfig = fs.readFileSync(path.join(root, 'src/config.js'), 'utf8');
if (!gameConfig.includes(`version: '${source.version}'`)) throw new Error('Renderer version differs from package version');
const notes = path.join(root, 'changelog', `${source.version}.md`);
if (!fs.existsSync(notes) || fs.statSync(notes).size < 40) throw new Error('Add release notes in changelog/<version>.md');
if (process.argv.includes('--artifacts')) {
  const installer = path.join(root, 'dist', `Cardable-Setup-${source.version}.exe`);
  const channel = source.version.includes('-') ? 'beta.yml' : 'latest.yml';
  const metadata = fs.readFileSync(path.join(root, 'dist', channel), 'utf8');
  if (!metadata.includes(`version: ${source.version}`) || !metadata.includes(path.basename(installer))) throw new Error('Updater metadata differs from artifacts');
  const sha512 = crypto.createHash('sha512').update(fs.readFileSync(installer)).digest('base64');
  if (!metadata.includes(sha512)) throw new Error('Updater artifact checksum mismatch');
  if (!fs.existsSync(installer + '.blockmap')) throw new Error('Missing differential update blockmap');
}
console.log(`Release ${source.version}: version, notes${process.argv.includes('--artifacts') ? ', installer, updater metadata and checksum' : ''} validated.`);
