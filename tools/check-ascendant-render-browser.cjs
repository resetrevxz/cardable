'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.evaluate(()=>{Cardable.tutorial.skipButton.click();Cardable.settings.applyPreset('high');Cardable.settings.set('canvasQuality','very-low');window.optimizedCrystal=Cardable.crystalSceneEngine;});
    await page.addScriptTag({content:execFileSync('git',['show','84167e4:src/fx/crystal-scene-engine.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'})});
    const result=await page.evaluate(()=>{
      const C=Cardable,original=C.crystalSceneEngine;C.crystalSceneEngine=window.optimizedCrystal;
      const rows=[];for(const mono of ['color','mono']){
        C.settings.set('rarityColor',mono);const before=original.create('ATLAS-PIXELS',Object.assign({},C.rarity('ascendant').openingIntro,{qualityLevel:3})),after=C.crystalSceneEngine.create('ATLAS-PIXELS',Object.assign({},C.rarity('ascendant').openingIntro,{qualityLevel:3}));
        for(const time of [15,16,18,20,22,24,26,29,30.4,31]){
          const images=[];
          for(const engine of [before,after]){const canvas=engine.paint(320,180,time);assertCanvas(canvas,engine.stats);const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);if(gl.getError())throw new Error('WebGL error');images.push(pixels);}
          let max=0,sum=0,changed=0;for(let i=0;i<images[0].length;i++){const d=Math.abs(images[0][i]-images[1][i]);max=Math.max(max,d);sum+=d;if(d)changed++;}rows.push({mono,time,max,mean:sum/images[0].length,changed});
        }
        before.dispose();after.dispose();
      }
      function assertCanvas(canvas,stats){if(!canvas||stats.failure)throw new Error(JSON.stringify(stats));}
      return rows;
    });
    fs.writeFileSync(path.resolve(__dirname,'../../../outputs/graphics-profiles/ascendant-render-qa.json'),JSON.stringify({result,errors},null,2));
    assert.deepEqual(errors,[]);assert(result.every(row=>row.max<=3&&row.mean<.15),JSON.stringify(result));console.log('PASS: '+result.length+' full-frame sigil/fog/curtain comparisons, including mono, title rotation and climax, within three brightness steps; no WebGL errors.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
