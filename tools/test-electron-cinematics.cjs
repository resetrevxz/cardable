'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..'), output = process.env.CARDABLE_QA_OUTPUT || path.join(root, 'qa-output/cinematics');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-cinematics-'));
const sourceMode=process.argv.includes('--source');
const requestedCases=(process.env.CARDABLE_CINEMATIC_CASES||'legendary,mythical,exotic,ascendant,secret').split(',');
const evidence = { sourceMode, requestedCases, cases: [], errors: [], network: [] };
let application;
async function screenshot(page,name){const win=await application.browserWindow(page),png=await win.evaluate(async w=>(await w.webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(output,name),Buffer.from(png,'base64'));}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    application = await _electron.launch({ executablePath: sourceMode?require('electron'):process.env.CARDABLE_QA_BINARY || path.join(root,'dist/win-unpacked/Cardable.exe'), args:[...(sourceMode?[root]:[]),'--qa-test',`--test-user-data=${profile}`] });
    const page = await application.firstWindow();
    page.on('pageerror', error => evidence.errors.push(error.stack));
    page.on('console', message => { if(message.type()==='error')evidence.errors.push(message.text()); });
    page.on('request', request => { if(/^https?:/.test(request.url()))evidence.network.push(request.url()); });
    await page.waitForFunction(()=>window.Cardable?.state?.current && Cardable.preferences?.initialized);
    await page.evaluate(()=>Cardable.tutorial.skipButton.click());
    await page.waitForTimeout(250);
    if(await page.evaluate(()=>!!Cardable.setup)){
      const welcome=page.getByRole('button',{name:'Start collecting',exact:true});
      await welcome.waitFor({state:'visible',timeout:10000});await welcome.click();
    }
    for(let step=0;step<5;step++){
      const panel=page.locator('.qol-friendly:visible');if(!await panel.count())break;
      await panel.getByRole('button',{name:/^(Continue|Keep this collection|Done|Dismiss|Start collecting)$/}).click();await page.waitForTimeout(250);
    }
    await page.evaluate(()=>{const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset('high');C.settings.set('motion','off');C.settings.set('cutscenes','full');C.settings.set('strobing','safe');C.settings.set('fpsLimit','60');C.settings.set('idleFade','never');});
    for (const id of requestedCases) {
      assert(['legendary','mythical','exotic','ascendant','secret'].includes(id),'Unknown cinematic case: '+id);
      await page.mouse.move(32,32);
      const before = await page.evaluate(id=>{
        const C=Cardable;C.state.current.packs.ready=4;C.state.current.packs.introSeen.standard=true;C.state.save();
        const off=C.events.on('opening:resolve',request=>{request.options={forcedTier:id,forcedVariant:null};});
        const count=C.state.current.inventory.length;try{if(!C.opening.openNow('standard'))throw new Error('Cannot open');}finally{off();}return count;
      },id);
      await page.waitForFunction(()=>Cardable.opening.phase==='cutting');
      await page.evaluate(()=>Cardable.opening.finishCut());
      await page.waitForFunction(()=>Cardable.opening.phase==='rarityIntro',{},{timeout:20000});
      await page.waitForFunction(()=>Cardable.opening.intro.runtime.timeMs>=Cardable.opening.intro.runtime.totalMs*.45,{},{timeout:70000});
      const middle = await page.evaluate(()=>{
        const intro=Cardable.opening.intro,c=intro.canvas,q=c.getContext('2d'),data=q.getImageData(0,0,c.width,c.height).data;
        let min=255,max=0;for(let i=0;i<data.length;i+=40){min=Math.min(min,data[i],data[i+1],data[i+2]);max=Math.max(max,data[i],data[i+1],data[i+2]);}
        return {mode:intro.runtime.mode,profile:intro.runtime.profile,level:intro.runtime.level,timeMs:intro.runtime.timeMs,totalMs:intro.runtime.totalMs,range:max-min,renderer:intro.rendererStats};
      });
      assert.equal(middle.mode,'full');assert(middle.range>10,'Cinematic canvas has no visible content: '+id);
      await screenshot(page,id+'-middle.png');
      await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden&&!Cardable.opening.keepButton.disabled,{},{timeout:70000});
      assert(await page.evaluate(id=>Cardable.opening.view.card.rarity===id && Cardable.opening.view.side==='front',id));
      const decisionSurface = await page.evaluate(()=>{
        const C=Cardable,stage=C.opening.keepButton.closest('.opening-stage');
        if(!stage.classList.contains('has-rarity-backdrop'))return null;
        const probe=document.createElement('span');stage.appendChild(probe);probe.style.color='var(--accent)';const accent=getComputedStyle(probe).color;probe.style.color='var(--ink-1)';const backing=getComputedStyle(probe).color;probe.remove();
        const keep=getComputedStyle(C.opening.keepButton),secondary=getComputedStyle(C.opening.deleteButton);
        return {accent,backing,keep:keep.backgroundColor,secondary:secondary.backgroundColor,keepBlur:keep.backdropFilter,secondaryBlur:secondary.backdropFilter};
      });
      if(decisionSurface){assert.equal(decisionSurface.keep,decisionSurface.accent,'Keep retains the current accent primary action');assert.equal(decisionSurface.secondary,decisionSurface.backing,'Delete has an opaque dark backing under its gradient');assert.equal(decisionSurface.keepBlur,'none');assert.equal(decisionSurface.secondaryBlur,'none');}
      await screenshot(page,id+'-card.png');
      if(decisionSurface){
        await page.locator('.opening-keep').hover();
        await page.waitForFunction(color=>getComputedStyle(Cardable.opening.keepButton).backgroundColor===color,decisionSurface.accent);
      }
      await page.locator('.opening-keep').click();await page.waitForFunction(()=>Cardable.opening.phase==='idle');
      assert.equal(await page.evaluate(()=>Cardable.state.current.inventory.length),before+1);
      evidence.cases.push({id,...middle,decisionSurface,passed:true});console.log('Full High / Safe cinematic, handoff and Keep passed: '+id);
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);
  } finally {
    if(application)await application.close().catch(()=>{});
    fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));
    if(path.resolve(profile).startsWith(path.join(os.tmpdir(),'cardable-cinematics-')))fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
