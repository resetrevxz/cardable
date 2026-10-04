/* Choice presentation is a registered strategy; the shared opening owns time. */
(function(C,root){
  'use strict';
  var node=C.packMarkup.node,modal=false,activeRelease=null;
  C.events.on('preferences:context',function(e){modal=e.active;if(modal&&activeRelease)activeRelease();});
  C.events.on('fx:visibility',function(){if(activeRelease)activeRelease();});
  C.events.on('menu:afk',function(value){if(value&&activeRelease)activeRelease();});
  function moving(){return !C.motion.reduced&&C.settings.policy.animation>=2;}
  function clamp(n){return Math.max(0,Math.min(1,n));}
  C.packOpenings.register('pickThree',{bind:function(host,foil,pack){
    var cfg=pack.motion,context=null,screen=null,buttons=[],views=[],wings=[],drag=null,state='closed',age=0,selected=-1,focused=0,armedAt=-Infinity,hold=null,hovered=-1,choice=null,lastPaint=-Infinity,choiceShift=0;
    function allowed(){return !!context&&!modal&&!root.document.hidden&&!(C.contextMenu&&C.contextMenu.open)&&!(C.menu&&C.menu.afk)&&C.opening.phase==='vaultOpening';}
    function release(event){if(drag&&(!event||event.pointerId===drag.id)){var id=drag.id;drag=null;if(host.hasPointerCapture(id))host.releasePointerCapture(id);}if(!event||hold&&event.pointerId===hold.id){hold=null;if(screen)screen.style.setProperty('--picker-confirm',0);}}
    function destroyViews(){views.forEach(function(v){if(v)v.destroy();});views=[];}
    function clear(){
      release();destroyViews();wings.forEach(function(w){w.remove();});wings=[];if(screen)screen.remove();screen=null;buttons=[];context=null;state='closed';age=0;selected=-1;hovered=-1;choice=null;lastPaint=-Infinity;
      foil.classList.remove('is-picker-unfolding');foil.style.removeProperty('--picker-unfold');foil.style.removeProperty('--picker-dissolve');foil.style.opacity='';
      root.document.removeEventListener('keydown',key,true);root.removeEventListener('blur',release);
      if(activeRelease===release)activeRelease=null;
    }
    function descriptor(option){return Object.assign({serial:'',pulledAt:C.state.current.pendingReveal.committedAt,seen:true,cardSkinId:null},option);}
    function secret(option){return C.rarity(C.card(option.cardId).rarity).tier===11;}
    function preview(index,full){
      var pending=C.state.current.pendingReveal,option=pending.options[index],slot=buttons[index].querySelector('.picker-card-preview');
      if(secret(option))return;
      if(views[index])views[index].destroy();
      var card=C.card(option.cardId),view=C.cardView.create(card,descriptor(option),full?{owned:true,autoFocus:false,autoStamp:false,keyboardFlip:false}:{owned:true,thumbnail:true});
      slot.appendChild(view.el);if(full){view.el.inert=true;view.el.setAttribute('aria-hidden','true');view.el.setAttribute('tabindex','-1');view.setPresentation('art-only');view.setFace('front');view.setMode('full');}views[index]=view;
    }
    function hover(index){
      if(state!=='pick')return;
      if(hovered===index)return;
      if(hovered>=0)preview(hovered,false);
      hovered=index;if(index>=0&&!C.motion.reduced&&C.settings.policy.animation>=2)preview(index,true);C.fx.wake();
    }
    function select(index,confirm){
      if(!allowed()||state!=='pick')return;
      var now=root.performance.now();
      if(confirm&&selected===index&&now-armedAt<1600){choose(index);return;}
      selected=index;focused=index;armedAt=now;
      buttons.forEach(function(b,i){b.classList.toggle('is-selected',i===index);b.setAttribute('aria-pressed',i===index?'true':'false');});
      screen.querySelector('.picker-prompt').textContent='Confirm your choice · click again, hold, or press Enter';
      context.announce('Option '+(index+1)+' selected. Confirm with Enter, a second click, or a short hold.');C.fx.wake();
    }
    function choose(index){
      if(!allowed()||state!=='pick')return;
      var result;
      try{result=C.picker.choose(index);}catch(_){result=null;}
      if(!result){hold=null;context.announce('Could not save your choice. The same options are still reserved.');screen.querySelector('.picker-prompt').textContent='Could not save · choose again';return;}
      choice=index;selected=index;state='chosen';age=0;release();destroyViews();
      var rect=buttons[index].getBoundingClientRect();choiceShift=root.innerWidth/2-(rect.left+rect.width/2);
      // Static previews during departure: only the ensuing central reveal mounts
      // a live chosen card. Option descriptors never receive gameplay serials.
      buttons.forEach(function(b,i){b.disabled=true;if(!secret(result.options[i]))preview(i,false);b.classList.toggle('is-chosen',i===index);b.classList.toggle('is-unpicked',i!==index);if(i!==index&&moving()&&C.settings.policy.particles>0)for(var n=0;n<3;n++){var particle=node('i','picker-unpick-particle',b);particle.style.setProperty('--particle-x',(n-1)*28+'px');particle.style.setProperty('--particle-turn',(n*60)+'deg');}});
      screen.querySelector('.picker-prompt').textContent='Choice saved';context.announce('Choice saved. Revealing your card.');C.fx.wake();
    }
    function key(e){
      if(!allowed()||state!=='pick'||e.ctrlKey||e.metaKey||e.altKey||e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
      var index=/^[123]$/.test(e.key)?Number(e.key)-1:null;
      if(index!==null&&index<buttons.length){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){select(index,false);buttons[index].focus({preventScroll:true});}return;}
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){focused=(focused+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;select(focused,false);buttons[focused].focus({preventScroll:true});}return;}
      if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)select(focused,true);}
    }
    function offer(recover){
      wings.forEach(function(w){w.remove();});wings=[];
      screen=node('section','picker-screen',host.closest('.opening-stage'));screen.setAttribute('role','group');screen.setAttribute('aria-label',pack.tagline);
      screen.dataset.state=recover?'pick':'flipping';screen.dataset.reduced=String(!moving());
      node('div','picker-table-light',screen).setAttribute('aria-hidden','true');
      var row=node('div','picker-options',screen),pending=C.state.current.pendingReveal;
      buttons=pending.options.map(function(option,index){
        var card=C.card(option.cardId),rarity=C.rarity(card.rarity),hidden=secret(option);
        var button=node('button','picker-option',row);button.type='button';button.dataset.index=index;button.style.setProperty('--option-index',index);button.style.setProperty('--option-count',pending.options.length);
        button.setAttribute('aria-label','Option '+(index+1)+' of '+pending.options.length+': '+(hidden?'???':card.name+', '+rarity.name));button.setAttribute('aria-pressed','false');
        var turn=node('div','picker-card-turn',button),back=node('div','picker-option-back',turn);node('span','',back,'C');
        var front=node('div','picker-option-front',turn);node('div','picker-card-preview',front);
        if(hidden){button.classList.add('is-secret-option');node('div','picker-secret-mask',front,'???');}
        var meta=node('div','picker-option-meta',button);node('span','picker-option-number',meta,String(index+1));node('strong','picker-option-name',meta,hidden?'???':card.name);
        if(!hidden){node('span','picker-option-tier',meta,rarity.name);var variant=C.variant(option.variantId);if(variant)node('span','picker-option-variant',meta,'◇ '+variant.name);}
        node('i','picker-confirm-ring',button).setAttribute('aria-hidden','true');
        button.disabled=!recover;
        button.addEventListener('pointerenter',function(){hover(index);});button.addEventListener('pointerleave',function(){if(hovered===index)hover(-1);});
        button.addEventListener('focus',function(){focused=index;hover(index);});
        button.addEventListener('pointermove',function(e){if(views[index]&&views[index].mode==='full')views[index].pointer({pointer:{x:e.clientX,y:e.clientY,target:e.target}});});
        var freshPress=false;
        button.addEventListener('pointerdown',function(e){if(e.button!==0||!allowed()||state!=='pick')return;freshPress=selected!==index||root.performance.now()-armedAt>=1600;if(freshPress)select(index,false);hold={id:e.pointerId,index:index,at:root.performance.now()};button.setPointerCapture(e.pointerId);C.fx.wake();});
        button.addEventListener('pointerup',function(e){release(e);});button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
        button.addEventListener('click',function(){if(freshPress){freshPress=false;return;}select(index,true);});
        return button;
      });
      pending.options.forEach(function(_,i){preview(i,false);});
      node('p','picker-prompt',screen,'Pick 1 of '+buttons.length);node('small','picker-key-hint',screen,'1 · 2 · 3 to select / Enter to confirm');
      state=recover?'pick':'flipping';age=0;foil.style.opacity=0;
      root.document.addEventListener('keydown',key,true);root.addEventListener('blur',release);
      activeRelease=release;
      if(recover){buttons.forEach(function(b){b.style.setProperty('--picker-flip',1);});buttons[0].focus({preventScroll:true});context.announce('Your saved options. Pick one card.');}
    }
    function advance(){
      if(state!=='closed'||!context||!context.canActivate())return;
      release();state='unfolding';age=0;foil.classList.add('is-picker-unfolding');context.unseal();context.announce('Unfolding three possibilities.');C.fx.wake();
    }
    return {
      hint:'Drag either wing outward, or press Enter to unfold.',actionLabel:'Unfold',advance:advance,
      begin:function(ctx){clear();context=ctx;state='closed';foil.style.opacity=1;
        ['left','right'].forEach(function(side){var wing=node('button','picker-wing picker-wing--'+side,foil);wing.type='button';wing.textContent=side==='left'?'←':'→';wing.setAttribute('aria-label','Unfold '+side+' wing');wing.addEventListener('click',advance);wings.push(wing);});},
      resume:function(ctx){clear();context=ctx;offer(true);},
      start:function(e){if(state!=='closed'||!context.canActivate()||e.button!==0||!e.target.closest('.picker-wing'))return;drag={id:e.pointerId,x:e.clientX,side:e.target.closest('.picker-wing--left')?-1:1};host.setPointerCapture(e.pointerId);e.preventDefault();},
      move:function(e){if(!drag||e.pointerId!==drag.id)return;var p=clamp((e.clientX-drag.x)*drag.side/70);foil.style.setProperty('--picker-unfold',p*.45);if(p>=.85)advance();C.fx.wake();},
      release:release,reset:clear,
      dissolve:function(glass,p){glass.el.style.setProperty('--picker-dissolve',moving()?p:0);},
      update:function(dt){
        if(!context||modal||root.document.hidden||C.menu.afk){release();return false;}
        age+=dt;
        if(screen)screen.dataset.reduced=String(!moving());
        if(state==='unfolding'){var p=clamp(age/(moving()?cfg.unfoldMs:200));foil.style.setProperty('--picker-unfold',p);foil.style.opacity=1-p*.5;if(p===1)offer(false);return true;}
        if(state==='flipping'){
          var total=(buttons.length-1)*cfg.flipStaggerMs+cfg.flipMs;
          buttons.forEach(function(b,i){var p=clamp((age-i*cfg.flipStaggerMs)/cfg.flipMs),option=C.state.current.pendingReveal.options[i],tier=C.rarity(C.card(option.cardId).rarity).tier;b.style.setProperty('--picker-flip',p);b.style.setProperty('--picker-option-glow',Math.sin(p*Math.PI)*Math.min(.16,.04+tier*.01));});
          if(age>=total){state='pick';screen.dataset.state='pick';buttons.forEach(function(b){b.disabled=false;});buttons[0].focus({preventScroll:true});context.announce('Pick one of '+buttons.length+'. Press 1, 2 or 3, then Enter to confirm.');}return true;
        }
        if(state==='pick'&&hold){var p=clamp((root.performance.now()-hold.at)/cfg.confirmMs);screen.style.setProperty('--picker-confirm',p);if(p===1)choose(hold.index);return true;}
        if(state==='chosen'){
          var p=clamp(age/(moving()?cfg.choiceMs:240)),row=screen.querySelector('.picker-options'),target=(buttons.length-1)/2;
          buttons.forEach(function(b,i){var chosen=i===choice;b.style.opacity=chosen?1:1-p;b.style.transform=moving()?(chosen?'translateX('+(choiceShift*p)+'px) scale('+(1+p*.12)+')':'translateY('+(p*90)+'px) rotate('+((i-target)*p*12)+'deg) scale('+(1-p*.15)+')'):'none';});
          row.style.setProperty('--picker-choice-progress',p);
          if(p===1){var reveal=context.reveal;clear();reveal();}return true;
        }
        if(state==='pick'&&selected>=0&&root.performance.now()-armedAt>=1600){armedAt=-Infinity;screen.querySelector('.picker-prompt').textContent='Pick 1 of '+buttons.length+' · confirm with a short hold';}
        if(state==='pick'&&moving()&&buttons.some(function(b){return b.classList.contains('is-secret-option');})&&age-lastPaint>=500){screen.style.setProperty('--picker-glitch-x',(Math.floor(age/500)%3-1)+'px');lastPaint=age;}
        return state==='pick'&&(selected>=0&&root.performance.now()-armedAt<1600||moving()&&buttons.some(function(b){return b.classList.contains('is-secret-option');}));
      },get active(){return !!drag||!!hold;}
    };
  }});
})(window.Cardable,window);
