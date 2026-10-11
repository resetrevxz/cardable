'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'cardable-layout-')),output=path.join(root,'qa-output/optimization');let app;const evidence=[];
(async()=>{try{
  app=await _electron.launch({executablePath:require('electron'),args:[root,'--qa-test','--test-user-data='+profile]});const page=await app.firstWindow();await page.waitForFunction(()=>window.Cardable?.preferences?.initialized&&Cardable.desktop?.info);
  await page.evaluate(()=>Cardable.tutorial.skipButton.click());const welcome=page.getByRole('button',{name:'Start collecting',exact:true});await welcome.waitFor({state:'visible',timeout:10000});await welcome.click();
  const win=await app.browserWindow(page);
  for(const size of [null,[1280,800],[1920,1080]]){
    if(size)await win.evaluate((w,size)=>{w.restore();w.setSize(...size);},size);
    await page.waitForTimeout(1000);
    const native=await win.evaluate(w=>({bounds:w.getBounds(),content:w.getContentBounds(),zoom:w.webContents.getZoomFactor()}));
    const renderer=await page.evaluate(()=>{const C=Cardable,r=C.viewport.root.getBoundingClientRect();return {inner:[innerWidth,innerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],visual:[visualViewport.width,visualViewport.height],dpr:devicePixelRatio,root:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:[C.viewport.width,C.viewport.height],offset:[C.viewport.root.style.left,C.viewport.root.style.top]};});
    evidence.push({size,native,renderer});
  }
}finally{if(app)await app.close();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'pass3-desktop-layout.json'),JSON.stringify(evidence,null,2));if(path.resolve(profile).startsWith(path.resolve(os.tmpdir(),'cardable-layout-')))fs.rmSync(profile,{recursive:true,force:true});}
console.log(JSON.stringify(evidence,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
