'use strict';
// Runs the headless checks that guard Cardable Market Beta and the game around it, one after another, and writes a
// plain table of what passed. Nothing here opens a window: Electron suites are run once, by hand, and recorded separately.
//   node tools/run-market-regression.cjs [--out docs/market-beta/regression.json]
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = path.resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/market-beta/regression.json');

const SUITES = [
  ['data integrity', 'check:data'],
  ['assets and script list', ['node', 'tools/verify-assets.cjs']],
  ['desktop services', 'test:services'],
  ['market rules, simulation and sales (node tests)', 'test:market'],
  ['merged collections', 'test:merged-collections'],
  ['Cloudflare Worker (real local runtime)', 'test:cloudflare'],
  ['Market interface', 'check:market'],
  ['Simulation in the interface', 'check:market-sim'],
  ['economy and selling', 'check:market-economy'],
  ['online client and import', 'check:market-online'],
  ['analytics and portfolio', 'check:market-analytics'],
  ['trading', 'check:market-trading'],
  ['social: pictures, comments, reviews', 'check:market-social'],
  ['Home, coach and motion', 'check:market-home'],
  ['hover and press feedback', 'check:market-hover'],
  ['the same Cardable: menu, header, island, rarity, settle', 'check:market-polish'],
  ['the notch: menu, panel, quick bids, peek, customize', 'check:market-notch'],
  ['acceptance journeys and UI sweep', 'check:market-acceptance'],
  ['inventory glass', ['node', 'tools/check-inventory-glass.cjs']],
  ['inventory interaction', ['node', 'tools/check-inventory-interaction.cjs']],
  ['UI polish contracts', ['node', 'tools/check-ui-polish-contracts.cjs']],
  ['release validation', 'release:validate']
];

const rows = [];
for (const [name, cmd] of SUITES) {
  const started = Date.now();
  const run = Array.isArray(cmd) ? spawnSync(cmd[0], cmd.slice(1), { cwd: root, encoding: 'utf8', shell: false, timeout: 1500000 })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '-s', cmd], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: 1500000 });
  const text = (run.stdout || '') + (run.stderr || '');
  const lines = text.trim().split('\n');
  const summary = lines.filter((l) => /passed|pass \d|ℹ pass|ℹ fail|FAIL|fail \d|All \d+|Data integrity|valid|error/i.test(l)).slice(-4).join(' | ').slice(0, 300);
  rows.push({ name, command: Array.isArray(cmd) ? cmd.join(' ') : 'npm run ' + cmd, ok: run.status === 0, seconds: Math.round((Date.now() - started) / 1000), summary });
  console.log((run.status === 0 ? 'ok   ' : 'FAIL ') + name + '  (' + rows[rows.length - 1].seconds + ' s)  ' + summary.slice(0, 160));
}
fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), node: process.version, rows }, null, 2));
const failed = rows.filter((r) => !r.ok);
console.log('\n' + (rows.length - failed.length) + ' of ' + rows.length + ' passed. Record: ' + out);
process.exit(failed.length ? 1 : 0);
