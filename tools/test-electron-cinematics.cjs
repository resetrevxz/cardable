'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..'), output = process.env.CARDABLE_QA_OUTPUT || path.join(root, 'qa-output/cinematics');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-cinematics-'));
const evidence = { cases: [], errors: [], network: [] };
let application;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    application = await _electron.launch({ executablePath: path.join(root,'dist/win-unpacked/Cardable.exe'), args:['--qa-test',`--test-user-data=${profile}`] });
    const page = await application.firstWindow();
    page.on('pageerror', error => evidence.errors.push(error.stack));
    page.on('console', message => { if(message.type()==='error')evidence.errors.push(message.text()); });
    page.on('request', request => { if(/^https?:/.test(request.url()))evidence.network.push(request.url()); });
    await page.waitForFunction(()=>window.Cardable && Cardable.state.current && Cardable.preferences.initialized);
    await page.evaluate(()=>{const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset('high');C.settings.set('motion','off');C.settings.set('cutscenes','full');C.settings.set('strobing','safe');C.settings.set('fpsLimit','60');C.settings.set('idleFade','never');});
    for (const id of ['legendary','mythical','exotic','ascendant','secret']) {
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
      await page.screenshot({path:path.join(output,id+'-middle.png')});
      await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden,{},{timeout:70000});
      assert(await page.evaluate(id=>Cardable.opening.view.card.rarity===id && Cardable.opening.view.side==='front',id));
      await page.screenshot({path:path.join(output,id+'-card.png')});
      await page.locator('.opening-keep').click();await page.waitForFunction(()=>Cardable.opening.phase==='idle');
      assert.equal(await page.evaluate(()=>Cardable.state.current.inventory.length),before+1);
      evidence.cases.push({id,...middle,passed:true});console.log('Full High / Safe cinematic, handoff and Keep passed: '+id);
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);
  } finally {
    if(application)await application.close().catch(()=>{});
    fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));
    if(path.resolve(profile).startsWith(path.join(os.tmpdir(),'cardable-cinematics-')))fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
