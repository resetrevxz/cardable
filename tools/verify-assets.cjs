const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const scriptMatches = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
const cssMatches = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);

let missing = 0;
for (const rel of [...scriptMatches, ...cssMatches]) {
  if (rel.startsWith('http')) continue;
  const full = path.join(__dirname, '..', rel);
  if (!fs.existsSync(full)) {
    console.error('MISSING FILE:', rel);
    missing++;
  }
}
if (missing === 0) {
  console.log('All ' + scriptMatches.length + ' scripts and ' + cssMatches.length + ' stylesheets in index.html EXIST!');
} else {
  console.error(missing + ' files missing!');
  process.exitCode = 1;
}
