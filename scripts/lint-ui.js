'use strict';
// A progress counter, deliberately not a pass/fail test. Artwork is reported too.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const patterns = {colors:/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi, durations:/\b\d*\.?\d+(?:ms|s)\b/g, easings:/(?<![-\w])cubic-bezier\([^)]*\)|(?<![-\w])ease(?:-in-out|-out|-in)?\b/g, radii:/border-radius\s*:[^;}]+/g, layers:/z-index\s*:[^;}]+/g, shadows:/(?:box|text)-shadow\s*:[^;}]+/g};
const totals = {}, files = [];
const refAt=process.argv.indexOf('--ref'),ref=refAt<0?null:process.argv[refAt+1];
const execFileSync=require('child_process').execFileSync;
const sources=ref?execFileSync('git',['ls-tree','-r','--name-only',ref,'src','electron/native'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).map(f=>path.join(root,f)):[...walk(path.join(root,'src')), ...walk(path.join(root,'electron/native'))];
for (const file of sources.filter(f=>f.endsWith('.css') && !/tokens\.css$/.test(f))) {
  const text=(ref?execFileSync('git',['show',ref+':'+path.relative(root,file).replace(/\\/g,'/')],{cwd:root,encoding:'utf8'}):fs.readFileSync(file,'utf8')).replace(/\/\*[\s\S]*?\*\//g,''), counts={};
  for (const [name,re] of Object.entries(patterns)) { counts[name]=(text.match(re)||[]).filter(v=>!v.includes('var(')&&!/:\s*(?:0|none|inherit|initial|unset)\s*$/.test(v)).length; totals[name]=(totals[name]||0)+counts[name]; }
  files.push({file:path.relative(root,file).replace(/\\/g,'/'),...counts});
}
if(process.argv.includes('--json')) console.log(JSON.stringify({files,totals},null,2));
else { for(const row of files) console.log(row.file+' '+Object.keys(patterns).map(k=>k+'='+row[k]).join(' ')); console.log('TOTAL '+JSON.stringify(totals)); console.log('Progress counts only; artwork exceptions and computed/inline values need human review.'); }
