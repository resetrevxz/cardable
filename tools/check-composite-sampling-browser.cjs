'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true}),errors=[];try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.evaluate(()=>{Cardable.tutorial.skipButton.click();window.currentGL=Cardable.cutsceneGL;});
  const baseline=execFileSync('git',['show','84167e4:src/fx/cutscene-gl.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
  await page.addScriptTag({content:baseline});
  const result=await page.evaluate(()=>{
    const original=Cardable.cutsceneGL.compositeFragment;Cardable.cutsceneGL=window.currentGL;
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL2 is required for the shader comparison');
    const resources={programs:[],textures:[],frames:[],renderbuffers:[]},gpu=Cardable.cutsceneGL.create(gl,resources);
    const programs=[gpu.program(Cardable.cutsceneGL.screenVertex,original),gpu.program(Cardable.cutsceneGL.screenVertex,Cardable.cutsceneGL.separableComposite())];
    const horizontal=gpu.program(Cardable.cutsceneGL.screenVertex,Cardable.cutsceneGL.bloomHorizontalFragment);
    const scene=gpu.target(false),bloom=gpu.target(false),blur=gpu.target(false),rows=[];
    for(const [w,h] of [[96,64],[149,87],[320,181],[1600,900]]){
      canvas.width=w;canvas.height=h;gpu.sizeTarget(scene,w,h);gpu.sizeTarget(bloom,w>>1,h>>1);gpu.sizeTarget(blur,w,h>>1);
      const image=new Uint8Array(w*h*4);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,edge=x%17<3||y%19<2;image[i]=edge?255:(x*11+y*13)%128;image[i+1]=edge?224:(x*17+y*7)%128;image[i+2]=edge?192:(x*3+y*23)%128;image[i+3]=255;}
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,scene.texture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,image);
      for(const [dawn,high,mono,burst] of (w===1600?[[0,0,0,0],[1,1,0,1]]:[[0,0,0,0],[0,0,1,0],[1,0,0,0],[1,1,0,0],[1,1,0,1],[1,1,1,1]])){
        const outputs=[];
        for(const program of programs){
          gl.useProgram(program.p);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,scene.texture);gl.uniform1i(gpu.uniform(program,'uBloomRaw'),2);
          gl.useProgram(program.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,scene.texture);gl.uniform1i(gpu.uniform(program,'uScene'),0);gl.uniform1i(gpu.uniform(program,'uBloom'),1);
          gl.uniform2f(gpu.uniform(program,'uPixel'),1/w,1/h);
          for(const [key,value] of Object.entries({Time:17.125,Dawn:dawn,High:high,Mono:mono,Burst:burst}))gl.uniform1f(gpu.uniform(program,'u'+key),value);
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,scene.texture);gl.bindFramebuffer(gl.FRAMEBUFFER,bloom.f);gl.viewport(0,0,bloom.w,bloom.h);gl.uniform1f(gpu.uniform(program,'uPass'),1);gl.drawArrays(gl.TRIANGLES,0,3);
          if(program===programs[1]){
            gl.useProgram(horizontal.p);gl.bindTexture(gl.TEXTURE_2D,bloom.texture);gl.uniform1i(gpu.uniform(horizontal,'uBloom'),1);gl.uniform2f(gpu.uniform(horizontal,'uPixel'),1/w,1/h);gl.bindFramebuffer(gl.FRAMEBUFFER,blur.f);gl.viewport(0,0,blur.w,blur.h);gl.drawArrays(gl.TRIANGLES,0,3);
            gl.useProgram(program.p);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,bloom.texture);gl.uniform1i(gpu.uniform(program,'uBloomRaw'),2);gl.activeTexture(gl.TEXTURE1);
          }
          gl.bindTexture(gl.TEXTURE_2D,program===programs[1]?blur.texture:bloom.texture);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.uniform1f(gpu.uniform(program,'uPass'),0);gl.drawArrays(gl.TRIANGLES,0,3);
          const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);outputs.push(pixels);
          if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL error during comparison');
        }
        let max=0,sum=0,changed=0;
        for(let i=0;i<outputs[0].length;i++){const difference=Math.abs(outputs[0][i]-outputs[1][i]);max=Math.max(max,difference);sum+=difference;if(difference)changed++;}
        rows.push({w,h,dawn,high,mono,burst,maxChannelDifference:max,meanChannelDifference:sum/outputs[0].length,changedChannels:changed});
      }
    }
    resources.programs.forEach(p=>gl.deleteProgram(p));resources.textures.forEach(t=>gl.deleteTexture(t));resources.frames.forEach(f=>gl.deleteFramebuffer(f));return rows;
  });
  const out=path.resolve(__dirname,'../../../outputs/graphics-profiles');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'composite-sampling-qa.json'),JSON.stringify({result,errors},null,2));
  assert.deepEqual(errors,[]);assert(result.every(row=>row.maxChannelDifference<=2&&row.meanChannelDifference<.15),JSON.stringify(result));
  console.log('PASS: '+result.length+' full-frame comparisons stay within two byte steps, including odd sizes, monochrome, bloom, refraction, depth of field, streaks and the Dawn burst.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
