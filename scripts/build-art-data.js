/* Offline authoring command: node scripts/build-art-data.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets', 'cards');
const output = path.join(root, 'assets', 'art-data');
fs.mkdirSync(output, { recursive: true });
const ids = fs.readdirSync(source).filter(name => name.endsWith('.webp') && !name.endsWith('-thumb.webp')).sort().map(name => name.slice(0, -5));
let bytes = 0;
function write(name, text) { const file = path.join(output, name); if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text); }
for (const id of ids) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Unsafe artwork id: ' + id);
  const data = fs.readFileSync(path.join(source, id + '.webp'));
  bytes += data.length;
  write(id + '.js', '/* Generated from assets/cards/' + id + '.webp. */\nCardable.art.register(' + JSON.stringify(id) + ', ' + JSON.stringify('data:image/webp;base64,' + data.toString('base64')) + ');\n');
}
write('manifest.js', '/* Generated availability index; contains no artwork bytes. */\nCardable.art.dataManifest = ' + JSON.stringify(ids) + ';\n');
console.log('Art data: ' + ids.length + ' originals, ' + bytes + ' source bytes. Runtime loads one requested card at a time.');
