'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { execFile, spawn } = require('node:child_process'), { promisify } = require('node:util'), assert = require('node:assert/strict');
const { _electron } = require('playwright');
const exec = promisify(execFile), root = path.resolve(__dirname,'..');
const target = process.env.CARDABLE_REUSE_FIXTURE ? path.resolve(process.env.CARDABLE_REUSE_FIXTURE) : fs.mkdtempSync(path.join(os.tmpdir(),'cardable-update-'));
if (!target.startsWith(path.join(os.tmpdir(),'cardable-update-'))) throw new Error('Invalid fixture path');
const profile = path.join(target,'profile'), install = path.join(target,'install'), distB = path.join(target,'B');
const output = process.env.CARDABLE_QA_OUTPUT || path.join(root,'qa-output');
fs.mkdirSync(output,{recursive:true}); fs.mkdirSync(profile,{recursive:true});
const evidence = { requests: [], states: [], results: [] };
let application, installed = fs.existsSync(path.join(install,'CardableFixture.exe'));
const server = http.createServer((req,res) => {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  if (!name || path.basename(name) !== name) { res.writeHead(404); res.end(); return; }
  const file = path.join(distB,name); evidence.requests.push(name);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Length': fs.statSync(file).size, 'Content-Type': name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
async function wait(predicate,label,timeout=90000) {
  const deadline=Date.now()+timeout;
  while(!predicate()) { if(Date.now()>deadline)throw new Error('Timeout: '+label); await new Promise(resolve=>setTimeout(resolve,200)); }
}
async function build(version,letter,feed) {
  console.log('Building NSIS update fixture '+version);
  const result = await exec(process.execPath,[require.resolve('electron-builder/out/cli/cli.js'),'--config','tools/update-fixture.config.cjs','--win','nsis','--publish','never'],{
    cwd:root,env:{...process.env,CARDABLE_FIXTURE_OUTPUT:path.join(target,letter),CARDABLE_FIXTURE_VERSION:version,CARDABLE_FIXTURE_FEED:feed},maxBuffer:8*1024*1024
  }); console.log(result.stdout);
}
async function installVersion(letter,version) {
  console.log('Installing fixture '+version+' into '+install);
  await exec(path.join(target,letter,`Cardable-Fixture-${version}.exe`),['/S','/currentuser',`/D=${install}`],{timeout:90000}); installed=true;
  await wait(()=>fs.existsSync(path.join(install,'CardableFixture.exe')),'installer executable');
}
async function uninstall() {
  if(!installed)return;
  const name=fs.readdirSync(install).find(name=>/^Uninstall.*\.exe$/.test(name));
  if(!name)throw new Error('No fixture uninstaller');
  await exec(path.join(install,name),['/S',`_?=${install}`],{timeout:90000});
  await wait(()=>!fs.existsSync(path.join(install,'CardableFixture.exe')),'uninstall'); installed=false;
}
(async()=>{
  try {
    const port = process.env.CARDABLE_REUSE_FIXTURE ? Number(fs.readFileSync(path.join(target,'A/win-unpacked/resources/app-update.yml'),'utf8').match(/127\.0\.0\.1:(\d+)/)[1]) : 0;
    await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
    const feed=`http://127.0.0.1:${server.address().port}/`;
    if(installed)await uninstall();
    // Reuse the isolated directory/feed, but always rebuild changed source.
    await build('4.0.0','A',feed); await build('4.0.1','B',feed); await installVersion('A','4.0.0');
    const resultFile=path.join(profile,'update-test-result.json');
    if(fs.existsSync(resultFile))fs.unlinkSync(resultFile);
    const env={...process.env,CARDABLE_FIXTURE_PROFILE:profile,CARDABLE_FIXTURE_REPORT:'1'};
    application=await _electron.launch({executablePath:path.join(install,'CardableFixture.exe'),args:['--qa-test'],env});
    const page=await application.firstWindow(); await page.waitForFunction(()=>window.Cardable && Cardable.state && Cardable.state.current && Cardable.preferences.initialized);
    const expected=await page.evaluate(async ()=>{
      const C=Cardable; C.tutorial.skipButton.click(); const save=C.state.current,card=C.data.cards.find(card=>!card.retired&&card.active!==false);
      save.currency=246810; save.serialCounter=1; save.inventory=[{instanceId:'update-survivor',cardId:card.id,serial:C.serial.format(save.playerCode,1),pulledAt:Date.now(),seen:true,variantId:null,packId:'standard',cardSkinId:null}];
      save.studio=C.studioScenes.normalize({slots:[{name:'Update survivor scene',scene:C.studioScenes.defaults(save.inventory[0]),thumbnail:''}],last:{}});
      C.settings.set('fpsLimit','45'); C.settings.set('quality','low'); C.state.save();
      await C.studio.openAlbum(); C.studioAlbumUI.close();
      const canvas=document.createElement('canvas'); canvas.width=96; canvas.height=64;
      const context=canvas.getContext('2d'); context.fillStyle='#777777'; context.fillRect(0,0,96,64);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      await C.studioAlbum.remove('update-survivor-photo');
      await C.studioAlbum.save({id:'update-survivor-photo',name:'Update survivor photo',createdAt:Date.now(),w:96,h:64,blob,thumb:blob});
      return {currency:save.currency,inventory:save.inventory,studio:save.studio,settings:save.settings,photo:{name:'Update survivor photo',bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}};
    });
    const checked=await page.evaluate(()=>Cardable.desktop.checkUpdates(true)); evidence.states.push(checked);
    assert.equal(checked.state,'update-available'); assert.equal(checked.updateInfo.version,'4.0.1');
    const downloaded=await page.evaluate(()=>Cardable.desktop.downloadUpdate()); evidence.states.push(downloaded);
    assert.equal(downloaded.state,'install-ready');
    await page.waitForTimeout(300); assert.equal(await page.evaluate(()=>Cardable.config.version),'4.0.0');
    const child=application.process();
    // NSIS can terminate the debug transport before Playwright emits close.
    // Observe the real process and avoid an unhandled timeout promise.
    const closed=new Promise(resolve=>child.once('exit',resolve));
    await page.evaluate(()=>{Cardable.desktop.installUpdate();return true;});
    await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Updated process did not exit')),90000).unref())]); application=null;
    await wait(()=>fs.existsSync(resultFile),'version B restart/report');
    const report=JSON.parse(fs.readFileSync(resultFile,'utf8'));
    assert.equal(report.info.version,'4.0.1'); assert.equal(report.rendererVersion,'4.0.1');
    assert.deepEqual({currency:report.save.currency,inventory:report.save.inventory,studio:report.save.studio,settings:report.save.settings,photo:report.photo},expected);
    evidence.results.push('Real local NSIS 4.0.0 -> 4.0.1 detection, download, explicit install/restart and exact save/settings/Studio/IndexedDB photo preservation passed.');
    await wait(()=>fs.readFileSync(path.join(profile,'logs/cardable.log'),'utf8').includes('App preparing to quit...'),'B clean close');
    await new Promise(resolve=>setTimeout(resolve,1500));
    await uninstall(); assert(fs.existsSync(path.join(profile,'saves/cardable-desktop-save.json')));
    fs.unlinkSync(resultFile); await installVersion('B','4.0.1');
    const relaunched=spawn(path.join(install,'CardableFixture.exe'),[],{env,stdio:'ignore'});
    const childExit=new Promise(resolve=>relaunched.on('exit',resolve));
    await wait(()=>fs.existsSync(resultFile),'reinstall persistence');
    const reinstalled=JSON.parse(fs.readFileSync(resultFile,'utf8'));
    assert.deepEqual(reinstalled.save.inventory,expected.inventory); assert.deepEqual(reinstalled.save.studio,expected.studio);
    assert.deepEqual(reinstalled.photo,expected.photo);
    await childExit;
    evidence.results.push('Fixture uninstall/reinstall retained original cards, user-created Studio scene and identical IndexedDB photo PNG bytes.');
    console.log(JSON.stringify(evidence,null,2));
  } finally {
    if(application)await application.close().catch(()=>{});
    if(installed)await uninstall().catch(error=>{evidence.cleanupError=error.message;process.exitCode=1;});
    server.close();
    fs.writeFileSync(path.join(output,'nsis-update.json'),JSON.stringify(evidence,null,2));
    // Retain fixture installers/profile/logs for inspection; cleanup path is reported.
    console.log('Isolated update fixture artifacts: '+target);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
