const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const packaged = process.argv.includes('--packaged');
console.log(`--- Launching ${packaged ? 'Packaged' : 'Development'} Electron Smoke Test ---`);

const electronBinary = packaged
  ? path.join(__dirname, '../dist/win-unpacked/Cardable.exe')
  : process.platform === 'win32'
    ? path.join(__dirname, '../node_modules/electron/dist/electron.exe')
    : path.join(__dirname, '../node_modules/.bin/electron');

const appPath = path.join(__dirname, '..');

if (!fs.existsSync(electronBinary)) {
  console.error(`Electron binary does not exist: ${electronBinary}`);
  process.exit(1);
}

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-electron-test-'));
fs.writeFileSync(path.join(userData, 'window-state.json'), JSON.stringify({
  width: 'invalid', height: -50, x: 999999, y: 999999, isMaximized: 'yes', isFullScreen: false
}), 'utf8');

function run(extraArgs) {
  return new Promise((resolve, reject) => {
    const baseArgs = packaged ? [] : [appPath];
    const args = baseArgs.concat(['--smoke-test', `--test-user-data=${userData}`], packaged ? [] : ['--dev'], extraArgs);
    const proc = spawn(electronBinary, args, { stdio: ['inherit', 'pipe', 'pipe'] });

    let output = '';
    let errOutput = '';

    proc.stdout.on('data', (d) => {
      const str = d.toString();
      output += str;
      process.stdout.write(str);
    });

    proc.stderr.on('data', (d) => {
      const str = d.toString();
      errOutput += str;
      process.stderr.write(str);
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      console.log(`\n--- Electron Process Exited with Code: ${code} ---`);
      if (code === 0 && output.includes('SMOKE_TEST_SUCCESS')) resolve({ output, errOutput });
      else reject(new Error(`Electron smoke test failed with code ${code}`));
    });
  });
}

(async () => {
  try {
    await run(['--smoke-seed', '--smoke-game']);
    const restoredWindowState = JSON.parse(fs.readFileSync(path.join(userData, 'window-state.json'), 'utf8'));
    if (!Number.isFinite(restoredWindowState.width) || !Number.isFinite(restoredWindowState.height) || restoredWindowState.width < 960 || restoredWindowState.height < 640) {
      throw new Error('Corrupted window state was not recovered safely');
    }
    await run(['--clear-renderer-storage', '--smoke-verify']);
    await run(['--smoke-dev-workspace']);
    console.log('✓ SUCCESS: Electron launch, interactions, isolation, graceful close, and native-backup recovery passed!');
  } catch (error) {
    console.error('✗ FAILURE:', error.message);
    process.exitCode = 1;
  } finally {
    const resolved = path.resolve(userData);
    const expectedPrefix = path.resolve(os.tmpdir(), 'cardable-electron-test-');
    if (resolved.startsWith(expectedPrefix)) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch (_) {}
    }
  }
})();
