'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),context={window:{Cardable:{data:{}}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/data/patchnotes.js'),'utf8'),context);
const notes=context.window.Cardable.data.patchNotes;
const text=notes.map(n=>n.markdown || '## '+n.version+'\n\n'+n.sections.map(s=>'### '+s.title+'\n\n'+s.items.map(i=>'- '+i.text).join('\n')).join('\n\n')).join('\n\n').trim()+'\n';
fs.writeFileSync(path.join(root,'CHANGELOG.md'),text);
console.log('Generated CHANGELOG.md from '+notes.length+' structured versions; app version unchanged.');
