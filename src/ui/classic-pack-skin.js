(function(C,root){
  'use strict';
  var node=C.packMarkup.node;
  var segments=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  function display(parent){var screen=node('div','classic-display',parent);for(var i=0;i<2;i++){var digit=node('span','classic-digit',screen);'abcdefg'.split('').forEach(function(s){var bar=node('i','classic-digit__segment classic-digit__segment--'+s,digit);bar.dataset.segment=s;});}return screen;}
  function digits(screen,value){value=String(Math.max(0,Math.min(99,Math.floor(value)))).padStart(2,'0');if(screen.dataset.value===value)return;screen.dataset.value=value;screen.querySelectorAll('.classic-digit').forEach(function(digit,i){digit.querySelectorAll('i').forEach(function(bar){bar.dataset.lit=segments[Number(value[i])].includes(bar.dataset.segment);});});}
  function render(el,pack){
    el.dataset.skin=pack.skin;
    el.querySelectorAll('.pack-wrapper').forEach(function(wrapper){
      if(wrapper.querySelector('.classic-case'))return;
      var bezel=node('div','pack-skin-layer classic-case',wrapper);
      ['tl','tr','bl','br'].forEach(function(c){node('i','classic-screw classic-screw--'+c,bezel);});
      var tab=node('div','classic-pull-tab',bezel);node('span','classic-pull-tab__arrow',tab,'↑');node('span','',tab,'PULL');node('i','classic-perforation',tab);
      var header=node('div','classic-header',bezel);node('span','classic-header__mark',header,'C');node('strong','',header,C.config.gameName);node('small','',header,'HARDWARE ARCHIVE');
      var bay=node('div','classic-bay',bezel);node('div','classic-bay__door',bay);node('i','classic-bay__slot',bay);node('i','classic-bay__eject',bay);
      var control=node('div','classic-control',bezel);display(control);node('i','classic-key-lock',control);node('i','classic-power',control);node('span','classic-power-label',control,'POWER');node('i','classic-turbo',control);node('span','classic-turbo-label',control,'TURBO');node('i','classic-turbo-led',control);node('i','classic-hdd-led',control);node('small','classic-hdd-label',control,'HDD');
      var progress=node('div','classic-progress',bezel);for(var i=0;i<20;i++)node('i','',progress);
      var grille=node('div','classic-grille',bezel);for(var j=0;j<19;j++)node('i','classic-grille__slat',grille);
      var sticker=node('div','classic-sticker',bezel),chip=root.document.createElementNS('http://www.w3.org/2000/svg','svg');chip.setAttribute('class','classic-sticker__chip');chip.setAttribute('viewBox','0 0 12 12');chip.setAttribute('shape-rendering','crispEdges');chip.setAttribute('aria-hidden','true');var pixels=root.document.createElementNS(chip.namespaceURI,'path');pixels.setAttribute('d','M2 2h8v8H2ZM0 3h2v1H0Zm0 4h2v1H0Zm10-4h2v1h-2Zm0 4h2v1h-2ZM3 0h1v2H3Zm4 0h1v2H7ZM3 10h1v2H3Zm4 0h1v2H7Z');pixels.setAttribute('fill','currentColor');chip.appendChild(pixels);var letter=root.document.createElementNS(chip.namespaceURI,'path');letter.setAttribute('d','M4 4h4v1H5v2h3v1H4Z');letter.setAttribute('fill','#E9E2CE');chip.appendChild(letter);sticker.appendChild(chip);node('strong','',sticker,'CARDABLE');node('span','',sticker,'CLASSIC 486');node('small','',sticker,'66 MHz / CB');
      node('div','classic-case__gloss',bezel);digits(control.querySelector('.classic-display'),88);
    });
  }
  function quality(el,pose,time,reduced,state){
    var cfg=C.config.classicPack,rank=Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')),C.settings.policy.reflection);
    el.dataset.packQuality=C.settingsSchema.tiers[rank];if(state.appeared==null||time<state.appeared)state.appeared=time;
    var host=el.closest('.opening-stage'),phase=host&&host.dataset.phase,charging=phase==='charging'||phase==='draining',charged=host&&phase!=='idle'&&!charging;
    var waiting=!host&&el.closest('[data-state="waiting"]'),progress=charging?Number(el.dataset.chargeFill)||0:waiting?C.timers.progress(Date.now()):1;
    var active=!reduced&&C.settings.policy.ambient&&C.settings.policy.animation>=2,step=Math.floor(time/cfg.ledStepMs);
    if(step!==state.step||charging||state.phase!==phase){state.step=step;state.phase=phase;el.querySelectorAll('.classic-display').forEach(function(screen){digits(screen,charging?progress*99:charged?99:waiting?Math.min(99,Math.ceil(C.timers.remaining(Date.now())/60000)):active?88-step%89:88);});el.style.setProperty('--classic-hdd',active&&(step%7===0||step%11===3||charging&&step%3===1)?1:.12);}
    el.querySelectorAll('.classic-progress').forEach(function(bar){var count=Math.floor(progress*bar.children.length);Array.from(bar.children).forEach(function(segment,i){segment.dataset.lit=i<count;});});
    var age=time-state.appeared,p=(rank===3?age%cfg.lightPassMs:age)/1400,sweep=active&&(rank===3||rank===2&&age<1400)&&p<1;
    el.style.setProperty('--classic-gloss-x',(sweep?-130+p*260:140)+'%');el.style.setProperty('--classic-gloss-opacity',sweep?Math.sin(p*Math.PI)*.25:0);
    el.style.setProperty('--classic-grille-turn',charging&&!reduced?progress*35+'deg':'0deg');
    el.style.setProperty('--classic-fill',progress);el.style.setProperty('--classic-tab-pulse',phase==='cutting'&&active&&!Number(el.dataset.tabPull)?(.65+.25*Math.sin(time/1800*Math.PI*2)):1);
    return active;
  }
  C.packSkins.register('classic',{renderIdle:render,renderWaiting:render,renderWrapper:render,quality:quality,
    fluidTint:['#FFD793','#B87923'],leakTint:'#FFD28B',cutGlow:'#FFB000',
    snapshot:function(ctx,w,h){
      ctx.fillStyle='#D8D2BE';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#A89E83';ctx.strokeRect(w*.04,h*.03,w*.92,h*.94);
      ctx.fillStyle='#ECE6D3';ctx.fillRect(w*.1,h*.08,w*.8,h*.13);ctx.fillStyle='#494C3D';ctx.font='600 '+w*.075+'px Inter,sans-serif';ctx.fillText(C.config.gameName,w*.5,h*.165);
      ctx.fillStyle='#C4BDA7';ctx.fillRect(w*.1,h*.25,w*.8,h*.17);ctx.fillStyle='#5B594B';ctx.fillRect(w*.17,h*.33,w*.64,h*.008);
      ctx.fillStyle='#BEB59D';ctx.fillRect(w*.1,h*.45,w*.8,h*.17);ctx.fillStyle='#28201B';ctx.fillRect(w*.52,h*.47,w*.31,h*.08);ctx.fillStyle='#DB3F2A';ctx.font='600 '+w*.09+'px monospace';ctx.fillText('99',w*.675,h*.535);
      ctx.fillStyle='#A33D2A';ctx.fillRect(w*.18,h*.49,w*.09,h*.035);ctx.fillStyle='#77973E';ctx.fillRect(w*.7,h*.58,w*.035,h*.012);
      ctx.fillStyle='#827961';for(var x=w*.1;x<w*.9;x+=w*.04)ctx.fillRect(x,h*.73,w*.019,h*.19);
      ctx.fillStyle='#E6DFCD';ctx.fillRect(w*.6,h*.79,w*.24,h*.12);ctx.fillStyle='#464838';ctx.font=w*.022+'px monospace';ctx.fillText('CLASSIC 486',w*.72,h*.84);
    },
    counterThumb:function(host){var thumb=node('span','pack-counter-thumb pack-counter-thumb--classic',host);node('i','',thumb);node('span','pack-counter-glyph',host,'486');}
  });
})(window.Cardable,window);
