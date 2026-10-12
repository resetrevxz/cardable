const { execFileSync } = require('node:child_process');

let cached;
function reducedMotion() {
  if (cached !== undefined) return cached;
  cached = false;
  if (process.platform !== 'win32') return cached;
  try {
    const result = execFileSync('reg.exe', ['query', 'HKCU\\Software\\Cardable\\Installer', '/v', 'ReducedMotion'], {
      encoding: 'utf8', windowsHide: true, timeout: 1500, stdio: ['ignore', 'pipe', 'ignore']
    });
    const value = result.match(/^\s*ReducedMotion\s+REG_DWORD\s+0x([0-9a-f]+)\s*$/im);
    cached = !!value && parseInt(value[1], 16) === 1;
  } catch (_) { /* No installer preference means the default is off. */ }
  return cached;
}

module.exports = { reducedMotion };
