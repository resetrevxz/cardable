'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const result=await page.evaluate(async()=>{
    const C=Cardable,samples={},originals=[];
    C.tutorial.skipButton.click();C.settings.applyPreset('high');C.settings.set('idleFade','never');C.packView.setVisible(false);
    function wrap(object,key,label){const original=object[key];originals.push(()=>object[key]=original);object[key]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{(samples[label]||(samples[label]=[])).push(performance.now()-start);}};}
    function factory(object,key,method,label){const original=object[key];originals.push(()=>object[key]=original);object[key]=function(...args){const value=original.apply(this,args);wrap(value,method,label);return value;};}
    factory(C.cutsceneScreenEngine,'create','render','GPU render');
    factory(C.secretOSScene,'create','paint','Desktop drawing');
    factory(C.cutscenes,'createLimiter','apply','Safety sampler');
    const originalDraw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){const start=performance.now();try{return originalDraw.apply(this,args);}finally{
      const label=this.canvas.className==='rarity-intro'?'Output copy':this.canvas.width===64&&this.canvas.height===36?'Safety downsample':'Other canvas copies';
      (samples[label]||(samples[label]=[])).push(performance.now()-start);
    }};
    const host=document.createElement('div');document.body.appendChild(host);
    const intro=C.rarityIntro.create(host),spec=C.rarity('secret').openingIntro;
    intro.start(spec,'Secret','PIPELINE-PROFILE');
    let start=performance.now(),previous=start,frames=0;
    await new Promise(resolve=>{function frame(now){intro.update(14000+now-start,now);frames++;previous=now;if(now-start<4000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    const elapsed=performance.now()-start;
    const rows={};Object.keys(samples).forEach(key=>{const values=samples[key].sort((a,b)=>a-b);rows[key]={count:values.length,totalMs:values.reduce((a,b)=>a+b,0),p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};});
    intro.stop();host.remove();CanvasRenderingContext2D.prototype.drawImage=originalDraw;originals.reverse().forEach(restore=>restore());
    return {frames,elapsed,fps:frames*1000/elapsed,rows};
  });
  result.errors=errors;
  const out=path.resolve(__dirname,'../../../outputs/graphics-profiles');fs.mkdirSync(out,{recursive:true});
  const label=process.env.CARDABLE_PIPELINE_LABEL||'pipeline';fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
