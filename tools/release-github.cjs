'use strict';
// Authorized completion command: a committed update -> versioned CI release.
const path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), pkg = require('../package.json'), target = require('../desktop-release.json');
function run(command, args, capture = true) {
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.stderr || result.status}`);
  return (result.stdout || '').trim();
}
if (!target.owner || !target.repository) throw new Error('Configure desktop-release.json first.');
const repo = `${target.owner}/${target.repository}`, tag = `v${pkg.version}`;
run(process.execPath, ['tools/validate-release.cjs']);
run(process.execPath, ['scripts/check-data.js']);
const branch = run('git', ['branch', '--show-current']);
if (branch !== 'main') throw new Error('Release only an approved update committed on main.');
const origin = run('git', ['remote', 'get-url', 'origin']);
if (!origin.includes(`github.com/${repo}`) && !origin.includes(`github.com:${repo}`)) throw new Error('origin differs from the configured public repository.');
const dirty = run('git', ['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean);
const allowedLegacy = new Set(['alpha updates/4.0.0-electron/SPEC.md', 'alpha-updates/4.0.0-electron/SPEC.md']);
if (dirty.some(file => !allowedLegacy.has(file))) throw new Error('Commit the intended update first; this command never stages or commits dirty files.');
const untracked = run('git', ['ls-files', '--others', '--exclude-standard']);
if (untracked) throw new Error('Review untracked files before releasing; this command never adopts them.');
run('gh', ['auth', 'status']);
const head = run('git', ['rev-parse', 'HEAD']);
const existing = spawnSync('git', ['rev-parse', '--verify', `${tag}^{commit}`], { cwd: root, encoding: 'utf8', windowsHide: true });
if (existing.status === 0 && existing.stdout.trim() !== head) throw new Error(`${tag} already identifies an older commit. Advance the version; never retag a release.`);
if (existing.status !== 0) run('git', ['tag', '-a', tag, '-m', `Cardable ${tag}`]);
run('git', ['push', 'origin', 'main'], false);
run('git', ['push', 'origin', `refs/tags/${tag}`], false);
console.log(`Release requested: https://github.com/${repo}/actions/workflows/release.yml`);
console.log(`Verify CI success and the published installer/full-folder/updater/checksum assets at https://github.com/${repo}/releases/tag/${tag}.`);
console.log('The command never installs the app, rewrites history or overwrites existing releases.');
