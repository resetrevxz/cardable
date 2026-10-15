(function(C,root){'use strict';
  var doc=root.document,queued=null,last=null,timer=null,lastPaint=0,busy=false,releaseAt=0,paints=0;
  function el(id){return doc.getElementById(id);}
  function node(tag,className,text){var n=doc.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=text;return n;}
  function text(id,value){if(el(id).textContent!==String(value))el(id).textContent=value;}
  function art(row,className){var box=node('div',className);if(row.art){var image=node('img');image.src=row.art;image.alt=row.name;image.decoding='async';image.addEventListener('error',function(){image.remove();box.textContent='◇';},{once:true});box.appendChild(image);}else box.textContent='◇';return box;}
  function menu(show){el('menu').hidden=!show;el('settings').setAttribute('aria-expanded',String(show));if(show)el('side').focus();else el('settings').focus();}
  function actionState(){var choice=queued&&queued.reveal&&queued.reveal.choices;el('open').disabled=busy||choice||!queued||!queued.canMini||!queued.reveal&&!queued.ready;doc.querySelectorAll('.choice').forEach(function(b){b.disabled=busy;});}
  async function act(choice){
    if(busy||!queued||!queued.canMini||!el('menu').hidden||root.performance.now()<releaseAt)return;
    if(queued.reveal&&queued.reveal.choices&&choice==null||!queued.reveal&&!queued.ready)return;
    busy=true;actionState();text('message','');
    try{var result=await root.cardableMini.open({token:queued.token,choice:choice==null?null:choice});if(!result||!result.ok)text('message',result&&result.message||'Could not save. Expand Cardable to continue.');}
    catch(error){text('message','The game is unavailable. Expand Cardable to recover your reserved card.');}
    finally{busy=false;releaseAt=root.performance.now()+250;actionState();}
  }
  C.keys.emergency=function(){root.cardableMini.restore('settings');};
  C.keys.register({id:'menu.mini',label:'Restore full window',context:'menu',defaults:['Mod+KeyM'],run:function(){root.cardableMini.restore();}});
  C.keys.register({id:'opening.hold',label:'Open pack',context:'menu',defaults:['Space'],when:function(){return !queued||!queued.reveal;},run:function(){act();}});
  C.keys.register({id:'opening.keep',label:'Keep card',context:'menu',defaults:['Space','Enter'],when:function(){return !!queued&&!!queued.reveal&&!queued.reveal.choices;},run:function(){act();}});
  C.keys.register({id:'global.settings',label:'Mini settings',context:'global',defaults:['KeyS'],run:function(){menu(el('menu').hidden);}});
  [0,1,2].forEach(function(i){C.keys.register({id:'mini.choice'+i,label:'Choose card '+(i+1),context:'menu',defaults:['Digit'+(i+1)],when:function(){return !!queued&&!!queued.reveal&&queued.reveal.choices;},run:function(){act(i);}});});
  function update(state){
    if(!state)return;paints++;C.miniKeyBindings=state.keyBindings||{};
    doc.documentElement.dataset.rarityColor=state.rarityColor;doc.documentElement.classList.toggle('reduced-motion',state.reduced);
    if(/^#[0-9a-f]{6}$/i.test(state.accent))doc.documentElement.style.setProperty('--accent',state.rarityColor==='mono'?'#F5F5F7':state.accent);
    text('stock',state.ready);text('capacity','/ '+state.capacity+' stored');text('credits',state.credits.toLocaleString()+' Credits');
    if(!last||last.ready!==state.ready||last.capacity!==state.capacity){el('slots').replaceChildren();for(var i=0;i<Math.min(12,state.capacity);i++)el('slots').appendChild(node('span','slot'+(i<state.ready?' filled':'')));}
    var seconds=Math.ceil(state.remainingMs/1000),time=Math.floor(seconds/3600)+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
    text('timer-label',state.ready>=state.capacity?'Stock is full':'Next refill');text('countdown',state.ready>=state.capacity?'Timer paused':time);el('progress').value=state.ready>=state.capacity?1:state.progress;
    text('fps',state.miniFps+' FPS');doc.querySelector('.pinned').hidden=!state.miniPinned;text('restore-hint',C.keys.label('menu.mini')+' to expand');
    el('side').value=state.miniSide;el('frame-limit').value=String(state.miniFps);
    var changed=!last||state.token!==last.token||state.packId!==last.packId;
    if(changed){
      var reveal=state.reveal,choice=reveal&&reveal.choices,row=reveal&&reveal.cards[0];doc.body.dataset.choice=String(!!choice);el('preview').replaceChildren();el('preview').classList.toggle('has-card',!!row&&!choice);el('choices').replaceChildren();el('choices').hidden=!choice;
      text('stage-label',choice?'CHOOSE ONE':reveal?'RESERVED FOR YOU':'UP NEXT');text('receipt','');
      if(choice){text('name','Choose a card');text('detail',reveal.packName);reveal.cards.forEach(function(card,index){var b=node('button','choice');b.type='button';if(card.art){var img=node('img');img.src=card.art;img.alt='';b.appendChild(img);}var copy=node('span','',card.name);copy.appendChild(node('small','',card.rarity+(card.variant?' · '+card.variant:'')));b.append(copy,node('kbd','',index+1));b.addEventListener('click',function(){act(index);});el('choices').appendChild(b);});}
      else if(row){el('preview').appendChild(art(row,''));text('name',row.name);text('detail',row.rarity+(row.variant?' · '+row.variant:'')+' · '+row.serial);}
      else{var p=node('div','pack-emblem');p.append(node('small','','CARDABLE'),node('strong','','C'),node('span','',state.packId.toUpperCase()));el('preview').appendChild(p);text('name',state.nextPackName);text('detail','');}
      text('action-label',reveal?'Keep card':'Open pack');text('action-hint','');el('action-hint').hidden=true;el('detail').hidden=!el('detail').textContent;
    }
    text('action-key',C.keys.label(state.reveal?'opening.keep':'opening.hold')||'Click');el('open').hidden=!!(state.reveal&&state.reveal.choices);
    if(!last||JSON.stringify(last.recent)!==JSON.stringify(state.recent)){
      el('recent').replaceChildren();text('recent-count',state.recent.length?'LAST '+state.recent.length:'');
      if(!state.recent.length)el('recent').appendChild(node('p','recent-empty','No cards yet. Open a pack.'));
      state.recent.forEach(function(card){var row=node('div','recent-row'),copy=node('div');row.appendChild(art(card,'recent-art'));copy.append(node('strong','',card.name),node('small','',card.rarity+(card.variant?' · '+card.variant:'')));row.appendChild(copy);el('recent').appendChild(row);});
    }
    last=state;actionState();
  }
  function enqueue(state){queued=state;if(doc.hidden||timer!=null)return;var interval=1000/(state&&state.miniFps===60?60:30);timer=root.setTimeout(function(){timer=null;if(doc.hidden)return;lastPaint=root.performance.now();update(queued);},Math.max(0,Math.ceil(interval-(root.performance.now()-lastPaint))));}
  doc.addEventListener('visibilitychange',function(){if(doc.hidden&&timer!=null){root.clearTimeout(timer);timer=null;}if(!doc.hidden&&queued)enqueue(queued);});
  root.cardableMini.onState(enqueue);root.cardableMini.getState().then(enqueue).catch(function(){text('message','Cannot connect to Cardable. Use Expand to recover.');});
  el('open').addEventListener('click',function(){act();});el('expand').addEventListener('click',function(){root.cardableMini.restore();});el('settings').addEventListener('click',function(){menu(el('menu').hidden);});el('close-settings').addEventListener('click',function(){menu(false);});el('full-settings').addEventListener('click',function(){root.cardableMini.restore('settings');});
  async function configure(value){busy=true;actionState();el('side').disabled=el('frame-limit').disabled=true;try{var result=await root.cardableMini.configure(value);if(!result.ok)text('message',result.message);}catch(error){text('message','Could not save mini preferences.');}finally{busy=false;el('side').disabled=el('frame-limit').disabled=false;actionState();}}
  el('side').addEventListener('change',function(){configure({side:el('side').value});});el('frame-limit').addEventListener('change',function(){configure({fps:Number(el('frame-limit').value)});});
  doc.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();if(!el('menu').hidden)menu(false);else root.cardableMini.restore();}});
  doc.addEventListener('contextmenu',function(event){event.preventDefault();menu(true);});
  doc.addEventListener('pointerdown',function(event){if(!el('menu').hidden&&!event.target.closest('#menu,#settings'))menu(false);});
  root.CardableMiniDebug={get paints(){return paints;},get busy(){return busy;}};
})(window.Cardable,window);
