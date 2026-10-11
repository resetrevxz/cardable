'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{_electron}=require('playwright'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'cardable-secret-scene-')),output=path.join(root,'qa-output/optimization');
const original=execFileSync('git',['show','64e9dd7:src/fx/secret-os-scene.js'],{cwd:root,encoding:'utf8'}),evidence={cases:[],errors:[]};let app;
(async()=>{try{
  app=await _electron.launch({executablePath:require('electron'),args:[root,'--qa-test','--test-user-data='+profile]});const page=await app.firstWindow();page.on('pageerror',e=>evidence.errors.push(e.message));await page.waitForFunction(()=>window.Cardable?.preferences?.initialized);
  evidence.cases=await page.evaluate(original=>{
    const C=Cardable,currentFactory=C.secretOSScene.create;(0,eval)(original);const originalFactory=C.secretOSScene.create;C.secretOSScene.create=currentFactory;const results=[];
    for(const profile of ['safe','full'])for(const level of [0,1,2,3]){
      const spec=C.rarity('secret').openingIntro,a=document.createElement('canvas'),b=document.createElement('canvas'),size=spec.os.buffers[level];a.width=b.width=size[0];a.height=b.height=size[1];
      // Keep repeated verification readbacks from changing either renderer's backend.
      a.getContext('2d',{alpha:false,willReadFrequently:false});b.getContext('2d',{alpha:false,willReadFrequently:false});
      const reference=originalFactory(spec,'pass3-reference',a),current=currentFactory(spec,'pass3-reference',b),differences=[];
      for(const age of [0,1,2.5,3,4,5,6,7,8,9,10,12,15]){
        const section=age<=9?'desktop':'breakdown',at=section==='desktop'?age:age-9,options={level,profile,presentationMs:10000+age*1000,boot:()=>{}};
        reference.paint(section,at,10+age,options);current.paint(section,at,10+age,options);
        const qa=a.getContext('2d').getImageData(0,0,a.width,a.height).data,qb=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let changed=0,max=0,total=0;
        for(let i=0;i<qa.length;i++){const d=Math.abs(qa[i]-qb[i]);if(d)changed++;max=Math.max(max,d);total+=d;}
        if(changed)differences.push({age,channels:changed,max,mean:total/qa.length});
      }
      const sameBeats=JSON.stringify(reference.getBeats())===JSON.stringify(current.getBeats());reference.stop();current.stop();a.width=a.height=b.width=b.height=1;results.push({profile,level,differences,sameBeats});
    }return results;
  },original);
  for(const item of evidence.cases){assert.deepEqual(item.differences,[]);assert(item.sameBeats);}
  evidence.warming=await page.evaluate(async()=>{
    const C=Cardable;C.settings.applyPreset('high');C.settings.set('fpsLimit','display');
    const spec=C.rarity('secret').openingIntro,canvas=document.createElement('canvas'),size=spec.os.buffers[3];canvas.width=size[0];canvas.height=size[1];
    const q=canvas.getContext('2d',{alpha:false}),before=q.getTransform(),scene=C.secretOSScene.create(spec,'pass3-warm',canvas),deadline=performance.now()+5000;
    while(scene.cacheStats.warming&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));
    const ready=scene.cacheStats,after=q.getTransform();scene.stop();await new Promise(resolve=>setTimeout(resolve,50));
    const stopped=scene.cacheStats;canvas.width=canvas.height=1;return {ready,stopped,sameTransform:before.a===after.a&&before.b===after.b&&before.c===after.c&&before.d===after.d&&before.e===after.e&&before.f===after.f};
  });
  assert(evidence.warming.ready.dialogs>0);assert.equal(evidence.warming.ready.warming,false);assert(evidence.warming.ready.dialogs<=62);assert(evidence.warming.ready.bytes<20*1024*1024);assert(evidence.warming.sameTransform);assert.deepEqual(evidence.warming.stopped,{dialogs:0,bytes:0,warming:false});
  assert.deepEqual(evidence.errors,[]);
}finally{if(app)await app.close();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'pass3-secret-scene.json'),JSON.stringify(evidence,null,2));if(path.resolve(profile).startsWith(path.resolve(os.tmpdir(),'cardable-secret-scene-')))fs.rmSync(profile,{recursive:true,force:true});}
console.log(JSON.stringify(evidence,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
