'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), pkg = require('../package.json'), release = require('../desktop-release.json');
if (!release.owner || !release.repository) throw new Error('Configure the public release repository first.');
const repo = `${release.owner}/${release.repository}`, output = path.join(root, 'dist', 'site');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
for (const name of ['index.html', 'style.css', 'site.js']) fs.copyFileSync(path.join(root, 'site', name), path.join(output, name));
const resources = [['assets/icons/icon.svg', 'icon.svg'], ['assets/fonts/inter-variable.woff2', 'inter-variable.woff2'], ['assets/fonts/jetbrains-mono-variable.woff2', 'jetbrains-mono-variable.woff2'], ['assets/fonts/Inter-OFL.txt', 'Inter-OFL.txt'], ['assets/fonts/JetBrainsMono-OFL.txt', 'JetBrainsMono-OFL.txt'], ...['geforce-rtx-4090', 'geforce-rtx-3090', 'radeon-rx-7900-xtx'].map(id => [`assets/cards/${id}.webp`, `${id}.webp`])];
for (const [from, to] of resources) fs.copyFileSync(path.join(root, from), path.join(output, 'assets', to));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
const base = `https://github.com/${repo}/releases/latest/download/`;
const info = { version: pkg.version, installer: base + `Cardable-Setup-${pkg.version}.exe`, folder: base + `Cardable-${pkg.version}-Windows-x64.zip` };
const pointer = path.join(root, 'dist', 'delivery', 'latest.json');
if (fs.existsSync(pointer)) {
  const delivery = JSON.parse(fs.readFileSync(pointer));
  const installer = path.resolve(root, 'dist', 'delivery', delivery.installer);
  if (delivery.version === pkg.version && delivery.status === 'ready' && fs.existsSync(installer)) info.installerBytes = fs.statSync(installer).size;
}
fs.writeFileSync(path.join(output, 'release.js'), 'window.CARDABLE_RELEASE = ' + JSON.stringify(info) + ';\n');
let html = fs.readFileSync(path.join(output, 'index.html'), 'utf8').replace(/https:\/\/github\.com\/resetrevxz\/cardable/g, `https://github.com/${repo}`);
html = html.replace(/Cardable-Setup-\d+\.\d+\.\d+\.exe/g, `Cardable-Setup-${pkg.version}.exe`).replace(/Cardable-\d+\.\d+\.\d+-Windows-x64\.zip/g, `Cardable-${pkg.version}-Windows-x64.zip`).replace(/(<span data-version>)V1\.0\.0/g, '$1V' + pkg.version).replace(/(Windows installer · )v1\.0\.0/g, '$1v' + pkg.version);
fs.writeFileSync(path.join(output, 'index.html'), html);
console.log(`Cardable ${pkg.version} site built at dist/site; complete-folder and installer links configured.`);
