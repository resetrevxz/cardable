'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '..'), archive = path.join(root, 'dist/win-unpacked/resources/app.asar');
const read = name => asar.extractFile(archive, path.normalize(name)).toString('utf8');
const source = require('../package.json'), packaged = JSON.parse(read('package.json'));
assert.equal(packaged.version, source.version); assert.equal(packaged.main, 'electron/main.js');
assert.equal(packaged.productName, 'Cardable');
assert(!packaged.cardableDesktop.updateFixture && !packaged.cardableDesktop.fixtureProfile);
assert(!packaged.scripts && !packaged.devDependencies, 'Development metadata must be stripped');
const files = new Set(asar.listPackage(archive).map(file => file.replace(/^[/\\]/, '').replaceAll('\\', '/')));
const html = read('index.html');
assert(html.includes('Content-Security-Policy')); assert(!/<script[^>]+type="module"/.test(html));
const references = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)].map(match => match[1]).filter(value => !/^(?:https?:|data:|#)/.test(value));
for (const file of references) assert(files.has(file), 'Missing packaged HTML resource: ' + file);
for (const file of ['assets/icons/icon.ico', 'assets/icons/icon.png', 'electron/preload.js']) assert(files.has(file), 'Missing ' + file);
const appFiles = [...files].filter(file => /^(?:src|electron|vendor)\/.+\.(?:js|css)$/.test(file));
for (const file of appFiles) {
  const text = read(file);
  assert(!/[CD]:[\\/]Cardable/i.test(text), 'Developer absolute path in ' + file);
  assert(!/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text), 'Credential pattern in ' + file);
  if (file.endsWith('.js')) new vm.Script(text, { filename: file });
}
const channels = require('../electron/ipc/channels').IPC_CHANNELS;
const preload = read('electron/preload.js');
for (const [key, value] of Object.entries(channels)) assert(preload.includes(`${key}: '${value}'`), 'Preload channel drift: ' + key);
const metadataPath = path.join(root, 'dist/win-unpacked/resources/app-update.yml');
if (packaged.cardableDesktop.releaseConfigured) {
  const metadata = fs.readFileSync(metadataPath, 'utf8'); assert(metadata.includes('provider: github'));
  assert(!/token:|password:|127\.0\.0\.1|localhost/i.test(metadata));
}
assert(fs.existsSync(path.join(root, 'dist/win-unpacked/Cardable.exe')));
console.log(`ASAR verified: ${references.length} local HTML resources, ${appFiles.length} JS/CSS files, version/icon/CSP/channel parity, no development fixture metadata or detected credential patterns.`);
