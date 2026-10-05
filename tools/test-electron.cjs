const { spawn } = require('child_process');
const path = require('path');

console.log('--- Launching Electron Smoke Test ---');

const electronBinary = process.platform === 'win32'
  ? path.join(__dirname, '../node_modules/electron/dist/electron.exe')
  : path.join(__dirname, '../node_modules/.bin/electron');

const appPath = path.join(__dirname, '..');

const proc = spawn(electronBinary, [appPath, '--smoke-test', '--dev'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

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

proc.on('close', (code) => {
  console.log(`\n--- Electron Process Exited with Code: ${code} ---`);
  if (code === 0 && output.includes('SMOKE_TEST_SUCCESS')) {
    console.log('✓ SUCCESS: Electron smoke test passed with full verification!');
    process.exit(0);
  } else {
    console.error('✗ FAILURE: Electron smoke test failed.');
    process.exit(code || 1);
  }
});
