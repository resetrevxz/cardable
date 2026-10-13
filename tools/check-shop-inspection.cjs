/* Daily browsing preserves quotes, routes, focus and the held-purchase boundary. */
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');let browser;
(async()=>{
  browser=await chromium.launch({headless:true,executablePath:process.env.SHOP_BROWSER_PATH||undefined});
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],network=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
  await page.goto('file:///'+path.join(root,'index.html').replace(/\\/g,'/'));
  await page.waitForFunction(()=>Cardable.setup&&!Cardable.setup.loading);
  await page.evaluate(()=>{
    if(Cardable.tutorial.active)Cardable.tutorial.skipButton.click();
    Cardable.settings.applyPreset('high');Cardable.settings.set('shopMotion','cinematic');Cardable.currency.add(100000,'dev');
    window.inspectionTransitions=[];
    const native=document.startViewTransition.bind(document);
    document.startViewTransition=update=>{
      const transition=native(update),record={ready:'pending',finished:false};inspectionTransitions.push(record);
      transition.ready.then(()=>record.ready='ready',error=>record.ready=error.name);
      transition.finished.finally(()=>record.finished=true);return transition;
    };
  });
  await page.locator('#shop-entry').click();
  await page.locator('.shop-options-control').click();
  await page.locator('.shop-options [data-setting="shopSort"]').selectOption('price-desc');
  await page.locator('.shop-options-close').click();
  const ordered=await page.locator('.shop-offer').evaluateAll(tiles=>tiles.map(tile=>({
    id:tile.dataset.offerId,name:tile.querySelector('h3').textContent,price:Number(tile.dataset.price)
  })));
  const business=()=>page.evaluate(()=>JSON.stringify({currency:Cardable.state.current.currency,serial:Cardable.state.current.serialCounter,
    inventory:Cardable.state.current.inventory,shop:Cardable.state.current.shop,packs:Cardable.state.current.packs,lists:Cardable.inventoryModel.current.collections}));
  const before=await business();
  async function shown(index){
    await page.waitForFunction(name=>document.querySelector('.shop-detail-copy h2')?.textContent===name,ordered[index].name);
    await page.waitForFunction(()=>inspectionTransitions.every(record=>record.finished));
    assert.equal(await page.locator('.shop-inspection-position').innerText(),String(index+1).padStart(2,'0')+' / 04');
    assert.equal(await page.locator('.shop-detail-copy .shop-price strong').innerText(),ordered[index].price.toLocaleString());
  }
  await page.locator('.shop-offer .shop-inspect').first().click();await shown(0);
  assert.equal(await page.locator('.shop-inspection-specs').getAttribute('open'),null);
  await page.locator('.shop-inspection-specs summary').click();
  assert.equal(await page.locator('.shop-specs').isVisible(),true);
  assert.ok(await page.locator('.shop-inspection-specs summary').evaluate(el=>el.getBoundingClientRect().height>=44));
  await page.locator('.shop-inspection-next').click();await shown(1);
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('shop-inspection-next')),true);
  assert.equal(await page.locator('.shop-specs').isVisible(),true,'Specs disclosure did not retain its session state');
  await page.locator('.shop-inspection-specs summary').click();
  await page.keyboard.press('ArrowLeft');await shown(0);
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('shop-inspection-prev')),true);
  await page.keyboard.press('ArrowLeft');await shown(3);
  await page.keyboard.press('ArrowRight');await shown(0);
  assert.ok(await page.evaluate(()=>inspectionTransitions.every(record=>record.ready==='ready')));
  const listeners=await page.locator('.shop-screen').evaluate(el=>el._cbKeyListeners.size);
  for(let i=0;i<8;i++){await page.locator('.shop-inspection-next').click();await shown((i+1)%4);}
  assert.equal(await page.locator('.shop-screen').evaluate(el=>el._cbKeyListeners.size),listeners);
  assert.equal(await page.locator('.shop-detail-card > .collectible-card').count(),1);
  assert.deepEqual(await business(),before,'Inspection changed gameplay state');
  await page.locator('.shop-wishlist-summary').click();await page.locator('.shop-wishlist-new summary').click();
  await page.locator('.shop-wishlist-name').fill('Arrow editing');
  await page.keyboard.press('ArrowLeft');await shown(0);
  assert.equal(await page.locator('.shop-wishlist-name').inputValue(),'Arrow editing');
  await page.locator('.shop-wishlist-summary').click();
  await page.screenshot({path:path.join(root,'artifacts/shop-inspection-desktop.png')});
  const hold=page.locator('.shop-detail .shop-hold');
  await hold.focus();await page.keyboard.down('Space');await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');await shown(1);
  await page.waitForTimeout(1050);await page.keyboard.up('Space');
  assert.equal(await page.locator('.shop-receipt').count(),0);
  assert.deepEqual(await business(),before,'Browsing completed a cancelled hold');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{Cardable.settings.set('rarityColor','mono');Cardable.settings.set('motion','off');Cardable.settings.set('shopMotion','quiet');});
  await page.screenshot({path:path.join(root,'artifacts/shop-inspection-mobile-mono.png')});
  assert.ok(await page.locator('.shop-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  assert.ok(await page.locator('.shop-inspection-tools button').evaluateAll(buttons=>buttons.every(button=>{
    const rect=button.getBoundingClientRect();return rect.width>=44&&rect.height>=44;
  })));
  const transitionCount=await page.evaluate(()=>inspectionTransitions.length);
  await page.locator('.shop-inspection-next').click();await shown(2);
  assert.equal(await page.evaluate(()=>inspectionTransitions.length),transitionCount,'Quiet motion started an object transition');
  await page.locator('.shop-back').click();
  assert.equal(await page.evaluate(()=>document.activeElement.closest('.shop-offer').dataset.offerId),ordered[2].id);
  await page.locator('.shop-compare-open').click();
  await page.locator('.shop-compare-art').first().click();
  await page.locator('.shop-inspection-next').click();
  const inspected=await page.locator('.shop-detail-copy h2').innerText();
  assert.equal(await page.locator('.shop-back').innerText(),'Back to comparison');
  await page.locator('.shop-back').click();
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Inspect '+inspected);
  await page.locator('.shop-back').click();
  await page.locator('.shop-offer .shop-inspect').nth(2).click();await shown(2);
  const purchase=page.locator('.shop-detail .shop-hold');
  await purchase.focus();await page.keyboard.down('Space');await page.waitForTimeout(1650);await page.keyboard.up('Space');
  await page.locator('.shop-receipt').waitFor();
  assert.equal(await page.locator('.shop-detail-copy h2').innerText(),ordered[2].name);
  const saved=await page.evaluate(()=>({balance:Cardable.state.current.currency,receipts:Cardable.state.current.shop.receipts.length,
    offer:Cardable.state.current.shop.receipts[0].offerId,copy:Cardable.state.current.inventory.at(-1).cardId}));
  assert.equal(saved.receipts,1);assert.equal(saved.offer,ordered[2].id);
  assert.equal(saved.balance,JSON.parse(before).currency-ordered[2].price);
  await page.reload();await page.waitForFunction(()=>Cardable.setup&&!Cardable.setup.loading);
  assert.equal(await page.evaluate(()=>Cardable.state.current.currency),saved.balance);
  assert.equal(await page.evaluate(()=>Cardable.state.current.shop.receipts.length),1);
  await page.locator('#shop-entry').click();await page.locator('.shop-offer .shop-inspect').first().click();
  await page.evaluate(()=>Cardable.saveTools.importText(Cardable.saveTools.exportText()));
  assert.equal(await page.locator('.shop-inspection-next').isDisabled(),true);
  assert.equal(await page.locator('.shop-inspection-prev').isDisabled(),true);
  assert.equal(await page.locator('.shop-detail .shop-hold').isDisabled(),true);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.equal(await page.locator('.shop-detail .shop-hold').isDisabled(),true,'A status refresh re-enabled the replaced inspection');
  await page.locator('.shop-back').click();await page.locator('.shop-offer .shop-inspect').first().click();
  await page.evaluate(()=>{
    const now=Cardable.clock.now();window.inspectionClock=Cardable.clock.now;Cardable.clock.now=()=>now+86400000;
    window.dispatchEvent(new Event('focus'));
  });
  assert.equal(await page.locator('.shop-inspection-next').isDisabled(),true);
  assert.equal(await page.locator('.shop-inspection-prev').isDisabled(),true);
  assert.equal(await page.locator('.shop-detail .shop-hold').isDisabled(),true);
  assert.equal(await page.locator('.shop-offer-state').isVisible(),true);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.shop-inspection-position').innerText(),'— / —');
  await page.locator('.shop-back').click();
  assert.equal(await page.locator('.shop-offer').count(),4);
  await page.evaluate(()=>{Cardable.clock.now=inspectionClock;Cardable.shop.close();});
  const count=await page.evaluate(()=>Cardable.events.listenerCount);
  for(let i=0;i<3;i++){
    await page.locator('#shop-entry').click();await page.locator('.shop-offer .shop-inspect').first().click();
    await page.locator('.shop-inspection-next').click();await page.locator('.shop-close').click();
  }
  assert.equal(await page.evaluate(()=>Cardable.events.listenerCount),count);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  console.log(JSON.stringify({pass:true,sortedBrowsing:true,focus:true,oneFullCard:true,stableListeners:true,
    fieldsKeepArrows:true,holdCancelled:true,selectedOfferPurchased:true,reload:true,comparisonReturn:true,importDisabled:true,expiredDisabled:true,mobileMono:true,quiet:true}));
  await browser.close();browser=null;
})().catch(async error=>{console.error(error);process.exitCode=1;if(browser)await browser.close();});
