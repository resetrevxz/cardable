'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const baseline=path.resolve(__dirname,'../../../outputs/v3-optimization/baseline');
const sources=['cutscene-gl.js','cutscene-screen-engine.js','crystal-scene-engine.js','rarity-intro.js'].map(file=>fs.readFileSync(path.join(baseline,'src/fx',file),'utf8'));
(async()=>{
  const browser=await chromium.launch({headless:true}),rows=[];
  try{
    for(const scene of ['secret','mythical','ascendant'])for(const label of ['before','after','after','before']){
      const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],network=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
      await page.evaluate(()=>{const C=Cardable;C.tutorial.skipButton.click();C.settings.applyPreset('high');C.settings.set('fpsLimit','display');C.settings.set('idleFade','never');C.packView.setVisible(false);});
      if(label==='before')for(const source of sources)await page.addScriptTag({content:source});
      const result=await page.evaluate(async(scene)=>{
        const C=Cardable,host=document.createElement('div');document.body.appendChild(host);
        const intro=C.rarityIntro.create(host),offset={secret:14000,mythical:12000,ascendant:16000}[scene];intro.start(C.rarity(scene).openingIntro,scene.toUpperCase(),'PAIRED-CINEMATIC');
        const gaps=[];let begin=performance.now(),previous=null;
        await new Promise(resolve=>{function frame(now){intro.update(offset+now-begin,now);if(now-begin>1000&&previous!==null)gaps.push(now-previous);previous=now;if(now-begin<6000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
        const sorted=gaps.slice().sort((a,b)=>a-b),stats=intro.rendererStats;intro.stop();host.remove();
        return {fps:1000*gaps.length/gaps.reduce((a,b)=>a+b,0),p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],frames:gaps.length,stats};
      },scene);
      rows.push({scene,label,...result,errors,network});console.log(JSON.stringify(rows[rows.length-1]));
      fs.writeFileSync(path.resolve(__dirname,'../../../outputs/graphics-profiles/cinematic-paired.json'),JSON.stringify(rows,null,2));await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
