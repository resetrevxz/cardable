'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),binary=process.env.CARDABLE_QA_BINARY,output=path.join(root,'qa-output',binary?'mini-1.4.1-packaged':'mini-1.4.1');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cardable-mini-'));
let application,main,mini;
const evidence={checks:[],errors:[],network:[],profile,screens:[]};
function check(name){evidence.checks.push(name);console.log('PASS',name);}
async function shot(page,name){const data=await application.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);return (await w.webContents.capturePage()).toPNG().toString('base64');},page.url());fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(data,'base64'));evidence.screens.push(name+'.png');}
async function launch(){
  application=await _electron.launch({executablePath:binary||require('electron'),args:binary?['--qa-test',`--test-user-data=${profile}`]:[root,'--dev',`--diagnostic-user-data=${profile}`],timeout:30000});
  function observe(page){page.on('pageerror',error=>evidence.errors.push(error.stack));page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});}
  application.on('window',observe);main=await application.firstWindow();observe(main);
  await main.waitForFunction(()=>window.Cardable?.opening?.initialized&&Cardable.preferences.initialized);
  await main.evaluate(()=>Cardable.tutorial.skipButton.click());
  await main.waitForTimeout(300);
  // Fresh profiles must finish the deferred desktop launch surface first.
  const welcome=main.getByRole('button',{name:'Start collecting',exact:true});
  if(!await main.evaluate(()=>localStorage.getItem('cardable.desktop.welcome')||localStorage.getItem('cardable.qol.welcomeSeen')))await welcome.waitFor({state:'visible',timeout:15000});
  if(await welcome.count())await welcome.click();
  for(let i=0;i<5;i++){const panel=main.locator('.qol-friendly:visible');if(!await panel.count())break;await panel.getByRole('button',{name:/^(Continue|Keep this collection|Done|Dismiss|Start collecting)$/}).click();await main.waitForTimeout(250);}
}
async function enter(){await main.waitForTimeout(300);const added=application.waitForEvent('window');await main.keyboard.press('Control+m');mini=await added;await mini.waitForFunction(()=>document.getElementById('stock').textContent!=='—');await mini.waitForTimeout(150);}
async function state(){return main.evaluate(()=>({ready:Cardable.state.current.packs.ready,currency:Cardable.state.current.currency,serial:Cardable.state.current.serialCounter,count:Cardable.state.current.inventory.length,pending:structuredClone(Cardable.state.current.pendingReveal)}));}
async function restore(){await mini.locator('#expand').click();await main.waitForFunction(()=>!document.hidden);await main.waitForTimeout(200);}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 try{
  await launch();
  await main.evaluate(()=>{const C=Cardable;C.preferences.close();if(C.friendly?.active)C.friendly.close?.();const s=structuredClone(C.state.current);s.tutorial.done=true;s.tutorial.step='done';s.packs.ready=4;s.packs.timerStartedAt=null;C.state.commit(s);});
  await enter();
  const native=await application.evaluate(({BrowserWindow})=>{const main=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));const mini=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('mini.html'));return {pinned:mini.isAlwaysOnTop(),mainVisible:main.isVisible(),bounds:mini.getBounds(),prefs:mini.webContents.getLastWebPreferences()};});
  assert(native.pinned&&!native.mainVisible);assert(native.prefs.sandbox&&native.prefs.contextIsolation&&!native.prefs.nodeIntegration);
  assert.equal(await mini.evaluate(()=>typeof require),'undefined');check('Mini pinned, hidden full renderer, sandboxed narrow bridge');await shot(mini,'01-ready');
  const before=await state();await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Keep card');
  const opened=await state();assert.equal(opened.ready,before.ready-1);assert(opened.currency>=before.currency+200);assert.equal(opened.count,before.count);assert.equal(opened.serial,before.serial+1);assert(opened.pending.cards.length===1);check('Keyboard open reserves once and grants pack and achievement rewards without collecting');await shot(mini,'02-reserved');
  const oldToken=await mini.evaluate(()=>cardableMini.getState().then(s=>s.token));
  await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Open pack');
  const kept=await state();assert.equal(kept.count,before.count+1);assert.equal(kept.pending,null);assert(kept.currency>=opened.currency);
  const stale=await mini.evaluate(token=>cardableMini.open({token}),oldToken);assert.equal(stale.ok,false);assert.deepEqual(await state(),kept);check('Keep exact once; stale request cannot open another pack');
  await mini.locator('#settings').click();await mini.locator('#side').selectOption('left');await mini.waitForFunction(()=>!document.getElementById('side').disabled);await mini.locator('#frame-limit').selectOption('60');await mini.waitForFunction(()=>document.getElementById('fps').textContent.startsWith('60'));
  const configured=await main.evaluate(()=>({side:Cardable.settings.get('miniSide'),fps:Cardable.settings.get('miniFps')}));assert.deepEqual(configured,{side:'left',fps:60});
  const placement=await application.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('mini.html'));return {b:w.getBounds(),a:screen.getDisplayMatching(w.getBounds()).workArea};});assert.equal(placement.b.x,placement.a.x+12);check('Gear persists 60 FPS and left dock in game settings');await shot(mini,'03-settings');await mini.locator('#close-settings').click();
  evidence.frameCaps=[];
  for(const fps of [30,60]){await main.evaluate(fps=>Cardable.settings.set('miniFps',fps),fps);await mini.waitForFunction(fps=>document.getElementById('fps').textContent.startsWith(String(fps)),fps);const snapshot=await mini.evaluate(()=>cardableMini.getState()),startPaints=await mini.evaluate(()=>CardableMiniDebug.paints),start=performance.now();await main.evaluate(async snapshot=>{for(let i=0;i<60;i++){await cardableDesktop.window.setPack(Object.assign({},snapshot,{countdown:'burst '+i,remainingMs:7200000-i*1000}));await new Promise(resolve=>setTimeout(resolve,3));}},snapshot);await mini.waitForTimeout(50);const duration=performance.now()-start,paintDelta=await mini.evaluate(start=>CardableMiniDebug.paints-start,startPaints);assert(paintDelta<=Math.ceil(duration*fps/1000)+2);assert(paintDelta<60);evidence.frameCaps.push({fps,durationMs:Math.round(duration),paints:paintDelta});}check('State bursts coalesce below both saved 30 and 60 FPS ceilings');
  await main.evaluate(()=>{Cardable.settings.set('keyBindings',Object.assign({},Cardable.settings.get('keyBindings'),{'opening.hold':['KeyO'],'opening.keep':['KeyK'],'menu.mini':['Mod+KeyB']}));});await mini.waitForFunction(()=>document.getElementById('action-key').textContent==='O');
  await mini.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});const preRemap=await state();await mini.keyboard.press('Space');await mini.waitForTimeout(80);assert.deepEqual(await state(),preRemap);await mini.keyboard.press('o');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Keep card');check('Removed Space binding stays inactive; remapped O opens in Mini');
  const pending=await state();await restore();await main.waitForFunction(()=>Cardable.opening.phase==='revealed');assert.equal((await state()).pending.cards[0].instanceId,pending.pending.cards[0].instanceId);check('Expand restores the same reserved card in full reveal');
  await main.evaluate(()=>Cardable.input.keep());await main.waitForFunction(()=>Cardable.opening.phase==='idle');
  await main.evaluate(()=>{Cardable.settings.set('keyBindings',{});Cardable.packs.forceNext('picker');});await enter();await mini.keyboard.press('Space');await mini.waitForFunction(()=>!document.getElementById('choices').hidden);
  const offers=await state();assert.equal(offers.pending.cards.length,0);const offerSerial=offers.serial;
  await shot(mini,'04-picker');await mini.waitForTimeout(300);await mini.keyboard.press('2');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Keep card');const chosen=await state();assert.equal(chosen.pending.choice,1);assert.equal(chosen.serial,offerSerial+1);assert.equal(chosen.pending.cards.length,1);assert.equal(chosen.pending.cards[0].cardId,offers.pending.options[1].cardId);check('Picker shows unminted offers; exactly one selected serial is minted');
  await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Open pack');
  await main.evaluate(()=>{window.miniOriginalCommit=Cardable.state.commit;Cardable.state.commit=()=>false;});const beforeFailure=await state();await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('message').textContent.length>0);assert.deepEqual(await state(),beforeFailure);check('Reservation failure preserves stock, currency and serial counter');
  await main.evaluate(()=>{Cardable.state.commit=window.miniOriginalCommit;delete window.miniOriginalCommit;});
  await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Keep card');await main.evaluate(()=>{window.miniOriginalCommit=Cardable.state.commit;Cardable.state.commit=()=>false;});const failKeep=await state();await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('message').textContent.length>0);assert.deepEqual(await state(),failKeep);check('Keep failure preserves reservation and inventory');await main.evaluate(()=>{Cardable.state.commit=window.miniOriginalCommit;delete window.miniOriginalCommit;});
  await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Open pack');
  await main.evaluate(()=>Cardable.settings.set('rarityColor','mono'));await mini.waitForFunction(()=>document.documentElement.dataset.rarityColor==='mono');await shot(mini,'05-monochrome');
  const paints=await mini.evaluate(()=>CardableMiniDebug.paints);await mini.waitForTimeout(2300);const paintDelta=await mini.evaluate(start=>CardableMiniDebug.paints-start,paints);assert(paintDelta<=4);assert.equal(await mini.locator('canvas').count(),0);check('Idle paints follow timer only; no canvas or RAF loop in companion');evidence.idlePaintsOver2300ms=paintDelta;
  await main.evaluate(()=>{const s=structuredClone(Cardable.state.current);s.packs.ready=0;s.packs.timerStartedAt=Cardable.clock.now();Cardable.state.commit(s);});await mini.waitForFunction(()=>document.getElementById('stock').textContent==='0');assert(await mini.locator('#open').isDisabled());await shot(mini,'06-empty');
  await main.evaluate(()=>{const s=structuredClone(Cardable.state.current);s.packs.timerStartedAt=Cardable.clock.now()-Cardable.config.packs.regenMs+600;Cardable.state.commit(s);});await mini.waitForFunction(()=>document.getElementById('stock').textContent==='1');check('Live refill while full game hidden; zero stock disables opening');
  await mini.waitForTimeout(300);await mini.keyboard.press('Space');await mini.waitForFunction(()=>document.getElementById('action-label').textContent==='Keep card');const savedForRestart=await state();await application.close();application=null;await launch();await main.waitForFunction(()=>Cardable.opening.phase==='revealed');assert.deepEqual((await state()).pending,savedForRestart.pending);assert.equal((await state()).currency,savedForRestart.currency);assert.equal(await main.evaluate(()=>Cardable.settings.get('miniFps')),60);check('Relaunch recovers identical reserved card, serial, currency and mini preferences');await main.evaluate(()=>Cardable.input.keep());await main.waitForFunction(()=>Cardable.opening.phase==='idle');await enter();
  await restore();
  assert.equal(await main.evaluate(()=>cardableDesktop.window.setSize({width:NaN,height:720})),false);
  await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0],original=w.setAspectRatio.bind(w);w.setAspectRatio=function(value){w.miniTestRatio=value;return original(value);};});
  await main.evaluate(()=>{Cardable.settings.set('windowAspect','21:9');return cardableDesktop.window.setSize({width:1680,height:720});});await main.waitForTimeout(350);await shot(main,'07-widescreen');
  const dims=await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return {bounds:w.getBounds(),ratio:w.miniTestRatio};});assert.equal(dims.ratio,21/9);check('Widescreen window dimensions and native aspect constraint; malformed size rejected');evidence.window=dims;
  await main.evaluate(()=>{Cardable.settings.set('windowAspect','free');return cardableDesktop.window.setSize({width:1280,height:720});});await main.waitForTimeout(350);await shot(main,'08-compact');
  await main.keyboard.press('s');await main.waitForFunction(()=>Cardable.preferences.open);await main.evaluate(()=>Cardable.preferences.shell.go('Desktop'));await main.waitForTimeout(250);await shot(main,'09-full-settings');assert(await main.getByRole('button',{name:'Apply custom size',exact:true}).isVisible());await main.getByLabel('Custom window width').fill('1400');await main.getByLabel('Custom window height').fill('800');await main.getByRole('button',{name:'Apply custom size',exact:true}).click();await main.waitForFunction(()=>document.body.textContent.includes('Window set to 1400 × 800'));check('Custom width and height applied through the visible Desktop settings');await shot(main,'10-custom-window');
  await main.evaluate(()=>Cardable.preferences.close());
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);check('No renderer exceptions or renderer network requests');
 }catch(error){evidence.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));if(application)await application.close();console.log('Evidence:',path.join(output,'evidence.json'));}
})();
