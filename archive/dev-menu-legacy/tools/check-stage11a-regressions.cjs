'use strict';
// Logic gate only. This does not launch a browser or claim raster/FPS acceptance.
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const suites = ['check-stage1','check-stage2','check-stage3','check-stage3-tiers7-9',
 'check-stage3-tiers10-12','check-stage4','check-stage5','check-stage5-reveal',
 'check-stage6','check-stage7','check-stage8','check-new-features','check-visual-fixes',
 'check-bug-pass','check-inventory-refresh','check-card-remake','check-stage11a'];
const results = suites.map(name=>{
 const run = spawnSync(process.execPath,[path.join(__dirname,name+'.cjs')],{cwd:root,encoding:'utf8',timeout:180000});
 const output = (run.stdout||'')+(run.stderr||'');
 const pass = run.status===0&&!/^FAIL /m.test(output);
 const result = {suite:name,pass,groups:(output.match(/^PASS /gm)||[]).length,output};
 console.log((pass?'PASS ':'FAIL ')+name+' · '+result.groups+' groups');return result;
});
const evidence = {environment:'Classic scripts in Node VM / instrumented DOM with simulated clock. No browser paint or measured FPS.',
 allPassed:results.every(r=>r.pass),totalExecutedPassGroups:results.reduce((n,r)=>n+r.groups,0),results,
 browserQa:'Unconfirmed. Existing file:// preview restriction respected. Browser-only idle-pack suite could not start because Playwright is unavailable; no browser was launched. No workaround was attempted.'};
fs.writeFileSync(path.join(root,'docs/SETTINGS-11A-REGRESSIONS.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(evidence.totalExecutedPassGroups+' executed PASS groups; '+results.filter(r=>r.pass).length+'/'+results.length+' suites pass.');
process.exitCode = evidence.allPassed?0:1;
