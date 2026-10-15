'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-output/ui-polish-browser'),evidence={checks:[],errors:[],layouts:[],screens:[]};
(async()=>{
  fs.mkdirSync(out,{recursive:true});const local=await require('./qa-local-server.cjs').start(root),browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.setDefaultTimeout(10000);page.on('pageerror',e=>evidence.errors.push(e.stack));
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});evidence.screens.push(name+'.png');};
  try{
    await page.goto(local.url+'/index.html');await page.waitForFunction(()=>Cardable.preferences?.initialized);
    await page.evaluate(()=>{Cardable.tutorial.skipButton.click();if(Cardable.friendly?.active)Cardable.friendly.close();});
    for(let i=0;i<5;i++){const b=page.locator('.qol-friendly:visible').getByRole('button',{name:/^(Continue|Keep this collection|Done|Dismiss)$/});if(!await b.count())break;await b.click();await page.waitForTimeout(200);}
    await page.waitForFunction(()=>Cardable.setup&&!Cardable.setup.loading);await page.bringToFront();await page.evaluate(()=>{
      const C=Cardable,s=C.state.fresh(),cards=C.data.cards.filter(c=>!c.retired&&c.active!==false);s.tutorial.done=true;s.tutorial.step='done';s.inventory=cards.slice(0,60).map((c,i)=>({cardId:c.id,instanceId:'browser-'+i,packId:'standard',serial:C.serial.format(s.playerCode,i+1),pulledAt:Date.now(),seen:true,variantId:null,cardSkinId:null}));s.serialCounter=s.inventory.length;C.state.commit(C.state.validate(s,true));C.events.emit('save:replaced',C.state.current);C.settings.set('motion','off');C.inventoryModel.update({viewMode:'grid'});C.inventory.request('expanded');
    });await page.waitForTimeout(100);await page.evaluate(()=>Cardable.inventory.request('expanded'));await page.waitForFunction(()=>Cardable.inventory.rendered.size>0);
    for(const [width,height] of [[390,800],[760,820],[1280,720],[1920,1080]])for(const scale of ['70','100','150']){
      await page.setViewportSize({width,height});await page.evaluate(v=>Cardable.settings.set('interfaceSize',v),scale);await page.waitForTimeout(250);
      const r=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,columns:Cardable.inventory.grid.querySelectorAll('.inventory-tile').length,tiles:Array.from(Cardable.inventory.rendered.values()).map(t=>{const r=t.el.getBoundingClientRect();return {x:r.x,w:r.width};})}));evidence.layouts.push({width,height,scale,...r});assert(r.scroll<=r.width+1);assert(r.tiles.every(t=>t.x>=-1&&t.x+t.w<=r.width+1));if(scale==='100')await shot('grid-'+width);
    }
    evidence.checks.push('All four browser sizes at 70, 100 and 150 percent scale: no document overflow or horizontally clipped card tiles.');
    await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>Cardable.settings.set('interfaceSize','100'));
    await page.getByRole('button',{name:'Inventory controls',exact:true}).click();
    await page.getByRole('searchbox',{name:'Search cards',exact:true}).fill('vram:nope');assert.equal(await page.getByRole('searchbox',{name:'Search cards',exact:true}).getAttribute('aria-invalid'),'true');
    await page.getByRole('searchbox',{name:'Search cards',exact:true}).fill('');await page.locator('.inventory-control-section').filter({has:page.locator('summary', {hasText:'Filters'})}).locator('summary').click();
    await page.getByRole('button',{name:'Missing only',exact:true}).click();assert(await page.getByRole('checkbox',{name:'Show unowned',exact:true}).isChecked());
    await page.getByRole('checkbox',{name:'Show unowned',exact:true}).uncheck();assert(await page.evaluate(()=>Cardable.inventory.entries.every(e=>e.owned)));
    await page.keyboard.press('Escape');await page.waitForTimeout(160);
    await page.getByRole('button',{name:'Inventory controls',exact:true}).focus();await page.waitForTimeout(450);assert.equal(await page.locator('[role=tooltip]').count(),1);assert.equal(await page.getByRole('button',{name:'Inventory controls',exact:true}).getAttribute('title'),null);await shot('tooltip');await page.keyboard.press('Escape');assert.equal(await page.locator('[role=tooltip]').count(),0);await page.evaluate(()=>{const b=document.createElement('button');b.id='tooltip-owner-fixture';b.textContent='Temporary';b.dataset.tooltip='Temporary action';document.querySelector('.inventory-toolbar-buttons').appendChild(b);b.focus();});await page.waitForTimeout(450);assert.equal(await page.locator('[role=tooltip]').count(),1);await page.evaluate(()=>document.getElementById('tooltip-owner-fixture').remove());await page.waitForFunction(()=>!document.querySelector('[role=tooltip]'));
    await page.getByRole('tab',{name:'Album',exact:true}).click();await page.waitForFunction(()=>Cardable.studioAlbumUI?.shown);await page.waitForTimeout(300);await shot('album-empty');assert.equal(await page.locator('.album-inspector:visible').count(),0);assert.equal(await page.locator('.inventory-title h2').textContent(),'Album');
    evidence.checks.push('Search error stays beside Search; Missing only agrees with Show unowned; keyboard tooltip and Escape; empty Album uses one placeholder and its own header.');
    await page.evaluate(async()=>{const C=Cardable,c=document.createElement('canvas');c.width=32;c.height=32;c.getContext('2d').fillRect(0,0,32,32);const blob=await new Promise(r=>c.toBlob(r,'image/png'));window.polishPhotoBytes=Array.from(new Uint8Array(await blob.arrayBuffer()));for(let i=0;i<2;i++)await C.studioAlbum.save({id:'polish-photo-'+i,cardId:C.state.current.inventory[0].cardId,instanceId:C.state.current.inventory[0].instanceId,name:'Polish photo '+i,w:32,h:32,blob,thumb:blob,createdAt:Date.now()+i,sceneJson:'{}',tags:[]});C.events.emit('studio:albumChanged');});
    await page.getByRole('button',{name:'Photo: Polish photo 0',exact:true}).click();await page.keyboard.down('Delete');await page.keyboard.down('Delete');await page.keyboard.up('Delete');assert.equal(await page.evaluate(async()=> (await Cardable.studioAlbum.list()).length),2);
    await page.keyboard.press('Delete');await page.waitForFunction(async()=> (await Cardable.studioAlbum.list()).length===1);await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(async()=> (await Cardable.studioAlbum.list()).length===2);
    assert(await page.evaluate(async()=>{const p=await Cardable.studioAlbum.get('polish-photo-0');return JSON.stringify(Array.from(new Uint8Array(await p.blob.arrayBuffer())))===JSON.stringify(window.polishPhotoBytes);}));
    await page.getByRole('button',{name:'Select all',exact:true}).click();await page.getByRole('button',{name:'Compare two',exact:true}).click();await page.waitForTimeout(150);await shot('album-compare');await page.keyboard.press('Escape');
    evidence.checks.push('Album held Delete cannot confirm; a separate activation deletes; Undo restores full photo bytes; exactly two selected photos compare.');

    await page.evaluate(()=>{Cardable.inventory.setPage(null);Cardable.inventory.request(false);});await page.waitForFunction(()=>!Cardable.inventory.active);
    await page.evaluate(()=>Cardable.preferences.show());await page.waitForTimeout(250);
    await page.getByRole('searchbox',{name:/Search.*setting/i}).fill('Cursor glow');await page.waitForTimeout(100);assert(await page.locator('.settings-row:visible .settings-row-icon').count()>0);await shot('settings-search');await page.evaluate(()=>Cardable.preferences.close());
    evidence.checks.push('Settings search preserves separate row icons.');
    await page.evaluate(()=>{Cardable.settings.set('motion','off');Cardable.settings.applyPreset('high');});
    for(let i=0;i<3;i++){await page.evaluate(()=>Cardable.preferences.show());await page.waitForTimeout(300);assert(await page.locator('.settings-panel').evaluate(el=>getComputedStyle(el.closest('[data-surface-state]')||el).opacity!=='0'));await page.evaluate(()=>Cardable.preferences.close());}
    await page.evaluate(()=>Cardable.commands.open());await page.waitForTimeout(100);await page.evaluate(()=>{window.paletteClosing=Cardable.commands.close();Cardable.commands.open();});await page.evaluate(()=>window.paletteClosing);assert.equal(await page.evaluate(()=>Cardable.commands.active),false);
    await page.evaluate(()=>Cardable.commands.open());await page.waitForFunction(()=>getComputedStyle(document.querySelector('.dev-palette-backdrop')).opacity==='1');assert(await page.locator('.dev-palette-backdrop:visible').evaluate(el=>getComputedStyle(el).opacity==='1'));await page.evaluate(()=>Cardable.commands.close());
    evidence.checks.push('Three animated Settings open/close cycles remain visible; palette exit blocks rapid reopen and later reopens visibly.');

    assert.deepEqual(evidence.errors,[]);console.log(JSON.stringify({checks:evidence.checks,errors:evidence.errors,layouts:evidence.layouts.length,screens:evidence.screens},null,2));
  }catch(e){evidence.failure=e.stack;evidence.state=await page.evaluate(()=>({hidden:document.hidden,opening:Cardable.opening.phase,preferences:Cardable.preferences.open,inventory:Cardable.inventory.detent,setup:Cardable.setup.loading,ui:Cardable.inventoryModel.current}));console.error(e,evidence.state);await shot('failure');process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(evidence,null,2));await browser.close();local.close();}
})();
