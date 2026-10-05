const { app, net, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('../logging/logger');
const source = require('../../desktop-release.json');
const metadata = require('../../package.json').cardableDesktop || {};
const candidate = metadata.releaseRepository || (source.owner && source.repository ? `${source.owner}/${source.repository}` : '');
const repository = /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(candidate) ? candidate : '';
const mode = (metadata.updatesMode || source.updates?.mode) === 'github-public' ? 'github-public' : 'link';
const repoUrl = repository ? `https://github.com/${repository}` : null;
let checking = null, lastCheck = 0, latest = null;
function info() {
  let changelog = '';
  try { changelog = fs.readFileSync(path.join(app.getAppPath(), 'CHANGELOG.md'), 'utf8').slice(0, 64000); } catch (_) {}
  return { mode, repository: repoUrl, configured: !!repository, safeMode: process.argv.includes('--safe-mode'), version: app.getVersion(), saves: app.getPath('userData'), changelog };
}
function logTail() {
  let fd;
  try {
    fd = fs.openSync(logger.getLogPath(), 'r'); const size = fs.fstatSync(fd).size, bytes = Buffer.alloc(Math.min(8192, size));
    fs.readSync(fd, bytes, 0, bytes.length, Math.max(0, size - bytes.length));
    // Only structural app lifecycle lines are shareable. Arbitrary renderer
    // messages, object metadata, paths, serials and save data are never included.
    return bytes.toString('utf8').split('\n').filter(line => /^\[[\dTZ:.\-]+\] \[(INFO|WARN|ERROR)\] (Cardable Desktop Launching - Version [\d.\-]+|Electron: [\d., A-Za-z:]+|Platform: [A-Za-z0-9 ().\-]+|Electron app ready event fired|Renderer shutdown flush (completed|failed or timed out)|Main window (ready to show|closed)|App preparing to quit\.\.\.)$/.test(line)).slice(-6).map(line => line.slice(0, 160)).join('\n');
  } catch (_) { return 'No shareable lifecycle log lines.'; } finally { if(fd !== undefined)fs.closeSync(fd); }
}
function diagnostics(quality) {
  const tier = ['very-low','low','medium','high'].includes(quality) ? quality : 'unknown';
  const gpu = app.getGPUFeatureStatus();
  return JSON.stringify({ version: app.getVersion(), electron: process.versions.electron, chromium: process.versions.chrome, platform: process.platform, arch: process.arch, safeMode: process.argv.includes('--safe-mode'), quality: tier,
    gpu: { webgl: gpu.webgl, webgl2: gpu.webgl2, gpu_compositing: gpu.gpu_compositing, rasterization: gpu.rasterization }, logs: logTail() }, null, 2);
}
async function reportBug(quality) {
  if (!repoUrl) return { state: 'unconfigured' };
  const query = new URLSearchParams({ template: 'bug_report.md', title: `Cardable ${app.getVersion()} — Bug report`, body: 'What happened?\n\nExpected behavior:\n\nSteps to reproduce:\n\nDiagnostics (no save contents):\n```json\n' + diagnostics(quality) + '\n```' });
  await shell.openExternal(repoUrl + '/issues/new?' + query); return { state: 'opened' };
}
function checkUpdates() {
  if (!repoUrl) return Promise.resolve({ state: 'unconfigured', mode });
  if (mode === 'link') return shell.openExternal(repoUrl + '/releases').then(() => ({ state: 'opened', mode }));
  if(checking)return checking;
  if(latest && Date.now()-lastCheck<60000)return Promise.resolve(latest);
  checking = (async () => {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await net.fetch(`https://api.github.com/repos/${repository}/releases/latest`, { credentials:'omit', redirect:'error', signal:abort.signal, headers: { Accept:'application/vnd.github+json', 'User-Agent':'Cardable-Desktop' } });
      if(response.status===404)return { state:'no-public-release', mode };
      if(!response.ok)throw new Error('Release service unavailable');
      const reader=response.body.getReader();let size=0,chunks=[];
      while(true){const result=await reader.read();if(result.done)break;size+=result.value.length;if(size>262144){await reader.cancel();throw new Error('Release response too large');}chunks.push(Buffer.from(result.value));}
      const release=JSON.parse(Buffer.concat(chunks).toString('utf8')), tag=String(release.tag_name||'').replace(/^v/,'');
      if(release.draft||release.prerelease||!/^\d+\.\d+\.\d+$/.test(tag))return {state:'no-public-release',mode};
      const next=tag.split('.').map(Number),current=app.getVersion().split(/[.-]/).slice(0,3).map(Number);let newer=false;
      for(let i=0;i<3;i++){if(next[i]!==current[i]){newer=next[i]>current[i];break;}}
      latest={state:newer?'update-available':'no-update',version:tag,url:repoUrl+'/releases',mode};lastCheck=Date.now();return latest;
    } catch (_) { return {state:'error',mode,message:'Could not check public releases. Please try again.'}; } finally {clearTimeout(timer);checking=null;}
  })();return checking;
}
module.exports = { info, diagnostics, checkUpdates, reportBug };
