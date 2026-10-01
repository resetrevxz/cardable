'use strict';
// Reproducible logic gate. Browser QA is deliberately separate.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const suites = ['check-stage1', 'check-stage2', 'check-stage3', 'check-stage3-tiers7-9',
  'check-stage3-tiers10-12', 'check-stage4', 'check-stage5', 'check-stage5-reveal',
  'check-stage6', 'check-stage7', 'check-stage8', 'check-new-features', 'check-visual-fixes', 'check-bug-pass'];
const results = [];
for (const name of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, name + '.cjs')], { encoding: 'utf8', cwd: path.join(__dirname, '..'), timeout: 180000 });
  const output = (result.stdout || '') + (result.stderr || '');
  const pass = result.status === 0 && !/^FAIL /m.test(output);
  results.push({ suite: name, pass, groups: (output.match(/^PASS /gm) || []).length,
    output: pass ? output.split(/\r?\n/).filter(line => /passed\.|SIMULATED/.test(line)).join('\n') : output });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + ' · ' + results.at(-1).groups + ' groups');
}
const evidence = { environment: 'Real classic scripts in a Node VM/instrumented DOM; simulated clock. No browser rendering or FPS claim.',
  allPassed: results.every(r => r.pass), totalExecutedPassGroups: results.reduce((n, r) => n + r.groups, 0), results,
  browserQa: 'Not executed: the preview tool explicitly blocked file:// and prohibited workarounds. check-idle-pack.cjs requires a browser and was not run in this task.' };
fs.writeFileSync(path.join(__dirname, '../docs/INVENTORY-REFRESH-REGRESSIONS.json'), JSON.stringify(evidence, null, 2) + '\n');
process.exitCode = evidence.allPassed ? 0 : 1;
